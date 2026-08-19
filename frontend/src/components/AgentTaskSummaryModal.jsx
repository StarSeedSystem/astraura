import React from 'react';
import {
  Bot,
  Cpu,
  Activity,
  Zap,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Pause,
  Play,
  X,
  MessageSquare,
  Sparkles,
  Layers,
  Terminal,
  FolderTree
} from 'lucide-react';

export default function AgentTaskSummaryModal({
  agent,
  isOpen,
  onClose,
  onOpenFullPage,
  onOpenChat,
  onBoost,
  onTogglePause
}) {
  if (!isOpen || !agent) return null;

  const Icon = agent.icon || Bot;
  const isWorking = agent.status === 'working';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-[#0b0e17] border border-cyan-500/40 rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl shadow-cyan-950/60 font-mono text-xs overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/40 to-cyan-950/40">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-md"
              style={{ backgroundColor: `${agent.color}20`, borderColor: `${agent.color}50`, color: agent.color }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Resumen del Proceso: {agent.name}
              </h3>
              <p className="text-[11px] text-slate-400">
                {agent.role}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onClose();
                onOpenFullPage?.(agent);
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold flex items-center gap-1.5 cursor-pointer text-[11px]"
              title="Abrir este proceso en una página completa"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Página Completa</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh] custom-scrollbar">
          
          {/* Active Process Hero Box */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-400" /> Tarea en Segundo Plano Activa
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/30">
                {agent.cpuPercent}% CPU M1
              </span>
            </div>
            <p className="text-sm font-sans text-white font-semibold leading-relaxed">
              {agent.defaultTask}
            </p>
          </div>

          {/* Used Personalities */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-purple-500/20 space-y-2">
            <span className="text-purple-300 font-bold text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Personalidades & Arquetipos en Uso
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(agent.used_personalities || [
                { id: agent.id, name: agent.name, color: agent.color, archetype: agent.role }
              ]).map((pers, pIdx) => (
                <span
                  key={pIdx}
                  className="px-2.5 py-1 rounded-xl border font-bold flex items-center gap-1.5 text-[11px]"
                  style={{ backgroundColor: `${pers.color || '#a855f7'}15`, borderColor: `${pers.color || '#a855f7'}40`, color: pers.color || '#a855f7' }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pers.color || '#a855f7' }} />
                  <span>{pers.name}</span>
                  <span className="text-[9px] opacity-70 font-mono">({pers.archetype || 'Personalidad'})</span>
                </span>
              ))}
            </div>
          </div>

          {/* Progress & Telemetry */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-bold">Progreso de Síntesis del Ciclo:</span>
              <span className="text-emerald-400 font-bold">{agent.progress}%</span>
            </div>
            <div className="h-2 w-full bg-black/60 rounded-full border border-white/10 overflow-hidden p-0.5">
              <div 
                style={{ width: `${agent.progress}%`, backgroundColor: agent.color }}
                className="h-full rounded-full transition-all duration-300"
              />
            </div>
          </div>

          {/* Step Breakdown */}
          <div className="space-y-2">
            <span className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Fases del Proceso Actual
            </span>
            <div className="space-y-1.5 text-[11px]">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-200">
                <span>1. Extracción de Nodos & Contexto Sensorial</span>
                <span className="font-bold">✓ Completado</span>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-cyan-200">
                <span>2. Paralelización ARM64 NEON & Síntesis Ternaria 1.58b</span>
                <span className="font-bold animate-pulse">⚡ En Curso ({agent.progress}%)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-slate-400">
                <span>3. Sincronización con Grafo StarSeed & Exocórtex</span>
                <span>⏳ En Cola</span>
              </div>
            </div>
          </div>

          {/* Recent Logs Snippet */}
          <div className="space-y-2">
            <span className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Registros Recientes en Bucle
            </span>
            <div className="p-3 rounded-xl bg-black/60 border border-white/5 text-[11px] text-slate-300 space-y-1 font-mono">
              {(agent.logs || []).map((l, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-cyan-400">❯</span>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBoost?.(agent.id)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1 cursor-pointer text-xs"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Acelerar CPU</span>
            </button>

            <button
              onClick={() => onTogglePause?.(agent.id)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold flex items-center gap-1 cursor-pointer border border-white/5 text-xs"
            >
              {isWorking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isWorking ? 'Pausar' : 'Reanudar'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenChat?.(agent);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 font-bold flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Hablar en Vivo</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenFullPage?.(agent);
              }}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer text-xs shadow-md"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Página Completa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
