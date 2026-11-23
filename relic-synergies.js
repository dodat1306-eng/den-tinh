(function (root) {
  'use strict';

  const sets=[
    {id:'water',name:'Sơn Thủy Giao Tranh',relics:['sontinh','thuytinh'],text:'Mỗi 1,5 giây, xoáy nước dựng ba cột đá và giật sét địch đang Ẩm Ướt.'},
    {id:'arrows',name:'Thần Nỏ Cổ Loa',relics:['kimquy','split'],text:'Đòn thường thứ tư hoặc khi Khiên Kim Quy bật sẽ phóng chín tên xuyên.'},
    {id:'fire',name:'Thánh Hỏa Phù Đổng',relics:['giong','phoenix'],text:'Hàng tre bốc lửa 4 giây, chắn đạn và thiêu đốt địch.'},
    {id:'wish',name:'Đêm Nghìn Lẻ Một Ánh Sao',relics:['aladdin','cinderella'],text:'Lướt né đạn gọi Thần Đèn giáng tia sáng 220% vào địch gần nhất.'},
    {id:'charm',name:'Khúc Nhạc Tiên Dung',relics:['chudong','thachsan'],text:'Đàn Thạch Sanh mê hoặc quái 2,5 giây. Lâu Đài Ảo Ảnh tồn tại gấp đôi.'},
    {id:'moon',name:'Cung Trăng Bất Tử',relics:['cuoi','ankh'],text:'Lá Đa Chú Cuội hồi sau 90 giây. Cầu Ankh tạo bốn lưỡi trăng bạc.'},
    {id:'thread',name:'Mê Cung Tốc Ảnh',relics:['hermes','ariadne'],text:'Sợi chỉ tụ địch và kích nổ 260% sát thương chuẩn.'},
    {id:'arc',name:'Lôi Đình Vạn Quân',relics:['mjolnir','dashshock','chain'],text:'Sét ba cổ vật nảy thêm hai lần và để lại hồ quang 3 giây.'},
    {id:'blood',name:'Huyết Liên Nghĩa Tình',relics:['vampire','traucau'],text:'Hồi máu dư thành Khiên Huyết Sen, tối đa 50% máu tối đa.'},
    {id:'monkeys',name:'Đại Náo Thiên Cung',relics:['wukong','jack'],text:'Khi dây đậu trói địch, hai Hầu Ảnh nhảy vào tâm đám quái và xoay thiết bảng.'}
  ];
  const byId=new Map(sets.map(set=>[set.id,set]));
  const has=(game,id)=>byId.get(id).relics.every(relic=>game.player.relics[relic]);
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
  const near=(game,pos,r)=>game.world.enemies.filter(e=>e.alive&&dist(e,pos)<r+e.r);

  function onGrant(game,id) {
    for (const set of sets) if (set.relics.includes(id)&&has(game,set.id)) {
      game.emit('toast',{text:'✦ CỘNG HƯỞNG · '+set.name,reward:true});
    }
  }

  function hit(game,e,amount,kind='skill') {
    const prior=game.hitContext,strike=game.postureStrike;
    game.hitContext=null; game.postureStrike=null;
    try { return game.withDamage(kind,()=>game.damageEnemy(e,amount,false)); }
    finally { game.hitContext=prior; game.postureStrike=strike; }
  }

  function arrows(game,a=game.player.facing) {
    if (!has(game,'arrows')) return false;
    const p=game.player;
    for (let i=-4;i<=4;i++) game.shoot(p.x,p.y,a+i*.136,1020,p.damage*1.9,'#ffe5a4',
      {kind:'arrow',life:1.34,pierce:28,secondary:true,charge:false,synergy:true,r:6});
    game.effect('ring',p.x,p.y,'#f4cf81',70,.44);
    return true;
  }

  function afterAttack(game) {
    if (game.passiveState.attackCount%4===0) arrows(game);
  }

  function fireWall(game,from,to) {
    if (!has(game,'fire')) return;
    game.addField('synergy-fire',from.x,from.y,{life:4,r:21,tx:to.x,ty:to.y,tick:0,power:game.player.damage*.40});
  }

  function blockShot(game,b) {
    if (b.friendly) return false;
    for (const f of game.mythicFields||[]) if (f.kind==='synergy-fire'&&f.life>0
      &&root.DTCombat.segment(b,f,{x:f.tx,y:f.ty})<16+b.r) {
      b.life=0;
      game.spark(b.x,b.y,4,'#ffb55e',84,.22);
      return true;
    }
    return false;
  }

  function wish(game) {
    if (game.dashWish||!has(game,'wish')) return;
    game.dashWish=true;
    const p=game.player,target=root.DTCombat.closest(game,p,780);
    if (!target) return;
    hit(game,target,p.damage*2.2);
    game.effect('synergy-wish',p.x,p.y,'#f8ccfa',24,.46,{tx:target.x,ty:target.y});
  }

  function arc(game,at) {
    if (!has(game,'arc')) return;
    const fields=game.mythicFields.filter(f=>f.kind==='synergy-arc');
    if (fields.length>=5) fields[0].life=0;
    game.addField('synergy-arc',at.x,at.y,{life:3,r:100,power:game.player.damage*.46,tick:.22});
  }

  function lightningBonus(game) { return has(game,'arc')?2:0; }

  function dashChain(game,pos) {
    if (!has(game,'arc')) return;
    let from=pos;
    for (const e of near(game,pos,270).sort((a,b)=>dist(a,pos)-dist(b,pos)).slice(0,2)) {
      hit(game,e,game.player.damage*.85);
      game.effect('lightning',from.x,from.y,'#cbb6ff',0,.35,{tx:e.x,ty:e.y});
      from=e;
    }
    arc(game,pos);
  }

  function onAnkh(game) {
    if (!has(game,'moon')) return;
    const p=game.player, existing=game.mythicFields.find(f=>f.kind==='synergy-moons'&&f.life>0);
    if (existing) { existing.life=1.8; existing.hitIds.clear(); return; }
    game.addField('synergy-moons',p.x,p.y,{life:1.8,r:83,power:p.damage*.88,hitIds:new Map(),tick:0});
  }

  function heal(game,raw) {
    if (!has(game,'blood')||!(raw>0)) return false;
    const p=game.player,amount=raw*(p.recoveryMultiplier||1),gain=Math.min(amount,Math.max(0,p.maxHp-p.hp));
    p.hp+=gain;
    if (game.recoveryDepth) game.recoveryHealthBonus=(game.recoveryHealthBonus||0)+gain;
    const previous=Math.min(p.lotusShield||0,p.shield||0,p.maxHp*.5);
    const excess=Math.min(amount-gain,p.maxHp*.5-previous);
    p.lotusShield=previous+excess;
    p.shield=(p.shield||0)+excess;
    if (game.recoveryDepth) game.recoveryShieldBonus=(game.recoveryShieldBonus||0)+excess;
    return true;
  }

  function monkeys(game,center) {
    if (!has(game,'monkeys')) return;
    const p=game.player;
    for (let i=0;i<2;i++) {
      const x=center.x+(i?29:-29),y=center.y+22;
      if (game.relicClones.length>=6) game.relicClones.shift();
      game.relicClones.push({id:'vine-monkey-'+i+'-'+game.time,x,y,life:4*p.summonDuration,
        hp:65*p.summonHaste,maxHp:65*p.summonHaste,r:12,attackCd:.1,spin:true});
    }
    game.effect('mythic-rune',center.x,center.y,'#f3db91',110,.52);
  }

  function tickCharms(game,dt) {
    if (!has(game,'charm')) return;
    for (const e of game.world.enemies) {
      if (!e.alive||!(e.charmed>0)||!e.synergyCharmed) continue;
      e.charmStrike=(e.charmStrike||0)-dt;
      if (e.charmStrike>0) continue;
      const target=near(game,e,260).find(t=>t!==e&&!(t.synergyCharmed&&t.charmed>0));
      if (!target) continue;
      e.charmStrike=.54;
      hit(game,target,e.damage*2,'summon');
      game.effect('mythic-tether',e.x,e.y,'#ffa9d2',dist(e,target),.24,{tx:target.x,ty:target.y});
    }
  }

  function tickWater(game,f,dt) {
    if (!has(game,'water')) return;
    f.resonanceTick=(f.resonanceTick??1.5)-dt;
    if (f.resonanceTick>1e-6||(f.life<=0&&f.life<-dt-1e-6)) return;
    f.resonanceTick+=1.5;
    const target=root.DTCombat.closest(game,f,f.r)||f;
    game.stonePillars(target);
    for (const e of game.world.enemies) if (e.alive&&e.wet>0&&dist(e,f)<Math.max(440,f.r)) {
      hit(game,e,game.player.damage*1.45);
      game.effect('lightning',target.x,target.y,'#a9edf8',0,.38,{tx:e.x,ty:e.y-20});
    }
  }

  function tickThread(game,f) {
    if (!has(game,'thread')) return false;
    const to={x:f.tx,y:f.ty};
    f.pulled||=new Set();
    const targets=game.world.enemies.filter(e=>e.alive&&!f.pulled.has(e.id)&&root.DTCombat.segment(e,f,to)<26+e.r);
    if (!targets.length) return true;
    const at={x:(f.x+to.x)*.5,y:(f.y+to.y)*.5};
    for (const e of targets) {
      f.pulled.add(e.id);
      if (!root.DTCombat.boss(e)) game.moveEntity(e,(at.x-e.x)*.83,(at.y-e.y)*.83);
      hit(game,e,game.player.damage*2.6,'true');
    }
    game.effect('lightning',f.x,f.y,'#c2cdff',0,.4,to.x===undefined?{}:{tx:to.x,ty:to.y});
    game.effect('shock',at.x,at.y,'#c2cdff',110,.56);
    return true;
  }

  function field(game,f,dt) {
    if (f.kind==='water') { tickWater(game,f,dt); return false; }
    if (!f.kind.startsWith('synergy-')) return false;
    if (f.life<=0) return true;
    if (f.kind==='synergy-moons') {
      f.x=game.player.x; f.y=game.player.y;
      if (f.tick>0) return true;
      f.tick=.06;
      for (const e of near(game,f,f.r+29)) for (let i=0;i<4;i++) {
        const a=f.age*6+i*Math.PI/2;
        if (dist(e,{x:f.x+Math.cos(a)*f.r,y:f.y+Math.sin(a)*f.r})>=e.r+17) continue;
        const key=e.id+':'+i;
        if (f.hitIds.has(key)) continue;
        f.hitIds.set(key,true);
        hit(game,e,f.power);
      }
    } else if (f.tick<=0) {
      f.tick=.42;
      if (f.kind==='synergy-fire') {
        const to={x:f.tx,y:f.ty};
        for (const e of game.world.enemies) if (e.alive&&root.DTCombat.segment(e,f,to)<29+e.r) {
          e.burn=Math.max(e.burn||0,2.3);
          hit(game,e,f.power);
        }
      } else if (f.kind==='synergy-arc') {
        for (const e of near(game,f,f.r)) {
          hit(game,e,f.power);
          game.effect('lightning',f.x,f.y,'#c1bbff',0,.28,{tx:e.x,ty:e.y});
        }
      }
    }
    return true;
  }

  root.DTSynergy={sets,has,onGrant,arrows,afterAttack,fireWall,blockShot,wish,arc,lightningBonus,dashChain,onAnkh,heal,
    monkeys,tickCharms,tickThread,field};
})(globalThis);
