import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Play, 
  Pause, 
  Check, 
  Clock, 
  Layers, 
  Sparkles, 
  RefreshCw, 
  Activity, 
  Terminal, 
  Globe, 
  Database,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  Save,
  CheckCircle2,
  HardDrive,
  Moon,
  Cloud,
  Wand2,
  X
} from 'lucide-react';
import { fetchWorkflows, toggleWorkflow, runWorkflow, saveWorkflow, deleteWorkflow } from '../services/api';

const ACTION_TYPES = [
  { id: 'system_senses', label: '📊 Sonda de Hardware & Telemetría M1', desc: 'Muestrea 8 núcleos, temperatura y memoria unificada', icon: Activity },
  { id: 'browser_search', label: '🌐 Búsqueda Web & Extracción (Browser-Use)', desc: 'Explora internet y extrae hallazgos relevantes', icon: Globe },
  { id: 'fs_scan', label: '📁 Auto-Indexación de Archivos', desc: 'Escanea documentos locales y actualiza el grafo', icon: HardDrive },
  { id: 'sync_gdrive_context', label: '☁️ Sincronización Google Drive', desc: 'Actualiza referencias y tokens de carpetas de Drive', icon: Cloud },
  { id: 'dream_reflect', label: '🌙 Reflexión Onírica & Síntesis', desc: 'Consolidación de recuerdos y generación de ideas', icon: Moon },
  { id: 'log_and_learn', label: '🧠 Aprendizaje Continuo en Memoria', desc: 'Registra el aprendizaje en StarSeed OS y OpenViking', icon: Sparkles }
];

