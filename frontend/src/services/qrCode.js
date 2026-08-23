/**
 * Astraura — Generador de códigos QR 100% local (sin servicios externos)
 * ------------------------------------------------------------------------------------------
 * Sustituye la generación del QR del Puente Soberano vía api.qrserver.com: la URL del gateway
 * (túnel/LAN del usuario) es información sensible y NUNCA debe salir del dispositivo.
 *
 * Implementa ISO/IEC 18004 sin dependencias:
 *  - Modo Byte (UTF-8), versiones 1–10 (hasta 271 bytes en nivel L / 213 en nivel M),
 *  - Niveles de corrección L / M / Q / H, Reed-Solomon sobre GF(256) (polinomio 0x11D),
 *  - Patrones de función (localizadores, temporización, alineación), información de formato y versión,
 *  - Selección automática de máscara (0–7) por puntuación de penalización.
 *
 * API:
 *   encodeQR(text, { ecLevel }) → { version, size, ecLevel, mask, modules: boolean[][] }
 *   drawQRToCanvas(canvas, text, { dark, light, quietZone, ecLevel }) → dibuja y devuelve el resultado
 */

// ───────────────────────────── Tablas (versiones 1..10) ─────────────────────────────
// Por versión y nivel: [codewordsEC por bloque, bloques grupo1, datos/bloque g1, bloques grupo2, datos/bloque g2]
const EC_TABLE = [
  null,
  { L: [7, 1, 19, 0, 0],   M: [10, 1, 16, 0, 0], Q: [13, 1, 13, 0, 0], H: [17, 1, 9, 0, 0] },
  { L: [10, 1, 34, 0, 0],  M: [16, 1, 28, 0, 0], Q: [22, 1, 22, 0, 0], H: [28, 1, 16, 0, 0] },
  { L: [15, 1, 55, 0, 0],  M: [26, 1, 44, 0, 0], Q: [18, 2, 17, 0, 0], H: [22, 2, 13, 0, 0] },
  { L: [20, 1, 80, 0, 0],  M: [18, 2, 32, 0, 0], Q: [26, 2, 24, 0, 0], H: [16, 4, 9, 0, 0] },
  { L: [26, 1, 108, 0, 0], M: [24, 2, 43, 0, 0], Q: [18, 2, 15, 2, 16], H: [22, 2, 11, 2, 12] },
  { L: [18, 2, 68, 0, 0],  M: [16, 4, 27, 0, 0], Q: [24, 4, 19, 0, 0], H: [28, 4, 15, 0, 0] },
  { L: [20, 2, 78, 0, 0],  M: [18, 4, 31, 0, 0], Q: [18, 2, 14, 4, 15], H: [26, 4, 13, 1, 14] },
  { L: [24, 2, 97, 0, 0],  M: [22, 2, 38, 2, 39], Q: [22, 4, 18, 2, 19], H: [26, 4, 14, 2, 15] },
  { L: [30, 2, 116, 0, 0], M: [22, 3, 36, 2, 37], Q: [20, 4, 16, 4, 17], H: [24, 4, 12, 4, 13] },
  { L: [18, 2, 68, 2, 69], M: [26, 4, 43, 1, 44], Q: [24, 6, 19, 2, 20], H: [28, 6, 15, 2, 16] }
];
const MAX_VERSION = EC_TABLE.length - 1;

// Coordenadas (fila/columna) de los centros de los patrones de alineación por versión.
const ALIGNMENT_POS = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

// Indicador de nivel de corrección en la información de formato.
const EC_BITS = { L: 1, M: 0, Q: 3, H: 2 };

// ───────────────────────────── Aritmética GF(256) ─────────────────────────────
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

/** Polinomio generador RS de grado `degree` (coeficientes de mayor a menor grado, incluye el 1 inicial). */
function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** Codewords de corrección de errores (resto de la división polinómica) para un bloque de datos. */
function rsEncodeBlock(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const remainder = new Uint8Array(ecCount);
  for (let k = 0; k < data.length; k++) {
    const factor = data[k] ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j++) {
        remainder[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return remainder;
}

// ───────────────────────────── Codificación de datos ─────────────────────────────
function textToUtf8Bytes(text) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
  // Fallback para entornos sin TextEncoder
  const raw = unescape(encodeURIComponent(text));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i) & 0xff;
  return out;
}

function totalDataCodewords(version, ecLevel) {
  const [, g1n, g1d, g2n, g2d] = EC_TABLE[version][ecLevel];
  return g1n * g1d + g2n * g2d;
}

/** Bits del indicador de recuento de caracteres en modo Byte (8 bits en v1–9, 16 bits en v10–26). */
function charCountBits(version) {
  return version <= 9 ? 8 : 16;
}

function chooseVersion(byteLength, ecLevel) {
  for (let v = 1; v <= MAX_VERSION; v++) {
    const needed = 4 + charCountBits(v) + byteLength * 8;
    if (needed <= totalDataCodewords(v, ecLevel) * 8) return v;
  }
  return -1;
}

