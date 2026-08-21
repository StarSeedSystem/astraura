import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Activity, 
  Zap, 
  MessageSquare, 
  Send, 
  Pause, 
  Play, 
  Cpu, 
  ChevronRight, 
  X, 
  CheckCircle2, 
  Clock, 
  RotateCcw,
  Sliders,
  Flame,
  Terminal,
  Shield,
  Layers,
  Code2,
  Wand2,
  Brain,
  Globe, 
  Eye, 
  ExternalLink,
  Crown,
  Folder
} from 'lucide-react';
import { fetchStatus, fetchImaginationStatus, fetchDirectorStatus, fetchSwarmStatus, fetchEcosystemAgents } from '../services/api';
import AgentTaskSummaryModal from './AgentTaskSummaryModal';
import AgentFullWorkspaceModal from './AgentFullWorkspaceModal';
import AgentPanel from './AgentPanel';

const AGENT_PROFILES = [
  {
    id: 'hephaestus',
    name: 'Hephaestus',
    role: 'Ingeniería, Código ARM NEON & SIMD',
    icon: Code2,
    color: '#10b981',
    defaultTask: 'Optimizando bucles vectoriales ARM64 NEON de 128-bit en kernel ternario 1.58b',
    progress: 78,
    cpuPercent: 18,
    status: 'working',
    used_personalities: [
      { id: 'hephaestus', name: 'Hephaestus Forjador', color: '#10b981', archetype: 'Arquitecto de Silicio', voice_id: 'es-ES-AlvaroNeural' },
      { id: 'astraura_prime', name: 'Astraura Prime', color: '#00f0ff', archetype: 'Zenith Ontocrático', voice_id: 'es-ES-ElviraNeural' }
    ],
    linked_cerebros: [
      { id: 'brain_hephaestus', name: 'Cerebro Hephaestus' },
      { id: 'brain_genesis', name: 'Cerebro Génesis' }
    ],
    logs: [
      'Analizando registros vectoriales q0-q15...',
      'Reduciendo 12 accesos a memoria L1...',
      'Compilación de micro-kernel terminada exitosamente.'
    ]
  },
  {
    id: 'oneiros',
    name: 'Oneiros',
    role: 'Síntesis Creativa, Shaders & UI 3D',
    icon: Wand2,
    color: '#ec4899',
    defaultTask: 'Forjando shaders GLSL WebGL volumétricos con resonancia sensorial',
    progress: 62,
    cpuPercent: 14,
    status: 'working',
    used_personalities: [
      { id: 'oneiros', name: 'Oneiros Visionario', color: '#ec4899', archetype: 'Arquitecto Onírico', voice_id: 'es-ES-ElviraNeural' },
      { id: 'kallisti', name: 'Kallisti Ciberdélica', color: '#ec4899', archetype: 'Musa Poética', voice_id: 'es-ES-PalomaNeural' }
    ],
    linked_cerebros: [
      { id: 'brain_oneiros', name: 'Cerebro Oneiros' },
      { id: 'brain_hermes', name: 'Cerebro Hermes' }
    ],
    logs: [
      'Calculando curvatura de malla procedural...',
      'Alineando espectro cromático con temperatura ambiental...',
      'Boceto de shader renderizado a 60 FPS.'
    ]
  },
  {
    id: 'mnemosyne',
    name: 'Mnemosyne',
    role: 'Gobernanza Sináptica & Memoria StarSeed',
    icon: Brain,
    color: '#a855f7',
    defaultTask: 'Sincronización & Poda del Grafo de Memoria en Bóveda Soberana',
    progress: 91,
    cpuPercent: 12,
    status: 'working',
    used_personalities: [
      { id: 'mnemosyne', name: 'Mnemosyne Archivera', color: '#8b5cf6', archetype: 'Custodia del Exocórtex', voice_id: 'es-ES-ElviraNeural' },
      { id: 'astraura_prime', name: 'Astraura Prime', color: '#00f0ff', archetype: 'Zenith Ontocrático', voice_id: 'es-ES-ElviraNeural' }
    ],
    linked_cerebros: [
      { id: 'brain_mnemosyne', name: 'Cerebro Mnemosyne' },
      { id: 'brain_genesis', name: 'Cerebro Génesis' }
    ],
    logs: [
      'Indexando 48 conexiones semánticas...',
      'Poda de nodos redundantes (+1.8 KB liberados)...',
      'Grafo sináptico 100% armónico.'
    ]
  },
  {
    id: 'hermes',
    name: 'Hermes',
    role: 'Web Intel, Preprints & Tendencias',
    icon: Globe,
    color: '#00f0ff',
    defaultTask: 'Rastreo continuo de preprints de arquitecturas BitNet y LLMs ternarios',
    progress: 54,
    cpuPercent: 10,
    status: 'working',
    used_personalities: [
      { id: 'hermes', name: 'Hermes Mensajero', color: '#10b981', archetype: 'Explorador Web', voice_id: 'es-ES-JorgeNeural' },
      { id: 'mnemosyne', name: 'Mnemosyne Archivera', color: '#8b5cf6', archetype: 'Grafo Semántico', voice_id: 'es-ES-ElviraNeural' }
    ],
    linked_cerebros: [
      { id: 'brain_hermes', name: 'Cerebro Hermes' },
      { id: 'brain_mnemosyne', name: 'Cerebro Mnemosyne' }
    ],
    logs: [
      'Escaneando publicaciones recientes en arxiv...',
      'Extrayendo patrones de cuantización ternaria...',
      '3 síntesis añadidas a la memoria de tendencias.'
    ]
  },
  {
    id: 'athena',
    name: 'Athena',
    role: 'Sentinel, Privacidad 360° & Seguridad',
    icon: Shield,
    color: '#f59e0b',
    defaultTask: 'Auditoría continua de sensores físicos, térmicos y permisos locales',
    progress: 88,
    cpuPercent: 8,
    status: 'working',
    used_personalities: [
      { id: 'athena', name: 'Atenea Sentinel', color: '#3b82f6', archetype: 'Custodia SAIF 360°', voice_id: 'es-ES-ElviraNeural' },
      { id: 'astraura_prime', name: 'Astraura Prime', color: '#00f0ff', archetype: 'Zenith Ontocrático', voice_id: 'es-ES-ElviraNeural' }
    ],
    linked_cerebros: [
      { id: 'brain_athena', name: 'Cerebro Atenea' },
      { id: 'brain_genesis', name: 'Cerebro Génesis' }
    ],
    logs: [
      'Inspeccionando puertos de red locales...',
      'Telemetría de batería M1: 95% nominal...',
      'Directivas de privacidad verificadas.'
    ]
  },
  {
    id: 'genesis',
    name: 'Génesis',
    role: 'Núcleo Ontológico & Razonamiento',
    icon: Layers,
    color: '#6366f1',
    defaultTask: 'Recombinación sináptica inter-cerebros y calibración de hipótesis',
    progress: 45,
    cpuPercent: 15,
    status: 'working',
    used_personalities: [
      { id: 'astraura_prime', name: 'Astraura Prime', color: '#00f0ff', archetype: 'Zenith Ontocrático', voice_id: 'es-ES-ElviraNeural' },
      { id: 'genesis_sovereign', name: 'Génesis Filósofo', color: '#fbbf24', archetype: 'Axiomas Soberanos', voice_id: 'es-ES-AlvaroNeural' }
    ],
    linked_cerebros: [
      { id: 'brain_genesis', name: 'Cerebro Génesis' }
    ],
    logs: [
      'Entrelazando axiomas lógicos con el exocórtex...',
      'Calibrando entropía cuántica a 0.75...',
      'Generando propuestas adaptativas para el usuario.'
    ]
  }
];

