'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');

// Zero-dependency lossless RGBA PNG encoder (colorType 6, strict binary alpha 0/255)
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodeRGBA(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}
function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

// Native cell size: 152x128 with ground anchor at (76, 112)
// Hero body is ~70px tall -> crisp 1:1 integer pixel scale matches An/HoaVi/HuyenKha perfectly!
const CW = 152, CH = 128;
const AX = 76, AY = 112;

const BAYER = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

function hash(n) {
  n = Math.imul(n ^ 61, 19349663);
  n ^= n >>> 13;
  n = Math.imul(n, 83492791);
  return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
}

const PAL = {
  auraOuter: '#4a0d78',
  auraMid: '#9429ff',
  auraHot: '#d678ff',
  auraPink: '#ff2b85',
  armorVoid: '#08050f',
  armorDeep: '#120b21',
  armorMid: '#1f1438',
  armorHigh: '#322059',
  veinMid: '#a75cff',
  veinBright: '#e3bdff',
  veinCore: '#ffffff',
  skinShadow: '#9e6c63',
  skinMid: '#d9a496',
  skinLight: '#f7d5c6',
  hairVoid: '#0b0714',
  hairMid: '#1d1233',
  hairRim: '#8d52d6',
  silverDark: '#9fb0cc',
  silverBright: '#eef5ff',
  eyeCore: '#ffffff',
  eyeGlow: '#d98cff',
  cyanDeep: '#0d688f',
  cyanBright: '#00eeff',
  cyanPale: '#cffaff',
  roseDark: '#470a25',
  roseBright: '#ff2e7a',
  rosePale: '#ff9ec4',
  white: '#ffffff'
};
const RGB_CACHE = {};
for (const k of Object.keys(PAL)) RGB_CACHE[PAL[k]] = hexToRgb(PAL[k]);

function createBuffer(w, h) { return { w, h, data: new Array(w * h).fill(null) }; }
function pset(buf, x, y, col) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= buf.w || y >= buf.h || !col) return;
  buf.data[y * buf.w + x] = col;
}
function rect(buf, x, y, w, h, col) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pset(buf, x + i, y + j, col);
}
function disc(buf, cx, cy, r, col) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) pset(buf, x, y, col);
}
function line(buf, x0, y0, x1, y1, th, col) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.7));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    if (th <= 1) pset(buf, x, y, col); else disc(buf, x, y, th * 0.5, col);
  }
}
function polyTri(buf, x0, y0, x1, y1, x2, y2, col) {
  const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
  const maxX = Math.min(buf.w - 1, Math.ceil(Math.max(x0, x1, x2)));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
  const maxY = Math.min(buf.h - 1, Math.ceil(Math.max(y0, y1, y2)));
  const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(area) < 0.01) return;
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      const w0 = ((x1 - x) * (y2 - y) - (x2 - x) * (y1 - y)) / area;
      const w1 = ((x2 - x) * (y0 - y) - (x0 - x) * (y2 - y)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) pset(buf, x, y, col);
    }
}

