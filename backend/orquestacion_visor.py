#!/usr/bin/env python3
"""
Visor en vivo de la orquestación multiagente StarSeed (Adenda 176).
--------------------------------------------------------------------
Solo lectura. Sin dependencias (stdlib). Sirve en http://localhost:8899.
Agrega SOLO fuentes reales y dice honestamente cuando una no responde:
  · Backend 1.58 (127.0.0.1:8000): /api/status, /api/starseed/processes,
    /api/swarm/status, /api/director/status, /api/system/dual_trunk,
    /api/starseed/cognition/preference.
  · Sesiones de Claude Code (~/.claude/projects/**/*.jsonl): tokens por
    tipo (input/output/cache-read/cache-creation) y % de relectura de caché.
  · Git/CI/Cloud Run: HEAD de ambos repos + estado del último deploy.
  · orquestacion-live.json: estado de MI orquestación (Fable 5) escrito a mano.
El navegador pide /api/estado (JSON) cada pocos segundos; el HTML es estático.
"""
import json, os, re, subprocess, time, urllib.request, glob
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOME = os.path.expanduser("~")
BACKEND = "http://127.0.0.1:8000"
OS_REPO = os.path.join(HOME, "Documents", "starseed-os-main")
IA_REPO = os.path.join(HOME, "Documents", "IA 1.58 bit")
LIVE_JSON = os.path.join(OS_REPO, "starseed_memory_root", "orquestacion-live.json")
CLAUDE_PROJECTS = os.path.join(HOME, ".claude", "projects")


