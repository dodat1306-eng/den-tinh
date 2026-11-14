const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
for(const name of['world.js','content.js','engine.js','expansion.js','frontier.js','elemental.js'])vm.runInThisContext(fs.readFileSync(path.join(root,name),'utf8'),{filename:name});
const LegacyGame=globalThis.DTGame,legacy=new LegacyGame('an',71426);legacy.start();legacy.skipTutorial();legacy.player.gold=123;legacy.player.hp=61;const legacySave=JSON.parse(JSON.stringify(legacy.serialize()));
for(const name of['mythic-content.js','ascension.js','endless.js','shadow.js'])if(fs.existsSync(path.join(root,name)))vm.runInThisContext(fs.readFileSync(path.join(root,name),'utf8'),{filename:name});
const results=[];
function test(name,fn){try{fn();results.push({name,pass:true});console.log('PASS '+name)}catch(error){results.push({name,pass:false,error:error.stack});console.error('FAIL '+name+'\n'+error.stack)}}
function game(hero='an'){const g=new DTGame(hero,71426);g.start();g.skipTutorial();g.consumeEvents();return g}
function move(g,x,y){g.player.x=x;g.player.y=y;g.world.ensureChunks(x,y);g.input.fire=false;g.input.dx=0;g.input.dy=0;g.input.aimX=x+300;g.input.aimY=y}
function cycle(g,n=1){for(let i=0;i<n;i++)g.update(1/60)}
test('Infinite streaming is deterministic across positive and negative coordinates and bounded after long travel',()=>{
  const g=game(),h=game();for(const [x,y]of[[12000,7000],[-6000,-3000],[80000,-45000]]){
    move(g,x,y);move(h,x,y);assert.equal(g.world.stream.activeChunks,25);assert.deepEqual(g.world.props.filter(p=>p.streamKey),h.world.props.filter(p=>p.streamKey));assert(g.world.stream.generatedProps<=25*42);assert(g.world.stream.generatedEnemies<=25*5);
  }
  assert(DTWorld.zoneAt(-1000,-1000).id.startsWith('endless-'));assert.equal(DTWorld.zoneAt(740,2200).id,'village');
});
test('The old map edge can be crossed, and invalid coordinates still collide',()=>{
  const g=game();for(const [x,y]of[[-10,512],[6401,3500],[12000,512],[-10000,-512]]){g.world.ensureChunks(x,y);assert(!g.world.collision(x,y,1),'edge at '+x+','+y)}assert(g.world.collision(NaN,0));assert(g.world.collision(Infinity,0));
});
test('Defeats, partial damage, chests and environmental state survive chunk eviction and revisit',()=>{
  const g=game();move(g,13000,7000);const e=g.world.enemies.find(e=>e.streamKey&&e.alive),damaged=g.world.enemies.find(a=>a.streamKey&&a.id!==e.id&&a.alive),c=g.world.chests.find(c=>c.streamKey),o=g.world.environment.find(o=>o.streamKey);assert(e&&damaged&&c&&o);
  const origin={x:e.x,y:e.y};e.alive=false;e.hp=0;damaged.hp-=7;c.open=true;o.used=true;o.elementalState='lightning';const ids=[e.id,damaged.id,c.id,o.id],hp=damaged.hp;
  move(g,-8000,-8000);assert(!g.world.enemies.some(a=>a.id===ids[0]));move(g,origin.x,origin.y);
  assert.equal(g.world.enemies.find(a=>a.id===ids[0]).alive,false);assert.equal(g.world.enemies.find(a=>a.id===ids[1]).hp,hp);assert(g.world.chests.find(a=>a.id===ids[2]).open);assert(g.world.environment.find(a=>a.id===ids[3]).used);
});
test('Save/restore preserves distant negative position and changed chunks without serializing generated chunks',()=>{
  const g=game();move(g,-6500,-6500);g.player.hp=61;const o=g.world.environment.find(o=>o.streamKey);o.used=true;const saved=JSON.parse(JSON.stringify(g.serialize())),r=DTGame.restore(saved);
  assert.equal(r.player.x,-6500);assert.equal(r.player.y,-6500);assert.equal(r.player.hp,61);assert(r.world.infinite);assert(r.world.environment.find(a=>a.id===o.id).used);assert(!saved.enemies.some(a=>a.id.startsWith('stream-')));assert(saved.endless.stream.changes.length<26);assert.equal(r.world.stream.activeChunks,25);
});
test('A v0.4 save retains original hero, HP, gold and original quest and receives infinite terrain',()=>{
  const g=DTGame.restore(legacySave);assert.equal(g.hero.id,'an');assert.equal(g.player.gold,123);assert.equal(g.player.hp,61);assert(g.world.infinite);assert.equal(g.saga.chapter,0);assert.equal(g.saga.stage,'locked');assert.equal(g.world.shrines.filter(s=>s.active).length,0);
});
test('Elemental targeting and saved clones retain their distant coordinates instead of clamping to the old map',()=>{
  const g=game('thienvu');move(g,-6500,-6500);g.input.aimX=-6100;g.input.aimY=-6500;assert.deepEqual(g.elementTarget(g.player,540),{x:-6100,y:-6500});g.selectSplitCount(5);assert(g.splitElementals());g.updateElementSplitIntro(4.2);assert.equal(g.elementClones.length,4);g.elementClones[0].hp-=9;const hp=g.elementClones[0].hp,form=g.elementClones[0].element;
  const r=DTGame.restore(JSON.parse(JSON.stringify(g.serialize())));assert.equal(r.elementClones.length,4);assert.equal(r.elementClones.find(c=>c.element===form).hp,hp);for(const clone of r.elementClones){assert(Math.hypot(clone.x-r.player.x,clone.y-r.player.y)<250);assert(clone.x<0&&clone.y<0);assert(!r.world.collision(clone.x,clone.y,13))}
});
test('New F interactions activate Chu Dong Tu and Jack relic hooks when the full skill module is loaded',()=>{
  const g=game();if(typeof g.onMythicInteract!=='function')return;g.grantRelic('chudong');g.grantRelic('jack');g.player.hp=40;g.player.mp=30;const barrel=g.world.environment.find(o=>o.type==='barrel');move(g,barrel.x,barrel.y);assert(g.interact());assert.equal(g.player.hp,46);assert.equal(g.player.mp,42);assert(g.mythicFields.some(f=>f.kind==='trap'));
});
test('Core environmental objects can be used once and persist; elemental barrel explosion cannot recur',()=>{
  const g=game(),camp=g.world.environment.find(o=>o.type==='campfire');move(g,camp.x,camp.y);g.player.hp=20;assert(g.interact());assert(g.player.hp>20);const hp=g.player.hp;assert(!g.world.environment.find(o=>o.id===camp.id&&!o.used));
  const barrel=g.world.environment.find(o=>o.type==='barrel'&&!o.used);assert(g.reactEnvironment('fire',barrel.x,barrel.y,20));assert.equal(g.reactEnvironment('fire',barrel.x,barrel.y,20),0);assert(barrel.used);
  const r=DTGame.restore(JSON.parse(JSON.stringify(g.serialize())));assert(r.world.environment.find(o=>o.id===camp.id).used);assert(r.world.environment.find(o=>o.id===barrel.id).used);assert.equal(r.player.hp,hp);
});
test('All six chapters enforce three echoes, start distinct bosses, award once and allow postgame exploration',()=>{
  const g=game();g.victory=true;for(let index=0;index<6;index++){
    const chapter=DTWorld.endless.chapters[index];move(g,chapter.x,chapter.y+95);assert(g.interact());assert.equal(g.saga.stage,'echoes');assert.equal(g.interact(),false);
    for(let n=0;n<3;n++){const echo=g.world.environment.find(o=>o.storyEcho&&o.echoIndex===n);assert(echo);move(g,echo.x,echo.y);assert(g.interact())}
    move(g,chapter.x,chapter.y+95);assert(g.interact());assert.equal(g.saga.stage,'boss');const boss=g.world.enemies.find(e=>e.sagaBoss&&e.alive);assert(boss);assert.equal(boss.sagaIndex,index);cycle(g,150);assert(g.sagaTelegraphs.length>0||g.projectiles.some(b=>!b.friendly)||g.world.enemies.some(e=>e.sagaAnchor));
    for(const a of g.world.enemies)if(a.sagaAnchor)a.alive=false;g.damageEnemy(boss,1e8,false);assert.equal(g.saga.stage,'claim');move(g,chapter.x,chapter.y+95);const gold=g.player.gold;assert(g.interact());assert.equal(g.player.gold,gold+150);assert.equal(g.saga.chapter,index+1);assert.equal(g.saga.cleared.length,index+1);
  }
  assert.equal(g.saga.stage,'complete');assert(g.sagaObjective().title.includes('vô hạn'));move(g,99999,99999);assert.equal(g.world.stream.activeChunks,25);
});
test('Saga fight save preserves boss and anchors, discards pending attacks and death resets the encounter',()=>{
  const g=game();g.victory=true;g.saga.chapter=1;g.saga.stage='boss';move(g,8704,-512);g.startSagaBoss();cycle(g,2);const boss=g.world.enemies.find(e=>e.sagaBoss);boss.hp-=100;g.sagaWarn('line',{x:0,y:0,x2:100,y2:0,r:20},1);const r=DTGame.restore(JSON.parse(JSON.stringify(g.serialize())));assert.equal(r.saga.stage,'boss');assert.equal(r.world.enemies.find(e=>e.sagaBoss).hp,boss.hp);assert.equal(r.world.enemies.filter(e=>e.sagaAnchor&&e.alive).length,3);assert.equal(r.sagaTelegraphs.length,0);r.respawn();assert.equal(r.saga.stage,'echoes');assert(!r.world.enemies.some(e=>e.sagaBoss&&e.alive));assert.equal(r.sagaTelegraphs.length,0);
});
test('Post-Coi-Da endless enemies and ring/line boss attacks still deal real damage',()=>{
  const g=game();g.victory=true;move(g,9000,-1000);g.player.invulnerable=0;const hp=g.player.hp;g.damagePlayer(15);assert(g.player.hp<hp);g.player.invulnerable=0;const before=g.player.hp;g.sagaWarn('ring',{x:g.player.x-180,y:g.player.y,r:300,inner:100,damage:10},.01);g.updateSagaTelegraphs(.02);assert(g.player.hp<before);g.player.invulnerable=0;const last=g.player.hp;g.sagaWarn('line',{x:g.player.x-100,y:g.player.y,x2:g.player.x+100,y2:g.player.y,r:10,damage:10},.01);g.updateSagaTelegraphs(.02);assert(g.player.hp<last);
});
const report={date:new Date().toISOString(),passed:results.filter(t=>t.pass).length,total:results.length,tests:results};fs.mkdirSync(path.join(root,'qa'),{recursive:true});fs.writeFileSync(path.join(root,'qa/endless-report.json'),JSON.stringify(report,null,2));console.log(report.passed+'/'+report.total+' endless checks passed');process.exitCode=report.passed===report.total?0:1;
