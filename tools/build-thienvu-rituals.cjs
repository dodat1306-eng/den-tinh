'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {
  PAL_LIST, C, FORMS, GEM_RING, AX, AY,
  encodeIndexedPNG, makeBuf, pset, disc, capsule, polyTri, outlineBuf, drawRing,
  drawVolumetricPlume, drawGroundVortex, drawVolumetricCrescent, drawVolumetricSpire,
  drawVolumetricTornado, drawVolumetricPlasma, drawStarFlare, drawVolumetricVine,
  drawHeldWeapon, drawCanonicalThienVu, blitIndexed
} = require('./build-thienvu-300.cjs');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const ARTIFACT_DIR = path.join(ROOT, 'runtime', 'thienvu-art');

// Wide Ritual Sakuga Cell: 168x120 (renders at unit=2 -> 336x240 screen px — zero weapon clipping!)
const RCW = 168, RCH = 120;
const RAX = 84, RAY = 95;
const RCOLS = 18, RROWS = 21; // 378 slots >= 372 Sakuga frames!
const TOTAL_FRAMES = 372;
const TAU = Math.PI * 2;

const GOLD_VFX = [C.gold0, C.gold1, C.gold2, C.gold3, C.gold4, C.white];

function drawVolumetricRibbon(b, x0, y0, x1, y1, arcLift, thick, vIdx, phase = 0) {
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const wob = Math.sin(u * Math.PI * 3 - phase * 5) * 2.5 * Math.sin(u * Math.PI);
    const px = x0 + (x1 - x0) * u + wob;
    const py = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * arcLift;
    const r = thick * (0.65 + 0.65 * Math.sin(u * Math.PI));
    drawVolumetricPlume(b, px, py, r * 1.65, r * 1.45, vIdx, 0.92, i + Math.round(phase * 7));
    disc(b, px, py, Math.max(0.9, r * 0.45), C.white);
  }
}

function drawSacredPolygon(b, pts, vIdx, thick = 1.6) {
  const n = pts.length;
  const step = n === 7 ? 2 : n === 5 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + step) % n];
    capsule(b, ax, ay, bx, by, thick + 1.0, thick + 1.0, vIdx[2]);
    capsule(b, ax, ay, bx, by, thick * 0.55, thick * 0.55, vIdx[4]);
    if (n >= 5) {
      const [cx, cy] = pts[(i + 1) % n];
      capsule(b, ax, ay, cx, cy, thick * 0.75, thick * 0.75, vIdx[3]);
    }
  }
}

function drawElementalVertexPillar(b, formId, vx, vy, strength, phase, seed) {
  const form = FORMS.find(f => f.id === formId) || FORMS[1];
  const v = form.vIdx;
  drawGroundVortex(b, vx, vy + 1, 11 * strength + 4, 4.2 * strength + 1.5, v, phase, false);
  if (formId === 'lightning') {
    drawVolumetricPlume(b, vx, vy - 18 * strength, 9 * strength, 20 * strength, v, 0.9, seed);
    drawVolumetricPlasma(b, vx, Math.max(6, vy - 46 * strength), vx, vy, 1.5 * strength + 0.5, v, seed);
  } else if (formId === 'wind') {
    drawVolumetricTornado(b, vx, vy + 1, 42 * strength, 4, 11 * strength + 3, v, phase * 2);
  } else if (formId === 'earth') {
    drawVolumetricSpire(b, vx, vy + 1, 7.5 * strength + 2, 36 * strength, 0, v, false);
  } else if (formId === 'fire') {
    for (let h = 0; h < 4; h++) {
      drawVolumetricPlume(b, vx + Math.sin(phase * 3 + h) * 2, vy - h * 9 * strength, (10 - h * 1.4) * strength, 9 * strength, v, 1.05, seed + h);
    }
  } else if (formId === 'ice') {
    drawVolumetricSpire(b, vx - 3, vy + 1, 6 * strength + 1.5, 32 * strength, -2, v, true);
    drawVolumetricSpire(b, vx + 3, vy + 1, 7 * strength + 1.5, 40 * strength, 2, v, true);
  } else if (formId === 'nature') {
    drawVolumetricVine(b, vx - 3, vy, vx + 3, vy - 38 * strength, 4.5, v, phase * 2);
    drawVolumetricPlume(b, vx, vy - 16 * strength, 8 * strength, 14 * strength, v, 0.82, seed);
  } else {
    drawVolumetricPlume(b, vx, vy - 20 * strength, 9 * strength, 22 * strength, v, 0.95, seed);
    drawStarFlare(b, vx, vy - 28 * strength, 9 * strength + 2, v, phase * 2);
  }
}

