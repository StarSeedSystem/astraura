import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Cpu, 
  Play, 
  Pause, 
  Plus, 
  Sliders, 
  Activity, 
  ShieldCheck, 
  Layers, 
  Sparkles, 
  Network, 
  Zap, 
  Check, 
  RefreshCw,
  Terminal,
  Clock,
  Globe,
  FileCode,
  Brain,
  Wand2,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  Trash2,
  X,
  Gauge,
  Radio,
  Battery,
  AlertCircle,
  Edit3,
  Key,
  GitBranch,
  ArrowRight,
  Bot,
  Crown,
  FolderTree,
  FolderOpen,
  Shield,
  ListChecks,
  MessageSquareQuote,
  Compass,
  FileText,
  Settings
} from 'lucide-react';
import { 
  fetchSwarmStatus, 
  updateSwarmCapacityMode, 
  dispatchSwarmTask, 
  cancelSwarmTask, 
  toggleSwarmSchedule, 
  updateSwarmScheduleFrequency, 
  createSwarmSchedule, 
  toggleAgent, 
  updateAgentConcurrency,
  fetchAgents,
  saveAgent,
  deleteAgent,
  toggleAgentImagination,
  fetchDirectorStatus,
  steerDirectorSwarm,
  addDirectorMemory,
  triggerDirectorCycle,
  fetchDirectorConfig,
  updateDirectorConfig,
  triggerDirectorImaginationCycle
} from '../services/api';
import AgentEditorModal from './AgentEditorModal';
import AgentApiManagerModal from './AgentApiManagerModal';

