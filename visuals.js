(function(root){
  'use strict';
  const C=root.DTContent,D=root.DTWorld,TAU=Math.PI*2,cache=new Map();
  const atlas=new Image();atlas.onload=()=>{document.querySelectorAll('#heroCards canvas').forEach((canvas,i)=>{const h=Object.values(D.HEROES)[i];if(h){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);root.DTVisualHero(c,h.id==='hoavi'?{x:64,y:116,facing:Math.PI/2}:{x:28,y:67},h,0,.82)}})};atlas.src='assets/heroes.png';
  const poly=(c,p,color)=>{c.fillStyle=color;c.beginPath();p.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.closePath();c.fill()};
  const oval=(c,x,y,rx,ry,col)=>{c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill()};
  function halo(c,x,y,r,color,alpha=.25){c.save();c.globalAlpha=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore()}
  function weapon(c,id,x,y,angle=0,scale=1){
    const w=C.weapon(id);c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);c.lineJoin='round';
    if(w.kind==='bow'){c.strokeStyle='#263a3c';c.lineWidth=6;c.beginPath();c.arc(0,0,15,-1.2,1.2);c.stroke();c.strokeStyle=w.color;c.lineWidth=3;c.stroke();c.strokeStyle='#e5d9bc';c.lineWidth=1;c.beginPath();c.moveTo(5,-14);c.lineTo(5,14);c.stroke()}
    else if(w.kind==='spear'||w.kind==='blade'){c.fillStyle='#202d3c';c.fillRect(-17,-4,40,8);c.fillStyle=w.color;c.fillRect(-4,-2,25,4);poly(c,[[18,-7],[34,0],[18,7]],w.color);c.fillStyle='#fff6dc';c.fillRect(21,-1,8,2);c.fillStyle='#b49165';c.fillRect(-14,-4,6,8)}
    else if(w.kind==='code'){c.shadowColor=w.color;c.shadowBlur=8;c.fillStyle='#192940';c.fillRect(-14,-9,31,19);c.strokeStyle=w.color;c.lineWidth=1.5;c.strokeRect(-14,-9,31,19);c.fillStyle=w.color;for(let yy=-5;yy<=3;yy+=4)for(let xx=-10;xx<=10;xx+=5)c.fillRect(xx,yy,3,2);c.fillRect(15,-3,8,6);c.shadowBlur=0}
    else if(w.kind==='shotgun'){c.fillStyle='#263039';c.fillRect(-17,-7,39,14);c.fillStyle='#bd9b72';c.fillRect(-11,-5,18,10);c.fillStyle=w.color;c.fillRect(6,-6,20,4);c.fillRect(6,2,20,4);c.fillStyle='#eee0bc';c.fillRect(22,-6,3,12)}
    else if(w.kind==='fan'){for(let i=-2;i<=2;i++)poly(c,[[0,5],[22,Math.sin(i*.4)*23],[12,Math.sin(i*.4)*30]],i%2?w.color:'#f5d2e5');c.fillStyle='#95724f';c.fillRect(-5,3,17,4)}
    else{c.fillStyle='#263634';c.fillRect(-16,-4,37,8);c.fillStyle='#b69564';c.fillRect(-13,-2,29,4);poly(c,[[15,-10],[26,0],[15,10],[7,0]],w.color);poly(c,[[15,-5],[21,0],[15,5],[11,0]],'#fff1c8');halo(c,17,0,23,w.color,.28)}
    c.restore();
  }
  root.DTDrawWeapon=weapon;
  function heroWeapon(h){
    const game=root.denTinh?.game;
    return game&&game.hero.id===h.id&&!game.skillRanks?game.weapon.id:({an:'lantern',linh:'bamboo',kiet:'thunder',hoavi:'terminal'}[h.id]||'lantern');
  }
  root.DTVisualHero=function(c,p,h,time=0,scale=1,npc=false){
    if(!npc&&atlas.complete&&atlas.naturalWidth){
      const moving=p.moving&&Math.hypot(p.velocityX??1,p.velocityY??1)>3,phase=p.stride??time*14;
      const row={an:0,linh:1,kiet:2,hoavi:3}[h.id]||0,frame=moving?Math.floor(phase*2/Math.PI)%4:0,cw=atlas.naturalWidth/4,ch=atlas.naturalHeight/4,face=Math.cos(root.DTBodyAngle(p))<0?-1:1;
      const calm=!!root.DTSettings?.reducedMotion,lift=calm?0:moving?-Math.abs(Math.sin(phase))*2.5:Math.sin(time*2.5)*.55,dashing=p.dashTime>0,lean=calm?0:(p.lean||0),cast=calm?0:Math.sin(Math.min(1,(p.cast||0)/.7)*Math.PI);
      c.save();c.translate(Math.round(p.x),Math.round(p.y));c.scale(scale,scale);oval(c,0,2,dashing?21:16,dashing?4:5,'#071c2566');if(p.invulnerable>0&&Math.floor(time*12)%2===0)c.globalAlpha=.7;c.scale(face,1);
      if(moving&&!calm){const wave=Math.sin(phase*.7)*4;c.globalAlpha*=.78;poly(c,[[-8,-31],[-27-wave,-23+lift],[-41-wave,-28],[-25,-30],[-12,-35]],h.accent);c.globalAlpha/= .78}
      c.save();c.translate(0,lift-cast*2);c.rotate(lean*face);c.scale(dashing&&!calm?1.13:1,dashing&&!calm?.91:1+cast*.025);c.drawImage(atlas,frame*cw,row*ch,cw,ch,-34,-64,68,68);c.restore();
      const id=heroWeapon(h);const a=face===1?(p.facing||0):Math.PI-(p.facing||0),recoil=Math.min(1,(p.recoil||0)/.1)*5;weapon(c,id,16-recoil,-25+lift,a,.7);c.fillStyle='#eac49e';c.fillRect(10-recoil,-27+lift,5,5);
      if(p.shield>0&&h.id!=='quanle'&&!(p.shadowArmor>0)){c.strokeStyle='#b4dbffc0';c.lineWidth=1.5;c.beginPath();c.ellipse(0,-26,30,39,0,0,TAU);c.stroke();halo(c,0,-25,42,'#b6baff',.08)}c.restore();return;
    }
    c.save();c.translate(Math.round(p.x),Math.round(p.y));c.scale(scale,scale);
    oval(c,0,2,17,6,'#071c2566');const phase=p.moving?Math.sin(time*14):Math.sin(time*2)*.15,face=Math.cos(root.DTBodyAngle(p))<0?-1:1;
    if(p.invulnerable>0&&Math.floor(time*12)%2===0)c.globalAlpha=.65;
    c.translate(0,p.dashTime>0?-5:-Math.abs(phase)*1.5);c.scale(face,1);
    // Separate boots, arms, cloak and head keep the running animation legible.
    c.fillStyle='#142534';c.fillRect(-10,-8+phase*3,8,10);c.fillRect(3,-8-phase*3,8,10);c.fillStyle='#4a5b63';c.fillRect(-9,-1+phase*3,7,3);c.fillRect(4,-1-phase*3,7,3);
    poly(c,[[-12,-28],[-17,-6-phase*2],[-3,-9],[10,-6+phase*2],[13,-29]],'#192b3c');
    poly(c,[[-11,-29],[-13,-9-phase],[0,-11],[12,-9+phase],[11,-29]],h.cloth);
    c.fillStyle=h.accent;c.fillRect(-3,-29,5,21);c.fillRect(-11,-14,23,3);c.fillStyle='#ffffff28';c.fillRect(-10,-27,3,13);c.fillStyle='#081e303a';c.fillRect(7,-27,4,15);
    c.save();c.translate(-12,-26);c.rotate(phase*.15);c.fillStyle='#172a39';c.fillRect(-4,-1,7,18);c.fillStyle=h.cloth;c.fillRect(-3,0,6,11);c.fillStyle='#efc69e';c.fillRect(-3,10,6,5);c.restore();
    c.fillStyle='#162632';c.fillRect(-12,-45,24,19);c.fillRect(-9,-49,18,7);c.fillStyle=npc?'#ddd6c1':'#253040';c.fillRect(-10,-46,21,11);c.fillRect(-12,-43,5,17);
    c.fillStyle='#d59e7e';c.fillRect(-7,-40,18,13);c.fillStyle='#f2c7a0';c.fillRect(-7,-40,16,10);c.fillStyle='#fff1d1';c.fillRect(4,-40,3,2);c.fillStyle='#213443';c.fillRect(0,-35,2,3);c.fillRect(7,-35,2,3);c.fillStyle='#bd826d';c.fillRect(4,-29,4,1);
    if(!npc&&h.id==='an'){poly(c,[[-20,-42],[0,-57],[21,-42],[13,-38],[-14,-38]],'#223638');poly(c,[[-18,-43],[0,-55],[19,-43]],'#e4c98c');c.fillStyle='#fbdf99';c.fillRect(-10,-44,24,2);c.fillStyle='#96734b';c.fillRect(-18,-41,37,3);halo(c,20,-18,38,h.color,.3)}
    if(!npc&&h.id==='linh'){c.fillStyle='#202b32';c.fillRect(-17,-43,6,22+phase);c.fillStyle=h.accent;c.fillRect(-13,-43,26,4);poly(c,[[-13,-41],[-30,-35-phase*2],[-16,-34]],h.accent)}
    if(!npc&&h.id==='kiet'){c.fillStyle='#a7bbcc';c.fillRect(-16,-29,9,9);c.fillRect(9,-29,9,9);c.fillStyle='#ecce86';c.fillRect(-3,-27,7,4);c.fillStyle='#526f91';c.fillRect(-9,-47,19,4)}
    if(!npc&&h.id==='hoavi'){
      c.strokeStyle='#b9f8ed';c.lineWidth=1.5;c.strokeRect(-2,-36,6,5);c.strokeRect(7,-36,6,5);c.beginPath();c.moveTo(4,-34);c.lineTo(7,-34);c.stroke();c.fillStyle='#dba8d1';c.fillRect(-11,-44,5,3);
      c.fillStyle='#15263f';c.fillRect(-10,-27,19,3);c.fillStyle='#76e9d8';c.fillRect(-9,-22,4,3);c.fillRect(7,-18,3,8);
      for(let i=0;i<3;i++){const a=time*1.8+i*TAU/3;c.fillStyle=i%2?'#f6a6e7':'#77f5e4';c.globalAlpha=.6;c.font='bold 8px monospace';c.fillText(i%2?'01':'<>',Math.cos(a)*27,Math.sin(a)*13-22)}c.globalAlpha=1;
    }
    if(!npc){const id=heroWeapon(h);const a=face===1?(p.facing||0):Math.PI-(p.facing||0);weapon(c,id,16-(p.recoil>0?3:0),-20,a,.75);c.fillStyle='#efc69e';c.fillRect(11,-23,6,6)}
    if(p.shield>0&&h.id!=='quanle'&&!(p.shadowArmor>0)){c.strokeStyle='#c6abffbb';c.lineWidth=2;c.beginPath();c.ellipse(0,-22,26,35,0,0,TAU);c.stroke()}
    c.restore();
  };
  const R=root.DTRenderer.prototype,oldGround=R.makeGround,oldProp=R.drawProp,oldEnemy=R.drawEnemy,oldEffect=R.drawEffect,oldDraw=R.draw,oldCompanion=R.drawCompanion;
  R.makeGround=function(world){
    const canvas=oldGround.call(this,world),c=canvas.getContext('2d'),rng=D.rand(world.seed+471);
    for(let i=0;i<12500;i++){
      const x=rng()*world.width,y=rng()*world.height,z=D.zoneAt(x,y);if(D.nearPath(x,y,36))continue;
      const pal=z.id==='ash'?['#d89d6230','#282b3130','#efbe7850']:z.id==='lotus'?['#88cdb929','#143e4b40','#a2d5bf3b']:['#9fd18b24','#153e3338','#d2da9325'];
      c.fillStyle=pal[i%3];c.fillRect(x,y,1+(i%3),2+i%5);if(i%7===0)c.fillRect(x+3,y+2,2,2);
    }
    for(const p of world.paths)for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<length;d+=42){const t=d/length,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;c.fillStyle='#cab98a44';c.fillRect(x-4,y-3,9,5);c.fillStyle='#4c57433b';c.fillRect(x+3,y+5,6,3)}}
    return canvas;
  };
  function treeSprite(type,variant){
    const key=type+variant;if(cache.has(key))return cache.get(key);
    const canvas=document.createElement('canvas');canvas.width=112;canvas.height=150;const c=canvas.getContext('2d'),rng=D.rand(variant*235+type.length*47);
    oval(c,56,137,40,10,'#0a263c55');c.fillStyle='#253b34';c.fillRect(48,69,17,68);c.fillStyle='#786650';c.fillRect(51,73,11,61);c.fillStyle='#b08a60';c.fillRect(53,85,3,45);
    poly(c,[[49,109],[31,133],[53,126],[65,137],[81,135],[63,108]],'#675c42');
    const pal=type==='willow'?['#294f46','#3d7961','#66a17a','#8abb84']:type==='banyan'?['#233f3d','#3d6656','#60846a','#9aab7e']:['#1c453d','#326650','#54885e','#8eaf72'];
    for(let i=0;i<32;i++){const a=rng()*TAU,r=rng()*38,x=56+Math.cos(a)*r,y=64+Math.sin(a)*r*.8;poly(c,[[x-18,y-3],[x-12,y-15],[x+6,y-18],[x+19,y-6],[x+17,y+8],[x-3,y+13]],pal[i%3]);c.fillStyle=pal[3];if(i%2===0){c.fillRect(x-9,y-12,12,3);c.fillRect(x+4,y-8,5,3)}}
    if(type==='willow'||type==='banyan'){c.strokeStyle=type==='willow'?'#80a67a':'#8b8160';c.lineWidth=2;for(let i=0;i<8;i++){c.beginPath();c.moveTo(22+i*10,70);c.quadraticCurveTo(15+i*10,96,23+i*10,112+(i%3)*5);c.stroke()}}
    cache.set(key,canvas);return canvas;
  }
  R.drawProp=function(o){
    const c=this.ctx,g=this.game,p=g.player;
    if(['tree','willow','banyan'].includes(o.type)){
      const scale=o.type==='banyan'?2.35:1,canvas=treeSprite(o.type,o.variant),sway=root.DTSettings?.reducedMotion?0:Math.sin(g.time*1.3+o.x)*1.2;
      c.save();if(Math.abs(p.x-o.x)<52*scale&&p.y<o.y&&p.y>o.y-125*scale)c.globalAlpha=.38;c.translate(o.x,o.y);c.transform(1,0,sway*.007,1,0,0);c.drawImage(canvas,-56*scale,-137*scale,112*scale,150*scale);c.restore();return;
    }
    c.save();if(o.type==='bamboo'){c.translate(Math.sin(g.time*1.7+o.x)*1.3,0)}oldProp.call(this,o);c.restore();
    if(o.type==='house'||o.type==='temple'){c.strokeStyle='#352c273a';c.lineWidth=1;for(let y=o.y-o.h*.4;y<o.y-7;y+=13){c.beginPath();c.moveTo(o.x-o.w*.4,y);c.lineTo(o.x+o.w*.4,y);c.stroke()}}
  };
  R.drawEnemy=function(e){
    const c=this.ctx,t=this.game.time;
    if(e.type==='core'){
      const col=e.root?'#f5a7d5':'#ffb575',bob=Math.sin(t*3+e.x)*3;halo(c,e.x,e.y-20,65,col,.33);poly(c,[[e.x-17,e.y-11],[e.x-11,e.y-39+bob],[e.x,e.y-55+bob],[e.x+17,e.y-30+bob],[e.x+10,e.y-8]],'#28313b');poly(c,[[e.x-12,e.y-15],[e.x-7,e.y-36+bob],[e.x,e.y-47+bob],[e.x+12,e.y-28+bob],[e.x+7,e.y-13]],col);poly(c,[[e.x,e.y-46+bob],[e.x+9,e.y-28+bob],[e.x,e.y-15]],'#fff0cb');c.fillStyle='#152932';c.fillRect(e.x-21,e.y-61,42,5);c.fillStyle=col;c.fillRect(e.x-21,e.y-61,42*Math.max(0,e.hp/e.maxHp),5);return;
    }
    c.save();if(e.miniBoss){c.translate(e.x,e.y);c.scale(1.45,1.45);c.translate(-e.x,-e.y)}oldEnemy.call(this,e);c.restore();
    if(e.miniBoss){c.font='bold 11px Segoe UI';c.textAlign='center';c.fillStyle='#ffe1a2';c.fillText('TRÚC VỆ',e.x,e.y-68);halo(c,e.x,e.y-22,60,'#d4e6a0',.13)}
    if(e.burn>0){for(let i=0;i<3;i++){const y=e.y-15-(t*27+i*13)%35;c.fillStyle=i%2?'#ffca75':'#ff7b5e';c.fillRect(e.x-11+i*9,y,3,6)}}
  };
  R.drawEffect=function(e){
    if(e.type!=='circuit'&&e.type!=='overclock'){oldEffect.call(this,e);return}
    const c=this.ctx,f=1-e.life/e.maxLife,r=e.r*(.35+f*.65);c.save();c.translate(e.x,e.y);c.globalAlpha=(1-f)*.8;c.strokeStyle=e.color;c.lineWidth=e.type==='overclock'?4:2;
    for(let k=0;k<2;k++){c.save();c.rotate(f*(k?-.7:.7));c.beginPath();for(let i=0;i<=6;i++){const a=i/6*TAU,x=Math.cos(a)*(r-k*18),y=Math.sin(a)*(r-k*18);i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke();c.restore()}
    c.font='bold 12px Consolas,monospace';c.textAlign='center';for(let i=0;i<8;i++){const a=i/8*TAU+f;c.fillStyle=e.color;c.fillText(i%2?'0101':'</>',Math.cos(a)*r,Math.sin(a)*r)}c.restore();
  };
  R.drawCompanion=function(){oldCompanion.call(this);const g=this.game,t=g.domTarget;if(t){this.ctx.save();this.ctx.globalAlpha=.7;this.ctx.strokeStyle='#ffe6a3';this.ctx.lineWidth=1;this.ctx.setLineDash([3,7]);this.ctx.beginPath();this.ctx.moveTo(g.player.x-30,g.player.y+18);this.ctx.lineTo(t.x,t.y);this.ctx.stroke();this.ctx.restore()}};
  R.draw=function(dt,menu){
    oldDraw.call(this,dt,menu);if(menu)return;
    const c=this.ctx,g=this.game,p=g.player;c.save();c.scale(this.zoom,this.zoom);c.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));
    for(const d of g.weaponDrops||[]){if(Math.abs(d.x-p.x)>700||Math.abs(d.y-p.y)>450)continue;const w=C.weapon(d.weaponId);halo(c,d.x,d.y-10,40,w.color,.25);weapon(c,d.weaponId,d.x,d.y-15+Math.sin(g.time*3+d.x)*3,-.3,.85);c.font='10px Segoe UI';c.textAlign='center';c.fillStyle=w.color;c.fillText(w.name,d.x,d.y+13)}
    for(const l of C.lore)if(!g.memories.includes(l.id)&&Math.abs(l.x-p.x)<700&&Math.abs(l.y-p.y)<400){halo(c,l.x,l.y-20,40,'#d5b8ff',.25);c.fillStyle='#e6d9ff';c.fillRect(l.x-8,l.y-28,16,20);c.fillStyle='#9c81b5';c.fillRect(l.x-5,l.y-23,10,2);c.fillRect(l.x-5,l.y-18,7,2)}
    for(const b of g.projectiles){if(b.kind!=='blade')continue;c.save();c.translate(b.x,b.y-18);c.rotate(b.angle);c.strokeStyle=b.color;c.lineWidth=4;c.beginPath();c.arc(-3,0,15,-1,1);c.stroke();c.restore()}
    if(g.hero.id!=='hoavi'&&p.overclock>0)for(let i=0;i<2;i++){const a=g.time*3+(i?1:-1),x=p.x+Math.cos(a)*52,y=p.y+Math.sin(a)*34;c.fillStyle='#152e44';c.fillRect(x-10,y-5,20,10);c.fillStyle='#78ffdf';c.fillRect(x-6,y-2,12,4);halo(c,x,y,20,'#6bffe1',.35)}
    if(p.firewall>0){c.strokeStyle='#f5a4df';c.lineWidth=3;const r=152;c.setLineDash([12,5]);c.beginPath();c.arc(p.x,p.y,r,g.time,g.time+TAU);c.stroke();c.setLineDash([])}
    c.restore();
  };
})(globalThis);
