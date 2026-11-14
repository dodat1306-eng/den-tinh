(function(root){
  'use strict';
  const wood=new Set(['tree','willow','banyan','pine','bamboo','fern','reed','flower','lotus','grass','deadTree','barrel','crate','lanternPost']);
  const stone=new Set(['rock','crystal','pillar']),statuses=new Set(['intact','burning','heated','frozen','electrified','charred','cracked','sliced','ash_pile','rubble','crystal_shards']);
  const kinds=new Set(['scorch_mark','crater_mark','lightning_scar','frost_patch','ash_scatter']);
  const clamp=(v,a,b)=>Number.isFinite(v)?Math.max(a,Math.min(b,v)):a,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),MAX_DECALS=384;
  const grids=new WeakMap(),steps=new WeakMap();
  function init(p){
    if(!p||!wood.has(p.type)&&!stone.has(p.type))return false;
    if(!Number.isFinite(p.baseRadius))p.baseRadius=clamp(p.r,0,200);
    if(!Number.isFinite(p.maxPropHp))p.maxPropHp=stone.has(p.type)?110:80;
    if(!Number.isFinite(p.propHp))p.propHp=p.maxPropHp;
    if(!Number.isInteger(p.damageStage))p.damageStage=p.destroyed?3:0;
    if(!p.status)p.status=p.damageStage===3?(wood.has(p.type)?'ash_pile':'rubble'):'intact';
    if(p.damageStage===3){p.r=0;p.destroyed=true}
    return true;
  }
  function props(world){return (world.props||[]).concat((world.environment||[]).filter(p=>wood.has(p.type)||stone.has(p.type)))}
  function grid(world){
    let record=grids.get(world);
    if(!record||record.props!==world.props||record.environment!==world.environment){
      record={props:world.props,environment:world.environment,cells:new Map()};
      for(const p of props(world))if(init(p)){const key=Math.floor(p.x/128)+','+Math.floor(p.y/128);if(!record.cells.has(key))record.cells.set(key,[]);record.cells.get(key).push(p)}
      grids.set(world,record);
    }return record.cells;
  }
  function near(world,x,y,r){
    const out=[],cells=grid(world);for(let j=Math.floor((y-r)/128);j<=Math.floor((y+r)/128);j++)for(let i=Math.floor((x-r)/128);i<=Math.floor((x+r)/128);i++)for(const p of cells.get(i+','+j)||[])if(Math.hypot(p.x-x,p.y-y)<=r)out.push(p);return out;
  }
  function fx(g,type,x,y,r=42){g.effect?.('world-'+type,x,y,'#d8e6e6',r,.65)}
  function particles(g,p,color,count=4,wind=0){
    g.particles||=[];if(g.particles.length>540)return;
    for(let i=0;i<count;i++){const a=i/count*Math.PI*2+(p.x+p.y)*.01,v=22+i*7;g.particles.push({x:p.x,y:p.y-5,vx:Math.cos(a)*v+wind,vy:-20-Math.abs(Math.sin(a))*v,color,size:2,life:.55,maxLife:.55,worldParticle:true})}
  }
  function decal(g,type,x,y,r=50){
    if(!kinds.has(type)||![x,y,r].every(Number.isFinite)||r<0)return null;
    const list=g.world.groundDecals||=([]),size=r>=180?'large':r>=80?'medium':'small';
    const existing=list.find(d=>d.type===type&&Math.hypot(d.x-x,d.y-y)<20&&d.age<.3);if(existing)return existing;
    const d={type,x,y,size,age:0,life:type==='frost_patch'?12:90,emberLife:type==='scorch_mark'?4.5:0,seed:Math.abs(Math.trunc(x*13+y*7))%997};
    list.push(d);if(list.length>MAX_DECALS)list.splice(0,list.length-MAX_DECALS);return d;
  }
  function collapse(g,p,shatter=false){
    p.damageStage=3;p.status=wood.has(p.type)?'ash_pile':p.type==='crystal'?'crystal_shards':'rubble';p.destroyed=true;p.r=0;p.burnTimer=p.frozenTimer=p.charTimer=0;
    if(shatter){fx(g,'frozen_shatter',p.x,p.y,95);particles(g,p,'#dbfbff',8);for(const e of g.world.enemies||[])if(e.alive&&dist(e,p)<=95+(e.r||0))g.damageEnemy?.(e,(g.player?.damage||12)*.85,false)}
    else{particles(g,p,wood.has(p.type)?'#585c63':'#86939d',6);decal(g,wood.has(p.type)?'scorch_mark':'crater_mark',p.x,p.y,80)}
  }
  function hit(g,p,element,power=45){
    if(!init(p)||!Number.isFinite(power)||power<0)return false;
    if(p.damageStage===3){if(element==='wind'||element==='physical')step(g,p,90);return false}
    if(element==='fire'&&p.status==='frozen'||element==='ice'&&p.status==='burning'){
      p.damageStage=0;p.status='intact';p.burnTimer=p.frozenTimer=p.spreadAcc=0;fx(g,'steam_cloud',p.x,p.y);return true;
    }
    if(p.status==='frozen'&&['physical','earth','wind','lightning'].includes(element)){collapse(g,p,true);return true}
    if(p.damageStage===2&&element!=='ice'&&element!=='nature'&&element!=='fire'){collapse(g,p);return true}
    if(element==='fire'){
      if(p.damageStage>=2||p.status==='burning'||p.status==='heated')return false;
      p.damageStage=1;p.status=wood.has(p.type)?'burning':'heated';p.burnTimer=2.5;p.spreadAcc=0;p.heatAcc=0;decal(g,'scorch_mark',p.x,p.y,80);return true;
    }
    if(element==='ice'){p.beforeFreezeStage=p.damageStage;p.damageStage=1;p.status='frozen';p.frozenTimer=5;p.burnTimer=0;return true}
    if(!['wind','earth','physical','lightning','light'].includes(element))return false;
    p.propHp=Math.max(0,p.propHp-power);p.sway=(p.sway||0)+.12;
    if(p.propHp<=0){collapse(g,p);return true}
    if(p.propHp<=p.maxPropHp*.5){p.damageStage=2;p.status=wood.has(p.type)&&element!=='earth'?'sliced':'cracked';p.charTimer=p.status==='sliced'?.6:3;p.fallTime=0;particles(g,p,wood.has(p.type)?'#bd8d53':'#86939d',5)}
    else{p.damageStage=1;p.status=element==='lightning'?'electrified':'intact';p.afflictTimer=1}
    return true;
  }
  function react(g,element,x,y,r=150,power=45,ground=true){
    if(!g?.world||![x,y,r,power].every(Number.isFinite)||r<0||r>2500||power<0)return 0;
    let count=0;const list=g.world.groundDecals||=[];
    if(element==='fire')for(let i=list.length-1;i>=0;i--)if(list[i].type==='frost_patch'&&Math.hypot(list[i].x-x,list[i].y-y)<=r+32){fx(g,'steam_cloud',list[i].x,list[i].y);list.splice(i,1)}
    if(ground){const kind={fire:'scorch_mark',light:'scorch_mark',earth:'crater_mark',lightning:'lightning_scar',ice:'frost_patch'}[element];if(kind)decal(g,kind,x,y,r)}
    for(const p of near(g.world,x,y,r))if(hit(g,p,element,power))count++;
    return count;
  }
  function trace(g,element,a,b,r=18,power=30){
    const length=dist(a,b);if(!Number.isFinite(length)||length>3000)return;
    const count=Math.max(1,Math.ceil(length/24));for(let i=0;i<=count;i++){const t=i/count;react(g,element,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,r,power,i===count)}
  }
  function projectile(g,b){
    const element=b.element||b.eliteElement||(b.friendly?(b.effect==='burn'||g.hero.id==='an'?'fire':g.hero.id==='kiet'?'lightning':g.hero.id==='linh'?'wind':'physical'):null);
    if(!element||!Number.isFinite(b.x)||!Number.isFinite(b.y))return false;
    let solid=false;b.propHits||=new Set();
    for(const p of near(g.world,b.x,b.y,Math.max(28,(b.r||3)+18))){
      if(p.damageStage===3||dist(p,b)>Math.max(12,p.baseRadius)+(b.r||3))continue;
      if(!b.propHits.has(p)){b.propHits.add(p);hit(g,p,element,b.damage||20);if(['fire','ice','lightning','earth','light'].includes(element))react(g,element,p.x,p.y,0,0,true)}
      if(p.r>0){solid=true;b.life=0;break}
    }return solid;
  }
  function step(g,p,wind=0){
    if((p.touchCd||0)>0)return false;p.touchCd=.22;
    if(p.damageStage===3){particles(g,p,p.status==='ash_pile'?'#585c63':'#86939d',5,wind);if(p.status==='ash_pile'){fx(g,'ash_burst',p.x,p.y);decal(g,'ash_scatter',p.x+wind*.12,p.y+8,40)}}
    else if(wood.has(p.type)){p.sway=.16;particles(g,{x:p.x,y:p.y-35},'#8ad477',4,wind)}
    return true;
  }
  function update(g,dt){
    if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.04);const spread=[],heat=[];
    for(const p of props(g.world))if(init(p)){
      p.touchCd=Math.max(0,(p.touchCd||0)-dt);p.sway=(p.sway||0)*Math.exp(-8*dt);p.fallTime=(p.fallTime||0)+(p.status==='sliced'?dt:0);
      if(p.status==='burning'||p.status==='heated'){
        p.burnTimer=Math.max(0,p.burnTimer-dt);p.spreadAcc=(p.spreadAcc||0)+dt;p.heatAcc=(p.heatAcc||0)+dt;
        if(p.status==='burning'&&p.spreadAcc>=.9){p.spreadAcc-=.9;spread.push(p)}
        if(p.status==='burning'&&p.heatAcc>=.5){p.heatAcc-=.5;heat.push(p)}
        if(p.burnTimer<=1e-7){p.damageStage=2;p.status=wood.has(p.type)?'charred':'cracked';p.charTimer=3;p.burnTimer=0}
      }else if(p.damageStage===2){p.charTimer=Math.max(0,(p.charTimer||3)-dt);if(p.charTimer<=1e-7)collapse(g,p)}
      else if(p.status==='frozen'){p.frozenTimer=Math.max(0,p.frozenTimer-dt);if(p.frozenTimer<=1e-7){p.damageStage=p.beforeFreezeStage===2?2:0;p.status=p.damageStage===2?'charred':'intact';p.charTimer=p.damageStage===2?3:0}}
      else if(p.damageStage===1){p.afflictTimer=Math.max(0,(p.afflictTimer||0)-dt);if(!p.afflictTimer){p.damageStage=0;p.status='intact'}}
    }
    for(const p of spread)for(const other of near(g.world,p.x,p.y,85))if(other!==p&&wood.has(other.type)&&other.damageStage===0)hit(g,other,'fire',0);
    for(const p of heat)for(const e of g.world.enemies||[])if(e.alive&&dist(e,p)<85+(e.r||0))g.damageEnemy?.(e,Math.max(2,(g.player?.damage||12)*.16),false);
    const actors=[g.player,...(g.elementClones||[]),...(g.elementSummons||[]),...(g.world.enemies||[]).filter(e=>e.alive&&dist(e,g.player)<1000)];
    for(const actor of actors){if(!actor)continue;const old=steps.get(actor);steps.set(actor,{x:actor.x,y:actor.y});if(!old||dist(old,actor)<.15)continue;for(const p of near(g.world,actor.x,actor.y,54))if(dist(p,actor)<Math.max(p.baseRadius||0,16)+26)step(g,p,actor.dashTime>0?70:0)}
    const list=g.world.groundDecals||=[];for(let i=list.length-1;i>=0;i--){list[i].age+=dt;if(list[i].age>=list[i].life)list.splice(i,1)}
  }
  function state(p){
    if(!init(p))return null;const out={damageStage:p.damageStage,status:p.status};
    for(const key of ['burnTimer','frozenTimer','charTimer','spreadAcc','afflictTimer','propHp','fallTime','beforeFreezeStage'])out[key]=clamp(p[key],0,key==='propHp'?110:5);
    return out;
  }
  function applyState(p,s){
    if(!init(p)||!s||typeof s!=='object')return;
    p.damageStage=Number.isInteger(s.damageStage)?clamp(s.damageStage,0,3):0;p.status=statuses.has(s.status)?s.status:'intact';
    for(const key of ['burnTimer','frozenTimer','charTimer','spreadAcc','afflictTimer','propHp','fallTime','beforeFreezeStage'])p[key]=clamp(s[key],0,key==='propHp'?p.maxPropHp:5);
    if(p.damageStage===3){p.destroyed=true;p.r=0}else{p.destroyed=false;p.r=p.baseRadius}
    if(p.status==='burning'&&!p.burnTimer){p.damageStage=2;p.status='charred';p.charTimer=3}
  }
  function cleanState(s){const p={type:'rock',r:1};applyState(p,s);return state(p)}
  root.DTDestruction={wood,stone,init,near,hit,react,trace,projectile,step,update,decal,state,applyState,cleanState,MAX_DECALS};
  const P=root.DTGame.prototype,priorReact=P.reactEnvironment,priorUpdate=P.update,priorArea=P.areaDamage,priorSerialize=P.serialize,priorRestore=root.DTGame.restore;
  P.reactEnvironment=function(element,x,y,r=150){if(![x,y,r].every(Number.isFinite)||r<0||r>2500)return 0;return(priorReact?.call(this,element,x,y,r)||0)+react(this,element,x,y,r)};
  P.areaDamage=function(x,y,r,...args){if(!this._worldDamage)react(this,this.hero.id==='thienvu'?this.element.id:({an:'fire',linh:'wind',kiet:'earth',hoavi:'lightning'}[this.hero.id]||'physical'),x,y,r,args[0]||30);return priorArea.call(this,x,y,r,...args)};
  P.update=function(dt){const before=this.time;priorUpdate.call(this,dt);if(this.time>before)update(this,this.time-before)};
  P.serialize=function(){const data=priorSerialize.call(this),core=this.world.coreProps||this.world.props.filter(p=>!p.streamKey);data.worldDestruction={version:8,props:core.flatMap((p,i)=>{const s=state(p);return s&&(s.damageStage>0||p.propHp<p.maxPropHp)?[{i,type:p.type,...s}]:[]}),decals:(this.world.groundDecals||[]).map(d=>({...d}))};return data};
  root.DTGame.restore=function(data){
    const g=priorRestore.call(this,data),saved=data.worldDestruction,core=g.world.coreProps||g.world.props.filter(p=>!p.streamKey);g.world.groundDecals=[];
    if(saved?.version===8){
      for(const s of(Array.isArray(saved.props)?saved.props:[]).slice(0,core.length))if(Number.isInteger(s?.i)&&s.i>=0&&s.i<core.length&&core[s.i].type===s.type)applyState(core[s.i],s);
      for(const d of(Array.isArray(saved.decals)?saved.decals:[]).slice(-MAX_DECALS))if(d&&kinds.has(d.type)&&[d.x,d.y,d.age].every(Number.isFinite)&&Math.abs(d.x)<1e7&&Math.abs(d.y)<1e7&&d.age>=0&&d.age<(d.type==='frost_patch'?12:90))g.world.groundDecals.push({type:d.type,x:d.x,y:d.y,age:d.age,life:d.type==='frost_patch'?12:90,size:['small','medium','large'].includes(d.size)?d.size:'small',emberLife:d.type==='scorch_mark'?4.5:0,seed:clamp(d.seed,0,997)});
    }g.world.rebuildStream?.();const position=data.endless?.position||data.player;if(position&&[position.x,position.y].every(Number.isFinite)&&!g.world.collision(position.x,position.y,g.player.r)){g.player.x=position.x;g.player.y=position.y}return g;
  };
})(globalThis);
