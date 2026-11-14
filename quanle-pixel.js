(function(root){
  'use strict';
  const character=new Image(),vfx=new Image();character.src='assets/quanle-pixel-v08.png';vfx.src='assets/quanle-vfx-pixel.png';
  const calm=()=>!!root.DTSettings?.reducedMotion,P=()=>root.DTThienVuPixel;
  const ready=()=>!!root.DTQuanLeAtlas&&!!root.DTQuanLeVFX&&character.complete&&character.naturalWidth>0&&vfx.complete&&vfx.naturalWidth>0;
  function draw(c,key,index,x,y,angle=0){const clip=root.DTQuanLeVFX?.clips[key];if(!clip||!ready())return;P().flip(c,key,Math.max(0,Math.min(clip.frames-1,index)),x,y,2,angle,root.DTQuanLeVFX,vfx)}
  function hero(c,p,h,time=0){
    if(h.id!=='quanle'&&h.id!=='kiet')return false;if(!ready())return true;
    const a=p.action,angle=p.moveFacing??p.facing??Math.PI/2,view=Math.abs(Math.cos(angle))>Math.abs(Math.sin(angle))?(Math.cos(angle)<0?'W':'E'):(Math.sin(angle)<0?'N':'S');
    const action=p.dashTime>0?'dash':p.hit>0?'hit':a?({q:'q_cast',e:'e_cast',r:'r_ult'}[a.key]||'attack'):p.moving?'run':'idle',clip=root.DTQuanLeAtlas.clips[view+'/'+action];
    const index=calm()?0:a?Math.min(clip.frames-1,Math.floor((a.elapsed||0)/a.duration*clip.frames)):Math.floor(time*clip.fps)%clip.frames,f=clip.cells[index];
    P().screen(c,m=>{const s=P().point(m,p.x,p.y);P().flip(c,'pixel_shadow',0,s.x,s.y+2);c.drawImage(character,f.x,f.y,f.w,f.h,Math.round(s.x-f.anchorX*2),Math.round(s.y-f.anchorY*2),f.w*2,f.h*2);if(p.shadowArmor>0){draw(c,'shadow_armor',calm()?0:Math.floor(time*12)%6,s.x,s.y-68);draw(c,'shadow_tendrils',calm()?0:Math.floor(time*12)%6,s.x,s.y-32)}});return true;
  }
  function beast(renderer,s){if(!ready())return;const g=renderer.game,key=(s.variant||s.kind)+'/'+(s.action?'attack':'walk'),clip=root.DTQuanLeVFX.clips[key];if(!clip)return;
    const f=clip.cells[calm()?0:Math.floor((s.action?.elapsed||g.time)*clip.fps)%clip.frames];P().screen(renderer.ctx,m=>{const p=P().point(m,s.x,s.y),c=renderer.ctx;c.drawImage(vfx,f.x,f.y,f.w,f.h,p.x-f.anchorX*2,p.y-f.anchorY*2,f.w*2,f.h*2);if(s.hp<s.maxHp){c.fillStyle='#12091a';c.fillRect(p.x-22,p.y+5,44,4);c.fillStyle='#b84dff';c.fillRect(p.x-21,p.y+6,Math.round(42*Math.max(0,s.hp/s.maxHp)),2)}});
  }
  function remain(renderer,s){if(!ready())return;P().screen(renderer.ctx,m=>{const p=P().point(m,s.x,s.y);draw(renderer.ctx,'shadow_soul',calm()?0:Math.floor(renderer.game.time*8)%6,p.x,p.y-14)})}
  function effect(renderer,e){if(!e.type?.startsWith('shadow-'))return false;if(!ready())return true;const clip='shadow_'+e.type.slice(7),spec=root.DTQuanLeVFX.clips[clip];if(!spec)return true;
    const age=1-e.life/e.maxLife,index=calm()?2:Math.min(spec.frames-1,Math.floor(age*spec.frames));P().screen(renderer.ctx,m=>{const p=P().point(m,e.x,e.y);draw(renderer.ctx,clip,index,p.x,p.y-(clip==='shadow_armor'?68:18),['shadow_crescent','shadow_slash'].includes(clip)?e.angle||0:0);if(clip==='shadow_legion')for(let i=0;i<14;i++){const a=i/14*Math.PI*2;draw(renderer.ctx,'shadow_portal',index,p.x+Math.cos(a)*e.r*Math.abs(m.a),p.y+Math.sin(a)*e.r*Math.abs(m.a))}});return true;
  }
  const R=root.DTRenderer.prototype,oldEffect=R.drawEffect,oldProjectile=R.drawProjectile;
  R.drawEffect=function(e){if(effect(this,e))return;return oldEffect.call(this,e)};
  R.drawProjectile=function(b){if(!b.shadow)return oldProjectile?.call(this,b);if(!ready())return;P().screen(this.ctx,m=>{const p=P().point(m,b.x,b.y);draw(this.ctx,'shadow_crescent',calm()?0:Math.floor(this.game.time*12)%6,p.x,p.y-24,b.angle||0)})};
  root.DTQuanLePixel={character,vfx,ready,hero,beast,remain,effect};
})(globalThis);
