import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  Wind, 
  Thermometer, 
  Droplets, 
  Sun, 
  MapPin, 
  Activity, 
  Mic, 
  Camera, 
  Cpu, 
  Battery, 
  HardDrive, 
  RefreshCw, 
  ShieldCheck, 
  Eye, 
  Volume2, 
  Radio,
  Zap,
  Globe,
  Sliders,
  Clock,
  Layers,
  ChevronRight,
  TrendingUp,
  Wifi,
  Video,
  VideoOff,
  Sparkles,
  Copy,
  Check,
  Play,
  Square,
  Navigation,
  Edit3,
  SlidersHorizontal
} from 'lucide-react';
import { fetchSensoriumLive, updateClientSensors, fetchLiveWeather, updateSensoriumLocation } from '../services/api';
import { deviceContextDetector } from '../services/deviceContextDetector';

export default function Sensorium360View() {
  const [sensoriumData, setSensoriumData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSensorsListening, setIsSensorsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(42.0);
  const [dominantFreq, setDominantFreq] = useState(0);
  const [acousticPattern, setAcousticPattern] = useState('Silencio / Ambiente Basal');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isSpeechListening, setIsSpeechListening] = useState(false);
  
  // Camera & Computer Vision Pattern States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [fpsRate, setFpsRate] = useState(5);
  const [luxLevel, setLuxLevel] = useState(380);
  const [motionDelta, setMotionDelta] = useState(0.0);
  const [visualPattern, setVisualPattern] = useState('En espera de cámara');
  const [dominantColor, setDominantColor] = useState('#202535');
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Network & GPS metrics
  const [networkLatency, setNetworkLatency] = useState(12);
  const [networkInfo, setNetworkInfo] = useState({ type: 'WiFi / LAN', downlink: 100, rtt: 15 });
  const [deviceOrientation, setDeviceOrientation] = useState({ alpha: 42.5, beta: 2.4, gamma: -1.1 });
  const [toastMsg, setToastMsg] = useState('');

  // GPS Calibration State
  const [isCalibratingGPS, setIsCalibratingGPS] = useState(false);
  const [manualCity, setManualCity] = useState('');
  const [manualCoords, setManualCoords] = useState({ lat: '', lon: '' });

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastFrameDataRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const visionTimerRef = useRef(null);

  const loadSensorium = async () => {
    try {
      const data = await fetchSensoriumLive();
      if (data) setSensoriumData(data);
    } catch (err) {
      console.warn('Error fetching sensorium data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // High-Accuracy GPS Auto-Detection with Client IP Fallback & Persistent Storage
  const autoDetectGPS = async () => {
    try {
      const loc = await deviceContextDetector.detectPreciseLocation();
      if (loc) {
        await updateSensoriumLocation(loc);
        await updateClientSensors({ location: loc });
        if (loc.latitude && loc.longitude) {
          await fetchLiveWeather(loc.latitude, loc.longitude);
        }
        await loadSensorium();
        setToastMsg(`📍 Ubicación calibrada: ${loc.city}, ${loc.country}`);
        setTimeout(() => setToastMsg(''), 4000);
      }
    } catch (err) {
      console.warn('GPS auto-detect notice:', err.message);
    }
  };

  // Ping network check
  const checkPing = async () => {
    const start = performance.now();
    try {
      await fetch('/api/status');
      const latency = Math.round(performance.now() - start);
      setNetworkLatency(latency);
    } catch {
      setNetworkLatency(25);
    }
  };

  useEffect(() => {
    loadSensorium();
    checkPing();
    autoDetectGPS();

    const interval = setInterval(() => {
      loadSensorium();
      checkPing();
    }, 8000);

    if (navigator.connection) {
      const conn = navigator.connection;
      setNetworkInfo({
        type: conn.effectiveType ? `${conn.effectiveType.toUpperCase()} (${conn.type || 'Inalámbrica'})` : 'Banda Ancha',
        downlink: conn.downlink || 50,
        rtt: conn.rtt || 20
      });
    }

    return () => clearInterval(interval);
  }, []);

  const handleApplyManualLocation = async () => {
    if (!manualCity.trim() && (!manualCoords.lat || !manualCoords.lon)) return;
    try {
      let lat = parseFloat(manualCoords.lat) || 20.6597;
      let lon = parseFloat(manualCoords.lon) || -103.3496;

      if (manualCity.trim() && (!manualCoords.lat || !manualCoords.lon)) {
        // Geocode city name
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualCity.trim())}&limit=1`);
        if (geoRes.ok) {
          const list = await geoRes.json();
          if (list && list[0]) {
            lat = parseFloat(list[0].lat);
            lon = parseFloat(list[0].lon);
          }
        }
      }

      const loc = {
        latitude: lat,
        longitude: lon,
        altitude_m: 1566,
        city: manualCity.trim() || 'Ubicación Calibrada',
        region: 'Manual',
        country: 'Personalizado',
        source: 'Calibración Manual de Usuario'
      };

      try {
        localStorage.setItem('astraura_calibrated_location', JSON.stringify(loc));
      } catch {}

      await updateSensoriumLocation(loc);
      await updateClientSensors({ location: loc });
      await fetchLiveWeather(lat, lon);
      await loadSensorium();
      setIsCalibratingGPS(false);
      setToastMsg(`✅ Ubicación manual aplicada: ${loc.city}`);
      setTimeout(() => setToastMsg(''), 3000);
    } catch (e) {
      alert(`Error calibrando ubicación: ${e.message}`);
    }
  };

  // HTML5 Device Senses (Microphone, Geolocation, Orientation)
  const enableNativeBrowserSensors = async () => {
    setIsSensorsListening(true);
    setToastMsg('Activando sensores nativos del dispositivo...');
    autoDetectGPS();

    // 2. Device Orientation & Gyroscope
    if (window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const perm = await DeviceOrientationEvent.requestPermission();
          if (perm !== 'granted') console.warn('Device orientation not granted');
        } catch {}
      }
      window.addEventListener('deviceorientation', (e) => {
        if (e.alpha !== null) {
          const heading = Math.round(e.alpha);
          let cardinal = 'N';
          if (heading >= 22.5 && heading < 67.5) cardinal = 'NE';
          else if (heading >= 67.5 && heading < 112.5) cardinal = 'E';
          else if (heading >= 112.5 && heading < 157.5) cardinal = 'SE';
          else if (heading >= 157.5 && heading < 202.5) cardinal = 'S';
          else if (heading >= 202.5 && heading < 247.5) cardinal = 'SW';
          else if (heading >= 247.5 && heading < 292.5) cardinal = 'W';
          else if (heading >= 292.5 && heading < 337.5) cardinal = 'NW';

          setDeviceOrientation({
            alpha: heading,
            beta: Math.round(e.beta || 0),
            gamma: Math.round(e.gamma || 0)
          });

          updateClientSensors({
            compass: { heading_deg: heading, cardinal, accuracy: 'High (±1°)' },
            gyroscope: { pitch_x: Math.round(e.beta || 0), roll_y: Math.round(e.gamma || 0), yaw_z: heading }
          });
        }
      });
    }

    // 3. WebAudio Real FFT & Acoustic Pattern Classifier
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const timeData = new Uint8Array(analyser.fftSize);

      const updateAudio = () => {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);

        let sumSquares = 0;
        for (let i = 0; i < timeData.length; i++) {
          const norm = (timeData[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / timeData.length);
        const db = Math.round(30 + rms * 65);
        setAudioLevel(db);

        let maxVal = 0;
        let maxIdx = 0;
        for (let i = 0; i < freqData.length; i++) {
          if (freqData[i] > maxVal) {
            maxVal = freqData[i];
            maxIdx = i;
          }
        }
        const nyquist = audioCtx.sampleRate / 2;
        const domHz = Math.round((maxIdx / freqData.length) * nyquist);
        setDominantFreq(domHz);

        if (db < 36) {
          setAcousticPattern('🍃 Silencio / Ambiente Basal');
        } else if (domHz >= 85 && domHz <= 350 && db > 42) {
          setAcousticPattern('🗣️ Voz Humana / Diálogo');
        } else if (domHz > 1200) {
          setAcousticPattern('⚡ Sonido Agudo / Frecuencia Alta');
        } else {
          setAcousticPattern('🎧 Ruido Ambiental / Teclado');
        }

        updateClientSensors({
          microphone: { ambient_db: db, noise_level: `${db} dB RMS`, frequency_peak_hz: domHz, active: true }
        });

        animFrameRef.current = requestAnimationFrame(updateAudio);
      };

      updateAudio();
    } catch (e) {
      console.warn('Microphone stream error:', e);
    }
  };

  const weather = sensoriumData?.weather || {};
  const location = sensoriumData?.location || {};
  const hardware = sensoriumData?.hardware || {};

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner with Vibrant Nebula Glow */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0c1222] via-[#15102a] to-[#08101a] border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/30 via-purple-500/20 to-emerald-500/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-xl shadow-cyan-950/40">
              <Activity className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white font-display tracking-wide">
                  Sensorium 360° // Conciencia Perceptual en Tiempo Real
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/40 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  GPS & Hardware Vivos
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Fusión de telemetría M1, GPS de alta precisión, brújula magnética, acústica y visión espacial.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {toastMsg && (
              <span className="text-xs px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono animate-fade-in font-bold">
                {toastMsg}
              </span>
            )}

            <button
              onClick={() => setIsCalibratingGPS(!isCalibratingGPS)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold flex items-center gap-1.5 border border-white/10 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Calibrar GPS
            </button>

            <button
              onClick={enableNativeBrowserSensors}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                isSensorsListening 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25' 
                  : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-slate-950 shadow-cyan-500/25'
              }`}
            >
              <Radio className="w-4 h-4 animate-spin" />
              {isSensorsListening ? 'Sensores Nativos Activos' : 'Activar Sensores 360°'}
            </button>
          </div>
        </div>

        {/* GPS Calibration Bar (if opened) */}
        {isCalibratingGPS && (
          <div className="mt-4 pt-4 border-t border-white/10 p-4 bg-black/60 rounded-2xl border border-cyan-500/30 space-y-3 font-mono text-xs animate-fade-in">
            <span className="text-cyan-300 font-bold block">📍 Calibrar Ubicación Exacta / Coordenadas GPS</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Ciudad / Estado (ej: Guadalajara, México)"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                placeholder="Latitud (ej: 20.6597)"
                value={manualCoords.lat}
                onChange={(e) => setManualCoords({ ...manualCoords, lat: e.target.value })}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                placeholder="Longitud (ej: -103.3496)"
                value={manualCoords.lon}
                onChange={(e) => setManualCoords({ ...manualCoords, lon: e.target.value })}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={autoDetectGPS}
                className="px-3 py-1.5 rounded-xl bg-white/10 text-slate-300 hover:text-white"
              >
                Auto-Detectar con GPS
              </button>
              <button
                onClick={handleApplyManualLocation}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
              >
                Guardar Ubicación
              </button>
            </div>
          </div>
        )}

        {/* Live Environmental Overview Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/10 font-mono text-xs">
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 block flex items-center gap-1">
              <MapPin className="w-3 h-3 text-rose-400" /> Ubicación
            </span>
            <span className="text-sm font-bold text-white truncate block">
              {location.city || 'Guadalajara'}, {location.country || 'México'}
            </span>
            <span className="text-[9px] text-slate-500">
              {location.latitude?.toFixed(4)}°, {location.longitude?.toFixed(4)}°
            </span>
          </div>

          <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 block flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-amber-400" /> Clima
            </span>
            <span className="text-sm font-bold text-amber-300">
              {weather.temperature_c || 24.5}°C
            </span>
            <span className="text-[9px] text-slate-500 block truncate">
              {weather.condition || 'Parcialmente Nublado'} ({weather.humidity_percent || 48}% hum)
            </span>
          </div>

          <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 block flex items-center gap-1">
              <Mic className="w-3 h-3 text-purple-400" /> Acústica
            </span>
            <span className="text-sm font-bold text-purple-300">
              {audioLevel} dB RMS
            </span>
            <span className="text-[9px] text-slate-500 block truncate">
              {dominantFreq} Hz // {acousticPattern.slice(0, 18)}
            </span>
          </div>

          <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 block flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-400" /> Orientación
            </span>
            <span className="text-sm font-bold text-cyan-300">
              {deviceOrientation.alpha}° NE
            </span>
            <span className="text-[9px] text-slate-500 block">
              Pitch: {deviceOrientation.beta}° | Roll: {deviceOrientation.gamma}°
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Sensory Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Multi-Source Weather & Forecast */}
        <div className="p-6 rounded-3xl bg-[#0c101a] border border-amber-500/20 shadow-xl space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              Estación Meteorológica Multi-Fuente (Promedio Ponderado)
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Open-Meteo & Wttr.in
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block">Sensación Térmica</span>
              <span className="text-base font-bold text-amber-200">{weather.feels_like_c || 25}°C</span>
            </div>
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block">Presión Atmosférica</span>
              <span className="text-base font-bold text-cyan-200">{weather.pressure_hpa || 1014} hPa</span>
            </div>
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block">Velocidad Viento</span>
              <span className="text-base font-bold text-emerald-200">{weather.wind_speed_kmh || 12.4} km/h</span>
            </div>
          </div>

          {/* 7-Day Forecast */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-bold text-slate-300 block">Predicción a 7 Días</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {weather.forecast_7d?.slice(0, 4).map((f, i) => (
                <div key={i} className="p-2.5 bg-black/30 rounded-xl border border-white/5 text-[11px]">
                  <span className="font-bold text-slate-300 block">{f.day}</span>
                  <span className="text-amber-300 font-bold">{f.temp_max}° / {f.temp_min}°</span>
                  <span className="text-[9px] text-slate-500 block truncate">{f.condition}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 2: Hardware Telemetry Apple Silicon M1 */}
        <div className="p-6 rounded-3xl bg-[#0c101a] border border-cyan-500/20 shadow-xl space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Telemetría de Silicio M1 (8 Núcleos ARM NEON)
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Inferencia Ternaria i2_s
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block">CPU Load M1</span>
              <span className="text-base font-bold text-cyan-300">{hardware.cpu_percent || 18}%</span>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-cyan-400 h-full" style={{ width: `${hardware.cpu_percent || 18}%` }} />
              </div>
            </div>

            <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block">Memoria RAM Unificada</span>
              <span className="text-base font-bold text-purple-300">{hardware.ram_used_gb || 4.2} GB / {hardware.ram_total_gb || 8} GB</span>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-purple-400 h-full" style={{ width: `${hardware.ram_percent || 52}%` }} />
              </div>
            </div>
          </div>

          <div className="p-3 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Batería del Sistema:</span>
            </div>
            <span className="font-bold text-emerald-300">
              {hardware.battery?.percent || 100}% {hardware.battery?.is_charging ? '(Cargando)' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
