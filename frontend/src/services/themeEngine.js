/**
 * Astraura Sovereign Multi-Atmosphere Theme Engine (v6.0)
 * Proporciona 12 temas de diseño orgánicos, futuristas, hiper-lumínicos, OLED y personalizados:
 *  1. Cristal Líquido Bioluminiscente (Cian / Esmeralda Cuántico)
 *  2. Solarpunk Natural & Bio-Tecnología (Esmeralda / Oro Solar)
 *  3. Neón Retrofuturista Ciberdélico (Magenta / Cian Eléctrico)
 *  4. Rosa Aurora & Vacío Cósmico (Fucsia / Índigo / Alma Viva)
 *  5. Forja Solar Hephaestus (Ámbar / Oro Fundido / Titanio)
 *  6. Púrpura Imperial Atenea (Violeta Estratégico / Zafiro)
 *  7. Matriz Esmeralda Hermes (Verde Dinámico / Menta Cuántica)
 *  8. Art Nouveau & Deco Sagrado (Dorado Ornamental / Bronce)
 *  9. Metálico Cromado Líquido & Titanio (Plata Platino / Hielo)
 * 10. Cosmos Cuántico StarSeed (Negro Abisal / Nebulosa Púrpura)
 * 11. Luz Ecléctica Solar & Alquimia (Ámbar Solar / Cielo Cristalino)
 * 12. OLED Puro Abisal (Negro Puro #000000 / Neón Blanco & Cian)
 * + Soporte integral para Creación, Edición y Guardado de Temas Personalizados del Usuario.
 */

