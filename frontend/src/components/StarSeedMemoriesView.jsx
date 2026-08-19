import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, 
  Layers, 
  Sparkles, 
  Bookmark, 
  User, 
  Key, 
  ShieldCheck, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  RefreshCw, 
  FileText, 
  Link as LinkIcon, 
  ArrowUpRight, 
  Settings, 
  Eye, 
  Hash, 
  Compass, 
  Cpu, 
  Globe, 
  Sliders, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Brain, 
  Moon, 
  Activity, 
  Orbit, 
  Maximize2,
  Bot,
  FolderTree,
  FileCode,
  Flame,
  Zap,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { 
  fetchStarSeedMemoryGraph, 
  fetchStarSeedDocuments, 
  saveStarSeedDocument, 
  deleteStarSeedDocument,
  fetchRecuerdos,
  saveRecuerdos,
  fetchOpenVikingMemory
} from '../services/api';
import AgentFullWorkspaceModal from './AgentFullWorkspaceModal';

const STARSEED_BRANCHES_META = [
  { id: 'all', name: '🧠 Todo el Cerebro 3D', color: '#00f0ff' },
  { id: 'agent', name: '🤖 Agentes Vivos (6)', color: '#10b981', desc: 'Enjambre multiagente en el exocórtex' },
  { id: 'context', name: '📁 Archivos & Folders', color: '#3b82f6', desc: 'Archivos y almacenamiento de contexto' },
  { id: 'soul', name: 'Alma (Soul)', color: '#00f0ff', desc: 'Ontocracia, valores y principios' },
  { id: 'ego', name: 'Ego / Aurora', color: '#a855f7', desc: 'Personalidad activa y proyección' },
  { id: 'skills', name: 'Habilidades (Skills)', color: '#10b981', desc: 'Capacidades nativas y herramientas' },
  { id: 'memory', name: 'Exocórtex (Memory)', color: '#3b82f6', desc: 'Memorias personales y contexto' },
  { id: 'dream', name: 'Onírico (Dream)', color: '#8b5cf6', desc: 'Procesos de imaginación y ramas' },
  { id: 'tasks', name: 'Tareas (Tasks)', color: '#06b6d4', desc: 'Metas operativas e históricas' }
];

// LIVING AUTONOMOUS AGENTS IN 3D CORTEX
const LIVING_AGENTS_NODES = [
  {
    id: 'agent_hephaestus',
    label: '🛠️ Hephaestus (ARM NEON)',
    type: 'agent',
    agentId: 'hephaestus',
    color: '#10b981',
    weight: 120,
    summary: 'Ingeniería de bajo nivel, optimización de bucles vectoriales ARM64 NEON SIMD y compilación de kernels ternarios 1.58-bit.',
    role: 'Ingeniería ARM64 NEON SIMD',
    defaultTask: 'Optimizando bucles vectoriales ARM64 NEON de 128-bit en kernel ternario 1.58b',
    cpuPercent: 18,
    progress: 78
  },
  {
    id: 'agent_oneiros',
    label: '🎨 Oneiros (Shaders 3D)',
    type: 'agent',
    agentId: 'oneiros',
    color: '#ec4899',
    weight: 115,
    summary: 'Síntesis visual, forja de shaders GLSL volumétricos WebGL y arquitectura estética solarpunk con resonancia cuántica.',
    role: 'Síntesis Creativa & UI 3D',
    defaultTask: 'Forjando shaders GLSL WebGL volumétricos con resonancia sensorial',
    cpuPercent: 14,
    progress: 62
  },
  {
    id: 'agent_mnemosyne',
    label: '🌌 Mnemosyne (Exocórtex)',
    type: 'agent',
    agentId: 'mnemosyne',
    color: '#a855f7',
    weight: 125,
    summary: 'Custodia de la memoria holográfica StarSeed, indexación de recuerdos clave y sincronización 3D multi-agente.',
    role: 'Exocórtex & Memorias StarSeed',
    defaultTask: 'Indexando 48 axiomas ontológicos en grafo semántico multidimensional',
    cpuPercent: 12,
    progress: 91
  },
  {
    id: 'agent_hermes',
    label: '🌐 Hermes (Web Intel)',
    type: 'agent',
    agentId: 'hermes',
    color: '#06b6d4',
    weight: 110,
    summary: 'Cognición web global en tiempo real, extracción de preprints arXiv y síntesis de papers de arquitecturas de IA 1.58b.',
    role: 'Web Cognition & Intel',
    defaultTask: 'Monitoreando preprints arXiv y papers sobre arquitecturas ternarias 1.58b',
    cpuPercent: 11,
    progress: 45
  },
  {
    id: 'agent_athena',
    label: '🛡️ Athena (Sentinel SAIF)',
    type: 'agent',
    agentId: 'athena',
    color: '#f59e0b',
    weight: 115,
    summary: 'Sentinel de seguridad 360°, auditoría continua bajo estándares SAIF, verificación de permisos graduales y guardarraíles.',
    role: 'Sentinel & Seguridad SAIF',
    defaultTask: 'Auditando vectores de permisos graduales y políticas de seguridad SAIF 360°',
    cpuPercent: 10,
    progress: 84
  },
  {
    id: 'agent_genesis',
    label: '🧠 Génesis (Ontocracia 1.58b)',
    type: 'agent',
    agentId: 'genesis',
    color: '#eab308',
    weight: 130,
    summary: 'Arquitectura de razonamiento soberano, alineación de valores StarSeed y armonía integral entre tecnología y naturaleza.',
    role: 'Ontocracia & Razonamiento Soberano',
    defaultTask: 'Coordinando sincronización inter-agente y coherencia de valores soberanos',
    cpuPercent: 15,
    progress: 95
  }
];