export default function WorkflowsView() {
  const [workflows, setWorkflows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [runningWfId, setRunningWfId] = useState(null);
  const [activeStepResults, setActiveStepResults] = useState({});

  // Editor Modal State
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const data = await fetchWorkflows();
      setWorkflows(data.workflows || []);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching workflows:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleToggle = async (wfId, currentStatus) => {
    const newStatus = currentStatus !== 'enabled';
    try {
      await toggleWorkflow(wfId, newStatus);
      setWorkflows(prev => prev.map(w => w.id === wfId ? { ...w, status: newStatus ? 'enabled' : 'disabled' } : w));
    } catch (err) {
      console.error('Error toggling workflow:', err);
    }
  };

  const handleRun = async (wfId) => {
    setRunningWfId(wfId);
    try {
      const res = await runWorkflow(wfId);
      if (res.log) {
        setLogs(prev => [res.log, ...prev]);
      }
      if (res.step_results) {
        setActiveStepResults(prev => ({ ...prev, [wfId]: res.step_results }));
      }
      loadWorkflows();
    } catch (err) {
      console.error('Error running workflow:', err);
    } finally {
      setRunningWfId(null);
    }
  };

  const handleOpenNewWorkflow = () => {
    setEditingWorkflow({
      id: `wf_${Date.now()}`,
      name: 'Nuevo Workflow Automatizado',
      description: 'Automatización de tareas periódicas y aprendizaje continuo en segundo plano.',
      trigger_type: 'manual',
      trigger: 'Manual / A demanda',
      cron_expression: '*/30 * * * *',
      status: 'enabled',
      auto_learn: True = true,
      steps: [
        { step: 1, action: 'system_senses', desc: 'Muestreo de telemetría de hardware', params: {} },
        { step: 2, action: 'browser_search', desc: 'Búsqueda web automatizada con Browser-Use', params: { query: 'BitNet 1.58b' } },
        { step: 3, action: 'log_and_learn', desc: 'Registrar en memoria StarSeed', params: {} }
      ]
    });
    setShowEditor(true);
  };

  const handleOpenEditWorkflow = (wf) => {
    setEditingWorkflow(JSON.parse(JSON.stringify(wf)));
    setShowEditor(true);
  };

  const handleSaveWorkflow = async () => {
    if (!editingWorkflow || !editingWorkflow.name.trim()) return;
    try {
      const res = await saveWorkflow(editingWorkflow);
      if (res.success) {
        setShowEditor(false);
        loadWorkflows();
      }
    } catch (err) {
      alert(`Error guardando workflow: ${err.message}`);
    }
  };

  const handleDeleteWorkflow = async (wfId) => {
    if (!confirm('¿Estás seguro de eliminar este workflow?')) return;
    try {
      await deleteWorkflow(wfId);
      loadWorkflows();
    } catch (err) {
      alert(`Error eliminando workflow: ${err.message}`);
    }
  };

  const handleAddStepToEditor = () => {
    if (!editingWorkflow) return;
    const currentSteps = editingWorkflow.steps || [];
    const newStepNum = currentSteps.length + 1;
    const newStep = {
      step: newStepNum,
      action: 'browser_search',
      desc: `Paso ${newStepNum}: Búsqueda y análisis en internet`,
      params: { query: 'StarSeed OS IA' }
    };
    setEditingWorkflow({
      ...editingWorkflow,
      steps: [...currentSteps, newStep]
    });
  };

  const handleRemoveStepFromEditor = (stepIdx) => {
    if (!editingWorkflow) return;
    const updated = (editingWorkflow.steps || []).filter((_, i) => i !== stepIdx).map((s, idx) => ({ ...s, step: idx + 1 }));
    setEditingWorkflow({ ...editingWorkflow, steps: updated });
  };

  return (
    <div className="flex flex-col h-full bg-[#08090d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-4 sm:p-6 space-y-6 overflow-y-auto font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-emerald-400" />
              Workflows & Aprendizaje Autónomo
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono">
              Pipelines 1.58b
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Diseña, edita y ejecuta flujos de trabajo multi-paso con automatizaciones cron, eventos, navegador Browser-Use y memorización continua.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNewWorkflow}
            className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Workflow</span>
          </button>

          <button
            onClick={loadWorkflows}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            title="Recargar workflows"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Workflows Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workflows.map((wf) => {
          const isEnabled = wf.status === 'enabled';
          const isRunning = runningWfId === wf.id;
          const currentResults = activeStepResults[wf.id];

          return (
            <div
              key={wf.id}
              className={`p-4 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                isEnabled
                  ? 'bg-gradient-to-br from-[#0c121e] to-[#090d16] border-emerald-500/30 shadow-lg shadow-emerald-950/20'
                  : 'bg-black/40 border-white/5 opacity-75'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                      {wf.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{wf.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditWorkflow(wf)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                      title="Editar workflow"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWorkflow(wf.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                      title="Eliminar workflow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {wf.trigger}
                  </span>
                  {wf.auto_learn && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      Auto-Aprendizaje Activo
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 font-mono">
                    {wf.executions_count || 0} ejecuciones
                  </span>
                </div>

                {/* Steps List */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    Pasos del Pipeline ({wf.steps?.length || 0}):
                  </span>
                  <div className="space-y-1">
                    {(wf.steps || []).map((step, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-[11px] text-slate-300"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-bold flex items-center justify-center">
                            {step.step || idx + 1}
                          </span>
                          <span className="truncate">{step.desc}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono">{step.action}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Step Results if available */}
                {currentResults && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                    <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Resultados de la última ejecución:
                    </span>
                    {currentResults.map((r, ri) => (
                      <p key={ri} className="text-[10px] text-slate-300">{r}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-3">
                <button
                  onClick={() => handleToggle(wf.id, wf.status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
                  }`}
                >
                  {isEnabled ? <Check className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isEnabled ? 'Habilitado' : 'Pausado'}</span>
                </button>

                <button
                  onClick={() => handleRun(wf.id)}
                  disabled={isRunning}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 fill-black ${isRunning ? 'animate-spin' : ''}`} />
                  <span>{isRunning ? 'Ejecutando...' : 'Ejecutar Ahora'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Execution Logs Terminal Card */}
      <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Bitácora de Ejecuciones & Aprendizajes Recientes
          </span>
          <span className="text-[10px] text-slate-500">{logs.length} registros</span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-slate-500 italic">No hay ejecuciones registradas todavía.</p>
          ) : (
            logs.map((log, idx) => (
              <div
                key={log.id || idx}
                className="p-2 rounded-xl bg-white/5 border border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">●</span>
                  <span className="text-white font-bold">{log.workflow_name}</span>
                  <span className="text-slate-400">{log.message}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span>⏱️ {log.duration_s}s</span>
                  <span>•</span>
                  <span>{new Date(log.timestamp * 1000).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Workflow Creation & Editing Modal */}
      {showEditor && editingWorkflow && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 flex items-center justify-center animate-fade-in overflow-y-auto">
          <div className="p-5 rounded-2xl bg-[#0c111c] border border-emerald-500/40 shadow-2xl max-w-2xl w-full space-y-4 text-xs font-mono my-8">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-bold text-emerald-300 flex items-center gap-2 text-sm">
                <GitBranch className="w-4 h-4" />
                Configurador & Diseñador de Workflow
              </span>
              <button onClick={() => setShowEditor(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Nombre del Workflow</label>
                <input
                  type="text"
                  value={editingWorkflow.name}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                  className="w-full p-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Tipo de Disparador (Trigger)</label>
                <select
                  value={editingWorkflow.trigger_type}
                  onChange={(e) => {
                    const tt = e.target.value;
                    let trigLabel = 'Manual / A demanda';
                    if (tt === 'cron') trigLabel = 'Cron: Cada 30 minutos';
                    if (tt === 'event') trigLabel = 'Evento: Al modificar archivos locales';
                    if (tt === 'idle') trigLabel = 'Estado: Dispositivo en reposo / Idle';
                    setEditingWorkflow({ ...editingWorkflow, trigger_type: tt, trigger: trigLabel });
                  }}
                  className="w-full p-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="manual">Manual / A demanda</option>
                  <option value="cron">Cron Programado (Automático)</option>
                  <option value="event">Evento de Sistema / Archivos</option>
                  <option value="idle">Reposo del Dispositivo (Dream Engine)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Descripción & Propósito</label>
              <textarea
                rows={2}
                value={editingWorkflow.description}
                onChange={(e) => setEditingWorkflow({ ...editingWorkflow, description: e.target.value })}
                className="w-full p-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-emerald-400 resize-none"
              />
            </div>

            {/* Continuous Learning Toggle */}
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-purple-300 block">Proceso de Aprendizaje Continuo Automático</span>
                <span className="text-[10px] text-slate-400">Consolidar hallazgos y conocimientos de este workflow en la memoria de StarSeed OS.</span>
              </div>
              <input
                type="checkbox"
                checked={editingWorkflow.auto_learn !== false}
                onChange={(e) => setEditingWorkflow({ ...editingWorkflow, auto_learn: e.target.checked })}
                className="accent-purple-400 w-4 h-4 cursor-pointer"
              />
            </div>

            {/* Step Builder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase text-[11px] tracking-wider">
                  Pasos de Ejecución ({editingWorkflow.steps?.length || 0})
                </span>
                <button
                  onClick={handleAddStepToEditor}
                  className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 flex items-center gap-1 text-[10px]"
                >
                  <Plus className="w-3 h-3" />
                  Añadir Paso
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(editingWorkflow.steps || []).map((step, sidx) => (
                  <div
                    key={sidx}
                    className="p-2.5 rounded-xl bg-black/60 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-cyan-300 text-[11px]">Paso {step.step || sidx + 1}</span>
                      <button
                        onClick={() => handleRemoveStepFromEditor(sidx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-500 block mb-0.5">Acción</label>
                        <select
                          value={step.action}
                          onChange={(e) => {
                            const act = e.target.value;
                            const actObj = ACTION_TYPES.find(a => a.id === act);
                            const updatedSteps = [...editingWorkflow.steps];
                            updatedSteps[sidx] = { ...step, action: act, desc: actObj?.desc || step.desc };
                            setEditingWorkflow({ ...editingWorkflow, steps: updatedSteps });
                          }}
                          className="w-full p-1.5 rounded-lg bg-black/80 border border-white/10 text-white text-[10px]"
                        >
                          {ACTION_TYPES.map(a => (
                            <option key={a.id} value={a.id}>{a.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-500 block mb-0.5">Descripción del Paso</label>
                        <input
                          type="text"
                          value={step.desc}
                          onChange={(e) => {
                            const updatedSteps = [...editingWorkflow.steps];
                            updatedSteps[sidx] = { ...step, desc: e.target.value };
                            setEditingWorkflow({ ...editingWorkflow, steps: updatedSteps });
                          }}
                          className="w-full p-1.5 rounded-lg bg-black/80 border border-white/10 text-white text-[10px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setShowEditor(false)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveWorkflow}
                className="px-4 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Save className="w-4 h-4" />
                Guardar Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
