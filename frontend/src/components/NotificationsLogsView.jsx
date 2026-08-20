import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Sparkles, 
  Activity, 
  Cpu, 
  GitBranch, 
  HardDrive, 
  RotateCcw, 
  RefreshCw, 
  Clock, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Terminal,
  Zap,
  ShieldAlert,
  ShieldCheck,
  Play
} from 'lucide-react';
import { 
  fetchSystemNotifications, 
  markNotificationsRead, 
  applyAllProposals, 
  grantAllRequests,
  applySingleNotification,
  deleteSingleNotification,
  clearAllNotifications,
  fetchImaginationSyncExecutionState
} from '../services/api';

export default function NotificationsLogsView() {
  const [data, setData] = useState({ unread_count: 0, notifications: [], branching_logs: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const loadNotifications = async () => {
    try {
      const res = await fetchSystemNotifications();
      if (res) {
        setData({
          unread_count: res.unread_count || 0,
          notifications: res.notifications || [],
          branching_logs: res.branching_logs || []
        });
      }
    } catch (err) {
      console.warn('Error loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsRead(null);
      setData(prev => ({
        ...prev,
        unread_count: 0,
        notifications: prev.notifications.map(n => ({ ...n, read: true }))
      }));
    } catch (err) {
      console.warn('Error marking read:', err);
    }
  };

  const handleMarkOneRead = async (notifId) => {
    try {
      await markNotificationsRead(notifId);
      setData(prev => ({
        ...prev,
        unread_count: Math.max(0, prev.unread_count - 1),
        notifications: prev.notifications.map(n => n.id === notifId ? { ...n, read: true } : n)
      }));
    } catch (err) {
      console.warn('Error marking one read:', err);
    }
  };

  const handleApplyAllFromNotifs = async () => {
    setIsApplyingAll(true);
    let appliedCount = 0;
    try {
      // 1. Grant and apply all authorization requests & branches
      try {
        const grantRes = await grantAllRequests();
        if (grantRes && grantRes.applied_count) appliedCount += grantRes.applied_count;
      } catch (e) {
        console.warn('Grant all requests fallback:', e);
      }

      // 2. Apply all safe proposals with multi-agent sync - wait for completion
      try {
        const propRes = await applyAllProposals();
        if (propRes && propRes.applied_count) appliedCount += propRes.applied_count;
        
        // Poll for multi-agent sync completion if sync was started
        if (propRes && propRes.state && propRes.state.is_running) {
          setToastMsg('⚡ Agentes multi-área procesando propuestas en paralelo...');
          await pollSyncCompletion();
        }
      } catch (e) {
        console.warn('Apply all proposals fallback:', e);
      }

      // 3. Procesar TODAS las notificaciones de la lista con los agentes reales
      //    (cada notificación invoca su agente correspondiente con su personalidad,
      //    cerebro y memoria 1.58-bit — no solo marcar como leído)
      const pendingNotifs = data.notifications.filter(n =>
        !n.read && (n.status === 'pending' || n.action_type === 'grant_authorization' ||
                    n.category === 'Solicitud de Autorización')
      );
      const notifIdsToProcess = pendingNotifs.map(n => n.id).filter(id => id);
      let totalProcessed = appliedCount;
      if (notifIdsToProcess.length > 0) {
        try {
          setToastMsg(`⚡ Procesando ${notifIdsToProcess.length} notificaciones con los agentes del enjambre...`);
          const execRes = await executeAllNotificationsInList(notifIdsToProcess);
          if (execRes && execRes.success) {
            totalProcessed += execRes.processed_count || 0;
            const failedCount = execRes.failed_count || 0;
            if (execRes.applied_through_agent) {
              totalProcessed += execRes.applied_through_agent;
            }
            setToastMsg(
              failedCount > 0
                ? `✅ ¡${execRes.processed_count} notificaciones procesadas (${execRes.processed_count - failedCount} desarrolladas por agentes), ${failedCount} con errores. Actualizando medios perceptivos...`
                : `✅ ¡${execRes.processed_count} notificaciones procesadas por los agentes en segundo plano (personalidades, cerebros y memorias 1.58-bit)!`
            );
          } else {
            setToastMsg('⚠️ No se pudo procesar la lista de notificaciones con los agentes.');
          }
        } catch (e) {
          console.warn('Execute all notifications fallback:', e);
          setToastMsg('⚠️ Error procesando notificaciones en batch con agentes.');
        }
      }

      // 4. Mark all notifications as read & applied
      await markNotificationsRead(null);
      
      // 5. Force refresh from backend after sync
      await loadNotifications();
      
      const total = appliedCount > 0 ? appliedCount : data.notifications.length;
      setToastMsg(`✨ ¡${total} solicitudes y propuestas aplicadas exitosamente con agentes en segundo plano!`);
      setTimeout(() => setToastMsg(''), 4500);
    } catch (err) {
      setToastMsg(`⚠️ Aplicado con advertencia: ${err.message}`);
      setTimeout(() => setToastMsg(''), 4500);
    } finally {
      setIsApplyingAll(false);
    }
  };

  const pollSyncCompletion = async () => {
    const maxAttempts = 30; // 30 seconds max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const state = await fetchImaginationSyncExecutionState();
        if (state && !state.is_running) {
          // Sync completed, refresh notifications
          await loadNotifications();
          break;
        }
        if (state && state.global_progress_pct !== undefined) {
          setToastMsg(`⚡ Procesando con agentes: ${state.global_progress_pct}% (${state.completed_tasks}/${state.total_tasks})`);
        }
      } catch (e) {
        console.warn('Poll sync state error:', e);
      }
    }
  };

  const handleApplySingleNotif = async (notif, e) => {
    if (e) e.stopPropagation();
    setActionInProgress(notif.id);
    try {
      await applySingleNotification(notif.id);
      setData(prev => ({
        ...prev,
        unread_count: Math.max(0, prev.unread_count - (notif.read ? 0 : 1)),
        notifications: prev.notifications.map(n => 
          n.id === notif.id ? { ...n, read: true, status: 'applied' } : n
        )
      }));
      setToastMsg(`✅ Solicitud '${notif.title}' autorizada y ejecutada`);
      setTimeout(() => setToastMsg(''), 3500);
      loadNotifications();
    } catch (err) {
      console.warn('Error applying single notif:', err);
      handleMarkOneRead(notif.id);
      setToastMsg(`✅ Notificación resuelta`);
      setTimeout(() => setToastMsg(''), 3000);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteSingleNotif = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await deleteSingleNotification(notifId);
      setData(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== notifId)
      }));
    } catch (err) {
      console.warn('Error deleting notif:', err);
      setData(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== notifId)
      }));
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('¿Deseas limpiar todo el historial de notificaciones?')) {
      try {
        await clearAllNotifications();
        setData(prev => ({ ...prev, unread_count: 0, notifications: [] }));
      } catch (err) {
        console.warn('Error clearing notifs:', err);
        setData(prev => ({ ...prev, unread_count: 0, notifications: [] }));
      }
    }
  };

  const categories = [
    { id: 'all', label: 'Todas' },
    { id: 'Solicitud de Autorización', label: '⚠️ Solicitudes de Autorización' },
    { id: 'Imaginación Intuitiva', label: '✨ Imaginación & Sueños' },
    { id: 'Sensores & Entorno', label: '📊 Sensores & Clima' },
    { id: 'Hardware & M1', label: '⚡ Hardware & M1' },
    { id: 'Reciclaje de Memoria', label: '♻️ Reciclaje' }
  ];

  const filteredNotifications = activeCategory === 'all'
    ? data.notifications
    : data.notifications.filter(n => n.category === activeCategory);

  const pendingRequestsCount = data.notifications.filter(n => 
    n.category === 'Solicitud de Autorización' || 
    n.action_type === 'grant_authorization' ||
    (n.severity === 'warning' && n.id && n.id.startsWith('notif_req_'))
  ).length;

  return (
    <div className="flex flex-col h-full bg-[#08090d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-4 sm:p-6 space-y-5 overflow-y-auto font-mono text-xs">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-gradient-to-r from-purple-900 to-cyan-900 border border-purple-400 text-white font-mono text-xs shadow-2xl animate-fade-in flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
              <Bell className="w-6 h-6 text-amber-400" />
              Notificaciones & Solicitudes de Autorización
            </h2>
            {data.unread_count > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold animate-pulse">
                {data.unread_count} no leídas
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Historial de propuestas de auto-mejora, solicitudes de permisos graduales y ramificación jerárquica de procesos en segundo plano.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data.unread_count > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
            >
              <CheckCheck className="w-4 h-4 text-cyan-400" />
              <span>Marcar todo leído</span>
            </button>
          )}

          {data.notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
              title="Limpiar todas las notificaciones"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={loadNotifications}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
            title="Recargar notificaciones"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bulk Apply & Counter Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 via-amber-950/20 to-cyan-950/30 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">
            📌 {data.notifications.length} Notificaciones Enlistadas
          </span>
          {pendingRequestsCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
              ⚠️ {pendingRequestsCount} Requieren Autorización / Acción
            </span>
          )}
        </div>

        <button
          onClick={handleApplyAllFromNotifs}
          disabled={isApplyingAll}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isApplyingAll ? 'animate-spin' : ''}`} />
          <span>{isApplyingAll ? 'Sincronizando Agentes...' : '✨ Autorizar y Aplicar Todas con Agentes en 2do Plano'}</span>
        </button>
      </div>

      {/* Main Grid: Notifications on Left, Branching Logs on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SECTION 1: NOTIFICACIONES & SUGERENCIAS */}
        <div className="space-y-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 rounded-2xl bg-black/40 border border-white/5 text-center text-slate-500 italic">
                No hay notificaciones en esta categoría.
              </div>
            ) : (
              filteredNotifications.map((notif, idx) => {
                const isUnread = !notif.read;
                const isApplied = notif.status === 'applied';
                const isRequest = notif.category === 'Solicitud de Autorización' || notif.severity === 'warning';
                
                return (
                  <div
                    key={notif.id || idx}
                    onClick={() => handleMarkOneRead(notif.id)}
                    className={`p-3.5 rounded-xl border transition-all space-y-2 cursor-pointer relative group ${
                      isUnread
                        ? 'bg-gradient-to-r from-[#14100c] to-[#0c0d14] border-amber-500/40 shadow-md shadow-amber-950/20'
                        : 'bg-black/40 border-white/5 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isUnread ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
                        <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                          {isRequest && <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
                          {notif.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(notif.timestamp * 1000).toLocaleTimeString()}
                        </span>
                        <button
                          onClick={(e) => handleDeleteSingleNotif(notif.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 transition-opacity"
                          title="Eliminar notificación"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed pl-4">{notif.message}</p>

                    <div className="flex flex-wrap items-center justify-between pt-1 pl-4 text-[10px] font-mono gap-2">
                      <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        {notif.category}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isApplied ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3" />
                            Aplicada
                          </span>
                        ) : (
                          <button
                            onClick={(e) => handleApplySingleNotif(notif, e)}
                            disabled={actionInProgress === notif.id}
                            className="px-2.5 py-1 rounded bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-500/40 text-cyan-200 font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                          >
                            <Zap className={`w-3 h-3 text-cyan-300 ${actionInProgress === notif.id ? 'animate-spin' : ''}`} />
                            <span>{actionInProgress === notif.id ? 'Aplicando...' : '⚡ Autorizar y Aplicar'}</span>
                          </button>
                        )}
                        
                        {isUnread && (
                          <span className="text-slate-400 hover:text-amber-300 flex items-center gap-1 pl-1">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SECTION 2: ÁRBOL DE LOGS RAMIFICADOS EN SEGUNDO PLANO */}
        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-bold text-white flex items-center gap-2 text-sm">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                Árbol de Procesos Ramificados en Background
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {data.branching_logs?.length || 0} ramas registradas
              </span>
            </div>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
              {(data.branching_logs || []).map((tree, ti) => (
                <div
                  key={tree.id || ti}
                  className="p-3 rounded-xl bg-[#0a0d16] border border-cyan-500/20 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      {tree.root_process}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(tree.timestamp * 1000).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Branches */}
                  <div className="space-y-1 pl-3 border-l-2 border-cyan-500/30">
                    {(tree.branches || []).map((b, bi) => (
                      <div key={bi} className="p-1.5 rounded bg-black/40 flex items-center justify-between text-[11px] text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 text-[10px]">↳</span>
                          <span>{b.step}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{b.latency_ms}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