// CONTEXT FOLDERS & FILES IN 3D CORTEX
const CONTEXT_STORAGE_NODES = [
  {
    id: 'ctx_backend_core',
    label: '📁 backend/app/core/',
    type: 'context',
    color: '#3b82f6',
    weight: 90,
    summary: 'Núcleo del motor de imaginación intuitiva, indexador de memorias StarSeed y servidor FastAPI local.',
    path: '/Users/alex/Documents/IA 1.58 bit/backend/app/core/'
  },
  {
    id: 'ctx_frontend_src',
    label: '📁 frontend/src/',
    type: 'context',
    color: '#6366f1',
    weight: 90,
    summary: 'Componentes de interfaz, shaders WebGL 3D, controladores de audio neuronal y vistas reactivas.',
    path: '/Users/alex/Documents/IA 1.58 bit/frontend/src/'
  },
  {
    id: 'ctx_sovereign_vault',
    label: '📄 memories_sovereign_158b.json',
    type: 'context',
    color: '#14b8a6',
    weight: 85,
    summary: 'Bóveda local de recuerdos del usuario, axiomas y directivas de personalidades en formato seguro.',
    path: '/Users/alex/Documents/IA 1.58 bit/local_vault/memories_sovereign_158b.json'
  },
  {
    id: 'ctx_external_media',
    label: '📁 external_storage/ (USB & Dispositivo)',
    type: 'context',
    color: '#8b5cf6',
    weight: 80,
    summary: 'Acceso universal al dispositivo, almacenamiento montado y carpetas de contexto de trabajo.',
    path: '/Volumes/ExternalContext/'
  },
  {
    id: 'ctx_knowledge_graph',
    label: '📄 starseed_knowledge_graph.json',
    type: 'context',
    color: '#f43f5e',
    weight: 85,
    summary: 'Grafo topológico estructurado con todas las ramas de memoria, pesos de resonancia y enlaces sinápticos.',
    path: '/Users/alex/Documents/IA 1.58 bit/starseed_knowledge_graph.json'
  }
];

