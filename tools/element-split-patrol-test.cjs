const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
for(const f of ['world.js','content.js','engine.js','expansion.js','frontier.js','elemental.js','mythic-content.js','ascension.js','endless.js','journey.js','world-destruction.js','shadow.js'])vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f});
const checks=[];
function test(name,fn){fn();checks.push(name);console.log('PASS '+name)}
function arena(id='thienvu'){
 const g=new DTGame(id,71426);g.start();g.skipTutorial();g.world.enemies=[];g.world.props=[];g.world.ensureChunks=()=>{};g.world.collision=()=>false;g.player.x=-2000;g.player.y=-1000;g.player.crit=0;g.input={dx:0,dy:0,fire:false,aimX:-1800,aimY:-1000};return g;
}
function step(g,time){for(let n=0;n<Math.ceil(time*100);n++){g.pendingHitStop=g.hitStop=0;g.update(Math.min(.01,time-n*.01))}}
function enemy(id,x,y){return{id,type:'slime',x,y,homeX:x,homeY:y,r:15,hp:1e6,maxHp:1e6,speed:0,damage:0,xp:0,gold:0,alive:true,cool:999,phase:0,timer:0,hit:0,slow:0,knockX:0,knockY:0}}
test('Seven elemental R casts release once at 0.28 seconds without intro, split or synchronized allies',()=>{
 for(const form of DTElements.forms){const g=arena();g.transformElement(form.id);g.elementSplitTime=18;g.syncElementClones(7);for(const c of g.elementClones)c.rCd=c.qCd=c.eCd=99;const calls=[],cast=g.castElement;g.castElement=function(...a){calls.push(a);return cast.apply(this,a)};assert(g.skill('r'));assert.equal(g.player.ultIntro,null);assert.equal(g.castQueue.length,1);step(g,.27);assert.equal(calls.length,0);step(g,.02);assert.equal(calls.length,1);assert.equal(calls[0][0],form.id);assert.equal(calls[0][2],g.player);assert.equal(g.elementClones.length,6);assert(!g.effects.some(e=>e.type==='element-convergence'));assert(g.player.cd.r>19)}
});
test('Solar R reaches across screen and ice R freezes for 2.5 seconds',()=>{
 const g=arena();g.world.enemies=[enemy('far',g.player.x+1100,g.player.y)];g.castElement('light','r',g.player,1,false,{x:g.player.x+1500,y:g.player.y});assert(g.world.enemies[0].hp<1e6);
 const h=arena();h.world.enemies=[enemy('ice',h.player.x+100,h.player.y)];h.castElement('ice','r',h.player,1,false,{x:h.player.x+100,y:h.player.y});assert.equal(h.world.enemies[0].frozen,2.5);
});
test('X uses exactly 4.2 seconds then 18 seconds, pause and recall retain cooldown',()=>{
 for(const count of [3,5,7]){const g=arena();g.selectSplitCount(count);assert(g.splitElementals());assert.equal(g.getSplitElementList(count).length,count);assert.equal(g.elementClones.length,0);assert(!g.splitElementals());assert(!g.skill('r'));step(g,4.19);assert.equal(g.elementClones.length,0);const t=g.player.ultIntro.elapsed;g.paused=true;g.update(.04);assert.equal(g.player.ultIntro.elapsed,t);g.paused=false;step(g,.01);assert.equal(g.elementClones.length,count-1);assert(Math.abs(g.elementSplitTime-18)<1e-6);const cd=g.elementSplitCd;assert(g.splitElementals());assert.equal(g.elementClones.length,0);assert.equal(g.elementSplitCd,cd);assert(!g.splitElementals())}
});
test('Pending split and R survive reload once; cancellation never releases them',()=>{
 const g=arena();g.selectSplitCount(5);g.splitElementals();step(g,2);const r=DTGame.restore(JSON.parse(JSON.stringify(g.serialize())));r.world.collision=()=>false;r.world.ensureChunks=()=>{};r.world.enemies=[];assert.equal(r.player.ultIntro.mode,'split');step(r,2.2);assert.equal(r.elementClones.length,4);const ids=r.elementClones.map(c=>c.id);step(r,.1);assert.deepEqual(r.elementClones.map(c=>c.id),ids);assert(r.elementClones.every(c=>c.x<0));
 const h=arena();h.skill('r');step(h,.1);const s=h.serialize(),a=DTGame.restore(JSON.parse(JSON.stringify(s)));assert.equal(a.castQueue.length,1);a.world.enemies=[];a.world.ensureChunks=()=>{};a.world.collision=()=>false;step(a,.19);assert.equal(a.castQueue.length,0);assert(a.elementActions.length>0);const b=DTGame.restore(JSON.parse(JSON.stringify(s)));b.cancelActions();step(b,.4);assert.equal(b.elementActions.length,0);const c=arena();c.splitElementals();c.cancelActions();step(c,5);assert.equal(c.elementClones.length,0);
});
test('Legacy R migrates once; split restore rejects conflicting pending R',()=>{
 const g=arena(),s=g.serialize();s.ascension.ultimate={elapsed:2,angle:0,target:{x:g.player.x+400,y:g.player.y}};const r=DTGame.restore(JSON.parse(JSON.stringify(s)));assert.equal(r.player.ultIntro,null);assert.equal(r.castQueue.length,1);step(r,.29);assert.equal(r.castQueue.length,0);assert.equal(r.elementClones.length,0);
 const x=arena();x.splitElementals();const saved=x.serialize();saved.ascension.elementCast={delay:.1,angle:0,target:{x:0,y:0},element:'light'};const resumed=DTGame.restore(JSON.parse(JSON.stringify(saved)));assert.equal(resumed.player.ultIntro.mode,'split');assert.equal(resumed.castQueue.length,0);
});
test('Allies hunt from their own location, spread targets and patrol signed coordinates without teleport',()=>{
 const g=arena();g.elementSplitTime=18;g.syncElementClones(7);g.world.enemies=[enemy('a',-2500,-900),enemy('b',-2300,-1200),enemy('c',-2700,-1100)];g.player.x=10000;g.player.y=10000;const c=g.elementClones[0],old={x:c.x,y:c.y};g.updateElementClones(.01);assert(Math.hypot(c.x-old.x,c.y-old.y)<10);assert(new Set(g.elementClones.map(c=>c.targetId)).size>=3);g.world.enemies=[];g.updateElementClones(.02);assert(g.elementClones.every(c=>c.aiState==='roam'&&c.roamPoint&&c.x<0));
 g.castElement('earth','r',g.player,1,false,{x:-2200,y:-1000});g.castElement('nature','r',g.player,1,false,{x:-2200,y:-1000});g.world.enemies=[];g.updateElementSummons(.46);assert(g.elementSummons.every(s=>s.roamPoint));
 const h=arena('quanle');for(const spec of SHADOW_BEAST_CATALOG.slice(0,6))DTShadow.spawn(h,spec.id,{x:-1800,y:-1000},22);h.player.x=10000;step(h,.5);assert(h.shadowArmy.every(s=>s.aiState==='roam'&&s.x<0&&s.roamPoint));const restore=DTGame.restore(JSON.parse(JSON.stringify(h.serialize())));assert.equal(restore.shadowArmy.length,6);
});
test('Quân Lê primary has exact muzzle, speed, radius and 1/1/3 aim combo',()=>{
 const g=arena('quanle');for(const n of [1,1,3]){g.player.cd.fire=0;g.projectiles=[];assert(g.fire());assert.equal(g.projectiles.length,n);for(const b of g.projectiles){assert(Math.abs(b.x-(g.player.x+28))<1e-8);assert.equal(b.y,g.player.y-16);assert(Math.abs(Math.hypot(b.vx,b.vy)-840)<1e-8);assert.equal(b.r,11)}assert.equal(g.player.action.angle,0);assert.equal(g.player.action.duration,.24)}assert.deepEqual(g.projectiles.map(b=>b.angle),[-.14,0,.14]);
});
test('HoaVi ranks use 6/8/10/12 eyes for 18/20.5/23/25.5 seconds with shared orbits and distributed lasers',()=>{
 for(let rank=0;rank<4;rank++){const g=arena('hoavi');g.skillRanks.r=rank;g.releaseCast({key:'r',angle:0,target:{x:0,y:0},power:1});const f=g.mythicFields.find(f=>f.kind==='satellites');assert.equal(f.count,6+rank*2);assert.equal(f.life,18+rank*2.5);assert.equal(g.player.overclock,f.life);g.world.enemies=[enemy('a',-1800,-1000),enemy('b',-1600,-1100),enemy('c',-1900,-1400)];const hits=[];g.lineHit=(a,b)=>{hits.push({a,b});return b};g.updateFields(.01);assert.equal(hits.length,f.count);assert.equal(new Set(hits.map(h=>h.b.id)).size,3);for(let i=0;i<f.count;i++){const pose=DTSatellitePose(f,g.player,i);assert.equal(pose.x,hits[i].a.x);assert.equal(pose.y,hits[i].a.y)}assert.equal(f.tick,.32);g.updateFields(.30);assert.equal(hits.length,f.count);g.updateFields(.021);assert.equal(hits.length,f.count*2)}
});
fs.mkdirSync(path.join(root,'qa/v083'),{recursive:true});fs.writeFileSync(path.join(root,'qa/v083/gameplay-report.json'),JSON.stringify({pass:true,checks},null,2));
