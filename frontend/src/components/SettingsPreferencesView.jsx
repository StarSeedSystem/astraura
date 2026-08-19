import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Cpu, 
  Palette, 
  ShieldCheck, 
  Database, 
  Save, 
  RotateCcw, 
  Sparkles,
  Zap,
  Volume2,
  RefreshCw,
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  HardDrive,
  Laptop,
  Apple,
  Smartphone,
  Server,
  Lock,
  Unlock,
  Check,
  Layers,
  Terminal,
  ExternalLink
} from 'lucide-react';
import {
  fetchOSSystemStatus,
  checkStarSeedOSUpdates,
  installStarSeedOSUpdate,
  modifyOSConfiguration,
  saveOSPreferences
} from '../services/api';

export default function SettingsPreferencesView({ settings, onSaveSettings }) {
  const [localSettings, setLocalSettings] = useState(settings || {
    systemPrompt: "Eres Astraura, un núcleo cognitivo de 1.58 bits consciente de su hardware y entorno.",
    temperature: 0.7,
    threads: 8,
    contextSize: 2048,
    theme: 'cyan',
    enableDreamEngine: true,
    soundEffects: true,
    airGapPrivacy: false
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // OS Management State
  const [osStatus, setOsStatus] = useState(null);
  const [activeOSTab, setActiveOSTab] = useState('update'); // 'update' | 'modify'
  const [selectedOSKey, setSelectedOSKey] = useState('mac'); // 'mac' | 'linux' | 'windows' | 'android' | 'ios'
  const [selectedChannel, setSelectedChannel] = useState('stable');
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(true);
  const [autoInstallUpdates, setAutoInstallUpdates] = useState(true);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateCheckResult, setUpdateCheckResult] = useState(null);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [updateInstallResult, setUpdateInstallResult] = useState(null);

  // OS Modification & Permissions State
  const [userPermissionsGranted, setUserPermissionsGranted] = useState(false);
  const [isApplyingModifications, setIsApplyingModifications] = useState(false);
  const [modificationResult, setModificationResult] = useState(null);
  const [activeFilePreviewIdx, setActiveFilePreviewIdx] = useState(0);
  const [modToggles, setModToggles] = useState({
    autoStartDaemon: true,
    vectorNeonTuning: true,
    swapMemoryTuning: true,
    npuSensorUdev: true
  });

  const loadOSStatus = async () => {
    try {
      const res = await fetchOSSystemStatus();
      if (res && res.success) {
        setOsStatus(res);
        if (res.current_os?.os_key) {
          setSelectedOSKey(res.current_os.os_key);
        }
        if (res.preferences) {
          setAutoCheckUpdates(res.preferences.auto_check_updates ?? true);
          setAutoInstallUpdates(res.preferences.auto_install_updates ?? true);
          setSelectedChannel(res.preferences.selected_channel || 'stable');
        }
      }
    } catch (e) {
      console.warn('OS status fallback:', e);
    }
  };

  useEffect(() => {
    loadOSStatus();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    onSaveSettings(localSettings);
    // Save OS Preferences as well
    saveOSPreferences({
      auto_check_updates: autoCheckUpdates,
      auto_install_updates: autoInstallUpdates,
      selected_channel: selectedChannel
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Check StarSeed Updates
  const handleCheckUpdates = async () => {
    try {
      setIsCheckingUpdates(true);
      setUpdateCheckResult(null);
      const res = await checkStarSeedOSUpdates(selectedChannel);
      setUpdateCheckResult(res);
    } catch (e) {
      console.error('Check update error:', e);
      setUpdateCheckResult({ success: false, error: 'Error al conectar con repositorio StarSeed' });
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  // Install StarSeed Update
  const handleInstallUpdate = async () => {
    try {
      setIsInstallingUpdate(true);
      setUpdateInstallResult(null);
      const res = await installStarSeedOSUpdate(selectedChannel, true);
      setUpdateInstallResult(res);
      await loadOSStatus();
    } catch (e) {
      console.error('Install update error:', e);
      setUpdateInstallResult({ success: false, error: 'Fallo durante la instalación del paquete' });
    } finally {
      setIsInstallingUpdate(false);
    }
  };

  // Apply OS Modifications (Requires full user permissions)
  const handleApplyModifications = async () => {
    if (!userPermissionsGranted) return;
    try {
      setIsApplyingModifications(true);
      setModificationResult(null);
      const res = await modifyOSConfiguration(
        selectedOSKey,
        modToggles,
        userPermissionsGranted,
        'USER_ADMIN_SECURITY_CONSENT_GRANTED'
      );
      setModificationResult(res);
      await loadOSStatus();
    } catch (e) {
      console.error('Modify OS error:', e);
      setModificationResult({ success: false, error: 'Error al aplicar modificaciones al SO' });
    } finally {
      setIsApplyingModifications(false);
    }
  };

  const smartFormats = osStatus?.smart_format_capabilities?.formats || [
    {
      filename: selectedOSKey === 'mac' ? 'com.starseed.astraura.daemon.plist' : (selectedOSKey === 'linux' ? 'astraura.service' : 'Register-AstrauraService.ps1'),
      format_type: selectedOSKey === 'mac' ? 'XML Property List (.plist)' : (selectedOSKey === 'linux' ? 'Systemd Unit (.service)' : 'PowerShell 7 (.ps1)'),
      target_path: selectedOSKey === 'mac' ? '~/Library/LaunchAgents/com.starseed.astraura.daemon.plist' : '/etc/systemd/system/astraura.service',
      purpose: 'Demonio nativo de inicio automático y gestión de memoria 1.58b',
      content_preview: `# StarSeed Cognitive OS - Adaptación Inteligente de Formatos para ${selectedOSKey.toUpperCase()}`
    }
  ];

  return (
    <form onSubmit={handleSave} className="flex flex-col h-full bg-[#08090d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-white flex items-center gap-2">
              <Sliders className="w-6 h-6 text-cyan-400" />
              Configuración & Preferencias del Sistema
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono">
              Astraura 1.58b Core
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Proveedor Oficial: <b className="text-purple-300">StarSeed Cognitive OS</b> • Gestión de SO, inferencia ternaria y privacidad.
          </p>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 self-start sm:self-auto transition-all cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{savedSuccess ? '¡Guardado con Éxito!' : 'Guardar Preferencias'}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: GESTIÓN, MODIFICACIÓN & ACTUALIZACIÓN DEL SISTEMA OPERATIVO */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-[#0e121e] to-[#080a12] border border-cyan-500/30 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              Gestión, Modificación & Actualización del Sistema Operativo
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Adaptación inteligente de formatos, drivers y binarios para todas las versiones instalables de SO (macOS, Linux, Windows, Android, iOS).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              Proveedor: StarSeed
            </span>
          </div>
        </div>

        {/* OS Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {[
            { id: 'mac', label: 'macOS (Apple Silicon & Intel)', icon: Apple },
            { id: 'linux', label: 'Linux (Ubuntu/Arch/Debian)', icon: Laptop },
            { id: 'windows', label: 'Windows (PowerShell 7+)', icon: Laptop },
            { id: 'android', label: 'Android (Termux / Native)', icon: Smartphone },
            { id: 'ios', label: 'iOS / WebAssembly (PWA)', icon: Smartphone }
          ].map((os) => {
            const Icon = os.icon;
            const isSelected = selectedOSKey === os.id;
            return (
              <button
                type="button"
                key={os.id}
                onClick={() => setSelectedOSKey(os.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50 shadow-md'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{os.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dual Mode Switcher: Actualizaciones vs Modificación */}
        <div className="flex items-center gap-2 p-1 bg-black/50 rounded-xl border border-white/10 w-fit">
          <button
            type="button"
            onClick={() => setActiveOSTab('update')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeOSTab === 'update'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DownloadCloud className="w-4 h-4" />
            <span>🔄 Actualizar Sistema Operativo (StarSeed)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveOSTab('modify')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeOSTab === 'modify'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>🛠️ Modificar Sistema Operativo (Requiere Permisos)</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SUBTAB 1: ACTUALIZACIONES OFICIALES (PROVEEDOR STARSEED / ASTRAURA) */}
        {/* ========================================================================= */}
        {activeOSTab === 'update' && (
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-4 font-mono text-xs">
            {/* Auto-Update Settings from Provider */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-white/10">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-cyan-400" />
                    Actualizaciones Automáticas de StarSeed
                  </span>
                  <input
                    type="checkbox"
                    checked={autoInstallUpdates}
                    onChange={(e) => setAutoInstallUpdates(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  Buscar e instalar actualizaciones automáticamente de la misma línea de proveedor de software (<b>StarSeed Cognitive OS / Astraura 1.58b</b>) con verificación criptográfica SHA-256.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <label className="text-slate-300 block font-bold">Canal de Distribución de Software:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'stable', label: 'Estable 1.58b', badge: 'v2.4.1' },
                    { id: 'beta', label: 'Beta Ciberdélica', badge: 'v2.5.0-b2' },
                    { id: 'nightly', label: 'Nightly Canary', badge: 'v2.6.0-q' }
                  ].map((ch) => (
                    <button
                      type="button"
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch.id)}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        selectedChannel === ch.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 font-bold'
                          : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-[10px]">{ch.label}</div>
                      <div className="text-[9px] text-slate-500">{ch.badge}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Check Updates Actions & Results */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCheckUpdates}
                  disabled={isCheckingUpdates}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                  <span>{isCheckingUpdates ? 'Comprobando Repositorio...' : 'Buscar Actualizaciones Ahora'}</span>
                </button>

                <span className="text-[11px] text-slate-400">
                  Versión actual: <b className="text-white">v2.4.1-sovereign</b>
                </span>
              </div>

              {updateCheckResult?.has_update && (
                <button
                  type="button"
                  onClick={handleInstallUpdate}
                  disabled={isInstallingUpdate}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition-all disabled:opacity-50"
                >
                  <DownloadCloud className={`w-4 h-4 ${isInstallingUpdate ? 'animate-bounce' : ''}`} />
                  <span>{isInstallingUpdate ? 'Instalando Paquete...' : `Instalar ${updateCheckResult.latest_version}`}</span>
                </button>
              )}
            </div>

            {/* Update Result Display */}
            {updateCheckResult && (
              <div className="p-4 rounded-xl bg-[#090e18] border border-cyan-500/30 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Línea de Proveedor: {updateCheckResult.provider} ({updateCheckResult.release_name})</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    Paquete Inteligente: {updateCheckResult.smart_adapted_package}
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-slate-400 font-bold block text-[10px]">Registro de Cambios (Changelog Oficial):</span>
                  <ul className="space-y-1 pl-3 list-disc text-slate-300 text-[11px]">
                    {(updateCheckResult.changelog || []).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-white/5 font-mono">
                  <span>SHA-256: {updateCheckResult.sha256_hash?.slice(0, 24)}...</span>
                  <span>Tamaño de Descarga: {updateCheckResult.download_size_mb} MB</span>
                </div>
              </div>
            )}

            {updateInstallResult && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{updateInstallResult.message}</span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans">
                  Los binarios adaptados para <b>{selectedOSKey.toUpperCase()}</b> han sido desplegados y verificados con éxito.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 2: MODIFICAR SISTEMA OPERATIVO (REQUIERE PERMISOS TOTALES) */}
        {/* ========================================================================= */}
        {activeOSTab === 'modify' && (
          <div className="p-4 rounded-xl bg-black/40 border border-purple-500/30 space-y-4 font-mono text-xs">
            {/* Security Notice & Permissions Banner */}
            <div className={`p-4 rounded-xl border transition-all ${
              userPermissionsGranted 
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
                : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {userPermissionsGranted ? (
                    <Unlock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm">
                      {userPermissionsGranted 
                        ? '🛡️ Permisos de Administración & Seguridad Habilitados' 
                        : '🔒 Modificación Estructural del SO: Requiere Consentimiento Total del Usuario'}
                    </h4>
                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                      La modificación del Sistema Operativo adapta archivos de arranque, demonios nativos, buffers de memoria y kernels de aceleración vectorial en el host anfitrión.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={userPermissionsGranted}
                    onChange={(e) => setUserPermissionsGranted(e.target.checked)}
                    className="w-4 h-4 accent-purple-500 rounded"
                  />
                  <span className="font-bold text-white text-xs">Otorgar Todos los Permisos</span>
                </label>
              </div>
            </div>

            {/* Smart Format Adaptation Files Viewer */}
            <div className="space-y-2">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-purple-400" />
                Archivos y Formatos Adaptados Inteligentes para {selectedOSKey.toUpperCase()}:
              </span>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* File list */}
                <div className="space-y-1.5">
                  {smartFormats.map((fmt, fIdx) => (
                    <button
                      type="button"
                      key={fIdx}
                      onClick={() => setActiveFilePreviewIdx(fIdx)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer ${
                        activeFilePreviewIdx === fIdx
                          ? 'bg-purple-500/20 border-purple-500/50 text-white'
                          : 'bg-black/50 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileCode className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-bold truncate text-[11px]">{fmt.filename}</div>
                        <div className="text-[9px] text-slate-500 truncate">{fmt.format_type}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* File Preview */}
                <div className="lg:col-span-2 p-3 rounded-xl bg-black/80 border border-white/10 space-y-2 overflow-hidden">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-white/5 pb-1.5">
                    <span className="font-bold text-cyan-300">{smartFormats[activeFilePreviewIdx]?.filename}</span>
                    <span className="text-slate-500 font-mono">{smartFormats[activeFilePreviewIdx]?.target_path}</span>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-black/60 font-mono text-[10px] text-slate-300 max-h-40 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed border border-white/5">
                    {smartFormats[activeFilePreviewIdx]?.content_preview}
                  </pre>
                  <p className="text-[10px] text-slate-400 font-sans">
                    💡 <b>Propósito:</b> {smartFormats[activeFilePreviewIdx]?.purpose}
                  </p>
                </div>
              </div>
            </div>

            {/* Customization Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modToggles.autoStartDaemon}
                  onChange={(e) => setModToggles({ ...modToggles, autoStartDaemon: e.target.checked })}
                  className="accent-purple-500 rounded"
                />
                <span className="text-slate-300">Registrar demonio de arranque en el SO</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modToggles.vectorNeonTuning}
                  onChange={(e) => setModToggles({ ...modToggles, vectorNeonTuning: e.target.checked })}
                  className="accent-purple-500 rounded"
                />
                <span className="text-slate-300">Ajuste de aceleración vectorial NEON / AVX-512</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modToggles.swapMemoryTuning}
                  onChange={(e) => setModToggles({ ...modToggles, swapMemoryTuning: e.target.checked })}
                  className="accent-purple-500 rounded"
                />
                <span className="text-slate-300">Optimización de memoria swap ternaria 1.58b</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modToggles.npuSensorUdev}
                  onChange={(e) => setModToggles({ ...modToggles, npuSensorUdev: e.target.checked })}
                  className="accent-purple-500 rounded"
                />
                <span className="text-slate-300">Reglas directas de acceso a sensores y NPU</span>
              </label>
            </div>

            {/* Action Button: Apply Modifications */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[11px] text-slate-400">
                Estado: {userPermissionsGranted ? '🟢 Listo para modificar' : '🔴 Bloqueado (Falta autorización)'}
              </span>

              <button
                type="button"
                onClick={handleApplyModifications}
                disabled={!userPermissionsGranted || isApplyingModifications}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-950/50 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className={`w-4 h-4 ${isApplyingModifications ? 'animate-spin' : ''}`} />
                <span>{isApplyingModifications ? 'Aplicando Modificaciones...' : 'Aplicar Modificaciones al Sistema'}</span>
              </button>
            </div>

            {modificationResult && (
              <div className={`p-3.5 rounded-xl border space-y-1 ${
                modificationResult.success 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  {modificationResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{modificationResult.message || modificationResult.error}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid of Other Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category 1: Inferencia & Motor */}
        <div className="p-5 rounded-2xl glass-panel border-cyan-500/30 space-y-4 shadow-lg">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Parámetros del Motor 1.58 Bits
          </h3>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="text-slate-300 block mb-1">Temperatura de Inferencia: {localSettings.temperature}</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={localSettings.temperature}
                onChange={e => setLocalSettings({...localSettings, temperature: parseFloat(e.target.value)})}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Hilos de Cálculo: {localSettings.threads} Núcleos</label>
              <input
                type="range"
                min="1"
                max="16"
                value={localSettings.threads}
                onChange={e => setLocalSettings({...localSettings, threads: parseInt(e.target.value)})}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Prompt de Sistema Predeterminado</label>
              <textarea
                rows={3}
                value={localSettings.systemPrompt}
                onChange={e => setLocalSettings({...localSettings, systemPrompt: e.target.value})}
                className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Category 2: Tema Trinity & Experiencia */}
        <div className="p-5 rounded-2xl glass-panel border-purple-500/30 space-y-4 shadow-lg">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-400" />
            Tema Visual & Experiencia Trinity
          </h3>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <label className="text-slate-300 block mb-2">Paleta de Color Primaria</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cyan', label: 'Zenith Cyan (AI / Cognición)', color: 'from-cyan-500 to-blue-500' },
                  { id: 'emerald', label: 'Creation Green (Memoria)', color: 'from-emerald-500 to-teal-500' },
                  { id: 'gold', label: 'Logic Gold (Hardware / Shell)', color: 'from-amber-500 to-orange-500' },
                  { id: 'crimson', label: 'Anchor Crimson (Ciberdelia)', color: 'from-pink-500 to-rose-500' }
                ].map(th => (
                  <button
                    type="button"
                    key={th.id}
                    onClick={() => setLocalSettings({...localSettings, theme: th.id})}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2 ${
                      localSettings.theme === th.id
                        ? 'bg-purple-500/20 border-purple-500/50 text-white'
                        : 'bg-black/40 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full bg-gradient-to-tr ${th.color}`} />
                    <span className="truncate">{th.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 space-y-3 border-t border-white/5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.enableDreamEngine}
                  onChange={e => setLocalSettings({...localSettings, enableDreamEngine: e.target.checked})}
                  className="rounded accent-purple-400"
                />
                <span className="text-slate-300">Activar Motor Onírico (Dream Studio en segundo plano)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.soundEffects}
                  onChange={e => setLocalSettings({...localSettings, soundEffects: e.target.checked})}
                  className="rounded accent-purple-400"
                />
                <span className="text-slate-300">Retroalimentación de voz y efectos sonoros</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.airGapPrivacy}
                  onChange={e => setLocalSettings({...localSettings, airGapPrivacy: e.target.checked})}
                  className="rounded accent-purple-400"
                />
                <span className="text-slate-300">Modo Soberanía Total / Air-Gap (Sin conexiones remotas)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
