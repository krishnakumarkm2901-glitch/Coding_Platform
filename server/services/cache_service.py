import json
import logging
import os
import time
import threading
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

# Try to import redis
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False


class InMemoryCache:
    """Thread-safe in-memory LRU/TTL cache as fallback when Redis is offline."""
    def __init__(self, max_size=5000):
        self._cache = {}
        self._expires = {}
        self._lock = threading.Lock()
        self._max_size = max_size
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        now = time.time()
        with self._lock:
            if key in self._cache:
                if self._expires.get(key, float('inf')) > now:
                    self.hits += 1
                    return self._cache[key]
                else:
                    # Expired
                    del self._cache[key]
                    if key in self._expires:
                        del self._expires[key]
            self.misses += 1
            return None

    def set(self, key: str, value: Any, ttl: int = 60):
        now = time.time()
        with self._lock:
            # Simple eviction if oversized
            if len(self._cache) >= self._max_size:
                # Remove expired items first
                expired_keys = [k for k, exp in self._expires.items() if exp <= now]
                for k in expired_keys:
                    self._cache.pop(k, None)
                    self._expires.pop(k, None)
                # If still full, pop first 100 items
                if len(self._cache) >= self._max_size:
                    for _ in range(min(100, len(self._cache))):
                        k_pop = next(iter(self._cache))
                        self._cache.pop(k_pop, None)
                        self._expires.pop(k_pop, None)

            self._cache[key] = value
            if ttl > 0:
                self._expires[key] = now + ttl
            else:
                self._expires[key] = float('inf')

    def delete(self, key: str):
        with self._lock:
            self._cache.pop(key, None)
            self._expires.pop(key, None)

    def delete_pattern(self, pattern: str):
        import fnmatch
        with self._lock:
            matching_keys = [k for k in self._cache.keys() if fnmatch.fnmatch(k, pattern)]
            for k in matching_keys:
                self._cache.pop(k, None)
                self._expires.pop(k, None)

    def size(self) -> int:
        with self._lock:
            return len(self._cache)


class CacheService:
    def __init__(self):
        self.redis_client = None
        self.is_redis = False
        self.memory_cache = InMemoryCache()
        self.hits = 0
        self.misses = 0
        self._init_connection()

    def _init_connection(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        if REDIS_AVAILABLE and redis_url:
            try:
                client = redis.from_url(
                    redis_url,
                    socket_timeout=0.2,
                    socket_connect_timeout=0.2,
                    decode_responses=True
                )
                client.ping()
                self.redis_client = client
                self.is_redis = True
                logger.info(f"Connected to Redis cache at {redis_url}")
                return
            except Exception as e:
                logger.info(f"Redis not available ({e}). Using thread-safe high-speed in-memory cache.")
        
        self.is_redis = False
        self.redis_client = None

    def get(self, key: str) -> Optional[Any]:
        if self.is_redis and self.redis_client:
            try:
                val = self.redis_client.get(key)
                if val is not None:
                    self.hits += 1
                    try:
                        return json.loads(val)
                    except (json.JSONDecodeError, TypeError):
                        return val
                self.misses += 1
                return None
            except Exception as e:
                logger.debug(f"Redis get error ({e}), falling back to memory")

        return self.memory_cache.get(key)

    def set(self, key: str, value: Any, ttl: int = 30):
        serialized = json.dumps(value) if not isinstance(value, str) else value
        if self.is_redis and self.redis_client:
            try:
                if ttl > 0:
                    self.redis_client.setex(key, ttl, serialized)
                else:
                    self.redis_client.set(key, serialized)
                return
            except Exception as e:
                logger.debug(f"Redis set error ({e}), falling back to memory")

        self.memory_cache.set(key, value, ttl=ttl)

    def delete(self, key: str):
        if self.is_redis and self.redis_client:
            try:
                self.redis_client.delete(key)
            except Exception:
                pass
        self.memory_cache.delete(key)

    def delete_pattern(self, pattern: str):
        if self.is_redis and self.redis_client:
            try:
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
            except Exception:
                pass
        self.memory_cache.delete_pattern(pattern)

    def get_or_set(self, key: str, fetch_fn: Callable[[], Any], ttl: int = 30) -> Any:
        cached = self.get(key)
        if cached is not None:
            return cached
        fresh = fetch_fn()
        if fresh is not None:
            self.set(key, fresh, ttl=ttl)
        return fresh

    def get_stats(self) -> dict:
        mem_size = self.memory_cache.size()
        total_hits = self.hits + self.memory_cache.hits
        total_misses = self.misses + self.memory_cache.misses
        hit_ratio = round((total_hits / max(total_hits + total_misses, 1)) * 100, 1)
        return {
            "is_redis": self.is_redis,
            "provider": "Redis" if self.is_redis else "In-Memory LRU",
            "items_count": mem_size,
            "hits": total_hits,
            "misses": total_misses,
            "hit_ratio_percent": hit_ratio
        }

# Global singleton
cache = CacheService()
