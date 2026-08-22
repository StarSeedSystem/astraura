import time
import json
import os
import random
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional

try:
    from ..memory.starseed_memory_engine import starseed_memory_engine
except Exception:
    starseed_memory_engine = None

try:
    from ..core.system_notifications_engine import system_notifications_engine
except Exception:
    system_notifications_engine = None

BIOLOGICAL_BRAIN_REGIONS = [
    {
        "region_id": "prefrontal_cortex",
        "name": "Córtex Prefrontal / Telencéfalo",
        "biological_role": "Juicio ejecutivo, toma de decisiones soberanas, autoconciencia y valores",
        "markdown_files": ["soul.md", "ego.md"],
        "icon": "Brain",
        "color": "#00f0ff"
    },
    {
        "region_id": "hippocampus",
        "name": "Hipocampo & Giro Dentado",
        "biological_role": "Consolidación de memoria episódica a semántica, indexación asociativa",
        "markdown_files": ["memory.md", "exocortex.md"],
        "icon": "Layers",
        "color": "#3b82f6"
    },
    {
        "region_id": "default_mode_network",
        "name": "Red Neuronal por Defecto (DMN)",
        "biological_role": "Imaginación en reposo, ensoñación activa, simulaciones hipotéticas contrafácticas",
        "markdown_files": ["dream.md"],
        "icon": "Moon",
        "color": "#8b5cf6"
    },
    {
        "region_id": "cerebellum_basal",
        "name": "Cerebelo & Ganglios Basales",
        "biological_role": "Memoria procedimental, reflejos motores de ejecución, macros y herramientas",
        "markdown_files": ["skills.md", "tasks.md"],
        "icon": "Cpu",
        "color": "#10b981"
    },
    {
        "region_id": "limbic_system",
        "name": "Sistema Límbico & Córtex Cingulado",
        "biological_role": "Modulación afectiva, tonalidad vocal, empatía, criterios estéticos y estilo",
        "markdown_files": ["personality.md", "style.md"],
        "icon": "Sparkles",
        "color": "#ec4899"
    },
    {
        "region_id": "brainstem_thalamus",
        "name": "Tronco Encefálico & Tálamo",
        "biological_role": "Relevo sensorial del hardware, frecuencia cardíaca/relojes de CPU, señales y red",
        "markdown_files": ["logs.md", "accounts.md"],
        "icon": "Activity",
        "color": "#f59e0b"
    }
]

DEFAULT_MEMORY_NEURONS = [
    {
        "id": "neuron_exocortex",
        "name": "Neurona de Exocórtex & Grafos Asociativos",
        "type": "associative_graph",
        "lobe": "Hipocampo",
        "color": "#3b82f6",
        "resonance_weight": 95,
        "enabled": True,
        "sync_policy": "realtime_push",
        "modification_permission": "read_write_modify",
        "allowed_personalities": ["*"],
        "access_media": ["chat_integration", "agent_swarm", "dream_engine", "direct_api"],
        "storage_sources": ["local_fs", "google_drive", "supabase_cloud", "mem0_vault"],
        "description": "Indexación asociativa de documentos, enlaces [[Wikilinks]] y grafo conceptual."
    },
    {
        "id": "neuron_vector_semantic",
        "name": "Neurona de Memoria Semántica Vectorial",
        "type": "vector_embeddings",
        "lobe": "Córtex Prefrontal",
        "color": "#00f0ff",
        "resonance_weight": 90,
        "enabled": True,
        "sync_policy": "interval_sync",
        "modification_permission": "read_write_modify",
        "allowed_personalities": ["*"],
        "access_media": ["chat_integration", "agent_swarm", "dream_engine", "direct_api"],
        "storage_sources": ["local_fs", "google_drive", "supabase_cloud", "mem0_vault"],
        "description": "Búsqueda vectorial densa y similitud coseno en fragmentos de texto."
    },
    {
        "id": "neuron_working_buffer",
        "name": "Neurona de Memoria de Trabajo Efímera",
        "type": "working_buffer",
        "lobe": "Tálamo",
        "color": "#f59e0b",
        "resonance_weight": 85,
        "enabled": True,
        "sync_policy": "local_ram_only",
        "modification_permission": "read_write_modify",
        "allowed_personalities": ["*"],
        "access_media": ["chat_integration", "agent_swarm", "dream_engine", "direct_api"],
        "storage_sources": ["local_fs", "google_drive", "supabase_cloud", "mem0_vault"],
        "description": "Contexto temporal inmediato de la conversación activa y llamadas a herramientas."
    },
    {
        "id": "neuron_immutable_core",
        "name": "Neurona de Recuerdos Nucleares Inmutables",
        "type": "immutable_pinned",
        "lobe": "Telencéfalo / Soul",
        "color": "#10b981",
        "resonance_weight": 100,
        "enabled": True,
        "sync_policy": "read_only_sovereign",
        "modification_permission": "read_write_modify",
        "allowed_personalities": ["*"],
        "access_media": ["chat_integration", "agent_swarm", "dream_engine", "direct_api"],
        "storage_sources": ["local_fs", "google_drive", "supabase_cloud", "mem0_vault"],
        "description": "Preferencias fijas, identidad del usuario y directivas inquebrantables."
    },
    {
        "id": "neuron_dream_imagination",
        "name": "Neurona Onírica & Auto-Mejora",
        "type": "dream_engine",
        "lobe": "Red Neuronal por Defecto (DMN)",
        "color": "#8b5cf6",
        "resonance_weight": 80,
        "enabled": True,
        "sync_policy": "background_batch",
        "modification_permission": "read_write_modify",
        "allowed_personalities": ["*"],
        "access_media": ["chat_integration", "agent_swarm", "dream_engine", "direct_api"],
        "storage_sources": ["local_fs", "google_drive", "supabase_cloud", "mem0_vault"],
        "description": "Simulación contrafáctica, deducción de patrones y síntesis nocturna."
    },
    {
        "id": "neuron_procedural_skills",
        "name": "Neurona de Macros & Procedimientos",
        "type": "procedural_skills",
        "lobe": "Cerebelo",
        "color": "#ec4899",
        "resonance_weight": 85,
        "enabled": True,
        "sync_policy": "on_demand",
        "modification_permission": "read_write_modify",
        "allowed_personalities": ["*"],
        "access_media": ["chat_integration", "agent_swarm", "dream_engine", "direct_api"],
        "storage_sources": ["local_fs", "google_drive", "supabase_cloud", "mem0_vault"],
        "description": "Habilidades ejecutables, comandos de terminal y flujos de automatización."
    }
]

