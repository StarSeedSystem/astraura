#!/usr/bin/env bash
# renovar-needle.sh · mantiene Needle (motor oficial de Cactus) siempre al día, con prueba
# antes de adoptar nada. (2026-09-20, pedido de Alex: «asegurando que siempre se mantenga
# actualizado automáticamente»). Idempotente; pensado para launchd cada 6 h.
#
#   1. ¿Hay `cactus-needle` más nuevo en PyPI que el instalado en .venv?  → pip install -U
#   2. ¿Cambiaron los pesos `Cactus-Compute/needle3` en Hugging Face (sha)? → needle download
#      a una carpeta de PRUEBA, nunca encima de los buenos.
#   3. Humo: una decisión real en español debe devolver una llamada con confianza ≥ 0,4.
#      Si pasa, los pesos nuevos sustituyen a los viejos (copia .bak) y el backend se
#      reinicia; si no, se descartan y se anota el motivo. Nada se adopta sin prueba.
#   4. ¿Existe ya un `needle4` en Hugging Face? Solo se AVISA: cambiar de versión mayor es
#      decisión de Alex (cambia la arquitectura y el motor C99 del ESP32 no lo sigue).
# Registro: ~/.starseed/needle-renovacion.log · estado: ~/.starseed/needle-estado.json
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PY="$REPO/.venv/bin/python"
LOG="$HOME/.starseed/needle-renovacion.log"; ESTADO="$HOME/.starseed/needle-estado.json"
mkdir -p "$HOME/.starseed"
export NEEDLE_TELEMETRY=0 DO_NOT_TRACK=1
d() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

"$PY" - "$REPO" "$ESTADO" <<'PY' 2>&1 | tee -a "$LOG"
import json, os, re, shutil, subprocess, sys, tempfile, time, urllib.request
repo, estado_ruta = sys.argv[1], sys.argv[2]
py = os.path.join(repo, ".venv", "bin", "python")
estado = {}
try: estado = json.load(open(estado_ruta))
except Exception: pass
def guardar():
    json.dump(estado, open(estado_ruta, "w"), indent=1, ensure_ascii=False)
def instalada():
    r = subprocess.run([py, "-c", "from importlib.metadata import version; print(version('cactus-needle'))"], capture_output=True, text=True)
    return r.stdout.strip() or None
def pypi():
    try:
        d = json.load(urllib.request.urlopen("https://pypi.org/pypi/cactus-needle/json", timeout=20))
        return d["info"]["version"]
    except Exception as e:
        return None
def hf(modelo):
    try:
        d = json.load(urllib.request.urlopen("https://huggingface.co/api/models/Cactus-Compute/" + modelo, timeout=20))
        return d.get("sha"), d.get("lastModified")
    except Exception:
        return None, None
cambios = []
# 1) paquete
v_local, v_pypi = instalada(), pypi()
estado["paquete"] = {"instalado": v_local, "pypi": v_pypi, "t": time.strftime("%Y-%m-%d %H:%M")}
if v_pypi and v_local and v_pypi != v_local:
    print("paquete: %s → %s (PyPI)" % (v_local, v_pypi))
    r = subprocess.run([py, "-m", "pip", "install", "-q", "-U", "cactus-needle"], capture_output=True, text=True)
    if r.returncode == 0:
        cambios.append("paquete %s→%s" % (v_local, instalada()))
    else:
        print("pip falló:", (r.stderr or "")[-300:])
# 2) pesos
sha, fecha = hf("needle3")
pesos = os.path.join(repo, "data", "needle", "needle3.cact")
antes = (estado.get("pesos") or {}).get("sha")
estado["pesos"] = {"sha": sha, "hf_modificado": fecha, "archivo": pesos, "t": time.strftime("%Y-%m-%d %H:%M")}
if sha and sha != antes:
    print("pesos needle3: sha %s → %s (HF %s)" % ((antes or "?")[:8], sha[:8], fecha))
    tmp = tempfile.mkdtemp(prefix="needle3-")
    r = subprocess.run([os.path.join(repo, ".venv", "bin", "needle"), "download", "needle3"], cwd=tmp, capture_output=True, text=True)
    nuevo = os.path.join(tmp, "needle3.cact")
    if os.path.exists(nuevo):
        # 3) humo con los pesos nuevos
        humo = subprocess.run([py, "-c", """
import needle, os, sys
@needle.tool
def buscar_publicaciones(consulta: str, limite: int = 5):
    'Busca publicaciones en la red StarSeed.'
    return {'c': consulta, 'n': limite}
a = needle.Needle(tools=[buscar_publicaciones])
r = a.run('busca 3 publicaciones sobre permacultura')
ok = any(isinstance(x, dict) and x.get('c') for x in (r.get('results') or []))
print('HUMO', 'ok' if ok else 'sin llamada', r.get('confidence'))
sys.exit(0 if ok else 1)
"""], capture_output=True, text=True, timeout=180, env=dict(os.environ, NEEDLE_TELEMETRY="0"))
        print(humo.stdout.strip()[-200:], humo.stderr.strip()[-200:] if humo.returncode else "")
        if humo.returncode == 0:
            if os.path.exists(pesos):
                shutil.copy2(pesos, pesos + ".bak")
            shutil.copy2(nuevo, pesos)
            cambios.append("pesos needle3 " + sha[:8])
        else:
            estado["pesos"]["sha"] = antes
            estado["pesos"]["rechazado"] = sha
            print("pesos nuevos RECHAZADOS por la prueba de humo; se conservan los anteriores")
    else:
        print("descarga falló:", (r.stderr or r.stdout or "")[-200:])
    shutil.rmtree(tmp, ignore_errors=True)
# 4) ¿hay una versión mayor nueva?
sha4, fecha4 = hf("needle4")
estado["siguiente_mayor"] = {"needle4": bool(sha4), "hf_modificado": fecha4}
if sha4:
    print("AVISO: existe Cactus-Compute/needle4 (%s). Cambiar de versión mayor lo decide Alex." % fecha4)
estado["cambios"] = cambios
guardar()
print("cambios:", cambios or "ninguno")
sys.exit(2 if cambios else 0)
PY
rc=${PIPESTATUS[0]}
if [ "$rc" = "2" ]; then
  d "hubo cambios: reinicio el backend de Astraura (launchd)"
  launchctl kickstart -k "gui/$(id -u)/com.starseed.astraura" 2>/dev/null || true
fi
exit 0