def _get(path, timeout=4.0):
    """GET JSON del backend; devuelve (data, None) o (None, motivo)."""
    try:
        with urllib.request.urlopen(BACKEND + path, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8")), None
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


def _sh(args, cwd=None, timeout=8):
    try:
        out = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return out.stdout.strip()
    except Exception:
        return ""


def claude_sessions(max_files=10):
    """Suma tokens por tipo de los .jsonl de sesiones recientes de Claude Code.
    Estructura real: cada línea es un evento; los de assistant llevan
    message.usage {input_tokens, output_tokens, cache_read_input_tokens,
    cache_creation_input_tokens}. % relectura = cache_read / total_entrada."""
    files = sorted(glob.glob(os.path.join(CLAUDE_PROJECTS, "**", "*.jsonl"), recursive=True),
                   key=lambda p: os.path.getmtime(p), reverse=True)[:max_files]
    agg = {"input": 0, "output": 0, "cache_read": 0, "cache_creation": 0, "turnos": 0}
    sesiones = []
    for f in files:
        s = {"archivo": os.path.basename(f)[:18], "input": 0, "output": 0,
             "cache_read": 0, "cache_creation": 0, "turnos": 0,
             "cuando": time.strftime("%H:%M", time.localtime(os.path.getmtime(f)))}
        try:
            with open(f, "r", encoding="utf-8", errors="ignore") as fh:
                for line in fh:
                    try:
                        u = (json.loads(line).get("message") or {}).get("usage")
                    except Exception:
                        continue
                    if not isinstance(u, dict):
                        continue
                    s["input"] += u.get("input_tokens", 0) or 0
                    s["output"] += u.get("output_tokens", 0) or 0
                    s["cache_read"] += u.get("cache_read_input_tokens", 0) or 0
                    s["cache_creation"] += u.get("cache_creation_input_tokens", 0) or 0
                    s["turnos"] += 1
        except Exception:
            pass
        for k in ("input", "output", "cache_read", "cache_creation", "turnos"):
            agg[k] += s[k]
        entrada = s["input"] + s["cache_read"] + s["cache_creation"]
        s["relectura_pct"] = round(100 * s["cache_read"] / entrada, 1) if entrada else 0.0
        sesiones.append(s)
    entrada_tot = agg["input"] + agg["cache_read"] + agg["cache_creation"]
    agg["relectura_pct"] = round(100 * agg["cache_read"] / entrada_tot, 1) if entrada_tot else 0.0
    agg["total"] = entrada_tot + agg["output"]
    return {"total": agg, "sesiones": sesiones[:8], "disponible": bool(files)}


def git_ci_estado():
    """HEAD de ambos repos + estado CI/Vercel del último commit del OS + Cloud Run."""
    est = {}
    for nombre, repo in (("os", OS_REPO), ("astraura", IA_REPO)):
        head = _sh(["git", "-C", repo, "log", "-1", "--format=%h %s"], timeout=6)
        est[nombre] = {"head": head[:110] if head else "(sin git)"}
    sha = _sh(["git", "-C", OS_REPO, "rev-parse", "HEAD"], timeout=6)
    if sha:
        raw = _sh([os.path.join(HOME, ".local", "bin", "gh") if os.path.exists(os.path.join(HOME, ".local", "bin", "gh")) else "gh",
                   "api", f"repos/StarSeedSystem/starseed-system/commits/{sha}/status", "--jq", ".state"], timeout=8)
        est["os"]["ci"] = raw or "?"
    # Cloud Run: último resultado conocido de los logs de deploy
    cr = "?"
    for log in ("/tmp/cloudrun_deploy_175b.log", "/tmp/cloudrun_deploy_175.log"):
        if os.path.exists(log):
            txt = _sh(["tail", "-4", log], timeout=4)
            if "EXIT=0" in txt or "Service URL" in txt or "Ready" in txt:
                cr = "desplegado"
            elif "EXIT=1" in txt or "failed" in txt.lower():
                cr = "falló (revisar log)"
            else:
                cr = "en curso"
            break
    est["cloud_run"] = cr
    return est


def estado_completo():
    """Un único snapshot honesto de toda la orquestación."""
    status, e_status = _get("/api/status")
    procs, e_procs = _get("/api/starseed/processes")
    swarm, e_swarm = _get("/api/swarm/status")
    director, e_dir = _get("/api/director/status")
    trunk, _ = _get("/api/system/dual_trunk")
    pref, _ = _get("/api/starseed/cognition/preference")

    engine = (status or {}).get("engine", {})
    cog = (procs or {}).get("cognition", {})

    # Agentes del enjambre: modelo efectivo, personalidad, tarea, progreso, fase.
    modelo_fondo = engine.get("active_model", "?") if engine.get("real_mode") == "bitnet-native" else \
        (", ".join(engine.get("ollama_models", [])) or engine.get("real_mode", "?"))
    agentes = []
    for a in (swarm or {}).get("agents", []) or []:
        personas = [p.get("name") for p in (a.get("used_personalities") or []) if p.get("name")]
        agentes.append({
            "id": a.get("id"), "nombre": a.get("name"), "estado": a.get("status", "idle"),
            "personalidad": " · ".join(personas) or "—",
            "modelo": modelo_fondo,
            "tarea": a.get("current_task") or "—",
            "progreso": a.get("progress", 0) or 0,
            "cerebros": [c.get("name") for c in (a.get("linked_cerebros") or []) if c.get("name")],
            "completadas": a.get("completed_tasks", 0) or 0,
            "subagentes": a.get("subagents_spawned", 0) or 0,
            "concurrencia": a.get("concurrency", 1) or 1,
        })

    # Tareas vivas del enjambre (auto-rutado a áreas/proyectos).
    tareas = []
    _all_tasks = (swarm or {}).get("active_tasks", []) or []
    for t in _all_tasks[:60]:
        tareas.append({
            "id": t.get("id"),
            "titulo": t.get("title") or t.get("id", "?"),
            "area": t.get("area_id", "—"), "agente": t.get("agent_id", "—"),
            "fase": t.get("execution_phase") or t.get("phase_label") or "—",
            "progreso": t.get("progress", 0) or 0,
            "cpu": t.get("allocated_cpu_percent"), "ram_mb": t.get("real_memory_mb"),
            "proyecto": t.get("target_project_id") or "—",
        })

    gov = (swarm or {}).get("capacity_governor", {})
    live = {}
    try:
        with open(LIVE_JSON, "r", encoding="utf-8") as fh:
            live = json.load(fh)
    except Exception:
        pass

    return {
        "ts": time.strftime("%Y-%m-%d %H:%M:%S"),
        "backend_vivo": status is not None,
        "backend_motivo": e_status,
        "motor": {
            "real_mode": engine.get("real_mode", "?"),
            "modelo": engine.get("active_model", "?"),
            "servidor": engine.get("bitnet_server_state", "?"),
            "preferencia": (pref or {}).get("preference", "?"),
            "preferencia_fuente": (pref or {}).get("source", "?"),
            "ctx": (engine.get("bitnet_server") or {}).get("ctx"),
            "cuantizacion": ((engine.get("quantization_stack") or {}).get("pesos") or {}).get("activo", "?"),
        },
        "cognicion": {
            "llamadas": cog.get("calls", 0), "reales": cog.get("real", 0),
            "plantillas": cog.get("template", 0), "errores": cog.get("errors", 0),
            "modo": cog.get("mode", "?"), "concurrencia_max": cog.get("max_concurrent", "?"),
            "tps": cog.get("measured_tps"),
        },
        "gobernador": {
            "modo": gov.get("capacity_mode", "?"),
            "capacidad_pct": gov.get("relative_capacity_percent"),
            "nucleos": gov.get("allocated_cores"), "cpu_sistema": gov.get("system_cpu_usage"),
            "bateria": gov.get("battery_percent"),
            "tronco_imaginacion": (trunk or {}).get("imagination_percent"),
            "tronco_enjambre": (trunk or {}).get("swarm_percent"),
        },
        "director": {
            "disponible": director is not None,
            "directiva": (director or {}).get("active_directive") or (director or {}).get("master_directive") or "—",
            "modo": (director or {}).get("orchestration_mode") or (director or {}).get("mode") or "—",
            "decisiones": len((director or {}).get("decision_history", []) or []),
        },
        "agentes": agentes, "tareas": tareas, "tareas_total": len(_all_tasks),
        "procesos": (procs or {}).get("processes", []) or [],
        "claude": claude_sessions(),
        "git": git_ci_estado(),
        "live": live,
        "errores": {k: v for k, v in {
            "status": e_status, "processes": e_procs, "swarm": e_swarm, "director": e_dir,
        }.items() if v},
    }


# ═══════════ (Adenda 183) CENTRO DE MANDO: chat, control e inventario de APIs ═══════════
ENVSUB = dict(os.environ, PATH=os.path.expanduser("~/.local/bin") + ":" +
              os.path.expanduser("~/.opencode/bin") + ":" + os.environ.get("PATH", ""))
CATALOGO_MD = os.path.join(OS_REPO, "starseed_memory_root", "dream", "modelos-gratuitos.md")
METODOLOGIA = os.path.join(OS_REPO, "starseed_memory_root", "metodologia-ia.md")


def _post_backend(path, body, timeout=25):
    try:
        req = urllib.request.Request(BACKEND + path, data=json.dumps(body).encode(),
                                     headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode()), None
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


def catalogo_apis():
    """Modelos gratis (id·ctx·fuerte) del catálogo vivo + BitNet local. Honesto: es
    la ventana de contexto DISPONIBLE por API para el auto-enrutado del relevo."""
    filas = [{"id": "bitnet-158 (local)", "ctx": "2048", "fuerte": "cognición soberana, sin red ni coste", "via": "backend 1.58"}]
    try:
        for ln in open(CATALOGO_MD, encoding="utf-8", errors="ignore"):
            m = ln.strip().split("|")
            if len(m) >= 5 and ":free" in m[1]:
                filas.append({"id": m[1].strip(), "ctx": m[2].strip(), "fuerte": m[3].strip()[:60], "via": "hermes/opencode"})
    except Exception:
        pass
    return filas[:16]


def config_workflow():
    """Config del workflow + memorias: metodología (extracto), relevo del despachador."""
    met = ""
    try:
        met = open(METODOLOGIA, encoding="utf-8", errors="ignore").read()[:1800]
    except Exception as e:
        met = f"(metodologia-ia.md no legible: {e})"
    relevo = {}
    try:
        sub = os.path.join(OS_REPO, "starseed_memory_root", "subagentes-libres", "subagente.py")
        src = open(sub, encoding="utf-8", errors="ignore").read()
        import ast as _ast
        tree = _ast.parse(src)
        for node in _ast.walk(tree):
            if isinstance(node, _ast.Assign) and getattr(node.targets[0], "id", "") == "ROLES":
                relevo = _ast.literal_eval(node.value)
    except Exception:
        pass
    return {"metodologia": met, "relevo": {k: [f"{m[0]}:{m[1]}" for m in v] for k, v in relevo.items()}}


def chat_con(destino, mensaje):
    """Chat REAL con los agentes: bitnet:<persona> · hermes:<modelo> · opencode:<modelo>.
    Sin plantillas: si el motor no responde, se devuelve el fallo con su motivo."""
    destino = (destino or "bitnet:aurora").strip()
    if destino.startswith("bitnet"):
        persona = destino.split(":", 1)[1] if ":" in destino else "aurora"
        body = {"prompt": mensaje, "system_prompt": "", "preferences": {
            "selected_personalities": [persona], "multi_personality_mode": "single",
            "response_style": "concise", "max_length_chars": 700}}
        d, err = _post_backend("/api/chat", body, timeout=280)
        if err: return {"ok": False, "motor": f"bitnet:{persona}", "texto": f"Backend sin respuesta: {err}"}
        return {"ok": True, "motor": f"bitnet:{persona}", "texto": (d or {}).get("response", "(sin texto)")[:4000]}
    motor, _, modelo = destino.partition(":")
    try:
        if motor == "opencode":
            cmd = ["opencode", "run", mensaje, "--model", modelo or "opencode/nemotron-3.5-lightning-free"]
        else:
            cmd = ["hermes", "-z", mensaje, "-m", modelo or "nvidia/nemotron-nano-9b-v2:free", "--provider", "openrouter", "-t", ""]
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=200, env=ENVSUB)
        txt = re.sub(r"\x1b\[[0-9;]*m", "", out.stdout or "")
        txt = "\n".join(l for l in txt.splitlines() if not re.match(r"^\s*>\s|^\s*build\s·", l)).strip()
        if not txt: return {"ok": False, "motor": destino, "texto": "(sin respuesta del modelo — relevo manual: prueba otro)"}
        return {"ok": True, "motor": destino, "texto": txt[:4000]}
    except Exception as e:
        return {"ok": False, "motor": destino, "texto": f"{type(e).__name__}: {e}"}


