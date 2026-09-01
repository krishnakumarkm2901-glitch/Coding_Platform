FROM python:3.11-slim

# Install OpenJDK, build-essential (gcc, g++), and runtime tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-jdk \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set standard JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PATH="${JAVA_HOME}/bin:${PATH}"

WORKDIR /app

# Install Python requirements
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server application source
COPY server/ .

ENV PORT=5000
EXPOSE 5000

CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT:-5000} --workers 4 --timeout 120"]
