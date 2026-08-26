import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Sparkles, 
  Brain, 
  Gauge, 
  Clock, 
  Layers, 
  Zap, 
  Activity, 
  Check, 
  X, 
  Compass, 
  Cpu, 
  Globe, 
  Flame, 
  Network, 
  User, 
  CheckCircle2, 
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Search,
  Timer,
  Lock,
  Code2,
  FileArchive,
  Wand2,
  Boxes,
  Terminal
} from 'lucide-react';
import { PRESET_PERSONALITIES } from './PersonalitiesView';

export const RESPONSE_STYLES = [
  { id: 'analytical', label: 'Analítico & Profundo', icon: Brain, desc: 'Desglose exhaustivo, rigor formal y fundamentación.' },
  { id: 'concise', label: 'Conciso & Directo', icon: Zap, desc: 'Respuestas ejecutivas, viñetas breves y acción inmediata.' },
  { id: 'technical_code', label: 'Técnico & Código', icon: Cpu, desc: 'Scripts completos, arquitectura limpia y bajo nivel.' },
  { id: 'multimodal_visual', label: 'Multimodal 2D/3D', icon: Sparkles, desc: 'Gráficas interactivas, WebGL 3D, Canvas y WebAudio.' },
  { id: 'didactic', label: 'Didáctico & Pedagógico', icon: Compass, desc: 'Explicación paso a paso con analogías y ejemplos.' },
  { id: 'creative', label: 'Creativo & Ciberdélico', icon: Flame, desc: 'Visión futurista, poesía algorítmica y calidez lírica.' }
];

