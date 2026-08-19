import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  MapPin, 
  Sun, 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  Compass, 
  Cpu, 
  HardDrive, 
  Globe, 
  Cloud, 
  CloudOff, 
  Sparkles, 
  FileText, 
  RefreshCw, 
  Check, 
  X, 
  AlertTriangle, 
  Sliders, 
  Zap, 
  RotateCcw,
  Activity,
  Radio,
  RadioTower,
  Database
} from 'lucide-react';
import { fetchPrivacySettings, updatePrivacySettings, toggleAirGapMode } from '../services/api';

export default function PrivacySecurityControlView() {
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  // Real Browser Native Permissions State
  const [browserPermissions, setBrowserPermissions] = useState({
    geolocation: 'prompt',
    microphone: 'prompt',
    camera: 'prompt',
    storage: 'prompt',
    deviceOrientation: 'supported'
  });

  const loadSettings = async () => {
    try {
      const data = await fetchPrivacySettings();
      setReport(data);
    } catch (err) {
      console.warn('Error loading privacy settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const inspectBrowserPermissions = async () => {
    if (!navigator.permissions) return;
    try {
      const perms = {};
      
      // 1. Geolocation
      try {
        const pGeo = await navigator.permissions.query({ name: 'geolocation' });
        perms.geolocation = pGeo.state;
      } catch (e) { perms.geolocation = 'unknown'; }

      // 2. Microphone
      try {
        const pMic = await navigator.permissions.query({ name: 'microphone' });
        perms.microphone = pMic.state;
      } catch (e) { perms.microphone = 'unknown'; }

      // 3. Camera
      try {
        const pCam = await navigator.permissions.query({ name: 'camera' });
        perms.camera = pCam.state;
      } catch (e) { perms.camera = 'unknown'; }

      // 4. Storage Persistence
      if (navigator.storage && navigator.storage.persisted) {
        const isPersisted = await navigator.storage.persisted();
        perms.storage = isPersisted ? 'granted' : 'prompt';
      }

      // 5. Device Orientation
      perms.deviceOrientation = window.DeviceOrientationEvent ? 'supported' : 'unsupported';

      setBrowserPermissions(prev => ({ ...prev, ...perms }));
    } catch (err) {
      console.warn('Permission query notice:', err);
    }
  };

  useEffect(() => {
    loadSettings();
    inspectBrowserPermissions();
    const interval = setInterval(loadSettings, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (key) => {
    if (!report) return;
    const currentSettings = report.settings || {};
    const newSettings = { ...currentSettings, [key]: !currentSettings[key] };
    
    try {
      await updatePrivacySettings(newSettings);
      setReport(prev => ({
        ...prev,
        settings: newSettings
      }));
      setToastMsg(`🛡️ Política '${key}' actualizada`);
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      alert(`Error al actualizar política: ${err.message}`);
    }
  };

  const handleSetOption = async (key, value) => {
    if (!report) return;
    const currentSettings = report.settings || {};
    const newSettings = { ...currentSettings, [key]: value };
    
    try {
      await updatePrivacySettings(newSettings);
      setReport(prev => ({
        ...prev,
        settings: newSettings
      }));
      setToastMsg(`🛡️ Ajuste '${key}' guardado`);
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      alert(`Error al actualizar: ${err.message}`);
    }
  };

  const handleToggleAirGap = async () => {
    try {
      const res = await toggleAirGapMode();
      if (res && res.success) {
        setReport(prev => ({
          ...prev,
          settings: { ...prev.settings, strict_air_gap_mode: res.air_gap_mode },
          air_gap_active: res.air_gap_mode
        }));
        setToastMsg(res.air_gap_mode ? '🔒 MODO AIR-GAP SOBERANO ACTIVADO' : '🔓 Modo Air-Gap Desactivado');
        setTimeout(() => setToastMsg(''), 3500);
        loadSettings();
      }
    } catch (err) {
      alert(`Error conmutando Air-Gap: ${err.message}`);
    }
  };

  // Browser Permission Request Handlers
  const requestNativeGeo = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          inspectBrowserPermissions();
          setToastMsg('📍 Permiso GPS concedido en el navegador');
        },
        () => {
          inspectBrowserPermissions();
          setToastMsg('⚠️ Permiso GPS denegado o cancelado');
        }
      );
    }
  };

  const requestNativeMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      inspectBrowserPermissions();
      setToastMsg('🎙️ Permiso de Micrófono concedido');
    } catch (e) {
      inspectBrowserPermissions();
      setToastMsg('⚠️ Permiso de Micrófono denegado');
    }
  };

  const requestNativeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      inspectBrowserPermissions();
      setToastMsg('📷 Permiso de Cámara concedido');
    } catch (e) {
      inspectBrowserPermissions();
      setToastMsg('⚠️ Permiso de Cámara denegado');
    }
  };

  const requestNativeStorage = async () => {
    if (navigator.storage && navigator.storage.persist) {
      const ok = await navigator.storage.persist();
      inspectBrowserPermissions();
      setToastMsg(ok ? '💾 Almacenamiento persistente activado' : '⚠️ No se concedió persistencia');
    }
  };

  const settings = report?.settings || {};
  const isAirGap = settings.strict_air_gap_mode || false;

  return (
    <div className="flex flex-col h-full bg-[#08090d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-4 sm:p-6 space-y-6 overflow-y-auto font-mono text-xs">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              Gobernanza de Privacidad & Control de Sensores
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono">
              Soberanía Local 100%
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Control de encendido/apagado granular para cada sensor, dato y medio del dispositivo con permisos reales del navegador y Apple Silicon M1.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {toastMsg && (
            <span className="text-xs px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 animate-fade-in">
              {toastMsg}
            </span>
          )}

          <button
            onClick={loadSettings}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
            title="Recargar configuración de privacidad"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* MASTER SOVEREIGN AIR-GAP SWITCH BANNER */}
      <div className={`p-4 rounded-2xl border transition-all shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isAirGap
          ? 'bg-gradient-to-r from-rose-950/40 via-red-950/20 to-black border-rose-500/50 shadow-rose-950/30'
          : 'bg-gradient-to-r from-emerald-950/30 via-[#0a1210] to-black border-emerald-500/30'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${
            isAirGap
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
              : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
          }`}>
            {isAirGap ? <Lock className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base text-white">
                {isAirGap ? 'Modo Soberano Air-Gap Activo' : 'Modo Conectado / Soberano Híbrido'}
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                isAirGap
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {isAirGap ? 'Aislamiento Total' : 'Operación Normal'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
              {isAirGap
                ? 'Todas las conexiones externas, consultas web y sincronizaciones de Google Drive están bloqueadas. La inferencia 1.58b opera 100% aislada en ARM NEON local.'
                : 'Sensores y datos disponibles según tus permisos individuales configurados a continuación. Todo el razonamiento ocurre en tu M1.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleAirGap}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all self-start sm:self-auto ${
            isAirGap
              ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/30 animate-pulse'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
          }`}
        >
          {isAirGap ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          <span>{isAirGap ? 'Desactivar Air-Gap' : 'Activar Modo Air-Gap'}</span>
        </button>
      </div>

      {/* SECTION 1: PERMISOS REALES DEL DISPOSITIVO Y NAVEGADOR */}
      <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <span className="font-bold text-white flex items-center gap-2 text-sm">
            <RadioTower className="w-4 h-4 text-cyan-400" />
            Permisos Reales del Dispositivo & Navegador (HTML5 Permissions API)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Detección en Tiempo Real</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Geolocation Permission */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Geolocalización GPS
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  browserPermissions.geolocation === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : browserPermissions.geolocation === 'denied'
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {browserPermissions.geolocation}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Coordenadas y altitud física.</p>
            </div>
            {browserPermissions.geolocation !== 'granted' && (
              <button
                onClick={requestNativeGeo}
                className="w-full py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold"
              >
                Solicitar Acceso GPS
              </button>
            )}
          </div>

          {/* Microphone Permission */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-purple-400" />
                  Micrófono & Acústica
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  browserPermissions.microphone === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : browserPermissions.microphone === 'denied'
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {browserPermissions.microphone}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Muestreo acústico en dB.</p>
            </div>
            {browserPermissions.microphone !== 'granted' && (
              <button
                onClick={requestNativeMic}
                className="w-full py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[10px] font-bold"
              >
                Solicitar Micrófono
              </button>
            )}
          </div>

          {/* Camera Permission */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  Cámara & Visión
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  browserPermissions.camera === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : browserPermissions.camera === 'denied'
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {browserPermissions.camera}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Entrada visual contextual.</p>
            </div>
            {browserPermissions.camera !== 'granted' && (
              <button
                onClick={requestNativeCamera}
                className="w-full py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold"
              >
                Solicitar Cámara
              </button>
            )}
          </div>

          {/* Persistent Storage */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  Disco Persistente
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  browserPermissions.storage === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {browserPermissions.storage}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Garantía contra purga de memoria.</p>
            </div>
            {browserPermissions.storage !== 'granted' && (
              <button
                onClick={requestNativeStorage}
                className="w-full py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold"
              >
                Activar Persistencia
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: INTERRUPTORES GRANULARES DE SENSORES Y DATOS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <span className="font-bold text-white flex items-center gap-2 text-sm">
            <Sliders className="w-4 h-4 text-purple-400" />
            Ajustes Granulares de Privacidad & Sensores (Encendido / Apagado)
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">
            {report?.protected_sensors_count || 0} sensores apagados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* 1. UBICACIÓN GPS */}
          <div className={`p-3.5 rounded-xl border transition-all space-y-2 ${
            settings.allow_gps_location ? 'bg-[#0c141f] border-cyan-500/30' : 'bg-black/40 border-white/5 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2 text-xs">
                <MapPin className="w-4 h-4 text-cyan-400" />
                Ubicación GPS Real
              </span>
              <input
                type="checkbox"
                checked={settings.allow_gps_location !== false}
                onChange={() => handleToggle('allow_gps_location')}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Permite a los cerebros conocer las coordenadas geográficas exactas.
            </p>
            {settings.allow_gps_location && (
              <div className="pt-1">
                <select
                  value={settings.location_precision || 'exact'}
                  onChange={(e) => handleSetOption('location_precision', e.target.value)}
                  className="w-full p-1 rounded bg-black/60 border border-white/10 text-white text-[10px]"
                >
                  <option value="exact">🎯 Precisión Exacta (GPS)</option>
                  <option value="coarse">🌐 Precisión Aproximada (Ciudad)</option>
                </select>
              </div>
            )}
          </div>

          {/* 2. CLIMA MULTI-FUENTE */}
          <div className={`p-3.5 rounded-xl border transition-all space-y-2 ${
            settings.allow_weather_sync ? 'bg-[#0c141f] border-cyan-500/30' : 'bg-black/40 border-white/5 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2 text-xs">
                <Sun className="w-4 h-4 text-amber-400" />
                Clima en Tiempo Real
              </span>
              <input
                type="checkbox"
                checked={settings.allow_weather_sync !== false}
                onChange={() => handleToggle('allow_weather_sync')}
                className="w-4 h-4 accent-amber-400 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Consulta servidores meteorológicos en vivo (Open-Meteo, Wttr.in).
            </p>
          </div>

          {/* 3. MICRÓFONO & ACÚSTICA */}
          <div className={`p-3.5 rounded-xl border transition-all space-y-2 ${
            settings.allow_microphone_stream ? 'bg-[#150f22] border-purple-500/30' : 'bg-black/40 border-white/5 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2 text-xs">
                <Mic className="w-4 h-4 text-purple-400" />
                Micrófono & Ruido (dB)
              </span>
              <input
                type="checkbox"
                checked={settings.allow_microphone_stream !== false}
                onChange={() => handleToggle('allow_microphone_stream')}
                className="w-4 h-4 accent-purple-400 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Lectura volátil del nivel sonoro ambiental en decibelios (sin guardar audio).
            </p>
          </div>

          {/* 4. CÁMARAS Y VISIÓN */}
          <div className={`p-3.5 rounded-xl border transition-all space-y-2 ${
            settings.allow_camera_access ? 'bg-[#150f22] border-purple-500/30' : 'bg-black/40 border-white/5 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2 text-xs">
                <Camera className="w-4 h-4 text-purple-400" />
                Cámara & Visión Contextual
              </span>
              <input
                type="checkbox"
                checked={settings.allow_camera_access !== false}
                onChange={() => handleToggle('allow_camera_access')}
                className="w-4 h-4 accent-purple-400 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Acceso a la cámara para capturas y análisis visual bajo demanda.
            </p>
          </div>

          {/* 5. BRÚJULA & MAGNETÓMETRO */}
          <div className={`p-3.5 rounded-xl border transition-all space-y-2 ${
            settings.allow_compass_orientation ? 'bg-[#0f1d18] border-emerald-500/30' : 'bg-black/40 border-white/5 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2 text-xs">
                <Compass className="w-4 h-4 text-emerald-400" />
                Brújula & Orientación
              </span>
              <input
                type="checkbox"
                checked={settings.allow_compass_orientation !== false}
                onChange={() => handleToggle('allow_compass_orientation')}
                className="w-4 h-4 accent-emerald-400 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Rumbo magnético en grados (0°-360°) y orientación espacial.
            </p>
          </div>

          {/* 6. GIROSCOPIO & ACELERACIÓN 3D */}
          <div className={`p-3.5 rounded-xl border transition-all space-y-2 ${
            settings.allow_gyroscope_motion ? 'bg-[#0f1d18] border-emerald-500/30' : 'bg-black/40 border-white/5 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2 text-xs">
                <Activity className="w-4 h-4 text-emerald-400" />
                Giroscopio & Ejes 3D
              </span>
              <input
                type="checkbox"
                checked={settings.allow_gyroscope_motion !== false}
                onChange={() => handleToggle('allow_gyroscope_motion')}
                className="w-4 h-4 accent-emerald-400 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Inclinación del dispositivo en ejes X (Pitch), Y (Roll), Z (Yaw).
            </p>
          </div>

          {/* 7. TELEMETRÍA DE HARDWARE M1 */}
          <div className={`p-3.5 rounded-xl border transition-all space-y-2 ${
            settings.allow_hardware_telemetry ? 'bg-[#0f1d18] border-emerald-500/30' : 'bg-black/40 border-white/5 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2 text-xs">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Telemetría M1 (8 Cores / RAM)
              </span>
              <input
                type="checkbox"
                checked={settings.allow_hardware_telemetry !== false}
                onChange={() => handleToggle('allow_hardware_telemetry')}
                className="w-4 h-4 accent-emerald-400 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Monitoreo de CPU, memoria unificada, batería y temperatura del silicio.
            </p>
          </div>

          {/* 8. BÚSQUEDA WEB Y BROWSER-USE */}
          <div className={`p-3.5 rounded-xl border transition-all space-y-2 ${
            settings.allow_external_web_search ? 'bg-[#0c141f] border-cyan-500/30' : 'bg-black/40 border-white/5 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2 text-xs">
                <Globe className="w-4 h-4 text-cyan-400" />
                Navegación & Búsqueda Web
              </span>
              <input
                type="checkbox"
                checked={settings.allow_external_web_search !== false}
                onChange={() => handleToggle('allow_external_web_search')}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Permite a los subagentes consultar fuentes externas y buscar en internet.
            </p>
          </div>

          {/* 9. SINCRONIZACIÓN EN LA NUBE */}
          <div className={`p-3.5 rounded-xl border transition-all space-y-2 ${
            settings.allow_cloud_sync ? 'bg-[#0c141f] border-cyan-500/30' : 'bg-black/40 border-white/5 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2 text-xs">
                <Cloud className="w-4 h-4 text-blue-400" />
                Sincronización en Nube (Drive/Supabase)
              </span>
              <input
                type="checkbox"
                checked={settings.allow_cloud_sync !== false}
                onChange={() => handleToggle('allow_cloud_sync')}
                className="w-4 h-4 accent-blue-400 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Sincronización de carpetas de Google Drive y bases de datos Supabase.
            </p>
          </div>

          {/* 10. IMAGINACIÓN SENSORIAL ALWAYS-ON */}
          <div className={`p-3.5 rounded-xl border transition-all space-y-2 ${
            settings.allow_sensory_imagination ? 'bg-[#150f22] border-purple-500/30' : 'bg-black/40 border-white/5 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2 text-xs">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Imaginación Sensorial Always-On
              </span>
              <input
                type="checkbox"
                checked={settings.allow_sensory_imagination !== false}
                onChange={() => handleToggle('allow_sensory_imagination')}
                className="w-4 h-4 accent-purple-400 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Permite a la imaginación continua alimentarse de los estímulos sensoriales.
            </p>
          </div>

          {/* 11. PERSISTENCIA DE LOGS */}
          <div className={`p-3.5 rounded-xl border transition-all space-y-2 ${
            settings.allow_persistent_logging ? 'bg-[#0f1d18] border-emerald-500/30' : 'bg-black/40 border-white/5 opacity-70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2 text-xs">
                <FileText className="w-4 h-4 text-emerald-400" />
                Persistencia de Logs en Disco
              </span>
              <input
                type="checkbox"
                checked={settings.allow_persistent_logging !== false}
                onChange={() => handleToggle('allow_persistent_logging')}
                className="w-4 h-4 accent-emerald-400 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Guarda trazas de ejecución en disco vs modo estrictamente en RAM.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: BITÁCORA DE AUDITORÍA DE PRIVACIDAD */}
      <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white flex items-center gap-2 text-sm">
            <Lock className="w-4 h-4 text-cyan-400" />
            Bitácora de Auditoría de Privacidad & Accesos
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {report?.audit_log?.length || 0} registros auditados
          </span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {(report?.audit_log || []).map((entry, idx) => (
            <div
              key={entry.id || idx}
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-[11px] text-slate-300"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="font-bold text-white truncate">{entry.event}</span>
                <span className="text-slate-400 text-[10px] truncate hidden sm:inline">({entry.details})</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                {new Date(entry.timestamp * 1000).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
