import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  X, 
  Gauge, 
  RefreshCw,
  Layers
} from 'lucide-react';
import { omniVoice } from '../services/omniVoice';

export default function FloatingQuantumVoiceOrb({
  activePersona,
  onSelectPersona,
  onDirectConversationSpeech
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDuplexActive, setIsDuplexActive] = useState(false);
  const [duplexState, setDuplexState] = useState('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1.04);
  const [livePersonaId, setLivePersonaId] = useState(activePersona?.id || 'aurora');
  const [livePersonaName, setLivePersonaName] = useState(activePersona?.name || 'Aurora');
  const [liveSpokenClause, setLiveSpokenClause] = useState('');
  const [liveSpokenWord, setLiveSpokenWord] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const phaseRef = useRef(0);
  const particlesRef = useRef([]);

  // Sync active persona
  useEffect(() => {
    if (activePersona?.id && !isPlaying) {
      setLivePersonaId(activePersona.id);
      setLivePersonaName(activePersona.name || activePersona.id);
    }
  }, [activePersona, isPlaying]);

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
        setLiveSpokenClause('');
        setLiveSpokenWord('');
        setLivePersonaId(activePersona?.id || 'aurora');
      }
    });

    const unsubRate = omniVoice.on('rate_change', (r) => setVoiceSpeed(r));
    const unsubDuplex = omniVoice.on('duplex_state', (st) => setDuplexState(st));
    
    const unsubPersona = omniVoice.on('persona_change', (p) => {
      if (p?.id) {
        setLivePersonaId(p.id);
        setLivePersonaName(p.name || p.shortName || p.id);
      }
    });

    const unsubSpeaker = omniVoice.on('speaker_info', (info) => {
      if (info?.persona?.id) {
        setLivePersonaId(info.persona.id);
        setLivePersonaName(info.speaker || info.persona.name);
      }
    });

    const unsubClause = omniVoice.on('clause_start', (c) => {
      if (c) {
        setLiveSpokenClause(c.clauseText || '');
        if (c.personaId) {
          setLivePersonaId(c.personaId);
          setLivePersonaName(c.personaName || c.personaId);
        }
      }
    });

    const unsubWord = omniVoice.on('word_boundary', (w) => {
      if (w) {
        setLiveSpokenWord(w.word || '');
        if (w.clauseText) setLiveSpokenClause(w.clauseText);
        if (w.personaId) {
          setLivePersonaId(w.personaId);
          setLivePersonaName(w.personaName || w.personaId);
        }
      }
    });

    return () => {
      unsubState();
      unsubRate();
      unsubDuplex();
      unsubPersona();
      unsubSpeaker();
      unsubClause();
      unsubWord();
    };
  }, [activePersona]);

  // Persona Colors
  const getPersonaColor = (id) => {
    const clean = (id || '').toLowerCase().trim();
    switch (clean) {
      case 'hephaestus':
      case 'hefestos':
        return { primary: '#f59e0b', secondary: '#ef4444', glow: 'rgba(245, 158, 11, 0.7)', name: 'Hephaestus', icon: '⚒️' };
      case 'hermione':
        return { primary: '#38bdf8', secondary: '#0284c7', glow: 'rgba(56, 189, 248, 0.7)', name: 'Hermione', icon: '🔮' };
      case 'atenea':
      case 'athena':
        return { primary: '#8b5cf6', secondary: '#6366f1', glow: 'rgba(139, 92, 246, 0.7)', name: 'Atenea', icon: '🛡️' };
      case 'oneiros':
        return { primary: '#d946ef', secondary: '#a855f7', glow: 'rgba(217, 70, 239, 0.7)', name: 'Oneiros', icon: '🌌' };
      case 'hermes':
        return { primary: '#10b981', secondary: '#059669', glow: 'rgba(16, 185, 129, 0.7)', name: 'Hermes', icon: '⚡' };
      case 'logos':
        return { primary: '#3b82f6', secondary: '#1d4ed8', glow: 'rgba(59, 130, 246, 0.7)', name: 'Logos', icon: '📐' };
      case 'mnemosyne':
        return { primary: '#a855f7', secondary: '#7c3aed', glow: 'rgba(168, 85, 247, 0.7)', name: 'Mnemosyne', icon: '📜' };
      case 'kallisti':
        return { primary: '#f43f5e', secondary: '#ec4899', glow: 'rgba(244, 63, 94, 0.7)', name: 'Kallisti', icon: '🎨' };
      case 'astraura':
      case 'astraura_prime':
        return { primary: '#00f0ff', secondary: '#10b981', glow: 'rgba(0, 240, 255, 0.7)', name: 'Astraura', icon: '💎' };
      case 'aurora':
      default:
        return { primary: '#ec4899', secondary: '#f43f5e', glow: 'rgba(236, 72, 153, 0.7)', name: 'Aurora', icon: '🌸' };
    }
  };

  const personaTheme = getPersonaColor(livePersonaId);

  // Initialize Particles
  useEffect(() => {
    const pts = [];
    for (let i = 0; i < 28; i++) {
      pts.push({
        angle: (i / 28) * Math.PI * 2,
        speed: 0.015 + Math.random() * 0.02,
        radiusOffset: Math.random() * 8,
        size: 1.2 + Math.random() * 1.8,
        pulseSpeed: 0.03 + Math.random() * 0.04
      });
    }
    particlesRef.current = pts;
  }, []);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isSubscribed = true;

    const render = () => {
      if (!isSubscribed) return;
      phaseRef.current += isPlaying ? 0.06 : 0.02;
      const phase = phaseRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.32;

      ctx.clearRect(0, 0, width, height);

      // Outer Pulse Halo
      const haloGradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, baseRadius * 1.6);
      haloGradient.addColorStop(0, `${personaTheme.primary}${isPlaying ? '80' : '40'}`);
      haloGradient.addColorStop(0.5, `${personaTheme.secondary}${isPlaying ? '40' : '15'}`);
      haloGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = haloGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Main Core
      const coreGrad = ctx.createRadialGradient(
        cx + Math.cos(phase * 1.2) * 4,
        cy + Math.sin(phase * 1.2) * 4,
        1,
        cx,
        cy,
        baseRadius
      );
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, personaTheme.primary);
      coreGrad.addColorStop(0.8, personaTheme.secondary);
      coreGrad.addColorStop(1, `${personaTheme.primary}00`);

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * (1 + (isPlaying ? Math.sin(phase * 4) * 0.12 : Math.sin(phase * 1.5) * 0.05)), 0, Math.PI * 2);
      ctx.fill();

      // Orbiting Quantum Particles
      particlesRef.current.forEach((p) => {
        p.angle += isPlaying ? p.speed * 2 : p.speed;
        const currentR = baseRadius + p.radiusOffset + Math.sin(phase * 2 + p.angle) * 4;
        const px = cx + Math.cos(p.angle) * currentR;
        const py = cy + Math.sin(p.angle) * currentR;
        ctx.fillStyle = personaTheme.primary;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isSubscribed = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [personaTheme, isPlaying]);

  const handleTogglePlayPause = () => {
    if (isPlaying) {
      omniVoice.pauseSpeaking();
    } else if (isPaused) {
      omniVoice.resumeSpeaking();
    } else {
      omniVoice.speak(`Hola Maggasukha, la orbe cuántica de ${personaTheme.name} está activa con modulación viva.`, {
        persona_id: livePersonaId
      });
    }
  };

  const handleToggleDuplex = async () => {
    if (isDuplexActive) {
      omniVoice.stopFullDuplexConversation();
      setIsDuplexActive(false);
    } else {
      const ok = await omniVoice.startFullDuplexConversation(
        activePersona?.id || 'aurora',
        (userText) => {
          if (onDirectConversationSpeech) onDirectConversationSpeech(userText);
        }
      );
      setIsDuplexActive(ok);
    }
  };

  return (
    <div className="fixed bottom-16 lg:bottom-4 right-3 sm:right-4 z-40 flex flex-col items-end pointer-events-none select-none">
      {/* Expanded Control Box */}
      {isExpanded && (
        <div 
          className="mb-2 p-3.5 rounded-3xl bg-[#080b13]/95 backdrop-blur-xl border shadow-2xl pointer-events-auto w-72 sm:w-80 space-y-3 animate-slide-up text-xs font-mono"
          style={{
            borderColor: `${personaTheme.primary}60`,
            boxShadow: `0 8px 32px ${personaTheme.primary}35`
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">{personaTheme.icon}</span>
              <div>
                <h4 className="font-bold text-white leading-tight">{personaTheme.name}</h4>
                <span className="text-[9px] text-slate-400">
                  {isPlaying ? 'Locutando...' : (isDuplexActive ? 'Escuchando Voz' : 'En Reposo')}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Spoken Subtitle */}
          {isPlaying && liveSpokenClause && (
            <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-slate-200 text-[11px] leading-snug font-sans text-center">
              {liveSpokenClause.split(/(\s+)/).map((tok, idx) => {
                if (/^\s+$/.test(tok)) return <span key={idx}>{tok}</span>;
                const cleanTok = tok.toLowerCase().replace(/[^a-záéíóúñ]/gi, '');
                const cleanWord = (liveSpokenWord || '').toLowerCase().replace(/[^a-záéíóúñ]/gi, '');
                const isCurrent = cleanWord && (cleanTok === cleanWord || cleanTok.startsWith(cleanWord) || cleanWord.startsWith(cleanTok));
                return (
                  <span
                    key={idx}
                    className={`inline-block px-0.5 rounded ${
                      isCurrent ? 'font-bold text-white scale-105 shadow-sm' : 'text-slate-300'
                    }`}
                    style={isCurrent ? { backgroundColor: `${personaTheme.primary}70` } : undefined}
                  >
                    {tok}
                  </span>
                );
              })}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={handleTogglePlayPause}
              className="flex-1 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-pink-400" /> : <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />}
              <span>{isPlaying ? 'Pausar' : 'Probar Voz'}</span>
            </button>

            <button
              onClick={handleToggleDuplex}
              className={`flex-1 py-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isDuplexActive
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 animate-pulse'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {isDuplexActive ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{isDuplexActive ? 'Cadencia On' : 'Micro 24/7'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Orb Avatar Button */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Real-time Speaker Pill on Mobile/Desktop */}
        {isPlaying && (
          <div 
            className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 backdrop-blur-xl border shadow-lg animate-fade-in"
            style={{
              backgroundColor: `${personaTheme.primary}25`,
              borderColor: `${personaTheme.primary}70`,
              color: personaTheme.primary,
              boxShadow: `0 0 16px ${personaTheme.primary}40`
            }}
          >
            <span>{personaTheme.icon}</span>
            <span className="truncate max-w-[110px] sm:max-w-[150px]">{personaTheme.name}</span>
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: personaTheme.primary }} />
          </div>
        )}

        {/* The Interactive Floating Orb Bubble */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#05070d] border p-0.5 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-transform flex items-center justify-center overflow-hidden group"
          style={{
            borderColor: `${personaTheme.primary}70`,
            boxShadow: `0 0 20px ${personaTheme.primary}50`
          }}
          title={`${personaTheme.name} • Clic para expandir controles de voz cuántica`}
        >
          <canvas
            ref={canvasRef}
            width={56}
            height={56}
            className="w-full h-full"
          />

          {/* Center Play/Pause Micro Indicator on Hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
            {isPlaying ? (
              <Pause className="w-4 h-4 text-pink-300" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-300" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
