import React, { useState, useEffect, useRef } from 'react';
import {
  Server,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Globe,
  Radio,
  Wifi,
  Smartphone,
  Monitor,
  Link2,
  Copy,
  HardDrive,
  Brain,
  Network,
  Cpu
} from 'lucide-react';
import {
  getGatewayUrl,
  setCustomGateway,
  testGatewayConnection,
  fetchTunnelStatus,
  autoDetectAndSetLiveTunnel
} from '../services/api';
import { drawQRToCanvas } from '../services/qrCode';

/**
 * QR generado 100% en local (services/qrCode.js) — sin servicios externos:
 * la URL del túnel/gateway nunca sale del dispositivo (antes se enviaba a api.qrserver.com).
 */
function QRCodeCanvas({ text, size = 160 }) {
  const canvasRef = useRef(null);
  const [renderError, setRenderError] = useState('');

  useEffect(() => {
    if (!text || !canvasRef.current) return;
    try {
      // Canvas a 2x para módulos nítidos en pantallas HiDPI; zona de silencio de 4 módulos (norma).
      drawQRToCanvas(canvasRef.current, text, {
        dark: '#00e5ff',
        light: '#0b0e17',
        quietZone: 4,
        ecLevel: 'M'
      });
      setRenderError('');
    } catch (e) {
      console.warn('QR local render notice:', e?.message || e);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0b0e17';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setRenderError('QR no disponible (enlace demasiado largo). Copia el enlace directo.');
    }
  }, [text, size]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size * 2}
        height={size * 2}
        className="rounded-xl border border-cyan-500/30"
        style={{ width: size, height: size, imageRendering: 'pixelated', background: '#0b0e17' }}
      />
      {renderError && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center text-slate-400 text-[10px] text-center p-4 bg-[#0b0e17]/90">
          {renderError}
        </div>
      )}
    </div>
  );
}

