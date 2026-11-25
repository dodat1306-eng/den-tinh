'use strict';
const path = require('node:path');
const {
  C, PixelSurface, savePng,
  drawLotusEmblem, drawPrismOrb, drawHoloKeyboard, drawCodeWindow,
  drawHoaViRig, buildHoaViPortrait128, buildHoaViKeyArt,
} = require('./hoavi-art-core.cjs');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const ARTIFACT_DIR = process.env.HOAVI_SHOWCASE_DIR || '';
const VIEWS = ['S', 'E', 'N', 'W'];
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

function forwardVec(view) {
  if (view === 'E') return { fx: 1, fy: 0 };
  if (view === 'W') return { fx: -1, fy: 0 };
  if (view === 'N') return { fx: 0, fy: -1 };
  return { fx: 0, fy: 1 };
}

// Helper: draw directional slash crescent in pixel space
function drawCyberCrescent(s, cx, cy, angle, radius, span, thick, colOuter, colInner) {
  const steps = 42;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const a = angle - span * 0.5 + span * u;
    const taper = Math.sin(u * Math.PI);
    const w = Math.max(1, thick * taper);
    const px = cx + Math.cos(a) * radius;
    const py = cy + Math.sin(a) * radius * 0.78;
    s.ellipse(px, py, w, w * 0.85, colOuter);
    if (w > 1.6) s.ellipse(px, py, w * 0.52, w * 0.45, colInner);
  }
}

// Helper: draw hexagonal honeycomb barrier
function drawHexBarrier(s, cx, cy, rx, ry, phase, highlight = C.CYAN3) {
  // Outer hex ring
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6 + phase * 0.15;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  for (let i = 0; i < 6; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % 6];
    s.line(p0[0], p0[1], p1[0], p1[1], 1.4, i % 2 === 0 ? highlight : C.CYAN2);
  }
  // Inner honeycomb lattice
  for (let gy = -1; gy <= 1; gy++) {
    for (let gx = -1; gx <= 1; gx++) {
      if (Math.abs(gx) + Math.abs(gy) > 2) continue;
      const hx = cx + gx * (rx * 0.42) + (gy % 2) * 3;
      const hy = cy + gy * (ry * 0.42);
      s.ring(hx, hy, 4.2, 3.8, 1.0, ((gx + gy + Math.floor(phase * 4)) % 2 === 0) ? C.CYAN3 : C.PINK);
    }
  }
}

// Helper: draw Thiên Cơ Cyber-Lotus Eye Satellite
function drawSatelliteEye(s, cx, cy, aimAngle = 0, scale = 1, pulse = 0, firing = false) {
  const r = 7.5 * scale;
  // 4 outer golden-violet lotus fins
  for (let i = 0; i < 4; i++) {
    const a = aimAngle + (i * Math.PI) / 2 + Math.PI / 4;
    const tipX = cx + Math.cos(a) * (r + 3.2 * scale);
    const tipY = cy + Math.sin(a) * (r + 3.2 * scale);
    const nx = -Math.sin(a) * 2.5 * scale, ny = Math.cos(a) * 2.5 * scale;
    s.poly([
      [cx + Math.cos(a) * 2.5 * scale + nx, cy + Math.sin(a) * 2.5 * scale + ny],
      [tipX, tipY],
      [cx + Math.cos(a) * 2.5 * scale - nx, cy + Math.sin(a) * 2.5 * scale - ny],
    ], i % 2 === 0 ? C.GOLD2 : C.ROBE2);
  }
  // Forward aiming golden chevron prongs
  const fx = Math.cos(aimAngle), fy = Math.sin(aimAngle);
  s.poly([
    [cx + fx * (r + 4.5 * scale), cy + fy * (r + 4.5 * scale)],
    [cx + fx * r - fy * 3 * scale, cy + fy * r + fx * 3 * scale],
    [cx + fx * r + fy * 3 * scale, cy + fy * r - fx * 3 * scale],
  ], C.GOLD2);
  // Core casing + glowing cyan eye iris
  s.ellipse(cx, cy, r * 0.78, r * 0.78, C.INK1);
  s.ring(cx, cy, r * 0.82, r * 0.82, 1.1, C.GOLD1);
  const ix = cx + fx * 1.4 * scale, iy = cy + fy * 1.4 * scale;
  s.ellipse(ix, iy, r * 0.48 + pulse, r * 0.48 + pulse, firing ? C.WHITE : C.CYAN2);
  s.ellipse(ix, iy, r * 0.28, r * 0.28, firing ? C.CYAN3 : C.WHITE);
  if (firing) {
    s.ring(cx, cy, r + 2.5 * scale, r + 2.5 * scale, 1.0, C.CYAN3);
  }
}

// ============================================================================
// 1. LOCOMOTION ATLAS (`assets/hoavi-locomotion.png` — 240f: 4 views × (30 idle + 30 run))
// ============================================================================
function buildLocomotionAtlas() {
  const CW = 104, CH = 96, AX = 52, AY = 80, COLS = 20, ROWS = 12;
  const atlas = new Uint8Array(CW * COLS * CH * ROWS);
  const cell = new PixelSurface(CW, CH);

  // 0..119: IDLE (4 views × 30 frames @ 30 FPS)
  for (let vIdx = 0; vIdx < 4; vIdx++) {
    const view = VIEWS[vIdx];
    for (let f = 0; f < 30; f++) {
      cell.clear();
      const u = f / 30;
      const a = u * TAU;
      const bob = Math.sin(a) * 1.5;
      const sway = Math.sin(a - 0.6) * 1.2;
      const blink = f >= 21 && f <= 23;
      const glint = f >= 6 && f <= 11 ? Math.sin(((f - 6) / 5) * Math.PI) : 0;

      drawHoaViRig(cell, AX, AY, {
        view,
        bob,
        coatSway: sway,
        coatFlare: 0.8 + Math.sin(a) * 0.6,
        armLPose: { dx: view === 'E' ? 5.5 : view === 'W' ? -6.5 : -6.2, dy: 7.5 + Math.sin(a + 0.5) * 0.9 },
        armRPose: { dx: view === 'E' ? 6.5 : view === 'W' ? -5.5 : 6.2, dy: 7.2 + Math.cos(a + 0.5) * 0.9 },
        blink,
        glassesGlint: glint,
        keyboard: true,
        keyboardY: Math.sin(a - 0.4) * 1.2,
        keyboardKey: Math.floor(f / 2),
        prisms: true,
        prismPhase: a,
        prismRadius: 21,
      });

      // Subtle floating cyber-data motes around hem
      for (let m = 0; m < 3; m++) {
        const ma = a + (m * TAU) / 3;
        const mx = AX + Math.cos(ma) * 18;
        const my = AY - 18 + Math.sin(ma * 2) * 8;
        cell.set(mx, my, m % 2 === 0 ? C.CYAN3 : C.PINK);
      }

      const idx = vIdx * 30 + f;
      cell.blitTo(atlas, CW * COLS, (idx % COLS) * CW, Math.floor(idx / COLS) * CH);
    }
  }

  // 120..239: RUN (4 views × 30 frames @ 36 FPS — 2 crisp strides of 15f)
  for (let vIdx = 0; vIdx < 4; vIdx++) {
    const view = VIEWS[vIdx];
    const { fx, fy } = forwardVec(view);
    for (let f = 0; f < 30; f++) {
      cell.clear();
      const u = f / 30;
      const a = u * TAU * 2; // 2 full strides over 30 frames = 15f/stride!
      const stride = Math.sin(a);
      const bounce = -Math.abs(Math.cos(a)) * 2.8;
      const sway = Math.sin(a - 0.5) * 2.2 - fx * 2.0;

      // Trailing cyber-petal wake behind boots
      for (let k = 0; k < 4; k++) {
        const age = ((u * 2 + k * 0.25) % 1);
        const wx = AX - fx * (8 + age * 18) + (fx === 0 ? (k % 2 ? 6 : -6) : 0);
        const wy = AY - 6 - fy * (age * 10) - age * 8;
        cell.rect(wx, wy, 2, 2, k % 2 === 0 ? C.CYAN2 : C.PINK);
      }

      drawHoaViRig(cell, AX, AY, {
        view,
        bob: bounce,
        leanX: fx * 2.6,
        leanY: fy * 1.2 + 0.8,
        stride,
        coatFlare: 3.2 + Math.abs(stride) * 1.8,
        coatSway: sway,
        blink: f === 14,
        keyboard: false,
        prisms: true,
        prismPhase: u * TAU * 2 + 0.4,
        prismRadius: 20,
      });

      const idx = 120 + vIdx * 30 + f;
      cell.blitTo(atlas, CW * COLS, (idx % COLS) * CW, Math.floor(idx / COLS) * CH);
    }
  }

  savePng(path.join(ASSETS, 'hoavi-locomotion.png'), CW * COLS, CH * ROWS, atlas);
  return { atlas, CW, CH, COLS, ROWS };
}

