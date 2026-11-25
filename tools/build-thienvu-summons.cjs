'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {
  PAL_LIST, PAL_RGB, C, FORMS,
  colIdx, encodeIndexedPNG, makeBuf, pset, rect, disc, capsule, polyTri, outlineBuf, drawRing, drawBlossom,
  drawVolumetricPlume, drawGroundVortex, drawVolumetricCrescent, drawVolumetricSpire,
  drawVolumetricTornado, drawStarFlare, drawVolumetricVine, blitIndexed
} = require('./build-thienvu-300.cjs');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const ARTIFACT_DIR = path.join(ROOT, 'runtime', 'thienvu-art');
const TAU = Math.PI * 2;

// Golem Cell: 120x108 (renders at unit=2 -> 240x216 screen px!)
const GW = 120, GH = 108, GX = 60, GY = 90, GCOLS = 30, GROWS = 31; // Rows 0..29 = 900f (3 views x 300f), Row 30 = 30f flying magma boulder!
// Tree Spirit Cell: 96x92 (renders at unit=2 -> 192x184 screen px!)
const TW = 96, TH = 92, TX = 48, TY = 78, TCOLS = 30, TROWS = 30;   // 900f (3 views x 300f) per species!

const EARTH_VFX  = [colIdx('#29160a'), colIdx('#4f2c14'), colIdx('#cc2418'), colIdx('#ff5917'), colIdx('#ff9c24'), colIdx('#ffe866'), C.white];
const OAK_VFX    = [colIdx('#0c2e17'), colIdx('#195c2d'), colIdx('#2d9948'), colIdx('#59d66f'), C.pink, colIdx('#a6faad'), C.white];
const BAMBOO_VFX = [colIdx('#0d3b38'), colIdx('#196e67'), colIdx('#2ba89c'), colIdx('#5ce0d0'), colIdx('#a6faad'), colIdx('#b8fff6'), C.white];
const BANYAN_VFX = [colIdx('#0c2e17'), colIdx('#195c2d'), colIdx('#2d9948'), C.gold2, colIdx('#59d66f'), C.gold4, C.white];

const ROCK = {
  dark: colIdx('#29160a'),
  mid:  colIdx('#4f2c14'),
  warm: colIdx('#824b22'),
  ochre:colIdx('#bd7433'),
  sand: colIdx('#f0a346'),
  lava0:colIdx('#851310'),
  lava1:colIdx('#cc2418'),
  lava2:colIdx('#ff5917'),
  lava3:colIdx('#ff9c24'),
  lava4:colIdx('#ffe866')
};

const WOOD = {
  bark0: colIdx('#29160a'),
  bark1: colIdx('#4f2c14'),
  bark2: colIdx('#824b22'),
  bark3: colIdx('#bd7433'),
  leaf0: colIdx('#0c2e17'),
  leaf1: colIdx('#195c2d'),
  leaf2: colIdx('#2d9948'),
  leaf3: colIdx('#59d66f'),
  leaf4: colIdx('#a6faad'),
  jade0: colIdx('#0d3b38'),
  jade1: colIdx('#196e67'),
  jade2: colIdx('#2ba89c'),
  jade3: colIdx('#5ce0d0'),
  jade4: colIdx('#b8fff6')
};

function drawDiamondPlate(b, cx, cy, rx, ry, fillCol, rimCol) {
  polyTri(b, cx, cy - ry, cx - rx, cy, cx + rx, cy, rimCol);
  polyTri(b, cx, cy + ry, cx - rx, cy, cx + rx, cy, fillCol);
  polyTri(b, cx, cy - ry * 0.65, cx - rx * 0.65, cy, cx + rx * 0.65, cy, fillCol);
}

// ============================================================================
// PART 1: NGƯỜI KHỔNG LỒ ĐẤT (THÁI SƠN NHAM CỰ NHÂN — 300 FRAMES x 3 VIEWS!)
// ============================================================================
function drawVolcanicBoulder(b, cx, cy, rad, rot, glow = 1) {
  drawVolumetricPlume(b, cx, cy, rad * 1.45, rad * 1.35, EARTH_VFX, 0.88 * glow, Math.round(rot * 9), rot);
  const rockBuf = makeBuf(b.w, b.h);
  const pts = [];
  for (let i = 0; i < 7; i++) {
    const a = rot + (i / 7) * TAU;
    const rr = rad * (i % 2 === 0 ? 1.05 : 0.84);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  for (let i = 0; i < 7; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % 7];
    polyTri(rockBuf, cx, cy, x0, y0, x1, y1, i < 3 ? ROCK.ochre : i < 5 ? ROCK.warm : ROCK.mid);
  }
  // Glowing molten magma veins across boulder!
  capsule(rockBuf, cx - Math.cos(rot) * rad * 0.65, cy - Math.sin(rot) * rad * 0.65, cx + Math.cos(rot) * rad * 0.65, cy + Math.sin(rot) * rad * 0.65, 1.4, 1.1, ROCK.lava2);
  capsule(rockBuf, cx - Math.sin(rot) * rad * 0.5, cy + Math.cos(rot) * rad * 0.5, cx + Math.sin(rot) * rad * 0.5, cy - Math.cos(rot) * rad * 0.5, 1.1, 0.9, ROCK.lava4);
  disc(rockBuf, cx, cy, rad * 0.24, C.white);
  outlineBuf(rockBuf, C.ink, C.gold3, 0.7);
  for (let i = 0; i < b.d.length; i++) if (rockBuf.d[i]) b.d[i] = rockBuf.d[i];
}

function drawColossusArm(b, shX, shY, handX, handY, fistAngle, scale = 1, coreHeat = 1) {
  const elbX = (shX + handX) * 0.5 + (shY - handY) * 0.14;
  const elbY = (shY + handY) * 0.5 - Math.abs(handX - shX) * 0.10;
  // Upper stone bicep + magma joint
  capsule(b, shX, shY, elbX, elbY, 5.6 * scale, 4.8 * scale, ROCK.mid);
  capsule(b, shX, shY - 1, elbX, elbY - 1, 3.8 * scale, 3.2 * scale, ROCK.warm);
  disc(b, elbX, elbY, 3.4 * scale, ROCK.lava2);
  // Massive polygonal forearm + golden cuff
  capsule(b, elbX, elbY, handX, handY, 5.5 * scale, 7.2 * scale, ROCK.mid);
  capsule(b, elbX + 1, elbY - 1, handX + 1, handY - 1, 3.8 * scale, 5.2 * scale, ROCK.ochre);
  // Colossal 4-clawed Basalt-Gold Crusher Fist!
  const ca = Math.cos(fistAngle), sa = Math.sin(fistAngle), nx = -sa, ny = ca;
  polyTri(b, handX - ca * 4 * scale - nx * 7.5 * scale, handY - sa * 4 * scale - ny * 7.5 * scale,
             handX - ca * 4 * scale + nx * 7.5 * scale, handY - sa * 4 * scale + ny * 7.5 * scale,
             handX + ca * 8.5 * scale, handY + sa * 8.5 * scale, ROCK.warm);
  polyTri(b, handX - ca * 2 * scale - nx * 5.5 * scale, handY - sa * 2 * scale - ny * 5.5 * scale,
             handX - ca * 2 * scale + nx * 5.5 * scale, handY - sa * 2 * scale + ny * 5.5 * scale,
             handX + ca * 7.5 * scale, handY + sa * 7.5 * scale, ROCK.ochre);
  for (let k = -1.5; k <= 1.5; k += 1) {
    const kx = handX + ca * 6.0 * scale + nx * k * 3.6 * scale;
    const ky = handY + sa * 6.0 * scale + ny * k * 3.6 * scale;
    polyTri(b, kx - nx * 1.6 * scale, ky - ny * 1.6 * scale, kx + ca * 5.5 * scale, ky + sa * 5.5 * scale, kx + nx * 1.6 * scale, ky + ny * 1.6 * scale, k < 0 ? C.gold2 : C.gold3);
  }
  // Glowing magma vein & core on gauntlet back!
  capsule(b, elbX, elbY, handX + ca * 3 * scale, handY + sa * 3 * scale, 1.3 * scale, 1.1 * scale, coreHeat > 0.6 ? ROCK.lava3 : ROCK.lava2);
  disc(b, handX + ca * 1.5 * scale, handY + sa * 1.5 * scale, 2.5 * scale, ROCK.lava4);
  pset(b, handX + ca * 1.5 * scale, handY + sa * 1.5 * scale, C.white);
}

