const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');for(const f of['world.js','engine.js'])vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f});
fs.mkdirSync(path.join(root,'qa'),{recursive:true});
const reports=[];
for(const hero of Object.keys(DTWorld.HEROES)){
  const g=new DTGame(hero);g.start();g.consumeEvents();let ticks=0,stage=0;
  function reward(){while(g.pendingLevels>0)g.applyTalent(g.player.hp<g.player.maxHp*.5?'vitality':'power');g.consumeEvents()}
  function fight(center,done,limit=12000){
    for(let i=0;i<limit;i++){
      if(done())return true;const p=g.player;
      if(g.dead){g.respawn();p.x=center.x+230;p.y=center.y+55;g.paused=false}
      const foes=g.world.enemies.filter(e=>e.alive&&Math.hypot(e.x-p.x,e.y-p.y)<800).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
      const e=foes[0];let dx=0,dy=0,ax=center.x,ay=center.y;
      if(e){ax=e.x;ay=e.y;const d=Math.hypot(p.x-e.x,p.y-e.y),a=Math.atan2(p.y-e.y,p.x-e.x),orbit=.55;
        const retreat=d<210?1:d>330?-.65:0;dx=Math.cos(a)*retreat-Math.sin(a)*orbit;dy=Math.sin(a)*retreat+Math.cos(a)*orbit;
        const away=Math.hypot(p.x-center.x,p.y-center.y);if(away>390){dx+=(center.x-p.x)/away*.85;dy+=(center.y-p.y)/away*.85}
      }
      for(const b of g.projectiles){if(b.friendly)continue;const d=Math.hypot(b.x-p.x,b.y-p.y);if(d<75){dx+=(p.x-b.x)/Math.max(1,d);dy+=(p.y-b.y)/Math.max(1,d)}}
      for(const t of g.telegraphs){const d=Math.hypot(t.x-p.x,t.y-p.y);if(d<t.r+45){dx+=(p.x-t.x)/Math.max(1,d)*2;dy+=(p.y-t.y)/Math.max(1,d)*2}}
      const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l}g.input={dx,dy,fire:!!e,aimX:ax,aimY:ay};p.facing=Math.atan2(ay-p.y,ax-p.x);
      if(e&&g.player.cd.q===0)g.skill('q');if(e&&g.player.cd.e===0&&Math.hypot(e.x-p.x,e.y-p.y)<300)g.skill('e');if(e&&p.ult>=100)g.skill('r');if(p.hp<p.maxHp*.48)g.heal();
      if(e&&Math.hypot(e.x-p.x,e.y-p.y)<150&&p.cd.dash===0)g.dash();
      g.update(1/60);ticks++;reward();
    }
    return done();
  }
  for(const s of g.world.shrines){
    g.player.x=s.x+230;g.player.y=s.y+55;
    assert(fight(s,()=>!s.guardians.some(id=>g.world.enemies.find(e=>e.id===id&&e.alive))),`${hero} cannot clear ${s.id}`);
    g.player.x=s.x;g.player.y=s.y+40;assert(g.interact());reward();assert(s.active);stage++;
  }
  g.player.x=1830;g.player.y=653;assert(g.interact());reward();
  g.player.x=2010;g.player.y=690;
  assert(fight({x:1830,y:610},()=>g.victory,18000),`${hero} cannot beat boss`);
  const report={hero,completed:true,simulatedSeconds:Math.round(ticks/60),deaths:g.deaths,level:g.player.level,kills:g.kills,hp:Math.round(g.player.hp),seals:stage};reports.push(report);console.log(JSON.stringify(report));
}
fs.writeFileSync(path.join(root,'qa','playthrough-report.json'),JSON.stringify({method:'Actual combat simulation with an autonomous movement and combat controller, no invulnerability or damage cheats; relocation between arenas excludes travel time.',results:reports},null,2));
