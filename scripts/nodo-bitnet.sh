#!/usr/bin/env bash
# nodo-bitnet.sh — BitNet b1.58 2B-4T en CUALQUIER medio, adaptado al hardware.
#
# Alex (2026-09-20): «BitNet debe vivir en cualquier medio que tenga disponible…
# adaptándose a los recursos de las capacidades de cualquier tipo de hardware
# automáticamente». Este script es ese "cualquier medio": Mac (arm64), Linux
# x86_64 (contenedores de nube, VPS), Linux arm64 (Oracle Free Tier, Raspberry,
# Android/Termux). Hace, idempotente:
#   1. compila el BitNet.cpp VENDORIZADO de Astraura (backend/BitNet, con los
#      parches ARM y el layout i2_s validado) — NO el upstream de microsoft/BitNet:
#      medido 2026-09-20 en x86 AVX-512, el upstream actual (0b341e5) carga los
#      pesos oficiales sin quejarse y responde «la capital de Francia es una
#      ciudad pequeña»; el vendorizado responde «Paris». Mismos bits, kernels
#      distintos. Si el script no corre dentro del repo, lo clona (depth 1);
#   2. descarga los pesos GGUF i2_s (1.133 MB) de HF si faltan;
#   3. mide núcleos, RAM y arquitectura → hilos, contexto, slots (perfil);
#   4. lanza llama-server (OpenAI-compatible en :8790) o imprime el perfil.
#
# Medido 2026-09-20 · contenedor de nube 2 vCPU Xeon AVX-512 / 8 GB: perfil
# «justo» (2 hilos, ctx 2048, 1 slot), arranque 4 s, 13,7 tok/s, 1.290 MB RSS,
# respuestas coherentes en español con la plantilla llama3 del backend.
#
# Uso:  nodo-bitnet.sh preparar   # compila + descarga (una vez)
#       nodo-bitnet.sh perfil     # solo imprime el perfil JSON para esta máquina
#       nodo-bitnet.sh arrancar   # lanza el servidor (nohup, log en $NODO/bitnet-server.log)
#       nodo-bitnet.sh probar     # una petición y tok/s
#       nodo-bitnet.sh parar
# Variables: NODO_BITNET_DIR (por defecto ~/.starseed/nodo-bitnet), BITNET_PORT,
#   BITNET_HILOS / BITNET_CTX / BITNET_PAR fuerzan el perfil.
# Nodo PÚBLICO (nube/VPS): corre el backend entero con ASTRAURA_AUTH_MODE=key
# (clave maestra en ~/.astraura/master_key.txt, nunca se imprime) y los pares
# le hablan con ASTRAURA_MESH_KEY (mesh_network.cabeceras_malla). En la Mac,
# el backend ya gestiona su propio llama-server: este script es para los demás medios.
set -euo pipefail

NODO="${NODO_BITNET_DIR:-$HOME/.starseed/nodo-bitnet}"
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$AQUI/../backend/BitNet" ]; then ASTRAURA="$(cd "$AQUI/.." && pwd)"; else ASTRAURA="$NODO/astraura"; fi
REPO="$ASTRAURA/backend/BitNet"
MODELO_DIR="$REPO/models/BitNet-b1.58-2B-4T"
MODELO="$MODELO_DIR/ggml-model-i2_s.gguf"
PUERTO="${BITNET_PORT:-8790}"
PID="$NODO/bitnet-server.pid"
LOG="$NODO/bitnet-server.log"
HF_URL="https://huggingface.co/microsoft/BitNet-b1.58-2B-4T-gguf/resolve/main/ggml-model-i2_s.gguf"
mkdir -p "$NODO"

arq() { uname -m | sed 's/aarch64/arm64/'; }
nucleos() { getconf _NPROCESSORS_ONLN 2>/dev/null || nproc 2>/dev/null || echo 2; }
ram_mb() {
  if [ "$(uname -s)" = Darwin ]; then echo $(( $(sysctl -n hw.memsize) / 1048576 ));
  else awk '/MemTotal/{printf "%d", $2/1024}' /proc/meminfo; fi
}
ram_libre_mb() {
  if [ "$(uname -s)" = Darwin ]; then
    vm_stat | awk '/page size of/{p=$8} /Pages (free|inactive|speculative)/{gsub("\\.","");s+=$NF} END{printf "%d", s*p/1048576}'
  else awk '/MemAvailable/{printf "%d", $2/1024}' /proc/meminfo; fi
}

