(function(root){
  'use strict';
  const D=root.DTWorld,V=root.DTV09Content,TAU=Math.PI*2;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),segment=(p,a,b)=>root.DTAscension.segment(p,a,b);
  const roman=['I','II','III','IV'],colors=['Đỏ','Lam','Vàng','Lục'];
  const groups={torches_order:['aladdin','power','wildfire'],mirror_beam:['aegis','cinderella','spirit'],rhythm_chimes:['dashshock','haste','chain'],blood_sacrifice:['vampire','traucau','chudong'],dodge_matrix:['tam','antiem','cooling'],soul_harvest:['jack','vitality','split','pierce','dom']};
  const bosses=[['kimquy','Huyền Quy Cổ Thạch','boar',5010,1570,'crystals'],['mjolnir','Cự Nhân Sắt Phế Tích','shade',5550,3010,'pylons'],['wukong','Hầu Ảnh Sơn Lâm','shade',1230,1210,'bells'],['phoenix','Hỏa Điểu Tro Tàn','wisp',3150,430,'nest']];
  const sites=g=>[...(g.world.relicPedestals||[]),...(g.world.bossAltars||[])];
  const shuffle=(a,rng)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  function nodes(p,rng){
    const type=p.puzzleType,stone=p.relic==='split'||p.relic==='pierce';
    const count=['crystals','pylons','mirror_beam'].includes(type)||stone?3:['torches_order','rhythm_chimes','bells','nest'].includes(type)?4:0;
    const radius=type==='torches_order'?110:type==='mirror_beam'?130:stone?160:140,order=shuffle([0,1,2,3],rng);
    p.sequence=shuffle([0,1,2,3],rng);
    return Array.from({length:count},(_,i)=>{const a=-Math.PI/2+(type==='torches_order'?order[i]:i)*TAU/count,targetDir=(i*3+1)%4;return {id:p.id+'-node-'+i,index:i,x:p.x+Math.cos(a)*radius,y:p.y+Math.sin(a)*radius,r:19,kind:stone?'stone':type==='crystals'?'crystal':type==='pylons'?'pylon':type==='mirror_beam'?'mirror':type==='rhythm_chimes'?'drum':type==='bells'?'bell':'torch',maxHp:stone?85:60,hp:stone?85:60,active:false,dir:(targetDir+1+i%2)%4,targetDir,hitUntil:0}});
  }
  function setupWorld(w){
    const rng=D.rand(w.seed+98137);
    w.relicPedestals=V.pedestal.map(([relic,name,x,y])=>({id:'relic-'+relic,relic,name,x,y,puzzleType:Object.keys(groups).find(k=>groups[k].includes(relic)),claimed:false,unlocked:false,discovered:false,status:'waiting',progress:0,elapsed:0,hits:0}));
    w.bossAltars=bosses.map(([relic,name,enemyType,x,y,puzzleType])=>({id:'altar-'+relic,relic,name,enemyType,x,y,puzzleType,ritual:true,unlocked:false,discovered:false,status:'waiting',progress:0,elapsed:0,hits:0}));
    for(const p of [...w.relicPedestals,...w.bossAltars])p.nodes=nodes(p,rng);
    // Only pedestal footprints are cleared. Forest outside 55 px stays intact.
    let checkedProps;const footprints=[...w.relicPedestals,...w.bossAltars];
    const clear=()=>{if(checkedProps===w.props)return false;checkedProps=w.props;let changed=false;for(const prop of w.props)if(!prop.relicCleared&&footprints.some(p=>dist(p,prop)<=55)){prop.r=0;prop.relicCleared=true;changed=true}return changed};
    const rebuild=w.rebuildStream,ensure=w.ensureChunks;
    w.rebuildStream=function(){rebuild.call(w);if(clear())rebuild.call(w)};
    w.ensureChunks=function(x,y){ensure.call(w,x,y);if(clear())rebuild.call(w)};
    w.rebuildStream();
  }
  function spawn(g,p,i,name,type='shade',hp=75,extra={}){
    let at={x:p.x,y:p.y};
    for(let k=0;k<32;k++){const a=i*TAU/4+k*.39,r=extra.v09Boss?0:190+k%4*12,spot={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};if(!g.world.collision(spot.x,spot.y,16)){at=spot;break}}
    const e={id:p.id+'-mob-'+(++g.trialSerial),name,type,...at,homeX:p.x,homeY:p.y,r:extra.v09Boss?23:15,hp,maxHp:hp,speed:extra.v09Boss?72:92,damage:extra.v09Boss?18:8,xp:0,gold:0,alive:true,cool:1.4,timer:0,phase:0,hit:0,slow:0,knockX:0,knockY:0,frontier:true,trialMob:p.id,...extra};g.world.enemies.push(e);return e;
  }
  function cleanup(g,p){g.world.enemies=g.world.enemies.filter(e=>e.trialMob!==p.id||e.v09Boss);g.projectiles=g.projectiles.filter(b=>b.trialId!==p.id)}
  function reset(g,p,message){
    cleanup(g,p);p.status='waiting';p.progress=p.elapsed=p.hits=p.wave=p.emitTime=0;p.counted=new Set();
    for(const n of p.nodes){n.hp=n.maxHp;n.active=false;n.hitUntil=0}
    if(message){g.effect('ring',p.x,p.y,'#dd847c',160,.6);g.emit('toast',{text:message})}
  }
  function summon(g,p,hp=950){
    if(g.world.enemies.some(e=>e.alive&&e.v09Boss&&e.relic===p.relic))return;
    const e=spawn(g,p,0,p.name,p.enemyType,950,{id:'relic-boss-'+p.relic,relic:p.relic,miniBoss:true,mythicBoss:true,v09Boss:true});e.hp=hp;p.status='summoned';p.unlocked=true;
    const titles={kimquy:['HUYỀN QUY','CỔ THẠCH LINH QUY','#76e5c8'],mjolnir:['CỰ NHÂN SẮT','PHẾ TÍCH THIÊN CƠ','#93c5fd'],wukong:['HẦU ẢNH','SƠN LÂM HỘ PHÁP','#fcd34d'],phoenix:['HỎA ĐIỂU','PHƯỢNG HOÀNG TRO TÀN','#fb923c']}[p.relic]||[p.name,'THÁNH VẬT HỘ VỆ','#ffd892'];
    g.triggerBossCutIn?.({id:e.id,type:e.type,relic:p.relic,name:titles[0],subtitle:titles[1],fullTitle:`${titles[0]} — ${titles[1]}`,color:titles[2],accent:'#fff3c4'});
    g.effect('mythic-rune',p.x,p.y,'#ffd892',180,1.2);
  }
  function complete(g,p){
    if(p.unlocked)return;
    if(p.ritual)summon(g,p);else{p.unlocked=true;p.status='solved';g.addXp(180)}
    g.effect('ring',p.x,p.y,'#a0e8ba',180,1);g.emit('sound',{name:'ultimate'});g.emit('toast',{text:p.ritual?p.name+' đã thức tỉnh!':'Phong ấn '+p.name+' đã mở. Nhấn F tại bệ để nhận.',reward:true});
  }
  function hint(p){
    const t=p.puzzleType,s=p.status,n=p.progress||0;
    if(p.unlocked)return p.ritual?(s==='defeated'?'Đàn phong ấn đã yên':'Người canh đã thức tỉnh'):'Phong ấn đã mở · F nhận cổ vật';
    if(t==='crystals')return 'Phá 3 tinh thể trong 12 giây'+(s==='active'?' · '+Math.ceil(12-p.elapsed)+'s':'');
    if(t==='pylons')return 'F / Lôi / Mã lệnh: nạp 3 trụ trong 10 giây'+(s==='active'?' · '+Math.ceil(10-p.elapsed)+'s':'');
    if(t==='bells')return 'Gõ chuông Bắc · Đông · Nam · Tây · '+n+'/4';
    if(t==='nest')return 'Thắp 4 đài lửa · hạ 4 Hỏa Tinh Canh Tổ · '+p.nodes.filter(n=>n.active).length+'/4 đài';
    if(t==='torches_order')return 'F / đánh đèn: I · II · III · IV · '+n+'/4';
    if(t==='mirror_beam')return 'F / đánh: xoay gương khớp vạch sáng · '+p.nodes.filter(n=>n.dir===n.targetDir).length+'/3';
    if(t==='rhythm_chimes')return s==='playback'?'Lắng nghe bốn màu · '+colors[p.sequence[Math.min(3,Math.floor(p.elapsed/.6))]]:s==='input'?'Gõ lại bốn màu vừa nghe · '+n+'/4':'F tại bệ: nghe chuỗi bốn màu';
    if(t==='blood_sacrifice')return s==='active'?'Giữ vòng đỏ · '+Math.max(0,Math.ceil(15-p.elapsed))+'s · Đợt '+p.wave+'/2':'F: hiến 30% Máu hiện tại · giữ vòng 15s · hạ 2 đợt địch';
    if(t==='dodge_matrix')return s==='active'?'Né đạn · '+Math.max(0,Math.ceil(12-p.elapsed))+'s · Còn '+Math.max(0,2-p.hits)+'/2 lần trúng':'F: né đạn 12s trong vòng · tối đa 2 lần trúng';
    if(p.relic==='split'||p.relic==='pierce')return 'Phá 3 trụ đá trong 10 giây'+(s==='active'?' · '+Math.ceil(10-p.elapsed)+'s':'');
    return 'Hạ địch bên trong vòng rễ · '+n+'/4 linh hồn';
  }
  function wave(g,p,count,name,type){for(let i=0;i<count;i++)spawn(g,p,i,name,type)}
  function playback(g,p){p.status='playback';p.elapsed=0;p.progress=0;g.emit('sound',{name:'skill'})}
  function activate(g,p,n,damage=0,element=null,fromF=false){
    if(p.unlocked||p.claimed||n.hitUntil>g.time&&!fromF)return false;
    const t=p.puzzleType;
    if(n.kind==='crystal'||n.kind==='stone'){
      if(fromF||damage<=0||n.hp<=0)return false;
      if(p.status!=='active'){p.status='active';p.elapsed=0}n.hp=Math.max(0,n.hp-damage);
      g.effect('shock',n.x,n.y,'#acdfd4',25,.25);if(p.nodes.every(n=>n.hp<=0))complete(g,p);return true;
    }
    if(t==='pylons'){
      if(n.active||!fromF&&!['lightning','code'].includes(element)&&!(element==='light'&&g.hero.id==='hoavi'))return false;
      if(p.status!=='active'){p.status='active';p.elapsed=0}n.active=true;
    }else if(t==='nest'){
      if(n.active)return false;n.active=true;
      if(p.status!=='active'){p.status='active';p.elapsed=0;wave(g,p,4,'Hỏa Tinh Canh Tổ','wisp')}
    }else if(t==='torches_order'||t==='bells'){
      if(n.active)return false;
      if(n.index!==p.progress){reset(g,p,'Sai thứ tự. Phong ấn trở lại nhịp đầu.');const d=Math.max(1,dist(g.player,p));g.moveEntity(g.player,(g.player.x-p.x)/d*26,(g.player.y-p.y)/d*26);return true}
      n.active=true;p.progress++;p.status='active';
    }else if(t==='mirror_beam'){
      n.dir=(n.dir+1)%4;p.status='active';if(p.nodes.every(n=>n.dir===n.targetDir))complete(g,p);
    }else if(t==='rhythm_chimes'){
      if(p.status!=='input')return false;
      if(n.index!==p.sequence[p.progress]){playback(g,p);g.emit('toast',{text:'Sai màu. Nghe lại chuỗi rồi gõ theo.'});return true}
      p.progress++;n.flashUntil=g.time+.4;
    }else return false;
    n.hitUntil=g.time+.25;g.emit('sound',{name:'interact'});g.effect('ring',n.x,n.y,'#f5dfa3',32,.3);
    if((t==='pylons'&&p.nodes.every(n=>n.active))||(['torches_order','bells','rhythm_chimes'].includes(t)&&p.progress===4))complete(g,p);
    return true;
  }
  function tick(g,dt){
    for(const p of sites(g)){
      const d=dist(g.player,p);if(d<=(g.player.relics.dom?650:260))p.discovered=true;
      if(p.ritual&&p.status==='summoned'&&!g.world.enemies.some(e=>e.alive&&e.v09Boss&&e.relic===p.relic)){p.status='defeated';continue}
      if(p.unlocked||p.claimed)continue;
      if(g.dead){if(p.status!=='waiting')reset(g,p);continue}
      if(p.status!=='waiting'&&d>700){reset(g,p);continue}
      const type=p.puzzleType;
      if(type==='soul_harvest'&&!['split','pierce'].includes(p.relic)&&d<=260&&p.status==='waiting'){p.status='active';p.counted=new Set();wave(g,p,4,'Oán Hồn Rừng','shade')}
      if(p.status==='waiting')continue;
      p.elapsed+=dt;
      if(type==='rhythm_chimes'){
        if(p.status==='playback'){const beat=Math.floor(p.elapsed/.6);if(beat!==p.lastBeat&&beat<4){p.lastBeat=beat;g.effect('ring',p.nodes[p.sequence[beat]].x,p.nodes[p.sequence[beat]].y,['#e5817c','#82c6e8','#f4d778','#8cd6a4'][p.sequence[beat]],38,.5);g.emit('sound',{name:'interact'})}if(p.elapsed>=2.4){p.status='input';p.elapsed=0;p.lastBeat=-1}}
      }else if(type==='crystals'||type==='pylons'||type==='soul_harvest'&&['split','pierce'].includes(p.relic)){
        if(p.elapsed>=(type==='crystals'?12:10))reset(g,p,'Hết giờ. Phong ấn đã hồi phục.');
      }else if(type==='blood_sacrifice'||type==='dodge_matrix'){
        if(d>(type==='blood_sacrifice'?240:260)){reset(g,p,'Rời kết giới. Thử thách thất bại.');continue}
        if(type==='blood_sacrifice'){
          if(p.elapsed>=7.5&&p.wave===1){p.wave=2;wave(g,p,3,'Oán Hồn Huyết Đầm','shade')}
          if(p.elapsed>=15&&p.wave===2&&!g.world.enemies.some(e=>e.alive&&e.trialMob===p.id))complete(g,p);
        }else{
          if(p.elapsed>=12){complete(g,p);cleanup(g,p);continue}
          p.emitTime=(p.emitTime||0)+dt;
          if(p.emitTime>=.24){p.emitTime-=.24;for(let i=0;i<3;i++){g.shoot(p.x,p.y,p.elapsed*2.2+i*TAU/3,160,5,'#d8a7df',{friendly:false,life:1.9,r:5,kind:'trial'});Object.assign(g.projectiles.at(-1),{x:p.x,y:p.y,trialId:p.id})}}
        }
      }else if(type==='nest'){
        if(p.nodes.every(n=>n.active)&&!g.world.enemies.some(e=>e.alive&&e.trialMob===p.id))complete(g,p);
      }else if(type==='soul_harvest'&&!g.world.enemies.some(e=>e.alive&&e.trialMob===p.id)&&p.progress<4){wave(g,p,4-p.progress,'Oán Hồn Rừng','shade')}
    }
  }
  function install(Game){
    const P=Game.prototype,init=P.initRpg,update=P.update,save=P.serialize,kill=P.damageEnemy,hostile=P.onHostileBulletHit;
    P.initRpg=function(saved,legacy){
      init.call(this,saved,legacy);this.trialSerial=0;
      const state=saved?.trials?.version===1&&saved.trials.sites&&typeof saved.trials.sites==='object'?saved.trials.sites:{};
      for(const p of sites(this)){
        const s=state[p.relic]||{};p.discovered=s.discovered===true||!!this.player.relics[p.relic];
        p.unlocked=p.claimed===true||!p.ritual&&s.solved===true;p.status=p.unlocked?'solved':'waiting';p.progress=p.elapsed=p.hits=0;p.counted=new Set();
        if(p.ritual){if(this.player.relics[p.relic]||this.killedBosses.has(p.relic)){p.unlocked=true;p.status='defeated'}else if(s.summoned===true&&Number.isFinite(s.hp)&&s.hp>0)summon(this,p,Math.min(950,s.hp))}
      }
      root.DTWorldEvents?.restorePosture(this);
    };
    P.trialHint=hint;
    P.trialObjects=function(){return sites(this).filter(p=>!p.unlocked&&!p.claimed&&dist(p,this.player)<430).flatMap(p=>[...(p.ritual?[{...p,bossAltar:true,label:hint(p)}]:[]),...p.nodes.filter(n=>n.hp>0||!['stone','crystal'].includes(n.kind)).map(n=>({...n,trialNode:p.id,label:n.kind==='stone'||n.kind==='crystal'?'Đánh phá '+(n.kind==='stone'?'trụ đá':'tinh thể'):n.kind==='mirror'?'Xoay gương · F':n.kind==='drum'?'Gõ trống '+colors[n.index]+' · F':n.kind==='bell'?'Chuông '+['Bắc','Đông','Nam','Tây'][n.index]+' · F':n.kind==='pylon'?'Nạp trụ điện · F':'Thắp đèn '+roman[n.index]+' · F'}))])};
    P.interactTrial=function(o){
      if(this.paused||this.dead||!this.started)return false;
      const p=sites(this).find(p=>p.id===(o.trialNode||o.id));if(!p||p.unlocked)return false;p.discovered=true;
      if(o.trialNode){const n=p.nodes.find(n=>n.id===o.id);return !!n&&dist(n,this.player)<74&&activate(this,p,n,0,null,true)}
      if(dist(p,this.player)>82)return false;
      if(p.puzzleType==='rhythm_chimes'){playback(this,p);return true}
      if(['blood_sacrifice','dodge_matrix'].includes(p.puzzleType)&&p.status==='waiting'){
        p.status='active';p.elapsed=p.hits=p.emitTime=0;
        if(p.puzzleType==='blood_sacrifice'){this.player.hp*=.7;p.wave=1;wave(this,p,3,'Oán Hồn Huyết Đầm','shade')}
        this.emit('toast',{text:hint(p)});return true;
      }
      this.emit('toast',{text:hint(p)});return false;
    };
    P.hitTrials=function(test,damage,element,origin){
      if(this.paused||this.dead||!this.started||!(damage>0))return;
      for(const p of sites(this))if(!p.unlocked&&!p.claimed){const hit=p.nodes.filter(n=>test(n)).sort((a,b)=>dist(a,origin)-dist(b,origin));for(const n of hit.filter(n=>['stone','crystal'].includes(n.kind)))activate(this,p,n,damage,element);const n=hit.find(n=>!['stone','crystal'].includes(n.kind));if(n)activate(this,p,n,damage,element)}
    };
    P.update=function(dt){const t=this.time;update.call(this,dt);if(this.time>t)tick(this,this.time-t);else if(this.dead)for(const p of sites(this))if(!p.unlocked&&p.status!=='waiting')reset(this,p)};
    P.damageEnemy=function(e,...args){const alive=e?.alive,result=kill.call(this,e,...args);if(alive&&!e.alive&&!e.root)for(const p of this.world.relicPedestals)if(p.puzzleType==='soul_harvest'&&!['split','pierce'].includes(p.relic)&&!p.unlocked&&p.status==='active'&&dist(e,p)<=165&&!p.counted.has(e.id)){p.counted.add(e.id);p.progress++;this.effect('rpg-soul',e.x,e.y,'#91e3ae',18,.7,{tx:p.x,ty:p.y});if(p.progress>=4)complete(this,p)}return result};
    P.onHostileBulletHit=function(b,dealt){hostile?.call(this,b,dealt);const p=this.world.relicPedestals.find(p=>p.id===b.trialId);if(p?.status==='active'&&p.puzzleType==='dodge_matrix'&&dealt){p.hits++;if(p.hits>2)reset(this,p,'Trúng quá 2 lần. Pháp trận trở lại trạng thái chờ.')}};
    for(const name of ['areaDamage','elementArea']){const old=P[name];P[name]=function(x,y,r,damage,...args){const result=old.call(this,x,y,r,damage,...args);this.hitTrials(n=>dist(n,{x,y})<r*(this.player.areaMultiplier||1)+n.r,damage,name==='elementArea'?args[0]:null,{x,y});return result}}
    const primary=P.elementPrimary;P.elementPrimary=function(origin,id,power,charge,aim){const result=primary.call(this,origin,id,power,charge,aim);if(['lightning','earth','ice','nature'].includes(id)){const a=aim?Math.atan2(aim.y-origin.y,aim.x-origin.x):origin.aimAngle??origin.facing??0,reach={lightning:115,earth:95,ice:130,nature:175}[id],half={lightning:135,earth:120,ice:155,nature:85}[id]*Math.PI/360;this.hitTrials(n=>{const d=Math.atan2(n.y-origin.y,n.x-origin.x)-a;return dist(n,origin)<=reach+n.r&&Math.abs(Math.atan2(Math.sin(d),Math.cos(d)))<=half},power,id,origin)}return result};
    const line=P.lineHit;P.lineHit=function(a,b,width,power,element,...args){const end=line.call(this,a,b,width,power,element,...args);this.hitTrials(n=>segment(n,a,end)<width*(this.player.areaMultiplier||1)+n.r,power,element,a);return end};
    const beam=P.elementBeam;P.elementBeam=function(a,b,width,power,element,...args){const length=Math.min(1800,dist(a,b)),angle=Math.atan2(b.y-a.y,b.x-a.x);let end={x:a.x+Math.cos(angle)*length,y:a.y+Math.sin(angle)*length};for(let r=24;r<length;r+=12)if(this.world.collision(a.x+Math.cos(angle)*r,a.y+Math.sin(angle)*r,2)){end={x:a.x+Math.cos(angle)*r,y:a.y+Math.sin(angle)*r};break}const result=beam.call(this,a,b,width,power,element,...args);this.hitTrials(n=>segment(n,a,end)<width+n.r,power,element,a);return result};
    const projectile=root.DTDestruction.projectile;
    root.DTDestruction.projectile=function(g,b){
      if(b.friendly&&b.life>0&&g.heroQuest)for(const p of sites(g))if(!p.unlocked&&!p.claimed)for(const n of p.nodes)if((n.hp>0||!['stone','crystal'].includes(n.kind))&&dist(n,b)<n.r+b.r&&!b.trialHitIds?.includes(n.id)){
        (b.trialHitIds||=[]).push(n.id);activate(g,p,n,b.damage,b.element||(b.kind==='code'?'code':null));b.life=0;return true;
      }
      return projectile.call(this,g,b);
    };
    P.serialize=function(){const d=save.call(this);d.v09.trials={version:1,sites:Object.fromEntries(sites(this).map(p=>{const e=this.world.enemies.find(e=>e.alive&&e.v09Boss&&e.relic===p.relic);return[p.relic,{discovered:p.discovered===true,solved:p.unlocked===true&&!p.ritual,summoned:!!e,hp:e?e.hp:undefined}]}))};return d};
  }
  root.DTRelicTrials={setupWorld,install,hint,groups};
})(globalThis);
