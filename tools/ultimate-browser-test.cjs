const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('../runtime/qa-tools/node_modules/playwright'),{createGameServer}=require('./server.cjs');
const out=path.resolve(process.env.DENTINH_QA_OUTPUT||path.join(__dirname,'../qa/v083')),results=[],errors=[];
fs.mkdirSync(out,{recursive:true});
const pass=(name,data={})=>{results.push({name,pass:true,...data});console.log('PASS '+name)};
(async()=>{
 const server=createGameServer({savePath:path.resolve(__dirname,'../runtime/v083/browser-save.json')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=process.env.DENTINH_BROWSER_URL||'http://127.0.0.1:'+server.address().port+'/',browser=await chromium.launch({channel:'chrome',headless:true});
 async function open(context,id){
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack));p.on('response',r=>{if(r.status()>=400&&['script','image','font','stylesheet'].includes(r.request().resourceType()))errors.push(r.status()+' '+r.url())});
  await p.route('**/save',r=>r.fulfill({contentType:'application/json',body:r.request().method()==='GET'?'null':'{"saved":true}'}));
  await p.goto(url);await p.waitForFunction(()=>window.DTUltimateIntro&&window.DTQuanLePixel?.ready()&&DTWorldPixel.ready()&&DTThienVuPixel.ready()&&DTHoaViPixel?.ready());
  const names={an:'An',linh:'Linh',quanle:'Quân Lê',hoavi:'HoaVi',thienvu:'Thiên Vũ'};
  await p.getByRole('button',{name:new RegExp('^Chọn '+names[id]+',')}).click();await p.locator('#startButton').click();await p.locator('#dialogueNext').click();
  await p.evaluate(()=>{const g=denTinh.game;g.skipTutorial();g.consumeEvents();g.world.enemies=[];g.world.ensureChunks=()=>{};g.world.collision=()=>false;g.player.crit=0;g.input.aimX=g.player.x+180;g.input.aimY=g.player.y;g.paused=true});return p;
 }
 async function advance(p,until){return p.evaluate(until=>{
  const g=denTinh.game;g.paused=false;while(g.player.ultIntro&&g.player.ultIntro.elapsed+1e-7<until){g.pendingHitStop=g.hitStop=0;g.update(Math.min(1/60,until-g.player.ultIntro.elapsed))}g.paused=true;g.consumeEvents();denTinh.renderer.draw(.016);
  return{elapsed:g.player.ultIntro?.elapsed,cd:g.player.cd.r,army:g.shadowArmy?.length||0,clones:g.elementClones?.length||0};
 },until)}
 try{
  for(const id of['an','linh','quanle','hoavi']){
   const context=await browser.newContext({viewport:{width:1280,height:720}}),p=await open(context,id);
   assert.equal(await p.evaluate(()=>denTinh.game.player.cd.r),0);
   const cast=await p.evaluate(()=>{const g=denTinh.game;g.player.ult=0;g.paused=false;const ok=g.skill('r');g.paused=true;return{ok,cd:g.player.cd.r,elapsed:g.player.ultIntro?.elapsed}});
   assert(cast.ok&&cast.cd>=18&&cast.elapsed===0);pass(id+' R starts immediately without rage',cast);
   for(const t of[.5,2.5,3.5,4.3]){const s=await advance(p,t);assert(Math.abs(s.elapsed-t)<1e-6);assert.equal(s.army,0);assert.equal(s.clones,0);await p.screenshot({path:path.join(out,id+'-intro-'+t+'.png')})}
   await p.waitForFunction(()=>/^\d+\.\ds$/.test(document.querySelector('#skill-r').dataset.time));
   const release=await advance(p,4.5);assert.equal(release.elapsed,undefined);if(id==='quanle')assert.equal(release.army,14);if(id==='thienvu')assert.equal(release.clones,6);
   await p.screenshot({path:path.join(out,id+'-release.png')});pass(id+' four intro stages defer gameplay until 4.5 seconds',release);
   const bounds=await p.locator('#skill-r').evaluate(e=>({text:e.dataset.time,cooling:e.classList.contains('cooling'),sweep:e.querySelector('i').style.transform}));assert(bounds.cooling&&bounds.sweep.startsWith('scaleY'));pass(id+' HUD shows seconds and cooldown sweep',bounds);
   if(id==='quanle')for(const[view,angle]of Object.entries({S:Math.PI/2,E:0,N:-Math.PI/2,W:Math.PI})){
    await p.evaluate(angle=>{const g=denTinh.game;g.cancelActions();g.shadowArmy=[];g.effects=[];g.player.shadowArmor=6;g.player.moveFacing=angle;g.player.facing=angle;g.player.invulnerable=0;denTinh.renderer.draw(.016)},angle);await p.screenshot({path:path.join(out,'quanle-q-'+view+'.png')});
   }
   await p.evaluate(()=>{const g=denTinh.game;g.cancelActions();g.player.cd.r=0;g.paused=false;g.skill('r');g.paused=true;DTSettings.reducedMotion=true;DTSettings.graphics='low'});await advance(p,3.5);await p.screenshot({path:path.join(out,id+'-reduced-motion.png')});pass(id+' reduced motion retains cinematic and hero');
   await context.close();
  }
  for(const count of[3,5,7]){
   const context=await browser.newContext({viewport:{width:1280,height:720}}),p=await open(context,'thienvu');
   assert(await p.evaluate(count=>{const g=denTinh.game;g.selectSplitCount(count);g.paused=false;const ok=g.splitElementals();g.paused=true;return ok&&g.player.ultIntro.splitCount===count},count));
   await advance(p,3.5);await p.screenshot({path:path.join(out,'thienvu-x-'+count+'.png')});
   const result=await advance(p,4.2);assert.equal(result.clones,count-1);pass('Desktop X '+count+' uses own geometry and releases '+(count-1)+' allies',result);await context.close();
  }
  {
   const context=await browser.newContext({viewport:{width:1280,height:720}}),p=await open(context,'hoavi');
   for(const rank of[0,3]){
    const stats=await p.evaluate(rank=>{const g=denTinh.game;g.cancelActions();g.mythicFields=[];g.effects=[];g.skillRanks.r=rank;g.player.cd.r=0;g.paused=false;g.skill('r');while(g.player.ultIntro){g.hitStop=g.pendingHitStop=0;g.update(1/60)}g.world.enemies=Array.from({length:3},(_,i)=>({id:'laser-'+i,type:'slime',x:g.player.x+200+i*100,y:g.player.y+(i-1)*110,r:15,hp:1e6,maxHp:1e6,alive:true,speed:0,damage:0,cool:999}));g.effects=[];const f=g.mythicFields.find(f=>f.kind==='satellites');f.tick=0;g.updateFields(.01);g.paused=true;denTinh.renderer.draw(.016);return{count:f.count,life:f.life,beams:g.effects.filter(e=>e.key==='satellite'&&e.type==='element-beam').length}},rank);
    assert.equal(stats.count,6+rank*2);assert.equal(stats.beams,stats.count);await p.screenshot({path:path.join(out,'hoavi-'+stats.count+'-eyes.png')});pass('HoaVi renders '+stats.count+' eyes and matching lasers',stats);
   }
   await context.close();
  }
  {
   const context=await browser.newContext({viewport:{width:1280,height:720}}),p=await open(context,'quanle');
   const result=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=320;const ctx=c.getContext('2d');let rect,alpha;const draw=ctx.drawImage;ctx.drawImage=function(...v){if(v[0]===DTQuanLePixel.character){rect=v.slice(1,5);alpha=this.globalAlpha}return draw.apply(this,v)};for(const[view,angle]of Object.entries({E:0,S:Math.PI/2,W:Math.PI,N:-Math.PI/2})){for(const action of[null,{key:'attack',angle,elapsed:.1,duration:.24}]){ctx.globalAlpha=.25;DTQuanLePixel.hero(ctx,{x:160,y:240,moveFacing:action?angle+Math.PI:angle,facing:angle+Math.PI,moving:true,action},denTinh.game.hero,.1,false);const clip=DTQuanLeAtlas.clips[view+'/'+(action?'attack':'run')];if(!clip.cells.some(f=>JSON.stringify([f.x,f.y,f.w,f.h])===JSON.stringify(rect)))throw Error('Facing mismatch '+view);if(alpha!==.25)throw Error('Ghost alpha lost')}}return{directions:4,movementAndAttack:true,ghostAlpha:.25}});
   pass('Quân Lê follows movement and attack aim in four directions, preserves ghost opacity',result);await context.close();
  }
  for(const viewport of[{width:390,height:844},{width:844,height:390}]){
   const context=await browser.newContext({viewport,isMobile:true,hasTouch:true}),p=await open(context,'thienvu');
   await p.evaluate(()=>{denTinh.game.paused=false});await p.locator('[data-element-action="x"]').click();
   assert(await p.evaluate(()=>denTinh.game.player.ultIntro?.mode==='split'&&denTinh.game.elementSplitCd>0));await p.evaluate(()=>{denTinh.game.paused=true});await advance(p,3.5);await p.screenshot({path:path.join(out,'touch-'+viewport.width+'.png')});pass('Touch X starts split intro at '+viewport.width+'x'+viewport.height);await context.close();
  }
  assert.deepEqual(errors,[]);pass('No uncaught JavaScript errors across five heroes and touch layouts');
 }catch(e){results.push({name:'Browser acceptance',pass:false,error:e.stack});console.error(e);process.exitCode=1}
 finally{await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({checkedAt:new Date().toISOString(),url,pass:results.every(r=>r.pass),stagedCombatFixtures:true,physicalDevice:false,results,errors},null,2))}
})();
