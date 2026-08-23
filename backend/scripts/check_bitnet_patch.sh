#!/usr/bin/env bash
# Guarda del parche CRÍTICO del motor nativo (Ola 3):
# BitNet-b1.58-2B-4T usa ReLU² (config.json `hidden_act: relu2`); el llama.cpp
# vendido en 3rdparty/ traía LLM_FFN_SILU para la arquitectura bitnet-b1.58 y el
# modelo degeneraba (PPL ~41 en vez de ~5, bucles de repetición). Si alguien
# re-vendoriza llama.cpp y pierde el parche, este check lo detecta ANTES de
# compilar. Uso: bash scripts/check_bitnet_patch.sh
set -e
f="$(dirname "$0")/../BitNet/3rdparty/llama.cpp/src/models/bitnet.cpp"
if grep -q "LLM_FFN_RELU_SQR" "$f"; then
  echo "[OK] bitnet.cpp usa LLM_FFN_RELU_SQR (ReLU² · parche Astraura presente)"
else
  echo "[FAIL] $f NO tiene el parche ReLU²: el modelo 2B-4T degenerará. Reaplica:"
  echo "       LLM_FFN_SILU → LLM_FFN_RELU_SQR en el build_ffn de llm_build_bitnet."
  exit 1
fi
