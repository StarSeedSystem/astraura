import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Zap, ShieldCheck, Play, Terminal, CheckCircle, ArrowUpRight } from 'lucide-react';
import { fetchHardwareProfile, triggerBitNetBuild } from '../services/api';

export default function SystemDiagnostics() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [buildLogs, setBuildLogs] = useState(null);
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const data = await fetchHardwareProfile();
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuildBitNet = async () => {
    setIsBuilding(true);
    try {
      const res = await triggerBitNetBuild();
      setBuildLogs("Compilación de BitNet iniciada en segundo plano con optimizaciones Clang / Apple Silicon NEON...");
    } catch (err) {
      setBuildLogs(`Error al iniciar compilación: ${err.message}`);
    } finally {
      setIsBuilding(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 font-mono text-sm">
        Cargando diagnóstico de hardware...
      </div>
    );
  }

  const sys = profile.system || {};
  const bench = profile.benchmark || {};
  const tune = profile.auto_tuning || {};

  return (
    <div className="flex flex-col h-full bg-[#080b12] rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-6 space-y-6 overflow-y-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-cyan-400" />
            Telemetría de Hardware & Inferencia 1.58-Bit
          </h2>
          <p className="text-xs text-slate-400">
            Auto-optimización de cómputo para arquitectura {sys.processor} ({sys.arch})
          </p>
        </div>

        <button
          onClick={handleBuildBitNet}
          disabled={isBuilding}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-mono font-semibold flex items-center gap-2 shadow-lg shadow-purple-900/30 transition-all"
        >
          <Terminal className="w-4 h-4" />
          {isBuilding ? 'Compilando...' : 'Recompilar bitnet.cpp Nativo'}
        </button>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Compression */}
        <div className="p-5 rounded-2xl glass-panel border-cyan-500/20 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-mono">
            <span>COMPRESIÓN DE MEMORIA</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-display font-black text-white tracking-tight">
            {bench.memory_compression_vs_fp16 || '8.0x'}
          </div>
          <p className="text-xs text-cyan-400/80 mt-1">
            Reducción vs FP16 estándar (Empaquetado int2)
          </p>
          <div className="mt-3 text-[11px] text-slate-400 border-t border-white/5 pt-2 flex justify-between">
            <span>Compresión vs FP32:</span>
            <span className="font-bold text-slate-200">{bench.memory_compression_vs_fp32 || '16.0x'}</span>
          </div>
        </div>

        {/* Metric 2: SIMD & Acceleration */}
        <div className="p-5 rounded-2xl glass-panel border-purple-500/20 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-mono">
            <span>ACELERACIÓN VECTORIAL</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-display font-black text-white tracking-tight">
            ARM NEON
          </div>
          <p className="text-xs text-purple-400/80 mt-1">
            Instrucciones SIMD nativas en Apple Silicon
          </p>
          <div className="mt-3 text-[11px] text-slate-400 border-t border-white/5 pt-2 flex justify-between">
            <span>Hilos de CPU asignados:</span>
            <span className="font-bold text-slate-200">{tune.optimal_threads || 8} Cores</span>
          </div>
        </div>

        {/* Metric 3: Context Window */}
        <div className="p-5 rounded-2xl glass-panel border-emerald-500/20 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-mono">
            <span>VENTANA DE CONTEXTO</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-display font-black text-white tracking-tight">
            {tune.optimal_context_size || 4096} <span className="text-sm font-normal text-slate-400">Tokens</span>
          </div>
          <p className="text-xs text-emerald-400/80 mt-1">
            Auto-ajustado por capacidad de RAM disponible
          </p>
          <div className="mt-3 text-[11px] text-slate-400 border-t border-white/5 pt-2 flex justify-between">
            <span>Tamaño de Batch:</span>
            <span className="font-bold text-slate-200">{tune.optimal_batch_size || 256}</span>
          </div>
        </div>
      </div>

      {/* Ternary Weights Distribution Visualization */}
      <div className="p-6 rounded-2xl glass-panel border-white/10 space-y-4">
        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Distribución de Pesos Ternarios en Red de 1.58 Bits {-1, 0, 1}
        </h3>
        <p className="text-xs text-slate-300">
          En la arquitectura BitNet b1.58, los pesos flotantes continuos se cuantizan en 3 estados discretos exactos. Esto elimina los multiplicadores físicos y transforma la inferencia en sumas puras:
        </p>

        {/* Visual Bar */}
        <div className="space-y-2">
          <div className="w-full h-8 rounded-xl overflow-hidden flex shadow-inner border border-white/10">
            <div style={{ width: '33.3%' }} className="bg-rose-600/80 flex items-center justify-center text-[11px] font-mono font-bold text-white">
              -1 (33.3%)
            </div>
            <div style={{ width: '33.4%' }} className="bg-slate-700/80 flex items-center justify-center text-[11px] font-mono font-bold text-slate-300">
              0 (33.4%)
            </div>
            <div style={{ width: '33.3%' }} className="bg-emerald-600/80 flex items-center justify-center text-[11px] font-mono font-bold text-white">
              +1 (33.3%)
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
              <strong>Estado -1</strong>: Resta vectorizada
            </div>
            <div className="p-2 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-300">
              <strong>Estado 0</strong>: Sin costo (Skip)
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <strong>Estado +1</strong>: Suma vectorizada
            </div>
          </div>
        </div>
      </div>

      {/* System Specifications Table */}
      <div className="p-6 rounded-2xl glass-panel border-white/10 space-y-3">
        <h3 className="font-display font-bold text-lg text-white">Especificaciones del Anfitrión</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-slate-400 block mb-1">PROCESADOR</span>
            <span className="text-white font-bold text-sm">{sys.processor} ({sys.physical_cores} Cores)</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-slate-400 block mb-1">MEMORIA TOTAL</span>
            <span className="text-white font-bold text-sm">{sys.total_ram_gb} GB Unified RAM</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-slate-400 block mb-1">MEMORIA LIBRE</span>
            <span className="text-white font-bold text-sm">{sys.available_ram_gb} GB Disponibles</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-slate-400 block mb-1">ARQUITECTURA</span>
            <span className="text-white font-bold text-sm">{sys.arch} / macOS</span>
          </div>
        </div>
      </div>

      {buildLogs && (
        <div className="p-4 rounded-xl bg-[#131a29] border border-purple-500/30 text-xs font-mono text-purple-300 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" /> Estado de Compilación:
          </div>
          <div>{buildLogs}</div>
        </div>
      )}
    </div>
  );
}
