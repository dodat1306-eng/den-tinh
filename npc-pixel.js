(function(root){
  'use strict';

  const CW=80,CH=76,AX=40,AY=64,COLS=40;
  const WORK_FRAMES=180,GREET_FRAMES=160,INTERACT_FRAMES=180,TOTAL_FRAMES=520;
  const ROWS_PER_NPC=TOTAL_FRAMES/COLS; // 13 rows per NPC

  const SPECS=[
    {id:'elder',name:'Bà Năm',zone:'Làng Đèn',sheet:0,local:0,station:false,crop:[16,12],light:'#ffb85c',r:128,work:'Chăm đèn tổ tiên & chỉnh kính lão',greet:'Nâng đèn vẫy gọi hiền hậu',interact:'Khơi bùng Tâm Hỏa truyền lời dặn'},
    {id:'smith',name:'Chú Bảy',zone:'Làng Đèn',sheet:0,local:1,station:true,crop:[19,12],light:'#ff7b29',r:148,work:'Nện búa rèn phôi sao băng & kéo bễ',greet:'Gác búa lên vai cười vẫy gọi',interact:'Cộng hưởng thần binh bung hoa lửa'},
    {id:'temple_keeper',name:'Ông Từ Đạo',zone:'Làng Đèn',sheet:0,local:2,station:false,crop:[19,11],light:'#ffd97d',r:112,work:'Tra Sổ Đinh & phất trần quét sương',greet:'Chắp tay thi lễ cổ truyền',interact:'Mở Sổ Đinh hiện bốn chữ vàng bị xóa'},
    {id:'weaver_woman',name:'Chị Lụa',zone:'Làng Đèn',sheet:0,local:3,station:true,crop:[19,12],light:'#f4a2b8',r:110,work:'Đưa thoi dệt lụa trên khung cửi gỗ',greet:'Chạm sợi tơ tim ngước nhìn ra hiên',interact:'Nâng dải lụa ký ức dệt ánh tơ vàng'},
    {id:'lantern_boy',name:'Cậu Bé Tèo',zone:'Làng Đèn',sheet:0,local:4,station:false,crop:[19,19],light:'#6be2f2',r:116,work:'Thổi chong chóng ngược gió & nhún nhảy',greet:'Nhảy vẫy đèn xanh gọi lớn',interact:'Xoay lốc hoa giấy chỉ hướng rừng trúc'},

    {id:'blind_bard',name:'Lão Mù Ca Trù',zone:'Đường Gió',sheet:1,local:0,station:true,crop:[16,20],light:'#a7f3d0',r:112,work:'Nhấn phím gảy Đàn Đáy ngân sóng âm',greet:'Nghiêng tai lắng nghe cúi chào trên chiếu',interact:'Tấu Bát Âm Phong Nhạc tám nốt cổ ngữ'},
    {id:'wandering_merchant',name:'Lý Gù',zone:'Đường Gió',sheet:1,local:1,station:false,crop:[19,13],light:'#fbbf24',r:136,work:'Nhún đòn gánh đôi đèn & tung đồng xu',greet:'Ngoắc tay mời chào vỗ túi gấm',interact:'Soi giao thoa hai ngọn đèn mở tráp cổ'},
    {id:'bamboo_hunter',name:'Thợ Săn Già Sơn',zone:'Rừng Trúc',sheet:1,local:2,station:false,crop:[20,12],light:null,r:0,work:'Thử dây cung trúc & điểm mũi tên lông',greet:'Hạ mũi cung giơ nắm tay chào thợ rừng',interact:'Giương cung chỉ hướng & nâng mặt nạ Nhuận'},
    {id:'bamboo_nun',name:'Sư Cô Tịnh Tâm',zone:'Rừng Trúc',sheet:1,local:3,station:true,crop:[20,13],light:'#86efac',r:104,work:'Lần 18 hạt ngọc bích bên lư trầm khói',greet:'Đơn chưởng thi lễ tỏa hương thanh tịnh',interact:'Kết ấn hộ niệm xoay vòng tràng hạt ngọc'},
    {id:'cursed_woodcutter',name:'Tiều Phu Hóa Đá',zone:'Rừng Trúc',sheet:1,local:4,station:true,crop:[19,12],light:null,r:0,work:'Giằng rễ cây hóa đá & đọc nhật ký khô',greet:'Giơ nhật ký cảnh báo vùng rễ nguyền',interact:'Chấn rìu nứt vỏ đá bừng sáng trang ký ức'},

    {id:'lotus_crone',name:'Mụ Còng',zone:'Đầm Sen',sheet:2,local:0,station:true,crop:[19,18],light:'#f472b6',r:115,work:'Chống sào thuyền nan bên đóa sen nở',greet:'Nâng vành nón lá dặn đừng uống bát nước',interact:'Nâng sen hồng bung sáu cánh linh quang'},
    {id:'scholar_ghost',name:'Thư Sinh Mặc Khách',zone:'Đầm Sen',sheet:2,local:1,station:false,crop:[19,9],light:'#67e8f9',r:128,work:'Lơ lửng vung bút ngọc viết chữ sương',greet:'Thu bút vào tay áo vái chào nho nhã',interact:'Khai bút họa vòng phù thủy mặc trên không'},
    {id:'firefly_girl',name:'Miên',zone:'Đầm Sen',sheet:2,local:2,station:false,crop:[19,13],light:'#bef264',r:132,work:'Nâng búp sen gọi đàn đom đóm lượn số 8',greet:'Vẫy tay gom đom đóm thành vòng dẫn lối',interact:'Thả búp sen nở xoáy dải ngân hà đom đóm'},
    {id:'ash_forger',name:'Lão Hỏa Sơn',zone:'Đồi Tro',sheet:2,local:3,station:true,crop:[16,12],light:'#ff5e1a',r:146,work:'Trở tinh thiết trên lò tro bằng tay đồng',greet:'Giơ cánh tay cơ khí đồng chào vang dội',interact:'Kích hoạt búa đồng nổ hoa lửa sao băng'},
    {id:'ash_gravedigger',name:'Kẻ Đào Mộ Tro',zone:'Đồi Tro',sheet:2,local:4,station:true,crop:[20,12],light:'#a855f7',r:122,work:'Vun tro chân bia đá & canh đèn hồn tím',greet:'Cắm xẻng đặt tay lên ngực tưởng niệm',interact:'Gõ hai nhịp Hạc gọi bướm hồn bay lên'},

    {id:'exiled_pyromancer',name:'Pháp Sư Huyền',zone:'Đồi Tro',sheet:3,local:0,station:false,crop:[19,11],light:'#fb923c',r:142,work:'Luân chuyển cầu lửa sống quanh trượng ngọc',greet:'Chống quyền trượng nâng cao ngọn hỏa tâm',interact:'Thi triển Song Hỏa Liên Hoàn rẽ lối lửa'},
    {id:'waterfall_hermit',name:'Thanh Hư',zone:'Thác Ngọc',sheet:3,local:1,station:true,crop:[16,20],light:'#2dd4bf',r:112,work:'Ngồi tảng đá rêu buông cần câu trúc',greet:'Thu nhẹ cần câu bắt quyết đạo gia chào',interact:'Nhấc giọt Linh Thủy lấp lánh thất sắc'},
    {id:'windmill_keeper',name:'Người Gác Phong',zone:'Thung Lũng Đèn',sheet:3,local:2,station:false,crop:[19,12],light:null,r:0,work:'Quay phong kế đồng & tra chìa vặn cót gió',greet:'Đẩy kính phi công giơ chìa đồng vẫy chào',interact:'Lên dây phong luân cuốn lốc gió thanh âm'},
    {id:'automaton_07',name:'Cơ Linh 07',zone:'Phế Tích Thiên Cơ',sheet:3,local:3,station:false,crop:[20,12],light:'#22d3ee',r:134,work:'Quét tia thấu kính đọc bảng mã Root Log',greet:'Nghiêng khớp cổ chớp kính chào nhận diện',interact:'Chiếu ba tầng Hologram Bản 08 & K6-3'},
    {id:'ferryman',name:'Người Lái Đò',zone:'Bến Sương Biên Viễn',sheet:3,local:4,station:false,crop:[16,12],light:'#38bdf8',r:118,work:'Khoác áo tơi khua mái chèo rẽ sương mù',greet:'Dựng chèo nâng vành nón lá gật đầu chào',interact:'Gõ ba nhịp chèo ngân sóng âm qua bến'},

    {id:'mirror_maiden',name:'Cô Gái Trong Gương',zone:'Rừng Gương',sheet:4,local:0,station:false,crop:[19,13],light:'#e879f9',r:126,work:'Soi gương đồng lơ lửng & chạm khuyên bạc',greet:'Khép tay trước gương cúi chào thanh tao',interact:'Xoay gương mở cổng pha lê hiện bóng khuyên'},
    {id:'bell_keeper',name:'Người Giữ Miếu Chuông',zone:'Miếu Chuông Gió',sheet:4,local:1,station:false,crop:[20,12],light:'#facc15',r:124,work:'Chạm dùi trầm hương ngân chuông đồng cổ',greet:'Nâng chuông ngang vai hành lễ giữ miếu',interact:'Gióng hai nhịp chuông bung sóng vàng kim'},
    {id:'sun_child',name:'Đứa Trẻ Nhặt Nắng',zone:'Khu Vườn Thực Nhật',sheet:4,local:2,station:false,crop:[19,19],light:'#fde047',r:156,work:'Ôm Nhật Cầu thu nhỏ & nhón hứng giọt nắng',greet:'Nâng Nhật Cầu quá đầu vẫy gọi rạng rỡ',interact:'Thả Nhật Cầu nở mười hai cánh hoa thái dương'},
    {id:'bronze_pilot',name:'Hoa Tiêu Bằng Đồng',zone:'Tháp Đếm Những Vì Sao',sheet:4,local:3,station:false,crop:[16,12],light:'#60a5fa',r:122,work:'Chỉnh La Bàn Tinh Cầu đo hai đầu tín hiệu',greet:'Chạm vành mũ chào kiểu hoa tiêu tháp sao',interact:'Mở ba vòng quỹ đạo sao chiếu bản đồ thiên cầu'},
    {id:'dom_avatar',name:'Hóa Thân Của Đốm',zone:'Khung Cửi Cuối Chân Trời',sheet:4,local:4,station:false,crop:[19,12],light:'#fcd34d',r:146,work:'Ba đuôi cáo uốn sóng & đan sợi chỉ vàng',greet:'Vểnh tai cáo vẫy đuôi mừng người bạn cũ',interact:'Bung ba đuôi hoàng kim dệt dấu chân dẫn lối'},
    {id:'well',name:'Giếng Ngọc',zone:'Làng Đèn',sheet:4,local:5,station:true,crop:[19,12],light:'#5eead4',r:152,work:'Mặt nước ngọc gợn sóng & sương lành tỏa nhẹ',greet:'Dâng ánh ngọc bích đón bước chân nghỉ ngơi',interact:'Phun suối linh tuyền hồi phục sinh lực'}
  ];

  const BY_ID=new Map(SPECS.map((s,i)=>[s.id,{...s,index:i}]));
  const sheets=Array.from({length:5},(_,i)=>{const img=new Image();img.decoding='async';img.src=`assets/npcs-overhaul-${i+1}.png`;return img});
  const portraits=new Image();portraits.decoding='async';portraits.src='assets/npcs-portraits.png';

  const activeInteractions=new Map();
  const TAU=Math.PI*2;
  const calm=()=>!!root.DTSettings?.reducedMotion;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const loaded=img=>!!(img&&img.complete&&img.naturalWidth>0);
  const ready=()=>sheets.every(loaded)&&loaded(portraits);
  const nowWall=()=>(typeof performance!=='undefined'&&performance.now?performance.now():Date.now())/1000;

  function resolveId(n){
    if(!n)return'elder';
    if(typeof n==='string')return BY_ID.has(n)?n:'elder';
    const raw=n.npcKey||n.type||n.id||'elder';
    if(BY_ID.has(raw))return raw;
    if(String(n.id||'').startsWith('story-npc-')&&BY_ID.has(n.type))return n.type;
    return'elder';
  }

  function triggerInteract(npcOrId,game,duration=6.0){
    const id=resolveId(npcOrId);
    const gTime=Number(game?.time)||0;
    activeInteractions.set(id,{
      id,
      gameStart:gTime,
      gameEnd:gTime+duration,
      wallStart:nowWall(),
      duration
    });
  }

  function phaseOffset(id,x=0,y=0){
    let h=2166136261;
    const s=String(id);
    for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);
    h=Math.imul(h^(Math.round(x)|0),16777619);
    h=Math.imul(h^(Math.round(y)|0),16777619);
    return((h>>>0)%1000)/1000*7.5;
  }

  function selectFrame(n,game){
    const id=resolveId(n),spec=BY_ID.get(id);
    if(!spec)return null;
    const still=calm();
    const gTime=Math.max(0,Number(game?.time)||0);

    // Explicit mode override (for showcase, traveler rescue, or staged tests)
    let mode=n?.animMode||null;
    let local=0;

    if(!mode){
      const inter=activeInteractions.get(id);
      if(inter){
        if(game?.paused){
          const wEl=Math.max(0,nowWall()-inter.wallStart);
          mode='interact';
          local=still?90:Math.floor(wEl*30)%INTERACT_FRAMES;
        }else if(gTime>=inter.gameStart&&gTime<inter.gameEnd){
          const u=(gTime-inter.gameStart)/Math.max(.1,inter.duration);
          mode='interact';
          local=still?90:clamp(Math.floor(u*INTERACT_FRAMES),0,INTERACT_FRAMES-1);
        }else if(gTime>=inter.gameEnd){
          activeInteractions.delete(id);
        }
      }
    }

    if(!mode){
      const p=game?.player;
      const d=p&&Number.isFinite(p.x)&&Number.isFinite(n?.x)?Math.hypot(p.x-n.x,p.y-n.y):Infinity;
      if(d<=175){
        mode='greet';
        local=still?28:Math.floor((gTime+phaseOffset(id,n.x,n.y))*28)%GREET_FRAMES;
      }else{
        mode='work';
        local=still?0:Math.floor((gTime+phaseOffset(id,n.x,n.y))*26)%WORK_FRAMES;
      }
    }else if(!Number.isInteger(n?.animFrame)){
      const fps=mode==='interact'?30:mode==='greet'?28:26;
      const count=mode==='interact'?INTERACT_FRAMES:mode==='greet'?GREET_FRAMES:WORK_FRAMES;
      local=still?0:Math.floor(Math.max(0,gTime)*fps)%count;
    }else{
      const count=mode==='interact'?INTERACT_FRAMES:mode==='greet'?GREET_FRAMES:WORK_FRAMES;
      local=clamp(n.animFrame,0,count-1);
    }

    const baseOffset=mode==='interact'?WORK_FRAMES+GREET_FRAMES:mode==='greet'?WORK_FRAMES:0;
    const fIdx=baseOffset+local;
    const row=spec.local*ROWS_PER_NPC+Math.floor(fIdx/COLS);
    const col=fIdx%COLS;
    const p=game?.player;
    const flip=!spec.station&&mode!=='work'&&p&&Number.isFinite(p.x)&&Number.isFinite(n?.x)&&p.x<n.x-8;

    return{
      id,spec,mode,frame:local,totalFrame:fIdx,
      sheet:sheets[spec.sheet],
      sx:col*CW,sy:row*CH,w:CW,h:CH,ax:AX,ay:AY,
      flip
    };
  }

  function draw(renderer,n){
    if(!ready()||!renderer?.ctx||!n)return false;
    const sel=selectFrame(n,renderer.game);
    if(!sel)return false;
    const c=renderer.ctx,unit=2,g=renderer.game;
    const isQuestTarget=g?.questTarget?.()===n;

    c.save();
    try{
      c.imageSmoothingEnabled=false;
      // Ground ambient contact shadow
      c.fillStyle=sel.id==='well'?'#06141d78':'#08192368';
      c.beginPath();
      c.ellipse(n.x,n.y,sel.id==='well'?34:22,sel.id==='well'?11:7.5,0,0,TAU);
      c.fill();

      // Subtle golden quest-target ring under active story NPC!
      if(isQuestTarget){
        const pulse=calm()?0:Math.sin(Math.max(0,g.time||0)*4)*2;
        c.strokeStyle='#ffe58faa';
        c.lineWidth=2;
        c.beginPath();
        c.ellipse(n.x,n.y+1,26+pulse,9+pulse*.35,0,0,TAU);
        c.stroke();
      }

      c.save();
      c.translate(Math.round(n.x),Math.round(n.y));
      if(sel.flip)c.scale(-1,1);
      c.drawImage(
        sel.sheet,
        sel.sx,sel.sy,sel.w,sel.h,
        -sel.ax*unit,-sel.ay*unit,sel.w*unit,sel.h*unit
      );
      c.restore();

      if(n.name){
        c.font='11px "DenTinh Sans"';
        c.textAlign='center';
        c.fillStyle=sel.mode==='interact'?'#fff3c4':sel.mode==='greet'?'#ffe8ab':'#f0dfb9';
        c.fillText(n.name,n.x,n.y+20);
      }
    }finally{
      c.restore();
    }
    return true;
  }

  function portrait(c,id,w=112,h=112,time=0,isCalm=false){
    const spec=BY_ID.get(id);
    if(!spec||spec.index>=25||!ready())return false;
    c.save();
    try{
      c.imageSmoothingEnabled=false;
      if(isCalm){
        const px=(spec.index%5)*128,py=Math.floor(spec.index/5)*128;
        c.drawImage(portraits,px,py,128,128,0,0,w,h);
      }else{
        // Live 180-frame animated interaction bust inside dialogue box!
        const sheet=sheets[spec.sheet];
        const local=Math.floor(Math.max(0,time)*30)%INTERACT_FRAMES;
        const fIdx=WORK_FRAMES+GREET_FRAMES+local;
        const sx=(fIdx%COLS)*CW,sy=(spec.local*ROWS_PER_NPC+Math.floor(fIdx/COLS))*CH;
        const [cx,cy]=spec.crop;
        const bob=Math.round(Math.sin(time*3.2)*1.5);
        const pad=Math.round(w*0.04);
        c.drawImage(sheet,sx+cx,sy+cy,42,39,pad,pad+4+bob,w-pad*2,h-pad*2-2);
      }
    }finally{
      c.restore();
    }
    return true;
  }

  function collectLights(game,near,add,still){
    if(!game?.world?.npcs)return;
    const t=still?0:Math.max(0,game.time||0);
    for(const n of game.world.npcs){
      if(!near(n))continue;
      const spec=BY_ID.get(resolveId(n));
      if(!spec||!spec.light||spec.r<=0)continue;
      const fl=still?0:Math.sin(t*5.5+n.x*.03)*6;
      const inter=activeInteractions.has(spec.id)?1.22:1;
      add(n.x,n.y-18,(spec.r+fl)*inter,spec.light,activeInteractions.has(spec.id)?.88:.72,false);
    }
  }

  root.DTNpcOverhaulAtlas={
    version:'2.0.0',
    cell:{w:CW,h:CH,anchorX:AX,anchorY:AY,unit:2},
    cols:COLS,
    rowsPerNpc:ROWS_PER_NPC,
    frames:{work:WORK_FRAMES,greet:GREET_FRAMES,interact:INTERACT_FRAMES,total:TOTAL_FRAMES},
    fps:{work:26,greet:28,interact:30},
    sheets:sheets.map(s=>s.src),
    portraits:'assets/npcs-portraits.png',
    npcs:SPECS
  };

  root.DTNpcPixel={
    SPECS,BY_ID,sheets,portraits,
    ready,resolveId,triggerInteract,selectFrame,draw,portrait,collectLights,
    activeInteractions
  };
})(globalThis);
