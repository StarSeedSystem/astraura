import React, { useState } from 'react';
import { 
  MessageSquare, 
  FolderPlus, 
  Folder, 
  FolderOpen, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ChevronRight, 
  ChevronDown,
  MoreVertical,
  Clock,
  Sparkles
} from 'lucide-react';

export default function ChatHistoryDrawer({
  sessions,
  activeSessionId,
  folders,
  onSelectSession,
  onNewSession,
  onCreateFolder,
  onDeleteFolder,
  onDeleteSession,
  onMoveSessionToFolder
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFolders, setOpenFolders] = useState({ default: true });
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderForMove, setSelectedFolderForMove] = useState(null);

  const toggleFolder = (folderId) => {
    setOpenFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCreateFolder = (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  // Filter sessions by search query
  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full sm:w-72 h-full bg-[#0a0d15] border-r border-white/10 flex flex-col p-3 space-y-3 z-10">
      {/* Top Action: New Chat */}
      <button
        onClick={onNewSession}
        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all shadow-md"
      >
        <Plus className="w-4 h-4" />
        <span>Nueva Conversación</span>
      </button>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar conversaciones..."
          className="w-full px-3 py-1.5 pl-8 rounded-xl glass-input text-xs text-white placeholder-slate-500"
        />
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2 pointer-events-none" />
      </div>

      {/* Folders & Sessions List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {/* Create Folder Row */}
        <div className="flex items-center justify-between px-1 text-[11px] font-mono text-slate-400">
          <span>Carpetas & Historial</span>
          <button
            onClick={() => setIsCreatingFolder(!isCreatingFolder)}
            className="hover:text-cyan-300 p-1 rounded transition-colors"
            title="Crear nueva carpeta"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {isCreatingFolder && (
          <form onSubmit={handleCreateFolder} className="flex items-center gap-1.5 p-1.5 bg-white/5 rounded-xl border border-white/10">
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nombre de carpeta..."
              className="flex-1 px-2 py-1 rounded-lg bg-black/40 text-xs text-white border-0 outline-none"
            />
            <button type="submit" className="p-1 text-emerald-400 hover:bg-white/10 rounded">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => setIsCreatingFolder(false)} className="p-1 text-slate-400 hover:bg-white/10 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Render Folders */}
        {folders.map((folder) => {
          const folderSessions = filteredSessions.filter((s) => s.folderId === folder.id);
          const isOpen = openFolders[folder.id] ?? true;

          return (
            <div key={folder.id} className="space-y-1">
              <div
                onClick={() => toggleFolder(folder.id)}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-xs font-semibold text-slate-300 group"
              >
                <div className="flex items-center gap-2 truncate">
                  {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                  {isOpen ? <FolderOpen className="w-3.5 h-3.5 text-cyan-400" /> : <Folder className="w-3.5 h-3.5 text-cyan-400" />}
                  <span className="truncate">{folder.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-mono">{folderSessions.length}</span>
                  {folder.id !== 'default' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFolder(folder.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sessions inside this folder */}
              {isOpen && (
                <div className="pl-4 space-y-1 border-l border-white/5 ml-3">
                  {folderSessions.map((session) => {
                    const isActive = activeSessionId === session.id;
                    return (
                      <div
                        key={session.id}
                        onClick={() => onSelectSession(session.id)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer group transition-all ${
                          isActive
                            ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-200'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MessageSquare className="w-3 h-3 flex-shrink-0 text-slate-500 group-hover:text-cyan-400" />
                          <span className="truncate">{session.title}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                          title="Eliminar chat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {folderSessions.length === 0 && (
                    <p className="text-[10px] text-slate-600 italic px-2 py-1">Sin chats en esta carpeta</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
