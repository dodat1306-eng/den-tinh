(function(root){
  'use strict';
  const character=new Image(),vfx=new Image();character.src='assets/thienvu-pixel-v08.png';vfx.src='assets/thienvu-vfx-pixel.png';
  const calm=()=>!!root.DTSettings?.reducedMotion,low=()=>root.DTSettings?.graphics==='low'||root.DTTouch?.active&&root.DTSettings?.graphics!=='high';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),TAU=Math.PI*2;
  const ready=()=>!!root.DTThienVuAtlas&&!!root.DTThienVuVFX&&character.complete&&character.naturalWidth>0&&vfx.complete&&vfx.naturalWidth>0;
  const sourceCache=new Map(),rasters=new Map();let rasterBytes=0;
  function cache(key,cv){rasters.set(key,cv);rasterBytes+=cv.width*cv.height*4;while(rasters.size>64||rasterBytes>8*1024*1024){const first=rasters.keys().next().value,old=rasters.get(first);rasterBytes-=old.width*old.height*4;rasters.delete(first)}return cv}
  function screen(c,fn){const m=c.getTransform?.()||{a:1,b:0,c:0,d:1,e:0,f:0};c.save();try{c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;c.globalAlpha=1;c.globalCompositeOperation='source-over';fn(m)}finally{c.restore()}}
  function point(m,x,y){return{x:Math.round(m.a*x+m.c*y+m.e),y:Math.round(m.b*x+m.d*y+m.f)}}
  function cell(c,img,f,x,y,ax=f.w/2,ay=f.h/2,unit=2){c.drawImage(img,f.x,f.y,f.w,f.h,Math.round(x-ax*unit),Math.round(y-ay*unit),Math.round(f.w*unit),Math.round(f.h*unit))}
  function direction(angle=0){return Math.abs(Math.cos(angle))>=Math.abs(Math.sin(angle))?(Math.cos(angle)>=0?'E':'W'):(Math.sin(angle)>=0?'S':'N')}
  function frame(p,time=0,hurt=-Infinity){
    const form=p.elementForm||p.element||'lightning',meta=root.DTThienVuAtlas?.forms[form];if(!meta)return null;
    const a=p.action,hit=p.hit>0?Math.max(0,.18-p.hit):hurt;
    const key=p.dashTime>0?'dash':hit>=0&&hit<.18?'hit':a?.key==='attack'?'attack':a?.key==='q'?'q_cast':a?.key==='e'?'e_cast':a?.key==='r'?'r_ult':p.moving?'run':'idle';
    const clip=meta.actions[key],view=direction(a?.angle??p.facing??Math.PI/2);let f;
    if(a&&['attack','q_cast','e_cast','r_ult'].includes(key)){
      const release={attack:1,q_cast:2,e_cast:3,r_ult:3}[key],wind=Math.max(.001,a.release??a.windup??.16),duration=Math.max(wind+.001,a.duration||.65),elapsed=Math.max(0,a.elapsed||0);
      f=elapsed<wind?Math.floor(elapsed/wind*release):release+Math.floor((elapsed-wind)/(duration-wind)*(clip.frames-release));
    }else f=key==='dash'?Math.floor((.19-p.dashTime)*clip.fps):key==='hit'?Math.floor(hit*clip.fps):Math.floor(Math.max(0,time)*clip.fps)%clip.frames;
    if(calm())f=({attack:1,q_cast:2,e_cast:3,r_ult:3})[key]??0;
    f=clamp(f,0,clip.frames-1);return{key,form,direction:view,frame:f,cell:clip.directions[view][f]};
  }
  function pixels(f){
    const key=[f.x,f.y,f.w,f.h].join(':');if(sourceCache.has(key))return sourceCache.get(key);
    const cv=document.createElement('canvas');cv.width=f.w;cv.height=f.h;const c=cv.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=false;c.drawImage(vfx,f.x,f.y,f.w,f.h,0,0,f.w,f.h);
    const data=c.getImageData(0,0,f.w,f.h).data;sourceCache.set(key,data);return data;
  }
  function flip(c,key,f,x,y,unit=2,angle=0){
    const clip=root.DTThienVuVFX?.clips[key];if(!clip)return;
    f=clamp(Math.floor(f),0,clip.frames-1);const src=clip.cells[f];
    if(!angle){cell(c,vfx,src,x,y,src.w/2,src.h/2,unit);return}
    const size=Math.ceil(Math.hypot(src.w,src.h))+2,a=Math.round(angle*1000)/1000,cacheKey=key+':'+f+':'+a;
    let cv=rasters.get(cacheKey);
    if(!cv){cv=document.createElement('canvas');cv.width=cv.height=size;const oc=cv.getContext('2d'),data=oc.createImageData(size,size),source=pixels(src),co=Math.cos(a),si=Math.sin(a);
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=x-size/2+.5,dy=y-size/2+.5,sx=Math.floor(dx*co+dy*si+src.w/2),sy=Math.floor(-dx*si+dy*co+src.h/2);if(sx>=0&&sx<src.w&&sy>=0&&sy<src.h){const i=(sy*src.w+sx)*4;if(source[i+3]===255)data.data.set(source.subarray(i,i+4),(y*size+x)*4)}}
      oc.putImageData(data,0,0);cache(cacheKey,cv);
    }
    c.drawImage(cv,Math.round(x-size*unit/2),Math.round(y-size*unit/2),Math.round(size*unit),Math.round(size*unit));
  }
  function segment(c,key,f,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<2)return;
    const light=key==='light_beam',spec=root.DTThienVuVFX.clips,parts=light?['tail','body','head'].map(p=>spec[key+'_'+p]):[spec[key]];if(parts.some(p=>!p))return;
    f=clamp(Math.floor(f),0,parts[0].frames-1);const fs=parts.map(p=>p.cells[f]),pad=Math.max(...fs.map(p=>p.h))+2;
    const minX=Math.floor((Math.min(0,dx)-pad)/2),minY=Math.floor((Math.min(0,dy)-pad)/2),w=Math.ceil((Math.max(0,dx)+pad)/2)-minX,h=Math.ceil((Math.max(0,dy)+pad)/2)-minY;
    // ponytail: current skills fit 2048 world units; tile longer beams in chunks if new skills exceed that range.
    if(w*h>1024*1024)return;
    const cacheKey=['beam',key,f,dx,dy].join(':');let cv=rasters.get(cacheKey);
    if(!cv){cv=document.createElement('canvas');cv.width=w;cv.height=h;const oc=cv.getContext('2d'),data=oc.createImageData(w,h),sources=fs.map(pixels),ux=dx/len,uy=dy/len;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const rx=(x+minX)*2+1,ry=(y+minY)*2+1,along=rx*ux+ry*uy,across=-rx*uy+ry*ux;if(along<0||along>len)continue;
        const part=light?(along<48?0:along>len-48?2:1):0,src=fs[part],sy=Math.floor(across/2+src.h/2);if(sy<0||sy>=src.h)continue;
        const sx=part===2?clamp(src.w-1-Math.floor((len-along)/2),0,src.w-1):Math.floor(along/2)%src.w,i=(sy*src.w+sx)*4;if(sources[part][i+3]===255)data.data.set(sources[part].subarray(i,i+4),(y*w+x)*4);
      }
      oc.putImageData(data,0,0);cache(cacheKey,cv);
    }
    c.drawImage(cv,Math.round(a.x+minX*2),Math.round(a.y+minY*2),w*2,h*2);
  }
  function particles(c,x,y,form,age,count=6){if(calm())return;const pal=root.DTThienVuAtlas.forms[form]?.palette;if(!pal)return;for(let i=0;i<(low()?Math.min(3,count):count);i++){const a=i/Math.max(1,count)*TAU,r=12+age*26,size=[2,4,6][i%3];c.fillStyle=pal[11+i%4];c.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r*.65),size,size)}}
  function ghost(c,p,time,form,unit=2,elapsed=0){
    if(!ready()||calm())return;const pose=frame({...p,elementForm:form},time);if(!pose)return;
    screen(c,m=>{const s=point(m,p.x,p.y),f=pose.cell;for(let row=0;row<64;row+=4){if((row/4+Math.floor(elapsed*24))%3===0)continue;const shift=Math.round((row%8?1:-1)*elapsed*18);c.drawImage(character,f.x,f.y+row,64,2,Math.round(s.x-32*unit+shift),Math.round(s.y+(row-58)*unit),Math.round(64*unit),Math.round(2*unit))}});
  }
  function hero(c,p,time=0,hurt=-Infinity,clone=false,shadow=true){
    if(!ready())return false;const pose=frame(p,time,hurt);if(!pose)return false;const unit=clone?1.5:2;
    screen(c,m=>{const s=point(m,p.x,p.y);if(shadow)flip(c,'pixel_shadow',0,s.x,s.y+2,clone?1.5:2);
      if(!(p.invulnerable>0&&!calm()&&Math.floor(time*12)%2===0))cell(c,character,pose.cell,s.x,s.y,32,58,unit);
      if(p.shield>0)flip(c,'shield_'+pose.form,calm()?0:Math.floor(time*6)%2,s.x,s.y-48,clone?1.5:2);
      if(clone&&p.hp<p.maxHp){c.fillStyle='#100b18';c.fillRect(s.x-18,s.y+8,36,4);c.fillStyle=root.DTThienVuAtlas.forms[pose.form].palette[13];c.fillRect(s.x-17,s.y+9,Math.round(34*clamp(p.hp/p.maxHp,0,1)),2)}
    });return true;
  }
  const qKeys={lightning:'chain_bolt',wind:'wind_blade_q',earth:'earth_pillar',fire:'fire_dragon',ice:'ice_beam',nature:'vine_whip',light:'light_beam'};
  function projectile(renderer,b){if(!b.element)return false;if(!ready())return true;
    screen(renderer.ctx,m=>{const s=point(m,b.x,b.y),form=b.element,skill=b.sourceSkill==='q';const key=skill&&form==='wind'?'wind_blade_q':skill&&form==='fire'?'fire_dragon':'proj_'+form,clip=root.DTThienVuVFX.clips[key];
      if(clip)flip(renderer.ctx,key,calm()?0:Math.floor(renderer.game.time*16)%clip.frames,s.x,s.y-36,2,skill&&form==='wind'?0:b.angle||0);
    });return true;
  }
  function field(renderer,f,legacy=false){
    if(renderer.game.hero.id!=='thienvu'||!['wall','mirror','vortex','tornado','orbs','sigil','garden','vine'].includes(f.kind)&&!legacy)return false;
    if(!ready()||f.life<=0)return true;const g=renderer.game,form=f.element||g.element.id,time=calm()?0:g.time;
    screen(renderer.ctx,m=>{const c=renderer.ctx,s=point(m,f.x,f.y),r=Math.max(8,(f.r||100)*Math.abs(m.a)),index=Math.floor(time*10),kind=f.kind||(f.key==='r'?{wind:'tornado',ice:'nova',nature:'garden',fire:'orbs'}[form]:'')||{lightning:'sigil',wind:'vortex',earth:'wall',fire:'orbs',ice:'mirror',nature:'garden',light:'mirror'}[form];
      if(kind==='wall'||kind==='mirror'){
        const a=f.angle||0,start={x:s.x-Math.cos(a)*r,y:s.y-Math.sin(a)*r},end={x:s.x+Math.cos(a)*r,y:s.y+Math.sin(a)*r},key=kind==='wall'?'earth_wall':'crystal_mirror_'+(form==='light'?'light':'ice');
        const count=Math.max(2,Math.ceil(r*2/88));for(let i=0;i<=count;i++){const t=i/count;flip(c,key,index%4,start.x+(end.x-start.x)*t,start.y+(end.y-start.y)*t-20,2,a)}
        return;
      }
      const n=low()?8:12;
      for(let i=0;i<n;i++){const a=i/n*TAU,x=s.x+Math.cos(a)*r,y=s.y+Math.sin(a)*r;c.fillStyle=root.DTThienVuAtlas.forms[form].palette[13];c.fillRect(Math.round(x),Math.round(y),4,4)}
      if(kind==='orbs')for(let i=0;i<5;i++){const a=i/5*TAU+time*1.7;flip(c,'fire_orb',index%4,s.x+Math.cos(a)*r*.78,s.y+Math.sin(a)*r*.78-20)}
      else if(kind==='garden'||kind==='vine'){
        flip(c,kind==='vine'?'vine_root':'nature_garden',index%(kind==='vine'?5:6),s.x,s.y-16);
        if(kind==='garden')for(let i=0;i<(low()?4:7);i++){const a=i/7*TAU;flip(c,'vine_root',index%5,s.x+Math.cos(a)*r*.70,s.y+Math.sin(a)*r*.70-16,1)}
      }else if(kind==='vortex'||kind==='tornado')flip(c,'wind_'+kind,index%6,s.x,s.y-(kind==='tornado'?48:12),kind==='tornado'?3:2);
      else if(kind==='nova')for(let i=0;i<8;i++){const a=i/8*TAU;flip(c,'ice_nova_strip',index%4,s.x+Math.cos(a)*r*.85,s.y+Math.sin(a)*r*.85,2)}
      else flip(c,'lightning_sigil',index%5,s.x,s.y);
    });return true;
  }
  function effect(renderer,e){
    const g=renderer.game,own=e.hero==='thienvu'||g.hero.id==='thienvu'&&e.hero!=='hoavi'&&(/^(?:element-|choreo-)/.test(e.type)||['lightning','mythic-tether','mythic-rune','ring','blast','bolt','leaves','dashwake'].includes(e.type));
    if(!own)return false;if(!ready())return true;
    const age=clamp(1-e.life/Math.max(.001,e.maxLife),0,.999),form=e.element||(['bolt','lightning'].includes(e.type)?'lightning':g.element.id),step=(n)=>calm()?Math.floor(n/2):Math.min(n-1,Math.floor(age*n));
    screen(renderer.ctx,m=>{const c=renderer.ctx,s=point(m,e.x,e.y),dest=point(m,e.tx??e.x,e.ty??e.y);
      if(e.type==='element-transform'||e.type==='choreo-transform'){
        if(e.type==='choreo-transform')return;
        flip(c,'transform_ring_'+form,step(5),s.x,s.y);flip(c,'transform_pillar_'+form,step(5),s.x,s.y-56);
      }else if(e.type==='element-recall'){flip(c,'transform_ring_'+form,4-step(5),s.x,s.y);particles(c,s.x,s.y-36,form,age)}
      else if(e.type==='element-split'||e.type==='choreo-split'){
        if(e.type==='element-split')return;flip(c,'split_seal',step(6),s.x,s.y);
        if(!calm())for(const p of e.points||[]){const end=point(m,p.x,p.y);segment(c,'split_beam_'+p.element,step(6),{x:s.x,y:s.y-40},{x:end.x,y:end.y-32})}
      }else if(e.type==='element-convergence'){
        for(const p of e.points||[]){const a=point(m,p.x,p.y);segment(c,'split_beam_'+p.element,step(6),{x:a.x,y:a.y-42},s)}
        flip(c,'convergence_star',step(6),s.x,s.y);flip(c,'convergence_hub',step(6),s.x,s.y,age>.45?3:2);
      }else if(e.type==='element-beam'||e.type==='mythic-tether'||e.type==='lightning'){
        const key=e.type==='lightning'?'chain_bolt':qKeys[form];
        segment(c,key,step(key==='light_beam'?5:4),{x:s.x,y:s.y-36},{x:dest.x,y:dest.y-36});
        flip(c,form==='ice'?'ice_shatter':form==='nature'?'vine_root':'impact_'+form,step(form==='nature'?5:4),dest.x,dest.y-24);
      }else if(e.type==='element-muzzle'){const a=e.angle||0;flip(c,'muzzle_'+form,step(3),s.x+Math.round(Math.cos(a)*28),s.y-18+Math.round(Math.sin(a)*10),2,a)}
      else if(e.type==='element-impact'||e.type==='blast'||e.type==='bolt'){
        if(form==='ice'&&e.r>=75){const r=e.r*Math.abs(m.a);for(let i=0;i<(low()?8:12);i++){const a=i/(low()?8:12)*TAU;flip(c,'ice_nova_strip',step(4),s.x+Math.cos(a)*r,s.y+Math.sin(a)*r)}return}
        const key=form==='earth'?'earth_pillar':form==='lightning'?'sky_thunder':form==='ice'?'ice_shatter':form==='nature'?'vine_root':form==='fire'?'fire_dragon':'impact_'+form;
        const clip=root.DTThienVuVFX.clips[key];flip(c,key,step(clip.frames),s.x,s.y-(form==='lightning'?56:form==='earth'?40:20));particles(c,s.x,s.y-16,form,age);
      }else if(e.type==='choreo-hit'){flip(c,'impact_'+form,step(4),s.x,s.y-12);particles(c,s.x,s.y,form,age,4)}
      else if(e.type==='choreo-release'){
        if(e.key==='q')flip(c,'muzzle_'+form,step(3),s.x+Math.cos(e.angle||0)*30,s.y-44);
        else if(e.key==='r')particles(c,s.x,s.y-40,form,age,e.support?3:7);
      }else if(e.type==='element-cast'||e.type==='element-pulse'||e.type==='mythic-rune')return;
      else if(e.type==='dashwake')particles(c,s.x,s.y-32,form,age,6);
      else flip(c,'transform_ring_'+form,step(5),s.x,s.y);
    });return true;
  }
  function status(renderer,e){if(!ready())return;screen(renderer.ctx,m=>{const s=point(m,e.x,e.y);if(e.frozen>0)flip(renderer.ctx,'ice_shatter',calm()?1:Math.floor(renderer.game.time*6)%4,s.x,s.y-25);if(e.poison>0||e.rooted>0)flip(renderer.ctx,'vine_root',calm()?2:Math.floor(renderer.game.time*5)%5,s.x,s.y)})}
  root.DTThienVuPixel={character,vfx,ready,frame,hero,ghost,effect,projectile,field,status,screen,point,flip,segment,cacheStats:()=>({rasters:rasters.size,bytes:rasterBytes,sources:sourceCache.size})};
  character.onload=vfx.onload=()=>{if(ready())for(const cv of document.querySelectorAll('canvas[data-thienvu]')){const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);hero(c,{x:64,y:116,facing:Math.PI/2})}};
})(globalThis);