function addMonarchAuraOutline(buf, intensity = 1, seed = 1) {
  const orig = buf.data.slice();
  const d1 = [[-1,0],[1,0],[0,-1],[0,1]];
  const d2 = [[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[1,-1],[-1,1],[1,1]];
  for (let y = 2; y < buf.h - 2; y++) {
    for (let x = 2; x < buf.w - 2; x++) {
      if (orig[y * buf.w + x]) continue;
      let hit1 = false;
      for (const [dx, dy] of d1) if (orig[(y + dy) * buf.w + (x + dx)]) { hit1 = true; break; }
      if (hit1) buf.data[y * buf.w + x] = intensity > 0.75 ? PAL.auraHot : PAL.auraMid;
      else {
        let hit2 = false;
        for (const [dx, dy] of d2) if (orig[(y + dy) * buf.w + (x + dx)]) { hit2 = true; break; }
        if (hit2 && ((BAYER[y & 3][x & 3] / 16) < 0.45 * intensity)) {
          buf.data[y * buf.w + x] = ((x + y + seed) & 4) ? PAL.auraOuter : PAL.auraMid;
        }
      }
    }
  }
}

function drawRosePetals(buf, cx, cy, count, spreadX, spreadY, seed) {
  for (let i = 0; i < count; i++) {
    const px = cx + (hash(i * 31 + seed) - 0.35) * spreadX;
    const py = cy + (hash(i * 47 + seed * 3) - 0.5) * spreadY;
    const fl = (i + seed) & 1;
    pset(buf, px, py, PAL.roseBright);
    pset(buf, px + (fl ? 1 : -1), py, PAL.roseDark);
    pset(buf, px, py + 1, i % 3 === 0 ? PAL.rosePale : PAL.auraMid);
  }
}

function drawFangDagger(buf, hx, hy, angle, opts = {}) {
  const len = opts.len ?? 24, glow = opts.glow ?? 1, dissolve = opts.dissolve ?? 0;
  const cos = Math.cos(angle), sin = Math.sin(angle), nx = -sin, ny = cos;
  const dBuf = createBuffer(CW, CH);
  if (dissolve < 0.75) {
    line(dBuf, hx - cos * 5, hy - sin * 5, hx + cos * 2, hy + sin * 2, 2.2, PAL.armorHigh);
    pset(dBuf, hx - cos * 6, hy - sin * 6, PAL.veinBright);
    polyTri(dBuf, hx + cos * 2, hy + sin * 2, hx - cos * 3 + nx * 6.5, hy - sin * 3 + ny * 6.5, hx + cos * 6 + nx * 2.5, hy + sin * 6 + ny * 2.5, PAL.armorDeep);
    polyTri(dBuf, hx + cos * 2, hy + sin * 2, hx - cos * 3 - nx * 6.5, hy - sin * 3 - ny * 6.5, hx + cos * 6 - nx * 2.5, hy + sin * 6 - ny * 2.5, PAL.armorDeep);
  }
  const maxD = len * (1 - dissolve * 0.8);
  for (let d = 3; d <= maxD; d += 0.65) {
    const u = d / len;
    let halfW = (1 - Math.pow(u, 1.35)) * 4.4;
    if (u > 0.12 && u < 0.55) halfW += Math.sin(u * 24) * 1.15;
    if (dissolve > 0.25 && hash(Math.floor(d * 17)) < dissolve) continue;
    for (let w = -halfW; w <= halfW; w += 0.65) {
      const aw = Math.abs(w);
      const col = aw > halfW - 0.9 ? (u > 0.55 ? PAL.white : (w > 0 ? PAL.veinBright : PAL.cyanBright))
        : aw > halfW - 1.7 ? PAL.veinMid
        : (aw < 0.7 && u < 0.75 && Math.floor(d) % 3 === 0) ? PAL.auraHot : PAL.armorVoid;
      pset(dBuf, hx + cos * d + nx * w, hy + sin * d + ny * w, col);
    }
  }
  addMonarchAuraOutline(dBuf, 0.85 * glow, Math.round(len));
  for (let i = 0; i < CW * CH; i++) if (dBuf.data[i]) buf.data[i] = dBuf.data[i];
}

function drawSakugaCrescent(buf, ox, oy, aimAngle, radius, thickness, phase = 0.35, seed = 1) {
  const dissolve = Math.max(0, (phase - 0.68) / 0.32), span = 1.62;
  for (let y = Math.max(0, Math.floor(oy - radius - 14)); y <= Math.min(CH - 1, Math.ceil(oy + radius + 14)); y++) {
    for (let x = Math.max(0, Math.floor(ox - radius - 14)); x <= Math.min(CW - 1, Math.ceil(ox + radius + 14)); x++) {
      const dx = x - ox, dy = y - oy, r = Math.hypot(dx, dy);
      let da = Math.atan2(dy, dx) - aimAngle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > span) continue;
      const localThick = thickness * Math.pow(1 - Math.abs(da) / span, 0.72);
      const flameW = Math.sin(da * 13 - phase * 24) * 2.6 + Math.cos(da * 21 + seed) * 1.4;
      const dist = Math.abs(r - (radius + flameW * 0.45));
      if (dist > localThick) continue;
      let heat = 1 - dist / Math.max(1, localThick);
      const bayer = BAYER[y & 3][x & 3] / 16;
      if (dissolve > 0) heat -= dissolve * (1.1 + Math.sin(da * 9 + seed) * 0.32 + Math.cos(r * 0.3) * 0.2);
      if (heat + bayer * 0.25 < 0.22) continue;
      const col = heat > 0.8 ? PAL.white : heat > 0.62 ? (r >= radius ? PAL.cyanBright : PAL.veinBright) : heat > 0.42 ? (((x + y) & 2) ? PAL.auraHot : PAL.auraPink) : heat > 0.26 ? PAL.auraMid : PAL.auraOuter;
      pset(buf, x, y, col);
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = aimAngle + (hash(i * 19 + seed) - 0.5) * span * 1.9, rr = radius + (hash(i * 37 + seed) - 0.5) * thickness * 1.8;
    pset(buf, ox + Math.cos(a) * rr, oy + Math.sin(a) * rr, i % 3 === 0 ? PAL.white : i % 2 ? PAL.cyanBright : PAL.auraPink);
  }
  drawRosePetals(buf, ox + Math.cos(aimAngle) * (radius * 0.75), oy + Math.sin(aimAngle) * (radius * 0.75), 9, 28, 30, seed);
}

function drawAbyssalPortal(buf, cx, cy, rx, ry, seed = 1, spires = true) {
  for (let y = Math.floor(cy - ry - 3); y <= Math.ceil(cy + ry + 3); y++) {
    for (let x = Math.floor(cx - rx - 3); x <= Math.ceil(cx + rx + 3); x++) {
      const nx = (x - cx) / Math.max(1, rx), ny = (y - cy) / Math.max(1, ry), d = Math.hypot(nx, ny);
      if (d > 1.12) continue;
      const ring = Math.sin(d * 13 - seed * 0.8 + Math.atan2(ny, nx) * 3);
      pset(buf, x, y, d > 0.92 ? (ring > 0.2 ? PAL.white : PAL.auraHot) : d > 0.72 ? (ring > 0 ? PAL.cyanBright : PAL.auraMid) : d > 0.50 ? (((x + y) & 2) ? PAL.auraOuter : PAL.armorVoid) : PAL.armorVoid);
    }
  }
  if (spires) for (let i = -4; i <= 4; i++) {
    const sx = cx + i * (rx * 0.21), h = (5 - Math.abs(i)) * 3.5 + hash(i * 19 + seed) * 7;
    line(buf, sx, cy, sx + Math.sin(seed + i) * 2.5, cy - h, 1.8, Math.abs(i) % 2 ? PAL.auraMid : PAL.armorDeep);
    pset(buf, sx + Math.sin(seed + i) * 2.5, cy - h, PAL.auraHot);
  }
}

function drawAlphaWolf(buf, wx, wy, scale = 1, leap = 0.4, seed = 1) {
  const wBuf = createBuffer(CW, CH), s = scale;
  for (let i = 0; i < 10; i++) disc(wBuf, wx - 10 * s - i * 2.8 * s, wy - 7 * s + Math.sin(seed + i * 0.8) * 3.5 * s, Math.max(1.2, (3.8 - i * 0.3) * s), i % 2 ? PAL.auraOuter : PAL.armorVoid);
  line(wBuf, wx - 10 * s, wy - 5 * s, wx + 7 * s, wy - 10 * s - leap * 4, 6.8 * s, PAL.armorVoid);
  line(wBuf, wx - 8 * s, wy - 8 * s, wx + 6 * s, wy - 13 * s - leap * 4, 2.6 * s, PAL.auraMid);
  for (let m = 0; m < 5; m++) line(wBuf, wx + (m * 3 - 4) * s, wy - 11 * s - leap * 3, wx + (m * 2.5 - 9) * s, wy - 20 * s - leap * 4, 2.0 * s, m % 2 ? PAL.cyanBright : PAL.auraHot);
  const hx = wx + 12 * s, hy = wy - 13 * s - leap * 4.5;
  disc(wBuf, hx, hy, 4.8 * s, PAL.armorVoid);
  polyTri(wBuf, hx - 2 * s, hy - 4 * s, hx - 7 * s, hy - 12 * s, hx + 1 * s, hy - 3 * s, PAL.armorDeep);
  line(wBuf, hx + 1 * s, hy - 1.5 * s, hx + 10 * s, hy - 2 * s, 2.8 * s, PAL.armorVoid);
  line(wBuf, hx + 1 * s, hy + 2.2 * s, hx + 9 * s, hy + 5 * s, 2.2 * s, PAL.armorDeep);
  line(wBuf, wx + 6 * s, wy - 7 * s - leap * 3, wx + 17 * s, wy - 2 * s - leap * 5, 2.8 * s, PAL.armorDeep);
  line(wBuf, wx - 9 * s, wy - 4 * s, wx - 17 * s, wy + 3 * s, 3.0 * s, PAL.armorDeep);
  addMonarchAuraOutline(wBuf, 1.0, seed);
  pset(wBuf, hx + 9 * s, hy, PAL.white); pset(wBuf, hx + 7 * s, hy + 3 * s, PAL.white);
  line(wBuf, hx - 5 * s, hy - 2.5 * s, hx + 4 * s, hy - 2 * s, 1.5, PAL.cyanBright);
  pset(wBuf, hx + 3 * s, hy - 2 * s, PAL.white);
  for (let i = 0; i < CW * CH; i++) if (wBuf.data[i]) buf.data[i] = wBuf.data[i];
}

function drawAbyssalDragon(buf, dx, dy, scale = 1, seed = 1) {
  const dBuf = createBuffer(CW, CH), s = scale;
  for (let i = 0; i < 18; i++) {
    const u = i / 18, nx = dx - (1 - u) * 38 * s, ny = dy + Math.sin(u * 4.4 + seed * 0.45) * 7 * s + (1 - u) * 22 * s;
    disc(dBuf, nx, ny, (6.0 - u * 1.0) * s, PAL.armorVoid);
    if (i % 3 === 0) line(dBuf, nx, ny - 4 * s, nx - 4 * s, ny - 10 * s, 1.8 * s, PAL.auraHot);
  }
  disc(dBuf, dx, dy, 6.8 * s, PAL.armorVoid);
  polyTri(dBuf, dx - 3 * s, dy - 4 * s, dx - 18 * s, dy - 16 * s, dx + 1 * s, dy - 4 * s, PAL.armorDeep);
  line(dBuf, dx - 3 * s, dy - 4 * s, dx - 18 * s, dy - 16 * s, 1.4, PAL.veinBright);
  line(dBuf, dx + 3 * s, dy - 3 * s, dx + 17 * s, dy - 5 * s, 3.6 * s, PAL.armorVoid);
  line(dBuf, dx + 3 * s, dy + 3 * s, dx + 15 * s, dy + 8 * s, 2.8 * s, PAL.armorDeep);
  addMonarchAuraOutline(dBuf, 1.05, seed);
  disc(dBuf, dx + 9 * s, dy + 1.5 * s, 4.2 * s, PAL.cyanBright);
  disc(dBuf, dx + 9 * s, dy + 1.5 * s, 2.2 * s, PAL.white);
  for (let f = 0; f < 10; f++) {
    const fx = dx + (11 + f * 3.0) * s, fy = dy + (1 + Math.sin(seed + f * 1.2) * (2 + f * 0.6)) * s;
    disc(dBuf, fx, fy, Math.max(1, (2.6 - f * 0.18) * s), f % 3 === 0 ? PAL.white : f % 2 ? PAL.cyanBright : PAL.auraHot);
  }
  line(dBuf, dx - 5 * s, dy - 3.5 * s, dx + 4 * s, dy - 3 * s, 1.5, PAL.cyanBright);
  pset(dBuf, dx + 3 * s, dy - 3 * s, PAL.white);
  for (let i = 0; i < CW * CH; i++) if (dBuf.data[i]) buf.data[i] = dBuf.data[i];
}

// =========================================================================
// MULTI-VIEW SHADOW MONARCH BODY RENDERER ('E', 'W', 'S', 'N')
// - 'E': 3/4 Right Profile (LEFT EAR SILVER EARRING VISIBLE!)
// - 'W': 3/4 Left Profile (Anatomical left ear occluded behind head!)
// - 'S': Front Heroic View (Both clear violet eyes + SILVER LEFT EARRING ON VIEWER'S RIGHT!)
// - 'N': Back View (Full billowing shadow-smoke cape + horned pauldrons + dark hair nape!)
// =========================================================================
function drawMonarchEast(vfxBuf, pose, hideLeftEarring = false) {
  const charBuf = createBuffer(CW, CH);
  const bx = Math.round(pose.x ?? AX), by = Math.round(pose.y ?? AY);
  const crouch = pose.crouch ?? 0, lean = pose.lean ?? 0, wind = pose.wind ?? 0.35;
  const rimGlow = pose.rimGlow ?? 0.65, stride = pose.stride ?? null, liftY = pose.liftY ?? 0;
  const armorSurge = pose.armorSurge ?? 0, t = pose.t ?? 0;

  const hipX = bx + Math.round(lean * 0.4), hipY = by - 25 + Math.round(crouch) - Math.round(liftY);
  const waistX = bx + Math.round(lean * 0.7), waistY = hipY - 9;
  const chestX = bx + Math.round(lean * 1.05), chestY = waistY - 11;
  const neckX = chestX + Math.round(lean * 0.25), neckY = chestY - 5;
  const headX = neckX + 1, headY = neckY - 8;

  // 1. Massive flowing tattered shadow-smoke cape
  for (let s = 0; s < 5; s++) {
    const startX = chestX - 5 - (s % 2) * 2, startY = chestY - 1 + s * 3.8, len = 26 + s * 5 + Math.round(wind * 13);
    for (let i = 0; i < len; i++) {
      const u = i / len, wave = Math.sin(t * 9 + i * 0.32 + s * 1.1) * (1.2 + wind * 2.6) * u;
      const riseCurve = s === 0 ? -Math.sin(u * Math.PI * 0.85) * 13 : (s * 0.16) * i;
      const cx = startX - i * (0.72 + wind * 0.33) + wave * 0.4;
      const cy = startY + riseCurve + i * (0.68 - Math.min(0.35, wind * 0.22)) + wave * 0.4;
      const thick = Math.max(1, Math.round((1 - u * 0.78) * (s === 0 ? 3.5 : 5.0)));
      disc(charBuf, cx, cy, thick * 0.65, u > 0.76 ? PAL.armorHigh : (s % 2 === 0 ? PAL.armorVoid : PAL.armorDeep));
      if (i % 5 === 0 && u > 0.25 && u < 0.85) pset(charBuf, cx, cy - thick * 0.5, PAL.veinMid);
    }
  }

  // 2. Spiked shadow greave legs
  let lFootX, lFootY, rFootX, rFootY;
  if (stride !== null) {
    const s1 = Math.sin(stride), c1 = Math.cos(stride);
    rFootX = bx - Math.round(s1 * 12); rFootY = by - Math.round(liftY) - Math.max(0, Math.round(-c1 * 5));
    lFootX = bx + Math.round(s1 * 12) + 3; lFootY = by - Math.round(liftY) - Math.max(0, Math.round(c1 * 5));
  } else {
    rFootX = bx - 8 - Math.round(crouch * 0.4); rFootY = by - Math.round(liftY);
    lFootX = bx + 9 + Math.round(lean * 0.4); lFootY = by - Math.round(liftY);
  }
  const rKneeX = (hipX - 2 + rFootX) * 0.5 + 1.5, rKneeY = (hipY + rFootY) * 0.5 - 1;
  const lKneeX = (hipX + 2 + lFootX) * 0.5 + 3.0, lKneeY = (hipY + lFootY) * 0.5 - 1.5;

  line(charBuf, hipX - 2, hipY, rKneeX, rKneeY, 5.2, PAL.armorVoid);
  line(charBuf, rKneeX, rKneeY, rFootX, rFootY - 2, 4.2, PAL.armorDeep);
  polyTri(charBuf, rKneeX - 2, rKneeY + 2, rKneeX - 7, rKneeY - 2, rKneeX - 1, rKneeY + 6, PAL.armorMid);
  rect(charBuf, rFootX - 2, rFootY - 3, 7, 3, PAL.armorMid);
  line(charBuf, hipX - 2, hipY + 3, rKneeX, rKneeY, 1, PAL.veinMid);

  line(charBuf, hipX + 2, hipY, lKneeX, lKneeY, 5.8, PAL.armorDeep);
  line(charBuf, lKneeX, lKneeY, lFootX, lFootY - 2, 4.6, PAL.armorMid);
  polyTri(charBuf, lKneeX + 2, lKneeY, lKneeX + 6, lKneeY - 4, lKneeX + 1, lKneeY + 4, PAL.armorHigh);
  polyTri(charBuf, lKneeX - 2, lKneeY + 4, lKneeX - 7, lKneeY + 1, lKneeX - 1, lKneeY + 9, PAL.armorMid);
  rect(charBuf, lFootX - 2, lFootY - 3, 8, 3, PAL.armorHigh);
  line(charBuf, hipX + 3, hipY + 1, lKneeX + 1, lKneeY - 1, 1, armorSurge > 0.3 ? PAL.veinCore : PAL.veinBright);
  line(charBuf, lKneeX + 1, lKneeY + 1, lFootX + 1, lFootY - 3, 1, PAL.veinMid);

  // 3. Back Arm
  let rHandX = chestX + 6, rHandY = chestY + 10;
  if (pose.backArmAngle !== undefined) {
    const shX = chestX + 3, shY = chestY + 3, a = pose.backArmAngle, aLen = pose.backArmExtend ?? 17;
    const elX = shX + Math.cos(a - 0.18) * (aLen * 0.5), elY = shY + Math.sin(a - 0.18) * (aLen * 0.5);
    rHandX = shX + Math.cos(a) * aLen; rHandY = shY + Math.sin(a) * aLen;
    line(charBuf, shX, shY, elX, elY, 4.2, PAL.armorVoid);
    line(charBuf, elX, elY, rHandX, rHandY, 3.8, PAL.armorDeep);
    line(charBuf, elX, elY, rHandX, rHandY, 1, PAL.veinMid);
    disc(charBuf, rHandX, rHandY, 2.2, pose.summonPalm ? PAL.cyanBright : PAL.armorMid);
    if (pose.summonPalm) pset(charBuf, rHandX, rHandY, PAL.white);
  }

  // 4. Sculpted chest, waist & purple filigree veins
  for (let y = 0; y < 10; y++) { const w = 9 + Math.round((y / 10) * 3), ox = waistX - Math.floor(w / 2); for (let x = 0; x < w; x++) pset(charBuf, ox + x, waistY + y, x < 3 ? PAL.armorVoid : x < w - 2 ? PAL.armorDeep : PAL.armorMid); }
  for (let y = 0; y < 12; y++) { const w = 14 - Math.round((y / 12) * 4), ox = chestX - Math.floor(w / 2); for (let x = 0; x < w; x++) pset(charBuf, ox + x, chestY + y, x < 4 ? PAL.armorVoid : x < w - 3 ? PAL.armorDeep : PAL.armorMid); }
  const vCol = armorSurge > 0.35 ? PAL.veinCore : PAL.veinBright;
  line(charBuf, chestX - 3, chestY + 3, chestX + 3, chestY + 2, 1, vCol);
  line(charBuf, chestX + 2, chestY + 2, chestX + 5, chestY + 6, 1, PAL.veinMid);
  line(charBuf, chestX - 2, chestY + 7, chestX + 4, chestY + 6, 1, PAL.veinMid);
  line(charBuf, waistX - 2, waistY + 2, waistX + 3, waistY + 5, 1, PAL.veinMid);
  line(charBuf, waistX + 1, waistY + 6, hipX + 2, hipY, 1, PAL.veinBright);
  disc(charBuf, chestX + 2, chestY + 4, 1.3, vCol); pset(charBuf, chestX + 2, chestY + 4, PAL.white);

  // 5. Segmented neck guard & Horned Pauldrons
  rect(charBuf, neckX - 3, neckY - 1, 7, 6, PAL.armorVoid);
  pset(charBuf, neckX - 2, neckY + 1, PAL.veinMid); pset(charBuf, neckX + 2, neckY + 1, PAL.veinMid);
  pset(charBuf, neckX - 2, neckY + 3, PAL.veinMid); pset(charBuf, neckX + 2, neckY + 3, PAL.veinMid);
  const pScale = 1 + armorSurge * 0.38;
  polyTri(charBuf, chestX + 4, chestY + 3, chestX + 11 * pScale, chestY - 10 * pScale, chestX + 8, chestY + 6, PAL.armorDeep);
  line(charBuf, chestX + 6, chestY + 2, chestX + 11 * pScale, chestY - 10 * pScale, 1, PAL.veinBright);
  polyTri(charBuf, chestX - 7, chestY + 3, chestX - 13 * pScale, chestY - 11 * pScale, chestX - 1, chestY + 5, PAL.armorVoid);
  polyTri(charBuf, chestX - 6, chestY + 2, chestX - 8 * pScale, chestY - 7 * pScale, chestX - 2, chestY + 4, PAL.armorMid);
  line(charBuf, chestX - 7, chestY + 3, chestX - 13 * pScale, chestY - 11 * pScale, 1, vCol);

  // 6. Crisp Clear JRPG Anime Head (13x13 clear face!) & Gleaming Silver Left Earring!
  const hx = headX, hy = headY - 2;
  for (let h = 0; h < 4; h++) line(charBuf, hx - 6, hy - 2 + h * 2.2, hx - 6 - (6 + h * 2 + Math.round(wind * 4)), hy - 1 + h * 2.5 + Math.sin(t * 10 + h) * 1.2, 2.4, PAL.hairVoid);
  rect(charBuf, hx - 3, hy + 1, 10, 9, PAL.skinMid);
  rect(charBuf, hx + 2, hy + 2, 5, 6, PAL.skinLight);
  rect(charBuf, hx - 3, hy + 8, 7, 2, PAL.skinShadow);
  pset(charBuf, hx + 7, hy + 5, PAL.skinLight); pset(charBuf, hx + 6, hy + 8, PAL.skinShadow);
  pset(charBuf, hx + 4, hy + 8, PAL.skinShadow); pset(charBuf, hx + 5, hy + 8, PAL.white);
  pset(charBuf, hx - 1, hy + 9, PAL.armorVoid); pset(charBuf, hx, hy + 8, PAL.armorVoid);
  rect(charBuf, hx + 2, hy + 2, 4, 1, PAL.hairVoid);
  rect(charBuf, hx + 2, hy + 4, 4, 1, PAL.armorVoid);
  rect(charBuf, hx + 3, hy + 5, 2, 2, PAL.eyeGlow); pset(charBuf, hx + 4, hy + 5, PAL.white);
  if (rimGlow > 0.78) { pset(charBuf, hx + 6, hy + 5, PAL.eyeGlow); pset(charBuf, hx + 7, hy + 5, PAL.white); }
  rect(charBuf, hx - 7, hy - 5, 15, 5, PAL.hairVoid); rect(charBuf, hx - 6, hy - 7, 13, 3, PAL.hairMid);
  polyTri(charBuf, hx - 2, hy - 2, hx + 2, hy + 2, hx - 4, hy + 2, PAL.hairVoid);
  polyTri(charBuf, hx + 4, hy - 2, hx + 8, hy + 2, hx + 5, hy + 2, PAL.hairVoid);
  line(charBuf, hx - 4, hy - 6, hx + 4, hy - 6, 1, PAL.veinBright);
  line(charBuf, hx - 5, hy + 1, hx - 6 - wind * 2, hy + 15, 2.0, PAL.hairVoid); pset(charBuf, hx - 5, hy + 6, PAL.hairRim);
  rect(charBuf, hx - 3, hy + 4, 2, 3, PAL.skinMid);
  if (!hideLeftEarring) {
    // Gleaming Silver Left Earring (visible in E view, omitted in W mirror!)
    pset(charBuf, hx - 3, hy + 6, PAL.silverDark); pset(charBuf, hx - 2, hy + 6, PAL.silverBright);
    pset(charBuf, hx - 3, hy + 7, PAL.silverBright); pset(charBuf, hx - 2, hy + 7, PAL.white);
    pset(charBuf, hx - 2, hy + 8, PAL.silverBright);
    if (Math.floor(t * 6) % 2 === 0) pset(charBuf, hx - 3, hy + 8, PAL.white);
  }

  // 7. Front Armored Gauntlet Arm
  const shX = chestX - 3, shY = chestY + 4, armA = pose.armAngle ?? 0.55, armLen = pose.armExtend ?? 17;
  const elX = shX + Math.cos(armA + 0.18) * (armLen * 0.5), elY = shY + Math.sin(armA + 0.18) * (armLen * 0.5);
  const handX = shX + Math.cos(armA) * armLen, handY = shY + Math.sin(armA) * armLen;
  const enx = -Math.sin(armA), eny = Math.cos(armA);
  line(charBuf, shX, shY, elX, elY, 4.6, PAL.armorVoid);
  line(charBuf, elX, elY, handX, handY, 4.2, PAL.armorDeep);
  polyTri(charBuf, elX, elY, elX - Math.cos(armA) * 5 + enx * 4, elY - Math.sin(armA) * 5 + eny * 4, elX + Math.cos(armA) * 3, elY + Math.sin(armA) * 3, PAL.armorMid);
  line(charBuf, shX, shY + 1, elX, elY, 1, PAL.veinMid);
  line(charBuf, elX, elY, handX, handY, 1, vCol);
  disc(charBuf, handX, handY, 2.3, PAL.armorMid); pset(charBuf, handX + Math.cos(armA), handY + Math.sin(armA), PAL.veinBright);

  addMonarchAuraOutline(charBuf, 0.8 + armorSurge * 0.25, Math.round(t * 10));
  for (let i = 0; i < CW * CH; i++) if (charBuf.data[i]) vfxBuf.data[i] = charBuf.data[i];
  return { handX, handY, rHandX, rHandY, chestX, chestY, headX, headY, bx, by };
}

// Front ('S') and Back ('N') Heroic Shadow Monarch Body Renderer!
function drawMonarchFrontBack(vfxBuf, view, pose) {
  const isFront = view === 'S';
  const charBuf = createBuffer(CW, CH);
  const bx = Math.round(pose.x ?? AX), by = Math.round(pose.y ?? AY);
  const crouch = pose.crouch ?? 0, wind = pose.wind ?? 0.35, liftY = pose.liftY ?? 0;
  const stride = pose.stride ?? null, armorSurge = pose.armorSurge ?? 0, t = pose.t ?? 0;
  const hipY = by - 25 + Math.round(crouch) - Math.round(liftY);
  const waistY = hipY - 9, chestY = waistY - 11, neckY = chestY - 5, headY = neckY - 10;
  const vCol = armorSurge > 0.35 ? PAL.veinCore : PAL.veinBright;

  // Back Cape (behind body for S; drawn OVER body for N!)
  function paintCape() {
    for (let s = -2; s <= 2; s++) {
      const topX = bx + s * 6, topY = chestY + 2;
      const sway = Math.sin(t * 8 + s * 1.1) * (2.5 + wind * 3.5);
      const botX = bx + s * 11 + sway, botY = by - 2 - Math.abs(s) * 2 - liftY;
      polyTri(charBuf, topX - 4, topY, topX + 4, topY, botX, botY, Math.abs(s) % 2 ? PAL.armorDeep : PAL.armorVoid);
      // Tattered crimson-violet flame tips at bottom of cape!
      polyTri(charBuf, botX - 3, botY - 8, botX + 3, botY - 8, botX + sway * 0.3, botY + 3, Math.abs(s) === 2 ? PAL.auraPink : PAL.auraMid);
      if (!isFront && Math.abs(s) <= 1) line(charBuf, topX, topY + 6, botX, botY - 8, 1, PAL.veinMid);
    }
  }
  if (isFront) paintCape();

  // Legs
  const stepL = stride !== null ? Math.sin(stride) * 5 : 0;
  const stepR = stride !== null ? -Math.sin(stride) * 5 : 0;
  for (const [side, st] of [[-1, stepL], [1, stepR]]) {
    const fx = bx + side * 7, fy = by - Math.round(liftY) - Math.max(0, Math.round(st));
    const kx = bx + side * 6, ky = (hipY + fy) * 0.5;
    line(charBuf, bx + side * 4, hipY, kx, ky, 5.2, PAL.armorDeep);
    line(charBuf, kx, ky, fx, fy - 2, 4.4, PAL.armorMid);
    polyTri(charBuf, kx + side * 2, ky, kx + side * 6, ky - 4, kx + side * 2, ky + 4, PAL.armorHigh);
    rect(charBuf, fx - 3, fy - 3, 6, 3, PAL.armorHigh);
    line(charBuf, bx + side * 4, hipY + 2, kx, ky, 1, vCol);
    line(charBuf, kx, ky + 2, fx, fy - 3, 1, PAL.veinMid);
  }

  // Sculpted Torso (V-tapered broad chest + slim waist)
  for (let y = 0; y < 10; y++) { const w = 12 + Math.round((y / 10) * 3); rect(charBuf, bx - Math.floor(w / 2), waistY + y, w, 1, PAL.armorDeep); }
  for (let y = 0; y < 12; y++) { const w = 18 - Math.round((y / 12) * 5); rect(charBuf, bx - Math.floor(w / 2), chestY + y, w, 1, y < 5 ? PAL.armorMid : PAL.armorDeep); }
  if (isFront) {
    // Iconic Solo-Leveling symmetric chest & abs glowing purple filigree veins!
    line(charBuf, bx, chestY + 2, bx, hipY, 1, vCol);
    line(charBuf, bx - 6, chestY + 3, bx, chestY + 5, 1, vCol);
    line(charBuf, bx + 6, chestY + 3, bx, chestY + 5, 1, vCol);
    line(charBuf, bx - 5, chestY + 9, bx, chestY + 11, 1, PAL.veinMid);
    line(charBuf, bx + 5, chestY + 9, bx, chestY + 11, 1, PAL.veinMid);
    line(charBuf, bx - 4, waistY + 4, bx + 4, waistY + 4, 1, PAL.veinMid);
    disc(charBuf, bx, chestY + 4, 1.5, vCol); pset(charBuf, bx, chestY + 4, PAL.white);
  }

  // Segmented Neck & Massive Swept Horned Pauldrons (left & right!)
  rect(charBuf, bx - 4, neckY - 1, 8, 6, PAL.armorVoid);
  const pScale = 1 + armorSurge * 0.38;
  for (const side of [-1, 1]) {
    polyTri(charBuf, bx + side * 6, chestY + 4, bx + side * 16 * pScale, chestY - 11 * pScale, bx + side * 12, chestY + 7, PAL.armorVoid);
    polyTri(charBuf, bx + side * 7, chestY + 3, bx + side * 12 * pScale, chestY - 6 * pScale, bx + side * 11, chestY + 6, PAL.armorMid);
    line(charBuf, bx + side * 8, chestY + 2, bx + side * 16 * pScale, chestY - 11 * pScale, 1, vCol);
  }

  // Arms (left & right armored gauntlets)
  const la = pose.leftArmAngle ?? (Math.PI * 0.5 + 0.35), ra = pose.rightArmAngle ?? (Math.PI * 0.5 - 0.35);
  const lLen = pose.armExtend ?? 17, rLen = pose.backArmExtend ?? 17;
  const rHandX = bx - 9 + Math.cos(ra) * rLen, rHandY = chestY + 4 + Math.sin(ra) * rLen; // viewer's left = character's right arm
  const lHandX = bx + 9 + Math.cos(la) * lLen, lHandY = chestY + 4 + Math.sin(la) * lLen; // viewer's right = character's left arm
  line(charBuf, bx - 9, chestY + 4, rHandX, rHandY, 4.4, PAL.armorDeep); line(charBuf, bx - 9, chestY + 4, rHandX, rHandY, 1, PAL.veinMid);
  disc(charBuf, rHandX, rHandY, 2.2, PAL.armorMid);
  line(charBuf, bx + 9, chestY + 4, lHandX, lHandY, 4.4, PAL.armorDeep); line(charBuf, bx + 9, chestY + 4, lHandX, lHandY, 1, vCol);
  disc(charBuf, lHandX, lHandY, 2.2, pose.summonPalm ? PAL.cyanBright : PAL.armorMid);

  if (!isFront) paintCape();

  // Head ('S' = clear handsome front face + both violet eyes + SILVER LEFT EARRING on viewer's right; 'N' = dark layered back hair!)
  if (isFront) {
    rect(charBuf, bx - 5, headY + 1, 10, 9, PAL.skinMid);
    rect(charBuf, bx - 4, headY + 2, 8, 6, PAL.skinLight);
    rect(charBuf, bx - 4, headY + 8, 8, 2, PAL.skinShadow);
    // Both sharp violet anime eyes!
    rect(charBuf, bx - 4, headY + 3, 3, 1, PAL.hairVoid); rect(charBuf, bx + 1, headY + 3, 3, 1, PAL.hairVoid);
    rect(charBuf, bx - 4, headY + 5, 3, 2, PAL.eyeGlow); pset(charBuf, bx - 3, headY + 5, PAL.white);
    rect(charBuf, bx + 1, headY + 5, 3, 2, PAL.eyeGlow); pset(charBuf, bx + 2, headY + 5, PAL.white);
    // Confident smirk
    rect(charBuf, bx - 2, headY + 8, 4, 1, PAL.skinShadow); pset(charBuf, bx + 1, headY + 8, PAL.white);
    // Cheek armor fangs
    pset(charBuf, bx - 5, headY + 8, PAL.armorVoid); pset(charBuf, bx + 4, headY + 8, PAL.armorVoid);
    // Messy parted black anime hair + two long slender side-locks!
    rect(charBuf, bx - 7, headY - 5, 14, 6, PAL.hairVoid);
    rect(charBuf, bx - 6, headY - 7, 12, 3, PAL.hairMid);
    polyTri(charBuf, bx - 4, headY - 2, bx - 1, headY + 3, bx - 6, headY + 2, PAL.hairVoid);
    polyTri(charBuf, bx + 1, headY - 2, bx + 5, headY + 2, bx + 2, headY + 3, PAL.hairVoid);
    line(charBuf, bx - 4, headY - 6, bx + 4, headY - 6, 1, PAL.veinBright);
    line(charBuf, bx - 6, headY + 1, bx - 7, headY + 15, 1.8, PAL.hairVoid);
    line(charBuf, bx + 6, headY + 1, bx + 7, headY + 15, 1.8, PAL.hairVoid);
    // *** GLEAMING SILVER LEFT EARRING (Viewer's right = character's anatomical LEFT ear!) ***
    rect(charBuf, bx + 5, headY + 4, 2, 3, PAL.skinMid);
    pset(charBuf, bx + 6, headY + 6, PAL.silverDark); pset(charBuf, bx + 7, headY + 6, PAL.silverBright);
    pset(charBuf, bx + 6, headY + 7, PAL.silverBright); pset(charBuf, bx + 7, headY + 7, PAL.white);
    pset(charBuf, bx + 7, headY + 8, PAL.silverBright);
  } else {
    // Back of head ('N'): layered pitch-black spiky anime hair + violet crown rim, NO earring visible!
    rect(charBuf, bx - 7, headY - 5, 14, 13, PAL.hairVoid);
    rect(charBuf, bx - 6, headY - 7, 12, 4, PAL.hairMid);
    line(charBuf, bx - 4, headY - 6, bx + 4, headY - 6, 1, PAL.veinBright);
    for (let s = -2; s <= 2; s++) line(charBuf, bx + s * 3, headY + 4, bx + s * 3, headY + 11 + (s % 2) * 2, 2, PAL.hairVoid);
  }

  addMonarchAuraOutline(charBuf, 0.8 + armorSurge * 0.25, Math.round(t * 10));
  for (let i = 0; i < CW * CH; i++) if (charBuf.data[i]) vfxBuf.data[i] = charBuf.data[i];
  return { handX: rHandX, handY: rHandY, rHandX: lHandX, rHandY: lHandY, chestX: bx, chestY, headX: bx, headY, bx, by };
}

function mirrorHorizontal(buf) {
  const out = createBuffer(buf.w, buf.h);
  for (let y = 0; y < buf.h; y++)
    for (let x = 0; x < buf.w; x++)
      out.data[y * buf.w + (buf.w - 1 - x)] = buf.data[y * buf.w + x];
  return out;
}

// Render 116-frame moveset for any view ('E', 'W', 'S', 'N'):
//   0..11   (12f) : idle
//   12..23  (12f) : run
//   24..33  (10f) : dash
//   34..39  (6f)  : hit
//   40..63  (24f) : attack (3-hit combo: 0..7, 8..15, 16..23)
//   64..87  (24f) : q_cast (Hắc Ảnh Chiến Giáp + 4 tendrils)
//   88..115 (28f) : e_cast (Hắc Ảnh Triệu Hồi · Arise + Alpha Shadow Wolf)
function renderMoveFrame(view, idx) {
  if (view === 'W') {
    // Render East pose WITHOUT left earring, then mirror cleanly to West so anatomical left ear is properly occluded!
    return mirrorHorizontal(renderMoveFrameEast(idx, true));
  }
  if (view === 'E') return renderMoveFrameEast(idx, false);
  return renderMoveFrameFrontBack(view, idx);
}

function renderMoveFrameEast(idx, hideLeftEarring) {
  const buf = createBuffer(CW, CH);
  if (idx < 12) {
    const u = idx / 12, breath = Math.sin(u * Math.PI * 2);
    const body = drawMonarchEast(buf, { x: AX, y: AY, crouch: breath * 0.9, lean: 0, wind: 0.35 + breath * 0.1, rimGlow: 0.65 + breath * 0.15, armAngle: 0.85 + breath * 0.05, armExtend: 16.5, backArmAngle: 1.25, backArmExtend: 15, t: u * 2.5 }, hideLeftEarring);
    drawFangDagger(buf, body.handX, body.handY, 2.35 + breath * 0.04, { len: 22 });
    drawRosePetals(buf, AX + 2, AY - 26, 4, 40, 34, idx);
  } else if (idx < 24) {
    const k = idx - 12, u = k / 12, phase = u * Math.PI * 2;
    const body = drawMonarchEast(buf, { x: AX, y: AY - Math.abs(Math.sin(phase)) * 3.5, crouch: 2.0, lean: 6.5, wind: 1.05, rimGlow: 0.8, stride: phase, armAngle: 2.35 - Math.sin(phase) * 0.3, armExtend: 16.5, backArmAngle: 0.35 + Math.sin(phase) * 0.6, t: u * 3.5 }, hideLeftEarring);
    drawFangDagger(buf, body.handX, body.handY, 2.75, { len: 22 });
    drawRosePetals(buf, AX - 22, AY - 14, 6, 36, 20, idx);
  } else if (idx < 34) {
    const k = idx - 24;
    if (k >= 1 && k <= 7) {
      for (let g = 3; g >= 1; g--) for (let y = 56; y < 108; y += 2) for (let x = -6; x <= 6; x += 2) if ((x + y + k) % 4 !== 0) pset(buf, AX - g * 13 + x, y, g === 1 ? PAL.auraHot : g === 2 ? PAL.auraMid : PAL.auraOuter);
      line(buf, AX - 40, 66, AX + 10, 66, 1.5, PAL.cyanBright); line(buf, AX - 34, 66, AX + 6, 66, 1, PAL.white);
    }
    const body = drawMonarchEast(buf, { x: AX, y: AY, crouch: k < 8 ? 4 : 1.5, lean: k < 8 ? 9 : 3, wind: 1.5, rimGlow: 1.0, armorSurge: 0.5, armAngle: 2.6, backArmAngle: -0.1, t: k * 0.45 }, hideLeftEarring);
    drawFangDagger(buf, body.handX, body.handY, 0.05, { len: 24 });
    drawRosePetals(buf, AX - 18, AY - 24, 9, 42, 32, idx);
  } else if (idx < 40) {
    const k = idx - 34, rec = [-3, -7, -6, -4, -2, 0][k];
    const body = drawMonarchEast(buf, { x: AX + rec, y: AY, crouch: 2.5, lean: rec * 0.9, wind: 0.95, rimGlow: k < 3 ? 1.0 : 0.5, armAngle: -0.55, backArmAngle: -0.3, t: k * 0.45 }, hideLeftEarring);
    drawFangDagger(buf, body.handX, body.handY, -1.4, { len: 22 });
    if (k < 3) { line(buf, body.handX + 2, body.handY - 12, body.handX + 20, body.handY - 22, 1.8, PAL.white); line(buf, body.handX + 2, body.handY - 4, body.handX + 22, body.handY + 6, 1.6, PAL.auraPink); }
  } else if (idx < 64) {
    const k = idx - 40;
    if (k < 8) {
      const sp = k / 7, body = drawMonarchEast(buf, { x: AX - 10 + sp * 7, y: AY, crouch: 2.5, lean: 6, wind: 1.05, rimGlow: 0.95, armAngle: -1.1 + sp * 1.9, armExtend: 18, backArmAngle: 2.3, t: k * 0.4 }, hideLeftEarring);
      drawFangDagger(buf, body.handX, body.handY, -0.7 + sp * 2.1, { len: 24 });
      if (k >= 1) drawSakugaCrescent(buf, body.chestX + 18 + sp * 22, body.chestY + 5, 0, 24, 9.5, sp * 0.9, k + 10);
    } else if (k < 16) {
      const sp = (k - 8) / 7, body = drawMonarchEast(buf, { x: AX - 6 + sp * 5, y: AY, crouch: 3.0, lean: 7, wind: 1.2, rimGlow: 1.0, armorSurge: 0.4, armAngle: 1.15 - sp * 2.1, armExtend: 18, backArmAngle: -0.5 + sp * 1.2, t: k * 0.4 }, hideLeftEarring);
      drawFangDagger(buf, body.handX, body.handY, 1.3 - sp * 2.4, { len: 25 });
      if (k >= 9) {
        drawSakugaCrescent(buf, body.chestX + 22 + sp * 20, body.chestY + 2, -0.18, 26, 10.2, sp * 0.9, k + 30);
        if (sp < 0.65) { line(buf, body.chestX + 14, body.chestY - 22, body.chestX + 58, body.chestY + 24, 2.2, PAL.white); line(buf, body.chestX + 14, body.chestY + 24, body.chestX + 58, body.chestY - 22, 2.2, PAL.auraPink); }
      }
    } else {
      const sp = (k - 16) / 7, body = drawMonarchEast(buf, { x: AX - 10, y: AY, crouch: 3.2 * (1 - sp * 0.5), lean: 8 * (1 - sp * 0.5), wind: 1.45 * (1 - sp * 0.4), rimGlow: 1.0, armorSurge: 0.75 * (1 - sp * 0.5), armAngle: -0.1 + sp * 0.6, armExtend: 19, backArmAngle: 0.25 + sp * 0.5, backArmExtend: 18, t: k * 0.45 }, hideLeftEarring);
      drawFangDagger(buf, body.handX, body.handY, 0.1 + sp * 0.5, { len: 25 });
      drawFangDagger(buf, body.rHandX, body.rHandY, -0.25 + sp * 0.4, { len: 24 });
      for (const [sIdx, spread] of [[-1, -0.34], [0, 0], [1, 0.34]]) {
        const dist = 18 + sp * 46;
        drawSakugaCrescent(buf, body.chestX + Math.cos(spread) * dist, body.chestY + 4 + Math.sin(spread) * dist * 0.75, spread, 18, 7.5, 0.15 + sp * 0.78, k * 9 + sIdx);
      }
    }
  } else if (idx < 88) {
    const k = idx - 64, u = k / 23, sealR = k < 19 ? 16 + Math.sin(Math.min(1, k / 10) * Math.PI * 0.6) * 34 : 50 * (1 - (k - 18) / 6);
    drawAbyssalPortal(buf, AX, AY + 1, sealR, sealR * 0.24, k + 40, k >= 4 && k <= 19);
    const surge = k < 5 ? k / 5 : k < 19 ? 1 : (23 - k) / 4;
    const body = drawMonarchEast(buf, { x: AX, y: AY, liftY: k >= 6 && k <= 17 ? 3 : 0, crouch: k < 5 ? 4 : 0, lean: k < 5 ? -2 : 0.5, wind: 0.6 + surge * 0.9, rimGlow: 1.0, armorSurge: surge, armAngle: k < 5 ? 1.25 : k < 18 ? -0.55 : 0.65, backArmAngle: k < 5 ? 1.4 : k < 18 ? -2.55 : 1.15, t: k * 0.45 }, hideLeftEarring);
    drawFangDagger(buf, body.handX, body.handY, k < 18 ? -0.95 : 2.3, { len: 24 });
    if (k >= 4 && k <= 21) {
      const auraA = k < 17 ? 1 : (22 - k) / 5;
      line(buf, body.headX - 8, body.headY - 10, body.headX, body.headY - 16 * auraA, 1.5, PAL.veinBright);
      line(buf, body.headX + 8, body.headY - 10, body.headX, body.headY - 16 * auraA, 1.5, PAL.cyanBright);
      for (let tIdx = 0; tIdx < 4; tIdx++) {
        const dir = tIdx < 2 ? -1 : 1, baseA = (tIdx === 0 ? -2.5 : tIdx === 1 ? 2.75 : tIdx === 2 ? -0.55 : 0.42) + Math.sin(u * 12 + tIdx * 1.4) * 0.25;
        const reach = (28 + (tIdx % 2) * 14) * Math.sin(Math.min(1, (k - 3) / 6) * Math.PI * 0.55) * auraA;
        const x0 = body.chestX + dir * 4, y0 = body.chestY + 5 + (tIdx % 2) * 6, xm = x0 + Math.cos(baseA - dir * 0.38) * (reach * 0.55), ym = y0 + Math.sin(baseA - dir * 0.38) * (reach * 0.55), x1 = x0 + Math.cos(baseA) * reach, y1 = y0 + Math.sin(baseA) * reach;
        line(buf, x0, y0, xm, ym, 3.8, PAL.armorVoid); line(buf, xm, ym, x1, y1, 2.5, PAL.auraMid);
        line(buf, x0, y0, xm, ym, 1.2, PAL.veinBright); line(buf, xm, ym, x1, y1, 1.2, tIdx % 2 ? PAL.cyanBright : PAL.auraHot);
        disc(buf, x1, y1, 2.0, PAL.roseBright); pset(buf, x1, y1, PAL.white);
      }
    }
    if (k >= 6 && k <= 13) { const cr = 14 + (k - 6) * 8.5; for (let a = 0; a < Math.PI * 2; a += 0.14) pset(buf, AX + Math.cos(a) * cr, 80 + Math.sin(a) * cr * 0.78, k % 2 ? PAL.cyanBright : PAL.auraHot); }
  } else {
    const k = idx - 88, portalX = AX + 44, portalY = AY + 1;
    if (k < 8) {
      const u = k / 7, body = drawMonarchEast(buf, { x: AX - 14, y: AY, crouch: 1.5, lean: 3.5, wind: 0.55 + u * 0.6, rimGlow: 0.8 + u * 0.2, armAngle: 1.0, backArmAngle: -0.1, backArmExtend: 19, summonPalm: true, t: k * 0.4 }, hideLeftEarring);
      drawFangDagger(buf, body.handX, body.handY, 2.45, { len: 22 });
      const sx = portalX + 16 - u * 16, sy = 76 + Math.sin(u * Math.PI) * -14 + u * 34;
      disc(buf, sx, sy, 5.5 - u, PAL.auraMid); disc(buf, sx, sy, 3.0, PAL.cyanBright); disc(buf, sx, sy, 1.4, PAL.white);
      line(buf, body.rHandX, body.rHandY, sx, sy, 1.5, PAL.cyanBright);
    } else if (k < 22) {
      const pProg = Math.min(1, (k - 7) / 4); drawAbyssalPortal(buf, portalX, portalY, 28 * pProg, 8 * pProg, k + 80, true);
      const body = drawMonarchEast(buf, { x: AX - 14, y: AY, crouch: 2.0, lean: 4.5, wind: 1.25, rimGlow: 1.0, armorSurge: 0.65, armAngle: 1.1, backArmAngle: -0.25, backArmExtend: 19, summonPalm: true, t: k * 0.45 }, hideLeftEarring);
      drawFangDagger(buf, body.handX, body.handY, 2.5, { len: 22 });
      const rise = Math.min(1, (k - 8) / 5); drawAlphaWolf(buf, portalX - 4 + rise * 6, portalY + (1 - rise) * 20 - 4, 0.92, rise * 0.9, k);
    } else {
      const cProg = 1 - (k - 21) / 6; if (cProg > 0.1) drawAbyssalPortal(buf, portalX, portalY, 26 * cProg, 7 * cProg, k + 80, false);
      const body = drawMonarchEast(buf, { x: AX - 14 + (1 - cProg) * 14, y: AY, crouch: 2 * cProg, lean: 4 * cProg, wind: 0.5, rimGlow: 0.6, armAngle: 0.85, backArmAngle: 1.2, t: k * 0.35 }, hideLeftEarring);
      drawFangDagger(buf, body.handX, body.handY, 2.35, { len: 22 });
      drawAlphaWolf(buf, portalX + 2 + (1 - cProg) * 10, AY - 4, 0.92, 0.55, k);
    }
  }
  return buf;
}

function renderMoveFrameFrontBack(view, idx) {
  const buf = createBuffer(CW, CH), isS = view === 'S', aimA = isS ? Math.PI * 0.5 : -Math.PI * 0.5;
  if (idx < 12) {
    const u = idx / 12, breath = Math.sin(u * Math.PI * 2);
    const body = drawMonarchFrontBack(buf, view, { x: AX, y: AY, crouch: breath * 0.9, wind: 0.35 + breath * 0.1, t: u * 2.5 });
    drawFangDagger(buf, body.handX, body.handY, isS ? 2.15 : -2.2, { len: 22 });
    drawRosePetals(buf, AX, AY - 28, 4, 48, 36, idx);
  } else if (idx < 24) {
    const k = idx - 12, u = k / 12, phase = u * Math.PI * 2;
    const body = drawMonarchFrontBack(buf, view, { x: AX, y: AY - Math.abs(Math.sin(phase)) * 3.5, crouch: 2.0, wind: 1.0, stride: phase, t: u * 3.5 });
    drawFangDagger(buf, body.handX, body.handY, isS ? 2.2 : -2.2, { len: 22 });
    drawRosePetals(buf, AX, AY - 16, 6, 42, 24, idx);
  } else if (idx < 34) {
    const k = idx - 24;
    if (k >= 1 && k <= 7) for (let g = 2; g >= 1; g--) for (let y = 56; y < 108; y += 2) for (let x = -8; x <= 8; x += 2) pset(buf, AX + x, y + (isS ? -g * 8 : g * 8), g === 1 ? PAL.auraHot : PAL.auraOuter);
    const body = drawMonarchFrontBack(buf, view, { x: AX, y: AY, crouch: 3.5, wind: 1.4, armorSurge: 0.5, t: k * 0.45 });
    drawFangDagger(buf, body.handX, body.handY, aimA, { len: 24 });
    drawRosePetals(buf, AX, AY - 24, 9, 48, 34, idx);
  } else if (idx < 40) {
    const k = idx - 34, rec = [-2, -5, -4, -3, -1, 0][k];
    const body = drawMonarchFrontBack(buf, view, { x: AX, y: AY + (isS ? rec : -rec), crouch: 2.5, wind: 0.9, rightArmAngle: -0.6, leftArmAngle: -2.5, t: k * 0.45 });
    drawFangDagger(buf, body.handX, body.handY, -0.4, { len: 22 });
  } else if (idx < 64) {
    const k = idx - 40, sp = (k % 8) / 7, hitNo = Math.floor(k / 8);
    const body = drawMonarchFrontBack(buf, view, { x: AX, y: AY, crouch: 2.5, wind: 1.15, armorSurge: hitNo * 0.35, rightArmAngle: isS ? 0.5 + sp * 2.0 : -2.5 + sp * 2.0, leftArmAngle: isS ? 2.6 - sp * 1.8 : -0.6 - sp * 1.8, t: k * 0.45 });
    drawFangDagger(buf, body.handX, body.handY, aimA + (sp - 0.5) * 1.6, { len: 24 });
    if (hitNo === 2) drawFangDagger(buf, body.rHandX, body.rHandY, aimA - (sp - 0.5) * 1.6, { len: 24 });
    const spreads = hitNo === 2 ? [-0.36, 0, 0.36] : [0];
    for (const spread of spreads) {
      const dist = 16 + sp * 32;
      drawSakugaCrescent(buf, AX + Math.cos(aimA + spread) * dist, body.chestY + 8 + Math.sin(aimA + spread) * dist * 0.72, aimA + spread, hitNo === 2 ? 18 : 24, hitNo === 2 ? 7.5 : 9.5, sp * 0.9, k + 20);
    }
  } else if (idx < 88) {
    const k = idx - 64, u = k / 23, sealR = k < 19 ? 16 + Math.sin(Math.min(1, k / 10) * Math.PI * 0.6) * 34 : 50 * (1 - (k - 18) / 6);
    drawAbyssalPortal(buf, AX, AY + 1, sealR, sealR * 0.24, k + 40, k >= 4 && k <= 19);
    const surge = k < 5 ? k / 5 : k < 19 ? 1 : (23 - k) / 4;
    const body = drawMonarchFrontBack(buf, view, { x: AX, y: AY, liftY: k >= 6 && k <= 17 ? 3 : 0, crouch: k < 5 ? 4 : 0, wind: 0.6 + surge * 0.9, armorSurge: surge, rightArmAngle: k < 18 ? 2.4 : 1.9, leftArmAngle: k < 18 ? 0.7 : 1.2, t: k * 0.45 });
    drawFangDagger(buf, body.handX, body.handY, isS ? 2.1 : -2.1, { len: 24 });
    if (k >= 4 && k <= 21) {
      const auraA = k < 17 ? 1 : (22 - k) / 5;
      for (let tIdx = 0; tIdx < 4; tIdx++) {
        const dir = tIdx < 2 ? -1 : 1, baseA = (tIdx === 0 ? -2.5 : tIdx === 1 ? 2.75 : tIdx === 2 ? -0.55 : 0.42) + Math.sin(u * 12 + tIdx * 1.4) * 0.25;
        const reach = (28 + (tIdx % 2) * 14) * Math.sin(Math.min(1, (k - 3) / 6) * Math.PI * 0.55) * auraA;
        const x0 = AX + dir * 6, y0 = body.chestY + 5 + (tIdx % 2) * 6, xm = x0 + Math.cos(baseA - dir * 0.38) * (reach * 0.55), ym = y0 + Math.sin(baseA - dir * 0.38) * (reach * 0.55), x1 = x0 + Math.cos(baseA) * reach, y1 = y0 + Math.sin(baseA) * reach;
        line(buf, x0, y0, xm, ym, 3.8, PAL.armorVoid); line(buf, xm, ym, x1, y1, 2.5, PAL.auraMid);
        line(buf, x0, y0, xm, ym, 1.2, PAL.veinBright); line(buf, xm, ym, x1, y1, 1.2, tIdx % 2 ? PAL.cyanBright : PAL.auraHot);
        disc(buf, x1, y1, 2.0, PAL.roseBright); pset(buf, x1, y1, PAL.white);
      }
    }
  } else {
    const k = idx - 88, u = k / 27, pProg = k < 8 ? u * 2 : k < 22 ? 1 : 1 - (k - 21) / 6;
    drawAbyssalPortal(buf, AX, AY + 2, 34 * Math.min(1, pProg), 9 * Math.min(1, pProg), k + 80, k >= 6 && k < 22);
    const body = drawMonarchFrontBack(buf, view, { x: AX, y: AY, crouch: 1.5, wind: 1.0, armorSurge: k >= 8 && k < 22 ? 0.65 : 0.2, leftArmAngle: -0.7, summonPalm: true, t: k * 0.45 });
    drawFangDagger(buf, body.handX, body.handY, isS ? 2.15 : -2.15, { len: 22 });
    disc(buf, body.rHandX, body.rHandY - 2, 4.0, PAL.cyanBright); pset(buf, body.rHandX, body.rHandY - 2, PAL.white);
    if (k >= 9 && k < 24) drawAlphaWolf(buf, AX + 24, AY - 2, 0.85, 0.65, k);
  }
  return buf;
}

// 64-Frame Ultimate R ("Bách Quỷ Dạ Hành")
function renderUltFrame(k) {
  const buf = createBuffer(CW, CH);
  if (k < 14) {
    const u = (k + 1) / 14;
    drawAbyssalPortal(buf, AX, AY + 2, 18 + u * 34, 5 + u * 8, k + 100, true);
    const body = drawMonarchEast(buf, { x: AX, y: AY, liftY: u * 6, crouch: 0.5, lean: -1.5, wind: 0.5 + u * 1.2, rimGlow: 0.8 + u * 0.2, armorSurge: u * 0.85, armAngle: 2.35, backArmAngle: -0.65, backArmExtend: 18, summonPalm: true, t: k * 0.45 }, false);
    drawFangDagger(buf, body.handX, body.handY, 1.57, { len: 24 });
    for (let i = 0; i < 40; i++) {
      const baseA = (i / 40) * Math.PI * 2 + u * 2.4 + hash(i * 17) * 0.3, wave = (hash(i * 29) * 0.45 + u * 0.95) % 1;
      const r = Math.max(4, (1 - wave) * 62 * (1 - Math.max(0, u - 0.72) * 1.6));
      const sx = body.chestX + Math.cos(baseA) * r * 1.15, sy = body.chestY + 4 + Math.sin(baseA) * r * 0.82;
      line(buf, sx, sy, body.chestX + Math.cos(baseA - 0.2) * (r + 10) * 1.15, body.chestY + 4 + Math.sin(baseA - 0.2) * (r + 10) * 0.82, 1.5, i % 4 === 0 ? PAL.cyanBright : i % 4 === 1 ? PAL.auraHot : i % 4 === 2 ? PAL.auraPink : PAL.white);
      disc(buf, sx, sy, 1.5, PAL.white);
    }
    if (u > 0.45) { const coreR = (u - 0.45) * 18; disc(buf, body.chestX + 2, body.chestY + 4, coreR + 2, PAL.auraMid); disc(buf, body.chestX + 2, body.chestY + 4, coreR * 0.65, PAL.cyanBright); disc(buf, body.chestX + 2, body.chestY + 4, coreR * 0.35, PAL.white); }
  } else if (k < 26) {
    const s = k - 14, u = s / 11;
    drawAbyssalPortal(buf, AX, AY + 3, 52, 12, k + 130, true);
    const beamW = Math.sin(u * Math.PI) * 24 + 8;
    for (let y = 0; y < AY + 2; y += 2) for (let x = -beamW; x <= beamW; x += 2) {
      const ax = Math.abs(x) / beamW;
      if (ax < 0.28) pset(buf, AX + x, y, PAL.white); else if (ax < 0.58) pset(buf, AX + x, y, PAL.auraHot); else if ((x + y) & 2) pset(buf, AX + x, y, PAL.auraOuter);
    }
    const wingSpan = 26 + Math.min(1, (s + 1) / 5) * 34;
    for (let side of [-1, 1]) for (let f = 0; f < 6; f++) {
      const wa = side < 0 ? Math.PI + 0.65 - f * 0.24 : -0.65 + f * 0.24, wLen = wingSpan * (1 - f * 0.11);
      const wx0 = AX + side * 5, wy0 = 70 + f * 3, wx1 = wx0 + Math.cos(wa) * wLen, wy1 = wy0 + Math.sin(wa) * wLen - 10;
      line(buf, wx0, wy0, wx1, wy1, 5.2 - f * 0.5, PAL.armorVoid);
      line(buf, wx0, wy0 - 1.5, wx1, wy1 - 1.5, 1.8, f % 2 === 0 ? PAL.auraHot : PAL.cyanBright);
    }
    const body = drawMonarchFrontBack(buf, 'S', { x: AX, y: AY, liftY: 8 + Math.sin(u * Math.PI) * 3, crouch: 0, wind: 1.4, armorSurge: 1.0, rightArmAngle: 2.1, leftArmAngle: 0.9, summonPalm: true, t: k * 0.5 });
    drawFangDagger(buf, body.handX, body.handY, 2.3, { len: 25 });
    const cy = body.headY - 12;
    line(buf, body.headX - 14, cy, body.headX + 14, cy, 1.5, PAL.cyanBright);
    line(buf, body.headX, cy - 11, body.headX, cy + 8, 1.5, PAL.white);
    disc(buf, body.headX, cy, 3.2, PAL.auraHot); pset(buf, body.headX, cy, PAL.white);
  } else if (k < 38) {
    const s = k - 26;
    drawAbyssalPortal(buf, AX, AY + 3, 54 + s * 1.4, 13, k + 160, true);
    const body = drawMonarchEast(buf, { x: AX - 10, y: AY, liftY: 4, crouch: s >= 10 ? 4 : 1, lean: s >= 10 ? -3 : 1, wind: 1.45, rimGlow: 1.0, armorSurge: 1.0, armAngle: -1.48 - (s >= 10 ? 0.25 : 0), armExtend: 18.5, backArmAngle: 0.35, t: k * 0.5 }, false);
    drawFangDagger(buf, body.handX, body.handY, -1.55, { len: 26 });
    const tipX = body.handX, tipY = body.handY - 24;
    disc(buf, tipX, tipY, 5.2, PAL.auraHot); disc(buf, tipX, tipY, 2.8, PAL.white);
    for (let i = 0; i < 6; i++) {
      const ang = -2.6 + i * 0.42 + Math.sin(k + i * 1.3) * 0.14;
      const m1x = tipX + Math.cos(ang + 0.25) * 14, m1y = tipY + Math.sin(ang + 0.25) * 14;
      const m2x = tipX + Math.cos(ang - 0.22) * 28, m2y = tipY + Math.sin(ang - 0.22) * 28;
      line(buf, tipX, tipY, m1x, m1y, 1.8, i % 3 === 0 ? PAL.cyanBright : i % 3 === 1 ? PAL.auraHot : PAL.auraPink);
      line(buf, m1x, m1y, m2x, m2y, 1.2, PAL.white);
    }
    drawRosePetals(buf, AX, 74, 14, 62, 54, k);
  } else if (k < 54) {
    const s = k - 38, phase = s / 15;
    drawAbyssalPortal(buf, AX + 6, AY + 4, 66, 13, k + 200, true);
    drawAbyssalDragon(buf, 58 + phase * 58, 38 - Math.sin(phase * Math.PI) * 8, 1.12, k);
    const body = drawMonarchEast(buf, { x: 34, y: AY, crouch: 4.0, lean: 7.5, wind: 1.65, rimGlow: 1.0, armorSurge: 1.0, armAngle: 0.02, armExtend: 19, backArmAngle: 2.35, t: k * 0.55 }, false);
    drawFangDagger(buf, body.handX, body.handY, 0.02, { len: 26 });
    const w1x = 58 + phase * 68, w2x = 42 + phase * 56;
    if (w1x < 142) drawAlphaWolf(buf, w1x, 110, 1.02, 0.85, k + 1);
    if (s >= 3 && w2x < 138) drawAlphaWolf(buf, w2x, 116, 0.88, 0.65, k + 7);
    if (phase < 0.88) drawSakugaCrescent(buf, 68 + phase * 44, 72, 0, 38, 13.5, phase * 0.95, k + 260);
    drawRosePetals(buf, 78 + phase * 30, 74, 22, 96, 76, k + 340);
  } else {
    const s = k - 54, u = s / 9;
    if (s < 6) drawAbyssalPortal(buf, AX, AY + 2, 52 * (1 - s / 6), 10 * (1 - s / 6), k + 310, false);
    const body = drawMonarchEast(buf, { x: 34 + Math.round(u * (AX - 34)), y: AY, crouch: 3.5 * (1 - u), lean: 6.5 * (1 - u), wind: 1.1 * (1 - u * 0.65), rimGlow: 0.95 * (1 - u * 0.3), armorSurge: Math.max(0, 1 - u * 1.3), armAngle: 0.1 + u * 0.75, armExtend: 18.5 - u * 2, backArmAngle: 1.25, t: k * 0.4 }, false);
    if (s < 6) drawFangDagger(buf, body.handX, body.handY, s * 1.35, { len: 24, dissolve: s / 6 });
    else drawFangDagger(buf, body.handX, body.handY, 2.35, { len: 22 });
    drawRosePetals(buf, body.handX + 12, body.handY - u * 14, Math.round(20 * (1 - u * 0.75)), 64, 52, k + 450);
  }
  return buf;
}

function blitRGBA(rgba, imgW, buf, ox, oy) {
  for (let y = 0; y < buf.h; y++) {
    const rowOff = (oy + y) * imgW;
    for (let x = 0; x < buf.w; x++) {
      const hex = buf.data[y * buf.w + x];
      if (!hex) continue;
      const c = RGB_CACHE[hex] || (RGB_CACHE[hex] = hexToRgb(hex));
      const p = (rowOff + ox + x) * 4;
      rgba[p] = c[0]; rgba[p + 1] = c[1]; rgba[p + 2] = c[2]; rgba[p + 3] = 255; // strict binary alpha 255!
    }
  }
}

async function extractConceptAssets(source) {
  const b64 = fs.readFileSync(source).toString('base64');
  const { chromium } = require('../runtime/qa-tools/node_modules/playwright');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    return await page.evaluate(async (dataUrl) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
      const W = img.naturalWidth, H = img.naturalHeight;

      // 1. Portrait (Left Bust Panel: crisp 256x256 square centered on handsome face, silver left earring & horned pauldrons!)
      const pCan = document.createElement('canvas'); pCan.width = 256; pCan.height = 256;
      const pCtx = pCan.getContext('2d');
      pCtx.imageSmoothingEnabled = false;
      const cropSize = Math.min(Math.floor(W * 0.54), H);
      const sx = Math.floor(W * 0.01), sy = 0;
      pCtx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, 256, 256);

      // 2. Full-Body Transparent Keyart (Right Panel: strict pure-black outer flood-fill so pitch-black armor stays 100% solid!)
      const rX = Math.floor(W * 0.575), rW = W - rX, rH = H;
      const kCan = document.createElement('canvas'); kCan.width = rW; kCan.height = rH;
      const kCtx = kCan.getContext('2d');
      kCtx.drawImage(img, rX, 0, rW, rH, 0, 0, rW, rH);
      const id = kCtx.getImageData(0, 0, rW, rH);
      const d = id.data;
      const visited = new Uint8Array(rW * rH);
      const queue = new Int32Array(rW * rH);
      let qh = 0, qt = 0;
      // Pure JPEG black background is <= (5, 5, 6); living armor dark tones stay 100% solid!
      const isBg = (idx) => {
        const p = idx * 4;
        return d[p] <= 5 && d[p + 1] <= 5 && d[p + 2] <= 6;
      };
      const push = (x, y) => {
        if (x < 0 || y < 0 || x >= rW || y >= rH) return;
        const idx = y * rW + x;
        if (visited[idx] || !isBg(idx)) return;
        visited[idx] = 1; queue[qt++] = idx;
      };
      for (let x = 0; x < rW; x++) { push(x, 0); push(x, rH - 1); }
      for (let y = 0; y < rH; y++) { push(0, y); push(rW - 1, y); }
      while (qh < qt) {
        const cur = queue[qh++], cx = cur % rW, cy = (cur - cx) / rW;
        d[cur * 4 + 3] = 0;
        push(cx + 1, cy); push(cx - 1, cy); push(cx, cy + 1); push(cx, cy - 1);
      }
      // Enforce strict binary alpha (0 or 255)
      for (let i = 0; i < rW * rH; i++) {
        d[i * 4 + 3] = d[i * 4 + 3] > 0 ? 255 : 0;
      }
      kCtx.putImageData(id, 0, 0);

      // Trim transparent border tightly around full-body keyart
      let minX = rW, maxX = 0, minY = rH, maxY = 0;
      for (let y = 0; y < rH; y++) for (let x = 0; x < rW; x++) {
        if (d[(y * rW + x) * 4 + 3] === 255) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      const tw = Math.max(1, maxX - minX + 1), th = Math.max(1, maxY - minY + 1);
      const tCan = document.createElement('canvas'); tCan.width = tw; tCan.height = th;
      tCan.getContext('2d').drawImage(kCan, minX, minY, tw, th, 0, 0, tw, th);

      return {
        portrait: pCan.toDataURL('image/png'),
        keyart: tCan.toDataURL('image/png'),
        tw, th
      };
    }, 'data:image/jpeg;base64,' + b64);
  } finally {
    await browser.close();
  }
}

