(function(root){
  'use strict';
  const character=new Image(),vfx=new Image();character.src='assets/hoavi-pixel-v08.png';vfx.src='assets/hoavi-vfx-pixel.png';
  const calm=()=>!!root.DTSettings?.reducedMotion,low=()=>root.DTSettings?.graphics==='low',clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const rasterCache=new Map(),beamCache=new WeakMap();
  const ready=()=>character.complete&&character.naturalWidth>0&&vfx.complete&&vfx.naturalWidth>0;
  function matrix(c){return c.getTransform?.()||{a:1,b:0,c:0,d:1,e:0,f:0}}
  function point(m,x,y){return{x:Math.round(m.a*x+m.c*y+m.e),y:Math.round(m.b*x+m.d*y+m.f)}}
  // Pixels mean Canvas backing pixels: camera zoom never resamples a character cell.
  function screen(c,fn){const m=matrix(c);c.save();try{c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;c.globalAlpha=1;c.globalCompositeOperation='source-over';fn(m)}finally{c.restore()}}
  function cell(c,image,f,x,y,ax=f.w/2,ay=f.h/2,unit=2){if(!f)return;c.drawImage(image,f.x,f.y,f.w,f.h,Math.round(x-ax*unit),Math.round(y-ay*unit),f.w*unit,f.h*unit)}
  function flip(c,key,frame,x,y){const clip=root.DTHoaViVFX?.clips[key];if(clip)cell(c,vfx,clip.cells[clamp(Math.floor(frame),0,clip.frames-1)],x,y)}
  function direction(angle=0){return Math.abs(Math.cos(angle))>=Math.abs(Math.sin(angle))?(Math.cos(angle)>=0?'E':'W'):(Math.sin(angle)>=0?'S':'N')}
  function frame(p,time=0,hurt=-Infinity){
    const meta=root.DTHoaViAtlas;if(!meta)return null;const a=p.action,hit=p.hit>0?Math.max(0,.18-p.hit):hurt;
    const key=p.dashTime>0?'dash':hit>=0&&hit<.18?'hit':a?.key==='q'?'q_debug':a?.key==='e'?(a.blink?'e_blink':'e_cast'):a?.key==='r'?'r_overclock':a?.key==='attack'?'attack':p.moving?'run':'idle';
    const clip=meta.actions[key];if(!clip)return null;const facing=direction(root.DTBodyAngle(p));let f;
    if(a&&['attack','q_debug','e_cast','e_blink','r_overclock'].includes(key)){
      const release=key==='attack'?2:key==='r_overclock'?5:2,wind=Math.max(.001,a.release??a.windup??.16),duration=Math.max(wind+.001,a.duration||.65),elapsed=a.elapsed||0;
      f=elapsed<wind?Math.floor(elapsed/wind*release):release+Math.floor((elapsed-wind)/(duration-wind)*(clip.frames-release));
    }else if(key==='dash')f=Math.floor((.19-p.dashTime)*clip.fps);
    else if(key==='hit')f=Math.floor(hit*clip.fps);
    else f=Math.floor(Math.max(0,time)*clip.fps)%clip.frames;
    if(calm())f=['attack','q_debug','e_cast','e_blink'].includes(key)?2:key==='r_overclock'?5:0;
    f=clamp(f,0,clip.frames-1);return{key,direction:facing,frame:f,cell:clip.directions[facing][f]};
  }
  function hero(c,p,time=0,hurt=-Infinity,shadow=true,unit=2){
    if(!ready())return false;const pose=frame(p,time,hurt),meta=root.DTHoaViAtlas;if(!pose)return false;
    screen(c,m=>{const s=point(m,p.x,p.y);
      if(shadow)flip(c,'pixel_shadow',0,s.x,s.y+2);
      const slicing=p.action?.blink&&p.action.elapsed<.5&&!calm();
      if(!slicing&&!(p.invulnerable>0&&!calm()&&Math.floor(time*12)%2===0)){
        const f=shadow?pose.cell:meta.ghost[pose.direction][Math.min(5,pose.frame)];cell(c,character,f,s.x,s.y,32,58,unit);
      }
      if(shadow&&p.shield>0)flip(c,'pixel_shield',calm()?0:Math.floor(time*5)%2,s.x,s.y-48);
      if(p.action?.key==='q'&&p.action.elapsed<(p.action.release??.16)){const a=p.action.angle??p.facing??0;flip(c,'code_window',calm()?2:Math.floor(p.action.elapsed*30),s.x+Math.round(Math.cos(a)*52)+(Math.abs(Math.cos(a))<.5?26:0),s.y-24+Math.round(Math.sin(a)*12))}
      if(p.action?.key==='r')flip(c,'rune_keyboard',calm()?1:Math.floor(p.action.elapsed*18)%4,s.x,s.y-34);
    });return true;
  }
  function pixels(f){
    const key=[f.x,f.y,f.w,f.h].join(':');if(rasterCache.has(key))return rasterCache.get(key);
    const cv=document.createElement('canvas');cv.width=f.w;cv.height=f.h;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(vfx,f.x,f.y,f.w,f.h,0,0,f.w,f.h);
    const data=c.getImageData(0,0,f.w,f.h).data;rasterCache.set(key,data);return data;
  }
  function phase(e,kind='debug'){
    const elapsed=(e.maxLife||.35)-e.life;if(calm())return 1;
    return kind==='satellite'?clamp(Math.floor(elapsed/.35*4),0,3):elapsed<.05?0:elapsed<.14?1:elapsed<.22?2:elapsed<.29?3:4;
  }
  function beam(c,e,m,satellite=false){
    const a=point(m,e.x,e.y),b=point(m,e.tx??e.x,e.ty??e.y),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<2)return;
    const f=phase(e,satellite?'satellite':'debug'),key=[dx,dy,f,!!e.echo,satellite].join(':'),cached=beamCache.get(e);let raster=cached?.key===key?cached:null;
    if(!raster){
      const ux=dx/length,uy=dy/length,pad=34,minX=Math.floor((Math.min(0,dx)-pad)/2),minY=Math.floor((Math.min(0,dy)-pad)/2),w=Math.ceil((Math.max(0,dx)+pad)/2)-minX,h=Math.ceil((Math.max(0,dy)+pad)/2)-minY;
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;const oc=cv.getContext('2d'),data=oc.createImageData(w,h);
      const specs=root.DTHoaViVFX.clips,parts=satellite?[specs.satellite_beam.cells[f]]:['tail','body','head'].map(p=>specs['debug_beam_'+p].cells[f]),sources=parts.map(pixels);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const rx=(x+minX)*2+1,ry=(y+minY)*2+1,along=rx*ux+ry*uy,across=-rx*uy+ry*ux;
        if(along<Math.abs(ux)+Math.abs(uy)||along+Math.abs(ux)+Math.abs(uy)>length)continue;
        const part=satellite?0:along>Math.max(length-64,length*.65)?2:along<Math.min(64,length*.35)?0:1,src=parts[part],sy=Math.floor(across/2)+src.h/2;
        if(sy<0||sy>=src.h)continue;
        const sx=!satellite&&part===2?clamp(31-Math.floor((length-along)/2),0,31):Math.floor(along/2)%src.w,si=(Math.floor(sy)*src.w+sx)*4,di=(y*w+x)*4,source=sources[part];
        if(source[si+3]!==255)continue;
        data.data.set(source.subarray(si,si+4),di);
        if(e.echo&&source[si]===31&&source[si+1]===200){data.data[di]=242;data.data[di+1]=145;data.data[di+2]=199}
      }
      oc.putImageData(data,0,0);raster={key,cv,x:minX*2,y:minY*2};beamCache.set(e,raster);
    }
    c.drawImage(raster.cv,Math.round(a.x+raster.x),Math.round(a.y+raster.y-34),raster.cv.width*2,raster.cv.height*2);
  }
  function particles(c,x,y,age,count=6){
    if(calm()||low())return;
    for(let i=0;i<count;i++){const a=i*Math.PI*2/count,r=10+age*24,size=[2,4,6][i%3];c.fillStyle=['#66fff7','#f291c7','#1fc8db'][i%3];c.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r*.65),size,size)}
  }
  function effect(renderer,e){
    const g=renderer.game,own=e.hero==='hoavi'||g.hero.id==='hoavi'&&(['choreo-code-shot','choreo-code-echo','choreo-code-wait','overclock'].includes(e.type)||e.type==='element-beam'||e.type==='mythic-orbit'||e.type==='mythic-rune'&&['q','e','r','checkpoint'].includes(e.key));
    if(!own)return false;
    if(!ready())return true;
    const age=clamp(1-e.life/Math.max(.001,e.maxLife),0,.999),elapsed=age*e.maxLife;
    screen(renderer.ctx,m=>{const c=renderer.ctx,s=point(m,e.x,e.y);
      if(e.type==='element-beam'){if(e.key!=='blink')beam(c,e,m,e.key==='satellite');return}
      if(e.type==='choreo-code-wait'||e.type==='choreo-code-echo'){
        const dir=direction(e.angle),f=calm()?2:e.type==='choreo-code-wait'?Math.min(1,Math.floor(age*2)):Math.min(5,2+Math.floor(age*4));cell(c,character,root.DTHoaViAtlas.ghost[dir][f],s.x,s.y,32,58);return;
      }
      if(e.type==='choreo-pixel-blink'){
        const f=frame({facing:e.angle,action:{key:'e',blink:true,elapsed:elapsed,duration:.5,release:.16}},g.time).cell;
        for(const [pos,arrive]of [[s,false],[point(m,e.tx,e.ty),true]]){
          flip(c,'checkpoint_column',calm()?2:Math.floor(age*5),pos.x,pos.y-56);
          if(!calm())for(let j=0;j<12;j++){
            const sy=Math.floor(j*64/12),sh=Math.floor((j+1)*64/12)-sy,spread=arrive?Math.cos(age*Math.PI/2):Math.sin(age*Math.PI/2),shift=Math.round((j%2?1:-1)*spread*28);
            c.drawImage(character,f.x,f.y+sy,64,sh,Math.round(pos.x-64+shift),Math.round(pos.y-116+sy*2),128,sh*2);
          }
        }
        if(!calm())for(let i=1;i<10;i++){const t=i/10;c.fillStyle=i%2?'#1fc8db':'#f291c7';c.fillRect(Math.round(s.x+(e.tx-e.x)*m.a*t),Math.round(s.y+(e.ty-e.y)*m.d*t)-12,4,4)}
        return;
      }
      if(e.type==='choreo-code-shot'){flip(c,'muzzle_snap',calm()?1:Math.floor(age*4),s.x+Math.round(Math.cos(e.angle)*26),s.y-34+Math.round(Math.sin(e.angle)*10));return}
      if(e.type==='choreo-hit'){flip(c,'hit_glitch',calm()?1:Math.floor(age*5),s.x,s.y-12);particles(c,s.x,s.y-12,age,low()?2:6);return}
      if(e.type==='choreo-release'){
        if(e.key==='q'){flip(c,'code_window',calm()?2:Math.min(5,Math.floor(age*6)),s.x+Math.round(Math.cos(e.angle)*52)+(Math.abs(Math.cos(e.angle))<.5?26:0),s.y-24+Math.round(Math.sin(e.angle)*12));return}
        if(e.key==='e')return;
        if(e.key==='r'){particles(c,s.x,s.y-38,age);return}
      }
      if(e.type==='mythic-rune'&&e.key==='checkpoint'){if(g.checkpoint)flip(c,'checkpoint_seal',calm()?0:Math.floor(g.time*8)%8,s.x,s.y)}
      else if(e.type==='mythic-rune'&&e.key==='q')return;
      else if(e.type==='mythic-rune'&&e.key==='e')flip(c,'checkpoint_seal',calm()?0:Math.floor(age*8),s.x,s.y);
      else if(e.type==='overclock')particles(c,s.x,s.y-38,age,8);
    });return true;
  }
  function projectile(renderer,b){if(!(b.friendly&&b.kind==='code'))return false;if(!ready())return true;
    screen(renderer.ctx,m=>{const s=point(m,b.x,b.y),clip=root.DTHoaViVFX.clips.code_bolt,f=calm()?0:Math.floor(renderer.game.time*18)%4;
      // Nearest source sampling follows actual aim without blended edge colors.
      const a=b.angle||0,key='bolt:'+f+':'+a;let cv=rasterCache.get(key);
      if(!cv){cv=document.createElement('canvas');cv.width=cv.height=32;const c=cv.getContext('2d'),data=c.createImageData(32,32),src=pixels(clip.cells[f]);
        for(let y=0;y<32;y++)for(let x=0;x<32;x++){const dx=x-16,dy=y-16,sx=Math.round(dx*Math.cos(a)+dy*Math.sin(a)+14),sy=Math.round(-dx*Math.sin(a)+dy*Math.cos(a)+7);if(sx>=0&&sx<28&&sy>=0&&sy<14){const i=(sy*28+sx)*4;if(src[i+3]===255)data.data.set(src.subarray(i,i+4),(y*32+x)*4)}}
        c.putImageData(data,0,0);rasterCache.set(key,cv);if(rasterCache.size>192)rasterCache.delete(rasterCache.keys().next().value)}
      renderer.ctx.drawImage(cv,s.x-32,s.y-66,64,64);
    });return true;
  }
  function fault(renderer,e){if(!(e.codeFault>0))return;
    screen(renderer.ctx,m=>{const s=point(m,e.x,e.y-(e.r||15));const t=calm()?0:Math.floor(renderer.game.time*8)%4;flip(renderer.ctx,'fault_mark',t,s.x,s.y-24);
      if(!calm()){renderer.ctx.fillStyle='#ff3b6b';renderer.ctx.fillRect(s.x-12+(t%2)*6,s.y+2,12,4);renderer.ctx.fillStyle='#1fc8db';renderer.ctx.fillRect(s.x+2-(t%2)*4,s.y+10,12,4)}
    });
  }
  function field(renderer,f){if(f.kind!=='satellites'||renderer.game.hero.id!=='hoavi')return false;if(!ready())return true;
    const g=renderer.game;screen(renderer.ctx,m=>{for(const side of [-1,1]){
      const a=g.time*1.7+side*Math.PI/2,x=g.player.x+Math.cos(a)*100,y=g.player.y+Math.sin(a)*75,s=point(m,x,y),aim=f.pixelAim?.find(p=>p.side===side),angle=aim?Math.atan2(aim.ty-y,aim.tx-x):a;
      flip(renderer.ctx,'satellite_drone',(Math.round(angle/(Math.PI/4))+8)%8,s.x,s.y-34);
    }});return true;
  }
  root.DTHoaViPixel={character,vfx,ready,frame,hero,effect,projectile,fault,field,screen,point,beam};
  character.onload=vfx.onload=()=>{if(ready())for(const cv of document.querySelectorAll('canvas[data-hoavi]')){const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);hero(c,{x:64,y:116,facing:Math.PI/2})}};
})(globalThis);
