# (Ola 262 · 2026-09-06) Pruebas del turno de memoria del BitNet: dormir a
# petición del demonio de voz, despertar y foto de estado.
#
# Contexto (Mac de Alex, 8 GB): el demonio de voz (oído VibeASR 1,7 GB +
# tts-server 0,9 GB) debe poder pedir al llama-server BitNet (~1,2 GB) que
# duerma cuando falta RAM. Estas pruebas ejercitan `dormir_a_peticion`,
# `despertar` y `estado_turno` SIN procesos ni red: igual que
# test_bitnet_manager_compartido.py, se parchean `stop_server`/`ensure_server`/
# `_alive` y se usa un `proc` falso.

import sys
import urllib.request
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.engine.bitnet_cpp_manager import BitNetCppManager

import time as _time


import pytest


@pytest.fixture(autouse=True)
def _sin_conversacion_real(monkeypatch: Any, tmp_path: Path) -> None:
    """Las pruebas no leen la concesión REAL de la Mac (~/.starseed/conversacion.json):
    si Alex está hablando con Astraura mientras corren, el resultado no puede cambiar."""
    monkeypatch.setenv("STARSEED_CONVERSACION", str(tmp_path / "sin-conversacion.json"))


class _ProcFalso:
    """Subproceso falso: `poll()` devuelve None (sigue vivo) y `pid` 0 para
    que `_rss_mb` caiga a la estimación (no puede leerse con `ps`)."""

    pid = 0

    def poll(self) -> Any:
        return None


def test_no_duerme_con_uso_reciente(monkeypatch: Any) -> None:
    """Uso INTERACTIVO hace menos de `min_inactivo_s` → NO duerme: una petición
    del usuario a mitad de vuelo no se sacrifica por el turno de la voz.
    (Ola 262 · 2026-09-07) El reloj decisivo es `_ultimo_uso_interactivo`, no
    el general: el fondo refresca el general cada pocos segundos."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    mgr._servers = {"interactive": {"proc": _ProcFalso()}}
    mgr._ultimo_uso_interactivo = _time.time()  # el usuario acaba de hablar
    res = mgr.dormir_a_peticion(min_inactivo_s=30.0)
    assert res["dormido"] is False
    assert str(res["motivo"]).startswith("en uso hace")
    assert mgr._dormido is False


def test_duerme_aunque_el_fondo_este_activo(monkeypatch: Any) -> None:
    """(Ola 262 · 2026-09-07) El ERROR real de la Mac de Alex: uso background
    RECIENTE (cognition cada pocos segundos) + uso interactivo ANTIGUO → DEBE
    dormir igualmente: el turno respeta al usuario, no a los procesos de fondo.
    Antes miraba `_ultimo_uso` y respondía «en uso hace 4 s» en bucle."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    llamadas: list = []
    monkeypatch.setattr(mgr, "stop_server", lambda: llamadas.append("stop"))
    mgr._servers = {"interactive": {"proc": _ProcFalso()}}
    mgr._ultimo_uso = _time.time()  # el fondo acaba de pedir algo
    mgr._ultimo_uso_interactivo = _time.time() - 3600  # la usuaria lleva 1 h sin hablar
    res = mgr.dormir_a_peticion(min_inactivo_s=30.0)
    assert res["dormido"] is True
    assert "cedido_s" in res and res["cedido_s"] == 600  # ventana por defecto
    assert llamadas == ["stop"]
    assert mgr._dormido is True
    assert mgr._cedido_hasta > _time.time()  # ventana «cedido» abierta


def test_nunca_hubo_uso_interactivo_cuenta_como_antiguo(monkeypatch: Any) -> None:
    """Sin uso interactivo registrado jamás (None) → se trata como antiguo y
    se duerme: silenciar la charla del fondo no protege al usuario."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    monkeypatch.setattr(mgr, "stop_server", lambda: None)
    mgr._servers = {"interactive": {"proc": _ProcFalso()}}
    mgr.marcar_uso("background")  # solo ha hablado el fondo
    assert mgr._ultimo_uso_interactivo is None
    res = mgr.dormir_a_peticion(min_inactivo_s=30.0)
    assert res["dormido"] is True


def test_no_duerme_con_sueno_desactivado(monkeypatch: Any) -> None:
    """Con `sueno_min` = 0 el sueño está apagado del todo: ni el auto-sueño ni
    el turno a petición duermen el motor."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "0")
    mgr = BitNetCppManager()
    mgr._servers = {"interactive": {"proc": _ProcFalso()}}
    mgr._ultimo_uso = _time.time() - 3600  # viejísimo, da igual
    res = mgr.dormir_a_peticion()
    assert res == {"dormido": False, "motivo": "sueño desactivado"}
    assert mgr._dormido is False


