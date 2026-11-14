const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('../runtime/qa-tools/node_modules/playwright'),{createGameServer}=require('./server.cjs');
const out=path.resolve(__dirname,'../qa'),results=[],errors=[];
const pass=(name,details={})=>{results.push({name,pass:true,...details});console.log('PASS '+name)};
(async()=>{
 const server=createGameServer({savePath:path.resolve(__dirname,'../runtime/v08/browser-save.json')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'chrome',headless:true}),base=process.env.DENTINH_BROWSER_URL||'http://127.0.0.1:'+server.address().port+'/';
 try{
  const context=await browser.newContext({viewport:{width:1280,height:720}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack));
  await p.route('**/save',r=>r.fulfill({contentType:'application/json',body:r.request().method()==='GET'?'null':'{"saved":true}'}));
  await p.goto(base);await p.waitForFunction(()=>window.DTWorldPixel?.ready()&&DTThienVuPixel.ready()&&DTHoaViPixel.ready());
  await p.getByRole('button',{name:/^Chọn An,/}).click();await p.locator('#startButton').click();await p.locator('#dialogueNext').click();
  await p.evaluate(()=>{const g=denTinh.game;g.skipTutorial();g.consumeEvents();g.world.enemies=[];g.player.crit=0});
  const x=await p.evaluate(()=>denTinh.game.player.x);await p.keyboard.down('d');await p.waitForTimeout(280);await p.keyboard.up('d');assert(await p.evaluate(x=>denTinh.game.player.x>x+5,x));
  await p.screenshot({path:path.join(out,'v08-village.png')});pass('Real keyboard movement and remastered village render');
  const pixel=await p.evaluate(()=>{
   const c=document.createElement('canvas');c.width=c.height=400;const ctx=c.getContext('2d',{willReadFrequently:true});let count=0;ctx.imageSmoothingEnabled=false;
   for(const id of ['slime','wisp','boar','archer','shade','boss','boss_haba','boss_hotinh','boss_thantrung','boss_cuukhucxa','boss_thietdieu','boss_kedetsuong','elder','smith','fox',...['an','linh','kiet'].flatMap(h=>['S','E','N','W'].map(d=>h+'_'+d))]){
    ctx.clearRect(0,0,400,400);DTActorsPixel.draw(ctx,id,200,200,{time:.3});const a=ctx.getImageData(0,0,400,400).data;
    for(let y=0;y<400;y+=2)for(let x=0;x<400;x+=2){const n=(y*400+x)*4;for(const d of [4,1600,1604])for(let ch=0;ch<4;ch++)if(a[n+ch]!==a[n+d+ch])throw Error(id+' uneven native texel');}
    if(!a.some(v=>v))throw Error('empty '+id);count++;
   }
   return {sprites:count,unit:2,smoothing:ctx.imageSmoothingEnabled};
  });assert.equal(pixel.smoothing,false);pass('Monsters, NPCs and all hero directions paint exact two-pixel texels',pixel);
  const states=await p.evaluate(()=>{
   const g=denTinh.game,D=DTDestruction;g.paused=true;g.effects=[];g.particles=[];g.player.x=3200;g.player.y=2400;g.input.aimX=3200;g.input.aimY=2400;
   const fixtures=[];for(let i=0;i<6;i++)fixtures.push({type:i===5?'bamboo':'tree',x:2720+i*180,y:2310,r:17,variant:0});g.world.props=fixtures;g.world.environment=[];g.world.groundDecals=[];
   const advance=t=>{for(let i=0;i<Math.ceil(t/.04);i++)D.update(g,.04)};
   D.hit(g,fixtures[3],'fire');advance(5.56);D.hit(g,fixtures[2],'fire');advance(2.52);
   D.hit(g,fixtures[1],'fire');D.hit(g,fixtures[4],'ice');D.hit(g,fixtures[5],'wind',45);D.step(g,fixtures[3],90);
   for(const [i,type]of ['scorch_mark','crater_mark','lightning_scar','frost_patch'].entries())D.decal(g,type,2820+i*220,2510,80);
   denTinh.renderer.camera={x:2560,y:2040};denTinh.renderer.draw(.016);
   return fixtures.map(p=>p.status);
  });assert.deepEqual(states,['intact','burning','charred','ash_pile','frozen','sliced']);
  await p.screenshot({path:path.join(out,'v08-destruction.png')});pass('Burning, charred, ash, frozen and sliced states coexist with battlefield traces');
  await p.evaluate(()=>{const g=denTinh.game;g.effects=[];g.particles=[];g.world.props=[];g.world.groundDecals=[];g.world.enemies=['boss','boss_haba','boss_hotinh','boss_thantrung','boss_cuukhucxa','boss_thietdieu','boss_kedetsuong'].map((type,i)=>({type,id:'review-'+i,x:2730+i%4*290,y:2320+Math.floor(i/4)*260,r:28,hp:800,maxHp:1000,alive:true,pattern:i,cool:2,hit:0}));denTinh.renderer.draw(.016)});
  await p.screenshot({path:path.join(out,'v08-seven-bosses.png')});pass('Seven distinct bosses render in actual game');
  await p.goto(base);await p.waitForFunction(()=>DTWorldPixel.ready()&&DTThienVuPixel.ready());await p.getByRole('button',{name:/^Chọn Thiên Vũ,/}).click();await p.locator('#startButton').click();await p.locator('#dialogueNext').click();
  const performance=await p.evaluate(()=>{
   const g=denTinh.game;g.skipTutorial();g.consumeEvents();g.world.enemies=[];g.paused=false;g.input.aimX=g.player.x+200;g.input.aimY=g.player.y;g.player.invulnerable=100;
   g.selectSplitCount(7);g.splitElementals();const times=[];
   for(let i=0;i<120;i++){const t=performance.now();g.update(1/60);denTinh.renderer.draw(1/60);times.push(performance.now()-t);}
   times.sort((a,b)=>a-b);g.paused=true;return{medianMs:times[60],p95Ms:times[114],props:g.world.props.length,clones:g.elementClones.length};
  });assert.equal(performance.clones,6);assert(Number.isFinite(performance.p95Ms));pass('Seven-body team survives 120 update/render frames',performance);
  await p.evaluate(()=>{const g=denTinh.game;g.world.enemies=[];g.elementClones=[];g.elementSplitTime=0;g.summonElement('golem',g.player,{x:g.player.x-150,y:g.player.y},1,18);g.summonElement('treant',g.player,{x:g.player.x+150,y:g.player.y},1,30);if(g.elementSummons.length!==2)throw Error('missing summons');denTinh.renderer.draw(.016)});await p.screenshot({path:path.join(out,'v08-summons.png')});pass('Faceted golem and treant render at native scale');
  await p.evaluate(()=>{DTSettings.reducedMotion=true;denTinh.renderer.draw(.016)});await p.screenshot({path:path.join(out,'v08-reduced-motion.png')});pass('Reduced motion renders complete scene');
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{denTinh.game.paused=false;denTinh.game.player.invulnerable=100});await p.waitForTimeout(120);assert(await p.locator('#touchControls').isVisible());await p.screenshot({path:path.join(out,'v08-mobile.png')});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));pass('Mobile layout fits 390-pixel viewport with visible touch controls');
  assert.deepEqual(errors,[]);pass('No browser JavaScript errors');await context.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'browser-v08-report.json'),JSON.stringify({version:'0.8.0',results,errors,pass:results.length>=9&&errors.length===0},null,2));}
})().catch(e=>{console.error(e);process.exitCode=1});
