'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { C, PixelSurface, savePng, scaleBlit, NPC_SPECS } = require('./npc-art-core.cjs');
const { CW, CH, renderNpcFrame, renderNpcPortrait128 } = require('./npc-choreography.cjs');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const QA_DIR = path.join(ROOT, 'qa', 'npc-overhaul');

const WORK_F = 180;
const GREET_F = 160;
const INTER_F = 180;
const TOTAL_F = WORK_F + GREET_F + INTER_F; // 520 frames per NPC!
const COLS = 40;
const ROWS_PER_NPC = TOTAL_F / COLS; // 13 exact rows!

const SHEET_GROUPS = [
  NPC_SPECS.slice(0, 5),   // Sheet 1: Làng Đèn (5)
  NPC_SPECS.slice(5, 10),  // Sheet 2: Đường Gió & Rừng Trúc (5)
  NPC_SPECS.slice(10, 15), // Sheet 3: Đầm Sen & Đồi Tro (5)
  NPC_SPECS.slice(15, 20), // Sheet 4: Đồi Tro, Thác Ngọc, Thung Lũng, Phế Tích, Bến Sương (5)
  NPC_SPECS.slice(20, 26), // Sheet 5: Biên Viễn + Giếng Ngọc (6)
];

function main() {
  const t0 = Date.now();
  fs.mkdirSync(ASSETS, { recursive: true });
  fs.mkdirSync(QA_DIR, { recursive: true });

  const sheetBytes = [];
  const sampleWork = new Map();
  const sampleGreet = new Map();
  const sampleInter = new Map();

  for (let sIdx = 0; sIdx < SHEET_GROUPS.length; sIdx++) {
    const group = SHEET_GROUPS[sIdx];
    const W = COLS * CW;
    const H = group.length * ROWS_PER_NPC * CH;
    const atlas = new Uint8Array(W * H);

    for (let localIdx = 0; localIdx < group.length; localIdx++) {
      const spec = group[localIdx];
      const baseRow = localIdx * ROWS_PER_NPC;

      for (let f = 0; f < TOTAL_F; f++) {
        let mode, mf, mTotal;
        if (f < WORK_F) {
          mode = 'work'; mf = f; mTotal = WORK_F;
        } else if (f < WORK_F + GREET_F) {
          mode = 'greet'; mf = f - WORK_F; mTotal = GREET_F;
        } else {
          mode = 'interact'; mf = f - WORK_F - GREET_F; mTotal = INTER_F;
        }
        const cell = renderNpcFrame(spec, mode, mf, mTotal);
        const col = f % COLS;
        const row = baseRow + Math.floor(f / COLS);
        cell.blitTo(atlas, W, col * CW, row * CH);

        if (f === 36) sampleWork.set(spec.id, cell);
        if (f === WORK_F + 40) sampleGreet.set(spec.id, cell);
        if (f === WORK_F + GREET_F + 90) sampleInter.set(spec.id, cell);
      }
    }

    const outName = `npcs-overhaul-${sIdx + 1}.png`;
    const outPath = path.join(ASSETS, outName);
    savePng(outPath, W, H, atlas);
    const sz = fs.statSync(outPath).size;
    sheetBytes.push({ file: outName, width: W, height: H, npcs: group.length, frames: group.length * TOTAL_F, kb: +(sz / 1024).toFixed(1) });
  }

  // 2. Build 25 Story NPC 128×128 Portraits (`assets/npcs-portraits.png` — 5×5 = 640×640)
  const PW = 640, PH = 640;
  const portAtlas = new Uint8Array(PW * PH);
  for (let i = 0; i < 25; i++) {
    const pSurf = renderNpcPortrait128(NPC_SPECS[i]);
    const px = (i % 5) * 128, py = Math.floor(i / 5) * 128;
    pSurf.blitTo(portAtlas, PW, px, py);
  }
  const portPath = path.join(ASSETS, 'npcs-portraits.png');
  savePng(portPath, PW, PH, portAtlas);

  // 3. Build QA Visual Inspection Sheets (`qa/npc-overhaul/*.png`)
  // Sheet A: All 26 Redesigned NPCs Roster (7 cols × 4 rows at 2× crisp scale = 160×152 per tile)
  const RW = 7 * 168 + 16, RH = 4 * 164 + 16;
  const roster = new PixelSurface(RW, RH);
  roster.rectRaw(0, 0, RW, RH, C.BG0);
  for (let i = 0; i < NPC_SPECS.length; i++) {
    const spec = NPC_SPECS[i];
    const gx = 12 + (i % 7) * 168, gy = 12 + Math.floor(i / 7) * 164;
    roster.rectRaw(gx, gy, 160, 154, C.BG1);
    roster.rectRaw(gx, gy, 160, 2, spec.robe[3]);
    const wCell = sampleWork.get(spec.id);
    scaleBlit(wCell.buf, CW, 0, 0, CW, CH, roster.buf, RW, gx, gy + 2, 2);
  }
  savePng(path.join(QA_DIR, 'npcs-roster-26.png'), RW, RH, roster.buf);

  // Sheet B: All 25 Portraits with clean spacing
  const PGW = 5 * 136 + 12, PGH = 5 * 136 + 12;
  const pGrid = new PixelSurface(PGW, PGH);
  pGrid.rectRaw(0, 0, PGW, PGH, C.OUT);
  for (let i = 0; i < 25; i++) {
    const sx = (i % 5) * 128, sy = Math.floor(i / 5) * 128;
    const dx = 10 + (i % 5) * 136, dy = 10 + Math.floor(i / 5) * 136;
    scaleBlit(portAtlas, PW, sx, sy, 128, 128, pGrid.buf, PGW, dx, dy, 1);
  }
  savePng(path.join(QA_DIR, 'npcs-portraits-25.png'), PGW, PGH, pGrid.buf);

  // Sheet C: Keyframe Action Strips (7 featured NPCs × 6 keyframes across Work 180f / Greet 160f / Interact 180f)
  const featured = ['smith', 'weaver_woman', 'elder', 'blind_bard', 'automaton_07', 'dom_avatar', 'well'];
  const SW = 6 * 164 + 16, SH = featured.length * 158 + 16;
  const strips = new PixelSurface(SW, SH);
  strips.rectRaw(0, 0, SW, SH, C.BG0);
  featured.forEach((id, rIdx) => {
    const spec = NPC_SPECS.find(s => s.id === id);
    const picks = [
      renderNpcFrame(spec, 'work', 18, WORK_F),
      renderNpcFrame(spec, 'work', 74, WORK_F),
      renderNpcFrame(spec, 'greet', 28, GREET_F),
      renderNpcFrame(spec, 'greet', 96, GREET_F),
      renderNpcFrame(spec, 'interact', 54, INTER_F),
      renderNpcFrame(spec, 'interact', 96, INTER_F),
    ];
    picks.forEach((cell, cIdx) => {
      const dx = 10 + cIdx * 164, dy = 10 + rIdx * 158;
      strips.rectRaw(dx, dy, 160, 152, C.BG1);
      strips.rectRaw(dx, dy, 160, 2, cIdx < 2 ? C.LEAF3 : cIdx < 4 ? C.CYAN2 : C.GOLD4);
      scaleBlit(cell.buf, CW, 0, 0, CW, CH, strips.buf, SW, dx, dy + 2, 2);
    });
  });
  savePng(path.join(QA_DIR, 'npcs-action-strips.png'), SW, SH, strips.buf);

  console.log(JSON.stringify({
    elapsedMs: Date.now() - t0,
    totalEntities: NPC_SPECS.length,
    framesPerNpc: { work: WORK_F, greet: GREET_F, interact: INTER_F, total: TOTAL_F },
    grandTotalFrames: NPC_SPECS.length * TOTAL_F,
    portraitsPngKb: +(fs.statSync(portPath).size / 1024).toFixed(1),
    sheets: sheetBytes,
  }, null, 2));
}

main();
