import React, { useState } from 'react';
import { FileText, UploadCloud, CheckCircle, RefreshCw, AlertCircle, FileCode, Layers } from 'lucide-react';
import { uploadDocument, triggerReindex } from '../services/api';

export default function WorkspaceFiles({ onIndexed }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const initialFiles = [
    { name: "Cuantización vs. Offloading en IA.pdf", size: "266 KB", type: "PDF Document", status: "Indexado" },
    { name: "Potencial y Desafíos del 1.58 Bits.pdf", size: "190 KB", type: "PDF Document", status: "Indexado" }
  ];

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMessage(null);
    try {
      const res = await uploadDocument(file);
      setStatusMessage({ type: 'success', text: `Archivo "${file.name}" subido e indexado correctamente en la memoria asociativa.` });
      if (onIndexed) onIndexed();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Error al subir: ${err.message}` });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    setStatusMessage(null);
    try {
      const res = await triggerReindex();
      setStatusMessage({ type: 'success', text: `Reindexación completada: ${res.new_chunks_added} fragmentos y ${res.total_knowledge_nodes} nodos actualizados.` });
      if (onIndexed) onIndexed();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Error en reindexación: ${err.message}` });
    } finally {
      setIsReindexing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080b12] rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-6 space-y-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-400" />
            Base de Documentos & Suelo Fértil
          </h2>
          <p className="text-xs text-slate-400">
            Documentos indexados en la memoria vectorial y convertidos en conceptos del grafo
          </p>
        </div>

        <button
          onClick={handleReindex}
          disabled={isReindexing}
          className="px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold flex items-center gap-2 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isReindexing ? 'animate-spin' : ''}`} />
          {isReindexing ? 'Indexando...' : 'Escanear y Reindexar'}
        </button>
      </div>

      {/* Upload Box */}
      <div className="p-8 rounded-2xl border-2 border-dashed border-white/10 hover:border-cyan-500/40 bg-white/[0.02] flex flex-col items-center justify-center text-center relative transition-all group">
        <input
          type="file"
          accept=".pdf,.txt,.md,.py,.json"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-7 h-7 text-cyan-400" />
        </div>
        <h4 className="font-display font-bold text-sm text-white mb-1">
          {isUploading ? 'Procesando e indexando archivo...' : 'Arrastra o selecciona un archivo (PDF, MD, TXT)'}
        </h4>
        <p className="text-xs text-slate-400 max-w-sm">
          Astraura extraerá automáticamente el texto, formará fragmentos vectoriales y expandirá su grafo de conocimiento en segundo plano.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* File List */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-sm text-slate-300 uppercase tracking-wider">
          Documentos Fundacionales Indexados
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {initialFiles.map((f, idx) => (
            <div key={idx} className="p-4 rounded-xl glass-panel border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-white line-clamp-1">{f.name}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">{f.type} • {f.size}</p>
                </div>
              </div>
              <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-mono flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> {f.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
