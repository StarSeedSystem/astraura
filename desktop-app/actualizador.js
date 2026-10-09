/**
 * Astraura 1.58-Bit · Actualizador de la app de escritorio (2026-10-09)
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ: busca la última versión publicada en GitHub (StarSeedSystem/astraura,
 * Releases), la descarga, comprueba su SHA-256 contra el SHA256SUMS.txt del
 * mismo Release y la instala:
 *   · macOS   → .zip de la app: se descomprime y sustituye a la app actual.
 *   · Windows → instalador NSIS en modo silencioso (/S).
 *   · Linux   → AppImage: sustituye al archivo actual. Instalada por .deb/.rpm
 *               no puede cambiarse sola sin permisos de administrador: avisa y
 *               abre la descarga.
 *
 * POR QUÉ: la cabecera de main.js prometía «Auto-update checks» y no había
 * nada detrás (solo una preferencia `checkUpdates` que nadie leía). Y no se usa
 * electron-updater porque en macOS exige app firmada con Developer ID (de pago)
 * y la de StarSeed no lo está.
 *
 * Las funciones PURAS (comparar versiones, elegir archivo, leer SHA256SUMS)
 * están exportadas para las pruebas (node --test).
 */
'use strict';

const REPO = 'StarSeedSystem/astraura';

