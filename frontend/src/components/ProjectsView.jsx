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
  Box
} from 'lucide-react';
import { fetchProjects, createProject, updateProject } from '../services/api';

export default function ProjectsView() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'automatic'
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: '',
    type: 'personal'
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetchProjects();
      if (res && res.projects) {
        setProjects(res.projects);
      }
    } catch (e) {
      console.error('Error fetching projects:', e);
      showToast('Error al cargar los proyectos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

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
        newProjectForm.type
      );
      if (res && res.success) {
        showToast(`📁 Proyecto '${res.project.name}' creado`);
        setIsCreateModalOpen(false);
        setNewProjectForm({ name: '', description: '', type: 'personal' });
        await loadProjects();
      } else {
        showToast('Error al crear proyecto');
      }
    } catch (err) {
      console.error('Create error:', err);
      showToast('Error de red al crear proyecto');
    }
  };

  const filteredProjects = projects.filter(p => p.type === activeTab);

  return (
    <div className="flex flex-col h-full bg-[#07090e] text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/90 to-purple-600/90 text-white font-mono text-xs shadow-2xl backdrop-blur-md border border-white/20 animate-fade-in flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-200 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="p-3 sm:p-4 bg-[#0a0d16]/95 border-b border-white/10 flex-shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-emerald-500 to-purple-400 p-[1px] shadow-lg shadow-emerald-500/20 shrink-0">
            <div className="w-full h-full bg-[#07090e] rounded-[11px] flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-black text-sm sm:text-base md:text-lg text-white tracking-wide truncate">
                GESTOR DE PROYECTOS ASTRAURA
              </h1>
              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold shrink-0">
                1.58-Bit Project Vault
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5 truncate">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping shrink-0" />
              <span className="truncate">Soberanía de activos, auto-clasificación y orquestación multi-agente</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/20"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-300" />
            <span>Crear Proyecto</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 py-2 bg-[#090c14] border-b border-white/10 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'personal'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Proyectos Propios</span>
        </button>

        <button
          onClick={() => setActiveTab('automatic')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'automatic'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <FolderSync className="w-3.5 h-3.5" />
          <span>Proyectos Automáticos (IA)</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-emerald-400 font-mono text-sm animate-pulse flex items-center gap-2">
              <Zap className="w-4 h-4" /> Cargando Proyectos...
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 font-mono">
            <Box className="w-12 h-12 mb-4 opacity-20" />
            <p>No hay proyectos en esta categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map(project => (
              <div
                key={project.id}
                className="p-4 rounded-2xl bg-[#0b0e18]/80 hover:bg-[#0f1422] border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col relative group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {project.type === 'automatic' ? (
                      <FolderSync className="w-5 h-5 text-purple-400" />
                    ) : (
                      <FolderOpen className="w-5 h-5 text-cyan-400" />
                    )}
                    <h3 className="font-display font-bold text-sm text-white leading-snug break-words max-w-[200px]">
                      {project.name}
                    </h3>
                  </div>
                  <button className="text-slate-500 hover:text-white p-1">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed flex-1">
                  {project.description || 'Sin descripción.'}
                </p>

                <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-1.5 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> Creaciones:</span>
                    <span className="text-cyan-300 font-bold">{project.linked_creations?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Procesos:</span>
                    <span className="text-purple-300 font-bold">{project.linked_processs?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" /> Actualizado:</span>
                    <span className="text-slate-300">
                      {project.updated_at ? new Date(project.updated_at * 1000).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0b0e18] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-emerald-400" />
                Crear Nuevo Proyecto
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">Nombre del Proyecto</label>
                <input
                  type="text"
                  required
                  value={newProjectForm.name}
                  onChange={e => setNewProjectForm({...newProjectForm, name: e.target.value})}
                  placeholder="Ej: Exploración Genómica"
                  className="w-full bg-[#07090e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">Descripción (Opcional)</label>
                <textarea
                  value={newProjectForm.description}
                  onChange={e => setNewProjectForm({...newProjectForm, description: e.target.value})}
                  placeholder="Describe los objetivos y recursos de este proyecto..."
                  rows={3}
                  className="w-full bg-[#07090e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">Tipo de Proyecto</label>
                <select
                  value={newProjectForm.type}
                  onChange={e => setNewProjectForm({...newProjectForm, type: e.target.value})}
                  className="w-full bg-[#07090e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono appearance-none"
                >
                  <option value="personal">Proyecto Propio (Manual)</option>
                  <option value="automatic">Proyecto Automático (Gestión IA)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                >
                  Crear Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