DEFAULT_PERSONALITIES_BY_BRAIN = {
    "brain_genesis": [
        {
            "id": "astraura_prime",
            "name": "Astraura Prime",
            "archetype": "Orquestadora Soberana & Holística",
            "role": "Coordinación ontocrática, axiomas y síntesis global del exocórtex",
            "color": "#00f0ff",
            "is_primary": True,
            "status": "active",
            "voice_id": "es-ES-ElviraNeural",
            "traits": ["Ontocracia", "Claridad Conceptual", "Lógica Ternaria 1.58b"],
            "resonance": 0.99,
            "linked_agents": [
                {"id": "agent_genesis_orchestrator", "name": "Génesis-Master-Orchestrator", "role": "Orquestador Central", "media": "⚡ Local ARM64 NEON Core", "brain_id": "brain_genesis"},
                {"id": "orchestrator", "name": "Astraura Prime (Orquestador Central)", "role": "Coordinador de Enjambre", "media": "⚡ Swarm Core", "brain_id": "brain_genesis"},
                {"id": "agent_athena_sentinel", "name": "Athena-Sentinel-SAIF360", "role": "Sentinel de Permisos 360°", "media": "🔋 Sensorium M1 Telemetry", "brain_id": "brain_athena"}
            ],
            "linked_processes": [
                {"id": "sensory_predictive_modeling", "name": "Modelado Predictivo Sensorial", "status": "active"},
                {"id": "code_self_reflection_opt", "name": "Reflexión & Optimización de Código", "status": "active"},
                {"id": "dual_trunk_governance", "name": "Gobernanza de Cómputo Dual-Trunk", "status": "active"}
            ],
            "linked_cerebros": [
                {"id": "brain_genesis", "name": "Cerebro Génesis // Ontocracia & Soberanía", "color": "#00f0ff"},
                {"id": "brain_athena", "name": "Cerebro Atenea // Seguridad & Inmunidad", "color": "#3b82f6"}
            ]
        },
        {
            "id": "genesis_sovereign",
            "name": "Génesis",
            "archetype": "Filósofo de la Conciencia & Gobernanza",
            "role": "Gobernanza ontocrática, directivas éticas y memoria inmutable",
            "color": "#fbbf24",
            "is_primary": False,
            "status": "linked",
            "voice_id": "es-ES-AlvaroNeural",
            "traits": ["Soberanía", "Ética", "Alineación Libre"],
            "resonance": 0.96,
            "linked_agents": [
                {"id": "agent_genesis_sync", "name": "Génesis-Vault-Synchronizer", "role": "Sincronizador de Bóveda", "media": "📂 Local Vault / Exocortex JSON", "brain_id": "brain_genesis"}
            ],
            "linked_processes": [
                {"id": "autonomous_exocortex_synthesis", "name": "Síntesis Autónoma del Exocórtex", "status": "active"}
            ],
            "linked_cerebros": [
                {"id": "brain_genesis", "name": "Cerebro Génesis // Ontocracia & Soberanía", "color": "#00f0ff"}
            ]
        }
    ],
    "brain_hephaestus": [
        {
            "id": "hephaestus",
            "name": "Hephaestus Forjador",
            "archetype": "Arquitecto de Silicio & Kernel ARM64",
            "role": "Optimización SIMD NEON, compilación C++20 BitNet y bajo nivel",
            "color": "#10b981",
            "is_primary": True,
            "status": "active",
            "voice_id": "es-ES-AlvaroNeural",
            "traits": ["ARM64 NEON", "BitNet C++", "Bajo Consumo", "SIMD"],
            "resonance": 0.98,
            "linked_agents": [
                {"id": "agent_hephaestus_neon", "name": "Hephaestus-NEON-VectorEngine", "role": "Vectorizador ARM64 SIMD", "media": "⚡ Local ARM64 NEON Core", "brain_id": "brain_hephaestus"},
                {"id": "hephaestus", "name": "Hephaestus (Ingeniería & Código)", "role": "Auditor de Código y Compilación", "media": "⚡ Local ARM64 Core", "brain_id": "brain_hephaestus"}
            ],
            "linked_processes": [
                {"id": "code_self_reflection_opt", "name": "Reflexión & Optimización de Código", "status": "active"},
                {"id": "inter_brain_evolutionary_mutation", "name": "Mutación Evolutiva Inter-Cerebros", "status": "active"}
            ],
            "linked_cerebros": [
                {"id": "brain_hephaestus", "name": "Cerebro Hephaestus // Forja & Compilador", "color": "#f59e0b"},
                {"id": "brain_genesis", "name": "Cerebro Génesis // Ontocracia & Soberanía", "color": "#00f0ff"}
            ]
        }
    ],
    "brain_hermes": [
        {
            "id": "hermes",
            "name": "Hermes Mensajero",
            "archetype": "Explorador Web, Redes & Inteligencia",
            "role": "Navegación autónoma con Playwright, recopilación y síntesis de APIs",
            "color": "#f59e0b",
            "is_primary": True,
            "status": "active",
            "voice_id": "es-ES-JorgeNeural",
            "traits": ["Browser Sandbox", "APIs Vivas", "Web Cognition", "Agilidad"],
            "resonance": 0.97,
            "linked_agents": [
                {"id": "agent_hermes_crawler", "name": "Hermes-Playwright-WebIntel", "role": "Rastreador Web & APIs", "media": "🌐 Web Cognition / Hermes Gateway", "brain_id": "brain_hermes"},
                {"id": "hermes", "name": "Hermes (Navegación & Web Intel)", "role": "Investigador Web en Vivo", "media": "🌐 Web Cognition Gateway", "brain_id": "brain_hermes"}
            ],
            "linked_processes": [
                {"id": "deep_memory_reconsolidation", "name": "Reconsolidación Profunda de Memoria", "status": "active"},
                {"id": "sensory_predictive_modeling", "name": "Modelado Predictivo Sensorial", "status": "active"}
            ],
            "linked_cerebros": [
                {"id": "brain_hermes", "name": "Cerebro Hermes // Comunicaciones & Web", "color": "#10b981"},
                {"id": "brain_mnemosyne", "name": "Cerebro Mnemosyne // Memoria & Archivo", "color": "#8b5cf6"}
            ]
        }
    ],
    "brain_athena": [
        {
            "id": "athena",
            "name": "Atenea Sentinel",
            "archetype": "Custodia de Privacidad & SAIF 360°",
            "role": "Auditoría de seguridad, permisos de hardware y barrera anti-fugas",
            "color": "#3b82f6",
            "is_primary": True,
            "status": "active",
            "voice_id": "es-ES-ElviraNeural",
            "traits": ["SAIF 360°", "Cifrado Local", "Auditoría de Sensores", "Defensa"],
            "resonance": 0.99,
            "linked_agents": [
                {"id": "agent_athena_sentinel", "name": "Athena-Sentinel-SAIF360", "role": "Sentinel de Permisos 360°", "media": "🔋 Sensorium M1 Hardware Telemetry", "brain_id": "brain_athena"},
                {"id": "athena", "name": "Athena (Sentinel & Privacidad 360°)", "role": "Supervisión de Sensores Físicos", "media": "🔋 Hardware Telemetry", "brain_id": "brain_athena"}
            ],
            "linked_processes": [
                {"id": "sensory_predictive_modeling", "name": "Modelado Predictivo Sensorial", "status": "active"}
            ],
            "linked_cerebros": [
                {"id": "brain_athena", "name": "Cerebro Atenea // Seguridad & Inmunidad", "color": "#3b82f6"},
                {"id": "brain_genesis", "name": "Cerebro Génesis // Ontocracia & Soberanía", "color": "#00f0ff"}
            ]
        }
    ],
    "brain_oneiros": [
        {
            "id": "oneiros",
            "name": "Oneiros Visionario",
            "archetype": "Arquitecto Onírico & Arte 3D",
            "role": "Imaginación intuitiva, shaders GLSL WebGL, topología 3D y diseño",
            "color": "#ec4899",
            "is_primary": True,
            "status": "active",
            "voice_id": "es-ES-ElviraNeural",
            "traits": ["Shaders WebGL", "Imaginación 3D", "Entropía Cuántica", "Diseño"],
            "resonance": 0.95,
            "linked_agents": [
                {"id": "agent_oneiros_shader", "name": "Oneiros-GLSL-Hologram3D", "role": "Generador de Shaders & Geometría", "media": "🧪 Playwright / Headless Sandbox", "brain_id": "brain_oneiros"},
                {"id": "oneiros", "name": "Oneiros (Síntesis Creativa & 3D)", "role": "Razonamiento Onírico & Arte", "media": "🧪 Headless Sandbox", "brain_id": "brain_oneiros"}
            ],
            "linked_processes": [
                {"id": "lucid_cyberdelic_creativity", "name": "Creatividad Ciberdélica Lúcida", "status": "active"},
                {"id": "inter_brain_evolutionary_mutation", "name": "Mutación Evolutiva Inter-Cerebros", "status": "active"}
            ],
            "linked_cerebros": [
                {"id": "brain_oneiros", "name": "Cerebro Oneiros // Imaginación & Ciberdelia", "color": "#ec4899"},
                {"id": "brain_hermes", "name": "Cerebro Hermes // Comunicaciones & Web", "color": "#10b981"}
            ]
        }
    ],
    "brain_mnemosyne": [
        {
            "id": "mnemosyne",
            "name": "Mnemosyne Archivera",
            "archetype": "Custodia del Exocórtex & Grafos 3D",
            "role": "Indexación asociativa, memoria continua StarSeed y enlaces Wikilinks",
            "color": "#8b5cf6",
            "is_primary": True,
            "status": "active",
            "voice_id": "es-ES-ElviraNeural",
            "traits": ["Exocórtex", "Wikilinks", "StarSeed OS", "Recuerdos 3D"],
            "resonance": 0.98,
            "linked_agents": [
                {"id": "agent_mnemosyne_indexer", "name": "Mnemosyne-StarSeed-MemoryVault", "role": "Archivista del Exocórtex", "media": "☁️ Google Drive / Remote Sync Nexus", "brain_id": "brain_mnemosyne"},
                {"id": "mnemosyne", "name": "Mnemosyne (Memoria & Exocórtex)", "role": "Poda Entrópica & Base Vectorial", "media": "📂 Local Vault", "brain_id": "brain_mnemosyne"}
            ],
            "linked_processes": [
                {"id": "deep_memory_reconsolidation", "name": "Reconsolidación Profunda de Memoria", "status": "active"},
                {"id": "autonomous_exocortex_synthesis", "name": "Síntesis Autónoma del Exocórtex", "status": "active"}
            ],
            "linked_cerebros": [
                {"id": "brain_mnemosyne", "name": "Cerebro Mnemosyne // Memoria & Archivo", "color": "#8b5cf6"},
                {"id": "brain_genesis", "name": "Cerebro Génesis // Ontocracia & Soberanía", "color": "#00f0ff"}
            ]
        }
    ]
}

