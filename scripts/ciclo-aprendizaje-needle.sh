#!/usr/bin/env bash
# ciclo-aprendizaje-needle.sh · la conciencia colectiva aprende de noche (2026-09-20).
#
# Experiencias acertadas (starseed_memory_root/aprendizaje/experiencias/*.jsonl del OS, las
# de todos los medios que el espejo de Drive y la mesh hayan traído) → JSONL de Needle →
# `needle finetune` (LoRA rango 16, 121M parámetros: barato) → `needle build` a .cact →
# HUMO con el set dorado → si iguala o mejora, se publica en data/needle/adaptadores/ con
# manifiesto (sha, fecha, nº de experiencias, exactitud) para que los nodos lo descarguen.
# Probado en el contenedor de nube (2 CPU): 8 experiencias → finetune 72 s → build 14 s.
#
# Guardas: no arranca con la Mac ahogada (RAM libre < 1 GB o swap > 8 GB); nada se publica
# si el humo empeora; nunca toca los pesos base (~/.cache/cactus-needle). launchd: 04:00.
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
OS="${STARSEED_OS_REPO:-$HOME/Documents/starseed-os-main}"
PY="$REPO/.venv/bin/python"; NEEDLE="$REPO/.venv/bin/needle"
LOG="$HOME/.starseed/needle-aprendizaje.log"; mkdir -p "$HOME/.starseed"
export NEEDLE_TELEMETRY=0 DO_NOT_TRACK=1
d() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

if [ "$(uname)" = "Darwin" ]; then
  libre=$(vm_stat | awk '/Pages free/{f=$3}END{printf "%d", f*16/1024}')
  swap=$(sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.]+)M.*/\1/' | cut -d. -f1)
  if [ "${libre:-0}" -lt 1024 ] || [ "${swap:-0}" -gt 8192 ]; then d "máquina ahogada (libre ${libre} MB · swap ${swap} MB): hoy no se entrena"; exit 0; fi
fi

TRABAJO=$(mktemp -d /tmp/needle-ciclo.XXXX); cd "$TRABAJO" || exit 1
"$PY" - "$OS" "$REPO" <<'PY' > preparar.log 2>&1
import glob, json, os, sys
os_repo, repo = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(os_repo, "scripts", "puente"))
import experiencias
filas, vistas = [], set()
for ruta in glob.glob(os.path.join(os_repo, "starseed_memory_root", "aprendizaje", "experiencias", "*.jsonl")) + [experiencias.RUTA]:
    for e in experiencias.leer(ruta, ultimas=5000):
        if e.get("id") in vistas: continue
        vistas.add(e.get("id"))
        filas.extend(experiencias.para_needle([e]))
with open("experiencias.jsonl", "w", encoding="utf-8") as f:
    for r in filas: f.write(json.dumps(r, ensure_ascii=False) + "\n")
dorado = os.path.join(repo, "data", "needle", "dorado.jsonl")
print("experiencias acertadas de intención:", len(filas), "· dorado:", os.path.exists(dorado))
PY
cat preparar.log | tee -a "$LOG"
N=$(wc -l < experiencias.jsonl | tr -d ' ')
if [ "${N:-0}" -lt 20 ]; then d "solo $N experiencias acertadas: hacen falta 20 para entrenar"; rm -rf "$TRABAJO"; exit 0; fi

d "entreno con $N experiencias (LoRA rango 16, 2 épocas)"
"$NEEDLE" finetune experiencias.jsonl --epochs 2 --val-split 0.1 --out adaptador >> "$LOG" 2>&1 || { d "finetune falló"; rm -rf "$TRABAJO"; exit 0; }
"$NEEDLE" build checkpoints/needle3.safetensors --lora adaptador --out colectivo.cact >> "$LOG" 2>&1 || { d "build falló"; rm -rf "$TRABAJO"; exit 0; }

