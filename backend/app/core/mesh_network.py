"""
mesh_network.py — Red Mesh P2P de Astraura 1.58-Bit
====================================================

Qué es REAL en este módulo:
  * Registro de nodos con persistencia local (data/mesh/nodes.json).
  * Heartbeat periódico hacia peers conocidos vía HTTP y upsert a Supabase
    (tabla astraura_mesh_nodes) cuando hay credenciales.
  * Descubrimiento: lectura de nodos desde Supabase + sondeo LAN /24
    best-effort (no bloqueante, con timeouts cortos).
  * Sharding determinista de capas del modelo 1.58-bit entre nodos activos.
  * Routing de inferencia: pipeline distribuido si hay nodos capaces,
    fallback SIEMPRE al motor local bitnet_engine.generate_stream
    (nunca lanza excepción al caller).
  * Aprendizaje federado: deltas ternarios {-1,0,+1} (~2 bits/peso),
    agregación por mayoría de votos. NUNCA salen datos locales crudos.

Qué es PLACEHOLDER / honesto:
  * El "pipeline distribuido" asume que cada nodo remoto expone
    POST /api/mesh/infer_shard — si el nodo no lo implementa, ese shard
    falla y la inferencia cae al motor local (degradación honesta).
  * La agregación federada es mayoría de votos por peso sobre deltas ya
    comprimidos; no aplica los pesos al modelo real (eso lo haría un
    futuro paso de materialización fuera de este módulo).
  * El sondeo LAN es un barrido TCP/HTTP simple, no mDNS/Bonjour.

Modo LAN-only: si ~/.astraura/supabase_astraura.json no existe, todo
funciona sin Supabase con un warning; nunca crash.
"""

import os
import json
import uuid
import time
import math
import socket
import hashlib
import logging
import asyncio
import platform
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("astraura.mesh")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MESH_DIR = BASE_DIR / "data" / "mesh"
NODES_FILE = MESH_DIR / "nodes.json"
NODE_ID_FILE = MESH_DIR / "node_id.txt"
FED_DELTAS_FILE = MESH_DIR / "federated_deltas.json"

HEARTBEAT_INTERVAL_S = 30
STALE_AFTER_S = 90
DEAD_AFTER_S = 300
LAN_PING_TIMEOUT_S = 0.35

CRED_FILE = os.path.expanduser("~/.astraura/supabase_astraura.json")
BREW_CURL = "/opt/homebrew/opt/curl/bin/curl"
SUPABASE_TABLE = "astraura_mesh_nodes"


def _curl_bin() -> str:
    return BREW_CURL if os.path.exists(BREW_CURL) else "/usr/bin/curl"


def _load_creds() -> Optional[dict]:
    """Carga credenciales Supabase; None => modo LAN-only.
    (fix nube) En Cloud Run no existe ~/.astraura/, así que también acepta
    las mismas env vars que supabase_sync inyecta al contenedor."""
    if os.path.exists(CRED_FILE):
        try:
            with open(CRED_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"No se pudieron leer credenciales Supabase: {e}")
    url = (os.environ.get("SUPABASE_URL") or "").strip()
    key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if url and key:
        try:
            ref = url.split("//")[1].split(".")[0] if "//" in url else ""
        except Exception:
            ref = ""
        return {"supabase_url": url.rstrip("/"), "service_role_key": key,
                "anon_key": os.environ.get("SUPABASE_ANON_KEY", ""), "project_ref": ref}
    return None


def _local_ip() -> Optional[str]:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


