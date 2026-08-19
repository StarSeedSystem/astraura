import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Check, 
  Sparkles, 
  Sun, 
  Zap, 
  Droplet, 
  Shield, 
  Orbit, 
  SunDim, 
  X, 
  Sliders, 
  Brush, 
  Eye, 
  Plus, 
  Trash2, 
  Save, 
  Flame, 
  Activity, 
  RefreshCw,
  Layers,
  Wand2
} from 'lucide-react';
import { themeEngine } from '../services/themeEngine';

export default function ThemePickerModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('gallery'); // 'gallery' | 'customizer'
  const [themesList, setThemesList] = useState(() => themeEngine.getAllThemes());
  const [currentThemeObj, setCurrentThemeObj] = useState(() => themeEngine.getCurrentThemeObj());
  
  // Customizer State
  const [editingThemeId, setEditingThemeId] = useState(null);
  const [customName, setCustomName] = useState('Mi Tema Personalizado');
  const [customCategory, setCustomCategory] = useState('Personalizado');
  const [customPrimary, setCustomPrimary] = useState('#00f0ff');
  const [customSecondary, setCustomSecondary] = useState('#10b981');
  const [customAccent, setCustomAccent] = useState('#a855f7');
  const [customBgDark, setCustomBgDark] = useState('#050a12');
  const [customCardBg, setCustomCardBg] = useState('rgba(7, 18, 30, 0.85)');
  const [customBorderColor, setCustomBorderColor] = useState('rgba(0, 240, 255, 0.35)');
  const [customGlowColor, setCustomGlowColor] = useState('rgba(0, 240, 255, 0.4)');
  const [customFont, setCustomFont] = useState("'Outfit', sans-serif");
  const [customSurface, setCustomSurface] = useState('glass');
  const [saveNotice, setSaveNotice] = useState('');

  useEffect(() => {
    const unsub = themeEngine.subscribe((t) => {
      setCurrentThemeObj(t);
      setThemesList(themeEngine.getAllThemes());
    });
    return () => unsub();
  }, []);

  const handleSelect = (themeId) => {
    themeEngine.setTheme(themeId);
  };

  const handleStartNewCustom = () => {
    setEditingThemeId(null);
    setCustomName(`Tema Soberano ${themesList.filter(t => !t.isPreset).length + 1}`);
    setCustomCategory('Personalizado');
    setCustomPrimary('#00f0ff');
    setCustomSecondary('#8b5cf6');
    setCustomAccent('#ec4899');
    setCustomBgDark('#07090e');
    setCustomCardBg('rgba(14, 18, 28, 0.85)');
    setCustomBorderColor('rgba(0, 240, 255, 0.35)');
    setCustomGlowColor('rgba(0, 240, 255, 0.4)');
    setCustomFont("'Outfit', sans-serif");
    setCustomSurface('glass');
    setActiveTab('customizer');
  };

  const handleEditTheme = (theme) => {
    setEditingThemeId(theme.isPreset ? null : theme.id);
    setCustomName(theme.name + (theme.isPreset ? ' (Copia)' : ''));
    setCustomCategory(theme.category);
    setCustomPrimary(theme.colors.primary);
    setCustomSecondary(theme.colors.secondary);
    setCustomAccent(theme.colors.accent || '#a855f7');
    setCustomBgDark(theme.colors.bgDark);
    setCustomCardBg(theme.colors.cardBg);
    setCustomBorderColor(theme.colors.borderColor);
    setCustomGlowColor(theme.colors.glowColor);
    setCustomFont(theme.fontDisplay);
    setCustomSurface(theme.surfaceStyle || 'glass');
    setActiveTab('customizer');
  };

  const handleSaveCustom = () => {
    const newTheme = themeEngine.saveCustomTheme({
      id: editingThemeId || `custom_${Date.now()}`,
      name: customName || 'Tema Personalizado',
      shortName: customName.slice(0, 14),
      category: customCategory || 'Personalizado',
      icon: 'Palette',
      colors: {
        primary: customPrimary,
        secondary: customSecondary,
        accent: customAccent,
        bgDark: customBgDark,
        headerBg: `${customBgDark}f0`,
        cardBg: customCardBg,
        borderColor: customBorderColor,
        glowColor: customGlowColor,
        textColor: '#f8fafc'
      },
      fontDisplay: customFont,
      surfaceStyle: customSurface
    });

    setThemesList(themeEngine.getAllThemes());
    setSaveNotice('¡Tema guardado y aplicado en todo el sistema!');
    setTimeout(() => {
      setSaveNotice('');
      setActiveTab('gallery');
    }, 1200);
  };

  const handleDeleteTheme = (e, themeId) => {
    e.stopPropagation();
    themeEngine.deleteCustomTheme(themeId);
    setThemesList(themeEngine.getAllThemes());
  };

  const getThemeIcon = (iconName) => {
    switch (iconName) {
      case 'Droplet': return Droplet;
      case 'Sun': return Sun;
      case 'Zap': return Zap;
      case 'Sparkles': return Sparkles;
      case 'Shield': return Shield;
      case 'Orbit': return Orbit;
      case 'SunDim': return SunDim;
      case 'Flame': return Flame;
      case 'Activity': return Activity;
      default: return Palette;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fade-in font-sans">
      <div className="bg-[#0b0e17] border border-cyan-500/30 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col font-mono text-xs">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-cyan-950/30 to-transparent sticky top-0 z-10 bg-[#0b0e17]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-purple-500 to-cyan-400 p-[1px] shadow-lg shrink-0">
              <div className="w-full h-full bg-[#0b0e17] rounded-[15px] flex items-center justify-center text-cyan-300">
                <Palette className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-display flex items-center gap-2">
                Galería & Diseñador de Temas Visuales 1.58-Bit
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-sans">
                Personaliza la atmósfera cromática, tipografía y estilo de todo el sistema operativo.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-black/40 border-b border-white/5 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                activeTab === 'gallery'
                  ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200 shadow-md'
                  : 'bg-white/5 border border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Temas Disponibles ({themesList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('customizer')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                activeTab === 'customizer'
                  ? 'bg-purple-500/25 border border-purple-400 text-purple-200 shadow-md'
                  : 'bg-white/5 border border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Brush className="w-3.5 h-3.5" />
              <span>{editingThemeId ? 'Editar Tema' : 'Crear Nuevo Tema'}</span>
            </button>
          </div>

          {activeTab === 'gallery' && (
            <button
              onClick={handleStartNewCustom}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-slate-950 font-bold flex items-center gap-1 shadow-sm hover:opacity-95 cursor-pointer text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuevo Tema</span>
            </button>
          )}
        </div>

        {/* Tab 1: Gallery */}
        {activeTab === 'gallery' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {themesList.map((theme) => {
                const Icon = getThemeIcon(theme.icon);
                const isSelected = currentThemeObj?.id === theme.id;

                return (
                  <div
                    key={theme.id}
                    onClick={() => handleSelect(theme.id)}
                    className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden ${
                      isSelected
                        ? 'border-cyan-400 shadow-2xl shadow-cyan-500/20 ring-1 ring-cyan-400'
                        : 'border-white/10 hover:border-white/25 hover:bg-white/5'
                    }`}
                    style={{
                      backgroundColor: theme.colors.cardBg
                    }}
                  >
                    {/* Active & Edit Buttons */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {isSelected && (
                        <div className="flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-bold shadow-md">
                          <Check className="w-3 h-3" /> Activo
                        </div>
                      )}
                      
                      {!theme.isPreset && (
                        <button
                          onClick={(e) => handleDeleteTheme(e, theme.id)}
                          className="p-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
                          title="Eliminar tema personalizado"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTheme(theme);
                        }}
                        className="p-1 rounded-lg bg-white/10 text-slate-300 hover:text-white border border-white/10"
                        title="Editar o duplicar este tema"
                      >
                        <Brush className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1.5 pr-20">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-9 h-9 rounded-2xl flex items-center justify-center border shadow-md shrink-0"
                          style={{ 
                            backgroundColor: `${theme.colors.primary}25`, 
                            borderColor: `${theme.colors.primary}60`, 
                            color: theme.colors.primary 
                          }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xs sm:text-sm text-white truncate max-w-[200px]" style={{ fontFamily: theme.fontDisplay }}>
                            {theme.name}
                          </h3>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {theme.category} {!theme.isPreset && '• Personalizado'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans line-clamp-2">
                        {theme.description}
                      </p>
                    </div>

                    {/* Color Palette & Font Sample */}
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Paleta Cromática:</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: theme.colors.primary }} title="Primario" />
                          <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: theme.colors.secondary }} title="Secundario" />
                          <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: theme.colors.accent }} title="Acento" />
                          <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: theme.colors.bgDark }} title="Fondo" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Tipografía:</span>
                        <span className="text-white font-bold" style={{ fontFamily: theme.fontDisplay }}>
                          {theme.fontDisplay.split(',')[0].replace(/'/g, '')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Customizer & Theme Creator */}
        {activeTab === 'customizer' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {saveNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-center animate-fade-in">
                {saveNotice}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Controls Column */}
              <div className="lg:col-span-7 space-y-4">
                {/* Name & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Nombre del Tema:</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 outline-none font-sans font-bold"
                      placeholder="Ej: Cristal de Zafiro M1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Categoría:</label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 outline-none font-sans"
                      placeholder="Ej: Neón Cuántico"
                    />
                  </div>
                </div>

                {/* Color Pickers Grid */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <h4 className="text-[11px] font-bold text-cyan-300 uppercase">Espectro de Colores del UI:</h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Primary Color */}
                    <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                      <span className="text-[10px] text-slate-400 block font-sans font-medium">Color Primario:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customPrimary}
                          onChange={(e) => setCustomPrimary(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={customPrimary}
                          onChange={(e) => setCustomPrimary(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Secondary Color */}
                    <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                      <span className="text-[10px] text-slate-400 block font-sans font-medium">Color Secundario:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customSecondary}
                          onChange={(e) => setCustomSecondary(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={customSecondary}
                          onChange={(e) => setCustomSecondary(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Accent Color */}
                    <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                      <span className="text-[10px] text-slate-400 block font-sans font-medium">Tercer Acento:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customAccent}
                          onChange={(e) => setCustomAccent(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={customAccent}
                          onChange={(e) => setCustomAccent(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Background Dark */}
                    <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                      <span className="text-[10px] text-slate-400 block font-sans font-medium">Fondo Profundo:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customBgDark}
                          onChange={(e) => setCustomBgDark(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={customBgDark}
                          onChange={(e) => setCustomBgDark(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Surface Style */}
                    <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1.5 col-span-2 sm:col-span-2">
                      <span className="text-[10px] text-slate-400 block font-sans font-medium">Textura Superficie:</span>
                      <div className="grid grid-cols-3 gap-1">
                        {['glass', 'neon', 'metallic', 'natural', 'minimal', 'ornamental'].map((st) => (
                          <button
                            key={st}
                            onClick={() => setCustomSurface(st)}
                            className={`py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${
                              customSurface === st
                                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400'
                                : 'bg-black/50 text-slate-400 border border-white/5'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Typography Selector */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <span className="text-[10px] text-slate-400 block">Familia Tipográfica Principal:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { name: 'Outfit (Moderno)', font: "'Outfit', sans-serif" },
                      { name: 'Space Grotesk (Ciber)', font: "'Space Grotesk', sans-serif" },
                      { name: 'Syne (Orgánico)', font: "'Syne', sans-serif" },
                      { name: 'Jakarta (Técnico)', font: "'Plus Jakarta Sans', sans-serif" },
                      { name: 'Cinzel (Sagrado)', font: "'Cinzel Decorative', serif" },
                      { name: 'Italiana (Luz)', font: "'Italiana', serif" }
                    ].map((f) => (
                      <button
                        key={f.font}
                        onClick={() => setCustomFont(f.font)}
                        className={`p-2 rounded-xl text-left text-xs transition-all ${
                          customFont === f.font
                            ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200'
                            : 'bg-black/40 border border-white/5 text-slate-400 hover:text-white'
                        }`}
                        style={{ fontFamily: f.font }}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Column */}
              <div className="lg:col-span-5 flex flex-col space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  Previsualización en Vivo de Componentes
                </span>

                <div 
                  className="p-5 rounded-3xl border transition-all flex-1 flex flex-col justify-between space-y-4 shadow-xl"
                  style={{
                    backgroundColor: customBgDark,
                    borderColor: `${customPrimary}50`,
                    boxShadow: `0 0 24px ${customPrimary}30`
                  }}
                >
                  {/* Mock Card */}
                  <div 
                    className="p-4 rounded-2xl border space-y-2 backdrop-blur-md"
                    style={{
                      backgroundColor: customCardBg,
                      borderColor: `${customPrimary}40`,
                      boxShadow: `0 8px 24px ${customGlowColor}`
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white" style={{ fontFamily: customFont }}>
                        {customName || 'Astraura 1.58b'}
                      </h4>
                      <span 
                        className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
                        style={{
                          backgroundColor: `${customPrimary}25`,
                          color: customPrimary,
                          border: `1px solid ${customPrimary}60`
                        }}
                      >
                        {customCategory}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-200 font-sans leading-relaxed">
                      El motor cognitivo 1.58 bits procesa conocimiento cuántico y voz adaptativa en tiempo real.
                    </p>

                    <div className="flex items-center gap-2 pt-2">
                      <button 
                        className="px-3 py-1 rounded-xl text-slate-950 font-bold text-xs shadow"
                        style={{ backgroundColor: customPrimary }}
                      >
                        Botón Primario
                      </button>
                      <button 
                        className="px-3 py-1 rounded-xl text-white font-bold text-xs border"
                        style={{ borderColor: customSecondary, color: customSecondary }}
                      >
                        Secundario
                      </button>
                    </div>
                  </div>

                  {/* Color Palette Indicators */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/50 border border-white/10">
                    <span className="text-[10px] text-slate-400">Degradado Clave:</span>
                    <div 
                      className="h-3.5 w-28 rounded-full shadow-inner"
                      style={{
                        background: `linear-gradient(to right, ${customPrimary}, ${customSecondary}, ${customAccent})`
                      }}
                    />
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveCustom}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 hover:opacity-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar y Aplicar Tema en el Sistema</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/40 flex items-center justify-between sticky bottom-0 z-10">
          <span className="text-[10px] sm:text-[11px] text-slate-400">
            Astraura Multi-Atmosphere Theme Engine v6.0
          </span>
          <button
            onClick={onClose}
            className="px-5 sm:px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 cursor-pointer text-xs"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
