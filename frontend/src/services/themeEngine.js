/**
 * Astraura Organic-Fluid Theme Engine (v5.0)
 * Proporciona 7 temas de diseño fluidos, orgánicos, metálicos, retrofuturistas y naturales:
 *  1. Cristal Líquido Fluido Orgánico (Bioluminiscente)
 *  2. Solarpunk Natural & Bio-Tecnología
 *  3. Neón Retrofuturista Ciberdélico
 *  4. Art Nouveau & Deco Sagrado
 *  5. Metálico Cromado Líquido & Titanio
 *  6. Cosmos Cuántico StarSeed (Oscuro Profundo)
 *  7. Luz Ecléctica Solar & Alquimia
 */

export const THEMES = [
  {
    id: 'liquid_glass',
    name: 'Cristal Líquido Bioluminiscente',
    shortName: 'Cristal Líquido',
    category: 'Orgánico / Fluido',
    description: 'Glassmorphism orgánico, ondas bioluminiscentes, prismas de agua cuántica y destellos cian/esmeralda.',
    icon: 'Droplet',
    colors: {
      primary: '#00f0ff',
      secondary: '#10b981',
      accent: '#a855f7',
      bgDark: '#050a12',
      cardBg: 'rgba(7, 18, 30, 0.75)',
      borderColor: 'rgba(0, 240, 255, 0.25)',
      glowColor: 'rgba(0, 240, 255, 0.35)'
    },
    fontDisplay: "'Outfit', sans-serif",
    badgeColor: 'from-cyan-500 to-emerald-400'
  },
  {
    id: 'solarpunk',
    name: 'Solarpunk Natural & Bio-Tecnología',
    shortName: 'Solarpunk',
    category: 'Naturaleza & Armonía',
    description: 'Verdes esmeralda, dorados solares, bambú ciberdélico, motivos botánicos y tecnología limpia en simbiosis.',
    icon: 'Sun',
    colors: {
      primary: '#10b981',
      secondary: '#eab308',
      accent: '#06b6d4',
      bgDark: '#05110b',
      cardBg: 'rgba(8, 26, 17, 0.75)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      glowColor: 'rgba(16, 185, 129, 0.35)'
    },
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
    colors: {
      primary: '#ec4899',
      secondary: '#00f0ff',
      accent: '#8b5cf6',
      bgDark: '#0e0618',
      cardBg: 'rgba(24, 10, 42, 0.8)',
      borderColor: 'rgba(236, 72, 153, 0.35)',
      glowColor: 'rgba(236, 72, 153, 0.4)'
    },
    fontDisplay: "'Space Grotesk', sans-serif",
    badgeColor: 'from-pink-500 to-cyan-400'
  },
  {
    id: 'art_nouveau_deco',
    name: 'Art Nouveau & Deco Sagrado',
    shortName: 'Art Nouveau',
    category: 'Geometría Sagrada / Clásico',
    description: 'Líneas sinuosas doradas, tipografía ornamental clásica, geometría sagrada, esmeralda y bronce pulido.',
    icon: 'Sparkles',
    colors: {
      primary: '#d97706',
      secondary: '#059669',
      accent: '#b45309',
      bgDark: '#0c0a07',
      cardBg: 'rgba(28, 22, 14, 0.8)',
      borderColor: 'rgba(217, 119, 6, 0.35)',
      glowColor: 'rgba(217, 119, 6, 0.3)'
    },
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
    colors: {
      primary: '#94a3b8',
      secondary: '#38bdf8',
      accent: '#64748b',
      bgDark: '#08090d',
      cardBg: 'rgba(18, 21, 28, 0.82)',
      borderColor: 'rgba(148, 163, 184, 0.3)',
      glowColor: 'rgba(56, 189, 248, 0.25)'
    },
    fontDisplay: "'Plus Jakarta Sans', sans-serif",
    badgeColor: 'from-slate-300 via-sky-300 to-slate-500'
  },
  {
    id: 'quantum_cosmos',
    name: 'Cosmos Cuántico StarSeed (Oscuro)',
    shortName: 'Cosmos Cuántico',
    category: 'Espacial / Cuántico',
    description: 'Negro abisal, nebulosas violetas, estrellas estroboscópicas y grafos sinápticos de 1.58 bits.',
    icon: 'Orbit',
    colors: {
      primary: '#a855f7',
      secondary: '#6366f1',
      accent: '#00f0ff',
      bgDark: '#030408',
      cardBg: 'rgba(13, 10, 26, 0.85)',
      borderColor: 'rgba(168, 85, 247, 0.3)',
      glowColor: 'rgba(168, 85, 247, 0.35)'
    },
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
    colors: {
      primary: '#b45309',
      secondary: '#0284c7',
      accent: '#d97706',
      bgDark: '#0f172a',
      cardBg: 'rgba(15, 23, 42, 0.85)',
      borderColor: 'rgba(217, 119, 6, 0.35)',
      glowColor: 'rgba(234, 179, 8, 0.25)'
    },
    fontDisplay: "'Italiana', serif",
    badgeColor: 'from-amber-300 to-cyan-400'
  }
];

class ThemeEngine {
  constructor() {
    this.currentTheme = this.getSavedTheme();
    this.listeners = [];
    this.applyTheme(this.currentTheme);
  }

  getSavedTheme() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('astraura_selected_theme');
      if (saved && THEMES.some(t => t.id === saved)) {
        return saved;
      }
    }
    return 'liquid_glass';
  }

  setTheme(themeId) {
    const found = THEMES.find(t => t.id === themeId);
    if (!found) return;

    this.currentTheme = themeId;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('astraura_selected_theme', themeId);
    }
    this.applyTheme(themeId);
    this._notify();
  }

  applyTheme(themeId) {
    if (typeof document === 'undefined') return;
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    const root = document.documentElement;

    root.setAttribute('data-theme', theme.id);
    root.style.setProperty('--bg-primary', theme.colors.bgDark);
    root.style.setProperty('--bg-glass', theme.colors.cardBg);
    root.style.setProperty('--accent-primary', theme.colors.primary);
    root.style.setProperty('--accent-secondary', theme.colors.secondary);
    root.style.setProperty('--border-glow', theme.colors.borderColor);
    root.style.setProperty('--box-glow', theme.colors.glowColor);
    root.style.setProperty('--font-display', theme.fontDisplay);
  }

  getCurrentThemeObj() {
    return THEMES.find(t => t.id === this.currentTheme) || THEMES[0];
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