// ============================================================================
// 2. ACTIONS & INTERACTIONS ATLAS (`assets/hoavi-actions.png` — 900f = 5 × 180f)
// ============================================================================
function buildActionsAtlas() {
  const CW = 112, CH = 100, AX = 56, AY = 82, COLS = 30, ROWS = 30;
  const atlas = new Uint8Array(CW * COLS * CH * ROWS);
  const cell = new PixelSurface(CW, CH);

  // BLOCK 0 (0..179): DASH — Quantum Glitch-Step (4 views × 45 frames @ 45 FPS = 180f)
  for (let vIdx = 0; vIdx < 4; vIdx++) {
    const view = VIEWS[vIdx];
    const { fx, fy } = forwardVec(view);
    for (let f = 0; f < 45; f++) {
      cell.clear();
      const u = f / 44;
      const crouch = f < 7 ? smooth(f / 6) : 0;
      const burst = f >= 7 && f < 32 ? Math.sin(((f - 7) / 25) * Math.PI) : 0;
      const settle = f >= 32 ? 1 - smooth((f - 32) / 12) : 0;

      // Ground launch / landing cyber ring
      if (f >= 4 && f <= 20) {
        const rr = 8 + (f - 4) * 1.6;
        cell.ring(AX - fx * 10, AY - 2, rr, rr * 0.42, 1.2, C.CYAN3);
      }
      // Trailing quantum hologram ribbons & lotus motes
      if (burst > 0.05) {
        for (let r = 0; r < 6; r++) {
          const dist = 10 + r * 4.6 * burst;
          const rx = AX - fx * dist + (fx === 0 ? Math.sin(r * 2.1 + u * 12) * 8 : 0);
          const ry = AY - 25 + (r - 2.5) * 4.2 - fy * dist * 0.45;
          cell.rect(rx - 4, ry, 8, 1.5, r % 2 === 0 ? C.CYAN3 : C.PINK);
        }
      }

      drawHoaViRig(cell, AX + fx * burst * 5, AY, {
        view,
        bob: crouch * 2.5 - burst * 6.5 - settle * 1.0,
        leanX: fx * (burst * 5.0 - crouch * 1.5),
        leanY: crouch * 2.0 - burst * 1.5,
        stride: burst * 0.95,
        leftFootLift: burst * 4.5,
        rightFootLift: burst * 3.0,
        coatFlare: 4.5 * burst + 1.5 * settle,
        coatSway: -fx * burst * 5.5,
        armLPose: { dx: -7 - fx * 3, dy: 4 - burst * 3 },
        armRPose: { dx: 7 + fx * 4, dy: 4 - burst * 3 },
        glassesGlint: f >= 33 && f <= 41 ? 0.85 : 0,
        prisms: true,
        prismPhase: u * TAU * 2,
        prismRadius: 22 + burst * 4,
      });

      // Scanline phase shimmer at peak velocity
      if (f >= 10 && f <= 24) {
        for (let y = 16; y < CH - 12; y += 5) {
          for (let x = 14; x < CW - 14; x++) {
            if (cell.get(x, y) && (x + y + f) % 7 === 0) cell.set(x + (y % 2 ? 2 : -2), y, C.CYAN3);
          }
        }
      }

      const idx = vIdx * 45 + f;
      cell.blitTo(atlas, CW * COLS, (idx % COLS) * CW, Math.floor(idx / COLS) * CH);
    }
  }

  // BLOCK 1 (180..359): HIT & FIREWALL GUARD (4 views × 45 frames @ 36 FPS = 180f)
  for (let vIdx = 0; vIdx < 4; vIdx++) {
    const view = VIEWS[vIdx];
    const { fx, fy } = forwardVec(view);
    for (let f = 0; f < 45; f++) {
      cell.clear();
      const jolt = f < 10 ? Math.sin((f / 10) * Math.PI) : 0;
      const shield = f >= 8 && f < 34 ? Math.sin(((f - 8) / 26) * Math.PI) : 0;

      drawHoaViRig(cell, AX - fx * jolt * 4, AY, {
        view,
        bob: jolt * 2.0,
        leanX: -fx * jolt * 3.5,
        leanY: jolt * 1.5,
        coatFlare: 2.5 * jolt + 1.8 * shield,
        coatSway: -fx * jolt * 3,
        armLPose: { dx: fx * 4 - 4, dy: 3 },
        armRPose: { dx: fx * 5 + 4, dy: 3 },
        blink: f >= 1 && f <= 6,
        glassesGlint: f >= 32 ? 0.7 : 0,
        prisms: true,
        prismPhase: (f / 45) * TAU * 2,
      });

      // Hexagonal Cyber-Firewall Barrier & Impact Sparks
      if (jolt > 0.2) {
        for (let k = 0; k < 6; k++) {
          const a = (k * TAU) / 6 + f * 0.3;
          cell.line(
            AX + fx * 9 + Math.cos(a) * 5, AY - 26 + Math.sin(a) * 5,
            AX + fx * 9 + Math.cos(a) * 12, AY - 26 + Math.sin(a) * 12,
            1.2, k % 2 === 0 ? C.RED : C.CYAN3
          );
        }
      }
      if (shield > 0.1) {
        drawHexBarrier(cell, AX + fx * 10, AY - 26 + fy * 3, 12 * shield + 5, 15 * shield + 5, f * 0.2, C.CYAN3);
      }

      const idx = 180 + vIdx * 45 + f;
      cell.blitTo(atlas, CW * COLS, (idx % COLS) * CW, Math.floor(idx / COLS) * CH);
    }
  }

  // BLOCK 2 (360..539): INTERACT_SHRINE — Thức Tỉnh Ấn Linh & Đèn Tinh (180 frames @ 36 FPS)
  for (let f = 0; f < 180; f++) {
    cell.clear();
    const u = f / 179;
    const gather = f < 40 ? smooth(f / 39) : f > 150 ? 1 - smooth((f - 150) / 29) : 1;
    const lanternU = clamp((f - 35) / 95, 0, 1);
    const bloom = f >= 110 && f <= 155 ? Math.sin(((f - 110) / 45) * Math.PI) : 0;
    const bow = f >= 118 && f <= 158 ? Math.sin(((f - 118) / 40) * Math.PI) : 0;

    // Ground Sacred Lotus Seal
    if (gather > 0.05) {
      const gr = 12 + gather * 20;
      cell.ring(AX, AY - 1, gr, gr * 0.38, 1.2, C.GOLD2);
      cell.ring(AX, AY - 1, gr * 0.72, gr * 0.27, 1.0, C.CYAN3);
    }

    drawHoaViRig(cell, AX, AY, {
      view: 'S',
      bob: -gather * 2.5 + bow * 2.5,
      leanY: bow * 2.2,
      headTilt: bow * 2.0 - lanternU * 1.0,
      coatFlare: gather * 2.8 + bloom * 2.5,
      coatSway: Math.sin(u * TAU * 3) * 1.4,
      armLPose: { dx: -5 + bow * 2.5, dy: 5 - gather * 5 + bow * 3 },
      armRPose: { dx: 5 - bow * 2.5, dy: 5 - gather * 5 + bow * 3 },
      blink: (f >= 122 && f <= 145) || f === 30,
      smileOpen: bloom > 0.4,
      glassesGlint: bloom,
      keyboard: gather > 0.3 && bow < 0.3,
      keyboardY: -2,
      keyboardKey: f,
      prisms: true,
      prismPhase: u * TAU * 4,
      prismRadius: 22 + bloom * 5,
      backHalo: gather * 0.75 + bloom * 0.35,
    });

    // Ascending Golden-Cyan Spirit Lantern (`Đèn Tinh`) + Sacred Rune Spiral
    if (f >= 30 && f <= 165) {
      const ly = AY - 36 - smooth(lanternU) * 20;
      const lx = AX + Math.sin(u * TAU * 2) * 2;
      // Spiral particles rising from keyboard to lantern
      for (let p = 0; p < 8; p++) {
        const pu = ((u * 4 + p / 8) % 1);
        const pa = pu * TAU * 2 + p;
        const px = AX + Math.cos(pa) * (18 * (1 - pu * 0.65));
        const py = AY - 12 - pu * (AY - 12 - ly);
        cell.rect(px, py, 2, 2, p % 2 === 0 ? C.GOLD2 : C.CYAN3);
      }
      // Golden Spirit Lantern
      cell.poly([[lx, ly - 7], [lx + 5, ly - 2], [lx + 3.5, ly + 5], [lx - 3.5, ly + 5], [lx - 5, ly - 2]], C.GOLD1);
      cell.poly([[lx, ly - 5], [lx + 3, ly - 1], [lx + 2, ly + 3.5], [lx - 2, ly + 3.5], [lx - 3, ly - 1]], C.GOLD2);
      cell.ellipse(lx, ly, 2.0, 2.5, C.WHITE);
      cell.line(lx - 6, ly - 2.5, lx + 6, ly - 2.5, 1.2, C.OUT);
      cell.line(lx - 4.5, ly + 5, lx + 4.5, ly + 5, 1.2, C.OUT);
      if (bloom > 0.1) {
        cell.ring(lx, ly, 9 + bloom * 14, 9 + bloom * 14, 1.2, C.GOLD2);
        drawLotusEmblem(cell, lx, ly, 7 + bloom * 6, C.GOLD2, C.CYAN3, C.WHITE, u * TAU);
      }
    }

    const idx = 360 + f;
    cell.blitTo(atlas, CW * COLS, (idx % COLS) * CW, Math.floor(idx / COLS) * CH);
  }

  // BLOCK 3 (540..719): INTERACT_RELIC — Giải Mã Cổ Vật & Mở Rương (180 frames @ 36 FPS)
  for (let f = 0; f < 180; f++) {
    cell.clear();
    const u = f / 179;
    const scan = f < 120 ? smooth(Math.min(1, f / 25)) : 1 - smooth((f - 120) / 25);
    const unlock = f >= 115 && f <= 160 ? Math.sin(((f - 115) / 45) * Math.PI) : 0;

    drawHoaViRig(cell, AX - 4, AY, {
      view: 'E',
      bob: Math.sin(u * TAU * 3) * 1.2 - unlock * 2.5,
      coatFlare: 1.5 + unlock * 3.0,
      coatSway: Math.sin(u * TAU * 3 - 0.5) * 1.5,
      armLPose: { dx: 8, dy: 4 - scan * 3 },
      armRPose: { dx: 11, dy: 6 + Math.sin(f * 0.6) * 1.8 - unlock * 4 },
      smileOpen: f >= 120 && f <= 165,
      glassesGlint: unlock,
      keyboard: scan > 0.3,
      keyboardY: -1,
      keyboardKey: f * 2,
      prisms: true,
      prismPhase: u * TAU * 4,
      prismRadius: 20,
    });

    // Levitating Encrypted Relic Cube + Dual Scanning Holo Windows
    const rx = AX + 22, ry = AY - 24 - smooth(clamp(f / 120, 0, 1)) * 7 + Math.sin(f * 0.15) * 1.8;
    if (scan > 0.15) {
      drawCodeWindow(cell, AX + 7, AY - 44, 18, 14, Math.floor(f / 3), f < 85);
      // Laser scanner rays from HoaVi's hand/window to Relic
      cell.line(AX + 8, AY - 22, rx, ry - 4, 1.0, C.CYAN3);
      cell.line(AX + 8, AY - 22, rx, ry + 4, 1.0, f < 85 ? C.RED : C.GOLD2);
      cell.ring(rx, ry, 8, 8, 1.0, f < 85 ? C.RED : C.CYAN3);
    }
    if (f < 165) {
      const colMain = f < 85 ? C.ROBE2 : C.GOLD2;
      const colCore = f < 85 ? C.RED : C.CYAN3;
      cell.poly([[rx, ry - 6], [rx + 6, ry], [rx, ry + 6], [rx - 6, ry]], colMain);
      cell.poly([[rx, ry - 3], [rx + 3, ry], [rx, ry + 3], [rx - 3, ry]], colCore);
      cell.set(rx - 1, ry - 1, C.WHITE);
    }
    if (unlock > 0.1) {
      cell.ring(rx, ry, 8 + unlock * 16, 8 + unlock * 16, 1.3, C.GOLD2);
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8 + u * 4;
        cell.line(rx + Math.cos(a) * 5, ry + Math.sin(a) * 5, rx + Math.cos(a) * (10 + unlock * 12), ry + Math.sin(a) * (10 + unlock * 12), 1.2, i % 2 ? C.CYAN3 : C.PINK);
      }
    }

    const idx = 540 + f;
    cell.blitTo(atlas, CW * COLS, (idx % COLS) * CW, Math.floor(idx / COLS) * CH);
  }

  // BLOCK 4 (720..899): INTERACT_TERMINAL — Lập Trình 3 Màn Hình & Đẩy Kính (180 frames @ 36 FPS)
  for (let f = 0; f < 180; f++) {
    cell.clear();
    const u = f / 179;
    const ide = f < 155 ? smooth(Math.min(1, f / 22)) : 1 - smooth((f - 155) / 24);
    const pushGlasses = f >= 118 && f <= 156 ? Math.sin(((f - 118) / 38) * Math.PI) : 0;

    // 2 side angled Hologram IDE Monitors behind/beside HoaVi
    if (ide > 0.2) {
      const sw = Math.round(18 * ide), sh = Math.round(14 * ide);
      drawCodeWindow(cell, AX - 26, AY - 36, sw, sh, Math.floor(f / 2), false);
      drawCodeWindow(cell, AX + 26, AY - 36, sw, sh, Math.floor(f / 2) + 2, false);
    }

    drawHoaViRig(cell, AX, AY, {
      view: 'S',
      bob: Math.sin(u * TAU * 3) * 1.2,
      coatSway: Math.sin(u * TAU * 3 - 0.4) * 1.1,
      coatFlare: 1.2 + pushGlasses * 1.5,
      // Left hand rises to push up her round glasses bridge during frames 118..156!
      armLPose: pushGlasses > 0.15
        ? { dx: -2.5 * (1 - pushGlasses) + 5.5 * pushGlasses, dy: lerp(6.5, -11.5, pushGlasses) }
        : { dx: -6.5 + Math.sin(f * 0.8) * 1.8, dy: 6.5 + Math.cos(f * 0.9) * 1.2 },
      armRPose: { dx: 6.5 + Math.cos(f * 0.85) * 1.8, dy: 6.5 + Math.sin(f * 0.95) * 1.2 },
      blink: f === 45 || f === 116,
      glassesGlint: pushGlasses > 0.25 ? pushGlasses : (f >= 65 && f <= 75 ? 0.5 : 0),
      smileOpen: pushGlasses > 0.35,
      keyboard: ide > 0.25,
      keyboardY: 0,
      keyboardKey: f * 3,
      prisms: true,
      prismPhase: u * TAU * 4,
      prismRadius: 23,
    });

    // Holographic Cyber-Lotus & Digital Fox Spirit (`Đốm`) projected above keyboard!
    if (f >= 45 && f <= 155) {
      const hy = AY - 54 + Math.sin(f * 0.18) * 2;
      drawLotusEmblem(cell, AX, hy, 5.0, C.CYAN3, C.PINK, C.WHITE, u * TAU * 2);
    }
    // Signature anime diagonal sparkle on glasses push!
    if (pushGlasses > 0.55) {
      const gx = AX + 4, gy = AY - 37;
      cell.line(gx - 4, gy, gx + 4, gy, 1.2, C.WHITE);
      cell.line(gx, gy - 4, gx, gy + 4, 1.2, C.CYAN3);
    }

    const idx = 720 + f;
    cell.blitTo(atlas, CW * COLS, (idx % COLS) * CW, Math.floor(idx / COLS) * CH);
  }

  savePng(path.join(ASSETS, 'hoavi-actions.png'), CW * COLS, CH * ROWS, atlas);
  return { atlas, CW, CH, COLS, ROWS };
}

