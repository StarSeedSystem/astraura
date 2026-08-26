import React, { useState, useEffect } from 'react';
import { fetchSystemCapabilities, requestSystemAccess } from '../services/api';

/**
 * (Astraura 1.58b) Modal de CONSENTIMIENTO de acceso al sistema local.
 *
 * Cumple el mandato "el sistema por defecto debe pedir acceso a la terminal del
 * sistema para poder acceder al resto del dispositivo con sus capacidades de
 * hardware, medios de almacenamiento de los cerebros e integraciones de software
 * nativas". Desde CUALQUIER medio (Vercel, app nativa, escritorio) se muestra al
 * detectar un nodo local vivo, declara HONESTAMENTE qué capacidades se habilitan
 * y solo tras aprobación del usuario el puente usa funciones completas.
 *
 * No ejecuta nada en silencio: el acceso se registra vía /api/system/request_access
 * y el backend persiste el consentimiento. Denegar deja el puente en modo limitado
 * (nube) sin perder funcionalidad básica.
 */
export default function LocalSystemAccessModal({ isOpen, onClose, onGranted }) {
  const [caps, setCaps] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scopes, setScopes] = useState({
    hardware: true, storage: true, terminal: true, integrations: true,
  });
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchSystemCapabilities()
        .then((c) => setCaps(c))
        .catch(() => setCaps(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const toggle = (k) => setScopes((s) => ({ ...s, [k]: !s[k] }));
  const allOn = Object.values(scopes).every(Boolean);
  const setAll = (v) => setScopes({ hardware: v, storage: v, terminal: v, integrations: v });

  const grant = async () => {
    setSubmitting(true);
    const active = Object.entries(scopes).filter(([, v]) => v).map(([k]) => k);
    try {
      const r = await requestSystemAccess(true, active);
      setResult(r);
      if (onGranted) onGranted(active);
    } catch (e) {
      setResult({ success: false, error: String(e?.message || e) });
    } finally {
      setSubmitting(false);
    }
  };

  const deny = async () => {
    setSubmitting(true);
    try {
      const r = await requestSystemAccess(false, []);
      setResult(r);
      onClose();
    } catch {
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hw = caps?.hardware || {};
  const brains = caps?.brains_storage || {};
  const integrations = caps?.native_integrations || [];

  return (
    <div style={overlay}>
      <div style={card}>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, color: 'var(--foreground)' }}>
          🔓 Acceso al Sistema Local — Astraura 1.58b
        </h2>
        <p style={{ margin: '0 0 14px', color: 'var(--muted-foreground)', fontSize: 13, lineHeight: 1.5 }}>
          Para acceder a las <b>funciones completas</b> (motor de inferencia 1.58-bit en tu hardware,
          tus cerebros y medios de almacenamiento, e integraciones nativas del dispositivo), Astraura
          necesita tu permiso para conectarse a tu nodo local. El puente es abierto, cifrado y tú
          mantienes el control: puedes revocar el acceso en cualquier momento.
        </p>

        {loading && <p style={{ color: 'var(--muted-foreground)' }}>Detectando capacidades del dispositivo…</p>}

        {!loading && caps && (
          <div style={section}>
            <div style={sectionTitle}>🖥️ Hardware detectado</div>
            <ul style={list}>
              <li>Sistema: {hw.os || '—'}</li>
              <li>Arquitectura: {hw.arch || '—'}</li>
              <li>CPU: {hw.cpu || '—'}</li>
              <li>RAM: {hw.ram_gb_free ?? '—'} GB libres / {hw.ram_gb_total ?? '—'} GB</li>
              <li>Disco: {hw.disk_gb_free ?? '—'} GB libres / {hw.disk_gb_total ?? '—'} GB</li>
            </ul>

            <div style={sectionTitle}>🧠 Almacenamiento de cerebros</div>
            <ul style={list}>
              <li>{brains.count ?? 0} cerebros sincronizados</li>
              <li>Workspace: <code>{brains.workspace || '—'}</code></li>
              <li>Sincronización con StarSeed OS / Supabase: {brains.synced_to_supabase ? 'activa' : 'no'}</li>
            </ul>

            <div style={sectionTitle}>🔗 Integraciones nativas</div>
            <ul style={list}>
              {integrations.map((i, idx) => <li key={idx}>{i}</li>)}
            </ul>
          </div>
        )}

        <div style={{ ...section, marginTop: 12 }}>
          <div style={sectionTitle}>Permisos solicitados</div>
          <label style={chk}><input type="checkbox" checked={scopes.hardware} onChange={() => toggle('hardware')} /> Acceso a hardware y telemetría del dispositivo</label>
          <label style={chk}><input type="checkbox" checked={scopes.storage} onChange={() => toggle('storage')} /> Lectura/escritura de cerebros y medios de almacenamiento</label>
          <label style={chk}><input type="checkbox" checked={scopes.terminal} onChange={() => toggle('terminal')} /> Ejecución de comandos en la terminal del sistema (bajo consentimiento)</label>
          <label style={chk}><input type="checkbox" checked={scopes.integrations} onChange={() => toggle('integrations')} /> Integraciones de software nativas y puente StarSeed OS</label>
          <div style={{ marginTop: 8 }}>
            <button style={linkBtn} onClick={() => setAll(true)}>Seleccionar todo</button>
            <button style={linkBtn} onClick={() => setAll(false)}>Quitar todo</button>
          </div>
        </div>

        {result && (
          <p style={{ color: result.success ? 'var(--accent)' : '#f88', fontSize: 13, marginTop: 10 }}>
            {result.message || result.error || 'Listo.'}
          </p>
        )}

        <div style={actions}>
          <button style={ghostBtn} onClick={deny} disabled={submitting}>Denegar (modo nube)</button>
          <button style={primaryBtn} onClick={grant} disabled={submitting || !allOn}>
            {submitting ? 'Autorizando…' : 'Autorizar acceso completo'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 10, marginBottom: 0 }}>
          El acceso se registra localmente y puede revocarse en Ajustes → Puente del sistema.
        </p>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16,
};
const card = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
  maxWidth: 520, width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};
const section = { background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' };
const sectionTitle = { fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 };
const list = { margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.7 };
const chk = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--foreground)', margin: '6px 0', cursor: 'pointer' };
const actions = { display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' };
const primaryBtn = {
  background: 'var(--accent)', color: '#04121a', border: 'none', borderRadius: 10,
  padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
};
const ghostBtn = {
  background: 'transparent', color: 'var(--muted-foreground)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '10px 16px', fontSize: 14, cursor: 'pointer',
};
const linkBtn = {
  background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', padding: 0, marginRight: 12,
};
