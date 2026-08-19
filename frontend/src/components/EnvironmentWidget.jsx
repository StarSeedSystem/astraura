import React, { useState } from 'react';
import { 
  Battery, 
  BatteryCharging, 
  Activity, 
  FolderGit2, 
  Sparkles, 
  Brain, 
  Users, 
  ListTodo, 
  Cpu, 
  ChevronRight, 
  SlidersHorizontal,
  Zap 
} from 'lucide-react';
import BrainSynapseHubModal from './BrainSynapseHubModal';

export default function EnvironmentWidget({ 
  envData,
  activeBrainId = 'brain_genesis',
  onSelectBrain,
  swarmData,
  dreamData,
  activePersona
}) {
  const [isHubOpen, setIsHubOpen] = useState(false);

  if (!envData) return null;

  const battery = envData.battery || {};
  const load = envData.system_load || {};
  const ws = envData.workspace || {};
  const behavior = envData.behavioral_state || {};
  const activeAgentsCount = swarmData?.agents?.filter(a => a.status === 'active')?.length || 6;
  const subagentsCount = swarmData?.subagents?.length || 3;

  return (
    <div className="p-3.5 rounded-2xl glass-panel border-white/10 space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          Sensores del Entorno
        </h4>
        <span className="text-[10px] font-mono text-slate-400">
          {envData.time_formatted ? envData.time_formatted.split(' ')[1] : ''}
        </span>
      </div>

      {/* Live GPS Location & Weather Mini-Chip */}
      {envData.location && (
        <div className="p-2 rounded-xl bg-gradient-to-r from-cyan-950/30 to-purple-950/20 border border-cyan-500/20 flex items-center justify-between text-[10px] font-mono">
          <span className="text-cyan-300 flex items-center gap-1 font-bold truncate max-w-[170px]">
            📍 {envData.location.city || 'Ubicación'}, {envData.location.country || ''}
          </span>
          <span className="text-amber-300 font-bold shrink-0">
            {envData.weather?.temperature_c || 24.5}°C ☀️
          </span>
        </div>
      )}

      {/* Battery & Energy Status */}
      <div className="p-2 rounded-xl bg-white/5 border border-white/5 space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
            {battery.is_charging ? (
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            ) : (
              <Battery className="w-3.5 h-3.5 text-amber-400" />
            )}
            Batería
          </span>
          <span className="font-mono font-bold text-white text-[11px]">
            {battery.percent}% {battery.is_charging ? '(CA)' : ''}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              battery.percent > 50 ? 'bg-emerald-500' : battery.percent > 20 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${battery.percent}%` }}
          />
        </div>
      </div>

      {/* System Load Mini-Stats */}
      <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
        <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
          <span className="text-slate-400 block text-[9px]">CPU LOAD</span>
          <span className="font-bold text-white text-[11px]">{load.cpu_percent || 0}%</span>
        </div>
        <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
          <span className="text-slate-400 block text-[9px]">RAM USO</span>
          <span className="font-bold text-white text-[11px]">{load.ram_percent || 0}%</span>
        </div>
      </div>

      {/* REPLACED CORNER BUTTON: BRAIN SELECTOR & NEURON PERSONALITY / SWARM / TASKS HUB */}
      <div 
        onClick={() => setIsHubOpen(true)}
        className="p-2.5 rounded-xl bg-gradient-to-r from-purple-950/40 via-cyan-950/30 to-black border border-purple-500/30 hover:border-cyan-400/50 transition-all cursor-pointer group shadow-lg shadow-purple-950/20 space-y-1.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform shrink-0">
              <Brain className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-white block leading-tight group-hover:text-cyan-300 transition-colors truncate">
                Cerebro & Sinapsis
              </span>
              <span className="text-[9px] text-purple-300 font-mono block truncate">
                {activePersona?.name ? `Neurona: ${activePersona.name}` : '6 Neuronas Activas'}
              </span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Live Status Indicators */}
        <div className="grid grid-cols-2 gap-1 pt-1 border-t border-white/5 text-[9px] font-mono">
          <div className="flex items-center gap-1 text-cyan-300 truncate">
            <Users className="w-3 h-3 shrink-0" />
            <span className="truncate">{activeAgentsCount} Agentes</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-300 truncate">
            <Cpu className="w-3 h-3 shrink-0" />
            <span className="truncate">{subagentsCount} Daemons</span>
          </div>
        </div>

        {/* Behavioral Directive Insight */}
        {behavior.directive && (
          <p className="text-[9px] text-slate-400 italic truncate border-t border-white/5 pt-1">
            "{behavior.directive}"
          </p>
        )}
      </div>

      {/* Full Brain Synapse, Swarm Processes & Task Hub Modal */}
      <BrainSynapseHubModal
        isOpen={isHubOpen}
        onClose={() => setIsHubOpen(false)}
        activeBrainId={activeBrainId}
        onSelectBrain={onSelectBrain || (() => {})}
        swarmData={swarmData}
        dreamData={dreamData}
      />
    </div>
  );
}