// ============================================================================
// 3. SKILLS ATLAS (`assets/hoavi-skills.png` — 720f = 3 × 240f @ 40 FPS)
//    - 0..239:   attack       (4 views × 60f = 3 combos × 20f/view)
//    - 240..479: q_debug      (4 views × 60f)
//    - 480..719: e_checkpoint (e_cast: 4 views × 30f [480..599] + e_blink: 4 views × 30f [600..719])
// ============================================================================
function buildSkillsAtlas() {
  const CW = 112, CH = 100, AX = 56, AY = 82, COLS = 30, ROWS = 24;
  const atlas = new Uint8Array(CW * COLS * CH * ROWS);
  const cell = new PixelSurface(CW, CH);

  // SKILL 1 (0..239): PRIMARY ATTACK — Ấn Biên Dịch Tam Đoạn (4 views × 60f)
  for (let vIdx = 0; vIdx < 4; vIdx++) {
    const view = VIEWS[vIdx];
    const { fx, fy } = forwardVec(view);
    const aimAngle = Math.atan2(fy, fx);

    for (let f = 0; f < 60; f++) {
      cell.clear();
      const combo = Math.floor(f / 20); // 0, 1, 2
      const cf = f % 20;
      const cu = cf / 19;
      const snap = cf >= 4 && cf <= 14 ? Math.sin(((cf - 4) / 10) * Math.PI) : 0;
      const hop = combo === 2 ? Math.sin(cu * Math.PI) * 4.5 : 0;

      let armL = { dx: -6, dy: 6 }, armR = { dx: 6, dy: 6 };
      if (combo === 0) {
        armR = { dx: 6 + fx * snap * 7, dy: 5 - snap * 4 + fy * snap * 3 };
      } else if (combo === 1) {
        armL = { dx: -5 + fx * snap * 8 + (fx === 0 ? snap * 5 : 0), dy: 4 - snap * 4 };
      } else {
        armL = { dx: -5 + fx * snap * 6, dy: 4 - hop * 0.8 + snap * 3 };
        armR = { dx: 5 + fx * snap * 6, dy: 4 - hop * 0.8 + snap * 3 };
      }

      drawHoaViRig(cell, AX + fx * snap * 2.5, AY, {
        view,
        bob: -hop - snap * 1.2,
        leanX: fx * snap * 3.0,
        leanY: fy * snap * 1.5,
        stride: (combo % 2 === 0 ? 1 : -1) * snap * 0.65,
        coatFlare: 2.0 + snap * (combo === 2 ? 4.5 : 2.5),
        coatSway: -fx * snap * 2.5,
        armLPose: armL,
        armRPose: armR,
        glassesGlint: combo === 2 ? snap : 0,
        smileOpen: combo === 2 && snap > 0.5,
        keyboard: true,
        keyboardY: -hop * 0.6,
        keyboardKey: f * 2,
        prisms: true,
        prismPhase: (f / 60) * TAU * 3,
        prismRadius: 21 + snap * 3,
        backHalo: combo === 2 ? snap * 0.7 : 0,
      });

      // Volumetric Cyber Slash / Lotus Muzzle Burst per Combo!
      if (snap > 0.15) {
        const mx = AX + fx * 18, my = AY - 25 + fy * 12 - hop * 0.8;
        if (combo === 0) {
          cell.ring(mx, my, 4 + snap * 6, 4 + snap * 6, 1.2, C.CYAN3);
          cell.line(mx - fx * 5, my - fy * 5, mx + fx * 12, my + fy * 10, 2.0, C.WHITE);
        } else if (combo === 1) {
          drawCyberCrescent(cell, AX + fx * 7, AY - 25, aimAngle, 17 + snap * 5, 1.9, 2.8 * snap, C.CYAN2, C.PINK);
        } else {
          // Combo 3 SUDO OVERRIDE: 8-petal Cyber-Lotus cannon bloom!
          drawLotusEmblem(cell, mx + fx * 3, my, 5 + snap * 8, C.CYAN3, C.PINK, C.WHITE, cu * TAU);
          cell.ring(mx + fx * 3, my, 7 + snap * 9, 7 + snap * 9, 1.2, C.GOLD2);
        }
      }

      const idx = vIdx * 60 + f;
      cell.blitTo(atlas, CW * COLS, (idx % COLS) * CW, Math.floor(idx / COLS) * CH);
    }
  }

  // SKILL 2 (240..479): Q_DEBUG — Debug · Điểm Gãy & Dư Ảnh Echo (4 views × 60f)
  for (let vIdx = 0; vIdx < 4; vIdx++) {
    const view = VIEWS[vIdx];
    const { fx, fy } = forwardVec(view);
    for (let f = 0; f < 60; f++) {
      cell.clear();
      const windup = f < 18 ? smooth(f / 17) : 0;
      const fire = f >= 18 && f < 42 ? Math.sin(((f - 18) / 24) * Math.PI) : 0;
      const echo = f >= 36 ? Math.sin(((f - 36) / 23) * Math.PI) : 0;

      // Echo Sakura-Cyan Hologram Afterimage (frames 36..59)
      if (echo > 0.15) {
        const ex = AX - fx * (6 + echo * 5);
        for (let r = 0; r < 8; r++) {
          const yy = AY - 46 + r * 5.2;
          cell.rect(ex - 7 + (r % 2) * 3, yy, 14, 1.4, r % 2 === 0 ? C.PINK : C.CYAN2);
        }
      }

      drawHoaViRig(cell, AX - fx * fire * 2.5, AY, {
        view,
        bob: -windup * 2.5 - fire * 1.5,
        leanX: fx * (fire * 3.5 - windup * 1.5),
        coatFlare: windup * 2.5 + fire * 4.5,
        coatSway: -fx * fire * 4.0,
        armLPose: { dx: -6 + fx * windup * 4, dy: 3 - windup * 4 },
        armRPose: { dx: 6 + fx * (windup * 4 + fire * 8), dy: 3 - fire * 4 + fy * fire * 4 },
        glassesGlint: f >= 12 && f <= 30 ? 0.9 : 0,
        smileOpen: fire > 0.5,
        keyboard: windup > 0.2,
        keyboardY: -2,
        keyboardKey: f * 2,
        prisms: true,
        prismPhase: (f / 60) * TAU * 3,
        prismRadius: 22 + fire * 4,
        backHalo: fire * 0.65,
      });

      // Stacked Hologram Code Windows + Breakpoint Reticle & Railgun Lance
      const wx = AX + (fx !== 0 ? fx * 20 : 18);
      const wy = AY - 33 + fy * 8;
      if (f >= 3 && f <= 38) {
        drawCodeWindow(cell, wx, wy - 5, 18, 14, Math.floor(f / 2), f >= 12 && f <= 26);
      }
      if (fire > 0.1) {
        const bx = AX + fx * 20, by = AY - 25 + fy * 12;
        cell.ring(bx, by, 5 + fire * 9, 5 + fire * 9, 1.4, C.CYAN3);
        cell.ring(bx + fx * 5, by + fy * 4, 3.5 + fire * 5, 3.5 + fire * 5, 1.2, C.PINK);
        cell.line(AX + fx * 8, AY - 25, bx + fx * 15, by + fy * 11, 2.8 * fire + 1, C.WHITE);
        // Red breakpoint <!> diamond lock
        cell.poly([[bx, by - 5], [bx + 5, by], [bx, by + 5], [bx - 5, by]], C.RED);
        cell.set(bx, by, C.WHITE);
      }

      const idx = 240 + vIdx * 60 + f;
      cell.blitTo(atlas, CW * COLS, (idx % COLS) * CW, Math.floor(idx / COLS) * CH);
    }
  }

  // SKILL 3A (480..599): E_CAST — Checkpoint · Ấn Sen Định Vị (4 views × 30f)
  for (let vIdx = 0; vIdx < 4; vIdx++) {
    const view = VIEWS[vIdx];
    for (let f = 0; f < 30; f++) {
      cell.clear();
      const u = f / 29;
      const lift = f < 11 ? smooth(f / 10) : 0;
      const stamp = f >= 11 ? Math.sin(((f - 11) / 18) * Math.PI) : 0;

      // Ground 8-Petal Cyber-Lotus Checkpoint Mandala + 4 Data Pillars
      if (f >= 9) {
        const sr = 10 + smooth((f - 9) / 14) * 24;
        cell.ring(AX, AY - 1, sr, sr * 0.42, 1.3, C.CYAN3);
        drawLotusEmblem(cell, AX, AY - 1, sr * 0.65, C.PINK, C.CYAN2, C.GOLD2, u * TAU);
        if (stamp > 0.2) {
          for (const sx of [-18, -8, 8, 18]) {
            const ph = stamp * 28;
            cell.line(AX + sx, AY, AX + sx, AY - ph, 1.4, Math.abs(sx) > 10 ? C.CYAN3 : C.GOLD2);
          }
        }
      }

      drawHoaViRig(cell, AX, AY, {
        view,
        bob: -lift * 5.0 + stamp * 2.0,
        coatFlare: lift * 3.0 + stamp * 4.2,
        armLPose: { dx: -8 - lift * 3, dy: 4 - lift * 10 + stamp * 6 },
        armRPose: { dx: 8 + lift * 3, dy: 4 - lift * 10 + stamp * 6 },
        glassesGlint: stamp,
        prisms: true,
        prismPhase: u * TAU * 2,
        prismRadius: 23,
        backHalo: stamp * 0.6,
      });

      const idx = 480 + vIdx * 30 + f;
      cell.blitTo(atlas, CW * COLS, (idx % COLS) * CW, Math.floor(idx / COLS) * CH);
    }
  }

  // SKILL 3B (600..719): E_BLINK — Hồi Quy Lượng Tử 16-Slice Teleport (4 views × 30f)
  for (let vIdx = 0; vIdx < 4; vIdx++) {
    const view = VIEWS[vIdx];
    for (let f = 0; f < 30; f++) {
      cell.clear();
      const u = f / 29;
      const phase = Math.sin(u * Math.PI); // 0 -> 1 (dissolved) -> 0 (reformed)
      const temp = new PixelSurface(CW, CH);

      drawHoaViRig(temp, AX, AY, {
        view,
        bob: -phase * 5.0,
        coatFlare: 3.5,
        armLPose: { dx: -7, dy: 2 },
        armRPose: { dx: 7, dy: 2 },
        glassesGlint: f >= 20 ? 0.9 : 0,
        prisms: true,
        prismPhase: u * TAU * 3,
      });

      // Quantum scanline horizontal slice displacement + core data column!
      const bandH = 4;
      for (let y = 0; y < CH; y++) {
        const band = Math.floor(y / bandH);
        const shift = Math.round((band % 2 === 0 ? 1 : -1) * phase * 16);
        if (phase > 0.68 && band % 3 === 0) continue;
        for (let x = 0; x < CW; x++) {
          const v = temp.get(x, y);
          if (!v) continue;
          const nx = x + shift;
          const recolor = phase > 0.45 && Math.abs(x - AX) > 7 ? (band % 2 === 0 ? C.CYAN3 : C.PINK) : v;
          cell.set(nx, y, recolor);
        }
      }
      // Vertical teleport beam core
      if (phase > 0.2) {
        const bw = phase * 7;
        cell.rect(AX - bw, 12, bw * 2, AY - 10, phase > 0.6 ? C.CYAN3 : C.CYAN2);
        cell.rect(AX - bw * 0.4, 10, bw * 0.8, AY - 8, C.WHITE);
        cell.ring(AX, AY - 1, 10 + phase * 16, 4 + phase * 6, 1.2, C.PINK);
      }

      const idx = 600 + vIdx * 30 + f;
      cell.blitTo(atlas, CW * COLS, (idx % COLS) * CW, Math.floor(idx / COLS) * CH);
    }
  }

  savePng(path.join(ASSETS, 'hoavi-skills.png'), CW * COLS, CH * ROWS, atlas);
  return { atlas, CW, CH, COLS, ROWS };
}

