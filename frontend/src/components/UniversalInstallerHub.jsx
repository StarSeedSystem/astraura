import React, { useState, useEffect } from 'react';
import { 
  DownloadCloud, 
  Terminal, 
  Copy, 
  Check, 
  HardDrive, 
  Cpu, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw, 
  Database, 
  Globe, 
  ExternalLink,
  Layers,
  Zap,
  Box,
  Smartphone,
  Apple,
  Laptop
} from 'lucide-react';
import { runDiscoveryScan, fetchInstallerScript } from '../services/api';

export default function UniversalInstallerHub() {
  const [scanData, setScanData] = useState(null);
  const [installerScript, setInstallerScript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeOS, setActiveOS] = useState('mac'); // 'mac' | 'linux' | 'windows' | 'android' | 'ios'

  const loadDiscovery = async () => {
    setIsLoading(true);
    try {
      const data = await runDiscoveryScan();
      setScanData(data);
      const script = await fetchInstallerScript();
      setInstallerScript(script);
    } catch (err) {
      console.warn('Auto-discovery fallback for web:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiscovery();
  }, []);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const commands = {
    mac: "curl -fsSL https://astraura.vercel.app/install.sh | bash",
    linux: "curl -fsSL https://astraura.vercel.app/install.sh | bash",
    windows: "irm https://astraura.vercel.app/install.ps1 | iex",
    android: "pkg update && pkg install python clang -y && curl -fsSL https://astraura.vercel.app/install.sh | bash",
    ios: "https://astraura.vercel.app (Toca 'Compartir' -> 'Añadir a pantalla de inicio')"
  };

  return (
    <div className="flex flex-col h-full bg-[#08090d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-4 sm:p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
              <Box className="w-6 h-6 text-cyan-400" />
              Instalador Universal // Multi-Dispositivo & Multi-OS
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono">
              macOS • Linux • Windows • Android • iOS
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Instala y ejecuta Astraura en cualquier dispositivo con auto-descubrimiento de modelos, memorias y aceleración de hardware
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDiscovery}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-1.5 text-xs font-mono"
            title="Escanear dispositivo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-escanear</span>
          </button>
        </div>
      </div>

      {/* OS Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-3">
        {[
          { id: 'mac', label: 'macOS (Apple Silicon & Intel)', icon: Apple },
          { id: 'linux', label: 'Linux (Ubuntu/Arch/Debian)', icon: Laptop },
          { id: 'windows', label: 'Windows (PowerShell 7+)', icon: Laptop },
          { id: 'android', label: 'Android (Termux / PWA)', icon: Smartphone },
          { id: 'ios', label: 'iOS (PWA / Web App)', icon: Smartphone },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeOS === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveOS(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-md'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Selected OS Install Card */}
      <div className="p-5 rounded-2xl glass-panel border-cyan-500/30 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Comando de Instalación en 1 Línea para {activeOS.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Configura automáticamente el entorno virtual, BitNet b1.58, aceleración matemática y permisos.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 self-start sm:self-auto">
            1-Click Setup
          </span>
        </div>

        <div className="p-3.5 bg-[#06080c] rounded-xl border border-white/10 flex items-center justify-between gap-3 font-mono text-xs text-cyan-300">
          <code className="truncate flex-1">{commands[activeOS]}</code>
          <button
            onClick={() => handleCopy(commands[activeOS], activeOS)}
            className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 flex items-center gap-1.5 flex-shrink-0"
          >
            {copiedKey === activeOS ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copiar</span>
          </button>
        </div>
      </div>

      {/* Auto-Discovery Scan Results on this Device */}
      {scanData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              Escaneo de Contexto en este Dispositivo ({scanData.host.os} {scanData.host.arch})
            </h3>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {scanData.host.acceleration} Activo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#0f131d] border border-white/5 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase">Modelos GGUF/1.58b</span>
              <p className="text-xl font-bold text-cyan-400">{scanData.total_models} Detectados</p>
              <span className="text-[11px] text-slate-400">Listos para inferencia</span>
            </div>

            <div className="p-4 rounded-xl bg-[#0f131d] border border-white/5 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase">Documentos & Workspaces</span>
              <p className="text-xl font-bold text-purple-400">{scanData.total_documents} Detectados</p>
              <span className="text-[11px] text-slate-400">Indexación automática</span>
            </div>

            <div className="p-4 rounded-xl bg-[#0f131d] border border-white/5 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase">Grafos de Memoria Previa</span>
              <p className="text-xl font-bold text-emerald-400">{scanData.total_memories} Detectados</p>
              <span className="text-[11px] text-slate-400">Continuidad garantizada</span>
            </div>
          </div>
        </div>
      )}

      {/* Script Source Preview */}
      {installerScript && (
        <div className="p-4 rounded-xl bg-[#0a0d14] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              Script Maestro de Instalación (`install.sh`)
            </h4>
            <button
              onClick={() => handleCopy(installerScript, 'script')}
              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-mono flex items-center gap-1"
            >
              {copiedKey === 'script' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copiar</span>
            </button>
          </div>
          <pre className="p-3 bg-black/50 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48 leading-relaxed">
            {installerScript}
          </pre>
        </div>
      )}
    </div>
  );
}
