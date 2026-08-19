import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Moon, 
  Sun, 
  RefreshCw, 
  Zap, 
  Database, 
  HardDrive, 
  Cloud, 
  Sliders, 
  Trash2, 
  Check, 
  Activity, 
  Brain, 
  Layers, 
  Lightbulb, 
  RotateCcw, 
  CheckCircle2, 
  TrendingDown, 
  ShieldCheck, 
  Plus, 
  Play, 
  Pause, 
  Edit3, 
  CheckCheck, 
  X, 
  GitBranch, 
  Wand2, 
  Code2, 
  Compass, 
  SlidersHorizontal, 
  Flame, 
  Tag, 
  Clock, 
  Eye, 
  Volume2, 
  MapPin, 
  Cpu, 
  FileCode, 
  Globe, 
  Radio, 
  Gauge, 
  ExternalLink,
  History,
  SlidersVertical,
  Users,
  ShieldAlert,
  Bot,
  ArrowRight,
  FolderCheck,
  Key
} from 'lucide-react';
import { 
  fetchImaginationStatus, 
  fetchImaginationProcessTypes, 
  updateImaginationConfig, 
  triggerImaginationCycle, 
  recycleImaginationMemories, 
  fetchCerebros, 
  handleImaginationAction, 
  updateSensoriumLocation,
  fetchProcessDetails,
  updateProcessConfig,
  fetchDualTrunkGovernor,
  updateDualTrunkGovernor,
  applyAllProposals,
  updateProcessPermissionPolicy,
  grantAllRequests,
  grantSingleRequest,
  fetchAgents,
  toggleAgentImagination,
  updateAgentImaginationConfig,
  saveAgent
} from '../services/api';
import { deviceContextDetector } from '../services/deviceContextDetector';
import UniversalDeviceModal from './UniversalDeviceModal';
import AgentBackgroundTasksZone from './AgentBackgroundTasksZone';
import ProcessBranchesModal from './ProcessBranchesModal';
import AgentEditorModal from './AgentEditorModal';
import AgentApiManagerModal from './AgentApiManagerModal';

