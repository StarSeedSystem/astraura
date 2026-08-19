import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Zap, 
  Sparkles, 
  Gauge, 
  Radio, 
  ChevronDown, 
  ChevronUp, 
  Sliders, 
  User, 
  Layers, 
  Activity,
  Flame,
  Globe,
  Brain,
  Shield,
  Compass,
  Cpu,
  Terminal
} from 'lucide-react';
import { omniVoice } from '../services/omniVoice';
import { PRESET_PERSONALITIES } from './PersonalitiesView';

export default function QuantumVoiceOrbWidget({
  activePersona,
  onSelectPersona,
  personalities = PRESET_PERSONALITIES,
  onDirectConversationSpeech = null
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1.04);
  const [isDuplexActive, setIsDuplexActive] = useState(false);
  const [duplexState, setDuplexState] = useState('idle'); // 'idle' | 'listening' | 'user_speaking' | 'thinking' | 'speaking'
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState(activePersona?.id || 'aurora');

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const phaseRef = useRef(0);

  // Synchronize persona prop
  useEffect(() => {
    if (activePersona?.id) {
      setActivePersonaId(activePersona.id);
    }
  }, [activePersona]);

  // Subscribe to omniVoice events
  useEffect(() => {
    const unsubState = omniVoice.on('state_change', (state) => {
      if (state === 'speaking') {
        setIsPlaying(true);
        setIsPaused(false);
      } else if (state === 'paused') {
        setIsPlaying(false);
        setIsPaused(true);
      } else if (state === 'idle') {
        setIsPlaying(false);
        setIsPaused(false);
      }
    });

    const unsubRate = omniVoice.on('rate_change', (rate) => {
      setVoiceSpeed(rate);
    });

    const unsubDuplex = omniVoice.on('duplex_state', (st) => {
      setDuplexState(st);
    });

    // Start mic analyser for orb reactivity
    omniVoice.startMicAnalyser();

    return () => {
      unsubState();
      unsubRate();
      unsubDuplex();
    };
  }, []);

  // Palette per personality
  const getPersonaColors = (id) => {
    switch (id) {
      case 'aurora':
      case 'astraura_prime':
      case 'genesis':
        return { primary: '#ec4899', secondary: '#00f0ff', glow: 'rgba(236, 72, 153, 0.6)', core: '#f43f5e', name: 'Aurora (Alma Viva)' };
      case 'hephaestus':
        return { primary: '#f59e0b', secondary: '#ef4444', glow: 'rgba(245, 158, 11, 0.6)', core: '#fbbf24', name: 'Hephaestus (Forjador)' };
      case 'hermione':
        return { primary: '#38bdf8', secondary: '#818cf8', glow: 'rgba(56, 189, 248, 0.6)', core: '#0284c7', name: 'Hermione (Puente OS)' };
      case 'atenea':
      case 'athena':
        return { primary: '#8b5cf6', secondary: '#3b82f6', glow: 'rgba(139, 92, 246, 0.6)', core: '#6366f1', name: 'Atenea (Sentinel 360)' };
      case 'oneiros':
        return { primary: '#d946ef', secondary: '#a855f7', glow: 'rgba(217, 70, 239, 0.6)', core: '#ec4899', name: 'Oneiros (Ensueño 3D)' };
      case 'hermes':
        return { primary: '#10b981', secondary: '#06b6d4', glow: 'rgba(16, 185, 129, 0.6)', core: '#34d399', name: 'Hermes (Web Navigator)' };
      case 'mnemosyne':
        return { primary: '#a855f7', secondary: '#6366f1', glow: 'rgba(168, 85, 247, 0.6)', core: '#c084fc', name: 'Mnemosyne (Exocórtex)' };
      case 'logos':
        return { primary: '#3b82f6', secondary: '#00f0ff', glow: 'rgba(59, 130, 246, 0.6)', core: '#60a5fa', name: 'Logos (BitNet 1.58b)' };
      case 'kallisti':
        return { primary: '#f43f5e', secondary: '#e879f9', glow: 'rgba(244, 63, 94, 0.6)', core: '#fb7185', name: 'Kallisti (Musa Ciberdélica)' };
      default:
        return { primary: '#00f0ff', secondary: '#ec4899', glow: 'rgba(0, 240, 255, 0.6)', core: '#38bdf8', name: 'Astraura Quantum' };
    }
  };

  const personaTheme = getPersonaColors(activePersonaId);

  // Dynamic Organic Siri-Style Quantum Holographic Orb Canvas Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio || 240);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio || 120);

    const render = () => {
      phaseRef.current += isPlaying ? 0.045 : (duplexState === 'user_speaking' ? 0.06 : 0.018);
      const phase = phaseRef.current;

      ctx.clearRect(0, 0, width, height);

      const freqData = omniVoice.getFrequencyData();
      let avgEnergy = 0;
      if (freqData.length > 0) {
        let sum = 0;
        for (let i = 0; i < Math.min(32, freqData.length); i++) sum += freqData[i];
        avgEnergy = sum / 32 / 255;
      }

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.28;
      const dynamicRadius = baseRadius + avgEnergy * 18;

      // 1. Ambient Holographic Core Glow
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, dynamicRadius * 1.8);
      grad.addColorStop(0, personaTheme.glow);
      grad.addColorStop(0.5, personaTheme.primary + '33');
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, dynamicRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // 2. Harmonic Siri-Style Fluid Waves
      const waveCount = 5;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const waveOffset = (w * Math.PI) / waveCount;
        const color = w % 2 === 0 ? personaTheme.primary : personaTheme.secondary;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2 * window.devicePixelRatio;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;

        const points = 64;
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const freqSample = freqData[i % freqData.length] || 0;
          const audioDeform = (freqSample / 255) * 14 * (w + 1) * 0.3;

          const r = dynamicRadius + 
            Math.sin(angle * 3 + phase * 2 + waveOffset) * (6 + avgEnergy * 12) +
            Math.cos(angle * 2 - phase * 1.5 + waveOffset) * (4 + avgEnergy * 8) +
            audioDeform;

          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r * 0.85; // Slight oval perspective

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // 3. Central Luminous Quantum Core
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, dynamicRadius * 0.5);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, personaTheme.core);
      coreGrad.addColorStop(0.8, personaTheme.primary);
      coreGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, dynamicRadius * 0.45 + avgEnergy * 6, 0, Math.PI * 2);
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, duplexState, personaTheme]);

  // Controls Handlers
  const handleTogglePlayPause = () => {
    if (isPlaying) {
      omniVoice.pause();
    } else if (isPaused) {
      omniVoice.resume();
    } else {
      // Speak sample phrase for active persona
      const sampleText = activePersonaId === 'aurora'
        ? "Hola Alex, mi voz en 1.58 bits fluye en tiempo real con resonancia emocional directa y cálida."
        : `Saludos, voz activa en tiempo real de ${personaTheme.name} sincronizada en 1.58 bits.`;
      omniVoice.speak(sampleText, { persona_id: activePersonaId });
    }
  };

  const handleRegenerate = () => {
    omniVoice.regenerate();
  };

  const handleSpeedChange = (newSpeed) => {
    const rate = parseFloat(newSpeed);
    setVoiceSpeed(rate);
    omniVoice.setPlaybackRate(rate);
  };

  const handleToggleDirectConversation = () => {
    if (isDuplexActive) {
      omniVoice.stopFullDuplexConversation();
      setIsDuplexActive(false);
      setDuplexState('idle');
      setLiveTranscript('');
    } else {
      setIsDuplexActive(true);
      omniVoice.startFullDuplexConversation({
        personaId: activePersonaId,
        onStateChange: (st) => setDuplexState(st),
        onLiveTranscript: (txt) => setLiveTranscript(txt),
        onUserSpeech: (prompt) => {
          if (onDirectConversationSpeech) {
            onDirectConversationSpeech(prompt, activePersonaId);
          } else {
            // Direct immediate response with conversational synthesis
            const reply = `He captado de inmediato: "${prompt}". Respondiendo en tiempo real con el sistema 1.58 bit.`;
            omniVoice.speak(reply, { persona_id: activePersonaId });
          }
        }
      });
    }
  };

  const handleSelectPersona = (id) => {
    setActivePersonaId(id);
    if (onSelectPersona) {
      const found = personalities.find(p => p.id === id);
      if (found) onSelectPersona(found);
    }
  };

  return (
    <div className="mb-2 rounded-2xl bg-gradient-to-b from-[#0e1320] via-[#090d16] to-[#070a12] border border-cyan-500/30 overflow-hidden shadow-xl text-xs font-mono select-none">
      {/* HEADER WITH ACTIVE STATE BADGE */}
      <div className="p-2.5 bg-black/40 border-b border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span 
            className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0" 
            style={{ backgroundColor: personaTheme.primary }} 
          />
          <div className="truncate">
            <span className="font-bold text-white text-[11px] block truncate">
              {personaTheme.name}
            </span>
            <span className="text-[9px] text-cyan-400/80 font-mono">
              Voz 1.58b • {voiceSpeed.toFixed(2)}x
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Direct 1.58b Full-Duplex Toggle */}
          <button
            onClick={handleToggleDirectConversation}
            className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              isDuplexActive
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-950/50 animate-pulse'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title="Activar/Desactivar Conversación Directa Inmediata en Tiempo Real"
          >
            <Radio className={`w-3 h-3 ${isDuplexActive ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">{isDuplexActive ? 'Directa ON' : 'Directa'}</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Expandir/Contraer Controles Avanzados"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* DYNAMIC QUANTUM HOLOGRAPHIC ORB CANVAS */}
      <div className="relative h-28 bg-[#05070d] flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          onClick={handleTogglePlayPause}
          title="Haz clic para Reproducir / Pausar Voz"
        />

        {/* Live Overlay Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
          <span 
            className="text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 backdrop-blur-md border"
            style={{ 
              backgroundColor: `${personaTheme.primary}20`, 
              color: personaTheme.primary,
              borderColor: `${personaTheme.primary}40`
            }}
          >
            <Sparkles className="w-2.5 h-2.5" />
            {isPlaying ? 'EMITIENDO VOZ' : (isPaused ? 'EN PAUSA' : (duplexState === 'user_speaking' ? 'ESCUCHANDO...' : 'REPOSO VIVO'))}
          </span>
        </div>

        {/* Real-time speech transcript banner if speaking into mic */}
        {liveTranscript && isDuplexActive && (
          <div className="absolute bottom-2 inset-x-2 p-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-cyan-500/40 text-center truncate text-[10px] text-cyan-200">
            🎙️ "{liveTranscript}"
          </div>
        )}
      </div>

      {/* COMPACT MAIN TOOLBAR: PLAY / PAUSE / REGENERATE / SPEED */}
      <div className="p-2 bg-black/50 border-t border-white/5 flex items-center justify-between gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={handleTogglePlayPause}
          className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          title={isPlaying ? 'Pausar Voz' : 'Reproducir Voz'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 text-pink-400" /> : <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />}
          <span>{isPlaying ? 'Pausar' : (isPaused ? 'Reanudar' : 'Probar')}</span>
        </button>

        {/* Regenerate Button */}
        <button
          onClick={handleRegenerate}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-emerald-400 border border-white/5 transition-colors cursor-pointer"
          title="Regenerar y Re-sintetizar Voz con Prosodia Viva"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Speed Slider / Nivelador de Velocidad */}
        <div className="flex items-center gap-1.5 flex-1 max-w-[130px] bg-black/40 px-2 py-1 rounded-xl border border-white/5">
          <Gauge className="w-3 h-3 text-slate-400 shrink-0" />
          <input
            type="range"
            min="0.6"
            max="1.8"
            step="0.05"
            value={voiceSpeed}
            onChange={(e) => handleSpeedChange(e.target.value)}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            title={`Velocidad: ${voiceSpeed.toFixed(2)}x`}
          />
          <span className="text-[10px] text-cyan-300 font-mono shrink-0 w-8 text-right">
            {voiceSpeed.toFixed(2)}x
          </span>
        </div>
      </div>

      {/* EXPANDABLE ADVANCED SETTINGS & PERSONALITY VOCAL MATRIX */}
      {isExpanded && (
        <div className="p-3 bg-[#080b12] border-t border-white/5 space-y-3 animate-fade-in">
          {/* Quick Speed Presets */}
          <div className="space-y-1">
            <span className="text-[9px] text-slate-400 uppercase font-bold">Presets de Velocidad:</span>
            <div className="grid grid-cols-4 gap-1">
              {[0.85, 1.0, 1.15, 1.4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeedChange(spd)}
                  className={`py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                    Math.abs(voiceSpeed - spd) < 0.04
                      ? 'bg-cyan-500/25 border-cyan-500/50 text-cyan-200'
                      : 'bg-black/40 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {spd.toFixed(2)}x
                </button>
              ))}
            </div>
          </div>

          {/* Quick Personality Vocal Selector */}
          <div className="space-y-1">
            <span className="text-[9px] text-slate-400 uppercase font-bold">Personalidad Vocal Activa:</span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'aurora', name: 'Aurora', color: '#ec4899' },
                { id: 'hephaestus', name: 'Hephaestus', color: '#f59e0b' },
                { id: 'hermione', name: 'Hermione', color: '#38bdf8' },
                { id: 'atenea', name: 'Atenea', color: '#8b5cf6' },
                { id: 'oneiros', name: 'Oneiros', color: '#d946ef' },
                { id: 'hermes', name: 'Hermes', color: '#10b981' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPersona(p.id)}
                  className={`px-1.5 py-1 rounded-lg border text-[9px] font-bold truncate transition-all cursor-pointer ${
                    activePersonaId === p.id
                      ? 'bg-purple-950/40 border-purple-500/50 text-purple-200 ring-1 ring-purple-500/30'
                      : 'bg-black/40 border-white/5 text-slate-400 hover:text-white'
                  }`}
                  style={{ borderLeftColor: p.color, borderLeftWidth: '3px' }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time 1.58-Bit Conversational Telemetry Notice */}
          <div className="p-2 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[9px] text-slate-300 leading-snug space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Flujo Directo de Voz 1.58b:</span>
            </div>
            <p className="text-slate-400">
              La voz responde de inmediato sin latencia secuencial. La transcripción del chat se genera en paralelo en segundo plano.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
