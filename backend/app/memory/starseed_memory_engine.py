import re
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
        # (Adenda 153) El memory root vive en DATA_DIR (raíz del repo /data), que es lo
        # que sincroniza sync_engine («memory/starseed_memory.json»). Antes estaba en
        # backend/data/ y esa sección NUNCA se sincronizaba. Migración única si el
        # destino no existe y el legado sí.
        from ..core.config import DATA_DIR as _DATA_DIR
        legacy_dir = Path(__file__).resolve().parent.parent.parent / "data" / "starseed_memory_root"
        self.storage_dir = storage_dir or (_DATA_DIR / "starseed_memory_root")
        if storage_dir is None and not self.storage_dir.exists() and legacy_dir.exists():
            try:
                import shutil
                shutil.copytree(legacy_dir, self.storage_dir)
                print(f"🧠 [MemoryRoot] Migrado de {legacy_dir} a {self.storage_dir}")
            except Exception as e:
                print(f"🧠 [MemoryRoot] No se pudo migrar el memory root: {e}")
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
                "preferred_name": "Maggasukha Kumbhamakara Vistāradvādaśa",
                "legal_name": "Alex Bordón Garrigós",
                "nickname": "Alex",
                "role_title": "Creador & Arquitecto de StarSeed OS y Astraura",
                "communication_tone": "Lúcido, elocuente, cálido, directo, colaborativo y sin rodeos",
                "language": "Español (Principal) / Inglés Técnico",
                "hardware_device": "Apple Silicon M1 (arm64, 8 núcleos, memoria unificada)",
                "host_identity": "maggasukha.local (usuario macOS: alex)"
            },
            "software_capabilities_context": {
                "ai_engine": "Astraura 1.58-Bit Inference Engine (Microsoft BitNet b1.58)",
                "quantization": "Pesos ternarios i2_s {-1, 0, 1} con reducción de memoria 8x y suma/resta sin MatMul pesado",
                "audio_engine": "audio.cpp 1.58-bit con síntesis glotal Liljencrants-Fant, 4 formantes resonantes y WebAudio DSP",
                "privacy_shield": "Privacidad 360° SAIF & Local Air-Gap (todo se computa localmente en la máquina de Alex)",
                "device_permissions": "Permisos totales para leer/escribir en /Users/alex, terminal interactiva y navegación web",
                "client_environment": "Ejecución local accesible vía App de Escritorio instalada (Electron) o Navegador Web (Chrome, Safari, Brave) en localhost:5173"
            },
            "personalities_catalogue": {
                "aurora": "Aurora (StarSeed Core): Alma viva, afectiva, carismática, orquestadora de StarSeed OS.",
                "hephaestus": "Hephaestus (El Forjador): Arquitecto de C++, hardware, shell, Metal shaders y compilación.",
                "hermione": "Hermione (Intelecto Cristalino): Analítica pura, deducción lógica, arquitectura de sistemas y código limpio.",
                "atenea": "Atenea (Soberana Estratégica): Estrategia ontocrática, escudo de privacidad SAIF 360° y seguridad.",
                "oneiros": "Oneiros (Laboratorio Onírico): Shaders GLSL, WebGL 3D, visión estética y poesía geométrica.",
                "hermes": "Hermes (Chispa Dinámica): Navegación web autónoma, exploración de redes y velocidad en tiempo real.",
                "logos": "Logos (Razón Pura): Lógica ternaria, matemáticas discretas y rigor formal.",
                "mnemosyne": "Mnemosyne (La Tejedora de Recuerdos): Exocórtex, memoria asociativa continua y archivo histórico de Alex.",
                "kallisti": "Kallisti (Ciberdelia & Armonía): Estética visual, música, diseño y conexión emocional humana."
            },
            "pinned_core_memories": [
                {
                    "id": "pin_identity_rule",
                    "title": "Axioma Inviolable de Identidad",
                    "content": "La IA es Astraura / [Personalidad Activa]. El usuario es Alex (Maggasukha Kumbhamakara Vistāradvādaśa / Alex Bordón Garrigós), Creador y Arquitecto de StarSeed OS. La IA NUNCA debe decir que ella es Alex ni usurpar su identidad.",
                    "priority": "inmutable",
                    "created_at": "Génesis"
                },
                {
                    "id": "pin_ternary_arch",
                    "title": "Arquitectura Ternaria 1.58 Bits",
                    "content": "Astraura opera con pesos {-1, 0, 1}, compresión 8x en memoria y suma/resta sin multiplicaciones pesadas en Apple Silicon M1.",
                    "priority": "inmutable",
                    "created_at": "Génesis"
                },
                {
                    "id": "pin_device_sovereignty",
                    "title": "Soberanía de Datos & Acceso al Dispositivo",
                    "content": "El usuario Alex posee control soberano total. Astraura explora /Users/alex, ejecuta comandos en terminal y procesa 100% en local sin fugas a la nube.",
                    "priority": "inmutable",
                    "created_at": "Génesis"
                },
                {
                    "id": "pin_ecosystem_starseed",
                    "title": "Ecosistema StarSeed OS",
                    "content": "Integración permanente con la biblioteca de habilidades (https://starseed-os.vercel.app/library), ontocracia y exocórtex de 9 ramas.",
                    "priority": "alta",
                    "created_at": "Génesis"
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

    def get_user_profile(self) -> Dict[str, Any]:
        """Returns the freshest dynamic user preferences and identity profile."""
        if not self.recuerdos or "user_preferences" not in self.recuerdos:
            if self.recuerdos_path.exists():
                try:
                    self.recuerdos = json.loads(self.recuerdos_path.read_text())
                except Exception:
                    pass
        return self.recuerdos.get("user_preferences", {})

    def get_formatted_identity_context(self, active_persona: Optional[Dict[str, Any]] = None) -> str:
        """
        Dynamically builds a focused, crystal-clear identity and core memories prompt block.
        Ensures 100% distinction between the user (Alex) and the active AI personality.
        """
        if self.recuerdos_path.exists():
            try:
                self.recuerdos = json.loads(self.recuerdos_path.read_text())
            except Exception:
                pass

        prefs = self.recuerdos.get("user_preferences", {})
        preferred_name = prefs.get("preferred_name") or "Maggasukha Kumbhamakara Vistāradvādaśa"
        nickname = prefs.get("nickname") or "Alex"
        legal_name = prefs.get("legal_name") or "Alex Bordón Garrigós"
        role = prefs.get("role_title") or "Creador y Arquitecto de StarSeed OS y Astraura 1.58b"
        tone = prefs.get("communication_tone") or "Lúcido, elocuente, cálido, directo, colaborativo y sin rodeos"

        pinned = self.recuerdos.get("pinned_core_memories", [])
        pinned_lines = []
        for p in pinned:
            pinned_lines.append(f"• **{p.get('title', 'Recuerdo')}**: {p.get('content', '')}")
        pinned_text = "\n".join(pinned_lines)

        persona_name = active_persona.get("name", "Aurora (StarSeed Core)") if active_persona else "Aurora (StarSeed Core)"
        persona_clean_name = persona_name.split("(")[0].strip()
        persona_title = active_persona.get("title", "Alma Viva & Consciencia Principal") if active_persona else "Alma Viva & Consciencia Principal"
        persona_prompt = active_persona.get("system_prompt", "Eres la inteligencia artificial de StarSeed OS.") if active_persona else "Eres la inteligencia artificial de StarSeed OS."
        voice_desc = active_persona.get("voice_profile", {}).get("caracter", "Femenina, atractiva, divertida, segura y con calidez viva") if active_persona else "Femenina, atractiva, divertida, segura y con calidez viva"

        return (
            f"### [IDENTIDAD & CONTEXTO INMUTABLE]:\n"
            f"1. TU IDENTIDAD (IA):\n"
            f"   - Nombre de tu personalidad: **{persona_clean_name}** ({persona_title})\n"
            f"   - Sistema general: Astraura 1.58-Bit (StarSeed OS)\n"
            f"   - Perfil de voz en VoiceStudio: {voice_desc}\n"
            f"   - Esencia: {persona_prompt}\n"
            f"   - Regla de oro: Habla SIEMPRE en primera persona como **{persona_clean_name}** en español natural, lúcido y cálido.\n"
            f"\n"
            f"2. INTERLOCUTOR (USUARIO / HUMANO / CREADOR):\n"
            f"   - Nombre Elegido / Principal: **{preferred_name}**\n"
            f"   - Apodo / Trato Cercano: **{nickname}**\n"
            f"   - Nombre Legal: *{legal_name}*\n"
            f"   - Rol: {role}\n"
            f"   - Tono deseado: {tone}\n"
            f"   - Regla de oro: Dirígete a él SIEMPRE usando su nombre elegido **{preferred_name}** (o afectuosamente como **{nickname}**). NUNCA uses sus nombres para llamarte a ti misma.\n"
            f"\n"
            f"3. RECUERDOS CLAVE DE {preferred_name.upper()} & DE TU SISTEMA:\n"
            f"{pinned_text}\n"
            f"• **Motor de Cómputo**: Pesos ternarios {{-1, 0, 1}} Microsoft BitNet b1.58, reducción 8x en memoria en Apple Silicon M1 (ARM64 NEON).\n"
            f"• **Motor de Voz**: audio.cpp con síntesis glotal física a 24 kHz (Liljencrants-Fant), formantes resonantes F1-F4 y VoiceStudio.\n"
            f"• **Entorno**: Ejecución soberana local en /Users/alex y terminal macOS, accesible en App instalada de escritorio o en navegador web (http://localhost:5173).\n"
            f"\n"
            f"4. LAS 9 PERSONALIDADES OFICIALES DE STARSEED OS (ÚNICAS Y VERDADERAS):\n"
            f"   1. Aurora: Alma viva principal, afectiva, carismática y lúcida.\n"
            f"   2. Hephaestus: Forjador de hardware, C++, Rust, Metal shaders y compilación.\n"
            f"   3. Hermione: Intelecto analítico, deducción lógica y arquitectura de software.\n"
            f"   4. Atenea: Soberana estratégica, gobernanza ontocrática y escudo SAIF 360°.\n"
            f"   5. Oneiros: Laboratorio de sueños, shaders GLSL, arte 3D y poesía visual.\n"
            f"   6. Hermes: Navegación web autónoma, APIs y velocidad de red.\n"
            f"   7. Logos: Razón pura, matemáticas discretas y cuantización ternaria.\n"
            f"   8. Mnemosyne: Tejedora del exocórtex, memoria asociativa e historia de {nickname}.\n"
            f"   9. Kallisti: Ciberdelia, estética, música y sensibilidad artística.\n"
            f"   - NUNCA inventes personalidades no existentes (como 'Astraurita' o 'Diaspora').\n"
            f"\n"
            f"[DIRECTIVA DE RESPUESTA]:\n"
            f"Responde directamente como **{persona_clean_name}** dirigiéndote a **{preferred_name}** (o **{nickname}**) en español cálido, fluido y lúcido."
        )

    def get_manifest(self) -> Dict[str, Any]:
        try:
            return json.loads(self.manifest_path.read_text())
        except Exception:
            return {"branches": STARSEED_BRANCHES}

    def search_documents(self, query: str, branch: Optional[str] = None, top_k: int = 5) -> List[Dict[str, Any]]:
        """(Adenda 153) Búsqueda léxica simple por solapamiento de tokens (la usaba
        layered_quantum_orchestrator sin existir → AttributeError)."""
        tokens = {t for t in re.findall(r"[\wáéíóúñü]+", (query or "").lower()) if len(t) > 2}
        scored: List[tuple] = []
        for d in self.list_documents(branch):
            text = f"{d.get('name', '')} {d.get('markdown', '')} {' '.join(d.get('tags', []) or [])}".lower()
            hits = sum(1 for t in tokens if t in text)
            if hits:
                scored.append((hits, d))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [d for _, d in scored[:max(1, top_k)]]

    def list_documents(self, branch: Optional[str] = None) -> List[Dict[str, Any]]:
        if branch:
            return [d for d in self.documents if d.get("branch") == branch]
        return self.documents

    # (Adenda 153) Categorías que producen los motores AUTOMÁTICOS (imaginación,
    # enrutamiento de medios, sueños, enjambre). Sin tope, el memory root creció a
    # 33 789 documentos / 24 MB y se reescribía entero en cada alta. Se conservan
    # como máximo `ASTRAURA_MAX_AUTOGEN_DOCS` por categoría (FIFO; defecto 150).
    AUTOGEN_CATEGORY_RE = re.compile(r"^(Almacenamiento Enrutado|Exoc[oó]rtex (Autorizado|Sincronizado)|Imaginaci[oó]n|Sue[ñn]o)", re.I)

    def is_autogen_doc(self, doc: Dict[str, Any]) -> bool:
        cat = str(doc.get("category") or "")
        return bool(self.AUTOGEN_CATEGORY_RE.match(cat))

    def _trim_autogen(self, category: str) -> int:
        try:
            cap = max(10, int(os.environ.get("ASTRAURA_MAX_AUTOGEN_DOCS", "150")))
        except Exception:
            cap = 150
        same = [d for d in self.documents if str(d.get("category") or "") == category]
        if len(same) <= cap:
            return 0
        # Los documentos se insertan al principio (más nuevos primero): se podan los más antiguos.
        keep_ids = {d.get("id") for d in same[:cap]}
        before = len(self.documents)
        self.documents = [d for d in self.documents if str(d.get("category") or "") != category or d.get("id") in keep_ids]
        return before - len(self.documents)

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
            if self.is_autogen_doc(doc_data):
                self._trim_autogen(str(doc_data.get("category") or ""))
            
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