def test_duerme_con_proc_vivo_e_inactividad(monkeypatch: Any) -> None:
    """Server propio vivo + uso antiguo → llama a `stop_server` (parcheado),
    marca `_dormido` y devuelve los MB estimados."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    llamadas: list = []
    monkeypatch.setattr(mgr, "stop_server", lambda: llamadas.append("stop"))
    mgr._servers = {"interactive": {"proc": _ProcFalso()}}
    mgr._ultimo_uso = _time.time() - 3600  # hace una hora
    res = mgr.dormir_a_peticion(min_inactivo_s=30.0)
    assert res["dormido"] is True
    assert "mb_estimados" in res
    assert llamadas == ["stop"]
    assert mgr._dormido is True


def test_ya_estaba_sin_server_propio(monkeypatch: Any) -> None:
    """Sin server PROPIO vivo (adoptado o ya apagado) confirma sin tocar nada:
    `stop_server` no se llama. (Ola 262 · 2026-09-07) Aun así se abre la ventana
    «cedido»: nada que apagar ahora, pero el fondo tampoco debe RELANZAR el
    motor durante el turno de la voz."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    llamadas: list = []
    monkeypatch.setattr(mgr, "stop_server", lambda: llamadas.append("stop"))
    # (2026-09-24) Sin este parche la prueba MATABA el llama-server real de la
    # Mac: `_apagar_adoptado(8790)` encontraba el de producción escuchando y le
    # mandaba SIGTERM/SIGKILL en cada ejecución de pytest.
    monkeypatch.setattr(mgr, "_apagar_adoptado", lambda puerto: None)
    monkeypatch.setattr(mgr, "_conversacion_en_vivo", lambda: False)
    mgr._servers = {}
    mgr._ultimo_uso = _time.time() - 3600
    mgr._dormido = True
    res = mgr.dormir_a_peticion()
    assert res["dormido"] is True
    assert res["ya_estaba"] is True
    assert res["cedido_s"] == 600
    assert mgr._cedido_hasta > _time.time()
    assert llamadas == []


def test_despertar_limpia_dormido(monkeypatch: Any) -> None:
    """`despertar` marca uso (limpia `_dormido`) y lanza `ensure_server` sin
    bloquear; aquí se parchea `ensure_server` para no tocar procesos."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    llamadas: list = []
    monkeypatch.setattr(
        mgr,
        "ensure_server",
        lambda wait, profile: (llamadas.append((wait, profile)) or "http://127.0.0.1:8790"),
    )
    mgr._dormido = True
    mgr._ultimo_uso = _time.time() - 3600
    res = mgr.despertar()
    assert res == {"despertando": True, "base": "http://127.0.0.1:8790"}
    assert mgr._dormido is False
    assert llamadas == [(0.0, "interactive")]


def test_estado_turno_devuelve_las_claves(monkeypatch: Any) -> None:
    """`estado_turno` expone dormido/sueno_min/ultimo_uso/vivo/puerto sin
    red: `_alive` se parchea para no sondear el puerto. (Ola 262 · 2026-09-07)
    Además expone `cedido_hasta_s` y `ultimo_uso_interactivo_hace_s`."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "7")
    mgr = BitNetCppManager()
    monkeypatch.setattr(mgr, "_alive", lambda *a, **k: True)
    mgr._dormido = False
    estado = mgr.estado_turno()
    for clave in ("dormido", "sueno_min", "ultimo_uso_hace_s", "vivo", "puerto",
                  "cedido_hasta_s", "ultimo_uso_interactivo_hace_s"):
        assert clave in estado
    assert estado["vivo"] is True
    assert estado["sueno_min"] == 7
    assert estado["puerto"] == mgr.server_port
    assert estado["dormido"] is False
    assert estado["ultimo_uso_hace_s"] >= 0
    assert estado["cedido_hasta_s"] == 0  # sin ventana abierta
    assert estado["ultimo_uso_interactivo_hace_s"] is None  # nadie ha hablado aún

    # Ventana abierta + uso interactivo: ambos campos la reflejan.
    mgr._cedido_hasta = _time.time() + 300
    mgr._ultimo_uso_interactivo = _time.time() - 60
    estado2 = mgr.estado_turno()
    assert 290 <= estado2["cedido_hasta_s"] <= 300
    assert 55 <= estado2["ultimo_uso_interactivo_hace_s"] <= 65