/** Construye los codewords de datos (modo Byte + terminador + relleno 0xEC/0x11). */
function buildDataCodewords(bytes, version, ecLevel) {
  const capacityBits = totalDataCodewords(version, ecLevel) * 8;
  const bits = [];
  const pushBits = (value, length) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };

  pushBits(0b0100, 4);                       // indicador de modo Byte
  pushBits(bytes.length, charCountBits(version));
  for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);

  pushBits(0, Math.min(4, capacityBits - bits.length)); // terminador
  while (bits.length % 8 !== 0) bits.push(0);            // alineación a byte
  const padBytes = [0xec, 0x11];
  for (let p = 0; bits.length < capacityBits; p++) pushBits(padBytes[p & 1], 8);

  const data = new Uint8Array(capacityBits / 8);
  for (let i = 0; i < data.length; i++) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i * 8 + j];
    data[i] = v;
  }
  return data;
}

/** Divide en bloques, calcula EC por bloque e intercala datos y EC según la norma. */
function buildFinalCodewords(data, version, ecLevel) {
  const [ecPerBlock, g1n, g1d, g2n, g2d] = EC_TABLE[version][ecLevel];
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (let i = 0; i < g1n + g2n; i++) {
    const len = i < g1n ? g1d : g2d;
    const block = data.subarray(offset, offset + len);
    offset += len;
    dataBlocks.push(block);
    ecBlocks.push(rsEncodeBlock(block, ecPerBlock));
  }

  const out = [];
  const maxDataLen = Math.max(g1d, g2d);
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const block of ecBlocks) out.push(block[i]);
  }
  return out;
}

// ───────────────────────────── Matriz de módulos ─────────────────────────────
function createGrid(size, fill) {
  const grid = new Array(size);
  for (let i = 0; i < size; i++) grid[i] = new Array(size).fill(fill);
  return grid;
}

function bit(value, i) {
  return ((value >>> i) & 1) !== 0;
}

class QRMatrix {
  constructor(version, ecLevel) {
    this.version = version;
    this.ecLevel = ecLevel;
    this.size = version * 4 + 17;
    this.modules = createGrid(this.size, false);     // true = módulo oscuro
    this.isFunction = createGrid(this.size, false);  // true = patrón de función / reservado
    this.mask = -1;
  }

  setFunction(x, y, dark) {
    this.modules[y][x] = dark;
    this.isFunction[y][x] = true;
  }

  drawFunctionPatterns() {
    const n = this.size;
    // Patrones de temporización
    for (let i = 0; i < n; i++) {
      this.setFunction(6, i, i % 2 === 0);
      this.setFunction(i, 6, i % 2 === 0);
    }
    // Localizadores (con separador) en tres esquinas
    this.drawFinder(3, 3);
    this.drawFinder(n - 4, 3);
    this.drawFinder(3, n - 4);
    // Patrones de alineación (omitiendo los que solapan localizadores)
    const pos = ALIGNMENT_POS[this.version];
    const last = pos.length - 1;
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const overlapsFinder = (i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0);
        if (!overlapsFinder) this.drawAlignment(pos[i], pos[j]);
      }
    }
    // Reserva de información de formato (se sobrescribe con la máscara definitiva) y de versión
    this.drawFormatBits(0);
    this.drawVersionBits();
  }

  drawFinder(cx, cy) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= this.size || y >= this.size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        this.setFunction(x, y, dist !== 2 && dist !== 4);
      }
    }
  }

  drawAlignment(cx, cy) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  /** Información de formato: 5 bits (nivel EC + máscara) + 10 bits BCH, enmascarados con 0x5412. */
  drawFormatBits(mask) {
    const data = (EC_BITS[this.ecLevel] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const n = this.size;

    // Primera copia (alrededor del localizador superior izquierdo)
    for (let i = 0; i <= 5; i++) this.setFunction(8, i, bit(bits, i));
    this.setFunction(8, 7, bit(bits, 6));
    this.setFunction(8, 8, bit(bits, 7));
    this.setFunction(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) this.setFunction(14 - i, 8, bit(bits, i));

    // Segunda copia (junto a los otros dos localizadores)
    for (let i = 0; i < 8; i++) this.setFunction(n - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) this.setFunction(8, n - 15 + i, bit(bits, i));
    this.setFunction(8, n - 8, true); // módulo oscuro fijo
  }

  /** Información de versión (solo v7+): 6 bits de versión + 12 bits BCH. */
  drawVersionBits() {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;
    const n = this.size;
    for (let i = 0; i < 18; i++) {
      const b = bit(bits, i);
      const a = n - 11 + (i % 3);
      const c = Math.floor(i / 3);
      this.setFunction(a, c, b);
      this.setFunction(c, a, b);
    }
  }

  /** Coloca los codewords en zigzag de derecha a izquierda, saltando la columna de temporización. */
  drawCodewords(codewords) {
    const n = this.size;
    let i = 0;
    const totalBits = codewords.length * 8;
    for (let right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < n; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? n - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < totalBits) {
            this.modules[y][x] = bit(codewords[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  /** Aplica (o revierte, por ser XOR) la máscara indicada sobre los módulos de datos. */
  applyMask(mask) {
    const n = this.size;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (this.isFunction[y][x]) continue;
        let invert = false;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: invert = false;
        }
        if (invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }

  /** Puntuación de penalización (reglas 1–4 de la norma). Cuanto menor, mejor máscara. */
  penaltyScore() {
    const n = this.size;
    const m = this.modules;
    let score = 0;
    const FINDER_A = [true, false, true, true, true, false, true, false, false, false, false];
    const FINDER_B = [false, false, false, false, true, false, true, true, true, false, true];

    const scanLine = (getter) => {
      // Regla 1: rachas de ≥5 módulos iguales
      let run = 1;
      for (let i = 1; i < n; i++) {
        if (getter(i) === getter(i - 1)) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score += 1;
        } else {
          run = 1;
        }
      }
      // Regla 3: patrones similares al localizador (1011101 + 0000 a un lado)
      for (let i = 0; i + 11 <= n; i++) {
        let matchA = true;
        let matchB = true;
        for (let k = 0; k < 11; k++) {
          const v = getter(i + k);
          if (v !== FINDER_A[k]) matchA = false;
          if (v !== FINDER_B[k]) matchB = false;
          if (!matchA && !matchB) break;
        }
        if (matchA) score += 40;
        if (matchB) score += 40;
      }
    };

    for (let y = 0; y < n; y++) scanLine((i) => m[y][i]);
    for (let x = 0; x < n; x++) scanLine((i) => m[i][x]);

    // Regla 2: bloques 2×2 del mismo color
    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n - 1; x++) {
        const c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
      }
    }

    // Regla 4: desviación de la proporción de módulos oscuros respecto al 50 %
    let dark = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) dark++;
    const total = n * n;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    score += Math.max(0, k) * 10;
    return score;
  }

  selectAndApplyBestMask() {
    let bestMask = 0;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      this.applyMask(mask);
      this.drawFormatBits(mask);
      const score = this.penaltyScore();
      if (score < bestScore) {
        bestScore = score;
        bestMask = mask;
      }
      this.applyMask(mask); // revierte (XOR)
    }
    this.applyMask(bestMask);
    this.drawFormatBits(bestMask);
    this.mask = bestMask;
  }
}

