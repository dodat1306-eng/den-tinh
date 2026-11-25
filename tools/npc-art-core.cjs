'use strict';
const fs = require('node:fs');
const zlib = require('node:zlib');

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const PAL_HEX = [
  '#000000', '#12091a', '#09131c', '#14222e', '#233545', '#3b5166', '#627d94', '#9cb4c9', '#e8f4ff', '#ffffff',
  '#8f5749', '#bd7d67', '#e3a88c', '#fad1b8', '#6e4236', '#9e634f', '#c98970',
  '#171221', '#2c233d', '#4a3d63', '#8c857b', '#bfb8aa', '#ebe4d5', '#f7f2e6',
  '#2b180e', '#4d2d1a', '#78492a', '#a66c3e', '#d49d62', '#eddbc0',
  '#5c3811', '#8f5a1d', '#c9892c', '#f5be49', '#ffe680', '#fff7c2',
  '#470d16', '#7d1926', '#bf2a36', '#f24e38', '#ff852b', '#ffba42',
  '#2a1338', '#4d2366', '#7a3b9e', '#ab68cc', '#8f2d56', '#cf5585', '#f58cb6', '#ffc9df',
  '#0e2b1d', '#1b4d33', '#2e7a4f', '#52b06e', '#8ce08e', '#cbfca4',
  '#0c2836', '#16485e', '#23728f', '#3ba3bd', '#6be2f2', '#bafaff',
  '#161e38', '#273663', '#415896', '#6b86c9', '#36333d', '#575261', '#827c8f', '#b0aab8',
  '#6e2711', '#ad4318', '#e36b24', '#ff9b42', '#6c35bd', '#b580ff',
];

const C = {
  T: 0, OUT: 1, BG0: 2, BG1: 3,
  IRON0: 4, IRON1: 5, IRON2: 6, IRON3: 7, SILVER: 8, WHITE: 9,
  SKIN0: 10, SKIN1: 11, SKIN2: 12, SKIN3: 13,
  TAN0: 14, TAN1: 15, TAN2: 16,
  HAIR0: 17, HAIR1: 18, HAIR2: 19,
  SILV0: 20, SILV1: 21, SILV2: 22, CREAM: 23,
  WOOD0: 24, WOOD1: 25, WOOD2: 26, WOOD3: 27, STRAW1: 28, STRAW2: 29,
  GOLD0: 30, GOLD1: 31, GOLD2: 32, GOLD3: 33, GOLD4: 34, GOLD5: 35,
  RED0: 36, RED1: 37, RED2: 38, EMBER1: 39, EMBER2: 40, EMBER3: 41,
  PURP0: 42, PURP1: 43, PURP2: 44, PURP3: 45,
  PINK0: 46, PINK1: 47, PINK2: 48, PINK3: 49,
  LEAF0: 50, LEAF1: 51, LEAF2: 52, LEAF3: 53, LIME1: 54, LIME2: 55,
  TEAL0: 56, TEAL1: 57, TEAL2: 58, CYAN1: 59, CYAN2: 60, CYAN3: 61,
  IND0: 62, IND1: 63, IND2: 64, IND3: 65,
  ASH0: 66, ASH1: 67, ASH2: 68, ASH3: 69,
  FOX0: 70, FOX1: 71, FOX2: 72, FOX3: 73,
  SOUL1: 74, SOUL2: 75,
};

const PAL_RGB = PAL_HEX.map(h => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]);

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
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodeIndexedPng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 3;
  const plte = Buffer.alloc(PAL_RGB.length * 3);
  for (let i = 0; i < PAL_RGB.length; i++) {
    plte[i * 3] = PAL_RGB[i][0];
    plte[i * 3 + 1] = PAL_RGB[i][1];
    plte[i * 3 + 2] = PAL_RGB[i][2];
  }
  const trns = Buffer.from([0]);
  const stride = width + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    raw.set(pixels.subarray(y * width, (y + 1) * width), y * stride + 1);
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

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

class PixelSurface {
  constructor(w, h) { this.w = w; this.h = h; this.buf = new Uint8Array(w * h); }
  clear() { this.buf.fill(0); }
  set(x, y, col) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 1 && x < this.w - 1 && y >= 1 && y < this.h - 1 && col > 0) this.buf[y * this.w + x] = col;
  }
  rect(x, y, w, h, col) {
    if (!col) return;
    const x0 = Math.max(1, Math.round(x)), y0 = Math.max(1, Math.round(y));
    const x1 = Math.min(this.w - 1, Math.round(x + w)), y1 = Math.min(this.h - 1, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      const off = yy * this.w;
      for (let xx = x0; xx < x1; xx++) this.buf[off + xx] = col;
    }
  }
  rectRaw(x, y, w, h, col) {
    if (!col) return;
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x + w)), y1 = Math.min(this.h, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      const off = yy * this.w;
      for (let xx = x0; xx < x1; xx++) this.buf[off + xx] = col;
    }
  }
  ellipse(cx, cy, rx, ry, col) {
    if (!col || rx <= 0 || ry <= 0) return;
    const x0 = Math.max(1, Math.floor(cx - rx - 0.5)), x1 = Math.min(this.w - 2, Math.ceil(cx + rx + 0.5));
    const y0 = Math.max(1, Math.floor(cy - ry - 0.5)), y1 = Math.min(this.h - 2, Math.ceil(cy + ry + 0.5));
    for (let y = y0; y <= y1; y++) {
      const dy = (y - cy) / ry, dy2 = dy * dy, off = y * this.w;
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / rx;
        if (dx * dx + dy2 <= 1.0) this.buf[off + x] = col;
      }
    }
  }
  ring(cx, cy, rx, ry, thick, col) {
    if (!col || rx <= 0 || ry <= 0) return;
    const x0 = Math.max(1, Math.floor(cx - rx - thick - 1)), x1 = Math.min(this.w - 2, Math.ceil(cx + rx + thick + 1));
    const y0 = Math.max(1, Math.floor(cy - ry - thick - 1)), y1 = Math.min(this.h - 2, Math.ceil(cy + ry + thick + 1));
    const irx = Math.max(0.1, rx - thick), iry = Math.max(0.1, ry - thick);
    for (let y = y0; y <= y1; y++) {
      const off = y * this.w;
      for (let x = x0; x <= x1; x++) {
        const od = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        const id = ((x - cx) / irx) ** 2 + ((y - cy) / iry) ** 2;
        if (od <= 1.0 && id >= 1.0) this.buf[off + x] = col;
      }
    }
  }
  arc(cx, cy, rx, ry, thick, a0, a1, col) {
    const steps = Math.max(16, Math.ceil(Math.max(rx, ry) * 5));
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * (i / steps);
      const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
      if (thick <= 1.1) this.set(px, py, col);
      else this.ellipse(px, py, thick * 0.52, thick * 0.52, col);
    }
  }
  line(x0, y0, x1, y1, thick, col) {
    if (!col) return;
    const dx = x1 - x0, dy = y1 - y0;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 2));
    const r = (thick - 1) * 0.5 + 0.35;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = x0 + dx * t, y = y0 + dy * t;
      if (thick <= 1.05) this.set(x, y, col);
      else this.ellipse(x, y, r, r, col);
    }
  }
  capsule(x0, y0, x1, y1, r0, r1, col) {
    if (!col) return;
    const dx = x1 - x0, dy = y1 - y0;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 1.8));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.ellipse(x0 + dx * t, y0 + dy * t, r0 + (r1 - r0) * t, r0 + (r1 - r0) * t, col);
    }
  }
  curve(pts, r0, r1, col) {
    for (let i = 0; i < pts.length - 1; i++) {
      const t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
      this.capsule(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1, col);
    }
  }
  poly(pts, col) {
    if (!col || pts.length < 3) return;
    let minX = this.w, maxX = 0, minY = this.h, maxY = 0;
    for (const [x, y] of pts) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const x0 = Math.max(1, Math.floor(minX)), x1 = Math.min(this.w - 2, Math.ceil(maxX));
    const y0 = Math.max(1, Math.floor(minY)), y1 = Math.min(this.h - 2, Math.ceil(maxY));
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5, off = y * this.w;
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
          if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi)) inside = !inside;
        }
        if (inside) this.buf[off + x] = col;
      }
    }
  }
  ditherAura(cx, cy, rx, ry, innerCol, outerCol, density = 0.55) {
    if (rx <= 0 || ry <= 0) return;
    const x0 = Math.max(1, Math.floor(cx - rx)), x1 = Math.min(this.w - 2, Math.ceil(cx + rx));
    const y0 = Math.max(1, Math.floor(cy - ry)), y1 = Math.min(this.h - 2, Math.ceil(cy + ry));
    for (let y = y0; y <= y1; y++) {
      const off = y * this.w;
      for (let x = x0; x <= x1; x++) {
        if (this.buf[off + x] !== 0) continue;
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
        if (d > 1) continue;
        const v = (1 - d) * density;
        if (v > (BAYER[y & 3][x & 3] + 0.5) / 16) this.buf[off + x] = (1 - d) > 0.58 ? innerCol : outerCol;
      }
    }
  }
  outline(col = C.OUT) {
    const src = Uint8Array.from(this.buf);
    const w = this.w, h = this.h;
    for (let y = 1; y < h - 1; y++) {
      const off = y * w;
      for (let x = 1; x < w - 1; x++) {
        const i = off + x;
        if (src[i] !== 0) continue;
        if (src[i - 1] || src[i + 1] || src[i - w] || src[i + w]) this.buf[i] = col;
      }
    }
  }
  merge(other) {
    const a = this.buf, b = other.buf, n = a.length;
    for (let i = 0; i < n; i++) if (b[i]) a[i] = b[i];
  }
  blitTo(atlasBuf, atlasW, dstX, dstY) {
    for (let y = 0; y < this.h; y++) {
      const sOff = y * this.w, dOff = (dstY + y) * atlasW + dstX;
      for (let x = 0; x < this.w; x++) {
        const v = this.buf[sOff + x];
        if (v !== 0) atlasBuf[dOff + x] = v;
      }
    }
  }
}

