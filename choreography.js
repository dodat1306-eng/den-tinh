(function(root){
  'use strict';
  if(root.DTChoreography)return;
  const G=root.DTGame.prototype,R=root.DTRenderer.prototype,A=root.DTAscensionArt,E=root.DTElements,D=root.DTWorld,TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a)),ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x)},mix=(a,b,t)=>a+(b-a)*t;
  const reduced=()=>!!root.DTSettings?.reducedMotion;
  const quality=()=>root.DTSettings?.graphics==='low'||root.DTTouch?.active&&root.DTSettings?.graphics!=='high'?0:root.DTSettings?.graphics==='high'?2:1;
  const forms=['fire','wind','earth','lightning','ice','nature','light'];
  const synthetic=new WeakMap(),transitions=new WeakMap(),history=new WeakMap(),hitTimes=new WeakMap();
  const texture=new Image();texture.decoding='async';texture.src='assets/spirit-fx-v07.png';
  const metrics={bodies:0,triangles:0,ghosts:0};
  const profiles={an:{pull:1.9,reach:3.5,cloth:1.1,step:1},linh:{pull:2.5,reach:-1.5,cloth:1.6,step:1.15},kiet:{pull:3.1,reach:4.1,cloth:.65,step:.75},hoavi:{pull:1,reach:1.3,cloth:1.15,step:.85},thienvu:{pull:1.9,reach:2.6,cloth:1.2,step:1}};
  const elementalProfiles={lightning:{reach:3.6,cloth:.9},wind:{reach:1.6,cloth:2.1,step:1.1},earth:{pull:2.8,reach:2.3,cloth:.4,step:.6},fire:{reach:3.5,cloth:1.3},ice:{reach:1.9,cloth:.7},nature:{reach:1.8,cloth:1.5},light:{reach:1.4,cloth:1.6}};
  function profile(hero,form){return{...(profiles[hero]||profiles.an),...(hero==='thienvu'?elementalProfiles[form]||{}:{})}}
  function state(p,time,h){
    const a=p.action,pr=profile(h.id,p.elementForm||p.element),phase=Number.isFinite(p.stride)?p.stride:time*8;
    const duration=Math.max(.06,Number(a?.duration)||.65),release=clamp(Number(a?.release??a?.windup??.16),.001,duration-.001),elapsed=clamp(Number(a?.elapsed)||0,0,duration),age=elapsed-release;
    const wind=a?(age<0?ease(elapsed/release):Math.exp(-age/.055)):0;
    const active=Math.max(.07,(duration-release)*.43),strike=a&&age>=0?Math.sin(clamp(age/active,0,1)*Math.PI):0;
    return{pr,phase,wind,strike,age,key:a?.key||'',progress:a?elapsed/duration:0,active:!!a,move:p.moving?clamp(Math.hypot(p.velocityX||0,p.velocityY||0)/170,.25,1):0,dash:clamp((p.dashTime||0)/.19,0,1),breath:Math.sin(time*2.2)*.32,hurt:clamp((p.hit||0)/.18,0,1)};
  }
  function vertex(u,v,s){
    const torso=Math.sin(Math.PI*clamp((v-.23)/.64,0,1)),legs=ease((v-.66)/.3),side=(u-.5)*2;
    const outer=Math.pow(Math.abs(side),1.4),cloth=Math.sin(Math.PI*clamp((v-.30)/.55,0,1))*outer;
    const stride=Math.sin(s.phase+(side<0?Math.PI:0))*s.move*s.pr.step;
    const action=(-s.pr.pull*s.wind+s.pr.reach*s.strike)*torso;
    const hand=Math.exp(-Math.pow((v-.52)/.17,2))*outer;
    return{
      x:action+stride*legs*1.7+Math.sin(s.phase*.67+v*4)*cloth*s.move*s.pr.cloth*.9+s.dash*torso*2.2-s.hurt*torso,
      y:stride*legs*1.2-s.breath*(1-v)*.6+(s.wind*.8-s.strike*.7)*torso+(s.key==='e'?Math.sin(s.progress*Math.PI)*-2.2:0)*hand+Math.cos(s.phase*.74+side)*cloth*s.move*.45,
    };
  }
  function triangle(c,native,image,src,uv,points){
    const [u0,v0]=uv[0],[u1,v1]=uv[1],[u2,v2]=uv[2],den=(u1-u0)*(v2-v0)-(u2-u0)*(v1-v0);
    if(Math.abs(den)<1e-10)return;
    const [p0,p1,p2]=points,a=((p1.x-p0.x)*(v2-v0)-(p2.x-p0.x)*(v1-v0))/den,b=((p1.y-p0.y)*(v2-v0)-(p2.y-p0.y)*(v1-v0))/den;
    const cc=((p2.x-p0.x)*(u1-u0)-(p1.x-p0.x)*(u2-u0))/den,d=((p2.y-p0.y)*(u1-u0)-(p1.y-p0.y)*(u2-u0))/den;
    const mx=(p0.x+p1.x+p2.x)/3,my=(p0.y+p1.y+p2.y)/3;
    c.save();try{
      c.beginPath();points.forEach((p,i)=>{const x=mx+(p.x-mx)*1.012,y=my+(p.y-my)*1.012;i?c.lineTo(x,y):c.moveTo(x,y)});c.closePath();c.clip();
      c.transform(a,b,cc,d,p0.x-a*u0-cc*v0,p0.y-b*u0-d*v0);
      native.call(c,image,...src,0,0,1,1);metrics.triangles++;
    }finally{c.restore()}
  }
  function warp(c,native,args,s){
    const [image,sx,sy,sw,sh,dx,dy,dw,dh]=args,q=quality(),cols=q===2?4:2,rows=q===2?6:q===1?5:3,grid=[];
    for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
      const u=x/cols,v=y/rows,p=vertex(u,v,s);grid.push({x:dx+u*dw+p.x,y:dy+v*dh+p.y});
    }
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const i=y*(cols+1)+x,ids=[[i,i+1,i+cols+2],[i,i+cols+2,i+cols+1]],u=x/cols,v=y/rows,du=1/cols,dv=1/rows;
      triangle(c,native,image,[sx,sy,sw,sh],[[u,v],[u+du,v],[u+du,v+dv]],ids[0].map(n=>grid[n]));
      triangle(c,native,image,[sx,sy,sw,sh],[[u,v],[u+du,v+dv],[u,v+dv]],ids[1].map(n=>grid[n]));
    }
  }
  const sprite=A.drawSpriteHero;
  function drawHero(c,p,h,time=0,scale=1,npc=false,clone=false,identity=p){
    if(npc||!profiles[h.id]||reduced()||p.hp===0)return sprite(c,p,h,time,scale,npc,clone);
    let old=history.get(identity);
    if(old&&(time<(old.seenTime??old.time)||Math.hypot(p.x-old.x,p.y-old.y)>140)){history.delete(identity);synthetic.delete(identity);transitions.delete(identity);old=null}
    const ally=synthetic.get(identity),a=ally&&time>=ally.start&&time-ally.start<ally.duration?{...ally,elapsed:Math.max(.025,time-ally.start+.025)}:null;
    const actor=a&&!p.action?{...p,action:a}:p,s=state(actor,time,h);
    if(!old)history.set(identity,{x:p.x,y:p.y,time,seenTime:time,points:[]});
    const trail=history.get(identity);
    trail.seenTime=time;
    if(time>trail.time+.035){trail.points.push({x:trail.x,y:trail.y,time:trail.time});trail.x=p.x;trail.y=p.y;trail.time=time;while(trail.points.length>5)trail.points.shift()}
    if(s.dash>0&&!clone&&quality()>0){
      const samples=trail.points.filter(t=>time-t.time<.15).slice(-(quality()===2?2:1));
      for(const t of samples){c.save();c.globalAlpha*=.10;sprite(c,{...actor,x:t.x,y:t.y,shield:0,invulnerable:0,hit:0,action:null},h,time,scale,false,false);c.restore();metrics.ghosts++}
    }
    const trans=transitions.get(identity);
    if(h.id==='thienvu'&&trans&&time>=trans.start&&time-trans.start<.32){c.save();c.globalAlpha*=.42*(1-(time-trans.start)/.32);sprite(c,{...p,elementForm:trans.from,shield:0,invulnerable:0},h,time,scale,false,clone);c.restore()}
    const native=c.drawImage,own=Object.hasOwn(c,'drawImage');
    c.drawImage=function(...args){const src=String(args[0]?.src||args[0]?._src||'');if(args.length===9&&/(?:heroes|thien-vu-v04)\.png(?:$|[?#])/.test(src))warp(c,native,args,s);else native.apply(c,args)};
    try{sprite(c,actor,h,time,scale,npc,clone);metrics.bodies++}finally{if(own)c.drawImage=native;else delete c.drawImage}
    if(s.active&&s.key!=='attack'&&s.wind>.12){
      const col=h.id==='thienvu'?E.byId(p.elementForm||p.element).color:h.color;
      c.save();c.translate(p.x,p.y);c.scale(scale,scale);c.strokeStyle=col;c.globalAlpha*=s.wind*(clone?.16:.44);c.lineWidth=1.2;
      c.beginPath();c.ellipse(0,-26,19+s.wind*6,29+s.wind*4,0,-2.5,-.3);c.stroke();c.restore();
    }
  }
  root.DTVisualHero=drawHero;
  R.drawElementClone=function(clone){const f=E.byId(clone.element);drawHero(this.ctx,{...clone,elementForm:clone.element},{...D.HEROES.thienvu,color:f.color,accent:f.accent},this.game.time,.92,false,true,clone)};

  function emit(g,type,x,y,color,r,life,extra={}){
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    let n=0;for(const e of g.effects)if(e.type?.startsWith('choreo-'))n++;
    if(n>=36)return;
    g.effect(type,x,y,color,r,life,extra);
  }
  function clonePose(g,origin,key,element,target){if(g.dead||origin===g.player||!origin||origin.alive===false)return;synthetic.set(origin,{key,element,start:g.time,duration:key==='r'?.65:key==='attack'?.28:.43,release:.001,windup:.001,angle:target?Math.atan2(target.y-origin.y,target.x-origin.x):origin.facing||0})}
  const cast=G.castElement;
  G.castElement=function(id,key,origin,scale,charge,target){const result=cast.call(this,id,key,origin,scale,charge,target);clonePose(this,origin,key,id,target);if(!this.dead&&origin.alive!==false&&['q','e','r'].includes(key)){const f=E.byId(id);emit(this,'choreo-release',origin.x,origin.y,f.color,key==='r'?140:80,key==='r'?.85:.54,{hero:'thienvu',element:id,key,angle:target?Math.atan2(target.y-origin.y,target.x-origin.x):origin.facing||0,support:origin!==this.player})}return result};
  const primary=G.elementPrimary;
  G.elementPrimary=function(origin,id,...args){const result=primary.call(this,origin,id,...args);clonePose(this,origin,'attack',id);return result};
  const release=G.releaseCast;
  G.releaseCast=function(c){const p=this.player,origin={x:p.x,y:p.y};const result=release.call(this,c);if(!this.dead&&this.hero.id!=='thienvu'&&['q','e','r'].includes(c.key))emit(this,'choreo-release',origin.x,origin.y,this.hero.color,this.hero.id==='an'&&c.key==='r'?660:160,c.key==='r'?1.05:.65,{hero:this.hero.id,key:c.key,angle:c.angle||0,tx:p.x,ty:p.y,element:this.hero.id==='an'?'fire':this.hero.id==='linh'?'nature':this.hero.id==='kiet'?'lightning':'light'});return result};
  const damage=G.damageEnemy;
  G.damageEnemy=function(e,...args){const hp=e?.hp,result=damage.call(this,e,...args);if(e&&hp>e.hp&&this.time-(hitTimes.get(e)??-10)>.07){hitTimes.set(e,this.time);emit(this,'choreo-hit',e.x,e.y-12,'#ffe8b8',34,.26,{element:e.markElement||this.element?.id||'light',seed:e.x*.1+e.y*.2})}return result};
  const transform=G.transformElement;
  G.transformElement=function(id){const from=this.element?.id,result=transform.call(this,id);if(result&&from&&from!==this.element.id){transitions.set(this.player,{from,start:this.time});emit(this,'choreo-transform',this.player.x,this.player.y,this.element.color,95,.65,{element:this.element.id,from})}return result};
  const split=G.splitElementals;
  G.splitElementals=function(){const before=this.elementClones.length,result=split.call(this);if(this.elementClones.length>before)emit(this,'choreo-split',this.player.x,this.player.y,this.element.color,320,.8,{points:this.elementClones.filter(c=>c.alive).map(c=>({x:c.x,y:c.y,element:c.element})),element:this.element.id});return result};
  const cancel=G.cancelActions;
  G.cancelActions=function(...args){const result=cancel.apply(this,args);if(this.player){history.delete(this.player);transitions.delete(this.player);synthetic.delete(this.player)}for(const c of this.elementClones||[])synthetic.delete(c);this.effects=this.effects.filter(e=>!e.type?.startsWith('choreo-'));return result};

  const line=(c,pts,col,w=2)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke()};
  const polygon=(c,pts,col)=>{c.fillStyle=col;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill()};
  function ring(c,x,y,r,color,ratio=.65){c.strokeStyle=color;c.beginPath();c.ellipse(x,y,Math.max(1,r),Math.max(1,r*ratio),0,0,TAU);c.stroke()}
  function mote(c,x,y,size,element,age,angle=0){
    c.save();c.translate(x,y);c.rotate(angle);
    const row=Math.max(0,forms.indexOf(element)),frame=Math.floor(clamp(age,0,.999)*8);
    if(texture.complete&&texture.naturalWidth)c.drawImage(texture,frame*128,row*128,128,128,-size/2,-size/2,size,size);
    else polygon(c,[[0,-size*.38],[size*.18,0],[0,size*.3],[-size*.18,0]],E.byId(element).color);
    c.restore();
  }
  function spray(c,element,age,count,radius,seed=0){
    for(let i=0;i<count;i++){
      const a=i/Math.max(1,count)*TAU+seed,r=radius*(.2+age*.8),x=Math.cos(a)*r,y=Math.sin(a)*r*.64-18-age*14;
      mote(c,x,y,12+(1-age)*10,element,age,a+age*.9);
    }
  }
  function phoenix(c,e,age){
    const travel=clamp(age/.76,0,1)*546;c.rotate(e.angle);c.translate(travel,-20);
    const wing=Math.sin(age*Math.PI*4)*12,fade=Math.sin(Math.min(1,age/.12)*Math.PI/2);
    c.globalAlpha*=fade;
    for(const s of[-1,1]){
      c.fillStyle=s<0?'#ffae68b0':'#ffc06ab0';c.strokeStyle='#ffe0a0';c.lineWidth=1.6;
      c.beginPath();c.moveTo(-8,0);c.bezierCurveTo(-22,s*(32+wing),-59,s*(56+wing),-78,s*32);c.bezierCurveTo(-53,s*35,-51,s*13,-8,0);c.closePath();c.fill();c.stroke();
      for(let i=0;i<3;i++){c.beginPath();c.moveTo(-18-i*8,s*(5+i*3));c.quadraticCurveTo(-37-i*10,s*(25+wing),-66-i*5,s*(36+wing*.6));c.stroke()}
      if(quality()>0)for(let i=0;i<3;i++)mote(c,-24-i*16,s*(13+i*5+wing*.45),15,'fire',age,i*.15+s*.3);
    }
    polygon(c,[[19,0],[3,-8],[-24,-4],[-37,0],[-24,4],[3,8]],'#fff0b0');
    c.fillStyle='#ffe3a0';c.beginPath();c.ellipse(10,-6,7,6,-.2,0,TAU);c.fill();
    polygon(c,[[15,-8],[26,-3],[16,-2]],'#fff5cf');line(c,[[6,-11],[9,-17],[12,-11]],'#ffbd72',2);
    c.fillStyle='#cc6e3c';c.beginPath();c.arc(12,-7,1.3,0,TAU);c.fill();
    line(c,[[0,0],[-31,3],[-69,0],[-96,8]],'#ffc378',2);
  }
  function legacyEffect(renderer,e){
    if(['element-cast','element-shift','element-split'].includes(e.type))return true;
    const supported=['element-impact','element-beam','element-convergence','element-recall'];
    const ember=e.type==='mythic-ember'&&renderer.game.hero.id==='an'&&e.r>=500;
    const arrow=e.type==='mythic-spear'&&renderer.game.hero.id==='linh'&&Math.abs((e.angle||0)-Math.PI/2)<.01;
    if(!supported.includes(e.type)&&!ember&&!arrow)return false;
    const c=renderer.ctx,age=clamp(1-e.life/Math.max(.01,e.maxLife),0,1),fade=clamp(e.life/.18,0,1),id=e.element||'light',color=e.color||E.byId(id).color;
    c.save();c.translate(e.x,e.y);c.globalAlpha*=fade;c.lineCap=c.lineJoin='round';
    try{
      if(ember){
        c.globalAlpha*=.28;c.rotate(e.angle||0);c.strokeStyle='#ffd193';c.lineWidth=2;c.beginPath();c.moveTo(0,-20);c.bezierCurveTo(150,-39,350,-5,546,-20);c.stroke();
      }else if(arrow){
        const y=reduced()?-8:-95*(1-ease(age/.52));
        line(c,[[0,y-35],[0,y]],'#c6e8a5',2);polygon(c,[[-4,y-6],[0,y+3],[4,y-6]],'#f1f4d1');line(c,[[-4,y-34],[0,y-27],[4,y-34]],'#94cc86',1.5);
        c.globalAlpha*=.42;ring(c,0,1,12,color);
      }else if(e.type==='element-impact'){
        const r=Math.max(12,e.r||40),grow=reduced()?1:.72+age*.28;
        c.globalAlpha*=.62;c.lineWidth=1.5;ring(c,0,2,r*grow,color,1);
        if(!reduced())for(let i=0,n=quality()===0?3:7;i<n;i++){
          const a=i/n*TAU+(e.x*.01+e.y*.02)%TAU,rr=r*(id==='ice'?.93:.66),lift=Math.sin(age*Math.PI)*14;
          mote(c,Math.cos(a)*rr,Math.sin(a)*rr-lift,clamp(r*.32,16,29),id,age,a*.35);
        }
      }else if(e.type==='element-beam'){
        const x=(e.tx??e.x)-e.x,y=(e.ty??e.y)-e.y;
        c.globalAlpha*=.12;line(c,[[0,-18],[x,y-18]],color,Math.max(3,(e.r||12)*2));
        c.globalAlpha=fade*.65;line(c,[[0,-18],[x,y-18]],color,3);line(c,[[0,-18],[x,y-18]],'#fff3cc',1);
        if(!reduced())mote(c,x,y-18,22,e.element||'light',age,0);
      }else if(e.type==='element-convergence'){
        const points=e.points||[];c.globalAlpha*=.58;
        for(let i=0;i<points.length;i++){
          const p=points[i],x=p.x-e.x,y=p.y-e.y,col=E.byId(p.element).color;c.lineWidth=1.4;c.strokeStyle=col;
          c.beginPath();c.moveTo(x,y-27);c.quadraticCurveTo(x*.4,y*.4-35,0,-20);c.stroke();
          if(!reduced())mote(c,x*(1-age),y*(1-age)-25,24,p.element,age,i*.5);
        }
        c.lineWidth=2;ring(c,0,-20,26+(reduced()?0:age*27),'#ffe6b1');
      }else{c.globalAlpha*=.5;c.lineWidth=1.4;ring(c,0,0,45*(1-age*.4),color)}
    }finally{c.restore()}
    return true;
  }
  function drawRelease(c,e,age){
    const simple=reduced(),q=quality(),col=e.color,count=e.support?2:q===2?10:q===1?6:3;
    if(simple){c.globalAlpha*=.45;ring(c,0,-18,e.key==='r'?35:22,col);return}
    if(e.hero==='an'&&e.key==='r'){phoenix(c,e,age);return}
    if(e.hero==='hoavi'){
      if(e.key==='e'){ring(c,0,0,35+age*22,'#92ffe1');ring(c,0,0,28+age*22,'#c7fff0')}
      c.translate(Math.cos(e.angle||0)>=0?58:-58,-48-age*14);c.rotate(Math.sin(age*3)*.05);
      c.fillStyle='#102d39aa';c.fillRect(-34,-22,68,43);c.strokeStyle='#8affdb';c.lineWidth=1.5;c.strokeRect(-34,-22,68,43);
      const n=e.key==='r'?5:3;for(let i=0;i<n;i++){const width=12+((i*13+17)%37)*Math.min(1,age*9);line(c,[[-24,-13+i*7],[-24+width,-13+i*7]],i%2?'#d5fff0':'#72dace',1.5)}
      c.fillStyle='#efffe3';if(Math.floor(age*14)%2===0)c.fillRect(14,11,7,2);
    }else if(e.hero==='linh'){
      c.rotate(e.angle);for(let i=0;i<(e.key==='r'?4:3);i++){const x=25+i*24+age*35;c.lineWidth=1.5;ring(c,x,-21,(8+i*3)*(1-age*.35),'#d5f6b1',1.8)}
      if(e.key==='e')for(let i=0;i<count;i++)mote(c,-age*35+i*9,-10+Math.sin(i)*8,18,'nature',age,i);
    }else if(e.hero==='kiet'){
      c.rotate(e.angle);line(c,[[-15,-22],[27+age*58,-22]],'#c7ddff',3*(1-age)+1);
      for(let i=0;i<count;i++){
        const x=18+i*10+age*22,y=-22+Math.sin(i*4)*18*(1-age);
        line(c,[[x-8,y-5],[x,y],[x-4,y+7],[x+8,y+10]],i%2?'#ddd5ff':'#9fbfff',1.3);
      }
    }else if(e.hero==='an'){
      if(e.key==='q'){
        c.rotate(e.angle);for(let i=0;i<3;i++){c.strokeStyle=i===1?'#ffe6a6':'#ffac72';c.lineWidth=4-i;c.beginPath();c.ellipse(0,-19,47+age*54+i*7,24+age*24,0,-.9,.9);c.stroke()}
      }else spray(c,'fire',age,count,40);
    }else{
      const id=e.element;
      spray(c,id,age,count,e.key==='r'?78:43,(e.angle||0)*.3);
      c.lineWidth=1.5;
      if(id==='wind'){for(let i=0;i<3;i++){c.strokeStyle=i%2?'#e3fff5':'#96e4d4';c.beginPath();c.ellipse(0,-20-i*7,30+age*45,11+age*16,.1,-2.6+age*3,1.1+age*3);c.stroke()}}
      else if(id==='earth'){for(let i=0;i<3;i++)polygon(c,[[i*23-32,2],[i*23-37,-15-age*17],[i*23-23,-25-age*17],[i*23-15,0]],i%2?'#c9a071':'#8f765c')}
      else if(id==='lightning'){for(let i=0;i<3;i++)line(c,[[0,-25],[15+i*12,-40],[7+i*14,-17],[34+i*15,-31]],'#d8d5ff',2)}
      else if(id==='ice'){ring(c,0,0,20+age*48,'#cff6ff');for(let i=0;i<3;i++)mote(c,i*23-23,-26,34,'ice',age,i*.4-.4)}
      else if(id==='nature'){for(let i=0;i<3;i++){c.strokeStyle='#a9db8d';c.beginPath();c.moveTo(i*20-22,2);c.bezierCurveTo(i*20-38,-15,i*20-6,-34,i*20-22,-54*age);c.stroke()}}
      else if(id==='light'){for(let i=0;i<5;i++){const a=i/5*TAU+age*.2;line(c,[[Math.cos(a)*13,Math.sin(a)*13-24],[Math.cos(a)*(32+age*45),Math.sin(a)*(32+age*45)-24]],'#fff5cc',2)}}
      else if(id==='fire'){for(let i=0;i<3;i++)mote(c,i*22-22,-28-age*15,38,'fire',age,i*.35-.35)}
    }
  }
  const effect=R.drawEffect;
  R.drawEffect=function(e){
    if(legacyEffect(this,e))return;
    if(!e.type?.startsWith('choreo-'))return effect.call(this,e);
    const c=this.ctx,age=clamp(1-e.life/Math.max(.01,e.maxLife),0,1),fade=clamp(e.life/.18,0,1);
    if(e.x+e.r<this.camera.x||e.x-e.r>this.camera.x+1280/this.zoom||e.y+e.r<this.camera.y||e.y-e.r>this.camera.y+720/this.zoom)return;
    c.save();c.translate(e.x,e.y);c.globalAlpha*=fade*(e.support?.52:.88);c.lineCap=c.lineJoin='round';
    try{
      if(e.type==='choreo-release')drawRelease(c,e,age);
      else if(e.type==='choreo-hit'){
        if(reduced()){line(c,[[-5,0],[5,0]],'#fff0c9',2);return}
        spray(c,e.element,age,quality()===0?2:5,18,e.seed);line(c,[[-7*(1-age),0],[7*(1-age),0]],'#fff5d3',2);
      }else if(e.type==='choreo-transform'){
        c.lineWidth=1.5;ring(c,0,0,reduced()?37:22+age*65,e.color);
        if(!reduced())for(let i=0;i<7;i++){const a=i/7*TAU+age*.7;mote(c,Math.cos(a)*(23+age*35),Math.sin(a)*(14+age*19)-25,20,e.element,age,a)}
      }else if(e.type==='choreo-split'){
        const alpha=c.globalAlpha;for(const p of e.points||[]){const x=p.x-e.x,y=p.y-e.y,col=E.byId(p.element).color;c.strokeStyle=col;c.lineWidth=1.1;c.globalAlpha=alpha*.8;c.beginPath();c.moveTo(0,-25);c.quadraticCurveTo(x*.5,y*.5-24,x,y-23);c.stroke();if(!reduced())mote(c,x*age,y*age-23,24,p.element,age)}
      }
    }finally{c.restore()}
  };
  const projectile=R.drawProjectile;
  R.drawProjectile=function(b){
    projectile.call(this,b);if(reduced()||!b.friendly||quality()===0||!b.signature)return;
    const c=this.ctx,dx=b.vx||0,dy=b.vy||0,l=Math.hypot(dx,dy)||1,tail=b.kind==='arrow'?30:18;
    c.save();c.globalAlpha*=.45;line(c,[[b.x-dx/l*tail,b.y-dy/l*tail],[b.x,b.y]],b.color||'#d1ffe8',b.kind==='arrow'?1.1:2);c.restore();
  };
  const draw=R.draw;
  R.draw=function(...args){metrics.bodies=metrics.triangles=metrics.ghosts=0;return draw.apply(this,args)};
  root.DTChoreography={profile,state,vertex,drawHero,warp,metrics,texture,forms,quality,synthetic,transitions};
})(globalThis);
