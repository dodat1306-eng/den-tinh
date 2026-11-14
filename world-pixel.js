(function(root){
  'use strict';
  const world=new Image(),actors=new Image();world.src='assets/world-pixel-v08.png';actors.src='assets/actors-pixel-v08.png';
  const calm=()=>!!root.DTSettings?.reducedMotion,actorHistory=new WeakMap();
  const ready=()=>!!root.DTWorldPixelAtlas&&!!root.DTActorsPixelAtlas&&world.complete&&world.naturalWidth>0&&actors.complete&&actors.naturalWidth>0;
  function cell(c,image,frame,x,y,flip=false){
    c.save();try{c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);c.drawImage(image,frame.x,frame.y,frame.w,frame.h,Math.round(-frame.anchorX*2),Math.round(-frame.anchorY*2),frame.w*2,frame.h*2)}finally{c.restore()}
  }
  function frame(meta,key,time=0,number){const clip=meta?.clips[key];if(!clip)return null;const index=calm()?0:number===undefined?Math.floor(Math.max(0,time)*clip.fps)%clip.frames:Math.max(0,Math.min(clip.frames-1,number));return clip.cells[index]}
  function sprite(c,key,x,y,time=0,number){const f=frame(root.DTWorldPixelAtlas,key,time,number);if(!world.complete||!world.naturalWidth||!f)return false;cell(c,world,f,x,y);return true}
  function shadow(c,x,y,width=32){c.save();c.globalAlpha*=.3;c.fillStyle='#12091a';for(let j=-2;j<=2;j++){const span=Math.round(width*Math.sqrt(1-j*j/9)/2)*2;c.fillRect(Math.round((x-span/2)/2)*2,Math.round(y/2)*2+j*2,span,2)}c.restore()}
  function prop(renderer,p){
    if(!ready())return false;const c=renderer.ctx,g=renderer.game,t=calm()?0:g.time,stage=p.damageStage||0;
    const state=stage===3?'ash':p.status==='frozen'?'frozen':p.status==='burning'||p.status==='heated'?'burning':p.status==='sliced'?'sliced':stage===2?'charred':'intact';
    const key=p.type+'/'+state;if(!root.DTWorldPixelAtlas.clips[key])return false;
    const original=root.DTWorldPixelAtlas.clips[p.type+'/intact'].cells[0],height=original.h*2-12;
    c.save();try{
      const leafy=['tree','willow','banyan','pine','bamboo'].includes(p.type);
      if(leafy&&stage<2&&g.player.y<p.y&&g.player.y>p.y-height&&Math.abs(g.player.x-p.x)<original.w*.65)c.globalAlpha*=.45;
      if(stage<3)shadow(c,p.x,p.y,Math.min(62,original.w*.7));
      c.translate(Math.round(p.x),Math.round(p.y));
      if(!calm()&&stage<2&&p.status!=='frozen'){const lean=(p.sway||0)*Math.sin(t*16)+(leafy?Math.sin(t*1.5+p.x)*.009:0);c.transform(1,0,lean,1,0,0)}
      sprite(c,key,0,0,t,state==='sliced'?Math.min(5,Math.floor((p.fallTime||0)/.6*6)):undefined);
      if(p.status==='burning'){
        for(let i=0;i<4;i++)sprite(c,'flame',(i-1.5)*Math.min(20,original.w*.3),-height*(.18+i*.15),t+i*.09);
        c.globalAlpha*=.65;for(let i=0;i<3;i++)sprite(c,'steam_cloud',Math.round(Math.sin(i*4+t)*10),-height-12-i*15,t+i*.11);
      }else if(p.status==='charred'&&!calm()){
        c.fillStyle=Math.floor(t*8)%2?'#ff551a':'#ffbb33';for(let i=0;i<3;i++)c.fillRect((i%2)*4-2,Math.round(-height*(.1+i*.12)),2,4);
        c.globalAlpha*=.25;sprite(c,'steam_cloud',0,-height*.62,t*.5);
      }else if(stage===3&&p.status==='ash_pile'&&!calm()){c.fillStyle=Math.floor(t*7)%2?'#ff551a':'#ffbb33';c.fillRect(4,-4,2,2)}
      if(p.status==='electrified'&&!calm()){c.fillStyle='#ffee77';for(let i=0;i<4;i++)c.fillRect(Math.round(Math.sin(t*18+i)*15),Math.round(-height*(.2+i*.16)),2,4)}
    }finally{c.restore()}return true;
  }
  function hash(x,y,seed){let n=Math.imul(x+seed,374761393)^Math.imul(y,668265263);return((n^(n>>>13))>>>0)}
  function zone(x,y){const z=root.DTWorld.zoneAt(x,y);return z.paletteId||z.id.replace(/^endless-/,'')}
  function river(x,y){return x>=0&&y>=0&&x<6400&&y<4480&&!!root.DTWorld.frontier?.riverAt(x,y)}
  function waterKey(x,y){let mask=0;for(const [dx,dy,bit]of[[0,-32,1],[32,0,2],[0,32,4],[-32,0,8]])if(!river(x+dx,y+dy))mask|=bit;return 'water/'+mask}
  function terrain(c,w,ox,oy,size){
    c.imageSmoothingEnabled=false;
    for(let y=oy-32;y<oy+size+32;y+=32)for(let x=ox-32;x<ox+size+32;x+=32){
      const xx=x+16,yy=y+16;let key='terrain/'+zone(xx,yy)+'/'+hash(Math.floor(x/32),Math.floor(y/32),w.seed)%6;
      if(river(xx,yy))key=root.DTWorld.frontier.onBridge(xx,yy)?'bridge':waterKey(xx,yy);
      else if(root.DTWorld.nearPath(xx,yy,42)){
        let mask=0;for(const [dx,dy,bit]of[[0,-32,1],[32,0,2],[0,32,4],[-32,0,8]])if(root.DTWorld.nearPath(xx+dx,yy+dy,42))mask|=bit;key='road/'+mask;
      }
      if(!sprite(c,key,x+16,y+16)){c.fillStyle='#304b3c';c.fillRect(x,y,32,32)}
    }
  }
  function ground(renderer,inView){
    const c=renderer.ctx,g=renderer.game,t=calm()?0:g.time,cam=renderer.camera;
    if(ready()&&cam.x<4900&&cam.x+1280>4400&&cam.y<2000)for(let y=Math.floor(cam.y/32)*32;y<cam.y+720;y+=32)for(let x=Math.floor(cam.x/32)*32;x<cam.x+1280;x+=32)if(river(x+16,y+16)&&!root.DTWorld.frontier.onBridge(x+16,y+16))sprite(c,waterKey(x+16,y+16),x+16,y+16,t);
    for(const d of g.world.groundDecals||[]){
      if(!inView(d))continue;const key=d.type==='scorch_mark'?'scorch_mark/'+d.size:d.type;
      c.save();try{c.globalAlpha*=Math.min(1,(d.life-d.age)/4);sprite(c,key,d.x,d.y,t);
        if(d.type==='scorch_mark'&&d.age<4.5&&!calm()){
          for(let i=0;i<6;i++){const x=d.x+Math.sin(d.seed+i*7)*18,y=d.y+Math.cos(d.seed+i*3)*10;c.fillStyle=(Math.floor(t*8)+i)%3?'#ff5e1a':'#ffbb33';c.fillRect(Math.round(x/2)*2,Math.round(y/2)*2,2+(i%2)*2,2);c.fillStyle='#120d14';c.fillRect(Math.round((x+Math.sin(t+i)*4)/2)*2,Math.round((y-(t*15+i*3)%30)/2)*2,2,2)}
        }
        if(d.type==='lightning_scar'&&d.age<3&&!calm()){c.fillStyle='#ffee77';for(let i=0;i<3;i++)c.fillRect(Math.round(d.x+Math.sin(t*19+i)*12),Math.round(d.y+Math.cos(t*11+i)*6),2,2)}
      }finally{c.restore()}
    }
  }
  function actor(c,id,x,y,options={}){
    if(!ready())return false;const key=id+'/'+(options.action||'idle'),f=frame(root.DTActorsPixelAtlas,key,options.time||0,options.frame);if(!f)return false;
    shadow(c,x,y,id.startsWith('boss')?54:22);cell(c,actors,f,x,y,options.face===-1);return true;
  }
  function elite(c,e,time,height){
    if(!e.elite)return;const colors={fire:['#ff5e1a','#ffdd77'],ice:['#6fc9eb','#dbfbff'],lightning:['#a55ce0','#ffee77']}[e.elite]||['#ffdd77','#fff2d6'];
    c.save();c.fillStyle=colors[0];for(let i=0;i<12;i++){const a=i/12*Math.PI*2;c.fillRect(Math.round(e.x+Math.cos(a)*25),Math.round(e.y+Math.sin(a)*10),4,2)}
    for(let i=-2;i<=2;i++){const h=6+(i%2?4:0);c.fillRect(Math.round(e.x+i*4-1),Math.round(e.y-height-8-h),2,h);c.fillStyle=colors[1];c.fillRect(Math.round(e.x+i*4-1),Math.round(e.y-height-8-h),2,2);c.fillStyle=colors[0]}
    if(!calm()){c.fillStyle=colors[1];for(let i=0;i<3;i++)c.fillRect(Math.round(e.x+Math.sin(time*9+i)*22),Math.round(e.y-16-(time*20+i*8)%30),2,2)}c.restore();
  }
  function enemy(renderer,e){
    const meta=root.DTActorsPixelAtlas;if(!ready()||!meta.clips[e.type+'/idle'])return false;
    const g=renderer.game,c=renderer.ctx,t=g.time;let old=actorHistory.get(e);if(!old)old={x:e.x,y:e.y,cool:e.cool||0,attack:-100};
    const moving=!!e.visualMoving||Math.hypot(old.x-e.x,old.y-e.y)>.05;
    if((e.cool||0)>old.cool+.4||e.phase===1&&e.type==='boar')old.attack=t;
    const boss=e.type.startsWith('boss'),attacking=t-old.attack<.55;
    const action=e.hit>0&&!boss?'hit':attacking?(boss?(e.pattern%3===0?'cast_rage':'attack_slam'):'attack'):moving?(boss?'move':'walk'):'idle';
    const elapsed=e.hit>0?.18-e.hit:attacking?t-old.attack:t;
    actor(c,e.type,e.x,e.y,{action,time:elapsed,face:boss||e.type==='slime'?1:g.player.x<e.x?-1:1});
    actorHistory.set(e,{x:e.x,y:e.y,cool:e.cool||0,attack:old.attack});
    const h=meta.clips[e.type+'/idle'].cells[0].h*2-12;elite(c,e,calm()?0:t,h);
    if(e.hp<e.maxHp){c.fillStyle='#12091a';c.fillRect(Math.round(e.x-24),Math.round(e.y-h-12),48,4);c.fillStyle=e.elite?'#ffdd77':'#d9384a';c.fillRect(Math.round(e.x-23),Math.round(e.y-h-11),Math.round(46*Math.max(0,e.hp/e.maxHp)),2)}
    if(e.frozen>0){c.save();c.globalAlpha=.65;sprite(c,'frost_patch',e.x,e.y);c.restore()}
    if(e.burn>0)sprite(c,'flame',e.x,e.y-10,t);
    return true;
  }
  function npc(renderer,n){if(!actor(renderer.ctx,n.type,n.x,n.y,{time:renderer.game.time}))return false;const c=renderer.ctx;c.font='10px Segoe UI';c.textAlign='center';c.fillStyle='#efe3c7';c.fillText(n.name||'',n.x,n.y+20);return true}
  function companion(renderer){
    if(!ready())return false;const g=renderer.game,p=g.player,speed=Math.hypot(p.velocityX||0,p.velocityY||0),target={x:p.x-(speed>4?(p.velocityX||0)/speed*42:42),y:p.y-(speed>4?(p.velocityY||0)/speed*42:0)+24};
    if(!renderer.fox||Math.hypot(renderer.fox.x-target.x,renderer.fox.y-target.y)>600)renderer.fox={...target};
    const f=renderer.fox,blend=1-Math.exp(-7*(renderer.frameDt||.016));f.x+=(target.x-f.x)*blend;f.y+=(target.y-f.y)*blend;
    return actor(renderer.ctx,'fox',f.x,f.y,{time:g.time,action:speed>4?'run':'idle',face:p.velocityX<0?-1:1});
  }
  function hero(c,p,h,time){
    if(!ready()||!['an','linh','kiet'].includes(h.id))return false;
    const angle=p.moveFacing??p.facing??0,direction=Math.abs(Math.cos(angle))>Math.abs(Math.sin(angle))?(Math.cos(angle)<0?'W':'E'):(Math.sin(angle)<0?'N':'S');
    const action=p.dashTime>0?'dash':p.hit>0?'hit':p.action?({q:'q_cast',e:'e_cast',r:'r_ult'}[p.action.key]||'attack'):p.moving?'run':'idle';
    return actor(c,h.id+'_'+direction,p.x,p.y,{action,time:p.action?p.action.elapsed:time});
  }
  root.DTWorldPixel={world,actors,ready,frame,sprite,prop,terrain,ground,hero};
  root.DTActorsPixel={draw:actor,enemy,npc,companion};
  const R=root.DTRenderer.prototype,beforeEffect=R.drawEffect,beforeEnvironment=R.drawEnvironment;
  R.drawEffect=function(e){if(!e.type?.startsWith('world-'))return beforeEffect.call(this,e);const key=e.type.slice(6);return sprite(this.ctx,key,e.x,e.y,(e.maxLife-e.life)*.9)};
  R.drawEnvironment=function(p){if(['barrel','crate'].includes(p.type)&&prop(this,p))return;return beforeEnvironment?.call(this,p)};
})(globalThis);