// ============================================================================
// 4. ULTIMATE `R` ATLAS (`assets/hoavi-ult-r.png` — 300 frames @ 45 FPS, 160×120)
//    OVERCLOCK: THIÊN CƠ MẮT TRẬN (12 Cyber-Lotus Satellites + Panoramic Terminal)
// ============================================================================
function buildUltAtlas() {
  const CW = 160, CH = 120, AX = 80, AY = 96, COLS = 20, ROWS = 15;
  const atlas = new Uint8Array(CW * COLS * CH * ROWS);
  const cell = new PixelSurface(CW, CH);

  for (let f = 0; f < 300; f++) {
    cell.clear();
    const u = f / 299;
    // 4 Cinematic Phases across 300 frames:
    // P1 (0..74):    Terminal Online & Octagonal Cyber-Lotus Array
    // P2 (75..159):  Levitating Compile & Twin Giant Lotus Spawning 12 Satellites
    // P3 (160..239): 100% Compile · 12-Eye Celestial Crown Lock & Glasses Whiteout
    // P4 (240..299): Omni-Beam Execution Barrage & Shockwave Settle
    const p1 = clamp(f / 74, 0, 1);
    const p2 = clamp((f - 75) / 84, 0, 1);
    const p3 = clamp((f - 160) / 79, 0, 1);
    const p4 = clamp((f - 240) / 59, 0, 1);

    const levitate = f < 75 ? smooth(p1) * 4 : f < 245 ? 4 + smooth(p2) * 11 : lerp(15, 0, smooth(p4));
    const arrayR = 16 + smooth(p1) * 52;

    // 1. Grand Ground Octagonal Cyber-Lotus Magic Array
    cell.ring(AX, AY, arrayR, arrayR * 0.36, 1.5, C.CYAN2);
    cell.ring(AX, AY, arrayR * 0.76, arrayR * 0.27, 1.1, C.GOLD2);
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8 + u * TAU * 1.5;
      const x0 = AX + Math.cos(a) * arrayR * 0.4, y0 = AY + Math.sin(a) * arrayR * 0.15;
      const x1 = AX + Math.cos(a) * arrayR, y1 = AY + Math.sin(a) * arrayR * 0.36;
      cell.line(x0, y0, x1, y1, 1.0, i % 2 === 0 ? C.CYAN3 : C.PINK);
    }

    // 2. Three Panoramic Floating Terminal Screens (frames 12..255)
    if (f >= 12 && f <= 265) {
      const fade = f < 35 ? smooth((f - 12) / 23) : f > 240 ? 1 - smooth((f - 240) / 25) : 1;
      const w = Math.round(24 * fade), h = Math.round(16 * fade);
      if (w >= 8) {
        drawCodeWindow(cell, AX - 44, AY - 42 - levitate * 0.4, w, h, Math.floor(f / 2), f >= 160);
        drawCodeWindow(cell, AX + 44, AY - 42 - levitate * 0.4, w, h, Math.floor(f / 2) + 3, f >= 160);
        drawCodeWindow(cell, AX, AY - 65 - levitate * 0.3, Math.round(30 * fade), Math.round(13 * fade), Math.floor(f / 2) + 1, f >= 220);
      }
    }

    // 3. Twin Giant Shoulder Lotus Halos (frames 75..260)
    if (f >= 75 && f <= 270) {
      const lr = 10 * (f > 245 ? 1 - smooth((f - 245) / 25) : smooth(p2));
      for (const side of [-1, 1]) {
        const lx = AX + side * 24, ly = AY - 36 - levitate;
        drawLotusEmblem(cell, lx, ly, lr, C.CYAN3, C.ROBE3, C.GOLD2, side * u * TAU * 3);
      }
    }

    // 4. 12 Autonomous Thiên Cơ Eye-Satellites Assembling & Firing!
    if (f >= 85) {
      const eyeCount = f < 160 ? Math.min(12, Math.floor(p2 * 13) + 1) : 12;
      const firing = f >= 240 && f <= 284;
      for (let i = 0; i < eyeCount; i++) {
        const ringIdx = i < 6 ? 0 : 1;
        const slotAngle = ((i % 6) * TAU) / 6 + u * TAU * (ringIdx === 0 ? 2.0 : -1.5);
        const rx = ringIdx === 0 ? 40 : 60;
        const ry = ringIdx === 0 ? 22 : 32;
        const ex = AX + Math.cos(slotAngle) * rx;
        const ey = AY - 35 - levitate * 0.7 + Math.sin(slotAngle) * ry;
        const outAngle = Math.atan2(ey - (AY - 35 - levitate), ex - AX);

        // Laser targeting tether in P3 / Plasma Omni-Beam in P4!
        if (f >= 165 && f < 240 && i % 2 === (Math.floor(f / 6) % 2)) {
          cell.line(AX, AY - 32 - levitate, ex, ey, 1.0, C.CYAN1);
        }
        if (firing) {
          const bx = ex + Math.cos(outAngle) * 32;
          const by = ey + Math.sin(outAngle) * 26;
          cell.line(ex, ey, bx, by, 3.2, i % 2 === 0 ? C.CYAN3 : C.PINK);
          cell.line(ex, ey, bx, by, 1.4, C.WHITE);
        }
        drawSatelliteEye(cell, ex, ey, outAngle, 0.72, p3 * 0.6, firing);
      }
    }

    // 5. HoaVi Centerpiece (Levitating Overclock Pose!)
    const execSlash = f >= 240 && f <= 272 ? Math.sin(((f - 240) / 32) * Math.PI) : 0;
    drawHoaViRig(cell, AX, AY, {
      view: 'S',
      bob: -levitate,
      coatFlare: 2.5 + levitate * 0.35 + execSlash * 4.0,
      coatSway: Math.sin(u * TAU * 6) * 2.0,
      leftFootLift: levitate > 3 ? 2.5 : 0,
      rightFootLift: levitate > 3 ? 1.0 : 0,
      armLPose: f >= 160 && f < 240
        ? { dx: -11, dy: -6 }
        : { dx: -8, dy: 4 - p2 * 5 },
      armRPose: f >= 240
        ? { dx: 12 * execSlash + 6, dy: -8 + execSlash * 14 }
        : f >= 160
          ? { dx: 11, dy: -6 }
          : { dx: 8, dy: 4 - p2 * 5 },
      glassesGlint: f >= 170 && f <= 265 ? 1.0 : 0.3,
      smileOpen: f >= 180 && f <= 275,
      keyboard: f >= 20 && f <= 245,
      keyboardY: -1,
      keyboardKey: f * 3,
      prisms: true,
      prismPhase: u * TAU * 8,
      prismRadius: 24 + p3 * 5,
      backHalo: clamp(p2 + p3, 0, 1),
    });

    // 6. Peak Overclock Shockwave Dome (frames 242..282)
    if (f >= 242 && f <= 282) {
      const su = (f - 242) / 40;
      cell.ring(AX, AY - 26, 18 + su * 58, 12 + su * 38, 1.8 * (1 - su) + 0.8, C.WHITE);
      cell.ring(AX, AY - 26, 12 + su * 50, 8 + su * 32, 1.4, C.CYAN3);
    }

    cell.blitTo(atlas, CW * COLS, (f % COLS) * CW, Math.floor(f / COLS) * CH);
  }

  savePng(path.join(ASSETS, 'hoavi-ult-r.png'), CW * COLS, CH * ROWS, atlas);
  return { atlas, CW, CH, COLS, ROWS };
}

