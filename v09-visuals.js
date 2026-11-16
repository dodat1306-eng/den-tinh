(function(root){
  'use strict';
  const R=root.DTRenderer.prototype,V=root.DTV09Content,TAU=Math.PI*2,atlas=new Image(),actors=new Image();atlas.src='assets/relics-pixel-v09.png';actors.src='assets/npcs-v091.png';
  function icon(c,id,x,y,size=48){const r=V.relics.find(r=>r.id===id);if(atlas.complete&&atlas.naturalWidth&&r){c.imageSmoothingEnabled=false;c.drawImage(atlas,r.atlas%8*32,Math.floor(r.atlas/8)*32,32,32,Math.round(x-size/2),Math.round(y-size),size,size)}}
  const ink='#12091a',tones=['#e5817c','#82c6e8','#f4d778','#8cd6a4'];
  function ring(c,x,y,r,color,dash=false){c.strokeStyle=color;c.lineWidth=2;c.setLineDash(dash?[6,9]:[]);c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();c.setLineDash([])}
  function trialGround(r,p){
    const c=r.ctx,g=r.game,t=root.DTSettings?.reducedMotion?0:g.time;c.save();
    if(p.puzzleType==='blood_sacrifice'||p.puzzleType==='dodge_matrix'||p.puzzleType==='soul_harvest'&&!['split','pierce'].includes(p.relic)){
      const radius=p.puzzleType==='blood_sacrifice'?240:p.puzzleType==='dodge_matrix'?260:165,color=p.puzzleType==='blood_sacrifice'?'#d26f7f':p.puzzleType==='dodge_matrix'?'#c5a0e3':'#8acaa2';
      ring(c,p.x,p.y,radius,color+(p.status==='active'?'bb':'45'),true);
      if(p.status==='active'){c.fillStyle=color+'0c';c.beginPath();c.arc(p.x,p.y,radius,0,TAU);c.fill()}
    }
    if(p.puzzleType==='pylons')for(const n of p.nodes){c.strokeStyle=n.active?'#a8edf3':'#586d77';c.lineWidth=3;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(n.x,n.y);c.stroke()}
    if(p.puzzleType==='mirror_beam'){
      const source={x:p.x-130,y:p.y};c.fillStyle='#fff1b1';c.fillRect(source.x-7,source.y-12,14,14);c.lineWidth=3;c.strokeStyle='#a5e5ef';c.beginPath();c.moveTo(source.x,source.y);let linked=true;
      for(const n of p.nodes){c.lineTo(n.x,n.y);if(n.dir!==n.targetDir){const a=-Math.PI/2+n.dir*Math.PI/2;c.lineTo(n.x+Math.cos(a)*90,n.y+Math.sin(a)*90);linked=false;break}}
      if(linked){c.lineTo(p.nodes[0].x,p.nodes[0].y);c.lineTo(p.x,p.y)}c.stroke();
    }
    if(p.puzzleType==='rhythm_chimes'&&p.status==='playback'){const n=p.nodes[p.sequence[Math.min(3,Math.floor(p.elapsed/.6))]];ring(c,n.x,n.y,29+Math.sin(t*5)*3,tones[n.index]);c.fillStyle=tones[n.index];c.fillRect(p.x-12,p.y-44,24,24)}
    c.restore();
  }
  function trialNode(r,p,n){
    const c=r.ctx,g=r.game,t=root.DTSettings?.reducedMotion?0:g.time,x=n.x,y=n.y;if(['stone','crystal'].includes(n.kind)&&n.hp<=0)return;
    c.save();c.lineWidth=2;c.strokeStyle=ink;c.fillStyle='#10222a90';c.beginPath();c.ellipse(x,y+4,22,9,0,0,TAU);c.fill();
    if(n.kind==='mirror'){
      c.fillStyle='#6b786f';c.fillRect(x-9,y-15,18,20);c.save();c.translate(x,y-24);c.strokeStyle='#f3d38b80';c.setLineDash([3,4]);c.beginPath();c.moveTo(0,0);c.lineTo(Math.sin(n.targetDir*Math.PI/2)*31,-Math.cos(n.targetDir*Math.PI/2)*31);c.stroke();c.setLineDash([]);c.rotate(n.dir*Math.PI/2);c.fillStyle=n.dir===n.targetDir?'#cdfaff':'#719eac';c.fillRect(-15,-5,30,10);c.strokeRect(-15,-5,30,10);c.fillStyle='#fff7ce';c.fillRect(-11,-4,18,2);c.beginPath();c.moveTo(0,-8);c.lineTo(0,-20);c.stroke();c.restore();
    }else if(n.kind==='crystal'){
      c.fillStyle='#8fd1df';c.beginPath();c.moveTo(x,y-49);c.lineTo(x+18,y-25);c.lineTo(x+10,y);c.lineTo(x-13,y);c.lineTo(x-19,y-26);c.closePath();c.fill();c.stroke();c.strokeStyle='#dafaff';c.beginPath();c.moveTo(x,y-47);c.lineTo(x+3,y-15);c.lineTo(x+10,y-2);c.stroke();
    }else if(n.kind==='stone'){
      c.fillStyle='#788a89';c.fillRect(x-17,y-40,34,42);c.strokeRect(x-17,y-40,34,42);c.fillStyle='#b6bea1';c.fillRect(x-13,y-36,25,5);c.fillStyle='#bbd7ba';c.fillRect(x-3,y-27,5,16);c.fillRect(x-8,y-21,15,3);
    }else if(n.kind==='drum'){
      c.fillStyle='#6c573f';c.fillRect(x-19,y-22,38,22);c.fillStyle=tones[n.index];c.beginPath();c.ellipse(x,y-23,21,13,0,0,TAU);c.fill();c.stroke();ring(c,x,y-23,8,'#4a3c3a');
    }else if(n.kind==='bell'){
      c.fillStyle='#65736b';c.fillRect(x-21,y-51,7,52);c.fillRect(x+14,y-51,7,52);c.fillRect(x-21,y-52,42,7);c.fillStyle=n.active?'#efcf82':'#9ba49a';c.beginPath();c.moveTo(x-9,y-38);c.lineTo(x+9,y-38);c.lineTo(x+14,y-13);c.lineTo(x-14,y-13);c.closePath();c.fill();c.stroke();c.fillRect(x-2,y-13,4,8);
    }else if(n.kind==='pylon'){
      c.fillStyle='#526777';c.fillRect(x-11,y-47,22,48);for(let i=0;i<3;i++){c.fillStyle=n.active?'#c0f6ed':'#8b9bad';c.fillRect(x-17,y-40+i*11,34,5)}c.fillStyle=n.active?'#fff3aa':'#788d9c';c.fillRect(x-5,y-58,10,12);
    }else{
      c.fillStyle='#737b70';c.fillRect(x-13,y-25,26,26);c.fillStyle='#a4a48a';c.fillRect(x-17,y-29,34,7);
      if(n.active){c.fillStyle='#e8bf6f';c.beginPath();c.moveTo(x-11,y-30);c.quadraticCurveTo(x-14,y-44,x+Math.sin(t*5)*4,y-59);c.quadraticCurveTo(x+17,y-38,x+10,y-30);c.fill();c.fillStyle='#a7efc1';c.fillRect(x-4,y-44,7,14)}
    }
    if(['crystal','stone'].includes(n.kind)&&n.hp<n.maxHp){c.fillStyle=ink;c.fillRect(x-20,y+11,40,5);c.fillStyle='#b0dbb3';c.fillRect(x-19,y+12,38*n.hp/n.maxHp,3)}
    if(n.flashUntil>g.time)ring(c,x,y-15,30,'#fff2c6');
    c.fillStyle='#f2e3bd';c.textAlign='center';c.font='bold 12px "DenTinh Sans"';c.fillText(n.kind==='bell'?['Bắc','Đông','Nam','Tây'][n.index]:n.kind==='drum'?['1 Đỏ','2 Lam','3 Vàng','4 Lục'][n.index]:n.kind==='torch'?['I','II','III','IV'][n.index]:'',x,y+23);c.restore();
  }
  function ritual(r,p){
    const c=r.ctx,x=p.x,y=p.y;c.save();c.fillStyle='#4c605d';c.strokeStyle=ink;c.lineWidth=3;c.beginPath();c.ellipse(x,y,37,19,0,0,TAU);c.fill();c.stroke();
    if(p.relic==='kimquy'){c.fillStyle='#7e9181';c.beginPath();c.ellipse(x,y-17,30,23,0,0,TAU);c.fill();c.stroke();for(let i=0;i<3;i++)c.strokeRect(x-19+i*13,y-30,12,20)}
    else if(p.relic==='mjolnir'){c.fillStyle='#7e8e98';c.fillRect(x-25,y-58,50,35);c.fillRect(x-14,y-81,28,23);c.fillStyle='#405463';c.fillRect(x-20,y-22,14,24);c.fillRect(x+6,y-22,14,24);c.fillStyle='#9bb8bb';c.fillRect(x-10,y-70,20,4)}
    else if(p.relic==='wukong'){c.fillStyle='#879381';for(const [dx,dy,radius]of [[0,-34,23],[-24,-35,10],[24,-35,10]]){c.beginPath();c.arc(x+dx,y+dy,radius,0,TAU);c.fill();c.stroke()}c.fillStyle='#b2aa7c';c.beginPath();c.arc(x,y-12,11,0,TAU);c.fill()}
    else{c.strokeStyle='#8f7054';for(let i=0;i<6;i++){c.beginPath();c.moveTo(x-30+i*5,y-13+i*3);c.lineTo(x+24-i*3,y-19+i*4);c.stroke()}c.fillStyle='#aa8770';c.beginPath();c.ellipse(x,y-23,12,19,.3,0,TAU);c.fill()}
    c.restore();
  }
  function trialLabel(r,p){
    if(Math.hypot(r.game.player.x-p.x,r.game.player.y-p.y)>350)return;const c=r.ctx;c.save();c.textAlign='center';c.font='bold 12px "DenTinh Sans"';c.fillStyle='#eee1b9';c.strokeStyle=ink;c.lineWidth=4;const text=(s,y)=>{c.strokeText(s,p.x,y);c.fillText(s,p.x,y)};text(p.name,p.y-103);c.font='13px "DenTinh Sans"';const words=r.game.trialHint(p).split(' ');let line='',row=0;for(const word of words){if(c.measureText(line+' '+word).width>320){text(line,p.y+49+row*19);line=word;row++}else line+=(line?' ':'')+word}if(line)text(line,p.y+49+row*19);c.restore();
  }
  function relic(renderer,o,drop=false){
    const c=renderer.ctx,g=renderer.game,t=root.DTSettings?.reducedMotion?0:g.time,x=o.x,y=o.y,locked=!drop&&!o.unlocked,bob=Math.sin(t*2.6+x)*3;
    c.save();c.strokeStyle=drop?'#ffe3a4':locked?'#ce8379':'#80c8b0';c.lineWidth=2;c.fillStyle='#17272a';c.beginPath();c.ellipse(x,y+4,31,13,0,0,TAU);c.fill();c.stroke();
    if(!drop){c.fillStyle='#424f4c';c.fillRect(x-24,y-13,48,17);c.fillStyle='#a9a88b';c.fillRect(x-22,y-18,44,7);c.fillStyle='#6f8170';c.fillRect(x-15,y-12,3,10);c.fillRect(x+12,y-12,3,10)}
    const beam=c.createLinearGradient(0,y-165,0,y);beam.addColorStop(0,'#ffe6aa00');beam.addColorStop(1,drop?'#ffe5a454':'#90e1be25');c.fillStyle=beam;c.fillRect(x-18,y-165,36,164);
    c.save();c.translate(x,y+2);c.scale(1,.42);c.rotate(t*.5);c.setLineDash([5,7]);c.beginPath();c.arc(0,0,34,0,TAU);c.stroke();c.setLineDash([]);for(let i=0;i<6;i++){const a=i*TAU/6;c.strokeRect(Math.cos(a)*30-2,Math.sin(a)*30-2,4,4)}c.restore();icon(c,o.relic,x,y-24+bob-(o.z||0),48);
    if(locked){c.strokeStyle='#bcb38b';c.lineWidth=3;c.beginPath();c.arc(x,y-28,30,0,TAU);c.stroke();c.fillStyle='#d8ce9e';c.fillRect(x-6,y-33,12,12);c.fillStyle=ink;c.fillRect(x-1,y-29,3,6)}
    c.restore();
  }
  R.rpgObjects=function(inView){const g=this.game,objects=[];for(const p of g.world.relicPedestals||[])if(!p.claimed&&inView(p))objects.push({y:p.y,draw:()=>relic(this,p)});for(const d of g.relicDrops||[])if(inView(d))objects.push({y:d.y,draw:()=>relic(this,d,true)});
    for(const p of [...g.world.relicPedestals,...g.world.bossAltars])if(!p.claimed){if(p.ritual&&p.status!=='summoned'&&inView(p))objects.push({y:p.y,draw:()=>ritual(this,p)});for(const n of p.nodes)if(inView(n))objects.push({y:n.y,draw:()=>trialNode(this,p,n)});if(inView(p))objects.push({y:Infinity,draw:()=>trialLabel(this,p)})}
    const step=g.questStep?.();for(const o of g.world.questObjects||[])if(o.hero===g.hero.id&&!o.collected&&(step?.target===o.id||step?.targets?.includes(o.id))&&inView(o))objects.push({y:o.y,draw:()=>{const c=this.ctx;c.save();c.fillStyle='#443f56';c.fillRect(o.x-12,o.y-27,24,29);c.fillStyle='#d8c699';c.fillRect(o.x-9,o.y-24,18,19);c.strokeStyle='#bc9eda';c.beginPath();c.ellipse(o.x,o.y+3,24,9,0,0,TAU);c.stroke();c.fillStyle='#47384e';c.fillRect(o.x-5,o.y-18,10,2);c.fillRect(o.x-5,o.y-12,7,2);c.fillStyle='#fff1b3';c.fillRect(o.x-2,o.y-38+Math.sin(g.time*3)*2,4,4);c.restore()}});
    for(const s of g.relicClones||[])if(inView(s))objects.push({y:s.y,draw:()=>{const c=this.ctx;c.save();c.globalAlpha=.8;root.DTArt.drawHero(c,{...s,facing:0},g.hero,g.time,.85);c.strokeStyle='#d9ae58';c.lineWidth=3;c.beginPath();c.moveTo(s.x+17,s.y-41);c.lineTo(s.x+17,s.y);c.stroke();c.restore()}});return objects;
  };
  const npc=R.drawNpc;R.drawNpc=function(n){const clip=root.DTNpcPixelAtlas?.clips[(n.type||n.id)+'/idle'];if(!clip||!actors.complete||!actors.naturalWidth)return npc.call(this,n);const frame=clip.cells[root.DTSettings?.reducedMotion?0:Math.floor(this.game.time*clip.fps)%clip.frames],unit=root.DTNpcPixelAtlas.unit||2,c=this.ctx;c.save();c.imageSmoothingEnabled=false;c.fillStyle='#08192365';c.beginPath();c.ellipse(n.x,n.y,21,7,0,0,TAU);c.fill();c.drawImage(actors,frame.x,frame.y,frame.w,frame.h,Math.round(n.x-frame.anchorX*unit),Math.round(n.y-frame.anchorY*unit),frame.w*unit,frame.h*unit);c.font='11px "DenTinh Sans"';c.textAlign='center';c.fillStyle='#f0dfb9';c.fillText(n.name,n.x,n.y+19);c.restore()};
  const prop=R.drawProp;R.drawProp=function(p){if(p.relicCleared)return;return prop.call(this,p)};
  const effect=R.drawEffect;R.drawEffect=function(e){if(e.type!=='rpg-level'&&e.type!=='rpg-soul')return effect.call(this,e);const c=this.ctx,alpha=e.life/e.maxLife;c.save();c.globalAlpha=alpha;if(e.type==='rpg-level'){const grad=c.createLinearGradient(0,e.y-220,0,e.y);grad.addColorStop(0,'#ffe8a000');grad.addColorStop(1,'#fff0bbcc');c.fillStyle=grad;c.fillRect(e.x-18,e.y-220,36,220);c.strokeStyle='#b8e4ce';c.lineWidth=3;c.beginPath();c.ellipse(e.x,e.y,60*(1-alpha)+20,16,0,0,TAU);c.stroke()}else{const f=1-alpha,x=e.x+(e.tx-e.x)*f,y=e.y+(e.ty-e.y)*f;c.fillStyle='#ffe4a6';c.fillRect(x-4,y-4,8,8)}c.restore()};
  const scenery=R.drawScenery;R.drawScenery=function(inView){scenery?.call(this,inView);const c=this.ctx,g=this.game;for(const p of [...g.world.relicPedestals,...g.world.bossAltars])if(!p.claimed&&inView(p))trialGround(this,p);if(g.domGuide){c.save();c.strokeStyle='#ffe1a0';c.lineWidth=2;c.setLineDash([3,9]);c.beginPath();c.moveTo(g.companion.x,g.companion.y);c.lineTo(g.domGuide.x,g.domGuide.y);c.stroke();c.restore()}};
  R.map=function(canvas,large=false){const c=canvas.getContext('2d'),g=this.game,p=g.player,w=canvas.width,h=canvas.height,span=large?8000:1700,scale=Math.min(w/span,h/(span*.64)),left=large?Math.max(-1200,p.x-span/2):p.x-span/2,top=p.y-h/scale/2;const point=(o,color,size=3)=>{const x=(o.x-left)*scale,y=(o.y-top)*scale;if(x<3||y<3||x>w-3||y>h-3)return;c.fillStyle=color;c.fillRect(Math.round(x-size/2),Math.round(y-size/2),size,size)};c.fillStyle='#101f2b';c.fillRect(0,0,w,h);if(this.ground.overview)c.drawImage(this.ground.overview,-left*scale,-top*scale,6400*scale,4480*scale);for(const n of g.world.npcs)if(n.id!=='well')point(n,'#8cc9d8',large?4:2);for(const o of g.world.relicPedestals||[])if(o.discovered&&!o.claimed)point(o,'#e9bf6f',large?5:3);for(const o of g.world.bossAltars||[])if(o.discovered&&o.status!=='defeated')point(o,'#d794ba',large?5:3);for(const o of g.relicDrops||[])point(o,'#ffe5aa',large?7:4);for(const e of g.world.enemies)if(e.alive&&(e.sagaBoss||e.v09Boss&&g.world.bossAltars.some(a=>a.relic===e.relic&&a.discovered)))point(e,'#e9948c',large?6:3);for(const s of g.world.shrines)point(s,s.active?'#9bd9ba':'#dc9abe',large?6:3);for(const s of g.world.sagaSites)point(s,'#c8a7e4',large?7:3);const t=g.questTarget?.();if(t)point(t,'#ffffff',large?8:4);point(p,'#fff0b6',large?7:4);if(large){c.font='12px "DenTinh Sans"';c.fillStyle='#eedfbd';c.fillText('Vàng: bệ đã khám phá · Tím: đàn đã khám phá · Lam: NPC · Trắng: nhiệm vụ',20,h-18);c.fillText('Vị trí '+Math.round(p.x)+', '+Math.round(p.y)+(t?' · Đích '+Math.round(t.x)+', '+Math.round(t.y):''),20,24)}};
  root.DTV09Art={icon,atlas,actors,ready:()=>!!atlas.naturalWidth&&!!actors.naturalWidth&&!!root.DTNpcPixelAtlas};
})(globalThis);
