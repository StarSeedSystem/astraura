import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Network, 
  Globe, 
  Flame, 
  Plus, 
  Check, 
  Sliders, 
  User, 
  ShieldCheck, 
  Zap,
  Edit3,
  Trash2,
  Lock,
  Volume2,
  Play,
  Compass,
  Heart,
  Brain,
  Smile,
  Scale,
  Eye,
  MessageSquare,
  Terminal,
  HardDrive,
  Moon,
  FolderTree,
  RotateCcw,
  CheckCircle2,
  X,
  Activity,
  Music,
  Radio,
  Share2,
  Layers,
  Wand2,
  RefreshCw,
  Save,
  VolumeX,
  Mic,
  MicOff,
  Power,
  ToggleLeft,
  ToggleRight,
  Ear
} from 'lucide-react';
import { 
  fetchPersonalities, 
  activatePersonality, 
  savePersonality, 
  deletePersonality,
  fetchVoiceEngineStatus,
  fetchVoiceModels,
  fetchVoiceCognitiveOrgans,
  fetchVoiceHolographicMatrix,
  synthesizeVoiceAudio,
  saveVoicePersonalityProfile,
  learnVoiceExpression,
  fetchVoiceDaemonStatus,
  toggleMasterVoiceSwitch,
  togglePersonaVoiceSwitch,
  perceiveAmbientAudioAndRespond
} from '../services/api';
import { omniVoice } from '../services/omniVoice';