export const PRESET_THEMES = [
  {
    id: 'liquid_glass',
    name: 'Cristal Líquido Bioluminiscente',
    shortName: 'Cristal Líquido',
    category: 'Orgánico / Fluido',
    description: 'Glassmorphism orgánico, prismas de agua cuántica y destellos bioluminiscentes cian/esmeralda.',
    icon: 'Droplet',
    isPreset: true,
    colors: {
      primary: '#00f0ff',
      secondary: '#10b981',
      accent: '#a855f7',
      bgDark: '#050a12',
      headerBg: 'rgba(7, 14, 26, 0.92)',
      cardBg: 'rgba(7, 18, 30, 0.78)',
      borderColor: 'rgba(0, 240, 255, 0.28)',
      glowColor: 'rgba(0, 240, 255, 0.35)',
      textColor: '#f1f5f9'
    },
    surfaceStyle: 'glass',
    fontDisplay: "'Outfit', sans-serif",
    badgeColor: 'from-cyan-500 to-emerald-400'
  },
  {
    id: 'solarpunk',
    name: 'Solarpunk Natural & Bio-Tecnología',
    shortName: 'Solarpunk',
    category: 'Naturaleza & Armonía',
    description: 'Verdes esmeralda, dorados solares, bambú ciberdélico, motivos botánicos y tecnología limpia simbiótica.',
    icon: 'Sun',
    isPreset: true,
    colors: {
      primary: '#10b981',
      secondary: '#eab308',
      accent: '#06b6d4',
      bgDark: '#05110b',
      headerBg: 'rgba(7, 22, 14, 0.92)',
      cardBg: 'rgba(8, 26, 17, 0.78)',
      borderColor: 'rgba(16, 185, 129, 0.32)',
      glowColor: 'rgba(16, 185, 129, 0.38)',
      textColor: '#ecfdf5'
    },
    surfaceStyle: 'natural',
    fontDisplay: "'Syne', sans-serif",
    badgeColor: 'from-emerald-400 to-yellow-400'
  },
  {
    id: 'cyberdelic_neon',
    name: 'Neón Retrofuturista Ciberdélico',
    shortName: 'Neón Retro',
    category: 'Sintético / Alta Energía',
    description: 'Magenta neón, cian eléctrico, púrpura profundo, escaneo holográfico synthwave y rejillas retrofuturistas.',
    icon: 'Zap',
    isPreset: true,
    colors: {
      primary: '#ec4899',
      secondary: '#00f0ff',
      accent: '#8b5cf6',
      bgDark: '#0e0618',
      headerBg: 'rgba(20, 8, 34, 0.94)',
      cardBg: 'rgba(24, 10, 42, 0.82)',
      borderColor: 'rgba(236, 72, 153, 0.38)',
      glowColor: 'rgba(236, 72, 153, 0.45)',
      textColor: '#fdf2f8'
    },
    surfaceStyle: 'neon',
    fontDisplay: "'Space Grotesk', sans-serif",
    badgeColor: 'from-pink-500 to-cyan-400'
  },
  {
    id: 'aurora_void',
    name: 'Rosa Aurora & Alma Viva (Cálido)',
    shortName: 'Rosa Aurora',
    category: 'Sensorial & Empatía',
    description: 'Tonos rosa cuarzo, carmesí estelar, violetas suaves y resonancia armónica del Alma Viva.',
    icon: 'Sparkles',
    isPreset: true,
    colors: {
      primary: '#f43f5e',
      secondary: '#fb7185',
      accent: '#c084fc',
      bgDark: '#12050c',
      headerBg: 'rgba(28, 8, 18, 0.94)',
      cardBg: 'rgba(32, 10, 22, 0.82)',
      borderColor: 'rgba(244, 63, 94, 0.35)',
      glowColor: 'rgba(244, 63, 94, 0.42)',
      textColor: '#fff1f2'
    },
    surfaceStyle: 'glass',
    fontDisplay: "'Outfit', sans-serif",
    badgeColor: 'from-rose-500 to-pink-400'
  },
  {
    id: 'solar_forge',
    name: 'Forja Solar Hephaestus (Magma & Titanio)',
    shortName: 'Forja Solar',
    category: 'Fuego & Creación',
    description: 'Ámbar volcánico, oro fundido, destellos de fragua cuántica y armaduras de titanio bruñido.',
    icon: 'Flame',
    isPreset: true,
    colors: {
      primary: '#f59e0b',
      secondary: '#ef4444',
      accent: '#fbbf24',
      bgDark: '#120904',
      headerBg: 'rgba(28, 14, 6, 0.94)',
      cardBg: 'rgba(32, 16, 8, 0.82)',
      borderColor: 'rgba(245, 158, 11, 0.38)',
      glowColor: 'rgba(245, 158, 11, 0.45)',
      textColor: '#fffbeb'
    },
    surfaceStyle: 'metallic',
    fontDisplay: "'Plus Jakarta Sans', sans-serif",
    badgeColor: 'from-amber-500 to-red-500'
  },
  {
    id: 'imperial_violet',
    name: 'Púrpura Imperial Atenea (Estratégico)',
    shortName: 'Púrpura Imperial',
    category: 'Estrategia & Sabiduría',
    description: 'Púrpura real, zafiro estelar, orlas de platino y elegancia geométrica para deliberación profunda.',
    icon: 'Shield',
    isPreset: true,
    colors: {
      primary: '#8b5cf6',
      secondary: '#38bdf8',
      accent: '#a855f7',
      bgDark: '#090514',
      headerBg: 'rgba(18, 10, 36, 0.94)',
      cardBg: 'rgba(20, 12, 40, 0.82)',
      borderColor: 'rgba(139, 92, 246, 0.35)',
      glowColor: 'rgba(139, 92, 246, 0.42)',
      textColor: '#faf5ff'
    },
    surfaceStyle: 'glass',
    fontDisplay: "'Cinzel Decorative', serif",
    badgeColor: 'from-violet-500 to-cyan-400'
  },
  {
    id: 'emerald_matrix',
    name: 'Matriz Esmeralda Hermes (Hiper-Red)',
    shortName: 'Matriz Esmeralda',
    category: 'Redes & Dinamismo',
    description: 'Verde esmeralda cuántico, menta pulsante, cian orbital y telemetría de ultra-baja latencia.',
    icon: 'Activity',
    isPreset: true,
    colors: {
      primary: '#10b981',
      secondary: '#00f0ff',
      accent: '#34d399',
      bgDark: '#04100c',
      headerBg: 'rgba(6, 24, 18, 0.94)',
      cardBg: 'rgba(8, 28, 20, 0.82)',
      borderColor: 'rgba(16, 185, 129, 0.36)',
      glowColor: 'rgba(16, 185, 129, 0.44)',
      textColor: '#ecfdf5'
    },
    surfaceStyle: 'neon',
    fontDisplay: "'Space Grotesk', sans-serif",
    badgeColor: 'from-emerald-400 to-cyan-400'
  },
  {
    id: 'art_nouveau_deco',
    name: 'Art Nouveau & Deco Sagrado',
    shortName: 'Art Nouveau',
    category: 'Geometría Sagrada / Clásico',
    description: 'Líneas sinuosas doradas, tipografía ornamental clásica, geometría sagrada, esmeralda y bronce pulido.',
    icon: 'Sparkles',
    isPreset: true,
    colors: {
      primary: '#d97706',
      secondary: '#059669',
      accent: '#b45309',
      bgDark: '#0c0a07',
      headerBg: 'rgba(24, 18, 12, 0.94)',
      cardBg: 'rgba(28, 22, 14, 0.82)',
      borderColor: 'rgba(217, 119, 6, 0.35)',
      glowColor: 'rgba(217, 119, 6, 0.32)',
      textColor: '#fffbeb'
    },
    surfaceStyle: 'ornamental',
    fontDisplay: "'Cinzel Decorative', serif",
    badgeColor: 'from-amber-400 to-emerald-500'
  },
  {
    id: 'liquid_metallic',
    name: 'Metálico Cromado Líquido & Titanio',
    shortName: 'Metal Cromado',
    category: 'Industrial / Alta Precisión',
    description: 'Cromo líquido reflectante, titanio espacial pulido, reflejos iridiscentes, plata mate y texturas táctiles.',
    icon: 'Shield',
    isPreset: true,
    colors: {
      primary: '#94a3b8',
      secondary: '#38bdf8',
      accent: '#64748b',
      bgDark: '#08090d',
      headerBg: 'rgba(14, 17, 24, 0.94)',
      cardBg: 'rgba(18, 21, 28, 0.84)',
      borderColor: 'rgba(148, 163, 184, 0.32)',
      glowColor: 'rgba(56, 189, 248, 0.28)',
      textColor: '#f8fafc'
    },
    surfaceStyle: 'metallic',
    fontDisplay: "'Plus Jakarta Sans', sans-serif",
    badgeColor: 'from-slate-300 via-sky-300 to-slate-500'
  },
  {
    id: 'quantum_cosmos',
    name: 'Cosmos Cuántico StarSeed (Oscuro Abisal)',
    shortName: 'Cosmos Cuántico',
    category: 'Espacial / Cuántico',
    description: 'Negro abisal, nebulosas violetas, estrellas estroboscópicas y grafos sinápticos de 1.58 bits.',
    icon: 'Orbit',
    isPreset: true,
    colors: {
      primary: '#a855f7',
      secondary: '#6366f1',
      accent: '#00f0ff',
      bgDark: '#030408',
      headerBg: 'rgba(10, 7, 22, 0.95)',
      cardBg: 'rgba(13, 10, 26, 0.85)',
      borderColor: 'rgba(168, 85, 247, 0.32)',
      glowColor: 'rgba(168, 85, 247, 0.38)',
      textColor: '#faf5ff'
    },
    surfaceStyle: 'glass',
    fontDisplay: "'Outfit', sans-serif",
    badgeColor: 'from-purple-500 to-indigo-500'
  },
  {
    id: 'solar_alchemy',
    name: 'Luz Ecléctica Solar & Alquimia',
    shortName: 'Luz Alquimia',
    category: 'Luminoso / Cristalino',
    description: 'Modo diurno cálido con cuarzo prismático, pergamino luminoso, oro solar y reflejos celestiales.',
    icon: 'SunDim',
    isPreset: true,
    colors: {
      primary: '#b45309',
      secondary: '#0284c7',
      accent: '#d97706',
      bgDark: '#0f172a',
      headerBg: 'rgba(20, 30, 52, 0.94)',
      cardBg: 'rgba(15, 23, 42, 0.86)',
      borderColor: 'rgba(217, 119, 6, 0.35)',
      glowColor: 'rgba(234, 179, 8, 0.28)',
      textColor: '#fef3c7'
    },
    surfaceStyle: 'glass',
    fontDisplay: "'Italiana', serif",
    badgeColor: 'from-amber-300 to-cyan-400'
  },
  {
    id: 'oled_void',
    name: 'OLED Puro Abisal (True Black #000000)',
    shortName: 'OLED Puro',
    category: 'Minimalista & Máximo Contraste',
    description: 'Negro absoluto 0 nit, acentos blancos de titanio y cian puro para consumo cero en pantallas OLED.',
    icon: 'Orbit',
    isPreset: true,
    colors: {
      primary: '#00f0ff',
      secondary: '#ffffff',
      accent: '#a855f7',
      bgDark: '#000000',
      headerBg: '#050505',
      cardBg: 'rgba(8, 8, 8, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.18)',
      glowColor: 'rgba(0, 240, 255, 0.3)',
      textColor: '#ffffff'
    },
    surfaceStyle: 'minimal',
    fontDisplay: "'Space Grotesk', sans-serif",
    badgeColor: 'from-white to-cyan-400'
  }
];

