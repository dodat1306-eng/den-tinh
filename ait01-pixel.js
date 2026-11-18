(function(root){
  'use strict';
  const character=new Image(),vfx=new Image(),P=()=>root.DTThienVuPixel,calm=()=>!!root.DTSettings?.reducedMotion;
  const ready=()=>!!root.DTAit01Atlas&&!!root.DTAit01VFX&&character.complete&&character.naturalWidth>0&&vfx.complete&&vfx.naturalWidth>0;
  const SLOTS=['slot_rifle','slot_smg','slot_shotgun','slot_grenade','slot_rocket','slot_sniper'];
  function draw(c,key,index,x,y,angle=0,scale=2){
    const clip=root.DTAit01VFX?.clips[key];if(!ready()||!clip)return;
    const f=clip.cells[Math.max(0,Math.min(clip.frames-1,index))];c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y));c.rotate(angle);
    c.drawImage(vfx,f.x,f.y,f.w,f.h,-Math.round(f.anchorX*scale),-Math.round(f.anchorY*scale),Math.round(f.w*scale),Math.round(f.h*scale));c.restore();
  }
  function hero(c,p,h,time=0,shadow=true){
    if(h.id!=='ait01')return false;if(!ready())return true;
    const a=p.action,angle=a?.angle??p.moveFacing??p.facing??Math.PI/2,view=Math.abs(Math.cos(angle))>Math.abs(Math.sin(angle))?(Math.cos(angle)<0?'W':'E'):(Math.sin(angle)<0?'N':'S');
    const action=p.dashTime>0?'dash':p.hit>0?'hit':a?({q:'q_cast',e:'e_cast',r:'r_ult'}[a.key]||'attack'):p.moving?'run':'idle',clip=root.DTAit01Atlas.clips[view+'/'+action];
    const index=calm()?0:a?Math.min(clip.frames-1,Math.floor((a.elapsed||0)/a.duration*clip.frames)):Math.floor(time*clip.fps)%clip.frames,f=clip.cells[index];
    P().screen(c,m=>{const s=P().point(m,p.x,p.y),n=calm()?0:Math.floor(time*12)%6;
      if(shadow)P().flip(c,'pixel_shadow',0,s.x,s.y+2);
      draw(c,'inventory_orbit_back/'+view,n,s.x,s.y);
      c.drawImage(character,f.x,f.y,f.w,f.h,Math.round(s.x-f.anchorX*2),Math.round(s.y-f.anchorY*2),f.w*2,f.h*2);
      draw(c,'inventory_orbit_front/'+view,n,s.x,s.y);
      if(p.inventoryOverdrive>0)for(let i=0;i<6;i++){
        const ang=i*Math.PI/3+(calm()?0:time*1.6);
        draw(c,SLOTS[i],n,s.x+Math.cos(ang)*76,s.y-28+Math.sin(ang)*46,0,1.5);
      }
    });return true;
  }
  const R=root.DTRenderer.prototype,oldEffect=R.drawEffect,oldBullet=R.drawProjectile,oldField=R.drawMythicField,oldEnemy=R.drawEnemy;
  R.drawEffect=function(e){if(!e.type?.startsWith('ait01-'))return oldEffect.call(this,e);const key=e.type.slice(6),clip=root.DTAit01VFX?.clips[key];if(!clip)return;
    P().screen(this.ctx,m=>{const p=P().point(m,e.x,e.y);draw(this.ctx,key,calm()?0:Math.floor((1-e.life/e.maxLife)*clip.frames),p.x,p.y,e.angle||0)})};
  R.drawProjectile=function(b){if(!b.aitLocks)return oldBullet.call(this,b);P().screen(this.ctx,m=>{const p=P().point(m,b.x,b.y);draw(this.ctx,b.kind,calm()?0:Math.floor(this.game.time*12)%6,p.x,p.y-15,(b.angle||0)+Math.PI/2)})};
  R.drawMythicField=function(f){if(!root.DTAit01.fields.has(f.kind))return oldField.call(this,f);if(f.life<=0)return;
    P().screen(this.ctx,m=>{const p=P().point(m,f.x,f.y),n=calm()?0:Math.floor(this.game.time*12)%6,key=f.kind==='tactical-zone'?'tactical_zone':f.kind==='airdrop-zone'?'airdrop_zone':'shotgun_blast';draw(this.ctx,key,n,p.x,p.y);
      if(f.kind!=='shrapnel-fire')for(let i=0;i<6;i++){const a=i*Math.PI/3+(calm()?0:this.game.time*.2);draw(this.ctx,SLOTS[i],n,p.x+Math.cos(a)*f.r*Math.abs(m.a),p.y+Math.sin(a)*f.r*Math.abs(m.d),0,1.5)}
    })};
  R.drawEnemy=function(e){if(e.targetLocks>0)P().screen(this.ctx,m=>{const p=P().point(m,e.x,e.y);draw(this.ctx,'slot_rocket',calm()?0:Math.floor(this.game.time*8)%6,p.x,p.y-28,0,1.2)});return oldEnemy.call(this,e)};
  root.DTAit01Pixel={character,vfx,ready,hero,draw};
  function portraits(){if(!ready())return;document.querySelectorAll('canvas[data-ait01]').forEach(canvas=>{const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);hero(c,{x:64,y:116,facing:Math.PI/2},root.DTWorld.HEROES.ait01,0)})}
  character.onload=portraits;vfx.onload=portraits;character.src='assets/ait01-pixel-v1.png';vfx.src='assets/ait01-vfx-pixel.png';
})(globalThis);
