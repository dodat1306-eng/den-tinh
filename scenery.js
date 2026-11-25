(function(root){
  'use strict';
  const D=root.DTWorld,F=D.frontier,R=root.DTRenderer.prototype,TAU=Math.PI*2;
  const palettes={
    village:['#405d49','#47674e','#527354','#60815b','#9ca56c'],
    forest:['#1d4540','#244e45','#2c594b','#3a6953','#72a17a'],
    lotus:['#335d5d','#396567','#426e69','#4c7a72','#8bb4a0'],
    ash:['#51464a','#5d4d4c','#67564e','#73614f','#b69269'],
    crossroads:['#3d5a4b','#466451','#4d6e55','#58775b','#92ab79'],
    ancient:['#293f45','#304a49','#38544f','#436254','#829775'],
    waterfall:['#315e61','#386e6b','#437b73','#4e887b','#9ac6a3'],
    valley:['#576b49','#63794f','#6e8557','#7e935e','#c1c57c'],
    ruins:['#3a4b61','#44566a','#4c6173','#576d7e','#9eb7b7']
  };
  function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill()}
  function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill()}
  function glow(c,x,y,r,color,alpha=.2){c.save();c.globalAlpha*=alpha;const grad=c.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,color);grad.addColorStop(1,'transparent');c.fillStyle=grad;c.fillRect(x-r,y-r,2*r,2*r);c.restore()}
  function noise(x,y,seed){let n=Math.imul(x+seed,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296}
  const low=()=>root.DTSettings?.graphics==='low'||root.DTSettings?.graphics!=='high'&&!!root.DTTouch?.active;
  const still=()=>!!root.DTSettings?.reducedMotion;
  const environment={complete:false,naturalWidth:0};
  const sprites={};
  function sprite(c,type,x,y){return root.DTWorldPixel?.sprite(c,type+'/intact',x,y)||false}
  function riverPath(c){c.beginPath();for(let y=270;y<=1960;y+=20){const x=F.riverX(y);y===270?c.moveTo(x,y):c.lineTo(x,y)}}
  class Terrain{
    constructor(world){this.world=world;this.chunks=new Map();this.size=512;this.overview=this.makeOverview()}
    makeOverview(){
      const out=document.createElement('canvas');out.width=640;out.height=448;const c=out.getContext('2d',{alpha:false});
      for(let y=0;y<448;y+=4)for(let x=0;x<640;x+=4){const zone=D.zoneAt(x*10,y*10);c.fillStyle=palettes[zone.id][1];c.fillRect(x,y,4,4)}
      c.save();c.scale(.1,.1);c.lineJoin=c.lineCap='round';c.strokeStyle='#2c8796';c.lineWidth=205;riverPath(c);c.stroke();
      for(const route of this.world.paths){c.beginPath();route.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.lineWidth=37;c.strokeStyle='#bda575';c.stroke()}
      c.restore();return out;
    }
    chunk(cx,cy){
      const key=cx+','+cy;
      if(this.chunks.has(key)){const found=this.chunks.get(key);this.chunks.delete(key);this.chunks.set(key,found);return found}
      const size=this.size,out=document.createElement('canvas');out.width=out.height=size+2;
      const c=out.getContext('2d',{alpha:false}),ox=cx*size,oy=cy*size;c.translate(1-ox,1-oy);
      if(root.DTWorldPixel){root.DTWorldPixel.terrain(c,this.world,ox,oy,size);if(root.DTWorldPixel.ready())this.chunks.set(key,out)}
      else{c.fillStyle=palettes[D.zoneAt(ox+16,oy+16).paletteId||D.zoneAt(ox+16,oy+16).id]?.[1]||'#244e45';c.fillRect(ox,oy,size,size)}
      while(this.chunks.size>(low()?20:36))this.chunks.delete(this.chunks.keys().next().value);return out;
    }
    draw(c,camera,width,height){const size=this.size;for(let y=Math.max(0,Math.floor(camera.y/size));y<=Math.min(Math.ceil(D.H/size)-1,Math.floor((camera.y+height)/size));y++)for(let x=Math.max(0,Math.floor(camera.x/size));x<=Math.min(Math.ceil(D.W/size)-1,Math.floor((camera.x+width)/size));x++)c.drawImage(this.chunk(x,y),x*size-1,y*size-1);while(this.chunks.size>(low()?20:36))this.chunks.delete(this.chunks.keys().next().value)}
  }
  R.makeGround=function(world){return new Terrain(world)};
  R.map=function(canvas,large=false){
    const c=canvas.getContext('2d'),g=this.game,w=canvas.width,h=canvas.height,pad=large?20:5,scale=Math.min((w-pad*2)/D.W,(h-pad*2)/D.H),ww=D.W*scale,hh=D.H*scale;
    c.fillStyle='#10232d';c.fillRect(0,0,w,h);c.save();c.translate((w-ww)/2,(h-hh)/2);c.drawImage(this.ground.overview,0,0,ww,hh);
    for(const z of D.ZONES){if(!g.visited.has(z.id)){c.fillStyle='#0a172140';if(z.id==='waterfall')c.fillRect(3840*scale,0,2560*scale,2020*scale);if(z.id==='ruins')c.fillRect(3840*scale,2020*scale,2560*scale,2460*scale);if(z.id==='valley')c.fillRect(0,2880*scale,3840*scale,1600*scale)}if(large){c.font='bold 12px Segoe UI';c.textAlign='center';c.fillStyle='#f4e9cc';c.shadowColor='#0c202b';c.shadowBlur=5;c.fillText(z.name,z.center[0]*scale,z.center[1]*scale+(z.id==='ancient'?-22:z.id==='ruins'?-35:-26));c.shadowBlur=0}}
    for(const s of g.world.shrines){c.save();c.translate(s.x*scale,s.y*scale);c.rotate(Math.PI/4);c.fillStyle=s.active?'#91ebbe':'#f0a0bb';const r=large?5:2.5;c.fillRect(-r,-r,r*2,r*2);c.restore()}
    for(const b of g.world.beacons){const state=g.outposts[b.id],x=b.x*scale,y=b.y*scale;c.fillStyle=state.claimed?'#90efdc':'#eebd81';c.strokeStyle=state.claimed?'#d9fff1':'#efc787';c.lineWidth=1.5;c.beginPath();c.arc(x,y,large?6:2.8,0,TAU);state.claimed?c.fill():c.stroke();if(large){c.font='10px Segoe UI';c.textAlign='center';c.fillText(b.name+(state.claimed?' ✓':''),x,y+19)}}
    c.fillStyle=g.victory?'#8ce4be':'#ee887e';c.beginPath();c.arc(1830*scale,610*scale,large?5:3,0,TAU);c.fill();c.strokeStyle='#efdfb77a';c.strokeRect(this.camera.x*scale,this.camera.y*scale,1280/this.zoom*scale,720/this.zoom*scale);
    c.fillStyle='#fff3be';c.beginPath();c.arc(g.player.x*scale,g.player.y*scale,large?4:2.5,0,TAU);c.fill();if(large){c.font='10px Segoe UI';c.fillText('Ngươi',g.player.x*scale,g.player.y*scale-10)}c.restore();
  };
  R.drawScenery=function(inView){
    const c=this.ctx,g=this.game,t=still()?0:g.time,p=g.player;
    this.collectLights?.(inView);
    this.drawWaterReflections?.(inView);
    for(const b of F.bridges){if(!inView(b))continue;c.fillStyle='#1b344e66';c.fillRect(b.x-b.w/2+9,b.y-b.h/2+17,b.w,b.h);c.fillStyle='#655848';c.fillRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h);for(let x=b.x-b.w/2+3;x<b.x+b.w/2;x+=17){c.fillStyle=(x%3)>1?'#baa276':'#a28b66';c.fillRect(x,b.y-b.h/2+4,14,b.h-8);c.fillStyle='#d3bd8b';c.fillRect(x+1,b.y-b.h/2+7,2,b.h-14)}for(const side of[-1,1]){c.fillStyle='#403d3a';c.fillRect(b.x-b.w/2,b.y+side*(b.h/2-7),b.w,5);for(let x=b.x-b.w/2;x<=b.x+b.w/2;x+=50){c.fillStyle='#71664d';c.fillRect(x-3,b.y+side*(b.h/2-7)-17,6,22);c.fillStyle='#d4b984';c.fillRect(x-4,b.y+side*(b.h/2-7)-18,8,4)}}}
    for(const b of g.world.beacons){if(!inView(b))continue;const st=g.outposts[b.id],col=st.claimed?b.color:st.complete?'#d7f6bd':'#9d9b8e';glow(c,b.x,b.y-27,st.claimed?130:55,col,st.claimed?.17:.09);c.save();c.strokeStyle=col;c.globalAlpha=.35;c.lineWidth=2;c.setLineDash([13,8]);c.beginPath();c.ellipse(b.x,b.y,76,55,0,t*.1,TAU+t*.1);c.stroke();c.restore()}
    for(const e of g.effects)if(e.type==='afterimage'&&inView(e))this.drawEffect(e);
    for(const b of g.projectiles){if(!inView(b))continue;c.save();c.lineCap='round';c.globalAlpha=b.friendly?.28:.18;c.strokeStyle=b.color;c.lineWidth=b.friendly?5:3;c.beginPath();c.moveTo(b.x-b.vx*.06,b.y-b.vy*.06-18);c.lineTo(b.x,b.y-18);c.stroke();c.restore()}
    // Wide shafts of light are geometry, avoiding full-screen blur passes.
    if(!low()&&!still()){c.save();c.globalAlpha=.035;c.fillStyle='#f2e1a5';for(let i=0;i<3;i++){const x=this.camera.x+i*380+Math.sin(t*.13+i)*30;poly(c,[[x-180,this.camera.y-80],[x-100,this.camera.y-80],[x+350,this.camera.y+650],[x+90,this.camera.y+650]],'#f2e1a5')}c.restore()}
    this._drawingTopEffects=true;
  };
  R.drawBeacon=function(b){
    const c=this.ctx,g=this.game,t=still()?0:g.time,st=g.outposts[b.id],col=st.claimed?b.color:st.complete?'#d7f6bd':'#9d9b8e';
    this.drawCastShadow?.(b.x,b.y,34,68,b);
    if(!sprite(c,'lanternPost',b.x,b.y,76,108)){c.fillStyle='#435c64';c.fillRect(b.x-12,b.y-69,24,61);c.fillStyle='#a2ab97';c.fillRect(b.x-30,b.y-16,60,8)}
    glow(c,b.x+10,b.y-63,32,col,st.claimed?.4:.1);if(!st.claimed){c.save();c.globalAlpha=.65;c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.arc(b.x,b.y-45,12,0,TAU);c.stroke();c.restore()}
    c.font='bold 10px Segoe UI';c.textAlign='center';c.fillStyle=st.claimed?'#e5ead2':'#d0c8ae';c.fillText(b.name,b.x,b.y+32);
  };
  R.drawRibbonTrail=function(b){
    const pts=b.history;if(!pts||pts.length<2||still()||b._ribbonFrame===this.game?.time)return;
    b._ribbonFrame=this.game?.time;
    const c=this.ctx,n=pts.length,col=b.color||'#ffe6a3',baseW=Math.max(2.2,(b.r||5)*(b.friendly?1.15:.85));
    const left=[],right=[];
    for(let i=0;i<n;i++){
      const p=pts[i],prev=pts[Math.max(0,i-1)],next=pts[Math.min(n-1,i+1)];
      let dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy);
      if(len<.01){dx=Math.cos(b.angle||0);dy=Math.sin(b.angle||0);len=1}else{dx/=len;dy/=len}
      const nx=-dy,ny=dx,u=i/(n-1),w=baseW*u*u;
      left.push([p.x+nx*w,p.y-18+ny*w]);
      right.unshift([p.x-nx*w,p.y-18-ny*w]);
    }
    const polyPts=left.concat(right);
    c.save();
    c.globalAlpha=b.friendly?.42:.28;
    poly(c,polyPts,col);
    if(b.friendly&&n>=3){
      const coreL=[],coreR=[];
      for(let i=1;i<n;i++){
        const p=pts[i],prev=pts[i-1];
        let dx=p.x-prev.x,dy=p.y-prev.y,len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
        const nx=-dy,ny=dx,u=i/(n-1),w=baseW*.42*u*u;
        coreL.push([p.x+nx*w,p.y-18+ny*w]);
        coreR.unshift([p.x-nx*w,p.y-18-ny*w]);
      }
      c.globalAlpha=.72;poly(c,coreL.concat(coreR),'#ffffff');
    }
    c.restore();
  };
  R.drawProjectile=function(b){
    this.drawRibbonTrail?.(b);
    const c=this.ctx;c.save();c.translate(b.x,b.y-18);c.rotate(b.angle);c.fillStyle=b.color;
    if(!b.friendly){c.strokeStyle='#242b3c';c.lineWidth=2;oval(c,0,0,b.r+1,b.r+1,'#252e40');oval(c,0,0,b.r,b.r,b.color);oval(c,1,-1,Math.max(1,b.r*.48),Math.max(1,b.r*.48),'#ffffff')}
    else if(b.kind==='arrow'){poly(c,[[-15,-2],[9,-2],[9,-5],[20,0],[9,5],[9,2],[-15,2]],b.color);c.fillStyle='#ffffff';c.fillRect(-4,-1,16,2)}
    else if(b.kind==='code'){c.globalAlpha=.24;c.fillRect(-15,-7,32,14);c.globalAlpha=1;c.fillRect(-7,-2,20,4);c.fillStyle='#ffffff';c.fillRect(7,-2,6,4)}
    else{poly(c,[[-11,0],[0,-b.r],[b.r+5,0],[0,b.r]],b.color);c.fillStyle='#ffffff';c.beginPath();c.arc(2,0,Math.max(2,b.r*.45),0,TAU);c.fill()}c.restore();
  };
  const propBefore=R.drawProp;
  function lantern(c,x,y,t,color='#ffd598'){c.fillStyle='#433d3a';c.fillRect(x-1,y-30,2,18);c.fillStyle='#b8864f';c.fillRect(x-8,y-14,16,20);c.fillStyle=color;c.fillRect(x-5,y-12,10,16);c.fillStyle='#ffeab8';c.fillRect(x-1,y-10,3,12);c.fillStyle='#6e4d36';c.fillRect(x-9,y-16,18,3);c.fillRect(x-8,y+5,16,3);c.fillRect(x,y+8,2,7);glow(c,x,y-3,48+Math.sin(t*2+x)*3,color,.22)}
  R.drawProp=function(o){
    if(root.DTWorldPixel?.prop(this,o))return;
    const c=this.ctx,g=this.game,t=still()?0:g.time,x=o.x,y=o.y,v=o.variant;
    if(environment.complete&&environment.naturalWidth&&sprites[o.type]){
      c.save();const scale=o.type==='banyan'?2.5:1;if(['tree','willow','banyan','pine','bamboo'].includes(o.type)){if(Math.abs(g.player.x-x)<52*scale&&g.player.y<y&&g.player.y>y-125*scale)c.globalAlpha=.4;c.translate(x,y);c.transform(1,0,still()?0:Math.sin(t*1.2+x)*.006,1,0,0);sprite(c,o.type,0,0)}else sprite(c,o.type,x,y,o.w?o.w*1.22:undefined,o.h?o.h*1.3:undefined);c.restore();
      if(o.type==='lanternPost')glow(c,x+9,y-43,42,'#ffda99',.16);
      if(o.type==='house'||o.type==='temple')for(const side of[-1,1])glow(c,x+side*o.w*.3,y-38,50,'#ffca8f',.11);
      if(o.type==='waterfall'&&!still()){c.save();c.globalAlpha=.22;c.fillStyle='#d9fef1';for(let i=0;i<7;i++){const yy=-219+(i*31+t*100)%179;c.fillRect(x+2+i*3, y+yy,2,12)}for(let i=0;i<5;i++)oval(c,x-10+Math.sin(i*4+t)*42,y+2+Math.sin(t*1.2+i)*6,18,5,'#ddfff477');c.restore()}
      return;
    }
    if(o.type==='house'||o.type==='temple'){
      const w=o.w,h=o.h,temple=o.type==='temple';c.save();c.translate(x,y);
      poly(c,[[-w*.53,-h*.28],[w*.5,-h*.3],[w*.7,18],[-w*.35,24]],'#162c3255');
      c.fillStyle='#4e5145';c.fillRect(-w*.46,-8,w*.92,18);c.fillStyle='#c5b88b';c.fillRect(-w*.44,-h*.54,w*.88,h*.54);c.fillStyle='#9c9576';c.fillRect(w*.32,-h*.54,w*.12,h*.54);
      for(let yy=-h*.48;yy<-5;yy+=11){c.strokeStyle='#806f4c38';c.lineWidth=1;c.beginPath();c.moveTo(-w*.42,yy);c.lineTo(w*.42,yy);c.stroke()}
      c.fillStyle='#3e3e35';c.fillRect(-19,-48,38,48);c.fillStyle='#66543c';c.fillRect(-16,-46,31,44);c.fillStyle='#967851';c.fillRect(-14,-44,3,39);c.fillStyle='#d8bb7a';c.fillRect(9,-26,3,4);
      for(const side of[-1,1]){const xx=side*w*.28;c.fillStyle='#474637';c.fillRect(xx-15,-46,30,30);c.fillStyle='#edb566';c.fillRect(xx-12,-43,24,24);c.fillStyle='#ffe1a0';c.fillRect(xx-10,-41,5,16);c.fillStyle='#71613f';c.fillRect(xx-1,-44,3,27);c.fillRect(xx-13,-32,26,3);c.fillRect(xx-17,-17,34,4)}
      const roof=temple?'#a15e50':'#8e6a51';poly(c,[[-w*.59,-h*.48],[-w*.43,-h*.57],[-12,-h],[12,-h],[w*.43,-h*.57],[w*.59,-h*.48]],'#383f3a');poly(c,[[-w*.57,-h*.51],[-w*.42,-h*.61],[-9,-h*1.04],[9,-h*1.04],[w*.42,-h*.61],[w*.57,-h*.51]],roof);
      for(let row=1;row<8;row++){const f=row/8,yy=-h*1.04+f*h*.53,span=15+f*w*.53;c.strokeStyle=temple?'#d5946b':'#c29669';c.lineWidth=2;c.beginPath();c.moveTo(-span,yy-2);c.quadraticCurveTo(0,yy+3,span,yy-2);c.stroke();c.strokeStyle='#3d39352b';c.lineWidth=1;for(let xx=-span+8;xx<span;xx+=14){c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+3,yy+8);c.stroke()}}
      c.strokeStyle='#e1bb7c';c.lineWidth=3;c.beginPath();c.moveTo(-w*.56,-h*.51);c.quadraticCurveTo(0,-h*.43,w*.56,-h*.51);c.stroke();c.fillStyle='#ccb27b';c.fillRect(-w*.44,0,w*.88,5);c.fillStyle='#8e8a70';c.fillRect(-w*.47,7,w*.94,5);
      if(temple){c.fillStyle='#bca57a';c.fillRect(-33,-h*.6,66,18);c.font='bold 9px Segoe UI';c.textAlign='center';c.fillStyle='#523e37';c.fillText('ĐÌNH LÀNG',0,-h*.6+12)}
      for(const side of[-1,1])lantern(c,side*(w*.45),-h*.4,t);c.restore();return;
    }
    if(!['pine','pillar','crystal','lanternPost','fern','reed','windmill','pagoda','ruinGate','waterfall'].includes(o.type)){propBefore.call(this,o);return}
    c.save();c.translate(x,y);oval(c,0,2,o.type==='waterfall'?110:o.type==='ruinGate'?100:22,8,'#152b364d');
    if(o.type==='pine'){
      c.fillStyle='#665d55';c.fillRect(-6,-65,12,67);for(let i=0;i<4;i++){const yy=-22-i*23,w=43-i*7;poly(c,[[-w,yy],[0,yy-52],[w,yy],[w*.65,yy+7],[-w*.65,yy+7]],['#2b4550','#335b60','#416e6b','#5b8a7b'][i]);c.fillStyle='#99b39a66';c.fillRect(-w*.3,yy-24,w*.4,3)}
    }else if(o.type==='pillar'){
      c.fillStyle='#394c5c';c.fillRect(-22,-6,44,13);c.fillStyle='#6c7e88';c.fillRect(-16,-65-v*5,32,63+v*5);c.fillStyle='#99a69f';c.fillRect(-16,-65-v*5,7,61+v*5);poly(c,[[-20,-68-v*5],[-13,-76-v*5],[5,-72-v*5],[20,-65-v*5]],'#a9b1a5');c.strokeStyle='#3d5360';c.lineWidth=2;c.beginPath();c.moveTo(5,-65);c.lineTo(-2,-40);c.lineTo(7,-29);c.lineTo(2,-12);c.stroke();c.fillStyle='#76d8d04d';c.fillRect(-5,-49,11,3);c.fillRect(-5,-43,3,10);
    }else if(o.type==='crystal'){
      const col=v%2?'#9aceb6':'#9cbddd';glow(c,0,-24,42,col,.14);poly(c,[[-16,0],[-15,-29],[-4,-51],[9,-34],[18,-9],[10,3]],'#3e6571');poly(c,[[-12,-5],[-11,-28],[-4,-45],[4,-27],[5,-4]],col);poly(c,[[4,-27],[9,-34],[14,-10],[7,-4]],'#719dba');c.fillStyle='#d9eee4';c.fillRect(-7,-30,2,13);
    }else if(o.type==='lanternPost'){
      c.fillStyle='#5e5847';c.fillRect(-3,-60,6,61);c.fillStyle='#a4986b';c.fillRect(-2,-59,2,55);c.fillRect(-14,-60,28,4);lantern(c,0,-28,t,v%2?'#f5d1a3':'#f1be8c');
    }else if(o.type==='fern'||o.type==='reed'){
      const sway=(o.bend||0)*16+(still()?0:Math.sin(t*1.5+x)*3);c.strokeStyle=o.type==='reed'?'#b5bd7c':'#7eb793';c.lineWidth=2;for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(i*3,0);c.quadraticCurveTo(i*7+sway,-15,i*10+sway,-27-Math.abs(i)*2);c.stroke();if(o.type==='fern')for(let j=1;j<4;j++)poly(c,[[i*2+j*2,-j*6],[i*7-9+sway,-j*6-5],[i*4+j,-j*6+3]],'#569178');else{c.fillStyle='#e2d1a1';c.fillRect(i*10+sway-2,-31-Math.abs(i)*2,4,10)}}
    }else if(o.type==='ruinGate'){
      for(const side of[-1,1]){c.fillStyle='#4c5f71';c.fillRect(side*84-16,-112,32,112);c.fillStyle='#99a7a6';c.fillRect(side*84-17,-117,34,8);c.fillStyle='#788c94';c.fillRect(side*84-13,-106,9,99)}poly(c,[[-109,-121],[-94,-138],[84,-138],[112,-121],[105,-111],[-102,-111]],'#889a9e');c.fillStyle='#46636e';c.fillRect(-45,-133,90,18);c.fillStyle='#a0e6dd';c.font='bold 11px Consolas';c.textAlign='center';c.fillText('〈 THIÊN CƠ 〉',0,-120);
    }else if(o.type==='waterfall'){
      for(let side=-1;side<=1;side+=2){poly(c,[[side*34,0],[side*121,4],[side*145,-60],[side*110,-151],[side*38,-173]],'#47616b');poly(c,[[side*52,-159],[side*114,-142],[side*135,-64],[side*96,-83]],'#7c9392');c.fillStyle='#97afa0';c.fillRect(side*82-21,-146,42,7)}
      c.fillStyle='#8ed5db';c.fillRect(-38,-172,76,176);c.fillStyle='#d5f6e9';for(let i=0;i<9;i++){const xx=-34+i*8,yy=-173+(i*43+t*100)%150;c.fillRect(xx,yy,3,30)}for(let i=0;i<7;i++){const xx=Math.sin(i*8+t)*52;oval(c,xx,4+Math.sin(t*2+i)*5,24,7,'#cbf2e47a')}
    }else if(o.type==='windmill'){
      poly(c,[[-24,0],[-18,-79],[18,-79],[24,0]],'#b3a381');poly(c,[[-28,-77],[0,-111],[28,-77]],'#775947');c.fillStyle='#53605a';c.fillRect(-8,-32,16,32);c.save();c.translate(0,-75);c.rotate(t*.35);for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.fillStyle='#756e54';c.fillRect(0,-3,76,6);c.fillStyle='#d8cba3';c.fillRect(20,-13,51,11);c.strokeStyle='#a59c7d';c.lineWidth=1;for(let xx=22;xx<70;xx+=8){c.beginPath();c.moveTo(xx,-13);c.lineTo(xx,-2);c.stroke()}}c.restore();oval(c,0,-75,7,7,'#dfc28c');
    }else if(o.type==='pagoda'){
      c.fillStyle='#394e5e';c.fillRect(-62,-9,124,19);for(let i=0;i<3;i++){const yy=-i*55;c.fillStyle='#b0a88e';c.fillRect(-34+i*6,yy-55,68-i*12,50);poly(c,[[-73+i*15,yy-49],[0,yy-92],[73-i*15,yy-49],[48-i*10,yy-43],[-48+i*10,yy-43]],'#5c6970');c.strokeStyle='#b3b59c';c.lineWidth=3;c.beginPath();c.moveTo(-70+i*15,yy-49);c.quadraticCurveTo(0,yy-34,70-i*15,yy-49);c.stroke();c.fillStyle='#e9c98a';c.fillRect(-7,yy-48,14,25)}
    }
    c.restore();
  };
  const effectBefore=R.drawEffect;
  const enemyBefore=R.drawEnemy,npcBefore=R.drawNpc,companionBefore=R.drawCompanion;
  R.drawEnemy=function(e){if(!root.DTActorsPixel?.enemy(this,e))enemyBefore.call(this,e)};
  R.drawNpc=function(n){if(!root.DTActorsPixel?.npc(this,n))npcBefore.call(this,n)};
  R.drawCompanion=function(){if(!root.DTActorsPixel?.companion(this))companionBefore.call(this)};
  R.drawEffect=function(e){
    const custom=['muzzle','skillflare','impact','soulburst','footstep','dashwake','afterimage'];if(!custom.includes(e.type)){effectBefore.call(this,e);return}
    if(e.type==='afterimage'&&this._drawingTopEffects)return;
    const c=this.ctx,f=Math.max(0,Math.min(1,1-e.life/e.maxLife)),alpha=1-f;
    c.save();c.translate(e.x,e.y);c.globalAlpha=alpha;c.strokeStyle=e.color;c.fillStyle=e.color;c.lineCap=c.lineJoin='round';
    if(e.type==='footstep'){
      if(!still()){c.globalAlpha=alpha*.32;c.lineWidth=1;c.beginPath();c.ellipse(e.side*6,2,6+f*e.r,2+f*4,0,0,TAU);c.stroke();for(let i=0;i<3;i++)c.fillRect((i-1)*7,3-f*8-i*2,2,2)}
    }else if(e.type==='afterimage'){
      if(!still()){c.globalAlpha=alpha*.2;const face=Math.cos(e.facing)<0?-1:1;c.scale(face,1);poly(c,[[-12,-34],[-17,-6],[-1,-9],[15,-5],[12,-34]],e.color);oval(c,0,-45,11,12,e.color);c.fillRect(-9,-8,6,10);c.fillRect(5,-7,6,10)}
    }else if(e.type==='muzzle'){
      c.rotate(e.angle);c.translate(30,0);c.globalCompositeOperation='lighter';poly(c,[[0,-3],[14,-8],[9,-2],[26,0],[9,2],[14,8],[0,3]],e.color);c.fillStyle='#fff6da';c.fillRect(0,-2,10,4);
    }else if(e.type==='impact'){
      c.rotate(e.angle||0);c.globalCompositeOperation='lighter';
      // Directional Slash Spark & Impact Ring
      c.strokeStyle=e.color||'#ffe6a3';c.lineWidth=2;
      c.beginPath();c.ellipse(4,0,Math.max(1,6+f*22),Math.max(1,3+f*9),0,0,TAU);c.stroke();
      for(let i=-2;i<=2;i++){
        const a=i*.26,r1=4+f*8,r2=14+f*32+(i===0?10:0);
        c.lineWidth=i===0?2.6:1.6;
        c.beginPath();c.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);c.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);c.stroke();
      }
      poly(c,[[-6,0],[4,-4*(1-f)],[24+f*18,0],[4,4*(1-f)]],'#ffffff');
    }else if(e.type==='soulburst'){
      c.globalAlpha=alpha*.6;c.lineWidth=2;c.beginPath();c.ellipse(0,12,10+f*35,4+f*11,0,0,TAU);c.stroke();for(let i=0;i<6;i++){const a=i/6*TAU;poly(c,[[Math.cos(a)*f*36,Math.sin(a)*f*26-f*25-6],[Math.cos(a)*f*36+3,Math.sin(a)*f*26-f*25],[Math.cos(a)*f*36,Math.sin(a)*f*26-f*25+6],[Math.cos(a)*f*36-3,Math.sin(a)*f*26-f*25]],e.color)}
    }else if(e.type==='dashwake'){
      if(!still()){c.rotate(e.angle);c.globalAlpha=alpha*.5;c.lineWidth=2;for(const side of[-1,1]){c.beginPath();c.moveTo(-60-f*40,side*(8+f*9));c.quadraticCurveTo(-20,side*25,22,side*9);c.stroke()}}
    }else if(e.type==='skillflare'){
      const r=e.r*(.35+Math.sin(f*Math.PI/2)*.65),hero=e.hero,key=e.key,amp=still()?.45:1;c.globalAlpha=alpha*amp;
      glow(c,0,-12,r*.95,e.color,key==='r'?.28:.17);c.lineWidth=key==='r'?3:2;c.globalAlpha=alpha*.7*amp;c.beginPath();c.ellipse(0,0,r,r*.64,0,0,TAU);c.stroke();c.globalAlpha=alpha*.35*amp;c.beginPath();c.ellipse(0,0,r*.77,r*.5,0,0,TAU);c.stroke();
      for(let i=0;i<(low()?8:14);i++){
        const a=i/(low()?8:14)*TAU+(still()?0:f*.8),x=Math.cos(a)*r,y=Math.sin(a)*r*.64;c.globalAlpha=alpha*.85*amp;
        if(hero==='hoavi'){c.save();c.translate(x,y-10-f*25);c.rotate(a+.8);c.fillStyle=i%2?'#f4b0ee':'#8affe6';c.fillRect(-3,-3,6,6);c.restore();c.font='bold 10px Consolas';c.textAlign='center';c.fillText(i%2?'01':'</>',x*.8,y*.8-12)}
        else if(hero==='linh'){c.save();c.translate(x,y-f*36);c.rotate(a+f*2);poly(c,[[-2,0],[0,-14],[5,-3],[2,8]],i%2?'#d6efb2':'#86d2ad');c.restore()}
        else if(hero==='kiet'){c.strokeStyle=i%2?'#e4edff':'#93bdff';c.lineWidth=i%2?1:3;c.beginPath();c.moveTo(x*.45,y*.45-5);c.lineTo(x*.65+9,y*.6-10);c.lineTo(x*.73-6,y*.75+8);c.lineTo(x,y-5);c.stroke()}
        else{const height=(1-f)*(key==='r'?90:50);poly(c,[[x-7,y],[x-3,y-height*.55],[x+2,y-height],[x+8,y-height*.35],[x+7,y]],i%2?'#ffd28b':'#f09d68');poly(c,[[x-3,y],[x+1,y-height*.6],[x+4,y]],'#fff0c0')}
      }
      if(key==='r'){c.globalAlpha=alpha*.5*amp;c.strokeStyle='#fff0c4';c.lineWidth=1;for(let i=0;i<6;i++){const a=i/6*TAU;c.beginPath();c.moveTo(Math.cos(a)*r*.2,Math.sin(a)*r*.2);c.lineTo(Math.cos(a)*r*1.1,Math.sin(a)*r*.7);c.stroke()}}
    }
    c.restore();
  };
  const BIOME_AMBIENT={
    village:'rgba(32, 24, 46, 0.38)',
    forest:'rgba(12, 32, 36, 0.54)',
    lotus:'rgba(14, 26, 44, 0.52)',
    ash:'rgba(42, 16, 14, 0.50)',
    ancient:'rgba(20, 14, 36, 0.60)',
    waterfall:'rgba(16, 38, 44, 0.32)',
    valley:'rgba(24, 30, 42, 0.44)',
    ruins:'rgba(12, 22, 36, 0.54)',
    crossroads:'rgba(24, 28, 40, 0.42)'
  };
  const ELEMENT_LIGHT_COLORS={
    lightning:'#c084fc',wind:'#6ee7b7',earth:'#fbbf24',fire:'#fb923c',ice:'#67e8f9',nature:'#86efac',light:'#fef08a'
  };
  const HERO_LIGHT_COLORS={
    an:'#ffb85c',linh:'#86efac',quanle:'#c084fc',kiet:'#c084fc',hoavi:'#38bdf8',quynhkun:'#ff6b6b',ait01:'#4df3ff'
  };
  function heroLanternColor(g){
    if(g.hero?.id==='thienvu'){
      const el=g.element?.id||g.player?.elementForm||'lightning';
      return ELEMENT_LIGHT_COLORS[el]||'#c084fc';
    }
    return HERO_LIGHT_COLORS[g.hero?.id]||g.hero?.color||'#ffb85c';
  }
  R.collectLights=function(inView){
    const g=this.game,p=g.player,t=still()?0:g.time,z=this.zoom||1;
    const x0=this.camera.x-280,y0=this.camera.y-280,x1=this.camera.x+1280/z+280,y1=this.camera.y+720/z+280;
    const near=o=>o&&Number.isFinite(o.x)&&Number.isFinite(o.y)&&o.x>x0&&o.x<x1&&o.y>y0&&o.y<y1;
    const lights=[];
    const add=(x,y,r,color,intensity=.85,cast=true,isPlayer=false)=>{
      if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(r)||r<=2)return;
      lights.push({x,y,r,color:color||'#ffd598',intensity,cast,isPlayer});
    };
    // 1. Player's Den Tinh Lantern (220px radius + natural breathing Math.sin(t * 7) * 7)
    const breathe=still()?0:Math.sin(t*7)*7;
    add(p.x,p.y-18,220+breathe,heroLanternColor(g),.96,true,true);
    // 2. Buildings & Environment
    for(const o of g.world.props||[]){
      if(!near(o)||o.destroyed||o.damageStage===3)continue;
      const fl=still()?0:Math.sin(t*6+o.x*.1)*5;
      if(o.type==='lanternPost')add(o.x,o.y-28,145+fl,'#ffd28a',.9,true);
      else if(o.type==='house'||o.type==='temple'){
        const w=o.w||180,h=o.h||130;
        for(const side of[-1,1]){
          add(o.x+side*w*.28,o.y-38,125+fl*.5,'#ffca78',.85,true);
          add(o.x+side*w*.45,o.y-h*.4,95+fl*.4,'#ffd598',.72,false);
        }
      }else if(o.type==='crystal')add(o.x,o.y-22,95+fl*.4,o.variant%2?'#9aceb6':'#9cbddd',.65,false);
      if(o.status==='burning'||o.status==='heated')add(o.x,o.y-24,145+(still()?0:Math.sin(t*11+o.x)*8),'#ff6e2a',.92,true);
    }
    for(const o of g.world.environment||[]){
      if(!near(o))continue;
      const fl=still()?0:Math.sin(t*8+o.x)*6;
      if(o.type==='campfire'&&(!o.used||o.elementalState==='fire'))add(o.x,o.y-12,175+fl,'#ff9a52',.95,true);
      else if(o.type==='sagaGate'||o.type==='storyEcho')add(o.x,o.y-24,140+fl,o.color||'#a7deeb',.82,true);
      else if(o.type==='spiritTree'&&!o.used)add(o.x,o.y-28,110,'#a7f3d0',.65,false);
      else if((o.status==='burning'||o.elementalState==='fire')&&!o.used)add(o.x,o.y-16,140+fl,'#ff6e2a',.9,true);
    }
    for(const s of g.world.shrines||[])if(near(s))add(s.x,s.y-24,s.active?195:125,s.color||'#a5dfa5',s.active?.92:.68,true);
    if(near(g.world.altar))add(g.world.altar.x,g.world.altar.y-20,165,'#efd38a',.82,true);
    for(const b of g.world.beacons||[])if(near(b)){const st=g.outposts?.[b.id];add(b.x,b.y-35,st?.claimed?195:120,b.color||'#8ce7e0',st?.claimed?.92:.7,true)}
    for(const o of g.world.relicPedestals||[])if(!o.claimed&&near(o))add(o.x,o.y-20,135,o.unlocked?'#80e5be':'#e9bf6f',.85,true);
    for(const o of g.world.bossAltars||[])if(o.status!=='defeated'&&near(o))add(o.x,o.y-20,145,'#ffd892',.85,true);
    for(const d of g.relicDrops||[])if(near(d))add(d.x,d.y-22-(d.z||0),150,'#ffe394',.95,true);
    // 3. Skills, Summons & Flying Projectiles
    for(const a of g.activeEffects||[])if(near(a))add(a.x,a.y,Math.max(110,(a.r||120)*1.15),a.color||'#eec57a',.82,true);
    for(const f of g.elementFields||[])if(near(f))add(f.x,f.y,Math.max(115,(f.r||110)*1.15),ELEMENT_LIGHT_COLORS[f.element]||'#a9e6d4',.8,true);
    for(const f of g.mythicFields||[])if(f.life>0&&near(f)){
      const col=ELEMENT_LIGHT_COLORS[f.element]||(f.kind==='lantern'?'#ffbe6b':f.kind==='satellites'?'#5ce1e6':f.kind==='bagua-stake'||f.kind==='heaven-seal'?'#ffd166':f.kind==='tactical-zone'||f.kind==='airdrop-zone'?'#4df3ff':g.hero?.color);
      add(f.x,f.y-12,Math.max(120,(f.r||110)*1.2),col,.85,true);
    }
    if(p.firewall>0)add(p.x,p.y-15,175,'#f4a0e8',.82,false);
    if(p.shadowArmor>0)add(p.x,p.y-18,165,'#a855f7',.85,false);
    for(const c of g.elementClones||[])if(c.alive&&near(c))add(c.x,c.y-18,135,ELEMENT_LIGHT_COLORS[c.element]||'#fef08a',.84,true);
    for(const s of g.elementSummons||[])if(s.life>0&&near(s))add(s.x,s.y-18,125,s.kind==='golem'?'#fbbf24':'#86efac',.78,true);
    for(const u of g.shadowArmy||[])if(u.life>0&&near(u))add(u.x,u.y-14,95,'#a855f7',.72,false);
    for(const r of g.shadowRemains||[])if(near(r))add(r.x,r.y-10,75,'#c084fc',.62,false);
    for(const b of g.projectiles||[])if(near(b))add(b.x,b.y-16,Math.max(58,(b.r||5)*9.5),b.color||'#ffe6a3',b.friendly?.76:.58,b.r>=7);
    for(const e of g.effects||[])if(near(e)&&['shadow-portal','shadow-legion','lightning','bolt','ultimate','shock','element-beam'].includes(e.type)){
      add(e.x,e.y-14,Math.max(115,(e.r||90)*1.25),e.color||'#c084fc',.85,true);
    }
    root.DTNpcPixel?.collectLights?.(g,near,add,still());
    this._frameLights=lights;
    return lights;
  };
  R.drawCastShadow=function(x,y,width=28,height=36,entity=null){
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const c=this.ctx,g=this.game,lights=this._frameLights||this.collectLights?.();
    const isPlayer=entity===g?.player;
    let best=null,bestScore=0,sumX=0,sumY=0,totalW=0;
    if(lights&&lights.length){
      for(const L of lights){
        if(!L.cast||(isPlayer&&L.isPlayer))continue;
        const dx=x-L.x,dy=y-L.y,d=Math.hypot(dx,dy);
        if(d<2||d>L.r*1.85)continue;
        const w=(1-d/(L.r*1.85))*(L.intensity||.8);
        if(w>bestScore){bestScore=w;best={L,d,dx,dy}}
        sumX+=(dx/d)*w;sumY+=(dy/d)*w;totalW+=w;
      }
    }
    // Fallback subtle moonlight vector if no point light is nearby, or weighted directional vector away from strongest light
    let angle=Math.PI*.28,stretch=.75,alpha=.22,lx=x-90,ly=y-110;
    if(best&&totalW>0.01){
      angle=Math.atan2(sumY,sumX);
      stretch=Math.max(.42,Math.min(1.75,.48+(best.d/Math.max(80,best.L.r))*1.15));
      alpha=Math.max(.10,Math.min(.36,bestScore*.42));
      lx=best.L.x;ly=best.L.y;
    }
    if(entity&&typeof entity==='object')entity._castShadow={angle,stretch,alpha,lightX:lx,lightY:ly};
    const rx=Math.max(6,width*.52*stretch),ry=Math.max(3,width*.22);
    c.save();
    c.translate(Math.round(x),Math.round(y+2));
    c.rotate(angle);
    c.globalAlpha*=alpha;
    c.fillStyle='#090d18';
    c.beginPath();c.ellipse(rx*.72,0,rx,ry,0,0,TAU);c.fill();
    c.restore();
  };
  function isWaterSurface(g,x,y){
    if(F?.riverAt(x,y,24)&&!F?.onBridge(x,y,0))return true;
    const z=D.zoneAt(x,y);
    if((z.paletteId||z.id).includes('lotus')){
      for(const o of g.world.props||[])if(o.type==='lotus'&&Math.hypot(o.x-x,o.y-y)<92)return true;
    }
    for(const f of g.mythicFields||[])if(f.kind==='water'&&f.life>0&&Math.hypot(f.x-x,f.y-y)<f.r)return true;
    return false;
  }
  R.drawWaterReflections=function(inView){
    const c=this.ctx,g=this.game,t=still()?0:g.time,p=g.player;
    // 1. Dam Sen Water Basins & Concentric Lotus Ripples
    for(const o of g.world.props||[]){
      if(o.type!=='lotus'||!inView(o))continue;
      c.save();
      oval(c,o.x,o.y+2,44,20,'#1b454d66');
      oval(c,o.x,o.y,34,14,'#25596355');
      const rPhase=(t*1.4+(o.x+o.y)*.02)%1;
      c.strokeStyle='#9be7dc';c.globalAlpha=(1-rPhase)*.36;c.lineWidth=1.2;
      c.beginPath();c.ellipse(o.x,o.y+1,16+rPhase*26,6+rPhase*10,0,0,TAU);c.stroke();
      c.restore();
    }
    // 2. Thac Ngoc River Waves, Waterfall Base Foam & Bridge Piling Ripples
    if(Math.abs(p.x-4650)<1250&&p.y<2450){
      c.save();c.lineWidth=1.5;c.strokeStyle='#c2f1e377';
      for(let i=0;i<55;i++){
        const y=290+(i*37+t*30)%1640,x=F.riverX(y)-75+(i*47)%140;
        if(!inView({x,y}))continue;
        const wave=Math.sin(t*4+y*.2)*2.5;
        c.beginPath();c.moveTo(x+wave,y);c.quadraticCurveTo(x+10+wave,y+3,x+26+wave,y);c.stroke();
      }
      // Churning white water foam under Thac Ngoc waterfall (4650, 420)
      if(inView({x:4650,y:420})){
        for(let i=0;i<10;i++){
          const ph=(t*1.8+i*.1)%1,fx=4650+Math.sin(i*3.7+t*2)*46,fy=422+Math.cos(i*2.3)*8+ph*22;
          c.globalAlpha=(1-ph)*.55;oval(c,fx,fy,16+ph*18,5+ph*6,'#e6fffc');
        }
        for(let i=0;i<3;i++){
          const ph=(t*1.2+i*.33)%1;
          c.globalAlpha=(1-ph)*.45;c.strokeStyle='#ffffff';c.lineWidth=2;
          c.beginPath();c.ellipse(4650,426,38+ph*54,11+ph*18,0,0,TAU);c.stroke();
        }
      }
      // Expanding ripple rings around bridge pilings
      for(const b of F.bridges){
        if(!inView(b))continue;
        for(const side of[-1,1])for(let bx=b.x-b.w/2+50;bx<=b.x+b.w/2-50;bx+=100){
          const py=b.y+side*(b.h/2+4);if(!F.riverAt(bx,py))continue;
          const ph=(t*1.5+bx*.03)%1;
          c.globalAlpha=(1-ph)*.38;c.strokeStyle='#bceee6';c.lineWidth=1.3;
          c.beginPath();c.ellipse(bx,py,10+ph*22,4+ph*9,0,0,TAU);c.stroke();
        }
      }
      c.restore();
    }
    // 3. Inverted Reflections (scale(1, -0.6), globalAlpha = 0.25) with horizontal ripple Math.sin(t * 4 + y * 0.2)
    c.save();
    // Wooden bridges reflection
    for(const b of F.bridges){
      if(!inView(b))continue;
      const rx=F.riverX(b.y),w=175,wave=Math.sin(t*4+b.y*.2)*2.5;
      c.save();c.globalAlpha=.25;c.translate(rx+wave,b.y+b.h*.52);c.scale(1,-.6);
      c.fillStyle='#594938';c.fillRect(-w/2,0,w,36);
      for(let x=-w/2+4;x<w/2;x+=18){c.fillStyle='#8f7954';c.fillRect(x,4,12,28)}
      c.restore();
    }
    // Shoreline Trees & Bamboo reflections
    for(const o of g.world.props||[]){
      if(!inView(o)||o.destroyed||o.damageStage===3||!['tree','willow','bamboo','banyan','pine','lotus'].includes(o.type))continue;
      if(!isWaterSurface(g,o.x,o.y+22)&&!isWaterSurface(g,o.x+32,o.y+16)&&!isWaterSurface(g,o.x-32,o.y+16))continue;
      const wave=Math.sin(t*4+o.y*.2)*2.4;
      c.save();c.globalAlpha=.25;c.translate(Math.round(o.x+wave),Math.round(o.y+8));c.scale(1,-.6);
      if(o.type==='lotus'){
        oval(c,0,-12,10,8,'#e59db2');
      }else{
        c.fillStyle='#4b3f32';c.fillRect(-5,-42,10,42);
        oval(c,0,-52,o.type==='banyan'?48:24,18,o.type==='bamboo'?'#3b755b':'#2d5948');
      }
      c.restore();
    }
    // Actor reflections (Player, Clones, NPCs, Enemies)
    const reflectActors=[{x:p.x,y:p.y,col:g.hero?.cloth||'#459c83',head:g.hero?.color||'#f1bf69',r:15}];
    for(const cl of g.elementClones||[])if(cl.alive&&inView(cl))reflectActors.push({x:cl.x,y:cl.y,col:ELEMENT_LIGHT_COLORS[cl.element]||'#67e8f9',head:'#fff',r:14});
    for(const n of g.world.npcs||[])if(inView(n))reflectActors.push({x:n.x,y:n.y,col:'#826a5c',head:'#e2d5b5',r:14});
    for(const e of g.world.enemies||[])if(e.alive&&inView(e))reflectActors.push({x:e.x,y:e.y,col:e.color||'#6d7874',head:'#e8c895',r:e.r||15});
    for(const a of reflectActors){
      if(!isWaterSurface(g,a.x,a.y+14)&&!F?.onBridge(a.x,a.y,0))continue;
      const wave=Math.sin(t*4+a.y*.2)*2.2;
      c.save();c.globalAlpha=.25;c.translate(Math.round(a.x+wave),Math.round(a.y+6));c.scale(1,-.6);
      // Inverted silhouette with horizontal wave slice offset
      c.fillStyle=a.col;c.fillRect(-9,-32,18,24);
      c.fillStyle=a.head;c.beginPath();c.arc(Math.sin(t*5+a.y)*1.5,-38,7,0,TAU);c.fill();
      c.restore();
    }
    // Flying Projectiles reflection over water
    for(const b of g.projectiles||[]){
      if(!inView(b)||!isWaterSurface(g,b.x,b.y))continue;
      const wave=Math.sin(t*4+b.y*.2)*2;
      c.save();c.globalAlpha=.25;c.translate(b.x+wave,b.y+10);c.scale(1,-.6);
      oval(c,0,0,Math.max(3,(b.r||5)*1.3),Math.max(2,(b.r||5)*.9),b.color||'#ffe6a3');
      c.restore();
    }
    c.restore();
  };
  R.renderLighting=function(dt,menu){
    if(menu)return;
    const c=this.ctx,g=this.game,p=g.player,t=still()?0:g.time,z=this.zoom||1;
    const rawZone=D.zoneAt(p.x,p.y),zoneId=rawZone.paletteId||rawZone.id.replace(/^endless-/,'');
    if(!this.lightCanvas){
      this.lightCanvas=document.createElement('canvas');
      this.lightCanvas.width=640;this.lightCanvas.height=360;
      this.lightCtx=this.lightCanvas.getContext('2d');
    }
    const lc=this.lightCtx,lights=this._frameLights||this.collectLights();
    this.ambientColor=BIOME_AMBIENT[zoneId]||BIOME_AMBIENT.village;
    lc.save();
    lc.globalCompositeOperation='source-over';
    lc.clearRect(0,0,640,360);
    lc.fillStyle=this.ambientColor;
    lc.fillRect(0,0,640,360);
    // Punch out dynamic point lights using destination-out
    lc.globalCompositeOperation='destination-out';
    for(const L of lights){
      const sx=(L.x-this.camera.x)*z*.5,sy=(L.y-this.camera.y)*z*.5,sr=Math.max(2,L.r*z*.5);
      if(sx+sr<0||sx-sr>640||sy+sr<0||sy-sr>360)continue;
      const grad=lc.createRadialGradient(sx,sy,0,sx,sy,sr);
      grad.addColorStop(0,`rgba(0,0,0,${Math.min(1,L.intensity||.9)})`);
      grad.addColorStop(.55,`rgba(0,0,0,${Math.min(1,(L.intensity||.9)*.52)})`);
      grad.addColorStop(1,'rgba(0,0,0,0)');
      lc.fillStyle=grad;
      lc.beginPath();lc.arc(sx,sy,sr,0,TAU);lc.fill();
    }
    lc.restore();
    // Composite 640x360 offscreen lightCanvas onto 1280x720 main canvas
    c.save();
    c.imageSmoothingEnabled=false;
    c.drawImage(this.lightCanvas,0,0,640,360,0,0,1280,720);
    // Additive colored bloom pass ('lighter') + Forest God Rays
    c.globalCompositeOperation='lighter';
    if(zoneId==='forest'&&!still()){
      for(let i=0;i<4;i++){
        const rx=140+i*290+Math.sin(t*.35+i)*36;
        c.globalAlpha=.065+Math.sin(t*.7+i)*.018;
        poly(c,[[rx-90,0],[rx+15,0],[rx+290,720],[rx+115,720]],i%2?'#bef264':'#fde047');
      }
    }
    for(const L of lights){
      const sx=(L.x-this.camera.x)*z,sy=(L.y-this.camera.y)*z,sr=Math.max(4,L.r*z*.82);
      if(sx+sr<0||sx-sr>1280||sy+sr<0||sy-sr>720)continue;
      c.globalAlpha=(L.isPlayer?.14:.11)*(L.intensity||.85);
      const grad=c.createRadialGradient(sx,sy,0,sx,sy,sr);
      grad.addColorStop(0,L.color);
      grad.addColorStop(1,'transparent');
      c.fillStyle=grad;
      c.fillRect(sx-sr,sy-sr,sr*2,sr*2);
    }
    c.restore();
  };
  R.renderBiomeWeather=function(dt,menu){
    if(menu)return;
    const c=this.ctx,g=this.game,p=g.player,t=still()?0:g.time,z=this.zoom||1;
    const rawZone=D.zoneAt(p.x,p.y),zone=rawZone.paletteId||rawZone.id.replace(/^endless-/,'');
    const count=still()?8:low()?20:38;
    c.save();
    if(zone==='forest'){
      // Rung Truc: Swaying green bamboo leaves + light diagonal drizzle
      for(let i=0;i<count;i++){
        const x=(i*149+t*(32+(i%3)*12)+Math.sin(t*1.8+i)*28)%1280;
        const y=(i*83+t*(54+(i%4)*14))%720;
        if(i%3===0){
          // Drizzling rain streak
          c.globalAlpha=.18;c.strokeStyle='#bae6fd';c.lineWidth=1;
          c.beginPath();c.moveTo(x,y);c.lineTo(x-7,y+16);c.stroke();
        }else{
          // Tumbling green bamboo leaf
          c.save();c.translate(x,y);c.rotate(Math.sin(t*2.4+i)*.8+.4);
          c.globalAlpha=.55;poly(c,[[-5,0],[0,-2.2],[6,0],[0,2.2]],i%2?'#4ade80':'#86efac');
          c.restore();
        }
      }
    }else if(zone==='lotus'){
      // Dam Sen: Low-lying ground mist that parts when player runs through + long-tailed glowing fireflies
      const px=(p.x-this.camera.x)*z,py=(p.y-this.camera.y)*z;
      for(let i=0;i<(low()?10:18);i++){
        let mx=((i*193+t*11)%1440)-80,my=110+(i*67)%560;
        const dx=mx-px,dy=my-py,dist=Math.hypot(dx,dy);
        // Mist parts around player
        if(dist<165&&dist>1){
          const push=(1-dist/165)*(p.dashTime>0?95:58);
          mx+=(dx/dist)*push;my+=(dy/dist)*push*.65;
        }
        c.globalAlpha=.075*(dist<140?.45+dist/260:1);
        oval(c,mx,my,115+(i%3)*35,26+(i%2)*10,'#cbd5e1');
      }
      // Phosphorescent long-tailed fireflies
      for(let i=0;i<Math.min(24,count);i++){
        const fx=(i*173+Math.sin(t*1.3+i*2)*52+t*14)%1280;
        const fy=(i*97+Math.cos(t*1.1+i)*38)%720;
        const vx=Math.cos(t*1.3+i*2)*16+4,vy=-Math.sin(t*1.1+i)*12;
        const pulse=.45+.45*Math.sin(t*4.5+i);
        c.globalAlpha=pulse*.55;c.strokeStyle=i%3===0?'#5eead4':'#bef264';c.lineWidth=2;
        c.beginPath();c.moveTo(fx,fy);c.lineTo(fx-vx*1.2,fy-vy*1.2);c.stroke();
        c.globalAlpha=pulse;c.fillStyle='#fef08a';c.fillRect(fx-1.5,fy-1.5,3,3);
      }
    }else if(zone==='ash'){
      // Doi Tro: Storm of glowing red embers rising from ground + drifting ash smoke
      for(let i=0;i<(low()?6:10);i++){
        const sx=((i*211+t*18)%1400)-60,sy=120+(i*89)%540;
        c.globalAlpha=.06;oval(c,sx,sy,130,36,'#573a32');
      }
      for(let i=0;i<count;i++){
        const x=(i*137+Math.sin(t*2.5+i)*32+t*18)%1280;
        const y=(720-(i*79+t*(68+(i%4)*22))%720);
        c.globalAlpha=.45+.4*Math.sin(t*6+i);
        c.fillStyle=i%3===0?'#fef08a':i%2?'#fb923c':'#ef4444';
        c.fillRect(x,y,i%3===0?3:2,i%2?4:2);
      }
    }else if(zone==='waterfall'){
      // Thac Ngoc: Cool water mist + sparkling crystal motes
      for(let i=0;i<(low()?7:12);i++){
        const mx=((i*181+t*22)%1400)-60,my=90+(i*73)%560;
        c.globalAlpha=.065;oval(c,mx,my,110,28,'#ccfbf1');
      }
      for(let i=0;i<count;i++){
        const x=(i*143+Math.sin(t*1.4+i)*24)%1280,y=(i*89+t*16)%720;
        const twinkle=Math.max(0,Math.sin(t*4+i*1.7));
        c.globalAlpha=.2+twinkle*.65;
        c.fillStyle=i%2?'#ecfeff':'#5eead4';
        c.fillRect(x-1,y-4,2,8);c.fillRect(x-4,y-1,8,2);
      }
    }else if(zone==='ruins'){
      // Phe Tich Thien Co: Cyan-purple pixel data motes floating slowly upward
      c.font='bold 10px Consolas, monospace';
      for(let i=0;i<count;i++){
        const x=(i*131+Math.sin(t*.8+i)*14)%1280;
        const y=(720-(i*71+t*(26+(i%3)*9))%720);
        c.globalAlpha=.28+.35*Math.sin(t*3+i);
        c.fillStyle=i%2?'#22d3ee':'#c084fc';
        if(i%4===0)c.fillText(i%8===0?'01':'10',x,y);
        else{c.fillRect(x,y,3,3);c.fillRect(x+1,y+4,1,4)}
      }
    }else{
      for(let i=0;i<count;i++){
        const x=(i*137+Math.sin(t*.4+i)*24)%1280,y=(i*79-t*10+72000)%720;
        c.globalAlpha=.18+Math.sin(t*2+i)*.1;
        c.fillStyle=zone==='ancient'?'#d8b4fe':'#fef08a';
        c.fillRect(x,y,2,2);
      }
    }
    c.restore();
  };
  R.renderBossCutIn=function(dt,menu){
    const g=this.game,cut=g?.bossCutIn;if(!cut||menu||cut.timer<=0)return;
    const c=this.ctx,elapsed=cut.maxTimer-cut.timer,total=cut.maxTimer||2.4;
    const slideIn=Math.min(1,elapsed/.22),slideOut=cut.timer<.28?cut.timer/.28:1,vis=Math.min(slideIn,slideOut);
    const offsetX=(1-slideIn)*420-(1-slideOut)*420;
    c.save();
    c.globalAlpha=Math.max(0,Math.min(1,vis));
    c.translate(640+offsetX,132);
    c.rotate(-.045);
    // Outer glowing slash banner
    poly(c,[[-690,-52],[690,-52],[660,52],[-660,52]],'#090612ee');
    // Roiling fire/mist background waves inside banner
    c.save();
    c.beginPath();c.moveTo(-680,-48);c.lineTo(680,-48);c.lineTo(652,48);c.lineTo(-652,48);c.closePath();c.clip();
    for(let i=0;i<14;i++){
      const wx=-620+((i*110+g.time*260)%1340),wy=-32+(i%5)*16;
      c.globalAlpha=.16+(i%3)*.06;
      oval(c,wx,wy,95+(i%4)*25,18+(i%2)*8,i%2?cut.color:cut.accent);
    }
    // Speed lines
    c.strokeStyle=cut.accent;c.lineWidth=1.5;
    for(let i=0;i<10;i++){
      const lx=-650+((i*160+g.time*540)%1300),ly=-40+i*9;
      c.globalAlpha=.28;c.beginPath();c.moveTo(lx,ly);c.lineTo(lx+110,ly);c.stroke();
    }
    // Boss Pixel Art Portrait in center-left of banner (clear of left HUD cards)
    const meta=root.DTActorsPixelAtlas,clip=meta?.clips?.[cut.type+'/idle']||meta?.clips?.['boss/idle'],f=clip?.cells?.[0];
    const actorsImg=root.DTWorldPixel?.actors;
    c.globalAlpha=1;
    poly(c,[[-288,0],[-236,-48],[-184,0],[-236,48]],'#160d24');
    oval(c,-236,2,46,42,cut.color+'66');
    if(f&&actorsImg?.complete&&actorsImg.naturalWidth>0){
      c.save();
      c.beginPath();c.moveTo(-286,0);c.lineTo(-236,-46);c.lineTo(-186,0);c.lineTo(-236,46);c.closePath();c.clip();
      c.imageSmoothingEnabled=false;
      const sx=f.x+Math.floor(f.w*.12),sy=f.y+Math.floor(f.h*.10),sw=Math.floor(f.w*.76),sh=Math.floor(f.h*.76);
      c.drawImage(actorsImg,sx,sy,sw,sh,-286,-48,100,96);
      c.restore();
    }else{
      poly(c,[[-272,42],[-258,-34],[-236,-46],[-214,-34],[-200,42]],cut.color);
      c.fillStyle='#fff3c4';c.fillRect(-250,-14,10,6);c.fillRect(-228,-14,10,6);
    }
    c.strokeStyle=cut.accent;c.lineWidth=2.5;
    c.beginPath();c.moveTo(-288,0);c.lineTo(-236,-48);c.lineTo(-184,0);c.lineTo(-236,48);c.closePath();c.stroke();
    c.restore();
    // Glowing top & bottom borders
    c.strokeStyle=cut.color;c.lineWidth=3.5;
    c.beginPath();c.moveTo(-685,-50);c.lineTo(685,-50);c.moveTo(-655,50);c.lineTo(655,50);c.stroke();
    c.strokeStyle=cut.accent;c.lineWidth=1.5;
    c.beginPath();c.moveTo(-675,-44);c.lineTo(675,-44);c.moveTo(-645,44);c.lineTo(645,44);c.stroke();
    // Text titles
    c.textAlign='left';
    c.font='700 11px "DenTinh Sans", "Segoe UI", sans-serif';
    c.fillStyle=cut.accent;
    c.fillText('✦ CẢNH BÁO BOSS THỨC TỈNH ✦',-162,-22);
    c.font='800 27px "DenTinh Sans", "Segoe UI", sans-serif';
    c.fillStyle='#12081c';
    c.fillText(cut.fullTitle,-160,14);
    c.fillStyle='#ffffff';
    c.fillText(cut.fullTitle,-162,12);
    c.font='600 12px "DenTinh Sans", "Segoe UI", sans-serif';
    c.fillStyle=cut.color;
    c.fillText(cut.subtitle,-162,34);
    c.restore();
  };
  const drawBefore=R.draw;
  R.draw=function(dt,menu){
    this.frameDt=dt;this._drawingTopEffects=false;drawBefore.call(this,dt,menu);if(menu)return;
    const c=this.ctx,g=this.game,p=g.player,t=still()?0:g.time;
    c.save();c.scale(this.zoom,this.zoom);c.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));
    if(p.firewall>0){c.save();c.translate(p.x,p.y);c.strokeStyle='#ffb1ed';c.lineWidth=1.5;for(let i=0;i<12;i++){const a=i/12*TAU+t*.12,x=Math.cos(a)*152,y=Math.sin(a)*152;c.globalAlpha=.28+.22*Math.sin(t*3+i);c.beginPath();for(let j=0;j<=6;j++){const b=j/6*TAU,xx=x+Math.cos(b)*17,yy=y+Math.sin(b)*17;j?c.lineTo(xx,yy):c.moveTo(xx,yy)}c.stroke()}c.restore()}
    c.restore();
    this.renderLighting?.(dt,menu);
    this.renderBiomeWeather?.(dt,menu);
    this.renderBossCutIn?.(dt,menu);
    c.save();
    c.globalAlpha=1;const shade=c.createRadialGradient(640,330,180,640,360,760);shade.addColorStop(0,'#071d2800');shade.addColorStop(1,'#071d285e');c.fillStyle=shade;c.fillRect(0,0,1280,720);
    if(p.overclock>0&&!still()){c.strokeStyle='#76ffe82e';c.lineWidth=10;c.strokeRect(8,8,1264,704)}c.restore();
  };
  root.DTScenery={Terrain,palettes,sprites,environment,BIOME_AMBIENT,heroLanternColor};
  root.DTLighting={BIOME_AMBIENT,heroLanternColor};
})(globalThis);
