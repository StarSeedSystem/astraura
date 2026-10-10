"""CON1010: sincronía espaciada del backend de Astraura (fallan con el código anterior)."""
import asyncio, json, os, threading, time, unittest

# (PDA1011) Estas pruebas miden la subida a Supabase: la puerta de datos queda apagada aquí.
os.environ.setdefault("ASTRAURA_PUERTA_DATOS", "apagada")
from unittest import mock

from app.core import mesh_network as mn
from app.core import sync_engine as se
from app.core import supabase_sync
from app.cerebros import cerebros_manager as cm


class Malla(unittest.TestCase):
    def setUp(self):
        self.red = mn.MeshNetwork()
        self.subidas = []
        self.red._supabase_upsert_node = lambda nodo: self.subidas.append(nodo) or True
        self.red.rebalance_shards = lambda *a, **k: []

    def test_un_dia_de_latidos_locales_sube_288_filas_no_4320(self):
        reloj = [1_000_000.0]
        async def dia():
            with mock.patch.object(mn.time, "time", lambda: reloj[0]):
                for _ in range(2880):  # 24 h de latidos locales de 30 s
                    self.red.register_node(self.red.get_self())
                    await asyncio.sleep(0)  # deja correr las subidas en hilo
                    await asyncio.sleep(0.001)
                    reloj[0] += 30
        asyncio.run(dia())
        self.assertLessEqual(len(self.subidas), 24 * 3600 // mn.SUPABASE_LATIDO_S + 1)
        self.assertGreaterEqual(len(self.subidas), 24 * 3600 // mn.SUPABASE_LATIDO_S - 1)

    def test_un_fallo_se_reintenta_en_el_siguiente_latido(self):
        estados = [False, True]
        self.red._supabase_upsert_node = lambda nodo: estados.pop(0)
        with mock.patch.object(mn.time, "time", lambda: 5_000.0):
            self.assertFalse(self.red._latido_supabase({"node_id": "x"}))
        with mock.patch.object(mn.time, "time", lambda: 5_000.0 + mn.HEARTBEAT_INTERVAL_S):
            self.assertTrue(self.red._latido_supabase({"node_id": "x"}))

    def test_un_nodo_visto_por_supabase_no_parece_caido_entre_dos_latidos(self):
        ahora = time.time()
        self.red.nodes = {
            "lan": {"node_id": "lan", "last_heartbeat": ahora - 200},
            "nube": {"node_id": "nube", "last_heartbeat": ahora - 200, "via": "supabase"},
        }
        self.red.update_statuses()
        self.assertEqual(self.red.nodes["lan"]["status"], "stale")
        self.assertEqual(self.red.nodes["nube"]["status"], "active")
        self.red.nodes["nube"]["last_heartbeat"] = ahora - (2 * mn.SUPABASE_LATIDO_S + 120)
        self.red.update_statuses()
        self.assertEqual(self.red.nodes["nube"]["status"], "dead")

    def test_descubrir_cada_5_min(self):
        self.assertGreaterEqual(mn.DESCUBRIMIENTO_S, 300)


class Secciones(unittest.TestCase):
    def setUp(self):
        se._last_hashes.clear()
        se._last_push_at.clear()
        supabase_sync.subidas.clear()
        self.ruta = se._local_path("swarm/swarm_adaptive_state.json")
        self.ruta.parent.mkdir(parents=True, exist_ok=True)

    def escribir(self, i):
        self.ruta.write_text(json.dumps({"tick": i}), encoding="utf-8")

    def test_una_seccion_que_cambia_cada_2_min_se_sube_cada_15_no_cada_2(self):
        reloj = [10_000.0]
        with mock.patch.object(se.time, "time", lambda: reloj[0]):
            for i in range(30):  # 1 h de vueltas de 2 min, con la sección cambiando siempre
                self.escribir(i)
                se.push_all()
                reloj[0] += 120
        subidas = [s for s in supabase_sync.subidas if "config__swarm_state.json" in s]
        self.assertLessEqual(len(subidas), 5)  # 60 / 15 + 1
        self.assertGreaterEqual(len(subidas), 4)

    def test_forzar_no_espera(self):
        with mock.patch.object(se.time, "time", lambda: 50_000.0):
            self.escribir(1); se.push_all()
            self.escribir(2); se.push_all(force=True)
        self.assertEqual(sum("config__swarm_state.json" in s for s in supabase_sync.subidas), 2)

    def test_lo_que_espera_turno_sube_con_su_ultimo_contenido(self):
        reloj = [90_000.0]
        with mock.patch.object(se.time, "time", lambda: reloj[0]):
            self.escribir(1); se.push_all()
            self.escribir(2); se.push_all()
            reloj[0] += 901
            self.escribir(3); se.push_all()
        ultimas = [s["config__swarm_state.json"] for s in supabase_sync.subidas if "config__swarm_state.json" in s]
        self.assertEqual(ultimas, [{"tick": 1}, {"tick": 3}])


class Cerebros(unittest.TestCase):
    def test_la_nube_cada_10_min_y_el_escaneo_local_cada_2(self):
        llamadas = {"local": 0, "nube": 0}
        falso = mock.Mock()
        falso.auto_link_detected_brains = lambda: llamadas.__setitem__("local", llamadas["local"] + 1)
        falso.sync_with_best_available = lambda: llamadas.__setitem__("nube", llamadas["nube"] + 1)
        reloj = [0.0]
        vueltas = [0]
        class Basta(Exception):
            pass
        def dormir(s):
            reloj[0] += s
            vueltas[0] += 1
            if vueltas[0] >= 30:  # 1 h
                raise Basta()
        def hilo(target=None, daemon=None):
            h = mock.Mock()
            def correr():
                try:
                    target()
                except Basta:
                    pass
            h.start = correr
            return h
        with mock.patch("time.sleep", dormir), mock.patch("time.time", lambda: reloj[0]), \
             mock.patch.object(cm.threading, "Thread", hilo):
            cm.CerebrosManager.start_background_sync(falso)
        self.assertEqual(llamadas["local"], 30)
        self.assertLessEqual(llamadas["nube"], 7)
        self.assertGreaterEqual(llamadas["nube"], 6)


if __name__ == "__main__":
    unittest.main()
