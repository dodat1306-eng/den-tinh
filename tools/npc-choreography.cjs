'use strict';
const {
  TAU, clamp, C, PixelSurface, scaleBlit,
  drawLantern, drawLotusFlower, drawSparkStar, drawBookOpen,
  NPC_SPECS, drawNpcBaseBody,
} = require('./npc-art-core.cjs');

const CW = 80, CH = 76, AX = 40, AY = 64;
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const pulseWindow = (u, a, b) => {
  if (u < a || u > b) return 0;
  const m = (a + b) * 0.5, hw = (b - a) * 0.5;
  return smooth(1 - Math.abs(u - m) / Math.max(1e-6, hw));
};

function renderJadeWell(s, mode, u) {
  const ph = u * TAU;
  const isGreet = mode === 'greet', isInter = mode === 'interact';
  const surge = isInter ? pulseWindow(u, 0.12, 0.86) : isGreet ? 0.35 + 0.15 * Math.sin(ph * 2) : 0.12 * (0.5 + 0.5 * Math.sin(ph));

  s.ditherAura(AX, AY - 6, 26 + surge * 8, 10 + surge * 4, C.CYAN2, C.TEAL1, 0.42 + surge * 0.38);

  const wellS = new PixelSurface(CW, CH);
  for (const sgn of [-1, 1]) {
    wellS.rect(AX + sgn * 15 - 1.5, AY - 38, 3, 28, C.WOOD0);
    wellS.line(AX + sgn * 15, AY - 38, AX + sgn * 15, AY - 11, 1, C.WOOD2);
  }
  wellS.line(AX - 15, AY - 29, AX + 15, AY - 29, 2.0, C.WOOD2);
  const crankA = ph * (isInter ? 3 : 1);
  wellS.line(AX + 16, AY - 29, AX + 16 + Math.cos(crankA) * 3.5, AY - 29 + Math.sin(crankA) * 3.5, 1.3, C.GOLD2);
  const bucketSway = Math.sin(ph * 2) * (isInter ? 2.2 : 1.0);
  const bucketY = AY - 21 + (isInter ? -3.5 * surge : Math.sin(ph) * 1.5);
  wellS.line(AX + 4, AY - 29, AX + 4 + bucketSway, bucketY - 2, 1.0, C.STRAW1);
  wellS.poly([
    [AX + 1.5 + bucketSway, bucketY - 2], [AX + 6.5 + bucketSway, bucketY - 2],
    [AX + 5.8 + bucketSway, bucketY + 2.6], [AX + 2.2 + bucketSway, bucketY + 2.6],
  ], C.WOOD2);
  wellS.line(AX + 1.5 + bucketSway, bucketY - 0.5, AX + 6.5 + bucketSway, bucketY - 0.5, 1, C.GOLD2);

  wellS.poly([[AX, AY - 50], [AX - 23, AY - 36], [AX + 23, AY - 36]], C.TEAL0);
  wellS.poly([[AX, AY - 48.5], [AX - 19, AY - 36.8], [AX + 19, AY - 36.8]], C.TEAL1);
  for (let rx = -16; rx <= 16; rx += 4) wellS.line(AX + rx * 0.4, AY - 46, AX + rx, AY - 36.8, 1, C.CYAN1);
  wellS.line(AX - 23, AY - 36, AX + 23, AY - 36, 1.5, C.GOLD2);
  wellS.ellipse(AX, AY - 50.5, 2.2, 2.0, C.GOLD3);
  drawLantern(wellS, AX - 17, AY - 29, C.RED2, C.GOLD4, Math.sin(ph * 2) * 0.8, 0.72, surge * 0.6);

  wellS.ellipse(AX, AY - 4, 18.5, 7.2, C.ASH0);
  wellS.rect(AX - 17.5, AY - 13, 35, 9, C.ASH1);
  for (let k = -12; k <= 12; k += 6) wellS.line(AX + k, AY - 12, AX + k, AY - 5, 1, C.ASH0);
  wellS.ellipse(AX - 11, AY - 7, 3.2, 1.8, C.LEAF2);
  wellS.ellipse(AX + 9, AY - 6, 2.8, 1.6, C.LEAF3);
  wellS.ellipse(AX, AY - 13, 18.2, 6.8, C.ASH2);
  wellS.ellipse(AX, AY - 13, 15.6, 5.4, C.ASH3);
  wellS.ellipse(AX, AY - 13, 13.4, 4.3, C.TEAL1);
  wellS.ellipse(AX, AY - 13, 11.2, 3.4, surge > 0.3 ? C.CYAN2 : C.CYAN1);

  const r1 = ((u * 3) % 1) * 10.5;
  wellS.ring(AX, AY - 13, Math.max(1.5, r1), Math.max(0.8, r1 * 0.3), 0.9, C.CYAN3);
  wellS.outline(C.OUT);
  s.merge(wellS);

  if (isInter && surge > 0.05) {
    const hCol = 12 + surge * 26;
    s.ditherAura(AX, AY - 15 - hCol * 0.45, 9 + surge * 5, hCol * 0.55, C.CYAN3, C.LIME1, 0.65);
    s.capsule(AX, AY - 13, AX, AY - 13 - hCol, 4.2 * surge + 1, 1.8, C.CYAN2);
    s.capsule(AX, AY - 13, AX, AY - 13 - hCol * 0.85, 2.2 * surge + 0.5, 1.0, C.WHITE);
    for (let i = 0; i < 6; i++) {
      const a = ph * 3 + i * (TAU / 6);
      const px = AX + Math.cos(a) * (7 + surge * 9);
      const py = AY - 16 - ((u * 2 + i * 0.17) % 1) * (18 + surge * 16);
      drawSparkStar(s, px, py, i % 2 ? 2.0 : 1.2, C.LIME2, C.WHITE);
    }
  } else {
    const nWisps = isGreet ? 5 : 3;
    for (let i = 0; i < nWisps; i++) {
      const wu = (u * 2 + i / nWisps) % 1;
      const wx = AX + Math.sin(ph * 2 + i * 2.1) * (5 + i * 2);
      const wy = AY - 14 - wu * (isGreet ? 22 : 14);
      s.set(wx, wy, wu < 0.5 ? C.CYAN3 : C.LIME1);
      if (isGreet && i % 2 === 0) s.set(wx + 1, wy, C.WHITE);
    }
  }
}

