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
  Eye 
} from 'lucide-react';
import { THEMES, themeEngine } from '../services/themeEngine';

export default function ThemePickerModal({ isOpen, onClose }) {
  const [activeTheme, setActiveTheme] = useState(themeEngine.currentTheme);

  useEffect(() => {
    const unsub = themeEngine.subscribe((t) => setActiveTheme(t.id));
    return () => unsub();
  }, []);

  const handleSelect = (themeId) => {
    themeEngine.setTheme(themeId);
    setActiveTheme(themeId);
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
      default: return Palette;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-[#0b0e17] border border-cyan-500/30 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-cyan-950/50 flex flex-col font-mono text-xs">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-cyan-950/30 to-transparent sticky top-0 z-10 bg-[#0b0e17]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500 to-cyan-400 p-[1px] shadow-lg">
              <div className="w-full h-full bg-[#0b0e17] rounded-[15px] flex items-center justify-center text-cyan-300">
                <Palette className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
                Galería de Estilos & Temas Visuales 1.58-Bit
              </h2>
              <p className="text-[11px] text-slate-400">
                Diseños orgánicos, cristal líquido, solarpunk, neón retro, art nouveau y titanio cromado.
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

        {/* Theme Cards Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {THEMES.map((theme) => {
            const Icon = getThemeIcon(theme.icon);
            const isSelected = activeTheme === theme.id;

            return (
              <div
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden ${
                  isSelected
                    ? 'border-cyan-400 shadow-2xl shadow-cyan-500/20 bg-gradient-to-b from-white/10 to-transparent ring-1 ring-cyan-400'
                    : 'border-white/10 bg-black/40 hover:border-white/25 hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: isSelected ? undefined : theme.colors.cardBg
                }}
              >
                {/* Active Indicator Banner */}
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-bold shadow-md">
                    <Check className="w-3 h-3" /> Activo
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-md"
                      style={{ 
                        backgroundColor: `${theme.colors.primary}20`, 
                        borderColor: `${theme.colors.primary}50`, 
                        color: theme.colors.primary 
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white" style={{ fontFamily: theme.fontDisplay }}>
                        {theme.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {theme.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {theme.description}
                  </p>
                </div>

                {/* Color Palette & Font Sample */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Paleta Cromática:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: theme.colors.primary }} title="Primario" />
                      <div className="w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: theme.colors.secondary }} title="Secundario" />
                      <div className="w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: theme.colors.accent }} title="Acento" />
                      <div className="w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: theme.colors.bgDark }} title="Fondo" />
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

        {/* Footer */}
        <div className="p-5 border-t border-white/10 bg-black/40 flex items-center justify-between sticky bottom-0 z-10">
          <span className="text-[11px] text-slate-400">
            Astraura 1.58b Theme Engine v5.0
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 cursor-pointer"
          >
            Aplicar & Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
