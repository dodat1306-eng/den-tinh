(function(root){
  'use strict';
  const character=new Image(),vfx=new Image();
  const monarchMoves=new Image(),monarchUlt=new Image(),monarchPortrait=new Image(),monarchKeyart=new Image();
  const beastSheets=[new Image(),new Image(),new Image(),new Image()];
  const CW=152,CH=128,AX=76,AY=112,M_COLS=20,M_PER_VIEW=116,U_COLS=8,U_FRAMES=64;
  const BCW=88,BCH=74,BAX=36,BAY=62,BCOLS=40,BFRAMES=200;
  const BEAST_IDS=[
    'shadow_wolf','shadow_bear','shadow_eagle','shadow_tiger','shadow_panther','shadow_lion',
    'shadow_gorilla','shadow_rhino','shadow_elephant','shadow_stag','shadow_boar','shadow_cobra',
    'shadow_scorpion','shadow_spider','shadow_croc','shadow_shark','shadow_bat','shadow_falcon',
    'shadow_mantis','shadow_crab','shadow_treant','shadow_dragon','shadow_vine_hydra','shadow_thorn_stalker'
  ];
  const BEAST_MAP=new Map(BEAST_IDS.map((id,i)=>[id,i]));
  const beastTail=new WeakMap();
  const VIEW_INDEX={S:0,E:1,N:2,W:3};
  const CLIPS={
    idle:{start:0,frames:12,fps:12},
    run:{start:12,frames:12,fps:18},
    dash:{start:24,frames:10,fps:20},
    hit:{start:34,frames:6,fps:16},
    attack:{start:40,frames:24,fps:24},
    q_cast:{start:64,frames:24,fps:24},
    e_cast:{start:88,frames:28,fps:24}
  };
  const calm=()=>!!root.DTSettings?.reducedMotion,P=()=>root.DTThienVuPixel;
  const loaded=img=>img.complete&&img.naturalWidth>0;
  const beastsReady=()=>beastSheets.every(loaded);
  const ready=()=>!!root.DTQuanLeAtlas&&!!root.DTQuanLeVFX&&loaded(character)&&loaded(vfx);
  const progressFrame=(a,frames)=>Math.min(frames-1,Math.floor(Math.max(0,a.elapsed||0)/Math.max(.01,a.duration||.01)*frames));

  function draw(c,key,index,x,y,angle=0){const clip=root.DTQuanLeVFX?.clips[key];if(!clip||!ready())return;P().flip(c,key,Math.max(0,Math.min(clip.frames-1,index)),x,y,2,angle,root.DTQuanLeVFX,vfx)}

  function portrait(c,w,h,bob=0){
    if(!loaded(monarchPortrait))return false;
    c.save();
    c.imageSmoothingEnabled=false;
    c.drawImage(monarchPortrait,4,Math.round(4+bob),Math.round(w-8),Math.round(h-8));
    c.restore();
    return true;
  }

  function hero(c,p,h,time=0,shadow=true){
    if(h.id!=='quanle'&&h.id!=='kiet')return false;

    const title=c.canvas?.id==='titleArt',card=c.canvas?.closest?.('#heroCards .hero-card');
    if(title&&loaded(monarchKeyart)){
      c.save();
      c.imageSmoothingEnabled=false;
      const w=364,h=Math.round(w*monarchKeyart.naturalHeight/monarchKeyart.naturalWidth);
      c.drawImage(monarchKeyart,Math.round(p.x-w*.52),Math.round(p.y-h+46),w,h);
      c.restore();
      return true;
    }
    if(card&&loaded(monarchPortrait)){
      c.save();
      c.imageSmoothingEnabled=false;
      const {width,height}=c.canvas,side=Math.min(width,height);
      c.drawImage(monarchPortrait,Math.round((width-side)/2),Math.round((height-side)/2),side,side);
      c.restore();
      return true;
    }
    if(!ready())return true;

    const a=p.action?.elapsed<p.action?.duration?p.action:null;
    const intro=p.ultIntro&&(p.ultIntro.cast?.key==='r'||a?.key==='r')?p.ultIntro:null;
    const angle=intro||a?(intro?.cast?.angle??a?.angle??p.aimAngle??p.facing??Math.PI/2):(root.DTBodyAngle?root.DTBodyAngle(p):p.moveFacing??p.facing??Math.PI/2);
    const view=Math.abs(Math.cos(angle))>Math.abs(Math.sin(angle))?(Math.cos(angle)<0?'W':'E'):(Math.sin(angle)<0?'N':'S');
    const action=intro?'r_ult':p.dashTime>0?'dash':p.hit>0?'hit':a?({q:'q_cast',e:'e_cast',r:'r_ult'}[a.key]||'attack'):p.moving?'run':'idle';
    const isUlt=action==='r_ult',atlas=isUlt?monarchUlt:monarchMoves;
    const useMonarch=!title&&!card&&loaded(atlas);
    const t=Number.isFinite(time)?Math.max(0,time):0,still=calm(),alpha=c.globalAlpha;

    P().screen(c,m=>{
      c.globalAlpha=alpha;
      c.imageSmoothingEnabled=false;
      const s=P().point(m,p.x,p.y),n=still?0:Math.floor(t*12)%6;
      const armor=layer=>{const q=root.DTQuanLeVFX.clips['shadow_armor_'+layer+'/'+view]?.cells[n];if(q)c.drawImage(vfx,q.x,q.y,q.w,q.h,Math.round(s.x-q.anchorX*2),Math.round(s.y-q.anchorY*2),q.w*2,q.h*2)};
      if(shadow)P().flip(c,'pixel_shadow',0,s.x,s.y+2);
      if(p.shadowArmor>0)armor('back');

      if(!useMonarch){
        const clip=root.DTQuanLeAtlas.clips[view+'/'+action],cast=intro||a;
        const index=still?0:cast?progressFrame(cast,clip.frames):Math.floor(t*clip.fps)%clip.frames;
        const f=clip.cells[index];
        c.drawImage(character,f.x,f.y,f.w,f.h,Math.round(s.x-f.anchorX*2),Math.round(s.y-f.anchorY*2),f.w*2,f.h*2);
        if(p.shadowArmor>0)armor('front');
        return;
      }

      let index,cols;
      if(isUlt){
        index=still?0:progressFrame(intro||a,U_FRAMES);
        cols=U_COLS;
      }else{
        const clip=CLIPS[action];
        let frame=still?0:Math.floor(t*clip.fps)%clip.frames;
        if(!still&&action==='attack'){
          const combo=Math.max(0,Math.min(2,Number.isInteger(p.comboIndex)?p.comboIndex:0));
          frame=combo*8+progressFrame(a,8);
        }else if(!still&&(action==='q_cast'||action==='e_cast')){
          frame=progressFrame(a,clip.frames);
        }
        index=VIEW_INDEX[view]*M_PER_VIEW+clip.start+frame;
        cols=M_COLS;
      }
      c.drawImage(atlas,index%cols*CW,Math.floor(index/cols)*CH,CW,CH,Math.round(s.x-AX),Math.round(s.y-AY),CW,CH);
    });
    return true;
  }

  function state(s){return (s.spawnAge??.45)<.45?'spawn':s.action?'attack':s.moving?'walk':'idle'}

  function beastFrameIndex(s,mode,t,still){
    if(mode==='spawn')return still?20:Math.min(27,Math.floor(Math.max(0,s.spawnAge||0)/.45*28));
    if(mode==='attack'){
      if(still)return 145;
      if(s.id){
        beastTail.set(s,t);
        return 112+progressFrame(s.action,64);
      }
      return 112+progressFrame(s.action,88);
    }
    if(!still&&mode==='idle'&&s.id&&beastTail.has(s)){
      const dt=t-beastTail.get(s);
      if(dt>=0&&dt<.38)return 176+Math.min(23,Math.floor(dt/.38*24));
      beastTail.delete(s);
    }
    if(mode==='walk')return 64+(still?0:Math.floor(t*24)%48);
    return 28+(still?0:Math.floor(t*18)%36);
  }

  function beastSpawn(c,idx,cx,cy,u,still=false){
    const bIdx=idx%22,sheet=beastSheets[Math.floor(bIdx/6)];
    if(!loaded(sheet))return false;
    const f=still?20:Math.min(27,Math.max(0,Math.floor(u*28)));
    const cell=(bIdx%6)*BFRAMES+f,sx=cell%BCOLS*BCW,sy=Math.floor(cell/BCOLS)*BCH;
    c.save();
    c.imageSmoothingEnabled=false;
    c.drawImage(sheet,sx,sy,BCW,BCH,Math.round(cx-BAX),Math.round(cy-BAY),BCW,BCH);
    c.restore();
    return true;
  }

  function beast(renderer,s){
    if(!ready())return;
    const g=renderer.game,mode=state(s),id=s.variant||s.kind,bIdx=BEAST_MAP.get(id);
    const t=Number.isFinite(g?.time)?Math.max(0,g.time):0,still=calm();
    const sheet=bIdx!==undefined?beastSheets[Math.floor(bIdx/6)]:null;
    if(sheet&&loaded(sheet)){
      const fIdx=beastFrameIndex(s,mode,t,still);
      const cell=(bIdx%6)*BFRAMES+fIdx,sx=cell%BCOLS*BCW,sy=Math.floor(cell/BCOLS)*BCH;
      const flip=Number.isFinite(s.aimAngle)&&Math.cos(s.aimAngle)<-.15;
      P().screen(renderer.ctx,m=>{
        const p=P().point(m,s.x,s.y),c=renderer.ctx,px=Math.round(p.x),py=Math.round(p.y);
        c.save();
        c.imageSmoothingEnabled=false;
        if(flip){
          c.translate(px,py);
          c.scale(-1,1);
          c.drawImage(sheet,sx,sy,BCW,BCH,-BAX*2,-BAY*2,BCW*2,BCH*2);
        }else{
          c.drawImage(sheet,sx,sy,BCW,BCH,px-BAX*2,py-BAY*2,BCW*2,BCH*2);
        }
        c.restore();
        if(s.hp<s.maxHp){
          c.fillStyle='#12091a';c.fillRect(px-22,py+5,44,4);
          c.fillStyle='#b84dff';c.fillRect(px-21,py+6,Math.round(42*Math.max(0,s.hp/s.maxHp)),2);
        }
      });
      return;
    }
    const key=id+'/'+mode,clip=root.DTQuanLeVFX.clips[key];if(!clip)return;
    const n=still?0:mode==='spawn'?Math.min(3,Math.floor(s.spawnAge/.45*4)):mode==='attack'?Math.min(clip.frames-1,Math.floor(s.action.elapsed/s.action.duration*clip.frames)):Math.floor(t*clip.fps)%clip.frames;
    const f=clip.cells[n];P().screen(renderer.ctx,m=>{const p=P().point(m,s.x,s.y),c=renderer.ctx;c.drawImage(vfx,f.x,f.y,f.w,f.h,p.x-f.anchorX*2,p.y-f.anchorY*2,f.w*2,f.h*2);if(s.hp<s.maxHp){c.fillStyle='#12091a';c.fillRect(p.x-22,p.y+5,44,4);c.fillStyle='#b84dff';c.fillRect(p.x-21,p.y+6,Math.round(42*Math.max(0,s.hp/s.maxHp)),2)}});
  }

  function remain(renderer,s){if(!ready())return;P().screen(renderer.ctx,m=>{const p=P().point(m,s.x,s.y);draw(renderer.ctx,'shadow_soul',calm()?0:Math.floor(renderer.game.time*8)%6,p.x,p.y-14)})}
  function effect(renderer,e){if(!e.type?.startsWith('shadow-'))return false;if(!ready())return true;const clip='shadow_'+e.type.slice(7),spec=root.DTQuanLeVFX.clips[clip];if(!spec)return true;
    const age=1-e.life/e.maxLife,index=calm()?2:Math.min(spec.frames-1,Math.floor(age*spec.frames));P().screen(renderer.ctx,m=>{const p=P().point(m,e.x,e.y);if(clip==='shadow_tendrils'){const f=spec.cells[index];renderer.ctx.drawImage(vfx,f.x,f.y,f.w,f.h,p.x-f.anchorX*2,p.y-f.anchorY*2,f.w*2,f.h*2)}else draw(renderer.ctx,clip,index,p.x,p.y-(clip==='shadow_crescent'?0:18),['shadow_crescent','shadow_slash'].includes(clip)?e.angle||0:0);if(clip==='shadow_legion')for(let i=0;i<14;i++){const a=i/14*Math.PI*2;draw(renderer.ctx,'shadow_portal',index,p.x+Math.cos(a)*e.r*Math.abs(m.a),p.y+Math.sin(a)*e.r*Math.abs(m.a))}});return true;
  }

  function redrawMenu(){
    if(typeof document==='undefined')return;
    const card=document.querySelector('#heroCards .hero-card[data-hero="quanle"] canvas');
    if(card&&root.DTWorld?.HEROES?.quanle){
      const ctx=card.getContext('2d');
      ctx.clearRect(0,0,card.width,card.height);
      hero(ctx,{x:28,y:67,facing:Math.PI/2},root.DTWorld.HEROES.quanle,0,false);
    }
    const sel=document.querySelector('#heroCards .hero-card.selected[data-hero="quanle"]');
    const ta=document.getElementById('titleArt');
    if(sel&&ta&&root.DTArt?.titleArt)root.DTArt.titleArt(ta,root.DTWorld.HEROES.quanle);
  }

  monarchPortrait.onload=monarchKeyart.onload=character.onload=vfx.onload=redrawMenu;
  character.src='assets/quanle-pixel-v1.png';
  vfx.src='assets/quanle-vfx-pixel.png';
  monarchMoves.src='assets/quanle-monarch-moves.png';
  monarchUlt.src='assets/quanle-monarch-r.png';
  monarchPortrait.src='assets/quanle-monarch-portrait.png';
  monarchKeyart.src='assets/quanle-monarch-keyart.png';
  beastSheets.forEach((img,i)=>{img.onload=redrawMenu;img.src='assets/quanle-beasts-'+(i+1)+'.png'});

  const R=root.DTRenderer.prototype,oldEffect=R.drawEffect,oldProjectile=R.drawProjectile;
  R.drawEffect=function(e){if(effect(this,e))return;return oldEffect.call(this,e)};
  R.drawProjectile=function(b){if(!b.shadow)return oldProjectile?.call(this,b);if(!ready())return;P().screen(this.ctx,m=>{const p=P().point(m,b.x,b.y);draw(this.ctx,'shadow_crescent',calm()?0:Math.floor(this.game.time*12)%6,p.x,p.y,b.angle||0)})};
  root.DTQuanLePixel={character,vfx,monarchMoves,monarchUlt,monarchPortrait,monarchKeyart,beastSheets,BEAST_IDS,beastsReady,ready,hero,portrait,beast,beastSpawn,remain,effect,state};
})(globalThis);
