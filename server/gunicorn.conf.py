import os

bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"

# With code execution offloaded to the worker process, each gunicorn
# thread handles only fast I/O (auth, DB queries, cache lookups —
# typically 5–50ms per request).  More workers/threads are safe.
CPU_COUNT = os.cpu_count() or 2
workers = int(os.environ.get("WEB_CONCURRENCY", min(4, (CPU_COUNT * 2) + 1)))
worker_class = os.environ.get("GUNICORN_WORKER_CLASS", "gthread")
threads = int(os.environ.get("GUNICORN_THREADS", "4"))

timeout = 120
keepalive = 5

# Graceful restart: finish in-flight requests before shutting down
graceful_timeout = 30

loglevel = os.environ.get("LOG_LEVEL", "info")
accesslog = "-"
errorlog = "-"
