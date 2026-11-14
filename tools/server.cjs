const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png':'image/png', '.ttf':'font/ttf', '.txt':'text/plain; charset=utf-8' };
const allowed = new Set(['index.html', 'world.js', 'engine.js', 'render.js', 'app.js', 'style.css', 'icon.svg','content.js','expansion.js','frontier.js','scenery.js','visuals.js','controls.js','expansion.css','assets/key-art.png','assets/heroes.png','assets/environment-v03.png','assets/actors-v03.png','elemental.js','elemental-visuals.js','elemental-ui.js','elemental.css','assets/thien-vu-v04.png']);
for(const file of ['assets/thienvu-pixel-v08.png', 'assets/thienvu-pixel-v08.js', 'assets/thienvu-pixel-v08.json', 'assets/thienvu-vfx-pixel.png', 'assets/thienvu-vfx-pixel.js', 'assets/thienvu-vfx-pixel.json', 'thienvu-pixel.js'])allowed.add(file);
for(const file of ['world-pixel.js','world-destruction.js','assets/world-pixel-v08.png','assets/world-pixel-v08.js','assets/world-pixel-v08.json','assets/actors-pixel-v08.png','assets/actors-pixel-v08.js','assets/actors-pixel-v08.json',])allowed.add(file);
for(const file of ['shadow.js', 'quanle-pixel.js', 'assets/quanle-pixel-v08.png', 'assets/quanle-pixel-v08.js', 'assets/quanle-pixel-v08.json', 'assets/quanle-vfx-pixel.png', 'assets/quanle-vfx-pixel.js', 'assets/quanle-vfx-pixel.json'])allowed.add(file);
const isLoopback = address => address === '::1' || /^127\./.test(address || '') || /^::ffff:127\./i.test(address || '');
for(const file of ['assets/hoavi-pixel-v08.png','assets/hoavi-pixel-v08.js','assets/hoavi-pixel-v08.json','assets/hoavi-vfx-pixel.png','assets/hoavi-vfx-pixel.js','assets/hoavi-vfx-pixel.json','hoavi-pixel.js'])allowed.add(file);
for(const file of ['choreography.js','assets/spirit-fx-v07.png','journey.js','journey-ui.js','journey-visuals.js','journey.css','mythic-content.js','ascension.js','endless.js','ascension-visuals.js','ascension-ui.js','ascension.css','fonts.css','assets/fonts/NotoSans-Regular.ttf','assets/fonts/NotoSans-Bold.ttf','assets/fonts/OFL.txt'])allowed.add(file);

function createGameServer(options = {}) {
  const root = options.root || projectRoot;
  const savePath = options.savePath || path.join(root, 'runtime', 'save.json');
  const server = http.createServer((req, res) => {
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    let url;
    try { url = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
    catch { res.writeHead(400); res.end(); return; }
    if (url === '/health') {
      const address = server.address();
      res.writeHead(200, headers);
      res.end(JSON.stringify({ game: 'den-tinh-v1', serverVersion: 8, contentVersion:'0.8.1', lan: address.address === '0.0.0.0' || address.address === '::', port: address.port }));
      return;
    }
    if (url === '/save') {
      // Host disk saves stay private; LAN players save in their own browsers.
      if (!isLoopback(req.socket.remoteAddress)) { res.writeHead(403, headers); res.end('{"error":"host-save-only"}'); return; }
      const port = server.address().port, origin = req.headers.origin;
      const localOrigins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`, `http://[::1]:${port}`, 'http://127.0.0.1:4173']);
      if (localOrigins.has(origin)) {
        headers['Access-Control-Allow-Origin'] = origin; headers.Vary = 'Origin';
        headers['Access-Control-Allow-Headers'] = 'Content-Type'; headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
      }
      if (req.method === 'OPTIONS') { res.writeHead(localOrigins.has(origin) ? 204 : 403, headers); res.end(); return; }
      if (req.method === 'GET') { fs.readFile(savePath, 'utf8', (err, data) => { res.writeHead(200, headers); res.end(err ? 'null' : data); }); return; }
      if (req.method === 'POST') {
        if (!localOrigins.has(origin) || !String(req.headers['content-type']).startsWith('application/json')) { res.writeHead(403, headers); res.end('{}'); return; }
        let body = '';
        req.on('data', chunk => { body += chunk; if (Buffer.byteLength(body,'utf8') > 4*1024*1024) req.destroy(); });
        req.on('end', () => {
          let save;
          try {
            save = JSON.parse(body);
            if (save.version !== 1 || !['an', 'linh', 'kiet', 'hoavi','thienvu'].includes(save.hero) || !save.player || !Number.isFinite(save.player.x) || !Number.isFinite(save.player.y) || !Array.isArray(save.enemies)) throw new Error('Invalid save');
          } catch { res.writeHead(400, headers); res.end('{}'); return; }
          try {
            fs.mkdirSync(path.dirname(savePath), { recursive: true }); fs.writeFileSync(savePath + '.new', JSON.stringify(save)); fs.renameSync(savePath + '.new', savePath);
            res.writeHead(200, headers); res.end('{"saved":true}');
          } catch { res.writeHead(500, headers); res.end('{"saved":false}'); }
        }); return;
      }
      res.writeHead(405, headers); res.end('{}'); return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const name = url === '/' ? 'index.html' : url.slice(1);
    if (!allowed.has(name)) { res.writeHead(404); res.end('Not found'); return; }
    const file = path.resolve(root, name);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
  return server;
}
if (require.main === module) {
  const port = Number(process.env.DENTINH_PORT || 4174);
  const host = process.env.DENTINH_HOST || (process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1');
  createGameServer().listen(port, host, () => console.log(`Den Tinh: http://${host}:${port} (${host === '127.0.0.1' ? 'local' : 'LAN'})`));
}
module.exports = { createGameServer, isLoopback };