export default function IntuitiveImaginationView() {
  const [activeSubTab, setActiveSubTab] = useState('processes'); // 'processes', 'agents_imagination', 'branches', 'creations', 'config'
  const [status, setStatus] = useState(null);
  const [processTypes, setProcessTypes] = useState([]);
  const [cerebrosList, setCerebrosList] = useState([]);
  const [agentsList, setAgentsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isRecycling, setIsRecycling] = useState(false);
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [customTheme, setCustomTheme] = useState('');
  const [selectedProcessType, setSelectedProcessType] = useState('rem_synaptic_consolidation');
  const [countdown, setCountdown] = useState('05:00');

  // Agent Vault Modals
  const [isAgentEditorOpen, setIsAgentEditorOpen] = useState(false);
  const [selectedEditingAgent, setSelectedEditingAgent] = useState(null);
  const [isAgentApiModalOpen, setIsAgentApiModalOpen] = useState(false);
  const [selectedApiAgent, setSelectedApiAgent] = useState(null);
  
  // Dedicated Process Branches Modal State
  const [selectedBranchesProcessId, setSelectedBranchesProcessId] = useState(null);
  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);
  const [isCalibratingLoc, setIsCalibratingLoc] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);

  // Synchronized Multi-Agent Execution Modal State
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  // Dual-Trunk Master Governor State
  const [dualTrunk, setDualTrunk] = useState({
    imagination_global_percent: 25,
    swarm_global_percent: 40,
    interactive_reserve_percent: 35,
    imagination_cores: 2,
    swarm_cores: 3,
    user_chat_cores: 3
  });

  // Process Full Window Details Modal State
  const [processModal, setProcessModal] = useState({
    isOpen: false,
    processId: null,
    details: null,
    activeTab: 'history' // 'history', 'branches', 'creations', 'config'
  });

  // Edit Proposal Modal State
  const [editModal, setEditModal] = useState({ isOpen: false, itemType: 'branch', data: null });
  const [editFormData, setEditFormData] = useState({});

  // Global Config Form State
  const [configForm, setConfigForm] = useState({
    is_always_on: true,
    operation_mode: 'always_on',
    cycle_frequency_minutes: 5,
    max_imagination_global_percent: 25,
    max_swarm_global_percent: 40,
    max_concurrent_processes: 3,
    max_accumulated_requests_threshold: 5,
    max_proposals_per_agent_limit: 4,
    auto_sync_all_proposals_enabled: true,
    quantum_entropy_level: 0.75,
    max_kb_per_minute: 45,
    max_mb_per_hour: 2.5,
    storage_target: 'local_vault',
    associated_brain_ids: ['brain_genesis', 'brain_hephaestus', 'brain_hermes'],
    auto_recycle_memories: true
  });

  const loadData = async () => {
    try {
      const [sData, pTypesData, cData, dtData, agData] = await Promise.all([
        fetchImaginationStatus().catch(() => null),
        fetchImaginationProcessTypes().catch(() => null),
        fetchCerebros().catch(() => null),
        fetchDualTrunkGovernor().catch(() => null),
        fetchAgents().catch(() => null)
      ]);

      if (agData && agData.agents) {
        setAgentsList(agData.agents);
      }

      if (sData) {
        setStatus(sData);
        if (sData.next_cycle_formatted) {
          setCountdown(sData.next_cycle_formatted);
        }
        if (sData.dual_trunk) {
          setDualTrunk(sData.dual_trunk);
        }
        if (sData.sync_execution_state) {
          setSyncProgress(sData.sync_execution_state);
        }
        setConfigForm(prev => ({
          ...prev,
          is_always_on: sData.is_always_on !== undefined ? sData.is_always_on : prev.is_always_on,
          operation_mode: sData.operation_mode || prev.operation_mode,
          cycle_frequency_minutes: sData.cycle_frequency_minutes || prev.cycle_frequency_minutes,
          max_imagination_global_percent: sData.max_imagination_global_percent || prev.max_imagination_global_percent,
          max_swarm_global_percent: sData.max_swarm_global_percent || prev.max_swarm_global_percent,
          max_concurrent_processes: sData.max_concurrent_processes || prev.max_concurrent_processes,
          max_accumulated_requests_threshold: sData.max_accumulated_requests_threshold || prev.max_accumulated_requests_threshold,
          max_proposals_per_agent_limit: sData.max_proposals_per_agent_limit || prev.max_proposals_per_agent_limit || 4,
          auto_sync_all_proposals_enabled: sData.auto_sync_all_proposals_enabled !== undefined ? sData.auto_sync_all_proposals_enabled : prev.auto_sync_all_proposals_enabled,
          quantum_entropy_level: sData.quantum_entropy_level || prev.quantum_entropy_level,
          max_kb_per_minute: sData.max_kb_per_minute || prev.max_kb_per_minute,
          max_mb_per_hour: sData.max_mb_per_hour || prev.max_mb_per_hour,
          storage_target: sData.storage_target || prev.storage_target,
          associated_brain_ids: sData.associated_brain_ids || prev.associated_brain_ids,
          auto_recycle_memories: sData.auto_recycle_memories !== undefined ? sData.auto_recycle_memories : prev.auto_recycle_memories
        }));
      }

      if (pTypesData && Array.isArray(pTypesData)) {
        setProcessTypes(pTypesData);
      }
      if (cData && Array.isArray(cData)) {
        setCerebrosList(cData);
      }
      if (dtData) {
        setDualTrunk(dtData);
      }
    } catch (err) {
      console.warn('Error fetching intuitive imagination status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAgentImaginationState = async (agentId, currentVal) => {
    try {
      const newVal = !currentVal;
      await toggleAgentImagination(agentId, newVal);
      setToastMsg(`🌌 Imaginación en 2do Plano para ${agentId}: ${newVal ? 'ACTIVADA' : 'DESACTIVADA'}`);
      setTimeout(() => setToastMsg(''), 3000);
      loadData();
    } catch (err) {
      alert(`Error cambiando estado de imaginación: ${err.message}`);
    }
  };

  const handleUpdateAgentImagConfig = async (agentId, partialConfig) => {
    try {
      await updateAgentImaginationConfig(agentId, partialConfig);
      setToastMsg(`⚙️ Configuración de ${agentId} actualizada`);
      setTimeout(() => setToastMsg(''), 3000);
      loadData();
    } catch (err) {
      alert(`Error actualizando configuración del agente: ${err.message}`);
    }
  };

  const handleSaveAgentData = async (agentPayload) => {
    try {
      await saveAgent(agentPayload);
      setToastMsg(`💾 Agente guardado: ${agentPayload.name}`);
      setTimeout(() => setToastMsg(''), 3000);
      setIsAgentEditorOpen(false);
      setSelectedEditingAgent(null);
      loadData();
    } catch (err) {
      alert(`Error guardando agente: ${err.message}`);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDualTrunkChange = async (imagPercent, swarmPercent) => {
    try {
      const res = await updateDualTrunkGovernor(imagPercent, swarmPercent);
      if (res) {
        setDualTrunk(res);
        setToastMsg(`⚡ Doble Tronco Ajustado: ${imagPercent}% Imaginación | ${swarmPercent}% Multi-Agentes`);
        setTimeout(() => setToastMsg(''), 3500);
        loadData();
      }
    } catch (err) {
      alert(`Error actualizando Doble Tronco: ${err.message}`);
    }
  };

  const handleOpenProcessModal = async (processId) => {
    try {
      const details = await fetchProcessDetails(processId);
      setProcessModal({
        isOpen: true,
        processId,
        details,
        activeTab: 'history'
      });
    } catch (err) {
      alert(`Error cargando detalles del proceso: ${err.message}`);
    }
  };

  const handleUpdateProcessResource = async (processId, percent) => {
    try {
      await updateProcessConfig(processId, { allocated_resource_percent: percent });
      setToastMsg(`⚙️ Asignación de Recursos para ${processId}: ${percent}%`);
      setTimeout(() => setToastMsg(''), 3000);
      loadData();
      if (processModal.isOpen && processModal.processId === processId) {
        const updated = await fetchProcessDetails(processId);
        setProcessModal(prev => ({ ...prev, details: updated }));
      }
    } catch (err) {
      alert(`Error actualizando recurso del proceso: ${err.message}`);
    }
  };

  const handleUpdateProcessPermission = async (processId, newLevel) => {
    try {
      await updateProcessPermissionPolicy(processId, { level: newLevel, notify_on_important: true });
      setToastMsg(`🛡️ Permiso Actualizado para ${processId}: ${newLevel}`);
      setTimeout(() => setToastMsg(''), 3000);
      loadData();
      if (processModal.isOpen && processModal.processId === processId) {
        const updated = await fetchProcessDetails(processId);
        setProcessModal(prev => ({ ...prev, details: updated }));
      }
    } catch (err) {
      alert(`Error actualizando permisos: ${err.message}`);
    }
  };

  const handleToggleProcessStatus = async (processId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await updateProcessConfig(processId, { status: newStatus });
      setToastMsg(`${newStatus === 'active' ? '🟢' : '⏸️'} Proceso ${processId} ${newStatus.toUpperCase()}`);
      setTimeout(() => setToastMsg(''), 3000);
      loadData();
      if (processModal.isOpen && processModal.processId === processId) {
        const updated = await fetchProcessDetails(processId);
        setProcessModal(prev => ({ ...prev, details: updated }));
      }
    } catch (err) {
      alert(`Error cambiando estado: ${err.message}`);
    }
  };

  const handleCalibrateLocation = async () => {
    setIsCalibratingLoc(true);
    try {
      const loc = await deviceContextDetector.detectPreciseLocation();
      if (loc) {
        await updateSensoriumLocation(loc);
        setToastMsg(`📍 Ubicación Calibrada: ${loc.city}, ${loc.country}`);
        setTimeout(() => setToastMsg(''), 4000);
        loadData();
      }
    } catch (err) {
      alert(`Error calibrando ubicación: ${err.message}`);
    } finally {
      setIsCalibratingLoc(false);
    }
  };

  const handleToggleAlwaysOn = async () => {
    if (!status) return;
    const newAlwaysOn = !status.is_always_on;
    try {
      await updateImaginationConfig({ is_always_on: newAlwaysOn });
      setStatus(prev => ({ ...prev, is_always_on: newAlwaysOn }));
      setConfigForm(prev => ({ ...prev, is_always_on: newAlwaysOn }));
      setToastMsg(newAlwaysOn ? '✨ Imaginación Always-On Activada en 2do Plano' : '⏸️ Imaginación Pausada');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      alert(`Error actualizando: ${err.message}`);
    }
  };

  const handleTriggerCycle = async (procType = null) => {
    setIsTriggering(true);
    try {
      const targetProc = procType || selectedProcessType;
      const res = await triggerImaginationCycle(customTheme.trim() || null, targetProc);
      if (res && res.success) {
        setCustomTheme('');
        if (res.change_needed === false) {
          setToastMsg(`🔍 Verificación Completada: Estado ya óptimo (Sin cambios requeridos)`);
        } else {
          setToastMsg(`🌌 Síntesis Forjada: ${res.process_type?.name || 'Imaginación Intuitiva'}`);
        }
        setTimeout(() => setToastMsg(''), 4000);
        loadData();
        if (processModal.isOpen && processModal.processId === targetProc) {
          const updated = await fetchProcessDetails(targetProc);
          setProcessModal(prev => ({ ...prev, details: updated }));
        }
      }
    } catch (err) {
      alert(`Error ejecutando ciclo: ${err.message}`);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleApplyAll = async () => {
    setIsApplyingAll(true);
    setSyncModalOpen(true);
    try {
      const res = await applyAllProposals();
      if (res && res.success) {
        setSyncProgress(res.state);
        setToastMsg(`✨ ¡${res.applied_count} propuestas aplicadas concurrentemente por los agentes!`);
        setTimeout(() => setToastMsg(''), 4500);
        loadData();
      }
    } catch (err) {
      alert(`Error aplicando propuestas: ${err.message}`);
    } finally {
      setIsApplyingAll(false);
    }
  };

  const handleGrantAllRequests = async () => {
    setIsApplyingAll(true);
    try {
      const res = await grantAllRequests();
      if (res && res.success) {
        setToastMsg(`✅ ¡${res.applied_count} solicitudes autorizadas y aplicadas en segundo plano!`);
        setTimeout(() => setToastMsg(''), 4000);
        loadData();
      }
    } catch (err) {
      alert(`Error autorizando solicitudes: ${err.message}`);
    } finally {
      setIsApplyingAll(false);
    }
  };

  const handleGrantSingleRequest = async (branchId, editedData = null) => {
    try {
      const res = await grantSingleRequest(branchId, editedData);
      if (res && res.success) {
        setToastMsg(`✅ Solicitud autorizada y aplicada`);
        setTimeout(() => setToastMsg(''), 3000);
        loadData();
      }
    } catch (err) {
      alert(`Error autorizando solicitud: ${err.message}`);
    }
  };

  const handleToggleAutoSyncAll = async (newVal) => {
    try {
      const res = await updateImaginationConfig({ auto_sync_all_proposals_enabled: newVal });
      if (res) {
        setConfigForm(prev => ({ ...prev, auto_sync_all_proposals_enabled: newVal }));
        setToastMsg(newVal ? '⚡ Auto-Aplicación Multi-Agente Activada' : '⏸️ Auto-Aplicación en Pausa (Solo Enlistadas)');
        setTimeout(() => setToastMsg(''), 3000);
        loadData();
      }
    } catch (err) {
      alert(`Error cambiando modo de auto-aplicación: ${err.message}`);
    }
  };

  const handleUpdateProcessPolicy = async (processId, policyUpdates) => {
    try {
      const res = await updateProcessPermissionPolicy(processId, policyUpdates);
      if (res && res.success) {
        setToastMsg('🛡️ Política de permisos del proceso actualizada');
        setTimeout(() => setToastMsg(''), 2500);
        loadData();
      }
    } catch (err) {
      alert(`Error actualizando política: ${err.message}`);
    }
  };

  const handleRecycleNow = async () => {
    setIsRecycling(true);
    try {
      const res = await recycleImaginationMemories();
      if (res && res.success) {
        setToastMsg(`♻️ ${res.recycle?.items_compacted || 1} memorias compactadas (+${res.recycle?.space_freed_kb || 2.4} KB libres)`);
        setTimeout(() => setToastMsg(''), 3500);
        loadData();
      }
    } catch (err) {
      alert(`Error reciclando memorias: ${err.message}`);
    } finally {
      setIsRecycling(false);
    }
  };

  const onAction = async (itemId, itemType, action, data = null) => {
    try {
      const res = await handleImaginationAction(itemId, itemType, action, data);
      if (res && res.success) {
        if (action === 'apply') setToastMsg(`✅ Aplicado en Exocórtex: ${res.item?.theme || res.item?.title || ''}`);
        if (action === 'discard') setToastMsg('🗑️ Elemento descartado');
        if (action === 'edit') setToastMsg('✏️ Elemento actualizado con éxito');
        setTimeout(() => setToastMsg(''), 3000);
        loadData();
        if (processModal.isOpen && processModal.processId) {
          const updated = await fetchProcessDetails(processModal.processId);
          setProcessModal(prev => ({ ...prev, details: updated }));
        }
      }
    } catch (e) {
      alert(`Error en acción: ${e.message}`);
    }
  };

  const openEditModal = (item, itemType) => {
    setEditModal({ isOpen: true, itemType, data: item });
    setEditFormData({
      theme: item.theme || item.title || '',
      hypothesis: item.hypothesis || item.content || '',
      insights: item.insights || '',
      title: item.title || item.theme || '',
      content: item.content || item.hypothesis || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal.data) return;
    await onAction(editModal.data.id, editModal.itemType, 'edit', editFormData);
    setEditModal({ isOpen: false, itemType: 'branch', data: null });
  };

  const handleSaveGlobalConfig = async (e) => {
    e.preventDefault();
    try {
      await updateImaginationConfig(configForm);
      setToastMsg('⚙️ Configuración Global de Imaginación & Permisos Guardada');
      setTimeout(() => setToastMsg(''), 3000);
      loadData();
    } catch (err) {
      alert(`Error guardando configuración: ${err.message}`);
    }
  };

  const getProcessIcon = (iconName) => {
    switch (iconName) {
      case 'Moon': return Moon;
      case 'Sparkles': return Sparkles;
      case 'Wand2': return Wand2;
      case 'Code2': return Code2;
      case 'Compass': return Compass;
      case 'Layers': return Layers;
      default: return Sparkles;
    }
  };

  const getImportanceBadge = (importance) => {
    switch (importance) {
      case 'critical_security':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1">
            🛡️ Seguridad Crítica
          </span>
        );
      case 'high':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
            ⚡ Alto Impacto (Código)
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1">
            🔮 Medio (Memoria/UI)
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
            ✨ Leve (Optimización)
          </span>
        );
    }
  };

  if (isLoading && !status) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        <span className="text-sm font-mono text-purple-300">Sincronizando Sistema de Imaginación Intuitiva 1.58-Bit...</span>
      </div>
    );
  }

  const pendingCount = status?.branches?.filter(b => b.status === 'pending_approval' || b.requires_user_approval)?.length || 0;
  const totalCount = status?.branches?.length || 0;
  const appliedCount = status?.branches?.filter(b => b.status === 'applied')?.length || 0;

  return (
    <div className="h-full overflow-y-auto space-y-6 font-sans pr-1 pb-16 custom-scrollbar">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-gradient-to-r from-purple-900 to-cyan-900 border border-purple-400 text-white font-mono text-xs shadow-2xl animate-fade-in flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP ZONE: TAREAS EN PROGRESO EN 2DO PLANO & INTERACCIÓN EN TIEMPO REAL CON CADA AGENTE */}
      <AgentBackgroundTasksZone />

      {/* HEADER: TITLE, DUAL-TRUNK GOVERNOR STATUS, ALWAYS-ON TOGGLE & UNIVERSAL DEVICE SHORTCUT */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#120d29] via-[#0d162a] to-[#091120] border border-purple-500/30 shadow-xl relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 shrink-0">
                <Brain className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-black text-white font-display truncate">
                  Imaginación Intuitiva // StarSeed 1.58b
                </h1>
                <p className="text-xs text-purple-300 font-mono truncate">
                  Gobernanza de Auto-Aceptación con Permisos Graduales & Sincronización Multi-Agente
                </p>
              </div>
            </div>

            {/* Context Badge Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="px-2.5 py-1 rounded-xl bg-black/40 border border-purple-500/30 text-purple-300 flex items-center gap-1.5 shrink-0">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                M1 8-Cores // {status?.allocated_cores || dualTrunk?.imagination_cores || 2} Asignados ({dualTrunk?.imagination_global_percent || 25}%)
              </span>

              <button
                onClick={handleCalibrateLocation}
                disabled={isCalibratingLoc}
                className="px-2.5 py-1 rounded-xl bg-black/40 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <MapPin className={`w-3.5 h-3.5 ${isCalibratingLoc ? 'animate-spin' : ''}`} />
                <span>📍 Guadalajara, México (Calibrar)</span>
              </button>

              <span className="px-2.5 py-1 rounded-xl bg-black/40 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 shrink-0">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Entropía: {status?.quantum_entropy_level || 0.75}
              </span>

              <button
                onClick={() => setIsDeviceModalOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer font-bold shrink-0"
              >
                <FolderCheck className="w-3.5 h-3.5 text-cyan-300" />
                <span>🛡️ Acceso Universal al Dispositivo</span>
              </button>
            </div>
          </div>

          {/* Master Controls & Live Countdown */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-center font-mono flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Próxima Síntesis:</span>
              <span className="text-sm font-bold text-cyan-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                {countdown}
              </span>
            </div>

            <button
              onClick={handleToggleAlwaysOn}
              className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                status?.is_always_on
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'bg-white/10 text-slate-300 border border-white/10 hover:bg-white/20'
              }`}
            >
              {status?.is_always_on ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  <span>Always-On: ACTIVO ({status?.active_agents_count || 6} Agentes • {status?.active_processes_count || 6} Procesos)</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-rose-400" />
                  <span>Always-On: PAUSADO</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleTriggerCycle()}
              disabled={isTriggering}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
              <span>{isTriggering ? 'Generando...' : 'Disparar Síntesis'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MASTER RESOURCE GOVERNOR BAR (TRONCO A + TRONCO B + CHAT) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0a0d16] border border-cyan-500/20 shadow-xl space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <SlidersVertical className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white text-xs sm:text-sm">Gobernador de Recursos 1.58b // Tronco A (Imaginación) & Tronco B (Multi-Agentes)</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Reserva Chat: <b className="text-emerald-400">{dualTrunk.interactive_reserve_percent}% ({dualTrunk.user_chat_cores} Núcleos)</b>
          </span>
        </div>

        {/* Resource Allocation Visual Bar */}
        <div className="space-y-2">
          <div className="h-3 w-full rounded-full bg-black/60 p-0.5 border border-white/10 flex overflow-hidden">
            <div 
              style={{ width: `${dualTrunk.imagination_global_percent}%` }} 
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-l-full transition-all"
              title={`Tronco A: ${dualTrunk.imagination_global_percent}%`}
            />
            <div 
              style={{ width: `${dualTrunk.swarm_global_percent}%` }} 
              className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 transition-all"
              title={`Tronco B: ${dualTrunk.swarm_global_percent}%`}
            />
            <div 
              style={{ width: `${dualTrunk.interactive_reserve_percent}%` }} 
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-r-full transition-all"
              title={`Chat Libre: ${dualTrunk.interactive_reserve_percent}%`}
            />
          </div>

          {/* Allocation Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Tronco A (Imaginación): <b>{dualTrunk.imagination_global_percent}%</b>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              Tronco B (Multi-Agentes): <b>{dualTrunk.swarm_global_percent}%</b>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Chat de Usuario: <b>{dualTrunk.interactive_reserve_percent}%</b>
            </span>
          </div>
        </div>

        {/* Dual Trunk Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
          <div className="p-3 rounded-xl bg-black/40 border border-purple-500/20 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-purple-300 font-bold">Tronco A (Imaginación Global):</span>
              <span className="text-purple-400 font-bold">{dualTrunk.imagination_global_percent}% ({dualTrunk.imagination_cores} Núcleos M1)</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={dualTrunk.imagination_global_percent}
              onChange={(e) => handleDualTrunkChange(parseInt(e.target.value), dualTrunk.swarm_global_percent)}
              className="w-full accent-purple-400"
            />
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/20 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-cyan-300 font-bold">Tronco B (Enjambre Global):</span>
              <span className="text-cyan-400 font-bold">{dualTrunk.swarm_global_percent}% ({dualTrunk.swarm_cores} Núcleos M1)</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={dualTrunk.swarm_global_percent}
              onChange={(e) => handleDualTrunkChange(dualTrunk.imagination_global_percent, parseInt(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3 text-xs font-mono">
        {[
          { id: 'processes', label: 'Procesos Oníricos & Niveladores', icon: Moon },
          { id: 'agents_imagination', label: '🧠 Agentes & Imaginación en 2do Plano', icon: Users, count: agentsList?.length || 7 },
          { id: 'branches', label: 'Ramas & Propuestas (Control)', icon: GitBranch, count: totalCount },
          { id: 'creations', label: 'Creaciones Proactivas', icon: Wand2, count: status?.creations?.length || 0 },
          { id: 'config', label: 'Permisos & Configuración Global', icon: Sliders }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer font-bold ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500/25 to-cyan-500/25 text-white border border-purple-500/50 shadow-md shadow-purple-950/30'
                  : 'text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: 6 DIVERSE ONIRIC PROCESSES WITH PER-PROCESS PERMISSION & RESOURCE SLIDERS */}
      {activeSubTab === 'processes' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-black/40 border border-white/5">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white font-display">
                Catálogo de Procesos de Imaginación Intuitiva // Troncos de Ramas
              </h2>
              <p className="text-[11px] text-slate-400">
                Cada proceso cuenta con permisos graduales, sliders de recursos y ventana completa.
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Semilla temática (opcional)..."
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                className="p-2 rounded-xl bg-black/60 border border-white/10 text-xs text-slate-100 font-mono w-full sm:w-64 focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {(status?.process_types_catalog || processTypes).map((pt) => {
              const Icon = getProcessIcon(pt.icon);
              const isRunning = pt.status === 'running';
              const isPaused = pt.status === 'paused';
              const allocPct = pt.allocated_resource_percent || 20;

              return (
                <div
                  key={pt.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                    isRunning
                      ? 'bg-gradient-to-b from-[#1c113b] to-[#0b1222] border-purple-500/70 shadow-xl text-white'
                      : isPaused
                      ? 'bg-[#08090e] border-white/5 opacity-70 text-slate-400'
                      : 'bg-[#0c0f18] border-white/10 text-slate-300 hover:border-purple-500/30'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header with Activity Badge and Title */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-md"
                          style={{ backgroundColor: `${pt.color}15`, borderColor: `${pt.color}40`, color: pt.color }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-xs text-white leading-tight truncate">{pt.name}</h3>
                          <span className="text-[10px] text-slate-400 font-mono truncate block">{pt.category}</span>
                        </div>
                      </div>

                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono ${
                        isRunning 
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse'
                          : isPaused
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRunning ? 'bg-purple-400 animate-ping' : isPaused ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                        {isRunning ? 'Ejecutando' : isPaused ? 'Pausado' : 'Activo'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-snug line-clamp-2 h-[32px] overflow-hidden font-sans">
                      {pt.description}
                    </p>

                    {/* Formatted Date & Time of Last Update */}
                    <div className="p-2 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-400 shrink-0" />
                        Última Activación:
                      </span>
                      <span className="text-slate-200 font-bold">{pt.last_activated_formatted || '18/08/2026 13:45:00'}</span>
                    </div>

                    {/* Accumulated Proposals & Limit Badge */}
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-purple-400 shrink-0" /> Propuestas Acumuladas:
                      </span>
                      <span className={`font-bold font-mono ${pt.is_auto_paused_by_limit ? 'text-amber-400 animate-pulse' : 'text-cyan-300'}`}>
                        {pt.pending_proposals_count || 0} / {status?.max_proposals_per_agent_limit || 4} {pt.is_auto_paused_by_limit ? '(Auto-Pausa)' : ''}
                      </span>
                    </div>

                    {/* Gradual Permission Policy Selector */}
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-cyan-400 shrink-0" /> Modo Permisos:
                        </span>
                        <span className="text-cyan-300 font-mono font-bold text-[10px]">
                          {pt.permission_policy?.level === 'autonomous_sovereign' ? '⚡ Autónomo' : pt.permission_policy?.level === 'always_ask' ? '🔒 Supervisado' : '✨ Auto-Seguro'}
                        </span>
                      </div>
                      <select
                        value={pt.permission_policy?.level || 'auto_apply_safe'}
                        onChange={(e) => handleUpdateProcessPermission(pt.id, e.target.value)}
                        className="w-full p-1 rounded-lg bg-black/80 border border-white/10 text-[10px] text-slate-200 font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="auto_apply_safe">Auto-Aceptar Seguras (Recomendado)</option>
                        <option value="auto_apply_minor">Auto-Aceptar Leves & Docs</option>
                        <option value="always_ask">Supervisión Total (Preguntar Siempre)</option>
                        <option value="autonomous_sovereign">Autónomo Soberano (Auto-Aplicar Todo)</option>
                      </select>
                    </div>

                    {/* Per-Process Resource Slider */}
                    <div className="space-y-1 pt-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400 font-bold">Asignación Tronco A:</span>
                        <span className="text-purple-300 font-bold">{allocPct}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="40"
                        step="5"
                        value={allocPct}
                        onChange={(e) => handleUpdateProcessResource(pt.id, parseInt(e.target.value))}
                        className="w-full accent-purple-400"
                      />
                    </div>
                  </div>

                  {/* Actions & Full Window Link */}
                  <div className="pt-2.5 border-t border-white/5 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedBranchesProcessId(pt.id);
                          setIsBranchesModalOpen(true);
                        }}
                        className="py-1.5 px-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-500/30 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-[11px]"
                        title="Ver Ramas y Procesos Completados & En Curso"
                      >
                        <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">Ramas & Logs</span>
                      </button>

                      <button
                        onClick={() => handleOpenProcessModal(pt.id)}
                        className="py-1.5 px-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border border-purple-500/30 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-[11px]"
                        title="Abrir ventana completa de ajustes y opciones"
                      >
                        <Sliders className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">Ajustes</span>
                        <ExternalLink className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => handleToggleProcessStatus(pt.id, pt.status)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold flex items-center justify-center gap-1 cursor-pointer text-[10px]"
                      >
                        {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                        <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
                      </button>

                      <button
                        onClick={() => handleTriggerCycle(pt.id)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-1 cursor-pointer text-[10px] shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Disparar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: AGENTS & BACKGROUND INTUITIVE IMAGINATION GOVERNANCE */}
      {activeSubTab === 'agents_imagination' && (
        <div className="space-y-4 font-mono text-xs">
          {/* Header Banner */}
          <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <Wand2 className="w-4 h-4 text-purple-400" />
                Gobernanza de Imaginación en Segundo Plano por Agente
              </h2>
              <p className="text-[11px] text-slate-400">
                Enciende o apaga la imaginación activa en reposo, ajusta permisos, troncos de cómputo, cuotas de recursos, interconexiones y APIs para cada agente.
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedEditingAgent(null);
                setIsAgentEditorOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Agente</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(agentsList || []).map((ag) => {
              const isImagOn = ag.imagination_enabled !== false;
              return (
                <div
                  key={ag.id}
                  className={`p-5 rounded-3xl border transition-all shadow-xl space-y-4 flex flex-col justify-between ${
                    isImagOn
                      ? 'bg-gradient-to-br from-[#100c1e] via-[#0d1222] to-[#090e1a] border-purple-500/40 ring-1 ring-purple-500/20'
                      : 'bg-[#090b12] border-white/10 opacity-80'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-md"
                          style={{ backgroundColor: `${ag.color || '#00f0ff'}20`, borderColor: `${ag.color || '#00f0ff'}50` }}
                        >
                          <Brain className="w-5 h-5" style={{ color: ag.color || '#00f0ff' }} />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs flex items-center gap-2">
                            <span>{ag.name}</span>
                            {ag.is_custom && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                                Custom
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">{ag.role}</span>
                        </div>
                      </div>

                      {/* Main Background Imagination Toggle Button */}
                      <button
                        onClick={() => handleToggleAgentImaginationState(ag.id, isImagOn)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-md ${
                          isImagOn
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border border-purple-400 shadow-purple-500/25'
                            : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10'
                        }`}
                      >
                        <Wand2 className={`w-3.5 h-3.5 ${isImagOn ? 'text-white animate-pulse' : 'text-slate-500'}`} />
                        <span>{isImagOn ? '● IMAGINACIÓN ON' : '○ APAGADA'}</span>
                      </button>
                    </div>

                    {/* Permissions & Trunk Controls Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-slate-400 block text-[10px] uppercase">Nivel de Permisos de Ensueño:</span>
                        <select
                          value={ag.imagination_permission_level || 'auto_apply_safe'}
                          onChange={(e) => handleUpdateAgentImagConfig(ag.id, { imagination_permission_level: e.target.value })}
                          className="w-full bg-[#080b12] border border-white/10 rounded-lg p-1.5 text-white outline-none text-[11px]"
                        >
                          <option value="autonomous_sovereign">Soberano (Auto-Aplica Todo)</option>
                          <option value="auto_apply_safe">Seguro (Auto-Aplica Leves/Seguros)</option>
                          <option value="auto_apply_minor">Mínimo (Solo Cosméticos/Doc)</option>
                          <option value="always_ask">Siempre Preguntar</option>
                        </select>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-slate-400 block text-[10px] uppercase">Tronco de Cómputo:</span>
                        <select
                          value={ag.compute_trunk || 'trunk_a'}
                          onChange={(e) => handleUpdateAgentImagConfig(ag.id, { compute_trunk: e.target.value })}
                          className="w-full bg-[#080b12] border border-white/10 rounded-lg p-1.5 text-white outline-none text-[11px]"
                        >
                          <option value="trunk_a">Tronco A (Ensueño & Shaders 3D)</option>
                          <option value="trunk_b">Tronco B (Sensorial & Seguridad)</option>
                        </select>
                      </div>
                    </div>

                    {/* Resource Quotas Live Sliders */}
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Cuota de CPU Asignada:</span>
                        <span className="text-cyan-300 font-bold">{ag.cpu_quota_percent || 20}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="5"
                        value={ag.cpu_quota_percent || 20}
                        onChange={(e) => handleUpdateAgentImagConfig(ag.id, { cpu_quota_percent: parseInt(e.target.value) })}
                        className="w-full accent-cyan-400"
                      />

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-300">Límite de Memoria RAM:</span>
                        <span className="text-purple-300 font-bold">{ag.ram_limit_mb || 128} MB</span>
                      </div>
                      <input
                        type="range"
                        min="64"
                        max="512"
                        step="32"
                        value={ag.ram_limit_mb || 128}
                        onChange={(e) => handleUpdateAgentImagConfig(ag.id, { ram_limit_mb: parseInt(e.target.value) })}
                        className="w-full accent-purple-400"
                      />
                    </div>

                    {/* Personalities & Cerebros Badges */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 rounded-xl bg-black/40 border border-purple-500/20 space-y-1">
                        <span className="text-purple-300 font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          Personalidades Habilitadas:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(ag.used_personalities || [{ id: ag.id, name: ag.name.split(' ')[0], color: ag.color }]).map((p, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded border flex items-center gap-1"
                              style={{ backgroundColor: `${p.color || '#a855f7'}15`, borderColor: `${p.color || '#a855f7'}40`, color: p.color || '#a855f7' }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color || '#a855f7' }} />
                              <span>{p.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-black/40 border border-cyan-500/20 space-y-1">
                        <span className="text-cyan-300 font-bold flex items-center gap-1">
                          <Brain className="w-3 h-3 text-cyan-400" />
                          Cerebros & Memoria:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(ag.linked_cerebros || [{ id: 'brain_genesis', name: 'Génesis' }]).map((c, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                              {c.name?.split('//')[0] || c.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Interconnections Preview */}
                    {ag.interconnections && ag.interconnections.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1 text-[10px]">
                        <span className="text-slate-400 font-bold flex items-center gap-1">
                          <Layers className="w-3 h-3 text-cyan-400" />
                          Interconexiones con otros Agentes:
                        </span>
                        <div className="space-y-1">
                          {ag.interconnections.slice(0, 2).map((link, idx) => (
                            <div key={idx} className="flex items-center justify-between text-slate-300">
                              <span className="text-white font-bold">{link.target_agent_id}</span>
                              <span className="text-slate-400 truncate max-w-[200px]">{link.relationship}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedEditingAgent(ag);
                        setIsAgentEditorOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold flex items-center justify-center gap-1.5 border border-white/5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Configurar & Ramas</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedApiAgent(ag);
                        setIsAgentApiModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 text-cyan-300 font-bold flex items-center justify-center gap-1.5 border border-cyan-500/40 transition-colors cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>API Soberana</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE BRANCHES & PROPOSALS WITH TOGGLE AUTO-SYNC AND REQUESTS AUTHORIZATION */}
      {activeSubTab === 'branches' && (
        <div className="space-y-4 font-mono text-xs">
          {/* Top Counter & Auto-Sync Toggle Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/40 via-cyan-950/30 to-purple-950/20 border border-purple-500/40 shadow-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-base font-bold text-white font-display flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-purple-400" />
                  Propuestas de Imaginación Enlistadas
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold">
                  📌 {totalCount} Propuestas ({pendingCount} Requieren Autorización / {appliedCount} Aplicadas)
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono">
                Las propuestas seguras se ejecutan automáticamente si el modo auto-sync está encendido; las solicitudes de seguridad requieren tu permiso explícito.
              </p>
            </div>

            {/* Toggle Switch: Auto-Aplicación Multi-Agente en 2do Plano */}
            <div className="flex items-center gap-3 bg-black/60 p-2.5 rounded-2xl border border-white/10">
              <div className="text-right">
                <span className="text-xs font-bold text-white block">Auto-Aplicación Multi-Agente</span>
                <span className={`text-[10px] font-mono font-bold ${configForm.auto_sync_all_proposals_enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {configForm.auto_sync_all_proposals_enabled ? '⚡ ENCENDIDO' : '⏸️ APAGADO (Solo Enlistar)'}
                </span>
              </div>
              <button
                onClick={() => handleToggleAutoSyncAll(!configForm.auto_sync_all_proposals_enabled)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                  configForm.auto_sync_all_proposals_enabled ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-slate-700'
                }`}
                title="Alternar auto-aplicación en segundo plano"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    configForm.auto_sync_all_proposals_enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* DEDICATED SOLICITUDES DE AUTORIZACIÓN SECTION (PENDING APPROVALS) */}
          {pendingCount > 0 && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/40 via-[#1f150d] to-black/60 border border-amber-500/50 shadow-2xl shadow-amber-950/40 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      ⚠️ Solicitudes de Autorización Pendientes ({pendingCount})
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Cambios de arquitectura, optimizaciones mayores o mutaciones que requieren tu consentimiento.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleGrantAllRequests}
                  disabled={isApplyingAll}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-40"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>{isApplyingAll ? 'Concediendo Permisos...' : '✅ Conceder Permisos & Aplicar Todas'}</span>
                </button>
              </div>

              {/* Threshold Warning Banner if Paused */}
              {status?.is_paused_due_to_threshold && (
                <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 flex items-center gap-3 animate-pulse">
                  <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <div className="text-[11px]">
                    <b>🛑 Procesos de Imaginación Detenidos Preventivamente:</b> Se alcanzó el límite de solicitudes acumuladas ({pendingCount}/{configForm.max_accumulated_requests_threshold}). Autoriza o descarta propuestas para que el motor reanude sus ciclos automáticamente.
                  </div>
                </div>
              )}

              {/* Pending Requests List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {status?.branches?.filter(b => b.status === 'pending_approval' || b.requires_user_approval).map((reqItem) => (
                  <div
                    key={reqItem.id}
                    className="p-4 rounded-2xl bg-black/60 border border-amber-500/30 space-y-3 shadow-md flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-xs">{reqItem.theme}</span>
                        {getImportanceBadge(reqItem.importance_level)}
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <b>Hipótesis:</b> {reqItem.hypothesis}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleGrantSingleRequest(reqItem.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer text-[10px]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Conceder Permiso</span>
                        </button>

                        <button
                          onClick={() => openEditModal(reqItem, 'branch')}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold flex items-center gap-1 cursor-pointer text-[10px]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      </div>

                      <button
                        onClick={() => onAction(reqItem.id, 'branch', 'discard')}
                        className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-pointer"
                        title="Descartar solicitud"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proposals List */}
          <div className="space-y-3">
            {status?.branches?.map((branch) => (
              <div
                key={branch.id}
                className={`p-5 rounded-3xl border shadow-xl space-y-3 transition-all ${
                  branch.status === 'applied'
                    ? 'bg-[#081814] border-emerald-500/40 shadow-emerald-950/20'
                    : branch.requires_user_approval
                    ? 'bg-[#181110] border-amber-500/40 shadow-amber-950/20'
                    : 'bg-[#0c0f18] border-white/10'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    <GitBranch className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white text-sm">{branch.theme}</span>
                    
                    {getImportanceBadge(branch.importance_level)}

                    {branch.status === 'applied' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                        ✓ {branch.applied_by ? `Auto-Aplicado (${branch.applied_by})` : 'Aplicado en Exocórtex'}
                      </span>
                    ) : branch.requires_user_approval ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
                        ⏳ Requiere Aprobación
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
                      🔍 <b className="text-cyan-300">Síntesis:</b> {branch.insights}
                    </p>
                  )}
                </div>

                {/* Action Buttons: Aplicar, Editar, Descartar */}
                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {branch.status !== 'applied' && (
                      <button
                        onClick={() => onAction(branch.id, 'branch', 'apply')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Aplicar Mejora
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(branch, 'branch')}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>

                    <button
                      onClick={() => onAction(branch.id, 'branch', 'discard')}
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

      {/* TAB 3: PROACTIVE CREATIONS WITH TOP BANNER */}
      {activeSubTab === 'creations' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/40 via-cyan-950/30 to-purple-950/20 border border-purple-500/40 shadow-2xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white font-display">
                Creaciones Proactivas (Código ARM NEON, Shaders & Protocolos)
              </h2>
              <p className="text-[11px] text-slate-300 font-mono">
                Total: <b>{status?.creations?.length || 0} Creaciones</b> sintetizadas bajo cuantización 1.58b.
              </p>
            </div>
            <button
              onClick={handleApplyAll}
              disabled={isApplyingAll}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Aplicar Creaciones Pendientes</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {status?.creations?.map((item) => (
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
                    {getImportanceBadge(item.importance_level)}
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono inline-block">
                    {item.type}
                  </span>

                  <pre className="p-3 rounded-2xl bg-black/70 border border-white/5 text-[11px] font-mono text-cyan-200 overflow-x-auto max-h-36">
                    {item.content}
                  </pre>
                </div>

                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.status !== 'applied' && (
                      <button
                        onClick={() => onAction(item.id, 'creation', 'apply')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer text-xs"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Aplicar
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(item, 'creation')}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>

                    <button
                      onClick={() => onAction(item.id, 'creation', 'discard')}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/5 hover:border-rose-500/30 font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Descartar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PERMISSIONS & GLOBAL CONFIGURATION WITH CONCURRENCY, REQUEST THRESHOLDS & PER-PROCESS PERMISSION GRADUATIONS */}
      {activeSubTab === 'config' && (
        <form onSubmit={handleSaveGlobalConfig} className="space-y-6 font-mono text-xs max-w-4xl">
          {/* Section 1: Global Concurrency & Threshold Parameters */}
          <div className="p-6 rounded-3xl bg-[#0c0f18] border border-white/10 shadow-xl space-y-5">
            <h2 className="text-sm font-bold text-white font-display flex items-center gap-2 border-b border-white/10 pb-3">
              <Sliders className="w-4 h-4 text-purple-400" />
              Gobernanza de Procesos Simultáneos, Umbral de Solicitudes & Entropía
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Max Concurrent Processes Slider */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-300 font-bold">Procesos Máximos Simultáneos:</span>
                  <span className="text-cyan-400 font-bold">{configForm.max_concurrent_processes || 3} Procesos</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={configForm.max_concurrent_processes || 3}
                  onChange={(e) => setConfigForm({ ...configForm, max_concurrent_processes: parseInt(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
                <p className="text-[10px] text-slate-400">
                  Límite de ramas oníricas activas ejecutándose concurrentemente en segundo plano.
                </p>
              </div>

              {/* Max Accumulated Requests Threshold Slider */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-amber-300 font-bold">Solicitudes Máximas Acumulables (Auto-Pausa Global):</span>
                  <span className="text-amber-400 font-bold">{configForm.max_accumulated_requests_threshold || 5} Solicitudes</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={configForm.max_accumulated_requests_threshold || 5}
                  onChange={(e) => setConfigForm({ ...configForm, max_accumulated_requests_threshold: parseInt(e.target.value) })}
                  className="w-full accent-amber-400"
                />
                <p className="text-[10px] text-slate-400">
                  Si las solicitudes pendientes globales alcanzan este umbral, el motor detiene los procesos automáticamente.
                </p>
              </div>

              {/* Max Proposals per Agent / Process Accumulation Limit */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-purple-500/20 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-purple-300 font-bold">Máx. Propuestas Acumulables por Agente (Auto-Pausa):</span>
                  <span className="text-purple-400 font-bold">{configForm.max_proposals_per_agent_limit || 4} Propuestas</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={configForm.max_proposals_per_agent_limit || 4}
                  onChange={(e) => setConfigForm({ ...configForm, max_proposals_per_agent_limit: parseInt(e.target.value) })}
                  className="w-full accent-purple-400"
                />
                <p className="text-[10px] text-slate-400">
                  Límite máximo de propuestas sin revisar que cada agente puede acumular antes de pausarse para evitar saturación de memoria a largo plazo.
                </p>
              </div>

              {/* Auto Sync Toggle */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold text-xs">Auto-Aplicación Multi-Agente en Segundo Plano:</span>
                    <p className="text-[10px] text-slate-400">
                      Aplica automáticamente propuestas que no requieran autorización explícita.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${configForm.auto_sync_all_proposals_enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {configForm.auto_sync_all_proposals_enabled ? '⚡ ACTIVO' : '⏸️ PAUSADO'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfigForm({ ...configForm, auto_sync_all_proposals_enabled: !configForm.auto_sync_all_proposals_enabled })}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                        configForm.auto_sync_all_proposals_enabled ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        configForm.auto_sync_all_proposals_enabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Frecuencia de Ciclos (minutos):</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={configForm.cycle_frequency_minutes}
                  onChange={(e) => setConfigForm({ ...configForm, cycle_frequency_minutes: parseInt(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Nivel de Entropía Cuántica (0.1 - 1.0):</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="1.0"
                  value={configForm.quantum_entropy_level}
                  onChange={(e) => setConfigForm({ ...configForm, quantum_entropy_level: parseFloat(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Destino de Memoria & Bóveda:</label>
                <select
                  value={configForm.storage_target}
                  onChange={(e) => setConfigForm({ ...configForm, storage_target: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="local_vault">Bóveda Soberana Local (JSON + Markdown)</option>
                  <option value="starseed_graph">Grafo Sináptico StarSeed 1.58b</option>
                  <option value="openviking">OpenViking Hierarchical Store</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Reciclaje Automático:</label>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={configForm.auto_recycle_memories}
                    onChange={(e) => setConfigForm({ ...configForm, auto_recycle_memories: e.target.checked })}
                    className="w-4 h-4 accent-purple-400"
                  />
                  <span className="text-slate-300">Poda y compactación periódica de grafos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Graduaciones de Permisos para CADA Proceso Imaginativo */}
          <div className="p-6 rounded-3xl bg-[#0c0f18] border border-white/10 shadow-xl space-y-5">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Graduaciones de Permisos de Acceso & Modificación por Proceso
              </h2>
              <p className="text-[11px] text-slate-400">
                Ajusta individualmente qué nivel de libertad, auto-aplicación y notificaciones tiene cada tronco onírico.
              </p>
            </div>

            <div className="space-y-4">
              {(status?.process_types_catalog || processTypes).map((proc) => {
                const Icon = getProcessIcon(proc.icon);
                const policy = proc.permission_policy || { level: 'auto_apply_safe', notify_on_important: true, notify_on_security: true, auto_sync_agents: true };

                return (
                  <div
                    key={proc.id}
                    className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3 hover:border-white/15 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center border"
                          style={{ backgroundColor: `${proc.color}15`, borderColor: `${proc.color}40`, color: proc.color }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-xs">{proc.name}</h3>
                          <span className="text-[10px] text-slate-400">{proc.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-slate-400 font-bold">Nivel:</label>
                        <select
                          value={policy.level || 'auto_apply_safe'}
                          onChange={(e) => handleUpdateProcessPolicy(proc.id, { level: e.target.value })}
                          className="p-1.5 rounded-lg bg-black border border-white/10 text-white text-xs focus:outline-none focus:border-purple-400"
                        >
                          <option value="auto_apply_safe">🟢 Auto-Aplicar Seguro (Pregunta Cambios Críticos)</option>
                          <option value="auto_apply_minor">🟡 Auto-Aplicar Menor (Solo Docs/Notas)</option>
                          <option value="always_ask">🟠 Supervisión Total (Preguntar Siempre)</option>
                          <option value="autonomous_sovereign">🟣 Autónomo Soberano (Auto-Aplicar Todo)</option>
                        </select>
                      </div>
                    </div>

                    {/* Toggles & Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={policy.notify_on_important !== false}
                          onChange={(e) => handleUpdateProcessPolicy(proc.id, { notify_on_important: e.target.checked })}
                          className="accent-purple-400"
                        />
                        <span className="text-slate-300">Notificar Cambios Importantes</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={policy.notify_on_security !== false}
                          onChange={(e) => handleUpdateProcessPolicy(proc.id, { notify_on_security: e.target.checked })}
                          className="accent-amber-400"
                        />
                        <span className="text-slate-300">Notificar Cambios de Seguridad</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={policy.auto_sync_agents !== false}
                          onChange={(e) => handleUpdateProcessPolicy(proc.id, { auto_sync_agents: e.target.checked })}
                          className="accent-cyan-400"
                        />
                        <span className="text-slate-300">Sincronizar en 2do Plano</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/10">
              <button
                type="button"
                onClick={handleRecycleNow}
                disabled={isRecycling}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRecycling ? 'animate-spin' : ''}`} />
                <span>Compactar Memoria Ahora</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                Guardar Toda la Configuración
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SYNCHRONIZED MULTI-AGENT PROGRESS MODAL */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-[#0b0e17] border border-cyan-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-cyan-950/50 flex flex-col font-mono text-xs">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/50 via-cyan-950/30 to-transparent sticky top-0 z-10 bg-[#0b0e17]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Bot className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    Aplicación Sincronizada Multi-Agente en 2do Plano
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Hephaestus, Oneiros, Mnemosyne, Hermes & Athena colaborando en paralelo.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSyncModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-300 font-bold">Progreso Global de Aplicación:</span>
                  <span className="text-emerald-400 font-bold">{syncProgress?.progress_percent || (isApplyingAll ? 65 : 100)}%</span>
                </div>
                <div className="h-3 w-full bg-black/60 rounded-full border border-white/10 overflow-hidden p-0.5">
                  <div 
                    style={{ width: `${syncProgress?.progress_percent || (isApplyingAll ? 65 : 100)}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-300"
                  />
                </div>
              </div>

              {/* Sub-agents status cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { key: 'hephaestus', name: 'Hephaestus (Código)', area: 'Ingeniería ARM' },
                  { key: 'oneiros', name: 'Oneiros (Síntesis)', area: 'Shaders & UI' },
                  { key: 'mnemosyne', name: 'Mnemosyne (Memoria)', area: 'Grafos Sinápticos' },
                  { key: 'hermes', name: 'Hermes (Web Intel)', area: 'Tendencias & Docs' },
                  { key: 'athena', name: 'Athena (Sentinel)', area: 'Seguridad 360°' }
                ].map((ag) => {
                  const agData = syncProgress?.agent_progress?.[ag.key];
                  const taskCount = agData?.tasks || 1;
                  return (
                    <div key={ag.key} className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[11px]">{ag.name.split(' ')[0]}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      </div>
                      <span className="text-[10px] text-slate-400 block">{ag.area}</span>
                      <span className="text-[10px] text-cyan-300 font-bold block">{taskCount} tarea(s) completada(s)</span>
                    </div>
                  );
                })}
              </div>

              {/* Live console logs */}
              <div className="space-y-1">
                <span className="text-slate-400 font-bold block text-[11px]">Registro de Ejecución en Tiempo Real:</span>
                <div className="p-3 rounded-2xl bg-black/70 border border-white/10 max-h-48 overflow-y-auto space-y-1 text-[11px] text-slate-300">
                  {(syncProgress?.current_logs || [
                    '🚀 Iniciando aplicación sincronizada con agentes multi-área...',
                    '⚡ Hephaestus optimizando kernel ARM NEON...',
                    '⚡ Oneiros forjando shaders ciberdélicos...',
                    '⚡ Mnemosyne entrelazando nodos en la Bóveda Soberana...',
                    '✅ Sincronización exitosa. Todas las propuestas procesadas.'
                  ]).map((log, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-cyan-400 shrink-0">›</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-white/10 bg-black/40 flex justify-end sticky bottom-0 z-10">
              <button
                onClick={() => setSyncModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer"
              >
                Cerrar & Continuar en 2do Plano
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL WINDOW PROCESS DETAILS MODAL */}
      {processModal.isOpen && processModal.details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-[#0b0e17] border border-purple-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-950/50 flex flex-col font-mono text-xs">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between bg-gradient-to-r from-purple-950/40 via-cyan-950/20 to-transparent sticky top-0 z-10 bg-[#0b0e17]">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg"
                  style={{ backgroundColor: `${processModal.details.process?.color}20`, borderColor: `${processModal.details.process?.color}50`, color: processModal.details.process?.color }}
                >
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white font-display">
                    {processModal.details.process?.name}
                  </h2>
                  <p className="text-xs text-purple-300">
                    Ventana Completa // Historial, Ramas, Creaciones & Permisos
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setProcessModal({ isOpen: false, processId: null, details: null, activeTab: 'history' })}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="px-6 pt-3 flex gap-2 border-b border-white/10">
              {[
                { id: 'history', label: '📜 Historial de Ejecuciones', count: processModal.details.history?.length },
                { id: 'branches', label: '🌿 Ramas & Propuestas', count: processModal.details.branches?.length },
                { id: 'creations', label: '🎨 Creaciones & Código', count: processModal.details.creations?.length },
                { id: 'config', label: '⚙️ Permisos & Configuración' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setProcessModal({ ...processModal, activeTab: t.id })}
                  className={`px-4 py-2 border-b-2 font-bold cursor-pointer transition-all ${
                    processModal.activeTab === t.id
                      ? 'border-purple-400 text-purple-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label} {t.count !== undefined ? `(${t.count})` : ''}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {processModal.activeTab === 'history' && (
                <div className="space-y-3">
                  {processModal.details.history?.length === 0 ? (
                    <div className="text-slate-400 p-8 text-center bg-white/5 rounded-2xl">
                      No hay historial previo registrado para este proceso.
                    </div>
                  ) : (
                    processModal.details.history?.map((h, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{h.theme}</span>
                          <span className="text-[10px] text-slate-400">{h.formatted_time}</span>
                        </div>
                        <p className="text-slate-300">{h.hypothesis}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {processModal.activeTab === 'branches' && (
                <div className="space-y-3">
                  {processModal.details.branches?.map((b) => (
                    <div key={b.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{b.theme}</span>
                        {getImportanceBadge(b.importance_level)}
                      </div>
                      <p className="text-slate-300">{b.hypothesis}</p>
                    </div>
                  ))}
                </div>
              )}

              {processModal.activeTab === 'creations' && (
                <div className="space-y-3">
                  {processModal.details.creations?.map((c) => (
                    <div key={c.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                      <span className="font-bold text-white block">{c.title}</span>
                      <pre className="p-3 bg-black/70 rounded-xl text-cyan-300 max-h-40 overflow-x-auto">{c.content}</pre>
                    </div>
                  ))}
                </div>
              )}

              {processModal.activeTab === 'config' && (
                <div className="space-y-4 p-4 rounded-2xl bg-black/40 border border-white/10">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-bold block">Modo de Permisos Graduales:</label>
                    <select
                      value={processModal.details.permission_policy?.level || 'auto_apply_safe'}
                      onChange={(e) => handleUpdateProcessPermission(processModal.processId, e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-black/80 border border-white/10 text-white"
                    >
                      <option value="auto_apply_safe">Auto-Aceptar Seguras (Recomendado)</option>
                      <option value="auto_apply_minor">Auto-Aceptar Leves & Docs</option>
                      <option value="always_ask">Supervisión Total (Preguntar Siempre)</option>
                      <option value="autonomous_sovereign">Autónomo Soberano (Auto-Aplicar Todo)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-white/10 bg-black/40 flex justify-end sticky bottom-0 z-10">
              <button
                onClick={() => setProcessModal({ isOpen: false, processId: null, details: null, activeTab: 'history' })}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROPOSAL MODAL */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-[#0b0e17] border border-purple-500/40 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl shadow-purple-950/50 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" />
                Editar {editModal.itemType === 'branch' ? 'Rama / Propuesta' : 'Creación'}
              </h3>
              <button
                onClick={() => setEditModal({ isOpen: false, itemType: 'branch', data: null })}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editModal.itemType === 'branch' && (
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
              </div>
            )}

            {editModal.itemType === 'creation' && (
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
                  <label className="text-slate-400 block mb-1">Contenido:</label>
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
                onClick={() => setEditModal({ isOpen: false, itemType: 'branch', data: null })}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
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

      {/* UNIVERSAL DEVICE ACCESS MODAL */}
      <UniversalDeviceModal 
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
      />

      {/* DEDICATED PROCESS BRANCHES & PROGRESION MODAL */}
      <ProcessBranchesModal
        processId={selectedBranchesProcessId}
        isOpen={isBranchesModalOpen}
        onClose={() => setIsBranchesModalOpen(false)}
        onRefreshData={loadData}
      />

      {/* AGENT VAULT & SOVEREIGN API MODALS */}
      {isAgentEditorOpen && (
        <AgentEditorModal
          isOpen={isAgentEditorOpen}
          onClose={() => {
            setIsAgentEditorOpen(false);
            setSelectedEditingAgent(null);
          }}
          agent={selectedEditingAgent}
          onSave={handleSaveAgentData}
        />
      )}

      {isAgentApiModalOpen && selectedApiAgent && (
        <AgentApiManagerModal
          isOpen={isAgentApiModalOpen}
          onClose={() => {
            setIsAgentApiModalOpen(false);
            setSelectedApiAgent(null);
          }}
          agent={selectedApiAgent}
        />
      )}
    </div>
  );
}