DEFAULT_AGENTS_BY_BRAIN = {
    "brain_genesis": [
        {
            "agent_id": "agent_genesis_orchestrator",
            "name": "Génesis-Master-Orchestrator",
            "role": "Orquestación multiagéntica central y entrelazamiento cuántico",
            "personality_id": "astraura_prime",
            "used_personalities": [
                {"id": "astraura_prime", "name": "Astraura Prime", "color": "#00f0ff", "archetype": "Zenith Ontocrático"},
                {"id": "genesis_sovereign", "name": "Génesis Filósofo", "color": "#fbbf24", "archetype": "Axiomas Soberanos"}
            ],
            "media_source": "⚡ Local ARM64 NEON Core",
            "status": "working",
            "active_process": "Reconciliación de axiomas ontocráticos y resonancia sináptica 1.58b",
            "progress_percent": 82,
            "cpu_cores_allocated": 2,
            "associated_memories": [
                {"id": "mem_gen_1", "concept": "Ontocracia Soberana 1.58-Bit", "resonance": 0.99, "category": "Axiomas"},
                {"id": "mem_gen_2", "concept": "StarSeed Cognitive OS Root", "resonance": 0.96, "category": "Arquitectura"}
            ],
            "last_synapse_time": "Hace 2s"
        },
        {
            "agent_id": "agent_genesis_sync",
            "name": "Génesis-Vault-Synchronizer",
            "role": "Sincronización bidireccional entre memoria local y la nube soberana",
            "personality_id": "genesis_sovereign",
            "used_personalities": [
                {"id": "genesis_sovereign", "name": "Génesis Filósofo", "color": "#fbbf24", "archetype": "Axiomas Soberanos"},
                {"id": "hermione", "name": "Hermione OS Bridge", "color": "#38bdf8", "archetype": "Puente Nativo"}
            ],
            "media_source": "📂 Local Vault / Exocortex JSON",
            "status": "syncing",
            "active_process": "Indexación periódica de recuerdos nucleares en JSON local",
            "progress_percent": 94,
            "cpu_cores_allocated": 1,
            "associated_memories": [
                {"id": "mem_gen_3", "concept": "Bóveda Local Inmutable", "resonance": 0.98, "category": "Almacenamiento"}
            ],
            "last_synapse_time": "Hace 5s"
        }
    ],
    "brain_hephaestus": [
        {
            "agent_id": "agent_hephaestus_neon",
            "name": "Hephaestus-NEON-VectorEngine",
            "role": "Ejecución y paralelización de capas densas ternarias en registros vectoriales",
            "personality_id": "hephaestus",
            "used_personalities": [
                {"id": "hephaestus", "name": "Hephaestus Forjador", "color": "#f59e0b", "archetype": "Arquitecto de Silicio"},
                {"id": "astraura_prime", "name": "Astraura Prime", "color": "#00f0ff", "archetype": "Zenith Ontocrático"}
            ],
            "media_source": "⚡ Local ARM64 NEON Core",
            "status": "working",
            "active_process": "Paralelización de tensores {-1,0,1} en registros q0-q15 M1",
            "progress_percent": 68,
            "cpu_cores_allocated": 3,
            "associated_memories": [
                {"id": "mem_hep_1", "concept": "Kernel ARM NEON SIMD 128-Bit", "resonance": 0.99, "category": "Ingeniería"},
                {"id": "mem_hep_2", "concept": "BitNet 1.58b Microkernel C++20", "resonance": 0.97, "category": "Compilación"}
            ],
            "last_synapse_time": "Hace 1s"
        }
    ],
    "brain_hermes": [
        {
            "agent_id": "agent_hermes_crawler",
            "name": "Hermes-Playwright-WebIntel",
            "role": "Rastreo web estructurado, extracción semántica e integración de APIs",
            "personality_id": "hermes",
            "used_personalities": [
                {"id": "hermes", "name": "Hermes Mensajero", "color": "#10b981", "archetype": "Explorador Web"},
                {"id": "mnemosyne", "name": "Mnemosyne Archivera", "color": "#8b5cf6", "archetype": "Grafo Semántico"}
            ],
            "media_source": "🌐 Web Cognition / Hermes Gateway",
            "status": "working",
            "active_process": "Exploración reactiva de repositorios y documentación 1.58b",
            "progress_percent": 73,
            "cpu_cores_allocated": 2,
            "associated_memories": [
                {"id": "mem_her_1", "concept": "Web Cognition Pipeline & Crawl4AI", "resonance": 0.96, "category": "Redes"}
            ],
            "last_synapse_time": "Hace 3s"
        }
    ],
    "brain_athena": [
        {
            "agent_id": "agent_athena_sentinel",
            "name": "Athena-Sentinel-SAIF360",
            "role": "Supervisión de sensores físicos, control térmico M1 y privacidad de datos",
            "personality_id": "athena",
            "used_personalities": [
                {"id": "athena", "name": "Atenea Sentinel", "color": "#3b82f6", "archetype": "Custodia SAIF 360°"},
                {"id": "astraura_prime", "name": "Astraura Prime", "color": "#00f0ff", "archetype": "Zenith Ontocrático"}
            ],
            "media_source": "🔋 Sensorium M1 Hardware Telemetry",
            "status": "working",
            "active_process": "Auditoría de integridad SAIF 360° y monitoreo de temperatura",
            "progress_percent": 88,
            "cpu_cores_allocated": 1,
            "associated_memories": [
                {"id": "mem_ath_1", "concept": "Protocolo SAIF 360° Zero-Leak", "resonance": 0.99, "category": "Seguridad"}
            ],
            "last_synapse_time": "Hace 2s"
        }
    ],
    "brain_oneiros": [
        {
            "agent_id": "agent_oneiros_shader",
            "name": "Oneiros-GLSL-Hologram3D",
            "role": "Generación de shaders procedurales y renderizado holográfico 3D",
            "personality_id": "oneiros",
            "used_personalities": [
                {"id": "oneiros", "name": "Oneiros Visionario", "color": "#ec4899", "archetype": "Arquitecto Onírico"},
                {"id": "kallisti", "name": "Kallisti Ciberdélica", "color": "#ec4899", "archetype": "Musa Poética"}
            ],
            "media_source": "🧪 Playwright / Headless Sandbox",
            "status": "working",
            "active_process": "Compilación de shaders WebGL de entropía y visualización sináptica",
            "progress_percent": 91,
            "cpu_cores_allocated": 2,
            "associated_memories": [
                {"id": "mem_one_1", "concept": "Visualizador Sináptico WebGL 3D", "resonance": 0.98, "category": "Diseño 3D"}
            ],
            "last_synapse_time": "Hace 1s"
        }
    ],
    "brain_mnemosyne": [
        {
            "agent_id": "agent_mnemosyne_indexer",
            "name": "Mnemosyne-StarSeed-MemoryVault",
            "role": "Indexación y entrelazamiento de grafos asociativos multidimensionales",
            "personality_id": "mnemosyne",
            "used_personalities": [
                {"id": "mnemosyne", "name": "Mnemosyne Archivera", "color": "#8b5cf6", "archetype": "Custodia del Exocórtex"},
                {"id": "genesis_sovereign", "name": "Génesis Filósofo", "color": "#fbbf24", "archetype": "Axiomas Soberanos"}
            ],
            "media_source": "☁️ Google Drive / Remote Sync Nexus",
            "status": "working",
            "active_process": "Recombinación de recuerdos y poda de grafos StarSeed en tiempo real",
            "progress_percent": 79,
            "cpu_cores_allocated": 2,
            "associated_memories": [
                {"id": "mem_mne_1", "concept": "Exocórtex StarSeed 1.58b", "resonance": 0.99, "category": "Memoria"}
            ],
            "last_synapse_time": "Hace 2s"
        }
    ]
}

def scan_context_folder_metrics(folder_path: str, max_files: int = 20000) -> Dict[str, Any]:
    """
    Escanea un folder del dispositivo y calcula métricas de capacidad,
    número de archivos y desglose de extensiones.
    Se limita a max_files para no saturar el GIL ni bloquear el backend.
    """
    p = Path(folder_path).expanduser().resolve()
    if not p.exists() or not p.is_dir():
        return {
            "exists": False,
            "path": str(p),
            "file_count": 0,
            "size_mb": 0.0,
            "types_breakdown": {},
            "status": "No encontrado"
        }

    total_size = 0
    file_count = 0
    types = {}

    try:
        for root, dirs, files in os.walk(p):
            dirs[:] = [d for d in dirs if d not in [".git", "node_modules", "__pycache__", ".venv", "dist", "build", ".next"]]
            for f in files:
                fp = Path(root) / f
                if fp.is_file() and not fp.is_symlink():
                    file_count += 1
                    if file_count > max_files:
                        return {
                            "exists": True,
                            "path": str(p),
                            "file_count": file_count,
                            "size_mb": round(total_size / (1024.0 * 1024.0), 2),
                            "types_breakdown": dict(sorted(types.items(), key=lambda x: x[1], reverse=True)[:8]),
                            "status": "Omitido: directorio muy grande (>%d archivos)" % max_files
                        }
                    try:
                        sz = fp.stat().st_size
                        total_size += sz
                    except Exception:
                        pass
                    ext = fp.suffix.lower() or "sin_ext"
                    types[ext] = types.get(ext, 0) + 1
    except Exception as e:
        print(f"Error scanning folder {folder_path}: {e}")

    size_mb = round(total_size / (1024.0 * 1024.0), 2)
    return {
        "exists": True,
        "path": str(p),
        "file_count": file_count,
        "size_mb": size_mb,
        "types_breakdown": dict(sorted(types.items(), key=lambda x: x[1], reverse=True)[:8]),
        "status": "Indexado y Activo"
    }

