import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Copy, 
  Download, 
  Maximize2, 
  Minimize2, 
  Terminal, 
  Eye, 
  Code, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Layers, 
  Activity, 
  Check, 
  AlertCircle, 
  Cpu, 
  Globe, 
  Sliders, 
  Box, 
  Grid,
  FolderPlus,
  FolderOpen,
  Save,
  FileCode,
  Plus,
  Trash2,
  ExternalLink,
  Wand2,
  FolderCheck,
  CheckCircle2,
  HardDrive,
  Monitor,
  Smartphone,
  Tablet,
  FileArchive,
  Share2,
  RefreshCw,
  X
} from 'lucide-react';
import { 
  executeCodeOnBackend, 
  executeProjectOnBackend, 
  exportProjectZip, 
  saveProject, 
  exportProjectToDisk, 
  linkProjectFolder,
  addMem0Memory 
} from '../services/api';

// Utility: Normalize language strings
function normalizeLang(lang) {
  const l = (lang || '').toLowerCase().trim();
  if (['html', 'htm', 'xml', 'svg'].includes(l)) return 'html';
  if (['javascript', 'js', 'jsx'].includes(l)) return 'javascript';
  if (['typescript', 'ts', 'tsx'].includes(l)) return 'typescript';
  if (['python', 'py', 'python3'].includes(l)) return 'python';
  if (['cpp', 'c++', 'cxx'].includes(l)) return 'cpp';
  if (['c', 'h'].includes(l)) return 'c';
  if (['rust', 'rs'].includes(l)) return 'rust';
  if (['bash', 'sh', 'zsh', 'shell'].includes(l)) return 'bash';
  if (['css', 'scss', 'sass', 'less'].includes(l)) return 'css';
  if (['json'].includes(l)) return 'json';
  if (['sql', 'sqlite'].includes(l)) return 'sql';
  return l || 'javascript';
}

function getInitialFilename(lang) {
  const nLang = normalizeLang(lang);
  switch (nLang) {
    case 'html': return 'index.html';
    case 'javascript': return 'app.js';
    case 'typescript': return 'app.ts';
    case 'python': return 'main.py';
    case 'cpp': return 'main.cpp';
    case 'c': return 'main.c';
    case 'rust': return 'main.rs';
    case 'bash': return 'run.sh';
    case 'css': return 'style.css';
    case 'json': return 'data.json';
    default: return `code.${nLang}`;
  }
}

// Cleans accidental markdown codeblock fences from AI responses
function sanitizeCodeString(str) {
  if (!str) return '';
  return str
    .replace(/^```[a-zA-Z0-9_-]*\n?/gm, '')
    .replace(/```$/gm, '')
    .trim();
}

// Parses multi-file markers (e.g. // filename: app.js or <!-- filename: index.html -->)
function parseMultiFiles(rawCode, defaultLang) {
  const clean = sanitizeCodeString(rawCode);
  const fileRegex = /(?:\/\/\s*filename:|\/\*\s*filename:|\<!--\s*filename:|#\s*filename:|\/\/\s*filepath:)\s*([a-zA-Z0-9_\-\.\/]+)(?:\s*\*\/|\s*-->)?/gi;
  
  const matches = [...clean.matchAll(fileRegex)];
  if (matches.length <= 1) {
    const fn = getInitialFilename(defaultLang);
    return [
      {
        id: 'file_main',
        filename: fn,
        language: normalizeLang(defaultLang),
        content: clean
      }
    ];
  }

  const parsed = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const filename = match[1].trim();
    const startIndex = match.index + match[0].length;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index : clean.length;
    const content = clean.slice(startIndex, endIndex).trim();
    const ext = filename.split('.').pop() || defaultLang;

    parsed.push({
      id: `file_${i}_${Date.now()}`,
      filename,
      language: normalizeLang(ext),
      content
    });
  }

  return parsed.length > 0 ? parsed : [
    { id: 'file_main', filename: getInitialFilename(defaultLang), language: normalizeLang(defaultLang), content: clean }
  ];
}

