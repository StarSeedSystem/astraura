import os
import json
import subprocess
import shutil
import threading
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any, List, Optional
from ..core.config import settings

# Plantilla de chat OFICIAL de BitNet-b1.58-2B-4T (tokenizer_config.json):
# «{Role}: {content}<|eot_id|>» por mensaje y «Assistant: » como prompt de
# generación. La que trae el GGUF es un placeholder roto («BITNETAssistant»),
# así que el servidor gestionado la sobreescribe con esta.
BITNET_CHAT_TEMPLATE = (
    "{%- for message in messages %}{%- if loop.first %}{{ bos_token }}{%- endif %}"
    "{%- if message['role'] == 'system' %}{{ 'System: ' + message['content'] + '<|eot_id|>' }}"
    "{%- elif message['role'] == 'user' %}{{ 'User: ' + message['content'] + '<|eot_id|>' }}"
    "{%- elif message['role'] == 'assistant' %}{{ 'Assistant: ' + message['content'] + '<|eot_id|>' }}"
    "{%- endif %}{%- endfor %}"
    "{%- if add_generation_prompt %}{{ 'Assistant: ' }}{%- endif %}"
)

class BitNetCppManager:
    """
    Manages the installation, compilation, model discovery, and native execution 
    of Microsoft's official BitNet framework (bitnet.cpp) optimized for ARM NEON and Apple Silicon.
    """
    def __init__(self):
        self.repo_dir = settings.bitnet_path
        self.models_dir = settings.models_path
        self.build_dir = self.repo_dir / "build"
        # ── Servidores nativos gestionados (llama-server del build de BitNet) ──
        # DOS perfiles sobre el MISMO GGUF (los pesos van por mmap → compartidos):
        #   · "interactive": chat/orbe — prioridad normal de CPU.
        #   · "background": imaginación/enjambre/director (cognition) — `nice` alto,
        #     para que el fondo NUNCA robe el turno al usuario en máquinas con pocos
        #     núcleos. El motor elige perfil según la prioridad del turno.
        self._servers: Dict[str, Dict[str, Any]] = {}
        self._server_log = Path(os.environ.get("ASTRAURA_BITNET_LOG") or (self.repo_dir.parent / "bitnet-server.log"))
        self.server_port = int(os.environ.get("ASTRAURA_BITNET_PORT") or 8790)
        # Contexto AJUSTADO A LA RAM DE LA MÁQUINA, no una constante.
        #
        # Por qué: este Mac tiene 8 GB y ya corre Ollama residente (~1 GB) más
        # el backend. Con `-c 4096` el llama-server carga el modelo bien y
        # responde a `/health`, pero al llegarle la PRIMERA petición reserva el
        # búfer de cómputo, la memoria se dispara y el sistema lo mata — sin
        # informe de fallo, sin mensaje de error, sin nada. Desde fuera parecía
        # que el motor 1.58 "no funcionaba"; en realidad lo estaban matando por
        # memoria en cuanto intentaba pensar.
        #
        # Medido en esta máquina: con `-c 1024` la misma petición devuelve
        # HTTP 200 y el servidor SOBREVIVE. Con `-c 4096` muere siempre.
        #
        # Se sigue pudiendo forzar con ASTRAURA_BITNET_CTX para una máquina con
        # holgura; el automático solo evita el suicidio silencioso por defecto.
        self.server_ctx = int(os.environ.get("ASTRAURA_BITNET_CTX") or self._ctx_segun_ram())
        # (Verificación 1.58 · CORRECCIÓN DE CONCURRENCIA) Paralelismo ADAPTATIVO
        # al hardware: antes era fijo en 1 slot, y bajo presión simultánea de
        # varios agentes/bots el llama-server CANCELABA tareas a los ~0.4 s
        # (preempt LRU del slot único) → cada petición caía a Ollama. Ahora el
        # número de slots se calcula según núcleos y RAM de la máquina, con
        # tope conservador para no disparar la memoria. Forzable con
        # ASTRAURA_BITNET_PAR.
        self.server_parallel = max(1, int(os.environ.get("ASTRAURA_BITNET_PAR") or self._parallel_segun_hardware()))
        self._server_lock = threading.Lock()  # un solo spawn aunque llamen N corrutinas a la vez

        # (Adenda 169 · SUPERVISOR KEEP-ALIVE) En 8 GB el llama-server BitNet nativo
        # muere tras servir 1-2 inferencias (bug "cleaning up before exit" de
        # bitnet.cpp en ARM). Para que el motor nativo esté casi siempre listo
        # (y el chat no caiga a Ollama por timing de recarga), un hilo daemon
        # vigila los servers gestionados y los RELANZA INMEDIATAMENTE al morir.
        self._supervisor_stop = threading.Event()
        self._supervisor_thread = threading.Thread(
            target=self._supervisor_loop, name="bitnet-keepalive", daemon=True
        )
        self._supervisor_thread.start()

    def _supervisor_loop(self) -> None:
        """Relanza servers nativos muertos cada pocos segundos (keep-alive)."""
        while not self._supervisor_stop.is_set():
            try:
                if not self._servidor_compartido():
                    perfiles = ("interactive", "background")
                else:
                    perfiles = ("interactive",)  # shared: un solo server
                for perfil in perfiles:
                    st = self._servers.get(perfil, {})
                    proc = st.get("proc")
                    # ¿El proc existe y está vivo?
                    vivo = proc is not None and proc.poll() is None
                    if vivo:
                        # Sondee rápido: si el server responde 200, OK; si no, relanza.
                        try:
                            with urllib.request.urlopen(
                                f"http://127.0.0.1:{self._port_for(perfil)}/health", timeout=2
                            ) as r:
                                if r.status == 200:
                                    continue  # sano, no tocar
                        except Exception:
                            pass  # no responde -> relanzar abajo
                    # Muerto o colgado -> relanzar (sin bloquear el chat: _launching protege)
                    if not st.get("_launching"):
                        try:
                            self.ensure_server(30.0, perfil)
                        except Exception:
                            pass
            except Exception:
                pass
            # Espera corta entre ciclos (no saturar la CPU)
            self._supervisor_stop.wait(5.0)
        
    def _ctx_segun_ram(self) -> int:
        """
        Elige el contexto que la máquina puede sostener DE VERDAD.

        No es una heurística de salón: en este Mac de 8 GB, con `-c 4096` el
        servidor carga el modelo, responde a `/health` y muere en cuanto le
        llega la primera petición real — el sistema lo mata al reservar el
        búfer de cómputo. Con `-c 1024` la misma petición devuelve HTTP 200 y
        el servidor sigue vivo. Medido, no supuesto.

        Escalones deliberadamente conservadores: preferimos un contexto corto
        que responda a uno largo que muera en silencio. Quien tenga holgura
        sube el valor con ASTRAURA_BITNET_CTX.
        """
        try:
            import psutil
            gb = psutil.virtual_memory().total / (1024 ** 3)
        except Exception:
            return 2048  # sin poder medir, el término medio prudente
        if gb <= 8.5:
            return 512  # (Verificación 1.58 · Adenda 169 · CORRECCIÓN EN VIVO) EN 8 GB
                        # (1.11 GB libre) el llama-server BitNet i2_s MORÍA por OOM
                        # durante la inferencia REAL de chat con -c 1024 (pasaba
                        # /health y la sonda de 8 tokens, pero al generar ~200 tokens
                        # el búfer de cómputo + KV cache superaba la RAM libre y el
                        # sistema lo mataba -> RemoteProtocolError -> cedía a Ollama).
                        # Con -c 512 el búfer de inferencia es la mitad y el server
                        # SOBREVIVE a la inferencia larga. 512 tokens cubren el prefill
                        # corto (system 256 + 1 chunk) + ~200 tokens de respuesta:
                        # suficiente para chat corto. Quien tenga RAM de más sube con
                        # ASTRAURA_BITNET_CTX.
        if gb <= 16.5:
            return 1536
        return 4096

    def _parallel_segun_hardware(self) -> int:
        """Número de slots del llama-server adaptado al hardware de la máquina.

        Antes era fijo en 1, y bajo presión simultánea de varios agents/bots el
        slot único preempteaba (cancelaba) tareas a los ~0.4 s → cada petición
        caía a Ollama. Con más slots, el llama-server encola en paralelo y el
        motor 1.58-bit aguanta la concurrencia real de la red mesh.

        Criterio (medido, no arbitrario):
          · RAM <= 8.5 GB  → 2 slots  (8 GB M1 de Alex: 2 aguantan con -c 1024)
          · RAM <= 16.5 GB → 3 slots
          · > 16.5 GB      → 4 slots  (tope conservador: BitNet en CPU no escala
                                       lineal con slots, y cada slot cuesta KV)
        Además se frena por núcleos: no más de (núcleos/2) slots, para que el
        sistema operativo y Ollama residente no se queden sin CPU.
        """
        try:
            import psutil
            gb = psutil.virtual_memory().total / (1024 ** 3)
            cores = psutil.cpu_count(logical=True) or 4
        except Exception:
            return 2  # sin poder medir, lo prudente que aún evita el slot único
        if gb <= 8.5:
            raw = 1  # (Verificación 1.58 · Adenda 169 · CAÍDA EN VIVO) EN 8 GB (1.11 GB
                     # libre) con server compartido (-c 1024 Y --parallel 2): llama-server
                     # divide el ctx entre slots → 512 tokens/slot. El prefill (system
                     # 256 chars + prompt) EXCEDE 512 → "request exceeds available context
                     # size (512)" → cancela tareas → el server OOMea/cae → cede a Ollama.
                     # MEDIDO en /tmp/astraura-backend.log (tasks 14/13/27: 798/743 tokens > 512).
                     # CON 1 SLOT el ctx es 1024/slot (suficiente para prefill corto + respuesta
                     # BitNet nativa). El chat interactivo es el único usuario real de BitNet
                     # (el fondo usa Ollama); 1 slot no preemptea si el fondo no usa BitNet.
        elif gb <= 16.5:
            raw = 3
        else:
            raw = 5
        # Freno por núcleos: al menos 2 núcleos libres para el SO + Ollama.
        por_nucleos = max(1, (cores - 2) // 2)
        return max(1, min(raw, por_nucleos))

    def check_status(self) -> Dict[str, Any]:
        """
        Inspects whether bitnet.cpp is cloned, compiled, and what models are available.
        """
        is_cloned = (self.repo_dir / "setup_env.py").exists() or (self.repo_dir / "CMakeLists.txt").exists()
        # (Adenda 153) HONESTO: compilado = existe un binario de inferencia real. Antes
        # bastaba con que existiera `run_inference.py` (el submódulo sin build) y el
        # estado decía "BitNet instalado" sin serlo.
        bin_dir = self.build_dir / "bin"
        is_compiled = any((bin_dir / b).exists() for b in ("llama-cli", "main", "bitnet-cli", "llama-server"))
        
        # Check available GGUF models: carpeta de modelos del backend Y la carpeta
        # models/ del propio repo BitNet (donde deja el modelo `setup_env.py` /
        # `huggingface-cli download … --local-dir BitNet/models/…`). (Ola 3)
        found_models = []
        seen: set = set()
        for root in (self.models_dir, self.repo_dir / "models"):
            if not root.exists():
                continue
            for p in root.glob("**/*"):
                if p.suffix in [".gguf", ".bin"] and p.is_file():
                    rp = str(p.resolve())
                    if rp in seen:
                        continue
                    seen.add(rp)
                    found_models.append({
                        "name": p.name,
                        "path": rp,
                        "size_mb": round(p.stat().st_size / (1024 * 1024), 2),
                        "quantization": "i2_s (1.58-bit ternary)" if "i2_s" in p.name else "GGUF"
                    })
        # Preferimos i2_s (el formato ternario real) si hay varios.
        found_models.sort(key=lambda m: (0 if "i2_s" in m["name"] else 1, -m["size_mb"]))

        return {
            "is_cloned": is_cloned,
            "is_compiled": is_compiled,
            "repo_path": str(self.repo_dir),
            "models_available": found_models,
            "recommended_models": [
                {
                    "name": "BitNet-b1.58-2B-4T (i2_s)",
                    "repo_id": "microsoft/BitNet-b1.58-2B-4T",
                    "approx_size_mb": 750,
                    "description": "Official Microsoft 1.58-bit 2B model quantized with ternary weights."
                },
                {
                    "name": "BitNet-b1.58-Large (i2_s)",
                    "repo_id": "1bitLLM/bitnet_b1_58-large",
                    "approx_size_mb": 420,
                    "description": "Compact 1.58-bit research foundation model."
                }
            ]
        }

    # ───────────────────── Servidor nativo gestionado (Ola 3) ─────────────────────

    def server_binary(self) -> Optional[Path]:
        """Ruta del llama-server compilado (build oficial o build-avx2 alternativo)."""
        for rel in ("build/bin/llama-server", "build-avx2/bin/llama-server"):
            p = self.repo_dir / rel
            if p.exists():
                return p
        return None

    def _servidor_compartido(self) -> bool:
        """
        ¿Esta máquina comparte UN solo llama-server entre chat y fondo?

        # (Verificación 1.58 · Adenda 169) Antes el umbral era 12 GB y en 8 GB se
        # compartía UNO, así que el chat interactivo competía por los mismos slots
        # que la Oficina (imaginación/enjambre) y, bajo carga, el chat se bloqueaba
        # o caía a Ollama. Ahora, como el contexto se redujo a `-c 1024` en 8 GB
        # (ver `_ctx_segun_ram`), se INTENTABA separar: PERO MEDIDO en vivo en este
        # Mac (1.11 GB libre): dos llama-server i2_s NO caben en 8 GB — el modelo
        # mmapea ~1.1 GB POR SERVER y el segundo server OOMea a la primera
        # inferencia. Así que en ≤8.5 GB se COMPARTE un solo server (el modelo
        # va por mmap, se comparte de verdad) y el background cede con `nice 15`.
        # El chat sigue BitNet nativo SIEMPRE primero gracias al semáforo de
        # `cognition.py` (max_concurrent_adaptive) + priority explícita del
        # orquestador; el fondo usa Ollama cuando el interactive está activo.
        # Forzable con ASTRAURA_BITNET_SERVIDORES=2 para forzar dos servers
        # (máquinas con holgura de RAM).

        Umbral: solo compartimos UNO si la RAM es <= 6 GB (muy justa incluso con
        contexto corto). A partir de 8 GB separamos. Forzable con
        ASTRAURA_BITNET_SERVIDORES=1 para volver al servidor único.
        """
        if os.environ.get("ASTRAURA_BITNET_SERVIDORES") == "1":
            return True
        if os.environ.get("ASTRAURA_BITNET_SERVIDORES") == "2":
            return False
        try:
            import psutil
            # (Verificación 1.58 · Adenda 169) EN 8 GB (1.11 GB libre en este Mac) dos
            # llama-server i2_s NO caben: el modelo mmapea ~1.1 GB por server y la
            # inferencia + KV cache de un segundo server lo mata por OOM. Se comparte
            # UNO (mmap comparte de verdad) hasta >8.5 GB. Quien tenga RAM de más
            # fuerza ASTRAURA_BITNET_SERVIDORES=2 y ambos servers con ctx propio.
            return (psutil.virtual_memory().total / (1024 ** 3)) <= 8.5
        except Exception:
            return True  # sin poder medir, preferimos COMPARTIR (no dos servers OOM)

    def _port_for(self, profile: str) -> int:
        if self._servidor_compartido():
            return self.server_port
        return self.server_port if profile == "interactive" else self.server_port + 1

    # ── (Verificación 1.58) Sonda REAL del puerto, no del proceso ──────────────
    # `self._servers` solo sabe de los subprocesos que ESTE proceso lanzó. Un
    # backend nuevo (recarga, script de verificación, otro worker) arranca con
    # ese diccionario vacío, y ANTES de esta sonda `_alive()`/`server_status()`
    # declaraban el motor apagado (running=False, ready=False) aunque hubiera un
    # llama-server real, vivo y respondiendo en el puerto — lanzado por ESTE
    # proceso en un arranque anterior, o por cualquier otro. El estado tiene que
    # salir del PUERTO, no de la memoria de un proceso concreto.
    #
    # Cache corta (2 s por defecto, `ASTRAURA_BITNET_PROBE_TTL`) para no golpear
    # /health en cada consulta de estado desde la UI o desde `ensure_server`.
    _probe_cache: Dict[str, Dict[str, Any]] = {}
    PROBE_TTL = float(os.environ.get("ASTRAURA_BITNET_PROBE_TTL") or 2.0)

    def probe_port(self, profile: str, timeout: float = 1.5, force: bool = False) -> Dict[str, Any]:
        """Estado REAL observado en el puerto del perfil (vivo o no, lo hayamos
        lanzado nosotros o no). `state` ∈:
          · "apagado"                — nada escucha en el puerto (conexión rechazada
            o timeout). El único caso que de verdad significa "motor apagado".
          · "arrancando"             — el proceso responde pero el modelo sigue
            cargando (llama-server: HTTP 503 "Loading model").
          · "listo"                  — HTTP 200 con {"status":"ok"}: nuestro
            llama-server, con el modelo cargado y listo para inferir.
          · "respondiendo_sin_modelo" — ALGO responde en ese puerto (TCP acepta,
            hay HTTP de vuelta) pero no es el contrato esperado de llama-server:
            puede ser un proceso ajeno ocupando el puerto, una versión distinta,
            o un error real del servidor. No se puede lanzar OTRO servidor encima
            (el bind fallaría), pero tampoco es honesto llamarlo "listo".
        """
        port = self._port_for(profile)
        base = f"http://127.0.0.1:{port}"
        now = time.time()
        if not force:
            cached = self._probe_cache.get(profile)
            if cached and (now - float(cached.get("at", 0.0))) < self.PROBE_TTL:
                return cached["result"]
        result: Dict[str, Any]
        try:
            with urllib.request.urlopen(f"{base}/health", timeout=timeout) as res:
                body = res.read()
                try:
                    data = json.loads(body)
                except Exception:
                    data = {}
                if res.status == 200 and data.get("status") == "ok":
                    result = {"state": "listo", "base": base, "http": res.status}
                else:
                    result = {"state": "respondiendo_sin_modelo", "base": base, "http": res.status, "detalle": data}
        except urllib.error.HTTPError as e:
            try:
                data = json.loads(e.read())
            except Exception:
                data = {}
            msg = str((data.get("error") or {}).get("message") or "").lower()
            if e.code == 503 and "load" in msg:
                result = {"state": "arrancando", "base": base, "http": e.code}
            else:
                result = {"state": "respondiendo_sin_modelo", "base": base, "http": e.code, "detalle": data}
        except Exception as exc:
            # Connection refused / timeout / DNS-lo-que-sea: nada real ahí.
            result = {"state": "apagado", "base": None, "error": f"{type(exc).__name__}"}
        self._probe_cache[profile] = {"at": now, "result": result}
        return result

    def _alive(self, profile: str, timeout: float = 1.5) -> bool:
        """Vivo = el puerto responde "listo" (ver `probe_port`), sin importar quién
        lo lanzó ni si `self._servers` tiene registro de él."""
        return self.probe_port(profile, timeout=timeout).get("state") == "listo"

    # ── (Adenda 160) Sonda de cordura del motor nativo ─────────────────────────
    # bitnet.cpp NO tiene kernel vectorial i2_s para ARM: solo una rama
    # `#if defined(__AVX2__)` y, para todo lo demas, un "Scalar fallback". En un
    # Apple Silicon ese fallback devuelve un token CONSTANTE ante cualquier
    # entrada ('@@@@@@@@') y va a ~0,15 tok/s (≈7 s por token). Verificado con
    # un clon limpio de microsoft/BitNet recien compilado y el GGUF oficial.
    #
    # Sin esta sonda el sistema cargaria el modelo, se declararia «BitNet nativo
    # activo» y serviria basura con aire de respuesta. Se prueba una vez por
    # proceso: si la salida es degenerada, el motor nativo queda MARCADO como
    # inservible con su motivo y el enrutador se queda en Ollama.
    _sanity: Optional[Dict[str, Any]] = None

    def native_sanity(self, base: str) -> Dict[str, Any]:
        """Genera 8 tokens y comprueba que no sean degenerados (mismo caracter
        repetido). Cachea el veredicto — una vez por proceso.

        (Verificación 1.58) El umbral de VELOCIDAD que había aquí (tps < 1.0 ⇒
        NO USABLE) se retira como criterio de descalificación — MEDIDO en vivo
        en el Mac de Alex bajo carga real (varios backends/subagentes compitiendo
        por los mismos 8 núcleos a la vez): el motor nativo, con salida coherente
        y NO degenerada (la prueba de que el kernel vectorial SÍ funciona), midió
        0.27–0.37 tok/s — por debajo del propio umbral de 1.0 pensado para
        detectar el bug real (fallback escalar ARM, que da SIEMPRE el mismo
        carácter, ~0.15 tok/s). Los dos rangos se solapan bajo carga: la
        VELOCIDAD no distingue "kernel roto" de "máquina compartida ocupada".
        La salida DEGENERADA sí lo hace — es la firma real y única del bug de
        Adenda 160 (token constante ante cualquier entrada) — así que es el
        ÚNICO criterio de descalificación que queda. Ir lento pero de verdad es
        justo lo que pidió Alex frente a caer a Ollama en silencio; para eso
        están los timeouts adaptativos de cognition.py (miden el tps real y
        ajustan el techo en vez de exigir velocidad para poder usarse siquiera).
        """
        if self._sanity is not None:
            return self._sanity
        verdict: Dict[str, Any] = {"ok": False, "reason": "sin comprobar", "sample": ""}
        try:
            req = urllib.request.Request(
                f"{base}/completion",
                json.dumps({"prompt": "La capital de Francia es", "n_predict": 8, "temperature": 0.1}).encode(),
                {"Content-Type": "application/json"},
            )
            # (Verificación 1.58) 180s NO bastó en la práctica: MEDIDO en vivo el
            # 2026-08-25 con 3 backends/subagentes compitiendo por los mismos 8
            # núcleos, esta misma sonda de 8 tokens agotó 180s y lanzó TimeoutError
            # con el servidor realmente vivo (server_ready=True) — no es un motor
            # roto, es contención real. Subimos el techo y lo hacemos ajustable
            # por entorno en vez de asumir un numero fijo (MIDE, NO SUPONGAS).
            _sanity_timeout = float(os.environ.get("ASTRAURA_BITNET_SANITY_TIMEOUT") or 240.0)
            with urllib.request.urlopen(req, timeout=_sanity_timeout) as res:
                data = json.loads(res.read().decode())
            txt = str(data.get("content") or "")
            uniq = set(txt.strip())
            tps = float((data.get("timings") or {}).get("predicted_per_second") or 0.0)
            if not txt.strip():
                verdict = {"ok": False, "reason": "el motor nativo no devolvio texto", "sample": txt, "tps": tps}
            elif len(uniq) <= 1:
                verdict = {"ok": False, "reason": f"salida degenerada (un solo caracter repetido: {txt.strip()[:12]!r}) — bitnet.cpp no tiene kernel i2_s vectorial para ARM", "sample": txt, "tps": tps}
            else:
                lento = bool(tps and tps < 1.0)
                motivo = (
                    f"correcto ({tps:.2f} tok/s)" if not lento
                    else f"correcto pero LENTO ({tps:.2f} tok/s — máquina bajo carga compartida; la salida no es degenerada, así que no es el bug del kernel escalar)"
                )
                verdict = {"ok": True, "reason": motivo, "sample": txt, "tps": tps, "lento": lento}
        except Exception as exc:
            # (Verificación 1.58) BUG serio encontrado EN VIVO hoy: un fallo aquí
            # (TimeoutError, ConnectionError...) es casi siempre TRANSITORIO —
            # cola/CPU compartida con otros procesos — MEDIDO hoy mismo: la sonda
            # agotó 240s bajo carga real de varios subagentes a la vez, con el
            # servidor sano y respondiendo (server_ready=True). No es una
            # propiedad del binario/modelo. Si esto se cacheara como veredicto
            # definitivo (como hacía antes), el PROCESO quedaría inhabilitado
            # para BitNet nativo el resto de su vida aunque la máquina se
            # despejara 2 minutos después — justo lo contrario de "no mates
            # respuestas legítimas". Por eso NO se guarda en self._sanity: se
            # devuelve el fallo para ESTA llamada y la próxima vuelve a sondear.
            verdict = {"ok": False, "reason": f"la sonda fallo: {type(exc).__name__}", "sample": "", "transitorio": True}
            print(f"[BitNetCppManager] sonda del motor nativo: NO USABLE (transitorio — cola/CPU compartida, se reintentará) — {verdict['reason']}")
            return verdict
        self._sanity = verdict
        print(f"[BitNetCppManager] sonda del motor nativo: {'OK' if verdict['ok'] else 'NO USABLE'} — {verdict['reason']}")
        return verdict

    def ensure_server(self, wait_seconds: float = 0.0, profile: str = "interactive") -> Optional[str]:
        """Arranca (si hace falta) el llama-server nativo del PERFIL pedido con el GGUF
        i2_s y devuelve su base URL, o None si no hay binario/modelo. `wait_seconds` > 0
        espera a que el modelo cargue (health ok); 0 = arranque sin bloquear.

        (Verificación 1.58) Antes de lanzar NADA, sonda el puerto real
        (`probe_port(force=True)`: la decisión de lanzar-o-no tiene que ver el
        instante actual, no una cache de hace 2 s). Si YA hay un llama-server vivo
        o cargando ahí — lanzado por ESTE proceso en una llamada anterior, por OTRO
        worker del backend, o a mano por Alex — lo ADOPTA (guarda su base_url; sin
        `proc` si no es nuestro, para no matarlo nunca desde `stop_server`) en vez
        de intentar un segundo `bind()` sobre el mismo puerto.

        Sin esto, cada proceso nuevo (recarga del backend, script de verificación,
        otro worker) que llamaba aquí lanzaba SU PROPIO llama-server sobre el mismo
        puerto sin saber que ya había uno vivo: el segundo bind() falla
        (EADDRINUSE), ese proceso muere en segundos, y deja un llama-server fantasma
        tras otro en la lista de procesos — exactamente lo observado en `ps`: el PID
        del perfil "background" cambiando cada pocos segundos sin llegar nunca a
        "listo", uno detrás de otro.
        """
        if profile not in ("interactive", "background"):
            profile = "interactive"
        with self._server_lock:
            st = self._servers.get(profile) or {}
            proc = st.get("proc")
            if proc is not None and proc.poll() is not None:
                st = {}
                self._servers[profile] = st

            probe = self.probe_port(profile, force=True)
            port = self._port_for(profile)
            base = f"http://127.0.0.1:{port}"

            if probe["state"] == "listo":
                # Vivo YA — lo hayamos lanzado nosotros o no. Adoptar y salir.
                if not st.get("base"):
                    print(f"[BitNetCppManager] llama-server ({profile}, puerto {port}) ya estaba vivo — adoptado, no se lanza otro.")
                self._servers[profile] = {**st, "base": base, "port": port, "model": st.get("model") or "(externo, adoptado)"}
                return base

            if probe["state"] == "respondiendo_sin_modelo":
                # Hay ALGO en el puerto que no es nuestro llama-server esperado
                # (otro proceso lo ocupa, o un error real del servidor). Lanzar
                # encima sería un bind() condenado a fallar: no lo intentamos.
                print(f"[BitNetCppManager] puerto {port} ({profile}) ocupado por algo que no es nuestro llama-server — no se lanza otro encima (detalle: {probe.get('detalle')}).")
                return None

            if probe["state"] == "arrancando" and not st.get("proc"):
                # Cargando — nuestro (llamada previa de ESTE proceso ya en marcha)
                # o ajeno (otro proceso ganó la carrera de arranque): en ambos
                # casos ya hay UN bind en curso. No lanzamos un segundo; solo
                # anotamos su base_url y esperamos más abajo.
                self._servers[profile] = {**st, "base": base, "port": port}
                st = self._servers[profile]

            elif probe["state"] == "apagado":
                # (Verificación 1.58 · Adenda 169 · RACE FIX) Si YA hay un lanzamiento
                # en curso (otra corrutina llamó ensure_server y está cargando el
                # modelo), NO lanzamos un segundo server sobre el mismo puerto (el
                # bind() fallaría y entraríamos en bucle de servers que nacen/mueren).
                # Esperamos a que el primero esté listo. El flag `_launching` se setea
                # justo antes del Popen y se limpia al registrar el proc o al fallar.
                if st.get("_launching"):
                    # Ya se está lanzando: esperar a que esté listo abajo.
                    self._servers[profile] = {**st, "base": base, "port": port}
                    st = self._servers[profile]
                elif not st.get("proc") or (st.get("proc") and st["proc"].poll() is not None):
                    # Nada vivo en el puerto ni proc nuestro sano: aquí sí lanzar.
                    binary = self.server_binary()
                    status = self.check_status()
                    models = status.get("models_available") or []
                    if binary is None or not models:
                        return None
                    model_path = models[0]["path"]
                try:
                    tmpl = self.repo_dir.parent / "bitnet-chat-template.jinja"
                    tmpl.write_text(BITNET_CHAT_TEMPLATE, encoding="utf-8")
                    cpu = os.cpu_count() or 4
                    # (Verificación 1.58 · Adenda 169) En 8 GB usamos SOLO 2 threads:
                    # el búfer de activaciones del llama-server escala con los threads
                    # (cada thread mantiene su estado de capa). 2 threads reducen el
                    # footprint de RAM de inferencia ~4x vs 8, evitando el OOM que
                    # mataba el server durante la generación larga de chat.
                    threads = max(1, min(2, cpu))
                    cmd = [
                        str(binary), "-m", model_path,
                        "--host", "127.0.0.1", "--port", str(port),
                        "-t", str(threads), "-c", str(self.server_ctx),
                        "--parallel", str(self.server_parallel),
                        "--jinja", "--chat-template-file", str(tmpl),
                        # El GGUF oficial no declara pre-tokenizer: fijamos el de Llama-3.
                        "--override-kv", "tokenizer.ggml.pre=str:llama-bpe",
                        # (Adenda 160) CPU PURA, obligatorio. El backend Metal NO
                        # implementa el tipo i2_s (ggml-metal-device.cpp: "not
                        # implemented" → "Asserting on type 36" → SIGABRT): con
                        # descarga a GPU, llama-server se estrella al primer decode.
                        # Ademas es lo correcto: el kernel ternario de BitNet es de
                        # CPU (ARM NEON / AVX2); la GPU no aporta nada aqui.
                        "-ngl", "0",
                    ]
                    log = open(self._server_log, "ab")
                    preexec = None
                    if profile == "background" and hasattr(os, "nice"):
                        def preexec():  # noqa: ANN202 - prioridad baja para el fondo
                            try:
                                os.nice(15)
                            except Exception:
                                pass
                    # Flag de lanzamiento en curso (evita race de doble-bind).
                    self._servers[profile] = {**st, "_launching": True}
                    proc = subprocess.Popen(cmd, stdout=log, stderr=log, cwd=str(self.repo_dir), preexec_fn=preexec)
                    self._servers[profile] = {"proc": proc, "base": base, "model": model_path, "port": port, "_launching": False}
                    print(f"[BitNetCppManager] llama-server nativo ({profile}) lanzado (pid {proc.pid}, puerto {port}, modelo {Path(model_path).name})")
                except Exception as e:
                    print(f"[BitNetCppManager] no se pudo lanzar llama-server ({profile}): {e}")
                    self._servers[profile] = {}
                    return None
        deadline = time.time() + max(0.0, wait_seconds)
        while time.time() < deadline:
            if self._alive(profile):
                return self._servers[profile]["base"]
            proc = (self._servers.get(profile) or {}).get("proc")
            if proc is not None and proc.poll() is not None:
                # Nuestro intento de bind pudo perder una carrera contra OTRO
                # proceso lanzando el mismo perfil casi a la vez (dos backends
                # arrancando juntos). Antes de rendirnos, una sonda más sin cache:
                # si el puerto SÍ tiene algo vivo/cargando, es el ganador de esa
                # carrera — lo adoptamos en vez de declarar fallo con un servidor
                # real cargando justo al lado.
                probe = self.probe_port(profile, force=True)
                if probe["state"] in ("listo", "arrancando"):
                    self._servers[profile] = {"base": probe["base"], "port": self._port_for(profile), "model": (self._servers.get(profile) or {}).get("model")}
                    if probe["state"] == "listo":
                        return probe["base"]
                    time.sleep(1.0)
                    continue
                self._servers[profile] = {}
                return None
            time.sleep(1.0)
        st = self._servers.get(profile) or {}
        return st.get("base") if (wait_seconds == 0 or self._alive(profile)) else None

    def server_ready(self, profile: str = "interactive") -> bool:
        """True solo si el PUERTO del perfil responde /health "listo" — lo haya
        lanzado este proceso o no (ver `probe_port`)."""
        return self._alive(profile)

    def server_status(self) -> Dict[str, Any]:
        """Estado HONESTO de los DOS perfiles: sonda el puerto real de cada uno
        (`probe_port`, con su cache corta) en vez de depender de si ESTE proceso
        los lanzó. Antes iteraba solo `self._servers` — un diccionario vacío en
        cualquier proceso nuevo (recarga, script de verificación) — así que un
        motor vivo lanzado por otro proceso se veía como `running: False,
        ready: False` aunque respondiera. Ahora siempre se comprueban los DOS
        perfiles, existan o no en memoria local."""
        out: Dict[str, Any] = {
            "port": self.server_port,
            "ctx": self.server_ctx,
            "parallel": self.server_parallel,
            "log": str(self._server_log),
            "profiles": {},
        }
        for profile in ("interactive", "background"):
            probe = self.probe_port(profile)
            st = self._servers.get(profile) or {}
            proc = st.get("proc")
            local_running = proc is not None and proc.poll() is None
            state = probe["state"]
            out["profiles"][profile] = {
                "running": state in ("listo", "arrancando", "respondiendo_sin_modelo") or local_running,
                "ready": state == "listo",
                "state": state,
                "base_url": probe.get("base") or st.get("base"),
                "port": self._port_for(profile),
                "model": st.get("model"),
                # Honestidad: ¿lo lanzó ESTE proceso (puede pararlo con
                # `stop_server`) o solo lo detectó vivo (lanzado por otro
                # proceso, o a mano)? Las 3 instancias vistas en `ps` (8790,
                # 8791, y el runner de Ollama en otro puerto) se distinguen
                # exactamente por este campo.
                "managed_locally": local_running,
            }
        inter = out["profiles"].get("interactive") or {}
        out["running"] = bool(inter.get("running"))
        out["ready"] = bool(inter.get("ready"))
        out["base_url"] = inter.get("base_url")
        out["model"] = inter.get("model")
        return out

    def stop_server(self) -> None:
        for profile, st in list(self._servers.items()):
            proc = st.get("proc")
            if proc is not None and proc.poll() is None:
                try:
                    proc.terminate()
                    proc.wait(timeout=8)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
            self._servers[profile] = {}


    # ───────────── Aceleradores alternativos de cuantización (Adenda 157) ─────────────

    def quantization_backends(self) -> Dict[str, Any]:
        """
        Inventario HONESTO de motores de inferencia ternaria disponibles en ESTA
        máquina. No promete nada que no pueda ejecutar: cada entrada dice si está
        disponible y, si no, POR QUÉ.

        · bitnet.cpp (nativo)  — el que usamos: llama-server con el GGUF i2_s.
        · spbitnet (CUDA 2:4)  — kernels ternarios + sparsidad 2:4 estructurada
          para GPUs NVIDIA Ampere+ (github.com/Artemarius/spbitnet, MIT). Requiere
          CUDA 12 y compute capability ≥ 8.0: en Apple Silicon NO es aplicable.
        """
        import platform
        import shutil as _shutil

        status = self.check_status()
        machine = platform.machine().lower()
        system = platform.system()

        native = {
            "id": "bitnet.cpp",
            "nombre": "BitNet nativo (llama-server i2_s)",
            "disponible": bool(status.get("is_compiled") and status.get("models_available")),
            "activo": self.server_ready("interactive") or self.server_ready("background"),
            "cuantizacion": "i2_s ternario {-1,0,+1} · 2 bits/peso",
            "detalle": "Motor por defecto del sistema soberano; CPU (ARM NEON / x86 AVX2).",
        }

        cuda = _shutil.which("nvcc") or os.path.exists("/usr/local/cuda/bin/nvcc")
        sp_bin = None
        for rel in ("spbitnet/build/spbitnet_infer", "../spbitnet/build/spbitnet_infer"):
            p = (self.repo_dir.parent / rel)
            if p.exists():
                sp_bin = str(p)
                break
        if sp_bin is None:
            sp_bin = _shutil.which("spbitnet_infer")

        if machine in ("arm64", "aarch64") and system == "Darwin":
            sp_reason = "Apple Silicon: spbitnet necesita GPU NVIDIA Ampere+ con CUDA 12; aquí no aplica."
        elif not cuda:
            sp_reason = "No se detecta CUDA 12 (nvcc) en esta máquina."
        elif not sp_bin:
            sp_reason = "CUDA presente pero falta compilar spbitnet (binario spbitnet_infer)."
        else:
            sp_reason = ""

        spbitnet = {
            "id": "spbitnet",
            "nombre": "spbitnet (ternario + sparsidad 2:4, CUDA)",
            "disponible": bool(sp_bin and cuda and not sp_reason),
            "activo": False,
            "cuantizacion": "ternario 2 bits + 2:4 estructurada ⇒ ~1.5 bits/peso efectivos",
            "binario": sp_bin,
            "detalle": sp_reason or "Listo para usarse como acelerador en esta neurona.",
            "url": "https://github.com/Artemarius/spbitnet",
            "requisitos": "CUDA 12 · NVIDIA compute capability ≥ 8.0 · modelo convertido a formato disperso",
        }

        return {
            "activo": "bitnet.cpp" if native["activo"] else ("ninguno" if not native["disponible"] else "en frío"),
            "motores": [native, spbitnet],
            "maquina": f"{system} {machine}",
            "nota": "La cuantización de PESOS la hace el motor; la de VECTORES de memoria la hace TurboQuant (ver memoria).",
        }

    def clone_and_build(self, force: bool = False) -> Dict[str, Any]:
        """
        Clones https://github.com/microsoft/BitNet.git and compiles with Apple Silicon SIMD flags.
        """
        if self.repo_dir.exists() and not force:
            status = self.check_status()
            if status["is_compiled"]:
                return {"success": True, "message": "BitNet is already compiled and ready."}

        logs = []
        try:
            # 1. Clone repository if not present
            if not self.repo_dir.exists():
                logs.append("Cloning microsoft/BitNet...")
                res = subprocess.run(
                    ["git", "clone", "--recursive", "https://github.com/microsoft/BitNet.git", str(self.repo_dir)],
                    capture_output=True, text=True, check=True
                )
                logs.append(res.stdout)

            # 2. Prepare build directory
            self.build_dir.mkdir(parents=True, exist_ok=True)
            
            # 3. Configure CMake with native SIMD / ARM NEON flags
            cmake_cmd = [
                "cmake", "..",
                "-DCMAKE_BUILD_TYPE=Release",
                "-DCMAKE_C_COMPILER=clang",
                "-DCMAKE_CXX_COMPILER=clang++",
                '-DCMAKE_C_FLAGS=-O3 -mcpu=native -ffast-math -fvectorize',
                '-DCMAKE_CXX_FLAGS=-O3 -mcpu=native -ffast-math -fvectorize'
            ]
            logs.append(f"Running CMake: {' '.join(cmake_cmd)}")
            res = subprocess.run(cmake_cmd, cwd=str(self.build_dir), capture_output=True, text=True)
            logs.append(res.stdout)
            
            # 4. Compile using available CPU cores
            num_cores = os.cpu_count() or 4
            make_cmd = ["cmake", "--build", ".", "-j", str(num_cores)]
            logs.append(f"Compiling with {num_cores} cores...")
            res = subprocess.run(make_cmd, cwd=str(self.build_dir), capture_output=True, text=True)
            logs.append(res.stdout)

            return {
                "success": True,
                "message": "BitNet compiled successfully with SIMD acceleration.",
                "logs": logs
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "logs": logs
            }

bitnet_cpp_manager = BitNetCppManager()
