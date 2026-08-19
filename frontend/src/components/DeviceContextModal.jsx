import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Battery, 
  Wifi, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Folder, 
  Database, 
  Sparkles, 
  Check, 
  X, 
  RefreshCw, 
  Radio, 
  Monitor, 
  Zap, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { deviceContextDetector } from '../services/deviceContextDetector';

export default function DeviceContextModal({ isOpen, onClose }) {
  const [profile, setProfile] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const refreshDetector = async () => {
    setIsRefreshing(true);
    try {
      const data = await deviceContextDetector.detectAll();
      setProfile(data);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshDetector();
    }
  }, [isOpen]);

  const handleRequestStorage = async () => {
    const ok = await deviceContextDetector.requestPersistentStorage();
    if (ok) {
      setStatusMsg('✅ Almacenamiento persistente local garantizado.');
    } else {
      setStatusMsg('⚠️ No se pudo asegurar persistencia o ya estaba activa.');
    }
    setTimeout(() => setStatusMsg(''), 3000);
    refreshDetector();
  };

  const handleMountFolder = async () => {
    const res = await deviceContextDetector.pickLocalFolder();
    if (res.success) {
      setStatusMsg(`✅ Carpeta '${res.name}' vinculada con permisos de lectura y escritura.`);
    } else {
      setStatusMsg(`⚠️ ${res.error || 'Selección cancelada'}`);
    }
    setTimeout(() => setStatusMsg(''), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#0b0e17] border border-cyan-500/30 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in text-xs">
        {/* Modal Header */}
        <div className="p-4 bg-[#0e121e] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                Contexto del Dispositivo & Detección de Permisos Nativos
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  Auto-Discovery
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Telemetría de hardware, estado del puente local y capacidades del entorno de ejecución.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {statusMsg && (
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-xs animate-fade-in">
              {statusMsg}
            </div>
          )}

          {profile ? (
            <>
              {/* SECTION 1: HARDWARE & OS */}
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2">
                <h4 className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" />
                  Hardware & Entorno del Sistema
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="p-2 bg-black/40 rounded-lg">
                    <span className="text-slate-500 block text-[9px]">Sistema Operativo:</span>
                    <span className="text-white font-bold">{profile.os}</span>
                  </div>
                  <div className="p-2 bg-black/40 rounded-lg">
                    <span className="text-slate-500 block text-[9px]">Procesador / Cores:</span>
                    <span className="text-cyan-300 font-bold">{profile.logicalCores} Núcleos Lógicos</span>
                  </div>
                  <div className="p-2 bg-black/40 rounded-lg">
                    <span className="text-slate-500 block text-[9px]">Memoria RAM Estimada:</span>
                    <span className="text-purple-300 font-bold">{profile.ramMemoryGb} GB</span>
                  </div>
                  <div className="p-2 bg-black/40 rounded-lg">
                    <span className="text-slate-500 block text-[9px]">Resolución de Pantalla:</span>
                    <span className="text-slate-300 font-bold">{profile.screenRes}</span>
                  </div>
                  <div className="p-2 bg-black/40 rounded-lg">
                    <span className="text-slate-500 block text-[9px]">Aceleración Gráfica GPU:</span>
                    <span className="text-emerald-300 font-bold truncate block">{profile.gpuVendor}</span>
                  </div>
                  <div className="p-2 bg-black/40 rounded-lg">
                    <span className="text-slate-500 block text-[9px]">Renderizador:</span>
                    <span className="text-slate-300 font-bold truncate block">{profile.gpuRenderer}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: RED, BATERÍA Y ALMACENAMIENTO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5 text-cyan-400" /> Red & Conexión
                  </span>
                  <span className="text-xs font-bold text-white font-mono block">
                    {profile.networkInfo?.type?.toUpperCase()} ({profile.networkInfo?.downlinkMbps} Mbps)
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">RTT: {profile.networkInfo?.rttMs} ms</span>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Battery className="w-3.5 h-3.5 text-emerald-400" /> Batería
                  </span>
                  <span className="text-xs font-bold text-emerald-300 font-mono block">
                    {profile.batteryInfo?.available ? `${profile.batteryInfo.percent}% ${profile.batteryInfo.isCharging ? '⚡ (Cargando)' : '🔋'}` : 'Alimentación CA'}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Gestión térmica normal</span>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5 text-purple-400" /> Almacén Local
                  </span>
                  <span className="text-xs font-bold text-purple-300 font-mono block">
                    {profile.storageInfo?.quotaMb ? `${profile.storageInfo.usageMb} MB / ${profile.storageInfo.quotaMb} MB` : 'IndexedDB / OPFS'}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {profile.storageInfo?.persisted ? 'Persistencia Activa' : 'Persistencia Estándar'}
                  </span>
                </div>
              </div>

              {/* SECTION 3: ESTADO DEL PUENTE LOCAL & PERMISOS NATIVOS */}
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Permisos y Puentes Nativos
                  </h4>

                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 ${
                    profile.localBridge?.connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    {profile.localBridge?.connected ? '⚡ Puente Local Activo (127.0.0.1:8000)' : '🌐 Modo Web Soberano (Vercel Client)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
                    <span className="text-slate-300">File System Access API:</span>
                    <span className={profile.permissions?.fileSystemAccess ? "text-emerald-400 font-bold" : "text-amber-400"}>
                      {profile.permissions?.fileSystemAccess ? "✅ Disponible" : "⚠️ Parcial"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
                    <span className="text-slate-300">WebAssembly SIMD (1.58b):</span>
                    <span className="text-emerald-400 font-bold">✅ Soportado</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
                    <span className="text-slate-300">Voz OmniVoice (TTS/STT):</span>
                    <span className="text-emerald-400 font-bold">✅ Activo</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
                    <span className="text-slate-300">Consola / Shell Nativa:</span>
                    <span className={profile.localBridge?.connected ? "text-emerald-400 font-bold" : "text-cyan-400"}>
                      {profile.localBridge?.connected ? "✅ Conectado" : "🌐 Sandboxed"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={handleRequestStorage}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                    Solicitar Persistencia Offline
                  </button>

                  <button
                    onClick={handleMountFolder}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Folder className="w-3.5 h-3.5 text-blue-400" />
                    Vincular Carpeta del Dispositivo
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400">Detectando capacidades del dispositivo...</div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0e121e] border-t border-white/10 flex items-center justify-between">
          <button
            onClick={refreshDetector}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white font-mono flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Re-escaneando...' : 'Re-escanear Dispositivo'}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Check className="w-4 h-4" />
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
