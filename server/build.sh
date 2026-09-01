#!/usr/bin/env bash
set -e

echo "=== Installing Python dependencies ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== Checking Java toolchain ==="
if command -v javac &> /dev/null; then
    echo "System javac found: $(command -v javac)"
    javac -version
else
    echo "No system javac detected. Installing portable OpenJDK 21 for Render..."
    JDK_DIR="$(pwd)/.jdk"
    mkdir -p "$JDK_DIR"
    if [ ! -f "$JDK_DIR/bin/javac" ]; then
        echo "Downloading OpenJDK 21 Linux x64..."
        curl -sSL "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jdk_x64_linux_hotspot_21.0.2_13.tar.gz" | tar -xz -C "$JDK_DIR" --strip-components=1
    fi
    export PATH="$JDK_DIR/bin:$PATH"
    export JAVA_HOME="$JDK_DIR"
    echo "OpenJDK installed successfully in $JDK_DIR"
    "$JDK_DIR/bin/javac" -version
fi

echo "=== Build Complete ==="
