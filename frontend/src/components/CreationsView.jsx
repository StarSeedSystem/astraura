import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Layers,
  GitBranch,
  Play,
  RotateCcw,
  Sliders,
  Terminal,
  Activity,
  Cpu,
  Zap,
  HardDrive,
  RefreshCw,
  FileCode,
  FileText,
  Volume2,
  VolumeX,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  ExternalLink,
  ChevronRight,
  Filter,
  Plus,
  Maximize2,
  Minimize2,
  Box,
  Brain,
  History,
  Trash2,
  Compass,
  ArrowRight,
  TrendingUp,
  Percent,
  Clock,
  ShieldCheck,
  FolderTree,
  FolderOpen,
  Network
} from 'lucide-react';
import {
  fetchCreationsCatalog,
  executeCreationSample,
  forkCreationVersion,
  recycleCreationsStorage,
  fetchProjects,
  linkCreationProjects
} from '../services/api';

export default function CreationsView() {
  const [creations, setCreations] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [projectFilter, setProjectFilter] = useState('all');
  const [storageTelemetry, setStorageTelemetry] = useState(null);
  const [recyclingHistory, setRecyclingHistory] = useState([]);
  const [selectedCreationId, setSelectedCreationId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('gallery'); // 'gallery', 'timeline', 'simulation', 'logs', 'direct_links'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecycling, setIsRecycling] = useState(false);
  const [isRunningSample, setIsRunningSample] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Project Link Modal State
  const [isProjectLinkModalOpen, setIsProjectLinkModalOpen] = useState(false);
  const [targetCreationForLinking, setTargetCreationForLinking] = useState(null);
  const [selectedProjectIdsForLinking, setSelectedProjectIdsForLinking] = useState([]);

  // Timeline / Version State
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [isForkModalOpen, setIsForkModalOpen] = useState(false);
  const [forkForm, setForkForm] = useState({
    branch_name: '',
    diff_summary: '',
    new_content: ''
  });

  // GLSL WebGL Live Shader State
  const canvasRef = useRef(null);
  const glContextRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [entropyUniform, setEntropyUniform] = useState(0.85);
  const [tempUniform, setTempUniform] = useState(42.5);
  const [isShaderPaused, setIsShaderPaused] = useState(false);

  // OmniVoice Live WebAudio State
  const audioCtxRef = useRef(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioOscFreq, setAudioOscFreq] = useState(432);

  // Selected creation object
  const activeCreation = creations.find((c) => c.id === selectedCreationId) || creations[0] || null;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [res, pRes] = await Promise.all([
        fetchCreationsCatalog(),
        fetchProjects()
      ]);
      if (res && res.success) {
        setCreations(res.creations || []);
        setStorageTelemetry(res.storage_telemetry || null);
        setRecyclingHistory(res.recycling_history || []);
        if (!selectedCreationId && res.creations && res.creations.length > 0) {
          setSelectedCreationId(res.creations[0].id);
        }
      }
      if (pRes && pRes.projects) {
        setProjectsList(pRes.projects);
      }
    } catch (e) {
      console.error('Error fetching creations catalog:', e);
      showToast('Error al cargar catálogo de creaciones');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update selected version index when active creation changes
  useEffect(() => {
    if (activeCreation && activeCreation.timeline_branches) {
      setSelectedVersionIndex(activeCreation.timeline_branches.length - 1);
      setForkForm({
        branch_name: `feature/opt-${Date.now().toString().slice(-4)}`,
        diff_summary: 'Optimización de rendimiento y alineación de registros',
        new_content: activeCreation.raw_content || ''
      });
      setExecutionResult(null);
    }
  }, [selectedCreationId, activeCreation?.id]);

  // ================= WebGL GLSL Shader Live Compiler & Loop =================
  useEffect(() => {
    if (activeSubTab !== 'simulation' || activeCreation?.format_type !== 'shader_glsl' || !canvasRef.current) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return;
    glContextRef.current = gl;

    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = activeCreation.raw_content || `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        gl_FragColor = vec4(uv.x, uv.y, sin(u_time), 1.0);
      }
    `;

    function createShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posAttr = gl.getAttribLocation(program, 'position');
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');
    const uResLoc = gl.getUniformLocation(program, 'u_resolution');
    const uEntropyLoc = gl.getUniformLocation(program, 'u_entropy');
    const uTempLoc = gl.getUniformLocation(program, 'u_temp');

    let startTime = performance.now();

    function render() {
      if (!canvas || !gl) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);

      gl.enableVertexAttribArray(posAttr);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

      const elapsed = (performance.now() - startTime) / 1000.0;
      if (uTimeLoc) gl.uniform1f(uTimeLoc, elapsed);
      if (uResLoc) gl.uniform2f(uResLoc, canvas.width, canvas.height);
      if (uEntropyLoc) gl.uniform1f(uEntropyLoc, entropyUniform);
      if (uTempLoc) gl.uniform1f(uTempLoc, tempUniform);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!isShaderPaused) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    }

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [activeSubTab, selectedCreationId, activeCreation?.raw_content, entropyUniform, tempUniform, isShaderPaused]);

  // ================= OmniVoice Web Audio Synth Engine =================
  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setIsPlayingAudio(false);
      showToast('🔇 Audio OmniVoice detenido');
      return;
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const now = ctx.currentTime;
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      oscL.type = 'sine';
      oscR.type = 'sine';
      oscL.frequency.setValueAtTime(audioOscFreq, now);
      oscR.frequency.setValueAtTime(audioOscFreq + 10.0, now); // 10 Hz Alfa Binaural

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.25, now + 0.3);

      const merger = ctx.createChannelMerger(2);
      oscL.connect(merger, 0, 0);
      oscR.connect(merger, 0, 1);
      merger.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscL.start(now);
      oscR.start(now);

      setIsPlayingAudio(true);
      showToast(`🎵 Sintetizando ${audioOscFreq} Hz + 10 Hz Alfa Binaural`);
    } catch (e) {
      console.error('Audio synth error:', e);
      showToast('Error al iniciar sintetizador WebAudio');
    }
  };

  // ================= Run Sample Execution =================
  const handleRunSample = async () => {
    if (!activeCreation) return;
    try {
      setIsRunningSample(true);
      setExecutionResult(null);
      const res = await executeCreationSample(activeCreation.id, activeCreation.sample_run_code);
      setExecutionResult(res);
      showToast('✅ Simulación de muestra completada con éxito');
    } catch (e) {
      console.error('Execution error:', e);
      setExecutionResult({ success: false, stderr: String(e), stdout: '' });
      showToast('Error en la ejecución de la muestra');
    } finally {
      setIsRunningSample(false);
    }
  };

  // ================= Fork / New Version Action =================
  const handleForkVersion = async () => {
    if (!activeCreation || !forkForm.branch_name.trim()) {
      showToast('Por favor introduce un nombre de rama válido');
      return;
    }

    try {
      const res = await forkCreationVersion(
        activeCreation.id,
        forkForm.branch_name,
        forkForm.diff_summary || 'Nueva bifurcación experimental',
        forkForm.new_content || activeCreation.raw_content,
        'Alex (Operador Soberano)'
      );

      if (res && res.success) {
        showToast(`🌿 Versión ${res.new_version} forjada exitosamente`);
        setIsForkModalOpen(false);
        await loadData();
      } else {
        showToast('Error al crear nueva versión');
      }
    } catch (e) {
      console.error('Fork error:', e);
      showToast('Error de red al forjar versión');
    }
  };

  // ================= Memory Recycling Action =================
  const handleRecycleStorage = async () => {
    try {
      setIsRecycling(true);
      const res = await recycleCreationsStorage();
      if (res && res.success) {
        showToast(`♻️ Reciclado exitoso: ${res.recycling_entry?.freed_kb} KB liberados y logs balanceados`);
        await loadData();
      }
    } catch (e) {
      console.error('Recycle error:', e);
      showToast('Error al ejecutar reciclado de almacenamiento');
    } finally {
      setIsRecycling(false);
    }
  };

  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text);
    showToast('📋 Contenido copiado al portapapeles');
  };

  const handleDownloadFile = (creation) => {
    const element = document.createElement('a');
    const file = new Blob([creation.raw_content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = creation.file_path.split('/').pop() || `${creation.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`💾 Descargando ${element.download}`);
  };

  // Filter creations
  const filteredCreations = creations.filter((c) => {
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    if (formatFilter !== 'all' && c.format_type !== formatFilter) return false;
    if (projectFilter !== 'all') {
      const linkedP = c.linked_projects || (c.project_id ? [c.project_id] : []);
      if (!linkedP.includes(projectFilter)) return false;
    }
    return true;
  });

  const openProjectLinkModal = (creation) => {
    setTargetCreationForLinking(creation);
    const existing = creation.linked_projects || (creation.project_id ? [creation.project_id] : []);
    setSelectedProjectIdsForLinking(existing);
    setIsProjectLinkModalOpen(true);
  };

  const handleSaveProjectLinks = async () => {
    if (!targetCreationForLinking) return;
    try {
      const res = await linkCreationProjects(targetCreationForLinking.id, selectedProjectIdsForLinking);
      if (res && res.success) {
        showToast('🔗 Proyectos vinculados a la creación con éxito');
        setIsProjectLinkModalOpen(false);
        await loadData();
      }
    } catch (e) {
      console.error('Link projects error:', e);
      showToast('Error al vincular proyectos');
    }
  };

  const toggleProjectSelectionForLinking = (pId) => {
    if (selectedProjectIdsForLinking.includes(pId)) {
      setSelectedProjectIdsForLinking(selectedProjectIdsForLinking.filter(id => id !== pId));
    } else {
      setSelectedProjectIdsForLinking([...selectedProjectIdsForLinking, pId]);
    }
  };

  const activeVersion = activeCreation?.timeline_branches?.[selectedVersionIndex] || null;

  return (
    <div className="flex flex-col h-full bg-[#07090e] text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/90 to-purple-600/90 text-white font-mono text-xs shadow-2xl backdrop-blur-md border border-white/20 animate-fade-in flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-200 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Banner & Telemetry */}
      <header className="p-3 sm:p-4 bg-[#0a0d16]/95 border-b border-white/10 flex-shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-emerald-400 p-[1px] shadow-lg shadow-purple-500/20 shrink-0">
            <div className="w-full h-full bg-[#07090e] rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-black text-sm sm:text-base md:text-lg text-white tracking-wide truncate">
                ESTUDIO DE CREACIONES & EVOLUCIÓN PROGRESIVA
              </h1>
              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold shrink-0">
                1.58-Bit Output Vault
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5 truncate">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping shrink-0" />
              <span className="truncate">Resultados de propuestas, ramificación temporal, simulación en vivo y reciclado balanceado</span>
            </p>
          </div>
        </div>

        {/* Global Storage Telemetry & Balanced Recycler Button */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {storageTelemetry && (
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-300">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-slate-400 hidden sm:inline">Espacio:</span>
                <span className="text-white font-bold">{storageTelemetry.compacted_storage_kb} KB</span>
              </div>
              <span className="text-white/20">|</span>
              <div className="flex items-center gap-1 text-emerald-400" title="Eficiencia de almacenamiento mediante poda y deduplicación">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span className="font-bold">{storageTelemetry.storage_efficiency_pct}%</span>
              </div>
              <span className="text-white/20">|</span>
              <div className="text-purple-300 text-[11px] hidden sm:block" title="Bytes totales reciclados en histórico">
                <span>♻️ {storageTelemetry.freed_by_recycler_kb} KB</span>
              </div>
            </div>
          )}

          <button
            onClick={handleRecycleStorage}
            disabled={isRecycling}
            className={`px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer transition-all ${
              isRecycling ? 'opacity-50 animate-pulse' : ''
            }`}
            title="Poda inteligente de logs redundantes y balanceo de memoria StarSeed"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRecycling ? 'animate-spin' : ''}`} />
            <span>{isRecycling ? 'Reciclando...' : '♻️ Reciclar Memoria'}</span>
          </button>
        </div>
      </header>

      {/* SubTab Navigation Bar */}
      <div className="px-4 py-2 bg-[#090c14] border-b border-white/10 flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('gallery')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'gallery'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>🌟 Galería & Resultados ({filteredCreations.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'timeline'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>🌿 Ramas & Línea Temporal</span>
          </button>

          <button
            onClick={() => setActiveSubTab('simulation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'simulation'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>🧪 Laboratorio & Simulación en Vivo</span>
          </button>

          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'logs'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>📜 Logs de Auditoría & Reciclado</span>
          </button>

          <button
            onClick={() => setActiveSubTab('direct_links')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'direct_links'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>🔗 Enlaces Directos & Archivos</span>
          </button>
        </div>

        {/* Selected Creation Quick Selector Pill */}
        {activeCreation && (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono">
            <span className="text-slate-400">Activo:</span>
            <span className="text-cyan-300 font-bold max-w-[200px] truncate">{activeCreation.title}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
              {activeCreation.current_version}
            </span>
          </div>
        )}
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* =========================================================================
            SUBTAB 1: GALERÍA DE CREACIONES Y RESULTADOS
           ========================================================================= */}
        {activeSubTab === 'gallery' && (
          <div className="space-y-4 animate-fade-in">
            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0b0e18] border border-white/10">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filtros:
                </span>
                {['all', 'Hardware & Silicon', 'Ciberdelia & Visuales', 'Audio & Síntesis Vocal', 'Tensores & Memoria', 'Criptografía & Axiomas'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat === 'all' ? 'Todas las Categorías' : cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Project Filter Selector */}
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[#07090e] border border-emerald-500/30 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">📁 Todos los Proyectos ({projectsList.length})</option>
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      📁 {p.name}
                    </option>
                  ))}
                </select>

                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[#07090e] border border-white/15 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">Todos los Formatos</option>
                  <option value="code_cpp">⚡ C++ / ARM NEON</option>
                  <option value="shader_glsl">🔮 Shader GLSL</option>
                  <option value="audio_synth">🎵 Audio OmniVoice</option>
                  <option value="data_json">📊 Tensores JSON</option>
                  <option value="spec_markdown">📄 Markdown Spec</option>
                </select>
              </div>
            </div>

            {/* Creaciones Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCreations.map((item) => {
                const isSelected = item.id === selectedCreationId;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedCreationId(item.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                      isSelected
                        ? 'bg-gradient-to-b from-[#101626] to-[#0b0e18] border-cyan-500/60 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/40'
                        : 'bg-[#0b0e18]/80 hover:bg-[#0f1422] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Format Badge & Version Pill */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold flex items-center gap-1">
                          {item.format_type === 'code_cpp' && '⚡ C++ ARM NEON'}
                          {item.format_type === 'shader_glsl' && '🔮 GLSL WebGL'}
                          {item.format_type === 'audio_synth' && '🎵 OmniVoice PCM'}
                          {item.format_type === 'data_json' && '📊 Tensor JSON'}
                          {item.format_type === 'spec_markdown' && '📄 Ontocracia Spec'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                          {item.current_version}
                        </span>
                      </div>

                      <h3 className="font-display font-bold text-sm text-white group-hover:text-cyan-300 transition-colors leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>

                      {/* Origin Media & Agent Banner */}
                      <div className="mt-3 p-2 rounded-lg bg-black/30 border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Agente:</span>
                          <span className="text-cyan-300 font-bold">{item.agent_name || 'Oneiros'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-500">Medio de Origen:</span>
                          <span className="text-slate-300">{item.agent_origin_media || 'Imaginación Intuitiva'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-500">Cerebro:</span>
                          <span className="text-purple-300 truncate max-w-[160px]">{item.brain_name?.split(' // ')[0] || 'StarSeed'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono border-t border-white/5 pt-1.5 mt-1">
                          <span className="text-slate-400">Proyectos Vinculados:</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openProjectLinkModal(item);
                            }}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 font-bold"
                          >
                            🔗 Gestionar
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(item.linked_projects || (item.project_id ? [item.project_id] : [])).map((pid) => {
                            const pObj = projectsList.find((p) => p.id === pid);
                            return (
                              <span
                                key={pid}
                                className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[9px] font-mono truncate max-w-[150px]"
                                title={pObj ? pObj.name : pid}
                              >
                                📁 {pObj ? pObj.name : pid}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Dates and Processes */}
                      <div className="mt-2.5 flex flex-col gap-1 text-[10px] font-mono px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Creado:</span>
                          <span className="text-slate-300">{item.created_at ? new Date(item.created_at * 1000).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1"><Activity className="w-3 h-3" /> Procesos:</span>
                          <span className="text-slate-300">
                             <span className="text-emerald-400">{item.active_processes || 0} act</span> • <span className="text-amber-400">{item.in_progress_processes || 0} cur</span> • <span className="text-rose-400">{item.discarded_processes || 0} des</span>
                          </span>
                        </div>
                      </div>

                      {/* Performance Evolution Badge */}
                      {item.evolution_metrics && (
                        <div className="mt-3 flex items-center justify-between text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                          <span className="flex items-center gap-1 font-bold">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {item.evolution_metrics.performance_gain}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {item.evolution_metrics.entropy_reduction}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                        <GitBranch className="w-3 h-3 text-purple-400" />
                        <span>{item.timeline_branches?.length || 1} Versiones</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCreationId(item.id);
                            setActiveSubTab('timeline');
                          }}
                          className="p-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                          title="Ver ramas y evolución"
                        >
                          <GitBranch className="w-3 h-3" />
                          <span>Evolución</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCreationId(item.id);
                            setActiveSubTab('simulation');
                          }}
                          className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono flex items-center gap-1 cursor-pointer font-bold"
                          title="Ejecutar simulación de muestra"
                        >
                          <Play className="w-3 h-3" />
                          <span>Simular</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            SUBTAB 2: RAMAS Y LÍNEA TEMPORAL DE EVOLUCIÓN (VERSION TIMELINES)
           ========================================================================= */}
        {activeSubTab === 'timeline' && activeCreation && (
          <div className="space-y-4 animate-fade-in">
            {/* Header of Active Creation Evolution */}
            <div className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-black text-base text-white">
                    {activeCreation.title}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                    {activeCreation.current_version}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Proceso: <span className="text-purple-300">{activeCreation.process_name}</span> • Desarrollado por <span className="text-cyan-300 font-bold">{activeCreation.agent_name}</span> ({activeCreation.agent_origin_media})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsForkModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/40 text-purple-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-950/20"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-300" />
                  <span>🌿 Bifurcar / Crear Nueva Versión</span>
                </button>
              </div>
            </div>

            {/* Progressive Improvement Deep Explanation Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/20 via-purple-950/20 to-black/40 border border-cyan-500/30 space-y-2">
              <h3 className="font-display font-bold text-xs text-cyan-300 tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                EXPLICACIÓN DE MEJORA PROGRESIVA DE PROPUESTAS
              </h3>
              <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                {activeCreation.progressive_improvement_explanation}
              </pre>
            </div>

            {/* Timeline Branches Interactive Steps */}
            <div className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 space-y-4">
              <h3 className="font-display font-bold text-xs text-slate-300 tracking-wider flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-purple-400" />
                LÍNEA TEMPORAL DE VERSIONES Y RAMAS
              </h3>

              {/* Version Stepper Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {activeCreation.timeline_branches?.map((branch, idx) => {
                  const isCur = idx === selectedVersionIndex;
                  return (
                    <button
                      key={branch.version}
                      onClick={() => setSelectedVersionIndex(idx)}
                      className={`px-3 py-2 rounded-xl text-xs font-mono text-left transition-all flex-shrink-0 cursor-pointer border ${
                        isCur
                          ? 'bg-purple-500/25 border-purple-500 text-white shadow-md shadow-purple-950/30'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isCur ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`} />
                        <span className="font-bold text-purple-300">{branch.version}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{branch.branch_name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{branch.formatted_time}</div>
                    </button>
                  );
                })}
              </div>

              {/* Active Version Details & Diff */}
              {activeVersion && (
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-black/40 border border-white/5">
                    <div className="space-y-0.5">
                      <div className="text-xs font-mono text-slate-300 flex items-center gap-2">
                        <span className="text-purple-400 font-bold">Rama: {activeVersion.branch_name}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">Autor: {activeVersion.author_agent}</span>
                      </div>
                      <div className="text-xs text-emerald-300 font-mono">
                        Diff: {activeVersion.diff_summary}
                      </div>
                    </div>

                    {activeVersion.metrics && (
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          ⚡ {activeVersion.metrics.latency_ms} ms
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          💾 {activeVersion.metrics.memory_kb} KB
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                          🎯 {activeVersion.metrics.score} / 100
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Code / Content Snapshot for selected version */}
                  <div className="relative rounded-xl bg-[#06080d] border border-white/10 overflow-hidden">
                    <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>Snapshot de Código ({activeVersion.version})</span>
                      <button
                        onClick={() => handleCopyCode(activeVersion.content)}
                        className="px-2 py-0.5 rounded hover:bg-white/10 text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> Copiar
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-72 leading-relaxed">
                      {activeVersion.content}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            SUBTAB 3: LABORATORIO DE SIMULACIÓN Y VISTAS PREVIAS EN VIVO
           ========================================================================= */}
        {activeSubTab === 'simulation' && activeCreation && (
          <div className="space-y-4 animate-fade-in">
            {/* Simulation Header */}
            <div className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-black text-base text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  Laboratorio de Simulación & Muestra en Vivo ({activeCreation.format_type})
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Ejecutando en hardware Apple Silicon M1 (ARM64) • Sandbox Soberano
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunSample}
                  disabled={isRunningSample}
                  className={`px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-mono font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all ${
                    isRunningSample ? 'opacity-50 animate-pulse' : ''
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>{isRunningSample ? 'Compilando & Ejecutando...' : '▶ Ejecutar Muestra en M1'}</span>
                </button>
              </div>
            </div>

            {/* LIVE PREVIEW CONTAINER BASED ON FORMAT */}
            {activeCreation.format_type === 'shader_glsl' && (
              <div className="p-4 rounded-2xl bg-[#06080d] border border-cyan-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-cyan-300 font-bold flex items-center gap-1.5">
                    <Eye className="w-4 h-4" /> Canvas Holográfico WebGL 2.0 en Tiempo Real (60 FPS)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsShaderPaused(!isShaderPaused)}
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs font-mono text-slate-300"
                    >
                      {isShaderPaused ? '▶ Reanudar' : '⏸ Pausar'}
                    </button>
                  </div>
                </div>

                <div className="relative w-full h-80 rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    width={720}
                    height={360}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                    Uniforms: u_entropy={entropyUniform.toFixed(2)} | u_temp={tempUniform.toFixed(1)}°C
                  </div>
                </div>

                {/* Shader Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono">
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Nivel de Entropía Cuántica (u_entropy):</span>
                      <span className="text-cyan-400 font-bold">{entropyUniform.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.05"
                      value={entropyUniform}
                      onChange={(e) => setEntropyUniform(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Temperatura de Núcleos M1 (u_temp):</span>
                      <span className="text-purple-400 font-bold">{tempUniform.toFixed(1)}°C</span>
                    </div>
                    <input
                      type="range"
                      min="30.0"
                      max="75.0"
                      step="0.5"
                      value={tempUniform}
                      onChange={(e) => setTempUniform(parseFloat(e.target.value))}
                      className="w-full accent-purple-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeCreation.format_type === 'audio_synth' && (
              <div className="p-5 rounded-2xl bg-gradient-to-b from-[#101424] to-[#07090e] border border-purple-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-purple-400 animate-pulse" />
                    <h3 className="font-display font-bold text-sm text-white">
                      Sintetizador Bioacústico OmniVoice (Ondas Alfa & Armónicos)
                    </h3>
                  </div>

                  <button
                    onClick={handleToggleAudio}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all ${
                      isPlayingAudio
                        ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                        : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20'
                    }`}
                  >
                    {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>{isPlayingAudio ? 'Detener Frecuencia' : '▶ Probar Síntesis en Vivo'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                  <div className="flex justify-between text-xs font-mono text-slate-300">
                    <span>Frecuencia Portadora Solfeggio:</span>
                    <span className="text-purple-300 font-bold">{audioOscFreq} Hz (Armónico de Coherencia)</span>
                  </div>
                  <input
                    type="range"
                    min="216"
                    max="864"
                    step="12"
                    value={audioOscFreq}
                    onChange={(e) => setAudioOscFreq(parseInt(e.target.value))}
                    className="w-full accent-purple-400"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>216 Hz (Sub-Gama)</span>
                    <span>432 Hz (Armónico Natural)</span>
                    <span>528 Hz (Reparación)</span>
                    <span>864 Hz (Corona)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Code / Markdown / JSON Editor & Console Runner */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Code Source Editor Area */}
              <div className="rounded-2xl bg-[#0b0e18] border border-white/10 overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    Código de Muestra para Ejecución ({activeCreation.sample_language})
                  </span>
                  <button
                    onClick={() => handleCopyCode(activeCreation.raw_content)}
                    className="hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Copiar
                  </button>
                </div>
                <textarea
                  value={activeCreation.sample_run_code || activeCreation.raw_content}
                  onChange={(e) => {
                    activeCreation.sample_run_code = e.target.value;
                    setCreations([...creations]);
                  }}
                  className="w-full h-80 p-4 bg-[#06080d] text-cyan-200 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  spellCheck="false"
                />
              </div>

              {/* Execution Console Output */}
              <div className="rounded-2xl bg-[#0b0e18] border border-white/10 overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    Consola de Salida Sandbox (M1 Telemetry)
                  </span>
                  {executionResult?.execution_time_ms !== undefined && (
                    <span className="text-emerald-400 font-bold">
                      ⏱ {executionResult.execution_time_ms} ms
                    </span>
                  )}
                </div>

                <div className="p-4 bg-[#06080d] flex-1 overflow-y-auto font-mono text-xs space-y-2 min-h-80">
                  {!executionResult && !isRunningSample && (
                    <div className="text-slate-500 flex flex-col items-center justify-center h-full text-center py-12 space-y-2">
                      <Terminal className="w-8 h-8 text-slate-600 animate-pulse" />
                      <p>Haz clic en "▶ Ejecutar Muestra en M1" para simular este programa en tiempo real.</p>
                    </div>
                  )}

                  {isRunningSample && (
                    <div className="text-cyan-300 flex items-center gap-2 py-8 justify-center animate-pulse">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Compilando con Clang++ / Node y ejecutando en ARM64...</span>
                    </div>
                  )}

                  {executionResult && (
                    <div className="space-y-2">
                      {executionResult.stdout && (
                        <div className="text-emerald-300 whitespace-pre-wrap">
                          {executionResult.stdout}
                        </div>
                      )}
                      {executionResult.stderr && (
                        <div className="text-rose-400 whitespace-pre-wrap bg-rose-950/30 p-3 rounded-lg border border-rose-500/30">
                          {executionResult.stderr}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 pt-3 border-t border-white/10 flex items-center justify-between">
                        <span>Estado: {executionResult.success ? '✅ Exitoso' : '❌ Fallido'}</span>
                        <span>Código de Salida: {executionResult.exit_code ?? 0}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SUBTAB 4: HISTORIAL DE PROCESOS & LOGS DE AUDITORÍA (CON RECICLADO)
           ========================================================================= */}
        {activeSubTab === 'logs' && activeCreation && (
          <div className="space-y-4 animate-fade-in">
            {/* Logs Banner */}
            <div className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-black text-base text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  Historial de Auditoría & Logs del Proceso
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Trazas de decisiones, evaluaciones heurísticas y balance de memoria para: <span className="text-cyan-300">{activeCreation.title}</span>
                </p>
              </div>

              <button
                onClick={handleRecycleStorage}
                disabled={isRecycling}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRecycling ? 'animate-spin' : ''}`} />
                <span>Poda y Reciclado Balanceado</span>
              </button>
            </div>

            {/* Logs List */}
            <div className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 space-y-3">
              <div className="text-xs font-mono text-slate-400 pb-2 border-b border-white/10">
                Registros de Ejecución del Proceso ({activeCreation.logs_history?.length || 0} eventos)
              </div>

              <div className="space-y-2.5">
                {activeCreation.logs_history?.map((log, idx) => (
                  <div
                    key={log.log_id || idx}
                    className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start justify-between gap-3 font-mono text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span className="font-bold text-white">{log.stage}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          {log.agent}
                        </span>
                      </div>
                      <p className="text-slate-300 pl-3.5 leading-relaxed">{log.details}</p>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Storage Recycler History Card */}
            {recyclingHistory.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 space-y-3">
                <h3 className="font-display font-bold text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  HISTORIAL DE BALANCEO DE ALMACENAMIENTO & RECICLADO STARSEED
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recyclingHistory.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1 text-xs font-mono"
                    >
                      <div className="flex justify-between text-slate-300">
                        <span className="font-bold text-emerald-400">+{rec.freed_kb} KB Liberados</span>
                        <span className="text-[10px] text-slate-500">{rec.formatted_time}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Estrategia: {rec.strategy}
                      </div>
                      <div className="text-[10px] text-purple-300">
                        Eficiencia Resultante: {rec.efficiency_ratio}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SUBTAB 5: ENLACES DIRECTOS & GESTOR DE ARCHIVOS
           ========================================================================= */}
        {activeSubTab === 'direct_links' && activeCreation && (
          <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-black text-base text-white flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-blue-400" />
                  Enlaces Directos & Rutas de Archivos Físicos
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Acceso directo a los archivos locales inmutables en el Exocórtex Astraura 1.58b
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadFile(activeCreation)}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-950/20"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Descargar Archivo Físico</span>
                </button>
              </div>
            </div>

            {/* Direct Link Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 space-y-3 font-mono text-xs">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" /> Ruta Local en Filesystem
                </h3>
                <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-cyan-300 select-all flex items-center justify-between">
                  <span className="truncate">{activeCreation.file_path}</span>
                  <button
                    onClick={() => handleCopyCode(activeCreation.file_path)}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                    title="Copiar ruta"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>• Bóveda: Sovereign Exocortex (Offline / Zero-Cloud)</div>
                  <div>• Formato Físico: {activeCreation.format_type}</div>
                  <div>• Tamaño Estimado: {((activeCreation.raw_content?.length || 100) / 1024).toFixed(2)} KB</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0b0e18] border border-white/10 space-y-3 font-mono text-xs">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Integridad & Verificación Soberana
                </h3>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Axioma de Inmutabilidad Verificado
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Este archivo ha sido firmado por el agente <span className="text-cyan-300 font-bold">{activeCreation.agent_name}</span> y registrado en la bóveda StarSeed.
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Puntuación Heurística:</span>
                  <span className="text-emerald-400 font-bold">{activeCreation.evolution_metrics?.heuristic_score || 99.0} / 100</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: BIFURCAR / CREAR NUEVA VERSIÓN
         ========================================================================= */}
      {isForkModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0d101a] border border-purple-500/40 rounded-2xl p-5 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-400" />
                <h3 className="font-display font-bold text-base text-white">
                  Bifurcar Nueva Versión: {activeCreation.title}
                </h3>
              </div>
              <button
                onClick={() => setIsForkModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Nombre de la Rama:</label>
                <input
                  type="text"
                  value={forkForm.branch_name}
                  onChange={(e) => setForkForm({ ...forkForm, branch_name: e.target.value })}
                  placeholder="ej. feature/opt-loop-unroll"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Resumen del Cambio / Diff:</label>
                <input
                  type="text"
                  value={forkForm.diff_summary}
                  onChange={(e) => setForkForm({ ...forkForm, diff_summary: e.target.value })}
                  placeholder="ej. Reducción de latencia en 25% mediante prefetch L1"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Contenido de la Nueva Versión:</label>
                <textarea
                  value={forkForm.new_content}
                  onChange={(e) => setForkForm({ ...forkForm, new_content: e.target.value })}
                  rows={8}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-cyan-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10 font-mono text-xs">
              <button
                onClick={() => setIsForkModalOpen(false)}
                className="px-4 py-2 rounded-xl hover:bg-white/10 text-slate-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleForkVersion}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold cursor-pointer"
              >
                🌿 Forjar Versión & Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL VINCULAR PROYECTOS A CREACIÓN ================= */}
      {isProjectLinkModalOpen && targetCreationForLinking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#0d101a] border border-emerald-500/40 rounded-3xl p-5 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Vincular Creación a Proyectos
                  </h3>
                  <p className="text-xs text-slate-400 font-mono truncate max-w-[320px]">
                    {targetCreationForLinking.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProjectLinkModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono">
              Selecciona uno o múltiples proyectos donde residirá esta creación y aportará contexto soberano:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {projectsList.map((proj) => {
                const isSelected = selectedProjectIdsForLinking.includes(proj.id);
                return (
                  <div
                    key={proj.id}
                    onClick={() => toggleProjectSelectionForLinking(proj.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{proj.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 line-clamp-1">{proj.description}</div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-emerald-500/30 text-emerald-200 font-bold' : 'bg-white/5 text-slate-500'
                      }`}
                    >
                      {isSelected ? '✓ Vinculado' : '+ Enlazar'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 font-mono text-xs">
              <button
                onClick={() => setIsProjectLinkModalOpen(false)}
                className="px-4 py-2 rounded-xl hover:bg-white/10 text-slate-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProjectLinks}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                💾 Guardar Enlaces
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