function scaleBlit(src, srcW, sx, sy, cw, ch, dst, dstW, dx, dy, scale) {
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const col = src[(sy + y) * srcW + (sx + x)];
      if (!col) continue;
      for (let py = 0; py < scale; py++) {
        const dOff = (dy + y * scale + py) * dstW + (dx + x * scale);
        for (let px = 0; px < scale; px++) dst[dOff + px] = col;
      }
    }
  }
}

function drawLantern(s, x, y, bodyCol, glowCol, sway = 0, scale = 1, flare = 0) {
  const lx = x + sway * 1.6, ly = y, rx = 3.2 * scale, ry = 4.2 * scale;
  if (flare > 0.08) s.ditherAura(lx, ly, (7.5 + flare * 5) * scale, (7.5 + flare * 5) * scale, glowCol, bodyCol, 0.45 + flare * 0.35);
  s.line(x, y - 6.2 * scale, lx, ly - ry, 1, C.GOLD2);
  s.rect(lx - 2.4 * scale, ly - ry - 1.1, 4.8 * scale, 1.5, C.GOLD2);
  s.ellipse(lx, ly, rx, ry, bodyCol);
  s.ellipse(lx, ly, rx * 0.62, ry * 0.65, glowCol);
  s.ellipse(lx, ly - 0.3, rx * 0.32, ry * 0.35, C.WHITE);
  s.rect(lx - 2.2 * scale, ly + ry - 0.6, 4.4 * scale, 1.3, C.GOLD2);
  s.line(lx, ly + ry + 0.6, lx + sway * 1.4, ly + ry + 4.0 * scale, 1.1, C.GOLD3);
}

function drawNonLa(s, hx, hy, tilt = 0, w = 11.5, h = 6.2, darkStraw = false) {
  const c0 = darkStraw ? C.WOOD2 : C.WOOD3, c1 = darkStraw ? C.WOOD3 : C.STRAW1, c2 = darkStraw ? C.STRAW1 : C.STRAW2;
  const tx = hx + tilt * 1.2, ty = hy - h;
  s.poly([[tx, ty], [hx - w, hy + 1.2 - tilt], [hx + w, hy + 1.2 + tilt]], c0);
  s.poly([[tx, ty], [hx - w * 0.72, hy + 0.9 - tilt * 0.7], [hx + w * 0.32, hy + 0.9]], c1);
  s.line(tx, ty, hx - w * 0.45, hy + 0.8 - tilt * 0.5, 1.0, c2);
  s.line(hx - w, hy + 1.2 - tilt, hx + w, hy + 1.2 + tilt, 1.2, C.GOLD2);
}

function drawLotusFlower(s, cx, cy, scale = 1, open = 0.5, mainCol = C.PINK1, hiCol = C.PINK3) {
  const spread = (2.6 + open * 2.4) * scale;
  for (let i = -2; i <= 2; i++) {
    const a = -Math.PI / 2 + i * (0.34 + open * 0.14);
    s.ellipse(cx + Math.cos(a) * spread, cy + Math.sin(a) * spread * 0.9, 1.7 * scale, 2.5 * scale, Math.abs(i) === 2 ? C.PINK0 : Math.abs(i) === 1 ? mainCol : hiCol);
  }
  s.ellipse(cx, cy - 0.6 * scale, 1.3 * scale, 1.1 * scale, C.GOLD4);
}

function drawSparkStar(s, x, y, r, col = C.GOLD4, core = C.WHITE) {
  if (r <= 1.2) { s.set(x, y, core); return; }
  s.line(x - r, y, x + r, y, 1, col);
  s.line(x, y - r, x, y + r, 1, col);
  s.set(x, y, core);
}

function drawBookOpen(s, x, y, pageCol = C.CREAM, coverCol = C.WOOD1, glowRune = 0) {
  s.poly([[x - 6.5, y - 2.8], [x, y - 1.5], [x + 6.5, y - 2.8], [x + 6.0, y + 3.4], [x, y + 4.2], [x - 6.0, y + 3.4]], coverCol);
  s.poly([[x - 5.6, y - 2.2], [x - 0.4, y - 1.1], [x - 0.4, y + 3.3], [x - 5.2, y + 2.6]], pageCol);
  s.poly([[x + 5.6, y - 2.2], [x + 0.4, y - 1.1], [x + 0.4, y + 3.3], [x + 5.2, y + 2.6]], C.SILV2);
  s.line(x - 4.4, y - 0.6, x - 1.4, y - 0.2, 1, glowRune > 0.3 ? C.GOLD3 : C.WOOD2);
  s.line(x + 1.4, y - 0.2, x + 4.4, y - 0.6, 1, glowRune > 0.3 ? C.GOLD4 : C.WOOD2);
  s.line(x - 4.2, y + 1.2, x - 1.6, y + 1.5, 1, C.WOOD2);
  s.line(x + 1.6, y + 1.5, x + 4.2, y + 1.2, 1, glowRune > 0.5 ? C.GOLD3 : C.WOOD2);
}

