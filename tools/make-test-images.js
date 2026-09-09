#!/usr/bin/env node
// ============================================================
// Dev tool (NOT part of the website): generate placeholder JPGs.
//
// Creates assets/<category>/001.jpg ... NNN.jpg — one distinct hue per
// image with a subtle diagonal gradient — so the app can be tested
// before the real photo library is added. One folder is created per
// category found in data.json (plus "legacy" for the old flat format).
//
// Usage:  node tools/make-test-images.js [count]   (default: 10)
//
// The script contains a small self-contained baseline JPEG encoder
// (no dependencies), so it runs anywhere Node.js does.
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");

const WIDTH = 384; // must be a multiple of 8
const HEIGHT = 288; // must be a multiple of 8

if (WIDTH % 8 !== 0 || HEIGHT % 8 !== 0) {
  console.error("WIDTH and HEIGHT must be multiples of 8");
  process.exit(1);
}

// ------------------------------------------------------------
// Color helpers
// ------------------------------------------------------------

function hslToRgb(h, s, l) {
  // h in [0,1), s/l in [0,1] -> [r,g,b] in 0..255
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// ------------------------------------------------------------
// Minimal baseline JPEG encoder (YCbCr 4:4:4, Huffman coded).
// The output file carries its own DHT segments, so any decoder
// that reads the tables from the stream decodes it correctly.
// ------------------------------------------------------------

const ZIGZAG = [
  0, 1, 8, 16, 9, 2, 3, 10,
  17, 24, 32, 25, 18, 11, 4, 5,
  12, 19, 26, 33, 40, 48, 41, 34,
  27, 20, 13, 6, 7, 14, 21, 28,
  35, 42, 49, 56, 57, 50, 43, 36,
  29, 22, 15, 23, 30, 37, 44, 51,
  58, 59, 52, 45, 38, 31, 39, 46,
  53, 60, 61, 54, 47, 55, 62, 63,
];

// Standard quantization tables (JPEG Annex K defaults).
const QUANT_LUM = [
  16, 12, 14, 14, 16, 24, 40, 51,
  12, 14, 14, 18, 24, 48, 62, 37,
  14, 16, 16, 24, 40, 54, 69, 56,
  14, 14, 18, 24, 48, 78, 62, 56,
  16, 24, 40, 54, 69, 81, 64, 56,
  24, 48, 78, 81, 108, 87, 69, 56,
  40, 62, 69, 87, 108, 123, 92, 76,
  51, 69, 56, 69, 123, 123, 92, 76,
];

const QUANT_CHR = [
  17, 18, 24, 47, 99, 99, 99, 99,
  18, 22, 24, 73, 111, 111, 111, 111,
  24, 47, 50, 106, 111, 111, 111, 111,
  47, 48, 106, 111, 111, 111, 111, 111,
  47, 50, 106, 111, 111, 111, 111, 111,
  47, 50, 106, 111, 111, 111, 111, 111,
  47, 50, 106, 111, 111, 111, 111, 111,
  47, 48, 106, 111, 111, 111, 111, 111,
];

// Standard Huffman code-length distributions (JPEG Annex K defaults).
const DC_LUM_BITS = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
const DC_CHR_BITS = [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
const AC_LUM_BITS = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125];
const AC_CHR_BITS = [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119];

// DC symbols are magnitude categories 0..11.
const DC_SYMBOLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// AC symbols: EOB (0x00), FZ (0xF0), then every (run<<4)|size with
// size 1..10 and run 0..15. Exactly 162 symbols.
const AC_SYMBOLS = (() => {
  const syms = [0x00, 0xf0];
  for (let size = 1; size <= 10; size++) {
    for (let run = 0; run <= 15; run++) {
      syms.push((run << 4) | size);
    }
  }
  return syms; // length must be 162
})();

// Build a symbol -> [code, codeLength] map using the standard JPEG
// Huffman construction (codes assigned in order of increasing length).
function buildHuffman(counts, symbols) {
  const map = new Map();
  let k = 0;
  let code = 0;
  for (let len = 1; len <= 16; len++) {
    for (let i = 0; i < counts[len - 1]; i++) {
      map.set(symbols[k], [code, len]);
      k++;
      code++;
    }
    code <<= 1;
  }
  if (k !== symbols.length) {
    throw new Error("Huffman table mismatch: " + k + " vs " + symbols.length);
  }
  return map;
}

// Bit writer with JPEG byte stuffing (0xFF is followed by 0x00).
class BitWriter {
  constructor() {
    this.bytes = [];
    this.buf = 0;
    this.nbits = 0;
  }

  write(value, len) {
    for (let i = len - 1; i >= 0; i--) {
      this.buf = ((this.buf << 1) | ((value >> i) & 1)) & 0xff;
      this.nbits++;
      if (this.nbits === 8) {
        const b = this.buf;
        this.bytes.push(b);
        if (b === 0xff) this.bytes.push(0x00); // byte stuffing
        this.buf = 0;
        this.nbits = 0;
      }
    }
  }

  flush() {
    if (this.nbits > 0) {
      const b = ((this.buf << (8 - this.nbits)) & 0xff);
      this.bytes.push(b); // a partial byte can never be 0xFF
      this.buf = 0;
      this.nbits = 0;
    }
  }
}

// Precomputed DCT cosine table: COS[u*8+x] = cos((2x+1)u*pi/16).
const COS = [];
for (let u = 0; u < 8; u++) {
  for (let x = 0; x < 8; x++) {
    COS.push(Math.cos(((2 * x + 1) * u * Math.PI) / 16));
  }
}

const C0 = Math.sqrt(1 / 8);
const C1 = Math.sqrt(2 / 8);

// Orthonormal 2-D DCT of one 8x8 block (row-major input).
function dctBlock(block) {
  const tmp = new Array(64);
  for (let y = 0; y < 8; y++) {
    for (let u = 0; u < 8; u++) {
      let s = 0;
      for (let x = 0; x < 8; x++) s += block[y * 8 + x] * COS[u * 8 + x];
      tmp[y * 8 + u] = (u === 0 ? C0 : C1) * s;
    }
  }
  const out = new Array(64);
  for (let x = 0; x < 8; x++) {
    for (let v = 0; v < 8; v++) {
      let s = 0;
      for (let y = 0; y < 8; y++) s += tmp[y * 8 + x] * COS[v * 8 + y];
      out[v * 8 + x] = (v === 0 ? C0 : C1) * s;
    }
  }
  return out;
}

// Quantize a DCT block and reorder into zigzag order (index 0 = DC).
function quantizeZigzag(dct, qtable) {
  const out = new Array(64);
  for (let i = 0; i < 64; i++) {
    const z = ZIGZAG[i];
    out[i] = Math.round(dct[z] / qtable[z]);
  }
  return out;
}

// Encode one component plane (width*height floats, already in JPEG
// range) into the shared bit writer.
function encodeComponent(plane, width, height, huffDc, huffAc, qtable, bitw) {
  const blocksX = width / 8;
  const blocksY = height / 8;
  let prevDc = 0;

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      // Extract one 8x8 block, centered around 128.
      const block = new Array(64);
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          block[y * 8 + x] = plane[(by * 8 + y) * width + bx * 8 + x] - 128;
        }
      }

      const qz = quantizeZigzag(dctBlock(block), qtable);

      // DC coefficient (differential coding).
      const diff = qz[0] - prevDc;
      prevDc = qz[0];
      let cat = 0;
      for (let v = Math.abs(diff); v > 0; v >>= 1) cat++;
      const dcCode = huffDc.get(cat);
      bitw.write(dcCode[0], dcCode[1]);
      if (cat > 0) {
        const bits = diff < 0 ? diff + (1 << cat) - 1 : diff;
        bitw.write(bits, cat);
      }

      // AC coefficients (run-length coding).
      let run = 0;
      for (let i = 1; i < 64; i++) {
        const c = qz[i];
        if (c === 0) {
          run++;
          continue;
        }
        while (run > 15) {
          const fz = huffAc.get(0xf0); // FZ: 15 zeros, no data bits
          bitw.write(fz[0], fz[1]);
          run -= 16;
        }
        let size = 0;
        for (let v = Math.abs(c); v > 0; v >>= 1) size++;
        const symCode = huffAc.get((run << 4) | size);
        bitw.write(symCode[0], symCode[1]);
        const bits = c < 0 ? c + (1 << size) - 1 : c;
        bitw.write(bits, size);
        run = 0;
      }
      if (run > 0) {
        const eob = huffAc.get(0x00); // EOB: end of block
        bitw.write(eob[0], eob[1]);
      }
    }
  }
}

