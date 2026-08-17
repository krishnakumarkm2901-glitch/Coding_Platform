# Production Dockerfile for NIT_Campus_Coder API & Compiler Service
FROM python:3.11-slim

# Install system compilers (gcc, g++, default-jdk, golang)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    default-jdk \
    golang-go \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY . .

# Expose port
EXPOSE 5000

# Run with Gunicorn production WSGI server
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app:app"]
