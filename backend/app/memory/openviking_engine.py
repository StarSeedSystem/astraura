import time
import math
from typing import Dict, Any, List, Optional
from pathlib import Path

class OpenVikingMemorySystem:
    """
    OpenViking Cognitive Memory Framework (inspired by Volcengine OpenViking).
    Implements a biologically-inspired multi-tiered memory architecture:
      - Tier 0: Working Memory (WM) — Short-term contextual buffer with dynamic compaction.
      - Tier 1: Episodic Memory (EM) — Time-indexed interaction records with power-law decay.
      - Tier 2: Semantic Memory (SM) — Hierarchical conceptual knowledge graph with spreading activation.
      - Tier 3: Procedural Memory (PM) — Skill routines, tool macros, and optimized execution pipelines.
    """
    def __init__(self):
        self.working_memory: List[Dict[str, Any]] = []
        self.episodic_memory: List[Dict[str, Any]] = []
        self.semantic_clusters: List[Dict[str, Any]] = []
        self.procedural_skills: List[Dict[str, Any]] = []
        self.decay_factor = 0.05
        self.max_working_items = 12
        
        self._initialize_seed_data()

    def _initialize_seed_data(self):
        # 1. Seed Working Memory
        self.working_memory = [
            {
                "id": "wm_1",
                "content": "Sistema cognitivo Astraura 1.58b inicializado con aceleración ARM NEON.",
                "importance": 0.95,
                "timestamp": time.time()
            },
            {
                "id": "wm_2",
                "content": "Bóveda starseed_memory_root vinculada con 9 ramas y enlaces [[Wikilinks]].",
                "importance": 0.90,
                "timestamp": time.time()
            }
        ]

        # 2. Seed Episodic Memory with decay curves
        self.episodic_memory = [
            {
                "id": "ep_1",
                "event": "Compilación del binario nativo llama-cli con soporte i2_s BitNet.",
                "context": "Hardware Apple Silicon M1 (8 núcleos)",
                "timestamp": time.time() - 86400,
                "recall_count": 14,
                "base_relevance": 0.92
            },
            {
                "id": "ep_2",
                "event": "Extracción semántica y navegación con Playwright Browser-Use.",
                "context": "Conexión a internet autónoma en localhost",
                "timestamp": time.time() - 43200,
                "recall_count": 8,
                "base_relevance": 0.88
            },
            {
                "id": "ep_3",
                "event": "Diseño de la interfaz visual Hermes con paleta Trinity de StarSeed OS.",
                "context": "Aesthetics & Liquid Crystal UX",
                "timestamp": time.time() - 21600,
                "recall_count": 19,
                "base_relevance": 0.96
            }
        ]

        # 3. Seed Semantic Clusters (Spreading Activation Graph)
        self.semantic_clusters = [
            {
                "cluster_id": "sem_ternary",
                "name": "Cuantización Ternaria 1.58b",
                "activation_energy": 0.94,
                "concepts": ["BitNet b1.58", "MatMul Elimination", "i2_s Pack", "ARM NEON", "Eficiencia 8.0x"],
                "connected_clusters": ["sem_hardware", "sem_starseed"]
            },
            {
                "cluster_id": "sem_hardware",
                "name": "Hardware Soberano & Apple M1",
                "activation_energy": 0.88,
                "concepts": ["Memoria Unificada", "8 Núcleos", "Sensorium Batería", "Terminal Shell"],
                "connected_clusters": ["sem_ternary", "sem_procedural"]
            },
            {
                "cluster_id": "sem_starseed",
                "name": "Ontocracia & Exocórtex StarSeed",
                "activation_energy": 0.92,
                "concepts": ["Soberanía Digital", "Voto Líquido", "Cerebros Multidimensionales", "OmniVoice", "[[Wikilinks]]"],
                "connected_clusters": ["sem_ternary", "sem_procedural"]
            },
            {
                "cluster_id": "sem_procedural",
                "name": "Herramientas & Agentes Hermes/Hephaestus",
                "activation_energy": 0.85,
                "concepts": ["Browser-Use", "Playwright", "Crawl4AI", "Workflows Cron", "Dream Studio"],
                "connected_clusters": ["sem_hardware", "sem_starseed"]
            }
        ]

        # 4. Seed Procedural Skills
        self.procedural_skills = [
            {
                "skill_id": "proc_fs_read",
                "name": "Lectura & Indexación Universal del Disco",
                "trigger_pattern": r"(leer|archivo|documento|carpeta|fs)",
                "success_rate": 0.99,
                "execution_speed_ms": 12
            },
            {
                "skill_id": "proc_web_scrape",
                "name": "Navegación Headless & Extracción Web",
                "trigger_pattern": r"(buscar|web|internet|crawl|browser)",
                "success_rate": 0.96,
                "execution_speed_ms": 450
            },
            {
                "skill_id": "proc_dream_consolidation",
                "name": "Consolidación Onírica de Sinapsis",
                "trigger_pattern": r"(soñar|dream|reflexion|auto-mejora)",
                "success_rate": 0.98,
                "execution_speed_ms": 1200
            }
        ]

    def add_working_item(self, content: str, importance: float = 0.8) -> Dict[str, Any]:
        item = {
            "id": f"wm_{int(time.time() * 1000)}",
            "content": content,
            "importance": importance,
            "timestamp": time.time()
        }
        self.working_memory.insert(0, item)
        if len(self.working_memory) > self.max_working_items:
            # Promote oldest high-importance item to episodic
            demoted = self.working_memory.pop()
            if demoted["importance"] > 0.75:
                self.record_episode(demoted["content"], "Consolidación de Memoria de Trabajo")
        return item

    def record_episode(self, event: str, context: str) -> Dict[str, Any]:
        episode = {
            "id": f"ep_{int(time.time() * 1000)}",
            "event": event,
            "context": context,
            "timestamp": time.time(),
            "recall_count": 1,
            "base_relevance": 0.90
        }
        self.episodic_memory.insert(0, episode)
        return episode

    def query_semantic_activation(self, prompt: str) -> List[Dict[str, Any]]:
        """
        Calculates spreading activation across OpenViking semantic clusters based on prompt keywords.
        """
        p_lower = prompt.lower()
        activated = []

        for cluster in self.semantic_clusters:
            score = 0.0
            for concept in cluster["concepts"]:
                if concept.lower() in p_lower:
                    score += 0.35
            
            if score > 0:
                cluster_copy = dict(cluster)
                cluster_copy["dynamic_activation"] = min(1.0, cluster["activation_energy"] + score)
                activated.append(cluster_copy)

        return sorted(activated, key=lambda x: x.get("dynamic_activation", 0), reverse=True)

    def get_full_memory_state(self) -> Dict[str, Any]:
        # Compute decayed episodic relevance
        now = time.time()
        active_episodes = []
        for ep in self.episodic_memory:
            age_hours = (now - ep["timestamp"]) / 3600.0
            decayed = ep["base_relevance"] * math.exp(-self.decay_factor * (age_hours / 24.0))
            ep_copy = dict(ep)
            ep_copy["effective_relevance"] = round(max(0.1, decayed + (ep["recall_count"] * 0.02)), 3)
            active_episodes.append(ep_copy)

        return {
            "architecture": "OpenViking Multi-Tier Cognitive Memory",
            "working_memory": self.working_memory,
            "episodic_memory": active_episodes,
            "semantic_clusters": self.semantic_clusters,
            "procedural_skills": self.procedural_skills,
            "total_working": len(self.working_memory),
            "total_episodic": len(self.episodic_memory),
            "total_clusters": len(self.semantic_clusters),
            "total_skills": len(self.procedural_skills)
        }

openviking_memory = OpenVikingMemorySystem()