function drawSacredVine(b, x0, y0, x1, y1, waveAmp, vIdx, phase, tipAccent) {
  const steps = 15, dx = x1 - x0, dy = y1 - y0, len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len, ny = dx / len;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, w = Math.sin(u * Math.PI * 2.5 - phase * 3) * waveAmp * Math.sin(u * Math.PI);
    const vx = x0 + dx * u + nx * w, vy = y0 + dy * u + ny * w, r = (1 - u * 0.5) * 3.8 + 1.1;
    disc(b, vx, vy + 1, r, vIdx[0]);
    disc(b, vx, vy, r * 0.85, vIdx[2]);
    disc(b, vx - 0.6, vy - 0.7, r * 0.45, vIdx[5]);
    if (i > 2 && i % 3 === 0) {
      const side = (i % 6 === 0) ? 1 : -1;
      polyTri(b, vx, vy, vx + nx * side * 6.5 + dx * 0.06, vy + ny * side * 6.5 + dy * 0.06, vx + dx * 0.08, vy + dy * 0.08, i % 6 === 0 ? tipAccent : vIdx[5]);
    }
  }
  drawVolumetricPlume(b, x1, y1, 5.8, 5.8, [vIdx[1], vIdx[2], tipAccent, vIdx[5], C.white], 1.0, Math.round(phase * 7));
}

function drawEarthGolem(charBuf, view, pose) {
  const bx = GX + (pose.dx || 0);
  const by = GY + (pose.dy || 0) - (pose.lift || 0);
  const crouch = pose.crouch || 0;
  const lean = view === 'E' ? (pose.lean || 0) : (pose.lean || 0) * 0.25;
  const phase = pose.phase || 0;
  const coreHeat = pose.coreHeat ?? 0.85;

  const hipX = bx + lean * 0.35, hipY = by - 22 + crouch;
  const chestX = hipX + lean * 0.65, chestY = hipY - 19 + crouch * 0.35;
  const headX = chestX + (view === 'E' ? 3.5 : 0), headY = chestY - 15;

  // 0. Floating Tectonic Back-Ring Runestones behind shoulders!
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI + (i / 4) * Math.PI + Math.sin(phase + i) * 0.08;
    const rx = chestX + Math.cos(a) * 26, ry = chestY - 6 + Math.sin(a) * 16;
    drawDiamondPlate(charBuf, rx, ry, 3.4, 5.0, ROCK.warm, i % 2 === 0 ? C.gold3 : ROCK.lava3);
  }

  // 1. Wide-Stanced Separated Stone Pillar Legs + Golden Diamond Knee-Shields!
  for (const [legIdx, side] of [-1, 1].entries()) {
    const baseSpread = view === 'E' ? (legIdx === 0 ? -6.5 : 6.5) : side * 11.5;
    const lx = hipX + baseSpread * 0.75;
    let fx = hipX + baseSpread, fy = by;
    if (pose.stride !== null && pose.stride !== undefined) {
      const ph = pose.stride + (legIdx === 1 ? Math.PI : 0);
      if (view === 'E') { fx = lx + Math.sin(ph) * 11; fy = by - Math.max(0, Math.cos(ph) * 6.5); }
      else { fx = hipX + baseSpread + side * 1.2; fy = by - Math.max(0, Math.sin(ph) * 6.5); }
    }
    if (legIdx === 1 && pose.stompLift > 0) {
      fy -= pose.stompLift;
      fx += view === 'E' ? 7 : 3;
    }
    const kx = (lx + fx) * 0.5 + (view === 'E' ? 2.0 : side * 1.2), ky = (hipY + fy) * 0.5;
    const darkLeg = (view === 'E' && legIdx === 0);
    // Angular stone thigh + massive faceted crag greave!
    capsule(charBuf, lx, hipY - 2, kx, ky, 5.2, 4.8, darkLeg ? ROCK.dark : ROCK.mid);
    polyTri(charBuf, kx - 6.5, ky, kx + 6.5, ky, fx - 7, fy - 2, darkLeg ? ROCK.dark : ROCK.mid);
    polyTri(charBuf, kx + 6.5, ky, fx + 7.5, fy - 2, fx - 4, fy - 2, darkLeg ? ROCK.mid : ROCK.warm);
    polyTri(charBuf, kx - 2, ky + 1, fx + 5, fy - 3, fx - 1, fy - 3, darkLeg ? ROCK.warm : ROCK.ochre);
    // Magma shin crack + Canonical Golden Diamond Knee Shield!
    capsule(charBuf, kx, ky + 2, fx, fy - 4, 0.9, 0.8, ROCK.lava2);
    drawDiamondPlate(charBuf, kx, ky, 5.2, 5.2, C.gold2, C.gold3);
    pset(charBuf, kx, ky, ROCK.lava4);
    // Clawed Stone Titan Foot!
    rect(charBuf, fx - 6.5, fy - 4, view === 'E' ? 14 : 13, 4, ROCK.dark);
    for (const cOff of [-4, 0, 4]) polyTri(charBuf, fx + cOff - 1.8, fy, fx + cOff + (view === 'E' ? 2 : 0), fy - 4.5, fx + cOff + 1.8, fy, C.gold2);
  }

  const lShX = chestX + (view === 'E' ? -6 : -20), lShY = chestY - 4;
  const rShX = chestX + (view === 'E' ?  6 :  20), rShY = chestY - 4;
  const lHandX = pose.lHandX ?? (lShX + Math.cos(pose.lArmA ?? 2.02) * 20);
  const lHandY = pose.lHandY ?? (lShY + Math.sin(pose.lArmA ?? 2.02) * 20);
  const rHandX = pose.rHandX ?? (rShX + Math.cos(pose.rArmA ?? 1.12) * 20);
  const rHandY = pose.rHandY ?? (rShY + Math.sin(pose.rArmA ?? 1.12) * 20);

  if (view === 'E') {
    drawColossusArm(charBuf, lShX, lShY, lHandX, lHandY, pose.lFistA ?? (pose.lArmA ?? 0.4), 0.90, coreHeat);
  }

  // 2. Angular Faceted Boulder-Chest + Narrowed Tectonic Waist (NO smooth brown bean!)
  const cw = view === 'E' ? 13 : 19, ww = view === 'E' ? 7.5 : 10.5;
  // Narrowed magma-veined waist pillar + Pelvis Crag Guard
  polyTri(charBuf, hipX - ww, hipY - 5, hipX + ww, hipY - 5, hipX, hipY + 4, ROCK.dark);
  rect(charBuf, hipX - ww, hipY - 5, ww * 2, 4, C.gold1);
  drawDiamondPlate(charBuf, hipX + (view === 'E' ? 3 : 0), hipY - 3, 4.4, 4.4, C.gold3, C.gold4);

  // Broad Polygonal Basalt Chest Armor!
  polyTri(charBuf, chestX - cw, chestY - 8, chestX + cw, chestY - 8, hipX - ww, hipY - 4, ROCK.dark);
  polyTri(charBuf, chestX + cw, chestY - 8, hipX + ww, hipY - 4, hipX - ww, hipY - 4, ROCK.mid);
  polyTri(charBuf, chestX - cw * 0.82, chestY - 7, chestX + cw * 0.88, chestY - 7, hipX + (view === 'E' ? 2 : 0), hipY - 4, ROCK.warm);
  // Beveled Stone Pectoral Plates
  polyTri(charBuf, chestX - cw * 0.75, chestY - 7, chestX - 1, chestY - 7, chestX - 2, chestY + 1, ROCK.ochre);
  polyTri(charBuf, chestX + 1, chestY - 7, chestX + cw * 0.82, chestY - 7, chestX + 3, chestY + 1, ROCK.ochre);

  if (view !== 'N') {
    const cx = chestX + (view === 'E' ? 4.5 : 0), cy = chestY + 1;
    // Roaring Molten Magma Furnace Core (`Thái Sơn Tâm Hạch`) + Glowing Rib Cracks + 4 Diamond Runestones!
    capsule(charBuf, cx - 7, cy - 2, cx + 7, cy - 2, 1.2, 1.2, ROCK.lava2);
    capsule(charBuf, cx - 5, cy + 3, cx + 5, cy + 3, 1.0, 1.0, ROCK.lava2);
    disc(charBuf, cx, cy, 6.2, ROCK.lava0);
    disc(charBuf, cx, cy, 4.6, ROCK.lava2);
    disc(charBuf, cx, cy, 3.0, coreHeat > 0.8 ? C.white : ROCK.lava4);
    for (const [dx, dy] of [[-7, -4], [7, -4], [-7.5, 4], [7.5, 4]]) {
      if (view === 'E' && dx < -4) continue;
      drawDiamondPlate(charBuf, cx + dx * (view === 'E' ? 0.68 : 1), cy + dy, 3.6, 3.6, ROCK.ochre, C.gold3);
    }
  } else {
    for (let s = 0; s < 3; s++) {
      drawDiamondPlate(charBuf, chestX, chestY - 5 + s * 5, 6.0 - s, 3.8, ROCK.ochre, ROCK.lava3);
    }
  }

  // 3. Towering Jagged Mountain-Peak Shoulder Pauldrons!
  for (const side of (view === 'E' ? [-1, 1] : [-1, 1])) {
    if (view === 'E' && side < 0) continue;
    const px = chestX + (view === 'E' ? -3 : side * 18), py = chestY - 6;
    polyTri(charBuf, px - 9, py + 4, px + (view === 'E' ? -5 : side * 9), py - 13, px + 8, py + 4, ROCK.mid);
    polyTri(charBuf, px - 6, py + 3, px + (view === 'E' ? -3 : side * 7), py - 12, px + 5, py + 3, ROCK.ochre);
    capsule(charBuf, px - 7, py + 3, px + 7, py + 3, 1.5, 1.5, C.gold3);
    capsule(charBuf, px, py + 1, px + (view === 'E' ? -2 : side * 4), py - 8, 1.0, 0.8, ROCK.lava3);
  }

  // 4. Fierce Carved `Sơn Thần` Stone Visage + Horned Crown + Blazing Magma Eyes!
  polyTri(charBuf, headX - 9, headY - 5, headX + 9, headY - 5, headX, headY + 8, ROCK.dark);
  rect(charBuf, headX - 8, headY - 5, 16, 11, ROCK.mid);
  rect(charBuf, headX - 7, headY - 4, 14, 8, ROCK.warm);
  // Canonical Jade-Gold Crown Band + Twin Stone Horns + Center Sun-Peak!
  rect(charBuf, headX - 9.5, headY - 6, 19, 3, colIdx('#2ba89c'));
  rect(charBuf, headX - 9.5, headY - 7, 19, 1.5, C.gold3);
  polyTri(charBuf, headX - 9, headY - 6, headX - 12, headY - 13, headX - 5, headY - 7, ROCK.ochre);
  polyTri(charBuf, headX + 9, headY - 6, headX + 12, headY - 13, headX + 5, headY - 7, ROCK.ochre);
  polyTri(charBuf, headX - 3.5, headY - 7, headX, headY - 14, headX + 3.5, headY - 7, C.gold3);
  if (view === 'S') {
    // Furrowed V-brow + glowing magma eyes + golden tusks!
    capsule(charBuf, headX - 6, headY - 2, headX - 1, headY - 1, 0.9, 0.9, ROCK.dark);
    capsule(charBuf, headX + 6, headY - 2, headX + 1, headY - 1, 0.9, 0.9, ROCK.dark);
    rect(charBuf, headX - 5, headY, 3, 2, ROCK.lava4);
    rect(charBuf, headX + 2, headY, 3, 2, ROCK.lava4);
    pset(charBuf, headX - 4, headY, C.white); pset(charBuf, headX + 3, headY, C.white);
    rect(charBuf, headX - 6, headY + 4, 12, 3, ROCK.dark);
    polyTri(charBuf, headX - 5, headY + 6, headX - 4, headY + 2, headX - 2, headY + 6, C.gold3);
    polyTri(charBuf, headX + 5, headY + 6, headX + 4, headY + 2, headX + 2, headY + 6, C.gold3);
  } else if (view === 'E') {
    rect(charBuf, headX + 3, headY, 4, 2, ROCK.lava4);
    pset(charBuf, headX + 5, headY, C.white);
    rect(charBuf, headX + 1, headY + 4, 8, 3, ROCK.dark);
    polyTri(charBuf, headX + 5, headY + 6, headX + 7, headY + 2, headX + 8, headY + 6, C.gold3);
  }

  // 5. Foreground Colossus Arms!
  if (view !== 'E') {
    drawColossusArm(charBuf, lShX, lShY, lHandX, lHandY, pose.lFistA ?? (pose.lArmA ?? 2.02), 1.0, coreHeat);
  }
  drawColossusArm(charBuf, rShX, rShY, rHandX, rHandY, pose.rFistA ?? (pose.rArmA ?? 1.12), 1.0, coreHeat);

  outlineBuf(charBuf, C.ink, ROCK.lava3, pose.rimGlow || 0.25);
  return { bx, by, hipX, hipY, chestX, chestY, headX, headY, lHandX, lHandY, rHandX, rHandY };
}

