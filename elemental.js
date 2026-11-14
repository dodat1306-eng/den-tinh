(function(root){
  'use strict';
  const D=root.DTWorld,C=root.DTContent,Base=root.DTGame,TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const forms=[
    {id:'lightning',name:'Lôi',title:'Lôi Ảnh',color:'#aeacff',accent:'#ffe58e',icon:'ϟ',q:'Điện Quang Trảm',e:'Lôi Ngục Giật Điện',r:'Thiên Lôi Kiếm Trận',desc:'Sét liên hoàn lan mục tiêu; điện trường cấp khiên.',passive:'Đòn đánh lan thêm một tia sét nhỏ.'},
    {id:'wind',name:'Phong',title:'Thiên Phong',color:'#9ef5e3',accent:'#edfff5',icon:'≋',q:'Cuồng Phong Lốc Xoáy',e:'Lướt Ván Gió',r:'Đại Bão Tố',desc:'Phong liêm xuyên, lốc hút và xóa đạn.',passive:'Di chuyển nhanh hơn 12%.'},
    {id:'earth',name:'Thổ',title:'Nham Giáp',color:'#e4b074',accent:'#ffe1aa',icon:'◆',q:'Địa Liệt Nham Trụ',e:'Rung Chấn Nham Giáp',r:'Người Khổng Lồ Đất',desc:'Trụ đá, chấn động, giáp và khiên bền vững.',passive:'Nhận ít hơn 12% sát thương.'},
    {id:'fire',name:'Hỏa',title:'Xích Diệm',color:'#ff9869',accent:'#fff0b2',icon:'♨',q:'Phun Lửa',e:'Thiên Thạch Hỏa Ngục',r:'Cầu Lửa Khổng Lồ',desc:'Hỏa long, vòng lửa và thiên thạch thiêu đốt.',passive:'Đòn đánh để lại thiêu đốt.'},
    {id:'ice',name:'Băng',title:'Băng Tinh',color:'#8bddff',accent:'#eaffff',icon:'❄',q:'Núi Băng Vĩnh Tỏa',e:'Bão Tuyết',r:'Băng Hà Thiên Táng',desc:'Băng châm xuyên, làm chậm và đóng băng.',passive:'Đòn đánh làm chậm; chiêu có thể đóng băng.'},
    {id:'nature',name:'Mộc',title:'Linh Mộc',color:'#a9e898',accent:'#f6e7b0',icon:'❧',q:'Rễ Gai Trói Chân',e:'Dây Leo Khổng Lồ',r:'Thức Tỉnh Rừng Già',desc:'Dây leo trói, hạt độc và hồi phục.',passive:'Hạt mộc gây độc và hồi nhẹ khi hạ quái.'},
    {id:'light',name:'Quang',title:'Thái Dương',color:'#ffe5a5',accent:'#ffffff',icon:'☀',q:'Tốc Độ Ánh Sáng',e:'Tia Năng Lượng Mặt Trời',r:'Thái Dương Diệt Ảnh',desc:'Tia sáng xuyên, phản đạn và pháo thái dương.',passive:'Đạn thường xuyên ba mục tiêu.'}
  ];
  const byId=id=>forms.find(f=>f.id===(id==='wood'?'nature':id))||forms[0];
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
      this.elementClones=[];this.elementSummons=[];this.elementFields=[];this.elementActions=[];this.elementSplitTime=0;this.elementSplitCd=0;this.elementSerial=0;this.elementCinema=null;
      if(!this.isElemental)return;
      const p=this.player;p.elementForm='lightning';p.splitCount=3;p.earthArmor=0;p.hoverboard=0;
      if(fresh)p.weapons=[this.weaponState('prism'),this.weaponState('storm')];this.applyElement();
    }
    applyElement(){const f=this.element;this.hero={...hero,color:f.color,accent:f.accent,q:f.q,e:f.e,r:f.r}}
    transformElement(id){
      if(id==='wood')id='nature';
      if(!this.isElemental||this.dead||!forms.some(f=>f.id===id))return false;if(this.player.elementForm===id)return true;
      const previous=this.player.elementForm;this.player.elementForm=id;this.applyElement();this.syncElementClones();
      this.effect('element-transform',this.player.x,this.player.y,this.element.color,126,.75,{element:id,previous});this.emit('sound',{name:'element-'+id});return true;
    }
    selectSplitCount(count){if(!this.isElemental||![3,5,7].includes(count))return false;this.player.splitCount=count;return true}
    splitElementals(){
      if(!this.isElemental||this.paused||this.dead)return false;
      if(this.elementSplitTime>0){this.elementClones=[];this.elementSummons=this.elementSummons.filter(s=>s.owner==='player');this.elementActions=this.elementActions.filter(a=>!a.owner||a.owner==='player');this.elementSplitTime=0;this.effect('element-recall',this.player.x,this.player.y,this.element.color,150,.65);this.emit('sound',{name:'skill'});return true}
      const n=this.player.splitCount,cost={3:30,5:45,7:60}[n];
      if(this.elementSplitCd>0||this.player.mp<cost){this.emit('toast',{text:this.elementSplitCd>0?'Phân thân đang hồi chiêu.':'Chưa đủ linh lực để phân thân.'});return false}
      this.player.mp-=cost;this.elementSplitCd={3:18,5:24,7:30}[n];this.elementSplitTime={3:10,5:12,7:14}[n];this.syncElementClones(n);this.tutorial.skills++;
      this.effect('element-split',this.player.x,this.player.y,this.element.color,240,.55,{count:n,element:this.element.id});this.elementCinema={name:n===3?'TAM LINH PHÂN THÂN':n===5?'NGŨ LINH PHÂN THÂN':'THẤT LINH PHÂN THÂN',life:1.6,maxLife:1.6,element:this.element.id};this.emit('sound',{name:'ultimate'});return true;
    }
    syncElementClones(count){
      if(!this.isElemental||this.elementSplitTime<=0)return;
      const desired=count||this.elementClones.length+1,p=this.player,previous=new Map(this.elementClones.map(c=>[c.element,c]));
      this.elementClones=forms.filter(f=>f.id!==p.elementForm).slice(0,desired-1).map((f,i)=>{
        if(previous.has(f.id))return previous.get(f.id);
        const a=i/Math.max(1,desired-1)*TAU,position=this.elementSafeSpot(p.x+Math.cos(a)*100,p.y+Math.sin(a)*75)||{x:p.x,y:p.y};
        return this.makeElementClone(f.id,position,i);
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
    elementPrimary(origin,id,power,charge=true,aim){
      const f=byId(id),a=aim?Math.atan2(aim.y-origin.y,aim.x-origin.x):origin.aimAngle??origin.facing??0;
      if(['lightning','earth','ice','nature'].includes(id)){
        origin.comboIndex=((origin.comboIndex??-1)+1)%3;const combo=origin.comboIndex,reach={lightning:115,earth:95,ice:130,nature:175}[id],half={lightning:135,earth:120,ice:155,nature:85}[id]*Math.PI/360;
        if(!origin.moving)this.moveEntity(origin,Math.cos(a)*18,Math.sin(a)*18);
        const inside=e=>{const d=dist(e,origin),delta=Math.atan2(Math.sin(Math.atan2(e.y-origin.y,e.x-origin.x)-a),Math.cos(Math.atan2(e.y-origin.y,e.x-origin.x)-a));return d<=reach+(e.r||0)&&Math.abs(delta)<=half};
        const hits=[];for(const e of this.world.enemies)if(e.alive&&inside(e)){hits.push(e);this.damageEnemy(e,power*(id==='earth'?1.6:id==='ice'?1.45:1.2),charge);this.applyElementStatus(e,id,power,id==='ice'&&combo===2);if(id==='earth'){e.knockX=Math.cos(a)*170;e.knockY=Math.sin(a)*170}if(id==='nature'){e.knockX=-Math.cos(a)*65;e.knockY=-Math.sin(a)*65}}
        if(id==='lightning'&&hits.length){let from=hits[0];for(const e of this.world.enemies.filter(e=>e.alive&&!hits.includes(e)&&dist(e,from)<175).sort((x,y)=>dist(x,from)-dist(y,from)).slice(0,2)){this.damageEnemy(e,power*.65,charge);this.effect('lightning',from.x,from.y,f.color,0,.22,{tx:e.x,ty:e.y});from=e}}
        const destruction=root.DTDestruction;if(destruction){for(const prop of destruction.near(this.world,origin.x,origin.y,reach))if(inside(prop))destruction.hit(this,prop,id==='lightning'||id==='nature'?'wind':id,Math.max(45,power));if(id==='earth'&&combo===2)destruction.react(this,'earth',origin.x+Math.cos(a)*65,origin.y+Math.sin(a)*65,125,110);if(id==='ice'&&combo===2)destruction.react(this,'ice',origin.x+Math.cos(a)*65,origin.y+Math.sin(a)*65,145,power)}
        if(combo===2&&id==='earth')this.elementArea(origin.x,origin.y,125,power*1.25,'earth',charge,true,150);
        this.effect('element-weapon',origin.x,origin.y,f.color,reach,.28,{element:id,angle:a,combo,clip:'weapon_swing_'+id});return;
      }
      const count=(id==='wind'?3:id==='fire'?2:1)+(charge&&this.player.relics.split?1:0),opts={element:id,kind:'element-'+id,owner:origin.id||'player',charge,pierce:id==='light'?2:0,life:1.25,r:id==='light'?4:6};
      for(let i=0;i<count;i++)this.shoot(origin.x,origin.y,a+(i-(count-1)/2)*.12,id==='light'?1150:810,power*(count>1?.58:1.05),f.color,opts);
      this.effect('element-muzzle',origin.x,origin.y-22,f.color,28,.16,{element:id,angle:a});
      if(id==='fire')this.shoot(origin.x,origin.y,a,650,power*.65,f.color,{...opts,returning:false,sourceSkill:'fireball',r:7});
    }
    applyElementStatus(e,id,power=0,strong=false){
      if(!e.alive)return;
      if(id==='fire'){e.burn=Math.max(e.burn||0,2.6);e.burnTick=0}
      if(id==='ice'){e.slow=Math.max(e.slow||0,1.8);if(strong)e.frozen=2}
      if(id==='nature'){e.poison=Math.max(e.poison||0,3);e.poisonPower=Math.max(e.poisonPower||0,power*.12);if(strong){e.slow=Math.max(e.slow,2.5);e.rooted=2.5}}
      if(id==='lightning'){e.slow=Math.max(e.slow||0,.3);if(strong)e.stunned=Math.max(e.stunned||0,.8)}
    }
    onBulletHit(b,e){
      super.onBulletHit(b,e);const id=b.element||(this.isElemental?this.element.id:null);if(!id)return;this.applyElementStatus(e,id,b.damage);
      if(id==='lightning'){let from=e;const seen=new Set([e.id]);for(let i=0;i<2;i++){const next=this.world.enemies.filter(n=>n.alive&&!seen.has(n.id)&&dist(n,from)<155).sort((a,b)=>dist(a,from)-dist(b,from))[0];if(!next)break;seen.add(next.id);this.damageEnemy(next,b.damage*.24,false);this.effect('lightning',from.x,from.y-15,byId(id).color,0,.2,{tx:next.x,ty:next.y-15});from=next}}
      if(id==='earth'){for(const other of this.world.enemies)if(other.alive&&other.id!==e.id&&dist(other,e)<65)this.damageEnemy(other,b.damage*.3,false)}
      if(id==='nature'&&!e.alive&&b.charge!==false)this.player.hp=Math.min(this.player.maxHp,this.player.hp+2);
    }
    elementArea(x,y,r,damage,id,charge=false,strong=false,knock=0){
      root.DTDestruction?.react(this,id,x,y,r,damage);
      for(const e of this.world.enemies)if(e.alive&&Math.hypot(e.x-x,e.y-y)<r+e.r){this.damageEnemy(e,damage,charge);if(charge&&damage>0)this.registerHarmony?.(id);this.applyElementStatus(e,id,damage,strong);if(knock){const a=Math.atan2(e.y-y,e.x-x);e.knockX=Math.cos(a)*knock;e.knockY=Math.sin(a)*knock}}
    }
    scheduleElement(delay,action){const owner=action.owner==='player'?this.player:this.elementClones.find(c=>c.id===action.owner);this.elementActions.push({delay,...action,epoch:owner?.motionEpoch||0})}
    elementBeam(origin,target,width,power,id,charge=false){
      const a=Math.atan2(target.y-origin.y,target.x-origin.x),length=Math.min(800,dist(origin,target));let end=length;
      for(let d=24;d<length;d+=12)if(this.world.collision(origin.x+Math.cos(a)*d,origin.y+Math.sin(a)*d,2)){end=d;break}
      const tx=origin.x+Math.cos(a)*end,ty=origin.y+Math.sin(a)*end;
      root.DTDestruction?.trace(this,id,origin,{x:tx,y:ty},width,power);
      for(const e of this.world.enemies)if(e.alive){const t=clamp(((e.x-origin.x)*Math.cos(a)+(e.y-origin.y)*Math.sin(a))/Math.max(1,end),0,1);if(Math.hypot(e.x-origin.x-(tx-origin.x)*t,e.y-origin.y-(ty-origin.y)*t)<width+e.r){this.damageEnemy(e,power,charge);if(charge&&power>0)this.registerHarmony?.(id);this.applyElementStatus(e,id,power,id==='lightning')}}
      this.effect('element-beam',origin.x,origin.y-18,byId(id).color,width,.65,{element:id,tx,ty:ty-18});
    }
    makeElementClone(element,spot,index=0,saved={}){
      const timer=(key,max,fallback=0)=>Number.isFinite(saved[key])?clamp(saved[key],0,max):fallback;
      return {id:'element-ally-'+(++this.elementSerial),element,x:spot.x,y:spot.y,r:14,radius:14,speed:260,vx:0,vy:0,
        hp:timer('hp',this.player.maxHp*.42,this.player.maxHp*.42),maxHp:this.player.maxHp*.42,
        moveDir:['S','E','N','W'].includes(saved.moveDir)?saved.moveDir:this.player.moveDir||'S',moveFacing:Number.isFinite(saved.moveFacing)?Math.atan2(Math.sin(saved.moveFacing),Math.cos(saved.moveFacing)):this.player.moveFacing||0,aimAngle:0,facing:0,
        attackCd:timer('attackCd',2,.35+index*.1),qCd:timer('qCd',4.8,1+index*.2),eCd:timer('eCd',8,2+index*.25),rCd:timer('rCd',15,4+index*.3),dashCd:timer('dashCd',3),dashTime:0,hurtCd:0,stride:0,action:null,aiState:'regroup',moving:false,alive:true};
    }
    startCloneAction(c,key,target){
      const angle=Math.atan2(target.y-c.y,target.x-c.x),release=key==='attack'?.08:key==='r'?.3:.18;
      c.aimAngle=c.facing=angle;c.action={key,elapsed:0,release,duration:key==='r'?.85:key==='attack'?.32:.6,angle,target:{x:target.x,y:target.y},released:false};
    }
    elementField(kind,origin,extra){
      const f={kind,combat:true,key:'e',owner:origin===this.player?'player':origin.id,element:origin.element||this.element.id,x:origin.x,y:origin.y,r:155,life:4,tick:0,power:0,charge:false,...extra};
      if(this.addField)return this.addField(kind,f.x,f.y,f);this.elementFields.push(f);return f;
    }
    castElement(id,key,origin,scale=1,charge=false,target){
      if(!origin||origin.alive===false||this.dead)return;
      id=byId(id).id;const p=this.player,leader=origin===p,t=target||this.elementTarget(origin,key==='r'?600:480),a=Math.atan2(t.y-origin.y,t.x-origin.x),power=p.damage*scale,f=byId(id),owner=leader?'player':origin.id;
      const field=(kind,extra={})=>this.elementField(kind,origin,{element:id,power,charge:charge&&leader,angle:a,...extra});
      const area=(at,r,m,strong=false,knock=0)=>this.elementArea(at.x,at.y,r,power*m,id,charge&&leader,strong,knock);
      const queue=(delay,extra)=>this.scheduleElement(delay,{owner,...extra,element:id,charge:charge&&leader,support:!leader});
      const beam=(from,to,width,m)=>this.elementBeam(from,to,width,power*m,id,charge&&leader);
      this.effect('element-cast',origin.x,origin.y,f.color,key==='r'?210:95,key==='r'?1:.65,{element:id,key,angle:a,tx:t.x,ty:t.y,support:!leader});
      if(key==='q'){
        if(id==='lightning'){
          const start={x:origin.x,y:origin.y};this.moveEntity(origin,Math.cos(a)*195,Math.sin(a)*195);origin.invulnerable=Math.max(origin.invulnerable||0,.28);
          for(let i=0;i<4;i++)this.effect('element-afterimage',start.x+(origin.x-start.x)*i/4,start.y+(origin.y-start.y)*i/4,f.color,0,.26,{element:id,angle:a});
          beam(start,{x:origin.x+Math.cos(a)*80,y:origin.y+Math.sin(a)*80},28,3.5);
          for(const e of this.world.enemies)if(e.alive&&dist(e,origin)<100)e.stunned=.8;
        }else if(id==='wind'){
          for(const side of [-1,1])field('tornado',{key:'q',x:origin.x+Math.cos(a+side*.35)*36,y:origin.y+Math.sin(a+side*.35)*36,angle:a+side*.18,r:78,life:3.6,power:power*.55,travel:100,behavior:'tornado'});
        }else if(id==='earth'){
          for(let i=1;i<=7;i++)queue(i*.09,{type:'blast',clip:'earth_spikes',x:origin.x+Math.cos(a)*i*58,y:origin.y+Math.sin(a)*i*58,r:60,damage:power*1.7,strong:true,knock:120});
        }else if(id==='ice'){
          area(t,145,3.8,true);this.effect('element-mesh',t.x,t.y,f.color,145,.8,{element:id,clip:'ice_mountain'});
        }else if(id==='nature'){
          area(t,165,2.7,true);field('vine',{x:t.x,y:t.y,r:165,life:2.5,power:power*.35,behavior:'root'});
        }else if(id==='fire')field('breath',{life:1.1,r:210,follow:true,power:power*.75,tick:0,behavior:'fire_breath'});
        else{
          const enemy=this.world.enemies.filter(e=>e.alive&&dist(e,origin)<=520).sort((x,y)=>dist(x,t)-dist(y,t))[0],old={x:origin.x,y:origin.y};let spot=null;
          if(enemy){const ea=Number.isFinite(enemy.facing)?enemy.facing:Math.atan2(origin.y-enemy.y,origin.x-enemy.x);for(const offset of [0,-.3,.3,-.6,.6])for(const extra of [34,64,94]){const x=enemy.x-Math.cos(ea+offset)*(enemy.r+extra),y=enemy.y-Math.sin(ea+offset)*(enemy.r+extra);if(!spot&&!this.world.collision(x,y,origin.r||13))spot={x,y}}}
          else{const d=Math.min(280,dist(origin,t)),angle=Math.atan2(t.y-origin.y,t.x-origin.x);for(let r=d;r>=0&&!spot;r-=14){const x=origin.x+Math.cos(angle)*r,y=origin.y+Math.sin(angle)*r;if(!this.world.collision(x,y,origin.r||13))spot={x,y}}}
          if(spot){origin.x=spot.x;origin.y=spot.y;origin.invulnerable=Math.max(origin.invulnerable||0,.25);origin.motionEpoch=(origin.motionEpoch||0)+1;origin.aimAngle=origin.facing=enemy?Math.atan2(enemy.y-origin.y,enemy.x-origin.x):a;
            this.effect('element-afterimage',old.x,old.y,f.color,0,.25,{element:id,angle:a});this.effect('element-mesh',old.x,old.y,f.color,0,.12,{element:id,clip:'light_flash_step',tx:origin.x,ty:origin.y});
            if(enemy){const crit=p.crit;try{p.crit=1;this.damageEnemy(enemy,power*3,charge&&leader)}finally{p.crit=crit}enemy.stunned=Math.max(enemy.stunned||0,.8);enemy.blind=.8;this.effect('element-mesh',enemy.x,enemy.y,f.color,80,.32,{element:id,clip:'light_backstab_slash'});if(charge&&leader)this.registerHarmony?.(id)}
            else{area(spot,95,2.2,true);this.effect('element-mesh',spot.x,spot.y,f.color,95,.35,{element:id,clip:'light_backstab_slash'})}
          }
        }
      }else if(key==='e'){
        if(id==='lightning')field('sigil',{r:155,life:4,power:power*.9,behavior:'lightning_prison'});
        else if(id==='wind'){origin.hoverboard=4.5;field('vortex',{r:135,life:4.5,follow:true,power:power*.3,behavior:'hoverboard'})}
        else if(id==='earth'){
          for(let i=1;i<=3;i++)queue(i*.12,{type:'blast',clip:'earth_tremor',x:origin.x,y:origin.y,r:70*i,damage:power*1.3,strong:true,knock:150});
          field('wall',{life:.8,r:175,power:0,behavior:'tremor'});if(leader){p.shield=Math.min(110,p.shield+45);p.earthArmor=5}this.shake=root.DTSettings?.reducedMotion?0:4;
        }else if(id==='ice')field('mirror',{x:t.x,y:t.y,r:180,life:4.5,power:power*.65,behavior:'blizzard'});
        else if(id==='fire')field('orbs',{x:t.x,y:t.y,r:155,life:5.5,power:power*.8,meteorDelay:.5,behavior:'meteor'});
        else if(id==='nature'){
          const end={x:origin.x+Math.cos(a)*260,y:origin.y+Math.sin(a)*260};
          for(const e of this.world.enemies)if(e.alive&&dist(e,origin)<260+e.r&&Math.cos(Math.atan2(e.y-origin.y,e.x-origin.x)-a)>=0){this.damageEnemy(e,power*3.8,charge&&leader);e.rooted=2.5;e.knockX=Math.cos(a)*160;e.knockY=Math.sin(a)*160}
          this.effect('element-mesh',origin.x,origin.y,f.color,260,.6,{element:id,clip:'giant_vine',angle:a,tx:end.x,ty:end.y});field('garden',{x:t.x,y:t.y,r:110,life:2,power:power*.3,behavior:'root'});if(leader)p.hp=Math.min(p.maxHp,p.hp+8);
        }else {beam(origin,{x:origin.x+Math.cos(a)*560,y:origin.y+Math.sin(a)*560},28,7);field('mirror',{life:.8,r:155,power:0,follow:true,behavior:'solar'});this.clearBeamBullets(origin,a,560,28)}
      }else if(key==='r'){
        if(id==='lightning'){
          field('swords',{x:t.x,y:t.y,r:165,life:4,power:power*1.1,behavior:'sword_array'});
          for(let i=0;i<8;i++){const at={x:t.x+Math.cos(i*TAU/8)*130,y:t.y+Math.sin(i*TAU/8)*130};queue(i*.1,{type:'blast',clip:'lightning_swords',...at,r:100,damage:power*2,strong:true})}
        }else if(id==='wind'){field('tornado',{x:t.x,y:t.y,r:360,life:5,power:power*.85,behavior:'hurricane'});this.clearBullets(t.x,t.y,360)}
        else if(id==='earth')this.summonElement('golem',origin,t,power,18);
        else if(id==='nature'){
          const trees=(this.world.props||[]).filter(o=>['tree','bamboo','banyan'].includes(o.type)&&dist(o,origin)<320&&!this.elementSummons.some(s=>s.sourceProp===o)).slice(0,3);
          for(let i=trees.length;i<3;i++)this.summonElement('treant',origin,{x:origin.x+Math.cos(i*TAU/3)*65,y:origin.y+Math.sin(i*TAU/3)*65},power,30);
          for(const tree of trees)this.summonElement('treant',origin,tree,power,30,tree);
        }else if(id==='fire')field('orbs',{key:'r',x:t.x,y:t.y,r:200,life:5.5,power:power*1.2,meteorDelay:.5,behavior:'meteor'});
        else if(id==='ice'){area(t,285,5,true);field('mirror',{key:'r',x:t.x,y:t.y,r:285,life:4.5,power:power*.85,behavior:'blizzard'})}
        else{beam(origin,{x:origin.x+Math.cos(a)*560,y:origin.y+Math.sin(a)*560},28,11);this.clearBeamBullets(origin,a,560,28)}
        if(leader)p.invulnerable=Math.max(p.invulnerable,.8);
      }
    }
    clearBeamBullets(origin,angle,length,width){const co=Math.cos(angle),si=Math.sin(angle);this.projectiles=this.projectiles.filter(b=>b.friendly||!((b.x-origin.x)*co+(b.y-origin.y)*si>=0&&(b.x-origin.x)*co+(b.y-origin.y)*si<=length&&Math.abs((b.y-origin.y)*co-(b.x-origin.x)*si)<width+(b.r||0)))}
    summonElement(kind,origin,at,power,life,sourceProp){
      const owner=origin===this.player?'player':origin.id;
      const owned=this.elementSummons.filter(s=>s.owner===owner&&s.kind===kind&&s.life>0);if(owned.length>=(kind==='golem'?1:3))return;
      const spot=this.elementSafeSpot(at.x,at.y)||{x:origin.x,y:origin.y};this.elementSummons.push({id:'element-summon-'+(++this.elementSerial),kind,owner:'player',sourceOwner:owner,...spot,sourceProp,r:kind==='golem'?29:18,hp:kind==='golem'?this.player.maxHp*2:this.player.maxHp,maxHp:kind==='golem'?this.player.maxHp*2:this.player.maxHp,power,life,maxLife:life,attackCd:0,action:null,alive:true,moveDir:'S',moveFacing:Math.PI/2,stride:0});
    }
    updateCombatField(f,dt,clocked=false){
      if(!clocked){f.life-=dt;f.tick-=dt}const owner=f.owner==='player'?this.player:this.elementClones.find(c=>c.id===f.owner&&c.alive);
      if(f.owner&&f.owner!=='player'&&!owner){f.life=0;return}if(f.follow&&owner){f.x=owner.x;f.y=owner.y}if(f.travel){this.moveEntity(f,Math.cos(f.angle)*f.travel*dt,Math.sin(f.angle)*f.travel*dt)}
      if(f.behavior==='fire_breath'){
        f.angle=owner===this.player?this.player.aimAngle:owner?.aimAngle??f.angle;
        if(f.life<=0&&owner)for(let i=-1;i<=1;i++)this.shoot(owner.x,owner.y,f.angle+i*.12,680,f.power*1.8,byId('fire').color,{element:'fire',kind:'element-fire',charge:f.charge,ally:f.owner!=='player',sourceSkill:'q',r:7});
      }
      if(f.tick>0||f.life<=0)return;f.tick=f.behavior==='fire_breath'?.12:.45;
      if(f.behavior==='meteor'&&f.meteorDelay>0){f.meteorDelay-=.45;if(f.meteorDelay<=0){this.elementArea(f.x,f.y,f.r,f.power*5,'fire',f.charge,true,180);this.effect('element-mesh',f.x,f.y,byId('fire').color,f.r,.8,{element:'fire',clip:'meteor_burst'})}return}
      const targets=this.world.enemies.filter(e=>e.alive&&dist(e,f)<f.r+e.r);
      for(const e of targets){
        if(f.behavior==='fire_breath'&&Math.cos(Math.atan2(e.y-f.y,e.x-f.x)-f.angle)<Math.cos(.5))continue;
        this.damageEnemy(e,f.power,f.charge);this.applyElementStatus(e,f.element,f.power,['blizzard','root','lightning_prison'].includes(f.behavior));
        if(f.behavior==='blizzard')e.frozen=2;if(f.behavior==='root')e.rooted=2.5;
        if(['tornado','hurricane'].includes(f.behavior)){const a=Math.atan2(f.y-e.y,f.x-e.x);this.moveEntity(e,Math.cos(a)*26,Math.sin(a)*26)}
        if(f.behavior==='lightning_prison')this.effect('element-mesh',e.x,e.y,byId(f.element).color,45,.3,{element:f.element,clip:'sky_thunder'});
      }
      if(f.behavior==='hoverboard'&&owner){const enemy=this.world.enemies.filter(e=>e.alive&&dist(e,owner)<500).sort((a,b)=>dist(a,owner)-dist(b,owner))[0];if(enemy)this.elementPrimary(owner,'wind',f.power,f.charge,enemy)}
      if(['hurricane','tornado'].includes(f.behavior))this.clearBullets(f.x,f.y,f.r);
      if(f.behavior==='sword_array')for(let i=0;i<4;i++){const a=i*TAU/8;this.elementBeam({x:f.x+Math.cos(a)*f.r,y:f.y+Math.sin(a)*f.r},{x:f.x-Math.cos(a)*f.r,y:f.y-Math.sin(a)*f.r},12,f.power,f.element,false)}
    }
    finishGolemThrow(s,dt,abort=false){
      const b=s.thrown;if(!b)return;b.elapsed+=dt;const enemy=b.enemy;
      if(abort){if(enemy){enemy.throwLift=0;enemy.shadowHeld=false}delete s.thrown;return}
      if(b.elapsed<.25){if(enemy?.alive){enemy.x=s.x;enemy.y=s.y-18;enemy.throwLift=75;enemy.stunned=Math.max(enemy.stunned||0,.2)}return}
      const u=clamp((b.elapsed-.25)/.55,0,1),x=b.x+(b.tx-b.x)*u,y=b.y+(b.ty-b.y)*u;
      b.currentX=x;b.currentY=y;b.height=(1-u)*75+Math.sin(u*Math.PI)*95;
      if(enemy?.alive){enemy.x=x;enemy.y=y;enemy.throwLift=b.height;enemy.stunned=Math.max(enemy.stunned||0,.2)}
      if(u>=1){if(enemy){enemy.throwLift=0;enemy.shadowHeld=false;enemy.stunned=Math.max(enemy.stunned||0,1)}this.elementArea(b.tx,b.ty,120,s.power*3.8,'earth',false,true,150);root.DTDestruction?.react(this,'earth',b.tx,b.ty,120,250);this.effect('element-mesh',b.tx,b.ty,byId('earth').color,120,.65,{element:'earth',clip:'meteor_burst'});delete s.thrown}
    }
    releaseGolem(s,key,enemy){
      const d=root.DTDestruction,angle=s.aimAngle||0,forward={x:s.x+Math.cos(angle)*60,y:s.y+Math.sin(angle)*60};
      if(key==='punch'){this.elementArea(forward.x,forward.y,95,s.power*2.2,'earth',false,true,140);d?.react(this,'earth',forward.x,forward.y,95,125)}
      if(key==='smash'){this.elementArea(forward.x,forward.y,135,s.power*3.4,'earth',false,true,170);d?.react(this,'earth',forward.x,forward.y,135,250);this.effect('element-mesh',forward.x,forward.y,byId('earth').color,135,.65,{element:'earth',clip:'meteor_burst'})}
      if(key==='stomp'){this.elementArea(s.x,s.y,195,s.power*1.8,'earth',false,true,120);for(const e of this.world.enemies)if(e.alive&&dist(s,e)<=195+e.r)e.stunned=Math.max(e.stunned||0,1.5);d?.react(this,'earth',s.x,s.y,220,110);for(let i=1;i<=3;i++)this.effect('element-mesh',s.x,s.y,byId('earth').color,65*i,.25+i*.12,{element:'earth',clip:'earth_tremor'});this.shake=root.DTSettings?.reducedMotion?0:4}
      if(key==='throw'){
        const grabbed=this.world.enemies.filter(e=>e.alive&&!e.sagaBoss&&!e.type.startsWith('boss')&&dist(e,s)<95).sort((a,b)=>dist(a,s)-dist(b,s))[0];
        const targets=this.world.enemies.filter(e=>e.alive&&e!==grabbed&&dist(e,s)>=160&&dist(e,s)<=340).sort((a,b)=>(b.sagaBoss||b.type.startsWith('boss')?100:0)+this.world.enemies.filter(e=>e.alive&&dist(e,b)<120).length-(a.sagaBoss||a.type.startsWith('boss')?100:0)-this.world.enemies.filter(e=>e.alive&&dist(e,a)<120).length);
        const target=targets[0]||enemy,desired=grabbed&&!targets.length?{x:s.x+Math.cos(angle)*240,y:s.y+Math.sin(angle)*240}:target||forward,spot=this.elementSafeSpot(desired.x,desired.y)||desired;
        s.thrown={elapsed:0,x:s.x,y:s.y-18,tx:spot.x,ty:spot.y,currentX:s.x,currentY:s.y-18,height:0,enemy:grabbed||null};if(grabbed){grabbed.shadowHeld=true;grabbed.stunned=Math.max(grabbed.stunned||0,.8)}else d?.decal(this,'crater_mark',s.x,s.y,80);
      }
    }
    updateGolem(s,dt){
      this.finishGolemThrow(s,dt);s.golemCooldowns||={punch:0,smash:0,stomp:0,throw:0};for(const k in s.golemCooldowns)s.golemCooldowns[k]=Math.max(0,s.golemCooldowns[k]-dt);
      const enemies=this.world.enemies.filter(e=>e.alive&&dist(e,s)<650),enemy=enemies.sort((a,b)=>dist(a,s)-dist(b,s))[0];s.moving=false;
      if(s.action?.golem&&!s.action.released&&s.action.elapsed>=s.action.release){s.action.released=true;this.releaseGolem(s,s.action.golem,enemy)}
      if(!s.action&&!s.thrown&&enemy){
        const d=dist(enemy,s),close=enemies.filter(e=>dist(e,s)<160),cd=s.golemCooldowns;let key=null;
        if(cd.stomp<=0&&(close.length>=2||close.some(e=>e.sagaBoss||e.type.startsWith('boss'))))key='stomp';
        else if(cd.throw<=0&&(d<95||d>130&&d<420))key='throw';else if(cd.smash<=0&&d<120)key='smash';else if(cd.punch<=0&&d<95)key='punch';
        if(key){cd[key]={punch:1.1,smash:3.2,stomp:4.8,throw:5.5}[key];s.aimAngle=Math.atan2(enemy.y-s.y,enemy.x-s.x);s.action={key:'attack',golem:key,clip:'golem_'+key,elapsed:0,release:key==='punch'?.14:.22,duration:key==='throw'?.85:.62,angle:s.aimAngle};s.skillUses||={};s.skillUses[key]=(s.skillUses[key]||0)+1}
      }
      const destination=enemy||this.player;if(!s.action&&!s.thrown&&dist(destination,s)>(enemy?75:165)){const a=Math.atan2(destination.y-s.y,destination.x-s.x);s.aimAngle=a;this.faceMovement(s,Math.cos(a),Math.sin(a));this.moveEntity(s,Math.cos(a)*135*dt,Math.sin(a)*135*dt);s.stride+=dt*10}
      for(const b of this.projectiles)if(!b.friendly&&b.life>0&&dist(b,s)<s.r+(b.r||0)){s.hp-=b.damage;b.life=0}
    }
    updateElementSummons(dt){
      for(const s of this.elementSummons){s.life-=dt;if(s.life<=0||s.hp<=0){this.finishGolemThrow(s,0,true);continue;}s.shotCd=Math.max(0,(s.shotCd||0)-dt);s.attackCd=Math.max(0,s.attackCd-dt);if(s.action){s.action.elapsed+=dt;if(s.action.elapsed>=s.action.duration)s.action=null}
        if(s.owner!=='player'&&s.owner&&!this.elementClones.some(c=>c.id===s.owner&&c.alive)){s.life=0;this.finishGolemThrow(s,0,true);continue}
        if(s.kind==='golem'){this.updateGolem(s,dt);continue;}
        const enemy=this.world.enemies.filter(e=>e.alive&&dist(e,s)<600).sort((a,b)=>dist(a,s)-dist(b,s))[0];s.moving=false;
        if(enemy){const d=dist(enemy,s),dx=(enemy.x-s.x)/Math.max(1,d),dy=(enemy.y-s.y)/Math.max(1,d);s.aimAngle=Math.atan2(dy,dx);
          if(d>75){this.faceMovement(s,dx,dy);this.moveEntity(s,dx*(s.kind==='golem'?135:190)*dt,dy*(s.kind==='golem'?135:190)*dt);s.stride+=dt*10}
          if(d<110&&s.attackCd<=0){s.attackCd=s.kind==='golem'?1.3:1;s.action={key:'attack',elapsed:0,release:.001,duration:.55,angle:s.aimAngle};this.elementArea(enemy.x,enemy.y,s.kind==='golem'?100:80,s.power*(s.kind==='golem'?2.3:1.5),s.kind==='golem'?'earth':'nature',false,true,100)}
        }
        if(enemy&&s.kind==='treant'&&s.shotCd<=0){s.shotCd=1.4;this.shoot(s.x,s.y,s.aimAngle,580,s.power*.65,byId('nature').color,{element:'nature',owner:s.id,kind:'element-nature',charge:false,pierce:1})}
        if(s.kind==='golem')for(const b of this.projectiles)if(!b.friendly&&b.life>0&&dist(b,s)<s.r+(b.r||0)){s.hp-=b.damage;b.life=0}
        if(s.hp<=0)s.life=0;
      }
      this.elementSummons=this.elementSummons.filter(s=>s.life>0);
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
    damagePlayer(amount){if(this.isElemental&&(this.element.id==='earth'||this.player.earthArmor>0))amount*=.88;const golem=this.elementSummons?.find(s=>s.kind==='golem'&&s.hp>0&&dist(s,this.player)<220);if(golem&&this.player.invulnerable<=0){const absorb=Math.min(golem.hp,amount*.6);golem.hp-=absorb;amount-=absorb}super.damagePlayer(amount)}
    updateEnemies(dt){
      const held=this.world.enemies.filter(e=>e.alive&&(e.frozen>0||e.stunned>0));for(const e of held)e.alive=false;
      try{super.updateEnemies(dt)}finally{for(const e of held){e.alive=true;const was=e.frozen;e.frozen=Math.max(0,(e.frozen||0)-dt);e.stunned=Math.max(0,(e.stunned||0)-dt);if(was>0&&e.frozen===0)this.effect('element-mesh',e.x,e.y,byId('ice').color,55,.25,{element:'ice',clip:'ice_shatter'})}}
    }
    updateTelegraphs(dt){for(const t of this.telegraphs)if(t.timer<=dt)for(const clone of this.elementClones)if(clone.alive&&dist(t,clone)<t.r+clone.r)this.damageElementClone(clone,t.damage);super.updateTelegraphs(dt)}
    damageElementClone(clone,amount){if(!clone.alive||clone.invulnerable>0||clone.hurtCd>0||!Number.isFinite(amount)||amount<=0)return;clone.hp-=amount;clone.hurtCd=.45;if(clone.hp<=0){clone.alive=false;this.effect('element-recall',clone.x,clone.y,byId(clone.element).color,65,.5)}}
    moveEntity(object,dx,dy){if(object.frozen>0||object.rooted>0||object.rootHeld)return;return super.moveEntity(object,dx,dy)}
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
      for(const f of this.elementFields){if(f.combat)this.updateCombatField(f,dt);else{f.life-=dt;f.tick-=dt;if(f.tick<=0){f.tick=.5;this.elementArea(f.x,f.y,f.r,f.power,f.element,f.charge,f.element==='ice'||f.element==='nature')}}}this.elementFields=this.elementFields.filter(f=>f.life>0);
    }
    updateElementClones(dt){
      this.elementSplitTime=Math.max(0,this.elementSplitTime-dt);if(this.elementSplitTime<=0){if(this.elementClones.length)this.effect('element-recall',this.player.x,this.player.y,this.element.color,145,.6);this.elementClones=[];return}
      const p=this.player,alive=this.elementClones.filter(c=>c.alive),assigned=new Map(),enemies=this.world.enemies.filter(e=>e.alive);
      for(let i=0;i<alive.length;i++){
        const c=alive[i],ox=c.x,oy=c.y;for(const key of ['attackCd','qCd','eCd','rCd','dashCd','hurtCd','hoverboard','invulnerable'])c[key]=Math.max(0,(c[key]||0)-dt);
        if(dist(c,p)>850){const spot=this.elementSafeSpot(p.x+(i%2?110:-110),p.y)||p;c.x=spot.x;c.y=spot.y;c.action=null;c.motionEpoch=(c.motionEpoch||0)+1;this.elementActions=this.elementActions.filter(a=>a.owner!==c.id)}
        const ranged=['wind','nature'].includes(c.element),melee=['lightning','earth','ice'].includes(c.element),range=melee?60:ranged?235:148;
        const candidates=enemies.filter(e=>dist(e,c)<=550&&dist(e,p)<1000),score=e=>dist(e,c)+(e.type==='boss'||e.sagaBoss||e.elite?0:(assigned.get(e.id)||0)*300)+(c.targetId===e.id?-35:0);
        candidates.sort((a,b)=>score(a)-score(b));const target=candidates[0];if(target){c.targetId=target.id;assigned.set(target.id,(assigned.get(target.id)||0)+1);c.aimAngle=c.facing=Math.atan2(target.y-c.y,target.x-c.x)}else c.targetId=null;
        let dx=0,dy=0;
        const danger=[...this.telegraphs,...this.sagaTelegraphs||[],...this.eliteHazards||[]].find(t=>(t.timer??t.life??1)>0&&dist(t,c)<(t.r||t.radius||0)+c.r+12);
        if(danger){const d=dist(c,danger),a=d>.01?Math.atan2(c.y-danger.y,c.x-danger.x):i/Math.max(1,alive.length)*TAU;dx=Math.cos(a);dy=Math.sin(a);c.aiState='flank';if(c.dashCd<=0){c.dashCd=2.4;c.dashTime=.19;c.dashX=dx;c.dashY=dy;c.action=null;c.invulnerable=.22}}
        else if(target){const d=dist(c,target),nx=(target.x-c.x)/Math.max(d,1),ny=(target.y-c.y)/Math.max(d,1);c.aiState=ranged&&d<100?'kite':melee?'hunt':'flank';const radial=d>range+18?1:d<range-18?-1:0;dx=nx*radial;dy=ny*radial;if(!melee){const side=i%2?1:-1;dx-=ny*.6*side;dy+=nx*.6*side}
          if(melee&&d>200&&c.dashCd<=0){c.dashCd=2.8;c.dashTime=.19;c.dashX=nx;c.dashY=ny}
        }else{c.aiState='regroup';const a=i/Math.max(1,alive.length)*TAU,t={x:p.x+Math.cos(a)*115,y:p.y+Math.sin(a)*115},d=dist(c,t);if(d>18){dx=(t.x-c.x)/d;dy=(t.y-c.y)/d}}
        for(const other of alive)if(other!==c){const d=dist(c,other);if(d>0&&d<35){dx+=(c.x-other.x)/d*.6;dy+=(c.y-other.y)/d*.6}}
        const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len}this.faceMovement(c,dx,dy);
        if(c.dashTime>0){c.dashTime=Math.max(0,c.dashTime-dt);this.moveEntity(c,c.dashX*730*dt,c.dashY*730*dt)}else this.moveEntity(c,dx*c.speed*(c.hoverboard>0?1.65:1)*dt,dy*c.speed*(c.hoverboard>0?1.65:1)*dt);
        c.vx=(c.x-ox)/Math.max(.001,dt);c.vy=(c.y-oy)/Math.max(.001,dt);c.velocityX=c.vx;c.velocityY=c.vy;c.stride+=Math.hypot(c.x-ox,c.y-oy)*.1;
        if(c.action){const a=c.action;a.elapsed+=dt;if(!a.released&&a.elapsed>=a.release){a.released=true;if(a.key==='attack')this.elementPrimary(c,c.element,p.damage*.62,false,a.target);else this.castElement(c.element,a.key,c,.62,false,a.target)}if(a.elapsed>=a.duration)c.action=null}
        if(target&&!c.action&&!danger){const d=dist(c,target),cluster=candidates.filter(e=>dist(e,target)<175).length,heavy=target.type==='boss'||target.sagaBoss||target.elite||target.hp>=p.damage*18;
          if(c.rCd<=0&&(heavy||cluster>=3)){c.rCd=11+i*.6;this.startCloneAction(c,'r',target)}
          else if(c.eCd<=0&&(heavy||cluster>=2)){c.eCd=5.8+i*.35;this.startCloneAction(c,'e',target)}
          else if(c.qCd<=0&&d<500){c.qCd=3.2+i*.25;this.startCloneAction(c,'q',target)}
          else if(c.attackCd<=0&&d<(melee?105:ranged?360:280)){c.attackCd=.65+i*.03;this.startCloneAction(c,'attack',target)}
        }
        if(!c.invulnerable){const contact=enemies.find(e=>dist(e,c)<e.r+c.r+3);if(contact)this.damageElementClone(c,contact.damage)}
      }
      this.elementClones=alive.filter(c=>c.alive);if(!this.elementClones.length)this.elementSplitTime=0;
    }
    update(dt){
      if(this.paused||this.dead||!this.started)return;dt=clamp(dt,0,.04);const time=this.time,p=this.player,speed=p.speed;
      if(this.isElemental&&this.element.id==='wind')p.speed*=1.12;if(p.hoverboard>0)p.speed*=1.65;
      try{super.update(dt)}finally{p.speed=speed}if(this.time===time)return;
      for(const e of this.world.enemies)if(e.alive&&e.poison>0){e.poison-=dt;e.poisonTick=(e.poisonTick||0)-dt;if(e.poisonTick<=0){e.poisonTick=.5;this.damageEnemy(e,e.poisonPower||1,false)}}
      this.elementSplitCd=Math.max(0,this.elementSplitCd-dt);p.earthArmor=Math.max(0,(p.earthArmor||0)-dt);if(this.elementCinema){this.elementCinema.life-=dt;if(this.elementCinema.life<=0)this.elementCinema=null}
      const due=[];for(const action of this.elementActions){action.delay-=dt;if(action.delay<=0)due.push(action)}this.elementActions=this.elementActions.filter(a=>a.delay>0);
      for(const action of due){const owner=action.owner==='player'?p:this.elementClones.find(c=>c.id===action.owner&&c.alive);if(action.owner&&(!owner||(owner.motionEpoch||0)!==action.epoch))continue;if(action.type==='beam')this.elementBeam(action,{x:action.tx,y:action.ty},action.width,action.damage,action.element,false);else{this.elementArea(action.x,action.y,action.r,action.damage,action.element,action.charge,action.strong,action.knock);this.effect(action.clip?'element-mesh':'element-impact',action.x,action.y,byId(action.element).color,action.r,.9,{element:action.element,support:action.support,clip:action.clip})}}
      this.updateElementFields(dt);if(this.isElemental){this.updateElementClones(dt);this.updateElementSummons(dt)}p.hoverboard=Math.max(0,(p.hoverboard||0)-dt);
    }
    travelTo(id){const ok=super.travelTo(id);if(ok){this.elementClones=[];this.elementSummons=[];this.elementSplitTime=0;this.elementFields=[];this.elementActions=[];this.player.hoverboard=0;this.player.motionEpoch=(this.player.motionEpoch||0)+1}return ok}
    respawn(){super.respawn();this.elementClones=[];this.elementSummons=[];this.elementFields=[];this.elementActions=[];this.elementSplitTime=0;this.elementCinema=null}
    serialize(){const data=super.serialize();if(this.isElemental){data.elementalVersion=4;data.elemental={form:this.element.id,splitCount:this.player.splitCount,remaining:this.elementSplitTime,cooldown:this.elementSplitCd,serial:this.elementSerial,clones:this.elementClones.map(c=>({element:c.element,x:c.x,y:c.y,hp:c.hp,moveDir:c.moveDir,moveFacing:c.moveFacing,aimAngle:c.aimAngle,attackCd:c.attackCd,qCd:c.qCd,eCd:c.eCd,rCd:c.rCd,dashCd:c.dashCd}))}}return data}
    static restore(data){
      const g=Base.restore(data);Object.setPrototypeOf(g,ElementalGame.prototype);g.initElemental();if(g.isElemental){const ex=data.elemental||{};g.player.elementForm=byId(ex.form).id;g.player.splitCount=[3,5,7].includes(ex.splitCount)?ex.splitCount:3;g.elementSplitTime=clamp(Number(ex.remaining)||0,0,14);g.elementSplitCd=clamp(Number(ex.cooldown)||0,0,30);g.elementSerial=Number.isSafeInteger(ex.serial)&&ex.serial>=0?ex.serial:0;g.applyElement();const seen=new Set([g.element.id]);
        for(const c of Array.isArray(ex.clones)?ex.clones:[]){if(seen.has(c.element)||!forms.some(f=>f.id===c.element)||!Number.isFinite(c.x)||!Number.isFinite(c.y)||!(Number(c.hp)>0)||g.elementClones.length>=g.player.splitCount-1||g.elementSplitTime<=0)continue;seen.add(c.element);const spot=g.elementSafeSpot(clamp(c.x,40,D.W-40),clamp(c.y,40,D.H-40))||g.player;g.elementClones.push(g.makeElementClone(c.element,spot,g.elementClones.length,c))}
      }return g;
    }
  }
  root.DTGame=ElementalGame;
})(globalThis);
