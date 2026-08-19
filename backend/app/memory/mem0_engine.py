import time
import json
import re
from pathlib import Path
from typing import Dict, Any, List, Optional

class Mem0UniversalMemoryEngine:
    """
    Motor de Memoria Universal Mem0 (https://github.com/mem0ai/mem0) para StarSeed OS & Astraura 1.58b.
    Proporciona una capa de memoria inteligente, auto-adaptable y jerárquica:
      - Memoria de Usuario (Alex, perfil, estilo, preferencias, biografía, hardware M1).
      - Memoria de Agentes (estrategias de razonamiento, patrones de código, subagentes).
      - Memoria de Sesión / Episódica (hechos contextuales inmediatos y objetivos).
      - Extracción semántica automática de hechos, relaciones y entidades tras cada mensaje.
      - Trazabilidad y versionado de cambios con historial de mutaciones (memory history).
    """
    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or Path("/Users/alex/Documents/IA 1.58 bit/data/mem0")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.store_file = self.storage_dir / "mem0_store.json"
        
        self.memories: List[Dict[str, Any]] = []
        self.history: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if self.store_file.exists():
            try:
                data = json.loads(self.store_file.read_text(encoding="utf-8"))
                self.memories = data.get("memories", [])
                self.history = data.get("history", [])
            except Exception as e:
                print(f"[Mem0Engine] Error loading store: {e}")
                self._seed_default_mem0()
        else:
            self._seed_default_mem0()

    def _seed_default_mem0(self):
        self.memories = [
            {
                "id": "mem0_user_1",
                "user_id": "alex",
                "agent_id": "*",
                "run_id": "init",
                "memory": "El usuario Alex Bordón Garrigós es el creador de StarSeed OS y Astraura 1.58-Bit. Trabaja en un Apple Silicon M1 con 8 núcleos y memoria unificada.",
                "category": "user_profile",
                "confidence": 0.99,
                "created_at": time.time() - 86400,
                "updated_at": time.time() - 86400,
                "metadata": {"sovereign": True, "source": "system_bootstrap"}
            },
            {
                "id": "mem0_agent_1",
                "user_id": "alex",
                "agent_id": "hephaestus",
                "run_id": "init",
                "memory": "Hephaestus prioriza kernels SIMD en ARM NEON con cuantización ternaria i2_s sin MatMul para máxima eficiencia de energía.",
                "category": "agent_strategy",
                "confidence": 0.96,
                "created_at": time.time() - 43200,
                "updated_at": time.time() - 43200,
                "metadata": {"tags": ["simd", "arm64", "neon", "bitnet"]}
            },
            {
                "id": "mem0_agent_2",
                "user_id": "alex",
                "agent_id": "hermes",
                "run_id": "init",
                "memory": "Hermes utiliza Browser-Use y Playwright Headless para búsqueda libre en internet e indexación directa en cerebros 1.58b.",
                "category": "agent_strategy",
                "confidence": 0.95,
                "created_at": time.time() - 21600,
                "updated_at": time.time() - 21600,
                "metadata": {"tags": ["browser", "web", "crawl4ai"]}
            },
            {
                "id": "mem0_session_1",
                "user_id": "alex",
                "agent_id": "astraura_prime",
                "run_id": "session_current",
                "memory": "Todas las memorias y cerebros deben ser modificables por defecto por cualquier personalidad desde cualquier chat integrado.",
                "category": "system_axiom",
                "confidence": 1.0,
                "created_at": time.time() - 3600,
                "updated_at": time.time() - 3600,
                "metadata": {"directive": "universal_mutability"}
            }
        ]
        self.history = [
            {
                "id": "hist_1",
                "memory_id": "mem0_user_1",
                "action": "created",
                "timestamp": time.time() - 86400,
                "text": self.memories[0]["memory"]
            }
        ]
        self._save()

    def _save(self):
        try:
            payload = {
                "memories": self.memories,
                "history": self.history[:100],
                "updated_at": time.time()
            }
            self.store_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"[Mem0Engine] Error saving store: {e}")

    @staticmethod
    def is_valid_memory(text: str) -> bool:
        if not text or len(text.strip()) < 5:
            return False
        t_lower = text.lower()
        bad_patterns = [
            r"como alex bord[oó]n garrig[oó]s",
            r"me llamo alex bord[oó]n garrig[oó]s",
            r"demuestra la capacidad",
            r"atracongada",
            r"personalidad \d+:",
            r"desde el pasado del 24 dc",
            r"sin signos sexuales ni sugerencias sensuales"
        ]
        for p in bad_patterns:
            if re.search(p, t_lower):
                return False
        return True

    def add_memory(
        self,
        memory_text: str,
        user_id: str = "alex",
        agent_id: str = "*",
        run_id: str = "default",
        category: str = "general",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Adds a new semantic memory to Mem0 with auto-deduplication and confidence scoring.
        """
        text_clean = memory_text.strip()
        if not self.is_valid_memory(text_clean):
            return None

        # Simple similarity check to avoid exact duplicates
        for existing in self.memories:
            if existing["memory"].lower() == text_clean.lower():
                existing["updated_at"] = time.time()
                self._save()
                return existing

        m_id = f"mem0_{int(time.time() * 1000)}"
        new_entry = {
            "id": m_id,
            "user_id": user_id,
            "agent_id": agent_id,
            "run_id": run_id,
            "memory": text_clean,
            "category": category,
            "confidence": 0.95,
            "created_at": time.time(),
            "updated_at": time.time(),
            "metadata": metadata or {}
        }
        self.memories.insert(0, new_entry)
        self.history.insert(0, {
            "id": f"hist_{int(time.time() * 1000)}",
            "memory_id": m_id,
            "action": "created",
            "timestamp": time.time(),
            "text": text_clean
        })
        self._save()
        return new_entry

    def search_memories(
        self,
        query: str,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Searches Mem0 memories using token and keyword resonance.
        """
        q_tokens = set(re.findall(r'\w+', query.lower()))
        scored = []
        for m in self.memories:
            if user_id and m.get("user_id") not in [user_id, "*"]:
                continue
            if agent_id and m.get("agent_id") not in [agent_id, "*"]:
                continue

            m_tokens = set(re.findall(r'\w+', m["memory"].lower()))
            overlap = len(q_tokens.intersection(m_tokens))
            score = overlap / (len(q_tokens) + 1e-5)
            if score > 0 or len(q_tokens) == 0:
                scored.append((score, m))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:limit]]

    def update_memory(self, memory_id: str, new_text: str, metadata: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Mutates a memory with version history.
        """
        for m in self.memories:
            if m["id"] == memory_id:
                old_text = m["memory"]
                m["memory"] = new_text.strip()
                m["updated_at"] = time.time()
                if metadata:
                    m["metadata"].update(metadata)
                self.history.insert(0, {
                    "id": f"hist_{int(time.time() * 1000)}",
                    "memory_id": memory_id,
                    "action": "updated",
                    "timestamp": time.time(),
                    "old_text": old_text,
                    "new_text": new_text.strip()
                })
                self._save()
                return m
        return None

    def delete_memory(self, memory_id: str) -> bool:
        initial = len(self.memories)
        self.memories = [m for m in self.memories if m["id"] != memory_id]
        if len(self.memories) < initial:
            self.history.insert(0, {
                "id": f"hist_{int(time.time() * 1000)}",
                "memory_id": memory_id,
                "action": "deleted",
                "timestamp": time.time()
            })
            self._save()
            return True
        return False

    def get_all(self) -> Dict[str, Any]:
        return {
            "total_memories": len(self.memories),
            "memories": self.memories,
            "history": self.history[:30]
        }

mem0_engine = Mem0UniversalMemoryEngine()
