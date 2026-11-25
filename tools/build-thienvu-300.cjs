'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const ARTIFACT_DIR = path.join(ROOT, 'runtime', 'thienvu-art');

// ============================================================================
// ZERO-DEPENDENCY LOSSLESS 8-BIT INDEXED PNG ENCODER (STRICT BINARY ALPHA!)
// ============================================================================
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
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

// Canonical Master Palette matching assets/thien-vu-v04.png (Silver-Charcoal Hair, Gold Filigree, 8 Robes & 8 Weapons!)
const PAL_LIST = [
  '#000000', // 0 = transparent!
  // Ink, Dark Pants, Silver-Charcoal Hair & Skin
  '#07050f', '#121526', '#1e243d', '#2f3859', '#4a5680',
  '#7a88ab', '#aebbd9', '#dce5fa', '#ffffff',
  '#8c584c', '#bd8271', '#e6ad99', '#ffe0d1',
  // Metallic Gold Trim & Ornate Weapon Hilts
  '#593a0e', '#99681b', '#d99f2b', '#ffd257', '#fff3b8',
  // 0. ORIGIN (Nguyên Bản · Thất Linh Hợp Nhất — Royal Indigo-Navy Robe + Golden Scarf + 7 Gems!)
  '#16204a', '#253980', '#3b57bd', '#6384f2', '#a8c2ff',
  // 1. LIGHTNING (Lôi Ảnh — Cobalt-Violet Dragon-Pauldron Coat + Jagged Violet-Cyan Sword!)
  '#1b1452', '#332696', '#5b47e0', '#8f7dff', '#c7beff', '#5ce1ff',
  // 2. WIND (Thiên Phong — Jade-Teal & White Silk-Ribbon Robe + Ornate Jade War Fan!)
  '#0d3b38', '#196e67', '#2ba89c', '#5ce0d0', '#b8fff6',
  // 3. EARTH (Nham Giáp — Bronze-Basalt Armor, Crimson Sash + Twin Molten-Gold Rock Gauntlets!)
  '#29160a', '#4f2c14', '#824b22', '#bd7433', '#f0a346', '#ff5917',
  // 4. FIRE (Xích Diệm — Crimson-Gold Martial Coat, Flame-Tipped Hair + Twin Blazing Chakrams!)
  '#450909', '#851310', '#cc2418', '#ff5a19', '#ff9c24', '#ffe866',
  // 5. ICE (Băng Tinh — Glacier-Sapphire Fur-Collar Coat, Crystal Crown + Colossal Ice Warhammer!)
  '#082447', '#12498a', '#227bd4', '#52b4ff', '#a8dfff', '#e8f8ff',
  // 6. NATURE (Linh Mộc — Forest-Emerald Tunic, Wooden Deer Antlers + Spiked Briar-Blossom Whip!)
  '#0c2e17', '#195c2d', '#2d9948', '#59d66f', '#a6faad', '#ff75a8',
  // 7. LIGHT (Thái Dương — Sovereign White-Gold Vestments, 12-Ray Sun Halo + Golden Sun-Wheel!)
  '#6e470b', '#b37919', '#f2ae2e', '#ffd95e', '#fff2a6', '#f5eedc'
];

const PAL_INDEX = new Map();
const PAL_RGB = PAL_LIST.map((h, i) => {
  PAL_INDEX.set(h.toLowerCase(), i);
  return hexToRgb(h);
});
function colIdx(hex) {
  const idx = PAL_INDEX.get(hex.toLowerCase());
  if (idx === undefined) throw new Error('Unregistered palette color: ' + hex);
  return idx;
}

function encodeIndexedPNG(width, height, indices) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 3;
  const plte = Buffer.alloc(PAL_LIST.length * 3);
  for (let i = 0; i < PAL_LIST.length; i++) {
    plte[i * 3] = PAL_RGB[i][0];
    plte[i * 3 + 1] = PAL_RGB[i][1];
    plte[i * 3 + 2] = PAL_RGB[i][2];
  }
  const trns = Buffer.from([0]);
  const stride = width + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    indices.copy(raw, y * stride + 1, y * width, (y + 1) * width);
  }
  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('PLTE', plte), pngChunk('tRNS', trns), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

const CW = 96, CH = 84;
const AX = 48, AY = 72;
const SCOLS = 30, SROWS = 30;

// Canonical 8 Forms matching assets/thien-vu-v04.png 1-to-1!
const FORMS = [
  {
    id: 'origin', name: 'Nguyên Bản', title: 'Thất Linh Hợp Nhất', weaponName: 'Thất Linh Tâm Ấn',
    robe: ['#16204a', '#253980', '#3b57bd', '#6384f2', '#ffd257', '#fff3b8'],
    vfx:  ['#16204a', '#3b57bd', '#d99f2b', '#ffd257', '#fff3b8', '#ffffff'],
    eye: '#6384f2'
  },
  {
    id: 'lightning', name: 'Lôi', title: 'Lôi Ảnh', weaponName: 'Lôi Ảnh Răng Cưa Kiếm',
    robe: ['#1b1452', '#253980', '#3b57bd', '#8f7dff', '#ffd257', '#5ce1ff'],
    vfx:  ['#1b1452', '#332696', '#5b47e0', '#8f7dff', '#5ce1ff', '#ffffff'],
    eye: '#5ce1ff'
  },
  {
    id: 'wind', name: 'Phong', title: 'Thiên Phong', weaponName: 'Thiên Phong Ngọc Phiến',
    robe: ['#0d3b38', '#196e67', '#2ba89c', '#5ce0d0', '#ffd257', '#ffffff'],
    vfx:  ['#0d3b38', '#196e67', '#2ba89c', '#5ce0d0', '#b8fff6', '#ffffff'],
    eye: '#5ce0d0'
  },
  {
    id: 'earth', name: 'Thổ', title: 'Nham Giáp', weaponName: 'Song Quyền Nham Giáp',
    robe: ['#29160a', '#4f2c14', '#824b22', '#bd7433', '#f0a346', '#ffd257'],
    vfx:  ['#29160a', '#4f2c14', '#bd7433', '#ff5917', '#ffd257', '#ffffff'],
    eye: '#f0a346'
  },
  {
    id: 'fire', name: 'Hỏa', title: 'Xích Diệm', weaponName: 'Xích Diệm Song Luân',
    robe: ['#450909', '#851310', '#cc2418', '#ff5a19', '#ffd257', '#ffe866'],
    vfx:  ['#450909', '#851310', '#cc2418', '#ff5a19', '#ff9c24', '#ffffff'],
    eye: '#ff5a19'
  },
  {
    id: 'ice', name: 'Băng', title: 'Băng Tinh', weaponName: 'Băng Tinh Cự Chùy',
    robe: ['#082447', '#12498a', '#227bd4', '#52b4ff', '#e8f8ff', '#ffffff'],
    vfx:  ['#082447', '#12498a', '#227bd4', '#52b4ff', '#a8dfff', '#ffffff'],
    eye: '#52b4ff'
  },
  {
    id: 'nature', name: 'Mộc', title: 'Linh Mộc', weaponName: 'Linh Mộc Đằng Tiên',
    robe: ['#0c2e17', '#195c2d', '#2d9948', '#59d66f', '#d99f2b', '#ff75a8'],
    vfx:  ['#0c2e17', '#195c2d', '#2d9948', '#59d66f', '#a6faad', '#ffffff'],
    eye: '#59d66f'
  },
  {
    id: 'light', name: 'Quang', title: 'Thái Dương', weaponName: 'Thái Dương Nhật Luân',
    robe: ['#99681b', '#d99f2b', '#f5eedc', '#ffffff', '#ffd95e', '#fff2a6'],
    vfx:  ['#6e470b', '#b37919', '#f2ae2e', '#ffd95e', '#fff2a6', '#ffffff'],
    eye: '#ffd95e'
  }
];

const C = {
  ink: colIdx('#07050f'),
  pants0: colIdx('#121526'),
  pants1: colIdx('#1e243d'),
  pants2: colIdx('#2f3859'),
  hair0: colIdx('#1e243d'),
  hair1: colIdx('#4a5680'),
  hair2: colIdx('#7a88ab'),
  hair3: colIdx('#aebbd9'),
  hair4: colIdx('#dce5fa'),
  white: colIdx('#ffffff'),
  skin0: colIdx('#8c584c'),
  skin1: colIdx('#bd8271'),
  skin2: colIdx('#e6ad99'),
  skin3: colIdx('#ffe0d1'),
  gold0: colIdx('#593a0e'),
  gold1: colIdx('#99681b'),
  gold2: colIdx('#d99f2b'),
  gold3: colIdx('#ffd257'),
  gold4: colIdx('#fff3b8'),
  pink: colIdx('#ff75a8'),
  crimson: colIdx('#cc2418'),
  magma: colIdx('#ff5917'),
  flame: colIdx('#ff9c24'),
  flameTip: colIdx('#ffe866'),
  cyan: colIdx('#5ce1ff')
};
for (const f of FORMS) {
  f.rIdx = f.robe.map(colIdx);
  f.vIdx = f.vfx.map(colIdx);
  f.eyeIdx = colIdx(f.eye);
}
const GEM_RING = ['#8f7dff', '#5ce0d0', '#f0a346', '#ff5a19', '#52b4ff', '#59d66f', '#ffd95e'].map(colIdx);

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

function makeBuf(w = CW, h = CH) { return { w, h, d: new Uint8Array(w * h) }; }
function pset(b, x, y, c) {
  x = Math.round(x); y = Math.round(y);
  if (x < 1 || y < 1 || x >= b.w - 1 || y >= b.h - 1 || !c) return;
  b.d[y * b.w + x] = c;
}
function rect(b, x, y, w, h, c) {
  const x0 = Math.max(1, Math.round(x)), y0 = Math.max(1, Math.round(y));
  const x1 = Math.min(b.w - 2, Math.round(x + w - 1)), y1 = Math.min(b.h - 2, Math.round(y + h - 1));
  for (let py = y0; py <= y1; py++) {
    const off = py * b.w;
    for (let px = x0; px <= x1; px++) b.d[off + px] = c;
  }
}
function disc(b, cx, cy, r, c) {
  const r2 = r * r;
  const x0 = Math.max(1, Math.floor(cx - r)), x1 = Math.min(b.w - 2, Math.ceil(cx + r));
  const y0 = Math.max(1, Math.floor(cy - r)), y1 = Math.min(b.h - 2, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    const dy2 = (y - cy) * (y - cy), off = y * b.w;
    for (let x = x0; x <= x1; x++) if ((x - cx) * (x - cx) + dy2 <= r2) b.d[off + x] = c;
  }
}
function capsule(b, x0, y0, x1, y1, r0, r1, c) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.7));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    disc(b, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, c);
  }
}
function polyTri(b, x0, y0, x1, y1, x2, y2, c) {
  const minX = Math.max(1, Math.floor(Math.min(x0, x1, x2)));
  const maxX = Math.min(b.w - 2, Math.ceil(Math.max(x0, x1, x2)));
  const minY = Math.max(1, Math.floor(Math.min(y0, y1, y2)));
  const maxY = Math.min(b.h - 2, Math.ceil(Math.max(y0, y1, y2)));
  const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(area) < 0.01) return;
  for (let y = minY; y <= maxY; y++) {
    const off = y * b.w;
    for (let x = minX; x <= maxX; x++) {
      const w0 = ((x1 - x) * (y2 - y) - (x2 - x) * (y1 - y)) / area;
      const w1 = ((x2 - x) * (y0 - y) - (x0 - x) * (y2 - y)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) b.d[off + x] = c;
    }
  }
}
function outlineBuf(b, inkCol, rimCol, glow = 0) {
  const w = b.w, h = b.h, orig = Uint8Array.from(b.d);
  const d4 = [[-1,0],[1,0],[0,-1],[0,1]];
  for (let y = 2; y < h - 2; y++) {
    const off = y * w;
    for (let x = 2; x < w - 2; x++) {
      if (orig[off + x]) continue;
      let hit = false, top = false;
      for (const [dx, dy] of d4) if (orig[(y + dy) * w + (x + dx)]) { hit = true; if (dy === 1) top = true; }
      if (hit) b.d[off + x] = (glow > 0.45 && (top || ((x + y) & 1) === 0)) ? rimCol : inkCol;
    }
  }
}