// ============================================================================
// 5. STANDALONE COMPLETE VFX SHEET (`assets/hoavi-vfx.png` — 960×540, 199 frames)
// ============================================================================
function buildVfxV2Atlas() {
  const W = 960, H = 540;
  const atlas = new Uint8Array(W * H);

  // A. 36-frame `satellite_eye` (40×40, y=0..79, 24 cols row 0 + 12 cols row 1)
  for (let i = 0; i < 36; i++) {
    const s = new PixelSurface(40, 40);
    const angle = (i * TAU) / 36;
    drawSatelliteEye(s, 20, 20, angle, 1.15, Math.sin(i * 0.7) * 0.4, i % 3 === 0);
    s.outline(C.OUT);
    const col = i % 24, row = Math.floor(i / 24);
    s.blitTo(atlas, W, col * 40, row * 40);
  }

  // B. 24-frame `checkpoint_lotus` (72×72, y=80..223, 12 cols × 2 rows)
  for (let i = 0; i < 24; i++) {
    const s = new PixelSurface(72, 72);
    const u = i / 24;
    s.ring(36, 36, 32, 32, 1.5, C.CYAN2);
    s.ring(36, 36, 25, 25, 1.1, C.GOLD2);
    drawLotusEmblem(s, 36, 36, 23, C.CYAN3, C.PINK, C.GOLD2, u * TAU);
    for (let k = 0; k < 8; k++) {
      const a = (k * TAU) / 8 - u * TAU;
      s.ellipse(36 + Math.cos(a) * 29, 36 + Math.sin(a) * 29, 1.6, 1.6, k % 2 ? C.WHITE : C.CYAN3);
    }
    const col = i % 12, row = Math.floor(i / 12);
    s.blitTo(atlas, W, col * 72, 80 + row * 72);
  }

  // C. 24-frame `blink_pillar` (40×88, y=224..311, 24 cols)
  for (let i = 0; i < 24; i++) {
    const s = new PixelSurface(40, 88);
    const u = i / 23;
    const env = Math.sin(u * Math.PI);
    s.ring(20, 78, 6 + env * 12, 3 + env * 5, 1.2, C.CYAN3);
    for (let y = 8; y < 80; y += 2) {
      const v = (y - 8) / 72;
      const x1 = 20 + Math.sin(v * TAU * 2 + u * TAU * 2) * (12 * env);
      const x2 = 20 - Math.sin(v * TAU * 2 + u * TAU * 2) * (12 * env);
      if (env > 0.1) {
        s.rect(x1 - 1, y, 3, 2, C.CYAN3);
        s.rect(x2 - 1, y, 3, 2, C.PINK);
      }
    }
    if (env > 0.25) {
      s.rect(20 - env * 4, 6, env * 8, 74, C.CYAN2);
      s.rect(20 - env * 2, 4, env * 4, 76, C.WHITE);
    }
    s.blitTo(atlas, W, i * 40, 224);
  }

  // D. 16-frame `code_bolt` (36×20, y=320..339)
  for (let i = 0; i < 16; i++) {
    const s = new PixelSurface(36, 20);
    s.poly([[34, 10], [20, 4], [8, 8], [2, 10], [8, 12], [20, 16]], C.CYAN2);
    s.poly([[32, 10], [20, 6], [10, 10], [20, 14]], C.CYAN3);
    s.line(12, 10, 31, 10, 2.0, C.WHITE);
    s.line(16, 4, 24, 7, 1.4, C.GOLD2);
    s.line(16, 16, 24, 13, 1.4, C.GOLD2);
    for (let t = 0; t < 3; t++) {
      s.rect(2 + ((t * 3 + i) % 8), 7 + ((t * 5 + i) % 7), 2, 2, t % 2 ? C.PINK : C.CYAN3);
    }
    s.outline(C.OUT);
    s.blitTo(atlas, W, i * 36, 320);
  }

  // E. 16-frame `fault_mark` (28×28, y=344..371)
  for (let i = 0; i < 16; i++) {
    const s = new PixelSurface(28, 28);
    const r = 9 + Math.sin((i / 16) * TAU) * 1.5;
    s.poly([[14, 14 - r], [14 + r, 14], [14, 14 + r], [14 - r, 14]], C.INK1);
    s.line(14, 14 - r, 14 + r, 14, 1.4, C.RED);
    s.line(14 + r, 14, 14, 14 + r, 1.4, C.CYAN3);
    s.line(14, 14 + r, 14 - r, 14, 1.4, C.RED);
    s.line(14 - r, 14, 14, 14 - r, 1.4, C.CYAN3);
    s.rect(13, 9, 2, 6, C.WHITE);
    s.rect(13, 17, 2, 2, C.GOLD2);
    s.blitTo(atlas, W, i * 28, 344);
  }

  // F. 16-frame `shield` (56×68, y=380..447)
  for (let i = 0; i < 16; i++) {
    const s = new PixelSurface(56, 68);
    drawHexBarrier(s, 28, 34, 24, 30, (i / 16) * TAU, i % 4 === 0 ? C.WHITE : C.CYAN3);
    s.blitTo(atlas, W, i * 56, 380);
  }

  // G. 5-phase `debug_beam_tail` (x=0..159), `debug_beam_body` (x=160..319), `debug_beam_head` (x=320..479) — 32×32 at y=456
  const beamHalf = [2, 6, 4.5, 2.5, 1.5];
  for (let p = 0; p < 5; p++) {
    const hw = beamHalf[p];
    // Tail (0..31)
    const st = new PixelSurface(32, 32);
    if (p <= 3) {
      st.rect(2, 16 - hw, 30, hw * 2, C.CYAN2); // rgb(31,200,219) -> recolors to PINK on Echo!
      if (hw >= 3) st.rect(4, 16 - hw * 0.55, 28, hw * 1.1, C.CYAN3);
      st.rect(4, 15, 28, 2, C.WHITE);
      st.ring(10, 16, 6 + (p === 1 ? 3 : 0), 6 + (p === 1 ? 3 : 0), 1.2, C.GOLD2);
    } else {
      for (let x = 4; x < 30; x += 6) st.rect(x, 15, 3, 2, C.CYAN2);
      st.ring(10, 16, 5, 5, 1.0, C.CYAN2);
    }
    st.blitTo(atlas, W, p * 32, 456);

    // Body (32×32 tileable along X)
    const sb = new PixelSurface(32, 32);
    if (p <= 2) {
      sb.rect(0, 16 - hw, 32, hw * 2, C.CYAN2);
      for (let x = 0; x < 32; x += 2) {
        const wave = Math.sin(((x + p * 7) / 32) * TAU) * (hw * 0.7);
        sb.rect(x, 15 + wave * 0.4, 2, 2, C.CYAN3);
      }
      sb.rect(0, 15, 32, 2, C.WHITE);
      if (p === 1) { sb.rect(8, 9, 3, 14, C.GOLD2); sb.rect(22, 9, 3, 14, C.CYAN3); }
    } else {
      for (let x = 2; x < 30; x += 7) {
        sb.rect(x, 15, 4, 2, C.CYAN2);
        sb.set(x + 2, 12 + (x % 2) * 7, C.CYAN3);
      }
    }
    sb.blitTo(atlas, W, 160 + p * 32, 456);

    // Head (32×32 spearhead ending cleanly <= x=30)
    const sh = new PixelSurface(32, 32);
    if (p <= 2) {
      sh.rect(0, 16 - hw, 20, hw * 2, C.CYAN2);
      sh.poly([[30, 16], [18, 16 - hw - 4], [14, 16], [18, 16 + hw + 4]], C.CYAN2);
      sh.poly([[28, 16], [19, 16 - hw - 1], [19, 16 + hw + 1]], C.WHITE);
    } else {
      sh.poly([[29, 16], [20, 11], [22, 16], [20, 21]], C.CYAN2);
      sh.rect(4, 15, 12, 2, C.CYAN3);
    }
    sh.blitTo(atlas, W, 320 + p * 32, 456);
  }

  // H. 4-phase `satellite_beam` (32×16 at x=480..607, y=456) + `pixel_shadow` (32×8 at x=608, y=456)
  for (let p = 0; p < 4; p++) {
    const ss = new PixelSurface(32, 16);
    const hw = [2.5, 3.5, 2.0, 1.2][p];
    ss.rect(0, 8 - hw, 32, hw * 2, C.CYAN2);
    ss.rect(0, 7, 32, 2, C.WHITE);
    if (p % 2 === 1) ss.poly([[16, 2], [21, 8], [16, 14], [11, 8]], C.GOLD2);
    ss.blitTo(atlas, W, 480 + p * 32, 456);
  }
  const shad = new PixelSurface(32, 8);
  shad.ellipse(16, 4, 11.5, 2.8, C.TERM);
  shad.ellipse(16, 4, 8.2, 1.9, C.OUT);
  shad.blitTo(atlas, W, 608, 456);

  // I. 8-frame `code_window` (40×32, x=0..319, y=492), 8-frame `muzzle_snap` (28×28, x=320..543, y=492), 8-frame `hit_glitch` (36×36, x=544..831, y=492)
  for (let i = 0; i < 8; i++) {
    const cw = new PixelSurface(40, 32);
    drawCodeWindow(cw, 20, 16, 34, 26, i, i >= 5);
    cw.blitTo(atlas, W, i * 40, 492);

    const mz = new PixelSurface(28, 28);
    const r = 4 + i * 1.3;
    if (i < 6) {
      mz.ring(14, 14, r, r, 1.3, i % 2 === 0 ? C.CYAN3 : C.GOLD2);
      if (i < 4) { mz.rect(14 - r, 13, r * 2, 2, C.WHITE); mz.rect(13, 14 - r, 2, r * 2, C.WHITE); }
    } else {
      for (let k = 0; k < 4; k++) {
        const a = (k * TAU) / 4 + 0.78;
        mz.rect(14 + Math.cos(a) * 9, 14 + Math.sin(a) * 9, 2, 2, C.CYAN3);
      }
    }
    mz.blitTo(atlas, W, 320 + i * 28, 492);

    const hg = new PixelSurface(36, 36);
    const hr = 5 + i * 1.7;
    if (i < 5) {
      hg.ring(18, 18, hr, hr, 1.4, i % 2 === 0 ? C.CYAN3 : C.PINK);
      if (i < 3) { hg.line(8, 8, 28, 28, 1.5, C.WHITE); hg.line(28, 8, 8, 28, 1.5, C.CYAN2); }
    }
    for (let k = 0; k < 6; k++) {
      const a = (k * TAU) / 6 + i * 0.35;
      hg.rect(18 + Math.cos(a) * hr - 1, 18 + Math.sin(a) * hr - 1, 2, 2, k % 2 === 0 ? C.PINK : C.CYAN3);
    }
    hg.blitTo(atlas, W, 544 + i * 36, 492);
  }

  savePng(path.join(ASSETS, 'hoavi-vfx.png'), W, H, atlas);
}