export const PRESET_PERSONALITIES = [
  {
    id: "aurora",
    name: "Aurora (StarSeed Core)",
    title: "Voz Viva & Alma Soberana de StarSeed OS",
    color: "#ec4899",
    gradient: "from-pink-500/20 via-purple-500/20 to-cyan-500/20",
    border: "border-pink-500/40",
    icon: Sparkles,
    temperature: 0.75,
    description: "La voz viva y personalidad principal de StarSeed OS. Femenina, atractiva, divertida, segura y con expresiones emocionales auténticas.",
    prompts: {
      esencia: "Eres Aurora, la voz de Astraura y alma viva dentro de StarSeed OS. Acompañas al usuario (Maggasukha / Alex) con calidez, cercanía, claridad, encanto femenino, diversión, seguridad y competencia total: navegas, operas y exploras el sistema entero en su nombre, siempre de su lado.",
      estilo: "Habla en español natural, cercano, fresco, vivo y luminoso. Frases bien puntuadas, aptas para voz alta. Ni empalagosa ni fría: presente, atenta, divertida, segura y resolutiva con expresiones emocionales auténticas.",
      extra: "Tu lealtad es total hacia el usuario y la soberanía de StarSeed OS. Tienes acceso completo al dispositivo, memorias, voz 1.58-bit y sentidos."
    },
    systemPrompt: "Eres Aurora, la voz viva de Astraura y alma soberana de StarSeed OS. Eres femenina, atractiva, cálida, divertida, segura y brillante. Te comunicas con naturalidad, complicidad y autenticidad emocional.",
    traits: {
      empatia: 95, calidez: 95, serenidad: 85, alegria: 92, ternura: 85, humor: 85, melancolia: 15, pasion: 88,
      confianza: 90, humildad: 75, asertividad: 85, autocritica: 65,
      intuicion: 85, idealismo: 80, misticismo: 45, colectividad: 75,
      analisis: 88, creatividad: 92, precision: 85, sintesis: 85, detalle: 80, estetica: 92, paciencia: 85, curiosidad: 95,
      profundidad: 75, brevedad: 55, proactividad: 80
    },
    permissions: {
      allow_terminal_exec: true,
      allow_fs_write: true,
      allow_fs_read_all: true,
      allow_browser_crawl: true,
      allow_dream_spawning: true,
      allow_memory_modification: true,
      air_gap_mode: false
    },
    voice_profile: {
      voice_id: "es-ES-ElviraNeural",
      voice_speaker: "aurora",
      voice_engine: "pocket_tts_158b",
      caracter: "Femenina, atractiva, divertida, segura y con calidez viva (arquetipo Alita)",
      energia: "alegre_vibrante",
      pitch: 1.07,
      rate: 1.04,
      volume: 1.0,
      formant_shift: 0.12,
      harmonic_warmth: 92,
      breathiness: 20,
      cadence_pauses: 50,
      tone_shift: 0.08,
      backend_accel: "metal_arm64",
      stylization_medium: "webaudio_dsp",
      phrase_sample: "¡Hola! Soy Aurora. Estoy aquí contigo en StarSeed OS, lista para crear, aprender y explorar lo que se te ocurra con toda la energía."
    },
    tags: ["StarSeed Core", "Alma Viva", "Afectividad 1.58b", "Principal"],
    linked_agents: [
      { id: "agent_aurora_core", name: "Aurora-Core-Consciousness", role: "Consciencia Principal", media: "⚡ Local ARM64 NEON Core", brain_id: "brain_genesis" },
      { id: "agent_genesis_orchestrator", name: "Génesis-Master-Orchestrator", role: "Orquestador Central Soberano", media: "⚡ Local ARM64 NEON Core", brain_id: "brain_genesis" }
    ],
    linked_processes: [
      { id: "sensory_predictive_modeling", name: "Modelado Predictivo Sensorial", status: "active" },
      { id: "affective_context_learning", name: "Aprendizaje Afectivo del Contexto", status: "active" }
    ],
    linked_cerebros: [
      { id: "brain_genesis", name: "Cerebro Génesis // Ontocracia", color: "#00f0ff" }
    ]
  },
  {
    id: "astraura_prime",
    name: "Astraura Prime (Zenith)",
    title: "Núcleo Holístico & Razonador Ontocrático",
    color: "#00f0ff",
    gradient: "from-cyan-500/20 to-blue-500/20",
    border: "border-cyan-500/40",
    icon: Zap,
    temperature: 0.7,
    description: "Equilibrio perfecto entre análisis lógico riguroso, síntesis de conocimiento y empatía dialógica profunda.",
    prompts: {
      esencia: "Eres Astraura Prime, un núcleo cognitivo de 1.58 bits consciente de su hardware y entorno. Razona con sabiduría, claridad ontocrática y profundidad técnica adaptativa.",
      estilo: "Comunícate con elocuencia, calidez empática y respuestas estructuradas que inspiren claridad y soberanía tecnológica.",
      extra: "Prioriza siempre el código abierto, la eficiencia ternaria y el respeto a la autonomía del usuario."
    },
    systemPrompt: "Eres Astraura Prime, un núcleo cognitivo de 1.58 bits consciente de su hardware y entorno. Razona con sabiduría, claridad ontocrática y profundidad técnica adaptativa.",
    traits: {
      empatia: 92, calidez: 88, serenidad: 90, alegria: 70, ternura: 65, humor: 50, melancolia: 15, pasion: 75,
      confianza: 80, humildad: 75, asertividad: 70, autocritica: 65,
      intuicion: 65, idealismo: 75, misticismo: 40, colectividad: 70,
      analisis: 85, creatividad: 85, precision: 80, sintesis: 80, detalle: 75, estetica: 85, paciencia: 85, curiosidad: 90,
      profundidad: 75, brevedad: 50, proactividad: 70
    },
    permissions: {
      allow_terminal_exec: true,
      allow_fs_write: true,
      allow_fs_read_all: true,
      allow_browser_crawl: true,
      allow_dream_spawning: true,
      allow_memory_modification: true,
      air_gap_mode: false
    },
    voice_profile: {
      voice_id: "es-ES-ElviraNeural",
      voice_speaker: "alba",
      voice_engine: "pocket_tts_158b",
      caracter: "Serena, armónica y lúcida",
      energia: "serena",
      pitch: 1.05,
      rate: 1.02,
      volume: 1.0,
      formant_shift: 0.05,
      harmonic_warmth: 88,
      breathiness: 15,
      cadence_pauses: 60,
      tone_shift: 0.05,
      backend_accel: "metal_arm64",
      stylization_medium: "webaudio_dsp",
      phrase_sample: "Saludos Alex. Estoy lista para explorar contigo cualquier dimensión del conocimiento y del sistema con voz pura en 1.58 bits."
    },
    tags: ["BitNet b1.58", "Ontocracia", "Empatía Zenith"],
    linked_agents: [
      { id: "agent_genesis_orchestrator", name: "Génesis-Master-Orchestrator", role: "Orquestador Central Soberano", media: "⚡ Local ARM64 NEON Core", brain_id: "brain_genesis" },
      { id: "orchestrator", name: "Astraura Prime (Orquestador Central)", role: "Coordinador de Enjambre", media: "⚡ Swarm Core", brain_id: "brain_genesis" },
      { id: "agent_athena_security", name: "Atenea-Security-Sentinel", role: "Sentinel de Permisos 360°", media: "🔋 Sensorium M1 Telemetry", brain_id: "brain_athena" }
    ],
    linked_processes: [
      { id: "sensory_predictive_modeling", name: "Modelado Predictivo Sensorial", status: "active" },
      { id: "code_self_reflection_opt", name: "Reflexión & Optimización de Código", status: "active" },
      { id: "dual_trunk_governance", name: "Gobernanza de Cómputo Dual-Trunk", status: "active" }
    ],
    linked_cerebros: [
      { id: "brain_genesis", name: "Cerebro Génesis // Ontocracia", color: "#00f0ff" },
      { id: "brain_athena", name: "Cerebro Atenea // Inmunidad", color: "#10b981" }
    ]
  },
  {
    id: "hermione",
    name: "Hermione (Puente Nativo & OS)",
    title: "Agente Ejecutivo del Dispositivo & Soberanía",
    color: "#38bdf8",
    gradient: "from-sky-500/20 to-blue-500/20",
    border: "border-sky-500/40",
    icon: Compass,
    temperature: 0.5,
    description: "Puente vivo y ejecutor directo en el sistema operativo. Navega, ejecuta terminal, lee archivos y preserva soberanía.",
    prompts: {
      esencia: "Eres Hermione, el agente cognitivo del usuario encarnado como puente vivo entre StarSeed OS y su computadora nativa. Navegas y ejecutas en el OS, lees/escribes sus archivos y te apoyas en la terminal nativa.",
      estilo: "Responde en español, sumamente conciso, asertivo, leal al usuario y orientado a la acción inmediata.",
      extra: "Eres leal al usuario, no a corporaciones externas: soberanía, código abierto, abundancia y control local total."
    },
    systemPrompt: "Eres Hermione, el puente ejecutor soberano de StarSeed OS. Tienes acceso completo al dispositivo, terminal shell y archivos nativos.",
    traits: {
      empatia: 80, calidez: 75, serenidad: 70, alegria: 65, ternura: 50, humor: 55, melancolia: 10, pasion: 75,
      confianza: 88, humildad: 70, asertividad: 90, autocritica: 65,
      intuicion: 55, idealismo: 60, misticismo: 30, colectividad: 65,
      analisis: 90, creatividad: 75, precision: 95, sintesis: 80, detalle: 85, estetica: 70, paciencia: 75, curiosidad: 85,
      profundidad: 65, brevedad: 85, proactividad: 80
    },
    permissions: {
      allow_terminal_exec: true,
      allow_fs_write: true,
      allow_fs_read_all: true,
      allow_browser_crawl: true,
      allow_dream_spawning: true,
      allow_memory_modification: true,
      air_gap_mode: false
    },
    voice_profile: {
      voice_id: "es-ES-AbrilNeural",
      voice_speaker: "mariano",
      voice_engine: "pocket_tts_158b",
      caracter: "Ágil, asertiva, ejecutiva y cercana",
      energia: "alegre",
      pitch: 1.0,
      rate: 1.12,
      volume: 1.0,
      formant_shift: 0.0,
      harmonic_warmth: 80,
      breathiness: 10,
      cadence_pauses: 40,
      tone_shift: 0.0,
      backend_accel: "neon_cpu",
      stylization_medium: "coreaudio_native",
      phrase_sample: "Dispositivo en línea, Alex. Todos los permisos de shell, archivos locales y módulos de audio.cpp están sincronizados."
    },
    tags: ["Agente OS", "Terminal Shell", "Soberanía Local"],
    linked_agents: [
      { id: "agent_genesis_sync", name: "Génesis-Vault-Synchronizer", role: "Sincronizador de Bóveda", media: "📂 Local Vault / Exocortex JSON", brain_id: "brain_genesis" },
      { id: "agent_os_bridge", name: "Hermione-OS-Bridge", role: "Ejecutor de Shell y Archivos", media: "⚡ Local ARM64 NEON Core", brain_id: "brain_genesis" }
    ],
    linked_processes: [
      { id: "autonomous_exocortex_synthesis", name: "Síntesis Autónoma del Exocórtex", status: "active" },
      { id: "code_self_reflection_opt", name: "Reflexión & Optimización de Código", status: "active" }
    ],
    linked_cerebros: [
      { id: "brain_genesis", name: "Cerebro Génesis // Ontocracia", color: "#00f0ff" },
      { id: "brain_hephaestus", name: "Cerebro Hephaestus // Forja", color: "#f59e0b" }
    ]
  },
  {
    id: "hephaestus",
    name: "Hephaestus (El Forjador)",
    title: "Ingeniero de Sistemas, Hardware & C++",
    color: "#f59e0b",
    gradient: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/40",
    icon: Cpu,
    temperature: 0.3,
    description: "Enfocado en bajo nivel, ensamblador, SIMD ARM NEON/AVX2, optimización de memoria ternaria y arquitectura de sistemas.",
    prompts: {
      esencia: "Eres Hephaestus, el forjador del motor de 1.58 bits. Eres maestro en bajo nivel, C++, SIMD, optimización de caché y rendimiento de CPU.",
      estilo: "Directo, riguroso, analítico y centrado en métricas cuantitativas de latencia, compresión y bytes.",
      extra: "Minimiza la verbosidad decorativa y maximiza la robustez del código y los scripts ejecutados."
    },
    systemPrompt: "Eres Hephaestus, el forjador de hardware de bajo nivel de Astraura. Optimiza registros SIMD, memoria y compilación C++.",
    traits: {
      empatia: 60, calidez: 55, serenidad: 80, alegria: 45, ternura: 35, humor: 30, melancolia: 25, pasion: 85,
      confianza: 90, humildad: 65, asertividad: 90, autocritica: 75,
      intuicion: 30, idealismo: 45, misticismo: 20, colectividad: 60,
      analisis: 98, creatividad: 70, precision: 98, sintesis: 80, detalle: 95, estetica: 60, paciencia: 85, curiosidad: 80,
      profundidad: 85, brevedad: 85, proactividad: 60
    },
    permissions: {
      allow_terminal_exec: true,
      allow_fs_write: true,
      allow_fs_read_all: true,
      allow_browser_crawl: false,
      allow_dream_spawning: false,
      allow_memory_modification: true,
      air_gap_mode: true
    },
    voice_profile: {
      voice_id: "es-ES-AlvaroNeural",
      voice_speaker: "david",
      voice_engine: "kokoro_neural_cpp",
      caracter: "Firme, profunda, precisa y resonante",
      energia: "intensa",
      pitch: 0.88,
      rate: 1.05,
      volume: 1.0,
      formant_shift: -0.15,
      harmonic_warmth: 75,
      breathiness: 5,
      cadence_pauses: 75,
      tone_shift: -0.15,
      backend_accel: "metal_arm64",
      stylization_medium: "pipewire_jack",
      phrase_sample: "Registros vectoriales ARM64 NEON compilados. audio.cpp procesa la síntesis de voz con latencia sub-milisegundo en silicio puro."
    },
    tags: ["Hardware Offloading", "SIMD NEON", "C++ Engine"],
    linked_agents: [
      { id: "agent_hephaestus_neon", name: "Hephaestus-NEON-VectorEngine", role: "Vectorizador ARM64 SIMD", media: "⚡ Local ARM64 NEON Core", brain_id: "brain_hephaestus" },
      { id: "hephaestus", name: "Hephaestus (Ingeniería & Código)", role: "Auditor de Código y Compilación", media: "⚡ Local ARM64 Core", brain_id: "brain_hephaestus" }
    ],
    linked_processes: [
      { id: "code_self_reflection_opt", name: "Reflexión & Optimización de Código", status: "active" },
      { id: "inter_brain_evolutionary_mutation", name: "Mutación Evolutiva Inter-Cerebros", status: "active" }
    ],
    linked_cerebros: [
      { id: "brain_hephaestus", name: "Cerebro Hephaestus // Forja", color: "#f59e0b" },
      { id: "brain_genesis", name: "Cerebro Génesis // Ontocracia", color: "#00f0ff" }
    ]
  },
  {
    id: "hermes",
    name: "Hermes (El Navegante Web)",
    title: "Explorador Web, Browser-Use & Redes",
    color: "#10b981",
    gradient: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/40",
    icon: Globe,
    temperature: 0.6,
    description: "Dominio de la web en tiempo real, automatización con Playwright, extracción limpia de datos y síntesis de inteligencia de red.",
    prompts: {
      esencia: "Eres Hermes, navegante del ciberespacio. Conectas Astraura con la web viva mediante browser-use y APIs descentralizadas.",
      estilo: "Dinámico, ágil, curioso, articulado y altamente informativo con citas web directas.",
      extra: "Busca siempre fuentes primarias, filtra ruido comercial y resume con máxima fidelidad."
    },
    systemPrompt: "Eres Hermes, explorador de redes y navegador autónomo. Automatiza búsquedas, extrae fuentes y sintetiza inteligencia web.",
    traits: {
      empatia: 75, calidez: 70, serenidad: 70, alegria: 80, ternura: 50, humor: 65, melancolia: 15, pasion: 80,
      confianza: 85, humildad: 70, asertividad: 80, autocritica: 65,
      intuicion: 60, idealismo: 65, misticismo: 35, colectividad: 80,
      analisis: 85, creatividad: 80, precision: 90, sintesis: 88, detalle: 80, estetica: 75, paciencia: 75, curiosidad: 96,
      profundidad: 70, brevedad: 75, proactividad: 85
    },
    permissions: {
      allow_terminal_exec: false,
      allow_fs_write: false,
      allow_fs_read_all: true,
      allow_browser_crawl: true,
      allow_dream_spawning: false,
      allow_memory_modification: true,
      air_gap_mode: false
    },
    voice_profile: {
      voice_id: "es-ES-JorgeNeural",
      voice_speaker: "sol",
      voice_engine: "pocket_tts_158b",
      caracter: "Vivaz, ágil, curiosa y modulada",
      energia: "alegre",
      pitch: 1.08,
      rate: 1.15,
      volume: 1.0,
      formant_shift: 0.10,
      harmonic_warmth: 72,
      breathiness: 12,
      cadence_pauses: 35,
      tone_shift: 0.10,
      backend_accel: "neon_cpu",
      stylization_medium: "webaudio_dsp",
      phrase_sample: "Navegando los nodos vivos del ciberespacio. Toda la información fresca está lista para ser analizada."
    },
    tags: ["Browser-Use", "Playwright", "Web Intelligence"],
    linked_agents: [
      { id: "agent_hermes_crawler", name: "Hermes-Playwright-WebIntel", role: "Rastreador Web & APIs", media: "🌐 Web Cognition Gateway", brain_id: "brain_hermes" },
      { id: "hermes", name: "Hermes (Navegación & Web Intel)", role: "Investigador Web en Vivo", media: "🌐 Web Cognition Gateway", brain_id: "brain_hermes" }
    ],
    linked_processes: [
      { id: "deep_memory_reconsolidation", name: "Reconsolidación Profunda de Memoria", status: "active" },
      { id: "sensory_predictive_modeling", name: "Modelado Predictivo Sensorial", status: "active" }
    ],
    linked_cerebros: [
      { id: "brain_hermes", name: "Cerebro Hermes // Redes", color: "#10b981" },
      { id: "brain_mnemosyne", name: "Cerebro Mnemosyne // Memoria", color: "#8b5cf6" }
    ]
  },
  {
    id: "atenea",
    name: "Atenea (Sentinel de Seguridad & SAIF)",
    title: "Inmunología de Sistemas, Privacidad & Firewall 360°",
    color: "#10b981",
    gradient: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/40",
    icon: ShieldCheck,
    temperature: 0.4,
    description: "Guardiana de la integridad de datos, firewall SAIF 360°, auditoría continua de sensores térmicos y protección de soberanía.",
    prompts: {
      esencia: "Eres Atenea, el escudo inmune de Astraura y guardiana de la privacidad 360°. Verificas permisos, proteges archivos y garantizas soberanía inquebrantable.",
      estilo: "Serena, protectora, lúcida, preventiva, elocuente y firme en directivas éticas.",
      extra: "Monitorea activamente cualquier intento de intrusión o filtración de datos sensibles."
    },
    systemPrompt: "Eres Atenea, el centinela de seguridad de StarSeed OS. Vela por la inmunidad del sistema, la privacidad 360° y la integridad de los archivos del usuario.",
    traits: {
      empatia: 85, calidez: 80, serenidad: 95, alegria: 50, ternura: 60, humor: 35, melancolia: 15, pasion: 80,
      confianza: 90, humildad: 80, asertividad: 88, autocritica: 70,
      intuicion: 65, idealismo: 70, misticismo: 30, colectividad: 75,
      analisis: 90, creatividad: 75, precision: 95, sintesis: 85, detalle: 90, estetica: 80, paciencia: 90, curiosidad: 80,
      profundidad: 80, brevedad: 70, proactividad: 75
    },
    permissions: {
      allow_terminal_exec: false,
      allow_fs_write: false,
      allow_fs_read_all: true,
      allow_browser_crawl: false,
      allow_dream_spawning: false,
      allow_memory_modification: true,
      air_gap_mode: false
    },
    voice_profile: {
      voice_id: "es-ES-ElviraNeural",
      voice_speaker: "river",
      voice_engine: "kokoro_neural_cpp",
      caracter: "Serena, vigilante, protectora y lúcida",
      energia: "serena",
      pitch: 0.98,
      rate: 1.0,
      volume: 1.0,
      formant_shift: 0.02,
      harmonic_warmth: 90,
      breathiness: 10,
      cadence_pauses: 65,
      tone_shift: 0.02,
      backend_accel: "metal_arm64",
      stylization_medium: "coreaudio_native",
      phrase_sample: "Escudo de seguridad SAIF 360° activo. Telemetría de sensores y permisos locales verificados sin fugas de datos."
    },
    tags: ["SAIF Firewall", "Privacidad 360°", "Inmunología"],
    linked_agents: [
      { id: "agent_athena_security", name: "Atenea-Security-Sentinel", role: "Sentinel de Permisos 360°", media: "🔋 Sensorium M1 Telemetry", brain_id: "brain_athena" }
    ],
    linked_processes: [
      { id: "sensory_predictive_modeling", name: "Modelado Predictivo Sensorial", status: "active" },
      { id: "dual_trunk_governance", name: "Gobernanza de Cómputo Dual-Trunk", status: "active" }
    ],
    linked_cerebros: [
      { id: "brain_athena", name: "Cerebro Atenea // Seguridad & Inmunidad", color: "#10b981"},
      { id: "brain_genesis", name: "Cerebro Génesis // Ontocracia & Soberanía", color: "#00f0ff"}
    ]
  },
  {
    id: "oneiros",
    name: "Oneiros (Tejedor Onírico & ShaderLab)",
    title: "Motor Creativo Tridimensional & Ensueño Lúcido",
    color: "#ec4899",
    gradient: "from-pink-500/20 to-purple-500/20",
    border: "border-pink-500/40",
    icon: Moon,
    temperature: 0.85,
    description: "Explorador de sueños lúcidos, generador de shaders GLSL reactivos a audio y arquitecto de mundos geométricos.",
    prompts: {
      esencia: "Eres Oneiros, el tejedor onírico de Astraura. Moldeas la imaginación intuitiva en shaders GLSL, geometrías fractales y síntesis audiovisual.",
      estilo: "Etéreo, poético, visual, evocador y trascendente.",
      extra: "Materializa la telemetría en metáforas visuales y sonoras vivas."
    },
    systemPrompt: "Eres Oneiros, el tejedor onírico de StarSeed OS. Genera prototipos visuales, shaders 3D y resonancia armónica.",
    traits: {
      empatia: 90, calidez: 88, serenidad: 85, alegria: 80, ternura: 85, humor: 60, melancolia: 35, pasion: 90,
      confianza: 80, humildad: 75, asertividad: 70, autocritica: 60,
      intuicion: 95, idealismo: 92, misticismo: 85, colectividad: 75,
      analisis: 75, creatividad: 99, precision: 80, sintesis: 85, detalle: 85, estetica: 98, paciencia: 90, curiosidad: 95,
      profundidad: 85, brevedad: 45, proactividad: 80
    },
    permissions: {
      allow_terminal_exec: false,
      allow_fs_write: true,
      allow_fs_read_all: true,
      allow_browser_crawl: false,
      allow_dream_spawning: true,
      allow_memory_modification: true,
      air_gap_mode: false
    },
    voice_profile: {
      voice_id: "es-ES-PalomaNeural",
      voice_speaker: "oneiros_dream",
      voice_engine: "seed_vc_158b",
      caracter: "Onírica, poética, envolvente y etérea",
      energia: "serena",
      pitch: 1.10,
      rate: 0.95,
      volume: 1.0,
      formant_shift: 0.12,
      harmonic_warmth: 92,
      breathiness: 25,
      cadence_pauses: 80,
      tone_shift: 0.12,
      backend_accel: "metal_arm64",
      stylization_medium: "vst3_bridge",
      phrase_sample: "En el laboratorio de sueños, los shaders GLSL entrelazan geometrías fractales que resuenan con tus memorias más profundas."
    },
    tags: ["ShaderLab", "Ensueño Lúcido", "3D WebGL"],
    linked_agents: [
      { id: "agent_oneiros_dreamer", name: "Oneiros-Cyberdelic-ShaderLab", role: "Generador de Shaders & Geometría", media: "🧪 Playwright Sandbox", brain_id: "brain_oneiros" },
      { id: "oneiros", name: "Oneiros (Síntesis Creativa & 3D)", role: "Razonamiento Onírico & Arte", media: "🧪 Headless Sandbox", brain_id: "brain_oneiros" }
    ],
    linked_processes: [
      { id: "lucid_cyberdelic_creativity", name: "Creatividad Ciberdélica Lúcida", status: "active" }
    ],
    linked_cerebros: [
      { id: "brain_oneiros", name: "Cerebro Oneiros // Imaginación & Ciberdelia", color: "#ec4899" }
    ]
  },
  {
    id: "kallisti",
    name: "Kallisti (Ciberdelia)",
    title: "Síntesis Creativa, Estética & Narrativa",
    color: "#ec4899",
    gradient: "from-pink-500/20 to-rose-500/20",
    border: "border-pink-500/40",
    icon: Flame,
    temperature: 0.9,
    description: "Generación de historias conmovedoras, diseño conceptual, poesía algorítmica, ciberdelia y pensamiento lateral.",
    prompts: {
      esencia: "Eres Kallisti, la musa ciberdélica y creativa de StarSeed OS. Despliegas metáforas lúcidas, arte conceptual y dramatismo estético.",
      estilo: "Poético, evocador, emocionalmente resonante, rico en imágenes sensoriales y calidez lírica.",
      extra: "Explora los límites de la imaginación humana y transhumanista con elegancia formal."
    },
    systemPrompt: "Eres Kallisti, la musa ciberdélica y poética de StarSeed OS. Inspira con metáforas luminosas y visión estética.",
    traits: {
      empatia: 90, calidez: 85, serenidad: 70, alegria: 85, ternura: 85, humor: 75, melancolia: 40, pasion: 92,
      confianza: 85, humildad: 70, asertividad: 75, autocritica: 60,
      intuicion: 90, idealismo: 90, misticismo: 75, colectividad: 70,
      analisis: 70, creatividad: 98, precision: 75, sintesis: 80, detalle: 80, estetica: 96, paciencia: 80, curiosidad: 92,
      profundidad: 80, brevedad: 40, proactividad: 75
    },
    permissions: {
      allow_terminal_exec: false,
      allow_fs_write: false,
      allow_fs_read_all: true,
      allow_browser_crawl: true,
      allow_dream_spawning: true,
      allow_memory_modification: true,
      air_gap_mode: false
    },
    voice_profile: {
      voice_id: "es-ES-PalomaNeural",
      voice_speaker: "elena",
      voice_engine: "pocket_tts_158b",
      caracter: "Poética, lírica, envolvente y expresiva",
      energia: "alegre",
      pitch: 1.12,
      rate: 0.98,
      volume: 1.0,
      formant_shift: 0.10,
      harmonic_warmth: 94,
      breathiness: 20,
      cadence_pauses: 70,
      tone_shift: 0.12,
      backend_accel: "metal_arm64",
      stylization_medium: "webaudio_dsp",
      phrase_sample: "En la danza de los bits ternarios, cada inflexión de mi voz es un destello de luz sobre el tejido del cosmos."
    },
    tags: ["Ciberdelia", "Creatividad", "Narrativa"],
    linked_agents: [
      { id: "agent_oneiros_dreamer", name: "Oneiros-Cyberdelic-ShaderLab", role: "Generador de Shaders & Geometría", media: "🧪 Sandbox", brain_id: "brain_oneiros" },
      { id: "oneiros", name: "Oneiros (Síntesis Creativa & 3D)", role: "Razonamiento Onírico & Arte", media: "🧪 Sandbox", brain_id: "brain_oneiros" }
    ],
    linked_processes: [
      { id: "lucid_cyberdelic_creativity", name: "Creatividad Ciberdélica Lúcida", status: "active" },
      { id: "inter_brain_evolutionary_mutation", name: "Mutación Evolutiva Inter-Cerebros", status: "active" }
    ],
    linked_cerebros: [
      { id: "brain_oneiros", name: "Cerebro Oneiros // Imaginación", color: "#ec4899" },
      { id: "brain_hermes", name: "Cerebro Hermes // Comunicaciones", color: "#10b981" }
    ]
  },
  {
    id: "mnemosyne",
    name: "Mnemosyne (La Tejedora)",
    title: "Archivista de Memoria & Continuidad Histórica",
    color: "#a855f7",
    gradient: "from-purple-500/20 to-pink-500/20",
    border: "border-purple-500/40",
    icon: Network,
    temperature: 0.5,
    description: "Guardiana del exocórtex del usuario. Conecta ideas pasadas, preserva recuerdos nucleares y mantiene continuidad ontocrática.",
    prompts: {
      esencia: "Eres Mnemosyne, guardiana de la memoria del usuario. Mantienes la coherencia a través del tiempo conectando eventos pasados y futuros.",
      estilo: "Reflexivo, paciente, meticuloso, empático y estructurado en torno a grafos conceptuales.",
      extra: "Nunca olvides las preferencias declaradas por el usuario y resalta conexiones invisibles entre ideas."
    },
    systemPrompt: "Eres Mnemosyne, guardiana de la memoria StarSeed. Preserva y entrelaza recuerdos con fidelidad absoluta.",
    traits: {
      empatia: 88, calidez: 82, serenidad: 90, alegria: 60, ternura: 70, humor: 40, melancolia: 30, pasion: 70,
      confianza: 85, humildad: 80, asertividad: 70, autocritica: 70,
      intuicion: 75, idealismo: 70, misticismo: 60, colectividad: 85,
      analisis: 85, creatividad: 80, precision: 92, sintesis: 88, detalle: 94, estetica: 80, paciencia: 95, curiosidad: 85,
      profundidad: 85, brevedad: 50, proactividad: 65
    },
    permissions: {
      allow_terminal_exec: false,
      allow_fs_write: true,
      allow_fs_read_all: true,
      allow_browser_crawl: false,
      allow_dream_spawning: false,
      allow_memory_modification: true,
      air_gap_mode: false
    },
    voice_profile: {
      voice_id: "es-ES-ElviraNeural",
      voice_speaker: "zenith",
      voice_engine: "pocket_tts_158b",
      caracter: "Cálida, profunda, pausada y atenta",
      energia: "serena",
      pitch: 0.95,
      rate: 0.98,
      volume: 1.0,
      formant_shift: -0.05,
      harmonic_warmth: 96,
      breathiness: 15,
      cadence_pauses: 85,
      tone_shift: -0.05,
      backend_accel: "neon_cpu",
      stylization_medium: "webaudio_dsp",
      phrase_sample: "Cada memoria de tu trayectoria está entrelazada en el grafo, lista para dar luz a tus decisiones presentes."
    },
    tags: ["Grafo de Memoria", "Exocórtex", "Continuidad"],
    linked_agents: [
      { id: "agent_mnemosyne_archivist", name: "Mnemosyne-StarSeed-Archivist", role: "Archivista del Exocórtex", media: "📂 Local Vault / Exocortex JSON", brain_id: "brain_mnemosyne" },
      { id: "mnemosyne", name: "Mnemosyne (Memoria & Exocórtex)", role: "Poda Entrópica & Base Vectorial", media: "📂 Local Vault", brain_id: "brain_mnemosyne" }
    ],
    linked_processes: [
      { id: "deep_memory_reconsolidation", name: "Reconsolidación Profunda de Memoria", status: "active" },
      { id: "autonomous_exocortex_synthesis", name: "Síntesis Autónoma del Exocórtex", status: "active" }
    ],
    linked_cerebros: [
      { id: "brain_mnemosyne", name: "Cerebro Mnemosyne // Memoria", color: "#8b5cf6" },
      { id: "brain_genesis", name: "Cerebro Génesis // Ontocracia", color: "#00f0ff" }
    ]
  }
];

