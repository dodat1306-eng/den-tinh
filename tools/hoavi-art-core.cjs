'use strict';
const fs = require('node:fs');
const zlib = require('node:zlib');

// Canonical 25-color palette from assets/hoavi-pixel-v08.json (index 0 = transparent)
const PAL_HEX = [
  '#000000', // 0: transparent
  '#12091a', // 1: OUT   - deep plum-black outline
  '#071824', // 2: TERM  - deep cyber-navy terminal bg
  '#f6c9b2', // 3: SKIN1 - bright peach-ivory skin
  '#dca088', // 4: SKIN2 - warm peach contour
  '#b87664', // 5: SKIN3 - rose-terracotta shadow / smile
  '#1b1026', // 6: INK1  - deepest boot / hair / rim dark
  '#2e1c44', // 7: INK2  - dark plum hair / boot midtone
  '#523478', // 8: HAIR1 - rich amethyst hair / dark violet
  '#261338', // 9: ROBE0 - deep mulberry robe shadow
  '#482466', // 10: ROBE1 - royal violet robe mid-dark
  '#733d9c', // 11: ROBE2 - vibrant wisteria-violet robe main
  '#a566cc', // 12: ROBE3 - luminous lavender-amethyst highlight
  '#9c897e', // 13: SILK0 - warm taupe inner skirt shadow
  '#d6c3b4', // 14: SILK1 - soft cream lapel / skirt midtone
  '#f2e5d8', // 15: SILK2 - bright ivory-cream lapel / skirt highlight
  '#8c5622', // 16: GOLD0 - antique bronze-gold shadow
  '#cf8d36', // 17: GOLD1 - rich imperial gold midtone
  '#f7cb63', // 18: GOLD2 - gleaming bright gold highlight
  '#f291c7', // 19: PINK  - sakura/peach blossom & echo beam
  '#0b2b3d', // 20: CYAN0 - deep abyssal teal (holo panel)
  '#126b82', // 21: CYAN1 - rich cyber-cerulean teal (iris / holo mid)
  '#1fc8db', // 22: CYAN2 - electric cyan (code core)
  '#66fff7', // 23: CYAN3 - neon aqua-mint glow
  '#eeffff', // 24: WHITE - pure diamond-white specular
  '#ff3b6b', // 25: RED   - crimson-rose breakpoint fault accent
];

const C = {
  T: 0, OUT: 1, TERM: 2,
  SKIN1: 3, SKIN2: 4, SKIN3: 5,
  INK1: 6, INK2: 7, HAIR1: 8,
  ROBE0: 9, ROBE1: 10, ROBE2: 11, ROBE3: 12,
  SILK0: 13, SILK1: 14, SILK2: 15,
  GOLD0: 16, GOLD1: 17, GOLD2: 18,
  PINK: 19,
  CYAN0: 20, CYAN1: 21, CYAN2: 22, CYAN3: 23,
  WHITE: 24, RED: 25,
};

const PAL_RGB = PAL_HEX.map(h => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]);

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodeIndexedPng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit indexed
  ihdr[9] = 3; // colorType = 3 (palette)
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const plte = Buffer.alloc(PAL_RGB.length * 3);
  for (let i = 0; i < PAL_RGB.length; i++) {
    plte[i * 3] = PAL_RGB[i][0];
    plte[i * 3 + 1] = PAL_RGB[i][1];
    plte[i * 3 + 2] = PAL_RGB[i][2];
  }
  const trns = Buffer.from([0]); // index 0 = alpha 0, all others = 255

  const stride = width + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter None
    const rowOff = y * width;
    const dstOff = y * stride + 1;
    for (let x = 0; x < width; x++) raw[dstOff + x] = pixels[rowOff + x];
  }
  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('PLTE', plte),
    pngChunk('tRNS', trns),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function savePng(filePath, width, height, pixels) {
  fs.writeFileSync(filePath, encodeIndexedPng(width, height, pixels));
}

class PixelSurface {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8Array(w * h);
  }
  clear() { this.buf.fill(0); }
  set(x, y, col) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && x < this.w && y >= 0 && y < this.h && col > 0) {
      this.buf[y * this.w + x] = col;
    }
  }
  get(x, y) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return 0;
    return this.buf[y * this.w + x];
  }
  rect(x, y, w, h, col) {
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x + w)), y1 = Math.min(this.h, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      const off = yy * this.w;
      for (let xx = x0; xx < x1; xx++) this.buf[off + xx] = col;
    }
  }
  ellipse(cx, cy, rx, ry, col) {
    if (rx <= 0 || ry <= 0) return;
    const x0 = Math.max(0, Math.floor(cx - rx - 1)), x1 = Math.min(this.w - 1, Math.ceil(cx + rx + 1));
    const y0 = Math.max(0, Math.floor(cy - ry - 1)), y1 = Math.min(this.h - 1, Math.ceil(cy + ry + 1));
    for (let y = y0; y <= y1; y++) {
      const dy = (y - cy) / ry;
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / rx;
        if (dx * dx + dy * dy <= 1.0) this.buf[y * this.w + x] = col;
      }
    }
  }
  ring(cx, cy, rx, ry, thick, col) {
    if (rx <= 0 || ry <= 0) return;
    const x0 = Math.max(0, Math.floor(cx - rx - thick - 1)), x1 = Math.min(this.w - 1, Math.ceil(cx + rx + thick + 1));
    const y0 = Math.max(0, Math.floor(cy - ry - thick - 1)), y1 = Math.min(this.h - 1, Math.ceil(cy + ry + thick + 1));
    const irx = Math.max(0.1, rx - thick), iry = Math.max(0.1, ry - thick);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const od = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        const id = ((x - cx) / irx) ** 2 + ((y - cy) / iry) ** 2;
        if (od <= 1.0 && id >= 1.0) this.buf[y * this.w + x] = col;
      }
    }
  }
  arc(cx, cy, rx, ry, thick, a0, a1, col) {
    const steps = Math.max(24, Math.ceil(Math.max(rx, ry) * 6));
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * (i / steps);
      const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
      if (thick <= 1.1) this.set(px, py, col);
      else this.ellipse(px, py, thick * 0.55, thick * 0.55, col);
    }
  }
  line(x0, y0, x1, y1, thick, col) {
    const dx = x1 - x0, dy = y1 - y0;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 2));
    const r = (thick - 1) * 0.5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + dx * t, y = y0 + dy * t;
      if (thick <= 1.05) this.set(x, y, col);
      else this.ellipse(x, y, r + 0.35, r + 0.35, col);
    }
  }
  capsule(x0, y0, x1, y1, r0, r1, col) {
    const dx = x1 - x0, dy = y1 - y0;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = r0 + (r1 - r0) * t;
      this.ellipse(x0 + dx * t, y0 + dy * t, r, r, col);
    }
  }
  poly(pts, col) {
    if (pts.length < 3) return;
    let minX = this.w, maxX = 0, minY = this.h, maxY = 0;
    for (const [x, y] of pts) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const x0 = Math.max(0, Math.floor(minX)), x1 = Math.min(this.w - 1, Math.ceil(maxX));
    const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(this.h - 1, Math.ceil(maxY));
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5;
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
          if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi)) {
            inside = !inside;
          }
        }
        if (inside) this.buf[y * this.w + x] = col;
      }
    }
  }
  outline(col = C.OUT) {
    const src = Uint8Array.from(this.buf);
    const w = this.w, h = this.h;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (src[i] !== 0) continue;
        if (src[i - 1] || src[i + 1] || src[i - w] || src[i + w]) {
          this.buf[i] = col;
        }
      }
    }
  }
  blitTo(atlasBuf, atlasW, dstX, dstY) {
    for (let y = 0; y < this.h; y++) {
      const sOff = y * this.w;
      const dOff = (dstY + y) * atlasW + dstX;
      for (let x = 0; x < this.w; x++) {
        const v = this.buf[sOff + x];
        if (v !== 0) atlasBuf[dOff + x] = v;
      }
    }
  }
}

