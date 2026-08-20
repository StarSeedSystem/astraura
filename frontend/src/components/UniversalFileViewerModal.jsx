import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FileText, 
  FileCode, 
  File, 
  Search, 
  ArrowLeft, 
  RefreshCw, 
  Check, 
  ExternalLink, 
  Copy, 
  Maximize2, 
  Minimize2, 
  X, 
  HardDrive, 
  Server, 
  ShieldCheck, 
  Sparkles, 
  Download, 
  ChevronRight,
  Music,
  Image as ImageIcon,
  Hash,
  Clock,
  FolderTree,
  Terminal
} from 'lucide-react';
import { fetchItemDetails, openNativePath } from '../services/api';

export default function UniversalFileViewerModal({ 
  initialPath = null, 
  isOpen = false, 
  onClose = () => {} 
}) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [itemData, setItemData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);
  const [nativeOpenStatus, setNativeOpenStatus] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    if (initialPath) {
      setCurrentPath(initialPath);
    }
  }, [initialPath]);

  // Load item details
  const loadItem = async (path) => {
    if (!path) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchItemDetails(path);
      if (data.success) {
        setItemData(data);
        setCurrentPath(data.path);
      } else {
        setError(data.error || 'No se pudo cargar el archivo o carpeta.');
      }
    } catch (err) {
      setError(err.message || 'Error de comunicación con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentPath) {
      loadItem(currentPath);
    }
  }, [isOpen, currentPath]);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleOpenNative = async (path, reveal = true) => {
    setNativeOpenStatus('opening');
    try {
      const res = await openNativePath(path || currentPath, reveal);
      if (res.success) {
        setNativeOpenStatus('opened');
        setTimeout(() => setNativeOpenStatus(null), 3000);
      } else {
        setNativeOpenStatus('error');
        setTimeout(() => setNativeOpenStatus(null), 3000);
      }
    } catch (err) {
      console.error('Error opening native file:', err);
      setNativeOpenStatus('error');
      setTimeout(() => setNativeOpenStatus(null), 3000);
    }
  };

  const handleCopyPath = () => {
    if (currentPath) {
      navigator.clipboard.writeText(currentPath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  const handleCopyContent = () => {
    if (itemData && itemData.content) {
      navigator.clipboard.writeText(itemData.content);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    }
  };

  const handleCopySha = () => {
    if (itemData && itemData.sha256) {
      navigator.clipboard.writeText(itemData.sha256);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!itemData || !itemData.content) return;
    const blob = new Blob([itemData.content], { type: itemData.mime_type || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = itemData.name || 'archivo_soberano.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const isDir = itemData?.is_dir;
  const filteredItems = isDir && itemData?.items ? itemData.items.filter(it => 
    it.name.toLowerCase().includes(filterQuery.toLowerCase())
  ) : [];

  const getFileIcon = (ext, isDirectory) => {
    if (isDirectory) return <Folder className="w-5 h-5 text-amber-400" />;
    const extLower = (ext || '').toLowerCase();
    if (['.py', '.cpp', '.h', '.c', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.glsl'].includes(extLower)) {
      return <FileCode className="w-5 h-5 text-cyan-400" />;
    }
    if (['.json', '.yaml', '.yml', '.toml'].includes(extLower)) {
      return <Terminal className="w-5 h-5 text-purple-400" />;
    }
    if (['.md', '.txt', '.log'].includes(extLower)) {
      return <FileText className="w-5 h-5 text-emerald-400" />;
    }
    if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(extLower)) {
      return <ImageIcon className="w-5 h-5 text-pink-400" />;
    }
    if (['.wav', '.mp3', '.ogg', '.flac'].includes(extLower)) {
      return <Music className="w-5 h-5 text-indigo-400" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/60 flex flex-col transition-all duration-200 overflow-hidden ${
          isFullscreen 
            ? 'w-full h-full rounded-none border-none' 
            : 'w-full max-w-5xl h-[88vh] max-h-[900px]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/80 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 shrink-0">
              {itemData ? getFileIcon(itemData.extension, isDir) : <HardDrive className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate">
                  {itemData?.name || 'Inspeccionando Ubicación...'}
                </h3>
                {itemData?.storage_tier && (
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 shrink-0 hidden sm:inline-block">
                    {itemData.storage_tier}
                  </span>
                )}
              </div>
              
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-1 text-xs text-slate-400 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
                {itemData?.breadcrumbs?.map((bc, idx) => (
                  <React.Fragment key={bc.path}>
                    {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
                    <button
                      onClick={() => setCurrentPath(bc.path)}
                      className="hover:text-cyan-300 hover:underline transition-colors focus:outline-none"
                    >
                      {bc.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Open in Finder / Native OS */}
            <button
              onClick={() => handleOpenNative(currentPath, !isDir)}
              title="Abrir o revelar en Finder / Sistema Nativo de macOS"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                nativeOpenStatus === 'opened'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-lg shadow-emerald-900/40'
                  : nativeOpenStatus === 'error'
                  ? 'bg-red-950/80 text-red-300 border-red-500/60'
                  : 'bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border-cyan-500/40 hover:border-cyan-400'
              }`}
            >
              {nativeOpenStatus === 'opened' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>¡Abierto en Finder!</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Abrir en Finder</span>
                  <span className="sm:hidden">Finder</span>
                </>
              )}
            </button>

            {/* Copy Absolute Path */}
            <button
              onClick={handleCopyPath}
              title="Copiar ruta absoluta al portapapeles"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              {copiedPath ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Reload */}
            <button
              onClick={() => loadItem(currentPath)}
              title="Recargar archivo o carpeta"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              title="Cerrar (Esc)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/80 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/50 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 bg-slate-950/90 overflow-hidden flex flex-col">
          {isLoading && !itemData ? (
            <div className="flex-1 flex items-center justify-center p-8 text-cyan-400 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-sm font-mono">Leyendo sistema de archivos y telemetría...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="p-3 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 mb-3">
                <X className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Error al inspeccionar ubicación</h4>
              <p className="text-xs text-red-300 max-w-md mb-4">{error}</p>
              <button
                onClick={() => handleOpenNative(currentPath, true)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Intentar abrir directamente en Finder / OS
              </button>
            </div>
          ) : isDir ? (
            /* ================= FOLDER VIEW ================= */
            <div className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden">
              {/* Folder Toolbar */}
              <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  {itemData?.parent_path && (
                    <button
                      onClick={() => setCurrentPath(itemData.parent_path)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Subir Nivel</span>
                    </button>
                  )}
                  <span className="text-xs text-slate-400 font-mono">
                    {itemData.total_items} elementos en directorio
                  </span>
                </div>

                <div className="relative w-48 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Filtrar archivos..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Items Grid / List */}
              <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-2 divide-y divide-slate-800/60">
                {filteredItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 font-mono">
                    No se encontraron elementos que coincidan con el filtro.
                  </div>
                ) : (
                  filteredItems.map((it) => (
                    <div
                      key={it.path}
                      onClick={() => {
                        if (it.is_dir) {
                          setCurrentPath(it.path);
                        } else {
                          loadItem(it.path);
                        }
                      }}
                      className="group flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-cyan-950/40 hover:border-cyan-500/30 border border-transparent transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="shrink-0">
                          {getFileIcon(it.extension, it.is_dir)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 truncate">
                            {it.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {it.path}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {it.size_formatted}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenNative(it.path, !it.is_dir);
                          }}
                          title="Abrir en Finder"
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* ================= FILE VIEW ================= */
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* File Action Ribbon */}
              <div className="flex items-center justify-between gap-3 px-4 py-2 bg-slate-900/90 border-b border-slate-800 shrink-0 text-xs font-mono">
                <div className="flex items-center gap-3 text-slate-400">
                  <span>{itemData?.size_formatted}</span>
                  <span>•</span>
                  <span>{itemData?.mime_type}</span>
                  {itemData?.parent_path && (
                    <>
                      <span>•</span>
                      <button
                        onClick={() => setCurrentPath(itemData.parent_path)}
                        className="text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <Folder className="w-3 h-3 text-amber-400" />
                        <span>Ver Carpeta Contenedora</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyContent}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  >
                    {copiedContent ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar Contenido</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Descargar</span>
                  </button>
                </div>
              </div>

              {/* Code / Content Viewer */}
              <div className="flex-1 min-h-0 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-200 select-text">
                {itemData?.content ? (
                  <pre className="whitespace-pre-wrap break-all leading-relaxed">
                    {itemData.content}
                  </pre>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    Archivo vacío o binario no imprimible como texto plano. Utiliza el botón "Abrir en Finder" para ejecutarlo de forma nativa.
                  </div>
                )}
              </div>

              {/* Bottom Metadata Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-950 border-t border-slate-800 shrink-0 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-2 truncate max-w-full">
                  <Hash className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="text-slate-500 shrink-0">SHA-256:</span>
                  <span className="text-cyan-300 truncate">{itemData?.sha256 || 'Calculando hash...'}</span>
                  {itemData?.sha256 && (
                    <button
                      onClick={handleCopySha}
                      title="Copiar hash SHA-256"
                      className="text-slate-400 hover:text-white shrink-0 ml-1"
                    >
                      {copiedSha ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-slate-500">
                    Modificado: {itemData?.modified_timestamp ? new Date(itemData.modified_timestamp * 1000).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
