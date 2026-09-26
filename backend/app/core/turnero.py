"""turnero.py — Admisión y cola para los turnos interactivos del BitNet compartido.

Contexto (Mac de Alex, 8 GB, Cloudflare tunnel a todo StarSeed): un solo
llama-server BitNet con `--parallel 1` (~16 tok/s prefill, ~10-14 tok/s
generación) sirve el chat de TODOS los dispositivos. Sin control de admisión,
una segunda petición mientras la primera aún genera competía por el mismo
hueco (o disparaba otro proceso) y la Mac se quedaba sin RAM. Este módulo es
la puerta de entrada ÚNICA de todo turno interactivo (chat o Jev):

    from ..core import turnero
    async with turnero.turno(tipo="chat"):
        ...  # aquí, y solo aquí, se ocupa el hueco del BitNet

  · Un hueco libre → admite al instante.
  · Sin hueco libre → encola FIFO (Jev adelanta a los chats: pesa 0,1 de un
    chat en la estimación y es casi instantáneo) si cabe en `max_cola` y la
    espera estimada no pasa de `max_espera_s`; si no, `Ocupado(motivo="cola")`.
  · RAM disponible por debajo del suelo → `Ocupado(motivo="memoria")` de
    inmediato, sin mirar cola ni huecos: en 8 GB la presión de RAM la puede
    causar cualquier otro proceso (voz, imaginación, enjambre), no solo el chat.
  · Un `asyncio.CancelledError` mientras se espera en cola (cliente
    desconectado) saca el puesto de la cola sin dejar rastro.

No toca `bitnet_engine`/`bitnet_cpp_manager`: la prioridad interactive/
background de `_interactive_busy` y `_chat_pide_el_motor` (cognition.py) siguen
funcionando exactamente igual una vez que un turno ya fue ADMITIDO aquí; este
módulo decide únicamente SI y CUÁNDO entra un turno, no CÓMO genera.
"""
from __future__ import annotations

import asyncio
import os
import time
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Dict, List, Optional

import psutil

# Peso de cada tipo de turno en la estimación de espera y en la cola: Jev es
# una decisión tipada (n_predict=1, ~decenas de ms), no una generación larga,
# así que pesa una fracción de un chat y no distorsiona la media móvil.
_PESO_POR_TIPO: Dict[str, float] = {"chat": 1.0, "jev": 0.1}

_MEDIA_INICIAL_S = 45.0
_ALPHA_MEDIA = 0.2  # media móvil exponencial: reacciona sin ser errática con una sola muestra rara


class Ocupado(Exception):
    """Turno denegado: el llamador la traduce a una respuesta ocupada (503 HTTP
    o `{"type":"error","ocupado":true,...}` por WebSocket)."""

    def __init__(self, motivo: str, espera_estimada_s: float, reintentar_en_s: float, en_cola: int) -> None:
        self.motivo = motivo
        self.espera_estimada_s = round(max(0.0, float(espera_estimada_s)), 1)
        self.reintentar_en_s = round(max(0.0, float(reintentar_en_s)), 1)
        self.en_cola = int(en_cola)
        super().__init__(f"ocupado ({motivo}): espera_estimada={self.espera_estimada_s}s, en_cola={self.en_cola}")


class _Espera:
    """Un puesto en la cola FIFO (con prioridad Jev).

    `evento` se marca cuando el turnero concede el hueco; `admitido` distingue
    «seguía en cola cuando se canceló» de «ya tenía el hueco reservado cuando
    se canceló» — el segundo caso debe DEVOLVER el hueco al siguiente en vez de
    dejarlo fantasma.
    """

    __slots__ = ("tipo", "evento", "admitido", "ts_encolado")

    def __init__(self, tipo: str) -> None:
        self.tipo = tipo
        self.evento = asyncio.Event()
        self.admitido = False
        self.ts_encolado = time.monotonic()


# ─────────────────────────── estado de proceso (un solo turnero) ───────────────────────────
_lock = asyncio.Lock()
_activos: Dict[str, int] = {"chat": 0, "jev": 0}
_cola: List[_Espera] = []
_media_s: float = _MEDIA_INICIAL_S
_rechazadas = 0
_servidas = 0


# ────────────────────────────────── configuración (env-first) ──────────────────────────────
def _env_int(nombre: str, por_defecto: int) -> int:
    val = (os.environ.get(nombre) or "").strip()
    if not val:
        return por_defecto
    try:
        return int(val)
    except ValueError:
        return por_defecto


def _env_float(nombre: str, por_defecto: float) -> float:
    val = (os.environ.get(nombre) or "").strip()
    if not val:
        return por_defecto
    try:
        return float(val)
    except ValueError:
        return por_defecto


