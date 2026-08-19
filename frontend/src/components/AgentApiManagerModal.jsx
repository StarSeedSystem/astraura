import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  RefreshCw, 
  ShieldCheck, 
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
  Clock, 
  Layers, 
  Lock, 
  Unlock, 
  Terminal, 
  CheckCircle2, 
  Wand2 
} from 'lucide-react';
import { 
  fetchAgentApiDetail,
  regenerateAgentApiKey,
  revokeAgentApiKey,
  restoreAgentApiKey,
  updateAgentApiPermissions,
  saveAgentSyncServer,
  deleteAgentSyncServer,
  triggerAgentServerSync
} from '../services/api';

export default function AgentApiManagerModal({
  isOpen,
  onClose,
  agent
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

  const agentId = agent?.id || 'agent_aurora';

  const loadApiDetail = async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetchAgentApiDetail(agentId);
      if (res && res.success) {
        setApiDetail(res.detail);
      }
    } catch (err) {
      console.warn('Error loading agent API detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && agentId) {
      loadApiDetail();
    }
  }, [isOpen, agentId]);

  if (!isOpen || !agent) return null;

  const handleCopyKey = () => {
    if (!apiDetail?.api_key) return;
    navigator.clipboard.writeText(apiDetail.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = async () => {
    if (!confirm(`¿Regenerar la clave de API para el agente ${agent.name}? La clave anterior dejará de funcionar inmediatamente.`)) return;
    setLoading(true);
    try {
      await regenerateAgentApiKey(agentId);
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
        await revokeAgentApiKey(agentId);
      } else {
        await restoreAgentApiKey(agentId);
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
      await updateAgentApiPermissions(agentId, updated);
    } catch (err) {
      console.warn('Error updating agent permissions:', err);
    }
  };

  const handleAddServer = async (e) => {
    e.preventDefault();
    if (!newServerUrl.trim()) return;

    try {
      setLoading(true);
      await saveAgentSyncServer(agentId, {
        name: newServerName.trim() || 'Servidor Personalizado',
        url: newServerUrl.trim(),
        auth_token: newServerToken.trim(),
        server_type: newServerType,
        sync_mode: newServerSyncMode,
        sync_frequency: newServerFrequency,
        sync_scopes: ['tasks', 'branch_plans', 'memories']
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
    if (!confirm('¿Desvincular este servidor de sincronización del agente?')) return;
    try {
      await deleteAgentSyncServer(agentId, serverId);
      await loadApiDetail();
    } catch (err) {
      alert(`Error al eliminar servidor: ${err.message}`);
    }
  };

  const handleTriggerSync = async (serverId) => {
    setSyncingServerId(serverId);
    setSyncFeedback(null);
    try {
      const res = await triggerAgentServerSync(agentId, serverId);
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
    read_memory: { label: 'Lectura de Memoria & Exocórtex', desc: 'Permite consultar grafos de conocimiento, Mem0 y base vectorial.' },
    write_memory: { label: 'Escritura & Modificación de Memorias', desc: 'Permite crear nuevos recuerdos, conceptos y consolidar sinapsis.' },
    exec_terminal: { label: 'Ejecución en Terminal Shell', desc: 'Permite despachar comandos nativos en terminal y sandbox.' },
    fs_read: { label: 'Lectura de Archivos Locales', desc: 'Permite leer código fuente, bovedas y archivos del sistema.' },
    fs_write: { label: 'Escritura de Archivos & Código', desc: 'Permite forjar, modificar o guardar código y archivos en disco.' },
    invoke_subagents: { label: 'Invocación de Subagentes & Ramas', desc: 'Permite generar ramas de ejecución paralela y despachar tareas.' },
    hardware_senses: { label: 'Acceso a Sensores & Hardware M1', desc: 'Permite consultar telemetría térmica, batería y bus serial ESP32.' },
    imagination_spawn: { label: 'Disparo de Imaginación en Segundo Plano', desc: 'Permite generar sueños, hipótesis contrafácticas y shaders.' },
    sync_external: { label: 'Sincronización con Servidores', desc: 'Permite sincronizar tareas y estados con nodos remotos o locales.' },
    modify_agent_config: { label: 'Modificación de Configuración del Agente', desc: 'Permite alterar cuotas de CPU, ramificaciones y cerebros por API.' }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b0e17] border border-cyan-500/30 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* HEADER */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#0f1422] via-[#131929] to-[#0f1422] border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg"
              style={{ backgroundColor: `${agent.color || '#00f0ff'}20`, borderColor: `${agent.color || '#00f0ff'}60` }}
            >
              <Key className="w-6 h-6" style={{ color: agent.color || '#00f0ff' }} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-display font-bold text-white">
                  Sistema de API & Servidores: {agent.name}
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
                {apiDetail?.role || agent.role} • Acceso Programático Soberano 1.58b
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

        {/* TABS */}
        <div className="px-4 sm:px-6 pt-3 bg-[#0a0d15] border-b border-white/5 flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs font-mono">
          {[
            { id: 'keys', label: '🔑 Claves & Acceso', icon: Key },
            { id: 'permissions', label: '🛡️ Permisos de Modificación', icon: ShieldCheck },
            { id: 'servers', label: '🌐 Servidores & Sync', icon: Server },
            { id: 'processes', label: '⚡ Procesos & Telemetría', icon: Activity },
            { id: 'logs', label: '📜 Auditoría de API', icon: Clock }
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

        {/* BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
          
          {/* TAB 1: KEYS */}
          {activeTab === 'keys' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-cyan-400" />
                    Clave de API Soberana del Agente
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Creada: {apiDetail?.created_at_formatted || 'Hoy'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 rounded-xl bg-[#07090e] border border-white/10 font-mono text-xs text-white flex items-center justify-between overflow-hidden">
                    <span className="truncate">
                      {showKey ? (apiDetail?.api_key || 'ast_agent_none') : '••••••••••••••••••••••••••••••••••••••••••••'}
                    </span>
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="ml-2 text-slate-400 hover:text-cyan-300"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    onClick={handleCopyKey}
                    className="p-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs flex items-center gap-1.5 transition-colors shrink-0"
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
                    Límite: <span className="text-white font-bold">{apiDetail?.rate_limit_rpm || 150} req/min</span>
                  </div>
                </div>
              </div>

              {/* cURL Example */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  Ejemplo de Despacho Programático de Tareas
                </span>
                <div className="p-3 rounded-xl bg-[#06080e] border border-white/5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  <pre>{`curl -X POST http://127.0.0.1:8000/api/v1/agents/${agentId}/invoke \\
  -H "Content-Type: application/json" \\
  -H "X-Astraura-Key: ${apiDetail?.api_key || 'ast_agent_...'}" \\
  -d '{"prompt": "Auditar archivos y optimizar bucles SIMD en segundo plano."}'`}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200">
                Ajusta qué recursos del sistema operativo, memoria y hardware puede acceder o modificar este agente de forma autónoma.
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

          {/* TAB 3: SERVERS */}
          {activeTab === 'servers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-cyan-400" />
                    Servidores Vinculados al Agente
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Sincronización bidireccional de tareas, árboles de ramificación y memorias.
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

              {showAddServerForm && (
                <form onSubmit={handleAddServer} className="p-4 rounded-2xl bg-black/60 border border-cyan-500/30 space-y-3 animate-fade-in">
                  <h5 className="text-xs font-mono font-bold text-cyan-300">Vincular Servidor a {agent.name}</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Nombre</label>
                      <input 
                        type="text"
                        value={newServerName}
                        onChange={(e) => setNewServerName(e.target.value)}
                        placeholder="Ej: Nodo Remoto vLLM / Ollama"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-[#080b11] border border-white/10 text-white outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">URL del Endpoint</label>
                      <input 
                        type="url"
                        value={newServerUrl}
                        onChange={(e) => setNewServerUrl(e.target.value)}
                        placeholder="http://127.0.0.1:11434 o https://..."
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-[#080b11] border border-white/10 text-white outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Token / Bearer (Opcional)</label>
                      <input 
                        type="password"
                        value={newServerToken}
                        onChange={(e) => setNewServerToken(e.target.value)}
                        placeholder="Clave de autorización"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-[#080b11] border border-white/10 text-white outline-none"
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
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold"
                  >
                    Guardar y Conectar Servidor
                  </button>
                </form>
              )}

              <div className="space-y-3">
                {apiDetail?.external_servers?.map((srv) => (
                  <div 
                    key={srv.id}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-cyan-500/30 transition-all space-y-2.5"
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
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingServerId === srv.id ? 'animate-spin' : ''}`} />
                          <span>{syncingServerId === srv.id ? 'Sincronizando...' : 'Sincronizar'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteServer(srv.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {syncFeedback?.serverId === srv.id && (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{syncFeedback.message}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PROCESSES */}
          {activeTab === 'processes' && (
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Hilos & Procesos Nativos Asignados
              </span>
              <div className="space-y-2">
                {apiDetail?.active_processes?.map((proc) => (
                  <div key={proc.id} className="p-3 rounded-xl bg-[#080a11] border border-white/10 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-white">{proc.name}</span>
                    </div>
                    <span className="text-cyan-300">CPU: {proc.cpu || 2.0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Historial de Solicitudes API al Agente</span>
                <span>Total: <strong className="text-white">{apiDetail?.total_requests || 0} llamadas</strong></span>
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
                        <span className="text-emerald-400 font-bold text-[10px]">{log.status_code}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Cliente: {log.client_ip} • Ámbito: {log.scope_checked}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-400">
                      <div className="text-cyan-400 font-bold">{log.latency_ms} ms</div>
                      <div>{log.formatted_time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-[#0a0d15] border-t border-white/10 flex items-center justify-between text-xs font-mono">
          <div className="text-slate-400 text-[11px]">
            Agente: <strong className="text-white">{agent.name}</strong> • Conectividad Soberana 1.58b
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-colors"
          >
            Cerrar Panel
          </button>
        </div>

      </div>
    </div>
  );
}
