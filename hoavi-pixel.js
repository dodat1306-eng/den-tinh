(function(root){
  'use strict';
  const portraitImg=new Image(),keyartImg=new Image(),locomotion=new Image(),actions=new Image(),skills=new Image(),ultR=new Image(),vfx=new Image();
  const VIEWS=['S','E','N','W'],TAU=Math.PI*2;
  const LCW=104,LCH=96,LAX=52,LAY=80,LCOLS=20;
  const ACW=112,ACH=100,AAX=56,AAY=82,ACOLS=30;
  const SCW=112,SCH=100,SAX=56,SAY=82,SCOLS=30;
  const UCW=160,UCH=120,UAX=80,UAY=96,UCOLS=20;

  const PALETTE=[
    '#12091a','#071824','#f6c9b2','#dca088','#b87664','#1b1026','#2e1c44','#523478',
    '#261338','#482466','#733d9c','#a566cc','#9c897e','#d6c3b4','#f2e5d8','#8c5622',
    '#cf8d36','#f7cb63','#f291c7','#0b2b3d','#126b82','#1fc8db','#66fff7','#eeffff','#ff3b6b'
  ];

  const VFX_CLIPS={
    satellite_eye:{frames:36,w:40,h:40,cells:Array.from({length:36},(_,i)=>({x:(i%24)*40,y:Math.floor(i/24)*40,w:40,h:40}))},
    checkpoint_lotus:{frames:24,w:72,h:72,cells:Array.from({length:24},(_,i)=>({x:(i%12)*72,y:80+Math.floor(i/12)*72,w:72,h:72}))},
    blink_pillar:{frames:24,w:40,h:88,cells:Array.from({length:24},(_,i)=>({x:i*40,y:224,w:40,h:88}))},
    code_bolt:{frames:16,w:36,h:20,cells:Array.from({length:16},(_,i)=>({x:i*36,y:320,w:36,h:20}))},
    fault_mark:{frames:16,w:28,h:28,cells:Array.from({length:16},(_,i)=>({x:i*28,y:344,w:28,h:28}))},
    pixel_shield:{frames:16,w:56,h:68,cells:Array.from({length:16},(_,i)=>({x:i*56,y:380,w:56,h:68}))},
    debug_beam_tail:{frames:5,w:32,h:32,cells:Array.from({length:5},(_,i)=>({x:i*32,y:456,w:32,h:32}))},
    debug_beam_body:{frames:5,w:32,h:32,cells:Array.from({length:5},(_,i)=>({x:160+i*32,y:456,w:32,h:32}))},
    debug_beam_head:{frames:5,w:32,h:32,cells:Array.from({length:5},(_,i)=>({x:320+i*32,y:456,w:32,h:32}))},
    satellite_beam:{frames:4,w:32,h:16,cells:Array.from({length:4},(_,i)=>({x:480+i*32,y:456,w:32,h:16}))},
    pixel_shadow:{frames:1,w:32,h:8,cells:[{x:608,y:456,w:32,h:8}]},
    code_window:{frames:8,w:40,h:32,cells:Array.from({length:8},(_,i)=>({x:i*40,y:492,w:40,h:32}))},
    muzzle_snap:{frames:8,w:28,h:28,cells:Array.from({length:8},(_,i)=>({x:320+i*28,y:492,w:28,h:28}))},
    hit_glitch:{frames:8,w:36,h:36,cells:Array.from({length:8},(_,i)=>({x:544+i*36,y:492,w:36,h:36}))}
  };

  root.DTHoaViAtlas={
    version:'2.0.0',
    image:'assets/hoavi-locomotion.png',
    width:LCW*LCOLS,
    height:LCH*12,
    views:VIEWS,
    palette:PALETTE,
    sheets:{
      portrait:{image:'assets/hoavi-portrait.png',width:128,height:128},
      keyart:{image:'assets/hoavi-keyart.png',width:180,height:210},
      locomotion:{image:'assets/hoavi-locomotion.png',width:2080,height:1152,cw:LCW,ch:LCH,ax:LAX,ay:LAY,cols:LCOLS,frames:240},
      actions:{image:'assets/hoavi-actions.png',width:3360,height:3000,cw:ACW,ch:ACH,ax:AAX,ay:AAY,cols:ACOLS,frames:900},
      skills:{image:'assets/hoavi-skills.png',width:3360,height:2400,cw:SCW,ch:SCH,ax:SAX,ay:SAY,cols:SCOLS,frames:720},
      ultR:{image:'assets/hoavi-ult-r.png',width:3200,height:1800,cw:UCW,ch:UCH,ax:UAX,ay:UAY,cols:UCOLS,frames:300},
      vfx:{image:'assets/hoavi-vfx.png',width:960,height:540,frames:199}
    },
    actions:{
      idle:{frames:30,fps:30,loop:true},
      run:{frames:30,fps:36,loop:true},
      dash:{frames:45,fps:45,loop:false},
      hit:{frames:45,fps:36,loop:false},
      interact_shrine:{frames:180,fps:36,loop:false},
      interact_relic:{frames:180,fps:36,loop:false},
      interact_terminal:{frames:180,fps:36,loop:false},
      attack:{frames:60,fps:40,loop:false},
      q_debug:{frames:60,fps:40,loop:false},
      e_cast:{frames:30,fps:40,loop:false},
      e_blink:{frames:30,fps:40,loop:false},
      r_overclock:{frames:300,fps:45,loop:false}
    }
  };
  root.DTHoaViVFX={image:'assets/hoavi-vfx.png',width:960,height:540,clips:VFX_CLIPS};

  const calm=()=>!!root.DTSettings?.reducedMotion,low=()=>root.DTSettings?.graphics==='low',clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const loaded=img=>img.complete&&img.naturalWidth>0;
  const v2Ready=()=>loaded(portraitImg)&&loaded(keyartImg)&&loaded(locomotion)&&loaded(actions)&&loaded(skills)&&loaded(ultR)&&loaded(vfx);
  const ready=()=>v2Ready();

  const rasterCache=new Map(),sourceCache=new Map(),beamCache=new WeakMap();
  const interactStates=new WeakMap(),attackCombos=new WeakMap();

  function matrix(c){return c.getTransform?.()||{a:1,b:0,c:0,d:1,e:0,f:0}}
  function point(m,x,y){return{x:Math.round(m.a*x+m.c*y+m.e),y:Math.round(m.b*x+m.d*y+m.f)}}
  function screen(c,fn){const m=matrix(c);c.save();try{c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;c.globalAlpha=1;c.globalCompositeOperation='source-over';fn(m)}finally{c.restore()}}
  function cell(c,image,f,x,y,ax=f.w/2,ay=f.h/2,unit=2){if(!f)return;c.drawImage(image,f.x,f.y,f.w,f.h,Math.round(x-ax*unit),Math.round(y-ay*unit),Math.round(f.w*unit),Math.round(f.h*unit))}
  function flip(c,key,frameIndex,x,y,unit=2){const clip=VFX_CLIPS[key];if(!clip)return;const i=((Math.floor(frameIndex)%clip.frames)+clip.frames)%clip.frames;cell(c,vfx,clip.cells[i],x,y,clip.w/2,clip.h/2,unit)}
  function direction(angle=0){return Math.abs(Math.cos(angle))>=Math.abs(Math.sin(angle))?(Math.cos(angle)>=0?'E':'W'):(Math.sin(angle)>=0?'S':'N')}

  function frame(p,time=0,hurt=-Infinity){
    const a=p.action,hit=p.hit>0?Math.max(0,.18-p.hit):hurt,still=calm(),t=Math.max(0,time||0);
    const facing=direction(root.DTBodyAngle?root.DTBodyAngle(p):p.facing||0),vIdx=Math.max(0,VIEWS.indexOf(facing));
    const inter=p.interactKey?{kind:p.interactKey,elapsed:p.interactElapsed||0,duration:p.interactDuration||5}:interactStates.get(p);
    const activeInter=!a&&!(p.dashTime>0)&&!(hit>=0&&hit<.18)&&!p.moving&&inter&&(p.interactKey||(t>=inter.start&&t-inter.start<inter.duration));

    if(activeInter){
      const elapsed=p.interactKey?inter.elapsed:(t-inter.start),dur=Math.max(.1,inter.duration||2.4);
      const local=still?125:clamp(Math.floor(elapsed/dur*180),0,179);
      const base=inter.kind==='interact_shrine'?360:inter.kind==='interact_relic'?540:720;
      const idx=base+local,sx=(idx%ACOLS)*ACW,sy=Math.floor(idx/ACOLS)*ACH;
      return{key:inter.kind,direction:'S',frame:local,sheet:actions,cw:ACW,ch:ACH,ax:AAX,ay:AAY,sx,sy,cell:{x:sx,y:sy,w:ACW,h:ACH}};
    }

    const key=p.dashTime>0?'dash':hit>=0&&hit<.18?'hit':a?.key==='q'?'q_debug':a?.key==='e'?(a.blink?'e_blink':'e_cast'):a?.key==='r'?'r_overclock':a?.key==='attack'?'attack':p.moving?'run':'idle';
    if(key==='idle'||key==='run'){
      const fps=key==='run'?36:30,local=still?0:Math.floor(t*fps)%30;
      const idx=(key==='run'?120:0)+vIdx*30+local,sx=(idx%LCOLS)*LCW,sy=Math.floor(idx/LCOLS)*LCH;
      return{key,direction:facing,frame:local,sheet:locomotion,cw:LCW,ch:LCH,ax:LAX,ay:LAY,sx,sy,cell:{x:sx,y:sy,w:LCW,h:LCH}};
    }
    if(key==='dash'){
      const local=still?16:clamp(Math.floor((.19-p.dashTime)/.19*45),0,44);
      const idx=vIdx*45+local,sx=(idx%ACOLS)*ACW,sy=Math.floor(idx/ACOLS)*ACH;
      return{key,direction:facing,frame:local,sheet:actions,cw:ACW,ch:ACH,ax:AAX,ay:AAY,sx,sy,cell:{x:sx,y:sy,w:ACW,h:ACH}};
    }
    if(key==='hit'){
      const local=still?14:clamp(Math.floor(hit/.18*45),0,44);
      const idx=180+vIdx*45+local,sx=(idx%ACOLS)*ACW,sy=Math.floor(idx/ACOLS)*ACH;
      return{key,direction:facing,frame:local,sheet:actions,cw:ACW,ch:ACH,ax:AAX,ay:AAY,sx,sy,cell:{x:sx,y:sy,w:ACW,h:ACH}};
    }
    if(key==='r_overclock'){
      const dur=Math.max(.05,a?.duration||.85),el=clamp(a?.elapsed||0,0,dur);
      const idx=still?205:clamp(Math.floor(el/dur*300),0,299),sx=(idx%UCOLS)*UCW,sy=Math.floor(idx/UCOLS)*UCH;
      return{key,direction:facing,frame:idx,sheet:ultR,cw:UCW,ch:UCH,ax:UAX,ay:UAY,sx,sy,cell:{x:sx,y:sy,w:UCW,h:UCH}};
    }
    if(key==='attack'){
      const combo=Number.isInteger(p.comboIndex)?clamp(p.comboIndex,0,2):(attackCombos.get(p)||0)%3;
      const dur=Math.max(.05,a?.duration||.32),el=clamp(a?.elapsed||0,0,dur);
      const cf=still?9:clamp(Math.floor(el/dur*20),0,19);
      const local=combo*20+cf,idx=vIdx*60+local,sx=(idx%SCOLS)*SCW,sy=Math.floor(idx/SCOLS)*SCH;
      return{key,direction:facing,frame:local,sheet:skills,cw:SCW,ch:SCH,ax:SAX,ay:SAY,sx,sy,cell:{x:sx,y:sy,w:SCW,h:SCH}};
    }
    if(key==='q_debug'){
      const wind=Math.max(.001,a?.release??a?.windup??.16),dur=Math.max(wind+.001,a?.duration||.65),el=clamp(a?.elapsed||0,0,dur);
      const local=still?24:el<wind?clamp(Math.floor(el/wind*18),0,17):18+clamp(Math.floor((el-wind)/(dur-wind)*42),0,41);
      const idx=240+vIdx*60+local,sx=(idx%SCOLS)*SCW,sy=Math.floor(idx/SCOLS)*SCH;
      return{key,direction:facing,frame:local,sheet:skills,cw:SCW,ch:SCH,ax:SAX,ay:SAY,sx,sy,cell:{x:sx,y:sy,w:SCW,h:SCH}};
    }
    const wind=Math.max(.001,a?.release??a?.windup??.16),dur=Math.max(wind+.001,a?.duration||.65),el=clamp(a?.elapsed||0,0,dur);
    const local=still?14:el<wind?clamp(Math.floor(el/wind*11),0,10):11+clamp(Math.floor((el-wind)/(dur-wind)*19),0,18);
    const idx=(key==='e_blink'?600:480)+vIdx*30+local,sx=(idx%SCOLS)*SCW,sy=Math.floor(idx/SCOLS)*SCH;
    return{key,direction:facing,frame:local,sheet:skills,cw:SCW,ch:SCH,ax:SAX,ay:SAY,sx,sy,cell:{x:sx,y:sy,w:SCW,h:SCH}};
  }

  function portrait(c,w,h,bob=0){
    if(!loaded(portraitImg))return false;
    c.save();c.imageSmoothingEnabled=false;
    const pad=w>=120?0:4;
    c.drawImage(portraitImg,pad,Math.round(pad+bob),Math.round(w-pad*2),Math.round(h-pad*2));
    c.restore();return true;
  }

  function ultIntro(c,x,y,t,isCalm=false){
    if(!loaded(ultR))return false;
    const idx=isCalm?205:clamp(Math.floor(clamp(t/4.5,0,.9999)*300),0,299);
    const sx=(idx%UCOLS)*UCW,sy=Math.floor(idx/UCOLS)*UCH,unit=3;
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(ultR,sx,sy,UCW,UCH,Math.round(x-UAX*unit),Math.round(y+18-UAY*unit),UCW*unit,UCH*unit);
    c.restore();return true;
  }

  function drawScanlineGhost(c,pose,sx,sy,unit=2,spread=0){
    const sh=pose.sheet;if(!loaded(sh))return;
    for(let row=0;row<pose.ch;row+=4){
      if((row/4)%3===2)continue;
      const shift=Math.round(((row/4)%2?1:-1)*spread)*unit;
      c.drawImage(sh,pose.sx,pose.sy+row,pose.cw,2,Math.round(sx-pose.ax*unit+shift),Math.round(sy+(row-pose.ay)*unit),Math.round(pose.cw*unit),Math.round(2*unit));
    }
  }

  function hero(c,p,time=0,hurt=-Infinity,shadow=true,unit=2){
    if(!ready())return false;
    const cv=c.canvas;
    if(cv?.id==='titleArt'&&loaded(keyartImg)){
      screen(c,m=>{const s=point(m,p.x,p.y);c.drawImage(keyartImg,Math.round(s.x-180),Math.round(s.y-396),360,420)});
      return true;
    }
    if((cv?.hasAttribute?.('data-hoavi')||cv?.closest?.('#heroCards .hero-card'))&&loaded(portraitImg)){
      c.save();c.imageSmoothingEnabled=false;
      const side=Math.min(cv.width||128,cv.height||128);
      c.drawImage(portraitImg,Math.round(((cv.width||128)-side)/2),Math.round(((cv.height||128)-side)/2),side,side);
      c.restore();return true;
    }
    const pose=frame(p,time,hurt);if(!pose||!loaded(pose.sheet))return false;
    screen(c,m=>{const s=point(m,p.x,p.y);
      if(shadow)flip(c,'pixel_shadow',0,s.x,s.y+2,2);
      const slicing=p.action?.blink&&p.action.elapsed<.5&&!calm();
      if(!slicing&&!(p.invulnerable>0&&!calm()&&Math.floor(time*12)%2===0)){
        if(shadow){
          c.drawImage(pose.sheet,pose.sx,pose.sy,pose.cw,pose.ch,Math.round(s.x-pose.ax*unit),Math.round(s.y-pose.ay*unit),Math.round(pose.cw*unit),Math.round(pose.ch*unit));
        }else{
          drawScanlineGhost(c,pose,s.x,s.y,unit,1);
        }
      }
      if(shadow&&p.shield>0)flip(c,'pixel_shield',calm()?0:Math.floor(time*30)%16,s.x,s.y-64,unit);
    });return true;
  }

  function pixels(f,img=vfx){
    const key=[img.src,f.x,f.y,f.w,f.h].join(':');if(sourceCache.has(key))return sourceCache.get(key);
    const cv=document.createElement('canvas');cv.width=f.w;cv.height=f.h;const c=cv.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=false;c.drawImage(img,f.x,f.y,f.w,f.h,0,0,f.w,f.h);
    const data=c.getImageData(0,0,f.w,f.h).data;sourceCache.set(key,data);return data;
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
      const parts=satellite?[VFX_CLIPS.satellite_beam.cells[f]]:['tail','body','head'].map(p=>VFX_CLIPS['debug_beam_'+p].cells[f]),sources=parts.map(p=>pixels(p,vfx));
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
    c.drawImage(raster.cv,Math.round(a.x+raster.x),Math.round(a.y+raster.y-(satellite?0:34)),raster.cv.width*2,raster.cv.height*2);
  }
  function particles(c,x,y,age,count=6){
    if(calm()||low())return;
    for(let i=0;i<count;i++){const a=i*TAU/count,r=10+age*24,size=[2,4,6][i%3];c.fillStyle=['#66fff7','#f291c7','#1fc8db'][i%3];c.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r*.65),size,size)}
  }
  function effect(renderer,e){
    const g=renderer.game,own=e.hero==='hoavi'||g.hero.id==='hoavi'&&(['choreo-code-shot','choreo-code-echo','choreo-code-wait','overclock'].includes(e.type)||e.type==='element-beam'||e.type==='mythic-orbit'||e.type==='mythic-rune'&&['q','e','r','checkpoint'].includes(e.key));
    if(!own)return false;
    if(!ready())return true;
    const age=clamp(1-e.life/Math.max(.001,e.maxLife),0,.999),elapsed=age*e.maxLife;
    screen(renderer.ctx,m=>{const c=renderer.ctx,s=point(m,e.x,e.y);
      if(e.type==='element-beam'){if(e.key!=='blink')beam(c,e,m,e.key==='satellite');return}
      if(e.type==='choreo-code-wait'||e.type==='choreo-code-echo'){
        const pose=frame({facing:e.angle,action:{key:'q',elapsed:e.type==='choreo-code-wait'?.08:.28,duration:.65,release:.16}},g.time);
        drawScanlineGhost(c,pose,s.x,s.y,2,calm()?0:Math.round(age*3));
        return;
      }
      if(e.type==='choreo-pixel-blink'){
        const pose=frame({facing:e.angle,action:{key:'e',blink:true,elapsed,duration:.5,release:.16}},g.time);
        for(const [pos,arrive]of [[s,false],[point(m,e.tx,e.ty),true]]){
          flip(c,'blink_pillar',calm()?12:clamp(Math.floor(age*24),0,23),pos.x,pos.y-44,2);
          if(!calm()&&loaded(pose.sheet)){
            const spread=arrive?Math.cos(age*Math.PI/2):Math.sin(age*Math.PI/2);
            for(let j=0;j<16;j++){
              const sy=Math.floor(j*pose.ch/16),sh=Math.floor((j+1)*pose.ch/16)-sy,shift=Math.round((j%2?1:-1)*spread*28);
              c.drawImage(pose.sheet,pose.sx,pose.sy+sy,pose.cw,sh,Math.round(pos.x-pose.ax*2+shift),Math.round(pos.y-pose.ay*2+sy*2),pose.cw*2,sh*2);
            }
          }
        }
        if(!calm())for(let i=1;i<14;i++){const t=i/14;c.fillStyle=i%2?'#66fff7':'#f291c7';c.fillRect(Math.round(s.x+(e.tx-e.x)*m.a*t),Math.round(s.y+(e.ty-e.y)*m.d*t)-20,4,4)}
        return;
      }
      if(e.type==='choreo-code-shot'){flip(c,'muzzle_snap',calm()?2:Math.min(7,Math.floor(age*8)),s.x+Math.round(Math.cos(e.angle)*28),s.y-36+Math.round(Math.sin(e.angle)*10),2);return}
      if(e.type==='choreo-hit'){const y=s.y-(e.key==='satellite'?0:12);flip(c,'hit_glitch',calm()?2:Math.min(7,Math.floor(age*8)),s.x,y,2);particles(c,s.x,y,age,low()?2:6);return}
      if(e.type==='choreo-release'){
        if(e.key==='q'){flip(c,'code_window',calm()?2:Math.min(7,Math.floor(age*8)),s.x+Math.round(Math.cos(e.angle)*54)+(Math.abs(Math.cos(e.angle))<.5?28:0),s.y-28+Math.round(Math.sin(e.angle)*12),2);return}
        if(e.key==='e')return;
        if(e.key==='r'){particles(c,s.x,s.y-42,age,10);return}
      }
      if(e.type==='mythic-rune'&&e.key==='checkpoint'){if(g.checkpoint)flip(c,'checkpoint_lotus',calm()?0:Math.floor(g.time*30)%24,s.x,s.y,2)}
      else if(e.type==='mythic-rune'&&e.key==='q')return;
      else if(e.type==='mythic-rune'&&e.key==='e')flip(c,'checkpoint_lotus',calm()?0:Math.floor(age*24),s.x,s.y,2);
      else if(e.type==='overclock')particles(c,s.x,s.y-40,age,10);
    });return true;
  }
  function projectile(renderer,b){if(!(b.friendly&&b.kind==='code'))return false;if(!ready())return true;
    screen(renderer.ctx,m=>{const s=point(m,b.x,b.y),f=calm()?0:Math.floor(renderer.game.time*36)%16;
      const a=Math.round((b.angle||0)*1000)/1000,key='bolt:'+f+':'+a;let cv=rasterCache.get(key);
      if(!cv){
        cv=document.createElement('canvas');cv.width=cv.height=40;const c=cv.getContext('2d'),data=c.createImageData(40,40);
        const src=pixels(VFX_CLIPS.code_bolt.cells[f],vfx),co=Math.cos(a),si=Math.sin(a);
        for(let y=0;y<40;y++)for(let x=0;x<40;x++){
          const dx=x-20,dy=y-20,sx=Math.round(dx*co+dy*si+18),sy=Math.round(-dx*si+dy*co+10);
          if(sx>=0&&sx<36&&sy>=0&&sy<20){const i=(sy*36+sx)*4;if(src[i+3]===255)data.data.set(src.subarray(i,i+4),(y*40+x)*4)}
        }
        c.putImageData(data,0,0);rasterCache.set(key,cv);if(rasterCache.size>256)rasterCache.delete(rasterCache.keys().next().value);
      }
      renderer.ctx.drawImage(cv,s.x-40,s.y-72,80,80);
    });return true;
  }
  function fault(renderer,e){if(!(e.codeFault>0)||!ready())return;
    screen(renderer.ctx,m=>{const s=point(m,e.x,e.y-(e.r||15));const t=calm()?0:Math.floor(renderer.game.time*30)%16;
      flip(renderer.ctx,'fault_mark',t,s.x,s.y-24,2);
      if(!calm()){renderer.ctx.fillStyle='#ff3b6b';renderer.ctx.fillRect(s.x-12+(t%2)*6,s.y+2,12,4);renderer.ctx.fillStyle='#1fc8db';renderer.ctx.fillRect(s.x+2-(t%2)*4,s.y+10,12,4)}
    });
  }
  function field(renderer,f){if(f.kind!=='satellites'||renderer.game.hero.id!=='hoavi')return false;if(!ready())return true;
    const g=renderer.game;screen(renderer.ctx,m=>{for(let i=0;i<(f.count||6);i++){
      const o=root.DTSatellitePose(f,g.player,i),s=point(m,o.x,o.y),aim=f.pixelAim?.find(p=>p.eye===i),angle=aim?Math.atan2(aim.ty-o.y,aim.tx-o.x):o.angle;
      const idx=calm()?0:((Math.round(angle/(TAU/36))%36)+36)%36;
      flip(renderer.ctx,'satellite_eye',idx,s.x,s.y,2);
    }});return true;
  }

  const G=root.DTGame?.prototype;
  if(G){
    const oldFire=G.fire,oldInteract=G.interact;
    if(oldFire)G.fire=function(...args){
      const ok=oldFire.apply(this,args);
      if(ok&&this.hero?.id==='hoavi'&&this.player)attackCombos.set(this.player,((attackCombos.get(this.player)??-1)+1)%3);
      return ok;
    };
    if(oldInteract)G.interact=function(...args){
      const target=this.hero?.id==='hoavi'?this.nearby?.():null;
      const ok=oldInteract.apply(this,args);
      if(ok&&target&&this.hero?.id==='hoavi'&&this.player){
        const kind=(target.guardians||target.id==='altar'||target.id==='well'||target.worldFeature)?'interact_shrine'
          :(target.relicDrop||target.relicPedestal||target.trialNode||target.bossAltar||target.open===false)?'interact_relic'
          :'interact_terminal';
        interactStates.set(this.player,{kind,start:this.time||0,duration:2.4});
      }
      return ok;
    };
  }

  function redrawMenu(){
    if(typeof document==='undefined'||!ready())return;
    for(const cv of document.querySelectorAll('canvas[data-hoavi]')){
      const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);
      hero(c,{x:64,y:116,facing:Math.PI/2});
    }
    const sel=document.querySelector('#heroCards .hero-card.selected[data-hero="hoavi"]');
    const ta=document.getElementById('titleArt');
    if(sel&&ta&&root.DTArt?.titleArt&&root.DTWorld?.HEROES?.hoavi)root.DTArt.titleArt(ta,root.DTWorld.HEROES.hoavi);
  }

  portraitImg.onload=keyartImg.onload=locomotion.onload=actions.onload=skills.onload=ultR.onload=vfx.onload=redrawMenu;
  portraitImg.src='assets/hoavi-portrait.png';
  keyartImg.src='assets/hoavi-keyart.png';
  locomotion.src='assets/hoavi-locomotion.png';
  actions.src='assets/hoavi-actions.png';
  skills.src='assets/hoavi-skills.png';
  ultR.src='assets/hoavi-ult-r.png';
  vfx.src='assets/hoavi-vfx.png';

  root.DTHoaViPixel={character:locomotion,vfx,portraitImg,keyartImg,locomotion,actions,skills,ultR,v2Ready,ready,frame,frameV2:frame,portrait,ultIntro,hero,effect,projectile,fault,field,screen,point,beam};
})(globalThis);
