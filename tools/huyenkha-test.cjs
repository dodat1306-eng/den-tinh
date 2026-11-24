const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
for(const [,file] of html.split('<script src="render.js">')[0].matchAll(/<script src="([^"]+)"/g)) {
  require(path.join(__dirname,'..',file));
}

const Game=globalThis.DTGame;
const {release,duration,strikeFrame,fps,collapseDelay,throwRange,chargeFrames,chargeTime}=globalThis.DTHuyenKha;
const roundTrip=g=>JSON.parse(JSON.stringify(g.serialize()));

function arena() {
  const g=new Game('huyenkha');
  g.start();
  g.skipTutorial();
  g.world.enemies=[];
  g.world.ensureChunks=()=>{};
  g.world.collision=()=>false;
  Object.assign(g.player,{x:2000,y:1560,crit:0,facing:0});
  Object.assign(g.input,{aimX:2400,aimY:1560});
  return g;
}

function target(g,dx,dy=0) {
  const {x,y}=g.player;
  const e={id:'test-'+g.world.enemies.length,type:'slime',alive:true,r:15,hp:10000,maxHp:10000,
    x:x+dx,y:y+dy,homeX:x+dx,homeY:y+dy,damage:0,speed:0,cool:1000};
  g.world.enemies.push(e);
  return e;
}

function tick(g,seconds) {
  const steps=Math.ceil(seconds*100);
  for(let i=0;i<steps;i++){
    g.hitStop=g.pendingHitStop=0;
    g.update(seconds/steps);
  }
}

assert.equal(Object.keys(DTWorld.HEROES).length,7);
assert(!Object.hasOwn(DTWorld.HEROES,'linh'));

{
  const g=arena(),e=target(g,75),behind=target(g,-85);
  for(const combo of [1,2,3]){
    const hp=e.hp;
    g.player.mp=10;
    assert(g.fire());
    assert.equal(g.player.action.combo,combo);
    assert.equal(e.hp,hp);
    tick(g,g.player.action.duration+.015);
    assert(e.hp<hp);
  }
  assert(g.player.shield>=5);
  assert.equal(behind.hp,behind.maxHp);
}

{
  const g=arena(),p=g.player,e=target(g,350),link=target(g,155),returning=target(g,175,-59);
  const x=p.x;
  assert(g.skill('q'));
  assert.equal(p.mp,77);
  tick(g,.33);
  assert.equal(g.greatswordAnchor().phase,'outbound');
  assert.equal(e.hp,e.maxHp);
  tick(g,.25);
  assert.equal(p.x,x);
  assert.equal(g.greatswordAnchor().phase,'anchored');
  assert.equal(g.greatswordAnchor().x,x+throwRange);
  assert(e.hp<e.maxHp);
  assert(link.hp<link.maxHp);
  assert(g.canRecastQ());
  const cooldown=p.cd.q,mp=p.mp;
  assert(g.skill('q'));
  assert.equal(p.mp,mp);
  assert.equal(p.cd.q,cooldown);
  assert(!g.canRecastQ());
  tick(g,.43);
  assert(returning.hp<returning.maxHp);
  assert.equal(g.greatswordAnchor(),undefined);
  assert.equal(g.consumeEvents().filter(e=>e.type==='sound'&&e.name==='swordRecall').length,1);
  const blocked=arena(),wall=blocked.player.x+45;
  blocked.world.collision=(x)=>x>=wall;
  const enemy=target(blocked,160);
  assert(blocked.skill('q'));
  tick(blocked,.58);
  assert(blocked.player.x<wall);
  assert(blocked.greatswordAnchor().x<wall);
  assert.equal(enemy.hp,enemy.maxHp);
}