// Draw a crisp glowing 8-petal Cyber-Lotus crest
function drawLotusEmblem(s, cx, cy, r, mainCol = C.SILK2, innerCol = C.CYAN3, coreCol = C.GOLD2, rot = 0) {
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 0.92;
    const mx = cx + Math.cos(a) * r * 0.52, my = cy + Math.sin(a) * r * 0.48;
    const nx = -Math.sin(a) * r * 0.24, ny = Math.cos(a) * r * 0.24;
    s.poly([[cx, cy], [mx + nx, my + ny], [px, py], [mx - nx, my - ny]], i % 2 === 0 ? mainCol : innerCol);
  }
  s.ellipse(cx, cy, Math.max(1.2, r * 0.26), Math.max(1.2, r * 0.26), coreCol);
}

// Draw one of HoaVi's signature Cyan-Gold Rhomboid Prism Cores
function drawPrismOrb(s, cx, cy, scale = 1, pulse = 0, ringCol = C.CYAN2) {
  const rx = 3.2 * scale, ry = 4.4 * scale;
  if (scale >= 0.85) s.ring(cx, cy, rx + 2.1 + pulse * 0.6, ry + 1.8 + pulse * 0.6, 1, ringCol);
  s.poly([[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]], C.GOLD1);
  s.poly([[cx, cy - ry], [cx - rx, cy], [cx, cy]], C.GOLD2);
  s.poly([[cx, cy - ry * 0.58], [cx + rx * 0.58, cy], [cx, cy + ry * 0.58], [cx - rx * 0.58, cy]], C.CYAN2);
  s.set(cx - 0.5, cy - 0.8, C.WHITE);
  s.set(cx, cy, C.CYAN3);
}

// Draw floating Holographic Rune-Keyboard
function drawHoloKeyboard(s, cx, cy, tilt = 0, width = 28, activeKey = 0) {
  const hw = width * 0.5;
  const dy = tilt * 2.5;
  const p0 = [cx - hw + 2, cy - 3.2 - dy];
  const p1 = [cx + hw - 2, cy - 3.2 + dy];
  const p2 = [cx + hw + 1, cy + 3.2 + dy];
  const p3 = [cx - hw - 1, cy + 3.2 - dy];
  s.poly([p0, p1, p2, p3], C.TERM);
  s.line(p0[0], p0[1], p1[0], p1[1], 1, C.CYAN2);
  s.line(p1[0], p1[1], p2[0], p2[1], 1, C.CYAN3);
  s.line(p2[0], p2[1], p3[0], p3[1], 1, C.CYAN3);
  s.line(p3[0], p3[1], p0[0], p0[1], 1, C.CYAN2);
  const cols = Math.max(4, Math.floor(width / 4));
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < cols; col++) {
      const u = (col + 0.5) / cols - 0.5;
      const kx = cx + u * (width - 4);
      const ky = cy + (row === 0 ? -1.2 : 1.2) + u * dy * 2;
      const lit = ((col + row * 3 + activeKey) % 5) === 0;
      s.rect(kx - 1, ky - 0.6, 2, 1.3, lit ? C.WHITE : (col % 2 ? C.CYAN3 : C.CYAN1));
    }
  }
}

// Draw floating Holographic Code Terminal Window
function drawCodeWindow(s, cx, cy, w = 22, h = 18, scroll = 0, alert = false) {
  const hw = w * 0.5, hh = h * 0.5;
  s.rect(cx - hw, cy - hh, w, h, C.TERM);
  const border = alert ? C.RED : C.CYAN2;
  s.line(cx - hw, cy - hh, cx + hw - 1, cy - hh, 1, C.CYAN3);
  s.line(cx - hw, cy + hh - 1, cx + hw - 1, cy + hh - 1, 1, border);
  s.line(cx - hw, cy - hh, cx - hw, cy + hh - 1, 1, border);
  s.line(cx + hw - 1, cy - hh, cx + hw - 1, cy + hh - 1, 1, C.CYAN3);
  // Corner brackets
  s.set(cx - hw - 1, cy - hh - 1, C.GOLD2);
  s.set(cx + hw, cy - hh - 1, C.GOLD2);
  s.set(cx - hw - 1, cy + hh, C.GOLD2);
  s.set(cx + hw, cy + hh, C.GOLD2);
  // Code lines inside
  const rows = Math.max(3, Math.floor((h - 4) / 3));
  for (let r = 0; r < rows; r++) {
    const yy = cy - hh + 3 + r * 3;
    const idx = (r + scroll) % 6;
    const len = [w - 6, w - 10, w - 5, w - 12, w - 7, w - 9][idx];
    const col = alert && r === 1 ? C.RED : idx % 3 === 0 ? C.PINK : idx % 2 === 0 ? C.CYAN3 : C.CYAN2;
    s.rect(cx - hw + 3 + (idx % 2) * 2, yy, Math.max(3, len - (idx % 2) * 2), 1.2, col);
  }
}

// Draw HoaVi's Peach-Blossom & Golden Pagoda Hairpin (Trâm Hoa Đào Kim Ngọc)
function drawPeachHairpin(s, hx, hy, sideSign = -1, sway = 0) {
  // Golden 3-tier pagoda pin pointing up-outward
  const px = hx + sideSign * 1.5, py = hy - 3;
  s.line(hx, hy, px + sideSign * 2.2, py - 6.5, 1.5, C.GOLD1);
  for (let tier = 0; tier < 3; tier++) {
    const ty = py - 1.5 - tier * 2.1;
    const tx = hx + sideSign * (1.0 + tier * 0.65);
    const w = 2.2 - tier * 0.45;
    s.poly([[tx, ty - 1.5], [tx - w, ty + 0.5], [tx + w, ty + 0.5]], tier === 2 ? C.WHITE : C.GOLD2);
  }
  // 5-petal Pink Peach Blossom
  for (let p = 0; p < 5; p++) {
    const a = (p * Math.PI * 2) / 5 - Math.PI / 2;
    s.ellipse(hx + Math.cos(a) * 2.3, hy + Math.sin(a) * 2.3, 1.6, 1.6, C.PINK);
  }
  s.set(hx - 1, hy - 2, C.WHITE);
  s.ellipse(hx, hy, 1.1, 1.1, C.GOLD2);
  // Hanging golden thread + cyan diamond crystal drop
  const dx = hx + sideSign * 1.2 + sway * 1.2;
  const dy = hy + 5.5;
  s.line(hx + sideSign * 0.8, hy + 2, dx, dy - 1.5, 1, C.GOLD1);
  s.poly([[dx, dy - 1.8], [dx + 1.4, dy], [dx, dy + 2.0], [dx - 1.4, dy]], C.CYAN2);
  s.set(dx, dy - 0.5, C.CYAN3);
}

/**
 * Master articulated 4-directional HoaVi character renderer (`S`, `E`, `N`, `W`).
 * Standing height ~62px above ground anchor (ax, ay).
 */
