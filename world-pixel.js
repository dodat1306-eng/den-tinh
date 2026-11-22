(function(root){
  'use strict';
  const world=new Image(),actors=new Image();world.src='assets/world-pixel-v08.png';actors.src='assets/actors-pixel-v1.png';
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
      if(stage<3){renderer.drawCastShadow?.(p.x,p.y,Math.min(62,original.w*.7),height*.5,p);shadow(c,p.x,p.y,Math.min(62,original.w*.7))}
      c.translate(Math.round(p.x),Math.round(p.y));
      if(!calm()&&stage<2&&p.status!=='frozen'){const lean=(p.bend||0)+(p.sway||0)*Math.sin(t*16)+(leafy?Math.sin(t*1.5+p.x)*.009:0);c.transform(1,0,lean,1,0,0)}
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
  const borderPalettes={
    village:{grass:['#4b7352','#5f8a5e','#3b5b43'],leaf:['#d6a85a','#c47d4e'],pebble:['#8d8470','#a89e88']},
    forest:{grass:['#285948','#3b755b','#58946e'],leaf:['#74b87d','#9ad493'],pebble:['#5c736b','#7b9187']},
    lotus:{grass:['#386865','#4f857b','#6ba18f'],leaf:['#e59db2','#82b89a'],pebble:['#617d7d','#839e9b']},
    ash:{grass:['#5d4e47','#735d52','#473b37'],leaf:['#d97538','#f0a854'],pebble:['#7a6d64','#9c8979']},
    crossroads:{grass:['#436851','#58805e','#345240'],leaf:['#c9a66b','#8fb07a'],pebble:['#7d7868','#9c9683']},
    ancient:{grass:['#35524c','#486b5e','#283e3b'],leaf:['#9b82b8','#789c7c'],pebble:['#64706c','#838f88']},
    waterfall:{grass:['#39706e','#4e8f86','#6eb3a1'],leaf:['#9be3d2','#76c4ae'],pebble:['#66878a','#8eb0b0']},
    valley:{grass:['#627d51','#78965e','#92ad6b'],leaf:['#d9cf7a','#eab66a'],pebble:['#8c8970','#aba78c']},
    ruins:{grass:['#465c70','#597387','#384a5c'],leaf:['#70d6d0','#8ea4b8'],pebble:['#738594','#96a8b5']}
  };
  function px2(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x/2)*2,Math.round(y/2)*2,Math.max(2,Math.round(w/2)*2),Math.max(2,Math.round(h/2)*2))}
  function drawOrganicBorders(c,w,ox,oy,size){
    const isRoad=(xx,yy)=>!river(xx,yy)&&root.DTWorld.nearPath(xx,yy,42);
    const isWat=(xx,yy)=>river(xx,yy)&&!root.DTWorld.frontier?.onBridge(xx,yy);
    for(let y=oy-32;y<oy+size+32;y+=32)for(let x=ox-32;x<ox+size+32;x+=32){
      const xx=x+16,yy=y+16,gx=Math.floor(x/32),gy=Math.floor(y/32),h=hash(gx,gy,w.seed+9137);
      const z=zone(xx,yy),pal=borderPalettes[z]||borderPalettes.forest;
      const road=isRoad(xx,yy),wat=isWat(xx,yy);
      // Soften every internal 32x32 seam with organic micro-tufts, moss, pebbles & fallen leaves
      if(!wat){
        for(let k=0;k<3;k++){
          const h2=hash(gx*7+k,gy*13+k,w.seed+409),offX=4+(h2%24),offY=4+((h2>>>5)%24);
          const col=road?pal.pebble[h2%2]:pal.grass[h2%3];
          px2(c,x+offX,y-2+(h2%3),2+(h2%2)*2,2,col);
          px2(c,x-2+(h2%3),y+offY,2,2+((h2>>>3)%2)*2,col);
          if(!road&&(h2&7)===0){
            const lc=pal.leaf[(h2>>>4)%pal.leaf.length];
            px2(c,x+offX+2,y+offY-2,4,2,lc);px2(c,x+offX+4,y+offY,2,2,lc);
          }
        }
      }
      // Check 4 neighbors for Road/Grass, Water/Land, and Biome/Biome transitions
      for(const [dx,dy,edge]of[[0,-32,'N'],[32,0,'E'],[0,32,'S'],[-32,0,'W']]){
        const nx=xx+dx,ny=yy+dy,nRoad=isRoad(nx,ny),nWat=isWat(nx,ny),nZone=zone(nx,ny);
        const eh=hash(gx+dx,gy+dy,w.seed+1777);
        // 1. Grass encroaching onto Dirt Road + roadside pebbles & fallen leaves
        if(!wat&&!nWat&&!road&&nRoad){
          for(let i=0;i<5;i++){
            const step=3+i*6+((eh>>>(i*2))%3),depth=2+((eh>>>(i*3))%5);
            const bx=edge==='E'?x+32-2:edge==='W'?x-depth+2:x+step;
            const by=edge==='S'?y+32-2:edge==='N'?y-depth+2:y+step;
            px2(c,bx,by,edge==='N'||edge==='S'?4:depth+2,edge==='E'||edge==='W'?4:depth+2,pal.grass[i%3]);
            if(i%2===0){
              const px=edge==='E'?x+32+depth:edge==='W'?x-depth-2:x+step+2;
              const py=edge==='S'?y+32+depth:edge==='N'?y-depth-2:y+step+2;
              px2(c,px,py,2,2,i===0?pal.leaf[eh%pal.leaf.length]:pal.pebble[eh%2]);
            }
          }
        }
        // 2. Water / Land shoreline moss, pebbles & white water foam
        if(!wat&&nWat){
          for(let i=0;i<5;i++){
            const step=2+i*6+((eh>>>i)%3);
            const fx=edge==='E'?x+30:edge==='W'?x-2:x+step;
            const fy=edge==='S'?y+30:edge==='N'?y-2:y+step;
            px2(c,fx,fy,4,4,pal.grass[i%2]);
            const foamX=edge==='E'?x+34:edge==='W'?x-4:x+step+1;
            const foamY=edge==='S'?y+34:edge==='N'?y-4:y+step+1;
            px2(c,foamX,foamY,edge==='N'||edge==='S'?4:2,edge==='E'||edge==='W'?4:2,i%2?'#d8fcf6':'#8fd9d4');
          }
        }
        // 3. Biome-to-Biome organic transition clusters
        if(!wat&&!nWat&&!road&&!nRoad&&z!==nZone){
          const npal=borderPalettes[nZone]||pal;
          for(let i=0;i<4;i++){
            const step=4+i*7,bx=edge==='E'?x+30:edge==='W'?x-2:x+step,by=edge==='S'?y+30:edge==='N'?y-2:y+step;
            px2(c,bx,by,4,4,i%2?pal.grass[0]:npal.grass[1]);
            if(i===1)px2(c,bx+2,by-2,2,2,npal.leaf[0]);
          }
        }
      }
    }
  }
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
    drawOrganicBorders(c,w,ox,oy,size);
  }
  function ground(renderer,inView){
    const c=renderer.ctx,g=renderer.game,t=calm()?0:g.time,cam=renderer.camera;
    if(ready()&&cam.x<4900&&cam.x+1280>4400&&cam.y<2000)for(let y=Math.floor(cam.y/32)*32;y<cam.y+720;y+=32)for(let x=Math.floor(cam.x/32)*32;x<cam.x+1280;x+=32)if(river(x+16,y+16)&&!root.DTWorld.frontier.onBridge(x+16,y+16)){
      const wk=waterKey(x+16,y+16);sprite(c,wk,x+16,y+16,t);
      if(wk!=='water/0'&&!calm()){
        const foam=Math.sin(t*3.6+(x+y)*.04)*2;
        c.fillStyle='#e2fffb';
        if(!river(x-16,y+16))px2(c,x+2+foam,y+8+((x*3+y)%16),2,6,'#dffcf7');
        if(!river(x+48,y+16))px2(c,x+28+foam,y+6+((x+y*5)%16),2,6,'#dffcf7');
      }
    }
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
    const h=meta.clips[e.type+'/idle'].cells[0].h*2-12;
    renderer.drawCastShadow?.(e.x,e.y,boss?54:22,h*.55,e);
    if((e.hit>0||e.hitSquash>0)&&!calm()){
      const sq=Math.min(.22,Math.max(e.hit||0,e.hitSquash||0)*1.15),ang=e.hitAngle||0;
      c.save();try{
        c.translate(Math.round(e.x+Math.cos(ang)*sq*14),Math.round(e.y-(e.throwLift||0)+Math.sin(ang)*sq*8));
        c.scale(1+sq,-sq*.65+1);
        actor(c,e.type,0,0,{action,time:elapsed,face:boss||e.type==='slime'?1:g.player.x<e.x?-1:1});
      }finally{c.restore()}
    }else{
      actor(c,e.type,e.x,e.y-(e.throwLift||0),{action,time:elapsed,face:boss||e.type==='slime'?1:g.player.x<e.x?-1:1});
    }
    actorHistory.set(e,{x:e.x,y:e.y,cool:e.cool||0,attack:old.attack});
    elite(c,e,calm()?0:t,h);
    if(e.hp<e.maxHp){c.fillStyle='#12091a';c.fillRect(Math.round(e.x-24),Math.round(e.y-h-12),48,4);c.fillStyle=e.elite?'#ffdd77':'#d9384a';c.fillRect(Math.round(e.x-23),Math.round(e.y-h-11),Math.round(46*Math.max(0,e.hp/e.maxHp)),2)}
    if(e.frozen>0){c.save();c.globalAlpha=.65;sprite(c,'frost_patch',e.x,e.y);c.restore()}
    if(e.burn>0)sprite(c,'flame',e.x,e.y-10,t);
    return true;
  }
  function dyingEnemy(renderer,d){
    if(!d)return false;
    const c=renderer.ctx,g=renderer.game,t=g.time,p=Math.max(0,Math.min(1,d.age/Math.max(.01,d.maxLife)));
    const meta=root.DTActorsPixelAtlas,clip=meta?.clips?.[d.type+'/hit']||meta?.clips?.[d.type+'/idle'],f=clip?.cells?.[0];
    const hasSprite=ready()&&!!f,w=hasSprite?f.w*2:(d.r||16)*2.2,h=hasSprite?f.h*2:(d.r||16)*2.4;
    const x=Math.round(d.x),y=Math.round(d.y);
    c.save();try{
      c.imageSmoothingEnabled=false;
      if(d.deathType==='fire'){
        // 1. Fire / An: Charred black statue with blazing orange rim, vibrating then collapsing into a swirling column of red ash
        const shake=p<.45?Math.sin(d.age*72)*3.5:0,collapse=p<.45?1:Math.max(.08,1-(p-.45)*1.75);
        c.save();c.translate(x+shake,y);c.scale(1+(1-collapse)*.38,collapse);
        c.globalAlpha=Math.max(0,1-p*.85);
        if(hasSprite)cell(c,actors,f,0,0,false);
        c.fillStyle='#140b08';c.fillRect(-w*.28,-h*.72,w*.56,h*.7);
        c.strokeStyle=p<.5?'#ff6b1a':'#ff3d00';c.lineWidth=2;c.strokeRect(-w*.28,-h*.72,w*.56,h*.7);
        c.restore();
        for(let i=0;i<14;i++){
          const swirl=Math.sin(d.age*7+i)*14*(.3+p),cy=y-6-p*(48+i*7)-(i*3),cx=x+swirl+(i%3-1)*6+p*22;
          c.globalAlpha=Math.max(0,(1-p)*.92);
          px2(c,cx,cy,i%3===0?4:2,i%2===0?4:2,i%3===0?'#ffdd77':i%2?'#ff5e1a':'#261714');
        }
      }else if(d.deathType==='ice'){
        // 2. Ice: Freezes into bright cyan crystal block for 0.18s, then shatters into 8-10 sharp ice shards sliding across the ground
        if(d.age<=.18){
          if(hasSprite)cell(c,actors,f,x,y,false);
          c.globalAlpha=.78;c.fillStyle='#67e8f9';c.fillRect(x-w*.32,y-h*.78,w*.64,h*.78);
          c.strokeStyle='#ecfeff';c.lineWidth=2;c.strokeRect(x-w*.32,y-h*.78,w*.64,h*.78);
          c.fillStyle='#ffffff';c.fillRect(x-w*.2,y-h*.68,4,h*.5);
        }else{
          const sp=Math.max(0,1-(d.age-.18)/Math.max(.1,d.maxLife-.18));
          c.globalAlpha=sp;
          for(let i=0;i<d.shards.length;i++){
            const s=d.shards[i],sx=x+s.dx,sy=y-10+s.dy;
            c.save();c.translate(sx,sy);c.rotate(s.rot);
            c.fillStyle=i%2?'#67e8f9':'#cffafe';
            c.beginPath();c.moveTo(0,-s.size*1.4);c.lineTo(s.size,s.size*.8);c.lineTo(-s.size*.9,s.size);c.closePath();c.fill();
            c.strokeStyle='#ffffff';c.lineWidth=1;c.stroke();
            c.restore();
          }
        }
      }else if(d.deathType==='lightning'){
        // 3. Lightning: High-voltage convulsion, flashing white-purple-black exposing energy skeleton, then exploding into electric arcs
        const joltX=Math.sin(d.age*96)*4.5,joltY=Math.cos(d.age*82)*2.5,flash=Math.floor(d.age*32)%3;
        c.save();c.translate(x+joltX,y+joltY);
        c.globalAlpha=Math.max(0,1-p*.75);
        if(hasSprite&&flash===0)cell(c,actors,f,0,0,false);
        const bg=flash===0?'#090414':flash===1?'#a855f7':'#ffffff',fg=flash===2?'#3b0764':'#fef08a';
        c.fillStyle=bg;c.fillRect(-w*.26,-h*.72,w*.52,h*.68);
        // Energy skeleton (skull, spine & ribs)
        c.fillStyle=fg;
        c.fillRect(-5,-h*.64,10,8); // skull
        c.fillRect(-1,-h*.54,2,h*.38); // spine
        for(let r=0;r<3;r++)c.fillRect(-8,-h*(.48-r*.1),16,2); // ribs
        c.restore();
        c.strokeStyle=flash%2?'#fef08a':'#c084fc';c.lineWidth=2;
        for(let i=0;i<6;i++){
          const a=i/6*Math.PI*2+d.age*5,r1=8+p*14,r2=18+p*44;
          c.beginPath();c.moveTo(x+Math.cos(a)*r1,y-18+Math.sin(a)*r1);
          c.lineTo(x+Math.cos(a+.2)*(r1+r2)*.5,y-18+Math.sin(a-.2)*(r1+r2)*.5);
          c.lineTo(x+Math.cos(a)*r2,y-18+Math.sin(a)*r2);c.stroke();
        }
      }else if(d.deathType==='shadow'){
        // 4. Shadow / Quan Le: Swirling dark abyss puddle opens, 4 shadow arms/tendrils wrap the enemy and drag it down into the abyss
        const poolR=Math.max(16,d.r*1.65)*Math.sin(Math.min(1,p*1.25)*Math.PI*.85);
        c.fillStyle='#06030d';c.beginPath();c.ellipse(x,y+2,Math.max(1,poolR),Math.max(1,poolR*.42),0,0,Math.PI*2);c.fill();
        c.strokeStyle='#9333ea';c.lineWidth=2;c.beginPath();c.ellipse(x,y+2,Math.max(1,poolR*.88),Math.max(1,poolR*.35),0,d.age*5,d.age*5+Math.PI*1.6);c.stroke();
        const sink=Math.max(0,(p-.15)*1.18)*h*.85;
        c.save();c.beginPath();c.rect(x-w,y-h*1.5,w*2,h*1.5+2);c.clip();
        if(hasSprite)cell(c,actors,f,x,y+sink,false);
        else{c.fillStyle='#3b1d5e';c.fillRect(x-14,y-36+sink,28,36)}
        // 4 shadow tendrils wrapping and pulling down
        for(let i=0;i<4;i++){
          const side=i<2?-1:1,spread=(i%2?.55:1)*poolR*.65,reach=Math.sin(Math.min(1,p*1.4)*Math.PI)*(h*.62);
          c.strokeStyle=i%2?'#a855f7':'#1e1b4b';c.lineWidth=4-i%2;
          c.beginPath();c.moveTo(x+side*spread,y+2);
          c.quadraticCurveTo(x+side*(spread*1.2),y-reach*.6+sink*.4,x-side*6,y-reach+sink*.6);
          c.stroke();
        }
        c.restore();
      }else if(d.deathType==='code'){
        // 5. Code / HoaVi: Sliced into 5 horizontal glitch bands shifting apart, then dissolving into cyan-pink 0/1 pixel stream
        const slices=5;
        if(p<.78){
          for(let i=0;i<slices;i++){
            const dir=i%2?1:-1,shift=dir*(4+p*32)+Math.sin(d.age*60+i*2)*4;
            c.save();c.globalAlpha=Math.max(0,1-p*1.15);
            if(hasSprite){
              const sy=f.y+Math.floor(i*f.h/slices),sh=Math.max(1,Math.floor(f.h/slices));
              const dy=Math.round(y-f.anchorY*2+i*(f.h*2/slices));
              c.drawImage(actors,f.x,sy,f.w,sh,Math.round(x-f.anchorX*2+shift),dy,f.w*2,sh*2);
            }
            c.fillStyle=i%2?'#22d3ee':'#f472b6';
            c.fillRect(Math.round(x-w*.3+shift),Math.round(y-h*.75+i*(h*.15)),Math.round(w*.6),2);
            c.restore();
          }
        }
        c.font='bold 11px Consolas, monospace';c.textAlign='center';
        for(let i=0;i<d.shards.length;i++){
          const s=d.shards[i],cx=x+(i-4.5)*7+Math.sin(d.age*8+i)*4,cy=y-10+s.dy*.85;
          c.globalAlpha=Math.max(0,1-p*.9);
          c.fillStyle=i%2?'#22d3ee':'#f472b6';
          c.fillText(s.char,cx,cy);
        }
      }else{
        // 6. Physical / Wind / Earth / Nature: Knocked backward along killing vector, tilted, bounces once, then dissolves into a spirit wisp flying toward player
        const fade=Math.max(0,1-p*.92);
        c.save();c.translate(x,y-d.z);c.rotate((d.vx>=0?1:-1)*p*1.35);c.globalAlpha=fade;
        if(hasSprite)cell(c,actors,f,0,0,false);
        else{c.fillStyle='#86a397';c.fillRect(-14,-28,28,28)}
        c.restore();
        if(p>.35&&g.player){
          const sp=(p-.35)/.65,sx=x+(g.player.x-x)*sp,sy=(y-18)+(g.player.y-22-(y-18))*sp-Math.sin(sp*Math.PI)*28;
          c.globalAlpha=Math.sin(sp*Math.PI);
          c.fillStyle='#a7f3d0';c.beginPath();c.arc(sx,sy,5,0,Math.PI*2);c.fill();
          c.fillStyle='#ffffff';c.beginPath();c.arc(sx,sy,2.5,0,Math.PI*2);c.fill();
        }
      }
    }finally{c.restore()}
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
    if(!ready()||!['an','linh'].includes(h.id))return false;
    const angle=p.moveFacing??p.facing??0,direction=Math.abs(Math.cos(angle))>Math.abs(Math.sin(angle))?(Math.cos(angle)<0?'W':'E'):(Math.sin(angle)<0?'N':'S');
    const action=p.dashTime>0?'dash':p.hit>0?'hit':p.action?({q:'q_cast',e:'e_cast',r:'r_ult'}[p.action.key]||'attack'):p.moving?'run':'idle';
    const clip=root.DTActorsPixelAtlas.clips[h.id+'_'+direction+'/'+action],number=p.action&&clip?Math.min(clip.frames-1,Math.floor(p.action.elapsed/p.action.duration*clip.frames)):undefined;
    return actor(c,h.id+'_'+direction,p.x,p.y,{action,time:p.action?p.action.elapsed:time,frame:number});
  }
  root.DTWorldPixel={world,actors,ready,frame,sprite,prop,terrain,ground,hero,drawOrganicBorders};
  root.DTActorsPixel={draw:actor,enemy,dyingEnemy,npc,companion};
  const R=root.DTRenderer.prototype,beforeEffect=R.drawEffect,beforeEnvironment=R.drawEnvironment;
  R.drawDyingEnemy=function(d){return dyingEnemy(this,d)};
  R.drawEffect=function(e){if(!e.type?.startsWith('world-'))return beforeEffect.call(this,e);const key=e.type.slice(6);return sprite(this.ctx,key,e.x,e.y,(e.maxLife-e.life)*.9)};
  R.drawEnvironment=function(p){if(['barrel','crate'].includes(p.type)&&prop(this,p))return;return beforeEnvironment?.call(this,p)};
})(globalThis);
