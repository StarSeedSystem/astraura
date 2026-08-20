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
  Usb,
  Download,
  Share2,
  GitMerge,
  ArrowRight,
  Shield,
  Laptop,
  Smartphone,
  Monitor,
  Network
} from 'lucide-react';
import { 
  fetchStorageDevices, 
  fetchStorageRules, 
  createOrUpdateStorageRule, 
  deleteStorageRule, 
  scanStorageNow, 
  simulateStorageConnection,
  fetchCerebros,
  fetchImaginationProcessTypes,
  scanExternalBrains,
  fuseExternalBrain,
  updateExternalBrainPermissions,
  syncPortableBrainToStorage,
  fetchSyncMeshTelemetry
} from '../services/api';
import { sovereignBroadcastBus } from '../services/sovereignBroadcastBus';

export default function StorageRoutingView() {
  const [devicesData, setDevicesData] = useState({ devices: [], devices_count: 0 });
  const [rules, setRules] = useState([]);
  const [cerebrosList, setCerebrosList] = useState([]);
  const [processTypesList, setProcessTypesList] = useState([]);
  const [externalBrains, setExternalBrains] = useState([]);
  const [syncMesh, setSyncMesh] = useState({ active_synced_clients: 1, status: 'synchronized_mesh' });
  const [activeTab, setActiveTab] = useState('drives_and_brains'); // 'drives_and_brains', 'rules', 'mesh_sync'
  
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isScanningBrains, setIsScanningBrains] = useState(false);
  const [isFusingBrain, setIsFusingBrain] = useState(false);
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

  // Portable Brain Sync Modal State
  const [syncBrainModal, setSyncBrainModal] = useState({
    isOpen: false,
    selectedBrainId: 'brain_genesis',
    targetDrivePath: '',
    includeProjects: true,
    includeVoiceStudio: true,
    isSyncing: false,
    result: null
  });

  const loadAll = async () => {
    try {
      const [devs, rData, cData, pData, extBrains, meshData] = await Promise.all([
        fetchStorageDevices().catch(() => null),
        fetchStorageRules().catch(() => null),
        fetchCerebros().catch(() => null),
        fetchImaginationProcessTypes().catch(() => null),
        scanExternalBrains().catch(() => null),
        fetchSyncMeshTelemetry().catch(() => null)
      ]);

      if (devs) setDevicesData(devs);
      if (rData && rData.rules) setRules(rData.rules);
      if (cData && cData.cerebros) setCerebrosList(cData.cerebros);
      if (pData && pData.process_types) setProcessTypesList(pData.process_types);
      if (extBrains && extBrains.external_brains) setExternalBrains(extBrains.external_brains);
      if (meshData && meshData.mesh) setSyncMesh(meshData.mesh);
    } catch (err) {
      console.warn('Error loading storage routing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 6000);

    // Cross-tab broadcast synchronization listener
    const unsubscribe = sovereignBroadcastBus.subscribe((msg) => {
      if (msg.type === 'storage_state_updated' || msg.type === 'cerebral_fusion_completed' || msg.type === 'portable_brain_synced') {
        loadAll();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const handleScanNow = async () => {
    setIsScanning(true);
    try {
      const res = await scanStorageNow();
      if (res && res.success) {
        const evtsCount = res.events_triggered?.length || 0;
        setToastMsg(`🔍 Escaneo de almacenamiento completado (${evtsCount} triggers).`);
        setTimeout(() => setToastMsg(''), 4000);
        sovereignBroadcastBus.emit('storage_state_updated');
        loadAll();
      }
    } catch (err) {
      alert(`Error escaneando medios: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanExternalBrains = async () => {
    setIsScanningBrains(true);
    try {
      const res = await scanExternalBrains();
      if (res && res.success) {
        setExternalBrains(res.external_brains || []);
        setToastMsg(`🧠 Detección 1.58b: ${res.total_detected} cerebros StarSeed encontrados.`);
        setTimeout(() => setToastMsg(''), 4000);
        loadAll();
      }
    } catch (err) {
      alert(`Error escaneando cerebros en almacenamientos: ${err.message}`);
    } finally {
      setIsScanningBrains(false);
    }
  };

  const handleFuseExternalBrain = async (brainId, strategy = 'bidirectional_merge') => {
    if (!window.confirm(`¿Confirmas fusionar sinápticamente las memorias, grafos y axiomas del cerebro '${brainId}' con StarSeed OS?`)) return;
    setIsFusingBrain(true);
    try {
      const res = await fuseExternalBrain(brainId, strategy);
      if (res && res.success) {
        setToastMsg(`✨ ${res.message}`);
        setTimeout(() => setToastMsg(''), 5000);
        sovereignBroadcastBus.emit('cerebral_fusion_completed', { brainId, strategy });
        loadAll();
      } else {
        alert(`Error en la fusión: ${res?.error || 'Fallo desconocido'}`);
      }
    } catch (err) {
      alert(`Error fusionando cerebro: ${err.message}`);
    } finally {
      setIsFusingBrain(false);
    }
  };

  const handleUpdatePermissionMode = async (brainId, mode) => {
    try {
      const res = await updateExternalBrainPermissions(brainId, mode);
      if (res && res.success) {
        setToastMsg(`🛡️ Permisos de conexión para '${brainId}' actualizados a: ${mode}`);
        setTimeout(() => setToastMsg(''), 3500);
        loadAll();
      }
    } catch (err) {
      alert(`Error actualizando permisos: ${err.message}`);
    }
  };

  const openSyncBrainModal = (suggestedPath = '') => {
    setSyncBrainModal({
      isOpen: true,
      selectedBrainId: cerebrosList[0]?.id || 'brain_genesis',
      targetDrivePath: suggestedPath || devicesData.devices[0]?.mountpoint || '/Volumes/Mi_Almacenamiento',
      includeProjects: true,
      includeVoiceStudio: true,
      isSyncing: false,
      result: null
    });
  };

  const handleExecutePortableSync = async () => {
    if (!syncBrainModal.targetDrivePath.trim()) {
      alert('Por favor especifica una ruta de almacenamiento de destino.');
      return;
    }
    setSyncBrainModal(prev => ({ ...prev, isSyncing: true, result: null }));
    try {
      const res = await syncPortableBrainToStorage(
        syncBrainModal.selectedBrainId,
        syncBrainModal.targetDrivePath,
        {
          includeProjects: syncBrainModal.includeProjects,
          includeVoiceStudio: syncBrainModal.includeVoiceStudio
        }
      );
      if (res && res.success) {
        setSyncBrainModal(prev => ({ ...prev, isSyncing: false, result: res }));
        setToastMsg(`🚀 Cerebro sincronizado y App Universal Portable instalada en ${syncBrainModal.targetDrivePath}`);
        setTimeout(() => setToastMsg(''), 6000);
        sovereignBroadcastBus.emit('portable_brain_synced', { path: syncBrainModal.targetDrivePath });
        loadAll();
      } else {
        alert(`Error al sincronizar cerebro: ${res?.error || 'Fallo desconocido'}`);
        setSyncBrainModal(prev => ({ ...prev, isSyncing: false }));
      }
    } catch (err) {
      alert(`Error al generar cápsula portable: ${err.message}`);
      setSyncBrainModal(prev => ({ ...prev, isSyncing: false }));
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
      {/* Master Top Control Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0a121f] via-[#0f1d33] to-[#1a1130] border border-cyan-500/30 shadow-2xl relative overflow-hidden font-mono text-xs">
        <div className="absolute -right-10 -top-10 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600/40 via-blue-500/30 to-purple-500/40 border border-cyan-400/50 flex items-center justify-center text-cyan-200 shadow-xl shadow-cyan-950/40">
              <HardDrive className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-white font-display tracking-wide">
                  Enrutamiento, Almacenamiento & Sincronización Universal
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Malla Multi-Dispositivo Sincronizada en Tiempo Real
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                Detección automática de memorias 1.58b StarSeed en almacenamientos conectados, fusión de sistemas operativos, y sincronización de cerebros a apps universales autoejecutables para cualquier sistema.
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
              onClick={() => openSyncBrainModal()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold flex items-center gap-2 shadow-lg shadow-purple-950/50 transition-all cursor-pointer border border-purple-400/40"
            >
              <Download className="w-4 h-4" />
              <span>⚡ Sincronizar Cerebro a Almacenamiento</span>
            </button>

            <button
              onClick={handleScanNow}
              disabled={isScanning}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-950/30"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Escaneando...' : 'Escanear Medios'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('drives_and_brains')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'drives_and_brains'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Discos & Cerebros 1.58b Conectados ({devicesData.devices_count} / {externalBrains.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Reglas de Enrutamiento ({rules.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('mesh_sync')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'mesh_sync'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Network className="w-4 h-4" />
              <span>Malla Multi-Dispositivo en Vivo ({syncMesh.active_synced_clients || 1} activos)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Soberano 100% Offline / Zero-Leak</span>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'drives_and_brains' && (
        <div className="space-y-6 font-mono text-xs">
          {/* Section A: Detected Storage Disks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Server className="w-4 h-4 text-cyan-400" />
                Unidades Físicas & Volúmenes de Almacenamiento ({devicesData.devices_count})
              </span>
              <span className="text-[10px] text-slate-400">Detección automática Multi-SO (/Volumes, C:\, /media, /sdcard)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {devicesData.devices?.map((dev, didx) => (
                <div 
                  key={didx}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                    dev.is_external 
                      ? 'bg-gradient-to-b from-[#12233b] to-[#0b1424] border-cyan-500/50 shadow-lg shadow-cyan-950/30'
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
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                      dev.is_external ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40' : 'bg-white/10 text-slate-400'
                    }`}>
                      {dev.is_external ? 'Externo' : 'Local'}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-300 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Punto de Montaje:</span>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: dev.mountpoint } }))}
                        className="truncate max-w-[130px] text-cyan-400 hover:text-cyan-200 hover:underline cursor-pointer"
                        title="Explorar este volumen en el visor soberano"
                      >
                        {dev.mountpoint}
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Espacio Libre:</span>
                      <span className="text-emerald-300 font-bold">{dev.free_gb} GB / {dev.total_gb} GB</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-white/5">
                    <button
                      onClick={() => openSyncBrainModal(dev.mountpoint)}
                      className="flex-1 py-1.5 rounded-xl bg-purple-500/25 hover:bg-purple-500/40 text-purple-200 border border-purple-500/40 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                      title="Sincronizar Cerebro e Instalar App Universal Portable en esta unidad"
                    >
                      <Download className="w-3 h-3 text-purple-300" />
                      <span>Sincronizar Cerebro</span>
                    </button>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: dev.mountpoint } }))}
                      className="py-1.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                      title="Explorar Archivos"
                    >
                      <Folder className="w-3 h-3 text-amber-400" />
                      <span>Ver</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Inter-Cerebral Synaptic Bridge & 1.58b Brains Detection */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0e1626] to-[#090e1a] border border-purple-500/30 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
                  <Brain className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Puente Sináptico Inter-Cerebral & Fusión de StarSeed OS (1.58-Bit)</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] border border-purple-500/40">
                      {externalBrains.length} Cerebros Detectados
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Auto-descubrimiento de memorias, axiomas y personalidades en almacenamientos conectados. Permite interpretar y fusionar sistemas operativos anfitriones y huéspedes.
                  </p>
                </div>
              </div>

              <button
                onClick={handleScanExternalBrains}
                disabled={isScanningBrains}
                className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningBrains ? 'animate-spin' : ''}`} />
                <span>{isScanningBrains ? 'Buscando Cerebros...' : 'Buscar Cerebros 1.58b'}</span>
              </button>
            </div>

            {externalBrains.length === 0 ? (
              <div className="p-8 rounded-2xl bg-black/40 border border-white/5 text-center space-y-2">
                <Brain className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  No se han detectado memorias de cerebros externos en los almacenamientos conectados actualmente.
                </p>
                <p className="text-[11px] text-slate-500">
                  Conecta una unidad USB o disco externo con una bóveda StarSeed, o usa el botón "Sincronizar Cerebro a Almacenamiento" para crear una cápsula portable.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {externalBrains.map((eb, eidx) => (
                  <div 
                    key={eidx}
                    className="p-5 rounded-2xl bg-black/60 border border-purple-500/40 shadow-xl space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/25 border border-purple-500/50 flex items-center justify-center text-purple-300">
                          <Brain className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white">{eb.name}</h3>
                          <span className="text-[10px] text-purple-300 block">{eb.storage_drive} • {eb.filesystem}</span>
                        </div>
                      </div>

                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                        {eb.synaptic_affinity_score}% Afinidad Sináptica
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-300">
                      <div>
                        <span className="text-slate-400 block">Arquitectura 1.58b:</span>
                        <span className="text-cyan-300 font-bold">{eb.bitnet_architecture}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Total Memorias:</span>
                        <span className="text-purple-300 font-bold">{eb.total_memories} docs / {eb.knowledge_graph_nodes} nodos</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Personalidades:</span>
                        <span className="text-slate-200 truncate block">{eb.personalities?.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Modo de Permiso:</span>
                        <span className="text-amber-300 font-bold uppercase">{eb.permissions?.mode || 'Bidirectional'}</span>
                      </div>
                    </div>

                    {/* Permissions & Fusion Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-cyan-400" />
                        <select
                          value={eb.permissions?.mode || 'bidirectional_merge'}
                          onChange={(e) => handleUpdatePermissionMode(eb.brain_id, e.target.value)}
                          className="bg-black/60 border border-white/10 text-cyan-200 text-[10px] rounded-lg px-2 py-1 focus:outline-none"
                        >
                          <option value="bidirectional_merge">Fusión Bidireccional Completa</option>
                          <option value="read_only">Lectura Soberana (No Modificar)</option>
                          <option value="sandbox_guest">Invitado / Sandbox Aislado</option>
                        </select>
                      </div>

                      <button
                        onClick={() => handleFuseExternalBrain(eb.brain_id, eb.permissions?.mode || 'bidirectional_merge')}
                        disabled={isFusingBrain}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-950/30 transition-all text-xs"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                        <span>{isFusingBrain ? 'Fusionando...' : 'Fusionar con StarSeed OS'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rules Tab Content */}
      {activeTab === 'rules' && (
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

            <button
              onClick={() => openCreateModal()}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Regla</span>
            </button>
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
                          const cerebroObj = cerebrosList.find(c => c.id === bId);
                          return (
                            <span key={bId} className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-200 border border-purple-500/30 text-[10px] font-bold">
                              {cerebroObj?.name || bId}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 2: Triggers de Imaginación */}
                    <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          Procesos de Imaginación Activados
                        </span>
                        <span className="text-[10px] text-slate-400">{rule.trigger_imagination?.burst_cycles || 1} ciclo(s)</span>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {rule.trigger_imagination?.process_types?.map((pId) => {
                          const pObj = processTypesList.find(p => p.id === pId);
                          return (
                            <span key={pId} className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 text-[10px]">
                              {pObj?.name || pId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleRule(rule)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                          rule.is_enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                            : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {rule.is_enabled ? 'Activa' : 'Pausada'}
                      </button>

                      <button
                        onClick={() => openEditModal(rule)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                        title="Editar Regla"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 cursor-pointer"
                      title="Eliminar Regla"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mesh Sync Tab Content */}
      {activeTab === 'mesh_sync' && (
        <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0d1726] to-[#090e18] border border-cyan-500/30 shadow-2xl space-y-6 font-mono text-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center shadow-lg">
              <Network className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Malla de Sincronización en Tiempo Real Multi-Ventana y Multi-Dispositivo</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30">
                  {syncMesh.status === 'synchronized_mesh' ? 'Espejo en Vivo 100% Activo' : 'En Espera'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cualquier cambio realizado en cualquier ventana de navegador, app instalada de escritorio o terminal móvil se refleja instantáneamente en todas las pantallas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-black/50 border border-cyan-500/30 space-y-1">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                <Laptop className="w-4 h-4" />
                <span>Navegador & PWA Local</span>
              </div>
              <p className="text-[11px] text-slate-300">BroadcastChannel activo (latencia &lt; 1ms entre pestañas).</p>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-purple-500/30 space-y-1">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                <Monitor className="w-4 h-4" />
                <span>App Nativa de Escritorio</span>
              </div>
              <p className="text-[11px] text-slate-300">macOS .app / Windows .exe / Linux Systemd conectado.</p>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-emerald-500/30 space-y-1">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                <Smartphone className="w-4 h-4" />
                <span>Dispositivos Móviles & Remotos</span>
              </div>
              <p className="text-[11px] text-slate-300">WebSocket bidireccional en tiempo real.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sincronizar Cerebro a Almacenamiento & Generar App Universal Portable */}
      {syncBrainModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono text-xs animate-fade-in">
          <div className="bg-[#0b121e] border border-purple-500/50 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl shadow-purple-950/60 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Sincronizar Cerebro a Almacenamiento</h3>
                  <span className="text-[10px] text-purple-300">Generador de Cápsula Cerebral Portable & App Autoejecutable</span>
                </div>
              </div>
              <button 
                onClick={() => setSyncBrainModal({ ...syncBrainModal, isOpen: false })}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  1. Selecciona el Cerebro de Origen a Sincronizar:
                </label>
                <select
                  value={syncBrainModal.selectedBrainId}
                  onChange={(e) => setSyncBrainModal({ ...syncBrainModal, selectedBrainId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-purple-500"
                >
                  <option value="starseed_unified_brain">🌌 Bóveda Unificada StarSeed OS (Todos los 6 Cerebros)</option>
                  {cerebrosList.map(c => (
                    <option key={c.id} value={c.id}>🧠 {c.name} ({c.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  2. Unidad o Ruta de Destino del Almacenamiento:
                </label>
                <input
                  type="text"
                  value={syncBrainModal.targetDrivePath}
                  onChange={(e) => setSyncBrainModal({ ...syncBrainModal, targetDrivePath: e.target.value })}
                  placeholder="/Volumes/USB_DRIVE o C:\Astraura_Brain"
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-cyan-300 text-xs focus:border-cyan-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400">Detectados:</span>
                  {devicesData.devices?.map((dev, didx) => (
                    <button
                      key={didx}
                      type="button"
                      onClick={() => setSyncBrainModal({ ...syncBrainModal, targetDrivePath: dev.mountpoint })}
                      className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-cyan-300 border border-white/10 text-[10px] cursor-pointer"
                    >
                      {dev.mountpoint.split('/').pop() || dev.mountpoint}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 block">3. Opciones de Empaquetado:</span>
                <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncBrainModal.includeProjects}
                    onChange={(e) => setSyncBrainModal({ ...syncBrainModal, includeProjects: e.target.checked })}
                    className="rounded accent-purple-500"
                  />
                  <span>Incluir Proyectos Vivos & Bóveda de Ramas AST</span>
                </label>
                <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncBrainModal.includeVoiceStudio}
                    onChange={(e) => setSyncBrainModal({ ...syncBrainModal, includeVoiceStudio: e.target.checked })}
                    className="rounded accent-cyan-500"
                  />
                  <span>Incluir Prosodia Afectiva OmniVoice & Memorias Acústicas</span>
                </label>
              </div>

              {syncBrainModal.result && (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>¡Cerebro Sincronizado Exitosamente!</span>
                  </div>
                  <p className="text-[10px] text-slate-300">{syncBrainModal.result.message}</p>
                  <div className="text-[10px] bg-black/50 p-2.5 rounded-xl space-y-1">
                    <span className="font-bold text-cyan-300 block">Lanzadores Universales Creados:</span>
                    {syncBrainModal.result.launchers_created?.map((l, lidx) => (
                      <div key={lidx} className="text-slate-300">✓ {l}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => setSyncBrainModal({ ...syncBrainModal, isOpen: false })}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
              >
                Cerrar
              </button>

              <button
                onClick={handleExecutePortableSync}
                disabled={syncBrainModal.isSyncing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-purple-950/50 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{syncBrainModal.isSyncing ? 'Sincronizando...' : 'Generar e Instalar en Almacenamiento'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rule Create / Edit */}
      {ruleModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs animate-fade-in">
          <div className="bg-[#0b101c] border border-cyan-500/40 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl shadow-cyan-950/50">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {ruleModal.isEdit ? 'Editar Regla de Almacenamiento' : 'Nueva Regla de Almacenamiento'}
                  </h3>
                  <span className="text-[10px] text-slate-400">Automatización por medio de almacenamiento o folder</span>
                </div>
              </div>
              <button 
                onClick={() => setRuleModal({ isOpen: false, isEdit: false, ruleId: null })}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Nombre de la Regla:</label>
                  <input
                    type="text"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Tipo de Medio:</label>
                  <select
                    value={ruleForm.media_type}
                    onChange={(e) => setRuleForm({ ...ruleForm, media_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                  >
                    <option value="external_storage">Dispositivo Externo (/Volumes, USB, SSD)</option>
                    <option value="folder">Carpeta Local del Sistema</option>
                    <option value="file">Archivo Específico</option>
                    <option value="cloud_vault">Bóveda en la Nube / Red</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Ruta de Destino a Vigilar:</label>
                <input
                  type="text"
                  value={ruleForm.target_path}
                  onChange={(e) => setRuleForm({ ...ruleForm, target_path: e.target.value })}
                  placeholder="/Volumes/USB o /Users/alex/Documents"
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-cyan-300 text-xs"
                />
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
