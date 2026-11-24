'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/a5688402-2205-46b4-8801-65fc6142b701';

// Zero-dependency lossless RGBA PNG encoder (strict binary alpha: 0 or 255)
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
  ihdr[8] = 8; ihdr[9] = 6;
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

// Native texel cell: 88x74 (drawn at unit=2 -> 176x148 crisp pixel display in-game!)
// Anchor at (36, 62) so wide forward Sakuga attacks & tall crests never clip!
// EXACT 200 FRAMES PER BEAST:
//   0..27    (28f) : spawn  (Abyssal rune portal -> shadow flame geyser -> beast rising & roaring)
//   28..63   (36f) : idle   (Sculpted breathing, Solo-Leveling rising dark smoke, filigree pulse, eye trail)
//   64..111  (48f) : walk   (Full 3-stride articulated locomotion + trailing abyssal embers)
//   112..199 (88f) : attack (4-Phase Sakuga Skill: Charge Gather -> Ferocious Apex Strike -> Shockwave -> Settle)
const CW = 88, CH = 74;
const AX = 36, AY = 62;

const BEAST_LIST = [
  // Sheet 1 (0..5)
  { id: 'shadow_wolf',      name: 'Sói Bóng Tối',          kind: 'canine',   accent: 'cyan',    size: 1.02 },
  { id: 'shadow_bear',      name: 'Gấu Bóng Tối',          kind: 'ursine',   accent: 'violet',  size: 1.24 },
  { id: 'shadow_eagle',     name: 'Đại Bàng Bóng Tối',     kind: 'raptor',   accent: 'cyan',    size: 1.08 },
  { id: 'shadow_tiger',     name: 'Mãnh Hổ Bóng Tối',      kind: 'feline',   accent: 'pink',    size: 1.14 },
  { id: 'shadow_panther',   name: 'Báo Đen Ám Ảnh',        kind: 'panther',  accent: 'violet',  size: 0.98 },
  { id: 'shadow_lion',      name: 'Sư Tử Bờm Lửa Đen',     kind: 'lion',     accent: 'flame',   size: 1.16 },
  // Sheet 2 (6..11)
  { id: 'shadow_gorilla',   name: 'Khỉ Đột Sơn Quân',      kind: 'ape',      accent: 'violet',  size: 1.22 },
  { id: 'shadow_rhino',     name: 'Tê Giác Thiết Giáp',    kind: 'rhino',    accent: 'cyan',    size: 1.18 },
  { id: 'shadow_elephant',  name: 'Voi Ma Mút Bóng Tối',   kind: 'mammoth',  accent: 'cyan',    size: 1.28 },
  { id: 'shadow_stag',      name: 'Hươu Sừng Kiếm',        kind: 'stag',     accent: 'cyan',    size: 1.10 },
  { id: 'shadow_boar',      name: 'Heo Rừng Nanh Hắc Ám',  kind: 'boar',     accent: 'pink',    size: 1.08 },
  { id: 'shadow_cobra',     name: 'Mãng Xà Vương',         kind: 'cobra',    accent: 'venom',   size: 1.08 },
  // Sheet 3 (12..17)
  { id: 'shadow_scorpion',  name: 'Bọ Cạp Khổng Lồ',      kind: 'scorpion', accent: 'pink',    size: 1.12 },
  { id: 'shadow_spider',    name: 'Nhện Chúa',             kind: 'spider',   accent: 'pink',    size: 1.10 },
  { id: 'shadow_croc',      name: 'Cá Sấu Đầm Lầy',        kind: 'croc',     accent: 'cyan',    size: 1.14 },
  { id: 'shadow_shark',     name: 'Cá Mập Bóng Đêm',       kind: 'shark',    accent: 'cyan',    size: 1.14 },
  { id: 'shadow_bat',       name: 'Dơi Huyết Ma',          kind: 'bat',      accent: 'crimson', size: 1.04 },
  { id: 'shadow_falcon',    name: 'Ưng Sấm Bóng Đêm',      kind: 'falcon',   accent: 'bolt',    size: 1.02 },
  // Sheet 4 (18..23: 4 canonical + 2 wood variants = 24 total!)
  { id: 'shadow_mantis',        name: 'Bọ Ngựa Lưỡi Liềm', kind: 'mantis',   accent: 'cyan',    size: 1.08 },
  { id: 'shadow_crab',          name: 'Cua Thiết Giáp',     kind: 'crab',     accent: 'violet',  size: 1.18 },
  { id: 'shadow_treant',        name: 'Mộc Ảnh Cự Thú',     kind: 'treant',   accent: 'soul',    size: 1.22 },
  { id: 'shadow_dragon',        name: 'Hắc Long Bóng Tối',  kind: 'dragon',   accent: 'flame',   size: 1.30 },
  { id: 'shadow_vine_hydra',    name: 'Đằng Xà Mộc Ảnh',   kind: 'hydra',    accent: 'venom',   size: 1.16 },
  { id: 'shadow_thorn_stalker', name: 'Gai Ảnh Sát Thủ',    kind: 'stalker',  accent: 'crimson', size: 1.14 }
];

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
  ink: '#05030a',
  void: '#0b0717',
  deep: '#170e2e',
  mid: '#28184d',
  plate: '#3e2573',
  spec: '#623db0',
  bounce: '#35145c',
  auraOuter: '#4c107a',
  auraMid: '#992eff',
  auraHot: '#df88ff',
  vein: '#b866ff',
  veinBright: '#f2dcff',
  cyanDeep: '#0c5c85',
  cyan: '#00eeff',
  cyanPale: '#cffaff',
  pink: '#ff2e85',
  crimson: '#ff174f',
  venom: '#39ff88',
  venomDeep: '#0f7040',
  bolt: '#ffe869',
  white: '#ffffff',
  bone: '#dce6f7'
};
const RGB_CACHE = {};
for (const k of Object.keys(PAL)) RGB_CACHE[PAL[k]] = hexToRgb(PAL[k]);

function accentCols(accent) {
  if (accent === 'cyan') return { main: PAL.cyan, pale: PAL.cyanPale, rim: PAL.auraHot, deep: PAL.cyanDeep };
  if (accent === 'pink' || accent === 'crimson') return { main: PAL.pink, pale: '#ffc2da', rim: PAL.crimson, deep: '#7a0c38' };
  if (accent === 'venom') return { main: PAL.venom, pale: '#c8ffde', rim: PAL.auraMid, deep: PAL.venomDeep };
  if (accent === 'bolt') return { main: PAL.bolt, pale: PAL.white, rim: PAL.cyan, deep: PAL.cyanDeep };
  if (accent === 'soul') return { main: '#5ce1e6', pale: PAL.veinBright, rim: PAL.auraHot, deep: '#1b576e' };
  if (accent === 'flame') return { main: PAL.cyan, pale: PAL.white, rim: PAL.pink, deep: PAL.auraMid };
  return { main: PAL.auraHot, pale: PAL.veinBright, rim: PAL.cyan, deep: PAL.auraOuter };
}

// Body material tags (shaded volumetrically before compositing!)
const MAT_BACK = '__BACK__';
const MAT_BODY = '__BODY__';
const MAT_ARMOR = '__ARMOR__';

function createBuffer(w, h) { return { w, h, data: new Array(w * h).fill(null) }; }
function pset(buf, x, y, col) {
  x = Math.round(x); y = Math.round(y);
  if (x < 1 || y < 1 || x >= buf.w - 1 || y >= buf.h - 1 || !col) return;
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
function ellipse(buf, cx, cy, rx, ry, rot, col) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const mr = Math.ceil(Math.max(rx, ry)) + 1;
  for (let y = Math.floor(cy - mr); y <= Math.ceil(cy + mr); y++) {
    for (let x = Math.floor(cx - mr); x <= Math.ceil(cx + mr); x++) {
      const dx = x - cx, dy = y - cy;
      const lx = (dx * ca + dy * sa) / Math.max(0.5, rx);
      const ly = (-dx * sa + dy * ca) / Math.max(0.5, ry);
      if (lx * lx + ly * ly <= 1.0) pset(buf, x, y, col);
    }
  }
}
function capsule(buf, x0, y0, x1, y1, r0, r1, col) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.8));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    disc(buf, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, col);
  }
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

