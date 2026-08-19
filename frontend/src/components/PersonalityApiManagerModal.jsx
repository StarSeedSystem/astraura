import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  RefreshCw, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Server, 
  Globe, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Trash2, 
  Plus, 
  Activity, 
  Cpu, 
  Zap, 
  Sliders, 
  Clock, 
  Radio, 
  Layers, 
  Lock, 
  Unlock, 
  Terminal, 
  FileText, 
  HardDrive, 
  Sparkles,
  ArrowRight,
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  fetchPersonalityApiDetail,
  regeneratePersonalityApiKey,
  revokePersonalityApiKey,
  restorePersonalityApiKey,
  updatePersonalityApiPermissions,
  savePersonalitySyncServer,
  deletePersonalitySyncServer,
  triggerPersonalityServerSync
} from '../services/api';

export default function PersonalityApiManagerModal({
  isOpen,
  onClose,
  persona
}) {
  const [activeTab, setActiveTab] = useState('keys'); // 'keys' | 'permissions' | 'servers' | 'processes' | 'logs'
  const [loading, setLoading] = useState(false);
  const [apiDetail, setApiDetail] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [syncingServerId, setSyncingServerId] = useState(null);
  const [syncFeedback, setSyncFeedback] = useState(null);

  // New server form state
  const [showAddServerForm, setShowAddServerForm] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerUrl, setNewServerUrl] = useState('');
  const [newServerToken, setNewServerToken] = useState('');
  const [newServerType, setNewServerType] = useState('custom_rest');
  const [newServerSyncMode, setNewServerSyncMode] = useState('two_way');
  const [newServerFrequency, setNewServerFrequency] = useState('interval_5m');

  const personaId = persona?.id || 'aurora';

  const loadApiDetail = async () => {
    if (!personaId) return;
    setLoading(true);
    try {
      const res = await fetchPersonalityApiDetail(personaId);
      if (res && res.success) {
        setApiDetail(res.detail);
      }
    } catch (err) {
      console.warn('Error loading personality API detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && personaId) {
      loadApiDetail();
    }
  }, [isOpen, personaId]);

  if (!isOpen || !persona) return null;

  const handleCopyKey = () => {
    if (!apiDetail?.api_key) return;
    navigator.clipboard.writeText(apiDetail.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = async () => {
    if (!confirm(`¿Regenerar la clave de API para ${persona.name}? La clave anterior dejará de funcionar de inmediato.`)) return;
    setLoading(true);
    try {
      await regeneratePersonalityApiKey(personaId);
      await loadApiDetail();
    } catch (err) {
      alert(`Error al regenerar clave: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRevokeKey = async () => {
    setLoading(true);
    try {
      if (apiDetail?.status === 'active') {
        await revokePersonalityApiKey(personaId);
      } else {
        await restorePersonalityApiKey(personaId);
      }
      await loadApiDetail();
    } catch (err) {
      alert(`Error al cambiar estado de clave: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (scopeKey) => {
    if (!apiDetail) return;
    const updated = {
      ...apiDetail.permissions,
      [scopeKey]: !apiDetail.permissions[scopeKey]
    };
    try {
      setApiDetail(prev => ({ ...prev, permissions: updated }));
      await updatePersonalityApiPermissions(personaId, updated);
    } catch (err) {
      console.warn('Error updating permissions:', err);
    }
  };

  const handleAddServer = async (e) => {
    e.preventDefault();
    if (!newServerUrl.trim()) return;

    try {
      setLoading(true);
      await savePersonalitySyncServer(personaId, {
        name: newServerName.trim() || 'Servidor Personalizado',
        url: newServerUrl.trim(),
        auth_token: newServerToken.trim(),
        server_type: newServerType,
        sync_mode: newServerSyncMode,
        sync_frequency: newServerFrequency,
        sync_scopes: ['memories', 'documents', 'hardware_telemetry']
      });

      setShowAddServerForm(false);
      setNewServerName('');
      setNewServerUrl('');
      setNewServerToken('');
      await loadApiDetail();
    } catch (err) {
      alert(`Error al añadir servidor: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteServer = async (serverId) => {
    if (!confirm('¿Desvincular este servidor de sincronización?')) return;
    try {
      await deletePersonalitySyncServer(personaId, serverId);
      await loadApiDetail();
    } catch (err) {
      alert(`Error al eliminar servidor: ${err.message}`);
    }
  };

  const handleTriggerSync = async (serverId) => {
    setSyncingServerId(serverId);
    setSyncFeedback(null);
    try {
      const res = await triggerPersonalityServerSync(personaId, serverId);
      if (res && res.success) {
        setSyncFeedback({ serverId, message: res.message, latency: res.latency_ms });
      }
      await loadApiDetail();
    } catch (err) {
      setSyncFeedback({ serverId, error: err.message });
    } finally {
      setSyncingServerId(null);
    }
  };

  const permissionDescriptions = {
    read_memory: { label: 'Lectura de Memoria & Exocórtex', desc: 'Permite leer recuerdos de Mem0 y nodos del grafo de conocimiento.' },
    write_memory: { label: 'Escritura & Modificación de Memorias', desc: 'Permite crear nuevos conceptos, recuerdos y consolidar aprendizajes.' },
    exec_terminal: { label: 'Ejecución en Terminal Shell', desc: 'Permite ejecutar comandos nativos en el OS y servidores vinculados.' },
    fs_read: { label: 'Lectura del Sistema de Archivos', desc: 'Permite leer código, bovedas y archivos locales.' },
    fs_write: { label: 'Escritura & Modificación de Archivos', desc: 'Permite crear, editar o eliminar código y documentos.' },
    invoke_agents: { label: 'Invocación de Agentes & Enjambres', desc: 'Permite convocar procesos multiagénticos y subagentes en paralelo.' },
    hardware_senses: { label: 'Acceso a Sensores & Telemetría', desc: 'Permite consultar CPU, RAM, batería y enviar señales a ESP32.' },
    voice_synthesize: { label: 'Síntesis Vocal OmniVoice 1.58b', desc: 'Permite generar audio PCM nativo con el perfil vocal de la entidad.' },
    sync_external: { label: 'Sincronización con Servidores', desc: 'Permite transferir y sincronizar estados con servidores remotos/locales.' },
    modify_personality_profile: { label: 'Modificación del Perfil de Personalidad', desc: 'Permite reconfigurar prompts, rasgos y niveladores por API.' }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b0e17] border border-cyan-500/30 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#0f1422] via-[#131929] to-[#0f1422] border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg"
              style={{ 
                backgroundColor: `${persona.color || '#ec4899'}20`, 
                borderColor: `${persona.color || '#ec4899'}60` 
              }}
            >
              <Key className="w-6 h-6" style={{ color: persona.color || '#ec4899' }} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-display font-bold text-white">
                  Sistema de API & Conexiones: {persona.name}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                  apiDetail?.status === 'active' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {apiDetail?.status === 'active' ? '● Clave Activa' : '● Revocada'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {apiDetail?.role || 'Órgano Cognitivo StarSeed OS'} • Conexión Programática 1.58-Bit
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="px-4 sm:px-6 pt-3 bg-[#0a0d15] border-b border-white/5 flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs font-mono">
          {[
            { id: 'keys', label: '🔑 Claves & Acceso', icon: Key },
            { id: 'permissions', label: '🛡️ Permisos de Modificación', icon: ShieldCheck },
            { id: 'servers', label: '🌐 Servidores & Sync', icon: Server },
            { id: 'processes', label: '⚡ Procesos & Conexiones', icon: Activity },
            { id: 'logs', label: '📜 Registro de Actividad', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 border-b-2 font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 rounded-t-xl'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
          
          {/* TAB 1: API KEYS & ACCESS */}
          {activeTab === 'keys' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-cyan-400" />
                    Clave de API Soberana de la Personalidad
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Creada: {apiDetail?.created_at_formatted || 'Hoy'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 rounded-xl bg-[#07090e] border border-white/10 font-mono text-xs text-white flex items-center justify-between overflow-hidden">
                    <span className="truncate">
                      {showKey ? (apiDetail?.api_key || 'ast_key_none') : '••••••••••••••••••••••••••••••••••••••••••••'}
                    </span>
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="ml-2 text-slate-400 hover:text-cyan-300"
                      title={showKey ? "Ocultar clave" : "Mostrar clave"}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    onClick={handleCopyKey}
                    className="p-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs flex items-center gap-1.5 transition-colors shrink-0"
                    title="Copiar clave al portapapeles"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Copiada' : 'Copiar'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRegenerateKey}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 flex items-center gap-1.5 transition-colors"
                      title="Rotar y generar una nueva clave de API"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>Regenerar Clave</span>
                    </button>

                    <button
                      onClick={handleToggleRevokeKey}
                      disabled={loading}
                      className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
                        apiDetail?.status === 'active'
                          ? 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      {apiDetail?.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>{apiDetail?.status === 'active' ? 'Revocar Acceso' : 'Restaurar Clave'}</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Límite de Tasa: <span className="text-white font-bold">{apiDetail?.rate_limit_rpm || 120} req/min</span>
                  </div>
                </div>
              </div>

              {/* API Invocation Code Example */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  Ejemplo de Invocación Externa (cURL / Python / Node)
                </span>
                <div className="p-3 rounded-xl bg-[#06080e] border border-white/5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  <pre>{`curl -X POST http://127.0.0.1:8000/api/v1/personalities/${personaId}/invoke \\
  -H "Content-Type: application/json" \\
  -H "X-Astraura-Key: ${apiDetail?.api_key || 'ast_key_...'}" \\
  -d '{"prompt": "¿Cuál es el estado de la memoria y la forja de código?"}'`}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GRANULAR MODIFICATION & ACCESS PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200 space-y-1">
                <div className="font-bold font-mono text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Gobernanza Granular de Permisos & Seguridad 100% Soberana
                </div>
                <p className="text-slate-400 font-sans text-xs">
                  Define exactamente qué recursos puede leer, modificar, ejecutar o sincronizar cualquier cliente o script externo conectado a esta personalidad.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(permissionDescriptions).map(([key, info]) => {
                  const isEnabled = !!apiDetail?.permissions?.[key];
                  return (
                    <div 
                      key={key}
                      onClick={() => handleTogglePermission(key)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        isEnabled
                          ? 'bg-purple-950/20 border-purple-500/40 text-white ring-1 ring-purple-500/20'
                          : 'bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => {}}
                        className="mt-0.5 accent-cyan-400 rounded cursor-pointer"
                      />
                      <div className="flex-1 space-y-0.5">
                        <div className="text-xs font-bold font-mono flex items-center justify-between">
                          <span className={isEnabled ? 'text-cyan-200' : 'text-slate-300'}>{info.label}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            isEnabled ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-slate-500'
                          }`}>
                            {isEnabled ? 'PERMITIDO' : 'DENEGADO'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans leading-tight">
                          {info.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SERVERS & MULTI-SERVER SYNC */}
          {activeTab === 'servers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-cyan-400" />
                    Servidores Vinculados & Sincronización Remota
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Sincroniza el estado, memorias y tareas de {persona.name} con servidores locales y remotos.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddServerForm(!showAddServerForm)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddServerForm ? 'Cancelar' : 'Añadir Servidor'}</span>
                </button>
              </div>

              {/* Add Server Form */}
              {showAddServerForm && (
                <form onSubmit={handleAddServer} className="p-4 rounded-2xl bg-black/60 border border-cyan-500/30 space-y-3 animate-fade-in">
                  <h5 className="text-xs font-mono font-bold text-cyan-300">Vincular Nuevo Servidor a {persona.name}</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Nombre del Servidor</label>
                      <input 
                        type="text"
                        value={newServerName}
                        onChange={(e) => setNewServerName(e.target.value)}
                        placeholder="Ej: Nodo Ollama Local / Cluster vLLM"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-[#080b11] border border-white/10 text-white outline-none focus:border-cyan-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">URL del Endpoint</label>
                      <input 
                        type="url"
                        value={newServerUrl}
                        onChange={(e) => setNewServerUrl(e.target.value)}
                        placeholder="http://127.0.0.1:11434 o https://api..."
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-[#080b11] border border-white/10 text-white outline-none focus:border-cyan-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Token / Clave Bearer (Opcional)</label>
                      <input 
                        type="password"
                        value={newServerToken}
                        onChange={(e) => setNewServerToken(e.target.value)}
                        placeholder="Bearer token o secreto"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-[#080b11] border border-white/10 text-white outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Modo de Sincronización</label>
                      <select
                        value={newServerSyncMode}
                        onChange={(e) => setNewServerSyncMode(e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-[#080b11] border border-white/10 text-white outline-none"
                      >
                        <option value="two_way">Bidireccional (Two-Way Sync)</option>
                        <option value="push_only">Solo Envío (Push Only)</option>
                        <option value="pull_only">Solo Recepción (Pull Only)</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold transition-all shadow-md"
                  >
                    Guardar y Conectar Servidor
                  </button>
                </form>
              )}

              {/* Server List */}
              <div className="space-y-3">
                {apiDetail?.external_servers?.map((srv) => (
                  <div 
                    key={srv.id}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-cyan-500/30 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold font-mono text-white flex items-center gap-2">
                            <span>{srv.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {srv.latency_ms} ms
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{srv.url}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTriggerSync(srv.id)}
                          disabled={syncingServerId === srv.id}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                          title="Sincronizar ahora"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingServerId === srv.id ? 'animate-spin' : ''}`} />
                          <span>{syncingServerId === srv.id ? 'Sincronizando...' : 'Sincronizar'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteServer(srv.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/5 transition-colors"
                          title="Desvincular servidor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {syncFeedback?.serverId === srv.id && (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 animate-fade-in flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{syncFeedback.message}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-mono text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">Modo: {srv.sync_mode}</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">Frecuencia: {srv.sync_frequency}</span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        Ámbitos: {srv.sync_scopes?.join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVE PROCESSES & INTERNAL CONNECTIONS */}
          {activeTab === 'processes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Órganos & Cerebros Internos
                  </span>
                  <div className="space-y-1.5 text-xs font-mono text-slate-300">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Órgano Cognitivo:</span>
                      <span className="text-white font-bold">{apiDetail?.internal_connections?.cognitive_organ}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Cerebro Vinculado:</span>
                      <span className="text-cyan-300">{apiDetail?.internal_connections?.cerebro_id}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Acelerador SIMD:</span>
                      <span className="text-emerald-300">{apiDetail?.internal_connections?.hardware_accelerator}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Bus Serial ESP32:</span>
                      <span className="text-purple-300">{apiDetail?.internal_connections?.serial_bus_link}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                    Agentes & Subagentes Conectados
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {apiDetail?.internal_connections?.linked_agents?.map((agentId, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs font-mono">
                        ⚡ {agentId}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Subagent Threads */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Hilos & Procesos Nativos Activos
                </h4>
                <div className="space-y-2">
                  {apiDetail?.active_processes?.map((proc) => (
                    <div key={proc.id} className="p-3 rounded-xl bg-[#080a11] border border-white/10 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <div>
                          <div className="font-bold text-white">{proc.name}</div>
                          <span className="text-[10px] text-slate-500">{proc.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                        <span>CPU: <strong className="text-cyan-300">{proc.cpu_percent}%</strong></span>
                        <span>RAM: <strong className="text-purple-300">{proc.memory_mb} MB</strong></span>
                        <span>Hilos: <strong className="text-white">{proc.threads}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ACTIVITY AUDIT LOG */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Historial de Invocaciones & Llamadas a la API</span>
                <span>Total: <strong className="text-white">{apiDetail?.total_requests || 0} peticiones</strong></span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {apiDetail?.recent_activity_logs?.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">
                          {log.method}
                        </span>
                        <span className="text-white font-bold">{log.endpoint}</span>
                        <span className={`text-[10px] font-bold ${log.status_code === 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {log.status_code}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Cliente: {log.client_ip} • Ámbito: {log.scope_checked}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 space-y-0.5">
                      <div className="text-cyan-400 font-bold">{log.latency_ms} ms</div>
                      <div>{log.formatted_time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-[#0a0d15] border-t border-white/10 flex items-center justify-between text-xs font-mono">
          <div className="text-slate-400 text-[11px]">
            Personalidad: <strong className="text-white">{persona.name}</strong> • Conectividad Local 1.58b
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-colors"
          >
            Cerrar Panel de API
          </button>
        </div>

      </div>
    </div>
  );
}