// ============================================================================
// 1. BIẾN HÌNH / MORPHING RITUAL (Frames 0..127 = 8 Forms x 16f)
// ============================================================================
function renderTransformRitualFrame(formIdx, f) {
  const targetForm = FORMS[formIdx];
  const originForm = FORMS[0];
  const u = f / 15;
  const out = makeBuf(RCW, RCH);
  const back = makeBuf(RCW, RCH);
  const mid = makeBuf(RCW, RCH);
  const front = makeBuf(RCW, RCH);
  const v = targetForm.vIdx;

  disc(out, RAX, RAY + 2, 14, C.ink);

  // Expanding Dharma Vortex on ground
  const vortexR = 16 + Math.sin(u * Math.PI) * 34;
  drawGroundVortex(back, RAX, RAY + 2, vortexR, vortexR * 0.28, u < 0.35 ? originForm.vIdx : v, u * 8, u > 0.25 && u < 0.85);

  // Phase 1 (0..4): Origin raises Thất Linh Tâm Ấn, 7 Elemental Gems spiral inward!
  if (f <= 4) {
    const p = f / 4;
    const pts = drawCanonicalThienVu(mid, originForm, 'S', {
      dx: RAX - AX, dy: RAY - AY,
      lift: p * 6, raiseLeft: p * 0.9, armAngle: -0.6 - p * 0.9, rimGlow: 0.85, phase: p * Math.PI * 2
    });
    for (let g = 0; g < 7; g++) {
      const ga = p * Math.PI * 2.5 + (g / 7) * TAU;
      const gr = (1 - p * 0.72) * 38 + 6;
      const gx = pts.chestX + Math.cos(ga) * gr;
      const gy = pts.chestY - 4 + Math.sin(ga) * gr * 0.55;
      drawVolumetricPlume(Math.sin(ga) < 0 ? back : front, gx, gy, 5.2, 5.2, [C.pants1, GEM_RING[g], C.white], 1.05, f + g);
    }
    drawStarFlare(front, pts.rHandX, pts.rHandY - 4, 6 + p * 8, GOLD_VFX, p * 4);
  }
  // Phase 2 (5..10): Blazing Elemental Metamorphosis Pillar & Robe/Weapon Morph!
  else if (f <= 10) {
    const p = (f - 5) / 5;
    const swell = Math.sin(p * Math.PI);
    const activeForm = p < 0.35 ? originForm : targetForm;

    // Towering helical elemental column
    for (let h = 0; h < 6; h++) {
      const hy = RAY - 4 - h * 13 * (0.55 + swell * 0.45);
      const hr = (24 - h * 2.4) * (0.65 + swell * 0.45);
      drawVolumetricPlume(h % 2 === 0 ? back : front, RAX + Math.sin(p * 6 + h) * 3, hy, hr, 12, v, 1.08, f * 3 + h, p * 4);
    }
    // Concentric metamorphosis halo ring
    drawRing(back, RAX, RAY - 26, 18 + p * 22, 14 + p * 20, v[3], C.white);

    drawCanonicalThienVu(mid, activeForm, 'S', {
      dx: RAX - AX, dy: RAY - AY,
      lift: 7 + swell * 8, raiseLeft: 1.0, armAngle: -1.35 + p * 0.65, rimGlow: 1.0, phase: p * Math.PI * 4
    });
  }
  // Phase 3 (11..15): Pillar parts with a volumetric weapon crescent slash & heroic stance!
  else {
    const p = (f - 11) / 4;
    const view = p > 0.25 ? 'E' : 'S';
    const pts = drawCanonicalThienVu(mid, targetForm, view, {
      dx: RAX - AX, dy: RAY - AY,
      lift: (1 - p) * 6, crouch: p * 1.2, lean: p * 3.5,
      raiseLeft: (1 - p) * 0.6, armAngle: -0.85 + p * 1.15, rimGlow: 0.9 - p * 0.4, phase: p * Math.PI * 2
    });
    // Parting volumetric shockwave crescent + lingering weapon aura!
    drawVolumetricCrescent(front, pts.chestX + 6, pts.chestY, 0.08, 22 + p * 18, 9 * (1 - p * 0.45), v, p * 0.68, 1.65, f);
    drawVolumetricPlume(back, RAX - 16 - p * 12, RAY - 14, 12 * (1 - p * 0.5), 16 * (1 - p * 0.4), v, 0.85 * (1 - p * 0.5), f);
    drawVolumetricPlume(back, RAX + 16 + p * 12, RAY - 14, 12 * (1 - p * 0.5), 16 * (1 - p * 0.4), v, 0.85 * (1 - p * 0.5), f + 5);
  }

  for (let i = 0; i < RCW * RCH; i++) {
    if (back.d[i]) out.d[i] = back.d[i];
    if (mid.d[i]) out.d[i] = mid.d[i];
    if (front.d[i]) out.d[i] = front.d[i];
  }
  return out;
}

