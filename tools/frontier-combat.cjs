const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');for(const f of['world.js','content.js','engine.js','expansion.js','frontier.js'])vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f});
const reports=[];
for(const hero of Object.keys(DTWorld.HEROES)){
  const g=new DTGame(hero,71426);g.start();g.skipTutorial();g.consumeEvents();let ticks=0;
  function rewards(){while(g.pendingLevels>0)g.applyTalent(g.player.hp<g.player.maxHp*.5?'vitality':'power');g.consumeEvents()}
  for(const b of g.world.beacons.filter(b=>b.id!=='home')){
    const st=g.outposts[b.id];let success=false;
    for(let attempt=0;attempt<4&&!success;attempt++){
      g.player.x=b.x;g.player.y=b.y+50;g.paused=false;assert(g.interact(),hero+' could not start '+b.id+' '+JSON.stringify({attempt,nearby:g.nearby(),state:st,dead:g.dead,guardians:g.world.enemies.filter(e=>st.ids.includes(e.id)&&e.alive).map(e=>({type:e.type,x:e.x,y:e.y,hp:e.hp}))}));
      for(let step=0;step<14000&&!st.complete&&!g.dead;step++){
        const p=g.player,targets=g.world.enemies.filter(e=>e.alive&&Math.hypot(e.x-p.x,e.y-p.y)<850).sort((a,c)=>{const da=Math.hypot(a.x-p.x,a.y-p.y),dc=Math.hypot(c.x-p.x,c.y-p.y);return da+(a.outpost===b.id?-150:0)-dc-(c.outpost===b.id?-150:0)}),target=targets[0];
        let dx=0,dy=0,ax=b.x,ay=b.y;
        if(target){ax=target.x;ay=target.y;const d=Math.hypot(p.x-ax,p.y-ay),a=Math.atan2(p.y-ay,p.x-ax),retreat=d<200?1:d>320?-.65:0;dx=Math.cos(a)*retreat-Math.sin(a)*.55;dy=Math.sin(a)*retreat+Math.cos(a)*.55}
        const away=Math.hypot(p.x-b.x,p.y-b.y);if(away>390){dx+=(b.x-p.x)/away*.9;dy+=(b.y-p.y)/away*.9}
        for(const bullet of g.projectiles)if(!bullet.friendly){const d=Math.hypot(bullet.x-p.x,bullet.y-p.y);if(d<80){dx+=(p.x-bullet.x)/Math.max(1,d);dy+=(p.y-bullet.y)/Math.max(1,d)}}
        const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length}
        if(g.world.collision(p.x+dx*35,p.y+dy*35,p.r)){const a=Math.atan2(dy,dx);for(const offset of[Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,Math.PI*.75,-Math.PI*.75]){const sx=Math.cos(a+offset),sy=Math.sin(a+offset);if(!g.world.collision(p.x+sx*40,p.y+sy*40,p.r)){dx=sx;dy=sy;break}}}
        g.input={dx,dy,fire:!!target,aimX:ax,aimY:ay};p.facing=Math.atan2(ay-p.y,ax-p.x);
        if(target&&p.cd.q===0)g.skill('q');if(target&&p.cd.e===0&&Math.hypot(ax-p.x,ay-p.y)<320)g.skill('e');if(target&&p.ult>=100)g.skill('r');if(p.hp<p.maxHp*.5)g.heal();if(target&&Math.hypot(ax-p.x,ay-p.y)<145&&p.cd.dash===0)g.dash();
        g.update(1/60);ticks++;rewards();
      }
      if(g.dead)g.respawn();else success=st.complete;
    }
    assert(success,hero+' failed '+b.id);g.player.x=b.x;g.player.y=b.y+50;assert(g.interact());assert(st.claimed);rewards();
  }
  const r={hero,completed:true,outposts:g.world.beacons.filter(b=>g.outposts[b.id].claimed).length,waves:6,simulatedSeconds:Math.round(ticks/60),deaths:g.deaths,kills:g.kills,level:g.player.level};reports.push(r);console.log(JSON.stringify(r));
}
fs.writeFileSync(path.join(root,'qa/frontier-combat-report.json'),JSON.stringify({method:'Normal attacks, skills, talents, potions and dodges; no health or damage cheats. Relocation only between arenas, with four permitted death/retry attempts per outpost; travel time is excluded.',results:reports},null,2));
