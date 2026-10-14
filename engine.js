(function(root){
  'use strict';
  const D=root.DTWorld,TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  class Game{
    constructor(hero='an',seed=71426){
      this.world=D.makeWorld(seed);this.rng=D.rand(seed+123);this.hero=D.HEROES[hero]||D.HEROES.an;
      this.player={x:740,y:2200,r:13,hp:this.hero.hp,maxHp:this.hero.hp,mp:100,maxMp:100,speed:this.hero.speed,damage:this.hero.damage,fireRate:this.hero.fireRate,level:1,xp:0,nextXp:65,gold:0,potions:3,ult:0,invulnerable:0,cd:{fire:0,dash:0,q:0,e:0},dashTime:0,dashX:0,dashY:0,facing:0,moving:false,armor:0,bonusShots:0,crit:.06,regen:0};
      this.projectiles=[];this.effects=[];this.particles=[];this.loot=[];this.floaters=[];this.telegraphs=[];this.events=[];
      this.time=0;this.paused=true;this.started=false;this.dead=false;this.victory=false;this.storyStarted=false;this.bossStarted=false;this.kills=0;this.deaths=0;this.upgrades=0;this.pendingLevels=0;this.visited=new Set(['village']);this.zone='village';this.shake=0;this.hitFlash=0;this.activeEffects=[];this.respawnPoint={x:740,y:2200};
      this.input={dx:0,dy:0,fire:false,aimX:1000,aimY:2200};
    }
    emit(type,data={}){this.events.push({type,...data})}
    consumeEvents(){return this.events.splice(0)}
    start(){this.started=true;this.paused=false;this.storyStarted=true;this.emit('dialogue',{id:'intro'})}
    moveEntity(obj,dx,dy){
      const parts=Math.max(1,Math.ceil(Math.hypot(dx,dy)/7));
      for(let i=0;i<parts;i++){
        const nx=obj.x+dx/parts,ny=obj.y+dy/parts;
        if(!this.world.collision(nx,obj.y,obj.r))obj.x=nx;
        if(!this.world.collision(obj.x,ny,obj.r))obj.y=ny;
      }
    }
    update(dt){
      if(this.paused||this.dead||!this.started)return;
      dt=clamp(dt,0,.04);this.time+=dt;const p=this.player;
      for(const k in p.cd)p.cd[k]=Math.max(0,p.cd[k]-dt);
      p.invulnerable=Math.max(0,p.invulnerable-dt);p.mp=Math.min(p.maxMp,p.mp+13*dt);p.hp=Math.min(p.maxHp,p.hp+p.regen*dt);
      this.shake=Math.max(0,this.shake-dt*22);this.hitFlash=Math.max(0,this.hitFlash-dt*3);
      let dx=this.input.dx,dy=this.input.dy;const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len}
      p.moving=len>0;p.facing=Math.atan2(this.input.aimY-p.y,this.input.aimX-p.x);
      if(p.dashTime>0){p.dashTime-=dt;this.moveEntity(p,p.dashX*850*dt,p.dashY*850*dt);this.spark(p.x,p.y,2,this.hero.color,45,.2)}
      else this.moveEntity(p,dx*p.speed*dt,dy*p.speed*dt);
      if(this.input.fire)this.fire();
      const zone=D.zoneAt(p.x,p.y);if(zone.id!==this.zone){this.zone=zone.id;this.visited.add(zone.id);this.emit('zone',{zone})}
      this.updateEnemies(dt);this.updateProjectiles(dt);this.updateTelegraphs(dt);this.updateActiveEffects(dt);this.updateLoot(dt);
      for(const list of[this.particles,this.effects,this.floaters])for(let i=list.length-1;i>=0;i--){const e=list[i];e.life-=dt;if(e.vx)e.x+=e.vx*dt;if(e.vy)e.y+=e.vy*dt;if(e.life<=0)list.splice(i,1)}
      if(this.particles.length>650)this.particles.splice(0,this.particles.length-650);
      if(this.effects.length>150)this.effects.splice(0,this.effects.length-150);
      if(this.projectiles.length>500)this.projectiles.splice(0,this.projectiles.length-500);
    }
    fire(){
      const p=this.player;if(p.cd.fire>0||p.dashTime>0)return;
      p.cd.fire=p.fireRate;const count=(this.hero.id==='kiet'?3:1)+p.bonusShots;
      for(let i=0;i<count;i++){const offset=(i-(count-1)/2)*.13;this.shoot(p.x,p.y,p.facing+offset,this.hero.shotSpeed,p.damage,this.hero.color,{kind:this.hero.id==='linh'?'arrow':'orb',life:1.3,r:this.hero.id==='kiet'?4:5})}
      this.spark(p.x+Math.cos(p.facing)*20,p.y+Math.sin(p.facing)*20,4,this.hero.color,100,.12);this.emit('sound',{name:'shoot'});
    }
    shoot(x,y,angle,speed,damage,color,opts={}){
      const friendly=opts.friendly!==false;
      this.projectiles.push({x:x+Math.cos(angle)*20,y:y+Math.sin(angle)*20,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,angle,damage,color,friendly,r:opts.r||5,life:opts.life||2,pierce:opts.pierce||0,kind:opts.kind||'orb',charge:opts.charge!==false,hitIds:[],trail:0});
    }
    dash(){
      const p=this.player;if(this.paused||this.dead||p.cd.dash>0)return false;
      let dx=this.input.dx,dy=this.input.dy,l=Math.hypot(dx,dy);
      if(!l){dx=Math.cos(p.facing);dy=Math.sin(p.facing);l=1}
      p.dashX=dx/l;p.dashY=dy/l;p.dashTime=.19;p.invulnerable=Math.max(p.invulnerable,.27);p.cd.dash=1.2;
      this.effect('dash',p.x,p.y,this.hero.color,30,.25,{angle:Math.atan2(dy,dx)});this.emit('sound',{name:'dash'});return true;
    }
    skill(key){
      if(this.paused||this.dead||!['q','e','r'].includes(key))return false;
      const p=this.player,cost=key==='q'?24:key==='e'?38:0;
      if(key==='r'&&p.ult<100){this.emit('toast',{text:'Tuyệt kỹ tích lực khi đánh trúng quái.'});return false}
      if(key!=='r'&&(p.cd[key]>0||p.mp<cost)){if(p.mp<cost)this.emit('toast',{text:'Chưa đủ linh lực.'});return false}
      if(key==='r')p.ult=0;else{p.mp-=cost;p.cd[key]=key==='q'?this.hero.qCd:this.hero.eCd}
      const a=p.facing,id=this.hero.id,d=p.damage;
      this.emit('sound',{name:key==='r'?'ultimate':'skill'});this.shake=key==='r'?8:3;
      if(key==='q'){
        if(id==='an')for(let i=-4;i<=4;i++)this.shoot(p.x,p.y,a+i*.145,590,d*1.25,'#ffd184',{pierce:1,r:7,life:1.2});
        if(id==='linh')for(let i=-1;i<=1;i++)this.shoot(p.x,p.y,a+i*.09,1040,d*2.6,'#c6f2bc',{kind:'arrow',pierce:6,r:7,life:1.1});
        if(id==='kiet'){
          let from=p,targets=this.world.enemies.filter(e=>e.alive&&distance(e,p)<430).sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,7);
          if(!targets.length)this.effect('lightning',p.x,p.y,'#c5d7ff',200,.25,{tx:p.x+Math.cos(a)*350,ty:p.y+Math.sin(a)*350});
          for(const e of targets){this.effect('lightning',from.x,from.y,'#c5d7ff',0,.3,{tx:e.x,ty:e.y});this.damageEnemy(e,d*3);e.slow=1.5;from=e}
        }
        this.effect('ring',p.x,p.y,this.hero.color,62,.3);
      }
      if(key==='e'){
        if(id==='an'){
          this.activeEffects.push({type:'ward',x:p.x,y:p.y,r:160,life:4,tick:0,damage:d*.55,color:'#eec57a'});
          this.effect('ring',p.x,p.y,'#f5d295',170,.55);p.hp=Math.min(p.maxHp,p.hp+14);
        }
        if(id==='linh'){
          const l=Math.hypot(this.input.aimX-p.x,this.input.aimY-p.y),rr=Math.min(l,430);
          const x=p.x+Math.cos(a)*rr,y=p.y+Math.sin(a)*rr;
          this.activeEffects.push({type:'rain',x,y,r:135,life:3,tick:0,damage:d*.9,color:'#b5e6a7'});this.effect('ring',x,y,'#b5e6a7',135,.5);
        }
        if(id==='kiet'){
          this.areaDamage(p.x,p.y,195,d*4,190);this.effect('shock',p.x,p.y,'#b5cafa',210,.55);this.spark(p.x,p.y,55,'#bfd9ff',260,.6);
          this.clearBullets(p.x,p.y,230);
        }
      }
      if(key==='r'){
        p.invulnerable=Math.max(p.invulnerable,1.2);p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.14);
        this.clearBullets(p.x,p.y,620);this.effect('ultimate',p.x,p.y,this.hero.color,350,1.3);this.spark(p.x,p.y,90,this.hero.color,330,1);
        if(id==='an'){
          this.areaDamage(p.x,p.y,340,d*7,130,false);
          for(let j=0;j<24;j++)this.shoot(p.x,p.y,j/24*TAU,480,d*2,'#ffe0a2',{r:8,pierce:3,life:1.5,charge:false});
        }else if(id==='linh'){
          this.activeEffects.push({type:'storm',x:p.x,y:p.y,r:280,life:5,tick:0,damage:d*1.5,color:'#c3f1b6',follow:true});
          for(let j=0;j<24;j++)this.shoot(p.x,p.y,j/24*TAU,790,d*2,'#b9edaa',{kind:'arrow',pierce:4,life:1.3,charge:false});
        }else{
          this.areaDamage(p.x,p.y,390,d*9,250,false);
          for(let j=0;j<9;j++){const x=p.x+(this.rng()-.5)*640,y=p.y+(this.rng()-.5)*500;this.effect('bolt',x,y,'#d7e0ff',60,.6);this.areaDamage(x,y,100,d*3,80,false)}
        }
      }
      return true;
    }
    clearBullets(x,y,r){this.projectiles=this.projectiles.filter(b=>b.friendly||Math.hypot(b.x-x,b.y-y)>r)}
    areaDamage(x,y,r,damage,knock=0,charge=true){for(const e of this.world.enemies)if(e.alive&&Math.hypot(e.x-x,e.y-y)<r+e.r){this.damageEnemy(e,damage,charge);const a=Math.atan2(e.y-y,e.x-x);e.knockX=Math.cos(a)*knock;e.knockY=Math.sin(a)*knock;e.slow=1}}
    heal(){
      const p=this.player;if(this.paused||this.dead)return false;
      if(p.potions<1){this.emit('toast',{text:'Hết bình máu. Về Giếng Ngọc để nghỉ chân.'});return false}
      if(p.hp>=p.maxHp){this.emit('toast',{text:'Máu đang đầy.'});return false}
      p.potions--;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.55);this.effect('ring',p.x,p.y,'#b6e9ad',55,.55);this.spark(p.x,p.y,24,'#b6e9ad',75,.8);this.emit('sound',{name:'heal'});return true;
    }
    damagePlayer(amount){
      const p=this.player;if(this.dead||p.invulnerable>0||this.victory)return;
      const damage=Math.max(1,Math.round(amount*(1-p.armor)));p.hp=Math.max(0,p.hp-damage);p.invulnerable=.62;this.shake=5;this.hitFlash=.25;
      this.floaters.push({x:p.x,y:p.y-38,text:`−${damage}`,color:'#ffac9b',life:.7,vy:-38});this.emit('sound',{name:'hurt'});
      if(p.hp<=0){this.dead=true;this.emit('death')}
    }
    damageEnemy(e,amount,charge=true){
      if(!e.alive)return;const crit=this.rng()<this.player.crit,dmg=Math.round(amount*(crit?1.7:1));e.hp-=dmg;e.hit=.12;
      if(charge)this.player.ult=Math.min(100,this.player.ult+Math.min(2.5,dmg*.04));
      if(this.floaters.length<70)this.floaters.push({x:e.x+(this.rng()-.5)*15,y:e.y-e.r-15,text:String(dmg)+(crit?'!':''),color:crit?'#ffda83':'#e9ecce',life:.65,vy:-42});
      this.spark(e.x,e.y,5,e.type==='boss'?'#edb482':'#cce5c1',100,.23);
      if(e.hp<=0){
        e.alive=false;this.kills++;if(charge)this.player.ult=Math.min(100,this.player.ult+2);this.addXp(Math.round(e.xp));
        this.loot.push({x:e.x,y:e.y,type:'gold',value:Math.round(e.gold),life:120});
        if(this.rng()<.14)this.loot.push({x:e.x+12,y:e.y-4,type:'potion',value:1,life:120});
        this.spark(e.x,e.y,22,e.type==='boss'?'#f3cc85':'#6bb29a',130,.55);this.emit('sound',{name:'kill'});
        if(e.type==='boss'){this.victory=true;this.player.gold+=180;this.player.hp=this.player.maxHp;this.projectiles=[];this.telegraphs=[];this.emit('victory')}
        if(e.guard){const s=this.world.shrines.find(s=>s.id===e.guard);if(s&&!s.guardians.some(id=>this.world.enemies.find(e=>e.id===id&&e.alive)))this.emit('toast',{text:`${s.name} đã yên. Đến gần và nhấn F để thức tỉnh.`,reward:true})}
      }
    }
    addXp(amount){
      const p=this.player;p.xp+=amount;
      while(p.xp>=p.nextXp){p.xp-=p.nextXp;p.level++;p.nextXp=Math.floor(p.nextXp*1.32+18);p.maxHp+=10;p.hp=Math.min(p.maxHp,p.hp+45);p.damage+=2;p.mp=p.maxMp;this.pendingLevels++;this.emit('level',{level:p.level});this.effect('ring',p.x,p.y,'#ffe5a0',90,.65)}
    }
    applyTalent(id){
      if(this.pendingLevels<1)return false;const p=this.player;
      if(id==='power')p.damage+=5;
      else if(id==='vitality'){p.maxHp+=30;p.hp=Math.min(p.maxHp,p.hp+45);p.armor=Math.min(.45,p.armor+.04)}
      else if(id==='haste'){p.fireRate=Math.max(.065,p.fireRate*.87);p.speed=Math.min(350,p.speed+10)}
      else if(id==='spirit'){p.maxMp+=20;p.mp=p.maxMp;p.crit=Math.min(.6,p.crit+.05)}
      else return false;
      this.pendingLevels--;return true;
    }
    updateEnemies(dt){
      const p=this.player;
      for(const e of this.world.enemies){
        if(!e.alive)continue;e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.cool-=dt;
        if(Math.hypot(e.knockX,e.knockY)>4){this.moveEntity(e,e.knockX*dt,e.knockY*dt);e.knockX*=Math.exp(-8*dt);e.knockY*=Math.exp(-8*dt)}
        const dist=distance(e,p);if(dist>900)continue;
        if(e.type==='boss'){this.updateBoss(e,dt);continue}
        if(this.victory)continue;
        const homeDist=Math.hypot(e.x-e.homeX,e.y-e.homeY),a=Math.atan2(p.y-e.y,p.x-e.x),slow=e.slow>0?.48:1;
        let mx=0,my=0;
        if(dist>530||homeDist>600){const back=Math.atan2(e.homeY-e.y,e.homeX-e.x);if(homeDist>20){mx=Math.cos(back)*e.speed*.55;my=Math.sin(back)*e.speed*.55}}
        else{
          if(e.type==='boar'&&e.phase){
            e.timer-=dt;
            if(e.phase===1&&e.timer<=0){e.phase=2;e.timer=.48;e.chargeA=a;this.emit('sound',{name:'charge'})}
            if(e.phase===2){mx=Math.cos(e.chargeA)*350;my=Math.sin(e.chargeA)*350;if(e.timer<=0){e.phase=0;e.cool=2.4}}
          }else if(e.type==='boar'&&e.cool<=0&&dist<340&&dist>70){e.phase=1;e.timer=.65;this.effect('warning',e.x,e.y,'#ff9c72',24,.65)}
          else if(e.type==='wisp'||e.type==='archer'){
            const sign=dist>260?1:dist<140?-1:0;mx=Math.cos(a)*e.speed*sign;my=Math.sin(a)*e.speed*sign;
            if(e.cool<=0&&dist<460){
              this.shoot(e.x,e.y,a,e.type==='wisp'?235:320,e.damage,e.type==='wisp'?'#e4a0d1':'#edb596',{friendly:false,life:2.1,r:6,kind:e.type==='archer'?'arrow':'orb'});e.cool=e.type==='wisp'?1.7:1.4;
              this.effect('ring',e.x,e.y,'#f1b1ae',24,.22);
            }
          }else{
            if(dist>e.r+p.r){mx=Math.cos(a)*e.speed;my=Math.sin(a)*e.speed}
            if(e.type==='shade'&&e.cool<=0&&dist>160&&dist<430){const nx=p.x-Math.cos(a)*95,ny=p.y-Math.sin(a)*95;if(!this.world.collision(nx,ny,e.r)){this.spark(e.x,e.y,16,'#918ba9',120,.3);e.x=nx;e.y=ny;this.effect('ring',nx,ny,'#ae9bb7',34,.3)}e.cool=4}
          }
          if(dist<e.r+p.r+5)this.damagePlayer(e.type==='boar'&&e.phase===2?e.damage*1.4:e.damage);
        }
        this.moveEntity(e,mx*dt*slow,my*dt*slow);
      }
    }
    updateBoss(e,dt){
      const p=this.player;e.timer+=dt;e.phase=e.hp/e.maxHp<.5?2:1;const a=Math.atan2(p.y-e.y,p.x-e.x),d=distance(e,p);
      if(d>900)return;
      if(d>230&&d<650)this.moveEntity(e,Math.cos(a)*32*dt,Math.sin(a)*32*dt);
      if(d<e.r+p.r+8)this.damagePlayer(23);
      if(e.cool<=0){
        e.pattern=(e.pattern+1)%4;e.cool=e.phase===2?1.9:2.7;
        if(e.pattern===0){for(let j=-3;j<=3;j++)this.shoot(e.x,e.y,a+j*.14,280,17,'#eaba80',{friendly:false,life:3,r:7});this.effect('shock',e.x,e.y,'#d89083',85,.55)}
        if(e.pattern===1){const n=e.phase===2?24:18;for(let j=0;j<n;j++)this.shoot(e.x,e.y,j/n*TAU+this.time*.24,190,13,'#db9b94',{friendly:false,life:3.8,r:6});this.effect('ring',e.x,e.y,'#dc998e',110,.7)}
        if(e.pattern===2){for(let j=0;j<5;j++){const x=p.x+(j?Math.cos(j*1.7)*100:0),y=p.y+(j?Math.sin(j*1.7)*100:0);this.telegraphs.push({x,y,r:62,timer:.95,maxTimer:.95,damage:22,color:'#e7aa85'})}}
        if(e.pattern===3){
          for(let j=0;j<9;j++)this.shoot(e.x,e.y,a+(j-4)*.22,360,15,'#c1c7ad',{friendly:false,life:2,r:5,kind:'arrow'});
          if(this.world.enemies.filter(x=>x.alive&&x.summon).length<6){for(let j=0;j<2;j++){const ang=this.rng()*TAU;const x=e.x+Math.cos(ang)*135,y=e.y+Math.sin(ang)*135;if(!this.world.collision(x,y,15))this.world.enemies.push({id:`s${this.time}-${j}`,type:'shade',x,y,homeX:x,homeY:y,r:15,hp:40,maxHp:40,speed:98,damage:9,xp:5,gold:1,alive:true,summon:true,cool:3,phase:0,timer:0,hit:0,slow:0,knockX:0,knockY:0})}}
        }
        if(e.phase===2)this.effect('ring',e.x,e.y,'#f4998c',145,.5);
      }
    }
    updateProjectiles(dt){
      const p=this.player;
      for(let i=this.projectiles.length-1;i>=0;i--){const b=this.projectiles[i];if(!b)continue;b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.trail+=dt;
        if(b.trail>.035&&this.particles.length<580){b.trail=0;this.particles.push({x:b.x,y:b.y,color:b.color,size:b.friendly?3:2,life:.17,maxLife:.17})}
        if(b.friendly){for(const e of this.world.enemies)if(e.alive&&!b.hitIds.includes(e.id)&&Math.hypot(e.x-b.x,e.y-b.y)<e.r+b.r){this.damageEnemy(e,b.damage,b.charge!==false);b.hitIds.push(e.id);if(b.pierce>0)b.pierce--;else{b.life=0;break}}}
        else if(Math.hypot(b.x-p.x,b.y-p.y)<p.r+b.r){this.damagePlayer(b.damage);b.life=0}
        if(b.life<=0||this.world.collision(b.x,b.y,2)){this.projectiles.splice(i,1)}
      }
    }
    updateTelegraphs(dt){
      for(let i=this.telegraphs.length-1;i>=0;i--){const t=this.telegraphs[i];t.timer-=dt;if(t.timer<=0){this.effect('roots',t.x,t.y,'#d0ac85',t.r,.55);this.spark(t.x,t.y,20,'#e6bd83',140,.5);if(Math.hypot(t.x-this.player.x,t.y-this.player.y)<t.r+this.player.r)this.damagePlayer(t.damage);this.telegraphs.splice(i,1)}}
    }
    updateActiveEffects(dt){
      for(let i=this.activeEffects.length-1;i>=0;i--){const e=this.activeEffects[i];e.life-=dt;e.tick-=dt;if(e.follow){e.x=this.player.x;e.y=this.player.y}
        if(e.tick<=0){e.tick=.32;this.areaDamage(e.x,e.y,e.r,e.damage,0,e.type!=='storm');this.effect(e.type==='rain'?'leaves':'ring',e.x,e.y,e.color,e.r,.45);this.spark(e.x+(this.rng()-.5)*e.r,e.y+(this.rng()-.5)*e.r,8,e.color,70,.45)}
        if(e.life<=0)this.activeEffects.splice(i,1);
      }
    }
    updateLoot(dt){
      const p=this.player;
      for(let i=this.loot.length-1;i>=0;i--){const l=this.loot[i];l.life-=dt;const d=distance(l,p);if(d<155){const a=Math.atan2(p.y-l.y,p.x-l.x);l.x+=Math.cos(a)*240*dt;l.y+=Math.sin(a)*240*dt}
        if(d<23){if(l.type==='gold')p.gold+=l.value;else p.potions=Math.min(12,p.potions+1);this.loot.splice(i,1);this.emit('sound',{name:'pickup'})}else if(l.life<=0)this.loot.splice(i,1);
      }
    }
    effect(type,x,y,color,r,life,extra={}){this.effects.push({type,x,y,color,r,life,maxLife:life,...extra})}
    spark(x,y,count,color,speed=80,life=.4){for(let i=0;i<count;i++){const a=this.rng()*TAU,v=speed*(.2+this.rng()*.8),ll=life*(.6+this.rng()*.4);this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,color,size:2+this.rng()*3,life:ll,maxLife:ll})}}
    nearby(){
      const p=this.player,objects=[...this.world.npcs,...this.world.shrines,...this.world.chests.filter(c=>!c.open),this.world.altar];
      let best=null,bestD=90;for(const o of objects){const d=distance(o,p);if(d<bestD){bestD=d;best=o}}
      if(!best)return null;
      if(best.id==='altar')return{...best,label:this.victory?'Cội đa đã tìm lại tên mình':this.world.shrines.every(s=>s.active)?'Đánh thức Cội Đa':'Cội Đa · cần đủ ba ấn linh'};
      if(best.guardians){const n=best.guardians.filter(id=>this.world.enemies.some(e=>e.id===id&&e.alive)).length;return{...best,label:best.active?`${best.name} · Dịch chuyển về làng`:n?`${best.name} · còn ${n} hộ vệ`:`Thức tỉnh ${best.name}`}}
      if(best.open===false)return{...best,label:'Mở rương linh vật'};
      return{...best,label:best.type==='well'?'Nghỉ chân · hồi máu và linh lực':`Trò chuyện với ${best.name}`};
    }
    interact(){
      if(this.paused||this.dead)return false;const o=this.nearby(),p=this.player;if(!o)return false;
      if(o.id==='elder'){this.emit('dialogue',{id:this.victory?'ending':this.world.shrines.every(s=>s.active)?'ready':'elder'});return true}
      if(o.id==='smith'){this.emit('shop');return true}
      if(o.id==='well'){p.hp=p.maxHp;p.mp=p.maxMp;p.potions=Math.max(3,p.potions);this.respawnPoint={x:740,y:2200};this.effect('ring',o.x,o.y,'#a5e7cc',100,.7);this.emit('toast',{text:'Giếng Ngọc đã hồi sức. Bình máu được bổ sung.',reward:true});this.emit('sound',{name:'heal'});return true}
      if(o.guardians){
        const s=this.world.shrines.find(s=>s.id===o.id);
        if(s.active){p.x=740;p.y=2200;p.hp=p.maxHp;p.mp=p.maxMp;this.projectiles=[];this.telegraphs=[];this.emit('toast',{text:'Ánh đèn đưa ngươi trở về Làng Đèn.'});return true}
        if(s.guardians.some(id=>this.world.enemies.some(e=>e.id===id&&e.alive))){this.emit('toast',{text:'Đánh bại hộ vệ quanh ấn trước.'});return false}
        s.active=true;p.gold+=45;p.hp=p.maxHp;p.mp=p.maxMp;p.potions=Math.min(12,p.potions+1);this.player.ult=Math.min(100,this.player.ult+30);this.addXp(65);
        this.effect('ultimate',s.x,s.y,s.color,220,1.2);this.spark(s.x,s.y,70,s.color,240,1);this.emit('shrine',{id:s.id});this.emit('sound',{name:'ultimate'});return true;
      }
      if(o.id==='altar'){
        if(this.victory){this.emit('dialogue',{id:'ending'});return true}
        if(this.bossStarted){this.emit('toast',{text:'Giữ khoảng cách. Lướt qua những vòng đạn.'});return false}
        if(!this.world.shrines.every(s=>s.active)){this.emit('toast',{text:'Ba ấn Trúc, Sen, Tro sẽ mở ký ức của cội đa.'});return false}
        this.startBoss();return true;
      }
      const chest=this.world.chests.find(c=>c.id===o.id);if(chest&&!chest.open){chest.open=true;const gold=20+Math.floor(this.rng()*22);p.gold+=gold;p.potions=Math.min(12,p.potions+1);this.addXp(15);this.spark(chest.x,chest.y,28,'#f9d993',130,.7);this.emit('toast',{text:`Rương linh vật: +${gold} xu, +1 bình máu.`,reward:true});this.emit('sound',{name:'pickup'});return true}
      return false;
    }
    startBoss(){
      this.bossStarted=true;const hp=2100+this.player.level*180;
      this.world.enemies.push({id:'boss',type:'boss',name:'Mộc Quỷ · Cội Đa Lạc Hồn',x:1830,y:610,homeX:1830,homeY:610,r:45,hp,maxHp:hp,speed:32,damage:23,xp:250,gold:160,alive:true,cool:2,phase:1,timer:0,pattern:-1,hit:0,slow:0,knockX:0,knockY:0});
      this.player.hp=this.player.maxHp;this.player.mp=this.player.maxMp;this.player.ult=100;this.emit('boss');this.effect('ultimate',1830,610,'#dcaa8a',260,1.5);this.shake=8;
    }
    respawn(){
      this.dead=false;this.deaths++;const p=this.player;p.x=this.respawnPoint.x;p.y=this.respawnPoint.y;p.hp=p.maxHp;p.mp=p.maxMp;p.gold=Math.floor(p.gold*.9);p.potions=Math.max(3,p.potions);p.invulnerable=2;p.dashTime=0;this.projectiles=[];this.telegraphs=[];this.activeEffects=[];
      const b=this.world.enemies.find(e=>e.id==='boss');if(b&&b.alive){b.hp=b.maxHp;b.x=1830;b.y=610;b.cool=2}
      this.emit('toast',{text:'Đèn còn sáng. Ngươi tỉnh lại ở Làng Đèn.'});
    }
    buy(item){
      const p=this.player,cost=item==='potion'?20:60+this.upgrades*25;
      if(p.gold<cost)return false;
      if(item==='potion'){if(p.potions>=12)return false;p.potions++}
      else if(item==='damage'){p.damage+=5;this.upgrades++}
      else if(item==='hp'){p.maxHp+=25;p.hp=Math.min(p.maxHp,p.hp+25);this.upgrades++}
      else return false;p.gold-=cost;this.emit('sound',{name:'pickup'});return true;
    }
    objective(){
      if(this.victory)return{title:'Ngọn đèn nhớ đường về',text:'Sương đã tan. Trở về trò chuyện với Bà Năm, hoặc tiếp tục khám phá.'};
      const remaining=this.world.shrines.filter(s=>!s.active);
      if(!remaining.length)return{title:this.bossStarted?'Đối mặt với Mộc Quỷ':'Thắp lại tên của cội đa',text:this.bossStarted?'Né vòng đạn và rễ cây. Dùng R khi đầy lực; H để hồi máu.':'Đến Cội Đa phía bắc bản đồ. Nhấn F tại đàn tế để bắt đầu trận cuối.'};
      const closest=remaining.reduce((a,b)=>distance(a,this.player)<distance(b,this.player)?a:b);
      return{title:`Thức tỉnh ba ấn linh (${3-remaining.length}/3)`,text:`Gần nhất: ${closest.name} ở ${closest.zone}. Hạ hộ vệ, rồi nhấn F cạnh ấn.`,target:closest};
    }
    serialize(){
      return{version:1,seed:this.world.seed,hero:this.hero.id,player:JSON.parse(JSON.stringify(this.player)),time:this.time,storyStarted:this.storyStarted,kills:this.kills,deaths:this.deaths,upgrades:this.upgrades,visited:[...this.visited],pendingLevels:this.pendingLevels,shrines:this.world.shrines.filter(s=>s.active).map(s=>s.id),chests:this.world.chests.filter(c=>c.open).map(c=>c.id),enemies:this.world.enemies.map(e=>({id:e.id,alive:e.alive,hp:e.hp})),loot:this.loot,bossStarted:this.bossStarted,victory:this.victory};
    }
    static restore(data){
      if(!data||data.version!==1||!D.HEROES[data.hero]||!data.player||!Number.isFinite(data.player.x)||!Number.isFinite(data.player.maxHp)||!Array.isArray(data.shrines)||!Array.isArray(data.chests)||!Array.isArray(data.enemies))throw new Error('Bản lưu không hợp lệ');
      const g=new Game(data.hero,data.seed),p=data.player;
      const numerics=['x','y','maxHp','hp','mp','maxMp','speed','damage','fireRate','level','xp','nextXp','gold','potions','ult','armor','bonusShots','crit','regen'];
      for(const k of numerics)if(Number.isFinite(p[k]))g.player[k]=p[k];
      g.player.maxHp=clamp(g.player.maxHp,50,10000);g.player.maxMp=clamp(g.player.maxMp,100,2000);g.player.x=clamp(g.player.x,40,D.W-40);g.player.y=clamp(g.player.y,40,D.H-40);g.player.hp=clamp(g.player.hp,1,g.player.maxHp);g.player.mp=clamp(g.player.mp,0,g.player.maxMp);g.player.potions=clamp(g.player.potions,0,12);g.player.invulnerable=1;
      if(g.world.collision(g.player.x,g.player.y,g.player.r)){g.player.x=740;g.player.y=2200}
      for(const s of g.world.shrines)s.active=data.shrines.includes(s.id);
      for(const c of g.world.chests)c.open=data.chests.includes(c.id);
      for(const e of g.world.enemies){const saved=data.enemies.find(s=>s.id===e.id);if(saved){e.alive=saved.alive===true;e.hp=clamp(saved.hp||0,0,e.maxHp)}}
      g.time=data.time||0;g.kills=data.kills||0;g.deaths=data.deaths||0;g.upgrades=data.upgrades||0;g.pendingLevels=clamp(data.pendingLevels||0,0,50);g.visited=new Set(data.visited||['village']);g.storyStarted=true;
      if(Array.isArray(data.loot))g.loot=data.loot.filter(l=>Number.isFinite(l.x)&&Number.isFinite(l.y)&&Number.isFinite(l.value)&&['gold','potion'].includes(l.type)).slice(0,200);
      if(data.bossStarted&&!data.victory){g.startBoss();const b=g.world.enemies.find(e=>e.id==='boss'),s=data.enemies.find(e=>e.id==='boss');if(s)b.hp=Math.max(1,Math.min(b.maxHp,s.hp));g.player.hp=clamp(p.hp,1,g.player.maxHp);g.player.mp=clamp(p.mp,0,g.player.maxMp);g.player.ult=clamp(p.ult,0,100);g.events=[]}
      g.victory=!!data.victory;g.bossStarted=!!data.bossStarted;g.started=true;g.paused=false;g.zone=D.zoneAt(g.player.x,g.player.y).id;return g;
    }
  }
  root.DTGame=Game;
})(globalThis);
