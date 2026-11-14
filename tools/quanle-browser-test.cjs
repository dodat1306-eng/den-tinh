const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('../runtime/qa-tools/node_modules/playwright'),{createGameServer}=require('./server.cjs');
const out=path.resolve(__dirname,'../qa'),results=[],errors=[];
const pass=(name,details={})=>{results.push({name,pass:true,...details});console.log('PASS '+name)};
(async()=>{
 const server=createGameServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=process.env.DENTINH_BROWSER_URL||'http://127.0.0.1:'+server.address().port+'/',browser=await chromium.launch({channel:'chrome',headless:true});
 async function open(context){
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack));
  await p.route('**/save',r=>r.fulfill({contentType:'application/json',body:r.request().method()==='GET'?'null':'{"saved":true}'}));
  await p.goto(base);await p.waitForFunction(()=>window.DTQuanLePixel?.ready()&&DTWorldPixel.ready());
  assert(!/Kiệt|Lôi Thương/.test(await p.locator('body').innerText()));
  await p.getByRole('button',{name:/^Chọn Quân Lê,/}).click();await p.locator('#startButton').click();await p.locator('#dialogueNext').click();
  await p.evaluate(()=>{const g=denTinh.game;g.skipTutorial();g.consumeEvents();g.world.enemies=[];g.player.crit=0;g.input.aimX=g.player.x+180;g.input.aimY=g.player.y});return p;
 }
 try{
  const context=await browser.newContext({viewport:{width:1280,height:720}}),p=await open(context);
  const start=await p.evaluate(()=>denTinh.game.player.x);await p.keyboard.down('d');await p.waitForTimeout(260);await p.keyboard.up('d');assert(await p.evaluate(x=>denTinh.game.player.x>x+5,start));pass('Quân Lê menu and real keyboard movement');
  const stats=await p.evaluate(()=>{
   const g=denTinh.game;g.paused=true;g.world.enemies=[];g.world.ensureChunks=()=>{};g.world.collision=()=>false;g.effects=[];g.shadowArmy=[];g.shadowRemains=[];g.player.action=null;g.player.mp=g.player.maxMp;g.player.ult=100;g.player.cd.q=g.player.cd.e=g.player.cd.r=0;
   const c=document.createElement('canvas');c.width=1536;c.height=800;const x=c.getContext('2d');let draws=0;const native=x.drawImage;x.drawImage=function(...a){if(this.imageSmoothingEnabled||a.slice(1).some(v=>!Number.isInteger(v)))throw Error('non-pixel draw');draws++;return native.apply(this,a)};x.imageSmoothingEnabled=false;
   for(const [i,s] of SHADOW_BEAST_CATALOG.entries())DTQuanLePixel.beast({ctx:x,game:g},{kind:s.id,x:100+i%8*184,y:180+Math.floor(i/8)*230,hp:s.hp,maxHp:s.hp});
   for(const [i,angle]of [Math.PI/2,0,-Math.PI/2,Math.PI].entries())DTQuanLePixel.hero(x,{x:100+i*160,y:770,facing:angle},g.hero,.3);
   const data=x.getImageData(0,0,c.width,c.height).data;let filled=0;for(let i=3;i<data.length;i+=4){if(data[i]!==0&&data[i]!==255)throw Error('fractional alpha');if(data[i])filled++}if(filled<10000||draws<26)throw Error('missing art');
   return{draws,filled,sheet:c.toDataURL('image/png')};
  });fs.writeFileSync(path.join(out,'v081-all-shadows.png'),Buffer.from(stats.sheet.split(',')[1],'base64'));delete stats.sheet;pass('All 22 shadows and four hero views paint integer texels with binary alpha',stats);
  const armor=await p.evaluate(()=>{const g=denTinh.game;g.paused=false;if(!g.skill('q'))throw Error('Q rejected');g.paused=true;g.consumeEvents();denTinh.renderer.draw(.016);return{armor:g.player.shadowArmor,shield:g.player.shield,atlas:DTChoreography.metrics.atlas}});assert.equal(armor.armor,6.5);assert(armor.shield>=48&&armor.atlas===1);await p.screenshot({path:path.join(out,'v081-armor.png')});pass('Q armor applies immediately and renders new atlas',armor);
  const summon=await p.evaluate(()=>{const g=denTinh.game;g.player.action=null;g.player.cd.e=0;g.shadowRemains=[];DTShadow.remain(g,{type:'willow',x:g.player.x+75,y:g.player.y},'tree');g.paused=false;if(!g.skill('e'))throw Error('E rejected');for(let i=0;i<30;i++){g.pendingHitStop=g.hitStop=0;g.update(1/60)}g.paused=true;g.consumeEvents();denTinh.renderer.draw(.016);return{count:g.shadowArmy.length,kind:g.shadowArmy[0]?.kind}});assert.equal(summon.count,1);assert.equal(summon.kind,'shadow_treant');await p.screenshot({path:path.join(out,'v081-tree-arise.png')});pass('E consumes tree soul and paints wood beast',summon);
  const legion=await p.evaluate(()=>{const g=denTinh.game;g.player.action=null;g.player.ult=100;g.player.cd.r=0;g.paused=false;if(!g.skill('r'))throw Error('R rejected');for(let i=0;i<50;i++){g.pendingHitStop=g.hitStop=0;g.update(1/60)}g.paused=true;g.consumeEvents();
   DTShadow.remain(g,{type:'slime',x:g.player.x+80,y:g.player.y+50});
   const order=[],painted=[],renderer=denTinh.renderer,art=DTQuanLePixel,beast=art.beast,remain=art.remain,effect=renderer.drawEffect;
   art.beast=function(r,s){order.push('body');painted.push(s.kind);return beast(r,s)};
   art.remain=function(r,s){order.push('soul');return remain(r,s)};
   renderer.drawEffect=function(e){if(['shadow-portal','shadow-legion','shadow-web','shadow-roots'].includes(e.type))order.push('ground');return effect.call(this,e)};
   try{renderer.draw(.016)}finally{art.beast=beast;art.remain=remain;renderer.drawEffect=effect}
   if(painted.length!==14||new Set(painted).size!==14)throw Error('Active renderer omitted army bodies: '+JSON.stringify(painted));
   if(!order.includes('soul')||!order.includes('ground')||order.lastIndexOf('ground')>order.indexOf('body'))throw Error('Shadow ground layers cover bodies: '+JSON.stringify(order));
   const restored=DTGame.restore(JSON.parse(JSON.stringify(g.serialize())));const times=[];for(let i=0;i<24;i++){const t=performance.now();denTinh.renderer.draw(.016);times.push(performance.now()-t)}times.sort((a,b)=>a-b);return{painted:painted.length,groundBeforeBodies:true,count:g.shadowArmy.length,restored:restored.shadowArmy.length,distinct:new Set(g.shadowArmy.map(s=>s.kind)).size,medianDrawMs:times[12],p95DrawMs:times[22]}});assert.equal(legion.count,14);assert.equal(legion.restored,14);assert.equal(legion.distinct,14);await p.screenshot({path:path.join(out,'v081-legion.png')});pass('R paints fourteen distinct bodies; save restores entire army',legion);
  await p.evaluate(()=>{DTSettings.reducedMotion=true;DTSettings.graphics='low';denTinh.renderer.draw(.016)});assert.equal(await p.evaluate(()=>DTChoreography.metrics.atlas),1);await p.screenshot({path:path.join(out,'v081-reduced-motion.png')});pass('Reduced motion retains Quân Lê and full legion');await context.close();
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),touch=await open(mobile);
  await touch.locator('[data-touch="q"]').click();await touch.waitForTimeout(100);assert(await touch.evaluate(()=>denTinh.game.player.shadowArmor>0));await touch.screenshot({path:path.join(out,'v081-mobile.png')});pass('Portrait touch Q activates shadow armor');await mobile.close();
  assert.deepEqual(errors,[]);pass('No uncaught browser errors');
 }catch(e){results.push({name:'Browser acceptance',pass:false,error:e.stack});console.error(e);process.exitCode=1}
 finally{await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'v081-browser-report.json'),JSON.stringify({checkedAt:new Date().toISOString(),url:base,pass:results.every(r=>r.pass),stagedCombatFixtures:true,physicalDevice:false,results,errors},null,2))}
})();
