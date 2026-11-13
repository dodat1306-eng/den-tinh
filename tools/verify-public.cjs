const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const base = 'https://den-tinh.dodat1306.workers.dev/';
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const walk = (directory, prefix = '') => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(path.join(directory, entry.name), prefix + entry.name + '/') : [prefix + entry.name]);
const report = {
  checkedAt: new Date().toISOString(), url: base, version,
  commit: process.env.DENTINH_RELEASE_COMMIT || null,
  anonymousRequests: true, assets: [], privatePaths: [], pass: false,
};

async function verify() {
  assert.equal(version, '0.7.0');
  const files = walk(dist).filter(file => file !== '_headers').sort();
  assert.equal(files.length, 46, 'Build the complete v0.7 web release with HoaVi pixel art first');
  for (let offset = 0; offset < files.length; offset += 4) {
    await Promise.all(files.slice(offset, offset + 4).map(async file => {
      const response = await fetch(new URL(file, base), {
        signal: AbortSignal.timeout(25000), cache: 'no-store',
      });
      const bytes = Buffer.from(await response.arrayBuffer());
      const sha256 = hash(bytes);
      const cacheControl = response.headers.get('cache-control');
      const matchesLocal = sha256 === hash(fs.readFileSync(path.join(dist, file)));
      report.assets.push({ file, status: response.status, bytes: bytes.length, sha256,
        matchesLocal, cacheControl, contentType: response.headers.get('content-type') });
      assert.equal(response.status, 200, file + ' status');
      assert(matchesLocal, file + ' differs from the local release');
      assert(cacheControl && cacheControl.includes('must-revalidate'), file + ' cache policy');
    }));
  }
  for (const file of ['save', 'runtime/save.json', 'tools/server.cjs', 'Unity/README_VI.md',
    'README.md', 'package.json', 'wrangler.jsonc', '.git/config', '.gitignore', '_headers', 'not-a-game-file.js']) {
    const response = await fetch(new URL(file, base), { signal: AbortSignal.timeout(20000) });
    await response.arrayBuffer();
    report.privatePaths.push({ path: '/' + file, status: response.status });
    assert.equal(response.status, 404, file + ' should not be served');
  }
  report.pass = true;
}

verify().catch(error => {
  report.error = error.message;
  process.exitCode = 1;
}).finally(() => {
  report.assets.sort((a, b) => a.file.localeCompare(b.file));
  fs.mkdirSync(path.join(root, 'qa'), { recursive: true });
  fs.writeFileSync(path.join(root, 'runtime/cloudflare-v07-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ url: base, version, commit: report.commit,
    matchingAssets: report.assets.filter(asset => asset.matchesLocal).length,
    privatePaths404: report.privatePaths.filter(item => item.status === 404).length,
    pass: report.pass, ...(report.error ? { error: report.error } : {}) }));
});
