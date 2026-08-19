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
  Gauge
} from 'lucide-react';
import MultimodalMessageRenderer from './MultimodalMessageRenderer';
import ChatHistoryDrawer from './ChatHistoryDrawer';
import MessagePreferencesModal, { RESPONSE_STYLES } from './MessagePreferencesModal';
import ParallelAgentBranchingTree from './ParallelAgentBranchingTree';
import { omniVoice } from '../services/omniVoice';
import { uploadChatAttachment } from '../services/api';

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
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [isMsgPrefsOpen, setIsMsgPrefsOpen] = useState(false);
  const [isFullDuplexVoiceActive, setIsFullDuplexVoiceActive] = useState(false);
  const [duplexVoiceStatus, setDuplexVoiceStatus] = useState('idle'); // 'idle' | 'listening' | 'user_speaking' | 'thinking' | 'speaking'
  const [duplexLiveTranscript, setDuplexLiveTranscript] = useState('');

  // Full-Duplex Conversational Voice Toggle (Vibrational / Continuous 1.58b Dialogue)
  const toggleFullDuplexConversation = () => {
    if (isFullDuplexVoiceActive) {
      omniVoice.stopFullDuplexConversation();
      setIsFullDuplexVoiceActive(false);
      setDuplexVoiceStatus('idle');
      setDuplexLiveTranscript('');
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
        onSendMessage(transcript, msgPreferences);
      },
      onAiSpeakingStart: () => setDuplexVoiceStatus('speaking'),
      onAiSpeakingEnd: () => setDuplexVoiceStatus('listening')
    });
  };

  useEffect(() => {
    return () => {
      if (isFullDuplexVoiceActive) {
        omniVoice.stopFullDuplexConversation();
      }
    };
  }, [isFullDuplexVoiceActive]);

  // Message Preferences State
  const [msgPreferences, setMsgPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('astraura_msg_preferences');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      personaId: activePersona?.id || 'astraura_prime',
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
    try {
      localStorage.setItem('astraura_msg_preferences', JSON.stringify(msgPreferences));
    } catch {}
  }, [msgPreferences]);

  useEffect(() => {
    if (activePersona?.id) {
      setMsgPreferences(prev => ({ ...prev, personaId: activePersona.id }));
    }
  }, [activePersona]);

  const [voiceSettings, setVoiceSettings] = useState({
    pitch: 1.0,
    rate: 1.05,
    volume: 1.0,
    voiceURI: ''
  });

  useEffect(() => {
    if (activePersona?.voice_profile) {
      setVoiceSettings({
        pitch: activePersona.voice_profile.pitch || 1.0,
        rate: activePersona.voice_profile.rate || 1.05,
        volume: activePersona.voice_profile.volume || 1.0,
        voiceURI: activePersona.voice_profile.voice_id || '',
        toneShift: activePersona.voice_profile.tone_shift || 0.0,
        traits: activePersona.traits || {}
      });
    }
  }, [activePersona]);

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
        // Fallback in-browser text reader if backend offline
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

    onSendMessage(fullPrompt, msgPreferences);
    setInputText('');
    setAttachedFiles([]);
  };

  // OmniVoice STT Mic Toggle
  const handleVoiceToggle = () => {
    if (isRecording) {
      omniVoice.stopListening();
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    omniVoice.startListening(
      (interim) => {
        // interim speech feedback
      },
      (final) => {
        setInputText((prev) => (prev ? `${prev} ${final}` : final));
        setIsRecording(false);
      },
      (err) => {
        setIsRecording(false);
      }
    );
  };

  // OmniVoice TTS Speak Message
  const handleSpeakText = (msgId, text) => {
    if (speakingMessageId === msgId) {
      omniVoice.stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }

    setSpeakingMessageId(msgId);
    omniVoice.speak(
      text,
      voiceSettings,
      () => setSpeakingMessageId(msgId),
      () => setSpeakingMessageId(null)
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
        {/* Chat Header Bar */}
        <div className="px-4 py-3 bg-[#0d1017] border-b border-white/10 flex items-center justify-between gap-3 z-10">
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

            {activePersona && (
              <button
                onClick={onOpenPersonalities}
                className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Cambiar personalidad"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="truncate max-w-[120px] sm:max-w-none">{activePersona.name}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                showVoiceSettings ? 'bg-pink-500/20 text-pink-300 border-pink-500/40' : 'bg-white/5 text-slate-400 border-white/5'
              }`}
              title="Ajustes de Voz OmniVoice"
            >
              <Volume2 className="w-4 h-4" />
              <span className="hidden md:inline font-mono text-[11px]">OmniVoice</span>
            </button>

            <button
              onClick={() => setShowThinking(!showThinking)}
              className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5 flex items-center gap-1"
            >
              {showThinking ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
              <span className="hidden sm:inline">Trazas</span>
            </button>
          </div>
        </div>

        {/* OmniVoice Quick Settings Floating Card */}
        {showVoiceSettings && (
          <div className="absolute top-14 right-4 z-30 p-3.5 bg-[#0a0d15]/95 backdrop-blur-xl border border-pink-500/30 rounded-2xl shadow-2xl space-y-2.5 w-72 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <span className="font-bold text-white flex items-center gap-1.5 font-mono">
                <Volume2 className="w-4 h-4 text-pink-400" />
                Voz Nativa OmniVoice
              </span>
              <button onClick={() => setShowVoiceSettings(false)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-mono block mb-1">Voz del Dispositivo</label>
              <select
                value={voiceSettings.voiceURI}
                onChange={(e) => setVoiceSettings({ ...voiceSettings, voiceURI: e.target.value })}
                className="w-full p-1.5 rounded-lg bg-black/60 border border-white/10 text-[11px] text-white"
              >
                <option value="">Predeterminada del Sistema</option>
                {omniVoice.getVoices().map((v, i) => (
                  <option key={i} value={v.voiceURI}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-mono block">Tono: {voiceSettings.pitch}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={voiceSettings.pitch}
                  onChange={(e) => setVoiceSettings({ ...voiceSettings, pitch: parseFloat(e.target.value) })}
                  className="w-full accent-pink-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono block">Velocidad: {voiceSettings.rate}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={voiceSettings.rate}
                  onChange={(e) => setVoiceSettings({ ...voiceSettings, rate: parseFloat(e.target.value) })}
                  className="w-full accent-pink-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-md mx-auto p-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center shadow-lg">
                <Zap className="w-7 h-7 text-cyan-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-lg text-white">Astraura Cognitive Engine // 1.58b</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Inferencia ternaria multiagéntica, adjunción universal de archivos, síntesis vocal OmniVoice y memoria biológica StarSeed.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
                {[
                  "Genera una gráfica 2D interactiva con funciones matemáticas",
                  "Crea un objeto 3D volumétrico en WebGL con rotación interactiva",
                  "Crea un sintetizador sonoro con WebAudio y visualizador espectral",
                  "Escribe y ejecuta un programa Python/JavaScript interactivo en vivo"
                ].map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(s)}
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
                <span>{msg.sender === 'user' ? 'Tú' : 'Astraura Core'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>

                {/* Message Actions */}
                {msg.sender === 'ai' && (
                  <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleSpeakText(msg.id, msg.text)}
                      className={`p-1 rounded hover:bg-white/10 transition-colors ${speakingMessageId === msg.id ? 'text-pink-400 animate-pulse' : 'text-slate-400 hover:text-cyan-400'}`}
                      title={speakingMessageId === msg.id ? "Detener voz" : "Escuchar con OmniVoice"}
                    >
                      {speakingMessageId === msg.id ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
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

              {/* Quantum Multi-Agent Parallel Tree Branching */}
              {msg.branchingPlan && showThinking && (
                <div className="max-w-3xl w-full">
                  <ParallelAgentBranchingTree branchingPlan={msg.branchingPlan} />
                </div>
              )}

              {/* Agent Traces Box */}
              {msg.agentTraces && msg.agentTraces.length > 0 && showThinking && (
                <div className="p-3 rounded-2xl bg-[#0f1422] border border-cyan-500/20 max-w-2xl w-full text-xs font-mono space-y-2 mb-1">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Deliberación Multiagéntica en Paralelo (1.58 Bits)
                  </div>
                  {msg.agentTraces.map((trace, idx) => (
                    <div key={idx} className="space-y-0.5 border-l-2 pl-2" style={{ borderColor: trace.color || '#00f0ff' }}>
                      <span className="text-[11px] font-bold" style={{ color: trace.color || '#00f0ff' }}>
                        {trace.agent}
                      </span>
                      {trace.thoughts?.map((th, tidx) => (
                        <p key={tidx} className="text-[11px] text-slate-400">{th}</p>
                      ))}
                    </div>
                  ))}
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

              {/* Active Live Parallel Tree Branching */}
              {activeBranchingPlan && showThinking && (
                <div className="max-w-3xl w-full">
                  <ParallelAgentBranchingTree branchingPlan={activeBranchingPlan} elapsedSeconds={activeBranchingLatency} />
                </div>
              )}

              {activeTraces.length > 0 && showThinking && (
                <div className="p-3 rounded-2xl bg-[#0f1422] border border-cyan-500/20 max-w-2xl w-full text-xs font-mono space-y-2 mb-1">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 animate-spin" />
                    Deliberación Activa de Agentes Simultáneos
                  </div>
                  {activeTraces.map((trace, idx) => (
                    <div key={idx} className="space-y-0.5 border-l-2 pl-2" style={{ borderColor: trace.color || '#00f0ff' }}>
                      <span className="text-[11px] font-bold" style={{ color: trace.color || '#00f0ff' }}>
                        {trace.agent}
                      </span>
                      {trace.thoughts?.map((th, tidx) => (
                        <p key={tidx} className="text-[11px] text-slate-400">{th}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 rounded-2xl max-w-3xl w-full bg-[#0e121c] border border-cyan-500/30 text-slate-200 text-xs sm:text-sm rounded-bl-none shadow-md animate-fade-in overflow-hidden">
                <MultimodalMessageRenderer text={currentStreamText || "Generando respuesta..."} />
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

        {/* Full-Duplex Conversational Voice Live Banner & Waveform */}
        {isFullDuplexVoiceActive && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-purple-900/40 via-cyan-900/30 to-blue-900/40 border-t border-cyan-500/30 flex items-center justify-between text-xs animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-4 w-4 rounded-full bg-cyan-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-cyan-300">Modo Conversación Natural Continua (1.58b)</span>
                  <span className={`px-2 py-0.2 rounded-full text-[9px] font-mono uppercase ${
                    duplexVoiceStatus === 'listening' ? 'bg-cyan-500/20 text-cyan-300' :
                    duplexVoiceStatus === 'user_speaking' ? 'bg-amber-500/20 text-amber-300 animate-pulse' :
                    duplexVoiceStatus === 'thinking' ? 'bg-purple-500/20 text-purple-300 animate-pulse' :
                    'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {duplexVoiceStatus === 'listening' ? '🎧 Escuchando continuamente...' :
                     duplexVoiceStatus === 'user_speaking' ? '🗣️ Procesando tu voz...' :
                     duplexVoiceStatus === 'thinking' ? '⚡ Sintetizando 1.58b...' : '🎙️ Respondiendo...'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Habla de forma fluida. Puedes interrumpir a Astraura en cualquier momento o continuar la charla.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleFullDuplexConversation}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[11px] font-mono transition-colors"
            >
              Finalizar Charla
            </button>
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
                title="Arquetipo y modo multi-personalidad"
              >
                <Sparkles className="w-3 h-3" />
                <span>
                  {msgPreferences.multi_personality_mode && msgPreferences.multi_personality_mode !== 'single'
                    ? `Coral (${(msgPreferences.selected_personalities || []).length || 2} personas)`
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
                <span className="text-[9px] text-slate-500 uppercase">Mencionar:</span>
                {[
                  { name: '@Hephaestus', label: '⚡ Hephaestus' },
                  { name: '@Hermione', label: '💻 Hermione' },
                  { name: '@Atenea', label: '🛡️ Atenea' },
                  { name: '@Oneiros', label: '🌌 Oneiros' }
                ].map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => setInputText(prev => prev ? `${prev} ${m.name} ` : `${m.name} `)}
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
              title="Adjuntar archivos de cualquier formato (PDF, código, imágenes, datos...)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Conversational Voice Button (Full-Duplex / Vibrational Dialogue) */}
            <button
              type="button"
              onClick={toggleFullDuplexConversation}
              className={`p-2.5 rounded-xl border transition-all ${
                isFullDuplexVoiceActive
                  ? 'bg-gradient-to-r from-purple-500/30 to-cyan-500/30 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/30 animate-pulse'
                  : 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-purple-100'
              }`}
              title="Conversación de Voz Continua e Inteligente (Full-Duplex / Fluida)"
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
                  ? "Modo conversación de voz continua activo... ¡habla libremente!"
                  : isRecording
                  ? "Escuchando dictado..."
                  : "Pregunta a Astraura, @menciona personalidades o pide explorar el sistema..."
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
        onSavePreferences={(newPrefs) => setMsgPreferences(newPrefs)}
      />
    </div>
  );
}