// =========================================================================
// 32-BIT SOLO-LEVELING VOLUMETRIC PIXEL SHADER + FILIGREE + RISING SMOKE!
// =========================================================================
function shadeAndOutlineBeast(bBuf, ac, phase, strike, seed) {
  const w = bBuf.w, h = bBuf.h;
  const orig = bBuf.data.slice();
  const isMat = v => v === MAT_BACK || v === MAT_BODY || v === MAT_ARMOR;

  // 1. Shade every material pixel with top-left specular armor rim, Bayer dithered musculature,
  //    dark obsidian core, bottom purple bounce light, and pulsing Solo-Leveling filigree veins!
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const m = orig[idx];
      if (!isMat(m)) continue;

      const emptyUp = !orig[(y - 1) * w + x];
      const emptyLeft = !orig[y * w + (x - 1)];
      const emptyDown = !orig[(y + 1) * w + x];
      const emptyUp2 = y >= 2 && !orig[(y - 2) * w + x];
      const bayer = BAYER[y & 3][x & 3] / 16;

      if (m === MAT_BACK) {
        // Far legs / back wings pushed deep into shadow for instant depth separation!
        bBuf.data[idx] = emptyUp ? PAL.mid : (bayer < 0.35 ? PAL.deep : PAL.ink);
        continue;
      }

      // Organic branching filigree vein field (curved crack lines like Shadow Monarch armor!)
      const vField = Math.sin(x * 0.34 + Math.sin(y * 0.28 + phase * 0.5) * 1.9)
                   + Math.cos(y * 0.31 - Math.sin(x * 0.22) * 1.6);
      const onVein = Math.abs(vField) < (0.14 + strike * 0.05) && !emptyUp && !emptyDown;

      if (onVein) {
        bBuf.data[idx] = (bayer < 0.35 + strike * 0.35) ? ac.main : PAL.vein;
      } else if (emptyUp || (emptyLeft && emptyUp2)) {
        // Top-left rim highlight on chitin/armor/muscle!
        bBuf.data[idx] = m === MAT_ARMOR ? (bayer < 0.55 ? PAL.spec : PAL.plate) : PAL.plate;
      } else if (emptyUp2) {
        // Upper muscle/plate midtone with crisp Bayer pixel dithering
        bBuf.data[idx] = m === MAT_ARMOR
          ? (bayer < 0.5 ? PAL.plate : PAL.mid)
          : (bayer < 0.5 ? PAL.mid : PAL.deep);
      } else if (emptyDown) {
        // Subtle purple abyssal ground-bounce light
        bBuf.data[idx] = bayer < 0.6 ? PAL.bounce : PAL.deep;
      } else {
        // Textured obsidian-violet shadow core (chitin/scale/fur micro-dither)
        const scaleTex = ((x + y) & 1) === 0 && bayer < (m === MAT_ARMOR ? 0.42 : 0.22);
        bBuf.data[idx] = scaleTex ? PAL.mid : (bayer < 0.55 ? PAL.deep : PAL.void);
      }
    }
  }

  // 2. Crisp dark obsidian inner outline + glowing Solo-Leveling spectral outer flame aura
  //    + rising curled shadow smoke tendrils off the dorsal contour!
  const shaded = bBuf.data.slice();
  const d4 = [[-1,0],[1,0],[0,-1],[0,1]];
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      if (shaded[y * w + x]) continue;
      let adj = false, below = false;
      for (const [dx, dy] of d4) {
        if (shaded[(y + dy) * w + (x + dx)]) {
          adj = true;
          if (dy === 1) below = true;
        }
      }
      if (adj) {
        const bayer = BAYER[y & 3][x & 3] / 16;
        // Brighter neon flame along dorsal/front edges, deep aura underneath
        bBuf.data[y * w + x] = below
          ? (bayer < 0.55 + strike * 0.25 ? ac.rim : PAL.auraMid)
          : PAL.ink;

        // Rising Solo-Leveling shadow-flame wisps off top silhouette!
        if (below && ((x * 7 + seed * 3) % 5 === 0)) {
          const wh = 2 + Math.floor(hash(x * 31 + seed * 17) * (3.5 + strike * 3));
          const sway = Math.round(Math.sin(phase + x * 0.4));
          for (let wy = 1; wy <= wh; wy++) {
            const ty = y - wy, tx = x + (wy > 1 ? sway : 0);
            if (ty >= 1 && tx >= 1 && tx < w - 1 && !bBuf.data[ty * w + tx]) {
              bBuf.data[ty * w + tx] = wy === wh ? PAL.auraOuter : (wy === 1 ? ac.main : PAL.auraMid);
            }
          }
        }
      }
    }
  }
}

function drawGroundShadow(buf, cx, cy, rx, ac, seed) {
  const ry = Math.max(2.5, rx * 0.24);
  for (let y = Math.max(0, Math.floor(cy - ry - 1)); y <= Math.min(CH - 1, Math.ceil(cy + ry + 1)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx - 1)); x <= Math.min(CW - 1, Math.ceil(cx + rx + 1)); x++) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d > 1.0) continue;
      const bayer = BAYER[y & 3][x & 3] / 16;
      if (d < 0.65) pset(buf, x, y, PAL.ink);
      else if (bayer < (1 - d) * 2.4) pset(buf, x, y, d > 0.82 ? PAL.auraOuter : PAL.void);
    }
  }
}

function drawPortalBase(buf, cx, cy, rx, ry, ac, seed) {
  for (let y = Math.max(0, Math.floor(cy - ry - 2)); y <= Math.min(CH - 1, Math.ceil(cy + ry + 2)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx - 2)); x <= Math.min(CW - 1, Math.ceil(cx + rx + 2)); x++) {
      const nx = (x - cx) / Math.max(1, rx), ny = (y - cy) / Math.max(1, ry), d = Math.hypot(nx, ny);
      if (d > 1.08) continue;
      const swirl = Math.sin(d * 12 - seed * 0.65 + Math.atan2(ny, nx) * 3);
      pset(buf, x, y,
        d > 0.90 ? (swirl > 0 ? PAL.white : ac.main) :
        d > 0.72 ? (swirl > -0.2 ? ac.rim : PAL.auraMid) :
        d > 0.45 ? (swirl > 0.2 ? PAL.auraOuter : PAL.deep) : PAL.ink
      );
    }
  }
}

function drawSlashArc(buf, ox, oy, aimA, rad, thick, ac, dissolve = 0, span = 1.45, seed = 1) {
  for (let y = Math.max(0, Math.floor(oy - rad - thick - 4)); y <= Math.min(CH - 1, Math.ceil(oy + rad + thick + 4)); y++) {
    for (let x = Math.max(0, Math.floor(ox - rad - thick - 4)); x <= Math.min(CW - 1, Math.ceil(ox + rad + thick + 4)); x++) {
      const dx = x - ox, dy = y - oy, r = Math.hypot(dx, dy);
      let da = Math.atan2(dy, dx) - aimA;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > span) continue;
      const taper = Math.pow(1 - Math.abs(da) / span, 0.65);
      const lt = thick * taper;
      const dist = Math.abs(r - (rad + Math.sin(da * 9 + seed) * 1.1));
      if (dist > lt) continue;
      let heat = (1 - dist / Math.max(0.8, lt)) * (1 - dissolve * 0.85);
      if (heat + BAYER[y & 3][x & 3] / 36 < 0.28) continue;
      pset(buf, x, y, heat > 0.72 ? PAL.white : heat > 0.48 ? ac.main : heat > 0.28 ? ac.rim : PAL.auraOuter);
    }
  }
}

function drawChargeSparks(buf, cx, cy, windup, ac, seed) {
  if (windup <= 0.08) return;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + seed * 0.35;
    const r = (1 - windup * 0.75) * 18 + 3;
    const sx = cx + Math.cos(a) * r, sy = cy + Math.sin(a) * r * 0.8;
    line(buf, sx, sy, cx + Math.cos(a) * (r - 3.5), cy + Math.sin(a) * (r - 3.5) * 0.8, 1, i % 2 ? PAL.white : ac.main);
  }
}

function drawImpactSparks(buf, cx, cy, count, spread, u, ac, seed) {
  for (let i = 0; i < count; i++) {
    const a = -1.3 + (i / Math.max(1, count - 1)) * 2.6 + (hash(i * 13 + seed) - 0.5) * 0.3;
    const dist = 4 + u * spread * (0.6 + hash(i * 29) * 0.6);
    const sx = cx + Math.cos(a) * dist, sy = cy + Math.sin(a) * dist * 0.75;
    pset(buf, sx, sy, i % 3 === 0 ? PAL.white : i % 2 ? ac.main : ac.rim);
  }
}

