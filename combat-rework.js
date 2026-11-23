(function (root) {
  'use strict';

  const gold='#ffe29a';
  const counters={
    an:{name:'Hỏa Phượng Xung Kích', power:2.8, color:'#ffab64'},
    linh:{name:'Thiên Tiễn Truy Hồn', power:2.4, color:'#c6f0a0'},
    quanle:{name:'Thập Tự Hắc Nguyệt', power:3, color:'#ca9df1'},
    hoavi:{name:'SUDO OVERRIDE', power:2.9, color:'#8fffe4'},
    thienvu:{name:'Cộng Hưởng Thất Tinh', power:2.9},
    quynhkun:{name:'Kim Tiền Bát Quái Trận', power:2.75, color:'#ffd675'},
    ait01:{name:'Đạn Pháo Xung Kích Chiến Thuật', power:2.85, color:'#9bbaff'}
  };
  const ranks=['','Khởi Nguyên','Thức Tỉnh','Thần Khí Hoàng Kim'];
  const postureHits=new WeakMap();
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const angleTo=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
  const point=(a,heading,length)=>({x:a.x+Math.cos(heading)*length,y:a.y+Math.sin(heading)*length});
  const boss=e=>!!(e.type==='boss'||e.miniBoss||e.sagaBoss||e.mythicBoss||e.v09Boss);
  const tier=game=>game.player.level>=10||game.heroQuest?.completed?3:game.player.level>=5?2:1;

  function segment(at,a,b) {
    const dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((at.x-a.x)*dx+(at.y-a.y)*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(at.x-a.x-t*dx,at.y-a.y-t*dy);
  }

  function closest(game,at,r,exclude) {
    let best=null, bestRange=r;
    for (const e of game.world.enemies) {
      if (!e.alive||e===exclude) continue;
      const d=distance(e,at);
      if (d<bestRange) { best=e; bestRange=d; }
    }
    return best;
  }

  function startsDash(game) {
    game.dodgeWindow=.15;
    game.dodgeOrigin={x:game.player.x,y:game.player.y};
    game.dashWish=false;
    checkDodge(game);
  }

  function threatens(player,t) {
    if (!(t.timer>=0&&t.timer<.18)) return false;
    const margin=player.r+36;
    if (Number.isFinite(t.x2)) return segment(player,t,{x:t.x2,y:t.y2})<(t.r||0)+margin;
    const d=distance(player,t);
    return d<(t.r||0)+margin && (t.kind!=='ring'||d+margin>t.inner);
  }

  function checkDodge(game) {
    const p=game.player;
    if (p.dashTime<=0) return false;
    const bullet=game.projectiles.some(b=>!b.friendly&&b.life>0&&distance(b,p)<p.r+b.r+36);
    if (!(game.dodgeWindow>0)||game.perfectDodgeCd>0||!counters[game.hero.id]) return false;
    const tell=game.telegraphs.some(t=>threatens(p,t))||game.sagaTelegraphs?.some(t=>threatens(p,t));
    const laser=game.biomeHazards?.some(h=>h.kind==='laser'&&h.end&&segment(p,h,h.end)<p.r+h.r+36);
    if (bullet) root.DTSynergy?.wish(game);
    if (!(bullet||tell||laser)) return false;
    game.dodgeWindow=0;
    game.perfectDodgeCd=1.8;
    game.bulletTime=.5;
    game.dodgeCenter={x:p.x,y:p.y};
    p.perfectCounter=3;
    p.mp=Math.min(p.maxMp,p.mp+22);
    for (const key of ['q','e']) p.cd[key]=Math.max(0,p.cd[key]-2);
    const origin=game.dodgeOrigin||p;
    game.effect('perfect-echo',origin.x,origin.y,gold,35,.55,{hero:game.hero.id,angle:p.facing,moveDir:p.moveDir,element:game.element?.id});
    game.floaters.push({x:p.x,y:p.y-53,text:'✦ NÉ HOÀN HẢO!',color:gold,life:1,vy:-48});
    game.emit('sound',{name:'perfect'});
    root.DTSynergy?.wish(game);
    return true;
  }

  function update(game,dt) {
    const p=game.player;
    game.perfectDodgeCd=Math.max(0,(game.perfectDodgeCd||0)-dt);
    game.bulletTime=Math.max(0,(game.bulletTime||0)-dt);
    p.perfectCounter=Math.max(0,(p.perfectCounter||0)-dt);
    for (const e of game.world.enemies) if (e.alive&&boss(e)) {
      e.maxPosture=100;
      e.posture||=0;
      e.staggered=Math.max(0,(e.staggered||0)-dt);
    }
    checkDodge(game);
    game.dodgeWindow=Math.max(0,(game.dodgeWindow||0)-dt);
  }

  function enemyRate(game,at) {
    return game.bulletTime>0&&game.dodgeCenter&&distance(at,game.dodgeCenter)<650?.22:1;
  }

  function withStrike(game,points,fn) {
    const previous=game.postureStrike;
    game.postureStrike={id:(game.strikeSerial||0)+1, points};
    game.strikeSerial=game.postureStrike.id;
    try { return fn(); } finally { game.postureStrike=previous; }
  }

  function addPosture(game,e,strike,points) {
    if (!e.alive||!boss(e)) return;
    e.maxPosture=100;
    if (e.staggered>0||!(points>0)) return;
    if (strike) {
      let seen=postureHits.get(e);
      if (!seen) postureHits.set(e,seen=new Set());
      if (seen.has(strike.id)) return;
      seen.add(strike.id);
      if (seen.size>96) seen.delete(seen.values().next().value);
    }
    e.posture=(e.posture||0)+points;
    if (e.posture<e.maxPosture) return;
    e.posture=0;
    e.staggered=3.5;
    e.knockX=e.knockY=0;
    for (const list of [game.telegraphs,game.sagaTelegraphs||[]]) {
      for (let i=list.length-1;i>=0;i--) if (list[i].sourceId===e.id) list.splice(i,1);
    }
    game.effect('posture-break',e.x,e.y,gold,e.r+74,.7);
    game.spark(e.x,e.y,20,'#fff6d8',145,.55);
    game.floaters.push({x:e.x,y:e.y-e.r-48,text:'⚡ PHÁ THẾ! (+50% SÁT THƯƠNG)',color:gold,life:1.5,vy:-24});
    game.emit('sound',{name:'steel'});
  }

  function safeEnd(game,origin,a,length) {
    let end=point(origin,a,12);
    for (let d=24;d<=length;d+=16) {
      const pos=point(origin,a,d);
      if (game.world.collision(pos.x,pos.y,2)) break;
      end=pos;
    }
    return end;
  }

  function counterHit(game,e,power,element,strike) {
    const prior=game.hitContext;
    game.hitContext={counter:true, element, strike, damageClass:'normal'};
    try { game.damageEnemy(e,power,false); } finally { game.hitContext=prior; }
  }

  function shootCounter(game,name,angle,speed,power,color,options={}) {
    game.shoot(game.player.x,game.player.y,angle,speed,power,color,{
      kind:'counter-'+name,counter:name,charge:false,secondary:true,
      r:13,life:1.05,pierce:24,...options
    });
  }

  function counter(game) {
    const p=game.player,id=game.hero.id,spec=counters[id];
    if (!(p.perfectCounter>0)||!spec) return false;
    p.perfectCounter=0;
    const a=p.facing,power=p.damage*spec.power;
    const color=spec.color||game.element.color;
    game.floaters.push({x:p.x,y:p.y-46,text:spec.name,color,life:.9,vy:-32});
    game.effect('counter-flare',p.x,p.y,color,66,.36,{angle:a,counter:id});
    game.emit('sound',{name:'ultimate'});
    if (id==='an') shootCounter(game,id,a,875,power,color,{element:'fire',r:20,life:1.2});
    if (id==='linh') {
      const targets=game.world.enemies.filter(e=>e.alive&&distance(e,p)<870)
        .sort((x,y)=>distance(x,p)-distance(y,p)).slice(0,3);
      for (let i=0;i<3;i++) {
        const target=targets[i];
        shootCounter(game,id,a+(i-1)*.31,930,power,color,{homingId:target?.id,r:8,pierce:0,life:1.25});
      }
    }
    if (id==='quanle') {
      const end=safeEnd(game,p,a,740);
      let spawnAt=end;
      for (const e of game.world.enemies) if (e.alive&&segment(e,p,end)<82+e.r) {
        counterHit(game,e,power,'shadow',game.postureStrike);
        if (distance(e,p)<distance(spawnAt,p)) spawnAt=e;
      }
      for (const offset of [-.39,.39]) game.effect('mythic-slash',spawnAt.x,spawnAt.y,color,150,.52,{angle:a+offset});
      const shadow=root.DTShadow;
      shadow.spawn(game,shadow.catalog[Math.floor(game.rng()*shadow.catalog.length)].id,spawnAt,15);
    }
    if (id==='hoavi') {
      const end=safeEnd(game,p,a,1090);
      for (const e of game.world.enemies) if (e.alive&&segment(e,p,end)<36+e.r) {
        counterHit(game,e,power,'code',game.postureStrike);
        e.codeFault=Math.max(e.codeFault||0,2);
      }
      for (const b of game.projectiles) if (!b.friendly&&segment(b,p,end)<44+b.r) b.life=0;
      p.code=Math.min(8,(p.code||0)+3);
      game.effect('counter-beam',p.x,p.y,color,43,.48,{tx:end.x,ty:end.y});
    }
    if (id==='thienvu') shootCounter(game,id,a,820,power,color,{element:game.element.id,r:18,pierce:2});
    if (id==='quynhkun') shootCounter(game,id,a,770,power,color,{r:19,returning:true,life:1.7});
    if (id==='ait01') shootCounter(game,id,a,1820,power,color,{r:11,pierce:0,life:.54});
    return true;
  }

  function onCounterHit(game,b,e) {
    if (!b.counter) return;
    const p=game.player;
    if (b.counter==='an') {
      e.burn=Math.max(e.burn||0,2.6);
      game.effect('counter-column',e.x,e.y,'#ffad67',66,.52);
      for (const other of game.world.enemies) if (other!==e&&other.alive&&distance(other,e)<74) {
        counterHit(game,other,b.damage*.32,'fire',b.strike);
      }
    }
    if (b.counter==='linh') e.trucMark=Math.max(e.trucMark||0,6+(game.skillRanks.passive||0));
    if (b.counter==='thienvu') {
      game.applyElementStatus(e,b.element,b.damage,true);
      withStrike(game,12,()=>{
        for (const other of game.world.enemies) if (other!==e&&other.alive&&distance(other,e)<126) {
          game.mythicHit(other,b.damage*.43,b.element,false);
          game.applyElementStatus(other,b.element,b.damage,true);
        }
      });
      game.effect('element-impact',e.x,e.y,b.color,126,.52,{element:b.element});
      game.reactEnvironment?.(b.element,e.x,e.y,126);
    }
    if (b.counter==='quynhkun') {
      root.DTQuynhKun.marks(game,e,2);
      game.loot.push({x:e.x,y:e.y,type:'gold',value:5,life:120});
    }
    if (b.counter==='ait01') barrage(game,b);
  }

  function barrage(game,b) {
    if (b.barrage) return;
    b.barrage=true;
    const list=game.counterBursts||(game.counterBursts=[]);
    for (let i=0;i<3;i++) {
      const at=point(b,b.angle,63*i);
      list.push({...at,delay:.14*i,power:b.damage*.34,angle:b.angle,strike:b.strike});
    }
  }

  function beforeProjectile(game,b,dt) {
    if (b.homingId) {
      const target=game.world.enemies.find(e=>e.alive&&e.id===b.homingId);
      if (target) {
        const a=angleTo(b,target),speed=Math.hypot(b.vx,b.vy);
        const turn=Math.atan2(Math.sin(a-b.angle),Math.cos(a-b.angle));
        b.angle+=Math.max(-12*dt,Math.min(12*dt,turn));
        b.vx=Math.cos(b.angle)*speed; b.vy=Math.sin(b.angle)*speed;
      }
    }
    if (b.counter==='quynhkun'&&b.age>.35&&distance(b,game.player)<34+Math.hypot(b.vx,b.vy)*dt&&b.life>0) {
      b.life=0;
      root.DTQuynhKun.boon(game);
    }
    if (b.evolved==='an') {
      b.emberCd=(b.emberCd||0)-dt;
      if (b.emberCd<=0) {
        b.emberCd=.17;
        const fields=game.mythicFields.filter(f=>f.kind==='signature-ember');
        if (fields.length>=12) fields[0].life=0;
        game.addField('signature-ember',b.x,b.y,{life:1.5,r:32,tick:.12,power:b.damage*.16,element:'fire'});
      }
    }
  }

  function updateBursts(game,dt) {
    const list=game.counterBursts;
    if (!list?.length) return;
    for (let i=list.length-1;i>=0;i--) {
      const b=list[i];
      b.delay-=dt;
      if (b.delay>0) continue;
      list.splice(i,1);
      game.effect('counter-column',b.x,b.y,'#a6c9ff',91,.48);
      for (const e of game.world.enemies) if (e.alive&&distance(e,b)<91+e.r) {
        counterHit(game,e,b.power,'code',b.strike);
        e.knockX=Math.cos(b.angle)*285; e.knockY=Math.sin(b.angle)*285;
      }
    }
  }

  function evolveBullet(game,opts) {
    return !opts.counter&&game.postureStrike?.points===1.5&&game.damageContext==='normal'
      &&!opts.ally&&!opts.secondary&&tier(game)>=2 ? game.hero.id : '';
  }

  function onEvolvedHit(game,b,e) {
    if (!b.evolved||b.evolved!=='quanle'&&b.evolveProc) return;
    b.evolveProc=true;
    const p=game.player;
    if (b.evolved==='linh') for (const offset of [-.38,.38]) {
      game.shoot(e.x,e.y,b.angle+offset,680,b.damage*.37,'#b7ed9a',
        {kind:'arrow',life:.48,pierce:1,charge:false,secondary:true,excludeIds:[e.id]});
    }
    if (b.evolved==='hoavi') {
      const target=closest(game,e,260,e);
      if (target) game.shoot(e.x,e.y,angleTo(e,target),900,b.damage*.67,'#9cfce4',
        {kind:'code',life:.45,charge:false,secondary:true,excludeIds:[e.id]});
    }
    if (b.evolved==='thienvu'&&b.attackNumber%3===0) elementalMark(game,e,b.element,b.damage);
    if (b.evolved==='quanle') p.mp=Math.min(p.maxMp,p.mp+2);
  }

  function elementalMark(game,e,id,power) {
    e.signatureElement=id;
    e.signatureMarkedUntil=game.time+4;
    game.applyElementStatus(e,id,power,true);
    game.effect('element-impact',e.x,e.y,root.DTElements.byId(id).color,34,.28,{element:id});
  }

  function afterFire(game,usedCounter) {
    const rank=tier(game),p=game.player,id=game.hero.id,n=game.passiveState.attackCount;
    if (rank<2) return;
    if (!usedCounter&&n%3===0&&(id==='quynhkun'||id==='ait01')) {
      game.shoot(p.x,p.y,p.facing+.12,970,p.damage*.48,'#ffe496',
        {kind:id==='quynhkun'?'talisman_bolt':'code',life:.92,r:4,secondary:true,quynhMarks:id==='quynhkun'?1:0,aitLocks:id==='ait01'?1:0});
    }
    if (rank===3&&n%4===0) {
      const end=safeEnd(game,p,p.facing,276);
      const target=game.world.enemies.find(e=>e.alive&&segment(e,p,end)<24+e.r)||end;
      const color=counters[id]?.color||game.element?.color||gold;
      const element=({an:'fire',linh:'nature',quanle:'shadow',hoavi:'light',thienvu:game.element?.id,quynhkun:'lightning',ait01:'earth'})[id]||'lightning';
      for (const e of game.world.enemies) if (e.alive&&distance(e,target)<120+e.r) game.mythicHit(e,p.damage*1.8,element,false);
      game.effect('signature-wave',target.x,target.y,color,120,.56,{counter:id,element,angle:p.facing});
      if(id==='an'||id==='ait01')game.effect('counter-column',target.x,target.y,color,120,.53);
      if(id==='linh')game.effect('leaves',target.x,target.y,color,120,.62);
      if(id==='quanle')for(const turn of [-.58,.58])game.effect('mythic-slash',target.x,target.y,color,133,.48,{angle:p.facing+turn});
      if(id==='hoavi')game.effect('circuit',target.x,target.y,color,120,.58);
      if(id==='thienvu')game.effect('element-impact',target.x,target.y,color,120,.53,{element});
      if(id==='quynhkun')game.effect('quynh-talisman_burst',target.x,target.y,color,120,.56);
    }
  }

  root.DTCombat={boss,tier,ranks,segment,closest,startsDash,checkDodge,update,enemyRate,withStrike,addPosture,
    counter,onCounterHit,barrage,beforeProjectile,updateBursts,evolveBullet,onEvolvedHit,elementalMark,afterFire};
})(globalThis);
