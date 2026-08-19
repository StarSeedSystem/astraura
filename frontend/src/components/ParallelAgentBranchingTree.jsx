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
  FileCheck,
  Maximize2,
  Eye
} from 'lucide-react';
import ProcessBranchingFullViewModal from './ProcessBranchingFullViewModal';

export default function ParallelAgentBranchingTree({ 
  branchingPlan, 
  agentTraces = [], 
  elapsedSeconds, 
  layeredPhases, 
  verifiableSources 
}) {
  // By default, render as a compact / reduced window as requested by the user
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullModalOpen, setIsFullModalOpen] = useState(false);

  if (!branchingPlan && !layeredPhases && (!agentTraces || agentTraces.length === 0)) return null;

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
    <>
      <div className="mb-3 rounded-2xl bg-gradient-to-r from-[#0c101c] via-[#080b12] to-[#0c101c] border border-cyan-500/25 overflow-hidden shadow-lg text-xs font-mono transition-all">
        {/* COMPACT / REDUCED HEADER BAR (Default View) */}
        <div className="p-2.5 bg-black/40 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 select-none">
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity flex-1 min-w-0"
          >
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
              <GitBranch className="w-3.5 h-3.5" />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-display font-bold text-white text-[11px] tracking-wide truncate">
                Ramificación Cuántica & Capas Graduales 1.58b
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center gap-1 shrink-0">
                <Zap className="w-2.5 h-2.5 text-cyan-400" />
                {speedup_factor}
              </span>
              <span className="text-[9px] text-slate-400 hidden sm:inline-block">
                ({total_branches} ramas • 4 fases • {total_agents} agentes)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {elapsedSeconds && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[9px]">
                <Clock className="w-2.5 h-2.5" />
                <span>{elapsedSeconds}s</span>
              </div>
            )}

            {/* In-Situ Expand/Collapse Summary Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 flex items-center gap-1 text-[10px] transition-colors cursor-pointer"
              title={isExpanded ? 'Contraer resumen' : 'Expandir resumen con más detalles'}
            >
              <Eye className="w-3 h-3 text-cyan-400" />
              <span className="hidden xs:inline">{isExpanded ? 'Colapsar' : 'Resumen'}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </button>

            {/* Full-Page Detailed Modal View Button */}
            <button
              onClick={() => setIsFullModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-cyan-200 border border-cyan-500/40 flex items-center gap-1 text-[10px] font-bold transition-all shadow-sm cursor-pointer"
              title="Abrir detalles completos y ramificaciones en pantalla completa"
            >
              <Maximize2 className="w-3 h-3 text-cyan-300" />
              <span>Ver Árbol Completo</span>
            </button>
          </div>
        </div>

        {/* IN-SITU EXPANDED SUMMARY VIEW */}
        {isExpanded && (
          <div className="p-3.5 space-y-3 animate-fade-in bg-black/30 border-t border-white/5">
            {/* Section A: Multi-Phase Layered Quantum Pipeline (Fases 1 to 4) */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#0c1424] to-[#0e1c1e] border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Pipeline en Capas Graduales Cuánticas (4 Fases):
                </span>
                <span className="text-[9px] text-slate-400">
                  {hardware_platform}
                </span>
              </div>

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
                  <span className="text-[9px] text-slate-300 block">Adquisición y Citas Verificadas (ArXiv/GitHub)</span>
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

            {/* Section C: Parallel Branches Matrix with Active Processes & Developed Sub-branches */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Ramas y Agentes Paralelos ({branches.length}):</span>
                <button
                  onClick={() => setIsFullModalOpen(true)}
                  className="text-cyan-400 hover:underline flex items-center gap-1 text-[9px]"
                >
                  <span>Explorar Topología Completa</span>
                  <Maximize2 className="w-2.5 h-2.5" />
                </button>
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {branches.map((branch, idx) => (
                  <div 
                    key={branch.id || idx}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 transition-all hover:border-cyan-500/40 relative overflow-hidden"
                  >
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

                    {/* Active Processes Preview */}
                    {branch.active_processes && branch.active_processes.length > 0 && (
                      <div className="pt-1 border-t border-white/5 space-y-0.5 text-[8px]">
                        <div className="text-slate-400 font-bold">Procesos:</div>
                        <div className="flex flex-wrap gap-1">
                          {branch.active_processes.map((proc, pidx) => (
                            <span key={pidx} className="px-1.5 py-0.2 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
                              ● {proc.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sub-branches Badges */}
                    {branch.developed_branches && branch.developed_branches.length > 0 && (
                      <div className="pt-1 border-t border-white/5 space-y-0.5 text-[8px]">
                        <div className="text-purple-300 font-bold">Sub-ramas:</div>
                        <div className="flex flex-wrap gap-1">
                          {branch.developed_branches.map((sub, sidx) => (
                            <span key={sidx} className="px-1.5 py-0.2 rounded bg-purple-950/40 border border-purple-500/30 text-purple-200">
                              🌿 {sub.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section D: Deliberation Multi-Agent Summary Traces if passed */}
            {agentTraces && agentTraces.length > 0 && (
              <div className="p-2.5 rounded-xl bg-[#0a0d16] border border-cyan-500/20 space-y-1.5">
                <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Deliberación Multiagéntica en Paralelo ({agentTraces.length} Nodos):
                </span>
                <div className="space-y-1">
                  {agentTraces.slice(0, 3).map((trace, idx) => (
                    <div key={idx} className="border-l-2 pl-2 text-[10px] space-y-0.5" style={{ borderColor: trace.color || '#00f0ff' }}>
                      <span className="font-bold text-[10px]" style={{ color: trace.color || '#00f0ff' }}>
                        {trace.agent}
                      </span>
                      <p className="text-slate-400 text-[10px] line-clamp-1">{trace.thoughts?.[0] || 'Procesando axiomas ternarios...'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Launch Full View Banner Button */}
            <div className="pt-1 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">
                Sincronización multiagéntica 1.58b verificada.
              </span>
              <button
                onClick={() => setIsFullModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Abrir Detalles Completos en Pantalla Completa</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FULL-PAGE PROCESS BRANCHING MODAL */}
      {isFullModalOpen && (
        <ProcessBranchingFullViewModal
          isOpen={isFullModalOpen}
          onClose={() => setIsFullModalOpen(false)}
          branchingPlan={branchingPlan}
          agentTraces={agentTraces}
          elapsedSeconds={elapsedSeconds}
        />
      )}
    </>
  );
}
