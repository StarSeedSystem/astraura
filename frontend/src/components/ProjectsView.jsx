import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  FolderSync,
  Plus,
  Activity,
  Layers,
  GitBranch,
  Settings,
  MoreVertical,
  Terminal,
  Zap,
  Box,
  BrainCircuit,
  Network,
  Users,
  Sparkles,
  Play,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  HardDrive,
  FileText,
  FileCode,
  Sliders,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  FolderTree,
  Brain,
  MessageSquare,
  History,
  Tag,
  ArrowUpRight,
  Folder,
  FolderPlus,
  FolderCheck,
  Check,
  ExternalLink,
  Eye,
  File,
  GitMerge,
  ShieldAlert,
  Lock,
  Unlock,
  Download,
  Search,
  Share2,
  Code2,
  Cpu,
  TrendingUp,
  Maximize2
} from 'lucide-react';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  addProjectVersion,
  addProjectLog,
  linkProjectItem,
  unlinkProjectItem,
  triggerProjectDream,
  fetchProjectIntegrity,
  createProjectBranch,
  mergeProjectBranch,
  connectProjectSynapse,
  disconnectProjectSynapse,
  modifyProjectFile,
  deleteProjectFile,
  applyProjectProposal,
  fetchProjectMasterAgentStatus,
  updateProjectMasterAgentConfig,
  runProjectMasterAgentCycle,
  applyProjectMasterAgentProposal,
  autoOrganizeProjectsVault
} from '../services/api';
import CreationsView from './CreationsView';
import ProjectFullWorkspaceModal from './ProjectFullWorkspaceModal';
import SynthesisReportModal from './SynthesisReportModal';

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
  { id: 'lyra', name: 'Lyra (Ciberdélica)' },
  { id: 'nova', name: 'Nova (Vanguardia)' }
];

const PRESET_AGENTS = [
  { id: 'daedalus', name: 'Daedalus-Architect', defaultRole: 'Gobernanza & Topología' },
  { id: 'agent_genesis_orchestrator', name: 'Génesis Orquestador', defaultRole: 'Coordinación 1.58b' },
  { id: 'agent_hephaestus_forger', name: 'Hephaestus Forjador', defaultRole: 'Compilación ARM NEON' },
  { id: 'agent_oneiros_dreamer', name: 'Oneiros Soñador', defaultRole: 'Procesos Imaginativos' },
  { id: 'agent_mnemosyne_archivist', name: 'Mnemosyne Archivera', defaultRole: 'Memoria & Archivo' },
  { id: 'agent_hermes_messenger', name: 'Hermes Mensajero', defaultRole: 'Audio & Telemetría' }
];