def test_ventana_cedida_el_fondo_espera(monkeypatch: Any) -> None:
    """(Ola 262 · 2026-09-07) Con la ventana «cedido» abierta, una petición de
    BACKGROUND (imaginación, sueños, enjambre…) devuelve None SIN lanzar nada
    ni marcar uso: si marcara uso, refrescaría el reloj y reabriría la pelea
    por la RAM con la voz. Se parchea `probe_port` para que falle si se
    llegara a sondear (prueba de que no se llega a lanzar)."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    def _no_sondear(*a: Any, **k: Any) -> None:
        raise AssertionError("ensure_server(background) no debe sondear ni lanzar durante «cedido»")
    monkeypatch.setattr(mgr, "probe_port", _no_sondear)
    mgr._cedido_hasta = _time.time() + 600
    antes = _time.time() - 100
    mgr._ultimo_uso = antes
    res = mgr.ensure_server(5.0, "background")
    assert res is None
    assert mgr._ultimo_uso == antes  # el fondo no ha refrescado el reloj
    assert mgr._cedido_hasta > _time.time()  # la ventana sigue abierta


def test_ventana_cedida_el_chat_la_cierra(monkeypatch: Any) -> None:
    """Con la ventana «cedido» abierta, el chat INTERACTIVO la cierra y
    despierta como siempre: el usuario manda sobre la voz. `probe_port`
    parcheado a «listo» devuelve la base sin lanzar procesos."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    monkeypatch.setattr(
        mgr,
        "probe_port",
        lambda *a, **k: {"state": "listo", "base": "http://127.0.0.1:8790", "http": 200},
    )
    mgr._cedido_hasta = _time.time() + 600
    mgr._dormido = True
    base = mgr.ensure_server(0.0, "interactive")
    assert base == "http://127.0.0.1:8790"
    assert mgr._cedido_hasta == 0.0  # ventana cerrada
    assert mgr._dormido is False  # marcar_uso(interactive) lo despertó
    assert mgr._ultimo_uso_interactivo is not None  # el chat sí refresca ese reloj


def test_despertar_cierra_la_ventana_cedida(monkeypatch: Any) -> None:
    """`despertar()` explícito también cierra la ventana «cedido»: la voz/UI
    pide el motor de vuelta y eso manda sobre el turno cedido."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    monkeypatch.setattr(
        mgr, "ensure_server", lambda wait, profile: "http://127.0.0.1:8790"
    )
    mgr._cedido_hasta = _time.time() + 600
    res = mgr.despertar()
    assert res == {"despertando": True, "base": "http://127.0.0.1:8790"}
    assert mgr._cedido_hasta == 0.0


def test_cedido_s_tiene_tope(monkeypatch: Any) -> None:
    """El parámetro `cedido_s` nunca pasa de 1800 s: una petición descabellada
    no puede dejar al fondo mudo para siempre."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    monkeypatch.setattr(mgr, "stop_server", lambda: None)
    mgr._servers = {"interactive": {"proc": _ProcFalso()}}
    res = mgr.dormir_a_peticion(cedido_s=99999)
    assert res["cedido_s"] == 1800
    assert mgr._cedido_hasta <= _time.time() + 1801