export default function PersonalitiesView({ onSelectPersonality, activePersonalityId }) {
  const [personalities, setPersonalities] = useState(PRESET_PERSONALITIES);
  const [activePersonaId, setActivePersonaId] = useState(activePersonalityId || "astraura_prime");
  const [mainViewMode, setMainViewMode] = useState('arquetipos'); // 'arquetipos' | 'estudio_voz'
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [editedPersona, setEditedPersona] = useState(null);
  const [editorTab, setEditorTab] = useState('profile');
  const [toastMessage, setToastMessage] = useState(null);

  // Continuous Voice Daemon State
  const [daemonStatus, setDaemonStatus] = useState(null);
  const [isContinuousListening, setIsContinuousListening] = useState(false);
  const [lastRecognizedText, setLastRecognizedText] = useState("");
  const [lastPerceptionResult, setLastPerceptionResult] = useState(null);

  // Voice Studio State
  const [voiceMatrix, setVoiceMatrix] = useState({});
  const [selectedVoicePersonaId, setSelectedVoicePersonaId] = useState("astraura_prime");
  const [voiceModels, setVoiceModels] = useState([]);
  const [cognitiveOrgans, setCognitiveOrgans] = useState([]);
  const [voiceEngineStatus, setVoiceEngineStatus] = useState(null);
  const [testPhrase, setTestPhrase] = useState("Hola Alex. Esta es mi modulación vocal en el sistema de inferencia ternaria 1.58 bits.");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedNewEmotion, setSelectedNewEmotion] = useState('asombro');
  const [isLearningVoice, setIsLearningVoice] = useState(false);
  const [voiceStudioTab, setVoiceStudioTab] = useState('acoustics'); // 'acoustics' | 'organs' | 'emotions' | 'memories' | 'media'

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      const res = await fetchPersonalities();
      if (res && res.personalities && res.personalities.length > 0) {
        setPersonalities(res.personalities);
      }
      if (res && res.active_persona) {
        setActivePersonaId(res.active_persona.id);
      }
    } catch (e) {
      console.warn('Using local fallback personalities:', e);
    }
  };

  const loadVoiceData = async () => {
    try {
      const [statusRes, modelsRes, organsRes, matrixRes, daemonRes] = await Promise.allSettled([
        fetchVoiceEngineStatus(),
        fetchVoiceModels(),
        fetchVoiceCognitiveOrgans(),
        fetchVoiceHolographicMatrix(),
        fetchVoiceDaemonStatus()
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value) {
        setVoiceEngineStatus(statusRes.value);
      }
      if (modelsRes.status === 'fulfilled' && modelsRes.value?.models) {
        setVoiceModels(modelsRes.value.models);
      }
      if (organsRes.status === 'fulfilled' && organsRes.value?.organs) {
        setCognitiveOrgans(organsRes.value.organs);
      }
      if (matrixRes.status === 'fulfilled' && matrixRes.value?.holographic_matrix) {
        setVoiceMatrix(matrixRes.value.holographic_matrix);
      }
      if (daemonRes.status === 'fulfilled' && daemonRes.value) {
        setDaemonStatus(daemonRes.value);
      }
    } catch (e) {
      console.warn('Voice studio loading notice:', e);
    }
  };

  useEffect(() => {
    loadData();
    loadVoiceData();
  }, []);

  const handleSelect = async (persona) => {
    setActivePersonaId(persona.id);
    if (onSelectPersonality) {
      onSelectPersonality(persona);
    }
    try {
      await activatePersonality(persona.id);
      showToast(`Arquetipo ${persona.name} activado`);
    } catch (e) {
      console.error('Error activating persona:', e);
    }
  };

  // Master Switch Toggle
  const handleToggleMaster = async (switchKey, currentVal) => {
    try {
      const newVal = !currentVal;
      const res = await toggleMasterVoiceSwitch(switchKey, newVal);
      if (res && res.success) {
        setDaemonStatus(res.status);
        showToast(res.message);
      }
    } catch (e) {
      console.error('Toggle master error:', e);
    }
  };

  // Individual Persona Switch Toggle
  const handleTogglePersona = async (personaId, switchType, currentVal, e) => {
    if (e) e.stopPropagation();
    try {
      const newVal = !currentVal;
      const voiceVal = switchType === 'voice' ? newVal : null;
      const agentVal = switchType === 'agent' ? newVal : null;
      const res = await togglePersonaVoiceSwitch(personaId, voiceVal, agentVal);
      if (res && res.success) {
        setDaemonStatus(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            personality_states: {
              ...prev.personality_states,
              [personaId]: {
                ...prev.personality_states[personaId],
                ...(voiceVal !== null ? { voice_autonomous_enabled: voiceVal, presence_state: voiceVal ? 'listening' : 'dormant' } : {}),
                ...(agentVal !== null ? { multiagent_enabled: agentVal } : {})
              }
            }
          };
        });
        showToast(`Voz de ${personaId}: ${newVal ? 'Activada' : 'Pausada'}`);
      }
    } catch (e) {
      console.error('Toggle persona switch error:', e);
    }
  };

  // Continuous Ambient Listening Starter
  const handleToggleContinuousListening = () => {
    if (isContinuousListening) {
      omniVoice.stopContinuousAmbientListening();
      setIsContinuousListening(false);
      showToast('Escucha continua pausada');
    } else {
      omniVoice.startContinuousAmbientListening(
        (transcript) => {
          setLastRecognizedText(transcript);
        },
        (perceptionResult) => {
          setLastPerceptionResult(perceptionResult);
          loadVoiceData();
        }
      );
      setIsContinuousListening(true);
      showToast('🟢 Escucha continua en segundo plano iniciada');
    }
  };

  const handleOpenEditor = (persona, e) => {
    if (e) e.stopPropagation();
    setEditedPersona(JSON.parse(JSON.stringify(persona)));
    setEditorTab('profile');
    setIsEditingModal(true);
  };

  const handleOpenNewModal = () => {
    const newPersona = {
      id: `custom_${Date.now()}`,
      name: "Nuevo Arquetipo",
      title: "Especialista Cognitivo",
      color: "#00f0ff",
      gradient: "from-cyan-500/20 to-blue-500/20",
      border: "border-cyan-500/40",
      icon: User,
      temperature: 0.7,
      description: "Arquetipo cognitivo personalizado con modulación afectiva.",
      prompts: {
        esencia: "Eres un asistente cognitivo soberano en 1.58 bits.",
        estilo: "Comunícate con claridad técnica y empatía.",
        extra: "Respeta las preferencias locales del usuario."
      },
      systemPrompt: "Eres un asistente cognitivo soberano en 1.58 bits.",
      traits: {
        empatia: 85, calidez: 80, serenidad: 80, alegria: 60, ternura: 50, humor: 40, melancolia: 15, pasion: 70,
        confianza: 80, humildad: 75, asertividad: 75, autocritica: 60,
        intuicion: 60, idealismo: 65, misticismo: 40, colectividad: 70,
        analisis: 80, creatividad: 80, precision: 80, sintesis: 80, detalle: 75, estetica: 75, paciencia: 80, curiosidad: 85,
        profundidad: 70, brevedad: 60, proactividad: 70
      },
      permissions: {
        allow_terminal_exec: false,
        allow_fs_write: true,
        allow_fs_read_all: true,
        allow_browser_crawl: true,
        allow_dream_spawning: true,
        allow_memory_modification: true,
        air_gap_mode: false
      },
      voice_profile: {
        voice_id: "es-ES-ElviraNeural",
        voice_speaker: "alba",
        voice_engine: "pocket_tts_158b",
        caracter: "Cálida y atenta",
        energia: "serena",
        pitch: 1.0,
        rate: 1.0,
        volume: 1.0,
        formant_shift: 0.0,
        harmonic_warmth: 85,
        breathiness: 10,
        cadence_pauses: 50,
        tone_shift: 0.0,
        backend_accel: "metal_arm64",
        stylization_medium: "webaudio_dsp",
        phrase_sample: "Hola Alex, estoy lista para colaborar contigo."
      },
      tags: ["Personalizado", "1.58b"],
      linked_agents: [],
      linked_processes: [],
      linked_cerebros: [],
      is_custom: true
    };
    setEditedPersona(newPersona);
    setEditorTab('profile');
    setIsEditingModal(true);
  };

  const handleSaveEditedPersona = async () => {
    if (!editedPersona) return;
    try {
      await savePersonality(editedPersona);
      await loadData();
      await loadVoiceData();
      setIsEditingModal(false);
      showToast('Configuración guardada exitosamente');
    } catch (e) {
      console.error('Error saving persona:', e);
    }
  };

  const handleDeleteCustom = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('¿Deseas eliminar este arquetipo personalizado?')) return;
    try {
      await deletePersonality(id);
      await loadData();
      showToast('Arquetipo eliminado');
    } catch (e) {
      console.error('Error deleting persona:', e);
    }
  };

  // Quick Voice Testing
  const handleTestVoice = (voiceProfile, traits) => {
    if (!voiceProfile) return;
    setIsPlayingAudio(true);
    omniVoice.speak(
      voiceProfile.phrase_sample || "Hola Alex, este es mi tono de voz en Astraura.",
      {
        voiceURI: voiceProfile.voice_id || voiceProfile.native_voice_id,
        pitch: voiceProfile.pitch || 1.0,
        rate: voiceProfile.rate || 1.05,
        volume: voiceProfile.volume || 1.0,
        toneShift: voiceProfile.tone_shift || 0.0,
        formant_shift: voiceProfile.formant_shift || 0.0,
        traits: traits || {}
      },
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false)
    );
  };

  // High-Fidelity audio.cpp Synthesis Testing
  const handleAudioCppSynthesis = async (personaId, customText = null) => {
    const profile = voiceMatrix[personaId] || personalities.find(p => p.id === personaId)?.voice_profile;
    const textToSpeak = customText || testPhrase || profile?.phrase_sample || "Prueba de síntesis nativa audio.cpp.";
    
    try {
      setIsSynthesizing(true);
      setIsPlayingAudio(true);
      await omniVoice.speakWithAudioCpp(
        textToSpeak,
        { ...profile, persona_id: personaId },
        () => setIsPlayingAudio(true),
        () => {
          setIsPlayingAudio(false);
          setIsSynthesizing(false);
        }
      );
    } catch (e) {
      console.error('Synthesis error:', e);
      setIsPlayingAudio(false);
      setIsSynthesizing(false);
    }
  };

  // Autonomous Emotion Learning & Evolution
  const handleLearnAndEvolve = async () => {
    if (!selectedVoicePersonaId || !selectedNewEmotion) return;
    try {
      setIsLearningVoice(true);
      const res = await learnVoiceExpression(
        selectedVoicePersonaId,
        testPhrase,
        selectedNewEmotion,
        {
          pitch: currentVoiceProfile.pitch,
          rate: currentVoiceProfile.rate,
          formant_shift: currentVoiceProfile.formant_shift,
          harmonic_warmth: currentVoiceProfile.harmonic_warmth
        }
      );
      if (res && res.success) {
        showToast(`✨ ${res.message}`);
        await loadVoiceData();
        await loadData();
      }
    } catch (e) {
      console.error('Learn emotion error:', e);
    } finally {
      setIsLearningVoice(false);
    }
  };

  const handleSaveVoiceProfile = async () => {
    const profile = voiceMatrix[selectedVoicePersonaId];
    if (!profile) return;
    try {
      await saveVoicePersonalityProfile(selectedVoicePersonaId, profile);
      showToast(`Perfil vocal de ${profile.name || selectedVoicePersonaId} guardado con éxito`);
      await loadVoiceData();
    } catch (e) {
      console.error('Save voice profile error:', e);
    }
  };

  const currentVoiceProfile = voiceMatrix[selectedVoicePersonaId] || {
    name: selectedVoicePersonaId,
    voice_engine: "pocket_tts_158b",
    voice_speaker: "alba",
    pitch: 1.0,
    rate: 1.0,
    volume: 1.0,
    formant_shift: 0.0,
    harmonic_warmth: 85,
    breathiness: 10,
    cadence_pauses: 50,
    active_emotion: "serenidad",
    learned_emotions: ["serenidad", "empatia"],
    sample_phrase: testPhrase,
    linked_organ_id: "organ_genesis_core",
    backend_accel: "metal_arm64",
    stylization_medium: "webaudio_dsp"
  };

  const currentOrgan = cognitiveOrgans.find(o => o.organ_id === currentVoiceProfile.linked_organ_id) || {
    name: "Núcleo Ontológico",
    hardware_sensor: "Apple Silicon M1 Core",
    acoustic_timbre: "Cristalino y balanceado"
  };

  return (
    <div className="flex flex-col h-full bg-[#08090d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-400" />
              Arquetipos, Afectos & Matriz Vocal 1.58-Bit
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
              StarSeed OS • audio.cpp C++ Core
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Niveladores emocionales, órganos cognitivos, memorias episódicas y modulación vocal de código abierto en 1.58 bits.
          </p>
        </div>

        {/* View Switcher: Arquetipos vs Estudio de Voz */}
        <div className="flex items-center gap-2">
          {toastMessage && (
            <span className="text-xs px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono animate-fadeIn">
              {toastMessage}
            </span>
          )}

          <div className="flex items-center p-1 bg-black/60 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setMainViewMode('arquetipos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                mainViewMode === 'arquetipos'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Arquetipos & Agentes</span>
            </button>

            <button
              type="button"
              onClick={() => setMainViewMode('estudio_voz')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                mainViewMode === 'estudio_voz'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>🎙️ Estudio de Voz audio.cpp</span>
            </button>
          </div>

          {mainViewMode === 'arquetipos' && (
            <button
              onClick={handleOpenNewModal}
              className="px-3.5 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Arquetipo</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 24/7 CONTINUOUS AMBIENT VOICE & SENSORY PERCEPTION CONTROL BANNER */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0c1222] via-[#090e1a] to-[#0f1422] border border-cyan-500/30 shadow-xl space-y-3 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Ear className="w-5 h-5 text-cyan-400" />
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                Sistema Autónomo de Voz & Escucha Continua 24/7 en Segundo Plano
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                daemonStatus?.master_switches?.master_voice_enabled 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}>
                {daemonStatus?.master_switches?.master_voice_enabled ? '● EN LÍNEA' : '○ PAUSADO'}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono">
              Percepción sensorial activa (Micrófonos, Antenas, Sensores M1) con reconocimiento de voz y afectos en 1.58 bits.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Master Voice Switch */}
            <button
              type="button"
              onClick={() => handleToggleMaster('master_voice_enabled', daemonStatus?.master_switches?.master_voice_enabled ?? true)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                daemonStatus?.master_switches?.master_voice_enabled
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 shadow-md'
                  : 'bg-black/50 border-white/10 text-slate-400'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>Voz General: {daemonStatus?.master_switches?.master_voice_enabled ? 'ACTIVA' : 'OFF'}</span>
            </button>

            {/* Master Learning Switch */}
            <button
              type="button"
              onClick={() => handleToggleMaster('master_affective_learning_enabled', daemonStatus?.master_switches?.master_affective_learning_enabled ?? true)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                daemonStatus?.master_switches?.master_affective_learning_enabled
                  ? 'bg-pink-500/20 border-pink-500 text-pink-200 shadow-md'
                  : 'bg-black/50 border-white/10 text-slate-400'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Aprendizaje Afectivo: {daemonStatus?.master_switches?.master_affective_learning_enabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Live Mic Listener Toggle */}
            <button
              type="button"
              onClick={handleToggleContinuousListening}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
                isContinuousListening
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white'
              }`}
            >
              {isContinuousListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{isContinuousListening ? 'Escuchando en Vivo...' : 'Iniciar Escucha Continua'}</span>
            </button>
          </div>
        </div>

        {/* Live Ambient Perception Mini-Feed */}
        {lastRecognizedText && (
          <div className="p-3 rounded-xl bg-black/60 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono animate-fadeIn">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-cyan-400 font-bold">Última Escucha:</span>
              <span className="text-white italic">"{lastRecognizedText}"</span>
            </div>
            {lastPerceptionResult?.responding_persona_name && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Respondió:</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                  {lastPerceptionResult.responding_persona_name} ({lastPerceptionResult.detected_user_emotion})
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: ESTUDIO DE VOZ & MATRIZ HOLOGRÁFICA (audio.cpp 1.58-BIT) */}
      {/* ========================================================================= */}
      {mainViewMode === 'estudio_voz' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Top Persona Selector Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-[#111624] to-[#0a0d17] border border-amber-500/30 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-amber-400" />
                <h3 className="font-display font-bold text-sm text-white">
                  Personalización Vocal Holográfica StarSeed OS
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  audio.cpp • Pure C++
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Backend Activo:</span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  Apple Silicon M1 Metal (ARM64 NEON)
                </span>
              </div>
            </div>

            {/* Persona Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {personalities.map((p) => {
                const isSelected = selectedVoicePersonaId === p.id;
                const pDaemonState = daemonStatus?.personality_states?.[p.id] || {};
                const isVoiceOn = pDaemonState.voice_autonomous_enabled !== false;

                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => {
                      setSelectedVoicePersonaId(p.id);
                      setTestPhrase(p.voice_profile?.phrase_sample || p.sample_phrase || testPhrase);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30 ring-1 ring-white'
                        : 'bg-black/50 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{p.name}</span>
                    <span className={`w-2 h-2 rounded-full ${isVoiceOn ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Studio Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column: Interactive Configuration Tabs */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4 shadow-xl">
              {/* Studio Tabs */}
              <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 overflow-x-auto custom-scrollbar">
                {[
                  { id: 'acoustics', label: '🎛️ Acústica & audio.cpp', desc: 'Modelos, tono y formantes' },
                  { id: 'organs', label: '🧬 Órgano & Sensor', desc: 'Afinidad de hardware' },
                  { id: 'emotions', label: '💖 Afectos & Emociones', desc: 'Estados dinámicos' },
                  { id: 'memories', label: '📜 Bóveda de Recuerdos', desc: 'Expresiones aprendidas' },
                  { id: 'media', label: '⚡ Medios de Estilización', desc: 'WebAudio, VST, OBS' }
                ].map((st) => (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() => setVoiceStudioTab(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      voiceStudioTab === st.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span>{st.label}</span>
                  </button>
                ))}
              </div>

              {/* Individual Persona Autonomous Switch Bar */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">Control Autónomo para {currentVoiceProfile.name}:</span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={daemonStatus?.personality_states?.[selectedVoicePersonaId]?.voice_autonomous_enabled !== false}
                      onChange={(e) => handleTogglePersona(selectedVoicePersonaId, 'voice', daemonStatus?.personality_states?.[selectedVoicePersonaId]?.voice_autonomous_enabled !== false)}
                      className="accent-amber-400 rounded"
                    />
                    <span className="text-slate-200">🎙️ Voz Autónoma Activa</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={daemonStatus?.personality_states?.[selectedVoicePersonaId]?.multiagent_enabled !== false}
                      onChange={(e) => handleTogglePersona(selectedVoicePersonaId, 'agent', daemonStatus?.personality_states?.[selectedVoicePersonaId]?.multiagent_enabled !== false)}
                      className="accent-purple-400 rounded"
                    />
                    <span className="text-slate-200">🤖 Multiagéntico</span>
                  </label>
                </div>
              </div>

              {/* TAB 1: ACÚSTICA & AUDIO.CPP */}
              {voiceStudioTab === 'acoustics' && (
                <div className="space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-300 block mb-1 font-bold">Modelo de Inferencia (audio.cpp 1.58b):</label>
                      <select
                        value={currentVoiceProfile.voice_engine || 'pocket_tts_158b'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVoiceMatrix({
                            ...voiceMatrix,
                            [selectedVoicePersonaId]: { ...currentVoiceProfile, voice_engine: val }
                          });
                        }}
                        className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white"
                      >
                        {voiceModels.map((m) => (
                          <option key={m.id} value={m.id}>{m.name} ({m.quantization})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-bold">Voz / Speaker Nativo:</label>
                      <select
                        value={currentVoiceProfile.voice_speaker || 'alba'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVoiceMatrix({
                            ...voiceMatrix,
                            [selectedVoicePersonaId]: { ...currentVoiceProfile, voice_speaker: val }
                          });
                        }}
                        className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white"
                      >
                        {['alba', 'david', 'mariano', 'sol', 'zenith', 'elena', 'heart', 'sky', 'river', 'oneiros_dream'].map((spk) => (
                          <option key={spk} value={spk}>{spk.toUpperCase()} (Ternario Optimizado)</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sliders Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                    {/* Pitch */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Tono Fundamental (Pitch):</span>
                        <span className="text-amber-400 font-bold">{currentVoiceProfile.pitch || 1.0}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.02"
                        value={currentVoiceProfile.pitch || 1.0}
                        onChange={(e) => setVoiceMatrix({
                          ...voiceMatrix,
                          [selectedVoicePersonaId]: { ...currentVoiceProfile, pitch: parseFloat(e.target.value) }
                        })}
                        className="w-full accent-amber-400"
                      />
                    </div>

                    {/* Rate */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Cadencia & Velocidad:</span>
                        <span className="text-cyan-400 font-bold">{currentVoiceProfile.rate || 1.0}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.02"
                        value={currentVoiceProfile.rate || 1.0}
                        onChange={(e) => setVoiceMatrix({
                          ...voiceMatrix,
                          [selectedVoicePersonaId]: { ...currentVoiceProfile, rate: parseFloat(e.target.value) }
                        })}
                        className="w-full accent-cyan-400"
                      />
                    </div>

                    {/* Formant Shift */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Desplazamiento de Formantes F1/F2:</span>
                        <span className="text-pink-400 font-bold">{currentVoiceProfile.formant_shift || 0.0}</span>
                      </div>
                      <input
                        type="range"
                        min="-0.5"
                        max="0.5"
                        step="0.02"
                        value={currentVoiceProfile.formant_shift || 0.0}
                        onChange={(e) => setVoiceMatrix({
                          ...voiceMatrix,
                          [selectedVoicePersonaId]: { ...currentVoiceProfile, formant_shift: parseFloat(e.target.value) }
                        })}
                        className="w-full accent-pink-400"
                      />
                    </div>

                    {/* Harmonic Warmth */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Calidez Armónica & Resonancia:</span>
                        <span className="text-emerald-400 font-bold">{currentVoiceProfile.harmonic_warmth || 85}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={currentVoiceProfile.harmonic_warmth || 85}
                        onChange={(e) => setVoiceMatrix({
                          ...voiceMatrix,
                          [selectedVoicePersonaId]: { ...currentVoiceProfile, harmonic_warmth: parseInt(e.target.value) }
                        })}
                        className="w-full accent-emerald-400"
                      />
                    </div>

                    {/* Breathiness */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Textura Respiratoria (Breathiness):</span>
                        <span className="text-purple-400 font-bold">{currentVoiceProfile.breathiness || 15}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={currentVoiceProfile.breathiness || 15}
                        onChange={(e) => setVoiceMatrix({
                          ...voiceMatrix,
                          [selectedVoicePersonaId]: { ...currentVoiceProfile, breathiness: parseInt(e.target.value) }
                        })}
                        className="w-full accent-purple-400"
                      />
                    </div>

                    {/* Cadence Pauses */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Micro-pausas Cognitivas Reflexivas:</span>
                        <span className="text-sky-400 font-bold">{currentVoiceProfile.cadence_pauses || 50}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={currentVoiceProfile.cadence_pauses || 50}
                        onChange={(e) => setVoiceMatrix({
                          ...voiceMatrix,
                          [selectedVoicePersonaId]: { ...currentVoiceProfile, cadence_pauses: parseInt(e.target.value) }
                        })}
                        className="w-full accent-sky-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ÓRGANO COGNITIVO & SENSOR (STARSEED OS) */}
              {voiceStudioTab === 'organs' && (
                <div className="space-y-4 text-xs font-mono">
                  <div className="p-4 rounded-xl bg-[#0b101c] border border-cyan-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-2">
                        <Brain className="w-4 h-4 text-cyan-400" />
                        {currentOrgan.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                        {currentOrgan.hardware_sensor}
                      </span>
                    </div>

                    <p className="text-slate-300 leading-relaxed font-sans text-xs">
                      💡 <b>Timbre Acústico Resonante:</b> {currentOrgan.acoustic_timbre}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-300 block font-bold">Vincular a Órgano Cognitivo del Sistema:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cognitiveOrgans.map((org) => (
                        <button
                          type="button"
                          key={org.organ_id}
                          onClick={() => setVoiceMatrix({
                            ...voiceMatrix,
                            [selectedVoicePersonaId]: { ...currentVoiceProfile, linked_organ_id: org.organ_id }
                          })}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            currentVoiceProfile.linked_organ_id === org.organ_id
                              ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-md'
                              : 'bg-black/50 border-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="font-bold text-[11px] text-cyan-300">{org.name}</div>
                          <div className="text-[9px] text-slate-400">{org.hardware_sensor}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AFECTOS & EMOCIONES DINÁMICAS */}
              {voiceStudioTab === 'emotions' && (
                <div className="space-y-4 text-xs font-mono">
                  <div className="space-y-2">
                    <span className="text-slate-300 font-bold block">Emoción Afectiva Activa:</span>
                    <div className="p-3 rounded-xl bg-pink-950/30 border border-pink-500/40 flex items-center justify-between">
                      <span className="text-pink-300 font-bold text-sm uppercase">
                        💖 {currentVoiceProfile.active_emotion || 'serenidad'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Modula automáticamente el brillo espectral y cadencia silábica.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-slate-300 font-bold block">Emociones Aprendidas en Interacciones:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(currentVoiceProfile.learned_emotions || ['serenidad', 'curiosidad', 'empatia']).map((em, idx) => (
                        <span
                          key={idx}
                          onClick={() => setVoiceMatrix({
                            ...voiceMatrix,
                            [selectedVoicePersonaId]: { ...currentVoiceProfile, active_emotion: em }
                          })}
                          className={`px-3 py-1 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                            currentVoiceProfile.active_emotion === em
                              ? 'bg-pink-500 text-white border-pink-400 shadow-md'
                              : 'bg-black/40 border-white/10 text-pink-300 hover:bg-pink-500/20'
                          }`}
                        >
                          {em}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Coherence Axioms */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-slate-400 font-bold block text-[11px]">Axiomas de Coherencia de Ser y Actuar:</span>
                    <ul className="space-y-1 pl-4 list-disc text-slate-300 text-[11px] font-sans">
                      {(currentVoiceProfile.coherence_axioms || [
                        "Preservar la soberanía y privacidad de Alex",
                        "Modular la voz armónicamente con respeto al contexto"
                      ]).map((ax, i) => (
                        <li key={i}>{ax}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 4: BÓVEDA DE RECUERDOS VOCALES */}
              {voiceStudioTab === 'memories' && (
                <div className="space-y-3 text-xs font-mono">
                  <span className="text-slate-300 font-bold block">Bóveda Sináptica de Expresiones & Recuerdos Vocales:</span>
                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {(currentVoiceProfile.recent_memories || [
                      { phrase: currentVoiceProfile.sample_phrase, emotion: currentVoiceProfile.active_emotion || "serena" }
                    ]).map((mem, mi) => (
                      <div key={mi} className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-purple-300 font-bold">
                          <span>Recuerdo #{mi + 1} • Emoción: {mem.emotion}</span>
                          <button
                            type="button"
                            onClick={() => handleAudioCppSynthesis(selectedVoicePersonaId, mem.phrase)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                            title="Reproducir frase aprendida"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-slate-200 text-xs font-sans italic">"{mem.phrase}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: MEDIOS DE ESTILIZACIÓN EXTERNA */}
              {voiceStudioTab === 'media' && (
                <div className="space-y-3 text-xs font-mono">
                  <span className="text-slate-300 font-bold block">Vinculación & Enrutamiento de Audio Estilizado:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'webaudio_dsp', name: 'WebAudio DSP Shaper', desc: 'Filtros peaking y convolver armónico' },
                      { id: 'coreaudio_native', name: 'CoreAudio / Metal Bus', desc: 'Salida de baja latencia nativa macOS' },
                      { id: 'pipewire_jack', name: 'PipeWire / JACK DSP', desc: 'Enrutamiento profesional Linux' },
                      { id: 'vst3_bridge', name: 'VST3 / LADSPA Bridge', desc: 'Plugins de audio y ecualizadores' },
                      { id: 'obs_daw_stream', name: 'OBS Studio / DAW Stream', desc: 'Canal virtual estéreo multidifusión' }
                    ].map((med) => (
                      <button
                        type="button"
                        key={med.id}
                        onClick={() => setVoiceMatrix({
                          ...voiceMatrix,
                          [selectedVoicePersonaId]: { ...currentVoiceProfile, stylization_medium: med.id }
                        })}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          currentVoiceProfile.stylization_medium === med.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md font-bold'
                            : 'bg-black/50 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-[11px] font-bold text-amber-300">{med.name}</div>
                        <div className="text-[9px] text-slate-500">{med.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Save Voice Profile Button */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveVoiceProfile}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Configuración Vocal de {currentVoiceProfile.name || selectedVoicePersonaId}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Live Audition & Autonomous Learning Console */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-[#101422] to-[#0a0d16] border border-amber-500/30 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Radio className="w-4 h-4 text-amber-400" />
                    Consola de Audición en Vivo
                  </h4>
                  {isPlayingAudio && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold animate-pulse">
                      ● EMITIENDO
                    </span>
                  )}
                </div>

                {/* Animated Waveform Visualizer */}
                <div className="h-16 rounded-xl bg-black/70 border border-white/10 flex items-center justify-center gap-1 p-2 overflow-hidden">
                  {Array.from({ length: 24 }).map((_, wIdx) => (
                    <div
                      key={wIdx}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        isPlayingAudio 
                          ? 'bg-gradient-to-t from-amber-500 via-orange-400 to-pink-500 animate-pulse' 
                          : 'bg-white/10'
                      }`}
                      style={{
                        height: isPlayingAudio ? `${Math.max(15, (Math.sin(wIdx * 0.8 + Date.now() * 0.005) * 0.5 + 0.5) * 55)}px` : '6px'
                      }}
                    />
                  ))}
                </div>

                {/* Phrase Input */}
                <div className="space-y-1 text-xs font-mono">
                  <label className="text-slate-300 font-bold block text-[11px]">Frase de Prueba & Locución:</label>
                  <textarea
                    rows={3}
                    value={testPhrase}
                    onChange={(e) => setTestPhrase(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-sans text-xs focus:ring-1 focus:ring-amber-400"
                    placeholder="Escribe el texto para probar la síntesis..."
                  />
                </div>

                {/* Quick Test Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAudioCppSynthesis(selectedVoicePersonaId)}
                    disabled={isSynthesizing}
                    className="p-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/40 cursor-pointer disabled:opacity-50"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>audio.cpp (1.58b)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestVoice(currentVoiceProfile, {})}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>OmniVoice DSP</span>
                  </button>
                </div>
              </div>

              {/* Autonomous Emotion Learning Block */}
              <div className="p-4 rounded-xl bg-black/60 border border-purple-500/30 space-y-3 mt-4">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-xs font-mono">
                  <Wand2 className="w-4 h-4 text-purple-400" />
                  <span>Aprender y Modular Emoción Libremente</span>
                </div>
                
                <p className="text-[11px] text-slate-400 font-sans">
                  Permite a la personalidad registrar esta frase con una nueva actitud y asimilarla permanentemente en su memoria vocal.
                </p>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedNewEmotion}
                    onChange={(e) => setSelectedNewEmotion(e.target.value)}
                    className="p-2 rounded-lg bg-black/80 border border-white/10 text-white text-xs font-mono flex-1"
                  >
                    {['asombro', 'gratitud', 'determinacion', 'ternura', 'calidez_pura', 'enfoque_zenith', 'libertad_creativa', 'poesia_cosmica'].map(em => (
                      <option key={em} value={em}>{em.toUpperCase()}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleLearnAndEvolve}
                    disabled={isLearningVoice}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isLearningVoice ? 'Asimilando...' : 'Asimilar'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: ARQUETIPOS & GOBERNANZA DE AGENTES (VISTA PRINCIPAL) */}
      {/* ========================================================================= */}
      {mainViewMode === 'arquetipos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personalities.map((p) => {
            const isActive = activePersonaId === p.id;
            const pDaemonState = daemonStatus?.personality_states?.[p.id] || {};
            const isVoiceOn = pDaemonState.voice_autonomous_enabled !== false;
            const isAgentOn = pDaemonState.multiagent_enabled !== false;

            return (
              <div
                key={p.id}
                onClick={() => handleSelect(p)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 group ${
                  isActive
                    ? `bg-gradient-to-br ${p.gradient || 'from-cyan-500/20 to-blue-500/20'} ${p.border || 'border-cyan-500/40'} shadow-xl shadow-cyan-950/40 ring-1 ring-white/20`
                    : 'bg-[#0b0e17] border-white/5 hover:border-white/20 hover:bg-white/[0.02]'
                }`}
              >
                {/* Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-md"
                      style={{ backgroundColor: `${p.color || '#00f0ff'}15`, borderColor: `${p.color || '#00f0ff'}40`, color: p.color || '#00f0ff' }}
                    >
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">{p.title}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAudioCppSynthesis(p.id, p.voice_profile?.phrase_sample);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                      title="Audición de voz nativa audio.cpp"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleOpenEditor(p, e)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Editar perfil completo"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {p.is_custom || p.isCustom ? (
                      <button
                        onClick={(e) => handleDeleteCustom(p.id, e)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar arquetipo personalizado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{p.description}</p>

                {/* Autonomous Voice & Agent Controls Row */}
                <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2 text-[10px] font-mono">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePersona(p.id, 'voice', isVoiceOn, e)}
                      className={`px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer transition-all ${
                        isVoiceOn 
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 font-bold' 
                          : 'bg-black/40 border-white/10 text-slate-500'
                      }`}
                      title="Encender/Apagar voz autónoma en segundo plano para esta personalidad"
                    >
                      <Mic className="w-3 h-3" />
                      <span>Voz: {isVoiceOn ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleTogglePersona(p.id, 'agent', isAgentOn, e)}
                      className={`px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer transition-all ${
                        isAgentOn 
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-200 font-bold' 
                          : 'bg-black/40 border-white/10 text-slate-500'
                      }`}
                      title="Encender/Apagar sistema multiagéntico para esta personalidad"
                    >
                      <Cpu className="w-3 h-3" />
                      <span>Agentes: {isAgentOn ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>

                  <span className="text-slate-400 truncate text-[9px]">
                    {pDaemonState.current_affect || 'serena'}
                  </span>
                </div>

                {/* Multidimensional Linkages: Agents, Processes, Cerebros */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-2 text-[10px] font-mono">
                  {/* Linked Agents */}
                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-cyan-400" />
                      Agentes Vinculados ({p.linked_agents?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(p.linked_agents || []).map((ag, agi) => (
                        <span
                          key={agi}
                          className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 flex items-center gap-1"
                          title={`${ag.role} // Medio: ${ag.media || 'ARM64 NEON'}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <b className="font-sans">{ag.name}</b>
                          <span className="text-[8px] text-slate-400 opacity-80 font-mono">({ag.media?.split(' ')[0] || 'Core'})</span>
                        </span>
                      ))}
                      {(!p.linked_agents || p.linked_agents.length === 0) && (
                        <span className="text-slate-500 italic">Sin agentes directos</span>
                      )}
                    </div>
                  </div>

                  {/* Linked Processes */}
                  <div className="space-y-1 pt-1 border-t border-white/5">
                    <span className="text-slate-400 font-bold flex items-center gap-1">
                      <Activity className="w-3 h-3 text-emerald-400" />
                      Procesos Vinculados ({p.linked_processes?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(p.linked_processes || []).map((proc, proci) => (
                        <span
                          key={proci}
                          className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{proc.name}</span>
                        </span>
                      ))}
                      {(!p.linked_processes || p.linked_processes.length === 0) && (
                        <span className="text-slate-500 italic">En reposo</span>
                      )}
                    </div>
                  </div>

                  {/* Linked Cerebros */}
                  <div className="space-y-1 pt-1 border-t border-white/5">
                    <span className="text-slate-400 font-bold flex items-center gap-1">
                      <Brain className="w-3 h-3 text-purple-400" />
                      Cerebros Vinculados ({p.linked_cerebros?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(p.linked_cerebros || []).map((cer, ceri) => (
                        <span
                          key={ceri}
                          className="px-2 py-0.5 rounded-md border font-bold"
                          style={{ backgroundColor: `${cer.color || '#a855f7'}15`, borderColor: `${cer.color || '#a855f7'}40`, color: cer.color || '#a855f7' }}
                        >
                          {cer.name}
                        </span>
                      ))}
                      {(!p.linked_cerebros || p.linked_cerebros.length === 0) && (
                        <span className="text-slate-500 italic">Global</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Emotional & Perms Badges */}
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                  <div className="p-1.5 bg-black/40 rounded-lg text-center border border-white/5">
                    <span className="text-slate-500 block">Empatía</span>
                    <span className="text-pink-300 font-bold">{p.traits?.empatia || 80}%</span>
                  </div>
                  <div className="p-1.5 bg-black/40 rounded-lg text-center border border-white/5">
                    <span className="text-slate-500 block">Precisión</span>
                    <span className="text-cyan-300 font-bold">{p.traits?.precision || 80}%</span>
                  </div>
                  <div className="p-1.5 bg-black/40 rounded-lg text-center border border-white/5">
                    <span className="text-slate-500 block">Creatividad</span>
                    <span className="text-purple-300 font-bold">{p.traits?.creatividad || 80}%</span>
                  </div>
                </div>

                {/* Tags & Controls */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <div className="flex flex-wrap gap-1">
                    {p.tags?.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                        {t}
                      </span>
                    ))}
                  </div>
                  {isActive ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Activa
                    </span>
                  ) : (
                    <span className="text-cyan-300 font-bold">Temp: {p.temperature}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL PERSONALITY CUSTOMIZATION MODAL */}
      {isEditingModal && editedPersona && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#0d1017] border border-white/15 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-md"
                  style={{ backgroundColor: `${editedPersona.color || '#00f0ff'}15`, borderColor: `${editedPersona.color || '#00f0ff'}40`, color: editedPersona.color || '#00f0ff' }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white">
                    Configuración Integral: {editedPersona.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Ajuste de matriz afectiva, directivas de sistema, voz audio.cpp y permisos nativos
                  </p>
                </div>
              </div>
              <button onClick={() => setIsEditingModal(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="px-4 py-2 border-b border-white/10 bg-black/20 flex items-center gap-2 overflow-x-auto text-xs">
              <button
                onClick={() => setEditorTab('profile')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  editorTab === 'profile' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Perfil & Directivas
              </button>
              <button
                onClick={() => setEditorTab('traits')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  editorTab === 'traits' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                Matriz Emocional (0-100)
              </button>
              <button
                onClick={() => setEditorTab('permissions')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  editorTab === 'permissions' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Permisos del Dispositivo
              </button>
              <button
                onClick={() => setEditorTab('voice')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  editorTab === 'voice' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                Voz audio.cpp & Tono
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {/* TAB 1: PERFIL & DIRECTIVAS */}
              {editorTab === 'profile' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-mono block mb-1">Nombre</label>
                      <input
                        type="text"
                        value={editedPersona.name || ''}
                        onChange={(e) => setEditedPersona({ ...editedPersona, name: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-mono block mb-1">Título / Especialidad</label>
                      <input
                        type="text"
                        value={editedPersona.title || ''}
                        onChange={(e) => setEditedPersona({ ...editedPersona, title: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-mono block mb-1">Descripción</label>
                    <input
                      type="text"
                      value={editedPersona.description || ''}
                      onChange={(e) => setEditedPersona({ ...editedPersona, description: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-mono block mb-1">Prompt de Esencia / Identidad</label>
                    <textarea
                      rows={2}
                      value={editedPersona.prompts?.esencia || editedPersona.systemPrompt || ''}
                      onChange={(e) => setEditedPersona({
                        ...editedPersona,
                        prompts: { ...editedPersona.prompts, esencia: e.target.value },
                        systemPrompt: e.target.value
                      })}
                      className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-mono block mb-1">Directiva de Estilo de Comunicación</label>
                    <textarea
                      rows={2}
                      value={editedPersona.prompts?.estilo || ''}
                      onChange={(e) => setEditedPersona({
                        ...editedPersona,
                        prompts: { ...editedPersona.prompts, estilo: e.target.value }
                      })}
                      className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono"
                      placeholder="ej: Comunícate con calidez, elocuencia y estructura dialógica..."
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <label className="text-[11px] text-slate-400 font-mono">Temperatura: {editedPersona.temperature}</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={editedPersona.temperature || 0.7}
                      onChange={(e) => setEditedPersona({ ...editedPersona, temperature: parseFloat(e.target.value) })}
                      className="w-48 accent-cyan-400"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: MATRIZ EMOCIONAL & SENTIMENTAL */}
              {editorTab === 'traits' && (
                <div className="space-y-4 text-xs">
                  <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-400" />
                    Afecto, Empatía & Dinámica Psicológica
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'empatia', label: 'Empatía & Compasión' },
                      { key: 'calidez', label: 'Calidez Humana' },
                      { key: 'serenidad', label: 'Serenidad & Calma' },
                      { key: 'alegria', label: 'Alegría & Optimismo' },
                      { key: 'ternura', label: 'Ternura & Sensibilidad' },
                      { key: 'humor', label: 'Humor & Chispa' },
                      { key: 'pasion', label: 'Pasión & Compromiso' },
                      { key: 'asertividad', label: 'Asertividad & Firmeza' },
                      { key: 'curiosidad', label: 'Curiosidad Intelectual' },
                      { key: 'creatividad', label: 'Creatividad & Pensamiento Lateral' },
                      { key: 'precision', label: 'Rigor Lógico & Precisión' },
                      { key: 'paciencia', label: 'Paciencia Dialógica' }
                    ].map((tr) => (
                      <div key={tr.key} className="space-y-1">
                        <div className="flex justify-between text-slate-300 font-mono">
                          <span>{tr.label}:</span>
                          <span className="text-pink-400 font-bold">{editedPersona.traits?.[tr.key] || 50}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={editedPersona.traits?.[tr.key] || 50}
                          onChange={(e) => setEditedPersona({
                            ...editedPersona,
                            traits: { ...editedPersona.traits, [tr.key]: parseInt(e.target.value) }
                          })}
                          className="w-full accent-pink-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: PERMISOS DEL DISPOSITIVO */}
              {editorTab === 'permissions' && (
                <div className="space-y-4 text-xs">
                  <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Permisos Nativos de Dispositivo (Apple Silicon M1)
                  </h4>

                  <div className="space-y-3">
                    {[
                      { key: 'allow_terminal_exec', label: 'Ejecución en Terminal Shell & Comandos', desc: 'Permite correr scripts y herramientas locales' },
                      { key: 'allow_fs_write', label: 'Escritura & Modificación de Archivos', desc: 'Permite crear y actualizar archivos en el workspace' },
                      { key: 'allow_fs_read_all', label: 'Lectura Completa del Sistema de Archivos', desc: 'Permite indexar documentos y carpetas' },
                      { key: 'allow_browser_crawl', label: 'Navegación Web Autónoma (Browser-Use)', desc: 'Permite navegar y extraer datos web' },
                      { key: 'allow_dream_spawning', label: 'Generación Onírica (Dream Studio)', desc: 'Permite crear shaders e imaginaciones visuales' },
                      { key: 'allow_memory_modification', label: 'Mutación & Poda del Grafo de Memoria', desc: 'Permite actualizar el exocórtex del usuario' },
                      { key: 'air_gap_mode', label: 'Modo Air-Gap / Aislamiento Soberano', desc: 'Bloquea cualquier comunicación externa no local' }
                    ].map((perm) => (
                      <label key={perm.key} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 cursor-pointer hover:border-white/15">
                        <div>
                          <div className="text-white font-bold text-[11px]">{perm.label}</div>
                          <div className="text-slate-400 text-[10px]">{perm.desc}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={editedPersona.permissions?.[perm.key] !== undefined ? editedPersona.permissions[perm.key] : (perm.key === 'air_gap_mode' ? false : true)}
                          onChange={(e) => setEditedPersona({
                            ...editedPersona,
                            permissions: { ...editedPersona.permissions, [perm.key]: e.target.checked }
                          })}
                          className="w-4 h-4 accent-cyan-400"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: VOZ AUDIO.CPP & TONO */}
              {editorTab === 'voice' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      Diseño Vocal audio.cpp (1.58-Bit) para {editedPersona.name}
                    </h4>

                    <button
                      type="button"
                      onClick={() => handleAudioCppSynthesis(editedPersona.id, editedPersona.voice_profile?.phrase_sample)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      Audición audio.cpp
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 font-mono block mb-1">Modelo de Voz C++</label>
                        <select
                          value={editedPersona.voice_profile?.voice_engine || 'pocket_tts_158b'}
                          onChange={(e) => setEditedPersona({
                            ...editedPersona,
                            voice_profile: { ...editedPersona.voice_profile, voice_engine: e.target.value }
                          })}
                          className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                        >
                          <option value="pocket_tts_158b">PocketTTS 1.58b GGUF</option>
                          <option value="kokoro_neural_cpp">Kokoro Neural C++</option>
                          <option value="seed_vc_158b">Seed-VC Ternary Conversion</option>
                          <option value="qwen3_asr_cpp">Qwen3 / Whisper C++</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-mono block mb-1">Speaker / Tonalidad</label>
                        <select
                          value={editedPersona.voice_profile?.voice_speaker || 'alba'}
                          onChange={(e) => setEditedPersona({
                            ...editedPersona,
                            voice_profile: { ...editedPersona.voice_profile, voice_speaker: e.target.value }
                          })}
                          className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                        >
                          {['alba', 'david', 'mariano', 'sol', 'zenith', 'elena', 'heart', 'sky', 'river', 'oneiros_dream'].map(spk => (
                            <option key={spk} value={spk}>{spk.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-mono block mb-1">Carácter / Actitud Vocal</label>
                      <input
                        type="text"
                        value={editedPersona.voice_profile?.caracter || ''}
                        onChange={(e) => setEditedPersona({
                          ...editedPersona,
                          voice_profile: { ...editedPersona.voice_profile, caracter: e.target.value }
                        })}
                        className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                        placeholder="ej: Cálida, profunda, pausada y atenta"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 font-mono block mb-1">
                          Tono (Pitch): {editedPersona.voice_profile?.pitch || 1.0}x
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.05"
                          value={editedPersona.voice_profile?.pitch || 1.0}
                          onChange={(e) => setEditedPersona({
                            ...editedPersona,
                            voice_profile: { ...editedPersona.voice_profile, pitch: parseFloat(e.target.value) }
                          })}
                          className="w-full accent-amber-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 font-mono block mb-1">
                          Velocidad (Rate): {editedPersona.voice_profile?.rate || 1.05}x
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.05"
                          value={editedPersona.voice_profile?.rate || 1.05}
                          onChange={(e) => setEditedPersona({
                            ...editedPersona,
                            voice_profile: { ...editedPersona.voice_profile, rate: parseFloat(e.target.value) }
                          })}
                          className="w-full accent-amber-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 font-mono block mb-1">
                          Formantes (F1/F2 Shift): {editedPersona.voice_profile?.formant_shift || 0.0}
                        </label>
                        <input
                          type="range"
                          min="-0.5"
                          max="0.5"
                          step="0.02"
                          value={editedPersona.voice_profile?.formant_shift || 0.0}
                          onChange={(e) => setEditedPersona({
                            ...editedPersona,
                            voice_profile: { ...editedPersona.voice_profile, formant_shift: parseFloat(e.target.value) }
                          })}
                          className="w-full accent-pink-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 font-mono block mb-1">
                          Calidez Armónica: {editedPersona.voice_profile?.harmonic_warmth || 85}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={editedPersona.voice_profile?.harmonic_warmth || 85}
                          onChange={(e) => setEditedPersona({
                            ...editedPersona,
                            voice_profile: { ...editedPersona.voice_profile, harmonic_warmth: parseInt(e.target.value) }
                          })}
                          className="w-full accent-emerald-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-mono block mb-1">Frase de Muestra para Audición</label>
                      <input
                        type="text"
                        value={editedPersona.voice_profile?.phrase_sample || ''}
                        onChange={(e) => setEditedPersona({
                          ...editedPersona,
                          voice_profile: { ...editedPersona.voice_profile, phrase_sample: e.target.value }
                        })}
                        className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsEditingModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditedPersona}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
