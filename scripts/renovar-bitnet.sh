#!/usr/bin/env bash
# renovar-bitnet.sh · salud, higiene y vigilancia de versiones de BitNet 1.58 (2026-09-20).
#
# BitNet NO se actualiza solo: cambiar de pesos o recompilar el motor (cmake, 10+ min, y el
# parche ReLU² de check_bitnet_patch.sh) es decisión de Alex desde el Mando. Este guion:
#   1. Higiene: si hay más de un llama-server de BitNet en el puerto (cada reinicio del backend
#      dejaba huérfanos paginados a 0 MB), conserva el más nuevo y mata el resto.
#   2. Salud: /health, RSS, RAM libre y swap; si está vivo y la máquina no se ahoga, una
#      generación corta para medir tokens/s reales.
#   3. Versiones: fecha del último commit de microsoft/BitNet y sha del modelo
#      microsoft/BitNet-b1.58-2B-4T-gguf en Hugging Face frente a lo instalado → AVISO.
# Todo a ~/.starseed/bitnet-estado.json (lo lee el Mando) y ~/.starseed/bitnet-renovacion.log.
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PUERTO="${ASTRAURA_BITNET_PORT:-8790}"
LOG="$HOME/.starseed/bitnet-renovacion.log"; ESTADO="$HOME/.starseed/bitnet-estado.json"; mkdir -p "$HOME/.starseed"
d() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

# 1) higiene
PIDS=$(pgrep -f "BitNet/build/bin/llama-server" | sort -n)
N=$(echo "$PIDS" | grep -c . || true)
if [ "${N:-0}" -gt 1 ]; then
  NUEVO=$(echo "$PIDS" | tail -1)
  for p in $PIDS; do [ "$p" != "$NUEVO" ] && kill "$p" 2>/dev/null && d "huérfano llama-server $p matado (conservo $NUEVO)"; done
fi

python3 - "$REPO" "$PUERTO" "$ESTADO" <<'PY' 2>&1 | tee -a "$LOG"
import json, os, subprocess, sys, time, urllib.request, hashlib
repo, puerto, estado_ruta = sys.argv[1], sys.argv[2], sys.argv[3]
est = {}
try: est = json.load(open(estado_ruta))
except Exception: pass
def sh(c):
    return subprocess.run(c, shell=True, capture_output=True, text=True).stdout.strip()
# 2) salud
salud = {"t": time.strftime("%Y-%m-%d %H:%M:%S")}
pids = [int(x) for x in sh("pgrep -f BitNet/build/bin/llama-server").split()]
salud["procesos"] = len(pids)
salud["rss_mb"] = int(sh("ps -o rss= -p %d" % pids[-1]) or 0) // 1024 if pids else 0
if sys.platform == "darwin":
    salud["ram_libre_mb"] = int(sh("vm_stat | awk '/Pages free/{f=$3}END{printf \"%d\", f*16/1024}'") or 0)
    salud["swap_mb"] = int(float(sh("sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.]+)M.*/\\1/'") or 0))
try:
    h = urllib.request.urlopen("http://127.0.0.1:%s/health" % puerto, timeout=5).read().decode()[:80]
    salud["health"] = h
    vivo = '"ok"' in h
except Exception as e:
    salud["health"] = "sin respuesta"; vivo = False
salud["vivo"] = vivo
if vivo and salud.get("swap_mb", 0) < 8192:
    body = json.dumps({"messages": [{"role": "user", "content": "Di ok."}], "max_tokens": 24, "temperature": 0}).encode()
    req = urllib.request.Request("http://127.0.0.1:%s/v1/chat/completions" % puerto, data=body, headers={"Content-Type": "application/json"})
    t = time.time()
    try:
        r = json.load(urllib.request.urlopen(req, timeout=120)); dt = time.time() - t
        tm = r.get("timings") or {}
        salud["tok_s"] = round(tm.get("predicted_per_second") or ((r.get("usage") or {}).get("completion_tokens") or 0) / dt, 1)
        salud["segundos_prueba"] = round(dt, 1)
    except Exception as e:
        salud["tok_s"] = None; salud["error_prueba"] = str(e)[:120]
est["salud"] = salud
# 3) versiones
def gh():
    try:
        d = json.load(urllib.request.urlopen("https://api.github.com/repos/microsoft/BitNet/commits?per_page=1", timeout=20))
        return d[0]["sha"][:8], d[0]["commit"]["committer"]["date"][:10]
    except Exception: return None, None
def hf(m):
    try:
        d = json.load(urllib.request.urlopen("https://huggingface.co/api/models/" + m, timeout=20))
        return (d.get("sha") or "")[:8], (d.get("lastModified") or "")[:10]
    except Exception: return None, None
motor_sha, motor_fecha = gh()
modelo_sha, modelo_fecha = hf("microsoft/BitNet-b1.58-2B-4T-gguf")
local = os.path.join(repo, "backend", "BitNet", "models", "BitNet-b1.58-2B-4T", "ggml-model-i2_s.gguf")
ins = est.get("instalado") or {}
if os.path.exists(local) and not ins.get("modelo_mb"):
    ins = {"modelo_mb": os.path.getsize(local) // 1048576, "modelo_fecha": time.strftime("%Y-%m-%d", time.localtime(os.path.getmtime(local)))}
est["instalado"] = ins
antes = est.get("upstream") or {}
est["upstream"] = {"motor_commit": motor_sha, "motor_fecha": motor_fecha, "modelo_sha": modelo_sha, "modelo_fecha": modelo_fecha, "t": salud["t"]}
avisos = []
if motor_sha and antes.get("motor_commit") and motor_sha != antes["motor_commit"]:
    avisos.append("motor microsoft/BitNet tiene commits nuevos (%s, %s): recompilar es decisión de Alex" % (motor_sha, motor_fecha))
if modelo_sha and antes.get("modelo_sha") and modelo_sha != antes["modelo_sha"]:
    avisos.append("modelo BitNet-b1.58-2B-4T-gguf cambió en Hugging Face (%s): actualizar pesos es decisión de Alex" % modelo_fecha)
est["avisos"] = avisos
json.dump(est, open(estado_ruta, "w"), indent=1, ensure_ascii=False)
print("BitNet: %s · procesos %d · RSS %s MB · RAM libre %s MB · swap %s MB · tok/s %s · avisos %d" % (
    "vivo" if vivo else "sin respuesta", salud["procesos"], salud["rss_mb"], salud.get("ram_libre_mb"), salud.get("swap_mb"), salud.get("tok_s"), len(avisos)))
for a in avisos: print("AVISO:", a)
PY
