'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');

// 1. Validate binary PNG headers, indexed colorType=3, and exact dimensions
for (let i = 1; i <= 5; i++) {
  const f = path.join(root, 'assets', `npcs-overhaul-${i}.png`);
  const b = fs.readFileSync(f);
  assert.equal(b.readUInt32BE(16), 3200, `sheet ${i} width`);
  assert.equal(b.readUInt32BE(20), i === 5 ? 5928 : 4940, `sheet ${i} height`);
  assert.equal(b[25], 3, `sheet ${i} must be indexed PNG (colorType 3)`);
}
const portBuf = fs.readFileSync(path.join(root, 'assets', 'npcs-portraits.png'));
assert.equal(portBuf.readUInt32BE(16), 640);
assert.equal(portBuf.readUInt32BE(20), 640);
assert.equal(portBuf[25], 3);

// 2. Validate runtime frame selection across all 26 entities × 520 frames (13,520 frames) + game interactions
let stackDepth = 0;
const draws = [];
function mockCtx() {
  return {
    imageSmoothingEnabled: true,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'left',
    save() { stackDepth++; },
    restore() { stackDepth--; assert(stackDepth >= 0, 'Canvas restore underflow'); },
    beginPath() {},
    ellipse(...a) { assert(a.every(Number.isFinite)); },
    fill() {},
    stroke() {},
    translate(x, y) { assert(Number.isFinite(x) && Number.isFinite(y)); },
    scale(x, y) { assert(Number.isFinite(x) && Number.isFinite(y)); },
    fillRect(...a) { assert(a.every(Number.isFinite)); },
    strokeRect(...a) { assert(a.every(Number.isFinite)); },
    createRadialGradient() { return { addColorStop() {} }; },
    fillText() {},
    drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) {
      assert(img && img.complete && img.naturalWidth > 0);
      assert(sx >= 0 && sy >= 0 && sw > 0 && sh > 0);
      assert(sx + sw <= img.naturalWidth && sy + sh <= img.naturalHeight, `OOB crop on ${img.src}: (${sx},${sy},${sw},${sh}) vs ${img.naturalWidth}x${img.naturalHeight}`);
      assert([dx, dy, dw, dh].every(Number.isFinite));
      draws.push({ src: img.src, sx, sy, sw, sh, dx, dy, dw, dh });
    }
  };
}

const scope = {
  console,
  performance: { now: () => 1000 },
  localStorage: { getItem: () => null, setItem: () => {} },
  DTSettings: { reducedMotion: false, graphics: 'high' },
  Image: class {
    constructor() { this.complete = false; this.naturalWidth = 0; this.naturalHeight = 0; }
    set src(v) {
      this._src = v;
      const b = fs.readFileSync(path.join(root, v));
      this.naturalWidth = b.readUInt32BE(16);
      this.naturalHeight = b.readUInt32BE(20);
      this.complete = true;
    }
    get src() { return this._src; }
  },
  DTRenderer: { prototype: { drawNpc() { throw new Error('Should not hit legacy fallback'); } } }
};
scope.globalThis = scope;
vm.createContext(scope);

for (const f of [
  'world.js', 'content.js', 'engine.js', 'expansion.js', 'frontier.js', 'elemental.js',
  'mythic-content.js', 'quynhkun.js', 'ait01.js', 'ascension.js', 'endless.js', 'journey.js',
  'v09-content.js', 'world-destruction.js', 'shadow.js', 'relic-trials.js', 'v09.js',
  'assets/npcs-v091.js', 'npc-pixel.js', 'v09-visuals.js'
]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), scope, { filename: f });
}

assert(scope.DTNpcPixel.ready(), 'DTNpcPixel must be ready');
assert(scope.DTV09Art.ready(), 'DTV09Art must be ready');
assert.equal(scope.DTNpcOverhaulAtlas.npcs.length, 26);
assert.deepEqual(JSON.parse(JSON.stringify(scope.DTNpcOverhaulAtlas.frames)), { work: 180, greet: 160, interact: 180, total: 520 });

// Exhaustively validate all 13,520 cells!
const ctx = mockCtx();
const renderer = { ctx, game: { time: 0, player: { x: -9999, y: -9999 } } };
let checkedCells = 0;
for (const sp of scope.DTNpcPixel.SPECS) {
  for (const [mode, count] of [['work', 180], ['greet', 160], ['interact', 180]]) {
    const seenCoords = new Set();
    for (let f = 0; f < count; f++) {
      draws.length = 0;
      scope.DTRenderer.prototype.drawNpc.call(renderer, { id: sp.id, type: sp.id, name: sp.name, x: 500, y: 500, animMode: mode, animFrame: f });
      assert.equal(stackDepth, 0);
      assert.equal(draws.length, 1);
      seenCoords.add(`${draws[0].sx},${draws[0].sy}`);
      checkedCells++;
    }
    assert.equal(seenCoords.size, count, `${sp.id} ${mode} must address ${count} distinct cells`);
  }
}
assert.equal(checkedCells, 13520);

// Validate proximity greeting + real F interaction + reduced motion + 25 portraits
const g = new scope.DTGame('an', 71426);
g.start();
g.skipTutorial();
g.consumeEvents();
const lua = g.world.npcs.find(n => n.id === 'weaver_woman');
assert(lua);
g.player.x = lua.x + 400; g.player.y = lua.y;
assert.equal(scope.DTNpcPixel.selectFrame(lua, g).mode, 'work');
g.player.x = lua.x + 80; g.player.y = lua.y;
assert.equal(scope.DTNpcPixel.selectFrame(lua, g).mode, 'greet');
g.player.x = lua.x; g.player.y = lua.y;
g.paused = false;
g.time = 17;
assert(g.interact(), 'F near Chị Lụa must interact');
assert.equal(scope.DTNpcPixel.selectFrame(lua, g).mode, 'interact');
assert.equal(scope.DTNpcPixel.selectFrame(lua, g).frame, 0);
g.paused = true;
scope.performance.now = () => 1500;
assert.equal(scope.DTNpcPixel.selectFrame(lua, g).frame, 15, 'Dialogue must animate while game time is paused');
g.paused = false;
assert.equal(scope.DTNpcPixel.selectFrame(lua, g).frame, 15, 'Closing dialogue must keep the current frame');
g.time += 6;
assert.equal(scope.DTNpcPixel.selectFrame(lua, g).mode, 'greet');

for (const calm of [false, true]) {
  scope.DTSettings.reducedMotion = calm;
  for (const n of scope.DTV09Content.npc) {
    const pCv = { width: 112, height: 112, getContext: () => ctx };
    scope.DTV09Art.drawPortrait(pCv, n.name, 1.25, g);
    assert.equal(stackDepth, 0);
  }
}
scope.DTSettings.reducedMotion = false;

console.log('PASS All 26 NPCs verified across 13,520 frames (180 work / 160 greet / 180 interact) + 25 portraits');