# ---------------------------------------------------------------------------
# (2026-09-07 · Ola 270 · AP6) El fondo respeta el turno de memoria de verdad:
# con el BitNet dormido/cedido, los procesos de fondo NO caen a Ollama (medido:
# cargaba qwen2.5 1,1 GB y anulaba el alivio). Sin red ni procesos: se
# parchean ensure_server/estado_turno/check_status y el listado de Ollama.
# ---------------------------------------------------------------------------

import asyncio

from app.engine.bitnet_engine import BitNetUnifiedEngine
from app.engine import bitnet_engine as _motor_mod

_CEDIDO = {"dormido": False, "cedido_hasta_s": 300, "vivo": True}
_SIN_TURNO = {"dormido": False, "cedido_hasta_s": 0, "vivo": True}
_CON_GGUF = {"models_available": [{"path": "/tmp/bitnet-i2_s.gguf"}]}


def _drenar(engine: Any, priority: str, meta: dict) -> list:
    async def _run() -> list:
        out: list = []
        async for tok in engine.generate_stream("hola", meta=meta, priority=priority):
            out.append(tok)
        return out
    return asyncio.run(_run())


def _parchear_ollama(monkeypatch: Any, engine: Any) -> list:
    """Espía de `get_available_ollama_models`: si se llama, el motor intentó
    caer a Ollama. Devuelve [] para no lanzar HTTP de verdad."""
    llamadas: list = []

    async def _falso() -> list:
        llamadas.append(1)
        return []

    monkeypatch.setattr(engine, "get_available_ollama_models", _falso)
    return llamadas


def test_fondo_con_ventana_cedida_no_cae_a_ollama(monkeypatch: Any) -> None:
    """Con la ventana «cedido» abierta y perfil background, el generador se
    omite con motivo: Ollama NO se llama, ensure_server tampoco (nada despierta
    al BitNet) y `meta` dice la verdad."""
    engine = BitNetUnifiedEngine()
    mgr = _motor_mod.bitnet_cpp_manager

    def _prohibido(*a: Any, **k: Any) -> None:
        raise AssertionError("el fondo no debe despertar al BitNet durante el turno de memoria")

    monkeypatch.setattr(mgr, "ensure_server", _prohibido)
    monkeypatch.setattr(mgr, "estado_turno", lambda: dict(_CEDIDO))
    ollama = _parchear_ollama(monkeypatch, engine)

    meta: dict = {}
    tokens = _drenar(engine, "background", meta)
    assert ollama == []  # Ollama jamás se llamó
    assert meta.get("omitido") == "turno de memoria"
    assert meta.get("source") == "ninguno"
    assert tokens == []  # termina sin yield: cognition marcará real=False


def test_fondo_con_respaldo_explicito_si_usa_ollama(monkeypatch: Any) -> None:
    """Con ASTRAURA_OLLAMA_RESPALDO=1 y BitNet caído DE VERDAD (sin turno de
    memoria: ventana a 0 y ensure_server que lanza), el fondo SÍ puede caer a
    Ollama. Sin la variable, no."""
    monkeypatch.setenv("ASTRAURA_OLLAMA_RESPALDO", "1")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_SHARED_KEY", raising=False)
    engine = BitNetUnifiedEngine()
    mgr = _motor_mod.bitnet_cpp_manager

    def _cae(*a: Any, **k: Any) -> None:
        raise RuntimeError("binario roto")  # caído de verdad, no cedido

    monkeypatch.setattr(mgr, "ensure_server", _cae)
    monkeypatch.setattr(mgr, "estado_turno", lambda: dict(_SIN_TURNO))
    monkeypatch.setattr(mgr, "check_status", lambda: dict(_CON_GGUF))
    ollama = _parchear_ollama(monkeypatch, engine)

    meta: dict = {}
    _drenar(engine, "background", meta)
    assert ollama == [1]  # el respaldo explícito sí entró
    assert "omitido" not in meta

    # Y sin la variable, el fondo NO cae a Ollama aunque el nativo esté caído.
    monkeypatch.delenv("ASTRAURA_OLLAMA_RESPALDO")
    ollama.clear()
    meta2: dict = {}
    _drenar(engine, "background", meta2)
    assert ollama == []


