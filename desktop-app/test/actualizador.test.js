// Pruebas del actualizador de la app de escritorio (node --test, sin Electron).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { compararVersiones, archivoPara, leerSumas } = require('../actualizador');

test('compara versiones con y sin prefijo v', () => {
  assert.strictEqual(compararVersiones('v1.6.0', '1.5.9'), 1);
  assert.strictEqual(compararVersiones('1.5.9', 'v1.6.0'), -1);
  assert.strictEqual(compararVersiones('v1.6.0', '1.6.0'), 0);
  assert.strictEqual(compararVersiones('1.10.0', '1.9.9'), 1);
});

test('elige el archivo de su sistema con el nombre que produce el CI', () => {
  assert.strictEqual(archivoPara('darwin', 'arm64', 'v1.6.0'), 'Astraura-1.6.0-arm64-mac.zip');
  assert.strictEqual(archivoPara('darwin', 'x64', '1.6.0'), 'Astraura-1.6.0-x64-mac.zip');
  assert.strictEqual(archivoPara('win32', 'x64', 'v1.6.0'), 'Astraura-1.6.0-x64-win.exe');
  assert.strictEqual(archivoPara('linux', 'x64', 'v1.6.0', { appImage: true }), 'Astraura-1.6.0-x86_64-linux.AppImage');
  // Instalada con .deb/.rpm: sin actualización automática (necesita permisos de administrador).
  assert.strictEqual(archivoPara('linux', 'x64', 'v1.6.0'), null);
});

test('lee SHA256SUMS.txt (formato sha256sum, con y sin asterisco)', () => {
  const a = 'a'.repeat(64);
  const b = 'B'.repeat(64);
  const sumas = leerSumas(`${a}  Astraura-1.6.0-arm64-mac.zip\n${b} *Astraura-1.6.0-x64-win.exe\nbasura\n`);
  assert.deepStrictEqual(sumas, {
    'Astraura-1.6.0-arm64-mac.zip': a,
    'Astraura-1.6.0-x64-win.exe': b.toLowerCase(),
  });
});
