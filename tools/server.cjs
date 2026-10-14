const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json; charset=utf-8'};
const port=Number(process.env.DENTINH_PORT||4174);
const savePath=path.join(root,'runtime','save.json');
const allowed=new Set(['index.html','world.js','engine.js','render.js','app.js','style.css','icon.svg']);
http.createServer((req,res)=>{
  let url;try{url=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}catch(e){res.writeHead(400);res.end();return}
  if(url==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({game:'den-tinh-v1'}));return}
  if(url==='/save'){
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
    const origin=req.headers.origin,localOrigins=new Set([`http://127.0.0.1:${port}`,'http://127.0.0.1:4173']);
    if(localOrigins.has(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Vary']='Origin';headers['Access-Control-Allow-Headers']='Content-Type';headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS'}
    if(req.method==='OPTIONS'){res.writeHead(localOrigins.has(origin)?204:403,headers);res.end();return}
    if(req.method==='GET'){fs.readFile(savePath,'utf8',(err,data)=>{res.writeHead(200,headers);res.end(err?'null':data)});return}
    if(req.method==='POST'){
      if(!localOrigins.has(origin)||!String(req.headers['content-type']).startsWith('application/json')){res.writeHead(403,headers);res.end('{}');return}
      let body='',tooLarge=false;
      req.on('data',chunk=>{body+=chunk;if(body.length>160000){tooLarge=true;req.destroy()}});
      req.on('end',()=>{if(tooLarge)return;let save;
        try{save=JSON.parse(body);if(save.version!==1||!['an','linh','kiet'].includes(save.hero)||!save.player||!Number.isFinite(save.player.x)||!Array.isArray(save.enemies))throw new Error('Invalid save')}catch(e){res.writeHead(400,headers);res.end('{}');return}
        try{fs.mkdirSync(path.dirname(savePath),{recursive:true});fs.writeFileSync(savePath+'.new',JSON.stringify(save));fs.renameSync(savePath+'.new',savePath);res.writeHead(200,headers);res.end('{"saved":true}')}catch(e){res.writeHead(500,headers);res.end('{"saved":false}')}
      });return;
    }
    res.writeHead(405,headers);res.end('{}');return;
  }
  const name=url==='/'?'index.html':url.slice(1);
  if(!allowed.has(name)){res.writeHead(404);res.end('Not found');return}
  const file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data)})
}).listen(port,'127.0.0.1',()=>console.log(`Den Tinh: http://127.0.0.1:${port}`));
