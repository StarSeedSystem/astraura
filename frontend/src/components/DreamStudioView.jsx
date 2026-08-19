import React, { useState, useEffect } from 'react';
import { 
  Moon, 
  Sparkles, 
  Sliders, 
  GitBranch, 
  Layers, 
  Zap, 
  RefreshCw, 
  Play, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Lightbulb, 
  Tag, 
  Cpu, 
  HardDrive, 
  Compass, 
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Activity,
  ShieldCheck,
  Check,
  AlertCircle,
  Brain,
  SlidersHorizontal,
  Flame,
  Code2,
  Wand2,
  Sparkle,
  Trash2,
  Edit3,
  CheckCheck,
  X
} from 'lucide-react';
import { 
  fetchDreamStatus, 
  fetchDreamProcessTypes,
  triggerDream, 
  addDreamCreation, 
  addDreamReminder, 
  toggleDreamReminder,
  updateDreamConfig,
  handleDreamBranchAction,
  handleDreamCreationAction
} from '../services/api';

export default function DreamStudioView() {
  const [activeSubTab, setActiveSubTab] = useState('processes'); // 'processes', 'branches', 'creations', 'config', 'log'
  const [dreamStatus, setDreamStatus] = useState(null);
  const [processTypes, setProcessTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [customTheme, setCustomTheme] = useState('');
  const [selectedProcessType, setSelectedProcessType] = useState('rem_synaptic_consolidation');
  const [toastMsg, setToastMsg] = useState('');

  // Edit Modal State
  const [editModal, setEditModal] = useState({ isOpen: false, type: 'branch', data: null });
  const [editFormData, setEditFormData] = useState({});

  // Config State
  const [configForm, setConfigForm] = useState({
    max_capacity_percentage: 40,
    max_hourly_kb: 250,
    max_daily_mb: 15.0,
    dream_frequency_minutes: 15,
    dream_intensity: 0.85,
    quantum_entropy_level: 0.75,
    dream_mode: 'always_on',
    active_process_types: [
      'rem_synaptic_consolidation',
      'counterfactual_quantum_imagination',
      'lucid_cyberdelic_creativity',
      'code_self_reflection_opt',
      'predictive_future_simulation',
      'inter_brain_evolutionary_mutation'
    ]
  });

  // Creation & Reminder Modals
  const [newCreationModal, setNewCreationModal] = useState(false);
  const [creationForm, setCreationForm] = useState({ title: '', type: 'Arquitectura', content: '', tags: '' });
  const [newReminderModal, setNewReminderModal] = useState(false);
  const [reminderForm, setNewReminderForm] = useState({ text: '', time: 'Diario' });

  const loadStatus = async () => {
    try {
      const [data, pTypesData] = await Promise.all([
        fetchDreamStatus().catch(() => null),
        fetchDreamProcessTypes().catch(() => null)
      ]);

      if (data) {
        setDreamStatus(data);
        setConfigForm(prev => ({
          ...prev,
          max_capacity_percentage: data.max_capacity_percentage || 40,
          max_hourly_kb: data.max_hourly_kb || 250,
          max_daily_mb: data.max_daily_mb || 15.0,
          dream_frequency_minutes: data.dream_frequency_minutes || 15,
          dream_intensity: data.dream_intensity || 0.85,
          quantum_entropy_level: data.quantum_entropy_level || 0.75,
          dream_mode: data.dream_mode || 'always_on',
          active_process_types: data.active_process_types || prev.active_process_types
        }));
      }

      if (pTypesData && pTypesData.process_types) {
        setProcessTypes(pTypesData.process_types);
      }
    } catch (err) {
      console.warn('Error loading dream status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerDream = async (procType = null) => {
    setIsTriggering(true);
    try {
      const targetProc = procType || selectedProcessType;
      const res = await triggerDream(customTheme.trim() || null, null, targetProc);
      if (res && res.success) {
        setCustomTheme('');
        setToastMsg(`🌌 Onda Onírica Completada: ${res.process_type?.name || 'Proceso Exocortex'}`);
        setTimeout(() => setToastMsg(''), 4000);
        loadStatus();
      }
    } catch (err) {
      alert(`Error disparando sueño: ${err.message}`);
    } finally {
      setIsTriggering(false);
    }
  };

  // Branch Action Handlers (Aplicar, Editar, Descartar)
  const onBranchAction = async (branchId, action, data = null) => {
    try {
      const res = await handleDreamBranchAction(branchId, action, data);
      if (res && res.success) {
        if (action === 'apply') setToastMsg(`✅ Rama aplicada en el exocórtex: ${res.branch?.theme || ''}`);
        if (action === 'discard') setToastMsg('🗑️ Rama descartada');
        if (action === 'edit') setToastMsg('✏️ Rama actualizada con éxito');
        setTimeout(() => setToastMsg(''), 3000);
        loadStatus();
      }
    } catch (e) {
      alert(`Error en acción de rama: ${e.message}`);
    }
  };

  // Creation Action Handlers (Aplicar, Editar, Descartar)
  const onCreationAction = async (creationId, action, data = null) => {
    try {
      const res = await handleDreamCreationAction(creationId, action, data);
      if (res && res.success) {
        if (action === 'apply') setToastMsg(`✅ Creación aplicada: ${res.creation?.title || ''}`);
        if (action === 'discard') setToastMsg('🗑️ Creación descartada');
        if (action === 'edit') setToastMsg('✏️ Creación actualizada');
        setTimeout(() => setToastMsg(''), 3000);
        loadStatus();
      }
    } catch (e) {
      alert(`Error en acción de creación: ${e.message}`);
    }
  };

  const openEditBranchModal = (branch) => {
    setEditModal({ isOpen: true, type: 'branch', data: branch });
    setEditFormData({ theme: branch.theme, hypothesis: branch.hypothesis, insights: branch.insights || '' });
  };

  const openEditCreationModal = (creation) => {
    setEditModal({ isOpen: true, type: 'creation', data: creation });
    setEditFormData({ title: creation.title, type: creation.type, content: creation.content, tags: (creation.tags || []).join(', ') });
  };

  const handleSaveEdit = async () => {
    if (!editModal.data) return;
    if (editModal.type === 'branch') {
      await onBranchAction(editModal.data.id, 'edit', editFormData);
    } else {
      const tagsArray = typeof editFormData.tags === 'string' ? editFormData.tags.split(',').map(t => t.trim()).filter(Boolean) : editFormData.tags;
      await onCreationAction(editModal.data.id, 'edit', { ...editFormData, tags: tagsArray });
    }
    setEditModal({ isOpen: false, type: 'branch', data: null });
  };

  const handleSaveConfig = async () => {
    try {
      await updateDreamConfig(configForm);
      setToastMsg('⚙️ Ajustes de Entropía Guardados');
      setTimeout(() => setToastMsg(''), 3000);
      loadStatus();
    } catch (err) {
      alert(`Error guardando configuración: ${err.message}`);
    }
  };

  const getProcessIcon = (iconName) => {
    switch (iconName) {
      case 'Moon': return Moon;
      case 'Wand2': return Wand2;
      case 'Sparkles': return Sparkles;
      case 'Code2': return Code2;
      case 'Compass': return Compass;
      case 'Layers': return Layers;
      default: return Sparkles;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner with Vibrant Nebula & Quantum Glow */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#120a26] via-[#1a0f35] to-[#0a1226] border border-purple-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600/30 via-pink-500/20 to-cyan-500/30 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-xl shadow-purple-950/40">
              <Moon className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white font-display tracking-wide">
                  Dream Studio & Imaginación Cuántica // Estado Onírico
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] border border-purple-500/40 flex items-center gap-1 font-bold">
                  <Sparkles className="w-3 h-3" /> Always-On 1.58b
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Procesos cognitivos autónomos en segundo plano, consolidación sináptica y auto-evolución continua.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {toastMsg && (
              <span className="text-xs px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono animate-fade-in font-bold">
                {toastMsg}
              </span>
            )}

            <button
              onClick={() => handleTriggerDream()}
              disabled={isTriggering}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${isTriggering ? 'animate-spin' : ''}`} />
              {isTriggering ? 'Generando Sueño...' : 'Disparar Onda Onírica (Burst)'}
            </button>
          </div>
        </div>

        {/* Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/10 text-xs font-mono">
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 block">Ciclos Completados</span>
            <span className="text-sm font-bold text-purple-300">{dreamStatus?.dream_cycles_completed || 16}</span>
          </div>
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 block">Generación / Hora</span>
            <span className="text-sm font-bold text-cyan-300">{dreamStatus?.hourly_generated_kb || 14.8} KB</span>
          </div>
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 block">Entropía Cuántica</span>
            <span className="text-sm font-bold text-amber-300">{configForm.quantum_entropy_level}</span>
          </div>
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 block">Modo de Operación</span>
            <span className="text-sm font-bold text-emerald-400 capitalize">{configForm.dream_mode.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs with Vibrant Pills */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto text-xs font-mono">
        {[
          { id: 'processes', label: '6 Procesos Oníricos', icon: Sparkles },
          { id: 'branches', label: 'Árbol de Ramificaciones & Propuestas', icon: GitBranch },
          { id: 'creations', label: 'Creaciones Proactivas', icon: Lightbulb },
          { id: 'config', label: 'Ajustes & Entropía', icon: SlidersHorizontal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all cursor-pointer font-bold ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500/25 to-cyan-500/25 text-white border border-purple-500/50 shadow-lg shadow-purple-950/30'
                  : 'text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: 6 DIVERSE ONIRIC PROCESS TYPES */}
      {activeSubTab === 'processes' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white font-display">
                Catálogo de Procesos Imaginativos y de Sueño en Segundo Plano
              </h2>
              <p className="text-xs text-slate-400">
                Cada proceso modela una dimensión específica del pensamiento reflexivo, la ciencia, el código y la creatividad.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Tema enfocado (opcional)..."
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                className="p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-slate-100 font-mono w-64 focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processTypes.map((pt) => {
              const Icon = getProcessIcon(pt.icon);
              const isSelected = selectedProcessType === pt.id;

              return (
                <div
                  key={pt.id}
                  onClick={() => setSelectedProcessType(pt.id)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#1b1235] to-[#0e1428] border-purple-500/60 shadow-xl shadow-purple-950/40 text-white'
                      : 'bg-[#0c0f18] border-white/5 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg"
                        style={{ backgroundColor: `${pt.color}15`, borderColor: `${pt.color}40`, color: pt.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-white">{pt.name}</h3>
                        <span className="text-[10px] text-slate-500 font-mono">{pt.category}</span>
                      </div>
                    </div>

                    {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {pt.description}
                  </p>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerDream(pt.id);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-500/20"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Disparar Ahora
                    </button>
                    <span className="text-[10px] text-purple-300 font-bold">1.58b Neural</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: DREAM BRANCHES WITH APLICAR / EDITAR / DESCARTAR */}
      {activeSubTab === 'branches' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white font-display">
              Propuestas & Ramificaciones Oníricas (Control Total)
            </h2>
            <span className="text-xs text-purple-300 font-bold">
              {dreamStatus?.dream_branches?.length || 0} Ramas Registradas
            </span>
          </div>

          <div className="space-y-3">
            {dreamStatus?.dream_branches?.map((branch) => (
              <div
                key={branch.id}
                className={`p-5 rounded-3xl border shadow-xl space-y-3 transition-all ${
                  branch.status === 'applied'
                    ? 'bg-[#081814] border-emerald-500/40 shadow-emerald-950/20'
                    : 'bg-[#0c0f18] border-white/10'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white text-sm">{branch.theme}</span>
                    {branch.status === 'applied' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                        ✓ Aplicado en Exocórtex
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Propuesta Activa
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">{branch.formatted_time}</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="text-slate-300 leading-relaxed">
                    💡 <b className="text-purple-300">Hipótesis:</b> {branch.hypothesis}
                  </p>
                  {branch.insights && (
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      🔍 <b className="text-cyan-300">Conclusiones:</b> {branch.insights}
                    </p>
                  )}
                </div>

                {/* Action Buttons: Aplicar, Editar, Descartar */}
                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {branch.status !== 'applied' && (
                      <button
                        onClick={() => onBranchAction(branch.id, 'apply')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Aplicar Propuesta
                      </button>
                    )}

                    <button
                      onClick={() => openEditBranchModal(branch)}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>

                    <button
                      onClick={() => onBranchAction(branch.id, 'discard')}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/5 hover:border-rose-500/30 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Descartar
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-500">ID: {branch.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PROACTIVE CREATIONS WITH APLICAR / EDITAR / DESCARTAR */}
      {activeSubTab === 'creations' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white font-display">
              Creaciones & Revelaciones Proactivas Generadas en Reposo
            </h2>
            <button
              onClick={() => setNewCreationModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Creación
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dreamStatus?.proactive_creations?.map((item) => (
              <div 
                key={item.id} 
                className={`p-5 rounded-3xl border shadow-xl space-y-3 flex flex-col justify-between ${
                  item.status === 'applied'
                    ? 'bg-[#081814] border-emerald-500/40 shadow-emerald-950/20'
                    : 'bg-[#0c0f18] border-white/10'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      {item.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                      {item.type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.tags?.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[9px]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions: Aplicar, Editar, Descartar */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.status !== 'applied' && (
                      <button
                        onClick={() => onCreationAction(item.id, 'apply')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Aplicar
                      </button>
                    )}

                    <button
                      onClick={() => openEditCreationModal(item)}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Editar
                    </button>

                    <button
                      onClick={() => onCreationAction(item.id, 'discard')}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURATION & ENTROPY */}
      {activeSubTab === 'config' && (
        <div className="p-6 rounded-3xl bg-[#0c0f18] border border-white/10 shadow-xl space-y-6 font-mono text-xs">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-purple-400" />
              Ajustes de Inferencia Onírica & Entropía Cuántica
            </h2>
            <button
              onClick={handleSaveConfig}
              className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold shadow-lg shadow-purple-500/20 cursor-pointer"
            >
              Guardar Cambios
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 block font-bold mb-1">Modo de Sueño en Segundo Plano</label>
                <select
                  value={configForm.dream_mode}
                  onChange={(e) => setConfigForm({ ...configForm, dream_mode: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white"
                >
                  <option value="always_on">Continuo (Always-On // Cada 15 min)</option>
                  <option value="idle_only">En Reposo del Usuario (Idle Dreamer)</option>
                  <option value="scheduled">Por Horario Programado</option>
                  <option value="burst">Solo Ráfagas Manuales (Burst Only)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-bold">
                  <span>Nivel de Entropía Cuántica / Creatividad:</span>
                  <span className="text-amber-300">{configForm.quantum_entropy_level}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={configForm.quantum_entropy_level}
                  onChange={(e) => setConfigForm({ ...configForm, quantum_entropy_level: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1 font-bold">
                  <span>Frecuencia del Ciclo Onírico:</span>
                  <span className="text-purple-300">{configForm.dream_frequency_minutes} minutos</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={configForm.dream_frequency_minutes}
                  onChange={(e) => setConfigForm({ ...configForm, dream_frequency_minutes: parseInt(e.target.value) })}
                  className="w-full accent-purple-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL (BRANCH OR CREATION) */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono text-xs">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#0e101c] border border-purple-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" />
                Editar {editModal.type === 'branch' ? 'Rama Onírica' : 'Creación Proactiva'}
              </h3>
              <button
                onClick={() => setEditModal({ isOpen: false, type: 'branch', data: null })}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editModal.type === 'branch' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 block mb-1">Tema / Título:</label>
                  <input
                    type="text"
                    value={editFormData.theme || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, theme: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Hipótesis:</label>
                  <textarea
                    rows={3}
                    value={editFormData.hypothesis || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, hypothesis: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Conclusiones / Insights:</label>
                  <textarea
                    rows={2}
                    value={editFormData.insights || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, insights: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 block mb-1">Título:</label>
                  <input
                    type="text"
                    value={editFormData.title || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Contenido / Código / Boceto:</label>
                  <textarea
                    rows={4}
                    value={editFormData.content || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditModal({ isOpen: false, type: 'branch', data: null })}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold shadow-lg shadow-purple-500/25 cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