# ─── 3. perfil según hardware (misma tabla que bitnet_cpp_manager.py) ───
perfil() {
  local n r a hilos ctx par nivel
  n=$(nucleos); r=$(ram_mb); a=$(arq)
  if   [ "$r" -le 3072 ]; then nivel=minimo;  hilos=$(( n>2?2:n )); ctx=512;  par=1
  elif [ "$r" -le 8704 ]; then nivel=justo;   hilos=$(( n>2?2:n )); ctx=2048; par=1
  elif [ "$r" -le 16896 ]; then nivel=holgado; hilos=$(( n/2>4?4:(n/2<2?2:n/2) )); ctx=4096; par=2
  else nivel=pleno; hilos=$(( n/2>6?6:(n/2<2?2:n/2) )); ctx=4096; par=3; fi
  hilos="${BITNET_HILOS:-$hilos}"; ctx="${BITNET_CTX:-$ctx}"; par="${BITNET_PAR:-$par}"
  printf '{"arq":"%s","nucleos":%d,"ram_mb":%d,"ram_libre_mb":%d,"nivel":"%s","hilos":%d,"ctx":%d,"paralelo":%d,"puerto":%d,"pesos_mb":%d}\n' \
    "$a" "$n" "$r" "$(ram_libre_mb)" "$nivel" "$hilos" "$ctx" "$par" "$PUERTO" "$( [ -f "$MODELO" ] && echo $(( $(stat -c %s "$MODELO" 2>/dev/null || stat -f %z "$MODELO") / 1048576 )) || echo 0 )"
}

# ─── 1+2. preparar ───
preparar() {
  command -v cmake >/dev/null || { echo "falta cmake (apt install cmake clang ninja-build / brew install cmake)"; exit 2; }
  if [ ! -d "$REPO" ]; then
    git clone --depth 1 https://github.com/StarSeedSystem/astraura.git "$ASTRAURA"
  fi
  local a; a=$(arq)
  if [ ! -x "$REPO/build/bin/llama-server" ]; then
    local extra=()
    if [ "$a" = arm64 ]; then extra=(-DBITNET_ARM_TL1=ON); else extra=(-DBITNET_X86_TL2=OFF); fi
    ( cd "$REPO" && cmake -B build "${extra[@]}" -DCMAKE_C_COMPILER=clang -DCMAKE_CXX_COMPILER=clang++ \
        -DLLAMA_BUILD_TOOLS=ON -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_COMMON=ON \
        -DLLAMA_BUILD_SERVER=ON -DCMAKE_BUILD_TYPE=Release \
      && cmake --build build --config Release -j"$(nucleos)" --target llama-server llama-cli )
  fi
  mkdir -p "$MODELO_DIR"
  if [ ! -f "$MODELO" ]; then
    curl -sSL --retry 3 -o "$MODELO.part" "$HF_URL" && mv "$MODELO.part" "$MODELO"
  fi
  echo "preparado: $(perfil)"
}

arrancar() {
  [ -x "$REPO/build/bin/llama-server" ] && [ -f "$MODELO" ] || { echo "primero: $0 preparar"; exit 2; }
  if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "ya corre (pid $(cat "$PID"))"; return; fi
  local p; p=$(perfil)
  local hilos ctx par
  hilos=$(echo "$p" | sed 's/.*"hilos":\([0-9]*\).*/\1/'); ctx=$(echo "$p" | sed 's/.*"ctx":\([0-9]*\).*/\1/'); par=$(echo "$p" | sed 's/.*"paralelo":\([0-9]*\).*/\1/')
  local plantilla="$ASTRAURA/backend/llama3_chat_template.jinja"
  [ -f "$plantilla" ] || plantilla=""
  nohup "$REPO/build/bin/llama-server" -m "$MODELO" --host 127.0.0.1 --port "$PUERTO" \
      -t "$hilos" -c "$ctx" --parallel "$par" -ub 24 -b 24 -ngl 0 -ctk q8_0 -ctv q8_0 \
      --override-kv tokenizer.ggml.pre=str:llama-bpe ${plantilla:+--jinja --chat-template-file "$plantilla"} \
      > "$LOG" 2>&1 &
  echo $! > "$PID"
  for _ in $(seq 1 60); do
    curl -s -m 2 "http://127.0.0.1:$PUERTO/health" | grep -q '"ok"' && { echo "BitNet vivo en :$PUERTO · $p"; return; }
    sleep 1
  done
  echo "no respondió en 60 s; mira $LOG"; exit 1
}

probar() {
  local t0 t1 out toks
  t0=$(date +%s.%N)
  out=$(curl -s -m 120 "http://127.0.0.1:$PUERTO/v1/chat/completions" -H 'Content-Type: application/json' \
    -d '{"messages":[{"role":"user","content":"Explica en dos frases qué es la sociedad StarSeed."}],"max_tokens":64,"temperature":0.2}')
  t1=$(date +%s.%N)
  toks=$(echo "$out" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("usage",{}).get("completion_tokens",0))' 2>/dev/null || echo 0)
  python3 - "$out" "$t0" "$t1" "$toks" <<'EOF'
import sys, json
out, t0, t1, toks = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4])
try:
    d = json.loads(out); txt = d["choices"][0]["message"]["content"].strip()
except Exception:
    txt = out[:200]
print(json.dumps({"segundos": round(t1 - t0, 2), "tokens": toks, "tok_s": round(toks / (t1 - t0), 2) if toks else None, "texto": txt[:240]}, ensure_ascii=False))
EOF
}

parar() { [ -f "$PID" ] && kill "$(cat "$PID")" 2>/dev/null && rm -f "$PID" && echo parado || echo "no corría"; }

case "${1:-perfil}" in
  preparar) preparar ;; perfil) perfil ;; arrancar) arrancar ;; probar) probar ;; parar) parar ;;
  *) echo "uso: $0 {preparar|perfil|arrancar|probar|parar}"; exit 2 ;;
esac
