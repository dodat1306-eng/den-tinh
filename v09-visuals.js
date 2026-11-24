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
  const npc=R.drawNpc;R.drawNpc=function(n){const clip=root.DTNpcPixelAtlas?.clips[(n.type||n.id)+'/idle'];if(!clip||!actors.complete||!actors.naturalWidth)return npc.call(this,n);const frame=clip.cells[root.DTSettings?.reducedMotion?0:Math.floor(Math.max(0,this.game.time)*clip.fps)%clip.frames],unit=root.DTNpcPixelAtlas.unit||2,c=this.ctx;c.save();c.imageSmoothingEnabled=false;c.fillStyle='#08192365';c.beginPath();c.ellipse(n.x,n.y,21,7,0,0,TAU);c.fill();c.drawImage(actors,frame.x,frame.y,frame.w,frame.h,Math.round(n.x-frame.anchorX*unit),Math.round(n.y-frame.anchorY*unit),frame.w*unit,frame.h*unit);c.font='11px "DenTinh Sans"';c.textAlign='center';c.fillStyle='#f0dfb9';c.fillText(n.name,n.x,n.y+19);c.restore()};
  const prop=R.drawProp;R.drawProp=function(p){if(p.relicCleared)return;return prop.call(this,p)};
  const effect=R.drawEffect;R.drawEffect=function(e){if(e.type!=='rpg-level'&&e.type!=='rpg-soul')return effect.call(this,e);const c=this.ctx,alpha=e.life/e.maxLife;c.save();c.globalAlpha=alpha;if(e.type==='rpg-level'){const grad=c.createLinearGradient(0,e.y-220,0,e.y);grad.addColorStop(0,'#ffe8a000');grad.addColorStop(1,'#fff0bbcc');c.fillStyle=grad;c.fillRect(e.x-18,e.y-220,36,220);c.strokeStyle='#b8e4ce';c.lineWidth=3;c.beginPath();c.ellipse(e.x,e.y,60*(1-alpha)+20,16,0,0,TAU);c.stroke()}else{const f=1-alpha,x=e.x+(e.tx-e.x)*f,y=e.y+(e.ty-e.y)*f;c.fillStyle='#ffe4a6';c.fillRect(x-4,y-4,8,8)}c.restore()};
  const scenery=R.drawScenery;R.drawScenery=function(inView){scenery?.call(this,inView);const c=this.ctx,g=this.game;for(const p of [...g.world.relicPedestals,...g.world.bossAltars])if(!p.claimed&&inView(p))trialGround(this,p);if(g.domGuide){c.save();c.strokeStyle='#ffe1a0';c.lineWidth=2;c.setLineDash([3,9]);c.beginPath();c.moveTo(g.player.x,g.player.y);c.lineTo(g.domGuide.x,g.domGuide.y);c.stroke();c.restore()}};
  R.map=function(canvas,large=false){const c=canvas.getContext('2d'),g=this.game,p=g.player,w=canvas.width,h=canvas.height,span=large?8000:1700,scale=Math.min(w/span,h/(span*.64)),left=large?Math.max(-1200,p.x-span/2):p.x-span/2,top=p.y-h/scale/2;const point=(o,color,size=3)=>{const x=(o.x-left)*scale,y=(o.y-top)*scale;if(x<3||y<3||x>w-3||y>h-3)return;c.fillStyle=color;c.fillRect(Math.round(x-size/2),Math.round(y-size/2),size,size)};c.fillStyle='#101f2b';c.fillRect(0,0,w,h);if(this.ground.overview)c.drawImage(this.ground.overview,-left*scale,-top*scale,6400*scale,4480*scale);for(const n of g.world.npcs)if(n.id!=='well')point(n,'#8cc9d8',large?4:2);for(const o of g.world.relicPedestals||[])if(o.discovered&&!o.claimed)point(o,'#e9bf6f',large?5:3);for(const o of g.world.bossAltars||[])if(o.discovered&&o.status!=='defeated')point(o,'#d794ba',large?5:3);for(const o of g.relicDrops||[])point(o,'#ffe5aa',large?7:4);for(const e of g.world.enemies)if(e.alive&&(e.sagaBoss||e.v09Boss&&g.world.bossAltars.some(a=>a.relic===e.relic&&a.discovered)))point(e,'#e9948c',large?6:3);for(const s of g.world.shrines)point(s,s.active?'#9bd9ba':'#dc9abe',large?6:3);for(const s of g.world.sagaSites)point(s,'#c8a7e4',large?7:3);if(g.worldEvent)point(g.worldEvent,root.DTWorldEvents.events[g.worldEvent.id].color,large?9:6);if(g.bloodChest)point(g.bloodChest,'#f87d8e',large?9:6);if(large&&root.DTWorldEvents)for(const o of root.DTWorldEvents.hubObjects(g))point(o,o.color,6);const t=g.questTarget?.();if(t)point(t,'#ffffff',large?8:4);point(p,'#fff0b6',large?7:4);if(large){c.font='12px "DenTinh Sans"';c.fillStyle='#eedfbd';c.fillText('Vàng: bệ đã khám phá · Tím: đàn đã khám phá · Lam: NPC · Trắng: nhiệm vụ',20,h-18);c.fillText('Vị trí '+Math.round(p.x)+', '+Math.round(p.y)+(t?' · Đích '+Math.round(t.x)+', '+Math.round(t.y):''),20,24)}};
  const NPC_THEMES={
    elder:{color:'#e5b869',accent:'#ffe8a8',bg:'#261d14',prop:'lantern'},
    smith:{color:'#f97316',accent:'#fed7aa',bg:'#291712',prop:'hammer'},
    temple_keeper:{color:'#d4b483',accent:'#fef08a',bg:'#231d16',prop:'scroll'},
    weaver_woman:{color:'#f4a2b8',accent:'#fbcfe8',bg:'#281620',prop:'thread'},
    lantern_boy:{color:'#fde047',accent:'#fef9c3',bg:'#242012',prop:'pinwheel'},
    blind_bard:{color:'#a7f3d0',accent:'#d1fae5',bg:'#132620',prop:'lute'},
    wandering_merchant:{color:'#fbbf24',accent:'#fef08a',bg:'#261e12',prop:'lantern'},
    bamboo_hunter:{color:'#4ade80',accent:'#bbf7d0',bg:'#12261a',prop:'bow'},
    bamboo_nun:{color:'#86efac',accent:'#dcfce7',bg:'#14281d',prop:'flute'},
    cursed_woodcutter:{color:'#94a3b8',accent:'#e2e8f0',bg:'#1a222b',prop:'axe'},
    lotus_crone:{color:'#f472b6',accent:'#fbcfe8',bg:'#261422',prop:'lotus'},
    scholar_ghost:{color:'#67e8f9',accent:'#cffafe',bg:'#10252e',prop:'brush'},
    firefly_girl:{color:'#bef264',accent:'#ecfccb',bg:'#192612',prop:'firefly'},
    ash_forger:{color:'#ef4444',accent:'#fca5a5',bg:'#2b1414',prop:'hammer'},
    ash_gravedigger:{color:'#a855f7',accent:'#e9d5ff',bg:'#1f122b',prop:'spade'},
    exiled_pyromancer:{color:'#fb923c',accent:'#fed7aa',bg:'#2b1810',prop:'flame'},
    waterfall_hermit:{color:'#2dd4bf',accent:'#99f6e4',bg:'#102826',prop:'gourd'},
    windmill_keeper:{color:'#a3e635',accent:'#d9f99d',bg:'#1d2612',prop:'pinwheel'},
    automaton_07:{color:'#22d3ee',accent:'#a5f3fc',bg:'#0e222e',prop:'core'},
    ferryman:{color:'#38bdf8',accent:'#bae6fd',bg:'#10222e',prop:'oar'},
    mirror_maiden:{color:'#e879f9',accent:'#f5d0fe',bg:'#26122b',prop:'mirror'},
    bell_keeper:{color:'#facc15',accent:'#fef08a',bg:'#262112',prop:'bell'},
    sun_child:{color:'#fde047',accent:'#fef9c3',bg:'#282210',prop:'sun'},
    bronze_pilot:{color:'#60a5fa',accent:'#bfdbfe',bg:'#121f2e',prop:'compass'},
    dom_avatar:{color:'#fcd34d',accent:'#fef3c7',bg:'#261f12',prop:'fox'}
  };
  const HERO_THEMES={
    an:{color:'#f1bf69',accent:'#ffe7a2',bg:'#281c12',prop:'lantern'},
    huyenkha:{color:'#ffd24c',accent:'#62bbff',bg:'#292020',prop:'sword'},
    quanle:{color:'#b86bff',accent:'#5ce1e6',bg:'#1a102b',prop:'shadow'},
    kiet:{color:'#b86bff',accent:'#5ce1e6',bg:'#1a102b',prop:'shadow'},
    hoavi:{color:'#38bdf8',accent:'#f472b6',bg:'#0e212e',prop:'code'},
    thienvu:{color:'#fbbf24',accent:'#fef08a',bg:'#22182b',prop:'element'},
    quynhkun:{color:'#ff6b6b',accent:'#ffd166',bg:'#291318',prop:'talisman'},
    ait01:{color:'#4df3ff',accent:'#ffe478',bg:'#0e232e',prop:'matrix'}
  };
  function resolveSpeaker(raw,game){
    const text=String(raw||'').trim(),upper=text.toUpperCase(),g=game||root.denTinh?.game;
    const heroes=root.DTWorld?.HEROES||{};
    for(const h of Object.values(heroes)){
      if(upper===h.id.toUpperCase()||upper===h.name.toUpperCase()||upper.startsWith(h.name.toUpperCase()+' ·')){
        const th=HERO_THEMES[h.id]||HERO_THEMES.an;
        const elCol=h.id==='thienvu'&&g?.element?.color?g.element.color:th.color;
        return{kind:'hero',id:h.id,name:h.name,color:elCol,accent:th.accent,bg:th.bg,prop:th.prop};
      }
    }
    const npcs=V?.npc||[];
    for(const n of npcs){
      const nu=n.name.toUpperCase();
      if(upper===n.id.toUpperCase()||upper===nu||upper.startsWith(nu+' ·')||upper.includes(nu)){
        const th=NPC_THEMES[n.id]||NPC_THEMES.elder;
        return{kind:'npc',id:n.id,name:n.name,color:th.color,accent:th.accent,bg:th.bg,prop:th.prop};
      }
    }
    if(upper.includes('NGƯỜI GIỮ MIẾU'))return{kind:'npc',id:'bell_keeper',name:'Người Giữ Miếu Chuông',...NPC_THEMES.bell_keeper};
    if(upper.includes('ĐỐM'))return{kind:'npc',id:'dom_avatar',name:'Hóa Thân Của Đốm',...NPC_THEMES.dom_avatar};
    if(upper.includes('CỘI ĐA')||upper.includes('LINH HỒN'))return{kind:'npc',id:'elder',name:'Cội Đa Lạc Hồn',color:'#a7f3d0',accent:'#fef08a',bg:'#132622',prop:'lotus'};
    const near=g?.nearby?.();
    if(near&&(near.v09Npc||near.storyNPC||NPC_THEMES[near.id||near.type])){
      const id=near.type||near.id,th=NPC_THEMES[id]||NPC_THEMES.elder;
      return{kind:'npc',id,name:near.name||text,color:th.color,accent:th.accent,bg:th.bg,prop:th.prop};
    }
    if(g?.hero){
      const h=g.hero,th=HERO_THEMES[h.id]||HERO_THEMES.an;
      if(upper.includes(h.name.toUpperCase()))return{kind:'hero',id:h.id,name:h.name,color:th.color,accent:th.accent,bg:th.bg,prop:th.prop};
    }
    return{kind:'npc',id:'elder',name:text||'Bà Năm',...NPC_THEMES.elder};
  }
  function drawPortrait(canvas,speakerRaw,time=0,game){
    if(!canvas)return null;
    const c=canvas.getContext('2d'),w=canvas.width||112,h=canvas.height||112,g=game||root.denTinh?.game;
    const info=typeof speakerRaw==='object'&&speakerRaw?.id?speakerRaw:resolveSpeaker(speakerRaw,g);
    const calm=!!root.DTSettings?.reducedMotion,t=calm?0:Number(time)||0;
    const bob=calm?0:Math.round(Math.sin(t*3.2)*2),blink=!calm&&(t%3.6)>3.46;
    c.save();
    c.imageSmoothingEnabled=false;
    // 1. Pixel-art dark background + speaker aura radial glow
    c.fillStyle=info.bg||'#182228';
    c.fillRect(0,0,w,h);
    const grad=c.createRadialGradient(w*.5,h*.48,6,w*.5,h*.48,w*.52);
    grad.addColorStop(0,(info.color||'#e5b869')+'66');
    grad.addColorStop(1,'transparent');
    c.fillStyle=grad;c.fillRect(0,0,w,h);
    // Floating background pixel aura particles
    for(let i=0;i<8;i++){
      const px=Math.round((14+(i*37)+Math.sin(t*1.8+i)*8)%92)/2*2;
      const py=Math.round((96-((i*23+t*18)%84)))/2*2;
      c.fillStyle=i%2?info.accent:info.color;
      c.globalAlpha=.35+.35*Math.sin(t*3+i);
      c.fillRect(px,py,i%3===0?4:2,i%3===0?4:2);
    }
    c.globalAlpha=1;
    // 2. Close-up Head, Shoulders & Signature Prop
    let drawn=false;
    if(info.kind==='npc'){
      const clip=root.DTNpcPixelAtlas?.clips?.[info.id+'/idle'];
      if(clip&&actors.complete&&actors.naturalWidth>0){
        const idx=calm?0:Math.floor(Math.max(0,t)*clip.fps)%clip.frames,f=clip.cells[idx];
        // Zoomed upper body (head, shoulders & held prop) at crisp 3x pixel scale
        c.drawImage(actors,f.x+10,f.y+4,44,40,-10,8+bob,132,120);
        drawn=true;
      }
    }else if(info.kind==='hero'){
      const id=info.id;
      if(id==='huyenkha'&&root.DTHuyenKhaPixel?.ready()){
        root.DTHuyenKhaPixel.portrait(c,w,h,bob);
        drawn=true;
      }else if(id==='an'&&root.DTWorldPixel?.ready()){
        const clip=root.DTActorsPixelAtlas?.clips?.[id+'_S/idle'];
        if(clip){
          const f=clip.cells[calm?0:Math.floor(Math.max(0,t)*clip.fps)%clip.frames];
          c.drawImage(root.DTWorldPixel.actors,f.x+10,f.y+4,44,40,-10,10+bob,132,120);
          drawn=true;
        }
      }else if((id==='quanle'||id==='kiet')&&root.DTQuanLePixel?.ready()){
        if(root.DTQuanLePixel.portrait?.(c,w,h,bob)){
          drawn=true;
        }else{
          const clip=root.DTQuanLeAtlas?.clips?.['S/idle'];
          if(clip){
            const f=clip.cells[calm?0:Math.floor(Math.max(0,t)*clip.fps)%clip.frames];
            c.drawImage(root.DTQuanLePixel.character,f.x+10,f.y+4,44,40,-10,10+bob,132,120);
            drawn=true;
          }
        }
      }else if(id==='hoavi'&&root.DTHoaViPixel?.ready()){
        const cells=root.DTHoaViAtlas?.actions?.idle?.directions?.S;
        if(cells){
          const f=cells[calm?0:Math.floor(Math.max(0,t)*6)%cells.length];
          c.drawImage(root.DTHoaViPixel.character,f.x+10,f.y+4,44,40,-10,10+bob,132,120);
          drawn=true;
        }
      }else if(id==='thienvu'&&root.DTThienVuPixel?.ready()){
        const form=g?.element?.id||g?.player?.elementForm||'lightning';
        const cells=root.DTThienVuAtlas?.forms?.[form]?.actions?.idle?.directions?.S;
        if(cells){
          const f=cells[calm?0:Math.floor(Math.max(0,t)*6)%cells.length];
          c.drawImage(root.DTThienVuPixel.character,f.x+10,f.y+4,44,40,-10,10+bob,132,120);
          drawn=true;
        }
      }else if(id==='quynhkun'&&root.DTQuynhKunPixel?.ready()){
        const clip=root.DTQuynhKunAtlas?.clips?.['S/idle'];
        if(clip){
          const f=clip.cells[calm?0:Math.floor(Math.max(0,t)*clip.fps)%clip.frames];
          c.drawImage(root.DTQuynhKunPixel.character,f.x+10,f.y+4,44,40,-10,10+bob,132,120);
          drawn=true;
        }
      }else if(id==='ait01'&&root.DTAit01Pixel?.ready()){
        const clip=root.DTAit01Atlas?.clips?.['S/idle'];
        if(clip){
          const f=clip.cells[calm?0:Math.floor(Math.max(0,t)*clip.fps)%clip.frames];
          c.drawImage(root.DTAit01Pixel.character,f.x+10,f.y+4,44,40,-10,10+bob,132,120);
          drawn=true;
        }
      }
    }
    // Procedural Pixel-Art Bust Fallback (and signature prop/eye overlay)
    if(!drawn){
      // Shoulders & Robe
      c.fillStyle=info.color;c.fillRect(24,66+bob,64,46);
      c.fillStyle='#1b2832';c.fillRect(32,68+bob,48,44);
      c.fillStyle=info.accent;c.fillRect(48,68+bob,16,44);
      // Head & Hair/Hat
      c.fillStyle='#e8c39e';c.fillRect(36,30+bob,40,36);
      c.fillStyle=info.kind==='npc'?'#d6cfc2':'#222c38';
      c.fillRect(32,20+bob,48,16);
      // Eyes (with blink animation)
      c.fillStyle='#141c24';
      if(blink){
        c.fillRect(42,46+bob,8,2);c.fillRect(62,46+bob,8,2);
      }else{
        c.fillRect(42,44+bob,6,6);c.fillRect(64,44+bob,6,6);
        c.fillStyle='#ffffff';c.fillRect(44,44+bob,2,2);c.fillRect(66,44+bob,2,2);
      }
    }else if(blink){
      // Subtle eye-blink shimmer on atlas portrait
      c.fillStyle=info.bg;c.globalAlpha=.45;c.fillRect(44,46+bob,24,3);c.globalAlpha=1;
    }
    // 3. Signature Prop Overlay & Animated Foreground Details
    const pBob=calm?0:Math.round(Math.sin(t*4.5)*3);
    if(info.prop==='lantern'){
      c.fillStyle='#785438';c.fillRect(84,48+pBob,14,4);
      c.fillStyle='#ffb84d';c.fillRect(86,52+pBob,10,14);
      c.fillStyle='#fff6cc';c.fillRect(88,54+pBob,6,10);
    }else if(info.prop==='code'||info.prop==='core'){
      c.fillStyle='#22d3ee';c.font='bold 10px monospace';
      c.fillText(Math.floor(t*4)%2?'01':'<>',82,32+pBob);
    }else if(info.prop==='talisman'){
      c.fillStyle='#ff6b6b';c.fillRect(84,36+pBob,12,20);
      c.fillStyle='#ffd166';c.fillRect(86,38+pBob,8,16);
    }else if(info.prop==='matrix'){
      c.strokeStyle='#4df3ff';c.lineWidth=2;c.strokeRect(80,34+pBob,18,18);
      c.fillStyle='#ffe478';c.fillRect(85,39+pBob,8,8);
    }else if(info.prop==='shadow'){
      c.fillStyle='#a855f7';c.fillRect(84,42+pBob,8,14);
      c.fillStyle='#5ce1e6';c.fillRect(86,44+pBob,4,8);
    }
    // 4. Inner Wood-and-Bronze Pixel Frame Border
    c.strokeStyle='#5c4028';c.lineWidth=4;c.strokeRect(2,2,w-4,h-4);
    c.strokeStyle=info.color||'#d8b068';c.lineWidth=2;c.strokeRect(5,5,w-10,h-10);
    c.fillStyle='#f3d58d';
    for(const [cx,cy]of[[4,4],[w-8,4],[4,h-8],[w-8,h-8]])c.fillRect(cx,cy,4,4);
    c.restore();
    return info;
  }
  root.DTV09Art={icon,atlas,actors,resolveSpeaker,drawPortrait,ready:()=>!!atlas.naturalWidth&&!!actors.naturalWidth&&!!root.DTNpcPixelAtlas};
})(globalThis);
