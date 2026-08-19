import React, { useState, useEffect } from 'react';
import {
  Bot,
  Cpu,
  Activity,
  Layers,
  FileCode,
  FolderTree,
  Terminal,
  Send,
  Sparkles,
  Sliders,
  Flame,
  Pause,
  Play,
  CheckCircle2,
  Clock,
  ExternalLink,
  ArrowLeft,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  GitBranch,
  ShieldCheck,
  Brain,
  Code2,
  MessageSquare,
  Volume2,
  User
} from 'lucide-react';
import { omniVoice } from '../services/omniVoice';

export default function AgentFullWorkspaceModal({
  agent,
  isOpen,
  onClose,
  onBoost,
  onTogglePause
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'files', 'synapses', 'logs', 'chat'
  const [agentLogs, setAgentLogs] = useState(agent?.logs || []);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'system', text: `Conexión neuronal directa con ${agent?.name || 'Agente'} establecida bajo kernel 1.58-Bit.`, time: '15:28:00' },
    { id: 2, sender: 'agent', text: `Hola Alex. Estoy ejecutando activamente: "${agent?.defaultTask}". ¿Deseas ajustar mis directivas o priorizar un archivo en específico?`, time: '15:28:02' }
  ]);
  const [isReplying, setIsReplying] = useState(false);
  const [cpuThrottle, setCpuThrottle] = useState(agent?.cpuPercent || 15);

  if (!isOpen || !agent) return null;

  const Icon = agent.icon || Bot;
  const isWorking = agent.status === 'working';

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || isReplying) return;

    const userText = chatInput.trim();
    setChatInput('');

    const newMsg = { id: Date.now(), sender: 'user', text: userText, time: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, newMsg]);
    setIsReplying(true);

    setTimeout(() => {
      let replyText = `[${agent.name}] Directiva incorporada a mi bucle de ejecución. Sincronizando grafo sináptico y reorientando prioridades hacia "${userText}".`;
      if (agent.id === 'hephaestus') {
        replyText = `🛠️ [Hephaestus] Compilando vectorizaciones ARM NEON para la directiva solicitada: "${userText}". Latencia reducida a 0.8ms.`;
      } else if (agent.id === 'oneiros') {
        replyText = `🎨 [Oneiros] Generando variantes visuales y shaders procedurales en 3D para "${userText}".`;
      } else if (agent.id === 'mnemosyne') {
        replyText = `🌌 [Mnemosyne] Entrelazando el concepto "${userText}" con las 48 memorias nucleares de StarSeed.`;
      }

      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'agent', text: replyText, time: new Date().toLocaleTimeString() }
      ]);
      setAgentLogs(prev => [
        `[${new Date().toLocaleTimeString()}] [Guía Usuario] Directiva ejecutada: "${userText}"`,
        ...prev
      ]);
      setIsReplying(false);
    }, 1100);
  };

  const handleSimulateStep = () => {
    setAgentLogs(prev => [
      `[${new Date().toLocaleTimeString()}] [Kernel 1.58b] Paso completado con éxito (Loss: 0.012, Entropía: 0.75)`,
      ...prev
    ]);
  };

  // Connected Context Files
  const connectedFiles = [
    { name: 'backend/app/core/intuitive_imagination_engine.py', type: 'Python Backend', size: '64 KB', status: 'Lectura/Escritura' },
    { name: 'frontend/src/components/IntuitiveImaginationView.jsx', type: 'React Component', size: '78 KB', status: 'Activo' },
    { name: 'backend/app/core/starseed_memory_engine.py', type: 'Graph Engine', size: '42 KB', status: 'Sincronizado' },
    { name: 'local_vault/memories_sovereign_158b.json', type: 'Bóveda Soberana', size: '18 KB', status: 'Indexado' }
  ];

  // Synaptic Memory Nodes
  const connectedSynapses = [
    { title: 'Axioma de Soberanía Cognitiva 1.58b', resonance: '99%', category: 'Núcleo Ontológico' },
    { title: 'Optimización ARM64 NEON Vectorizada', resonance: '95%', category: 'Hardware M1' },
    { title: 'Entrelazamiento Sensorial Guadalajara 360°', resonance: '92%', category: 'Sensorium' },
    { title: 'Grafo de Memorias StarSeed // OpenViking', resonance: '88%', category: 'Memoria Multidimensional' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in font-sans p-2 sm:p-4">
      <div className="bg-[#080b13] border border-cyan-500/40 rounded-3xl w-full h-full max-w-7xl max-h-[96vh] flex flex-col shadow-2xl shadow-cyan-950/60 overflow-hidden font-mono text-xs">
        
        {/* Top Header Bar */}
        <header className="p-4 border-b border-white/10 bg-gradient-to-r from-[#140b2e] via-[#09152b] to-[#07131b] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 cursor-pointer transition-all text-xs"
              title="Regresar a Astraura"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Regresar</span>
            </button>

            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg shrink-0"
              style={{ backgroundColor: `${agent.color}20`, borderColor: `${agent.color}50`, color: agent.color }}
            >
              <Icon className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white font-display flex items-center gap-2">
                  {agent.name} // Vista de Proceso en Página Completa
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isWorking ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {isWorking ? '🟢 En Ejecución Autónoma' : '⏸️ En Pausa'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {agent.role} • Núcleos M1 Apple Silicon
              </p>
            </div>
          </div>

          {/* Quick Controls on Header */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBoost?.(agent.id)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1.5 cursor-pointer"
              title="Asignar más prioridad de CPU M1"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Acelerar ({agent.cpuPercent}% CPU)</span>
            </button>

            <button
              onClick={() => onTogglePause?.(agent.id)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold flex items-center gap-1.5 cursor-pointer border border-white/5"
            >
              {isWorking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isWorking ? 'Pausar' : 'Reanudar'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Studio Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden min-h-0">
          
          {/* Left Column: Telemetry, Hardware M1 & Linked Files (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
            
            {/* Active Task Card */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2.5">
              <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-400" /> Tarea en Segundo Plano:
              </span>
              <p className="text-sm font-sans text-white leading-relaxed font-semibold">
                {agent.defaultTask}
              </p>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Progreso del Ciclo Actual:</span>
                  <span className="text-emerald-400 font-bold">{agent.progress}%</span>
                </div>
                <div className="h-2 w-full bg-black/80 rounded-full border border-white/10 overflow-hidden p-0.5">
                  <div 
                    style={{ width: `${agent.progress}%`, backgroundColor: agent.color }}
                    className="h-full rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            {/* Hardware & M1 Silicon Throttle */}
            <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Asignación de Hardware M1
                </span>
                <span className="text-cyan-300 font-bold">{cpuThrottle}% CPU</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="5"
                value={cpuThrottle}
                onChange={(e) => setCpuThrottle(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-slate-300">
                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-slate-400 block">Arquitectura:</span>
                  <b>ARM64 NEON SIMD</b>
                </div>
                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-slate-400 block">Cuantización:</span>
                  <b>Ternaria 1.58b</b>
                </div>
              </div>
            </div>

            {/* Connected Context Files & Folders */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 flex-1">
              <span className="font-bold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
                <FolderTree className="w-3.5 h-3.5 text-purple-400" /> Archivos & Folders de Contexto ({connectedFiles.length})
              </span>
              <div className="space-y-1.5">
                {connectedFiles.map((file, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1 hover:border-purple-500/30 transition-all">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-200 truncate max-w-[200px]">{file.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">{file.size}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{file.type}</span>
                      <span className="text-emerald-400">{file.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center & Right Column: Logs, Synaptic Graphs, and Real-Time Chat (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-3 overflow-hidden">
            
            {/* Tab Navigation in Workspace */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
              {[
                { id: 'overview', label: 'Consola & Streaming de Logs', icon: Terminal },
                { id: 'personalities', label: 'Personalidades en Uso', icon: Sparkles },
                { id: 'synapses', label: 'Sinapsis & Memorias StarSeed (3D)', icon: Brain },
                { id: 'chat', label: 'Guía Directa & Chat con el Agente', icon: MessageSquare }
              ].map(t => {
                const TIcon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                      active 
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-md'
                        : 'text-slate-400 hover:text-white bg-white/5'
                    }`}
                  >
                    <TIcon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: LOGS CONSOLE */}
            {activeTab === 'overview' && (
              <div className="flex-1 flex flex-col p-4 rounded-2xl bg-black/70 border border-white/10 overflow-hidden space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">Salida de Ejecución & Registros en Vivo</span>
                  </div>
                  <button
                    onClick={handleSimulateStep}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 flex items-center gap-1 cursor-pointer text-[10px]"
                  >
                    <Play className="w-3 h-3" /> Disparar Paso
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-2 p-3 bg-black/60 rounded-xl border border-white/5 custom-scrollbar">
                  {agentLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-cyan-400 select-none">❯</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: PERSONALITIES & ARCHETYPES IN USE */}
            {activeTab === 'personalities' && (
              <div className="flex-1 flex flex-col p-4 rounded-2xl bg-black/70 border border-purple-500/30 overflow-hidden space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white">Personalidades & Arquetipos Adoptados por {agent.name}</span>
                  </div>
                  <span className="text-[10px] text-purple-300">Modulación OmniVoice & Matriz Afectiva</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(agent.used_personalities || [
                      { id: agent.id, name: agent.name, color: agent.color, archetype: agent.role, voice_id: 'es-ES-ElviraNeural', traits: ['ARM64 NEON', 'BitNet 1.58b', 'Soberanía'] }
                    ]).map((pers, persIdx) => (
                      <div
                        key={persIdx}
                        className="p-4 rounded-2xl border space-y-3 bg-[#0a0f1d] shadow-lg"
                        style={{ borderColor: `${pers.color || '#a855f7'}40` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center border font-bold text-xs"
                              style={{ backgroundColor: `${pers.color || '#a855f7'}20`, borderColor: `${pers.color || '#a855f7'}50`, color: pers.color || '#a855f7' }}
                            >
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-xs">{pers.name}</h4>
                              <span className="text-[10px] text-purple-300 font-mono">{pers.archetype || 'Arquetipo Activo'}</span>
                            </div>
                          </div>
                          <span
                            className="text-[9px] px-2 py-0.5 rounded-full font-bold font-mono"
                            style={{ backgroundColor: `${pers.color || '#a855f7'}20`, color: pers.color || '#a855f7' }}
                          >
                            VINCULADA
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-snug">
                          {pers.description || `Arquetipo cognitivo que modula las respuestas lógicas y la entonación auditiva de ${agent.name}.`}
                        </p>

                        <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[10px] font-mono">{pers.voice_id || 'OmniVoice 1.58b'}</span>
                          </div>
                          <button
                            onClick={() => omniVoice.speak(`Hola Alex, soy ${pers.name}, colaborando activamente en ${agent.name}.`, { voiceURI: pers.voice_id })}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Play className="w-2.5 h-2.5" />
                            Probar Voz
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/20 space-y-2">
                    <span className="text-cyan-300 font-bold text-xs flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-cyan-400" /> Resonancia en Cerebros Multidimensionales
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Este agente sincroniza su estado afectivo y directivas con los cerebros multidimensionales de Astraura, permitiendo continuidad ontocrática y auto-reflexión continua sin degradación de contexto.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SYNAPSE & MEMORY GRAPH */}
            {activeTab === 'synapses' && (
              <div className="flex-1 flex flex-col p-4 rounded-2xl bg-black/70 border border-purple-500/30 overflow-hidden space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" /> Nodos de Memoria Sináptica Vinculados
                  </span>
                  <span className="text-[10px] text-purple-300">4 Nodos en Resonancia Cuántica</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto custom-scrollbar p-1">
                  {connectedSynapses.map((syn, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/30 to-black border border-purple-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{syn.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">{syn.resonance} Resonancia</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">{syn.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: DIRECT REAL-TIME CHAT / STEERING */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col p-4 rounded-2xl bg-black/70 border border-white/10 overflow-hidden space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" /> Guía Neuronal & Chat con {agent.name}
                  </span>
                  <span className="text-[10px] text-emerald-400">🟢 Canal Bidireccional Activo</span>
                </div>

                {/* Messages Box */}
                <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-black/50 rounded-xl border border-white/5 custom-scrollbar">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`p-3 rounded-2xl max-w-[85%] font-sans text-xs leading-relaxed ${
                          m.sender === 'user'
                            ? 'bg-purple-600 text-white rounded-br-none shadow-md'
                            : m.sender === 'system'
                            ? 'bg-white/5 text-slate-400 border border-white/10 text-[11px] font-mono'
                            : 'bg-[#101726] border border-cyan-500/30 text-cyan-100 rounded-bl-none shadow-md'
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">{m.time}</span>
                    </div>
                  ))}
                  {isReplying && (
                    <div className="flex items-center gap-2 text-cyan-300 text-[11px] animate-pulse">
                      <Bot className="w-3.5 h-3.5 animate-spin" />
                      <span>{agent.name} procesando directiva...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Guía a ${agent.name} o indícale archivos y prioridades...`}
                    className="flex-1 p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-400 font-sans text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isReplying || !chatInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
