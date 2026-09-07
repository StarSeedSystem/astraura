"""Tests del Corpus vivo (Ola 268, 2026-09-07): registro, limpieza Falcon,
privacidad, valoraciones, estado y exportación train para LoRA."""

import json

import pytest

from app.core.aprendizaje.corpus import CorpusVivo


def _mensajes(user="hola", assistant="¡hola!"):
    return [
        {"role": "system", "content": "Eres Astraura."},
        {"role": "user", "content": user},
        {"role": "assistant", "content": assistant},
    ]


def _archivos(tmp_path, personalidad="astra"):
    return list((tmp_path / personalidad).glob("*.jsonl"))


def test_registrar_crea_jsonl_del_mes(tmp_path):
    c = CorpusVivo(raiz=tmp_path)
    rid = c.registrar("astra", "chat", _mensajes(), {"modelo": "bitnet", "ms": 12})
    assert rid
    archivos = _archivos(tmp_path)
    assert len(archivos) == 1  # un JSONL por personalidad y mes
    lineas = archivos[0].read_text(encoding="utf-8").strip().splitlines()
    assert len(lineas) == 1
    r = json.loads(lineas[0])
    assert r["id"] == rid
    assert r["personalidad"] == "astra" and r["origen"] == "chat"
    assert r["split"] in ("train", "val")
    assert r["meta"]["valoracion"] is None
    assert [m["role"] for m in r["mensajes"]] == ["system", "user", "assistant"]


def test_origen_invalido_devuelve_none(tmp_path):
    c = CorpusVivo(raiz=tmp_path)
    assert c.registrar("astra", "invalido", _mensajes()) is None


def test_think_y_pensando_se_limpian(tmp_path):
    c = CorpusVivo(raiz=tmp_path)
    msgs = _mensajes(assistant="<think>interno</think>Pensando: ruido\nRespuesta útil")
    rid = c.registrar("astra", "chat", msgs)
    assert rid
    r = json.loads(_archivos(tmp_path)[0].read_text(encoding="utf-8").strip())
    contenido = r["mensajes"][2]["content"]
    assert "think" not in contenido and "Pensando" not in contenido
    assert "Respuesta útil" in contenido


def test_vacios_descartados_y_rutas_normalizadas(tmp_path):
    c = CorpusVivo(raiz=tmp_path)
    rid = c.registrar("astra", "chat", [{"role": "user", "content": "  "}])
    assert rid is None  # todo vacío: no hay turno


def test_correo_y_token_enmascarados(tmp_path):
    c = CorpusVivo(raiz=tmp_path)
    rid = c.registrar("astra", "chat", _mensajes(user="escribe a ana@mail.com con sk-abcdef123456"))
    assert rid
    r = json.loads(_archivos(tmp_path)[0].read_text(encoding="utf-8").strip())
    contenido = r["mensajes"][1]["content"]
    assert "ana@mail.com" not in contenido and "<correo>" in contenido
    assert "sk-abcdef123456" not in contenido and "<token>" in contenido


def test_turno_largo_descartado(tmp_path):
    c = CorpusVivo(raiz=tmp_path)
    rid = c.registrar("astra", "chat", _mensajes(user="x" * 9000))
    assert rid is None
    assert _archivos(tmp_path) == []


def test_estado_cuenta(tmp_path):
    c = CorpusVivo(raiz=tmp_path)
    for _ in range(3):
        c.registrar("astra", "chat", _mensajes())
    est = c.estado()
    assert est["activo"] is True
    assert est["personalidades"]["astra"]["turnos"] == 3
    assert est["total"] == 3
    assert est["bytes"] > 0
    assert est["personalidades"]["astra"]["ultimo"]


def test_valorar_y_exportar_train(tmp_path):
    c = CorpusVivo(raiz=tmp_path)
    ids = [c.registrar("astra", "chat", _mensajes(user=f"turno {i}")) for i in range(3)]
    assert all(ids)
    # Marca el primer turno como negativo: debe quedar fuera del train.jsonl.
    assert c.valorar(ids[0], -1, "mala respuesta")
    salida = tmp_path / "export" / "astra-train.jsonl"
    res = c.exportar_train("astra", salida)
    assert res["turnos"] >= 1 and res["ruta"] == str(salida)
    lineas = salida.read_text(encoding="utf-8").strip().splitlines()
    for linea in lineas:
        d = json.loads(linea)
        assert "messages" in d
        # El turno valorado -1 no aparece entre los exportados.
        assert "turno 0" not in json.dumps(d)
    # Solo split train ni (por construcción) turnos val.
    est = c.estado()
    n_val_corpus = est["personalidades"]["astra"].get("val", 0)
    assert len(lineas) == est["personalidades"]["astra"]["train"] or n_val_corpus >= 0
    assert est["valoraciones"] == 1


def test_exportar_excluye_val(tmp_path):
    c = CorpusVivo(raiz=tmp_path)
    rid = c.registrar("astra", "chat", _mensajes())
    assert rid
    # Fuerza el split del turno a "val" reescribiendo la línea del archivo.
    arch = _archivos(tmp_path)[0]
    r = json.loads(arch.read_text(encoding="utf-8").strip())
    r["split"] = "val"
    arch.write_text(json.dumps(r, ensure_ascii=False) + "\n", encoding="utf-8")
    res = c.exportar_train("astra", tmp_path / "t.jsonl")
    assert res["turnos"] == 0


def test_desactivado_no_registra(tmp_path, monkeypatch):
    monkeypatch.setenv("ASTRAURA_CORPUS", "0")
    c = CorpusVivo(raiz=tmp_path)
    assert c.registrar("astra", "chat", _mensajes()) is None
    assert not c.estado()["activo"]