def test_interactivo_con_ventana_cedida_intenta_el_nativo(monkeypatch: Any) -> None:
    """Con la ventana cedida, el CHAT cierra la ventana e intenta el nativo
    (ensure_server se llama, y el manager real cerraría «cedido»); nunca se
    omite por turno de memoria: el usuario manda sobre la voz."""
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_SHARED_KEY", raising=False)
    engine = BitNetUnifiedEngine()
    mgr = _motor_mod.bitnet_cpp_manager
    nativos: list = []

    monkeypatch.setattr(mgr, "ensure_server", lambda *a, **k: (nativos.append(1) or None)[1])
    monkeypatch.setattr(mgr, "estado_turno", lambda: dict(_CEDIDO))
    monkeypatch.setattr(mgr, "check_status", lambda: dict(_CON_GGUF))
    _parchear_ollama(monkeypatch, engine)  # devuelve []: sin red

    meta: dict = {}
    _drenar(engine, "interactive", meta)
    assert nativos == [1]  # el nativo fue el primer intento, ventana abierta o no
    assert "omitido" not in meta


# ---------------------------------------------------------------------------
# (2026-09-07 · Ola 270 · AP7A) Supervisor del BitNet: un llama-server ADOPTADO
# (proc None pero /health responde) cuenta como vivo y NO se relanza cada 5 s;
# y el relanzamiento del supervisor (marcar=False) no cuenta como uso
# interactivo, no cierra la ventana «cedido» ni limpia `_dormido`.
# ---------------------------------------------------------------------------


def test_supervisor_no_relanza_server_adoptado(monkeypatch: Any) -> None:
    """(Ola 270 · AP7A) Un llama-server ADOPTADO (proc None: lo lanzó OTRO
    proceso, log «ya estaba vivo — adoptado») que responde /health 200 cuenta
    como VIVO: una pasada de `_supervisar_una_vez` NO llama a ensure_server y
    NO toca el reloj interactivo. Antes `proc is None` se trataba como muerto
    y el supervisor relanzaba el BitNet cada 5 s, anulando el «dormir»."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    monkeypatch.setenv("ASTRAURA_BITNET_SERVIDORES", "1")  # modo compartido: un perfil
    mgr = BitNetCppManager()
    mgr._servers = {"interactive": {"proc": None}}  # adoptado: sin proc propio
    congelado = _time.time() - 123
    mgr._ultimo_uso_interactivo = congelado

    espia: list = []
    monkeypatch.setattr(mgr, "ensure_server", lambda *a, **k: espia.append(a))

    class _Resp:
        status = 200  # /health responde: el server está vivo

        def __enter__(self) -> "_Resp":
            return self

        def __exit__(self, *a: Any) -> None:
            return None

    monkeypatch.setattr(urllib.request, "urlopen", lambda *a, **k: _Resp())

    mgr._supervisar_una_vez()
    assert espia == []  # no relanzó el adoptado
    assert mgr._ultimo_uso_interactivo == congelado  # el reloj interactivo intacto


def test_ensure_server_marcar_false_no_cierra_la_ventana(monkeypatch: Any) -> None:
    """(Ola 270 · AP7A) `ensure_server(..., marcar=False)` (relanzamiento del
    supervisor) NO cierra la ventana «cedido» ni marca uso: devuelve None y
    `_cedido_hasta` sigue en el futuro. El keep-alive no debe anular el turno
    de memoria que la voz pidió al dormir."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    mgr._cedido_hasta = _time.time() + 300
    mgr._dormido = True
    res = mgr.ensure_server(0.0, "interactive", marcar=False)
    assert res is None
    assert mgr._cedido_hasta > _time.time()  # la ventana sigue abierta
    assert mgr._dormido is True  # no se limpió: marcar_uso no se llamó


# ---------------------------------------------------------------------------
# (2026-09-07 · Ola 270 · AP7B) dormir_a_peticion también apaga un llama-server
# ADOPTADO (sin proc propio): libera RAM de verdad tras un reinicio del backend,
# cuando el proceso fue lanzado por el proceso anterior y `proc` es None.
# ---------------------------------------------------------------------------

import os as _os
import signal as _signal
import subprocess as _subprocess


