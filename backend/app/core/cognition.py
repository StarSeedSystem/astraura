"""
cognition.py — Puerta ÚNICA de cognición REAL para los procesos de fondo (OS · Ola 3).

Hasta ahora, los motores "creativos" de Astraura (imaginación intuitiva, sueños,
enjambre, Director Metis, cronista) componían todo su contenido con plantillas
f-string. La única inferencia real vive en `engine/bitnet_engine.py`
(`BitNetUnifiedEngine.generate_stream`, que usa Ollama, el binario BitNet nativo
o el "reasoner" de plantillas). Este módulo es la puerta compartida para que
cualquier proceso de fondo pida texto real sin repetir el protocolo:

  · `generate()` consulta `get_engine_status()["real_mode"]`: con "templates"
    devuelve `{"real": False}` al instante y el llamador CONSERVA su plantilla;
    con "ollama" / "bitnet-native" consume `generate_stream()` con timeout
    (`asyncio.wait_for`), une los tokens y devuelve `{"text", "real", "mode", "ms"}`.
  · Un semáforo por bucle de eventos limita a MAX_CONCURRENT (2) generaciones
    simultáneas de fondo para que nunca dejen sin silicio al chat.
  · `generate_sync()` sirve desde código síncrono: `asyncio.run` si no hay bucle,
    `run_coroutine_threadsafe` sobre el bucle principal si se llama desde un hilo
    mientras el servidor corre, y — si se invoca desde el PROPIO hilo del bucle —
    devuelve la plantilla en vez de congelar el servidor.
  · `extract_json()` parsea de forma defensiva las respuestas JSON de modelos
    pequeños (vallas ```json, texto alrededor, llaves desbalanceadas).

Todo registro producido con este módulo debe etiquetarse con
`"generated_by": "llm"` o `"template"` para que la UI y el OS sepan qué es real.
"""
from __future__ import annotations

import asyncio
import os
import json
import re
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

# (OS · Ola 3) Máximo de generaciones de fondo simultáneas por bucle de eventos.
MAX_CONCURRENT = 2
DEFAULT_TIMEOUT = 90.0
STATUS_TTL_SECONDS = 5.0

_semaphores: Dict[int, Tuple[asyncio.AbstractEventLoop, asyncio.Semaphore]] = {}
_semaphores_lock = threading.Lock()
_main_loop: Optional[asyncio.AbstractEventLoop] = None
_status_cache: Dict[str, Any] = {"at": 0.0, "mode": "templates"}
_stats: Dict[str, Any] = {"calls": 0, "real": 0, "template": 0, "errors": 0, "last_ms": 0, "last_mode": "templates"}


def _templates_result(mode: str = "templates", error: Optional[str] = None, ms: int = 0) -> Dict[str, Any]:
    out: Dict[str, Any] = {"text": "", "real": False, "mode": mode, "ms": ms}
    if error:
        out["error"] = error
    return out


def engine_mode(ttl: float = STATUS_TTL_SECONDS) -> str:
    """Modo real del motor ("bitnet-native" | "ollama" | "templates"), cacheado unos segundos."""
    now = time.time()
    if now - float(_status_cache.get("at", 0.0)) < ttl:
        return str(_status_cache.get("mode") or "templates")
    mode = "templates"
    try:
        from ..engine.bitnet_engine import bitnet_engine
        mode = str((bitnet_engine.get_engine_status() or {}).get("real_mode") or "templates")
    except Exception:
        mode = "templates"
    _status_cache["at"] = now
    _status_cache["mode"] = mode
    return mode


def real_available() -> bool:
    """True si hay un modelo real (Ollama o BitNet nativo) detrás de `generate_stream`."""
    return engine_mode() != "templates"


def register_loop(loop: Optional[asyncio.AbstractEventLoop] = None) -> None:
    """Registra el bucle principal (lo llama el lifespan) para `generate_sync` desde hilos."""
    global _main_loop
    try:
        _main_loop = loop or asyncio.get_running_loop()
    except RuntimeError:
        _main_loop = loop