export default function MessagePreferencesModal({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
  personalities = PRESET_PERSONALITIES,
  cerebros = []
}) {
  const [prefs, setPrefs] = useState({
    personaId: 'astraura_prime',
    brainId: 'brain_genesis',
    responseStyle: 'analytical',
    maxLengthChars: 4000,
    maxTimeSecs: 30,
    speedPriority: 80,
    volumePriority: 70,
    qualityPriority: 85,
    qualitySteps: 2,
    autoTuneForTask: true,
    // Web Data & Deep Research Preferences (OpenHands / Kilo Code style)
    webDataEnabled: true,
    deepResearchDepth: 'standard', // 'quick', 'standard', 'deep'
    deepResearchMins: 1,
    codeEngineeringMode: true,
    ...preferences
  });

  useEffect(() => {
    if (preferences) {
      setPrefs(prev => ({ ...prev, ...preferences }));
    }
  }, [preferences]);

  // Real-Time Intelligent Estimated Time Calculator
  const calculateEstimatedMetrics = () => {
    const chars = prefs.maxLengthChars || 4000;
    const estTokens = Math.round(chars / 4);
    const speedFactor = (prefs.speedPriority || 80) / 100.0;
    const qualitySteps = prefs.qualitySteps || (prefs.qualityPriority > 80 ? 3 : 2);
    
    // Apple M1 baseline inference rate on ternary BitNet: ~60 tokens/sec
    const baseTps = 55 + (speedFactor * 35); // 55 to 90 tokens/sec
    const generationTimeSec = (estTokens / baseTps);
    const deliberationTimeSec = 0.3 * qualitySteps;
    const researchExtraSec = prefs.webDataEnabled 
      ? (prefs.deepResearchDepth === 'quick' ? 3 : (prefs.deepResearchDepth === 'standard' ? 12 : (prefs.deepResearchMins || 1) * 60))
      : 0;

    const totalTimeSec = (generationTimeSec + deliberationTimeSec + researchExtraSec).toFixed(1);

    return {
      estimatedSeconds: totalTimeSec,
      estimatedTokens: estTokens,
      tpsRate: Math.round(baseTps),
      deliberationSteps: qualitySteps,
      researchTime: researchExtraSec > 0 ? `${researchExtraSec}s` : '0s (Local)',
      efficiencyRating: "Ultra Alta (Aritmética Ternaria ARM NEON)"
    };
  };

  const metrics = calculateEstimatedMetrics();

  const handleSave = () => {
    onSavePreferences(prefs);
    onClose();
  };

  const handleResetDefaults = () => {
    setPrefs({
      personaId: 'astraura_prime',
      brainId: 'brain_genesis',
      responseStyle: 'analytical',
      maxLengthChars: 4000,
      maxTimeSecs: 30,
      speedPriority: 80,
      volumePriority: 70,
      qualityPriority: 85,
      qualitySteps: 2,
      autoTuneForTask: true,
      webDataEnabled: true,
      deepResearchDepth: 'standard',
      deepResearchMins: 1,
      codeEngineeringMode: true
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#0b0e17] border border-cyan-500/30 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in text-xs font-sans">
        {/* Modal Header */}
        <div className="p-4 bg-[#0e121e] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                Configurador de Preferencias de Mensaje & Inferencia
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  1.58-Bit Triad
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Ajuste fino de arquetipo, cerebro, uso de internet, investigación profunda y codificación.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 font-sans">
          
          {/* SECTION 1: USO DE DATOS DE INTERNET & INVESTIGACIÓN PROFUNDA */}
          <div className="p-4 bg-gradient-to-r from-[#0c1424] to-[#120d20] rounded-xl border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className={`w-4 h-4 ${prefs.webDataEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Uso de Datos de Internet & Sitios Web Agenticos
                </span>
              </div>
              <button
                onClick={() => setPrefs({ ...prefs, webDataEnabled: !prefs.webDataEnabled })}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  prefs.webDataEnabled
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {prefs.webDataEnabled ? (
                  <>
                    <Globe className="w-3 h-3" /> Encendido (Por defecto)
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" /> Solo Datos Locales
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 font-mono">
              {prefs.webDataEnabled
                ? '🌐 Permite que Astraura navegue, consulte repositorios (OpenHands, Kilo Code, OpenCode) y extraiga documentación en tiempo real como referencias para cada respuesta.'
                : '🔒 Modo aislado: La IA solo utilizará la memoria local del equipo y los archivos del dispositivo sin salir a internet.'}
            </p>

            {/* Deep Research Depth & Time Leveler */}
            {prefs.webDataEnabled && (
              <div className="pt-2 border-t border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-cyan-300 font-bold flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" /> Nivelador de Investigación Web Profunda:
                  </span>
                  <span className="text-slate-300 font-bold">
                    {prefs.deepResearchDepth === 'quick' ? '⚡ Rápida (5 seg)' : prefs.deepResearchDepth === 'standard' ? '🔍 Estándar (30 seg)' : `🧠 Profunda (${prefs.deepResearchMins} min)`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPrefs({ ...prefs, deepResearchDepth: 'quick' })}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      prefs.deepResearchDepth === 'quick'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                        : 'bg-black/40 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-[11px]">⚡ Rápida</div>
                    <div className="text-[9px] text-slate-500">~5s (1-3 fuentes)</div>
                  </button>

                  <button
                    onClick={() => setPrefs({ ...prefs, deepResearchDepth: 'standard' })}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      prefs.deepResearchDepth === 'standard'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                        : 'bg-black/40 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-[11px]">🔍 Estándar</div>
                    <div className="text-[9px] text-slate-500">~30s (Multi-fuente)</div>
                  </button>

                  <button
                    onClick={() => setPrefs({ ...prefs, deepResearchDepth: 'deep' })}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      prefs.deepResearchDepth === 'deep'
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold'
                        : 'bg-black/40 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-[11px]">🧠 Profunda</div>
                    <div className="text-[9px] text-slate-500">Multi-minutos CoT</div>
                  </button>
                </div>

                {prefs.deepResearchDepth === 'deep' && (
                  <div className="p-2.5 bg-black/40 rounded-lg space-y-1.5 border border-purple-500/30">
                    <div className="flex justify-between text-[10px] font-mono text-purple-300">
                      <span>Tiempo asignado para investigación exhaustiva:</span>
                      <span className="font-bold">{prefs.deepResearchMins} minutos</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={prefs.deepResearchMins || 1}
                      onChange={(e) => setPrefs({ ...prefs, deepResearchMins: parseInt(e.target.value) })}
                      className="w-full accent-purple-400"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-slate-500">
                      <span>1 min (Revisión de repos)</span>
                      <span>3 min (Síntesis cruzada)</span>
                      <span>5 min (Auditoría completa)</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: HABILIDADES DE INGENIERÍA DE CÓDIGO (OpenHands / Kilo Code / OpenCode) */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                Habilidades de Programación Profesional (OpenHands / Kilo Code 1.58b)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">
                ACTIVO
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-slate-300 flex items-center gap-1.5">
                <Check className="w-3 h-3 text-cyan-400" /> Multi-Archivo IDE
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-slate-300 flex items-center gap-1.5">
                <Check className="w-3 h-3 text-cyan-400" /> Three.js / Canvas
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-slate-300 flex items-center gap-1.5">
                <Check className="w-3 h-3 text-cyan-400" /> Host M1 (C++/Rust)
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-slate-300 flex items-center gap-1.5">
                <Check className="w-3 h-3 text-cyan-400" /> Exportación ZIP
              </div>
            </div>
          </div>

          {/* SECTION 3: PERSONALIDAD Y CEREBRO ACTIVO (SOPORTE MULTI-PERSONALIDAD SIMULTÁNEA) */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Orquestación de Personalidades (Individual, Grupal o Coral)
              </span>
              <div className="flex gap-1">
                {['single', 'multi_dialogue', 'coral_synthesis'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPrefs({ ...prefs, multi_personality_mode: m })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                      (prefs.multi_personality_mode || 'single') === m
                        ? 'bg-purple-500 text-white font-bold shadow-sm'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m === 'single' ? 'Individual' : m === 'multi_dialogue' ? 'Diálogo Grupal' : 'Síntesis Coral'}
                  </button>
                ))}
              </div>
            </div>

            {prefs.multi_personality_mode === 'single' || !prefs.multi_personality_mode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Personality Selector */}
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    Personalidad Principal
                  </label>
                  <select
                    value={prefs.personaId}
                    onChange={(e) => setPrefs({ ...prefs, personaId: e.target.value })}
                    className="w-full p-2 rounded-lg bg-black/60 border border-white/10 text-white font-medium text-xs"
                  >
                    {personalities.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.title || 'Arquetipo'})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 block font-mono truncate">
                    {personalities.find(p => p.id === prefs.personaId)?.description || 'Núcleo cognitivo seleccionado.'}
                  </span>
                </div>

                {/* Brain Selector */}
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    Cerebro / Exocórtex Fuente
                  </label>
                  <select
                    value={prefs.brainId}
                    onChange={(e) => setPrefs({ ...prefs, brainId: e.target.value })}
                    className="w-full p-2 rounded-lg bg-black/60 border border-white/10 text-white font-medium text-xs"
                  >
                    {cerebros.length > 0 ? (
                      cerebros.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="brain_genesis">Cerebro Génesis (Ontocracia & Soberanía)</option>
                        <option value="brain_hephaestus">Cerebro Hephaestus (Hardware & C++)</option>
                        <option value="brain_hermes">Cerebro Hermes (Explorador Web)</option>
                      </>
                    )}
                  </select>
                  <span className="text-[10px] text-slate-400 block font-mono truncate">
                    Define qué capas biológicas (.md) suministran memoria a la respuesta.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 bg-black/40 p-3.5 rounded-xl border border-purple-500/30">
                <div className="flex items-center justify-between text-[11px] font-mono text-purple-300">
                  <span>Selecciona qué personalidades responderán juntas o menciona con @Nombre:</span>
                  <span className="text-cyan-400 font-bold">
                    {(prefs.selected_personalities || ['astraura_prime', 'hephaestus']).length} activas
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {personalities.map((p) => {
                    const currentSelected = prefs.selected_personalities || ['astraura_prime', 'hephaestus'];
                    const isChecked = currentSelected.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const next = isChecked
                            ? currentSelected.filter(id => id !== p.id)
                            : [...currentSelected, p.id];
                          setPrefs({ ...prefs, selected_personalities: next.length > 0 ? next : [p.id] });
                        }}
                        className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all text-[11px] ${
                          isChecked
                            ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-sm'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${isChecked ? 'bg-purple-500 border-purple-400 text-white' : 'border-white/20'}`}>
                          {isChecked && <Check className="w-2.5 h-2.5" />}
                        </div>
                        <span className="truncate font-medium">{p.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  💡 Tip: Puedes solicitar en cualquier momento en el chat <i>"Génesis y Hermione respondan..."</i> o usar <i>@Hephaestus @Atenea</i> para convocar personalidades al vuelo.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 4: ESTILO DE RESPUESTA PREFERIDA */}
          <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2.5">
            <label className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Tipo de Respuesta Preferida
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {RESPONSE_STYLES.map((style) => {
                const IconComponent = style.icon;
                const isSelected = prefs.responseStyle === style.id;

                return (
                  <div
                    key={style.id}
                    onClick={() => setPrefs({ ...prefs, responseStyle: style.id })}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500/50 shadow-md shadow-cyan-950/40 text-white'
                        : 'bg-black/40 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <IconComponent className={`w-4 h-4 ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`} />
                      {isSelected && <Check className="w-3 h-3 text-cyan-300" />}
                    </div>
                    <span className="font-bold text-[11px]">{style.label}</span>
                    <span className="text-[9px] text-slate-500 line-clamp-2 leading-tight">{style.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 5: LÍMITES DE LONGITUD Y TIEMPO MÁXIMO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Max Length */}
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-pink-400" />
                  Longitud Máxima Aprox.
                </span>
                <span className="text-pink-300 font-mono font-bold">{prefs.maxLengthChars} caracteres</span>
              </div>
              <input
                type="range"
                min="500"
                max="16000"
                step="500"
                value={prefs.maxLengthChars}
                onChange={(e) => setPrefs({ ...prefs, maxLengthChars: parseInt(e.target.value) })}
                className="w-full accent-pink-400"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>500 (Breve)</span>
                <span>4,000 (Estándar)</span>
                <span>16,000 (Exhaustivo)</span>
              </div>
            </div>

            {/* Max Time */}
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Tiempo Límite de Inferencia
                </span>
                <span className="text-amber-300 font-mono font-bold">{prefs.maxTimeSecs} segundos</span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={prefs.maxTimeSecs}
                onChange={(e) => setPrefs({ ...prefs, maxTimeSecs: parseInt(e.target.value) })}
                className="w-full accent-amber-400"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>5s (Instantáneo)</span>
                <span>30s (Balanceado)</span>
                <span>120s (Profundo)</span>
              </div>
            </div>
          </div>

          {/* SECTION 6: NIVELADORES BALANCEADOS TRIÁDICOS (Velocidad, Cantidad, Calidad) */}
          <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-3">
            <h4 className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Niveladores Triádicos de Prioridad & Calidad
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Speed Priority */}
              <div className="p-2.5 bg-black/40 rounded-lg space-y-1.5 border border-white/5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-cyan-300 font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Velocidad
                  </span>
                  <span className="text-white font-bold">{prefs.speedPriority}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={prefs.speedPriority}
                  onChange={(e) => setPrefs({ ...prefs, speedPriority: parseInt(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
                <span className="text-[9px] text-slate-400 block leading-tight">1 pasada directa SIMD</span>
              </div>

              {/* Volume Priority */}
              <div className="p-2.5 bg-black/40 rounded-lg space-y-1.5 border border-white/5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-purple-300 font-bold flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Cantidad
                  </span>
                  <span className="text-white font-bold">{prefs.volumePriority}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={prefs.volumePriority}
                  onChange={(e) => setPrefs({ ...prefs, volumePriority: parseInt(e.target.value) })}
                  className="w-full accent-purple-400"
                />
                <span className="text-[9px] text-slate-400 block leading-tight">Extensión de contexto</span>
              </div>

              {/* Quality Priority */}
              <div className="p-2.5 bg-black/40 rounded-lg space-y-1.5 border border-white/5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Calidad (CoT)
                  </span>
                  <span className="text-white font-bold">{prefs.qualityPriority}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={prefs.qualityPriority}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const steps = val > 80 ? 3 : val > 50 ? 2 : 1;
                    setPrefs({ ...prefs, qualityPriority: val, qualitySteps: steps });
                  }}
                  className="w-full accent-emerald-400"
                />
                <span className="text-[9px] text-slate-400 block leading-tight">
                  {prefs.qualitySteps} pasos de auto-refinamiento
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 6.5: CONFIGURACIÓN PREDETERMINADA DEL CHAT (Astraura 1.58b) */}
          <div className="p-3.5 bg-indigo-950/20 border border-indigo-500/20 rounded-xl space-y-3">
            <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider block">
              🧬 Configuración Predeterminada del Chat (editable)
            </span>
            <div>
              <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                System Prompt base del chat
              </label>
              <textarea
                value={prefs.systemPrompt || ''}
                onChange={(e) => setPrefs({ ...prefs, systemPrompt: e.target.value })}
                rows={4}
                placeholder="Eres Astraura, el núcleo cognitivo soberano de StarSeed OS en arquitectura de 1.58 bits…"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[11px] text-slate-200 font-mono resize-y focus:border-indigo-400 outline-none"
              />
              <span className="text-[9px] text-slate-400 block mt-1">
                Define la personalidad y directivas del asistente para este chat. Se aplica al enviar mensajes.
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-slate-300 font-semibold">
                  Temperatura del motor: <span className="text-indigo-300 font-mono">{prefs.temperature ?? 0.7}</span>
                </label>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={prefs.temperature ?? 0.7}
                onChange={(e) => setPrefs({ ...prefs, temperature: parseFloat(e.target.value) })}
                className="w-full accent-indigo-400"
              />
              <span className="text-[9px] text-slate-400 block mt-1">
                0 = determinista y preciso · 1 = creativo y diverso.
              </span>
            </div>
          </div>

          {/* SECTION 7: MÉTRICAS ESTIMADAS EN TIEMPO REAL */}
          <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-2">
            <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider block">
              📊 Estimación Cognitiva en Tiempo Real (Apple Silicon M1):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
              <div className="p-2 rounded bg-black/40">
                <div className="text-slate-400 text-[9px]">Tiempo Total Est.</div>
                <div className="text-cyan-300 font-bold text-xs">{metrics.estimatedSeconds} s</div>
              </div>
              <div className="p-2 rounded bg-black/40">
                <div className="text-slate-400 text-[9px]">Tokens Est.</div>
                <div className="text-purple-300 font-bold text-xs">~{metrics.estimatedTokens}</div>
              </div>
              <div className="p-2 rounded bg-black/40">
                <div className="text-slate-400 text-[9px]">Tasa de Inferencia</div>
                <div className="text-emerald-300 font-bold text-xs">{metrics.tpsRate} TPS</div>
              </div>
              <div className="p-2 rounded bg-black/40">
                <div className="text-slate-400 text-[9px]">Búsqueda Web</div>
                <div className="text-amber-300 font-bold text-xs">{metrics.researchTime}</div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0e121e] border-t border-white/10 flex items-center justify-between">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 font-mono text-[11px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer Valores
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20"
            >
              <Check className="w-4 h-4" />
              Aplicar Preferencias
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
