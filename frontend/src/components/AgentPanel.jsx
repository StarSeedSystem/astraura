import React, { useState } from 'react';
import { Power, Settings2, Save, RefreshCw, Cpu, Brain, FolderTree, Server, Zap } from 'lucide-react';
import { toggleAgentEnabled, updateAgentConfig } from '../services/api';

/**
 * Panel reutilizable de un Agente del ecosistema 1.58-bit.
 * Muestra: emoji + nombre + rol, switch de activación, estado en vivo,
 * y configuración editable (todos los campos configurables).
 * Se usa en: Tareas en Progreso 2do Plano, Imaginación Intuitiva,
 * Enjambre Multiagéntico y Enrutamiento/Almacenamiento.
 */
export default function AgentPanel({ agent, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localCfg, setLocalCfg] = useState(agent.config || {});
  const [saved, setSaved] = useState(false);

  const isOn = agent.enabled;

  const handleToggle = async () => {
    setBusy(true);
    try {
      await toggleAgentEnabled(agent.id, !isOn);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (onChanged) onChanged();
    } catch (e) {
      console.warn('toggle agent error', e);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await updateAgentConfig(agent.id, localCfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (onChanged) onChanged();
    } catch (e) {
      console.warn('save config error', e);
    } finally {
      setBusy(false);
    }
  };

  const setField = (k, v) => setLocalCfg(prev => ({ ...prev, [k]: v }));

  return (
    <div className={`rounded-2xl border p-3 transition-all ${isOn ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-start gap-3">
        <div className={`text-2xl ${isOn ? '' : 'grayscale opacity-50'}`}>{agent.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-white text-sm truncate">{agent.name}</h4>
            {agent.is_busy && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 animate-pulse flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> activo
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{agent.role}</p>
          <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500 font-mono">
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{agent.area}</span>
            {agent.status_detail?.orchestrations_run !== undefined && (
              <span>runs: {agent.status_detail.orchestrations_run}</span>
            )}
            {agent.status_detail?.sync_runs !== undefined && (
              <span>syncs: {agent.status_detail.sync_runs}</span>
            )}
            {agent.status_detail?.completed_tasks !== undefined && (
              <span>tareas: {agent.status_detail.completed_tasks}</span>
            )}
          </div>
        </div>

        {/* Switch de activación */}
        <button
          onClick={handleToggle}
          disabled={busy}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${isOn ? 'bg-emerald-500' : 'bg-slate-600'}`}
          title={isOn ? 'Desactivar agente' : 'Activar agente'}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOn ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Botón de config editable */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
        >
          <Settings2 className="w-3 h-3" /> Configurar
        </button>
        {agent.id === 'routing_storage_agent' && (
          <span className="text-[9px] text-cyan-300 font-mono flex items-center gap-1">
            <Server className="w-3 h-3" /> Malla Multi-Dispositivo
          </span>
        )}
      </div>

      {/* Panel de configuración editable */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {Object.entries(localCfg).map(([k, v]) => {
            if (typeof v === 'boolean') {
              return (
                <label key={k} className="flex items-center justify-between text-[10px] text-slate-300">
                  <span className="capitalize flex items-center gap-1"><Power className="w-3 h-3 text-emerald-400" />{k.replace(/_/g, ' ')}</span>
                  <input
                    type="checkbox"
                    checked={v}
                    onChange={e => setField(k, e.target.checked)}
                    className="accent-emerald-500 w-4 h-4"
                  />
                </label>
              );
            }
            if (typeof v === 'number') {
              return (
                <label key={k} className="flex items-center justify-between text-[10px] text-slate-300">
                  <span className="capitalize flex items-center gap-1"><Cpu className="w-3 h-3 text-cyan-400" />{k.replace(/_/g, ' ')}</span>
                  <input
                    type="number"
                    value={v}
                    onChange={e => setField(k, Number(e.target.value))}
                    className="w-20 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-slate-200"
                  />
                </label>
              );
            }
            if (typeof v === 'string' && v.length < 80) {
              return (
                <label key={k} className="flex items-center justify-between gap-2 text-[10px] text-slate-300">
                  <span className="capitalize flex items-center gap-1"><FolderTree className="w-3 h-3 text-amber-400" />{k.replace(/_/g, ' ')}</span>
                  <input
                    type="text"
                    value={v}
                    onChange={e => setField(k, e.target.value)}
                    className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-slate-200"
                  />
                </label>
              );
            }
            if (Array.isArray(v)) {
              return (
                <div key={k} className="text-[10px] text-slate-400">
                  <span className="capitalize flex items-center gap-1"><Brain className="w-3 h-3 text-pink-400" />{k.replace(/_/g, ' ')} ({v.length})</span>
                  <textarea
                    value={JSON.stringify(v, null, 1)}
                    onChange={e => { try { setField(k, JSON.parse(e.target.value)); } catch (_) {} }}
                    rows={3}
                    className="w-full mt-1 bg-black/40 border border-white/10 rounded px-1.5 py-1 text-slate-300 font-mono text-[9px]"
                  />
                </div>
              );
            }
            if (typeof v === 'object' && v) {
              return (
                <div key={k} className="text-[10px] text-slate-400">
                  <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                  <textarea
                    value={JSON.stringify(v, null, 1)}
                    onChange={e => { try { setField(k, JSON.parse(e.target.value)); } catch (_) {} }}
                    rows={3}
                    className="w-full mt-1 bg-black/40 border border-white/10 rounded px-1.5 py-1 text-slate-300 font-mono text-[9px]"
                  />
                </div>
              );
            }
            return null;
          })}
          <button
            onClick={handleSave}
            disabled={busy}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer disabled:opacity-50"
          >
            {busy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {saved ? '✅ Guardado' : 'Guardar Configuración'}
          </button>
        </div>
      )}
    </div>
  );
}
