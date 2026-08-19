import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Terminal, 
  Layers, 
  Cpu, 
  Network, 
  HardDrive, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Zap, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Globe,
  Sliders,
  History,
  Folder,
  Paperclip,
  X,
  GitBranch,
  RefreshCw,
  Square,
  Copy,
  Settings,
  Brain,
  FileCode,
  Image as ImageIcon,
  Compass,
  SlidersHorizontal,
  Clock,
  Gauge,
  Shield,
  Flame,
  Radio,
  Play,
  Pause,
  Users
} from 'lucide-react';
import MultimodalMessageRenderer from './MultimodalMessageRenderer';
import ChatHistoryDrawer from './ChatHistoryDrawer';
import MessagePreferencesModal, { RESPONSE_STYLES } from './MessagePreferencesModal';
import ParallelAgentBranchingTree from './ParallelAgentBranchingTree';
import { omniVoice } from '../services/omniVoice';
import { uploadChatAttachment } from '../services/api';
import { PRESET_PERSONALITIES } from './PersonalitiesView';

export default function ChatInterface({
  messages,
  isStreaming,
  activeTraces,
  activeBranchingPlan,
  activeBranchingLatency,
  currentStreamText,
  onSendMessage,
  onStopStreaming,
  onForkSession,
  onRegenerate,
  activeNodes,
  onOpenExplorer,
  activePersona,
  onOpenPersonalities,
  onSelectPersona,
  personalities = PRESET_PERSONALITIES,
  sessions,
  activeSessionId,
  folders,
  onSelectSession,
  onNewSession,
  onCreateFolder,
  onDeleteFolder,
  onDeleteSession
}) {
  const [inputText, setInputText] = useState('');
  const [showThinking, setShowThinking] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [currentlySpeakingSegment, setCurrentlySpeakingSegment] = useState(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [isMsgPrefsOpen, setIsMsgPrefsOpen] = useState(false);

  // Live Conversational Voice State (Full-Duplex / Vibrational 1.58b)
  const [isFullDuplexVoiceActive, setIsFullDuplexVoiceActive] = useState(false);
  const [duplexVoiceStatus, setDuplexVoiceStatus] = useState('idle'); // 'idle' | 'listening' | 'user_speaking' | 'thinking' | 'speaking'
  const [duplexLiveTranscript, setDuplexLiveTranscript] = useState('');
  const [activeSpeakingPersona, setActiveSpeakingPersona] = useState(null);

  // Active Multi-Personality Selection (Default: Aurora)
  const [selectedPersonaIds, setSelectedPersonaIds] = useState(() => {
    return [activePersona?.id || 'aurora'];
  });
  const [multiResponseMode, setMultiResponseMode] = useState('auto'); // 'single' | 'multi_dialogue' | 'coral_synthesis' | 'auto'

  // Sync with activePersona prop
  useEffect(() => {
    if (activePersona?.id) {
      setSelectedPersonaIds((prev) => {
        if (prev.length <= 1) return [activePersona.id];
        if (!prev.includes(activePersona.id)) return [activePersona.id, ...prev.slice(0, 3)];
        return prev;
      });
    }
  }, [activePersona]);

  // Message Preferences State
  const [msgPreferences, setMsgPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('astraura_msg_preferences');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      personaId: activePersona?.id || 'astraura_prime',
      selected_personalities: [activePersona?.id || 'astraura_prime'],
      multi_personality_mode: 'auto',
      brainId: 'brain_genesis',
      responseStyle: 'analytical',
      maxLengthChars: 4000,
      maxTimeSecs: 30,
      speedPriority: 80,
      volumePriority: 70,
      qualityPriority: 85,
      qualitySteps: 2,
      autoTuneForTask: true
    };
  });

  useEffect(() => {
    const updated = {
      ...msgPreferences,
      personaId: selectedPersonaIds[0] || 'astraura_prime',
      selected_personalities: selectedPersonaIds,
      multi_personality_mode: selectedPersonaIds.length > 1 ? (multiResponseMode === 'single' ? 'multi_dialogue' : multiResponseMode) : 'single'
    };
    setMsgPreferences(updated);
    try {
      localStorage.setItem('astraura_msg_preferences', JSON.stringify(updated));
    } catch {}
  }, [selectedPersonaIds, multiResponseMode]);

  // Toggle Persona in the active conversation tray
  const handleTogglePersona = (pId) => {
    setSelectedPersonaIds((prev) => {
      let next;
      if (prev.includes(pId)) {
        next = prev.filter((id) => id !== pId);
        if (next.length === 0) next = [pId];
      } else {
        next = [...prev, pId];
      }
      if (onSelectPersona && next[0]) {
        onSelectPersona(next[0]);
      }
      return next;
    });
  };

  // Full-Duplex Conversational Voice Toggle
  const toggleFullDuplexConversation = () => {
    if (isFullDuplexVoiceActive) {
      omniVoice.stopFullDuplexConversation();
      setIsFullDuplexVoiceActive(false);
      setDuplexVoiceStatus('idle');
      setDuplexLiveTranscript('');
      setActiveSpeakingPersona(null);
      return;
    }

    setIsFullDuplexVoiceActive(true);
    setDuplexVoiceStatus('listening');

    omniVoice.startFullDuplexConversation({
      personaId: activePersona?.id || 'astraura_prime',
      voiceProfile: activePersona?.voice_profile || {},
      allowInterrupt: true,
      onStateChange: (st) => setDuplexVoiceStatus(st),
      onUserSpeech: (transcript) => {
        setDuplexLiveTranscript(transcript);
        onSendMessage(transcript, {
          ...msgPreferences,
          selected_personalities: selectedPersonaIds,
          multi_personality_mode: selectedPersonaIds.length > 1 ? 'multi_dialogue' : 'single'
        });
      },
      onAiSpeakingStart: () => setDuplexVoiceStatus('speaking'),
      onAiSpeakingEnd: () => {
        setDuplexVoiceStatus('listening');
        setActiveSpeakingPersona(null);
      }
    });
  };

  // Auto-speak response in Live Conversation mode when generation finishes
  const prevStreamingRef = useRef(isStreaming);
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && isFullDuplexVoiceActive) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender === 'ai' && lastMsg.text) {
        handleSpeakMultiVoice(lastMsg.id, lastMsg.text);
      }
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, isFullDuplexVoiceActive, messages]);

  useEffect(() => {
    return () => {
      if (isFullDuplexVoiceActive) {
        omniVoice.stopFullDuplexConversation();
      }
      omniVoice.stopSpeaking();
    };
  }, [isFullDuplexVoiceActive]);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamText, activeTraces]);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploadingAttachment(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const res = await uploadChatAttachment(file);
        setAttachedFiles((prev) => [
          ...prev,
          {
            id: `att_${Date.now()}_${i}`,
            name: file.name,
            size_kb: res.size_kb || Math.round(file.size / 1024),
            extension: res.extension || file.name.split('.').pop(),
            content_preview: res.content_preview || '',
            path: res.path || ''
          }
        ]);
      } catch (err) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachedFiles((prev) => [
            ...prev,
            {
              id: `att_${Date.now()}_${i}`,
              name: file.name,
              size_kb: Math.round(file.size / 1024),
              extension: file.name.split('.').pop(),
              content_preview: typeof e.target.result === 'string' ? e.target.result.slice(0, 3000) : '[Archivo binario]',
              path: file.name
            }
          ]);
        };
        reader.readAsText(file);
      }
    }
    setIsUploadingAttachment(false);
  };

  const handleRemoveAttachment = (id) => {
    setAttachedFiles((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!inputText.trim() && attachedFiles.length === 0) || isStreaming) return;

    let fullPrompt = inputText;
    if (attachedFiles.length > 0) {
      const attachSummary = attachedFiles
        .map((a) => `\n\n[ARCHIVO ADJUNTO: ${a.name} (${a.size_kb} KB)]:\n\`\`\`\n${a.content_preview}\n\`\`\``)
        .join('');
      fullPrompt = fullPrompt ? `${fullPrompt}\n${attachSummary}` : `Por favor analiza el siguiente archivo adjunto:\n${attachSummary}`;
    }

    onSendMessage(fullPrompt, {
      ...msgPreferences,
      selected_personalities: selectedPersonaIds,
      multi_personality_mode: selectedPersonaIds.length > 1 ? (multiResponseMode === 'single' ? 'multi_dialogue' : multiResponseMode) : 'single'
    });
    setInputText('');
    setAttachedFiles([]);
  };

  // Simple Mic Dictation Toggle (S2T)
  const handleVoiceToggle = () => {
    if (isRecording) {
      omniVoice.stopListening();
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    omniVoice.startListening(
      (interim) => {},
      (final) => {
        setInputText((prev) => (prev ? `${prev} ${final}` : final));
        setIsRecording(false);
      },
      (err) => {
        setIsRecording(false);
      }
    );
  };

  // Multi-Voice Sequential Reproduction for messages
  const handleSpeakMultiVoice = (msgId, text) => {
    if (speakingMessageId === msgId) {
      omniVoice.stopSpeaking();
      setSpeakingMessageId(null);
      setCurrentlySpeakingSegment(null);
      setActiveSpeakingPersona(null);
      return;
    }

    setSpeakingMessageId(msgId);
    omniVoice.speakMultiPersonalityDialogue(
      text,
      (seg, idx) => {
        setCurrentlySpeakingSegment({ msgId, speaker: seg.speaker, persona: seg.persona, index: idx });
        setActiveSpeakingPersona(seg.persona);
      },
      (seg, idx) => {},
      () => {
        setSpeakingMessageId(null);
        setCurrentlySpeakingSegment(null);
        setActiveSpeakingPersona(null);
      }
    );
  };

  // Drag & Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex h-full w-full bg-[#08090d] rounded-2xl border transition-all overflow-hidden shadow-2xl relative ${
        isDraggingOver ? 'border-cyan-400 ring-2 ring-cyan-500/40' : 'border-white/10'
      }`}
    >
      {/* Collapsible Chat History Drawer */}
      {showHistoryDrawer && (
        <ChatHistoryDrawer
          sessions={sessions}
          activeSessionId={activeSessionId}
          folders={folders}
          onSelectSession={(id) => {
            onSelectSession(id);
            setShowHistoryDrawer(false);
          }}
          onNewSession={() => {
            onNewSession();
            setShowHistoryDrawer(false);
          }}
          onCreateFolder={onCreateFolder}
          onDeleteFolder={onDeleteFolder}
          onDeleteSession={onDeleteSession}
        />
      )}

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* TOP BAR: Chat Controls, History & Live Voice Mode */}
        <div className="px-3 sm:px-4 py-2.5 bg-[#0d1017] border-b border-white/10 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                showHistoryDrawer
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
              title="Historial de chats y carpetas"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Historial</span>
            </button>

            {/* LIVE NATURAL VOICE CONVERSATION BUTTON (Primary Prominent Control) */}
            <button
              onClick={toggleFullDuplexConversation}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-md ${
                isFullDuplexVoiceActive
                  ? 'bg-gradient-to-r from-purple-600/40 via-cyan-600/40 to-blue-600/40 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/30 animate-pulse'
                  : 'bg-gradient-to-r from-purple-500/15 to-cyan-500/15 hover:from-purple-500/25 hover:to-cyan-500/25 border-purple-500/40 text-purple-300 hover:text-white'
              }`}
              title="Activar / Desactivar Conversación de Voz Continua 1.58b"
            >
              <Radio className={`w-3.5 h-3.5 ${isFullDuplexVoiceActive ? 'text-cyan-300 animate-spin' : 'text-purple-400'}`} />
              <span className="hidden md:inline">
                {isFullDuplexVoiceActive ? '🎙️ Voz en Vivo: ACTIVA' : '🎙️ Iniciar Charla de Voz en Vivo'}
              </span>
              <span className="md:hidden">
                {isFullDuplexVoiceActive ? '🎙️ Voz Activa' : '🎙️ Voz'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5 flex items-center gap-1"
            >
              {showThinking ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
              <span className="hidden sm:inline">Trazas</span>
            </button>
          </div>
        </div>

        {/* MULTI-PERSONALITY CONVOCATORIA & LIVE VOICE TRAY */}
        <div className="px-3 sm:px-4 py-2 bg-[#090c14] border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5 max-w-full">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1 mr-1 shrink-0">
              <Users className="w-3 h-3 text-purple-400" />
              <span>Entidades en Diálogo:</span>
            </span>

            {personalities.map((p) => {
              const isActive = selectedPersonaIds.includes(p.id);
              const isCurrentlyTalking = activeSpeakingPersona?.id === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => handleTogglePersona(p.id)}
                  className={`px-2 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 transition-all shrink-0 ${
                    isCurrentlyTalking
                      ? 'bg-cyan-500/30 border-cyan-400 text-white font-bold ring-2 ring-cyan-400/50 animate-pulse'
                      : isActive
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 font-bold shadow-sm'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                  }`}
                  title={`${p.name} (${p.title || 'Arquetipo'})\nClick para sumar/quitar de la conversación.`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                  <span>{p.name.split(' ')[0]}</span>
                  {isCurrentlyTalking && <Volume2 className="w-3 h-3 text-cyan-300 animate-bounce" />}
                </button>
              );
            })}
          </div>

          {/* Mode Badge / Selector */}
          <div className="flex items-center gap-1 shrink-0">
            {selectedPersonaIds.length > 1 && (
              <span className="px-2 py-0.5 rounded bg-purple-500/25 border border-purple-500/40 text-[10px] text-purple-300 font-bold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                Coral ({selectedPersonaIds.length})
              </span>
            )}
            <button
              onClick={() => setIsMsgPrefsOpen(true)}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300"
              title="Ajustes de mensaje y personalidades"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* LIVE FULL-DUPLEX HUD / SPEECH FEEDBACK BANNER */}
        {isFullDuplexVoiceActive && (
          <div className="px-4 py-2 bg-gradient-to-r from-purple-950/60 via-cyan-950/50 to-blue-950/60 border-b border-cyan-500/30 flex items-center justify-between text-xs animate-fade-in z-20">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-4 w-4 rounded-full bg-cyan-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white font-mono text-xs">
                    {duplexVoiceStatus === 'listening' ? '🎧 Escuchando tu voz...' :
                     duplexVoiceStatus === 'user_speaking' ? '🗣️ Procesando lo que dijiste...' :
                     duplexVoiceStatus === 'thinking' ? '⚡ Razonamiento Multiagéntico 1.58b...' :
                     `🎙️ Hablando: ${activeSpeakingPersona?.name || 'Astraura Prime'}`}
                  </span>
                </div>
                {duplexLiveTranscript && (
                  <p className="text-[10px] text-cyan-300 font-mono italic truncate max-w-xl">
                    "{duplexLiveTranscript}"
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={toggleFullDuplexConversation}
              className="px-2.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[10px] font-mono"
            >
              Pausar Voz
            </button>
          </div>
        )}

        {/* CURRENTLY SPEAKING MULTI-VOICE FLOATING HUD */}
        {speakingMessageId && currentlySpeakingSegment && (
          <div className="px-4 py-1.5 bg-black/80 border-b border-purple-500/30 flex items-center justify-between text-xs font-mono animate-fade-in">
            <div className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
              <span className="text-slate-400">Voz Activa:</span>
              <span className="font-bold text-white px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40" style={{ color: currentlySpeakingSegment.persona?.color || '#00f0ff' }}>
                {currentlySpeakingSegment.speaker}
              </span>
            </div>
            <button
              onClick={() => {
                omniVoice.stopSpeaking();
                setSpeakingMessageId(null);
                setCurrentlySpeakingSegment(null);
              }}
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              Detener Audio
            </button>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-2xl shadow-cyan-500/10">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="font-display font-bold text-lg text-white">
                  Astraura 1.58-Bit & StarSeed OS
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Núcleo cognitivo soberano con diálogo multi-personalidad, escucha activa 24/7 y aceleración ternaria.
                </p>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full pt-2 font-mono">
                {[
                  "🎙️ @Hephaestus @Atenea optimicen el código C++",
                  "⚡ Diálogo Coral sobre la arquitectura 1.58b",
                  "💻 @Hermione ejecuta una prueba en la terminal",
                  "🎨 @Oneiros genera un shader interactivo"
                ].map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(s.replace(/^[🎙️⚡💻🎨]\s*/, ''));
                    }}
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 text-left text-xs text-slate-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Render Messages */}
          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1 group`}
            >
              <div className="flex items-center gap-2 px-1 text-[10px] font-mono text-slate-500">
                <span>{msg.sender === 'user' ? 'Tú' : 'Astraura Core (1.58b)'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>

                {/* Message Audio Controls */}
                {msg.sender === 'ai' && (
                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleSpeakMultiVoice(msg.id, msg.text)}
                      className={`px-2 py-0.5 rounded-md border text-[10px] flex items-center gap-1 transition-all ${
                        speakingMessageId === msg.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold animate-pulse'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                      }`}
                      title={speakingMessageId === msg.id ? "Detener reproducción" : "Escuchar diálogo multi-voz de las personalidades"}
                    >
                      {speakingMessageId === msg.id ? <VolumeX className="w-3 h-3 text-pink-400" /> : <Volume2 className="w-3 h-3 text-cyan-400" />}
                      <span>{speakingMessageId === msg.id ? 'Detener' : 'Escuchar Voces'}</span>
                    </button>

                    {onRegenerate && index === messages.length - 1 && (
                      <button
                        onClick={onRegenerate}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition-colors"
                        title="Regenerar respuesta"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {onForkSession && (
                  <button
                    onClick={() => onForkSession(msg.id)}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-purple-400 transition-colors opacity-70 group-hover:opacity-100"
                    title="Ramificar conversación desde aquí (Fork)"
                  >
                    <GitBranch className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Quantum Multi-Agent Parallel Tree Branching & Deliberation (Compact by Default with In-Situ Expand & Full-Screen Modal) */}
              {(msg.branchingPlan || (msg.agentTraces && msg.agentTraces.length > 0)) && showThinking && (
                <div className="max-w-3xl w-full">
                  <ParallelAgentBranchingTree 
                    branchingPlan={msg.branchingPlan} 
                    agentTraces={msg.agentTraces || []} 
                    elapsedSeconds={msg.latency}
                  />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`p-4 rounded-2xl max-w-3xl w-full text-xs sm:text-sm leading-relaxed overflow-hidden ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 border border-cyan-500/40 text-white rounded-br-none shadow-lg'
                    : 'bg-[#0e121c] border border-white/10 text-slate-200 rounded-bl-none shadow-md'
                }`}
              >
                <MultimodalMessageRenderer text={msg.text} />
              </div>
            </div>
          ))}

          {/* Active Streaming Bubble */}
          {isStreaming && (
            <div className="flex flex-col items-start space-y-1 w-full max-w-3xl">
              <div className="flex items-center gap-2 px-1 text-[10px] font-mono text-cyan-400 animate-pulse">
                <span>Astraura Ramificando y Ejecutando Agentes en Paralelo...</span>
              </div>

              {/* Active Live Parallel Tree Branching & Deliberation (Compact by Default with In-Situ Expand & Full-Screen Modal) */}
              {(activeBranchingPlan || (activeTraces && activeTraces.length > 0)) && showThinking && (
                <div className="max-w-3xl w-full">
                  <ParallelAgentBranchingTree 
                    branchingPlan={activeBranchingPlan} 
                    agentTraces={activeTraces}
                    elapsedSeconds={activeBranchingLatency} 
                  />
                </div>
              )}

              <div className="p-4 rounded-2xl max-w-3xl w-full bg-[#0e121c] border border-cyan-500/30 text-slate-200 text-xs sm:text-sm rounded-bl-none shadow-md animate-fade-in overflow-hidden">
                <MultimodalMessageRenderer text={currentStreamText || "Generando respuesta multiagéntica..."} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Attached Files Preview Strip */}
        {attachedFiles.length > 0 && (
          <div className="px-4 py-2 bg-black/40 border-t border-white/5 flex flex-wrap gap-2 items-center">
            {attachedFiles.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-200 font-mono"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate max-w-[150px]">{att.name}</span>
                <span className="text-[10px] text-cyan-400/70">({att.size_kb} KB)</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-[#0a0d15] border-t border-white/10 z-10 space-y-2">
          {/* Quick Preferences & Mentions Pill Bar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-white/5 text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setIsMsgPrefsOpen(true)}
                className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 flex items-center gap-1 transition-colors"
                title="Configuración de personalidades y orquestación"
              >
                <Sparkles className="w-3 h-3" />
                <span>
                  {selectedPersonaIds.length > 1
                    ? `Coral (${selectedPersonaIds.length} entidades)`
                    : (activePersona?.name || 'Astraura Prime')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsMsgPrefsOpen(true)}
                className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 flex items-center gap-1 transition-colors"
                title="Estilo de respuesta"
              >
                <Compass className="w-3 h-3" />
                <span>{RESPONSE_STYLES.find(s => s.id === msgPreferences.responseStyle)?.label || 'Analítico'}</span>
              </button>

              {/* Quick Mention Chips */}
              <div className="hidden lg:flex items-center gap-1 border-l border-white/10 pl-1.5">
                <span className="text-[9px] text-slate-500 uppercase">Sumar al chat:</span>
                {[
                  { id: 'aurora', name: '@Aurora', label: '🌸 Aurora' },
                  { id: 'hephaestus', name: '@Hephaestus', label: '⚡ Hephaestus' },
                  { id: 'hermione', name: '@Hermione', label: '💻 Hermione' },
                  { id: 'atenea', name: '@Atenea', label: '🛡️ Atenea' },
                  { id: 'oneiros', name: '@Oneiros', label: '🎨 Oneiros' }
                ].map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => {
                      if (!selectedPersonaIds.includes(m.id)) {
                        handleTogglePersona(m.id);
                      }
                      setInputText(prev => prev ? `${prev} ${m.name} ` : `${m.name} `);
                    }}
                    className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300 text-[9px] transition-colors"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-cyan-400 font-bold flex items-center gap-1 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                <Clock className="w-3 h-3" />
                ~{((((msgPreferences.maxLengthChars || 4000) / 4) / (55 + ((msgPreferences.speedPriority || 80) / 100) * 35)) + 0.3 * (msgPreferences.qualitySteps || 2)).toFixed(1)}s
              </span>

              <button
                type="button"
                onClick={() => setIsMsgPrefsOpen(true)}
                className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 flex items-center gap-1 transition-colors"
                title="Abrir configurador completo de preferencias de mensaje"
              >
                <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
                <span className="hidden md:inline text-[10px]">Ajustes</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              multiple
              className="hidden"
            />

            {/* Attach File Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAttachment}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
              title="Adjuntar archivos (PDF, código, imágenes, datos...)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Conversational Voice Button (Full-Duplex / Vibrational Dialogue) */}
            <button
              type="button"
              onClick={toggleFullDuplexConversation}
              className={`p-2.5 rounded-xl border transition-all ${
                isFullDuplexVoiceActive
                  ? 'bg-gradient-to-r from-purple-500/40 to-cyan-500/40 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/30 animate-pulse'
                  : 'bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25 hover:text-purple-100'
              }`}
              title="Modo Conversación de Voz Continua (Habla y escucha continua)"
            >
              <Volume2 className={`w-4 h-4 ${isFullDuplexVoiceActive ? 'text-cyan-300 animate-bounce' : ''}`} />
            </button>

            {/* Simple Mic Dictation Button (S2T) */}
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`p-2.5 rounded-xl border transition-colors ${
                isRecording
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
              title="Dictado por voz simple (OmniVoice STT)"
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isFullDuplexVoiceActive
                  ? "🎙️ Charla en vivo activa... habla naturalmente o escribe..."
                  : isRecording
                  ? "Escuchando dictado..."
                  : selectedPersonaIds.length > 1
                  ? `Pregunta a ${selectedPersonaIds.length} personalidades en debate coral...`
                  : `Pregunta a ${activePersona?.name || 'Astraura'}, suma @personalidades...`
              }
              className="flex-1 px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
            />

            {/* Stop Generation or Send Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold flex items-center justify-center transition-all animate-pulse"
                title="Detener generación"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={(!inputText.trim() && attachedFiles.length === 0)}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-40 transition-all flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Message Preferences Modal */}
      <MessagePreferencesModal
        isOpen={isMsgPrefsOpen}
        onClose={() => setIsMsgPrefsOpen(false)}
        preferences={msgPreferences}
        onSavePreferences={(newPrefs) => {
          setMsgPreferences(newPrefs);
          if (newPrefs.selected_personalities) {
            setSelectedPersonaIds(newPrefs.selected_personalities);
          }
          if (newPrefs.multi_personality_mode) {
            setMultiResponseMode(newPrefs.multi_personality_mode);
          }
        }}
        personalities={personalities}
      />
    </div>
  );
}