def test_dormir_apaga_llama_server_adoptado(monkeypatch: Any) -> None:
    """(Ola 270 · AP7B) Con proc None pero un llama-server adoptado escuchando en
    el puerto, `dormir_a_peticion` localiza el pid, comprueba que es llama-server,
    lo mata con SIGTERM (y `/health` ya no responde) y devuelve `adoptado: True`."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    mgr._servers = {}
    mgr._ultimo_uso = _time.time() - 3600

    kills: list = []
    monkeypatch.setattr(_os, "kill", lambda pid, sig: kills.append((pid, sig)))
    monkeypatch.setattr(_signal, "SIGTERM", 15)

    def _run_falso(cmd, *a, **k):
        if cmd and cmd[0] == "lsof":
            sr = _subprocess.CompletedProcess(cmd, 0, stdout="4242\n", stderr="")
            return sr
        raise AssertionError(f"comando inesperado: {cmd}")

    monkeypatch.setattr(_subprocess, "run", _run_falso)
    monkeypatch.setattr(
        _subprocess,
        "check_output",
        lambda cmd, *a, **k: b"llama-server -m gguf --port 8790",
    )

    # /health falla tras el kill: el puerto dejó de responder → SIGTERM bastó.
    def _urlopen_falla(*a, **k):
        raise Exception("connection refused")

    monkeypatch.setattr(urllib.request, "urlopen", _urlopen_falla)

    res = mgr.dormir_a_peticion(min_inactivo_s=30.0)
    assert res["adoptado"] is True
    assert res["pid"] == 4242
    assert mgr._dormido is True
    assert kills and kills[0][1] == 15  # os.kill llamado con SIGTERM


def test_dormir_no_mata_proceso_ajeno(monkeypatch: Any) -> None:
    """(Ola 270 · AP7B) Si el pid escuchando en el puerto NO es un llama-server
    (ps dice otra cosa), `_apagar_adoptado` NO lo mata y la respuesta vuelve a
    ser `ya_estaba`: un proceso ajeno ocupando el puerto no es nuestro."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    mgr._servers = {}
    mgr._ultimo_uso = _time.time() - 3600

    kills: list = []
    monkeypatch.setattr(_os, "kill", lambda pid, sig: kills.append((pid, sig)))

    def _run_falso(cmd, *a, **k):
        if cmd and cmd[0] == "lsof":
            return _subprocess.CompletedProcess(cmd, 0, stdout="4242\n", stderr="")
        raise AssertionError(f"comando inesperado: {cmd}")

    monkeypatch.setattr(_subprocess, "run", _run_falso)
    monkeypatch.setattr(
        _subprocess,
        "check_output",
        lambda cmd, *a, **k: b"python otra-cosa",
    )

    res = mgr.dormir_a_peticion(min_inactivo_s=30.0)
    assert res["ya_estaba"] is True
    assert kills == []  # os.kill jamás se llamó


# ---------------------------------------------------------------------------
# (2026-09-07 · Ola 270 · AP7C) `_apagar_adoptado` elige el pid correcto.
# `lsof -ti tcp:8790` devuelve DOS pids —62876 (el backend uvicorn, conectado
# como CLIENTE) y 63022 (el llama-server que ESCUCHA)—; el código debe quedarse
# con el PRIMERO que `ps` confirme como llama-server, no con el primero de la
# lista (antes tomaba `[0]` = el cliente y respondía «ya_estaba» con el server
# vivo).
# ---------------------------------------------------------------------------


