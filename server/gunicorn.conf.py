"""
Production Gunicorn Configuration for NIT_Campus_Coder
Optimized for 1,000+ Concurrent Students and Stateless Horizontally Scalable Workers.
"""

import multiprocessing
import os

# Server Socket
bind = f"0.0.0.0:{os.getenv('PORT', '10000')}"
backlog = 2048

# Worker Processes
workers = int(os.getenv("WEB_CONCURRENCY", "2"))
worker_class = os.getenv("GUNICORN_WORKER_CLASS", "gthread")
threads = int(os.getenv("GUNICORN_THREADS", "4"))
worker_connections = 1000

# Worker Lifetime & Recycling (Prevents memory leaks under heavy load)
max_requests = 1000
max_requests_jitter = 100
timeout = 120
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)sµs'

# Process Naming
proc_name = "nit_campus_coder_api"
