import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FolderCheck, 
  Cpu, 
  HardDrive, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Layers, 
  Sparkles, 
  Globe, 
  Lock, 
  Unlock, 
  FileText,
  BatteryCharging,
  Sliders
} from 'lucide-react';
import { universalDeviceBridge } from '../services/universalDeviceBridge';
import { fetchUniversalDeviceAccess, grantUniversalPermission } from '../services/api';

export default function UniversalDeviceModal({ isOpen, onClose }) {
  const [bridgeState, setBridgeState] = useState({ capabilities: null, permissions: {} });
  const [hardwareProfile, setHardwareProfile] = useState(null);
  const [folderResult, setFolderResult] = useState(null);
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = universalDeviceBridge.subscribe(setBridgeState);
    loadBackendProfile();
    return () => unsub();
  }, []);

  const loadBackendProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetchUniversalDeviceAccess();
      setHardwareProfile(res);
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFolder = async () => {
    setIsSelectingFolder(true);
    setFolderResult(null);
    try {
      const res = await universalDeviceBridge.requestLocalFolderAccess();
      setFolderResult(res);
    } catch (e) {
      setFolderResult({ success: false, error: e.message });
    } finally {
      setIsSelectingFolder(false);
    }
  };

  const handleGrantAll = async () => {
    universalDeviceBridge.grantAllPermissions();
    try {
      await grantUniversalPermission('all', true);
    } catch {}
  };

  if (!isOpen) return null;

  const caps = bridgeState.capabilities || {};
  const perms = bridgeState.permissions || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-[#0b0e17] border border-cyan-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-cyan-950/50 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 via-purple-950/20 to-transparent sticky top-0 z-10 bg-[#0b0e17]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-display flex items-center gap-2">
                Acceso Universal al Dispositivo, Procesador & SO
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Permisos nativos para Web (Vercel), Localhost y PWA en macOS, Windows, Linux y Móvil.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 text-xs font-mono">
          {/* Hardware Matrix Card */}
          <div className="p-4 rounded-2xl bg-black/50 border border-cyan-500/20 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> Matriz de Hardware & Aceleración Detectada
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                {caps.os_name || 'Multi-OS'} ({caps.cores_logical || 8} Hilos)
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-500 block text-[10px]">Arquitectura CPU</span>
                <span className="font-bold text-white">
                  {hardwareProfile?.simd_acceleration || (caps.simd_wasm_supported ? 'ARM64 / WASM SIMD' : 'x86_64')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-500 block text-[10px]">Memoria RAM</span>
                <span className="font-bold text-emerald-300">
                  {hardwareProfile?.ram_total_gb ? `${hardwareProfile.ram_total_gb} GB` : `~${caps.ram_estimated_gb || 8} GB`}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-500 block text-[10px]">WASM SIMD 128-bit</span>
                <span className="font-bold text-cyan-300">
                  {caps.simd_wasm_supported ? '✅ Activo (1.58b)' : '⚠️ Emulado'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-500 block text-[10px]">Modo de Ejecución</span>
                <span className="font-bold text-purple-300">
                  {caps.is_pwa_standalone ? 'PWA Nativa' : 'Web Soberana'}
                </span>
              </div>
            </div>
          </div>

          {/* Local Folder Binding Card */}
          <div className="p-5 rounded-2xl bg-purple-950/10 border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-300 flex items-center gap-2">
                <FolderCheck className="w-4 h-4" /> Vinculación Directa de Archivos & Carpetas Locales
              </span>
              {perms.filesystem_full_access && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ✓ Carpeta Vinculada
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Permite que la versión web en Vercel lea y guarde cambios directamente en tu carpeta de proyecto sin intermediarios, mediante el File System Access API nativo.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleSelectFolder}
                disabled={isSelectingFolder}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer disabled:opacity-50"
              >
                <FolderCheck className="w-4 h-4" />
                {isSelectingFolder ? 'Seleccionando en el sistema...' : '📁 Seleccionar & Vincular Carpeta Local'}
              </button>

              {folderResult?.success && (
                <div className="text-[11px] text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                  ✅ Vinculada: <b>{folderResult.folderName}</b> ({folderResult.fileCount} archivos)
                </div>
              )}
            </div>
          </div>

          {/* Granular Permission Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Permisos del Sistema & Dispositivo
              </label>
              <button
                onClick={handleGrantAll}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-bold cursor-pointer"
              >
                ⚡ Otorgar Todos los Permisos
              </button>
            </div>

            <div className="space-y-2">
              {[
                {
                  key: 'filesystem_full_access',
                  label: 'Acceso a Sistema de Archivos Local',
                  desc: 'Lectura y escritura en la carpeta de trabajo y bóveda soberana.',
                  active: perms.filesystem_full_access
                },
                {
                  key: 'hardware_concurrency_simd',
                  label: 'Uso de Hilos de CPU & Aceleración SIMD 128-bit',
                  desc: 'Asignación adaptativa de núcleos M1 / x86 para BitNet 1.58b.',
                  active: perms.hardware_concurrency_simd
                },
                {
                  key: 'storage_persistence',
                  label: 'Persistencia de Almacenamiento & IndexedDB',
                  desc: 'Evita que el navegador limpie la memoria cognitiva y grafos StarSeed.',
                  active: perms.storage_persistence
                },
                {
                  key: 'battery_power_metrics',
                  label: 'Sensores de Batería & Consumo Energético',
                  desc: 'Ajusta dinámicamente la entropía y ciclos oníricos según la carga.',
                  active: perms.battery_power_metrics
                },
                {
                  key: 'geolocation_sensor',
                  label: 'Sensor de Ubicación Geográfica & Clima',
                  desc: 'Sincroniza el sensorium y la resonancia ambiental de los sueños.',
                  active: perms.geolocation_sensor
                }
              ].map((perm) => (
                <div 
                  key={perm.key}
                  onClick={() => universalDeviceBridge.togglePermission(perm.key)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    perm.active 
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200' 
                      : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold block text-white text-xs">{perm.label}</span>
                    <span className="text-[10px] text-slate-400">{perm.desc}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${
                    perm.active ? 'bg-emerald-500 text-black' : 'bg-white/10 text-transparent'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 bg-black/40 flex items-center justify-between sticky bottom-0 z-10">
          <span className="text-[11px] text-slate-400">
            Astraura 1.58b Universal Device Framework v4.0
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer"
          >
            Listo / Guardar Estado
          </button>
        </div>
      </div>
    </div>
  );
}