// =========================================================================
// BESPOKE 32-BIT ANATOMY + 4-PHASE SAKUGA SKILLS FOR ALL 24 SHADOW BEASTS!
// =========================================================================
function drawBeastPose(buf, spec, state) {
  const bBuf = createBuffer(CW, CH);
  const vfxBuf = createBuffer(CW, CH);
  const ac = accentCols(spec.accent);
  const s = spec.size;
  const { mode, u, phase, strike, windup, recover, seed } = state;
  const k = spec.kind;
  const flying = ['raptor', 'bat', 'falcon', 'dragon'].includes(k);

  const breath = Math.sin(phase) * 1.1;
  const bob = mode === 'walk' ? -Math.abs(Math.sin(phase)) * 2.2 : breath * 0.55;
  const lungeX = strike * 9.5 - windup * 4.5;
  const lungeY = -strike * 3.0 + windup * 2.0;
  const bx = AX + lungeX, by = AY + bob;

  // Ground shadow anchor (smaller when flying)
  if (mode !== 'spawn') {
    drawGroundShadow(buf, bx, AY + 1, (flying ? 11 : 15) * s, ac, seed);
  }

  // Helper: Glowing Shadow Monarch Eye + Sweeping Neon Trail!
  const drawEye = (ex, ey, flare = 1) => {
    pset(vfxBuf, ex, ey, PAL.white);
    pset(vfxBuf, ex + 1, ey, ac.pale);
    pset(vfxBuf, ex - 1, ey, ac.main);
    if (flare > 0.25) {
      const len = 3 + flare * 4.5;
      line(vfxBuf, ex - len, ey - 1.2 - Math.sin(phase) * 0.6, ex - 1, ey, 1.1, ac.main);
      pset(vfxBuf, ex - len - 1, ey - 1.5, ac.rim);
    }
  };

  // ---------------- 1. QUADRUPED PREDATORS (Wolf, Tiger, Panther, Lion) ----------------
  if (['canine', 'feline', 'panther', 'lion'].includes(k)) {
    const stride = mode === 'walk' ? phase : (strike > 0.2 ? 1.15 : -0.35 - windup * 0.4);
    const bodyLen = k === 'panther' ? 15 * s : 13 * s;
    const hipX = bx - bodyLen * 0.55, hipY = by - 11.5 * s + lungeY * 0.3;
    const shX = bx + bodyLen * 0.52, shY = by - 13 * s + lungeY;

    const blinkVanish = k === 'panther' && windup > 0.45 && strike < 0.15;
    if (!blinkVanish) {
      // Far-side shadow legs (MAT_BACK for 3D depth!)
      for (const [isF, ox, oy, ph] of [[false, hipX - 1, hipY, stride], [true, shX - 1, shY, stride + Math.PI]]) {
        const fx = ox + Math.sin(ph) * (mode === 'walk' ? 5 : 2.5);
        const fy = AY - (mode === 'walk' ? Math.max(0, Math.cos(ph) * 2.5) : 0);
        capsule(bBuf, ox, oy, (ox + fx) * 0.5, (oy + fy) * 0.5, 2.2 * s, 1.5 * s, MAT_BACK);
        capsule(bBuf, (ox + fx) * 0.5, (oy + fy) * 0.5, fx, fy, 1.5 * s, 1.1 * s, MAT_BACK);
      }

      // Whipping tail(s): Panther has twin assassin ribbon-blades!
      const tailCount = k === 'panther' ? 2 : 1;
      for (let tc = 0; tc < tailCount; tc++) {
        for (let i = 0; i < 10; i++) {
          const tu = i / 9;
          const tx = hipX - 2 - i * 1.85 * s;
          const ty = hipY - 1 - tc * 3 + Math.sin(phase + i * 0.55 + tc) * 2.6 - tu * (k === 'panther' ? 7 : 4);
          disc(bBuf, tx, ty, Math.max(0.9, (2.5 - tu * 1.4) * s), tu > 0.6 ? MAT_ARMOR : MAT_BODY);
        }
      }

      // Sculpted Ribcage, Narrow Waist & Muscular Haunches!
      capsule(bBuf, hipX, hipY, shX, shY, 4.4 * s, (k === 'lion' ? 6.2 : k === 'panther' ? 4.5 : 5.5) * s, MAT_BODY);
      disc(bBuf, shX - 1, shY - 0.5, (k === 'lion' ? 6.4 : 5.2) * s, MAT_ARMOR); // armored shoulder plate

      // Near-side articulated 3-joint legs + glowing claws!
      for (const [isF, ox, oy, ph] of [[false, hipX + 1, hipY, stride + Math.PI], [true, shX + 1, shY, stride]]) {
        const swing = Math.sin(ph) * (mode === 'walk' ? 6.0 : 3.0) + (isF ? strike * 6.5 : -strike * 3);
        const lift = mode === 'walk' ? Math.max(0, Math.cos(ph) * 3.8) : (isF && strike > 0.2 ? 5.5 : 0);
        const fx = ox + swing, fy = AY - lift;
        const kx = (ox + fx) * 0.5 + (isF ? 1.8 : -2.4), ky = (oy + fy) * 0.5;
        capsule(bBuf, ox, oy, kx, ky, (isF ? 2.8 : 3.3) * s, 2.0 * s, MAT_ARMOR);
        capsule(bBuf, kx, ky, fx, fy, 1.9 * s, 1.4 * s, MAT_BODY);
        pset(vfxBuf, fx + 1.5, fy, ac.main); pset(vfxBuf, fx + 2.5, fy, PAL.white);
      }

      // Species Crests / Manes / Stripes
      const hx = shX + 6 * s, hy = shY - 3.8 * s;
      if (k === 'canine') {
        // Wolf razor shoulder & neck hackle spikes!
        for (let m = 0; m < 4; m++) {
          polyTri(bBuf, shX - m * 2.8, shY - 3, shX - m * 2.8 - 4.5, shY - 10 * s + m, shX - m * 2.8 + 2.5, shY - 3, MAT_ARMOR);
        }
      } else if (k === 'lion') {
        // Blazing Grand Darkfire Mane!
        for (let a = -2.5; a <= 1.3; a += 0.32) {
          const mr = (8.8 + strike * 3.5 + Math.sin(phase * 2 + a * 4) * 1.4) * s;
          polyTri(bBuf, shX + 1, shY - 5, shX + 2 + Math.cos(a) * mr, shY - 2 + Math.sin(a) * mr, shX + 3, shY + 2, MAT_ARMOR);
          if (Math.abs(a + 0.6) < 1.2) pset(vfxBuf, shX + 2 + Math.cos(a) * (mr + 1), shY - 2 + Math.sin(a) * (mr + 1), ac.main);
        }
      }

      // Sculpted Predator Skull, Pointed Ears & Fanged Snout
      disc(bBuf, hx, hy, 4.0 * s, MAT_ARMOR);
      polyTri(bBuf, hx - 1, hy - 2, hx - 4.5 * s, hy - 9 * s, hx + 1.5, hy - 2, MAT_ARMOR);
      const jaw = (strike > 0.2 || (k === 'lion' && strike > 0.1)) ? 3.6 : 0.8;
      capsule(bBuf, hx + 1, hy - 1, hx + 7 * s, hy - 1.2, 2.4 * s, 1.6 * s, MAT_ARMOR);
      capsule(bBuf, hx + 1, hy + 1, hx + 6.2 * s, hy + 1.2 + jaw, 1.8 * s, 1.1 * s, MAT_BODY);

      shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);

      // Post-shade crisp details: glowing tiger stripes, fangs, eyes!
      if (k === 'feline') {
        for (let st = -2; st <= 2; st++) {
          line(vfxBuf, bx + st * 2.8, hipY - 3, bx + st * 2.4 - 1, hipY + 2.5, 1.1, st === 0 ? PAL.white : ac.main);
        }
      }
      pset(vfxBuf, hx + 6.5 * s, hy, PAL.white);
      pset(vfxBuf, hx + 5.8 * s, hy + jaw, PAL.white);
      drawEye(hx + 2.2, hy - 1.6, 0.7 + strike);
      drawChargeSparks(vfxBuf, hx + 4, hy, windup, ac, seed);
    } else {
      // Panther Shadow-Step Afterimage Streaks!
      for (let g = 0; g < 10; g++) {
        const gx = bx - 12 + g * 2.8, gy = by - 16 + Math.sin(g + seed) * 4;
        line(vfxBuf, gx - 5, gy, gx + 5, gy, 1.6, g % 2 ? ac.main : PAL.auraMid);
      }
    }

    // 4-Phase Quadruped Sakuga Skill VFX!
    if (mode === 'attack' && strike > 0.12) {
      if (k === 'canine') {
        // Wolf Abyssal Fang Crunch: Giant spectral upper & lower jaws clamping down + crimson bleed slash!
        const jx = bx + 20, jy = by - 14, clampY = Math.max(1, (1 - strike) * 9);
        drawSlashArc(vfxBuf, bx + 14, jy, 0, 15, 4.5, { main: PAL.crimson, rim: ac.main }, recover * 0.8, 1.1, seed);
        for (let f = -2; f <= 2; f++) {
          polyTri(vfxBuf, jx + f * 3 - 1.2, jy - 8 - clampY, jx + f * 3, jy - 1 - clampY * 0.4, jx + f * 3 + 1.2, jy - 8 - clampY, f === 0 ? PAL.white : ac.main);
          polyTri(vfxBuf, jx + f * 3 - 1.2, jy + 8 + clampY, jx + f * 3, jy + 1 + clampY * 0.4, jx + f * 3 + 1.2, jy + 8 + clampY, f === 0 ? PAL.white : PAL.crimson);
        }
        drawImpactSparks(vfxBuf, jx + 2, jy, 8, 16, 1 - recover, ac, seed);
      } else if (k === 'feline') {
        // Tiger Savage Twin-Crescent Cross Rend!
        drawSlashArc(vfxBuf, bx + 12, by - 15, -0.45, 20, 5.5, ac, recover * 0.8, 1.2, seed);
        drawSlashArc(vfxBuf, bx + 12, by - 15, 0.45, 20, 5.5, { main: PAL.white, rim: ac.main }, recover * 0.8, 1.2, seed + 3);
        drawImpactSparks(vfxBuf, bx + 26, by - 15, 10, 18, 1 - recover, ac, seed);
      } else if (k === 'panther') {
        // Panther Shadow-Guillotine Wide Execution Crescent!
        drawSlashArc(vfxBuf, bx + 14, by - 15, 0.1, 22, 7.0, ac, recover * 0.75, 1.55, seed);
        line(vfxBuf, bx - 8, by - 14, bx + 36, by - 14, 1.6, PAL.white);
      } else if (k === 'lion') {
        // Lion Sovereign Darkfire Roar: 3 Blazing Shockwave Cones + Ground Rupture!
        for (let rIdx = 0; rIdx < 3; rIdx++) {
          const rad = 9 + (1 - recover * 0.4) * 10 + rIdx * 5.2;
          drawSlashArc(vfxBuf, bx + 9, by - 15, 0, rad, 3.0 - rIdx * 0.5, rIdx === 0 ? { main: PAL.white, rim: ac.main } : ac, recover * 0.7, 1.15, seed + rIdx);
        }
        drawImpactSparks(vfxBuf, bx + 20, by - 15, 12, 18, 1 - recover, ac, seed);
      }
    }
  }

  // ---------------- 2. COLOSSAL BRUTES (Bear & Gorilla) ----------------
  else if (k === 'ursine' || k === 'ape') {
    const rearUp = mode === 'attack' ? (windup * 10 + strike * 4) : 0;
    const stride = mode === 'walk' ? phase : 0;
    const hipX = bx - 6, hipY = by - 12 * s;
    const chestX = bx + 4 - rearUp * 0.3, chestY = by - 19 * s - rearUp;

    // Far leg & far arm
    capsule(bBuf, hipX - 2, hipY, bx - 5 - Math.sin(stride) * 4, AY, 4.4 * s, 3.5 * s, MAT_BACK);
    // Near pillar leg with armored greave
    const nfx = bx + 5 + Math.sin(stride) * (mode === 'walk' ? 5 : 0);
    capsule(bBuf, hipX + 2, hipY, nfx, AY, 5.0 * s, 4.0 * s, MAT_ARMOR);

    // Massive sculpted hulk torso & armored pauldrons!
    capsule(bBuf, hipX, hipY, chestX, chestY, 8.2 * s, 9.8 * s, MAT_BODY);
    disc(bBuf, chestX - 2, chestY - 2, 7.8 * s, MAT_ARMOR);
    polyTri(bBuf, chestX - 7, chestY - 5, chestX - 15, chestY - 15, chestX + 1, chestY - 8, MAT_ARMOR);
    polyTri(bBuf, chestX - 3, chestY - 7, chestX - 9, chestY - 18, chestX + 4, chestY - 9, MAT_ARMOR);

    // Fierce Ursine / Titan-Ape Head
    const hx = chestX + 7.5 * s, hy = chestY - 4.5 * s;
    disc(bBuf, hx, hy, 5.0 * s, MAT_ARMOR);
    if (k === 'ursine') {
      disc(bBuf, hx - 2.5, hy - 5, 2.5, MAT_ARMOR);
      capsule(bBuf, hx + 2, hy, hx + 7 * s, hy + 1.5, 3.2, 2.2, MAT_BODY);
    } else {
      polyTri(bBuf, hx - 5, hy - 3, hx - 1, hy - 10, hx + 4, hy - 3, MAT_ARMOR); // gorilla crest
      rect(bBuf, hx + 1, hy, 6, 5, MAT_ARMOR);
    }

    // Colossal Gauntlet Forearm!
    const armA = mode === 'attack' ? (strike > 0.2 ? 0.58 : -1.75) : (0.85 + Math.sin(stride) * 0.35);
    const elbowX = chestX + 2 + Math.cos(armA - 0.3) * 8 * s, elbowY = chestY + 1 + Math.sin(armA - 0.3) * 8 * s;
    const fistX = elbowX + Math.cos(armA + 0.2) * 9 * s, fistY = elbowY + Math.sin(armA + 0.2) * 9 * s;
    capsule(bBuf, chestX + 1, chestY + 1, elbowX, elbowY, 5.2 * s, 4.4 * s, MAT_ARMOR);
    capsule(bBuf, elbowX, elbowY, fistX, fistY, 4.8 * s, 5.2 * s, MAT_ARMOR);

    shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);

    // Glowing X-chest rune scar, fangs & claws!
    line(vfxBuf, chestX - 3, chestY - 2, chestX + 4, chestY + 5, 1.4, ac.main);
    line(vfxBuf, chestX + 4, chestY - 3, chestX - 2, chestY + 5, 1.2, PAL.white);
    pset(vfxBuf, hx + 6.5, hy + 2.5, PAL.white);
    if (k === 'ursine') {
      for (let c = -1; c <= 1; c++) line(vfxBuf, fistX + 3, fistY + c * 2.2, fistX + 8, fistY + c * 2.8 + 1, 1.3, PAL.white);
    }
    drawEye(hx + 3, hy - 1.2, 0.8 + strike);
    drawChargeSparks(vfxBuf, fistX, fistY, windup, ac, seed);

    if (mode === 'attack' && strike > 0.12) {
      if (k === 'ursine') {
        // Bear 4-Claw Titan Rend Arcs!
        for (let c = -1.5; c <= 1.5; c += 1) {
          drawSlashArc(vfxBuf, bx + 10, by - 18 + c * 3, 0.25, 22 + c * 2, 2.2, c === 0.5 ? { main: PAL.white, rim: ac.main } : ac, recover * 0.75, 1.1, seed + c);
        }
      } else {
        // Gorilla Earthshaker Slam: Glowing Crater + 5 Jagged Obsidian Tectonic Spires!
        drawPortalBase(vfxBuf, bx + 20, AY, 24 * (1 - recover * 0.25), 5.5, ac, seed);
        for (let r = 0; r < 5; r++) {
          const rx = bx + 7 + r * 6.5, rh = (6 + (2.5 - Math.abs(r - 2)) * 6) * Math.min(1, strike * 1.3);
          polyTri(vfxBuf, rx - 3.2, AY, rx + (r - 2) * 0.8, AY - rh, rx + 3.2, AY, r % 2 ? PAL.plate : PAL.deep);
          line(vfxBuf, rx - 2.5, AY, rx + (r - 2) * 0.8, AY - rh, 1.2, r === 2 ? PAL.white : ac.main);
        }
        drawImpactSparks(vfxBuf, bx + 20, AY - 6, 10, 20, 1 - recover, ac, seed);
      }
    }
  }

  // ---------------- 3. ARMORED JUGGERNAUTS (Rhino, Mammoth, Boar, Stag) ----------------
  else if (['rhino', 'mammoth', 'boar', 'stag'].includes(k)) {
    const stride = mode === 'walk' ? phase : (strike * 1.2);
    const tall = k === 'mammoth' ? 17 * s : k === 'stag' ? 14.5 * s : 11.5 * s;
    const thick = k === 'mammoth' ? 9.5 * s : k === 'rhino' ? 8.2 * s : k === 'boar' ? 7.4 * s : 4.8 * s;
    const hipX = bx - 9 * s, hipY = by - tall + 2;
    const shX = bx + 7 * s, shY = by - tall - (k === 'mammoth' ? 3.5 : 0) + (windup * 2.5 - strike * 2);
    const legR = k === 'stag' ? 1.8 : 3.6 * s;

    // Far legs
    for (const [ox, ph] of [[hipX - 2, stride], [shX - 3, stride + Math.PI]]) {
      capsule(bBuf, ox, hipY + 2, ox + Math.sin(ph) * 4, AY, legR, legR * 0.8, MAT_BACK);
    }
    // Armored Torso + Overlapping Shoulder Plates!
    capsule(bBuf, hipX, hipY, shX, shY, thick * 0.85, thick, MAT_BODY);
    disc(bBuf, shX - 1, shY, thick * 0.95, MAT_ARMOR);
    if (k === 'boar' || k === 'rhino') {
      for (let m = -2; m <= 2; m++) {
        polyTri(bBuf, bx + m * 3.8 - 2.5, shY - thick * 0.6, bx + m * 3.8 - 1, shY - thick - 6, bx + m * 3.8 + 2.5, shY - thick * 0.6, MAT_ARMOR);
      }
    }
    // Near legs
    for (const [ox, ph] of [[hipX + 1, stride + Math.PI], [shX, stride]]) {
      const lift = mode === 'walk' ? Math.max(0, Math.cos(ph) * 3.2) : (k === 'mammoth' && windup > 0.3 && ox > bx ? 9 : 0);
      const fx = ox + Math.sin(ph) * (mode === 'walk' ? 4.8 : strike * 4), fy = AY - lift;
      capsule(bBuf, ox, hipY + 2, fx, fy, legR * 1.15, legR * 0.9, MAT_ARMOR);
      pset(vfxBuf, fx + 1, fy, ac.main);
    }

    const hx = shX + (k === 'stag' ? 4.5 : 6.5) * s, hy = shY - (k === 'stag' ? 8 : -0.5) * s;
    if (k === 'stag') capsule(bBuf, shX + 1, shY - 1, hx, hy, 3.2 * s, 2.5 * s, MAT_ARMOR);
    disc(bBuf, hx, hy, (k === 'stag' ? 3.6 : 5.2) * s, MAT_ARMOR);
    if (k === 'mammoth') {
      const trLift = windup * 9 - strike * 6;
      capsule(bBuf, hx + 3, hy + 1, hx + 9, hy + 8 - trLift, 3.2, 2.2, MAT_ARMOR);
      capsule(bBuf, hx + 9, hy + 8 - trLift, hx + 14, hy + 4 - trLift * 1.4, 2.2, 1.5, MAT_BODY);
    }

    shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);

    // Iconic Glowing Horns / Tusks / Crystal Sword-Antlers!
    if (k === 'rhino') {
      polyTri(vfxBuf, hx + 3, hy + 1, hx + 16 * s, hy - 7 * s, hx + 7, hy + 4, ac.main);
      line(vfxBuf, hx + 4, hy + 1, hx + 15 * s, hy - 6.5 * s, 1.4, PAL.white);
      polyTri(vfxBuf, hx, hy - 1, hx + 8 * s, hy - 7 * s, hx + 4, hy + 1, PAL.auraHot);
    } else if (k === 'mammoth') {
      for (let t = 0; t <= 14; t++) {
        const u2 = t / 14;
        const tx = hx + 2 + t * 1.25 * s, ty = hy + 3 + Math.sin(u2 * 2.3) * 5.5 - u2 * u2 * 10;
        disc(vfxBuf, tx, ty, 2.1 - u2 * 1.0, u2 > 0.55 ? PAL.white : ac.main);
      }
    } else if (k === 'boar') {
      polyTri(vfxBuf, hx + 2, hy + 3, hx + 12, hy - 4, hx + 6, hy + 5, ac.main);
      line(vfxBuf, hx + 3, hy + 3, hx + 11, hy - 3.5, 1.5, PAL.white);
    } else if (k === 'stag') {
      // Grand Branching Crystal Sword Antlers!
      for (const [dx, dy, c] of [[-6, -15, ac.main], [6, -14, PAL.white], [-11, -11, ac.pale], [11, -10, ac.main], [1, -17, PAL.white]]) {
        line(vfxBuf, hx, hy - 2, hx + dx, hy + dy, 1.7, c);
      }
    }
    drawEye(hx + 2.2, hy - 1.2, 0.8 + strike);
    drawChargeSparks(vfxBuf, hx + 5, hy, windup, ac, seed);

    if (mode === 'attack' && strike > 0.12) {
      if (k === 'rhino' || k === 'boar') {
        // Blazing Spiral Drill-Breaker Shockwave Cone!
        drawSlashArc(vfxBuf, hx + 6, hy, 0, 16, 6.0, ac, recover * 0.7, 1.05, seed);
        polyTri(vfxBuf, hx + 8, hy - 6, hx + 26, hy, hx + 8, hy + 6, ac.main);
        line(vfxBuf, hx + 8, hy, hx + 28, hy, 2.2, PAL.white);
        drawImpactSparks(vfxBuf, hx + 18, hy, 9, 16, 1 - recover, ac, seed);
      } else if (k === 'mammoth') {
        // Mammoth Glacial-Abyssal Seismic Stomp Ring + Ice/Shadow Spires!
        drawPortalBase(vfxBuf, bx + 10, AY, 32 * (1 - recover * 0.25), 7, ac, seed);
        for (let i = -2; i <= 2; i++) {
          const sx = bx + 10 + i * 8, sh = (5 - Math.abs(i)) * 3.5 * strike;
          polyTri(vfxBuf, sx - 2.5, AY, sx, AY - sh, sx + 2.5, AY, i === 0 ? PAL.white : ac.main);
        }
      } else if (k === 'stag') {
        // 3 Spectral Phantom Sword-Projectiles Piercing Forward!
        for (const dy of [-7, 0, 7]) {
          const sx = hx + 9 + (1 - recover * 0.6) * 18, sy = hy + 3 + dy;
          polyTri(vfxBuf, sx - 7, sy - 2, sx + 9, sy, sx - 7, sy + 2, ac.main);
          line(vfxBuf, sx - 5, sy, sx + 8, sy, 1.2, PAL.white);
        }
      }
    }
  }

  // ---------------- 4. FLYING RAPTORS & VAMPIRE BAT (Eagle, Bat, Falcon) ----------------
  else if (['raptor', 'bat', 'falcon'].includes(k)) {
    const flap = Math.sin(mode === 'walk' ? phase * 1.5 : phase) * 11 + (windup * -9 + strike * 12);
    const cx = bx + (k === 'falcon' ? strike * 7 : 0), cy = by - 24 - Math.sin(phase) * 3 + strike * (k === 'falcon' ? 7 : 2);
    const span = (k === 'raptor' ? 21 : k === 'bat' ? 19 : 18) * s;

    // Far wing (MAT_BACK) & Near wing (MAT_ARMOR) with sculpted primary feathers / bat fingers!
    for (const [side, mat] of [[-1, MAT_BACK], [1, MAT_ARMOR]]) {
      const wx = cx + side * span, wy = cy - 7 - flap * (side === 1 ? 0.95 : 0.72);
      polyTri(bBuf, cx, cy - 3, wx, wy, cx + side * 8, cy + 6, mat);
      for (let f = 1; f <= 4; f++) {
        const fx0 = cx + side * f * 3.5, fy0 = cy + 1;
        const fx1 = wx * (f / 4.2) + cx * (1 - f / 4.2) + side * 3, fy1 = wy + f * 3.6;
        capsule(bBuf, fx0, fy0, fx1, fy1, 1.8, 0.9, mat);
      }
    }
    // Streamlined Raptor/Bat Torso, Tail & Talons
    capsule(bBuf, cx - 8, cy + 5, cx + 5, cy - 2, 3.8 * s, 4.6 * s, MAT_BODY);
    polyTri(bBuf, cx - 6, cy + 4, cx - 17, cy + 10, cx - 11, cy + 15, MAT_ARMOR);
    disc(bBuf, cx + 6, cy - 3, 3.6 * s, MAT_ARMOR);
    if (k === 'bat') {
      polyTri(bBuf, cx + 3, cy - 5, cx + 2, cy - 13, cx + 6, cy - 6, MAT_ARMOR);
      polyTri(bBuf, cx + 6, cy - 5, cx + 8, cy - 13, cx + 9, cy - 5, MAT_ARMOR);
    }

    shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);

    if (k !== 'bat') polyTri(vfxBuf, cx + 8, cy - 4, cx + 14, cy - 1.5, cx + 8, cy + 0.5, PAL.white); // razor beak
    line(vfxBuf, cx + 1, cy + 5, cx + 5, cy + 10, 1.3, ac.main); // glowing talons
    drawEye(cx + 7, cy - 3.5, 0.9 + strike);
    drawChargeSparks(vfxBuf, cx + 6, cy - 2, windup, ac, seed);

    if (mode === 'attack' && strike > 0.12) {
      if (k === 'raptor') {
        // Eagle Tempest: Crescent Wing-Gale + 3 Razor Feather Daggers!
        drawSlashArc(vfxBuf, cx + 8, cy + 2, 0.15, 16, 4.0, ac, recover * 0.75, 1.2, seed);
        for (const dy of [-8, 0, 8]) {
          const fx = cx + 16 + (1 - recover * 0.5) * 18, fy = cy + 3 + dy;
          polyTri(vfxBuf, fx - 6, fy - 1.8, fx + 7, fy, fx - 6, fy + 1.8, ac.main);
          line(vfxBuf, fx - 3, fy, fx + 6, fy, 1, PAL.white);
        }
      } else if (k === 'bat') {
        // Vampire Bat Crimson Sonic-Siphon Rings + Blood Orbs!
        for (let r = 0; r < 3; r++) {
          drawSlashArc(vfxBuf, cx + 10 + r * 6, cy + 2, 0.15, 7 + r * 4, 2.2, ac, recover * 0.6, 1.0, seed + r);
        }
        disc(vfxBuf, cx + 22 - strike * 6, cy + 3, 2.4, PAL.crimson);
        pset(vfxBuf, cx + 22 - strike * 6, cy + 3, PAL.white);
      } else if (k === 'falcon') {
        // Thunder Falcon Volt-Piercer Dive Spear + Jagged Lightning Arcs!
        polyTri(vfxBuf, cx - 12, cy - 12, cx + 28, cy + 14, cx - 6, cy - 2, ac.rim);
        line(vfxBuf, cx - 14, cy - 10, cx + 28, cy + 14, 3.0, ac.main);
        line(vfxBuf, cx - 10, cy - 8, cx + 29, cy + 14, 1.3, PAL.white);
        // Crackling zigzag thunderbolts!
        for (let b = 0; b < 4; b++) {
          const lx = cx - 4 + b * 7, ly = cy - 4 + b * 4;
          line(vfxBuf, lx, ly, lx + 3, ly - 5, 1.1, PAL.bolt);
          line(vfxBuf, lx + 3, ly - 5, lx + 7, ly - 1, 1.1, PAL.white);
        }
      }
    }
  }

  // ---------------- 5. REPTILES & ABYSSAL SHARK (Cobra, Vine Hydra, Croc, Shark) ----------------
  else if (['cobra', 'hydra', 'croc', 'shark'].includes(k)) {
    if (k === 'cobra' || k === 'hydra') {
      // Heavy muscular S-coiled serpent base
      for (let c = 0; c < 14; c++) {
        const u2 = c / 13;
        const sx = bx - 6 + Math.sin(u2 * Math.PI * 2.6 + phase) * (11 - u2 * 4.5);
        const sy = AY - 3 - u2 * 13;
        disc(bBuf, sx, sy, (5.4 - u2 * 1.5) * s, c < 5 ? MAT_BODY : MAT_ARMOR);
      }
      if (k === 'cobra') {
        const hx = bx + 4 + strike * 8, hy = by - 25 + lungeY;
        // Wide Flared King-Cobra Hood!
        ellipse(bBuf, hx - 2, hy + 5, 8.5 * s, 5.5 * s, -0.35, MAT_ARMOR);
        capsule(bBuf, bx - 2, by - 12, hx, hy, 4.5 * s, 3.8 * s, MAT_BODY);
        disc(bBuf, hx + 2.5, hy, 4.0 * s, MAT_ARMOR);
        shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);
        // Glowing Twin Hood Runes & Venom Fangs!
        disc(vfxBuf, hx - 4, hy + 4, 1.6, ac.main); pset(vfxBuf, hx - 4, hy + 4, PAL.white);
        line(vfxBuf, hx + 6, hy + 1, hx + 11, hy + (strike > 0.2 ? 3 : 0), 1.1, PAL.pink);
        pset(vfxBuf, hx + 5.5, hy + 1.5, PAL.white);
        drawEye(hx + 3.5, hy - 1.2, 0.9 + strike);
      } else {
        // VINE HYDRA (Đằng Xà Mộc Ảnh): TRUE 3-HEADED BRIAR WYRM HYDRA!
        const heads = [
          { ox: -5, oy: -28, mat: MAT_BACK, sc: 0.85 },
          { ox: 7,  oy: -25, mat: MAT_ARMOR, sc: 1.05 },
          { ox: 2,  oy: -16, mat: MAT_ARMOR, sc: 0.92 }
        ];
        for (const hd of heads) {
          const hx = bx + hd.ox + strike * 8 * hd.sc, hy = by + hd.oy + lungeY;
          capsule(bBuf, bx - 2, by - 12, hx, hy, 3.6 * hd.sc, 3.0 * hd.sc, hd.mat);
          disc(bBuf, hx + 2, hy, 3.6 * hd.sc, hd.mat);
          polyTri(bBuf, hx - 1, hy - 2, hx - 6, hy - 7, hx + 2, hy - 3, hd.mat); // dragon-thorn horns!
        }
        shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);
        for (const hd of heads) {
          const hx = bx + hd.ox + strike * 8 * hd.sc, hy = by + hd.oy + lungeY;
          pset(vfxBuf, hx + 5, hy + 1, PAL.white);
          drawEye(hx + 3, hy - 1, 0.7 + strike);
        }
      }
      if (mode === 'attack' && strike > 0.12) {
        // Venomous Acid Barrage + Toxic Splash Arc!
        drawSlashArc(vfxBuf, bx + 12, by - 20, 0.1, 15, 3.8, ac, recover * 0.75, 1.1, seed);
        for (const [i, dy] of [-7, 0, 7].entries()) {
          const vx = bx + 16 + (1 - recover * 0.5) * 18 - i * 2, vy = by - 20 + dy;
          disc(vfxBuf, vx, vy, 2.6, ac.main);
          pset(vfxBuf, vx + 1, vy, PAL.white);
          line(vfxBuf, vx - 6, vy, vx, vy, 1.2, ac.rim);
        }
      }
    } else if (k === 'croc') {
      // Sinuous Armored Swamp Leviathan Crocodile!
      const whip = mode === 'attack' ? Math.sin(strike * Math.PI) * 14 : 0;
      for (let t = 0; t < 8; t++) {
        const tx = bx - 6 - t * 2.4 + whip * (t / 7), ty = by - 5 - Math.sin(phase + t * 0.5) * 2 - whip * 0.3 * (t / 7);
        disc(bBuf, tx, ty, (4.8 - t * 0.45) * s, MAT_BODY);
      }
      capsule(bBuf, bx - 8, by - 6, bx + 8, by - 7, 5.8 * s, 5.4 * s, MAT_ARMOR);
      for (let sc = -2; sc <= 2; sc++) {
        polyTri(bBuf, bx + sc * 4 - 2, by - 10, bx + sc * 4, by - 16, bx + sc * 4 + 2, by - 10, MAT_ARMOR);
      }
      const jaw = strike > 0.2 ? 5.0 : 1.0;
      capsule(bBuf, bx + 6, by - 8, bx + 21, by - 9 - jaw * 0.6, 3.2, 2.2, MAT_ARMOR);
      capsule(bBuf, bx + 6, by - 4, bx + 19, by - 3 + jaw * 0.5, 2.6, 1.8, MAT_BODY);
      capsule(bBuf, bx - 5, by - 4, bx - 7 + Math.sin(phase) * 3, AY, 2.6, 2.0, MAT_ARMOR);
      capsule(bBuf, bx + 4, by - 4, bx + 6 - Math.sin(phase) * 3, AY, 2.8, 2.0, MAT_ARMOR);

      shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);
      for (let f = 0; f < 5; f++) {
        pset(vfxBuf, bx + 9 + f * 2.4, by - 7 - jaw * 0.3, PAL.white);
        pset(vfxBuf, bx + 9 + f * 2.2, by - 4 + jaw * 0.3, PAL.white);
      }
      drawEye(bx + 8, by - 10, 0.8 + strike);
      if (mode === 'attack' && strike > 0.12) {
        // Croc Death-Roll Maelstrom!
        drawSlashArc(vfxBuf, bx + 8, by - 9, 0, 23, 6.5, ac, recover * 0.7, 1.65, seed);
      }
    } else if (k === 'shark') {
      // Abyssal Megalodon Shadow-Shark!
      drawPortalBase(buf, bx + 2, AY, (18 + strike * 9) * s, 5, ac, seed);
      if (mode === 'attack' && strike >= 0.15) {
        // GIANT MEGALODON JAWS ERUPTING VERTICALLY FROM SHADOW VORTEX!
        const jy = AY - 4 - strike * 22;
        // Sculpted curved upper snout & lower jaw
        capsule(bBuf, bx - 9, AY - 1, bx - 3, jy - 10, 6.5, 3.8, MAT_ARMOR);
        capsule(bBuf, bx + 9, AY - 1, bx + 5, jy - 8, 5.8, 3.2, MAT_BODY);
        polyTri(bBuf, bx - 14, AY - 2, bx - 18, jy + 4, bx - 8, AY - 2, MAT_ARMOR); // pectoral fin
        shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);
        // Serrated Megalodon Teeth + Abyssal Geyser Splash!
        for (let t = 0; t < 6; t++) {
          pset(vfxBuf, bx - 2 + t * 0.8, jy - 8 + t * 2.2, PAL.white);
          pset(vfxBuf, bx + 4 - t * 0.6, jy - 7 + t * 2.2, PAL.white);
        }
        drawEye(bx - 5, jy - 3, 1.2);
        drawImpactSparks(vfxBuf, bx, jy - 4, 10, 18, 1 - recover, ac, seed);
      } else {
        // Predatory Megalodon Gliding Over Dark Wake!
        const sy = by - 11 + Math.sin(phase) * 2.2;
        capsule(bBuf, bx - 16, sy + Math.sin(phase + 1) * 2.5, bx + 13, sy, 4.2 * s, 6.5 * s, MAT_ARMOR);
        polyTri(bBuf, bx - 3, sy - 4, bx - 7, sy - 18 * s, bx + 5, sy - 4, MAT_ARMOR); // tall sickle dorsal fin!
        polyTri(bBuf, bx + 1, sy + 3, bx - 4, sy + 11, bx + 6, sy + 4, MAT_BODY); // pectoral fin
        polyTri(bBuf, bx - 15, sy, bx - 24, sy - 10, bx - 19, sy + 2, MAT_ARMOR); // upper tail lobe
        polyTri(bBuf, bx - 15, sy, bx - 22, sy + 9, bx - 18, sy - 1, MAT_BODY); // lower tail lobe
        shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);
        for (let g = 0; g < 3; g++) line(vfxBuf, bx + 3 + g * 2, sy - 2, bx + 2 + g * 2, sy + 2, 1, ac.main); // glowing gills!
        for (let f = 0; f < 5; f++) pset(vfxBuf, bx + 7 + f * 1.8, sy + 2.5, PAL.white);
        drawEye(bx + 10, sy - 2, 0.9);
      }
    }
  }

  // ---------------- 6. ARACHNIDS & CARAPACE TITANS (Scorpion, Spider, Mantis, Crab) ----------------
  else if (['scorpion', 'spider', 'mantis', 'crab'].includes(k)) {
    const scutt = mode === 'walk' ? phase * 1.5 : 0;
    const legPairs = k === 'mantis' ? 2 : 4;
    for (let i = 0; i < legPairs; i++) {
      const lx0 = bx - 7 + i * 4.5, ly0 = by - 10;
      const step = Math.sin(scutt + i * 1.7) * (mode === 'walk' ? 3.8 : 0.6);
      // Far leg
      line(bBuf, lx0 - 1, ly0, lx0 - 4 - step * 0.5, AY, 1.8, MAT_BACK);
      // Near articulated 2-segment chitin leg!
      const kx = lx0 + (i < legPairs / 2 ? -5 : 5) + step, ky = by - 17;
      const fx = kx + (i < legPairs / 2 ? -3.5 : 3.5), fy = AY - Math.max(0, step * 0.6);
      capsule(bBuf, lx0, ly0, kx, ky, 2.0, 1.5, MAT_ARMOR);
      capsule(bBuf, kx, ky, fx, fy, 1.5, 1.0, MAT_BODY);
    }

    if (k === 'scorpion') {
      // Overlapping Armored Carapace + Serrated Pincers + Fibonacci Curved Tail!
      ellipse(bBuf, bx, by - 10, 8.5 * s, 5.2 * s, 0, MAT_ARMOR);
      capsule(bBuf, bx + 5, by - 10, bx + 15, by - 13, 3.2, 4.0, MAT_ARMOR);
      // 7-segment curved scorpion tail whipping forward!
      for (let seg = 0; seg < 7; seg++) {
        const u2 = seg / 6;
        const ang = -2.3 + u2 * (strike > 0.2 ? 2.7 : 1.65);
        const rad = 12 + u2 * 6;
        const tx = bx - 2 + Math.cos(ang) * rad + (strike > 0.2 ? u2 * 10 : 0);
        const ty = by - 14 + Math.sin(ang) * rad;
        disc(bBuf, tx, ty, (3.2 - u2 * 0.9) * s, seg % 2 ? MAT_ARMOR : MAT_BODY);
        if (seg === 6) {
          shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);
          polyTri(vfxBuf, tx, ty - 2, tx + 7, ty + 1, tx + 1, ty + 3, ac.main);
          pset(vfxBuf, tx + 6, ty + 1, PAL.white);
          if (mode === 'attack' && strike > 0.12) {
            drawSlashArc(vfxBuf, bx + 8, by - 14, 0, 18, 4.8, ac, recover * 0.75, 1.2, seed);
            drawImpactSparks(vfxBuf, tx + 6, ty + 1, 9, 16, 1 - recover, ac, seed);
          }
        }
      }
      drawEye(bx + 6, by - 11.5, 0.8 + strike);
    } else if (k === 'spider') {
      // Thorny Blood-Moon Spider Queen!
      ellipse(bBuf, bx - 7, by - 14, 8.8 * s, 6.8 * s, -0.25, MAT_ARMOR);
      polyTri(bBuf, bx - 12, by - 18, bx - 17, by - 25, bx - 7, by - 19, MAT_ARMOR);
      polyTri(bBuf, bx - 6, by - 19, bx - 9, by - 26, bx - 2, by - 19, MAT_ARMOR);
      disc(bBuf, bx + 5, by - 11, 5.0 * s, MAT_BODY);
      shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);
      // Glowing Queen Hourglass Crest & Cluster of 6 Eyes!
      polyTri(vfxBuf, bx - 10, by - 17, bx - 4, by - 17, bx - 7, by - 14, ac.main);
      polyTri(vfxBuf, bx - 10, by - 11, bx - 4, by - 11, bx - 7, by - 14, ac.main);
      pset(vfxBuf, bx - 7, by - 14, PAL.white);
      for (let e = 0; e < 3; e++) pset(vfxBuf, bx + 7 + (e % 2), by - 13 + e * 1.5, e === 1 ? PAL.white : ac.main);
      if (mode === 'attack' && strike > 0.12) {
        const wx = bx + 22, wy = by - 13, wr = 13 * (1 - recover * 0.25);
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) line(vfxBuf, wx, wy, wx + Math.cos(a) * wr, wy + Math.sin(a) * wr, 1.1, ac.main);
        for (const rr of [wr * 0.45, wr * 0.85]) {
          for (let a = 0; a < Math.PI * 2; a += 0.25) pset(vfxBuf, wx + Math.cos(a) * rr, wy + Math.sin(a) * rr, rr > wr * 0.6 ? PAL.white : ac.rim);
        }
      }
    } else if (k === 'mantis') {
      // Beru/Reaper-Style Bladed Mantis Assassin!
      ellipse(bBuf, bx - 9, by - 11, 7.5 * s, 4.2 * s, 0.35, MAT_BODY);
      capsule(bBuf, bx - 4, by - 11, bx + 4, by - 24, 3.8 * s, 3.2 * s, MAT_ARMOR);
      polyTri(bBuf, bx + 2, by - 25, bx - 5, by - 33, bx + 7, by - 27, MAT_ARMOR); // swept insectoid crown!
      disc(bBuf, bx + 6, by - 26, 3.8 * s, MAT_ARMOR);
      const scA = strike > 0.2 ? 0.45 : -1.05;
      const sx1 = bx + 12, sy1 = by - 20 + strike * 4;
      capsule(bBuf, bx + 4, by - 22, sx1, sy1, 2.8, 2.4, MAT_ARMOR);
      shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);
      // Giant Glowing Twin Reaper Scythes!
      const tipX = sx1 + Math.cos(scA) * 16, tipY = sy1 + Math.sin(scA) * 16;
      polyTri(vfxBuf, sx1, sy1 - 2, tipX, tipY, sx1 + 3, sy1 + 3, ac.main);
      line(vfxBuf, sx1 + 1, sy1, tipX, tipY, 1.4, PAL.white);
      drawEye(bx + 7.5, by - 26.5, 1.0 + strike);
      if (mode === 'attack' && strike > 0.12) {
        drawSlashArc(vfxBuf, bx + 13, by - 16, -0.4, 21, 5.5, ac, recover * 0.75, 1.25, seed);
        drawSlashArc(vfxBuf, bx + 13, by - 16, 0.4, 21, 5.5, { main: PAL.white, rim: ac.main }, recover * 0.75, 1.25, seed + 5);
      }
    } else if (k === 'crab') {
      // Fortress Dreadnought King-Crab!
      ellipse(bBuf, bx - 1, by - 14, 11 * s, 7.5 * s, 0, MAT_ARMOR);
      for (let sp = -2; sp <= 2; sp++) {
        polyTri(bBuf, bx + sp * 4.2 - 2.5, by - 20, bx + sp * 4.5, by - 28, bx + sp * 4.2 + 2.5, by - 20, MAT_ARMOR);
      }
      const pinY = by - 13 + (strike > 0.2 ? 6 : -5 * windup);
      ellipse(bBuf, bx + 13, pinY, 7.0 * s, 5.2 * s, 0.15, MAT_ARMOR); // giant crusher claw!
      shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);
      line(vfxBuf, bx + 12, pinY - 2, bx + 21, pinY - 0.5, 2.2, ac.main);
      line(vfxBuf, bx + 12, pinY + 2.5, bx + 21, pinY + 1, 2.0, PAL.white);
      drawEye(bx + 6, by - 17, 0.8 + strike);
      if (mode === 'attack' && strike > 0.12) {
        drawSlashArc(vfxBuf, bx + 14, pinY, 0, 14, 5.5, ac, recover * 0.7, 1.2, seed);
        drawImpactSparks(vfxBuf, bx + 22, pinY, 9, 15, 1 - recover, ac, seed);
      }
    }
  }

  // ---------------- 7. ELDERWOOD TREANT & BRIAR THORN STALKER ----------------
  else if (k === 'treant' || k === 'stalker') {
    const sway = Math.sin(phase) * 1.6;
    if (k === 'treant') {
      // Gnarled Haunted Elderwood Titan (twisted root legs, broad bark shoulders, hollow demon maw & soul-flame crown!)
      capsule(bBuf, bx - 5, by - 12, bx - 9 * s, AY, 4.5, 3.5, MAT_ARMOR);
      capsule(bBuf, bx + 5, by - 12, bx + 9 * s, AY, 4.5, 3.5, MAT_ARMOR);
      capsule(bBuf, bx, by - 9, bx + sway, by - 26 * s, 7.5 * s, 9.5 * s, MAT_BODY);
      // Sweeping gnarled antler-boughs!
      capsule(bBuf, bx - 5, by - 24 * s, bx - 17, by - 36 * s, 3.5, 1.6, MAT_ARMOR);
      capsule(bBuf, bx + 5, by - 24 * s, bx + 18, by - 35 * s, 3.5, 1.6, MAT_ARMOR);
      polyTri(bBuf, bx - 9, by - 25 * s, bx - 4, by - 39 * s, bx + 1, by - 26 * s, MAT_ARMOR);
      polyTri(bBuf, bx + 1, by - 26 * s, bx + 6, by - 38 * s, bx + 10, by - 25 * s, MAT_ARMOR);
      // Heavy bark claw-arm slamming down!
      const armY = strike > 0.2 ? by - 8 : by - 22 - windup * 6;
      capsule(bBuf, bx + 7, by - 22 * s, bx + 16, armY, 4.2, 3.8, MAT_ARMOR);

      shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);
      // Hollow glowing spirit eyes & jagged jack-o'-lantern maw!
      drawEye(bx - 2, by - 21 * s, 0.6 + strike);
      drawEye(bx + 4, by - 21 * s, 0.8 + strike);
      for (let t = -2; t <= 2; t++) pset(vfxBuf, bx + 1 + t * 1.8, by - 15 * s + (Math.abs(t) % 2), t === 0 ? PAL.white : ac.main);
      // Floating spectral soul-lantern wisps in branches!
      for (const [wx, wy] of [[-15, -37], [0, -40], [16, -36]]) {
        disc(vfxBuf, bx + wx + sway, by + wy * s, 2.2, ac.rim);
        pset(vfxBuf, bx + wx + sway, by + wy * s, PAL.white);
      }
    } else {
      // THORN STALKER (Gai Ảnh Sát Thủ): Hunched Briar-Antler Wendigo Assassin!
      capsule(bBuf, bx - 4, by - 12, bx - 7 + Math.sin(phase) * 4, AY, 3.2, 2.2, MAT_BACK);
      capsule(bBuf, bx + 2, by - 12, bx + 5 - Math.sin(phase) * 4, AY, 3.6, 2.5, MAT_ARMOR);
      capsule(bBuf, bx - 3, by - 12, bx + 5, by - 24 * s, 5.2 * s, 6.5 * s, MAT_BODY);
      for (let sp = 0; sp < 4; sp++) {
        polyTri(bBuf, bx - 2 + sp * 2, by - 16 - sp * 3, bx - 9 + sp * 2, by - 24 - sp * 3.5, bx + 2 + sp * 2, by - 18 - sp * 3, MAT_ARMOR);
      }
      disc(bBuf, bx + 9, by - 25 * s, 4.2 * s, MAT_ARMOR);
      shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);
      // Crimson briar antlers + whipping thorn-lash!
      line(vfxBuf, bx + 8, by - 28 * s, bx + 2, by - 39 * s, 1.8, ac.main);
      line(vfxBuf, bx + 10, by - 28 * s, bx + 15, by - 38 * s, 1.8, PAL.white);
      drawEye(bx + 11, by - 25.5 * s, 1.0 + strike);
    }

    if (mode === 'attack' && strike > 0.12) {
      // Erupting Abyssal Thorn-Root Forest!
      for (let r = 0; r < 5; r++) {
        const rx = bx + 10 + r * 6, rh = (8 + (4 - r) * 4.5) * Math.min(1, strike * 1.3);
        polyTri(vfxBuf, rx - 2.6, AY, rx + (r % 2 ? 3 : -2), AY - rh, rx + 2.6, AY, r % 2 ? ac.main : ac.rim);
        line(vfxBuf, rx, AY, rx + (r % 2 ? 2.5 : -1.5), AY - rh, 1.1, PAL.white);
      }
    }
  }

  // ---------------- 8. ABYSSAL SHADOW DRAGON (Hắc Long Bóng Tối — Kaisel / Kamish Sovereign!) ----------------
  else {
    const hover = Math.sin(phase) * 2.8;
    const flap = Math.sin(mode === 'walk' ? phase * 1.4 : phase) * 11 - windup * 8 + strike * 10;
    const cx = bx - 5, cy = by - 24 + hover;

    // Far Dragon Wing (MAT_BACK)
    polyTri(bBuf, cx - 2, cy - 4, cx - 20, cy - 15 - flap * 0.7, cx - 9, cy + 5, MAT_BACK);

    // Sinuous Spined Wyrm Tail!
    for (let i = 0; i < 12; i++) {
      const u2 = i / 11;
      const tx = cx - 4 - i * 2.1, ty = cy + 4 + Math.sin(phase + i * 0.5) * 3.2 + u2 * 9;
      disc(bBuf, tx, ty, (4.8 - u2 * 2.8) * s, i % 2 ? MAT_ARMOR : MAT_BODY);
    }

    // Armored Dragon Chest, Clawed Hind Leg & Serpentine S-Neck!
    capsule(bBuf, cx - 4, cy + 3, cx + 5, cy - 3, 5.8 * s, 6.8 * s, MAT_ARMOR);
    capsule(bBuf, cx - 1, cy + 5, cx + 3, cy + 14, 3.2, 2.0, MAT_ARMOR);
    const hx = cx + 13 + strike * 4, hy = cy - 10 + strike * 3;
    capsule(bBuf, cx + 3, cy - 2, (cx + hx) * 0.5, (cy + hy) * 0.5 - 3, 5.2 * s, 4.2 * s, MAT_BODY);
    capsule(bBuf, (cx + hx) * 0.5, (cy + hy) * 0.5 - 3, hx, hy, 4.2 * s, 3.8 * s, MAT_ARMOR);

    // Near Colossal Ribbed Dragon Wing!
    const wx = cx + 14, wy = cy - 17 - flap;
    const wxMid = cx - 8, wyMid = cy - 14 - flap * 0.85;
    polyTri(bBuf, cx, cy - 3, wx, wy, wxMid, wyMid, MAT_ARMOR);
    polyTri(bBuf, cx, cy - 3, wxMid, wyMid, cx - 8, cy + 7, MAT_BODY);
    // Wing finger bones
    line(bBuf, cx, cy - 3, wx, wy, 2.2, MAT_ARMOR);
    line(bBuf, cx, cy - 3, wxMid, wyMid, 1.8, MAT_ARMOR);

    // Horned Sovereign Wyrm Skull & Hinged Fanged Jaws!
    disc(bBuf, hx + 2, hy, 4.8 * s, MAT_ARMOR);
    polyTri(bBuf, hx, hy - 3, hx - 12, hy - 13, hx + 3, hy - 5, MAT_ARMOR); // swept sovereign horn!
    polyTri(bBuf, hx - 1, hy - 1, hx - 9, hy - 8, hx + 2, hy - 3, MAT_ARMOR);
    const jaw = strike > 0.15 ? 4.8 : 1.0;
    capsule(bBuf, hx + 3, hy - 2, hx + 12, hy - 2.5, 2.8, 1.8, MAT_ARMOR);
    capsule(bBuf, hx + 3, hy + 1.5, hx + 11, hy + 2.5 + jaw, 2.2, 1.4, MAT_BODY);

    shadeAndOutlineBeast(bBuf, ac, phase, strike, seed);

    // Glowing Dragon Core, Wing Bone Filigree, Fangs & Sovereign Eyes!
    disc(vfxBuf, cx + 4, cy, 2.0, ac.main); pset(vfxBuf, cx + 4, cy, PAL.white);
    line(vfxBuf, cx + 1, cy - 3, wx, wy, 1.2, PAL.auraHot);
    pset(vfxBuf, hx + 11, hy - 1, PAL.white); pset(vfxBuf, hx + 10, hy + 2 + jaw, PAL.white);
    drawEye(hx + 4.5, hy - 2, 1.2 + strike);
    drawChargeSparks(vfxBuf, hx + 11, hy + 1, windup, ac, seed);

    if (mode === 'attack' && strike > 0.12) {
      // SOVEREIGN ABYSSAL DARKFIRE TORRENT (Shockwave Ring + Multi-Core Cyan/White/Magenta Breath Beam!)
      const mx = hx + 11, my = hy + 1.5;
      drawSlashArc(vfxBuf, mx + 2, my, 0.38, 9, 3.0, ac, recover * 0.6, 1.1, seed);
      for (let f = 0; f < 16; f++) {
        const u2 = f / 15;
        const fx = mx + f * 1.85, fy = my + f * 0.95 + Math.sin(seed * 0.9 + f * 0.7) * (0.8 + u2 * 2.2);
        const r = (2.1 + u2 * 5.0) * (1 - recover * 0.35);
        disc(vfxBuf, fx, fy, r, f % 2 ? PAL.auraOuter : PAL.pink);
        disc(vfxBuf, fx, fy, r * 0.68, PAL.auraMid);
        disc(vfxBuf, fx, fy, r * 0.44, PAL.cyan);
        if (f < 11) disc(vfxBuf, fx, fy, Math.max(1.0, r * 0.24), PAL.white);
      }
      drawImpactSparks(vfxBuf, mx + 22, my + 11, 12, 18, 1 - recover, ac, seed);
    }
  }

  // Composite shaded beast body + glowing VFX!
  for (let i = 0; i < CW * CH; i++) if (bBuf.data[i]) buf.data[i] = bBuf.data[i];
  for (let i = 0; i < CW * CH; i++) if (vfxBuf.data[i]) buf.data[i] = vfxBuf.data[i];
}