def _servidor_compartido() -> bool:
    """¿Un único llama-server para chat y fondo? (Mac de 8 GB: sí). Sin poder
    saberlo (import roto, atributo ausente…) se asume que sí: el turnero
    conservador admite MENOS, nunca más de lo que la máquina aguanta."""
    try:
        from ..engine.bitnet_cpp_manager import bitnet_cpp_manager
        return bool(bitnet_cpp_manager._servidor_compartido())
    except Exception:
        return True


def max_activos() -> int:
    """Huecos simultáneos del BitNet para turnos interactivos. 1 en servidor
    compartido (Mac de 8 GB: un solo `--parallel 1`), 2 si hay servidores
    separados. Forzable con ASTRAURA_CHAT_MAX_ACTIVOS."""
    return max(1, _env_int("ASTRAURA_CHAT_MAX_ACTIVOS", 1 if _servidor_compartido() else 2))


def max_cola() -> int:
    """Puestos de espera FIFO antes de rechazar. Forzable con ASTRAURA_CHAT_MAX_COLA."""
    return max(0, _env_int("ASTRAURA_CHAT_MAX_COLA", 2 if _servidor_compartido() else 4))


def max_espera_s() -> float:
    """Techo de espera estimada para aceptar la cola: por encima, se rechaza en
    vez de prometer una espera que el usuario no va a tolerar. Forzable con
    ASTRAURA_CHAT_MAX_ESPERA_S."""
    return max(1.0, _env_float("ASTRAURA_CHAT_MAX_ESPERA_S", 90.0))


def ram_min_mb() -> float:
    """Suelo de RAM disponible por debajo del cual se rechaza de inmediato
    (memoria, no cola): en 8 GB la presión la puede causar cualquier otro
    proceso, no solo el chat. Forzable con ASTRAURA_RAM_MIN_MB."""
    return max(0.0, _env_float("ASTRAURA_RAM_MIN_MB", 250.0))


def ram_libre_mb() -> float:
    try:
        return psutil.virtual_memory().available / (1024 ** 2)
    except Exception:
        return float("inf")  # sin poder medir, no bloqueamos por RAM: mejor admitir que atascarse


# ────────────────────────────────── pesos, cola y estimación ────────────────────────────────
def _peso(tipo: str) -> float:
    return _PESO_POR_TIPO.get(tipo, 1.0)


def _activos_n() -> int:
    return sum(_activos.values())


def _activos_peso() -> float:
    return sum(_activos.get(t, 0) * _peso(t) for t in _PESO_POR_TIPO)


def _cola_peso() -> float:
    return sum(_peso(w.tipo) for w in _cola)


def _espera_estimada_s(peso_extra: float = 0.0) -> float:
    """Cuánto puede tardar en entrar un turno nuevo: la carga total pesada
    (activos + cola + este) repartida entre los huecos disponibles, a la
    duración media observada. `espera_estimada_s = (en_cola + activos) *
    media / max_activos` (con Jev pesando 0,1 en vez de 1)."""
    peso_total = _activos_peso() + _cola_peso() + peso_extra
    return peso_total * _media_s / max_activos()


def _insertar_en_cola(espera: _Espera) -> None:
    """FIFO por tipo, pero Jev adelanta a todos los chats ya esperando (nunca a
    otro Jev): sigue siendo un solo hueco en el motor, solo cambia el orden."""
    if espera.tipo == "jev":
        pos = 0
        while pos < len(_cola) and _cola[pos].tipo == "jev":
            pos += 1
        _cola.insert(pos, espera)
    else:
        _cola.append(espera)


def _despertar_siguiente() -> None:
    """Concede el hueco al primero de la cola si hay sitio. SIEMPRE se llama
    con `_lock` ya tomado (no vuelve a adquirirlo)."""
    if _cola and _activos_n() < max_activos():
        siguiente = _cola.pop(0)
        _activos[siguiente.tipo] = _activos.get(siguiente.tipo, 0) + 1
        siguiente.admitido = True
        siguiente.evento.set()


def _actualizar_media(duracion_s: float) -> None:
    """Solo los turnos «chat» alimentan la media: Jev dura decenas de ms (su
    peso de 0,1 ya refleja eso) y mezclarlo aquí arrastraría la media hacia
    abajo, dando estimaciones de espera falsamente optimistas para el chat."""
    global _media_s
    _media_s = (1 - _ALPHA_MEDIA) * _media_s + _ALPHA_MEDIA * max(0.1, duracion_s)


