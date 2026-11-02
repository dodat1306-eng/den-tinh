(function(root){
  'use strict';
  const D=root.DTWorld,C=root.DTContent,Base=root.DTGame,TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const forms=[
    {id:'lightning',name:'Lôi',title:'Lôi Ảnh',color:'#aeacff',accent:'#ffe58e',icon:'ϟ',q:'Lôi Ảnh Liên Kích',e:'Lôi Vực Chấn Tâm',r:'Thiên Lôi Thất Phạt',desc:'Sét liên hoàn lan mục tiêu; điện trường cấp khiên.',passive:'Đòn đánh lan thêm một tia sét nhỏ.'},
    {id:'wind',name:'Phong',title:'Thiên Phong',color:'#9ef5e3',accent:'#edfff5',icon:'≋',q:'Phong Liêm Tam Trảm',e:'Phong Nhãn Hộ Thể',r:'Thiên Phong Long Quyển',desc:'Phong liêm xuyên, lốc hút và xóa đạn.',passive:'Di chuyển nhanh hơn 12%.'},
    {id:'earth',name:'Thổ',title:'Nham Giáp',color:'#e4b074',accent:'#ffe1aa',icon:'◆',q:'Địa Mạch Trỗi Dậy',e:'Nham Giáp Trấn Địa',r:'Địa Long Thiên Chấn',desc:'Trụ đá, chấn động, giáp và khiên bền vững.',passive:'Nhận ít hơn 12% sát thương.'},
    {id:'fire',name:'Hỏa',title:'Xích Diệm',color:'#ff9869',accent:'#fff0b2',icon:'♨',q:'Hỏa Long Truy Kích',e:'Hỏa Luân Hộ Giới',r:'Xích Diệm Thiên Long',desc:'Hỏa long, vòng lửa và thiên thạch thiêu đốt.',passive:'Đòn đánh để lại thiêu đốt.'},
    {id:'ice',name:'Băng',title:'Băng Tinh',color:'#8bddff',accent:'#eaffff',icon:'❄',q:'Băng Tinh Xuyên Tâm',e:'Băng Kính Vĩnh Tỏa',r:'Băng Hà Thiên Táng',desc:'Băng châm xuyên, làm chậm và đóng băng.',passive:'Đòn đánh làm chậm; chiêu có thể đóng băng.'},
    {id:'nature',name:'Mộc',title:'Linh Mộc',color:'#a9e898',accent:'#f6e7b0',icon:'❧',q:'Mộc Long Quấn Rễ',e:'Sinh Mệnh Linh Viên',r:'Vạn Mộc Thiên Ấn',desc:'Dây leo trói, hạt độc và hồi phục.',passive:'Hạt mộc gây độc và hồi nhẹ khi hạ quái.'},
    {id:'light',name:'Quang',title:'Thái Dương',color:'#ffe5a5',accent:'#ffffff',icon:'☀',q:'Quang Tuyến Thiên Minh',e:'Quang Kính Phản Chiếu',r:'Thái Dương Diệt Ảnh',desc:'Tia sáng xuyên, phản đạn và pháo thái dương.',passive:'Đạn thường xuyên ba mục tiêu.'}
  ];
  const byId=id=>forms.find(f=>f.id===id)||forms[0];
  const hero={id:'thienvu',name:'Thiên Vũ',role:'THẤT LINH SỨ',desc:'Biến đổi bảy nguyên tố; phân thân 3 / 5 / 7 và hợp kích.',color:'#b2b1ff',cloth:'#334b71',accent:'#ffe3a2',hp:125,speed:236,damage:15,fireRate:.28,shotSpeed:780,q:forms[0].q,e:forms[0].e,r:forms[0].r,qCd:6,eCd:10};
  D.HEROES.thienvu=hero;
  C.weapons.push({id:'prism',name:'Thất Linh Ấn',kind:'elemental',rarity:'epic',power:1,interval:.28,shots:1,pierce:0,speed:780,clip:21,reload:1.25,color:'#b4b2ff',effect:'elemental',desc:'Ấn chuyển đạn thường theo dạng nguyên tố của Thiên Vũ.'});
  C.passives.thienvu={name:'Thất Linh Cộng Hưởng',desc:'Bảy dạng có đặc tính riêng. Đổi dạng giữ nguyên hồi chiêu Q/E và lực R. C chọn dạng, 1–7 đổi nhanh, G chọn 3/5/7 dạng, X phân thân hoặc hợp thể. Các bản thể hỗ trợ tấn công thật và có máu riêng.'};
  root.DTElements={forms,byId,hero};
  class ElementalGame extends Base{
    constructor(id,seed){super(id,seed);this.initElemental(true)}
    get isElemental(){return this.hero.id==='thienvu'}
    get element(){return byId(this.player.elementForm)}
    initElemental(fresh=false){
      this.elementClones=[];this.elementFields=[];this.elementActions=[];this.elementSplitTime=0;this.elementSplitCd=0;this.elementSerial=0;this.elementCinema=null;
      if(!this.isElemental)return;
      const p=this.player;p.elementForm='lightning';p.splitCount=3;p.earthArmor=0;
      if(fresh)p.weapons=[this.weaponState('prism'),this.weaponState('storm')];this.applyElement();
    }
    applyElement(){const f=this.element;this.hero={...hero,color:f.color,accent:f.accent,q:f.q,e:f.e,r:f.r}}
    transformElement(id){
      if(!this.isElemental||this.dead||!forms.some(f=>f.id===id))return false;if(this.player.elementForm===id)return true;
      const previous=this.player.elementForm;this.player.elementForm=id;this.applyElement();this.syncElementClones();
      this.effect('element-transform',this.player.x,this.player.y,this.element.color,126,.75,{element:id,previous});this.emit('sound',{name:'element-'+id});return true;
    }
    selectSplitCount(count){if(!this.isElemental||![3,5,7].includes(count))return false;this.player.splitCount=count;return true}
    splitElementals(){
      if(!this.isElemental||this.paused||this.dead)return false;
      if(this.elementSplitTime>0){this.elementClones=[];this.elementSplitTime=0;this.effect('element-recall',this.player.x,this.player.y,this.element.color,150,.65);this.emit('sound',{name:'skill'});return true}
      const n=this.player.splitCount,cost={3:30,5:45,7:60}[n];
      if(this.elementSplitCd>0||this.player.mp<cost){this.emit('toast',{text:this.elementSplitCd>0?'Phân thân đang hồi chiêu.':'Chưa đủ linh lực để phân thân.'});return false}
      this.player.mp-=cost;this.elementSplitCd={3:18,5:24,7:30}[n];this.elementSplitTime={3:10,5:12,7:14}[n];this.syncElementClones(n);this.tutorial.skills++;
      this.effect('element-split',this.player.x,this.player.y,this.element.color,240,1.1,{count:n,element:this.element.id});this.elementCinema={name:n===3?'TAM LINH PHÂN THÂN':n===5?'NGŨ LINH PHÂN THÂN':'THẤT LINH PHÂN THÂN',life:1.6,maxLife:1.6,element:this.element.id};this.emit('sound',{name:'ultimate'});return true;
    }
    syncElementClones(count){
      if(!this.isElemental||this.elementSplitTime<=0)return;
      const desired=count||this.elementClones.length+1,p=this.player,previous=new Map(this.elementClones.map(c=>[c.element,c]));
      this.elementClones=forms.filter(f=>f.id!==p.elementForm).slice(0,desired-1).map((f,i)=>{
        if(previous.has(f.id))return previous.get(f.id);
        const a=i/Math.max(1,desired-1)*TAU,position=this.elementSafeSpot(p.x+Math.cos(a)*100,p.y+Math.sin(a)*75)||{x:p.x,y:p.y};
        return{id:'element-ally-'+(++this.elementSerial),element:f.id,...position,r:12,hp:p.maxHp*.42,maxHp:p.maxHp*.42,attackCd:.45+i*.1,skillCd:3.2+i*.17,hurtCd:0,stride:0,facing:p.facing,moving:false,alive:true};
      });
    }
    elementSafeSpot(x,y){
      if(!this.world.collision(x,y,13))return{x,y};for(let r=30;r<=150;r+=30)for(let i=0;i<12;i++){const a=i/12*TAU,nx=x+Math.cos(a)*r,ny=y+Math.sin(a)*r;if(!this.world.collision(nx,ny,13))return{x:nx,y:ny}}return null;
    }
    elementTarget(origin,max=540){const a=Math.atan2(this.input.aimY-origin.y,this.input.aimX-origin.x),d=Math.min(max,Math.hypot(this.input.aimX-origin.x,this.input.aimY-origin.y));return{x:clamp(origin.x+Math.cos(a)*d,40,D.W-40),y:clamp(origin.y+Math.sin(a)*d,40,D.H-40)}}
    shoot(x,y,angle,speed,damage,color,opts={}){super.shoot(x,y,angle,speed,damage,color,opts);const b=this.projectiles[this.projectiles.length-1];if(b){b.element=opts.element||(this.isElemental&&opts.friendly!==false?this.element.id:undefined);b.ally=opts.ally||false}}
    fire(){
      if(!this.isElemental||this.weapon.id!=='prism')return super.fire();
      const p=this.player,s=this.weaponStateActive;if(p.cd.fire>0||p.dashTime>0||s.reload>0)return false;if(s.ammo<=0){this.reloadWeapon();return false}
      p.cd.fire=.28*(p.fireRate/hero.fireRate);s.ammo--;p.recoil=.12;this.tutorial.shots++;
      this.elementPrimary(p,this.element.id,p.damage*(1+(s.level-1)*.18),true);this.emit('sound',{name:'element-'+this.element.id});return true;
    }
    elementPrimary(origin,id,power,charge=false,aim){
      const f=byId(id),a=aim?Math.atan2(aim.y-origin.y,aim.x-origin.x):origin.facing||0,opts={element:id,ally:origin!==this.player,charge,life:1.1,pierce:id==='light'?3:id==='wind'?1:0,kind:'element-'+id,r:id==='earth'?8:5};
      const count=(id==='wind'?3:id==='ice'?2:1)+(charge&&this.player.relics.split?1:0);
      for(let i=0;i<count;i++)this.shoot(origin.x,origin.y,a+(i-(count-1)/2)*.12,id==='light'?1150:id==='earth'?560:810,power*(count>1?.58:1.05),f.color,{...opts,pierce:opts.pierce+(charge&&this.player.relics.pierce?2:0)});
      this.effect('element-muzzle',origin.x,origin.y-22,f.color,28,.16,{element:id,angle:a});
    }
    applyElementStatus(e,id,power=0,strong=false){
      if(!e.alive)return;
      if(id==='fire'){e.burn=Math.max(e.burn||0,2.6);e.burnTick=0}
      if(id==='ice'){e.slow=Math.max(e.slow,1.8);if(strong)e.frozen=Math.max(e.frozen||0,e.type==='boss'?.2:.85)}
      if(id==='nature'){e.poison=Math.max(e.poison||0,3);e.poisonPower=Math.max(e.poisonPower||0,power*.12);if(strong){e.slow=Math.max(e.slow,2.5);e.frozen=Math.max(e.frozen||0,e.type==='boss'?.15:1.3)}}
      if(id==='lightning')e.slow=Math.max(e.slow,.3);
    }
    onBulletHit(b,e){
      super.onBulletHit(b,e);const id=b.element||(this.isElemental?this.element.id:null);if(!id)return;this.applyElementStatus(e,id,b.damage);
      if(id==='lightning'){const next=this.world.enemies.find(n=>n.alive&&n.id!==e.id&&dist(n,e)<155);if(next){this.damageEnemy(next,b.damage*.24,false);this.effect('lightning',e.x,e.y-15,byId(id).color,0,.2,{tx:next.x,ty:next.y-15})}}
      if(id==='earth'){for(const other of this.world.enemies)if(other.alive&&other.id!==e.id&&dist(other,e)<65)this.damageEnemy(other,b.damage*.3,false)}
      if(id==='nature'&&!e.alive&&b.charge!==false)this.player.hp=Math.min(this.player.maxHp,this.player.hp+2);
    }
    elementArea(x,y,r,damage,id,charge=false,strong=false,knock=0){
      for(const e of this.world.enemies)if(e.alive&&Math.hypot(e.x-x,e.y-y)<r+e.r){this.damageEnemy(e,damage,charge);this.applyElementStatus(e,id,damage,strong);if(knock){const a=Math.atan2(e.y-y,e.x-x);e.knockX=Math.cos(a)*knock;e.knockY=Math.sin(a)*knock}}
    }
    scheduleElement(delay,action){this.elementActions.push({delay,...action})}
    elementBeam(origin,target,width,power,id,charge=false){
      const a=Math.atan2(target.y-origin.y,target.x-origin.x),length=Math.min(800,dist(origin,target));let end=length;
      for(let d=24;d<length;d+=12)if(this.world.collision(origin.x+Math.cos(a)*d,origin.y+Math.sin(a)*d,2)){end=d;break}
      const tx=origin.x+Math.cos(a)*end,ty=origin.y+Math.sin(a)*end;
      for(const e of this.world.enemies)if(e.alive){const t=clamp(((e.x-origin.x)*Math.cos(a)+(e.y-origin.y)*Math.sin(a))/Math.max(1,end),0,1);if(Math.hypot(e.x-origin.x-(tx-origin.x)*t,e.y-origin.y-(ty-origin.y)*t)<width+e.r)this.damageEnemy(e,power,charge)}
      this.effect('element-beam',origin.x,origin.y-18,byId(id).color,width,.65,{element:id,tx,ty:ty-18});
    }
    castElement(id,key,origin,scale=1,charge=false,target){
      const f=byId(id),p=this.player,power=p.damage*scale,t=target||this.elementTarget(origin,key==='r'?600:440),a=Math.atan2(t.y-origin.y,t.x-origin.x),leader=origin===p;
      const queue=(delay,action)=>this.scheduleElement(delay,{...action,support:!leader});
      this.effect('element-cast',origin.x,origin.y,f.color,(key==='r'?290:key==='e'?165:95)*(leader?1:.48),key==='r'?1.25:.7,{element:id,key,tx:t.x,ty:t.y,angle:a,support:!leader});
      if(key==='q'){
        if(id==='lightning'){let from={x:origin.x,y:origin.y-20};const targets=this.world.enemies.filter(e=>e.alive&&dist(e,origin)<500).sort((a,b)=>dist(a,t)-dist(b,t)).slice(0,5);if(!targets.length)this.effect('lightning',from.x,from.y,f.color,0,.35,{tx:t.x,ty:t.y-20});for(const e of targets){this.effect('lightning',from.x,from.y,f.color,0,.4,{tx:e.x,ty:e.y-20});this.damageEnemy(e,power*2.5,charge);this.applyElementStatus(e,id,power,true);from={x:e.x,y:e.y-20}}}
        if(id==='wind'||id==='fire'||id==='ice'){const count=id==='wind'?3:id==='fire'?5:9;for(let i=0;i<count;i++)this.shoot(origin.x,origin.y,a+(i-(count-1)/2)*(id==='ice'?.095:.14),id==='wind'?1030:id==='ice'?920:720,power*(id==='wind'?1.6:id==='fire'?1.2:.8),f.color,{element:id,ally:!leader,kind:'element-'+id,pierce:id==='wind'?4:id==='ice'?2:0,r:id==='wind'?8:6,life:1.15,charge})}
        if(id==='earth')for(let i=1;i<=5;i++)queue(i*.08,{type:'blast',x:origin.x+Math.cos(a)*i*78,y:origin.y+Math.sin(a)*i*78,r:75,damage:power*1.4,element:id,charge,strong:true,knock:110});
        if(id==='nature'){this.elementArea(t.x,t.y,165,power*2,id,charge,true);this.effect('element-impact',t.x,t.y,f.color,165,.85,{element:id});for(let i=0;i<5;i++)this.shoot(origin.x,origin.y,a+(i-2)*.12,660,power*.65,f.color,{element:id,kind:'element-nature',pierce:1,charge})}
        if(id==='light')this.elementBeam(origin,t,25,power*3.4,id,charge);
      }else if(key==='e'){
        if(id==='earth'){if(leader){p.shield=Math.min(90,p.shield+45);p.earthArmor=4}this.elementArea(origin.x,origin.y,185,power*1.6,id,charge,false,150)}
        else{this.elementFields.push({element:id,key,owner:leader?'player':origin.id,x:origin.x,y:origin.y,r:id==='ice'?195:165,life:4,tick:0,power:power*.58,charge,follow:!['ice','nature'].includes(id)});if(leader){if(id==='lightning'||id==='ice')p.shield=Math.min(90,p.shield+20);if(id==='light')p.shield=Math.min(90,p.shield+30);if(id==='nature')p.hp=Math.min(p.maxHp,p.hp+25)}this.elementArea(origin.x,origin.y,175,power*.7,id,charge,true)}
      }else if(key==='r'){
        if(id==='lightning')for(let i=0;i<7;i++){const angle=i/7*TAU,rr=i===0?0:130;queue(.12+i*.1,{type:'blast',x:t.x+Math.cos(angle)*rr,y:t.y+Math.sin(angle)*rr,r:108,damage:power*3.3,element:id,charge:false,strong:true})}
        if(id==='wind')this.elementFields.push({element:id,key,owner:leader?'player':origin.id,x:t.x,y:t.y,r:280,life:5,tick:0,power:power*1.1,charge:false,follow:false});
        if(id==='earth'){this.elementArea(origin.x,origin.y,340,power*7.5,id,false,true,230);if(leader)p.shield=Math.min(90,p.shield+35);for(let i=0;i<8;i++){const angle=i/8*TAU;queue(.1+i*.055,{type:'blast',x:origin.x+Math.cos(angle)*230,y:origin.y+Math.sin(angle)*200,r:90,damage:power*1.4,element:id,charge:false,strong:true})}}
        if(id==='fire')for(let i=0;i<3;i++)queue(.2+i*.3,{type:'blast',x:t.x+Math.cos(i*TAU/3)*70,y:t.y+Math.sin(i*TAU/3)*65,r:190,damage:power*3,element:id,charge:false,strong:true});
        if(id==='ice'||id==='nature'){this.elementArea(t.x,t.y,310,power*(id==='ice'?6:5.5),id,false,true);this.elementFields.push({element:id,key,owner:leader?'player':origin.id,x:t.x,y:t.y,r:285,life:4,tick:.4,power:power*.55,charge:false,follow:false});if(id==='nature'&&leader)p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.12)}
        if(id==='light')queue(.24,{type:'beam',x:origin.x,y:origin.y,tx:t.x,ty:t.y,width:75,damage:power*11,element:id,charge:false});
      }
    }
    skill(key){
      if(!this.isElemental)return super.skill(key);if(this.paused||this.dead||!['q','e','r'].includes(key))return false;
      const p=this.player,cost=key==='q'?24:key==='e'?38:0;
      if(key==='r'&&p.ult<100||key!=='r'&&(p.cd[key]>0||p.mp<cost))return false;
      if(key==='r'){p.ult=0;p.invulnerable=Math.max(p.invulnerable,1.2);p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.14);this.clearBullets(p.x,p.y,600);this.elementCinema={name:this.elementClones.length?this.element.r+' · HỢP KÍCH':this.element.r,life:1.8,maxLife:1.8,element:this.element.id}}
      else{p.mp-=cost;p.cd[key]=(key==='q'?6:10)*(p.relics.cooling?.8:1)}
      p.cast=key==='r'?.7:.4;p.castKey=key;this.tutorial.skills++;this.castElement(this.element.id,key,p,1,key!=='r');
      if(key==='r'&&this.elementClones.length){const target=this.elementTarget(p,560);for(const clone of this.elementClones)if(clone.alive)this.castElement(clone.element,'r',clone,.18,false,target);this.effect('element-convergence',target.x,target.y,'#fff4db',300,1.5,{count:this.elementClones.length+1,points:[{x:p.x,y:p.y,element:this.element.id},...this.elementClones.map(c=>({x:c.x,y:c.y,element:c.element}))]});this.scheduleElement(.8,{type:'blast',...target,r:260,damage:p.damage*2.5,element:'light',charge:false,strong:false})}
      this.shake=root.DTSettings?.reducedMotion?0:key==='r'?6:2;this.emit('sound',{name:key==='r'?'ultimate':'element-'+this.element.id});return true;
    }
    damagePlayer(amount){if(this.isElemental&&(this.element.id==='earth'||this.player.earthArmor>0))amount*=.88;super.damagePlayer(amount)}
    updateEnemies(dt){
      const frozen=[];for(const e of this.world.enemies)if(e.alive&&e.frozen>0){frozen.push([e,e.speed]);e.speed*=.08;e.cool=Math.max(.12,e.cool+dt);e.frozen=Math.max(0,e.frozen-dt)}
      try{super.updateEnemies(dt)}finally{for(const[e,speed]of frozen)e.speed=speed}
    }
    updateTelegraphs(dt){for(const t of this.telegraphs)if(t.timer<=dt)for(const clone of this.elementClones)if(clone.alive&&dist(t,clone)<t.r+clone.r)this.damageElementClone(clone,t.damage);super.updateTelegraphs(dt)}
    damageElementClone(clone,amount){if(!clone.alive||clone.hurtCd>0||!Number.isFinite(amount)||amount<=0)return;clone.hp-=amount;clone.hurtCd=.45;if(clone.hp<=0){clone.alive=false;this.effect('element-recall',clone.x,clone.y,byId(clone.element).color,65,.5)}}
    moveEntity(object,dx,dy){if(object.frozen>0){dx*=.08;dy*=.08}return super.moveEntity(object,dx,dy)}
    updateProjectiles(dt){
      for(const field of this.elementFields)if(field.life>0&&['wind','light'].includes(field.element)&&field.key==='e'){
        const owner=field.owner==='player'?this.player:this.elementClones.find(c=>c.id===field.owner&&c.alive),center=field.follow&&owner?owner:field;
        for(const b of this.projectiles)if(!b.friendly&&dist(b,center)<field.r){if(field.element==='light'){b.friendly=true;b.vx*=-1;b.vy*=-1;b.angle=Math.atan2(b.vy,b.vx);b.color=byId('light').color;b.damage*=.8;b.charge=false;b.element='light';b.kind='element-light'}else b.life=0}
      }
      super.updateProjectiles(dt);
      for(const b of this.projectiles)if(!b.friendly&&b.life>0)for(const clone of this.elementClones)if(clone.alive&&dist(b,clone)<b.r+clone.r){this.damageElementClone(clone,b.damage);b.life=0;break}
      this.projectiles=this.projectiles.filter(b=>b.life>0);
    }
    updateElementFields(dt){
      for(const f of this.elementFields){f.life-=dt;f.tick-=dt;const owner=f.owner==='player'?this.player:this.elementClones.find(c=>c.id===f.owner&&c.alive);if(f.follow){if(!owner){f.life=0;continue}f.x=owner.x;f.y=owner.y}
        if(f.tick<=0){f.tick=.5;this.elementArea(f.x,f.y,f.r,f.power,f.element,f.charge,f.element==='ice'||f.element==='nature');
          if(f.element==='nature'&&f.owner==='player'&&dist(this.player,f)<f.r)this.player.hp=Math.min(this.player.maxHp,this.player.hp+2);
          if(f.element==='wind'&&f.key==='r')for(const e of this.world.enemies)if(e.alive&&e.type!=='core'&&dist(e,f)<f.r){const a=Math.atan2(f.y-e.y,f.x-e.x);this.moveEntity(e,Math.cos(a)*18,Math.sin(a)*18)}
          this.effect('element-pulse',f.x,f.y,byId(f.element).color,f.r,.55,{element:f.element});
        }
      }this.elementFields=this.elementFields.filter(f=>f.life>0);
    }
    updateElementClones(dt){
      this.elementSplitTime=Math.max(0,this.elementSplitTime-dt);if(this.elementSplitTime<=0){if(this.elementClones.length)this.effect('element-recall',this.player.x,this.player.y,this.element.color,145,.6);this.elementClones=[];return}
      const p=this.player,alive=this.elementClones.filter(c=>c.alive);
      for(let i=0;i<alive.length;i++){
        const c=alive[i],a=i/Math.max(1,alive.length)*TAU+this.time*.18,target=this.elementSafeSpot(p.x+Math.cos(a)*110,p.y+Math.sin(a)*90)||p,oldX=c.x,oldY=c.y,d=dist(c,target);
        if(d>550){c.x=target.x;c.y=target.y}else if(d>12){const step=Math.min(d,335*dt);this.moveEntity(c,(target.x-c.x)/d*step,(target.y-c.y)/d*step)}
        c.moving=Math.hypot(c.x-oldX,c.y-oldY)>.05;c.stride+=Math.hypot(c.x-oldX,c.y-oldY)*.1;c.attackCd-=dt;c.skillCd-=dt;c.hurtCd=Math.max(0,c.hurtCd-dt);
        const enemy=this.world.enemies.filter(e=>e.alive&&dist(e,c)<560).sort((a,b)=>dist(a,c)-dist(b,c))[0];
        if(enemy){c.facing=Math.atan2(enemy.y-c.y,enemy.x-c.x);if(c.attackCd<=0){c.attackCd=1.05+i*.04;this.elementPrimary(c,c.element,p.damage*.48,false,enemy)}if(c.skillCd<=0){c.skillCd=4.2;this.castElement(c.element,'q',c,.26,false,enemy)}}
        else c.facing=p.facing;
        const contact=this.world.enemies.find(e=>e.alive&&dist(e,c)<e.r+c.r+3);if(contact)this.damageElementClone(c,contact.damage);
      }
      this.elementClones=alive.filter(c=>c.alive);if(!this.elementClones.length)this.elementSplitTime=0;
    }
    update(dt){
      if(this.paused||this.dead||!this.started)return;dt=clamp(dt,0,.04);const time=this.time,p=this.player,speed=p.speed;
      if(this.isElemental&&this.element.id==='wind')p.speed*=1.12;
      try{super.update(dt)}finally{p.speed=speed}if(this.time===time)return;
      for(const e of this.world.enemies)if(e.alive&&e.poison>0){e.poison-=dt;e.poisonTick=(e.poisonTick||0)-dt;if(e.poisonTick<=0){e.poisonTick=.5;this.damageEnemy(e,e.poisonPower||1,false)}}
      this.elementSplitCd=Math.max(0,this.elementSplitCd-dt);p.earthArmor=Math.max(0,(p.earthArmor||0)-dt);if(this.elementCinema){this.elementCinema.life-=dt;if(this.elementCinema.life<=0)this.elementCinema=null}
      const due=[];for(const action of this.elementActions){action.delay-=dt;if(action.delay<=0)due.push(action)}this.elementActions=this.elementActions.filter(a=>a.delay>0);
      for(const action of due){if(action.type==='beam')this.elementBeam(action,{x:action.tx,y:action.ty},action.width,action.damage,action.element,false);else{this.elementArea(action.x,action.y,action.r,action.damage,action.element,action.charge,action.strong,action.knock);this.effect('element-impact',action.x,action.y,byId(action.element).color,action.r*(action.support?.48:1),.9,{element:action.element,support:action.support})}}
      this.updateElementFields(dt);if(this.isElemental)this.updateElementClones(dt);
    }
    travelTo(id){const ok=super.travelTo(id);if(ok){this.elementClones=[];this.elementSplitTime=0;this.elementFields=[];this.elementActions=[]}return ok}
    respawn(){super.respawn();this.elementClones=[];this.elementFields=[];this.elementActions=[];this.elementSplitTime=0;this.elementCinema=null}
    serialize(){const data=super.serialize();if(this.isElemental){data.elementalVersion=4;data.elemental={form:this.element.id,splitCount:this.player.splitCount,remaining:this.elementSplitTime,cooldown:this.elementSplitCd,serial:this.elementSerial,clones:this.elementClones.map(c=>({...c}))}}return data}
    static restore(data){
      const g=Base.restore(data);Object.setPrototypeOf(g,ElementalGame.prototype);g.initElemental();if(g.isElemental){const ex=data.elemental||{};g.player.elementForm=byId(ex.form).id;g.player.splitCount=[3,5,7].includes(ex.splitCount)?ex.splitCount:3;g.elementSplitTime=clamp(Number(ex.remaining)||0,0,14);g.elementSplitCd=clamp(Number(ex.cooldown)||0,0,30);g.elementSerial=Math.max(0,Number(ex.serial)||0);g.applyElement();const seen=new Set([g.element.id]);
        for(const c of Array.isArray(ex.clones)?ex.clones:[]){if(seen.has(c.element)||!forms.some(f=>f.id===c.element)||!Number.isFinite(c.x)||!Number.isFinite(c.y)||!(Number(c.hp)>0)||g.elementClones.length>=g.player.splitCount-1||g.elementSplitTime<=0)continue;seen.add(c.element);const spot=g.elementSafeSpot(clamp(c.x,40,D.W-40),clamp(c.y,40,D.H-40))||g.player;g.elementClones.push({id:'element-ally-'+(++g.elementSerial),element:c.element,x:spot.x,y:spot.y,r:12,hp:clamp(Number(c.hp),1,g.player.maxHp*.42),maxHp:g.player.maxHp*.42,attackCd:clamp(Number(c.attackCd)||0,0,2),skillCd:clamp(Number(c.skillCd)||0,0,5),hurtCd:0,stride:0,facing:0,moving:false,alive:true})}
      }return g;
    }
  }
  root.DTGame=ElementalGame;
})(globalThis);