// ============================================================================
// VOLUMETRIC PIXEL SAKUGA VFX PRIMITIVES
// ============================================================================
function drawVolumetricPlume(b, cx, cy, rx, ry, vIdx, intensity = 1, seed = 1, swirl = 0) {
  const nCols = vIdx.length;
  const x0 = Math.max(1, Math.floor(cx - rx - 3)), x1 = Math.min(b.w - 2, Math.ceil(cx + rx + 3));
  const y0 = Math.max(1, Math.floor(cy - ry - 3)), y1 = Math.min(b.h - 2, Math.ceil(cy + ry + 3));
  for (let y = y0; y <= y1; y++) {
    const off = y * b.w;
    for (let x = x0; x <= x1; x++) {
      const nx = (x - cx) / Math.max(1, rx), ny = (y - cy) / Math.max(1, ry);
      const turb = Math.sin(Math.atan2(ny, nx) * 5 + seed * 0.7 + swirl) * 0.14 + Math.cos(nx * 6 - ny * 6 + seed) * 0.10;
      const d = Math.hypot(nx, ny) + turb;
      if (d > 1.05) continue;
      const heat = (1 - d / 1.05) * intensity + (BAYER[y & 3][x & 3] / 16 - 0.5) * 0.22;
      if (heat <= 0.08) continue;
      b.d[off + x] = vIdx[Math.min(nCols - 1, Math.max(0, Math.floor(heat * nCols)))];
    }
  }
}

function drawGroundVortex(b, cx, cy, rx, ry, vIdx, phase = 0, spikes = true) {
  const nCols = vIdx.length;
  const x0 = Math.max(1, Math.floor(cx - rx - 2)), x1 = Math.min(b.w - 2, Math.ceil(cx + rx + 2));
  const y0 = Math.max(1, Math.floor(cy - ry - 2)), y1 = Math.min(b.h - 2, Math.ceil(cy + ry + 2));
  for (let y = y0; y <= y1; y++) {
    const off = y * b.w;
    for (let x = x0; x <= x1; x++) {
      const nx = (x - cx) / Math.max(1, rx), ny = (y - cy) / Math.max(1, ry), d = Math.hypot(nx, ny);
      if (d > 1.06 || d < 0.22) continue;
      const wave = Math.sin(d * 14 - phase * 4 + Math.atan2(ny, nx) * 3);
      const heat = (d > 0.78 ? 0.92 : 0.55) + wave * 0.25 + (BAYER[y & 3][x & 3] / 32 - 0.25);
      if (heat < 0.24) continue;
      b.d[off + x] = vIdx[Math.min(nCols - 1, Math.max(0, Math.floor(heat * nCols)))];
    }
  }
  if (spikes) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + phase * 0.8;
      const sx = cx + Math.cos(a) * rx * 0.88, sy = cy + Math.sin(a) * ry * 0.88, h = 5 + (i % 3) * 3;
      polyTri(b, sx - 2.5, sy, sx, sy - h, sx + 2.5, sy, vIdx[nCols - 2]);
      polyTri(b, sx - 1.2, sy, sx, sy - h + 1, sx + 1.2, sy, C.white);
    }
  }
}

function drawVolumetricCrescent(b, ox, oy, aimA, rad, thick, vIdx, dissolve = 0, span = 1.55, seed = 1) {
  const nCols = vIdx.length;
  const x0 = Math.max(1, Math.floor(ox - rad - thick - 5)), x1 = Math.min(b.w - 2, Math.ceil(ox + rad + thick + 5));
  const y0 = Math.max(1, Math.floor(oy - rad - thick - 5)), y1 = Math.min(b.h - 2, Math.ceil(oy + rad + thick + 5));
  for (let y = y0; y <= y1; y++) {
    const off = y * b.w;
    for (let x = x0; x <= x1; x++) {
      const dx = x - ox, dy = y - oy, r = Math.hypot(dx, dy);
      let da = Math.atan2(dy, dx) - aimA;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > span) continue;
      const lt = thick * Math.pow(1 - Math.abs(da) / span, 0.58);
      const jag = Math.sin(da * 11 - seed * 0.9) * 2.0 + Math.cos(r * 0.45 + da * 7) * 1.2;
      const dist = Math.abs(r - (rad + jag * 0.55));
      if (dist > lt) continue;
      const heat = (1 - dist / Math.max(0.9, lt) + (r >= rad ? 0.18 : -0.06)) * (1 - dissolve * 0.78)
                 + (BAYER[y & 3][x & 3] / 16 - 0.5) * 0.24;
      if (heat <= 0.14) continue;
      b.d[off + x] = vIdx[Math.min(nCols - 1, Math.max(0, Math.floor(heat * nCols)))];
    }
  }
}

function drawVolumetricSpire(b, cx, by, w, h, tilt, vIdx, isIce = false) {
  const tx = cx + tilt, ty = by - h;
  polyTri(b, cx - w, by, tx, ty, cx + w * 0.15, by, vIdx[isIce ? 3 : 2]);
  polyTri(b, cx + w * 0.15, by, tx, ty, cx + w, by, vIdx[isIce ? 1 : 0]);
  polyTri(b, cx - w * 0.45, by, tx, ty, cx + w * 0.18, by, vIdx[4]);
  polyTri(b, cx - w * 0.12, by - h * 0.25, tx, ty, cx + w * 0.08, by - h * 0.35, C.white);
  drawVolumetricPlume(b, cx, by - 2, w * 1.15, 4.5, vIdx, 0.85, Math.round(cx + h));
}

function drawVolumetricTornado(b, cx, by, h, baseR, topR, vIdx, phase) {
  const rings = Math.max(5, Math.floor(h / 4.5));
  for (let i = 0; i <= rings; i++) {
    const u = i / rings, ry = by - u * h, rr = baseR + (topR - baseR) * Math.pow(u, 0.85);
    const rx = cx + Math.sin(phase * 3 + u * 5.5) * (2.5 + u * 3);
    drawVolumetricPlume(b, rx, ry, rr, Math.max(2.8, rr * 0.36), vIdx, 0.72 + u * 0.28, i + Math.round(phase * 5), phase * 2);
  }
}

function drawVolumetricPlasma(b, x0, y0, x1, y1, thick, vIdx, seed) {
  const segs = 8, pts = [[x0, y0]];
  const nx = -(y1 - y0), ny = (x1 - x0), nl = Math.max(1, Math.hypot(nx, ny));
  for (let i = 1; i < segs; i++) {
    const u = i / segs, jag = ((i & 1) ? 1 : -1) * (3.5 + hash(i * 37 + seed * 13) * 5.0);
    pts.push([x0 + (x1 - x0) * u + (nx / nl) * jag, y0 + (y1 - y0) * u + (ny / nl) * jag]);
  }
  pts.push([x1, y1]);
  for (let i = 0; i < pts.length; i += 2) {
    drawVolumetricPlume(b, pts[i][0], pts[i][1], thick * 3.6 + 4, thick * 3.0 + 4, [vIdx[0], vIdx[1], vIdx[2], vIdx[3]], 0.82, seed + i);
  }
  for (let i = 0; i < segs; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const sx = -(by - ay), sy = (bx - ax), sl = Math.max(1, Math.hypot(sx, sy));
    const hw = Math.max(1.2, thick * (1.25 - (i / segs) * 0.35));
    const ox = (sx / sl) * hw, oy = (sy / sl) * hw;
    polyTri(b, ax - ox * 1.7, ay - oy * 1.7, bx + ox * 1.7, by + oy * 1.7, ax + ox * 1.7, ay + oy * 1.7, vIdx[3]);
    polyTri(b, ax - ox * 1.7, ay - oy * 1.7, bx - ox * 1.7, by - oy * 1.7, bx + ox * 1.7, by + oy * 1.7, vIdx[4]);
    capsule(b, ax, ay, bx, by, Math.max(0.9, hw * 0.58), Math.max(0.8, hw * 0.5), C.white);
    if (i % 2 === 1 && i < segs - 1) {
      const side = (i % 4 === 1) ? 1 : -1;
      const fx = bx + (nx / nl) * side * 10 + (x1 - x0) * 0.14;
      const fy = by + (ny / nl) * side * 10 + (y1 - y0) * 0.14;
      polyTri(b, bx - 1.4, by - 1.4, fx, fy, bx + 1.4, by + 1.4, C.gold3);
      capsule(b, bx, by, (bx + fx) * 0.6, (by + fy) * 0.6, 0.8, 0.5, C.white);
    }
  }
}

function drawStarFlare(b, cx, cy, rad, vIdx, rot = 0) {
  drawVolumetricPlume(b, cx, cy, rad * 0.78, rad * 0.78, vIdx, 1.0, Math.round(rot * 10));
  for (let i = 0; i < 4; i++) {
    const a = rot + (i * Math.PI) / 2, r = i % 2 === 0 ? rad * 1.35 : rad * 0.95;
    const nx = -Math.sin(a) * 2.4, ny = Math.cos(a) * 2.4;
    polyTri(b, cx + nx, cy + ny, cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx - nx, cy - ny, vIdx[4]);
    polyTri(b, cx + nx * 0.45, cy + ny * 0.45, cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82, cx - nx * 0.45, cy - ny * 0.45, C.white);
  }
}

function drawVolumetricVine(b, x0, y0, x1, y1, waveAmp, vIdx, phase) {
  const steps = 16, dx = x1 - x0, dy = y1 - y0, len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len, ny = dx / len;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, w = Math.sin(u * Math.PI * 2.5 - phase * 3) * waveAmp * Math.sin(u * Math.PI);
    const vx = x0 + dx * u + nx * w, vy = y0 + dy * u + ny * w, r = (1 - u * 0.55) * 3.8 + 1.0;
    disc(b, vx, vy + 1, r, vIdx[0]);
    disc(b, vx, vy, r * 0.85, vIdx[2]);
    disc(b, vx - 0.6, vy - 0.7, r * 0.45, vIdx[4]);
    if (i > 2 && i % 3 === 0) {
      const side = (i % 6 === 0) ? 1 : -1;
      polyTri(b, vx, vy, vx + nx * side * 6.5 + dx * 0.06, vy + ny * side * 6.5 + dy * 0.06, vx + dx * 0.08, vy + dy * 0.08, i % 6 === 0 ? C.pink : vIdx[4]);
    }
  }
  drawVolumetricPlume(b, x1, y1, 6.2, 6.2, [vIdx[1], vIdx[3], C.pink, vIdx[4], C.white], 1.0, Math.round(phase * 7));
}

// ============================================================================
// HIGH-DETAIL BESPOKE HELD WEAPONS RENDERER (ALL 8 ORNATE SACRED WEAPONS!)
// Faithfully modeled after weapons-random-review_front.png & thienvu-vfx-pixel.png
// ============================================================================
function drawRing(b, cx, cy, rOuter, rInner, cOuter, cInner = 0) {
  const ro2 = rOuter * rOuter, ri2 = rInner * rInner;
  const x0 = Math.max(1, Math.floor(cx - rOuter - 1)), x1 = Math.min(b.w - 2, Math.ceil(cx + rOuter + 1));
  const y0 = Math.max(1, Math.floor(cy - rOuter - 1)), y1 = Math.min(b.h - 2, Math.ceil(cy + rOuter + 1));
  for (let y = y0; y <= y1; y++) {
    const dy2 = (y - cy) * (y - cy), off = y * b.w;
    for (let x = x0; x <= x1; x++) {
      const d2 = (x - cx) * (x - cx) + dy2;
      if (d2 <= ro2 && d2 >= ri2) {
        b.d[off + x] = (cInner && d2 <= (rInner + (rOuter - rInner) * 0.48) ** 2) ? cInner : cOuter;
      }
    }
  }
}

function drawBlossom(b, cx, cy, r, petalCol, coreCol) {
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.4;
    disc(b, cx + Math.cos(a) * r * 0.65, cy + Math.sin(a) * r * 0.65, Math.max(0.9, r * 0.52), petalCol);
  }
  pset(b, cx, cy, coreCol);
}

