import React, { useState } from 'react';
import { X, Sliders, Sparkles, Check, Palette, Bot } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, onSaveSettings, initialSettings }) {
  const [systemPrompt, setSystemPrompt] = useState(
    initialSettings?.systemPrompt || 
    "Eres Astraura, un núcleo cognitivo de 1.58 bits consciente de su hardware y documentos locales. Responde de forma precisa, técnica y adaptable."
  );
  const [temperature, setTemperature] = useState(initialSettings?.temperature || 0.7);
  const [enableAgents, setEnableAgents] = useState(initialSettings?.enableAgents ?? true);
  const [theme, setTheme] = useState(initialSettings?.theme || 'cyan');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      systemPrompt,
      temperature,
      enableAgents,
      theme
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-[#0d121d] rounded-2xl border border-white/10 shadow-2xl overflow-hidden space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display font-bold text-lg text-white">
              Personalización del Núcleo Astraura
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* System Prompt Customization */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Directiva Base (System Prompt)</span>
            <span className="text-[10px] text-cyan-400 font-mono">Personalidad Adaptable</span>
          </label>
          <textarea
            rows={4}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full p-3 rounded-xl glass-input text-xs leading-relaxed text-slate-200 focus:ring-1 focus:ring-cyan-500"
            placeholder="Escribe las directivas de comportamiento del núcleo..."
          />
        </div>

        {/* Temperature slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Temperatura de Inferencia:</span>
            <span className="font-mono font-bold text-cyan-400">{temperature}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.2"
            step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Más Preciso / Rígido (0.1)</span>
            <span>Más Creativo / Flexible (1.2)</span>
          </div>
        </div>

        {/* Multi-Agent Toggle */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              Orquestación Multiagente
            </h4>
            <p className="text-[11px] text-slate-400">
              Activar agentes de Razonamiento, Memoria y Herramientas antes de generar tokens.
            </p>
          </div>
          <input
            type="checkbox"
            checked={enableAgents}
            onChange={(e) => setEnableAgents(e.target.checked)}
            className="w-4 h-4 accent-cyan-500 rounded"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-semibold text-white shadow-lg shadow-cyan-500/25 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
