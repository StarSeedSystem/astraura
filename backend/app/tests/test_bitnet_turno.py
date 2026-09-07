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
    """Uso hace menos de `min_inactivo_s` → NO duerme: una petición a mitad
    de vuelo no se sacrifica por el turno de la voz."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    mgr._servers = {"interactive": {"proc": _ProcFalso()}}
    mgr._ultimo_uso = _time.time()  # acaba de usarse
    res = mgr.dormir_a_peticion(min_inactivo_s=30.0)
    assert res["dormido"] is False
    assert str(res["motivo"]).startswith("en uso hace")
    assert mgr._dormido is False


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
    `stop_server` no se llama."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "10")
    mgr = BitNetCppManager()
    llamadas: list = []
    monkeypatch.setattr(mgr, "stop_server", lambda: llamadas.append("stop"))
    mgr._servers = {}
    mgr._ultimo_uso = _time.time() - 3600
    mgr._dormido = True
    res = mgr.dormir_a_peticion()
    assert res == {"dormido": True, "ya_estaba": True}
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
    red: `_alive` se parchea para no sondear el puerto."""
    monkeypatch.setenv("ASTRAURA_BITNET_SUENO_MIN", "7")
    mgr = BitNetCppManager()
    monkeypatch.setattr(mgr, "_alive", lambda *a, **k: True)
    mgr._dormido = False
    estado = mgr.estado_turno()
    for clave in ("dormido", "sueno_min", "ultimo_uso_hace_s", "vivo", "puerto"):
        assert clave in estado
    assert estado["vivo"] is True
    assert estado["sueno_min"] == 7
    assert estado["puerto"] == mgr.server_port
    assert estado["dormido"] is False
    assert estado["ultimo_uso_hace_s"] >= 0