function renderGolemFrame(view, idx) {
  const out = makeBuf(GW, GH);
  const back = makeBuf(GW, GH);
  const mid = makeBuf(GW, GH);
  const front = makeBuf(GW, GH);
  const aimSign = view === 'E' ? 1 : 0;
  const aimA = view === 'E' ? 0 : (view === 'S' ? Math.PI * 0.5 : -Math.PI * 0.5);

  disc(out, GX, GY + 3, 22, C.ink);

  // 1. SPAWN (0..35 = 36f): Phá Đất Trỗi Dậy!
  if (idx < 36) {
    const u = idx / 35;
    drawGroundVortex(back, GX, GY + 2, 18 + u * 34, 6 + u * 10, EARTH_VFX, u * 8, u > 0.2);
    if (u < 0.48) {
      const p = u / 0.48;
      // Swirling magma core + 6 levitating basalt boulders assembling from chasm!
      drawStarFlare(mid, GX, GY - 12 - p * 26, 10 + p * 10, EARTH_VFX, p * 6);
      for (let i = 0; i < 6; i++) {
        const a = p * TAU * 1.4 + (i / 6) * TAU;
        const rx = GX + Math.cos(a) * (36 * (1 - p * 0.72));
        const ry = GY - 6 - p * 32 + Math.sin(a) * 14;
        drawVolcanicBoulder(Math.sin(a) < 0 ? back : front, rx, ry, 6.5, a, 1.0);
      }
    } else {
      const p = (u - 0.48) / 0.52;
      const slam = Math.sin(p * Math.PI);
      for (let s = -1; s <= 1; s += 2) {
        drawVolumetricSpire(back, GX + s * (26 + p * 10), GY + 2, 9, 34 * (1 - p * 0.45), s * 4, EARTH_VFX, false);
      }
      drawEarthGolem(mid, view, {
        lift: (1 - Math.min(1, p * 1.6)) * 16,
        crouch: p > 0.6 ? (1 - p) * 5 : 0,
        lArmA: -2.1 + p * 0.8, rArmA: -1.0 + p * 0.8,
        coreHeat: 1.0, rimGlow: 0.95 - p * 0.5, phase: u * TAU * 2
      });
      if (p > 0.45) drawVolumetricCrescent(front, GX, GY - 18, -Math.PI * 0.5, 26 + p * 22, 8 * (1 - p * 0.5), EARTH_VFX, p * 0.75, Math.PI, idx);
    }
  }
  // 2. IDLE (36..71 = 36f): Trấn Nhạc Thở Rền!
  else if (idx < 72) {
    const u = (idx - 36) / 36, phase = u * TAU * 2;
    const pts = drawEarthGolem(mid, view, {
      dy: Math.sin(phase) * 1.6,
      lArmA: view === 'E' ? 1.0 : 2.15 + Math.sin(phase) * 0.08,
      rArmA: view === 'E' ? 0.55 + Math.sin(phase) * 0.1 : 0.98 - Math.sin(phase) * 0.08,
      coreHeat: 0.75 + Math.sin(phase) * 0.25, phase
    });
    // Steaming shoulder magma plumes + orbiting pebbles!
    drawVolumetricPlume(back, pts.chestX - 16, pts.chestY - 14, 6, 8, EARTH_VFX, 0.72, idx);
    drawVolumetricPlume(back, pts.chestX + 16, pts.chestY - 14, 6, 8, EARTH_VFX, 0.72, idx + 4);
    for (let i = 0; i < 3; i++) {
      const a = phase + (i * TAU) / 3;
      const ox = pts.chestX + Math.cos(a) * 32, oy = pts.hipY + Math.sin(a) * 11;
      drawDiamondPlate(Math.sin(a) < 0 ? back : front, ox, oy, 3.0, 4.0, ROCK.ochre, ROCK.lava3);
    }
  }
  // 3. WALK (72..107 = 36f): Địa Chấn Hành Quân!
  else if (idx < 108) {
    const u = (idx - 72) / 36, phase = u * TAU * 2;
    const stompShock = Math.pow(Math.abs(Math.cos(phase)), 4);
    drawEarthGolem(mid, view, {
      dy: -Math.abs(Math.sin(phase)) * 3.5,
      lean: 5.5, stride: phase,
      lArmA: (view === 'E' ? 0.5 : 2.0) - Math.sin(phase) * 0.45,
      rArmA: (view === 'E' ? 0.5 : 1.1) + Math.sin(phase) * 0.45,
      coreHeat: 0.85, phase
    });
    if (stompShock > 0.55) {
      drawGroundVortex(back, GX, GY + 2, 24 * stompShock, 6 * stompShock, EARTH_VFX, phase, false);
    }
    drawVolumetricPlume(back, GX - aimSign * 14, GY - 2, 11, 5, EARTH_VFX, 0.75, idx);
  }
  // 4. PUNCH (108..147 = 40f): Thiết Quyền Phá Sơn!
  else if (idx < 148) {
    const u = (idx - 108) / 39;
    const windup = u < 0.28 ? u / 0.28 : 0;
    const strike = u >= 0.28 ? Math.min(1, (u - 0.28) / 0.26) : 0;
    const fade = Math.max(0, (u - 0.58) / 0.42);
    const punchReach = u < 0.28 ? (-12 * windup) : (-12 + strike * 34 - fade * 10);

    const pts = drawEarthGolem(mid, view, {
      dx: view === 'E' ? (-6 * windup + strike * 9 * (1 - fade * 0.5)) : 0,
      crouch: 2.5, lean: 7.5 * strike * (1 - fade * 0.4),
      lArmA: view === 'E' ? 2.3 : 2.4,
      rHandX: GX + (view === 'E' ? 8 + punchReach : 18 + strike * 4),
      rHandY: GY - 38 + (view === 'S' ? strike * 16 : view === 'N' ? -strike * 16 : 0),
      rFistA: aimA,
      coreHeat: 1.0, rimGlow: 0.65 + strike * 0.35, phase: u * TAU
    });

    if (u < 0.32) drawVolumetricPlume(front, pts.rHandX, pts.rHandY, 9 * windup + 3, 9 * windup + 3, EARTH_VFX, 1.0, idx);
    if (strike > 0.1) {
      const fx = pts.rHandX + Math.cos(aimA) * 10, fy = pts.rHandY + Math.sin(aimA) * 8;
      drawVolumetricCrescent(view === 'N' ? back : front, fx, fy, aimA, 18 + strike * 16, 10 * (1 - fade * 0.55), EARTH_VFX, fade * 0.85, 1.45, idx);
      drawVolumetricPlume(front, fx + Math.cos(aimA) * 8, fy + Math.sin(aimA) * 6, 12 * (1 - fade * 0.5), 11 * (1 - fade * 0.5), EARTH_VFX, 1.05 - fade * 0.5, idx + 3);
    }
  }
  // 5. SMASH (148..195 = 48f): Song Chùy Thiên Thạch!
  else if (idx < 196) {
    const u = (idx - 148) / 47;
    const raise = u < 0.36 ? Math.sin((u / 0.36) * Math.PI * 0.5) : 1;
    const slam = u >= 0.36 ? Math.min(1, (u - 0.36) / 0.18) : 0;
    const erupt = u >= 0.44 ? (u - 0.44) / 0.56 : 0;

    const handY = u < 0.36 ? (GY - 38 - raise * 34) : (GY - 72 + slam * 62);
    const handSpread = view === 'E' ? 8 : (18 - raise * 5 + slam * 4);
    const pts = drawEarthGolem(mid, view, {
      lift: u < 0.36 ? raise * 8 : (1 - slam) * 8,
      crouch: slam * 5.5 * (1 - erupt * 0.4),
      lean: slam * 6,
      lHandX: GX + (view === 'E' ? 8 + slam * 14 : -handSpread), lHandY: handY,
      rHandX: GX + (view === 'E' ? 14 + slam * 16 : handSpread), rHandY: handY,
      lFistA: slam > 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5,
      rFistA: slam > 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5,
      coreHeat: 1.0, rimGlow: 0.95, phase: u * TAU * 2
    });

    if (u < 0.42) {
      drawVolumetricPlume(front, (pts.lHandX + pts.rHandX) * 0.5, handY - 6, 14 * raise + 4, 12 * raise + 4, EARTH_VFX, 1.1, idx);
    }
    if (slam > 0.65) {
      const impactX = GX + aimSign * 22;
      drawGroundVortex(back, impactX, GY + 3, 24 + erupt * 24, 7 + erupt * 5, EARTH_VFX, erupt * 8, true);
      for (let s = -1; s <= 1; s++) {
        const sx = impactX + (view === 'E' ? (s + 1) * 11 : s * 18);
        const h = (s === 0 ? 44 : 32) * Math.sin(Math.min(1, erupt * 1.4) * Math.PI * 0.85) * (1 - Math.max(0, erupt - 0.65));
        if (h > 3) drawVolumetricSpire(front, sx, GY + 3, 8.5, h, s * 3 + aimSign * 3, EARTH_VFX, false);
      }
    }
  }
  // 6. STOMP (196..243 = 48f): Bát Hoang Địa Chấn (360° AoE Stun)!
  else if (idx < 244) {
    const u = (idx - 196) / 47;
    const liftLeg = u < 0.34 ? Math.sin((u / 0.34) * Math.PI * 0.5) * 20 : (u < 0.46 ? (1 - (u - 0.34) / 0.12) * 20 : 0);
    const quake = u >= 0.44 ? (u - 0.44) / 0.56 : 0;

    drawEarthGolem(mid, view, {
      crouch: quake > 0 && quake < 0.5 ? 4 : 0,
      stompLift: liftLeg,
      lArmA: -2.3 + quake * 0.9, rArmA: -0.85 - quake * 0.9,
      coreHeat: 1.0, rimGlow: 1.0, phase: u * TAU * 2
    });

    if (quake > 0) {
      // 2 concentric volumetric seismic shockwaves + ring of stone fangs!
      drawGroundVortex(back, GX, GY + 2, 20 + quake * 36, 7 + quake * 10, EARTH_VFX, quake * 10, true);
      drawGroundVortex(front, GX, GY + 2, 10 + quake * 22, 4 + quake * 6, [C.gold1, C.gold3, C.gold4, C.white], -quake * 8, false);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.3;
        const rx = GX + Math.cos(a) * (18 + quake * 30), ry = GY + 2 + Math.sin(a) * (6 + quake * 9);
        const h = 22 * Math.sin(quake * Math.PI);
        if (h > 2) drawVolumetricSpire(Math.sin(a) < 0 ? back : front, rx, ry, 5.5, h, Math.cos(a) * 3, EARTH_VFX, false);
      }
    }
  }
  // 7. THROW (244..299 = 56f): Bạt Sơn Ném Đá!
  else {
    const u = (idx - 244) / 55;
    // 0..0.28: dig into earth; 0.28..0.62: hoist giant volcanic boulder overhead; 0.62..1.0: hurl forward with sonic boom!
    let lHx, lHy, rHx, rHy, crouch = 0, lean = 0, rockX = null, rockY = null, rockR = 13;
    if (u < 0.28) {
      const p = u / 0.28;
      crouch = p * 6;
      lHx = GX - (view === 'E' ? -6 : 14); lHy = GY - 34 + p * 26;
      rHx = GX + (view === 'E' ? 12 : 14); rHy = GY - 34 + p * 26;
      if (p > 0.45) { rockX = GX + aimSign * 8; rockY = GY - 4 - (p - 0.45) * 18; rockR = 8 + p * 6; }
      drawGroundVortex(back, GX + aimSign * 8, GY + 2, 18 * p + 6, 6, EARTH_VFX, p * 6, true);
    } else if (u < 0.62) {
      const p = (u - 0.28) / 0.34;
      crouch = (1 - p) * 5;
      const liftY = GY - 14 - Math.sin(p * Math.PI * 0.5) * 60;
      lHx = GX + (view === 'E' ? 2 : -13); lHy = liftY + 6;
      rHx = GX + (view === 'E' ? 8 :  13); rHy = liftY + 6;
      rockX = GX + (view === 'E' ? 5 : 0); rockY = liftY - 8; rockR = 14.5;
    } else {
      const p = (u - 0.62) / 0.38;
      lean = Math.sin(Math.min(1, p * 1.8) * Math.PI * 0.5) * 8;
      crouch = 2.5;
      lHx = GX + (view === 'E' ? -8 : -18); lHy = GY - 38;
      rHx = GX + (view === 'E' ? 24 : 16);  rHy = GY - 42 + (view === 'S' ? 10 : 0);
      if (p < 0.52) {
        const fly = p / 0.52;
        rockX = GX + Math.cos(aimA) * (10 + fly * 34);
        rockY = (GY - 68) + fly * 28 + Math.sin(aimA) * fly * 18;
        rockR = 14.5 * (1 - fly * 0.15);
      }
      drawVolumetricCrescent(front, GX + aimSign * 14, GY - 42, aimA, 18 + p * 20, 8 * (1 - p * 0.65), EARTH_VFX, p * 0.8, 1.35, idx);
    }

    drawEarthGolem(mid, view, {
      crouch, lean, lHandX: lHx, lHandY: lHy, rHandX: rHx, rHandY: rHy,
      lFistA: -Math.PI * 0.5, rFistA: u >= 0.62 ? aimA : -Math.PI * 0.5,
      coreHeat: 1.0, rimGlow: 0.9, phase: u * TAU * 2
    });
    if (rockX !== null) drawVolcanicBoulder(front, rockX, rockY, rockR, u * 8, 1.0);
  }

  for (let i = 0; i < GW * GH; i++) {
    if (back.d[i]) out.d[i] = back.d[i];
    if (mid.d[i]) out.d[i] = mid.d[i];
    if (front.d[i]) out.d[i] = front.d[i];
  }
  return out;
}

