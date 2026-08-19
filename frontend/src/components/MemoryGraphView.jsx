import React, { useEffect, useRef, useState } from 'react';
import { 
  Network, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Plus, 
  Layers, 
  Sparkles, 
  RefreshCw, 
  Info, 
  Check, 
  Database,
  Sliders
} from 'lucide-react';
import { fetchMemoryGraph } from '../services/api';
import { webCognition } from '../services/webCognition';

export default function MemoryGraphView() {
  const canvasRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeType, setNewNodeType] = useState('concept');
  const [filterType, setFilterType] = useState('all');

  // Load graph from API or Web Cognition Store
  const loadGraph = async () => {
    try {
      const data = await fetchMemoryGraph();
      if (data && data.nodes && data.nodes.length > 0) {
        setGraphData(data);
        return;
      }
    } catch {}
    // Fallback to web cognition memory store
    setGraphData(webCognition.memoryStore);
  };

  useEffect(() => {
    loadGraph();
  }, []);

  // Canvas Force-Directed Layout & Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graphData) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let width = (canvas.width = canvas.parentElement.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement.clientHeight || 600);

    const handleResize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    // Initialize node positions with radial distribution
    const nodes = graphData.nodes.map((n, i) => {
      const angle = (i / graphData.nodes.length) * 2 * Math.PI;
      const radius = 120 + (i % 3) * 60;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: Math.max(14, Math.min(28, (n.weight || 50) / 3))
      };
    });

    const edges = graphData.edges.map((e) => ({ ...e }));

    // Physics Simulation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Apply zoom & center transform
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);

      // Force calculations
      nodes.forEach((node) => {
        // Repulsion between nodes
        nodes.forEach((other) => {
          if (node === other) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 180) {
            const force = (180 - dist) / dist * 0.05;
            node.vx += dx * force;
            node.vy += dy * force;
          }
        });

        // Attraction towards center
        const cdx = width / 2 - node.x;
        const cdy = height / 2 - node.y;
        node.vx += cdx * 0.002;
        node.vy += cdy * 0.002;

        // Apply velocity with damping
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= 0.88;
        node.vy *= 0.88;

        // Bounds containment
        node.x = Math.max(40, Math.min(width - 40, node.x));
        node.y = Math.max(40, Math.min(height - 40, node.y));
      });

      // Draw Edges (Glowing Links)
      edges.forEach((edge) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) return;

        // Spring attraction between connected nodes
        const edx = target.x - source.x;
        const edy = target.y - source.y;
        const dist = Math.sqrt(edx * edx + edy * edy) || 1;
        const springForce = (dist - 140) * 0.005;
        source.vx += (edx / dist) * springForce;
        source.vy += (edy / dist) * springForce;
        target.vx -= (edx / dist) * springForce;
        target.vy -= (edy / dist) * springForce;

        // Gradient Line
        const grad = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
        grad.addColorStop(1, 'rgba(168, 85, 247, 0.4)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();

        // Edge label (relation)
        if (edge.relation && zoom > 0.8) {
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
          ctx.font = '9px monospace';
          ctx.fillText(edge.relation, midX + 4, midY - 4);
        }
      });

      // Draw Nodes
      nodes.forEach((node) => {
        const isMatch = searchQuery === '' || node.label.toLowerCase().includes(searchQuery.toLowerCase());
        const isSelected = selectedNode && selectedNode.id === node.id;

        // Colors per type
        let color = '#00f0ff'; // Cyan default
        if (node.type === 'architecture') color = '#3b82f6';
        if (node.type === 'hardware') color = '#f59e0b';
        if (node.type === 'agent') color = '#ec4899';
        if (node.type === 'philosophy') color = '#10b981';
        if (node.type === 'memory') color = '#a855f7';

        // Outer Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = isSelected ? 25 : (isMatch ? 12 : 2);

        // Node Circle
        ctx.fillStyle = isSelected ? '#ffffff' : color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, isSelected ? node.radius + 4 : node.radius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.shadowBlur = 0; // Reset shadow

        // Inner Core Ring
        ctx.strokeStyle = '#08090d';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = isMatch ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
        ctx.font = isSelected ? 'bold 12px Inter, sans-serif' : '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.radius + 14);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Canvas Click Interaction
    const handleCanvasClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - width / 2) / zoom + width / 2;
      const clickY = (e.clientY - rect.top - height / 2) / zoom + height / 2;

      let found = null;
      nodes.forEach((n) => {
        const dx = clickX - n.x;
        const dy = clickY - n.y;
        if (Math.sqrt(dx * dx + dy * dy) < n.radius + 8) {
          found = n;
        }
      });
      setSelectedNode(found);
    };

    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [graphData, zoom, searchQuery, selectedNode]);

  const handleAddConcept = (e) => {
    e.preventDefault();
    if (!newNodeLabel.trim() || !graphData) return;

    const newId = `concept_${Date.now()}`;
    const newNode = {
      id: newId,
      label: newNodeLabel.trim(),
      type: newNodeType,
      summary: `Concepto creado por el usuario: ${newNodeLabel.trim()}`,
      weight: 80
    };

    // Connect to central node
    const newEdge = {
      source: "bitnet_158b",
      target: newId,
      relation: "asociado_a"
    };

    const updatedGraph = {
      nodes: [...graphData.nodes, newNode],
      edges: [...graphData.edges, newEdge]
    };

    setGraphData(updatedGraph);
    webCognition.saveMemory(updatedGraph);
    setSelectedNode(newNode);
    setNewNodeLabel('');
    setIsAddingNode(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#08090d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
      {/* Top Header & Controls */}
      <div className="p-4 bg-[#0e1117] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Network className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
              Grafo Armónico de Memoria // StarSeed OS
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                {graphData?.nodes?.length || 0} Nodos Vivos
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Red semántica asociativa de 1.58 bits con actualización y aprendizaje continuo
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar concepto..."
              className="px-3 py-1.5 pl-8 rounded-xl glass-input text-xs text-white placeholder-slate-500 w-36 sm:w-48"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2 pointer-events-none" />
          </div>

          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            title="Acercar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            title="Alejar"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoom(1)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            title="Centrar"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsAddingNode(!isAddingNode)}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Nodo</span>
          </button>
        </div>
      </div>

      {/* Add Concept Form Modal/Popup */}
      {isAddingNode && (
        <form onSubmit={handleAddConcept} className="p-4 bg-[#0a0d15] border-b border-purple-500/30 flex flex-wrap items-center gap-3 z-10 animate-fade-in">
          <input
            type="text"
            required
            autoFocus
            value={newNodeLabel}
            onChange={(e) => setNewNodeLabel(e.target.value)}
            placeholder="Nombre del nuevo concepto..."
            className="px-3 py-1.5 rounded-xl glass-input text-xs text-white flex-1 min-w-[200px]"
          />
          <select
            value={newNodeType}
            onChange={(e) => setNewNodeType(e.target.value)}
            className="px-3 py-1.5 rounded-xl glass-input text-xs text-white font-mono bg-[#0e1117]"
          >
            <option value="concept">Concepto General</option>
            <option value="architecture">Arquitectura 1.58b</option>
            <option value="hardware">Hardware / Senses</option>
            <option value="agent">Agente / Personalidad</option>
            <option value="philosophy">Filosofía StarSeed</option>
          </select>
          <button type="submit" className="px-3.5 py-1.5 rounded-xl bg-purple-500 text-white text-xs font-bold shadow-md">
            Crear Nodo
          </button>
        </form>
      )}

      {/* Interactive Canvas Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-[#05070a]">
        <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing block" />

        {/* Selected Node Inspector Panel */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 p-4 rounded-2xl glass-panel border-cyan-500/40 shadow-2xl z-20 space-y-2.5 animate-slide-up">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                  Tipo: {selectedNode.type}
                </span>
                <h3 className="font-display font-bold text-base text-white">{selectedNode.label}</h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedNode.summary || "Nodo cognitivo activo en la red neuronal de 1.58 bits."}
            </p>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Peso Armónico: {selectedNode.weight || 80}%</span>
              <span className="text-cyan-300">Conectado a red central</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
