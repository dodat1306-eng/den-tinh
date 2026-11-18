(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const boss=e=>e.type==='boss'||e.sagaBoss||e.miniBoss||e.mythicBoss;
  const stakes=g=>g.mythicFields.filter(f=>f.kind==='bagua-stake'&&f.life>0);
  const fields=new Set(['bagua-stake','heaven-seal','cinnabar-fire']);
  function damage(g,e,power,kind='skill'){
    // A detonation inside a bullet hit must not inherit that bullet's normal-damage context.
    const prior=g.hitContext;g.hitContext=null;
    try{return g.withDamage?g.withDamage(kind,()=>g.damageEnemy(e,power,false)):g.damageEnemy(e,power,false)}finally{g.hitContext=prior}
  }
  function boon(g){
    const p=g.player,s=g.passiveState,rank=g.skillRanks.passive,m=p.recoveryMultiplier||1;
    s.coins=Math.min(6,(s.coins||0)+1);p.mp=Math.min(p.maxMp,p.mp+5+rank*1.5);
    s.coinShield=Math.min(p.shield||0,s.coinShield||0);
    const gain=Math.min(Math.max(0,65-s.coinShield),(8+rank*4)*m);
    s.coinShield+=gain;p.shield+=gain;if(g.recoveryDepth)g.recoveryShieldBonus=(g.recoveryShieldBonus||0)+gain;
  }
  function burst(g,e,ratio=1){
    if(!(e.talismanMarks>0))return;
    const queue=g.quynhBursts||(g.quynhBursts=[]);
    if(queue.some(q=>q.e===e))return;queue.push({e,ratio});
    if(g.quynhBurstActive)return;g.quynhBurstActive=true;
    try{while(queue.length){
      const {e:source,ratio:scale}=queue.shift();source.talismanMarks=0;source.talismanUntil=0;
      const power=g.player.damage*(2.2+.35*g.skillRanks.passive)*scale,r=110*(g.player.areaMultiplier||1);
      g.effect('quynh-talisman_burst',source.x,source.y,'#ffd166',r,.5);boon(g);
      const heaven=g.mythicFields.some(f=>f.kind==='heaven-seal'&&f.life>0&&dist(f,source)<=f.r);
      for(const target of g.world.enemies)if(target.alive&&dist(source,target)<r+(target.r||0)){
        damage(g,target,power);
        if(boss(target)){target.weakened=1.5;target.relicSlow=1.5;target.relicSlowFactor=.75}
        else target.stunned=Math.max(target.stunned||0,.5);
        if(heaven&&target.alive)damage(g,target,power*.35,'true');
      }
      if(heaven)g.effect('quynh-thunder_talisman_drop',source.x,source.y,'#ffd166',75,.48);
      if(g.skillRanks.passive){const target=g.world.enemies.filter(t=>t.alive&&t!==source&&dist(t,source)<220).sort((a,b)=>dist(a,source)-dist(b,source))[0];if(target)marks(g,target,1+Math.floor(g.skillRanks.passive/2))}
    }}finally{g.quynhBurstActive=false;queue.length=0}
  }
  function marks(g,e,n=1,early=false){
    if((e.talismanUntil||0)<=g.time)e.talismanMarks=0;
    e.talismanMarks=Math.min(5,(e.talismanMarks||0)+n);e.talismanUntil=g.time+6;
    if(e.talismanMarks>=5||early&&e.talismanMarks>=3)burst(g,e,early&&e.talismanMarks<5?.85:1);
  }
  function hit(g,e,power,n=1,kind='skill',early=false){damage(g,e,power,kind);marks(g,e,n,early)}
  function primary(g,power){
    const p=g.player,third=g.passiveState.attackCount%3===0;
    g.shoot(p.x,p.y,p.facing,760,power,'#ffd166',{kind:'talisman_bolt',r:5,life:1.15,signature:true,quynhMarks:1});
    if(third)g.shoot(p.x,p.y,p.facing,760,power*1.35,'#ff6b6b',{kind:'cinnabar_slash',r:9,life:1.15,pierce:1,signature:true,quynhMarks:2,quynhThird:g.passiveState.attackCount});
  }
  function bulletHit(g,b,e){
    if(!b.quynhMarks)return;
    if(b.quynhThird&&g.passiveState.coinAttack!==b.quynhThird){g.passiveState.coinAttack=b.quynhThird;boon(g)}
    if(b.kind==='cinnabar_slash'){e.relicSlow=.8;e.relicSlowFactor=.85}
    if(b.sourceSkill==='q'){e.slow=Math.max(e.slow||0,1.2)}
    marks(g,e,b.quynhMarks,!!b.quynhEmpowered);
  }
  function empower(g,key){
    if(!['q','e'].includes(key)||(g.passiveState.coins||0)<6)return false;
    g.passiveState.coins=0;const other=key==='q'?'e':'q';g.player.cd[other]=Math.max(0,g.player.cd[other]-1.5);return true;
  }
  function canRecast(g){const a=g.player.action;return g.hero.id==='quynhkun'&&!g.player.ultIntro&&!g.dead&&!g.paused&&g.time<g.quynhRecastUntil&&stakes(g).length>0&&(!a||a.elapsed>=a.release+.1)}
  function recast(g){
    if(!canRecast(g)||g.player.dashTime>0)return false;
    const p=g.player,active=stakes(g);g.quynhRecastUntil=0;
    for(const f of active){
      for(const e of g.world.enemies)if(e.alive&&!boss(e)&&dist(e,f)<260){const d=dist(e,f),step=Math.min(75,d*.35);if(d>1)g.moveEntity(e,(f.x-e.x)/d*step,(f.y-e.y)/d*step)}
      f.life=0;g.effect('quynh-talisman_burst',f.x,f.y,'#ffd166',f.r,.5);
      for(const e of g.world.enemies)if(e.alive&&dist(e,f)<f.r+(e.r||0))hit(g,e,p.damage*1.9,1,'summon');
    }
    g.mythicFields=g.mythicFields.filter(f=>f.life>0);p.talismanWard=4.5*(p.summonDuration||1);g.quynhWardTick=0;
    // Recast shield stacks only up to 110 so repeated E recasts cannot bank unlimited shield.
    p.shield=Math.max(p.shield||0,Math.min(110,(p.shield||0)+25+g.skillRanks.e*6));if(g.specializations?.e==='agile')g.agileTime=2;
    g.beginAction('e',p.facing);g.emit('sound',{name:'skill'});return true;
  }
  function release(g,c){
    const p=g.player,rank=g.skillRanks[c.key],power=p.damage*c.power,a=c.angle;
    if(c.key==='q'){
      const focus=g.specializations?.q==='focus',range=focus?780:680,speed=focus?1300:1000;
      for(const offset of c.quynhEmpowered?[-.18,0,.18]:[0]){
        g.shoot(p.x,p.y,a+offset,speed,power*3.4,'#ff6b6b',{kind:'grand_talisman',sourceSkill:'q',pierce:10000,r:13,life:range/speed,quynhMarks:focus?3:2,quynhEmpowered:!!c.quynhEmpowered,quynhBurst:g.specializations?.q==='burst'});
        if(g.specializations?.q==='burst')for(let i=1;i<=7;i++)g.addField('cinnabar-fire',p.x+Math.cos(a+offset)*range*i/7,p.y+Math.sin(a+offset)*range*i/7,{r:45,life:2.5,power:power*.3,tick:.25});
      }
    }
    if(c.key==='e'){
      for(const offset of c.quynhEmpowered?[-90,90]:[0]){
        const spot=g.elementSafeSpot(c.target.x-Math.sin(a)*offset,c.target.y+Math.cos(a)*offset)||{x:p.x,y:p.y},active=stakes(g);
        if(active.length>=2){active[0].life=0;g.mythicFields=g.mythicFields.filter(f=>f.life>0)}
        const f=g.addField('bagua-stake',spot.x,spot.y,{r:145,life:7+rank*.8,power:power*.75,tick:.75,inside:[]});
        for(const e of g.world.enemies)if(e.alive&&dist(e,f)<=f.r){e.rooted=boss(e)?.35:1.2;f.inside.push(e.id)}
      }
      g.quynhRecastUntil=g.time+4;
    }
    if(c.key==='r'){
      const f=g.addField('heaven-seal',c.target.x,c.target.y,{r:250,life:8+rank*1.2,power,tick:.32,strikes:0,extraStrikes:g.specializations?.r==='might'?10:0});
      for(const e of g.world.enemies)if(e.alive&&dist(e,f)<=f.r)hit(g,e,power*2.4,2);
      g.effect('quynh-talisman_burst',f.x,f.y,'#ffd166',f.r,.7);
    }
  }
  function updateField(g,f,dt){
    const p=g.player;
    if(f.kind==='bagua-stake'){
      const inside=g.world.enemies.filter(e=>e.alive&&dist(e,f)<=f.r);
      for(const e of inside)if(!f.inside.includes(e.id))e.rooted=boss(e)?.35:1.2;
      f.inside=inside.map(e=>e.id);
      if(g.specializations?.e==='lasting'&&dist(p,f)<f.r)g.healAmount?g.healAmount(2.5*dt):p.hp=Math.min(p.maxHp,p.hp+2.5*dt);
      if(f.tick<=0&&f.life>0){f.tick+=.75;for(const e of inside)hit(g,e,f.power,1,'summon')}
    }else if(f.kind==='heaven-seal'&&f.tick<=0&&f.life>0){
      f.tick+=.32;f.strikes++;
      const targets=g.world.enemies.filter(e=>e.alive&&dist(e,f)<=f.r).sort((a,b)=>(b.talismanMarks||0)-(a.talismanMarks||0)||dist(a,f)-dist(b,f));
      const strike=target=>{const t=target||f;g.effect('quynh-thunder_talisman_drop',t.x,t.y,'#ffd166',75,.48);for(const e of g.world.enemies)if(e.alive&&dist(e,t)<75*(p.areaMultiplier||1))hit(g,e,f.power*1.45)};
      strike(targets[0]);if(f.extraStrikes>0){f.extraStrikes--;strike(targets[1]||targets[0])}
    }else if(f.kind==='cinnabar-fire'&&f.tick<=0&&f.life>0){f.tick+=.5;for(const e of g.world.enemies)if(e.alive&&dist(e,f)<f.r){hit(g,e,f.power);e.burn=1}}
  }
  function projectiles(g,dt){
    const active=stakes(g);
    for(const b of g.projectiles)if(!b.friendly){const slow=active.some(f=>dist(b,f)<f.r);if(slow&&!b.quynhSlowed){b.vx*=.7;b.vy*=.7;b.quynhSlowed=true}else if(!slow&&b.quynhSlowed){b.vx/=.7;b.vy/=.7;b.quynhSlowed=false}}
    for(const b of g.projectiles)if(b.quynhBurst&&!b.quynhEnded&&(b.life<=dt||g.world.collision(b.x+b.vx*dt,b.y+b.vy*dt,2))){
      b.quynhEnded=true;const t={x:b.x+b.vx*Math.min(b.life,dt),y:b.y+b.vy*Math.min(b.life,dt)};
      g.effect('quynh-talisman_burst',t.x,t.y,'#ff6b6b',110,.5);
      for(const e of g.world.enemies)if(e.alive&&dist(e,t)<110*(g.player.areaMultiplier||1))hit(g,e,g.player.damage*1.5);
    }
  }
  function update(g,dt){
    const p=g.player;for(const e of g.world.enemies)if(e.talismanMarks&&g.time>=e.talismanUntil)e.talismanMarks=0;
    if(p.talismanWard>0){p.talismanWard=Math.max(0,p.talismanWard-dt);g.quynhWardTick=(g.quynhWardTick||0)-dt*(p.summonHaste||1);
      if(g.quynhWardTick<=0){g.quynhWardTick+=.55;const target=g.world.enemies.filter(e=>e.alive&&dist(e,p)<380).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(target)g.shoot(p.x,p.y,Math.atan2(target.y-p.y,target.x-p.x),760,p.damage*.85,'#ffd166',{kind:'talisman_bolt',life:.7,ally:true,charge:false,quynhMarks:1})}
    }
  }
  function save(g){return {coins:g.passiveState.coins||0,coinShield:g.passiveState.coinShield||0,attackCount:g.passiveState.attackCount,coinAttack:g.passiveState.coinAttack||0,recast:Math.max(0,(g.quynhRecastUntil||0)-g.time),ward:g.player.talismanWard||0,wardTick:g.quynhWardTick||0,fields:g.mythicFields.filter(f=>fields.has(f.kind)).map(f=>({...f})),marks:g.world.enemies.filter(e=>e.alive&&e.talismanMarks).map(e=>({id:e.id,count:e.talismanMarks,left:Math.max(0,e.talismanUntil-g.time)})),casts:g.castQueue.filter(c=>c.type==='cast'&&['q','e'].includes(c.key)).map(c=>({...c}))}}
  function restore(g,s){
    if(!s||g.hero.id!=='quynhkun')return;
    const p=g.player;Object.assign(g.passiveState,{coins:Math.floor(clamp(s.coins,0,6)),coinShield:clamp(s.coinShield,0,Math.min(65,p.shield||0)),attackCount:Math.floor(clamp(s.attackCount,0,1e9)),coinAttack:Math.floor(clamp(s.coinAttack,0,1e9))});
    p.talismanWard=clamp(s.ward,0,45);g.quynhWardTick=clamp(s.wardTick,0,.55);g.quynhRecastUntil=g.time+clamp(s.recast,0,4);
    const coord=v=>Number.isFinite(v)&&Math.abs(v)<=2e7;
    for(const f of(Array.isArray(s.fields)?s.fields:[]).slice(0,24))if(f&&fields.has(f.kind)&&coord(f.x)&&coord(f.y)&&f.life>0){
      if(f.kind==='bagua-stake'&&stakes(g).length>=2)continue;
      // Saved fields are already scaled; bypass addField so DOM/AURA are not applied twice.
      g.mythicFields.push({id:'mythic-'+(++g.fieldSerial),kind:f.kind,x:f.x,y:f.y,r:clamp(f.r,1,2200),life:clamp(f.life,0,180),age:clamp(f.age,0,180),power:clamp(f.power,0,50000),tick:clamp(f.tick,0,1),inside:[],damageClass:f.kind==='bagua-stake'?'summon':'skill',strikes:Math.floor(clamp(f.strikes,0,1000)),extraStrikes:Math.floor(clamp(f.extraStrikes,0,10))});
    }
    for(const m of(Array.isArray(s.marks)?s.marks:[]).slice(0,5000)){if(!m)continue;const e=g.world.enemies.find(e=>e.alive&&e.id===m.id);if(e&&m.left>0){e.talismanMarks=Math.floor(clamp(m.count,0,4));e.talismanUntil=g.time+clamp(m.left,0,6)}}
    if(!p.ultIntro)for(const c of(Array.isArray(s.casts)?s.casts:[]).slice(0,1))if(c&&['q','e'].includes(c.key)&&Number.isFinite(c.angle)&&coord(c.target?.x)&&coord(c.target?.y)){
      g.castQueue.push({type:'cast',key:c.key,angle:c.angle,target:{x:c.target.x,y:c.target.y},power:1+.18*g.skillRanks[c.key],delay:clamp(c.delay,0,.14),quynhEmpowered:c.quynhEmpowered===true});g.beginAction(c.key,c.angle);
    }
  }
  root.DTQuynhKun={primary,bulletHit,marks,burst,empower,canRecast,recast,release,updateField,projectiles,update,save,restore,stakes,fields,boon};
})(globalThis);