// ============================================================================
// PART 2: 3 SINH VẬT CÂY HỆ MỘC (3 SPECIES x 300 FRAMES x 3 VIEWS = 2,700 CELLS!)
//   1. oak    = Cổ Thụ Hoa Linh (Awakened 'tree')
//   2. bamboo = Thanh Trúc Kiếm Tinh (Awakened 'bamboo')
//   3. banyan = Cội Đa Thần Mộc (Awakened 'banyan')
// ============================================================================
const TREE_SPECIES = [
  { id: 'oak',    name: 'Cổ Thụ Hoa Linh',    prop: 'tree',   vfx: OAK_VFX,    eye: C.pink },
  { id: 'bamboo', name: 'Thanh Trúc Kiếm Tinh', prop: 'bamboo', vfx: BAMBOO_VFX, eye: colIdx('#b8fff6') },
  { id: 'banyan', name: 'Cội Đa Thần Mộc',    prop: 'banyan', vfx: BANYAN_VFX, eye: C.gold4 }
];

function drawTreeSpirit(charBuf, species, view, pose) {
  const bx = TX + (pose.dx || 0);
  const by = TY + (pose.dy || 0) - (pose.lift || 0);
  const crouch = pose.crouch || 0;
  const lean = view === 'E' ? (pose.lean || 0) : (pose.lean || 0) * 0.25;
  const phase = pose.phase || 0;
  const hipX = bx + lean * 0.35, hipY = by - 17 + crouch;
  const chestX = hipX + lean * 0.65, chestY = hipY - 14 + crouch * 0.3;
  const headX = chestX + (view === 'E' ? 1.5 : 0), headY = chestY - 12;

  const lShX = chestX + (view === 'E' ? -3 : -13), lShY = chestY - 3;
  const rShX = chestX + (view === 'E' ?  3 :  13), rShY = chestY - 3;
  const lAng = pose.lArmA ?? (view === 'E' ? 0.8 : 2.15);
  const rAng = pose.rArmA ?? (view === 'E' ? 0.35 : 0.98);
  const armReach = pose.armReach || 14;
  const lHandX = pose.lHandX ?? (lShX + Math.cos(lAng) * armReach);
  const lHandY = pose.lHandY ?? (lShY + Math.sin(lAng) * armReach);
  const rHandX = pose.rHandX ?? (rShX + Math.cos(rAng) * armReach);
  const rHandY = pose.rHandY ?? (rShY + Math.sin(rAng) * armReach);

  if (species.id === 'oak') {
    // --- SPECIES 1: CỔ THỤ HOA LINH (Ancient Blossom Elderwood Ent) ---
    disc(charBuf, headX - 8, headY - 6, 8.5, WOOD.leaf1);
    disc(charBuf, headX + 8, headY - 6, 8.5, WOOD.leaf1);
    disc(charBuf, headX, headY - 11, 10.5, WOOD.leaf2);
    disc(charBuf, headX + 2, headY - 12, 7.2, WOOD.leaf3);
    // Twin Wooden Deer-Antler Branches!
    capsule(charBuf, headX - 5, headY - 8, headX - 14, headY - 22, 1.8, 1.0, WOOD.bark2);
    capsule(charBuf, headX - 9, headY - 15, headX - 16, headY - 16, 1.2, 0.8, WOOD.bark3);
    capsule(charBuf, headX + 5, headY - 8, headX + 14, headY - 22, 1.8, 1.0, WOOD.bark3);
    capsule(charBuf, headX + 9, headY - 15, headX + 16, headY - 16, 1.2, 0.8, C.gold2);
    drawBlossom(charBuf, headX - 9, headY - 8, 2.8, C.pink, C.white);
    drawBlossom(charBuf, headX + 8, headY - 11, 2.8, C.pink, C.gold4);

    // Separated Gnarled Striding Root-Legs with 3 Wooden Talons!
    for (const [legIdx, side] of [-1, 1].entries()) {
      const spread = view === 'E' ? (legIdx === 0 ? -5.0 : 5.0) : side * 7.5;
      const lx = hipX + spread * 0.7;
      let fx = hipX + spread, fy = by;
      if (pose.stride != null) {
        const ph = pose.stride + (legIdx === 1 ? Math.PI : 0);
        if (view === 'E') { fx = lx + Math.sin(ph) * 9.5; fy = by - Math.max(0, Math.cos(ph) * 5.5); }
        else fy = by - Math.max(0, Math.sin(ph) * 5.5);
      }
      const kx = (lx + fx) * 0.5 + (view === 'E' ? 1.5 : side), ky = (hipY + fy) * 0.5;
      capsule(charBuf, lx, hipY - 2, kx, ky, 3.8, 3.4, legIdx === 0 ? WOOD.bark0 : WOOD.bark1);
      capsule(charBuf, kx, ky, fx, fy - 2, 3.6, 3.2, legIdx === 0 ? WOOD.bark1 : WOOD.bark2);
      polyTri(charBuf, fx - 5.5, fy, fx, fy - 4.5, fx + 6.5, fy, WOOD.bark1);
      pset(charBuf, fx + (view === 'E' ? 3 : 0), fy - 1, WOOD.leaf3);
    }

    // Angular Gnarled Bark V-Torso + Narrowed Root Waist + Glowing Emerald Heartwood Core!
    const cw = view === 'E' ? 9.5 : 13.5, ww = view === 'E' ? 5.2 : 7.0;
    polyTri(charBuf, chestX - cw, chestY - 5, chestX + cw, chestY - 5, hipX, hipY + 2, WOOD.bark0);
    polyTri(charBuf, chestX - cw * 0.85, chestY - 5, chestX + cw * 0.9, chestY - 5, hipX + 1, hipY - 1, WOOD.bark2);
    capsule(charBuf, hipX - ww, hipY - 3, hipX + ww, hipY - 3, 1.8, 1.8, WOOD.leaf2);
    // Leafy Shoulder Mantles + Pink Blossoms
    disc(charBuf, lShX, lShY - 2, 6.2, WOOD.leaf2);
    disc(charBuf, rShX, rShY - 2, 6.2, WOOD.leaf3);
    drawBlossom(charBuf, rShX + 2, rShY - 3, 2.5, C.pink, C.white);
    if (view !== 'N') {
      const cx = chestX + (view === 'E' ? 3 : 0), cy = chestY + 1;
      drawDiamondPlate(charBuf, cx, cy, 4.5, 5.5, WOOD.leaf2, WOOD.leaf4);
      pset(charBuf, cx, cy, C.white);
    }
    // Fierce Carved Wooden Mask + Jagged Bark Jaw!
    polyTri(charBuf, headX - 7, headY - 4, headX + 7, headY - 4, headX, headY + 7, WOOD.bark1);
    polyTri(charBuf, headX - 5.5, headY - 3, headX + 6, headY - 3, headX + 0.5, headY + 5, WOOD.bark2);
    if (view === 'S') {
      rect(charBuf, headX - 4, headY - 1, 2, 2, WOOD.leaf4); rect(charBuf, headX + 2, headY - 1, 2, 2, WOOD.leaf4);
      pset(charBuf, headX - 4, headY - 1, C.white); pset(charBuf, headX + 2, headY - 1, C.white);
    } else if (view === 'E') {
      rect(charBuf, headX + 2, headY - 1, 3, 2, WOOD.leaf4); pset(charBuf, headX + 3, headY - 1, C.white);
    }
    // Twin Bark-Claw Forearms + Spiked Briar-Vine Whips!
    for (const [sx, sy, hx, hy] of (view === 'E' ? [[lShX, lShY, lHandX, lHandY], [rShX, rShY, rHandX, rHandY]] : [[lShX, lShY, lHandX, lHandY], [rShX, rShY, rHandX, rHandY]])) {
      capsule(charBuf, sx, sy, (sx + hx) * 0.55, (sy + hy) * 0.55, 3.6, 3.0, WOOD.bark2);
      drawSacredVine(charBuf, (sx + hx) * 0.55, (sy + hy) * 0.55, hx, hy, 2.8, OAK_VFX, phase, C.pink);
    }
  }
  else if (species.id === 'bamboo') {
    // --- SPECIES 2: THANH TRÚC KIẾM TINH (Jade Bamboo Twin-Blade Sword Spirit) ---
    for (const [legIdx, side] of [-1, 1].entries()) {
      const spread = view === 'E' ? (legIdx === 0 ? -4.5 : 4.5) : side * 5.8;
      const lx = hipX + spread * 0.7;
      let fx = hipX + spread, fy = by;
      if (pose.stride != null) {
        const ph = pose.stride + (legIdx === 1 ? Math.PI : 0);
        if (view === 'E') { fx = lx + Math.sin(ph) * 10; fy = by - Math.max(0, Math.cos(ph) * 5.5); }
        else fy = by - Math.max(0, Math.sin(ph) * 5.5);
      }
      capsule(charBuf, lx, hipY - 2, fx, fy - 1, 3.0, 2.5, legIdx === 0 ? WOOD.jade1 : WOOD.jade2);
      capsule(charBuf, (lx + fx) * 0.5 - 2, (hipY + fy) * 0.5, (lx + fx) * 0.5 + 2, (hipY + fy) * 0.5, 1.1, 1.1, C.gold3);
    }

    // Sleek V-Tapered Segmented Jade Bamboo Armor + Golden Node Sash!
    polyTri(charBuf, chestX - (view === 'E' ? 7.5 : 10.5), chestY - 5, chestX + (view === 'E' ? 8.5 : 10.5), chestY - 5, hipX, hipY + 1, WOOD.jade1);
    capsule(charBuf, hipX + 1, hipY - 2, chestX + 1.5, chestY - 3, 4.2, 6.2, WOOD.jade2);
    capsule(charBuf, chestX + 2, chestY - 5, hipX + 2, hipY - 2, 1.6, 1.4, WOOD.jade3);
    rect(charBuf, hipX - 6.0, hipY - 4, 12, 2.5, C.gold2);
    rect(charBuf, chestX - 7.5, chestY + 1, 15, 2, C.gold3);
    if (view !== 'N') {
      polyTri(charBuf, hipX - 2, hipY - 2, hipX + 2, hipY - 2, hipX + Math.sin(phase * 2) * 3, by - 5, C.gold4);
    }
    for (const side of [-1, 1]) {
      const px = chestX + (view === 'E' ? -2 : side * 8), py = chestY - 4;
      polyTri(charBuf, px, py - 2, px + (view === 'E' ? -13 : side * 15), py - 9 + Math.sin(phase * 2 + side) * 2, px, py + 3, WOOD.leaf3);
      polyTri(charBuf, px, py, px + (view === 'E' ? -11 : side * 12), py - 3, px, py + 4, WOOD.jade3);
    }
    disc(charBuf, headX, headY + 1, 5.2, WOOD.jade0);
    if (view === 'S') {
      rect(charBuf, headX - 4, headY, 2, 2, WOOD.jade4); rect(charBuf, headX + 2, headY, 2, 2, WOOD.jade4);
      pset(charBuf, headX - 4, headY, C.white); pset(charBuf, headX + 2, headY, C.white);
    } else if (view === 'E') {
      rect(charBuf, headX + 2, headY, 3, 2, WOOD.jade4); pset(charBuf, headX + 3, headY, C.white);
    }
    polyTri(charBuf, headX - 14, headY - 2, headX, headY - 12, headX + 14, headY - 2, WOOD.jade2);
    polyTri(charBuf, headX - 10, headY - 3, headX, headY - 12, headX + 6, headY - 3, WOOD.leaf3);
    capsule(charBuf, headX - 13, headY - 2, headX + 13, headY - 2, 0.9, 0.9, C.gold3);
    polyTri(charBuf, headX - 2, headY - 11, headX, headY - 18, headX + 2, headY - 11, WOOD.jade4);

    for (const [sx, sy, hx, hy, ang] of [[lShX, lShY, lHandX, lHandY, lAng], [rShX, rShY, rHandX, rHandY, rAng]]) {
      capsule(charBuf, sx, sy, hx, hy, 2.6, 2.4, WOOD.jade2);
      disc(charBuf, hx, hy, 2.2, C.gold3);
      const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
      const tipX = hx + ca * 17, tipY = hy + sa * 17;
      polyTri(charBuf, hx + nx * 3.0, hy + ny * 3.0, tipX, tipY, hx - nx * 3.0, hy - ny * 3.0, WOOD.jade3);
      polyTri(charBuf, hx + nx * 2.4, hy + ny * 2.4, tipX, tipY, hx, hy, WOOD.jade4);
      capsule(charBuf, hx, hy, tipX, tipY, 0.8, 0.4, C.white);
    }
  }
  else {
    // --- SPECIES 3: CỘI ĐA THẦN MỘC (Sacred Ancient Banyan Lantern Guardian) ---
    disc(charBuf, headX - 12, headY - 6, 9.5, WOOD.leaf0);
    disc(charBuf, headX + 12, headY - 6, 9.5, WOOD.leaf0);
    disc(charBuf, headX - 6, headY - 10, 10.5, WOOD.leaf1);
    disc(charBuf, headX + 6, headY - 10, 10.5, WOOD.leaf2);
    disc(charBuf, headX, headY - 13, 9.5, WOOD.leaf3);
    for (const side of [-1, 1]) {
      const lx = headX + side * 14.5 + Math.sin(phase * 2 + side) * 1.5, ly = headY + 2;
      capsule(charBuf, headX + side * 13.5, headY - 4, lx, ly - 2, 0.7, 0.7, C.gold2);
      disc(charBuf, lx, ly, 3.0, C.gold3);
      disc(charBuf, lx, ly, 1.8, C.gold4);
      pset(charBuf, lx, ly, C.white);
    }
    // Splayed 4-Root Striding Banyan Base (wide, organic root arches — NOT a cylinder!)
    for (const rOff of [-9, -3, 3, 9]) {
      const rx0 = hipX + rOff * 0.55;
      const sw = pose.stride != null ? Math.sin(pose.stride + rOff * 0.6) * 5.5 : Math.sin(phase + rOff) * 1.2;
      const rx1 = hipX + rOff * 1.25 + (view === 'E' ? sw : 0);
      const ry1 = by - (pose.stride != null ? Math.max(0, Math.cos(pose.stride + rOff * 0.6) * 4.5) : 0);
      capsule(charBuf, rx0, hipY - 3, (rx0 + rx1) * 0.5 + (rOff < 0 ? -2 : 2), (hipY + ry1) * 0.5, 3.2, 2.6, rOff < 0 ? WOOD.bark0 : WOOD.bark1);
      capsule(charBuf, (rx0 + rx1) * 0.5 + (rOff < 0 ? -2 : 2), (hipY + ry1) * 0.5, rx1, ry1, 2.6, 2.0, WOOD.bark2);
    }

    // Broad Armored Banyan Upper Trunk + Tapered Root-Girdle Waist + Golden Shrine Ring!
    const cw = view === 'E' ? 11.5 : 15.5;
    polyTri(charBuf, chestX - cw, chestY - 5, chestX + cw, chestY - 5, hipX, hipY + 1, WOOD.bark0);
    polyTri(charBuf, chestX - cw * 0.82, chestY - 5, chestX + cw * 0.88, chestY - 5, hipX + 1, hipY - 1, WOOD.bark1);
    rect(charBuf, hipX - 7.5, hipY - 4, 15, 2.5, C.gold2);
    disc(charBuf, lShX, lShY - 1, 6.8, WOOD.leaf1);
    disc(charBuf, rShX, rShY - 1, 6.8, WOOD.leaf2);
    if (view !== 'N') {
      const cx = chestX + (view === 'E' ? 3.5 : 0), cy = chestY + 1;
      drawRing(charBuf, cx, cy, 5.2, 2.6, C.gold2, C.gold3);
      disc(charBuf, cx, cy, 2.2, C.gold4);
      pset(charBuf, cx, cy, C.white);
    }
    // Three-Eyed Horned Sacred Bark Mask!
    polyTri(charBuf, headX - 7.5, headY - 4, headX + 7.5, headY - 4, headX, headY + 7, WOOD.bark1);
    polyTri(charBuf, headX - 8, headY - 4, headX, headY - 11, headX + 8, headY - 4, C.gold2);
    if (view === 'S') {
      rect(charBuf, headX - 4, headY, 2, 2, C.gold4);
      rect(charBuf, headX + 2, headY, 2, 2, C.gold4);
      rect(charBuf, headX - 1, headY - 3, 2, 2, C.white);
    } else if (view === 'E') {
      rect(charBuf, headX + 2, headY, 3, 2, C.gold4);
      pset(charBuf, headX + 4, headY - 3, C.white);
    }
    // Sweeping Braided Golden-Emerald Aerial-Root Arms!
    for (const [sx, sy, hx, hy] of [[lShX, lShY, lHandX, lHandY], [rShX, rShY, rHandX, rHandY]]) {
      capsule(charBuf, sx, sy, (sx + hx) * 0.55, (sy + hy) * 0.55, 4.0, 3.2, WOOD.bark1);
      drawSacredVine(charBuf, (sx + hx) * 0.55, (sy + hy) * 0.55, hx, hy, 3.0, BANYAN_VFX, phase, C.gold3);
    }
  }

  outlineBuf(charBuf, C.ink, species.id === 'bamboo' ? WOOD.jade4 : species.id === 'banyan' ? C.gold3 : WOOD.leaf4, pose.rimGlow || 0.25);
  return { bx, by, hipX, hipY, chestX, chestY, headX, headY, lHandX, lHandY, rHandX, rHandY };
}

