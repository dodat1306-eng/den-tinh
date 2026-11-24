const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const output = path.resolve(root, 'dist');
const files = ['biome-monsters.js', 'combat-rework.js', 'relic-synergies.js', 'world-events.js', 'biome-visuals.js', 'huyenkha-pixel.js', 'assets/huyenkha-r.png', 'assets/huyenkha-moves.png', 'assets/huyenkha-e.png',
  'assets/biome-monsters-v1.png', 'assets/biome-monsters-v1.json', 'assets/biome-monsters-v1.js',
  'assets/ait01-pixel-v1.png','assets/ait01-pixel-v1.json','assets/ait01-pixel-v1.js','assets/ait01-vfx-pixel.png','assets/ait01-vfx-pixel.json','assets/ait01-vfx-pixel.js','ait01-pixel.js','ait01.js',
  'assets/quynhkun-pixel-v1.png','assets/quynhkun-pixel-v1.json','assets/quynhkun-pixel-v1.js','assets/quynhkun-vfx-pixel.png','assets/quynhkun-vfx-pixel.json','assets/quynhkun-vfx-pixel.js','quynhkun-pixel.js',
  'v09-content.js','v09.js','relic-trials.js','v09-ui.js','v09-visuals.js','assets/relics-pixel-v09.png','assets/npcs-v091.png','assets/npcs-v091.js','assets/npcs-v091.json',
  'shadow.js','quanle-pixel.js','assets/quanle-pixel-v1.png','assets/quanle-pixel-v1.js','assets/quanle-pixel-v1.json','assets/quanle-vfx-pixel.png','assets/quanle-vfx-pixel.js','assets/quanle-vfx-pixel.json','assets/quanle-monarch-moves.png','assets/quanle-monarch-r.png','assets/quanle-monarch-portrait.png','assets/quanle-monarch-keyart.png',
  'world-pixel.js','world-destruction.js','assets/world-pixel-v08.png','assets/world-pixel-v08.js','assets/world-pixel-v08.json','assets/actors-pixel-v1.png','assets/actors-pixel-v1.js','assets/actors-pixel-v1.json',
  'assets/thienvu-pixel-v08.png','assets/thienvu-pixel-v08.js','assets/thienvu-pixel-v08.json','assets/thienvu-vfx-pixel.png','assets/thienvu-vfx-pixel.js','assets/thienvu-vfx-pixel.json','thienvu-pixel.js',
  'index.html', 'world.js', 'engine.js', 'render.js', 'ultimate-intro.js', 'app.js',
  'style.css', 'icon.svg', 'content.js', 'expansion.js', 'visuals.js',
  'controls.js', 'expansion.css', 'assets/key-art.png', 'assets/heroes.png',
  'frontier.js', 'scenery.js',
  'assets/environment-v03.png',
  'assets/actors-v03.png',
  'elemental.js', 'elemental-visuals.js', 'elemental-ui.js', 'elemental.css', 'assets/thien-vu-v04.png',
  'choreography.js','assets/spirit-fx-v07.png','assets/hoavi-pixel-v08.png','assets/hoavi-pixel-v08.js','assets/hoavi-pixel-v08.json','assets/hoavi-vfx-pixel.png','assets/hoavi-vfx-pixel.js','assets/hoavi-vfx-pixel.json','hoavi-pixel.js','journey.js', 'journey-ui.js', 'journey-visuals.js', 'journey.css', 'mythic-content.js', 'quynhkun.js','ascension.js', 'endless.js', 'ascension-visuals.js', 'ascension-ui.js', 'ascension.css', 'fonts.css',
  'assets/fonts/NotoSans-Regular.ttf', 'assets/fonts/NotoSans-Bold.ttf', 'assets/fonts/OFL.txt',
];

// Publish only this allowlist; never copy local saves, tools or Unity files.
assert.equal(path.dirname(output), root);
assert.equal(path.basename(output), 'dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const file of files) {
  const target = path.resolve(output, file);
  assert(target.startsWith(output + path.sep));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, file), target);
  assert(fs.statSync(target).size < 25 * 1024 * 1024, `${file} exceeds the asset limit`);
}

const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
for (const [, resource] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  assert(files.includes(resource), `Missing or unexpected HTML resource: ${resource}`);
}

// Revalidate unchanged filenames so a new release does not mix old JS/CSS.
fs.writeFileSync(path.join(output, '_headers'), '/*\n  Cache-Control: public, max-age=0, must-revalidate\n');
console.log(`Web build ready: ${files.length} game files and _headers in ${output}`);