class MeshNetwork:
    """Red Mesh P2P para inferencia distribuida 1.58-bit."""

    def __init__(self):
        MESH_DIR.mkdir(parents=True, exist_ok=True)
        self.node_id = self._load_or_create_node_id()
        self.hostname = socket.gethostname()
        self.nodes: Dict[str, Dict[str, Any]] = {}  # node_id -> registro
        self.started = False
        self._hb_task: Optional[asyncio.Task] = None
        self._lan_task: Optional[asyncio.Task] = None
        self._shards: List[Dict[str, Any]] = []
        self._shard_model: str = ""
        self.federated_deltas: List[Dict[str, Any]] = []
        self._load_nodes()
        self._load_deltas()
        if _load_creds() is None:
            logger.warning("🕸️ [MESH] Sin credenciales Supabase: modo LAN-only.")

    # ------------------------------------------------------------------
    # Persistencia local
    # ------------------------------------------------------------------
    def _load_or_create_node_id(self) -> str:
        try:
            if NODE_ID_FILE.exists():
                nid = NODE_ID_FILE.read_text(encoding="utf-8").strip()
                if nid:
                    return nid
            nid = str(uuid.uuid4())
            NODE_ID_FILE.write_text(nid, encoding="utf-8")
            return nid
        except Exception:
            return str(uuid.uuid4())  # efímero si no se puede persistir

    def _load_nodes(self):
        try:
            if NODES_FILE.exists():
                data = json.loads(NODES_FILE.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    self.nodes = data
        except Exception as e:
            logger.warning(f"🕸️ [MESH] No se pudo cargar nodes.json: {e}")

    def _save_nodes(self):
        try:
            NODES_FILE.write_text(
                json.dumps(self.nodes, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as e:
            logger.warning(f"🕸️ [MESH] No se pudo guardar nodes.json: {e}")

    def _load_deltas(self):
        try:
            if FED_DELTAS_FILE.exists():
                data = json.loads(FED_DELTAS_FILE.read_text(encoding="utf-8"))
                if isinstance(data, list):
                    self.federated_deltas = data
        except Exception as e:
            logger.warning(f"🕸️ [MESH] No se pudieron cargar deltas federados: {e}")

    def _save_deltas(self):
        try:
            FED_DELTAS_FILE.write_text(
                json.dumps(self.federated_deltas[-500:], ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as e:
            logger.warning(f"🕸️ [MESH] No se pudieron guardar deltas: {e}")

    # ------------------------------------------------------------------
    # Registro del nodo propio
    # ------------------------------------------------------------------
    def get_self(self) -> Dict[str, Any]:
        """Registro de este nodo (hardware + capacidades reales)."""
        hw = {}
        try:
            hw = {
                "ram_gb": round(os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / (1024 ** 3), 1),
                "cpu_arch": platform.machine(),
                "os": platform.platform(),
            }
        except Exception:
            hw = {"ram_gb": None, "cpu_arch": platform.machine(), "os": platform.system()}
        ip = _local_ip()
        url_publica = None
        try:
            # Reutiliza el túnel soberano si está activo (sin tocar su estado)
            tfile = BASE_DIR / "data" / "active_tunnel.json"
            if tfile.exists():
                url_publica = json.loads(tfile.read_text(encoding="utf-8")).get("url")
        except Exception:
            pass
        return {
            "node_id": self.node_id,
            "hostname": self.hostname,
            "hardware": hw,
            "capabilities": {"puede_inferir": True, "modelos_disponibles": ["bitnet-1.58b"]},
            "url_local": f"http://{ip or '127.0.0.1'}:8000",
            "url_publica": url_publica,
            "last_heartbeat": time.time(),
            "status": "active",
        }

    # ------------------------------------------------------------------
    # Supabase (best-effort)
    # ------------------------------------------------------------------
    def _supabase_upsert_node(self, node: Dict[str, Any]) -> bool:
        creds = _load_creds()
        if not creds:
            return False
        row = dict(node)
        # (fix) PostgREST exige ISO-8601 para timestamptz: el epoch float interno
        # se convierte aquí (y en cualquier campo *_at) antes del upsert.
        for k in ("last_heartbeat", "created_at", "updated_at"):
            v = row.get(k)
            if isinstance(v, (int, float)):
                row[k] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(v))
        row["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        payload = json.dumps(row, ensure_ascii=False).encode("utf-8")
        url = f"{creds['supabase_url'].rstrip('/')}/rest/v1/{SUPABASE_TABLE}?on_conflict=node_id"
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
            tmp.write(payload)
            tmp_path = tmp.name
        cmd = [
            _curl_bin(), "-sS", "-m", "15", "--tlsv1.2", "-X", "POST", url,
            "-H", f"apikey: {creds.get('service_role_key', '')}",
            "-H", f"Authorization: Bearer {creds.get('service_role_key', '')}",
            "-H", "Content-Type: application/json",
            "-H", "Prefer: resolution=merge-duplicates",
            "--data-binary", f"@{tmp_path}",
        ]
        try:
            proc = subprocess.run(cmd, capture_output=True, timeout=25)
            ok = proc.returncode == 0
            if not ok:
                logger.debug(f"🕸️ [MESH] upsert Supabase falló: {proc.stderr[:200]}")
            return ok
        except Exception as e:
            logger.debug(f"🕸️ [MESH] upsert Supabase exception: {e}")
            return False
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    def _supabase_fetch_nodes(self) -> List[Dict[str, Any]]:
        creds = _load_creds()
        if not creds:
            return []
        url = f"{creds['supabase_url'].rstrip('/')}/rest/v1/{SUPABASE_TABLE}?select=*&updated_at=gte.{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - DEAD_AFTER_S))}"
        cmd = [
            _curl_bin(), "-sS", "-m", "15", "--tlsv1.2", url,
            "-H", f"apikey: {creds.get('service_role_key', '')}",
            "-H", f"Authorization: Bearer {creds.get('service_role_key', '')}",
        ]
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
            data = json.loads(proc.stdout or "[]")
            return data if isinstance(data, list) else []
        except Exception as e:
            logger.debug(f"🕸️ [MESH] fetch nodos Supabase falló: {e}")
            return []

    # ------------------------------------------------------------------
    # Registro / heartbeat de peers
    # ------------------------------------------------------------------
    def register_node(self, info: Dict[str, Any]) -> Dict[str, Any]:
        """Registra o actualiza un nodo (propio o remoto). Nunca lanza."""
        try:
            nid = info.get("node_id") or str(uuid.uuid4())
            prev = self.nodes.get(nid, {})
            node = {
                "node_id": nid,
                "hostname": info.get("hostname") or prev.get("hostname") or "desconocido",
                "hardware": info.get("hardware") or prev.get("hardware") or {},
                "capabilities": info.get("capabilities") or prev.get("capabilities") or {},
                "url_local": info.get("url_local") or prev.get("url_local"),
                "url_publica": info.get("url_publica") or prev.get("url_publica"),
                "last_heartbeat": time.time(),
                "status": "active",
            }
            self.nodes[nid] = node
            self._save_nodes()
            if nid == self.node_id:
                # Upsert a Supabase en background SOLO si hay loop corriendo
                # (desde contexto sync puro, se hará en el próximo heartbeat).
                try:
                    asyncio.get_running_loop()
                    asyncio.ensure_future(asyncio.to_thread(self._supabase_upsert_node, dict(node)))
                except RuntimeError:
                    pass
            self.rebalance_shards()
            return node
        except Exception as e:
            logger.warning(f"🕸️ [MESH] register_node error: {e}")
            return {"node_id": info.get("node_id"), "status": "error"}

    def receive_heartbeat(self, info: Dict[str, Any]) -> Dict[str, Any]:
        return self.register_node(info)

    def update_statuses(self):
        """Marca stale/dead según antigüedad del heartbeat."""
        now = time.time()
        for n in self.nodes.values():
            age = now - n.get("last_heartbeat", 0)
            if age > DEAD_AFTER_S:
                n["status"] = "dead"
            elif age > STALE_AFTER_S:
                n["status"] = "stale"
            else:
                n["status"] = "active"

    # ------------------------------------------------------------------
    # Descubrimiento
    # ------------------------------------------------------------------
    def discover_remote_nodes(self) -> int:
        """Fusiona nodos vistos en Supabase. Devuelve nº de nodos conocidos."""
        try:
            for raw in self._supabase_fetch_nodes():
                nid = raw.get("node_id")
                if not nid or nid == self.node_id:
                    continue
                ts = raw.get("updated_at")
                hb = time.time()
                if isinstance(ts, str):
                    try:
                        import calendar
                        hb = calendar.timegm(time.strptime(ts.replace("Z", ""), "%Y-%m-%dT%H:%M:%S"))
                    except Exception:
                        pass
                existing = self.nodes.get(nid)
                # No degradar un heartbeat local más reciente
                if existing and existing.get("last_heartbeat", 0) >= hb:
                    continue
                raw["last_heartbeat"] = hb
                self.nodes[nid] = raw
            self.update_statuses()
            self._save_nodes()
        except Exception as e:
            logger.debug(f"🕸️ [MESH] descubrimiento remoto falló: {e}")
        return len(self.nodes)

    async def lan_broadcast_probe(self) -> int:
        """Sondeo HTTP best-effort del /24 local buscando /api/mesh/ping."""
        found = 0
        ip = _local_ip()
        if not ip:
            return 0
        prefix = ".".join(ip.split(".")[:3])

        async def probe(last_octet: int):
            nonlocal found
            target = f"{prefix}.{last_octet}"
            try:
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(target, 8000), timeout=LAN_PING_TIMEOUT_S
                )
                writer.close()
                try:
                    import urllib.request
                    loop = asyncio.get_running_loop()
                    resp = await loop.run_in_executor(
                        None,
                        lambda: urllib.request.urlopen(
                            f"http://{target}:8000/api/mesh/ping", timeout=1.5
                        ).read(),
                    )
                    ping = json.loads(resp)
                    if isinstance(ping, dict) and ping.get("node_id"):
                        if ping["node_id"] != self.node_id and ping["node_id"] not in self.nodes:
                            self.nodes[ping["node_id"]] = {
                                "node_id": ping["node_id"],
                                "hostname": ping.get("hostname"),
                                "hardware": ping.get("hardware") or {},
                                "capabilities": ping.get("capabilities") or {},
                                "url_local": f"http://{target}:8000",
                                "url_publica": None,
                                "last_heartbeat": time.time(),
                                "status": "active",
                            }
                            found += 1
                except Exception:
                    pass
            except Exception:
                pass

        # Por lotes para no bloquear: 32 sondas concurrentes máx
        for start in range(1, 255, 32):
            await asyncio.gather(*[probe(i) for i in range(start, min(start + 32, 255))])
        if found:
            self._save_nodes()
            self.rebalance_shards()
        return found

    # ------------------------------------------------------------------
    # Sharding 1.58-bit
    # ------------------------------------------------------------------
    NUM_CAPAS_MODELO = 28  # placeholder razonable para un modelo 1.58b pequeño

    def active_capable_nodes(self, model: str = "bitnet-1.58b") -> List[Dict[str, Any]]:
        self.update_statuses()
        out = []
        for n in self.nodes.values():
            caps = n.get("capabilities") or {}
            if n.get("status") == "active" and caps.get("puede_inferir"):
                modelos = caps.get("modelos_disponibles") or []
                if not modelos or model in modelos:
                    out.append(n)
        return out

    def rebalance_shards(self, model: str = "bitnet-1.58b") -> List[Dict[str, Any]]:
        """Divide las capas en shards entre nodos capaces, asignación
        determinista por hash(node_id+modelo)."""
        nodes = self.active_capable_nodes(model)
        if len(nodes) < 2:
            self._shards = []
            self._shard_model = model
            return []
        total = self.NUM_CAPAS_MODELO
        k = len(nodes)

        # Orden determinista por hash(node_id+modelo)
        ranked = sorted(nodes, key=lambda n: hashlib.sha256(f"{n['node_id']}:{model}".encode()).hexdigest())
        base, extra = divmod(total, k)
        shards = []
        capa = 0
        for i, n in enumerate(ranked):
            size = base + (1 if i < extra else 0)
            inicio, fin = capa, capa + size - 1
            capa += size
            shard_hash = hashlib.sha256(f"{n['node_id']}:{model}:{inicio}:{fin}".encode()).hexdigest()[:16]
            shards.append({
                "shard_id": f"{model}-s{i}",
                "node_id": n["node_id"],
                "capas": [inicio, fin],
                "hash": shard_hash,
            })
        self._shards = shards
        self._shard_model = model
        return shards

    # ------------------------------------------------------------------
    # Routing de inferencia
    # ------------------------------------------------------------------
    async def route_inference(self, prompt: str, system_prompt: str = "",
                              preferences: Optional[Dict] = None):
        """
        Decide cómo servir una inferencia. YIELDA strings (tokens o chunks).

        Estrategia honesta:
          - >=2 nodos capaces => intento pipeline distribuido secuencial
            (POST /api/mesh/infer_shard a cada nodo con sus capas). Si algún
            shard falla => fallback completo a bitnet_engine local.
          - <2 nodos => inferencia local directa (bitnet_engine).
        Nunca lanza excepción al caller.
        """
        preferences = preferences or {}
        participants: List[str] = [self.node_id]
        shards = self.rebalance_shards()
        distributed = False
        if len(shards) >= 2:
            try:
                distributed = await self._distributed_pipeline(prompt, system_prompt, shards)
            except Exception as e:
                logger.warning(f"🕸️ [MESH] pipeline distribuido falló ({e}); fallback local.")
                distributed = False
        if distributed:
            yield "__MESH_META__" + json.dumps({"nodes": participants, "mode": "distributed"})
            return
        # ---- Fallback / modo local SIEMPRE disponible ----
        # Import perezoso y tolerante: si el motor no está disponible
        # (entorno de prueba sin paquete), devolvemos error honesto en el stream.
        try:
            from ..engine.bitnet_engine import bitnet_engine
        except ImportError:
            yield "[mesh] bitnet_engine no disponible en este entorno"
            return
        meta = {}
        try:
            async for tok in bitnet_engine.generate_stream(
                prompt=prompt, system_prompt=system_prompt,
                max_tokens=int(preferences.get("max_tokens", 2048)),
                temperature=float(preferences.get("temperature", 0.75)),
                priority=preferences.get("priority", "interactive"),
                meta=meta,
            ):
                yield tok
        except Exception as e:
            logger.error(f"🕸️ [MESH] incluso el motor local falló: {e}")
            yield f"[mesh] error de inferencia local: {e}"

    async def _distributed_pipeline(self, prompt: str, system_prompt: str,
                                    shards: List[Dict[str, Any]]) -> bool:
        """Pipeline secuencial por shards vía HTTP. True si TODO tuvo éxito.
        Cada nodo debe exponer POST /api/mesh/infer_shard (contraste honesto:
        hoy solo este backend lo implementaría parcialmente)."""
        import urllib.request

        carry = prompt
        for shard in shards:
            node = self.nodes.get(shard["node_id"]) or (
                self.get_self() if shard["node_id"] == self.node_id else None)
            if not node or not node.get("url_local"):
                return False
            body = json.dumps({
                "prompt": carry,
                "system_prompt": system_prompt,
                "capas": shard["capas"],
                "shard_id": shard["shard_id"],
            }).encode("utf-8")
            req = urllib.request.Request(
                f"{node['url_local'].rstrip('/')}/api/mesh/infer_shard",
                data=body, headers={"Content-Type": "application/json"})
            loop = asyncio.get_running_loop()

            def do_post():
                with urllib.request.urlopen(req, timeout=30) as resp:
                    return json.loads(resp.read())

            try:
                out = await asyncio.wait_for(loop.run_in_executor(None, do_post), timeout=35)
                carry = out.get("hidden_state_text") or out.get("response") or carry
            except Exception as e:
                logger.debug(f"🕸️ [MESH] shard {shard['shard_id']} falló: {e}")
                return False
        return True

    async def infer_shard_stub(self, prompt: str, capas: List[int], shard_id: str) -> Dict[str, Any]:
        """Endpoint interno que un peer llamaría para SU shard en ESTE nodo.
        Implementación honesta: ejecuta una pasada local ligera y devuelve el
        texto; NO manipula tensores de capas reales (placeholder documentado)."""
        from ..engine.bitnet_engine import bitnet_engine
        chunks = []
        meta = {}
        try:
            async for tok in bitnet_engine.generate_stream(
                prompt=prompt, system_prompt=f"[shard {capas[0]}-{capas[1]}]",
                max_tokens=256, meta=meta,
            ):
                chunks.append(tok)
        except Exception as e:
            return {"ok": False, "error": str(e)}
        return {"ok": True, "shard_id": shard_id, "capas": capas,
                "hidden_state_text": "".join(chunks)}

    # ------------------------------------------------------------------
    # Aprendizaje federado (deltas ternarios)
    # ------------------------------------------------------------------
    def collect_federated_delta(self, node_id: str, delta: Dict[str, Any]) -> Dict[str, Any]:
        """Almacena un delta ternario comprimido de un nodo.
        Formato esperado: {"weights": {"<nombre_capa>": [[i, v], ...]}, "n_peso": N}
        donde v ∈ {-1, 0, +1}. PRIVACIDAD: nunca datos crudos, solo deltas."""
        try:
            entry = {
                "node_id": node_id,
                "ts": time.time(),
                "weights": delta.get("weights", {}),
                "num_weights": delta.get("num_weights", sum(len(v) for v in delta.get("weights", {}).values())),
            }
            self.federated_deltas.append(entry)
            self._save_deltas()
            resumen = {
                "node_id": self.node_id,
                "deltas_recibidos": len(self.federated_deltas),
                "ultimo_de": node_id,
                "ultimo_ts": entry["ts"],
                "total_pesos_delta": entry["num_weights"],
            }
            self._supabase_upsert_federado(resumen)
            return {"ok": True, "deltas_almacenados": len(self.federated_deltas)}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def _supabase_upsert_federado(self, resumen: Dict[str, Any]):
        """Upsert best-effort del RESUMEN (nunca los deltas completos)."""
        try:
            row = {
                "node_id": f"federated-{resumen['node_id']}",
                "hostname": self.hostname,
                "hardware": {},
                "capabilities": {"federated_summary": resumen},
                "url_local": None,
                "url_publica": None,
                "last_heartbeat": time.time(),
                "status": "active",
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            self._supabase_upsert_node(row)
        except Exception as e:
            logger.debug(f"🕸️ [MESH] upsert federado falló: {e}")

    def apply_federated_updates(self) -> Dict[str, Any]:
        """Agrega todos los deltas por MAYORÍA DE VOTOS por peso y produce
        un nuevo delta agregado (formato igual al de entrada).
        Solo participan deltas de las últimas 24h. Nunca lanza."""
        try:
            cutoff = time.time() - 86400
            votes: Dict[str, Dict[Any, int]] = {}
            used = 0
            for d in self.federated_deltas:
                if d.get("ts", 0) < cutoff:
                    continue
                used += 1
                for capa, pares in (d.get("weights") or {}).items():
                    layer_votes = votes.setdefault(capa, {})
                    if isinstance(pairs_list := pares, list):
                        for par in pairs_list:
                            idx, val = par[0], par[1]
                            if val in (-1, 0, 1):
                                layer_votes[idx] = layer_votes.get(idx, 0) + (1 if val > 0 else -1 if val < 0 else 0)
                        # Nota honesta: votos 0 no se cuentan como empate real,
                        # solo como abstención (peso 0 = sin actualización).
            aggregated: Dict[str, List[List[int]]] = {}
            for capa, layer_votes in votes.items():
                agg = []
                for idx, score in sorted(layer_votes.items(), key=lambda kv: str(kv[0])):
                    if score > 0:
                        agg.append([idx, 1])
                    elif score < 0:
                        agg.append([idx, -1])
                if agg:
                    aggregated[capa] = agg
            result_delta = {"weights": aggregated, "num_weights": sum(len(v) for v in aggregated.values())}
            if aggregated:
                self.federated_deltas.append({
                    "node_id": "aggregated",
                    "ts": time.time(),
                    "weights": aggregated,
                    "num_weights": result_delta["num_weights"],
                })
                self._save_deltas()
            return {"ok": True, "deltas_agregados": used, "delta": result_delta}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def federated_status(self) -> Dict[str, Any]:
        recent = [d for d in self.federated_deltas if d.get("ts", 0) > time.time() - 86400]
        return {
            "enabled": True,
            "deltas_totales": len(self.federated_deltas),
            "deltas_ultimas_24h": len(recent),
            "nodos_contribuyentes": sorted({d.get("node_id") for d in recent}),
            "privacidad": "solo deltas ternarios {-1,0,+1}; ningún dato local sale del dispositivo",
        }

    # ------------------------------------------------------------------
    # Estado serializable
    # ------------------------------------------------------------------
    def get_status(self) -> Dict[str, Any]:
        try:
            self.update_statuses()
            by_status = {"active": 0, "stale": 0, "dead": 0}
            for n in self.nodes.values():
                by_status[n.get("status", "dead")] = by_status.get(n.get("status", "dead"), 0) + 1
            return {
                "node_id": self.node_id,
                "hostname": self.hostname,
                "started": self.started,
                "heartbeat_interval_s": HEARTBEAT_INTERVAL_S,
                "supabase": _load_creds() is not None,
                "nodes_total": len(self.nodes),
                "nodes_by_status": by_status,
                "nodes": list(self.nodes.values()),
                "shards": self._shards,
                "sharding_model": self._shard_model,
                "federated": self.federated_status(),
            }
        except Exception as e:
            return {"error": str(e), "node_id": getattr(self, "node_id", None)}

    # ------------------------------------------------------------------
    # Loops de fondo
    # ------------------------------------------------------------------
    def start(self):
        """Idempotente: arranca heartbeat loop + descubrimiento periódico."""
        if self.started:
            return
        self.started = True
        self.register_node(self.get_self())
        self._hb_task = asyncio.ensure_future(self._heartbeat_loop())
        self._lan_task = asyncio.ensure_future(self._discovery_loop())
        logger.info(f"🕸️ [MESH] iniciado como {self.node_id} ({self.hostname})")

    async def _heartbeat_loop(self):
        while True:
            try:
                await asyncio.sleep(HEARTBEAT_INTERVAL_S)
                me = self.get_self()
                self.register_node(me)  # guarda localmente
                await asyncio.to_thread(self._supabase_upsert_node, me)
                # Heartbeat HTTP a peers activos conocidos
                self.update_statuses()
                for n in list(self.nodes.values()):
                    if n["node_id"] == self.node_id or n.get("status") != "active":
                        continue
                    url = n.get("url_local") or n.get("url_publica")
                    if not url:
                        continue
                    try:
                        import urllib.request
                        body = json.dumps(me).encode("utf-8")

                        def beat(u=url.rstrip("/"), b=body):
                            req = urllib.request.Request(f"{u}/api/mesh/heartbeat",
                                                         data=b, headers={"Content-Type": "application/json"})
                            return urllib.request.urlopen(req, timeout=5).read()

                        await asyncio.get_running_loop().run_in_executor(None, beat)
                    except Exception:
                        pass
            except asyncio.CancelledError:
                return
            except Exception as e:
                logger.debug(f"🕸️ [MESH] heartbeat loop error: {e}")

    async def _discovery_loop(self):
        while True:
            try:
                await asyncio.sleep(120)
                await asyncio.to_thread(self.discover_remote_nodes)
                await self.lan_broadcast_probe()
                # Rebalanceo automático cuando cambia el conjunto activo
                self.rebalance_shards()
            except asyncio.CancelledError:
                return
            except Exception as e:
                logger.debug(f"🕸️ [MESH] discovery loop error: {e}")


# Singleton global
mesh_network = MeshNetwork()