function drawHeldWeapon(b, formId, hx, hy, angle, scale = 1, phase = 0, offHandX = null, offHandY = null) {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const nx = -sa, ny = ca;

  if (formId === 'origin') {
    // 0. THẤT LINH TÂM ẤN (Ornate 8-Pointed Golden Celestial Astrolabe inlaid with 7 Faceted Elemental Gems!)
    const cx = hx + ca * 8.5 * scale, cy = hy + sa * 8.5 * scale, R = 8.2 * scale;
    for (let i = 0; i < 8; i++) {
      const a = phase * 0.8 + (i * Math.PI) / 4;
      const tipR = R + (i % 2 === 0 ? 4.8 : 2.8) * scale;
      polyTri(b, cx + Math.cos(a - 0.18) * R * 0.82, cy + Math.sin(a - 0.18) * R * 0.82, cx + Math.cos(a) * tipR, cy + Math.sin(a) * tipR, cx + Math.cos(a + 0.18) * R * 0.82, cy + Math.sin(a + 0.18) * R * 0.82, i % 2 === 0 ? C.gold3 : C.gold4);
    }
    drawRing(b, cx, cy, R, R * 0.66, C.gold2, C.gold3);
    disc(b, cx, cy, R * 0.64, colIdx('#16204a'));
    // 4 Fine Golden Astrolabe Crosshairs
    for (let i = 0; i < 4; i++) {
      const a = phase * 0.8 + (i * Math.PI) / 2;
      capsule(b, cx + Math.cos(a) * R * 0.25, cy + Math.sin(a) * R * 0.25, cx + Math.cos(a) * R * 0.64, cy + Math.sin(a) * R * 0.64, 0.55 * scale, 0.55 * scale, C.gold2);
    }
    // 7 Distinct Elemental Gems + Luminous Star Core!
    for (let g = 0; g < 7; g++) {
      const ga = -phase * 1.2 + (g * Math.PI * 2) / 7;
      disc(b, cx + Math.cos(ga) * R * 0.48, cy + Math.sin(ga) * R * 0.48, Math.max(1.0, 1.35 * scale), GEM_RING[g]);
    }
    disc(b, cx, cy, 2.0 * scale, C.gold4);
    pset(b, cx, cy, C.white);
  }
  else if (formId === 'lightning') {
    // 1. LÔI ẢNH RĂNG CƯA KIẾM (Broad Serrated Saw-Tooth Thunder Greatsword with Knuckle-Bow Guard!)
    const len = 25 * scale;
    // Pommel, Grip & Knuckle-Bow D-Guard (matching weapons-random-review_front.png #1!)
    capsule(b, hx - ca * 5 * scale, hy - sa * 5 * scale, hx + ca * 2.5 * scale, hy + sa * 2.5 * scale, 1.5 * scale, 1.6 * scale, C.gold1);
    disc(b, hx - ca * 5.5 * scale, hy - sa * 5.5 * scale, 2.1 * scale, C.gold3);
    capsule(b, hx - ca * 3 * scale + nx * 3.2 * scale, hy - sa * 3 * scale + ny * 3.2 * scale, hx + ca * 3 * scale + nx * 4.5 * scale, hy + sa * 3 * scale + ny * 4.5 * scale, 0.9 * scale, 1.1 * scale, C.gold2);
    polyTri(b, hx + ca * 2 * scale, hy + sa * 2 * scale, hx + ca * 0.5 * scale + nx * 6.8 * scale, hy + sa * 0.5 * scale + ny * 6.8 * scale, hx + ca * 5 * scale + nx * 2.5 * scale, hy + sa * 5 * scale + ny * 2.5 * scale, C.gold3);
    polyTri(b, hx + ca * 2 * scale, hy + sa * 2 * scale, hx + ca * 0.5 * scale - nx * 5.8 * scale, hy + sa * 0.5 * scale - ny * 5.8 * scale, hx + ca * 5 * scale - nx * 2.2 * scale, hy + sa * 5 * scale - ny * 2.2 * scale, C.gold2);
    // Broad Beveled Blade Body + Angular Cleaver-Point Tip!
    const tipX = hx + ca * len, tipY = hy + sa * len;
    polyTri(b, hx + ca * 3.5 * scale - nx * 3.2 * scale, hy + sa * 3.5 * scale - ny * 3.2 * scale, hx + ca * (len - 4 * scale) - nx * 3.8 * scale, hy + sa * (len - 4 * scale) - ny * 3.8 * scale, tipX, tipY, colIdx('#332696'));
    polyTri(b, hx + ca * 3.5 * scale - nx * 3.2 * scale, hy + sa * 3.5 * scale - ny * 3.2 * scale, tipX, tipY, hx + ca * 3.5 * scale + nx * 2.4 * scale, hy + sa * 3.5 * scale + ny * 2.4 * scale, colIdx('#5b47e0'));
    // 4 Aggressive Forward-Raked Saw-Teeth along the upper spine!
    for (let t = 0; t < 4; t++) {
      const d0 = (5.0 + t * 4.4) * scale, d1 = d0 + 3.8 * scale;
      const b0x = hx + ca * d0, b0y = hy + sa * d0;
      const b1x = hx + ca * d1, b1y = hy + sa * d1;
      const tx = hx + ca * (d0 + 2.8 * scale) + nx * 5.8 * scale, ty = hy + sa * (d0 + 2.8 * scale) + ny * 5.8 * scale;
      polyTri(b, b0x, b0y, tx, ty, b1x, b1y, colIdx('#8f7dff'));
      capsule(b, b0x + nx * 1.5 * scale, b0y + ny * 1.5 * scale, tx, ty, 0.7 * scale, 0.5 * scale, C.cyan);
    }
    // Glowing White-Cyan Fuller Conduit + Lower Razor Edge!
    capsule(b, hx + ca * 4.5 * scale - nx * 2.6 * scale, hy + sa * 4.5 * scale - ny * 2.6 * scale, hx + ca * (len - 3.5 * scale) - nx * 3.0 * scale, hy + sa * (len - 3.5 * scale) - ny * 3.0 * scale, 0.75 * scale, 0.65 * scale, C.cyan);
    capsule(b, hx + ca * 4.5 * scale, hy + sa * 4.5 * scale, tipX - ca * 1.5 * scale, tipY - sa * 1.5 * scale, 0.95 * scale, 0.55 * scale, C.white);
  }
  else if (formId === 'wind') {
    // 2. THIÊN PHONG NGỌC PHIẾN (Wide Graceful Pleated Jade War Fan with 7 Gold Ribs & Swirl Crest!)
    const R = 16.0 * scale, fanSpan = 1.18;
    capsule(b, hx - ca * 3.5 * scale, hy - sa * 3.5 * scale, hx + ca * 2 * scale, hy + sa * 2 * scale, 1.5 * scale, 1.8 * scale, C.gold1);
    disc(b, hx - ca * 4 * scale, hy - sa * 4 * scale, 1.8 * scale, C.gold3);
    const segs = 12;
    for (let i = 0; i < segs; i++) {
      const u0 = (i / segs) * 2 - 1, u1 = ((i + 1) / segs) * 2 - 1;
      const a0 = angle + u0 * fanSpan, a1 = angle + u1 * fanSpan;
      const r0 = R * (1 - 0.08 * u0 * u0), r1 = R * (1 - 0.08 * u1 * u1);
      polyTri(b, hx, hy, hx + Math.cos(a0) * r0, hy + Math.sin(a0) * r0, hx + Math.cos(a1) * r1, hy + Math.sin(a1) * r1, i % 2 === 0 ? colIdx('#196e67') : colIdx('#2ba89c'));
      polyTri(b, hx + Math.cos(a0) * r0 * 0.55, hy + Math.sin(a0) * r0 * 0.55, hx + Math.cos(a0) * r0 * 0.85, hy + Math.sin(a0) * r0 * 0.85, hx + Math.cos(a1) * r1 * 0.85, hy + Math.sin(a1) * r1 * 0.85, colIdx('#5ce0d0'));
      polyTri(b, hx + Math.cos(a0) * r0 * 0.83, hy + Math.sin(a0) * r0 * 0.83, hx + Math.cos(a0) * r0, hy + Math.sin(a0) * r0, hx + Math.cos(a1) * r1, hy + Math.sin(a1) * r1, colIdx('#b8fff6'));
    }
    for (let i = 0; i <= 6; i++) {
      const u = (i / 6) * 2 - 1, a = angle + u * fanSpan, rr = R * (1 - 0.08 * u * u);
      capsule(b, hx, hy, hx + Math.cos(a) * rr * 0.96, hy + Math.sin(a) * rr * 0.96, 0.65 * scale, 0.5 * scale, C.gold3);
    }
    // Central Jade Wind-Eye Crest!
    const cx = hx + ca * R * 0.54, cy = hy + sa * R * 0.54;
    drawRing(b, cx, cy, 3.2 * scale, 1.4 * scale, C.white, colIdx('#b8fff6'));
    pset(b, cx, cy, C.gold3);
  }
  else if (formId === 'earth') {
    // 3. SONG QUYỀN NHAM GIÁP (Twin Angular Polygonal Carved Basalt & Molten-Magma War Gauntlets!)
    const hands = [[hx, hy, angle, 1]];
    if (offHandX !== null && offHandY !== null) hands.push([offHandX, offHandY, angle + 0.15, -1]);
    for (const [gx, gy, ga, chirality] of hands) {
      const gca = Math.cos(ga), gsa = Math.sin(ga), gnx = -gsa * chirality, gny = gca * chirality;
      // Heavy Golden Wrist Cuff
      capsule(b, gx - gca * 3.5 * scale - gnx * 3.5 * scale, gy - gsa * 3.5 * scale - gny * 3.5 * scale, gx - gca * 3.5 * scale + gnx * 3.5 * scale, gy - gsa * 3.5 * scale + gny * 3.5 * scale, 1.8 * scale, 1.8 * scale, C.gold2);
      // Angular Hexagonal Basalt Armor Plates (NOT round circles!)
      const p0x = gx - gca * 3 * scale - gnx * 5.2 * scale, p0y = gy - gsa * 3 * scale - gny * 5.2 * scale;
      const p1x = gx - gca * 3 * scale + gnx * 5.2 * scale, p1y = gy - gsa * 3 * scale + gny * 5.2 * scale;
      const p2x = gx + gca * 5.5 * scale + gnx * 6.0 * scale, p2y = gy + gsa * 5.5 * scale + gny * 6.0 * scale;
      const p3x = gx + gca * 7.5 * scale, p3y = gy + gsa * 7.5 * scale;
      const p4x = gx + gca * 5.5 * scale - gnx * 6.0 * scale, p4y = gy + gsa * 5.5 * scale - gny * 6.0 * scale;
      polyTri(b, p0x, p0y, p1x, p1y, p3x, p3y, colIdx('#4f2c14'));
      polyTri(b, p1x, p1y, p2x, p2y, p3x, p3y, colIdx('#824b22'));
      polyTri(b, p0x, p0y, p3x, p3y, p4x, p4y, colIdx('#29160a'));
      // Raised Beveled Bronze Dorsal Plate
      polyTri(b, gx - gca * 1.5 * scale - gnx * 3.2 * scale, gy - gsa * 1.5 * scale - gny * 3.2 * scale, gx - gca * 1.5 * scale + gnx * 3.8 * scale, gy - gsa * 1.5 * scale + gny * 3.8 * scale, gx + gca * 5.0 * scale, gy + gsa * 5.0 * scale, colIdx('#bd7433'));
      // 4 Jagged Crag Knuckle Claws + Articulated Thumb!
      for (let k = -1.5; k <= 1.5; k += 1) {
        const kx = gx + gca * 5.2 * scale + gnx * k * 2.9 * scale;
        const ky = gy + gsa * 5.2 * scale + gny * k * 2.9 * scale;
        polyTri(b, kx - gnx * 1.4 * scale, ky - gny * 1.4 * scale, kx + gca * 4.5 * scale, ky + gsa * 4.5 * scale, kx + gnx * 1.4 * scale, ky + gny * 1.4 * scale, k < 0 ? C.gold2 : C.gold3);
      }
      // Thumb Armor Guard
      capsule(b, gx + gnx * 4.8 * scale, gy + gny * 4.8 * scale, gx + gca * 3.5 * scale + gnx * 6.5 * scale, gy + gsa * 3.5 * scale + gny * 6.5 * scale, 1.6 * scale, 1.2 * scale, colIdx('#f0a346'));
      // Glowing Molten Magma Core & Fissure Lines!
      capsule(b, gx - gca * 1 * scale, gy - gsa * 1 * scale, gx + gca * 4 * scale, gy + gsa * 4 * scale, 1.3 * scale, 0.8 * scale, C.magma);
      disc(b, gx + gca * 1.2 * scale, gy + gsa * 1.2 * scale, 2.0 * scale, C.magma);
      pset(b, gx + gca * 1.2 * scale, gy + gsa * 1.2 * scale, C.gold4);
    }
  }
  else if (formId === 'fire') {
    // 4. XÍCH DIỆM SONG LUÂN (Twin Open-Ring 10-Tooth Blazing Sun-Flame Chakrams!)
    const wheels = [[hx + ca * 5.5 * scale, hy + sa * 5.5 * scale]];
    if (offHandX !== null && offHandY !== null) wheels.push([offHandX - ca * 1.5 * scale, offHandY + 1]);
    for (const [wx, wy] of wheels) {
      const R = 7.4 * scale;
      for (let i = 0; i < 10; i++) {
        const a = phase * 3 + (i * Math.PI * 2) / 10;
        polyTri(b, wx + Math.cos(a - 0.18) * R * 0.84, wy + Math.sin(a - 0.18) * R * 0.84, wx + Math.cos(a + 0.18) * (R + 3.6 * scale), wy + Math.sin(a + 0.18) * (R + 3.6 * scale), wx + Math.cos(a + 0.28) * R * 0.84, wy + Math.sin(a + 0.28) * R * 0.84, i % 2 ? colIdx('#ff5a19') : C.flameTip);
      }
      drawRing(b, wx, wy, R, R * 0.50, C.crimson, C.gold3);
      // Golden Diametric Grip Bar across hollow center!
      capsule(b, wx - nx * R * 0.58, wy - ny * R * 0.58, wx + nx * R * 0.58, wy + ny * R * 0.58, 1.0 * scale, 1.0 * scale, C.gold4);
      disc(b, wx, wy, 1.5 * scale, C.flameTip);
    }
  }
  else if (formId === 'ice') {
    // 5. BĂNG TINH CỰ CHÙY (Angular Faceted Hexagonal Glacier Crystal Warhammer + Rear Frost Spike!)
    const shaftLen = 19 * scale;
    const headX = hx + ca * shaftLen, headY = hy + sa * shaftLen;
    // Ornate Frost-Silver Long Polearm Shaft + Gold Collar Rings
    capsule(b, hx - ca * 6.5 * scale, hy - sa * 6.5 * scale, headX + ca * 2 * scale, headY + sa * 2 * scale, 1.5 * scale, 1.7 * scale, colIdx('#12498a'));
    capsule(b, hx - ca * 5.5 * scale, hy - sa * 5.5 * scale, headX, headY, 0.75 * scale, 0.85 * scale, colIdx('#a8dfff'));
    disc(b, hx - ca * 7 * scale, hy - sa * 7 * scale, 2.0 * scale, C.gold3);
    // Angular Faceted Glacier Mallet Face on Front Side (+nx) + Sharp Rear Ice-Pick Fluke (-nx)!
    const fx = headX + nx * 9.5 * scale, fy = headY + ny * 9.5 * scale;
    const bx0 = headX - nx * 9.5 * scale, by0 = headY - ny * 9.5 * scale;
    // Front polygonal crystal hammer block
    polyTri(b, headX - ca * 3.8 * scale, headY - sa * 3.8 * scale, headX + ca * 4.2 * scale, headY + sa * 4.2 * scale, fx + ca * 5.2 * scale, fy + sa * 5.2 * scale, colIdx('#227bd4'));
    polyTri(b, headX - ca * 3.8 * scale, headY - sa * 3.8 * scale, fx + ca * 5.2 * scale, fy + sa * 5.2 * scale, fx - ca * 5.2 * scale, fy - sa * 5.2 * scale, colIdx('#12498a'));
    // Bright beveled crystal strike face & upper facet!
    polyTri(b, headX + ca * 1.2 * scale, headY + sa * 1.2 * scale, fx + ca * 4.8 * scale, fy + sa * 4.8 * scale, fx - ca * 1.5 * scale, fy - sa * 1.5 * scale, colIdx('#a8dfff'));
    capsule(b, fx - ca * 4.5 * scale, fy - sa * 4.5 * scale, fx + ca * 4.5 * scale, fy + sa * 4.5 * scale, 1.1 * scale, 1.1 * scale, C.white);
    // Sharp Rear Glacier Pick Spike (-nx)
    polyTri(b, headX - ca * 3.2 * scale, headY - sa * 3.2 * scale, bx0 - ca * 1.5 * scale, by0 - sa * 1.5 * scale, headX + ca * 3.0 * scale, headY + sa * 3.0 * scale, colIdx('#52b4ff'));
    polyTri(b, headX, headY, bx0 - ca * 1.5 * scale, by0 - sa * 1.5 * scale, headX + ca * 2.5 * scale, headY + sa * 2.5 * scale, colIdx('#e8f8ff'));
    // Top Spear Finial Spike + Golden Socket Crown!
    polyTri(b, headX + nx * 2.5 * scale, headY + ny * 2.5 * scale, headX + ca * 8.2 * scale, headY + sa * 8.2 * scale, headX - nx * 2.5 * scale, headY - ny * 2.5 * scale, C.white);
    disc(b, headX, headY, 2.3 * scale, C.gold3);
    pset(b, headX, headY, C.white);
  }
  else if (formId === 'nature') {
    // 6. LINH MỘC ĐẰNG TIÊN (Carved Briar-Wood Hilt + Coiling Spiral Thorn-Vine Whip with Leaf-Blade Tip & 4-Petal Blossoms!)
    capsule(b, hx - ca * 4 * scale, hy - sa * 4 * scale, hx + ca * 2.5 * scale, hy + sa * 2.5 * scale, 1.8 * scale, 2.1 * scale, C.gold1);
    // Leaf-Guard Crosspiece
    polyTri(b, hx + ca * 2 * scale, hy + sa * 2 * scale, hx + ca * 0.5 * scale + nx * 5.2 * scale, hy + sa * 0.5 * scale + ny * 5.2 * scale, hx + ca * 4 * scale + nx * 1.5 * scale, hy + sa * 4 * scale + ny * 1.5 * scale, colIdx('#59d66f'));
    polyTri(b, hx + ca * 2 * scale, hy + sa * 2 * scale, hx + ca * 0.5 * scale - nx * 5.2 * scale, hy + sa * 0.5 * scale - ny * 5.2 * scale, hx + ca * 4 * scale - nx * 1.5 * scale, hy + sa * 4 * scale - ny * 1.5 * scale, colIdx('#2d9948'));
    // Graceful S-Curve + Spiral Whip Lash (matching weapons-random-review_front.png #6!)
    const segs = 14;
    let px = hx + ca * 3 * scale, py = hy + sa * 3 * scale;
    let prevX = hx, prevY = hy;
    for (let s = 1; s <= segs; s++) {
      const u = s / segs;
      const reach = (3 + u * 18) * scale;
      const curl = u > 0.65 ? Math.sin((u - 0.65) / 0.35 * Math.PI * 1.6) * 6.5 * scale : Math.sin(u * Math.PI * 2.2 - phase * 2.5) * 4.5 * scale * u;
      const liftCurl = u > 0.72 ? -Math.cos((u - 0.72) / 0.28 * Math.PI * 1.4) * 4.2 * scale : 0;
      const qx = hx + ca * (reach + liftCurl) + nx * curl;
      const qy = hy + sa * (reach + liftCurl) + ny * curl;
      const r = Math.max(0.75, (1.9 - u * 1.15) * scale);
      capsule(b, px, py, qx, qy, r, r * 0.9, s % 2 ? colIdx('#195c2d') : colIdx('#2d9948'));
      pset(b, (px + qx) * 0.5, (py + qy) * 0.5 - 0.5, colIdx('#a6faad'));
      // Sharp Briar Thorns along whip!
      if (s % 3 === 1 && s < segs) {
        const side = (s % 2 === 0) ? 1 : -1;
        polyTri(b, px, py, qx + nx * side * 3.8 * scale, qy + ny * side * 3.8 * scale, qx, qy, colIdx('#a6faad'));
      }
      // Delicate 4-Petal Spirit Blossoms along vine (NOT at the nose!)
      if (s === 5 || s === 10) {
        drawBlossom(b, qx + nx * (s === 5 ? -2.8 : 2.8) * scale, qy + ny * (s === 5 ? -2.8 : 2.8) * scale, 2.2 * scale, C.pink, C.white);
      }
      prevX = px; prevY = py; px = qx; py = qy;
    }
    // Razor-Sharp Emerald Leaf-Spear Whip Tip!
    const tdx = px - prevX, tdy = py - prevY, tl = Math.max(0.5, Math.hypot(tdx, tdy));
    const ux = tdx / tl, uy = tdy / tl;
    polyTri(b, px - uy * 2.2 * scale, py + ux * 2.2 * scale, px + ux * 5.2 * scale, py + uy * 5.2 * scale, px + uy * 2.2 * scale, py - ux * 2.2 * scale, colIdx('#59d66f'));
    capsule(b, px, py, px + ux * 4.2 * scale, py + uy * 4.2 * scale, 0.7 * scale, 0.4 * scale, colIdx('#a6faad'));
  }
  else if (formId === 'light') {
    // 7. THÁI DƯƠNG NHẬT LUÂN (Open-Center 8-Spiked Sovereign Golden Sun-Wheel matching weapons-random-review_front.png #7!)
    const cx = hx + ca * 9 * scale, cy = hy + sa * 9 * scale, R = 8.4 * scale;
    for (let i = 0; i < 8; i++) {
      const a = phase * 1.6 + (i * Math.PI) / 4;
      const spikeLen = R + (i % 2 === 0 ? 5.6 : 4.0) * scale;
      polyTri(b, cx + Math.cos(a - 0.17) * R * 0.88, cy + Math.sin(a - 0.17) * R * 0.88, cx + Math.cos(a) * spikeLen, cy + Math.sin(a) * spikeLen, cx + Math.cos(a + 0.17) * R * 0.88, cy + Math.sin(a + 0.17) * R * 0.88, i % 2 === 0 ? C.gold3 : C.white);
      pset(b, cx + Math.cos(a) * (R + 1.5 * scale), cy + Math.sin(a) * (R + 1.5 * scale), C.white);
    }
    // Crisp Open Hollow Sun Ring (no cluttered inner spokes!)
    drawRing(b, cx, cy, R, R * 0.62, C.gold2, C.gold4);
    drawRing(b, cx, cy, R * 0.84, R * 0.70, C.white, C.gold4);
  }
}

