#!/usr/bin/env bash
set -e

echo "=== Installing Python dependencies ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== Setting up Java JDK ==="
JDK_DIR="$(pwd)/.jdk"

mkdir -p "$JDK_DIR"

if [ ! -f "$JDK_DIR/bin/javac" ]; then
    echo "Downloading Eclipse Temurin OpenJDK 21 (Linux x64)..."
    curl -sSL "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jdk_x64_linux_hotspot_21.0.2_13.tar.gz" \
        | tar -xz -C "$JDK_DIR" --strip-components=1
    echo "JDK installed to $JDK_DIR"
else
    echo "JDK already cached at $JDK_DIR"
fi

# Verify Java
echo "=== Verifying Java installation ==="
"$JDK_DIR/bin/javac" -version
"$JDK_DIR/bin/java" -version

echo "=== Installing GCC (if not present) ==="
if ! command -v gcc &> /dev/null; then
    echo "gcc not found in PATH, checking apt..."
    if command -v apt-get &> /dev/null; then
        apt-get update -qq && apt-get install -y -qq build-essential 2>/dev/null || echo "Could not install gcc (non-root). C/C++ will be unavailable."
    fi
else
    echo "gcc found: $(command -v gcc)"
fi

echo "=== Installing Node.js (if not present) ==="
if ! command -v node &> /dev/null; then
    echo "Node.js not found, installing via NodeSource..."
    if command -v apt-get &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null && \
        apt-get install -y -qq nodejs 2>/dev/null || echo "Could not install Node.js (non-root). JavaScript will be unavailable."
    fi
else
    echo "Node.js found: $(command -v node) $(node --version 2>/dev/null || echo '')"
fi

# Write a comprehensive env-setup script that the start command sources
# This ensures ALL toolchain paths are set correctly at runtime
echo "=== Writing toolchain environment script ==="
cat > .jdk_env.sh << 'ENVEOF'
# Java
export JAVA_HOME="PLACEHOLDER_JDK_DIR"
export PATH="PLACEHOLDER_JDK_DIR/bin:$PATH"
export JAVAC_PATH="PLACEHOLDER_JDK_DIR/bin/javac"
export JAVA_PATH="PLACEHOLDER_JDK_DIR/bin/java"

# GCC / G++
GCC_BIN=$(command -v gcc 2>/dev/null || echo "")
GPP_BIN=$(command -v g++ 2>/dev/null || echo "")
if [ -n "$GCC_BIN" ]; then export GCC_PATH="$GCC_BIN"; fi
if [ -n "$GPP_BIN" ]; then export GPP_PATH="$GPP_BIN"; fi

# Node.js
NODE_BIN=$(command -v node 2>/dev/null || echo "")
if [ -n "$NODE_BIN" ]; then export NODE_PATH="$NODE_BIN"; fi

# Go (if available)
GO_BIN=$(command -v go 2>/dev/null || echo "")
if [ -n "$GO_BIN" ]; then export GO_PATH="$GO_BIN"; fi

# Rust (if available)
RUSTC_BIN=$(command -v rustc 2>/dev/null || echo "")
if [ -n "$RUSTC_BIN" ]; then export RUSTC_PATH="$RUSTC_BIN"; fi

# Compiler provider — use local sandbox with the installed toolchains
export COMPILER_PROVIDER=auto
ENVEOF

# Replace placeholder with actual JDK path
sed -i "s|PLACEHOLDER_JDK_DIR|$JDK_DIR|g" .jdk_env.sh

echo "=== Toolchain Environment (.jdk_env.sh) ==="
cat .jdk_env.sh

echo ""
echo "=== Final Toolchain Verification ==="
echo "JAVA_HOME=$JDK_DIR"
echo "javac: $JDK_DIR/bin/javac"
echo "java:  $JDK_DIR/bin/java"
echo "gcc:   $(command -v gcc 2>/dev/null || echo 'NOT FOUND')"
echo "g++:   $(command -v g++ 2>/dev/null || echo 'NOT FOUND')"
echo "node:  $(command -v node 2>/dev/null || echo 'NOT FOUND')"
echo "python: $(command -v python3 2>/dev/null || command -v python 2>/dev/null || echo 'NOT FOUND')"
echo ""
echo "=== Build Complete ==="