def test_apagar_adoptado_elige_llama_server_no_el_cliente(monkeypatch: Any) -> None:
    """(Ola 270 · AP7C) Aunque lsof devuelva el pid del backend-cliente antes
    que el del llama-server, `_apagar_adoptado(8790)` devuelve 63022 y `os.kill`
    (espía) se llama SOLO con ese pid: el cliente jamás se mata."""
    mgr = BitNetCppManager()
    mgr._servers = {}

    kills: list = []
    monkeypatch.setattr(_os, "kill", lambda pid, sig: kills.append((pid, sig)))
    monkeypatch.setattr(_signal, "SIGTERM", 15)

    def _run_falso(cmd, *a, **k):
        if cmd and cmd[0] == "lsof":
            # lsof devuelve los dos pids; el primero (62876) es el cliente.
            return _subprocess.CompletedProcess(cmd, 0, stdout="62876\n63022\n", stderr="")
        if cmd and cmd[0] == "pgrep":
            return _subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")
        raise AssertionError(f"comando inesperado: {cmd}")

    monkeypatch.setattr(_subprocess, "run", _run_falso)

    def _ps(cmd, *a, **k):
        pid = str(cmd[-1])
        if pid == "62876":
            return b"python -m uvicorn starseed_backend --port 8790"
        if pid == "63022":
            return b"llama-server -m gguf-1.58b --port 8790"
        raise AssertionError(f"ps inesperado para pid {pid}")

    monkeypatch.setattr(_subprocess, "check_output", _ps)

    # /health falla tras el kill: SIGTERM bastó y se devuelve el pid matado.
    def _urlopen_falla(*a, **k):
        raise Exception("connection refused")

    monkeypatch.setattr(urllib.request, "urlopen", _urlopen_falla)

    pid = mgr._apagar_adoptado(8790)
    assert pid == 63022
    assert kills == [(63022, 15)]  # os.kill solo con el llama-server


def _concesion(tmp_path: Path, monkeypatch: Any, segundos: float) -> None:
    import json as _json
    ruta = tmp_path / "conversacion.json"
    ruta.write_text(_json.dumps({"desde": _time.time(), "hasta": _time.time() + segundos}))
    monkeypatch.setenv("STARSEED_CONVERSACION", str(ruta))


def test_en_conversacion_el_fondo_no_ocupa_bitnet(monkeypatch: Any, tmp_path: Path) -> None:
    """(Astraura en vivo · 2026-09-23) Con la concesión activa el fondo recibe
    None sin marcar uso; al caducar vuelve a su camino normal."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    _concesion(tmp_path, monkeypatch, 60)
    antes = mgr._ultimo_uso
    assert mgr._conversacion_en_vivo() is True
    assert mgr.ensure_server(0.0, "background") is None
    assert mgr._ultimo_uso == antes
    _concesion(tmp_path, monkeypatch, -5)
    assert mgr._conversacion_en_vivo() is False


def test_en_conversacion_nadie_duerme_al_motor(monkeypatch: Any, tmp_path: Path) -> None:
    """Ni el auto-sueño ni el turno de memoria apagan BitNet en plena charla."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    llamadas: list = []
    monkeypatch.setattr(mgr, "stop_server", lambda: llamadas.append("stop"))
    mgr._servers = {"interactive": {"proc": _ProcFalso()}}
    mgr._ultimo_uso = _time.time() - 3600
    mgr._ultimo_uso_interactivo = _time.time() - 3600
    _concesion(tmp_path, monkeypatch, 60)
    assert mgr._dormir_si_toca() is False
    res = mgr.dormir_a_peticion(min_inactivo_s=30.0)
    assert res == {"dormido": False, "motivo": "conversación en vivo"}
    assert llamadas == []


def test_en_conversacion_todo_lo_del_backend_espera(monkeypatch: Any, tmp_path: Path) -> None:
    """(Astraura en vivo · 2026-09-23) Con la concesión activa, incluso lo que llega
    marcado «interactive» (tareas del AuthOrchestrator, malla) se omite: ni BitNet
    ni Ollama, y `meta` dice por qué."""
    engine = BitNetUnifiedEngine()
    mgr = _motor_mod.bitnet_cpp_manager

    def _prohibido(*a: Any, **k: Any) -> None:
        raise AssertionError("en plena conversación el backend no ocupa BitNet")

    monkeypatch.setattr(mgr, "ensure_server", _prohibido)
    monkeypatch.setattr(mgr, "estado_turno", lambda: dict(_SIN_TURNO))
    _concesion(tmp_path, monkeypatch, 60)
    ollama = _parchear_ollama(monkeypatch, engine)
    meta: dict = {}
    tokens = _drenar(engine, "interactive", meta)
    assert tokens == [] and ollama == []
    assert meta.get("omitido") == "conversación en vivo"