// ============================================================================
// CANONICAL THIÊN VŨ CHARACTER SCULPT (MATCHING assets/thien-vu-v04.png 1-TO-1!)
// ============================================================================
function drawCanonicalThienVu(charBuf, form, view, pose) {
  const r = form.rIdx;
  const bx = AX + (pose.dx || 0);
  const by = AY + (pose.dy || 0) - (pose.lift || 0);
  const lean = view === 'E' ? (pose.lean || 0) : (pose.lean || 0) * 0.25;
  const stride = pose.stride;
  const crouch = pose.crouch || 0;
  const armAngle = pose.armAngle ?? 0.28;
  const raiseLeft = pose.raiseLeft || 0;
  const phase = pose.phase || 0;

  const hipX = bx + lean * 0.35, hipY = by - 16 + crouch;
  const chestX = hipX + lean * 0.65, chestY = hipY - 12 + crouch * 0.3;
  const headX = chestX + (view === 'E' ? 1.0 : 0), headY = chestY - 11;

  // 0. Back Halo / Flowing Celestial Scarf Streamers (matching thien-vu-v04.png!)
  if (form.id === 'light') {
    // Blazing 12-Rayed Golden Sun Halo behind head!
    const hx0 = headX - (view === 'E' ? 2 : 0), hy0 = headY - 2;
    for (let i = 0; i < 12; i++) {
      const a = phase * 0.8 + (i * Math.PI) / 6;
      polyTri(charBuf, hx0 + Math.cos(a - 0.14) * 9.5, hy0 + Math.sin(a - 0.14) * 9.5, hx0 + Math.cos(a) * 13.5, hy0 + Math.sin(a) * 13.5, hx0 + Math.cos(a + 0.14) * 9.5, hy0 + Math.sin(a + 0.14) * 9.5, i % 2 ? C.gold3 : C.gold4);
    }
    disc(charBuf, hx0, hy0, 10.2, C.gold3);
    disc(charBuf, hx0, hy0, 8.2, C.ink);
  }
  if (['origin', 'wind', 'light', 'fire', 'nature'].includes(form.id)) {
    // Flowing Scarf / Silk / Leaf-Vine Ribbons streaming behind shoulders!
    const ribCol = form.id === 'wind' ? C.white : form.id === 'origin' ? C.gold3 : form.id === 'light' ? C.gold4 : r[3];
    const ribShadow = form.id === 'origin' ? r[2] : r[1];
    for (const side of [-1, 1]) {
      const sx0 = chestX + (view === 'E' ? -3 : side * 6), sy0 = chestY - 3;
      const sx1 = sx0 + (view === 'E' ? -15 - side * 3 : side * 14) + Math.sin(phase * 2 + side) * 3;
      const sy1 = sy0 + 5 + Math.cos(phase * 2 + side) * 3.5;
      polyTri(charBuf, sx0, sy0 - 2, sx1, sy1, sx0, sy0 + 3, side > 0 ? ribCol : ribShadow);
    }
  }

  // 1. Split Flowing Martial Coat Tails (Áo Giao Lĩnh / Chiến Bào Lower Hem with Gold Trim!)
  for (const side of [-1, 1]) {
    const tx0 = hipX + (view === 'E' ? (side > 0 ? 2 : -3) : side * 4.5);
    const tx1 = tx0 + (view === 'E' ? (side > 0 ? 4 : -9) : side * 8.5) + Math.sin(phase + side) * 1.5;
    polyTri(charBuf, tx0 - 3, hipY - 2, tx1, by - 4, tx0 + 3, hipY - 2, side > 0 ? r[2] : r[1]);
    capsule(charBuf, tx0 + (side > 0 ? 2 : -2), hipY, tx1, by - 4, 0.9, 0.8, C.gold3); // gold coat border!
  }

  // 2. Dark Martial Trousers & Gold-Greaved Boots!
  for (const [legIdx, side] of [-1, 1].entries()) {
    const lx = hipX + (view === 'E' ? 0 : side * 4.2);
    let fx = lx, fy = by;
    if (stride !== null && stride !== undefined) {
      const ph = stride + (legIdx === 1 ? Math.PI : 0);
      if (view === 'E') { fx = lx + Math.sin(ph) * 8.5; fy = by - Math.max(0, Math.cos(ph) * 4.5); }
      else { fx = lx + side * 0.8; fy = by - Math.max(0, Math.sin(ph) * 4.5); }
    } else if (crouch > 1) {
      fx += view === 'E' ? (legIdx === 1 ? 5 : -5) : side * 2.5;
    }
    const kx = (lx + fx) * 0.5 + (view === 'E' ? 1.5 : 0), ky = (hipY + fy) * 0.5;
    capsule(charBuf, lx, hipY, kx, ky, 3.2, 2.6, (view === 'E' && legIdx === 0) ? C.pants0 : C.pants1);
    capsule(charBuf, kx, ky, fx, fy - 2, 2.5, 2.1, r[1]); // armored shin greave!
    capsule(charBuf, kx + 0.8, ky, fx + 0.8, fy - 3, 0.9, 0.8, C.gold3); // gold greave trim!
    rect(charBuf, fx - 2.5, fy - 2.5, view === 'E' ? 6 : 5, 2.5, C.pants0);
    pset(charBuf, fx + (view === 'E' ? 2.5 : 0), fy - 1, C.gold3);
  }

  // 3. Crossover Vietnamese Fantasy Martial Tunic (Áo Giao Lĩnh) + Ornate Belt + Pauldrons!
  capsule(charBuf, hipX, hipY, chestX, chestY, 5.5, 6.8, r[1]);
  if (view !== 'N') {
    capsule(charBuf, hipX + 1.5, hipY - 1, chestX + 2.5, chestY + 1, 3.2, 3.8, r[2]);
    // White inner collar & Gold V-crossover lapels!
    polyTri(charBuf, chestX - 3.5, chestY - 4, chestX + 3.5, chestY - 4, chestX, chestY + 3, C.white);
    capsule(charBuf, chestX - 4, chestY - 4, chestX + 1, chestY + 4, 1.1, 1.0, C.gold3);
    capsule(charBuf, chestX + 4, chestY - 4, chestX - 1, chestY + 3, 1.0, 0.9, C.gold2);
    // Ornate Golden Waist Belt & Elemental Buckle Gem!
    rect(charBuf, hipX - 5.5, hipY - 3, 11, 2.5, C.gold1);
    disc(charBuf, hipX + (view === 'E' ? 2 : 0), hipY - 2, 2.0, C.gold3);
    pset(charBuf, hipX + (view === 'E' ? 2 : 0), hipY - 2, form.eyeIdx);
  } else {
    capsule(charBuf, hipX, hipY - 1, chestX, chestY + 1, 4.8, 5.6, r[2]);
    disc(charBuf, chestX, chestY + 2, 2.8, C.gold3);
  }

  // Form-Specific Shoulder Pauldrons / Scarf Collar (from thien-vu-v04.png!)
  if (form.id === 'origin') {
    // Golden-Ochre Scarf draped warmly around neck & shoulders!
    capsule(charBuf, chestX - 5.5, chestY - 3.5, chestX + 5.5, chestY - 3.5, 2.6, 2.6, C.gold3);
    capsule(charBuf, chestX - 4, chestY - 4.5, chestX + 4, chestY - 4.5, 1.4, 1.4, C.gold4);
  } else if (form.id === 'lightning') {
    // Ornate Golden Dragon/Kirin Pauldron on shoulder!
    polyTri(charBuf, chestX - 7, chestY - 2, chestX - 11, chestY - 8, chestX - 1, chestY - 5, C.gold3);
    polyTri(charBuf, chestX + 2, chestY - 3, chestX + 9, chestY - 7, chestX + 6, chestY - 1, C.gold2);
  } else if (form.id === 'earth') {
    // Heavy Carved Stone-Gold Pauldrons!
    disc(charBuf, chestX - 6.5, chestY - 2.5, 4.2, r[1]); disc(charBuf, chestX - 6.5, chestY - 3.5, 2.6, C.gold2);
    disc(charBuf, chestX + 6.5, chestY - 2.5, 4.2, r[2]); disc(charBuf, chestX + 6.5, chestY - 3.5, 2.6, C.gold3);
  } else if (form.id === 'ice') {
    // White Fur Collar + Jagged Sapphire Ice-Crystal Shoulder Spikes!
    capsule(charBuf, chestX - 5.5, chestY - 3.5, chestX + 5.5, chestY - 3.5, 2.4, 2.4, C.white);
    polyTri(charBuf, chestX - 5, chestY - 3, chestX - 12, chestY - 9, chestX - 8, chestY - 1, r[3]);
    polyTri(charBuf, chestX + 5, chestY - 3, chestX + 12, chestY - 9, chestX + 8, chestY - 1, r[4]);
  } else if (form.id === 'light') {
    // Winged Sovereign Gold Pauldrons!
    polyTri(charBuf, chestX - 5, chestY - 2, chestX - 12, chestY - 8, chestX - 3, chestY - 5, C.gold3);
    polyTri(charBuf, chestX + 5, chestY - 2, chestX + 12, chestY - 8, chestX + 3, chestY - 5, C.gold4);
  }

  // 4. Canonical Anime Face & Sleek Tousled Silver-Charcoal Hair (NO CAP — exact match to thien-vu-v04.png!)
  if (view === 'S') {
    for (let fy = Math.floor(headY - 2); fy <= Math.ceil(headY + 6); fy++) {
      for (let fx = Math.floor(headX - 5.5); fx <= Math.ceil(headX + 5.5); fx++) {
        const dx = (fx - headX) / 5.6, dy = (fy - (headY + 1.2)) / 5.2;
        if (dx * dx + dy * dy <= 1.0) pset(charBuf, fx, fy, dx < -0.38 ? C.skin1 : dy > 0.55 ? C.skin2 : C.skin3);
      }
    }
    // Sharp eyebrows + vibrant elemental eyes + white catchlights!
    rect(charBuf, headX - 4, headY, 2, 1, C.hair0);
    rect(charBuf, headX + 2, headY, 2, 1, C.hair0);
    rect(charBuf, headX - 4, headY + 1, 2, 2, form.eyeIdx);
    rect(charBuf, headX + 2, headY + 1, 2, 2, form.eyeIdx);
    pset(charBuf, headX - 4, headY + 1, C.white); pset(charBuf, headX + 2, headY + 1, C.white);
    pset(charBuf, headX, headY + 4, C.skin0);
  } else if (view === 'E') {
    for (let fy = Math.floor(headY - 2); fy <= Math.ceil(headY + 6); fy++) {
      for (let fx = Math.floor(headX - 5); fx <= Math.ceil(headX + 6); fx++) {
        const dx = (fx - (headX + 0.6)) / 5.5, dy = (fy - (headY + 1.2)) / 5.2;
        if (dx * dx + dy * dy <= 1.0) pset(charBuf, fx, fy, fx < headX - 1.2 ? C.hair0 : (dx < 0 ? C.skin2 : C.skin3));
      }
    }
    rect(charBuf, headX + 2, headY, 3, 1, C.hair0);
    rect(charBuf, headX + 3, headY + 1, 2, 2, form.eyeIdx);
    pset(charBuf, headX + 3, headY + 1, C.white);
    pset(charBuf, headX + 4, headY + 4, C.skin0);
  } else {
    disc(charBuf, headX, headY, 5.6, C.hair0);
  }

  // Tousled Layered Silver-Grey & Charcoal Anime Hair (with blazing orange-gold tips for Fire!)
  const hDark = C.hair0, hSlate = C.hair1, hMid = form.id === 'fire' ? C.crimson : C.hair2, hLight = form.id === 'fire' ? C.flame : C.hair3, hTip = form.id === 'fire' ? C.flameTip : C.hair4;
  disc(charBuf, headX - (view === 'E' ? 0.8 : 0), headY - 2.6, 6.2, hDark);
  disc(charBuf, headX - (view === 'E' ? 0.4 : 0), headY - 3.6, 5.5, hSlate);
  disc(charBuf, headX + 0.5, headY - 4.4, 4.4, hMid);
  // Swept side-locks, tousled crown strands, and forehead bangs (natural anime silhouette!)
  const hairLocks = [
    [-5.5, -2, -8.5,  1, -4.5,  3, hDark],  // left temple lock framing cheek
    [ 5.5, -2,  8.0,  1,  4.5,  3, hSlate], // right temple lock
    [-4.5, -5, -8.2, -5, -2.5, -7, hMid],   // swept left tuft
    [-2.0, -6, -4.2,-10,  1.5, -7, hLight], // upper tousled lock
    [ 1.0, -6,  3.5,-10.5, 4.5,-6, hTip],   // bright silver/flame crown highlight
    [ 3.0, -5,  7.8, -6,  5.2, -2, hLight], // swept right tuft
    [-2.5, -3, -0.8,  0.5, 1.2,-3, hSlate], // swept bangs between eyes
    [ 0.5, -3,  2.2,  0.2, 3.8,-3, hLight]
  ];
  for (const [x0, y0, x1, y1, x2, y2, hc] of hairLocks) {
    polyTri(charBuf, headX + x0, headY + y0, headX + x1, headY + y1, headX + x2, headY + y2, hc);
  }

  // Canonical Headpieces from thien-vu-v04.png (Wind Wing-Pin, Ice Crystal-Crown, Nature Deer-Antlers!)
  if (form.id === 'wind') {
    polyTri(charBuf, headX - 3, headY - 6, headX - 11, headY - 15, headX - 1, headY - 9, r[3]);
    polyTri(charBuf, headX - 2, headY - 7, headX - 7, headY - 16, headX + 1, headY - 9, C.white);
    disc(charBuf, headX - 3, headY - 6, 1.8, C.gold3);
  } else if (form.id === 'ice') {
    polyTri(charBuf, headX - 4, headY - 6, headX - 8, headY - 15, headX - 1, headY - 8, r[3]);
    polyTri(charBuf, headX - 1, headY - 7, headX - 3, headY - 17, headX + 2, headY - 8, C.white);
  } else if (form.id === 'nature') {
    // Twin Wooden Deer-Antler Crown!
    capsule(charBuf, headX - 4, headY - 6, headX - 9, headY - 15, 1.4, 0.9, C.gold1);
    capsule(charBuf, headX - 7, headY - 11, headX - 11, headY - 12, 1.0, 0.7, C.gold2);
    capsule(charBuf, headX + 4, headY - 6, headX + 9, headY - 15, 1.4, 0.9, C.gold2);
    capsule(charBuf, headX + 7, headY - 11, headX + 11, headY - 12, 1.0, 0.7, C.gold3);
  }

  // 5. Left Arm + Right Armored Elemental Gauntlet (`Linh Uyển`) + HELD SACRED WEAPON!
  const lAng = raiseLeft > 0.05 ? (-Math.PI * 0.52 * raiseLeft + (1 - raiseLeft) * 0.5) : (view === 'E' ? -0.55 : 2.25);
  const lShX = chestX + (view === 'E' ? -2 : -6), lShY = chestY - 2;
  const lHandX = lShX + Math.cos(lAng) * (9 + raiseLeft * 3.5);
  const lHandY = lShY + Math.sin(lAng) * (9 + raiseLeft * 3.5);
  capsule(charBuf, lShX, lShY, lHandX, lHandY, 2.5, 2.2, r[2]);
  disc(charBuf, lHandX, lHandY, 2.2, C.skin2);

  const rShX = chestX + (view === 'E' ? 2 : 6), rShY = chestY - 2;
  const rHandX = rShX + Math.cos(armAngle) * 9.5;
  const rHandY = rShY + Math.sin(armAngle) * 9.5;
  // Glowing Right-Arm Elemental Gauntlet (`Linh Uyển` from thien-vu-v04.png)!
  capsule(charBuf, rShX, rShY, rHandX, rHandY, 2.9, 3.3, C.gold2);
  capsule(charBuf, (rShX + rHandX) * 0.5, (rShY + rHandY) * 0.5, rHandX, rHandY, 2.2, 2.5, form.eyeIdx);
  pset(charBuf, rHandX, rHandY, C.white);

  // Draw the Ornate Bespoke Held Weapon directly in Thiên Vũ's grasp!
  const wepBuf = makeBuf(charBuf.w, charBuf.h);
  drawHeldWeapon(wepBuf, form.id, rHandX, rHandY, armAngle, 1.0, phase, lHandX, lHandY);
  outlineBuf(wepBuf, C.ink, C.gold3, pose.rimGlow || 0);

  outlineBuf(charBuf, C.ink, r[4], pose.rimGlow || 0);
  if (view === 'N') {
    const merged = makeBuf(charBuf.w, charBuf.h);
    for (let i = 0; i < merged.d.length; i++) merged.d[i] = charBuf.d[i] || wepBuf.d[i];
    charBuf.d.set(merged.d);
  } else {
    for (let i = 0; i < charBuf.d.length; i++) if (wepBuf.d[i]) charBuf.d[i] = wepBuf.d[i];
  }

  return { bx, by, chestX, chestY, headX, headY, lHandX, lHandY, rHandX, rHandY };
}

