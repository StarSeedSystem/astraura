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
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.engine.bitnet_cpp_manager import BitNetCppManager

import time as _time


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
