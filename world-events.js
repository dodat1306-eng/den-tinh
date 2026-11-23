(function (root) {
  'use strict';

  const events={
    blood_mist:{name:'Đêm Sương Đỏ Thực Nhật',color:'#f97b89',duration:40},
    traveler_rescue:{name:'Giải Cứu Lữ Khách',color:'#ffdd80',duration:34},
    memory_rift:{name:'Khe Nứt Thời Không',color:'#d7a2ff',duration:35}
  };
  const structures=[
    {id:'synergy-forge',label:'Lò Cộng Hưởng Cổ Vật',anchor:'smith',dx:108,dy:12,art:'campfire',color:'#ffb66c'},
    {id:'lotus-blessing',label:'Đài Chúc Phúc Hoa Sen',anchor:'well',dx:-103,dy:-9,art:'lotus',color:'#f4b6e9'},
    {id:'memory-monument',label:'Bia Khiêu Chiến Hồi Ức',anchor:'temple_keeper',dx:7,dy:103,art:'pillar',color:'#b8b2ff'}
  ];
  const fixturePositions=new WeakMap();
  const limit=(value,min,max)=>Number.isFinite(value)?Math.min(max,Math.max(min,value)):min;
  const point=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<2e7&&Math.abs(y)<2e7;
  const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const nextTime=game=>90+game.rng()*30;
  const inVillage=game=>root.DTWorld.zoneAt(game.player.x,game.player.y).id==='village';

  function safe(game,at,r,fallback=at) {
    if (point(at.x,at.y)&&!game.world.collision(at.x,at.y,r)) return {x:at.x,y:at.y};
    for (const radius of [44,88,145,205,272]) {
      for (let i=0;i<12;i++) {
        const a=i*Math.PI/6,x=at.x+Math.cos(a)*radius,y=at.y+Math.sin(a)*radius;
        if (point(x,y)&&!game.world.collision(x,y,r)) return {x,y};
      }
    }
    return {x:fallback.x,y:fallback.y};
  }

  function ringPoint(game,at,distance,a,r) {
    return safe(game,{x:at.x+Math.cos(a)*distance,y:at.y+Math.sin(a)*distance},r,at);
  }

  function start(game,id) {
    if (!Object.hasOwn(events,id)||game.worldEvent||id==='blood_mist'&&game.bloodChest) return false;
    const spec=events[id],p=game.player;
    const at=ringPoint(game,p,id==='traveler_rescue'?320:252,game.rng()*Math.PI*2,23);
    if (root.DTWorld.zoneAt(at.x,at.y).id==='village') return false;
    const event={id,...at,left:spec.duration,phase:id==='memory_rift'?'portal':'fight',
      count:0,spawned:0,wave:0,hp:140,maxHp:140,units:[]};
    game.worldEvent=event;
    game.emit('toast',{text:spec.name+(id==='memory_rift'?' · Đến gần cổng, nhấn F.':' · Xem dấu trên bản đồ.'),reward:true});
    game.emit('sound',{name:'challenge'});
    if (id==='traveler_rescue') {
      for (let i=0;i<5;i++) {
        const a=i*Math.PI*2/5;
        const at=ringPoint(game,event,111,a,17);
        spawn(game,event,'shade',at,i);
      }
    }
    return true;
  }

  function spawn(game,event,type,at,index,saved) {
    const p=game.player;
    const rift=event.id==='memory_rift',blood=event.id==='blood_mist';
    const hp=rift?410+Math.min(30,p.level)*20:blood?110+Math.min(35,p.level)*7:72+Math.min(25,p.level)*5;
    const e=game.spawnEnemy(type,at.x,at.y,{
      worldEventUnit:event.id,frontier:true,elite:blood?'fire':rift?'lightning':null,
      name:rift?'Ảo Ảnh Tinh Anh Cổ Đại':blood?'Tinh Anh Sương Đỏ':undefined,
      r:rift?28:17,hp,maxHp:hp,xp:rift?420:15,gold:rift?125:9,
      speed:rift?98:113,damage:rift?23:13,cool:1.1+index*.16
    });
    if (saved) {
      e.hp=limit(saved.hp,1,e.maxHp);
      e.rescueAggro=game.time+limit(saved.aggro,0,2.7);
    }
    event.units.push(e);
    return e;
  }

  function end(game,notice) {
    const event=game.worldEvent;
    if (!event) return;
    const ids=new Set(event.units.map(e=>e.id));
    game.world.enemies=game.world.enemies.filter(e=>!ids.has(e.id));
    game.projectiles=game.projectiles.filter(b=>!ids.has(b.sourceAttacker));
    game.telegraphs=game.telegraphs.filter(t=>!ids.has(t.sourceId));
    game.worldEvent=null;
    game.nextWorldEvent=nextTime(game);
    if (notice) game.emit('toast',{text:notice});
  }

  function update(game,dt) {
    if (!Number.isFinite(game.nextWorldEvent)) game.nextWorldEvent=nextTime(game);
    const p=game.player;
    p.biomeSlow=Math.max(0,(p.biomeSlow||0)-dt);
    game.travelerBuff=Math.max(0,(game.travelerBuff||0)-dt);
    if (game.villageBlessing>0) {
      game.villageBlessing=Math.max(0,game.villageBlessing-dt);
      if (!game.villageBlessing) game.recomputeStats(false);
    }
    if (game.dead) { end(game); return; }
    const mainFight=game.bossStarted&&!game.victory;
    if (mainFight) return;
    const e=game.worldEvent;
    if (!e) {
      if (inVillage(game)) return;
      game.nextWorldEvent-=dt;
      if (game.nextWorldEvent<=0) {
        const eligible=Object.keys(events).filter(id=>id!=='blood_mist'||!game.bloodChest);
        if (!start(game,eligible[Math.floor(game.rng()*eligible.length)])) game.nextWorldEvent=3;
      }
      return;
    }
    if (e.hp<=0) { end(game,'Lữ Khách đã gục ngã.'); return; }
    e.left-=dt;
    if (e.left<=1e-6) {
      end(game,e.id==='blood_mist'?'Sương Đỏ đã tan.':e.id==='memory_rift'?'Khe nứt đã khép lại.':'Toán quái đã lôi Lữ Khách vào sương.');
      return;
    }
    if (e.id==='blood_mist') {
      e.wave-=dt;
      if (e.wave<=0 && !inVillage(game) && d(e,p)<660 && e.spawned<12) {
        e.wave=6.2;
        const count=Math.min(3,12-e.spawned);
        for (let i=0;i<count;i++) {
          const a=game.rng()*Math.PI*2;
          const at=ringPoint(game,e,101+i*31,a,18);
          spawn(game,e,i===1?'boar':i===2?'archer':'shade',at,i);
          e.spawned++;
        }
      }
    }
  }

  function updateEnemy(game,e,dt) {
    const event=game.worldEvent;
    if (event?.id!=='traveler_rescue'||e.worldEventUnit!==event.id||e.rescueAggro>game.time) return false;
    if (e.rootHeld||e.rooted>0) return true;
    const reach=event.maxHp>0?40:0, distance=d(e,event);
    if (distance>reach) {
      game.moveEntity(e,(event.x-e.x)/distance*e.speed*dt,(event.y-e.y)/distance*e.speed*dt);
    } else if (e.cool<=0 && event.hp>0) {
      e.cool=1.22;
      event.hp=Math.max(0,event.hp-8);
      game.effect('mythic-slash',event.x,event.y,'#f5a47f',34,.31,{angle:Math.atan2(event.y-e.y,event.x-e.x)});
    }
    return true;
  }

  function hit(game,e) {
    if (e.worldEventUnit==='traveler_rescue') e.rescueAggro=game.time+2.7;
  }

  function killRewards(game,e) {
    const event=game.worldEvent;
    if (!event) return null;
    if (event.id==='blood_mist'&&event.left>0&&!inVillage(game)&&!(game.bossStarted&&!game.victory)) {
      if (e.worldEventUnit===event.id) {
        event.count++;
        if (event.count===8) {
          const at=safe(game,event,19);
          game.bloodChest={id:'blood-mist-chest',...at,label:'Rương Huyết Tinh · Nhấn F',color:events.blood_mist.color};
          game.emit('toast',{text:'Rương Huyết Tinh đã hiện hình. Nhấn F để nhận.',reward:true});
        }
      }
      return {xp:2.2,gold:2};
    }
    return null;
  }

  function afterKill(game,e) {
    const event=game.worldEvent,p=game.player;
    if (e.memoryRematch) {
      const owned=x=>x.memoryRematchOwner===e.id;
      game.world.enemies=game.world.enemies.filter(x=>!owned(x));
      game.telegraphs=game.telegraphs.filter(x=>x.sourceId!==e.id);
      game.sagaTelegraphs=game.sagaTelegraphs.filter(x=>x.sourceId!==e.id);
      game.projectiles=game.projectiles.filter(x=>x.sourceAttacker!==e.id);
      game.memoryRematch=null;
      game.emit('toast',{text:'Đã vượt qua hồi ức · '+e.name,reward:true});
    }
    if (!event||e.worldEventUnit!==event.id) return;
    if (event.id==='traveler_rescue'&&event.hp>0&&event.units.every(x=>!x.alive)) {
      game.addXp(300);
      p.gold+=85;
      game.travelerBuff=60;
      game.emit('dialogue',{speaker:'Lữ Khách Giữ Đèn',title:'Đèn còn sáng',text:'Cảm ơn đã giữ đường về. Nhận 300 EXP, 85 xu và Tốc Chiến trong 60 giây.'});
      end(game);
    } else if (event.id==='memory_rift'&&event.phase==='fight') {
      p.cd.r=0;
      game.syncUltimate();
      game.emit('toast',{text:'Ảo ảnh tan biến. Tuyệt kỹ đã hồi đầy.',reward:true});
      end(game);
    }
  }

  function hubObjects(game) {
    const unlocked=[Object.values(game.player.relics||{}).filter(Boolean).length>=3,
      game.world.shrines.some(s=>s.active),game.victory];
    return structures.flatMap((s,i)=>{
      if (!unlocked[i]) return [];
      const n=game.world.npcs.find(n=>n.id===s.anchor);
      if (!n) return [];
      let fixtures=fixturePositions.get(game.world);
      if(!fixtures)fixturePositions.set(game.world,fixtures=new Map());
      if(!fixtures.has(s.id)){
        const at=safe(game,{x:n.x+s.dx,y:n.y+s.dy},18,n);
        fixtures.set(s.id,{...s,...at,worldFeature:true});
      }
      return [fixtures.get(s.id)];
    });
  }

  function clearCombat(game) {
    if (game.worldEvent) end(game);
    const replay=game.memoryRematch;
    if(replay){
      game.world.enemies=game.world.enemies.filter(e=>e!==replay&&e.memoryRematchOwner!==replay.id);
      game.memoryRematch=null;
    }
    game.counterBursts=[];game.biomeHazards=[];
    game.player.perfectCounter=0;game.bulletTime=0;game.dodgeWindow=0;
  }

  function nearby(game) {
    const list=inVillage(game)?hubObjects(game):[];
    const e=game.worldEvent;
    if (e?.id==='memory_rift'&&e.phase==='portal') {
      list.push({id:'memory-rift-portal',x:e.x,y:e.y,label:'Khe Nứt Thời Không · Nhấn F',worldFeature:true});
    }
    if (game.bloodChest) list.push({...game.bloodChest,worldFeature:true});
    return list;
  }

  function bless(game) {
    if (!game.world.shrines.some(s=>s.active)) return;
    game.villageBlessing=120;
    game.recomputeStats(false);
    game.player.hp=game.player.maxHp;
    game.player.mp=game.player.maxMp;
    game.emit('toast',{text:'Chúc Phúc Làng Đèn · +15% máu tối đa, +12% chạy trong 120 giây.',reward:true});
  }

  function interact(game,o) {
    const p=game.player;
    if (o.id==='synergy-forge') {
      game.forgeBlessing=true;
      game.emit('resonanceForge');
      game.emit('toast',{text:'Hơi Ấm Lò Rèn · +10% sát thương Bảo Khí.',reward:true});
      return true;
    }
    if (o.id==='lotus-blessing') {
      bless(game);
      p.potions=Math.min(12,Math.max(p.potions,3+(game.village?.supplies||0)));
      return true;
    }
    if (o.id==='memory-monument') { game.emit('memoryMonument'); return true; }
    if (o.id==='blood-mist-chest'&&game.bloodChest) {
      game.bloodChest=null;
      p.gold+=120;
      p.potions=Math.min(12,p.potions+1);
      game.manaPotions=Math.min(6,game.manaPotions+1);
      p.statPoints+=1;
      game.bloodStatBonus=(game.bloodStatBonus||0)+1;
      game.emit('sound',{name:'pickup'});
      game.emit('toast',{text:'Rương Huyết Tinh · +120 xu, +1 bình máu, +1 bình linh lực, +1 điểm chỉ số.',reward:true});
      return true;
    }
    const e=game.worldEvent;
    if (o.id==='memory-rift-portal'&&e?.phase==='portal'&&e.id==='memory_rift') {
      e.phase='fight';e.left=25;
      spawn(game,e,'shade',e,0);
      game.emit('sound',{name:'charge'});
      return true;
    }
    return false;
  }

  function rematchOptions(game) {
    const altar=game.world.altar;
    const p=game.player;
    const core=[{id:'moc-quy',name:'Mộc Quỷ',type:'boss',x:altar.x,y:altar.y,hp:2340,open:game.victory},
      {id:'truc-ve',name:'Trúc Vệ',type:'boar',x:861,y:770,hp:540,open:!!(p.relics.giong||game.killedBosses.has('giong'))}];
    const saga=root.DTWorld.endless.chapters.map((c,index)=>({id:c.id,name:c.boss,type:'boss_'+['haba','hotinh','thantrung','cuukhucxa','thietdieu','kedetsuong'][index],
      x:c.x,y:c.y,hp:1900+index*450,open:game.saga.cleared.includes(c.id),index}));
    const mini=(game.world.bossAltars||[]).map(o=>({id:o.relic,name:o.name,type:o.enemyType,x:o.x,y:o.y,hp:840,
      open:!!(p.relics[o.relic]||game.killedBosses.has(o.relic)),site:o}));
    return [...core,...saga,...mini];
  }

  function transport(game,at) {
    game.cancelActions();
    game.projectiles=[];game.telegraphs=[];game.sagaTelegraphs=[];game.biomeHazards=[];game.counterBursts=[];
    game.world.ensureChunks?.(at.x,at.y);
    const spot=safe(game,at,game.player.r,game.player);
    Object.assign(game.player,spot,{dashTime:0,invulnerable:1.4});
  }

  function rematch(game,id,restore=null) {
    const spec=rematchOptions(game).find(c=>c.id===id);
    if (!spec?.open||!game.victory||game.memoryRematch) return false;
    const at=restore&&point(restore.x,restore.y)?restore:safe(game,spec,34);
    if (!restore) transport(game,ringPoint(game,at,285,Math.PI*.3,game.player.r));
    const boss=spec.type==='boss',saga=Number.isInteger(spec.index),hp=spec.hp;
    const e=game.spawnEnemy(spec.type,at.x,at.y,{name:spec.name,memoryRematch:spec.id,frontier:true,
      v09Boss:!boss&&!saga,miniBoss:!boss&&!saga,sagaBoss:saga,sagaIndex:spec.index,damage:boss||saga?23:18,
      r:boss?49:saga?40:26,speed:boss||saga?55:93,hp:restore?limit(restore.hp,1,hp):hp,maxHp:hp,
      posture:restore?limit(restore.posture,0,99.9):0,maxPosture:100,staggered:restore?limit(restore.staggered,0,3.5):0,
      xp:0,gold:0,pattern:0,cool:1.6});
    game.memoryRematch=e;
    if (!restore) game.triggerBossCutIn({id:e.id,type:e.type,name:spec.name,subtitle:'HỒI ỨC KHIÊU CHIẾN',sagaIndex:spec.index});
    return true;
  }

  function monumentAction(game,id,replay) {
    if (!game.victory||!inVillage(game)) return false;
    const fixture=hubObjects(game).find(o=>o.id==='memory-monument');
    if (!fixture||d(fixture,game.player)>90) return false;
    if (replay) return rematch(game,id);
    const spec=rematchOptions(game).find(x=>x.id===id&&x.site&&!x.open&&x.site.status!=='fighting');
    if (!spec) return false;
    spec.site.discovered=true;
    transport(game,ringPoint(game,spec,148,Math.PI*.5,game.player.r));
    game.emit('toast',{text:spec.name+' · Tìm đàn phong ấn đã đánh dấu.'});
    return true;
  }

  function capture(game) {
    const e=game.worldEvent,r=game.memoryRematch;
    return {
      next:game.nextWorldEvent,event:e?{...e,units:e.units.filter(u=>u.alive).map(u=>({type:u.type,x:u.x,y:u.y,hp:u.hp,
        aggro:Math.max(0,(u.rescueAggro||0)-game.time)}))}:null,
      chest:game.bloodChest,statBonus:game.bloodStatBonus,travelerBuff:game.travelerBuff,forge:game.forgeBlessing,
      blessing:game.villageBlessing,lotusShield:game.player.lotusShield,shield:game.player.lotusShield>0?game.player.shield:undefined,
      counter:game.player.perfectCounter,dodgeCd:game.perfectDodgeCd,
      posture:game.world.enemies.filter(e=>e.alive&&(e.posture>0||e.staggered>0)&&!e.memoryRematch).map(e=>({id:e.id,value:e.posture,staggered:e.staggered})),
      rematch:r?.alive?{id:r.memoryRematch,x:r.x,y:r.y,hp:r.hp,posture:r.posture,staggered:r.staggered}:null
    };
  }

  function restore(game,saved) {
    if (!saved||typeof saved!=='object') return;
    game.nextWorldEvent=Number.isFinite(saved.next)?limit(saved.next,0,120):nextTime(game);
    game.travelerBuff=limit(saved.travelerBuff,0,60);
    game.villageBlessing=limit(saved.blessing,0,120);
    game.forgeBlessing=saved.forge===true;
    game.bloodStatBonus=Math.floor(limit(saved.statBonus,0,10000));
    game.player.perfectCounter=limit(saved.counter,0,3);
    game.perfectDodgeCd=limit(saved.dodgeCd,0,1.8);
    game.player.lotusShield=limit(saved.lotusShield,0,Math.min(game.player.shield||0,game.player.maxHp*.5));
    const chest=saved.chest;
    if (chest&&point(chest.x,chest.y)) game.bloodChest={id:'blood-mist-chest',x:chest.x,y:chest.y,label:'Rương Huyết Tinh · Nhấn F',color:events.blood_mist.color};
    const e=saved.event;
    if (e&&Object.hasOwn(events,e.id)&&point(e.x,e.y)&&Number.isFinite(e.left)&&e.left>0) {
      const phase=e.id==='memory_rift'&&e.phase!=='fight'?'portal':'fight';
      game.worldEvent={id:e.id,x:e.x,y:e.y,phase,left:limit(e.left,0,phase==='fight'&&e.id==='memory_rift'?25:events[e.id].duration),
        hp:e.id==='traveler_rescue'?limit(e.hp,0,140):140,maxHp:140,count:Math.floor(limit(e.count,0,12)),spawned:Math.floor(limit(e.spawned,0,12)),wave:limit(e.wave,0,6.2),units:[]};
      const maxUnits=e.id==='blood_mist'?12:e.id==='traveler_rescue'?5:phase==='fight'?1:0;
      for (const [i,u] of (Array.isArray(e.units)?e.units:[]).slice(0,maxUnits).entries()) {
        if (!u||!['shade','boar','archer'].includes(u.type)||!point(u.x,u.y)||!Number.isFinite(u.hp)||u.hp<=0) continue;
        const unit=spawn(game,game.worldEvent,u.type,safe(game,u,17,game.worldEvent),i,u);
        unit.rescueAggro=game.time+limit(u.aggro,0,2.7);
      }
      if (phase==='fight'&&e.id!=='blood_mist'&&!game.worldEvent.units.length) game.worldEvent=null;
    }
    game.savedPosture=Array.isArray(saved.posture)?saved.posture.filter(x=>x&&typeof x.id==='string').slice(0,50):[];
    if (saved.rematch&&typeof saved.rematch.id==='string') rematch(game,saved.rematch.id,saved.rematch);
  }

  function restorePosture(game) {
    for (const e of game.world.enemies) if (root.DTCombat.boss(e)) {
      const x=game.savedPosture?.find(r=>r.id===e.id);
      if (!x) continue;
      e.maxPosture=100;e.posture=limit(x.value,0,99.9);e.staggered=limit(x.staggered,0,3.5);
    }
    game.savedPosture=null;
  }

  function hud(game) {
    const e=game.worldEvent;
    if (!e) return game.bloodChest?'Rương Huyết Tinh · Đã đánh dấu':'';
    const spec=events[e.id],detail=e.id==='blood_mist'?Math.min(e.count,8)+'/8 tinh anh':
      e.id==='traveler_rescue'?Math.ceil(e.hp/e.maxHp*100)+'% máu lữ khách · '+e.units.filter(u=>u.alive).length+' quái':
      e.phase==='portal'?'F triệu hồi Ảo Ảnh':'Hạ Ảo Ảnh';
    return spec.name+' · '+detail+' · '+Math.ceil(e.left)+'s';
  }

  root.DTWorldEvents={events,start,update,updateEnemy,hit,killRewards,afterKill,nearby,hubObjects,bless,interact,
    monumentAction,rematchOptions,capture,restore,restorePosture,hud,clearCombat};
})(globalThis);
