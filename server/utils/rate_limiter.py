"""
Redis-backed Sliding Window Rate Limiter.

Uses Redis sorted sets for precise sliding-window tracking.
Falls back to an in-memory counter when Redis is unavailable.

Usage:
    from utils.rate_limiter import rate_limit

    @app.route("/api/submissions/submit", methods=["POST"])
    @rate_limit(max_requests=5, window_seconds=60, key_func=lambda: request.current_user["_id"])
    def submit_solution():
        ...
"""

import functools
import logging
import threading
import time
from collections import defaultdict
from typing import Callable, Optional

from flask import jsonify, request

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# In-memory fallback (for local dev without Redis)
# ---------------------------------------------------------------------------

class _InMemoryRateLimiter:
    """Simple sliding-window rate limiter using in-memory dict."""

    def __init__(self):
        self._requests = defaultdict(list)  # key -> [timestamps]
        self._lock = threading.Lock()

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> tuple:
        """Returns (allowed: bool, remaining: int, retry_after: float)."""
        now = time.time()
        cutoff = now - window_seconds
        with self._lock:
            timestamps = self._requests[key]
            # Prune old entries
            timestamps[:] = [t for t in timestamps if t > cutoff]
            if len(timestamps) >= max_requests:
                retry_after = round(timestamps[0] - cutoff, 1)
                return False, 0, retry_after
            timestamps.append(now)
            remaining = max_requests - len(timestamps)
            return True, remaining, 0


_memory_limiter = _InMemoryRateLimiter()


# ---------------------------------------------------------------------------
# Redis-backed limiter
# ---------------------------------------------------------------------------

def _redis_is_allowed(redis_client, key: str, max_requests: int, window_seconds: int) -> tuple:
    """Sliding window using Redis sorted set.  Returns (allowed, remaining, retry_after)."""
    now = time.time()
    cutoff = now - window_seconds
    pipeline = redis_client.pipeline(True)
    pipeline.zremrangebyscore(key, "-inf", cutoff)
    pipeline.zcard(key)
    pipeline.execute()

    # Re-check count
    count = redis_client.zcard(key)
    if count >= max_requests:
        # Find the oldest entry to calculate retry_after
        oldest = redis_client.zrange(key, 0, 0, withscores=True)
        retry_after = round((oldest[0][1] + window_seconds) - now, 1) if oldest else window_seconds
        return False, 0, max(retry_after, 0.1)

    redis_client.zadd(key, {f"{now}": now})
    redis_client.expire(key, window_seconds + 10)
    remaining = max_requests - count - 1
    return True, remaining, 0


# ---------------------------------------------------------------------------
# Decorator
# ---------------------------------------------------------------------------

def rate_limit(
    max_requests: int = 10,
    window_seconds: int = 60,
    key_func: Optional[Callable] = None,
    key_prefix: str = "ratelimit",
):
    """Flask route decorator that enforces request rate limiting.

    Args:
        max_requests:   Maximum number of requests allowed in the window.
        window_seconds: Length of the sliding window in seconds.
        key_func:       Callable that returns the rate-limit key (e.g. user ID).
                        Defaults to the client IP address.
        key_prefix:     Redis key prefix.
    """

    def decorator(f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            # Build key
            if key_func is not None:
                try:
                    raw_key = key_func()
                except Exception:
                    raw_key = request.remote_addr
            else:
                raw_key = request.remote_addr

            full_key = f"{key_prefix}:{request.endpoint}:{raw_key}"

            # Try Redis first
            try:
                from services.queue_service import _get_redis
                r = _get_redis()
                if r is not None:
                    allowed, remaining, retry_after = _redis_is_allowed(
                        r, full_key, max_requests, window_seconds,
                    )
                else:
                    allowed, remaining, retry_after = _memory_limiter.is_allowed(
                        full_key, max_requests, window_seconds,
                    )
            except Exception:
                allowed, remaining, retry_after = _memory_limiter.is_allowed(
                    full_key, max_requests, window_seconds,
                )

            if not allowed:
                resp = jsonify({
                    "error": "Too many requests. Please slow down.",
                    "success": False,
                    "retry_after_seconds": retry_after,
                })
                resp.status_code = 429
                resp.headers["Retry-After"] = str(int(retry_after))
                resp.headers["X-RateLimit-Limit"] = str(max_requests)
                resp.headers["X-RateLimit-Remaining"] = "0"
                return resp

            response = f(*args, **kwargs)
            # Attach rate-limit headers to successful responses
            if hasattr(response, "headers"):
                response.headers["X-RateLimit-Limit"] = str(max_requests)
                response.headers["X-RateLimit-Remaining"] = str(remaining)
            return response

        return wrapper

    return decorator