def accion_control(tipo, datos):
    """Interferencia REAL en los procesos (endpoints existentes del backend)."""
    if tipo == "set_pref":
        return _post_backend("/api/starseed/cognition/preference", {"preference": datos.get("preference", "auto")})
    if tipo == "cancelar":
        return _post_backend("/api/swarm/task/cancel", {"task_id": datos.get("task_id", "")})
    if tipo == "imaginar":
        return _post_backend("/api/starseed/processes/imagination/trigger", {"theme": datos.get("tema") or None}, timeout=30)
    if tipo == "nueva_tarea":
        return _post_backend("/api/swarm/task/dispatch", {
            "area_id": datos.get("area_id", "area_engineering"), "agent_id": datos.get("agent_id") or None,
            "title": datos.get("titulo", "Tarea manual desde el centro de mando"),
            "prompt": datos.get("prompt", "")}, timeout=30)
    return None, "acción desconocida"


HTML = r"""<!doctype html><html lang=es><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>StarSeed · Orquestación en vivo</title>
<style>
:root{--bg:#07090e;--pan:#0b0e18;--sub:#0c0f1a;--bd:rgba(255,255,255,.08);
--cy:#00f0ff;--pu:#a855f7;--em:#10b981;--am:#f59e0b;--rs:#f43f5e;--tx:#e6ebf2;--mu:#8b96a8;--mono:ui-monospace,"JetBrains Mono",Menlo,monospace}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(1200px 600px at 15% -10%,rgba(0,240,255,.06),transparent),radial-gradient(1000px 500px at 100% 110%,rgba(168,85,247,.06),transparent),var(--bg);color:var(--tx);font:14px/1.5 Outfit,system-ui,sans-serif}
a{color:var(--cy)}.mono{font-family:var(--mono)}
header{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:14px;padding:12px 18px;background:rgba(8,10,16,.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--bd)}
header h1{font-size:15px;margin:0;letter-spacing:.06em;font-weight:700}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block;box-shadow:0 0 8px currentColor}
.wrap{max-width:1400px;margin:0 auto;padding:18px;display:grid;gap:14px;grid-template-columns:repeat(12,1fr)}
.card{background:linear-gradient(180deg,var(--pan),var(--sub));border:1px solid var(--bd);border-radius:16px;padding:14px 16px;box-shadow:0 10px 40px -20px rgba(0,0,0,.7)}
.card h2{margin:0 0 10px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mu);font-weight:700;display:flex;gap:8px;align-items:center}
.c12{grid-column:span 12}.c8{grid-column:span 8}.c6{grid-column:span 6}.c4{grid-column:span 4}.c3{grid-column:span 3}
@media(max-width:1000px){.c8,.c6,.c4,.c3{grid-column:span 12}}
.kpi{display:flex;flex-wrap:wrap;gap:18px}.kpi div{min-width:90px}.kpi b{display:block;font-size:22px;font-family:var(--mono);font-weight:700}.kpi span{font-size:10px;color:var(--mu);text-transform:uppercase;letter-spacing:.1em}
.row{display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid var(--bd);border-radius:11px;background:rgba(0,0,0,.25);margin-bottom:7px}
.orb{width:28px;height:28px;border-radius:50%;flex:none;position:relative;background:radial-gradient(circle at 35% 30%,#fff6,transparent 60%)}
.bar{height:6px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden;flex:1;min-width:60px}
.bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--cy),var(--pu))}
.tag{font-size:10px;padding:2px 7px;border-radius:20px;border:1px solid var(--bd);color:var(--mu);white-space:nowrap}
.tag.ok{color:var(--em);border-color:rgba(16,185,129,.4)}.tag.warn{color:var(--am);border-color:rgba(245,158,11,.4)}.tag.err{color:var(--rs);border-color:rgba(244,63,94,.4)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px}@media(max-width:700px){.grid2{grid-template-columns:1fr}}
.muted{color:var(--mu)}.big{font-size:26px;font-family:var(--mono)}
table{width:100%;border-collapse:collapse;font-size:12px}td,th{text-align:left;padding:5px 8px;border-bottom:1px solid var(--bd)}th{color:var(--mu);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.08em}
.spin{animation:sp 1s linear infinite;display:inline-block}@keyframes sp{to{transform:rotate(360deg)}}
.flow{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px}.flow .n{padding:5px 10px;border:1px solid var(--bd);border-radius:9px;background:rgba(0,0,0,.25)}.flow .a{color:var(--mu)}
</style></head><body>
<header>
  <span id=hb class=dot style=color:var(--mu)></span>
  <h1>STARSEED · ORQUESTACIÓN EN VIVO</h1>
  <span class="tag mono" id=ts>—</span>
  <span style=flex:1></span>
  <span class="tag" id=refresh>refresco 4s</span>
</header>
<div class=wrap id=mando></div>
<div class=wrap id=app><div class="card c12">Cargando fuentes reales…</div></div>
<script>
const $=(h)=>{const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstChild};
const esc=(s)=>String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const nf=(n)=>n==null?'—':Intl.NumberFormat('es').format(Math.round(n));
const kf=(n)=>n==null?'—':(n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(1)+'k':n);
function bar(p){return `<div class=bar><i style=width:${Math.max(0,Math.min(100,p||0))}%></i></div>`}
function tag(txt,cls){return `<span class="tag ${cls||''}">${esc(txt)}</span>`}
</script>
"""

