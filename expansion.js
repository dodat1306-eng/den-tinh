(function(root){
  'use strict';
  const Base=root.DTGame,D=root.DTWorld,C=root.DTContent,TAU=Math.PI*2;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const initial={an:'lantern',linh:'bamboo',kiet:'thunder',hoavi:'terminal'};
  const tutorial=[['Bước chân đầu tiên','Di chuyển bằng WASD hoặc cần điều khiển bên trái.'],['Thắp một tia lửa','Giữ chuột trái hoặc cần ngắm bên phải để bắn.'],['Lướt qua màn sương','Nhấn SPACE hoặc nút Lướt để né.'],['Thử sức mạnh riêng','Dùng Q hoặc E. HoaVi có thể dựng Firewall.'],['Món quà lên đường','Đến chiếc rương bên phải và nhấn F để mở.']];
  class ExpandedGame extends Base {
    constructor(hero='an',seed){
      super(hero,seed===undefined?Math.floor(Math.random()*2000000000):seed);
      this.initExpansion();
    }
    initExpansion(){
      const p=this.player;
      p.weapons=[this.weaponState(initial[this.hero.id]||'lantern'),this.weaponState(this.hero.id==='hoavi'?'firewall':'lotus')];
      p.weaponSlot=0;p.relics={};p.code=0;p.shield=0;p.overclock=0;p.firewall=0;p.droneCd=0;p.motion=0;
      p.armor=this.hero.id==='kiet'?.08:0;
      this.challenge={};this.weaponDrops=[];this.memories=[];this.achievements=[];this.tutorial={step:0,moved:0,shots:0,dashes:0,skills:0,chest:false};
      this.run=Number(root.DTRunOptions?.cycle)||0;this.challengeSerial=0;this.pendingHitStop=0;this.hitStop=0;this.droppedWeapons=0;
      this.world.chests.forEach((c,i)=>{c.weaponId=C.weapons[(i+Math.abs(this.world.seed))%C.weapons.length].id});
      for(const s of this.world.shrines){
        s.challengeType=s.id==='truc'?'hunt':s.id==='sen'?'defend':'forge';
        this.challenge[s.id]={started:false,complete:false,timer:0,hp:100,wave:0,ids:[]};
        for(const id of s.guardians){const e=this.world.enemies.find(e=>e.id===id);e.alive=false}
        if(s.id==='truc'){
          const e=this.world.enemies.find(e=>e.id===s.guardians[0]);Object.assign(e,{alive:true,type:'boar',name:'Trúc Vệ · Kẻ Canh Gió',r:29,hp:780+this.run*190,maxHp:780+this.run*190,damage:16,speed:116,miniBoss:true});
          s.guardians=[e.id];
        }
      }
      for(const e of this.world.enemies){if(!e.guard){e.hp*=1+this.run*.22;e.maxHp=e.hp;e.damage*=1+this.run*.12}}
    }
    weaponState(id){const w=C.weapon(id);return{id:w.id,level:1,ammo:w.clip,reload:0}}
    get weapon(){return C.weapon(this.player.weapons[this.player.weaponSlot].id)}
    get weaponStateActive(){return this.player.weapons[this.player.weaponSlot]}
    switchWeapon(){if(this.paused||this.dead)return false;this.player.weaponSlot=1-this.player.weaponSlot;this.player.cd.fire=Math.max(.13,this.player.cd.fire);this.emit('sound',{name:'switch'});return true}
    reloadWeapon(){const s=this.weaponStateActive,w=this.weapon;if(s.reload>0||s.ammo>=w.clip)return false;s.reload=w.reload*(this.player.relics.cooling?.8:1);this.emit('sound',{name:'reload'});return true}
    fire(){
      const p=this.player,s=this.weaponStateActive,w=this.weapon;
      if(p.cd.fire>0||p.dashTime>0||s.reload>0)return false;
      if(s.ammo<=0){this.reloadWeapon();return false}
      const haste=(p.overclock>0?.55:1)*(this.hero.id==='linh'&&p.moving?.88:1);
      p.cd.fire=w.interval*(p.fireRate/this.hero.fireRate)*haste;
      const count=w.shots+(p.relics.split?1:0),damage=p.damage*w.power*(1+(s.level-1)*.18)*(p.relics.split?.85:1);
      for(let i=0;i<count;i++){
        const a=p.facing+(i-(count-1)/2)*(w.kind==='shotgun'?.14:.105);
        this.shoot(p.x,p.y,a,w.speed,damage,w.color,{r:w.kind==='blade'?10:5,life:w.kind==='shotgun'?.65:1.25,pierce:w.pierce+(p.relics.pierce?2:0),kind:w.kind==='bow'?'arrow':w.kind==='code'?'code':w.kind==='blade'?'blade':'orb',weaponEffect:w.effect});
      }
      s.ammo--;this.tutorial.shots++;p.recoil=.1;this.spark(p.x+Math.cos(p.facing)*24,p.y+Math.sin(p.facing)*24,5,w.color,100,.13);
      this.emit('sound',{name:w.kind==='code'?'codeShot':w.kind==='shotgun'?'shotgun':'shoot'});return true;
    }
    shoot(x,y,a,speed,damage,color,opts={}){super.shoot(x,y,a,speed,damage,color,opts);const b=this.projectiles[this.projectiles.length-1];if(b){b.weaponEffect=opts.weaponEffect;b.skill=opts.skill;b.kind=opts.kind||b.kind}}
    dash(){
      const p=this.player,x=p.x,y=p.y,ok=super.dash();if(!ok)return false;this.tutorial.dashes++;
      if(p.relics.dashshock||this.hero.id==='kiet'){this.areaDamage(x,y,135,p.damage*2,100);this.effect('circuit',x,y,'#94cfff',140,.55)}
      return true;
    }
    skill(key){
      const p=this.player;
      if(this.hero.id!=='hoavi'){
        const ok=super.skill(key);if(ok){this.tutorial.skills++;if(p.relics.cooling&&key!=='r')p.cd[key]*=.8}return ok;
      }
      if(this.paused||this.dead||!['q','e','r'].includes(key))return false;
      if(key==='r'&&p.ult<100){this.emit('toast',{text:'Overclock cần đủ 100% năng lượng.'});return false}
      const cost=key==='q'?24:key==='e'?38:0;
      if(key!=='r'&&(p.mp<cost||p.cd[key]>0))return false;
      this.tutorial.skills++;p.mp-=cost;this.emit('sound',{name:key==='r'?'overclock':'skill'});
      if(key==='q'){
        const stacks=p.code;p.code=0;p.cd.q=this.hero.qCd*(p.relics.cooling?.8:1)*Math.max(.45,1-stacks*.05);
        for(let i=-2;i<=2;i++)this.shoot(p.x,p.y,p.facing+i*.12,960,p.damage*(1.8+stacks*.18),'#78f6e3',{kind:'code',pierce:5,r:8,life:1.1,skill:true});
        this.effect('circuit',p.x,p.y,'#6fffe6',165,.6);this.shake=3;
      }else if(key==='e'){
        p.cd.e=this.hero.eCd*(p.relics.cooling?.8:1);p.firewall=4;p.shield=Math.min(65,p.shield+32);p.hp=Math.min(p.maxHp,p.hp+18);
        this.activeEffects.push({type:'firewall',x:p.x,y:p.y,r:152,life:4,tick:0,damage:p.damage*.65,color:'#f4a0e8',follow:true});
        this.effect('circuit',p.x,p.y,'#f6a4ed',165,.8);
      }else{
        p.ult=0;p.overclock=7;p.invulnerable=Math.max(1.2,p.invulnerable);p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.14);p.code=8;p.droneCd=0;
        this.clearBullets(p.x,p.y,620);this.effect('overclock',p.x,p.y,'#77ffed',360,1.4);this.shake=7;
      }
      return true;
    }
    damagePlayer(amount){
      const p=this.player;if(amount<=0)return;
      if(D.zoneAt(p.x,p.y).id==='village')return;
      if(!this.dead&&p.invulnerable<=0&&p.shield>0){const absorb=Math.min(p.shield,amount);p.shield-=absorb;amount-=absorb;this.effect('circuit',p.x,p.y,'#c4b2ff',40,.25);if(amount<=0){p.invulnerable=.25;return}}
      super.damagePlayer(amount);
    }
    damageEnemy(e,amount,charge=true){
      if(!e.alive)return;
      if(e.type==='boss'&&this.world.enemies.some(x=>x.root&&x.alive))amount*=.25;
      const alive=e.alive;super.damageEnemy(e,amount,charge);
      if(charge&&this.hero.id==='hoavi')this.player.code=Math.min(8,this.player.code+1);
      if(alive&&!e.alive){
        const p=this.player;if(p.relics.vampire)p.hp=Math.min(p.maxHp,p.hp+3);
        if(e.burn>0&&p.relics.wildfire){for(const other of this.world.enemies)if(other.alive&&dist(other,e)<150){other.burn=2.5;other.burnTick=0}this.effect('ring',e.x,e.y,'#ffa565',150,.45)}
        if(e.miniBoss){this.dropWeapon(e.x,e.y,'jade');this.unlock('truc-hunter','Đánh bại Trúc Vệ')}
        if(!e.summon&&!e.challenge&&this.kills%14===0)this.dropWeapon(e.x,e.y,C.weapons[4+Math.floor(this.rng()*7)].id);
        if(this.kills>=30)this.unlock('hunter-30','Ba mươi ký ức được giải phóng');
      }
      if(!root.DTSettings?.reducedMotion&&amount>35)this.pendingHitStop=Math.max(this.pendingHitStop,.025);
    }
    onBulletHit(b,e){
      const p=this.player,effect=b.weaponEffect;
      if(effect==='burn'||p.relics.wildfire||this.hero.id==='an'){e.burn=2.3;e.burnTick=0}
      if(effect==='shock'){e.slow=Math.max(e.slow,.7)}
      if((effect==='chain'||p.relics.chain)&&this.rng()<.25){
        const targets=this.world.enemies.filter(x=>x.alive&&x.id!==e.id&&dist(x,e)<180).slice(0,2);
        for(const x of targets){this.damageEnemy(x,b.damage*.45,b.charge!==false);this.effect('lightning',e.x,e.y,'#c4c0ff',0,.3,{tx:x.x,ty:x.y})}
      }
      if(effect==='explode'){for(const x of this.world.enemies)if(x.alive&&x.id!==e.id&&dist(x,e)<95)this.damageEnemy(x,b.damage*.55,b.charge!==false);this.effect('circuit',e.x,e.y,b.color,95,.4)}
      if(effect==='heal'&&!e.alive&&this.rng()<.2)p.hp=Math.min(p.maxHp,p.hp+5);
    }
    updateProjectiles(dt){
      const p=this.player;
      for(let i=this.projectiles.length-1;i>=0;i--){
        const b=this.projectiles[i];if(!b)continue;b.life-=dt;
        const steps=Math.max(1,Math.ceil(Math.hypot(b.vx*dt,b.vy*dt)/10));
        for(let s=0;s<steps&&b.life>0;s++){
          b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps;
          if(this.world.collision(b.x,b.y,2)){b.life=0;break}
          if(b.friendly){
            for(const e of this.world.enemies)if(e.alive&&!b.hitIds.includes(e.id)&&dist(e,b)<e.r+b.r){this.damageEnemy(e,b.damage,b.charge!==false);this.onBulletHit(b,e);b.hitIds.push(e.id);if(b.pierce>0)b.pierce--;else{b.life=0;break}}
          }else if(dist(b,p)<p.r+b.r){const before=p.hp+(p.shield||0);this.damagePlayer(b.damage);this.onHostileBulletHit?.(b,p.hp+(p.shield||0)<before);b.life=0}
          if(!b.friendly&&p.firewall>0&&dist(b,p)<155){b.life=0;this.spark(b.x,b.y,5,'#f0a4eb',80,.25)}
        }
        b.trail+=dt;if(b.trail>.04&&this.particles.length<580){b.trail=0;this.particles.push({x:b.x,y:b.y-18,color:b.color,size:b.friendly?3:3.5,life:.18,maxLife:.18})}
        if(b.life<=0){const idx=this.projectiles.indexOf(b);if(idx>=0)this.projectiles.splice(idx,1)}
      }
    }
    update(dt){
      if(this.paused||this.dead||!this.started)return;
      const p=this.player;
      if(root.DTTouch?.active){const t=root.DTTouch;if(!this.skillRanks&&(t.move.x||t.move.y)){this.input.dx=t.move.x;this.input.dy=t.move.y}if(t.aim.fire){this.input.fire=true;this.input.aimX=p.x+t.aim.x*450;this.input.aimY=p.y+t.aim.y*450}}
      if(this.hitStop>0){this.hitStop-=dt;return}this.hitStop=this.pendingHitStop;this.pendingHitStop=0;
      for(const s of p.weapons||[])if(s.reload>0){s.reload-=dt;if(s.reload<=0){s.reload=0;s.ammo=C.weapon(s.id).clip}}
      p.overclock=Math.max(0,p.overclock-dt);p.firewall=Math.max(0,p.firewall-dt);p.recoil=Math.max(0,(p.recoil||0)-dt);
      p.motion=this.input.dx||this.input.dy?p.motion+dt:0;
      const oldX=p.x,oldY=p.y;super.update(dt);this.tutorial.moved+=Math.hypot(p.x-oldX,p.y-oldY);
      if(p.overclock>0&&!this.skillRanks){p.droneCd-=dt;if(p.droneCd<=0){p.droneCd=.35;const e=this.world.enemies.filter(e=>e.alive&&dist(e,p)<600).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(e){for(const side of[-1,1]){const x=p.x+Math.cos(this.time*3+side)*52,y=p.y+Math.sin(this.time*3+side)*34;this.shoot(x,y,Math.atan2(e.y-y,e.x-x),880,p.damage*1.2,'#7affe5',{kind:'code',pierce:1,charge:false})}}}}
      for(const e of this.world.enemies)if(e.alive&&e.burn>0){e.burn-=dt;e.burnTick=(e.burnTick||0)-dt;if(e.burnTick<=0){e.burnTick=.5;this.damageEnemy(e,p.damage*.23,false);this.spark(e.x,e.y,3,'#ffaf6b',40,.35)}}
      this.updateChallenges(dt);this.updateTutorial();this.updateCompanion(dt);
      if(root.DTSettings?.reducedMotion)this.shake=0;
    }
    get tutorialDone(){return this.tutorial.step>=tutorial.length}
    updateTutorial(){const t=this.tutorial,conditions=[t.moved>110,t.shots>=4,t.dashes>0,t.skills>0,t.chest];if(t.step<tutorial.length&&conditions[t.step]){t.step++;this.emit('sound',{name:'pickup'});if(this.tutorialDone){this.unlock('first-light','Người giữ lửa đầu tiên');this.emit('toast',{text:'Đã sẵn sàng! TAB đổi vũ khí, V nạp lại, I xem di vật.'})}}}
    skipTutorial(){this.tutorial.step=tutorial.length}
    updateCompanion(dt){
      const p=this.player,r=p.relics.dom?320:185;
      for(const l of this.loot)if(dist(l,p)<r){const a=Math.atan2(p.y-l.y,p.x-l.x);l.x+=Math.cos(a)*260*dt;l.y+=Math.sin(a)*260*dt}
      if(p.relics.dom)p.hp=Math.min(p.maxHp,p.hp+dt);
      this.domTarget=this.weaponDrops.find(d=>dist(d,p)<520)||this.world.chests.find(c=>!c.open&&dist(c,p)<420)||C.lore.find(l=>!this.memories.includes(l.id)&&dist(l,p)<450);
    }
    updateEnemies(dt){
      // The village is a safe place to learn controls and use the forge.
      if(D.zoneAt(this.player.x,this.player.y).id==='village'){
        for(const e of this.world.enemies)if(e.alive&&dist(e,this.player)<650){const a=Math.atan2(e.homeY-e.y,e.homeX-e.x);if(dist(e,{x:e.homeX,y:e.homeY})>20)this.moveEntity(e,Math.cos(a)*e.speed*dt,Math.sin(a)*e.speed*dt)}return;
      }
      super.updateEnemies(dt);
      for(const e of this.world.enemies)if(e.alive&&e.miniBoss&&dist(e,this.player)<600){e.extraCd=(e.extraCd||2)-dt;if(e.extraCd<=0){e.extraCd=e.hp<e.maxHp*.5?2.3:3.3;const a=Math.atan2(this.player.y-e.y,this.player.x-e.x);for(let i=-2;i<=2;i++)this.shoot(e.x,e.y,a+i*.23,250,13,'#ffc18e',{friendly:false,life:2.1});this.effect('warning',e.x,e.y,'#ffb575',45,.65)}}
    }
    updateBoss(e,dt){
      super.updateBoss(e,dt);
      if(!e.rootPhase&&e.hp<e.maxHp*.65){
        e.rootPhase=true;for(let i=0;i<3;i++){const a=i/3*TAU;const x=e.homeX+Math.cos(a)*150,y=e.homeY+Math.sin(a)*140;this.spawnEnemy('core',x,y,{root:true,hp:115+this.run*25,maxHp:115+this.run*25,r:20,speed:0,damage:0,color:'#ed99c9'})}
        this.emit('toast',{text:'Rễ Ký Ức bảo vệ Mộc Quỷ! Phá ba rễ hồng để gỡ khiên.'});this.effect('overclock',e.x,e.y,'#f7a4cb',220,1);
      }
      if(e.hp<e.maxHp*.3){e.phase=3;e.novaCd=(e.novaCd??0)-dt;if(e.novaCd<=0){e.novaCd=3;for(let j=0;j<5;j++){const a=j/5*TAU+this.time*.4;this.telegraphs.push({x:e.x+Math.cos(a)*180,y:e.y+Math.sin(a)*155,r:58,timer:1.2,maxTimer:1.2,damage:23,color:'#ff8d8e'})}}}
    }
    spawnEnemy(type,x,y,extra={}){
      const e={id:'v2-'+(++this.challengeSerial),type,x,y,homeX:x,homeY:y,r:15,hp:60,maxHp:60,speed:90,damage:9,xp:0,gold:0,alive:true,cool:2,phase:0,timer:0,hit:0,slow:0,knockX:0,knockY:0,summon:true,...extra};
      if(this.world.collision(x,y,e.r)){for(let i=0;i<16;i++){const a=i/16*TAU,nx=x+Math.cos(a)*65,ny=y+Math.sin(a)*65;if(!this.world.collision(nx,ny,e.r)){e.x=e.homeX=nx;e.y=e.homeY=ny;break}}}
      this.world.enemies.push(e);return e;
    }
    updateChallenges(dt){
      for(const s of this.world.shrines){const state=this.challenge[s.id];if(!state.started||state.complete||s.active)continue;
        if(s.id==='sen'){
          state.timer+=dt;state.nextWave=(state.nextWave||0)-dt;
          if(state.nextWave<=0&&state.timer<33){state.nextWave=8;state.wave++;for(let j=0;j<4;j++){const a=j/4*TAU+state.wave;const e=this.spawnEnemy(j%2?'slime':'shade',s.x+Math.cos(a)*270,s.y+Math.sin(a)*240,{challenge:'sen',speed:75,hp:55,maxHp:55});state.ids.push(e.id)}}
          for(const e of this.world.enemies)if(e.alive&&e.challenge==='sen'){
            const a=Math.atan2(s.y-e.y,s.x-e.x);this.moveEntity(e,Math.cos(a)*e.speed*dt*.8,Math.sin(a)*e.speed*dt*.8);
            if(dist(e,s)<68)state.hp-=dt*9;
          }
          if(state.hp<=0){state.started=false;state.timer=0;state.hp=100;this.clearChallengeEnemies(state);this.emit('toast',{text:'Đèn Sen tắt. Nhấn F cạnh ấn để thử lại.'})}
          else if(state.timer>=36){state.complete=true;this.clearChallengeEnemies(state);this.emit('toast',{text:'Đã bảo vệ Đèn Sen! Nhấn F để nhận ấn.',reward:true})}
        }
        if(s.id==='tro'){
          state.timer+=dt;state.nextHeat=(state.nextHeat||1)-dt;
          if(state.nextHeat<=0){state.nextHeat=2.5;const a=state.timer*1.4;for(let j=0;j<3;j++)this.telegraphs.push({x:s.x+Math.cos(a+j*TAU/3)*135,y:s.y+Math.sin(a+j*TAU/3)*125,r:50,timer:1.1,maxTimer:1.1,damage:18,color:'#ffb16b'})}
          if(state.ids.every(id=>!this.world.enemies.some(e=>e.id===id&&e.alive))){state.complete=true;this.emit('toast',{text:'Ba lõi tro đã được thanh tẩy! Nhấn F nhận ấn.',reward:true})}
        }
      }
    }
    clearChallengeEnemies(state){for(const e of this.world.enemies)if(state.ids.includes(e.id))e.alive=false;state.ids=[]}
    startChallenge(s){
      const state=this.challenge[s.id];state.started=true;state.timer=0;state.hp=100;state.wave=0;state.nextWave=0;
      if(s.id==='tro'){state.ids=[];for(let i=0;i<3;i++){const a=i/3*TAU;const e=this.spawnEnemy('core',s.x+Math.cos(a)*145,s.y+Math.sin(a)*120,{challenge:'tro',hp:180,maxHp:180,r:22,speed:0,damage:0});state.ids.push(e.id)}}
      this.emit('toast',{text:s.id==='sen'?'Giữ Đèn Sen sáng trong 36 giây!':'Phá ba lõi tro và né vòng lửa!'});
      this.emit('sound',{name:'challenge'});return true;
    }
    nearby(){
      const base=super.nearby(),p=this.player;
      const drop=this.weaponDrops.filter(d=>dist(d,p)<80).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(drop&&!(base?.guardians&&!base.active&&dist(base,p)<65)&&(!base||dist(drop,p)<dist(base,p)-12))return{...drop,weaponDrop:true,label:'Nhặt '+C.weapon(drop.weaponId).name+' · thay ô '+(p.weaponSlot+1)};
      const lore=C.lore.find(l=>!this.memories.includes(l.id)&&dist(l,p)<75);if(lore)return{...lore,lore:true,label:'Đọc ký ức · '+lore.title};
      if(base?.guardians&&!base.active){const s=this.world.shrines.find(s=>s.id===base.id),state=this.challenge[s.id];if(s.id==='sen')base.label=state.complete?'Thức tỉnh Ấn Sen':state.started?'Đang bảo vệ Đèn Sen':'Bắt đầu bảo vệ Đèn Sen';if(s.id==='tro')base.label=state.complete?'Thức tỉnh Ấn Tro':state.started?'Phá ba lõi tro':'Bắt đầu lò rèn Tro'}
      return base;
    }
    interact(){
      if(this.paused||this.dead)return false;const o=this.nearby(),p=this.player;if(!o)return false;
      if(o.weaponDrop){const old=this.weaponStateActive;this.weaponDrops=this.weaponDrops.filter(d=>d.id!==o.id);p.weapons[p.weaponSlot]=this.weaponState(o.weaponId);this.dropWeapon(p.x+110,p.y,old.id,old.level);p.weapons[p.weaponSlot].level=o.level||1;this.emit('toast',{text:'Đã trang bị '+this.weapon.name,reward:true});this.unlock('arsenal','Thử một vũ khí mới');return true}
      if(o.lore){this.memories.push(o.id);this.grantRelic(o.reward);p.gold+=25;this.emit('toast',{text:o.title+': '+o.text,reward:true});this.unlock('memory','Một ký ức được gọi tên');return true}
      if(o.guardians&&!o.active){const s=this.world.shrines.find(s=>s.id===o.id),state=this.challenge[s.id];if(s.id!=='truc'&&!state.complete){if(!state.started)return this.startChallenge(s);return false}}
      const wasChest=this.world.chests.find(c=>c.id===o.id&&!c.open);const ok=super.interact();
      if(ok&&wasChest){this.tutorial.chest=true;this.dropWeapon(wasChest.x+35,wasChest.y,wasChest.weaponId);if(this.world.chests.filter(c=>c.open).length%3===0){const choices=this.talentChoices();this.grantRelic(choices[0].id)}}
      if(ok&&o.guardians){const state=this.challenge[o.id];state.complete=true;this.grantRelic(o.id==='truc'?'pierce':o.id==='sen'?'vampire':'wildfire');this.dropWeapon(o.x+45,o.y,o.id==='truc'?'jade':o.id==='sen'?'lotusblade':'ember');this.unlock('seal-'+o.id,'Thức tỉnh '+o.name)}
      return ok;
    }
    dropWeapon(x,y,id,level=1){this.weaponDrops.push({id:'weapon-'+(++this.droppedWeapons),x,y,weaponId:C.weapon(id).id,level});if(this.weaponDrops.length>32)this.weaponDrops.shift()}
    grantRelic(id){const r=C.relic(id);if(!r)return false;const p=this.player;p.relics[id]=(p.relics[id]||0)+1;if(id==='power')p.damage+=5;if(id==='vitality'){p.maxHp+=30;p.hp=Math.min(p.maxHp,p.hp+45);p.armor=Math.min(.45,p.armor+.04)}if(id==='haste'){p.fireRate=Math.max(.065,p.fireRate*.87);p.speed=Math.min(350,p.speed+10)}if(id==='spirit'){p.maxMp+=20;p.mp=p.maxMp;p.crit=Math.min(.6,p.crit+.05)}this.emit('toast',{text:'Di vật: '+r.name+' · '+r.desc,reward:true});return true}
    talentChoices(){const pool=C.relics.filter(r=>['power','vitality','haste','spirit'].includes(r.id)||!this.player.relics[r.id]);const offset=(this.player.level*3+this.world.seed)%pool.length;return[0,1,2].map(i=>pool[(offset+i*5)%pool.length]).filter((r,i,a)=>a.findIndex(x=>x.id===r.id)===i)}
    applyTalent(id){if(this.pendingLevels<1||!C.relic(id))return false;if(['power','vitality','haste','spirit'].includes(id)){const ok=super.applyTalent(id);if(ok)this.player.relics[id]=(this.player.relics[id]||0)+1;return ok}this.pendingLevels--;return this.grantRelic(id)}
    buy(item){
      if(item==='weapon'){const cost=55+this.weaponStateActive.level*30;if(this.player.gold<cost||this.weaponStateActive.level>=5)return false;this.player.gold-=cost;this.weaponStateActive.level++;this.emit('sound',{name:'pickup'});return true}
      if(item==='relic'){const cost=105;if(this.player.gold<cost)return false;this.player.gold-=cost;const pool=C.relics.filter(r=>!this.player.relics[r.id]);return this.grantRelic((pool.length?pool:C.relics)[Math.floor(this.rng()*(pool.length||C.relics.length))].id)}
      return super.buy(item);
    }
    unlock(id,text){if(this.achievements.includes(id))return;this.achievements.push(id);this.emit('toast',{text:'Thành tựu · '+text,reward:true})}
    objective(){
      if(!this.tutorialDone){const t=tutorial[this.tutorial.step];return{title:'Làm quen · '+t[0],text:t[1],target:this.tutorial.step===4?this.world.chests.find(c=>c.id==='welcome'):undefined}}
      const q=super.objective();if(this.victory)return q;
      const s=this.world.shrines.filter(s=>!s.active).sort((a,b)=>dist(a,this.player)-dist(b,this.player))[0];if(!s)return q;
      const state=this.challenge[s.id];let text=s.id==='truc'?'Trúc Vệ đang giữ ấn. Né cú lao và loạt trúc.':s.id==='sen'?state.started?'Bảo vệ Đèn Sen: '+Math.max(0,Math.ceil(36-state.timer))+' giây · đèn '+Math.ceil(state.hp)+'%':'Đến Đầm Sen, nhấn F để bảo vệ ngọn đèn.':state.started?'Phá lõi tro: '+state.ids.filter(id=>this.world.enemies.some(e=>e.id===id&&e.alive)).length+'/3 còn lại. Né dấu lửa.':'Đến Đồi Tro, nhấn F để bắt đầu thử thách lò rèn.';
      if(state.complete)text='Thử thách hoàn tất! Đến gần '+s.name+' và nhấn F.';return{title:q.title,text,target:s};
    }
    respawn(){super.respawn();this.player.shield=0;this.player.overclock=0;this.player.firewall=0;for(const s of this.world.shrines){const state=this.challenge[s.id];if(state.started&&!state.complete){this.clearChallengeEnemies(state);state.started=false;state.timer=0;state.hp=100}}}
    serialize(){const data=super.serialize(),boss=this.world.enemies.find(e=>e.type==='boss');data.expansionVersion=2;data.expansion={run:this.run,challenge:this.challenge,weaponDrops:this.weaponDrops,memories:this.memories,achievements:this.achievements,tutorial:this.tutorial,serial:this.challengeSerial,droppedWeapons:this.droppedWeapons,bossState:boss?{rootPhase:!!boss.rootPhase,novaCd:boss.novaCd||0,pattern:boss.pattern||0}:null};data.dynamicEnemies=this.world.enemies.filter(e=>e.id.startsWith('v2-')&&e.alive).map(e=>({...e}));return data}
    static restore(data){
      if(!data?.player||!Number.isFinite(data.player.y))throw new Error('Bản lưu không có tọa độ hợp lệ');
      const g=Base.restore(data);Object.setPrototypeOf(g,ExpandedGame.prototype);const baseEnemies=data.enemies;
      const retainedArmor=g.player.armor;g.initExpansion();g.player.armor=retainedArmor;
      const saved=data.player;
      if(data.expansionVersion===2&&data.expansion){
        const ex=data.expansion;g.run=Math.max(0,Number(ex.run)||0);g.challengeSerial=Math.max(0,Number(ex.serial)||0);g.droppedWeapons=Math.max(0,Number(ex.droppedWeapons)||0);
        for(const s of g.world.shrines){const savedState=ex.challenge?.[s.id];if(savedState&&typeof savedState==='object')g.challenge[s.id]={started:!!savedState.started,complete:!!savedState.complete,timer:clamp(Number(savedState.timer)||0,0,120),hp:clamp(Number(savedState.hp)||0,0,100),wave:clamp(Number(savedState.wave)||0,0,20),nextWave:clamp(Number(savedState.nextWave)||0,0,8),ids:Array.isArray(savedState.ids)?savedState.ids.filter(id=>typeof id==='string').slice(0,100):[]};}
        g.weaponDrops=(Array.isArray(ex.weaponDrops)?ex.weaponDrops:[]).filter(d=>Number.isFinite(d.x)&&Number.isFinite(d.y)&&C.weapons.some(w=>w.id===d.weaponId)).slice(0,32);
        g.memories=(Array.isArray(ex.memories)?ex.memories:[]).filter(id=>C.lore.some(l=>l.id===id));g.achievements=(Array.isArray(ex.achievements)?ex.achievements:[]).filter(x=>typeof x==='string').slice(0,40);g.tutorial={...g.tutorial,...ex.tutorial};g.tutorial.step=clamp(Number(g.tutorial.step)||0,0,tutorial.length);
        if(Array.isArray(saved.weapons)&&saved.weapons.length===2)g.player.weapons=saved.weapons.map(s=>{const w=C.weapon(s.id);return{id:w.id,level:clamp(Number(s.level)||1,1,5),ammo:clamp(Number(s.ammo)||0,0,w.clip),reload:clamp(Number(s.reload)||0,0,5)}});
        g.player.weaponSlot=saved.weaponSlot===1?1:0;g.player.relics={};for(const r of C.relics)if(Number(saved.relics?.[r.id])>0)g.player.relics[r.id]=Math.min(50,Number(saved.relics[r.id]));
        g.player.code=clamp(saved.code||0,0,8);g.player.shield=clamp(saved.shield||0,0,65);
        for(const e of g.world.enemies){const s=baseEnemies.find(s=>s.id===e.id);if(s){e.alive=s.alive===true;e.hp=clamp(s.hp||0,0,e.maxHp)}}
        for(const e of data.dynamicEnemies||[]){if(typeof e.id==='string'&&e.id.startsWith('v2-')&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.hp)&&e.hp>0&&['core','slime','shade','wisp','archer'].includes(e.type))g.world.enemies.push({...e,hp:Math.min(e.hp,10000),maxHp:Math.max(1,Math.min(Number(e.maxHp)||e.hp,10000))})}
        const boss=g.world.enemies.find(e=>e.type==='boss');if(boss){boss.rootPhase=!!ex.bossState?.rootPhase||g.world.enemies.some(e=>e.root&&e.alive);boss.novaCd=clamp(Number(ex.bossState?.novaCd)||0,0,3);boss.pattern=clamp(Number(ex.bossState?.pattern)||0,0,3)}
      }else{g.skipTutorial();for(const s of g.world.shrines)if(s.active)g.challenge[s.id].complete=true;g.emit('toast',{text:'Bản lưu cũ đã được chuyển sang hành trình 0.2. Vũ khí và di vật mới đã sẵn sàng.'})}
      for(const s of g.world.shrines)if(s.active){g.challenge[s.id].complete=true;for(const id of s.guardians){const guardian=g.world.enemies.find(e=>e.id===id);if(guardian)guardian.alive=false}}
      return g;
    }
  }
  root.DTGame=ExpandedGame;
})(globalThis);
