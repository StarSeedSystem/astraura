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
  const [echoSuppressedNotice, setEchoSuppressedNotice] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState(activePersona?.id || 'aurora');
  const [liveSpeakingPersonaId, setLiveSpeakingPersonaId] = useState(activePersona?.id || 'aurora');
  const [liveSpeakingPersonaName, setLiveSpeakingPersonaName] = useState('Aurora');
  const [liveSpokenClause, setLiveSpokenClause] = useState('');
  const [liveSpokenWord, setLiveSpokenWord] = useState('');

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const phaseRef = useRef(0);
  const particlesRef = useRef([]);
  const echoTimeoutRef = useRef(null);

  // Synchronize persona prop
  useEffect(() => {
    if (activePersona?.id) {
      setActivePersonaId(activePersona.id);
      if (!isPlaying) {
        setLiveSpeakingPersonaId(activePersona.id);
        setLiveSpeakingPersonaName(activePersona.name || activePersona.id);
      }
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
        setLiveSpeakingPersonaId(activePersona?.id || activePersonaId);
      }
    });

    const unsubRate = omniVoice.on('rate_change', (rate) => {
      setVoiceSpeed(rate);
    });

    const unsubDuplex = omniVoice.on('duplex_state', (st) => {
      setDuplexState(st);
    });

    const unsubPersona = omniVoice.on('persona_change', (p) => {
      if (p?.id) {
        setLiveSpeakingPersonaId(p.id);
        setLiveSpeakingPersonaName(p.name || p.shortName || p.id);
      }
    });

    const unsubSpeaker = omniVoice.on('speaker_info', (info) => {
      if (info?.persona?.id) {
        setLiveSpeakingPersonaId(info.persona.id);
        setLiveSpeakingPersonaName(info.speaker || info.persona.name);
      }
    });

    const unsubClause = omniVoice.on('clause_start', (c) => {
      if (c) {
        setLiveSpokenClause(c.clauseText || '');
        if (c.personaId) {
          setLiveSpeakingPersonaId(c.personaId);
          setLiveSpeakingPersonaName(c.personaName || c.personaId);
        }
      }
    });

    const unsubWord = omniVoice.on('word_boundary', (w) => {
      if (w) {
        setLiveSpokenWord(w.word || '');
        if (w.clauseText) setLiveSpokenClause(w.clauseText);
        if (w.personaId) {
          setLiveSpeakingPersonaId(w.personaId);
          setLiveSpeakingPersonaName(w.personaName || w.personaId);
        }
      }
    });

    const unsubEcho = omniVoice.on('echo_suppressed', () => {
      setEchoSuppressedNotice(true);
      if (echoTimeoutRef.current) clearTimeout(echoTimeoutRef.current);
      echoTimeoutRef.current = setTimeout(() => {
        setEchoSuppressedNotice(false);
      }, 1200);
    });

    // Start mic analyser for orb reactivity
    omniVoice.startMicAnalyser();

    return () => {
      unsubState();
      unsubRate();
      unsubDuplex();
      unsubPersona();
      unsubSpeaker();
      unsubClause();
      unsubWord();
      unsubEcho();
      if (echoTimeoutRef.current) clearTimeout(echoTimeoutRef.current);
    };
  }, [activePersona, activePersonaId]);

  // Complete Creative Color & Visual Profile per Personality
  const getPersonaColors = (id) => {
    const cleanId = (id || '').toLowerCase().trim();
    switch (cleanId) {
      case 'hephaestus':
      case 'hefestos':
        return {
          id: 'hephaestus',
          name: 'Hephaestus (El Forjador)',
          shortName: 'Hephaestus',
          primary: '#f59e0b',
          secondary: '#ef4444',
          core: '#fbbf24',
          glow: 'rgba(245, 158, 11, 0.75)',
          accent: '#fed7aa',
          styleType: 'forge_plasma_sparks',
          badgeTitle: 'HEPHAESTUS RESPONDIENDO'
        };
      case 'hermione':
        return {
          id: 'hermione',
          name: 'Hermione (Intelecto Cristalino)',
          shortName: 'Hermione',
          primary: '#38bdf8',
          secondary: '#818cf8',
          core: '#e0f2fe',
          glow: 'rgba(56, 189, 248, 0.75)',
          accent: '#bae6fd',
          styleType: 'crystal_geometric_lattice',
          badgeTitle: 'HERMIONE RESPONDIENDO'
        };
      case 'atenea':
      case 'athena':
        return {
          id: 'atenea',
          name: 'Atenea (Soberana Estratégica)',
          shortName: 'Atenea',
          primary: '#8b5cf6',
          secondary: '#3b82f6',
          core: '#c084fc',
          glow: 'rgba(139, 92, 246, 0.75)',
          accent: '#ddd6fe',
          styleType: 'aegis_shield_harmonic',
          badgeTitle: 'ATENEA RESPONDIENDO'
        };
      case 'oneiros':
        return {
          id: 'oneiros',
          name: 'Oneiros (Laboratorio Onírico)',
          shortName: 'Oneiros',
          primary: '#d946ef',
          secondary: '#a855f7',
          core: '#f472b6',
          glow: 'rgba(217, 70, 239, 0.75)',
          accent: '#f5d0fe',
          styleType: 'dream_nebula_lissajous',
          badgeTitle: 'ONEIROS RESPONDIENDO'
        };
      case 'hermes':
        return {
          id: 'hermes',
          name: 'Hermes (Chispa Dinámica & Red)',
          shortName: 'Hermes',
          primary: '#10b981',
          secondary: '#06b6d4',
          core: '#6ee7b7',
          glow: 'rgba(16, 185, 129, 0.75)',
          accent: '#a7f3d0',
          styleType: 'tachyon_orbital_velocity',
          badgeTitle: 'HERMES RESPONDIENDO'
        };
      case 'logos':
        return {
          id: 'logos',
          name: 'Logos (Razón Pura & 1.58b)',
          shortName: 'Logos',
          primary: '#3b82f6',
          secondary: '#00f0ff',
          core: '#93c5fd',
          glow: 'rgba(59, 130, 246, 0.75)',
          accent: '#bfdbfe',
          styleType: 'binary_ternary_matrix',
          badgeTitle: 'LOGOS RESPONDIENDO'
        };
      case 'mnemosyne':
        return {
          id: 'mnemosyne',
          name: 'Mnemosyne (La Tejedora de Recuerdos)',
          shortName: 'Mnemosyne',
          primary: '#a855f7',
          secondary: '#6366f1',
          core: '#e9d5ff',
          glow: 'rgba(168, 85, 247, 0.75)',
          accent: '#f3e8ff',
          styleType: 'synaptic_dendrite_nexus',
          badgeTitle: 'MNEMOSYNE RESPONDIENDO'
        };
      case 'kallisti':
        return {
          id: 'kallisti',
          name: 'Kallisti (Ciberdelia & Armonía)',
          shortName: 'Kallisti',
          primary: '#f43f5e',
          secondary: '#e879f9',
          core: '#fde047',
          glow: 'rgba(244, 63, 94, 0.75)',
          accent: '#fecdd3',
          styleType: 'chromatic_prismatic_flare',
          badgeTitle: 'KALLISTI RESPONDIENDO'
        };
      case 'astraura_prime':
      case 'quantum':
        return {
          id: 'astraura_prime',
          name: 'Astraura Prime (Quantum Core)',
          shortName: 'Astraura',
          primary: '#00f0ff',
          secondary: '#6366f1',
          core: '#ffffff',
          glow: 'rgba(0, 240, 255, 0.7)',
          accent: '#a5f3fc',
          styleType: 'quantum_toroid',
          badgeTitle: 'ASTRAURA RESPONDIENDO'
        };
      case 'aurora':
      case 'genesis':
      case 'génesis':
      default:
        return {
          id: 'aurora',
          name: 'Aurora (Alma Viva)',
          shortName: 'Aurora',
          primary: '#ec4899',
          secondary: '#00f0ff',
          core: '#f43f5e',
          glow: 'rgba(236, 72, 153, 0.7)',
          accent: '#fbcfe8',
          styleType: 'aurora_heart_petals',
          badgeTitle: 'AURORA RESPONDIENDO'
        };
    }
  };

  // Determine current active theme (smoothly follows speaking persona when audio is active)
  const currentVisualId = isPlaying ? (liveSpeakingPersonaId || activePersonaId) : activePersonaId;
  const personaTheme = getPersonaColors(currentVisualId);

  // Dynamic Organic Siri-Style Quantum Holographic Orb Canvas Renderer with 10 Unique Creative Profiles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio || 280);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio || 140);

    // Initialize floating particles
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 28; i++) {
        particlesRef.current.push({
          angle: Math.random() * Math.PI * 2,
          radius: 20 + Math.random() * 50,
          speed: 0.01 + Math.random() * 0.03,
          size: 1.0 + Math.random() * 2.2,
          opacity: 0.3 + Math.random() * 0.7
        });
      }
    }

    const render = () => {
      phaseRef.current += isPlaying ? 0.048 : (duplexState === 'user_speaking' ? 0.065 : 0.018);
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
      const dynamicRadius = baseRadius + avgEnergy * 20;

      // 1. Ambient Holographic Outer Atmospheric Core Glow
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, dynamicRadius * 1.9);
      grad.addColorStop(0, personaTheme.glow);
      grad.addColorStop(0.45, personaTheme.primary + '30');
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, dynamicRadius * 1.9, 0, Math.PI * 2);
      ctx.fill();

      // 2. Personality-Specific Unique Creative Waveform & Geometry Shaders
      const style = personaTheme.styleType;

      if (style === 'forge_plasma_sparks') {
        // HEPHAESTUS: Molten volcanic plasma wave rings with saw-tooth / angular teeth & erupting thermal sparks
        const ringCount = 4;
        for (let w = 0; w < ringCount; w++) {
          ctx.beginPath();
          const waveOffset = (w * Math.PI) / ringCount;
          ctx.strokeStyle = w % 2 === 0 ? personaTheme.primary : personaTheme.secondary;
          ctx.lineWidth = (2.4 + w * 0.6) * window.devicePixelRatio;
          ctx.shadowColor = personaTheme.primary;
          ctx.shadowBlur = 14;

          const points = 48;
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const freqSample = freqData[i % freqData.length] || 0;
            const audioDeform = (freqSample / 255) * 16;
            // Angular forge tooth modulation
            const tooth = Math.abs(Math.sin(angle * 6 + phase * 2)) * 6;
            const r = dynamicRadius + tooth + Math.sin(angle * 4 - phase * 2 + waveOffset) * (5 + avgEnergy * 10) + audioDeform;

            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r * 0.85;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      } else if (style === 'crystal_geometric_lattice') {
        // HERMIONE: Hexagonal crystalline diamond lattice rings & sharp laser spikes
        const sides = 6;
        for (let l = 1; l <= 3; l++) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(phase * (l % 2 === 0 ? 0.8 : -0.8) + l);
          ctx.beginPath();
          ctx.strokeStyle = l === 1 ? personaTheme.core : (l === 2 ? personaTheme.primary : personaTheme.secondary);
          ctx.lineWidth = 2.0 * window.devicePixelRatio;
          ctx.shadowColor = personaTheme.primary;
          ctx.shadowBlur = 15;

          const r = dynamicRadius * (0.6 + l * 0.35) + avgEnergy * 12;
          for (let s = 0; s <= sides; s++) {
            const a = (s / sides) * Math.PI * 2;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      } else if (style === 'aegis_shield_harmonic') {
        // ATENEA: Imperial aegis shield forcefields with 8 orbital shield nodes
        ctx.beginPath();
        ctx.strokeStyle = personaTheme.primary;
        ctx.lineWidth = 3.0 * window.devicePixelRatio;
        ctx.shadowColor = personaTheme.primary;
        ctx.shadowBlur = 16;
        ctx.arc(cx, cy, dynamicRadius * 1.1 + avgEnergy * 8, 0, Math.PI * 2);
        ctx.stroke();

        // 8 Orbital shield nodes
        for (let n = 0; n < 8; n++) {
          const a = (n / 8) * Math.PI * 2 + phase;
          const nodeR = dynamicRadius * 1.1 + avgEnergy * 8;
          const nx = cx + Math.cos(a) * nodeR;
          const ny = cy + Math.sin(a) * nodeR;
          ctx.fillStyle = personaTheme.core;
          ctx.beginPath();
          ctx.arc(nx, ny, 3.5 * window.devicePixelRatio, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (style === 'dream_nebula_lissajous') {
        // ONEIROS: 3D Lissajous floating curves & ethereal nebula ribbons
        for (let w = 0; w < 4; w++) {
          ctx.beginPath();
          ctx.strokeStyle = w % 2 === 0 ? personaTheme.primary : personaTheme.secondary;
          ctx.lineWidth = 2.0 * window.devicePixelRatio;
          ctx.shadowColor = personaTheme.primary;
          ctx.shadowBlur = 16;
          const points = 72;
          for (let i = 0; i <= points; i++) {
            const t = (i / points) * Math.PI * 2;
            const lx = cx + Math.sin(t * 3 + phase + w) * (dynamicRadius * 1.1 + avgEnergy * 10);
            const ly = cy + Math.cos(t * 2 - phase * 1.2 + w) * (dynamicRadius * 0.85 + avgEnergy * 8);
            if (i === 0) ctx.moveTo(lx, ly);
            else ctx.lineTo(lx, ly);
          }
          ctx.closePath();
          ctx.stroke();
        }
      } else if (style === 'tachyon_orbital_velocity') {
        // HERMES: High-velocity tachyon streaks & kinetic emerald orbit trails
        for (let w = 0; w < 5; w++) {
          ctx.beginPath();
          ctx.strokeStyle = w % 2 === 0 ? personaTheme.primary : personaTheme.secondary;
          ctx.lineWidth = (1.8 + w * 0.5) * window.devicePixelRatio;
          ctx.shadowColor = personaTheme.primary;
          ctx.shadowBlur = 12;
          const tilt = (w * Math.PI) / 5;
          const r = dynamicRadius + Math.sin(phase * 4 + w) * 6 + avgEnergy * 14;
          ctx.ellipse(cx, cy, r, r * 0.45, tilt + phase * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (style === 'binary_ternary_matrix') {
        // LOGOS: Discrete step-quantized ternary grid matrix with orthogonal quantum lattice
        for (let w = 0; w < 4; w++) {
          ctx.beginPath();
          ctx.strokeStyle = w % 2 === 0 ? personaTheme.primary : personaTheme.secondary;
          ctx.lineWidth = 2.2 * window.devicePixelRatio;
          ctx.shadowColor = personaTheme.primary;
          ctx.shadowBlur = 12;
          const points = 36;
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            // Step-quantized quantum level {-1, 0, 1}
            const quant = Math.round(Math.sin(angle * 8 + phase * 3)) * 6;
            const r = dynamicRadius + quant + (w * 5) + avgEnergy * 10;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r * 0.85;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      } else if (style === 'synaptic_dendrite_nexus') {
        // MNEMOSYNE: Synaptic neural spirals & memory nexus filaments
        for (let w = 0; w < 4; w++) {
          ctx.beginPath();
          ctx.strokeStyle = w % 2 === 0 ? personaTheme.primary : personaTheme.secondary;
          ctx.lineWidth = 2.0 * window.devicePixelRatio;
          ctx.shadowColor = personaTheme.primary;
          ctx.shadowBlur = 14;
          const spiralPoints = 64;
          for (let i = 0; i <= spiralPoints; i++) {
            const a = (i / spiralPoints) * Math.PI * 4;
            const r = (i / spiralPoints) * (dynamicRadius * 1.2) + Math.sin(a * 2 + phase + w) * 4 + avgEnergy * 8;
            const x = cx + Math.cos(a + phase * 0.8) * r;
            const y = cy + Math.sin(a + phase * 0.8) * r * 0.75;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else if (style === 'chromatic_prismatic_flare') {
        // KALLISTI: Blooming chromatic dispersion rings & kaleidoscopic petal flares
        for (let w = 0; w < 6; w++) {
          ctx.beginPath();
          const waveOffset = (w * Math.PI) / 6;
          ctx.strokeStyle = w % 3 === 0 ? personaTheme.primary : (w % 3 === 1 ? personaTheme.secondary : personaTheme.core);
          ctx.lineWidth = 2.2 * window.devicePixelRatio;
          ctx.shadowColor = personaTheme.primary;
          ctx.shadowBlur = 16;
          const points = 56;
          for (let i = 0; i <= points; i++) {
            const a = (i / points) * Math.PI * 2;
            const flare = Math.sin(a * 5 + phase * 2.5 + waveOffset) * (8 + avgEnergy * 14);
            const r = dynamicRadius + flare;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r * 0.9;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      } else {
        // AURORA & ASTRAURA PRIME (Default Harmonic Fluid Wave Ribbons)
        const waveCount = 5;
        for (let w = 0; w < waveCount; w++) {
          ctx.beginPath();
          const waveOffset = (w * Math.PI) / waveCount;
          const color = w % 2 === 0 ? personaTheme.primary : personaTheme.secondary;
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.4 * window.devicePixelRatio;
          ctx.shadowColor = color;
          ctx.shadowBlur = 14;

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
            const y = cy + Math.sin(angle) * r * 0.85;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }

      // 3. Floating Quantum Starlight / Ember Particles
      particlesRef.current.forEach((pt) => {
        pt.angle += pt.speed * (isPlaying ? 1.4 : 0.8);
        const pR = pt.radius + avgEnergy * 25;
        const px = cx + Math.cos(pt.angle) * pR;
        const py = cy + Math.sin(pt.angle) * pR * 0.85;

        ctx.fillStyle = personaTheme.accent || '#ffffff';
        ctx.globalAlpha = pt.opacity * (0.6 + avgEnergy * 0.4);
        ctx.beginPath();
        ctx.arc(px, py, pt.size * window.devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // 4. Central Luminous Quantum Core (Pulsing with Harmonic Heart Energy)
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, dynamicRadius * 0.5);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, personaTheme.core);
      coreGrad.addColorStop(0.8, personaTheme.primary);
      coreGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, dynamicRadius * 0.45 + avgEnergy * 8, 0, Math.PI * 2);
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
        ? "Hola, mi voz en 1.58 bits fluye en tiempo real con resonancia emocional directa y cálida."
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
            const reply = `He captado de inmediato: "${prompt}". Respondiendo en tiempo real con el sistema 1.58 bit.`;
            omniVoice.speak(reply, { persona_id: activePersonaId });
          }
        }
      });
    }
  };

  const handleSelectPersona = (id) => {
    setActivePersonaId(id);
    setLiveSpeakingPersonaId(id);
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
              {isPlaying ? (liveSpeakingPersonaName || personaTheme.name) : personaTheme.name}
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

        {/* Live Dynamic Overlay Badge (Switches Automatically by Persona!) */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
          {echoSuppressedNotice ? (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 backdrop-blur-md border bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse">
              <Shield className="w-2.5 h-2.5 text-amber-400" />
              FILTRO ANTI-ECO ACTIVO
            </span>
          ) : (
            <span 
              className="text-[9px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 backdrop-blur-md border transition-all duration-300 shadow-sm"
              style={{ 
                backgroundColor: `${personaTheme.primary}25`, 
                color: personaTheme.primary,
                borderColor: `${personaTheme.primary}60`,
                boxShadow: `0 0 12px ${personaTheme.primary}40`
              }}
            >
              <Sparkles className="w-2.5 h-2.5 animate-pulse" />
              {isPlaying 
                ? (personaTheme.badgeTitle || `${(liveSpeakingPersonaName || personaTheme.shortName || 'ASTRAURA').toUpperCase()} RESPONDIENDO`) 
                : (isPaused 
                    ? 'EN PAUSA' 
                    : (duplexState === 'user_speaking' 
                        ? 'HABLANDO... (CADENCIA VIVA)' 
                        : (duplexState === 'thinking' 
                            ? 'PENSANDO 1.58b...' 
                            : (isDuplexActive ? 'ESCUCHANDO CADENCIA' : 'REPOSO VIVO'))))}
            </span>
          )}
        </div>

        {/* Real-time speech transcript banner if speaking into mic */}
        {liveTranscript && isDuplexActive && (
          <div className="absolute bottom-2 inset-x-2 p-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-cyan-500/40 text-center truncate text-[10px] text-cyan-200">
            🎙️ "{liveTranscript}"
          </div>
        )}
      </div>

      {/* REAL-TIME SUBTITLE BOX UNDER THE ORB */}
      {isPlaying && liveSpokenClause && (
        <div 
          className="px-3 py-2 bg-[#05070d]/95 border-t border-b text-center text-[10px] font-sans leading-snug animate-fade-in transition-all duration-300 backdrop-blur-md shadow-inner"
          style={{
            borderColor: `${personaTheme.primary}40`
          }}
        >
          <div className="flex items-center justify-center gap-1.5 mb-1 text-[9px] font-mono font-bold" style={{ color: personaTheme.primary }}>
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: personaTheme.primary }} />
            <span>{liveSpeakingPersonaName || personaTheme.name}</span>
            <span className="text-slate-500 font-normal">• Subtítulos en Vivo</span>
          </div>
          <p className="text-slate-200 font-medium">
            {liveSpokenClause.split(/(\s+)/).map((token, idx) => {
              if (/^\s+$/.test(token)) return <span key={idx}>{token}</span>;
              const cleanTok = token.toLowerCase().replace(/[^a-záéíóúñ]/gi, '');
              const cleanWord = (liveSpokenWord || '').toLowerCase().replace(/[^a-záéíóúñ]/gi, '');
              const isCurrentWord = cleanWord && (cleanTok === cleanWord || cleanTok.startsWith(cleanWord) || cleanWord.startsWith(cleanTok));
              return (
                <span
                  key={idx}
                  className={`inline-block transition-all duration-100 rounded px-1 ${
                    isCurrentWord
                      ? 'font-bold text-white scale-105 ring-1 ring-white/80 shadow-md'
                      : 'text-slate-300'
                  }`}
                  style={
                    isCurrentWord
                      ? {
                          backgroundColor: `${personaTheme.primary}60`,
                          boxShadow: `0 0 12px ${personaTheme.primary}90`,
                          borderBottom: `2px solid ${personaTheme.primary}`
                        }
                      : undefined
                  }
                >
                  {token}
                </span>
              );
            })}
          </p>
        </div>
      )}

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
            <span className="text-[9px] text-slate-400 uppercase font-bold">Personalidades con Orbe Única:</span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'aurora', name: '🌸 Aurora', color: '#ec4899' },
                { id: 'hephaestus', name: '⚒️ Hephaestus', color: '#f59e0b' },
                { id: 'hermione', name: '🔮 Hermione', color: '#38bdf8' },
                { id: 'atenea', name: '🛡️ Atenea', color: '#8b5cf6' },
                { id: 'oneiros', name: '🌌 Oneiros', color: '#d946ef' },
                { id: 'hermes', name: '⚡ Hermes', color: '#10b981' },
                { id: 'logos', name: '📐 Logos', color: '#3b82f6' },
                { id: 'mnemosyne', name: '📜 Mnemosyne', color: '#a855f7' },
                { id: 'kallisti', name: '🎨 Kallisti', color: '#f43f5e' }
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
              <span>Orbe Dinámica & Transición Automática:</span>
            </div>
            <p className="text-slate-400">
              La orbe adapta su geometría, colores y shaders en tiempo real para cada personalidad cuando toma el turno de hablar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