// Render any of the 200 frames (0..199) for a given beast spec!
function renderBeastFrame(spec, idx) {
  const buf = createBuffer(CW, CH);
  const ac = accentCols(spec.accent);

  if (idx < 28) {
    // 1. SPAWN (28 frames: 0..27) — "ARISE!" Abyssal rune portal -> shadow geyser -> beast rising & roaring!
    const u = idx / 27;
    const pScale = u < 0.22 ? u / 0.22 : u > 0.85 ? (1 - (u - 0.85) / 0.15 * 0.45) : 1;
    drawPortalBase(buf, AX, AY + 1, 25 * pScale, 6.2 * pScale, ac, idx);
    if (u > 0.10) {
      const rise = Math.min(1, (u - 0.10) / 0.60);
      const temp = createBuffer(CW, CH);
      drawBeastPose(temp, spec, {
        mode: 'spawn', u: rise, phase: rise * Math.PI * 2,
        strike: u > 0.68 ? Math.sin((u - 0.68) / 0.32 * Math.PI) * 0.4 : 0,
        windup: 0, recover: 0, seed: idx
      });
      const shiftY = Math.round((1 - rise) * 40);
      for (let y = 0; y < AY + 1; y++) {
        const sy = y - shiftY;
        if (sy < 0 || sy >= CH) continue;
        for (let x = 0; x < CW; x++) {
          const c = temp.data[sy * CW + x];
          if (c) buf.data[y * CW + x] = rise < 0.35 ? (BAYER[y & 3][x & 3] < 8 ? PAL.auraMid : PAL.void) : c;
        }
      }
    }
    for (let i = 0; i < 12; i++) {
      const sx = AX + (hash(i * 17 + idx) - 0.5) * 38;
      const sy = AY - ((u * 52 + i * 5) % 48);
      line(buf, sx, sy, sx, sy + 2, 1, i % 3 === 0 ? PAL.white : i % 2 ? ac.main : PAL.auraHot);
    }
  } else if (idx < 64) {
    // 2. IDLE (36 frames: 28..63) — Smooth 2-cycle breathing + drifting Solo-Leveling abyssal embers
    const k = idx - 28, u = k / 36;
    drawBeastPose(buf, spec, {
      mode: 'idle', u, phase: u * Math.PI * 4,
      strike: 0, windup: 0, recover: 0, seed: idx
    });
    for (let i = 0; i < 5; i++) {
      const wy = (u * 2 + i * 0.2) % 1;
      if (wy < 0.85) pset(buf, AX - 12 + i * 6.5 + Math.sin(wy * 6 + i) * 2, AY - 6 - wy * 30, wy < 0.35 ? ac.main : PAL.auraMid);
    }
  } else if (idx < 112) {
    // 3. WALK (48 frames: 64..111) — Full 3-stride articulated prowl/flight + trailing shadow sparks
    const k = idx - 64, u = k / 48;
    drawBeastPose(buf, spec, {
      mode: 'walk', u, phase: u * Math.PI * 6,
      strike: 0, windup: 0, recover: 0, seed: idx
    });
    for (let i = 0; i < 6; i++) {
      pset(buf, AX - 14 - ((k * 2 + i * 5) % 18), AY - 2 - ((k + i * 3) % 9), i % 2 ? ac.main : PAL.auraOuter);
    }
  } else {
    // 4. ATTACK (88 frames: 112..199) — 4-Phase Sakuga Skill!
    const k = idx - 112, u = k / 87;
    const windup = u < 0.26 ? Math.sin((u / 0.26) * Math.PI * 0.5) : Math.max(0, 1 - (u - 0.26) / 0.08);
    const strike = u >= 0.24 && u < 0.78 ? Math.sin(Math.min(1, (u - 0.24) / 0.30) * Math.PI * 0.62) : Math.max(0, 1 - Math.max(0, u - 0.74) / 0.26);
    const recover = Math.max(0, (u - 0.56) / 0.44);
    drawBeastPose(buf, spec, {
      mode: 'attack', u, phase: u * Math.PI * 6,
      strike, windup, recover, seed: idx
    });
  }

  return buf;
}