HTML += r"""
<script>
function render(d){
  document.getElementById('ts').textContent = d.ts;
  const hb=document.getElementById('hb');
  hb.style.color = d.backend_vivo ? 'var(--em)' : 'var(--rs)';
  const app=document.getElementById('app'); app.innerHTML='';

  // ── Motor 1.58 + cognición (KPIs) ──
  const m=d.motor,c=d.cognicion;
  const okReal = c.llamadas ? Math.round(100*c.reales/c.llamadas) : null;
  app.append($(`<div class="card c8"><h2>◈ Motor 1.58 · Cognición real</h2>
    <div class=kpi>
      <div><b style="color:${d.backend_vivo?'var(--em)':'var(--rs)'}">${esc(m.real_mode)}</b><span>modo motor</span></div>
      <div><b>${esc(m.preferencia)}</b><span>preferencia (${esc(m.preferencia_fuente)})</span></div>
      <div><b>${esc(m.cuantizacion)}</b><span>cuantización</span></div>
      <div><b>${nf(c.reales)}<span class=muted style="font-size:12px">/${nf(c.llamadas)}</span></b><span>real / llamadas</span></div>
      <div><b style="color:${c.errores?'var(--am)':'var(--tx)'}">${nf(c.errores)}</b><span>errores</span></div>
      <div><b>${c.tps!=null?(+c.tps).toFixed(1):'—'}</b><span>tok/s medido</span></div>
      <div><b>${nf(m.ctx)}</b><span>ventana ctx</span></div>
    </div>
    <p class=muted style=margin:8px_0_0>${esc(m.modelo)} · servidor: ${esc(m.servidor)} ${okReal!=null?'· '+okReal+'% respuestas reales':''}${c.plantillas?' · '+nf(c.plantillas)+' plantillas':''}</p>
    ${d.backend_motivo?`<p>${tag('backend sin conexión: '+d.backend_motivo,'err')}</p>`:''}</div>`));

  // ── Gobernador / troncos ──
  const g=d.gobernador;
  app.append($(`<div class="card c4"><h2>◈ Gobernador de capacidad</h2>
    <div class=kpi>
      <div><b>${esc(g.modo)}</b><span>modo</span></div>
      <div><b>${g.capacidad_pct!=null?g.capacidad_pct+'%':'—'}</b><span>capacidad</span></div>
      <div><b>${nf(g.nucleos)}</b><span>núcleos</span></div>
    </div>
    <p class=muted style=margin:8px_0_4>CPU sistema ${g.cpu_sistema!=null?Math.round(g.cpu_sistema)+'%':'—'} · batería ${g.bateria!=null?g.bateria+'%':'—'}</p>
    <div style=font-size:11px>Tronco imaginación ${bar(g.tronco_imaginacion)} <span class=muted>${g.tronco_imaginacion!=null?g.tronco_imaginacion+'%':'—'}</span></div>
    <div style="font-size:11px;margin-top:5px">Tronco enjambre ${bar(g.tronco_enjambre)} <span class=muted>${g.tronco_enjambre!=null?g.tronco_enjambre+'%':'—'}</span></div></div>`));

  // ── Auto-rutado: Director → áreas/agentes → proyectos/cerebros ──
  const dir=d.director;
  app.append($(`<div class="card c12"><h2>◈ Auto-rutado de la orquestación</h2>
    <div class=flow>
      <span class=n title="${esc(dir.directiva)}">👑 Director ${dir.disponible?'Metis':'(sin conexión)'}</span>
      <span class=a>→</span><span class=n>${d.agentes.length} agentes · modo ${esc(dir.modo)}</span>
      <span class=a>→</span><span class=n>${d.tareas.length} tareas vivas</span>
      <span class=a>→</span><span class=n>proyectos · cerebros</span>
      <span class=a>·</span><span class=muted>${dir.decisiones} decisiones registradas</span>
    </div>
    <p class=muted style=margin:8px_0_0>Directiva activa: ${esc(dir.directiva)}</p></div>`));
}
</script>
"""