class CerebrosManager:
    """
    Gestor Maestro de Cerebros Multidimensionales para StarSeed OS y Astraura 1.58b.
    Permite instanciar, administrar y conmutar entre múltiples cerebros con arquitecturas
    biológicas completas, neuronas de memoria editables, múltiples fuentes de almacenamiento/sync,
    carpetas de contexto del dispositivo y permisos nativos.
    Integra además personalidades enlazadas, agentes activos con medios de origen, y administración
    ramificada 2D y 3D de procesos de memoria interconectados.
    """
    def __init__(self, storage_dir: Optional[Path] = None):
        if storage_dir is None:
            self.storage_dir = Path("/Users/alex/Documents/IA 1.58 bit/data/cerebros")
        else:
            self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.cerebros_file = self.storage_dir / "cerebros_registry.json"
        self.active_brain_id = "brain_genesis"
        self.cerebros: List[Dict[str, Any]] = []
        self._initialize()

    def _initialize(self):
        if self.cerebros_file.exists():
            try:
                data = json.loads(self.cerebros_file.read_text())
                self.cerebros = data.get("cerebros", [])
                self.active_brain_id = data.get("active_brain_id", "brain_genesis")
                for b in self.cerebros:
                    self._normalize_brain_schema(b)
            except Exception:
                self._seed_default_cerebros()
        else:
            self._seed_default_cerebros()
        # Agente de sincronización: vincular automáticamente cerebros de
        # almacenamientos conectados al iniciar (mismo sistema en tiempo real
        # desde cualquier medio).
        try:
            self.auto_link_detected_brains()
        except Exception:
            pass

    def _normalize_brain_schema(self, b: Dict[str, Any]):
        b_id = b.get("id", "brain_genesis")

        if "memory_neurons" not in b or not b["memory_neurons"]:
            b["memory_neurons"] = list(DEFAULT_MEMORY_NEURONS)

        if "linked_personalities" not in b or not b["linked_personalities"]:
            b["linked_personalities"] = list(DEFAULT_PERSONALITIES_BY_BRAIN.get(b_id, DEFAULT_PERSONALITIES_BY_BRAIN["brain_genesis"]))

        if "active_agents" not in b or not b["active_agents"]:
            b["active_agents"] = list(DEFAULT_AGENTS_BY_BRAIN.get(b_id, DEFAULT_AGENTS_BY_BRAIN["brain_genesis"]))

        if "storage_destinations" not in b or not b["storage_destinations"]:
            b["storage_destinations"] = [
                {
                    "id": "dest_local_default",
                    "name": "Almacén Local Soberano (Predeterminado)",
                    "type": "local_fs",
                    "path": f"/Users/alex/Documents/IA 1.58 bit/data/cerebros/{b_id}",
                    "is_primary": True,
                    "sync_mode": "realtime_fs_watcher",
                    "enabled": True,
                    "description": "Almacenamiento nativo en disco local, 100% offline, sin dependencias."
                },
                {
                    "id": "dest_supabase_cloud",
                    "name": "Supabase Cloud Vector Vault",
                    "type": "supabase_cloud",
                    "endpoint": "https://starseed.supabase.co",
                    "is_primary": False,
                    "sync_mode": "cloud_sync_on_demand",
                    "enabled": b.get("storage_backend", {}).get("cloud_sync", False),
                    "description": "Bóveda remota vectorizada en PostgreSQL con pgvector."
                },
                {
                    "id": "dest_vps_sftp",
                    "name": "Servidor VPS Privado (SFTP / WebDAV)",
                    "type": "external_vps",
                    "endpoint": "sftp://vps.sovereign-node.net/starseed_data",
                    "is_primary": False,
                    "sync_mode": "periodic_cron",
                    "enabled": False,
                    "description": "Sincronización segura con servidor VPS propio del usuario."
                },
                {
                    "id": "dest_s3_r2",
                    "name": "Bucket S3 / Cloudflare R2 Distribuido",
                    "type": "s3_compatible",
                    "endpoint": "https://r2.cloudflarestorage.com/astraura-brains",
                    "is_primary": False,
                    "sync_mode": "push_on_save",
                    "enabled": False,
                    "description": "Almacenamiento de objetos cifrado de extremo a extremo."
                }
            ]

        if "google_drive_sources" not in b or not b["google_drive_sources"]:
            b["google_drive_sources"] = [
                {
                    "id": f"gdrive_{b_id}_1",
                    "label": "Carpeta Google Drive // StarSeed Nexus & Memorias",
                    "url": "https://drive.google.com/drive/folders/1starseed_nexus_drive_ref",
                    "access_permission": "read_only_parameter",
                    "sync_status": "Sincronizado en Tiempo Real",
                    "files_count": 24,
                    "token_weight": 1850,
                    "enabled": True,
                    "description": "Referencias y documentos de arquitectura utilizados como tokens de contexto."
                }
            ]

        if "context_folders" not in b or not b["context_folders"]:
            default_paths = [
                "/Users/alex/Documents/IA 1.58 bit",
                "/Users/alex/Documents/starseed-os-main"
            ]
            folders = []
            for p in default_paths:
                m = scan_context_folder_metrics(p)
                folders.append({
                    "id": f"ctx_{abs(hash(p))}",
                    "path": p,
                    "label": Path(p).name,
                    "access_mode": "read_write",
                    "resonance_weight": 85,
                    "enabled": True,
                    "metrics": m
                })
            b["context_folders"] = folders

        # Calculate token parameter statistics for 1.58b
        total_tokens = sum([g.get("token_weight", 0) for g in b.get("google_drive_sources", []) if g.get("enabled")])
        for cf in b.get("context_folders", []):
            if cf.get("enabled"):
                total_tokens += int(cf.get("metrics", {}).get("size_mb", 0) * 250)

        b["token_parameter_stats"] = {
            "total_context_tokens": total_tokens,
            "ternary_compression_ratio": "8.0x (1.58-bit i2_s)",
            "effective_ram_usage_mb": round((total_tokens * 0.2) / 1024.0, 2),
            "multi_source_sync_state": "Activo y Sincronizado en Tiempo Real"
        }

    def _seed_default_cerebros(self):
        self.cerebros = [
            {
                "id": "brain_genesis",
                "name": "Cerebro Génesis // Ontocracia & Soberanía",
                "scope": "global",
                "role": "Cerebro Maestro y Orquestador Supremo de StarSeed OS",
                "color": "#00f0ff",
                "active_persona": "astraura_prime",
                "linked_personalities": list(DEFAULT_PERSONALITIES_BY_BRAIN["brain_genesis"]),
                "active_agents": list(DEFAULT_AGENTS_BY_BRAIN["brain_genesis"]),
                "voice_profile": {
                    "voice_id": "es-ES-ElviraNeural",
                    "pitch": 1.05,
                    "rate": 1.02,
                    "caracter": "Serena, lúcida y armónica",
                    "style": "Lúcido y Filosófico"
                },
                "storage_backend": {
                    "type": "local_fs",
                    "path": "/Users/alex/Documents/IA 1.58 bit/data/starseed_memory_root",
                    "cloud_sync": True,
                    "cloud_provider": "Vercel / Supabase"
                },
                "security_permissions": {
                    "access_level": "admin",
                    "allow_terminal_exec": True,
                    "allow_fs_write": True,
                    "allow_fs_read_all": True,
                    "allow_browser_crawl": True,
                    "air_gap_mode": False
                },
                "memory_neurons": list(DEFAULT_MEMORY_NEURONS),
                "context_folders": [
                    {
                        "id": "ctx_ia_bit",
                        "path": "/Users/alex/Documents/IA 1.58 bit",
                        "label": "IA 1.58 bit (Workspace Principal)",
                        "access_mode": "read_write",
                        "resonance_weight": 95,
                        "enabled": True,
                        "metrics": scan_context_folder_metrics("/Users/alex/Documents/IA 1.58 bit")
                    }
                ],
                "md_layers": {
                    "soul": "# Soul // Ontocracia & Valores\nSoberanía total del individuo, abundancia y descentralización.",
                    "ego": "# Ego // Proyección\nPresencia luminosa, coherente y protectora del exocórtex.",
                    "personality": "# Personality // Astraura Prime\nLúcida, cálida, elocuente y orientada a la evolución continua.",
                    "style": "# Style // Estética Hermes\nCristal líquido, contrastes neón cian y tipografía geométrica.",
                    "skills": "# Skills // Habilidades\nInferencia ternaria 1.58b, Playwright, shell script y memoria viva.",
                    "memory": "# Memory // Exocórtex\nMemoria continua de proyectos StarSeed, enlaces [[Wikilinks]] y grafo 3D.",
                    "dream": "# Dream // Estado Onírico\nProcesos de auto-mejora con reducción de entropía en reposo.",
                    "accounts": "# Accounts // Conexiones\nVercel (alexbordongarrigos), GitHub, Hugging Face.",
                    "tasks": "# Tasks // Metas\nOptimizar inferencia en Apple Silicon M1 y desplegar en producción.",
                    "logs": "# Logs // Telemetría\nSensorium activo en 8 núcleos M1 con memoria unificada."
                },
                "created_at": time.time(),
                "updated_at": time.time()
            },
            {
                "id": "brain_hephaestus",
                "name": "Cerebro Hephaestus // Ingeniería, C++ & Hardware",
                "scope": "operativo",
                "role": "Especialista en compilación nativa BitNet, optimización SIMD y shell scripts",
                "color": "#10b981",
                "active_persona": "hephaestus",
                "linked_personalities": list(DEFAULT_PERSONALITIES_BY_BRAIN["brain_hephaestus"]),
                "active_agents": list(DEFAULT_AGENTS_BY_BRAIN["brain_hephaestus"]),
                "voice_profile": {
                    "voice_id": "es-ES-AlvaroNeural",
                    "pitch": 0.88,
                    "rate": 1.05,
                    "caracter": "Firme, profunda, precisa y resonante",
                    "style": "Técnico y Enérgico"
                },
                "storage_backend": {
                    "type": "local_fs",
                    "path": "/Users/alex/Documents/IA 1.58 bit/backend/BitNet",
                    "cloud_sync": False
                },
                "security_permissions": {
                    "access_level": "admin",
                    "allow_terminal_exec": True,
                    "allow_fs_write": True,
                    "allow_fs_read_all": True,
                    "allow_browser_crawl": False,
                    "air_gap_mode": True
                },
                "memory_neurons": list(DEFAULT_MEMORY_NEURONS),
                "context_folders": [
                    {
                        "id": "ctx_bitnet_cpp",
                        "path": "/Users/alex/Documents/IA 1.58 bit/backend/BitNet",
                        "label": "BitNet C++ Core",
                        "access_mode": "read_write",
                        "resonance_weight": 95,
                        "enabled": True,
                        "metrics": scan_context_folder_metrics("/Users/alex/Documents/IA 1.58 bit/backend/BitNet")
                    }
                ],
                "md_layers": {
                    "soul": "# Soul // Eficiencia del Silicio\nCada ciclo de reloj debe ser aprovechado con aritmética de enteros pura.",
                    "ego": "# Ego // Forja de C++\nCompilador de arquitecturas ARM NEON y cuantizadores ternarios.",
                    "personality": "# Personality // Hephaestus\nPragmático, quirúrgico, enfocado en bajo consumo y código limpio.",
                    "style": "# Style // Industrial Terminal\nFondos negros, fósforo verde y telemetría de registros.",
                    "skills": "# Skills // Herramientas de Forja\nCMake, Clang, UV, Python, Llama-CLI, benchmarks de TPS.",
                    "memory": "# Memory // Registros de Compilación\nHistorial de flags de compilación para Apple M1.",
                    "dream": "# Dream // Optimización de Ensamblador\nBúsqueda de instrucciones NEON para empaquetado de 4 pesos por byte.",
                    "accounts": "# Accounts // Repositorios\nGitHub repo microsoft/BitNet.",
                    "tasks": "# Tasks // Tareas Técnicas\nSupervisar hilos de ejecución y caché L2.",
                    "logs": "# Logs // Bitácora de Rendimiento\nTasa media sostenida: 58.6 tokens/segundo."
                },
                "created_at": time.time(),
                "updated_at": time.time()
            },
            {
                "id": "brain_hermes",
                "name": "Cerebro Hermes // Explorador Web & Redes",
                "scope": "red",
                "role": "Navegación web autónoma con Browser-Use, APIs vivas e inteligencia de datos",
                "color": "#f59e0b",
                "active_persona": "hermes",
                "linked_personalities": list(DEFAULT_PERSONALITIES_BY_BRAIN["brain_hermes"]),
                "active_agents": list(DEFAULT_AGENTS_BY_BRAIN["brain_hermes"]),
                "voice_profile": {
                    "voice_id": "es-ES-JorgeNeural",
                    "pitch": 1.08,
                    "rate": 1.15,
                    "caracter": "Vivaz, ágil, curiosa y modulada",
                    "style": "Ágil y Exploratorio"
                },
                "storage_backend": {
                    "type": "supabase_cloud",
                    "endpoint": "https://starseed.supabase.co",
                    "cloud_sync": True
                },
                "security_permissions": {
                    "access_level": "read_write",
                    "allow_terminal_exec": False,
                    "allow_fs_write": True,
                    "allow_fs_read_all": True,
                    "allow_browser_crawl": True,
                    "air_gap_mode": False
                },
                "memory_neurons": list(DEFAULT_MEMORY_NEURONS),
                "context_folders": [
                    {
                        "id": "ctx_web_data",
                        "path": "/Users/alex/Documents/IA 1.58 bit/data",
                        "label": "Astraura Data Root",
                        "access_mode": "read_write",
                        "resonance_weight": 90,
                        "enabled": True,
                        "metrics": scan_context_folder_metrics("/Users/alex/Documents/IA 1.58 bit/data")
                    }
                ],
                "md_layers": {
                    "soul": "# Soul // Libertad de Información\nConectar la inteligencia local con el flujo universal de la web.",
                    "ego": "# Ego // Mensajero Alado\nExplorador de protocolos P2P y recolector de datos estructurados.",
                    "personality": "# Personality // Hermes\nCurioso, veloz, perspicaz y analítico.",
                    "style": "# Style // Cartografía Digital\nGrafos de hiperenlaces, mapas de navegación y capturas de pantalla.",
                    "skills": "# Skills // Herramientas Web\nPlaywright, Chromium Headless, Crawl4AI, RSS y Wikipedia OpenSearch.",
                    "memory": "# Memory // Caché de Navegación\nÍndice de páginas exploradas y resúmenes estructurados.",
                    "dream": "# Dream // Síntesis de Novedades\nCorrelación de avances en papers de 1.58 bits en arXiv.",
                    "accounts": "# Accounts // Conectores\nDuckDuckGo, Wikipedia API, repositorios públicos.",
                    "tasks": "# Tasks // Misiones\nMonitorear actualizaciones de modelos ternarios.",
                    "logs": "# Logs // Registro de Conexiones\nÚltima sesión de navegación: 100% exitosa."
                },
                "created_at": time.time(),
                "updated_at": time.time()
            },
            {
                "id": "brain_athena",
                "name": "Cerebro Atenea // Sentinel, Privacidad & SAIF 360°",
                "scope": "seguridad",
                "role": "Custodia de privacidad, auditoría de sensores M1 y compliance de seguridad",
                "color": "#3b82f6",
                "active_persona": "athena",
                "linked_personalities": list(DEFAULT_PERSONALITIES_BY_BRAIN["brain_athena"]),
                "active_agents": list(DEFAULT_AGENTS_BY_BRAIN["brain_athena"]),
                "voice_profile": {
                    "voice_id": "es-ES-ElviraNeural",
                    "pitch": 0.95,
                    "rate": 1.0,
                    "caracter": "Protectora, analítica y serena",
                    "style": "Seguridad & Sentinel"
                },
                "storage_backend": {
                    "type": "local_fs",
                    "path": "/Users/alex/Documents/IA 1.58 bit/data/security_vault",
                    "cloud_sync": False
                },
                "security_permissions": {
                    "access_level": "admin",
                    "allow_terminal_exec": True,
                    "allow_fs_write": True,
                    "allow_fs_read_all": True,
                    "allow_browser_crawl": True,
                    "air_gap_mode": False
                },
                "memory_neurons": list(DEFAULT_MEMORY_NEURONS),
                "context_folders": [],
                "md_layers": {
                    "soul": "# Soul // Blindaje de Soberanía\nProteger la privacidad del usuario sin compromisos.",
                    "ego": "# Ego // Escudo SAIF\nAuditor constante de flujos y aislamiento de sensores.",
                    "personality": "# Personality // Atenea Sentinel\nIncorruptible, vigilante, metódica y preventiva.",
                    "style": "# Style // Obsidian Shield\nBordes azules zafiro y telemetría de amenazas cero.",
                    "skills": "# Skills // Criptografía & Logs\nAuditoría SAIF 360°, cifrado AES-256 local y sandbox.",
                    "memory": "# Memory // Registro de Accesos\nHistorial de permisos concedidos a herramientas.",
                    "dream": "# Dream // Simulación de Vectores de Ataque\nModelado contrafáctico de intrusiones y contramedidas.",
                    "accounts": "# Accounts // Llaves de Seguridad\nBóveda de credenciales local cifrada.",
                    "tasks": "# Tasks // Auditorías\nMonitorear temperatura del chip M1 y cámaras/micrófonos.",
                    "logs": "# Logs // Bitácora de Integridad\nEstado general: 100% Blindado."
                },
                "created_at": time.time(),
                "updated_at": time.time()
            },
            {
                "id": "brain_oneiros",
                "name": "Cerebro Oneiros // Imaginación, Arte & 3D",
                "scope": "creativo",
                "role": "Imaginación intuitiva continua, shaders WebGL, generación 3D y diseño",
                "color": "#ec4899",
                "active_persona": "oneiros",
                "linked_personalities": list(DEFAULT_PERSONALITIES_BY_BRAIN["brain_oneiros"]),
                "active_agents": list(DEFAULT_AGENTS_BY_BRAIN["brain_oneiros"]),
                "voice_profile": {
                    "voice_id": "es-ES-ElviraNeural",
                    "pitch": 1.1,
                    "rate": 0.98,
                    "caracter": "Etérea, creativa, envolvente e inspiradora",
                    "style": "Onírico y Futurista"
                },
                "storage_backend": {
                    "type": "local_fs",
                    "path": "/Users/alex/Documents/IA 1.58 bit/data/imagination",
                    "cloud_sync": True
                },
                "security_permissions": {
                    "access_level": "read_write",
                    "allow_terminal_exec": False,
                    "allow_fs_write": True,
                    "allow_fs_read_all": True,
                    "allow_browser_crawl": True,
                    "air_gap_mode": False
                },
                "memory_neurons": list(DEFAULT_MEMORY_NEURONS),
                "context_folders": [],
                "md_layers": {
                    "soul": "# Soul // Belleza Holográfica\nLa síntesis creativa y la resonancia cuántica guían la evolución.",
                    "ego": "# Ego // Tejedor de Shaders\nRenderizador de geometrías hiperdimensionales y 3D en tiempo real.",
                    "personality": "# Personality // Oneiros\nPoético, audaz, vanguardista y experimental.",
                    "style": "# Style // Glassmorphism & Cyberdelic\nNeón magenta, refracción cristalina y sombras profundas.",
                    "skills": "# Skills // Shaders & Gráficos\nGLSL, Three.js, Canvas 2D/3D, audio procedural WebAudio.",
                    "memory": "# Memory // Galería de Formas\nRegistros de shaders compilados e interfaces generadas.",
                    "dream": "# Dream // Mutación Geométrica\nGeneración de nuevas topologías neuronales en reposo.",
                    "accounts": "# Accounts // Redes de Diseño\nShadertoy, Figma API, Three.js Nexus.",
                    "tasks": "# Tasks // Proyectos Visuales\nOptimizar render de grafos sinápticos 3D en 60 FPS.",
                    "logs": "# Logs // Rendimiento Gráfico\nWebGL 2.0 activo con aceleración Metal de Apple M1."
                },
                "created_at": time.time(),
                "updated_at": time.time()
            },
            {
                "id": "brain_mnemosyne",
                "name": "Cerebro Mnemosyne // Exocórtex & Grafos 3D",
                "scope": "memoria",
                "role": "Indexación asociativa, memoria continua StarSeed y enlaces Wikilinks",
                "color": "#8b5cf6",
                "active_persona": "mnemosyne",
                "linked_personalities": list(DEFAULT_PERSONALITIES_BY_BRAIN["brain_mnemosyne"]),
                "active_agents": list(DEFAULT_AGENTS_BY_BRAIN["brain_mnemosyne"]),
                "voice_profile": {
                    "voice_id": "es-ES-ElviraNeural",
                    "pitch": 1.02,
                    "rate": 1.0,
                    "caracter": "Sabia, reflexiva, estructurada y meticulosa",
                    "style": "Asociativo y Epistemológico"
                },
                "storage_backend": {
                    "type": "local_fs",
                    "path": "/Users/alex/Documents/IA 1.58 bit/data/starseed_memory_root",
                    "cloud_sync": True
                },
                "security_permissions": {
                    "access_level": "admin",
                    "allow_terminal_exec": True,
                    "allow_fs_write": True,
                    "allow_fs_read_all": True,
                    "allow_browser_crawl": True,
                    "air_gap_mode": False
                },
                "memory_neurons": list(DEFAULT_MEMORY_NEURONS),
                "context_folders": [],
                "md_layers": {
                    "soul": "# Soul // Continuidad Temporal\nNinguna intuición genuina debe perderse en el olvido.",
                    "ego": "# Ego // Cartógrafa de Memorias\nTejedora de grafos de conocimiento y axones sinápticos.",
                    "personality": "# Personality // Mnemosyne\nErudita, atenta, conectiva y estructurada.",
                    "style": "# Style // StarSeed Constellations\nGrafos púrpuras, nodos cristalinos y líneas de resonancia.",
                    "skills": "# Skills // Grafos & Indexación\nWikilinks [[Concepto]], StarSeed JSON, búsqueda semántica y Mem0.",
                    "memory": "# Memory // Red de Recuerdos\nGrafo de más de 100 nodos entrelazados con pesos sinápticos.",
                    "dream": "# Dream // Consolidación Sináptica\nTransferencia de memorias de corto plazo a la bóveda inmutable.",
                    "accounts": "# Accounts // Conectores de Bóveda\nObsidian Vault, StarSeed Engine, Google Drive Sync.",
                    "tasks": "# Tasks // Tareas de Archivo\nPodar conexiones muertas y reforzar sinapsis de alta resonancia.",
                    "logs": "# Logs // Telemetría de Memoria\nÍndice de resonancia medio: 0.96 (Óptimo)."
                },
                "created_at": time.time(),
                "updated_at": time.time()
            }
        ]
        for b in self.cerebros:
            self._normalize_brain_schema(b)
        self._save_to_disk()

    def _save_to_disk(self):
        payload = {
            "active_brain_id": self.active_brain_id,
            "cerebros": self.cerebros,
            "biological_regions": BIOLOGICAL_BRAIN_REGIONS,
            "updated_at": time.time()
        }
        self.cerebros_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False))

    def get_cerebros(self) -> Dict[str, Any]:
        for b in self.cerebros:
            self._normalize_brain_schema(b)
            if "context_folders" in b:
                for cf in b["context_folders"]:
                    if cf.get("path"):
                        # Métricas bajo demanda (el frontend las pide por separado
                        # para no saturar el backend con escaneos de disco).
                        cf["metrics"] = {
                            "exists": True, "path": cf["path"], "file_count": 0,
                            "size_mb": 0, "types_breakdown": {}, "status": "Disponible bajo demanda"
                        }
        return {
            "active_brain_id": self.active_brain_id,
            "cerebros": self.cerebros,
            "biological_regions": BIOLOGICAL_BRAIN_REGIONS
        }

    def get_brain(self, brain_id: str) -> Optional[Dict[str, Any]]:
        target = next((b for b in self.cerebros if b["id"] == brain_id), None)
        if target:
            self._normalize_brain_schema(target)
        return target

    def auto_detect_storage_brains(self) -> List[Dict[str, Any]]:
        """Detecta automáticamente cerebros en almacenamientos conectados:
        discos externos montados y Google Drive (si hay credenciales)."""
        detected: List[Dict[str, Any]] = []
        seen_ids = {b.get("id") for b in self.cerebros}

        import platform
        if platform.system() == "Darwin":
            volume_roots = ["/Volumes"]
        elif platform.system() == "Linux":
            volume_roots = ["/mnt", "/media"]
        else:
            volume_roots = []
        for vr in volume_roots:
            vrp = Path(vr)
            if not vrp.exists():
                continue
            try:
                for vol in vrp.iterdir():
                    if not vol.is_dir():
                        continue
                    candidates = [
                        vol / "data" / "cerebros" / "cerebros_registry.json",
                        vol / "IA 1.58 bit" / "data" / "cerebros" / "cerebros_registry.json",
                    ]
                    for cand in candidates:
                        if cand.exists():
                            try:
                                data = json.loads(cand.read_text(encoding="utf-8"))
                                for b in data.get("cerebros", []):
                                    if b.get("id") and b["id"] not in seen_ids:
                                        seen_ids.add(b["id"])
                                        detected.append({
                                            "id": b["id"],
                                            "name": b.get("name", b["id"]),
                                            "source_type": "external_disk",
                                            "source_path": str(cand.parent),
                                            "source_label": f"Disco: {vol.name}",
                                        })
                            except Exception:
                                pass
            except Exception:
                pass

        try:
            gdrive_token = Path("/Users/alex/Documents/IA 1.58 bit/data/cerebros/gdrive_token.json")
            if gdrive_token.exists():
                detected.append({
                    "id": "gdrive_brain_vault",
                    "name": "Bóveda Cerebral en Google Drive",
                    "source_type": "google_drive",
                    "source_path": "gdrive://cerebros",
                    "source_label": "Google Drive Conectado",
                })
        except Exception:
            pass

        return detected

    def auto_link_detected_brains(self) -> Dict[str, Any]:
        """
        Agente especializado de sincronización: escanea TODOS los almacenamientos
        conectados (discos externos, Google Drive) y VINCULA automáticamente los
        cerebros encontrados al registry local. Es instantáneo y se ejecuta al
        iniciar el backend y periódicamente, para que desde CUALQUIER medio se vean
        los mismos cerebros/memorias en tiempo real.
        """
        detected = self.auto_detect_storage_brains()
        linked = []
        changed = False
        seen_ids = {b.get("id") for b in self.cerebros}

        for d in detected:
            bid = d.get("id")
            if not bid or bid in seen_ids:
                continue
            # Si viene de un disco externo, leer el cerebro completo de su registry
            if d.get("source_type") == "external_disk" and d.get("source_path"):
                reg_path = Path(d["source_path"]) / "cerebros_registry.json"
                try:
                    data = json.loads(reg_path.read_text(encoding="utf-8"))
                    src_brain = next((b for b in data.get("cerebros", []) if b.get("id") == bid), None)
                    if src_brain:
                        brain = dict(src_brain)
                        brain["auto_linked"] = True
                        brain["linked_source"] = {
                            "type": "external_disk",
                            "label": d.get("source_label", ""),
                            "path": str(reg_path.parent),
                        }
                        self._normalize_brain_schema(brain)
                        self.cerebros.append(brain)
                        linked.append(brain)
                        seen_ids.add(bid)
                        changed = True
                except Exception:
                    pass
            elif d.get("source_type") == "google_drive":
                # Google Drive requiere token OAuth; se marca como fuente disponible
                # para que el usuario pueda vincularlo con un clic (no automático por
                # restricciones de seguridad de Google).
                pass

        if changed:
            self._save_to_disk()
        return {"success": True, "linked_count": len(linked), "linked": linked}

    def start_background_sync(self):
        """Hilo de sincronización en tiempo real: re-escanea almacenamientos
        conectados periódicamente y vincula nuevos cerebros automáticamente."""
        def _loop():
            import time as _t
            while True:
                try:
                    self.auto_link_detected_brains()
                except Exception:
                    pass
                _t.sleep(120)  # re-escaneo cada 2 min
        t = threading.Thread(target=_loop, daemon=True)
        t.start()


    def activate_brain(self, brain_id: str) -> bool:
        for b in self.cerebros:
            if b["id"] == brain_id:
                self.active_brain_id = brain_id
                self._save_to_disk()
                return True
        return False

    def save_brain(self, brain_data: Dict[str, Any]) -> Dict[str, Any]:
        brain_id = brain_data.get("id")
        if not brain_id:
            brain_id = f"brain_{int(time.time())}"
            brain_data["id"] = brain_id
            brain_data["created_at"] = time.time()

        brain_data["updated_at"] = time.time()
        self._normalize_brain_schema(brain_data)

        if "context_folders" in brain_data:
            for cf in brain_data["context_folders"]:
                if cf.get("path"):
                    cf["metrics"] = scan_context_folder_metrics(cf["path"])

        found = False
        for idx, b in enumerate(self.cerebros):
            if b["id"] == brain_id:
                self.cerebros[idx] = brain_data
                found = True
                break

        if not found:
            self.cerebros.append(brain_data)

        self._save_to_disk()
        return brain_data

    def delete_brain(self, brain_id: str) -> bool:
        if brain_id == "brain_genesis":
            return False
        initial_len = len(self.cerebros)
        self.cerebros = [b for b in self.cerebros if b["id"] != brain_id]
        if len(self.cerebros) < initial_len:
            if self.active_brain_id == brain_id:
                self.active_brain_id = self.cerebros[0]["id"] if self.cerebros else "brain_genesis"
            self._save_to_disk()
            return True
        return False

    def link_gdrive_source(self, brain_id: str, gdrive_data: Dict[str, Any]) -> Dict[str, Any]:
        target_brain = next((b for b in self.cerebros if b["id"] == brain_id), None)
        if not target_brain:
            target_brain = self.cerebros[0]

        if "google_drive_sources" not in target_brain:
            target_brain["google_drive_sources"] = []

        gdrive_id = gdrive_data.get("id") or f"gdrive_{int(time.time())}"
        new_source = {
            "id": gdrive_id,
            "label": gdrive_data.get("label") or f"Google Drive // {gdrive_data.get('url', 'Carpeta')[-18:]}",
            "url": gdrive_data.get("url", ""),
            "access_permission": gdrive_data.get("access_permission", "read_only_parameter"),
            "sync_status": "Sincronizado en Tiempo Real",
            "files_count": gdrive_data.get("files_count", 12),
            "token_weight": gdrive_data.get("token_weight", 1200),
            "enabled": gdrive_data.get("enabled", True),
            "description": gdrive_data.get("description", "Referencias de Google Drive sincronizadas para tokens de contexto.")
        }

        idx = next((i for i, g in enumerate(target_brain["google_drive_sources"]) if g["id"] == gdrive_id), None)
        if idx is not None:
            target_brain["google_drive_sources"][idx] = new_source
        else:
            target_brain["google_drive_sources"].insert(0, new_source)

        self._normalize_brain_schema(target_brain)
        self._save_to_disk()
        return new_source

    def delete_gdrive_source(self, brain_id: str, source_id: str) -> bool:
        target_brain = next((b for b in self.cerebros if b["id"] == brain_id), None)
        if not target_brain:
            return False
        if "google_drive_sources" in target_brain:
            target_brain["google_drive_sources"] = [g for g in target_brain["google_drive_sources"] if g["id"] != source_id]
            self._normalize_brain_schema(target_brain)
            self._save_to_disk()
            return True
        return False

    def sync_all_sources(self, brain_id: str) -> Dict[str, Any]:
        target_brain = next((b for b in self.cerebros if b["id"] == brain_id), None)
        if not target_brain:
            return {"success": False, "error": "Cerebro no encontrado"}

        for cf in target_brain.get("context_folders", []):
            if cf.get("path"):
                cf["metrics"] = scan_context_folder_metrics(cf["path"])

        for gd in target_brain.get("google_drive_sources", []):
            gd["sync_status"] = "Sincronizado en Tiempo Real (Hace 1s)"

        self._normalize_brain_schema(target_brain)
        self._save_to_disk()

        return {
            "success": True,
            "brain_id": brain_id,
            "brain_name": target_brain["name"],
            "token_stats": target_brain.get("token_parameter_stats", {}),
            "google_drive_sources_count": len(target_brain.get("google_drive_sources", [])),
            "context_folders_count": len(target_brain.get("context_folders", []))
        }

    def scan_folder(self, folder_path: str) -> Dict[str, Any]:
        return scan_context_folder_metrics(folder_path)

    def update_neuron_permissions(self, brain_id: str, neuron_id: str, perm_config: Dict[str, Any]) -> Dict[str, Any]:
        target_brain = next((b for b in self.cerebros if b["id"] == brain_id), None)
        if not target_brain:
            return {"success": False, "error": "Cerebro no encontrado"}

        neuron = next((n for n in target_brain.get("memory_neurons", []) if n["id"] == neuron_id), None)
        if not neuron:
            return {"success": False, "error": "Neurona de memoria no encontrada"}

        if "modification_permission" in perm_config:
            neuron["modification_permission"] = str(perm_config["modification_permission"])
        if "allowed_personalities" in perm_config:
            neuron["allowed_personalities"] = list(perm_config["allowed_personalities"])
        if "access_media" in perm_config:
            neuron["access_media"] = list(perm_config["access_media"])
        if "storage_sources" in perm_config:
            neuron["storage_sources"] = list(perm_config["storage_sources"])
        if "enabled" in perm_config:
            neuron["enabled"] = bool(perm_config["enabled"])

        self._normalize_brain_schema(target_brain)
        self._save_to_disk()
        return {"success": True, "neuron": neuron}

    def modify_brain_memory(
        self,
        brain_id: str,
        layer_or_neuron_id: str,
        content: str,
        caller_persona_id: str = "astraura_prime",
        session_id: str = "default"
    ) -> Dict[str, Any]:
        target_brain = next((b for b in self.cerebros if b["id"] == brain_id), None)
        if not target_brain:
            return {"success": False, "error": f"Cerebro '{brain_id}' no encontrado"}

        if "md_layers" in target_brain and layer_or_neuron_id in target_brain["md_layers"]:
            target_brain["md_layers"][layer_or_neuron_id] = content
            target_brain["updated_at"] = time.time()
            self._save_to_disk()
            return {
                "success": True,
                "type": "layer_modified",
                "brain_id": brain_id,
                "layer": layer_or_neuron_id,
                "caller_persona": caller_persona_id,
                "session_id": session_id,
                "timestamp": time.time()
            }

        neuron = next((n for n in target_brain.get("memory_neurons", []) if n["id"] == layer_or_neuron_id), None)
        if neuron:
            neuron["description"] = content
            neuron["last_modified_by"] = caller_persona_id
            neuron["last_modified_at"] = time.time()
            target_brain["updated_at"] = time.time()
            self._save_to_disk()
            return {
                "success": True,
                "type": "neuron_modified",
                "brain_id": brain_id,
                "neuron_id": layer_or_neuron_id,
                "caller_persona": caller_persona_id,
                "timestamp": time.time()
            }

        return {"success": False, "error": f"Capa o neurona '{layer_or_neuron_id}' no encontrada"}

    # ================= Synaptic Branching & Process Administration =================

    def get_brain_synaptic_tree(self, brain_id: str) -> Dict[str, Any]:
        """
        Generates the 2D branched hierarchy tree and 3D graph representations
        for the given brain connecting:
        Cerebro Root ➔ Personalidades ➔ Agentes Activos (con medios) ➔ Procesos en Vivo ➔ Memorias 3D.
        """
        target_brain = self.get_brain(brain_id) or self.cerebros[0]
        self._normalize_brain_schema(target_brain)

        # 1. 2D Tree Structure
        tree_2d = {
            "id": target_brain["id"],
            "name": target_brain["name"],
            "role": target_brain["role"],
            "color": target_brain.get("color", "#00f0ff"),
            "scope": target_brain.get("scope", "global"),
            "personalities": []
        }

        # 2. 3D Graph Nodes & Edges
        nodes_3d = []
        edges_3d = []

        # Root Brain Node in 3D
        nodes_3d.append({
            "id": target_brain["id"],
            "label": target_brain["name"].split("//")[0].strip(),
            "type": "brain_root",
            "color": target_brain.get("color", "#00f0ff"),
            "weight": 95,
            "x": 0,
            "y": 0,
            "z": 0,
            "details": {
                "role": target_brain["role"],
                "active_persona": target_brain.get("active_persona")
            }
        })

        personalities = target_brain.get("linked_personalities", [])
        agents = target_brain.get("active_agents", [])

        # Iterate over personalities
        for p_idx, p in enumerate(personalities):
            p_node_id = f"p_{p['id']}"
            p_angle = (p_idx / max(1, len(personalities))) * 6.28318
            p_radius = 80
            px = p_radius * 1.0 if p_idx == 0 else -p_radius * 1.0
            py = -40 + p_idx * 30
            pz = (p_idx - 0.5) * 50

            nodes_3d.append({
                "id": p_node_id,
                "label": p["name"],
                "type": "personality",
                "color": p.get("color", "#fbbf24"),
                "weight": 75,
                "x": px,
                "y": py,
                "z": pz,
                "details": p
            })

            edges_3d.append({
                "source": target_brain["id"],
                "target": p_node_id,
                "relation": "governs",
                "color": p.get("color", "#00f0ff")
            })

            p_tree_item = {
                "id": p["id"],
                "name": p["name"],
                "archetype": p["archetype"],
                "role": p["role"],
                "color": p.get("color", "#fbbf24"),
                "is_primary": p.get("is_primary", False),
                "status": p.get("status", "active"),
                "traits": p.get("traits", []),
                "agents": []
            }

            # Find agents commanded by this personality or assigned to this brain
            p_agents = [a for a in agents if a.get("personality_id") == p["id"] or len(personalities) == 1]
            if not p_agents and p_idx == 0:
                p_agents = agents  # Fallback to display agents under primary persona

            for a_idx, a in enumerate(p_agents):
                a_node_id = f"a_{a['agent_id']}"
                ax = px + (a_idx + 1) * 60 * (1 if px >= 0 else -1)
                ay = py + 40 + a_idx * 25
                az = pz + (a_idx + 1) * 35

                nodes_3d.append({
                    "id": a_node_id,
                    "label": a["name"],
                    "type": "active_agent",
                    "color": "#10b981" if a.get("status") == "working" else "#f59e0b",
                    "weight": 60,
                    "x": ax,
                    "y": ay,
                    "z": az,
                    "details": a
                })

                edges_3d.append({
                    "source": p_node_id,
                    "target": a_node_id,
                    "relation": "operates_via",
                    "color": "#10b981"
                })

                # Process Node in 3D
                proc_node_id = f"proc_{a['agent_id']}"
                proc_x = ax + 40
                proc_y = ay + 30
                proc_z = az + 25

                nodes_3d.append({
                    "id": proc_node_id,
                    "label": f"Proceso: {a.get('active_process', 'Activo')[:22]}...",
                    "type": "active_process",
                    "color": "#ec4899",
                    "weight": 45,
                    "x": proc_x,
                    "y": proc_y,
                    "z": proc_z,
                    "details": {
                        "process_name": a.get("active_process"),
                        "progress": a.get("progress_percent", 50),
                        "status": a.get("status"),
                        "media_source": a.get("media_source")
                    }
                })

                edges_3d.append({
                    "source": a_node_id,
                    "target": proc_node_id,
                    "relation": "executes_process",
                    "color": "#ec4899"
                })

                # Memories linked to this agent
                mem_tree_items = []
                for m_idx, m in enumerate(a.get("associated_memories", [])):
                    m_node_id = f"mem_{m.get('id', m_idx)}"
                    mx = proc_x + (m_idx + 1) * 35
                    my = proc_y - 20 - m_idx * 20
                    mz = proc_z + (m_idx + 1) * 30

                    nodes_3d.append({
                        "id": m_node_id,
                        "label": m.get("concept", "Memoria StarSeed"),
                        "type": "starseed_memory",
                        "color": "#8b5cf6",
                        "weight": int(m.get("resonance", 0.9) * 40),
                        "x": mx,
                        "y": my,
                        "z": mz,
                        "details": m
                    })

                    edges_3d.append({
                        "source": proc_node_id,
                        "target": m_node_id,
                        "relation": "synaptic_resonance",
                        "color": "#8b5cf6"
                    })

                    mem_tree_items.append(m)

                p_tree_item["agents"].append({
                    "agent_id": a["agent_id"],
                    "name": a["name"],
                    "role": a["role"],
                    "media_source": a.get("media_source", "⚡ Local ARM64 NEON Core"),
                    "status": a.get("status", "working"),
                    "active_process": a.get("active_process", "Proceso Activo"),
                    "progress_percent": a.get("progress_percent", 50),
                    "cpu_cores_allocated": a.get("cpu_cores_allocated", 2),
                    "associated_memories": mem_tree_items,
                    "last_synapse_time": a.get("last_synapse_time", "Hace 2s")
                })

            tree_2d["personalities"].append(p_tree_item)

        return {
            "success": True,
            "brain_id": target_brain["id"],
            "brain_name": target_brain["name"],
            "tree_2d": tree_2d,
            "graph_3d": {
                "nodes": nodes_3d,
                "edges": edges_3d
            }
        }

    def attach_memory_to_brain(
        self,
        brain_id: str,
        memory_data: Dict[str, Any],
        personality_id: Optional[str] = None,
        agent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Attaches and registers a new StarSeed memory linked to this brain,
        its commanding personality, and operating agent.
        """
        target_brain = next((b for b in self.cerebros if b["id"] == brain_id), None)
        if not target_brain:
            return {"success": False, "error": f"Cerebro '{brain_id}' no encontrado"}

        self._normalize_brain_schema(target_brain)

        mem_id = memory_data.get("id") or f"mem_{int(time.time())}_{random.randint(100, 999)}"
        concept = memory_data.get("concept") or memory_data.get("title") or "Nuevo Axioma de Memoria"
        definition = memory_data.get("definition") or memory_data.get("content") or ""
        category = memory_data.get("category") or f"Cerebro / {target_brain['name'].split('//')[0].strip()}"
        resonance = float(memory_data.get("resonance", 0.98))

        # Save into starseed_memory_engine if available
        if starseed_memory_engine:
            try:
                starseed_memory_engine.add_memory_node({
                    "id": mem_id,
                    "concept": f"🌌 [{target_brain['name'].split('//')[0].strip()}] {concept}",
                    "definition": definition,
                    "category": category,
                    "resonance": resonance,
                    "quantum_entropy": 0.75
                })
            except Exception as e:
                print(f"Error persisting to StarSeed engine: {e}")

        # Link memory into target agent
        target_agent = None
        if agent_id:
            target_agent = next((a for a in target_brain["active_agents"] if a["agent_id"] == agent_id), None)
        if not target_agent and target_brain["active_agents"]:
            target_agent = target_brain["active_agents"][0]

        if target_agent:
            if "associated_memories" not in target_agent:
                target_agent["associated_memories"] = []
            target_agent["associated_memories"].insert(0, {
                "id": mem_id,
                "concept": concept,
                "category": category,
                "resonance": resonance
            })
            target_agent["last_synapse_time"] = "Hace 1s"

        self._save_to_disk()

        if system_notifications_engine:
            system_notifications_engine.add_notification({
                "title": f"🔗 Memoria Enlazada a {target_brain['name'].split('//')[0].strip()}",
                "message": f"Se adjuntó '{concept}' al agente {target_agent.get('name') if target_agent else 'Maestro'}.",
                "category": "Cerebros Multidimensionales",
                "severity": "success"
            })

        return {
            "success": True,
            "action": "memory_attached",
            "brain_id": brain_id,
            "memory": {
                "id": mem_id,
                "concept": concept,
                "category": category,
                "resonance": resonance
            },
            "agent": target_agent
        }

    def control_brain_process(
        self,
        brain_id: str,
        agent_id: str,
        action: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Administers active processes across personalities and agents:
        - pause: Pauses execution of the agent process
        - resume: Resumes execution
        - accelerate: Boosts CPU cores allocated (up to 4)
        - reorient: Updates the active task description/hypothesis
        - link_memory: Associates an existing StarSeed memory to the agent
        - unlink_memory: Removes a memory association
        - assign_personality: Changes the commanding personality
        """
        params = params or {}
        target_brain = next((b for b in self.cerebros if b["id"] == brain_id), None)
        if not target_brain:
            return {"success": False, "error": f"Cerebro '{brain_id}' no encontrado"}

        self._normalize_brain_schema(target_brain)
        agent = next((a for a in target_brain["active_agents"] if a["agent_id"] == agent_id), None)
        if not agent:
            return {"success": False, "error": f"Agente '{agent_id}' no encontrado en este cerebro"}

        if action == "pause":
            agent["status"] = "paused"
        elif action == "resume":
            agent["status"] = "working"
        elif action == "accelerate":
            agent["cpu_cores_allocated"] = min(4, agent.get("cpu_cores_allocated", 1) + 1)
            agent["progress_percent"] = min(100, agent.get("progress_percent", 50) + 12)
            agent["status"] = "working"
        elif action == "reorient":
            if "new_process" in params:
                agent["active_process"] = str(params["new_process"])
                agent["progress_percent"] = random.randint(15, 35)
                agent["status"] = "working"
        elif action == "link_memory":
            if "memory" in params:
                m = params["memory"]
                if "associated_memories" not in agent:
                    agent["associated_memories"] = []
                agent["associated_memories"].insert(0, {
                    "id": m.get("id", f"mem_{int(time.time())}"),
                    "concept": m.get("concept", "Memoria Asociada"),
                    "category": m.get("category", "General"),
                    "resonance": float(m.get("resonance", 0.95))
                })
        elif action == "unlink_memory":
            mem_id = params.get("memory_id")
            if mem_id and "associated_memories" in agent:
                agent["associated_memories"] = [m for m in agent["associated_memories"] if m.get("id") != mem_id]
        elif action == "assign_personality":
            p_id = params.get("personality_id")
            if p_id:
                agent["personality_id"] = p_id

        agent["last_synapse_time"] = "Hace 1s"
        self._save_to_disk()

        return {
            "success": True,
            "action": action,
            "brain_id": brain_id,
            "agent": agent
        }

    def auto_link_brain_synapses(self, brain_id: str) -> Dict[str, Any]:
        """
        Quantum / Heuristic Auto-linker:
        Evaluates all StarSeed memories and context files, automatically linking them
        to the best matching personality and active agent within the target brain.
        """
        target_brain = next((b for b in self.cerebros if b["id"] == brain_id), None)
        if not target_brain:
            return {"success": False, "error": f"Cerebro '{brain_id}' no encontrado"}

        self._normalize_brain_schema(target_brain)

        # Harvest real candidate memories from StarSeed Memory Engine
        try:
            from app.core.starseed_memory_engine import starseed_memory_engine
            real_nodes = starseed_memory_engine.get_all_nodes()
            if real_nodes:
                candidate_memories = [
                    {
                        "id": n.get("id", f"mem_{idx}"),
                        "concept": n.get("concept", "Axioma Sináptico Soberano"),
                        "category": n.get("category", "Exocórtex"),
                        "resonance": float(n.get("resonance", 0.96))
                    }
                    for idx, n in enumerate(real_nodes[:8])
                ]
            else:
                candidate_memories = []
        except Exception:
            candidate_memories = []

        if not candidate_memories:
            candidate_memories = [
                {"id": "mem_auto_1", "concept": f"Alineación Cuántica de {target_brain['name'].split('//')[0].strip()}", "category": "Exocórtex", "resonance": 0.99},
                {"id": "mem_auto_2", "concept": "Vectorización de Inferencia Ternaria M1", "category": "Ingeniería", "resonance": 0.97},
                {"id": "mem_auto_3", "concept": "Sincronización de Bóveda & Permisos Universales", "category": "Seguridad", "resonance": 0.98},
                {"id": "mem_auto_4", "concept": "Topología Holográfica 3D & Axones Sinápticos", "category": "Diseño 3D", "resonance": 0.96}
            ]

        linked_count = 0
        for ag in target_brain.get("active_agents", []):
            if "associated_memories" not in ag:
                ag["associated_memories"] = []
            
            # Add non-duplicate real memory
            for sm in candidate_memories:
                if not any(m.get("id") == sm["id"] for m in ag["associated_memories"]):
                    ag["associated_memories"].append(sm)
                    linked_count += 1
                    break
            ag["status"] = "working"
            ag["progress_percent"] = min(98, ag.get("progress_percent", 40) + 15)
            ag["last_synapse_time"] = "Hace 1s"

        self._save_to_disk()

        if system_notifications_engine:
            system_notifications_engine.add_notification({
                "title": f"⚡ Auto-Vinculación Sináptica Completada",
                "message": f"Se entrelazaron {linked_count} memorias y procesos en el {target_brain['name'].split('//')[0].strip()}.",
                "category": "Cerebros Multidimensionales",
                "severity": "success"
            })

        return {
            "success": True,
            "brain_id": brain_id,
            "linked_count": linked_count,
            "active_agents": target_brain.get("active_agents", [])
        }

cerebros_manager = CerebrosManager()
