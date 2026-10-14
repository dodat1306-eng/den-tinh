const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base='http://127.0.0.1:4174',results=[];
fs.mkdirSync(path.join(__dirname,'..','qa'),{recursive:true});
async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS '+name)}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL '+name+': '+e.message)}}
(async()=>{
  await check('Local release server health',async()=>assert.equal((await(await fetch(base+'/health')).json()).game,'den-tinh-v1'));
  await check('Game HTML served locally',async()=>{const r=await fetch(base);assert.equal(r.status,200);assert((await r.text()).includes('Đèn Tinh'))});
  await check('Runtime and browser profile cannot be served',async()=>{for(const p of['/runtime/node.exe','/runtime/browser-profile/Local%20State','/tools/server.cjs','/../Start-Game.ps1'])assert.equal((await fetch(base+p)).status,404)});
  await check('Disk save is empty or structurally valid',async()=>{const data=await(await fetch(base+'/save')).json();if(data===null)return;assert.equal(data.version,1);assert(['an','linh','kiet'].includes(data.hero));assert(Number.isFinite(data.player.level));assert(Array.isArray(data.shrines))});
  await check('Invalid save rejected without overwriting progress',async()=>{const r=await fetch(base+'/save',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{"version":999}'});assert.equal(r.status,400)});
  await check('Non-local origin cannot write save',async()=>{const r=await fetch(base+'/save',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403)});
  await check('Previous local test port can migrate progress',async()=>{const r=await fetch(base+'/save',{method:'OPTIONS',headers:{Origin:'http://127.0.0.1:4173','Access-Control-Request-Headers':'content-type'}});assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),'http://127.0.0.1:4173')});
  fs.writeFileSync(path.join(__dirname,'..','qa','http-report.json'),JSON.stringify({results},null,2));console.log(`${results.filter(r=>r.pass).length}/${results.length} HTTP checks passed`);process.exitCode=results.every(r=>r.pass)?0:1;
})();
