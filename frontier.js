(function(root){
  'use strict';
  const D=root.DTWorld,Base=root.DTGame,C=root.DTContent,TAU=Math.PI*2;
  const originalWorld=D.makeWorld,originalZone=D.zoneAt,coreWidth=D.W,coreHeight=D.H;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const extraZones=[
    {id:'waterfall',name:'Thác Ngọc',sub:'NƯỚC KỂ CHUYỆN CỦA TRỜI',color:'#377a79',center:[5120,910]},
    {id:'valley',name:'Thung Lũng Đèn',sub:'NGÀN ĐỐM LỬA TRÊN ĐỒNG GIÓ',color:'#71835d',center:[2550,3500]},
    {id:'ruins',name:'Phế Tích Thiên Cơ',sub:'NHỮNG CỖ MÁY CÒN NHỚ',color:'#556c84',center:[5350,2900]}
  ];
  const routes=[
    [[3090,690],[3780,700],[4270,1020],[4830,1020],[5230,1000],[5960,1440]],
    [[3100,2090],[3780,2200],[4300,1810],[4830,1810],[5400,2400],[5430,3000]],
    [[1260,2510],[1570,2920],[2180,3350],[2860,3540],[3580,3480],[4260,3300],[5430,3000]],
    [[5230,1000],[5810,1670],[5820,2410],[5430,3000],[5900,3690]],
    [[2860,3540],[2780,4070],[3620,4090],[4260,3300]]
  ];
  const beacons=[
    {id:'home',name:'Trạm Làng Đèn',x:1120,y:2550,zone:'village',color:'#f2d28f',reward:null},
    {id:'jade',name:'Đèn Thác Ngọc',x:5230,y:1000,zone:'waterfall',color:'#8ce7e0',reward:'chain'},
    {id:'wind',name:'Đèn Đồng Gió',x:2860,y:3540,zone:'valley',color:'#f5d894',reward:'haste'},
    {id:'machine',name:'Đèn Thiên Cơ',x:5430,y:3000,zone:'ruins',color:'#b8b5ff',reward:'cooling'}
  ];
  const bridges=[{x:4650,y:1020,w:410,h:130},{x:4650,y:1810,w:410,h:130}];
  function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=clamp(((x-a[0])*dx+(y-a[1])*dy)/l,0,1);return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)}
  function nearRoutes(x,y,r){return routes.some(p=>p.some((b,i)=>i&&segmentDistance(x,y,p[i-1],b)<r))}
  const nearCorePath=D.nearPath;
  D.W=6400;D.H=4480;D.ZONES.push(...extraZones);
  D.zoneAt=(x,y)=>x>=coreWidth?(y<2020?extraZones[0]:extraZones[2]):y>=coreHeight?extraZones[1]:originalZone(x,y);
  D.nearPath=(x,y,r)=>nearCorePath(x,y,r)||nearRoutes(x,y,r);
  const riverX=y=>4650+Math.sin((y-1020)/185)*42;
  function riverAt(x,y,margin=0){return y>270-margin&&y<1960+margin&&Math.abs(x-riverX(y))<103+margin}
  function onBridge(x,y,r=0){return bridges.some(b=>Math.abs(x-b.x)<b.w/2-r&&Math.abs(y-b.y)<b.h/2-r)}
  function waterCollision(x,y,r){return riverAt(x,y,r)&&!onBridge(x,y,r)}
  D.frontier={zones:extraZones,routes,beacons,bridges,riverAt,riverX,onBridge,coreWidth,coreHeight};
  D.makeWorld=function(seed){
    const world=originalWorld(seed),rng=D.rand(world.seed+920311),props=world.props;
    world.width=D.W;world.height=D.H;world.paths=[...world.paths,...routes];world.beacons=beacons.map(b=>({...b}));
    world.landmarks=[
      {type:'waterfall',x:4650,y:420,r:76},
      {type:'ruinGate',x:5400,y:2450,r:0},
      {type:'windmill',x:2190,y:3250,r:28},
      {type:'pagoda',x:5920,y:3650,r:65}
    ];
    function add(type,x,y,r=0,variant){props.push({id:'frontier-prop-'+props.length,type,x,y,r,variant:variant??Math.floor(rng()*4)})}
    // Preserve the old seed layout and IDs. New decoration only occupies new land.
    for(let i=0;i<1900;i++){
      const x=70+rng()*(D.W-140),y=70+rng()*(D.H-140);
      if(x<coreWidth&&y<coreHeight||D.nearPath(x,y,85)||riverAt(x,y,125)||beacons.some(b=>distance(b,{x,y})<245))continue;
      const zone=D.zoneAt(x,y).id,pick=rng();
      const type=zone==='waterfall'?(pick<.44?'willow':pick<.7?'fern':pick<.88?'rock':'crystal'):zone==='valley'?(pick<.25?'tree':pick<.58?'reed':pick<.89?'flower':'lanternPost'):(pick<.32?'pine':pick<.61?'pillar':pick<.83?'rock':'crystal');
      add(type,x,y,['tree','willow','pine'].includes(type)?18:type==='pillar'?20:type==='rock'?17:type==='crystal'?15:0);
    }
    for(const b of beacons.slice(1)){
      for(let j=0;j<8;j++){const a=j/8*TAU;add(b.zone==='ruins'?'pillar':b.zone==='valley'?'lanternPost':'crystal',b.x+Math.cos(a)*195,b.y+Math.sin(a)*170,j%2?0:12,j%4)}
    }
    for(const l of world.landmarks)add(l.type,l.x,l.y,l.r,0);
    const grid=new Map(),cell=96;
    for(const p of props)if(p.r>0){const key=Math.floor(p.x/cell)+','+Math.floor(p.y/cell);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(p)}
    world.collision=function(x,y,r=13){
      if(!Number.isFinite(x)||!Number.isFinite(y)||x<r+24||y<r+24||x>D.W-r-24||y>D.H-r-24||waterCollision(x,y,r))return true;
      const gx=Math.floor(x/cell),gy=Math.floor(y/cell);
      for(let i=gx-2;i<=gx+2;i++)for(let j=gy-2;j<=gy+2;j++)for(const p of grid.get(i+','+j)||[])if(Math.hypot(x-p.x,y-p.y)<p.r+r)return true;
      return false;
    };
    function clearSpot(x,y,r=22){if(!world.collision(x,y,r))return{x,y};for(let d=36;d<=240;d+=24)for(let n=0;n<16;n++){const a=n/16*TAU,nx=x+Math.cos(a)*d,ny=y+Math.sin(a)*d;if(!world.collision(nx,ny,r))return{x:nx,y:ny}}return null}
    for(let i=0;i<18;i++){
      let spot=null;
      for(let n=0;n<80&&!spot;n++){const x=150+rng()*(D.W-300),y=150+rng()*(D.H-300);if(x<coreWidth&&y<coreHeight||beacons.some(b=>distance(b,{x,y})<260))continue;spot=clearSpot(x,y)}
      if(spot)world.chests.push({id:'frontier-chest-'+i,...spot,open:false});
    }
    for(let i=0;i<16;i++){
      let center=null;
      for(let n=0;n<80&&!center;n++){const x=200+rng()*(D.W-400),y=200+rng()*(D.H-400);if(x<coreWidth&&y<coreHeight||beacons.some(b=>distance(b,{x,y})<400))continue;center=clearSpot(x,y)}
      if(!center)continue;
      for(let j=0;j<3;j++){
        const pos=clearSpot(center.x+Math.cos(j*2.1)*45,center.y+Math.sin(j*2.1)*45);if(!pos)continue;
        const type=['shade','archer','wisp'][(i+j)%3],hp=type==='shade'?92:70;
        world.enemies.push({id:'frontier-roam-'+i+'-'+j,type,...pos,homeX:pos.x,homeY:pos.y,r:15,hp,maxHp:hp,speed:type==='archer'?70:105,damage:12,xp:18,gold:7,alive:true,cool:1+rng()*2,phase:0,timer:0,hit:0,slow:0,knockX:0,knockY:0,frontier:true});
      }
    }
    return world;
  };
  class FrontierGame extends Base{
    constructor(hero,seed){super(hero,seed);this.initFrontier()}
    initFrontier(){
      this.outposts={};for(const b of beacons)this.outposts[b.id]={discovered:b.id==='home',started:false,complete:b.id==='home',claimed:b.id==='home',wave:0,nextWave:0,ids:[]};
      this.frontierCombat=false;this.footstepDistance=0;this.ghostTimer=0;
      Object.assign(this.player,{stride:0,lean:0,velocityX:0,velocityY:0,cast:0,castKey:''});
    }
    fire(){const ok=super.fire();if(ok)this.effect('muzzle',this.player.x,this.player.y-22,this.weapon.color,34,.12,{angle:this.player.facing,kind:this.weapon.kind});return ok}
    skill(key){const ok=super.skill(key);if(ok){const p=this.player;p.cast=key==='r'?.7:.4;p.castKey=key;this.effect('skillflare',p.x,p.y,this.hero.color,key==='r'?330:key==='e'?155:100,key==='r'?1.05:.65,{hero:this.hero.id,key,angle:p.facing});}return ok}
    dash(){const ok=super.dash();if(ok){this.ghostTimer=0;this.effect('dashwake',this.player.x,this.player.y,this.hero.color,90,.35,{angle:Math.atan2(this.player.dashY,this.player.dashX)})}return ok}
    onBulletHit(b,e){super.onBulletHit(b,e);if(this.effects.length<130)this.effect('impact',e.x,e.y-e.r*.6,b.color,28,.18,{angle:b.angle,kind:b.kind})}
    damageEnemy(e,amount,charge=true){const was=e.alive;super.damageEnemy(e,amount,charge);if(was&&!e.alive)this.effect('soulburst',e.x,e.y-15,e.frontier?'#a8d8fb':this.hero.color,48,.5)}
    nearby(){
      const base=super.nearby(),p=this.player,b=this.world.beacons.filter(b=>distance(p,b)<108).sort((a,b)=>distance(p,a)-distance(p,b))[0];
      if(!b||base&&distance(p,b)>70&&distance(p,base)<distance(p,b)-10)return base;
      const s=this.outposts[b.id],remaining=s.ids.filter(id=>this.world.enemies.some(e=>e.id===id&&e.alive)).length;
      return{...b,beacon:true,label:s.claimed?b.name+' · Mở dịch chuyển':s.complete?b.name+' · Nhận di vật và mở trạm':s.started?b.name+' · Đợt '+s.wave+'/2 · '+remaining+' hộ vệ':b.name+' · Thanh tẩy hai đợt hộ vệ'};
    }
    interact(){
      if(this.paused||this.dead)return false;const o=this.nearby();if(!o?.beacon)return super.interact();
      const state=this.outposts[o.id];
      if(state.claimed){this.emit('travel');return true}
      if(state.complete){state.claimed=true;this.player.gold+=75;this.grantRelic(o.reward);this.player.hp=this.player.maxHp;this.player.mp=this.player.maxMp;this.unlock('outpost-'+o.id,'Thắp sáng '+o.name);this.effect('skillflare',o.x,o.y,o.color,210,1,{hero:this.hero.id,key:'r',angle:0});this.emit('toast',{text:o.name+' đã sáng! +75 xu. Có thể dịch chuyển giữa các trạm đã mở.',reward:true});return true}
      if(state.started)return false;
      state.started=true;state.discovered=true;state.wave=0;state.ids=[];this.spawnOutpostWave(o,state);this.emit('sound',{name:'challenge'});return true;
    }
    spawnOutpostWave(b,state){
      state.wave++;state.ids=[];state.nextWave=1.2;
      const count=state.wave===1?4:5;
      for(let i=0;i<count;i++){
        const a=i/count*TAU+state.wave*.7,hp=65+state.wave*18+this.run*22,type=(i+(b.id==='machine'?1:0))%3===0?'archer':i%2?'shade':'wisp';
        const e=this.spawnEnemy(type,b.x+Math.cos(a)*245,b.y+Math.sin(a)*230,{frontier:true,outpost:b.id,hp,maxHp:hp,xp:12,gold:5,damage:11+state.wave,speed:type==='archer'?68:105});state.ids.push(e.id);
      }
      this.effect('skillflare',b.x,b.y,b.color,230,.7,{hero:b.id==='machine'?'hoavi':b.id==='jade'?'linh':'an',key:'e',angle:0});
      this.emit('toast',{text:b.name+' · Đợt '+state.wave+'/2. Đánh bại các hộ vệ để mở trạm.'});
    }
    travelTo(id){
      const source=this.nearby(),target=this.world.beacons.find(b=>b.id===id);
      if(this.dead||!source?.beacon||!this.outposts[source.id].claimed||!target||!this.outposts[id].claimed)return false;
      let arrival=null;for(const dy of[50,95,115,-95])if(!this.world.collision(target.x,target.y+dy,this.player.r)){arrival={x:target.x,y:target.y+dy};break}if(!arrival)return false;
      this.player.x=arrival.x;this.player.y=arrival.y;this.player.invulnerable=Math.max(1,this.player.invulnerable);this.projectiles=[];this.telegraphs=[];this.activeEffects=[];this.player.firewall=0;this.player.dashTime=0;this.player.dashX=0;this.player.dashY=0;this.player.velocityX=0;this.player.velocityY=0;this.player.lean=0;this.input.dx=0;this.input.dy=0;
      this.effect('skillflare',arrival.x,arrival.y,target.color,150,.7,{hero:this.hero.id,key:'e',angle:0});this.emit('toast',{text:'Đã đến '+target.name+'.'});this.emit('sound',{name:'ultimate'});return true;
    }
    update(dt){
      if(this.paused||this.dead||!this.started)return;dt=clamp(dt,0,.04);
      this.frontierCombat=extraZones.some(z=>z.id===D.zoneAt(this.player.x,this.player.y).id)&&this.world.enemies.some(e=>e.alive&&e.frontier&&distance(e,this.player)<850);
      const p=this.player,oldX=p.x,oldY=p.y,time=this.time;super.update(dt);if(this.time===time)return;
      p.cast=Math.max(0,p.cast-dt);
      const moved=Math.hypot(p.x-oldX,p.y-oldY),blend=1-Math.exp(-14*dt);p.velocityX+=((p.x-oldX)/dt-p.velocityX)*blend;p.velocityY+=((p.y-oldY)/dt-p.velocityY)*blend;p.lean+=(clamp(p.velocityX/p.speed,-1,1)*.1-p.lean)*blend;p.stride+=moved*.085;
      for(const e of this.world.enemies)if(e.alive){if(e.drawX!==undefined){const moved=Math.hypot(e.x-e.drawX,e.y-e.drawY);e.walkPhase=(e.walkPhase||0)+moved*.11;e.visualMoving=moved>.05}e.drawX=e.x;e.drawY=e.y;}
      this.footstepDistance+=moved;
      if(!root.DTSettings?.reducedMotion){
        if(p.dashTime>0){this.ghostTimer-=dt;if(this.ghostTimer<=0){this.ghostTimer=.035;this.effect('afterimage',oldX,oldY,this.hero.color,30,.22,{facing:p.facing,stride:p.stride,hero:this.hero.id})}}
        else if(this.footstepDistance>34&&moved>.3){this.footstepDistance=0;this.effect('footstep',p.x,p.y,D.zoneAt(p.x,p.y).id==='waterfall'?'#9ddfdd':'#c5b78c',13,.35,{side:Math.sin(p.stride)>0?1:-1})}
      }
      for(const b of this.world.beacons){
        const state=this.outposts[b.id];
        if(!state.discovered&&distance(b,p)<480){state.discovered=true;this.emit('toast',{text:'Khám phá '+b.name+'. Nhấn F tại đèn để bắt đầu thử thách.',reward:true})}
        if(!state.started||state.complete)continue;
        if(!state.ids.some(id=>this.world.enemies.some(e=>e.id===id&&e.alive))){if(state.wave<2){state.nextWave-=dt;if(state.nextWave<=0)this.spawnOutpostWave(b,state)}else{state.complete=true;this.emit('toast',{text:'Hộ vệ đã tan! Trở lại '+b.name+' và nhấn F nhận di vật.',reward:true})}}
      }
    }
    objective(){
      if(!this.tutorialDone)return super.objective();
      const zone=D.zoneAt(this.player.x,this.player.y),b=this.world.beacons.find(b=>b.zone===zone.id&&b.id!=='home'),s=b&&this.outposts[b.id];
      if(b&&!s.claimed)return{title:'Khám phá · '+b.name,text:s.complete?'Hộ vệ đã tan. Nhấn F cạnh đèn để nhận di vật và mở dịch chuyển.':s.started?'Đợt '+s.wave+'/2 · '+s.ids.filter(id=>this.world.enemies.some(e=>e.id===id&&e.alive)).length+' hộ vệ còn lại.':'Tìm trạm đèn và thanh tẩy hai đợt hộ vệ. Phần thưởng: di vật và 75 xu.',target:b};
      return super.objective();
    }
    respawn(){super.respawn();for(const state of Object.values(this.outposts))if(state.started&&!state.complete){this.clearChallengeEnemies(state);state.started=false;state.wave=0;state.nextWave=0}this.frontierCombat=false;this.player.cast=0}
    serialize(){const data=super.serialize();data.frontierVersion=3;data.frontier={outposts:this.outposts};return data}
    static restore(data){
      const g=Base.restore(data);Object.setPrototypeOf(g,FrontierGame.prototype);g.initFrontier();
      for(const b of beacons){const s=data.frontier?.outposts?.[b.id];if(!s||b.id==='home')continue;g.outposts[b.id]={discovered:!!s.discovered,started:!!s.started,complete:!!s.complete,claimed:!!s.complete&&!!s.claimed,wave:clamp(Number(s.wave)||0,0,2),nextWave:clamp(Number(s.nextWave)||0,0,2),ids:Array.isArray(s.ids)?s.ids.filter(id=>typeof id==='string'&&id.startsWith('v2-')).slice(0,8):[]};}
      return g;
    }
  }
  root.DTGame=FrontierGame;
})(globalThis);
