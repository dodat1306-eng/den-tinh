(function(root){
  'use strict';
  const Base=root.DTGame,D=root.DTWorld,C=root.DTContent,TAU=Math.PI*2;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const masteryNodes=[['vigor','Căn Cốt','Mỗi bậc thêm 2% máu cơ sở nhân vật.'],['spirit','Dưỡng Khí','Mỗi bậc tăng 5% hồi linh lực cơ sở.'],['step','Thân Pháp','Mỗi bậc tăng 3% tốc độ lướt; không kéo dài miễn sát thương.'],['critical','Phá Thế','Mỗi bậc thêm 0,02 hệ số sát thương chí mạng.']];
  const specs={q:[{id:'focus',name:'Tập Trung',desc:'Sát thương chính +25%. Linh bắn tên xuyên tối đa 10 mục tiêu.'},{id:'burst',name:'Bộc Phát',desc:'Sát thương chính −15%, thêm nổ vùng. Linh dùng tên găm nổ khi trúng.'}],e:[{id:'lasting',name:'Bền Vững',desc:'Trường E tồn tại lâu hơn 40%; nhận thêm 15 khiên.'},{id:'agile',name:'Ứng Biến',desc:'E hồi nhanh hơn 25% và tăng 15% tốc độ chạy trong 2 giây.'}],r:[{id:'might',name:'Uy Lực',desc:'Sát thương tuyệt kỹ +25%.'},{id:'renewal',name:'Tái Sinh',desc:'Sát thương −15%; hồi 18% máu tối đa và 20 linh lực khi chiêu được nhả.'}]};
  class JourneyGame extends Base{
    constructor(hero,seed){super(hero,seed);this.initJourney()}
    initJourney(saved){
      this.mastery={vigor:0,spirit:0,step:0,critical:0};this.specializations={};this.village={vigor:0,supplies:0};this.shopState={roll:0,bought:[]};this.manaPotions=0;this.charmTime=0;this.agileTime=0;this.harmonyCooldown=0;this.trial=null;this.eliteHazards=[];this.anRecastUntil=0;
      if(!saved){this.syncVillageProfile(true);return}
      for(const k in this.mastery)this.mastery[k]=Math.floor(clamp(saved.mastery?.[k],0,50));
      for(const k of['q','e','r'])if(this.skillRanks[k]>=3&&specs[k].some(s=>s.id===saved.specializations?.[k]))this.specializations[k]=saved.specializations[k];
      for(const k in this.village)this.village[k]=Math.floor(clamp(saved.village?.[k],0,5));
      this.manaPotions=Math.floor(clamp(saved.manaPotions,0,6));this.charmTime=clamp(saved.charmTime,0,60);this.harmonyCooldown=clamp(saved.harmonyCooldown,0,6);
      this.shopState={roll:Math.floor(clamp(saved.shop?.roll,0,100000)),offers:(Array.isArray(saved.shop?.offers)?saved.shop.offers:[]).filter(id=>C.relic(id)).slice(0,3),bought:(Array.isArray(saved.shop?.bought)?saved.shop.bought:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<3)};
      const t=saved.trial;if(t&&typeof t.id==='string'&&Number.isFinite(t.x)&&Number.isFinite(t.y)&&t.remaining>0&&['active','claim'].includes(t.state)){
        this.trial={id:t.id.slice(0,110),x:t.x,y:t.y,wave:Math.floor(clamp(t.wave,1,3)),remaining:clamp(t.remaining,0,30),state:t.state};
        if(t.state==='active')for(const e of(Array.isArray(t.enemies)?t.enemies:[]).slice(0,3))if(Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.hp)&&e.hp>0)this.world.enemies.push({...e,id:String(e.id).slice(0,150),trialId:this.trial.id,hp:clamp(e.hp,1,3000),maxHp:clamp(e.maxHp,1,3000),alive:true});
      }
      this.syncVillageProfile(false);
    }
    syncVillageProfile(fresh=false){let profile={};try{profile=JSON.parse(root.localStorage?.getItem('den-tinh-village-v06')||'{}')||{}}catch{}const before=this.village.vigor;for(const k in this.village)this.village[k]=Math.max(this.village[k],Math.floor(clamp(profile[k],0,5)));const hp=(this.village.vigor-before)*Math.ceil(D.HEROES[this.hero.id].hp*.05);this.player.maxHp+=hp;this.player.hp=Math.min(this.player.maxHp,this.player.hp+hp);if(fresh)this.player.potions=Math.max(this.player.potions,3+this.village.supplies)}
    saveVillageProfile(){try{root.localStorage?.setItem('den-tinh-village-v06',JSON.stringify(this.village))}catch{}}
    get skillTree(){return super.skillTree.concat(masteryNodes.map(([id,name,desc])=>({id:'mastery-'+id,name,desc:desc+' Tối đa 50 bậc; chi phí tăng mỗi 10 bậc. Mở khi Q/E/R đều đạt bậc 3.',maxRank:50,rank:this.mastery?.[id]||0,cost:1+Math.floor((this.mastery?.[id]||0)/10),mastery:true}))) }
    get masteryUnlocked(){return ['q','e','r'].every(k=>this.skillRanks[k]>=3)}
    learnSkill(id){
      if(!id.startsWith('mastery-'))return super.learnSkill(id);const k=id.slice(8),rank=this.mastery[k],cost=1+Math.floor(rank/10);
      if(!this.masteryUnlocked||!Object.hasOwn(this.mastery,k)||rank>=50||this.skillPoints<cost)return false;
      this.skillPoints-=cost;this.mastery[k]++;if(k==='vigor'){const hp=Math.max(1,Math.ceil(D.HEROES[this.hero.id].hp*.02));this.player.maxHp+=hp;this.player.hp=Math.min(this.player.maxHp,this.player.hp+hp)}this.emit('sound',{name:'level'});return true;
    }
    chooseSpecialization(key,id){if(this.skillRanks[key]!==3||this.specializations[key]||!specs[key]?.some(s=>s.id===id))return false;this.specializations[key]=id;this.emit('sound',{name:'level'});return true}
    passiveNodeText(){return this.hero.id==='thienvu'?'Mỗi bậc: Hòa Âm hồi thêm 3 linh lực và 3 khiên; nghỉ 6 giây giữa hai lần kích hoạt. Phản ứng tăng 12% sát thương.':super.passiveNodeText()}
    canRecastE(){const a=this.player.action;return this.hero.id==='an'&&this.time<this.anRecastUntil&&this.mythicFields.some(f=>f.kind==='lantern'&&f.life>0)&&(!a||a.elapsed>=a.release+.1)||this.hero.id==='hoavi'&&!!this.checkpoint&&(!a||a.elapsed>=a.duration)}
    shopOffers(){if(!this.shopState.offers?.length){const pool=C.relics.filter(r=>!r.mythic||!this.player.relics[r.id]),start=((this.world.seed>>>0)+this.shopState.roll*17)%pool.length;this.shopState.offers=[0,1,2].map(i=>pool[(start+i*7)%pool.length]?.id).filter((id,i,a)=>id&&a.indexOf(id)===i)}return this.shopState.offers.map(id=>C.relic(id))}
    rerollPrice(){return Math.min(180,30+this.shopState.roll*15)}
    buy(item){
      const p=this.player;let cost=0,apply;
      if(/^offer-[0-2]$/.test(item)){const slot=Number(item.slice(-1)),r=this.shopOffers()[slot];if(!r||this.shopState.bought.includes(slot)||r.mythic&&p.relics[r.id])return false;cost=105;apply=()=>{this.shopState.bought.push(slot);this.grantRelic(r.id)}}
      else if(item==='reroll'){cost=this.rerollPrice();apply=()=>{this.shopState.roll++;this.shopState.bought=[];this.shopState.offers=[]}}
      else if(item==='mana'){if(this.manaPotions>=6)return false;cost=35;apply=()=>this.manaPotions++}
      else if(item==='charm'){if(this.charmTime>0)return false;cost=80;apply=()=>{this.charmTime=60}}
      else if(item==='village-vigor'||item==='village-supplies'){const key=item.slice(8),rank=this.village[key];if(rank>=5)return false;cost=150+rank*100;apply=()=>{this.village[key]++;if(key==='vigor'){const hp=Math.ceil(D.HEROES[this.hero.id].hp*.05);p.maxHp+=hp;p.hp=Math.min(p.maxHp,p.hp+hp)}else p.potions=Math.max(p.potions,3+this.village.supplies)}}
      else return super.buy(item);
      if(p.gold<cost)return false;p.gold-=cost;apply();if(item.startsWith('village-'))this.saveVillageProfile();this.emit('sound',{name:'pickup'});return true;
    }
    useManaPotion(){const p=this.player;if(this.paused||this.dead||this.manaPotions<=0||p.mp>=p.maxMp)return false;this.manaPotions--;p.mp=Math.min(p.maxMp,p.mp+60);this.effect('ring',p.x,p.y,'#83cfff',65,.55);this.emit('sound',{name:'heal'});return true}
    interact(){const o=this.nearby();if(o?.id==='smith'){if(this.paused||this.dead)return false;this.emit('shop');return true}
      if(o?.environment&&['trial','fog'].includes(o.type)){
        if(this.paused||this.dead)return false;const real=this.world.environment.find(e=>e.id===o.id);if(!real||real.used)return false;
        if(o.type==='fog'){real.used=true;this.player.gold+=40;this.effect('ring',o.x,o.y,'#c6dcca',360,1);this.emit('toast',{text:'Đèn lạc sáng lại · sương đã tan, nhận 40 xu.',reward:true});return true}
        if(this.trial||this.saga.stage==='boss')return false;real.used=true;this.trial={id:o.id,x:o.x,y:o.y,wave:1,remaining:30,state:'active'};this.spawnTrialWave();this.emit('toast',{text:'Đài Tế: hạ ba đợt trong 30 giây. Rời xa quá 650 bước sẽ thất bại.'});return true;
      }
      if(this.trial?.state==='claim'&&dist(this.player,this.trial)<100){const t=this.trial;this.trial=null;this.player.gold+=120;const relic=C.relics.find(r=>r.mythic&&!this.player.relics[r.id]);if(relic)this.grantRelic(relic.id);else this.player.gold+=80;this.effect('ring',t.x,t.y,'#ffe2a0',140,.8);this.emit('toast',{text:'Rương Vàng · +120 xu và cổ vật (hoặc 80 xu nếu đã đủ).',reward:true});return true}
      return super.interact();
    }
    nearby(){if(this.trial?.state==='claim'&&dist(this.player,this.trial)<86)return{...this.trial,label:'Rương Vàng · Nhấn F nhận thưởng'};const o=super.nearby();if(o?.type==='trial')o.label='Đài Tế Nguyện Ước · 3 đợt / 30 giây · một lượt';if(o?.type==='fog')o.label='Đèn Lạc · F xua sương (địch trong sương bền hơn, XP ×2)';return o}
    spawnTrialWave(){const t=this.trial;for(let i=0;i<3;i++){const angle=(i/3+t.wave*.19)*TAU,spot=this.elementSafeSpot(t.x+Math.cos(angle)*180,t.y+Math.sin(angle)*150)||{x:t.x,y:t.y},hp=45+this.player.level*7+t.wave*12;this.world.enemies.push({id:t.id+'-wave-'+t.wave+'-'+i,trialId:t.id,type:['slime','archer','shade'][(i+t.wave)%3],...spot,homeX:t.x,homeY:t.y,r:15,hp,maxHp:hp,speed:90,damage:10+t.wave,xp:12,gold:4,alive:true,cool:1+i*.3,phase:0,timer:0,hit:0,slow:0,knockX:0,knockY:0,frontier:true})}}
    fogAt(x,y){return this.world.environment.find(o=>o.type==='fog'&&!o.used&&Math.hypot(o.x-x,o.y-y)<360)}
    damageEnemy(e,amount,charge=true){const previous=this.xpSource;this.xpSource=e;try{return super.damageEnemy(e,amount*(this.fogAt(e?.x,e?.y)?.72:1),charge)}finally{this.xpSource=previous}}
    addXp(amount){return super.addXp(amount*(this.xpSource&&this.fogAt(this.xpSource.x,this.xpSource.y)?2:1))}
    critMultiplier(){return 1.7+(this.mastery?.critical||0)*.02}
    registerHarmony(id){if(this.harmonyCooldown>0)return;const s=this.passiveState,p=this.player;if(!s.forms.includes(id))s.forms.push(id);s.formTime=12;if(s.forms.length>=3){s.forms=[];this.harmonyCooldown=6;p.mp=Math.min(p.maxMp,p.mp+12+this.skillRanks.passive*3);p.shield=Math.max(p.shield,Math.min(60,p.shield+10+3*this.skillRanks.passive));this.emit('toast',{text:'Hòa Âm Tam Linh · hồi linh lực và khiên, nghỉ 6 giây',reward:true})}}
    skill(key){
      const p=this.player;if(this.paused||this.dead||p.ultIntro||p.dashTime>0)return false;
      if(this.hero.id==='an'&&key==='e'&&this.time<this.anRecastUntil&&this.mythicFields.some(f=>f.kind==='lantern'&&f.life>0)&&(!p.action||p.action.elapsed>=p.action.release+.1)){
        const lamps=this.mythicFields.filter(f=>f.kind==='lantern'&&f.life>0);this.mythicFields=this.mythicFields.filter(f=>!lamps.includes(f));this.anRecastUntil=0;
        const center={x:lamps.reduce((v,f)=>v+f.x,0)/lamps.length,y:lamps.reduce((v,f)=>v+f.y,0)/lamps.length};for(const e of this.world.enemies)if(e.alive&&!e.sagaBoss&&e.type!=='boss'&&dist(e,center)<330){const d=dist(e,center),step=Math.min(80,d*.35);if(d>1)this.moveEntity(e,(center.x-e.x)/d*step,(center.y-e.y)/d*step)}
        for(const f of lamps){this.areaDamage(f.x,f.y,165,p.damage*2.2,0,true);this.effect('element-impact',f.x,f.y,'#ffc08a',165,.65,{element:'fire'})}p.action=null;p.cast=0;this.emit('sound',{name:'skill'});return true;
      }
      const ok=super.skill(key);if(ok){if(this.charmTime>0&&key!=='r')p.cd[key]*=.9;if(key==='e'&&this.specializations.e==='agile'){p.cd.e*=.75;this.agileTime=2}if(this.hero.id==='kiet'&&key==='q')p.invulnerable=Math.max(p.invulnerable,.28)}return ok;
    }
    releaseCast(c){
      const p=this.player,spec=this.specializations[c.key],fields=this.mythicFields.length;let copy={...c};
      if(c.key==='q'&&spec==='focus'||c.key==='r'&&spec==='might')copy.power*=1.25;
      if(c.key==='q'&&spec==='burst'||c.key==='r'&&spec==='renewal')copy.power*=.85;
      if(this.hero.id==='linh'&&c.key==='q'&&spec){this.shoot(p.x,p.y,c.angle,1050,p.damage*copy.power*(spec==='focus'?4.5:2.8),'#c7f5b1',{kind:'arrow',pierce:spec==='focus'?9:0,life:1,charge:true,sourceSkill:'q',specialBurst:spec==='burst'});this.effect('mythic-spear',p.x,p.y,'#c7f5b1',700,.4,{angle:c.angle})}else super.releaseCast(copy);
      if(c.key==='q'&&spec==='burst'&&this.hero.id!=='linh'){this.areaDamage(c.target.x,c.target.y,105,p.damage*1.5,50,true);this.effect('shock',c.target.x,c.target.y,this.hero.color,105,.5)}
      if(c.key==='e'&&spec==='lasting'){for(const f of this.mythicFields.slice(fields))f.life*=1.4;p.shield=Math.min(110,p.shield+15)}
      if(c.key==='r'&&spec==='renewal'){p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.18);p.mp=Math.min(p.maxMp,p.mp+20)}
      if(this.hero.id==='an'&&c.key==='e')this.anRecastUntil=this.time+3;
      if(this.hero.id==='kiet'&&c.key==='q')for(const e of this.world.enemies)if(e.alive&&!e.sagaBoss&&e.type!=='boss'&&dist(e,p)<120)e.rooted=Math.max(e.rooted||0,.25);
    }
    shoot(...args){super.shoot(...args);const b=this.projectiles[this.projectiles.length-1],opts=args[6]||{};if(b){b.specialBurst=!!opts.specialBurst;b.eliteElement=opts.eliteElement}}
    onBulletHit(b,e){super.onBulletHit(b,e);if(b.specialBurst){b.specialBurst=false;this.areaDamage(e.x,e.y,105,b.damage*.6,50,false);this.effect('shock',e.x,e.y,'#c4edac',105,.5)}}
    onHostileBulletHit(b,dealt){if(dealt&&b.eliteElement==='ice')this.player.frostSlow=1.2}
    dash(){const ok=super.dash();if(!ok)return false;const p=this.player;if(p.action){if(p.action.elapsed>=p.action.release){p.action=null;p.cast=0}else p.action.cancelOnRelease=true}const speed=1+(this.mastery.step||0)*.03;p.dashX*=speed;p.dashY*=speed;return true}
    update(dt){
      if(this.paused||this.dead||!this.started)return;const p=this.player,before=this.time,speed=p.speed;dt=clamp(dt,0,.04);if(this.charmTime>0)p.speed*=1.12;if(this.agileTime>0)p.speed*=1.15;if(p.frostSlow>0&&!p.ultIntro)p.speed*=.6;
      try{super.update(dt)}finally{p.speed=speed}if(this.time===before)return;
      if(p.action?.cancelOnRelease&&p.action.elapsed>=p.action.release){p.action=null;p.cast=0}
      p.mp=Math.min(p.maxMp,p.mp+13*.05*this.mastery.spirit*dt);p.frostSlow=Math.max(0,(p.frostSlow||0)-dt);this.charmTime=Math.max(0,this.charmTime-dt);this.agileTime=Math.max(0,this.agileTime-dt);this.harmonyCooldown=Math.max(0,this.harmonyCooldown-dt);
      if(this.trial?.state==='active'){const t=this.trial;t.remaining-=dt;if(t.remaining<=0||dist(p,t)>650){this.world.enemies=this.world.enemies.filter(e=>e.trialId!==t.id);this.trial=null;this.emit('toast',{text:'Đài Tế khép lại. Hãy tìm đài mới ở miền xa.'})}else if(!this.world.enemies.some(e=>e.alive&&e.trialId===t.id)){if(t.wave<3){t.wave++;this.spawnTrialWave()}else{t.state='claim';this.emit('toast',{text:'Đài Tế hoàn thành! Trở về tâm đài, nhấn F mở Rương Vàng.',reward:true})}}}
      for(const e of this.world.enemies)if(e.alive&&e.elite&&dist(e,p)<650){e.eliteCooldown=(e.eliteCooldown||0)-dt;if(e.eliteCooldown<=0){e.eliteCooldown=e.elite==='fire'?1.2:3;if(e.elite==='ice'){const a=Math.atan2(p.y-e.y,p.x-e.x);this.shoot(e.x,e.y,a,220,e.damage*.8,'#9de8ff',{friendly:false,r:7,life:3,eliteElement:'ice'});this.effect('mythic-rune',e.x,e.y,'#9de8ff',50,.4)}else if(this.eliteHazards.length<40)this.eliteHazards.push({x:e.elite==='fire'?e.x:p.x,y:e.elite==='fire'?e.y:p.y,r:e.elite==='fire'?48:65,timer:.7,life:e.elite==='fire'?2.5:1,element:e.elite,damage:e.damage*.7,tick:0})}}
      for(const h of this.eliteHazards){h.timer-=dt;if(h.timer>0)continue;h.life-=dt;h.tick-=dt;if(h.tick<=0){h.tick=.65;if(dist(p,h)<h.r+p.r)this.damagePlayer(h.damage)}}this.eliteHazards=this.eliteHazards.filter(h=>h.life>0);
    }
    respawn(){super.respawn();this.charmTime=0;this.agileTime=0;this.eliteHazards=[];if(this.trial){const id=this.trial.id;this.world.enemies=this.world.enemies.filter(e=>e.trialId!==id);this.trial=null}this.player.potions=Math.max(this.player.potions,3+(this.village?.supplies||0))}
    travelTo(id){const ok=super.travelTo(id);if(ok){this.eliteHazards=[];if(this.trial){const key=this.trial.id;this.world.enemies=this.world.enemies.filter(e=>e.trialId!==key);this.trial=null}}return ok}
    serialize(){const data=super.serialize();data.enemies=data.enemies.filter(e=>!e.id.includes('-wave-'));if(data.dynamicEnemies)data.dynamicEnemies=data.dynamicEnemies.filter(e=>!e.trialId);data.journey={version:6,mastery:{...this.mastery},specializations:{...this.specializations},village:{...this.village},manaPotions:this.manaPotions,charmTime:this.charmTime,harmonyCooldown:this.harmonyCooldown,shop:{...this.shopState,offers:[...(this.shopState.offers||[])],bought:[...this.shopState.bought]},trial:this.trial?{...this.trial,enemies:this.world.enemies.filter(e=>e.alive&&e.trialId===this.trial.id).map(e=>({...e}))}:null};return data}
    static restore(data){const g=Base.restore(data);Object.setPrototypeOf(g,JourneyGame.prototype);g.initJourney(data.journey?.version===6?data.journey:null);return g}
  }
  root.DTJourney={masteryNodes,specs,Game:JourneyGame};root.DTGame=JourneyGame;
})(globalThis);