const NPC_SPECS = [
  { id: 'elder', name: 'Bà Năm', zone: 'Làng Đèn', station: false, build: 'elder',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.SILV0, C.SILV1, C.SILV2],
    robe: [C.WOOD0, C.WOOD1, C.WOOD2, C.GOLD2], sub: [C.GOLD1, C.GOLD2, C.GOLD3], eye: C.WOOD0,
    light: '#ffb85c', workLabel: 'Chăm đèn tổ tiên & chỉnh kính lão', greetLabel: 'Nâng đèn vẫy gọi hiền hậu', interactLabel: 'Khơi bùng Tâm Hỏa truyền lời dặn' },
  { id: 'smith', name: 'Chú Bảy', zone: 'Làng Đèn', station: true, build: 'broad',
    skin: [C.TAN0, C.TAN1, C.TAN2, C.SKIN3], hair: [C.HAIR0, C.HAIR1, C.WOOD1],
    robe: [C.WOOD0, C.WOOD1, C.WOOD2, C.GOLD2], sub: [C.RED1, C.RED2, C.EMBER2], eye: C.CYAN2,
    light: '#ff7b29', workLabel: 'Nện búa rèn phôi sao băng & kéo bễ', greetLabel: 'Gác búa lên vai cười vẫy gọi', interactLabel: 'Cộng hưởng thần binh bung hoa lửa' },
  { id: 'temple_keeper', name: 'Ông Từ Đạo', zone: 'Làng Đèn', station: false, build: 'tall',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.SILV0, C.SILV1, C.SILV2],
    robe: [C.IND0, C.IND1, C.IND2, C.GOLD2], sub: [C.TEAL1, C.CYAN1, C.CREAM], eye: C.IND0,
    light: '#ffd97d', workLabel: 'Tra Sổ Đinh & phất trần quét sương', greetLabel: 'Chắp tay thi lễ cổ truyền', interactLabel: 'Mở Sổ Đinh hiện bốn chữ vàng bị xóa' },
  { id: 'weaver_woman', name: 'Chị Lụa', zone: 'Làng Đèn', station: true, build: 'slender',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.HAIR0, C.HAIR1, C.PURP1],
    robe: [C.PURP0, C.PURP1, C.PINK1, C.PINK2], sub: [C.RED1, C.GOLD2, C.GOLD4], eye: C.HAIR0,
    light: '#f4a2b8', workLabel: 'Đưa thoi dệt lụa trên khung cửi gỗ', greetLabel: 'Chạm sợi tơ tim ngước nhìn ra hiên', interactLabel: 'Nâng dải lụa ký ức dệt ánh tơ vàng' },
  { id: 'lantern_boy', name: 'Cậu Bé Tèo', zone: 'Làng Đèn', station: false, build: 'child',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.HAIR0, C.HAIR1, C.HAIR2],
    robe: [C.LEAF0, C.LEAF1, C.LEAF2, C.LEAF3], sub: [C.RED2, C.GOLD3, C.CYAN2], eye: C.HAIR0,
    light: '#6be2f2', workLabel: 'Thổi chong chóng ngược gió & nhún nhảy', greetLabel: 'Nhảy vẫy đèn xanh gọi lớn', interactLabel: 'Xoay lốc hoa giấy chỉ hướng rừng trúc' },

  { id: 'blind_bard', name: 'Lão Mù Ca Trù', zone: 'Đường Gió', station: true, build: 'seated',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.SILV0, C.SILV1, C.SILV2],
    robe: [C.WOOD0, C.WOOD1, C.WOOD2, C.STRAW1], sub: [C.GOLD1, C.GOLD3, C.LEAF3], eye: C.CREAM,
    light: '#a7f3d0', workLabel: 'Nhấn phím gảy Đàn Đáy ngân sóng âm', greetLabel: 'Nghiêng tai lắng nghe cúi chào trên chiếu', interactLabel: 'Tấu Bát Âm Phong Nhạc tám nốt cổ ngữ' },
  { id: 'wandering_merchant', name: 'Lý Gù', zone: 'Đường Gió', station: false, build: 'hunched',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.HAIR0, C.HAIR1, C.PURP2],
    robe: [C.PURP0, C.PURP1, C.PURP2, C.GOLD3], sub: [C.LEAF1, C.RED2, C.CYAN2], eye: C.GOLD3,
    light: '#fbbf24', workLabel: 'Nhún đòn gánh đôi đèn & tung đồng xu', greetLabel: 'Ngoắc tay mời chào vỗ túi gấm', interactLabel: 'Soi giao thoa hai ngọn đèn mở tráp cổ' },
  { id: 'bamboo_hunter', name: 'Thợ Săn Già Sơn', zone: 'Rừng Trúc', station: false, build: 'broad',
    skin: [C.TAN0, C.TAN1, C.TAN2, C.SKIN3], hair: [C.SILV0, C.SILV1, C.SILV2],
    robe: [C.LEAF0, C.LEAF1, C.LEAF2, C.WOOD3], sub: [C.WOOD1, C.LIME1, C.CREAM], eye: C.LEAF3,
    light: null, workLabel: 'Thử dây cung trúc & điểm mũi tên lông', greetLabel: 'Hạ mũi cung giơ nắm tay chào thợ rừng', interactLabel: 'Giương cung chỉ hướng & nâng mặt nạ Nhuận' },
  { id: 'bamboo_nun', name: 'Sư Cô Tịnh Tâm', zone: 'Rừng Trúc', station: true, build: 'slender',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.WOOD0, C.WOOD1, C.WOOD2],
    robe: [C.WOOD0, C.WOOD1, C.TEAL1, C.LEAF3], sub: [C.LEAF2, C.LIME1, C.CREAM], eye: C.HAIR0,
    light: '#86efac', workLabel: 'Lần 18 hạt ngọc bích bên lư trầm khói', greetLabel: 'Đơn chưởng thi lễ tỏa hương thanh tịnh', interactLabel: 'Kết ấn hộ niệm xoay vòng tràng hạt ngọc' },
  { id: 'cursed_woodcutter', name: 'Tiều Phu Hóa Đá', zone: 'Rừng Trúc', station: true, build: 'broad',
    skin: [C.TAN0, C.TAN1, C.TAN2, C.SKIN3], hair: [C.HAIR0, C.ASH1, C.ASH2],
    robe: [C.TEAL0, C.TEAL1, C.TEAL2, C.ASH2], sub: [C.ASH0, C.ASH2, C.LEAF2], eye: C.HAIR0,
    light: null, workLabel: 'Giằng rễ cây hóa đá & đọc nhật ký khô', greetLabel: 'Giơ nhật ký cảnh báo vùng rễ nguyền', interactLabel: 'Chấn rìu nứt vỏ đá bừng sáng trang ký ức' },

  { id: 'lotus_crone', name: 'Mụ Còng', zone: 'Đầm Sen', station: true, build: 'boat',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.SILV0, C.SILV1, C.SILV2],
    robe: [C.PURP0, C.PURP1, C.PURP2, C.GOLD2], sub: [C.WOOD2, C.PINK1, C.PINK3], eye: C.HAIR0,
    light: '#f472b6', workLabel: 'Chống sào thuyền nan bên đóa sen nở', greetLabel: 'Nâng vành nón lá dặn đừng uống bát nước', interactLabel: 'Nâng sen hồng bung sáu cánh linh quang' },
  { id: 'scholar_ghost', name: 'Thư Sinh Mặc Khách', zone: 'Đầm Sen', station: false, build: 'ghost',
    skin: [C.TEAL2, C.CYAN1, C.CYAN2, C.CYAN3], hair: [C.IND0, C.IND1, C.TEAL2],
    robe: [C.TEAL0, C.TEAL1, C.CYAN1, C.CYAN3], sub: [C.LEAF2, C.CYAN2, C.WHITE], eye: C.WHITE,
    light: '#67e8f9', workLabel: 'Lơ lửng vung bút ngọc viết chữ sương', greetLabel: 'Thu bút vào tay áo vái chào nho nhã', interactLabel: 'Khai bút họa vòng phù thủy mặc trên không' },
  { id: 'firefly_girl', name: 'Miên', zone: 'Đầm Sen', station: false, build: 'slender',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.HAIR0, C.HAIR1, C.HAIR2],
    robe: [C.LEAF0, C.LEAF1, C.LEAF3, C.LIME1], sub: [C.PINK1, C.PINK2, C.LIME2], eye: C.LEAF2,
    light: '#bef264', workLabel: 'Nâng búp sen gọi đàn đom đóm lượn số 8', greetLabel: 'Vẫy tay gom đom đóm thành vòng dẫn lối', interactLabel: 'Thả búp sen nở xoáy dải ngân hà đom đóm' },
  { id: 'ash_forger', name: 'Lão Hỏa Sơn', zone: 'Đồi Tro', station: true, build: 'broad',
    skin: [C.TAN0, C.TAN1, C.TAN2, C.SKIN3], hair: [C.SILV0, C.SILV1, C.SILV2],
    robe: [C.ASH0, C.ASH1, C.IRON1, C.GOLD2], sub: [C.RED2, C.EMBER2, C.GOLD4], eye: C.EMBER2,
    light: '#ff5e1a', workLabel: 'Trở tinh thiết trên lò tro bằng tay đồng', greetLabel: 'Giơ cánh tay cơ khí đồng chào vang dội', interactLabel: 'Kích hoạt búa đồng nổ hoa lửa sao băng' },
  { id: 'ash_gravedigger', name: 'Kẻ Đào Mộ Tro', zone: 'Đồi Tro', station: true, build: 'tall',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.ASH0, C.ASH1, C.ASH2],
    robe: [C.WOOD0, C.ASH0, C.ASH1, C.PURP2], sub: [C.ASH2, C.SOUL1, C.SOUL2], eye: C.SOUL2,
    light: '#a855f7', workLabel: 'Vun tro chân bia đá & canh đèn hồn tím', greetLabel: 'Cắm xẻng đặt tay lên ngực tưởng niệm', interactLabel: 'Gõ hai nhịp Hạc gọi bướm hồn bay lên' },

  { id: 'exiled_pyromancer', name: 'Pháp Sư Huyền', zone: 'Đồi Tro', station: false, build: 'tall',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.HAIR0, C.RED1, C.EMBER1],
    robe: [C.RED0, C.RED1, C.RED2, C.GOLD3], sub: [C.EMBER1, C.EMBER2, C.GOLD5], eye: C.EMBER3,
    light: '#fb923c', workLabel: 'Luân chuyển cầu lửa sống quanh trượng ngọc', greetLabel: 'Chống quyền trượng nâng cao ngọn hỏa tâm', interactLabel: 'Thi triển Song Hỏa Liên Hoàn rẽ lối lửa' },
  { id: 'waterfall_hermit', name: 'Thanh Hư', zone: 'Thác Ngọc', station: true, build: 'seated',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.SILV0, C.SILV1, C.SILV2],
    robe: [C.TEAL0, C.LEAF1, C.LEAF3, C.CYAN2], sub: [C.GOLD2, C.CYAN1, C.WHITE], eye: C.CYAN1,
    light: '#2dd4bf', workLabel: 'Ngồi tảng đá rêu buông cần câu trúc', greetLabel: 'Thu nhẹ cần câu bắt quyết đạo gia chào', interactLabel: 'Nhấc giọt Linh Thủy lấp lánh thất sắc' },
  { id: 'windmill_keeper', name: 'Người Gác Phong', zone: 'Thung Lũng Đèn', station: false, build: 'tall',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.WOOD1, C.WOOD2, C.WOOD3],
    robe: [C.TEAL0, C.TEAL1, C.TEAL2, C.GOLD3], sub: [C.GOLD1, C.GOLD3, C.LIME1], eye: C.CYAN1,
    light: null, workLabel: 'Quay phong kế đồng & tra chìa vặn cót gió', greetLabel: 'Đẩy kính phi công giơ chìa đồng vẫy chào', interactLabel: 'Lên dây phong luân cuốn lốc gió thanh âm' },
  { id: 'automaton_07', name: 'Cơ Linh 07', zone: 'Phế Tích Thiên Cơ', station: false, build: 'automaton',
    skin: [C.ASH1, C.ASH2, C.ASH3, C.SILVER], hair: [C.GOLD0, C.GOLD1, C.GOLD2],
    robe: [C.TEAL0, C.IRON1, C.GOLD2, C.CYAN2], sub: [C.GOLD1, C.CYAN1, C.CYAN3], eye: C.CYAN2,
    light: '#22d3ee', workLabel: 'Quét tia thấu kính đọc bảng mã Root Log', greetLabel: 'Nghiêng khớp cổ chớp kính chào nhận diện', interactLabel: 'Chiếu ba tầng Hologram Bản 08 & K6-3' },
  { id: 'ferryman', name: 'Người Lái Đò', zone: 'Bến Sương Biên Viễn', station: false, build: 'tall',
    skin: [C.TAN0, C.TAN1, C.TAN2, C.SKIN3], hair: [C.SILV0, C.SILV1, C.SILV2],
    robe: [C.LEAF0, C.LEAF1, C.WOOD2, C.STRAW1], sub: [C.TEAL1, C.CYAN1, C.GOLD3], eye: C.CYAN2,
    light: '#38bdf8', workLabel: 'Khoác áo tơi khua mái chèo rẽ sương mù', greetLabel: 'Dựng chèo nâng vành nón lá gật đầu chào', interactLabel: 'Gõ ba nhịp chèo ngân sóng âm qua bến' },

  { id: 'mirror_maiden', name: 'Cô Gái Trong Gương', zone: 'Rừng Gương', station: false, build: 'slender',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.HAIR0, C.HAIR1, C.PURP2],
    robe: [C.PURP0, C.PURP1, C.PURP2, C.PINK2], sub: [C.GOLD2, C.CYAN2, C.SILVER], eye: C.PURP3,
    light: '#e879f9', workLabel: 'Soi gương đồng lơ lửng & chạm khuyên bạc', greetLabel: 'Khép tay trước gương cúi chào thanh tao', interactLabel: 'Xoay gương mở cổng pha lê hiện bóng khuyên' },
  { id: 'bell_keeper', name: 'Người Giữ Miếu Chuông', zone: 'Miếu Chuông Gió', station: false, build: 'tall',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.HAIR0, C.IND1, C.TEAL2],
    robe: [C.IND0, C.TEAL1, C.TEAL2, C.GOLD3], sub: [C.GOLD1, C.GOLD3, C.RED2], eye: C.GOLD3,
    light: '#facc15', workLabel: 'Chạm dùi trầm hương ngân chuông đồng cổ', greetLabel: 'Nâng chuông ngang vai hành lễ giữ miếu', interactLabel: 'Gióng hai nhịp chuông bung sóng vàng kim' },
  { id: 'sun_child', name: 'Đứa Trẻ Nhặt Nắng', zone: 'Khu Vườn Thực Nhật', station: false, build: 'child',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.HAIR0, C.HAIR1, C.RED2],
    robe: [C.GOLD0, C.GOLD2, C.GOLD3, C.CREAM], sub: [C.RED2, C.GOLD4, C.GOLD5], eye: C.GOLD2,
    light: '#fde047', workLabel: 'Ôm Nhật Cầu thu nhỏ & nhón hứng giọt nắng', greetLabel: 'Nâng Nhật Cầu quá đầu vẫy gọi rạng rỡ', interactLabel: 'Thả Nhật Cầu nở mười hai cánh hoa thái dương' },
  { id: 'bronze_pilot', name: 'Hoa Tiêu Bằng Đồng', zone: 'Tháp Đếm Những Vì Sao', station: false, build: 'tall',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.WOOD0, C.WOOD1, C.GOLD2],
    robe: [C.IND0, C.IND1, C.GOLD1, C.GOLD3], sub: [C.GOLD2, C.CYAN2, C.GOLD4], eye: C.CYAN2,
    light: '#60a5fa', workLabel: 'Chỉnh La Bàn Tinh Cầu đo hai đầu tín hiệu', greetLabel: 'Chạm vành mũ chào kiểu hoa tiêu tháp sao', interactLabel: 'Mở ba vòng quỹ đạo sao chiếu bản đồ thiên cầu' },
  { id: 'dom_avatar', name: 'Hóa Thân Của Đốm', zone: 'Khung Cửi Cuối Chân Trời', station: false, build: 'fox',
    skin: [C.SKIN0, C.SKIN1, C.SKIN2, C.SKIN3], hair: [C.HAIR0, C.HAIR1, C.FOX2],
    robe: [C.FOX0, C.FOX1, C.FOX2, C.CREAM], sub: [C.GOLD2, C.GOLD4, C.RED2], eye: C.GOLD3,
    light: '#fcd34d', workLabel: 'Ba đuôi cáo uốn sóng & đan sợi chỉ vàng', greetLabel: 'Vểnh tai cáo vẫy đuôi mừng người bạn cũ', interactLabel: 'Bung ba đuôi hoàng kim dệt dấu chân dẫn lối' },
  { id: 'well', name: 'Giếng Ngọc', zone: 'Làng Đèn', station: true, build: 'well',
    skin: [C.ASH0, C.ASH1, C.ASH2, C.ASH3], hair: [C.WOOD0, C.WOOD1, C.WOOD2],
    robe: [C.TEAL0, C.TEAL1, C.CYAN1, C.CYAN2], sub: [C.LEAF1, C.LIME1, C.GOLD3], eye: C.CYAN3,
    light: '#5eead4', workLabel: 'Mặt nước ngọc gợn sóng & sương lành tỏa nhẹ', greetLabel: 'Dâng ánh ngọc bích đón bước chân nghỉ ngơi', interactLabel: 'Phun suối linh tuyền hồi phục sinh lực' },
];

