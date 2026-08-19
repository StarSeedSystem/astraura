import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  Cpu, 
  Globe, 
  Radio 
} from 'lucide-react';
import { getGatewayUrl, setCustomGateway, testGatewayConnection, DEFAULT_HTTPS_GATEWAY } from '../services/api';

export default function GatewayModal({ isOpen, onClose, onConnected }) {
  const [gatewayInput, setGatewayInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [statusResult, setStatusResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const current = getGatewayUrl() || DEFAULT_HTTPS_GATEWAY;
      setGatewayInput(current);
      handleTest(current);
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

  const handleSave = async () => {
    setCustomGateway(gatewayInput.trim());
    await handleTest(gatewayInput.trim());
    if (onClose) onClose();
  };

  const handleUseDefaultTunnel = () => {
    setGatewayInput(DEFAULT_HTTPS_GATEWAY);
    handleTest(DEFAULT_HTTPS_GATEWAY);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-[#0b0e17] border border-cyan-500/30 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl shadow-cyan-950/50">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 via-purple-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-display flex items-center gap-2">
                Puente de Conexión Mac M1 // Gateway HTTPS
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Conecta Astraura Vercel con tu hardware Apple Silicon local en tiempo real.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs font-mono">
          {/* Status Indicator */}
          <div className={`p-4 rounded-2xl border flex items-start justify-between ${
            statusResult?.success 
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' 
              : statusResult?.error 
                ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                : 'bg-black/40 border-white/10 text-slate-300'
          }`}>
            <div className="flex items-start gap-3">
              {statusResult?.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Radio className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
              )}
              <div>
                <span className="font-bold block text-sm">
                  {statusResult?.success 
                    ? '✅ Conectado al Host Apple Silicon M1' 
                    : isTesting 
                      ? 'Probando enlace con el daemon...' 
                      : 'Modo Cognitivo Web (Sin enlace directo)'}
                </span>
                <span className="text-[11px] opacity-80 mt-0.5 block">
                  {statusResult?.success 
                    ? `Hardware: ${statusResult.data.profiler?.hardware_family || 'Apple Silicon ARM64'} | 8 Hilos | Cuantización i2_s 1.58b activa` 
                    : statusResult?.error || 'Ingresa la URL del túnel Cloudflare o Gateway de tu Mac para habilitar terminal y archivos completos.'}
                </span>
              </div>
            </div>
          </div>

          {/* Gateway Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold">URL del Gateway Backend (HTTPS / WSS)</label>
              <button
                onClick={handleUseDefaultTunnel}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                Usar Túnel Cloudflare Activo
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={gatewayInput}
                onChange={(e) => setGatewayInput(e.target.value)}
                placeholder="https://tu-tunel.trycloudflare.com"
                className="flex-1 p-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => handleTest()}
                disabled={isTesting}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                Probar
              </button>
            </div>
          </div>

          {/* Instructions Box */}
          <div className="p-4 rounded-2xl bg-cyan-950/10 border border-cyan-500/20 text-slate-300 space-y-2 text-[11px] leading-relaxed">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> ¿Cómo conectar tu Mac M1 con astraura.vercel.app?
            </span>
            <p>
              1. En la terminal de tu Mac, corre el daemon: <code className="text-cyan-200 bg-black/40 px-1.5 py-0.5 rounded">uv run python3 backend/run_backend.py</code>
            </p>
            <p>
              2. El túnel Cloudflare seguro crea una dirección <code className="text-cyan-200 bg-black/40 px-1.5 py-0.5 rounded">https://*.trycloudflare.com</code> que permite comunicación bidireccional inmediata sin bloquearse por Mixed Content.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-slate-950 font-bold font-mono text-xs shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            Guardar & Conectar
          </button>
        </div>
      </div>
    </div>
  );
}