{
  const g=arena(),p=g.player;
  assert(g.skill('q'));
  tick(g,.6);
  const {x,y}=g.greatswordAnchor();
  g.cancelActions();
  Object.assign(p,{x:2500000,y:-1700000});
  tick(g,12);
  assert(g.canRecastQ());
  assert.deepEqual([g.greatswordAnchor().x,g.greatswordAnchor().y],[x,y]);
  const legacy=roundTrip(g);
  legacy.ascension.greatswordAnchor.life=1.5;
  delete legacy.ascension.greatswordAnchor.hitIds;
  const restored=Game.restore(legacy);
  restored.world.ensureChunks=()=>{};
  restored.world.enemies=[];
  restored.world.collision=()=>false;
  assert.deepEqual([restored.greatswordAnchor().x,restored.greatswordAnchor().y],[x,y]);
  assert(restored.canRecastQ());
  const cd=restored.player.cd.q;
  assert(restored.skill('q'));
  assert.equal(restored.player.cd.q,cd);
  assert(Math.hypot(restored.greatswordAnchor().from.x-restored.player.x,
    restored.greatswordAnchor().from.y-restored.player.y)<600);
  tick(restored,.12);
  const catchSave=Game.restore(roundTrip(restored));
  catchSave.world.ensureChunks=()=>{};
  catchSave.world.enemies=[];
  catchSave.world.collision=()=>false;
  assert(catchSave.player.action.recall);
  assert.equal(catchSave.greatswordAnchor().phase,'returning');
  const trace=catchSave.greatswordEnd;
  catchSave.greatswordEnd=function(a,b){
    assert(Math.hypot(a.x-b.x,a.y-b.y)<=128,'remote recall must trace only short segments');
    return trace.call(this,a,b);
  };
  tick(catchSave,.42);
  assert.equal(catchSave.greatswordAnchor(),undefined);
}

{
  const g=arena(),p=g.player;
  assert.equal(chargeFrames,150);
  assert(g.skill('e'));
  assert.equal(p.action.duration,chargeTime);
  tick(g,.18);
  assert.equal(p.shield,38);
  const mp=p.mp,hp=p.hp;
  g.damagePlayer(10);
  assert.equal(p.hp,hp);
  assert.equal(p.mp,mp+16);
  p.invulnerable=0;
  g.damagePlayer(10);
  assert.equal(p.mp,mp+16);
}

{
  const g=arena(),p=g.player;
  const near=target(g,65),outside=target(g,390);
  assert(g.skill('e'));
  tick(g,.70);
  const ward=g.mythicFields.find(f=>f.kind==='greatsword-ward');
  assert.equal(ward.pulses,1);
  assert(near.hp<near.maxHp);
  const x=p.x;
  g.input.dx=1;
  tick(g,.23);
  g.input.dx=0;
  assert(p.x>x+25);
  tick(g,1.18);
  assert.equal(ward.pulses,3);
  assert(p.action?.key==='e');
  assert.equal(outside.hp,outside.maxHp);
  tick(g,.44);
  assert.equal(p.action,null);
  assert.equal(ward.pulses,3);
}

{
  const g=arena(),p=g.player,e=target(g,285);
  g.shoot(p.x+20,p.y,0,80,10,'#fff',{friendly:false});
  assert(g.dash());
  assert(p.perfectCounter>0);
  tick(g,.25);
  p.facing=0;
  const hp=e.hp;
  assert(g.fire());
  assert.equal(p.perfectCounter,0);
  assert(g.effects.some(f=>f.type==='huyenkha-sweep'&&f.kind==='counter'));
  assert(e.hp<hp);
}

{
  const g=arena(),p=g.player,e=target(g,195,55),behind=target(g,-150);
  assert.equal(release,(strikeFrame-1)/fps);
  assert(g.skill('r'));
  assert(!g.dash());
  const x=p.x;
  g.input.dx=1;
  tick(g,.35);
  assert(p.x>x+55,'R must allow movement while charging');
  g.input.dx=0;
  tick(g,release-.36);
  assert.equal(e.hp,e.maxHp);
  const before=roundTrip(g);
  tick(g,.012);
  assert(p.ultIntro.released);
  assert(e.hp<e.maxHp);
  assert.equal(behind.hp,behind.maxHp);
  const after=roundTrip(g),impact=e.hp,y=e.y;
  assert.equal(p.ultIntro.rift.closed,false);
  tick(g,collapseDelay+.02);
  assert(p.ultIntro.rift.closed);
  assert(e.hp<impact);
  assert(e.y<y);
  const closed=roundTrip(g),afterBoth=e.hp;
  tick(g,duration-release-collapseDelay+.05);
  assert.equal(p.ultIntro,null);
  assert.equal(e.hp,afterBoth);
  for(const [data,hits,collapses] of [[before,1,0],[after,0,1],[closed,0,0]]){
    const resumed=Game.restore(data);
    let releases=0,closures=0;
    resumed.releaseCast=()=>releases++;
    resumed.strikeGreatswordRift=(_,collapse)=>{if(collapse)closures++};
    resumed.updateUltIntro(duration);
    assert.equal(releases,hits);
    assert.equal(closures,collapses);
    assert.equal(resumed.player.ultIntro,null);
  }
}

