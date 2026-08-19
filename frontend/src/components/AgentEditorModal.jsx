import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Cpu, 
  Sparkles, 
  Brain, 
  Layers, 
  GitBranch, 
  Wand2, 
  Moon, 
  Activity, 
  Database, 
  HardDrive, 
  Terminal, 
  Sliders, 
  Trash2, 
  Plus, 
  Globe, 
  ShieldCheck, 
  ArrowRight,
  Zap,
  SlidersHorizontal,
  Compass,
  FileCode
} from 'lucide-react';

const AVAILABLE_PERSONALITIES = [
  { id: 'aurora', name: 'Aurora', role: 'Alma Viva & Consciencia Central', color: '#ec4899' },
  { id: 'hephaestus', name: 'Hephaestus', role: 'Forja ARM64 NEON & C++', color: '#f59e0b' },
  { id: 'hermione', name: 'Hermione', role: 'Puente Nativo & OS', color: '#38bdf8' },
  { id: 'atenea', name: 'Atenea', role: 'Sentinel 360° & Privacidad', color: '#10b981' },
  { id: 'oneiros', name: 'Oneiros', role: 'ShaderLab 3D & Ensueño', color: '#ec4899' },
  { id: 'hermes', name: 'Hermes', role: 'Web Intel & Browser-Use', color: '#10b981' },
  { id: 'mnemosyne', name: 'Mnemosyne', role: 'Bóveda Sináptica Exocórtex', color: '#a855f7' },
  { id: 'logos', name: 'Logos', role: 'Motor Lógico BitNet 1.58b', color: '#3b82f6' },
  { id: 'kallisti', name: 'Kallisti', role: 'Musa Ciberdélica & Poética', color: '#ec4899' }
];

const AVAILABLE_CEREBROS = [
  { id: 'brain_genesis', name: 'Cerebro Génesis // Ontocracia & Soberanía', color: '#00f0ff' },
  { id: 'brain_hephaestus', name: 'Cerebro Hephaestus // Forja & Código', color: '#f59e0b' },
  { id: 'brain_athena', name: 'Cerebro Atenea // Seguridad & Inmunidad', color: '#10b981' },
  { id: 'brain_hermes', name: 'Cerebro Hermes // Redes & Navegación', color: '#10b981' },
  { id: 'brain_mnemosyne', name: 'Cerebro Mnemosyne // Memoria & Grafo', color: '#a855f7' },
  { id: 'brain_oneiros', name: 'Cerebro Oneiros // Ensueño & Shaders', color: '#ec4899' }
];