HTML += r"""
<script>
function renderAgentes(app,d){
  const rows = d.agentes.length ? d.agentes.map(a=>{
    const busy = !/idle|off|paused|inactive/i.test(a.estado);
    const col = busy ? 'var(--em)' : 'var(--mu)';
    return `<div class=row>
      <span class=orb style="box-shadow:0 0 10px ${col};background:radial-gradient(circle at 35% 30%,#fff8,${busy?'rgba(16,185,129,.5)':'rgba(139,150,168,.35)'})"></span>
      <div style=flex:1;min-width:0>
        <div style=display:flex;gap:8px;align-items:center><b>${esc(a.nombre)}</b>${tag(a.estado,busy?'ok':'')}${a.cerebros.length?tag('🧠 '+a.cerebros.join(', ')):''}</div>
        <div class=muted style=font-size:11px>${esc(a.personalidad)} · <span class=mono>${esc(a.modelo)}</span></div>
        <div style=font-size:11px;margin-top:3px>${esc(a.tarea)}</div>
      </div>
      <div style=width:130px;text-align:right>
        ${busy?bar(a.progreso):''}
        <div class="muted mono" style=font-size:10px;margin-top:4px>${a.completadas}✓ · ${a.subagentes} sub · c${a.concurrencia}</div>
      </div></div>`;
  }).join('') : `<p class=muted>Sin agentes reportados por el enjambre ahora mismo.</p>`;
  app.append($(`<div class="card c6"><h2>◈ Agentes orquestados (${d.agentes.length})</h2>${rows}</div>`));
}
function renderTareas(app,d){
  const rows = d.tareas.length ? d.tareas.map(t=>`<div class=row>
      <button title="Cancelar esta tarea (real)" onclick="accion('cancelar',{task_id:'${esc(t.id||'')}'})" style="flex:none;border:1px solid rgba(244,63,94,.35);background:rgba(244,63,94,.08);color:#fda4af;border-radius:8px;width:24px;height:24px;cursor:pointer">✕</button>
      <div style=flex:1;min-width:0>
        <b>${esc(t.titulo)}</b>
        <div class=muted style=font-size:11px>${esc(t.area)} · ${esc(t.agente)} · fase ${esc(t.fase)} · → ${esc(t.proyecto)}</div>
      </div>
      <div style=width:120px;text-align:right>${bar(t.progreso)}
        <div class="muted mono" style=font-size:10px;margin-top:4px>${t.cpu!=null?t.cpu+'% cpu':''} ${t.ram_mb!=null?Math.round(t.ram_mb)+'MB':''}</div>
      </div></div>`).join('') : `<p class=muted>Sin tareas vivas en el enjambre (reposo).</p>`;
  const extra = (d.tareas_total||d.tareas.length) - d.tareas.length;
  app.append($(`<div class="card c6"><h2>◈ Tareas en segundo plano (${d.tareas_total||d.tareas.length})</h2>${rows}${extra>0?`<p class=muted style=font-size:11px>+${extra} más en cola</p>`:''}</div>`));
}
function renderClaude(app,d){
  const t=d.claude.total;
  const rel = t.relectura_pct;
  const relCls = rel>85?'err':rel>60?'warn':'ok';
  const sesiones = (d.claude.sesiones||[]).map(s=>`<tr><td class=mono>${esc(s.archivo)}</td><td>${s.cuando}</td><td class=mono>${kf(s.input+s.cache_read+s.cache_creation)}</td><td class=mono>${kf(s.output)}</td><td>${tag(s.relectura_pct+'%',s.relectura_pct>85?'err':s.relectura_pct>60?'warn':'ok')}</td></tr>`).join('');
  app.append($(`<div class="card c8"><h2>◈ Uso de tokens · sesiones Claude (últimas ${(d.claude.sesiones||[]).length})</h2>
    ${d.claude.disponible?`<div class=kpi>
      <div><b>${kf(t.total)}</b><span>tokens totales</span></div>
      <div><b class=mono>${kf(t.cache_read)}</b><span>relectura caché</span></div>
      <div><b class=mono>${kf(t.output)}</b><span>salida</span></div>
      <div><b class=mono>${kf(t.input)}</b><span>entrada nueva</span></div>
      <div><b>${tag(rel+'%',relCls)}</b><span>% relectura</span></div>
      <div><b>${nf(t.turnos)}</b><span>turnos</span></div>
    </div>
    <table style=margin-top:10px><tr><th>sesión</th><th>hora</th><th>entrada</th><th>salida</th><th>relect.</th></tr>${sesiones}</table>
    <p class=muted style=margin-top:8px;font-size:11px>Relectura alta = caché haciendo su trabajo (barato); rómpela y todo reprocesa a precio completo. Regla: una sesión = una ola.</p>`
    :`<p class=muted>No hay logs de sesiones Claude legibles en ~/.claude/projects.</p>`}</div>`));
}
</script>
"""

