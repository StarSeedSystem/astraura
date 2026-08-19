import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  FolderTree, 
  Terminal, 
  Activity, 
  Globe, 
  BookOpen, 
  Network, 
  Cpu, 
  Code, 
  DownloadCloud, 
  Volume2, 
  Check, 
  Layers, 
  ExternalLink 
} from 'lucide-react';
import { fetchSkillsCatalog, toggleSkill } from '../services/api';

const ICON_MAP = {
  RefreshCw: RefreshCw,
  FolderTree: FolderTree,
  Terminal: Terminal,
  Activity: Activity,
  Globe: Globe,
  BookOpen: BookOpen,
  Network: Network,
  Cpu: Cpu,
  Code: Code,
  DownloadCloud: DownloadCloud,
  Volume2: Volume2,
  Sparkles: Sparkles
};

export default function StarSeedLibrary() {
  const [skills, setSkills] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [isLoading, setIsLoading] = useState(false);

  const loadSkills = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSkillsCatalog();
      setSkills(data.skills || []);
      setActiveCount(data.active_count || 0);
    } catch (err) {
      console.error('Error loading skills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const handleToggle = async (skillId, currentStatus) => {
    const newStatus = !currentStatus;
    // Optimistic update
    setSkills((prev) =>
      prev.map((s) => (s.id === skillId ? { ...s, enabled: newStatus } : s))
    );
    try {
      await toggleSkill(skillId, newStatus);
      const active = skills.filter((s) => (s.id === skillId ? newStatus : s.enabled)).length;
      setActiveCount(active);
    } catch (err) {
      console.error('Error toggling skill:', err);
      loadSkills();
    }
  };

  const categories = ['Todas', ...new Set(skills.map((s) => s.category))];

  const filteredSkills = selectedCategory === 'Todas'
    ? skills
    : skills.filter((s) => s.category === selectedCategory);

  return (
    <div className="flex flex-col h-full bg-[#08090d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              Biblioteca de Habilidades StarSeed OS
            </h2>
            <a
              href="https://starseed-os.vercel.app/library"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-400/80 hover:text-cyan-300 flex items-center gap-1 font-mono"
            >
              <span>starseed-os.vercel.app/library</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs text-slate-400">
            Habilidades de fábrica integradas por defecto en Astraura para capacidades profesionales completas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            {activeCount} / {skills.length} Habilidades Activas
          </span>
          <button
            onClick={loadSkills}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat, i) => (
          <button
            key={i}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.map((skill) => {
          const IconComponent = ICON_MAP[skill.icon] || Sparkles;
          return (
            <div
              key={skill.id}
              className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                skill.enabled
                  ? 'glass-panel border-cyan-500/30 shadow-lg shadow-cyan-950/20'
                  : 'bg-white/[0.02] border-white/5 opacity-60'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-cyan-400" />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skill.enabled}
                      onChange={() => handleToggle(skill.id, skill.enabled)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500" />
                  </label>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider block mb-0.5">
                    {skill.category}
                  </span>
                  <h3 className="font-display font-bold text-sm text-white">
                    {skill.name}
                  </h3>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {skill.blurb}
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                <span className={skill.enabled ? 'text-emerald-400 flex items-center gap-1' : 'text-slate-500'}>
                  {skill.enabled && <Check className="w-3.5 h-3.5" />}
                  {skill.enabled ? 'Activa por defecto' : 'Deshabilitada'}
                </span>
                <span className="text-slate-500 text-[10px]">
                  ID: {skill.id}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
