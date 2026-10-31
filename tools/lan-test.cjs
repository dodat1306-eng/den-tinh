const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createGameServer}=require('./server.cjs');
const root=path.resolve(__dirname,'..'),qa=path.join(root,'qa');fs.mkdirSync(qa,{recursive:true});
const fixture=path.join(qa,'lan-test-save.json');
const ips=Object.values(os.networkInterfaces()).flat().filter(x=>x.family==='IPv4'&&!x.internal&&!x.address.startsWith('169.254.'));
const lanIp=process.env.DENTINH_TEST_LAN_IP||ips.find(x=>x.address.startsWith('10.'))?.address||ips[0]?.address;
const results=[],server=createGameServer({savePath:fixture});
const fetchLocal=(url,options={})=>fetch(url,{...options,signal:AbortSignal.timeout(4000)});
async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS '+name)}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL '+name+': '+e.message)}}
(async()=>{
  const original={version:1,hero:'an',player:{x:740,y:2200},enemies:[],marker:'host-private-fixture'};
  fs.writeFileSync(fixture,JSON.stringify(original));
  try{
    assert(lanIp,'No LAN address found');
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'0.0.0.0',resolve)});
    const port=server.address().port,local=`http://127.0.0.1:${port}`,lan=`http://${lanIp}:${port}`;
    await check('Server binds all IPv4 interfaces for LAN',async()=>{assert.equal(server.address().address,'0.0.0.0');assert((await(await fetchLocal(lan+'/health')).json()).lan)});
    await check('Every game asset is available through LAN address',async()=>{for(const file of['','app.js','engine.js','world.js','render.js','style.css','icon.svg','content.js','expansion.js','visuals.js','controls.js','expansion.css','assets/key-art.png','assets/heroes.png'])assert.equal((await fetchLocal(lan+'/'+file)).status,200,file)});
    await check('LAN client cannot read host save',async()=>assert.equal((await fetchLocal(lan+'/save')).status,403));
    await check('LAN client cannot write host save with forged Origin',async()=>{const r=await fetchLocal(lan+'/save',{method:'POST',headers:{Origin:local,'Content-Type':'application/json'},body:JSON.stringify({...original,marker:'remote-overwrite'})});assert.equal(r.status,403);assert.deepEqual(JSON.parse(fs.readFileSync(fixture,'utf8')),original)});
    await check('LAN preflight cannot grant host save access',async()=>assert.equal((await fetchLocal(lan+'/save',{method:'OPTIONS',headers:{Origin:local}})).status,403));
    await check('Loopback retains host disk save read access',async()=>assert.deepEqual(await(await fetchLocal(local+'/save')).json(),original));
    await check('Loopback retains host disk save write access',async()=>{const update={...original,marker:'updated-by-host'};const r=await fetchLocal(local+'/save',{method:'POST',headers:{Origin:local,'Content-Type':'application/json'},body:JSON.stringify(update)});assert.equal(r.status,200);assert.deepEqual(JSON.parse(fs.readFileSync(fixture,'utf8')),update)});
    await check('Invalid host save and unrelated origins are rejected',async()=>{assert.equal((await fetchLocal(local+'/save',{method:'POST',headers:{Origin:local,'Content-Type':'application/json'},body:'{}'})).status,400);assert.equal((await fetchLocal(local+'/save',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:'{}'})).status,403)});
    await check('Private runtime files remain unavailable over LAN',async()=>{for(const file of['runtime/save.json','runtime/node.exe','runtime/browser-profile/Local%20State','tools/enable-lan-firewall.ps1','../Start-Game.ps1'])assert.equal((await fetchLocal(lan+'/'+file)).status,404,file)});
    await check('Static files support HEAD and reject POST',async()=>{const head=await fetchLocal(lan+'/app.js',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal((await fetchLocal(lan+'/app.js',{method:'POST'})).status,405)});
    console.log(`${results.filter(x=>x.pass).length}/${results.length} LAN checks passed`);
    fs.writeFileSync(path.join(qa,'lan-test-report.json'),JSON.stringify({lanIp,results},null,2));
  }finally{if(server.listening)await new Promise(resolve=>server.close(resolve));if(fs.existsSync(fixture))fs.unlinkSync(fixture)}
  process.exitCode=results.length===10&&results.every(x=>x.pass)?0:1;
})().catch(e=>{console.error(e);process.exitCode=1});
