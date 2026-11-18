(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const boss=e=>e.type==='boss'||e.sagaBoss||e.miniBoss||e.mythicBoss;
  const zones=g=>g.mythicFields.filter(f=>f.kind==='tactical-zone'&&f.life>0);
  const fields=new Set(['tactical-zone','airdrop-zone','shrapnel-fire']);
  function damage(g,e,power,kind='skill'){
    const prior=g.hitContext;g.hitContext=null;
    try{return g.withDamage?g.withDamage(kind,()=>g.damageEnemy(e,power,false)):g.damageEnemy(e,power,false)}finally{g.hitContext=prior}
  }
  function boon(g){
    const p=g.player,s=g.passiveState,rank=g.skillRanks.passive,m=p.recoveryMultiplier||1;
    s.ammo=Math.min(6,(s.ammo||0)+1);p.mp=Math.min(p.maxMp,p.mp+5+rank*1.5);
    s.ammoShield=Math.min(p.shield||0,s.ammoShield||0);
    const gain=Math.min(Math.max(0,65-s.ammoShield),(8+rank*4)*m);
    s.ammoShield+=gain;p.shield+=gain;if(g.recoveryDepth)g.recoveryShieldBonus=(g.recoveryShieldBonus||0)+gain;
  }
  function rocketThreshold(g){return Math.max(5,8-(g.skillRanks?.passive||0))}
  function burst(g,e,ratio=1){
    if(!(e.targetLocks>0))return;
    const queue=g.aitBursts||(g.aitBursts=[]);
    if(queue.some(q=>q.e===e))return;queue.push({e,ratio});
    if(g.aitBurstActive)return;g.aitBurstActive=true;
    try{while(queue.length){
      const {e:source,ratio:scale}=queue.shift();source.targetLocks=0;source.targetLockUntil=0;
      const power=g.player.damage*(2.2+.35*g.skillRanks.passive)*scale,r=110*(g.player.areaMultiplier||1);
      g.effect('ait01-grenade_explosion',source.x,source.y,'#ffe478',r,.5);boon(g);
      const airdrop=g.mythicFields.some(f=>f.kind==='airdrop-zone'&&f.life>0&&dist(f,source)<=f.r);
      for(const target of g.world.enemies)if(target.alive&&dist(source,target)<r+(target.r||0)){
        damage(g,target,power);target.burn=Math.max(target.burn||0,2);target.burnTick=0;
        if(boss(target)){target.weakened=1.5;target.relicSlow=1.5;target.relicSlowFactor=.75}
        else target.stunned=Math.max(target.stunned||0,.5);
        if(airdrop&&target.alive)damage(g,target,power*.35,'true');
      }
      if(airdrop)g.effect('ait01-rocket_missile',source.x,source.y,'#ff8566',75,.48);
      if(g.skillRanks.passive){const target=g.world.enemies.filter(t=>t.alive&&t!==source&&dist(t,source)<220).sort((a,b)=>dist(a,source)-dist(b,source))[0];if(target)locks(g,target,1+Math.floor(g.skillRanks.passive/2))}
    }}finally{g.aitBurstActive=false;queue.length=0}
  }
  function locks(g,e,n=1,early=false){
    if((e.targetLockUntil||0)<=g.time)e.targetLocks=0;
    e.targetLocks=Math.min(5,(e.targetLocks||0)+n);e.targetLockUntil=g.time+6;
    if(e.targetLocks>=5||early&&e.targetLocks>=3)burst(g,e,early&&e.targetLocks<5?.85:1);
  }
  function hit(g,e,power,n=1,kind='skill',early=false){damage(g,e,power,kind);locks(g,e,n,early)}
  function primary(g,power){
    const p=g.player,s=g.passiveState,third=s.attackCount%3===0,need=rocketThreshold(g);
    g.shoot(p.x,p.y,p.facing,820,power,'#4df3ff',{kind:'rifle_bullet',r:5,life:1.15,signature:true,aitLocks:1});
    if(third)g.shoot(p.x,p.y,p.facing,780,power*1.35,'#ffe478',{kind:'shotgun_blast',r:9,life:1.05,pierce:1,signature:true,aitLocks:2,aitThird:s.attackCount});
    if(s.attackCount%need===0)g.shoot(p.x,p.y,p.facing,840,power*1.55,'#ff8566',{kind:'rocket_missile',r:10,life:1.15,pierce:1,signature:true,aitLocks:2});
    for(const z of zones(g)){
      const a=Math.atan2(g.input.aimY-z.y,g.input.aimX-z.x);
      g.shoot(z.x,z.y,a,820,p.damage*.55,'#4df3ff',{kind:'rifle_bullet',r:4,life:.85,ally:true,charge:false,aitLocks:1});
    }
  }
  function bulletHit(g,b,e){
    if(!b.aitLocks)return;
    if(b.aitThird&&g.passiveState.ammoAttack!==b.aitThird){g.passiveState.ammoAttack=b.aitThird;boon(g)}
    if(b.kind==='shotgun_blast'){e.relicSlow=.8;e.relicSlowFactor=.85}
    if(b.sourceSkill==='q'){e.slow=Math.max(e.slow||0,1.2)}
    locks(g,e,b.aitLocks,!!b.aitEmpowered);
  }
  function empower(g,key){
    if(!['q','e'].includes(key)||(g.passiveState.ammo||0)<6)return false;
    g.passiveState.ammo=0;const other=key==='q'?'e':'q';g.player.cd[other]=Math.max(0,g.player.cd[other]-1.5);return true;
  }
  function canRecast(g){const a=g.player.action;return g.hero.id==='ait01'&&!g.player.ultIntro&&!g.dead&&!g.paused&&g.time<g.aitRecastUntil&&zones(g).length>0&&(!a||a.elapsed>=a.release+.1)}
  function recast(g){
    if(!canRecast(g)||g.player.dashTime>0)return false;
    const p=g.player,active=zones(g);g.aitRecastUntil=0;
    for(const f of active){
      for(const e of g.world.enemies)if(e.alive&&!boss(e)&&dist(e,f)<260){const d=dist(e,f),step=Math.min(75,d*.35);if(d>1)g.moveEntity(e,(f.x-e.x)/d*step,(f.y-e.y)/d*step)}
      f.life=0;g.effect('ait01-grenade_explosion',f.x,f.y,'#ffe478',f.r,.5);
      for(const e of g.world.enemies)if(e.alive&&dist(e,f)<f.r+(e.r||0))hit(g,e,p.damage*1.9,1,'summon');
    }
    g.mythicFields=g.mythicFields.filter(f=>f.life>0);p.inventoryOverdrive=4.5*(p.summonDuration||1);g.aitOverdriveTick=0;
    p.shield=Math.max(p.shield||0,Math.min(110,(p.shield||0)+25+g.skillRanks.e*6));if(g.specializations?.e==='agile')g.agileTime=2;
    if(g.skillRanks.passive>=3)g.passiveState.ammo=Math.min(6,(g.passiveState.ammo||0)+2);
    g.beginAction('e',p.facing);g.emit('sound',{name:'skill'});return true;
  }
  function release(g,c){
    const p=g.player,rank=g.skillRanks[c.key],power=p.damage*c.power,a=c.angle;
    if(g.skillRanks.passive>=3&&['q','e'].includes(c.key))g.passiveState.ammo=Math.min(6,(g.passiveState.ammo||0)+1);
    if(c.key==='q'){
      const focus=g.specializations?.q==='focus',range=focus?780:680,speed=focus?1300:1000;
      for(const offset of c.aitEmpowered?[-.18,0,.18]:[0]){
        g.shoot(p.x,p.y,a+offset,speed,power*3.4,'#4df3ff',{kind:'rocket_missile',sourceSkill:'q',pierce:10000,r:13,life:range/speed,aitLocks:focus?3:2,aitEmpowered:!!c.aitEmpowered,aitBurst:g.specializations?.q==='burst'});
        if(g.specializations?.q==='burst')for(let i=1;i<=7;i++)g.addField('shrapnel-fire',p.x+Math.cos(a+offset)*range*i/7,p.y+Math.sin(a+offset)*range*i/7,{r:45,life:2.5,power:power*.3,tick:.25});
      }
    }
    if(c.key==='e'){
      for(const offset of c.aitEmpowered?[-90,90]:[0]){
        const spot=g.elementSafeSpot(c.target.x-Math.sin(a)*offset,c.target.y+Math.cos(a)*offset)||{x:p.x,y:p.y},active=zones(g);
        if(active.length>=2){active[0].life=0;g.mythicFields=g.mythicFields.filter(f=>f.life>0)}
        const f=g.addField('tactical-zone',spot.x,spot.y,{r:145,life:7+rank*.8,power:power*.75,tick:.75,inside:[]});
        g.effect('ait01-grenade_explosion',spot.x,spot.y,'#ffe478',135,.5);
        for(const e of g.world.enemies)if(e.alive&&dist(e,f)<=f.r){e.rooted=boss(e)?.35:1.2;f.inside.push(e.id)}
      }
      g.aitRecastUntil=g.time+4;
    }
    if(c.key==='r'){
      const f=g.addField('airdrop-zone',c.target.x,c.target.y,{r:250,life:8+rank*1.2,power,tick:.32,strikes:0,extraStrikes:g.specializations?.r==='might'?10:0});
      for(const e of g.world.enemies)if(e.alive&&dist(e,f)<=f.r)hit(g,e,power*2.4,2);
      g.effect('ait01-grenade_explosion',f.x,f.y,'#ff8566',f.r,.7);
    }
  }
  function updateField(g,f,dt){
    const p=g.player;
    if(f.kind==='tactical-zone'){
      const inside=g.world.enemies.filter(e=>e.alive&&dist(e,f)<=f.r);
      for(const e of inside)if(!f.inside.includes(e.id))e.rooted=boss(e)?.35:1.2;
      f.inside=inside.map(e=>e.id);
      if(g.specializations?.e==='lasting'&&dist(p,f)<f.r)g.healAmount?g.healAmount(2.5*dt):p.hp=Math.min(p.maxHp,p.hp+2.5*dt);
      if(f.tick<=0&&f.life>0){f.tick+=.75;for(const e of inside)hit(g,e,f.power,1,'summon')}
    }else if(f.kind==='airdrop-zone'&&f.tick<=0&&f.life>0){
      f.tick+=.32;f.strikes++;
      const targets=g.world.enemies.filter(e=>e.alive&&dist(e,f)<=f.r).sort((a,b)=>(b.targetLocks||0)-(a.targetLocks||0)||dist(a,f)-dist(b,f));
      const strike=target=>{const t=target||f;g.effect('ait01-rocket_missile',t.x,t.y,'#ff8566',75,.48);for(const e of g.world.enemies)if(e.alive&&dist(e,t)<75*(p.areaMultiplier||1))hit(g,e,f.power*1.45)};
      strike(targets[0]);if(f.extraStrikes>0){f.extraStrikes--;strike(targets[1]||targets[0])}
    }else if(f.kind==='shrapnel-fire'&&f.tick<=0&&f.life>0){f.tick+=.5;for(const e of g.world.enemies)if(e.alive&&dist(e,f)<f.r){hit(g,e,f.power);e.burn=1}}
  }
  function projectiles(g,dt){
    const active=zones(g);
    for(const b of g.projectiles)if(!b.friendly){const slow=active.some(f=>dist(b,f)<f.r);if(slow&&!b.aitSlowed){b.vx*=.7;b.vy*=.7;b.aitSlowed=true}else if(!slow&&b.aitSlowed){b.vx/=.7;b.vy/=.7;b.aitSlowed=false}}
    for(const b of g.projectiles)if(b.aitBurst&&!b.aitEnded&&(b.life<=dt||g.world.collision(b.x+b.vx*dt,b.y+b.vy*dt,2))){
      b.aitEnded=true;const t={x:b.x+b.vx*Math.min(b.life,dt),y:b.y+b.vy*Math.min(b.life,dt)};
      g.effect('ait01-grenade_explosion',t.x,t.y,'#ff8566',110,.5);
      for(const e of g.world.enemies)if(e.alive&&dist(e,t)<110*(g.player.areaMultiplier||1))hit(g,e,g.player.damage*1.5);
    }
  }
  function update(g,dt){
    const p=g.player;for(const e of g.world.enemies)if(e.targetLocks&&g.time>=e.targetLockUntil)e.targetLocks=0;
    if(g.aitHelmetCd>0)g.aitHelmetCd=Math.max(0,g.aitHelmetCd-dt);
    if(p.inventoryOverdrive>0){p.inventoryOverdrive=Math.max(0,p.inventoryOverdrive-dt);g.aitOverdriveTick=(g.aitOverdriveTick||0)-dt*(p.summonHaste||1);
      if(g.aitOverdriveTick<=0){g.aitOverdriveTick+=.55;const target=g.world.enemies.filter(e=>e.alive&&dist(e,p)<380).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(target)g.shoot(p.x,p.y,Math.atan2(target.y-p.y,target.x-p.x),820,p.damage*.85,'#4df3ff',{kind:'rifle_bullet',life:.7,ally:true,charge:false,aitLocks:1})}
    }
    if(g.skillRanks.passive>=2){
      g.aitSniperCd=(g.aitSniperCd||0)-dt*(p.summonHaste||1);
      if(g.aitSniperCd<=0){
        const target=g.world.enemies.filter(e=>e.alive&&dist(e,p)<620).sort((a,b)=>dist(b,p)-dist(a,p))[0];
        if(target){g.aitSniperCd=3.5;g.shoot(p.x,p.y,Math.atan2(target.y-p.y,target.x-p.x),1100,p.damage*1.4,'#e0ffff',{kind:'rifle_bullet',life:.75,pierce:3,ally:true,charge:false,aitLocks:1})}
      }
    }
  }
  function save(g){return {ammo:g.passiveState.ammo||0,ammoShield:g.passiveState.ammoShield||0,attackCount:g.passiveState.attackCount,ammoAttack:g.passiveState.ammoAttack||0,recast:Math.max(0,(g.aitRecastUntil||0)-g.time),overdrive:g.player.inventoryOverdrive||0,overdriveTick:g.aitOverdriveTick||0,helmetCd:g.aitHelmetCd||0,fields:g.mythicFields.filter(f=>fields.has(f.kind)).map(f=>({...f})),locks:g.world.enemies.filter(e=>e.alive&&e.targetLocks).map(e=>({id:e.id,count:e.targetLocks,left:Math.max(0,e.targetLockUntil-g.time)})),casts:g.castQueue.filter(c=>c.type==='cast'&&['q','e'].includes(c.key)).map(c=>({...c}))}}
  function restore(g,s){
    if(!s||g.hero.id!=='ait01')return;
    const p=g.player;Object.assign(g.passiveState,{ammo:Math.floor(clamp(s.ammo,0,6)),ammoShield:clamp(s.ammoShield,0,Math.min(65,p.shield||0)),attackCount:Math.floor(clamp(s.attackCount,0,1e9)),ammoAttack:Math.floor(clamp(s.ammoAttack,0,1e9))});
    p.inventoryOverdrive=clamp(s.overdrive,0,45);g.aitOverdriveTick=clamp(s.overdriveTick,0,.55);g.aitRecastUntil=g.time+clamp(s.recast,0,4);g.aitHelmetCd=clamp(s.helmetCd,0,8);
    const coord=v=>Number.isFinite(v)&&Math.abs(v)<=2e7;
    for(const f of(Array.isArray(s.fields)?s.fields:[]).slice(0,24))if(f&&fields.has(f.kind)&&coord(f.x)&&coord(f.y)&&f.life>0){
      if(f.kind==='tactical-zone'&&zones(g).length>=2)continue;
      g.mythicFields.push({id:'mythic-'+(++g.fieldSerial),kind:f.kind,x:f.x,y:f.y,r:clamp(f.r,1,2200),life:clamp(f.life,0,180),age:clamp(f.age,0,180),power:clamp(f.power,0,50000),tick:clamp(f.tick,0,1),inside:[],damageClass:f.kind==='tactical-zone'?'summon':'skill',strikes:Math.floor(clamp(f.strikes,0,1000)),extraStrikes:Math.floor(clamp(f.extraStrikes,0,10))});
    }
    for(const m of(Array.isArray(s.locks)?s.locks:[]).slice(0,5000)){if(!m)continue;const e=g.world.enemies.find(e=>e.alive&&e.id===m.id);if(e&&m.left>0){e.targetLocks=Math.floor(clamp(m.count,0,4));e.targetLockUntil=g.time+clamp(m.left,0,6)}}
    if(!p.ultIntro)for(const c of(Array.isArray(s.casts)?s.casts:[]).slice(0,1))if(c&&['q','e'].includes(c.key)&&Number.isFinite(c.angle)&&coord(c.target?.x)&&coord(c.target?.y)){
      g.castQueue.push({type:'cast',key:c.key,angle:c.angle,target:{x:c.target.x,y:c.target.y},power:1+.18*g.skillRanks[c.key],delay:clamp(c.delay,0,.14),aitEmpowered:c.aitEmpowered===true});g.beginAction(c.key,c.angle);
    }
  }
  root.DTAit01={primary,bulletHit,locks,burst,empower,canRecast,recast,release,updateField,projectiles,update,save,restore,zones,fields,boon};
})(globalThis);
