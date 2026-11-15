(function(root){
  'use strict';
  const Base=root.DTGame,D=root.DTWorld,C=root.DTContent,V=root.DTV09Content;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const STAT_KEYS=['str','agi','vit','int','spi','dex','fer','def','vamp','dom','aura','lck'];
  const emptyStats=()=>Object.fromEntries(STAT_KEYS.map(k=>[k,0]));
  for(const relic of V.relics){const old=C.relic(relic.id);if(old)Object.assign(old,relic);else C.relics.push(relic)}
  C.version='0.9.0';C.v09Relics=V.relics;
  const oldWorld=D.makeWorld;
  D.makeWorld=function(seed){
    const w=oldWorld(seed),existing=new Set(w.npcs.map(n=>n.id));
    for(const n of V.npc.slice(0,19))if(!existing.has(n.id))w.npcs.push({...n});
    w.relicPedestals=V.pedestal.map(r=>({id:'relic-'+r[0],relic:r[0],name:C.relic(r[0]).name,x:r[2],y:r[3],claimed:false}));
    return w;
  };
  class V09Game extends Base{
    constructor(hero,seed){super(hero,seed);this.initV09()}
    initV09(saved){
      const p=this.player;p.stats=emptyStats();p.statPoints=2;p.nextXp=Math.floor(p.level===1?220:220*Math.pow(p.level,1.68)+p.level*110);this.relicDrops=[];this.storyFlags={};this.dialogueStage=1;
      if(saved){for(const k of STAT_KEYS)p.stats[k]=Math.floor(clamp(saved.stats?.[k],0,99));p.statPoints=Math.floor(clamp(saved.statPoints,0,999));this.storyFlags={...(saved.storyFlags||{})};this.dialogueStage=Math.floor(clamp(saved.dialogueStage,1,4));for(const id of saved.pedestals||[]){const o=this.world.relicPedestals.find(x=>x.relic===id);if(o)o.claimed=true}this.relicDrops=(saved.relicDrops||[]).filter(x=>C.relic(x.relic)&&Number.isFinite(x.x)&&Number.isFinite(x.y)).slice(0,20)}
      this.pendingLevels=0;this.mastery={vigor:0,spirit:0,step:0,critical:0};this.captureRpgBase();this.recomputeStats(false);
    }
    captureRpgBase(){const p=this.player;this.rpgBase={maxHp:p.maxHp,maxMp:p.maxMp,speed:p.speed,damage:p.damage,fireRate:p.fireRate,armor:p.armor,crit:p.crit,regen:p.regen}}
    recomputeStats(heal=true){const p=this.player,s=p.stats,b=this.rpgBase||{};const oldHp=p.maxHp||b.maxHp,oldMp=p.maxMp||b.maxMp;p.maxHp=b.maxHp+s.vit*32;p.maxMp=b.maxMp+s.int*20;p.speed=b.speed+s.agi*4.5;p.damage=b.damage*(1+s.str*.035);p.fireRate=Math.max(.055,b.fireRate/(1+s.agi*.032));p.armor=Math.min(.65,b.armor+s.def*.022);p.crit=Math.min(.75,b.crit+s.dex*.025);p.regen=b.regen+s.vit*.7;p.mpRegen=13+s.spi*1.4;p.cooldownReduction=Math.min(.45,s.spi*.025);p.flatBlock=s.def*4;p.omnivamp=s.vamp*.012;p.goldFind=s.lck*.06;p.pickupRadius=70+s.aura*18;if(heal){p.hp=Math.min(p.maxHp,p.hp+Math.max(0,p.maxHp-oldHp));p.mp=Math.min(p.maxMp,p.mp+Math.max(0,p.maxMp-oldMp))}}
    allocateStat(id){if(!STAT_KEYS.includes(id)||this.player.statPoints<1)return false;this.player.stats[id]++;this.player.statPoints--;this.recomputeStats();this.emit('sound',{name:'level'});return true}
    resetStats(){const p=this.player;if(p.gold<80||!Object.values(p.stats).some(Boolean)||D.zoneAt(p.x,p.y).id!=='village')return false;const spent=Object.values(p.stats).reduce((a,b)=>a+b,0);p.gold-=80;p.stats=emptyStats();p.statPoints+=spent;this.recomputeStats(false);p.hp=Math.min(p.hp,p.maxHp);p.mp=Math.min(p.mp,p.maxMp);return true}
    get skillTree(){return super.skillTree.filter(n=>!n.id.startsWith('mastery-'))}
    learnSkill(id){return id.startsWith('mastery-')?false:super.learnSkill(id)}
    addXp(amount){
      const p=this.player;p.xp+=Math.max(0,amount);let levels=0;
      while(p.xp>=p.nextXp){p.xp-=p.nextXp;p.level++;levels++;p.nextXp=Math.floor(220*Math.pow(p.level,1.68)+p.level*110);p.statPoints+=2;p.maxHp+=10;this.rpgBase.maxHp+=10;p.hp=Math.min(p.maxHp,p.hp+45);this.skillPoints=Math.min(999,(this.skillPoints||0)+1);p.mp=p.maxMp;this.emit('level',{level:p.level});this.effect('ring',p.x,p.y,'#ffe5a0',90,.65)}
      if(levels)this.emit('toast',{text:'✦ THĂNG CẤP '+p.level+'! +'+(levels*2)+' Điểm Chỉ Số (Nhấn I để phân bổ) & +'+levels+' Điểm Kỹ Năng (Nhấn K)',reward:true});
    }
    effectiveRCd(){return super.effectiveRCd()*(1-(this.player.cooldownReduction||0))}
    critMultiplier(){return (super.critMultiplier?.()||1.7)+this.player.stats.fer*.07}
    damagePlayer(amount){return super.damagePlayer(Math.max(1,amount-(this.player.flatBlock||0)))}
    damageEnemy(e,amount,charge=true){
      const alive=e?.alive,boost=(e?.elite||e?.type==='boss'||e?.sagaBoss)?1+this.player.stats.fer*.035:1,skill=this.player.action?.key?1+this.player.stats.int*.042:1;super.damageEnemy(e,amount*boost*skill,charge);
      if(alive&&!e.alive){const heal=(this.player.stats.vamp||0)*3;if(heal)this.player.hp=Math.min(this.player.maxHp,this.player.hp+heal);this.spawnBossRelic(e)}
    }
    spawnBossRelic(e){if(!e||e.v09RelicSpawned)return;const def=V.relics.find(r=>r.source==='boss'&&(e.relic===r.id||String(e.name||'').includes(r.boss)));if(!def||this.player.relics?.[def.id])return;e.v09RelicSpawned=true;this.relicDrops.push({id:'drop-'+def.id+'-'+Math.floor(this.time*1000),relic:def.id,x:e.x,y:e.y-8,vx:(this.rng()-.5)*130,vy:-210,z:1,life:0});this.emit('toast',{text:def.name+' đã rơi xuống. Đến gần và nhấn F để nhận.',reward:true})}
    update(dt){const before=this.time;super.update(dt);if(this.time===before)return;const p=this.player;p.mp=Math.min(p.maxMp,p.mp+Math.max(0,(p.mpRegen||13)-13)*dt);for(const d of this.relicDrops){d.life+=dt;d.vy+=430*dt;d.x+=d.vx*dt;d.z+=d.vy*dt*.01;if(d.z<=0){d.z=0;d.vx*=.55;d.vy*=-.25;if(Math.abs(d.vy)<12)d.vy=0}}}
    nearby(){const p=this.player,drop=this.relicDrops.filter(d=>dist(d,p)<82).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(drop)return{...drop,relicDrop:true,label:'Nhặt '+C.relic(drop.relic).name};const ped=this.world.relicPedestals.filter(o=>!o.claimed&&dist(o,p)<88).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(ped)return{...ped,relicPedestal:true,label:'Khám phá '+ped.name};const n=this.world.npcs.filter(n=>n.id!=='well'&&dist(n,p)<72).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(n&&!['elder','smith'].includes(n.id))return{...n,v09Npc:true,label:'Trò chuyện với '+n.name};return super.nearby()}
    interact(){const o=this.nearby();if(o?.relicDrop){this.relicDrops=this.relicDrops.filter(d=>d.id!==o.id);this.grantRelic(o.relic);this.emit('dialogue',{speaker:'THÁNH VẬT THỨC TỈNH',title:C.relic(o.relic).name,text:C.relic(o.relic).desc});return true}if(o?.relicPedestal){const real=this.world.relicPedestals.find(x=>x.id===o.id);real.claimed=true;this.grantRelic(o.relic);this.emit('dialogue',{speaker:'BỆ ĐÁ CỔ',title:C.relic(o.relic).name,text:C.relic(o.relic).desc});return true}if(o?.v09Npc){this.storyFlags[o.id]=true;this.updateDialogueStage();this.emit('dialogue',this.npcDialogue(o));return true}return super.interact()}
    updateDialogueStage(){const met=Object.keys(this.storyFlags).length,seals=this.world.shrines.filter(s=>s.active).length;this.dialogueStage=this.victory?4:seals===3?3:met>=3||seals?2:1}
    npcDialogue(n){const hero=V.stories[this.hero.id]||V.stories.an,text=[V.stories[this.hero.id]?.intro,'Năm cái tên đã bị đốt khỏi Sổ Đinh: An, Linh, Quân Lê, HoaVi, Thiên Vũ. Ba Ấn là đinh phong kín ký ức tội lỗi.','Cội Đa không cướp ký ức. Nó giữ linh hồn năm người bị Làng Đèn hiến tế mười tám năm trước.','Miền Sương là vòng lặp ký ức. Đốm là trái tim hy vọng Kẻ Dệt Sương gửi ngược về.'][this.dialogueStage-1];return{speaker:n.name,title:'Tầng sự thật '+this.dialogueStage+' · '+hero.relic,text}}
    serialize(){const data=super.serialize();data.v09={version:1,stats:{...this.player.stats},statPoints:this.player.statPoints,storyFlags:{...this.storyFlags},dialogueStage:this.dialogueStage,pedestals:this.world.relicPedestals.filter(x=>x.claimed).map(x=>x.relic),relicDrops:this.relicDrops.map(x=>({...x}))};data.pendingLevels=0;return data}
    static restore(data){const g=Base.restore(data);Object.setPrototypeOf(g,V09Game.prototype);g.initV09(data.v09?.version===1?data.v09:null);if(!data.v09){g.player.statPoints=2+Math.max(0,g.player.level-1)*2;g.skillPoints=Math.max(g.skillPoints||0,3+Math.max(0,g.player.level-1));g.emit('toast',{text:'Bản lưu cũ đã đổi sang 0.9: nhận '+g.player.statPoints+' điểm chỉ số.',reward:true})}return g}
  }
  root.DTV09={STAT_KEYS,Game:V09Game};root.DTGame=V09Game;
})(globalThis);
