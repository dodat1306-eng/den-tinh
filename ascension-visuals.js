(function(root){
  'use strict';
  const D=root.DTWorld,Base=root.DTRenderer,TAU=Math.PI*2;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=n=>{n=clamp(n,0,1);return n*n*(3-2*n)};
  const reduced=()=>!!root.DTSettings?.reducedMotion;
  const lightweight=()=>root.DTSettings?.graphics==='low'||root.DTSettings?.graphics!=='high'&&!!root.DTTouch?.active;
  const oval=(c,x,y,rx,ry,col)=>{c.fillStyle=col;c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.fill()};
  const poly=(c,p,col)=>{c.fillStyle=col;c.beginPath();p.forEach((v,i)=>i?c.lineTo(v[0],v[1]):c.moveTo(v[0],v[1]));c.closePath();c.fill()};
  const line=(c,p,col,width=2)=>{c.strokeStyle=col;c.lineWidth=width;c.beginPath();p.forEach((v,i)=>i?c.lineTo(v[0],v[1]):c.moveTo(v[0],v[1]));c.stroke()};
  function halo(c,x,y,r,col,alpha=.2){c.save();c.globalAlpha*=alpha;const g=c.createRadialGradient(x,y,0,x,y,Math.max(1,r));g.addColorStop(0,col);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore()}
  function noise(x,y,seed){let n=Math.imul(x+seed,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296}
  function star(c,x,y,r,col,a=0){c.save();c.translate(x,y);c.rotate(a);poly(c,[[0,-r],[r*.23,-r*.23],[r,0],[r*.23,r*.23],[0,r],[-r*.23,r*.23],[-r,0],[-r*.23,-r*.23]],col);c.restore()}
  // Native text setters keep labels in inherited draw hooks on the bundled Vietnamese font.
  const fontContexts=new WeakSet();
  function fontContext(c){
    if(!c||fontContexts.has(c))return c;
    let proto=c,descriptor;
    while(proto&&!descriptor){descriptor=Object.getOwnPropertyDescriptor(proto,'font');proto=Object.getPrototypeOf(proto)}
    if(descriptor?.get&&descriptor?.set)try{
      Object.defineProperty(c,'font',{configurable:true,get(){return descriptor.get.call(this)},set(v){descriptor.set.call(this,String(v).replace(/((?:\d+(?:\.\d+)?)(?:px|pt)(?:\/[^\s]+)?)\s+.+$/,'$1 "DenTinh Sans", "Segoe UI", sans-serif'))}});
    }catch(_){/* A context may be non-extensible; explicit labels below still use the font. */}
    fontContexts.add(c);return c;
  }
  function actionPose(p,time){
    const a=p.action,phase=Number(p.stride)||time*9;
    const speed=Math.hypot(Number(p.velocityX)||0,Number(p.velocityY)||0);
    const move=p.moving?clamp(speed/170,.25,1):0;
    let anticipation=0,strike=0,recover=0,progress=0;
    if(a){
      const duration=Math.max(.05,Number(a.duration)||.65),elapsed=clamp(Number(a.elapsed)||0,0,duration),release=clamp(Number(a.release)||Number(a.windup)||duration*.3,.01,duration-.01);
      progress=elapsed/duration;
      if(elapsed<release)anticipation=smooth(elapsed/release);
      else{const active=Math.max(.055,(duration-release)*.43);strike=Math.sin(clamp((elapsed-release)/active,0,1)*Math.PI);recover=1-smooth((elapsed-release)/Math.max(.01,duration-release));}
    }
    return{phase,move,speed,anticipation,strike,recover,progress,key:a?.key||'',angle:Number.isFinite(a?.angle)?a.angle:(p.facing||0),active:!!a};
  }
  const oldHero=root.DTVisualHero;
  // Keep the original painted sprites. Cast motion transforms the sprite as a
  // whole; it must never replace the face, outfit or elemental silhouette.
  function drawSpriteHero(c,p,h,time=0,scale=1,npc=false,clone=false){
    if(h.id==='quanle'&&root.DTQuanLePixel)return root.DTQuanLePixel.hero(c,p,h,time);
    if(!npc&&root.DTWorldPixel?.hero(c,p,h,time))return;
    if(h.id==='thienvu'&&!npc)return root.DTThienVuPixel?.hero(c,p,time,-Infinity,clone);
    if(npc||!['an','linh','kiet','hoavi','thienvu'].includes(h.id))return oldHero(c,p,h,time,scale,npc);
    const pose=actionPose(p,time),calm=reduced(),face=Math.cos(p.facing||0)<0?-1:1;
    const form=p.elementForm||p.element||'lightning',f=h.id==='thienvu'?root.DTElements?.byId(form):null;
    const wind=calm?0:pose.anticipation,hit=calm?0:pose.strike;
    const pull={an:2,linh:3,kiet:4,hoavi:1,thienvu:2}[h.id];
    const reach={an:4,linh:3,kiet:7,hoavi:2,thienvu:4}[h.id];
    const shift=-wind*pull+hit*reach;
    const hop=!calm&&h.id==='linh'&&pose.key==='e'?Math.sin(pose.progress*Math.PI)*5:0;
    const rise=!calm&&pose.key==='r'?Math.sin(pose.progress*Math.PI)*2:0;
    const avatar={...p,x:0,y:0,elementForm:form,facing:pose.active?pose.angle:p.facing,cast:pose.active?0:p.cast};
    c.save();fontContext(c);c.translate(p.x,p.y);c.scale(scale,scale);
    if(clone)c.globalAlpha*=.88;
    if(pose.active&&pose.key!=='attack'&&!clone){
      c.save();c.globalAlpha*=.2+wind*.15;c.strokeStyle=f?.color||h.color;c.lineWidth=1.1;
      c.beginPath();c.ellipse(0,2,23+wind*4,7+wind,0,0,TAU);c.stroke();c.restore();
    }
    c.translate(Math.cos(pose.angle)*shift,Math.sin(pose.angle)*shift*.45-hop-rise);
    c.rotate(calm?0:face*(-wind*.035+hit*.05));
    if(clone&&root.DTElementArt)root.DTElementArt.drawAvatar(c,avatar,form,time,1,true);
    else oldHero(c,avatar,h,time,1,npc);
    c.restore();
  }
  root.DTVisualHero=drawSpriteHero;
  const terrainBase=root.DTScenery?.Terrain;
  const palettes=root.DTScenery?.palettes||{forest:['#1d4540','#244e45','#2c594b','#3a6953','#72a17a']};
  function paletteAt(x,y){const z=D.zoneAt(x,y),id=z.paletteId||z.id.replace(/^endless-/,''),pal=palettes[id]||palettes.forest;return{z,id,pal}}
  class BoundlessTerrain extends terrainBase{
    // The old overview only samples the original finite region.
    chunk(cx,cy){return super.chunk(cx,cy)}
    draw(c,camera,width,height){
      const size=this.size,minX=Math.floor(camera.x/size),maxX=Math.floor((camera.x+width)/size),minY=Math.floor(camera.y/size),maxY=Math.floor((camera.y+height)/size);
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)c.drawImage(this.chunk(x,y),x*size-1,y*size-1);
      while(this.chunks.size>(lightweight()?20:36))this.chunks.delete(this.chunks.keys().next().value);
    }
  }
  class AscensionRenderer extends Base{
    constructor(canvas,game){super(canvas,game);fontContext(this.ctx);this.smoothDt=.016;this.zoom=1}
    makeGround(world){return world.infinite&&terrainBase?new BoundlessTerrain(world):super.makeGround(world)}
    setGame(game){super.setGame(game);this.camera={x:game.player.x-640/this.zoom,y:game.player.y-360/this.zoom}}
    drawElementClone(clone){const f=root.DTElements?.byId(clone.element);drawSpriteHero(this.ctx,{...clone,elementForm:clone.element,action:clone.action}, {...D.HEROES.thienvu,color:f?.color,accent:f?.accent},this.game.time,.92,false,true)}
    drawProp(o){
      if(root.DTWorldPixel?.prop(this,o))return;
      if(!o.destroyed){super.drawProp(o);return}
      const c=this.ctx;c.save();c.translate(o.x,o.y);oval(c,0,2,22,7,'#172f3955');
      if(['rock','crystal','pillar'].includes(o.type)){
        for(let i=0;i<5;i++){const x=Math.sin(i*7+o.x)*17,y=Math.cos(i*4+o.y)*6;poly(c,[[x-4,y],[x-2,y-7],[x+4,y-5],[x+5,y+1]],o.type==='crystal'?'#7aaca8':'#6a8186')}
      }else{
        c.fillStyle='#687360';c.fillRect(-6,-8,12,10);oval(c,0,-8,7,3,'#b4ab81');line(c,[[-15,1],[16,-4]],'#7c735a',3);
      }
      c.restore();
    }
    drawEnvironment(o){
      const c=this.ctx,g=this.game,t=reduced()?0:g.time,fire=['fire','burning'].includes(o.elementalState),ice=['ice','frozen'].includes(o.elementalState),col=fire?'#ffac6c':ice?'#abeaff':o.used?'#7b9c8e':'#d3dcc2';
      c.save();c.translate(o.x,o.y);oval(c,0,2,o.type==='sagaGate'?38:24,7,'#102b3655');
      if(o.type==='campfire'){
        for(let i=0;i<6;i++){const a=i/6*TAU;oval(c,Math.cos(a)*16,Math.sin(a)*6,5,3,'#8e9c94')}
        line(c,[[-12,-1],[10,-9]],'#805f48',5);line(c,[[-10,-9],[12,-1]],'#b08a59',4);
        if(!o.used||fire){halo(c,0,-13,58,'#ffd292',.2);for(let i=0;i<3;i++)poly(c,[[i*7-11,0],[i*7-7,-21-Math.sin(t*7+i)*5],[i*7-2,0]],i%2?'#ffe0a1':'#f0a16e')}
      }else if(o.type==='barrel'){
        c.fillStyle=o.used?'#5a6155':'#947052';c.fillRect(-12,-23,24,22);oval(c,0,-23,12,4,o.used?'#6d7664':'#b5996e');line(c,[[-12,-16],[12,-16]],'#52646a',3);line(c,[[-12,-5],[12,-5]],'#52646a',3);for(let i=-1;i<=1;i++)line(c,[[i*6,-20],[i*6,-2]],'#5e51434d',1);if(o.used){line(c,[[-8,-20],[5,-5],[-2,-1]],'#243c3d',2)}
      }else if(o.type==='ore'){
        poly(c,[[-20,1],[-17,-14],[-5,-24],[12,-19],[22,0],[5,6]],'#526e77');poly(c,[[-12,-4],[-5,-27],[5,-12],[1,1]],o.used?'#788d87':'#a7dfdf');poly(c,[[5,0],[10,-17],[17,-8],[13,4]],o.used?'#627f7c':'#c2e5c2');if(!o.used)halo(c,0,-12,31,'#a1ded0',.12)
      }else if(o.type==='spiritTree'){
        line(c,[[0,0],[0,-34],[-11,-47]],'#596b65',8);line(c,[[0,-22],[15,-43]],'#6f8171',5);for(let i=0;i<5;i++){const a=i/5*TAU;oval(c,Math.cos(a)*19,-39+Math.sin(a)*14,15,11,o.used?'#577c6a':'#659c8d');star(c,Math.cos(a)*20,-43+Math.sin(a)*13,3,o.used?'#8bb5a1':'#d4f1c5',t*.4)}
      }else if(o.type==='sagaGate'){
        for(const side of[-1,1]){poly(c,[[side*24-9,0],[side*24-8,-55],[side*24+9,-55],[side*24+9,0]],'#617b86');line(c,[[side*24-5,-49],[side*24-5,-6]],'#a2b9ac',3)}
        poly(c,[[-39,-55],[-28,-68],[28,-68],[39,-55]],'#7e9693');line(c,[[-29,-55],[29,-55]],'#c3d4ad',3);halo(c,0,-31,43,o.color||'#a7deeb',o.used?.05:.16);
        c.strokeStyle=o.color||'#ace2df';c.lineWidth=2;c.beginPath();c.ellipse(0,-28,18,26,0,0,TAU);c.stroke();star(c,0,-28,7,o.color||'#d2edbc',t*.3);
      }else{
        c.fillStyle='#5e7a7d';c.fillRect(-15,-5,30,7);poly(c,[[-11,-5],[-9,-33],[0,-40],[10,-31],[11,-5]],'#8da69b');star(c,0,-24,6,o.used?'#b5ccad':'#f4dfaa',t*.4);if(!o.used){halo(c,0,-24,36,'#c2e0d0',.15);c.strokeStyle='#d1e9cc88';c.lineWidth=1;c.beginPath();c.ellipse(0,0,30,11,0,0,TAU);c.stroke()}
      }
      if(ice){poly(c,[[-18,2],[-13,-29],[0,-42],[18,-24],[20,3]],'#b2edff66');line(c,[[-12,-23],[0,-36],[14,-19]],'#e0ffffaa',1)}
      if(fire&&!reduced())for(let i=0;i<3;i++)poly(c,[[i*10-15,-5],[i*10-10,-29-Math.sin(t*6+i)*6],[i*10-5,-5]],'#fbc58199');
      if(o.elementalState==='lightning'){line(c,[[-14,-18],[-4,-25],[-9,-10],[5,-16],[1,-2],[16,-10]],'#cecbff',2)}
      if(o.elementalState==='nature'){halo(c,0,-20,33,'#b7e6a0',.12);for(const side of[-1,1])poly(c,[[0,-10],[side*17,-23],[side*13,-7]],'#9bcb8c99')}
      if(Math.hypot(o.x-g.player.x,o.y-g.player.y)<105){c.font='600 10px "DenTinh Sans"';c.textAlign='center';c.fillStyle=col;c.fillText(o.name||o.type,0,o.type==='sagaGate'?-78:-47)}
      c.restore();
    }
    drawSagaTelegraph(t){
      const c=this.ctx,progress=clamp(1-t.timer/Math.max(.01,t.maxTimer||t.timer||1),0,1),col=t.color||'#ffb08a';
      c.save();c.strokeStyle=col;c.fillStyle=col;c.lineWidth=2;c.lineCap='round';
      if(t.kind==='line'){
        const width=Math.max(8,t.r||t.width||22);c.globalAlpha=.12+progress*.15;c.lineWidth=width*2;line(c,[[t.x,t.y],[t.x2??t.tx??t.x,t.y2??t.ty??t.y]],col,width*2);
        c.globalAlpha=.85;c.setLineDash([9,7]);line(c,[[t.x,t.y],[t.x2??t.tx??t.x,t.y2??t.ty??t.y]],col,2);c.setLineDash([]);
        if(progress>.72){c.globalAlpha=(progress-.72)*2;line(c,[[t.x,t.y],[t.x2??t.tx??t.x,t.y2??t.ty??t.y]],'#ffecb9',2)}
      }else if(t.kind==='ring'){
        const inner=Math.max(0,t.inner||t.r*.55),outer=Math.max(inner+3,t.r||80);c.globalAlpha=.15+progress*.13;c.beginPath();c.arc(t.x,t.y,outer,0,TAU);c.arc(t.x,t.y,inner,0,TAU,true);c.fill('evenodd');c.globalAlpha=.8;c.lineWidth=2;for(const rr of[inner,outer]){c.beginPath();c.arc(t.x,t.y,rr,0,TAU);c.stroke()}c.globalAlpha=.4;c.lineWidth=3;c.beginPath();c.arc(t.x,t.y,mix(inner,outer,progress),0,TAU);c.stroke();
      }else{
        const r=t.r||80;c.globalAlpha=.12+progress*.16;oval(c,t.x,t.y,r,r,col);c.globalAlpha=.85;c.lineWidth=2;c.beginPath();c.arc(t.x,t.y,r,0,TAU);c.stroke();c.globalAlpha=.3;oval(c,t.x,t.y,r*progress,r*progress,col);
      }
      c.restore();
    }
    drawMythicField(f){
      if(f.life<=0||root.DTThienVuPixel?.field(this,f))return;
      const c=this.ctx,g=this.game,time=reduced()?0:g.time,r=Math.max(1,f.r||100),fade=clamp(f.life/.35,0,1);
      const colors={fire:'#ffbe7b',ice:'#a6e9ff',earth:'#dab88a',wind:'#b7efdd',water:'#86d4e1',nature:'#b9e79f',light:'#fff0b9',lightning:'#c9c9ff'};
      const col=colors[f.element]||g.hero.color;
      c.save();c.translate(f.x,f.y);c.globalAlpha=fade;c.lineCap=c.lineJoin='round';
      const footprint=(radius,color=col,fill=.04,dashed=false)=>{
        c.save();c.globalAlpha*=fill;oval(c,0,0,radius,radius,color);c.restore();
        c.save();c.globalAlpha*=.48;c.strokeStyle=color;c.lineWidth=1.3;if(dashed)c.setLineDash([6,8]);c.beginPath();c.arc(0,0,radius,0,TAU);c.stroke();c.restore();
      };
      if(f.kind==='wall'||f.kind==='mirror'){
        c.rotate(f.angle||0);
        // Projectile collision uses the segment ±r and a 16px half-width.
        c.save();c.globalAlpha*=.1;line(c,[[-r,0],[r,0]],col,32);c.restore();
        line(c,[[-r,0],[r,0]],col,3);line(c,[[-r,-16],[r,-16]],col+'a0',1);line(c,[[-r,16],[r,16]],col+'a0',1);
        for(const side of[-1,1]){
          line(c,[[side*r,0],[side*r,-30]],f.kind==='mirror'?'#d2f3ff':'#9fb2cb',4);
          star(c,side*r,-31,6,col,time*.2);
        }
        if(f.kind==='mirror'){
          c.save();c.globalAlpha*=.19;poly(c,[[-r,0],[-r,-31],[r,-31],[r,0]],col);c.restore();
          line(c,[[-r,-31],[r,-31]],'#ebffff',1.5);
          for(let x=-r+16;x<r-10;x+=33)line(c,[[x,-7],[x+13,-24]],'#eaffff99',1.5);
        }else if(f.element==='earth'){
          for(let x=-r+8;x<r;x+=29){const hh=19+noise(Math.floor(x),Math.floor(f.y),g.world.seed)*15;poly(c,[[x-12,1],[x-10,-hh+7],[x,-hh],[x+12,-hh+9],[x+14,1]],'#aa8e72');line(c,[[x-7,-hh+10],[x+1,-hh+3],[x+9,-hh+11]],'#f0d4a2',1)}
        }else{
          for(let x=-r+5;x<r-9;x+=34)line(c,[[x,-3],[x+9,-21],[x+17,-13],[x+24,-28],[x+30,-3]],col,1.7);
        }
      }else if(f.kind==='lantern'){
        footprint(95,'#f7dfad',.025,true);footprint(55,'#ffbe7b',.045);
        for(const other of g.mythicFields||[])if(other.kind==='lantern'&&other.life>0&&String(other.id)>String(f.id)){
          const x=other.x-f.x,y=other.y-f.y;c.save();c.globalAlpha*=.07;line(c,[[0,0],[x,y]],'#ffc16f',34);c.restore();
          c.save();c.globalAlpha*=.8;line(c,[[0,0],[x,y]],'#f5c880',2);c.restore();
          if(!reduced()){const progress=(g.time*.25+noise(f.x,other.x,11))%1;star(c,x*progress,y*progress,3,'#fff2bd',g.time)}
        }
        oval(c,0,0,12,5,'#263c3c66');line(c,[[0,-2],[0,-38]],'#a1875c',3);line(c,[[-9,-33],[9,-33]],'#dbc89b',3);
        poly(c,[[-9,-30],[9,-30],[11,-19],[7,-9],[-7,-9],[-11,-19]],'#96724e');poly(c,[[-6,-28],[6,-28],[7,-19],[4,-12],[-4,-12],[-7,-19]],'#ffdd8d');line(c,[[0,-27],[0,-13]],'#fff2be',2);halo(c,0,-20,32,'#ffd17b',.23);
      }else if(f.kind==='cage'){
        // Damage is four square edge segments of half-width 22, not a circular arena.
        c.save();c.globalAlpha*=.07;c.strokeStyle=col;c.lineWidth=44;c.strokeRect(-r,-r,r*2,r*2);c.restore();
        c.strokeStyle=col;c.lineWidth=2.5;c.strokeRect(-r,-r,r*2,r*2);
        c.save();c.globalAlpha*=.3;c.lineWidth=1;c.strokeRect(-r-22,-r-22,(r+22)*2,(r+22)*2);c.strokeRect(-r+22,-r+22,(r-22)*2,(r-22)*2);c.restore();
        const points=[[-r,-r],[r,-r],[r,r],[-r,r]];
        for(const [x,y]of points){poly(c,[[x-7,y],[x-5,y-36],[x,y-45],[x+6,y-35],[x+8,y]],'#8195b6');line(c,[[x,y-37],[x,y-8]],'#e0deff',2);star(c,x,y-42,7,col,time*.2)}
        if(!reduced())for(let i=0;i<4;i++){const start=points[i],end=points[(i+1)%4],t=(g.time*.35+i*.2)%1;star(c,mix(start[0],end[0],t),mix(start[1],end[1],t),4,'#f2eaff',g.time)}
      }else if(f.kind==='trap'){
        footprint(r,'#bee49e',.035,true);
        for(let i=0;i<10;i++){const a=i/10*TAU,x=Math.cos(a)*r*.72,y=Math.sin(a)*r*.72;poly(c,[[x-4,y+2],[x,y-18],[x+4,y+2]],i%2?'#86b67c':'#c4d5a0');line(c,[[x-3,y-7],[x+3,y-7]],'#e2e6b9',1)}
        line(c,[[-r*.55,0],[r*.55,0]],'#a3c38d',1);line(c,[[0,-r*.55],[0,r*.55]],'#a3c38d',1);
      }else if(f.kind==='satellites'){
        c.save();c.globalAlpha*=.16;c.strokeStyle='#8af2db';c.lineWidth=1;c.setLineDash([4,8]);c.beginPath();c.ellipse(0,0,100,75,0,0,TAU);c.stroke();c.restore();
        for(const side of[-1,1]){
          const a=g.time*1.7+side*Math.PI/2,x=Math.cos(a)*100,y=Math.sin(a)*75;
          c.save();c.translate(x,y);oval(c,0,2,15,5,'#172d3866');poly(c,[[-15,-12],[-8,-20],[8,-20],[15,-12],[9,-3],[-9,-3]],'#2f5965');line(c,[[-11,-12],[11,-12]],'#8ff3de',3);c.fillStyle='#dcfff1';c.fillRect(-3,-15,6,6);line(c,[[-18,-15],[-24,-11]],'#97b7b1',2);line(c,[[18,-15],[24,-11]],'#97b7b1',2);halo(c,0,-12,25,'#89fce1',.15);c.restore();
        }
      }else if(f.kind==='water'){
        footprint(r,col,.1);c.save();c.globalAlpha*=.28;c.strokeStyle='#c5f1e8';c.lineWidth=1;for(let i=0;i<4;i++){const rr=r*(.2+((i/4+time*.12)% .8));c.beginPath();c.arc(0,0,rr,.2+i,.2+i+Math.PI*.8);c.stroke()}c.restore();
      }else if(f.kind==='garden'||f.kind==='vine'){
        footprint(r,col,.035);for(let i=0;i<(lightweight()?5:8);i++){const a=i/(lightweight()?5:8)*TAU,reach=r*.78,x=Math.cos(a)*reach,y=Math.sin(a)*reach;c.strokeStyle='#79ab84';c.lineWidth=2.2;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(x*.2-y*.15,y*.2+x*.15,x*.75+y*.2,y*.75-x*.2,x,y);c.stroke();for(const sign of[-1,1])poly(c,[[x*.7,y*.7],[x*.75-y*.08*sign,y*.75+x*.08*sign-10],[x*.5-y*.08*sign,y*.5+x*.08*sign]],i%2?'#b1dda0':'#78b386');if(f.kind==='garden')star(c,x,y,4,'#eff1ba',a+time*.1)}
      }else if(f.kind==='vortex'||f.kind==='tornado'){
        footprint(r,col,.025);const height=f.kind==='tornado'?100:45;c.save();c.globalAlpha*=.36;
        for(let i=0;i<4;i++){c.strokeStyle=i%2?'#d5fff0':col;c.lineWidth=i%2?1.5:3;c.beginPath();for(let j=0;j<=32;j++){const k=j/32,a=k*TAU*1.4+time*(f.kind==='tornado'?2.5:1.7)+i*Math.PI/2,rr=r*(.2+k*.72),x=Math.cos(a)*rr,y=Math.sin(a)*rr-k*height;j?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}c.restore();
      }else if(f.kind==='orbs'){
        footprint(r,col,.03);for(let i=0;i<5;i++){const a=i/5*TAU+time*1.7,x=Math.cos(a)*r*.78,y=Math.sin(a)*r*.78;halo(c,x,y-12,20,'#ffbd7b',.16);poly(c,[[x-7,y],[x-6,y-13],[x,y-26],[x+8,y-10],[x+7,y]],'#ffb879');poly(c,[[x-3,y],[x,y-18],[x+3,y]],'#fff0b4')}
      }else if(f.kind==='sigil'){
        footprint(r,col,.035);c.strokeStyle=col;c.lineWidth=1.4;for(let i=0;i<6;i++){const a=i/6*TAU;line(c,[[Math.cos(a)*r*.7,Math.sin(a)*r*.7],[Math.cos(a+Math.PI*2/3)*r*.7,Math.sin(a+Math.PI*2/3)*r*.7]],col+'80',1);star(c,Math.cos(a)*r,Math.sin(a)*r,4,col,a)}
      }else if(f.kind==='decoy'){
        footprint(r,'#d5d6c1',.015,true);c.save();c.globalAlpha*=.42;poly(c,[[-11,-32],[-16,-7],[0,-11],[15,-7],[10,-32]],'#ced7c1');oval(c,0,-43,10,12,'#e1dbc0');poly(c,[[-17,-42],[0,-56],[19,-42]],'#eff0ce');line(c,[[-13,-25],[-22,-12]],'#dce2c9',4);line(c,[[11,-25],[23,-17]],'#dce2c9',4);star(c,0,-28,5,'#fff2b3',time*.4);c.restore();
      }else footprint(r,col,.025);
      c.restore();
    }
    drawEnemy(e){
      if(root.DTActorsPixel?.enemy(this,e))return;
      if(!e.sagaBoss&&!e.sagaAnchor&&!e.sagaBossId&&!e.bossKind){super.drawEnemy(e);return}
      const c=this.ctx,t=reduced()?0:this.game.time,col=e.color||['#a6e5d4','#d5bb94','#c1c3fa','#e4a78d','#badbc1','#ead5a2'][e.sagaIndex||0],type=e.bossKind||e.sagaBossId||e.sagaBoss;
      if(e.sagaAnchor){super.drawEnemy(e);return}
      c.save();c.translate(e.x,e.y);const size=Math.max(1,(e.r||34)/34),phase=Math.sin(t*2.5)*3;c.scale(size,size);oval(c,0,2,40,11,'#0a243677');halo(c,0,-40,72,col,.12);
      // Each silhouette follows its named folklore role, while feet/base anchors stay on the hitbox.
      const index=typeof e.sagaIndex==='number'?e.sagaIndex:Math.abs(String(type).split('').reduce((a,v)=>a+v.charCodeAt(0),0))%6;
      if(index===0){
        // Hà Bá: flowing water robes, wave crown and a forked river staff.
        for(let i=0;i<3;i++){c.strokeStyle=col+'60';c.lineWidth=2;c.beginPath();c.ellipse(0,2,39+i*8,9+i*3,0,t*.2+i,t*.2+i+Math.PI*1.5);c.stroke()}
        poly(c,[[-35,0],[-21,-47],[-15,-63],[16,-63],[27,-40],[37,0],[12,-7],[0,4],[-13,-6]],'#356a76');
        for(let i=-1;i<=1;i++){c.strokeStyle=i%2?'#a5e0da':'#74adae';c.lineWidth=3;c.beginPath();c.moveTo(i*12,-44);c.bezierCurveTo(i*12-10,-25,i*12+12,-15,i*16,0);c.stroke()}
        poly(c,[[-22,-62],[-22,-78],[-10,-68],[0,-88],[10,-68],[23,-79],[21,-62]],'#9bd5d2');
        line(c,[[34,0],[39,-87]],'#8bb6ae',4);line(c,[[32,-81],[39,-91],[46,-81]],'#c3eee0',3);line(c,[[39,-91],[39,-101]],'#e5f4c9',2);
      }else if(index===1){
        // Hồ Tinh: a low fox muzzle and nine independently swaying tails.
        for(let i=0;i<9;i++){
          const a=-Math.PI*.95+i*Math.PI*.1125+Math.sin(t*1.6+i)*.045,x=Math.cos(a)*70,y=-15+Math.sin(a)*65;
          c.strokeStyle='#403454';c.lineWidth=18;c.beginPath();c.moveTo(0,-15);c.bezierCurveTo(x*.25-10,y*.4,x*.85+8,y*.9,x,y);c.stroke();c.strokeStyle=i%2?'#b690bd':'#9176aa';c.lineWidth=12;c.stroke();oval(c,x,y,7,11,col);
        }
        poly(c,[[-27,0],[-22,-27],[-12,-42],[10,-42],[25,-24],[30,0],[12,-6],[-11,-5]],'#7f6994');
        poly(c,[[-23,-43],[-25,-72],[-7,-59],[8,-60],[25,-75],[22,-43],[7,-27],[-6,-27]],'#b799bd');
        poly(c,[[-19,-47],[-21,-64],[-11,-55]],'#e4b8d0');poly(c,[[12,-55],[22,-67],[19,-46]],'#e4b8d0');poly(c,[[-15,-43],[0,-33],[16,-43],[9,-27],[-7,-27]],'#ecdfd8');oval(c,1,-34,3.4,2.5,'#3c3650');
      }else if(index===2){
        // Thần Trùng: a hanging bronze bell body and a wraith cowl.
        c.save();c.translate(0,phase);line(c,[[0,-94],[0,-83]],'#c8ba8c',4);poly(c,[[-10,-78],[-20,-61],[-24,-35],[-35,-20],[35,-20],[24,-35],[20,-61],[10,-78]],'#9c855b');
        line(c,[[-30,-23],[30,-23]],'#edcd91',4);line(c,[[-24,-36],[24,-36]],'#c6a877',2);for(const x of[-13,0,13])line(c,[[x,-64],[x,-40]],'#d9bb82',1.5);
        oval(c,0,-20,30,8,'#4e503f');line(c,[[0,-24],[0,-9]],'#d4c194',4);oval(c,0,-8,6,5,'#edd4a4');
        poly(c,[[-18,-61],[-7,-83],[10,-82],[20,-60],[10,-51],[-9,-51]],'#354658');for(const side of[-1,1]){c.strokeStyle=col+'b0';c.lineWidth=2;c.beginPath();c.arc(side*4,-40,42+side*6,side<0?Math.PI*.6:-Math.PI*.4,side<0?Math.PI*1.2:Math.PI*.2);c.stroke()}c.restore();
      }else if(index===3){
        // Cửu Khúc Xà: visible coils and a raised, swaying serpent neck.
        for(let i=0;i<3;i++){
          const yy=-4-i*12,rr=42-i*7;c.strokeStyle='#284d4f';c.lineWidth=17;c.beginPath();c.ellipse(Math.sin(t*1.5+i)*3,yy,rr,10,0,0,TAU);c.stroke();c.strokeStyle=i%2?'#8da87b':'#6e977c';c.lineWidth=12;c.stroke();
          for(let j=0;j<8;j++){const a=j/8*TAU;line(c,[[Math.cos(a)*rr-2,yy+Math.sin(a)*10-2],[Math.cos(a)*rr+2,yy+Math.sin(a)*10+2]],'#bdd09a',1)}
        }
        const sway=Math.sin(t*1.8)*7;c.strokeStyle='#355b57';c.lineWidth=24;c.beginPath();c.moveTo(8,-18);c.bezierCurveTo(24+sway,-32,-16+sway,-50,sway,-68);c.stroke();c.strokeStyle='#b0bd84';c.lineWidth=7;c.stroke();
        poly(c,[[sway-20,-66],[sway-16,-85],[sway,-92],[sway+22,-80],[sway+19,-63],[sway+3,-55]],'#7e9e79');poly(c,[[sway-14,-65],[sway+2,-60],[sway+18,-65],[sway+12,-53],[sway-8,-53]],'#d4d6a5');line(c,[[sway+1,-55],[sway+2,-42],[sway-3,-39]],'#dcaa9e',1.5);
      }else if(index===4){
        // Thiết Điểu: hinged metal wings, feather plates, hooked beak and talons.
        const flap=Math.sin(t*2.6)*9;
        for(const side of[-1,1]){
          poly(c,[[side*12,-46],[side*40,-65-flap],[side*82,-51-flap],[side*62,-25],[side*27,-24]],'#536b7c');
          line(c,[[side*15,-45],[side*41,-55-flap],[side*72,-46-flap]],'#bed0cd',3);
          for(let i=0;i<4;i++)poly(c,[[side*(35+i*10),-49-flap*.7],[side*(48+i*10),-42-flap*.7],[side*(30+i*10),-13+i*2]],i%2?'#a2b5b4':'#7e979f');
          line(c,[[side*10,-9],[side*14,4],[side*23,7]],'#c6ac75',4);line(c,[[side*14,4],[side*8,9]],'#edd29e',2);
        }
        poly(c,[[-18,-55],[-13,-18],[0,-5],[17,-20],[21,-54],[0,-69]],'#7d939f');poly(c,[[-12,-67],[-9,-83],[10,-88],[23,-76],[17,-60]],'#b0c1c3');poly(c,[[17,-76],[37,-69],[18,-64],[22,-69]],'#e0bc7b');star(c,0,-38,11,col,t*.25);
      }else{
        // Kẻ Dệt Sương: a hooded figure controlling six shuttles and interlaced threads.
        poly(c,[[-31,0],[-20,-50],[-15,-76],[0,-88],[18,-77],[24,-49],[34,0],[11,-8],[0,-3],[-15,-9]],'#536775');
        for(let i=0;i<6;i++){const a=i/6*TAU+t*.06,x=Math.cos(a)*59,y=-47+Math.sin(a)*36;
          c.strokeStyle=i%2?'#d9cfae88':'#a9d3cf88';c.lineWidth=1;c.beginPath();c.moveTo(i%2?-17:17,-39);c.quadraticCurveTo(-x*.2,-67,x,y);c.lineTo(-x,-94-y);c.stroke();
          c.save();c.translate(x,y);c.rotate(a);poly(c,[[-12,0],[0,-5],[13,0],[0,5]],'#baae8e');line(c,[[-7,0],[7,0]],'#f5dfb3',1.5);c.restore();
        }
        for(const side of[-1,1]){line(c,[[side*12,-51],[side*29,-35],[side*38,-53+Math.sin(t*2+side)*3]],'#9eb8bb',5);star(c,side*38,-53+Math.sin(t*2+side)*3,4,col,t*.2)}
      }
      if(![1,3,4].includes(index)){const faceY=index===2?-66:-52;oval(c,0,faceY+phase,11,11,'#243a48');line(c,[[-8,faceY-1+phase],[-3,faceY-1+phase]],col,2.6);line(c,[[4,faceY-1+phase],[9,faceY-1+phase]],col,2.6)}
      if(index===1){line(c,[[-13,-47],[-7,-45]],'#ffe0a9',2.3);line(c,[[8,-45],[15,-47]],'#ffe0a9',2.3)}
      if(index===3){const sway=Math.sin(t*1.8)*7;line(c,[[sway-12,-76],[sway-6,-73]],'#ffe2ac',2.5);line(c,[[sway+7,-73],[sway+15,-76]],'#ffe2ac',2.5)}
      if(index===4)oval(c,12,-77,3,3,'#fff1af');
      c.restore();
      c.save();c.font='700 12px "DenTinh Sans"';c.textAlign='center';c.fillStyle='#f7edce';c.fillText(e.name||'Hộ thần lạc giới',e.x,e.y-(e.r||34)*2.7-10);c.fillStyle='#142c39';c.fillRect(e.x-45,e.y-(e.r||34)*2.7,90,5);c.fillStyle=col;c.fillRect(e.x-45,e.y-(e.r||34)*2.7,90*clamp(e.hp/e.maxHp,0,1),5);c.restore();
    }
    drawEffect(e){
      if(!e.type?.startsWith('mythic-')){super.drawEffect(e);return}
      // Persistent fields have their own exact footprint; periodic generic circles would hide it.
      if(e.type==='mythic-rune'&&e.kind&&['wall','mirror','lantern','trap','cage','satellites','water','garden','vine','vortex','tornado','orbs','sigil','decoy'].includes(e.kind))return;
      const c=this.ctx,f=clamp(1-e.life/Math.max(.01,e.maxLife),0,1),fade=1-f,col=e.color||this.game.hero.color,r=e.r||100,a=e.angle||0;
      c.save();c.translate(e.x,e.y);c.globalAlpha=fade*(reduced()?.6:1);c.lineCap=c.lineJoin='round';
      if(e.type==='mythic-slash'||e.type==='mythic-spear'){
        c.rotate(a);if(e.type==='mythic-spear'){const reach=r*(.35+smooth(f)*.65);line(c,[[-12,-18],[reach,-18]],col,6*fade+1);poly(c,[[reach-16,-26],[reach+16,-18],[reach-16,-10]],col);line(c,[[0,-18],[reach,-18]],'#fff3d3',1.5)}else{const rr=r*(.55+f*.45);for(let i=0;i<3;i++){c.strokeStyle=i===1?'#fff5d8':col;c.lineWidth=(i===1?2:7)*fade+1;c.beginPath();c.ellipse(0,-18,rr-i*7,rr*.48-i*2,0,-1.1+f*.5,1.1+f*.5);c.stroke()}}
      }else if(e.type==='mythic-tether'){
        const x=(e.tx??e.x)-e.x,y=(e.ty??e.y)-e.y;c.strokeStyle=col;c.lineWidth=3;c.beginPath();c.moveTo(0,-24);c.quadraticCurveTo(x*.5,y*.5-45*Math.sin(f*Math.PI),x,y-20);c.stroke();c.lineWidth=1;c.strokeStyle='#fff3d5';c.stroke();star(c,x,y-20,6+f*10,col,f*2);
      }else if(e.type==='mythic-rune'){
        const rr=r*(.65+f*.35);c.save();c.scale(1,.65);c.rotate(e.angle||f*.3);for(let j=0;j<2;j++){c.strokeStyle=j?'#f5efcf':col;c.lineWidth=j?1:2;c.beginPath();for(let i=0;i<=6;i++){const b=i/6*TAU;j?c.lineTo(Math.cos(b)*(rr-10),Math.sin(b)*(rr-10)):i?c.lineTo(Math.cos(b)*rr,Math.sin(b)*rr):c.moveTo(Math.cos(b)*rr,Math.sin(b)*rr)}c.closePath();c.stroke()}c.restore();
        for(let i=0;i<6;i++){const b=i/6*TAU+f*.3;star(c,Math.cos(b)*rr,Math.sin(b)*rr*.65,5,col,b)}
      }else if(e.type==='mythic-ember'){
        const x=(e.tx??e.x)-e.x,y=(e.ty??e.y)-e.y;c.rotate(Math.atan2(y,x));const length=Math.hypot(x,y)||r;c.strokeStyle=col;c.lineWidth=13*fade+2;c.beginPath();c.moveTo(0,-20);c.bezierCurveTo(length*.35,-40-f*20,length*.65,10-f*20,length,-20);c.stroke();c.strokeStyle='#ffe8aa';c.lineWidth=2;c.stroke();for(let i=0;i<6;i++){const xx=length*i/6;star(c,xx,-20+Math.sin(i+f*8)*12,4*fade+1,col,i+f*3)}
      }else if(e.type==='mythic-orbit'){
        for(let i=0;i<(e.count||5);i++){const b=i/(e.count||5)*TAU+f*4;star(c,Math.cos(b)*r,Math.sin(b)*r*.65-17,8,col,b)}
      }else{
        c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.ellipse(0,0,r*(.35+f*.65),r*(.2+f*.4),0,0,TAU);c.stroke();
      }
      c.restore();
    }
    draw(dt=.016,menu=false){
      const g=this.game,p=g.player,c=this.ctx,z=this.zoom,delta=clamp(Number(dt)||.016,0,.08);this.frameDt=delta;this._drawingTopEffects=false;
      const aimX=clamp((g.input.aimX-p.x)*.05,-55,55),aimY=clamp((g.input.aimY-p.y)*.05,-35,35);
      let tx=p.x-640/z+aimX,ty=p.y-360/z+aimY;
      if(!g.world.infinite){tx=clamp(tx,0,D.W-1280/z);ty=clamp(ty,0,D.H-720/z)}
      if(Math.hypot(this.camera.x-tx,this.camera.y-ty)>2000){this.camera.x=tx;this.camera.y=ty}
      const blend=1-Math.exp(-7*delta);this.camera.x+=(tx-this.camera.x)*blend;this.camera.y+=(ty-this.camera.y)*blend;
      c.imageSmoothingEnabled=false;c.fillStyle='#142b32';c.fillRect(0,0,1280,720);c.save();
      const shake=reduced()?0:g.shake||0;c.translate(shake?(Math.random()-.5)*shake:0,shake?(Math.random()-.5)*shake:0);c.scale(z,z);c.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));
      const left=this.camera.x-180,top=this.camera.y-190,right=this.camera.x+1280/z+180,bottom=this.camera.y+720/z+190,inView=o=>o&&o.x>left&&o.x<right&&o.y>top&&o.y<bottom;
      this.ground.draw(c,this.camera,1280/z,720/z);root.DTWorldPixel?.ground(this,inView);this.drawScenery?.(inView);
      for(const s of g.world.shrines||[])if(inView(s))this.drawShrine(s);if(inView(g.world.altar))this.drawAltar(g.world.altar);
      for(const a of g.activeEffects||[])if(inView(a)){c.save();c.globalAlpha=.1;oval(c,a.x,a.y,a.r,a.r,a.color);c.globalAlpha=.65;c.strokeStyle=a.color;c.lineWidth=1.5;c.setLineDash([9,9]);c.beginPath();c.arc(a.x,a.y,a.r*.95,0,TAU);c.stroke();c.restore()}
      for(const f of g.elementFields||[])if(inView(f)){const color=root.DTElements?.byId(f.element).color||'#a9e6d4';c.save();c.globalAlpha=f.owner==='player'?.16:.07;oval(c,f.x,f.y,f.r,f.r,color);c.globalAlpha=f.owner==='player'?.58:.22;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.arc(f.x,f.y,f.r,0,TAU);c.stroke();c.restore()}
      for(const f of g.mythicFields||[])if(f.x+(f.r||100)>left&&f.x-(f.r||100)<right&&f.y+(f.r||100)>top&&f.y-(f.r||100)<bottom)this.drawMythicField(f);
      for(const t of g.telegraphs||[])this.drawSagaTelegraph({...t,kind:t.kind||'disc'});for(const t of g.sagaTelegraphs||[])this.drawSagaTelegraph(t);
      for(const l of g.loot||[])if(inView(l)){const bob=reduced()?0:Math.sin(g.time*5+l.x)*2.5;oval(c,l.x,l.y-5+bob,4,4,l.type==='gold'?'#f2d48b':'#e3adb4');}
      for(const l of root.DTContent.lore||[])if(!(g.memories||[]).includes(l.id)&&inView(l)){halo(c,l.x,l.y-20,32,'#d5b8ff',.2);c.fillStyle='#eadfff';c.fillRect(l.x-7,l.y-28,14,18);line(c,[[l.x-3,l.y-23],[l.x+4,l.y-23]],'#a68cba',2)}
      for(const e of g.effects||[])if(e.type==='choreo-code-wait')this.drawEffect(e);
      for(const remain of g.shadowRemains||[])if(inView(remain))root.DTQuanLePixel?.remain(this,remain);
      const shadowGround=['shadow-portal','shadow-legion','shadow-web','shadow-roots'];
      for(const e of g.effects||[])if(shadowGround.includes(e.type))this.drawEffect(e);
      const objects=[];
      for(const unit of g.shadowArmy||[])if(unit.life>0&&inView(unit))objects.push({y:unit.y,draw:()=>root.DTQuanLePixel?.beast(this,unit)});
      for(const a of g.elementClones||[])if(a.alive&&inView(a))objects.push({y:a.y,draw:()=>this.drawElementClone(a)});
      for(const b of g.world.beacons||[])if(inView(b))objects.push({y:b.y,draw:()=>this.drawBeacon(b)});
      for(const a of g.elementSummons||[])if(a.life>0&&inView(a))objects.push({y:a.y,draw:()=>this.drawElementSummon?.(a)});
      for(const o of g.world.props||[])if(inView(o)&&!g.elementSummons?.some(s=>s.sourceProp===o&&s.life>0))objects.push({y:o.y,draw:()=>this.drawProp(o)});
      for(const o of g.world.environment||[])if(inView(o))objects.push({y:o.y,draw:()=>this.drawEnvironment(o)});
      for(const o of g.world.npcs||[])if(inView(o))objects.push({y:o.y,draw:()=>this.drawNpc(o)});
      for(const o of g.world.chests||[])if(inView(o))objects.push({y:o.y,draw:()=>this.drawChest(o)});
      for(const e of g.world.enemies||[])if(e.alive&&inView(e))objects.push({y:e.y,draw:()=>this.drawEnemy(e)});
      objects.push({y:p.y,draw:()=>root.DTVisualHero(c,p,g.hero,g.time)});objects.sort((a,b)=>a.y-b.y);for(const o of objects)o.draw();this.drawCompanion();
      for(const b of g.projectiles||[])if(inView(b))this.drawProjectile(b);for(const e of g.effects||[])if(e.type!=='choreo-code-wait'&&!shadowGround.includes(e.type))this.drawEffect(e);
      c.save();c.globalCompositeOperation='lighter';for(const pt of g.particles||[])if(inView(pt)){c.globalAlpha=clamp(pt.life/pt.maxLife,0,1);c.fillStyle=pt.color;c.fillRect(pt.x,pt.y,pt.size,pt.size)}c.restore();
      for(const f of g.floaters||[]){c.save();c.globalAlpha=clamp(f.life*2,0,1);c.font='700 12px "DenTinh Sans"';c.textAlign='center';c.fillStyle='#122734';c.fillText(f.text,f.x+1,f.y+1);c.fillStyle=f.color;c.fillText(f.text,f.x,f.y);c.restore()}
      if(g.hero.id!=='hoavi'&&p.overclock>0&&!g.mythicFields?.some(f=>f.kind==='satellites'))for(let i=0;i<2;i++){const a=g.time*2+i*Math.PI,x=p.x+Math.cos(a)*48,y=p.y+Math.sin(a)*29-23;c.fillStyle='#173448';c.fillRect(x-8,y-5,16,10);line(c,[[x-5,y],[x+5,y]],'#98ffe8',3)}
      if(p.firewall>0){c.save();c.strokeStyle='#efa6e3';c.lineWidth=2;c.setLineDash([11,7]);c.beginPath();c.arc(p.x,p.y,152,g.time*.1,TAU+g.time*.1);c.stroke();c.restore()}
      if(!menu){const target=g.objective?.().target;if(target&&Math.hypot(target.x-p.x,target.y-p.y)>390)this.drawGuide(p,target)}c.restore();
      const zone=paletteAt(p.x,p.y).id,t=reduced()?0:g.time,count=reduced()?6:lightweight()?14:27;c.save();
      for(let i=0;i<count;i++){const x=(i*137+Math.sin(t*.3+i)*24)%1280,y=(i*79-t*(zone==='ash'?22:zone==='waterfall'?-18:7)+72000)%720;c.globalAlpha=zone==='ash'?.25:.12;c.fillStyle=zone==='ash'?'#ffd197':zone==='waterfall'?'#cff2ed':'#eff0ba';c.fillRect(x,y,1.5,zone==='waterfall'?4:2)}c.restore();
      if(g.hitFlash>0){c.fillStyle='rgba(165,47,49,'+g.hitFlash+')';c.fillRect(0,0,1280,720)}
      if(!menu&&g.started){const x=(g.input.aimX-this.camera.x)*z,y=(g.input.aimY-this.camera.y)*z;c.strokeStyle='#f6e8bfaa';c.lineWidth=1;c.beginPath();c.arc(x,y,6.5,0,TAU);c.stroke();for(const a of[0,Math.PI/2,Math.PI,Math.PI*1.5])line(c,[[x+Math.cos(a)*10,y+Math.sin(a)*10],[x+Math.cos(a)*13,y+Math.sin(a)*13]],'#e6d7a2',1)}
      if(g.elementCinema&&!menu){const cin=g.elementCinema,f=root.DTElements?.byId(cin.element),fade=clamp(Math.min(cin.life*2,(cin.maxLife-cin.life)*5),0,1);c.save();c.globalAlpha=fade;c.fillStyle='#0a2032cc';c.fillRect(310,532,660,42);line(c,[[340,574],[940,574]],f?.color||'#d4dbff',1);c.font='700 15px "DenTinh Sans"';c.textAlign='center';c.fillStyle=f?.accent||'#fff1cf';c.fillText(cin.name,640,559);c.restore()}
    }
    map(canvas,large=false){
      if(!this.game.world.infinite){fontContext(canvas.getContext('2d'));super.map(canvas,large);return}
      const c=fontContext(canvas.getContext('2d')),g=this.game,p=g.player,w=canvas.width,h=canvas.height,pad=large?25:5,span=large?8500:2200,scale=(w-pad*2)/span,viewH=(h-pad*2)/scale;
      const ox=p.x-span/2,oy=p.y-viewH/2,to=o=>({x:(o.x-ox)*scale+pad,y:(o.y-oy)*scale+pad}),inside=o=>o.x>=ox&&o.x<=ox+span&&o.y>=oy&&o.y<=oy+viewH;
      c.fillStyle='#0f2532';c.fillRect(0,0,w,h);c.save();c.beginPath();c.rect(pad,pad,w-pad*2,h-pad*2);c.clip();
      const step=span/(large?50:24);for(let y=oy;y<oy+viewH;y+=step)for(let x=ox;x<ox+span;x+=step){c.fillStyle=paletteAt(x+step*.5,y+step*.5).pal[1];const q=to({x,y});c.fillRect(q.x,q.y,step*scale+1,step*scale+1)}
      for(const route of g.world.paths||[]){c.strokeStyle='#c4b28566';c.lineWidth=large?2:1;c.beginPath();route.forEach((v,i)=>{const q=to({x:v[0],y:v[1]});i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y)});c.stroke()}
      c.strokeStyle='#a2c1ba22';c.lineWidth=1;const cs=g.world.stream?.size||g.world.stream?.chunkSize||1024;
      for(let x=Math.ceil(ox/cs)*cs;x<ox+span;x+=cs){const q=to({x,y:oy});line(c,[[q.x,pad],[q.x,h-pad]],'#d3dfca20',1)}for(let y=Math.ceil(oy/cs)*cs;y<oy+viewH;y+=cs){const q=to({x:ox,y});line(c,[[pad,q.y],[w-pad,q.y]],'#d3dfca20',1)}
      const marker=(o,color,r=3)=>{if(!inside(o))return;const q=to(o);oval(c,q.x,q.y,r,r,color)};
      for(const b of g.world.beacons||[]){marker(b,g.outposts?.[b.id]?.claimed?'#8cebd6':'#e4bc83',large?4:2);if(large&&inside(b)){const q=to(b);c.font='600 10px "DenTinh Sans"';c.textAlign='center';c.fillStyle='#e5ecd3';c.fillText(b.name,q.x,q.y+15)}}
      for(const s of g.world.shrines||[])marker(s,s.active?'#a6e7b0':'#f2aac5',large?4:2);
      const sites=g.world.sagaSites||g.sagaSites||[];for(const s of sites)if(inside(s)){const q=to(s);star(c,q.x,q.y,large?6:3,s.color||'#c3c4ff');if(large){c.font='600 11px "DenTinh Sans"';c.textAlign='center';c.fillStyle='#e8e6d0';c.fillText(s.name||s.id,q.x,q.y-12)}}
      for(const e of g.world.environment||[])if(!e.used&&e.type!=='barrel'&&e.type!=='ore')marker(e,'#a6d3cb88',large?2:1);
      const objective=g.objective?.().target;if(objective&&inside(objective)){const q=to(objective);c.strokeStyle='#ffdf83';c.lineWidth=1.5;c.beginPath();c.arc(q.x,q.y,large?10:5,0,TAU);c.stroke()}
      const q=to(p);oval(c,q.x,q.y,large?5:3,large?5:3,'#fff0bd');line(c,[[q.x,q.y],[q.x+Math.cos(p.facing||0)*(large?12:7),q.y+Math.sin(p.facing||0)*(large?12:7)]],'#fff9d6',1.5);
      c.strokeStyle='#f4e6bc66';c.lineWidth=1;const a=to(this.camera);c.strokeRect(a.x,a.y,1280/this.zoom*scale,720/this.zoom*scale);c.restore();
      if(large){c.font='600 12px "DenTinh Sans"';c.fillStyle='#e6e5c8';c.textAlign='left';c.fillText('THẾ GIỚI VÔ HẠN · BẢN ĐỒ LÂN CẬN',pad,17);c.font='10px "DenTinh Sans"';c.fillStyle='#aebfc3';c.fillText('Vị trí '+Math.round(p.x)+', '+Math.round(p.y)+' · Mỗi ô = '+cs+' bước',pad,h-6);c.textAlign='right';c.fillStyle='#d9d1a6';c.fillText('M: đóng bản đồ',w-pad,h-6)}
    }
  }
  root.DTRenderer=AscensionRenderer;
  root.DTAscensionArt={actionPose,noise,fontContext,drawSpriteHero,BoundlessTerrain};
})(globalThis);
