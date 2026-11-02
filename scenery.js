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
  const environment=new Image();environment.decoding='async';environment.src='assets/environment-v03.png';
  const actors=new Image();actors.decoding='async';actors.src='assets/actors-v03.png';
  const actorFrames={slime:[80,130,282,265,43,41],wisp:[535,45,190,340,28,50],boar:[865,77,365,327,67,60],archer:[83,478,297,322,45,49],shade:[492,493,273,309,43,49],boss:[804,414,450,430,170,164],elder:[83,886,215,311,43,62],smith:[490,859,273,343,50,64],fox:[901,934,296,271,30,27]};
  // Source rectangles follow the transparent atlas, with individual base anchors.
  const sprites={
    tree:[0,0,334,326,134,131],willow:[334,0,325,326,140,140],bamboo:[660,0,289,328,90,102],rock:[949,0,305,328,60,65],
    pillar:[24,328,289,284,56,60],crystal:[338,329,330,279,58,49],lanternPost:[698,328,199,282,48,68],fern:[945,330,309,280,47,43],
    house:[0,612,329,283,220,186],temple:[334,607,375,290,280,217],ruinGate:[709,608,298,290,238,232],windmill:[1008,604,246,308,150,188],
    waterfall:[0,893,341,361,286,303],pagoda:[344,893,269,361,200,268],banyan:[0,0,334,326,336,328],flower:[1017,989,237,265,30,34],pine:[0,0,334,326,112,143]
  };
  function sprite(c,type,x,y,width,height){const s=sprites[type];if(!s||!environment.complete||!environment.naturalWidth)return false;const w=width||s[4],h=height||s[5];c.drawImage(environment,s[0],s[1],s[2],s[3],Math.round(x-w/2),Math.round(y-h+6),w,h);return true}
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
      const key=cx+','+cy;if(this.chunks.has(key)){const found=this.chunks.get(key);this.chunks.delete(key);this.chunks.set(key,found);return found}
      const size=this.size,out=document.createElement('canvas');out.width=out.height=size+2;
      const c=out.getContext('2d',{alpha:false}),ox=cx*size,oy=cy*size,seed=this.world.seed;
      c.translate(-ox+1,-oy+1);
      for(let y=oy-32;y<oy+size+32;y+=32)for(let x=ox-32;x<ox+size+32;x+=32){
        const z=D.zoneAt(x+16,y+16),pal=palettes[z.id],n=noise(x/32,y/32,seed),field=(Math.sin(x*.004)+Math.cos(y*.006)+Math.sin((x+y)*.0025))/3;
        c.fillStyle=pal[field>.4?3:field<-.35?0:n>.7?2:1];c.fillRect(x,y,32,32);
        for(let i=0;i<5;i++){
          const k=noise(x+i*31,y-i*17,seed),px=x+k*31,py=y+noise(x-i*29,y+i*13,seed)*31;
          c.fillStyle=i%3===0?pal[4]+'55':pal[0]+'77';c.fillRect(px,py,1+i%2,3+k*6);
          if(i%2===0)c.fillRect(px+2,py+3,3,1);
          if(z.id==='valley'&&k>.86){c.fillStyle=k>.94?'#f4ddb7':'#d9dba3';c.fillRect(px-1,py-3,3,3)}
          if(z.id==='ruins'&&k>.82){c.fillStyle='#91a3b530';c.fillRect(px,py,6,2)}
        }
      }
      // Broad banks and continuous water cross chunk edges without texture seams.
      if(ox<4900&&ox+size>4380&&oy<2110){
        c.lineJoin=c.lineCap='round';for(const [width,color]of[[274,'#263f4566'],[245,'#7a9c86'],[221,'#324f59'],[205,'#204b62'],[172,'#2d6d82'],[94,'#3b8390']]){riverPath(c);c.strokeStyle=color;c.lineWidth=width;c.stroke()}
        for(let y=300;y<1930;y+=37){const x=F.riverX(y);c.fillStyle='#91cec730';c.fillRect(x-58,y,75+Math.sin(y)*20,2)}
      }
      if(ox<3680&&ox+size>2520&&oy<2730&&oy+size>1510){
        const rng=D.rand(seed+122);for(let i=0;i<14;i++){const x=2650+rng()*850,y=1530+rng()*1060;if(D.nearPath(x,y,115)||Math.hypot(x-3100,y-2090)<210)continue;oval(c,x+3,y+5,69,31,'#1c3d4d66');oval(c,x,y,63,26,'#254e60');oval(c,x-3,y-5,52,18,'#326779');c.strokeStyle='#8fbbaa55';c.lineWidth=2;c.beginPath();c.ellipse(x-2,y-6,42,13,0,0,Math.PI);c.stroke()}
      }
      c.lineJoin=c.lineCap='round';
      for(const route of this.world.paths){c.beginPath();route.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));for(const [width,color]of[[104,'#1a343a42'],[86,'#67775b'],[73,'#a08e67'],[55,'#b4a077']]){c.lineWidth=width;c.strokeStyle=color;c.stroke()}}
      for(let y=Math.floor((oy-18)/18)*18;y<oy+size+18;y+=18)for(let x=Math.floor((ox-22)/22)*22;x<ox+size+22;x+=22){if(!D.nearPath(x,y,31)||F.riverAt(x,y))continue;const n=noise(x,y,seed);c.fillStyle=n>.5?'#d0ba8b7a':'#776c5250';poly(c,[[x-7,y-3],[x+3,y-5],[x+8,y],[x+5,y+4],[x-6,y+4]],c.fillStyle);c.fillStyle='#dcd09d48';c.fillRect(x-6,y-3,9,1)}
      for(const b of this.world.beacons){if(Math.abs(b.x-ox)>size+240||Math.abs(b.y-oy)>size+240)continue;oval(c,b.x,b.y,140,111,'#20373e50');oval(c,b.x,b.y,124,98,b.zone==='ruins'?'#798689':'#8d9477');c.strokeStyle='#c3c2a1';c.lineWidth=4;c.beginPath();c.ellipse(b.x,b.y,112,87,0,0,TAU);c.stroke();for(let i=0;i<12;i++){const a=i/12*TAU;c.save();c.translate(b.x+Math.cos(a)*112,b.y+Math.sin(a)*87);c.rotate(a);c.fillStyle='#4b6262';c.fillRect(-4,-3,8,6);c.restore()}}
      oval(c,1830,610,218,173,'#253a3d');c.strokeStyle='#a7ac7a66';c.lineWidth=3;c.beginPath();c.ellipse(1830,610,193,155,0,0,TAU);c.stroke();
      c.fillStyle='#8b7657';for(let x=2950;x<3200;x+=25){c.fillRect(x,2044,22,91);c.fillStyle='#aa9470';c.fillRect(x+3,2044,2,91);c.fillStyle='#8b7657'}
      this.chunks.set(key,out);while(this.chunks.size>(low()?20:36))this.chunks.delete(this.chunks.keys().next().value);return out;
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
    // Reflections flow underneath the bridges; deck boards remain solid and legible.
    if(Math.abs(p.x-4650)<1100&&p.y<2450){c.save();c.lineWidth=1.5;c.strokeStyle='#c2f1e377';for(let i=0;i<55;i++){const y=290+(i*37+t*30)%1640,x=F.riverX(y)-75+(i*47)%140;if(!inView({x,y}))continue;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+10,y+3,x+26,y);c.stroke()}c.restore()}
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
    if(!sprite(c,'lanternPost',b.x,b.y,76,108)){c.fillStyle='#435c64';c.fillRect(b.x-12,b.y-69,24,61);c.fillStyle='#a2ab97';c.fillRect(b.x-30,b.y-16,60,8)}
    glow(c,b.x+10,b.y-63,32,col,st.claimed?.4:.1);if(!st.claimed){c.save();c.globalAlpha=.65;c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.arc(b.x,b.y-45,12,0,TAU);c.stroke();c.restore()}
    c.font='bold 10px Segoe UI';c.textAlign='center';c.fillStyle=st.claimed?'#e5ead2':'#d0c8ae';c.fillText(b.name,b.x,b.y+32);
  };
  R.drawProjectile=function(b){
    const c=this.ctx;c.save();c.translate(b.x,b.y-18);c.rotate(b.angle);c.fillStyle=b.color;
    if(!b.friendly){c.strokeStyle='#242b3c';c.lineWidth=2;oval(c,0,0,b.r+1,b.r+1,'#252e40');oval(c,0,0,b.r,b.r,b.color);oval(c,1,-1,Math.max(1,b.r*.42),Math.max(1,b.r*.42),'#fff0d5')}
    else if(b.kind==='arrow'){poly(c,[[-15,-2],[9,-2],[9,-5],[20,0],[9,5],[9,2],[-15,2]],b.color);c.fillStyle='#f3ffdd';c.fillRect(-6,-1,16,2)}
    else if(b.kind==='code'){c.globalAlpha=.24;c.fillRect(-15,-7,32,14);c.globalAlpha=1;c.fillRect(-7,-2,20,4);c.fillStyle='#e5fff4';c.fillRect(8,-2,5,4)}
    else{poly(c,[[-11,0],[0,-b.r],[b.r+5,0],[0,b.r]],b.color);c.fillStyle='#fff2c9';c.fillRect(-1,-2,5,4)}c.restore();
  };
  const propBefore=R.drawProp;
  function lantern(c,x,y,t,color='#ffd598'){c.fillStyle='#433d3a';c.fillRect(x-1,y-30,2,18);c.fillStyle='#b8864f';c.fillRect(x-8,y-14,16,20);c.fillStyle=color;c.fillRect(x-5,y-12,10,16);c.fillStyle='#ffeab8';c.fillRect(x-1,y-10,3,12);c.fillStyle='#6e4d36';c.fillRect(x-9,y-16,18,3);c.fillRect(x-8,y+5,16,3);c.fillRect(x,y+8,2,7);glow(c,x,y-3,48+Math.sin(t*2+x)*3,color,.22)}
  R.drawProp=function(o){
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
      const sway=still()?0:Math.sin(t*1.5+x)*3;c.strokeStyle=o.type==='reed'?'#b5bd7c':'#7eb793';c.lineWidth=2;for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(i*3,0);c.quadraticCurveTo(i*7+sway,-15,i*10+sway,-27-Math.abs(i)*2);c.stroke();if(o.type==='fern')for(let j=1;j<4;j++)poly(c,[[i*2+j*2,-j*6],[i*7-9+sway,-j*6-5],[i*4+j,-j*6+3]],'#569178');else{c.fillStyle='#e2d1a1';c.fillRect(i*10+sway-2,-31-Math.abs(i)*2,4,10)}}
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
  function actor(c,id,x,y,options={}){
    const f=actorFrames[id];if(!f||!actors.complete||!actors.naturalWidth)return false;
    const scale=options.scale||1,w=f[4]*scale,h=f[5]*scale,phase=options.phase||0,moving=!!options.moving&&!still(),bob=still()?0:id==='wisp'?Math.sin(phase)*3:moving?-Math.abs(Math.sin(phase))*1.5:Math.sin(phase)*.45;
    c.save();c.translate(Math.round(x),Math.round(y+bob));c.scale(options.face||1,1);
    if(id==='slime'&&!still())c.scale(1+Math.sin(phase)*.045,1-Math.sin(phase)*.045);
    if(options.flash&&!low())c.filter='brightness(1.8)';
    if(moving&&['archer','shade','boar'].includes(id)){
      const cut=Math.floor(f[3]*.77),legHeight=f[3]-cut,topHeight=h*.77;
      c.drawImage(actors,f[0],f[1],f[2],cut,-w/2,-h+4,w,topHeight);
      for(const side of[0,1])c.drawImage(actors,f[0]+f[2]*side/2,f[1]+cut,f[2]/2,legHeight,-w/2+w*side/2,-h+4+topHeight+Math.sin(phase+(side?Math.PI:0))*1.5,w/2,h-topHeight);
    }else c.drawImage(actors,f[0],f[1],f[2],f[3],-w/2,-h+4,w,h);
    c.restore();return true;
  }
  const enemyBefore=R.drawEnemy,npcBefore=R.drawNpc,companionBefore=R.drawCompanion;
  R.drawEnemy=function(e){
    if(!actorFrames[e.type]||!actors.complete||!actors.naturalWidth){enemyBefore.call(this,e);return}
    const c=this.ctx,g=this.game,phase=e.visualMoving?e.walkPhase||0:g.time*2+e.x,scale=e.miniBoss?1.45:1,face=['slime','wisp','boss'].includes(e.type)?1:(g.player.x>e.x?1:-1)*(e.type==='boar'?-1:1),height=actorFrames[e.type][5]*scale;
    actor(c,e.type,e.x,e.y,{scale,phase,moving:e.visualMoving,face,flash:e.hit>0});
    if(e.burn>0&&!still()){for(let i=0;i<3;i++){const yy=e.y-12-(g.time*28+i*11)%Math.min(height,38);c.fillStyle=i%2?'#ffd18b':'#fa925e';poly(c,[[e.x-11+i*9,yy+5],[e.x-9+i*9,yy-7],[e.x-5+i*9,yy+5]],c.fillStyle)}}
    if(e.phase===1&&e.type==='boar'){c.strokeStyle='#ffc68e';c.lineWidth=2;c.beginPath();c.ellipse(e.x,e.y,e.r+9,9,0,0,TAU);c.stroke()}
    if(e.type!=='boss'&&e.hp<e.maxHp){c.fillStyle='#182b37';c.fillRect(e.x-21,e.y-height-10,42,4);c.fillStyle=e.elite?'#edca89':'#e29c93';c.fillRect(e.x-21,e.y-height-10,42*Math.max(0,e.hp/e.maxHp),4)}
    if(e.miniBoss){c.font='bold 11px Segoe UI';c.textAlign='center';c.fillStyle='#ffe1a8';c.fillText('TRÚC VỆ',e.x,e.y-height-17)}
  };
  R.drawNpc=function(n){
    if(n.type==='well'||!actorFrames[n.type]||!actors.complete||!actors.naturalWidth){npcBefore.call(this,n);return}
    actor(this.ctx,n.type,n.x,n.y,{phase:this.game.time*2+n.x});this.ctx.font='10px Segoe UI';this.ctx.textAlign='center';this.ctx.fillStyle='#efe3c7';this.ctx.fillText(n.name,n.x,n.y+18);
  };
  R.drawCompanion=function(){
    if(!actors.complete||!actors.naturalWidth){companionBefore.call(this);return}
    const c=this.ctx,g=this.game,p=g.player,speed=Math.hypot(p.velocityX,p.velocityY),target={x:p.x-(speed>4?p.velocityX/speed*37:38),y:p.y-(speed>4?p.velocityY/speed*37:0)+24};
    if(!this.fox||Math.hypot(this.fox.x-target.x,this.fox.y-target.y)>600)this.fox={...target,stride:0};
    const before=this.fox.x,blend=1-Math.exp(-7*(this.frameDt||.016));this.fox.x+=(target.x-this.fox.x)*blend;this.fox.y+=(target.y-this.fox.y)*blend;this.fox.stride+=Math.abs(this.fox.x-before)*.2;
    actor(c,'fox',this.fox.x,this.fox.y,{phase:speed>4?this.fox.stride:g.time*2,face:p.velocityX<0?-1:1});
    if(g.domTarget){c.save();c.globalAlpha=.5;c.strokeStyle='#f4dc9b';c.lineWidth=1;c.setLineDash([3,8]);c.beginPath();c.moveTo(this.fox.x,this.fox.y-10);c.lineTo(g.domTarget.x,g.domTarget.y);c.stroke();c.restore()}
  };
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
      c.rotate(e.angle||0);c.globalCompositeOperation='lighter';c.lineWidth=2;for(let i=0;i<5;i++){const a=i/5*TAU,r=6+f*25;c.beginPath();c.moveTo(Math.cos(a)*r*.35,Math.sin(a)*r*.35);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);c.stroke()}c.fillStyle='#fff4d3';c.fillRect(-2,-2,4,4);
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
  const drawBefore=R.draw;
  R.draw=function(dt,menu){
    this.frameDt=dt;this._drawingTopEffects=false;drawBefore.call(this,dt,menu);if(menu)return;
    const c=this.ctx,g=this.game,p=g.player,t=still()?0:g.time,zone=D.zoneAt(p.x,p.y).id;
    c.save();c.scale(this.zoom,this.zoom);c.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));
    if(p.firewall>0){c.save();c.translate(p.x,p.y);c.strokeStyle='#ffb1ed';c.lineWidth=1.5;for(let i=0;i<12;i++){const a=i/12*TAU+t*.12,x=Math.cos(a)*152,y=Math.sin(a)*152;c.globalAlpha=.28+.22*Math.sin(t*3+i);c.beginPath();for(let j=0;j<=6;j++){const b=j/6*TAU,xx=x+Math.cos(b)*17,yy=y+Math.sin(b)*17;j?c.lineTo(xx,yy):c.moveTo(xx,yy)}c.stroke()}c.restore()}
    c.restore();
    const count=still()?8:low()?20:42;c.save();
    for(let i=0;i<count;i++){
      const x=(i*137+Math.sin(t*.3+i)*24)%1280,y=(i*79-t*(zone==='ash'?28:zone==='waterfall'?-22:8)+Math.sin(i*12)*100+72000)%720;
      c.globalAlpha=zone==='ash'?.3:.13+Math.sin(t+i)*.09;c.fillStyle=zone==='ruins'?'#a9dbf4':zone==='waterfall'?'#bfeee9':zone==='ash'?'#ffc28a':'#f0e6b2';
      if(zone==='waterfall')c.fillRect(x,y,1,4);else if(zone==='valley'){c.beginPath();c.arc(x,y,1.4,0,TAU);c.fill()}else c.fillRect(x,y,i%3?1.5:2,2);
    }
    c.globalAlpha=1;const shade=c.createRadialGradient(640,330,180,640,360,760);shade.addColorStop(0,'#071d2800');shade.addColorStop(1,'#071d285e');c.fillStyle=shade;c.fillRect(0,0,1280,720);
    if(p.overclock>0&&!still()){c.strokeStyle='#76ffe82e';c.lineWidth=10;c.strokeRect(8,8,1264,704)}c.restore();
  };
  root.DTScenery={Terrain,palettes,sprites,environment};
})(globalThis);
