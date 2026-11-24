(function(root){
  'use strict';
  const moves=new Image(),ultimate=new Image(),charge=new Image();
  const moveCell={w:178,h:161,x:72,y:139,cols:10},rCell={w:204,h:156,x:79,y:127,cols:12};
  const eCell={w:148,h:128,x:74,y:107,cols:10};
  let viewFrames=0;
  const clips=Object.fromEntries(Object.entries({
    idle:4,run:8,dash:4,hit:3,attack1:10,attack2:10,attack3:10,q:22,recall:18,e:12,counter:9,
  }).map(([key,count])=>{const start=viewFrames;viewFrames+=count;return [key,[start,count]]}));
  const ready=()=>moves.naturalHeight>=Math.ceil((viewFrames*2+1)/moveCell.cols)*moveCell.h
    &&ultimate.naturalWidth===rCell.cols*rCell.w;
  const chargeReady=()=>charge.naturalWidth===eCell.cols*eCell.w;
  const calm=()=>!!root.DTSettings?.reducedMotion;
  const clamp01=n=>Math.max(0,Math.min(1,n));
  const art=()=>root.DTThienVuPixel;

  function ultimateFrame(elapsed){
    const {frames,fps}=root.DTHuyenKha;
    return Math.max(0,Math.min(frames-1,Math.floor((elapsed+1e-9)*fps)));
  }
  function chargeFrame(elapsed){
    const {chargeFrames,fps}=root.DTHuyenKha;
    return Math.max(0,Math.min(chargeFrames-1,Math.floor((elapsed+1e-9)*fps)));
  }

  function cell(c,image,frame,box,x,y,scale,face){
    c.save();
    c.translate(x,y);
    c.scale(face,1);
    c.drawImage(image,frame%box.cols*box.w,Math.floor(frame/box.cols)*box.h,box.w,box.h,
      -Math.round(box.x*scale),-Math.round(box.y*scale),Math.round(box.w*scale),Math.round(box.h*scale));
    c.restore();
  }

  function hero(c,p,time=0,scale=1){
    const action=p.action;
    const angle=p.ultIntro?.cast?.angle??action?.angle??(p.moving||p.dashTime>0?p.moveFacing:p.facing)??0;
    const face=Math.cos(angle)<0?-1:1;
    const cast=p.ultIntro&&(action?.key==='r'||p.ultIntro.cast?.key==='r');
    const clip=p.dashTime>0?'dash':action?.recall?'recall':action?.key==='attack'?(action.combo==='counter'?'counter':'attack'+(action.combo||1)):
      action?.key==='q'||action?.key==='e'?action.key:p.hit>0?'hit':p.moving?'run':'idle';
    const [start,count]=clips[clip],elapsed=action?.elapsed||0;
    const phase=action&&['attack','q','e'].includes(action.key)&&!p.dashTime?
      Math.min(count-1,Math.floor(clamp01(elapsed/action.duration)*count)):
      Math.floor(time*(clip==='idle'?5:13))%count;
    const frame=start+(calm()&&!action?0:phase)+(Math.sin(angle)<-.65?viewFrames:0);
    const charging=action?.key==='e'&&p.dashTime<=0&&chargeReady()&&!calm();
    if(cast||charging){
      art().screen(c,m=>{
        const at=art().point(m,p.x,p.y);
        art().flip(c,'pixel_shadow',0,at.x,at.y+2);
        if(charging)cell(c,charge,chargeFrame(elapsed),eCell,at.x,at.y,1.22*scale,face);
        else if(calm())cell(c,moves,frame,moveCell,at.x,at.y,1.22*scale,face);
        else cell(c,ultimate,ultimateFrame(p.ultIntro.elapsed),rCell,at.x,at.y,1.22*scale,face);
      });
      return;
    }
    art().screen(c,m=>{
      const at=art().point(m,p.x,p.y),unit=1.22*scale;
      if(scale<2)art().flip(c,'pixel_shadow',0,at.x,at.y+2);
      if(p.dashTime>0&&!calm()){
        c.globalAlpha=.22;
        cell(c,moves,frame,moveCell,at.x-18*Math.cos(angle),at.y-18*Math.sin(angle),unit,face);
        c.globalAlpha=1;
      }
      cell(c,moves,frame,moveCell,at.x,at.y,unit,face);
    });
  }

  function portrait(c,w,h,bob){
    c.drawImage(moves,52,66,42,44,0,4+bob,w,h*1.08);
  }

  function stroke(c,points,color,width){
    c.strokeStyle=color;c.lineWidth=width;c.beginPath();
    for(const [i,p] of points.entries())if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);
    c.stroke();
  }

  function drawAnchor(c,f,p){
    if(!ready())return;
    const anchored=f.phase==='anchored',out=f.phase==='outbound',t=f.flight;
    const blade=anchored?f:f.blade;
    const height=anchored?34:24+(calm()?0:Math.sin(t*Math.PI)*59);
    c.save();
    try{
      if(anchored&&f.linked){
        const path=[{x:p.x,y:p.y-23},{x:f.x,y:f.y-21}];
        stroke(c,path,'#152934',8);
        stroke(c,path,'#49baf4',4);
        stroke(c,path,'#fff1aa',1.5);
        if(!calm()){
          c.fillStyle='#dceeff';
          for(let i=0;i<6;i++){
            const n=(i/6+f.age*.8)%1;
            const x=path[0].x+(path[1].x-path[0].x)*n,y=path[0].y+(path[1].y-path[0].y)*n;
            c.fillRect(x-2,y-2,4,4);
          }
        }
      }
      if(anchored){
        const a=calm()?0:f.age*.9;
        const diamond=Array.from({length:5},(_,i)=>({x:f.x+Math.cos(a+i*Math.PI/2)*33,y:f.y+Math.sin(a+i*Math.PI/2)*14}));
        stroke(c,diamond,'#55c9ff',3);
        c.strokeStyle='#ffe191';c.lineWidth=2;c.beginPath();c.ellipse(f.x,f.y,27,9,0,0,Math.PI*2);c.stroke();
      }
      const spin=anchored?1.32:f.angle+(out?1:-1)*(calm()?0:t*Math.PI*3.7);
      c.translate(blade.x,blade.y-height);c.rotate(spin);
      c.imageSmoothingEnabled=false;
      const index=viewFrames*2;
      c.drawImage(moves,index%moveCell.cols*moveCell.w+54,Math.floor(index/moveCell.cols)*moveCell.h+107,100,32,-38,-15,89,28);
    }finally{c.restore()}
  }

  function drawRift(c,intro){
    const rift=intro.rift;
    if(!rift)return;
    const {release,collapseDelay}=root.DTHuyenKha;
    const elapsed=intro.elapsed-release,alpha=rift.closed?Math.max(0,1-(elapsed-collapseDelay)/.95):1;
    if(alpha<=0)return;
    c.save();
    try{
      const {points,width}=rift,path=[];
      for(let s=1;s<points.length;s++){
        const a=points[s-1],b=points[s],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1;
        for(let i=0;i<=18;i++){
          const t=i/18,offset=(Math.sin(i*4.1)+Math.sin(i*1.8))*(rift.closed?2:8)*Math.sin(Math.PI*t);
          path.push({x:a.x+dx*t-dy/length*offset,y:a.y+dy*t+dx/length*offset});
        }
      }
      c.globalAlpha=alpha*.24;
      c.lineJoin='round';c.lineCap='round';
      stroke(c,points,rift.closed?'#dfa847':'#3773a9',width*(rift.closed?2.4:2));
      c.globalAlpha=alpha*.93;
      stroke(c,path,'#132a47',rift.closed?20:27);
      stroke(c,path,rift.closed?'#54dbff':'#599dff',rift.closed?11:16);
      stroke(c,path,'#ffc853',rift.closed?8:11);
      stroke(c,path,'#fff8cb',rift.closed?5:3);
      const pull=rift.closed?1:clamp01(elapsed/collapseDelay);
      for(let i=2;i<path.length-1;i+=2){
        const p=path[i],dx=path[i+1].x-p.x,dy=path[i+1].y-p.y,n=Math.hypot(dx,dy)||1;
        for(const side of [-1,1]){
          const offset=width*(rift.closed?.25+(.5-alpha*.3):.86-.60*pull);
          const x=p.x-dy/n*offset*side,y=p.y+dx/n*offset*side;
          c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));c.globalAlpha=alpha*.85;
          stroke(c,[{x:-7,y:-5*side},{x:0,y:2*side},{x:7,y:-5*side}],side>0?'#8fe6ff':'#ffdfa0',2);
          c.restore();
        }
      }
    }finally{c.restore()}
  }

  const R=root.DTRenderer.prototype,drawEffect=R.drawEffect,drawField=R.drawMythicField;
  R.drawEffect=function(e){
    if(!e.type?.startsWith('huyenkha-'))return drawEffect.call(this,e);
    const c=this.ctx,u=clamp01(1-e.life/e.maxLife);
    c.save();
    try{
      c.globalAlpha*=1-u;
      if(e.type==='huyenkha-sweep'){
        const end=e.r*(.70+Math.min(u*2,1)*.30);
        for(const [color,offset,width] of [['#345db3',0,17],['#73cbff',-5,10],['#ffd24c',-11,7],['#fff7ce',-14,3]]){
          c.strokeStyle=color;
          c.lineWidth=width;
          c.beginPath();
          for(let i=0;i<=26;i++){
            const a=e.angle-e.arc+2*e.arc*i/26,r=end+offset+Math.sin(i*1.5-u*14)*2;
            const x=e.x+Math.cos(a)*r,y=e.y+Math.sin(a)*r-4;
            if(i)c.lineTo(x,y);else c.moveTo(x,y);
          }
          c.stroke();
        }
      }else if(e.type==='huyenkha-anchor-impact'){
        for(const [color,scale] of [['#64caff',1],['#ffe7a3',.71]]){
          const radius=e.r*(.25+u*.75)*scale;
          stroke(c,Array.from({length:9},(_,i)=>({x:e.x+Math.cos(i*Math.PI/4)*radius,y:e.y+Math.sin(i*Math.PI/4)*radius*.61})),color,4);
        }
      }else if(e.type==='huyenkha-electric-ring'){
        const radius=e.r*(.33+.67*u),ring=[];
        for(let i=0;i<=32;i++){
          const a=i*Math.PI/16,r=radius+(calm()?0:Math.sin(i*2.37+e.pulse)*9*(1-u));
          ring.push({x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r*.7});
        }
        stroke(c,ring,'#3e50bb',10);
        stroke(c,ring,'#78e5ff',5);
        stroke(c,ring,'#fff4cc',2);
      }else{
        c.translate(e.x,e.y);
        c.strokeStyle='#fff0d2';c.lineWidth=4;c.beginPath();
        c.ellipse(0,0,35+u*40,12+u*20,0,0,Math.PI*2);c.stroke();
      }
    }finally{c.restore()}
  };
  R.drawMythicField=function(f){
    if(f.kind!=='greatsword-ward')return drawField.call(this,f);
    const p=this.game.player,c=this.ctx;
    if(f.life<=0||p.shield<=0)return;
    c.save();
    c.translate(p.x,p.y);
    c.globalAlpha=f.spent?.42:.8;
    c.strokeStyle='#ffdc92';
    c.lineWidth=2;
    c.beginPath();c.ellipse(0,-4,36,14,0,0,Math.PI*2);c.stroke();
    c.strokeStyle='#fff0d2';c.beginPath();
    c.moveTo(-27,-11);c.lineTo(-25,-38);c.lineTo(0,-52);c.lineTo(25,-38);
    c.lineTo(27,-11);c.lineTo(0,-3);c.closePath();c.stroke();
    c.restore();
  };

  root.DTHuyenKhaPixel={ready,chargeReady,hero,portrait,ultimateFrame,chargeFrame,drawAnchor,drawRift};
  function redraw(){
    if(!ready())return;
    for(const canvas of document.querySelectorAll('canvas[data-huyenkha]')){
      const c=canvas.getContext('2d');
      c.clearRect(0,0,canvas.width,canvas.height);
      hero(c,{x:64,y:116,facing:0},0,.82);
    }
    const selected=document.querySelector('.hero-card.selected canvas[data-huyenkha]');
    if(selected)root.DTArt.titleArt(document.getElementById('titleArt'),root.DTWorld.HEROES.huyenkha);
  }
  moves.onload=ultimate.onload=redraw;
  moves.src='assets/huyenkha-moves.png';
  ultimate.src='assets/huyenkha-r.png';
  charge.src='assets/huyenkha-e.png';
})(globalThis);
