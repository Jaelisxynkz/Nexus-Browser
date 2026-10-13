/**
 * generate-icon.js — Produces desktop/build/icon.ico for the Electron build.
 *
 * Pure Node.js (no native deps). Draws a Nexus-branded geometric icon
 * (dark navy background + blue→violet gradient "N" with soft glow) and
 * encodes it as a multi-resolution PNG-embedded ICO file.
 *
 * Run: node desktop/build/generate-icon.js
 */

const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ── CRC32 ────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ── PNG encoder ──────────────────────────────────────────────────────
function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  ihdr[10] = 0;  ihdr[11] = 0;  ihdr[12] = 0;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), pngChunk("IEND", Buffer.alloc(0))]);
}

// ── ICO encoder (PNG-embedded, Vista+) ───────────────────────────────
function encodeICO(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map((img) => {
    const e = Buffer.alloc(16);
    e[0] = img.w === 256 ? 0 : img.w;
    e[1] = img.h === 256 ? 0 : img.h;
    e[2] = 0; e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(img.png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += img.png.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

// ── ICNS encoder (PNG-embedded, macOS) ────────────────────────────────
// Modern ICNS supports raw PNG in each chunk. OSTypes for standard sizes:
// ic04=16, ic05=32, ic06=64, ic07=128, ic08=256, ic09=512, ic10=1024.
function encodeICNS(images) {
  const chunks = images.map((img) => {
    const ostype = Buffer.from(img.ostype, "ascii");
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(img.png.length + 8, 0); // length includes 8-byte chunk header
    return Buffer.concat([ostype, lenBuf, img.png]);
  });
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(body.length + 8, 4); // total file length includes 8-byte file header
  return Buffer.concat([header, body]);
}

// ── Geometry helpers ─────────────────────────────────────────────────
function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// ── Draw the icon at a given size ─────────────────────────────────────
function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const s = size; // alias
  const cx = s / 2, cy = s / 2;
  const maxR = s * 0.48; // rounded rect radius

  // N geometry — defined in 256-space then scaled
  const sc = s / 256;
  const barW = 30 * sc;       // bar thickness
  const barH = 128 * sc;      // bar height
  const barY = (s - barH) / 2; // centered vertically
  const leftX = 70 * sc;
  const rightX = 186 * sc - barW;
  const diagHalf = 15 * sc;   // half-width of diagonal stroke

  // Gradient colors
  const top = [59, 130, 246];   // #3b82f6
  const bot = [139, 92, 246];   // #8b5cf6
  const bgEdge = [7, 10, 20];   // #070a14
  const bgCenter = [16, 24, 44]; // #10182c

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const idx = (y * s + x) * 4;

      // Rounded-rect mask (alpha for the icon shape)
      const rx = x - cx, ry = y - cy;
      const ax = Math.abs(rx) - (cx - maxR);
      const ay = Math.abs(ry) - (cy - maxR);
      const outside = Math.hypot(Math.max(ax, 0), Math.max(ay, 0)) - maxR;
      const inside = Math.min(Math.max(ax, ay), 0);
      const sd = outside + inside; // signed distance to rounded rect edge
      const cornerAA = 1 - smoothstep(-0.5, 0.5, sd);

      // Background radial gradient
      const dist = Math.hypot(rx, ry) / (s * 0.7);
      const bgT = clamp(1 - dist, 0, 1);
      let r = lerp(bgEdge[0], bgCenter[0], bgT);
      let g = lerp(bgEdge[1], bgCenter[1], bgT);
      let b = lerp(bgEdge[2], bgCenter[2], bgT);
      let a = cornerAA;

      // N shape: distance to the union of 3 segments
      const inLeftBar = x >= leftX && x <= leftX + barW && y >= barY && y <= barY + barH;
      const inRightBar = x >= rightX && x <= rightX + barW && y >= barY && y <= barY + barH;
      const diagDist = distToSeg(x, y, leftX + barW / 2, barY, rightX + barW / 2, barY + barH);
      const inDiag = diagDist <= diagHalf;
      const onN = inLeftBar || inRightBar || inDiag;

      // Glow around the N
      const glowDist = Math.min(
        distToSeg(x, y, leftX + barW / 2, barY, leftX + barW / 2, barY + barH),
        distToSeg(x, y, rightX + barW / 2, barY, rightX + barW / 2, barY + barH),
        diagDist
      );
      const glow = Math.exp(-glowDist / (12 * sc)) * 0.35;

      if (onN) {
        // Gradient fill on the N based on vertical position
        const t = clamp((y - barY) / barH, 0, 1);
        r = lerp(top[0], bot[0], t);
        g = lerp(top[1], bot[1], t);
        b = lerp(top[2], bot[2], t);
        a = cornerAA;
      } else {
        // Add glow to background
        r = lerp(r, top[0], glow);
        g = lerp(g, top[1], glow);
        b = lerp(b, top[2], glow);
      }

      buf[idx] = Math.round(r);
      buf[idx + 1] = Math.round(g);
      buf[idx + 2] = Math.round(b);
      buf[idx + 3] = Math.round(a * 255);
    }
  }
  return buf;
}

// ── Generate multi-resolution ICO ─────────────────────────────────────
const sizes = [256, 128, 64, 48, 32, 16];
const images = sizes.map((sz) => {
  const rgba = drawIcon(sz);
  return { w: sz, h: sz, png: encodePNG(sz, sz, rgba) };
});
const ico = encodeICO(images);
const outPath = path.join(__dirname, "icon.ico");
fs.writeFileSync(outPath, ico);
console.log(`✓ Generated ${outPath} (${ico.length} bytes, ${sizes.length} sizes)`);

// Also export a 512×512 PNG for window/taskbar icons and social previews.
const png512 = encodePNG(512, 512, drawIcon(512));
const pngPath = path.join(__dirname, "icon.png");
fs.writeFileSync(pngPath, png512);
console.log(`✓ Generated ${pngPath} (${png512.length} bytes)`);

// Generate macOS .icns (PNG-embedded, all standard sizes).
const icnsSizes = [
  { ostype: "ic04", size: 16 },
  { ostype: "ic05", size: 32 },
  { ostype: "ic06", size: 64 },
  { ostype: "ic07", size: 128 },
  { ostype: "ic08", size: 256 },
  { ostype: "ic09", size: 512 },
  { ostype: "ic10", size: 1024 },
];
const icnsImages = icnsSizes.map(({ ostype, size }) => ({
  ostype,
  png: encodePNG(size, size, drawIcon(size)),
}));
const icns = encodeICNS(icnsImages);
const icnsPath = path.join(__dirname, "icon.icns");
fs.writeFileSync(icnsPath, icns);
console.log(`✓ Generated ${icnsPath} (${icns.length} bytes, ${icnsSizes.length} sizes)`);