(function(root){
  'use strict';
  const D=root.DTWorld,TAU=Math.PI*2;
  const BODY=[
    '     hhhhh     ','    hhhhhhh    ','   hhhhhhhhh   ','   hsssss hh   ','    sssssss    ','    seseess    ','     ssssss    ','    aaaaaa     ',
    '   cccccccc    ','  cccccccccc   ','  sccccccccs   ','  sccccccccs   ','  scccaacccs   ','   ccaaaacc    ','   cccacccc    ','   cccacccc    ',
    '   cccacccc    ','    bbbbbb     ','    bbbbbb     ','    bb  bb     ','    bb  bb     ','    dd  dd     '
  ];
  function pixel(ctx,pattern,x,y,u,palette){for(let j=0;j<pattern.length;j++)for(let i=0;i<pattern[j].length;i++){const c=palette[pattern[j][i]];if(c){ctx.fillStyle=c;ctx.fillRect(Math.round(x+i*u),Math.round(y+j*u),u,u)}}}
  function ellipse(ctx,x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill()}
  function poly(ctx,pts,color){ctx.fillStyle=color;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill()}
  function glow(ctx,x,y,r,color,alpha=.5){ctx.save();ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore()}
  function drawHero(ctx,p,hero,time=0,scale=1,npc=false){
    ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(scale,scale);
    ellipse(ctx,0,0,17,7,'#071b1b60');
    const walk=p.moving?Math.sin(time*16)*2:Math.sin(time*2)*.5,bob=p.dashTime>0?-3:walk;
    if(p.invulnerable>0&&Math.floor(time*15)%2===0)ctx.globalAlpha=.5;
    ctx.translate(0,bob);if(Math.cos(p.facing||0)<0)ctx.scale(-1,1);
    const palette={h:npc?'#ded5b5':'#202c34',s:'#e2ba8e',e:'#18242b',c:hero.cloth,a:hero.accent,b:'#293946',d:'#192932'};
    pixel(ctx,BODY,-15,-44,2,palette);
    if(p.moving){ctx.fillStyle=palette.b;ctx.fillRect(-8,-6+walk,6,5);ctx.fillRect(4,-6-walk,6,5)}
    if(!npc&&hero.id==='an'){
      poly(ctx,[[-17,-35],[0,-48],[18,-35],[12,-32],[-12,-32]],'#ddc487');ctx.fillStyle='#8f7650';ctx.fillRect(-15,-35,30,3);
      ctx.fillStyle='#ae8053';ctx.fillRect(17,-28,2,13);ctx.fillStyle='#f0ba5e';ctx.fillRect(13,-19,11,12);ctx.fillStyle='#ffe7a2';ctx.fillRect(17,-18,3,9);ctx.fillStyle='#7b5940';ctx.fillRect(12,-21,13,3);ctx.fillRect(13,-7,11,2);
      glow(ctx,18,-14,38,'#eabf64',.22);
    }else if(!npc&&hero.id==='linh'){
      ctx.fillStyle=hero.accent;ctx.fillRect(-13,-34,23,3);poly(ctx,[[-12,-32],[-26,-25],[-15,-25]],hero.accent);
      ctx.strokeStyle='#d8b57b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(14,-22,13,-1.2,1.2);ctx.stroke();ctx.strokeStyle='#c1dbb0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(18,-34);ctx.lineTo(18,-10);ctx.stroke();
    }else if(!npc&&hero.id==='kiet'){
      ctx.fillStyle='#93a7bd';ctx.fillRect(-17,-27,9,8);ctx.fillRect(9,-27,9,8);ctx.fillStyle='#e4b868';ctx.fillRect(-5,-21,10,3);ctx.fillStyle='#9b8264';ctx.fillRect(20,-49,3,50);poly(ctx,[[16,-47],[21,-60],[26,-47]],'#c9d5df');ctx.fillStyle='#e4bf77';ctx.fillRect(16,-45,11,3);
    }
    ctx.restore();
  }
  class Renderer{
    constructor(canvas,game){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.game=game;this.zoom=1.28;this.camera={x:game.player.x-500,y:game.player.y-280};this.ground=this.makeGround(game.world)}
    setGame(game){this.game=game;this.camera={x:game.player.x-500,y:game.player.y-280};this.ground=this.makeGround(game.world)}
    makeGround(world){
      const canvas=document.createElement('canvas');canvas.width=world.width;canvas.height=world.height;const c=canvas.getContext('2d',{alpha:false}),rng=D.rand(world.seed+77);
      const palettes={village:['#48624e','#4c6650','#4a634d','#465f4b'],forest:['#294c41','#2b5043','#284a40','#2d5144'],lotus:['#36545a','#38585c','#345258','#3a585b'],ash:['#5a5048','#5d5147','#574d46','#60534a'],crossroads:['#3d5445','#405649','#3c5143','#425747'],ancient:['#344845','#364947','#324542','#394b46']};
      for(let y=0;y<world.height;y+=32)for(let x=0;x<world.width;x+=32){const z=D.zoneAt(x,y),pal=palettes[z.id];c.fillStyle=pal[Math.floor(rng()*4)];c.fillRect(x,y,32,32);if(rng()<.45){c.fillStyle=z.id==='ash'?'#b59a6d22':'#87a67920';c.fillRect(x+Math.floor(rng()*25),y+Math.floor(rng()*25),3+rng()*4,2)}}
      for(const path of world.paths){c.lineCap='round';c.lineJoin='round';c.beginPath();path.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle='#233f3880';c.lineWidth=85;c.stroke();c.strokeStyle='#786b4f';c.lineWidth=54;c.stroke();c.strokeStyle='#96815c55';c.lineWidth=37;c.stroke();}
      for(let i=0;i<1600;i++){const x=rng()*world.width,y=rng()*world.height;if(D.nearPath(x,y,24)){c.fillStyle=rng()<.5?'#aa966744':'#43564644';c.fillRect(x,y,3+rng()*7,2+rng()*4)}}
      for(let i=0;i<22;i++){const x=2630+rng()*920,y=1490+rng()*1150;if(D.nearPath(x,y,120))continue;ellipse(c,x,y,40+rng()*80,20+rng()*50,'#234650');ellipse(c,x,y-4,35+rng()*65,15+rng()*25,'#2a515a');c.strokeStyle='#80a79733';c.lineWidth=2;c.beginPath();c.ellipse(x,y,30,9,0,0,TAU);c.stroke()}
      ellipse(c,1830,610,218,173,'#273936');c.strokeStyle='#83957533';c.lineWidth=4;c.beginPath();c.ellipse(1830,610,193,155,0,0,TAU);c.stroke();
      for(let i=0;i<12;i++){const a=i/12*TAU;c.fillStyle='#8b997955';c.fillRect(1830+Math.cos(a)*193-4,610+Math.sin(a)*155-4,8,8)}
      for(let x=2950;x<3200;x+=25){c.fillStyle='#8d7855';c.fillRect(x,2044,22,91);c.fillStyle='#5c563f';c.fillRect(x,2044,3,91)}
      return canvas;
    }
    draw(dt=.016,menu=false){
      const c=this.ctx,g=this.game,p=g.player,z=this.zoom;
      const aimX=(g.input.aimX-p.x)*.05,aimY=(g.input.aimY-p.y)*.05;
      const tx=Math.max(0,Math.min(D.W-1280/z,p.x-640/z+Math.max(-60,Math.min(60,aimX)))),ty=Math.max(0,Math.min(D.H-720/z,p.y-360/z+Math.max(-40,Math.min(40,aimY))));
      const lerp=1-Math.exp(-7*dt);this.camera.x+=(tx-this.camera.x)*lerp;this.camera.y+=(ty-this.camera.y)*lerp;
      c.imageSmoothingEnabled=false;c.fillStyle='#142a2a';c.fillRect(0,0,1280,720);c.save();
      const sx=g.shake?(Math.random()-.5)*g.shake:0,sy=g.shake?(Math.random()-.5)*g.shake:0;
      c.translate(sx,sy);c.scale(z,z);c.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));
      const x0=this.camera.x-140,y0=this.camera.y-160,x1=x0+1280/z+280,y1=y0+720/z+320;
      c.drawImage(this.ground,0,0);
      const inView=o=>o.x>x0&&o.x<x1&&o.y>y0&&o.y<y1;
      for(const s of g.world.shrines)if(inView(s))this.drawShrine(s);
      if(inView(g.world.altar))this.drawAltar(g.world.altar);
      for(const a of g.activeEffects)if(inView(a)){
        c.save();c.globalAlpha=.14;ellipse(c,a.x,a.y,a.r,a.r,a.color);c.globalAlpha=.7;c.strokeStyle=a.color;c.lineWidth=2;c.setLineDash([10,10]);c.beginPath();c.arc(a.x,a.y,a.r*.95,0,TAU);c.stroke();c.restore();
      }
      for(const t of g.telegraphs){c.save();const f=1-t.timer/t.maxTimer;c.globalAlpha=.15+f*.15;ellipse(c,t.x,t.y,t.r,t.r,'#f49983');c.globalAlpha=.8;c.strokeStyle=t.color;c.lineWidth=2;c.beginPath();c.arc(t.x,t.y,t.r,0,TAU);c.stroke();c.globalAlpha=.3;ellipse(c,t.x,t.y,t.r*f,t.r*f,t.color);c.restore()}
      for(const l of g.loot)if(inView(l)){const bob=Math.sin(g.time*5+l.x)*3;c.fillStyle=l.type==='gold'?'#e8c46e':'#bc5f70';c.fillRect(l.x-4,l.y-8+bob,8,8);c.fillStyle=l.type==='gold'?'#ffe6a0':'#edc3ad';c.fillRect(l.x-2,l.y-7+bob,3,3);glow(c,l.x,l.y,18,l.type==='gold'?'#efc773':'#d8a2a9',.12)}
      const objects=[];
      for(const o of g.world.props)if(inView(o))objects.push({y:o.y,draw:()=>this.drawProp(o)});
      for(const n of g.world.npcs)if(inView(n))objects.push({y:n.y,draw:()=>this.drawNpc(n)});
      for(const o of g.world.chests)if(inView(o))objects.push({y:o.y,draw:()=>this.drawChest(o)});
      for(const e of g.world.enemies)if(e.alive&&inView(e))objects.push({y:e.y,draw:()=>this.drawEnemy(e)});
      objects.push({y:p.y,draw:()=>drawHero(c,p,g.hero,g.time)});
      objects.sort((a,b)=>a.y-b.y);objects.forEach(o=>o.draw());
      this.drawCompanion();
      for(const b of g.projectiles){if(!inView(b))continue;c.save();c.translate(b.x,b.y);c.rotate(b.angle);c.fillStyle=b.color;if(b.kind==='arrow'){c.fillRect(-11,-2,22,4);poly(c,[[12,-4],[18,0],[12,4]],b.color);c.fillStyle='#ffffffbb';c.fillRect(1,-1,12,2)}else{c.fillRect(-b.r,-b.r,b.r*2,b.r*2);c.fillStyle='#fff6d5';c.fillRect(-2,-2,4,4)}c.restore();}
      for(const e of g.effects)this.drawEffect(e);
      c.save();c.globalCompositeOperation='lighter';for(const pt of g.particles){if(!inView(pt))continue;c.globalAlpha=Math.min(1,pt.life/pt.maxLife);c.fillStyle=pt.color;c.fillRect(Math.round(pt.x),Math.round(pt.y),pt.size,pt.size)}c.restore();
      for(const f of g.floaters){c.save();c.globalAlpha=Math.min(1,f.life*2);c.font='bold 12px Segoe UI';c.textAlign='center';c.fillStyle='#182225';c.fillText(f.text,f.x+1,f.y+1);c.fillStyle=f.color;c.fillText(f.text,f.x,f.y);c.restore()}
      for(let i=0;i<28;i++){const xx=this.camera.x+((i*97+g.time*8)%(1280/z)),yy=this.camera.y+((i*71+Math.sin(g.time*.5+i)*25)%(720/z));c.globalAlpha=.25+Math.sin(g.time*2+i)*.15;c.fillStyle='#e2dba0';c.fillRect(xx,yy,2,2)}c.globalAlpha=1;
      if(!g.victory){c.save();c.globalAlpha=.035;c.fillStyle='#b1c6bd';for(let i=0;i<4;i++){const xx=this.camera.x+((i*380+g.time*6)%1300)-100,yy=this.camera.y+i*130;c.beginPath();c.ellipse(xx,yy,280,55,0,0,TAU);c.fill()}c.restore()}
      if(!menu){const target=g.objective().target;if(target&&Math.hypot(target.x-p.x,target.y-p.y)>390)this.drawGuide(p,target)}
      c.restore();
      if(g.hitFlash>0){c.fillStyle=`rgba(165,47,49,${g.hitFlash})`;c.fillRect(0,0,1280,720)}
      if(!menu&&g.started){const mx=(g.input.aimX-this.camera.x)*z,my=(g.input.aimY-this.camera.y)*z;c.strokeStyle='#f1e3b699';c.lineWidth=1;c.beginPath();c.arc(mx,my,7,0,TAU);c.stroke();for(const [dx,dy]of[[0,-12],[0,12],[-12,0],[12,0]]){c.fillStyle='#e8d49b';c.fillRect(mx+dx-1,my+dy-1,2,2)}}
    }
    drawGuide(p,s){const c=this.ctx,a=Math.atan2(s.y-p.y,s.x-p.x),d=155;c.save();c.translate(p.x+Math.cos(a)*d,p.y+Math.sin(a)*d);c.rotate(a);c.globalAlpha=.75;poly(c,[[11,0],[-4,-5],[-1,0],[-4,5]],'#efd080');c.restore()}
    drawProp(o){
      const c=this.ctx,g=this.game,x=Math.round(o.x),y=Math.round(o.y),v=o.variant;
      if(o.type==='grass'||o.type==='rice'){
        c.strokeStyle=o.type==='rice'?'#b3bd66':'#86a87888';c.lineWidth=2;for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(x+i*5,y);c.lineTo(x+i*5+3,y-8-i*2);c.stroke();if(o.type==='rice'){c.fillStyle='#c5ba6d';c.fillRect(x+i*5+2,y-10-i*2,3,5)}}return;
      }
      if(o.type==='flower'){c.fillStyle='#597e54';c.fillRect(x,y-7,2,8);c.fillStyle=['#d7a27b','#cf98ac','#d9c887','#acb8da'][v];c.fillRect(x-3,y-12,8,6);c.fillStyle='#e6d394';c.fillRect(x,y-10,2,2);return}
      if(o.type==='lotus'){ellipse(c,x,y,18,7,'#51776a');poly(c,[[x,y],[x+17,y-3],[x+15,y+6]],'#2a5354');c.fillStyle='#cc90a4';c.fillRect(x-6,y-13,12,8);c.fillStyle='#efb9bc';c.fillRect(x-3,y-18,6,10);c.fillStyle='#edc881';c.fillRect(x-2,y-12,4,4);return}
      if(o.type==='rock'){ellipse(c,x,y+2,23,8,'#152b2a55');poly(c,[[x-23,y],[x-19,y-20],[x-3,y-31],[x+17,y-24],[x+24,y],[x+7,y+7]],v%2?'#68726b':'#737b71');poly(c,[[x-19,y-20],[x-3,y-31],[x+17,y-24],[x+7,y-11]],'#8b9282');c.fillStyle='#a2a58a';c.fillRect(x-9,y-24,7,3);return}
      if(o.type==='house'||o.type==='temple'){
        const w=o.w,h=o.h,xx=x-w/2,yy=y-h;c.fillStyle='#14292455';c.fillRect(xx-8,y-14,w+24,29);
        c.fillStyle='#a19473';c.fillRect(xx+14,yy+h*.45,w-28,h*.55);c.fillStyle='#d1bb8b';c.fillRect(xx+20,yy+h*.5,w-40,h*.44);
        c.fillStyle='#66513c';c.fillRect(x-16,y-46,32,46);c.fillStyle='#deb57a';c.fillRect(x+7,y-26,3,3);
        for(const a of[-1,1]){c.fillStyle='#514d3b';c.fillRect(x+a*w*.29-13,y-42,25,26);c.fillStyle='#ebbd6c';c.fillRect(x+a*w*.29-10,y-39,19,18);c.fillStyle='#7c6144';c.fillRect(x+a*w*.29-2,y-40,3,22);c.fillRect(x+a*w*.29-12,y-31,23,3)}
        const roofColor=o.type==='temple'?'#965b4a':'#826049';poly(c,[[xx-18,yy+h*.5],[xx+12,yy+h*.37],[x-18,yy+3],[x+18,yy+3],[xx+w-12,yy+h*.37],[xx+w+18,yy+h*.5]],'#433e35');
        poly(c,[[xx-14,yy+h*.45],[xx+15,yy+h*.33],[x-12,yy],[x+12,yy],[xx+w-15,yy+h*.33],[xx+w+14,yy+h*.45]],roofColor);
        for(let i=0;i<5;i++){const ry=yy+10+i*h*.073,rw=22+i*w*.15;c.fillStyle=i%2?'#b0845d':'#ae7656';c.fillRect(x-rw/2,ry,rw,3)}
        c.fillStyle='#cfb475';c.fillRect(xx+16,y-6,w-32,6);
        for(const a of[-1,1]){const lx=x+a*(w/2-10);c.fillStyle='#493d31';c.fillRect(lx,yy+h*.5,2,19);c.fillStyle='#dc9c57';c.fillRect(lx-5,yy+h*.5+14,12,15);c.fillStyle='#f6d483';c.fillRect(lx-1,yy+h*.5+16,4,11);glow(c,lx,yy+h*.5+23,42,'#e7b564',.2)}
        return;
      }
      if(o.type==='gate'){c.fillStyle='#bbaa81';c.fillRect(x-56,y-64,13,66);c.fillRect(x+43,y-64,13,66);c.fillRect(x-62,y-74,124,15);poly(c,[[x-70,y-73],[x,y-101],[x+70,y-73]],'#976a4c');c.fillStyle='#dbbf7c';c.fillRect(x-18,y-66,36,14);c.fillStyle='#71664b';c.font='8px Segoe UI';c.textAlign='center';c.fillText('LÀNG ĐÈN',x,y-56);return}
      if(o.type==='bamboo'){
        ellipse(c,x,y,18,6,'#1b302d44');for(let i=-1;i<=1;i++){const bx=x+i*11,hh=65+(i+v)%3*17;c.fillStyle=i===0?'#75a982':'#578b6c';c.fillRect(bx,y-hh,5,hh);for(let j=1;j<5;j++){c.fillStyle='#a2bd8a';c.fillRect(bx,y-j*hh/5,5,2);poly(c,[[bx,y-j*hh/5],[bx+(j%2?20:-20),y-j*hh/5-13],[bx+(j%2?8:-8),y-j*hh/5]],'#42775f')}}return;
      }
      if(o.type==='deadTree'){c.fillStyle='#605f54';c.fillRect(x-5,y-65,10,67);poly(c,[[x,y-42],[x-30,y-73],[x-29,y-79],[x+3,y-53]],'#737263');poly(c,[[x+1,y-27],[x+32,y-58],[x+29,y-66],[x+1,y-43]],'#737263');return}
      const banyan=o.type==='banyan',willow=o.type==='willow',size=banyan?2.8:1;
      c.save();c.translate(x,y);c.scale(size,size);ellipse(c,0,2,38,12,'#112c2855');c.fillStyle=banyan?'#756753':'#796d50';c.fillRect(-7,-55,14,58);c.fillStyle='#a08d64';c.fillRect(-5,-42,4,41);poly(c,[[-7,-13],[-21,7],[-6,1],[4,5],[21,5],[7,-14]],'#716449');
      for(let i=0;i<5;i++){const xx=(i-2)*13,yy=-64+(i%2)*11;poly(c,[[xx-25,yy+11],[xx-29,yy-7],[xx-15,yy-24],[xx+13,yy-25],[xx+29,yy-9],[xx+26,yy+8],[xx+5,yy+18]],banyan?'#3c5950':willow?'#577c65':v%2?'#35644d':'#487455');c.fillStyle=banyan?'#567165':willow?'#709879':'#668d60';c.fillRect(xx-12,yy-20,23,4)}
      if(willow||banyan){c.strokeStyle=willow?'#6b9275':'#536a52';c.lineWidth=2;for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(i*13,-62);c.lineTo(i*16,-14+(i%2)*10);c.stroke()}}
      c.restore();
    }
    drawShrine(s){
      const c=this.ctx,g=this.game,x=s.x,y=s.y;glow(c,x,y-20,95,s.color,s.active?.16:.06);ellipse(c,x,y+5,37,15,'#203635');c.fillStyle='#849887';c.fillRect(x-31,y-9,62,13);c.fillStyle='#b8bea0';c.fillRect(x-23,y-18,46,9);c.fillStyle='#566f65';c.fillRect(x-12,y-52,24,37);c.fillStyle='#9eac91';c.fillRect(x-16,y-58,32,10);
      const bob=Math.sin(g.time*2)*4;c.save();c.translate(x,y-75+bob);c.rotate(g.time*.5);c.fillStyle=s.active?s.color:'#9f9481';c.fillRect(-8,-8,16,16);c.fillStyle=s.active?'#f8eed0':'#beb8a6';c.fillRect(-3,-3,6,6);c.restore();
      c.strokeStyle=s.active?s.color:'#8b9c7d44';c.lineWidth=1;c.beginPath();c.ellipse(x,y+5,55,23,0,0,TAU);c.stroke();c.font='10px Segoe UI';c.textAlign='center';c.fillStyle=s.active?'#ddedc2':'#d3c6ac';c.fillText(s.name,x,y+32);
    }
    drawAltar(o){const c=this.ctx;c.fillStyle='#6d796b';c.fillRect(o.x-30,o.y-13,60,27);c.fillStyle='#a0a58a';c.fillRect(o.x-32,o.y-18,64,7);c.fillStyle='#c4aa77';for(let i=-1;i<=1;i++){c.fillRect(o.x+i*16-3,o.y-30,6,13);if(this.game.world.shrines[i+1].active){glow(c,o.x+i*16,o.y-34,27,'#efd38a',.5);c.fillStyle='#f7d78e';c.fillRect(o.x+i*16-2,o.y-39,4,8)}}}
    drawChest(o){const c=this.ctx;ellipse(c,o.x,o.y,22,7,'#14282a66');c.fillStyle='#78513d';c.fillRect(o.x-18,o.y-22,36,23);c.fillStyle=o.open?'#342e2d':'#a57e4b';c.fillRect(o.x-18,o.y-25,36,12);c.fillStyle='#d8b670';c.fillRect(o.x-18,o.y-13,36,3);c.fillRect(o.x-15,o.y-25,4,24);c.fillRect(o.x+11,o.y-25,4,24);if(!o.open){c.fillStyle='#f1d087';c.fillRect(o.x-3,o.y-14,6,8);glow(c,o.x,o.y-15,33,'#d6b774',.14)}}
    drawNpc(n){const c=this.ctx;if(n.type==='well'){ellipse(c,n.x,n.y,25,14,'#556e6c');ellipse(c,n.x,n.y-7,26,15,'#a9ad95');ellipse(c,n.x,n.y-9,17,9,'#2c5960');glow(c,n.x,n.y-6,30,'#84d3bd',.2)}else{const h={id:'npc',cloth:n.type==='elder'?'#986e79':'#b79160',accent:'#d1b985'};drawHero(c,{x:n.x,y:n.y,facing:0},h,this.game.time,1,true);if(n.type==='smith'){c.fillStyle='#5c6570';c.fillRect(n.x+20,n.y-12,20,10);c.fillRect(n.x+25,n.y-2,10,6)}}c.font='9px Segoe UI';c.textAlign='center';c.fillStyle='#efe1c4';c.fillText(n.name,n.x,n.y+18)}
    drawEnemy(e){
      const c=this.ctx,t=this.game.time,x=Math.round(e.x),y=Math.round(e.y),bob=Math.sin(t*4+x)*3;c.save();if(e.hit>0){c.shadowBlur=8;c.shadowColor='#fff4ca'}
      ellipse(c,x,y,Math.max(14,e.r),7,'#14212466');
      if(e.type==='boss'){
        c.translate(x,y);const col=e.phase===2?'#b4776a':'#93856c';glow(c,0,-45,95,'#bf886f',.15);poly(c,[[-40,5],[-25,-60],[-45,-95],[-27,-123],[-8,-102],[8,-118],[27,-104],[40,-73],[29,-42],[49,7],[18,3],[0,-5],[-15,10]],col);
        poly(c,[[-30,-65],[-85,-93],[-76,-111],[-28,-83]],'#7e7763');poly(c,[[30,-60],[91,-96],[79,-119],[20,-78]],'#7e7763');
        for(let i=-2;i<=2;i++){poly(c,[[i*23-23,-110],[i*23-26,-130],[i*23-4,-151],[i*23+21,-132],[i*23+24,-109]],e.phase===2?'#70514e':'#4c6557')}
        c.fillStyle=e.phase===2?'#ffb67b':'#eed89b';c.fillRect(-23,-67,13,7);c.fillRect(11,-67,13,7);c.fillStyle='#303532';c.fillRect(-13,-43,26,11);c.fillStyle='#dfad7a';c.fillRect(-10,-40,5,5);c.fillRect(6,-40,5,5);
        for(let i=-2;i<=2;i++){c.fillStyle='#b49c72';c.fillRect(i*7,-23,3,24)}
      }else if(e.type==='slime'){
        poly(c,[[x-17,y-4],[x-14,y-19+bob],[x-6,y-27+bob],[x+8,y-26+bob],[x+16,y-16+bob],[x+18,y-4],[x+10,y+2],[x-10,y+2]],'#789c71');c.fillStyle='#a7c48d';c.fillRect(x-9,y-22+bob,10,4);c.fillStyle='#273e36';c.fillRect(x-7,y-12,3,4);c.fillRect(x+5,y-12,3,4);
      }else if(e.type==='wisp'){
        glow(c,x,y-22,40,'#ce93bb',.15);poly(c,[[x-13,y-19+bob],[x-8,y-36+bob],[x+5,y-39+bob],[x+14,y-24+bob],[x+7,y-9+bob],[x,y-4+bob],[x-6,y-13+bob]],'#bf94b5');c.fillStyle='#ead3d7';c.fillRect(x-6,y-28+bob,4,5);c.fillRect(x+4,y-28+bob,4,5);
      }else if(e.type==='boar'){
        poly(c,[[x-24,y-6],[x-25,y-25],[x-16,y-36],[x+13,y-34],[x+26,y-22],[x+24,y-7],[x+15,y-3],[x-14,y-2]],'#887b66');c.fillStyle='#aa9980';c.fillRect(x-15,y-31,24,7);c.fillStyle='#514c43';c.fillRect(x-15,y-4,8,9);c.fillRect(x+12,y-4,8,9);c.fillStyle=e.phase===1?'#ffe1a1':'#e8c895';c.fillRect(x-19,y-14,5,9);c.fillRect(x+16,y-14,5,9);c.fillStyle='#272d2c';c.fillRect(x-9,y-21,4,4);c.fillRect(x+8,y-21,4,4);if(e.phase===1){c.strokeStyle='#f5b48a';c.lineWidth=2;c.beginPath();c.arc(x,y,e.r+8,0,TAU);c.stroke()}
      }else{
        const col=e.type==='archer'?'#9e8174':'#77738b';poly(c,[[x-15,y],[x-11,y-30],[x-5,y-46],[x+6,y-46],[x+13,y-31],[x+17,y],[x+7,y-4],[x,y+3],[x-8,y-5]],col);c.fillStyle='#2c363a';c.fillRect(x-8,y-32,17,10);c.fillStyle='#eacc9b';c.fillRect(x-6,y-30,4,3);c.fillRect(x+4,y-30,4,3);if(e.type==='archer'){c.strokeStyle='#d2b280';c.lineWidth=2;c.beginPath();c.arc(x+16,y-19,12,-1.2,1.2);c.stroke()}
      }
      c.restore();
      if(e.type!=='boss'&&e.hp<e.maxHp){c.fillStyle='#132d2b';c.fillRect(x-18,y-e.r*2-14,36,4);c.fillStyle=e.elite?'#e8bf74':'#c98879';c.fillRect(x-18,y-e.r*2-14,36*Math.max(0,e.hp/e.maxHp),4)}
      if(e.elite&&e.alive){c.fillStyle='#efd597';c.fillRect(x-2,y-e.r*2-21,4,4)}
    }
    drawCompanion(){const c=this.ctx,p=this.game.player,t=this.game.time,x=p.x-40+Math.sin(t)*7,y=p.y+25+Math.cos(t*.8)*7;ellipse(c,x,y,9,4,'#203b3166');c.fillStyle='#d2b992';c.fillRect(x-8,y-16,15,13);poly(c,[[x-8,y-14],[x-9,y-25],[x-2,y-19]],'#e0c9a0');poly(c,[[x+1,y-18],[x+8,y-25],[x+8,y-13]],'#e0c9a0');c.fillStyle='#38413d';c.fillRect(x-5,y-14,2,2);c.fillRect(x+3,y-14,2,2);c.fillStyle='#aa9273';c.fillRect(x-12,y-7,6,4);glow(c,x,y-10,18,'#e1c790',.1)}
    drawEffect(e){
      const c=this.ctx,f=1-e.life/e.maxLife;c.save();c.globalAlpha=Math.max(0,1-f);c.strokeStyle=e.color;c.fillStyle=e.color;c.lineWidth=3;
      if(e.type==='ring'||e.type==='shock'||e.type==='ultimate'){const r=e.r*(.2+f*.8);c.beginPath();c.arc(e.x,e.y,r,0,TAU);c.stroke();if(e.type==='ultimate'){c.lineWidth=1;c.beginPath();c.arc(e.x,e.y,r*.7,0,TAU);c.stroke();glow(c,e.x,e.y,r,e.color,.15)}if(e.type==='shock'){for(let i=0;i<12;i++){const a=i/12*TAU;c.beginPath();c.moveTo(e.x+Math.cos(a)*r*.75,e.y+Math.sin(a)*r*.75);c.lineTo(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r);c.stroke()}}}
      else if(e.type==='lightning'){c.lineWidth=3;c.beginPath();c.moveTo(e.x,e.y);for(let i=1;i<=8;i++){const off=i===8?0:Math.sin(i*17)*12;c.lineTo(e.x+(e.tx-e.x)*i/8+off,e.y+(e.ty-e.y)*i/8-off)}c.stroke();c.strokeStyle='#ffffff';c.lineWidth=1;c.stroke()}
      else if(e.type==='bolt'){c.lineWidth=5;c.beginPath();c.moveTo(e.x-14,e.y-260);c.lineTo(e.x+16,e.y-180);c.lineTo(e.x-8,e.y-120);c.lineTo(e.x+12,e.y-65);c.lineTo(e.x,e.y);c.stroke();glow(c,e.x,e.y,65,e.color,.25)}
      else if(e.type==='roots'){for(let i=0;i<8;i++){const a=i/8*TAU,x=e.x+Math.cos(a)*e.r*.6,y=e.y+Math.sin(a)*e.r*.6;poly(c,[[x-5,y],[x+2,y-50*(1-f)],[x+7,y]],e.color)}}
      else if(e.type==='leaves'){for(let i=0;i<12;i++){const a=i*2.4+f,x=e.x+Math.cos(a)*e.r*.75,y=e.y+Math.sin(a)*e.r*.75;c.fillRect(x,y-100*(1-f),4,15)}}
      else if(e.type==='warning'){c.lineWidth=2;c.beginPath();c.arc(e.x,e.y,e.r*(.5+f*.5),0,TAU);c.stroke()}
      else if(e.type==='dash'){c.translate(e.x,e.y);c.rotate(e.angle);c.fillRect(-32,-7,38,14)}
      c.restore();
    }
    map(canvas,large=false){
      const c=canvas.getContext('2d'),g=this.game,w=canvas.width,h=canvas.height,pad=large?28:5,ww=w-pad*2,hh=h-pad*2,sx=ww/D.W,sy=hh/D.H;
      c.fillStyle='#0b2025';c.fillRect(0,0,w,h);c.save();c.translate(pad,pad);c.drawImage(this.ground,0,0,ww,hh);c.fillStyle='#11232655';c.fillRect(0,0,ww,hh);
      if(large){for(const z of D.ZONES){c.fillStyle='#f0e1b7';c.font='13px Segoe UI';c.textAlign='center';c.shadowColor='#182d2e';c.shadowBlur=7;c.fillText(z.name,z.center[0]*sx,z.center[1]*sy+(z.id==='ancient'?-37:0))}c.shadowBlur=0}
      for(const s of g.world.shrines){c.fillStyle=s.active?'#a9e6b4':'#eca1ba';const r=large?7:3;c.save();c.translate(s.x*sx,s.y*sy);c.rotate(Math.PI/4);c.fillRect(-r,-r,r*2,r*2);c.restore();if(large){c.font='11px Segoe UI';c.textAlign='center';c.fillStyle='#f4dfbd';c.fillText(s.active?'Đã thức tỉnh':s.name,s.x*sx,s.y*sy+24)}}
      c.fillStyle=g.victory?'#a5dfbb':'#e68c7e';c.beginPath();c.arc(1830*sx,610*sy,large?8:4,0,TAU);c.fill();
      c.strokeStyle='#efddab';c.lineWidth=1;c.strokeRect(this.camera.x*sx,this.camera.y*sy,1280/this.zoom*sx,720/this.zoom*sy);
      c.fillStyle='#fff2c3';c.beginPath();c.arc(g.player.x*sx,g.player.y*sy,large?5:3,0,TAU);c.fill();
      if(large){c.font='11px Segoe UI';c.textAlign='center';c.fillText('Ngươi đang ở đây',g.player.x*sx,g.player.y*sy-13)}c.restore();
    }
    screenToWorld(x,y){return{x:x/this.zoom+this.camera.x,y:y/this.zoom+this.camera.y}}
  }
  function titleArt(canvas,hero){
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);
    const grad=c.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#1f4849');grad.addColorStop(.7,'#152b32');grad.addColorStop(1,'#13222b');c.fillStyle=grad;c.fillRect(0,0,w,h);
    glow(c,280,165,145,'#d1d3a0',.12);ellipse(c,285,158,79,79,'#b9c3a033');ellipse(c,285,158,67,67,'#c8c8a733');
    for(let j=0;j<3;j++){for(let i=0;i<10;i++){const x=i*65-30+(j%2)*30,base=510+j*28,hh=140+Math.sin(i*6+j*3)*90;c.fillStyle=['#274647','#27453e','#315447'][j];c.fillRect(x,base-hh,9,hh);for(let k=0;k<4;k++)poly(c,[[x,base-hh+k*28],[x+45,base-hh+k*28-25],[x+8,base-hh+k*28+2]],['#274647','#29483e','#34564a'][j])}}
    poly(c,[[0,555],[80,511],[180,520],[230,557],[330,535],[440,554],[560,527],[560,650],[0,650]],'#284339');
    poly(c,[[0,626],[176,568],[230,603],[0,650]],'#78694c');poly(c,[[0,617],[176,557],[230,592],[0,641]],'#a78657');
    c.save();c.translate(55,475);c.scale(1.2,1.2);c.fillStyle='#85775c';c.fillRect(0,0,127,74);poly(c,[[-15,6],[64,-44],[142,6]],'#8b5f47');c.fillStyle='#d4b678';c.fillRect(8,66,111,8);c.fillStyle='#e5b26c';c.fillRect(22,23,25,25);c.fillRect(80,23,25,25);c.restore();
    for(let i=0;i<45;i++){const x=(i*173)%540,y=(i*97)%550;c.fillStyle=i%3?'#d6c68b44':'#ead699';c.fillRect(x,y,2,2)}
    glow(c,346,431,160,hero.color,.16);drawHero(c,{x:350,y:540,facing:0},hero,0,6.1);
    const g=c.createLinearGradient(400,0,560,0);g.addColorStop(0,'#10212800');g.addColorStop(1,'#102128');c.fillStyle=g;c.fillRect(400,0,160,h);
    c.fillStyle='#d3c39c';c.font='11px Segoe UI';c.textAlign='center';c.fillText('Giữ một đốm lửa. Tìm lại cả một miền.',270,613);
  }
  root.DTRenderer=Renderer;root.DTArt={drawHero,titleArt};
})(globalThis);
