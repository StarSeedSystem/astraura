#!/bin/bash
set -e

echo "============================================================"
echo "⚙️  Configuración y Compilación Nativa de Microsoft BitNet (bitnet.cpp)"
echo "============================================================"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BITNET_DIR="$DIR/backend/BitNet"
BUILD_DIR="$BITNET_DIR/build"

# Check dependencies
echo "🔍 Verificando herramientas del sistema..."
command -v clang >/dev/null 2>&1 || { echo "❌ Clang no está instalado."; exit 1; }
command -v cmake >/dev/null 2>&1 || { echo "❌ CMake no está instalado."; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ Git no está instalado."; exit 1; }

echo "✅ Clang, CMake y Git detectados."

# Clone if needed
if [ ! -d "$BITNET_DIR" ]; then
    echo "📥 Clonando repositorio oficial de Microsoft BitNet..."
    git clone --recursive https://github.com/microsoft/BitNet.git "$BITNET_DIR"
else
    echo "ℹ️  Repositorio BitNet ya presente en $BITNET_DIR"
fi

# Detect Architecture
ARCH=$(uname -m)
OS=$(uname -s)
NPROC=$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 4)

echo "💻 Arquitectura detectada: $ARCH en $OS ($NPROC núcleos)"

mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

echo "🔨 Configurando CMake con banderas SIMD / NEON vectorizadas..."
if [ "$OS" = "Darwin" ] && [ "$ARCH" = "arm64" ]; then
    # Apple Silicon ARM64 optimizations
    cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_C_COMPILER=clang \
        -DCMAKE_CXX_COMPILER=clang++ \
        -DCMAKE_C_FLAGS="-O3 -mcpu=native -ffast-math -fvectorize" \
        -DCMAKE_CXX_FLAGS="-O3 -mcpu=native -ffast-math -fvectorize"
else
    # Generic / x86_64 AVX2 optimizations
    cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_C_FLAGS="-O3 -march=native -ffast-math" \
        -DCMAKE_CXX_FLAGS="-O3 -march=native -ffast-math"
fi

echo "🚀 Compilando kernels de inferencia con $NPROC hilos..."
cmake --build . -j "$NPROC" || make -j "$NPROC"

echo "============================================================"
echo "✅ BitNet.cpp compilado exitosamente y listo para inferencia."
echo "============================================================"
