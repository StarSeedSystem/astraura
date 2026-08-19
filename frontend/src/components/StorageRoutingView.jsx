import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Folder, 
  FileText, 
  Sparkles, 
  Sliders, 
  Zap, 
  Check, 
  Trash2, 
  Edit3, 
  Plus, 
  RefreshCw, 
  Radio, 
  Database, 
  Brain, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  ExternalLink, 
  X, 
  Play, 
  Clock, 
  FolderPlus, 
  CheckCircle2, 
  SlidersHorizontal,
  Server,
  Usb
} from 'lucide-react';
import { 
  fetchStorageDevices, 
  fetchStorageRules, 
  createOrUpdateStorageRule, 
  deleteStorageRule, 
  scanStorageNow, 
  simulateStorageConnection,
  fetchCerebros,
  fetchImaginationProcessTypes
} from '../services/api';

export default function StorageRoutingView() {
  const [devicesData, setDevicesData] = useState({ devices: [], devices_count: 0 });
  const [rules, setRules] = useState([]);
  const [cerebrosList, setCerebrosList] = useState([]);
  const [processTypesList, setProcessTypesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  // Rule Modal State (Create / Edit)
  const [ruleModal, setRuleModal] = useState({
    isOpen: false,
    isEdit: false,
    ruleId: null
  });

  const [ruleForm, setRuleForm] = useState({
    id: '',
    name: '',
    media_type: 'external_storage', // 'external_storage', 'folder', 'file', 'cloud_vault'
    target_path: '',
    is_enabled: true,
    auto_memory_routing: {
      enabled: true,
      target_brains: ['brain_genesis', 'brain_hephaestus'],
      memory_category: 'Almacenamiento Enrutado',
      index_files: true,
      file_extensions: ['.py', '.jsx', '.cpp', '.h', '.json', '.md']
    },
    trigger_imagination: {
      enabled: true,
      process_types: ['rem_synaptic_consolidation', 'code_self_reflection_opt'],
      burst_cycles: 1
    },
    capacity_limits_override: {
      enabled: true,
      imagination_max_percent: 30,
      swarm_max_percent: 45,
      capacity_mode: 'auto'
    }
  });

  const loadAll = async () => {
    try {
      const [devs, rData, cData, pData] = await Promise.all([
        fetchStorageDevices().catch(() => null),
        fetchStorageRules().catch(() => null),
        fetchCerebros().catch(() => null),
        fetchImaginationProcessTypes().catch(() => null)
      ]);

      if (devs) setDevicesData(devs);
      if (rData && rData.rules) setRules(rData.rules);
      if (cData && cData.cerebros) setCerebrosList(cData.cerebros);
      if (pData && pData.process_types) setProcessTypesList(pData.process_types);
    } catch (err) {
      console.warn('Error loading storage routing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleScanNow = async () => {
    setIsScanning(true);
    try {
      const res = await scanStorageNow();
      if (res && res.success) {
        const evtsCount = res.events_triggered?.length || 0;
        setToastMsg(`🔍 Escaneo completado: ${evtsCount} automatizaciones disparadas.`);
        setTimeout(() => setToastMsg(''), 4000);
        loadAll();
      }
    } catch (err) {
      alert(`Error escaneando medios: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSimulateConnection = async (ruleId) => {
    try {
      const res = await simulateStorageConnection(ruleId);
      if (res && res.success) {
        const evt = res.event;
        setToastMsg(`⚡ Detección simulada: ${evt.rule_name} (${evt.indexed_files_count} archivos indexados)`);
        setTimeout(() => setToastMsg(''), 4500);
        loadAll();
      }
    } catch (err) {
      alert(`Error simulando detección: ${err.message}`);
    }
  };

  const handleToggleRule = async (rule) => {
    const updated = { ...rule, is_enabled: !rule.is_enabled };
    try {
      await createOrUpdateStorageRule(updated);
      setToastMsg(`⚙️ Regla ${updated.name} ${updated.is_enabled ? 'ACTIVADA' : 'PAUSADA'}`);
      setTimeout(() => setToastMsg(''), 3000);
      loadAll();
    } catch (err) {
      alert(`Error actualizando regla: ${err.message}`);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('¿Seguro de eliminar esta regla de enrutamiento de almacenamiento?')) return;
    try {
      await deleteStorageRule(ruleId);
      setToastMsg('🗑️ Regla eliminada.');
      setTimeout(() => setToastMsg(''), 3000);
      loadAll();
    } catch (err) {
      alert(`Error eliminando regla: ${err.message}`);
    }
  };

  const openCreateModal = (suggestedPath = '') => {
    setRuleForm({
      id: `rule_${Date.now()}`,
      name: suggestedPath ? `Regla para ${suggestedPath.split('/').pop()}` : 'Nueva Regla de Almacenamiento',
      media_type: suggestedPath.includes('/Volumes') ? 'external_storage' : 'folder',
      target_path: suggestedPath || '/Volumes/Mi_Almacenamiento',
      is_enabled: true,
      auto_memory_routing: {
        enabled: true,
        target_brains: ['brain_genesis', 'brain_hephaestus'],
        memory_category: 'Almacenamiento Enrutado',
        index_files: true,
        file_extensions: ['.py', '.jsx', '.cpp', '.h', '.json', '.md']
      },
      trigger_imagination: {
        enabled: true,
        process_types: ['rem_synaptic_consolidation', 'code_self_reflection_opt'],
        burst_cycles: 1
      },
      capacity_limits_override: {
        enabled: true,
        imagination_max_percent: 30,
        swarm_max_percent: 45,
        capacity_mode: 'auto'
      }
    });
    setRuleModal({ isOpen: true, isEdit: false, ruleId: null });
  };

  const openEditModal = (rule) => {
    setRuleForm({ ...rule });
    setRuleModal({ isOpen: true, isEdit: true, ruleId: rule.id });
  };

  const handleSaveRule = async () => {
    if (!ruleForm.name.trim() || !ruleForm.target_path.trim()) {
      alert('Por favor especifica un nombre y una ruta de destino.');
      return;
    }
    try {
      await createOrUpdateStorageRule(ruleForm);
      setToastMsg(`✅ Regla '${ruleForm.name}' guardada con éxito.`);
      setTimeout(() => setToastMsg(''), 3500);
      setRuleModal({ isOpen: false, isEdit: false, ruleId: null });
      loadAll();
    } catch (err) {
      alert(`Error guardando regla: ${err.message}`);
    }
  };

  const handleToggleTargetBrain = (brainId) => {
    const cur = ruleForm.auto_memory_routing.target_brains || [];
    const updated = cur.includes(brainId)
      ? cur.filter(id => id !== brainId)
      : [...cur, brainId];
    if (updated.length === 0) return;
    setRuleForm({
      ...ruleForm,
      auto_memory_routing: {
        ...ruleForm.auto_memory_routing,
        target_brains: updated
      }
    });
  };

  const handleToggleProcessType = (pId) => {
    const cur = ruleForm.trigger_imagination.process_types || [];
    const updated = cur.includes(pId)
      ? cur.filter(id => id !== pId)
      : [...cur, pId];
    setRuleForm({
      ...ruleForm,
      trigger_imagination: {
        ...ruleForm.trigger_imagination,
        process_types: updated
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner: Storage & Media Auto-Routing Master Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0d1624] via-[#101e33] to-[#18112d] border border-cyan-500/30 shadow-2xl relative overflow-hidden font-mono text-xs">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600/40 via-blue-500/30 to-purple-500/40 border border-cyan-400/50 flex items-center justify-center text-cyan-200 shadow-xl shadow-cyan-950/40">
              <HardDrive className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-white font-display tracking-wide">
                  Enrutamiento de Almacenamiento, Folders & Medios
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Auto-Detección & Triggers Activos
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Al detectar una unidad USB, SSD externo (/Volumes), folder o archivo, se enrutan memorias a personalidades y se modulan los límites 1.58b automáticamente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {toastMsg && (
              <span className="text-xs px-3 py-1.5 rounded-xl bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 font-bold animate-fade-in">
                {toastMsg}
              </span>
            )}

            <button
              onClick={handleScanNow}
              disabled={isScanning}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-950/30"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Escaneando...' : 'Escanear Medios Ahora'}</span>
            </button>

            <button
              onClick={() => openCreateModal()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva Regla de Almacenamiento</span>
            </button>
          </div>
        </div>

        {/* Live Detected Partitions & Volumes Grid */}
        <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              Discos & Volúmenes Detectados en el Sistema ({devicesData.devices_count})
            </span>
            <span className="text-[10px] text-slate-400">Actualización en vivo cada 6s</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {devicesData.devices?.map((dev, didx) => (
              <div 
                key={didx}
                className={`p-3 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
                  dev.is_external 
                    ? 'bg-gradient-to-b from-[#14233a] to-[#0c1322] border-cyan-500/50 shadow-lg shadow-cyan-950/30'
                    : 'bg-black/50 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-2">
                    {dev.is_external ? <Usb className="w-4 h-4 text-cyan-300" /> : <HardDrive className="w-4 h-4 text-slate-400" />}
                    <span className="font-bold text-white text-xs truncate max-w-[130px]">
                      {dev.mountpoint.split('/').pop() || dev.mountpoint}
                    </span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    dev.is_external ? 'bg-cyan-500/25 text-cyan-300' : 'bg-white/10 text-slate-400'
                  }`}>
                    {dev.is_external ? 'Externo' : 'Local'}
                  </span>
                </div>

                <div className="text-[10px] text-slate-300 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ruta:</span>
                    <span className="truncate max-w-[120px] text-slate-200">{dev.mountpoint}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Libre:</span>
                    <span className="text-emerald-300 font-bold">{dev.free_gb} GB / {dev.total_gb} GB</span>
                  </div>
                </div>

                <button
                  onClick={() => openCreateModal(dev.mountpoint)}
                  className="w-full py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-200 border border-white/5 hover:border-cyan-500/30 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>Crear Regla para este Medio</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rules Registry Cards */}
      <div className="space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white font-display">
              Reglas de Enrutamiento & Automatización por Medio ({rules.length})
            </h2>
            <p className="text-xs text-slate-400">
              Cada regla orquesta el traspaso de memorias a personalidades, el encendido de procesos de imaginación y los límites de CPU.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rules.map((rule) => {
            const isConnected = rule.status === 'connected';
            const isEnabled = rule.is_enabled;

            return (
              <div
                key={rule.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 shadow-xl ${
                  !isEnabled
                    ? 'bg-[#08090e] border-white/5 opacity-60'
                    : isConnected
                    ? 'bg-gradient-to-b from-[#0e1c2e] to-[#0a111e] border-cyan-500/40 shadow-cyan-950/20'
                    : 'bg-[#0c0f18] border-white/10'
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-md ${
                        rule.media_type === 'external_storage'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : rule.media_type === 'folder'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {rule.media_type === 'external_storage' ? (
                          <Usb className="w-5 h-5" />
                        ) : rule.media_type === 'folder' ? (
                          <Folder className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-white leading-tight">{rule.name}</h3>
                        <span className="text-[10px] text-slate-400 truncate max-w-[220px] block">
                          {rule.target_path}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        isConnected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                        {isConnected ? 'Conectado' : 'A la Espera'}
                      </span>
                    </div>
                  </div>

                  {/* Section 1: Enrutamiento de Memorias */}
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-300">
                      <span className="flex items-center gap-1">
                        <Brain className="w-3.5 h-3.5" />
                        Enrutamiento de Memorias
                      </span>
                      <span className="text-[10px] text-slate-400">{rule.auto_memory_routing?.memory_category}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {rule.auto_memory_routing?.target_brains?.map((bId) => {
                        const brain = cerebrosList.find(c => c.id === bId);
                        return (
                          <span key={bId} className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/30 text-[10px] font-bold">
                            🧠 {brain?.name || bId}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 2: Triggers de Imaginación Intuitiva */}
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Procesos Oníricos al Conectar
                      </span>
                      <span className="text-[10px] text-slate-400">{rule.trigger_imagination?.burst_cycles} Ciclo(s)</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {rule.trigger_imagination?.process_types?.map((pId) => (
                        <span key={pId} className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 text-[10px]">
                          ✨ {pId.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Modulación de Capacidades 1.58b */}
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                      <span className="flex items-center gap-1">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Modulación de Recursos 1.58b al Detectar
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase">{rule.capacity_limits_override?.capacity_mode}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-300">
                      <span>Imaginación: <b className="text-purple-300">{rule.capacity_limits_override?.imagination_max_percent}%</b></span>
                      <span>Multi-Agentes: <b className="text-cyan-300">{rule.capacity_limits_override?.swarm_max_percent}%</b></span>
                    </div>
                  </div>

                  {/* Last detection timestamp */}
                  <div className="text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Último evento: {rule.last_detected_formatted || 'Pendiente'}</span>
                    <span>ID: {rule.id}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSimulateConnection(rule.id)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1 cursor-pointer text-[10px]"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Simular Detección</span>
                    </button>

                    <button
                      onClick={() => openEditModal(rule)}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1 cursor-pointer text-[10px]"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleToggleRule(rule)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold flex items-center gap-1 cursor-pointer text-[10px]"
                    >
                      {rule.is_enabled ? 'Pausar' : 'Activar'}
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE / EDIT RULE MODAL */}
      {ruleModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono text-xs">
          <div className="w-full max-w-2xl max-h-[90vh] p-6 rounded-3xl bg-[#0e1220] border border-cyan-500/50 shadow-2xl flex flex-col justify-between overflow-hidden space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                {ruleModal.isEdit ? 'Editar Regla de Almacenamiento' : 'Nueva Regla de Almacenamiento & Memoria'}
              </h3>
              <button
                onClick={() => setRuleModal({ isOpen: false, isEdit: false, ruleId: null })}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[60vh]">
              {/* Basic Details */}
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Nombre de la Regla:</label>
                  <input
                    type="text"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                    placeholder="ej. SSD T7 Shield de Investigación"
                    className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">Tipo de Medio:</label>
                    <select
                      value={ruleForm.media_type}
                      onChange={(e) => setRuleForm({ ...ruleForm, media_type: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white"
                    >
                      <option value="external_storage">💾 Disco Externo / USB (/Volumes)</option>
                      <option value="folder">📁 Carpeta de Proyecto Local</option>
                      <option value="file">📄 Archivo Específico</option>
                      <option value="cloud_vault">⚡ Bóveda en la Nube / Sincronizada</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-bold">Ruta en Sistema de Archivos:</label>
                    <input
                      type="text"
                      value={ruleForm.target_path}
                      onChange={(e) => setRuleForm({ ...ruleForm, target_path: e.target.value })}
                      placeholder="ej. /Volumes/SSD_Name o /Users/alex/..."
                      className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Memory Routing Multi-Brain Selector */}
              <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 space-y-3">
                <span className="font-bold text-purple-300 block text-xs flex items-center gap-1.5">
                  <Brain className="w-4 h-4" />
                  1. Enrutamiento de Memorias a Cerebros / Personalidades
                </span>
                
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Categoría de Memoria StarSeed:</label>
                  <input
                    type="text"
                    value={ruleForm.auto_memory_routing.memory_category}
                    onChange={(e) => setRuleForm({
                      ...ruleForm,
                      auto_memory_routing: { ...ruleForm.auto_memory_routing, memory_category: e.target.value }
                    })}
                    className="w-full p-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1.5">Personalidades que Absorben este Medio:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {cerebrosList.map((c) => {
                      const isSelected = (ruleForm.auto_memory_routing.target_brains || []).includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleToggleTargetBrain(c.id)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                            isSelected
                              ? 'bg-purple-500/20 border-purple-500/50 text-white font-bold'
                              : 'bg-black/40 border-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-300" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Trigger Imagination Processes Checkboxes */}
              <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30 space-y-3">
                <span className="font-bold text-cyan-300 block text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  2. Disparar Procesos de Imaginación Intuitiva al Detectar
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {processTypesList.map((p) => {
                    const isSelected = (ruleForm.trigger_imagination.process_types || []).includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleToggleProcessType(p.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-white font-bold'
                            : 'bg-black/40 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-300" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Override Capacity Limits */}
              <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-3">
                <span className="font-bold text-emerald-300 block text-xs flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4" />
                  3. Ajuste de Capacidades Relativas 1.58b al Detectar
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300">Máx. Tronco Imaginación:</span>
                      <span className="text-purple-300 font-bold">{ruleForm.capacity_limits_override.imagination_max_percent}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      step="5"
                      value={ruleForm.capacity_limits_override.imagination_max_percent}
                      onChange={(e) => setRuleForm({
                        ...ruleForm,
                        capacity_limits_override: {
                          ...ruleForm.capacity_limits_override,
                          imagination_max_percent: parseInt(e.target.value)
                        }
                      })}
                      className="w-full accent-purple-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300">Máx. Tronco Multi-Agentes:</span>
                      <span className="text-cyan-300 font-bold">{ruleForm.capacity_limits_override.swarm_max_percent}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={ruleForm.capacity_limits_override.swarm_max_percent}
                      onChange={(e) => setRuleForm({
                        ...ruleForm,
                        capacity_limits_override: {
                          ...ruleForm.capacity_limits_override,
                          swarm_max_percent: parseInt(e.target.value)
                        }
                      })}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => setRuleModal({ isOpen: false, isEdit: false, ruleId: null })}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={handleSaveRule}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/25 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Regla de Enrutamiento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