HTML += r"""
<script>
function renderVerif(app,d){
  const g=d.git||{}, live=d.live||{}, v=live.verificacion||{};
  const ciCls = (g.os&&g.os.ci==='success')?'ok':(g.os&&g.os.ci==='pending')?'warn':'err';
  const crCls = /desplegado/.test(g.cloud_run||'')?'ok':/falló/.test(g.cloud_run||'')?'err':'warn';
  const roles = (live.roles||[]).map(r=>`<div class=row><span class=orb style="box-shadow:0 0 10px var(--cy)"></span>
     <div style=flex:1><b>${esc(r.rol)}</b> <span class=muted>· ${esc(r.modelo)}</span><div style=font-size:11px class=muted>${esc(r.tarea)}</div></div>${tag(r.estado,/activo|sirviendo/.test(r.estado)?'ok':'')}</div>`).join('');
  const tareas = (live.tareas||[]).map(t=>`<tr><td>#${t.id}</td><td>${esc(t.titulo)}</td><td>${tag(t.estado, /completada/.test(t.estado)?'ok':/curso/.test(t.estado)?'warn':'')}</td></tr>`).join('');
  app.append($(`<div class="card c12"><h2>◈ Verificación del desarrollo · dirección de la orquestación (Fable 5)</h2>
    <div class=grid2>
      <div>
        <p class=muted style=font-size:11px;margin:0>Orquestador: <b style=color:var(--tx)>${esc((live.sesion||{}).orquestador||'Claude Fable 5')}</b> · ${esc((live.sesion||{}).ola||'')}</p>
        ${roles}
      </div>
      <div>
        <div class=row><div style=flex:1>OS <span class="muted mono" style=font-size:11px>${esc((g.os||{}).head||'')}</span></div>${tag('CI '+((g.os||{}).ci||'?'),ciCls)}</div>
        <div class=row><div style=flex:1>Astraura <span class="muted mono" style=font-size:11px>${esc((g.astraura||{}).head||'')}</span></div></div>
        <div class=row><div style=flex:1>Vercel producción</div>${tag(v.vercel_produccion||'?', /success/.test(v.vercel_produccion||'')?'ok':'warn')}</div>
        <div class=row><div style=flex:1>Cloud Run</div>${tag(g.cloud_run||'?',crCls)}</div>
        <div class=row><div style=flex:1>Puertas</div><span class="muted mono" style=font-size:11px>${esc(v.tsc||'')} · ${esc(v.vitest||'')}</span></div>
        <table style=margin-top:6px>${tareas}</table>
      </div>
    </div></div>`));
}
async function tick(){
  try{
    const d = await (await fetch('/api/estado',{cache:'no-store'})).json();
    render(d);
    const app=document.getElementById('app');
    renderAgentes(app,d); renderTareas(app,d); renderClaude(app,d);
    // Procesos del puente (imaginación/enjambre/director/aprendizaje)
    if((d.procesos||[]).length){
      const chips=d.procesos.map(p=>`${tag((p.name||p.id)+(p.counters?' · '+Object.entries(p.counters).map(([k,v])=>k+':'+v).join(' '):''), p.running?'ok':'')}`).join(' ');
      app.append($(`<div class="card c4"><h2>◈ Procesos del puente (${d.procesos.length})</h2><div style=display:flex;flex-wrap:wrap;gap:6px>${chips}</div></div>`));
    }
    renderVerif(app,d);
    document.getElementById('refresh').textContent='refresco 4s · '+d.ts.slice(11);
  }catch(e){
    document.getElementById('hb').style.color='var(--rs)';
    document.getElementById('refresh').textContent='visor sin datos: '+e;
  }
}
tick(); setInterval(tick,4000);
</script>
<script>
/* ═══ (Adenda 183) CENTRO DE MANDO: chat con los agentes + control + workflow + APIs ═══ */
const MANDO = { log: [] };
const DESTINOS = [
  ['bitnet:aurora','BitNet 1.58 · Aurora'], ['bitnet:astraura_prime','BitNet 1.58 · Astraura Prime'],
  ['bitnet:hephaestus','BitNet 1.58 · Hefesto'], ['bitnet:hermes','BitNet 1.58 · Hermes'],
  ['bitnet:atenea','BitNet 1.58 · Atenea'], ['bitnet:mnemosyne','BitNet 1.58 · Mnemosine'],
  ['hermes:nvidia/nemotron-nano-9b-v2:free','API libre · Nemotron Nano 9B'],
  ['hermes:nvidia/nemotron-3-ultra-550b-a55b:free','API libre · Nemotron Ultra 550B'],
  ['hermes:google/gemma-4-26b-a4b-it:free','API libre · Gemma 4 26B'],
  ['opencode:opencode/nemotron-3.5-lightning-free','opencode · Nemotron 3.5 Lightning'],
  ['opencode:opencode/nemotron-3-ultra-free','opencode · Nemotron 3 Ultra'],
];
async function accion(tipo, datos){
  const st=document.getElementById('mando-estado'); if(st) st.textContent='ejecutando '+tipo+'…';
  try{ const r=await (await fetch('/api/accion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo,datos})})).json();
    if(st) st.textContent = r.ok===false||r.error ? ('⚠ '+(r.error||JSON.stringify(r).slice(0,90))) : '✓ '+tipo+' aplicada'; }
  catch(e){ if(st) st.textContent='⚠ '+e; }
}
function pintaLog(){
  const el=document.getElementById('mando-log'); if(!el) return;
  el.innerHTML = MANDO.log.map(m=>`<div style="margin-bottom:8px"><span class=tag style="color:${m.rol==='tú'?'var(--cy)':m.ok===false?'var(--rs)':'var(--em)'}">${esc(m.rol)}</span><div style="white-space:pre-wrap;font-size:12px;margin-top:3px">${esc(m.txt)}</div></div>`).join('');
  el.scrollTop = el.scrollHeight;
}
async function chatear(){
  const inp=document.getElementById('mando-msg'), sel=document.getElementById('mando-destino');
  const msg=(inp.value||'').trim(); if(!msg) return;
  inp.value='';
  MANDO.log.push({rol:'tú', txt:msg}); MANDO.log.push({rol:sel.value, txt:'… generando (real, puede tardar; BitNet local ~1-3 min)'}); pintaLog();
  try{
    const r=await (await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({destino:sel.value,mensaje:msg})})).json();
    MANDO.log[MANDO.log.length-1]={rol:r.motor||sel.value, ok:r.ok, txt:r.texto||'(vacío)'};
  }catch(e){ MANDO.log[MANDO.log.length-1]={rol:sel.value, ok:false, txt:'fallo: '+e}; }
  pintaLog();
}
async function montaMando(){
  let cfg={apis:[],workflow:{metodologia:'',relevo:{}}};
  try{ cfg=await (await fetch('/api/config')).json(); }catch(e){}
  const apis=(cfg.apis||[]).map(a=>`<tr><td class=mono style=font-size:11px>${esc(a.id)}</td><td class=mono>${esc(a.ctx)}</td><td class=muted style=font-size:11px>${esc(a.fuerte)}</td><td>${tag(a.via)}</td></tr>`).join('');
  const opciones = DESTINOS.map(d=>'<option value="'+d[0]+'">'+esc(d[1])+'</option>').join('');
  const relevo=Object.entries(cfg.workflow.relevo||{}).map(([rol,cad])=>`<div style=font-size:11px><b>${esc(rol)}</b> → <span class="muted mono">${esc(cad.join(' ⟶ '))}</span></div>`).join('');
  document.getElementById('mando').append($(`<div class="card c12"><h2>◈ Centro de mando · habla e interfiere en tiempo real</h2>
    <div class=grid2>
      <div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <select id=mando-destino style="flex:1;background:var(--sub);color:var(--tx);border:1px solid var(--bd);border-radius:9px;padding:7px">${opciones}</select>
        </div>
        <div id=mando-log style="height:210px;overflow-y:auto;border:1px solid var(--bd);border-radius:11px;background:rgba(0,0,0,.3);padding:10px"><p class=muted style=font-size:12px>Chatea con los agentes orquestados: BitNet 1.58 local (personalidades reales del backend) o cualquier IA libre de las librerías. Todo real; lo que no responda, lo dirá.</p></div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input id=mando-msg placeholder="Habla con el agente… (Enter envía)" style="flex:1;background:var(--sub);color:var(--tx);border:1px solid var(--bd);border-radius:9px;padding:9px" onkeydown="if(event.key==='Enter')chatear()">
          <button onclick=chatear() style="border:1px solid rgba(0,240,255,.4);background:rgba(0,240,255,.1);color:var(--cy);border-radius:9px;padding:0 16px;cursor:pointer">Enviar</button>
        </div>
      </div>
      <div>
        <p class=muted style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 6px">Interferir en los procesos (acciones reales)</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
          <button onclick="accion('set_pref',{preference:'auto'})" class=tag style=cursor:pointer>motor: auto</button>
          <button onclick="accion('set_pref',{preference:'bitnet-158'})" class=tag style=cursor:pointer>motor: solo BitNet</button>
          <button onclick="accion('set_pref',{preference:'multimodel'})" class=tag style=cursor:pointer>motor: multimodelo</button>
          <button onclick="accion('imaginar',{tema:document.getElementById('mando-tarea').value||null})" class=tag style="cursor:pointer;color:var(--pu)">✨ imaginar ahora</button>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:6px">
          <input id=mando-tarea placeholder="Título/tema de nueva tarea para el enjambre…" style="flex:1;background:var(--sub);color:var(--tx);border:1px solid var(--bd);border-radius:9px;padding:7px;font-size:12px">
          <button onclick="accion('nueva_tarea',{titulo:document.getElementById('mando-tarea').value,prompt:document.getElementById('mando-tarea').value})" class=tag style=cursor:pointer>＋ despachar</button>
        </div>
        <p id=mando-estado class=muted style="font-size:11px;min-height:16px"></p>
        <details><summary style="cursor:pointer;font-size:12px">⚙ Workflow y memorias (metodología viva)</summary>
          <div style="margin-top:6px">${relevo||'<p class=muted style=font-size:11px>relevo no legible</p>'}</div>
          <pre style="white-space:pre-wrap;font-size:10px;color:var(--mu);max-height:160px;overflow-y:auto;margin-top:6px">${esc((cfg.workflow.metodologia||'').slice(0,1600))}</pre>
        </details>
        <details style=margin-top:6px><summary style="cursor:pointer;font-size:12px">🔌 APIs y ventanas de contexto (auto-enrutado)</summary>
          <table style=margin-top:6px><tr><th>modelo</th><th>ctx</th><th>fuerte en</th><th>vía</th></tr>${apis}</table>
        </details>
      </div>
    </div></div>`));
}
montaMando();
</script></body></html>
"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):  # silencio
        pass

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code); self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body))); self.send_header("Cache-Control", "no-store")
        self.end_headers(); self.wfile.write(body)

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length") or 0)
            datos = json.loads(self.rfile.read(n).decode("utf-8")) if n else {}
        except Exception:
            return self._json({"ok": False, "error": "JSON inválido"}, 400)
        if self.path.startswith("/api/chat"):
            return self._json(chat_con(datos.get("destino"), str(datos.get("mensaje", ""))[:4000]))
        if self.path.startswith("/api/accion"):
            res, err = accion_control(str(datos.get("tipo", "")), datos.get("datos") or {})
            if err: return self._json({"ok": False, "error": err})
            return self._json({"ok": True, **(res or {})})
        return self._json({"ok": False, "error": "ruta desconocida"}, 404)

    def do_GET(self):
        if self.path.startswith("/api/config"):
            return self._json({"apis": catalogo_apis(), "workflow": config_workflow()})
        if self.path.startswith("/api/estado"):
            body = json.dumps(estado_completo(), ensure_ascii=False).encode("utf-8")
            self.send_response(200); self.send_header("Content-Type", "application/json; charset=utf-8")
        else:
            body = HTML.encode("utf-8")
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers(); self.wfile.write(body)


if __name__ == "__main__":
    port = int(os.environ.get("VISOR_PORT", "8899"))
    print(f"Visor de orquestación StarSeed en http://localhost:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
