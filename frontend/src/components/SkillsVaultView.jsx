import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Layers, 
  ExternalLink, 
  Check, 
  Sliders, 
  RefreshCw, 
  Plus, 
  Globe, 
  Database, 
  Cpu, 
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { fetchVaultData, updateVaultConnection, updateVaultParameters } from '../services/api';

export default function SkillsVaultView() {
  const [vaultData, setVaultData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingConn, setEditingConn] = useState(null);
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [params, setParams] = useState({
    bitnet_threads: 8,
    bitnet_context_size: 2048,
    memory_cache_mb: 512,
    dream_interval_minutes: 15
  });

  const loadVault = async () => {
    setIsLoading(true);
    try {
      const data = await fetchVaultData();
      setVaultData(data);
      if (data.parameters) setParams(data.parameters);
    } catch (err) {
      console.error('Error loading vault data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVault();
  }, []);

  const handleSaveToken = async (e) => {
    e.preventDefault();
    if (!editingConn) return;
    try {
      await updateVaultConnection(editingConn.id, { token: tokenInput, status: 'connected' });
      setVaultData(prev => ({
        ...prev,
        connections: prev.connections.map(c => c.id === editingConn.id ? { ...c, token_set: true, status: 'connected' } : c)
      }));
      setEditingConn(null);
      setTokenInput('');
    } catch (err) {
      console.error('Error saving connection token:', err);
    }
  };

  const handleParamChange = async (key, val) => {
    const updated = { ...params, [key]: val };
    setParams(updated);
    try {
      await updateVaultParameters({ [key]: val });
    } catch (err) {
      console.error('Error updating vault parameters:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#08090d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-4 sm:p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
              <Key className="w-6 h-6 text-purple-400" />
              Bóveda de Conexiones, Claves & Parámetros
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
              Almacenamiento Seguro Encriptado
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Administra credenciales de Vercel, GitHub, Supabase, Hugging Face y parámetros de inferencia
          </p>
        </div>

        <button
          onClick={loadVault}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors self-start sm:self-auto"
          title="Recargar bóveda"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Edit Token Modal Form */}
      {editingConn && (
        <form onSubmit={handleSaveToken} className="p-5 rounded-2xl glass-panel border-purple-500/40 space-y-3 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              Configurar Clave / Token de {editingConn.name}
            </h3>
            <button type="button" onClick={() => setEditingConn(null)} className="text-xs text-slate-400 hover:text-white">✕</button>
          </div>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              required
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder={`Ingresa token para ${editingConn.name}...`}
              className="w-full px-4 py-2.5 pr-10 rounded-xl glass-input text-xs text-white font-mono"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setEditingConn(null)} className="px-3 py-1.5 rounded-xl bg-white/5 text-xs text-slate-300">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-1.5 rounded-xl bg-purple-500 text-white font-bold text-xs shadow-md">
              Guardar Credencial
            </button>
          </div>
        </form>
      )}

      {/* Connections List */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          Servicios & Conexiones Externas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {vaultData?.connections?.map((conn) => (
            <div
              key={conn.id}
              className="p-4 rounded-2xl bg-[#0a0d15] border border-white/5 hover:border-purple-500/30 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-display font-bold text-sm text-white">{conn.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono block">{conn.account}</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  conn.status === 'connected' || conn.token_set
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}>
                  {conn.status === 'connected' || conn.token_set ? 'Conectado' : 'Disponible'}
                </span>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <button
                  onClick={() => {
                    setEditingConn(conn);
                    setTokenInput('');
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-mono hover:underline"
                >
                  {conn.token_set ? 'Actualizar Token' : 'Configurar Clave'}
                </button>
                {conn.url && (
                  <a href={conn.url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engine Fine-Tuning Parameters */}
      <div className="p-5 rounded-2xl glass-panel border-white/10 space-y-4">
        <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          Parámetros Personalizados de Inferencia & Memoria
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Hilos de Cálculo BitNet:</span>
              <span className="text-cyan-400 font-bold">{params.bitnet_threads} Núcleos</span>
            </div>
            <input
              type="range"
              min="1"
              max="16"
              value={params.bitnet_threads}
              onChange={e => handleParamChange('bitnet_threads', parseInt(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="space-y-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Ventana de Contexto (Tokens):</span>
              <span className="text-purple-400 font-bold">{params.bitnet_context_size}</span>
            </div>
            <input
              type="range"
              min="512"
              max="8192"
              step="256"
              value={params.bitnet_context_size}
              onChange={e => handleParamChange('bitnet_context_size', parseInt(e.target.value))}
              className="w-full accent-purple-400"
            />
          </div>

          <div className="space-y-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Caché L2 de Memoria (MB):</span>
              <span className="text-emerald-400 font-bold">{params.memory_cache_mb} MB</span>
            </div>
            <input
              type="range"
              min="128"
              max="2048"
              step="128"
              value={params.memory_cache_mb}
              onChange={e => handleParamChange('memory_cache_mb', parseInt(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </div>

          <div className="space-y-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Intervalo de Sueño Onírico (Min):</span>
              <span className="text-pink-400 font-bold">{params.dream_interval_minutes} min</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={params.dream_interval_minutes}
              onChange={e => handleParamChange('dream_interval_minutes', parseInt(e.target.value))}
              className="w-full accent-pink-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
