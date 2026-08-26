"""
economic_router.py — Router Económico Inteligente de Astraura 1.58-bit.

Selecciona el modelo óptimo por eficiencia ECONÓMICA para cada tarea y
sincroniza múltiples subagentes (modelos gratuitos distintos en paralelo)
con síntesis determinista LOCAL (sin gastar un LLM extra en resumir).

Principios:
  · Local primero: bitnet-158-local (coste 0, soberano) es el predeterminado,
    igual que ENRUTADO_POR_DEFECTO de agent_genesis_engine.
  · Remoto gratis solo como fallback (OpenRouter :free), nunca pago salvo que
    el usuario autorice EXPLÍCITAMENTE la capa REMOTO_PAGO (default OFF).
  · La clasificación de tareas es heurística local pura — ninguna llamada a
    LLM para clasificar (eso gastaría justo lo que esto ahorra).
  · Todos los métodos capturan sus excepciones y devuelven estados degradados
    honestos. run_synced_subagents NUNCA lanza.

ARCHIVO ÚNICO: no modifica main.py ni mesh_network.py ni bitnet_engine.py.
main.py lo integrará otro paso vía la instancia `economic_router`.
"""
from __future__ import annotations

import asyncio
import os
import re
import time
import uuid
from typing import Any, Dict, List, Optional

try:
    import httpx
except Exception:  # pragma: no cover — degradación honesta si falta httpx
    httpx = None

# ─────────────────────────────────────────────────────────────────────────
# Catálogo de modelos clasificados por coste/capacidad
# ─────────────────────────────────────────────────────────────────────────
# niveles: LOCAL_GRATIS | REMOTO_GRATIS | REMOTO_PAGO (este último requiere
# autorización explícita del usuario; default OFF).
CATALOGO_MODELOS: List[Dict[str, Any]] = [
    {
        "id": "bitnet-158-local",
        "nivel": "LOCAL_GRATIS",
        "proveedor": "bitnet-158-local",
        "coste_por_1m_tokens": 0.0,
        "calidad_estimada": 72,
        "latencia_tipica_ms": 900,
        "ram_necesaria_gb": 2.0,
        "especialidad": "general",
    },
    {
        "id": "openrouter/deepseek/deepseek-chat-v3-0324:free",
        "nivel": "REMOTO_GRATIS",
        "proveedor": "openrouter",
        "coste_por_1m_tokens": 0.0,
        "calidad_estimada": 85,
        "latencia_tipica_ms": 3500,
        "ram_necesaria_gb": 0.0,
        "especialidad": "razonamiento",
    },
    {
        "id": "openrouter/qwen/qwen-2.5-coder-32b-instruct:free",
        "nivel": "REMOTO_GRATIS",
        "proveedor": "openrouter",
        "coste_por_1m_tokens": 0.0,
        "calidad_estimada": 82,
        "latencia_tipica_ms": 3000,
        "ram_necesaria_gb": 0.0,
        "especialidad": "codigo",
    },
    {
        # Alias genérico: agent_genesis_engine ya sabe probar modelos :free en vivo.
        "id": "openrouter/free",
        "nivel": "REMOTO_GRATIS",
        "proveedor": "openrouter",
        "coste_por_1m_tokens": 0.0,
        "calidad_estimada": 65,
        "latencia_tipica_ms": 4000,
        "ram_necesaria_gb": 0.0,
        "especialidad": "general",
    },
]

_OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"
_TIMEOUT_LLAMADA_S = 45.0