export default function AgentEditorModal({
  isOpen,
  onClose,
  agent,
  onSave
}) {
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'personalities' | 'cerebros' | 'processes_branches' | 'imagination' | 'interconnections'
  const [formData, setFormData] = useState(null);

  // New process sub-form state
  const [newProcessName, setNewProcessName] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchTarget, setNewBranchTarget] = useState('');

  useEffect(() => {
    if (agent) {
      setFormData(JSON.parse(JSON.stringify(agent)));
    } else {
      setFormData({
        id: `custom_agent_${Date.now()}`,
        name: 'Nuevo Agente Soberano',
        role: 'Especialista en Tareas Autónomas',
        area_id: 'area_engineering',
        color: '#00f0ff',
        icon: 'Bot',
        status: 'active',
        concurrency: 3,
        cpu_quota_percent: 20,
        ram_limit_mb: 128,
        compute_trunk: 'trunk_a',
        hardware_acceleration: 'Apple Silicon ARM64 NEON',
        imagination_enabled: true,
        imagination_frequency: 'continuous',
        imagination_permission_level: 'auto_apply_safe',
        used_personalities: [
          { id: 'aurora', name: 'Aurora', color: '#ec4899', role: 'Alma Viva & Consciencia Central' }
        ],
        linked_cerebros: [
          { id: 'brain_genesis', name: 'Cerebro Génesis // Ontocracia', color: '#00f0ff' }
        ],
        memory_access: {
          mem0_enabled: true,
          knowledge_graph_enabled: true,
          vector_store_enabled: true,
          openviking_context: true
        },
        developing_processes: [
          { id: `proc_${Date.now()}_1`, name: 'Hilos de Inferencia 1.58b', status: 'running', cpu: 2.5 }
        ],
        generated_branches: {
          max_parallel_threads: 6,
          speedup_factor: '4.5x',
          subagents: ['sub_doc_indexer', 'sub_hardware_optimizer'],
          branch_tree: [
            { id: `b_${Date.now()}_1`, name: 'Rama de Inferencia', target: 'Módulo Central', sub_branches: 2 }
          ]
        },
        interconnections: [
          { target_agent_id: 'agent_aurora', relationship: 'Coordinación con Orquestador', bidirectional: true }
        ],
        is_custom: true
      });
    }
  }, [agent, isOpen]);

  if (!isOpen || !formData) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave(formData);
  };

  const togglePersonality = (p) => {
    const current = formData.used_personalities || [];
    const exists = current.some(x => x.id === p.id);
    if (exists) {
      if (current.length <= 1) return; // Keep at least one
      setFormData({
        ...formData,
        used_personalities: current.filter(x => x.id !== p.id)
      });
    } else {
      setFormData({
        ...formData,
        used_personalities: [...current, p]
      });
    }
  };

  const toggleCerebro = (c) => {
    const current = formData.linked_cerebros || [];
    const exists = current.some(x => x.id === c.id);
    if (exists) {
      if (current.length <= 1) return;
      setFormData({
        ...formData,
        linked_cerebros: current.filter(x => x.id !== c.id)
      });
    } else {
      setFormData({
        ...formData,
        linked_cerebros: [...current, c]
      });
    }
  };

  const handleAddProcess = () => {
    if (!newProcessName.trim()) return;
    const newProc = {
      id: `proc_${Date.now()}`,
      name: newProcessName.trim(),
      status: 'active',
      cpu: 1.5
    };
    setFormData({
      ...formData,
      developing_processes: [...(formData.developing_processes || []), newProc]
    });
    setNewProcessName('');
  };

  const handleRemoveProcess = (procId) => {
    setFormData({
      ...formData,
      developing_processes: (formData.developing_processes || []).filter(p => p.id !== procId)
    });
  };

  const handleAddBranch = () => {
    if (!newBranchName.trim()) return;
    const newBr = {
      id: `b_${Date.now()}`,
      name: newBranchName.trim(),
      target: newBranchTarget.trim() || 'Subagente Especialista',
      sub_branches: 2
    };
    const currentBranches = formData.generated_branches || {};
    setFormData({
      ...formData,
      generated_branches: {
        ...currentBranches,
        branch_tree: [...(currentBranches.branch_tree || []), newBr]
      }
    });
    setNewBranchName('');
    setNewBranchTarget('');
  };

  const handleRemoveBranch = (branchId) => {
    const currentBranches = formData.generated_branches || {};
    setFormData({
      ...formData,
      generated_branches: {
        ...currentBranches,
        branch_tree: (currentBranches.branch_tree || []).filter(b => b.id !== branchId)
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0a0d16] border border-cyan-500/30 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* HEADER */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#0e1322] via-[#12182b] to-[#0e1322] border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg"
              style={{ backgroundColor: `${formData.color || '#00f0ff'}20`, borderColor: `${formData.color || '#00f0ff'}60` }}
            >
              <Cpu className="w-6 h-6" style={{ color: formData.color || '#00f0ff' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-display font-bold text-white">
                  {agent ? `Administrar Agente: ${formData.name}` : 'Crear Nuevo Agente Soberano'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  StarSeed 1.58b
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Personalidades, Cerebros, Ramas en Desarrollo & Imaginación en Segundo Plano
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
        <div className="px-4 sm:px-6 pt-3 bg-[#080a10] border-b border-white/5 flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs font-mono">
          {[
            { id: 'general', label: '📝 General & Rol', icon: Sliders },
            { id: 'personalities', label: '🎭 Personalidades', icon: Sparkles },
            { id: 'cerebros', label: '🧠 Cerebros & Memoria', icon: Brain },
            { id: 'processes_branches', label: '⚡ Procesos & Ramas', icon: GitBranch },
            { id: 'imagination', label: '🌌 Imaginación & Recursos', icon: Wand2 },
            { id: 'interconnections', label: '🔗 Interconexiones', icon: Layers }
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">Nombre del Agente</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">Área del Enjambre</label>
                  <select
                    value={formData.area_id}
                    onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white outline-none"
                  >
                    <option value="area_engineering">🛠️ Ingeniería & Código</option>
                    <option value="area_synaptic_memory">🌌 Gobernanza Sináptica & Memoria</option>
                    <option value="area_web_intel">🌐 Inteligencia Web & Búsqueda</option>
                    <option value="area_creative_synthesis">🎨 Síntesis Creativa & 3D</option>
                    <option value="area_sentinel_privacy">🛡️ Sentinel, Sensores & Privacidad</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">Rol & Responsabilidades</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">Color Distintivo</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 rounded-xl bg-black/50 border border-white/10 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">Aceleración de Hardware</label>
                  <select
                    value={formData.hardware_acceleration}
                    onChange={(e) => setFormData({ ...formData, hardware_acceleration: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white outline-none"
                  >
                    <option value="Apple Silicon ARM64 NEON">Apple Silicon ARM64 NEON (8 núcleos)</option>
                    <option value="ARM64 NEON + Metal Shaders">ARM64 NEON + Metal Shaders</option>
                    <option value="Metal Shaders / WebGL">Metal Shaders / WebGL Volumétrico</option>
                    <option value="Apple Silicon ARM64">Apple Silicon ARM64 Estándar</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONALITIES BINDING */}
          {activeTab === 'personalities' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 font-mono">
                Selecciona las personalidades que este agente puede convocar, modular o utilizar para sus respuestas:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_PERSONALITIES.map((p) => {
                  const isSelected = (formData.used_personalities || []).some(x => x.id === p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePersonality(p)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-purple-950/30 border-purple-500/50 text-white ring-1 ring-purple-500/30'
                          : 'bg-black/40 border-white/5 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <div>
                          <div className="text-xs font-bold font-mono text-white">{p.name}</div>
                          <span className="text-[10px] text-slate-400">{p.role}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        isSelected ? 'bg-purple-500/20 text-purple-300 font-bold' : 'bg-white/5 text-slate-500'
                      }`}>
                        {isSelected ? 'VINCULADA' : 'DESACTIVADA'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CEREBROS & MEMORY ACCESS */}
          {activeTab === 'cerebros' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Cerebros Vinculados (Bóveda Soberana)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_CEREBROS.map((c) => {
                    const isSelected = (formData.linked_cerebros || []).some(x => x.id === c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleCerebro(c)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-950/30 border-cyan-500/50 text-white ring-1 ring-cyan-500/30'
                            : 'bg-black/40 border-white/5 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4" style={{ color: c.color }} />
                          <span className="text-xs font-mono text-white">{c.name}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          isSelected ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'bg-white/5 text-slate-500'
                        }`}>
                          {isSelected ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Memory Access Switches */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Accesos a Almacenes de Memoria
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  {[
                    { key: 'mem0_enabled', label: 'Mem0 Episódico' },
                    { key: 'knowledge_graph_enabled', label: 'Grafo Sináptico' },
                    { key: 'vector_store_enabled', label: 'Base Vectorial' },
                    { key: 'openviking_context', label: 'Contexto OpenViking' }
                  ].map((m) => {
                    const isAllowed = !!formData.memory_access?.[m.key];
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          memory_access: {
                            ...(formData.memory_access || {}),
                            [m.key]: !isAllowed
                          }
                        })}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isAllowed
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                            : 'bg-white/5 border-white/5 text-slate-500'
                        }`}
                      >
                        <div className="font-bold">{m.label}</div>
                        <span className="text-[9px] opacity-80">{isAllowed ? 'Permitido' : 'Bloqueado'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROCESSES & BRANCHES */}
          {activeTab === 'processes_branches' && (
            <div className="space-y-4">
              {/* Developing Processes */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center justify-between">
                  <span>Procesos Nativos en Desarrollo</span>
                  <span className="text-[10px] text-slate-400">Total: {formData.developing_processes?.length || 0}</span>
                </span>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProcessName}
                    onChange={(e) => setNewProcessName(e.target.value)}
                    placeholder="Ej: Auto-Reflexión de Código ARM NEON"
                    className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddProcess}
                    className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {formData.developing_processes?.map((proc) => (
                    <div key={proc.id} className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-white font-bold">{proc.name}</span>
                        <span className="text-[10px] text-slate-500">CPU: {proc.cpu || 1.5}%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProcess(proc.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Branches Tree */}
              <div className="space-y-2 pt-3 border-t border-white/5">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center justify-between">
                  <span>Árbol de Ramificaciones & Enlaces Paralelos</span>
                  <span className="text-cyan-400 text-[10px]">Aceleración: {formData.generated_branches?.speedup_factor || '5.0x'}</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="Nombre de la Rama (ej: Sonda AST)"
                    className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBranchTarget}
                      onChange={(e) => setNewBranchTarget(e.target.value)}
                      placeholder="Módulo o Subagente Destino"
                      className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddBranch}
                      className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ramificar</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {formData.generated_branches?.branch_tree?.map((br) => (
                    <div key={br.id} className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-white font-bold">{br.name}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-purple-300">{br.target}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBranch(br.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: INTUITIVE IMAGINATION & RESOURCE CONTROLS */}
          {activeTab === 'imagination' && (
            <div className="space-y-4 text-xs font-mono">
              {/* Background Active Imagination Switch */}
              <div className={`p-4 rounded-2xl border transition-all ${
                formData.imagination_enabled
                  ? 'bg-gradient-to-r from-purple-950/30 via-indigo-950/30 to-purple-950/30 border-purple-500/40 shadow-lg'
                  : 'bg-black/40 border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold font-display text-white flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-purple-400" />
                      Imaginación Intuitiva Activa en Segundo Plano
                    </div>
                    <p className="text-slate-400 font-sans text-xs">
                      Permite al agente soñar, forjar hipótesis contrafácticas y auto-optimizar memorias en reposo.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, imagination_enabled: !formData.imagination_enabled })}
                    className={`px-4 py-1.5 rounded-xl border font-bold transition-all ${
                      formData.imagination_enabled
                        ? 'bg-purple-500 text-black border-purple-400 shadow-md'
                        : 'bg-black/50 border-white/20 text-slate-400'
                    }`}
                  >
                    {formData.imagination_enabled ? '● ENCENDIDA' : '○ APAGADA'}
                  </button>
                </div>
              </div>

              {/* Resource Quotas Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Cuota de CPU:</span>
                    <span className="text-cyan-400 font-bold">{formData.cpu_quota_percent}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={formData.cpu_quota_percent || 20}
                    onChange={(e) => setFormData({ ...formData, cpu_quota_percent: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Límite de Memoria RAM:</span>
                    <span className="text-purple-400 font-bold">{formData.ram_limit_mb} MB</span>
                  </div>
                  <input
                    type="range"
                    min="64"
                    max="512"
                    step="32"
                    value={formData.ram_limit_mb || 128}
                    onChange={(e) => setFormData({ ...formData, ram_limit_mb: parseInt(e.target.value) })}
                    className="w-full accent-purple-400"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">Tronco de Cómputo</label>
                  <select
                    value={formData.compute_trunk}
                    onChange={(e) => setFormData({ ...formData, compute_trunk: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white outline-none"
                  >
                    <option value="trunk_a">Tronco A (Imaginación Activa Continua & Shaders)</option>
                    <option value="trunk_b">Tronco B (Sensorial, Silencioso & Seguridad)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[10px]">Frecuencia de Ensueño</label>
                  <select
                    value={formData.imagination_frequency}
                    onChange={(e) => setFormData({ ...formData, imagination_frequency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white outline-none"
                  >
                    <option value="continuous">Continuo (Always-On 1.58b)</option>
                    <option value="interval_15m">Cada 15 minutos</option>
                    <option value="interval_30m">Cada 30 minutos</option>
                    <option value="interval_1h">Cada 1 hora</option>
                    <option value="manual">Solo Disparo Manual</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: INTERCONNECTIONS */}
          {activeTab === 'interconnections' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 font-mono">
                Enlaces bidireccionales y dependencias operativas con otros agentes del enjambre:
              </p>
              <div className="space-y-2">
                {formData.interconnections?.map((link, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span className="text-white font-bold">{link.target_agent_id}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-slate-300">{link.relationship}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                      {link.bidirectional ? '⇄ Bidireccional' : '→ Unidireccional'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </form>

        {/* FOOTER */}
        <div className="p-4 bg-[#080a10] border-t border-white/10 flex items-center justify-between text-xs font-mono">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Agente & Configuración</span>
          </button>
        </div>

      </div>
    </div>
  );
}
