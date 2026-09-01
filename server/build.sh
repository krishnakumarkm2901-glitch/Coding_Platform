#!/usr/bin/env bash
set -e

echo "=== Installing Python dependencies ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== Setting up Java JDK ==="
JDK_DIR="/opt/render/project/src/server/.jdk"

# If rootDir is "server", adjust path
if [ -f "app.py" ]; then
    JDK_DIR="$(pwd)/.jdk"
fi

mkdir -p "$JDK_DIR"

if [ ! -f "$JDK_DIR/bin/javac" ]; then
    echo "Downloading Eclipse Temurin OpenJDK 21 (Linux x64)..."
    curl -sSL "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jdk_x64_linux_hotspot_21.0.2_13.tar.gz" \
        | tar -xz -C "$JDK_DIR" --strip-components=1
    echo "JDK installed to $JDK_DIR"
else
    echo "JDK already cached at $JDK_DIR"
fi

# Verify
echo "=== Verifying Java installation ==="
"$JDK_DIR/bin/javac" -version
"$JDK_DIR/bin/java" -version

# Write a small env-setup script that the start command can source
cat > .jdk_env.sh << EOF
export JAVA_HOME="$JDK_DIR"
export PATH="$JDK_DIR/bin:\$PATH"
EOF

echo "=== Installing GCC (if not present) ==="
if ! command -v gcc &> /dev/null; then
    echo "gcc not found in PATH, checking apt..."
    if command -v apt-get &> /dev/null; then
        apt-get update -qq && apt-get install -y -qq build-essential 2>/dev/null || echo "Could not install gcc (non-root). C/C++ will be unavailable."
    fi
else
    echo "gcc found: $(command -v gcc)"
fi

echo "=== Build Complete ==="
