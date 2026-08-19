import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
from ..core.config import settings

class KnowledgeGraph:
    """
    Associative Semantic Knowledge Graph for Astraura 1.58-bit AI.
    Stores concepts, entities, and relationships with confidence weights that 
    continuously evolve and expand through background learning and document ingestion.
    """
    def __init__(self, persistence_file: Optional[Path] = None):
        self.file_path = persistence_file or (settings.data_path / "knowledge_graph" / "graph.json")
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.edges: List[Dict[str, Any]] = []
        self.load()

    def load(self):
        if self.file_path.exists():
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.nodes = data.get("nodes", {})
                    self.edges = data.get("edges", [])
            except Exception:
                self._init_defaults()
        else:
            self._init_defaults()

    def _init_defaults(self):
        # Seed foundational concepts of 1.58-bit AI and Astraura
        self.nodes = {
            "BitNet_b1_58": {
                "id": "BitNet_b1_58",
                "label": "BitNet b1.58",
                "category": "Architecture",
                "description": "Arquitectura de 1.58 bits con pesos ternarios {-1, 0, 1}.",
                "strength": 1.0,
                "updated_at": time.time()
            },
            "Ternary_Weights": {
                "id": "Ternary_Weights",
                "label": "Pesos Ternarios {-1, 0, 1}",
                "category": "Math",
                "description": "Reemplaza multiplicaciones (MatMul) por sumas y restas puras.",
                "strength": 1.0,
                "updated_at": time.time()
            },
            "Memory_Wall": {
                "id": "Memory_Wall",
                "label": "Muro de Memoria (Bandwidth)",
                "category": "Hardware",
                "description": "Cuello de botella en IA: mover datos de VRAM/RAM a registros.",
                "strength": 0.9,
                "updated_at": time.time()
            },
            "BitNet_cpp": {
                "id": "BitNet_cpp",
                "label": "bitnet.cpp",
                "category": "Engine",
                "description": "Framework de inferencia de Microsoft en C++ con aceleración SIMD/NEON.",
                "strength": 1.0,
                "updated_at": time.time()
            },
            "Astraura_Core": {
                "id": "Astraura_Core",
                "label": "Astraura Core",
                "category": "Orchestrator",
                "description": "Sistema cognitivo adaptable y consciente del entorno físico y digital.",
                "strength": 1.0,
                "updated_at": time.time()
            }
        }
        self.edges = [
            {"source": "BitNet_b1_58", "target": "Ternary_Weights", "relation": "utiliza", "weight": 1.0},
            {"source": "BitNet_b1_58", "target": "Memory_Wall", "relation": "rompe", "weight": 0.95},
            {"source": "BitNet_b1_58", "target": "BitNet_cpp", "relation": "ejecutado_por", "weight": 1.0},
            {"source": "Astraura_Core", "target": "BitNet_b1_58", "relation": "motor_cognitivo", "weight": 1.0}
        ]
        self.save()

    def save(self):
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump({"nodes": self.nodes, "edges": self.edges}, f, indent=2, ensure_ascii=False)

    def add_node(self, node_id: str, label: str, category: str = "Concept", description: str = "", strength: float = 0.5):
        clean_id = node_id.replace(" ", "_").strip()
        if clean_id in self.nodes:
            # Strengthen existing node
            self.nodes[clean_id]["strength"] = min(1.0, self.nodes[clean_id]["strength"] + 0.1)
            if description and len(description) > len(self.nodes[clean_id].get("description", "")):
                self.nodes[clean_id]["description"] = description
            self.nodes[clean_id]["updated_at"] = time.time()
        else:
            self.nodes[clean_id] = {
                "id": clean_id,
                "label": label or node_id,
                "category": category,
                "description": description,
                "strength": strength,
                "updated_at": time.time()
            }
        self.save()
        return clean_id

    def add_edge(self, source_id: str, target_id: str, relation: str = "relacionado_con", weight: float = 0.5):
        clean_src = source_id.replace(" ", "_").strip()
        clean_tgt = target_id.replace(" ", "_").strip()
        
        # Ensure both nodes exist
        if clean_src not in self.nodes:
            self.add_node(clean_src, clean_src)
        if clean_tgt not in self.nodes:
            self.add_node(clean_tgt, clean_tgt)

        for edge in self.edges:
            if edge["source"] == clean_src and edge["target"] == clean_tgt and edge["relation"] == relation:
                edge["weight"] = min(1.0, edge["weight"] + 0.1)
                self.save()
                return
                
        self.edges.append({
            "source": clean_src,
            "target": clean_tgt,
            "relation": relation,
            "weight": weight
        })
        self.save()

    def query_subgraph(self, query: str, limit: int = 15) -> Dict[str, Any]:
        """
        Finds relevant nodes and immediate connections matching a query.
        """
        q_lower = query.lower()
        matched_node_ids = set()
        
        for nid, node in self.nodes.items():
            if q_lower in node["label"].lower() or q_lower in node.get("description", "").lower():
                matched_node_ids.add(nid)

        if not matched_node_ids:
            # Return top strongest nodes
            sorted_nodes = sorted(self.nodes.values(), key=lambda x: x.get("strength", 0), reverse=True)
            matched_node_ids = {n["id"] for n in sorted_nodes[:5]}

        # Expand with 1-hop connected nodes
        connected_edges = []
        for edge in self.edges:
            if edge["source"] in matched_node_ids or edge["target"] in matched_node_ids:
                connected_edges.append(edge)
                matched_node_ids.add(edge["source"])
                matched_node_ids.add(edge["target"])

        sub_nodes = [self.nodes[nid] for nid in matched_node_ids if nid in self.nodes]
        return {
            "nodes": sub_nodes[:limit],
            "edges": connected_edges[:limit * 2]
        }

    def get_full_graph(self) -> Dict[str, Any]:
        return {
            "nodes": list(self.nodes.values()),
            "edges": self.edges,
            "total_nodes": len(self.nodes),
            "total_edges": len(self.edges)
        }

knowledge_graph = KnowledgeGraph()