# ──────────────────────────────────────── API pública ───────────────────────────────────────
@asynccontextmanager
async def turno(tipo: str = "chat") -> AsyncIterator[None]:
    """Admite este turno en el hueco único del BitNet, o lanza `Ocupado`.

        async with turnero.turno(tipo="chat"):
            ...generar...

    Para un endpoint SSE que debe devolver el 503 ANTES de abrir el
    `StreamingResponse` (y mantener el turno abierto dentro del generador
    hasta que termine o el cliente se desconecte), no uses `async with`:
    gestiona `__aenter__`/`__aexit__` a mano sobre el mismo objeto, ver
    `main.chat_stream_endpoint` / `starseed_bridge.starseed_chat`.
    """
    global _rechazadas, _servidas
    tipo = tipo if tipo in _PESO_POR_TIPO else "chat"

    # (RAM) Se comprueba SIEMPRE primero, incluso con un hueco libre: en 8 GB
    # la presión la puede causar cualquier otro proceso de la Mac (voz,
    # imaginación, enjambre), no solo la concurrencia de chat.
    libre_mb = ram_libre_mb()
    if libre_mb < ram_min_mb():
        async with _lock:
            _rechazadas += 1
            en_cola_ahora = len(_cola)
        raise Ocupado("memoria", _espera_estimada_s(_peso(tipo)), 15.0, en_cola_ahora)

    espera: Optional[_Espera] = None
    async with _lock:
        if _activos_n() < max_activos():
            _activos[tipo] = _activos.get(tipo, 0) + 1
        else:
            estimado = _espera_estimada_s(_peso(tipo))
            if len(_cola) >= max_cola() or estimado > max_espera_s():
                _rechazadas += 1
                raise Ocupado("cola", estimado, estimado, len(_cola))
            espera = _Espera(tipo)
            _insertar_en_cola(espera)

    if espera is not None:
        try:
            await espera.evento.wait()
        except asyncio.CancelledError:
            # Cliente desconectado (o tarea cancelada) mientras esperaba turno:
            # el puesto se retira limpio, sin dejar el hueco fantasma.
            async with _lock:
                if espera in _cola:
                    _cola.remove(espera)
                elif espera.admitido:
                    # Ya se le había concedido el hueco justo cuando llegó la
                    # cancelación: se libera para el siguiente en vez de
                    # quedarse ocupado sin nadie generando.
                    _activos[espera.tipo] = max(0, _activos.get(espera.tipo, 0) - 1)
                    _despertar_siguiente()
            raise

    t0 = time.monotonic()
    try:
        yield
    finally:
        dt = time.monotonic() - t0
        async with _lock:
            _activos[tipo] = max(0, _activos.get(tipo, 0) - 1)
            _servidas += 1
            if tipo == "chat":
                _actualizar_media(dt)
            _despertar_siguiente()


def estado() -> Dict[str, Any]:
    """Foto barata del turnero (sin tocar BitNet): la sirve `GET /api/cola`."""
    libre_mb = ram_libre_mb()
    activos_n = _activos_n()
    en_cola = len(_cola)
    max_c = max_cola()
    admite = libre_mb >= ram_min_mb() and (activos_n < max_activos() or en_cola < max_c)
    return {
        "activos": activos_n,
        "en_cola": en_cola,
        "max_cola": max_c,
        "espera_estimada_s": round(_espera_estimada_s(), 1),
        "ram_libre_mb": round(libre_mb, 1) if libre_mb != float("inf") else None,
        "admite": bool(admite),
        "media_s": round(_media_s, 1),
        "rechazadas": _rechazadas,
        "servidas": _servidas,
    }


def cuerpo_ocupado(oc: Ocupado) -> Dict[str, Any]:
    """Cuerpo JSON exacto de una respuesta ocupada (mismo shape en HTTP y WS)."""
    return {
        "error": "ocupado",
        "ocupado": True,
        "motivo": oc.motivo,
        "en_cola": oc.en_cola,
        "espera_estimada_s": oc.espera_estimada_s,
        "reintentar_en_s": oc.reintentar_en_s,
    }


def retry_after_seconds(oc: Ocupado) -> int:
    """Cabecera `Retry-After`: entero entre 5 y 300 s."""
    valor = oc.reintentar_en_s if oc.reintentar_en_s > 0 else oc.espera_estimada_s
    return max(5, min(300, int(round(valor)) or 5))


def respuesta_ocupada(oc: Ocupado):
    """`JSONResponse` 503 lista para devolver desde cualquier endpoint de chat
    (import perezoso de fastapi: este módulo no lo necesita para nada más)."""
    from fastapi.responses import JSONResponse
    retry = retry_after_seconds(oc)
    return JSONResponse(
        status_code=503,
        content=cuerpo_ocupado(oc),
        headers={"Retry-After": str(retry), "X-Astraura-Cola": str(oc.en_cola)},
    )
