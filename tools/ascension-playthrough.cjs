const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
global.Image=class{constructor(){this.complete=false;this.naturalWidth=0}set src(v){this._src=v}};global.document={querySelectorAll:()=>[],createElement:()=>({getContext:()=>({})})};
const root=path.resolve(__dirname,'..');for(const f of['world.js','content.js','engine.js','expansion.js','frontier.js','elemental.js','mythic-content.js','ascension.js','endless.js','journey.js','render.js','visuals.js','scenery.js','elemental-visuals.js','ascension-visuals.js','journey-visuals.js','choreography.js'])vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f});
fs.mkdirSync(path.join(root,'qa'),{recursive:true});
const reports=[];
for(const hero of (process.env.DENTINH_COMBAT_HERO?[process.env.DENTINH_COMBAT_HERO]:Object.keys(DTWorld.HEROES))){
  const g=new DTGame(hero,71426);g.start();g.skipTutorial();g.consumeEvents();let ticks=0,stage=0;
  function reward(){if(g.skillPoints>0)for(const path of ['q','e','r','passive'])while(g.skillPoints>0&&g.skillRanks[path]<3)g.learnSkill(path);while(g.pendingLevels>0)g.applyTalent(g.player.hp<g.player.maxHp*.5?'vitality':'power');g.consumeEvents()}
  function fight(center,done,limit=12000){
    for(let i=0;i<limit;i++){
      if(done())return true;const p=g.player;
      if(g.dead){g.respawn();p.x=center.x+230;p.y=center.y+55;g.paused=false;if(center.sagaEncounter){p.x=center.x;p.y=center.y+95;assert(g.interact());p.x=center.x+230;p.y=center.y+55}}
      const foes=g.world.enemies.filter(e=>e.alive&&Math.hypot(e.x-p.x,e.y-p.y)<800).sort((a,b)=>Number(!!b.root||!!b.guard||!!b.sagaAnchor||b.type==='core')-Number(!!a.root||!!a.guard||!!a.sagaAnchor||a.type==='core')||Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
      const e=foes[0];let dx=0,dy=0,ax=center.x,ay=center.y;
      if(e){ax=e.x;ay=e.y;const d=Math.hypot(p.x-e.x,p.y-e.y),a=Math.atan2(p.y-e.y,p.x-e.x),orbit=.55;
        const near=hero==='kiet'?90:hero==='an'?150:210,far=hero==='kiet'?160:hero==='an'?260:330;const retreat=d<near?1:d>far?-.65:0;dx=Math.cos(a)*retreat-Math.sin(a)*orbit;dy=Math.sin(a)*retreat+Math.cos(a)*orbit;
        const away=Math.hypot(p.x-center.x,p.y-center.y);if(away>390){dx+=(center.x-p.x)/away*.85;dy+=(center.y-p.y)/away*.85}
      }
      for(const b of g.projectiles){if(b.friendly)continue;const d=Math.hypot(b.x-p.x,b.y-p.y);if(d<75){dx+=(p.x-b.x)/Math.max(1,d);dy+=(p.y-b.y)/Math.max(1,d)}}
      for(const t of g.telegraphs){const d=Math.hypot(t.x-p.x,t.y-p.y);if(d<t.r+45){dx+=(p.x-t.x)/Math.max(1,d)*2;dy+=(p.y-t.y)/Math.max(1,d)*2}}
      for(const t of g.sagaTelegraphs){if(t.timer>.7)continue;let tx=t.x,ty=t.y;if(t.kind==='line'){const sx=t.x2-t.x,sy=t.y2-t.y,u=Math.max(0,Math.min(1,((p.x-t.x)*sx+(p.y-t.y)*sy)/(sx*sx+sy*sy||1)));tx+=sx*u;ty+=sy*u}const d=Math.hypot(p.x-tx,p.y-ty);if(t.kind==='ring'){if(d>t.inner-35&&d<t.r+35){const direction=d<(t.inner+t.r)/2?-1:1;dx+=(p.x-tx)/Math.max(1,d)*direction*3;dy+=(p.y-ty)/Math.max(1,d)*direction*3}}else if(d<(t.r||40)+45){dx+=(p.x-tx)/Math.max(1,d)*3;dy+=(p.y-ty)/Math.max(1,d)*3}}
      const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l}
      if(l>.1&&g.world.collision(p.x+dx*48,p.y+dy*48,p.r+3)){const wanted=Math.atan2(dy,dx);for(const offset of [.5,-.5,1,-1,1.5,-1.5,2,-2,Math.PI]){const a=wanted+offset,nx=Math.cos(a),ny=Math.sin(a);if(!g.world.collision(p.x+nx*48,p.y+ny*48,p.r+3)){dx=nx;dy=ny;break}}}
      g.input={dx,dy,fire:!!e,aimX:ax,aimY:ay};p.facing=Math.atan2(ay-p.y,ax-p.x);
      if(g.isElemental&&g.elementSplitCd===0&&g.elementSplitTime===0&&p.mp>=60){g.selectSplitCount(7);g.splitElementals()}if(e&&g.player.cd.q===0)g.skill('q');if(e&&g.player.cd.e===0&&Math.hypot(e.x-p.x,e.y-p.y)<300)g.skill('e');if(e&&p.ult>=100)g.skill('r');if(p.hp<p.maxHp*.48)g.heal();
      if(e&&Math.hypot(e.x-p.x,e.y-p.y)<150&&p.cd.dash===0)g.dash();
      g.update(1/60);ticks++;reward();
    }
    if(!done())fs.writeFileSync(path.join(root,'runtime','qa-combat-failed.json'),JSON.stringify({hero,center,player:g.player,guardians:g.world.shrines.map(s=>({id:s.id,ids:s.guardians})),enemies:g.world.enemies.filter(e=>e.alive&&Math.hypot(e.x-center.x,e.y-center.y)<700),fields:g.mythicFields,queue:g.castQueue},null,2));return done();
  }
  for(const s of g.world.shrines){
    g.player.x=s.x+230;g.player.y=s.y+55;
    if(s.id==='truc')assert(fight(s,()=>!s.guardians.some(id=>g.world.enemies.find(e=>e.id===id&&e.alive))),`${hero} cannot clear ${s.id}`);
    else{
      let completed=false;
      for(let attempt=0;attempt<5&&!completed;attempt++){
        g.player.x=s.x;g.player.y=s.y+40;assert(g.interact());
        assert(fight(s,()=>g.challenge[s.id].complete||!g.challenge[s.id].started,12000),`${hero} challenge timer stalled: ${s.id}`);
        completed=g.challenge[s.id].complete;
      }
      assert(completed,`${hero} cannot complete challenge ${s.id}`);
    }
    g.player.x=s.x;g.player.y=s.y+40;assert(g.interact());reward();assert(s.active);stage++;
  }
  g.player.x=1830;g.player.y=653;assert(g.interact());reward();
  g.player.x=2010;g.player.y=690;
  assert(fight({x:1830,y:610},()=>g.victory,18000),`${hero} cannot beat boss`);
  const saga=[];
  for(const chapter of DTWorld.endless.chapters){
    const before=ticks;g.player.x=chapter.x;g.player.y=chapter.y+95;g.world.ensureChunks(g.player.x,g.player.y);assert(g.interact(),hero+' cannot open '+chapter.id);g.consumeEvents();
    for(let i=0;i<3;i++){const echo=g.world.environment.find(o=>o.storyEcho);assert(echo);g.player.x=echo.x;g.player.y=echo.y;assert(g.interact());g.consumeEvents()}
    g.player.x=chapter.x;g.player.y=chapter.y+95;assert(g.interact());assert.equal(g.saga.stage,'boss');g.player.x=chapter.x+230;g.player.y=chapter.y+55;
    assert(fight({...chapter,sagaEncounter:true},()=>g.saga.stage==='claim',18000),hero+' cannot defeat '+chapter.boss);
    g.player.x=chapter.x;g.player.y=chapter.y+95;assert(g.interact());reward();saga.push({chapter:chapter.id,completed:true,simulatedSeconds:Math.round((ticks-before)/60)});
  }
  assert.equal(g.saga.stage,'complete');
  const report={hero,completed:true,simulatedSeconds:Math.round(ticks/60),deaths:g.deaths,level:g.player.level,kills:g.kills,hp:Math.round(g.player.hp),seals:stage,saga};reports.push(report);console.log(JSON.stringify(report));
}
fs.writeFileSync(path.join(root,'qa','ascension-playthrough-report.json'),JSON.stringify({method:'Actual v0.7 full-stack combat simulation for five heroes: miniboss, timed defense, forge cores, three-phase Coi Da and all six saga bosses with their three echoes and rewards. No invulnerability or damage cheats; relocation between arenas and death returns excludes travel time. A controller spends earned skill points, chooses existing talents and uses normal attacks, skills, potions, collision avoidance and dodges. This validates encounters, not natural travel duration or human difficulty.',results:reports},null,2));
