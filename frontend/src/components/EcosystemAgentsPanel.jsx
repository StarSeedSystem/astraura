import React, { useState, useEffect } from 'react';
import { Bot, RefreshCw } from 'lucide-react';
import { fetchEcosystemAgents } from '../services/api';
import AgentPanel from './AgentPanel';

/**
 * Panel autónomo del ecosistema de agentes 1.58-bit.
 * Hace su propio fetch de /api/agents y renderiza un AgentPanel por cada
 * agente (Orquestador de Autorizaciones, Director, Architectus-ProjectMaster,
 * Routing/Storage y los 6 del enjambre) con switch de activación y config
 * editable. Se inserta en múltiples secciones (Imaginación Intuitiva,
 * Enjambre, Tareas en 2do Plano) sin acoplarse a sus estados internos.
 */
export default function EcosystemAgentsPanel({ title = 'Agentes del Ecosistema 1.58-bit', filterSection = null }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await fetchEcosystemAgents();
      if (r && r.agents) {
        const list = filterSection ? r.agents.filter(a => a.section === filterSection) : r.agents;
        setAgents(list);
      }
    } catch (e) { /* noop */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="rounded-2xl bg-black/40 border border-cyan-500/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold text-cyan-300">
          <Bot className="w-3.5 h-3.5" /> {title}
        </div>
        <button onClick={load} className="text-slate-400 hover:text-cyan-300 cursor-pointer" title="Refrescar">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
      {loading ? (
        <div className="text-[10px] text-slate-500">Cargando agentes…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {agents.map(a => (
            <AgentPanel key={a.id} agent={a} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