// ============================================================================
// 2. PHÂN THÂN 3 / 5 / 7 SAKUGA RITUAL (Frames 128..307 = 3 Modes x 60f)
// ============================================================================
function renderSplitRitualFrame(count, f) {
  const u = f / 59;
  const out = makeBuf(RCW, RCH);
  const back = makeBuf(RCW, RCH);
  const mid = makeBuf(RCW, RCH);
  const front = makeBuf(RCW, RCH);

  const splitForms = FORMS.slice(1, 1 + count); // Exact match to elemental.js forms.slice(0, count)!
  const openU = Math.min(1, u / 0.28);
  const radX = 14 + openU * 40; // up to 54px horizontal formation radius -> 30px weapon margin inside 168px!
  const radY = 6 + openU * 16;  // isometric ellipse depth!
  const spin = (1 - Math.min(1, Math.max(0, (u - 0.55) / 0.25))) * u * 1.4;

  // Compute formation vertices
  const verts = splitForms.map((form, i) => {
    const a = -Math.PI * 0.5 + (i / count) * TAU + spin * 0.35;
    return {
      form, i, a,
      vx: RAX + Math.cos(a) * radX,
      vy: RAY - 4 + Math.sin(a) * radY
    };
  });

  // 1. Sacred Isometric Dharma Array & Geometric Star Seal on the ground!
  drawGroundVortex(back, RAX, RAY - 3, radX * 1.04, radY * 1.08, GOLD_VFX, u * 10, u > 0.2);
  if (count >= 5) drawGroundVortex(back, RAX, RAY - 3, radX * 0.64, radY * 0.66, FORMS[0].vIdx, -u * 8, false);
  drawSacredPolygon(back, verts.map(v => [v.vx, v.vy]), GOLD_VFX, count === 3 ? 1.8 : 1.4);

  // Phase I (0..16): Origin Thiên Vũ levitates at center opening Thất Linh Tâm Ấn!
  if (f < 36) {
    const p = f / 35;
    const lift = Math.sin(Math.min(1, u / 0.45) * Math.PI * 0.5) * 14;
    const fadeOrigin = f >= 26 ? (f - 26) / 10 : 0;

    if (fadeOrigin < 0.85) {
      const pts = drawCanonicalThienVu(mid, FORMS[0], 'S', {
        dx: RAX - AX, dy: RAY - AY,
        lift, raiseLeft: Math.min(1, p * 1.8), armAngle: -0.95, rimGlow: 1.0, phase: u * TAU * 3
      });
      drawStarFlare(back, pts.chestX, pts.headY - 6, 9 + p * 11, GOLD_VFX, u * 9);
    } else {
      // Blazing 7-color soul core splitting apart!
      drawStarFlare(mid, RAX, RAY - 34, 18, GOLD_VFX, u * 12);
    }

    // Phase II (14..35): Volumetric Elemental Soul-Streams arc out to vertices & ignite Pillars!
    if (f >= 14) {
      const su = (f - 14) / 21;
      for (const vt of verts) {
        const target = Math.sin(vt.a) < 0 ? back : front;
        const reach = Math.min(1, su * 1.35);
        const ex = RAX + (vt.vx - RAX) * reach;
        const ey = (RAY - 32) + (vt.vy - (RAY - 32)) * reach;
        drawVolumetricRibbon(target, RAX, RAY - 32, ex, ey, 16 * Math.sin(reach * Math.PI) + 6, 2.8, vt.form.vIdx, u * 4 + vt.i);
        if (su > 0.35) {
          drawElementalVertexPillar(target, vt.form.id, vt.vx, vt.vy, Math.min(1, (su - 0.35) / 0.65), u * 6, f + vt.i * 7);
        }
      }
    }
  }
  // Phase III (36..59): All 3 / 5 / 7 Canonical Elemental Avatars Materialize & Brandish Held Weapons!
  else {
    const p = (f - 36) / 23;
    const settle = Math.min(1, p / 0.45);
    const shock = p > 0.35 ? (p - 0.35) / 0.65 : 0;

    // Central golden-white convergence burst fading into sacred seal
    if (p < 0.55) {
      drawVolumetricPlume(back, RAX, RAY - 28, 22 * (1 - p * 1.5), 22 * (1 - p * 1.5), GOLD_VFX, 1 - p * 1.4, f);
    }
    if (shock > 0) {
      drawGroundVortex(back, RAX, RAY - 2, radX + shock * 12, radY + shock * 5, GOLD_VFX, u * 12, false);
    }

    // Painter's sort from back (`vy` smallest) to front (`vy` largest) so every avatar & held weapon overlaps cleanly!
    const sorted = [...verts].sort((a, b) => a.vy - b.vy);
    for (const vt of sorted) {
      if (p < 0.65) {
        drawElementalVertexPillar(back, vt.form.id, vt.vx, vt.vy, (1 - p * 1.25) * 0.85, u * 6, f + vt.i * 5);
      }
      const charLayer = makeBuf(RCW, RCH);
      const faceCenter = Math.cos(vt.a);
      const view = Math.abs(faceCenter) > 0.42 ? 'E' : 'S';
      const mirrorAvatar = faceCenter < -0.42;

      // Render avatar in standard orientation then mirror horizontally around vt.vx if on left flank!
      const drawX = mirrorAvatar ? RAX : vt.vx;
      const swing = -0.95 + settle * 1.22;
      drawCanonicalThienVu(charLayer, vt.form, view, {
        dx: drawX - AX,
        dy: vt.vy - AY,
        lift: (1 - settle) * 10,
        crouch: settle * 1.2,
        lean: settle * 3.0,
        raiseLeft: (1 - settle) * 0.7,
        armAngle: swing,
        rimGlow: 0.95 - p * 0.35,
        phase: u * TAU * 3 + vt.i
      });

      if (mirrorAvatar) {
        for (let y = 0; y < RCH; y++) {
          const off = y * RCW;
          for (let x = 0; x < RCW; x++) {
            const c = charLayer.d[off + x];
            if (!c) continue;
            const mx = Math.round(vt.vx - (x - RAX));
            if (mx >= 1 && mx < RCW - 1) mid.d[off + mx] = c;
          }
        }
      } else {
        for (let i = 0; i < RCW * RCH; i++) if (charLayer.d[i]) mid.d[i] = charLayer.d[i];
      }

      // Crisp elemental weapon slash arc on arrival!
      if (p > 0.18 && p < 0.78) {
        const sp = (p - 0.18) / 0.60;
        const aimA = mirrorAvatar ? Math.PI : (view === 'E' ? 0 : Math.PI * 0.5);
        drawVolumetricCrescent(front, vt.vx, vt.vy - 18, aimA, 14 + sp * 8, 5.5 * (1 - sp * 0.6), vt.form.vIdx, sp * 0.75, 1.25, f + vt.i);
      }
    }
  }

  for (let i = 0; i < RCW * RCH; i++) {
    if (back.d[i]) out.d[i] = back.d[i];
    if (mid.d[i]) out.d[i] = mid.d[i];
    if (front.d[i]) out.d[i] = front.d[i];
  }
  return out;
}

