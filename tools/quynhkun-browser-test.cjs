const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('../runtime/qa-tools/node_modules/playwright'),{createGameServer}=require('./server.cjs');
const out=path.resolve(process.env.DENTINH_QA_OUTPUT||'qa/v100'),results=[],errors=[];fs.mkdirSync(out,{recursive:true});
const pass=name=>{results.push(name);console.log('PASS '+name)};
(async()=>{
 const server=createGameServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=process.env.DENTINH_BROWSER_URL||'http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'chrome',headless:true});
 async function open(mobile){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile}),p=await context.newPage();
  p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('response',r=>{if(r.status()>=400&&['script','image','font','stylesheet'].includes(r.request().resourceType()))errors.push(r.status()+' '+r.url())});
  await p.route('**/save',r=>r.fulfill({contentType:'application/json',body:r.request().method()==='GET'?'null':'{"saved":true}'}));
  await p.goto(url);await p.waitForFunction(()=>window.DTQuynhKunPixel?.ready()&&DTWorldPixel.ready()&&DTV09Art.ready());
  assert.equal(await p.locator('#heroCards button').count(),6);assert((await p.locator('.menu-footer').innerText()).includes('6 NHÂN VẬT'));
  assert.equal(await p.locator('#fatalError').textContent(),'');
  const portrait=await p.locator('canvas[data-quynhkun]').evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return Array.from(data).filter((v,i)=>i%4===3&&v>0).length});assert(portrait>500);
  await p.getByRole('button',{name:/^Chọn Quỳnh Kun,/}).click();await p.screenshot({path:path.join(out,mobile?'menu-mobile.png':'menu-desktop.png')});
  await p.locator('#startButton').click();await p.locator('#dialogueNext').click();
  await p.evaluate(()=>{const g=denTinh.game;g.skipTutorial();g.consumeEvents();g.world.enemies=[];g.world.props=[];g.world.collision=()=>false;g.world.ensureChunks=()=>{};g.passiveState.coins=6;g.player.mp=g.player.maxMp;g.player.cd.e=0;g.player.action=null;g.paused=false});
  return {context,p};
 }
 try{
  const {context,p}=await open(false);pass('Desktop menu has six heroes and rendered Quynh Kun portrait');
  await p.keyboard.press('e');await p.waitForFunction(()=>DTQuynhKun.stakes(denTinh.game).length===2&&denTinh.game.canRecastE());
  await p.waitForFunction(()=>document.getElementById('eName').textContent==='Thu Phù Hộ Thể');
  await p.screenshot({path:path.join(out,'desktop-two-stakes.png')});
  await p.keyboard.press('e');await p.waitForFunction(()=>denTinh.game.player.talismanWard>0);assert.equal(await p.evaluate(()=>DTQuynhKun.stakes(denTinh.game).length),0);pass('Keyboard E places two stakes; HUD changes; second E grants ward');
  await p.waitForFunction(()=>!denTinh.game.player.action);await p.keyboard.press('r');await p.waitForFunction(()=>!!denTinh.game.player.ultIntro);
  await p.evaluate(()=>{const g=denTinh.game;g.paused=false;while(g.player.ultIntro&&g.player.ultIntro.elapsed<3){g.pendingHitStop=g.hitStop=0;g.update(.02)}g.paused=true;g.consumeEvents();denTinh.renderer.draw(.016)});
  await p.screenshot({path:path.join(out,'desktop-ultimate.png')});
  const state=await p.evaluate(()=>{const g=denTinh.game,r=DTGame.restore(JSON.parse(JSON.stringify(g.serialize())));r.world.props=[];r.world.collision=()=>false;r.paused=false;r.started=true;for(let i=0;i<90;i++)r.update(.02);return {intro:r.player.ultIntro,fields:r.mythicFields.filter(f=>f.kind==='heaven-seal').length}});assert.equal(state.intro,null);assert.equal(state.fields,1);pass('Browser R intro renders and save resumes exactly one heaven field');
  await p.evaluate(()=>{const g=denTinh.game;g.paused=false;while(g.player.ultIntro){g.pendingHitStop=g.hitStop=0;g.update(.02)}g.paused=true;g.consumeEvents();denTinh.renderer.draw(.016)});
  await p.screenshot({path:path.join(out,'desktop-heaven-field.png')});
  await context.close();
  const mobile=await open(true);assert.equal(await mobile.p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await mobile.p.locator('[data-touch="e"]').tap();await mobile.p.waitForFunction(()=>denTinh.game.canRecastE());await mobile.p.waitForFunction(()=>document.querySelector('[data-touch="e"]').textContent==='E · THU PHÙ');
  const box=await mobile.p.locator('[data-touch="e"]').boundingBox();assert(box.width>=44&&box.height>=44);await mobile.p.screenshot({path:path.join(out,'mobile-two-stakes.png')});
  await mobile.p.locator('[data-touch="e"]').tap();await mobile.p.waitForFunction(()=>denTinh.game.player.talismanWard>0);pass('390px mobile fits screen; 44px touch E places and recalls two stakes');await mobile.context.close();
  assert.deepEqual(errors,[]);pass('No browser console errors, missing resources or fatal startup errors');
 }finally{fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({url,pass:errors.length===0&&results.length===5,results,errors},null,2));await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