def _get_semaphore() -> asyncio.Semaphore:
    """Semáforo ligado al bucle en marcha (un asyncio.Semaphore no puede compartirse entre bucles)."""
    loop = asyncio.get_running_loop()
    key = id(loop)
    with _semaphores_lock:
        entry = _semaphores.get(key)
        if entry is None or entry[0] is not loop:
            # Poda de bucles ya cerrados (scripts, hilos efímeros con asyncio.run).
            for k in [k for k, (l, _s) in _semaphores.items() if l.is_closed()]:
                _semaphores.pop(k, None)
            entry = (loop, asyncio.Semaphore(MAX_CONCURRENT))
            _semaphores[key] = entry
    return entry[1]


def _clean_text(text: str) -> str:
    t = (text or "").replace("\r", "")
    # Tokens de parada residuales de modelos chat.
    for stop in ("<|im_end|>", "<|endoftext|>", "<|eot_id|>"):
        t = t.replace(stop, "")
    # El motor inserta este pie cuando detecta un bucle de repetición: no es contenido.
    t = re.sub(r"\n*### ⚡ \[Síntesis Coral 1\.58b\]:.*$", "", t, flags=re.S)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


async def _consume(prompt: str, system: str, context_chunks: Optional[List[str]], tool_data: Optional[Dict[str, Any]],
                   max_tokens: int, temperature: float, meta: Dict[str, Any]) -> str:
    from ..engine.bitnet_engine import bitnet_engine
    parts: List[str] = []
    kwargs: Dict[str, Any] = dict(
        prompt=prompt,
        system_prompt=system or "",
        context_chunks=list(context_chunks or []),
        tool_data=tool_data or {},
        max_tokens=max_tokens,
        temperature=temperature,
    )
    # `meta` es opcional en el motor (lo rellena con la fuente real del texto); si la
    # versión del motor en uso no lo acepta, se reintenta sin él.
    try:
        stream = bitnet_engine.generate_stream(priority="background", **kwargs, meta=meta)
        async for token in stream:
            parts.append(token)
    except TypeError as e:
        if "meta" not in str(e) or parts:
            raise
        stream = bitnet_engine.generate_stream(priority="background", **kwargs)
        async for token in stream:
            parts.append(token)
    return "".join(parts)


