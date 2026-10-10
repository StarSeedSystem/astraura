"""PDA1011: malla y estado de cerebros por la puerta de datos del A1, con Supabase de respaldo."""
import os
import time
import unittest
from unittest import mock

from app.core import puerta_datos as pd
from app.core import mesh_network as mn
from app.cerebros import cerebros_manager as cm

ENV = {"PUERTA_DATOS_URL": "https://datos.ejemplo.invalid", "PUERTA_DATOS_FICHA_ASTRAURA": "pd_" + "x" * 43}


class RedFalsa:
    def __init__(self, sano=True, codigo=200, nodos=None, estado=None):
        self.sano, self.codigo, self.nodos, self.estado = sano, codigo, nodos or [], estado
        self.llamadas = []

    def __call__(self, metodo, url, cab, cuerpo, tope):
        ruta = url.split(".invalid", 1)[-1]
        self.llamadas.append((metodo, ruta, cab.get("Authorization", "")[:10]))
        if ruta == "/salud":
            return (200, {"ok": True}) if self.sano else (503, {"ok": False})
        if ruta.startswith("/v1/malla/nodos") and metodo == "GET":
            return self.codigo, {"nodos": self.nodos}
        if ruta.startswith("/v1/astraura/estado/") and metodo == "GET":
            return (404, {"error": "sin estado publicado"}) if self.estado is None else (200, {"data": self.estado})
        return self.codigo, {"ok": True}


def puerta_con(red, env=ENV, reloj=None):
    return pd.PuertaAstraura(http=red, ahora=reloj or time.time, env=lambda: dict(env))


class SinInterruptor(unittest.TestCase):
    """Las pruebas de otros archivos apagan la puerta por entorno; aquí se prueba encendida."""

    def setUp(self):
        self._viejo = os.environ.pop("ASTRAURA_PUERTA_DATOS", None)

    def tearDown(self):
        os.environ.pop("ASTRAURA_PUERTA_DATOS", None)
        if self._viejo is not None:
            os.environ["ASTRAURA_PUERTA_DATOS"] = self._viejo


class Puerta(SinInterruptor):

    def test_sin_ficha_o_sin_https_no_hay_puerta(self):
        self.assertFalse(puerta_con(RedFalsa(), env={"PUERTA_DATOS_URL": ENV["PUERTA_DATOS_URL"]}).activa())
        self.assertFalse(puerta_con(RedFalsa(), env=dict(ENV, PUERTA_DATOS_URL="http://1.2.3.4:8791")).activa())
        self.assertTrue(puerta_con(RedFalsa(), env=dict(ENV, PUERTA_DATOS_URL="http://127.0.0.1:8791")).activa())

    def test_interruptor_apagada(self):
        os.environ["ASTRAURA_PUERTA_DATOS"] = "apagada"
        self.assertFalse(puerta_con(RedFalsa()).activa())

    def test_registra_con_la_ficha_y_un_solo_sondeo_de_salud(self):
        red = RedFalsa()
        p = puerta_con(red)
        self.assertTrue(p.malla_registrar({"node_id": "a"}))
        self.assertTrue(p.malla_registrar({"node_id": "a"}))
        self.assertEqual([c[1] for c in red.llamadas].count("/salud"), 1)
        self.assertEqual(red.llamadas[1][2], "Bearer pd_")
        self.assertEqual(p.cuentas["puerta"], 2)

    def test_puerta_caida_espera_creciente_y_no_insiste(self):
        reloj = [1000.0]
        red = RedFalsa(sano=False)
        p = puerta_con(red, reloj=lambda: reloj[0])
        self.assertFalse(p.malla_registrar({"node_id": "a"}))
        self.assertFalse(p.malla_registrar({"node_id": "a"}))
        self.assertEqual(len(red.llamadas), 1)  # el segundo intento ni pregunta: espera 60 s
        reloj[0] += 61
        red.sano = True
        self.assertTrue(p.malla_registrar({"node_id": "a"}))

    def test_un_5xx_cuenta_como_fallo(self):
        p = puerta_con(RedFalsa(codigo=502))
        self.assertFalse(p.malla_registrar({"node_id": "a"}))
        self.assertEqual(p.cuentas["errores"], 1)

    def test_estado_sin_publicar_es_vacio_no_none(self):
        self.assertEqual(puerta_con(RedFalsa()).estado_leer("cerebros"), {})


