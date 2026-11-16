(function(root){
  'use strict';
  const character=new Image(),vfx=new Image(),P=()=>root.DTThienVuPixel,calm=()=>!!root.DTSettings?.reducedMotion;
  const ready=()=>!!root.DTQuynhKunAtlas&&!!root.DTQuynhKunVFX&&character.complete&&character.naturalWidth>0&&vfx.complete&&vfx.naturalWidth>0;
  function draw(c,key,index,x,y,angle=0,scale=2){
    const clip=root.DTQuynhKunVFX?.clips[key];if(!ready()||!clip)return;
    const f=clip.cells[Math.max(0,Math.min(clip.frames-1,index))];c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y));c.rotate(angle);
    c.drawImage(vfx,f.x,f.y,f.w,f.h,-Math.round(f.anchorX*scale),-Math.round(f.anchorY*scale),Math.round(f.w*scale),Math.round(f.h*scale));c.restore();
  }
  function hero(c,p,h,time=0,shadow=true){
    if(h.id!=='quynhkun')return false;if(!ready())return true;
    const a=p.action,angle=a?.angle??p.moveFacing??p.facing??Math.PI/2,view=Math.abs(Math.cos(angle))>Math.abs(Math.sin(angle))?(Math.cos(angle)<0?'W':'E'):(Math.sin(angle)<0?'N':'S');
    const action=p.dashTime>0?'dash':p.hit>0?'hit':a?({q:'q_cast',e:'e_cast',r:'r_ult'}[a.key]||'attack'):p.moving?'run':'idle',clip=root.DTQuynhKunAtlas.clips[view+'/'+action];
    const index=calm()?0:a?Math.min(clip.frames-1,Math.floor((a.elapsed||0)/a.duration*clip.frames)):Math.floor(time*clip.fps)%clip.frames,f=clip.cells[index];
    P().screen(c,m=>{const s=P().point(m,p.x,p.y),n=calm()?0:Math.floor(time*12)%6;
      if(shadow)P().flip(c,'pixel_shadow',0,s.x,s.y+2);
      if(p.talismanWard>0)draw(c,'ward_orbit_back/'+view,n,s.x,s.y);
      c.drawImage(character,f.x,f.y,f.w,f.h,Math.round(s.x-f.anchorX*2),Math.round(s.y-f.anchorY*2),f.w*2,f.h*2);
      if(p.talismanWard>0)draw(c,'ward_orbit_front/'+view,n,s.x,s.y);
    });return true;
  }
  const R=root.DTRenderer.prototype,oldEffect=R.drawEffect,oldBullet=R.drawProjectile,oldField=R.drawMythicField,oldEnemy=R.drawEnemy;
  R.drawEffect=function(e){if(!e.type?.startsWith('quynh-'))return oldEffect.call(this,e);const key=e.type.slice(6),clip=root.DTQuynhKunVFX?.clips[key];if(!clip)return;
    P().screen(this.ctx,m=>{const p=P().point(m,e.x,e.y);draw(this.ctx,key,calm()?0:Math.floor((1-e.life/e.maxLife)*clip.frames),p.x,p.y,e.angle||0)})};
  R.drawProjectile=function(b){if(!b.quynhMarks)return oldBullet.call(this,b);P().screen(this.ctx,m=>{const p=P().point(m,b.x,b.y);draw(this.ctx,b.kind,calm()?0:Math.floor(this.game.time*12)%6,p.x,p.y-15,(b.angle||0)+Math.PI/2)})};
  R.drawMythicField=function(f){if(!root.DTQuynhKun.fields.has(f.kind))return oldField.call(this,f);if(f.life<=0)return;
    P().screen(this.ctx,m=>{const p=P().point(m,f.x,f.y),n=calm()?0:Math.floor(this.game.time*12)%6,key=f.kind==='bagua-stake'?'bagua_stake':f.kind==='heaven-seal'?'heaven_seal_array':'cinnabar_slash';draw(this.ctx,key,n,p.x,p.y);
      if(f.kind!=='cinnabar-fire')for(let i=0;i<8;i++){const a=i*Math.PI/4+(calm()?0:this.game.time*.15);draw(this.ctx,'talisman_bolt',n,p.x+Math.cos(a)*f.r*Math.abs(m.a),p.y+Math.sin(a)*f.r*Math.abs(m.d),a)}
    })};
  R.drawEnemy=function(e){if(e.talismanMarks>0)P().screen(this.ctx,m=>{const p=P().point(m,e.x,e.y);draw(this.ctx,'curse_mark_'+Math.min(5,e.talismanMarks),calm()?0:Math.floor(this.game.time*8)%4,p.x,p.y)});return oldEnemy.call(this,e)};
  root.DTQuynhKunPixel={character,vfx,ready,hero,draw};
  function portraits(){if(!ready())return;document.querySelectorAll('canvas[data-quynhkun]').forEach(canvas=>{const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);hero(c,{x:64,y:116,facing:Math.PI/2},root.DTWorld.HEROES.quynhkun,0)})}
  character.onload=portraits;vfx.onload=portraits;character.src='assets/quynhkun-pixel-v1.png';vfx.src='assets/quynhkun-vfx-pixel.png';
})(globalThis);