function renderNpcFrame(spec, mode, frameIdx, totalFrames) {
  const s = new PixelSurface(CW, CH);
  const u = frameIdx / totalFrames, ph = u * TAU;
  if (spec.id === 'well') { renderJadeWell(s, mode, u); return s; }

  const isWork = mode === 'work', isGreet = mode === 'greet', isInter = mode === 'interact';
  const breath = Math.sin(ph * 2), sway = Math.sin(ph), sway2 = Math.cos(ph * 2);
  const blink = (frameIdx >= 42 && frameIdx <= 45) || (frameIdx >= 122 && frameIdx <= 125);
  const aura = isInter ? pulseWindow(u, 0.08, 0.92) : isGreet ? 0.35 + 0.15 * Math.sin(ph * 2) : 0;
  const talk = isInter && u > 0.14 && u < 0.86 && (Math.floor(frameIdx / 5) % 2 === 0);
  const smile = isGreet || (isInter && !talk);

  const pose = {
    bob: breath * 0.7, leanX: 0, leanY: 0,
    headX: isGreet ? Math.sin(ph) * 0.6 : 0, headY: isGreet ? -0.5 : 0,
    armL: { dx: -5.2, dy: 6.4 + breath * 0.5 }, armR: { dx: 5.2, dy: 6.4 - breath * 0.5 },
    footL: 0, footR: 0, sway: sway * 0.8, blink, talk, smile, aura, phase: ph,
  };

  const bgS = new PixelSurface(CW, CH), charS = new PixelSurface(CW, CH), fgS = new PixelSurface(CW, CH);

  switch (spec.id) {
    case 'elder': {
      if (isWork) {
        const adjust = pulseWindow(u, 0.45, 0.72);
        pose.armR = { dx: 7.5, dy: 2.0 + breath * 0.5 };
        pose.armL = adjust > 0.1 ? { dx: -2.0 * (1 - adjust) - 1.2, dy: -8.5 * adjust + 5.5 * (1 - adjust) } : { dx: -4.2, dy: 5.8 + sway2 * 0.6 };
        pose.headY = -adjust * 0.8;
      } else if (isGreet) {
        const wave = Math.sin(ph * 3);
        pose.armR = { dx: 8.2, dy: -1.5 + breath * 0.5 };
        pose.armL = { dx: -7.5 + wave * 1.6, dy: -5.5 + Math.abs(wave) * 1.2 };
      } else {
        pose.armR = { dx: 7.8, dy: -4.5 * aura + 1.0 * (1 - aura) };
        pose.armL = { dx: -6.2, dy: -3.5 * aura + 5.0 * (1 - aura) };
      }
      const rig = drawNpcBaseBody(charS, spec, AX - 2, AY, pose);
      const stX = rig.hands.R.x + 2.2, topY = rig.hands.R.y - 16;
      charS.line(stX, AY - 1, stX, topY + 3, 1.6, C.LEAF2);
      charS.arc(stX + 3.2, topY + 3, 3.2, 3.2, 1.5, Math.PI, TAU, C.LEAF3);
      drawLantern(fgS, stX + 6.2, topY + 8.5, C.RED2, C.GOLD4, sway * 1.1, 0.95, 0.25 + aura * 0.75);
      if (aura > 0.15) {
        for (let i = 0; i < 5; i++) {
          const pu = (u * 2 + i * 0.2) % 1;
          drawSparkStar(fgS, AX + Math.sin(ph * 2 + i * 1.7) * 14, AY - 14 - pu * 32, i % 2 ? 1.8 : 1.0, C.GOLD4, C.WHITE);
        }
      }
      break;
    }
    case 'smith': {
      bgS.rect(AX - 22, AY - 9, 10, 8, C.IRON0);
      bgS.poly([[AX - 26, AY - 13], [AX - 9, AY - 13], [AX - 12, AY - 9], [AX - 23, AY - 9]], C.IRON1);
      bgS.line(AX - 25, AY - 13, AX - 10, AY - 13, 1.2, C.IRON3);
      bgS.line(AX - 22, AY - 14.2, AX - 12, AY - 14.2, 1.8, C.EMBER1);
      bgS.line(AX - 20, AY - 14.5, AX - 14, AY - 14.5, 1.0, aura > 0.4 ? C.WHITE : C.EMBER3);
      bgS.poly([[AX + 15, AY - 9], [AX + 26, AY - 9], [AX + 24, AY - 2], [AX + 17, AY - 2]], C.IRON0);
      const fireH = 4.5 + Math.sin(ph * 4) * 1.5 + aura * 4.5;
      bgS.ellipse(AX + 20.5, AY - 10.5, 4.5, fireH * 0.65, C.EMBER1);
      bgS.ellipse(AX + 20.5, AY - 10.2, 2.8, fireH * 0.45, C.EMBER3);

      let strikeImpact = 0;
      if (isWork) {
        if (u < 0.54) {
          const cyc = ((u / 0.54) * 3) % 1;
          const lift = cyc < 0.55 ? smooth(cyc / 0.55) : 1 - smooth((cyc - 0.55) / 0.22);
          strikeImpact = cyc >= 0.72 && cyc <= 0.88 ? 1 : 0;
          pose.bob = strikeImpact ? 1.5 : -lift * 1.2;
          pose.leanX = -1.5 + (1 - lift) * -1.2;
          pose.armL = { dx: -7.5, dy: 4.2 };
          pose.armR = { dx: -5.5 + lift * 10.5, dy: 4.5 - lift * 15.5 };
        } else if (u < 0.78) {
          const look = pulseWindow(u, 0.56, 0.76);
          pose.leanX = -1.2 * look; pose.headY = 1.2 * look;
          pose.armL = { dx: -6.8, dy: 1.5 - look * 2.5 }; pose.armR = { dx: 5.5, dy: 5.0 };
        } else {
          const stoke = pulseWindow(u, 0.80, 0.98);
          pose.armL = { dx: -2.0 * stoke - 4.0 * (1 - stoke), dy: -8.5 * stoke + 5.0 * (1 - stoke) };
          pose.armR = { dx: 8.5, dy: 4.5 + Math.sin(ph * 4) * 1.5 };
        }
      } else if (isGreet) {
        const wave = Math.sin(ph * 3);
        pose.armR = { dx: 6.2, dy: -3.5 };
        pose.armL = { dx: -8.2 + wave * 1.6, dy: -5.8 + Math.abs(wave) };
      } else if (u < 0.35) {
        const lift = u < 0.22 ? smooth(u / 0.22) : 1 - smooth((u - 0.22) / 0.13);
        strikeImpact = u >= 0.30 && u <= 0.40 ? 1.4 : 0;
        pose.armL = { dx: -7.5, dy: 4.0 };
        pose.armR = { dx: -6.0 + lift * 11.5, dy: 4.0 - lift * 16.5 };
      } else {
        const raise = pulseWindow(u, 0.36, 0.90);
        pose.armL = { dx: -3.5, dy: -10.5 * raise + 3.0 * (1 - raise) };
        pose.armR = { dx: 6.2, dy: -2.5 };
      }
      const rig = drawNpcBaseBody(charS, spec, AX + 1, AY, pose);
      if (!isGreet) {
        if (isInter && u >= 0.35) {
          const bx = rig.hands.L.x, by = rig.hands.L.y;
          fgS.line(bx, by, bx - 1.5, by - 13, 2.2, C.GOLD3);
          fgS.line(bx, by - 1, bx - 1.5, by - 12.5, 1.0, C.WHITE);
          drawSparkStar(fgS, bx - 1.5, by - 13.5, 3.2, C.CYAN2, C.WHITE);
        } else {
          charS.line(rig.hands.L.x, rig.hands.L.y, AX - 15, AY - 14, 1.2, C.IRON2);
        }
      }
      const hx = rig.hands.R.x, hy = rig.hands.R.y;
      const hAng = hy < rig.chestY ? -0.8 : -2.3;
      const htx = hx + Math.cos(hAng) * 8.5, hty = hy + Math.sin(hAng) * 8.5;
      charS.line(hx, hy, htx, hty, 1.5, C.WOOD2);
      charS.ellipse(htx, hty, 3.2, 2.2, C.IRON2);
      charS.set(htx - 0.8, hty - 0.6, C.IRON3);
      if (strikeImpact > 0) {
        for (let k = 0; k < 7; k++) {
          const sa = -Math.PI * 0.15 - (k / 6) * Math.PI * 0.7;
          const sr = 3 + ((frameIdx * 3 + k * 2) % 9);
          drawSparkStar(fgS, AX - 17 + Math.cos(sa) * sr, AY - 15 + Math.sin(sa) * sr, k % 2 ? 1.8 : 1.0, C.GOLD4, C.WHITE);
        }
      }
      break;
    }
    case 'temple_keeper': {
      if (isWork) {
        const whisk = Math.sin(ph * 2);
        pose.armL = { dx: -5.8, dy: 2.2 + breath * 0.4 };
        pose.armR = { dx: 6.8 + whisk * 2.5, dy: -1.5 - Math.abs(whisk) * 2.2 };
        pose.headX = whisk * 0.7;
      } else if (isGreet) {
        const bow = pulseWindow(u, 0.2, 0.8);
        pose.leanY = bow * 1.8; pose.headY = bow * 1.5;
        pose.armL = { dx: 2.5, dy: 1.5 }; pose.armR = { dx: -2.5, dy: 1.5 };
      } else {
        pose.armL = { dx: -4.2, dy: -1.0 * aura + 2.0 * (1 - aura) };
        pose.armR = { dx: 7.5, dy: -6.5 * aura + 1.0 * (1 - aura) };
      }
      const rig = drawNpcBaseBody(charS, spec, AX, AY, pose);
      drawBookOpen(fgS, rig.hands.L.x - 1.5, rig.hands.L.y - 1.0, C.CREAM, C.WOOD1, aura);
      const wx = rig.hands.R.x, wy = rig.hands.R.y;
      charS.line(wx, wy, wx + 4.5, wy - 7.5, 1.3, C.WOOD1);
      fgS.curve([[wx + 4.5, wy - 7.5], [wx + 7.5 + sway * 1.8, wy - 12.0], [wx + 5.8 + sway * 2.5, wy - 16.0]], 2.0, 0.8, C.CREAM);
      if (isInter && aura > 0.15) {
        for (let i = 0; i < 4; i++) {
          const ru = (u * 1.6 + i * 0.22) % 1;
          const rx = rig.hands.L.x - 4 + i * 3.2 + Math.sin(ph * 2 + i) * 1.5;
          const ry = rig.hands.L.y - 4 - ru * 22;
          fgS.rect(rx - 1, ry - 1.5, 2, 3, i % 2 ? C.GOLD4 : C.GOLD3);
          fgS.set(rx, ry, C.WHITE);
        }
      }
      break;
    }
    case 'weaver_woman': {
      const shuttleX = Math.sin(ph * 3) * 10.5;
      if (isWork) {
        const memoryPause = pulseWindow(u, 0.62, 0.88);
        pose.armL = memoryPause > 0.2 ? { dx: 2.0, dy: 1.5 } : { dx: -5.5 + shuttleX * 0.45, dy: 3.8 + Math.cos(ph * 3) * 1.0 };
        pose.armR = memoryPause > 0.2 ? { dx: -2.0, dy: 1.5 } : { dx: 5.5 + shuttleX * 0.45, dy: 3.8 - Math.cos(ph * 3) * 1.0 };
        pose.headX = memoryPause > 0.2 ? -1.4 : shuttleX * 0.08;
      } else if (isGreet) {
        const wave = Math.sin(ph * 3);
        pose.armL = { dx: 1.8, dy: 1.8 };
        pose.armR = { dx: 7.2 + wave * 1.4, dy: -5.5 + Math.abs(wave) };
      } else {
        pose.armL = { dx: -6.5, dy: -3.5 * aura + 3.0 * (1 - aura) };
        pose.armR = { dx: 6.5, dy: -3.5 * aura + 3.0 * (1 - aura) };
      }
      drawNpcBaseBody(charS, spec, AX, AY - 1, pose);
      fgS.rect(AX - 17, AY - 24, 2.4, 23, C.WOOD1);
      fgS.rect(AX + 14.6, AY - 24, 2.4, 23, C.WOOD1);
      fgS.rect(AX - 18, AY - 25, 36, 2.4, C.WOOD2);
      fgS.rect(AX - 17, AY - 9, 34, 2.2, C.WOOD2);
      for (let tx = -12; tx <= 12; tx += 3) fgS.line(AX + tx, AY - 22.5, AX + tx, AY - 9, 1, tx % 6 === 0 ? C.GOLD4 : C.GOLD2);
      fgS.rect(AX - 12, AY - 13, 24, 4, C.PINK1);
      fgS.line(AX - 11, AY - 12, AX + 11, AY - 12, 1, C.PINK3);
      if (isInter && aura > 0.1) {
        for (let k = -14; k <= 14; k += 2) {
          const ry = AY - 21 - aura * 3.0 + Math.sin(ph * 3 + k * 0.28) * 2.0;
          fgS.ellipse(AX + k, ry, 1.5, 1.2, k % 4 === 0 ? C.GOLD4 : C.PINK2);
        }
      } else {
        const sx = isWork ? AX + shuttleX : AX;
        fgS.ellipse(sx, AY - 16, 3.2, 1.3, C.GOLD3);
        fgS.set(sx, AY - 16, C.WHITE);
      }
      fgS.outline(C.OUT);
      break;
    }
    case 'lantern_boy': {
      const hop = isWork || isGreet ? Math.max(0, Math.sin(ph * 4)) * 2.2 : 0;
      pose.bob = -hop;
      pose.footL = hop > 0.4 ? hop : 0;
      pose.footR = hop <= 0.4 ? Math.max(0, -Math.sin(ph * 4)) * 1.8 : 0;
      pose.armL = { dx: -6.8, dy: isInter ? -6.5 : -4.2 - hop * 0.3 };
      pose.armR = { dx: 6.4, dy: isGreet ? -5.0 : 2.8 };
      const rig = drawNpcBaseBody(charS, spec, AX, AY, pose);
      const px = rig.hands.L.x - 2.0, py = rig.hands.L.y - 11.5;
      charS.line(rig.hands.L.x, rig.hands.L.y, px, py, 1.2, C.WOOD2);
      const spin = -ph * (isInter ? 6 : 4);
      for (let i = 0; i < 4; i++) {
        const a = spin + i * (TAU / 4);
        fgS.poly([[px, py], [px + Math.cos(a) * 5.2, py + Math.sin(a) * 5.2], [px + Math.cos(a + 0.55) * 3.4, py + Math.sin(a + 0.55) * 3.4]], i % 2 ? C.RED2 : C.GOLD3);
      }
      fgS.set(px, py, C.WHITE);
      drawLantern(fgS, rig.hands.R.x + 1.8, rig.hands.R.y + 4.5, C.TEAL2, C.CYAN2, sway * 1.2, 0.82, 0.25 + aura * 0.7);
      if (isInter && aura > 0.15) {
        for (let i = 0; i < 6; i++) {
          const a = ph * 3 + i * (TAU / 6);
          drawSparkStar(fgS, AX + Math.cos(a) * (12 + aura * 6), AY - 20 + Math.sin(a) * 10, 1.6, i % 2 ? C.CYAN3 : C.GOLD4, C.WHITE);
        }
      }
      break;
    }
    case 'blind_bard': {
      bgS.ellipse(AX, AY - 1.5, 19, 4.8, C.WOOD3);
      bgS.ellipse(AX, AY - 2.0, 16.5, 3.6, C.STRAW1);
      const strum = Math.sin(ph * 6);
      pose.headX = Math.sin(ph * 2) * 1.2;
      pose.headY = isGreet ? 1.6 * pulseWindow(u, 0.25, 0.75) : Math.cos(ph * 2) * 0.7;
      pose.armL = { dx: 6.5 + Math.sin(ph * 3) * 1.8, dy: -3.8 - Math.sin(ph * 3) * 1.5 };
      pose.armR = { dx: -2.2 + strum * 1.4, dy: 4.8 + strum * 0.8 };
      drawNpcBaseBody(charS, spec, AX - 2, AY, pose);
      fgS.poly([[AX - 8, AY - 14], [AX - 1, AY - 15], [AX - 0.5, AY - 7], [AX - 8.5, AY - 7.5]], C.WOOD2);
      fgS.line(AX - 3, AY - 12, AX + 15, AY - 34, 1.8, C.WOOD1);
      fgS.line(AX - 4, AY - 10, AX + 14.5, AY - 33.5, 1.0, C.GOLD4);
      fgS.outline(C.OUT);
      const nNotes = isInter ? 8 : isGreet ? 3 : 2;
      for (let i = 0; i < nNotes; i++) {
        const nu = (u * (isInter ? 2 : 1) + i / nNotes) % 1;
        if (isInter) {
          const na = -Math.PI * 0.85 + (i / 7) * Math.PI * 0.9, nr = 14 + aura * 12;
          drawSparkStar(fgS, AX + Math.cos(na) * nr, AY - 22 + Math.sin(na) * nr * 0.75 - Math.sin(ph * 3 + i) * 2, 2.0, i % 2 ? C.GOLD4 : C.LIME1, C.WHITE);
        } else {
          fgS.ring(AX + 12, AY - 31, 2.5 + nu * 9, 2.5 + nu * 9, 0.9, nu < 0.6 ? C.GOLD4 : C.GOLD2);
        }
      }
      break;
    }
    case 'wandering_merchant': {
      const bounce = Math.sin(ph * 2) * 1.1;
      pose.bob = bounce;
      const coinToss = isWork ? pulseWindow(u, 0.45, 0.82) : 0;
      pose.armL = { dx: -7.5, dy: -4.2 };
      pose.armR = isGreet ? { dx: 8.5 + Math.sin(ph * 3) * 1.8, dy: -3.5 } : coinToss > 0.05 ? { dx: 6.5, dy: 1.5 - coinToss * 5.0 } : { dx: 6.8, dy: -3.8 };
      const rig = drawNpcBaseBody(charS, spec, AX, AY, pose);
      const py = rig.chestY + 1.2 + bounce * 0.4;
      bgS.curve([[AX - 24, py + 2.5 - sway], [AX, py - 1.0], [AX + 24, py + 2.5 + sway]], 1.6, 1.6, C.WOOD3);
      drawLantern(fgS, AX - 23, py + 11 - sway * 1.4, C.RED2, C.GOLD4, -sway, 0.92, 0.25 + aura * 0.75);
      drawLantern(fgS, AX + 23, py + 11 + sway * 1.4, C.TEAL2, C.CYAN2, sway, 0.92, 0.25 + aura * 0.75);
      if (coinToss > 0.08) {
        const cy = rig.hands.R.y - 3 - Math.sin(coinToss * Math.PI) * 11;
        fgS.ellipse(rig.hands.R.x + 1, cy, 1.8, 1.8, C.GOLD4);
        fgS.set(rig.hands.R.x + 1, cy, C.WHITE);
      }
      if (isInter && aura > 0.2) fgS.ditherAura(AX, AY - 20, 14 * aura, 14 * aura, C.GOLD4, C.PURP3, 0.5);
      break;
    }
    case 'bamboo_hunter': {
      const drawAmt = isWork ? pulseWindow(u, 0.20, 0.65) : isInter ? pulseWindow(u, 0.15, 0.75) : 0;
      pose.armL = { dx: -9.5, dy: -1.2 };
      pose.armR = isGreet ? { dx: 6.5, dy: -6.5 + Math.sin(ph * 2) } : drawAmt > 0.1 ? { dx: -2.5 + drawAmt * 4.5, dy: -1.5 } : { dx: 4.5, dy: 5.5 };
      const rig = drawNpcBaseBody(charS, spec, AX + 2, AY, pose);
      const bx = rig.hands.L.x - 1.5, by = rig.hands.L.y;
      fgS.curve([[bx + 2.5, by - 13], [bx - 4.5, by - 4], [bx - 4.5, by + 4], [bx + 2.5, by + 13]], 1.5, 1.5, C.WOOD2);
      const pullX = bx + 2.5 + drawAmt * 6.5;
      fgS.line(bx + 2.5, by - 12.5, pullX, by, 1, C.CREAM);
      fgS.line(pullX, by, bx + 2.5, by + 12.5, 1, C.CREAM);
      if (drawAmt > 0.12) {
        fgS.line(pullX, by, bx - 9.5, by, 1.2, isInter ? C.LIME1 : C.WOOD3);
        drawSparkStar(fgS, bx - 10, by, isInter ? 2.4 : 1.3, C.LIME2, C.WHITE);
      }
      if (isInter && u > 0.55) {
        const mx = AX + 11, my = rig.chestY - 2;
        fgS.ellipse(mx, my, 3.8, 4.5, C.STRAW2);
        fgS.set(mx - 1.2, my - 0.8, C.OUT); fgS.set(mx + 1.2, my - 0.8, C.OUT);
        fgS.line(mx - 2, my + 1.5, mx + 2, my + 1.5, 1, C.RED2);
        fgS.outline(C.OUT);
      }
      break;
    }
    case 'bamboo_nun': {
      bgS.poly([[AX + 14, AY - 11], [AX + 22, AY - 11], [AX + 21, AY - 2], [AX + 15, AY - 2]], C.ASH1);
      bgS.ellipse(AX + 18, AY - 11.5, 4.5, 1.8, C.ASH2);
      bgS.set(AX + 18, AY - 12, C.EMBER2);
      for (let k = 0; k < 10; k++) {
        const su = (u * 2 + k * 0.1) % 1;
        fgS.set(AX + 18 + Math.sin(ph * 2 + su * 5) * (2.5 + su * 2.5), AY - 14 - su * 22, su < 0.5 ? C.CREAM : C.SILV1);
      }
      if (isWork) {
        pose.armL = { dx: 2.2, dy: 2.8 + breath * 0.4 }; pose.armR = { dx: -2.2, dy: 2.8 - breath * 0.4 };
      } else if (isGreet) {
        pose.leanY = 1.0 * pulseWindow(u, 0.25, 0.75); pose.armL = { dx: 3.2, dy: 0.8 }; pose.armR = { dx: -3.2, dy: 0.8 };
      } else {
        pose.armL = { dx: -5.5 * aura + 2.0 * (1 - aura), dy: -1.5 }; pose.armR = { dx: 5.5 * aura - 2.0 * (1 - aura), dy: -1.5 };
      }
      const rig = drawNpcBaseBody(charS, spec, AX - 2, AY, pose);
      const beadR = 4.2 + aura * 7.5, beadCx = rig.chestX, beadCy = rig.chestY + 3.5 - aura * 3.5;
      const nBeads = isInter ? 12 : 8;
      for (let i = 0; i < nBeads; i++) {
        const ba = ph * (isInter ? 2 : 1) + i * (TAU / nBeads);
        fgS.set(beadCx + Math.cos(ba) * beadR, beadCy + Math.sin(ba) * beadR * 0.82, i % 3 === 0 ? C.LIME2 : C.LEAF3);
      }
      break;
    }
    case 'cursed_woodcutter': {
      for (let r = -2; r <= 2; r++) bgS.curve([[AX + r * 6, AY], [AX + r * 4.2, AY - 4.5], [AX + r * 2.8, AY - 9]], 2.0, 1.0, r % 2 ? C.ASH1 : C.WOOD1);
      const struggle = isWork ? pulseWindow(u, 0.15, 0.48) : 0;
      pose.leanX = struggle * -1.6;
      pose.armL = isGreet ? { dx: -7.5, dy: -5.5 + Math.sin(ph * 3) * 1.4 } : { dx: -5.5, dy: 1.5 - aura * 3.5 };
      pose.armR = { dx: 7.5, dy: 3.2 - (isInter ? aura * 3.0 : 0) };
      const rig = drawNpcBaseBody(charS, spec, AX - 1, AY, pose);
      const axX = rig.hands.R.x + 1.5;
      charS.line(axX, AY - 1, axX - 1, rig.hands.R.y - 3, 1.5, C.WOOD2);
      charS.poly([[axX, AY - 9], [axX + 5.8, AY - 11], [axX + 5.5, AY - 3.5], [axX, AY - 5]], C.IRON2);
      charS.line(axX + 5.5, AY - 10.5, axX + 5.2, AY - 4, 1, C.SILVER);
      drawBookOpen(fgS, rig.hands.L.x - 1.5, rig.hands.L.y - 1.5, C.STRAW2, C.WOOD1, aura);
      if (isInter && aura > 0.2) {
        for (let i = 0; i < 6; i++) {
          const a = ph * 2 + i * (TAU / 6);
          drawSparkStar(fgS, AX + Math.cos(a) * 13, AY - 16 + Math.sin(a) * 9, 1.6, C.LIME2, C.WHITE);
        }
      }
      break;
    }
    case 'lotus_crone': {
      const rock = Math.sin(ph * 2) * 1.2;
      pose.bob = rock * 0.7;
      bgS.ring(AX, AY - 1, 24 + Math.sin(ph * 2) * 2, 5.5, 0.9, C.CYAN2);
      bgS.poly([[AX - 23, AY - 7 + rock * 0.5], [AX + 23, AY - 7 - rock * 0.5], [AX + 16, AY - 1], [AX - 16, AY - 1]], C.WOOD2);
      pose.armL = { dx: -6.5, dy: isInter ? -3.5 * aura + 2.0 * (1 - aura) : 2.8 };
      pose.armR = isGreet ? { dx: 6.5, dy: -5.5 } : { dx: 8.5 + Math.sin(ph * 2) * 1.8, dy: 1.5 + Math.cos(ph * 2) * 2.0 };
      const rig = drawNpcBaseBody(charS, spec, AX - 1, AY - 1, pose);
      fgS.curve([[AX - 23, AY - 7 + rock * 0.5], [AX, AY - 4.2], [AX + 23, AY - 7 - rock * 0.5]], 1.6, 1.6, C.GOLD2);
      fgS.line(rig.hands.R.x + 1, rig.hands.R.y - 12, AX + 19, AY + 1, 1.4, C.WOOD3);
      fgS.ring(rig.hands.R.x + 1, rig.hands.R.y - 12, 1.8, 1.8, 0.9, C.GOLD3);
      fgS.outline(C.OUT);
      drawLotusFlower(fgS, rig.hands.L.x - 3, rig.hands.L.y - 1.5 - aura * 5, 1.1 + aura * 0.45, 0.35 + aura * 0.65);
      break;
    }
    case 'scholar_ghost': {
      const floatY = -3.8 + Math.sin(ph * 2) * 2.2;
      pose.bob = floatY;
      bgS.ditherAura(AX, AY - 18 + floatY * 0.5, 14 + aura * 6, 18 + aura * 5, C.CYAN2, C.TEAL1, 0.35 + aura * 0.3);
      if (isGreet) {
        pose.armL = { dx: 2.5, dy: 1.2 }; pose.armR = { dx: -2.5, dy: 1.2 };
      } else {
        pose.armL = { dx: -6.2, dy: 2.2 };
        pose.armR = { dx: 7.5 + Math.cos(ph * 3) * 3.5, dy: -3.5 + Math.sin(ph * 4) * 3.2 };
      }
      const rig = drawNpcBaseBody(charS, spec, AX, AY, pose);
      if (!isGreet) {
        drawBookOpen(fgS, rig.hands.L.x - 1.5, rig.hands.L.y - 1, C.CYAN3, C.TEAL1, 0.6);
        const bx = rig.hands.R.x, by = rig.hands.R.y;
        charS.line(bx, by, bx + 2.5, by - 7.5, 1.3, C.LEAF3);
        fgS.ellipse(bx + 2.8, by - 8.5, 1.4, 2.0, C.WHITE);
        const trailLen = isInter ? 12 : 6;
        for (let k = 0; k < trailLen; k++) {
          const ta = ph * 3 - k * 0.32;
          fgS.set(AX + 11 + Math.cos(ta) * (5 + aura * 6), rig.chestY - 4 + Math.sin(ta * 2) * (4 + aura * 5), k < 3 ? C.WHITE : k < 7 ? C.CYAN3 : C.CYAN2);
        }
      }
      break;
    }
    case 'firefly_girl': {
      if (isWork) {
        const fingerReach = pulseWindow(u, 0.45, 0.80);
        pose.armL = { dx: 1.5, dy: 2.5 };
        pose.armR = fingerReach > 0.1 ? { dx: 7.5 * fingerReach - 1.5 * (1 - fingerReach), dy: -6.5 * fingerReach + 2.5 * (1 - fingerReach) } : { dx: -1.5, dy: 2.5 };
        pose.headX = fingerReach * 1.4;
      } else if (isGreet) {
        pose.armL = { dx: 1.5, dy: 2.2 }; pose.armR = { dx: 7.8 + Math.sin(ph * 3) * 1.6, dy: -5.8 };
      } else {
        pose.armL = { dx: -5.5 * aura + 1.5 * (1 - aura), dy: -2.5 * aura + 2.5 * (1 - aura) };
        pose.armR = { dx: 5.5 * aura - 1.5 * (1 - aura), dy: -2.5 * aura + 2.5 * (1 - aura) };
      }
      const rig = drawNpcBaseBody(charS, spec, AX, AY, pose);
      drawLotusFlower(fgS, rig.chestX, rig.chestY + 5.0 - aura * 1.6, 0.95 + aura * 0.30, 0.3 + aura * 0.7);
      const nFlies = isInter ? 10 : 5;
      for (let i = 0; i < nFlies; i++) {
        const fa = ph * (isInter ? 2 : 1) + i * (TAU / nFlies);
        drawSparkStar(fgS, AX + Math.sin(fa) * (15 + aura * 7), AY - 24 + Math.sin(fa * 2) * (9 + aura * 6), (i + frameIdx) % 3 === 0 ? 1.8 : 1.0, i % 2 ? C.LIME2 : C.GOLD4, C.WHITE);
      }
      break;
    }
    case 'ash_forger': {
      bgS.poly([[AX + 11, AY - 12], [AX + 26, AY - 12], [AX + 28, AY - 1], [AX + 9, AY - 1]], C.ASH0);
      bgS.ellipse(AX + 18.5, AY - 12.5, 6.8, 2.6, C.EMBER1);
      bgS.ellipse(AX + 18.5, AY - 12.5, 4.2, 1.5, C.EMBER3);
      if (isWork) {
        const strike = pulseWindow(u, 0.35, 0.65);
        pose.armL = { dx: 6.5 + strike * 5.5, dy: 2.0 - strike * 6.5 };
        pose.armR = { dx: 8.5, dy: 3.5 + Math.sin(ph * 2) };
      } else if (isGreet) {
        pose.armL = { dx: -7.8, dy: -6.8 + Math.sin(ph * 2) * 1.2 }; pose.armR = { dx: 7.8, dy: 3.8 };
      } else {
        pose.armL = { dx: 5.5, dy: -7.5 * aura + 2.0 * (1 - aura) };
        pose.armR = { dx: 6.5, dy: -5.5 * aura + 3.5 * (1 - aura) };
      }
      const rig = drawNpcBaseBody(charS, spec, AX - 3, AY, pose);
      const tx = rig.hands.R.x + 4.5, ty = rig.hands.R.y + 1.5;
      charS.line(rig.hands.R.x, rig.hands.R.y, tx, ty, 1.3, C.IRON2);
      fgS.ellipse(tx + 1.5, ty, 2.8, 1.6, aura > 0.3 ? C.WHITE : C.EMBER2);
      for (let i = 0; i < (isInter ? 7 : 3); i++) {
        const su = (u * 3 + i * 0.25) % 1;
        drawSparkStar(fgS, AX + 18 + Math.sin(ph * 3 + i * 2) * 5, AY - 14 - su * (14 + aura * 16), 1.5, C.GOLD4, C.EMBER3);
      }
      break;
    }
    case 'ash_gravedigger': {
      bgS.poly([[AX - 23, AY - 21], [AX - 13, AY - 21], [AX - 12, AY - 1], [AX - 24, AY - 1]], C.ASH1);
      bgS.ellipse(AX - 18, AY - 21, 5.0, 2.4, C.ASH2);
      bgS.line(AX - 23, AY - 14, AX - 13, AY - 13, 1.3, C.SOUL1);
      drawLantern(bgS, AX - 11, AY - 24, C.PURP2, C.SOUL2, sway * 0.9, 0.8, 0.25 + aura * 0.7);
      if (isWork) {
        const dig = Math.sin(ph * 2);
        pose.leanX = dig * 0.8; pose.armL = { dx: -5.2, dy: 4.8 }; pose.armR = { dx: 6.8, dy: 3.5 + dig * 1.5 };
      } else if (isGreet) {
        pose.armL = { dx: 2.2, dy: 1.2 }; pose.armR = { dx: 7.2, dy: 2.5 };
      } else {
        const tap = Math.abs(Math.sin(ph * 4)) * aura * 2.5;
        pose.armL = { dx: -6.2, dy: -2.5 * aura + 4.0 * (1 - aura) }; pose.armR = { dx: 7.2, dy: 2.5 - tap };
      }
      const rig = drawNpcBaseBody(charS, spec, AX + 2, AY, pose);
      const spX = rig.hands.R.x + 1.5, spBot = AY - (isInter ? Math.abs(Math.sin(ph * 4)) * 2.5 : 0.5);
      charS.line(spX, rig.hands.R.y - 6, spX, spBot - 4, 1.4, C.WOOD2);
      charS.poly([[spX - 2.6, spBot - 5], [spX + 2.6, spBot - 5], [spX + 2.0, spBot], [spX, spBot + 1], [spX - 2.0, spBot]], C.IRON2);
      if (isInter && aura > 0.15) {
        for (let i = 0; i < 5; i++) {
          const bu = (u * 1.8 + i * 0.2) % 1;
          const bx = AX - 16 + Math.sin(ph * 3 + i * 1.5) * 9, by = AY - 16 - bu * 28;
          fgS.set(bx - 1, by, C.SOUL2); fgS.set(bx + 1, by, C.SOUL2); fgS.set(bx, by, C.WHITE);
        }
      }
      break;
    }
    case 'exiled_pyromancer': {
      pose.armR = { dx: 7.8, dy: isInter ? -1.5 : 1.5 };
      pose.armL = isGreet ? { dx: -8.2, dy: -5.8 + Math.sin(ph * 2) } : { dx: -7.5 + Math.cos(ph * 2) * 1.8, dy: -2.2 + Math.sin(ph * 2) * 1.6 };
      const rig = drawNpcBaseBody(charS, spec, AX, AY, pose);
      const stX = rig.hands.R.x + 1.8;
      charS.line(stX, AY - 1, stX, rig.headY - 8, 1.5, C.GOLD2);
      fgS.poly([[stX, rig.headY - 13], [stX + 2.8, rig.headY - 9.5], [stX, rig.headY - 6.5], [stX - 2.8, rig.headY - 9.5]], C.RED2);
      fgS.set(stX, rig.headY - 10, C.GOLD4);
      fgS.outline(C.OUT);
      const fx = rig.hands.L.x - 2.0, fy = rig.hands.L.y - 3.5;
      fgS.ditherAura(fx, fy, 6.5 + aura * 5, 7.5 + aura * 5, C.EMBER3, C.RED2, 0.55);
      fgS.ellipse(fx, fy, 2.8 + Math.sin(ph * 4) * 0.5, 3.6, C.EMBER2);
      fgS.ellipse(fx, fy + 0.4, 1.6, 2.2, C.GOLD5);
      if (isInter && aura > 0.15) {
        fgS.ring(AX, AY - 22, 14 * aura + 4, 6 * aura + 2, 1.1, C.EMBER2);
        fgS.ring(AX, AY - 22, 10 * aura + 3, 4 * aura + 1.5, 0.9, C.GOLD4);
      }
      break;
    }
    case 'waterfall_hermit': {
      bgS.ellipse(AX - 5, AY - 3.5, 13.5, 5.2, C.LEAF1);
      bgS.ellipse(AX - 5, AY - 4.5, 11.2, 4.0, C.LEAF2);
      const sipGourd = isWork ? pulseWindow(u, 0.65, 0.90) : 0;
      pose.armL = sipGourd > 0.1 ? { dx: -1.5, dy: -6.8 * sipGourd + 3.5 * (1 - sipGourd) } : isGreet ? { dx: -6.5, dy: -4.5 } : { dx: -4.5, dy: 4.0 };
      const rodLift = isInter ? aura * 5.5 : Math.sin(ph * 2) * 1.2;
      pose.armR = { dx: 6.8, dy: 1.0 - rodLift * 0.5 };
      const rig = drawNpcBaseBody(charS, spec, AX - 5, AY - 1, pose);
      const tipX = AX + 27, tipY = AY - 34 - rodLift;
      fgS.curve([[rig.hands.R.x, rig.hands.R.y], [AX + 12, AY - 28 - rodLift * 0.7], [tipX, tipY]], 1.4, 0.8, C.WOOD3);
      const bobY = isInter ? AY - 18 - aura * 10 : AY - 3 + Math.sin(ph * 3) * 1.2;
      fgS.line(tipX, tipY, tipX - 1 + sway, bobY, 1.0, C.CREAM);
      if (isInter && aura > 0.15) {
        fgS.ditherAura(tipX - 1 + sway, bobY, 6.5, 6.5, C.CYAN3, C.GOLD4, 0.65);
        fgS.ellipse(tipX - 1 + sway, bobY, 2.5, 3.2, C.CYAN2);
        fgS.set(tipX - 1 + sway, bobY - 0.8, C.WHITE);
      } else {
        fgS.ellipse(tipX - 1 + sway, bobY, 1.5, 1.8, C.GOLD3);
        bgS.ring(tipX - 1 + sway, AY - 2, 3.5 + ((u * 2) % 1) * 5, 1.4 + ((u * 2) % 1) * 1.8, 0.9, C.CYAN2);
      }
      break;
    }
    case 'windmill_keeper': {
      pose.armL = { dx: -7.5, dy: -2.2 };
      pose.armR = isGreet ? { dx: 8.2, dy: -6.2 + Math.sin(ph * 3) * 1.5 } : { dx: 6.8, dy: isInter ? -4.5 * aura + 1.5 : 1.8 + Math.sin(ph * 2) };
      const rig = drawNpcBaseBody(charS, spec, AX, AY, pose);
      const kx = rig.hands.R.x + 2, ky = rig.hands.R.y - 9;
      charS.line(rig.hands.R.x, rig.hands.R.y + 2, kx, ky + 3, 1.6, C.GOLD2);
      charS.ring(kx, ky, 3.4, 3.4, 1.1, C.GOLD3);
      const vx = rig.hands.L.x - 3, vy = rig.hands.L.y - 5;
      charS.line(rig.hands.L.x, rig.hands.L.y, vx, vy, 1.2, C.WOOD2);
      const vSpin = ph * (isInter ? 6 : 3);
      for (let i = 0; i < 4; i++) {
        const a = vSpin + i * (TAU / 4);
        fgS.line(vx, vy, vx + Math.cos(a) * 5.2, vy + Math.sin(a) * 5.2, 1.6, i % 2 ? C.GOLD4 : C.LIME1);
      }
      fgS.set(vx, vy, C.WHITE);
      if (isInter && aura > 0.15) fgS.ring(AX, AY - 4, 14 + aura * 8, 4.5 + aura * 2, 1.0, C.LIME1);
      break;
    }
    case 'automaton_07': {
      pose.headX = isGreet ? Math.round(Math.sin(ph * 2)) * 1.2 : 0;
      pose.armR = isGreet ? { dx: 7.8, dy: -5.5 } : { dx: 6.2, dy: 2.5 + Math.sin(ph * 4) * 0.8 };
      pose.armL = { dx: -7.2, dy: 0.5 - aura * 2.5 };
      const rig = drawNpcBaseBody(charS, spec, AX + 3, AY, pose);
      const nScreens = isInter && aura > 0.25 ? 3 : 1;
      for (let sIdx = 0; sIdx < nScreens; sIdx++) {
        const hx = AX - 15 - sIdx * 3.5, hy = rig.chestY - 1 - sIdx * 5.5 + Math.sin(ph * 2 + sIdx) * 1.0;
        fgS.rect(hx - 6.5, hy - 5, 13, 10, C.TEAL0);
        fgS.ring(hx, hy, 7.0, 5.5, 0.9, sIdx === 1 ? C.GOLD3 : C.CYAN2);
        const scroll = Math.floor(u * 12) + sIdx;
        for (let r = 0; r < 3; r++) {
          const len = 4 + ((scroll + r * 2) % 6);
          fgS.line(hx - 4.5, hy - 2.5 + r * 2.4, hx - 4.5 + len, hy - 2.5 + r * 2.4, 1, r === 0 ? C.GOLD4 : C.CYAN3);
        }
      }
      break;
    }
    case 'ferryman': {
      const rowArc = isWork ? Math.sin(ph * 2) * 2.8 : 0;
      pose.leanX = rowArc * 0.35;
      pose.armL = { dx: -4.5 + rowArc * 0.4, dy: 3.5 };
      pose.armR = { dx: 6.5 + rowArc * 0.5, dy: isGreet ? -2.0 : 1.5 };
      const rig = drawNpcBaseBody(charS, spec, AX - 2, AY, pose);
      const oxTop = rig.hands.R.x - 2, oyTop = rig.chestY - 7;
      const oxBot = AX + 15 + rowArc, oyBot = AY - 1 - (isInter ? Math.abs(Math.sin(ph * 3)) * 3.5 : 0);
      charS.line(oxTop, oyTop, oxBot, oyBot - 5, 1.5, C.WOOD2);
      charS.poly([[oxBot - 2.2, oyBot - 6], [oxBot + 2.2, oyBot - 6], [oxBot + 2.8, oyBot], [oxBot - 2.8, oyBot]], C.WOOD3);
      fgS.set(oxBot, Math.min(CH - 2, oyBot + ((u * 4) % 1) * 3), C.CYAN3);
      if (isInter && aura > 0.1) {
        for (let k = 0; k < 3; k++) {
          const ru = (u * 2 + k * 0.33) % 1;
          bgS.ring(oxBot, AY - 1, 3 + ru * 14, 1.2 + ru * 4, 0.9, k === 0 ? C.GOLD3 : C.CYAN2);
        }
      }
      break;
    }
    case 'mirror_maiden': {
      pose.armL = isInter ? { dx: -7.5 * aura + 2.5 * (1 - aura), dy: -1.5 } : { dx: -3.8, dy: 2.5 };
      pose.armR = isInter ? { dx: 7.5 * aura - 2.5 * (1 - aura), dy: -1.5 } : { dx: 3.8, dy: 2.5 };
      const rig = drawNpcBaseBody(charS, spec, AX, AY, pose);
      const mx = AX + (isInter ? 10.5 * aura : 0), my = rig.chestY + 5.5 - aura * 2.2 + Math.sin(ph * 2) * 0.8, mr = 4.6 + aura * 1.6;
      fgS.ring(mx, my, mr + 1.1, mr + 1.1, 1.1, C.GOLD3);
      fgS.ellipse(mx, my, mr, mr, C.TEAL2);
      fgS.ellipse(mx, my, mr * 0.75, mr * 0.75, C.CYAN2);
      const glX = Math.sin(ph * 2) * 1.6;
      fgS.line(mx - 2.0 + glX, my - 2.0, mx + 2.0 + glX, my + 2.0, 1.1, C.WHITE);
      fgS.outline(C.OUT);
      if (isInter && aura > 0.2) {
        for (let i = 0; i < 6; i++) {
          const a = ph * 2 + i * (TAU / 6);
          drawSparkStar(fgS, AX + Math.cos(a) * (12 + aura * 5), my + Math.sin(a) * 10, 1.7, i % 2 ? C.PINK3 : C.SILVER, C.WHITE);
        }
      }
      break;
    }
    case 'bell_keeper': {
      const chimeHit = isWork ? pulseWindow(u, 0.35, 0.52) : isInter ? Math.max(pulseWindow(u, 0.2, 0.38), pulseWindow(u, 0.55, 0.73)) : 0;
      pose.armL = { dx: -7.5, dy: isGreet ? -2.5 : 0.5 };
      pose.armR = { dx: 6.5 - chimeHit * 9.5, dy: 1.5 - chimeHit * 1.5 };
      const rig = drawNpcBaseBody(charS, spec, AX + 2, AY, pose);
      const bx = rig.hands.L.x - 3.5, by = rig.hands.L.y + 5.5;
      drawLantern(fgS, bx, by, C.GOLD2, C.GOLD4, chimeHit * 2.0 + sway * 0.6, 1.05, chimeHit + aura * 0.6);
      charS.line(rig.hands.R.x, rig.hands.R.y, rig.hands.R.x - 4.5, rig.hands.R.y - 2.5, 1.5, C.WOOD2);
      if (chimeHit > 0.1 || (isInter && aura > 0.2)) {
        const rr = 5 + ((u * 4) % 1) * 14;
        fgS.ring(bx, by, rr, rr * 0.85, 1.0, C.GOLD4);
      }
      break;
    }
    case 'sun_child': {
      const highSun = isGreet ? 1 : isInter ? aura : 0;
      pose.armL = { dx: -3.6 - highSun * 2.2, dy: 2.8 - highSun * 10.5 };
      pose.armR = { dx: 3.6 + highSun * 2.2, dy: 2.8 - highSun * 10.5 };
      const rig = drawNpcBaseBody(charS, spec, AX, AY, pose);
      const sx = AX, sy = highSun > 0.35 ? rig.headY - 12.5 - highSun * 3.0 : rig.chestY + 5.0 + Math.sin(ph * 2) * 0.8, sr = 3.6 + aura * 1.5;
      fgS.ditherAura(sx, sy, sr * 2.6, sr * 2.6, C.GOLD4, C.EMBER2, 0.55 + aura * 0.3);
      const nRays = isInter ? 12 : 8;
      for (let i = 0; i < nRays; i++) {
        const ra = ph * 2 + i * (TAU / nRays);
        fgS.line(sx + Math.cos(ra) * (sr + 1), sy + Math.sin(ra) * (sr + 1), sx + Math.cos(ra) * (sr + 3.5 + aura * 3), sy + Math.sin(ra) * (sr + 3.5 + aura * 3), 1.1, C.GOLD4);
      }
      fgS.ellipse(sx, sy, sr, sr, C.GOLD3);
      fgS.ellipse(sx, sy, sr * 0.68, sr * 0.68, C.GOLD5);
      fgS.set(sx - 1, sy - 1, C.WHITE);
      break;
    }
    case 'bronze_pilot': {
      pose.armL = isGreet ? { dx: -2.2, dy: -9.5 } : { dx: -5.2, dy: 4.5 };
      pose.armR = { dx: 8.2, dy: 0.5 - aura * 3.5 };
      const rig = drawNpcBaseBody(charS, spec, AX - 2, AY, pose);
      const cx = rig.hands.R.x + 4.0, cy = rig.hands.R.y - 2.0, cr = 5.5 + aura * 3.0;
      fgS.ring(cx, cy, cr, cr, 1.0, C.GOLD2);
      fgS.ring(cx, cy, cr * 0.68, cr * 0.42, 0.9, C.GOLD4);
      for (let i = 0; i < 4; i++) {
        const a = ph * 3 + i * (TAU / 4);
        fgS.line(cx, cy, cx + Math.cos(a) * (cr - 1), cy + Math.sin(a) * (cr - 1), 1.0, i === 0 ? C.CYAN2 : C.GOLD3);
      }
      fgS.set(cx, cy, C.WHITE);
      if (isInter && aura > 0.2) {
        for (let i = 0; i < 6; i++) {
          const sa = -ph * 2 + i * (TAU / 6);
          drawSparkStar(fgS, AX + Math.cos(sa) * 16, AY - 26 + Math.sin(sa) * 11, 1.6, C.CYAN3, C.GOLD5);
        }
      }
      break;
    }
    case 'dom_avatar': {
      pose.armL = isGreet ? { dx: -7.8, dy: -6.2 + Math.sin(ph * 3) * 1.5 } : { dx: -7.2 - aura * 2.5, dy: 0.5 - Math.sin(ph * 2) * 2.2 - aura * 3.0 };
      pose.armR = { dx: 7.2 + aura * 2.5, dy: 0.5 + Math.sin(ph * 2) * 2.2 - aura * 3.0 };
      const rig = drawNpcBaseBody(charS, spec, AX, AY, pose);
      const bx = AX, by = rig.chestY + 4.8 - aura * 1.0 + Math.sin(ph * 2) * 0.8;
      fgS.ditherAura(bx, by, 5 + aura * 4.0, 4 + aura * 3.0, C.GOLD4, C.FOX2, 0.42 + aura * 0.25);
      fgS.ellipse(bx, by, 2.8, 2.8, C.GOLD3);
      fgS.set(bx - 0.6, by - 0.6, C.WHITE);
      fgS.curve([[rig.hands.L.x, rig.hands.L.y], [AX, by + 4.5], [rig.hands.R.x, rig.hands.R.y]], 1.0, 1.0, C.GOLD4);
      if (aura > 0.15) {
        for (let i = 0; i < 7; i++) {
          const fa = ph * 2.5 + i * (TAU / 7);
          drawSparkStar(fgS, AX + Math.cos(fa) * (13 + aura * 5), AY - 24 + Math.sin(fa) * 12, 1.8, C.GOLD4, C.WHITE);
        }
      }
      break;
    }
  }

  bgS.outline(C.OUT);
  charS.outline(C.OUT);
  s.merge(bgS);
  s.merge(charS);
  s.merge(fgS);
  return s;
}

