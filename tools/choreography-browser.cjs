const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.DENTINH_PLAYWRIGHT||'../runtime/qa-tools/node_modules/playwright'),{createGameServer}=require('./server.cjs');
const out=process.env.DENTINH_QA_OUTPUT||path.join(__dirname,'../runtime/qa-v07-motion'),results=[],errors=[];
fs.mkdirSync(out,{recursive:true});const pass=name=>{results.push({name,pass:true});console.log('PASS '+name)};
(async()=>{
 const server=createGameServer({savePath:path.join(__dirname,'../runtime/v07-browser-fixture.json')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=process.env.DENTINH_BROWSER_URL||'http://127.0.0.1:'+server.address().port+'/',browser=await chromium.launch({channel:'chrome',headless:true});
 async function prepare(context,id){
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack));
  if(!process.env.DENTINH_BROWSER_URL)await p.route('**/save',r=>r.fulfill({contentType:'application/json',body:r.request().method()==='GET'?'null':'{"saved":true}'}));
  await p.goto(url);await p.waitForFunction(()=>window.DTChoreography?.texture.naturalWidth===1024&&window.DTElementArt?.art.naturalWidth>0);
  if(id==='thienvu')await p.waitForFunction(()=>DTThienVuPixel.ready());
  if(id==='hoavi')await p.waitForFunction(()=>DTChoreography.hoaviTexture.naturalWidth===DTHoaViAtlas.width);
  const names={an:'An',linh:'Linh',kiet:'Kiệt',hoavi:'HoaVi',thienvu:'Thiên Vũ'};
  await p.getByRole('button',{name:new RegExp('^Chọn '+names[id]+',')}).click();await p.locator('#startButton').click();await p.locator('#dialogueNext').click();
  await p.evaluate(()=>{const g=denTinh.game;g.skipTutorial();g.consumeEvents();g.world.enemies=[];g.player.crit=0;g.input.aimX=g.player.x+160;g.input.aimY=g.player.y+40});
  return p;
 }
 async function stage(p,key,frames){return p.evaluate(({key,frames})=>{
  const g=denTinh.game;g.paused=false;g.cancelActions();g.effects=[];g.player.mp=100;g.player.ult=100;g.player.cd[key]=0;g.player.cd.dash=0;g.input.dx=g.input.dy=0;
  g.input.aimX=g.player.x+160;g.input.aimY=g.player.y+40;
  if(!g.skill(key))throw Error('Skill rejected '+key);
  for(let i=0;i<frames;i++)g.update(1/60);
  g.paused=true;g.consumeEvents();denTinh.renderer.draw(.016);
  return{action:g.player.action?.key,elapsed:g.player.action?.elapsed,pose:DTChoreography.state(g.player,g.time,g.hero),triangles:DTChoreography.metrics.triangles,effects:g.effects.filter(e=>e.type==='choreo-release').length};
 },{key,frames})}
 try{
  for(const id of['an','linh','kiet','hoavi','thienvu']){
   const ctx=await browser.newContext({viewport:{width:1280,height:720},recordVideo:id==='an'?{dir:out,size:{width:1280,height:720}}:undefined}),p=await prepare(ctx,id);
   const start=await p.evaluate(()=>denTinh.game.player.x);await p.keyboard.down('d');await p.waitForTimeout(320);await p.keyboard.up('d');
   assert(await p.evaluate(x=>denTinh.game.player.x>x+10,start));assert(await p.evaluate(()=>['hoavi','thienvu'].includes(denTinh.game.hero.id)?DTChoreography.metrics.atlas===1&&DTChoreography.metrics.triangles===0:DTChoreography.metrics.triangles>0));pass(id+' walking uses its animated atlas or sprite mesh');
   const wind=await stage(p,'q',5);assert.equal(wind.action,'q');assert(wind.pose.wind>0);const release=await stage(p,'q',22);assert(release.effects>0);assert(['hoavi','thienvu'].includes(id)?release.triangles===0:release.triangles>0);pass(id+' Q uses real windup and release timing');
   await stage(p,'e',18);assert(await p.evaluate(()=>denTinh.game.effects.some(e=>e.type==='choreo-release')));pass(id+' E renders its signature release effect');
   if(id==='thienvu')await p.evaluate(()=>{const g=denTinh.game;g.paused=false;g.player.mp=100;g.elementSplitCd=0;g.selectSplitCount(7);if(!g.splitElementals())throw Error('Split rejected');g.paused=true;g.consumeEvents()});
   const ultimate=await stage(p,'r',35);assert(ultimate.effects>0);await p.screenshot({path:path.join(out,'v07-'+id+'-r.png')});pass(id+' R renders with its own visual language');
   if(id==='hoavi'){
    const review=path.join(__dirname,'../design/blender/hoavi');
    await p.evaluate(()=>{const g=denTinh.game,p=g.player;g.cancelActions();g.effects=[];g.projectiles=[];g.paused=false;p.x=1500;p.y=1000;p.mp=p.maxMp;p.code=4;p.cd.q=0;p.invulnerable=0;g.world.collision=()=>false;g.world.ensureChunks=()=>{};g.world.enemies=[{id:'qa-code-target',type:'slime',x:p.x+190,y:p.y+30,hp:100000,maxHp:100000,r:15,alive:true,speed:0,damage:0,xp:0,gold:0,hit:0}];g.input={dx:0,dy:0,fire:false,aimX:p.x+650,aimY:p.y+100};if(!g.skill('q'))throw Error('Q rejected');for(let i=0;i<5;i++)g.update(1/60);g.paused=true;g.consumeEvents();const r=denTinh.renderer;r.camera.x=p.x-640/r.zoom;r.camera.y=p.y-360/r.zoom;r.draw(.016)});
    await p.screenshot({path:path.join(review,'hoavi-game-windup.png')});
    const first=await p.evaluate(()=>{const g=denTinh.game;g.paused=false;for(let i=0;i<10&&!g.castQueue.some(c=>c.type==='code-echo');i++)g.update(1/60);g.paused=true;g.consumeEvents();denTinh.renderer.draw(.016);return{queued:g.castQueue.filter(c=>c.type==='code-echo').length,beam:g.effects.some(e=>e.type==='element-beam'&&e.hero==='hoavi'),fault:g.world.enemies[0].codeFault}});
    assert.equal(first.queued,1);assert(first.beam&&first.fault>0,JSON.stringify(first));await p.screenshot({path:path.join(review,'hoavi-game-q.png')});
    const echo=await p.evaluate(()=>{const g=denTinh.game,origin={x:g.player.x,y:g.player.y};g.player.x+=65;g.player.y+=50;g.player.facing=-Math.PI/2;g.paused=false;for(let i=0;i<60&&!g.effects.some(e=>e.type==='choreo-code-echo');i++)g.update(1/60);g.paused=true;g.consumeEvents();denTinh.renderer.draw(.016);return{origin,ghost:g.effects.find(e=>e.type==='choreo-code-echo'),beam:g.effects.find(e=>e.type==='element-beam'&&e.echo),triangles:DTChoreography.metrics.triangles}});
    assert(echo.ghost&&echo.beam);assert.equal(echo.ghost.x,echo.origin.x);assert.equal(echo.ghost.y,echo.origin.y);assert.equal(echo.triangles,0);await p.screenshot({path:path.join(review,'hoavi-game-echo.png')});pass('HoaVi atlas, Q window, 650px collision beam, fault and delayed phantom captured in browser');
    for(const key of['run','dash','hit']){await p.evaluate(key=>{const g=denTinh.game,p=g.player;g.cancelActions();g.effects=[];g.world.enemies=[];p.facing=.2;p.moving=key==='run';p.dashTime=key==='dash'?.1:0;p.hit=key==='hit'?.1:0;denTinh.renderer.draw(.016)},key);await p.screenshot({path:path.join(review,'hoavi-game-'+key+'.png')})}
    await p.evaluate(()=>{DTSettings.reducedMotion=true;DTSettings.graphics='low';denTinh.renderer.draw(.016)});assert.equal(await p.evaluate(()=>DTChoreography.metrics.atlas),1);assert.equal(await p.evaluate(()=>DTChoreography.metrics.triangles),0);await p.screenshot({path:path.join(review,'hoavi-game-reduced.png')});pass('HoaVi run, dash, hit and reduced-motion atlas render without mesh warp');
   }
   if(id==='thienvu'){
    const all=await p.evaluate(()=>{const g=denTinh.game;denTinh.renderer.draw(.016);return{bodies:DTChoreography.metrics.bodies,clones:g.elementClones.length,synthetic:g.elementClones.filter(c=>DTChoreography.synthetic.has(c)).length}});
    assert.equal(all.clones,6);assert.equal(all.bodies,7);assert(all.synthetic>0);pass('Seven bodies retain distinct elemental sprites and ally casting poses');
    const timings=await p.evaluate(()=>{const r=denTinh.renderer,a=[];for(let i=0;i<22;i++){const t=performance.now();r.draw(.016);a.push(performance.now()-t)}a.sort((x,y)=>x-y);return{median:a[11],p95:a[20],triangles:DTChoreography.metrics.triangles}});assert(timings.triangles<=7*48);results.push({name:'Seven-body synchronous draw timing (headless, paused scene)',pass:true,...timings});
    await p.evaluate(()=>{DTSettings.reducedMotion=true;DTSettings.graphics='low';denTinh.renderer.draw(.016)});assert.equal(await p.evaluate(()=>DTChoreography.metrics.triangles),0);await p.screenshot({path:path.join(out,'v07-reduced-motion.png')});pass('Reduced motion and low detail retain all seven bodies without mesh trails');
   }
   await ctx.close();if(id==='an'){await p.video().saveAs(path.join(out,'v07-an-motion.webm'));assert(fs.statSync(path.join(out,'v07-an-motion.webm')).size>10000);pass('Native browser recording captures movement and skill previews');}
  }
  for(const viewport of[{width:844,height:390},{width:390,height:844}]){
   const ctx=await browser.newContext({viewport,isMobile:true,hasTouch:true}),p=await prepare(ctx,'an');await p.locator('[data-touch="q"]').click();await p.waitForTimeout(240);assert(await p.evaluate(()=>denTinh.game.player.cd.q>0));assert(await p.evaluate(()=>DTChoreography.metrics.triangles>0));await p.screenshot({path:path.join(out,'v07-touch-'+viewport.width+'.png')});pass('Animated touch skill works at '+viewport.width+'x'+viewport.height);await ctx.close();
  }
  assert.deepEqual(errors,[]);pass('All five heroes, splits, detail modes and touch scenes have no uncaught JavaScript errors');
  fs.writeFileSync(path.join(out,'browser-v07-motion-report.json'),JSON.stringify({checkedAt:new Date().toISOString(),url,results,errors,note:'Skill resource fixtures stage visual previews. Real combat is tested separately. Timing is synchronous JS draw cost in a headless paused scene, not a cross-device FPS promise. Touch profiles are emulated.'},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);if(errors.length)console.error(errors);process.exitCode=1});