function renderTreeSpiritFrame(species, view, idx) {
  const out = makeBuf(TW, TH);
  const back = makeBuf(TW, TH);
  const mid = makeBuf(TW, TH);
  const front = makeBuf(TW, TH);
  const v = species.vfx;
  const aimSign = view === 'E' ? 1 : 0;
  const aimA = view === 'E' ? 0 : (view === 'S' ? Math.PI * 0.5 : -Math.PI * 0.5);

  disc(out, TX, TY + 2, 16, C.ink);

  // 1. SPAWN (0..35 = 36f): Thức Tỉnh Rừng Già!
  if (idx < 36) {
    const u = idx / 35;
    drawGroundVortex(back, TX, TY + 2, 14 + u * 26, 5 + u * 8, v, u * 8, u > 0.2);
    if (u < 0.42) {
      const p = u / 0.42;
      // Sprouting spirit seed / bamboo shoot / lantern root rising rapidly!
      if (species.id === 'bamboo') {
        drawVolumetricSpire(mid, TX, TY + 2, 7 + p * 4, 16 + p * 44, 0, v, true);
        drawVolumetricSpire(back, TX - 10, TY + 1, 5, 10 + p * 26, -3, v, true);
        drawVolumetricSpire(back, TX + 10, TY + 1, 5, 10 + p * 26, 3, v, true);
      } else {
        drawVolumetricTornado(mid, TX, TY + 2, 18 + p * 44, 7, 16 * p + 5, v, p * 6);
        drawStarFlare(front, TX, TY - 10 - p * 26, 8 + p * 8, v, p * 5);
      }
    } else {
      const p = (u - 0.42) / 0.58;
      drawTreeSpirit(mid, species, view, {
        lift: (1 - Math.min(1, p * 1.6)) * 12,
        lArmA: -2.2 + p * 1.1, rArmA: -0.9 + p * 1.1,
        rimGlow: 0.95 - p * 0.5, phase: u * TAU * 2
      });
      drawVolumetricCrescent(front, TX, TY - 22, -Math.PI * 0.5, 18 + p * 20, 7 * (1 - p * 0.55), v, p * 0.8, Math.PI, idx);
    }
  }
  // 2. IDLE (36..71 = 36f): Linh Mộc Hộ Pháp!
  else if (idx < 72) {
    const u = (idx - 36) / 36, phase = u * TAU * 2;
    const pts = drawTreeSpirit(mid, species, view, {
      dy: Math.sin(phase) * 1.4,
      lArmA: (view === 'E' ? 0.75 : 2.15) + Math.sin(phase) * 0.12,
      rArmA: (view === 'E' ? 0.25 : 0.95) - Math.sin(phase) * 0.12,
      phase
    });
    // Orbiting pink petals (Oak), razor leaves (Bamboo), or golden lantern fireflies (Banyan)!
    for (let i = 0; i < 4; i++) {
      const a = phase + (i * TAU) / 4;
      const ox = pts.chestX + Math.cos(a) * 24, oy = pts.chestY - 2 + Math.sin(a) * 12;
      const target = Math.sin(a) < 0 ? back : front;
      if (species.id === 'oak') drawBlossom(target, ox, oy, 2.4, C.pink, C.white);
      else if (species.id === 'bamboo') polyTri(target, ox - 3, oy, ox + 3, oy - 2, ox, oy + 2, WOOD.jade4);
      else { disc(target, ox, oy, 2.0, C.gold4); pset(target, ox, oy, C.white); }
    }
  }
  // 3. WALK (72..107 = 36f): Bách Mộc Hành Quân!
  else if (idx < 108) {
    const u = (idx - 72) / 36, phase = u * TAU * 2;
    drawTreeSpirit(mid, species, view, {
      dy: -Math.abs(Math.sin(phase)) * 3.0,
      lean: species.id === 'bamboo' ? 6.5 : 4.2,
      stride: phase,
      lArmA: (view === 'E' ? 0.5 : 2.0) - Math.sin(phase) * 0.5,
      rArmA: (view === 'E' ? 0.3 : 1.1) + Math.sin(phase) * 0.5,
      phase
    });
    drawVolumetricPlume(back, TX - aimSign * 12, TY - 2, 10, 4.5, v, 0.8, idx);
  }
  // 4. WHIP / BLADE COMBO (108..167 = 60f: 2 x 30f alternating strikes!): Song Đằng / Trúc Kiếm Liên Trảm!
  else if (idx < 168) {
    const local = idx - 108, stage = Math.floor(local / 30), u = (local % 30) / 29;
    const strike = u > 0.16 ? Math.sin(Math.min(1, (u - 0.16) / 0.44) * Math.PI * 0.65) : 0;
    const dissolve = Math.max(0, (u - 0.56) / 0.44);
    const swing = stage === 0 ? (-1.45 + strike * 2.25) : (1.45 - strike * 2.35);

    const pts = drawTreeSpirit(mid, species, view, {
      dx: view === 'E' ? (-4 + strike * 8) : 0,
      crouch: 1.8, lean: 5.5 * strike,
      lArmA: stage === 1 ? swing : 2.3,
      rArmA: swing,
      armReach: 14 + strike * 8,
      rimGlow: 0.6 + strike * 0.4, phase: u * TAU
    });

    if (u >= 0.16) {
      const ox = pts.chestX + aimSign * 6, oy = pts.chestY + (view === 'S' ? 8 : view === 'N' ? -8 : 0);
      drawVolumetricCrescent(view === 'N' ? back : front, ox, oy, aimA + (stage === 1 ? -0.18 : 0.18), 18 + u * 11, 8.5 * (1 - dissolve * 0.5), v, dissolve * 0.82, 1.58, idx);
      if (species.id !== 'bamboo' && u < 0.78) {
        drawSacredVine(front, pts.rHandX, pts.rHandY, ox + Math.cos(aimA) * 24, oy + Math.sin(aimA) * 18, 5, v, u * 6, species.id === 'banyan' ? C.gold3 : C.pink);
      }
    }
  }
  // 5. ROOT SLAM / THICKET ERUPTION (168..227 = 60f): Vạn Rễ Trói Chân (AoE Crush)!
  else if (idx < 228) {
    const u = (idx - 168) / 59;
    const raise = u < 0.32 ? Math.sin((u / 0.32) * Math.PI * 0.5) : 0;
    const slam = u >= 0.32 ? Math.min(1, (u - 0.32) / 0.18) : 0;
    const bloom = u >= 0.38 ? (u - 0.38) / 0.62 : 0;

    drawTreeSpirit(mid, species, view, {
      lift: raise * 7,
      crouch: slam * 4.5 * (1 - bloom * 0.4),
      lArmA: u < 0.32 ? -2.2 : 1.85,
      rArmA: u < 0.32 ? -0.95 : 1.25,
      rimGlow: 0.95, phase: u * TAU * 2
    });

    if (bloom > 0) {
      const cx = TX + aimSign * 14;
      drawGroundVortex(back, cx, TY + 2, 18 + bloom * 22, 6 + bloom * 6, v, bloom * 8, true);
      const grow = Math.sin(bloom * Math.PI);
      if (species.id === 'bamboo') {
        for (const [ox, h, tl] of [[-16, 36, -4], [-5, 46, -1], [7, 44, 2], [18, 34, 5]]) {
          drawVolumetricSpire(front, cx + ox, TY + 2, 6.5, h * grow, tl, v, true);
        }
      } else {
        for (const ox of [-18, -6, 8, 20]) {
          drawSacredVine(ox < 0 ? back : front, cx + ox * 0.4, TY + 1, cx + ox * 1.15, TY - 42 * grow, 5.5, v, bloom * 8 + ox, species.id === 'banyan' ? C.gold3 : C.pink);
        }
      }
    }
  }
  // 6. RANGED SEED / DART / LANTERN BARRAGE (228..275 = 48f): Linh Chủng Xạ Kích!
  else if (idx < 276) {
    const u = (idx - 228) / 47;
    const charge = u < 0.30 ? u / 0.30 : Math.max(0, 1 - (u - 0.30) / 0.15);
    const fire = u >= 0.28 ? (u - 0.28) / 0.72 : 0;

    const pts = drawTreeSpirit(mid, species, view, {
      dx: view === 'E' ? (-3 * charge - 2 * Math.sin(fire * Math.PI)) : 0,
      lean: 4.5 * (1 - charge),
      lArmA: aimA - 0.35, rArmA: aimA + 0.15,
      rimGlow: 0.9, phase: u * TAU * 2
    });

    const mx = pts.chestX + Math.cos(aimA) * 14, my = pts.chestY + Math.sin(aimA) * 10;
    if (charge > 0.05) {
      drawRing(front, mx, my, 9 * charge + 3, 6 * charge + 1.5, v[3], C.white);
    }
    if (fire > 0) {
      drawStarFlare(front, mx, my, 10 * (1 - fire * 0.55) + 3, v, fire * 8);
      for (let p = 0; p < 3; p++) {
        const travel = Math.min(1, fire * 1.45 - p * 0.16);
        if (travel <= 0) continue;
        const spread = (p - 1) * 0.22;
        const px = mx + Math.cos(aimA + spread) * (travel * 26);
        const py = my + Math.sin(aimA + spread) * (travel * 20);
        if (species.id === 'bamboo') {
          const ca = Math.cos(aimA + spread), sa = Math.sin(aimA + spread), nx = -sa, ny = ca;
          polyTri(front, px - ca * 5 + nx * 2.5, py - sa * 5 + ny * 2.5, px + ca * 7, py + sa * 7, px - ca * 5 - nx * 2.5, py - sa * 5 - ny * 2.5, C.white);
        } else {
          drawVolumetricPlume(front, px, py, 5.2 * (1 - fire * 0.35), 5.2 * (1 - fire * 0.35), v, 1.05, idx + p);
        }
      }
    }
  }
  // 7. FOREST WARD / HEALING BLOOM (276..299 = 24f): Mộc Giáp Hồi Sinh!
  else {
    const u = (idx - 276) / 23, swell = Math.sin(u * Math.PI);
    drawGroundVortex(back, TX, TY + 1, 16 + swell * 16, 5 + swell * 5, v, u * 6, false);
    const pts = drawTreeSpirit(mid, species, view, {
      crouch: swell * 2.2, lArmA: 1.4, rArmA: 1.7, rimGlow: 1.0, phase: u * TAU
    });
    drawRing(front, pts.chestX, pts.chestY, 14 + swell * 12, 10 + swell * 10, v[4], C.white);
  }

  for (let i = 0; i < TW * TH; i++) {
    if (back.d[i]) out.d[i] = back.d[i];
    if (mid.d[i]) out.d[i] = mid.d[i];
    if (front.d[i]) out.d[i] = front.d[i];
  }
  return out;
}