class Malla(SinInterruptor):
    def setUp(self):
        super().setUp()
        self.red_sb = []
        self.malla = mn.MeshNetwork()
        self.malla._supabase_upsert_node = lambda fila: self.red_sb.append(fila) or True
        self.malla._supabase_fetch_nodes = lambda: [{"node_id": "otro-sb", "updated_at": "2026-10-10T22:00:00+00:00"}]

    def test_con_la_puerta_sana_supabase_no_se_toca(self):
        red = RedFalsa()
        with mock.patch.object(mn, "puerta_datos", puerta_con(red)):
            self.assertTrue(self.malla._latido_supabase(self.malla.get_self(), forzar=True))
        self.assertEqual(self.red_sb, [])
        self.assertEqual(self.malla.get_status()["malla_via"], "puerta")
        self.assertIn(("POST", "/v1/malla/nodos", "Bearer pd_"), red.llamadas)

    def test_con_la_puerta_caida_va_por_supabase(self):
        with mock.patch.object(mn, "puerta_datos", puerta_con(RedFalsa(sano=False))):
            self.assertTrue(self.malla._latido_supabase(self.malla.get_self(), forzar=True))
        self.assertEqual(len(self.red_sb), 1)
        self.assertEqual(self.malla._ultimo_via, "supabase")

    def test_descubre_por_la_puerta_con_milisegundos(self):
        hace = time.time() - 120
        iso = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(hace)) + ".123Z"
        red = RedFalsa(nodos=[{"node_id": "otro-puerta", "updated_at": iso}])
        with mock.patch.object(mn, "puerta_datos", puerta_con(red)), mock.patch.object(self.malla, "_save_nodes"):
            self.malla.discover_remote_nodes()
        self.assertIn("otro-puerta", self.malla.nodes)
        self.assertNotIn("otro-sb", self.malla.nodes)
        self.assertAlmostEqual(self.malla.nodes["otro-puerta"]["last_heartbeat"], int(hace), delta=2)
        self.assertEqual(self.malla._descubre_via, "puerta")

    def test_descubre_por_supabase_si_la_puerta_no_responde(self):
        with mock.patch.object(mn, "puerta_datos", puerta_con(RedFalsa(sano=False))), mock.patch.object(self.malla, "_save_nodes"):
            self.malla.discover_remote_nodes()
        self.assertIn("otro-sb", self.malla.nodes)


class Cerebros(SinInterruptor):
    def test_huella_igual_en_la_puerta_no_toca_supabase(self):
        gestor = cm.CerebrosManager.__new__(cm.CerebrosManager)
        datos = {"active_brain_id": "b1", "cerebros": {"b1": {"nombre": "uno"}}}
        huella = cm.CerebrosManager._huella_cerebros(datos)
        red = RedFalsa(estado={"huella": huella})
        p = puerta_con(red)
        with mock.patch.object(pd, "puerta", p):
            gestor._publicar_estado_cerebros(datos)
            self.assertTrue(gestor._cerebros_sin_cambios_en_puerta())
            red.estado = {"huella": "otra"}
            self.assertFalse(gestor._cerebros_sin_cambios_en_puerta())
            gestor._cerebros_mirado_supabase = time.time() - 4000  # pasada la hora: se mira Supabase
            red.estado = {"huella": huella}
            self.assertFalse(gestor._cerebros_sin_cambios_en_puerta())
        self.assertIn(("PUT", "/v1/astraura/estado/cerebros", "Bearer pd_"), red.llamadas)


if __name__ == "__main__":
    unittest.main()