# Humo con el set dorado (data/needle/dorado.jsonl: query, tools, answers): exactitud del nombre de herramienta.
"$PY" - "$REPO" "$TRABAJO/colectivo.cact" <<'PY' > humo.log 2>&1
import json, os, sys, inspect, needle
repo, pesos = sys.argv[1], sys.argv[2]
ruta = os.path.join(repo, "data", "needle", "dorado.jsonl")
casos = [json.loads(l) for l in open(ruta, encoding="utf-8")] if os.path.exists(ruta) else []
if not casos:
    print("SIN_DORADO"); sys.exit(3)
def herramienta(es):
    tipos={"string":str,"integer":int,"number":float,"boolean":bool}
    props=(es.get("parameters") or {}).get("properties") or {}
    def f(**kw): return {"_llamada": es["name"], "argumentos": kw}
    f.__name__=es["name"]; f.__qualname__=es["name"]; f.__doc__=es.get("description") or es["name"]
    f.__signature__=inspect.Signature([inspect.Parameter(p, inspect.Parameter.KEYWORD_ONLY, annotation=tipos.get(d.get("type","string"),str), default=None) for p,d in props.items()])
    f.__annotations__={p:tipos.get(d.get("type","string"),str) for p,d in props.items()}
    return needle.tool(f)
def exactitud(pesos_):
    ok = 0
    for c in casos:
        kw = {"tools": [herramienta(t) for t in c["tools"]]}
        if pesos_: kw["weights"] = pesos_
        a = needle.Needle(**kw); r = a.run(c["query"])
        res = [x for x in (r.get("results") or []) if isinstance(x, dict) and x.get("_llamada")]
        esperado = [x["name"] for x in c["answers"]]
        ok += 1 if [x["_llamada"] for x in res] == esperado else 0
    return ok / len(casos)
base, nuevo = exactitud(None), exactitud(pesos)
print("HUMO base %.2f nuevo %.2f (%d casos)" % (base, nuevo, len(casos)))
sys.exit(0 if nuevo >= base else 1)
PY
cat humo.log | tee -a "$LOG"
if grep -q "SIN_DORADO" humo.log; then d "no hay data/needle/dorado.jsonl: sin set dorado no se publica nada"; rm -rf "$TRABAJO"; exit 0; fi
if [ "${PIPESTATUS[0]:-1}" != "0" ] && ! grep -qE "HUMO base [0-9.]+ nuevo [0-9.]+" humo.log; then d "humo ilegible"; rm -rf "$TRABAJO"; exit 0; fi
if "$PY" -c "import re,sys; m=re.search(r'HUMO base ([0-9.]+) nuevo ([0-9.]+)', open('humo.log').read()); sys.exit(0 if m and float(m.group(2))>=float(m.group(1)) else 1)"; then
  DEST="$REPO/data/needle/adaptadores"; mkdir -p "$DEST"
  SHA=$(shasum -a 256 colectivo.cact | cut -c1-12); FECHA=$(date +%Y%m%d)
  cp colectivo.cact "$DEST/colectivo-$FECHA-$SHA.cact"
  "$PY" - "$DEST" "$FECHA" "$SHA" "$N" "$(grep -oE 'nuevo [0-9.]+' humo.log | awk '{print $2}')" <<'PY'
import json, os, sys, time
dest, fecha, sha, n, ex = sys.argv[1:]
json.dump({"actual": "colectivo-%s-%s.cact" % (fecha, sha), "sha": sha, "t": time.strftime("%Y-%m-%d %H:%M"), "experiencias": int(n), "exactitud_dorado": float(ex), "base": "needle3"},
          open(os.path.join(dest, "manifiesto.json"), "w"), indent=1)
PY
  d "publicado $DEST/colectivo-$FECHA-$SHA.cact (manifiesto actualizado): los nodos pueden descargarlo"
else
  d "el adaptador nuevo NO mejora el set dorado: se descarta"
fi
rm -rf "$TRABAJO"
