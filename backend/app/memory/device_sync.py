"""
(Tarea 2 · Sincronización Automática del Almacenamiento Local) — POR QUÉ EXISTE
------------------------------------------------------------------------------
Indexar una carpeta del dispositivo en la memoria 1.58b era, hasta ahora, un
gesto manual y puntual: alguien tenía que llamar a `/api/system/index_path`
(o similar) cada vez. El usuario pidió que "TODO el almacenamiento local se
sincronice con el sistema de IA" — eso implica una lista persistente de
carpetas vigiladas y un demonio que las reindexe solo, sin que nadie tenga
que acordarse de pedirlo.

`DeviceSyncManager` (singleton `device_sync`) es ese componente:
  - Guarda en disco QUÉ carpetas se vigilan, si están activas, y el resultado
    REAL de la última pasada de cada una (nada de contadores inventados).
  - `index_now()` reindexa una carpeta concreta o todas las habilitadas,
    reutilizando `DocumentIndexer` acotado a esa raíz — el mismo mecanismo
    que ya usa `/api/system/index_path` en app/main.py: mismo troceado,
    mismos conceptos extraídos hacia `knowledge_graph`, mismo manifiesto de
    hashes.
  - Un hilo de fondo opcional (`auto`) repite `index_now()` cada
    `interval_minutes`, ES INTERRUMPIBLE de inmediato mientras espera, nunca
    arranca una segunda pasada mientras otra está en curso, y se apoya en el
    manifiesto de hashes de `DocumentIndexer` para saltarse los ficheros que
    no cambiaron — medido: reindexar una carpeta con un solo `.md` tarda
    ~17s, así que machacar el disco entero cada pocos minutos sin ese salto
    sería carísimo e inútil la mayor parte del tiempo.

LÍMITE CONOCIDO (heredado de `DocumentIndexer`, no introducido aquí): el
manifiesto de hashes vive en UN solo fichero global
(`settings.data_path/indexed_files.json`) y usa la ruta RELATIVA a cada
`workspace_path` como clave. Si dos carpetas vigiladas distintas tienen un
fichero con el mismo nombre relativo (p. ej. ambas tienen un `README.md` en
su raíz), sus hashes pueden pisarse entre sí y provocar reindexados de más.
No se corrige aquí porque `DocumentIndexer` se reutiliza tal cual (así lo
pide la tarea, y es el mismo mecanismo que ya usa `/api/system/index_path`);
queda anotado para una adenda futura que namespacee el manifiesto por
carpeta.
"""
import json
import time
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional

from ..core.config import settings

DEFAULT_INTERVAL_MINUTES = 30
_STATE_FILENAME = "device_sync_state.json"


