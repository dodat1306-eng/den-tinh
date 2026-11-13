(function(root){
  'use strict';
  const D=root.DTWorld,Base=root.DTGame,C=root.DTContent,TAU=Math.PI*2;
  const SIZE=1024,RADIUS=2,CORE_W=6400,CORE_H=4480;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const outside=(x,y)=>x<0||y<0||x>=CORE_W||y>=CORE_H;
  const keyOf=(x,y)=>Math.floor(x/SIZE)+','+Math.floor(y/SIZE);
  function hash(seed,x,y){let h=(seed|0)^Math.imul(x|0,374761393)^Math.imul(y|0,668265263);h=Math.imul(h^(h>>>13),1274126177);return(h^(h>>>16))>>>0}
  const biomes=[
    {id:'endless-forest',paletteId:'forest',name:'Rừng Trúc Vô Biên',sub:'GIÓ MANG THEO NHỮNG TÊN CHƯA KỂ',color:'#315b49',flora:['bamboo','tree','fern','flower']},
    {id:'endless-lotus',paletteId:'lotus',name:'Miền Sen Lưu Ảnh',sub:'KÝ ỨC TRÔI QUA NGÀN BẾN NƯỚC',color:'#47636c',flora:['willow','lotus','reed','flower']},
    {id:'endless-ash',paletteId:'ash',name:'Hoang Nguyên Tro Đỏ',sub:'DƯỚI LỚP TRO VẪN CÒN MẦM SỐNG',color:'#71594b',flora:['deadTree','rock','crystal','grass']},
    {id:'endless-ruins',paletteId:'ruins',name:'Di Tích Lạc Tinh',sub:'MỖI HÒN ĐÁ GIỮ MỘT VẾ CÂU CHUYỆN',color:'#586882',flora:['pillar','pine','rock','crystal']},
    {id:'endless-valley',paletteId:'valley',name:'Đồng Gió Xa Xăm',sub:'ĐI TIẾP, NGỌN ĐÈN VẪN CÒN ĐƯỜNG',color:'#788765',flora:['tree','flower','reed','lanternPost']},
    {id:'endless-waterfall',paletteId:'waterfall',name:'Suối Ngọc Thiên Ngoại',sub:'NƯỚC RỬA TRÔI SƯƠNG, KHÔNG XÓA LỜI HẸN',color:'#478780',flora:['willow','fern','crystal','rock']}
  ];
  const CHAPTERS=[
    {id:'river',name:'Bến Nước Không Tên',boss:'Hà Bá · Người Đòi Lại Dòng Sông',x:7168,y:1536,color:'#75dfeb',relic:'thuytinh',speaker:'Người Lái Đò',intro:'Mộc Quỷ chỉ giữ cánh cửa đầu tiên. Sương đã cuốn tên những con sông vào sáu ngọn đèn lạc. Hãy nghe ba tiếng vọng ở bến nước rồi gọi người canh dòng lên đối thoại.',echoes:['Một mái chèo trôi ngược: người làng từng dựng đê để giữ mùa lúa.','Tiếng hát dưới nước: dòng sông cần một lối đi, không cần thêm vật hiến tế.','Tấm bia mòn: lời hẹn còn nguyên khi người ta chịu lắng nghe nhau.'],win:'Dòng nước thôi đòi nợ. Người Lái Đò đưa bạn một bản đồ chỉ những miền chưa có tên. Ngọn đèn thứ hai đang chờ giữa rừng gương.',tip:'Sóng nước có vùng trống ở giữa. Đứng trong tâm hoặc lướt qua vòng sóng.'},
    {id:'fox',name:'Rừng Gương Hồ Tinh',boss:'Hồ Tinh · Chín Bóng Một Lời Thề',x:8704,y:-512,color:'#e9a6ed',relic:'thachsan',speaker:'Cô Gái Trong Gương',intro:'Chín chiếc bóng kể chín phiên bản của cùng một lời hứa. Đừng tin bóng đầu tiên. Thu ba mảnh ký ức để biết ai đã tự nguyện ở lại khu rừng.',echoes:['Dấu chân dừng trước gương: không ai bị giữ lại bằng sợi xích.','Một sợi chỉ đỏ: lời thề bị đổi khi người kể chuyện đổi giọng.','Một chiếc lược gãy: kẻ giữ gương cũng sợ bị quên tên.'],win:'Bạn không chém vào ký ức. Những mặt gương vỡ ra trả lại đường đi. Tiếng chuông từ một ngôi miếu xa gọi cả đoàn về phía đông.',tip:'Phá ba gương tím để gỡ khiên; các đường sáng chéo báo trước cú cắt.'},
    {id:'bell',name:'Miếu Chuông Quên Giờ',boss:'Thần Trùng · Kẻ Gõ Giờ Lạc',x:10240,y:2560,color:'#e8c985',relic:'ankh',speaker:'Người Giữ Miếu',intro:'Chiếc chuông không gọi người chết. Nó gọi những lời chưa kịp nói. Hãy nhặt ba tiếng vọng quanh miếu để chuông tìm lại nhịp của mình.',echoes:['Một bức thư chưa gửi: ngày trở về đã bị sương giấu mất.','Nén hương lạnh: người gác miếu vẫn đếm đủ bước chân khách qua đường.','Vết nứt trên chuông: im lặng cũng cần một người chịu lắng nghe.'],win:'Ba tiếng chuông đúng nhịp mở đường qua miếu. Nhưng dưới lòng khe, một con rắn đang nuốt ánh sáng để vá bầu trời của nó.',tip:'Chuông đánh theo nhịp ba. Đổi vị trí giữa các vạch chữ thập, tránh đứng yên một chỗ.'},
    {id:'serpent',name:'Khe Chín Dòng',boss:'Cửu Khúc Xà · Kẻ Nuốt Nhật Quang',x:11776,y:4608,color:'#a9df8b',relic:'sontinh',speaker:'Đứa Trẻ Nhặt Nắng',intro:'Con rắn uống ánh mặt trời vì tin rằng đêm dài sẽ che được vết thương của thung lũng. Thu ba mảnh nắng, rồi chỉ cho nó thấy nơi bóng tối nên kết thúc.',echoes:['Mảnh nắng trong vỏ ốc: khu vườn vẫn nảy mầm dù chủ vườn đã đi xa.','Bóng núi trên mặt nước: một vết thương không thể là bầu trời cho tất cả.','Tiếng guốc trên cầu cũ: ngày mai không cần quên hết ngày hôm qua.'],win:'Con rắn trả nắng về những luống mầm. Từ phế tích phía đông vọng tới tiếng máy đếm, đều đặn đến mức không còn nghe tiếng người.',tip:'Rắn phóng loạt nanh theo hình quạt rồi quét một đường dài. Đổi hướng sau khi vạch báo khóa lại.'},
    {id:'machine',name:'Tháp Đếm Những Vì Sao',boss:'Thiết Điểu · Lõi Đồng Câm',x:13312,y:1536,color:'#95c8ff',relic:'hermes',speaker:'Hoa Tiêu Bằng Đồng',intro:'Cỗ máy được tạo để nhớ đường về nhà. Sương khiến nó chỉ nhớ những con số. Hãy gom ba lệnh còn nguyên trước khi đánh thức trái tim đồng.',echoes:['Lệnh thứ nhất: đếm sao để dẫn người đi đường, không phải để khóa họ lại.','Lệnh thứ hai: một ngôi nhà không có tọa độ nếu không còn ai đợi.','Lệnh cuối: khi không hiểu một lời nói, hãy hỏi lại thay vì xóa nó.'],win:'Những con số thành tiếng chim. Hoa Tiêu mở con đường cuối: đến khung cửi của sương, nơi mọi câu chuyện đã bị dệt thành một lời duy nhất.',tip:'Phá hai lõi điện khi chúng xuất hiện; né tia tháp quay bằng khoảng trống giữa các đường báo.'},
    {id:'weaver',name:'Khung Cửi Bên Kia Chân Trời',boss:'Kẻ Dệt Sương · Người Không Còn Tên',x:14848,y:3584,color:'#f0afc6',relic:'ariadne',speaker:'Đốm',intro:'Người dệt sương từng muốn giữ mọi câu chuyện khỏi bị mất. Nhưng một câu chuyện không thể sống nếu không được kể khác đi. Đốm nhờ bạn mang ba lời đáp tới khung cửi.',echoes:['Lời đáp của làng: chúng tôi giữ ngọn đèn để người xa còn biết lối về.','Lời đáp của rừng: mất đi một chiếc lá không phải mất đi cả mùa xanh.','Lời đáp của chính bạn: tôi đi tiếp vì câu chuyện vẫn còn người để kể.'],win:'Sương tan thành những sợi sáng. Người dệt nhớ lại tên mình, nhưng không nói ra: bạn có quyền viết tiếp tên những miền đất chưa tới. Sáu ngọn đèn đã nối, hành trình vẫn mở ra vô hạn.',tip:'Phá các neo ký ức ở nửa máu; tìm khe hở trong vòng dệt rồi tránh tia chéo khóa theo vị trí của bạn.'}
  ];
  D.endless={size:SIZE,radius:RADIUS,biomes,chapters:CHAPTERS,coreWidth:CORE_W,coreHeight:CORE_H};
  const oldZone=D.zoneAt,oldNearPath=D.nearPath,oldMake=D.makeWorld;
  D.ZONES.push(...biomes);
  D.zoneAt=function(x,y){return outside(x,y)?biomes[hash(81231,Math.floor(x/SIZE),Math.floor(y/SIZE))%biomes.length]:oldZone(x,y)};
  D.nearPath=function(x,y,r=65){if(!outside(x,y))return oldNearPath(x,y,r);const lx=x-Math.floor(x/SIZE)*SIZE,ly=y-Math.floor(y/SIZE)*SIZE;return Math.abs(lx-SIZE/2)<r||Math.abs(ly-SIZE/2)<r};
  function attachStream(world){
    if(world.infinite)return world;
    const coreProps=world.props,coreEnemies=world.enemies,coreChests=world.chests,active=new Map(),changes=new Map();let anchor='',grid=new Map();
    world.infinite=true;world.coreWidth=CORE_W;world.coreHeight=CORE_H;world.environment=[];world.storyEnvironment=[];
    world.coreEnvironment=[
      ['campfire',760,2355,'Bếp Lửa Lữ Khách'],['barrel',1330,1750,'Thùng Nhựa Thông'],['spiritTree',1080,1440,'Cây Nguyện Ước'],
      ['ore',1440,1050,'Mạch Quặng Linh'],['shrine',2220,1550,'Miếu Kể Chuyện'],['barrel',2780,1230,'Thùng Nhựa Thông'],
      ['spiritTree',2900,1840,'Cây Sen Cổ'],['campfire',3500,2200,'Bếp Người Giữ Đầm'],['ore',3870,2180,'Mạch Quặng Phương Đông'],
      ['shrine',5070,1120,'Miếu Thác Ngọc'],['barrel',5460,2790,'Bình Dẫn Điện Cũ'],['spiritTree',2990,3640,'Cây Nguyện Đồng Gió']
    ].map((a,i)=>({id:'core-environment-'+i,type:a[0],x:a[1],y:a[2],name:a[3],r:0,used:false,elementalState:''}));
    world.sagaSites=CHAPTERS.map((c,index)=>({id:c.id,index,x:c.x,y:c.y,name:c.name,color:c.color}));
    const safeArena=(x,y)=>CHAPTERS.some(c=>Math.hypot(x-c.x,y-c.y)<490);
    function deltaFor(key){return changes.get(key)||{dead:[],damaged:{},open:[],used:{},broken:[]}}
    function snapshot(chunk){
      const delta={dead:[],damaged:{},open:[],used:{},broken:[]};
      for(const e of chunk.enemies){if(!e.alive)delta.dead.push(e.streamIndex);else if(e.hp<e.maxHp)delta.damaged[e.streamIndex]=Math.max(1,Math.round(e.hp))}
      for(const c of chunk.chests)if(c.open)delta.open.push(c.streamIndex);
      for(const o of chunk.environment)if(o.used||o.elementalState)delta.used[o.streamIndex]={used:!!o.used,state:o.elementalState||''};
      for(const p of chunk.props)if(p.destroyed)delta.broken.push(p.streamIndex);
      if(delta.dead.length||Object.keys(delta.damaged).length||delta.open.length||Object.keys(delta.used).length||delta.broken.length)changes.set(chunk.key,delta);else changes.delete(chunk.key);
    }
    function generate(cx,cy){
      const key=cx+','+cy,rng=D.rand(hash(world.seed,cx,cy)),biome=biomes[hash(81231,cx,cy)%biomes.length],delta=deltaFor(key),chunk={key,cx,cy,props:[],enemies:[],chests:[],environment:[]};
      function point(margin=75){return{x:cx*SIZE+margin+rng()*(SIZE-margin*2),y:cy*SIZE+margin+rng()*(SIZE-margin*2)}}
      function allowed(p,road=false){return outside(p.x,p.y)&&!safeArena(p.x,p.y)&&(!road||!D.nearPath(p.x,p.y,80))}
      function free(p,r=30){return !chunk.props.some(o=>o.r>0&&!o.destroyed&&dist(o,p)<o.r+r)}
      for(let i=0;i<42;i++){
        const p=point(40);if(!allowed(p,true))continue;const type=biome.flora[i%biome.flora.length],solid=['bamboo','tree','willow','deadTree','pine','pillar','rock','crystal'].includes(type);
        chunk.props.push({id:'stream-prop-'+key+'-'+i,streamKey:key,streamIndex:i,type,...p,r:solid?type==='pillar'?21:17:0,variant:Math.floor(rng()*4),destroyed:delta.broken.includes(i)});
      }
      const tier=Math.min(6,Math.floor(Math.max(Math.abs(cx),Math.abs(cy))/5)),count=5;
      for(let i=0;i<count;i++){
        const p=point(150);if(!allowed(p)||!free(p)||D.nearPath(p.x,p.y,40))continue;const type=['shade','archer','wisp','boar','slime'][(i+hash(world.seed,cx,cy))%5],elite=hash(world.seed+607,cx*7+i,cy)%100<5?['fire','ice','lightning'][hash(world.seed+13,cx*7+i,cy)%3]:null,hp=Math.round((64+tier*28+(type==='boar'?35:0))*(elite?1.65:1));
        chunk.enemies.push({id:'stream-enemy-'+key+'-'+i,streamKey:key,streamIndex:i,type,elite,...p,homeX:p.x,homeY:p.y,r:type==='boar'?20:15,hp:delta.damaged[i]||hp,maxHp:hp,speed:type==='archer'?65:88+tier*4,damage:(9+tier*2)*(elite?1.2:1),xp:(16+tier*3)*(elite?2:1),gold:(5+tier)*(elite?2:1),alive:!delta.dead.includes(i),cool:1+rng()*2,phase:0,timer:0,hit:0,slow:0,knockX:0,knockY:0,frontier:true});
      }
      for(let i=0;i<2;i++){const p=point(150);if(!allowed(p)||!free(p))continue;chunk.chests.push({id:'stream-chest-'+key+'-'+i,streamKey:key,streamIndex:i,...p,open:delta.open.includes(i)})}
      const kinds=['campfire','barrel','ore','spiritTree','shrine'];
      for(let i=0;i<3;i++){
        const p=point(110);if(!allowed(p)||!free(p))continue;const type=kinds[(i+hash(world.seed+31,cx,cy))%kinds.length],saved=delta.used[i];
        chunk.environment.push({id:'stream-environment-'+key+'-'+i,streamKey:key,streamIndex:i,type,...p,r:0,name:{campfire:'Bếp Lửa Lữ Khách',barrel:'Thùng Nhựa Thông',ore:'Mạch Quặng Linh',spiritTree:'Cây Nguyện Ước',shrine:'Miếu Kể Chuyện'}[type],used:!!saved?.used,elementalState:saved?.state||''});
      }
      if(hash(world.seed+93,cx,cy)%4===0){const p=point(170);if(allowed(p)&&free(p)){const type=hash(world.seed+95,cx,cy)%2?'trial':'fog',saved=delta.used[3];chunk.environment.push({id:'stream-event-'+key,streamKey:key,streamIndex:3,type,...p,r:0,name:type==='trial'?'Đài Tế Nguyện Ước':'Đèn Lạc · Sương Đậm',used:!!saved?.used,elementalState:''})}}
      for(const p of chunk.props)if(p.destroyed)p.r=0;
      return chunk;
    }
    function rebuild(){
      world.props=coreProps.concat(...[...active.values()].map(c=>c.props.filter(p=>!p.destroyed)));
      const dynamic=world.enemies.filter(e=>!e.streamKey&&!coreEnemies.includes(e));
      world.enemies=coreEnemies.concat(dynamic,...[...active.values()].map(c=>c.enemies));
      world.chests=coreChests.concat(...[...active.values()].map(c=>c.chests));
      world.environment=world.coreEnvironment.concat(world.storyEnvironment,...[...active.values()].map(c=>c.environment));
      grid=new Map();for(const p of world.props)if(p.r>0&&!p.destroyed){const key=Math.floor(p.x/96)+','+Math.floor(p.y/96);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(p)}
      world.stream={activeChunks:active.size,changedChunks:changes.size,generatedProps:world.props.length-coreProps.length,generatedEnemies:world.enemies.filter(e=>e.streamKey).length,chunkSize:SIZE,center:anchor};
    }
    world.ensureChunks=function(x,y){
      if(!Number.isFinite(x)||!Number.isFinite(y))return;const key=keyOf(x,y);if(key===anchor)return;
      anchor=key;const cx=Math.floor(x/SIZE),cy=Math.floor(y/SIZE),needed=new Set();
      for(let dx=-RADIUS;dx<=RADIUS;dx++)for(let dy=-RADIUS;dy<=RADIUS;dy++)needed.add((cx+dx)+','+(cy+dy));
      for(const [k,chunk]of active)if(!needed.has(k)){snapshot(chunk);active.delete(k)}
      for(const k of needed)if(!active.has(k)){const [a,b]=k.split(',').map(Number);active.set(k,generate(a,b))}
      rebuild();
    };
    world.rebuildStream=rebuild;
    world.collision=function(x,y,r=13){
      if(!Number.isFinite(x)||!Number.isFinite(y))return true;
      if(!outside(x,y)&&D.frontier?.riverAt(x,y,r)&&!D.frontier.onBridge(x,y,r))return true;
      const gx=Math.floor(x/96),gy=Math.floor(y/96);
      for(let i=gx-2;i<=gx+2;i++)for(let j=gy-2;j<=gy+2;j++)for(const p of grid.get(i+','+j)||[])if(Math.hypot(x-p.x,y-p.y)<p.r+r)return true;
      return false;
    };
    world.setStoryEnvironment=function(list){world.storyEnvironment=list;rebuild()};
    world.exportStream=function(){for(const c of active.values())snapshot(c);return{version:1,changes:[...changes.entries()],coreEnvironment:world.coreEnvironment.filter(o=>o.used||o.elementalState).map(o=>({id:o.id,used:o.used,state:o.elementalState}))}};
    world.restoreStream=function(saved,x,y){
      changes.clear();
      for(const o of world.coreEnvironment){const item=(saved?.coreEnvironment||[]).find(s=>s.id===o.id);o.used=!!item?.used;o.elementalState=typeof item?.state==='string'?item.state.slice(0,30):''}
      for(const entry of Array.isArray(saved?.changes)?saved.changes:[]){
        if(!Array.isArray(entry)||!/^[-]?\d+,[-]?\d+$/.test(entry[0])||!entry[1]||typeof entry[1]!=='object')continue;
        const value=entry[1],clean={dead:[],damaged:{},open:[],used:{},broken:[]};
        for(const [field,max]of[['dead',5],['open',2],['broken',42]])clean[field]=(Array.isArray(value[field])?value[field]:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<max);
        for(const [i,hp]of Object.entries(value.damaged||{}))if(/^\d$/.test(i)&&Number(i)<5&&Number.isFinite(hp)&&hp>0)clean.damaged[i]=Math.min(10000,hp);
        for(const [i,v]of Object.entries(value.used||{}))if(/^[0-3]$/.test(i)&&v&&typeof v==='object')clean.used[i]={used:!!v.used,state:typeof v.state==='string'?v.state.slice(0,30):''};
        changes.set(entry[0],clean);
      }
      active.clear();anchor='';world.ensureChunks(x,y);
    };
    world.ensureChunks(740,2200);
    for(const o of world.coreEnvironment)if(world.collision(o.x,o.y,25)){let found=false;for(let r=30;r<=150&&!found;r+=25)for(let i=0;i<16;i++){const a=i/16*TAU,x=o.x+Math.cos(a)*r,y=o.y+Math.sin(a)*r;if(!world.collision(x,y,25)){o.x=x;o.y=y;found=true;break}}}
    return world;
  }
  D.makeWorld=function(seed){return attachStream(oldMake(seed))};
  const echoOffsets=[[-220,-130],[245,-100],[0,235]];
  class EndlessGame extends Base{
    constructor(hero,seed){super(hero,seed);this.initEndless()}
    initEndless(saved){
      this.saga={chapter:0,stage:'locked',echoes:[],cleared:[],...saved};this.sagaTelegraphs=[];this.sagaSerial=0;this.environmentCooldown=0;this.sagaContract={count:0,completed:0};
      if(!Array.isArray(this.saga.echoes))this.saga.echoes=[];if(!Array.isArray(this.saga.cleared))this.saga.cleared=[];
      this.saga.chapter=clamp(Number(this.saga.chapter)||0,0,CHAPTERS.length);this.world.ensureChunks(this.player.x,this.player.y);this.refreshSagaEnvironment();
    }
    refreshSagaEnvironment(){
      const c=CHAPTERS[this.saga.chapter];if(!c){this.world.setStoryEnvironment([]);return}
      const list=[{id:'saga-gate-'+c.id,type:'sagaGate',sagaGate:true,x:c.x,y:c.y+95,name:c.name,r:0,color:c.color,used:false}];
      if(this.saga.stage==='echoes')for(let i=0;i<3;i++)if(!this.saga.echoes.includes(i))list.push({id:'saga-echo-'+c.id+'-'+i,type:'storyEcho',storyEcho:true,echoIndex:i,x:c.x+echoOffsets[i][0],y:c.y+echoOffsets[i][1],name:'Tiếng Vọng '+(i+1),r:0,color:c.color,used:false});
      this.world.setStoryEnvironment(list);
    }
    sagaObjective(){
      if(!this.victory)return null;const c=CHAPTERS[this.saga.chapter];
      if(!c)return{title:'Sáu ngọn đèn đã nối · Hành trình vô hạn',text:'Tiếp tục đi bất kỳ hướng nào để khám phá miền đất mới. Miếu kể chuyện và mạch quặng vẫn chứa cổ vật chưa tìm thấy.'};
      const boss=this.world.enemies.find(e=>e.sagaBoss&&e.alive&&e.sagaIndex===this.saga.chapter),stage=this.saga.stage;
      return{title:'Chương '+(this.saga.chapter+2)+' · '+c.name,text:stage==='echoes'?'Lắng nghe ba tiếng vọng ('+this.saga.echoes.length+'/3). '+(this.saga.echoes.length===3?'Trở lại trạm đèn và nhấn F để gọi người canh.':'Nhấn F cạnh các ngọn lửa nhỏ quanh trạm.'):stage==='boss'?c.boss+' · '+c.tip:stage==='claim'?'Trở lại ngọn đèn và nhấn F để nối chương truyện, nhận cổ vật và điểm kỹ năng.':'Đến ngọn đèn ở tọa độ '+c.x+', '+c.y+'. Nhấn F để nghe câu chuyện của miền đất tiếp theo.',target:boss||{x:c.x,y:c.y+95}};
    }
    storyStatus(){return this.sagaObjective()}
    objective(){return this.sagaObjective()||super.objective()}
    elementTarget(origin,max=540){
      const dx=Number.isFinite(this.input.aimX)?this.input.aimX-origin.x:Math.cos(origin.facing||0)*max,dy=Number.isFinite(this.input.aimY)?this.input.aimY-origin.y:Math.sin(origin.facing||0)*max,l=Math.hypot(dx,dy),f=l>max?max/l:1;
      return{x:origin.x+dx*f,y:origin.y+dy*f};
    }
    applyElementStatus(e,id,power=0,strong=false){super.applyElementStatus(e,id,power,strong)}
    nearby(){
      const base=super.nearby(),o=this.world.environment.filter(o=>!o.used&&dist(o,this.player)<86).sort((a,b)=>dist(a,this.player)-dist(b,this.player))[0];
      if(!o||base&&dist(base,this.player)<dist(o,this.player)-10)return base;
      return{...o,environment:true,label:o.sagaGate?(!this.victory?'Ngọn đèn bên kia sương · Cần giải thoát Cội Đa':this.saga.stage==='claim'?'Nối ngọn đèn · Nhận cổ vật':this.saga.stage==='boss'?'Người canh đang thức tỉnh':this.saga.stage==='echoes'&&this.saga.echoes.length===3?'Gọi người canh của '+o.name:'Lắng nghe '+o.name):o.storyEcho?'Lắng nghe '+o.name:o.name+(o.type==='barrel'?' · Phá bằng lửa hoặc tương tác':' · Khám phá')};
    }
    interact(){
      if(this.paused||this.dead)return false;const target=this.nearby();if(!target?.environment)return super.interact();
      const o=this.world.environment.find(e=>e.id===target.id);if(!o)return false;
      if(o.sagaGate){const ok=this.interactSagaGate();if(ok)this.onMythicInteract?.(o);return ok}
      const c=CHAPTERS[this.saga.chapter];
      if(o.storyEcho){if(this.saga.stage!=='echoes'||this.saga.echoes.includes(o.echoIndex))return false;this.saga.echoes.push(o.echoIndex);this.emit('dialogue',{title:c.name+' · Tiếng vọng '+(o.echoIndex+1),speaker:c.speaker,text:c.echoes[o.echoIndex]});this.effect('ring',o.x,o.y,c.color,85,.7);this.onMythicInteract?.(o);this.refreshSagaEnvironment();return true}
      if(o.used)return false;o.used=true;const p=this.player;
      if(o.type==='campfire'){p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.35);p.mp=p.maxMp;this.respawnPoint={x:o.x,y:o.y};this.emit('toast',{text:'Bếp lửa hồi 35% máu, đầy linh lực và trở thành điểm hồi sinh.',reward:true})}
      if(o.type==='barrel'){this.areaDamage(o.x,o.y,150,p.damage*2.8,100,false);this.effect('shock',o.x,o.y,'#ffb779',150,.6);this.emit('toast',{text:'Nhựa thông bùng nổ, đẩy lùi những kẻ quanh thùng.'})}
      if(o.type==='ore'){p.gold+=35;this.environmentReward(o);this.emit('toast',{text:'Khai mở mạch quặng: +35 xu và một mảnh truyền thuyết.',reward:true})}
      if(o.type==='spiritTree'){p.hp=Math.min(p.maxHp,p.hp+28);p.mp=Math.min(p.maxMp,p.mp+30);this.environmentReward(o);this.emit('toast',{text:'Cây nhận lời nguyện. Bạn hồi 28 máu, 30 linh lực và tìm được cổ vật.',reward:true})}
      if(o.type==='shrine'){this.environmentReward(o);this.emit('dialogue',{title:o.name,speaker:'Người Qua Đường',text:['Có người kể rằng ngọn đèn chỉ sáng khi còn một người nhớ đường về. Mảnh truyền thuyết này dành cho chuyến đi của bạn.','Dòng sông không chảy lùi, nhưng người kể chuyện có thể quay lại sửa một lời hứa. Hãy giữ cổ vật này để nhớ điều đó.','Đi hết một tấm bản đồ, người giữ đèn lại vẽ tấm khác. Miền đất trước mặt bạn chưa bao giờ là đoạn cuối.'][hash(this.world.seed,Math.floor(o.x),Math.floor(o.y))%3]})}
      this.effect('ring',o.x,o.y,'#f3d98b',78,.6);this.emit('sound',{name:'pickup'});this.sagaContract.count++;this.onMythicInteract?.(o);
      if(this.sagaContract.count%5===0){this.sagaContract.completed++;p.gold+=50;this.awardSkillPoints?.(1,'Năm dấu chân khám phá');this.emit('toast',{text:'Dấu chân khám phá: 5 điểm tương tác · +50 xu, +1 điểm kỹ năng.',reward:true})}
      return true;
    }
    environmentReward(o){
      const pool=(C.relics||[]).filter(r=>!this.player.relics[r.id]);if(!pool.length){this.player.gold+=25;return}
      const preferred=pool.filter(r=>r.origin||r.myth||r.legend||r.id.startsWith('myth_'));const choices=preferred.length?preferred:pool;
      this.grantRelic(choices[hash(this.world.seed,Math.floor(o.x),Math.floor(o.y))%choices.length].id);
    }
    interactSagaGate(){
      if(!this.victory){this.emit('toast',{text:'Hãy giải thoát Cội Đa trước khi gọi những câu chuyện bên kia sương.'});return false}
      const c=CHAPTERS[this.saga.chapter];if(!c)return false;
      if(this.saga.stage==='locked'){this.saga.stage='echoes';this.saga.echoes=[];this.emit('dialogue',{title:'Chương '+(this.saga.chapter+2)+' · '+c.name,speaker:c.speaker,text:c.intro});this.refreshSagaEnvironment();return true}
      if(this.saga.stage==='echoes'){if(this.saga.echoes.length<3){this.emit('toast',{text:'Còn '+(3-this.saga.echoes.length)+' tiếng vọng quanh trạm đèn.'});return false}this.saga.stage='boss';this.startSagaBoss();this.refreshSagaEnvironment();return true}
      if(this.saga.stage==='claim'){
        this.saga.cleared.push(c.id);this.player.gold+=150;this.player.hp=this.player.maxHp;this.player.mp=this.player.maxMp;
        this.awardSkillPoints?.(2,'Nối ngọn đèn '+c.name);
        if(C.relic(c.relic)&&!this.player.relics[c.relic])this.grantRelic(c.relic);else this.environmentReward({x:c.x,y:c.y});this.respawnPoint={x:c.x,y:c.y+95};this.emit('dialogue',{title:'Ngọn đèn '+(this.saga.chapter+1)+' đã nối',speaker:c.speaker,text:c.win+'\n\nPhần thưởng: một cổ vật, 150 xu và 2 điểm kỹ năng.'});
        this.saga.chapter++;this.saga.stage=this.saga.chapter===CHAPTERS.length?'complete':'locked';this.saga.echoes=[];this.refreshSagaEnvironment();this.emit('sound',{name:'ultimate'});return true;
      }
      return false;
    }
    startSagaBoss(saved){
      const c=CHAPTERS[this.saga.chapter];if(!c)return;this.sagaTelegraphs=[];
      const level=this.player.level,hp=2100+this.saga.chapter*680+level*85,e={id:'saga-boss-'+c.id,type:this.saga.chapter===3?'boar':'shade',sagaBoss:true,sagaIndex:this.saga.chapter,name:c.boss,x:c.x,y:c.y,homeX:c.x,homeY:c.y,r:40,hp,maxHp:hp,speed:48,damage:17+this.saga.chapter*2,xp:130+this.saga.chapter*30,gold:90,alive:true,cool:1.8,timer:0,phase:1,pattern:0,hit:0,slow:0,knockX:0,knockY:0,frontier:true,color:c.color,anchorsSpawned:false,...saved};
      this.world.enemies=this.world.enemies.filter(x=>!x.sagaBoss&&!x.sagaAnchor&&!x.sagaSummon);this.world.enemies.push(e);this.player.mp=this.player.maxMp;this.player.ult=100;this.player.invulnerable=1.3;this.emit('toast',{text:c.boss+' · '+c.tip});this.effect('ultimate',c.x,c.y,c.color,300,1.2);
    }
    spawnSagaAnchors(e,count){
      e.anchorsSpawned=true;
      for(let i=0;i<count;i++){const a=i/count*TAU,hp=140+this.saga.chapter*35;this.world.enemies.push({id:'saga-anchor-'+this.saga.chapter+'-'+i,type:'core',sagaAnchor:true,sagaIndex:this.saga.chapter,name:'Neo Ký Ức',x:e.homeX+Math.cos(a)*210,y:e.homeY+Math.sin(a)*185,homeX:e.homeX,homeY:e.homeY,r:22,hp,maxHp:hp,speed:0,damage:0,xp:10,gold:3,alive:true,cool:99,timer:0,phase:0,hit:0,slow:0,knockX:0,knockY:0,frontier:true,color:e.color})}
      this.emit('toast',{text:'Phá '+count+' neo ký ức để gỡ khiên người canh!'});
    }
    sagaWarn(kind,data,delay=.9){this.sagaTelegraphs.push({kind,timer:delay,maxTimer:delay,color:'#ffab91',damage:18+this.saga.chapter*2,...data})}
    updateSagaBoss(e,dt){
      if(dist(e,this.player)>1100)return;e.hit=Math.max(0,e.hit-dt);e.cool-=dt;e.timer+=dt;e.phase=e.hp<e.maxHp*.5?2:1;
      const p=this.player,a=Math.atan2(p.y-e.y,p.x-e.x),index=e.sagaIndex;
      if((index===1&&!e.anchorsSpawned)||(index===4&&!e.anchorsSpawned&&e.hp<e.maxHp*.65)||(index===5&&!e.anchorsSpawned&&e.hp<e.maxHp*.55))this.spawnSagaAnchors(e,index===4?2:3);
      if(dist(e,p)<e.r+p.r+5)this.damagePlayer(e.damage);
      if(index===3&&dist(e,p)>170&&dist(e,p)<650)this.moveEntity(e,Math.cos(a)*65*dt,Math.sin(a)*65*dt);
      if(e.cool>0)return;e.pattern++;e.cool=e.phase===2?1.8:2.6;
      const color=CHAPTERS[index].color;
      if(index===0){
        if(e.pattern%2){this.sagaWarn('ring',{x:e.x,y:e.y,r:300,inner:125,damage:e.damage,color},1.1);if(e.phase===2)this.sagaWarn('disc',{x:p.x,y:p.y,r:58,color},1.55)}
        else for(let j=-2;j<=2;j++)this.sagaWarn('line',{x:e.x+Math.cos(a+Math.PI/2)*j*85,y:e.y+Math.sin(a+Math.PI/2)*j*85,x2:e.x+Math.cos(a)*680+Math.cos(a+Math.PI/2)*j*85,y2:e.y+Math.sin(a)*680+Math.sin(a+Math.PI/2)*j*85,r:19,color},.9+Math.abs(j)*.12);
      }
      if(index===1){
        const b=e.pattern%2?Math.PI/4:-Math.PI/4;for(const sign of[-1,1])this.sagaWarn('line',{x:p.x-Math.cos(b*sign)*360,y:p.y-Math.sin(b*sign)*360,x2:p.x+Math.cos(b*sign)*360,y2:p.y+Math.sin(b*sign)*360,r:24,color},1);
        if(e.phase===2&&!e.rooted&&!e.rootHeld){const nx=e.homeX+Math.cos(e.pattern*2.1)*160,ny=e.homeY+Math.sin(e.pattern*2.1)*140;if(!this.world.collision(nx,ny,e.r)){this.effect('ring',e.x,e.y,color,80,.4);e.x=nx;e.y=ny}}
      }
      if(index===2){
        for(let beat=0;beat<3;beat++){const angle=(e.pattern%2?0:Math.PI/4)+beat*Math.PI/6;for(const sign of[-1,1])this.sagaWarn('line',{x:e.x-Math.cos(angle)*380*sign,y:e.y-Math.sin(angle)*380*sign,x2:e.x+Math.cos(angle)*380*sign,y2:e.y+Math.sin(angle)*380*sign,r:20,color},.7+beat*.45)}
        e.cool=2.8;
      }
      if(index===3){
        if(e.pattern%2){for(let j=-3;j<=3;j++)this.shoot(e.x,e.y,a+j*.17,250+e.phase*35,e.damage*.75,color,{friendly:false,life:2.5,r:7,kind:'arrow'});this.effect('warning',e.x,e.y,color,75,.5)}
        else this.sagaWarn('line',{x:e.x,y:e.y,x2:e.x+Math.cos(a)*800,y2:e.y+Math.sin(a)*800,r:55,color,chargeBoss:e.id,chargeA:a},1.2);
      }
      if(index===4){
        const angle=e.pattern*.54;for(let j=0;j<(e.phase===2?4:3);j++){const b=angle+j*TAU/(e.phase===2?4:3);this.sagaWarn('line',{x:e.x,y:e.y,x2:e.x+Math.cos(b)*650,y2:e.y+Math.sin(b)*650,r:22,color},1.15)}
        if(e.pattern%3===0&&this.world.enemies.filter(x=>x.sagaSummon&&x.alive).length<4)for(let j=0;j<2;j++){const b=angle+j*Math.PI;this.spawnEnemy('wisp',e.homeX+Math.cos(b)*240,e.homeY+Math.sin(b)*220,{sagaSummon:true,sagaIndex:index,frontier:true,hp:85,maxHp:85,damage:12,xp:5,gold:2})}
      }
      if(index===5){
        const gap=(e.pattern*.73)%TAU,count=e.phase===2?12:10;
        for(let j=0;j<count;j++){const b=j/count*TAU;if(Math.abs(Math.atan2(Math.sin(b-gap),Math.cos(b-gap)))<.56)continue;this.sagaWarn('disc',{x:e.homeX+Math.cos(b)*220,y:e.homeY+Math.sin(b)*195,r:57,color},1.15)}
        if(e.phase===2){this.sagaWarn('line',{x:p.x-340,y:p.y-250,x2:p.x+340,y2:p.y+250,r:22,color},1.6);this.sagaWarn('line',{x:p.x-340,y:p.y+250,x2:p.x+340,y2:p.y-250,r:22,color},1.6)}
      }
    }
    updateEnemies(dt){
      const custom=this.world.enemies.filter(e=>(e.sagaBoss||e.sagaAnchor)&&e.alive);for(const e of custom)e.alive=false;
      try{super.updateEnemies(dt)}finally{for(const e of custom)e.alive=true}
      for(const e of custom)if(e.sagaBoss){const held=e.rooted>0||e.frozen>0,disabled=e.frozen>0||e.stunned>0;e.rootHeld=e.rooted>0;e.rooted=Math.max(0,(e.rooted||0)-dt);e.frozen=Math.max(0,(e.frozen||0)-dt);e.slow=Math.max(0,(e.slow||0)-dt);if(disabled){e.stunned=Math.max(0,(e.stunned||0)-dt);continue}if(held)e.cool+=dt*.35;this.updateSagaBoss(e,dt);e.rootHeld=false}else e.hit=Math.max(0,e.hit-dt);
    }
    damageEnemy(e,amount,charge=true){
      if(e.sagaBoss&&this.world.enemies.some(a=>a.sagaAnchor&&a.alive&&a.sagaIndex===e.sagaIndex))amount*=.15;
      const alive=e.alive;super.damageEnemy(e,amount,charge);
      if(alive&&!e.alive&&e.sagaBoss){this.saga.stage='claim';this.sagaTelegraphs=[];for(const x of this.world.enemies)if(x.sagaAnchor||x.sagaSummon)x.alive=false;this.projectiles=this.projectiles.filter(b=>b.friendly);this.emit('toast',{text:'Người canh đã yên. Trở lại ngọn đèn và nhấn F để nối câu chuyện.',reward:true});this.refreshSagaEnvironment()}
    }
    damagePlayer(amount){
      const before=this.frontierCombat;if(outside(this.player.x,this.player.y)||this.world.enemies.some(e=>e.sagaBoss&&e.alive&&dist(e,this.player)<1000))this.frontierCombat=true;
      try{return super.damagePlayer(amount)}finally{this.frontierCombat=before}
    }
    updateSagaTelegraphs(dt){
      for(let i=this.sagaTelegraphs.length-1;i>=0;i--){const t=this.sagaTelegraphs[i];t.timer-=dt;if(t.timer>0)continue;let hit=false;
        const p=this.player,d=dist(t,p);
        if(t.kind==='disc')hit=d<t.r+p.r;
        if(t.kind==='ring')hit=d<t.r+p.r&&d>Math.max(0,t.inner-p.r);
        if(t.kind==='line'){const dx=t.x2-t.x,dy=t.y2-t.y,f=clamp(((p.x-t.x)*dx+(p.y-t.y)*dy)/(dx*dx+dy*dy||1),0,1);hit=Math.hypot(p.x-t.x-dx*f,p.y-t.y-dy*f)<t.r+p.r}
        if(hit)this.damagePlayer(t.damage);this.effect(t.kind==='line'?'lightning':'shock',t.x,t.y,t.color,t.kind==='ring'?t.r:t.r||50,.4,{tx:t.x2,ty:t.y2});
        if(t.chargeBoss){const e=this.world.enemies.find(e=>e.id===t.chargeBoss&&e.alive);if(e)this.moveEntity(e,Math.cos(t.chargeA)*260,Math.sin(t.chargeA)*260)}
        this.sagaTelegraphs.splice(i,1);
      }
    }
    reactEnvironment(element,x,y,r=150){
      if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(r))return 0;let count=super.reactEnvironment?.(element,x,y,r)||0;
      for(const o of this.world.environment){if(o.used||o.elementalState===element||dist(o,{x,y})>r)continue;
        const reacts=element==='fire'&&['barrel','campfire'].includes(o.type)||element==='earth'&&o.type==='ore'||element==='nature'&&o.type==='spiritTree'||element==='lightning'&&o.type==='shrine'||element==='ice'&&o.type==='barrel';
        if(!reacts)continue;count++;o.elementalState=element;
        if(element==='fire'&&o.type==='barrel'){o.used=true;this.areaDamage(o.x,o.y,180,this.player.damage*3.5,120,false);this.effect('shock',o.x,o.y,'#ffad71',180,.7)}
        else if(element==='ice'){o.used=true;this.elementFields?.push({element:'ice',key:'e',owner:'environment',x:o.x,y:o.y,r:150,life:3,tick:0,power:this.player.damage*.3,charge:false,follow:false});this.effect('ring',o.x,o.y,'#abecff',150,.8)}
        else if(element==='fire'){this.player.mp=Math.min(this.player.maxMp,this.player.mp+12);this.effect('ring',o.x,o.y,'#ffc78a',70,.5)}
        else{o.used=true;if(element==='nature')this.player.hp=Math.min(this.player.maxHp,this.player.hp+30);this.environmentReward(o);this.effect('ring',o.x,o.y,'#c9f3a2',100,.7)}
      }
      if(element==='earth'||element==='fire'){
        let changed=false;for(const p of this.world.props)if(p.streamKey&&!p.destroyed&&['rock','crystal','deadTree'].includes(p.type)&&dist(p,{x,y})<r){p.destroyed=true;p.r=0;changed=true;count++;this.spark(p.x,p.y,8,element==='fire'?'#ffb674':'#cbd4bb',90,.4)}if(changed)this.world.rebuildStream();
      }
      return count;
    }
    update(dt){
      if(this.paused||this.dead||!this.started)return;this.world.ensureChunks(this.player.x,this.player.y);const before=this.time;super.update(dt);if(this.time===before)return;this.world.ensureChunks(this.player.x,this.player.y);this.updateSagaTelegraphs(clamp(dt,0,.04));
      if(this.victory&&this.saga.stage==='locked'&&!this.sagaNotified){this.sagaNotified=true;this.emit('toast',{text:'Bên kia Cội Đa còn sáu ngọn đèn lạc. Mở bản đồ hoặc theo mũi chỉ nhiệm vụ để đi tiếp.',reward:true})}
      // Streamed encounters cannot leave permanent projectile/loot trails behind the player.
      this.projectiles=this.projectiles.filter(b=>Math.hypot(b.x-this.player.x,b.y-this.player.y)<1600);
      this.loot=this.loot.filter(l=>Math.hypot(l.x-this.player.x,l.y-this.player.y)<2500).slice(-200);
    }
    clearSagaCombat(){this.sagaTelegraphs=[];this.projectiles=[];this.telegraphs=[];for(const e of this.world.enemies)if(e.sagaSummon)e.alive=false;this.player.velocityX=0;this.player.velocityY=0}
    travelTo(id){const ok=super.travelTo(id);if(ok){this.clearSagaCombat();this.world.ensureChunks(this.player.x,this.player.y)}return ok}
    respawn(){super.respawn();this.clearSagaCombat();this.world.ensureChunks(this.player.x,this.player.y);if(this.saga.stage==='boss'){this.saga.stage='echoes';this.saga.echoes=[0,1,2];this.world.enemies=this.world.enemies.filter(e=>!e.sagaBoss&&!e.sagaAnchor&&!e.sagaSummon);this.refreshSagaEnvironment()}}
    serialize(){
      const data=super.serialize();data.enemies=data.enemies.filter(e=>!e.id.startsWith('stream-')&&!e.id.startsWith('saga-'));if(data.dynamicEnemies)data.dynamicEnemies=data.dynamicEnemies.filter(e=>!e.sagaSummon);
      data.chests=data.chests.filter(id=>!id.startsWith('stream-'));data.endless={version:1,stream:this.world.exportStream(),saga:{...this.saga,echoes:[...this.saga.echoes],cleared:[...this.saga.cleared]},position:{x:this.player.x,y:this.player.y},respawnPoint:this.respawnPoint,contract:this.sagaContract,boss:this.world.enemies.find(e=>e.sagaBoss&&e.alive)?{...this.world.enemies.find(e=>e.sagaBoss&&e.alive)}:null,anchors:this.world.enemies.filter(e=>e.sagaAnchor&&e.alive).map(e=>({...e}))};return data;
    }
    static restore(data){
      const g=Base.restore(data);Object.setPrototypeOf(g,EndlessGame.prototype);g.initEndless(data.endless?.saga);
      const saved=data.endless,pos=saved?.position||data.player;
      if(saved?.version===1){
        if(Number.isFinite(pos?.x)&&Number.isFinite(pos?.y)){g.world.restoreStream(saved.stream,pos.x,pos.y);g.player.x=pos.x;g.player.y=pos.y;if(g.world.collision(pos.x,pos.y,g.player.r)){let found=false;for(let d=30;d<240&&!found;d+=25)for(let j=0;j<16;j++){const a=j/16*TAU,x=pos.x+Math.cos(a)*d,y=pos.y+Math.sin(a)*d;if(!g.world.collision(x,y,g.player.r)){g.player.x=x;g.player.y=y;found=true;break}}if(!found){g.player.x=740;g.player.y=2200}}}
        if(Number.isFinite(saved.respawnPoint?.x)&&Number.isFinite(saved.respawnPoint?.y))g.respawnPoint={x:saved.respawnPoint.x,y:saved.respawnPoint.y};
        if(saved.contract)g.sagaContract={count:Math.max(0,Number(saved.contract.count)||0),completed:Math.max(0,Number(saved.contract.completed)||0)};
        if(g.saga.stage==='boss'&&saved.boss&&saved.boss.sagaIndex===g.saga.chapter&&Number.isFinite(saved.boss.hp)&&saved.boss.hp>0){const b=saved.boss;g.startSagaBoss({hp:clamp(b.hp,1,20000),maxHp:clamp(b.maxHp||b.hp,1,20000),anchorsSpawned:!!b.anchorsSpawned,pattern:Math.max(0,Number(b.pattern)||0),cool:1.5});for(const a of(saved.anchors||[]).slice(0,3))if(Number.isFinite(a.x)&&Number.isFinite(a.y)&&Number.isFinite(a.hp)&&a.hp>0)g.world.enemies.push({...a,hp:clamp(a.hp,1,1000),maxHp:clamp(a.maxHp||a.hp,1,1000)})}
      }
      if(g.isElemental&&Array.isArray(g.elementClones))for(let i=0;i<g.elementClones.length;i++){
        const clone=g.elementClones[i],savedClone=(data.elemental?.clones||[]).find(c=>c.element===clone.element),candidate=savedClone&&Number.isFinite(savedClone.x)&&Number.isFinite(savedClone.y)&&dist(savedClone,g.player)<900?savedClone:{x:g.player.x+Math.cos(i*TAU/Math.max(1,g.elementClones.length))*95,y:g.player.y+Math.sin(i*TAU/Math.max(1,g.elementClones.length))*75},spot=g.elementSafeSpot(candidate.x,candidate.y)||g.player;clone.x=spot.x;clone.y=spot.y;
      }
      g.refreshSagaEnvironment();g.zone=D.zoneAt(g.player.x,g.player.y).id;g.sagaTelegraphs=[];g.events=[];return g;
    }
  }
  root.DTGame=EndlessGame;
})(globalThis);
