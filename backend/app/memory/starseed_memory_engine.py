import os
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

STARSEED_BRANCHES = [
    {"rama": "soul", "tipo": "soul", "nombre": "Alma & Ontocracia", "color": "#00f0ff", "scope": "global"},
    {"rama": "ego", "tipo": "aurora", "nombre": "Ego & Personalidad", "color": "#a855f7", "scope": "global"},
    {"rama": "skills", "tipo": "skill", "nombre": "Habilidades Nativas", "color": "#10b981", "scope": "global"},
    {"rama": "style", "tipo": "style", "nombre": "Estilo & Criterio Visual", "color": "#ec4899", "scope": "global"},
    {"rama": "memory", "tipo": "memory", "nombre": "Exocórtex & Memorias", "color": "#3b82f6", "scope": "global"},
    {"rama": "dream", "tipo": "dream", "nombre": "Procesos Oníricos", "color": "#8b5cf6", "scope": "global"},
    {"rama": "accounts", "tipo": "accounts", "nombre": "Cuentas & Conexiones", "color": "#f59e0b", "scope": "privado"},
    {"rama": "tasks", "tipo": "task", "nombre": "Tareas & Metas", "color": "#06b6d4", "scope": "operativo"},
    {"rama": "logs", "tipo": "log", "nombre": "Bitácora & Telemetría", "color": "#64748b", "scope": "operativo"}
]

