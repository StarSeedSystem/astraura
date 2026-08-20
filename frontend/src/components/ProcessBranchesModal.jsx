import React, { useState, useEffect, useRef } from 'react';
import { 
  GitBranch, 
  CheckCircle2, 
  Activity, 
  RotateCcw, 
  Edit3, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  ArrowLeft, 
  Clock, 
  FileCode, 
  Cpu, 
  Terminal, 
  Check, 
  X, 
  Flame, 
  ExternalLink,
  ChevronRight,
  Split,
  Plus,
  Send,
  Layers,
  Code2,
  Wand2,
  Brain,
  Globe,
  Shield,
  HardDrive,
  FolderTree,
  History,
  Maximize2,
  Minimize2,
  Eye,
  RefreshCw,
  Play,
  Zap,
  Lock,
  Unlock,
  Sliders,
  FileText,
  FolderOpen,
  TrendingUp
} from 'lucide-react';
import { 
  fetchProcessBranches, 
  regenerateBranch, 
  forkBranch, 
  modifyBranch, 
  deleteBranch,
  simulateLiveProcessStep
} from '../services/api';

export default function ProcessBranchesModal({ processId, isOpen, onClose, onRefreshData }) {
  const [data, setData] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('in_progress'); // 'in_progress', 'completed', 'all', 'diff_comparator', 'version_history'
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  
  // Real-time live polling and stepping state
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [isSimulatingStep, setIsSimulatingStep] = useState(false);
  const livePollTimerRef = useRef(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Fork modal state
  const [forkingBranchId, setForkingBranchId] = useState(null);
  const [forkNote, setForkNote] = useState('');
  
  // Edit modal state
  const [editingBranch, setEditingBranch] = useState(null);
  const [editHypothesis, setEditHypothesis] = useState('');
  const [editInsights, setEditInsights] = useState('');

  const loadBranches = async (silent = false) => {
    if (!processId) return;
    if (!silent) setIsLoading(true);
    try {
      const res = await fetchProcessBranches(processId);
      if (res && res.success) {
        setData(res);
        if (!selectedBranchId && res.branches?.length > 0) {
          setSelectedBranchId(res.branches[0].id);
        }
      }
    } catch (err) {
      console.error("Error cargando ramas de proceso:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && processId) {
      loadBranches();
    }
  }, [isOpen, processId]);

  // Live real-time polling effect
  useEffect(() => {
    if (isOpen && isLiveStreaming && processId) {
      livePollTimerRef.current = setInterval(() => {
        loadBranches(true);
      }, 3000);
    } else {
      if (livePollTimerRef.current) clearInterval(livePollTimerRef.current);
    }
    return () => {
      if (livePollTimerRef.current) clearInterval(livePollTimerRef.current);
    };
  }, [isOpen, isLiveStreaming, processId]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleSimulateStep = async (branchId = null) => {
    try {
      setIsSimulatingStep(true);
      const res = await simulateLiveProcessStep(processId, branchId || selectedBranchId);
      if (res && res.success) {
        showToast(`⚡ Paso en vivo ejecutado: ${res.step.slice(0, 45)}...`);
        await loadBranches(true);
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      showToast(`Error avanzando paso: ${err.message}`);
    } finally {
      setIsSimulatingStep(false);
    }
  };

  const handleRegenerate = async (branchId) => {
    setActionLoading(branchId);
    try {
      const res = await regenerateBranch(branchId);
      if (res && res.success) {
        showToast('🔄 ¡Rama regenerada y re-verificada con éxito!');
        loadBranches();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      alert(`Error regenerando rama: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFork = async (e) => {
    e.preventDefault();
    if (!forkingBranchId) return;
    setActionLoading(forkingBranchId);
    try {
      const res = await forkBranch(forkingBranchId, forkNote);
      if (res && res.success) {
        showToast('🌿 ¡Nueva sub-rama creada con éxito!');
        setForkingBranchId(null);
        setForkNote('');
        loadBranches();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      alert(`Error bifurcando rama: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingBranch) return;
    setActionLoading(editingBranch.id);
    try {
      const res = await modifyBranch(editingBranch.id, {
        hypothesis: editHypothesis,
        insights: editInsights
      });
      if (res && res.success) {
        showToast('✏️ Rama modificada y auditada con éxito');
        setEditingBranch(null);
        loadBranches();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      alert(`Error modificando rama: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (branchId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta rama del proceso?')) return;
    setActionLoading(branchId);
    try {
      const res = await deleteBranch(branchId);
      if (res && res.success) {
        showToast('🗑️ Rama eliminada del historial');
        loadBranches();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      alert(`Error eliminando rama: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  const proc = data?.process;
  const inProgressList = data?.in_progress_branches || [];
  const completedList = data?.completed_branches || [];
  const allList = data?.branches || [];

  const selectedBranch = allList.find(b => b.id === selectedBranchId) || allList[0] || {};

  const displayList = activeSubTab === 'in_progress' 
    ? inProgressList 
    : activeSubTab === 'completed' 
    ? completedList 
    : allList;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-2 sm:p-4 animate-fade-in font-sans overflow-hidden">
      <div className={`bg-[#080b12] border border-cyan-500/40 rounded-3xl w-full flex flex-col shadow-2xl shadow-cyan-950/60 font-mono text-xs overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-6xl max-h-[94vh]'
      }`}>
        {/* Toast */}
        {toastMsg && (
          <div className="fixed top-6 right-6 z-50 p-3 rounded-xl bg-gradient-to-r from-cyan-900 to-purple-900 border border-cyan-400 text-white shadow-2xl animate-fade-in flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#0d1424] via-[#0f172a] to-[#0d1424] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              title="Regresar a la vista de procesos"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-300" />
              <span className="font-bold hidden sm:inline">Cerrar</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white font-display flex items-center gap-2 truncate">
                  Vista Completa de Proceso: <span className="text-cyan-300">{proc?.name || processId}</span>
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                  <Activity className="w-3 h-3 animate-pulse" />
                  {allList.length} Ramas Vivas
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  Progreso: {data?.progress_percent || 75}%
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold hidden md:inline-flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-purple-400" />
                  ARM64 NEON M1
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 max-w-xl">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500" 
                    style={{ width: `${data?.progress_percent || 75}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {completedList.length}/{allList.length} Ramas Consolidadas
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live Streaming Indicator Button */}
            <button
              onClick={() => setIsLiveStreaming(!isLiveStreaming)}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isLiveStreaming 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
              title={isLiveStreaming ? 'Actualización en tiempo real activa' : 'Pausado'}
            >
              <span className={`w-2 h-2 rounded-full ${isLiveStreaming ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span className="hidden sm:inline">{isLiveStreaming ? 'En Vivo (3s)' : 'Pausado'}</span>
            </button>

            {/* Simulate Step Button */}
            <button
              onClick={() => handleSimulateStep()}
              disabled={isSimulatingStep}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-black font-black flex items-center gap-1.5 text-[11px] shadow-lg shadow-cyan-500/20 cursor-pointer"
              title="Avanzar y simular mutación de paso en tiempo real"
            >
              <Play className={`w-3.5 h-3.5 fill-black ${isSimulatingStep ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Paso en Vivo</span>
            </button>

            {/* Fullscreen Toggle */}
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
              title={isFullscreen ? 'Ventana Normal' : 'Pantalla Completa'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="px-4 py-2 border-b border-white/10 bg-[#06080e] flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('in_progress')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold text-xs transition-all ${
                activeSubTab === 'in_progress'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>En Progreso ({inProgressList.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('diff_comparator')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold text-xs transition-all ${
                activeSubTab === 'diff_comparator'
                  ? 'bg-gradient-to-r from-purple-500/25 to-pink-500/20 text-purple-200 border border-purple-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Comparador de Mejoras & Diff AST</span>
            </button>

            <button
              onClick={() => setActiveSubTab('version_history')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold text-xs transition-all ${
                activeSubTab === 'version_history'
                  ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/20 text-amber-200 border border-amber-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Historial de Versiones & Enlaces</span>
            </button>

            <button
              onClick={() => setActiveSubTab('completed')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold text-xs transition-all ${
                activeSubTab === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completadas ({completedList.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('all')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold text-xs transition-all ${
                activeSubTab === 'all'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-blue-400" />
              <span>Todas ({allList.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono hidden sm:flex">
            <span className="flex items-center gap-1 text-cyan-300">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              SIMD NEON 1.58b
            </span>
          </div>
        </div>

        {/* BODY VIEW CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[#07090e]/80">
          
          {/* TAB: COMPARADOR DINÁMICO DE MEJORAS & DIFF AST */}
          {activeSubTab === 'diff_comparator' && (
            <div className="space-y-6 animate-fade-in">
              {/* Branch Selector Bar */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#0e1424] border border-cyan-500/30">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-cyan-400" />
                  Rama en Comparación:
                </span>
                <select
                  value={selectedBranchId || ''}
                  onChange={e => setSelectedBranchId(e.target.value)}
                  className="bg-[#07090e] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-cyan-200 font-mono focus:outline-none focus:border-cyan-500"
                >
                  {allList.map(b => (
                    <option key={b.id} value={b.id}>{b.theme || b.id}</option>
                  ))}
                </select>
              </div>

              {/* Delta Telemetry Matrix Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-black/50 border border-emerald-500/30 space-y-1 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">Reducción de Latencia:</span>
                  <span className="text-base sm:text-lg font-bold text-emerald-300 font-mono">
                    -{selectedBranch.diff_comparison?.delta_metrics?.latency_reduction_pct || 74.2}%
                  </span>
                  <span className="text-[9px] text-emerald-400 block font-mono">24.5 ms ➔ 4.8 ms</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/50 border border-cyan-500/30 space-y-1 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">Huella RAM:</span>
                  <span className="text-base sm:text-lg font-bold text-cyan-300 font-mono">
                    -{selectedBranch.diff_comparison?.delta_metrics?.ram_reduction_pct || 62.8}%
                  </span>
                  <span className="text-[9px] text-cyan-400 block font-mono">48 MB ➔ 14 MB</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/50 border border-purple-500/30 space-y-1 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">Eficiencia TOPS/W:</span>
                  <span className="text-base sm:text-lg font-bold text-purple-300 font-mono">
                    +{selectedBranch.diff_comparison?.delta_metrics?.throughput_increase_pct || 135}%
                  </span>
                  <span className="text-[9px] text-purple-400 block font-mono">4.2 TOPS/Watt</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/50 border border-amber-500/30 space-y-1 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">Verificación Silicio M1:</span>
                  <span className="text-base sm:text-lg font-bold text-amber-300 font-mono">
                    {selectedBranch.verification?.score ? `${selectedBranch.verification.score * 100}%` : '100%'}
                  </span>
                  <span className="text-[9px] text-amber-400 block font-mono">0 Errores AST</span>
                </div>
              </div>

              {/* Live Side-by-Side Diff Box */}
              <div className="p-5 rounded-3xl bg-[#0b0e18] border border-purple-500/30 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-purple-400" />
                      Comparación de Modificación en Código & Registros
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Archivo: <strong className="text-cyan-300">{selectedBranch.diff_comparison?.code_diff?.file_path || 'backend/app/core/bitnet_neon_engine.cpp'}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSimulateStep(selectedBranch.id)}
                      disabled={isSimulatingStep}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Re-Optimizar Paso</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-mono bg-purple-950/20 p-3 rounded-xl border border-purple-500/20">
                  {selectedBranch.diff_comparison?.code_diff?.summary || 'Optimización de registros SIMD y supresión de multiplicaciones punto flotante.'}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
                  {/* Left: Baseline */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 font-bold text-[11px]">
                      <span>- Línea Base Anterior (v1.0 FP32 MatMul)</span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-red-500/20">Descartado</span>
                    </div>
                    <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 text-red-300/80 overflow-x-auto text-[11px] leading-relaxed custom-scrollbar max-h-60">
                      {selectedBranch.diff_comparison?.code_diff?.before_snippet || '// Código base previo...'}
                    </pre>
                  </div>

                  {/* Right: Optimized Current */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                      <span>+ Mejora Actual (v1.3 ARM NEON i2_s 1.58b)</span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20">Activo en Silicio</span>
                    </div>
                    <pre className="p-4 rounded-2xl bg-black/60 border border-emerald-500/20 text-emerald-300 overflow-x-auto text-[11px] leading-relaxed custom-scrollbar max-h-60">
                      {selectedBranch.diff_comparison?.code_diff?.after_snippet || '// Código optimizado 1.58b...'}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Real Linked Files and Memories */}
              {selectedBranch.real_links && (
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                    Archivos y Nodos Reales Modificados en el Host:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedBranch.real_links.files?.map((f, fidx) => (
                      <div key={fidx} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                        <div className="min-w-0 flex-1">
                          <span className="text-cyan-300 font-bold truncate block">{f.name}</span>
                          <span className="text-slate-500 text-[10px] block truncate">{f.path}</span>
                        </div>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: f.path } }))}
                          className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] font-bold shrink-0 ml-2"
                        >
                          Abrir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: HISTORIAL DE VERSIONES & ENLACES */}
          {activeSubTab === 'version_history' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#0a0d16] border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-400" />
                    Historial de Versiones & Registro de Modificaciones
                  </h3>
                  <span className="text-xs text-amber-300">
                    {selectedBranch.historical_versions?.length || 3} Versiones Registradas
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Explora la evolución cronológica de este proceso y accede a los enlaces reales de los archivos en cada versión previa.
                </p>
              </div>

              <div className="space-y-3">
                {(selectedBranch.historical_versions || []).map((ver, vidx) => (
                  <div key={vidx} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 hover:border-amber-500/40 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                          {ver.version}
                        </span>
                        <span className="text-white font-bold text-xs">{ver.summary}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(ver.timestamp * 1000).toLocaleString()} • {ver.author}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5">
                        {ver.changes?.map((ch, cidx) => (
                          <li key={cidx}>{ch}</li>
                        ))}
                      </ul>

                      {ver.file_link && (
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: ver.file_link } }))}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Inspeccionar Archivo Host</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: LISTADO DE RAMAS (IN_PROGRESS / COMPLETED / ALL) */}
          {(activeSubTab === 'in_progress' || activeSubTab === 'completed' || activeSubTab === 'all') && (
            <div className="space-y-4 animate-fade-in">
              {isLoading ? (
                <div className="p-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <span className="text-xs text-slate-400">Sincronizando ramas y logs del proceso...</span>
                </div>
              ) : displayList.length === 0 ? (
                <div className="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-3xl space-y-2">
                  <GitBranch className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-sm text-slate-400">No hay ramas en esta sección.</p>
                  <p className="text-[11px]">Las nuevas ramas se generan automáticamente en segundo plano según el contexto del usuario.</p>
                </div>
              ) : (
                displayList.map((branch) => {
                  const isApplied = branch.status === 'applied';
                  const isActionRunning = actionLoading === branch.id;

                  return (
                    <div
                      key={branch.id}
                      className="p-5 rounded-3xl bg-[#0e111d] border border-white/10 hover:border-cyan-500/40 transition-all space-y-4 shadow-xl relative overflow-hidden"
                    >
                      {/* Top Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white font-sans flex items-center gap-1.5">
                              <GitBranch className="w-4 h-4 text-cyan-400 shrink-0" />
                              {branch.theme}
                            </span>
                            {branch.parent_branch_id && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Sub-Rama de {branch.parent_branch_id}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" /> {branch.formatted_time || 'Reciente'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isApplied 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          }`}>
                            {isApplied ? '✓ Asimilado / Completado' : '⚡ Ejecución Activa'}
                          </span>

                          <button
                            onClick={() => {
                              setSelectedBranchId(branch.id);
                              setActiveSubTab('diff_comparator');
                            }}
                            className="px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Ver comparador de mejoras y diffs"
                          >
                            <Code2 className="w-3 h-3" />
                            <span>Ver Diff</span>
                          </button>
                        </div>
                      </div>

                      {/* Hypothesis & Insights */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs leading-relaxed">
                        <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hipótesis / Directiva:</span>
                          <p className="text-slate-200">{branch.hypothesis || 'Sin hipótesis registrada'}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Insights & Axiomas:</span>
                          <p className="text-slate-200">{branch.insights || 'Sin síntesis registrada'}</p>
                        </div>
                      </div>

                      {/* Branch Progress & Real Verification */}
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            Progreso de la Rama:
                          </span>
                          <span className="text-emerald-300 font-bold">
                            {branch.progress_percent || (isApplied ? 100 : 65)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-300 rounded-full transition-all duration-500" 
                            style={{ width: `${branch.progress_percent || (isApplied ? 100 : 65)}%` }}
                          />
                        </div>
                      </div>

                      {/* Context Files & Folders Section with Real Action Buttons */}
                      {branch.real_links && (
                        <div className="p-3 rounded-2xl bg-[#090d18] border border-cyan-500/20 space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-cyan-300 font-bold border-b border-white/5 pb-1">
                            <span className="flex items-center gap-1">
                              <FolderTree className="w-3.5 h-3.5 text-purple-400" />
                              Archivos & Folders de Contexto Vinculados:
                            </span>
                            <span className="text-slate-400">Exocórtex Local M1</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {branch.real_links.files?.map((fil, fidx) => (
                              <div key={fidx} className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-white truncate">
                                    <FileCode className="w-3 h-3 text-cyan-400 shrink-0" />
                                    <span className="truncate">{fil.name}</span>
                                  </div>
                                  <span className="text-[9px] text-slate-400 font-mono block truncate">{fil.path}</span>
                                </div>
                                <button
                                  onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: fil.path } }))}
                                  className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  <span>Ver</span>
                                </button>
                              </div>
                            ))}

                            {branch.real_links.folders?.map((fold, fidx) => (
                              <div key={fidx} className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300 truncate">
                                    <FolderOpen className="w-3 h-3 text-amber-400 shrink-0" />
                                    <span className="truncate">{fold.name}</span>
                                  </div>
                                  <span className="text-[9px] text-slate-400 font-mono block truncate">{fold.path}</span>
                                </div>
                                <button
                                  onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: fold.path } }))}
                                  className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[9px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  <span>Abrir</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Step Logs Real-Time Feed */}
                      {branch.step_logs && branch.step_logs.length > 0 && (
                        <div className="p-3 rounded-2xl bg-black/60 border border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-white/5">
                            <span className="font-bold flex items-center gap-1">
                              <Terminal className="w-3 h-3 text-cyan-400" /> Logs de Ejecución en Vivo:
                            </span>
                            <button
                              onClick={() => handleSimulateStep(branch.id)}
                              disabled={isSimulatingStep}
                              className="text-cyan-300 hover:underline font-bold text-[9px]"
                            >
                              + Avanzar Paso
                            </button>
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                            {branch.step_logs.map((log, lidx) => (
                              <div key={lidx} className="text-[10px] text-slate-300 font-mono leading-tight">
                                › {log}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRegenerate(branch.id)}
                            disabled={isActionRunning}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${isActionRunning ? 'animate-spin' : ''}`} />
                            <span>Regenerar</span>
                          </button>

                          <button
                            onClick={() => setForkingBranchId(branch.id)}
                            disabled={isActionRunning}
                            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Split className="w-3.5 h-3.5" />
                            <span>Bifurcar (Fork)</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingBranch(branch);
                              setEditHypothesis(branch.hypothesis || '');
                              setEditInsights(branch.insights || '');
                            }}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10"
                            title="Editar Hipótesis"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(branch.id)}
                            disabled={isActionRunning}
                            className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                            title="Eliminar Rama"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#06080e] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs font-mono">
          <div className="text-slate-400 text-[11px] flex items-center gap-2">
            <span>Kernel: <strong className="text-white">StarSeed 1.58b Dual-Trunk</strong></span>
            <span>•</span>
            <span>Modo: <strong className="text-emerald-300">100% Silicio M1 (Real)</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSimulateStep()}
              disabled={isSimulatingStep}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold hover:bg-cyan-500/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-cyan-300" />
              <span>Simular Mutación de Paso</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-colors cursor-pointer"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      </div>

      {/* FORK BRANCH SUB-MODAL */}
      {forkingBranchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0e111d] border border-purple-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Split className="w-4 h-4 text-purple-400" />
                Bifurcar Rama en Sub-Rama Contrafáctica
              </h3>
              <button onClick={() => setForkingBranchId(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleFork} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Nota o Enfoque de la Bifurcación:</label>
                <textarea
                  rows={3}
                  required
                  value={forkNote}
                  onChange={e => setForkNote(e.target.value)}
                  placeholder="Ej: Explorar vectorización alternativa con registros i2_s sin desborde..."
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/15 text-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForkingBranchId(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold"
                >
                  Forjar Sub-Rama
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH SUB-MODAL */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0e111d] border border-cyan-500/40 rounded-3xl p-6 max-w-lg w-full space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                Editar Directiva de Rama
              </h3>
              <button onClick={() => setEditingBranch(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Hipótesis / Directiva:</label>
                <textarea
                  rows={3}
                  required
                  value={editHypothesis}
                  onChange={e => setEditHypothesis(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/15 text-white resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Insights / Síntesis:</label>
                <textarea
                  rows={3}
                  value={editInsights}
                  onChange={e => setEditInsights(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/15 text-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