async def generate(
    prompt: str,
    system: str = "",
    max_tokens: int = 512,
    temperature: float = 0.7,
    timeout: float = DEFAULT_TIMEOUT,
    context_chunks: Optional[List[str]] = None,
    tool_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Genera texto REAL con el motor unificado. Devuelve
    `{"text": str, "real": bool, "mode": str, "ms": int}` (+ "error" si falló).
    Con `real_mode == "templates"` devuelve `real=False` al instante: el llamador
    conserva su plantilla. Nunca lanza excepciones.
    """
    _stats["calls"] += 1
    mode = engine_mode()
    _stats["last_mode"] = mode
    # (Verificación 1.58, bajo carga) La media móvil `measured_tps` mezcla la
    # VELOCIDAD DE DECODIFICACIÓN con la ESPERA EN COLA del llama-server (un solo
    # slot compartido con el chat): en vivo medí 0.8 tok/s "fantasma" que inflaba
    # cada presupuesto hasta el tope de 480 s y multiplicaba la contención (46% de
    # llamadas agotadas). Si pasan >90 s sin ningún éxito que refresque la media,
    # se desvanece hacia la referencia sana (~4.3 tok/s medidos en este M1): un
    # atasco TRANSITORIO deja de condicionar los presupuestos de los minutos
    # siguientes; en cuanto hay un éxito real, la media vuelve a ser verdad.
    try:
        _now_s = time.time()
        if _now_s - float(_stats.get("last_real_at") or _now_s) > 90.0:
            _prev_tps = float(_stats.get("measured_tps") or 0.0)
            if 0 < _prev_tps < 3.5:
                _stats["measured_tps"] = round(_prev_tps + (4.3 - _prev_tps) * 0.25, 2)
    except Exception:
        pass
    if mode == "templates":
        _stats["template"] += 1
        return _templates_result("templates")

    global _main_loop
    if _main_loop is None:
        try:
            _main_loop = asyncio.get_running_loop()
        except RuntimeError:
            pass

    t0 = time.perf_counter()
    meta: Dict[str, Any] = {}
    if mode == "bitnet-native":
        # (Verificación 1.58) Suelo PROPORCIONAL a `max_tokens`, no una cifra fija
        # para cualquier petición. Medido de punta a punta en el M1 de Alex con el
        # GGUF i2_s real: 4.3 tok/s. Antes el suelo era 150 s SIEMPRE — de sobra
        # para 400 tokens (~93 s de generación), pero un despilfarro para la
        # llamada de verificación de agent_genesis_engine (16 tokens, ~4 s reales):
        # esperaba hasta 150 s para poder reportar un fallo real, 30-40x más de lo
        # que hacía falta. `_tps_floor` es conservador (por debajo de lo medido)
        # para no recortar una respuesta legítima que vaya lenta por carga de la
        # máquina; en cuanto hay una media móvil real (`measured_tps`) se usa esa,
        # con el mismo colchón.
        _tps_floor = 3.5
        # (Verificación 1.58) BUG cerrado en bucle, encontrado EN VIVO hoy: un
        # timeout NUNCA actualiza `measured_tps` (solo lo hace un éxito, más
        # abajo) — así que si el primer intento en un proceso nuevo agota el
        # timeout por ir el motor más lento que `_tps_floor`, ese proceso queda
        # atrapado para SIEMPRE con la misma estimación optimista: cada intento
        # siguiente vuelve a fallar igual de corto, y `measured_tps` nunca llega
        # a fijarse porque fijarlo exige justo lo que el timeout le impide
        # (terminar). MEDIDO hoy: con 3-4 subagentes compitiendo por los mismos
        # núcleos, el motor nativo bajó a 0.13-0.6 tok/s — muy por debajo del
        # suelo de 3.5 (sano en condiciones normales, ~4.3 tok/s de referencia).
        # Backoff: cada timeout consecutivo de bitnet-native sin medición real
        # DUPLICA el presupuesto del siguiente intento, hasta que uno complete
        # (fija `measured_tps` de verdad) o el techo de 480s lo pare igual.
        _timeout_streak = int(_stats.get("bitnet_timeout_streak") or 0)
        if _timeout_streak > 0:
            _tps_floor = max(0.2, _tps_floor / (2.0 ** _timeout_streak))
        _measured = float(_stats.get("measured_tps") or 0.0)
        _tps = _measured if 0 < _measured < 14.0 else _tps_floor
        # +20 s fijos (conexión + prefill del prompt) y x1.8 sobre la generación
        # esperada: colchón para la cola de 1 slot cuando el chat interactivo
        # también le pide turno al mismo core.
        proportional = 20.0 + (float(max_tokens) / _tps) * 1.8
        timeout = max(timeout, proportional, float(os.environ.get("ASTRAURA_COGNITION_MIN_TIMEOUT") or 0.0))
        # Gracia de arranque en frío: si el servidor de FONDO aún no está listo, la
        # primera carga del GGUF (mmap ~1.1 GB) se suma al presupuesto — el primer
        # turno tras un arranque no debe caer a plantilla solo porque el modelo
        # seguía cargando. Con el motor ya vivo (el caso normal, backend arrancado)
        # esta gracia no se aplica: no hay nada que esperar.
        try:
            from ..engine.bitnet_cpp_manager import bitnet_cpp_manager as _mgr
            if not _mgr.server_ready("background"):
                timeout += 180.0
        except Exception:
            pass
        timeout = min(timeout, 480.0)
    else:
        # Salvaguarda general (Ollama u otro motor real): si la última generación
        # medida fue lenta (<14 tok/s) bajo carga compartida de la máquina, se
        # estira el techo en proporción a `max_tokens` en vez de cortar una
        # respuesta legítima a medias. Mismos números que ya estaban probados aquí.
        _measured = float(_stats.get("measured_tps") or 0.0)
        if 0 < _measured < 14.0:
            timeout = min(max(timeout, 45.0 + (float(max_tokens) / _measured) * 1.7), 480.0)
    try:
        sem = _get_semaphore()
        # (Verificación 1.58, bajo carga) La COLA también tiene presupuesto: antes
        # `wait_for` solo cubría el consumo DESPUÉS de adquirir el semáforo, así
        # que una ráfaga de peticiones se apilaba SIN LÍMITE esperando turno y
        # cada una retenía su hueco minutos cuando el motor iba lento. Ahora cada
        # llamada renuncia a la cola a los 120 s: la más vieja conserva el turno,
        # las demás devuelven plantilla al instante en vez de apilarse detrás.
        try:
            await asyncio.wait_for(sem.acquire(), timeout=120.0)
        except asyncio.TimeoutError:
            ms = int((time.perf_counter() - t0) * 1000)
            _stats["errors"] += 1
            _stats["last_ms"] = ms
            return _templates_result(mode, "cola saturada (>120s esperando turno)", ms)
        try:
            raw = await asyncio.wait_for(
                _consume(prompt, system, context_chunks, tool_data, max_tokens, temperature, meta),
                timeout=timeout,
            )
        finally:
            sem.release()
    except asyncio.TimeoutError:
        ms = int((time.perf_counter() - t0) * 1000)
        _stats["errors"] += 1
        _stats["last_ms"] = ms
        if mode == "bitnet-native":
            # (Verificación 1.58) alimenta el backoff de arriba: sin esto, un
            # proceso que falla una vez por timeout falla siempre por el mismo
            # motivo (ver comentario junto a `_tps_floor`).
            _stats["bitnet_timeout_streak"] = int(_stats.get("bitnet_timeout_streak") or 0) + 1
        return _templates_result(mode, "timeout", ms)
    except Exception as e:  # pragma: no cover - defensivo
        ms = int((time.perf_counter() - t0) * 1000)
        _stats["errors"] += 1
        _stats["last_ms"] = ms
        return _templates_result(mode, str(e)[:200], ms)

    ms = int((time.perf_counter() - t0) * 1000)
    _stats["last_ms"] = ms
    text = _clean_text(raw)
    # Si el motor cayó al "reasoner" de plantillas a mitad de camino (Ollama caído),
    # el texto NO es real: el llamador conserva su propia plantilla.
    if meta.get("source") == "reasoner" or not text:
        _stats["template"] += 1
        return _templates_result(mode, "engine-fallback" if text else "empty", ms)
    _stats["real"] += 1
    if meta.get("source") == "bitnet-native":
        # Un intento nativo completo de verdad rompe la racha de timeouts: ya
        # hay una medición real, así que el backoff deja de hacer falta.
        _stats["bitnet_timeout_streak"] = 0
    # Velocidad MEDIDA (media móvil, ~3.2 chars/token): alimenta los timeouts
    # adaptativos de las próximas llamadas en hardware lento.
    try:
        _tps = (max(1.0, len(text) / 3.2)) / max(0.001, ms / 1000.0)
        prev = float(_stats.get("measured_tps") or 0.0)
        _stats["measured_tps"] = round(_tps if not prev else (prev * 0.7 + _tps * 0.3), 2)
        # (Verificación 1.58, bajo carga) Sello temporal del último éxito REAL:
        # es lo que permite al decaimiento de arriba distinguir "media vieja por
        # un atasco transitorio" de "media fresca de verdad".
        _stats["last_real_at"] = time.time()
    except Exception:
        pass
    return {"text": text, "real": True, "mode": meta.get("source") or mode, "ms": ms}


def _loop_running_in_this_thread() -> bool:
    """Equivale a `asyncio.get_event_loop().is_running()` sin el DeprecationWarning ni
    el RuntimeError que `get_event_loop()` lanza en hilos secundarios (Py 3.11+)."""
    try:
        asyncio.get_running_loop()
        return True
    except RuntimeError:
        return False


def generate_sync(
    prompt: str,
    system: str = "",
    max_tokens: int = 512,
    temperature: float = 0.7,
    timeout: float = DEFAULT_TIMEOUT,
    context_chunks: Optional[List[str]] = None,
    tool_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Versión para código SÍNCRONO (hilos de fondo, scripts, CLI):
      · sin bucle en marcha → `asyncio.run(...)`;
      · desde un hilo mientras el servidor corre → `run_coroutine_threadsafe`
        sobre el bucle principal registrado;
      · desde el PROPIO hilo del bucle (p. ej. una función sync llamada dentro de
        un `async def`) → devuelve la plantilla: bloquear aquí congelaría el chat.
    """
    if not real_available():
        _stats["calls"] += 1
        _stats["template"] += 1
        return _templates_result("templates")

    if _loop_running_in_this_thread():
        return _templates_result(engine_mode(), "called-from-loop-thread")

    coro = generate(prompt, system, max_tokens, temperature, timeout, context_chunks, tool_data)
    loop = _main_loop
    if loop is not None and loop.is_running() and not loop.is_closed():
        fut = asyncio.run_coroutine_threadsafe(coro, loop)
        try:
            return fut.result(timeout=timeout + 5.0)
        except Exception as e:
            fut.cancel()
            return _templates_result(engine_mode(), f"threadsafe:{str(e)[:120]}")
    try:
        return asyncio.run(coro)
    except Exception as e:
        return _templates_result(engine_mode(), f"run:{str(e)[:120]}")


_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.S)


