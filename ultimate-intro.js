(function(root){
  'use strict';
  const TAU=Math.PI*2,clamp=n=>Math.max(0,Math.min(1,n));
  const colors=['#EF4444','#38BDF8','#D97706','#F97316','#06B6D4','#22C55E','#FDE047'];
  const words={thienvu:['THIÊN VŨ PHÂN THÂN — THẤT NGUYÊN TỐ!','KHAI MỞ TRẬN ĐỒ','THẤT LINH HIỂN ẤN','TÁCH BÓNG · TRIỆU KHÍ','KUASA TUJUH'],quanle:['BÁCH QUỶ DẠ HÀNH','DẠ VỰC BUÔNG XUỐNG','HUYẾT ẤN KHAI MÔN','TRỖI DẬY (ARISE)','QUÂN ĐOÀN XUNG PHONG'],hoavi:['OVERCLOCK: MA TRẬN BIÊN DỊCH TỐI THƯỢNG','TERMINAL ONLINE','ASSEMBLING TWIN CYBER-LOTUS','COMPILE 100%','OVERCLOCK'],an:['THIÊN ĐĂNG PHƯỢNG HOÀNG KHAI HỎA','THIÊN ĐĂNG THỨC TỈNH','BÁT ĐĂNG QUY VỊ','PHƯỢNG HOÀNG KHAI HỎA','THIÊN ĐĂNG'],linh:['PHONG LINH VẠN TIỄN TRẬN','TRÚC LÂM HIỆN ẢNH','ĐẠI CUNG PHONG LINH','VẠN TIỄN QUY TÂM','PHONG LINH']};
  function line(c,pts,col,width=2){c.strokeStyle=col;c.lineWidth=width;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.stroke()}
  function poly(c,pts,col){c.fillStyle=col;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill()}
  function ring(c,x,y,r,col,ys=.44,spin=0,n=56){line(c,Array.from({length:n+1},(_,i)=>{const a=i/n*TAU+spin;return[x+Math.cos(a)*r,y+Math.sin(a)*r*ys]}),col)}
  function runes(c,x,y,r,col,spin){for(let i=0;i<28;i++){const a=i*TAU/28+spin,co=Math.cos(a),si=Math.sin(a),at=(u,v)=>[x+co*(r+v)-si*u,y+(si*(r+v)+co*u)*.44];line(c,[at(0,-5),at(0,5),at(i%2?4:-4,1)],col,1);if(i%3===0)line(c,[at(-3,-2),at(3,2)],col,1)}}
  function crest(c,id,x,y){
    const col=colors[id];c.save();c.translate(x,y);ring(c,0,0,18,col,1,0,28);c.fillStyle='#080b19';c.fillRect(-12,-12,24,24);
    if(id===0)for(const d of[-4,4])poly(c,[[d+3,-13],[d-6,1],[d,0],[d-3,13],[d+8,-3],[d+2,-2]],d<0?'#EF4444':'#FACC15');
    if(id===1)for(const side of[-1,1])line(c,Array.from({length:21},(_,j)=>{const a=j/20*TAU*1.3;return[side*4+Math.cos(a)*(12-j*.45),Math.sin(a)*(10-j*.35)]}),side<0?col:'#E0F2FE');
    if(id===2){poly(c,[[-12,-4],[-9,-11],[-3,-8],[2,-12],[7,-9],[12,-5],[9,12],[-6,12]],col);for(let i=0;i<4;i++)line(c,[[-8+i*5,-8],[-8+i*5,2]],'#FEF3C7')}
    if(id===3){poly(c,[[-10,11],[-13,1],[-6,-5],[-3,-13],[5,-7],[3,-2],[10,-6],[13,5],[6,13]],col);poly(c,[[-5,10],[-3,0],[2,4],[5,1],[6,10]],'#FEF08A')}
    if(id===4)for(let i=0;i<6;i++){const a=i*TAU/6,co=Math.cos(a),si=Math.sin(a);line(c,[[0,0],[co*14,si*14]],'#ECFEFF');for(const side of[-1,1])line(c,[[co*8,si*8],[co*8+Math.cos(a+side*.9)*5,si*8+Math.sin(a+side*.9)*5]],col)}
    if(id===5){line(c,Array.from({length:25},(_,i)=>[Math.sin(i*.32)*7,13-i]),col,3);for(const side of[-1,1])for(let i=0;i<3;i++)poly(c,[[0,8-i*8],[side*12,4-i*8],[side*5,0-i*8]],i%2?col:'#DCFCE7')}
    if(id===6){ring(c,0,0,7,'#FFFFFF',1);for(let i=0;i<8;i++){const a=i*TAU/8;poly(c,[[Math.cos(a-.2)*9,Math.sin(a-.2)*9],[Math.cos(a)*16,Math.sin(a)*16],[Math.cos(a+.2)*9,Math.sin(a+.2)*9]],col)}}
    c.restore();
  }
  function pillar(c,x,y,col,u,height=140){c.save();c.globalAlpha=clamp(u)*.38;c.fillStyle=col;c.fillRect(x-10,y-height,20,height);c.globalAlpha=clamp(u);line(c,[[x-8,y],[x-3,y-height],[x+3,y-height],[x+8,y]],col,2);c.restore()}
  function weapon(c,i,x,y,col){
    if(i===0)line(c,[[x-12,y+14],[x+10,y-18],[x+4,y-14],[x+7,y-23]],col,4);
    if(i===1)for(let n=0;n<6;n++)line(c,[[x,y+13],[x-20+n*8,y-16]],col,2);
    if(i===2)for(const s of[-1,1]){c.fillStyle=col;c.fillRect(x+s*12-7,y-5,14,17)}
    if(i===3){ring(c,x,y,19,col,1);for(let n=0;n<8;n++){const a=n*TAU/8;line(c,[[x+Math.cos(a)*18,y+Math.sin(a)*18],[x+Math.cos(a+.2)*25,y+Math.sin(a+.2)*25]],col,3)}}
    if(i===4){line(c,[[x,y+22],[x,y-12]],col,4);c.fillStyle=col;c.fillRect(x-15,y-20,30,15)}
    if(i===5)line(c,Array.from({length:16},(_,n)=>[x+Math.sin(n*.6)*18,y-20+n*3]),col,3);
    if(i===6)ring(c,x,y-8,25,col,1);
  }
  function thienvu(c,x,y,t,calm,st,g){
    const count=st.splitCount||7,els=g.getSplitElementList(count),radius=20+130*clamp(t/1.2),spin=calm?0:t*.35;
    const points=Array.from({length:count},(_,i)=>{const a=-Math.PI/2+i*TAU/count;return[x+Math.cos(a)*radius,y+Math.sin(a)*radius*.44]});
    const connect=(step,col)=>line(c,Array.from({length:count+1},(_,i)=>points[i*step%count]),col);
    for(let i=0;i<(count===7?3:2);i++){const r=radius*(1+i*.12),col=i%2?'#FDE047':'#F59E0B',a=spin*(i%2?-1:1);ring(c,x,y,r,col,.44,a);runes(c,x,y,r,col,a)}
    if(count===3){connect(1,'#FDE047');line(c,Array.from({length:4},(_,i)=>{const a=Math.PI/2+i*TAU/3-spin;return[x+Math.cos(a)*radius*.65,y+Math.sin(a)*radius*.286]}),'#80D8FF')}
    else if(count===5){connect(1,'#F59E0B');connect(2,'#FDE047');line(c,Array.from({length:21},(_,i)=>{const a=i*TAU/20+spin,r=radius*(i%2?1.18:1.32);return[x+Math.cos(a)*r,y+Math.sin(a)*r*.44]}),'#80D8FF')}
    else{connect(2,'#FDE047');connect(3,'#80D8FF')}
    const ids=['lightning','wind','earth','fire','ice','nature','light'];
    points.forEach(([cx,cy],i)=>{const id=ids.indexOf(els[i].id),on=t>=1.2+i*.12;if(!on)return;const u=clamp((t-1.2-i*.12)/.25);pillar(c,cx,cy,colors[id],u);crest(c,id,cx,cy);
      if(t/4.2>.35)line(c,[[x,y-45],[cx,cy-35]],colors[id]);
      if(t>=2.8){const emerge=clamp((t-2.8)/1.1),bx=x+(cx-x)*emerge,by=y+(cy-y)*emerge;c.save();c.globalAlpha=emerge*.8;poly(c,[[bx-10,by-15],[bx-13,by-45],[bx,by-56],[bx+13,by-45],[bx+10,by-15]],colors[id]);weapon(c,id,bx+(i%2?18:-18),by-35,colors[id]);c.restore()}
    });
    if(t>3.8&&!calm)for(const el of els)ring(c,x,y,150+(t-3.8)*650,el.color,.44);
  }
  function quanle(c,x,y,t,calm){
    const r=420*clamp(t/1.2);c.save();c.globalAlpha=.82;poly(c,Array.from({length:56},(_,i)=>{const a=i*TAU/56;return[x+Math.cos(a)*r,y+Math.sin(a)*r*.44]}),'#05030A');c.restore();ring(c,x,y,r,'#9333EA');ring(c,x,y,r*.98,'#38BDF8');
    if(t>=1.2){for(let i=0;i<8;i++){const a=i*TAU/8,cx=x+Math.cos(a)*210,cy=y+Math.sin(a)*90;pillar(c,cx,cy,'#9333EA',clamp((t-1.2)/.5),100)}
      const clips=Object.entries(root.DTQuanLeVFX?.clips||{}).filter(([key])=>key.endsWith('/spawn')).slice(0,22);
      for(let i=0;i<22;i++){const a=i*2.39996,rr=65+(i%5)*48,cx=x+Math.cos(a)*rr,cy=y+Math.sin(a)*rr*.40;ring(c,cx,cy,26,'#9333EA');ring(c,cx,cy,20,'#38BDF8');const u=clamp((t-1.4-i*.045)/1.5),clip=clips[i]?.[1],f=clip?.cells[calm?0:Math.min(3,Math.floor(u*4))];if(f&&root.DTQuanLePixel?.ready())c.drawImage(root.DTQuanLePixel.vfx,f.x,f.y,f.w,f.h,Math.round(cx-f.anchorX*1.3),Math.round(cy-f.anchorY*1.3),Math.round(f.w*1.3),Math.round(f.h*1.3));}}
    if(t>=2.8){c.textAlign='center';c.font='bold 25px Segoe UI';c.fillStyle='#c084fc';c.fillText('TRỖI DẬY (ARISE)',x,y-145)}
    if(t>=4){line(c,[[x+12,y-420],[x-12,y-230],[x+13,y-245],[x,y]],'#5ce1e6',7);ring(c,x,y,80+(t-4)*560,'#9333EA')}
  }
  function hoavi(c,x,y,t,calm){
    for(let i=0;i<3;i++){const a=-Math.PI/2+(i-1)*1.1,cx=x+Math.cos(a)*140,cy=y-45+Math.sin(a)*70;c.fillStyle='#071925';c.fillRect(cx-62,cy-36,124,72);c.strokeStyle='#22D3EE';c.strokeRect(cx-62,cy-36,124,72);c.font='10px monospace';for(let j=0;j<5;j++){c.fillStyle=j%2?'#22D3EE':'#a78bfa';c.fillText(['> compile.soul()','if (light) arise();','kernel.sync(7);','// twin lotus online','return OVERCLOCK;'][(j+(calm?0:Math.floor(t*4)))%5],cx-55,cy-22+j*12)}}
    if(t>=1.5){for(let i=0;i<30;i++){c.fillStyle=i%2?'#164e63':'#22D3EE';c.fillRect(x-120+(i%10)*24,y+15+Math.floor(i/10)*9,20,6)}for(const side of[-1,1]){const sx=x+side*105,sy=y-100;ring(c,sx,sy,25,'#22D3EE',.7);for(let i=0;i<6;i++){const a=i*TAU/6+(calm?0:t*.3),rr=15+18*(1-clamp((t-1.5)/1.7));poly(c,[[sx+Math.cos(a)*rr,sy+Math.sin(a)*rr],[sx+Math.cos(a+.25)*36,sy+Math.sin(a+.25)*28],[sx+Math.cos(a+.5)*rr,sy+Math.sin(a+.5)*rr]],i%2?'#a78bfa':'#22D3EE')}c.fillStyle='#e0f2fe';c.fillRect(sx-5,sy-6,10,12)}}
    c.textAlign='center';c.font='bold 20px monospace';c.fillStyle='#22D3EE';c.fillText('COMPILE '+Math.floor(clamp(t/3.2)*100)+'%',x,y-180);if(t>=3.2&&!calm)ring(c,x,y,70+(t-3.2)*190,'#22D3EE');
  }
  function an(c,x,y,t){
    for(let j=0;j<3;j++){const r=(55+j*35)*clamp(t/1.5);ring(c,x,y,r,j%2?'#FDE047':'#F97316');for(let i=0;i<8;i++){const a=i*TAU/8;poly(c,[[x+Math.cos(a)*r*.6,y+Math.sin(a)*r*.26],[x+Math.cos(a+.1)*(r+12),y+Math.sin(a+.1)*(r+12)*.44],[x+Math.cos(a+.3)*r*.6,y+Math.sin(a+.3)*r*.26]],'#F59E0B')}}
    const ly=y-115-20*clamp(t/1.5);c.fillStyle='#FEF08A';c.fillRect(x-10,ly-14,20,28);ring(c,x,ly,25,'#F59E0B',1);
    if(t>=1.5)for(let i=0;i<8;i++){const a=i*TAU/8,cx=x+Math.cos(a)*160,cy=y-20+Math.sin(a)*75;line(c,[[cx,cy],[x,ly]],'#F59E0B');c.fillStyle='#FEF08A';c.fillRect(cx-5,cy-8,10,16)}
    if(t>=1.5)for(const side of[-1,1])for(let i=0;i<9;i++){const spread=clamp((t-1.5)/1.7),xx=x+side*(25+i*14)*spread;poly(c,[[x+side*15,y-70],[xx,y-165+i*7],[xx+side*10,y-95+i*8],[x+side*12,y-40]],i%2?'#F97316':'#FDE047')}
    if(t>=3.2)ring(c,x,y,100+(t-3.2)*220,'#F97316');
  }
  function linh(c,x,y,t,calm){
    for(let i=0;i<9;i++){const cx=x+(i-4)*40,h=(80+(i%3)*24)*clamp(t/1.5);line(c,[[cx,y+20],[cx,y+20-h]],'#166534',7);for(let j=0;j<3;j++){line(c,[[cx,y-j*25],[cx+24,y-18-j*25]],'#22C55E');poly(c,[[cx,y-j*25],[cx+31,y-25-j*25],[cx+16,y-7-j*25]],'#52de9b')}}
    for(let i=0;i<24;i++){const a=i*2.4+(calm?0:t*1.4),r=40+(i%5)*18,cx=x+Math.cos(a)*r,cy=y+Math.sin(a)*r*.44;poly(c,[[cx-6,cy],[cx+5,cy-5],[cx+2,cy+3]],'#52de9b')}
    if(t>=1.5){line(c,[[x-70,y-150],[x+35,y-190],[x+65,y-90],[x+35,y-20],[x-70,y-30]],'#52de9b',6);line(c,[[x-70,y-150],[x-20,y-90],[x-70,y-30]],'#dcfff0');for(let i=0;i<21;i++){const yy=y-160+i*6,xx=x-40+(t>=3.2?(t-3.2)*320:0);line(c,[[xx-35,yy],[xx+85,yy-5]],'#8ad477');poly(c,[[xx+85,yy-5],[xx+72,yy-10],[xx+74,yy+2]],'#dcfff0')}}
  }
  function paint(renderer){
    const g=renderer.game,p=g.player,i=p.ultIntro;if(!i)return;
    const c=renderer.ctx,t=i.elapsed,id=g.hero.id,calm=!!root.DTSettings?.reducedMotion,z=renderer.zoom,x=(p.x-renderer.camera.x)*z,y=(p.y-renderer.camera.y)*z;
    c.save();try{c.setTransform(1,0,0,1,0,0);c.fillStyle='rgba(6,8,18,0.45)';c.fillRect(0,0,1280,720);c.textAlign='left';
      if(id==='thienvu')thienvu(c,x,y,t,calm,i,g);else if(id==='quanle')quanle(c,x,y,t,calm);else if(id==='hoavi')hoavi(c,x,y,t,calm);else if(id==='an')an(c,x,y,t);else linh(c,x,y,t,calm);
      c.save();c.scale(z,z);c.translate(-renderer.camera.x,-renderer.camera.y);root.DTVisualHero(c,{...p,invulnerable:0,y:p.y-(id==='thienvu'&&t>=3?24:0)},g.hero,g.time);c.restore();
      const h=28*clamp(t/.25),text=id==='thienvu'?[{3:'TAM LINH · TAM GIÁC KÉP',5:'NGŨ LINH · NGÔI SAO NĂM CÁNH',7:'THẤT LINH · THẤT TINH KÉP'}[i.splitCount||7],'KHAI MỞ TRẬN ĐỒ','HUY HIỆU NGUYÊN TỐ','TÁCH BÓNG · TRIỆU KHÍ','PHÂN THÂN']:words[id]||words.an,stage=t<1.2?1:t<3?2:t<4.1?3:4;c.fillStyle='#03040b';c.fillRect(0,0,1280,h);c.fillRect(0,720-h,1280,h);c.font='bold 16px Segoe UI';c.textAlign='center';c.fillStyle=g.hero.color;c.fillText(text[0],640,21);c.font='13px Segoe UI';c.fillText(text[stage]+' · '+Math.max(0,i.duration-t).toFixed(1)+'s',640,711);
    }finally{c.restore()}
  }
  const R=root.DTRenderer.prototype,draw=R.draw;R.draw=function(...args){const result=draw.apply(this,args);if(!args[1])paint(this);return result};
  root.DTUltimateIntro={paint,crest,words};
})(globalThis);