function drawHoaViRig(s, ax, ay, opts = {}) {
  const {
    view = 'S',          // 'S' | 'E' | 'N' | 'W'
    bob = 0,             // vertical body bob (- = up)
    leanX = 0,           // torso lean X
    leanY = 0,           // torso lean Y
    stride = 0,          // -1..1 leg cycle
    legSpread = 5.0,
    leftFootLift = 0,
    rightFootLift = 0,
    leftFootX = 0,
    rightFootX = 0,
    coatFlare = 0,       // extra flare of swallowtail violet skirt
    coatSway = 0,        // lateral sway of skirt/tassels/hair
    armLPose = null,     // { dx, dy } relative to shoulder
    armRPose = null,     // { dx, dy } relative to shoulder
    headTurn = 0,        // subtle head X offset
    headTilt = 0,        // subtle head Y offset
    blink = false,       // eyes closed blink
    glassesGlint = 0,    // 0..1 specular flash across round glasses
    smileOpen = false,   // open happy/battle expression
    keyboard = false,    // draw floating holo-keyboard in front
    keyboardY = 0,
    keyboardKey = 0,
    prisms = true,       // draw twin orbiting cyan-gold prisms
    prismPhase = 0,
    prismRadius = 21,
    backHalo = 0,        // 0..1 cyber-lotus back mandala halo
    addOutline = true,
  } = opts;

  const isBack = view === 'N';
  const isSide = view === 'E' || view === 'W';
  const dirSign = view === 'E' ? 1 : view === 'W' ? -1 : 0;

  const bodyS = new PixelSurface(s.w, s.h);

  const hipX = ax + leanX * 0.45;
  const hipY = ay - 22 + bob + leanY * 0.5;
  const chestX = ax + leanX;
  const chestY = ay - 35 + bob + leanY;
  const headX = chestX + headTurn + dirSign * 1.2;
  const headY = chestY - 14 + headTilt;

  // 0. Back prism (behind character)
  if (prisms) {
    for (let i = 0; i < 2; i++) {
      const a = prismPhase + i * Math.PI;
      if (Math.sin(a) < 0) {
        const px = chestX + Math.cos(a) * prismRadius;
        const py = hipY - 3 + Math.sin(a) * 5.5;
        drawPrismOrb(bodyS, px, py, 0.95, Math.abs(Math.cos(a * 2)));
      }
    }
  }

  // Optional Cyber-Lotus Halo behind shoulders (during skills / interactions / R)
  if (backHalo > 0.05) {
    const hr = 14 + backHalo * 10;
    bodyS.ring(chestX, chestY - 4, hr, hr * 0.92, 1.2, C.CYAN2);
    drawLotusEmblem(bodyS, chestX, chestY - 4, hr * 0.72, C.CYAN3, C.PINK, C.GOLD2, prismPhase * 0.5);
  }

  // 1. Back Hair Silhouette (behind shoulders in S/E/W)
  if (!isBack) {
    bodyS.ellipse(headX - dirSign * 1.5, headY + 1.5, 12.2, 11.8, C.INK1);
    bodyS.ellipse(headX - dirSign * 1.0, headY + 0.5, 11.4, 11.0, C.INK2);
    // Back side locks hanging to collar with cyan crystal tips
    for (const side of [-1, 1]) {
      const lx = headX + side * 9.8 + coatSway * 0.5;
      bodyS.poly([
        [lx - 2.4, headY + 1],
        [lx + 2.4, headY + 1],
        [lx + 1.6 + coatSway * 0.7, headY + 14.5],
        [lx - 1.2 + coatSway * 0.7, headY + 13.5],
      ], C.INK2);
      bodyS.set(lx + 0.4 + coatSway * 0.7, headY + 13.5, C.CYAN2);
    }
  }

  // 2. Back Arm (for E/W views, draw far arm behind torso)
  const drawSleeveArm = (sideSign, pose, isFar) => {
    const shX = chestX + (isSide ? -sideSign * 1.5 : sideSign * 8.2);
    const shY = chestY + 1.5;
    const defDx = isSide ? dirSign * (isFar ? 7.5 : 6.0) + stride * (isFar ? -4 : 4) : sideSign * 5.5;
    const defDy = isSide ? 8.5 : 9.5 + (sideSign < 0 ? stride : -stride) * 2.2;
    const dx = pose ? pose.dx : defDx;
    const dy = pose ? pose.dy : defDy;
    const wristX = shX + dx;
    const wristY = shY + dy;
    const elbowX = (shX + wristX) * 0.5 + (isSide ? -dirSign * 1.2 : sideSign * 2.2);
    const elbowY = (shY + wristY) * 0.5 + 2.0;

    // Puffed royal-violet bell sleeve
    bodyS.capsule(shX, shY, elbowX, elbowY, 4.4, 5.2, isFar ? C.ROBE0 : C.ROBE1);
    bodyS.capsule(shX, shY - 0.6, elbowX, elbowY - 0.5, 3.4, 4.2, isFar ? C.ROBE1 : C.ROBE2);
    if (!isFar) bodyS.line(shX + sideSign * 0.5, shY - 1.5, elbowX, elbowY - 1.8, 1.4, C.ROBE3);

    // Wide cream-ivory cuff + gold rim
    bodyS.capsule(elbowX, elbowY, wristX, wristY, 4.8, 4.2, isFar ? C.ROBE0 : C.ROBE1);
    bodyS.ellipse(wristX, wristY, 4.2, 3.6, C.SILK2);
    bodyS.ellipse(wristX, wristY, 3.1, 2.5, C.INK1);
    bodyS.ring(wristX, wristY, 4.3, 3.7, 1.0, C.GOLD2);

    // Hand & dainty fingers
    const hx = wristX + (dx >= 0 ? 1.2 : -1.2) * 0.6;
    const hy = wristY + 1.2;
    bodyS.ellipse(hx, hy, 2.5, 2.2, isFar ? C.SKIN2 : C.SKIN1);
    bodyS.set(hx + (isSide ? dirSign * 2 : sideSign * 1.5), hy + 0.8, C.SKIN2);
  };

  if (isSide) {
    drawSleeveArm(-dirSign, dirSign > 0 ? armLPose : armRPose, true);
  }

  // 3. Separated Gold-Laced Dark Boots (`Ủng Đen Dây Chéo Vàng Kim`)
  const legs = isSide
    ? [
        { side: -1, x: hipX - dirSign * 3.2 + stride * 5.8 + leftFootX, lift: leftFootLift + Math.max(0, -stride) * 2.5, far: true },
        { side: 1,  x: hipX + dirSign * 2.8 - stride * 5.8 + rightFootX, lift: rightFootLift + Math.max(0, stride) * 2.5, far: false },
      ]
    : [
        { side: -1, x: hipX - legSpread + leftFootX, lift: leftFootLift + Math.max(0, stride) * 3.0, far: false },
        { side: 1,  x: hipX + legSpread + rightFootX, lift: rightFootLift + Math.max(0, -stride) * 3.0, far: false },
      ];

  for (const leg of legs) {
    const fy = ay - leg.lift;
    const kx = (hipX + leg.x) * 0.5;
    const ky = hipY + 11 - leg.lift * 0.45;
    // Boot shaft
    bodyS.capsule(kx, hipY + 8, leg.x, fy - 2.5, 3.6, 3.8, C.INK1);
    if (!leg.far) bodyS.capsule(kx - 0.5, hipY + 8, leg.x - 0.4, fy - 3.0, 2.3, 2.5, C.INK2);
    // Boot foot + toe cap
    const toeDir = isSide ? dirSign * 2.4 : leg.side * 0.9;
    bodyS.ellipse(leg.x + toeDir * 0.5, fy - 1.8, isSide ? 5.2 : 4.3, 2.6, C.INK1);
    bodyS.ellipse(leg.x + toeDir * 0.4, fy - 2.3, isSide ? 4.2 : 3.4, 1.8, C.INK2);
    // Golden sole trim & toe arch
    bodyS.line(leg.x - 3.5, fy - 0.5, leg.x + 3.5 + toeDir * 0.5, fy - 0.5, 1.1, C.GOLD1);
    if (!isBack && !leg.far) {
      bodyS.set(leg.x + toeDir * 0.5, fy - 3.2, C.GOLD2);
      // Crisscross golden boot laces (3 X-rungs!)
      for (let r = 0; r < 3; r++) {
        const ly = fy - 5.2 - r * 2.5;
        bodyS.set(leg.x - 1, ly, C.GOLD2);
        bodyS.set(leg.x + 1, ly, C.GOLD2);
        bodyS.set(leg.x, ly - 1, C.GOLD1);
      }
    }
  }

  // 4. Layered Pleated Cream Inner Skirt + Split Swallowtail Violet Coat (`Tà Áo Tím Xẻ Tà`)
  const skirtBottomY = ay - 10 + bob * 0.6;
  const flare = 12.5 + coatFlare + Math.abs(stride) * 2.2;
  // Inner cream pleated skirt
  bodyS.poly([
    [hipX - 7.5, hipY + 1],
    [hipX + 7.5, hipY + 1],
    [hipX + flare * 0.78 + coatSway, skirtBottomY],
    [hipX - flare * 0.78 + coatSway, skirtBottomY],
  ], C.SILK1);
  bodyS.poly([
    [hipX - 5.2, hipY + 1],
    [hipX + 4.8, hipY + 1],
    [hipX + flare * 0.52 + coatSway, skirtBottomY - 0.8],
    [hipX - flare * 0.52 + coatSway, skirtBottomY - 0.8],
  ], C.SILK2);
  // Subtle taupe wave embroidery along cream hem
  for (let wx = -5; wx <= 5; wx += 2.5) {
    bodyS.set(hipX + wx + coatSway, skirtBottomY - 1.5, C.SILK0);
  }

  if (isBack) {
    // Two symmetrical swallowtail violet back panels (exact match to hoavi-back.png!)
    for (const side of [-1, 1]) {
      bodyS.poly([
        [hipX + side * 0.8, hipY],
        [hipX + side * 7.8, hipY + 0.5],
        [hipX + side * (flare + 3.2) + coatSway, skirtBottomY + 2.2],
        [hipX + side * (flare * 0.62) + coatSway, skirtBottomY - 2.2],
        [hipX + side * 2.2 + coatSway * 0.6, skirtBottomY + 2.8],
      ], side < 0 ? C.ROBE1 : C.ROBE2);
      bodyS.line(
        hipX + side * 2.2 + coatSway * 0.6, skirtBottomY + 2.5,
        hipX + side * (flare + 2.8) + coatSway, skirtBottomY + 1.8,
        1, C.GOLD1
      );
      bodyS.line(hipX + side * 4.2, hipY + 2, hipX + side * (flare * 0.82) + coatSway, skirtBottomY - 1, 1, C.ROBE3);
    }
  } else if (isSide) {
    // Sweeping side swallowtail violet coat panel exposing cream front skirt
    bodyS.poly([
      [hipX - dirSign * 6.5, hipY],
      [hipX + dirSign * 3.5, hipY + 0.5],
      [hipX + dirSign * 4.5 + coatSway, skirtBottomY + 1.0],
      [hipX - dirSign * 2.0 + coatSway, skirtBottomY - 2.5],
      [hipX - dirSign * (flare + 2.5) + coatSway, skirtBottomY + 2.5],
    ], C.ROBE1);
    bodyS.poly([
      [hipX - dirSign * 4.5, hipY + 1],
      [hipX + dirSign * 2.5, hipY + 1],
      [hipX + dirSign * 3.2 + coatSway, skirtBottomY],
      [hipX - dirSign * (flare * 0.8) + coatSway, skirtBottomY + 1.2],
    ], C.ROBE2);
    bodyS.line(hipX - dirSign * (flare + 2.0) + coatSway, skirtBottomY + 2.0, hipX + dirSign * 4.0 + coatSway, skirtBottomY + 0.8, 1, C.GOLD1);
  } else {
    // Front S view: Left & Right split violet over-skirt panels framing cream center skirt
    for (const side of [-1, 1]) {
      bodyS.poly([
        [hipX + side * 3.2, hipY],
        [hipX + side * 8.0, hipY + 0.5],
        [hipX + side * (flare + 2.6) + coatSway, skirtBottomY + 2.2],
        [hipX + side * (flare * 0.68) + coatSway, skirtBottomY + 0.5],
        [hipX + side * 5.2 + coatSway * 0.5, skirtBottomY - 1.2],
      ], side < 0 ? C.ROBE1 : C.ROBE2);
      bodyS.line(hipX + side * 5.5, hipY + 2, hipX + side * (flare * 0.95) + coatSway, skirtBottomY, 1.2, C.ROBE3);
      bodyS.line(hipX + side * 5.2 + coatSway * 0.5, skirtBottomY - 1, hipX + side * (flare + 2.2) + coatSway, skirtBottomY + 1.8, 1, C.GOLD1);
    }
  }

  // 5. Upper Torso (`Áo Giao Lĩnh Tím` + Cream Y-Collar + Back 8-Petal Lotus)
  bodyS.poly([
    [chestX - 8.2, chestY - 1],
    [chestX + 8.2, chestY - 1],
    [hipX + 7.2, hipY + 1],
    [hipX - 7.2, hipY + 1],
  ], C.ROBE1);
  bodyS.poly([
    [chestX - 6.5, chestY],
    [chestX + 6.5, chestY],
    [hipX + 5.5, hipY],
    [hipX - 5.5, hipY],
  ], C.ROBE2);

  if (isBack) {
    // Canonical 8-petal Sacred Cyber-Lotus embroidered on back (hoavi-back.png)
    drawLotusEmblem(bodyS, chestX, chestY + 5.5, 4.8, C.SILK2, C.ROBE3, C.CYAN3, 0);
  } else {
    const cxOff = dirSign * 2.2;
    // Inner lavender bodice under V-neck
    bodyS.poly([
      [chestX + cxOff - 3.5, chestY - 1],
      [chestX + cxOff + 3.5, chestY - 1],
      [chestX + cxOff, chestY + 7.5],
    ], C.ROBE3);
    // Bold cream-ivory cross-collar (`Áo Giao Lĩnh`) edged in gold
    bodyS.line(chestX + cxOff - 4.8, chestY - 1, hipX + cxOff * 0.6 + 1.0, hipY - 0.5, 2.3, C.SILK2);
    bodyS.line(chestX + cxOff + 4.8, chestY - 1, chestX + cxOff - 0.5, chestY + 7.8, 2.3, C.SILK2);
    bodyS.line(chestX + cxOff - 5.6, chestY, chestX + cxOff - 6.8, chestY + 5.0, 1, C.GOLD2);
    bodyS.line(chestX + cxOff + 5.6, chestY, chestX + cxOff + 6.8, chestY + 5.0, 1, C.GOLD2);
  }

  // 6. Waist Sash + Cyan-Gold Diamond Buckle & Twin Hanging Cyan-Gold Tassels
  bodyS.rect(hipX - 7.6, hipY - 1.5, 15.2, 2.8, C.INK1);
  bodyS.line(hipX - 7.4, hipY - 1.6, hipX + 7.4, hipY - 1.6, 1, C.GOLD1);
  if (!isBack) {
    const bx = hipX + dirSign * 2.5;
    bodyS.poly([[bx, hipY - 3.2], [bx + 3.2, hipY], [bx, hipY + 3.2], [bx - 3.2, hipY]], C.GOLD2);
    bodyS.poly([[bx, hipY - 1.8], [bx + 1.8, hipY], [bx, hipY + 1.8], [bx - 1.8, hipY]], C.CYAN3);
  }
  // Twin hanging diamond-cyan tassels at hips
  const tasselSides = isSide ? [dirSign] : [-1, 1];
  for (const ts of tasselSides) {
    const tx = hipX + ts * (isSide ? 1.0 : 6.8) + coatSway * 0.85;
    const ty = hipY + 5.8;
    bodyS.line(hipX + ts * (isSide ? 0.5 : 4.2), hipY + 0.8, tx, ty - 1.8, 1, C.GOLD2);
    bodyS.poly([[tx, ty - 2.0], [tx + 1.8, ty], [tx, ty + 2.0], [tx - 1.8, ty]], C.GOLD2);
    bodyS.set(tx, ty, C.CYAN2);
    bodyS.poly([[tx - 1.2, ty + 1.8], [tx + 1.2, ty + 1.8], [tx + 1.8 + coatSway * 0.4, ty + 5.8], [tx - 1.6 + coatSway * 0.4, ty + 5.8]], C.CYAN3);
    bodyS.line(tx, ty + 2.2, tx + coatSway * 0.3, ty + 5.5, 1, C.CYAN1);
  }

  // 7. Neck, Head, Glasses, Luminous Cyan Eyes, Amethyst Bob Hair & Peach Hairpin
  bodyS.rect(headX - 2.5, chestY - 4, 5, 4, C.SKIN2);

  if (isBack) {
    // Back of Amethyst Bob Hair with vertical scalloped locks (hoavi-back.png)
    bodyS.ellipse(headX, headY + 1, 12.2, 11.8, C.INK2);
    bodyS.ellipse(headX, headY, 11.2, 10.6, C.HAIR1);
    bodyS.ellipse(headX, headY - 2.5, 9.6, 7.6, C.ROBE2);
    bodyS.arc(headX, headY - 4.5, 7.2, 3.2, 1.6, Math.PI * 1.1, Math.PI * 1.9, C.ROBE3);
    for (let k = -3; k <= 3; k++) {
      const lx = headX + k * 3.0 + coatSway * 0.35;
      bodyS.line(lx, headY - 1, lx + k * 0.3, headY + 11.2, 1.6, k % 2 === 0 ? C.HAIR1 : C.INK2);
      bodyS.set(lx + k * 0.3, headY + 11.5, C.INK1);
    }
    // Anatomical right side in N view is viewer's RIGHT (+1)
    drawPeachHairpin(bodyS, headX + 10.2, headY - 3.5, 1, coatSway);
  } else {
    // Face shape (warm peach-ivory)
    bodyS.ellipse(headX + dirSign * 0.8, headY + 1.8, isSide ? 9.2 : 9.8, 9.6, C.SKIN2);
    bodyS.ellipse(headX + dirSign * 1.0, headY + 1.2, isSide ? 8.4 : 9.0, 8.8, C.SKIN1);

    // Crown & Top Hair Dome
    bodyS.ellipse(headX - dirSign * 0.8, headY - 4.2, 11.4, 7.6, C.HAIR1);
    bodyS.ellipse(headX - dirSign * 0.5, headY - 5.2, 9.8, 5.8, C.ROBE2);
    // Luminous lavender hair halo highlight
    bodyS.arc(headX - dirSign * 0.5, headY - 6.0, 7.2, 2.8, 1.5, Math.PI * 1.12, Math.PI * 1.88, C.ROBE3);

    // Eyes, Blush, Smile & Round Golden-Bridge Glasses!
    const faceCx = headX + dirSign * 2.2;
    const eyeY = headY + 2.0;

    if (isSide) {
      // 3/4 view: prominent near eye + far eye across golden nose bridge
      const nearX = faceCx + dirSign * 2.2;
      const farX = faceCx - dirSign * 4.2;
      if (!blink) {
        // Far eye
        bodyS.ellipse(farX, eyeY, 1.8, 2.2, C.WHITE);
        bodyS.ellipse(farX + dirSign * 0.4, eyeY + 0.2, 1.3, 1.8, C.CYAN1);
        bodyS.set(farX + dirSign * 0.5, eyeY, C.CYAN3);
        bodyS.set(farX - 0.4, eyeY - 0.8, C.WHITE);
        // Near eye (vivid cyan)
        bodyS.ellipse(nearX, eyeY, 2.4, 2.5, C.WHITE);
        bodyS.ellipse(nearX + dirSign * 0.4, eyeY + 0.2, 1.8, 2.0, C.CYAN1);
        bodyS.ellipse(nearX + dirSign * 0.5, eyeY + 0.4, 1.2, 1.3, C.CYAN2);
        bodyS.set(nearX + dirSign * 0.5, eyeY + 0.8, C.CYAN3);
        bodyS.set(nearX - dirSign * 0.6, eyeY - 0.8, C.WHITE);
        bodyS.line(nearX - 2.0, eyeY - 2.2, nearX + 2.0, eyeY - 2.0, 1.1, C.INK1);
      } else {
        bodyS.line(farX - 1.5, eyeY + 0.5, farX + 1.5, eyeY + 0.5, 1.1, C.INK1);
        bodyS.line(nearX - 2.2, eyeY + 0.5, nearX + 2.2, eyeY + 0.5, 1.1, C.INK1);
      }
      // Cheek blush & gentle confident smile
      bodyS.ellipse(nearX + dirSign * 1.2, eyeY + 3.2, 1.5, 0.9, C.PINK);
      if (smileOpen) bodyS.ellipse(faceCx + dirSign * 0.5, eyeY + 5.2, 1.6, 1.2, C.RED);
      else bodyS.line(faceCx - 0.5, eyeY + 5.2, faceCx + dirSign * 1.8, eyeY + 4.9, 1, C.SKIN3);

      // Iconic Round Glasses + Golden Nose Bridge & Temple!
      bodyS.ring(farX, eyeY + 0.2, 3.0, 3.0, 1.0, C.INK1);
      bodyS.ring(nearX, eyeY + 0.2, 3.6, 3.5, 1.0, C.INK1);
      bodyS.set((farX + nearX) * 0.5, eyeY - 0.4, C.GOLD2); // golden bridge!
      bodyS.line(nearX - dirSign * 3.6, eyeY - 0.4, nearX - dirSign * 6.5, eyeY - 1.0, 1, C.GOLD2); // golden temple!
      if (glassesGlint > 0.2) {
        bodyS.line(nearX - 1.8, eyeY - 1.8, nearX + 1.5, eyeY + 1.5, 1.2, C.WHITE);
        bodyS.line(farX - 1.2, eyeY - 1.4, farX + 1.0, eyeY + 1.2, 1.1, C.CYAN3);
      }
    } else {
      // Front S view: Symmetrical crystal-clear cyan eyes + round glasses!
      for (const side of [-1, 1]) {
        const ex = faceCx + side * 4.2;
        if (!blink) {
          bodyS.ellipse(ex, eyeY, 2.3, 2.4, C.WHITE);
          bodyS.ellipse(ex, eyeY + 0.2, 1.7, 1.9, C.CYAN1);
          bodyS.ellipse(ex, eyeY + 0.5, 1.2, 1.2, C.CYAN2);
          bodyS.set(ex, eyeY + 1.0, C.CYAN3);
          bodyS.set(ex, eyeY - 0.2, C.INK1); // crisp pupil
          bodyS.set(ex - 0.9, eyeY - 0.9, C.WHITE); // bright catchlight
          bodyS.line(ex - 2.1, eyeY - 2.2, ex + 2.1, eyeY - 2.1, 1.1, C.INK1); // upper lash
          bodyS.line(ex - 1.8, eyeY - 3.6, ex + 1.6, eyeY - 3.8, 1.0, C.INK2); // eyebrow
        } else {
          bodyS.line(ex - 2.1, eyeY + 0.5, ex + 2.1, eyeY + 0.5, 1.1, C.INK1);
        }
        bodyS.ellipse(ex + side * 1.4, eyeY + 3.2, 1.5, 0.9, C.PINK);
      }
      if (smileOpen) {
        bodyS.ellipse(faceCx, eyeY + 5.3, 1.8, 1.3, C.RED);
        bodyS.set(faceCx, eyeY + 4.5, C.WHITE);
      } else {
        bodyS.line(faceCx - 1.4, eyeY + 5.2, faceCx + 1.4, eyeY + 5.0, 1, C.SKIN3);
      }
      // Round Dark Glasses Rims + Golden Bridge + Golden Temples!
      for (const side of [-1, 1]) {
        const ex = faceCx + side * 4.2;
        bodyS.ring(ex, eyeY + 0.2, 3.2, 3.2, 1.0, C.INK1);
        bodyS.set(ex + side * 3.5, eyeY - 0.4, C.GOLD2); // golden side hinge!
        if (glassesGlint > 0.2) {
          bodyS.line(ex - 1.5, eyeY - 1.5, ex + 1.3, eyeY + 1.3, 1.1, glassesGlint > 0.6 ? C.WHITE : C.CYAN3);
        }
      }
      bodyS.rect(faceCx - 1.0, eyeY - 0.5, 2.0, 1.1, C.GOLD2); // crisp 2px golden bridge!
    }

    // Swept Parted Forehead Bangs & Side Cheek Locks (over top of forehead, never obscuring eyes!)
    bodyS.poly([
      [headX - 9.5, headY - 4.5],
      [headX + 2.5, headY - 7.5],
      [headX - 1.5, headY - 1.2],
      [headX - 8.2, headY - 0.8],
    ], C.ROBE2);
    bodyS.poly([
      [headX + 0.5, headY - 7.5],
      [headX + 9.5, headY - 4.2],
      [headX + 7.5, headY - 0.8],
      [headX + 2.2, headY - 1.5],
    ], C.HAIR1);
    // Center swept bang lock
    bodyS.poly([
      [headX - 2.0, headY - 6.8],
      [headX + 2.8, headY - 6.2],
      [headX + 0.4, headY - 0.5],
    ], C.ROBE3);

    // Side framing locks + cyan diamond tips
    if (!isSide) {
      for (const side of [-1, 1]) {
        const sx = headX + side * 8.8;
        bodyS.poly([
          [sx - side * 1.4, headY - 4.5],
          [sx + side * 2.2, headY - 3.5],
          [sx + side * 1.5 + coatSway * 0.5, headY + 10.8],
          [sx - side * 0.8 + coatSway * 0.5, headY + 8.5],
        ], side < 0 ? C.ROBE2 : C.HAIR1);
        bodyS.set(sx + side * 0.6 + coatSway * 0.5, headY + 10.2, C.CYAN3);
      }
    } else {
      // Side framing lock behind ear/cheek
      const sx = headX - dirSign * 6.2;
      bodyS.poly([
        [sx - 2.8, headY - 4.5],
        [sx + 2.8, headY - 3.5],
        [sx + 2.0 + coatSway * 0.5, headY + 11.2],
        [sx - 2.2 + coatSway * 0.5, headY + 10.2],
      ], C.ROBE2);
      bodyS.line(sx, headY - 3.0, sx + coatSway * 0.4, headY + 9.5, 1.4, C.ROBE3);
      bodyS.set(sx + coatSway * 0.5, headY + 10.8, C.CYAN3);
    }

    // Peach-Blossom & Golden Pagoda Hairpin on HoaVi's anatomical RIGHT side:
    // - S view: viewer's LEFT (headX - 9.8)
    // - E view (facing right = anatomical right side toward camera!): prominent at headX - 2.5, headY - 4.5
    // - W view (facing left = anatomical left side toward camera): peeks behind right-top crown
    if (view === 'S') {
      drawPeachHairpin(bodyS, headX - 9.6, headY - 3.5, -1, coatSway);
    } else if (view === 'E') {
      drawPeachHairpin(bodyS, headX - 3.5, headY - 4.2, -1, coatSway);
    } else if (view === 'W') {
      bodyS.line(headX + 5.5, headY - 7.5, headX + 7.5, headY - 11.5, 1.4, C.GOLD2);
      bodyS.ellipse(headX + 6.5, headY - 6.8, 1.8, 1.8, C.PINK);
    }
  }

  // 8. Front Arm(s)
  if (isSide) {
    drawSleeveArm(dirSign, dirSign > 0 ? armRPose : armLPose, false);
  } else {
    drawSleeveArm(-1, armLPose, false);
    drawSleeveArm(1, armRPose, false);
  }

  // 9. Crisp 1px #12091a Outline around Character Body
  if (addOutline) bodyS.outline(C.OUT);

  // Blit character onto target surface
  for (let i = 0; i < s.buf.length; i++) {
    if (bodyS.buf[i] !== 0) s.buf[i] = bodyS.buf[i];
  }

  // 10. Foreground Floating Props (Holo-Keyboard & Front Orbiting Prism)
  if (keyboard && !isBack) {
    const kx = chestX + dirSign * 9.5;
    const ky = chestY + 10.5 + keyboardY;
    drawHoloKeyboard(s, kx, ky, dirSign * 0.6, isSide ? 22 : 28, keyboardKey);
  }
  if (prisms) {
    for (let i = 0; i < 2; i++) {
      const a = prismPhase + i * Math.PI;
      if (Math.sin(a) >= 0) {
        const px = chestX + Math.cos(a) * prismRadius;
        const py = hipY - 3 + Math.sin(a) * 5.5;
        drawPrismOrb(s, px, py, 1.0, Math.abs(Math.cos(a * 2)));
      }
    }
  }
}