(async () => {
  // node tools/build-quanle-monarch.cjs [concept-sheet.jpg]
  // ponytail: Portrait and key art use the optional JPEG until a shareable source sheet ships.
  const source = process.argv[2];
  const concept = source ? await extractConceptAssets(source) : null;
  // 1. Build 4-direction 116-frame moveset PNG (464 frames total, 20 cols x 24 rows = 3040 x 3072 RGBA strict binary alpha!)
  const VIEWS = ['S', 'E', 'N', 'W'];
  const M_PER_VIEW = 116;
  const M_COLS = 20, M_ROWS = Math.ceil((VIEWS.length * M_PER_VIEW) / M_COLS); // 24 rows
  const MW = M_COLS * CW, MH = M_ROWS * CH;
  const mRgba = Buffer.alloc(MW * MH * 4, 0);
  for (let vi = 0; vi < VIEWS.length; vi++) {
    const view = VIEWS[vi];
    for (let f = 0; f < M_PER_VIEW; f++) {
      const globalIdx = vi * M_PER_VIEW + f;
      const col = globalIdx % M_COLS, row = Math.floor(globalIdx / M_COLS);
      const buf = renderMoveFrame(view, f);
      blitRGBA(mRgba, MW, buf, col * CW, row * CH);
    }
  }
  const movesPath = path.join(ASSETS, 'quanle-monarch-moves.png');
  fs.writeFileSync(movesPath, encodeRGBA(MW, MH, mRgba));
  console.log(`Saved ${movesPath} (${MW}x${MH}, ${(fs.statSync(movesPath).size / 1024).toFixed(1)} KB)`);

  // 2. Build 64-frame R_ULT ("Bách Quỷ Dạ Hành") PNG (8 cols x 8 rows = 1216 x 1024 RGBA strict binary alpha!)
  const U_COLS = 8, U_ROWS = 8, UW = U_COLS * CW, UH = U_ROWS * CH;
  const uRgba = Buffer.alloc(UW * UH * 4, 0);
  for (let k = 0; k < 64; k++) {
    const col = k % U_COLS, row = Math.floor(k / U_COLS);
    blitRGBA(uRgba, UW, renderUltFrame(k), col * CW, row * CH);
  }
  const ultPath = path.join(ASSETS, 'quanle-monarch-r.png');
  fs.writeFileSync(ultPath, encodeRGBA(UW, UH, uRgba));
  console.log(`Saved ${ultPath} (${UW}x${UH}, ${(fs.statSync(ultPath).size / 1024).toFixed(1)} KB)`);

  if (concept) {
    fs.writeFileSync(path.join(ASSETS, 'quanle-monarch-portrait.png'), Buffer.from(concept.portrait.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(ASSETS, 'quanle-monarch-keyart.png'), Buffer.from(concept.keyart.split(',')[1], 'base64'));
    console.log(`Saved portrait (256x256) and transparent key art (${concept.tw}x${concept.th})`);
  }
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