def _openrouter_key() -> Optional[str]:
    """Mismo patrón que agent_genesis_engine._openrouter_key(). Sin credenciales
    hardcodeadas: lee el entorno. Intenta importar la original si es posible."""
    try:  # importarla garantiza una sola fuente de verdad
        from .agent_genesis_engine import _openrouter_key as _fn
        clave = _fn()
        if clave:
            return clave
    except Exception:
        pass
    clave = (os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPENROUTER_SHARED_KEY") or "").strip()
    return clave or None


def _modelo_disponible_localmente(modelo: Dict[str, Any]) -> bool:
    """¿Está vivo el motor local? Sondeo barato a Ollama (1s máx), con cache
    corta para no sondear en cada prompt."""
    if modelo["proveedor"] != "bitnet-158-local" or httpx is None:
        return True  # remotos no dependen de Ollama
    ahora = time.time()
    cache = EconomicRouter._cache_local
    if cache["at"] and (ahora - cache["at"]) < 15.0:
        return bool(cache["vivo"])
    url = (os.environ.get("ASTRAURA_OLLAMA_URL") or "http://127.0.0.1:11434").rstrip("/")
    vivo = False
    try:
        resp = httpx.get(f"{url}/api/tags", timeout=1.5)
        vivo = resp.status_code == 200
    except Exception:
        vivo = False
    cache["at"] = ahora
    cache["vivo"] = vivo
    return vivo


# ══════════════════════════════════════════════════════════════════════════
# Clasificación heurística local de tareas
# ══════════════════════════════════════════════════════════════════════════
_PALABRAS_CODIGO = re.compile(
    r"\b(cod[íi]go|function|def |class |python|javascript|typescript|bug|refactor|"
    r"api|sql|regex|compile|debug|script|css|html|docker|git)\b", re.IGNORECASE)
_PALABRAS_RAZONAMIENTO = re.compile(
    r"\b(analiz|demostr|por qué|why|estrategia|compar[a-z]*|eval[uú]a|matem[áa]tic|"
    r"calcul|resuelve|prueba|l[óo]gica|plan|arquitectura|dise[ñn]o de)\b", re.IGNORECASE)
_PALABRAS_CREATIVO = re.compile(
    r"\b(escrib[eir]|poema|cuento|historia|canci[óo]n|eslogan|nombre para|"
    r"creativ|gui[óo]n|marketing|post|tweet|redacta)\b", re.IGNORECASE)


def classify_task(prompt: str) -> Dict[str, Any]:
    """Clasifica una tarea SIN llamar a ningún LLM (heurísticas locales).

    Returns: {"complejidad": "baja"|"media"|"alta",
              "especialidad": "codigo"|"razonamiento"|"creativo"|"general",
              "tokens_estimados": int,   # ~prompt + holgura de respuesta
              "menciones_agentes": [str]}
    """
    try:
        texto = (prompt or "").strip()
        palabras = len(texto.split())
        menciones = sorted(set(re.findall(r"@([a-zA-Z0-9_\-]+)", texto)))

        puntuaje_codigo = len(_PALABRAS_CODIGO.findall(texto))
        puntuaje_razon = len(_PALABRAS_RAZONAMIENTO.findall(texto))
        puntuaje_creativo = len(_PALABRAS_CREATIVO.findall(texto))

        if max(puntuaje_codigo, puntuaje_razon, puntuaje_creativo) == 0:
            especialidad = "general"
        else:
            especialidad = {
                puntuaje_codigo: "codigo",
                puntuaje_razon: "razonamiento",
                puntuaje_creativo: "creativo",
            }[max(puntuaje_codigo, puntuaje_razon, puntuaje_creativo)]

        # Complejidad: longitud + densidad de señales + presencia de @menciones
        # (varias menciones sugieren tarea multi-agente = más compleja).
        puntos = (
            (palabras > 40) + (palabras > 120) * 2
            + (puntuaje_codigo + puntuaje_razon >= 3)
            + (len(menciones) >= 2)
        )
        complejidad = "alta" if puntos >= 3 else ("media" if puntos >= 1 else "baja")

        tokens_estimados = int(max(64, palabras * 1.4) + (512 if complejidad == "alta" else 192))
        return {"complejidad": complejidad, "especialidad": especialidad,
                "tokens_estimados": tokens_estimados, "menciones_agentes": menciones}
    except Exception as e:
        return {"complejidad": "media", "especialidad": "general",
                "tokens_estimados": 256, "menciones_agentes": [],
                "degradado": True, "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════
# Router económico
# ══════════════════════════════════════════════════════════════════════════
class EconomicRouter:
    """Selección optimizada de modelos por eficiencia económica."""

    _cache_local: Dict[str, Any] = {"at": 0.0, "vivo": False}

    def __init__(self) -> None:
        self.autorizar_pago: bool = False  # REMOTO_PAGO default OFF
        self._stats: Dict[str, Any] = {
            "selecciones": 0, "subagent_runs": 0, "subagent_fallos": 0,
            "ultimo_modelo": None, "ultima_vez": None,
        }

    # ── selección ────────────────────────────────────────────────────────
    def select_model(
        self,
        task_class: Dict[str, Any],
        preferencia_usuario: str = "economica",
    ) -> Dict[str, Any]:
        """Devuelve {modelo, motivo} del catálogo. 'economica': local gratis
        primero; remoto gratis si la local no vive o la complejidad es alta y
        hay clave OpenRouter. Pago NUNCA sin self.autorizar_pago=True.
        'calidad': mejor calidad disponible respetando la autorización."""
        try:
            self._stats["selecciones"] += 1
            self._stats["ultima_vez"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
            preferencia = (preferencia_usuario or "economica").lower()
            tc = task_class or {}
            especialidad = tc.get("especialidad", "general")
            complejidad = tc.get("complejidad", "media")

            candidatos = [m for m in CATALOGO_MODELOS
                          if m["nivel"] != "REMOTO_PAGO" or self.autorizar_pago]
            vivos = [m for m in candidatos
                     if m["proveedor"] == "bitnet-158-local" or _modelo_disponible_localmente(m)]
            # El local cuenta como vivo aunque Ollama esté caído (el motor
            # bitnet_engine tiene plantillas nativas como último recurso).
            for m in candidatos:
                if m not in vivos and m["proveedor"] == "bitnet-158-local":
                    vivos.append(m)

            clave_or = _openrouter_key()
            remotos_ok = [m for m in vivos
                          if m["proveedor"] == "openrouter" and clave_or]
            locales = [m for m in vivos if m["proveedor"] == "bitnet-158-local"]

            def _elegir(pool: List[Dict[str, Any]], criterio_calidad: bool) -> Optional[Dict[str, Any]]:
                if not pool:
                    return None
                if criterio_calidad:
                    afin = [m for m in pool if m["especialidad"] == especialidad]
                    return max(afin or pool, key=lambda m: m["calidad_estimada"])
                afin = [m for m in pool if m["especialidad"] == especialidad]
                return min(afin or pool, key=lambda m: (m["coste_por_1m_tokens"],
                                                        m["latencia_tipica_ms"]))

            if preferencia == "calidad":
                eleccion = _elegir(remotos_ok + locales, True)
                if eleccion is None:
                    eleccion = _elegir(locales or vivos, False)
                if eleccion:
                    motivo = (f"elegido {eleccion['id']} porque maximiza calidad estimada "
                              f"({eleccion['calidad_estimada']}/100) disponible sin coste "
                              f"(o con autorización explícita si fuera de pago)")
                else:
                    return self._degradado()
            else:  # economica (default)
                if locales and (complejidad != "alta" or not remotos_ok):
                    eleccion = _elegir(locales, False)
                    motivo = (f"elegido {eleccion['id']} porque es LOCAL y GRATIS (coste 0); "
                              f"remoto gratis no necesario (complejidad {complejidad}"
                              f"{'' if remotos_ok else ', sin OPENROUTER_API_KEY configurada'})")
                elif remotos_ok:
                    eleccion = _elegir(remotos_ok, False)
                    motivo = (f"elegido {eleccion['id']} porque la tarea es de complejidad "
                              f"{complejidad} y supera al local gratuito; sigue siendo "
                              f"COSTE 0 (OpenRouter :free)")
                else:
                    eleccion = _elegir(vivos, False)
                    motivo = (f"elegido {eleccion['id']} como único candidato vivo; "
                              f"estado degradado (sin local sano ni OpenRouter)")
            self._stats["ultimo_modelo"] = eleccion["id"]
            return {
                "modelo": eleccion["id"], "motivo": motivo,
                "nivel": eleccion["nivel"], "coste_por_1m_tokens": eleccion["coste_por_1m_tokens"],
                "calidad_estimada": eleccion["calidad_estimada"],
                "especialidad": eleccion["especialidad"],
            }
        except Exception as e:
            return self._degradado(str(e))

    @staticmethod
    def _degradado(error: str = "") -> Dict[str, Any]:
        return {"modelo": "bitnet-158-local",
                "motivo": f"degradado honesto: fallback local gratis siempre disponible"
                          + (f" ({error})" if error else ""),
                "nivel": "LOCAL_GRATIS", "coste_por_1m_tokens": 0.0,
                "calidad_estimada": 72, "especialidad": "general", "degradado": True}

    # ── subagentes sincronizados ─────────────────────────────────────────
    async def run_synced_subagents(
        self,
        prompt: str,
        n_subagents: int = 3,
        preferencia_usuario: str = "economica",
    ) -> Dict[str, Any]:
        """Despacha N subtareas a modelos DISTINTOS del catálogo gratuito en
        paralelo (asyncio.gather, return_exceptions=True). Sintetiza de forma
        determinista LOCAL (sin LLM). Nunca lanza."""
        corrida_id = f"sub-{uuid.uuid4().hex[:8]}"
        try:
            n_subagents = max(1, min(int(n_subagents), 6))
            self._stats["subagent_runs"] += 1

            # Pool gratuito ordenado: local primero, luego los mejores remotos gratis.
            pool = sorted([m for m in CATALOGO_MODELOS if m["nivel"] != "REMOTO_PAGO"],
                          key=lambda m: (-m["nivel"].startswith("LOCAL"), -m["calidad_estimada"]))
            clave_or = _openrouter_key()
            elegidos: List[Dict[str, Any]] = []
            for m in pool:
                if m["proveedor"] == "openrouter" and not clave_or:
                    continue
                if all(e["id"] != m["id"] for e in elegidos):
                    elegidos.append(m)
                if len(elegidos) >= n_subagents:
                    break
            if not elegidos:
                elegidos = [next(m for m in CATALOGO_MODELOS
                                 if m["id"] == "bitnet-158-local")]

            resultados = await asyncio.gather(
                *[self._ejecutar_subagente(corrida_id, i, m, prompt) for i, m in enumerate(elegidos)],
                return_exceptions=True)

            respuestas: List[Dict[str, Any]] = []
            fallos: List[Dict[str, Any]] = []
            for i, (res, m) in enumerate(zip(resultados, elegidos)):
                if isinstance(res, Exception):
                    fallos.append({"indice": i, "modelo": m["id"], "error": str(res)})
                    self._stats["subagent_fallos"] += 1
                elif res.get("ok"):
                    respuestas.append(res)
                else:
                    fallos.append({"indice": i, "modelo": m["id"], "error": res.get("error")})
                    self._stats["subagent_fallos"] += 1

            sintesis = synthesize(respuestas)
            return {"ok": True, "corrida_id": corrida_id,
                    "n_despachados": len(elegidos),
                    "n_exitosos": len(respuestas), "fallos": fallos,
                    "respuestas_parciales": [
                        {k: r[k] for k in ("subagente", "modelo", "texto", "puntos_calidad")}
                        for r in respuestas],
                    "sintesis": sintesis}
        except Exception as e:
            return {"ok": False, "corrida_id": corrida_id, "error": str(e),
                    "sintesis": {"texto": "", "degradado": True}}

    async def _ejecutar_subagente(
        self, corrida_id: str, indice: int, modelo: Dict[str, Any], prompt: str
    ) -> Dict[str, Any]:
        """Un subagente = un modelo. Devuelve dict con ok/texto; jamás lanza
        hacia gather (return_exceptions cubre lo demás)."""
        sub_id = f"{corrida_id}/sa{indice}"
        t0 = time.perf_counter()
        try:
            if modelo["proveedor"] == "bitnet-158-local":
                texto = await self._generar_local(prompt)
                origen = "ollama-local"
            else:
                texto = await self._generar_openrouter(modelo["id"], prompt)
                origen = "openrouter"
            ms = int((time.perf_counter() - t0) * 1000)
            return {"ok": True, "subagente": sub_id, "modelo": modelo["id"],
                    "origen": origen, "texto": texto, "latencia_ms": ms,
                    "puntos_calidad": _puntuar(texto, modelo)}
        except Exception as e:
            return {"ok": False, "subagente": sub_id, "modelo": modelo["id"],
                    "error": str(e)}

    async def _generar_local(self, prompt: str) -> str:
        """Llama a Ollama directamente (el chat usará bitnet_engine; aquí solo
        necesitamos una respuesta cruda y barata para el subagente local)."""
        if httpx is None:
            raise RuntimeError("httpx no disponible")
        url = (os.environ.get("ASTRAURA_OLLAMA_URL") or "http://127.0.0.1:11434").rstrip("/")
        modelo = (os.environ.get("ASTRAURA_OLLAMA_MODEL") or "").strip() or "qwen2.5:1.5b"
        async with httpx.AsyncClient(timeout=_TIMEOUT_LLAMADA_S) as c:
            r = await c.post(f"{url}/api/generate",
                             json={"model": modelo, "prompt": prompt, "stream": False})
            r.raise_for_status()
            texto = (r.json() or {}).get("response") or ""
        if not texto.strip():
            raise RuntimeError("motor local respondió vacío")
        return texto.strip()

    async def _generar_openrouter(self, modelo_id: str, prompt: str) -> str:
        clave = _openrouter_key()
        if not clave:
            raise RuntimeError("OPENROUTER_API_KEY no configurada")
        if httpx is None:
            raise RuntimeError("httpx no disponible")
        headers = {"Authorization": f"Bearer {clave}",
                   "HTTP-Referer": "https://astraura.local",
                   "X-Title": "Astraura 1.58-bit EconomicRouter"}
        payload = {"model": modelo_id.replace("openrouter/", "", 1),
                   "messages": [{"role": "user", "content": prompt}],
                   "max_tokens": 1024}
        async with httpx.AsyncClient(timeout=_TIMEOUT_LLAMADA_S) as c:
            r = await c.post(_OPENROUTER_CHAT_URL, json=payload, headers=headers)
            r.raise_for_status()
            datos = r.json() or {}
            texto = ((datos.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
        if not texto.strip():
            raise RuntimeError(f"OpenRouter ({modelo_id}) respondió vacío")
        return texto.strip()

    # ─── recomendaciones pasivas / estado ────────────────────────────────
    async def get_routing_recommendation(
        self, prompt: str, preferencia_usuario: str = "economica"
    ) -> Dict[str, Any]:
        """API consultable ANTES de llamar a bitnet_engine. No ejecuta nada:
        solo clasifica y recomienda motor + motivo."""
        tc = classify_task(prompt)
        sel = self.select_model(tc, preferencia_usuario)
        return {"tarea": tc, "recomendacion": sel, "autorizacion_pago": self.autorizar_pago,
                "ts": time.time()}

    def get_status(self) -> Dict[str, Any]:
        return {
            "ok": True, "engine": "economic-router",
            "autorizacion_pago": self.autorizar_pago,
            "openrouter_configurado": bool(_openrouter_key()),
            "local_vivo": _modelo_disponible_localmente(CATALOGO_MODELOS[0]),
            "catalogo": CATALOGO_MODELOS, "estadisticas": dict(self._stats),
        }


# ══════════════════════════════════════════════════════════════════════════
# Síntesis determinista local (SIN LLM)
# ══════════════════════════════════════════════════════════════════════════
def _puntuar(texto: str, modelo: Dict[str, Any]) -> int:
    """Heurística de calidad: longitud útil + estructura + base del modelo."""
    try:
        palabras = len((texto or "").split())
        puntos = min(palabras // 20, 30)                      # sustancia
        puntos += 10 * sum(bool(re.search(p, texto or "")) for p in
                           (r"\n\n|\n\d+\.|\n- ", r"[.;:]"))
        puntos += int(modelo["calidad_estimada"]) // 10       # reputación base
        return max(0, min(puntos, 100))
    except Exception:
        return 25


def synthesize(respuestas: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Combina respuestas parciales de forma DETERMINISTA y local:
    · gana la de mayor puntuación heurística;
    · marca desacuerdos comparando solapamiento léxico entre las demás;
    · excluye fallos sin romper el conjunto (nunca lanza)."""
    try:
        validas = [r for r in (respuestas or []) if r and r.get("ok") and (r.get("texto") or "").strip()]
        if not validas:
            return {"texto": "", "modelo_ganador": None, "desacuerdos": [],
                    "consenso_ratio": 0.0, "nota": "sin respuestas válidas", "degradado": True}
        ganadora = max(validas, key=lambda r: r.get("puntos_calidad", 0))

        def _sh(texto: str) -> set:
            return {w.lower() for w in re.findall(r"[a-záéíóúñü]{4,}", (texto or "").lower())}

        sh_win = _sh(ganadora["texto"])
        desacuerdos: List[Dict[str, Any]] = []
        ratios = []
        for otra in validas:
            if otra is ganadora:
                continue
            sh_otra = _sh(otra["texto"])
            union = sh_win | sh_otra
            sim = len(sh_win & sh_otra) / len(union) if union else 0.0
            ratios.append(sim)
            if sim < 0.35:
                desacuerdos.append({
                    "modelo": otra["modelo"],
                    "solape_lexico": round(sim, 3),
                    "resumen_alternativo": " ".join(otra["texto"].split())[:280]})
        consenso = round(sum(ratios) / len(ratios), 3) if ratios else 1.0
        nota = ""
        if desacuerdos:
            nota = (f"{len(desacuerdos)} subagente(s) discrepan notablemente de la "
                    f"síntesis ganadora; revisa sus resúmenes antes de decidir.")
        return {"texto": ganadora["texto"], "modelo_ganador": ganadora["modelo"],
                "puntos_ganador": ganadora.get("puntos_calidad"),
                "desacuerdos": desacuerdos, "consenso_ratio": consenso,
                "nota": nota, "degradado": False}
    except Exception as e:
        return {"texto": "", "modelo_ganador": None, "desacuerdos": [],
                "consenso_ratio": 0.0, "nota": f"síntesis degradada: {e}", "degradado": True}


# Instancia singleton (la que importará main.py en su integración)
economic_router = EconomicRouter()
