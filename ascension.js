(function(root){
  'use strict';
  const Base=root.DTGame,D=root.DTWorld,C=root.DTContent,M=root.DTMythic,TAU=Math.PI*2;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const segment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/Math.max(1,dx*dx+dy*dy),0,1);return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t)};
  class AscensionGame extends Base{
    constructor(hero,seed){super(hero,seed);this.initAscension()}
    initAscension(saved){
      this.skillPoints=3;this.skillRanks={q:0,e:0,r:0,passive:0};this.castQueue=[];this.mythicFields=[];this.relicCooldowns={};this.relicCounters={};this.usedRelics={};
      this.passiveState={embers:0,wind:0,thunder:0,distance:0,lastHit:0,forms:[],formTime:0,attackCount:0};this.motion={vx:0,vy:0};this.checkpoint=null;this.fieldSerial=0;
      this.signature={...M.signature[this.hero.id]};this.interactedIds=new Set((saved?.interactedIds||[]).filter(id=>typeof id==='string').slice(-50000));
      if(saved){
        this.skillPoints=clamp(Number(saved.points)||0,0,999);for(const id of ['q','e','r','passive'])this.skillRanks[id]=clamp(Math.floor(Number(saved.ranks?.[id])||0),0,3);
        this.usedRelics={cuoi:!!saved.usedRelics?.cuoi};
        for(const id of Object.keys(this.relicCooldowns))delete this.relicCooldowns[id];
        for(const [id,t] of Object.entries(saved.relicCooldowns||{}))if(C.relic(id)&&Number.isFinite(t))this.relicCooldowns[id]=clamp(t,0,60);
        for(const [id,n] of Object.entries(saved.relicCounters||{}))if(C.relic(id)&&Number.isFinite(n))this.relicCounters[id]=clamp(n,0,1000);
      }
      delete this.player.weapons;delete this.player.weaponSlot;this.weaponDrops=[];this.player.action=null;
      this.player.velocityX=0;this.player.velocityY=0;
      this.player.ultIntro=null;this.syncUltimate();
      const ritual=saved?.ultimate;
      if(ritual&&Number.isFinite(ritual.elapsed)&&ritual.elapsed>=0&&ritual.elapsed<4.5&&Number.isFinite(ritual.angle)){
        const p=this.player,angle=ritual.angle,target=ritual.target;
        p.ultIntro={elapsed:ritual.elapsed,duration:4.5,pulse:Math.floor(ritual.elapsed/.8),cast:{key:'r',angle,target:{x:clamp(Number.isFinite(target?.x)?target.x:p.x+Math.cos(angle)*600,40,D.W-40),y:clamp(Number.isFinite(target?.y)?target.y:p.y+Math.sin(angle)*600,40,D.H-40)},element:this.isElemental?this.element.id:undefined,power:1+.18*this.skillRanks.r}};
        this.beginAction('r',angle);p.action.elapsed=ritual.elapsed;p.invulnerable=Math.max(p.invulnerable,4.8-ritual.elapsed);
      }
      for(const chest of this.world.chests)delete chest.weaponId;
    }
    get weapon(){return {...(this.signature||M.signature[this.hero.id]),power:1,interval:this.hero.fireRate,clip:0,reload:0,speed:this.hero.shotSpeed,pierce:0,effect:'signature'}}
    effectiveRCd(){const p=this.player;return (this.hero.rCd||18)*(1-.06*(this.skillRanks?.r||0))*(p.relics?.cooling?.8:1)*(this.charmTime>0?.9:1)}
    syncUltimate(){const p=this.player;p.cd.r=Math.max(0,Number.isFinite(p.cd.r)?p.cd.r:0);p.ult=p.cd.r<=0?100:clamp(Math.floor(100*(1-p.cd.r/Math.max(1,this.effectiveRCd()))),0,100)}
    updateUltIntro(dt){
      const p=this.player,i=p.ultIntro;if(!i)return;
      i.elapsed=Math.min(i.duration,i.elapsed+dt);
      const pulse=Math.floor((i.elapsed+1e-9)/.8);
      if(pulse>i.pulse){i.pulse=pulse;for(const e of this.world.enemies)if(e.alive&&dist(e,p)<=520){const a=Math.atan2(e.y-p.y,e.x-p.x);this.moveEntity(e,Math.cos(a)*12,Math.sin(a)*12)}}
      if(i.elapsed+1e-9<i.duration)return;
      p.ultIntro=null;p.action=null;p.cast=0;
      if(this.isElemental){this.elementSplitTime=14;this.syncElementClones(7)}
      this.onRelicCast('r',0,i.cast.target);this.releaseCast(i.cast);
    }
    get weaponStateActive(){return {id:this.weapon.id,level:1,ammo:0,reload:0}}
    get skillTree(){const names=M.nodeNames[this.hero.id];return ['q','e','r','passive'].map((id,i)=>({id,name:names[i],maxRank:3,desc:id==='passive'?this.passiveNodeText():this.skillDescriptions[id].desc+' Mỗi bậc tăng 18% sát thương; Q/E/R hồi nhanh hơn 6% mỗi bậc.'}))}
    passiveNodeText(){return {an:'Mỗi bậc: tích Tàn Lửa nhanh hơn; đèn hồi thêm 0,5 máu/giây.',linh:'Mỗi bậc: cần ít hơn 5 bước cho một Nhịp Trúc; dấu ghim tồn tại lâu hơn.',kiet:'Mỗi bậc: đòn cường hóa thêm 10 khiên; chiến tuyến chặn đạn hiệu quả hơn.',hoavi:'Mỗi bậc: biên dịch lại Q mạnh thêm 15%; hồi quy hồi thêm 4% máu tối đa.',thienvu:'Mỗi bậc: Hòa Âm hồi thêm 5 linh lực và 5 khiên; phản ứng tăng 12% sát thương.'}[this.hero.id]}
    get skillDescriptions(){
      if(!this.isElemental)return M.kits[this.hero.id];const f=this.element;
      const desc={lightning:['Lao theo đường ngắm rồi nối sét qua ba mục tiêu.','Dịch chuyển ngắn, để lại ấn sét đón các đòn sau.','Bảy sét đánh lần lượt theo mục tiêu, có báo trước.'],wind:['Ba phong liêm quay về, cắt cả lượt đi lẫn lượt về.','Phong nhãn xóa đạn và gom kẻ gần đó.','Lốc di động cuốn theo hướng ngắm và kéo địch.'],earth:['Dựng năm địa trụ lần lượt dọc một đường.','Dựng tuyến đá chắn đạn và nhận giáp.','Hai vách núi khép vào đường ngắm.'],fire:['Hỏa xà đuổi mục tiêu gần đường ngắm.','Tạo ba hạt lửa quanh thân để kích nổ bằng đòn đánh.','Một đường hỏa long thiêu đốt theo từng nhịp.'],ice:['Tia băng xuyên, vỡ vụn khi gặp địch đang đóng băng.','Đặt gương băng phản đạn tại điểm ngắm.','Băng vực nở từ tâm ra ngoài, đông cứng từng đợt.'],nature:['Dây leo bám mục tiêu, trói và hút máu nhẹ.','Gieo vườn hồi phục; địch bước vào bị rễ giữ lại.','Gọi rễ từ vị trí các địch bị độc, tạo mạng dây leo.'],light:['Dịch chuyển tức thời ra sau lưng địch trong 520 bước và chém chí mạng; không có địch thì nhảy 280 bước theo hướng ngắm.','Dựng quang kính phản các đạn chạm vào.','Tích quang rồi quét tia theo hướng ngắm.']}[f.id];
      return Object.fromEntries(['q','e','r'].map((k,i)=>[k,{name:f[k],desc:desc[i],cost:i===0?24:i===1?34:0,cooldown:i===0?6:i===1?10:0}]));
    }
    learnSkill(id){if(!Object.hasOwn(this.skillRanks,id)||this.skillPoints<1||this.skillRanks[id]>=3)return false;this.skillPoints--;this.skillRanks[id]++;this.emit('sound',{name:'level'});this.emit('toast',{text:'Đã học '+this.skillTree.find(n=>n.id===id).name+' · bậc '+this.skillRanks[id]+'/3',reward:true});return true}
    awardSkillPoints(n,label){n=clamp(Math.floor(Number(n)||0),0,20);this.skillPoints=Math.min(999,this.skillPoints+n);if(n)this.emit('toast',{text:'+'+n+' điểm kỹ năng · '+(label||'nhấn K để học'),reward:true});return n}
    passiveDescription(){return C.passives[this.hero.id]}
    passiveStatus(){const s=this.passiveState,p=this.player;return {an:'Tàn Lửa '+Math.floor(s.embers)+'/6 · Đèn '+this.mythicFields.filter(f=>f.kind==='lantern').length+'/3',linh:'Nhịp Trúc '+s.wind+'/8 · chạy để tích nhịp',kiet:'Lôi Tức '+s.thunder+'/5 · chặn đạn để tích lực',hoavi:'Mã Lệnh '+p.code+'/8'+(this.checkpoint?' · E trở về trong '+Math.ceil(this.checkpoint.life)+'s':''),thienvu:'Hòa Âm '+s.forms.length+'/3 · '+(s.forms.join(' / ')||'đổi dạng rồi dùng kỹ năng')}[this.hero.id]}
    switchWeapon(){return false}
    reloadWeapon(){return false}
    dropWeapon(){return false}
    addXp(amount){const before=this.player.level;super.addXp(amount);if(this.skillRanks){const levels=this.player.level-before;if(levels>0){this.skillPoints+=levels;this.emit('toast',{text:'+'+levels+' điểm kỹ năng · nhấn K để học',reward:true})}}}
    buy(item){if(item==='weapon')return false;return super.buy(item)}
    interact(){const o=this.nearby(),oldX=this.player.x,oldY=this.player.y;if(o?.id==='smith'){if(this.paused||this.dead)return false;this.emit('skills');return true}const ok=super.interact();if(ok&&o)this.onMythicInteract(o);if(ok&&Math.hypot(this.player.x-oldX,this.player.y-oldY)>200){this.cancelActions();this.elementClones=[];this.elementFields=[];this.elementActions=[];this.elementSplitTime=0}return ok}
    onMythicInteract(o){
      const p=this.player,fresh=!this.interactedIds.has(o.id);if(o.id)this.interactedIds.add(o.id);if(fresh&&p.relics.chudong&&this.readyRelic('chudong',3)){p.mp=Math.min(p.maxMp,p.mp+12);p.hp=Math.min(p.maxHp,p.hp+6)}
      if(p.relics.jack&&this.readyRelic('jack',8))this.addField('trap',o.x,o.y,{r:105,life:5,power:p.damage,element:'nature'});
    }
    readyRelic(id,cooldown){if(this.relicCooldowns[id]>0)return false;this.relicCooldowns[id]=cooldown;return true}
    addField(kind,x,y,extra={}){const f={id:'mythic-'+(++this.fieldSerial),kind,x,y,r:100,life:4,tick:0,angle:this.player.facing,...extra};this.mythicFields.push(f);if(this.mythicFields.length>28)this.mythicFields.shift();return f}
    beginAction(key,angle,element){const windup=key==='q'&&(this.hero.id==='quanle'||this.isElemental&&(element||this.element?.id)==='light')?0:key==='attack'?.03:key==='r'?4.5:this.hero.id==='linh'&&key==='q'?.25:key==='e'?.14:.16,duration=key==='attack'?.32:key==='r'?4.5:key==='q'?.65:.56;this.player.action={key,hero:this.hero.id,element:element||this.element?.id,angle,elapsed:0,duration,windup,release:windup,recovery:duration-windup-.14};this.player.cast=duration;this.player.castKey=key;return windup}
    shoot(x,y,a,speed,damage,color,opts={}){super.shoot(x,y,a,speed,damage,color,opts);const b=this.projectiles[this.projectiles.length-1];if(b)Object.assign(b,{signature:!!opts.signature,returning:!!opts.returning,age:0,sourceSkill:opts.sourceSkill||'',echo:!!opts.echo})}
    fire(){
      const p=this.player;if(this.paused||this.dead||p.ultIntro||p.cd.fire>0||p.dashTime>0||p.action&&p.action.key!=='attack'&&p.action.elapsed<p.action.release+.12)return false;
      const id=this.hero.id,s=this.passiveState,scale=1+(this.skillRanks.passive||0)*.035;
      p.cd.fire=p.fireRate*(p.overclock>0?.72:1);this.tutorial.shots++;p.recoil=.12;s.attackCount++;
      if(!p.action||p.action.key==='attack')this.beginAction('attack',p.facing,this.isElemental?this.element.id:undefined);
      if(id==='thienvu'){const start=this.projectiles.length;this.elementPrimary(p,this.element.id,p.damage*scale,true);for(const b of this.projectiles.slice(start))b.signature=true}
      else if(id==='quanle'){root.DTShadow.primary(this,p.damage*scale)}
      else if(id==='kiet'){
        this.lineHit(p,{x:p.x+Math.cos(p.facing)*135,y:p.y+Math.sin(p.facing)*135},24,p.damage*1.3*scale,'lightning',true);
        this.effect('mythic-spear',p.x,p.y,this.signature.color,135,.21,{angle:p.facing});s.thunder=Math.min(5,s.thunder+1);
        this.shoot(p.x,p.y,p.facing,590,p.damage*.45,this.signature.color,{r:4,life:.38,pierce:1,signature:true});
      }else{
        const empowered=id==='linh'&&s.wind>=8;if(empowered)s.wind=0;
        const n=1+(p.relics.split?1:0);for(let i=0;i<n;i++)this.shoot(p.x,p.y,p.facing+(i-(n-1)/2)*.08,id==='linh'?980:id==='hoavi'?860:650,p.damage*scale*(empowered?1.8:1)*(n>1?.85:1),this.signature.color,{kind:id==='linh'?'arrow':id==='hoavi'?'code':'orb',pierce:(id==='linh'?1:0)+(empowered?4:0)+(p.relics.pierce?2:0),r:id==='an'?6:4,life:1.15,signature:true,sourceSkill:empowered?'wind-mark':''});
      }
      if(p.relics.giong&&s.attackCount%5===0){this.lineHit(p,{x:p.x+Math.cos(p.facing)*310,y:p.y+Math.sin(p.facing)*310},20,p.damage*1.8,'nature',false);this.effect('mythic-tether',p.x,p.y,'#a4d477',310,.4,{tx:p.x+Math.cos(p.facing)*310,ty:p.y+Math.sin(p.facing)*310})}
      if(p.relics.mjolnir&&s.attackCount%6===0){const targets=this.world.enemies.filter(e=>e.alive&&dist(e,p)<460).sort((a,b)=>dist(a,p)-dist(b,p)).slice(0,3);let from=p;for(const e of targets){this.damageEnemy(e,p.damage*.9,false);this.effect('lightning',from.x,from.y,'#b6bfff',0,.3,{tx:e.x,ty:e.y});from=e}}
      this.emit('sound',{name:id==='hoavi'?'codeShot':'shoot'});return true;
    }
    skill(key){
      if(!['q','e','r'].includes(key)||this.paused||this.dead||this.player.ultIntro)return false;const p=this.player;
      if(p.action&&p.action.key!=='attack'&&p.action.elapsed<p.action.duration)return false;
      if(this.hero.id==='hoavi'&&key==='e'&&this.checkpoint){
        const c=this.checkpoint;this.checkpoint=null;const spot=this.elementSafeSpot(c.x,c.y);if(!spot)return false;
        this.effect('choreo-pixel-blink',p.x,p.y,'#1fc8db',20,.5,{hero:'hoavi',tx:spot.x,ty:spot.y,angle:p.facing});this.lineHit(p,spot,46,p.damage*2,'light',true,{hero:'hoavi',key:'blink'});
        this.projectiles=this.projectiles.filter(b=>b.friendly||segment(b,p,spot)>70);p.x=spot.x;p.y=spot.y;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*(.08+.04*this.skillRanks.passive));p.invulnerable=Math.max(.45,p.invulnerable);this.beginAction('e',p.facing);p.action.blink=true;return true;
      }
      const def=this.skillDescriptions[key],cost=def.cost||0;if(key==='r'&&p.cd.r>0)return false;if(key!=='r'&&(p.cd[key]>0||p.mp<cost))return false;
      if(key==='r'){p.cd.r=this.effectiveRCd();this.syncUltimate()}else{p.mp-=cost;p.cd[key]=def.cooldown*(1-.06*this.skillRanks[key])*(p.relics.cooling?.8:1)}
      p.aimAngle=p.facing=Math.atan2(this.input.aimY-p.y,this.input.aimX-p.x);const a=p.aimAngle,windup=this.beginAction(key,a,this.isElemental?this.element.id:undefined),target=this.elementTarget(p,key==='r'?600:480);
      const empowered=key==='q'&&p.relics.cinderella&&(this.relicCounters.cinderella||0)>=3;if(empowered){this.relicCounters.cinderella=0;p.mp=Math.min(p.maxMp,p.mp+10)}
      const pixelOrigin=this.hero.id==='hoavi'&&key==='q'?{x:p.x,y:p.y}:undefined;
      const cast={type:'cast',delay:windup,key,angle:a,target,origin:pixelOrigin,element:this.isElemental?this.element.id:undefined,power:(1+.18*this.skillRanks[key])*(empowered?1.6:1)};
      if(key==='r'){p.ultIntro={elapsed:0,duration:4.5,pulse:0,cast};Object.assign(p.action,{duration:4.5,release:4.5,windup:4.5});p.cast=4.5;p.invulnerable=Math.max(p.invulnerable,4.8);p.frostSlow=0;p.rooted=0;p.frozen=0;p.stunned=0}
      else if(windup===0)this.releaseCast(cast);else this.castQueue.push(cast);
      if(pixelOrigin&&p.code>=4)this.effect('choreo-code-wait',p.x,p.y,'#1fc8db',64,windup+.35,{hero:'hoavi',angle:a});
      this.tutorial.skills++;if(key!=='r')this.onRelicCast(key,cost,target);this.emit('sound',{name:key==='r'?'ultimate':'skill'});if(key!=='r')this.effect('mythic-rune',p.x,p.y,this.hero.color,48,windup+.1,{key,angle:a});return true;
    }
    onRelicCast(key,cost,target){
      const p=this.player;
      if(key!=='r'&&p.relics.aegis&&p.shield<=0&&this.readyRelic('aegis',8))p.shield=18;
      if(key==='q'&&p.relics.thuytinh)this.addField('water',target.x,target.y,{element:'water',life:4,r:130,power:p.damage*.2});
      if(key==='e'&&p.relics.thachsan&&this.readyRelic('thachsan',10)){for(const e of this.world.enemies)if(e.alive&&dist(e,p)<240){e.rooted=e.sagaBoss||e.type==='boss'?.5:1.5;e.slow=1.5}this.effect('ring',p.x,p.y,'#e8cffa',240,.8)}
      if(key==='e'&&p.relics.wukong&&this.readyRelic('wukong',9))for(let i=0;i<3;i++)this.castQueue.push({type:'echo',delay:.25+i*.3,x:p.x-28,y:p.y-10,power:p.damage*.65});
      if(key==='r'&&p.relics.phoenix){p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.12);for(const e of this.world.enemies)if(e.alive&&dist(e,p)<220){e.burn=4;e.burnTick=0}}
      if(p.relics.aladdin){this.relicCounters.aladdin=(this.relicCounters.aladdin||0)+cost;if(this.relicCounters.aladdin>=90){this.relicCounters.aladdin-=90;p.mp=Math.min(p.maxMp,p.mp+25);this.lineHit(p,target,30,p.damage*2,'light',false)}}
    }
    elementTarget(origin,max=540){const a=Math.atan2(this.input.aimY-origin.y,this.input.aimX-origin.x),r=Math.min(max,Math.hypot(this.input.aimX-origin.x,this.input.aimY-origin.y));return{x:origin.x+Math.cos(a)*r,y:origin.y+Math.sin(a)*r}}
    lineHit(a,b,width,power,element,charge=true,visual={}){
      let endpoint={...b};const length=dist(a,b),angle=Math.atan2(b.y-a.y,b.x-a.x);for(let n=12;n<length;n+=12)if(this.world.collision(a.x+Math.cos(angle)*n,a.y+Math.sin(angle)*n,2)){endpoint={x:a.x+Math.cos(angle)*n,y:a.y+Math.sin(angle)*n};break}
      for(const e of this.world.enemies)if(e.alive&&segment(e,a,endpoint)<width+e.r)this.mythicHit(e,power,element,charge);
      this.effect(element==='light'?'element-beam':'mythic-tether',a.x,a.y,this.isElemental?root.DTElements.byId(element).color:this.hero.color,width,.35,{element:element||'light',tx:endpoint.x,ty:endpoint.y,angle,...visual});
      this.reactEnvironment?.(element,endpoint.x,endpoint.y,width+45);return endpoint;
    }
    mythicHit(e,damage,element,charge=true){
      if(!e?.alive)return;
      const p=this.player,previous=e.markElement;
      if(this.isElemental&&element&&previous&&previous!==element&&this.time-(e.markTime||0)<6){const rank=this.skillRanks.passive,reaction=(previous==='fire'&&element==='ice'||previous==='ice'&&element==='fire')?'Hóa Hơi':element==='wind'?'Cuốn Xoáy':element==='light'||previous==='light'?'Phá Ấn':'Cộng Hưởng';this.damageEnemy(e,p.damage*(.65+rank*.12),false);this.effect('element-impact',e.x,e.y,root.DTElements.byId(element).color,60,.45,{element});if(this.floaters.length<60)this.floaters.push({x:e.x,y:e.y-50,text:reaction,color:'#ffe4a4',life:.8,vy:-30});e.markElement=null}else if(element){e.markElement=element;e.markTime=this.time}
      this.damageEnemy(e,damage,charge);if(charge&&this.isElemental&&element)this.registerHarmony(element);
      if(element==='fire'){e.burn=3;e.burnTick=0}if(element==='ice'){e.slow=2;e.frozen=Math.max(e.frozen||0,.65)}if(element==='nature'){e.rooted=e.type==='boss'||e.sagaBoss?.3:1.25;e.poison=3;e.poisonPower=p.damage*.17}if(element==='lightning')e.slow=Math.max(e.slow||0,1);
      if(charge&&p.relics.hermes&&this.readyRelic('hermes',.8)){p.cd.dash=Math.max(0,p.cd.dash-.35);p.swiftTime=1}
    }
    releaseCast(c){if(this.hero.id==='quanle')return root.DTShadow.release(this,c);
      const p=this.player,id=this.hero.id,key=c.key,a=c.angle,power=p.damage*c.power,s=this.passiveState,t=c.target,charge=key!=='r',origin={x:p.x,y:p.y};
      if(id==='thienvu'){
        this.castElement(c.element,key,p,c.power,charge,t);
        if(key==='r'&&this.elementClones.length){for(const clone of this.elementClones)if(clone.alive)this.castElement(clone.element,'r',clone,.16,false,t);this.effect('element-convergence',t.x,t.y,'#fff0d1',270,1.2,{count:this.elementClones.length+1,points:[{x:p.x,y:p.y,element:c.element},...this.elementClones.map(x=>({x:x.x,y:x.y,element:x.element}))]})}return;
      }
      if(id==='an'){
        if(key==='q'){
          const full=s.embers>=6;s.embers=full?0:s.embers;this.effect('mythic-slash',p.x,p.y,'#ffbc6a',220,.45,{angle:a});
          for(const e of this.world.enemies)if(e.alive&&dist(e,p)<240+e.r&&Math.abs(Math.atan2(Math.sin(Math.atan2(e.y-p.y,e.x-p.x)-a),Math.cos(Math.atan2(e.y-p.y,e.x-p.x)-a)))<.72){this.mythicHit(e,power*(full?4.8:3.2),'fire',true);if(full)this.areaDamage(e.x,e.y,85,power*.7,90,false)}
          if(full)for(const f of this.mythicFields)if(f.kind==='lantern')f.life=Math.min(12,f.life+3);this.reactEnvironment?.('fire',p.x+Math.cos(a)*145,p.y+Math.sin(a)*145,125);
        }
        if(key==='e'){const spot=this.elementSafeSpot(t.x,t.y)||p;const lamps=this.mythicFields.filter(f=>f.kind==='lantern');if(lamps.length>=3)this.mythicFields=this.mythicFields.filter(f=>f.id!==lamps[0].id);this.addField('lantern',spot.x,spot.y,{life:9+this.skillRanks.e,r:95,power:power*.6,element:'fire'});this.reactEnvironment?.('fire',spot.x,spot.y,100)}
        if(key==='r'){
          const end={x:p.x+Math.cos(a)*620,y:p.y+Math.sin(a)*620};for(let i=0;i<8;i++)this.castQueue.push({type:'eruption',delay:i*.1,x:p.x+Math.cos(a)*i*78,y:p.y+Math.sin(a)*i*78,r:85,power:power*2.5,element:'fire'});
          for(const f of this.mythicFields.filter(f=>f.kind==='lantern')){this.lineHit(f,end,30,power*3,'fire',false);f.life=Math.max(f.life,6)}this.effect('mythic-ember',p.x,p.y,'#ffc46e',620,1,{angle:a,tx:end.x,ty:end.y});p.invulnerable=Math.max(.75,p.invulnerable);
        }
      }
      if(id==='linh'){
        if(key==='q'){const end={x:p.x+Math.cos(a)*760,y:p.y+Math.sin(a)*760};for(const e of this.world.enemies.filter(e=>e.alive&&e.trucMark>0&&segment(e,p,end)<25+e.r)){const other=this.world.enemies.filter(x=>x.alive&&x.id!==e.id&&dist(x,e)<290).sort((x,y)=>dist(x,e)-dist(y,e))[0];if(other)this.lineHit(e,other,16,power*2,'nature',true);e.trucMark=0}this.lineHit(p,end,19,power*4.5,'wind',true)}
        if(key==='e'){this.moveEntity(p,-Math.cos(a)*125,-Math.sin(a)*125);p.invulnerable=Math.max(.35,p.invulnerable);this.addField('trap',origin.x,origin.y,{r:115,life:8,power:power*2.4,element:'nature'});this.effect('dashwake',origin.x,origin.y,this.hero.color,100,.4,{angle:a+Math.PI})}
        if(key==='r'){for(let i=0;i<6+this.skillRanks.r;i++)this.castQueue.push({type:'arrow-rain',delay:i*.19,power:power*2.6,target:{...t}});p.invulnerable=Math.max(.9,p.invulnerable);this.effect('mythic-orbit',p.x,p.y,'#b9f1a2',140,1,{angle:a})}
      }
      if(id==='kiet'){
        if(key==='q'){const full=s.thunder>=5;if(full){s.thunder=0;this.moveEntity(p,Math.cos(a)*210,Math.sin(a)*210);p.mp=Math.min(p.maxMp,p.mp+12);p.shield=Math.min(110,p.shield+20+10*this.skillRanks.passive)}this.lineHit(origin,{x:p.x+Math.cos(a)*255,y:p.y+Math.sin(a)*255},full?42:25,power*(full?5:3.7),'lightning',true);if(full){this.areaDamage(p.x,p.y,110,power*2,160,true);this.effect('bolt',p.x,p.y,'#c3cdff',85,.6)}this.reactEnvironment?.('earth',p.x,p.y,135);this.effect('mythic-spear',origin.x,origin.y,'#c6d2ff',full?440:260,.5,{angle:a})}
        if(key==='e'){this.addField('wall',p.x+Math.cos(a)*65,p.y+Math.sin(a)*65,{angle:a+Math.PI/2,r:130,life:5+this.skillRanks.e*.4,power:power*.7,element:'lightning'});p.shield=Math.min(110,p.shield+24)}
        if(key==='r'){this.addField('cage',t.x,t.y,{r:180,life:6+this.skillRanks.r*.6,power:power*1.05,element:'lightning'});this.effect('mythic-rune',t.x,t.y,'#bfc9ff',180,1.1,{angle:a});p.shield=Math.min(110,p.shield+35);p.invulnerable=Math.max(.8,p.invulnerable)}
      }
      if(id==='hoavi'){
        if(key==='q'){
          const start=c.origin||origin,end={x:start.x+Math.cos(a)*650,y:start.y+Math.sin(a)*650};
          const hit=this.lineHit(start,end,22,power*3.5,'light',true,{hero:'hoavi',key:'q'});for(const e of this.world.enemies)if(e.alive&&segment(e,start,hit)<24+e.r)e.codeFault=5;
          if(p.code>=4){p.code-=4;this.castQueue.push({type:'code-echo',delay:.35,x:start.x,y:start.y,tx:end.x,ty:end.y,power:power*(1.7+.15*this.skillRanks.passive)});if(!this.effects.some(e=>e.type==='choreo-code-wait'))this.effect('choreo-code-wait',start.x,start.y,'#1fc8db',64,.35,{hero:'hoavi',angle:a})}this.reactEnvironment?.('lightning',hit.x,hit.y,120);
        }
        if(key==='e'){this.checkpoint={x:p.x,y:p.y,life:5};p.shield=Math.min(90,p.shield+20);this.effect('mythic-rune',p.x,p.y,'#7fffea',80,5,{key:'checkpoint'})}
        if(key==='r'){this.addField('satellites',p.x,p.y,{life:8+this.skillRanks.r*.7,power:power*.85,r:170,element:'light',follow:true});p.overclock=8;p.code=8;this.effect('overclock',p.x,p.y,'#79fbe5',260,1.1);p.invulnerable=Math.max(.75,p.invulnerable)}
      }
    }
    registerHarmony(id){const s=this.passiveState,p=this.player;if(!s.forms.includes(id))s.forms.push(id);s.formTime=12;if(s.forms.length>=3){s.forms=[];p.mp=Math.min(p.maxMp,p.mp+18+this.skillRanks.passive*5);p.shield=Math.min(110,p.shield+20+5*this.skillRanks.passive);this.emit('toast',{text:'Hòa Âm Tam Linh · hoàn linh lực và tạo khiên',reward:true})}}
    castElement(id,key,origin,scale=1,charge=false,target){
      super.castElement(id,key,origin,scale,charge,target);
      const t=target||origin;this.reactEnvironment?.(id,t.x,t.y,key==='r'?220:130);
    }
    onBulletHit(b,e){
      const wasBurning=e.burn>0;super.onBulletHit(b,e);const p=this.player,s=this.passiveState;if(this.isElemental&&b.sourceSkill&&b.charge!==false&&!b.ally)this.registerHarmony(b.element);if(!b.signature||b.ally||b.charge===false)return;
      s.lastHit=this.time;
      if(this.hero.id==='an'){if(wasBurning)s.embers=Math.min(6,s.embers+1+(this.skillRanks.passive>=2&&s.attackCount%3===0?1:0));e.burn=3;e.burnTick=0}
      if(b.sourceSkill==='wind-mark'){e.rooted=e.sagaBoss||e.type==='boss'?.3:1.4;e.trucMark=5+this.skillRanks.passive}
      if(this.isElemental&&b.element){const prior=e.markElement;if(prior&&prior!==b.element&&this.time-(e.markTime||0)<6)this.mythicHit(e,p.damage*.3,b.element,false);else{e.markElement=b.element;e.markTime=this.time}}
    }
    damageEnemy(e,amount,charge=true){
      if(!e?.alive||!Number.isFinite(amount)||amount<=0)return;const before=e.alive,controlled=e.rooted>0||e.frozen>0||e.slow>0;super.damageEnemy(e,amount,charge);
      if(before&&!e.alive&&this.skillRanks){const p=this.player;if(p.relics.ankh&&controlled)p.hp=Math.min(p.maxHp,p.hp+4);if(p.relics.antiem){this.relicCounters.antiem=(this.relicCounters.antiem||0)+1;if(this.relicCounters.antiem>=8){this.relicCounters.antiem=0;p.hp=Math.min(p.maxHp,p.hp+18);p.mp=Math.min(p.maxMp,p.mp+12);this.effect('ring',p.x,p.y,'#b0e28f',65,.6)}}}
    }
    damagePlayer(amount){
      const p=this.player;if(!this.skillRanks)return super.damagePlayer(amount);const hp=p.hp,shield=p.shield,eligible=!this.dead&&p.invulnerable<=0;
      if(p.stoneGuard&&eligible){amount*=.82;p.stoneGuard=false;this.relicCooldowns.sontinh=6;this.areaDamage(p.x,p.y,100,p.damage*.5,180,false)}
      if(eligible&&p.relics.cuoi&&!this.usedRelics.cuoi&&amount*(1-p.armor)>=p.hp+p.shield){this.usedRelics.cuoi=true;p.hp=Math.max(p.hp,p.maxHp*.35);p.invulnerable=2;this.effect('mythic-rune',p.x,p.y,'#b8e99e',100,1);this.emit('toast',{text:'Lá Đa Chú Cuội giữ lại ngọn đèn! Đã dùng lần hồi sinh của hành trình.',reward:true});return}
      super.damagePlayer(amount);
      if(p.hp<hp||p.shield<shield){this.passiveState.wind=Math.max(0,this.passiveState.wind-2);if(this.hero.id==='kiet')this.passiveState.thunder=Math.min(5,this.passiveState.thunder+1);if(p.relics.kimquy&&this.readyRelic('kimquy',12)){p.shield=Math.min(110,p.shield+28);const e=this.world.enemies.filter(e=>e.alive&&dist(e,p)<330).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(e){this.damageEnemy(e,p.damage*1.8,false);this.effect('lightning',p.x,p.y,'#eddb98',0,.3,{tx:e.x,ty:e.y})}}}
      if(this.dead)this.cancelActions();
    }
    heal(){const ok=super.heal();if(ok&&this.player.relics.traucau){this.player.shield=Math.min(110,this.player.shield+25);this.player.mp=Math.min(this.player.maxMp,this.player.mp+15)}return ok}
    dash(){
      const ok=super.dash();if(!ok)return false;const p=this.player;
      if(this.hero.id==='kiet')this.passiveState.thunder=Math.min(5,this.passiveState.thunder+1);
      if(p.relics.tam&&this.readyRelic('tam',5)){this.addField('decoy',p.x,p.y,{life:1.8,r:210,power:0});p.swiftTime=2}
      if(p.relics.ariadne&&p.hp<p.maxHp*.3&&this.readyRelic('ariadne',12))p.invulnerable+=.35;
      return true;
    }
    updateProjectiles(dt){
      const p=this.player;
      for(const b of this.projectiles){b.age=(b.age||0)+dt;if(b.returning&&b.age>.35){const owner=b.owner&&b.owner!=='player'?this.elementClones.find(c=>c.id===b.owner&&c.alive):p;if(!owner){b.life=0;continue}const a=Math.atan2(owner.y-b.y,owner.x-b.x);b.vx=Math.cos(a)*760;b.vy=Math.sin(a)*760;b.angle=a;if(dist(b,owner)<28)b.life=0}
        if(b.friendly)continue;
        if(p.relics.cinderella&&p.dashTime>0&&!b.dodgeCounted&&dist(b,p)<p.r+b.r+20){b.dodgeCounted=true;this.relicCounters.cinderella=Math.min(3,(this.relicCounters.cinderella||0)+1);this.effect('mythic-orbit',p.x,p.y,'#cdefff',34,.3)}
        for(const f of this.mythicFields){
          if(!['wall','mirror','vortex'].includes(f.kind))continue;const a={x:f.x-Math.cos(f.angle)*f.r,y:f.y-Math.sin(f.angle)*f.r},z={x:f.x+Math.cos(f.angle)*f.r,y:f.y+Math.sin(f.angle)*f.r};
          if((f.kind==='vortex'?dist(b,f)<f.r:segment(b,a,z)<16+b.r)){
            if(f.kind==='mirror'){b.friendly=true;b.vx*=-1;b.vy*=-1;b.angle=Math.atan2(b.vy,b.vx);b.charge=false;b.color='#ccefff';b.element=f.element;b.signature=false}else b.life=0;
            if(this.hero.id==='kiet'){this.passiveState.thunder=Math.min(5,this.passiveState.thunder+1);p.shield=Math.min(110,p.shield+2+this.skillRanks.passive)}break;
          }
        }
      }
      this.projectiles=this.projectiles.filter(b=>b.life>0);super.updateProjectiles(dt);
    }
    updateEnemies(dt){const held=[];for(const e of this.world.enemies)if(e.alive&&e.rooted>0){held.push([e,e.speed]);e.rootHeld=true;e.speed=0;e.rooted=Math.max(0,e.rooted-dt)}try{super.updateEnemies(dt)}finally{for(const [e,s] of held){e.speed=s;e.rootHeld=false}}for(const e of this.world.enemies){if(e.trucMark>0)e.trucMark-=dt;if(e.codeFault>0)e.codeFault-=dt}}
    reactEnvironment(element,x,y,r=150){
      let count=0;
      for(const f of this.mythicFields){if(f.kind!=='water'||f.life<=0||f.reacted||Math.hypot(f.x-x,f.y-y)>f.r+r)continue;
        if(!['fire','ice','lightning'].includes(element))continue;f.reacted=true;count++;
        for(const e of this.world.enemies)if(e.alive&&dist(e,f)<f.r+e.r){this.mythicHit(e,this.player.damage*(element==='fire'?1.7:element==='lightning'?1.3:.8),element,false);if(element==='ice')e.frozen=e.sagaBoss||e.type==='boss'?.25:1.7}
        if(element==='fire'){f.life=.4;this.effect('element-impact',f.x,f.y,'#d8e5e0',f.r,.8,{element:'wind'})}
        if(element==='ice'){f.element='ice';this.effect('element-impact',f.x,f.y,'#a6e8ff',f.r,.8,{element:'ice'})}
        if(element==='lightning'){this.effect('lightning',f.x-f.r*.7,f.y,'#c4c9ff',0,.6,{tx:f.x+f.r*.7,ty:f.y});f.life=Math.min(f.life,2)}
      }return count;
    }
    updateFields(dt){
      const p=this.player,lamps=this.mythicFields.filter(f=>f.kind==='lantern'&&f.life>0);
      for(const f of this.mythicFields){f.life-=dt;f.tick-=dt;if(f.combat){this.updateCombatField(f,dt,true);continue}if(f.follow){f.x=p.x;f.y=p.y}if(f.kind==='tornado'){f.x+=Math.cos(f.angle)*110*dt;f.y+=Math.sin(f.angle)*110*dt}
        if(f.kind==='lantern'&&dist(p,f)<95)p.hp=Math.min(p.maxHp,p.hp+dt*(1.5+this.skillRanks.passive*.5));
        if(f.kind==='garden'&&dist(p,f)<f.r)p.hp=Math.min(p.maxHp,p.hp+dt*4);
        if(f.kind==='decoy')for(const e of this.world.enemies)if(e.alive&&!e.sagaBoss&&e.type!=='boss'&&dist(e,f)<f.r){const a=Math.atan2(f.y-e.y,f.x-e.x);this.moveEntity(e,Math.cos(a)*e.speed*dt*.9,Math.sin(a)*e.speed*dt*.9);e.cool=Math.max(.3,e.cool)}
        if(f.tick>0)continue;f.tick=.45;
        if(f.kind==='lantern'){for(const other of lamps)if(other.id!==f.id&&other.id>f.id)this.lineHit(f,other,17,f.power,'fire',false);for(const e of this.world.enemies)if(e.alive&&dist(e,f)<55)this.mythicHit(e,f.power,'fire',false)}
        else if(f.kind==='trap'){const targets=this.world.enemies.filter(e=>e.alive&&dist(e,f)<f.r);if(targets.length){for(const e of targets){this.mythicHit(e,f.power,'nature',true);e.trucMark=6+this.skillRanks.passive;e.rooted=e.sagaBoss||e.type==='boss'?.45:2}f.life=0;this.effect('leaves',f.x,f.y,'#b5e79d',f.r,.7)}}
        else if(f.kind==='cage'){const points=[{x:f.x-f.r,y:f.y-f.r},{x:f.x+f.r,y:f.y-f.r},{x:f.x+f.r,y:f.y+f.r},{x:f.x-f.r,y:f.y+f.r}];for(let i=0;i<4;i++)this.lineHit(points[i],points[(i+1)%4],22,f.power,'lightning',false)}
        else if(f.kind==='satellites'){const targets=this.world.enemies.filter(e=>e.alive&&dist(e,p)<650).sort((a,b)=>(b.codeFault>0)-(a.codeFault>0)||b.hp-a.hp);f.pixelAim=[];for(const side of [-1,1]){const a=this.time*1.7+side*Math.PI/2,o={x:p.x+Math.cos(a)*100,y:p.y+Math.sin(a)*75};if(targets.length){const target=targets[side===1?0:Math.min(1,targets.length-1)],end=this.lineHit(o,target,12,f.power,'light',false,{hero:'hoavi',key:'satellite',side});f.pixelAim.push({side,x:o.x,y:o.y,tx:end.x,ty:end.y,targetId:target.id})}}}
        else if(['vine','garden','vortex','orbs','sigil','tornado'].includes(f.kind)){for(const e of this.world.enemies)if(e.alive&&dist(e,f)<f.r){this.mythicHit(e,f.power,f.element,false);if(['vortex','tornado'].includes(f.kind)){const a=Math.atan2(f.y-e.y,f.x-e.x);this.moveEntity(e,Math.cos(a)*20,Math.sin(a)*20)}}this.effect('element-pulse',f.x,f.y,root.DTElements.byId(f.element).color,f.r,.5,{element:f.element})}
        else if(f.kind==='water')for(const e of this.world.enemies)if(e.alive&&dist(e,f)<f.r)e.slow=1;
        this.effect('mythic-rune',f.x,f.y,f.element==='fire'?'#ffb06b':f.element==='water'?'#6fbccc':this.hero.color,f.r,.5,{kind:f.kind,angle:f.angle});
      }
      this.mythicFields=this.mythicFields.filter(f=>f.life>0);
    }
    updateCastQueue(dt){const due=[];for(const c of this.castQueue){c.delay-=dt;if(c.delay<=0)due.push(c)}this.castQueue=this.castQueue.filter(c=>c.delay>0);
      for(const c of due){if(this.dead)break;
        if(c.type==='cast')this.releaseCast(c);
        else if(c.type==='code-echo'){const end=this.lineHit(c,{x:c.tx,y:c.ty},23,c.power,'light',false,{hero:'hoavi',key:'q',echo:true});this.effects=this.effects.filter(e=>e.type!=='choreo-code-wait');this.effect('choreo-code-echo',c.x,c.y,'#1fc8db',650,.35,{hero:'hoavi',angle:Math.atan2(c.ty-c.y,c.tx-c.x),tx:end.x,ty:end.y})}
        else if(c.type==='echo'){const e=this.world.enemies.filter(e=>e.alive&&dist(e,c)<570).sort((a,b)=>dist(a,c)-dist(b,c))[0];if(e){this.shoot(c.x,c.y,Math.atan2(e.y-c.y,e.x-c.x),820,c.power,'#d8e8ff',{charge:false,echo:true});this.effect('afterimage',c.x,c.y,'#d8e8ff',35,.35,{hero:this.hero.id,facing:0})}}
        else if(c.type==='arrow-rain'||c.type==='thunder-hunt'){const e=this.world.enemies.filter(e=>e.alive&&dist(e,this.player)<800).sort((a,b)=>(b.trucMark>0)-(a.trucMark>0)||dist(a,c.target)-dist(b,c.target))[0],t=e||c.target;if(e)this.mythicHit(e,c.power,c.element||'nature',false);this.effect(c.type==='arrow-rain'?'mythic-spear':'bolt',t.x,t.y,c.type==='arrow-rain'?'#b5edaa':'#bec5ff',95,.5,{angle:Math.PI/2,tx:t.x,ty:t.y})}
        else if(c.type==='light-sweep')this.lineHit(c,{x:c.x+Math.cos(c.angle)*850,y:c.y+Math.sin(c.angle)*850},40,c.power,'light',false);
        else if(c.type==='ice-ring'){for(const e of this.world.enemies)if(e.alive&&Math.abs(dist(e,c)-c.r)<60)this.mythicHit(e,c.power,'ice',false);this.effect('element-impact',c.x,c.y,'#9ce0ff',c.r,.6,{element:'ice'});this.reactEnvironment?.('ice',c.x,c.y,c.r)}
        else if(c.type==='eruption'){for(const e of this.world.enemies)if(e.alive&&dist(e,c)<c.r+e.r)this.mythicHit(e,c.power,c.element,c.charge===true);this.effect('element-impact',c.x,c.y,root.DTElements.byId(c.element).color,c.r,.6,{element:c.element});this.reactEnvironment?.(c.element,c.x,c.y,c.r)}
      }
    }
    update(dt){
      if(this.paused||this.dead||!this.started)return;dt=clamp(dt,0,.04);if(!dt)return;const touch=root.DTTouch,p=this.player,x=p.x,y=p.y,t=this.time,dx=touch?.active?touch.move.x:this.input.dx,dy=touch?.active?touch.move.y:this.input.dy,speed=p.speed;
      const blend=1-Math.exp(-dt*42);this.motion.vx=dx*this.motion.vx<=0||!dx?dx:this.motion.vx+(dx-this.motion.vx)*blend;this.motion.vy=dy*this.motion.vy<=0||!dy?dy:this.motion.vy+(dy-this.motion.vy)*blend;if(Math.abs(this.motion.vx)<.002)this.motion.vx=0;if(Math.abs(this.motion.vy)<.002)this.motion.vy=0;this.input.dx=this.motion.vx;this.input.dy=this.motion.vy;
      if(p.swiftTime>0)p.speed*=p.relics.tam?1.2:1.12;if(p.ultIntro){p.speed*=.35;p.frostSlow=0;p.rooted=0;p.frozen=0;p.stunned=0}
      try{super.update(dt)}finally{this.input.dx=dx;this.input.dy=dy;p.speed=speed}if(t===this.time)return;
      if(p.action){p.action.elapsed+=dt;if(p.action.elapsed>=p.action.duration)p.action=null}
      for(const id in this.relicCooldowns)this.relicCooldowns[id]=Math.max(0,this.relicCooldowns[id]-dt);
      p.swiftTime=Math.max(0,(p.swiftTime||0)-dt);const moved=Math.hypot(p.x-x,p.y-y),s=this.passiveState;
      if(this.hero.id==='linh'){s.distance+=moved;const step=36-this.skillRanks.passive*5;while(s.distance>=step){s.distance-=step;s.wind=Math.min(8,s.wind+1)}}
      if(this.hero.id==='an'&&this.time-s.lastHit>6)s.embers=Math.max(0,s.embers-dt*.8);
      if(s.formTime>0){s.formTime-=dt;if(s.formTime<=0)s.forms=[]}
      if(p.relics.sontinh){p.stillTime=moved<.15?(p.stillTime||0)+dt:0;if(p.stillTime>.8&&!(this.relicCooldowns.sontinh>0))p.stoneGuard=true}
      if(this.checkpoint){this.checkpoint.life-=dt;if(this.checkpoint.life<=0)this.checkpoint=null}
      this.updateCastQueue(dt);this.updateFields(dt);this.updateUltIntro(dt);this.syncUltimate();this.weaponDrops=[];
    }
    transformElement(id){const ok=super.transformElement(id);if(ok&&this.signature){this.signature.color=this.element.color}return ok}
    updateTutorial(){const before=this.tutorial.step;super.updateTutorial();if(before<5&&this.tutorialDone){this.events=this.events.filter(e=>!(e.type==='toast'&&/TAB/.test(e.text)));this.emit('toast',{text:'Đã sẵn sàng! K học kỹ năng, I xem nội tại và cổ vật.'})}}
    grantRelic(id){if(C.relic(id)?.mythic&&this.player.relics[id]){this.player.gold+=35;this.emit('toast',{text:'Cổ vật đã sở hữu · nhận 35 xu thay thế',reward:true});return true}return super.grantRelic(id)}
    cancelActions(){this.elementSummons=[];this.elementActions=[];this.elementFields=[];this.player.ultIntro=null;this.player.hoverboard=0;for(const c of this.elementClones||[])c.action=null;this.castQueue=[];this.mythicFields=[];this.checkpoint=null;this.player.action=null;this.motion={vx:0,vy:0}}
    travelTo(id){const ok=super.travelTo(id);if(ok)this.cancelActions();return ok}
    respawn(){super.respawn();this.cancelActions();this.passiveState.embers=0;this.passiveState.thunder=0}
    serialize(){const data=super.serialize();data.ascensionVersion=5;data.ascension={ultimate:this.player.ultIntro?{elapsed:this.player.ultIntro.elapsed,angle:this.player.ultIntro.cast.angle,target:{...this.player.ultIntro.cast.target}}:null,points:this.skillPoints,ranks:{...this.skillRanks},usedRelics:{...this.usedRelics},relicCooldowns:{...this.relicCooldowns},relicCounters:{...this.relicCounters},interactedIds:[...this.interactedIds]};delete data.player.weapons;delete data.player.weaponSlot;delete data.player.action;delete data.player.ultIntro;data.expansion.weaponDrops=[];return data}
    static restore(data){const g=Base.restore(data);Object.setPrototypeOf(g,AscensionGame.prototype);g.initAscension(data.ascensionVersion===5?data.ascension:null);if(data.ascensionVersion!==5){g.skillPoints=3+Math.max(0,g.player.level-1)+(data.player?.weapons||[]).reduce((n,w)=>n+Math.max(0,(Number(w.level)||1)-1),0);g.emit('toast',{text:'Bản lưu 0.5: trang bị cũ đổi thành '+g.skillPoints+' điểm kỹ năng. K để phát triển bảo khí riêng.',reward:true})}return g}
  }
  root.DTAscension={segment,Game:AscensionGame};root.DTGame=AscensionGame;
})(globalThis);