// ============================================================================
// 128×128 ILLUSTRATED DIALOGUE PORTRAIT BUILDER (ALL 25 STORY NPCS)
// ============================================================================
function renderNpcPortrait128(spec) {
  const p = new PixelSurface(128, 128);
  p.rectRaw(0, 0, 128, 128, C.BG0);
  p.ditherAura(64, 60, 54, 52, spec.sub[2], spec.robe[1], 0.58);

  const mode = ['smith', 'temple_keeper', 'bamboo_hunter', 'exiled_pyromancer', 'automaton_07', 'bronze_pilot'].includes(spec.id) ? 'greet' : 'work';
  const src = renderNpcFrame(spec, mode, 24, mode === 'greet' ? 160 : 180);
  const b = spec.build;
  const cropY = b === 'seated' ? 20 : b === 'boat' ? 18 : b === 'child' ? 19 : spec.id === 'scholar_ghost' ? 9 : 12;
  const cropX = ['waterfall_hermit', 'elder', 'blind_bard', 'ash_forger', 'ferryman', 'bronze_pilot'].includes(spec.id) ? 16
    : ['automaton_07', 'bamboo_hunter', 'ash_gravedigger', 'bell_keeper'].includes(spec.id) ? 20 : 19;
  scaleBlit(src.buf, CW, cropX, cropY, 42, 39, p.buf, 128, 1, 8, 3);

  p.rectRaw(0, 0, 128, 3, C.WOOD0);
  p.rectRaw(0, 125, 128, 3, C.WOOD0);
  p.rectRaw(0, 0, 3, 128, C.WOOD0);
  p.rectRaw(125, 0, 3, 128, C.WOOD0);

  p.rectRaw(3, 3, 122, 2, spec.robe[3]);
  p.rectRaw(3, 123, 122, 2, spec.robe[3]);
  p.rectRaw(3, 3, 2, 122, spec.robe[3]);
  p.rectRaw(123, 3, 2, 122, spec.robe[3]);

  for (const [cx, cy] of [[4, 4], [120, 4], [4, 120], [120, 120]]) {
    p.rectRaw(cx, cy, 4, 4, C.GOLD4);
  }
  return p;
}

module.exports = {
  CW, CH, AX, AY,
  renderJadeWell, renderNpcFrame, renderNpcPortrait128,
};
