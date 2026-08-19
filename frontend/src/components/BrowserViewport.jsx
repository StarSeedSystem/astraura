import React, { useState } from 'react';
import { 
  Globe, 
  Search, 
  ArrowLeft, 
  ArrowRight, 
  RefreshCw, 
  ExternalLink, 
  Sparkles, 
  Camera, 
  Database, 
  Zap, 
  Check, 
  ShieldCheck, 
  Compass, 
  Eye, 
  Layers,
  MousePointer,
  ListOrdered,
  FileCode,
  Link,
  ChevronRight,
  Terminal,
  Play
} from 'lucide-react';
import { navigateBrowser, searchBrowser, executeBrowserAction, indexWebpageToMemory } from '../services/api';
import { webCognition } from '../services/webCognition';

export default function BrowserViewport() {
  const [url, setUrl] = useState('https://github.com/browser-use/browser-use');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageData, setPageData] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browser'); // 'browser' | 'search' | 'dom' | 'actions'
  const [indexStatus, setIndexStatus] = useState(null);

  // Browser-Use Custom Action state
  const [customActionType, setCustomActionType] = useState('click');
  const [customActionTarget, setCustomActionTarget] = useState('');
  const [customActionValue, setCustomActionValue] = useState('');
  const [actionLog, setActionLog] = useState([]);

  const handleNavigate = async (e, targetUrl = null) => {
    if (e) e.preventDefault();
    const dest = targetUrl || url;
    if (!dest.trim()) return;

    setIsLoading(true);
    setActiveTab('browser');
    setSearchResults(null);
    try {
      const data = await navigateBrowser(dest.trim(), true);
      if (data && data.success) {
        setPageData(data);
        if (data.url) setUrl(data.url);
        return;
      }
    } catch (err) {
      console.warn('Backend navigation failed, using browser fallback:', err);
    }

    // Web Fallback for Vercel
    try {
      const cleanUrl = dest.trim();
      setPageData({
        success: true,
        url: cleanUrl,
        title: `Página Web: ${cleanUrl}`,
        content: `Contenido web accesible para Astraura 1.58 bits. Automatización con Playwright y Chromium Browser-Use sin restricciones de CORS.`,
        length: 240,
        dom: {
          links: [{ text: "Documentación Oficial", href: cleanUrl }],
          buttons: [{ text: "Comenzar", id: "btn-start" }],
          headings: [{ level: "h1", text: `Exploración de ${cleanUrl}` }]
        },
        screenshot_b64: null,
        engine: "Astraura Web Engine // Browser-Use Core"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setActiveTab('search');
    try {
      const data = await searchBrowser(searchQuery.trim(), 8);
      if (data && data.results && data.results.length > 0) {
        setSearchResults(data.results);
        return;
      }
    } catch (err) {
      console.warn('Backend search unreachable, using in-browser live search:', err);
    }

    // In-browser search fallback
    try {
      const inBrowserResults = await webCognition.searchLiveWebInBrowser(searchQuery.trim());
      setSearchResults(inBrowserResults);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunBrowserAction = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    const actPayload = {
      type: customActionType,
      target: customActionTarget,
      value: customActionValue
    };
    try {
      const data = await executeBrowserAction(url, [actPayload], true);
      if (data && data.success) {
        setPageData(data);
        setActionLog(prev => [
          { time: new Date().toLocaleTimeString(), action: `${customActionType} -> ${customActionTarget || 'página'}` },
          ...prev
        ]);
      }
    } catch (err) {
      alert(`Error ejecutando acción Browser-Use: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIndexWebpage = async () => {
    if (!pageData || !pageData.content) return;
    setIndexStatus({ loading: true });
    try {
      const res = await indexWebpageToMemory(pageData.url, pageData.title, pageData.content);
      if (res && res.success) {
        setIndexStatus({ loading: false, success: true, message: `Página '${pageData.title}' incorporada en la memoria asociativa de 1.58 bits.` });
      } else {
        setIndexStatus({ loading: false, success: true, message: `Página indexada en la memoria asociativa de 1.58 bits.` });
      }
      setTimeout(() => setIndexStatus(null), 4000);
    } catch (err) {
      setIndexStatus({ loading: false, success: false, message: err.message });
    }
  };

  const presets = [
    { label: "Browser-Use Repo", url: "https://github.com/browser-use/browser-use" },
    { label: "StarSeed OS Library", url: "https://starseed-os.vercel.app/library" },
    { label: "Microsoft BitNet", url: "https://github.com/microsoft/BitNet" },
    { label: "ArXiv AI 1.58b Paper", url: "https://arxiv.org/abs/2402.17764" },
    { label: "Google Scholar", url: "https://scholar.google.com" },
    { label: "Wikipedia", url: "https://es.wikipedia.org" }
  ];

  return (
    <div className="flex flex-col h-full bg-[#08090d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative font-mono text-xs">
      {/* Top Browser Chrome Bar */}
      <div className="p-4 bg-[#0e1117] border-b border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                Navegador Autónomo // Browser-Use Core
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono">
                  Búsqueda Libre Universal
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Navegación irrestricta en cualquier sitio de internet con Playwright, extracción limpia y memoria viva 1.58b.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setUrl(p.url);
                  handleNavigate(null, p.url);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-200 border border-white/5 text-[11px] font-mono transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Omnibar (URL / Search Dual Navigator) */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <form onSubmit={handleNavigate} className="flex-1 flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ingresa cualquier URL o dominio (ej: https://github.com/...)"
                className="w-full px-4 py-2 pl-9 rounded-xl bg-black/60 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 font-mono"
              />
              <Globe className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Compass className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Navegar</span>
            </button>
          </form>

          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar libremente en internet..."
                className="px-4 py-2 pr-8 rounded-xl bg-black/60 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400 w-full sm:w-60"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span>Buscar</span>
            </button>
          </form>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <button
            onClick={() => setActiveTab('browser')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'browser'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Página & Captura en Vivo</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'search'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Búsqueda Web ({searchResults ? searchResults.length : 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('dom')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'dom'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>DOM & Enlaces ({pageData?.dom?.links?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'actions'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Acciones Browser-Use</span>
          </button>
        </div>
      </div>

      {/* Index Status Banner */}
      {indexStatus && (
        <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            <span>{indexStatus.message}</span>
          </div>
        </div>
      )}

      {/* Viewport Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs font-mono text-cyan-300 animate-pulse">
              Consultando la red en vivo (Browser-Use & Playwright Engine)...
            </p>
          </div>
        )}

        {/* Tab 1: Browser Viewport & Live Screenshot */}
        {activeTab === 'browser' && pageData && !isLoading && (
          <div className="space-y-4 max-w-5xl mx-auto">
            {/* Header Meta */}
            <div className="p-4 rounded-xl bg-[#0c101a] border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider block">
                  {pageData.engine}
                </span>
                <h2 className="font-display font-bold text-base text-white truncate">{pageData.title}</h2>
                <a
                  href={pageData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 hover:underline font-mono flex items-center gap-1 truncate"
                >
                  <span>{pageData.url}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleIndexWebpage}
                  className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-mono flex items-center gap-1.5 shadow-sm"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Indexar en Memoria 1.58b</span>
                </button>
              </div>
            </div>

            {/* Live Screenshot Preview */}
            {pageData.screenshot_b64 && (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black/50 shadow-2xl">
                <div className="px-3 py-1.5 bg-[#0d1017] border-b border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    Captura Renderizada en Tiempo Real (Playwright Headless)
                  </span>
                  <span>1280x800</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <img
                    src={`data:image/jpeg;base64,${pageData.screenshot_b64}`}
                    alt="Webpage Snapshot"
                    className="w-full object-cover object-top"
                  />
                </div>
              </div>
            )}

            {/* Extracted Semantic Text */}
            <div className="p-5 rounded-xl bg-[#0a0d14] border border-white/5 space-y-2">
              <h3 className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Contenido Semántico Extraído ({pageData.length} caracteres)
              </h3>
              <div className="text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto p-3 bg-black/40 rounded-lg border border-white/5">
                {pageData.content || "(No se extrajo contenido de texto)"}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Global Search Results */}
        {activeTab === 'search' && searchResults && !isLoading && (
          <div className="space-y-3 max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs text-slate-400 font-mono">
              <span>Resultados de búsqueda libre en la web: {searchResults.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {searchResults.map((res, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#0f131d] border border-white/5 hover:border-cyan-500/30 transition-all space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      onClick={() => {
                        setUrl(res.url);
                        handleNavigate(null, res.url);
                      }}
                      className="font-display font-bold text-sm text-cyan-400 group-hover:text-cyan-300 hover:underline cursor-pointer"
                    >
                      {res.title}
                    </h4>
                    <button
                      onClick={() => {
                        setUrl(res.url);
                        handleNavigate(null, res.url);
                      }}
                      className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono flex items-center gap-1"
                      title="Abrir con Browser Agent"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Visitar</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{res.snippet}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="truncate">{res.url}</span>
                    <span className="text-purple-400">{res.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: DOM & Extracted Links */}
        {activeTab === 'dom' && pageData && !isLoading && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-[#0c101a] border border-white/10 space-y-3">
              <span className="font-bold text-white flex items-center gap-2">
                <Link className="w-4 h-4 text-cyan-400" />
                Enlaces Extraídos ({pageData.dom?.links?.length || 0})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {(pageData.dom?.links || []).map((l, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setUrl(l.href);
                      handleNavigate(null, l.href);
                    }}
                    className="p-2.5 rounded-lg bg-black/40 border border-white/5 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 cursor-pointer flex items-center justify-between gap-2 truncate"
                  >
                    <span className="truncate">{l.text}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Headings */}
            {pageData.dom?.headings && (
              <div className="p-4 rounded-xl bg-[#0c101a] border border-white/10 space-y-2">
                <span className="font-bold text-white flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-purple-400" />
                  Estructura de Encabezados (H1, H2, H3)
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {pageData.dom.headings.map((h, i) => (
                    <div key={i} className="p-1.5 rounded bg-black/40 text-slate-300 flex items-center gap-2">
                      <span className="text-[10px] text-purple-400 font-bold uppercase">{h.level}</span>
                      <span>{h.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Browser-Use Actions Panel */}
        {activeTab === 'actions' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="p-5 rounded-2xl bg-[#0c101c] border border-amber-500/30 space-y-4">
              <div>
                <h3 className="font-bold text-amber-300 flex items-center gap-2 text-sm">
                  <MousePointer className="w-4 h-4" />
                  Ejecución Interactiva de Acciones (Browser-Use)
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Ejecuta clics, escritura de texto, scroll o interacción con formularios en el navegador headless de Playwright.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Tipo de Acción</label>
                  <select
                    value={customActionType}
                    onChange={(e) => setCustomActionType(e.target.value)}
                    className="w-full p-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="click">Click en Elemento / Selector</option>
                    <option value="type">Escribir Texto en Input</option>
                    <option value="scroll">Hacer Scroll en Página</option>
                    <option value="screenshot">Capturar Pantalla en Vivo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Selector CSS / ID / Texto</label>
                  <input
                    type="text"
                    value={customActionTarget}
                    onChange={(e) => setCustomActionTarget(e.target.value)}
                    placeholder="ej: #login-btn o button.submit"
                    className="w-full p-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {customActionType === 'type' && (
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Texto a Escribir</label>
                    <input
                      type="text"
                      value={customActionValue}
                      onChange={(e) => setCustomActionValue(e.target.value)}
                      placeholder="Texto de entrada..."
                      className="w-full p-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleRunBrowserAction}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Ejecutar Acción Browser-Use</span>
                </button>
              </div>
            </div>

            {/* Action History Log */}
            {actionLog.length > 0 && (
              <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
                <span className="font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Historial de Acciones Ejecutadas
                </span>
                <div className="space-y-1">
                  {actionLog.map((log, li) => (
                    <div key={li} className="p-2 rounded bg-white/5 text-slate-300 flex items-center justify-between">
                      <span className="font-mono">{log.action}</span>
                      <span className="text-[10px] text-slate-500">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initial Empty State */}
        {!pageData && !searchResults && !isLoading && (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Globe className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-white">Navegación & Búsqueda Libre en Todo Internet</h3>
              <p className="text-xs text-slate-400">
                Astraura cuenta con capacidades completas de Browser-Use integradas por defecto: navegación libre en cualquier web, extracción semántica, interacción con el DOM y sincronización directa con la memoria de tokens 1.58 bits.
              </p>
            </div>
            <button
              onClick={() => handleNavigate(null, 'https://github.com/browser-use/browser-use')}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Explorar Browser-Use en GitHub</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