// High-detail 128x128 Pixel Portrait matching hoavi-portrait.png
function buildHoaViPortrait128() {
  const s = new PixelSurface(128, 128);
  // Subtle cyber-lotus halo backdrop (transparent outside so hero card stays clean)
  s.ring(64, 58, 50, 50, 1.5, C.CYAN1);
  drawLotusEmblem(s, 64, 58, 46, C.ROBE0, C.CYAN0, C.GOLD1, Math.PI / 8);
  s.ellipse(64, 58, 42, 42, C.TERM);
  s.ring(64, 58, 43, 43, 1.5, C.GOLD1);

  const fig = new PixelSurface(128, 128);
  // Back hair volume
  fig.ellipse(64, 56, 35, 36, C.INK1);
  fig.ellipse(64, 54, 33, 34, C.INK2);
  fig.ellipse(64, 50, 31, 30, C.HAIR1);

  // Shoulders & Royal Violet Áo Giao Lĩnh
  fig.poly([[18, 127], [34, 92], [94, 92], [110, 127]], C.ROBE1);
  fig.poly([[24, 127], [38, 94], [90, 94], [104, 127]], C.ROBE2);
  // Puffed shoulder highlights
  fig.ellipse(31, 108, 13, 15, C.ROBE2);
  fig.arc(31, 104, 10, 10, 2, Math.PI * 1.1, Math.PI * 1.9, C.ROBE3);
  fig.ellipse(97, 108, 13, 15, C.ROBE2);
  fig.arc(97, 104, 10, 10, 2, Math.PI * 1.1, Math.PI * 1.9, C.ROBE3);

  // Inner lavender top + Cream-Ivory Cross-Collar + Gold Filigree Chains (hoavi-portrait.png!)
  fig.poly([[50, 92], [78, 92], [64, 124]], C.ROBE3);
  fig.line(45, 92, 68, 126, 6.5, C.SILK2);
  fig.line(83, 92, 60, 126, 6.5, C.SILK2);
  fig.line(42, 92, 65, 126, 1.5, C.GOLD2);
  fig.line(86, 92, 63, 126, 1.5, C.GOLD2);
  // Golden shoulder diamond clasps & filigree rings
  for (const side of [-1, 1]) {
    const sx = 64 + side * 22;
    fig.poly([[sx, 94], [sx + 3, 98], [sx, 102], [sx - 3, 98]], C.GOLD2);
    for (let r = 0; r < 3; r++) fig.ring(sx + side * (2 + r * 2), 105 + r * 5, 2.5, 2.5, 1, C.GOLD2);
  }

  // Neck & Warm Peach-Ivory Face
  fig.rect(56, 80, 16, 15, C.SKIN2);
  fig.ellipse(64, 58, 25, 27, C.SKIN2);
  fig.ellipse(64, 56, 23.5, 25.5, C.SKIN1);

  // Expressive Large Cyan-Teal Eyes
  for (const side of [-1, 1]) {
    const ex = 64 + side * 11;
    const ey = 58;
    fig.ellipse(ex, ey, 6.8, 5.6, C.WHITE);
    fig.ellipse(ex, ey + 0.4, 4.8, 4.8, C.CYAN0);
    fig.ellipse(ex, ey + 0.6, 4.0, 4.0, C.CYAN1);
    fig.ellipse(ex, ey + 1.2, 2.8, 2.6, C.CYAN2);
    fig.arc(ex, ey + 1.5, 2.2, 2.0, 1.4, 0.2, Math.PI - 0.2, C.CYAN3);
    fig.ellipse(ex, ey + 0.2, 1.7, 1.9, C.INK1); // crisp pupil
    fig.ellipse(ex - 2.0, ey - 1.8, 1.6, 1.4, C.WHITE); // main catchlight
    fig.set(ex + 1.8, ey + 1.8, C.WHITE); // secondary catchlight
    // Upper lash & brow
    fig.arc(ex, ey - 0.5, 6.8, 5.2, 1.8, Math.PI * 1.08, Math.PI * 1.92, C.INK1);
    fig.line(ex - 6, ey - 9, ex + 6, ey - (side < 0 ? 10 : 9.5), 1.8, C.INK2);
    // Soft rosy cheek blush
    fig.ellipse(ex + side * 4, ey + 8.5, 3.8, 2.0, C.PINK);
  }
  // Delicate nose & warm confident smile
  fig.ellipse(64, 65, 1.5, 1.2, C.SKIN2);
  fig.set(63, 64, C.WHITE);
  fig.arc(64, 70, 5.5, 3.0, 1.3, 0.18 * Math.PI, 0.82 * Math.PI, C.SKIN3);

  // Round Dark-Rimmed Glasses with Golden Bridge & Golden Side Temples!
  for (const side of [-1, 1]) {
    const ex = 64 + side * 11.2;
    fig.ring(ex, 58.5, 9.6, 9.2, 1.5, C.INK1);
    fig.line(ex - 5, 52, ex - 2, 55, 1.2, C.WHITE); // subtle lens sheen
    fig.line(64 + side * 20.8, 57.5, 64 + side * 26.5, 55.5, 1.6, C.GOLD2); // golden temple arm
  }
  fig.arc(64, 58.2, 2.2, 1.5, 1.6, Math.PI, Math.PI * 2, C.GOLD2); // golden nose bridge!

  // Layered Amethyst-Violet Bob Bangs & Framing Locks with Cyan Crystal Tips
  fig.poly([[32, 46], [56, 23], [66, 24], [46, 48], [34, 52]], C.ROBE2);
  fig.poly([[54, 24], [74, 24], [61, 49], [52, 46]], C.ROBE3);
  fig.poly([[68, 24], [92, 40], [84, 50], [67, 46]], C.HAIR1);
  fig.arc(64, 28, 18, 6, 2.2, Math.PI * 1.1, Math.PI * 1.9, C.ROBE3);
  // Left & right cheek-framing locks + cyan crystal drops
  for (const side of [-1, 1]) {
    const lx = 64 + side * 24;
    fig.poly([[lx - side * 4, 38], [lx + side * 6, 42], [lx + side * 4, 86], [lx - side * 2, 79]], side < 0 ? C.ROBE2 : C.HAIR1);
    const gx = lx + side * 2, gy = 87;
    fig.poly([[gx, gy - 3], [gx + 2, gy], [gx, gy + 3], [gx - 2, gy]], C.CYAN2);
    fig.set(gx, gy - 1, C.CYAN3);
  }

  // Right-side Peach-Blossom & Golden 3-Tier Pagoda Hairpin (viewer's LEFT: x=33, y=38)
  fig.line(34, 40, 27, 21, 2.2, C.GOLD1);
  for (let t = 0; t < 3; t++) {
    const tx = 31 - t * 1.8, ty = 31 - t * 4.5, tw = 3.6 - t * 0.6;
    fig.poly([[tx - 1, ty - 3], [tx - tw, ty + 1.5], [tx + tw, ty + 0.5]], t === 2 ? C.WHITE : C.GOLD2);
  }
  for (let p = 0; p < 5; p++) {
    const a = (p * Math.PI * 2) / 5 - Math.PI / 2;
    fig.ellipse(33 + Math.cos(a) * 4.6, 41 + Math.sin(a) * 4.6, 3.2, 3.2, C.PINK);
  }
  fig.ellipse(33, 41, 2.0, 2.0, C.GOLD2);
  fig.set(31, 38, C.WHITE);
  fig.line(31, 46, 29, 55, 1.2, C.GOLD1);
  fig.poly([[29, 55], [31.5, 58], [29, 61], [26.5, 58]], C.CYAN2);
  fig.set(29, 57, C.CYAN3);

  fig.outline(C.OUT);
  for (let i = 0; i < s.buf.length; i++) if (fig.buf[i]) s.buf[i] = fig.buf[i];
  return s;
}