function drawAmbientFormAura(backBuf, frontBuf, form, pts, phase, intensity = 1) {
  const { bx, by, chestX, chestY } = pts;
  const v = form.vIdx;

  if (form.id === 'origin') {
    // 7 Floating Faceted Elemental Crystal Gems orbiting Thiên Vũ (exact match to thien-vu-v04.png Row 4 Right!)
    for (let i = 0; i < 7; i++) {
      const a = phase + (i / 7) * Math.PI * 2;
      const ox = chestX + Math.cos(a) * 19, oy = chestY - 2 + Math.sin(a) * 10;
      const target = Math.sin(a) < 0 ? backBuf : frontBuf;
      polyTri(target, ox, oy - 3.5, ox - 2.5, oy, ox + 2.5, oy, GEM_RING[i]);
      polyTri(target, ox, oy + 3.5, ox - 2.5, oy, ox + 2.5, oy, GEM_RING[i]);
      pset(target, ox - 0.5, oy - 1, C.white);
    }
  } else if (form.id === 'lightning') {
    for (let i = 0; i < 2; i++) {
      const a = phase * 2 + i * Math.PI;
      drawVolumetricPlasma(backBuf, bx + Math.cos(a) * 14, by - 4, chestX - Math.cos(a) * 12, chestY - 12, 1.0, v, Math.round(phase * 10) + i);
    }
  } else if (form.id === 'wind') {
    drawGroundVortex(backBuf, bx, by + 1, 16, 4.5, v, phase, false);
    drawVolumetricPlume(frontBuf, chestX + Math.cos(phase * 2) * 16, chestY, 4.2, 4.2, v, 0.9, Math.round(phase * 5));
  } else if (form.id === 'earth') {
    for (let i = 0; i < 4; i++) {
      const a = phase * 1.4 + (i * Math.PI) / 2;
      const rx = chestX + Math.cos(a) * 19, ry = chestY + 2 + Math.sin(a) * 8;
      const target = Math.sin(a) < 0 ? backBuf : frontBuf;
      drawVolumetricSpire(target, rx, ry + 4, 3.5, 7.0, Math.sin(a) * 1.5, v, false);
    }
  } else if (form.id === 'fire') {
    drawVolumetricPlume(backBuf, chestX - 6, chestY - 4, 9, 13, v, 0.85 * intensity, Math.round(phase * 8));
    drawVolumetricPlume(backBuf, chestX + 6, chestY - 4, 9, 13, v, 0.85 * intensity, Math.round(phase * 8) + 3);
  } else if (form.id === 'ice') {
    drawVolumetricPlume(backBuf, bx, by - 2, 16, 5, v, 0.78, Math.round(phase * 4));
    for (let i = 0; i < 3; i++) {
      const a = phase + i * 2.1, ix = chestX + Math.cos(a) * 19, iy = chestY + Math.sin(a) * 9;
      polyTri(frontBuf, ix, iy - 4, ix - 2.5, iy, ix + 2.5, iy, v[4]);
      polyTri(frontBuf, ix, iy + 4, ix - 2.5, iy, ix + 2.5, iy, v[3]);
    }
  } else if (form.id === 'nature') {
    for (let i = 0; i < 5; i++) {
      const a = phase * 1.3 + i * 1.25, px = chestX + Math.cos(a) * 19, py = chestY + Math.sin(a) * 10;
      disc(frontBuf, px, py, 2.2, i % 2 ? C.pink : v[4]);
      pset(frontBuf, px, py, C.white);
    }
  } else if (form.id === 'light') {
    drawVolumetricPlume(backBuf, chestX, chestY - 6, 14, 14, v, 0.65, Math.round(phase * 6));
    drawStarFlare(frontBuf, chestX + Math.cos(phase) * 18, chestY - 8, 4.0, v, phase);
  }
}

