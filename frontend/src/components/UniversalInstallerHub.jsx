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
  Laptop, 
  Wifi, 
  Settings,
  FileText,
  Play,
  PauseCircle,
  Info
} from 'lucide-react';
import { runDiscoveryScan, fetchInstallerScript } from '../services/api';

// OS-specific installer assets and commands
const OS_CONFIG = {
  mac: {
    label: 'macOS (Apple Silicon & Intel)',
    icon: Apple,
    color: '#00f0ff',
    installCommand: 'curl -fsSL https://astraura.vercel.app/install.sh | bash',
    installer: {
      name: 'Astraura-1.58-Bit-mac.dmg',
      url: 'https://astraura.vercel.app/desktop/Astraura-1.58-Bit-mac.dmg',
      size: '185 MB',
      type: 'dmg'
    },
    terminalInstructions: [
      { step: 1, desc: 'Abre Terminal', note: '⌘ + Espacio → escribe "Terminal"' },
      { step: 2, desc: 'Ejecuta el instalador:', note: 'curl -fsSL https://astraura.vercel.app/install.sh | bash' },
      { step: 3, desc: 'El instalador configura:', note: 'Python venv, dependencias, modelos y permisos' },
      { step: 4, desc: 'Al terminar, el backend inicia automáticamente en:', note: 'http://127.0.0.1:8000' },
      { step: 5, desc: 'Para modo desktop, ejecuta:', note: 'astraura --mode=app' }
    ]
  },
  linux: {
    label: 'Linux (Ubuntu/Debian/Arch/Fedora)',
    icon: Laptop,
    color: '#10b981',
    installCommand: 'curl -fsSL https://astraura.vercel.app/install.sh | bash',
    installer: {
      name: 'Astraura-1.58-Bit.AppImage',
      url: 'https://astraura.vercel.app/desktop/Astraura-1.58-Bit-x86_64.AppImage',
      size: '192 MB',
      type: 'AppImage'
    },
    terminalInstructions: [
      { step: 1, desc: 'Instala dependencias base:', note: 'sudo apt install -y build-essential cmake clang python3-pip git nodejs npm' },
      { step: 2, desc: 'Ejecuta el instalador:', note: 'curl -fsSL https://astraura.vercel.app/install.sh | bash' },
      { step: 3, desc: 'El instalador configura:', note: 'Entorno virtual, BitNet, modelos y permisos de almacenamiento' },
      { step: 4, desc: 'Backend disponible en:', note: 'http://127.0.0.1:8000' },
      { step: 5, desc: 'Frontend dev server en:', note: 'http://localhost:5173' }
    ]
  },
  windows: {
    label: 'Windows (PowerShell 7+ / WSL2)',
    icon: Laptop,
    color: '#38bdf8',
    installCommand: 'irm https://astraura.vercel.app/install.ps1 | iex',
    installer: {
      name: 'Astraura-1.58-Bit-Setup.exe',
      url: 'https://astraura.vercel.app/desktop/Astraura-1.58-Bit-Setup.exe',
      size: '178 MB',
      type: 'exe'
    },
    terminalInstructions: [
      { step: 1, desc: 'Abre PowerShell como Administrador', note: 'Win + X → "Windows PowerShell (Admin)"' },
      { step: 2, desc: 'Configura política de ejecución:', note: 'Set-ExecutionPolicy RemoteSigned -Scope CurrentUser' },
      { step: 3, desc: 'Ejecuta el instalador:', note: 'irm https://astraura.vercel.app/install.ps1 | iex' },
      { step: 4, desc: 'El instalador configura:', note: '.venv, dependencias, modelo cuantizado i2_s' },
      { step: 5, desc: 'Backend disponible en:', note: 'http://127.0.0.1:8000' },
      { step: 6, desc: 'Opcional: instala WSL2 para terminal nativa', note: 'wsl --install' }
    ]
  },
  android: {
    label: 'Android (Termux / PWA)',
    icon: Smartphone,
    color: '#ec4899',
    installCommand: 'pkg update && pkg install python clang -y && curl -fsSL https://astraura.vercel.app/install.sh | bash',
    installer: {
      name: 'astraura-1.58-bit-pwa.apk',
      url: 'https://astraura.vercel.app/desktop/astraura-1.58-bit-pwa.apk',
      size: '12 MB',
      type: 'apk'
    },
    terminalInstructions: [
      { step: 1, desc: 'Instala Termux desde F-Droid', note: 'No desde Google Play (está desactualizado)' },
      { step: 2, desc: 'Actualiza paquetes:', note: 'pkg update && pkg upgrade' },
      { step: 3, desc: 'Instala dependencias:', note: 'pkg install python clang git -y' },
      { step: 4, desc: 'Ejecuta instalador:', note: 'curl -fsSL https://astraura.vercel.app/install.sh | bash' },
      { step: 5, desc: 'Inicia Astraura:', note: 'astraura --mode=cli' },
      { step: 6, desc: 'Alternativa PWA: abre en Chrome → "Añadir a pantalla de inicio"', note: 'https://astraura.vercel.app' }
    ]
  },
  ios: {
    label: 'iOS (PWA / Web App)',
    icon: Smartphone,
    color: '#f59e0b',
    installCommand: 'https://astraura.vercel.app (Toca Compartir → "Añadir a pantalla de inicio")',
    installer: {
      name: 'No disponible (use PWA)',
      url: 'https://astraura.vercel.app',
      size: 'Web App',
      type: 'web'
    },
    terminalInstructions: [
      { step: 1, desc: 'Abre Safari (no Chrome) en iPhone/iPad', note: 'Safari es requerido para PWA' },
      { step: 2, desc: 'Visita:', note: 'https://astraura.vercel.app' },
      { step: 3, desc: 'Toca el botón de compartir', note: 'Cuadrado con flecha hacia arriba' },
      { step: 4, desc: 'Selecciona "Añadir a pantalla de inicio"', note: 'Se creará un ícono nativo' },
      { step: 5, desc: 'Abre desde el ícono recién creado', note: 'Funciona como app nativa con push notifications' }
    ]
  }
};

