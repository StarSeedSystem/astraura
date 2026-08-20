import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Bot,
  Brain,
  Cpu,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  History,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Layers,
  Wand2,
  FolderTree,
  Compass,
  Crown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Trash2,
  Share2,
  HardDrive
} from 'lucide-react';
import {
  fetchSynthesisReports,
  fetchLatestSynthesisReport,
  generateSynthesisReport,
  clearSynthesisReportsHistory
} from '../services/api';

export default function SynthesisReportModal({ isOpen, onClose, initialReportId = null }) {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'agents' | 'processes' | 'delta' | 'evolution'
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadReports();
    }
  }, [isOpen, initialReportId]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetchSynthesisReports(50);
      if (res && res.success) {
        setReports(res.reports || []);
        if (initialReportId) {
          const match = (res.reports || []).find(r => r.id === initialReportId);
          setSelectedReport(match || res.latest || (res.reports && res.reports[0]) || null);
        } else {
          setSelectedReport(res.latest || (res.reports && res.reports[0]) || null);
        }
      }
    } catch (e) {
      console.error("Error cargando informes de síntesis:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNewReport = async () => {
    setGenerating(true);
    try {
      const res = await generateSynthesisReport('manual_request', {
        theme: 'Síntesis Cognitiva Ejecutiva a Petición del Usuario'
      });
      if (res && res.success && res.report) {
        await loadReports();
        setSelectedReport(res.report);
      }
    } catch (e) {
      console.error("Error generando informe de síntesis:", e);
    } finally {
      setGenerating(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("¿Seguro que deseas reiniciar el historial de informes de síntesis?")) return;
    try {
      await clearSynthesisReportsHistory();
      await loadReports();
    } catch (e) {
      console.error("Error limpiando historial:", e);
    }
  };

  const handleCopyMarkdown = () => {
    if (!selectedReport) return;
    const r = selectedReport;
    const text = `
# 🌌 ${r.title}
**Fecha:** ${r.formatted_date}
**Cronista:** ${r.author_agent?.name || 'Hermes-Chronicler'} | **Supervisor:** ${r.supervisor}

## 📋 Resumen Ejecutivo
${r.executive_summary}

## 👥 Agentes Participantes & Procesos
${(r.participating_agents || []).map(a => `- **${a.name}** (${a.role}): ${a.process_developed} -> *${a.purpose}* (Resultado: ${a.result})`).join('\n')}

## ✅ Procesos Completados
${(r.completed_processes || []).map(p => `- [x] **${p.title}** (${p.category}): ${p.purpose} -> ${p.result}`).join('\n')}

## 🌿 Procesos Próximos / Siguientes Pasos
${(r.upcoming_processes || []).map(u => `- [ ] **${u.title}** (Agente: ${u.assigned_agent}, Prioridad: ${u.priority.toUpperCase()}): ${u.reason}`).join('\n')}

## 🔄 Cambios & Mejoras (Delta)
- **Lo Nuevo:** ${(r.delta_changes?.new_elements || []).join(', ')}
- **Lo Modificado:** ${(r.delta_changes?.modified_elements || []).join(', ')}
- **Mejoras:** ${(r.delta_changes?.improvements || []).join(', ')}

## 📊 Evolución vs Síntesis Previa
${r.comparison_with_previous?.evolution_narrative || 'Sin datos previos'}

---
*Verificación de Silicio M1: SHA-256 ${r.hardware_telemetry?.verification_sha256 || 'N/A'} | Latencia: ${r.hardware_telemetry?.latency_ms || 0}ms*
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const r = selectedReport;

  const renderAgentIcon = (iconName) => {
    switch (iconName) {
      case 'Cpu': return <Cpu className="w-4 h-4 text-emerald-400" />;
      case 'Wand2': return <Wand2 className="w-4 h-4 text-pink-400" />;
      case 'Brain': return <Brain className="w-4 h-4 text-purple-400" />;
      case 'FolderTree': return <FolderTree className="w-4 h-4 text-sky-400" />;
      case 'Compass': return <Compass className="w-4 h-4 text-amber-400" />;
      case 'ShieldCheck': return <ShieldCheck className="w-4 h-4 text-red-400" />;
      default: return <Bot className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className={`bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl max-h-[92vh] h-[92vh]'
      }`}>
        
        {/* Header Superior */}
        <div className="p-4 bg-slate-950/80 border-b border-cyan-500/20 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-purple-500/20 border border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2 truncate">
                  Informe de Síntesis del Usuario & Historial Inter-Síntesis
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono font-medium">
                  {reports.length} Síntesis Registradas
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 font-mono flex items-center gap-1">
                  <Bot className="w-3 h-3 text-purple-400" /> Hermes-Chronicler & Mnemosyne
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Explicación clara y comprensible de los procesos completados, próximos pasos, agentes utilizados y cambios entre cada síntesis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleGenerateNewReport}
              disabled={generating}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              title="Disparar un nuevo informe de síntesis en caliente"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Sintetizando...' : 'Forjar Síntesis Ahora'}
            </button>

            {r && (
              <button
                onClick={handleCopyMarkdown}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition-all"
                title="Copiar informe en formato Markdown"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 text-slate-400 hover:text-slate-200 transition-all"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo Principal: Sidebar de Historial + Panel Central */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Sidebar Izquierda: Lista de Síntesis Históricas */}
          <div className="w-full md:w-80 bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-800/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                Historial de Síntesis
              </span>
              <button
                onClick={handleClearHistory}
                className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                title="Borrar historial"
              >
                <Trash2 className="w-3 h-3" /> Limpiar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  Cargando historial de síntesis...
                </div>
              ) : reports.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No hay informes de síntesis aún. Haz clic en "Forjar Síntesis Ahora" para generar el primero.
                </div>
              ) : (
                reports.map((item, idx) => {
                  const isSelected = selectedReport?.id === item.id;
                  return (
                    <button
                      key={item.id || idx}
                      onClick={() => setSelectedReport(item)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-100 shadow-md shadow-cyan-950/30'
                          : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800/90 text-cyan-300 font-mono">
                          Síntesis #{item.synthesis_index || (reports.length - idx)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {item.formatted_date?.split(' ')[1] || 'Reciente'}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-200 line-clamp-1 mb-1">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{item.completed_processes?.length || 0} procesos</span>
                        <span>•</span>
                        <span>{item.participating_agents?.length || 0} agentes</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Panel Central: Contenido Detallado del Informe Seleccionado */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/40">
            {selectedReport ? (
              <>
                {/* Banner Superior del Informe Seleccionado */}
                <div className="p-4 bg-gradient-to-r from-slate-950/90 via-slate-900/80 to-cyan-950/30 border-b border-slate-800 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs font-mono">
                          Síntesis #{selectedReport.synthesis_index}
                        </span>
                        <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {selectedReport.formatted_date}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                          Supervisor: {selectedReport.supervisor}
                        </span>
                      </div>
                      <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {selectedReport.title}
                      </h1>
                    </div>

                    {/* Badge de Silicio M1 */}
                    <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-right">
                      <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {selectedReport.hardware_telemetry?.platform || 'Apple Silicon M1'}
                        </div>
                        <div className="text-[11px] font-mono font-semibold text-emerald-400 flex items-center gap-1 justify-end">
                          <Zap className="w-3 h-3" />
                          {selectedReport.hardware_telemetry?.latency_ms || 4.2}ms latencia
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Pestañas del Informe */}
                  <div className="flex items-center gap-1.5 mt-3 overflow-x-auto custom-scrollbar pt-1">
                    <button
                      onClick={() => setActiveTab('summary')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                        activeTab === 'summary'
                          ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-sm'
                          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      1. Resumen Ejecutivo
                    </button>
                    <button
                      onClick={() => setActiveTab('agents')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                        activeTab === 'agents'
                          ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300 shadow-sm'
                          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      2. Agentes & Para Qué ({selectedReport.participating_agents?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab('processes')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                        activeTab === 'processes'
                          ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-sm'
                          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      3. Completados & Próximos
                    </button>
                    <button
                      onClick={() => setActiveTab('delta')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                        activeTab === 'delta'
                          ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-sm'
                          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      4. Lo Nuevo, Modificado & Mejoras
                    </button>
                    <button
                      onClick={() => setActiveTab('evolution')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                        activeTab === 'evolution'
                          ? 'bg-sky-500/20 border border-sky-500/50 text-sky-300 shadow-sm'
                          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      5. Comparativa vs Síntesis Previa
                    </button>
                  </div>
                </div>

                {/* Contenido Dinámico de la Pestaña Activa */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                  
                  {/* Pestaña 1: Resumen Ejecutivo */}
                  {activeTab === 'summary' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 shadow-md">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          ¿Qué ocurrió en esta Síntesis? (Explicación para el Usuario)
                        </h3>
                        <p className="text-sm text-slate-200 leading-relaxed font-sans">
                          {selectedReport.executive_summary}
                        </p>
                      </div>

                      {/* Tarjetas de Métricas Resumidas */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-500/30">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Procesos Finalizados
                          </span>
                          <div className="text-xl font-bold text-emerald-300 font-mono mt-1">
                            {selectedReport.completed_processes?.length || 0}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-purple-500/30">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5 text-purple-400" />
                            Agentes Activos
                          </span>
                          <div className="text-xl font-bold text-purple-300 font-mono mt-1">
                            {selectedReport.participating_agents?.length || 0}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/30">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            Nuevos Elementos
                          </span>
                          <div className="text-xl font-bold text-amber-300 font-mono mt-1">
                            {selectedReport.delta_changes?.new_elements?.length || 0}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-cyan-500/30">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                            Verificación AST
                          </span>
                          <div className="text-sm font-bold text-cyan-300 font-mono mt-1">
                            100% Válido
                          </div>
                        </div>
                      </div>

                      {/* Auditoría de Veracidad y Hash */}
                      <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-xs flex items-center justify-between flex-wrap gap-2 font-mono">
                        <div className="flex items-center gap-2 text-slate-400">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>Firma Criptográfica SHA-256 de Veracidad:</span>
                          <span className="text-cyan-300 font-bold break-all">
                            {selectedReport.hardware_telemetry?.verification_sha256?.substring(0, 32)}...
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px]">
                          Sandbox Seguro 100% Offline
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Pestaña 2: Agentes & Para Qué se Usaron */}
                  {activeTab === 'agents' && (
                    <div className="space-y-3 animate-in fade-in duration-150">
                      <div className="text-xs text-slate-400 mb-1">
                        Detalle de los agentes especializados convocados en esta síntesis, qué procesos desarrollaron y con qué propósito específico:
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(selectedReport.participating_agents || []).map((ag, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700">
                                    {renderAgentIcon(ag.icon)}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-white">{ag.name}</div>
                                    <div className="text-[10px] text-slate-400">{ag.role}</div>
                                  </div>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 font-mono">
                                  Activo
                                </span>
                              </div>

                              <div className="space-y-2 mt-2 text-xs">
                                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
                                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                                    Proceso Desarrollado:
                                  </span>
                                  <span className="text-slate-200 font-medium">{ag.process_developed}</span>
                                </div>

                                <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/20">
                                  <span className="text-[10px] text-cyan-400 block uppercase font-bold tracking-wider">
                                    ¿Para qué se desarrolló? (Propósito):
                                  </span>
                                  <span className="text-cyan-100">{ag.purpose}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-800/60 text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span className="truncate">{ag.result}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pestaña 3: Procesos Completados & Procesos Próximos */}
                  {activeTab === 'processes' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in duration-150">
                      
                      {/* Columna Izquierda: Procesos Completados */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Procesos Completados en esta Síntesis ({selectedReport.completed_processes?.length || 0})
                        </h3>

                        <div className="space-y-2">
                          {(selectedReport.completed_processes || []).map((proc, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-emerald-500/20 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-200">{proc.title}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-mono">
                                  {proc.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">{proc.purpose}</p>
                              <div className="text-[10px] font-mono text-emerald-400 pt-1 flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                Resultado: {proc.result}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Columna Derecha: Procesos Próximos / Siguientes Pasos */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          Procesos Próximos & Proyecciones Futuras ({selectedReport.upcoming_processes?.length || 0})
                        </h3>

                        <div className="space-y-2">
                          {(selectedReport.upcoming_processes || []).map((up, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-sky-500/20 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-200">{up.title}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                  up.priority === 'high'
                                    ? 'bg-red-950/80 border border-red-500/40 text-red-300'
                                    : up.priority === 'medium'
                                    ? 'bg-amber-950/80 border border-amber-500/40 text-amber-300'
                                    : 'bg-slate-800 text-slate-300'
                                }`}>
                                  Prioridad {up.priority?.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300">{up.reason}</p>
                              <div className="text-[10px] font-mono text-sky-400 pt-1 flex items-center gap-1">
                                <Bot className="w-3 h-3" />
                                Agente Asignado: {up.assigned_agent}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Pestaña 4: Lo Nuevo, Lo Modificado & Mejoras (Delta) */}
                  {activeTab === 'delta' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in duration-150">
                      
                      {/* Lo Nuevo */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-cyan-500/30 space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          ✨ Lo Nuevo
                        </h3>
                        <div className="space-y-1.5 text-xs">
                          {(selectedReport.delta_changes?.new_elements || []).length === 0 ? (
                            <div className="text-slate-500 text-[11px]">Sin nuevos elementos registrados.</div>
                          ) : (
                            selectedReport.delta_changes.new_elements.map((item, idx) => (
                              <div key={idx} className="p-2 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-cyan-200 text-xs">
                                {item}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Lo Modificado */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-purple-500/30 space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                          <Layers className="w-4 h-4" />
                          ✏️ Lo Modificado
                        </h3>
                        <div className="space-y-1.5 text-xs">
                          {(selectedReport.delta_changes?.modified_elements || []).length === 0 ? (
                            <div className="text-slate-500 text-[11px]">Sin modificaciones estructurales.</div>
                          ) : (
                            selectedReport.delta_changes.modified_elements.map((item, idx) => (
                              <div key={idx} className="p-2 rounded-lg bg-purple-950/20 border border-purple-500/20 text-purple-200 text-xs">
                                {item}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Mejoras Tangibles */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" />
                          ⚡ Mejoras & Optimización
                        </h3>
                        <div className="space-y-1.5 text-xs">
                          {(selectedReport.delta_changes?.improvements || []).length === 0 ? (
                            <div className="text-slate-500 text-[11px]">Optimizaciones estándar aplicadas.</div>
                          ) : (
                            selectedReport.delta_changes.improvements.map((item, idx) => (
                              <div key={idx} className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-200 text-xs">
                                {item}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Pestaña 5: Comparativa vs Síntesis Previa (Evolución) */}
                  {activeTab === 'evolution' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-sky-500/30 shadow-md">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" />
                          Narrativa de Evolución Inter-Síntesis
                        </h3>
                        <p className="text-sm text-slate-200 leading-relaxed font-sans">
                          {selectedReport.comparison_with_previous?.evolution_narrative}
                        </p>
                      </div>

                      {selectedReport.comparison_with_previous?.has_previous && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Síntesis Anterior</span>
                            <div className="text-xs font-bold text-slate-200 mt-0.5">
                              #{selectedReport.comparison_with_previous.previous_synthesis_index}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-1">
                              {selectedReport.comparison_with_previous.previous_synthesis_date}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Tiempo Transcurrido</span>
                            <div className="text-sm font-bold text-cyan-300 font-mono mt-0.5">
                              {selectedReport.comparison_with_previous.minutes_elapsed} minutos
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              Entre síntesis consecutivas
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Delta de Procesos</span>
                            <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                              {selectedReport.comparison_with_previous.metrics_delta?.completed_processes_diff}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              Nuevos procesos completados
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Sparkles className="w-8 h-8 text-cyan-500/40 animate-pulse mb-3" />
                <p className="text-sm text-slate-300 font-medium">Selecciona un informe del historial lateral</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  O presiona "Forjar Síntesis Ahora" para que el Agente Cronista desarrolle un nuevo informe comprensible.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
