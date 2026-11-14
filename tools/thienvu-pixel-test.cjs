const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.DENTINH_PLAYWRIGHT||'../runtime/qa-tools/node_modules/playwright'),{createGameServer}=require('./server.cjs');
const root=path.resolve(__dirname,'..'),out=process.env.DENTINH_QA_OUTPUT||path.join(root,'design/blender/thienvu'),results=[],errors=[];
const pass=(name,details={})=>{results.push({name,pass:true,...details});console.log('PASS '+name)};
(async()=>{
  fs.mkdirSync(out,{recursive:true});const server=createGameServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true}),url=process.env.DENTINH_BROWSER_URL||'http://127.0.0.1:'+server.address().port+'/';
  try{
    for(const dpr of [1,2]){
      const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:dpr}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack));
      if(!process.env.DENTINH_BROWSER_URL)await p.route('**/save',r=>r.fulfill({contentType:'application/json',body:'null'}));
      await p.goto(url);await p.waitForFunction(()=>window.DTThienVuPixel?.ready());
      const pixel=await p.evaluate(()=>{
        const P=DTThienVuPixel,meta=DTThienVuAtlas,cv=document.createElement('canvas');cv.width=720;cv.height=560;const c=cv.getContext('2d',{willReadFrequently:true});let checks=0;
        for(const method of ['createRadialGradient','createLinearGradient','arc','ellipse','lineTo','bezierCurveTo','quadraticCurveTo','rotate','clip'])c[method]=()=>{throw Error('forbidden pixel path '+method)};
        const native=c.drawImage;c.drawImage=function(...a){if(this.imageSmoothingEnabled)throw Error('smoothing');if(a.slice(1).some(v=>!Number.isInteger(v)))throw Error('fractional drawImage '+JSON.stringify(a.slice(1)));return native.apply(this,a)};
        const card=document.querySelector('canvas[data-thienvu]');if(!card||card.width!==128||!card.getContext('2d').getImageData(0,0,128,128).data.some(v=>v))throw Error('empty menu atlas');
        const check=(allowed)=>{const a=c.getImageData(0,0,720,560).data;let filled=0;for(let i=0;i<a.length;i+=4){if(![0,255].includes(a[i+3]))throw Error('fractional alpha');if(a[i+3]){const h=Array.from(a.slice(i,i+3),n=>n.toString(16).padStart(2,'0')).join('');if(!allowed.has(h))throw Error('palette '+h);filled++}}if(!filled)throw Error('empty paint');checks++;return a};
        const all=new Set(DTThienVuVFX.palette.map(h=>h.slice(1)));
        for(const [form,spec] of Object.entries(meta.forms)){
          const palette=new Set([...spec.palette,...DTThienVuVFX.palette].map(h=>h.slice(1)));
          for(const [facing,view] of [[0,'E'],[Math.PI/2,'S'],[Math.PI,'W'],[-Math.PI/2,'N']])for(const key of ['idle','run','dash','attack','q','e','r','hit']){
            const actor={x:250,y:230,elementForm:form,facing,moving:key==='run',dashTime:key==='dash'?.1:0,hit:key==='hit'?.1:0};if(['attack','q','e','r'].includes(key))actor.action={key,angle:facing,elapsed:.24,release:.16,duration:.65};
            if(P.frame(actor,2).direction!==view)throw Error('view '+view);c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,720,560);c.setTransform(1.28,0,0,1.28,13.4,10.6);c.imageSmoothingEnabled=true;c.globalAlpha=.37;P.hero(c,actor,2);check(palette);
            if(!c.imageSmoothingEnabled||c.globalAlpha!==.37||Math.abs(c.getTransform().a-1.28)>1e-6)throw Error('state leak');
          }
          for(const angle of [0,.41,Math.PI/2,Math.PI*1.31]){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,720,560);P.projectile({ctx:c,game:{time:.17}},{element:form,x:310,y:270,angle});check(palette)}
        }
        for(const zoom of [.8,1.28,2]){
          c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,720,560);c.setTransform(zoom,0,0,zoom,13.4,10.6);P.hero(c,{x:220,y:180,elementForm:'lightning',facing:Math.PI/2},.01);const data=check(all),sx=Math.round(220*zoom+13.4),sy=Math.round(180*zoom+10.6);
          for(let y=sy-116;y<sy+8;y+=2)for(let x=sx-64;x<sx+64;x+=2){const i=(y*720+x)*4;for(const delta of [4,720*4,720*4+4])for(let k=0;k<4;k++)if(data[i+k]!==data[i+delta+k])throw Error('non-square main pixel')}
        }
        const game={hero:{id:'thienvu'},element:{id:'lightning'},time:.21},renderer={ctx:c,game};
        const cases=[['element-transform','fire'],['element-recall','ice'],['choreo-split','nature'],['element-convergence','light'],['element-impact','earth'],['element-impact','ice'],['bolt','lightning'],['choreo-hit','wind'],['mythic-tether','lightning'],['mythic-tether','ice'],['mythic-tether','nature'],['element-beam','light']];
        for(const [type,element]of cases){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,720,560);P.effect(renderer,{type,element,x:250,y:270,tx:470,ty:300,r:90,maxLife:.6,life:.36,points:Object.keys(meta.forms).map((element,i)=>({element,x:130+i*55,y:400}))});check(all)}
        for(const [kind,element]of [['wall','earth'],['mirror','ice'],['mirror','light'],['sigil','lightning'],['vortex','wind'],['tornado','wind'],['orbs','fire'],['garden','nature'],['vine','nature']]){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,720,560);P.field(renderer,{kind,element,x:320,y:270,r:105,life:4,angle:.37});check(all)}
        P.screen(c,()=>{for(let i=0;i<100;i++)P.segment(c,'split_beam_lightning',i%6,{x:100,y:100},{x:300+i,y:230-i})});const cache=P.cacheStats();if(cache.rasters>64||cache.bytes>8*1024*1024)throw Error('unbounded raster cache');
        return {checks,cache};
      });pass('Binary alpha, per-form palette, all poses/views, integer nearest draws, VFX and bounded cache at DPR '+dpr,pixel);
      if(dpr===1){
        await p.getByRole('button',{name:/^Chọn Thiên Vũ,/}).click();await p.locator('#startButton').click();await p.locator('#dialogueNext').click();
        await p.evaluate(()=>{const g=denTinh.game;g.skipTutorial();g.consumeEvents();g.paused=true});
        await p.evaluate(()=>{const g=denTinh.game;g.paused=false;DTElementUI.openWheel();const cards=[...document.querySelectorAll('#elementWheel canvas')];if(cards.length!==7)throw Error('missing form previews');for(const cv of cards){const box=cv.getBoundingClientRect();if(cv.width!==128||cv.height!==128||box.width!==96||box.height!==96||!cv.getContext('2d').getImageData(0,0,128,128).data.some(v=>v))throw Error('cropped or empty form preview')}DTElementUI.closeWheel();g.paused=true});pass('Element wheel paints all seven square pixel previews');
        async function stage(kind){return p.evaluate(kind=>{
          const g=denTinh.game,p=g.player,r=denTinh.renderer;g.paused=false;g.cancelActions();g.effects=[];g.projectiles=[];g.mythicFields=[];g.elementFields=[];g.castQueue=[];g.elementClones=[];g.elementSplitTime=0;g.elementSplitCd=0;
          p.x=1500;p.y=1000;p.hp=p.maxHp;p.mp=p.maxMp;p.ult=100;p.shield=0;p.invulnerable=0;p.cd.q=p.cd.e=p.cd.r=p.cd.fire=0;
          g.world.collision=()=>false;g.world.ensureChunks=()=>{};g.world.enemies=Array.from({length:9},(_,i)=>({id:'pixel-target-'+i,type:'slime',x:p.x+150+i%3*70,y:p.y-60+Math.floor(i/3)*60,hp:100000,maxHp:100000,r:16,alive:true,speed:0,damage:0,xp:0,gold:0,hit:0}));
          g.input={dx:0,dy:0,fire:false,aimX:p.x+290,aimY:p.y+60};p.facing=Math.atan2(60,290);
          if(kind==='transform-q'){g.transformElement('fire');if(!g.skill('q'))throw Error('Q rejected')}
          if(kind==='ice-e'){g.transformElement('ice');if(!g.skill('e'))throw Error('E rejected')}
          if(kind==='five-cast'||kind==='seven-r'){
            g.transformElement('lightning');g.selectSplitCount(kind==='five-cast'?5:7);if(!g.splitElementals())throw Error('split rejected');
            if(kind==='five-cast'){p.mp=p.maxMp;g.skill('q');for(const clone of g.elementClones)g.castElement(clone.element,'q',clone,.26,false,{x:g.input.aimX,y:g.input.aimY})}
            else {p.ult=100;if(!g.skill('r'))throw Error('R rejected')}
          }
          for(let i=0;i<(kind==='seven-r'?275:13);i++){g.pendingHitStop=g.hitStop=0;g.update(1/60)}
          g.paused=true;g.consumeEvents();r.camera.x=p.x-520/r.zoom;r.camera.y=p.y-390/r.zoom;r.draw(.016);
          const convergence=g.effects.find(e=>e.type==='element-convergence');
          return {bodies:DTChoreography.metrics.bodies,atlas:DTChoreography.metrics.atlas,triangles:DTChoreography.metrics.triangles,clones:g.elementClones.length,convergence:convergence?{x:convergence.x,y:convergence.y,points:convergence.points}:null,aim:{x:g.input.aimX,y:g.input.aimY},synthetic:g.elementClones.filter(c=>DTChoreography.synthetic.has(c)).length,effects:g.effects.length};
        },kind)}
        await p.evaluate(()=>{const cv=document.createElement('canvas');cv.width=400;cv.height=400;const c=cv.getContext('2d');for(const name of ['lineTo','arc','ellipse','rotate','createRadialGradient'])c[name]=()=>{throw Error('outer projectile hook used '+name)};const r=Object.create(Object.getPrototypeOf(denTinh.renderer));r.ctx=c;r.game=denTinh.game;for(const element of Object.keys(DTThienVuAtlas.forms))r.drawProjectile({x:200,y:200,element,friendly:true,signature:true,angle:.3,vx:400,vy:120})});pass('Full projectile hook skips smooth signature trails');
        for(const kind of ['transform-q','ice-e','five-cast','seven-r']){const state=await stage(kind);assert.equal(state.triangles,0);assert.equal(state.atlas,state.bodies);if(kind==='five-cast'){assert.equal(state.bodies,5);assert.equal(state.synthetic,4)}if(kind==='seven-r'){assert.equal(state.bodies,7);assert.equal(state.convergence.points.length,7);assert.deepEqual({x:state.convergence.x,y:state.convergence.y},state.aim)}await p.evaluate(()=>{DTElementUI.sync();DTAscensionUI.sync(denTinh.game)});await p.waitForTimeout(140);await p.screenshot({path:path.join(out,'thienvu-game-'+kind+'.png')});pass('Real browser combat fixture '+kind,state)}
        const transition=await p.evaluate(()=>{const g=denTinh.game,P=DTThienVuPixel;g.cancelActions();g.effects=[];g.elementClones=[];g.elementSplitTime=0;g.elementCinema=null;g.time=10;g.transformElement('fire');const from=DTChoreography.transitions.get(g.player).from,c=document.createElement('canvas').getContext('2d');let n=0;const fn=P.ghost;P.ghost=(...a)=>{n++;return fn(...a)};DTChoreography.drawHero(c,g.player,g.hero,g.time);const first=n;g.time+=.319;DTChoreography.drawHero(c,g.player,g.hero,g.time);const second=n;g.time+=.002;DTChoreography.drawHero(c,g.player,g.hero,g.time);P.ghost=fn;return{first,second,last:n,from}});assert.equal(transition.first,1);assert.equal(transition.second,2);assert.equal(transition.last,2);pass('Transform scanline ghost ends after 0.32 game seconds',transition);
        await p.evaluate(()=>{DTSettings.reducedMotion=true;DTSettings.graphics='low';denTinh.renderer.draw(.016)});assert.equal(await p.evaluate(()=>DTChoreography.metrics.triangles),0);pass('Reduced motion and low graphics keep the pixel atlas');
      }
      await context.close();
    }
    assert.deepEqual(errors,[]);pass('No browser JavaScript errors');
  }catch(error){results.push({name:'Thiên Vũ pixel acceptance',pass:false,error:error.stack});console.error(error);process.exitCode=1}
  finally{await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'pixel-browser-verified.json'),JSON.stringify({pass:results.every(r=>r.pass),source:url,physicalDevice:false,stagedCombatFixtures:true,results,errors},null,2))}
})();
