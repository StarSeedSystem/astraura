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
  AlertCircle
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
  updateAgentConcurrency 
} from '../services/api';

export default function AgentSwarmView() {
  const [swarmData, setSwarmData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('tasks'); // 'tasks', 'schedules', 'agents', 'telemetry'
  const [toastMsg, setToastMsg] = useState('');

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
      const data = await fetchSwarmStatus();
      if (data) setSwarmData(data);
    } catch (err) {
      console.warn('Error fetching swarm status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSwarm();
    const interval = setInterval(loadSwarm, 4000);
    return () => clearInterval(interval);
  }, []);

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

                    {/* Progress Bar */}
                    <div className="space-y-1">
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

      {/* TAB 3: AGENTS MATRIX */}
      {activeSubTab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
          {(swarmData?.agents || []).map((agent) => (
            <div
              key={agent.id}
              className="p-5 rounded-3xl bg-[#0c0f18] border border-white/10 shadow-xl space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="font-bold text-white text-xs">{agent.name}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
                  >
                    {agent.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {agent.role}
                </p>

                {/* Personalities in Use */}
                <div className="p-2 rounded-xl bg-black/40 border border-purple-500/20 space-y-1.5 text-[10px]">
                  <span className="text-purple-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    Personalidades en Uso:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(agent.used_personalities || [
                      { id: agent.id, name: agent.name.split(' ')[0], color: agent.color, archetype: agent.role }
                    ]).map((pers, persIdx) => (
                      <span
                        key={persIdx}
                        className="px-2 py-0.5 rounded-md border font-semibold flex items-center gap-1"
                        style={{ backgroundColor: `${pers.color || '#a855f7'}15`, borderColor: `${pers.color || '#a855f7'}40`, color: pers.color || '#a855f7' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pers.color || '#a855f7' }} />
                        <span>{pers.name}</span>
                        <span className="text-[8px] opacity-70 font-mono">({pers.archetype?.split(' ')[0] || 'Voz'})</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Linked Cerebros */}
                {agent.linked_cerebros && agent.linked_cerebros.length > 0 && (
                  <div className="p-2 rounded-xl bg-black/40 border border-cyan-500/20 space-y-1 text-[10px]">
                    <span className="text-cyan-300 font-bold flex items-center gap-1">
                      <Brain className="w-3 h-3 text-cyan-400" />
                      Cerebros Vinculados:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {agent.linked_cerebros.map((cer, cerIdx) => (
                        <span
                          key={cerIdx}
                          className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono"
                        >
                          {cer.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-[10px] text-slate-400 space-y-1">
                  <div>▸ Tarea: <b className="text-slate-200">{agent.current_task || 'En espera de despacho'}</b></div>
                  <div>▸ Tareas Completadas: <b className="text-cyan-300">{agent.completed_tasks || 0}</b></div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <button
                  onClick={() => handleToggleAgent(agent.id, agent.status)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {agent.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{agent.status === 'active' ? 'Pausar' : 'Activar'}</span>
                </button>
                <span className="text-[10px] text-slate-500">Concurrencia: {agent.concurrency || 2}</span>
              </div>
            </div>
          ))}
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
    </div>
  );
}