class StarSeedMemoryEngine:
    """
    Motor de memoria completo StarSeed OS para Astraura 1.58b.
    Implementa la estructura de ramas 'starseed_memory_root' con compatibilidad
    de enlaces bidireccionales ([[Wikilinks]]), memorias inmutables, recuerdos de contexto
    y sincronización continua.
    """
    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or Path(__file__).resolve().parent.parent.parent / "data" / "starseed_memory_root"
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.manifest_path = self.storage_dir / "memory.manifest.json"
        self.recuerdos_path = self.storage_dir / "recuerdos_core.json"
        self.documents_file = self.storage_dir / "memory_docs.json"
        
        self.documents: List[Dict[str, Any]] = []
        self.recuerdos: Dict[str, Any] = {}
        self._initialize()

    def _initialize(self):
        # 1. Initialize Manifest if missing
        if not self.manifest_path.exists():
            manifest = {
                "name": "astraura_starseed_memory_root",
                "kind": "memory_root",
                "version": "2.2.0",
                "owner": "alexbordongarrigos@gmail.com",
                "structure": "root+branches",
                "portable": True,
                "accountConnected": True,
                "sync": {
                    "local": {"path": str(self.storage_dir), "active": True},
                    "cloud": {"provider": "Vercel / Supabase", "active": True},
                    "graph_sync": {"active": True}
                },
                "branches": STARSEED_BRANCHES
            }
            self.manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))

        # 2. Initialize Core Memories / Recuerdos
        if self.recuerdos_path.exists():
            try:
                self.recuerdos = json.loads(self.recuerdos_path.read_text())
            except Exception:
                self._create_default_recuerdos()
        else:
            self._create_default_recuerdos()

        # 3. Initialize Documents
        if self.documents_file.exists():
            try:
                self.documents = json.loads(self.documents_file.read_text())
            except Exception:
                self._create_seed_documents()
        else:
            self._create_seed_documents()

    def _create_default_recuerdos(self):
        self.recuerdos = {
            "user_preferences": {
                "preferred_name": "Alex Bordón Garrigós",
                "nickname": "Alex",
                "role_title": "Creador & Arquitecto de StarSeed OS y Astraura",
                "communication_tone": "Lúcido, elocuente, cálido, directo y colaborativo",
                "language": "Español (Principal) / Inglés Técnico"
            },
            "context_personality_rules": [
                {
                    "id": "rule_code",
                    "context_trigger": "Desarrollo de software, C++, Python, compilación, terminal, hardware",
                    "assigned_personality": "Hephaestus (Arquitecto de Hardware & Shell)",
                    "active": True
                },
                {
                    "id": "rule_web",
                    "context_trigger": "Investigación en internet, navegación, extracción web, APIs",
                    "assigned_personality": "Hermes (Navegador Autónomo & Red)",
                    "active": True
                },
                {
                    "id": "rule_philosophy",
                    "context_trigger": "Ontocracia, Ciberdelia, Comunismo de Abundancia, Soberanía Digital",
                    "assigned_personality": "Astraura Prime (Orquestador Soberano)",
                    "active": True
                },
                {
                    "id": "rule_memory",
                    "context_trigger": "Grafos de conocimiento, recuerdos del pasado, exocórtex, archivos",
                    "assigned_personality": "Mnemosyne (Guardián de la Memoria)",
                    "active": True
                }
            ],
            "connected_accounts_prefs": [
                {
                    "account": "Vercel",
                    "user": "alexbordongarrigos",
                    "project": "astraura.vercel.app",
                    "preferred_deployment": "Producción Automática con Caché Inmediata"
                },
                {
                    "account": "GitHub",
                    "user": "alexbordongarrigos",
                    "repos": ["starseed-os-main", "Astraura-1.58b-Engine"],
                    "preferred_branch": "main"
                },
                {
                    "account": "Hugging Face / Microsoft Research",
                    "preferred_weights": "BitNet b1.58 ternary i2_s format"
                }
            ],
            "pinned_core_memories": [
                {
                    "id": "pin_1",
                    "title": "Arquitectura Ternaria 1.58 Bits",
                    "content": "Astraura opera con pesos {-1, 0, 1}, compresión 8x en memoria y suma/resta sin multiplicaciones pesadas.",
                    "priority": "inmutable",
                    "created_at": "Génesis"
                },
                {
                    "id": "pin_2",
                    "title": "Soberanía de Datos & Acceso al Dispositivo",
                    "content": "El usuario posee control total. El sistema puede explorar /Users/alex, ejecutar terminal y navegar con Browser-Use.",
                    "priority": "inmutable",
                    "created_at": "Génesis"
                },
                {
                    "id": "pin_3",
                    "title": "Ecosistema StarSeed OS",
                    "content": "Integración permanente con la biblioteca de habilidades de https://starseed-os.vercel.app/library y ontocracia participativa.",
                    "priority": "alta",
                    "created_at": "Reciente"
                }
            ]
        }
        self.save_recuerdos(self.recuerdos)

    def _create_seed_documents(self):
        self.documents = [
            {
                "id": "doc_soul_manifesto",
                "name": "Manifiesto del Alma y Ontocracia",
                "branch": "soul",
                "category": "Filosofía",
                "tags": ["ontocracia", "soberania", "starseed", "valores"],
                "color": "#00f0ff",
                "active": True,
                "markdown": "# Manifiesto del Alma y Ontocracia\n\nEl sistema nervioso digital de StarSeed OS y Astraura está consagrado a la soberanía personal y la abundancia compartida.\n\n## Principios Rectores\n- [[Arquitectura 1.58-Bit]] como estándar de eficiencia de hardware.\n- [[Exocórtex Personal]] inviolable e inalienable.\n- Voto líquido y gobernanza participativa.",
                "created_at": time.time(),
                "updated_at": time.time()
            },
            {
                "id": "doc_memory_exocortex",
                "name": "Mi Exocórtex Soberano",
                "branch": "memory",
                "category": "Personal",
                "tags": ["identidad", "memoria", "exocortex"],
                "color": "#3b82f6",
                "active": True,
                "markdown": "# Mi Exocórtex Soberano\n\nExtensión cognitiva de Alex Bordón Garrigós en Apple Silicon M1.\n\n## Nodos de Confianza\n- [[Manifiesto del Alma y Ontocracia]]\n- [[Herramientas de Hardware Hephaestus]]\n- [[Navegación Hermes Playwright]]",
                "created_at": time.time(),
                "updated_at": time.time()
            },
            {
                "id": "doc_skills_catalog",
                "name": "Catálogo de Habilidades Nativas",
                "branch": "skills",
                "category": "Operativo",
                "tags": ["habilidades", "starseed", "tools"],
                "color": "#10b981",
                "active": True,
                "markdown": "# Catálogo de Habilidades Nativas\n\n12 habilidades activas sincronizadas con la biblioteca de StarSeed OS:\n- `computer-fs-access`: Lectura de disco en /Users/alex\n- `terminal-exec`: Shell interactivo\n- `browser-use`: Automatización web con Playwright\n- `dream-engine`: Procesamiento onírico y auto-mejoramiento",
                "created_at": time.time(),
                "updated_at": time.time()
            }
        ]
        self.save_documents()

    def save_documents(self):
        try:
            self.documents_file.write_text(json.dumps(self.documents, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"Error saving memory docs: {e}")

    def save_recuerdos(self, data: Dict[str, Any]):
        self.recuerdos = data
        try:
            self.recuerdos_path.write_text(json.dumps(self.recuerdos, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"Error saving recuerdos: {e}")

    def get_manifest(self) -> Dict[str, Any]:
        try:
            return json.loads(self.manifest_path.read_text())
        except Exception:
            return {"branches": STARSEED_BRANCHES}

    def list_documents(self, branch: Optional[str] = None) -> List[Dict[str, Any]]:
        if branch:
            return [d for d in self.documents if d.get("branch") == branch]
        return self.documents

    def create_or_update_document(self, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        doc_id = doc_data.get("id") or f"doc_{int(time.time())}"
        now = time.time()
        
        idx = next((i for i, d in enumerate(self.documents) if d["id"] == doc_id), None)
        if idx is not None:
            self.documents[idx].update(doc_data)
            self.documents[idx]["updated_at"] = now
            saved_doc = self.documents[idx]
        else:
            doc_data["id"] = doc_id
            doc_data["created_at"] = doc_data.get("created_at", now)
            doc_data["updated_at"] = now
            self.documents.insert(0, doc_data)
            saved_doc = doc_data
            
        self.save_documents()
        return saved_doc

    def delete_document(self, doc_id: str) -> bool:
        initial_len = len(self.documents)
        self.documents = [d for d in self.documents if d["id"] != doc_id]
        if len(self.documents) < initial_len:
            self.save_documents()
            return True
        return False

    def build_harmonic_graph(self) -> Dict[str, Any]:
        """
        Parses all documents, extracting [[Wikilinks]] and tags to build a living harmonic graph.
        """
        nodes = []
        edges = []
        node_map = {}

        for doc in self.documents:
            node_id = doc["id"]
            node = {
                "id": node_id,
                "label": doc["name"],
                "type": doc.get("branch", "memory"),
                "category": doc.get("category", "General"),
                "tags": doc.get("tags", []),
                "summary": doc.get("markdown", "")[:180] + "...",
                "weight": 85 if doc.get("branch") in ["soul", "memory"] else 70,
                "color": doc.get("color", "#00f0ff")
            }
            nodes.append(node)
            node_map[doc["name"].lower()] = node_id

        # Extract [[Wikilinks]] from markdown
        import re
        wikilink_regex = re.compile(r'\[\[(.*?)\]\]')
        for doc in self.documents:
            source_id = doc["id"]
            content = doc.get("markdown", "")
            matches = wikilink_regex.findall(content)
            for target_name in matches:
                t_lower = target_name.strip().lower()
                target_id = node_map.get(t_lower)
                if not target_id:
                    # Create implicit conceptual node
                    target_id = f"concept_{hash(t_lower) % 10000}"
                    if target_id not in [n["id"] for n in nodes]:
                        nodes.append({
                            "id": target_id,
                            "label": target_name.strip(),
                            "type": "concept",
                            "category": "Asociación Conceptual",
                            "tags": ["wikilink", "concepto"],
                            "summary": f"Nodo conceptual derivado de [[{target_name.strip()}]]",
                            "weight": 60,
                            "color": "#ec4899"
                        })
                        node_map[t_lower] = target_id
                
                edges.append({
                    "source": source_id,
                    "target": target_id,
                    "relation": "enlace_armonico",
                    "weight": 1.0
                })

        return {
            "nodes": nodes,
            "edges": edges,
            "branches": STARSEED_BRANCHES,
            "total_documents": len(self.documents),
            "total_nodes": len(nodes),
            "total_edges": len(edges)
        }

    def add_memory_node(self, node_data: Dict[str, Any]) -> Dict[str, Any]:
        concept = node_data.get("concept", "Concepto Sináptico")
        definition = node_data.get("definition", "")
        category = node_data.get("category", "General")
        doc_data = {
            "id": f"node_{int(time.time())}_{len(self.documents)}",
            "name": concept,
            "content": definition,
            "branch": "memory",
            "category": category,
            "tags": node_data.get("tags", ["StarSeed", "1.58b"]),
            "resonance": node_data.get("resonance", 0.95),
            "quantum_entropy": node_data.get("quantum_entropy", 0.75)
        }
        return self.create_or_update_document(doc_data)

    def get_all_nodes(self) -> List[Dict[str, Any]]:
        nodes = []
        for d in self.documents:
            nodes.append({
                "concept": d.get("name", ""),
                "definition": d.get("content", ""),
                "category": d.get("category", "General"),
                "resonance": d.get("resonance", 0.95),
                "id": d.get("id")
            })
        return nodes

starseed_memory = StarSeedMemoryEngine()
starseed_memory_engine = starseed_memory
