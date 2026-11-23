(function (root) {
  'use strict';

  const colors = {wood:'#c39a52', leaf:'#a6cb68', water:'#86dcdb', mist:'#dba0f6', forge:'#ffad6e', ember:'#ff8c4d', laser:'#ff8097'};
  const species = {
    mantis_blade:{name:'Bọ Ngựa Kiếm Trúc', hp:82, r:17, speed:112, damage:17},
    bamboo_bomber:{name:'Khỉ Ném Ống Trúc Nổ', hp:72, r:16, speed:105, damage:16},
    swamp_lurker:{name:'Thủy Yêu Đầm Sen', hp:92, r:18, speed:126, damage:16},
    mist_toad:{name:'Thiềm Thừ Sương Độc', hp:126, r:24, speed:78, damage:18},
    forge_shielder:{name:'Giáp Sĩ Lò Rèn', hp:148, r:21, speed:73, damage:22},
    ember_bat:{name:'Hỏa Bức', hp:60, r:15, speed:153, damage:22},
    shield_drone:{name:'Drone Khiên Từ Trường', hp:75, r:16, speed:124, damage:0},
    laser_turret:{name:'Tháp Pháo Quang Học Xoay', hp:108, r:21, speed:0, damage:20}
  };
  const pools = {
    forest:['mantis_blade','bamboo_bomber'],
    lotus:['swamp_lurker','mist_toad'],
    waterfall:['swamp_lurker','mist_toad'],
    ash:['forge_shielder','ember_bat'],
    ruins:['shield_drone','laser_turret']
  };
  const shields = new WeakMap(), links = new WeakMap();
  const angleTo = (a,b) => Math.atan2(b.y-a.y,b.x-a.x);
  const near = (a,b,r) => (a.x-b.x)**2+(a.y-b.y)**2 < r*r;
  const angleDiff = (a,b) => Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const direction = angle => ({x:Math.cos(angle),y:Math.sin(angle)});
  const maxHazards = 24;

  function pick(zone, index) {
    const pool = pools[zone.replace(/^endless-/, '')];
    return pool?.[Math.abs(index)%pool.length];
  }

  function stats(type, hpScale=1) {
    const def = species[type];
    if (!def) return {};
    const hp = Math.round(def.hp*hpScale);
    return {...def, hp, maxHp:hp, frontier:true, concealed:type==='mantis_blade', submerged:type==='swamp_lurker'};
  }

  function move(game,e,angle,speed,dt) {
    if (e.rootHeld || e.rooted>0) return;
    const v=direction(angle);
    e.biomeMoving=speed!==0;
    if (Math.abs(v.x)>.18 && speed) e.flipX=v.x*speed<0;
    game.moveEntity(e,v.x*speed*dt,v.y*speed*dt);
  }

  function warn(game,e,kind,at,r,delay,color,extra={}) {
    const tell={kind,x:at.x,y:at.y,r,timer:delay,maxTimer:delay,color,damage:e.damage,sourceId:e.id,...extra};
    game.telegraphs.push(tell);
    e.biomeAttack=Math.max(delay+.20,e.biomeAttack||0);
    game.emit('sound',{name:'charge'});
    return tell;
  }

  function hit(game,e,damage,rootTime=0) {
    const previous=game.incomingAttacker;
    game.incomingAttacker=e;
    try {
      const player=game.player;
      if (!game.dead && !player.ultIntro && player.invulnerable<=0 && rootTime) {
        player.rooted=Math.max(player.rooted||0,rootTime*(!game.recoveryDepth?(player.tenacity||1):1));
      }
      game.damagePlayer(damage);
    } finally {
      game.incomingAttacker=previous;
    }
  }

  function hazard(game,kind,x,y,r,life,extra={}) {
    const list=game.biomeHazards||(game.biomeHazards=[]);
    if (list.length>=maxHazards) list.shift();
    list.push({kind,x,y,r,life,total:life,tick:0,...extra});
  }

  function updateSupport(game,e,dt) {
    e.linkCd=(e.linkCd||0)-dt;
    if (e.linkCd<=0 || links.has(e)&&!shieldedBy(links.get(e),e)) {
      e.linkCd=.23;
      let best=null;
      for (const other of game.world.enemies) {
        if (!other.alive||other===e||other.type==='shield_drone'||other.root||other.sagaAnchor||other.friendly
            || !near(e,other,240)||shieldedBy(other)&&shields.get(other)!==e) continue;
        if (!best || other.maxHp>best.maxHp) best=other;
      }
      const old=links.get(e);
      if (old&&shields.get(old)===e) shields.delete(old);
      if (best) links.set(e,best); else links.delete(e);
      if (best) shields.set(best,e);
    }
    const target=links.get(e);
    if (!target) return;
    const heading=direction(angleTo(game.player,target));
    const spot={x:target.x+heading.x*66,y:target.y+heading.y*66};
    if (!near(e,spot,17)) move(game,e,angleTo(e,spot),e.speed,dt);
    e.biomeAttack=.22;
  }

  function shieldedBy(target,drone) {
    if (!target) return false;
    const source=shields.get(target);
    return !!(source?.alive&&target.alive&&near(source,target,240)&&(!drone||source===drone));
  }

  function update(game,e,dt,d,a) {
    if (!species[e.type]) return false;
    const p=game.player;
    e.biomeMoving=false;
    e.biomeLift=Math.max(0,(e.biomeLift||0)-155*dt);
    e.biomeAttack=Math.max(0,(e.biomeAttack||0)-dt);
    if (e.type==='shield_drone') {
      updateSupport(game,e,dt);
      return true;
    }
    if (e.type==='laser_turret') {
      if (e.cool<=0 && d<545) {
        const start=a-Math.PI*75/360;
        warn(game,e,'biome-laser',e,10,.75,colors.laser,{angle:start,x2:e.x+Math.cos(start)*480,y2:e.y+Math.sin(start)*480});
        e.cool=3.5;
      }
      return true;
    }
    if (e.biomeCharge>0) {
      e.biomeCharge-=dt;
      move(game,e,e.chargeA,e.type==='ember_bat'?570:820,dt);
      if (e.type==='mantis_blade' && !e.biomeHit && near(e,p,50)) {
        e.biomeHit=true;
        hit(game,e,e.damage);
      }
      if (e.type==='ember_bat' && (e.biomeCharge<=0 || near(e,p,32))) {
        if (near(e,p,92+p.r)) hit(game,e,e.damage);
        game.effect('shock',e.x,e.y,colors.ember,92,.50);
        game.spark(e.x,e.y,22,colors.ember,145,.55);
        e.alive=false;
        game.pushDyingEnemy(e);
      }
      return true;
    }
    const walking=e.speed*(e.slow>0?.48:1);
    if (e.type==='mantis_blade') {
      if (d>=360 && !e.biomeAttack) e.concealed=true;
      if (e.cool<=0 && d<250) {
        e.concealed=false;
        warn(game,e,'biome-cross',p,62,.45,colors.ember,{fromX:e.x,fromY:e.y,crossAngle:a});
        e.cool=2.8;
      } else if (d>38 && d<280 && !e.concealed && !e.biomeAttack) move(game,e,a,walking,dt);
    } else if (e.type==='bamboo_bomber') {
      if (d<280) {
        move(game,e,a,-walking*(d<190?1.55:1),dt);
        if(d<190&&e.cool<=0)e.biomeLift=26;
      }
      else if (d>360 && d<565) move(game,e,a,walking,dt);
      if (e.cool<=0 && d<530) {
        const x=p.x+(game.input.dx||0)*p.speed*.42, y=p.y+(game.input.dy||0)*p.speed*.42;
        const target=game.elementSafeSpot?.(x,y)||p;
        const v=direction(angleTo(e,target));
        const landing={x:target.x+v.x*24,y:target.y+v.y*24};
        const tell=warn(game,e,'biome-bomb',landing,75,.8,colors.leaf,{damage:e.damage});
        hazard(game,'bomb',landing.x,landing.y,75,.8,{startX:e.x,startY:e.y,landX:target.x,landY:target.y,sourceId:e.id,tell});
        e.cool=2.9;
      }
    } else if (e.type==='swamp_lurker') {
      if (d>200&&!e.biomeAttack) e.submerged=true;
      if (d<170 && e.submerged) {
        e.submerged=false;
        e.biomeLift=38;
        warn(game,e,'biome-net',p,58,.26,colors.water);
        e.cool=.95;
      } else if (!e.submerged && d<44 && e.cool<=0) {
        warn(game,e,'biome-stomp',e,46,.22,colors.water);
        e.cool=1.3;
      } else if (d>36 && d<510 && !e.biomeAttack) move(game,e,a,walking*(e.submerged?1.30:1),dt);
    } else if (e.type==='mist_toad') {
      if (e.cool<=0 && d<400) {
        e.biomeMist=!e.biomeMist;
        const reach=Math.min(d,e.biomeMist?182:70);
        const proposed={x:e.x+Math.cos(a)*reach,y:e.y+Math.sin(a)*reach};
        const target=e.biomeMist||!game.world.collision(proposed.x,proposed.y,e.r)?proposed:e;
        warn(game,e,e.biomeMist?'biome-mist':'biome-stomp',target,e.biomeMist?115:100,.48,colors.mist);
        e.cool=3.2;
      } else if (d>115 && d<520 && !e.biomeAttack) move(game,e,a,walking,dt);
    } else if (e.type==='forge_shielder') {
      e.shieldAngle=Number.isFinite(e.shieldAngle)?e.shieldAngle:a;
      e.shieldAngle+=Math.max(-1.32*dt,Math.min(1.32*dt,angleDiff(a,e.shieldAngle)));
      if (d<69 && e.cool<=0) {
        warn(game,e,'biome-stomp',e,72,.42,colors.forge);
        e.cool=2.3;
      } else if (d>54 && d<500 && !e.biomeAttack) move(game,e,a,walking,dt);
    } else if (e.type==='ember_bat') {
      if (!e.biomeAttack && (d<110 || (e.hp<e.maxHp*.45&&d<705))) {
        warn(game,e,'biome-bat',p,78,.55,colors.ember,{fromX:e.x,fromY:e.y});
      } else if (!e.biomeAttack && d<625) move(game,e,a+Math.sin(game.time*8+e.homeX)*.73,walking,dt);
    }
    if (d>620 && !e.biomeAttack && !near(e,{x:e.homeX,y:e.homeY},24)) {
      move(game,e,Math.atan2(e.homeY-e.y,e.homeX-e.x),walking*.65,dt);
    }
    return true;
  }

  function release(game,tell) {
    const e=game.world.enemies.find(e=>e.id===tell.sourceId&&e.alive);
    if (!e && tell.kind!=='biome-bomb') return;
    const p=game.player;
    switch (tell.kind) {
      case 'biome-cross':
        e.chargeA=angleTo(e,tell);
        e.biomeCharge=Math.min(.39,Math.hypot(e.x-tell.x,e.y-tell.y)/820+.075);
        e.biomeHit=false;
        game.effect('mythic-slash',tell.x,tell.y,'#ffd8a2',82,.33,{angle:e.chargeA+.72});
        game.effect('mythic-slash',tell.x,tell.y,'#f99872',82,.33,{angle:e.chargeA-.72});
        break;
      case 'biome-bat':
        e.chargeA=angleTo(e,tell);
        e.biomeCharge=.33;
        break;
      case 'biome-laser':
        hazard(game,'laser',e.x,e.y,10,.64,{angle:tell.angle,sourceId:e.id,damage:e.damage});
        break;
      case 'biome-mist':
        hazard(game,'mist',tell.x,tell.y,115,4.5,{sourceId:e.id,damage:4});
        break;
      case 'biome-bomb':
        hazard(game,'spikes',tell.x,tell.y,75,3.2,{damage:0});
        game.effect('shock',tell.x,tell.y,colors.forge,75,.53);
        game.spark(tell.x,tell.y,20,colors.leaf,135,.44);
        if (near(tell,p,75+p.r)) hit(game,e,tell.damage);
        break;
      default:
        if(e.type==='mist_toad'&&tell.kind==='biome-stomp'){
          e.biomeLift=38;
          game.moveEntity(e,tell.x-e.x,tell.y-e.y);
        }
        game.effect(tell.kind==='biome-net'?'roots':'shock',tell.x,tell.y,tell.color,tell.r,.44);
        if (near(tell,p,tell.r+p.r)) hit(game,e,tell.damage,tell.kind==='biome-net'?1.3:0);
    }
  }

  function laserEnd(game,h,angle) {
    const v=direction(angle);
    let length=480;
    for (let d=24;d<480;d+=16) if (game.world.collision(h.x+v.x*d,h.y+v.y*d,1)) { length=d; break; }
    return {x:h.x+v.x*length,y:h.y+v.y*length};
  }

  function updateHazards(game,dt) {
    const p=game.player;
    for (const h of game.biomeHazards||[]) {
      h.life-=dt*(h.kind==='bomb' ? (root.DTCombat?.enemyRate(game,h)||1) : 1);
      if (h.life<=0) continue;
      if (h.kind==='laser') {
        const e=game.world.enemies.find(e=>e.id===h.sourceId&&e.alive);
        if (!e) { h.life=0; continue; }
        h.end=laserEnd(game,h,h.angle+(1-h.life/h.total)*Math.PI*75/180);
        if (root.DTCombat?.segment(p,h,h.end)<p.r+h.r) hit(game,e,h.damage);
      } else if (h.kind!=='bomb' && near(p,h,h.r+p.r) && root.DTWorld.zoneAt(p.x,p.y).id!=='village') {
        p.biomeSlow=Math.max(p.biomeSlow||0,.18);
        if (h.kind==='mist') {
          h.tick-=dt;
          if (h.tick<=0) { h.tick=.65; hit(game,undefined,h.damage); }
        }
      }
    }
    if (game.biomeHazards) game.biomeHazards=game.biomeHazards.filter(h=>h.life>0);
  }

  function block(game,e,bullet) {
    if (e.type!=='forge_shielder'||!bullet.friendly||bullet.damageClass!=='normal'||bullet.counter
        || bullet.ground || e.stunned>0 || e.frozen>0) return false;
    const angle=Number.isFinite(e.shieldAngle)?e.shieldAngle:angleTo(e,game.player);
    const incoming=Math.atan2(-bullet.vy,-bullet.vx);
    if (Math.abs(angleDiff(incoming,angle))>Math.PI*55/180) return false;
    game.spark(bullet.x,bullet.y,8,colors.forge,120,.28);
    game.effect('shield-ricochet',bullet.x,bullet.y,colors.forge,26,.22,{angle:incoming});
    game.floaters.push({x:e.x,y:e.y-52,text:'KENG!',color:'#ffc982',life:.36,vy:-26});
    game.emit('sound',{name:'steel'});
    bullet.life=0;
    return true;
  }

  root.DTBiome = {species,pick,stats,update,release,updateHazards,block,shieldedBy,linkTarget:e=>links.get(e)};
})(globalThis);