export default function InteractiveCodeRuntime({ code: initialCode, language = 'javascript' }) {
  const [files, setFiles] = useState(() => parseMultiFiles(initialCode, language));
  const [activeFileId, setActiveFileId] = useState(files[0]?.id || 'file_main');
  const [activeView, setActiveView] = useState('preview'); // 'preview', 'code', 'console', 'project'
  const [execTarget, setExecTarget] = useState('browser'); // 'browser' vs 'backend'
  const [deviceViewport, setDeviceViewport] = useState('responsive'); // 'responsive', 'desktop', 'tablet', 'mobile'
  
  const [isRunning, setIsRunning] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [executionTime, setExecutionTime] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Project Vault & Save/Export State
  const [projectName, setProjectName] = useState('Programa_Astraura_158b');
  const [projectDescription, setProjectDescription] = useState('Programa interactivo generado y ejecutado desde el chat.');
  const [targetExportDir, setTargetExportDir] = useState('/Users/alex/Documents/Astraura_Projects');
  const [linkedFolderPath, setLinkedFolderPath] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Sandboxed Iframe Ref
  const iframeRef = useRef(null);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const currentCode = activeFile ? activeFile.content : '';
  const currentLang = activeFile ? activeFile.language : normalizeLang(language);

  const isHtmlOrWeb = files.some(f => ['html', 'htm', 'xml', 'svg'].includes(f.language) || f.filename.endsWith('.html'));
  const isJs = ['javascript', 'js', 'jsx', 'ts', 'typescript', 'tsx'].includes(currentLang);
  const isCss = ['css', 'scss', 'sass'].includes(currentLang);
  const isPython = files.some(f => ['python', 'py'].includes(f.language) || f.filename.endsWith('.py'));
  const isCpp = ['cpp', 'c++', 'c', 'h'].includes(currentLang);
  const isRust = ['rust', 'rs'].includes(currentLang);
  const isShell = ['bash', 'sh', 'zsh'].includes(currentLang);
  
  const hasVisualPreview = isHtmlOrWeb || isJs || isCss || currentCode.includes('canvas') || currentCode.includes('document.') || currentCode.includes('THREE.') || currentCode.includes('Chart(');

  useEffect(() => {
    if (!hasVisualPreview && activeView === 'preview') {
      setActiveView('code');
    }
  }, [hasVisualPreview]);

  // Code Update Handler
  const handleCodeChange = (newVal) => {
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: newVal } : f));
  };

  // Add New File to Workspace
  const handleAddFile = () => {
    const ext = isHtmlOrWeb ? 'js' : 'py';
    const newFilename = `module_${files.length + 1}.${ext}`;
    const newFile = {
      id: `file_${Date.now()}`,
      filename: newFilename,
      language: normalizeLang(ext),
      content: isHtmlOrWeb 
        ? '// Nuevo módulo JS\nexport function init() {\n  console.log("Módulo activo");\n}\n'
        : '# Nuevo módulo Python\ndef execute():\n    print("Módulo Python activo")\n'
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
    setToastMsg(`📄 Archivo "${newFilename}" agregado al proyecto`);
  };

  // Delete File
  const handleDeleteFile = (id) => {
    if (files.length <= 1) return;
    setFiles(prev => prev.filter(f => f.id !== id));
    if (activeFileId === id) {
      setActiveFileId(files.find(f => f.id !== id)?.id || 'file_main');
    }
  };

  // Auto-Repair / Smart Boilerplate Enhancer with 1.58-Bit
  const handleAutoRepair = () => {
    let repaired = currentCode;

    // Check if HTML lacks structure
    if (currentLang === 'html' && !repaired.includes('<html') && !repaired.includes('<!DOCTYPE')) {
      repaired = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Astraura 1.58-Bit</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { background: #080a12; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="p-6">
  ${repaired}
  <script>
    if (window.lucide) lucide.createIcons();
  </script>
</body>
</html>`;
    }

    // Sanitize any stray backticks
    repaired = sanitizeCodeString(repaired);
    handleCodeChange(repaired);
    setConsoleLogs(prev => [...prev, { type: 'info', text: '✨ Auto-Reparación 1.58-Bit: Estructura HTML5, Tailwind CSS y Lucide Icons inyectados.' }]);
    setToastMsg('✨ Código auto-reparado y optimizado');
  };

  // Open Live App in New Standalone Browser Window (Popout / Full Tab)
  const handleOpenInNewTab = () => {
    const fullHtml = buildFullHtmlBundle();
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setToastMsg('🚀 App abierta en pestaña completa independiente');
  };

  // Export Project as Downloadable ZIP
  const handleExportZip = async () => {
    try {
      await exportProjectZip(projectName, files, projectDescription);
      setToastMsg(`📦 Proyecto "${projectName}.zip" descargado exitosamente`);
    } catch (e) {
      alert(`Error al exportar ZIP: ${e.message}`);
    }
  };

  // Save Project to StarSeed OS Vault & Mem0
  const handleSaveToVault = async () => {
    setIsSavingProject(true);
    try {
      const payload = {
        name: projectName,
        description: projectDescription,
        language: currentLang,
        files: files.map(f => ({
          filename: f.filename,
          path: f.filename,
          language: f.language,
          content: f.content
        }))
      };
      const res = await saveProject(payload);
      if (res.success) {
        // Record in Mem0
        await addMem0Memory({
          memory: `Proyecto guardado: "${projectName}" (${files.length} archivos, stack ${currentLang}). ${projectDescription}`,
          user_id: 'alex',
          agent_id: 'hephaestus',
          category: 'project_vault',
          metadata: { project_id: res.project.id, files_count: files.length }
        }).catch(() => null);

        setToastMsg(`✅ Proyecto "${projectName}" guardado en la Bóveda StarSeed`);
        setShowSaveModal(false);
      }
    } catch (e) {
      alert(`Error al guardar en bóveda: ${e.message}`);
    } finally {
      setIsSavingProject(false);
    }
  };

  // Export to Mac Local Disk Directory
  const handleExportToDisk = async () => {
    if (!targetExportDir.trim()) return;
    try {
      const savePayload = {
        name: projectName,
        description: projectDescription,
        language: currentLang,
        files: files.map(f => ({
          filename: f.filename,
          path: f.filename,
          language: f.language,
          content: f.content
        }))
      };
      const savedRes = await saveProject(savePayload);
      const projId = savedRes.project.id;

      const exportRes = await exportProjectToDisk(projId, targetExportDir.trim());
      if (exportRes.success) {
        setToastMsg(`📁 Exportado a ${exportRes.target_directory} (${exportRes.files_count} archivos)`);
      }
    } catch (e) {
      alert(`Error al exportar a disco: ${e.message}`);
    }
  };

  // Build Full HTML Bundle with CDNs
  const buildFullHtmlBundle = () => {
    const htmlFile = files.find(f => f.language === 'html' || f.filename.endsWith('.html'));
    const cssFiles = files.filter(f => f.language === 'css' || f.filename.endsWith('.css'));
    const jsFiles = files.filter(f => ['javascript', 'js', 'jsx'].includes(f.language) || f.filename.endsWith('.js'));

    const cssCombined = cssFiles.map(f => f.content).join('\n');
    const jsCombined = jsFiles.map(f => f.content).join('\n');

    let baseHtml = htmlFile ? htmlFile.content : '';
    if (!baseHtml) {
      baseHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { margin: 0; padding: 16px; background: #080a12; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; overflow: auto; }
    canvas { display: block; max-width: 100%; border-radius: 8px; }
    ${cssCombined}
  </style>
</head>
<body>
  <div id="root">
    <canvas id="canvas" width="640" height="380"></canvas>
  </div>
  <script>
    window.onerror = function(msg, url, line) {
      window.parent.postMessage({ type: 'iframe_console', level: 'error', text: msg + ' (Línea ' + line + ')' }, '*');
    };
    const _log = console.log;
    console.log = function(...args) {
      _log.apply(console, args);
      window.parent.postMessage({ type: 'iframe_console', level: 'stdout', text: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') }, '*');
    };
    ${jsCombined || currentCode}
  </script>
</body>
</html>`;
      return baseHtml;
    }

    // Inject CDNs and styles into baseHtml if missing
    if (!baseHtml.includes('tailwindcss.com')) {
      baseHtml = baseHtml.replace('<head>', '<head>\n<script src="https://cdn.tailwindcss.com"></script>');
    }
    if (!baseHtml.includes('three.min.js') && (baseHtml.includes('THREE.') || jsCombined.includes('THREE.'))) {
      baseHtml = baseHtml.replace('<head>', '<head>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>');
    }
    if (!baseHtml.includes('chart.js') && (baseHtml.includes('Chart(') || jsCombined.includes('Chart('))) {
      baseHtml = baseHtml.replace('<head>', '<head>\n<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>');
    }

    if (cssCombined) {
      baseHtml = baseHtml.replace('</head>', `<style>${cssCombined}</style>\n</head>`);
    }

    if (jsCombined && !baseHtml.includes(jsCombined)) {
      baseHtml = baseHtml.replace('</body>', `<script>${jsCombined}</script>\n</body>`);
    }

    return baseHtml;
  };

  // Run Code Logic
  const handleRun = async () => {
    setIsRunning(true);
    setConsoleLogs([]);
    const startTime = performance.now();

    if (execTarget === 'backend' || (!hasVisualPreview && !isJs)) {
      try {
        let res;
        if (files.length > 1) {
          res = await executeProjectOnBackend(
            files.map(f => ({ filename: f.filename, content: f.content })),
            activeFile.filename,
            currentLang
          );
        } else {
          res = await executeCodeOnBackend(currentCode, currentLang);
        }

        const elapsed = res.execution_time_ms || Math.round(performance.now() - startTime);
        setExecutionTime(elapsed);

        const logs = [];
        if (res.stdout) logs.push({ type: 'stdout', text: res.stdout });
        if (res.stderr) logs.push({ type: 'stderr', text: res.stderr });
        if (!res.stdout && !res.stderr && res.output) logs.push({ type: 'info', text: res.output });
        if (logs.length === 0) logs.push({ type: 'info', text: '✅ Programa ejecutado con éxito sin salida de terminal.' });
        
        setConsoleLogs(logs);
        setActiveView('console');
      } catch (err) {
        setConsoleLogs([{ type: 'error', text: `Error de ejecución en backend: ${err.message}` }]);
        setActiveView('console');
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // In-Browser Sandbox Execution
    if (iframeRef.current) {
      const fullHtml = buildFullHtmlBundle();
      iframeRef.current.srcdoc = fullHtml;
    }

    const elapsed = Math.round(performance.now() - startTime);
    setExecutionTime(elapsed);
    setIsRunning(false);
  };

  useEffect(() => {
    if (activeView === 'preview' && iframeRef.current && hasVisualPreview) {
      handleRun();
    }
  }, [activeView]);

  // Iframe Console Message Listener
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'iframe_console') {
        setConsoleLogs(prev => [...prev, { type: event.data.level, text: event.data.text }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`my-3.5 rounded-2xl border border-white/10 bg-[#0a0d14] overflow-hidden shadow-2xl transition-all ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-[#07090e] flex flex-col' : 'max-w-full'
    }`}>
      {/* Top Program Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#0e1320] border-b border-white/10 text-xs font-mono">
        {/* Left: Language Badge & Multi-File Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full sm:max-w-md">
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1 border border-cyan-500/30">
            <Code className="w-3 h-3" />
            {currentLang}
          </span>

          {/* File Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                  activeFileId === file.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-black/30 text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                <FileCode className="w-3 h-3" />
                <span>{file.filename}</span>
                {files.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={handleAddFile}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              title="Agregar nuevo archivo al programa"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right: Runtime Target Selector & Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {toastMsg && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-fade-in">
              {toastMsg}
            </span>
          )}

          {/* Execution Environment Selector */}
          <div className="flex rounded-lg bg-black/50 border border-white/10 p-0.5 text-[10px]">
            <button
              onClick={() => setExecTarget('browser')}
              className={`px-2 py-0.5 rounded ${execTarget === 'browser' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'}`}
              title="Navegador Web Standalone"
            >
              Navegador
            </button>
            <button
              onClick={() => setExecTarget('backend')}
              className={`px-2 py-0.5 rounded ${execTarget === 'backend' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400'}`}
              title="Host M1 Nativo (Python/Node/C++/Rust)"
            >
              Host M1
            </button>
          </div>

          {/* Run Button */}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold flex items-center gap-1 shadow-md shadow-cyan-500/20 transition-all text-xs"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Ejecutando...' : 'Ejecutar'}
          </button>

          {/* View Toggles */}
          <div className="flex rounded-lg bg-black/50 border border-white/10 p-0.5">
            {hasVisualPreview && (
              <button
                onClick={() => setActiveView('preview')}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                  activeView === 'preview' ? 'bg-white/15 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Vista Previa en Vivo"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vista</span>
              </button>
            )}
            <button
              onClick={() => setActiveView('code')}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                activeView === 'code' ? 'bg-white/15 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Editor de Código"
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Código</span>
            </button>
            <button
              onClick={() => setActiveView('console')}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                activeView === 'console' ? 'bg-white/15 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Consola de Salida"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Consola</span>
              {consoleLogs.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </button>
          </div>

          {/* Tool Actions: Auto-Repair, Popout, ZIP, Fullscreen */}
          <button
            onClick={handleAutoRepair}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300"
            title="Auto-Reparar & Optimizar 1.58-Bit"
          >
            <Wand2 className="w-3.5 h-3.5" />
          </button>

          {hasVisualPreview && (
            <button
              onClick={handleOpenInNewTab}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300"
              title="Abrir App en Pestaña Completa Independiente (Popout)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleExportZip}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300"
            title="Descargar Proyecto como ZIP"
          >
            <FileArchive className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-300"
            title="Guardar en Bóveda de Proyectos de StarSeed OS"
          >
            <Save className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={copyCode}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
            title="Copiar Código"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
            title={isFullscreen ? 'Salir de Pantalla Completa' : 'Expandir a Pantalla Completa'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className={`relative ${isFullscreen ? 'flex-1 overflow-hidden flex flex-col' : 'min-h-[340px] max-h-[560px] flex flex-col'}`}>
        
        {/* VIEW 1: LIVE VISUAL PREVIEW */}
        {activeView === 'preview' && (
          <div className="flex-1 flex flex-col bg-[#05070c] relative">
            {/* Viewport Emulator Bar if in Fullscreen */}
            {isFullscreen && (
              <div className="flex items-center justify-center gap-2 py-1 bg-black/60 border-b border-white/5 text-[11px] font-mono text-slate-400">
                <span>Viewport:</span>
                <button
                  onClick={() => setDeviceViewport('responsive')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 ${deviceViewport === 'responsive' ? 'bg-cyan-500/20 text-cyan-300' : ''}`}
                >
                  <Monitor className="w-3 h-3" /> Fluido (100%)
                </button>
                <button
                  onClick={() => setDeviceViewport('tablet')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 ${deviceViewport === 'tablet' ? 'bg-cyan-500/20 text-cyan-300' : ''}`}
                >
                  <Tablet className="w-3 h-3" /> Tablet (768px)
                </button>
                <button
                  onClick={() => setDeviceViewport('mobile')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 ${deviceViewport === 'mobile' ? 'bg-cyan-500/20 text-cyan-300' : ''}`}
                >
                  <Smartphone className="w-3 h-3" /> Móvil (375px)
                </button>
              </div>
            )}

            <div className="flex-1 flex items-center justify-center overflow-auto p-2">
              <iframe
                ref={iframeRef}
                title="Astraura Live Program Sandbox"
                sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                className={`bg-[#080a12] border border-white/5 rounded-xl shadow-2xl transition-all duration-300 ${
                  deviceViewport === 'mobile'
                    ? 'w-[375px] h-[667px]'
                    : deviceViewport === 'tablet'
                    ? 'w-[768px] h-[800px]'
                    : 'w-full h-full min-h-[320px]'
                }`}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: MULTI-FILE CODE EDITOR */}
        {activeView === 'code' && (
          <div className="flex-1 flex flex-col bg-[#07090e] p-3 font-mono text-xs overflow-hidden">
            <div className="flex items-center justify-between pb-2 text-[10px] text-slate-500 border-b border-white/5">
              <span>Editando: <b className="text-cyan-300">{activeFile.filename}</b> ({currentLang})</span>
              <span>{currentCode.split('\n').length} líneas | {currentCode.length} caracteres</span>
            </div>
            <textarea
              value={currentCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              spellCheck="false"
              className="flex-1 w-full bg-transparent text-slate-200 font-mono text-xs leading-relaxed focus:outline-none resize-none pt-2 overflow-y-auto"
            />
          </div>
        )}

        {/* VIEW 3: TERMINAL & CONSOLE OUTPUT */}
        {activeView === 'console' && (
          <div className="flex-1 bg-black/90 p-4 font-mono text-xs overflow-y-auto space-y-1 text-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[10px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Salida de Ejecución // {execTarget === 'backend' ? 'Host M1 Sandbox' : 'Sandbox Navegador'}
              </span>
              {executionTime !== null && (
                <span className="text-emerald-400 font-bold">{executionTime} ms</span>
              )}
            </div>

            {consoleLogs.length === 0 ? (
              <div className="text-slate-500 italic pt-2">
                No hay mensajes en la consola. Presiona "Ejecutar" para correr el programa.
              </div>
            ) : (
              consoleLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`py-0.5 leading-relaxed whitespace-pre-wrap ${
                    log.type === 'error' || log.type === 'stderr'
                      ? 'text-rose-400 bg-rose-950/20 px-2 rounded'
                      : log.type === 'info'
                      ? 'text-cyan-300'
                      : 'text-slate-200'
                  }`}
                >
                  {log.text}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODAL: Guardar Proyecto en Bóveda StarSeed & Exportar a Disco */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#0c121e] border border-cyan-500/40 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-bold text-white text-base flex items-center gap-2">
                <Save className="w-4 h-4 text-cyan-400" />
                Guardar Proyecto // Bóveda StarSeed OS
              </span>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-slate-400 block mb-1">Nombre del Proyecto:</span>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Descripción:</span>
                <textarea
                  rows={2}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Ruta en Disco Local (Mac):</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetExportDir}
                    onChange={(e) => setTargetExportDir(e.target.value)}
                    className="flex-1 p-2 rounded-xl bg-black/60 border border-white/10 text-slate-100 text-xs"
                  />
                  <button
                    onClick={handleExportToDisk}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-300 font-bold"
                  >
                    Exportar Disco
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveToVault}
                disabled={isSavingProject}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20"
              >
                {isSavingProject ? 'Guardando...' : 'Guardar y Memorizar en StarSeed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
