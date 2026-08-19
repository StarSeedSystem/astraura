import React, { useState, useEffect } from 'react';
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
  Shield
} from 'lucide-react';
import { 
  fetchProcessBranches, 
  regenerateBranch, 
  forkBranch, 
  modifyBranch, 
  deleteBranch 
} from '../services/api';

export default function ProcessBranchesModal({ processId, isOpen, onClose, onRefreshData }) {
  const [data, setData] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('in_progress'); // 'in_progress', 'completed', 'all'
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  
  // Fork modal state
  const [forkingBranchId, setForkingBranchId] = useState(null);
  const [forkNote, setForkNote] = useState('');
  
  // Edit modal state
  const [editingBranch, setEditingBranch] = useState(null);
  const [editHypothesis, setEditHypothesis] = useState('');
  const [editInsights, setEditInsights] = useState('');

  const loadBranches = async () => {
    if (!processId) return;
    setIsLoading(true);
    try {
      const res = await fetchProcessBranches(processId);
      if (res && res.success) {
        setData(res);
      }
    } catch (err) {
      console.error("Error cargando ramas de proceso:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && processId) {
      loadBranches();
    }
  }, [isOpen, processId]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
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

  const displayList = activeSubTab === 'in_progress' 
    ? inProgressList 
    : activeSubTab === 'completed' 
    ? completedList 
    : allList;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fade-in font-sans overflow-hidden">
      <div className="bg-[#0b0e17] border border-purple-500/40 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-purple-950/60 font-mono text-xs overflow-hidden">
        {/* Toast */}
        {toastMsg && (
          <div className="absolute top-4 right-4 z-50 p-3 rounded-xl bg-gradient-to-r from-purple-900 to-cyan-900 border border-purple-400 text-white shadow-xl animate-fade-in flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-cyan-950/30 to-transparent sticky top-0 z-10 bg-[#0b0e17]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Regresar a la vista de procesos"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-300" />
              <span className="font-bold hidden sm:inline">Regresar</span>
            </button>

            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-display flex items-center gap-2">
                Ramas & Historial: {proc?.name || processId}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {allList.length} Ramas
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Monitorea ramas en curso, completadas, logs completos de ejecución y control de regeneración / bifurcación.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="p-3 border-b border-white/10 bg-black/40 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('in_progress')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold text-xs transition-all ${
                activeSubTab === 'in_progress'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>En Progreso ({inProgressList.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('completed')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold text-xs transition-all ${
                activeSubTab === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completadas ({completedList.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('all')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer font-bold text-xs transition-all ${
                activeSubTab === 'all'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Todas ({allList.length})</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Astraura Branching Engine 1.58b
          </span>
        </div>

        {/* Branches Scroll List */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#07090e]/60">
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
                  className="p-5 rounded-3xl bg-[#0e111d] border border-white/10 hover:border-cyan-500/30 transition-all space-y-4 shadow-xl relative overflow-hidden"
                >
                  {/* Top Row: Title, Status Badge, Verified Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white font-sans flex items-center gap-1.5">
                          <GitBranch className="w-4 h-4 text-cyan-400" />
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
                      {isApplied ? (
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Completada & Aplicada
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                          <Activity className="w-3 h-3 animate-pulse" /> En Progreso
                        </span>
                      )}

                      {branch.verification && (
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1" title={`Verificado: ${branch.verification.checked_by}`}>
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Audit Score: {branch.verification.score * 100}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content: Hypothesis & Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-sans">
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1">
                        🎯 Hipótesis & Desarrollo:
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        {branch.hypothesis}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1">
                        💡 Síntesis & Hallazgos Verificados:
                      </span>
                      <p className="text-cyan-200 leading-relaxed">
                        {branch.insights}
                      </p>
                    </div>
                  </div>

                  {/* Step Logs Feed */}
                  {branch.step_logs && branch.step_logs.length > 0 && (
                    <div className="p-3 rounded-2xl bg-black/60 border border-white/5 space-y-1.5 font-mono text-[10px]">
                      <span className="text-slate-400 font-bold flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-emerald-400" /> Logs de Ejecución en Vivo:
                      </span>
                      <div className="space-y-1 text-slate-300 pl-2 border-l border-emerald-500/30">
                        {branch.step_logs.map((log, lIdx) => (
                          <div key={lIdx} className="leading-tight">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Toolbar */}
                  <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Regenerate Button */}
                      <button
                        onClick={() => handleRegenerate(branch.id)}
                        disabled={isActionRunning}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                        title="Re-sintetizar y regenerar esta rama con nueva semilla cuántica"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isActionRunning ? 'animate-spin' : ''}`} />
                        <span>Regenerar</span>
                      </button>

                      {/* Fork / Branch Out Button */}
                      <button
                        onClick={() => {
                          setForkingBranchId(branch.id);
                          setForkNote('');
                        }}
                        disabled={isActionRunning}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                        title="Bifurcar y crear una sub-rama derivada"
                      >
                        <Split className="w-3.5 h-3.5" />
                        <span>Ramificar (Bifurcar)</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => {
                          setEditingBranch(branch);
                          setEditHypothesis(branch.hypothesis);
                          setEditInsights(branch.insights);
                        }}
                        disabled={isActionRunning}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                        title="Modificar contenido de la rama"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Modificar</span>
                      </button>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(branch.id)}
                      disabled={isActionRunning}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                      title="Eliminar rama"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Fork Input Sub-Modal */}
        {forkingBranchId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
            <form onSubmit={handleFork} className="bg-[#0b0e17] border border-purple-500/40 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl font-mono text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Split className="w-4 h-4 text-purple-400" /> Bifurcar Rama & Explorar Variante
                </h3>
                <button 
                  type="button" 
                  onClick={() => setForkingBranchId(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-300 font-sans text-xs">
                Describe la variante, enfoque o hipótesis paralela que deseas que explore la nueva sub-rama:
              </p>

              <textarea
                value={forkNote}
                onChange={(e) => setForkNote(e.target.value)}
                placeholder="Ej: Explorar optimización usando registros Metal MSL en lugar de ARM NEON estándar..."
                rows={3}
                className="w-full p-3 rounded-xl bg-black/70 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForkingBranchId(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-bold shadow-lg"
                >
                  Crear Sub-Rama
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Sub-Modal */}
        {editingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
            <form onSubmit={handleSaveEdit} className="bg-[#0b0e17] border border-cyan-500/40 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl font-mono text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-cyan-400" /> Modificar Rama: {editingBranch.theme}
                </h3>
                <button 
                  type="button" 
                  onClick={() => setEditingBranch(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-bold">Hipótesis:</label>
                <textarea
                  value={editHypothesis}
                  onChange={(e) => setEditHypothesis(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-black/70 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-bold">Síntesis / Hallazgos:</label>
                <textarea
                  value={editInsights}
                  onChange={(e) => setEditInsights(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-black/70 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-slate-950 font-bold shadow-lg"
                >
                  Guardar & Auditar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Footer with Return Button */}
        <div className="p-4 border-t border-white/10 bg-black/60 flex items-center justify-between sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 font-bold cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-300" />
            <span>Regresar a Procesos</span>
          </button>

          <span className="text-[11px] text-slate-400">
            {displayList.length} ramas listadas
          </span>
        </div>
      </div>
    </div>
  );
}
