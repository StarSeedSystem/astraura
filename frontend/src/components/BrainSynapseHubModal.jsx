import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Sparkles, 
  Cpu, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Zap, 
  Users, 
  ListTodo, 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  X, 
  Check, 
  RotateCcw, 
  Radio, 
  FolderTree, 
  ShieldCheck,
  ChevronRight,
  Flame,
  Globe,
  HardDrive
} from 'lucide-react';
import { PRESET_PERSONALITIES } from './PersonalitiesView';
import { fetchCerebros, saveBrain, addDreamReminder } from '../services/api';

export default function BrainSynapseHubModal({
  isOpen,
  onClose,
  activeBrainId,
  onSelectBrain,
  swarmData,
  dreamData,
  onRefreshData
}) {
  const [cerebrosList, setCerebrosList] = useState([]);
  const [selectedBrain, setSelectedBrain] = useState(null);
  const [activeTab, setActiveTab] = useState('neurons'); // 'neurons', 'agents', 'tasks'
  const [newTaskText, setNewTaskText] = useState('');
  const [pendingTasks, setPendingTasks] = useState([
    { id: 'task_1', title: 'Sincronizar neurona de Exocórtex con ~/Documents', status: 'pending', priority: 'high' },
    { id: 'task_2', title: 'Ejecutar auto-refinamiento onírico en ciclo DMN', status: 'running', priority: 'medium' },
    { id: 'task_3', title: 'Verificar aceleración de 8 hilos NEON en BitLinear C++', status: 'pending', priority: 'high' },
    { id: 'task_4', title: 'Indexar nuevas sinapsis en grafo armónico StarSeed', status: 'completed', priority: 'low' }
  ]);

  useEffect(() => {
    if (isOpen) {
      loadCerebros();
    }
  }, [isOpen, activeBrainId]);

  const loadCerebros = async () => {
    try {
      const res = await fetchCerebros();
      if (res && res.cerebros) {
        setCerebrosList(res.cerebros);
        const current = res.cerebros.find(c => c.id === activeBrainId) || res.cerebros[0];
        setSelectedBrain(current);
      }
    } catch {
      // Fallback default cerebro
      const fallbackBrain = {
        id: 'brain_genesis',
        name: 'Cerebro Génesis (Soberanía & 1.58b)',
        theme: 'Génesis & Ontocracia',
        memory_neurons: [
          { id: 'neuron_exocortex', name: 'Neurona de Exocórtex & Grafos', lobe: 'Hipocampo', color: '#3b82f6', active_persona_id: 'astraura_prime', resonance_weight: 95, enabled: true },
          { id: 'neuron_vector_semantic', name: 'Neurona Semántica Vectorial', lobe: 'Córtex Prefrontal', color: '#00f0ff', active_persona_id: 'astraura_prime', resonance_weight: 90, enabled: true },
          { id: 'neuron_working_buffer', name: 'Neurona de Memoria de Trabajo', lobe: 'Tálamo', color: '#f59e0b', active_persona_id: 'hephaestus', resonance_weight: 85, enabled: true },
          { id: 'neuron_immutable_core', name: 'Neurona de Recuerdos Nucleares', lobe: 'Telencéfalo', color: '#10b981', active_persona_id: 'hermione_sovereign', resonance_weight: 100, enabled: true },
          { id: 'neuron_dream_synthesis', name: 'Neurona Onírica & DMN', lobe: 'Red DMN', color: '#8b5cf6', active_persona_id: 'kallisti', resonance_weight: 80, enabled: true },
          { id: 'neuron_procedural_skills', name: 'Neurona Procedimental & Skills', lobe: 'Cerebelo', color: '#ec4899', active_persona_id: 'hermes', resonance_weight: 88, enabled: true }
        ]
      };
      setCerebrosList([fallbackBrain]);
      setSelectedBrain(fallbackBrain);
    }
  };

  const handleNeuronPersonaChange = async (neuronId, newPersonaId) => {
    if (!selectedBrain) return;
    const updatedNeurons = (selectedBrain.memory_neurons || []).map(n => {
      if (n.id === neuronId) {
        return { ...n, active_persona_id: newPersonaId };
      }
      return n;
    });

    const updatedBrain = { ...selectedBrain, memory_neurons: updatedNeurons };
    setSelectedBrain(updatedBrain);

    try {
      await saveBrain(updatedBrain);
      setCerebrosList(prev => prev.map(c => c.id === updatedBrain.id ? updatedBrain : c));
    } catch (e) {
      console.warn('Error saving neuron persona:', e);
    }
  };

  const handleNeuronToggle = async (neuronId, enabled) => {
    if (!selectedBrain) return;
    const updatedNeurons = (selectedBrain.memory_neurons || []).map(n => {
      if (n.id === neuronId) {
        return { ...n, enabled };
      }
      return n;
    });

    const updatedBrain = { ...selectedBrain, memory_neurons: updatedNeurons };
    setSelectedBrain(updatedBrain);

    try {
      await saveBrain(updatedBrain);
      setCerebrosList(prev => prev.map(c => c.id === updatedBrain.id ? updatedBrain : c));
    } catch (e) {
      console.warn('Error toggling neuron:', e);
    }
  };

  const handleNeuronResonanceChange = async (neuronId, resonance_weight) => {
    if (!selectedBrain) return;
    const updatedNeurons = (selectedBrain.memory_neurons || []).map(n => {
      if (n.id === neuronId) {
        return { ...n, resonance_weight };
      }
      return n;
    });

    const updatedBrain = { ...selectedBrain, memory_neurons: updatedNeurons };
    setSelectedBrain(updatedBrain);
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    const newTask = {
      id: `task_${Date.now()}`,
      title: newTaskText.trim(),
      status: 'pending',
      priority: 'medium'
    };
    setPendingTasks([newTask, ...pendingTasks]);
    setNewTaskText('');
  };

  const toggleTaskStatus = (id) => {
    setPendingTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const deleteTask = (id) => {
    setPendingTasks(prev => prev.filter(t => t.id !== id));
  };

  if (!isOpen) return null;

  const agents = swarmData?.agents || [
    { id: 'orchestrator', name: 'Astraura Prime (Orquestador)', role: 'Coordinación & Síntesis', status: 'active', concurrency: 4, color: '#00f0ff', completed_tasks: 128 },
    { id: 'hephaestus', name: 'Hephaestus (Hardware & Terminal)', role: 'Terminal & C++ BitNet', status: 'active', concurrency: 2, color: '#f59e0b', completed_tasks: 64 },
    { id: 'hermes', name: 'Hermes (Navegador & Redes)', role: 'Browser-Use & Web', status: 'active', concurrency: 2, color: '#10b981', completed_tasks: 45 },
    { id: 'mnemosyne', name: 'Mnemosyne (Memoria & Grafo)', role: 'Base Vectorial & StarSeed', status: 'active', concurrency: 4, color: '#a855f7', completed_tasks: 210 },
    { id: 'logos', name: 'Logos (Razonador BitNet 1.58b)', role: 'Inferencia Ternaria SIMD', status: 'active', concurrency: 8, color: '#3b82f6', completed_tasks: 340 },
    { id: 'oneiros', name: 'Oneiros (Dream & Auto-Mejoramiento)', role: 'Imaginación & Consolidación', status: 'active', concurrency: 1, color: '#ec4899', completed_tasks: 19 }
  ];

  const subagents = swarmData?.subagents || [
    { id: 'sub_doc_indexer', parent_agent: 'mnemosyne', task: 'Indexación continua de documentos en ~/Documents', status: 'idle', uptime: '8h 12m' },
    { id: 'sub_browser_pool', parent_agent: 'hermes', task: 'Gestión de sesiones Playwright Headless', status: 'ready', uptime: '8h 12m' },
    { id: 'sub_dream_daemon', parent_agent: 'oneiros', task: 'Ciclo onírico cada 15 min en reposo', status: 'running', uptime: '4h 30m' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#0b0e17] border border-cyan-500/30 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in text-xs">
        {/* Modal Header */}
        <div className="p-4 bg-[#0e121e] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                Centro de Control Sináptico del Cerebro
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  Multi-Neuron Hub
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Selector del cerebro, asignación de personalidades por neurona, enjambre en ejecución y cola de tareas.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Brain Selector Top Bar */}
        <div className="p-3 bg-black/40 border-b border-white/5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1 font-mono">
              <Brain className="w-3.5 h-3.5" /> Cerebro Activo:
            </span>
            <select
              value={selectedBrain?.id || ''}
              onChange={(e) => {
                const target = cerebrosList.find(c => c.id === e.target.value);
                if (target) {
                  setSelectedBrain(target);
                  onSelectBrain(target.id);
                }
              }}
              className="p-1.5 rounded-lg bg-white/5 border border-cyan-500/30 text-white font-bold text-xs outline-none cursor-pointer"
            >
              {cerebrosList.map(c => (
                <option key={c.id} value={c.id} className="bg-[#0b0e17] text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 font-mono text-[11px]">
            <button
              onClick={() => setActiveTab('neurons')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'neurons' ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Neuronas ({selectedBrain?.memory_neurons?.length || 6})
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'agents' ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Agentes ({agents.length})
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'tasks' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              Tareas ({pendingTasks.filter(t => t.status !== 'completed').length})
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {/* TAB 1: NEURONAS & PERSONALIDADES ASIGNADAS */}
          {activeTab === 'neurons' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Personalidades y Arquetipos Operando por Neurona
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Alineación sináptica 1.58-Bit
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(selectedBrain?.memory_neurons || []).map((neuron) => {
                  const assignedPersona = PRESET_PERSONALITIES.find(p => p.id === (neuron.active_persona_id || 'astraura_prime')) || PRESET_PERSONALITIES[0];

                  return (
                    <div
                      key={neuron.id}
                      className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2.5 transition-all hover:border-cyan-500/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: neuron.color || '#00f0ff' }}
                          />
                          <span className="font-bold text-white text-xs">{neuron.name}</span>
                        </div>

                        <button
                          onClick={() => handleNeuronToggle(neuron.id, !neuron.enabled)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold transition-all ${
                            neuron.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-slate-500'
                          }`}
                        >
                          {neuron.enabled ? 'ACTIVA' : 'PAUSADA'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Región: {neuron.lobe || 'Córtex'}</span>
                        <span className="text-cyan-300 font-bold">Resonancia: {neuron.resonance_weight || 90}%</span>
                      </div>

                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={neuron.resonance_weight || 90}
                        onChange={(e) => handleNeuronResonanceChange(neuron.id, parseInt(e.target.value))}
                        className="w-full accent-cyan-400"
                      />

                      {/* Personality Assignment Selector */}
                      <div className="p-2 bg-black/40 rounded-lg space-y-1 border border-white/5">
                        <span className="text-[10px] text-purple-300 font-mono font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Arquetipo Encargado:
                        </span>
                        <select
                          value={neuron.active_persona_id || 'astraura_prime'}
                          onChange={(e) => handleNeuronPersonaChange(neuron.id, e.target.value)}
                          className="w-full p-1.5 rounded bg-white/5 border border-white/10 text-white font-medium text-xs outline-none"
                        >
                          {PRESET_PERSONALITIES.map(p => (
                            <option key={p.id} value={p.id} className="bg-[#0b0e17]">
                              {p.name} ({p.title})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: AGENTES Y PROCESOS EN EJECUCIÓN */}
          {activeTab === 'agents' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Enjambre de Agentes en Ejecución
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1.5 font-mono text-[11px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color || '#00f0ff' }} />
                          {agent.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          {agent.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">{agent.role}</p>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-white/5">
                        <span>Hilos: {agent.concurrency}</span>
                        <span className="text-cyan-300 font-bold">Tareas completadas: {agent.completed_tasks || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subagents in Background */}
              <div>
                <h4 className="text-[11px] font-bold text-purple-300 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Subagentes & Daemons en Segundo Plano
                </h4>
                <div className="space-y-2">
                  {subagents.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between font-mono text-[11px]"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-white block">{sub.task}</span>
                        <span className="text-[9px] text-slate-500">Padre: {sub.parent_agent} • Uptime: {sub.uptime}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {sub.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TAREAS PENDIENTES */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder="Añadir nueva tarea para el cerebro activo..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs outline-none focus:border-cyan-500/40"
                />
                <button
                  onClick={handleAddTask}
                  className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Añadir
                </button>
              </div>

              <div className="space-y-2">
                {pendingTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between font-mono text-xs ${
                      t.status === 'completed'
                        ? 'bg-white/5 border-white/5 text-slate-500 line-through'
                        : 'bg-white/5 border-white/10 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => toggleTaskStatus(t.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          t.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-500 text-black'
                            : 'border-white/20 hover:border-cyan-400 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <span>{t.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        t.priority === 'high' ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {t.priority}
                      </span>
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0e121e] border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            Cerebro: <span className="text-white font-bold">{selectedBrain?.name}</span>
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Check className="w-4 h-4" />
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