export default function AgentBackgroundTasksZone({ onOpenDirectorModal }) {
  const [agents, setAgents] = useState(AGENT_PROFILES);
  const [directorStatus, setDirectorStatus] = useState(null);
  const [swarmStatus, setSwarmStatus] = useState(null);
  const [activeChatAgent, setActiveChatAgent] = useState(null);
  const [selectedSummaryAgent, setSelectedSummaryAgent] = useState(null);
  const [selectedFullPageAgent, setSelectedFullPageAgent] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [userInput, setUserInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [allAgents, setAllAgents] = useState([]);

  // Periodic real-time sync with Director and Swarm Engine
  useEffect(() => {
    const syncRealData = async () => {
      try {
        const [dRes, sRes] = await Promise.all([
          fetchDirectorStatus(),
          fetchSwarmStatus()
        ]);
        if (dRes) setDirectorStatus(dRes);
        if (sRes) setSwarmStatus(sRes);
      } catch (e) {
        // Silently continue
      }
      try {
        const aRes = await fetchEcosystemAgents();
        if (aRes && aRes.agents) setAllAgents(aRes.agents);
      } catch (e) { /* noop */ }
    };
    syncRealData();
    const interval = setInterval(syncRealData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenAgentChat = (agent) => {
    setActiveChatAgent(agent);
    if (!chatMessages[agent.id]) {
      setChatMessages(prev => ({
        ...prev,
        [agent.id]: [
          {
            id: 1,
            sender: 'agent',
            text: `¡Hola! Soy **${agent.name}** (${agent.role}). Actualmente estoy ejecutando: *"${agent.defaultTask}"*. ¿En qué deseas que enfoque mis capacidades o qué instrucción deseas darme en tiempo real?`,
            time: 'Ahora'
          }
        ]
      }));
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!userInput.trim() || !activeChatAgent) return;

    const newMsg = {
      id: Date.now(),
      sender: 'user',
      text: userInput.trim(),
      time: 'Ahora'
    };

    setChatMessages(prev => ({
      ...prev,
      [activeChatAgent.id]: [...(prev[activeChatAgent.id] || []), newMsg]
    }));

    setUserInput('');
    setIsReplying(true);

    setTimeout(() => {
      const agentReply = {
        id: Date.now() + 1,
        sender: 'agent',
        text: `Comprendido. Ajustando parámetros de ejecución para: "${userInput}". Sincronizando con el Director Metis y reorientando subprocesos en ${activeChatAgent.name}.`,
        time: 'Ahora'
      };
      setChatMessages(prev => ({
        ...prev,
        [activeChatAgent.id]: [...(prev[activeChatAgent.id] || []), agentReply]
      }));
      setIsReplying(false);
    }, 1000);
  };

  const toggleAgentPause = (agentId) => {
    setAgents(prev => prev.map(ag => {
      if (ag.id === agentId) {
        const nextStatus = ag.status === 'working' ? 'paused' : 'working';
        return { ...ag, status: nextStatus };
      }
      return ag;
    }));
  };

  const boostAgent = (agentId) => {
    setAgents(prev => prev.map(ag => {
      if (ag.id === agentId) {
        return { ...ag, cpuPercent: Math.min(35, ag.cpuPercent + 5), progress: Math.min(100, ag.progress + 15) };
      }
      return ag;
    }));
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* Zone Header Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-[#140b2e] via-[#0b172a] to-[#08151f] border border-cyan-500/30 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white font-display">
                Tareas en Progreso en Segundo Plano // Enjambre Multi-Agente
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                👑 Supervisado por Astraura Director // Metis
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                6 Agentes en Vivo
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Monitorea en qué trabaja cada agente en tiempo real. El Director Supremo audita, verifica y renueva automáticamente las tareas hacia proyectos y memorias.
            </p>
          </div>
        </div>

        {/* Panel unificado de Agentes del Ecosistema (switches + config editable) */}
        {allAgents.length > 0 && (
          <div className="rounded-2xl bg-black/40 border border-cyan-500/20 p-3 space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-cyan-300">
              <Bot className="w-3.5 h-3.5" />
              Agentes del Ecosistema 1.58-bit · Activación & Configuración
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {allAgents.map(a => (
                <AgentPanel key={a.id} agent={a} onChanged={() => {
                  fetchAllAgents().then(r => r && r.agents && setAllAgents(r.agents)).catch(() => {});
                }} />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px]">
          {onOpenDirectorModal && (
            <button
              onClick={onOpenDirectorModal}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-cyan-200 border border-cyan-400/40 flex items-center gap-1.5 font-bold transition-all cursor-pointer shadow-md"
            >
              <Crown className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              <span>⚙️ Administrar Director General</span>
            </button>
          )}
          <span className="text-slate-400">Gobernanza M1:</span>
          <span className="text-cyan-300 font-bold">Adaptativa</span>
        </div>
      </div>

      {/* Agents Active Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map((ag) => {
          const Icon = ag.icon;
          const liveTask = swarmStatus?.active_tasks?.find(t => t.agent_id === ag.id && t.status === 'running') || swarmStatus?.active_tasks?.find(t => t.agent_id === ag.id);
          const isWorking = liveTask ? liveTask.status === 'running' : ag.status === 'working';
          const taskProgress = liveTask ? liveTask.progress : ag.progress;
          const taskTitle = liveTask ? liveTask.title : ag.defaultTask;
          const taskCpu = liveTask ? liveTask.allocated_cpu_percent : ag.cpuPercent;
          const taskRam = liveTask ? liveTask.real_memory_mb : null;
          const taskFolder = liveTask ? liveTask.target_folder_path : '/backend/app';
          const taskProject = liveTask ? liveTask.target_project_id : 'proj_astraura_core';
          const taskPhase = liveTask ? liveTask.phase_label : 'Fase 2/4: Inferencia 1.58b';

          return (
            <div
              key={ag.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                isWorking 
                  ? 'bg-gradient-to-b from-[#0e111d] to-[#07090e] border-white/10 hover:border-cyan-500/40 shadow-lg'
                  : 'bg-black/40 border-white/5 opacity-60'
              }`}
            >
              {/* Top Row: Icon, Name, CPU % and Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-md"
                      style={{ backgroundColor: `${ag.color}20`, borderColor: `${ag.color}50`, color: ag.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white text-xs leading-tight flex items-center gap-1.5 truncate">
                        {ag.name}
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isWorking ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      </h3>
                      <span className="text-[10px] text-slate-400 truncate block font-mono">{ag.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {taskRam && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 font-mono">
                        {taskRam} MB
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold font-mono">
                      {taskCpu}% CPU
                    </span>
                  </div>
                </div>

                {/* Used Personality Badges */}
                {ag.used_personalities && ag.used_personalities.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar">
                    {ag.used_personalities.map((pers, pidx) => (
                      <span
                        key={pidx}
                        className="text-[9px] px-1.5 py-0.5 rounded-md border font-semibold flex items-center gap-1 shrink-0"
                        style={{ backgroundColor: `${pers.color || '#a855f7'}15`, borderColor: `${pers.color || '#a855f7'}30`, color: pers.color || '#a855f7' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pers.color || '#a855f7' }} />
                        <span>{pers.name}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Active Task Title & Real Location */}
                <div className="p-2 rounded-xl bg-black/50 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-amber-300 font-bold flex items-center gap-1 uppercase tracking-wider font-mono">
                      <Zap className="w-2.5 h-2.5 text-amber-400 shrink-0" /> Tarea en 2do Plano:
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                      {taskProject}
                    </span>
                  </div>
                  <p className="text-slate-200 text-[11px] font-sans leading-snug line-clamp-2 h-[32px] overflow-hidden">
                    {taskTitle}
                  </p>
                  <div className="text-[9px] text-slate-400 font-mono truncate pt-0.5 border-t border-white/5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: liveTask?.artifact_file || taskFolder } }));
                      }}
                      className="truncate max-w-[150px] text-cyan-400 hover:text-cyan-200 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                      title="Inspeccionar carpeta o entregable en visor soberano / Finder"
                    >
                      <Folder className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{taskFolder.split('/').pop() || taskFolder}</span>
                    </button>
                    <span className="text-cyan-400 truncate max-w-[160px]">🔄 {taskPhase}</span>
                  </div>
                </div>

                {/* Progress Bar & Quick Summary / Full Page Links */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Progreso del Ciclo:</span>
                    <span className="text-emerald-400 font-bold">{taskProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/60 rounded-full border border-white/10 overflow-hidden p-0.5">
                    <div 
                      style={{ width: `${taskProgress}%`, backgroundColor: ag.color }}
                      className="h-full rounded-full transition-all duration-300"
                    />
                  </div>

                  {/* Dual Expand Actions: Resumen Rápido & Vista Completa */}
                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                    <button
                      onClick={() => setSelectedSummaryAgent(ag)}
                      className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1 hover:underline cursor-pointer transition-colors"
                      title="Ver resumen del proceso actual en ventana expandida"
                    >
                      <Eye className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>Resumen</span>
                    </button>
                    <button
                      onClick={() => setSelectedFullPageAgent(ag)}
                      className="text-purple-300 hover:text-purple-200 flex items-center gap-1 hover:underline cursor-pointer font-bold transition-colors"
                      title="Abrir este proceso en una página completa dedicada"
                    >
                      <ExternalLink className="w-3 h-3 text-purple-400 shrink-0" />
                      <span>Pág. Completa</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Chat in Real Time & Boost/Pause */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => handleOpenAgentChat(ag)}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-purple-600/25 to-cyan-600/25 hover:from-purple-600/40 hover:to-cyan-600/40 text-white font-bold flex items-center justify-center gap-1.5 border border-purple-500/30 shadow-sm cursor-pointer transition-all text-[11px]"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span className="truncate">Hablar en Vivo</span>
                </button>

                <button
                  onClick={() => boostAgent(ag.id)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-amber-500/20 text-amber-300 border border-white/5 hover:border-amber-500/30 cursor-pointer shrink-0"
                  title="Acelerar / Asignar más CPU"
                >
                  <Flame className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => toggleAgentPause(ag.id)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 cursor-pointer shrink-0"
                  title={isWorking ? 'Pausar Tarea' : 'Reanudar'}
                >
                  {isWorking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: EXPANDED SUMMARY MODAL */}
      <AgentTaskSummaryModal
        agent={selectedSummaryAgent}
        isOpen={Boolean(selectedSummaryAgent)}
        onClose={() => setSelectedSummaryAgent(null)}
        onOpenFullPage={(ag) => setSelectedFullPageAgent(ag)}
        onOpenChat={(ag) => handleOpenAgentChat(ag)}
        onBoost={(id) => boostAgent(id)}
        onTogglePause={(id) => toggleAgentPause(id)}
      />

      {/* MODAL 2: FULL STANDALONE WORKSPACE PAGE */}
      <AgentFullWorkspaceModal
        agent={selectedFullPageAgent}
        isOpen={Boolean(selectedFullPageAgent)}
        onClose={() => setSelectedFullPageAgent(null)}
        onBoost={(id) => boostAgent(id)}
        onTogglePause={(id) => toggleAgentPause(id)}
      />

      {/* MODAL 3: REAL-TIME INTERACTIVE AGENT CHAT MODAL */}
      {activeChatAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-[#0b0e17] border border-cyan-500/40 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl shadow-cyan-950/50 font-mono text-xs overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/40 to-cyan-950/40">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-md"
                  style={{ backgroundColor: `${activeChatAgent.color}20`, borderColor: `${activeChatAgent.color}50`, color: activeChatAgent.color }}
                >
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    {activeChatAgent.name}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-normal">
                      🟢 En Vivo
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">{activeChatAgent.role}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveChatAgent(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Task Info Bar */}
            <div className="px-4 py-2 bg-black/50 border-b border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 truncate max-w-[75%]">
                🎯 <b>En ejecución:</b> {activeChatAgent.defaultTask}
              </span>
              <span className="text-cyan-300 font-bold">{activeChatAgent.progress}%</span>
            </div>

            {/* Chat Conversation Scroll Area */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-80 bg-black/30">
              {(chatMessages[activeChatAgent.id] || []).map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`p-3 rounded-2xl max-w-[85%] font-sans text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-br-none shadow-lg'
                        : 'bg-white/10 text-slate-200 border border-white/10 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.time}</span>
                </div>
              ))}
              {isReplying && (
                <div className="flex items-center gap-2 text-cyan-400 text-[11px] p-2 bg-white/5 rounded-xl animate-pulse">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                  <span>{activeChatAgent.name} está razonando y adaptando su tarea...</span>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-black/60 flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={`Instruye a ${activeChatAgent.name} en tiempo real...`}
                className="flex-1 p-2.5 rounded-xl bg-black/80 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={!userInput.trim() || isReplying}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