// ============================================================================
// 3. HỢP NHẤT / THẤT TINH QUY NGUYÊN (Frames 308..371 = 64f)
// ============================================================================
function renderMergeRitualFrame(f) {
  const u = f / 63;
  const out = makeBuf(RCW, RCH);
  const back = makeBuf(RCW, RCH);
  const mid = makeBuf(RCW, RCH);
  const front = makeBuf(RCW, RCH);

  const elems = FORMS.slice(1); // All 7 elements converging back into Origin!

  // Phase I (0..23): 7 Elemental Avatars & Sacred Weapons spiral inward into golden vortex!
  if (f < 24) {
    const p = f / 23;
    const radX = (1 - p * 0.85) * 58 + 6;
    const radY = (1 - p * 0.85) * 21 + 3;
    drawGroundVortex(back, RAX, RAY - 2, radX * 1.08, radY * 1.1, GOLD_VFX, -p * 10, true);

    for (let i = 0; i < 7; i++) {
      const form = elems[i];
      const a = -Math.PI * 0.5 + (i / 7) * TAU + p * Math.PI * 2.4;
      const vx = RAX + Math.cos(a) * radX;
      const vy = RAY - 6 - p * 18 + Math.sin(a) * radY;
      const target = Math.sin(a) < 0 ? back : front;

      if (p < 0.42) {
        // Brief silhouette + glowing weapon dissolving into spirit comet!
        const wep = makeBuf(RCW, RCH);
        drawHeldWeapon(wep, form.id, vx - 4, vy - 12, a + Math.PI * 0.5, 0.95, p * 6);
        outlineBuf(wep, C.ink, C.gold3, 0.9);
        for (let k = 0; k < RCW * RCH; k++) if (wep.d[k]) mid.d[k] = wep.d[k];
      }
      drawVolumetricRibbon(target, vx, vy - 10, RAX, RAY - 28, 12 * (1 - p), 3.0 * (1 - p * 0.3), form.vIdx, p * 5 + i);
      drawVolumetricPlume(target, vx, vy - 10, 7.5, 7.5, [C.pants1, GEM_RING[i], C.white], 1.1, f + i);
    }
    drawStarFlare(mid, RAX, RAY - 28, 8 + p * 14, GOLD_VFX, -p * 8);
  }
  // Phase II (24..43): Colossal 7-Color Thất Linh Tâm Ấn Supernova Collision!
  else if (f < 44) {
    const p = (f - 24) / 19;
    const swell = Math.sin(p * Math.PI);
    drawGroundVortex(back, RAX, RAY + 1, 20 + swell * 38, 7 + swell * 12, GOLD_VFX, p * 12, true);
    drawVolumetricPlume(back, RAX, RAY - 30, 28 + swell * 22, 26 + swell * 18, FORMS[0].vIdx, 1.05, f);
    drawVolumetricPlume(mid, RAX, RAY - 30, 18 + swell * 16, 18 + swell * 14, GOLD_VFX, 1.1, f + 9);

    // Giant Golden Thất Linh Tâm Ấn Mandala Ring + 7 Orbiting Star Gems!
    const ringR = 16 + swell * 24;
    drawRing(front, RAX, RAY - 30, ringR, ringR * 0.78, C.gold3, C.white);
    for (let g = 0; g < 7; g++) {
      const ga = -p * TAU * 1.5 + (g / 7) * TAU;
      const gx = RAX + Math.cos(ga) * ringR * 0.9;
      const gy = RAY - 30 + Math.sin(ga) * ringR * 0.9;
      drawStarFlare(front, gx, gy, 6.5 + swell * 3.5, [C.pants1, GEM_RING[g], GEM_RING[g], C.gold4, C.white], ga);
    }

    if (p > 0.35) {
      drawCanonicalThienVu(mid, FORMS[0], 'S', {
        dx: RAX - AX, dy: RAY - AY,
        lift: 14 * (1 - (p - 0.35) / 0.65) + 6, raiseLeft: 1.0, armAngle: -1.2, rimGlow: 1.0, phase: p * TAU * 2
      });
    }
  }
  // Phase III (44..63): Sovereign Descent of Thiên Vũ Nguyên Bản with 7 Orbiting Gems & Thất Linh Tâm Ấn!
  else {
    const p = (f - 44) / 19;
    drawGroundVortex(back, RAX, RAY + 2, 46 * (1 - p * 0.45), 14 * (1 - p * 0.45), FORMS[0].vIdx, p * 6, p < 0.6);
    if (p < 0.7) {
      drawVolumetricCrescent(back, RAX, RAY - 22, -Math.PI * 0.5, 24 + p * 26, 8 * (1 - p), GOLD_VFX, p * 0.85, Math.PI, f);
    }
    const pts = drawCanonicalThienVu(mid, FORMS[0], p > 0.55 ? 'E' : 'S', {
      dx: RAX - AX, dy: RAY - AY,
      lift: (1 - p) * 8, raiseLeft: (1 - p) * 0.75, armAngle: -0.75 + p * 1.0, rimGlow: 0.95 - p * 0.45, phase: p * TAU * 2
    });
    for (let g = 0; g < 7; g++) {
      const ga = p * TAU + (g / 7) * TAU;
      const ox = pts.chestX + Math.cos(ga) * (26 - p * 7);
      const oy = pts.chestY - 2 + Math.sin(ga) * (14 - p * 4);
      const target = Math.sin(ga) < 0 ? back : front;
      polyTri(target, ox, oy - 4, ox - 2.8, oy, ox + 2.8, oy, GEM_RING[g]);
      polyTri(target, ox, oy + 4, ox - 2.8, oy, ox + 2.8, oy, GEM_RING[g]);
      pset(target, ox - 0.5, oy - 1, C.white);
    }
  }

  for (let i = 0; i < RCW * RCH; i++) {
    if (back.d[i]) out.d[i] = back.d[i];
    if (mid.d[i]) out.d[i] = mid.d[i];
    if (front.d[i]) out.d[i] = front.d[i];
  }
  return out;
}