// ============================================================================
// 6. HIGH-RES SHOWCASE SHEETS FOR VISUAL INSPECTION
// ============================================================================
function scaleBlit(srcAtlas, srcW, sx, sy, cw, ch, dst, dstW, dx, dy, scale) {
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const col = srcAtlas[(sy + y) * srcW + (sx + x)];
      if (!col) continue;
      for (let py = 0; py < scale; py++) {
        const dOff = (dy + y * scale + py) * dstW + (dx + x * scale);
        for (let px = 0; px < scale; px++) dst[dOff + px] = col;
      }
    }
  }
}

function buildShowcaseSheets(portrait, keyart, loco, acts, skills, ult) {
  if (!ARTIFACT_DIR) return;

  // Sheet A: Turnaround 4 Views + Portrait + KeyArt (`hoavi_overhaul_turnaround.png`)
  const W1 = 1080, H1 = 560;
  const buf1 = new Uint8Array(W1 * H1);
  const bg1 = new PixelSurface(W1, H1);
  bg1.rect(0, 0, W1, H1, C.TERM);
  bg1.buf.set(bg1.buf);
  buf1.set(bg1.buf);

  // Portrait 2x (256×256)
  scaleBlit(portrait.buf, 128, 0, 0, 128, 128, buf1, W1, 24, 24, 2);
  // KeyArt 2x (360×420)
  scaleBlit(keyart.buf, 180, 0, 0, 180, 210, buf1, W1, 300, 24, 2);
  // 4-view Idle & Run at 2x (208×192 each)
  for (let v = 0; v < 4; v++) {
    const idxIdle = v * 30 + 8;
    const sx = (idxIdle % loco.COLS) * loco.CW, sy = Math.floor(idxIdle / loco.COLS) * loco.CH;
    scaleBlit(loco.atlas, loco.CW * loco.COLS, sx, sy, loco.CW, loco.CH, buf1, W1, 660 + (v % 2) * 204, 20 + Math.floor(v / 2) * 196, 2);
  }
  // 3 World Interactions preview along bottom-left
  for (let k = 0; k < 3; k++) {
    const fIdx = (k + 2) * 180 + (k === 0 ? 125 : k === 1 ? 132 : 138);
    const sx = (fIdx % acts.COLS) * acts.CW, sy = Math.floor(fIdx / acts.COLS) * acts.CH;
    scaleBlit(acts.atlas, acts.CW * acts.COLS, sx, sy, acts.CW, acts.CH, buf1, W1, 16 + k * 212, 320, 2);
  }
  savePng(path.join(ARTIFACT_DIR, 'hoavi_overhaul_turnaround.png'), W1, H1, buf1);

  // Sheet B: Skills & Ultimate R Showcase (`hoavi_overhaul_skills_showcase.png`)
  const W2 = 1120, H2 = 740;
  const buf2 = new Uint8Array(W2 * H2);
  buf2.fill(C.TERM);
  const skillPicks = [
    10,  // Attack Combo 1
    30,  // Attack Combo 2
    50,  // Attack Combo 3 (SUDO OVERRIDE)
    268, // Q Debug Railgun + Breakpoint
    502, // E Checkpoint Seal
  ];
  for (let i = 0; i < skillPicks.length; i++) {
    const idx = skillPicks[i];
    const sx = (idx % skills.COLS) * skills.CW, sy = Math.floor(idx / skills.COLS) * skills.CH;
    scaleBlit(skills.atlas, skills.CW * skills.COLS, sx, sy, skills.CW, skills.CH, buf2, W2, 8 + i * 220, 16, 2);
  }
  const ultPicks = [45, 130, 205, 256];
  for (let i = 0; i < ultPicks.length; i++) {
    const idx = ultPicks[i];
    const sx = (idx % ult.COLS) * ult.CW, sy = Math.floor(idx / ult.COLS) * ult.CH;
    scaleBlit(ult.atlas, ult.CW * ult.COLS, sx, sy, ult.CW, ult.CH, buf2, W2, 80 + (i % 2) * 520, 232 + Math.floor(i / 2) * 248, 2);
  }
  savePng(path.join(ARTIFACT_DIR, 'hoavi_overhaul_skills_showcase.png'), W2, H2, buf2);
}

function main() {
  const t0 = Date.now();
  const portrait = buildHoaViPortrait128();
  savePng(path.join(ASSETS, 'hoavi-portrait.png'), 128, 128, portrait.buf);

  const keyart = buildHoaViKeyArt();
  savePng(path.join(ASSETS, 'hoavi-keyart.png'), 180, 210, keyart.buf);

  const loco = buildLocomotionAtlas();
  const acts = buildActionsAtlas();
  const skills = buildSkillsAtlas();
  const ult = buildUltAtlas();
  buildVfxV2Atlas();
  buildShowcaseSheets(portrait, keyart, loco, acts, skills, ult);

  console.log(`Built standalone HoaVi overhaul (2,361 frames across 7 indexed PNGs) in ${Date.now() - t0}ms.`);
}

main();
