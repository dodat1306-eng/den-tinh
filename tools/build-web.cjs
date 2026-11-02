const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const output = path.resolve(root, 'dist');
const files = [
  'index.html', 'world.js', 'engine.js', 'render.js', 'app.js',
  'style.css', 'icon.svg', 'content.js', 'expansion.js', 'visuals.js',
  'controls.js', 'expansion.css', 'assets/key-art.png', 'assets/heroes.png',
  'frontier.js', 'scenery.js',
  'assets/environment-v03.png',
  'assets/actors-v03.png',
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