// ───────────────────────────── API pública ─────────────────────────────

/**
 * Codifica `text` en una matriz QR.
 * @param {string} text Texto/URL a codificar (UTF-8).
 * @param {{ ecLevel?: 'L'|'M'|'Q'|'H', mask?: number }} options `mask` fuerza una máscara (0–7); por defecto se elige la mejor.
 * @returns {{ version: number, size: number, ecLevel: string, mask: number, modules: boolean[][] }}
 */
export function encodeQR(text, options = {}) {
  const ecLevel = EC_BITS[options.ecLevel] !== undefined ? options.ecLevel : 'M';
  const bytes = textToUtf8Bytes(String(text ?? ''));
  const version = chooseVersion(bytes.length, ecLevel);
  if (version < 0) {
    const maxBytes = Math.floor((totalDataCodewords(MAX_VERSION, ecLevel) * 8 - 4 - charCountBits(MAX_VERSION)) / 8);
    throw new Error(`Texto demasiado largo para un QR local (máx. ${maxBytes} bytes en nivel ${ecLevel}).`);
  }

  const data = buildDataCodewords(bytes, version, ecLevel);
  const codewords = buildFinalCodewords(data, version, ecLevel);

  const matrix = new QRMatrix(version, ecLevel);
  matrix.drawFunctionPatterns();
  matrix.drawCodewords(codewords);
  if (Number.isInteger(options.mask) && options.mask >= 0 && options.mask <= 7) {
    matrix.applyMask(options.mask);
    matrix.drawFormatBits(options.mask);
    matrix.mask = options.mask;
  } else {
    matrix.selectAndApplyBestMask();
  }

  return { version, size: matrix.size, ecLevel, mask: matrix.mask, modules: matrix.modules };
}

/**
 * Dibuja el QR de `text` en un <canvas> (usa todo el ancho/alto del canvas, centrado, con zona de silencio).
 * @param {HTMLCanvasElement} canvas
 * @param {string} text
 * @param {{ dark?: string, light?: string, quietZone?: number, ecLevel?: 'L'|'M'|'Q'|'H' }} options
 */
export function drawQRToCanvas(canvas, text, options = {}) {
  const { dark = '#000000', light = '#ffffff', quietZone = 4, ecLevel = 'M' } = options;
  const qr = encodeQR(text, { ecLevel });
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible');

  const width = canvas.width;
  const height = canvas.height;
  const cells = qr.size + quietZone * 2;
  const scale = Math.max(1, Math.floor(Math.min(width, height) / cells));
  const offsetX = Math.floor((width - scale * qr.size) / 2);
  const offsetY = Math.floor((height - scale * qr.size) / 2);

  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = dark;
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y][x]) ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
    }
  }
  return qr;
}