function blitRGBA(rgba, imgW, buf, ox, oy, scale = 1) {
  for (let y = 0; y < buf.h; y++) {
    for (let x = 0; x < buf.w; x++) {
      const hex = buf.data[y * buf.w + x];
      if (!hex) continue;
      const c = RGB_CACHE[hex] || (RGB_CACHE[hex] = hexToRgb(hex));
      for (let sy = 0; sy < scale; sy++) {
        const rowOff = (oy + y * scale + sy) * imgW;
        for (let sx = 0; sx < scale; sx++) {
          const p = (rowOff + ox + x * scale + sx) * 4;
          rgba[p] = c[0]; rgba[p + 1] = c[1]; rgba[p + 2] = c[2]; rgba[p + 3] = 255;
        }
      }
    }
  }
}

console.log('Generating 24 High-Detail 32-Bit Shadow Beasts x 200 frames = 4,800 RGBA frames...');
const t0 = Date.now();

// Pack 6 beasts per PNG sheet (4 sheets total):
// Each sheet has 6 * 200 = 1,200 frames -> 40 cols x 30 rows of 88x74 = 3520 x 2220 RGBA PNG!
const COLS = 40, ROWS = 30;
const SW = COLS * CW, SH = ROWS * CH;
const showcaseFrames = [];