// ============================================================================
// FULL 300-FRAME SAKUGA TIMELINE PER FORM (0..299)
// ============================================================================
function renderFormFrame(form, view, idx) {
  const out = makeBuf(CW, CH);
  const backVfx = makeBuf(CW, CH);
  const charBuf = makeBuf(CW, CH);
  const frontVfx = makeBuf(CW, CH);
  const v = form.vIdx;
  const aimSign = view === 'E' ? 1 : 0;
  const aimA = view === 'E' ? 0 : (view === 'S' ? Math.PI * 0.5 : -Math.PI * 0.5);

  disc(out, AX, AY + 2, 12, C.ink);

  // 1. TRANSFORM AWAKENING & WEAPON MATERIALIZATION (0..29 = 30f)
  if (idx < 30) {
    const u = idx / 29;
    const slam = u < 0.35 ? Math.sin((u / 0.35) * Math.PI * 0.5) : 1;
    const pillar = u >= 0.18 && u < 0.84 ? Math.sin(((u - 0.18) / 0.66) * Math.PI) : 0;
    const burst = u >= 0.55 ? (u - 0.55) / 0.45 : 0;

    drawGroundVortex(backVfx, AX, AY + 1, 12 + u * 26, 4 + u * 6, v, u * 6, pillar > 0.3);
    if (pillar > 0.05) {
      for (let h = 0; h < 5; h++) {
        drawVolumetricPlume(h % 2 === 0 ? backVfx : frontVfx, AX, AY - 6 - h * 13 * pillar, (18 - h * 2.2) * pillar, 11, v, 1.05 - burst * 0.5, idx + h);
      }
    }
    const pts = drawCanonicalThienVu(charBuf, form, view, {
      lift: Math.sin(u * Math.PI) * 9,
      raiseLeft: u < 0.78 ? slam : 1 - (u - 0.78) / 0.22,
      armAngle: -0.95 + u * 1.15,
      rimGlow: 0.95,
      phase: u * Math.PI * 4
    });
    if (u > 0.22 && u < 0.88) drawStarFlare(frontVfx, pts.rHandX, pts.rHandY, 7 + pillar * 9, v, u * 5);
  }
  // 2. IDLE + HELD WEAPON POISE (30..65 = 36f)
  else if (idx < 66) {
    const u = (idx - 30) / 36, phase = u * Math.PI * 4;
    const pts = drawCanonicalThienVu(charBuf, form, view, {
      dy: Math.sin(phase) * 1.1,
      lift: form.id === 'wind' ? 3 + Math.sin(phase) * 2 : 0,
      armAngle: 0.26 + Math.sin(phase) * 0.12,
      phase
    });
    drawAmbientFormAura(backVfx, frontVfx, form, pts, phase, 0.9);
  }
  // 3. RUN + HELD WEAPON SPRINT (66..101 = 36f)
  else if (idx < 102) {
    const u = (idx - 66) / 36, phase = u * Math.PI * 4;
    const isWind = form.id === 'wind';
    const pts = drawCanonicalThienVu(charBuf, form, view, {
      dy: isWind ? Math.sin(phase) * 2 : -Math.abs(Math.sin(phase)) * 2.8,
      lift: isWind ? 5 : 0,
      lean: 5.5,
      stride: isWind ? null : phase,
      crouch: 1.0,
      armAngle: isWind ? -0.2 : Math.sin(phase + Math.PI) * 0.65 + 0.35,
      phase
    });
    drawVolumetricPlume(backVfx, view === 'E' ? AX - 14 : AX, AY - (isWind ? 4 : 2), isWind ? 14 : 9, 5, v, 0.85, idx);
    drawAmbientFormAura(backVfx, frontVfx, form, pts, phase, 0.8);
  }
  // 4. DASH (102..121 = 20f)
  else if (idx < 122) {
    const u = (idx - 102) / 19, surge = Math.sin(u * Math.PI), shift = view === 'E' ? surge * 9 : 0;
    drawVolumetricPlume(backVfx, AX - shift * 0.9 - (view === 'E' ? 14 : 0), AY - 18, 18 * surge + 6, 12, v, 1.0, idx);
    drawVolumetricCrescent(frontVfx, AX + shift, AY - 18, aimA, 16 + u * 11, 6.5 * surge + 2, v, u * 0.65, 1.3, idx);
    drawCanonicalThienVu(charBuf, form, view, {
      dx: shift, lift: 5 * surge, lean: 8.0, crouch: 2.2, armAngle: -0.25, rimGlow: 0.95, phase: u * Math.PI * 4
    });
  }
  // 5. HIT (122..131 = 10f)
  else if (idx < 132) {
    const u = (idx - 122) / 9, recoil = Math.sin(u * Math.PI);
    const pts = drawCanonicalThienVu(charBuf, form, view, {
      dx: view === 'E' ? -recoil * 5 : 0, crouch: recoil * 2.5, lean: -3 * recoil, armAngle: -1.0, rimGlow: 1.0, phase: u * 6
    });
    drawVolumetricPlume(frontVfx, pts.chestX + (view === 'E' ? 6 : 0), pts.chestY, 13 * (1 - u * 0.5), 13 * (1 - u * 0.5), v, 0.95 - u * 0.6, idx);
  }
  // 6. 3-STAGE HELD-WEAPON SAKUGA COMBO (132..191 = 60f: 20f x 3!)
  else if (idx < 192) {
    const local = idx - 132, combo = Math.floor(local / 20), u = (local % 20) / 19;
    const strike = u > 0.18 ? Math.sin(Math.min(1, (u - 0.18) / 0.45) * Math.PI * 0.65) : 0;
    const dissolve = Math.max(0, (u - 0.58) / 0.42);
    const swingA = combo === 0 ? (-1.35 + strike * 2.1) : combo === 1 ? (1.35 - strike * 2.4) : (-1.65 + strike * 2.55);

    const pts = drawCanonicalThienVu(charBuf, form, view, {
      dx: view === 'E' ? (-4 + strike * 7) : 0,
      crouch: 1.5, lean: 5.5 * strike, raiseLeft: combo === 2 ? strike * 0.75 : 0,
      armAngle: swingA, rimGlow: 0.65 + strike * 0.35, phase: u * Math.PI * 2
    });

    if (u >= 0.18) {
      const ox = pts.chestX + aimSign * 6, oy = pts.chestY + (view === 'S' ? 8 : view === 'N' ? -8 : 0);
      const wavePal = form.id === 'origin'
        ? [v[0], GEM_RING[(combo * 2) % 7], GEM_RING[(combo * 2 + 3) % 7], C.gold3, C.white]
        : v;
      drawVolumetricCrescent(view === 'N' ? backVfx : frontVfx, ox, oy, aimA + (combo === 1 ? -0.2 : 0.15), (combo === 2 ? 22 : 18) + u * 6, combo === 2 ? 10 : 7.5, wavePal, dissolve, combo === 2 ? 1.7 : 1.45, idx);

      if (combo === 2 && u > 0.25) {
        const fx = ox + Math.cos(aimA) * 19, fy = oy + Math.sin(aimA) * 14;
        if (form.id === 'earth') drawVolumetricSpire(frontVfx, fx, AY, 8.5, 25 * (1 - dissolve * 0.5), 3, v, false);
        else if (form.id === 'ice') drawVolumetricSpire(frontVfx, fx, AY, 8.5, 26 * (1 - dissolve * 0.5), 2, v, true);
        else if (form.id === 'lightning') drawVolumetricPlasma(frontVfx, ox, oy - 8, fx + aimSign * 8, fy, 2.0, v, idx);
        else if (form.id === 'wind') drawVolumetricTornado(frontVfx, fx, AY, 34 * (1 - dissolve * 0.4), 5, 12, v, u * 6);
        else if (form.id === 'nature') drawVolumetricVine(frontVfx, pts.rHandX, pts.rHandY, fx + aimSign * 6, fy, 5, v, u * 4);
        else drawStarFlare(frontVfx, fx, fy, 12 * (1 - dissolve * 0.5), wavePal, u * 4);
      }
    }
  }
  // 7. SIGNATURE Q SKILL (192..223 = 32f)
  else if (idx < 224) {
    const u = (idx - 192) / 31;
    const charge = u < 0.28 ? u / 0.28 : Math.max(0, 1 - (u - 0.28) / 0.15);
    const active = u >= 0.24 ? Math.min(1, (u - 0.24) / 0.35) : 0;
    const fade = Math.max(0, (u - 0.68) / 0.32);

    const pts = drawCanonicalThienVu(charBuf, form, view, {
      dx: view === 'E' ? (-7 + active * 2 - charge * 3) : 0,
      lift: ['wind', 'light', 'origin'].includes(form.id) ? active * 5 : 0,
      lean: 5.5 * active, raiseLeft: charge * 0.7,
      armAngle: active > 0.1 ? 0.05 : -1.25, rimGlow: 0.95, phase: u * Math.PI * 4
    });

    if (charge > 0.05) drawStarFlare(frontVfx, pts.rHandX, pts.rHandY, 6 + charge * 7, v, u * 8);
    if (active > 0.05) {
      const fx = pts.chestX + Math.cos(aimA) * 18, fy = pts.chestY + Math.sin(aimA) * 14;
      if (form.id === 'origin') {
        drawGroundVortex(backVfx, AX - aimSign * 4, AY, 24 * active, 6, v, u * 6, true);
        for (let p = 0; p < 7; p++) {
          const pa = aimA + (p - 3) * 0.24;
          drawVolumetricPlume(frontVfx, pts.chestX + Math.cos(pa) * (12 + active * 15), pts.chestY + Math.sin(pa) * 13, 6.0 * (1 - fade * 0.6), 6.0 * (1 - fade * 0.6), [v[0], GEM_RING[p], C.gold3, C.white], 1.0, idx + p);
        }
      } else if (form.id === 'lightning') {
        drawVolumetricPlasma(frontVfx, AX - aimSign * 20, pts.chestY, AX + aimSign * 34, fy, 2.0 * (1 - fade * 0.5), v, idx);
        drawVolumetricCrescent(frontVfx, fx, fy, aimA, 16, 7.5, v, fade, 1.4, idx);
      } else if (form.id === 'wind') {
        drawVolumetricTornado(backVfx, fx - 5, AY, 44 * (1 - fade * 0.4), 5, 12, v, u * 8);
        drawVolumetricTornado(frontVfx, fx + 8, AY + 2, 48 * (1 - fade * 0.4), 5, 13, v, u * 8 + 2);
      } else if (form.id === 'earth') {
        for (let sIdx = 0; sIdx < 3; sIdx++) {
          const prog = Math.max(0, Math.min(1, (active - sIdx * 0.18) * 1.6)) * (1 - fade * 0.5);
          if (prog > 0) drawVolumetricSpire(frontVfx, pts.chestX + aimSign * (14 + sIdx * 10) + (view !== 'E' ? (sIdx - 1) * 12 : 0), AY + 1, 6.5 + sIdx, (22 + sIdx * 8) * prog, aimSign * 3, v, false);
        }
      } else if (form.id === 'fire') {
        for (let bIdx = 0; bIdx < 5; bIdx++) {
          const bu = bIdx / 4;
          drawVolumetricPlume(frontVfx, pts.rHandX + Math.cos(aimA) * (5 + bu * 20), pts.rHandY + Math.sin(aimA) * (4 + bu * 14) - bu * 3, (4.2 + bu * 8) * (1 - fade * 0.5), (4.2 + bu * 7.5) * (1 - fade * 0.5), v, 1.05 - fade * 0.5, idx + bIdx);
        }
      } else if (form.id === 'ice') {
        drawVolumetricSpire(backVfx, fx - 4, AY, 8.5, 32 * active * (1 - fade * 0.4), -3, v, true);
        drawVolumetricSpire(frontVfx, fx + 7, AY + 1, 11, 42 * active * (1 - fade * 0.4), 2, v, true);
      } else if (form.id === 'nature') {
        drawVolumetricVine(frontVfx, pts.rHandX, pts.rHandY, fx + aimSign * 14, fy - 6, 5.5, v, u * 6);
        drawVolumetricVine(backVfx, AX - aimSign * 4, AY, fx + aimSign * 11, AY - 24 * active, 5, v, u * 6 + 2);
      } else if (form.id === 'light') {
        drawStarFlare(frontVfx, fx + aimSign * 4, fy, 17 * (1 - fade * 0.5), v, u * 5);
        drawVolumetricCrescent(frontVfx, fx, fy, aimA, 18, 7.0, v, fade, 1.5, idx);
      }
    }
  }
  // 8. SIGNATURE E SKILL (224..255 = 32f)
  else if (idx < 256) {
    const u = (idx - 224) / 31, swell = Math.sin(u * Math.PI), fade = Math.max(0, (u - 0.68) / 0.32);
    drawGroundVortex(backVfx, AX, AY + 1, 16 + swell * 22, 5 + swell * 5, v, u * 6, true);
    const pts = drawCanonicalThienVu(charBuf, form, view, {
      lift: ['wind', 'light', 'ice', 'fire'].includes(form.id) ? swell * 8 : 0,
      raiseLeft: swell, armAngle: -0.65 + u * 0.95, rimGlow: 1.0, phase: u * Math.PI * 4
    });
    if (form.id === 'earth') {
      for (let i = 0; i < 4; i++) {
        const a = u * Math.PI * 3 + (i * Math.PI) / 2;
        drawVolumetricSpire(Math.sin(a) < 0 ? backVfx : frontVfx, AX + Math.cos(a) * 24, AY - 6 + Math.sin(a) * 8, 6.5, 18 * swell + 6, 0, v, false);
      }
    } else if (form.id === 'fire') {
      drawVolumetricPlume(frontVfx, AX + aimSign * 8, pts.headY - 18 - (1 - u) * 8, 15 * swell + 4, 15 * swell + 4, v, 1.1 - fade * 0.5, idx);
    } else if (form.id === 'light') {
      const bx1 = pts.rHandX + Math.cos(aimA) * 32, by1 = pts.rHandY + Math.sin(aimA) * 20;
      capsule(frontVfx, pts.rHandX, pts.rHandY, bx1, by1, 8 * swell + 2, 10 * swell + 2, v[2]);
      capsule(frontVfx, pts.rHandX, pts.rHandY, bx1, by1, 5 * swell + 1, 6.5 * swell + 1, v[4]);
      capsule(frontVfx, pts.rHandX, pts.rHandY, bx1, by1, 2.5 * swell + 0.8, 3 * swell + 0.8, C.white);
      drawStarFlare(frontVfx, pts.rHandX, pts.rHandY, 10 * swell + 3, v, u * 6);
    } else if (form.id === 'wind') {
      drawVolumetricTornado(backVfx, AX, AY + 2, 38 * swell + 10, 14, 24, v, u * 9);
    } else {
      drawVolumetricCrescent(backVfx, pts.chestX, pts.chestY + 2, -Math.PI * 0.5, 22 * swell + 8, 7.5, v, fade, Math.PI, idx);
      drawStarFlare(frontVfx, pts.rHandX, pts.rHandY, 10 * swell + 3, v, u * 6);
    }
  }
  // 9. SOVEREIGN R ULTIMATE (256..299 = 44f)
  else {
    const u = (idx - 256) / 43;
    const ascend = u < 0.30 ? Math.sin((u / 0.30) * Math.PI * 0.5) : (u > 0.84 ? Math.cos(((u - 0.84) / 0.16) * Math.PI * 0.5) : 1);
    const cataclysm = u >= 0.25 && u < 0.86 ? Math.sin(((u - 0.25) / 0.61) * Math.PI) : 0;

    drawGroundVortex(backVfx, AX, AY + 2, 22 + ascend * 22, 6 + ascend * 5, v, u * 10, true);
    if (cataclysm > 0.05) {
      if (form.id === 'origin') {
        drawVolumetricPlume(backVfx, AX, AY - 34, 28 * cataclysm, 30 * cataclysm, v, 0.95, idx);
        for (let i = 0; i < 7; i++) {
          const a = u * Math.PI * 6 + (i / 7) * Math.PI * 2;
          const ox = AX + Math.cos(a) * (24 + cataclysm * 12), oy = AY - 32 + Math.sin(a) * 18;
          drawVolumetricPlume(Math.sin(a) < 0 ? backVfx : frontVfx, ox, oy, 6.2, 6.2, [C.pants1, GEM_RING[i], C.white], 1.1, idx + i);
        }
      } else if (form.id === 'lightning') {
        drawVolumetricPlume(backVfx, AX, 14, 34 * cataclysm, 10, v, 0.9, idx);
        for (let i = 0; i < 5; i++) {
          const sx = AX - 26 + i * 13, sy = AY - 6 - ((i % 2) * 8);
          drawVolumetricPlasma(i % 2 ? frontVfx : backVfx, sx, 8, sx, sy, 1.6 * cataclysm + 0.6, v, idx + i * 3);
        }
      } else if (form.id === 'wind') {
        drawVolumetricTornado(backVfx, AX, AY + 2, 66 * cataclysm, 12, 36, v, u * 12);
      } else if (form.id === 'earth') {
        drawVolumetricSpire(backVfx, AX - 22, AY + 1, 12, 48 * cataclysm, -5, v, false);
        drawVolumetricSpire(backVfx, AX + 22, AY + 1, 12, 48 * cataclysm, 5, v, false);
        drawVolumetricPlume(backVfx, AX, AY - 38, 24 * cataclysm, 22 * cataclysm, v, 0.95, idx);
      } else if (form.id === 'fire') {
        drawVolumetricPlume(backVfx, AX, AY - 46, 34 * cataclysm, 26 * cataclysm, v, 1.1, idx);
      } else if (form.id === 'ice') {
        for (const [ox, h, tl] of [[-24, 44, -6], [-10, 56, -2], [10, 56, 2], [24, 44, 6]]) {
          drawVolumetricSpire(backVfx, AX + ox, AY + 1, 10, h * cataclysm, tl, v, true);
        }
      } else if (form.id === 'nature') {
        for (const ox of [-26, -12, 12, 26]) {
          drawVolumetricVine(ox < 0 ? backVfx : frontVfx, AX + ox * 0.5, AY, AX + ox * 1.3, AY - 54 * cataclysm, 6, v, u * 8 + ox);
        }
      } else if (form.id === 'light') {
        drawStarFlare(backVfx, AX, AY - 36, 32 * cataclysm, v, u * 4);
      }
    }
    const pts = drawCanonicalThienVu(charBuf, form, view, {
      lift: ascend * 14, raiseLeft: ascend, armAngle: 0.18 - ascend * 0.48, rimGlow: 1.0, phase: u * Math.PI * 6
    });
    drawStarFlare(backVfx, pts.chestX, pts.headY - 8, 8 + cataclysm * 10, v, u * 8);
  }

  for (let i = 0; i < CW * CH; i++) {
    if (backVfx.d[i]) out.d[i] = backVfx.d[i];
    if (charBuf.d[i]) out.d[i] = charBuf.d[i];
    if (frontVfx.d[i]) out.d[i] = frontVfx.d[i];
  }
  return out;
}

