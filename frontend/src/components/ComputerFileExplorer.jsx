import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderTree, 
  FileText, 
  FileCode, 
  FileSearch, 
  Search, 
  ArrowLeft, 
  RefreshCw, 
  UploadCloud, 
  Check, 
  ShieldCheck, 
  Terminal, 
  HardDrive, 
  MessageSquare, 
  Eye, 
  Sparkles,
  Lock,
  Box,
  FolderOpen
} from 'lucide-react';
import { fetchComputerFiles, readComputerFile, searchComputerFiles, indexCustomPath } from '../services/api';

export default function ComputerFileExplorer({ onFileSelectForChat }) {
  const [currentPath, setCurrentPath] = useState(null);
  const [parentPath, setParentPath] = useState(null);
  const [items, setItems] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [indexStatus, setIndexStatus] = useState(null);
  const [isBrowserPickerActive, setIsBrowserPickerActive] = useState(false);
  const [browserPickedFiles, setBrowserPickedFiles] = useState([]);

  const loadDirectory = async (path = null) => {
    setIsLoading(true);
    setSearchResults(null);
    try {
      const data = await fetchComputerFiles(path);
      setCurrentPath(data.current_path);
      setParentPath(data.parent_path);
      setItems(data.items || []);
    } catch (err) {
      console.warn('Local FS not reachable, enabling Browser File System Access:', err);
      setIsBrowserPickerActive(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, []);

  const handleItemClick = async (item) => {
    if (item.is_dir) {
      loadDirectory(item.path);
    } else {
      setActiveFile(item);
      setIsLoading(true);
      try {
        const data = await readComputerFile(item.path);
        setFileContent(data);
      } catch (err) {
        setFileContent({ success: false, error: err.message });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const data = await searchComputerFiles(searchQuery.trim(), currentPath);
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIndexPath = async (path) => {
    setIndexStatus({ loading: true, path });
    try {
      const res = await indexCustomPath(path);
      setIndexStatus({ loading: false, success: true, message: `Indexados ${res.new_chunks_added} fragmentos en memoria de 1.58 bits.` });
      setTimeout(() => setIndexStatus(null), 4000);
    } catch (err) {
      setIndexStatus({ loading: false, success: false, message: err.message });
    }
  };

  // Browser W3C File System Access API (For pure web online mode)
  const handleOpenLocalDirectoryInBrowser = async () => {
    if (!window.showDirectoryPicker) {
      alert("Tu navegador no soporta File System Access API. Usa la instalación nativa de Astraura con el instalador de 1 línea.");
      return;
    }
    try {
      const dirHandle = await window.showDirectoryPicker();
      const collected = [];
      for await (const entry of dirHandle.values()) {
        collected.push({
          name: entry.name,
          path: `${dirHandle.name}/${entry.name}`,
          is_dir: entry.kind === 'directory',
          size_formatted: entry.kind === 'file' ? 'Local' : 'Directorio',
          handle: entry
        });
      }
      setCurrentPath(dirHandle.name);
      setItems(collected);
      setIsBrowserPickerActive(true);
    } catch (err) {
      console.warn("Directorio no seleccionado:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#08090d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
      {/* Header & Path Bar */}
      <div className="p-4 bg-[#0e1117] border-b border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                Explorador del Dispositivo // Acceso Completo
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono">
                  Permisos Activos
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Navega cualquier carpeta del equipo, previsualiza archivos e incorpóralos a la memoria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenLocalDirectoryInBrowser}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Abrir Carpeta Local (Web)</span>
            </button>

            <button
              onClick={() => loadDirectory(currentPath)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
              title="Recargar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Path Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#06080c] border border-white/10 text-xs font-mono text-slate-300 w-full overflow-x-auto">
            {parentPath && (
              <button
                onClick={() => loadDirectory(parentPath)}
                className="p-1 hover:bg-white/10 rounded text-cyan-400 flex-shrink-0"
                title="Subir un nivel"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-cyan-400 select-none">root@local:</span>
            <span className="text-white truncate">{currentPath || "~"}</span>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-1 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar archivos..."
                className="px-3 py-1.5 pr-8 rounded-xl glass-input text-xs text-white placeholder-slate-500 w-full sm:w-48"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-semibold"
            >
              Buscar
            </button>
          </form>
        </div>
      </div>

      {/* Index Status Notification */}
      {indexStatus && (
        <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            <span>{indexStatus.message}</span>
          </div>
        </div>
      )}

      {/* Main Split Layout: File List & Preview */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Directory Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 border-b md:border-b-0 md:border-r border-white/10">
          {searchResults ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-white/5 text-[11px] text-slate-400 font-mono">
                <span>Resultados de búsqueda: {searchResults.length}</span>
                <button onClick={() => setSearchResults(null)} className="text-cyan-400 hover:underline">
                  Volver a carpetas
                </button>
              </div>
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleItemClick(item)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer text-xs group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <div className="truncate">
                      <span className="text-white font-medium block truncate">{item.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono truncate block">{item.path}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{item.size_formatted}</span>
                </div>
              ))}
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleItemClick(item)}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer text-xs group ${
                  activeFile?.path === item.path ? 'bg-blue-500/20 border border-blue-500/40 text-blue-200' : 'hover:bg-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {item.is_dir ? (
                    <Folder className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  ) : item.name.endsWith('.py') || item.name.endsWith('.js') || item.name.endsWith('.cpp') ? (
                    <FileCode className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="truncate font-medium">{item.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 font-mono">{item.size_formatted}</span>
                  {!item.is_dir && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIndexPath(item.path);
                      }}
                      className="opacity-0 group-hover:opacity-100 px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-mono transition-opacity"
                      title="Indexar en memoria de 1.58 bits"
                    >
                      Indexar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {items.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
              <FolderTree className="w-8 h-8 text-slate-600" />
              <p className="text-xs text-slate-400">Directorio vacío o sin elementos indexables.</p>
            </div>
          )}
        </div>

        {/* Right Side: File Preview Panel */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#06080c] flex flex-col justify-between">
          {activeFile ? (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="truncate">
                  <h4 className="font-display font-bold text-sm text-white truncate">{activeFile.name}</h4>
                  <span className="text-[10px] font-mono text-slate-400 truncate block">{activeFile.path}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleIndexPath(activeFile.path)}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-mono flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Indexar</span>
                  </button>
                </div>
              </div>

              {/* File Content Preview */}
              <div className="flex-1 rounded-xl bg-black/50 border border-white/5 p-3 overflow-y-auto max-h-[450px]">
                {fileContent?.success ? (
                  <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {fileContent.content}
                  </pre>
                ) : (
                  <p className="text-xs text-slate-500 italic">Cargando previsualización...</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 p-8">
              <Eye className="w-10 h-10 text-slate-600" />
              <div className="space-y-1">
                <h4 className="font-display font-bold text-sm text-slate-300">Selecciona un archivo</h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  Haz clic en cualquier archivo del panel izquierdo para previsualizar su contenido e incorporarlo a la memoria.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
