// Executes the complete renderer against a numeric-validating canvas context.
// This catches bad action interpolation, negative-world terrain and missing hooks.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const project=path.resolve(__dirname,'..');
let drawCalls=0;
const imageCalls=[];
function checked(name,args){
  drawCalls++;
  for(const arg of args)if(typeof arg==='number')assert(Number.isFinite(arg),name+' received non-finite coordinate');
}
function context(){
  let currentFont='10px sans-serif';
  const proto={};Object.defineProperty(proto,'font',{get(){return currentFont},set(v){currentFont=v},configurable:true});
  const c=Object.create(proto);
  Object.assign(c,{fillStyle:'#000',strokeStyle:'#000',globalAlpha:1,lineWidth:1,canvas:{width:1280,height:720},measureText:t=>({width:String(t).length*7}),createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4),width:w,height:h}},getImageData(x,y,w,h){return this.createImageData(w,h)},putImageData(){},createRadialGradient(...a){checked('radial',a);return{addColorStop(){}}},createLinearGradient(...a){checked('linear',a);return{addColorStop(){}}}});
  for(const name of['save','restore','beginPath','closePath','fill','stroke','clip','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','ellipse','arc','arcTo','rect','fillRect','strokeRect','clearRect','translate','rotate','scale','transform','setTransform','resetTransform','drawImage','fillText','strokeText','setLineDash'])c[name]=function(...args){checked(name,args);if(name==='drawImage'&&args[0]?._src)imageCalls.push({src:args[0]._src,args:args.slice(1)});if((name==='arc'||name==='ellipse')&&typeof args[2]==='number')assert(args[2]>=0,name+' radius must be nonnegative')};
  return c;
}
function canvas(w=1280,h=720){const c=context();return{width:w,height:h,getContext:()=>c,toDataURL:()=>'',ctx:c}}
global.document={createElement:()=>canvas(),querySelectorAll:()=>[]};
global.Image=class{constructor(){this.complete=false;this.naturalWidth=0;this.decoding='async'}set src(v){this._src=v;this.complete=true;this.naturalWidth=this.naturalHeight=1254}};
global.DTSettings={graphics:'high',reducedMotion:false};
for(const f of['world.js','content.js','engine.js','expansion.js','frontier.js','elemental.js','mythic-content.js','ascension.js','endless.js','render.js','visuals.js','scenery.js','assets/thienvu-pixel-v08.js','assets/thienvu-vfx-pixel.js','thienvu-pixel.js','elemental-visuals.js','ascension-visuals.js'])if(fs.existsSync(path.join(project,f)))vm.runInThisContext(fs.readFileSync(path.join(project,f),'utf8'),{filename:f});
const results=[];
function test(name,fn){try{fn();results.push({name,pass:true});console.log('PASS '+name)}catch(e){results.push({name,pass:false,error:e.stack});console.error('FAIL '+name+' '+e.stack)}}
const Art=DTAscensionArt;
test('Heroes keep their atlas cells; all seven Thien Vu forms use 64px pixel cells at unit two for heroes and clones',()=>{
  const c=context();
  for(const hero of Object.values(DTWorld.HEROES))for(const element of hero.id==='thienvu'?DTElements.forms.map(f=>f.id):['lightning']){
    const before=imageCalls.length;
    Art.drawSpriteHero(c,{x:100,y:100,facing:0,elementForm:element},hero,0);
    const drawn=imageCalls.slice(before).filter(call=>['assets/heroes.png','assets/thienvu-pixel-v08.png'].includes(call.src));
    assert.equal(drawn.length,1,hero.id+' needs one body sprite');
    if(hero.id==='thienvu'){
      const cell=DTThienVuAtlas.forms[element].actions.idle.directions.E[0];
      assert.equal(drawn[0].src,'assets/thienvu-pixel-v08.png');
      assert.deepEqual(drawn[0].args.slice(0,4),[cell.x,cell.y,64,64]);
      assert.deepEqual(drawn[0].args.slice(-2),[128,128]);
    }else{
      assert.equal(drawn[0].src,'assets/heroes.png');
      assert.equal(drawn[0].args[0],0);
      assert.equal(drawn[0].args[1],['an','linh','kiet','hoavi'].indexOf(hero.id)*313.5);
    }
  }
  const g=new DTGame('thienvu',71426),r=new DTRenderer(canvas(),g);g.start();g.skipTutorial?.();
  for(const element of DTElements.forms.map(f=>f.id)){
    const before=imageCalls.length;r.drawElementClone({x:100,y:100,element,hp:20,maxHp:40,facing:Math.PI,alive:true});
    const drawn=imageCalls.slice(before).filter(call=>call.src==='assets/thienvu-pixel-v08.png');
    const cell=DTThienVuAtlas.forms[element].actions.idle.directions.W[0];
    assert.equal(drawn.length,1);assert.deepEqual(drawn[0].args.slice(0,4),[cell.x,cell.y,64,64]);
    assert.deepEqual(drawn[0].args.slice(-2),[128,128]);
  }
});
test('Cast poses remain finite and complete at anticipation, release and recovery',()=>{
  for(const key of['attack','q','e','r'])for(let i=0;i<=100;i++){
    const p=Art.actionPose({moving:true,stride:i*.1,velocityX:170,velocityY:20,action:{key,elapsed:i*.01,duration:1,windup:.2,release:.2,recovery:.3,angle:.7}},i*.01);
    for(const value of Object.values(p))if(typeof value==='number')assert(Number.isFinite(value));assert(p.progress>=0&&p.progress<=1);assert(p.anticipation>=0&&p.anticipation<=1);
  }
});
test('Original sprites keep finite cast motion in both facing directions',()=>{
  const c=context();let count=0;
  for(const hero of Object.values(DTWorld.HEROES))for(const element of hero.id==='thienvu'?DTElements.forms.map(f=>f.id):['lightning'])for(const face of[0,Math.PI])for(const key of['attack','q','e','r'])for(const elapsed of[0,.1,.2,.35,.6]){
    Art.drawSpriteHero(c,{x:100,y:100,velocityX:120,velocityY:35,stride:1.4,moving:true,facing:face,shield:14,elementForm:element,action:{key,elapsed,duration:.65,windup:.2,release:.2,recovery:.25,angle:face}},hero,elapsed);count++;
  }
  assert(count>=400);
});
test('Bundled font is applied to inherited canvas text setters',()=>{
  const c=Art.fontContext(context());c.font='bold 13px Segoe UI';assert(c.font.includes('DenTinh Sans'));assert(c.font.startsWith('bold 13px'));c.font='8px Consolas,monospace';assert(c.font.includes('DenTinh Sans'));
});
test('Full renderer draws terrain, effects, map, enemies and environment beyond negative and positive core edges',()=>{
  const g=new DTGame('thienvu',71426);g.start();g.skipTutorial?.();g.consumeEvents();
  const r=new DTRenderer(canvas(),g);
  for(const pos of[{x:740,y:2200},{x:-1550,y:-1300},{x:14000,y:5100}]){
    Object.assign(g.player,pos);g.world.ensureChunks?.(pos.x,pos.y);g.input.aimX=pos.x+100;g.input.aimY=pos.y+20;g.player.moving=true;g.player.velocityX=120;g.player.velocityY=30;
    for(const type of['mythic-slash','mythic-spear','mythic-tether','mythic-rune','mythic-ember','mythic-orbit'])g.effect(type,pos.x,pos.y,'#aaf2dd',100,.6,{angle:.5,tx:pos.x+130,ty:pos.y+40});
    g.sagaTelegraphs=[{kind:'line',x:pos.x,y:pos.y,x2:pos.x+200,y2:pos.y+20,r:18,timer:.4,maxTimer:1},{kind:'ring',x:pos.x,y:pos.y,r:130,inner:70,timer:.5,maxTimer:1}];
    r.draw(.016);r.map(canvas(880,520),true);r.map(canvas(170,110));
    if(g.world.infinite)assert(r.ground.chunks.size<=36);
  }
  assert(r.camera.x>6400);assert(drawCalls>10000);
});
test('Reduced motion renders the same complete game without dropping action state',()=>{
  DTSettings.reducedMotion=true;DTSettings.graphics='low';const g=new DTGame('an',71426);g.start();g.skipTutorial?.();g.player.action={key:'r',duration:1,elapsed:.5,release:.2,angle:1};const r=new DTRenderer(canvas(),g);r.draw(.016);assert.equal(g.player.action.elapsed,.5);DTSettings.reducedMotion=false;
});
test('All persistent fields and all six named boss silhouettes draw each frame',()=>{
  const g=new DTGame('an',71426),c=canvas(),r=new DTRenderer(c,g);
  g.start();g.skipTutorial?.();
  const kinds=['wall','mirror','lantern','trap','cage','satellites','water','garden','vine','vortex','tornado','orbs','sigil','decoy'];
  g.mythicFields=kinds.map((kind,i)=>({id:'field-'+i,kind,x:g.player.x+i*10,y:g.player.y,angle:.7,r:180,life:5,element:['fire','ice','earth','wind','nature','lightning'][i%6]}));
  g.mythicFields.push({id:'lantern-second',kind:'lantern',x:g.player.x-120,y:g.player.y+100,r:95,life:4,element:'fire'});
  for(const f of g.mythicFields)r.drawMythicField(f);
  for(let sagaIndex=0;sagaIndex<6;sagaIndex++)r.drawEnemy({id:'test-boss-'+sagaIndex,sagaBoss:true,sagaIndex,r:40,x:g.player.x,y:g.player.y,hp:500,maxHp:700,name:'Boss '+sagaIndex,color:'#aedcc5'});
  const before=drawCalls;r.draw(.016);assert(drawCalls>before+1000);
  g.mythicFields=[{id:'cage',kind:'cage',x:0,y:0,r:180,life:2,element:'lightning'}];
  const rectangles=[],original=c.ctx.strokeRect;c.ctx.strokeRect=(...args)=>{rectangles.push(args);original.apply(c.ctx,args)};r.drawMythicField(g.mythicFields[0]);assert(rectangles.some(p=>p[0]===-180&&p[1]===-180&&p[2]===360&&p[3]===360),'cage footprint must match square hitbox');
});
const report={checkedAt:new Date().toISOString(),numericCanvasValidation:true,visualInspection:false,drawCalls,results};fs.mkdirSync(path.join(project,'qa'),{recursive:true});fs.writeFileSync(path.join(project,'qa','ascension-visual-report.json'),JSON.stringify(report,null,2));process.exitCode=results.every(r=>r.pass)?0:1;
