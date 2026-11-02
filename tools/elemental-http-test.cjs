const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createGameServer}=require('./server.cjs');
const root=path.resolve(__dirname,'..'),results=[],fixture=path.join(root,'runtime','elemental-http-'+crypto.randomUUID()+'.json');
for(const f of['world.js','content.js','engine.js','expansion.js','frontier.js','elemental.js'])vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f});
async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS '+name)}catch(error){results.push({name,pass:false,error:error.message});console.error('FAIL '+name+': '+error.message)}}
(async()=>{
  const server=createGameServer({savePath:fixture});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  const g=new DTGame('thienvu',71426);g.start();g.skipTutorial();g.transformElement('nature');g.selectSplitCount(7);g.splitElementals();g.elementClones[0].hp=12;const save=g.serialize();
  const post=(body,origin=base)=>fetch(base+'/save',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    await check('Release health and all five new assets are served',async()=>{assert.equal((await(await fetch(base+'/health')).json()).contentVersion,'0.4.0');for(const file of['elemental.js','elemental-visuals.js','elemental-ui.js','elemental.css','assets/thien-vu-v04.png']){const response=await fetch(base+'/'+file);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),fs.readFileSync(path.join(root,file)))}});
    await check('HTTP accepts and returns a real seven-body elemental save',async()=>{const response=await post(save);assert.equal(response.status,200);assert((await response.json()).saved);const stored=await(await fetch(base+'/save')).json(),restored=DTGame.restore(stored);assert.equal(restored.hero.id,'thienvu');assert.equal(restored.element.id,'nature');assert.equal(restored.elementClones.length,6);assert.equal(restored.elementClones[0].hp,12);assert.equal(restored.elementSplitTime,g.elementSplitTime)});
    await check('Invalid saves cannot overwrite the elemental fixture',async()=>{assert.equal((await post({version:999})).status,400);assert.deepEqual(JSON.parse(fs.readFileSync(fixture,'utf8')),save)});
    await check('An unrelated origin cannot overwrite the fixture',async()=>{assert.equal((await post(save,'https://example.com')).status,403);assert.deepEqual(JSON.parse(fs.readFileSync(fixture,'utf8')),save)});
    await check('Host runtime, tools and project configuration remain private',async()=>{for(const file of['runtime/save.json','tools/server.cjs','package.json','wrangler.jsonc','.git/config'])assert.equal((await fetch(base+'/'+file)).status,404)});
  }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(fixture,{force:true});fs.rmSync(fixture+'.new',{force:true})}
  fs.mkdirSync(path.join(root,'qa'),{recursive:true});fs.writeFileSync(path.join(root,'qa/elemental-http-report.json'),JSON.stringify({checkedAt:new Date().toISOString(),isolatedSave:true,results},null,2));console.log(results.filter(r=>r.pass).length+'/'+results.length+' elemental HTTP checks passed');process.exitCode=results.every(r=>r.pass)?0:1;
})().catch(error=>{console.error(error);process.exitCode=1});