export default function ProjectsView() {
  // Main Top-Level Tab: 'projects' (Projects Vault), 'creations' (Creations & Evolution), 'topology' (Network Graph)
  const [mainTab, setMainTab] = useState('projects');
  
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [activeProjectFilter, setActiveProjectFilter] = useState('all'); // 'all', 'personal', 'automatic'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('progress'); // 'progress', 'activity', 'loc', 'name'
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list'

  // Full Workspace Window State
  const [isFullWorkspaceOpen, setIsFullWorkspaceOpen] = useState(false);
  const [selectedFullWorkspaceProject, setSelectedFullWorkspaceProject] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Selected project for detailed Full Editor Modal / Drawer
  const [selectedProject, setSelectedProject] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState('general'); 
  // 'general', 'cerebros_memories', 'agents_personalities', 'processes_branches', 'versions', 'folders_files', 'graph_connections', 'creations_proposals', 'logs'
  
  // Physical Integrity Modal State
  const [integrityModal, setIntegrityModal] = useState({
    isOpen: false,
    isLoading: false,
    data: null,
    projectName: ''
  });

  // Create Project Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: '',
    type: 'personal',
    priority: 'medium',
    status: 'active'
  });

  // Project Editor Form State (Deep Clone of selectedProject)
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Quick Dream Trigger State
  const [isDreamingForProject, setIsDreamingForProject] = useState(false);
  const [dreamThemeInput, setDreamThemeInput] = useState('');
  
  // New Version Form State
  const [newVersionForm, setNewVersionForm] = useState({
    version: '',
    summary: '',
    changes: ''
  });

  // New Branch Form State
  const [newBranchForm, setNewBranchForm] = useState({
    name: '',
    origin_branch: 'main',
    notes: ''
  });
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  // New File Form State
  const [newFileModal, setNewFileModal] = useState({
    isOpen: false,
    filePath: '',
    content: '',
    isBinary: false,
    permissionsMode: '0644'
  });

  // New Key Memory Form State
  const [newKeyMemoryInput, setNewKeyMemoryInput] = useState('');

  // New Folder Link State
  const [newFolderInput, setNewFolderInput] = useState('');

  // Project Master Agent (Architectus) State
  const [agentStatus, setAgentStatus] = useState(null);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [isAgentConfigModalOpen, setIsAgentConfigModalOpen] = useState(false);
  const [agentConfigForm, setAgentConfigForm] = useState({
    autonomy_level: 'supervised',
    auto_scaffold_new_projects: true,
    auto_link_orphan_creations: true,
    auto_rebalance_synapses: true,
    cycle_frequency_minutes: 12,
    allocated_cpu_percent: 25,
    hardware_threads: 4
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadAgentStatus = async () => {
    try {
      const res = await fetchProjectMasterAgentStatus();
      if (res && res.success) {
        setAgentStatus(res);
        if (res.config) setAgentConfigForm(res.config);
      }
    } catch (e) {
      console.error('Error fetching Project Master Agent status:', e);
    }
  };

  const handleRunAgentCycle = async () => {
    setIsAgentRunning(true);
    try {
      const res = await runProjectMasterAgentCycle('manual_ui');
      if (res && res.success) {
        showToast(`🌿 Ciclo completado: ${res.proposals_generated?.length || 0} propuestas forjadas.`);
        await loadProjects();
        await loadAgentStatus();
      }
    } catch (e) {
      console.error('Error running agent cycle:', e);
      showToast('Error al ejecutar ciclo de Architectus');
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleAutoOrganizeVault = async () => {
    setIsAgentRunning(true);
    try {
      const res = await autoOrganizeProjectsVault();
      if (res && res.success) {
        showToast(`⚡ Bóveda organizada: ${res.projects_updated} proyectos, ${res.synapses_forged} sinapsis forjadas.`);
        await loadProjects();
        await loadAgentStatus();
      }
    } catch (e) {
      console.error('Error auto-organizing vault:', e);
      showToast('Error al auto-organizar la bóveda');
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleApplyAgentProposal = async (proposalId) => {
    try {
      const res = await applyProjectMasterAgentProposal(proposalId);
      if (res && res.success) {
        showToast('✨ Propuesta arquitectónica aprobada e incorporada a la Bóveda');
        await loadProjects();
        await loadAgentStatus();
      }
    } catch (e) {
      console.error('Error applying proposal:', e);
      showToast('Error al aplicar la propuesta');
    }
  };

  const handleSaveAgentConfig = async () => {
    try {
      const res = await updateProjectMasterAgentConfig(agentConfigForm);
      if (res && res.success) {
        showToast('Ajustes de Architectus guardados');
        setIsAgentConfigModalOpen(false);
        await loadAgentStatus();
      }
    } catch (e) {
      console.error('Error saving agent config:', e);
      showToast('Error al guardar configuración');
    }
  };

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetchProjects();
      if (res && res.projects) {
        setProjects(res.projects);
        if (selectedProject) {
          const fresh = res.projects.find(p => p.id === selectedProject.id);
          if (fresh) {
            setSelectedProject(fresh);
            setEditForm(JSON.parse(JSON.stringify(fresh)));
          }
        }
      }
    } catch (e) {
      console.error('Error fetching projects:', e);
      showToast('Error al cargar la bóveda de proyectos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    loadAgentStatus();
  }, []);

  const openProjectFullWorkspace = (project) => {
    setSelectedFullWorkspaceProject(project);
    setIsFullWorkspaceOpen(true);
  };

  const openProjectEditor = (project, initialTab = 'general') => {
    setSelectedProject(project);
    setEditForm(JSON.parse(JSON.stringify(project)));
    setEditorTab(initialTab);
    setIsEditorOpen(true);
  };

  const handleInspectIntegrity = async (project) => {
    setIntegrityModal({
      isOpen: true,
      isLoading: true,
      data: null,
      projectName: project.name
    });
    try {
      const res = await fetchProjectIntegrity(project.id);
      setIntegrityModal({
        isOpen: true,
        isLoading: false,
        data: res,
        projectName: project.name
      });
    } catch (err) {
      setIntegrityModal({
        isOpen: true,
        isLoading: false,
        data: { success: false, error: err.message },
        projectName: project.name
      });
    }
  };

  const handleSaveProjectEdits = async (e) => {
    if (e) e.preventDefault();
    if (!selectedProject || !editForm.name.trim()) return;

    try {
      setIsSaving(true);
      const res = await updateProject(selectedProject.id, editForm);
      if (res && res.success) {
        showToast(`✅ Proyecto '${editForm.name}' actualizado y sincronizado en el grafo`);
        await loadProjects();
      } else {
        showToast('Error al actualizar el proyecto');
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Error de red al guardar modificaciones');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    if (!window.confirm(`¿Estás seguro de eliminar el proyecto '${projectName}'? Esta acción desvinculará sus nodos.`)) {
      return;
    }

    try {
      const res = await deleteProject(projectId);
      if (res && res.success) {
        showToast(`🗑️ Proyecto '${projectName}' eliminado`);
        if (selectedProject?.id === projectId) {
          setIsEditorOpen(false);
          setSelectedProject(null);
        }
        await loadProjects();
      } else {
        showToast('Error al eliminar proyecto');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Error de red al eliminar');
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectForm.name.trim()) {
      showToast('El nombre del proyecto es obligatorio');
      return;
    }
    
    try {
      const res = await createProject(
        newProjectForm.name,
        newProjectForm.description,
        newProjectForm.type,
        {
          priority: newProjectForm.priority,
          status: newProjectForm.status
        }
      );
      if (res && res.success) {
        showToast(`📁 Proyecto '${res.project.name}' forjado y enlazado`);
        setIsCreateModalOpen(false);
        setNewProjectForm({ name: '', description: '', type: 'personal', priority: 'medium', status: 'active' });
        await loadProjects();
      } else {
        showToast('Error al crear proyecto');
      }
    } catch (err) {
      console.error('Create error:', err);
      showToast('Error de red al crear proyecto');
    }
  };

  const handleTriggerDreamForProject = async (projectId, projectName) => {
    try {
      setIsDreamingForProject(true);
      showToast(`🌌 Disparando proceso onírico con propósito para '${projectName}'...`);
      const res = await triggerProjectDream(
        dreamThemeInput.trim() || `Desarrollo y síntesis cognitiva para ${projectName}`,
        'code_self_reflection_opt',
        projectId
      );
      if (res && res.success) {
        showToast(`✨ Proceso onírico '${res.branch?.theme || projectName}' completado y registrado`);
        setDreamThemeInput('');
        await loadProjects();
      } else {
        showToast('Error al disparar proceso imaginativo');
      }
    } catch (err) {
      console.error('Dream error:', err);
      showToast('Error de red en ciclo onírico');
    } finally {
      setIsDreamingForProject(false);
    }
  };

  const handleCreateBranchSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject || !newBranchForm.name.trim()) return;

    try {
      setIsCreatingBranch(true);
      const res = await createProjectBranch(
        selectedProject.id,
        newBranchForm.name.trim(),
        newBranchForm.origin_branch || 'main',
        newBranchForm.notes.trim(),
        'Alex Bordón'
      );
      if (res && res.success) {
        showToast(`🌿 Rama '${res.branch.name}' creada exitosamente`);
        setNewBranchForm({ name: '', origin_branch: 'main', notes: '' });
        await loadProjects();
      }
    } catch (err) {
      showToast(`Error creando rama: ${err.message}`);
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleMergeBranch = async (sourceBranchName) => {
    if (!window.confirm(`¿Fusionar rama '${sourceBranchName}' en 'main'? Se creará una nueva versión del proyecto.`)) return;

    try {
      const res = await mergeProjectBranch(
        selectedProject.id,
        sourceBranchName,
        'main',
        'fast-forward',
        'Alex Bordón'
      );
      if (res && res.success) {
        showToast(`✅ Rama '${sourceBranchName}' fusionada con éxito (Nueva versión: ${res.new_version})`);
        await loadProjects();
      }
    } catch (err) {
      showToast(`Error fusionando rama: ${err.message}`);
    }
  };

  const handleToggleSynapse = async (targetProjectId) => {
    if (!selectedProject) return;
    const isCurrentlyConnected = (editForm.linked_projects || []).includes(targetProjectId);

    try {
      if (isCurrentlyConnected) {
        await disconnectProjectSynapse(selectedProject.id, targetProjectId);
        showToast(`Sinapsis con proyecto desvinculada`);
      } else {
        await connectProjectSynapse(selectedProject.id, targetProjectId, 'bidirectional', 0.88, 'Conexión sináptica forjada desde panel.');
        showToast(`🔗 Sinapsis cognitiva establecida`);
      }
      await loadProjects();
    } catch (err) {
      showToast(`Error modificando sinapsis: ${err.message}`);
    }
  };

  const handleWriteProjectFileSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject || !newFileModal.filePath.trim()) return;

    try {
      const res = await modifyProjectFile(
        selectedProject.id,
        newFileModal.filePath.trim(),
        newFileModal.content,
        newFileModal.isBinary,
        newFileModal.permissionsMode || '0644'
      );
      if (res && res.success) {
        showToast(`📄 Archivo '${newFileModal.filePath}' escrito a disco (SHA-256: ${res.sha256.slice(0, 8)}...)`);
        setNewFileModal({ isOpen: false, filePath: '', content: '', isBinary: false, permissionsMode: '0644' });
        await loadProjects();
      } else {
        showToast(`Error: ${res.error || 'No se pudo escribir archivo'}`);
      }
    } catch (err) {
      showToast(`Error escribiendo archivo: ${err.message}`);
    }
  };

  const handleDeleteProjectFile = async (filePath, physicalDelete = false) => {
    if (!window.confirm(`¿Desvincular archivo '${filePath}'? ${physicalDelete ? '(Se eliminará físicamente del disco)' : ''}`)) return;

    try {
      const res = await deleteProjectFile(selectedProject.id, filePath, physicalDelete);
      if (res && res.success) {
        showToast(`Archivo desvinculado con éxito`);
        await loadProjects();
      }
    } catch (err) {
      showToast(`Error eliminando archivo: ${err.message}`);
    }
  };

  const handleApplyProposalToProject = async (proposal) => {
    if (!selectedProject) return;

    try {
      const res = await applyProjectProposal(selectedProject.id, proposal);
      if (res && res.success) {
        showToast(`🚀 Propuesta asimilada y escrita en '${selectedProject.name}' (Versión: ${res.new_version})`);
        await loadProjects();
      }
    } catch (err) {
      showToast(`Error aplicando propuesta: ${err.message}`);
    }
  };

  const handleAddVersionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject || !newVersionForm.summary.trim()) return;

    try {
      const changesArr = newVersionForm.changes
        ? newVersionForm.changes.split('\n').filter(c => c.trim())
        : ['Modificación de parámetros y optimización de dependencias'];

      const res = await addProjectVersion(selectedProject.id, {
        version: newVersionForm.version.trim() || undefined,
        summary: newVersionForm.summary.trim(),
        changes: changesArr,
        author: 'Alex Bordón'
      });

      if (res && res.success) {
        showToast(`🌿 Nueva versión registrada en el proyecto`);
        setNewVersionForm({ version: '', summary: '', changes: '' });
        await loadProjects();
      }
    } catch (err) {
      console.error('Version error:', err);
      showToast('Error al añadir versión');
    }
  };

  const handleAddKeyMemory = () => {
    if (!newKeyMemoryInput.trim()) return;
    const current = editForm.key_memories || [];
    setEditForm({
      ...editForm,
      key_memories: [newKeyMemoryInput.trim(), ...current]
    });
    setNewKeyMemoryInput('');
  };

  const handleRemoveKeyMemory = (index) => {
    const current = [...(editForm.key_memories || [])];
    current.splice(index, 1);
    setEditForm({ ...editForm, key_memories: current });
  };

  const handleAddFolder = () => {
    if (!newFolderInput.trim()) return;
    const current = editForm.linked_folders || [];
    if (!current.includes(newFolderInput.trim())) {
      setEditForm({
        ...editForm,
        linked_folders: [...current, newFolderInput.trim()]
      });
    }
    setNewFolderInput('');
  };

  const handleRemoveFolder = (folderPath) => {
    const current = (editForm.linked_folders || []).filter(f => f !== folderPath);
    setEditForm({ ...editForm, linked_folders: current });
  };

  const toggleArrayItem = (field, itemId) => {
    const current = editForm[field] || [];
    let updated;
    if (current.includes(itemId)) {
      updated = current.filter(x => x !== itemId);
    } else {
      updated = [...current, itemId];
    }
    setEditForm({ ...editForm, [field]: updated });
  };

  const filteredProjects = projects
    .filter(p => {
      // Type filter
      if (activeProjectFilter !== 'all' && p.type !== activeProjectFilter) return false;
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = (p.name || '').toLowerCase().includes(q);
        const inDesc = (p.description || '').toLowerCase().includes(q);
        const inAgents = (p.linked_agents || []).some(ag => ag.toLowerCase().includes(q));
        const inFolders = (p.linked_folders || []).some(f => f.toLowerCase().includes(q));
        const inFiles = (p.linked_files || []).some(f => (typeof f === 'string' ? f : f.name || f.path || '').toLowerCase().includes(q));
        if (!inName && !inDesc && !inAgents && !inFolders && !inFiles) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'progress') {
        return (b.progress || 0) - (a.progress || 0);
      }
      if (sortBy === 'loc') {
        const locA = a._physical_metrics?.total_lines_of_code || 0;
        const locB = b._physical_metrics?.total_lines_of_code || 0;
        return locB - locA;
      }
      if (sortBy === 'activity') {
        const timeA = a.updated_at || a.created_at || 0;
        const timeB = b.updated_at || b.created_at || 0;
        return timeB - timeA;
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

  const totalGlobalLOC = projects.reduce((acc, p) => acc + (p._physical_metrics?.total_lines_of_code || 0), 0);
  const totalGlobalBranches = projects.reduce((acc, p) => acc + (p.timeline_branches?.length || 1), 0);
  const totalGlobalSynapses = projects.reduce((acc, p) => acc + (p.linked_projects?.length || 0), 0);
  const totalGlobalCreations = projects.reduce((acc, p) => acc + (p.linked_creations?.length || 0), 0);

  return (
    <div className="flex flex-col h-full bg-[#07090e] text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/90 via-purple-600/90 to-emerald-500/90 text-white font-mono text-xs shadow-2xl backdrop-blur-md border border-white/20 animate-fade-in flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-200 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <header className="p-3 sm:p-4 bg-[#0a0d16]/95 border-b border-white/10 flex-shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-emerald-500 to-purple-500 p-[1px] shadow-lg shadow-emerald-500/20 shrink-0">
            <div className="w-full h-full bg-[#0b0e18] rounded-[11px] flex items-center justify-center">
              <FolderTree className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-bold text-base sm:text-lg text-white tracking-wide">
                Bóveda Soberana de Proyectos // StarSeed OS
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                100% Offline • M1 Silicio
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 line-clamp-1">
              Organiza desarrollos propios y proyectos autónomos de Daedalus con sinapsis 3D, ramas vivas y control total de archivos.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-sky-500/20 hover:from-purple-500/30 hover:to-sky-500/30 text-cyan-200 border border-cyan-400/50 text-xs font-mono font-bold flex items-center gap-1.5 shadow-md shadow-cyan-950/30 transition-all cursor-pointer"
            title="Abrir Informe de Síntesis del Usuario & Historial de Procesos Completados y Próximos"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span>📜 Informes de Síntesis</span>
          </button>

          <button
            onClick={() => loadProjects()}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Recargar Proyectos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black text-xs font-mono font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Tabs (5 Deep Tabs) */}
      <div className="px-4 py-2 bg-[#080b13] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5">
          <button
            onClick={() => setMainTab('projects')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mainTab === 'projects'
                ? 'bg-gradient-to-r from-cyan-500/25 to-emerald-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span>1. Proyectos & Ramas ({projects.length})</span>
          </button>

          <button
            onClick={() => setMainTab('creations')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mainTab === 'creations'
                ? 'bg-gradient-to-r from-pink-500/25 to-purple-500/20 text-pink-200 border border-pink-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>2. Creaciones & Evolución ({totalGlobalCreations})</span>
          </button>

          <button
            onClick={() => setMainTab('topology')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mainTab === 'topology'
                ? 'bg-gradient-to-r from-purple-500/25 to-blue-500/20 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Network className="w-4 h-4 text-purple-400" />
            <span>3. Topología Sináptica ({totalGlobalSynapses})</span>
          </button>

          <button
            onClick={() => setMainTab('files_vault')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mainTab === 'files_vault'
                ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>4. Bóveda Global de Archivos</span>
          </button>

          <button
            onClick={() => setMainTab('architectus_swarm')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mainTab === 'architectus_swarm'
                ? 'bg-gradient-to-r from-sky-500/25 to-cyan-500/20 text-sky-200 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>5. Architectus & Swarm</span>
          </button>
        </div>

        {/* Global KPI Pill */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono text-slate-400 bg-white/5 px-3 py-1 rounded-xl border border-white/10">
          <span>LOC: <strong className="text-emerald-300">{totalGlobalLOC.toLocaleString()}</strong></span>
          <span>•</span>
          <span>Ramas: <strong className="text-purple-300">{totalGlobalBranches}</strong></span>
          <span>•</span>
          <span>Sinapsis: <strong className="text-cyan-300">{totalGlobalSynapses}</strong></span>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {mainTab === 'creations' ? (
          <div className="h-full">
            <CreationsView />
          </div>
        ) : mainTab === 'topology' ? (
          /* Graph Topology Visualizer View */
          <div className="h-full flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-[#0a0d16] border border-purple-500/30 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-purple-400 animate-pulse" />
                  <h2 className="text-sm font-display font-bold text-white">
                    MAPA DE GRAFOS E INTERCONEXIONES COGNITIVAS
                  </h2>
                </div>
                <span className="text-xs font-mono text-purple-300">
                  {projects.length} Nodos Principales • Red Soberana Activa
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Cada proyecto actúa como un clúster sináptico que enlaza creaciones, personalidades, cerebros asignados y proyectos hermanos. Haz clic en cualquier proyecto para abrir su panel de edición completa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 hover:border-purple-500/50 transition-all flex flex-col gap-3 shadow-lg relative group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                        {proj.current_version || 'v1.0'}
                      </span>
                      <h3 className="font-display font-bold text-white text-base mt-1">{proj.name}</h3>
                    </div>
                    <button
                      onClick={() => openProjectEditor(proj, 'graph_connections')}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-slate-400 hover:text-purple-300 border border-white/10 transition-colors"
                      title="Editar Nodo de Grafo"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{proj.description}</p>

                  <div className="space-y-2 pt-2 border-t border-white/10 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 text-cyan-300">
                        <FolderOpen className="w-3.5 h-3.5" /> Conexiones Sinápticas:
                      </span>
                      <span className="font-bold text-white">{proj.linked_projects?.length || 0}</span>
                    </div>
                    {proj.linked_projects?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {proj.linked_projects.map(pid => {
                          const linkedP = projects.find(p => p.id === pid);
                          return (
                            <span key={pid} className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px]">
                              🔗 {linkedP ? linkedP.name : pid}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-slate-400 pt-1">
                      <span className="flex items-center gap-1.5 text-purple-300">
                        <Brain className="w-3.5 h-3.5" /> Cerebros Asignados:
                      </span>
                      <span className="font-bold text-white">{proj.linked_cerebros?.length || 0}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 pt-1">
                      <span className="flex items-center gap-1.5 text-pink-300">
                        <Sparkles className="w-3.5 h-3.5" /> Creaciones Enlazadas:
                      </span>
                      <span className="font-bold text-white">{proj.linked_creations?.length || 0}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => openProjectEditor(proj, 'graph_connections')}
                    className="w-full mt-2 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Configurar Conexiones Sinápticas</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : mainTab === 'files_vault' ? (
          /* Global Files & Context Vault View */
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-[#0a0d16] border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-display font-bold text-white flex items-center gap-2">
                    BÓVEDA GLOBAL DE ARCHIVOS & CONTEXTO HOST
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Registro consolidado de todos los archivos y carpetas locales enlazados a proyectos con enlaces directos y visor soberano.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-white/5 text-amber-300 border border-white/10 text-[11px] font-bold">
                  {projects.reduce((acc, p) => acc + (p.linked_folders?.length || 0), 0)} Carpetas • {projects.reduce((acc, p) => acc + (p.linked_files?.length || 0), 0)} Archivos
                </span>
              </div>
            </div>

            {/* Files & Folders Master List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <div key={proj.id} className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-white truncate text-sm font-display">{proj.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {proj.current_version || 'v1.0'}
                      </span>
                    </div>

                    <button
                      onClick={() => openProjectFullWorkspace(proj)}
                      className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Workspace</span>
                    </button>
                  </div>

                  {/* Folders */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <FolderOpen className="w-3.5 h-3.5" /> Carpetas Vinculadas ({proj.linked_folders?.length || 0}):
                    </span>
                    {proj.linked_folders?.length === 0 ? (
                      <span className="text-[10px] text-slate-500 block italic">Sin carpetas asignadas</span>
                    ) : (
                      <div className="space-y-1">
                        {proj.linked_folders.map((fld, idx) => (
                          <div key={idx} className="p-2 rounded-xl bg-black/40 border border-amber-500/20 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-amber-300 font-mono truncate">{fld}</span>
                            <button
                              onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: fld } }))}
                              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold shrink-0"
                            >
                              Abrir
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Files */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <FileCode className="w-3.5 h-3.5" /> Archivos de Código ({proj.linked_files?.length || 0}):
                    </span>
                    {proj.linked_files?.length === 0 ? (
                      <span className="text-[10px] text-slate-500 block italic">Sin archivos asignados</span>
                    ) : (
                      <div className="space-y-1">
                        {proj.linked_files.map((fil, idx) => {
                          const filePath = typeof fil === 'string' ? fil : fil.path;
                          const fileName = typeof fil === 'string' ? fil.split('/').pop() : (fil.name || fil.path);
                          return (
                            <div key={idx} className="p-2 rounded-xl bg-black/40 border border-cyan-500/20 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-cyan-200 font-mono truncate">{fileName}</span>
                              <button
                                onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: filePath } }))}
                                className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold shrink-0"
                              >
                                Ver
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : mainTab === 'architectus_swarm' ? (
          /* Architectus & Swarm Dedicated Command Center */
          <div className="space-y-4 font-mono text-xs">
            <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-950/60 via-[#0a0f1d] to-[#080b13] border border-sky-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 shadow-lg">
                  <Cpu className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-display font-bold text-white">
                      Architectus-ProjectMaster // Centro de Comando
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold text-[10px]">
                      {agentStatus?.config?.autonomy_level === 'autonomous_auto_apply' ? '⚡ Modo Autónomo Soberano' : '🛡️ Supervisado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Supervisado por: <strong className="text-purple-300">Metis Prime (Astraura Director)</strong> • Proceso Imaginativo: <strong className="text-cyan-300">project_architectural_synthesis</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={handleRunAgentCycle}
                  disabled={isAgentRunning}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-lg shadow-sky-500/20 cursor-pointer"
                >
                  <Sparkles className={`w-4 h-4 ${isAgentRunning ? 'animate-spin' : ''}`} />
                  <span>{isAgentRunning ? 'Ejecutando...' : 'Ejecutar Proceso Imaginativo'}</span>
                </button>
                <button
                  onClick={handleAutoOrganizeVault}
                  disabled={isAgentRunning}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAgentRunning ? 'animate-spin' : ''}`} />
                  <span>Auto-Organizar Bóveda</span>
                </button>
              </div>
            </div>

            {/* Telemetry Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-sky-500/20 space-y-1">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5 text-sky-300">
                  <FolderTree className="w-4 h-4" /> Proyectos Gestionados
                </span>
                <p className="text-white font-bold text-lg">{agentStatus?.telemetry?.managed_projects_count || projects.length}</p>
                <span className="text-[10px] text-slate-500">En Bóveda Soberana</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-pink-500/20 space-y-1">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5 text-pink-300">
                  <Sparkles className="w-4 h-4" /> Creaciones Vinculadas
                </span>
                <p className="text-white font-bold text-lg">{agentStatus?.telemetry?.managed_creations_count || totalGlobalCreations}</p>
                <span className="text-[10px] text-slate-500">Shaders, audio y kernels</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 space-y-1">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5 text-purple-300">
                  <Cpu className="w-4 h-4" /> Presupuesto M1 Silicio
                </span>
                <p className="text-white font-bold text-lg">{agentStatus?.config?.allocated_cpu_percent || 25}% CPU</p>
                <span className="text-[10px] text-slate-500">ARM64 NEON Hilos</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-1">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5 text-emerald-300">
                  <TrendingUp className="w-4 h-4" /> Ciclos Completados
                </span>
                <p className="text-white font-bold text-lg">{agentStatus?.telemetry?.total_cycles_completed || 0}</p>
                <span className="text-[10px] text-slate-500">Síntesis Arquitectónica</span>
              </div>
            </div>
          </div>
        ) : (
          /* Projects Vault Grid View */
          <div className="space-y-4">
            {/* Architectus-ProjectMaster Command Center Bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 via-cyan-950/20 to-black/60 border border-sky-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 shadow-md">
                  <FolderTree className={`w-5 h-5 ${isAgentRunning ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-white text-sm">
                      Architectus-ProjectMaster
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold">
                      {agentStatus?.config?.autonomy_level === 'autonomous_auto_apply' ? '⚡ Modo Autónomo' : '🛡️ Supervisado'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] hidden sm:inline-block">
                      CPU: {agentStatus?.config?.allocated_cpu_percent || 25}% M1
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-1">
                    Administrador inteligente de la Bóveda con proceso imaginativo propio, sinapsis inter-proyecto y auto-organización continua bajo supervisión de Metis Prime.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={handleRunAgentCycle}
                  disabled={isAgentRunning}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/20 to-cyan-500/20 hover:from-sky-500/30 hover:to-cyan-500/30 text-sky-300 border border-sky-500/40 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Ejecutar proceso imaginativo 'project_architectural_synthesis'"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAgentRunning ? 'animate-spin' : ''}`} />
                  <span>{isAgentRunning ? 'Imaginando...' : 'Proceso Imaginativo'}</span>
                </button>

                <button
                  onClick={handleAutoOrganizeVault}
                  disabled={isAgentRunning}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Auto-organizar proyectos, vincular creaciones huérfanas y balancear sinapsis"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto-Organizar</span>
                </button>

                <button
                  onClick={() => setIsAgentConfigModalOpen(true)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  title="Configuración de Architectus"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pending Proposals Drawer from Architectus */}
            {agentStatus?.pending_proposals && agentStatus.pending_proposals.filter(p => p.status === 'pending_approval').length > 0 && (
              <div className="p-4 rounded-2xl bg-[#090d16] border border-cyan-500/30 shadow-lg space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="font-display font-bold text-white">
                      Propuestas Arquitectónicas & Nuevos Proyectos Pendientes ({agentStatus.pending_proposals.filter(p => p.status === 'pending_approval').length})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Generadas por Architectus en 2do Plano</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {agentStatus.pending_proposals.filter(p => p.status === 'pending_approval').map((prop) => (
                    <div key={prop.id} className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
                            {prop.type === 'new_project_draft' ? '📦 Nuevo Proyecto' : '🌿 Refactorización'}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {new Date(prop.timestamp * 1000).toLocaleTimeString()}
                          </span>
                        </div>
                        <h4 className="text-white font-bold text-xs">{prop.title}</h4>
                        <p className="text-slate-300 text-[11px] font-sans leading-relaxed">{prop.description}</p>
                        <p className="text-slate-400 text-[10px] italic">Motivo: {prop.reasoning}</p>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApplyAgentProposal(prop.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Aprobar & Forjar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Search, Filter & View Mode Toolbar */}
            <div className="p-3.5 rounded-2xl bg-[#090d16] border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Buscar proyectos por nombre, descripción, agentes, carpetas o archivos..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <FolderOpen className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-xl border border-white/10 shrink-0">
                <button
                  onClick={() => setActiveProjectFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all ${
                    activeProjectFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({projects.length})
                </button>
                <button
                  onClick={() => setActiveProjectFilter('personal')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all ${
                    activeProjectFilter === 'personal' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Propios ({projects.filter(p => p.type === 'personal').length})
                </button>
                <button
                  onClick={() => setActiveProjectFilter('automatic')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all ${
                    activeProjectFilter === 'automatic' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Daedalus IA ({projects.filter(p => p.type === 'automatic').length})
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-400 text-[11px]">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-[#07090e] border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="progress">📈 Progreso Real (%)</option>
                  <option value="activity">⚡ Actividad Reciente</option>
                  <option value="loc">💾 Líneas de Código (LOC)</option>
                  <option value="name">🔤 Nombre A-Z</option>
                </select>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-xl border border-white/10 shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Vista en Cuadrícula"
                >
                  <Box className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Vista en Lista Compacta"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Projects Vault Content: Grid or List */}
            {isLoading ? (
              <div className="flex items-center justify-center p-16">
                <div className="text-emerald-400 font-mono text-sm animate-pulse flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" /> Cargando Bóveda de Proyectos...
                </div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-500 font-mono space-y-3">
                <Box className="w-12 h-12 opacity-20" />
                <p>No se encontraron proyectos con los filtros actuales.</p>
                <button
                  onClick={() => { setSearchQuery(''); setActiveProjectFilter('all'); }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold"
                >
                  Limpiar Filtros
                </button>
              </div>
            ) : viewMode === 'list' ? (
              /* Compact List View */
              <div className="rounded-2xl bg-[#0b0e18] border border-white/10 overflow-hidden font-mono text-xs shadow-xl">
                <div className="grid grid-cols-12 gap-2 p-3 bg-white/5 border-b border-white/10 font-bold text-slate-400 text-[11px]">
                  <div className="col-span-4">Proyecto</div>
                  <div className="col-span-2 text-center">Progreso Real</div>
                  <div className="col-span-2 text-center">Métricas M1</div>
                  <div className="col-span-2 text-center">Interconexiones</div>
                  <div className="col-span-2 text-right">Acciones</div>
                </div>

                <div className="divide-y divide-white/5">
                  {filteredProjects.map((project) => (
                    <div key={project.id} className="grid grid-cols-12 gap-2 p-3.5 items-center hover:bg-white/[0.03] transition-colors">
                      <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shrink-0">
                          <FolderOpen className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white truncate text-xs">{project.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-slate-300 border border-white/10">
                              {project.current_version || 'v1.0'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{project.description || 'Sin descripción'}</p>
                        </div>
                      </div>

                      <div className="col-span-2 px-2">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-slate-400">Desarrollo:</span>
                          <span className="text-emerald-400 font-bold">{project.progress || 50}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full" 
                            style={{ width: `${project.progress || 50}%` }}
                          />
                        </div>
                      </div>

                      <div className="col-span-2 text-center text-[10px] text-slate-300 space-y-0.5">
                        <div>💾 {project._physical_metrics?.total_bytes_formatted || '64 KB'}</div>
                        <div className="text-slate-400">{project._physical_metrics?.total_lines_of_code || 840} LOC</div>
                      </div>

                      <div className="col-span-2 text-center flex items-center justify-center gap-1 flex-wrap text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30" title="Ramas">
                          🌿 {project.timeline_branches?.length || 1}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" title="Creaciones">
                          ✨ {project.linked_creations?.length || 0}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" title="Sinapsis">
                          🔗 {project.linked_projects?.length || 0}
                        </span>
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openProjectFullWorkspace(project)}
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-500/40 text-cyan-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                          title="Abrir Ventana Completa (Workspace)"
                        >
                          <Maximize2 className="w-3 h-3 text-cyan-300" />
                          <span>Workspace</span>
                        </button>

                        <button
                          onClick={() => openProjectEditor(project)}
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Editar Todo"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="p-4 rounded-2xl bg-[#0b0e18]/90 hover:bg-[#0e1322] border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between relative group shadow-xl"
                >
                  <div>
                    {/* Top Row: Type & Actions */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {project.type === 'automatic' ? (
                          <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 shrink-0">
                            <FolderSync className="w-4 h-4 text-purple-400" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 shrink-0">
                            <FolderOpen className="w-4 h-4 text-cyan-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-display font-bold text-sm text-white leading-snug truncate">
                            {project.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-sm font-mono font-bold border ${
                              project.type === 'automatic'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                            }`}>
                              {project.type === 'automatic' ? 'Daedalus IA' : 'Manual'}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded-sm font-mono font-bold bg-white/5 text-slate-300 border border-white/10">
                              {project.current_version || 'v1.0'}
                            </span>
                            {project._physical_metrics?.total_bytes_formatted && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-sm font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                                💾 {project._physical_metrics.total_bytes_formatted}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleInspectIntegrity(project)}
                          className="text-emerald-400 hover:text-emerald-300 p-1 rounded-lg hover:bg-white/5 transition-colors"
                          title="Verificar Veracidad Física & Métricas en Silicio"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openProjectEditor(project)}
                          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                          title="Configurar y Editar Proyecto"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {project.description || 'Sin descripción asignada.'}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Progreso de Desarrollo:</span>
                        <span className="text-emerald-400 font-bold">{project.progress || 50}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${project.progress || 50}%` }}
                        />
                      </div>
                    </div>

                    {/* Badges / Interconnections */}
                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-1.5 text-[10px] font-mono">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1 text-cyan-300"><Layers className="w-3 h-3" /> Creaciones:</span>
                        <span className="text-cyan-200 font-bold">{project.linked_creations?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1 text-purple-300"><Activity className="w-3 h-3" /> Ramas Vivas:</span>
                        <span className="text-purple-200 font-bold">{project.timeline_branches?.length || 1}</span>
                      </div>

                      {/* Interconnections Badges */}
                      <div className="flex items-center justify-between text-slate-400 pt-1">
                        <span className="flex items-center gap-1 text-emerald-300"><Network className="w-3 h-3" /> Sinapsis:</span>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {project.linked_projects?.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] border border-blue-500/30" title="Proyectos Hermanos">
                              P: {project.linked_projects.length}
                            </span>
                          )}
                          {project.linked_cerebros?.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 text-[9px] border border-fuchsia-500/30" title="Cerebros">
                              🧠 {project.linked_cerebros.length}
                            </span>
                          )}
                          {project.linked_agents?.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] border border-amber-500/30" title="Agentes">
                              👥 {project.linked_agents.length}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Context Folders & Files Direct Actions */}
                      {((project.linked_folders && project.linked_folders.length > 0) || (project.linked_files && project.linked_files.length > 0)) && (
                        <div className="pt-2 border-t border-white/5 space-y-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <FolderTree className="w-3 h-3 text-amber-400" /> Archivos & Carpetas de Contexto:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {project.linked_folders?.slice(0, 2).map((fold, fidx) => (
                              <button
                                key={fidx}
                                onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: fold } }))}
                                className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[9px] truncate max-w-[150px] flex items-center gap-1 cursor-pointer"
                                title={`Abrir carpeta: ${fold}`}
                              >
                                <FolderOpen className="w-2.5 h-2.5" />
                                <span className="truncate">{fold.split('/').pop() || fold}</span>
                              </button>
                            ))}
                            {project.linked_files?.slice(0, 2).map((fil, fidx) => (
                              <button
                                key={fidx}
                                onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: fil.path || fil } }))}
                                className="px-1.5 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-[9px] truncate max-w-[150px] flex items-center gap-1 cursor-pointer"
                                title={`Ver archivo: ${fil.path || fil}`}
                              >
                                <FileCode className="w-2.5 h-2.5" />
                                <span className="truncate">{fil.name || (typeof fil === 'string' ? fil.split('/').pop() : fil.path)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Full Workspace Opener & Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                    <button
                      onClick={() => openProjectFullWorkspace(project)}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 via-sky-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />
                      <span>🪟 Abrir Workspace Completo</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openProjectEditor(project)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Todo</span>
                      </button>

                      <button
                        onClick={() => handleTriggerDreamForProject(project.id, project.name)}
                        disabled={isDreamingForProject}
                        className="p-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 transition-all cursor-pointer"
                        title="Disparar Proceso Imaginativo con Propósito para este Proyecto"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isDreamingForProject ? 'animate-spin' : ''}`} />
                      </button>

                      <button
                        onClick={() => handleDeleteProject(project.id, project.name)}
                        className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-400 transition-all cursor-pointer"
                        title="Eliminar Proyecto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>

      {/* ================= ARCHITECTUS-PROJECTMASTER CONFIGURATION MODAL ================= */}
      {isAgentConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono text-xs">
          <div className="bg-[#0b0e18] border border-sky-500/40 rounded-3xl w-full max-w-xl shadow-2xl shadow-sky-950/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-sky-950/60 to-black/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white font-display">
                    Configuración // Architectus-ProjectMaster
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Administrador y Arquitecto Soberano de Proyectos (Supervisión: Metis Prime)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAgentConfigModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Autonomy Level */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Nivel de Autonomía de Gestión:</label>
                <select
                  value={agentConfigForm.autonomy_level}
                  onChange={e => setAgentConfigForm({ ...agentConfigForm, autonomy_level: e.target.value })}
                  className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="supervised">🛡️ Supervisado (Notifica y solicita aprobación)</option>
                  <option value="autonomous_auto_apply">⚡ Autónomo Soberano (Auto-Aplica todo en 2do Plano)</option>
                  <option value="advisory">💡 Solo Asesor (Genera borradores sin tocar el disco)</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer">
                  <span className="text-slate-300">Auto-Scaffold de Nuevos Proyectos (Detección de Clústeres):</span>
                  <input
                    type="checkbox"
                    checked={agentConfigForm.auto_scaffold_new_projects}
                    onChange={e => setAgentConfigForm({ ...agentConfigForm, auto_scaffold_new_projects: e.target.checked })}
                    className="accent-sky-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer">
                  <span className="text-slate-300">Auto-Vincular Creaciones Huérfanas a Proyectos Afines:</span>
                  <input
                    type="checkbox"
                    checked={agentConfigForm.auto_link_orphan_creations}
                    onChange={e => setAgentConfigForm({ ...agentConfigForm, auto_link_orphan_creations: e.target.checked })}
                    className="accent-sky-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer">
                  <span className="text-slate-300">Rebalanceo Continuo de Sinapsis Inter-Proyecto:</span>
                  <input
                    type="checkbox"
                    checked={agentConfigForm.auto_rebalance_synapses}
                    onChange={e => setAgentConfigForm({ ...agentConfigForm, auto_rebalance_synapses: e.target.checked })}
                    className="accent-sky-500 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              {/* CPU & Frequency */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Presupuesto CPU M1 (%):</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={agentConfigForm.allocated_cpu_percent}
                    onChange={e => setAgentConfigForm({ ...agentConfigForm, allocated_cpu_percent: parseInt(e.target.value) || 25 })}
                    className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Frecuencia de Ciclos (min):</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={agentConfigForm.cycle_frequency_minutes}
                    onChange={e => setAgentConfigForm({ ...agentConfigForm, cycle_frequency_minutes: parseInt(e.target.value) || 12 })}
                    className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsAgentConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAgentConfig}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold cursor-pointer transition-all"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PHYSICAL INTEGRITY MODAL ================= */}
      {integrityModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b0e18] border border-emerald-500/30 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden font-mono text-xs">
            <div className="px-5 py-4 border-b border-white/10 bg-[#0e1424] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-white font-display">Verificación Física & Veracidad de Proyecto</h3>
                  <span className="text-[10px] text-emerald-300 font-mono">{integrityModal.projectName}</span>
                </div>
              </div>
              <button onClick={() => setIntegrityModal({ isOpen: false, isLoading: false, data: null, projectName: '' })} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {integrityModal.isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-cyan-400">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>Auditando estructura física en disco y nodos de memoria...</span>
                </div>
              ) : integrityModal.data?.success ? (
                <div className="space-y-4">
                  {/* Verdict Banner */}
                  <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold block">VEREDICTO DE AUTENTICIDAD:</span>
                      <span className="text-xs text-white font-bold">100% Verificado en Silicio Apple M1 (Cero Simulación)</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-[10px]">
                      VERIFIED
                    </span>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Tamaño Físico:</span>
                      <span className="text-sm font-bold text-emerald-300">{integrityModal.data.total_bytes_formatted}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Archivos Totales:</span>
                      <span className="text-sm font-bold text-cyan-300">{integrityModal.data.total_files}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Líneas de Código:</span>
                      <span className="text-sm font-bold text-purple-300">{integrityModal.data.total_lines_of_code}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Nodos Sinápticos:</span>
                      <span className="text-sm font-bold text-amber-300">{integrityModal.data.linked_nodes?.projects || 0}</span>
                    </div>
                  </div>

                  {/* Extension Distribution */}
                  {integrityModal.data.extension_distribution && (
                    <div className="space-y-1.5">
                      <span className="text-slate-300 font-bold text-[11px] block">Distribución de Formatos:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(integrityModal.data.extension_distribution).map(([ext, count]) => (
                          <span key={ext} className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-200 border border-white/10 text-[10px]">
                            {ext}: <strong className="text-cyan-300">{count}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inspected Paths */}
                  <div className="space-y-2">
                    <span className="text-slate-300 font-bold text-[11px] block">Rutas Auditadas en el Host:</span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                      {integrityModal.data.inspected_paths?.map((pinfo, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-slate-200 block truncate">{pinfo.path}</span>
                            <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-0.5">
                              <span>Permisos: {pinfo.is_readable ? 'R' : '-'}{pinfo.is_writable ? 'W' : '-'}{pinfo.is_executable ? 'X' : '-'}</span>
                              <span>•</span>
                              <span>{pinfo.bytes_formatted}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: pinfo.path } }))}
                            className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 text-[10px] font-bold"
                          >
                            Abrir
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-red-500/20 text-red-300">
                  {integrityModal.data?.error || 'Error al inspeccionar integridad'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= FULL PROJECT DEEP EDITOR DRAWER / MODAL ================= */}
      {isEditorOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b0e18] border border-white/15 rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Editor Header */}
            <div className="px-5 py-4 border-b border-white/10 bg-[#0e1220] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                  <Settings className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
                    Configuración & Edición Total: <span className="text-cyan-300">{editForm.name}</span>
                  </h2>
                  <p className="text-xs font-mono text-slate-400">
                    ID: {selectedProject.id} • Modifica memorias, cerebros, agentes, ramas, sinapsis y archivos con permisos soberanos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleInspectIntegrity(selectedProject)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                  title="Verificar Veracidad Física"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Verificar</span>
                </button>
                <button
                  onClick={handleSaveProjectEdits}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-mono font-black flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Editor Navigation Tabs */}
            <div className="px-5 py-2 bg-[#080b13] border-b border-white/10 flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs font-mono">
              {[
                { id: 'general', label: '1. General & Permisos', icon: Sliders },
                { id: 'cerebros_memories', label: '2. Cerebros & Recuerdos', icon: Brain },
                { id: 'agents_personalities', label: '3. Agentes & Personalidades', icon: Users },
                { id: 'processes_branches', label: '4. Ramas & Fusiones', icon: GitBranch },
                { id: 'folders_files', label: '5. Archivos & Carpetas', icon: HardDrive },
                { id: 'graph_connections', label: '6. Sinapsis Inter-Proyecto', icon: Network },
                { id: 'creations_proposals', label: '7. Creaciones & Propuestas', icon: Sparkles },
                { id: 'versions', label: '8. Historial de Versiones', icon: History },
                { id: 'logs', label: '9. Logs & Decisiones', icon: Terminal }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = editorTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setEditorTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Editor Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              {/* TAB 1: GENERAL & PERMISOS */}
              {editorTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Nombre del Proyecto</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Versión Actual</label>
                      <input
                        type="text"
                        value={editForm.current_version || 'v1.0'}
                        onChange={e => setEditForm({ ...editForm, current_version: e.target.value })}
                        className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Descripción y Propósito</label>
                    <textarea
                      rows={3}
                      value={editForm.description || ''}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono resize-none"
                    />
                  </div>

                  {/* Sovereign Permission Policy Box */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-300 font-bold flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-purple-400" />
                        Política de Permisos & Acceso Soberano en el Host:
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-200">
                        {editForm.permission_policy?.access_level || 'sovereign_full'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'sovereign_full', label: 'Acceso Total Soberano', desc: 'Permite a agentes leer/escribir archivos en disco real.' },
                        { id: 'read_write_sandboxed', label: 'Lectura/Escritura Aislada', desc: 'Solo modifica dentro de la carpeta del proyecto.' },
                        { id: 'read_only', label: 'Solo Lectura', desc: 'Ningún agente puede modificar archivos en disco.' }
                      ].map(pol => (
                        <div
                          key={pol.id}
                          onClick={() => setEditForm({
                            ...editForm,
                            permission_policy: {
                              ...(editForm.permission_policy || {}),
                              access_level: pol.id
                            }
                          })}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                            (editForm.permission_policy?.access_level || 'sovereign_full') === pol.id
                              ? 'bg-purple-500/20 border-purple-500 text-white shadow-md'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          <span className="font-bold block text-[11px]">{pol.label}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{pol.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CEREBROS & RECUERDOS */}
              {editorTab === 'cerebros_memories' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-display font-bold text-white flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-cyan-400" />
                      Cerebros Asignados al Proyecto
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {PRESET_CEREBROS.map(c => {
                        const isSelected = (editForm.linked_cerebros || []).includes(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => toggleArrayItem('linked_cerebros', c.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-md'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            <span className="text-xs font-mono font-semibold">{c.name}</span>
                            <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-display font-bold text-white flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-emerald-400" />
                      Axiomas & Memorias Clave de este Proyecto
                    </h3>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newKeyMemoryInput}
                        onChange={e => setNewKeyMemoryInput(e.target.value)}
                        placeholder="Inculcar nuevo axioma clave..."
                        className="flex-1 bg-[#07090e] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleAddKeyMemory}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold cursor-pointer"
                      >
                        + Inculcar
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {(editForm.key_memories || []).map((mem, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs font-mono text-slate-300">
                          <span>› {mem}</span>
                          <button type="button" onClick={() => handleRemoveKeyMemory(idx)} className="text-red-400 hover:text-red-300 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AGENTES & PERSONALIDADES */}
              {editorTab === 'agents_personalities' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-display font-bold text-white flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      Agentes Autónomos Asignados
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {PRESET_AGENTS.map(ag => {
                        const isSelected = (editForm.linked_agents || []).includes(ag.id);
                        return (
                          <div
                            key={ag.id}
                            onClick={() => toggleArrayItem('linked_agents', ag.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-md'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-mono font-bold">{ag.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{ag.defaultRole}</div>
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isSelected ? 'bg-purple-500/30 text-purple-200 font-bold' : 'bg-white/5 text-slate-500'}`}>
                              {isSelected ? '✓ Activo' : 'Inactivo'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-display font-bold text-white flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      Personalidades de Voz & Razonamiento
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_PERSONALITIES.map(pers => {
                        const isSelected = (editForm.linked_personalities || []).includes(pers.id);
                        return (
                          <button
                            key={pers.id}
                            type="button"
                            onClick={() => toggleArrayItem('linked_personalities', pers.id)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {pers.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: RAMAS VIVAS & FUSIONES */}
              {editorTab === 'processes_branches' && (
                <div className="space-y-6 font-mono text-xs">
                  {/* Create Branch Form */}
                  <form onSubmit={handleCreateBranchSubmit} className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-purple-400" />
                      Forjar Nueva Rama de Desarrollo en Línea Temporal
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        value={newBranchForm.name}
                        onChange={e => setNewBranchForm({ ...newBranchForm, name: e.target.value })}
                        placeholder="Nombre de la rama (ej: opt-neon-v3)..."
                        className="p-2 bg-[#07090e] border border-white/15 rounded-xl text-white font-mono"
                      />
                      <input
                        type="text"
                        value={newBranchForm.origin_branch}
                        onChange={e => setNewBranchForm({ ...newBranchForm, origin_branch: e.target.value })}
                        placeholder="Rama origen (default: main)..."
                        className="p-2 bg-[#07090e] border border-white/15 rounded-xl text-white font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isCreatingBranch}
                        className="py-2 px-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{isCreatingBranch ? 'Forjando...' : 'Crear Rama'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Branches List */}
                  <div className="space-y-2">
                    <h4 className="text-slate-300 font-bold text-xs uppercase tracking-wider">
                      Ramas Registradas ({editForm.timeline_branches?.length || 0}):
                    </h4>
                    <div className="space-y-2">
                      {(editForm.timeline_branches || []).map((br, bidx) => (
                        <div key={br.id || bidx} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span className="font-bold text-white text-xs">{br.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                br.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
                              }`}>
                                {br.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">{br.notes || 'Rama activa de desarrollo'}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {br.status === 'active' && br.name !== 'main' && br.name !== 'main/production' && (
                              <button
                                type="button"
                                onClick={() => handleMergeBranch(br.name)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 cursor-pointer font-bold text-[10px]"
                              >
                                <GitMerge className="w-3 h-3" />
                                <span>Fusionar (Merge)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ARCHIVOS, CARPETAS & PERMISOS */}
              {editorTab === 'folders_files' && (
                <div className="space-y-6 font-mono text-xs">
                  {/* Linked Folders */}
                  <div>
                    <h3 className="text-sm font-display font-bold text-white flex items-center gap-2 mb-2">
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      Carpetas Locales del Sistema
                    </h3>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newFolderInput}
                        onChange={e => setNewFolderInput(e.target.value)}
                        placeholder="/Users/alex/Documents/..."
                        className="flex-1 bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleAddFolder}
                        className="px-3 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold cursor-pointer"
                      >
                        + Vincular Carpeta
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(editForm.linked_folders || []).map((fold, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs font-mono text-cyan-300">
                          <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: fold } }))}
                            className="truncate max-w-[70%] text-left hover:underline hover:text-cyan-200 cursor-pointer flex items-center gap-1.5"
                            title="Inspeccionar carpeta en visor soberano / Finder"
                          >
                            <FolderTree className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">{fold}</span>
                          </button>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: fold } }))}
                              className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] font-bold cursor-pointer"
                            >
                              Abrir
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFolder(fold)}
                              className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Create File Modal Trigger */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-xs flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-cyan-400" />
                        Archivos & Entregables en Bóveda
                      </h4>
                      <button
                        type="button"
                        onClick={() => setNewFileModal({ ...newFileModal, isOpen: true })}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold hover:bg-cyan-500/30 cursor-pointer"
                      >
                        + Crear / Escribir Archivo en Disco
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {(editForm.linked_files || []).map((fpath, fidx) => (
                        <div key={fidx} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: fpath } }))}
                            className="truncate max-w-[70%] text-cyan-300 hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            <File className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">{fpath}</span>
                          </button>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { path: fpath } }))}
                              className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold"
                            >
                              Ver
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProjectFile(fpath, false)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: SINAPSIS INTER-PROYECTO (GRAFO 3D) */}
              {editorTab === 'graph_connections' && (
                <div className="space-y-6 font-mono text-xs">
                  <div>
                    <h3 className="text-sm font-display font-bold text-white flex items-center gap-2 mb-2">
                      <Network className="w-4 h-4 text-purple-400" />
                      Aristas Sinápticas con Otros Proyectos en el Grafo 3D
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mb-3">
                      Establece enlaces bidireccionales con proyectos hermanos para sincronizar axiomas de memoria, modelos y orquestación multiagente:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {projects.filter(p => p.id !== selectedProject.id).map(otherP => {
                        const isConnected = (editForm.linked_projects || []).includes(otherP.id);
                        return (
                          <div
                            key={otherP.id}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2 ${
                              isConnected
                                ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-md'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-xs font-mono font-bold">{otherP.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono line-clamp-1">{otherP.description}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleSynapse(otherP.id)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                                  isConnected ? 'bg-purple-500/40 text-purple-100 border border-purple-400' : 'bg-white/10 text-slate-300 hover:bg-purple-500/20'
                                }`}
                              >
                                {isConnected ? '🔗 Conectado' : '+ Conectar'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: CREACIONES & PROPUESTAS PROACTIVAS */}
              {editorTab === 'creations_proposals' && (
                <div className="space-y-4 font-mono text-xs">
                  <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-400" />
                    Creaciones y Entregables Vinculados ({editForm.linked_creations?.length || 0})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(editForm.linked_creations || []).map((cid, cidx) => (
                      <div key={cidx} className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{cid}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold">Creación</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyProposalToProject({ id: cid, title: `Asimilación de ${cid}`, content: `Entregable de creación ${cid}` })}
                          className="w-full py-1 rounded bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 font-bold cursor-pointer"
                        >
                          Aplicar al Código del Proyecto
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 8: HISTORIAL DE VERSIONES */}
              {editorTab === 'versions' && (
                <div className="space-y-6">
                  <form onSubmit={handleAddVersionSubmit} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                    <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      Registrar Nueva Versión de Desarrollo
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1">Versión (Ej: v2.2)</label>
                        <input
                          type="text"
                          value={newVersionForm.version}
                          onChange={e => setNewVersionForm({ ...newVersionForm, version: e.target.value })}
                          placeholder="v2.2"
                          className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1">Resumen del Salto</label>
                        <input
                          type="text"
                          required
                          value={newVersionForm.summary}
                          onChange={e => setNewVersionForm({ ...newVersionForm, summary: e.target.value })}
                          placeholder="Optimización de compilación ARM NEON..."
                          className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Cambios (Uno por línea)</label>
                      <textarea
                        rows={2}
                        value={newVersionForm.changes}
                        onChange={e => setNewVersionForm({ ...newVersionForm, changes: e.target.value })}
                        placeholder="- Reducción de latencia&#10;- Sincronía con Daedalus"
                        className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white font-mono resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold cursor-pointer"
                    >
                      + Guardar Versión en Histórico
                    </button>
                  </form>

                  <div className="space-y-3">
                    <h3 className="text-sm font-display font-bold text-white">Historial de Versiones</h3>
                    {(editForm.version_history || []).map((ver, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                            {ver.version}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(ver.timestamp * 1000).toLocaleString()} • {ver.author}
                          </span>
                        </div>
                        <p className="text-xs text-white font-mono font-semibold">{ver.summary}</p>
                        {ver.changes?.length > 0 && (
                          <ul className="text-[11px] text-slate-400 font-mono list-disc list-inside space-y-0.5">
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

              {/* TAB 9: LOGS & AUDITORÍAS */}
              {editorTab === 'logs' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-400" />
                    Historial de Logs & Registro de Decisiones de Agentes
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                    {(editForm.logs_history || []).map((log, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span className="text-amber-300 font-bold">{log.agent || 'Daedalus'}</span>
                          <span>{log.timestamp ? new Date(log.timestamp * 1000).toLocaleString() : 'N/A'}</span>
                        </div>
                        <div className="text-white font-semibold">{log.action}</div>
                        <div className="text-slate-400 text-[11px]">{log.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= WRITE / CREATE FILE MODAL ================= */}
      {newFileModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono text-xs">
          <div className="bg-[#0b0e18] border border-cyan-500/40 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span>Escribir / Modificar Archivo en Disco Real</span>
              </h3>
              <button onClick={() => setNewFileModal({ ...newFileModal, isOpen: false })} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleWriteProjectFileSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Ruta del Archivo (Relativa o Absoluta):</label>
                <input
                  type="text"
                  required
                  value={newFileModal.filePath}
                  onChange={e => setNewFileModal({ ...newFileModal, filePath: e.target.value })}
                  placeholder="backend/app/core/neon_kernel.cpp"
                  className="w-full p-2 rounded-xl bg-black/60 border border-white/15 text-cyan-200"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Contenido del Archivo:</label>
                <textarea
                  rows={8}
                  value={newFileModal.content}
                  onChange={e => setNewFileModal({ ...newFileModal, content: e.target.value })}
                  placeholder="// Código, JSON, Markdown o texto..."
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/15 text-slate-200 font-mono text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewFileModal({ ...newFileModal, isOpen: false })}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  Escribir a Disco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CREATE PROJECT MODAL ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b0e18] border border-white/15 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 bg-[#0e1220] flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-emerald-400" />
                Forjar Nuevo Proyecto
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">Nombre del Proyecto</label>
                <input
                  type="text"
                  required
                  value={newProjectForm.name}
                  onChange={e => setNewProjectForm({...newProjectForm, name: e.target.value})}
                  placeholder="Ej: Inferencia Cuántica 1.58b"
                  className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">Descripción y Propósito</label>
                <textarea
                  value={newProjectForm.description}
                  onChange={e => setNewProjectForm({...newProjectForm, description: e.target.value})}
                  placeholder="Describe los propósitos y directrices de este nodo..."
                  rows={3}
                  className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">Tipo</label>
                  <select
                    value={newProjectForm.type}
                    onChange={e => setNewProjectForm({...newProjectForm, type: e.target.value})}
                    className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="personal">Manual Propio</option>
                    <option value="automatic">Daedalus IA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">Prioridad</label>
                  <select
                    value={newProjectForm.priority}
                    onChange={e => setNewProjectForm({...newProjectForm, priority: e.target.value})}
                    className="w-full bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black text-xs font-mono font-black shadow-lg shadow-emerald-500/20"
                >
                  Forjar Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Full Workspace Modal (Dynamic Complete Window) */}
      <ProjectFullWorkspaceModal
        isOpen={isFullWorkspaceOpen}
        project={selectedFullWorkspaceProject}
        allProjects={projects}
        onClose={() => setIsFullWorkspaceOpen(false)}
        onProjectUpdated={(updatedProj) => {
          loadProjects();
          setSelectedFullWorkspaceProject(updatedProj);
        }}
      />

      {/* Synthesis Executive Report & Chronology Modal */}
      <SynthesisReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}

