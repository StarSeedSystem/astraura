import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Play, CornerDownLeft, Trash2, ShieldCheck, Sparkles, Check, AlertCircle } from 'lucide-react';
import { executeTerminalCommand } from '../services/api';

export default function TerminalConsole() {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState([
    {
      command: "sysctl -n machdep.cpu.brand_string && uname -m",
      output: "Apple M1\narm64",
      success: true,
      cwd: "~"
    },
    {
      command: "python3 -c 'import numpy; print(\"NumPy 1.58b SIMD vectorization ready\")'",
      output: "NumPy 1.58b SIMD vectorization ready",
      success: true,
      cwd: "~/Documents/IA 1.58 bit"
    }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const terminalEndRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isRunning]);

  const handleRun = async (cmdToRun = null) => {
    const targetCmd = cmdToRun || command;
    if (!targetCmd.trim() || isRunning) return;

    setIsRunning(true);
    try {
      const res = await executeTerminalCommand(targetCmd.trim());
      setHistory((prev) => [
        ...prev,
        {
          command: targetCmd.trim(),
          output: res.output || (res.success ? "(Ejecutado sin salida)" : res.stderr),
          success: res.success,
          cwd: res.cwd
        }
      ]);
      if (!cmdToRun) setCommand('');
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        {
          command: targetCmd.trim(),
          output: `Error de ejecución: ${err.message}`,
          success: false,
          cwd: "~"
        }
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const presets = [
    { label: "CPU Apple Silicon", cmd: "sysctl -n machdep.cpu.brand_string" },
    { label: "Memoria & Discos", cmd: "df -h && vm_stat | head -n 8" },
    { label: "Procesos Activos", cmd: "ps aux | head -n 10" },
    { label: "Estado Git", cmd: "git status" },
    { label: "Kernels BitNet C++", cmd: "ls -la backend/BitNet/build/bin 2>/dev/null || echo 'BitNet C++ en preparación'" }
  ];

  return (
    <div className="flex flex-col h-full bg-[#06080c] rounded-2xl border border-white/10 overflow-hidden shadow-2xl font-mono text-xs">
      {/* Terminal Titlebar */}
      <div className="px-4 py-3 bg-[#0d1017] border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Terminal de Sistema // StarSeed Sandbox
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setHistory([])}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            title="Limpiar consola"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preset Command Pills */}
      <div className="px-4 py-2.5 bg-[#0a0d14] border-b border-white/5 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" /> Diagnósticos:
        </span>
        {presets.map((p, i) => (
          <button
            key={i}
            onClick={() => handleRun(p.cmd)}
            disabled={isRunning}
            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-200 border border-white/5 hover:border-cyan-500/30 text-[11px] whitespace-nowrap transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Output Console Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-300">
        {history.map((h, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <span className="text-purple-400 font-mono">astraura@host:{h.cwd} $</span>
              <span>{h.command}</span>
            </div>
            <pre
              className={`p-3 rounded-xl whitespace-pre-wrap leading-relaxed ${
                h.success
                  ? 'bg-[#0a0e17] text-slate-300 border border-white/5'
                  : 'bg-rose-950/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {h.output}
            </pre>
          </div>
        ))}

        {isRunning && (
          <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
            <span className="text-purple-400">astraura@host $</span>
            <span>Ejecutando comando en el sistema...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Input Prompt */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleRun();
        }}
        className="p-3 bg-[#0d1017] border-t border-white/10 flex items-center gap-2"
      >
        <span className="text-cyan-400 font-bold">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Escribe un comando de terminal (ej: uname -a, ps, df -h, ls -la /)..."
          disabled={isRunning}
          className="flex-1 bg-transparent text-white focus:outline-none text-xs font-mono placeholder-slate-600"
        />
        <button
          type="submit"
          disabled={!command.trim() || isRunning}
          className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 disabled:opacity-40 transition-colors flex items-center gap-1"
        >
          <Play className="w-3 h-3" />
          <span>Ejecutar</span>
        </button>
      </form>
    </div>
  );
}