class DeviceSyncManager:
    """
    Registro persistente de carpetas del dispositivo sincronizadas con la
    memoria 1.58b, más un demonio opcional de reindexado periódico.
    """

    def __init__(self, state_path: Optional[Path] = None):
        self.state_path = state_path or (settings.data_path / _STATE_FILENAME)
        self._lock = threading.RLock()

        self.folders: List[Dict[str, Any]] = []
        self.auto: bool = False
        self.interval_minutes: int = DEFAULT_INTERVAL_MINUTES

        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        # Lock NO bloqueante: si ya hay una pasada en curso, una segunda
        # petición (del demonio o de la API) se rechaza en vez de esperar o
        # solaparse — así se cumple "no debe solapar dos pasadas".
        self._running_index = threading.Lock()

        self._load()
        # (Ola · Arranque) Si la última sesión dejó `auto: true` guardado, el
        # demonio se levanta solo al importar el módulo — igual que
        # `starseed_memory`/`knowledge_graph`/`document_indexer` ya hacen
        # trabajo real (mkdir, lectura de disco) al construirse en este
        # mismo backend. Con `auto: false` (el valor por defecto en una
        # instalación nueva) no se arranca ningún hilo hasta que alguien lo
        # pida explícitamente vía `/api/memory/device_sync/config`.
        if self.auto:
            self.start_daemon()

    # ------------------------------------------------------------- Estado
    def _load(self):
        if self.state_path.exists():
            try:
                data = json.loads(self.state_path.read_text(encoding="utf-8"))
                self.folders = data.get("folders", []) or []
                self.auto = bool(data.get("auto", False))
                interval = data.get("interval_minutes", DEFAULT_INTERVAL_MINUTES)
                self.interval_minutes = max(1, int(interval or DEFAULT_INTERVAL_MINUTES))
            except Exception as e:
                print(f"[DeviceSync] No se pudo leer el estado guardado ({e}); arranco con lista vacía.")
                self.folders, self.auto, self.interval_minutes = [], False, DEFAULT_INTERVAL_MINUTES
        else:
            self.folders, self.auto, self.interval_minutes = [], False, DEFAULT_INTERVAL_MINUTES

    def _save(self):
        with self._lock:
            try:
                self.state_path.parent.mkdir(parents=True, exist_ok=True)
                payload = {
                    "folders": self.folders,
                    "auto": self.auto,
                    "interval_minutes": self.interval_minutes,
                }
                self.state_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
            except Exception as e:
                print(f"[DeviceSync] Error guardando el estado: {e}")

    def _find(self, path: str) -> Optional[Dict[str, Any]]:
        norm = str(Path((path or "").strip()).expanduser())
        for f in self.folders:
            if f.get("path") == norm:
                return f
        return None

    # ------------------------------------------------------- CRUD carpetas
    def add_folder(self, path: str, enabled: bool = True) -> Dict[str, Any]:
        """Registra una carpeta para sincronización. Valida que exista y sea
        un directorio ANTES de aceptarla — nunca se finge un éxito."""
        raw = (path or "").strip()
        if not raw:
            return {"success": False, "error": "No se indicó ninguna ruta."}
        target = Path(raw).expanduser()
        if not target.exists():
            return {"success": False, "error": f"La ruta no existe: {target}"}
        if not target.is_dir():
            return {"success": False, "error": f"La ruta no es una carpeta: {target}"}

        norm = str(target)
        with self._lock:
            existing = self._find(norm)
            if existing:
                existing["enabled"] = bool(enabled)
                self._save()
                return {"success": True, "folder": dict(existing)}
            entry = {
                "path": norm,
                "enabled": bool(enabled),
                "last_indexed": None,
                "files_indexed": 0,
                "chunks_added": 0,
                "last_error": None,
            }
            self.folders.append(entry)
            self._save()
            return {"success": True, "folder": dict(entry)}

    def remove_folder(self, path: str) -> Dict[str, Any]:
        norm = str(Path((path or "").strip()).expanduser())
        with self._lock:
            before = len(self.folders)
            self.folders = [f for f in self.folders if f.get("path") != norm]
            if len(self.folders) == before:
                return {"success": False, "error": f"No hay ninguna carpeta registrada en: {norm}"}
            self._save()
            return {"success": True}

    def set_folder_enabled(self, path: str, enabled: bool) -> Dict[str, Any]:
        with self._lock:
            entry = self._find(path)
            if not entry:
                return {"success": False, "error": f"No hay ninguna carpeta registrada en: {path}"}
            entry["enabled"] = bool(enabled)
            self._save()
            return {"success": True, "folder": dict(entry)}

    # ------------------------------------------------------------ Config
    def set_config(self, auto: Optional[bool] = None, interval_minutes: Optional[int] = None) -> Dict[str, Any]:
        with self._lock:
            if auto is not None:
                self.auto = bool(auto)
            if interval_minutes is not None:
                try:
                    self.interval_minutes = max(1, int(interval_minutes))
                except (TypeError, ValueError):
                    pass
            self._save()

        if self.auto:
            self.start_daemon()
        else:
            self.stop_daemon()

        return self.get_status()

    # ------------------------------------------------------------- Índice
    def index_now(self, path: Optional[str] = None) -> Dict[str, Any]:
        """
        Indexa UNA carpeta (si se pasa `path`, sea o no una carpeta ya
        registrada) o TODAS las habilitadas (si `path` es None).

        Reutiliza `DocumentIndexer(workspace_path=Path(carpeta))` acotado a
        cada raíz — igual que `/api/system/index_path` en app/main.py: mismo
        troceado, mismos conceptos hacia `knowledge_graph`, mismo manifiesto
        de hashes (así que un fichero sin cambios se salta solo). Cada
        carpeta se indexa en su propio try/except: si una falla, las demás
        siguen — igual que las tres fuentes de `_gather_context`.

        Nunca se solapa con otra llamada en curso (lock no bloqueante): si
        ya hay una pasada corriendo, se devuelve `success: False` con el
        motivo en vez de esperar o machacar la que está en marcha.
        """
        if not self._running_index.acquire(blocking=False):
            return {
                "success": False,
                "error": "Ya hay una indexación en curso; espera a que termine.",
                "indexed_files": 0,
                "new_chunks": 0,
                "seconds": 0.0,
                "per_folder": [],
            }
        try:
            from .document_indexer import DocumentIndexer  # import perezoso: evita ciclos al cargar el módulo

            if path:
                target_dir = Path((path or "").strip()).expanduser()
                if not target_dir.exists() or not target_dir.is_dir():
                    return {
                        "success": False,
                        "error": f"La ruta no existe o no es una carpeta: {target_dir}",
                        "indexed_files": 0,
                        "new_chunks": 0,
                        "seconds": 0.0,
                        "per_folder": [],
                    }
                targets = [str(target_dir)]
            else:
                with self._lock:
                    targets = [f["path"] for f in self.folders if f.get("enabled", True)]
                if not targets:
                    return {
                        "success": True,
                        "indexed_files": 0,
                        "new_chunks": 0,
                        "seconds": 0.0,
                        "per_folder": [],
                        "note": "No hay carpetas habilitadas para sincronizar.",
                    }

            per_folder: List[Dict[str, Any]] = []
            total_files = 0
            total_chunks = 0
            t0 = time.time()

            for folder_path in targets:
                # Una parada del DEMONIO corta el resto de una ronda automática
                # entre carpetas (no a mitad de una carpeta ya empezada); una
                # llamada manual (`path` explícito) siempre completa la suya.
                if path is None and self._stop_event.is_set():
                    break

                target_dir = Path(folder_path)
                f_t0 = time.time()
                entry = self._find(folder_path)  # puede ser None si es una ruta puntual no registrada

                if not target_dir.exists() or not target_dir.is_dir():
                    err = f"La ruta ya no existe o no es una carpeta: {folder_path}"
                    if entry is not None:
                        with self._lock:
                            entry["last_error"] = err
                        self._save()
                    per_folder.append({"path": folder_path, "success": False, "error": err})
                    print(f"[DeviceSync] {err}")
                    continue

                try:
                    scoped = DocumentIndexer(workspace_path=target_dir)
                    result = scoped.scan_and_index(force=False)
                    elapsed = round(time.time() - f_t0, 3)
                    files_indexed = int(result.get("indexed_files_count", 0))
                    chunks_added = int(result.get("new_chunks_added", 0))

                    if entry is not None:
                        with self._lock:
                            entry["last_indexed"] = time.time()
                            entry["files_indexed"] = files_indexed
                            entry["chunks_added"] = chunks_added
                            entry["last_error"] = None
                        self._save()

                    total_files += files_indexed
                    total_chunks += chunks_added
                    per_folder.append({
                        "path": folder_path,
                        "success": True,
                        "seconds": elapsed,
                        "indexed_files": files_indexed,
                        "new_chunks": chunks_added,
                    })
                    print(f"[DeviceSync] {folder_path}: {files_indexed} ficheros nuevos/cambiados, "
                          f"{chunks_added} fragmentos añadidos en {elapsed}s.")
                except Exception as e:
                    err = str(e)[:300]
                    if entry is not None:
                        with self._lock:
                            entry["last_error"] = err
                        self._save()
                    per_folder.append({"path": folder_path, "success": False, "error": err})
                    print(f"[DeviceSync] Fallo indexando {folder_path}: {e}")

            seconds = round(time.time() - t0, 3)
            return {
                "success": True,
                "indexed_files": total_files,
                "new_chunks": total_chunks,
                "seconds": seconds,
                "per_folder": per_folder,
            }
        finally:
            self._running_index.release()

    # -------------------------------------------------------------- Demonio
    def start_daemon(self):
        """Arranca el hilo de fondo si no está ya vivo. Seguro de llamar
        varias veces: si ya hay un hilo corriendo, no se crea uno segundo
        (evita dos rondas de indexado compitiendo por el mismo trabajo)."""
        with self._lock:
            self._stop_event.clear()
            if self._thread is not None and self._thread.is_alive():
                return
            self._thread = threading.Thread(target=self._daemon_loop, name="device-sync-daemon", daemon=True)
            self._thread.start()
        print(f"[DeviceSync] Demonio de reindexado automático iniciado (cada {self.interval_minutes} min).")

    def stop_daemon(self):
        """Señala la parada y espera un margen breve (best-effort) a que el
        hilo la reconozca. El caso común es que el demonio esté dormido
        (Event interrumpible, no `time.sleep` ciego): se despierta en
        microsegundos y el `join` casi no espera. Si está a mitad de una
        pasada de indexado, el `join` agota su margen y el hilo sigue vivo —
        eso es CORRECTO, no una mentira: sigue corriendo de verdad hasta que
        esa pasada termine. Este margen es lo que hace que `get_status()`
        llamado justo después de parar sea honesto en el caso común, en vez
        de devolver `running: true` por una foto tomada a mitad de la
        señal."""
        self._stop_event.set()
        t = self._thread
        if t is not None and t.is_alive():
            t.join(timeout=2.0)
        print("[DeviceSync] Señal de parada enviada al demonio de reindexado.")

    def _daemon_loop(self):
        print(f"[DeviceSync] Demonio de reindexado automático arrancado (cada {self.interval_minutes} min).")
        while not self._stop_event.is_set():
            interval_seconds = max(60, int(self.interval_minutes) * 60)
            interrupted = self._stop_event.wait(timeout=interval_seconds)
            if interrupted or not self.auto:
                break
            try:
                result = self.index_now(None)
                print(f"[DeviceSync] Ronda automática: {result.get('indexed_files', 0)} ficheros, "
                      f"{result.get('new_chunks', 0)} fragmentos nuevos en {result.get('seconds', 0)}s.")
            except Exception as e:
                # Nunca deja morir el hilo por un fallo de una ronda: la
                # siguiente pasada lo intentará de nuevo.
                print(f"[DeviceSync] Ronda automática falló: {e}")
        print("[DeviceSync] Demonio de reindexado automático detenido.")

    def is_running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    # -------------------------------------------------------------- Estado
    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "folders": [dict(f) for f in self.folders],
                "auto": self.auto,
                "interval_minutes": self.interval_minutes,
                "running": self.is_running(),
            }


device_sync = DeviceSyncManager()
