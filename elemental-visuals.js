(function(root){
  'use strict';
  const E=root.DTElements,R=root.DTRenderer.prototype,TAU=Math.PI*2;
  const art=new Image();art.decoding='async';art.src='assets/thien-vu-v04.png';
  const oldHero=root.DTVisualHero,oldEffect=R.drawEffect,oldDraw=R.draw,oldProjectile=R.drawProjectile,oldEnemy=R.drawEnemy;
  const still=()=>!!root.DTSettings?.reducedMotion,low=()=>root.DTSettings?.graphics==='low'||root.DTSettings?.graphics!=='high'&&root.DTTouch?.active;
  function poly(c,p,color){c.fillStyle=color;c.beginPath();p.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.closePath();c.fill()}
  function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.fill()}
  const glows=new Map();
  function glow(c,x,y,r,color,alpha=.3){if(r<=0)return;if(!glows.has(color)){const out=document.createElement('canvas');out.width=out.height=128;const a=out.getContext('2d'),g=a.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,color);g.addColorStop(.25,color+'a0');g.addColorStop(1,color+'00');a.fillStyle=g;a.fillRect(0,0,128,128);glows.set(color,out)}c.save();c.globalAlpha*=alpha;c.drawImage(glows.get(color),x-r,y-r,r*2,r*2);c.restore()}
  function ring(c,r,col,width=2,ratio=.64){c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.ellipse(0,0,Math.max(1,r),Math.max(1,r*ratio),0,0,TAU);c.stroke()}
  function star(c,x,y,r,col,angle=0){c.save();c.translate(x,y);c.rotate(angle);poly(c,[[0,-r],[r*.22,-r*.22],[r,0],[r*.22,r*.22],[0,r],[-r*.22,r*.22],[-r,0],[-r*.22,-r*.22]],col);c.restore()}
  function bolt(c,x1,y1,x2,y2,col,width=3,seed=0){c.save();c.lineJoin='round';c.strokeStyle=col;c.lineWidth=width+4;c.globalAlpha*=.25;c.beginPath();c.moveTo(x1,y1);for(let i=1;i<=8;i++){const j=i===8?0:Math.sin(i*17+seed)*13;c.lineTo(x1+(x2-x1)*i/8+j,y1+(y2-y1)*i/8-j)}c.stroke();c.globalAlpha*=4;c.lineWidth=width;c.strokeStyle=col;c.stroke();c.lineWidth=Math.max(1,width*.3);c.strokeStyle='#fff9e9';c.stroke();c.restore()}
  function crystal(c,x,y,size,col,angle=0){c.save();c.translate(x,y);c.rotate(angle);poly(c,[[0,-size],[size*.34,-size*.26],[size*.26,size*.23],[0,size*.47],[-size*.26,size*.23],[-size*.34,-size*.26]],col);poly(c,[[0,-size],[size*.1,-size*.1],[0,size*.47],[-size*.19,size*.1]],'#efffffcc');c.restore()}
  function leaf(c,x,y,size,col,angle){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=col;c.beginPath();c.moveTo(0,-size);c.quadraticCurveTo(size*.85,0,0,size);c.quadraticCurveTo(-size*.5,0,0,-size);c.fill();c.strokeStyle='#e5f7b188';c.lineWidth=1;c.beginPath();c.moveTo(0,-size*.7);c.lineTo(0,size*.7);c.stroke();c.restore()}
  function drawAvatar(c,p,form,time,scale=1,clone=false){
    const f=E.byId(form),moving=p.moving&&!still(),phase=p.stride||time*8,face=Math.cos(p.facing||0)<0?-1:1;
    c.save();c.translate(Math.round(p.x),Math.round(p.y));c.scale(scale,scale);ellipse(c,0,2,clone?13:16,5,'#071b325c');glow(c,0,-20,35,f.color,clone?.13:.17);
    if(!clone&&p.invulnerable>0&&Math.floor(time*12)%2===0)c.globalAlpha=.7;c.scale(face,1);
    const bob=still()?0:moving?-Math.abs(Math.sin(phase))*2:Math.sin(time*2.4)*.65,lean=still()?0:(p.lean||0)*face;
    c.save();c.translate(0,bob);c.rotate(lean);if(p.dashTime>0&&!still())c.scale(1.08,.94);
    if(art.complete&&art.naturalWidth){const index=E.forms.findIndex(a=>a.id===f.id)*2+(moving&&Math.sin(phase)>0?1:0),cw=art.naturalWidth/4,ch=art.naturalHeight/4,col=index%4,row=Math.floor(index/4);c.drawImage(art,col*cw,row*ch,cw,ch,-38,-73,76,76)}
    else{poly(c,[[-12,-31],[-17,-7],[0,-12],[15,-5],[11,-31]],f.color);ellipse(c,0,-44,11,12,'#e4ba94');c.fillStyle='#dbe7f1';c.fillRect(-10,-51,22,7);c.fillStyle='#1c334c';c.fillRect(-9,-8,6,11);c.fillRect(4,-8,6,11)}
    c.restore();
    const angle=face===1?(p.facing||0):Math.PI-(p.facing||0),recoil=(p.recoil||0)*24;c.save();c.translate(16-recoil,-27+bob);c.rotate(angle);ellipse(c,0,0,5,5,'#22394b');c.strokeStyle=f.color;c.lineWidth=1.5;c.beginPath();c.arc(0,0,6,-1.4,1.4);c.stroke();star(c,1,0,4,f.accent,time*.5);c.restore();
    if(!clone&&p.shield>0){c.strokeStyle=f.color+'a0';c.lineWidth=1.2;c.beginPath();c.ellipse(0,-28,31,42,0,0,TAU);c.stroke()}
    c.restore();
    if(clone){c.save();c.font='bold 10px Segoe UI';c.textAlign='center';c.fillStyle=f.color;c.fillText(f.name,p.x,p.y-77);if(p.hp<p.maxHp){c.fillStyle='#15283b';c.fillRect(p.x-17,p.y+9,34,3);c.fillStyle=f.color;c.fillRect(p.x-17,p.y+9,34*Math.max(0,p.hp/p.maxHp),3)}c.restore()}
  }
  root.DTVisualHero=function(c,p,h,time=0,scale=1,npc=false){if(h.id!=='thienvu'||npc)return oldHero(c,p,h,time,scale,npc);drawAvatar(c,p,p.elementForm||'lightning',time,scale)};
  R.drawElementClone=function(clone){drawAvatar(this.ctx,clone,clone.element,this.game.time,.92,true)};
  art.onload=()=>{document.querySelectorAll('#heroCards canvas').forEach((canvas,i)=>{const h=Object.values(root.DTWorld.HEROES)[i];if(h?.id==='thienvu'){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);drawAvatar(c,{x:28,y:66,facing:0},'lightning',0,.8)}})};
  function sigil(c,r,f,time,alpha=.6){c.save();c.globalAlpha*=alpha;ring(c,r,f.color,2);ring(c,r*.82,f.accent,1);for(let i=0;i<7;i++){const a=i/7*TAU+time;c.save();c.translate(Math.cos(a)*r,Math.sin(a)*r*.64);c.rotate(a+.8);c.strokeStyle=f.color;c.lineWidth=1.2;c.strokeRect(-5,-5,10,10);c.restore()}c.restore()}
  function elementalShape(c,id,r,t,fraction,ultimate=false){
    const f=E.byId(id),n=low()?7:12;
    if(id==='lightning'){for(let i=0;i<(ultimate?7:4);i++){const a=i/(ultimate?7:4)*TAU+t*.3;bolt(c,Math.cos(a)*r*.25,-12+Math.sin(a)*r*.2,Math.cos(a)*r,Math.sin(a)*r*.65-35,f.color,ultimate?3:2,i+t)}}
    if(id==='wind'){c.save();c.lineCap='round';for(let j=0;j<4;j++){c.strokeStyle=j%2?f.accent:f.color;c.globalAlpha=.25+j*.14;c.lineWidth=4-j*.7;c.beginPath();for(let i=0;i<=36;i++){const a=i/36*TAU*1.4+t*3+j*1.5,rr=r*(.2+i/36*.8);const x=Math.cos(a)*rr,y=Math.sin(a)*rr*.52-i/36*(ultimate?130:25);i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}c.restore()}
    if(id==='earth'){for(let i=0;i<n;i++){const a=i/n*TAU,x=Math.cos(a)*r*.8,y=Math.sin(a)*r*.55,h=(ultimate?100:50)*(1-fraction*.5);poly(c,[[x-16,y],[x-13,y-h*.65],[x+2,y-h],[x+17,y-h*.6],[x+18,y+3]],i%2?'#aa7959':'#d8b181');poly(c,[[x+2,y-h],[x+7,y-h*.5],[x+18,y+3],[x+2,y-5]],'#765c50');c.strokeStyle='#ffda96';c.lineWidth=2;c.beginPath();c.moveTo(x-7,y-3);c.lineTo(x+3,y-h*.6);c.stroke()}}
    if(id==='fire'){for(let j=0;j<(ultimate?3:2);j++){c.save();c.strokeStyle=j%2?'#ffb367':'#f65e52';c.lineWidth=ultimate?14:8;c.lineCap='round';c.beginPath();for(let i=0;i<=32;i++){const a=i/32*TAU*.85+t*1.6+j*TAU/3,rr=r*(.35+i/32*.65),x=Math.cos(a)*rr,y=Math.sin(a)*rr*.6-i/32*35;i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke();c.lineWidth=3;c.strokeStyle='#fff0b0';c.stroke();const a=TAU*.85+t*1.6+j*TAU/3;star(c,Math.cos(a)*r,Math.sin(a)*r*.6-35,ultimate?25:14,'#ffd28a',a);c.restore()}for(let i=0;i<n;i++){const a=i/n*TAU+t,x=Math.cos(a)*r,y=Math.sin(a)*r*.58;poly(c,[[x-6,y],[x-2,y-25],[x+3,y-40-(i%3)*9],[x+9,y-8],[x+5,y]],i%2?'#ffcc80':'#ff855b')}}
    if(id==='ice'){for(let i=0;i<n;i++){const a=i/n*TAU;crystal(c,Math.cos(a)*r*.82,Math.sin(a)*r*.54,ultimate?58:32,i%2?'#96dfff':'#b5f0ff',Math.sin(a)*.25)}for(let i=0;i<6;i++){const a=i/6*TAU;c.strokeStyle='#e6ffff99';c.lineWidth=2;c.beginPath();c.moveTo(0,-8);c.lineTo(Math.cos(a)*r*.8,Math.sin(a)*r*.5);c.stroke()}}
    if(id==='nature'){for(let i=0;i<6;i++){const a=i/6*TAU+t*.25;c.save();c.rotate(a);c.strokeStyle='#77c67d';c.lineWidth=5;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(r*.1,-r*.7,r*.7,r*.4,r,0);c.stroke();for(let j=1;j<5;j++)leaf(c,j*r/5,Math.sin(j*2+t)*r*.12-j*7,10+ultimate*7,j%2?'#a3e09b':'#dfedba',j*1.2);c.restore()}}
    if(id==='light'){c.save();c.globalCompositeOperation='lighter';for(let i=0;i<12;i++){const a=i/12*TAU+t*.2;poly(c,[[Math.cos(a-.018)*r*.34,Math.sin(a-.018)*r*.23],[Math.cos(a)*r*1.2,Math.sin(a)*r*.8],[Math.cos(a+.018)*r*.34,Math.sin(a+.018)*r*.23]],i%2?'#fff4ccaa':'#ffd39488')}star(c,0,-24,ultimate?64:34,'#fff6d7',t*.4);c.restore()}
  }
  R.drawEffect=function(e){
    if(!e.type.startsWith('element-')){oldEffect.call(this,e);return}
    const c=this.ctx,g=this.game,f=E.byId(e.element),progress=Math.max(0,Math.min(1,1-e.life/e.maxLife)),fade=Math.sin((1-progress)*Math.PI/2),motion=still()?0:g.time;
    c.save();c.translate(e.x,e.y);c.globalAlpha=fade*(still()?.48:e.support?.46:1);c.strokeStyle=f.color;c.fillStyle=f.color;
    if(e.type==='element-transform'||e.type==='element-recall'){
      const r=e.r*(.3+progress*.7);glow(c,0,-25,r,f.color,.3);sigil(c,r,f,motion*.7);for(let i=0;i<7;i++){const a=i/7*TAU-progress*2,ff=E.forms[i],rr=r*(e.type==='element-recall'?1-progress:1);star(c,Math.cos(a)*rr,Math.sin(a)*rr*.6-20,7,ff.color,a)}
      if(!still()){c.globalAlpha=fade*.3;c.fillStyle=f.color;c.fillRect(-16,-150*(1-progress),32,150*(1-progress))}
    }else if(e.type==='element-split'){
      const r=e.r*(.3+progress*.7);sigil(c,r,f,-motion*.4);for(let i=0;i<e.count;i++){const a=i/e.count*TAU,ff=E.forms[i];c.strokeStyle=ff.color;c.lineWidth=2;c.beginPath();c.moveTo(0,-20);c.lineTo(Math.cos(a)*r,Math.sin(a)*r*.65-30);c.stroke();glow(c,Math.cos(a)*r,Math.sin(a)*r*.65-30,44,ff.color,.65);star(c,Math.cos(a)*r,Math.sin(a)*r*.65-30,12,ff.accent,a)}
    }else if(e.type==='element-convergence'){
      const r=e.r*(.2+Math.sin(progress*Math.PI)*.65);glow(c,0,-25,r,'#fff4df',.45);for(const point of e.points){const ff=E.byId(point.element);c.strokeStyle=ff.color;c.lineWidth=4;c.beginPath();c.moveTo(point.x-e.x,point.y-e.y-22);c.quadraticCurveTo((point.x-e.x)*.5,(point.y-e.y)*.5-100,0,-25);c.stroke();c.lineWidth=1;c.strokeStyle='#fff7df';c.stroke();const a=E.forms.findIndex(f=>f.id===point.element)/7*TAU+progress*3;ring(c,r*(.7+E.forms.findIndex(f=>f.id===point.element)*.045),ff.color,2);star(c,Math.cos(a)*r,Math.sin(a)*r*.65-25,12,ff.color,a)}star(c,0,-25,55*(1-Math.abs(progress-.6)), '#ffffff',motion);
    }else if(e.type==='element-beam'){
      const x=e.tx-e.x,y=e.ty-e.y,w=Math.max(1,e.r*fade);c.globalCompositeOperation='lighter';c.lineCap='round';for(const [width,color,alpha]of[[w*2,f.color,.15],[w,f.color,.7],[w*.24,'#fff9df',1]]){c.globalAlpha=fade*alpha*(still()?.45:1);c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(0,0);c.lineTo(x,y);c.stroke()}glow(c,x,y,w*1.5,f.color,.4);
    }else if(e.type==='element-muzzle'){
      c.rotate(e.angle);star(c,28,0,13,f.color,motion);c.fillStyle='#fff6dc';c.fillRect(23,-2,10,4);
    }else{
      const ultimate=e.key==='r',r=e.r*(e.type==='element-impact'?.4+progress*.6:.6+progress*.4);glow(c,0,-20,r*.9,f.color,ultimate?.3:.14);sigil(c,r,f,motion*.18,.55);elementalShape(c,e.element,r,motion,progress,ultimate||e.type==='element-impact');
      if(ultimate&&!still()){c.globalAlpha=fade*.16;c.globalCompositeOperation='lighter';c.fillStyle=f.color;poly(c,[[-r*.18,0],[-r*.07,-200*(1-progress)],[r*.07,-200*(1-progress)],[r*.18,0]],f.color)}
    }
    c.restore();
  };
  R.drawProjectile=function(b){if(!b.element){oldProjectile.call(this,b);return}const c=this.ctx,f=E.byId(b.element);c.save();c.translate(b.x,b.y-18);c.rotate(b.angle);glow(c,0,0,18,f.color,.3);
    if(b.element==='ice')crystal(c,3,0,13,f.color,Math.PI/2);else if(b.element==='earth'){poly(c,[[-8,-5],[-2,-9],[8,-5],[11,3],[0,8],[-9,4]],'#c99e71');c.fillStyle='#f4d59b';c.fillRect(-2,-4,7,2)}else if(b.element==='nature')leaf(c,0,0,11,f.color,Math.PI/2);else if(b.element==='wind'){c.strokeStyle=f.color;c.lineWidth=3;c.beginPath();c.arc(-5,0,14,-1,1);c.stroke();c.strokeStyle=f.accent;c.lineWidth=1;c.stroke()}else{poly(c,[[-13,0],[-3,-5],[10,0],[-3,5]],f.color);c.fillStyle='#fff9d8';c.fillRect(-2,-1,9,2)}c.restore()};
  R.drawEnemy=function(e){oldEnemy.call(this,e);if(e.frozen>0){this.ctx.save();this.ctx.globalAlpha=.5;crystal(this.ctx,e.x,e.y-14,35,'#a9edff');this.ctx.restore()}if(e.poison>0)glow(this.ctx,e.x,e.y-10,27,'#b3e796',.12)};
  R.draw=function(dt,menu){oldDraw.call(this,dt,menu);const g=this.game;if(menu||!g.isElemental)return;const c=this.ctx;
    c.save();c.scale(this.zoom,this.zoom);c.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));
    for(const field of g.elementFields){if(Math.hypot(field.x-g.player.x,field.y-g.player.y)>900)continue;const f=E.byId(field.element),support=field.owner!=='player';c.save();c.translate(field.x,field.y);c.globalAlpha=support?.09:.22;ring(c,field.r,f.color,2);if(field.key==='r'&&!low()&&!support)elementalShape(c,field.element,field.r*.9,still()?0:g.time,.5,true);else{for(let i=0;i<6;i++){const a=i/6*TAU+(still()?0:g.time*.4);if(field.element==='fire')star(c,Math.cos(a)*field.r,Math.sin(a)*field.r,11,f.color,a);else if(field.element==='nature')leaf(c,Math.cos(a)*field.r*.8,Math.sin(a)*field.r*.7,12,f.color,a);else if(field.element==='ice')crystal(c,Math.cos(a)*field.r*.8,Math.sin(a)*field.r*.7,20,f.color);else{c.strokeStyle=f.color;c.lineWidth=2;c.beginPath();c.arc(0,0,field.r*.96,a,a+.35);c.stroke()}}}c.restore()}
    if(g.elementCinema)drawAvatar(c,g.player,g.element.id,g.time);
    c.restore();
    if(g.elementCinema){const cinema=g.elementCinema,f=E.byId(cinema.element),fade=Math.min(1,cinema.life*2,(cinema.maxLife-cinema.life)*5);c.save();c.globalAlpha=fade;c.fillStyle='#091526c0';c.fillRect(320,531,640,42);c.strokeStyle=f.color;c.lineWidth=1;c.beginPath();c.moveTo(350,572);c.lineTo(930,572);c.stroke();c.textAlign='center';c.font='bold 15px Segoe UI';c.fillStyle=f.accent;c.fillText(cinema.name.toUpperCase(),640,558);c.restore()}
  };
  root.DTElementArt={art,drawAvatar};
})(globalThis);
