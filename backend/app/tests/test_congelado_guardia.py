# (2026-10-09) BitNet congelado por el guardia de memoria ≠ BitNet caído.
#
# Por qué: con el enjambre del OS escribiendo, guardia-memoria.py hace SIGSTOP
# al llama-server y apunta su PID en /tmp. Parado, conserva el puerto pero no
# contesta; la sonda lo daba por «apagado» y el supervisor lanzaba otro encima
# cada 5 s (673 lanzamientos medidos). Estas pruebas fijan que el congelado se
# reconoce con el MISMO criterio que el guardia (PID en la marca Y estado «T»)
# y que ni el supervisor ni ensure_server relanzan encima.

import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.engine import bitnet_cpp_manager as M  # noqa: E402


def _marca(pids):
    f = tempfile.NamedTemporaryFile("w", delete=False, suffix=".marca")
    f.write("\n".join(str(p) for p in pids))
    f.close()
    return f.name


def test_solo_cuenta_pid_marcado_y_parado() -> None:
    marca = _marca([101, 202])
    estados = {101: "T", 202: "S"}
    assert M.pids_congelados_por_guardia(marca=marca, estado_fn=lambda p: estados.get(p, "")) == [101]


def test_marca_sobrante_no_cuenta() -> None:
    marca = _marca([303])
    assert M.pids_congelados_por_guardia(marca=marca, estado_fn=lambda p: "S+") == []
    assert M.pids_congelados_por_guardia(marca="/tmp/no-existe-esta-marca-xyz", estado_fn=lambda p: "T") == []


def test_supervisor_no_relanza_congelado(monkeypatch) -> None:
    lanzados = []
    obj = SimpleNamespace(
        _dormido=False, _cedido_activo=lambda: False, _dormir_si_toca=lambda: False,
        _servidor_compartido=lambda: True, _servers={}, _clave_servidor=lambda p: "interactive",
        _proceso_vivo=lambda perfil, proc: False,
        ensure_server=lambda *a, **k: lanzados.append(a),
    )
    monkeypatch.setattr(M, "congelado_por_guardia", lambda **k: True)
    M.BitNetCppManager._supervisar_una_vez(obj)
    assert lanzados == []
    monkeypatch.setattr(M, "congelado_por_guardia", lambda **k: False)
    M.BitNetCppManager._supervisar_una_vez(obj)
    assert len(lanzados) == 1  # sin congelar, el keep-alive sigue funcionando


def test_ensure_server_no_lanza_encima_de_un_congelado(monkeypatch) -> None:
    import threading
    popen = []
    obj = SimpleNamespace(
        _cedido_activo=lambda: False, _conversacion_en_vivo=lambda: False,
        marcar_uso=lambda perfil: None, _server_lock=threading.Lock(), _servers={},
        _clave_servidor=lambda p: "interactive", _port_for=lambda p: 8790,
        probe_port=lambda perfil, force=False: {"state": "apagado", "base": None},
    )
    monkeypatch.setattr(M, "congelado_por_guardia", lambda **k: True)
    monkeypatch.setattr(M, "pids_congelados_por_guardia", lambda **k: [4242])
    monkeypatch.setattr(M.subprocess, "Popen", lambda *a, **k: popen.append(a))
    assert M.BitNetCppManager.ensure_server(obj, 0.0, "interactive") is None
    assert popen == []
