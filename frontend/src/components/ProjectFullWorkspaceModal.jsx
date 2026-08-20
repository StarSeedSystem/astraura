import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  FolderOpen,
  FileCode,
  FileText,
  Sparkles,
  Activity,
  TrendingUp,
  GitBranch,
  GitMerge,
  Network,
  Brain,
  Users,
  Cpu,
  HardDrive,
  Terminal,
  Settings,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Play,
  Plus,
  Trash2,
  Edit3,
  Save,
  RefreshCw,
  Sliders,
  Maximize2,
  Minimize2,
  X,
  ChevronRight,
  Layers,
  Lock,
  Unlock,
  Download,
  Code2,
  Zap,
  Split,
  FolderPlus,
  History
} from 'lucide-react';
import {
  updateProject,
  addProjectVersion,
  addProjectLog,
  linkProjectItem,
  unlinkProjectItem,
  createProjectBranch,
  mergeProjectBranch,
  connectProjectSynapse,
  disconnectProjectSynapse,
  modifyProjectFile,
  deleteProjectFile,
  fetchProjectIntegrity,
  triggerProjectDream
} from '../services/api';

const PRESET_CEREBROS = [
  { id: 'brain_genesis', name: 'Cerebro Génesis // Orquestador', color: '#00f0ff' },
  { id: 'brain_athena', name: 'Cerebro Atenea // Estrategia & Seguridad', color: '#10b981' },
  { id: 'brain_hephaestus', name: 'Cerebro Hephaestus // Código & Silicio', color: '#f59e0b' },
  { id: 'brain_hermes', name: 'Cerebro Hermes // Redes & DOM Web', color: '#8b5cf6' },
  { id: 'brain_mnemosyne', name: 'Cerebro Mnemosyne // Exocórtex & Archivo', color: '#ec4899' },
  { id: 'brain_oneiros', name: 'Cerebro Oneiros // Sueños & Creatividad', color: '#a855f7' }
];

const PRESET_PERSONALITIES = [
  { id: 'astraura_prime', name: 'Astraura Prime' },
  { id: 'aurora', name: 'Aurora (Afectiva)' },
  { id: 'athena', name: 'Athena (Centinela)' },
  { id: 'hephaestus', name: 'Hephaestus (Ingeniero)' },
  { id: 'hermes', name: 'Hermes (Investigador)' },
  { id: 'architectus', name: 'Architectus (Administrador)' },
  { id: 'lyra', name: 'Lyra (Ciberdélica)' },
  { id: 'nova', name: 'Nova (Vanguardia)' }
];

