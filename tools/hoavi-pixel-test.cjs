const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.DENTINH_PLAYWRIGHT||'../runtime/qa-tools/node_modules/playwright'),{createGameServer}=require('./server.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.DENTINH_QA_OUTPUT||path.join(root,'design/blender/hoavi')),results=[],errors=[];
const pass=(name,details)=>{results.push({name,pass:true,...details});console.log('PASS '+name)};
(async()=>{
  const server=createGameServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    for(const dpr of [1,2]){
      const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:dpr}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack));
      await p.route('**/save',r=>r.fulfill({contentType:'application/json',body:'null'}));await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForFunction(()=>DTHoaViPixel.ready());
      const pixels=await p.evaluate(()=>{
        const card=document.querySelector('canvas[data-hoavi]');if(!card||card.width!==128||card.height!==128)throw Error('pixel hero card size');
        const cardPixels=card.getContext('2d').getImageData(0,0,128,128).data;if(!cardPixels.some(v=>v))throw Error('pixel hero card missing after atlas load');
        const P=DTHoaViPixel,allowed=new Set(DTHoaViAtlas.palette.map(h=>h.slice(1))),cv=document.createElement('canvas');cv.width=700;cv.height=520;const c=cv.getContext('2d',{willReadFrequently:true});let count=0;
        function check(){const data=c.getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=0;i<data.length;i+=4){if(data[i+3]!==0&&data[i+3]!==255)throw Error('fractional alpha '+data[i+3]);if(data[i+3]){const hex=Array.from(data.slice(i,i+3),v=>v.toString(16).padStart(2,'0')).join('');if(!allowed.has(hex))throw Error('outside palette '+hex);n++}}if(!n)throw Error('empty raster');count+=n;return data}
        const banned=['fillText','strokeText','createRadialGradient','createLinearGradient','arc','ellipse','lineTo'];for(const method of banned)c[method]=()=>{throw Error('forbidden '+method)};
        for(const z of [.8,1.28,2]){
          c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,700,520);c.setTransform(z,0,0,z,13.4,10.6);c.imageSmoothingEnabled=true;
          P.hero(c,{x:150,y:170,facing:Math.PI/2},.12);const a=check(),sx=Math.round(150*z+13.4),sy=Math.round(170*z+10.6);
          for(let y=sy-116;y<sy+8;y+=2)for(let x=sx-64;x<sx+64;x+=2){const i=(y*700+x)*4;for(const delta of [4,700*4,700*4+4])for(let k=0;k<4;k++)if(a[i+k]!==a[i+delta+k])throw Error('non-2x character pixel '+JSON.stringify({z,x,y,sx,sy,k,delta,a:a[i+k],b:a[i+delta+k]}))}
          if(!c.imageSmoothingEnabled||Math.abs(c.getTransform().a-z)>1e-6)throw Error('Canvas state leak '+JSON.stringify({smooth:c.imageSmoothingEnabled,a:c.getTransform().a,z}));
        }
        for(const angle of [0,.41,Math.PI/2,Math.PI,Math.PI*1.4])for(const elapsed of [.02,.08,.17,.25,.32]){
          c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,700,520);const e={x:300,y:260,tx:300+Math.cos(angle)*150,ty:260+Math.sin(angle)*150,maxLife:.35,life:.35-elapsed,echo:elapsed>.2};
          P.screen(c,m=>P.beam(c,e,m));const a=check(),ux=Math.cos(angle),uy=Math.sin(angle);
          for(let y=0;y<520;y++)for(let x=0;x<700;x++)if(a[(y*700+x)*4+3]){const along=(x+.5-300)*ux+(y+.5+34-260)*uy;if(along<-.01||along>150.01)throw Error('beam beyond damage endpoint '+along)}
        }
        for(let i=0;i<8;i++){c.clearRect(0,0,700,520);P.projectile({ctx:c,game:{time:i*.11}},{friendly:true,kind:'code',x:300,y:200,angle:i*Math.PI/4});check()}
        c.clearRect(0,0,700,520);P.screen(c,m=>P.beam(c,{x:100,y:100,tx:100,ty:100,maxLife:.35,life:.2},m));if(c.getImageData(0,0,700,520).data.some(v=>v))throw Error('zero-length beam rendered');
        return{sampledOpaquePixels:count,zoom:[.8,1.28,2],angles:5,beamPhases:5};
      });pass('Binary alpha, exact palette, 2x pixels, bounded beams and Canvas restore at DPR '+dpr,pixels);
      if(dpr===1){
        await p.getByRole('button',{name:/^Chọn HoaVi,/}).click();await p.locator('#startButton').click();await p.locator('#dialogueNext').click();
        const combat=await p.evaluate(()=>{
          const g=denTinh.game,p=g.player;g.skipTutorial();g.cancelActions();g.world.ensureChunks=()=>{};g.world.collision=()=>false;g.effects=[];g.projectiles=[];g.world.enemies=[];g.paused=false;p.x=1500;p.y=1000;p.shield=0;p.code=4;p.mp=p.maxMp;p.cd.q=0;p.invulnerable=0;g.input={dx:0,dy:0,fire:false,aimX:2150,aimY:1100};
          if(!g.skill('q'))throw Error('Q failed');const start={x:p.x,y:p.y};if(!g.effects.some(e=>e.type==='choreo-code-wait'))throw Error('initial ghost missing');
          const main=g.castQueue.find(c=>c.type==='cast');p.x+=20;g.updateCastQueue(main.delay);const echo=g.castQueue.find(c=>c.type==='code-echo');if(echo.x!==start.x||echo.y!==start.y)throw Error('cast origin moved');
          g.updateCastQueue(.349);if(g.effects.some(e=>e.type==='choreo-code-echo'))throw Error('early echo');g.updateCastQueue(.0011);const ghost=g.effects.find(e=>e.type==='choreo-code-echo');if(!ghost||ghost.x!==start.x)throw Error('late/missing echo on miss');
          const save=g.serialize();if(JSON.stringify(save).includes('choreo-code'))throw Error('transient ghost serialized');
          g.cancelActions();g.effects=[];g.checkpoint={x:1520,y:1000,life:5};p.x=1670;p.y=1040;p.action=null;const from={x:p.x,y:p.y};if(!g.skill('e'))throw Error('E recall failed');const blink=g.effects.find(e=>e.type==='choreo-pixel-blink');if(!blink||blink.x!==from.x||blink.y!==from.y||blink.tx!==p.x||blink.ty!==p.y||!p.action.blink)throw Error('blink endpoints/pose');
          g.cancelActions();g.effects=[];g.world.enemies=[{id:'pixel-target',x:1750,y:1000,hp:100000,maxHp:100000,r:15,alive:true,codeFault:2}];g.releaseCast({key:'r',angle:0,power:1,target:{x:1750,y:1000}});g.updateFields(.4);const field=g.mythicFields.find(f=>f.kind==='satellites'),beams=g.effects.filter(e=>e.key==='satellite'&&e.type==='element-beam');if(beams.length!==6||field.pixelAim.length!==6)throw Error('six satellite rays missing '+JSON.stringify({beams:beams.length,count:field.count,aims:field.pixelAim.length,types:g.effects.map(e=>[e.type,e.key,e.eye])}));
          for(const aim of field.pixelAim){const b=beams.find(b=>b.eye===aim.eye);if(b.x!==aim.x||b.y!==aim.y||b.tx!==aim.tx||b.ty!==aim.ty||aim.targetId!=='pixel-target')throw Error('satellite aim differs from damage')}
          return{echoDelay:.35,missEcho:true,blinkEndpoints:true,satelliteOrigins:beams.map(b=>({x:b.x,y:b.y,tx:b.tx,ty:b.ty}))};
        });pass('Q miss and stored ghost origin, exact echo delay, checkpoint endpoints and satellite damage origins',combat);
        // Actual game screenshots; fixtures freeze each skill at a readable phase.
        for(const skill of ['q','echo','e','blink','r']){
          await p.evaluate(skill=>{
            const g=denTinh.game,p=g.player,r=denTinh.renderer;g.cancelActions();g.effects=[];g.projectiles=[];g.paused=false;p.x=1500;p.y=1000;p.invulnerable=0;p.hit=0;p.shield=0;p.code=4;p.mp=p.maxMp;p.ult=100;p.cd.q=p.cd.e=p.cd.r=0;p.moving=false;g.time=10;g.input={dx:0,dy:0,fire:false,aimX:2150,aimY:1100};g.world.enemies=[{id:'pixel-target',type:'slime',x:1690,y:1030,hp:100000,maxHp:100000,r:15,alive:true,speed:0,damage:0,xp:0,gold:0,hit:0}];
            if(skill==='blink'){g.checkpoint={x:1500,y:1000,life:5};p.x=1620;p.y=1040;g.skill('e')}
            else g.skill(skill==='echo'?'q':skill);
            const steps=skill==='r'?27:skill==='q'?18:skill==='echo'?39:skill==='blink'?8:20;for(let i=0;i<steps;i++){g.update(1/60);if(skill==='echo'&&i===15){p.x+=65;p.y+=50;p.facing=-Math.PI/2}}g.paused=true;g.consumeEvents();r.camera={x:1500-640/r.zoom,y:1000-360/r.zoom};r.draw(.016);
          },skill);await p.screenshot({path:path.join(out,'hoavi-pixel-game-'+skill+'.png')});
        }
        pass('Q, checkpoint, 12-slice recall and R screenshots captured in actual browser');
      }
      await context.close();
    }
    assert.deepEqual(errors,[]);pass('No uncaught browser errors');
  }finally{await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,process.env.DENTINH_QA_OUTPUT?'hoavi-pixel-report.json':'pixel-browser-verified.json'),JSON.stringify({pass:errors.length===0&&results.length===5,results,errors,note:'Headless Chrome, DPR 1/2 and emulated zoom; staged combat screenshots.'},null,2))}
})().catch(e=>{console.error(e);process.exitCode=1});