export default function AgentSwarmView() {
  const [swarmData, setSwarmData] = useState(null);
  const [directorData, setDirectorData] = useState(null);
  const [agentsList, setAgentsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('director'); // 'director', 'tasks', 'schedules', 'agents', 'telemetry'
  const [toastMsg, setToastMsg] = useState('');

  // Director Directive Input & Memory State
  const [directiveInput, setDirectiveInput] = useState('');
  const [isSteeringSwarm, setIsSteeringSwarm] = useState(false);
  const [isAddMemoryModalOpen, setIsAddMemoryModalOpen] = useState(false);
  const [newMemoryForm, setNewMemoryForm] = useState({
    title: '',
    content: '',
    category: 'governance',
    importance: 'high',
    tags: ''
  });

  // Director Configuration & Preferences State
  const [isDirectorConfigModalOpen, setIsDirectorConfigModalOpen] = useState(false);
  const [isSavingDirectorConfig, setIsSavingDirectorConfig] = useState(false);
  const [isOrchestratingImagination, setIsOrchestratingImagination] = useState(false);
  const [directorConfigForm, setDirectorConfigForm] = useState({
    orchestration_mode: 'autonomous_proactive',
    quality_threshold: 80,
    supervision_interval_seconds: 10,
    auto_route_to_projects: true,
    auto_inject_axioms: true,
    auto_trigger_imagination: true,
    max_agent_concurrency: 6,
    m1_hardware_limit_percent: 60,
    default_master_directive: 'Supervisión continua, balance de hardware M1 y enrutamiento inteligente de activos a proyectos.'
  });

  // Agent Vault Modals
  const [isAgentEditorOpen, setIsAgentEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [isAgentApiModalOpen, setIsAgentApiModalOpen] = useState(false);
  const [selectedApiAgent, setSelectedApiAgent] = useState(null);

  // Dispatch Task Modal State
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    area_id: 'area_engineering',
    title: '',
    prompt: '',
    agent_id: 'hephaestus'
  });

  // Create Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    area_id: 'area_engineering',
    agent_id: 'hephaestus',
    frequency_minutes: 15,
    prompt: ''
  });

  const loadSwarm = async () => {
    try {
      const [sData, aData, dData] = await Promise.all([
        fetchSwarmStatus(),
        fetchAgents(),
        fetchDirectorStatus()
      ]);
      if (sData) setSwarmData(sData);
      if (aData && aData.agents) setAgentsList(aData.agents);
      if (dData) {
        setDirectorData(dData);
        if (dData.config) {
          setDirectorConfigForm(prev => ({ ...prev, ...dData.config }));
        }
      }
    } catch (err) {
      console.warn('Error fetching swarm/agents/director status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDirectorConfig = async (e) => {
    if (e) e.preventDefault();
    setIsSavingDirectorConfig(true);
    try {
      const res = await updateDirectorConfig(directorConfigForm);
      if (res && res.success) {
        setToastMsg('⚙️ Ajustes y preferencias del Director actualizados y guardados en la bóveda.');
        setTimeout(() => setToastMsg(''), 4000);
        setIsDirectorConfigModalOpen(false);
        loadSwarm();
      }
    } catch (err) {
      console.error('Error saving director config:', err);
    } finally {
      setIsSavingDirectorConfig(false);
    }
  };

  const handleTriggerSupervisedImagination = async () => {
    setIsOrchestratingImagination(true);
    try {
      const res = await triggerDirectorImaginationCycle(
        'proj_astraura_core',
        'Optimización continua y desarrollo creativo para Astraura Core OS'
      );
      if (res && res.success) {
        setToastMsg('🌌 Proceso imaginativo intuitivo supervisado por el Director disparado con éxito.');
        setTimeout(() => setToastMsg(''), 4000);
        loadSwarm();
      }
    } catch (err) {
      console.error('Error triggering supervised imagination:', err);
    } finally {
      setIsOrchestratingImagination(false);
    }
  };

  const handleSteerDirector = async (e) => {
    if (e) e.preventDefault();
    if (!directiveInput.trim()) return;

    try {
      setIsSteeringSwarm(true);
      const res = await steerDirectorSwarm(directiveInput.trim());
      if (res && res.success) {
        setToastMsg(`👑 Directiva aplicada por el Director: ${res.dispatched_actions?.length || 1} agentes reorientados.`);
        setTimeout(() => setToastMsg(''), 4000);
        setDirectiveInput('');
        loadSwarm();
      }
    } catch (err) {
      alert(`Error al emitir directiva: ${err.message}`);
    } finally {
      setIsSteeringSwarm(false);
    }
  };

  const handleAddDirectorMemory = async (e) => {
    e.preventDefault();
    if (!newMemoryForm.title.trim() || !newMemoryForm.content.trim()) return;

    try {
      const tagsArr = newMemoryForm.tags
        ? newMemoryForm.tags.split(',').map(t => t.trim()).filter(Boolean)
        : ['directiva_ejecutiva'];

      const res = await addDirectorMemory(
        newMemoryForm.title.trim(),
        newMemoryForm.content.trim(),
        newMemoryForm.category,
        newMemoryForm.importance,
        tagsArr
      );

      if (res && res.success) {
        setToastMsg(`🧠 Memoria ejecutiva asimilada en la bóveda del Director`);
        setTimeout(() => setToastMsg(''), 3000);
        setIsAddMemoryModalOpen(false);
        setNewMemoryForm({ title: '', content: '', category: 'governance', importance: 'high', tags: '' });
        loadSwarm();
      }
    } catch (err) {
      alert(`Error al guardar memoria ejecutiva: ${err.message}`);
    }
  };

  useEffect(() => {
    loadSwarm();
    const interval = setInterval(loadSwarm, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveAgentData = async (agentPayload) => {
    try {
      await saveAgent(agentPayload);
      setToastMsg(`💾 Agente guardado: ${agentPayload.name}`);
      setTimeout(() => setToastMsg(''), 3000);
      setIsAgentEditorOpen(false);
      setEditingAgent(null);
      loadSwarm();
    } catch (err) {
      alert(`Error al guardar agente: ${err.message}`);
    }
  };

  const handleDeleteAgentData = async (agentId) => {
    if (!confirm('¿Eliminar este agente soberano personalizado?')) return;
    try {
      await deleteAgent(agentId);
      setToastMsg(`🗑️ Agente eliminado`);
      setTimeout(() => setToastMsg(''), 3000);
      loadSwarm();
    } catch (err) {
      alert(`Error al eliminar agente: ${err.message}`);
    }
  };

  const handleToggleAgentImaginationState = async (agentId, currentVal) => {
    try {
      const newVal = !currentVal;
      await toggleAgentImagination(agentId, newVal);
      setToastMsg(`🌌 Imaginación en segundo plano: ${newVal ? 'ACTIVADA' : 'DESACTIVADA'}`);
      setTimeout(() => setToastMsg(''), 3000);
      loadSwarm();
    } catch (err) {
      alert(`Error al cambiar estado de imaginación: ${err.message}`);
    }
  };

  const handleOpenCreateAgent = () => {
    setEditingAgent(null);
    setIsAgentEditorOpen(true);
  };

  const handleOpenEditAgent = (agentObj) => {
    setEditingAgent(agentObj);
    setIsAgentEditorOpen(true);
  };

  const handleOpenApiModal = (agentObj) => {
    setSelectedApiAgent(agentObj);
    setIsAgentApiModalOpen(true);
  };

  const handleSetCapacityMode = async (mode, manualPercent = null) => {
    try {
      const res = await updateSwarmCapacityMode(mode, manualPercent);
      setToastMsg(`⚙️ Modo de Capacidad: ${mode.toUpperCase()}`);
      setTimeout(() => setToastMsg(''), 3000);
      loadSwarm();
    } catch (err) {
      alert(`Error cambiando modo: ${err.message}`);
    }
  };

  const handleDispatchTask = async (e) => {
    e.preventDefault();
    if (!dispatchForm.title.trim()) return;
    try {
      await dispatchSwarmTask(
        dispatchForm.area_id, 
        dispatchForm.title.trim(), 
        dispatchForm.prompt.trim() || 'Ejecutar tarea multiagente',
        dispatchForm.agent_id
      );
      setToastMsg(`⚡ Tarea Despachada: ${dispatchForm.title}`);
      setTimeout(() => setToastMsg(''), 3000);
      setIsDispatchModalOpen(false);
      setDispatchForm({ area_id: 'area_engineering', title: '', prompt: '', agent_id: 'hephaestus' });
      loadSwarm();
    } catch (err) {
      alert(`Error despachando tarea: ${err.message}`);
    }
  };

  const handleCancelTask = async (taskId) => {
    try {
      await cancelSwarmTask(taskId);
      setToastMsg('🛑 Tarea cancelada');
      setTimeout(() => setToastMsg(''), 3000);
      loadSwarm();
    } catch (err) {
      alert(`Error cancelando tarea: ${err.message}`);
    }
  };

  const handleToggleSchedule = async (scheduleId, currentEnabled) => {
    try {
      await toggleSwarmSchedule(scheduleId, !currentEnabled);
      setToastMsg(!currentEnabled ? '⏰ Reactivación Programada Activada' : '⏸️ Programación Pausada');
      setTimeout(() => setToastMsg(''), 3000);
      loadSwarm();
    } catch (err) {
      alert(`Error actualizando programación: ${err.message}`);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleForm.title.trim()) return;
    try {
      await createSwarmSchedule(
        scheduleForm.title.trim(),
        scheduleForm.area_id,
        scheduleForm.agent_id,
        scheduleForm.frequency_minutes,
        scheduleForm.prompt.trim()
      );
      setToastMsg(`⏰ Nueva Programación Creada: ${scheduleForm.title}`);
      setTimeout(() => setToastMsg(''), 3000);
      setIsScheduleModalOpen(false);
      setScheduleForm({ title: '', area_id: 'area_engineering', agent_id: 'hephaestus', frequency_minutes: 15, prompt: '' });
      loadSwarm();
    } catch (err) {
      alert(`Error creando programación: ${err.message}`);
    }
  };

  const handleToggleAgent = async (agentId, currentStatus) => {
    const isAct = currentStatus === 'active';
    try {
      await toggleAgent(agentId, !isAct);
      setToastMsg(!isAct ? `🟢 Agente ${agentId} Activado` : `⏸️ Agente ${agentId} Pausado`);
      setTimeout(() => setToastMsg(''), 3000);
      loadSwarm();
    } catch (err) {
      alert(`Error cambiando estado de agente: ${err.message}`);
    }
  };

  const governor = swarmData?.capacity_governor || {
    capacity_mode: 'adaptive',
    relative_capacity_percent: 30,
    allocated_cores: 2,
    free_cores_for_user: 6,
    adaptation_reason: 'Modo nominal'
  };

  return (
    <div className="flex flex-col h-full bg-[#08090d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-4 sm:p-6 space-y-6 overflow-y-auto font-sans">
      {/* Top Banner: Dynamic Adaptive Relative Capacity Governor */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0d1624] via-[#101c30] to-[#0a121e] border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600/30 via-teal-500/20 to-purple-500/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-xl shadow-cyan-950/40">
              <Users className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-white font-display tracking-wide">
                  Enjambre Multiagéntico // Capacidades Adaptativas & Multi-Área
                </h1>
                <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  {governor.capacity_mode.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {governor.adaptation_reason}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {toastMsg && (
              <span className="text-xs px-3 py-1.5 rounded-xl bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 font-mono animate-fade-in font-bold">
                {toastMsg}
              </span>
            )}

            <button
              onClick={() => setIsDispatchModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Despachar Tarea Concurrente
            </button>
          </div>
        </div>

        {/* Capacity Governor Selector & Live Cores Allocation */}
        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-bold">Modo de Capacidad Relativa:</span>
            {[
              { id: 'adaptive', label: '🧠 Auto-Adaptativo' },
              { id: 'performance', label: '⚡ Alto Rendimiento' },
              { id: 'eco', label: '🌱 Eco-Soberano' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => handleSetCapacityMode(m.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  governor.capacity_mode === m.id
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-black/40 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-black/40 rounded-xl border border-white/5 text-center">
              <span className="text-[10px] text-slate-400 block">Capacidad Asignada</span>
              <span className="text-xs font-bold text-cyan-300">{governor.relative_capacity_percent}% ({governor.allocated_cores} Núcleos M1)</span>
            </div>
            <div className="p-2 bg-black/40 rounded-xl border border-white/5 text-center">
              <span className="text-[10px] text-slate-400 block">Núcleos Libres (Chat)</span>
              <span className="text-xs font-bold text-emerald-300">{governor.free_cores_for_user} Núcleos (100% Libres)</span>
            </div>
            <div className="p-2 bg-black/40 rounded-xl border border-white/5 text-center">
              <span className="text-[10px] text-slate-400 block">Tareas Completadas</span>
              <span className="text-xs font-bold text-purple-300">{swarmData?.total_completed_tasks || 489}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Strategic Areas Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
        {(swarmData?.areas || []).map((area) => (
          <div
            key={area.id}
            className="p-3.5 rounded-2xl bg-[#0c101a] border border-white/10 space-y-1.5 shadow-lg flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-[11px] truncate">{area.name}</span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: area.color }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
              {area.description}
            </p>
            <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">{area.lead_name}</span>
              <span className="text-cyan-300 font-bold">Activo</span>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto text-xs font-mono">
        {[
          { id: 'director', label: '👑 Director Orquestador Supremo', icon: Crown, count: directorData?.decision_history?.length || 0 },
          { id: 'tasks', label: '⚡ Tareas Concurrentes en Vivo', icon: Activity, count: swarmData?.active_tasks?.length || 0 },
          { id: 'schedules', label: '⏰ Reactivaciones Programadas', icon: Clock, count: swarmData?.schedules?.length || 0 },
          { id: 'agents', label: '🤖 Matriz de Agentes Especializados', icon: Users, count: swarmData?.agents?.length || 0 },
          { id: 'telemetry', label: '📊 Balance & Gobernador M1', icon: Gauge },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all cursor-pointer font-bold ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 text-white border border-cyan-500/50 shadow-lg shadow-cyan-950/30'
                  : 'text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 0: DIRECTOR ORCHESTRATOR SUPREME VIEW ================= */}
      {activeSubTab === 'director' && (
        <div className="space-y-6 animate-fade-in font-mono text-xs">
          {/* Executive Directives Console */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-[#0d1322] via-[#0f172a] to-[#120f24] border border-cyan-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-md">
                  <Crown className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-display font-black text-white flex items-center gap-2">
                    {directorData?.director?.name || 'Astraura Director // Metis Prime'}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                      Director Supremo
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    {directorData?.director?.role || 'Director General del Enjambre & Gobernador Ejecutivo de Tareas y Contextos'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleTriggerSupervisedImagination}
                  disabled={isOrchestratingImagination}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-pink-500/20 hover:from-cyan-500/30 hover:to-pink-500/30 border border-pink-500/40 text-pink-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isOrchestratingImagination ? 'animate-spin' : ''}`} />
                  <span>{isOrchestratingImagination ? 'Orquestando...' : '🌌 Disparar Imaginación'}</span>
                </button>

                <button
                  onClick={() => setIsAddMemoryModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Memoria Ejecutiva</span>
                </button>

                <button
                  onClick={() => setIsDirectorConfigModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/20 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Settings className="w-3.5 h-3.5 text-cyan-400" />
                  <span>⚙️ Ajustes & Preferencias</span>
                </button>
              </div>
            </div>

            {/* Director Preferences Summary Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 p-3 bg-black/40 rounded-2xl border border-white/5 text-[11px]">
              <div>
                <span className="text-[10px] text-slate-500 block">Modo Gobernanza</span>
                <span className="font-bold text-cyan-300 capitalize">{directorData?.config?.orchestration_mode?.replace('_', ' ') || 'Autónomo'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Umbral de Calidad</span>
                <span className="font-bold text-emerald-300">{directorData?.config?.quality_threshold || 80}% Mínimo</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Auto-Enrutamiento</span>
                <span className="font-bold text-purple-300">{directorData?.config?.auto_route_to_projects !== false ? '✅ Habilitado' : '❌ Desactivado'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Auto-Axiomas</span>
                <span className="font-bold text-amber-300">{directorData?.config?.auto_inject_axioms !== false ? '✅ Habilitado' : '❌ Desactivado'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Imaginación Auto</span>
                <span className="font-bold text-pink-300">{directorData?.config?.auto_trigger_imagination !== false ? '✅ Habilitada' : '❌ Desactivada'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Concurrencia M1</span>
                <span className="font-bold text-cyan-300">{directorData?.config?.max_agent_concurrency || 6} Hilos</span>
              </div>
            </div>

            {/* Directive Input Form */}
            <form onSubmit={handleSteerDirector} className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <MessageSquareQuote className="w-4 h-4 text-cyan-400" />
                Emitir Directiva Maestra de Dirección al Enjambre:
              </label>
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={directiveInput}
                  onChange={(e) => setDirectiveInput(e.target.value)}
                  placeholder="Ej: Priorizar la optimización del microkernel ARM NEON para Hephaestus y enrutar las investigaciones de papers a la memoria del proyecto Core OS..."
                  className="flex-1 bg-black/50 border border-white/15 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono resize-none leading-relaxed"
                />
                <button
                  type="submit"
                  disabled={isSteeringSwarm}
                  className="px-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/40 transition-all min-w-[120px]"
                >
                  {isSteeringSwarm ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Compass className="w-4 h-4" />
                      <span>Dirigir Enjambre</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                <span className="text-cyan-400 font-bold">Directiva Activa:</span>
                <span className="text-slate-300 italic">"{directorData?.director?.active_directive || 'Supervisión continua y balance de hardware M1.'}"</span>
              </div>
            </form>
          </div>

          {/* Holistic Context Omniscient Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <FolderTree className="w-4 h-4" /> Proyectos
                </span>
                <span className="text-white font-bold">{directorData?.holistic_context?.projects_count || 0}</span>
              </div>
              <p className="text-[11px] text-slate-400">Proyectos soberanos enlazados y alineados a metas de la IA.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 text-purple-300 font-bold">
                  <Brain className="w-4 h-4" /> Cerebros
                </span>
                <span className="text-white font-bold">6 Cerebros</span>
              </div>
              <p className="text-[11px] text-slate-400">Contextos multidimensionales activos (Génesis, Atenea, Hephaestus...).</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                  <ShieldCheck className="w-4 h-4" /> Verificaciones
                </span>
                <span className="text-emerald-400 font-bold">{directorData?.director?.verifications_completed_count || 0} Auditadas</span>
              </div>
              <p className="text-[11px] text-slate-400">Entregables analizados con score de calidad técnica.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 text-pink-300 font-bold">
                  <Network className="w-4 h-4" /> Enrutamientos
                </span>
                <span className="text-pink-400 font-bold">{directorData?.director?.routings_performed_count || 0} Adjuntos</span>
              </div>
              <p className="text-[11px] text-slate-400">Resultados conectados a Proyectos, Carpetas y Memorias.</p>
            </div>
          </div>

          {/* Dual Column: Decision & Verification History + Executive Memories Vault */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Decision & Verification History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-cyan-400" />
                  Bitácora de Decisiones & Enrutamientos
                </h3>
                <span className="text-[10px] text-slate-400">
                  {directorData?.decision_history?.length || 0} Registros
                </span>
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                {(directorData?.decision_history || []).map((dec, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-[#0b0e18] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {dec.action}
                      </span>
                      <span className="text-slate-400">
                        {dec.timestamp ? new Date(dec.timestamp * 1000).toLocaleTimeString() : 'N/A'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {dec.reasoning || dec.directive}
                    </p>

                    <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2 text-[10px]">
                      {dec.target_project && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          📁 {dec.target_project}
                        </span>
                      )}
                      {dec.target_cerebro && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          🧠 {dec.target_cerebro}
                        </span>
                      )}
                      {dec.agent_id && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          🤖 {dec.agent_id}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Executive Memory Vault of the Director */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Bóveda de Memorias Propias del Director
                </h3>
                <span className="text-[10px] text-slate-400">
                  {directorData?.executive_memories?.length || 0} Axiomas
                </span>
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                {(directorData?.executive_memories || []).map((mem, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-[#0b0e18] border border-purple-500/20 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-purple-300 flex items-center gap-1">
                        💡 {mem.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-200 uppercase font-bold">
                        {mem.importance || 'medium'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {mem.content}
                    </p>

                    {mem.tags && mem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {mem.tags.map((t, tidx) => (
                          <span key={tidx} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: CONCURRENT ACTIVE TASKS */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white font-display">
                Tablero de Tareas Concurrentes en Ejecución
              </h2>
              <p className="text-xs text-slate-400">
                Múltiples agentes operan en paralelo en distintas áreas sin interferir en tus conversaciones.
              </p>
            </div>

            <button
              onClick={() => setIsDispatchModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Tarea
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(swarmData?.active_tasks || []).map((task) => {
              const isRunning = task.status === 'running';
              return (
                <div
                  key={task.id}
                  className={`p-5 rounded-3xl border shadow-xl space-y-3 flex flex-col justify-between ${
                    isRunning
                      ? 'bg-[#0a121e] border-cyan-500/40 shadow-cyan-950/20'
                      : 'bg-[#0c0f18] border-white/10 opacity-80'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/5">
                      <div>
                        <span className="font-bold text-white text-xs block">{task.title}</span>
                        <span className="text-[10px] text-slate-400">{task.area_name || task.area_id}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isRunning ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse' : 'bg-white/10 text-slate-400'
                      }`}>
                        {task.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Progress Bar & Phase */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Agente: <b className="text-cyan-300">{task.agent_name || task.agent_id}</b></span>
                        <span className="text-slate-300 font-bold">{task.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-cyan-400 pt-0.5">
                        <span className="font-mono flex items-center gap-1">
                          🔄 {task.phase_label || 'Fase 1/4: Inspección de Archivos & Telemetría'}
                        </span>
                        {task.real_memory_mb && (
                          <span className="text-slate-400 font-mono">
                            RAM: {task.real_memory_mb} MB • PID: {task.real_pid || 'M1'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Real Physical Location & Target Project */}
                    <div className="p-2 bg-black/40 rounded-xl border border-white/5 text-[10px] space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="truncate flex items-center gap-1">
                          📁 <span className="text-slate-300 font-mono">{task.target_folder_path || '/backend/app'}</span>
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                          {task.target_project_id || 'proj_astraura_core'}
                        </span>
                      </div>
                    </div>

                    {/* Live Logs */}
                    <div className="p-3 rounded-xl bg-black/50 border border-white/5 text-[10px] text-slate-300 space-y-1 max-h-24 overflow-y-auto">
                      {(task.logs || []).map((lg, lgi) => (
                        <div key={lgi} className="truncate">▸ {lg}</div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Asignado: {task.allocated_cpu_percent}% CPU</span>
                    {isRunning && (
                      <button
                        onClick={() => handleCancelTask(task.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-bold cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULED AUTONOMOUS REACTIVATIONS */}
      {activeSubTab === 'schedules' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white font-display">
                Reactivaciones Programadas & Despertares Autónomos
              </h2>
              <p className="text-xs text-slate-400">
                Los agentes se despiertan periódicamente para auditar código, enriquecer memoria y monitorear la web.
              </p>
            </div>

            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Programación
            </button>
          </div>

          <div className="space-y-3">
            {(swarmData?.schedules || []).map((sch) => {
              const isEnabled = sch.is_enabled;
              return (
                <div
                  key={sch.id}
                  className={`p-5 rounded-3xl border shadow-xl space-y-3 transition-all ${
                    isEnabled
                      ? 'bg-[#0e1220] border-purple-500/40 shadow-purple-950/20'
                      : 'bg-[#0c0f18] border-white/5 opacity-70'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-white text-sm">{sch.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                        Cada {sch.frequency_minutes} minutos
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleSchedule(sch.id, isEnabled)}
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer ${
                        isEnabled
                          ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
                          : 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10'
                      }`}
                    >
                      {isEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isEnabled ? 'Pausar' : 'Activar'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Agente Asignado & Área:</span>
                      <span className="text-white font-bold">{sch.assigned_agent} ({sch.area_id})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Último Resultado:</span>
                      <span className="text-emerald-300">{sch.last_result || 'Pendiente de primer ciclo'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: AGENTS MATRIX & VAULT GOVERNANCE */}
      {activeSubTab === 'agents' && (
        <div className="space-y-4 font-mono text-xs">
          {/* Header with Create Button */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <Bot className="w-4 h-4 text-cyan-400" />
                Matriz de Agentes Soberanos & Bóveda de Configuración
              </h2>
              <p className="text-[11px] text-slate-400">
                Personalidades, accesos a cerebros/memorias, procesos en desarrollo, ramificaciones paralelas y APIs.
              </p>
            </div>

            <button
              onClick={handleOpenCreateAgent}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Agente</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(agentsList.length > 0 ? agentsList : (swarmData?.agents || [])).map((agent) => (
              <div
                key={agent.id}
                className="p-5 rounded-3xl bg-[#0c0f18] border border-white/10 hover:border-cyan-500/30 transition-all shadow-xl space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Name & Area */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: agent.color || '#00f0ff' }} />
                      <span className="font-bold text-white text-xs">{agent.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {agent.is_custom && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Custom
                        </span>
                      )}
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: `${agent.color || '#00f0ff'}20`, color: agent.color || '#00f0ff' }}
                      >
                        {(agent.status || 'active').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    {agent.role}
                  </p>

                  {/* Background Intuitive Imagination Quick Control */}
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    agent.imagination_enabled !== false
                      ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
                      : 'bg-black/40 border-white/5 text-slate-400'
                  }`}>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Wand2 className={`w-3.5 h-3.5 ${agent.imagination_enabled !== false ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
                      <span className="font-bold">
                        {agent.imagination_enabled !== false ? '🌌 Imaginación en 2do Plano' : '○ Imaginación Apagada'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleAgentImaginationState(agent.id, agent.imagination_enabled !== false)}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all ${
                        agent.imagination_enabled !== false
                          ? 'bg-purple-500 text-black shadow-sm'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                    >
                      {agent.imagination_enabled !== false ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Personalities in Use */}
                  <div className="p-2 rounded-xl bg-black/40 border border-purple-500/20 space-y-1 text-[10px]">
                    <span className="text-purple-300 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      Personalidades Habilitadas:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(agent.used_personalities || [
                        { id: agent.id, name: agent.name.split(' ')[0], color: agent.color }
                      ]).map((pers, persIdx) => (
                        <span
                          key={persIdx}
                          className="px-2 py-0.5 rounded-md border font-semibold flex items-center gap-1"
                          style={{ backgroundColor: `${pers.color || '#a855f7'}15`, borderColor: `${pers.color || '#a855f7'}40`, color: pers.color || '#a855f7' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pers.color || '#a855f7' }} />
                          <span>{pers.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Linked Cerebros */}
                  {agent.linked_cerebros && agent.linked_cerebros.length > 0 && (
                    <div className="p-2 rounded-xl bg-black/40 border border-cyan-500/20 space-y-1 text-[10px]">
                      <span className="text-cyan-300 font-bold flex items-center gap-1">
                        <Brain className="w-3 h-3 text-cyan-400" />
                        Cerebros & Memoria:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {agent.linked_cerebros.map((cer, cerIdx) => (
                          <span
                            key={cerIdx}
                            className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono"
                          >
                            {cer.name?.split('//')[0] || cer.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Branches & Developing Processes Breakdown */}
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-2 text-[10px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-bold text-white flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        Procesos Activos ({agent.developing_processes?.length || 2}):
                      </span>
                      <span className="text-cyan-300 font-bold">{agent.cpu_quota_percent || 20}% CPU</span>
                    </div>

                    <div className="space-y-1">
                      {(agent.developing_processes || [
                        { name: "Inferencia 1.58b Continua", status: "running", cpu: 2.5 }
                      ]).slice(0, 2).map((proc, pidx) => (
                        <div key={pidx} className="px-2 py-1 rounded-lg bg-[#07090f] border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-slate-200 truncate">{proc.name}</span>
                          </div>
                          <span className="text-cyan-400 font-mono text-[9px] shrink-0">{proc.cpu || 1.5}%</span>
                        </div>
                      ))}
                    </div>

                    {/* Developed Branches Tree Info */}
                    <div className="pt-1.5 border-t border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-bold text-purple-300 flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-purple-400" />
                          Ramas Desarrolladas:
                        </span>
                        <span className="text-cyan-400 font-bold">{agent.generated_branches?.speedup_factor || '5.0x'}</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {(agent.generated_branches?.branch_tree || [
                          { name: "Sonda AST", target: "SIMD NEON" }
                        ]).slice(0, 2).map((br, bidx) => (
                          <span key={bidx} className="px-1.5 py-0.5 rounded bg-purple-950/30 border border-purple-500/30 text-purple-200 text-[9px] flex items-center gap-1 truncate max-w-full">
                            <span>🌿 {br.name}</span>
                            <span className="text-slate-400">→ {br.target}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenEditAgent(agent)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold flex items-center justify-center gap-1 border border-white/5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3 text-cyan-400" />
                      <span>Administrar</span>
                    </button>

                    <button
                      onClick={() => handleOpenApiModal(agent)}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-bold flex items-center justify-center gap-1 border border-cyan-500/30 transition-colors cursor-pointer"
                    >
                      <Key className="w-3 h-3" />
                      <span>API & Sync</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleToggleAgent(agent.id, agent.status)}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {agent.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{agent.status === 'active' ? 'Pausar Agente' : 'Reanudar Agente'}</span>
                    </button>

                    {agent.is_custom && (
                      <button
                        onClick={() => handleDeleteAgentData(agent.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TELEMETRY & GOVERNOR */}
      {activeSubTab === 'telemetry' && (
        <div className="p-6 rounded-3xl bg-[#0c0f18] border border-white/10 shadow-xl space-y-6 font-mono text-xs">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-4 border-b border-white/10">
            <Gauge className="w-4 h-4 text-cyan-400" />
            Telemetría de Balanceo Dinámico de Carga & CPU M1
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                <span className="font-bold text-white text-xs block">Reparto Inteligente de Capacidades:</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  El sistema evalúa cada 5 segundos si estás interactuando activamente con el chat o si la Mac M1 está en reposo, escalando dinámicamente el presupuesto del enjambre entre 10% y 60% para garantizar 0% de lag.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-slate-400 font-bold block">Ajuste Manual de Capacidad:</span>
                <input
                  type="range"
                  min="5"
                  max="80"
                  step="5"
                  value={governor.relative_capacity_percent}
                  onChange={(e) => handleSetCapacityMode('manual', parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>5% (Mínimo / Eco)</span>
                  <span className="text-cyan-300 font-bold">{governor.relative_capacity_percent}% ({governor.allocated_cores} Núcleos)</span>
                  <span>80% (Máximo)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH TASK MODAL */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono text-xs">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#0e1220] border border-cyan-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Despachar Tarea Concurrente a un Área
              </h3>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDispatchTask} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Área Estratégica:</label>
                <select
                  value={dispatchForm.area_id}
                  onChange={(e) => {
                    const area = (swarmData?.areas || []).find(a => a.id === e.target.value);
                    setDispatchForm({ 
                      ...dispatchForm, 
                      area_id: e.target.value,
                      agent_id: area?.lead_agent || 'hephaestus'
                    });
                  }}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                >
                  {(swarmData?.areas || []).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Título de la Tarea:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Auditar bucles SIMD en main.py"
                  value={dispatchForm.title}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Prompt / Instrucciones Detalladas:</label>
                <textarea
                  rows={3}
                  placeholder="Detalles sobre lo que debe ejecutar el agente en segundo plano..."
                  value={dispatchForm.prompt}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, prompt: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 cursor-pointer"
                >
                  Despachar Ahora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SCHEDULE MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono text-xs">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#100e22] border border-purple-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Nueva Reactivación Programada Autónoma
              </h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Título de la Rutina:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Escaneo de Vulnerabilidades y Código"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Área:</label>
                  <select
                    value={scheduleForm.area_id}
                    onChange={(e) => {
                      const area = (swarmData?.areas || []).find(a => a.id === e.target.value);
                      setScheduleForm({ 
                        ...scheduleForm, 
                        area_id: e.target.value,
                        agent_id: area?.lead_agent || 'hephaestus'
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white"
                  >
                    {(swarmData?.areas || []).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Frecuencia (minutos):</label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={scheduleForm.frequency_minutes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, frequency_minutes: parseInt(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Prompt / Instrucciones para el Despertar:</label>
                <textarea
                  rows={2}
                  placeholder="Instrucción que ejecutará el agente cada vez que se despierte..."
                  value={scheduleForm.prompt}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, prompt: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold shadow-lg shadow-purple-500/25 cursor-pointer"
                >
                  Crear Programación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AGENT VAULT & SOVEREIGN API MODALS */}
      {isAgentEditorOpen && (
        <AgentEditorModal
          isOpen={isAgentEditorOpen}
          onClose={() => {
            setIsAgentEditorOpen(false);
            setEditingAgent(null);
          }}
          agent={editingAgent}
          onSave={handleSaveAgentData}
        />
      )}

      {/* MODAL AÑADIR MEMORIA EJECUTIVA AL DIRECTOR */}
      {isAddMemoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono text-xs">
          <div className="bg-[#0b0e18] border border-purple-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-purple-400" />
                Inyectar Memoria / Axioma Ejecutivo al Director
              </h3>
              <button 
                onClick={() => setIsAddMemoryModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDirectorMemory} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Título del Axioma / Memoria:</label>
                <input
                  type="text"
                  required
                  value={newMemoryForm.title}
                  onChange={e => setNewMemoryForm({...newMemoryForm, title: e.target.value})}
                  placeholder="Ej: Protocolo de Enrutamiento para Shaders GLSL"
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Contenido de la Memoria Ejecutiva:</label>
                <textarea
                  rows={4}
                  required
                  value={newMemoryForm.content}
                  onChange={e => setNewMemoryForm({...newMemoryForm, content: e.target.value})}
                  placeholder="Describe la directiva o principio que el Director debe recordar para la toma de decisiones..."
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Categoría:</label>
                  <select
                    value={newMemoryForm.category}
                    onChange={e => setNewMemoryForm({...newMemoryForm, category: e.target.value})}
                    className="w-full p-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs"
                  >
                    <option value="governance">Gobernanza & Mando</option>
                    <option value="quality_assurance">Auditoría & Calidad</option>
                    <option value="routing_topology">Topología de Enrutamiento</option>
                    <option value="hardware_governance">Silicio M1 & Hardware</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Importancia:</label>
                  <select
                    value={newMemoryForm.importance}
                    onChange={e => setNewMemoryForm({...newMemoryForm, importance: e.target.value})}
                    className="w-full p-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs"
                  >
                    <option value="critical">Crítica</option>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tags (separados por coma):</label>
                <input
                  type="text"
                  value={newMemoryForm.tags}
                  onChange={e => setNewMemoryForm({...newMemoryForm, tags: e.target.value})}
                  placeholder="directiva, shaders, core_os, arm64"
                  className="w-full p-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddMemoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold cursor-pointer"
                >
                  💾 Inyectar Memoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AJUSTES Y CONFIGURACIÓN DEL DIRECTOR ORQUESTRADOR */}
      {isDirectorConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono text-xs">
          <div className="bg-[#0b0e18] border border-cyan-500/50 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden space-y-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-display font-bold text-white flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-cyan-400" />
                Ajustes, Configuración y Preferencias del Director Supremo
              </h3>
              <button 
                onClick={() => setIsDirectorConfigModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDirectorConfig} className="space-y-4">
              {/* Mode Selection */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Modo de Orquestación & Gobernanza:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'autonomous_proactive', label: '🚀 Autónomo Proactivo', desc: 'Despacha e investiga de forma continua sin esperar órdenes.' },
                    { id: 'user_guided', label: '🧭 Asistido por Usuario', desc: 'Prioriza exclusivamente directivas emitidas en la consola.' },
                    { id: 'strict_quality', label: '🛡️ Calidad Estricta (95%+)', desc: 'Auditoría rigurosa. Rechaza cualquier artefacto imperfecto.' },
                    { id: 'eco_silicon', label: '🌱 Eco Silicio Apple M1', desc: 'Limita el uso de CPU a un solo núcleo para bajo consumo.' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDirectorConfigForm({ ...directorConfigForm, orchestration_mode: m.id })}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        directorConfigForm.orchestration_mode === m.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md'
                          : 'bg-black/40 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-xs text-cyan-300 mb-1">{m.label}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Threshold Slider */}
              <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-bold">Umbral Mínimo de Calidad Técnica para Aprobación:</span>
                  <span className="text-cyan-400 font-bold text-sm">{directorConfigForm.quality_threshold}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={98}
                  step={1}
                  value={directorConfigForm.quality_threshold}
                  onChange={e => setDirectorConfigForm({ ...directorConfigForm, quality_threshold: parseInt(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>50% (Permisivo)</span>
                  <span>80% (Recomendado)</span>
                  <span>98% (Máxima Exigencia)</span>
                </div>
              </div>

              {/* Switches Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-xs text-slate-300 font-bold block">Auto-Enrutamiento</span>
                  <p className="text-[10px] text-slate-400">Adjunta automáticamente entregables a Proyectos y Carpetas.</p>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={directorConfigForm.auto_route_to_projects}
                      onChange={e => setDirectorConfigForm({ ...directorConfigForm, auto_route_to_projects: e.target.checked })}
                      className="accent-cyan-400 w-4 h-4"
                    />
                    <span className="text-xs text-white">Activar</span>
                  </label>
                </div>

                <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-xs text-slate-300 font-bold block">Auto-Axiomas Memoria</span>
                  <p className="text-[10px] text-slate-400">Inyecta lecciones en la memoria StarSeed / Mem0.</p>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={directorConfigForm.auto_inject_axioms}
                      onChange={e => setDirectorConfigForm({ ...directorConfigForm, auto_inject_axioms: e.target.checked })}
                      className="accent-purple-400 w-4 h-4"
                    />
                    <span className="text-xs text-white">Activar</span>
                  </label>
                </div>

                <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-xs text-slate-300 font-bold block">Imaginación Intuitiva</span>
                  <p className="text-[10px] text-slate-400">Dispara ciclos creativos autónomos en segundo plano.</p>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={directorConfigForm.auto_trigger_imagination}
                      onChange={e => setDirectorConfigForm({ ...directorConfigForm, auto_trigger_imagination: e.target.checked })}
                      className="accent-pink-400 w-4 h-4"
                    />
                    <span className="text-xs text-white">Activar</span>
                  </label>
                </div>
              </div>

              {/* Concurrency & M1 Limit Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Concurrencia Máxima de Agentes:</span>
                    <span className="text-cyan-400 font-bold">{directorConfigForm.max_agent_concurrency} Agentes</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={directorConfigForm.max_agent_concurrency}
                    onChange={e => setDirectorConfigForm({ ...directorConfigForm, max_agent_concurrency: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Límite de CPU Silicio M1:</span>
                    <span className="text-emerald-400 font-bold">{directorConfigForm.m1_hardware_limit_percent}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={80}
                    step={5}
                    value={directorConfigForm.m1_hardware_limit_percent}
                    onChange={e => setDirectorConfigForm({ ...directorConfigForm, m1_hardware_limit_percent: parseInt(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Default Master Directive */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Directiva Maestra Predeterminada:
                </label>
                <textarea
                  rows={2}
                  value={directorConfigForm.default_master_directive}
                  onChange={e => setDirectorConfigForm({ ...directorConfigForm, default_master_directive: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsDirectorConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingDirectorConfig}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black shadow-lg shadow-cyan-500/25 cursor-pointer flex items-center gap-2"
                >
                  {isSavingDirectorConfig ? 'Guardando...' : '💾 Guardar Preferencias'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