// Push a marker segment: [0xFF, marker, lenHi, lenLo, ...payload]
function pushSegment(bytes, marker, payload) {
  bytes.push(0xff, marker);
  const len = payload.length + 2;
  bytes.push((len >> 8) & 0xff, len & 0xff);
  for (const b of payload) bytes.push(b);
}

function pushDqt(bytes, tableId, qtable) {
  const p = [tableId]; // precision 0 (8-bit) + id
  for (const v of qtable) p.push(v);
  pushSegment(bytes, 0xdb, p);
}

function pushDht(bytes, classId, counts, symbols) {
  const p = [classId];
  for (let i = 0; i < 16; i++) p.push(counts[i]);
  for (const s of symbols) p.push(s);
  pushSegment(bytes, 0xc4, p);
}

// Encode an RGB pixel buffer into a baseline JPEG file.
function encodeJpeg(rgb, width, height) {
  // RGB -> YCbCr planes.
  const n = width * height;
  const Y = new Float64Array(n);
  const Cb = new Float64Array(n);
  const Cr = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    Y[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    Cb[i] = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
    Cr[i] = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
  }

  const huffDcLum = buildHuffman(DC_LUM_BITS, DC_SYMBOLS);
  const huffDcChr = buildHuffman(DC_CHR_BITS, DC_SYMBOLS);
  const huffAcLum = buildHuffman(AC_LUM_BITS, AC_SYMBOLS);
  const huffAcChr = buildHuffman(AC_CHR_BITS, AC_SYMBOLS);

  const bytes = [];

  // SOI
  bytes.push(0xff, 0xd8);

  // APP0 (JFIF)
  pushSegment(bytes, 0xe0, [
    0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x01, // version 1.1
    0x00, // units: none
    0x00, 0x01, 0x00, 0x01, // density 1x1
    0x00, 0x00, // no thumbnail
  ]);

  // Quantization tables (luminance id=0, chrominance id=1)
  pushDqt(bytes, 0, QUANT_LUM);
  pushDqt(bytes, 1, QUANT_CHR);

  // SOF0 (baseline DCT, 8-bit, YCbCr 4:4:4)
  pushSegment(bytes, 0xc0, [
    0x08, // precision
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, // number of components
    0x01, 0x11, 0x00, // Y: id=1, sampling 4:4:4, quant table 0
    0x02, 0x11, 0x01, // Cb: id=2, sampling 4:4:4, quant table 1
    0x03, 0x11, 0x01, // Cr: id=3, sampling 4:4:4, quant table 1
  ]);

  // Huffman tables (DC/AC x luminance/chrominance)
  pushDht(bytes, 0x00, DC_LUM_BITS, DC_SYMBOLS);
  pushDht(bytes, 0x01, DC_CHR_BITS, DC_SYMBOLS);
  pushDht(bytes, 0x10, AC_LUM_BITS, AC_SYMBOLS);
  pushDht(bytes, 0x11, AC_CHR_BITS, AC_SYMBOLS);

  // SOS (sequential scan, no arithmetic coding)
  pushSegment(bytes, 0xda, [
    0x03, // number of components
    0x01, 0x00, // Y: DC table 0, AC table 0
    0x02, 0x11, // Cb: DC table 1, AC table 1
    0x03, 0x11, // Cr: DC table 1, AC table 1
    0x00, // spectral start
    0x3f, // spectral end
    0x00, // no approximation
  ]);

  // Scan data (component order must match SOS).
  const bitw = new BitWriter();
  encodeComponent(Y, width, height, huffDcLum, huffAcLum, QUANT_LUM, bitw);
  encodeComponent(Cb, width, height, huffDcChr, huffAcChr, QUANT_CHR, bitw);
  encodeComponent(Cr, width, height, huffDcChr, huffAcChr, QUANT_CHR, bitw);
  bitw.flush();
  for (const b of bitw.bytes) bytes.push(b);

  // EOI
  bytes.push(0xff, 0xd9);

  return Buffer.from(bytes);
}