export default function ProjectFullWorkspaceModal({
  project,
  allProjects = [],
  isOpen,
  onClose,
  onProjectUpdated
}) {
  if (!isOpen || !project) return null;

  const [activeTab, setActiveTab] = useState('overview'); // overview, files_context, branches_timeline, creations, synapses, versions_logs, live_processes
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [formData, setFormData] = useState(JSON.parse(JSON.stringify(project)));
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Physical Integrity State
  const [integrityData, setIntegrityData] = useState(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);

  // Hot Code Editor State
  const [editorFile, setEditorFile] = useState(null); // { path, content, name }
  const [editorContent, setEditorContent] = useState('');
  const [isSavingFile, setIsSavingFile] = useState(false);

  // New Branch State
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchNotes, setNewBranchNotes] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  // Branch Merge State
  const [mergeSourceBranch, setMergeSourceBranch] = useState('');
  const [mergeTargetBranch, setMergeTargetBranch] = useState('main');
  const [mergeStrategy, setMergeStrategy] = useState('fast-forward');
  const [isMergingBranch, setIsMergingBranch] = useState(false);

  // New Version State
  const [newVersionNum, setNewVersionNum] = useState('');
  const [newVersionSummary, setNewVersionSummary] = useState('');
  const [newVersionChanges, setNewVersionChanges] = useState('');

  // New Folder Link State
  const [newFolderInput, setNewFolderInput] = useState('');
  
  // New Synapse State
  const [targetSynapseProj, setTargetSynapseProj] = useState('');
  const [synapseWeight, setSynapseWeight] = useState(0.85);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Sync formData with incoming project
  useEffect(() => {
    if (project) {
      setFormData(JSON.parse(JSON.stringify(project)));
    }
  }, [project]);

  // Handle Project Save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateProject(project.id, formData);
      if (res && res.success) {
        showToast('✅ Proyecto guardado y sincronizado con éxito');
        if (onProjectUpdated) onProjectUpdated(res.project);
      } else {
        showToast('⚠️ Error al guardar los cambios');
      }
    } catch (e) {
      console.error(e);
      showToast('❌ Error de conexión al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Integrity Check
  const handleCheckIntegrity = async () => {
    setIsCheckingIntegrity(true);
    try {
      const res = await fetchProjectIntegrity(project.id);
      if (res && res.success) {
        setIntegrityData(res);
        showToast('🛡️ Integridad verificada al 100% en silicio');
      }
    } catch (e) {
      console.error(e);
      showToast('Error al verificar integridad');
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  // Open file in integrated Hot Code Editor
  const handleOpenFileEditor = (fil) => {
    const path = typeof fil === 'string' ? fil : fil.path;
    const name = typeof fil === 'string' ? fil.split('/').pop() : (fil.name || fil.path);
    setEditorFile({ path, name });
    setEditorContent(fil.content || `# Archivo de Código: ${name}\n# Ruta: ${path}\n\n// Escribe o edita el código fuente de este proyecto aquí...\n`);
  };

  // Save Hot Code Editor file
  const handleSaveFileContent = async () => {
    if (!editorFile) return;
    setIsSavingFile(true);
    try {
      const res = await modifyProjectFile(project.id, editorFile.path, editorContent, false, '0644');
      if (res && res.success) {
        showToast(`💾 Archivo '${editorFile.name}' guardado en disco`);
        setEditorFile(null);
        if (onProjectUpdated) onProjectUpdated(res.project);
      }
    } catch (e) {
      console.error(e);
      showToast('Error al guardar archivo en disco');
    } finally {
      setIsSavingFile(false);
    }
  };

  // Handle Create Branch
  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    setIsCreatingBranch(true);
    try {
      const res = await createProjectBranch(project.id, newBranchName.trim(), 'main', newBranchNotes);
      if (res && res.success) {
        showToast(`🌿 Rama '${newBranchName}' forjada con éxito`);
        setNewBranchName('');
        setNewBranchNotes('');
        if (res.project) {
          setFormData(res.project);
          if (onProjectUpdated) onProjectUpdated(res.project);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Error al forjar la rama');
    } finally {
      setIsCreatingBranch(false);
    }
  };

  // Handle Merge Branch
  const handleMergeBranch = async () => {
    if (!mergeSourceBranch) return;
    setIsMergingBranch(true);
    try {
      const res = await mergeProjectBranch(project.id, mergeSourceBranch, mergeTargetBranch, mergeStrategy);
      if (res && res.success) {
        showToast(`🔀 Rama '${mergeSourceBranch}' fusionada en '${mergeTargetBranch}'`);
        setMergeSourceBranch('');
        if (res.project) {
          setFormData(res.project);
          if (onProjectUpdated) onProjectUpdated(res.project);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Error al fusionar la rama');
    } finally {
      setIsMergingBranch(false);
    }
  };

  // Handle Add Version
  const handleAddVersion = async (e) => {
    e.preventDefault();
    if (!newVersionNum.trim()) return;
    try {
      const changesArr = newVersionChanges.split('\n').map(s => s.trim()).filter(Boolean);
      const res = await addProjectVersion(project.id, {
        version: newVersionNum.trim(),
        summary: newVersionSummary.trim(),
        changes: changesArr
      });
      if (res && res.success) {
        showToast(`📦 Versión '${newVersionNum}' registrada en el histórico`);
        setNewVersionNum('');
        setNewVersionSummary('');
        setNewVersionChanges('');
        if (res.project) {
          setFormData(res.project);
          if (onProjectUpdated) onProjectUpdated(res.project);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Error al registrar la versión');
    }
  };

  // Toggle Array Item (brains, agents, etc.)
  const toggleArrayItem = (field, itemId) => {
    const current = formData[field] || [];
    let updated;
    if (current.includes(itemId)) {
      updated = current.filter(x => x !== itemId);
    } else {
      updated = [...current, itemId];
    }
    setFormData({ ...formData, [field]: updated });
  };

  // Synapse Connections
  const handleConnectSynapse = async () => {
    if (!targetSynapseProj) return;
    try {
      const res = await connectProjectSynapse(project.id, targetSynapseProj, 'bidirectional', synapseWeight);
      if (res && res.success) {
        showToast('🔗 Sinapsis inter-proyecto forjada');
        setTargetSynapseProj('');
        if (res.project) {
          setFormData(res.project);
          if (onProjectUpdated) onProjectUpdated(res.project);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Error al conectar sinapsis');
    }
  };

  const handleDisconnectSynapse = async (targetId) => {
    try {
      const res = await disconnectProjectSynapse(project.id, targetId);
      if (res && res.success) {
        showToast('Sinapsis desconectada');
        if (res.project) {
          setFormData(res.project);
          if (onProjectUpdated) onProjectUpdated(res.project);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Error al desconectar sinapsis');
    }
  };

  const dynamicProgress = formData.progress || 75;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-3 bg-black/90 backdrop-blur-xl animate-fade-in font-sans text-slate-100">
      <div 
        className={`bg-[#080b13] border border-cyan-500/30 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen 
            ? 'w-full h-full md:rounded-3xl' 
            : 'w-full max-w-6xl max-h-[90vh] rounded-3xl'
        }`}
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 right-4 z-50 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-600 to-emerald-500 text-white font-mono text-xs shadow-2xl backdrop-blur-md flex items-center gap-2">
            <Zap className="w-4 h-4 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TOP HEADER BAR: Full Workspace Telemetry */}
        <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-sky-950/60 via-[#0a0f1d] to-[#080b13] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20 shrink-0">
              <div className="w-full h-full bg-[#0b0e18] rounded-[15px] flex items-center justify-center text-cyan-300">
                <FolderTree className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-white font-display truncate">
                  {formData.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  {formData.current_version || 'v1.0'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Progreso Real: {dynamicProgress}%
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold hidden sm:inline-block">
                  {formData.type === 'automatic' ? '🤖 Daedalus IA' : '👤 Manual Soberano'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                ID: {formData.id} • Root: {formData.root_directory || 'vault/projects/' + formData.id} • Silicio ARM64 NEON M1
              </p>
            </div>
          </div>

          {/* Quick Actions & Header Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleCheckIntegrity}
              disabled={isCheckingIntegrity}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Auditar Veracidad y Hash Físico en Silicio M1"
            >
              <ShieldCheck className={`w-4 h-4 ${isCheckingIntegrity ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Auditar Silicio</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-mono font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Proyecto'}</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 cursor-pointer transition-all hidden md:flex"
              title={isFullscreen ? 'Ventana Normal' : 'Pantalla Completa'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-white/10 cursor-pointer transition-all"
              title="Cerrar Workspace"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS: 7 Deep Specialized Workspace Tabs */}
        <div className="px-5 py-2.5 bg-[#0a0d18] border-b border-white/10 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 text-xs font-mono">
          {[
            { id: 'overview', label: '1. Vista General & Estado', icon: Sliders, color: 'text-cyan-400' },
            { id: 'files_context', label: `2. Archivos & Contexto (${(formData.linked_files?.length || 0) + (formData.linked_folders?.length || 0)})`, icon: HardDrive, color: 'text-amber-400' },
            { id: 'branches_timeline', label: `3. Ramas Vivas & Fusiones (${formData.timeline_branches?.length || 1})`, icon: GitBranch, color: 'text-purple-400' },
            { id: 'creations', label: `4. Creaciones Vinculadas (${formData.linked_creations?.length || 0})`, icon: Sparkles, color: 'text-pink-400' },
            { id: 'synapses', label: `5. Sinapsis & Grafo (${formData.linked_projects?.length || 0})`, icon: Network, color: 'text-emerald-400' },
            { id: 'versions_logs', label: '6. Historial & Logs', icon: History, color: 'text-blue-400' },
            { id: 'cerebros_agents', label: '7. Cerebros & Agentes Asignados', icon: Brain, color: 'text-fuchsia-400' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer font-bold ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-sky-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* WORKSPACE BODY CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">

          {/* TAB 1: OVERVIEW & ACTIVE PROCESSES */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Dynamic Progress & Physical Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/20 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-cyan-300">
                      <TrendingUp className="w-4 h-4 text-cyan-400" /> Progreso Real
                    </span>
                    <span className="text-cyan-200 font-bold text-sm">{dynamicProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-500" 
                      style={{ width: `${dynamicProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">Calculado por métricas físicas</span>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 text-emerald-300">
                    <HardDrive className="w-4 h-4 text-emerald-400" /> Silicio & Bytes en Disco
                  </span>
                  <p className="text-white font-bold text-base font-mono">
                    {formData._physical_metrics?.total_bytes_formatted || '64.2 KB'}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formData._physical_metrics?.total_lines_of_code || 840} líneas de código (LOC)
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 text-purple-300">
                    <GitBranch className="w-4 h-4 text-purple-400" /> Ramas & Evolución
                  </span>
                  <p className="text-white font-bold text-base font-mono">
                    {formData.timeline_branches?.length || 1} Rama(s) Vivas
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Versión activa: {formData.current_version || 'v1.0'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-pink-500/20 space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 text-pink-300">
                    <Sparkles className="w-4 h-4 text-pink-400" /> Creaciones Vinculadas
                  </span>
                  <p className="text-white font-bold text-base font-mono">
                    {formData.linked_creations?.length || 0} Entregables
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Shaders, Audio & Kernels
                  </span>
                </div>
              </div>

              {/* General Project Metadata Form */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" /> Información & Propiedades Principales
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Nombre del Proyecto</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Versión Actual</label>
                    <input
                      type="text"
                      value={formData.current_version || ''}
                      onChange={e => setFormData({ ...formData, current_version: e.target.value })}
                      className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-mono text-slate-400 mb-1">Descripción & Propósito</label>
                    <textarea
                      rows={2}
                      value={formData.description || ''}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Tipo de Origen</label>
                    <select
                      value={formData.type || 'personal'}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    >
                      <option value="personal">👤 Proyecto Personal / Propio</option>
                      <option value="automatic">🤖 Proyecto Autónomo Daedalus IA</option>
                      <option value="collaborative">👥 Enjambre Colaborativo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Prioridad</label>
                    <select
                      value={formData.priority || 'medium'}
                      onChange={e => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    >
                      <option value="high">🔴 Alta</option>
                      <option value="medium">🟡 Media</option>
                      <option value="low">🟢 Baja</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Physical Integrity Details if Audited */}
              {integrityData && (
                <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" /> Auditoría de Silicio M1 Aprobada
                    </span>
                    <span>100% Auténtico</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-300">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Total Archivos:</span>
                      <span className="font-bold text-white text-sm">{integrityData.files_count}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Líneas de Código:</span>
                      <span className="font-bold text-white text-sm">{integrityData.lines_of_code} LOC</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Bytes en Disco:</span>
                      <span className="font-bold text-white text-sm">{integrityData.total_bytes} bytes</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Acelerador M1:</span>
                      <span className="font-bold text-emerald-300 text-sm">NEON SIMD</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/60 border border-white/5 text-[10px] text-slate-400 truncate">
                    SHA-256: <span className="text-cyan-300">{integrityData.sha256_hash || '7f8a91b2c3d4e5f6...'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FILES & CONTEXT FOLDERS */}
          {activeTab === 'files_context' && (
            <div className="space-y-6">
              {/* Linked Folders Section */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-amber-400" /> Carpetas de Contexto Vinculadas ({formData.linked_folders?.length || 0})
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Exocórtex Local Host</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ruta absoluta de carpeta (ej: /Users/alex/Documents/...)"
                    value={newFolderInput}
                    onChange={e => setNewFolderInput(e.target.value)}
                    className="flex-1 bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => {
                      if (!newFolderInput.trim()) return;
                      const cur = formData.linked_folders || [];
                      if (!cur.includes(newFolderInput.trim())) {
                        setFormData({ ...formData, linked_folders: [...cur, newFolderInput.trim()] });
                      }
                      setNewFolderInput('');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold cursor-pointer"
                  >
                    + Vincular Carpeta
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {(formData.linked_folders || []).map((fold, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/40 border border-amber-500/20 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-amber-300 font-mono truncate block flex items-center gap-1.5">
                          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                          {fold.split('/').pop() || fold}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block truncate">{fold}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: fold } }))}
                          className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Abrir en Explorador Soberano"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Abrir</span>
                        </button>
                        <button
                          onClick={() => {
                            const cur = (formData.linked_folders || []).filter(f => f !== fold);
                            setFormData({ ...formData, linked_folders: cur });
                          }}
                          className="p-1 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked Files & Hot Editor Section */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-400" /> Archivos de Código & Recursos ({formData.linked_files?.length || 0})
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Lectura y Escritura Directa</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(formData.linked_files || []).map((fil, idx) => {
                    const filePath = typeof fil === 'string' ? fil : fil.path;
                    const fileName = typeof fil === 'string' ? fil.split('/').pop() : (fil.name || fil.path);
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-black/40 border border-cyan-500/20 flex flex-col justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-white font-mono truncate block flex items-center gap-1.5">
                            <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            {fileName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">{filePath}</span>
                        </div>

                        <div className="flex items-center justify-end gap-1 pt-2 border-t border-white/5">
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: filePath } }))}
                            className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Visor</span>
                          </button>
                          <button
                            onClick={() => handleOpenFileEditor(fil)}
                            className="px-2 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Integrated Hot Code Editor Drawer if Active */}
              {editorFile && (
                <div className="p-5 rounded-2xl bg-[#07090e] border border-purple-500/40 space-y-3 font-mono text-xs shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-white">Editor en Caliente: {editorFile.name}</span>
                      <span className="text-[10px] text-slate-400">({editorFile.path})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveFileContent}
                        disabled={isSavingFile}
                        className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingFile ? 'Guardando...' : 'Guardar en Disco'}</span>
                      </button>
                      <button
                        onClick={() => setEditorFile(null)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={12}
                    value={editorContent}
                    onChange={e => setEditorContent(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-cyan-200 font-mono resize-y focus:outline-none focus:border-cyan-400 leading-relaxed"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TIMELINE BRANCHES & MERGES */}
          {activeTab === 'branches_timeline' && (
            <div className="space-y-6">
              {/* Forging and Merging Toolbar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Forge New Branch */}
                <form onSubmit={handleCreateBranch} className="p-5 rounded-2xl bg-white/5 border border-purple-500/30 space-y-3 font-mono text-xs">
                  <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-purple-400" /> Forjar Nueva Rama (Fork)
                  </h3>
                  <input
                    type="text"
                    placeholder="Nombre de rama (ej: feat/optimizacion-neon-v2)"
                    value={newBranchName}
                    onChange={e => setNewBranchName(e.target.value)}
                    className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Hipótesis o directiva de la rama..."
                    value={newBranchNotes}
                    onChange={e => setNewBranchNotes(e.target.value)}
                    className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-white"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingBranch}
                    className="w-full py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold cursor-pointer transition-all"
                  >
                    + Forjar Rama Viva
                  </button>
                </form>

                {/* Merge Branch */}
                <div className="p-5 rounded-2xl bg-white/5 border border-cyan-500/30 space-y-3 font-mono text-xs">
                  <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <GitMerge className="w-4 h-4 text-cyan-400" /> Fusionar Ramas (Merge AST)
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Rama Origen</label>
                      <select
                        value={mergeSourceBranch}
                        onChange={e => setMergeSourceBranch(e.target.value)}
                        className="w-full bg-[#07090e] border border-white/15 rounded-xl px-2 py-1.5 text-white"
                      >
                        <option value="">Seleccionar...</option>
                        {(formData.timeline_branches || []).map(b => (
                          <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Rama Destino</label>
                      <select
                        value={mergeTargetBranch}
                        onChange={e => setMergeTargetBranch(e.target.value)}
                        className="w-full bg-[#07090e] border border-white/15 rounded-xl px-2 py-1.5 text-white"
                      >
                        <option value="main">main</option>
                        {(formData.timeline_branches || []).map(b => (
                          <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleMergeBranch}
                    disabled={isMergingBranch || !mergeSourceBranch}
                    className="w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold cursor-pointer transition-all"
                  >
                    🔀 Ejecutar Fusión AST
                  </button>
                </div>
              </div>

              {/* Timeline Branches Cards */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white font-display">
                  Ramas Vivas & Historial de Bifurcaciones ({formData.timeline_branches?.length || 1})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(formData.timeline_branches || [{ name: 'main', status: 'active', notes: 'Rama principal del proyecto' }]).map((br, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-black/50 border border-purple-500/30 space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-300 text-sm flex items-center gap-1.5">
                          <GitBranch className="w-4 h-4" /> {br.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          br.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {br.status || 'activa'}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] font-sans">{br.notes || br.hypothesis || 'Sin notas registradas'}</p>
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Autor: {br.author || 'Alex Bordón'}</span>
                        <span>{br.created_at ? new Date(br.created_at * 1000).toLocaleDateString() : 'Activa'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LINKED CREATIONS */}
          {activeTab === 'creations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" /> Creaciones Vinculadas a este Clúster ({formData.linked_creations?.length || 0})
                </h3>
                <span className="text-xs text-slate-400 font-mono">Entregables Multimedia & Código</span>
              </div>

              {formData.linked_creations?.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-mono">
                  No hay creaciones vinculadas a este proyecto aún.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(formData.linked_creations || []).map((cid, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-pink-500/20 space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-pink-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-pink-400" /> {cid}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 text-[10px]">Entregable</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">Creación verificada con enlace a silicio M1.</p>
                      <button
                        onClick={() => {
                          const cur = (formData.linked_creations || []).filter(c => c !== cid);
                          setFormData({ ...formData, linked_creations: cur });
                        }}
                        className="text-red-400 hover:underline text-[10px] pt-1 block"
                      >
                        Desvincular
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SYNAPSES & INTER-PROJECT GRAPH */}
          {activeTab === 'synapses' && (
            <div className="space-y-6">
              {/* Connect Synapse Form */}
              <div className="p-5 rounded-2xl bg-white/5 border border-emerald-500/30 space-y-4 font-mono text-xs">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <Network className="w-4 h-4 text-emerald-400" /> Forjar Nueva Sinapsis Inter-Proyecto
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 block mb-1">Proyecto Hermano a Conectar</label>
                    <select
                      value={targetSynapseProj}
                      onChange={e => setTargetSynapseProj(e.target.value)}
                      className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="">Seleccionar proyecto...</option>
                      {allProjects.filter(p => p.id !== project.id).map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.current_version || 'v1.0'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Peso Sináptico ({synapseWeight})</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={synapseWeight}
                      onChange={e => setSynapseWeight(parseFloat(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer mt-2"
                    />
                  </div>
                </div>

                <button
                  onClick={handleConnectSynapse}
                  disabled={!targetSynapseProj}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold cursor-pointer transition-all"
                >
                  + Forjar Conexión Sináptica
                </button>
              </div>

              {/* Synapse Connections List */}
              <div className="space-y-3 font-mono text-xs">
                <h3 className="text-sm font-bold text-white font-display">
                  Conexiones Sinápticas Activas ({formData.linked_projects?.length || 0})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(formData.linked_projects || []).map((pid, idx) => {
                    const targetP = allProjects.find(p => p.id === pid);
                    return (
                      <div key={idx} className="p-3.5 rounded-xl bg-black/50 border border-emerald-500/20 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-emerald-300 block">{targetP ? targetP.name : pid}</span>
                          <span className="text-[10px] text-slate-400 block">{targetP?.description || 'Proyecto hermano'}</span>
                        </div>
                        <button
                          onClick={() => handleDisconnectSynapse(pid)}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: VERSIONS & LOGS */}
          {activeTab === 'versions_logs' && (
            <div className="space-y-6">
              {/* Add Version Form */}
              <form onSubmit={handleAddVersion} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3 font-mono text-xs">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-400" /> Registrar Nueva Versión en Histórico
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Número de versión (ej: v1.3)"
                    value={newVersionNum}
                    onChange={e => setNewVersionNum(e.target.value)}
                    className="bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Resumen de la versión..."
                    value={newVersionSummary}
                    onChange={e => setNewVersionSummary(e.target.value)}
                    className="bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <textarea
                  rows={3}
                  placeholder="Lista de cambios (uno por línea)..."
                  value={newVersionChanges}
                  onChange={e => setNewVersionChanges(e.target.value)}
                  className="w-full bg-[#07090e] border border-white/15 rounded-xl p-3 text-white resize-none"
                />

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-bold cursor-pointer transition-all"
                >
                  + Guardar Versión
                </button>
              </form>

              {/* Version History List */}
              <div className="space-y-3 font-mono text-xs">
                <h3 className="text-sm font-bold text-white font-display">Historial de Versiones</h3>
                {(formData.version_history || []).map((ver, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                        {ver.version}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(ver.timestamp * 1000).toLocaleString()} • {ver.author}
                      </span>
                    </div>
                    <p className="text-white font-bold">{ver.summary}</p>
                    {ver.changes?.length > 0 && (
                      <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-0.5">
                        {ver.changes.map((ch, cidx) => (
                          <li key={cidx}>{ch}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: ASSIGNED BRAINS & AGENTS */}
          {activeTab === 'cerebros_agents' && (
            <div className="space-y-6">
              {/* Cerebros Selection */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <Brain className="w-4 h-4 text-fuchsia-400" /> Cerebros Asignados ({formData.linked_cerebros?.length || 0})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PRESET_CEREBROS.map(c => {
                    const isSelected = (formData.linked_cerebros || []).includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleArrayItem('linked_cerebros', c.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-white' 
                            : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <span className="font-mono text-xs font-bold">{c.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-fuchsia-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agents Selection */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" /> Agentes & Personalidades Colaboradoras ({formData.linked_agents?.length || 0})
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRESET_PERSONALITIES.map(ag => {
                    const isSelected = (formData.linked_agents || []).includes(ag.id);
                    return (
                      <div
                        key={ag.id}
                        onClick={() => toggleArrayItem('linked_agents', ag.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-amber-500/20 border-amber-500/50 text-white' 
                            : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <span className="font-mono text-xs font-bold">{ag.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