def extract_json(text: str) -> Optional[Dict[str, Any]]:
    """Extrae el PRIMER objeto JSON de una respuesta de modelo (defensivo)."""
    if not text:
        return None
    candidates: List[str] = []
    m = _JSON_FENCE_RE.search(text)
    if m:
        candidates.append(m.group(1))
    start = text.find("{")
    if start != -1:
        # Recorte por balance de llaves (ignora llaves dentro de cadenas).
        depth = 0
        in_str = False
        esc = False
        for i in range(start, len(text)):
            ch = text[i]
            if in_str:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == '"':
                    in_str = False
                continue
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    candidates.append(text[start:i + 1])
                    break
        else:
            # Llaves sin cerrar: intento de cierre.
            candidates.append(text[start:] + "}" * max(0, depth))
    for cand in candidates:
        for attempt in (cand, re.sub(r",\s*([}\]])", r"\1", cand)):
            try:
                data = json.loads(attempt)
                if isinstance(data, dict):
                    return data
            except Exception:
                continue
    return None


def field(data: Optional[Dict[str, Any]], key: str, max_len: int = 600, min_len: int = 4) -> Optional[str]:
    """Campo string saneado de un JSON de modelo (o None si no sirve)."""
    if not data:
        return None
    v = data.get(key)
    if isinstance(v, (list, tuple)):
        v = " ".join(str(x) for x in v)
    if not isinstance(v, str):
        return None
    v = " ".join(v.split()).strip()
    if len(v) < min_len:
        return None
    return v[:max_len]


def stats() -> Dict[str, Any]:
    """Contadores honestos para /api/starseed/processes."""
    return {**_stats, "mode": engine_mode(), "max_concurrent": MAX_CONCURRENT}
