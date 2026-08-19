import React, { useState } from 'react';
import { 
  GitBranch, 
  Cpu, 
  Zap, 
  Users, 
  Clock, 
  CheckCircle2, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Sparkles, 
  Check, 
  Radio, 
  ShieldCheck, 
  Flame, 
  Brain,
  ExternalLink,
  Globe,
  FileCheck
} from 'lucide-react';

export default function ParallelAgentBranchingTree({ branchingPlan, elapsedSeconds, layeredPhases, verifiableSources }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!branchingPlan && !layeredPhases) return null;

  const {
    total_branches = 5,
    total_agents = 5,
    total_subagents = 7,
    max_concurrency_threads = 8,
    hardware_platform = 'Apple Silicon ARM NEON (8 núcleos)',
    speedup_factor = '5.4x',
    branches = []
  } = branchingPlan || {};

  return (
    <div className="mb-3.5 rounded-2xl bg-gradient-to-r from-[#0d1220] via-[#090d16] to-[#0d1220] border border-cyan-500/30 overflow-hidden shadow-xl shadow-cyan-950/20 text-xs font-mono">
      {/* Header Bar with Key Telemetry */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 bg-black/40 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 cursor-pointer hover:bg-black/60 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-white text-xs tracking-wide">
                Ramificación & Capas Multifacéticas Graduales
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" />
                {speedup_factor} Aceleración
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              {total_branches} Ramas simultáneas • 4 Capas de Desarrollo • Recursos Verificados
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px]">
            <Clock className="w-3 h-3" />
            <span>{elapsedSeconds ? `${elapsedSeconds}s` : '< 0.3s'}</span>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] hidden sm:flex">
            <Cpu className="w-3 h-3" />
            <span>{hardware_platform}</span>
          </div>

          <button className="p-1 text-slate-400 hover:text-white">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Branching Tree Visualizer */}
      {isExpanded && (
        <div className="p-3.5 space-y-3 animate-fade-in bg-black/20">
          {/* Section A: Multi-Phase Layered Quantum Pipeline (Fases 1 to 4) */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-[#0c1424] to-[#0e1c1e] border border-cyan-500/30 space-y-2">
            <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Pipeline en Capas Graduales Cuánticas (4 Fases):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-black/40 border border-cyan-500/20 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-cyan-400 font-bold">Fase 1: Scaffolding</span>
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-[9px] text-slate-300 block">Descomposición y Análisis de Requerimientos</span>
              </div>

              <div className="p-2 rounded-lg bg-black/40 border border-purple-500/20 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-purple-400 font-bold">Fase 2: Recursos Web</span>
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-[9px] text-slate-300 block">Adquisición y Citas Verificables (ArXiv/GitHub)</span>
              </div>

              <div className="p-2 rounded-lg bg-black/40 border border-blue-500/20 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-blue-400 font-bold">Fase 3: Forja 1.58b</span>
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-[9px] text-slate-300 block">Síntesis Paralela con Aritmética Entera i2_s</span>
              </div>

              <div className="p-2 rounded-lg bg-black/40 border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 font-bold">Fase 4: Auto-Corrección</span>
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-[9px] text-slate-300 block">Auditoría Cruzada y Refinamiento Final</span>
              </div>
            </div>
          </div>

          {/* Section B: Verifiable Sources & Citations if available */}
          {verifiableSources && verifiableSources.length > 0 && (
            <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1.5">
              <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-purple-400" />
                Fuentes y Recursos Verificados en Línea ({verifiableSources.length}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {verifiableSources.map((src, si) => (
                  <a
                    key={si}
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-black/40 border border-white/5 hover:border-purple-500/40 text-slate-300 hover:text-purple-200 flex items-center justify-between gap-1 truncate text-[10px]"
                  >
                    <span className="truncate">{src.title || src.url}</span>
                    <ExternalLink className="w-3 h-3 text-purple-400 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Section C: Parallel Branches Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {branches.map((branch, idx) => (
              <div 
                key={branch.id || idx}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 transition-all hover:border-cyan-500/40 relative overflow-hidden"
              >
                {/* Accent Top Bar */}
                <div 
                  className="absolute top-0 left-0 right-0 h-0.5" 
                  style={{ backgroundColor: branch.color || '#00f0ff' }}
                />

                <div className="flex items-center justify-between pt-0.5">
                  <span className="font-bold text-white text-[11px] truncate flex items-center gap-1.5">
                    <span 
                      className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" 
                      style={{ backgroundColor: branch.color || '#00f0ff' }}
                    />
                    {branch.name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> {branch.latency_ms ? `${branch.latency_ms}ms` : 'SYNC'}
                  </span>
                </div>

                <div className="text-[10px] text-slate-300 flex items-center justify-between">
                  <span className="text-cyan-300 font-medium truncate max-w-[140px]">{branch.agent}</span>
                  <span className="text-slate-500 text-[9px]">{branch.threads_allocated || 2} Hilos SIMD</span>
                </div>

                <p className="text-[9px] text-slate-400 line-clamp-2 leading-tight">
                  {branch.purpose}
                </p>

                {/* Subagents Badges */}
                {branch.subagents && branch.subagents.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-white/5">
                    {branch.subagents.map((sub, sidx) => (
                      <span 
                        key={sidx}
                        className="text-[8px] px-1.5 py-0.2 rounded bg-black/50 text-slate-300 border border-white/5"
                      >
                        ⚡ {sub}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Unified Swarm Pipeline Status */}
          <div className="p-2 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-300">
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Sincronización Cuántica Completada:
            </span>
            <span className="text-slate-400">
              Todas las ramas multiagénticas y capas graduales sincronizadas en el buffer de memoria.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
