"""
Redis-backed Job Queue for Code Execution.

Decouples code evaluation from the Flask HTTP server.  When Redis is
available the submission is enqueued and a background worker process
(worker.py) picks it up.  When Redis is *not* available (local dev
without Redis) execution falls back to synchronous in-process
evaluation so the platform still works out-of-the-box.

Environment variables:
    REDIS_URL         – Redis connection string (default: redis://localhost:6379/0)
    EXECUTION_MODE    – "queue" to force async, "sync" to force synchronous,
                        or "auto" (default) to use the queue when Redis is up.
"""

import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Redis connection (lazy, reuses the CacheService's connection strategy)
# ---------------------------------------------------------------------------

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False

_redis_client = None
_last_redis_fail_time = 0
REDIS_RETRY_INTERVAL = 30.0  # seconds before attempting to reconnect if Redis was offline

QUEUE_NAME = "campus_coder:submissions"
RESULT_PREFIX = "campus_coder:result:"
RESULT_TTL = 3600  # keep results for 1 hour
EXECUTION_MODE = os.getenv("EXECUTION_MODE", "auto").lower()

def _get_redis():
    """Return a Redis client (or None if Redis is unavailable)."""
    global _redis_client, _last_redis_fail_time
    if _redis_client is not None:
        return _redis_client
    if not REDIS_AVAILABLE:
        return None
    
    # If recent connection attempt failed, fail-fast without socket blocking
    now = time.time()
    if now - _last_redis_fail_time < REDIS_RETRY_INTERVAL:
        return None

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    try:
        client = redis.from_url(
            redis_url,
            socket_timeout=0.2,
            socket_connect_timeout=0.2,
            decode_responses=True,
        )
        client.ping()
        _redis_client = client
        logger.info("Queue service connected to Redis at %s", redis_url)
        return _redis_client
    except Exception as e:
        _last_redis_fail_time = now
        logger.info("Queue service: Redis unavailable (%s) — using synchronous fallback (retry in %ds).", e, int(REDIS_RETRY_INTERVAL))
        return None


def is_queue_available() -> bool:
    """Return True when the async queue is usable."""
    if EXECUTION_MODE == "sync":
        return False
    if EXECUTION_MODE == "queue":
        return _get_redis() is not None
    # auto
    return _get_redis() is not None


# ---------------------------------------------------------------------------
# Enqueue / dequeue
# ---------------------------------------------------------------------------

def enqueue_submission(job: Dict[str, Any]) -> Optional[str]:
    """Push a submission job onto the Redis queue.

    The *job* dict should contain everything the worker needs:
        job_id, language, code, test_cases, timeout, submission_id,
        context (problem_id, user_id, etc.)

    Returns the job_id, or None if the queue is unavailable.
    """
    r = _get_redis()
    if r is None:
        return None
    job_id = job.get("job_id") or str(uuid.uuid4())
    job["job_id"] = job_id
    job["enqueued_at"] = datetime.now(timezone.utc).isoformat()
    try:
        r.lpush(QUEUE_NAME, json.dumps(job))
        logger.debug("Enqueued job %s", job_id)
        return job_id
    except Exception as e:
        logger.error("Failed to enqueue job: %s", e)
        return None


def dequeue_submission(timeout: int = 5) -> Optional[Dict[str, Any]]:
    """Blocking pop of the next job from the queue.

    Used by the worker process.  Returns a dict, or None on timeout.
    """
    r = _get_redis()
    if r is None:
        return None
    try:
        item = r.brpop(QUEUE_NAME, timeout=timeout)
        if item is None:
            return None
        _queue_name, payload = item
        return json.loads(payload)
    except Exception as e:
        logger.error("Dequeue error: %s", e)
        return None


# ---------------------------------------------------------------------------
# Result storage
# ---------------------------------------------------------------------------

def store_result(job_id: str, result: Dict[str, Any]) -> None:
    """Store a completed job result in Redis so the API can poll it."""
    r = _get_redis()
    if r is None:
        return
    key = f"{RESULT_PREFIX}{job_id}"
    try:
        r.setex(key, RESULT_TTL, json.dumps(result))
        logger.debug("Stored result for job %s", job_id)
    except Exception as e:
        logger.error("Failed to store result for job %s: %s", job_id, e)


def get_result(job_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a completed job result by job_id.  Returns None if not yet done."""
    r = _get_redis()
    if r is None:
        return None
    key = f"{RESULT_PREFIX}{job_id}"
    try:
        val = r.get(key)
        if val is not None:
            return json.loads(val)
        return None
    except Exception as e:
        logger.error("Failed to get result for job %s: %s", job_id, e)
        return None


# ---------------------------------------------------------------------------
# Queue metrics (used by /api/health)
# ---------------------------------------------------------------------------

def get_queue_stats() -> Dict[str, Any]:
    """Return queue depth and connection status."""
    r = _get_redis()
    if r is None:
        return {"available": False, "mode": EXECUTION_MODE, "depth": 0}
    try:
        depth = r.llen(QUEUE_NAME)
        return {"available": True, "mode": EXECUTION_MODE, "depth": depth}
    except Exception:
        return {"available": False, "mode": EXECUTION_MODE, "depth": 0}
