(function(root){
  'use strict';
  const character=new Image(),vfx=new Image(),originPortrait=new Image(),rituals=new Image(),golemSheet=new Image();
  const FORM_IDS=['origin','lightning','wind','earth','fire','ice','nature','light'];
  const TREE_IDS=['oak','bamboo','banyan'];
  const formSheets={},treeSheets={};
  for(const id of FORM_IDS)formSheets[id]=new Image();
  for(const id of TREE_IDS)treeSheets[id]=new Image();
  const TCW=96,TCH=84,TAX=48,TAY=72,TCOLS=30;
  const RCW=168,RCH=120,RAX=84,RAY=95,RCOLS=18;
  const GCW=120,GCH=108,GAX=60,GAY=90,GCOLS=30;
  const SCW=96,SCH=92,SAX=48,SAY=78,SCOLS=30;
  const EXT_PALETTE=[
    '#07050f','#121526','#1e243d','#2f3859','#4a5680','#7a88ab','#aebbd9','#dce5fa','#ffffff',
    '#8c584c','#bd8271','#e6ad99','#ffe0d1',
    '#593a0e','#99681b','#d99f2b','#ffd257','#fff3b8',
    '#16204a','#253980','#3b57bd','#6384f2','#a8c2ff',
    '#1b1452','#332696','#5b47e0','#8f7dff','#c7beff','#5ce1ff',
    '#0d3b38','#196e67','#2ba89c','#5ce0d0','#b8fff6',
    '#29160a','#4f2c14','#824b22','#bd7433','#f0a346','#ff5917',
    '#450909','#851310','#cc2418','#ff5a19','#ff9c24','#ffe866',
    '#082447','#12498a','#227bd4','#52b4ff','#a8dfff','#e8f8ff',
    '#0c2e17','#195c2d','#2d9948','#59d66f','#a6faad','#ff75a8',
    '#6e470b','#b37919','#f2ae2e','#ffd95e','#fff2a6','#f5eedc',
    '#120d21','#ffb647','#12091a','#ffcf82','#78d663'
  ];
  if(root.DTThienVuVFX?.palette){
    for(const h of EXT_PALETTE)if(!root.DTThienVuVFX.palette.includes(h))root.DTThienVuVFX.palette.push(h);
  }
  const calm=()=>!!root.DTSettings?.reducedMotion,low=()=>root.DTSettings?.graphics==='low'||root.DTTouch?.active&&root.DTSettings?.graphics!=='high';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),TAU=Math.PI*2;
  const loaded=img=>img.complete&&img.naturalWidth>0;
  const summonsReady=()=>loaded(golemSheet)&&TREE_IDS.every(id=>loaded(treeSheets[id]));
  const formsReady=()=>loaded(originPortrait)&&loaded(rituals)&&summonsReady()&&FORM_IDS.every(id=>loaded(formSheets[id]));
  const ready=()=>!!root.DTThienVuAtlas&&!!root.DTThienVuVFX&&loaded(character)&&loaded(vfx)&&formsReady();
  const sourceCache=new Map(),rasters=new Map();let rasterBytes=0;

  function cache(key,cv){rasters.set(key,cv);rasterBytes+=cv.width*cv.height*4;while(rasters.size>64||rasterBytes>8*1024*1024){const first=rasters.keys().next().value,old=rasters.get(first);rasterBytes-=old.width*old.height*4;rasters.delete(first)}return cv}
  function screen(c,fn){const m=c.getTransform?.()||{a:1,b:0,c:0,d:1,e:0,f:0};c.save();try{c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;c.globalAlpha=1;c.globalCompositeOperation='source-over';fn(m)}finally{c.restore()}}
  function point(m,x,y){return{x:Math.round(m.a*x+m.c*y+m.e),y:Math.round(m.b*x+m.d*y+m.f)}}
  function cell(c,img,f,x,y,ax=f.w/2,ay=f.h/2,unit=2){c.drawImage(img,f.x,f.y,f.w,f.h,Math.round(x-ax*unit),Math.round(y-ay*unit),Math.round(f.w*unit),Math.round(f.h*unit))}
  function ritualCell(c,idx,x,y,unit=2){
    if(!loaded(rituals))return false;
    const i=clamp(Math.floor(idx),0,371),sx=i%RCOLS*RCW,sy=Math.floor(i/RCOLS)*RCH;
    c.drawImage(rituals,sx,sy,RCW,RCH,Math.round(x-RAX*unit),Math.round(y-RAY*unit),Math.round(RCW*unit),Math.round(RCH*unit));
    return true;
  }
  function splitRitual(c,x,y,count=7,u=0,isCalm=false){
    if(!loaded(rituals))return false;
    const base=count===3?128:count===5?188:248;
    const f=isCalm?48:clamp(Math.floor(clamp(u,0,1)*60),0,59);
    const unit=(c.canvas?.width||1280)>=640?3:2;
    c.save();c.imageSmoothingEnabled=false;
    ritualCell(c,base+f,x,y,unit);
    c.restore();return true;
  }
  function direction(angle=0){return Math.abs(Math.cos(angle))>=Math.abs(Math.sin(angle))?(Math.cos(angle)>=0?'E':'W'):(Math.sin(angle)>=0?'S':'N')}
  const progress300=(a,frames)=>clamp(Math.floor(Math.max(0,a.elapsed||0)/Math.max(.01,a.duration||.01)*frames),0,frames-1);

  function frame300(p,time=0,hurt=-Infinity){
    const raw=p.elementForm||p.element||'origin';
    const form=FORM_IDS.includes(raw)?raw:'lightning';
    const a=p.action,hit=p.hit>0?Math.max(0,.18-p.hit):hurt,still=calm(),t=Math.max(0,time||0);
    const view=direction(root.DTBodyAngle?root.DTBodyAngle(p):p.facing||0);
    const isTrans=!a&&!(p.dashTime>0)&&!(hit>=0&&hit<.18)&&Number.isFinite(p.transformAt)&&t>=p.transformAt&&t-p.transformAt<.48;
    const key=p.dashTime>0?'dash':hit>=0&&hit<.18?'hit':a?.key==='attack'?'attack':a?.key==='q'?'q_cast':a?.key==='e'?'e_cast':(a?.key==='r'||a?.key==='split')?'r_ult':p.moving?'run':'idle';
    let idx;
    if(isTrans)idx=still?15:clamp(Math.floor((t-p.transformAt)/.48*30),0,29);
    else if(key==='dash')idx=102+(still?8:clamp(Math.floor((.19-p.dashTime)/.19*20),0,19));
    else if(key==='hit')idx=122+(still?4:clamp(Math.floor(hit/.18*10),0,9));
    else if(key==='attack'){
      const combo=clamp(Number.isInteger(p.comboIndex)?p.comboIndex:0,0,2);
      idx=132+combo*20+(still?9:progress300(a,20));
    }else if(key==='q_cast')idx=192+(still?14:progress300(a,32));
    else if(key==='e_cast')idx=224+(still?15:progress300(a,32));
    else if(key==='r_ult')idx=256+(still?22:progress300(a,44));
    else if(key==='run')idx=66+(still?0:Math.floor(t*24)%36);
    else idx=30+(still?0:Math.floor(t*18)%36);

    const vIndex=view==='S'?0:view==='N'?2:1;
    const cellIdx=vIndex*300+idx;
    return{key:isTrans?'transform':key,form,direction:view,mirror:view==='W',index300:idx,sx:cellIdx%TCOLS*TCW,sy:Math.floor(cellIdx/TCOLS)*TCH};
  }

  function frame(p,time=0,hurt=-Infinity){
    const raw=p.elementForm||p.element||'origin',form=FORM_IDS.includes(raw)?raw:'lightning';
    const legacy=form==='origin'?'lightning':form,meta=root.DTThienVuAtlas?.forms[legacy];if(!meta)return null;
    const a=p.action,hit=p.hit>0?Math.max(0,.18-p.hit):hurt;
    const key=p.dashTime>0?'dash':hit>=0&&hit<.18?'hit':a?.key==='attack'?'attack':a?.key==='q'?'q_cast':a?.key==='e'?'e_cast':(a?.key==='r'||a?.key==='split')?'r_ult':p.moving?'run':'idle';
    const clip=meta.actions[key],view=direction(root.DTBodyAngle?root.DTBodyAngle(p):p.facing||0);let f;
    if(a&&['attack','q_cast','e_cast','r_ult'].includes(key)){
      const release={attack:1,q_cast:2,e_cast:3,r_ult:3}[key],wind=Math.max(.001,a.release??a.windup??.16),duration=Math.max(wind+.001,a.duration||.65),elapsed=Math.max(0,a.elapsed||0);
      f=elapsed<wind?Math.floor(elapsed/wind*release):release+Math.floor((elapsed-wind)/(duration-wind)*(clip.frames-release));
    }else f=key==='dash'?Math.floor((.19-p.dashTime)*clip.fps):key==='hit'?Math.floor(hit*clip.fps):Math.floor(Math.max(0,time)*clip.fps)%clip.frames;
    if(calm())f=({attack:1,q_cast:2,e_cast:3,r_ult:3})[key]??0;
    f=clamp(f,0,clip.frames-1);
    const f300=frame300(p,time,hurt);
    return{key,form,direction:view,frame:f,cell:clip.directions[view][f],...f300};
  }

  function portrait(c,w,h,bob=0,form='origin',time=0){
    if(form==='origin'&&loaded(originPortrait)){
      c.save();c.imageSmoothingEnabled=false;
      c.drawImage(originPortrait,4,Math.round(4+bob),Math.round(w-8),Math.round(h-8));
      c.restore();return true;
    }
    const sheet=formSheets[form];if(!loaded(sheet))return false;
    const idx=30+(calm()?0:Math.floor(Math.max(0,time)*18)%36),sx=idx%TCOLS*TCW,sy=Math.floor(idx/TCOLS)*TCH;
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(sheet,sx+20,sy+14,56,54,Math.round((w-112)/2),Math.round(6+bob),112,108);
    c.restore();return true;
  }

  function pixels(f,img=vfx){
    const key=[img.src,f.x,f.y,f.w,f.h].join(':');if(sourceCache.has(key))return sourceCache.get(key);
    const cv=document.createElement('canvas');cv.width=f.w;cv.height=f.h;const c=cv.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=false;c.drawImage(img,f.x,f.y,f.w,f.h,0,0,f.w,f.h);
    const data=c.getImageData(0,0,f.w,f.h).data;sourceCache.set(key,data);return data;
  }
  function flip(c,key,f,x,y,unit=2,angle=0,meta=root.DTThienVuVFX,img=vfx){
    const clip=meta?.clips[key];if(!clip)return;
    f=clamp(Math.floor(f),0,clip.frames-1);const src=clip.cells[f];
    if(!angle){cell(c,img,src,x,y,src.w/2,src.h/2,unit);return}
    const size=Math.ceil(Math.hypot(src.w,src.h)/2)*2+2,a=Math.round(angle*1000)/1000,cacheKey=img.src+':'+key+':'+f+':'+a;
    let cv=rasters.get(cacheKey);
    if(!cv){cv=document.createElement('canvas');cv.width=cv.height=size;const oc=cv.getContext('2d'),data=oc.createImageData(size,size),source=pixels(src,img),co=Math.cos(a),si=Math.sin(a);
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
    if(w*h>1024*1024)return;
    const cacheKey=['beam',key,f,dx,dy].join(':');let cv=rasters.get(cacheKey);
    if(!cv){cv=document.createElement('canvas');cv.width=w;cv.height=h;const oc=cv.getContext('2d'),data=oc.createImageData(w,h),sources=fs.map(f=>pixels(f)),ux=dx/len,uy=dy/len;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const rx=(x+minX)*2+1,ry=(y+minY)*2+1,along=rx*ux+ry*uy,across=-rx*uy+ry*ux;if(along<0||along>len)continue;
        const part=light?(along<48?0:along>len-48?2:1):0,src=fs[part],sy=Math.floor(across/(key==='solar_beam'?56/src.h:2)+src.h/2);if(sy<0||sy>=src.h)continue;
        const sx=part===2?clamp(src.w-1-Math.floor((len-along)/2),0,src.w-1):Math.floor(along/2)%src.w,i=(sy*src.w+sx)*4;if(sources[part][i+3]===255)data.data.set(sources[part].subarray(i,i+4),(y*w+x)*4);
      }
      oc.putImageData(data,0,0);cache(cacheKey,cv);
    }
    c.drawImage(cv,Math.round(a.x+minX*2),Math.round(a.y+minY*2),w*2,h*2);
  }

  const vfxForm=f=>f==='origin'?'light':(root.DTThienVuAtlas?.forms[f]?f:'lightning');
  function particles(c,x,y,form,age,count=6){if(calm())return;const pal=root.DTThienVuAtlas.forms[vfxForm(form)]?.palette;if(!pal)return;for(let i=0;i<(low()?Math.min(3,count):count);i++){const a=i/Math.max(1,count)*TAU,r=12+age*26,size=[2,4,6][i%3];c.fillStyle=pal[11+i%4];c.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r*.65),size,size)}}

  function ghost(c,p,time,form,unit=2,elapsed=0){
    if(!ready()||calm())return;const pose=frame300({...p,elementForm:form},time),sheet=formSheets[pose.form];if(!loaded(sheet))return;
    screen(c,m=>{const s=point(m,p.x,p.y);c.save();c.imageSmoothingEnabled=false;if(pose.mirror){c.translate(s.x,s.y);c.scale(-1,1)}
      for(let row=0;row<TCH;row+=4){if((row/4+Math.floor(elapsed*24))%3===0)continue;const shift=Math.round((row%8?1:-1)*elapsed*18);
        const dx=pose.mirror?Math.round(-TAX*unit+shift):Math.round(s.x-TAX*unit+shift),dy=pose.mirror?Math.round((row-TAY)*unit):Math.round(s.y+(row-TAY)*unit);
        c.drawImage(sheet,pose.sx,pose.sy+row,TCW,2,dx,dy,Math.round(TCW*unit),Math.round(2*unit));
      }c.restore()});
  }

  function hero(c,p,time=0,hurt=-Infinity,clone=false,shadow=true){
    if(!ready())return false;
    const card=c.canvas?.closest?.('#heroCards .hero-card');
    if(card&&loaded(originPortrait)){
      c.save();c.imageSmoothingEnabled=false;
      const {width,height}=c.canvas,side=Math.min(width,height);
      c.drawImage(originPortrait,Math.round((width-side)/2),Math.round((height-side)/2),side,side);
      c.restore();return true;
    }
    const pose=frame300(p,time,hurt),sheet=formSheets[pose.form];if(!loaded(sheet))return false;
    const unit=2,vf=vfxForm(pose.form);
    screen(c,m=>{
      const s=point(m,p.x,p.y);
      if(shadow)flip(c,'pixel_shadow',0,s.x,s.y+2,2);
      if(p.hoverboard>0)flip(c,'hoverboard',calm()?0:Math.floor(time*12)%6,s.x,s.y-4,unit);
      if(!(p.invulnerable>0&&!calm()&&Math.floor(time*12)%2===0)){
        if(pose.mirror){
          c.save();c.imageSmoothingEnabled=false;c.translate(s.x,s.y);c.scale(-1,1);
          c.drawImage(sheet,pose.sx,pose.sy,TCW,TCH,-TAX*unit,-TAY*unit,TCW*unit,TCH*unit);
          c.restore();
        }else{
          c.drawImage(sheet,pose.sx,pose.sy,TCW,TCH,s.x-TAX*unit,s.y-TAY*unit,TCW*unit,TCH*unit);
        }
      }
      if(p.shield>0)flip(c,'shield_'+vf,calm()?0:Math.floor(time*6)%2,s.x,s.y-48,2);
      if(clone&&p.hp<p.maxHp){
        const barCol=root.DTThienVuAtlas.forms[vf]?.palette[13]||'#ffb647';
        c.fillStyle='#120d21';c.fillRect(s.x-18,s.y+8,36,4);
        c.fillStyle=barCol;c.fillRect(s.x-16,s.y+8,Math.round(32*clamp(p.hp/p.maxHp,0,1)),2);
      }
    });
    return true;
  }

  const qKeys={origin:'solar_beam',lightning:'chain_bolt',wind:'wind_blade_q',earth:'earth_pillar',fire:'fire_dragon',ice:'ice_beam',nature:'vine_whip',light:'light_beam'};
  function projectile(renderer,b){if(!b.element)return false;if(!ready())return true;
    screen(renderer.ctx,m=>{const s=point(m,b.x,b.y),raw=b.element,form=vfxForm(raw),skill=b.sourceSkill==='q';
      if(raw==='origin'){
        flip(renderer.ctx,'solar_prism',calm()?0:Math.floor(renderer.game.time*16)%6,s.x,s.y-24,2,b.angle||0);
        return;
      }
      const key=skill&&form==='wind'?'wind_blade_q':skill&&form==='fire'?'fire_dragon':'proj_'+form,clip=root.DTThienVuVFX.clips[key];
      if(clip)flip(renderer.ctx,key,calm()?0:Math.floor(renderer.game.time*16)%clip.frames,s.x,s.y-36,2,skill&&form==='wind'?0:b.angle||0);
    });return true;
  }
  function field(renderer,f,legacy=false){
    if(renderer.game.hero.id!=='thienvu'||!f.combat&&!['wall','mirror','vortex','tornado','orbs','sigil','garden','vine'].includes(f.kind)&&!legacy)return false;
    if(!ready()||f.life<=0)return true;const g=renderer.game,raw=f.element||g.element.id,form=vfxForm(raw),time=calm()?0:g.time;
    screen(renderer.ctx,m=>{const c=renderer.ctx,s=point(m,f.x,f.y),r=Math.max(8,(f.r||100)*Math.abs(m.a)),index=Math.floor(time*10),kind=f.kind||(f.key==='r'?{wind:'tornado',ice:'nova',nature:'garden',fire:'orbs'}[form]:'')||{lightning:'sigil',wind:'vortex',earth:'wall',fire:'orbs',ice:'mirror',nature:'garden',light:'mirror'}[form];
      if(f.combat){
        const draw=(key,x=s.x,y=s.y,unit=2,angle=0)=>flip(c,key,index%root.DTThienVuVFX.clips[key].frames,x,y,unit,angle);
        if(f.behavior==='origin_prism'){
          draw('convergence_star',s.x,s.y);draw('convergence_hub',s.x,s.y,2);
          const ids=Object.keys(root.DTThienVuAtlas.forms);
          for(let i=0;i<ids.length;i++){const a=i/7*TAU+time*1.5;flip(c,'crest_'+ids[i],index%4,s.x+Math.round(Math.cos(a)*r*.75),s.y+Math.round(Math.sin(a)*r*.52),2)}
          return;
        }
        if(f.behavior==='fire_breath'){const a=f.angle||0;draw('fire_breath',s.x+Math.cos(a)*105,s.y-46+Math.sin(a)*105,2,a)}
        else if(f.behavior==='blizzard'){draw('freeze_cage',s.x,s.y-32);for(let i=0;i<8;i++){const a=i/8*TAU;draw('ice_nova_strip',s.x+Math.cos(a)*r*.8,s.y+Math.sin(a)*r*.8)}}
        else if(['tornado','hurricane'].includes(f.behavior))draw(f.behavior==='hurricane'?'tornado_hurricane':'tornado_mesh',s.x,s.y-112,2);
        else if(f.behavior==='meteor'){draw(f.meteorDelay>0?'giant_fireball':'meteor_burst',s.x,s.y-(f.meteorDelay>0?90+f.meteorDelay*150:20),2)}
        else if(f.behavior==='tremor')draw('earth_tremor',s.x,s.y,2);
        else if(f.behavior==='sword_array')for(let i=0;i<8;i++){const a=i/8*TAU;draw('lightning_swords',s.x+Math.cos(a)*r,s.y+Math.sin(a)*r-40,2)}
        else if(f.behavior==='lightning_prison')draw('lightning_sigil',s.x,s.y,2);
        else if(f.behavior==='root'){draw('nature_garden');for(let i=0;i<6;i++){const a=i/6*TAU;draw('vine_root',s.x+Math.cos(a)*r*.7,s.y+Math.sin(a)*r*.7)}}
        return;
      }
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
        if(kind==='garden')for(let i=0;i<(low()?4:7);i++){const a=i/7*TAU;flip(c,'vine_root',index%5,s.x+Math.cos(a)*r*.70,s.y+Math.sin(a)*r*.70-16,2)}
      }else if(kind==='vortex'||kind==='tornado')flip(c,'wind_'+kind,index%6,s.x,s.y-(kind==='tornado'?48:12),2);
      else if(kind==='nova')for(let i=0;i<8;i++){const a=i/8*TAU;flip(c,'ice_nova_strip',index%4,s.x+Math.cos(a)*r*.85,s.y+Math.sin(a)*r*.85,2)}
      else flip(c,'lightning_sigil',index%5,s.x,s.y);
    });return true;
  }
  function effect(renderer,e){
    const g=renderer.game,own=e.hero==='thienvu'||g.hero.id==='thienvu'&&e.hero!=='hoavi'&&(/^(?:element-|choreo-)/.test(e.type)||['lightning','mythic-tether','mythic-rune','ring','blast','bolt','leaves','dashwake'].includes(e.type));
    if(!own)return false;if(!ready())return true;
    const age=clamp(1-e.life/Math.max(.001,e.maxLife),0,.999),raw=e.element||(['bolt','lightning'].includes(e.type)?'lightning':g.element.id),form=vfxForm(raw),step=(n)=>calm()?Math.floor(n/2):Math.min(n-1,Math.floor(age*n));
    screen(renderer.ctx,m=>{const c=renderer.ctx,s=point(m,e.x,e.y),dest=point(m,e.tx??e.x,e.ty??e.y);
      if(e.type==='element-afterimage'){
        const pose=frame300({elementForm:raw,moveDir:direction(e.angle||0),facing:e.angle||0,moving:true},g.time),sheet=formSheets[pose.form];
        if(loaded(sheet)){
          c.save();c.imageSmoothingEnabled=false;if(pose.mirror){c.translate(s.x,s.y);c.scale(-1,1)}
          for(let row=0;row<TCH;row+=4)if((row/4+Math.floor(age*8))%3!==0){
            const dx=pose.mirror?-TAX*2:s.x-TAX*2,dy=pose.mirror?(row-TAY)*2:s.y+(row-TAY)*2;
            c.drawImage(sheet,pose.sx,pose.sy+row,TCW,2,dx,dy,TCW*2,4);
          }c.restore();
        }return;
      }
      if(e.type==='element-mesh'||e.type==='element-weapon'){
        const key=e.clip||(form==='earth'?'earth_tremor':form==='ice'?'ice_shatter':form==='nature'?'giant_vine':'chain_bolt'),clip=root.DTThienVuVFX.clips[key];if(!clip)return;
        if(key==='solar_beam'&&e.tx!=null){segment(c,'solar_beam',step(6),{x:s.x,y:s.y-42},{x:dest.x,y:dest.y-42});flip(c,'solar_prism',step(6),s.x,s.y-42);return}
        flip(c,key,step(clip.frames),s.x,s.y-(key==='giant_vine'?30:20),2,e.angle||0);return;
      }
      if(e.type==='element-transform'||e.type==='choreo-transform'){
        if(e.type==='choreo-transform')return;
        const fIdx=Math.max(0,FORM_IDS.indexOf(raw));
        if(ritualCell(c,fIdx*16+step(16),s.x,s.y,2))return;
        flip(c,'transform_ring_'+form,step(5),s.x,s.y);flip(c,'transform_pillar_'+form,step(5),s.x,s.y-56);
      }else if(e.type==='element-recall'){
        if(ritualCell(c,308+step(64),s.x,s.y,2))return;
        flip(c,'transform_ring_'+form,4-step(5),s.x,s.y);particles(c,s.x,s.y-36,form,age);
      }
      else if(e.type==='element-split'||e.type==='choreo-split'){
        if(e.type==='element-split'&&g.effects?.some(f=>f.type==='choreo-split'))return;flip(c,'split_matrix',step(6),s.x,s.y,2);
        for(const [i,id] of Object.keys(root.DTThienVuAtlas.forms).entries()){const a=i/7*TAU;flip(c,'crest_'+id,step(4),s.x+Math.round(Math.cos(a)*112),s.y+Math.round(Math.sin(a)*65),2)}
        if(!calm())for(const p of e.points||[]){const end=point(m,p.x,p.y),el=vfxForm(p.element);segment(c,'split_beam_'+el,step(6),{x:s.x,y:s.y-40},{x:end.x,y:end.y-32})}
      }else if(e.type==='element-convergence'){
        for(const p of e.points||[]){const a=point(m,p.x,p.y),el=vfxForm(p.element);segment(c,'split_beam_'+el,step(6),{x:a.x,y:a.y-42},s)}
        flip(c,'convergence_star',step(6),s.x,s.y);flip(c,'convergence_hub',step(6),s.x,s.y,2);
      }else if(e.type==='element-beam'||e.type==='mythic-tether'||e.type==='lightning'){
        const key=e.type==='lightning'?'chain_bolt':(raw==='origin'||form==='light')?'solar_beam':qKeys[form];
        segment(c,key,step(key==='solar_beam'?6:4),{x:s.x,y:s.y-36},{x:dest.x,y:dest.y-36});
        if(key==='solar_beam')flip(c,'solar_prism',step(6),s.x,s.y-36);
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
  function status(renderer,e){if(!ready())return;screen(renderer.ctx,m=>{const s=point(m,e.x,e.y);if(e.frozen>0)flip(renderer.ctx,'freeze_cage',calm()?1:Math.floor(renderer.game.time*6)%4,s.x,s.y-25);if(e.poison>0||e.rooted>0)flip(renderer.ctx,'vine_root',calm()?2:Math.floor(renderer.game.time*5)%5,s.x,s.y)})}
  function treeVariant(s){
    const pt=s.sourceProp?.type||s.sourcePropType;
    if(pt==='bamboo')return'bamboo';if(pt==='banyan')return'banyan';if(pt==='tree')return'oak';
    const serial=Number(String(s.id||'').split('-').pop());
    return TREE_IDS[(Number.isFinite(serial)&&serial>0?(serial-1):0)%3];
  }
  function summonFrame300(s,time=0){
    const still=calm(),t=Math.max(0,time||0),spawning=(s.spawnAge??.45)<.45,a=s.action,golem=s.kind==='golem';
    const shooting=!a&&!golem&&(s.shotCd||0)>.92;
    const view=(a||shooting)?direction(a?.angle??s.aimAngle??s.moveFacing??Math.PI/2):(s.moveDir&&['S','E','N','W'].includes(s.moveDir)?s.moveDir:direction(s.moveFacing??s.aimAngle??Math.PI/2));
    const vIndex=view==='S'?0:view==='N'?2:1,mirror=view==='W';
    let idx;
    if(spawning)idx=still?24:clamp(Math.floor((s.spawnAge||0)/.45*36),0,35);
    else if(golem){
      if(a){
        const gk=a.golem||a.clip||'golem_punch';
        if(gk.includes('smash'))idx=148+(still?24:progress300(a,48));
        else if(gk.includes('stomp'))idx=196+(still?24:progress300(a,48));
        else if(gk.includes('throw'))idx=244+(still?28:progress300(a,56));
        else idx=108+(still?20:progress300(a,40));
      }else if(s.moving)idx=72+(still?0:Math.floor(t*24)%36);
      else idx=36+(still?0:Math.floor(t*18)%36);
    }else{
      if((s.hurtCd||0)>.25)idx=276+(still?12:clamp(Math.floor((.45-s.hurtCd)/.20*24),0,23));
      else if(a){
        const cyc=Math.floor((s.stride||0)+(Number(String(s.id||'').split('-').pop())||0))%3;
        idx=cyc===0?(108+(still?14:progress300(a,30))):cyc===1?(138+(still?14:progress300(a,30))):(168+(still?26:progress300(a,60)));
      }else if(shooting)idx=228+(still?20:clamp(Math.floor((1.4-s.shotCd)/.48*48),0,47));
      else if(s.moving)idx=72+(still?0:Math.floor(t*24)%36);
      else idx=36+(still?0:Math.floor(t*18)%36);
    }
    const variant=golem?'golem':treeVariant(s),cellIdx=vIndex*300+idx;
    const [cw,ch,ax,ay,cols]=golem?[GCW,GCH,GAX,GAY,GCOLS]:[SCW,SCH,SAX,SAY,SCOLS];
    return{sheet:golem?golemSheet:treeSheets[variant],cw,ch,ax,ay,sx:cellIdx%cols*cw,sy:Math.floor(cellIdx/cols)*ch,view,mirror,index300:idx,variant};
  }
  function summon(renderer,s){
    if(!ready())return;
    screen(renderer.ctx,m=>{
      const c=renderer.ctx,p=point(m,s.x,s.y),t=renderer.game?.time||0,pose=summonFrame300(s,t);
      if(loaded(pose.sheet)){
        if(pose.mirror){
          c.save();c.imageSmoothingEnabled=false;c.translate(p.x,p.y);c.scale(-1,1);
          c.drawImage(pose.sheet,pose.sx,pose.sy,pose.cw,pose.ch,-pose.ax*2,-pose.ay*2,pose.cw*2,pose.ch*2);
          c.restore();
        }else{
          c.drawImage(pose.sheet,pose.sx,pose.sy,pose.cw,pose.ch,p.x-pose.ax*2,p.y-pose.ay*2,pose.cw*2,pose.ch*2);
        }
      }
      if(s.thrown&&!s.thrown.enemy){
        const b=point(m,s.thrown.currentX,s.thrown.currentY),bf=calm()?0:Math.floor(t*24)%30;
        if(loaded(golemSheet))c.drawImage(golemSheet,bf*GCW,30*GCH,GCW,GCH,Math.round(b.x-GAX*2),Math.round(b.y-s.thrown.height-(GAY-36)*2),GCW*2,GCH*2);
        else flip(c,'golem_rock',Math.floor(t*12)%6,b.x,b.y-s.thrown.height-34,2);
      }
      c.fillStyle='#12091a';c.fillRect(p.x-28,p.y+6,56,5);
      c.fillStyle=s.kind==='golem'?'#ffcf82':'#78d663';c.fillRect(p.x-27,p.y+7,Math.round(54*clamp(s.life/s.maxLife,0,1)),3);
    });
  }

  function redrawMenu(){
    if(typeof document==='undefined'||!ready())return;
    for(const cv of document.querySelectorAll('canvas[data-thienvu]')){
      const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);
      hero(c,{x:64,y:116,facing:Math.PI/2,elementForm:'origin'});
    }
    const card=document.querySelector('#heroCards .hero-card[data-hero="thienvu"] canvas');
    if(card){const c=card.getContext('2d');c.clearRect(0,0,card.width,card.height);hero(c,{x:28,y:67,facing:Math.PI/2,elementForm:'origin'})}
  }

  character.onload=vfx.onload=originPortrait.onload=rituals.onload=golemSheet.onload=redrawMenu;
  character.src='assets/thienvu-pixel-v08.png';
  vfx.src='assets/thienvu-vfx-pixel.png';
  originPortrait.src='assets/thienvu-origin-portrait.png';
  rituals.src='assets/thienvu-rituals.png';
  golemSheet.src='assets/thienvu-summon-golem.png';
  for(const id of FORM_IDS){formSheets[id].onload=redrawMenu;formSheets[id].src='assets/thienvu-form-'+id+'.png'}
  for(const id of TREE_IDS){treeSheets[id].onload=redrawMenu;treeSheets[id].src='assets/thienvu-summon-'+id+'.png'}

  root.DTThienVuPixel={character,vfx,originPortrait,rituals,golemSheet,treeSheets,formSheets,FORM_IDS,TREE_IDS,summonsReady,formsReady,ready,portrait,frame,frame300,summonFrame300,hero,ghost,effect,projectile,field,status,summon,splitRitual,screen,point,flip,segment,cacheStats:()=>({rasters:rasters.size,bytes:rasterBytes,sources:sourceCache.size})};
})(globalThis);