export default function GatewayModal({ isOpen, onClose, onConnected }) {
  const [gatewayInput, setGatewayInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [statusResult, setStatusResult] = useState(null);
  const [tunnelData, setTunnelData] = useState(null);
  const [activeTab, setActiveTab] = useState('connect'); // 'connect' | 'qr' | 'lan'
  const [copyFeedback, setCopyFeedback] = useState('');

  const loadTunnelData = async () => {
    try {
      const res = await fetchTunnelStatus();
      if (res?.tunnel) setTunnelData(res.tunnel);
    } catch (e) {
      console.warn('Could not fetch tunnel data:', e.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const current = getGatewayUrl();
      setGatewayInput(current || '');
      loadTunnelData();
      if (current) handleTest(current);
    }
  }, [isOpen]);

  const handleTest = async (urlToTest = null) => {
    const target = urlToTest !== null ? urlToTest : gatewayInput;
    setIsTesting(true);
    setStatusResult(null);
    try {
      const res = await testGatewayConnection(target);
      setStatusResult({ success: true, data: res });
      if (onConnected) onConnected(res);
    } catch (e) {
      setStatusResult({ success: false, error: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleAutoDetect = async () => {
    setIsAutoDetecting(true);
    setStatusResult(null);
    try {
      // First refresh tunnel data from local backend
      await loadTunnelData();
      const url = await autoDetectAndSetLiveTunnel();
      if (url) {
        setGatewayInput(url);
        const res = await testGatewayConnection(url);
        setStatusResult({ success: true, data: res });
        if (onConnected) onConnected(res);
      } else {
        // Try the URL from tunnelData if known
        const fallback = tunnelData?.url;
        if (fallback) {
          setGatewayInput(fallback);
          // URL derivada de la auto-detección: origen 'auto' (la detección futura puede actualizarla)
          setCustomGateway(fallback, 'auto');
          const res = await testGatewayConnection(fallback);
          setStatusResult({ success: true, data: res });
          if (onConnected) onConnected(res);
        } else {
          setStatusResult({ success: false, error: 'No se detectó túnel activo. ¿Está corriendo el backend?' });
        }
      }
    } catch (e) {
      setStatusResult({ success: false, error: e.message });
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleSave = async () => {
    const url = gatewayInput.trim();
    setCustomGateway(url);
    await handleTest(url);
    if (onClose) onClose();
  };

  const handleUseLAN = (endpoint) => {
    setGatewayInput(endpoint);
    handleTest(endpoint);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopyFeedback(text);
    setTimeout(() => setCopyFeedback(''), 2000);
  };

  const handleUseTunnelUrl = () => {
    const url = tunnelData?.url;
    if (url) {
      setGatewayInput(url);
      setCustomGateway(url);
      handleTest(url);
    }
  };

  if (!isOpen) return null;

  const qrUrl = tunnelData?.url
    ? `https://astraura.vercel.app/?gateway=${tunnelData.url}`
    : null;
  const lanEndpoints = tunnelData?.lan_endpoints || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-[#0b0e17] border border-cyan-500/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-cyan-950/50">

        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-950/50 via-purple-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-display flex items-center gap-2">
                Puente Soberano Multi-Dispositivo
                {statusResult?.success && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    ✅ CONECTADO
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Vincula Astraura Vercel · iPhone · iPad · Mac · cualquier dispositivo → Mac M1 local en tiempo real
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-black/30">
          {[
            { id: 'connect', label: '⚡ Conectar', icon: Zap },
            { id: 'qr', label: '📱 QR Multi-Dispositivo', icon: Smartphone },
            { id: 'lan', label: '🌐 Red Local', icon: Wifi },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 text-xs font-mono max-h-[70vh] overflow-y-auto custom-scrollbar">

          {/* Tunnel Live Status Banner */}
          {tunnelData?.url && (
            <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <span className="text-emerald-300 font-bold text-[11px]">🌐 Túnel Cloudflare Activo</span>
                  <p className="text-emerald-200/70 text-[10px] truncate">{tunnelData.url}</p>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => handleCopy(tunnelData.url)}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  {copyFeedback === tunnelData.url ? '✓' : 'Copiar'}
                </button>
                <button
                  onClick={handleUseTunnelUrl}
                  className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold cursor-pointer"
                >
                  Usar Éste
                </button>
              </div>
            </div>
          )}

          {/* =============== TAB: CONNECT =============== */}
          {activeTab === 'connect' && (
            <div className="space-y-4">
              {/* Status indicator */}
              <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                statusResult?.success
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : statusResult?.error
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-black/40 border-white/10'
              }`}>
                {statusResult?.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : statusResult?.error ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
                )}
                <div>
                  <span className={`font-bold block text-[11px] ${statusResult?.success ? 'text-emerald-300' : statusResult?.error ? 'text-rose-300' : 'text-slate-300'}`}>
                    {statusResult?.success
                      ? `✅ Conectado // Hardware: ${statusResult.data?.profiler?.hardware_family || 'Apple Silicon M1'}`
                      : isTesting
                        ? 'Verificando enlace...'
                        : statusResult?.error
                          ? `❌ ${statusResult.error}`
                          : 'Introduce la URL del túnel o usa Auto-Detectar'}
                  </span>
                  {statusResult?.success && (
                    <span className="text-emerald-200/60 text-[10px]">
                      Motor: {statusResult.data?.engine?.active_model || '1.58b local'} · Modelos: {statusResult.data?.model_count || '—'}
                    </span>
                  )}
                </div>
              </div>

              {/* Auto-detect button */}
              <button
                onClick={handleAutoDetect}
                disabled={isAutoDetecting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-500/40 text-cyan-200 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Zap className={`w-4 h-4 ${isAutoDetecting ? 'animate-spin' : 'text-cyan-300'}`} />
                {isAutoDetecting ? 'Auto-detectando túnel soberano...' : '⚡ Auto-Detectar & Conectar (Recomendado)'}
              </button>

              {/* Manual input */}
              <div className="space-y-2">
                <label className="text-slate-400 font-bold text-[11px]">URL Manual del Gateway:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={gatewayInput}
                    onChange={(e) => setGatewayInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                    placeholder="https://xxxx.trycloudflare.com  ó  http://192.168.x.x:8000"
                    className="flex-1 p-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={() => handleTest()}
                    disabled={isTesting}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    Probar
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3.5 rounded-2xl bg-blue-950/10 border border-blue-500/20 text-slate-300 space-y-1.5 text-[11px] leading-relaxed">
                <span className="font-bold text-blue-300 flex items-center gap-1.5 mb-2">
                  <Globe className="w-3.5 h-3.5" /> ¿Cómo funciona la conexión automática?
                </span>
                <p>1. Tu Mac M1 corre el backend y genera automáticamente un túnel <code className="text-cyan-300 bg-black/40 px-1 rounded">*.trycloudflare.com</code></p>
                <p>2. Haz click en <strong className="text-cyan-300">Auto-Detectar</strong> — la app consulta el estado del túnel activo y se sincroniza.</p>
                <p>3. La URL se guarda localmente. La próxima vez, el puente se restaura solo.</p>
                <p>4. Para conexión en <strong className="text-emerald-300">red local (LAN)</strong> sin internet, usa la pestaña <strong>Red Local</strong>.</p>
                <p>5. Para conectar rápido desde un móvil, escanea el <strong className="text-purple-300">Código QR</strong>.</p>
              </div>
            </div>
          )}

          {/* =============== TAB: QR =============== */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-5 items-center">
                <div className="flex flex-col items-center gap-3">
                  {qrUrl ? (
                    <QRCodeCanvas text={qrUrl} size={180} />
                  ) : (
                    <div className="w-[180px] h-[180px] rounded-xl border border-white/10 bg-black/40 flex items-center justify-center text-slate-500 text-[11px] text-center p-4">
                      Túnel no detectado aún.<br />Verifica que el backend corre.
                    </div>
                  )}
                  <span className="text-[10px] text-slate-500">Escanear abre Astraura conectado · QR generado localmente (sin servicios externos)</span>
                </div>

                <div className="flex-1 space-y-3 min-w-0">
                  <h3 className="text-white font-bold text-sm">Vinculación Multi-Dispositivo</h3>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Escanea el QR con <strong className="text-white">iPhone, iPad, Android o cualquier dispositivo</strong> para abrir Astraura automáticamente conectado a tu Mac M1.
                  </p>

                  {/* Deep link */}
                  {qrUrl && (
                    <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold">ENLACE DIRECTO:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-cyan-300 text-[10px] truncate flex-1 bg-black/40 px-2 py-1 rounded">{qrUrl}</code>
                        <button onClick={() => handleCopy(qrUrl)} className="shrink-0 p-1.5 rounded bg-white/5 hover:bg-white/10 cursor-pointer">
                          <Copy className="w-3 h-3 text-slate-300" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tunnel URL */}
                  {tunnelData?.url && (
                    <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold">SOLO TÚNEL (API directa):</span>
                      <div className="flex items-center gap-2">
                        <code className="text-emerald-300 text-[10px] truncate flex-1 bg-black/40 px-2 py-1 rounded">{tunnelData.url}</code>
                        <button onClick={() => handleCopy(tunnelData.url)} className="shrink-0 p-1.5 rounded bg-white/5 hover:bg-white/10 cursor-pointer">
                          <Copy className="w-3 h-3 text-slate-300" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: '📱 iPhone / iPad', desc: 'Cámara → escanear QR' },
                      { label: '🤖 Android', desc: 'Google Lens → escanear QR' },
                      { label: '💻 Mac / PC', desc: 'Copiar enlace directo' },
                    ].map(d => (
                      <div key={d.label} className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-white font-bold text-[10px] block">{d.label}</span>
                        <span className="text-slate-400 text-[9px]">{d.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={loadTunnelData}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizar túnel y QR
              </button>
            </div>
          )}

          {/* =============== TAB: LAN =============== */}
          {activeTab === 'lan' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-[11px] text-slate-300 space-y-1">
                <span className="font-bold text-purple-300 flex items-center gap-1.5 mb-1">
                  <Wifi className="w-3.5 h-3.5" /> Conexión en Red Local (LAN/Wi-Fi)
                </span>
                <p>Conecta directamente cuando estás en la <strong className="text-white">misma red Wi-Fi</strong> que tu Mac M1 — sin necesidad de internet ni túnel.</p>
              </div>

              {lanEndpoints.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-slate-400 text-[11px] font-bold">IPs detectadas en tu Mac:</span>
                  {lanEndpoints.map((ep, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-black/40 border border-white/10">
                      <Monitor className="w-4 h-4 text-purple-300 shrink-0" />
                      <code className="flex-1 text-purple-200 text-[11px]">{ep}</code>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleCopy(ep)} className="p-1.5 rounded bg-white/5 hover:bg-white/10 cursor-pointer">
                          <Copy className="w-3 h-3 text-slate-300" />
                        </button>
                        <button
                          onClick={() => handleUseLAN(ep)}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-bold cursor-pointer"
                        >
                          Usar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center text-slate-500">
                  <Wifi className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  No se detectaron IPs LAN. ¿Está corriendo el backend?
                </div>
              )}

              <div className="p-3 rounded-2xl bg-amber-950/10 border border-amber-500/20 text-[11px] text-amber-200/70 space-y-1">
                <strong className="text-amber-300 block">Nota sobre LAN:</strong>
                <p>Si el navegador muestra error de "Mixed Content" (HTTPS → HTTP), es porque el sitio Vercel fuerza HTTPS. En ese caso, usa el <strong>túnel Cloudflare</strong> (pestaña Conectar) que proporciona HTTPS → HTTPS.</p>
                <p>La conexión LAN funciona perfectamente desde apps nativas instaladas (iOS/macOS/Android) ya que no tienen la restricción de Mixed Content.</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
          >
            Cerrar
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleAutoDetect}
              disabled={isAutoDetecting}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold font-mono text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 ${isAutoDetecting ? 'animate-spin' : 'text-cyan-400'}`} />
              Auto-Detectar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-slate-950 font-black font-mono text-xs shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              Guardar & Conectar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