// Full-body HD 1x1 Native Pixel KeyArt (180x210) matching hoavi-hero.png
function buildHoaViKeyArt() {
  const s = new PixelSurface(180, 210);
  const cx = 90, ay = 194;

  // 1. Sacred Cyber-Lotus & Octagonal Mandala Halo behind HoaVi
  s.ring(cx, 92, 68, 68, 1.5, C.CYAN1);
  s.ring(cx, 92, 58, 58, 1.2, C.GOLD1);
  drawLotusEmblem(s, cx, 92, 52, C.ROBE0, C.CYAN0, C.GOLD2, 0);
  drawCodeWindow(s, 142, 68, 42, 32, 1, false);
  drawCodeWindow(s, 38, 76, 36, 26, 3, false);

  const fig = new PixelSurface(180, 210);
  // 2. Back hair volume
  fig.ellipse(cx, 54, 24, 24, C.INK1);
  fig.ellipse(cx, 52, 22, 22, C.INK2);

  // 3. Gold-Laced Dark Boots (`Ủng Đen Dây Vàng`)
  for (const side of [-1, 1]) {
    const bx = cx + side * 12;
    fig.capsule(bx - side * 1, 152, bx, ay - 6, 7.5, 8.0, C.INK1);
    fig.capsule(bx - side * 1 - 1, 152, bx - 1, ay - 7, 4.8, 5.2, C.INK2);
    fig.ellipse(bx + side * 2, ay - 4, 9.5, 5.5, C.INK1);
    fig.ellipse(bx + side * 1.5, ay - 5, 7.5, 3.8, C.INK2);
    fig.line(bx - 7, ay - 1, bx + 8, ay - 1, 1.6, C.GOLD2);
    fig.arc(bx + side * 1.5, ay - 6, 5.5, 2.5, 1.2, Math.PI * 1.1, Math.PI * 1.9, C.GOLD1);
    for (let r = 0; r < 4; r++) {
      const ly = ay - 12 - r * 5.2;
      fig.line(bx - 3, ly - 2, bx + 3, ly + 2, 1.2, C.GOLD2);
      fig.line(bx + 3, ly - 2, bx - 3, ly + 2, 1.2, C.GOLD1);
    }
  }

  // 4. Cream Pleated Inner Skirt + Split Swallowtail Royal-Violet Coat
  fig.poly([[cx - 16, 114], [cx + 16, 114], [cx + 24, 166], [cx - 24, 166]], C.SILK1);
  fig.poly([[cx - 11, 114], [cx + 11, 114], [cx + 16, 164], [cx - 16, 164]], C.SILK2);
  for (let wx = -14; wx <= 14; wx += 5) fig.arc(cx + wx, 162, 2.2, 2.0, 1.0, Math.PI, Math.PI * 2, C.SILK0);

  for (const side of [-1, 1]) {
    fig.poly([
      [cx + side * 7, 112],
      [cx + side * 18, 113],
      [cx + side * 38, 170],
      [cx + side * 24, 163],
      [cx + side * 14, 166],
    ], side < 0 ? C.ROBE1 : C.ROBE2);
    fig.line(cx + side * 12, 116, cx + side * 28, 164, 1.8, C.ROBE3);
    fig.line(cx + side * 14, 166, cx + side * 37, 169, 1.3, C.GOLD2);
  }

  // 5. Torso & Áo Giao Lĩnh Collar + Wide Bell Sleeves
  fig.poly([[cx - 18, 78], [cx + 18, 78], [cx + 16, 114], [cx - 16, 114]], C.ROBE1);
  fig.poly([[cx - 14, 79], [cx + 14, 79], [cx + 12, 113], [cx - 12, 113]], C.ROBE2);
  fig.poly([[cx - 8, 78], [cx + 8, 78], [cx, 98]], C.ROBE3);
  fig.line(cx - 11, 78, cx + 3, 112, 4.5, C.SILK2);
  fig.line(cx + 11, 78, cx - 2, 100, 4.5, C.SILK2);
  fig.line(cx - 13, 79, cx - 15, 92, 1.3, C.GOLD2);
  fig.line(cx + 13, 79, cx + 15, 92, 1.3, C.GOLD2);

  // Bell sleeves + cream cuffs + hands over Holo-Keyboard
  for (const side of [-1, 1]) {
    const shX = cx + side * 18, shY = 83;
    const wrX = cx + side * 27, wrY = 104;
    fig.capsule(shX, shY, wrX, wrY, 9, 10.5, side < 0 ? C.ROBE1 : C.ROBE2);
    fig.arc(shX + side * 2, shY - 2, 7, 6, 1.8, Math.PI * 1.1, Math.PI * 1.9, C.ROBE3);
    fig.ellipse(wrX, wrY, 8.5, 7.2, C.SILK2);
    fig.ellipse(wrX, wrY, 6.2, 5.0, C.INK1);
    fig.ring(wrX, wrY, 8.6, 7.3, 1.2, C.GOLD2);
    fig.ellipse(wrX - side * 2, wrY + 3, 4.8, 3.8, C.SKIN1);
  }

  // Waist Sash + Ấn Biên Dịch Clasp + Twin Cyan-Gold Tassels
  fig.rect(cx - 16, 111, 32, 5, C.INK1);
  fig.line(cx - 16, 111, cx + 16, 111, 1.2, C.GOLD2);
  fig.poly([[cx, 107], [cx + 6, 113.5], [cx, 120], [cx - 6, 113.5]], C.GOLD2);
  fig.poly([[cx, 109.5], [cx + 3.5, 113.5], [cx, 117.5], [cx - 3.5, 113.5]], C.CYAN3);
  for (const side of [-1, 1]) {
    const tx = cx + side * 16, ty = 126;
    fig.line(cx + side * 9, 115, tx, ty - 4, 1.2, C.GOLD2);
    fig.poly([[tx, ty - 4], [tx + 3.5, ty], [tx, ty + 4], [tx - 3.5, ty]], C.GOLD2);
    fig.set(tx, ty, C.CYAN2);
    fig.poly([[tx - 2.5, ty + 4], [tx + 2.5, ty + 4], [tx + 3.5, ty + 13], [tx - 3, ty + 13]], C.CYAN3);
  }

  // 6. Neck, Face, Round Glasses, Cyan Eyes & Hairpin
  fig.rect(cx - 5, 70, 10, 10, C.SKIN2);
  fig.ellipse(cx, 54, 18, 19, C.SKIN2);
  fig.ellipse(cx, 52.5, 16.8, 17.8, C.SKIN1);

  for (const side of [-1, 1]) {
    const ex = cx + side * 8.2, ey = 54;
    fig.ellipse(ex, ey, 4.8, 4.2, C.WHITE);
    fig.ellipse(ex, ey + 0.5, 3.4, 3.4, C.CYAN1);
    fig.ellipse(ex, ey + 1.0, 2.2, 2.0, C.CYAN2);
    fig.set(ex, ey + 1.8, C.CYAN3);
    fig.ellipse(ex, ey, 1.3, 1.5, C.INK1);
    fig.ellipse(ex - 1.4, ey - 1.3, 1.2, 1.1, C.WHITE);
    fig.arc(ex, ey - 0.5, 4.8, 3.8, 1.4, Math.PI * 1.1, Math.PI * 1.9, C.INK1);
    fig.ellipse(ex + side * 3, ey + 6, 2.6, 1.4, C.PINK);
    fig.ring(ex, ey + 0.3, 6.8, 6.5, 1.3, C.INK1);
    fig.line(ex - 3.5, ey - 3.5, ex - 1.2, ey - 1.2, 1.1, C.WHITE);
    fig.line(cx + side * 15, ey - 0.5, cx + side * 19, ey - 2, 1.3, C.GOLD2);
  }
  fig.rect(cx - 1.5, 53.5, 3.0, 1.5, C.GOLD2);
  fig.arc(cx, 62.5, 3.8, 2.0, 1.2, 0.2 * Math.PI, 0.8 * Math.PI, C.SKIN3);

  // Layered Bob Hair + Peach-Blossom Pagoda Hairpin
  fig.poly([[cx - 21, 44], [cx - 4, 29], [cx + 5, 30], [cx - 10, 47], [cx - 19, 49]], C.ROBE2);
  fig.poly([[cx - 5, 30], [cx + 10, 30], [cx + 1, 48], [cx - 6, 46]], C.ROBE3);
  fig.poly([[cx + 6, 30], [cx + 21, 41], [cx + 15, 48], [cx + 5, 46]], C.HAIR1);
  fig.arc(cx, 33, 13, 4.5, 1.8, Math.PI * 1.1, Math.PI * 1.9, C.ROBE3);
  for (const side of [-1, 1]) {
    const lx = cx + side * 17.5;
    fig.poly([[lx - side * 3, 39], [lx + side * 4.5, 42], [lx + side * 3, 73], [lx - side * 1.5, 68]], side < 0 ? C.ROBE2 : C.HAIR1);
    fig.poly([[lx + side * 1.5, 73], [lx + side * 3, 75], [lx + side * 1.5, 77], [lx, 75]], C.CYAN3);
  }
  drawPeachHairpin(fig, cx - 21, 41, -1.4, 0);

  fig.outline(C.OUT);
  for (let i = 0; i < s.buf.length; i++) if (fig.buf[i]) s.buf[i] = fig.buf[i];

  // Foreground Floating Holographic Rune-Keyboard & Twin Prism Orbs
  drawHoloKeyboard(s, cx, 111, 0, 56, 2);
  drawPrismOrb(s, cx - 44, 108, 1.8, 0.8, C.CYAN3);
  drawPrismOrb(s, cx + 44, 108, 1.8, 0.8, C.CYAN3);
  for (let i = 0; i < 14; i++) {
    const a = (i * Math.PI * 2) / 14 + 0.3;
    s.ellipse(cx + Math.cos(a) * 76, 100 + Math.sin(a) * 72, 2.0, 1.4, i % 2 === 0 ? C.CYAN3 : C.PINK);
  }
  return s;
}

module.exports = {
  PAL_HEX, C, PixelSurface, savePng,
  drawLotusEmblem, drawPrismOrb, drawHoloKeyboard, drawCodeWindow,
  drawPeachHairpin, drawHoaViRig, buildHoaViPortrait128, buildHoaViKeyArt,
};
