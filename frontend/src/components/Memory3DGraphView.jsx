import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, 
  Layers, 
  Sparkles, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  Maximize2, 
  Info, 
  Brain,
  Moon,
  Cpu,
  Bookmark,
  Search,
  Plus,
  Edit3,
  Trash2,
  GitBranch,
  ShieldCheck,
  Check,
  X,
  Orbit,
  Clock,
  Share2
} from 'lucide-react';
import { 
  fetchStarSeedMemoryGraph, 
  fetchOpenVikingMemory, 
  fetchMem0Memories, 
  addMem0Memory, 
  updateMem0Memory, 
  deleteMem0Memory,
  modifyBrainMemory 
} from '../services/api';

export default function Memory3DGraphView() {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [mem0Data, setMem0Data] = useState([]);
  const [openVikingState, setOpenVikingState] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLayout, setActiveLayout] = useState('galaxy'); // 'galaxy', 'clusters', 'fractal_tree', 'time_helix'
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'mem0', 'starseed', 'openviking', 'cerebros'
  
  // Node Edit / Create Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editMemoryText, setEditMemoryText] = useState('');
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState('general');
  const [newMemoryTier, setNewMemoryTier] = useState('user'); // user, agent, session
  const [toastMsg, setToastMsg] = useState('');

  // 3D Camera Controls State
  const cameraRef = useRef({
    rotX: 0.35,
    rotY: 0.6,
    distance: 420,
    panX: 0,
    panY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gData, ovData, m0Data] = await Promise.all([
        fetchStarSeedMemoryGraph().catch(() => null),
        fetchOpenVikingMemory().catch(() => null),
        fetchMem0Memories().catch(() => null)
      ]);

      const mergedNodes = [];
      const mergedEdges = [];

      // 1. StarSeed Nodes
      if (gData && gData.nodes) {
        gData.nodes.forEach((n) => {
          mergedNodes.push({
            ...n,
            sourceType: 'starseed',
            weight: n.weight || 85
          });
        });
        if (gData.edges) {
          mergedEdges.push(...gData.edges);
        }
      }

      // 2. Mem0 Universal Memory Nodes
      if (m0Data && m0Data.memories) {
        setMem0Data(m0Data.memories);
        m0Data.memories.forEach((m, idx) => {
          const mNodeId = `mem0_node_${m.id}`;
          const tierColor = m.category === 'user_profile' ? '#00f0ff' : m.category === 'agent_strategy' ? '#a855f7' : '#10b981';
          mergedNodes.push({
            id: mNodeId,
            label: m.memory.slice(0, 32) + '...',
            fullText: m.memory,
            type: 'mem0',
            sourceType: 'mem0',
            category: m.category || 'general',
            color: tierColor,
            weight: Math.round((m.confidence || 0.95) * 100),
            rawMem0: m
          });

          // Connect to core node
          mergedEdges.push({
            id: `edge_mem0_${idx}`,
            source: 'soul',
            target: mNodeId
          });
        });
      }

      // 3. OpenViking Working Context Nodes
      if (ovData) {
        setOpenVikingState(ovData);
        if (ovData.episodic_buffer) {
          ovData.episodic_buffer.slice(0, 6).forEach((ep, idx) => {
            const epId = `ov_ep_${idx}`;
            mergedNodes.push({
              id: epId,
              label: ep.summary || `Episodio #${idx + 1}`,
              fullText: ep.summary || JSON.stringify(ep),
              type: 'openviking',
              sourceType: 'openviking',
              category: 'episodic',
              color: '#f59e0b',
              weight: 75
            });
            mergedEdges.push({
              id: `edge_ov_${idx}`,
              source: 'memory',
              target: epId
            });
          });
        }
      }

      setNodes(mergedNodes);
      setEdges(mergedEdges);
    } catch (e) {
      console.error('Error loading unified 3D memory graph:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate 3D Coordinates based on Active Dynamic Layout
  const calculate3DPositions = (nodeList, layout) => {
    const node3DMap = new Map();
    const count = nodeList.length;

    nodeList.forEach((node, idx) => {
      let x = 0, y = 0, z = 0;

      if (layout === 'galaxy') {
        // GALAXY ORBIT: Concentric 3D rings with tilted galactic plane
        const ring = node.sourceType === 'mem0' ? 1 : node.sourceType === 'starseed' ? 2 : 3;
        const radius = ring === 1 ? 65 + (idx % 4) * 20 : ring === 2 ? 140 + (idx % 6) * 15 : 210 + (idx % 8) * 15;
        const angle = (idx / count) * Math.PI * 2 * (ring === 1 ? 1 : ring === 2 ? 2 : 3);
        
        x = radius * Math.cos(angle);
        z = radius * Math.sin(angle);
        y = Math.sin(angle * 3) * 35 + (Math.random() - 0.5) * 20;

      } else if (layout === 'clusters') {
        // SEMANTIC NEBULA CLUSTERS: Grouped by categories in spherical clouds
        let clusterCenter = { x: 0, y: 0, z: 0 };
        const cat = (node.category || node.type || '').toLowerCase();

        if (cat.includes('soul') || cat.includes('user') || cat.includes('axiom')) {
          clusterCenter = { x: -110, y: -80, z: 50 };
        } else if (cat.includes('agent') || cat.includes('skill') || cat.includes('hephaestus')) {
          clusterCenter = { x: 120, y: -70, z: -40 };
        } else if (cat.includes('dream') || cat.includes('onirico') || cat.includes('imagination')) {
          clusterCenter = { x: 0, y: 120, z: 80 };
        } else if (cat.includes('episodic') || cat.includes('session') || cat.includes('chat')) {
          clusterCenter = { x: 100, y: 80, z: 90 };
        } else {
          clusterCenter = { x: -90, y: 90, z: -70 };
        }

        const phi = Math.acos(-1 + (2 * (idx % 12)) / 12);
        const theta = Math.sqrt(12 * Math.PI) * phi;
        const spread = 45;
        x = clusterCenter.x + spread * Math.cos(theta) * Math.sin(phi);
        y = clusterCenter.y + spread * Math.sin(theta) * Math.sin(phi);
        z = clusterCenter.z + spread * Math.cos(phi);

      } else if (layout === 'fractal_tree') {
        // 3D FRACTAL BRANCHING TREE: Vertical ascending fractal trunk and branches
        const depth = idx === 0 ? 0 : (idx % 4) + 1;
        const branchAngle = ((idx % 6) / 6) * Math.PI * 2;
        const branchRadius = depth * 45;
        y = 150 - depth * 65 + (Math.random() - 0.5) * 15;
        x = Math.cos(branchAngle) * branchRadius;
        z = Math.sin(branchAngle) * branchRadius;

      } else if (layout === 'time_helix') {
        // 3D TIME HELIX: Spiral timeline from past to future
        const t = (idx / (count || 1)) * Math.PI * 6; // 3 full spiral turns
        const radius = 110;
        y = -140 + (idx / count) * 280;
        x = radius * Math.cos(t);
        z = radius * Math.sin(t);
      }

      node3DMap.set(node.id, {
        ...node,
        x, y, z,
        radius: node.weight ? Math.max(6, Math.min(14, node.weight / 9)) : 8,
        color: node.color || '#00f0ff'
      });
    });

    return node3DMap;
  };

  // Canvas Render Loop
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = canvas.parentElement.clientWidth);
    let height = (canvas.height = canvas.parentElement.clientHeight || 580);

    const filteredNodes = nodes.filter((n) => {
      if (activeFilter === 'mem0') return n.sourceType === 'mem0';
      if (activeFilter === 'starseed') return n.sourceType === 'starseed';
      if (activeFilter === 'openviking') return n.sourceType === 'openviking';
      return true;
    });

    const node3DMap = calculate3DPositions(filteredNodes, activeLayout);
    let animationId;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Auto gentle orbital rotation
      if (!cameraRef.current.isDragging) {
        cameraRef.current.rotY += 0.0018;
      }

      const { rotX, rotY, distance, panX, panY } = cameraRef.current;
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

      // 3D Perspective Projection
      const projectedNodes = [];
      node3DMap.forEach((node) => {
        let x1 = node.x * cosY - node.z * sinY;
        let z1 = node.z * cosY + node.x * sinY;

        let y1 = node.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + node.y * sinX;

        const fov = 420;
        const scale = fov / (fov + z2 + distance);
        const projX = width / 2 + x1 * scale + panX;
        const projY = height / 2 + y1 * scale + panY;

        projectedNodes.push({
          ...node,
          projX,
          projY,
          projZ: z2,
          scale,
          visible: scale > 0
        });
      });

      // Sort depth
      projectedNodes.sort((a, b) => b.projZ - a.projZ);

      // Draw Synaptic Connections
      edges.forEach((edge) => {
        const source = projectedNodes.find((n) => n.id === edge.source);
        const target = projectedNodes.find((n) => n.id === edge.target);

        if (source && target && source.visible && target.visible) {
          ctx.beginPath();
          ctx.moveTo(source.projX, source.projY);
          ctx.lineTo(target.projX, target.projY);
          const alpha = Math.max(0.12, Math.min(0.65, (source.scale + target.scale) / 2));
          ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.35})`;
          ctx.lineWidth = 1.4 * ((source.scale + target.scale) / 2);
          ctx.stroke();
        }
      });

      // Draw Nodes & Labels
      projectedNodes.forEach((node) => {
        if (!node.visible) return;

        const isMatch = searchQuery && (
          (node.label || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (node.fullText || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        const isSelected = selectedNode && selectedNode.id === node.id;
        const nodeRadius = node.radius * node.scale * (isSelected ? 1.5 : isMatch ? 1.4 : 1.0);

        // Glow Halo
        const grad = ctx.createRadialGradient(
          node.projX, node.projY, nodeRadius * 0.2,
          node.projX, node.projY, nodeRadius * 2.8
        );
        grad.addColorStop(0, isMatch ? 'rgba(250, 204, 21, 0.9)' : node.color || '#00f0ff');
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.projX, node.projY, nodeRadius * 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Core Sphere
        ctx.beginPath();
        ctx.arc(node.projX, node.projY, Math.max(2, nodeRadius), 0, Math.PI * 2);
        ctx.fillStyle = isMatch ? '#facc15' : isSelected ? '#ffffff' : node.color || '#00f0ff';
        ctx.shadowColor = node.color || '#00f0ff';
        ctx.shadowBlur = 10 * node.scale;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        if (node.scale > 0.45 || isSelected || isMatch) {
          ctx.font = `${Math.max(9, Math.round(11 * node.scale))}px monospace`;
          ctx.fillStyle = isMatch ? '#facc15' : isSelected ? '#ffffff' : 'rgba(226, 232, 240, 0.85)';
          ctx.textAlign = 'center';
          ctx.fillText(node.label || node.id, node.projX, node.projY + nodeRadius + 12 * node.scale);
        }
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [nodes, edges, activeLayout, activeFilter, searchQuery, selectedNode]);

  // Mouse & Touch Orbit Drag Handlers
  const handleMouseDown = (e) => {
    cameraRef.current.isDragging = true;
    cameraRef.current.lastMouseX = e.clientX;
    cameraRef.current.lastMouseY = e.clientY;
  };

  const handleMouseMove = (e) => {
    if (!cameraRef.current.isDragging) return;
    const deltaX = e.clientX - cameraRef.current.lastMouseX;
    const deltaY = e.clientY - cameraRef.current.lastMouseY;

    if (e.buttons === 2 || e.shiftKey) {
      // Pan
      cameraRef.current.panX += deltaX * 0.8;
      cameraRef.current.panY += deltaY * 0.8;
    } else {
      // Orbit
      cameraRef.current.rotY += deltaX * 0.008;
      cameraRef.current.rotX += deltaY * 0.008;
    }

    cameraRef.current.lastMouseX = e.clientX;
    cameraRef.current.lastMouseY = e.clientY;
  };

  const handleMouseUp = () => {
    cameraRef.current.isDragging = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    cameraRef.current.distance = Math.max(150, Math.min(950, cameraRef.current.distance + e.deltaY * 0.4));
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Hit Test with projected nodes
    const { rotX, rotY, distance, panX, panY } = cameraRef.current;
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

    const filteredNodes = nodes.filter((n) => {
      if (activeFilter === 'mem0') return n.sourceType === 'mem0';
      if (activeFilter === 'starseed') return n.sourceType === 'starseed';
      if (activeFilter === 'openviking') return n.sourceType === 'openviking';
      return true;
    });

    const node3DMap = calculate3DPositions(filteredNodes, activeLayout);
    let clickedNode = null;
    let minDistance = 25;

    node3DMap.forEach((node) => {
      let x1 = node.x * cosY - node.z * sinY;
      let z1 = node.z * cosY + node.x * sinY;
      let y1 = node.y * cosX - z1 * sinX;
      let z2 = z1 * cosX + node.y * sinX;

      const fov = 420;
      const scale = fov / (fov + z2 + distance);
      const projX = canvas.width / 2 + x1 * scale + panX;
      const projY = canvas.height / 2 + y1 * scale + panY;

      const dist = Math.hypot(clickX - projX, clickY - projY);
      if (dist < minDistance) {
        minDistance = dist;
        clickedNode = node;
      }
    });

    setSelectedNode(clickedNode);
    if (clickedNode) {
      setEditMemoryText(clickedNode.fullText || clickedNode.label);
    }
  };

  const resetCamera = () => {
    cameraRef.current = {
      rotX: 0.35,
      rotY: 0.6,
      distance: 420,
      panX: 0,
      panY: 0,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0
    };
  };

  // Universal Memory Mutability Handler
  const handleSaveMemoryEdit = async () => {
    if (!selectedNode) return;
    try {
      if (selectedNode.sourceType === 'mem0' && selectedNode.rawMem0) {
        await updateMem0Memory(selectedNode.rawMem0.id, editMemoryText);
        setToastMsg('✨ Memoria Mem0 actualizada universalmente');
      } else {
        await modifyBrainMemory('brain_genesis', selectedNode.id, editMemoryText, 'alex_direct', '3d_graph');
        setToastMsg('✨ Neurona de memoria actualizada en disco');
      }
      setIsEditModalOpen(false);
      loadData();
    } catch (e) {
      setToastMsg('⚠️ Error actualizando memoria: ' + e.message);
    }
  };

  const handleDeleteMemory = async (node) => {
    if (!node) return;
    if (node.sourceType === 'mem0' && node.rawMem0) {
      try {
        await deleteMem0Memory(node.rawMem0.id);
        setToastMsg('🗑️ Memoria Mem0 eliminada');
        setSelectedNode(null);
        loadData();
      } catch (e) {
        setToastMsg('⚠️ Error eliminando: ' + e.message);
      }
    }
  };

  const handleCreateNewMemory = async () => {
    if (!newMemoryText.trim()) return;
    try {
      await addMem0Memory({
        memory: newMemoryText.trim(),
        user_id: newMemoryTier === 'user' ? 'alex' : '*',
        agent_id: newMemoryTier === 'agent' ? 'hephaestus' : '*',
        category: newMemoryCategory,
        metadata: { source: '3d_galaxy_graph', timestamp: Date.now() }
      });
      setToastMsg('🌟 Nueva memoria semántica agregada');
      setNewMemoryText('');
      setIsAddModalOpen(false);
      loadData();
    } catch (e) {
      setToastMsg('⚠️ Error creando memoria: ' + e.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#07090e] rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-4 sm:p-6 space-y-4 font-mono text-xs">
      {/* Top Controls & Layout Matrix */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
              <Network className="w-5 h-5 text-cyan-400" />
              Grafo 3D de Memorias & Cerebros (Mem0 + StarSeed + OpenViking)
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              {nodes.length} Nodos 3D
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Navegación 3D orbital, mutabilidad universal desde cualquier chat/personalidad y ramificación fractal.
          </p>
        </div>

        {/* Action Controls & Layout Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {toastMsg && (
            <span className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 animate-fade-in">
              {toastMsg}
            </span>
          )}

          {/* 3D Layout Buttons */}
          <div className="flex rounded-xl bg-black/60 border border-white/10 p-1">
            {[
              { id: 'galaxy', label: '🌌 Galaxia', icon: Orbit },
              { id: 'clusters', label: '🪐 Cúmulos', icon: Layers },
              { id: 'fractal_tree', label: '🌳 Árbol', icon: GitBranch },
              { id: 'time_helix', label: '⏳ Hélice', icon: Clock }
            ].map((layout) => (
              <button
                key={layout.id}
                onClick={() => setActiveLayout(layout.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  activeLayout === layout.id
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <layout.icon className="w-3 h-3" />
                {layout.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Memoria
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'Todos los Nodos' },
            { id: 'mem0', label: 'Mem0 Universal', color: 'text-cyan-400' },
            { id: 'starseed', label: 'StarSeed Triádico', color: 'text-purple-400' },
            { id: 'openviking', label: 'OpenViking Episódico', color: 'text-amber-400' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${
                activeFilter === f.id
                  ? 'bg-white/10 text-white font-bold border border-white/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar memoria o sinapsis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Main 3D Canvas & Side Inspector */}
      <div className="relative flex-1 rounded-2xl bg-black/70 border border-white/10 overflow-hidden min-h-[460px] flex">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleCanvasClick}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* 3D Viewport Controls Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <button
            onClick={() => { cameraRef.current.distance = Math.max(150, cameraRef.current.distance - 60); }}
            className="p-2 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 border border-white/10 shadow-lg"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => { cameraRef.current.distance = Math.min(950, cameraRef.current.distance + 60); }}
            className="p-2 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 border border-white/10 shadow-lg"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetCamera}
            className="p-2 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 border border-white/10 shadow-lg"
            title="Restablecer Vista"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute top-3 right-3 w-80 max-w-[90%] p-4 rounded-2xl bg-[#0c101a]/95 backdrop-blur-md border border-cyan-500/40 shadow-2xl space-y-3 z-20 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedNode.color }} />
                <span className="font-bold text-white text-xs truncate max-w-[170px]">
                  {selectedNode.label}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Origen:</span>
                <span className="text-cyan-300 font-bold uppercase">{selectedNode.sourceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Categoría:</span>
                <span className="text-purple-300">{selectedNode.category || selectedNode.type || 'General'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Resonancia Cuántica:</span>
                <span className="text-emerald-400 font-bold">{selectedNode.weight || 90}%</span>
              </div>

              <div className="space-y-1 pt-1 border-t border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Contenido Semántico:</span>
                <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 max-h-32 overflow-y-auto text-slate-200 text-xs leading-relaxed">
                  {selectedNode.fullText || selectedNode.label}
                </div>
              </div>
            </div>

            {/* Mutability Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex-1 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 text-xs shadow-md shadow-cyan-500/20"
              >
                <Edit3 className="w-3 h-3" />
                Modificar Memoria
              </button>

              {selectedNode.sourceType === 'mem0' && (
                <button
                  onClick={() => handleDeleteMemory(selectedNode)}
                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40"
                  title="Eliminar Memoria"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Modificar Memoria en Vivo (Mutabilidad Universal) */}
      {isEditModalOpen && selectedNode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#0c121e] border border-cyan-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-bold text-white text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                Modificar Memoria // Mutabilidad Universal 1.58-Bit
              </span>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-slate-400">Texto y Contenido Semántico de la Memoria:</span>
              <textarea
                rows={5}
                value={editMemoryText}
                onChange={(e) => setEditMemoryText(e.target.value)}
                className="w-full p-3 rounded-xl bg-black/60 border border-white/10 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>Cualquier personalidad o chat integrado podrá leer y mutar este contenido instantáneamente.</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMemoryEdit}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
              >
                Guardar Modificación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Agregar Nueva Memoria Universal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#0c121e] border border-purple-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-bold text-white text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                Nueva Memoria Universal (Mem0 + StarSeed)
              </span>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Nivel de Jerarquía:</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'user', label: '👤 Perfil Usuario (Alex)' },
                    { id: 'agent', label: '🤖 Agente / Habilidades' },
                    { id: 'session', label: '💬 Contexto Episódico' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setNewMemoryTier(t.id)}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition-all ${
                        newMemoryTier === t.id
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-black/40 border-white/10 text-slate-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">Categoría:</span>
                <input
                  type="text"
                  placeholder="ej. hardware_m1, agent_strategy, preferencias, axiom..."
                  value={newMemoryCategory}
                  onChange={(e) => setNewMemoryCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-slate-100 text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">Contenido de la Memoria:</span>
                <textarea
                  rows={4}
                  placeholder="Escribe el hecho o conocimiento semántico a persistir..."
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/60 border border-white/10 text-slate-100 text-xs focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNewMemory}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/20"
              >
                Forjar Memoria 3D
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
