(function(root){
  'use strict';
  const R=root.DTRenderer.prototype,P=()=>root.DTThienVuPixel;
  const oldHero=root.DTVisualHero,oldEffect=R.drawEffect,oldDraw=R.draw,oldProjectile=R.drawProjectile,oldEnemy=R.drawEnemy;
  function drawAvatar(c,p,form,time=0,scale=1,clone=false){return P()?.hero(c,{...p,elementForm:form},time,-Infinity,clone)}
  root.DTVisualHero=function(c,p,h,time=0,scale=1,npc=false){if(h.id!=='thienvu'||npc)return oldHero(c,p,h,time,scale,npc);drawAvatar(c,p,p.elementForm||'lightning',time)};
  R.drawElementClone=function(clone){drawAvatar(this.ctx,clone,clone.element,this.game.time,1,true)};
  R.drawElementSummon=function(summon){P()?.summon(this,summon)};
  R.drawEffect=function(e){if(!P()?.effect(this,e))oldEffect.call(this,e)};
  R.drawProjectile=function(b){if(!P()?.projectile(this,b))oldProjectile.call(this,b)};
  R.drawEnemy=function(e){oldEnemy.call(this,e);if(this.game.hero.id==='thienvu')P()?.status(this,e)};
  R.draw=function(dt,menu){oldDraw.call(this,dt,menu);const g=this.game;if(menu||!g.isElemental)return;
    const c=this.ctx;c.save();try{c.scale(this.zoom,this.zoom);c.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));for(const field of g.elementFields)if(Math.hypot(field.x-g.player.x,field.y-g.player.y)<900)P()?.field(this,field,true)}finally{c.restore()}
    if(g.elementCinema){const cinema=g.elementCinema,f=root.DTElements.byId(cinema.element);c.save();try{
      c.globalAlpha=1;c.imageSmoothingEnabled=false;c.fillStyle='#100b18';c.fillRect(380,495,520,78);
      drawAvatar(c,{x:430,y:570,facing:Math.PI/2},cinema.element,g.time);
      c.textAlign='center';c.font='bold 15px "DenTinh Sans", sans-serif';c.fillStyle=f.accent;c.fillText(cinema.name.toUpperCase(),662,543);
    }finally{c.restore()}}
  };
  root.DTElementArt={art:root.DTThienVuPixel?.character,drawAvatar};
})(globalThis);