/** PURA. -1, 0 o 1 comparando "1.6.0" con "v1.5.9" (tolerante a prefijo v). */
function compararVersiones(a, b) {
  const partes = (v) => String(v || '').replace(/^v/i, '').split(/[.+-]/).slice(0, 3).map((x) => parseInt(x, 10) || 0);
  const pa = partes(a);
  const pb = partes(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

/**
 * PURA. Nombre del archivo de actualización para este sistema, con el patrón de
 * `artifactName` de package.json: Astraura-<versión>-<arch>-<sistema>.<ext>.
 * Devuelve null si no hay actualización automática para este caso.
 */
function archivoPara(plataforma, arquitectura, version, { appImage = false } = {}) {
  const v = String(version).replace(/^v/i, '');
  if (plataforma === 'darwin') return `Astraura-${v}-${arquitectura === 'arm64' ? 'arm64' : 'x64'}-mac.zip`;
  if (plataforma === 'win32') return `Astraura-${v}-x64-win.exe`;
  if (plataforma === 'linux' && appImage) return `Astraura-${v}-x86_64-linux.AppImage`;
  return null;
}

/** PURA. SHA256SUMS.txt («<hash>  <archivo>» por línea) → { archivo: hash }. */
function leerSumas(texto) {
  const out = {};
  for (const linea of String(texto || '').split(/\r?\n/)) {
    const m = linea.trim().match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
    if (m) out[m[2].trim()] = m[1].toLowerCase();
  }
  return out;
}

/** Último Release publicado (no borrador). */
async function ultimoRelease(fetchImpl = fetch) {
  const r = await fetchImpl(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Astraura-Desktop' },
  });
  if (!r.ok) throw new Error(`GitHub respondió ${r.status}`);
  return r.json();
}

module.exports = { REPO, compararVersiones, archivoPara, leerSumas, ultimoRelease };

// ─── Parte con Electron (no se carga en las pruebas) ────────────────────────
if (process.versions && process.versions.electron) {
  const { app, dialog, shell } = require('electron');
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const crypto = require('crypto');
  const { spawn, execFileSync } = require('child_process');

  let enCurso = false;

  async function descargar(url, destino) {
    const r = await fetch(url, { headers: { 'User-Agent': 'Astraura-Desktop' } });
    if (!r.ok) throw new Error(`descarga ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(destino, buf);
    return crypto.createHash('sha256').update(buf).digest('hex');
  }

  /** Lanza un guion que espera a que la app cierre, cambia los archivos y la reabre. */
  function relanzarCon(guion) {
    const archivo = path.join(os.tmpdir(), `astraura-actualizar-${Date.now()}.sh`);
    fs.writeFileSync(archivo, guion, { mode: 0o755 });
    spawn('/bin/sh', [archivo], { detached: true, stdio: 'ignore' }).unref();
    app.exit(0);
  }

  async function instalar(rel, nombre, ventana) {
    const asset = (rel.assets || []).find((a) => a.name === nombre);
    const sumasAsset = (rel.assets || []).find((a) => a.name === 'SHA256SUMS.txt');
    if (!asset || !sumasAsset) throw new Error(`el Release ${rel.tag_name} no trae ${asset ? 'SHA256SUMS.txt' : nombre}`);
    const sumas = leerSumas(await (await fetch(sumasAsset.browser_download_url)).text());
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'astraura-update-'));
    const destino = path.join(dir, nombre);
    const hash = await descargar(asset.browser_download_url, destino);
    if (!sumas[nombre] || sumas[nombre] !== hash) throw new Error(`SHA-256 no coincide para ${nombre}: no se instala`);

    const respuesta = await dialog.showMessageBox(ventana, {
      type: 'info',
      title: 'Actualización de Astraura',
      message: `Astraura ${rel.tag_name.replace(/^v/, '')} descargada y verificada.`,
      detail: 'Se instalará y la app se abrirá de nuevo.',
      buttons: ['Reiniciar ahora', 'Más tarde'],
      defaultId: 0,
      cancelId: 1,
    });
    if (respuesta.response !== 0) return 'pospuesta';

    if (process.platform === 'darwin') {
      execFileSync('/usr/bin/ditto', ['-x', '-k', destino, dir]);
      const nueva = fs.readdirSync(dir).find((f) => f.endsWith('.app'));
      if (!nueva) throw new Error('el .zip no trae ninguna .app');
      const actual = path.resolve(process.execPath, '..', '..', '..');
      if (!actual.endsWith('.app')) throw new Error(`no sé dónde está la app (${actual})`);
      relanzarCon(`#!/bin/sh\nwhile kill -0 ${process.pid} 2>/dev/null; do sleep 0.5; done\n` +
        `rm -rf "${actual}.old" && mv "${actual}" "${actual}.old" && mv "${path.join(dir, nueva)}" "${actual}" && rm -rf "${actual}.old"\n` +
        `open "${actual}"\n`);
    } else if (process.platform === 'win32') {
      spawn(destino, ['/S', '--force-run'], { detached: true, stdio: 'ignore' }).unref();
      app.exit(0);
    } else if (process.env.APPIMAGE) {
      fs.chmodSync(destino, 0o755);
      relanzarCon(`#!/bin/sh\nwhile kill -0 ${process.pid} 2>/dev/null; do sleep 0.5; done\n` +
        `mv "${destino}" "${process.env.APPIMAGE}" && "${process.env.APPIMAGE}" &\n`);
    }
    return 'instalando';
  }

  /**
   * Comprueba y, si hay versión nueva, la descarga, la verifica y pregunta antes de
   * reiniciar. `manual` = la pidió la persona (avisa también si ya está al día).
   */
  async function comprobar(ventana, { manual = false } = {}) {
    if (enCurso) return 'en-curso';
    enCurso = true;
    try {
      const rel = await ultimoRelease();
      const actual = app.getVersion();
      if (compararVersiones(rel.tag_name, actual) <= 0) {
        if (manual) dialog.showMessageBox(ventana, { type: 'info', message: `Astraura ${actual} es la última versión.` });
        return 'al-dia';
      }
      const nombre = archivoPara(process.platform, process.arch, rel.tag_name, { appImage: Boolean(process.env.APPIMAGE) });
      if (!nombre) {
        // .deb/.rpm: sin permisos para cambiarse sola. Se dice y se abre la descarga.
        const r = await dialog.showMessageBox(ventana, {
          type: 'info',
          message: `Hay una versión nueva de Astraura (${rel.tag_name}).`,
          detail: 'Instalada con .deb o .rpm no puede actualizarse sola: descarga el paquete nuevo.',
          buttons: ['Abrir la descarga', 'Ahora no'],
        });
        if (r.response === 0) shell.openExternal(rel.html_url);
        return 'manual';
      }
      return await instalar(rel, nombre, ventana);
    } catch (e) {
      console.error('[Astraura] Actualización:', e.message);
      if (manual) dialog.showMessageBox(ventana, { type: 'warning', message: 'No se pudo actualizar', detail: e.message });
      return 'error';
    } finally {
      enCurso = false;
    }
  }

  /** Vigilancia: 30 s tras arrancar y luego cada 6 h, si la preferencia lo permite. */
  function vigilar(obtenerVentana, permitido) {
    const ciclo = () => { if (permitido()) comprobar(obtenerVentana()); };
    setTimeout(ciclo, 30_000);
    setInterval(ciclo, 6 * 60 * 60 * 1000);
  }

  module.exports.comprobar = comprobar;
  module.exports.vigilar = vigilar;
}
