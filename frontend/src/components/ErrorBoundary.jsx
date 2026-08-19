import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Astraura ErrorBoundary caught an exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#07090e] text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-[#0e121e] border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white">Recuperación de Estado Cognitivo</h2>
                <p className="text-xs text-rose-300 font-mono">Astraura 1.58-Bit Error Guard</p>
              </div>
            </div>

            <div className="p-3 bg-black/60 rounded-xl border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto max-h-48 space-y-1">
              <p className="text-rose-400 font-bold">{this.state.error?.toString()}</p>
              <pre className="text-[10px] text-slate-400 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recargar Interfaz
              </button>

              <button
                onClick={this.handleResetStorage}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer Datos Locales
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