function drawNpcBaseBody(bodyS, spec, ax, ay, pose) {
  const {
    bob = 0, leanX = 0, leanY = 0, headX: hOffX = 0, headY: hOffY = 0,
    armL = { dx: -5.5, dy: 6.5 }, armR = { dx: 5.5, dy: 6.5 },
    footL = 0, footR = 0, sway = 0, blink = false, talk = false, smile = false,
    aura = 0, phase = 0,
  } = pose;

  const b = spec.build;
  const isChild = b === 'child';
  const isBroad = b === 'broad';
  const isSlender = b === 'slender' || b === 'fox';
  const isSeated = b === 'seated' || b === 'boat';
  const isHunched = b === 'elder' || b === 'hunched';
  const isGhost = b === 'ghost';
  const isAuto = b === 'automaton';

  const K = isChild ? 0.77 : isBroad ? 1.04 : isSlender ? 0.94 : 0.98;
  const seatDrop = isSeated ? (b === 'boat' ? 5.5 : 7.5) : 0;
  const hunchY = isHunched ? 2.2 : 0;
  const hunchX = b === 'hunched' ? 1.8 : 0;

  const hipX = ax + leanX * 0.45;
  const hipY = ay - 16.5 * K + seatDrop + bob * 0.6;
  const chestX = hipX + (leanX + hunchX) * 0.75;
  const chestY = hipY - (10.5 * K - hunchY) + leanY * 0.7;
  const headX = chestX + hOffX + (isHunched ? 0.8 : 0);
  const headY = chestY - 10.2 * K + hOffY + (isHunched ? 1.0 : 0);

  const [sk0, sk1, sk2, sk3] = spec.skin;
  const [hr0, hr1] = spec.hair;
  const [rb0, rb1, rb2, rb3] = spec.robe;
  const [, sb1, sb2] = spec.sub;

  if (spec.id === 'dom_avatar') {
    for (let t = -1; t <= 1; t++) {
      const swayOff = Math.sin(phase * 2 + t * 1.2) * (1.8 + aura * 1.4);
      const mx = hipX + t * (8.5 + aura * 2.0) + swayOff * 0.5;
      const my = hipY - 5.5 - (t === 0 ? 5.5 : 1.5);
      const tx = hipX + t * (15.5 + aura * 3.0) + swayOff;
      const ty = hipY - 12.5 - (t === 0 ? 7.5 : 2.5) + Math.cos(phase * 2 + t) * 1.2;
      bodyS.capsule(hipX + t * 2.5, hipY - 1, mx, my, 3.4, 4.8, aura > 0.5 ? C.FOX3 : C.FOX1);
      bodyS.capsule(mx, my, tx, ty, 4.6, 2.4, aura > 0.5 ? C.GOLD3 : C.FOX2);
      bodyS.ellipse(tx, ty, 2.8, 2.5, C.CREAM);
      if (aura > 0.25) bodyS.set(tx, ty - 1, C.GOLD5);
    }
  } else if (spec.id === 'wandering_merchant') {
    bodyS.ellipse(chestX - 4.8, chestY + 1.5, 5.5, 6.2, C.WOOD2);
    bodyS.ellipse(chestX - 4.5, chestY + 0.8, 4.4, 4.8, C.WOOD3);
    bodyS.line(chestX - 8.5, chestY + 1.2, chestX - 1.0, chestY + 1.2, 1.1, C.GOLD2);
  } else if (spec.id === 'bamboo_hunter') {
    bodyS.capsule(chestX + 4.5, chestY + 4, chestX + 7.8, chestY - 6.5, 2.6, 2.8, C.WOOD1);
    for (let i = 0; i < 4; i++) {
      const ax0 = chestX + 6.2 + i * 1.3, ay0 = chestY - 7.5 - (i % 2);
      bodyS.line(ax0 - 0.8, ay0 + 3, ax0, ay0 - 3.2, 1, C.WOOD3);
      bodyS.ellipse(ax0 + 0.2, ay0 - 3.4, 1.1, 1.5, C.CREAM);
    }
  } else if (spec.id === 'windmill_keeper' || spec.id === 'bronze_pilot') {
    const sx1 = chestX - 7.5 - Math.abs(sway) * 2, sy1 = chestY + 2.5 + sway * 1.5;
    const sx2 = chestX - 13.5 - sway * 2.5, sy2 = chestY + 6.5 - sway * 1.8;
    bodyS.curve([[chestX - 2, chestY - 1.5], [sx1, sy1], [sx2, sy2]], 2.2, 1.3, C.GOLD3);
    bodyS.line(sx1, sy1 - 0.8, sx2, sy2 - 0.6, 1, C.GOLD4);
  }

  if (['weaver_woman', 'firefly_girl', 'mirror_maiden', 'dom_avatar', 'exiled_pyromancer'].includes(spec.id)) {
    bodyS.ellipse(headX, headY + 2.2, 7.6 * K, 7.8 * K, hr0);
    for (const sgn of [-1, 1]) {
      bodyS.capsule(headX + sgn * 6.0 * K, headY + 2, headX + sgn * (7.2 * K + sway * 0.8), chestY + 5.5, 2.3, 1.4,
        spec.id === 'exiled_pyromancer' && sgn > 0 ? C.RED2 : hr1);
    }
  }

  if (isGhost) {
    for (let i = -2; i <= 2; i++) {
      const wx = hipX + i * 2.6 + Math.sin(phase * 2 + i) * 1.6;
      const wy = ay - 3.5 - Math.abs(i) * 1.2 + Math.cos(phase * 2 + i) * 1.2;
      bodyS.capsule(hipX + i * 1.8, hipY + 2, wx, wy, 2.6, 0.9, Math.abs(i) === 2 ? rb1 : i === 0 ? C.CYAN3 : rb2);
    }
  } else if (isSeated) {
    bodyS.ellipse(hipX - 5.2, ay - 4.2, 5.4, 3.0, rb0);
    bodyS.ellipse(hipX + 5.2, ay - 4.2, 5.4, 3.0, rb1);
    bodyS.ellipse(hipX, ay - 3.8, 7.8, 3.2, rb2);
    bodyS.line(hipX - 6.5, ay - 4.6, hipX + 6.5, ay - 4.6, 1.1, rb3);
  } else {
    const spread = isBroad ? 4.4 : isChild ? 3.0 : 3.6;
    for (const [sgn, lift] of [[-1, footL], [1, footR]]) {
      const lx = hipX + sgn * spread, fy = ay - lift;
      bodyS.capsule(lx, hipY + 3, lx, fy - 2.2, 2.4 * K, 2.2 * K, isAuto ? C.IRON1 : C.BG1);
      if (spec.id === 'cursed_woodcutter') {
        bodyS.capsule(lx - sgn * 0.6, fy - 7.5, lx + sgn * 0.8, fy - 1.5, 2.9, 3.1, C.ASH1);
        bodyS.set(lx, fy - 4.5, C.LEAF2);
      }
      const shoeCol = spec.id === 'lantern_boy' ? sk2 : isAuto ? C.GOLD1 : C.WOOD0;
      bodyS.ellipse(lx + sgn * 0.5, fy - 1.3, 2.9 * K, 1.6 * K, shoeCol);
    }
  }

  const hasLongRobe = !['smith', 'lantern_boy', 'windmill_keeper', 'automaton_07', 'sun_child'].includes(spec.id) && !isSeated && !isGhost;
  if (hasLongRobe) {
    const skBot = ay - 5.2 + bob * 0.3;
    const wTop = isBroad ? 6.6 : isSlender ? 5.2 : 5.8, wBot = wTop + 3.2 + Math.abs(sway) * 0.8;
    bodyS.poly([[hipX - wTop, hipY - 0.5], [hipX + wTop, hipY - 0.5], [hipX + wBot + sway, skBot], [hipX - wBot + sway, skBot]], rb1);
    bodyS.poly([[hipX - wTop * 0.62, hipY], [hipX + wTop * 0.62, hipY], [hipX + wBot * 0.62 + sway, skBot - 0.5], [hipX - wBot * 0.62 + sway, skBot - 0.5]], rb2);
    bodyS.line(hipX - wBot + sway + 1, skBot - 0.5, hipX + wBot + sway - 1, skBot - 0.5, 1.0, rb3);
  } else if (spec.id === 'smith' || spec.id === 'ash_forger') {
    const apCol = spec.id === 'smith' ? C.WOOD1 : C.ASH0, apHi = spec.id === 'smith' ? C.WOOD2 : C.ASH1;
    bodyS.poly([[hipX - 6.2, chestY + 2], [hipX + 6.2, chestY + 2], [hipX + 6.8, ay - 6], [hipX - 6.8, ay - 6]], apCol);
    bodyS.poly([[hipX - 4.5, chestY + 3], [hipX + 4.5, chestY + 3], [hipX + 4.8, ay - 6.8], [hipX - 4.8, ay - 6.8]], apHi);
    for (const rx of [-4.5, 4.5]) for (const ry of [hipY - 3, hipY + 2, hipY + 6]) bodyS.set(hipX + rx, ry, C.GOLD3);
  }

  const shW = isBroad ? 7.8 : isChild ? 4.8 : isSlender ? 5.6 : 6.4;
  const wW = isBroad ? 6.4 : isChild ? 4.4 : isSlender ? 4.6 : 5.4;
  bodyS.poly([[chestX - shW, chestY - 0.5], [chestX + shW, chestY - 0.5], [hipX + wW, hipY + 1.0], [hipX - wW, hipY + 1.0]], rb1);
  bodyS.poly([[chestX - shW * 0.78, chestY + 0.3], [chestX + shW * 0.78, chestY + 0.3], [hipX + wW * 0.76, hipY + 0.4], [hipX - wW * 0.76, hipY + 0.4]], rb2);

  if (spec.id === 'ferryman' || spec.id === 'bamboo_hunter') {
    const leafC1 = spec.id === 'ferryman' ? C.WOOD3 : C.LEAF1, leafC2 = spec.id === 'ferryman' ? C.STRAW1 : C.LEAF2;
    for (let row = 0; row < 3; row++) {
      const ry = chestY + 0.5 + row * 3.6, rw = shW + 1.4 + row * 0.8;
      for (let k = -3; k <= 3; k++) {
        bodyS.line(chestX + k * (rw / 3.4), ry, chestX + k * ((rw + 1.6) / 3.2) + sway * 0.5, ry + 3.4, 1.5, (k + row) % 2 ? leafC1 : leafC2);
      }
    }
  } else if (spec.id === 'weaver_woman') {
    bodyS.poly([[chestX, chestY + 0.5], [chestX + 3.2, chestY + 4.5], [chestX, hipY], [chestX - 3.2, chestY + 4.5]], C.RED2);
    bodyS.set(chestX, chestY + 4.2, aura > 0.2 ? C.GOLD5 : C.GOLD3);
  } else if (spec.id === 'automaton_07') {
    bodyS.ring(chestX, chestY + 4.5, 3.8, 3.8, 1.2, C.GOLD2);
    bodyS.ellipse(chestX, chestY + 4.5, 2.5, 2.5, aura > 0.3 ? C.WHITE : C.CYAN2);
    bodyS.set(chestX, chestY + 4.5, C.CYAN3);
    for (const sgn of [-1, 1]) {
      bodyS.rect(chestX + sgn * 7.2 - 1, chestY - 4.5, 2.2, 4.5, C.IRON2);
      bodyS.set(chestX + sgn * 7.2, chestY - 5, C.GOLD3);
    }
  } else if (spec.id === 'elder') {
    bodyS.arc(chestX, chestY + 1.2, shW - 0.4, 4.2, 2.0, 0.1, Math.PI - 0.1, C.GOLD2);
    bodyS.arc(chestX, chestY + 0.6, shW - 1.0, 3.4, 1.1, 0.2, Math.PI - 0.2, C.GOLD3);
  } else if (spec.id === 'bell_keeper') {
    for (let k = 0; k < 3; k++) bodyS.set(chestX, chestY + 1.8 + k * 2.8, C.GOLD3);
  } else {
    bodyS.line(chestX - 3.2 * K, chestY - 0.4, chestX + 0.6, chestY + 5.2 * K, 1.5, rb3);
    bodyS.line(chestX + 3.2 * K, chestY - 0.4, chestX - 0.4, chestY + 4.8 * K, 1.4, sb2);
  }

  bodyS.rect(hipX - wW, hipY - 1.0, wW * 2, 2.0, rb0);
  bodyS.line(hipX - wW + 0.5, hipY - 0.8, hipX + wW - 0.5, hipY - 0.8, 1.0, sb1);
  if (spec.id === 'wandering_merchant') {
    for (let i = -1; i <= 1; i++) bodyS.ellipse(hipX + i * 3.4, hipY + 1.8, 1.7, 2.1, C.GOLD3);
  } else if (spec.id === 'waterfall_hermit') {
    bodyS.ellipse(hipX - 5.2, hipY + 1.2, 2.0, 2.0, C.GOLD2);
    bodyS.ellipse(hipX - 5.4, hipY + 3.8, 2.6, 2.6, C.GOLD3);
  } else if (spec.id === 'bamboo_hunter') {
    bodyS.ellipse(hipX - 5.4, hipY + 2.2, 2.5, 3.0, C.STRAW2);
    bodyS.set(hipX - 6.0, hipY + 1.8, C.RED2);
  }

  const bareArms = spec.id === 'smith' || spec.id === 'ash_forger';
  const wideSleeves = ['temple_keeper', 'bamboo_nun', 'scholar_ghost', 'exiled_pyromancer', 'mirror_maiden', 'bell_keeper', 'dom_avatar'].includes(spec.id);
  const hands = {};
  for (const [sgn, aPose, key] of [[-1, armL, 'L'], [1, armR, 'R']]) {
    const shX = chestX + sgn * (shW - 0.6), shY = chestY + 1.2;
    const hx = shX + aPose.dx, hy = shY + aPose.dy;
    const ex = (shX + hx) * 0.5 + sgn * 1.4, ey = (shY + hy) * 0.5 + 1.3;
    const isMechLeft = spec.id === 'ash_forger' && sgn < 0;
    const armCol0 = isMechLeft ? C.IRON1 : isAuto ? C.GOLD1 : bareArms ? sk1 : rb1;
    const armCol1 = isMechLeft ? C.GOLD2 : isAuto ? C.GOLD2 : bareArms ? sk2 : rb2;
    const rUpper = isBroad ? 2.9 : isChild ? 1.9 : 2.4, rFore = wideSleeves ? 3.2 : rUpper * 0.92;

    bodyS.capsule(shX, shY, ex, ey, rUpper, rUpper * 0.95, armCol0);
    bodyS.capsule(shX, shY - 0.4, ex, ey - 0.4, rUpper * 0.72, rFore * 0.85, armCol1);
    bodyS.capsule(ex, ey, hx, hy, rUpper * 0.9, rFore, armCol1);
    if (isMechLeft) {
      bodyS.line(shX, shY + 2, ex, ey, 1.0, C.GOLD3);
      bodyS.ring(hx, hy, 2.4, 2.2, 1.0, C.GOLD3);
    } else if (wideSleeves) {
      bodyS.line(ex + sgn * 0.6, ey + 1.5, hx + sgn * 0.5, hy + 2.4, 1.2, rb3);
    }
    if (spec.id === 'cursed_woodcutter' && sgn < 0) {
      bodyS.ellipse(shX - 0.8, shY + 0.5, 3.6, 3.2, C.ASH1);
      bodyS.ellipse(shX - 1.2, shY - 0.4, 2.2, 1.8, C.LEAF2);
    }
    bodyS.ellipse(hx, hy, 1.8 * K, 1.6 * K, isMechLeft || isAuto ? C.GOLD3 : sk2);
    hands[key] = { x: hx, y: hy, shX, shY };
  }

  bodyS.rect(headX - 1.8 * K, chestY - 2.6 * K, 3.6 * K, 3.0 * K, sk1);
  const hRx = 6.5 * K, hRy = 6.6 * K;

  if (isAuto) {
    bodyS.ellipse(headX, headY + 0.5, hRx + 0.6, hRy + 0.4, C.GOLD1);
    bodyS.ellipse(headX, headY, hRx, hRy - 0.3, C.ASH2);
    bodyS.arc(headX, headY - 2.2, hRx - 1, 3.2, 1.5, Math.PI * 1.1, Math.PI * 1.9, C.GOLD3);
    bodyS.rect(headX - 4.8, headY - 1.2, 9.6, 4.2, C.BG0);
    bodyS.ring(headX, headY + 0.8, 4.6, 2.4, 1.0, C.GOLD2);
    const scanX = headX + Math.sin(phase * 3) * 2.2;
    bodyS.ellipse(scanX, headY + 0.8, blink ? 3.2 : 2.2, blink ? 0.6 : 1.6, C.CYAN2);
    if (!blink) bodyS.set(scanX, headY + 0.6, C.WHITE);
  } else {
    bodyS.ellipse(headX, headY + 0.8, hRx, hRy, sk1);
    bodyS.ellipse(headX, headY + 0.3, hRx - 0.6, hRy - 0.6, sk2);
    bodyS.ellipse(headX - 0.8, headY - 0.8, hRx * 0.55, hRy * 0.48, sk3);
    if (spec.id === 'dom_avatar') {
      for (const sgn of [-1, 1]) {
        const earTilt = Math.sin(phase * 2 + sgn) * 0.8;
        bodyS.poly([[headX + sgn * 2.2, headY - 4.8], [headX + sgn * 6.2, headY - 3.2], [headX + sgn * (5.6 + earTilt), headY - 11.2]], C.FOX2);
        bodyS.poly([[headX + sgn * 3.2, headY - 4.8], [headX + sgn * 5.2, headY - 3.8], [headX + sgn * (5.1 + earTilt), headY - 9.2]], C.CREAM);
      }
    } else {
      for (const sgn of [-1, 1]) bodyS.ellipse(headX + sgn * (hRx - 0.2), headY + 1.2, 1.2, 1.8, sk1);
    }

    const eyeY = headY + 1.2 * K, eyeSpan = 2.7 * K;
    if (spec.id === 'blind_bard') {
      bodyS.rect(headX - hRx, eyeY - 1.3, hRx * 2, 2.7, C.SILV1);
      bodyS.rect(headX - hRx + 0.8, eyeY - 0.9, hRx * 2 - 1.6, 1.8, C.CREAM);
    } else {
      for (const sgn of [-1, 1]) {
        const ex = headX + sgn * eyeSpan;
        if (blink) bodyS.line(ex - 1.4, eyeY + 0.3, ex + 1.4, eyeY + 0.3, 1.0, C.OUT);
        else {
          bodyS.ellipse(ex, eyeY, 1.5, 1.6, C.WHITE);
          bodyS.ellipse(ex, eyeY + 0.2, 1.1, 1.2, spec.eye);
          bodyS.set(ex, eyeY + 0.1, C.OUT);
          bodyS.set(ex - 0.4, eyeY - 0.5, C.WHITE);
        }
        bodyS.line(ex - 1.5, eyeY - 1.9, ex + 1.5, eyeY - 1.7, 1.0, hr0);
      }
    }

    if (isChild || ['weaver_woman', 'firefly_girl', 'mirror_maiden', 'dom_avatar'].includes(spec.id)) {
      bodyS.set(headX - eyeSpan - 1.0, eyeY + 2.0, C.PINK2);
      bodyS.set(headX + eyeSpan + 1.0, eyeY + 2.0, C.PINK2);
    }

    if (spec.id === 'ash_gravedigger') {
      bodyS.poly([[headX - hRx + 0.5, eyeY + 1.8], [headX + hRx - 0.5, eyeY + 1.8], [headX + 4.2, headY + hRy + 1.5], [headX - 4.2, headY + hRy + 1.5]], C.ASH1);
      bodyS.line(headX - hRx + 1, eyeY + 2.0, headX + hRx - 1, eyeY + 2.0, 1, C.ASH2);
    } else if (talk) {
      bodyS.ellipse(headX, eyeY + 3.4 * K, 1.4, 1.2, C.RED1);
      bodyS.set(headX, eyeY + 3.0 * K, C.PINK2);
    } else if (smile) {
      bodyS.arc(headX, eyeY + 2.6 * K, 1.8, 1.2, 1.0, 0.2, Math.PI - 0.2, sk0);
    } else {
      bodyS.line(headX - 1.2, eyeY + 3.3 * K, headX + 1.2, eyeY + 3.3 * K, 1.0, sk0);
    }

    if (spec.id === 'elder') {
      bodyS.ring(headX - eyeSpan, eyeY + 0.2, 2.2, 2.0, 0.9, C.GOLD3);
      bodyS.ring(headX + eyeSpan, eyeY + 0.2, 2.2, 2.0, 0.9, C.GOLD3);
      bodyS.set(headX, eyeY, C.GOLD3);
    } else if (spec.id === 'smith') {
      bodyS.ring(headX + eyeSpan, eyeY, 2.4, 2.3, 1.0, C.GOLD3);
      bodyS.set(headX + eyeSpan, eyeY, C.CYAN2);
    } else if (spec.id === 'bronze_pilot') {
      for (const sgn of [-1, 1]) {
        bodyS.ring(headX + sgn * eyeSpan, eyeY, 2.3, 2.1, 1.0, C.GOLD2);
        bodyS.set(headX + sgn * eyeSpan, eyeY, C.CYAN2);
      }
    }

    if (spec.id === 'bamboo_nun' || spec.id === 'dom_avatar') bodyS.set(headX, eyeY - 2.6, C.RED2);
    if (spec.id === 'bamboo_hunter') bodyS.line(headX - 3.8, eyeY + 1.4, headX - 1.5, eyeY + 2.4, 1.0, C.RED1);

    if (spec.id === 'smith') {
      bodyS.poly([[headX - 4.8, eyeY + 2.4], [headX + 4.8, eyeY + 2.4], [headX + 3.6, headY + 7.6], [headX - 3.6, headY + 7.6]], C.WOOD1);
      bodyS.line(headX - 3.2, eyeY + 2.6, headX + 3.2, eyeY + 2.6, 1.1, C.WOOD2);
    } else if (['temple_keeper', 'blind_bard', 'ash_forger', 'waterfall_hermit', 'ferryman'].includes(spec.id)) {
      const bLen = spec.id === 'ferryman' ? 4.8 : 8.5;
      bodyS.poly([[headX - 3.2, eyeY + 2.8], [headX + 3.2, eyeY + 2.8], [headX + 1.6 + sway * 0.6, eyeY + 2.8 + bLen], [headX - 1.2 + sway * 0.6, eyeY + 2.8 + bLen]], C.SILV1);
      bodyS.line(headX, eyeY + 3.0, headX + sway * 0.5, eyeY + 2.2 + bLen, 1.3, C.CREAM);
    }

    drawHeadgear(bodyS, spec, headX, headY, hRx, hRy, K, sway, phase, aura);
  }

  return { hipX, hipY, chestX, chestY, headX, headY, hands, K };
}

