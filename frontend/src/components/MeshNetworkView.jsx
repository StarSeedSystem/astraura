import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Network, RefreshCw, Radio, Cpu, Layers, Globe, Wifi, WifiOff,
  Zap, ShieldCheck, Play, X, Loader2, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { apiFetch, apiUrl } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Red Mesh P2P 1.58-bit · Enjambre Soberano
// Canvas radial de nodos alrededor del nodo local + paneles de sharding y
// aprendizaje federado. Tema oscuro Astraura (#07090e-#0b0e17).
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  active: '#22d3ee',   // cyan
  stale: '#fbbf24',    // ámbar
  dead: '#7f1d1d',     // rojo tenue
};

function statusColor(node) {
  return STATUS_COLORS[node?.status] || STATUS_COLORS.stale;
}

function fmtHeartbeat(ts) {
  if (!ts) return '—';
  try {
    const d = typeof ts === 'number' ? new Date(ts * (ts < 1e12 ? 1000 : 1)) : new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    const diff = Math.max(0, Date.now() - d.getTime());
    const s = Math.floor(diff / 1000);
    if (s < 60) return `hace ${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `hace ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h}h`;
    return `hace ${Math.floor(h / 24)}d`;
  } catch { return String(ts); }
}

export default function MeshNetworkView() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  // Inferencia distribuida
  const [prompt, setPrompt] = useState('');
  const [inferRunning, setInferRunning] = useState(false);
  const [inferResult, setInferResult] = useState(null);
  const [inferError, setInferError] = useState(null);

  // Federado
  const [fedSyncing, setFedSyncing] = useState(false);
  const [fedSyncMsg, setFedSyncMsg] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const nodesRef = useRef([]);      // posiciones calculadas para hit-test
  const animRef = useRef(0);

  // ── Polling de estado ─────────────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    try {
      const data = await apiFetch('/api/mesh/status');
      setStatus(data || null);
      setError(null);
    } catch (e) {
      setError('Malla no disponible en este nodo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const iv = setInterval(loadStatus, 10000);
    return () => clearInterval(iv);
  }, [loadStatus]);

  const meshActive = !!status?.mesh_active;
  const nodes = status?.nodes || [];
  const localNode = status?.local_node;
  const shards = status?.shards || [];
  const federated = status?.federated || {};

  const badge = loading && !status
    ? { label: 'Conectando…', cls: 'bg-amber-500/10 text-amber-300 border-amber-400/30' }
    : error && !status
    ? { label: 'No disponible', cls: 'bg-red-500/10 text-red-300 border-red-400/30' }
    : meshActive
    ? { label: 'Malla Activa', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30' }
    : { label: 'Malla Inactiva', cls: 'bg-white/5 text-white/50 border-white/10' };

  // ── Canvas: layout radial + render animado ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');

    let width = 0, height = 0;
    const resize = () => {
      width = canvas.width = container.clientWidth || 800;
      height = canvas.height = 380;
    };
    resize();
    window.addEventListener('resize', resize);

    const dpr = window.devicePixelRatio || 1;
    const setupDpr = () => {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setupDpr();

    const cx = () => width / 2;
    const cy = () => height / 2;

    // Posiciones radiales estables por índice
    const positions = {};
    nodes.forEach((n, i) => {
      const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
      const radius = Math.min(width, height) * 0.34;
      positions[n.node_id] = {
        x: cx() + Math.cos(angle) * radius,
        y: cy() + Math.sin(angle) * radius,
      };
    });

    const latencyOf = (n) => {
      // latencia simulada determinista a partir del id
      let h = 0;
      const id = String(n.node_id || '');
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
      return 8 + (Math.abs(h) % 90); // 8–97 ms
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, width, height);
      const all = [{ ...(localNode || {}), node_id: localNode?.node_id || 'local', __local: true }, ...nodes];
      const pos = (n) => n.__local
        ? { x: cx(), y: cy() }
        : (positions[n.node_id] || { x: cx(), y: cy() });

      // Aristas animadas (líneas punteadas que fluyen)
      all.filter(n => !n.__local).forEach((n) => {
        const p = pos(n);
        const col = statusColor(n);
        const lat = latencyOf(n);
        const lw = Math.max(0.6, 3 - lat / 40); // grosor según "latencia"
        ctx.save();
        ctx.strokeStyle = col + '55';
        ctx.lineWidth = lw;
        ctx.setLineDash([6, 10]);
        ctx.lineDashOffset = -(t / 40) % 16; // flujo hacia el centro
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(cx(), cy());
        ctx.stroke();
        ctx.restore();
      });

      // Nodos
      all.forEach((n) => {
        const p = pos(n);
        const isLocal = !!n.__local;
        const col = isLocal ? '#22d3ee' : statusColor(n);
        const baseR = isLocal ? 18 : 11;
        const pulse = 1 + Math.sin(t / 400 + p.x) * 0.08;

        // halo pulsante
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, baseR * 3);
        grad.addColorStop(0, col + '44');
        grad.addColorStop(1, col + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, baseR * 3 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // cuerpo
        ctx.fillStyle = col;
        ctx.globalAlpha = n.status === 'dead' ? 0.45 : 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, baseR * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // anillo de selección
        const selId = selectedNode || hoveredNode;
        if (selId && n.node_id === selId) {
          ctx.strokeStyle = '#ffffffaa';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, baseR * pulse + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // etiqueta hostname
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isLocal ? (n.hostname || 'local') : (n.hostname || n.node_id), p.x, p.y + baseR + 14);
      });

      // Tooltip de hover
      const hv = all.find(n => n.node_id === hoveredNode);
      if (hv) {
        const p = pos(hv);
        const lines = [
          hv.hostname || hv.node_id,
          hv.hardware || '',
          `caps: ${(hv.capabilities || []).join(', ')}`,
          `hb: ${fmtHeartbeat(hv.last_heartbeat)}`,
        ].filter(Boolean);
        ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
        const wBox = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16;
        const hBox = lines.length * 15 + 10;
        let bx = p.x + 20, by = p.y - hBox - 10;
        if (bx + wBox > width) bx = p.x - wBox - 20;
        if (by < 4) by = p.y + 20;
        ctx.fillStyle = 'rgba(8,9,13,0.92)';
        ctx.strokeStyle = 'rgba(34,211,238,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, wBox, hBox, 6);
        ctx.fill(); ctx.stroke();
        ctx.textAlign = 'left';
        lines.forEach((l, i) => {
          ctx.fillStyle = i === 0 ? '#22d3ee' : 'rgba(255,255,255,0.75)';
          ctx.fillText(l, bx + 8, by + 17 + i * 15);
        });
      }

      nodesRef.current = all.map(n => ({ id: n.node_id, ...pos(n), r: n.__local ? 22 : 14 }));
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) <= n.r);
      setHoveredNode(hit ? hit.id : null);
      canvas.style.cursor = hit ? 'pointer' : 'default';
    };
    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) <= n.r);
      setSelectedNode(hit ? hit.id : null);
    };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('click', onClick);
    };
  }, [nodes, localNode, hoveredNode, selectedNode]);

  // ── Acciones ───────────────────────────────────────────────────────────────
  const selNodeData = nodes.find(n => n.node_id === selectedNode)
    || (selectedNode === (localNode?.node_id || 'local') ? { ...(localNode || {}), __local: true } : null);

  const [pingState, setPingState] = useState({}); // node_id -> {state, msg}

  const testConnection = async (node) => {
    const url = node?.url_local;
    const id = node.node_id;
    setPingState(s => ({ ...s, [id]: { state: 'running' } }));
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(`${String(url).replace(/\/$/, '')}/api/mesh/ping`, { signal: ctrl.signal });
      clearTimeout(to);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json().catch(() => ({}));
      setPingState(s => ({ ...s, [id]: { state: 'ok', msg: `OK (${res.status})` } }));
    } catch (e) {
      clearTimeout(to);
      setPingState(s => ({ ...s, [id]: { state: 'fail', msg: e.name === 'AbortError' ? 'Timeout 3s' : e.message } }));
    }
  };

  const runInference = async () => {
    if (!prompt.trim() || inferRunning) return;
    setInferRunning(true);
    setInferResult(null);
    setInferError(null);
    try {
      const res = await fetch(apiUrl('/mesh/infer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/event-stream')) {
        // stream simple: acumular chunks
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let acc = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          setInferResult({ streamed: acc });
        }
        setInferResult({ streamed: acc });
      } else if (ct.includes('application/json')) {
        setInferResult({ json: await res.json() });
      } else {
        setInferResult({ streamed: await res.text() });
      }
    } catch (e) {
      setInferError(`Inferencia no disponible: ${e.message}`);
    } finally {
      setInferRunning(false);
    }
  };

  const syncFederated = async () => {
    setFedSyncing(true);
    setFedSyncMsg(null);
    try {
      const data = await apiFetch('/mesh/federated/status');
      setFedSyncMsg(`Sincronizado ✓ deltas: ${data?.deltas_collected ?? federated.deltas_collected ?? '?'}`);
    } catch (e) {
      setFedSyncMsg(`Fallo de sincronización: ${e.message}`);
    } finally {
      setFedSyncing(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (error && !status) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#07090e] text-white/60 p-8">
        <AlertTriangle className="w-8 h-8 text-amber-400/70" />
        <p>{error}</p>
        <button onClick={loadStatus} className="mt-2 px-4 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-sm hover:bg-cyan-500/20 transition">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#07090e] text-white/90">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center">
              <Network className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Red Mesh 1.58b · Enjambre Soberano</h1>
              <p className="text-xs text-white/40">Inferencia distribuida P2P y aprendizaje federado en el borde</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${badge.cls}`}>
              {badge.label.startsWith('Conectando')
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : meshActive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {badge.label}
            </span>
            <button onClick={loadStatus} className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-white/60" title="Refrescar">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Canvas malla */}
        <div className="rounded-2xl bg-[#0b0e17]/80 border border-white/10 overflow-hidden">
          <div ref={containerRef} className="relative w-full">
            <canvas ref={canvasRef} className="block w-full" />
            {!loading && nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-sm text-white/35">Sin nodos remotos — este nodo opera soberano</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-4 px-4 py-2.5 border-t border-white/10 text-[11px] text-white/50">
            <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Local</span>
            <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Activo</span>
            <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Stale</span>
            <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-red-900 inline-block" /> Dead</span>
            <span className="ml-auto">{nodes.length} nodos remotos · polling 10s</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Detalle de nodo */}
          <div className="lg:col-span-1 rounded-2xl bg-[#0b0e17]/80 border border-white/10 p-4 min-h-[220px]">
            <h2 className="text-sm font-medium text-cyan-300 mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> Nodo seleccionado
            </h2>
            {!selNodeData ? (
              <p className="text-xs text-white/35">Haz click en un nodo del canvas para ver su detalle.</p>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">{selNodeData.hostname || selNodeData.node_id}</p>
                    <p className="text-white/40 font-mono break-all">{selNodeData.node_id}</p>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="text-white/30 hover:text-white/70">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <dl className="space-y-1.5 text-white/70">
                  <div><dt className="inline text-white/40">Hardware: </dt><dd className="inline">{selNodeData.hardware || '—'}</dd></div>
                  <div><dt className="inline text-white/40">Estado: </dt>
                    <dd className="inline" style={{ color: selNodeData.__local ? '#22d3ee' : statusColor(selNodeData) }}>
                      {selNodeData.__local ? 'local' : (selNodeData.status || '?')}
                    </dd></div>
                  <div><dt className="inline text-white/40">Último heartbeat: </dt><dd className="inline">{fmtHeartbeat(selNodeData.last_heartbeat)}</dd></div>
                  <div className="break-all"><dt className="inline text-white/40">URL local: </dt><dd className="inline font-mono">{selNodeData.url_local || '—'}</dd></div>
                  <div className="break-all"><dt className="inline text-white/40">URL pública: </dt><dd className="inline font-mono">{selNodeData.url_publica || '—'}</dd></div>
                </dl>
                {(selNodeData.capabilities?.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {selNodeData.capabilities.map(c => (
                      <span key={c} className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-cyan-300">{c}</span>
                    ))}
                  </div>
                )}
                {(() => {
                  const myShards = shards.filter(s => s.node_id === selNodeData.node_id);
                  return myShards.length > 0 && (
                    <div>
                      <p className="text-white/40 mb-1 flex items-center gap-1"><Layers className="w-3 h-3" /> Shards asignados</p>
                      <ul className="space-y-0.5 font-mono text-white/70">
                        {myShards.map(s => (
                          <li key={s.shard_id}>{s.shard_id}{s.capas != null ? ` → capas ${Array.isArray(s.capas) ? s.capas.join('–') : s.capas}` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                {!selNodeData.__local && (
                  <div>
                    <button
                      onClick={() => testConnection(selNodeData)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/20 transition"
                    >
                      <Zap className="w-3.5 h-3.5" /> Probar conexión
                    </button>
                    {pingState[selNodeData.node_id]?.state === 'running' && (
                      <p className="mt-2 text-white/50 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Probando…</p>
                    )}
                    {pingState[selNodeData.node_id]?.state === 'ok' && (
                      <p className="mt-2 text-emerald-300 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> Ping OK {pingState[selNodeData.node_id].msg}</p>
                    )}
                    {pingState[selNodeData.node_id]?.state === 'fail' && (
                      <p className="mt-2 text-red-300 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Sin respuesta — {pingState[selNodeData.node_id].msg}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Columna derecha: inferencia + federado */}
          <div className="lg:col-span-2 space-y-5">

            {/* Inferencia Distribuida */}
            <section className="rounded-2xl bg-[#0b0e17]/80 border border-white/10 p-4">
              <h2 className="text-sm font-medium text-purple-300 mb-1 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Inferencia Distribuida
              </h2>
              <p className="text-[11px] text-white/40 mb-3">El modelo 1.58-bit se reparte por capas entre los nodos de la malla.</p>

              {shards.length === 0 ? (
                <p className="text-xs text-white/35 mb-3">Sin sharding activo — inferencia local.</p>
              ) : (
                <ul className="mb-4 space-y-1 text-xs">
                  {shards.map(s => {
                    const n = nodes.find(x => x.node_id === s.node_id);
                    return (
                      <li key={s.shard_id} className="flex flex-wrap items-center gap-2 font-mono">
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-400/25 text-purple-300">{s.shard_id}</span>
                        <span className="text-white/70">{n?.hostname || s.node_id}</span>
                        <span className="text-white/40">
                          {s.capas != null ? (Array.isArray(s.capas) ? `capas ${s.capas.join('–')}` : `capas ${s.capas}`) : ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Escribe un prompt para ejecutar en la malla…"
                rows={2}
                className="w-full rounded-lg bg-[#07090e] border border-white/10 px-3 py-2 text-sm placeholder:text-white/25 focus:outline-none focus:border-purple-400/50 resize-none"
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={runInference}
                  disabled={!prompt.trim() || inferRunning}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-500/20 border border-purple-400/40 text-purple-200 text-sm hover:bg-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {inferRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Ejecutar en la Malla
                </button>
              </div>
              {inferError && <p className="mt-2 text-xs text-red-300">{inferError}</p>}
              {inferResult?.streamed && (
                <pre className="mt-3 max-h-48 overflow-y-auto rounded-lg bg-[#07090e] border border-white/10 p-3 text-xs whitespace-pre-wrap text-emerald-200/90">{inferResult.streamed}</pre>
              )}
              {inferResult?.json && (
                <pre className="mt-3 max-h-48 overflow-y-auto rounded-lg bg-[#07090e] border border-white/10 p-3 text-xs whitespace-pre-wrap text-cyan-200/90">{JSON.stringify(inferResult.json, null, 2)}</pre>
              )}
            </section>

            {/* Aprendizaje Federado */}
            <section className="rounded-2xl bg-[#0b0e17]/80 border border-white/10 p-4">
              <h2 className="text-sm font-medium text-emerald-300 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Aprendizaje Federado
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl bg-[#07090e] border border-white/10 p-3">
                  <p className="text-2xl font-semibold text-emerald-300">{federated.deltas_collected ?? '—'}</p>
                  <p className="text-[11px] text-white/40">deltas colectados</p>
                </div>
                <div className="rounded-xl bg-[#07090e] border border-white/10 p-3">
                  <p className="text-sm font-medium text-white/80 truncate">{federated.last_update ?? '—'}</p>
                  <p className="text-[11px] text-white/40">último update</p>
                </div>
              </div>
              <p className="text-xs text-white/50 leading-relaxed mb-3 flex gap-2">
                <Radio className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400/70" />
                Solo se comparten deltas ternarios <span className="font-mono text-emerald-300">{'{-1, 0, +1}'}</span> de ~2 bits por peso; los datos locales jamás salen del dispositivo.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={syncFederated}
                  disabled={fedSyncing}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 text-sm hover:bg-emerald-500/25 disabled:opacity-40 transition"
                >
                  {fedSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  Sincronizar ahora
                </button>
                {fedSyncMsg && <span className={`text-xs ${fedSyncMsg.includes('✓') ? 'text-emerald-300' : 'text-red-300'}`}>{fedSyncMsg}</span>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