// ------------------------------------------------------------
// Placeholder image generation
// ------------------------------------------------------------

function makePlaceholder(index, count) {
  const hue = ((index * 360) / count) % 1; // one distinct hue per image
  const rgb = Buffer.alloc(WIDTH * HEIGHT * 3);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      // Subtle diagonal lightness gradient so images are easy to tell apart.
      const t = (x / WIDTH + y / HEIGHT) / 2; // 0..1
      const [r, g, b] = hslToRgb(hue, 0.65, 0.35 + 0.3 * t);
      const i = (y * WIDTH + x) * 3;
      rgb[i] = r;
      rgb[i + 1] = g;
      rgb[i + 2] = b;
    }
  }
  return encodeJpeg(rgb, WIDTH, HEIGHT);
}

function main() {
  const count = Math.max(1, parseInt(process.argv[2], 10) || 10);
  const root = path.join(__dirname, "..");

  // One folder per category in data.json, plus "legacy" so the old
  // flat format keeps working.
  const ids = [];
  const dataPath = path.join(root, "data.json");
  if (fs.existsSync(dataPath)) {
    const raw = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    if (raw && Array.isArray(raw.categories)) {
      for (const c of raw.categories) ids.push(c.id);
    }
  }
  if (!ids.includes("legacy")) ids.push("legacy");

  // Encode every placeholder once, then write it into each folder.
  const buffers = [];
  for (let i = 1; i <= count; i++) {
    const buf = makePlaceholder(i - 1, count);

    // Basic self-check: valid JPEG start/end markers.
    if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) {
      throw new Error("Generated file failed JPEG marker check: " + i);
    }
    buffers.push(buf);
  }

  for (const id of ids) {
    const dir = path.join(root, "assets", id);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < count; i++) {
      fs.writeFileSync(path.join(dir, String(i + 1).padStart(3, "0") + ".jpg"), buffers[i]);
    }
    console.log("created " + count + " test images in assets/" + id);
  }
}

// Export internals for testing; run main only when executed directly.
module.exports = { encodeJpeg, hslToRgb, WIDTH, HEIGHT };

if (require.main === module) {
  main();
}
