(function(root){
  'use strict';
  const W=3840,H=2880;
  const HEROES={
    an:{id:'an',name:'An',role:'NGƯỜI GIỮ ĐÈN',desc:'Lửa linh, vòng trấn. Cân bằng và dễ làm quen.',color:'#f1bf69',cloth:'#459c83',accent:'#e8c273',hp:120,speed:230,damage:18,fireRate:.22,shotSpeed:640,q:'Liên Hỏa',e:'Vòng Trấn',r:'Thiên Đăng',qCd:5,eCd:9},
    linh:{id:'linh',name:'Linh',role:'TRÚC ẢNH',desc:'Cung ngọc, mưa trúc. Nhanh và đánh từ xa.',color:'#a5e3a2',cloth:'#648f73',accent:'#d9786c',hp:100,speed:264,damage:15,fireRate:.15,shotSpeed:810,q:'Xuyên Vân',e:'Mưa Trúc',r:'Phong Linh',qCd:4,eCd:8},
    kiet:{id:'kiet',name:'Kiệt',role:'LÔI VỆ',desc:'Lôi thương, chấn địa. Bền bỉ và bùng nổ.',color:'#aebff7',cloth:'#63759e',accent:'#e7ad6b',hp:155,speed:212,damage:13,fireRate:.33,shotSpeed:560,q:'Lôi Liên',e:'Chấn Địa',r:'Thiên Lôi',qCd:5,eCd:9}
  };
  const ZONES=[
    {id:'village',name:'Làng Đèn',sub:'NƠI NGỌN LỬA BẮT ĐẦU',color:'#496b58',center:[720,2200]},
    {id:'forest',name:'Rừng Trúc',sub:'NGHE TIẾNG LÁ NHỚ TÊN NGƯỜI',color:'#224a43',center:[840,770]},
    {id:'lotus',name:'Đầm Sen',sub:'DƯỚI MẶT NƯỚC CÓ MỘT BẦU TRỜI',color:'#345861',center:[3000,2080]},
    {id:'ash',name:'Đồi Tro',sub:'NGỌN LỬA CŨ CHƯA TẮT',color:'#635551',center:[3000,740]},
    {id:'crossroads',name:'Đường Gió',sub:'BA NGẢ ĐƯỜNG, MỘT NGỌN ĐÈN',color:'#3b5145',center:[1900,1700]},
    {id:'ancient',name:'Cội Đa Lạc Hồn',sub:'NƠI SƯƠNG CẤT GIẤU KÝ ỨC',color:'#344544',center:[1830,590]}
  ];
  function zoneAt(x,y){
    if(Math.hypot(x-1830,y-590)<470)return ZONES[5];
    if(x<1370&&y>1590)return ZONES[0];
    if(x>2490&&y>1420)return ZONES[2];
    if(x>2380&&y<1390)return ZONES[3];
    if(x<1440&&y<1560)return ZONES[1];
    return ZONES[4];
  }
  function rand(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let a=Math.imul(t^(t>>>15),1|t);a^=a+Math.imul(a^(a>>>7),61|a);return((a^(a>>>14))>>>0)/4294967296}}
  function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/l));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)}
  const PATHS=[[[700,2160],[1110,2040],[1710,1710],[2100,1480]],[[1710,1710],[1220,1180],[820,700]],[[2100,1480],[2660,1690],[3100,2090]],[[2100,1480],[2700,1060],[3090,690]],[[1710,1710],[1770,1130],[1830,590]],[[700,2160],[430,2260],[350,1990]],[[700,2160],[1080,2440],[1260,2510]]];
  const nearPath=(x,y,range)=>PATHS.some(p=>p.some((a,i)=>i&&segmentDistance(x,y,p[i-1],a)<range));
  function makeWorld(seed=71426){
    const rng=rand(seed),props=[],enemies=[],chests=[];
    const shrines=[
      {id:'truc',name:'Ấn Trúc',zone:'Rừng Trúc',x:820,y:700,color:'#a5dfa5',active:false,guardians:[]},
      {id:'sen',name:'Ấn Sen',zone:'Đầm Sen',x:3100,y:2090,color:'#eca6bf',active:false,guardians:[]},
      {id:'tro',name:'Ấn Tro',zone:'Đồi Tro',x:3090,y:690,color:'#edbd75',active:false,guardians:[]}
    ];
    const npcs=[{id:'elder',name:'Bà Năm',x:670,y:2140,type:'elder'},{id:'smith',name:'Chú Bảy',x:930,y:2300,type:'smith'},{id:'well',name:'Giếng Ngọc',x:520,y:2310,type:'well'}];
    const altar={id:'altar',x:1830,y:590,name:'Cội Đa Lạc Hồn'};
    function add(type,x,y,extra={}){props.push({id:props.length,type,x,y,variant:Math.floor(rng()*4),...extra})}
    add('house',400,2090,{w:180,h:133,r:63});add('house',870,2070,{w:192,h:142,r:67});
    add('house',1080,2370,{w:168,h:125,r:60});add('house',290,2420,{w:160,h:120,r:57});
    add('temple',650,1970,{w:230,h:177,r:82});add('banyan',1830,465,{r:75});
    add('gate',1150,1920,{r:0});
    for(let i=0;i<13;i++){let x=450+i*47,y=2490;add('rice',x,y,{r:0});add('rice',x+14,y+35,{r:0})}
    for(let i=0;i<930;i++){
      const x=70+rng()*(W-140),y=70+rng()*(H-140),z=zoneAt(x,y);
      if(nearPath(x,y,68)||shrines.some(s=>Math.hypot(s.x-x,s.y-y)<205)||Math.hypot(1830-x,590-y)<255||npcs.some(n=>Math.hypot(n.x-x,n.y-y)<180))continue;
      if(z.id==='village'&&Math.hypot(x-720,y-2180)<520)continue;
      const type=z.id==='forest'?(rng()<.7?'bamboo':'tree'):z.id==='lotus'?(rng()<.7?'lotus':'willow'):z.id==='ash'?(rng()<.58?'rock':'deadTree'):(rng()<.64?'tree':'rock');
      add(type,x,y,{r:type==='lotus'?0:type==='bamboo'?13:type==='rock'?17:18});
    }
    for(let i=0;i<210;i++){const x=rng()*W,y=rng()*H;add('grass',x,y,{r:0})}
    for(let i=0;i<40;i++){const x=80+rng()*(W-160),y=80+rng()*(H-160);if(!nearPath(x,y,65))add('flower',x,y,{r:0})}
    const obstacles=props.filter(p=>p.r>0),grid=new Map(),cell=96;
    for(const p of obstacles){const key=`${Math.floor(p.x/cell)},${Math.floor(p.y/cell)}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(p)}
    function collision(x,y,r=13){
      if(x<r+24||x>W-r-24||y<r+24||y>H-r-24)return true;
      const gx=Math.floor(x/cell),gy=Math.floor(y/cell);
      for(let i=gx-2;i<=gx+2;i++)for(let j=gy-2;j<=gy+2;j++)for(const o of(grid.get(`${i},${j}`)||[])){if(Math.hypot(x-o.x,y-o.y)<o.r+r)return true}
      return false;
    }
    const stats={slime:{hp:38,speed:75,damage:8,xp:11,gold:4,r:14},wisp:{hp:32,speed:105,damage:8,xp:13,gold:5,r:13},boar:{hp:85,speed:93,damage:13,xp:20,gold:9,r:20},archer:{hp:52,speed:62,damage:10,xp:18,gold:7,r:14},shade:{hp:66,speed:115,damage:12,xp:20,gold:8,r:15}};
    function spawn(type,x,y,guard=null){
      for(let n=0;n<12&&collision(x,y,25);n++){x+=rng()*80-40;y+=rng()*80-40}
      const st=stats[type],enemy={id:`e${enemies.length}`,type,x,y,homeX:x,homeY:y,...st,maxHp:st.hp,guard,alive:true,cool:1+rng()*2,phase:0,timer:0,hit:0,slow:0,knockX:0,knockY:0,elite:!!guard};
      if(guard){enemy.hp*=1.5;enemy.maxHp=enemy.hp;enemy.xp*=1.4;enemy.gold*=1.5}
      enemies.push(enemy);return enemy.id;
    }
    for(const s of shrines){for(let i=0;i<7;i++){const a=i/7*Math.PI*2,d=94+(i%2)*48;const types=s.id==='truc'?['boar','shade','archer']:s.id==='sen'?['wisp','slime','archer']:['shade','boar','wisp'];s.guardians.push(spawn(types[i%3],s.x+Math.cos(a)*d,s.y+Math.sin(a)*d,s.id))}}
    for(let i=0;i<30;i++){
      let x=170+rng()*(W-340),y=170+rng()*(H-340),zone=zoneAt(x,y);
      if(zone.id==='village'||zone.id==='ancient'||shrines.some(s=>Math.hypot(s.x-x,s.y-y)<370)){i--;continue}
      const types=zone.id==='forest'?['slime','shade','boar']:zone.id==='lotus'?['wisp','slime','archer']:zone.id==='ash'?['shade','archer','boar']:['slime','archer','wisp'];
      for(let n=0;n<3;n++)spawn(types[n],x+Math.cos(n*2.1)*50,y+Math.sin(n*2.1)*50);
    }
    for(let i=0;i<14;i++){
      let x=210+rng()*(W-420),y=220+rng()*(H-440);
      for(let n=0;n<30&&collision(x,y,24);n++){x=210+rng()*(W-420);y=220+rng()*(H-440)}
      chests.push({id:`c${i}`,x,y,open:false});
    }
    chests.push({id:'welcome',x:825,y:2230,open:false});
    return{seed,width:W,height:H,props,enemies,chests,shrines,npcs,altar,collision,paths:PATHS,zones:ZONES};
  }
  root.DTWorld={W,H,HEROES,ZONES,makeWorld,zoneAt,rand,nearPath};
})(globalThis);
