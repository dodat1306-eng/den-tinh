(function (root) {
  'use strict';

  const R=root.DTRenderer.prototype, atlas=new Image(), tau=Math.PI*2;
  atlas.src='assets/biome-monsters-v1.png';
  const calm=()=>!!root.DTSettings?.reducedMotion;
  const low=()=>root.DTSettings?.graphics==='low'||root.DTSettings?.graphics!=='high'&&!!root.DTTouch?.active;
  const gold='#ffe29a';
  const ready=()=>!!root.DTBiomeMonsterAtlas&&atlas.complete&&atlas.naturalWidth>0;
  const phase=(life,total)=>Math.max(0,Math.min(1,1-life/total));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

  function line(c,x,y,tx,ty,color,width) {
    c.strokeStyle=color;c.lineWidth=width;
    c.beginPath();c.moveTo(x,y);c.lineTo(tx,ty);c.stroke();
  }

  function ring(c,x,y,r,color,fill) {
    c.strokeStyle=color;c.lineWidth=2;
    c.beginPath();c.ellipse(x,y,r,r*.60,0,0,tau);
    if (fill) {c.fillStyle=fill;c.fill();}
    c.stroke();
  }

  function bar(c,x,y,w,percent,color) {
    c.fillStyle='#12091a';c.fillRect(x-1,y-1,w+2,5);
    c.fillStyle='#453744';c.fillRect(x,y,w,3);
    c.fillStyle=color;c.fillRect(x,y,Math.round(w*Math.max(0,Math.min(percent,1))),3);
  }

  function sprite(c,e,action,t,progress) {
    const clip=root.DTBiomeMonsterAtlas?.clips[e.type+'/'+action];
    if (!ready()||!clip) return false;
    const i=calm()?0:Number.isFinite(progress)?Math.min(5,Math.floor(Math.max(0,progress)*6)):Math.floor(Math.max(t,0)*clip.fps)%6;
    const frame=clip.cells[i],unit=root.DTBiomeMonsterAtlas.unit;
    c.save();
    c.translate(Math.round(e.x),Math.round(e.y-(e.z||e.biomeLift||0)));
    if(e.flipX)c.scale(-1,1);
    c.imageSmoothingEnabled=false;
    c.drawImage(atlas,frame.x,frame.y,frame.w,frame.h,-frame.anchorX*unit,-frame.anchorY*unit,frame.w*unit,frame.h*unit);
    c.restore();
    return true;
  }

  function enemy(r,e) {
    const def=root.DTBiome.species[e.type];
    if (!def) return false;
    const c=r.ctx,g=r.game,t=calm()?0:g.time;
    const action=e.submerged?'submerged':e.biomeAttack>0||e.biomeCharge>0?'attack':e.biomeMoving?'walk':'idle';
    if (e.type==='shield_drone') {
      const target=root.DTBiome.linkTarget(e);
      if (root.DTBiome.shieldedBy(target,e)) {
        line(c,e.x,e.y-48,target.x,target.y-target.r*1.4,'#37cacf63',7);
        line(c,e.x,e.y-48,target.x,target.y-target.r*1.4,'#baffff',2);
      }
    }
    c.save();
    if (e.concealed)c.globalAlpha*=.25;
    if (!e.submerged)r.drawCastShadow?.(e.x,e.y,Math.min(32,e.r+4),44,e);
    sprite(c,e,action,t,action==='attack'?1-Math.min(.82,e.biomeAttack||0)/.82:undefined);
    c.restore();
    if (e.concealed) return true;
    if (e.submerged) ring(c,e.x,e.y,26+(t*14)%12,'#9ad6db65');
    if (e.type==='forge_shielder'&&Number.isFinite(e.shieldAngle)) {
      c.strokeStyle='#ffb16eaa';c.lineWidth=2;c.beginPath();
      c.arc(e.x,e.y,e.r+10,e.shieldAngle-.96,e.shieldAngle+.96);c.stroke();
    }
    if (e.type==='ember_bat'&&e.biomeAttack>0) root.DTWorldPixel?.sprite(c,'flame',e.x,e.y-49,t);
    if (e.hp<e.maxHp)bar(c,e.x-21,e.y-(e.submerged?37:105),42,e.hp/e.maxHp,'#f58283');
    if (e.burn>0&&!e.submerged) root.DTWorldPixel?.sprite(c,'flame',e.x,e.y-8,t);
    return true;
  }

  function drawHazards(r,inView) {
    const c=r.ctx,g=r.game,t=calm()?0:g.time;
    for (const h of g.biomeHazards||[]) {
      if (!inView(h)&&!inView(h.end)) continue;
      if (h.kind==='bomb') {
        const f=phase(h.life,h.total),travel=Math.min(1,f/.75);
        const x=h.startX+(h.landX-h.startX)*travel+(h.x-h.landX)*Math.max(0,(f-.75)*4);
        const y=h.startY+(h.landY-h.startY)*travel+(h.y-h.landY)*Math.max(0,(f-.75)*4);
        const z=f<.75?4*travel*(1-travel)*94:Math.sin((f-.75)*4*Math.PI)*21;
        ring(c,x,y,8,'#d2ce8780','#312d2aac');
        c.save();c.translate(x,y-z-13);c.rotate(t*5);
        line(c,-11,0,11,0,'#1d4935',8);line(c,-8,-2,9,-2,'#e3bd68',2);
        line(c,11,0,16,-4,'#ffc68a',2);c.restore();
      } else if (h.kind==='laser'&&h.end) {
        line(c,h.x,h.y,h.end.x,h.end.y,'#ff586752',22);
        line(c,h.x,h.y,h.end.x,h.end.y,'#ff5c85',9);
        line(c,h.x,h.y,h.end.x,h.end.y,'#ffefe3',3);
      } else if (h.kind==='mist') {
        ring(c,h.x,h.y,h.r,'#eeb3ff85','#a355ad38');
        if (!low()) for (let i=0;i<4;i++) {
          c.save();c.globalAlpha=.5;
          root.DTWorldPixel?.sprite(c,'steam_cloud',h.x+Math.cos(t+i*2)*h.r*.62,h.y+Math.sin(t+i*2)*h.r*.45-11,t+i);
          c.restore();
        }
      } else if (h.kind==='spikes') {
        ring(c,h.x,h.y,h.r,'#91cb7685','#49633d30');
        for (let i=0;i<11;i++) {
          const a=i*2.39996,x=h.x+Math.cos(a)*h.r*(i%3+1)/4,y=h.y+Math.sin(a)*h.r*(i%3+1)/4;
          line(c,x,y,x+Math.cos(a)*8,y-13,'#a9ce71',3);
        }
      }
    }
  }

  function label(c,text,x,y,color='#fff1cb') {
    c.save();c.font='700 13px "DenTinh Sans"';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#12091a';
    c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);c.restore();
  }

  function objects(r,inView) {
    const g=r.game,c=r.ctx,t=calm()?0:g.time;
    const objects=[];
    for (const s of (inView({x:740,y:2240})?root.DTWorldEvents.hubObjects(g):[])) if (inView(s)) objects.push({y:s.y,draw:()=>{
      ring(c,s.x,s.y,40,s.color+'9a','#352a4060');
      const key=s.art==='campfire'?'flame':s.art+'/intact';
      root.DTWorldPixel?.sprite(c,key,s.x,s.y-8,t);
      if (dist(s,g.player)<170)label(c,s.label,s.x,s.y+30);
    }});
    const e=g.worldEvent;
    if (e&&inView(e)) {
      if (e.id==='traveler_rescue') objects.push({y:e.y,draw:()=>{
        r.drawNpc({...e,id:'ferryman',type:'ferryman',animMode:'interact',name:'Lữ Khách Giữ Đèn'});
        label(c,'Lữ Khách Giữ Đèn',e.x,e.y-112,gold);
        bar(c,e.x-32,e.y-104,64,e.hp/e.maxHp,'#9fdf95');
      }});
      if (e.id==='memory_rift'&&e.phase==='portal') objects.push({y:e.y,draw:()=>{
        ring(c,e.x,e.y,45,'#d7a2ff','#8a4fc04d');
        c.save();c.translate(e.x,e.y-44);c.rotate(t*.31);
        for(let i=0;i<4;i++){
          c.lineWidth=4-i*.7;c.strokeStyle=['#f8d6ff','#bd8deb','#9c68e7','#633eb8'][i];
          c.beginPath();c.ellipse(0,0,37-i*7,45-i*8,i*.63,t*.7+i,t*.7+i+Math.PI*1.51);c.stroke();
        }
        c.restore();
        label(c,'F · Mở Khe Nứt',e.x,e.y+29);
      }});
    }
    if (g.bloodChest&&inView(g.bloodChest)){
      const o=g.bloodChest;
      objects.push({y:o.y,draw:()=>{
        ring(c,o.x,o.y,36,'#f78c9585','#75384345');
        r.drawChest({...o,open:false});
        label(c,'Rương Huyết Tinh',o.x,o.y-38,'#ffd3be');
      }});
    }
    return objects;
  }

  const oldEnemy=R.drawEnemy,oldDying=R.drawDyingEnemy,oldEffect=R.drawEffect;
  const oldField=R.drawMythicField,oldTell=R.drawSagaTelegraph,oldProjectile=R.drawProjectile;
  R.drawEnemy=function(e){
    oldEnemy.call(this,e);
    const c=this.ctx;
    if (root.DTBiome.shieldedBy(e))ring(c,e.x,e.y-e.r,e.r+18,'#87f9ffd2','#4edfec30');
    if (e.miniBoss&&e.alive) {
      const frame=root.DTActorsPixelAtlas?.clips[e.type+'/idle']?.cells[0],y=e.y-(frame?frame.h*2:95)-16;
      bar(c,e.x-23,y,46,e.hp/e.maxHp,'#f37278');
      bar(c,e.x-23,y+6,46,e.staggered>0?e.staggered/3.5:(e.posture||0)/100,'#f5c85c');
    }
    if (e.signatureMarkedUntil>this.game.time) ring(c,e.x,e.y,26,root.DTElements.byId(e.signatureElement).color);
    if (e.staggered>0) label(this.ctx,'PHÁ THẾ',e.x,e.y-(e.r+35),gold);
    if (e.worldEventUnit==='blood_mist') ring(c,e.x,e.y,e.r+7,'#f9677cb0');
  };
  R.drawDyingEnemy=function(e){
    if (!root.DTBiome.species[e.type])return oldDying?.call(this,e);
    const c=this.ctx;
    c.save();c.globalAlpha=1-phase(e.life,e.maxLife);
    sprite(c,e,'idle',this.game.time,0);
    c.restore();
  };

  R.drawSagaTelegraph=function(t){
    if (!t.kind?.startsWith('biome-'))return oldTell.call(this,t);
    const c=this.ctx,l={...t,kind:t.kind==='biome-laser'?'line':'disc'};
    oldTell.call(this,l);
    if (t.kind==='biome-cross'){
      line(c,t.fromX,t.fromY,t.x,t.y,t.color+'89',3);
      for(const a of [t.crossAngle-.65,t.crossAngle+.65]){
        line(c,t.x-Math.cos(a)*46,t.y-Math.sin(a)*46,t.x+Math.cos(a)*46,t.y+Math.sin(a)*46,'#ffc98a',4);
      }
    }
    if (t.kind==='biome-bat')line(c,t.fromX,t.fromY,t.x,t.y,t.color+'89',3);
  };

  R.drawMythicField=function(f){
    const c=this.ctx,g=this.game,t=calm()?0:g.time;
    if (f.kind==='signature-ember'){
      root.DTWorldPixel.sprite(c,'flame',f.x,f.y,t+f.x*.018);return;
    }
    if (f.kind==='synergy-fire'){
      for(let i=0;i<=7;i++){
        const s=i/7,x=f.x+(f.tx-f.x)*s,y=f.y+(f.ty-f.y)*s;
        root.DTWorldPixel.sprite(c,'flame',x,y-3,t+i*.1);
        line(c,x-4,y,x+5,y-30,'#b69b54',3);
      }
      return;
    }
    if (f.kind==='synergy-arc'){
      ring(c,f.x,f.y,Math.min(f.r,55),'#c8b9ffb8','#8782d73c');ring(c,f.x,f.y-12,18,'#ece8ff','#beadff70');return;
    }
    if (f.kind==='synergy-moons'){
      for(let i=0;i<4;i++){
        const a=(calm()?0:f.age*6)+i*Math.PI/2,x=f.x+Math.cos(a)*f.r,y=f.y+Math.sin(a)*f.r;
        c.strokeStyle='#f5efff';c.lineWidth=5;c.beginPath();c.arc(x,y-16,13,a-1.35,a+1.15);c.stroke();
      }
      return;
    }
    return oldField.call(this,f);
  };

  R.drawProjectile=function(b){
    if (!b.counter) return oldProjectile.call(this,b);
    const c=this.ctx,t=calm()?0:this.game.time, art=root.DTThienVuPixel;
    if (b.counter==='an'&&ready()){
      c.save();c.translate(b.x,b.y-18);c.rotate(b.angle+Math.PI/2);
      sprite(c,{type:'an-phoenix',x:0,y:24},'attack',t);
      c.restore();return;
    }
    if (b.counter==='thienvu'&&art?.ready()){
      c.save();c.imageSmoothingEnabled=false;
      art.flip(c,'proj_'+b.element,Math.floor(t*10)%6,b.x,b.y-16,4,Math.round(b.angle*8)/8);c.restore();return;
    }
    const spun=b.counter==='quynhkun',color=b.color;
    c.save();c.translate(b.x,b.y-12);c.rotate(spun?t*11:b.angle);
    if (spun) {
      ring(c,0,0,19,gold,'#a7683c');
      for (let i=0;i<8;i++){
        const a=i*tau/8;line(c,Math.cos(a)*10,Math.sin(a)*7,Math.cos(a)*17,Math.sin(a)*11,'#fff1ac',2);
      }
      c.fillStyle='#28172e';c.fillRect(-4,-4,8,8);
    } else {
      line(c,-33,0,13,0,color,b.counter==='ait01'?12:6);
      line(c,-21,0,12,0,'#fff6da',3);
      c.fillStyle=color;c.beginPath();c.moveTo(21,0);c.lineTo(5,-8);c.lineTo(5,8);c.closePath();c.fill();
    }
    c.restore();
  };

  R.drawEffect=function(e){
    const c=this.ctx,a=phase(e.life,e.maxLife);
    if(e.type==='perfect-echo'){
      c.save();c.globalAlpha=(1-a)*.64;
      if(!low())c.filter='sepia(1) saturate(3.2) brightness(1.6)';
      root.DTVisualHero(c,{x:e.x,y:e.y,r:13,dashTime:.15,dashX:Math.cos(e.angle),dashY:Math.sin(e.angle),
        moveDir:e.moveDir,moveFacing:e.angle,facing:e.angle,elementForm:e.element,hero:e.hero},this.game.hero,this.game.time);
      c.restore();ring(c,e.x,e.y,24+a*34,'#ffe0a075');return;
    }
    if(e.type==='posture-break'||e.type==='signature-wave'||e.type==='counter-flare'){
      c.save();c.globalAlpha=1-a;
      ring(c,e.x,e.y,12+e.r*a,e.color);
      for(let i=0;i<8;i++){
        const theta=i*tau/8+(e.angle||0),r=e.r*a;
        line(c,e.x+Math.cos(theta)*r,e.y+Math.sin(theta)*r,e.x+Math.cos(theta)*(r+15),e.y+Math.sin(theta)*(r+15),'#fff2d3',2);
      }
      c.restore();return;
    }
    if(e.type==='counter-column'){
      c.save();c.globalAlpha=(1-a)*.8;
      for(let i=0;i<3;i++)line(c,e.x+i*11-11,e.y,e.x+(1-i)*8,e.y-64-25*Math.sin(a*Math.PI),e.color,10-i*2);
      ring(c,e.x,e.y,28+e.r*a,e.color);c.restore();return;
    }
    if(e.type==='counter-beam'||e.type==='synergy-wish'){
      c.save();c.globalAlpha=1-a;
      line(c,e.x,e.y-32,e.tx,e.ty-22,e.color,18);
      line(c,e.x,e.y-32,e.tx,e.ty-22,'#f8ffdc',4);
      c.restore();return;
    }
    if(e.type==='shield-ricochet'){
      const tx=e.x+Math.cos(e.angle)*38*a,ty=e.y+Math.sin(e.angle)*38*a;
      line(c,e.x,e.y,tx,ty,e.color,3);return;
    }
    return oldEffect.call(this,e);
  };

  root.DTBiomeArt={ready,enemy,objects,drawHazards,drawCounterAura(renderer,p){
    if (!(p.perfectCounter>0)) return;
    const c=renderer.ctx,a=p.facing||0,x=p.x+Math.cos(a)*31,y=p.y+Math.sin(a)*16-23;
    ring(c,x,y,16,gold,'#fff4ae44');line(c,x-4,y,x+4,y,'#fffbde',2);line(c,x,y-4,x,y+4,'#fffbde',2);
  }};
})(globalThis);