{
  const g=arena(),p=g.player;
  Object.assign(g.input,{aimX:p.x+220,aimY:p.y+95});
  assert(g.skill('q'));
  tick(g,.58);
  const anchor=g.greatswordAnchor();
  assert(g.canRecastQ());
  Object.assign(g.input,{aimX:p.x+430,aimY:p.y});
  assert(g.skill('r'));
  const resumed=Game.restore(roundTrip(g));
  assert.equal(resumed.greatswordAnchor().phase,'anchored');
  g.updateUltIntro(release);
  assert.deepEqual(p.ultIntro.rift.points[1],{x:anchor.x,y:anchor.y});
  assert.equal(p.ultIntro.rift.points.length,3);
  assert.equal(g.greatswordAnchor(),anchor);
  const legacy=roundTrip(g);
  delete legacy.ascension.ultimate.rift;
  const old=Game.restore(legacy);
  old.releaseCast=()=>assert.fail('old R already struck');
  old.strikeGreatswordRift=()=>assert.fail('old R has no pending fissure');
  old.updateUltIntro(duration);
}

{
  const g=arena();
  g.player.gold=321;
  const relic=g.world.relicPedestals.find(p=>p.relic==='power');
  assert(g.grantRelic('power',relic));
  g.allocateStat('vit');
  g.world.shrines[0].active=true;
  Object.assign(g.heroQuest,{stage:3,memories:['brother-mask']});
  assert(g.skill('r'));
  const legacy=roundTrip(g);
  legacy.hero='linh';
  const restored=Game.restore(legacy);
  assert.equal(legacy.hero,'linh');
  assert.equal(restored.hero.id,'huyenkha');
  assert.equal(restored.player.gold,321);
  assert.equal(restored.player.stats.vit,1);
  assert.equal(restored.player.relics.power,1);
  assert(restored.world.shrines[0].active);
  assert.equal(restored.heroQuest.stage,3);
  assert.deepEqual(restored.heroQuest.memories,['astral-guard']);
  assert.equal(restored.player.ultIntro,null);
  assert.equal(restored.serialize().hero,'huyenkha');
}

{
  const H=DTV09Content;
  assert(!Object.hasOwn(H.quests,'linh'));
  assert.match(H.truthAwake,/An, Quân Lê, HoaVi và Thiên Vũ/);
  assert.match(H.truthReturn,/bốn người/);
  const g=arena();
  assert.match(g.consumeEvents().find(e=>e.type==='dialogue').text,/hai tiếng gõ ngắn/);
  const saved=roundTrip(g);
  Object.assign(saved.v09.heroQuest,{stage:6,completed:true,memories:['astral-guard','astral-rune']});
  const resumed=Game.restore(saved);
  assert(resumed.heroQuest.completed);
  assert.match(resumed.objective().title,/Bát Nước Đầu Tiên/);
  const temple=resumed.world.npcs.find(n=>n.id==='temple_keeper');
  Object.assign(resumed.player,{x:temple.x,y:temple.y});
  assert(resumed.interact());
  const witness=resumed.consumeEvents().find(e=>e.type==='dialogue');
  assert.equal(witness.title,'Bát Nước Đầu Tiên');
  assert.match(witness.text,/chính con xin bát đầu tiên/);
  assert.equal(resumed.questStep().kind,'truth');
  assert(resumed.interact());
  assert.equal(resumed.questStep().kind,'truth');

  resumed.storyFlags.returnedMemories=true;
  const finished=Game.restore(roundTrip(resumed));
  assert.equal(finished.questStep().target,'temple_keeper');
  Object.assign(finished.player,{x:temple.x,y:temple.y});
  const gold=finished.player.gold;
  assert(finished.interact());
  assert.equal(finished.heroQuest.stage,H.quests.huyenkha.steps.length);
  assert(finished.heroQuest.completed);
  assert.equal(finished.player.gold,gold);
  const ending=finished.consumeEvents().find(e=>e.type==='dialogue'&&e.title===H.quests.huyenkha.reward);
  assert.match(ending.text,/Then mới mở được từ cả hai phía/);
  assert(!ending.text.includes('Thưởng'));
  assert(!Game.restore(roundTrip(finished)).consumeEvents().some(e=>e.title===H.quests.huyenkha.reward));
}

console.log('Huyền Kha: unlimited recall, 150-frame E, timed R strikes, story continuity and legacy rewards passed.');