module.exports = {
  GW, GH, GX, GY, GCOLS, GROWS,
  TW, TH, TX, TY, TCOLS, TROWS,
  TREE_SPECIES, renderGolemFrame, renderTreeSpiritFrame, drawVolcanicBoulder
};

if (require.main === module) {
  console.log('Generating 300f x 3-view Atlases for Earth Golem + 3 Nature Tree Spirit Species...');
  const t0 = Date.now();
  const views = ['S', 'E', 'N'];

  // 1. Generate Earth Golem Atlas (`assets/thienvu-summon-golem.png`, 3600x3348: 900f + 30f flying boulder!)
  const gSW = GCOLS * GW, gSH = GROWS * GH;
  const gSheet = Buffer.alloc(gSW * gSH, 0);
  const gMap = new Map();
  for (let vIdx = 0; vIdx < 3; vIdx++) {
    const vw = views[vIdx];
    for (let f = 0; f < 300; f++) {
      const buf = renderGolemFrame(vw, f);
      if ((vw === 'S' && [24, 42, 220].includes(f)) || (vw === 'E' && [42, 124, 174, 268, 286].includes(f))) gMap.set(`${vw}:${f}`, buf);
      const cellIdx = vIdx * 300 + f;
      blitIndexed(gSheet, gSW, buf, (cellIdx % GCOLS) * GW, Math.floor(cellIdx / GCOLS) * GH, 1);
    }
  }
  for (let f = 0; f < 30; f++) {
    const bBuf = makeBuf(GW, GH);
    drawVolcanicBoulder(bBuf, GX, GY - 36, 16, (f / 30) * TAU * 2, 1.0);
    blitIndexed(gSheet, gSW, bBuf, f * GW, 30 * GH, 1);
  }
  const golemPath = path.join(ASSETS, 'thienvu-summon-golem.png');
  fs.writeFileSync(golemPath, encodeIndexedPNG(gSW, gSH, gSheet));
  console.log(`Saved thienvu-summon-golem.png (${gSW}x${gSH}, ${(fs.statSync(golemPath).size / 1024).toFixed(1)} KB)`);

  // 2. Generate 3 Nature Tree Spirit Atlases (`oak`, `bamboo`, `banyan`, 2880x2760 each = 900f each!)
  const tSW = TCOLS * TW, tSH = TROWS * TH;
  const treeShowcase = [];
  for (const sp of TREE_SPECIES) {
    const tSheet = Buffer.alloc(tSW * tSH, 0);
    let sIdle = null;
    const ePicks = [];
    for (let vIdx = 0; vIdx < 3; vIdx++) {
      const vw = views[vIdx];
      for (let f = 0; f < 300; f++) {
        const buf = renderTreeSpiritFrame(sp, vw, f);
        if (vw === 'S' && f === 42) sIdle = buf;
        if (vw === 'E' && [126, 198, 250].includes(f)) ePicks.push(buf);
        const cellIdx = vIdx * 300 + f;
        blitIndexed(tSheet, tSW, buf, (cellIdx % TCOLS) * TW, Math.floor(cellIdx / TCOLS) * TH, 1);
      }
    }
    treeShowcase.push(sIdle, ...ePicks);
    const tName = `thienvu-summon-${sp.id}.png`;
    const tPath = path.join(ASSETS, tName);
    fs.writeFileSync(tPath, encodeIndexedPNG(tSW, tSH, tSheet));
    console.log(`Saved ${tName} (${tSW}x${tSH}, ${(fs.statSync(tPath).size / 1024).toFixed(1)} KB)`);
  }

  // 3. Build HD Visual Inspection Showcase Posters in Artifact Dir!
  if (fs.existsSync(ARTIFACT_DIR)) {
    const golemShowcase = ['S:42', 'E:42', 'S:24', 'E:124', 'E:174', 'S:220', 'E:268', 'E:286'].map(k => gMap.get(k));
    const GC = 4, GR = 2, GSCALE = 2;
    const gPoster = Buffer.alloc((GC * GW * GSCALE) * (GR * GH * GSCALE), C.ink);
    golemShowcase.forEach((buf, i) => {
      blitIndexed(gPoster, GC * GW * GSCALE, buf, (i % GC) * GW * GSCALE, Math.floor(i / GC) * GH * GSCALE, GSCALE);
    });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'thienvu_golem_300_showcase.png'), encodeIndexedPNG(GC * GW * GSCALE, GR * GH * GSCALE, gPoster));

    const TC = 4, TR = 3, TSCALE = 2;
    const tPoster = Buffer.alloc((TC * TW * TSCALE) * (TR * TH * TSCALE), C.ink);
    treeShowcase.forEach((buf, i) => {
      blitIndexed(tPoster, TC * TW * TSCALE, buf, (i % TC) * TW * TSCALE, Math.floor(i / TC) * TH * TSCALE, TSCALE);
    });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'thienvu_trees_300_showcase.png'), encodeIndexedPNG(TC * TW * TSCALE, TR * TH * TSCALE, tPoster));
    console.log('Done in', ((Date.now() - t0) / 1000).toFixed(2) + 's');
  }
}