function blitIndexed(sheet, sheetW, cell, ox, oy, scale = 1) {
  for (let y = 0; y < cell.h; y++) {
    for (let x = 0; x < cell.w; x++) {
      const c = cell.d[y * cell.w + x];
      if (!c) continue;
      for (let sy = 0; sy < scale; sy++) {
        const rowOff = (oy + y * scale + sy) * sheetW;
        for (let sx = 0; sx < scale; sx++) sheet[rowOff + ox + x * scale + sx] = c;
      }
    }
  }
}

module.exports = {
  PAL_LIST, PAL_RGB, C, FORMS, GEM_RING, CW, CH, AX, AY,
  colIdx, encodeIndexedPNG, makeBuf, pset, rect, disc, capsule, polyTri, outlineBuf, drawRing, drawBlossom,
  drawVolumetricPlume, drawGroundVortex, drawVolumetricCrescent, drawVolumetricSpire,
  drawVolumetricTornado, drawVolumetricPlasma, drawStarFlare, drawVolumetricVine,
  drawHeldWeapon, drawCanonicalThienVu, renderFormFrame, blitIndexed
};

if (require.main === module) {
  console.log('Generating Canonical 8 Thiên Vũ Forms x 300 frames x 3 views + 8 Ornate Weapons HD Atlas...');
  const t0 = Date.now();
  const SW = SCOLS * CW, SH = SROWS * CH;
  const idleCells = [], skillCells = [], ultCells = [];

  for (const form of FORMS) {
    const sheet = Buffer.alloc(SW * SH, 0);
    const views = ['S', 'E', 'N'];
    for (let vIdx = 0; vIdx < 3; vIdx++) {
      const view = views[vIdx];
      for (let f = 0; f < 300; f++) {
        const buf = renderFormFrame(form, view, f);
        if (view === 'E' && f === 38) idleCells.push({ form, f, buf });
        if (view === 'E' && f === 210) skillCells.push({ form, f, buf });
        if (view === 'E' && f === 278) ultCells.push({ form, f, buf });
        const cellIdx = vIdx * 300 + f;
        blitIndexed(sheet, SW, buf, (cellIdx % SCOLS) * CW, Math.floor(cellIdx / SCOLS) * CH, 1);
      }
    }
    const outName = `thienvu-form-${form.id}.png`;
    const outPath = path.join(ASSETS, outName);
    fs.writeFileSync(outPath, encodeIndexedPNG(SW, SH, sheet));
    console.log(`Saved ${outName} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
  }

  // 2. Canonical Origin Portrait (`assets/thienvu-origin-portrait.png`, 192x192 — matching thien-vu-v04.png Row 4 Right 1-to-1!)
  {
    const PW = 96, PH = 96, SCALE = 2;
    const pBuf = makeBuf(PW, PH);
    disc(pBuf, 48, 48, 43.5, C.pants0);
    drawVolumetricPlume(pBuf, 48, 46, 36, 36, FORMS[0].vIdx, 0.68, 7);
    // Clip background strictly inside medallion before drawing golden border!
    for (let y = 0; y < PH; y++) {
      for (let x = 0; x < PW; x++) {
        if ((x - 48) * (x - 48) + (y - 48) * (y - 48) > 43.5 * 43.5) pBuf.d[y * PW + x] = 0;
      }
    }
    drawRing(pBuf, 48, 48, 44.5, 41.8, C.gold2, C.gold3);

    // Flowing Navy-Gold Back Scarf Streamers (from thien-vu-v04.png Row 4 Right!)
    const r0 = FORMS[0].rIdx;
    polyTri(pBuf, 28, 62, 9, 76, 26, 73, r0[1]);
    capsule(pBuf, 28, 63, 10, 76, 1.2, 0.9, C.gold3);
    polyTri(pBuf, 68, 62, 87, 74, 70, 73, r0[2]);
    capsule(pBuf, 68, 63, 86, 74, 1.2, 0.9, C.gold3);

    // 7 Faceted Elemental Crystal Gems floating around Thiên Vũ!
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.5 + (i / 7) * Math.PI * 2;
      const gx = 48 + Math.cos(a) * 35.5, gy = 44 + Math.sin(a) * 31;
      polyTri(pBuf, gx, gy - 5.2, gx - 3.4, gy, gx + 3.4, gy, GEM_RING[i]);
      polyTri(pBuf, gx, gy + 5.2, gx - 3.4, gy, gx + 3.4, gy, GEM_RING[i]);
      pset(pBuf, gx - 1, gy - 2, C.white);
    }

    // Royal Indigo-Navy Áo Giao Lĩnh + Ornate Shoulder Pauldrons + V-Draped Warm Golden Scarf!
    const chBuf = makeBuf(PW, PH);
    capsule(chBuf, 48, 93, 48, 60, 21, 17, r0[0]);
    capsule(chBuf, 52, 92, 50, 62, 14, 12, r0[1]);
    polyTri(chBuf, 34, 64, 62, 64, 48, 93, r0[2]);
    // Navy & Gold Shoulder Armor Plates (Hộ Kiên)
    polyTri(chBuf, 33, 60, 20, 67, 34, 72, r0[2]);
    capsule(chBuf, 33, 60, 20, 67, 1.4, 1.1, C.gold3);
    polyTri(chBuf, 63, 60, 76, 67, 62, 72, r0[2]);
    capsule(chBuf, 63, 60, 76, 67, 1.4, 1.1, C.gold3);
    // White inner crossover collar + Gold lapels + Neck
    polyTri(chBuf, 41, 56, 55, 56, 48, 72, C.white);
    capsule(chBuf, 40, 58, 49, 73, 1.3, 1.1, C.gold3);
    capsule(chBuf, 56, 58, 47, 71, 1.2, 1.0, C.gold2);
    rect(chBuf, 44, 52, 8, 7, C.skin2);
    // Natural V-Draped Golden Scarf with Ochre Crease Folds!
    capsule(chBuf, 34, 58, 48, 65, 4.2, 4.6, C.gold2);
    capsule(chBuf, 62, 58, 48, 65, 4.2, 4.6, C.gold3);
    capsule(chBuf, 36, 57, 48, 63, 2.2, 2.5, C.gold4);
    capsule(chBuf, 60, 57, 48, 63, 2.2, 2.5, C.gold3);
    capsule(chBuf, 38, 60, 48, 66, 0.9, 0.9, C.gold1);

    // Back Hair Silhouette Volume first (so face & full eyes sit cleanly in front!)
    disc(chBuf, 48, 30, 14.2, C.hair0);
    disc(chBuf, 48, 28, 12.8, C.hair1);
    disc(chBuf, 49, 26.5, 10.6, C.hair2);
    disc(chBuf, 50, 25, 7.6, C.hair3);

    // Sculpted Handsome Anime Face + Chin Contour + Full Expressive Indigo-Sapphire Eyes!
    for (let fy = 31; fy <= 55; fy++) {
      for (let fx = 36; fx <= 60; fx++) {
        const ny = (fy - 41) / 14.0;
        const halfW = ny < 0.15 ? 11.8 : 11.8 * Math.max(0.22, 1 - Math.pow((ny - 0.15) / 0.92, 1.45));
        if (Math.abs(fx - 48) <= halfW && ny >= -0.72 && ny <= 1.0) {
          pset(chBuf, fx, fy, (fx - 48) < -4.2 ? C.skin1 : ny > 0.65 ? C.skin2 : C.skin3);
        }
      }
    }
    // Ears
    rect(chBuf, 35, 41, 2, 5, C.skin1);
    rect(chBuf, 59, 41, 2, 5, C.skin2);

    // Tousled Crown & Temple Locks + Forehead Bangs (parted cleanly so BOTH eyes shine 100%!)
    const portraitLocks = [
      [35, 31, 30, 43, 36, 45, C.hair0], [34, 27, 29, 36, 36, 37, C.hair1],
      [61, 31, 66, 43, 60, 45, C.hair0], [62, 27, 67, 36, 60, 37, C.hair2],
      [37, 23, 31, 20, 42, 19, C.hair2], [43, 19, 41, 13, 49, 17, C.hair3],
      [48, 18, 52, 12, 55, 18, C.hair4], [54, 20, 62, 16, 59, 24, C.hair3],
      [58, 24, 66, 23, 61, 29, C.hair2],
      // Forehead bangs framing ABOVE the eyebrows + central nose-bridge lock!
      [36, 30, 38, 38, 42, 31, C.hair1],
      [41, 29, 44, 36, 47, 30, C.hair2],
      [46, 29, 48, 41, 51, 30, C.hair3], // signature center-parted silver lock between eyes!
      [50, 29, 53, 36, 56, 30, C.hair3],
      [55, 30, 58, 38, 60, 31, C.hair2],
      [45, 25, 48, 33, 51, 25, C.hair4]
    ];
    for (const [x0, y0, x1, y1, x2, y2, hc] of portraitLocks) polyTri(chBuf, x0, y0, x1, y1, x2, y2, hc);

    // Sharp Slanted Anime Eyebrows + Crisp Eyelashes + Full 5x4 Dual-Tone Sapphire Eyes!
    capsule(chBuf, 39, 38, 44, 39, 0.85, 0.75, C.hair0);
    capsule(chBuf, 57, 38, 52, 39, 0.85, 0.75, C.hair0);
    rect(chBuf, 39, 40, 5, 1, C.ink);
    rect(chBuf, 52, 40, 5, 1, C.ink);
    rect(chBuf, 40, 41, 4, 4, C.white);
    rect(chBuf, 41, 41, 3, 4, r0[2]); rect(chBuf, 41, 42, 3, 3, FORMS[0].eyeIdx); rect(chBuf, 41, 41, 1, 2, C.white);
    rect(chBuf, 52, 41, 4, 4, C.white);
    rect(chBuf, 52, 41, 3, 4, r0[2]); rect(chBuf, 52, 42, 3, 3, FORMS[0].eyeIdx); rect(chBuf, 52, 41, 1, 2, C.white);
    // Subtle nose shadow + confident smile
    pset(chBuf, 47, 46, C.skin1); pset(chBuf, 48, 47, C.skin1);
    capsule(chBuf, 45, 50, 51, 50, 0.65, 0.65, C.skin0);
    pset(chBuf, 52, 49, C.skin1);

    // Raised Right-Arm Multi-Gem Linh Uyển Gauntlet + Thất Linh Tâm Ấn!
    capsule(chBuf, 34, 88, 27, 73, 5.5, 4.8, C.gold2);
    capsule(chBuf, 33, 86, 27, 74, 3.6, 3.2, r0[2]);
    disc(chBuf, 30, 80, 2.0, colIdx('#52b4ff'));
    disc(chBuf, 28, 75, 1.8, colIdx('#59d66f'));
    outlineBuf(chBuf, C.ink, C.gold3, 0.35);

    const wBuf = makeBuf(PW, PH);
    drawHeldWeapon(wBuf, 'origin', 18, 71, -0.75, 1.15, 0.3);
    outlineBuf(wBuf, C.ink, C.gold3, 0.6);

    for (let i = 0; i < PW * PH; i++) {
      if (chBuf.d[i]) pBuf.d[i] = chBuf.d[i];
      if (wBuf.d[i]) pBuf.d[i] = wBuf.d[i];
    }

    const scaled = Buffer.alloc((PW * SCALE) * (PH * SCALE), 0);
    blitIndexed(scaled, PW * SCALE, pBuf, 0, 0, SCALE);
    const pngBytes = encodeIndexedPNG(PW * SCALE, PH * SCALE, scaled);
    fs.writeFileSync(path.join(ASSETS, 'thienvu-origin-portrait.png'), pngBytes);
    if (fs.existsSync(ARTIFACT_DIR)) fs.writeFileSync(path.join(ARTIFACT_DIR, 'thienvu_origin_portrait.png'), pngBytes);
  }

  // 3. High-Detail 8-Weapon Close-Up Showcase Sheet (`thienvu_8weapons_hd.png` in Artifact Dir)
  if (fs.existsSync(ARTIFACT_DIR)) {
    const WC = 4, WR = 2, WW = 96, WH = 84, WSCALE = 2;
    const wPoster = Buffer.alloc((WC * WW * WSCALE) * (WR * WH * WSCALE), C.ink);
    FORMS.forEach((form, i) => {
      const cell = makeBuf(WW, WH);
      drawVolumetricPlume(cell, 48, 42, 34, 28, form.vIdx, 0.65, i * 5);
      const wep = makeBuf(WW, WH);
      const ox = ['earth', 'fire'].includes(form.id) ? 28 : form.id === 'ice' ? 28 : 32;
      const oy = ['earth', 'fire'].includes(form.id) ? 46 : 50;
      drawHeldWeapon(wep, form.id, ox, oy, -0.42, 1.65, 0.4, 62, 48);
      outlineBuf(wep, C.ink, C.gold3, 0.7);
      for (let p = 0; p < WW * WH; p++) if (wep.d[p]) cell.d[p] = wep.d[p];
      blitIndexed(wPoster, WC * WW * WSCALE, cell, (i % WC) * WW * WSCALE, Math.floor(i / WC) * WH * WSCALE, WSCALE);
    });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'thienvu_8weapons_hd.png'), encodeIndexedPNG(WC * WW * WSCALE, WR * WH * WSCALE, wPoster));

    // 4 cols x 6 rows Poster: Rows 0-1 = Idle w/ Held Weapon, Rows 2-3 = Q Skill, Rows 4-5 = R Ultimate!
    const allShow = [...idleCells, ...skillCells, ...ultCells];
    const PC = 4, PR = 6, PSCALE = 2;
    const poster = Buffer.alloc((PC * CW * PSCALE) * (PR * CH * PSCALE), C.ink);
    allShow.forEach(({ buf }, i) => {
      blitIndexed(poster, PC * CW * PSCALE, buf, (i % PC) * CW * PSCALE, Math.floor(i / PC) * CH * PSCALE, PSCALE);
    });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'thienvu_8forms_showcase.png'), encodeIndexedPNG(PC * CW * PSCALE, PR * CH * PSCALE, poster));

    const OC = 15, OR = 20;
    const oSheet = Buffer.alloc((OC * CW) * (OR * CH), C.ink);
    for (let f = 0; f < 300; f++) {
      blitIndexed(oSheet, OC * CW, renderFormFrame(FORMS[0], 'E', f), (f % OC) * CW, Math.floor(f / OC) * CH, 1);
    }
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'thienvu_origin_300_sheet.png'), encodeIndexedPNG(OC * CW, OR * CH, oSheet));
    console.log('Done in', ((Date.now() - t0) / 1000).toFixed(2) + 's');
  }
}
