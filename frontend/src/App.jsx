import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Network, 
  Cpu, 
  Layers, 
  Sliders, 
  Sparkles, 
  Activity, 
  HardDrive, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  Radio, 
  FolderTree, 
  Terminal as TerminalIcon, 
  BookOpen, 
  ExternalLink,
  Globe,
  Box,
  Compass,
  User,
  Users,
  Key,
  GitBranch,
  Moon,
  Menu,
  X,
  Brain,
  Orbit,
  Bell,
  ShieldCheck,
  Server,
  Palette,
  Headphones,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

import ChatInterface from './components/ChatInterface';
import CerebrosView from './components/CerebrosView';
import StarSeedMemoriesView from './components/StarSeedMemoriesView';
import Memory3DGraphView from './components/Memory3DGraphView';
import SystemDiagnostics from './components/SystemDiagnostics';
import WorkspaceFiles from './components/WorkspaceFiles';
import EnvironmentWidget from './components/EnvironmentWidget';
import QuantumVoiceOrbWidget from './components/QuantumVoiceOrbWidget';
import ComputerFileExplorer from './components/ComputerFileExplorer';
import StarSeedLibrary from './components/StarSeedLibrary';
import TerminalConsole from './components/TerminalConsole';
import BrowserViewport from './components/BrowserViewport';
import UniversalInstallerHub from './components/UniversalInstallerHub';
import PersonalitiesView, { PRESET_PERSONALITIES } from './components/PersonalitiesView';
import AgentSwarmView from './components/AgentSwarmView';
import SkillsVaultView from './components/SkillsVaultView';
import WorkflowsView from './components/WorkflowsView';
import DreamStudioView from './components/DreamStudioView';
import Sensorium360View from './components/Sensorium360View';
import IntuitiveImaginationView from './components/IntuitiveImaginationView';
import CreationsView from './components/CreationsView';
import ProjectsView from './components/ProjectsView';
import VoiceStudioView from './components/VoiceStudioView';
import StorageRoutingView from './components/StorageRoutingView';
import NotificationsLogsView from './components/NotificationsLogsView';
import PrivacySecurityControlView from './components/PrivacySecurityControlView';
import SettingsPreferencesView from './components/SettingsPreferencesView';
import SettingsModal from './components/SettingsModal';
import DeviceContextModal from './components/DeviceContextModal';
import GatewayModal from './components/GatewayModal';
import UniversalDeviceModal from './components/UniversalDeviceModal';
import ThemePickerModal from './components/ThemePickerModal';
import { ChatWebSocketClient, fetchStatus, fetchSystemNotifications } from './services/api';
import { webCognition } from './services/webCognition';
import { deviceContextDetector } from './services/deviceContextDetector';
import { omniVoice } from './services/omniVoice';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('astraura_sidebar_visible');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  const toggleSidebar = () => {
    setIsSidebarVisible((prev) => {
      const next = !prev;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('astraura_sidebar_visible', String(next));
      }
      return next;
    });
  };

  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [isUniversalPermsModalOpen, setIsUniversalPermsModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [deviceProfile, setDeviceProfile] = useState(null);

  // Chat Sessions & Folders State
  const [folders, setFolders] = useState(() => {
    try {
      const saved = localStorage.getItem('astraura_chat_folders');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'default', name: 'General' },
      { id: 'projects', name: 'Proyectos 1.58b' },
      { id: 'starseed', name: 'Investigación StarSeed' },
      { id: 'web', name: 'Automatización Web' }
    ];
  });

  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('astraura_chat_sessions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'session_init',
        title: 'Bienvenida a Astraura 1.58b',
        folderId: 'default',
        createdAt: Date.now(),
        messages: []
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    try {
      const saved = localStorage.getItem('astraura_active_session_id');
      if (saved) return saved;
    } catch {}
    return 'session_init';
  });

  // Keep Refs for callbacks to avoid stale closures
  const activeSessionIdRef = useRef(activeSessionId);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // Active Personality State (Default: Aurora)
  const [activePersonaId, setActivePersonaId] = useState('aurora');
  const activePersona = PRESET_PERSONALITIES.find(p => p.id === activePersonaId) || PRESET_PERSONALITIES[0];

  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTraces, setActiveTraces] = useState([]);
  const activeTracesRef = useRef([]);
  useEffect(() => {
    activeTracesRef.current = activeTraces;
  }, [activeTraces]);

  const [currentStreamText, setCurrentStreamText] = useState('');
  const [activeNodes, setActiveNodes] = useState([]);
  const [envData, setEnvData] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [skillsCount, setSkillsCount] = useState(12);
  const [activeBrainId, setActiveBrainId] = useState('brain_genesis');
  const [swarmData, setSwarmData] = useState(null);
  const [dreamData, setDreamData] = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [learningNotifications, setLearningNotifications] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    systemPrompt: activePersona.systemPrompt,
    temperature: activePersona.temperature,
    threads: 8,
    contextSize: 2048,
    enableAgents: true,
    enableDreamEngine: true,
    soundEffects: true,
    airGapPrivacy: false,
    theme: 'cyan'
  });

  // Poll system notifications & unread count
  useEffect(() => {
    const checkNotifs = async () => {
      try {
        const notifData = await fetchSystemNotifications();
        if (notifData && typeof notifData.unread_count === 'number') {
          setUnreadNotifCount(notifData.unread_count);
        }
      } catch (e) {
        // Silently continue
      }
    };
    checkNotifs();
    const interval = setInterval(checkNotifs, 10000);
    return () => clearInterval(interval);
  }, []);

  const wsClientRef = useRef(null);

  // Save sessions & folders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('astraura_chat_folders', JSON.stringify(folders));
      localStorage.setItem('astraura_chat_sessions', JSON.stringify(sessions));
      localStorage.setItem('astraura_active_session_id', activeSessionId);
    } catch {}
  }, [folders, sessions, activeSessionId]);

  const [activeBranchingPlan, setActiveBranchingPlan] = useState(null);
  const [activeBranchingLatency, setActiveBranchingLatency] = useState(null);
  const activeBranchingPlanRef = useRef(null);

  const handleStreamCompletion = (fullText, traces) => {
    const targetSessionId = activeSessionIdRef.current;
    const finalTraces = traces || activeTracesRef.current || [];
    const finalBranching = activeBranchingPlanRef.current || null;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === targetSessionId) {
          const updatedMessages = [
            ...s.messages,
            {
              id: Date.now().toString(),
              sender: 'ai',
              text: fullText,
              agentTraces: finalTraces,
              branchingPlan: finalBranching,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ];
          return { ...s, messages: updatedMessages };
        }
        return s;
      })
    );
    setIsStreaming(false);
    setActiveTraces([]);
    activeTracesRef.current = [];
    setCurrentStreamText('');
  };

  // Initial Status & WebSocket Connection
  useEffect(() => {
    fetchStatus()
      .then((data) => {
        setEnvData(data.environment);
        setTelemetry(data.telemetry);
        setProfileData(data.profiler);
        if (data.swarm_status) setSwarmData(data.swarm_status);
        if (data.dream_status) setDreamData(data.dream_status);
        if (data.skills_active) setSkillsCount(data.skills_active);
        omniVoice.fetchVoiceStudioProfiles().catch(() => {});
      })
      .catch((err) => console.warn('Backend offline, running in in-browser cognitive mode:', err));

    const client = new ChatWebSocketClient(
      (data) => {
        if (data.type === 'init_state') {
          setEnvData(data.environment);
          setTelemetry(data.telemetry);
          setProfileData(data.profile);
          if (data.swarm) setSwarmData(data.swarm);
          if (data.dream) setDreamData(data.dream);
          if (data.skills) setSkillsCount(data.skills.filter(s => s.enabled).length);
        } else if (data.type === 'branching_plan') {
          setActiveBranchingPlan(data.plan);
          setActiveBranchingLatency(data.elapsed_seconds);
          activeBranchingPlanRef.current = data.plan;
        } else if (data.type === 'agent_traces') {
          setActiveTraces(data.traces || []);
          activeTracesRef.current = data.traces || [];
          setActiveNodes(data.related_nodes || []);
        } else if (data.type === 'token') {
          setCurrentStreamText((prev) => prev + data.token);
          if (omniVoice.isConversationActive) {
            omniVoice.feedStreamToken(data.token);
          }
        } else if (data.type === 'done') {
          if (omniVoice.isConversationActive) {
            omniVoice.endProgressiveStream();
          }
          handleStreamCompletion(data.full_text, activeTracesRef.current);
        } else if (data.type === 'learning_event') {
          const evt = data.event;
          setLearningNotifications((prev) => [
            {
              id: Date.now(),
              message: evt.data?.message || 'Nuevo concepto consolidado en memoria asociativa',
              time: evt.time_formatted || 'Ahora'
            },
            ...prev.slice(0, 3)
          ]);
        } else if (data.type === 'dream_cycle_event') {
          const evt = data.event;
          setLearningNotifications((prev) => [
            {
              id: Date.now(),
              message: `🌙 Sueño en 2do Plano [${evt.process_name}]: ${evt.theme}`,
              time: evt.time_formatted || 'Ahora'
            },
            ...prev.slice(0, 3)
          ]);
        } else if (data.type === 'imagination_insight_event') {
          const evt = data.event;
          setLearningNotifications((prev) => [
            {
              id: Date.now(),
              message: `💡 Intuición Sensorial: ${evt.hypothesis}`,
              time: evt.time_formatted || 'Ahora'
            },
            ...prev.slice(0, 3)
          ]);
        }
      },
      () => console.log('WebSocket Connected to Astraura Engine'),
      () => console.log('WebSocket Disconnected')
    );

    client.connect();
    wsClientRef.current = client;

    return () => {
      client.close();
    };
  }, []);

  useEffect(() => {
    deviceContextDetector.detectAll().then((p) => {
      setDeviceProfile(p);
      // Auto-load smart preferences per device
      try {
        const saved = localStorage.getItem('astraura_device_preferences');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.activePersonaId) setActivePersonaId(parsed.activePersonaId);
          if (parsed.activeBrainId) setActiveBrainId(parsed.activeBrainId);
          if (parsed.settings) setSettings(prev => ({ ...prev, ...parsed.settings }));
        }
      } catch (e) {
        console.warn('Device preferences auto-load error:', e);
      }
    });
    const unsubscribe = deviceContextDetector.subscribe((p) => setDeviceProfile(p));
    return () => unsubscribe();
  }, []);

  // Auto-save device preferences whenever personality, brain, or settings change
  useEffect(() => {
    try {
      const currentPrefs = {
        activePersonaId,
        activeBrainId,
        settings,
        savedAt: Date.now()
      };
      localStorage.setItem('astraura_device_preferences', JSON.stringify(currentPrefs));
    } catch {}
  }, [activePersonaId, activeBrainId, settings]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const currentMessages = activeSession?.messages || [];

  const handleSendMessage = async (text, preferences = null) => {
    if (!text.trim() || isStreaming) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const title = s.messages.length === 0 ? text.slice(0, 28) + (text.length > 28 ? '...' : '') : s.title;
          return { ...s, title, messages: [...s.messages, userMsg] };
        }
        return s;
      })
    );

    setIsStreaming(true);
    setCurrentStreamText('');
    setActiveTraces([]);
    activeTracesRef.current = [];

    if (omniVoice.isConversationActive) {
      omniVoice.startProgressiveStream({ personaId: activePersonaId });
    }

    // 1. Try WebSocket if open
    if (wsClientRef.current?.ws?.readyState === WebSocket.OPEN) {
      wsClientRef.current.sendMessage(text, settings.systemPrompt, preferences || {});
      return;
    }

    // 2. Try HTTP REST API endpoint /api/chat if local server is reachable
    try {
      const httpRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, system_prompt: settings.systemPrompt, preferences: preferences || {} }),
        signal: AbortSignal.timeout(6000)
      });
      if (httpRes.ok) {
        const jsonRes = await httpRes.json();
        if (jsonRes.agent_traces) {
          setActiveTraces(jsonRes.agent_traces);
          activeTracesRef.current = jsonRes.agent_traces;
        }
        if (omniVoice.isConversationActive && jsonRes.response) {
          omniVoice.speak(jsonRes.response, { persona_id: activePersonaId });
        }
        handleStreamCompletion(jsonRes.response, jsonRes.agent_traces);
        return;
      }
    } catch (e) {
      console.log('HTTP chat fallback to Web Cognition:', e);
    }

    // 3. Fallback to In-Browser Web Cognition Engine
    try {
      let fullGen = '';
      let currentTraces = [];
      for await (const event of webCognition.generateWebResponseStream(text, settings.systemPrompt, activePersonaId)) {
        if (event.type === 'agent_traces') {
          currentTraces = event.traces;
          setActiveTraces(event.traces);
          activeTracesRef.current = event.traces;
        } else if (event.type === 'token') {
          fullGen += event.token;
          setCurrentStreamText(fullGen);
          if (omniVoice.isConversationActive) {
            omniVoice.feedStreamToken(event.token);
          }
        } else if (event.type === 'done') {
          if (omniVoice.isConversationActive) {
            omniVoice.endProgressiveStream();
          }
          handleStreamCompletion(event.full_text, currentTraces);
        }
      }
    } catch (err) {
      console.error('Web generation error:', err);
      setIsStreaming(false);
    }
  };

  const handleStopStreaming = () => {
    setIsStreaming(false);
    if (currentStreamText) {
      handleStreamCompletion(currentStreamText, activeTraces);
    }
  };

  const handleForkSession = (fromMessageId) => {
    if (!activeSession) return;
    const msgIndex = activeSession.messages.findIndex((m) => m.id === fromMessageId);
    if (msgIndex === -1) return;
    const forkedMessages = activeSession.messages.slice(0, msgIndex + 1);
    const newSession = {
      id: `session_fork_${Date.now()}`,
      title: `Bifurcación: ${activeSession.title}`,
      folderId: activeSession.folderId || 'default',
      createdAt: Date.now(),
      messages: forkedMessages
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleRegenerate = () => {
    if (!activeSession || activeSession.messages.length === 0 || isStreaming) return;
    const lastUserMsg = [...activeSession.messages].reverse().find((m) => m.sender === 'user');
    if (lastUserMsg) {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            const msgs = s.messages.filter((m, idx) => idx !== s.messages.length - 1 || m.sender === 'user');
            return { ...s, messages: msgs };
          }
          return s;
        })
      );
      handleSendMessage(lastUserMsg.text);
    }
  };

  const handleNewSession = () => {
    const newSession = {
      id: `session_${Date.now()}`,
      title: 'Nueva Conversación',
      folderId: 'default',
      createdAt: Date.now(),
      messages: []
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleCreateFolder = (name) => {
    const newFolder = { id: `folder_${Date.now()}`, name };
    setFolders((prev) => [...prev, newFolder]);
  };

  const handleDeleteFolder = (folderId) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setSessions((prev) =>
      prev.map((s) => (s.folderId === folderId ? { ...s, folderId: 'default' } : s))
    );
  };

  const handleDeleteSession = (sessionId) => {
    const remaining = sessions.filter((s) => s.id !== sessionId);
    if (remaining.length === 0) {
      const fallback = {
        id: `session_${Date.now()}`,
        title: 'Nueva Conversación',
        folderId: 'default',
        createdAt: Date.now(),
        messages: []
      };
      setSessions([fallback]);
      setActiveSessionId(fallback.id);
    } else {
      setSessions(remaining);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
      }
    }
  };

  const activeAgentsCount = swarmData?.active_agents_count || dreamData?.active_agents_count || 6;
  const activeProcessesCount = dreamData?.active_processes_count || 6;
  const imaginationBadge = `${activeAgentsCount}A • ${activeProcessesCount}P`;

  const navTabs = [
    { id: 'chat', label: 'Chat Multiagéntico & Voz', icon: MessageSquare, color: 'cyan' },
    { id: 'voice_studio', label: 'VoiceStudio & Forja de Sonido', icon: Headphones, color: 'purple', badge: '646 Idiomas' },
    { id: 'projects', label: 'Proyectos & Clasificación', icon: FolderTree, color: 'emerald', badge: 'Automáticos' },
    { id: 'creations', label: 'Creaciones & Evolución Progresiva', icon: Sparkles, color: 'pink', badge: '5 Forjadas' },
    { id: 'imagination', label: 'Imaginación Intuitiva (Always-On)', icon: Sparkles, color: 'purple', badge: imaginationBadge },
    { id: 'storage', label: 'Enrutamiento de Almacenamiento & Medios', icon: HardDrive, color: 'cyan' },
    { id: 'sensorium', label: 'Sensorium 360° & Clima', icon: Activity, color: 'cyan' },
    { id: 'privacy', label: 'Privacidad & Permisos de Sensores', icon: ShieldCheck, color: 'emerald' },
    { id: 'notifications', label: 'Notificaciones & Logs', icon: Bell, color: 'amber', badge: unreadNotifCount > 0 ? unreadNotifCount : null },
    { id: 'cerebros', label: 'Cerebros Multidimensionales', icon: Brain, color: 'purple' },
    { id: 'memories', label: 'Memorias y Recuerdos', icon: Network, color: 'indigo' },
    { id: 'personalities', label: 'Personalidades / Arquetipos', icon: Sparkles, color: 'purple' },
    { id: 'swarm', label: 'Enjambre de Agentes', icon: Users, color: 'cyan' },
    { id: 'browser', label: 'Navegador Autónomo', icon: Globe, color: 'emerald' },
    { id: 'explorer', label: 'Explorador del Dispositivo', icon: FolderTree, color: 'blue' },
    { id: 'workflows', label: 'Workflows & Automatización', icon: GitBranch, color: 'emerald' },
    { id: 'vault', label: 'Habilidades & Bóveda', icon: Key, color: 'purple' },
    { id: 'installer', label: 'Instalador Universal & Scan', icon: Box, color: 'cyan' },
    { id: 'library', label: 'Biblioteca StarSeed', icon: Layers, color: 'pink', badge: skillsCount },
    { id: 'telemetry', label: 'Telemetría 1.58-Bit', icon: Cpu, color: 'teal' },
    { id: 'terminal', label: 'Terminal & Sandbox', icon: TerminalIcon, color: 'amber' },
    { id: 'settings', label: 'Configuración & Preferencias', icon: Sliders, color: 'cyan' }
  ];

  return (
    <div className="flex h-screen w-screen bg-[#07090e] text-slate-100 font-sans overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[45%] h-[45%] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Hermes Left Navigation Sidebar (Desktop & Tablet) */}
      <aside className={`w-80 h-full bg-[#0a0d15]/95 border-r border-white/10 flex flex-col p-3 space-y-2.5 z-20 shrink-0 transition-all duration-300 ${isSidebarVisible ? 'hidden lg:flex' : 'hidden'}`}>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1.5 py-1 border-b border-white/5 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20 shrink-0">
              <div className="w-full h-full bg-[#07090e] rounded-[11px] flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-cyan-400" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-black text-base text-white tracking-wider flex items-center gap-1.5 leading-none">
                ASTRAURA
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  1.58b
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5 truncate">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0" />
                StarSeed Cognitive OS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsUniversalPermsModalOpen(true)}
              className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono flex items-center gap-1 shadow-sm cursor-pointer transition-all"
              title="Acceso Universal a Archivos y Hardware del Dispositivo"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-bold">Permisos</span>
            </button>

            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Ocultar menú lateral (Guardar estado)"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto pr-1 custom-scrollbar">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/15 border border-cyan-500/40 text-cyan-200 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Icon className="w-4 h-4 shrink-0 text-cyan-400/80" />
                  <span className="truncate text-left">{tab.label}</span>
                </div>
                {tab.badge && (
                  <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/25 text-purple-300 font-mono font-bold border border-purple-500/30">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sensory & Voice Footer */}
        <div className="pt-2 border-t border-white/10 shrink-0 space-y-2">
          {/* Quantum Holographic Siri-Style Voice Orb & Controls */}
          <QuantumVoiceOrbWidget
            activePersona={activePersona}
            onSelectPersona={(p) => setActivePersonaId(p?.id || p)}
            personalities={PRESET_PERSONALITIES}
            onDirectConversationSpeech={(text) => handleSendMessage(text)}
          />

          <EnvironmentWidget 
            envData={envData} 
            activeBrainId={activeBrainId} 
            onSelectBrain={(id) => setActiveBrainId(id)} 
            swarmData={swarmData} 
            dreamData={dreamData} 
            activePersona={activePersona} 
          />
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden p-2 sm:p-4 pb-16 lg:pb-4 relative z-10 min-w-0">
        {/* Top Header */}
        <header className="mb-2 sm:mb-3 p-2 sm:p-2.5 bg-[#0d1017]/90 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between gap-1.5 sm:gap-3 shadow-lg shrink-0">
          {/* Left: Mobile & Desktop Menu Toggle & Core Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto custom-scrollbar min-w-0 text-xs font-mono">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 shrink-0 cursor-pointer"
              title="Abrir Menú Móvil"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            {/* Desktop Sidebar Toggle Button (Guardar / Mostrar Menú) */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-cyan-300 text-xs font-mono transition-all cursor-pointer shrink-0 shadow-sm"
              title={isSidebarVisible ? "Ocultar menú lateral (Guardar vista)" : "Mostrar menú lateral"}
            >
              {isSidebarVisible ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5 text-cyan-400" />}
              <span className="hidden xl:inline">{isSidebarVisible ? 'Ocultar Menú' : 'Mostrar Menú'}</span>
            </button>

            <span className="px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold">1.58b</span>
              <span className="hidden md:inline text-cyan-400/80 text-[10px]">{-1, 0, 1}</span>
            </span>

            <span className="px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-bold truncate max-w-[100px] sm:max-w-[160px]">{activePersona.name}</span>
            </span>
          </div>

          {/* Right: Actions, Unified Themes & System Status */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 overflow-x-auto custom-scrollbar">
            {/* Single Unified Theme & Style Button */}
            <button
              onClick={() => setIsThemeModalOpen(true)}
              className="text-xs px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-500/20 to-cyan-500/20 hover:from-purple-500/30 hover:to-cyan-500/30 border border-purple-500/40 text-purple-200 font-mono transition-all flex items-center gap-1.5 cursor-pointer font-bold shadow-sm whitespace-nowrap"
              title="Galería de Estilos & Diseñador de Temas"
            >
              <Palette className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              <span className="hidden sm:inline">Estilos & Temas</span>
              <span className="sm:hidden">Temas</span>
            </button>

            {/* Device Context */}
            <button
              onClick={() => setIsDeviceModalOpen(true)}
              className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Ver contexto del dispositivo, hardware y permisos detectados"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline truncate max-w-[100px]">{deviceProfile?.os || 'Auto'}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 font-bold">
                {deviceProfile?.logicalCores ? `${deviceProfile.logicalCores}C` : 'NEON'}
              </span>
              {deviceProfile?.localBridge?.connected && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Puente Local Activo" />
              )}
            </button>

            {/* Notifications */}
            <button
              onClick={() => setActiveTab('notifications')}
              className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono transition-colors flex items-center gap-1.5 relative whitespace-nowrap"
              title="Notificaciones & Logs Ramificados"
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Notificaciones</span>
              {unreadNotifCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>

            {/* Quick Shortcuts: VoiceStudio, Creaciones, Cerebros (Responsive) */}
            <button
              onClick={() => setActiveTab('voice_studio')}
              className={`text-xs px-2.5 py-1 rounded-lg font-mono transition-colors flex items-center gap-1.5 font-bold whitespace-nowrap ${
                activeTab === 'voice_studio'
                  ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200'
                  : 'bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300'
              }`}
              title="VoiceStudio 1.58b • Clonación, Diseño de Voces y SFX"
            >
              <Headphones className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden md:inline">VoiceStudio</span>
            </button>

            <button
              onClick={() => setActiveTab('creations')}
              className={`text-xs px-2.5 py-1 rounded-lg font-mono transition-colors flex items-center gap-1.5 font-bold whitespace-nowrap ${
                activeTab === 'creations'
                  ? 'bg-pink-500/30 border border-pink-400 text-pink-200'
                  : 'bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300'
              }`}
              title="Estudio de Creaciones & Evolución Progresiva"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span className="hidden md:inline">Creaciones</span>
            </button>

            <button
              onClick={() => setActiveTab('cerebros')}
              className={`hidden lg:flex text-xs px-2.5 py-1 rounded-lg font-mono transition-colors items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'cerebros'
                  ? 'bg-purple-500/30 border border-purple-400 text-purple-200'
                  : 'bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300'
              }`}
            >
              <Brain className="w-3.5 h-3.5 shrink-0" />
              <span>Cerebros</span>
            </button>
          </div>
        </header>

        {/* Small Screens Integrated Menu Voice Orb Top Bar */}
        <div className="lg:hidden mb-2.5 p-2 bg-[#090c14]/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-md shrink-0">
          <QuantumVoiceOrbWidget
            activePersona={activePersona}
            onSelectPersona={(p) => setActivePersonaId(p?.id || p)}
            personalities={PRESET_PERSONALITIES}
            onDirectConversationSpeech={(text) => handleSendMessage(text)}
          />
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden p-3 bg-[#0a0d15] rounded-2xl border border-white/10 space-y-1 mb-2 z-30 animate-slide-up max-h-72 overflow-y-auto">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
                }`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0 text-cyan-400/80" />
                <span className="flex-1 text-left">{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/25 text-purple-300 font-mono font-bold border border-purple-500/30">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content Display */}
        <div className="flex-1 h-full overflow-hidden">
          {activeTab === 'chat' && (
            <ChatInterface
              messages={currentMessages}
              isStreaming={isStreaming}
              activeTraces={activeTraces}
              activeBranchingPlan={activeBranchingPlan}
              activeBranchingLatency={activeBranchingLatency}
              currentStreamText={currentStreamText}
              onSendMessage={handleSendMessage}
              onStopStreaming={handleStopStreaming}
              onForkSession={handleForkSession}
              onRegenerate={handleRegenerate}
              activeNodes={activeNodes}
              onOpenExplorer={() => setActiveTab('explorer')}
              activePersona={activePersona}
              onOpenPersonalities={() => setActiveTab('personalities')}
              onSelectPersona={(id) => setActivePersonaId(id)}
              sessions={sessions}
              activeSessionId={activeSessionId}
              folders={folders}
              onSelectSession={setActiveSessionId}
              onNewSession={handleNewSession}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onDeleteSession={handleDeleteSession}
            />
          )}

          {activeTab === 'voice_studio' && <VoiceStudioView onBackToChat={() => setActiveTab('chat')} />}
          {activeTab === 'projects' && <ProjectsView />}
          {activeTab === 'creations' && <CreationsView />}
          {activeTab === 'sensorium' && <Sensorium360View />}
          {(activeTab === 'imagination' || activeTab === 'dream') && <IntuitiveImaginationView />}
          {activeTab === 'storage' && <StorageRoutingView />}
          {activeTab === 'privacy' && <PrivacySecurityControlView />}
          {activeTab === 'notifications' && <NotificationsLogsView />}

          {activeTab === 'cerebros' && <CerebrosView />}
          {(activeTab === 'memories' || activeTab === 'graph' || activeTab === 'graph3d') && <StarSeedMemoriesView />}

          {activeTab === 'personalities' && (
            <PersonalitiesView
              activePersonaId={activePersonaId}
              onSelectPersona={(id) => {
                setActivePersonaId(id);
                setActiveTab('chat');
              }}
              onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
            />
          )}

          {activeTab === 'swarm' && <AgentSwarmView />}
          {activeTab === 'browser' && <BrowserViewport />}
          {activeTab === 'explorer' && <ComputerFileExplorer onFileSelectForChat={() => setActiveTab('chat')} />}
          {activeTab === 'workflows' && <WorkflowsView />}
          {activeTab === 'vault' && <SkillsVaultView />}
          {activeTab === 'installer' && <UniversalInstallerHub />}
          {activeTab === 'library' && <StarSeedLibrary />}
          {activeTab === 'telemetry' && <SystemDiagnostics />}
          {activeTab === 'terminal' && <TerminalConsole />}
          {activeTab === 'settings' && (
            <SettingsPreferencesView
              settings={settings}
              onSaveSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
            />
          )}
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialSettings={settings}
        onSaveSettings={(newSettings) => setSettings(newSettings)}
      />

      {/* Universal Device Context & Native Permissions Modal */}
      <DeviceContextModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
      />

      {/* Host Mac M1 / Gateway HTTPS Tunnel Modal */}
      <GatewayModal
        isOpen={isGatewayModalOpen}
        onClose={() => setIsGatewayModalOpen(false)}
      />

      {/* Universal Device & Hardware Permissions Modal */}
      <UniversalDeviceModal
        isOpen={isUniversalPermsModalOpen}
        onClose={() => setIsUniversalPermsModalOpen(false)}
      />

      {/* Theme Gallery Modal */}
      <ThemePickerModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* Organic Mobile Bottom Navigation Dock (Smartphones & Small Tablets) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#07090e]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-2xl font-mono text-[10px]">
        {[
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'imagination', label: 'Imaginación', icon: Sparkles },
          { id: 'cerebros', label: 'Cerebros', icon: Brain },
          { id: 'memories', label: 'Memoria', icon: Layers }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-cyan-300 font-bold bg-cyan-500/20 shadow-md shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'scale-110 animate-pulse' : ''}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Theme Quick Switcher */}
        <button
          onClick={() => setIsThemeModalOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-purple-300 hover:text-purple-200"
        >
          <Palette className="w-4 h-4" />
          <span>Temas</span>
        </button>

        {/* More Options / Drawer Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
            isMobileMenuOpen ? 'text-amber-300 bg-amber-500/20' : 'text-slate-400'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span>Más</span>
        </button>
      </div>
    </div>
  );
}