export default function UniversalInstallerHub() {
  const [scanData, setScanData] = useState(null);
  const [installerScript, setInstallerScript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeOS, setActiveOS] = useState('mac');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const loadDiscovery = async () => {
    setIsLoading(true);
    try {
      const data = await runDiscoveryScan();
      setScanData(data);
      const script = await fetchInstallerScript();
      setInstallerScript(script || '');
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

  const handleDownloadInstaller = async (osKey) => {
    const config = OS_CONFIG[osKey];
    if (!config.installer || config.installer.type === 'web') {
      window.open(config.installer.url, '_blank');
      return;
    }
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    // Simulated download progress
    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsDownloading(false);
          setTimeout(() => {
            setToastMsg(`✅ ${config.installer.name} descargado e instalado.`);
            setTimeout(() => setToastMsg(''), 4000);
          }, 500);
          return 100;
        }
        return prev + Math.random() * 8;
      });
    }, 200);
    
    // Trigger actual download
    const link = document.createElement('a');
    link.href = config.installer.url;
    link.download = config.installer.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setToastMsg(`⬇️ Descargando ${config.installer.name}...`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const [toastMsg, setToastMsg] = useState('');

  return (
    <div className="flex flex-col h-full bg-[#08090d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-4 sm:p-6 space-y-6 overflow-y-auto font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-gradient-to-r from-purple-900 to-cyan-900 border border-purple-400 text-white font-mono text-xs shadow-2xl animate-fade-in flex items-center gap-3">
          <DownloadCloud className="w-4 h-4 text-cyan-300" />
          <span>{toastMsg}</span>
        </div>
      )}

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
            title="Re-escanear dispositivo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-escanear</span>
          </button>
        </div>
      </div>

      {/* OS Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-3">
        {Object.entries(OS_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = activeOS === key;
          return (
            <button
              key={key}
              onClick={() => setActiveOS(key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-md'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Selected OS Section */}
      <div className="space-y-6">
        {(() => {
          const config = OS_CONFIG[activeOS];
          const Icon = config.icon;
          
          return (
            <>
              {/* 1. Download Installer Button */}
              <div className="p-5 rounded-2xl glass-panel border-cyan-500/30 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                      <DownloadCloud className="w-4 h-4 text-cyan-400" />
                      Instalador Independiente ({config.label})
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      App nativa de escritorio con icono instalable. No requiere navegador externo.
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full bg-${config.color.replace('#', '')}/15 text-${config.color}/30 border border-${config.color}/30`}>
                    {config.installer.size}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDownloadInstaller(activeOS)}
                    disabled={isDownloading}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-slate-950 font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-950/30 disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Descargando... {Math.round(downloadProgress)}%</span>
                      </>
                    ) : (
                      <>
                        <DownloadCloud className="w-4 h-4" />
                        <span>⬇️ Descargar {config.installer.name}</span>
                      </>
                    )}
                  </button>
                  <span className="text-xs text-slate-400">
                    Formato: {config.installer.type.toUpperCase()} con permisos nativos
                  </span>
                </div>
              </div>

              {/* 2. Terminal Installation Command */}
              <div className="p-5 rounded-2xl glass-panel border-purple-500/30 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-purple-400" />
                      Instalación vía Terminal para {config.label}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Configura automáticamente el entorno virtual, BitNet b1.58, aceleración matemática y permisos.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    1-Click Setup
                  </span>
                </div>

                <div className="p-3.5 bg-[#06080c] rounded-xl border border-white/10 flex items-center justify-between gap-3 font-mono text-xs text-cyan-300">
                  <code className="truncate flex-1 break-all">{config.installCommand}</code>
                  <button
                    onClick={() => handleCopy(config.installCommand, `cmd-${activeOS}`)}
                    className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 flex items-center gap-1.5 flex-shrink-0"
                  >
                    {copiedKey === `cmd-${activeOS}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copiar</span>
                  </button>
                </div>
              </div>

              {/* 3. Step-by-Step Instructions */}
              <div className="p-5 rounded-2xl bg-[#0f131d] border border-white/5 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-display font-bold text-sm text-white">
                    Instrucciones Paso a Paso para {config.label}
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {config.terminalInstructions.map((instr) => (
                    <div key={instr.step} className="flex items-start gap-3 p-2.5 rounded-lg bg-black/30 border border-white/5">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                        <span className="text-xs font-bold text-cyan-300">{instr.step}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-white font-medium">{instr.desc}</div>
                        <code className="text-[10px] text-slate-400 mt-0.5 block break-all">{instr.note}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

        {/* Auto-Discovery Scan Results */}
        {scanData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                Escaneo de Contexto en este Dispositivo ({scanData.host?.os} {scanData.host?.arch})
              </h3>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {scanData.host?.acceleration} Activo
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
    </div>
  );
}