for (let sIdx = 0; sIdx < 4; sIdx++) {
  const rgba = Buffer.alloc(SW * SH * 4, 0);
  for (let bLocal = 0; bLocal < 6; bLocal++) {
    const beastIdx = sIdx * 6 + bLocal;
    const spec = BEAST_LIST[beastIdx];
    for (let f = 0; f < 200; f++) {
      const buf = renderBeastFrame(spec, f);
      if (f === 145) showcaseFrames.push({ spec, buf }); // Peak Sakuga attack frame!
      const cellIdx = bLocal * 200 + f;
      const col = cellIdx % COLS, row = Math.floor(cellIdx / COLS);
      blitRGBA(rgba, SW, buf, col * CW, row * CH, 1);
    }
  }
  const outName = `quanle-beasts-${sIdx + 1}.png`;
  const outPath = path.join(ASSETS, outName);
  fs.writeFileSync(outPath, encodeRGBA(SW, SH, rgba));
  console.log(`Saved ${outName} (${SW}x${SH}, ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

if (fs.existsSync(ARTIFACT_DIR)) {
  const PC = 6, PR = 4, PSCALE = 2;
  const PW = PC * CW * PSCALE, PH = PR * CH * PSCALE;
  const pRgba = Buffer.alloc(PW * PH * 4, 0);
  for (let i = 0; i < PW * PH; i++) {
    // Rich dark abyssal slate backdrop (#0b0814) so dark obsidian outlines & rising black-purple smoke pop!
    pRgba[i * 4] = 11; pRgba[i * 4 + 1] = 8; pRgba[i * 4 + 2] = 20; pRgba[i * 4 + 3] = 255;
  }
  showcaseFrames.forEach(({ buf }, i) => {
    const col = i % PC, row = Math.floor(i / PC);
    blitRGBA(pRgba, PW, buf, col * CW * PSCALE, row * CH * PSCALE, PSCALE);
  });
  const posterPath = path.join(ARTIFACT_DIR, 'quanle_24_beasts_showcase.png');
  fs.writeFileSync(posterPath, encodeRGBA(PW, PH, pRgba));

  const dragonSpec = BEAST_LIST.find(b => b.id === 'shadow_dragon');
  const DC = 10, DR = 20, DSCALE = 2;
  const DW = DC * CW * DSCALE, DH = DR * CH * DSCALE;
  const dRgba = Buffer.alloc(DW * DH * 4, 0);
  for (let i = 0; i < DW * DH; i++) {
    dRgba[i * 4] = 11; dRgba[i * 4 + 1] = 8; dRgba[i * 4 + 2] = 20; dRgba[i * 4 + 3] = 255;
  }
  for (let f = 0; f < 200; f++) {
    const col = f % DC, row = Math.floor(f / DC);
    blitRGBA(dRgba, DW, renderBeastFrame(dragonSpec, f), col * CW * DSCALE, row * CH * DSCALE, DSCALE);
  }
  const dragonSheetPath = path.join(ARTIFACT_DIR, 'quanle_dragon_200_sheet.png');
  fs.writeFileSync(dragonSheetPath, encodeRGBA(DW, DH, dRgba));
  console.log('Saved showcase poster & 200-frame Dragon sample sheet in', ((Date.now() - t0) / 1000).toFixed(2) + 's');
}