class ThemeEngine {
  constructor() {
    this.customThemes = this._loadCustomThemes();
    this.currentThemeId = this._getSavedThemeId();
    this.listeners = [];
    this.applyTheme(this.currentThemeId);
  }

  _loadCustomThemes() {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('astraura_custom_themes');
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [];
  }

  _saveCustomThemes() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('astraura_custom_themes', JSON.stringify(this.customThemes));
      } catch {}
    }
  }

  _getSavedThemeId() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('astraura_selected_theme');
      if (saved && this.getAllThemes().some(t => t.id === saved)) {
        return saved;
      }
    }
    return 'liquid_glass';
  }

  getAllThemes() {
    return [...PRESET_THEMES, ...this.customThemes];
  }

  getThemeById(id) {
    return this.getAllThemes().find(t => t.id === id) || PRESET_THEMES[0];
  }

  getCurrentThemeObj() {
    return this.getThemeById(this.currentThemeId);
  }

  setTheme(themeId) {
    const found = this.getThemeById(themeId);
    if (!found) return;

    this.currentThemeId = themeId;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('astraura_selected_theme', themeId);
    }
    this.applyTheme(themeId);
    this._notify();
  }

  saveCustomTheme(themeData) {
    const id = themeData.id || `custom_${Date.now()}`;
    const newTheme = {
      ...themeData,
      id,
      isPreset: false,
      category: themeData.category || 'Personalizado por Usuario',
      colors: {
        primary: themeData.colors?.primary || '#00f0ff',
        secondary: themeData.colors?.secondary || '#10b981',
        accent: themeData.colors?.accent || '#a855f7',
        bgDark: themeData.colors?.bgDark || '#050a12',
        headerBg: themeData.colors?.headerBg || 'rgba(7, 14, 26, 0.92)',
        cardBg: themeData.colors?.cardBg || 'rgba(7, 18, 30, 0.78)',
        borderColor: themeData.colors?.borderColor || 'rgba(0, 240, 255, 0.3)',
        glowColor: themeData.colors?.glowColor || 'rgba(0, 240, 255, 0.35)',
        textColor: themeData.colors?.textColor || '#ffffff'
      },
      fontDisplay: themeData.fontDisplay || "'Outfit', sans-serif",
      surfaceStyle: themeData.surfaceStyle || 'glass',
      badgeColor: themeData.badgeColor || 'from-cyan-500 to-purple-500'
    };

    const existingIdx = this.customThemes.findIndex(t => t.id === id);
    if (existingIdx >= 0) {
      this.customThemes[existingIdx] = newTheme;
    } else {
      this.customThemes.push(newTheme);
    }
    this._saveCustomThemes();
    this.setTheme(id);
    return newTheme;
  }

  deleteCustomTheme(themeId) {
    this.customThemes = this.customThemes.filter(t => t.id !== themeId);
    this._saveCustomThemes();
    if (this.currentThemeId === themeId) {
      this.setTheme('liquid_glass');
    } else {
      this._notify();
    }
  }

  applyTheme(themeId) {
    if (typeof document === 'undefined') return;
    const theme = this.getThemeById(themeId);
    const root = document.documentElement;

    root.setAttribute('data-theme', theme.id);
    root.style.setProperty('--bg-primary', theme.colors.bgDark);
    root.style.setProperty('--bg-header', theme.colors.headerBg || theme.colors.bgDark);
    root.style.setProperty('--bg-glass', theme.colors.cardBg);
    root.style.setProperty('--accent-primary', theme.colors.primary);
    root.style.setProperty('--accent-secondary', theme.colors.secondary);
    root.style.setProperty('--accent-tertiary', theme.colors.accent);
    root.style.setProperty('--border-glow', theme.colors.borderColor);
    root.style.setProperty('--box-glow', theme.colors.glowColor);
    root.style.setProperty('--font-display', theme.fontDisplay);
    root.style.setProperty('--text-primary', theme.colors.textColor || '#ffffff');

    // Update body background
    if (document.body) {
      document.body.style.backgroundColor = theme.colors.bgDark;
      document.body.style.color = theme.colors.textColor || '#ffffff';
    }
  }

  subscribe(cb) {
    this.listeners.push(cb);
    cb(this.getCurrentThemeObj());
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  _notify() {
    const obj = this.getCurrentThemeObj();
    this.listeners.forEach(cb => {
      try { cb(obj); } catch {}
    });
  }
}

export const themeEngine = new ThemeEngine();
export const THEMES = themeEngine.getAllThemes();