if (require.main === module) {
  console.log('Generating 372 Sakuga Ritual Frames (Biến Hình 128f + Phân Thân 3/5/7 180f + Hợp Nhất 64f)...');
  const t0 = Date.now();
  const SW = RCOLS * RCW, SH = RROWS * RCH;
  const sheet = Buffer.alloc(SW * SH, 0);
  const allFrames = [];

  // 0..127: 8 Forms x 16f Biến Hình
  for (let formIdx = 0; formIdx < 8; formIdx++) {
    for (let f = 0; f < 16; f++) allFrames.push(renderTransformRitualFrame(formIdx, f));
  }
  // 128..307: Phân Thân 3 (60f), 5 (60f), 7 (60f)
  for (const count of [3, 5, 7]) {
    for (let f = 0; f < 60; f++) allFrames.push(renderSplitRitualFrame(count, f));
  }
  // 308..371: Hợp Nhất / Quy Nguyên (64f)
  for (let f = 0; f < 64; f++) allFrames.push(renderMergeRitualFrame(f));

  if (allFrames.length !== TOTAL_FRAMES) throw new Error('Expected 372 frames, got ' + allFrames.length);

  for (let idx = 0; idx < TOTAL_FRAMES; idx++) {
    blitIndexed(sheet, SW, allFrames[idx], (idx % RCOLS) * RCW, Math.floor(idx / RCOLS) * RCH, 1);
  }

  const outPath = path.join(ASSETS, 'thienvu-rituals.png');
  fs.writeFileSync(outPath, encodeIndexedPNG(SW, SH, sheet));
  console.log(`Saved assets/thienvu-rituals.png (${SW}x${SH}, ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);

  // Generate 5x4 Keyframe Showcase Poster in Artifact Dir (`thienvu_rituals_showcase.png`)
  if (fs.existsSync(ARTIFACT_DIR)) {
    const picks = [
      // Row 0: Biến Hình highlights (Lôi, Phong, Hỏa, Băng)
      1 * 16 + 2, 1 * 16 + 8, 4 * 16 + 12, 5 * 16 + 13,
      // Row 1: Phân Thân 3 (Tam Linh: Lôi - Phong - Thổ)
      128 + 10, 128 + 24, 128 + 44, 128 + 54,
      // Row 2: Phân Thân 5 (Ngũ Linh)
      188 + 12, 188 + 26, 188 + 44, 188 + 54,
      // Row 3: Phân Thân 7 (Thất Linh Hợp Trận!)
      248 + 12, 248 + 26, 248 + 44, 248 + 54,
      // Row 4: Hợp Nhất / Quy Nguyên (64f)
      308 + 10, 308 + 28, 308 + 36, 308 + 56
    ];
    const PC = 4, PR = 5, SCALE = 2;
    const poster = Buffer.alloc((PC * RCW * SCALE) * (PR * RCH * SCALE), C.ink);
    picks.forEach((fIdx, i) => {
      blitIndexed(poster, PC * RCW * SCALE, allFrames[fIdx], (i % PC) * RCW * SCALE, Math.floor(i / PC) * RCH * SCALE, SCALE);
    });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'thienvu_rituals_showcase.png'), encodeIndexedPNG(PC * RCW * SCALE, PR * RCH * SCALE, poster));
    console.log('Saved thienvu_rituals_showcase.png in', ((Date.now() - t0) / 1000).toFixed(2) + 's');
  }
}