function drawHeadgear(s, spec, hx, hy, rx, ry, K, sway, phase, aura) {
  const [hr0, hr1] = spec.hair;
  switch (spec.id) {
    case 'elder':
    case 'waterfall_hermit':
      s.arc(hx, hy - 1.2, rx + 0.4, ry * 0.72, 2.6, Math.PI * 0.95, Math.PI * 2.05, C.SILV1);
      s.ellipse(hx, hy - ry - 1.6, 3.2, 2.8, C.SILV2);
      s.line(hx - 5.2, hy - ry - 1.2, hx + 5.6, hy - ry - 2.2, 1.2, spec.id === 'elder' ? C.LEAF3 : C.WOOD2);
      s.set(hx + 5.8, hy - ry - 2.3, spec.id === 'elder' ? C.LIME1 : C.GOLD3);
      break;
    case 'smith':
      s.arc(hx, hy - 1.5, rx + 0.3, ry * 0.65, 2.4, Math.PI, TAU, hr1);
      s.rect(hx - rx - 0.4, hy - 4.2, rx * 2 + 0.8, 2.2, C.RED2);
      s.line(hx - rx, hy - 3.8, hx + rx, hy - 3.8, 1, C.EMBER2);
      s.curve([[hx + rx, hy - 3.5], [hx + rx + 3.5, hy - 3.0 + sway], [hx + rx + 6.2, hy - 0.5 - sway]], 1.4, 0.8, C.RED2);
      break;
    case 'temple_keeper':
      s.line(hx - 10.5, hy - 4.6, hx + 10.5, hy - 4.6, 1.6, C.IND0);
      s.ellipse(hx - 9.8, hy - 4.6, 2.0, 1.1, C.IND2);
      s.ellipse(hx + 9.8, hy - 4.6, 2.0, 1.1, C.IND2);
      s.poly([[hx - 5.5, hy - 3.2], [hx + 5.5, hy - 3.2], [hx + 4.8, hy - 9.2], [hx - 4.8, hy - 9.2]], C.IND0);
      s.poly([[hx - 4.4, hy - 3.6], [hx + 4.4, hy - 3.6], [hx + 3.8, hy - 8.2], [hx - 3.8, hy - 8.2]], C.IND1);
      s.line(hx - 5.2, hy - 3.4, hx + 5.2, hy - 3.4, 1.1, C.GOLD3);
      s.set(hx, hy - 6.0, C.GOLD4);
      break;
    case 'weaver_woman':
      s.poly([[hx, hy - 7.8], [hx + rx + 1.0, hy - 1.5], [hx + rx - 0.5, hy - 5.8], [hx, hy - 6.6], [hx - rx + 0.5, hy - 5.8], [hx - rx - 1.0, hy - 1.5]], C.PURP0);
      s.poly([[hx, hy - 7.4], [hx + 4.8, hy - 3.6], [hx, hy - 2.4], [hx - 4.8, hy - 3.6]], C.PURP1);
      s.set(hx, hy - 2.5, C.PINK3);
      s.ellipse(hx + 5.2, hy - 4.5, 1.6, 1.6, C.PINK2);
      s.set(hx + 5.2, hy - 4.5, C.GOLD4);
      break;
    case 'lantern_boy':
      s.arc(hx, hy - 1.2, rx, 3.2, 2.0, Math.PI * 1.05, Math.PI * 1.95, hr0);
      for (const [ox, oy] of [[-4.2, -5.2], [0, -6.8], [4.2, -5.2]]) {
        s.ellipse(hx + ox, hy + oy, 1.9, 2.1, hr1);
        s.set(hx + ox, hy + oy + 1.6, C.RED2);
      }
      break;
    case 'blind_bard':
    case 'lotus_crone':
    case 'ferryman':
      drawNonLa(s, hx, hy - 2.6, sway * 0.4, spec.id === 'ferryman' ? 12.2 : 11.2, 6.2, spec.id === 'lotus_crone');
      break;
    case 'wandering_merchant':
      s.ellipse(hx, hy - 4.6, rx + 1.2, 3.2, C.PURP1);
      s.line(hx - rx - 0.5, hy - 3.4, hx + rx + 0.5, hy - 3.4, 1.2, C.GOLD2);
      s.curve([[hx + 2.5, hy - 6.2], [hx + 7.2, hy - 9.5 + sway], [hx + 10.5, hy - 7.8 - sway]], 1.3, 0.6, C.GOLD3);
      break;
    case 'bamboo_hunter':
      s.arc(hx, hy - 1.8, rx + 0.4, 4.0, 2.5, Math.PI * 0.95, TAU + 0.15, C.SILV1);
      s.curve([[hx + 2, hy - 6.2], [hx + 6.5, hy - 7.2], [hx + 8.5 + sway, hy - 2.5]], 2.2, 1.0, C.SILV2);
      s.set(hx + 2.5, hy - 6.0, C.RED2);
      break;
    case 'bamboo_nun':
      s.ellipse(hx, hy - 4.2, rx + 0.8, 4.0, C.WOOD1);
      s.arc(hx, hy - 3.4, rx + 0.4, 2.8, 1.4, Math.PI, TAU, C.WOOD2);
      s.line(hx - rx, hy - 2.4, hx + rx, hy - 2.4, 1.1, C.STRAW1);
      break;
    case 'cursed_woodcutter':
      s.arc(hx, hy - 2.0, rx + 0.6, 4.2, 2.8, Math.PI * 0.9, TAU + 0.2, C.HAIR1);
      s.line(hx - 3.5, hy - 5.5, hx - 1.0, hy - 2.8, 1.6, C.ASH2);
      break;
    case 'scholar_ghost':
      s.poly([[hx - 5.2, hy - 3.0], [hx + 5.2, hy - 3.0], [hx + 4.8, hy - 9.0], [hx - 4.8, hy - 9.0]], C.IND0);
      s.line(hx - 5.4, hy - 3.2, hx + 5.4, hy - 3.2, 1.1, C.CYAN2);
      s.set(hx, hy - 6.0, C.CYAN3);
      break;
    case 'firefly_girl':
      s.arc(hx, hy - 2.0, rx + 0.4, 4.2, 2.6, Math.PI * 0.92, TAU + 0.18, hr0);
      for (const sgn of [-1, 1]) {
        s.ellipse(hx + sgn * 6.8, hy - 1.5, 2.2, 2.4, C.PINK1);
        s.set(hx + sgn * 6.8, hy - 2.0, C.PINK3);
      }
      break;
    case 'ash_forger':
      s.ellipse(hx - rx + 0.2, hy - 1.2, 2.0, 2.6, C.SILV1);
      s.ellipse(hx + rx - 0.2, hy - 1.2, 2.0, 2.6, C.SILV1);
      s.set(hx - 1.5, hy - 4.8, C.SKIN3);
      break;
    case 'ash_gravedigger':
      s.line(hx - 9.8, hy - 3.4, hx + 9.8, hy - 3.4, 1.8, C.ASH0);
      s.poly([[hx - 5.8, hy - 3.4], [hx + 5.8, hy - 3.4], [hx + 4.2, hy - 8.4], [hx - 4.2, hy - 8.4]], C.ASH1);
      s.line(hx - 5.2, hy - 4.0, hx + 5.2, hy - 4.0, 1.1, C.SOUL1);
      break;
    case 'exiled_pyromancer':
      s.arc(hx, hy - 2.0, rx + 0.5, 4.2, 2.6, Math.PI * 0.92, TAU + 0.18, C.RED1);
      for (const sgn of [-1, 1]) {
        s.curve([[hx + sgn * 3.2, hy - 5.0], [hx + sgn * 6.8, hy - 9.2], [hx + sgn * 5.6, hy - 12.2]], 1.8, 0.7, aura > 0.3 ? C.EMBER2 : C.GOLD2);
      }
      s.ellipse(hx, hy - 5.2, 1.6, 2.0, C.EMBER3);
      break;
    case 'windmill_keeper':
      s.ellipse(hx, hy - 4.2, rx + 0.8, 3.6, C.WOOD1);
      s.ring(hx - 2.6, hy - 4.2, 2.1, 1.8, 0.9, C.GOLD3);
      s.ring(hx + 2.6, hy - 4.2, 2.1, 1.8, 0.9, C.GOLD3);
      s.set(hx - 2.6, hy - 4.2, C.CYAN2);
      s.set(hx + 2.6, hy - 4.2, C.CYAN2);
      break;
    case 'mirror_maiden':
      s.arc(hx, hy - 2.2, rx + 0.6, 4.4, 2.8, Math.PI * 0.9, TAU + 0.2, hr0);
      s.ellipse(hx, hy - 6.8, 4.2, 2.4, hr1);
      s.ellipse(hx + 4.8, hy - 5.4, 2.0, 1.8, C.PURP3);
      s.set(hx + 4.8, hy - 5.4, C.GOLD4);
      s.line(hx - rx - 0.3, hy + 2.5, hx - rx - 0.3 + sway * 0.5, hy + 5.2, 1.0, C.SILVER);
      s.set(hx - rx - 0.3 + sway * 0.5, hy + 5.5, C.WHITE);
      break;
    case 'bell_keeper':
      for (let tier = 0; tier < 3; tier++) {
        s.ellipse(hx, hy - 3.6 - tier * 1.5, rx + 1.0 - tier * 0.7, 1.8, tier % 2 ? C.TEAL2 : C.TEAL1);
      }
      s.set(hx, hy - 4.5, C.GOLD3);
      break;
    case 'sun_child':
      s.arc(hx, hy - 1.5, rx, 3.6, 2.2, Math.PI * 0.95, TAU + 0.1, hr0);
      for (const sgn of [-1, 1]) {
        s.ellipse(hx + sgn * 5.4, hy - 5.4, 2.4, 2.4, hr1);
        s.ring(hx + sgn * 5.4, hy - 5.0, 2.5, 1.2, 0.9, C.RED2);
      }
      break;
    case 'bronze_pilot':
      s.ellipse(hx, hy - 4.8, rx + 1.2, 3.4, C.GOLD1);
      s.line(hx - rx - 1, hy - 3.2, hx + rx + 1, hy - 3.2, 1.3, C.GOLD3);
      s.set(hx, hy - 5.6, C.GOLD5);
      break;
    case 'dom_avatar':
      s.arc(hx, hy - 2.0, rx + 0.4, 4.0, 2.5, Math.PI * 0.95, TAU + 0.1, hr0);
      s.set(hx, hy - 5.2, C.GOLD4);
      break;
    default:
      s.arc(hx, hy - 1.8, rx, 3.8, 2.4, Math.PI, TAU, hr1);
  }
}

module.exports = {
  TAU, clamp, PAL_HEX, C, PixelSurface, savePng, scaleBlit,
  drawLantern, drawNonLa, drawLotusFlower, drawSparkStar, drawBookOpen,
  NPC_SPECS, drawNpcBaseBody, drawHeadgear,
};
