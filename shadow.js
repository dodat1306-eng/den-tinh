(function(root){
  'use strict';
  const Base=root.DTGame,TAU=Math.PI*2,trees=new Set(['tree','bamboo','willow','banyan','pine','deadTree']);
  const clamp=(n,a,b)=>Number.isFinite(n)?Math.max(a,Math.min(b,n)):a,distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const catalog=[
    ['wolf','Sói Bóng Tối',270,110,19,'bite'],['bear','Gấu Bóng Tối',125,330,32,'claw'],
    ['eagle','Đại Bàng Bóng Tối',245,130,22,'feather'],['tiger','Mãnh Hổ Bóng Tối',230,180,25,'pounce'],
    ['panther','Báo Đen Ám Ảnh',285,125,20,'blink'],['lion','Sư Tử Bờm Lửa Đen',200,220,27,'roar'],
    ['gorilla','Khỉ Đột Sơn Quân',155,300,32,'quake'],['rhino','Tê Giác Thiết Giáp',195,320,32,'charge'],
    ['elephant','Voi Ma Mút Bóng Tối',105,420,40,'stomp'],['stag','Hươu Sừng Kiếm',245,155,23,'antlers'],
    ['boar','Heo Rừng Nanh Hắc Ám',240,210,25,'rush'],['cobra','Mãng Xà Vương',195,140,20,'venom'],
    ['scorpion','Bọ Cạp Khổng Lồ',170,240,29,'sting'],['spider','Nhện Chúa',215,170,28,'web'],
    ['croc','Cá Sấu Đầm Lầy',150,270,29,'tail'],['shark','Cá Mập Bóng Đêm',245,220,28,'burrow'],
    ['bat','Dơi Huyết Ma',260,115,20,'siphon'],['falcon','Ưng Sấm Bóng Đêm',320,120,19,'dive'],
    ['mantis','Bọ Ngựa Lưỡi Liềm',250,165,23,'scythes'],['crab','Cua Thiết Giáp',120,350,31,'pincers'],
    ['treant','Mộc Ảnh Cự Thú',135,300,31,'roots'],['dragon','Hắc Long Bóng Tối',180,350,35,'darkfire'],
  ].map(([id,name,speed,hp,r,behavior])=>({id:'shadow_'+id,name,speed,hp,r,behavior,flying:['eagle','bat','falcon','dragon'].includes(id)}));
  const byId=new Map(catalog.map(s=>[s.id,s])),variants=new Set(['shadow_treant','shadow_vine_hydra','shadow_thorn_stalker']);
  function formation(g,i){const a=i/14*TAU;return{x:g.player.x+Math.cos(a)*250,y:g.player.y+Math.sin(a)*180}}
  const fx=(g,clip,x,y,r=60,life=.5,extra={})=>g.effect('shadow-'+clip,x,y,'#b86bff',r,life,extra);
  function remain(g,source,sourceType='enemy'){
    if(!source||source.shadowRecorded||![source.x,source.y].every(Number.isFinite)||sourceType==='tree'&&!trees.has(source.type))return;
    source.shadowRecorded=true;g.shadowRemains||=[];
    const item={x:source.x,y:source.y,sourceType,enemyType:source.type||'slime',life:20,variant:sourceType==='tree'?['shadow_treant','shadow_vine_hydra','shadow_thorn_stalker'][Math.floor((g.rng?.()??0)*3)]:null};
    g.shadowRemains.push(item);if(g.shadowRemains.length>384)g.shadowRemains.shift();return item;
  }
  function kindFor(g,r){return r?.sourceType==='tree'?'shadow_treant':(new Map([['slime','shadow_spider'],['wisp','shadow_bat'],['boar','shadow_boar'],['archer','shadow_stag'],['shade','shadow_panther']]).get(r?.enemyType)||catalog[Math.floor(g.rng()*catalog.length)].id)}
  function nearbyRemains(g,r){
    for(const p of g.world.props||[])if(p.damageStage>=2&&trees.has(p.type)&&distance(p,g.player)<=r)remain(g,p,'tree');
    return g.shadowRemains.filter(c=>c.life>0&&distance(c,g.player)<=r).sort((a,b)=>distance(a,g.player)-distance(b,g.player));
  }
  function spawn(g,id,at,life=22,variant){
    const spec=byId.get(id);if(!spec||g.shadowArmy.length>=14)return null;
    const spot=spec.flying?at:g.elementSafeSpot(at.x,at.y)||g.player;
    const s={id:'shadow-'+(++g.shadowSerial),kind:id,variant:variants.has(variant)?variant:null,x:spot.x,y:spot.y,r:spec.r,hp:spec.hp,maxHp:spec.hp,power:g.player.damage*(1+.08*(g.skillRanks.e||0)),life,maxLife:life,attackCd:0,hurtCd:0,aimAngle:0,moving:false,spawnAge:0,action:null};
    g.shadowArmy.push(s);fx(g,'portal',s.x,s.y,70,.65);return s;
  }
  function primary(g,power){
    const p=g.player,a=Math.atan2(g.input.aimY-p.y,g.input.aimX-p.x);p.aimAngle=p.facing=a;p.comboIndex=((p.comboIndex??-1)+1)%3;
    p.action={key:'attack',hero:'quanle',angle:a,elapsed:0,duration:.24,release:.03,windup:.03};p.cast=.24;
    const x=p.x+Math.cos(a)*28,y=p.y-16+Math.sin(a)*18;
    for(const spread of p.comboIndex===2?[-.14,0,.14]:[0]){const angle=a+spread;g.shoot(x-Math.cos(angle)*20,y-Math.sin(angle)*20,angle,840,power*1.15,'#b86bff',{kind:'shadow-crescent',r:11,pierce:4,life:.95,signature:true,shadow:true})}
    fx(g,'crescent',x,y,70,.25,{angle:a});

  }
  function release(g,c){
    if(g.dead)return;const p=g.player,power=p.damage*(c.power||1);
    if(c.key==='q'){p.shadowArmor=6.5;p.shield=Math.min(130,p.shield+48+10*g.skillRanks.q);g.shadowTendril=0;fx(g,'armor',p.x,p.y,125,.7);return}
    const remains=nearbyRemains(g,c.key==='r'?420:260);
    if(c.key==='e'){
      const source=remains[0],id=source?kindFor(g,source):catalog[Math.floor(g.rng()*catalog.length)].id;
      if(source){source.life=0;fx(g,'soul',source.x,source.y,40,.6,{tx:p.x,ty:p.y})}
      if(g.shadowArmy.length>=6){const s=g.shadowArmy.slice().sort((a,b)=>a.life-b.life)[0];s.life=Math.max(s.life,22);s.hp=Math.min(s.maxHp,s.hp+s.maxHp*.5);s.power=Math.min(p.damage*3,s.power*1.12);fx(g,'portal',s.x,s.y,80,.6)}
      else spawn(g,id,source||{x:p.x+Math.cos(c.angle)*65,y:p.y+Math.sin(c.angle)*65},22,source?.variant);
      return;
    }
    if(c.key==='r'){
      // ponytail: 14 visible bodies; surplus souls strengthen those bodies instead of growing an unbounded army.
      const preferred=['wolf','bear','eagle','tiger','rhino','shark','dragon','spider','cobra','lion','gorilla','treant','panther','stag'].map(k=>'shadow_'+k),chosen=[];
      for(const r of remains){r.life=0;fx(g,'soul',r.x,r.y,45,.65,{tx:p.x,ty:p.y});const id=kindFor(g,r);if(!chosen.includes(id))chosen.push(id)}
      for(const id of preferred)if(!chosen.includes(id))chosen.push(id);
      g.shadowArmy=[];g.shadowFrenzy=24;const surplus=Math.min(12,Math.max(0,remains.length-14));
      chosen.slice(0,14).forEach((id,i)=>{const s=spawn(g,id,formation(g,i),24);if(s){s.power=power*(1+surplus*.025);s.hp=s.maxHp+=surplus*5}});
      p.invulnerable=Math.max(p.invulnerable,.6);fx(g,'legion',p.x,p.y,420,1.2);return;
    }
  }
  function area(g,s,x,y,r,m,status,terrain){
    let hits=0;for(const e of g.world.enemies)if(e.alive&&Math.hypot(e.x-x,e.y-y)<r+(e.r||0)){g.damageEnemy(e,s.power*m,false);hits++;if(status)Object.assign(e,status);const a=Math.atan2(e.y-y,e.x-x);e.knockX=Math.cos(a)*100;e.knockY=Math.sin(a)*100}
    if(terrain)root.DTDestruction?.react(g,terrain,x,y,r,90);return hits;
  }
  function shoot(g,s,angle,opts={}){g.shoot(s.x,s.y,angle,560,s.power*.85,'#b84dff',{owner:s.id,kind:'shadow-crescent',shadow:true,charge:false,life:1.1,pierce:1,r:9,...opts})}
  function attack(g,s,e,spec){
    const a=Math.atan2(e.y-s.y,e.x-s.x);s.aimAngle=a;s.action={key:'attack',elapsed:0,duration:.6,release:.22,released:false,targetId:e.id,angle:a};s.attackCd=(['stomp','darkfire','quake','web'].includes(spec.behavior)?2.5:1.05)/(g.shadowFrenzy>0?1.4:1);
  }
  function releaseAttack(g,s,e,spec){
    const a=s.action.angle;
    const aoe=(r,m,status,terrain)=>area(g,s,e.x,e.y,r,m,status,terrain);
    switch(spec.behavior){
      case 'bite':aoe(35,1.45,{shadowBleed:3,shadowBleedTick:0,shadowBleedPower:s.power*.22});break;
      case 'claw':aoe(95,2,{stunned:1},'physical');break;
      case 'feather':for(const d of [-.2,0,.2])shoot(g,s,a+d);aoe(45,1);break;
      case 'pounce':{const d=Math.min(180,distance(s,e));g.moveEntity(s,Math.cos(a)*d,Math.sin(a)*d);const crit=g.player.crit;try{g.player.crit=g.rng()<.5?1:crit;aoe(65,2.2)}finally{g.player.crit=crit}break}
      case 'blink':{const ea=Number.isFinite(e.facing)?e.facing:a+Math.PI,spot=g.elementSafeSpot(e.x-Math.cos(ea)*55,e.y-Math.sin(ea)*55);if(spot){s.x=spot.x;s.y=spot.y}aoe(60,2.4);break}
      case 'roar':area(g,s,s.x,s.y,150,.8,{slow:2,shadowFear:1.2,shadowFearX:s.x,shadowFearY:s.y});aoe(55,1.6);fx(g,'roar',s.x,s.y,150);break;
      case 'quake':aoe(120,2.4,{stunned:1.1},'earth');break;
      case 'charge':case 'rush':case 'dive':{const reach=spec.behavior==='charge'?240:180,old={x:s.x,y:s.y};if(spec.flying){s.x+=Math.cos(a)*reach;s.y+=Math.sin(a)*reach}else g.moveEntity(s,Math.cos(a)*reach,Math.sin(a)*reach);const dx=s.x-old.x,dy=s.y-old.y,len=dx*dx+dy*dy;for(const t of g.world.enemies)if(t.alive){const u=clamp(((t.x-old.x)*dx+(t.y-old.y)*dy)/Math.max(1,len),0,1);if(Math.hypot(t.x-old.x-dx*u,t.y-old.y-dy*u)<s.r+(t.r||0)+15)g.damageEnemy(t,s.power*2.4,false)}for(let i=0;i<4;i++)root.DTDestruction?.react(g,'earth',old.x+dx*i/3,old.y+dy*i/3,55,100);break}
      case 'stomp':area(g,s,s.x,s.y,165,2.3,{stunned:1.2},'earth');break;
      case 'antlers':for(const d of [-.22,0,.22])shoot(g,s,a+d,{pierce:3});break;
      case 'venom':for(const d of [-.25,0,.25])shoot(g,s,a+d,{shadowPoison:true});aoe(75,.6,{poison:4,poisonPower:s.power*.18,shadowCorrosion:4});break;
      case 'sting':aoe(45,2.5,{rooted:1.5});break;
      case 'web':aoe(110,1,{rooted:2});fx(g,'web',e.x,e.y,110,.8);break;
      case 'tail':aoe(95,2.2,{slow:1.2});break;
      case 'burrow':{const spot=g.elementSafeSpot(e.x,e.y);if(spot){s.x=spot.x;s.y=spot.y}aoe(75,2.6,{stunned:.5});break}
      case 'siphon':{const n=aoe(85,1.4);g.player.hp=Math.min(g.player.maxHp,g.player.hp+n*3);shoot(g,s,a,{pierce:4});break}
      case 'scythes':aoe(80,2.7,{shadowBleed:2,shadowBleedTick:0,shadowBleedPower:s.power*.2});fx(g,'slash',e.x,e.y,90);break;
      case 'pincers':aoe(90,2.1,{rooted:.8});break;
      case 'roots':aoe(125,1.8,{rooted:1.8},'wind');fx(g,'roots',e.x,e.y,125,.7);break;
      case 'darkfire':aoe(150,2,{burn:3,burnTick:0},'fire');fx(g,'darkfire',e.x,e.y,150,.8,{angle:a});break;
    }
    fx(g,'impact',e.x,e.y,75,.35);
  }
  class ShadowGame extends Base{
    constructor(...args){super(...args);this.initShadow()}
    initShadow(saved){
      this.shadowRemains=[];this.shadowArmy=[];this.shadowSerial=0;this.shadowFrenzy=this.hero.id==='quanle'?clamp(saved?.frenzy,0,24):0;this.shadowTendril=0;this.shadowCounter=0;this.player.shadowArmor=this.hero.id==='quanle'?clamp(saved?.armor,0,6.5):0;
      this.player.shield=clamp(this.player.shield,0,this.hero.id==='quanle'?130:110);
      if(!saved)return;
      for(const c of (Array.isArray(saved.remains)?saved.remains:[]).slice(-384))if(c&&[c.x,c.y,c.life].every(Number.isFinite)&&Math.abs(c.x)<2e7&&Math.abs(c.y)<2e7&&['enemy','tree'].includes(c.sourceType))this.shadowRemains.push({x:c.x,y:c.y,life:clamp(c.life,0,20),sourceType:c.sourceType,enemyType:typeof c.enemyType==='string'?c.enemyType.slice(0,40):'slime',variant:variants.has(c.variant)?c.variant:null});
      if(this.hero.id==='quanle')for(const unit of (Array.isArray(saved.army)?saved.army:[]).slice(0,14))if(unit&&byId.has(unit.kind)&&[unit.x,unit.y,unit.life,unit.hp,unit.power].every(Number.isFinite)&&Math.abs(unit.x)<=2e7&&Math.abs(unit.y)<=2e7){const s=spawn(this,unit.kind,unit,clamp(unit.life,0,24),unit.variant);s.hp=clamp(unit.hp,0,s.maxHp);s.power=clamp(unit.power,1,this.player.damage*4);s.attackCd=.3}
    }
    passiveNodeText(){return this.hero.id==='quanle'?'Mỗi bậc tăng 8% sức mạnh bóng thú và 5% sát thương gai Hắc Giáp. Linh hồn tồn tại 20 giây.':super.passiveNodeText()}
    passiveStatus(){return this.hero.id==='quanle'?'Bóng thú '+this.shadowArmy.length+'/14 · Linh hồn '+this.shadowRemains.length+(this.player.shadowArmor>0?' · Hắc Giáp '+this.player.shadowArmor.toFixed(1)+'s':''):super.passiveStatus()}
    damageEnemy(e,amount,charge=true){const alive=e?.alive;if(e?.shadowCorrosion>0)amount*=1.18;const result=super.damageEnemy(e,amount,charge);if(alive&&!e.alive)remain(this,e);return result}
    onBulletHit(b,e){super.onBulletHit(b,e);if(b.shadowPoison&&e.alive){e.poison=4;e.poisonPower=Math.max(e.poisonPower||0,b.damage*.2);e.shadowCorrosion=4}}
    damagePlayer(amount){
      const p=this.player,armor=this.hero.id==='quanle'&&p.shadowArmor>0,hp=p.hp,shield=p.shield;super.damagePlayer(armor?amount*.65:amount);
      if(armor&&(p.hp<hp||p.shield<shield)&&this.shadowCounter<=0){this.shadowCounter=.45;area(this,{power:p.damage},p.x,p.y,140,1.2,{slow:1.5,stunned:.25});fx(this,'counter',p.x,p.y,140,.45)}
    }
    update(dt){
      const before=this.time,p=this.player,speed=p.speed;if(this.hero.id==='quanle'&&p.shadowArmor>0)p.speed*=1.25;
      try{super.update(dt)}finally{p.speed=speed}dt=this.time-before;if(dt<=0)return;
      this.shadowCounter=Math.max(0,this.shadowCounter-dt);this.shadowFrenzy=Math.max(0,this.shadowFrenzy-dt);
      for(const c of this.shadowRemains)c.life-=dt;this.shadowRemains=this.shadowRemains.filter(c=>c.life>0);
      if(p.shadowArmor>0){p.shadowArmor=Math.max(0,p.shadowArmor-dt);this.shadowTendril+=dt;if(this.shadowTendril>=.4){this.shadowTendril-=.4;const hits=area(this,{power:p.damage*(1+.05*this.skillRanks.passive)},p.x,p.y,125,.55);p.hp=Math.min(p.maxHp,p.hp+hits*1.5);fx(this,'tendrils',p.x,p.y,125,.3)}}
      for(const e of this.world.enemies)if(e.alive){e.shadowCorrosion=Math.max(0,(e.shadowCorrosion||0)-dt);if(e.shadowBleed>0){e.shadowBleed-=dt;e.shadowBleedTick=(e.shadowBleedTick||0)-dt;if(e.shadowBleedTick<=0){e.shadowBleedTick=.5;this.damageEnemy(e,e.shadowBleedPower||2,false)}}if(e.shadowFear>0){e.shadowFear-=dt;e.stunned=Math.max(e.stunned||0,.05);const a=Math.atan2(e.y-e.shadowFearY,e.x-e.shadowFearX);this.moveEntity(e,Math.cos(a)*100*dt,Math.sin(a)*100*dt)}}
      const assigned=new Map();for(const s of this.shadowArmy){
        s.life-=dt;s.spawnAge=Math.min(.45,(s.spawnAge||0)+dt);if(s.spawnAge<.45){s.moving=false;continue}s.attackCd-=dt;s.hurtCd-=dt;if(s.action){s.action.elapsed+=dt;if(!s.action.released&&s.action.elapsed>=s.action.release){s.action.released=true;const target=this.world.enemies.find(e=>e.id===s.action.targetId&&e.alive);if(target&&distance(target,s)<340)releaseAttack(this,s,target,byId.get(s.kind))}if(s.action.elapsed>=s.action.duration)s.action=null}if(s.life<=0||s.hp<=0)continue;
        const spec=byId.get(s.kind),target=this.allyTarget(s,assigned);s.moving=false;
        let destination=target||this.patrolAlly(s,dt,200,550,2,4);s.aiState=target?'hunt':'roam';const hazard=[...(this.telegraphs||[]),...(this.eliteHazards||[])].find(h=>(h.timer??h.time)>0&&distance(s,h)<(h.r||60)+s.r+25);
        if(hazard){const a=Math.atan2(s.y-hazard.y,s.x-hazard.x);destination={x:s.x+Math.cos(a)*130,y:s.y+Math.sin(a)*130}}

        const ranged=['antlers','venom','feather','siphon','darkfire'].includes(spec.behavior),reach=ranged?250:90,d=distance(destination,s);
        if(hazard||d>(target?reach:18)){const a=Math.atan2(destination.y-s.y,destination.x-s.x),step=Math.min(d,spec.speed*(this.shadowFrenzy>0?1.4:1)*dt);s.aimAngle=a;s.moving=true;if(spec.flying){s.x+=Math.cos(a)*step;s.y+=Math.sin(a)*step}else this.moveEntity(s,Math.cos(a)*step,Math.sin(a)*step)}
        if(target&&!hazard&&distance(s,target)<reach+target.r&&s.attackCd<=0)attack(this,s,target,spec);
        for(const b of this.projectiles)if(!b.friendly&&b.life>0&&distance(b,s)<s.r+(b.r||0)){s.hp-=b.damage*(spec.behavior==='pincers'?.5:1);b.life=0}
        if(target&&distance(s,target)<s.r+target.r+12&&s.hurtCd<=0){s.hp-=target.damage*(spec.behavior==='pincers'?.5:1);s.hurtCd=.8}
      }
      this.shadowArmy=this.shadowArmy.filter(s=>s.hp>0&&s.life>0);
    }
    respawn(){super.respawn();this.shadowArmy=[];this.player.shadowArmor=0;this.shadowFrenzy=0}
    travelTo(id){const ok=super.travelTo(id);if(ok){this.shadowArmy=[];this.shadowRemains=[];this.player.shadowArmor=0;this.shadowFrenzy=0}return ok}
    serialize(){const data=super.serialize();data.shadow={version:1,armor:this.player.shadowArmor,frenzy:this.shadowFrenzy,remains:this.shadowRemains.map(c=>({...c})),army:this.shadowArmy.map(({kind,variant,x,y,life,hp,power})=>({kind,variant,x,y,life,hp,power}))};return data}
    static restore(data){const g=Base.restore(data);Object.setPrototypeOf(g,ShadowGame.prototype);g.initShadow(data.shadow?.version===1?data.shadow:null);return g}
  }
  for(const group of [root.DTContent.passives,...['signature','kits','passives','nodeNames'].map(k=>root.DTMythic[k])])if(group.quanle)Object.defineProperty(group,'kiet',{value:group.quanle,enumerable:false});
  root.SHADOW_BEAST_CATALOG=catalog;root.DTShadow={catalog,byId,trees,remain,spawn,primary,release,attack};root.DTGame=ShadowGame;
})(globalThis);