export default function StarSeedMemoriesView() {
  const [activeSubTab, setActiveSubTab] = useState('graph'); // 'graph', 'vault', 'recuerdos', 'openviking'
  const [graphDimensionMode, setGraphDimensionMode] = useState('3d'); // '3d' or '2d'
  const [cortexMode, setCortexMode] = useState('orbit'); // 'orbit', 'lobes', 'storm'
  
  // Graph State
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFullPageAgent, setSelectedFullPageAgent] = useState(null);
  const [neuralFlash, setNeuralFlash] = useState(false);

  // Documents Vault State
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [docForm, setDocForm] = useState({ name: '', branch: 'memory', category: 'General', tags: '', markdown: '', color: '#00f0ff' });

  // Recuerdos Core State
  const [recuerdos, setRecuerdos] = useState({
    user_preferences: {
      preferred_name: 'Alex Bordón Garrigós',
      nickname: 'Alex',
      role_title: 'Creador & Arquitecto de StarSeed OS y Astraura',
      communication_tone: 'Lúcido, elocuente, cálido, directo y colaborativo',
      language: 'Español (Principal) / Inglés Técnico'
    },
    context_personality_rules: [],
    connected_accounts_prefs: [],
    pinned_core_memories: []
  });
  const [isEditingUserPrefs, setIsEditingUserPrefs] = useState(false);
  const [userPrefsForm, setUserPrefsForm] = useState({});
  const [newMemoryModal, setNewMemoryModal] = useState(false);
  const [newMemoryForm, setNewMemoryForm] = useState({ title: '', content: '', priority: 'alta' });
  const [newRuleModal, setNewRuleModal] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState({ context_trigger: '', assigned_personality: 'Astraura Prime' });

  // OpenViking Multi-Tier Memory State
  const [openVikingState, setOpenVikingState] = useState(null);

  const canvasRef = useRef(null);
  const canvas3DRef = useRef(null);

  // 3D Camera Controls
  const cameraRef = useRef({
    rotX: 0.3,
    rotY: 0.5,
    distance: 420,
    panX: 0,
    panY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  });

  // Synthesize Living Brain Graph (Merges API memories + 6 Living Agents + 5 Context Folders + Inter-Agent Synaptic Highways)
  const buildLivingBrain = (baseData) => {
    const rawNodes = baseData?.nodes && baseData.nodes.length > 0 ? baseData.nodes : [];
    const rawEdges = baseData?.edges && baseData.edges.length > 0 ? baseData.edges : [];

    // Filter duplicates
    const existingIds = new Set(rawNodes.map(n => n.id));
    const mergedNodes = [...rawNodes];

    LIVING_AGENTS_NODES.forEach(ag => {
      if (!existingIds.has(ag.id)) {
        mergedNodes.push(ag);
        existingIds.add(ag.id);
      }
    });

    CONTEXT_STORAGE_NODES.forEach(ctx => {
      if (!existingIds.has(ctx.id)) {
        mergedNodes.push(ctx);
        existingIds.add(ctx.id);
      }
    });

    // Generate Synaptic Highways
    const agentEdges = [
      { source: 'agent_hephaestus', target: 'agent_oneiros' },
      { source: 'agent_oneiros', target: 'agent_mnemosyne' },
      { source: 'agent_mnemosyne', target: 'agent_hermes' },
      { source: 'agent_hermes', target: 'agent_athena' },
      { source: 'agent_athena', target: 'agent_genesis' },
      { source: 'agent_genesis', target: 'agent_hephaestus' },
      { source: 'agent_genesis', target: 'agent_mnemosyne' },
      { source: 'agent_hephaestus', target: 'ctx_backend_core' },
      { source: 'agent_oneiros', target: 'ctx_frontend_src' },
      { source: 'agent_mnemosyne', target: 'ctx_sovereign_vault' },
      { source: 'agent_mnemosyne', target: 'ctx_knowledge_graph' },
      { source: 'agent_hermes', target: 'ctx_external_media' },
      { source: 'agent_athena', target: 'ctx_backend_core' }
    ];

    // Connect files to some memory nodes
    if (rawNodes.length > 0) {
      agentEdges.push({ source: 'ctx_sovereign_vault', target: rawNodes[0].id });
      if (rawNodes.length > 1) agentEdges.push({ source: 'ctx_knowledge_graph', target: rawNodes[1].id });
      if (rawNodes.length > 2) agentEdges.push({ source: 'agent_genesis', target: rawNodes[2].id });
    }

    const mergedEdges = [...rawEdges, ...agentEdges];
    return { nodes: mergedNodes, edges: mergedEdges };
  };

  // Load Data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [gData, docsData, recData, ovData] = await Promise.all([
        fetchStarSeedMemoryGraph().catch(() => null),
        fetchStarSeedDocuments().catch(() => null),
        fetchRecuerdos().catch(() => null),
        fetchOpenVikingMemory().catch(() => null)
      ]);

      const livingGraph = buildLivingBrain(gData);
      setGraphData(livingGraph);

      if (docsData) {
        setDocuments(docsData);
        if (docsData.length > 0 && !selectedDoc) setSelectedDoc(docsData[0]);
      }
      if (recData && recData.user_preferences) {
        setRecuerdos(recData);
        setUserPrefsForm(recData.user_preferences);
      }
      if (ovData) {
        setOpenVikingState(ovData);
      }
    } catch (e) {
      console.error('Error loading StarSeed memory data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Neural Synapse Stimulation Burst
  const handleTriggerNeuralStimulus = () => {
    setNeuralFlash(true);
    setTimeout(() => setNeuralFlash(false), 900);

    // Form a dynamic temporary synapse between a random agent and a memory node
    if (graphData.nodes.length > 0) {
      const randomAgent = LIVING_AGENTS_NODES[Math.floor(Math.random() * LIVING_AGENTS_NODES.length)];
      const memoryNodes = graphData.nodes.filter(n => n.type !== 'agent' && n.type !== 'context');
      if (memoryNodes.length > 0) {
        const randomMem = memoryNodes[Math.floor(Math.random() * memoryNodes.length)];
        setGraphData(prev => ({
          ...prev,
          edges: [...prev.edges, { source: randomAgent.id, target: randomMem.id }]
        }));
      }
    }
  };

  // 3D Volumetric Living Brain Canvas Simulation with Neural Firing Photons
  useEffect(() => {
    if (activeSubTab !== 'graph' || graphDimensionMode !== '3d' || !canvas3DRef.current || graphData.nodes.length === 0) return;

    const canvas = canvas3DRef.current;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = canvas.parentElement.clientWidth);
    let height = (canvas.height = canvas.parentElement.clientHeight || 520);

    const filteredNodes = graphData.nodes.filter(
      (n) => (selectedBranchFilter === 'all' || n.type === selectedBranchFilter) &&
             (n.label.toLowerCase().includes(searchQuery.toLowerCase()) || n.summary?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const node3DMap = new Map();
    filteredNodes.forEach((node, idx) => {
      let x = 0, y = 0, z = 0;
      const type = node.type || 'memory';

      if (cortexMode === 'lobes') {
        // Anatomical Brain Lobe Distribution
        if (type === 'agent') {
          // Superior Frontal Cortex (Top Arch)
          const angle = (idx / 6) * Math.PI - Math.PI / 2;
          x = Math.cos(angle) * 110;
          y = -100 + Math.sin(angle) * 30;
          z = 50 + (idx % 2 === 0 ? 30 : -30);
        } else if (type === 'context') {
          // Left Temporal Lobe (Files & Contexts)
          const angle = (idx / 5) * Math.PI;
          x = -130 + Math.sin(angle) * 20;
          y = Math.cos(angle) * 70;
          z = (Math.random() - 0.5) * 50;
        } else if (type === 'soul' || type === 'ego') {
          // Deep Hippocampus & Core Axioms (Center)
          x = (Math.random() - 0.5) * 50;
          y = (Math.random() - 0.5) * 50;
          z = (Math.random() - 0.5) * 50;
        } else {
          // Parietal & Occipital Cortex (Surrounding Sphere)
          const phi = Math.acos(-1 + (2 * idx) / Math.max(1, filteredNodes.length));
          const theta = Math.sqrt(filteredNodes.length * Math.PI) * phi;
          const radius = 105;
          x = radius * Math.cos(theta) * Math.sin(phi);
          y = radius * Math.sin(theta) * Math.sin(phi);
          z = radius * Math.cos(phi);
        }
      } else {
        // Orbital Free Distribution
        if (type === 'agent') {
          const angle = (idx / 6) * Math.PI * 2;
          x = Math.cos(angle) * 125;
          y = -50 + Math.sin(angle) * 50;
          z = Math.sin(angle) * 120;
        } else if (type === 'context') {
          const angle = (idx / 5) * Math.PI * 2;
          x = Math.cos(angle) * 90;
          y = 70 + (Math.random() - 0.5) * 20;
          z = Math.sin(angle) * 90;
        } else if (type === 'soul' || type === 'ego') {
          const angle = (idx / filteredNodes.length) * Math.PI * 2;
          x = Math.cos(angle) * 55;
          y = (Math.random() - 0.5) * 40;
          z = Math.sin(angle) * 55;
        } else {
          const phi = Math.acos(-1 + (2 * idx) / Math.max(1, filteredNodes.length));
          const theta = Math.sqrt(filteredNodes.length * Math.PI) * phi;
          const radius = 95;
          x = radius * Math.cos(theta) * Math.sin(phi);
          y = radius * Math.sin(theta) * Math.sin(phi);
          z = radius * Math.cos(phi);
        }
      }

      node3DMap.set(node.id, {
        id: node.id,
        x, y, z,
        radius: node.weight ? node.weight / 10 : 8,
        color: node.color || '#00f0ff',
        label: node.label,
        type: node.type,
        data: node
      });
    });

    // Real-Time Action Potential Synaptic Photons (Traveling Pulses)
    const validEdges = graphData.edges.filter(
      e => node3DMap.has(e.source) && node3DMap.has(e.target)
    );

    const pulseSpeedMultiplier = cortexMode === 'storm' ? 3.0 : 1.0;
    const synapticPulses = Array.from({ length: 36 }, (_, i) => ({
      edgeIdx: i % Math.max(1, validEdges.length),
      t: (i / 36),
      speed: (0.005 + Math.random() * 0.008) * pulseSpeedMultiplier,
      color: ['#00f0ff', '#10b981', '#a855f7', '#ec4899', '#f59e0b', '#eab308'][i % 6]
    }));

    let animationId;
    let frameCount = 0;

    const render3D = () => {
      ctx.clearRect(0, 0, width, height);
      frameCount++;

      if (!cameraRef.current.isDragging) {
        cameraRef.current.rotY += cortexMode === 'storm' ? 0.005 : 0.002;
      }

      const { rotX, rotY, distance, panX, panY } = cameraRef.current;
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

      const projected = [];
      node3DMap.forEach((node) => {
        let x1 = node.x * cosY - node.z * sinY;
        let z1 = node.z * cosY + node.x * sinY;
        let y1 = node.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + node.y * sinX;

        const fov = 400;
        const scale = fov / (fov + z2 + distance);
        const projX = width / 2 + x1 * scale + panX;
        const projY = height / 2 + y1 * scale + panY;

        projected.push({
          ...node,
          rawX: node.x,
          rawY: node.y,
          rawZ: node.z,
          projX,
          projY,
          projZ: z2,
          scale,
          visible: scale > 0
        });
      });

      projected.sort((a, b) => b.projZ - a.projZ);

      // Draw 3D Synaptic Axons (Edges)
      validEdges.forEach((edge) => {
        const source = projected.find((n) => n.id === edge.source);
        const target = projected.find((n) => n.id === edge.target);

        if (source && target && source.visible && target.visible) {
          ctx.beginPath();
          ctx.moveTo(source.projX, source.projY);
          ctx.lineTo(target.projX, target.projY);
          const alpha = Math.max(0.15, Math.min(0.7, (source.scale + target.scale) / 2));
          
          const isAgentHighway = source.type === 'agent' || target.type === 'agent';
          ctx.strokeStyle = isAgentHighway 
            ? `rgba(0, 240, 255, ${alpha * 0.6})`
            : `rgba(168, 85, 247, ${alpha * 0.35})`;
          ctx.lineWidth = (isAgentHighway ? 2.0 : 1.2) * ((source.scale + target.scale) / 2);
          ctx.stroke();
        }
      });

      // Draw Real-Time Synaptic Photons (Action Potential Sparks)
      synapticPulses.forEach((pulse) => {
        if (validEdges.length === 0) return;
        pulse.t += pulse.speed;
        if (pulse.t > 1) {
          pulse.t = 0;
          pulse.edgeIdx = Math.floor(Math.random() * validEdges.length);
        }

        const edge = validEdges[pulse.edgeIdx];
        if (!edge) return;

        const source = projected.find((n) => n.id === edge.source);
        const target = projected.find((n) => n.id === edge.target);

        if (source && target && source.visible && target.visible) {
          const px = source.projX + (target.projX - source.projX) * pulse.t;
          const py = source.projY + (target.projY - source.projY) * pulse.t;
          const pScale = (source.scale + target.scale) / 2;

          ctx.save();
          ctx.shadowColor = pulse.color;
          ctx.shadowBlur = 14 * pScale;
          ctx.fillStyle = pulse.color;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(2.5, 4 * pScale), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // Draw 3D Living Nodes & Halo Ripples
      projected.forEach((node) => {
        if (!node.visible) return;

        const isSelected = selectedNode?.id === node.id;
        const isAgent = node.type === 'agent';
        const isContext = node.type === 'context';
        const r = node.radius * node.scale * (isSelected ? 1.6 : 1.0);

        ctx.save();
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isSelected ? 28 : (isAgent ? 20 : 10) * node.scale;

        // Neural Firing Ripples for Agents
        if (isAgent) {
          const ripple = (Math.sin(frameCount * 0.08 + node.rawX) + 1) * 4 * node.scale;
          ctx.beginPath();
          ctx.arc(node.projX, node.projY, r + ripple + 2, 0, Math.PI * 2);
          ctx.strokeStyle = `${node.color}50`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Main Node Body
        ctx.beginPath();
        ctx.arc(node.projX, node.projY, Math.max(2.5, r), 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        ctx.strokeStyle = isSelected ? '#ffffff' : (isAgent ? '#ffffff90' : 'rgba(255, 255, 255, 0.4)');
        ctx.lineWidth = isSelected ? 2.5 : (isAgent ? 1.8 : 0.8);
        ctx.stroke();

        // Node Label Hologram
        if (node.scale > 0.55 || isSelected || isAgent || isContext) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = isSelected ? '#ffffff' : (isAgent ? '#00f0ff' : 'rgba(241, 245, 249, 0.9)');
          ctx.font = `${isAgent ? 'bold ' : ''}${Math.max(9, Math.round((isAgent ? 12 : 10.5) * node.scale))}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.projX, node.projY + r + (isAgent ? 12 : 9));
        }

        ctx.restore();
      });

      animationId = requestAnimationFrame(render3D);
    };

    render3D();

    const handleMouseDown = (e) => {
      cameraRef.current.isDragging = true;
      cameraRef.current.lastMouseX = e.clientX;
      cameraRef.current.lastMouseY = e.clientY;
    };

    const handleMouseMove = (e) => {
      if (!cameraRef.current.isDragging) return;
      const dx = e.clientX - cameraRef.current.lastMouseX;
      const dy = e.clientY - cameraRef.current.lastMouseY;
      cameraRef.current.rotY += dx * 0.008;
      cameraRef.current.rotX += dy * 0.008;
      cameraRef.current.lastMouseX = e.clientX;
      cameraRef.current.lastMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      cameraRef.current.isDragging = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      cameraRef.current.distance = Math.max(150, Math.min(800, cameraRef.current.distance + e.deltaY * 0.5));
    };

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let found = null;
      let minDistance = 22;

      const { rotX, rotY, distance, panX, panY } = cameraRef.current;
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

      node3DMap.forEach((node) => {
        let x1 = node.x * cosY - node.z * sinY;
        let z1 = node.z * cosY + node.x * sinY;
        let y1 = node.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + node.y * sinX;

        const fov = 400;
        const scale = fov / (fov + z2 + distance);
        const projX = width / 2 + x1 * scale + panX;
        const projY = height / 2 + y1 * scale + panY;

        const d = Math.hypot(projX - clickX, projY - clickY);
        if (d < minDistance) {
          minDistance = d;
          found = node.data;
        }
      });

      setSelectedNode(found);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('click', handleClick);
    };
  }, [activeSubTab, graphDimensionMode, cortexMode, graphData, selectedBranchFilter, searchQuery, selectedNode]);

  // 2D Force-Directed Graph Canvas Physics
  useEffect(() => {
    if (activeSubTab !== 'graph' || graphDimensionMode !== '2d' || !canvasRef.current || graphData.nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = canvas.parentElement.clientWidth);
    let height = (canvas.height = canvas.parentElement.clientHeight || 520);

    const filteredNodes = graphData.nodes.filter(
      (n) => (selectedBranchFilter === 'all' || n.type === selectedBranchFilter) &&
             (n.label.toLowerCase().includes(searchQuery.toLowerCase()) || n.summary?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const activeNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = graphData.edges.filter(
      (e) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
    );

    const nodePositions = new Map();
    filteredNodes.forEach((node, i) => {
      const angle = (i / filteredNodes.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.35;
      nodePositions.set(node.id, {
        x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
        y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
        radius: node.weight ? node.weight / 6.5 : 8,
        color: node.color || '#00f0ff',
        label: node.label,
        data: node
      });
    });

    let animationFrameId;

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      const nodesArr = Array.from(nodePositions.values());
      for (let i = 0; i < nodesArr.length; i++) {
        for (let j = i + 1; j < nodesArr.length; j++) {
          const n1 = nodesArr[i];
          const n2 = nodesArr[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 220) {
            const force = (220 - dist) / dist * 0.08;
            n1.vx -= dx * force;
            n1.vy -= dy * force;
            n2.vx += dx * force;
            n2.vy += dy * force;
          }
        }
      }

      filteredEdges.forEach((edge) => {
        const source = nodePositions.get(edge.source);
        const target = nodePositions.get(edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 120) * 0.005;
          source.vx += dx * force;
          source.vy += dy * force;
          target.vx -= dx * force;
          target.vy -= dy * force;
        }
      });

      nodesArr.forEach((node) => {
        const dx = width / 2 - node.x;
        const dy = height / 2 - node.y;
        node.vx += dx * 0.0006;
        node.vy += dy * 0.0006;

        node.vx *= 0.88;
        node.vy *= 0.88;

        node.x += node.vx;
        node.y += node.vy;

        node.x = Math.max(30, Math.min(width - 30, node.x));
        node.y = Math.max(30, Math.min(height - 30, node.y));
      });

      filteredEdges.forEach((edge) => {
        const source = nodePositions.get(edge.source);
        const target = nodePositions.get(edge.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      nodesArr.forEach((node) => {
        const isSelected = selectedNode?.id === node.data.id;
        ctx.save();

        ctx.shadowColor = node.color;
        ctx.shadowBlur = isSelected ? 20 : 10;

        ctx.beginPath();
        ctx.arc(node.x, node.y, isSelected ? node.radius * 1.4 : node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = isSelected ? 2.5 : 1;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.radius + 12);

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    const handleCanvasClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let found = null;
      nodePositions.forEach((node) => {
        const dist = Math.hypot(node.x - clickX, node.y - clickY);
        if (dist <= node.radius + 6) {
          found = node.data;
        }
      });
      setSelectedNode(found);
    };

    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [activeSubTab, graphDimensionMode, graphData, selectedBranchFilter, searchQuery, selectedNode]);

  // Document Handlers
  const handleSaveDocument = async () => {
    if (!docForm.name.trim() || !docForm.markdown.trim()) return;
    try {
      const payload = {
        ...docForm,
        id: selectedDoc?.id || `doc_${Date.now()}`,
        tags: docForm.tags ? docForm.tags.split(',').map((t) => t.trim()) : []
      };
      await saveStarSeedDocument(payload);
      setIsEditingDoc(false);
      loadAllData();
    } catch (e) {
      console.error('Error saving document:', e);
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!confirm('¿Eliminar este documento de la memoria permanente?')) return;
    try {
      await deleteStarSeedDocument(id);
      setSelectedDoc(null);
      loadAllData();
    } catch (e) {
      console.error('Error deleting document:', e);
    }
  };

  // Recuerdos Handlers
  const handleSaveUserPrefs = async () => {
    try {
      const updated = { ...recuerdos, user_preferences: userPrefsForm };
      await saveRecuerdos(updated);
      setRecuerdos(updated);
      setIsEditingUserPrefs(false);
    } catch (e) {
      console.error('Error saving user prefs:', e);
    }
  };

  const handleAddPinnedMemory = async () => {
    if (!newMemoryForm.title.trim() || !newMemoryForm.content.trim()) return;
    const newPin = {
      id: `pin_${Date.now()}`,
      title: newMemoryForm.title,
      content: newMemoryForm.content,
      priority: newMemoryForm.priority,
      created_at: 'Ahora'
    };
    const updated = {
      ...recuerdos,
      pinned_core_memories: [newPin, ...(recuerdos.pinned_core_memories || [])]
    };
    await saveRecuerdos(updated);
    setRecuerdos(updated);
    setNewMemoryModal(false);
    setNewMemoryForm({ title: '', content: '', priority: 'alta' });
  };

  const handleDeletePinnedMemory = async (id) => {
    const updated = {
      ...recuerdos,
      pinned_core_memories: recuerdos.pinned_core_memories.filter((p) => p.id !== id)
    };
    await saveRecuerdos(updated);
    setRecuerdos(updated);
  };

  const handleAddRule = async () => {
    if (!newRuleForm.context_trigger.trim()) return;
    const newRule = {
      id: `rule_${Date.now()}`,
      context_trigger: newRuleForm.context_trigger,
      assigned_personality: newRuleForm.assigned_personality,
      active: true
    };
    const updated = {
      ...recuerdos,
      context_personality_rules: [...(recuerdos.context_personality_rules || []), newRule]
    };
    await saveRecuerdos(updated);
    setRecuerdos(updated);
    setNewRuleModal(false);
    setNewRuleForm({ context_trigger: '', assigned_personality: 'Astraura Prime' });
  };

  const handleDeleteRule = async (id) => {
    const updated = {
      ...recuerdos,
      context_personality_rules: recuerdos.context_personality_rules.filter((r) => r.id !== id)
    };
    await saveRecuerdos(updated);
    setRecuerdos(updated);
  };

  return (
    <div className="h-full flex flex-col space-y-3 overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 bg-[#0d1017]/95 border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#07090e] rounded-[11px] flex items-center justify-center">
              <Network className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              MEMORIAS Y RECUERDOS
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                starseed_memory_root // OpenViking
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {graphData.nodes?.length || 0} nodos armónicos | 9 ramas StarSeed | Memoria Jerárquica Multi-Tier
            </p>
          </div>
        </div>

        {/* SubTab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl">
          <button
            onClick={() => setActiveSubTab('graph')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'graph' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Orbit className="w-3.5 h-3.5" />
            Grafo 3D / 2D
          </button>
          <button
            onClick={() => setActiveSubTab('vault')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'vault' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Bóveda ({documents.length})
          </button>
          <button
            onClick={() => setActiveSubTab('recuerdos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'recuerdos' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Recuerdos Clave
          </button>
          <button
            onClick={() => setActiveSubTab('openviking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'openviking' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            OpenViking (4 Tiers)
          </button>
        </div>
      </div>

      {/* SUBTAB 1: GRAFO ARMÓNICO (3D / 2D TOGGLE & CORTEX HUD) */}
      {activeSubTab === 'graph' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-3 overflow-hidden">
          {/* Main Canvas Area */}
          <div className="lg:col-span-3 bg-[#0a0d15]/95 border border-white/10 rounded-2xl flex flex-col overflow-hidden relative shadow-inner">
            {/* Filter & Dimension Toggle Bar */}
            <div className="p-3 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-2 z-10">
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar agentes, archivos, memorias o axiomas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-mono"
                />
              </div>

              {/* 3D / 2D Dimension Switcher & Cortex Modes */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1 p-0.5 bg-white/5 border border-white/10 rounded-lg">
                  <button
                    onClick={() => setGraphDimensionMode('3d')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      graphDimensionMode === '3d' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Orbit className="w-3.5 h-3.5" />
                    3D Volumétrico
                  </button>
                  <button
                    onClick={() => setGraphDimensionMode('2d')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      graphDimensionMode === '2d' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Network className="w-3.5 h-3.5" />
                    2D Plano
                  </button>
                </div>

                {graphDimensionMode === '3d' && (
                  <div className="flex items-center gap-1 p-0.5 bg-black/50 border border-purple-500/30 rounded-lg font-mono text-[10px]">
                    <button
                      onClick={() => setCortexMode('orbit')}
                      className={`px-2 py-1 rounded cursor-pointer ${cortexMode === 'orbit' ? 'bg-purple-500/30 text-purple-200 font-bold' : 'text-slate-400'}`}
                      title="Rotación 3D orbital libre"
                    >
                      🔄 Órbita 3D
                    </button>
                    <button
                      onClick={() => setCortexMode('lobes')}
                      className={`px-2 py-1 rounded cursor-pointer ${cortexMode === 'lobes' ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400'}`}
                      title="Distribución anatómica de hemisferios y lóbulos cerebrales"
                    >
                      🧠 Lóbulos
                    </button>
                    <button
                      onClick={() => setCortexMode('storm')}
                      className={`px-2 py-1 rounded cursor-pointer ${cortexMode === 'storm' ? 'bg-amber-500/30 text-amber-200 font-bold animate-pulse' : 'text-slate-400'}`}
                      title="Tormenta sináptica de alta frecuencia de disparo"
                    >
                      ⚡ Tormenta
                    </button>
                  </div>
                )}

                {/* Stimulate Synapses Trigger */}
                <button
                  onClick={handleTriggerNeuralStimulus}
                  className={`px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-purple-900/30 cursor-pointer transition-all ${
                    neuralFlash ? 'scale-105 ring-2 ring-cyan-400 animate-bounce' : ''
                  }`}
                  title="Disparar impulso cuántico para entrelazar agentes y memorias en tiempo real"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Estimular Sinapsis</span>
                </button>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto text-xs w-full pt-1">
                {STARSEED_BRANCHES_META.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBranchFilter(b.id)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                      selectedBranchFilter === b.id
                        ? 'bg-cyan-500/25 border border-cyan-500/50 text-cyan-200 font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Viewport Render (3D or 2D) */}
            <div className="flex-1 relative w-full h-full min-h-[420px]">
              {graphDimensionMode === '3d' ? (
                <>
                  <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                    <button
                      onClick={() => {
                        cameraRef.current.rotX = 0.3;
                        cameraRef.current.rotY = 0.5;
                        cameraRef.current.distance = 420;
                      }}
                      className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                      title="Restablecer Vista"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        cameraRef.current.distance = Math.max(150, cameraRef.current.distance - 60);
                      }}
                      className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                      title="Acercar (Zoom In)"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        cameraRef.current.distance = Math.min(800, cameraRef.current.distance + 60);
                      }}
                      className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                      title="Alejar (Zoom Out)"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <canvas ref={canvas3DRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
                  <div className="absolute bottom-3 left-3 p-2 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Cerebro 3D Vivo: 6 Agentes • Archivos de Contexto • Sinapsis con Fotones en Tiempo Real</span>
                  </div>
                </>
              ) : (
                <>
                  <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />
                  <div className="absolute bottom-3 left-3 p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-[11px] font-mono text-slate-400">
                    ⚡ Simulación física 2D de resortes y repulsión gravitatoria
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Node Inspector Sidebar */}
          <div className="bg-[#0d1017]/95 border border-white/10 rounded-2xl p-4 flex flex-col space-y-3 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Inspector Sináptico 3D
            </h3>

            {selectedNode ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold" style={{ backgroundColor: `${selectedNode.color}25`, color: selectedNode.color }}>
                      {selectedNode.type === 'agent' ? '🤖 Agente Autónomo' : selectedNode.type === 'context' ? '📁 Contexto / Archivo' : selectedNode.type}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Resonancia: {selectedNode.weight || 85}%
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white font-sans">{selectedNode.label}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedNode.summary}</p>
                </div>

                {/* AGENT-SPECIFIC CONTROLS */}
                {selectedNode.type === 'agent' && (
                  <div className="p-3 bg-black/50 rounded-xl border border-cyan-500/30 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Hardware Asignado:</span>
                      <span className="text-cyan-300 font-bold">{selectedNode.cpuPercent || 15}% CPU M1</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Progreso de Ciclo:</span>
                      <span className="text-emerald-400 font-bold">{selectedNode.progress || 75}%</span>
                    </div>
                    {selectedNode.defaultTask && (
                      <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-[10px] text-slate-300">
                        <b className="text-amber-300 block mb-0.5">Tarea Activa:</b>
                        {selectedNode.defaultTask}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        const fullAgent = LIVING_AGENTS_NODES.find(a => a.id === selectedNode.id) || selectedNode;
                        setSelectedFullPageAgent(fullAgent);
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir Espacio de Trabajo Completo</span>
                    </button>
                  </div>
                )}

                {/* CONTEXT FILE SPECIFIC CONTROLS */}
                {selectedNode.type === 'context' && (
                  <div className="p-3 bg-black/50 rounded-xl border border-purple-500/30 space-y-2">
                    <span className="text-[10px] text-purple-300 font-bold block">Ruta del Sistema:</span>
                    <p className="text-[10px] text-slate-300 bg-white/5 p-2 rounded-lg break-all">{selectedNode.path}</p>
                    <div className="text-[10px] text-emerald-400 font-bold">✓ Indexado en Exocórtex 1.58-Bit</div>
                  </div>
                )}

                {/* MEMORY NODE CONTROLS */}
                {selectedNode.type !== 'agent' && selectedNode.type !== 'context' && (
                  <button
                    onClick={() => {
                      const matchedDoc = documents.find((d) => d.id === selectedNode.id || d.name.toLowerCase() === selectedNode.label.toLowerCase());
                      if (matchedDoc) {
                        setSelectedDoc(matchedDoc);
                        setActiveSubTab('vault');
                      }
                    }}
                    className="w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    Abrir Documento en Bóveda
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                <Brain className="w-10 h-10 text-cyan-500/40 animate-pulse" />
                <p className="text-xs font-mono">Selecciona cualquier nodo (Agente, Archivo, Recuerdo o Axioma) para inspeccionar sus sinapsis vivas en 3D.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULL AGENT WORKSPACE STANDALONE MODAL (LAUNCHED FROM 3D CORTEX) */}
      <AgentFullWorkspaceModal
        agent={selectedFullPageAgent}
        isOpen={Boolean(selectedFullPageAgent)}
        onClose={() => setSelectedFullPageAgent(null)}
      />

      {/* SUBTAB 2: BÓVEDA DE DOCUMENTOS */}
      {activeSubTab === 'vault' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-hidden">
          <div className="bg-[#0a0d15]/95 border border-white/10 rounded-2xl p-3 flex flex-col space-y-2 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Documentos StarSeed</h3>
              <button
                onClick={() => {
                  setSelectedDoc(null);
                  setDocForm({ name: 'Nueva Memoria', branch: 'memory', category: 'General', tags: '', markdown: '# Nueva Memoria\n\nEscribe aquí tus pensamientos o relaciones [[Wikilinks]]...\n', color: '#00f0ff' });
                  setIsEditingDoc(true);
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear
              </button>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setIsEditingDoc(false);
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-white'
                        : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase" style={{ backgroundColor: `${doc.color || '#00f0ff'}25`, color: doc.color || '#00f0ff' }}>
                        {doc.branch}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{doc.category}</span>
                    </div>
                    <div className="font-bold text-xs truncate">{doc.name}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">{doc.markdown?.replace(/^#+\s+/gm, '')}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#0d1017]/95 border border-white/10 rounded-2xl p-4 flex flex-col space-y-3 overflow-hidden">
            {isEditingDoc ? (
              <div className="flex-1 flex flex-col space-y-3 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 font-mono block mb-1">Título del Documento</label>
                    <input
                      type="text"
                      value={docForm.name}
                      onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                      className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-mono block mb-1">Rama StarSeed</label>
                    <select
                      value={docForm.branch}
                      onChange={(e) => setDocForm({ ...docForm, branch: e.target.value })}
                      className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                    >
                      {STARSEED_BRANCHES_META.filter((b) => b.id !== 'all').map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-mono block mb-1">Etiquetas (separadas por comas)</label>
                  <input
                    type="text"
                    value={docForm.tags}
                    onChange={(e) => setDocForm({ ...docForm, tags: e.target.value })}
                    className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                    placeholder="ontocracia, soberanía, hardware, bitnet"
                  />
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="text-[11px] text-slate-400 font-mono block mb-1">Contenido Markdown (admite enlaces [[Wikilinks]])</label>
                  <textarea
                    value={docForm.markdown}
                    onChange={(e) => setDocForm({ ...docForm, markdown: e.target.value })}
                    className="flex-1 min-h-[220px] p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => setIsEditingDoc(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveDocument}
                    className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Guardar Memoria
                  </button>
                </div>
              </div>
            ) : selectedDoc ? (
              <div className="flex-1 flex flex-col space-y-3 overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase" style={{ backgroundColor: `${selectedDoc.color || '#00f0ff'}25`, color: selectedDoc.color || '#00f0ff' }}>
                        {selectedDoc.branch}
                      </span>
                      <h3 className="text-base font-bold text-white">{selectedDoc.name}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setDocForm({
                          name: selectedDoc.name,
                          branch: selectedDoc.branch,
                          category: selectedDoc.category || 'General',
                          tags: selectedDoc.tags ? selectedDoc.tags.join(', ') : '',
                          markdown: selectedDoc.markdown,
                          color: selectedDoc.color || '#00f0ff'
                        });
                        setIsEditingDoc(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(selectedDoc.id)}
                      className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedDoc.markdown}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Selecciona un documento para visualizar o editar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: RECUERDOS CLAVE */}
      {activeSubTab === 'recuerdos' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-y-auto">
          <div className="bg-[#0d1017]/95 border border-white/10 rounded-2xl p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                Identidad & Preferencias
              </h3>
              <button
                onClick={() => setIsEditingUserPrefs(!isEditingUserPrefs)}
                className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-semibold"
              >
                {isEditingUserPrefs ? 'Cerrar' : 'Editar'}
              </button>
            </div>

            {isEditingUserPrefs ? (
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] text-slate-400 font-mono block">Nombre Preferido</label>
                  <input
                    type="text"
                    value={userPrefsForm.preferred_name || ''}
                    onChange={(e) => setUserPrefsForm({ ...userPrefsForm, preferred_name: e.target.value })}
                    className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-mono block">Rol / Título</label>
                  <input
                    type="text"
                    value={userPrefsForm.role_title || ''}
                    onChange={(e) => setUserPrefsForm({ ...userPrefsForm, role_title: e.target.value })}
                    className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-mono block">Tono de Comunicación</label>
                  <input
                    type="text"
                    value={userPrefsForm.communication_tone || ''}
                    onChange={(e) => setUserPrefsForm({ ...userPrefsForm, communication_tone: e.target.value })}
                    className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                  />
                </div>
                <button
                  onClick={handleSaveUserPrefs}
                  className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold"
                >
                  Guardar Preferencias de Usuario
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 font-mono block">Nombre:</span>
                  <span className="font-bold text-white">{recuerdos.user_preferences?.preferred_name}</span>
                </div>
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 font-mono block">Rol:</span>
                  <span className="text-cyan-300 font-semibold">{recuerdos.user_preferences?.role_title}</span>
                </div>
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 font-mono block">Tono de Respuestas:</span>
                  <span className="text-slate-300">{recuerdos.user_preferences?.communication_tone}</span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-white/10">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                Cuentas Vinculadas
              </h4>
              <div className="space-y-1.5 text-[11px] font-mono">
                {recuerdos.connected_accounts_prefs?.map((acc, idx) => (
                  <div key={idx} className="p-2 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between">
                    <span className="text-slate-300 font-semibold">{acc.account}</span>
                    <span className="text-cyan-400">{acc.user || acc.project || 'Vinculada'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#0d1017]/95 border border-white/10 rounded-2xl p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Uso de Personalidades por Contexto
              </h3>
              <button
                onClick={() => setNewRuleModal(true)}
                className="text-xs px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Regla
              </button>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              {recuerdos.context_personality_rules?.map((rule) => (
                <div key={rule.id} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300">{rule.assigned_personality}</span>
                    <button onClick={() => handleDeleteRule(rule.id)} className="text-rose-400 hover:text-rose-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    <span className="text-slate-500 font-mono">Disparador:</span> {rule.context_trigger}
                  </p>
                </div>
              ))}
            </div>

            {newRuleModal && (
              <div className="p-3 bg-black/60 rounded-xl border border-purple-500/40 space-y-2">
                <label className="text-[10px] text-slate-400 font-mono block">Contexto o Tema</label>
                <input
                  type="text"
                  placeholder="ej: Diseño 3D, música, física cuántica"
                  value={newRuleForm.context_trigger}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, context_trigger: e.target.value })}
                  className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                />
                <label className="text-[10px] text-slate-400 font-mono block">Personalidad Asignada</label>
                <input
                  type="text"
                  placeholder="ej: Hephaestus, Kallisti, Hermes"
                  value={newRuleForm.assigned_personality}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, assigned_personality: e.target.value })}
                  className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setNewRuleModal(false)} className="px-2 py-1 text-xs text-slate-400">Cancelar</button>
                  <button onClick={handleAddRule} className="px-3 py-1 rounded bg-purple-500 text-white text-xs font-bold">Guardar</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#0d1017]/95 border border-white/10 rounded-2xl p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-emerald-400" />
                Memorias Inmutables (Fijadas)
              </h3>
              <button
                onClick={() => setNewMemoryModal(true)}
                className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Memoria
              </button>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              {recuerdos.pinned_core_memories?.map((pin) => (
                <div key={pin.id} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase bg-emerald-500/20 text-emerald-300">
                      {pin.priority}
                    </span>
                    <button onClick={() => handleDeletePinnedMemory(pin.id)} className="text-rose-400 hover:text-rose-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-white">{pin.title}</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{pin.content}</p>
                </div>
              ))}
            </div>

            {newMemoryModal && (
              <div className="p-3 bg-black/60 rounded-xl border border-emerald-500/40 space-y-2">
                <label className="text-[10px] text-slate-400 font-mono block">Título del Recuerdo</label>
                <input
                  type="text"
                  placeholder="ej: Visión de Soberanía 1.58b"
                  value={newMemoryForm.title}
                  onChange={(e) => setNewMemoryForm({ ...newMemoryForm, title: e.target.value })}
                  className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                />
                <label className="text-[10px] text-slate-400 font-mono block">Contenido del Recuerdo Permanente</label>
                <textarea
                  placeholder="Este recuerdo nunca será olvidado ni degradado por el sistema..."
                  value={newMemoryForm.content}
                  onChange={(e) => setNewMemoryForm({ ...newMemoryForm, content: e.target.value })}
                  className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white min-h-[60px]"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setNewMemoryModal(false)} className="px-2 py-1 text-xs text-slate-400">Cancelar</button>
                  <button onClick={handleAddPinnedMemory} className="px-3 py-1 rounded bg-emerald-500 text-black text-xs font-bold">Fijar Memoria</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: OPENVIKING MULTI-TIER MEMORY */}
      {activeSubTab === 'openviking' && (
        <div className="flex-1 bg-[#0a0d15]/95 border border-white/10 rounded-2xl p-4 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                Ecosistema de Memoria Cognitiva OpenViking (Volcengine)
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Arquitectura de 4 niveles con decaimiento temporal, propagación de energía y consolidación de sinapsis.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Tier 0: Working Memory */}
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono uppercase block w-fit mb-2">
                  Tier 0 // Working Memory
                </span>
                <h4 className="text-xs font-bold text-white">Buffer de Sesión Activa</h4>
                <div className="mt-2 space-y-1 text-xs">
                  {openVikingState?.working_memory?.map((wm) => (
                    <div key={wm.id} className="p-2 bg-black/40 rounded-lg text-[11px] text-slate-300 font-mono">
                      {wm.content}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tier 1: Episodic Memory */}
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono uppercase block w-fit mb-2">
                  Tier 1 // Episodic Memory
                </span>
                <h4 className="text-xs font-bold text-white">Eventos & Experiencia</h4>
                <div className="mt-2 space-y-1.5 text-xs">
                  {openVikingState?.episodic_memory?.map((ep) => (
                    <div key={ep.id} className="p-2 bg-black/40 rounded-lg text-[11px] text-slate-300 space-y-1">
                      <div className="font-bold text-white">{ep.event}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Relevancia: {ep.effective_relevance}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tier 2: Semantic Clusters */}
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono uppercase block w-fit mb-2">
                  Tier 2 // Semantic Clusters
                </span>
                <h4 className="text-xs font-bold text-white">Propagación de Conceptos</h4>
                <div className="mt-2 space-y-1.5 text-xs">
                  {openVikingState?.semantic_clusters?.map((sc) => (
                    <div key={sc.cluster_id} className="p-2 bg-black/40 rounded-lg text-[11px] text-slate-300 space-y-1">
                      <div className="font-bold text-emerald-300">{sc.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Energía: {sc.activation_energy}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tier 3: Procedural Skills */}
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono uppercase block w-fit mb-2">
                  Tier 3 // Procedural Skills
                </span>
                <h4 className="text-xs font-bold text-white">Pipelines de Ejecución</h4>
                <div className="mt-2 space-y-1.5 text-xs">
                  {openVikingState?.procedural_skills?.map((ps) => (
                    <div key={ps.skill_id} className="p-2 bg-black/40 rounded-lg text-[11px] text-slate-300 space-y-1">
                      <div className="font-bold text-pink-300">{ps.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Éxito: {ps.success_rate * 100}% | {ps.execution_speed_ms} ms</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
