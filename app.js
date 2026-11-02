(function(){
  'use strict';
  const $=id=>document.getElementById(id),SAVE='den-tinh-save-v1',H=DTWorld.HEROES;
  const HOST_SAVE=['127.0.0.1','localhost','[::1]'].includes(location.hostname),SAVE_URL=HOST_SAVE?'/save':null;
  let game=new DTGame('an'),renderer=new DTRenderer($('gameCanvas'),game),selected='an',keys={},mouse={x:880,y:370,down:false},modalType='',mapOpen=false,last=performance.now(),hudTime=0,saveTime=0,saveFailed=false;
  window.denTinh={get game(){return game},get renderer(){return renderer},get audio(){return audio},begin,save,showModal,closeAndContinue,pause,inventory};
  class Audio{
    constructor(){this.enabled=true;this.ctx=null;this.nextNote=0;this.note=0;this.lastShot=0;this.zone='';this.ambienceTime=0}
    init(){try{if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.13;this.master.connect(this.ctx.destination);this.music=this.ctx.createGain();this.music.connect(this.master);this.sfxGain=this.ctx.createGain();this.sfxGain.connect(this.master)}if(this.ctx.state==='suspended')this.ctx.resume()}catch(e){this.enabled=false}}
    tone(freq,time,duration,volume=.2,type='sine',endFreq=0,music=false){
      if(!this.ctx||!this.enabled)return;const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,time);if(endFreq)osc.frequency.exponentialRampToValueAtTime(endFreq,time+duration);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(gain);gain.connect(music?this.music:this.sfxGain);osc.start(time);osc.stop(time+duration+.02);
    }
    sfx(name){if(!this.ctx||!this.enabled)return;const t=this.ctx.currentTime;
      if(name==='shoot'){if(t-this.lastShot<.08)return;this.lastShot=t;this.tone(620,t,.075,.07,'triangle',260)}
      if(name==='codeShot'){if(t-this.lastShot<.09)return;this.lastShot=t;this.tone(1200,t,.075,.07,'square',500)}
      if(name==='shotgun'){this.tone(125,t,.16,.2,'sawtooth',45);this.tone(620,t,.08,.08,'triangle',160)}
      if(name==='reload'||name==='switch'){this.tone(720,t,.05,.07,'square');this.tone(980,t+.1,.05,.06,'triangle')}
      if(name==='challenge'||name==='overclock'){for(let i=0;i<7;i++)this.tone(220*Math.pow(1.18,i),t+i*.06,.3,.1,'triangle')}
      if(name==='dash')this.tone(380,t,.14,.11,'sine',85);
      if(name==='hurt')this.tone(130,t,.13,.16,'triangle',65);
      if(name==='kill')this.tone(190,t,.1,.08,'sine',65);
      if(name==='pickup'){this.tone(900,t,.09,.09);this.tone(1200,t+.07,.11,.06)}
      if(name==='heal'){this.tone(440,t,.4,.2);this.tone(660,t+.12,.4,.15)}
      if(name==='skill'){this.tone(330,t,.25,.2,'triangle',880);this.tone(660,t+.06,.3,.1)}
      if(name==='charge')this.tone(110,t,.18,.15,'triangle',220);
      if(name==='ultimate'||name==='level'){for(let i=0;i<5;i++)this.tone([262,330,392,523,660][i],t+i*.08,.6,.16,'sine')}
    }
    update(){if(!this.ctx||!this.enabled)return;const settings=window.DTSettings||{};this.master.gain.value=.18*(settings.master??.8);this.music.gain.value=settings.music??.55;this.sfxGain.gain.value=settings.sfx??.85;if(game.paused||!game.started)return;const t=this.ctx.currentTime,z=game.bossStarted&&!game.victory?'boss':game.zone;
      if(z!==this.zone){this.zone=z;this.note=0;this.nextNote=t;this.ambienceTime=t}
      const tunes={village:[220,247,294,330,440,330,294,247],forest:[294,330,392,440,587,440,392,330],lotus:[196,247,294,392,494,392,294,247],ash:[147,165,196,220,294,220,196,165],ancient:[165,196,220,330,294,220,196,165],boss:[110,131,147,165,196,165,147,131]};
      if(t>this.nextNote){const notes=tunes[z]||tunes.forest;this.tone(notes[this.note%8],t,z==='boss'?.35:1.5,.055,z==='ash'?'triangle':'sine',0,true);if(this.note%4===0)this.tone(notes[0]/2,t,2.2,.045,'sine',0,true);if(z==='boss')this.tone(65,t,.1,.12,'triangle',35,true);this.note++;this.nextNote=t+(z==='boss'?.38:z==='forest'?.72:1.05)}
      if(t>this.ambienceTime){this.ambienceTime=t+5;const buffer=this.ctx.createBuffer(1,22050,22050),d=buffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.11;const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=z==='lotus'?950:z==='forest'?1500:380;gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(.25,t+.35);gain.gain.linearRampToValueAtTime(.001,t+1);source.connect(filter);filter.connect(gain);gain.connect(this.music);source.start(t);source.stop(t+1.02)}
    }
    toggle(){this.init();this.enabled=!this.enabled;if(this.master)this.master.gain.value=this.enabled?.13:0;$('soundButton').textContent=this.enabled?'♫ Âm thanh':'♫ Đã tắt'}
  }
  const audio=new Audio();
  function resize(){const viewport=document.documentElement,s=Math.min(viewport.clientWidth/1280,viewport.clientHeight/720);$('stage').style.transform=`translate(-50%, -50%) scale(${s})`}
  addEventListener('resize',resize);resize();
  function heroCards(){
    $('heroCards').innerHTML='';for(const hero of Object.values(H)){
      const b=document.createElement('button');b.className='hero-card'+(hero.id===selected?' selected':'');b.setAttribute('aria-label',`Chọn ${hero.name}, ${hero.role}`);b.innerHTML=`<canvas width="56" height="70"></canvas><span class="name">${hero.name}</span><span class="role">${hero.role}</span><span class="desc">${hero.desc}</span>`;
      b.onclick=()=>{selected=hero.id;heroCards();DTArt.titleArt($('titleArt'),hero)};
      $('heroCards').appendChild(b);DTArt.drawHero(b.querySelector('canvas').getContext('2d'),{x:28,y:67},hero,0,.82);
    }
  }
  heroCards();DTArt.titleArt($('titleArt'),H[selected]);
  function hasSave(){return !!(cachedSave&&cachedSave.version===1&&H[cachedSave.hero])}
  let cachedSave=null;
  try{cachedSave=JSON.parse(localStorage.getItem(SAVE))}catch(e){}
  $('continueButton').classList.toggle('hidden',!hasSave());
  if(SAVE_URL)fetch(SAVE_URL,{cache:'no-store'}).then(r=>r.json()).then(data=>{
    if(data&&data.version===1&&H[data.hero]&&data.player){cachedSave=data;$('continueButton').classList.remove('hidden')}
    else if(hasSave())fetch(SAVE_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cachedSave)}).catch(()=>{});
  }).catch(()=>{});
  function toast(text,reward=false){const e=document.createElement('div');e.className='toast'+(reward?' reward':'');e.textContent=text;$('toastBox').appendChild(e);setTimeout(()=>e.remove(),3900);while($('toastBox').children.length>4)$('toastBox').firstChild.remove()}
  function save(){
    if(!game.started||game.dead)return Promise.resolve(false);
    cachedSave=game.serialize();const data=JSON.stringify(cachedSave);
    let browserSaved=false;
    try{localStorage.setItem(SAVE,data);browserSaved=true}catch(e){}
    if(!SAVE_URL){
      if(!browserSaved&&!saveFailed){saveFailed=true;toast('Trình duyệt chưa cho phép lưu tiến độ.')}
      return Promise.resolve(browserSaved);
    }
    return fetch(SAVE_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:data,keepalive:true}).then(r=>{if(!r.ok)throw new Error('Save failed');return true}).catch(()=>{if(!saveFailed){saveFailed=true;toast('Chưa ghi được tệp lưu trên E. Bản dự phòng vẫn ở trình duyệt.')}return false});
  }
  function begin(restore=false){
    audio.init();closeModal(false);keys={};mouse.down=false;mapOpen=false;$('mapOverlay').classList.add('hidden');
    if(restore){try{game=DTGame.restore(cachedSave)}catch(e){toast('Bản lưu không đọc được. Một hành trình mới bắt đầu.');game=new DTGame(selected);game.start()}}
    else{try{const old=localStorage.getItem(SAVE);if(old)localStorage.setItem(SAVE+'-previous',old)}catch(e){}game=new DTGame(selected);game.start()}
    renderer.setGame(game);$('mainMenu').classList.add('hidden');$('hud').classList.remove('hidden');$('toastBox').innerHTML='';saveTime=0;
    $('heroName').textContent=game.hero.name;$('heroBadge').textContent=game.hero.name.toUpperCase();$('qName').textContent=game.hero.q;$('eName').textContent=game.hero.e;$('rName').textContent=game.hero.r;hud();
    handleEvents();if(restore){toast('Ngọn đèn vẫn chờ ngươi. Hành trình đã tiếp tục.');if(game.pendingLevels)showTalent()}
  }
  function showModal(type,html){
    modalType=type;game.paused=true;keys={};mouse.down=false;$('modalContent').innerHTML=html;$('modal').classList.remove('hidden');
    const first=$('modalContent').querySelector('button');if(first)first.focus({preventScroll:true});
  }
  function closeModal(resume=true){modalType='';$('modal').classList.add('hidden');if(resume&&game.started&&!game.dead&&!mapOpen)game.paused=false;keys={};mouse.down=false}
  function closeAndContinue(){closeModal();if(game.pendingLevels>0&&game.started)showTalent();save()}
  const DIALOGUES={
    intro:{speaker:'BÀ NĂM · LÀNG ĐÈN',title:'Đừng để ngọn đèn quên.',text:'Mỗi ngôi làng đều có một cái tên để sương không lạc vào. Đêm qua, tiếng chuông từ cội đa im bặt, rồi người ta bắt đầu quên tên nhau.<br><br>Ba ấn linh cần ba thử thách: <b>săn Trúc Vệ ở rừng phía tây bắc, bảo vệ Đèn Sen ở đầm phía đông nam, phá ba lõi Tro trên đồi phía đông bắc.</b><br><br>Mang ánh sáng đến cả ba nơi. Sau đó, tìm cội đa phía bắc. Đốm sẽ đi cùng con — nó nhớ những con đường mà chúng ta đã quên.'},
    elder:{speaker:'BÀ NĂM',title:'Ánh đèn chưa từng nhỏ.',text:'Con có thể đi đến ba ấn theo bất kỳ thứ tự nào. Mỗi ấn có một thử thách riêng. Hạ Trúc Vệ, giữ Đèn Sen sáng 36 giây, rồi phá ba lõi Tro giữa những vòng lửa.<br><br>Nhìn bản đồ bằng <b>M</b>. Nhặt xu để nhờ Chú Bảy nâng vũ khí. Nếu mệt, Giếng Ngọc sẽ hồi sức và bổ sung bình máu. Đến một ấn đã thức tỉnh, nhấn <b>F</b> để trở về làng.'},
    ready:{speaker:'BÀ NĂM',title:'Cội đa đang gọi.',text:'Ba đốm lửa đã sáng. Nhưng cội đa không phải kẻ thù của chúng ta: nó đã giữ quá nhiều ký ức, đến mức không còn nhớ mình là ai.<br><br>Hãy đánh thức nó ở đàn tế phía bắc. Né vòng đạn và dấu rễ đỏ. Phá ba Rễ Ký Ức khi chúng tạo khiên; ở giai đoạn cuối, các vòng rễ thay đổi vị trí. Giữ tuyệt kỹ cho khi cần phá vòng vây.'},
    ending:{speaker:'BÀ NĂM',title:'Một cái tên được gọi lại.',text:'Khi con gọi tên cội đa, những chiếc lá bắt đầu nhớ tiếng gió. Sương rút khỏi mái đình, khỏi giếng nước, khỏi bàn tay người mẹ đang đợi con trước cửa.<br><br>“Không phải ngọn đèn xua được mọi bóng tối,” Bà Năm nói. “Chỉ là có người đã chịu mang nó đi.”<br><br>Đốm ngủ cuộn tròn bên thềm. Sáng mai, ngôi làng lại có một cái tên.'}
  };
  function dialogue(id){const d=DIALOGUES[id]||DIALOGUES.elder;showModal('dialogue',`<span class="eyebrow">${d.speaker}</span><h2>${d.title}</h2><p>${d.text}</p><div class="buttons"><button id="dialogueNext" class="primary">${id==='intro'?'Mang đèn lên đường →':'Tiếp tục hành trình'}</button></div>`);$('dialogueNext').onclick=closeAndContinue}
  function help(){
    showModal('help',`<span class="eyebrow">GIỮ LỬA, GIỮ NHỊP</span><h2>Cách chơi</h2><div class="help-grid"><kbd>W A S D / ↑ ↓ ← →</kbd><span>Di chuyển tự do. Chuột quyết định hướng ngắm.</span><kbd>Chuột trái</kbd><span>Giữ để tấn công liên tục.</span><kbd>Space</kbd><span>Lướt theo hướng di chuyển; khi đứng yên, lướt theo hướng ngắm. Miễn sát thương trong lúc lướt.</span><kbd>Q / E</kbd><span>Hai kỹ năng riêng của nhân vật, dùng linh lực tự hồi.</span><kbd>R</kbd><span>Tuyệt kỹ: tích lực bằng cách đánh quái. Xóa đạn địch quanh người và hồi một phần máu.</span><kbd>F</kbd><span>Mở rương, nói chuyện, dùng giếng hoặc thức tỉnh ấn.</span><kbd>H</kbd><span>Dùng một bình để hồi 55% máu tối đa.</span><kbd>TAB / V</kbd><span>Đổi giữa hai ô vũ khí / nạp băng. Đạn dự trữ không giới hạn.</span><kbd>M / I / Esc</kbd><span>Bản đồ / thuộc tính / tạm dừng.</span><kbd>C / 1–7</kbd><span>Thiên Vũ: mở bảng nguyên tố / đổi nhanh bảy dạng.</span><kbd>G / X</kbd><span>Thiên Vũ: chọn tổng 3/5/7 bản thể / phân thân hoặc hợp thể. Khi đủ lực, R gọi hợp kích với các bản thể còn sống.</span></div><p>Săn Trúc Vệ, bảo vệ Đèn Sen và phá ba lõi Tro theo thứ tự tùy ý, rồi đánh thức Cội Đa phía bắc. Trên điện thoại dùng hai cần cảm ứng và các nút kỹ năng; xoay ngang để nhìn rộng. Trò chơi tự lưu; dùng “Lưu và về màn đầu” trước khi thoát.</p><div class="buttons"><button id="helpClose" class="primary">Đã hiểu</button></div>`);$('helpClose').onclick=closeAndContinue;
  }
  function credits(){showModal('credits',`<span class="eyebrow">CHUYỆN KỂ CỦA MIỀN SƯƠNG</span><h2>Đèn Tinh</h2><p>Cốt truyện và nhân vật hư cấu, lấy chất liệu từ mái đình, cây đa, giếng cổ, rừng trúc và đầm sen Việt Nam.</p><p><b>An</b> giữ một ngọn đèn không bao giờ quên tên người.<br><b>Linh</b> nghe ký ức trong tiếng lá.<br><b>Kiệt</b> đúc lời hứa thành tiếng sấm.<br><b>HoaVi</b> viết những Mã Lệnh để vá lại ký ức, dựng Firewall và vượt giới hạn bằng Overclock.<br><b>Đốm</b> là một linh thú nhỏ, nhớ đường về nhà và dẫn bạn tới các khám phá.</p><div class="buttons"><button id="creditsClose" class="primary">Trở lại</button></div>`);$('creditsClose').onclick=closeAndContinue}
  function pause(){if(!game.started||game.dead||mapOpen)return;showModal('pause',`<span class="eyebrow">NGỌN ĐÈN VẪN SÁNG</span><h2>Nghỉ một nhịp.</h2><p>${game.hero.name} · Cấp ${game.player.level}<br>Đã thức tỉnh ${game.world.shrines.filter(s=>s.active).length}/3 ấn · Đánh bại ${game.kills} quái · ${game.player.gold} xu</p><div class="buttons"><button id="resumeButton" class="primary">Tiếp tục</button><button id="pauseHelp">Cách chơi</button><button id="manualSave">Lưu tiến độ</button><button id="toMenu">Lưu và về màn đầu</button></div>`);$('resumeButton').onclick=closeAndContinue;$('pauseHelp').onclick=help;$('manualSave').onclick=async()=>{if(await save())toast('Đã lưu hành trình.',true)};$('toMenu').onclick=()=>{save();closeModal(false);game.started=false;game.paused=true;$('hud').classList.add('hidden');$('mainMenu').classList.remove('hidden');$('continueButton').classList.toggle('hidden',!hasSave())}}
  function showTalent(){
    if(game.pendingLevels<1)return;const choices=game.talentChoices();showModal('talent',`<span class="eyebrow">CẤP ${game.player.level} · DI VẬT THỨC TỈNH</span><h2>Chọn cách giữ lửa.</h2><p>Di vật thay đổi kỹ năng và phối hợp với vũ khí đang mang.</p><div class="talent-cards">${choices.map(r=>`<button data-talent="${r.id}"><strong>${r.icon} ${r.name}</strong><span>${r.desc}</span></button>`).join('')}</div>`);$('modalContent').querySelectorAll('[data-talent]').forEach(b=>b.onclick=()=>{game.applyTalent(b.dataset.talent);closeModal();save();if(game.pendingLevels>0)showTalent()})
  }
  function shop(){
    const p=game.player,cost=60+game.upgrades*25,w=game.weapon,ws=game.weaponStateActive,wc=55+ws.level*30;
    showModal('shop',`<span class="eyebrow">CHÚ BẢY · LÒ RÈN BÊN ĐÌNH</span><h2>Rèn một cách chiến đấu.</h2><p>Đang có <b>${p.gold} xu</b> · ${w.name} +${ws.level}<br>${w.desc}</p><div class="shop-grid"><button data-buy="weapon" ${p.gold<wc||ws.level>=5?'disabled':''}><strong>Nâng vũ khí +${ws.level+1}</strong><span>+18% sát thương · ${wc} xu · tối đa +5</span></button><button data-buy="relic" ${p.gold<105?'disabled':''}><strong>Một di vật bí ẩn</strong><span>Thêm khả năng mới · 105 xu</span></button><button data-buy="damage" ${p.gold<cost?'disabled':''}><strong>Tăng 5 sát thương</strong><span>${cost} xu</span></button><button data-buy="hp" ${p.gold<cost?'disabled':''}><strong>Tăng 25 máu tối đa</strong><span>${cost} xu</span></button><button data-buy="potion" ${p.gold<20||p.potions>=12?'disabled':''}><strong>Bình máu · 20 xu</strong><span>Đang mang ${p.potions}/12</span></button></div><div class="buttons"><button id="shopClose" class="primary">Lên đường</button></div>`);
    $('modalContent').querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{if(game.buy(b.dataset.buy)){shop();save()}});$('shopClose').onclick=closeAndContinue;
  }
  function inventory(){
    const p=game.player,passive=DTContent.passives[game.hero.id],relics=Object.keys(p.relics).map(DTContent.relic).filter(Boolean);
    const skills=game.hero.id==='hoavi'?'Q · Debug Pulse: bắn năm luồng mã, tiêu thụ Mã Lệnh để tăng sát thương và giảm hồi chiêu.<br>E · Firewall: vòng tường lửa 4 giây, chặn đạn, gây sát thương, hồi 18 máu và cấp 32 khiên.<br>R · Overclock: 7 giây tăng tốc bắn, hai drone hỗ trợ; xóa đạn và hồi máu.':`Q · ${game.hero.q}: kỹ năng tấn công riêng.<br>E · ${game.hero.e}: kỹ năng kiểm soát chiến trường.<br>R · ${game.hero.r}: tuyệt kỹ xóa đạn, hồi máu và gây sát thương lớn.`;
    showModal('inventory',`<span class="eyebrow">${game.hero.role}</span><h2>${game.hero.name} · Cấp ${p.level}</h2><p>Máu ${Math.ceil(p.hp)}/${p.maxHp} · Linh lực ${Math.floor(p.mp)}/${p.maxMp} · Khiên ${Math.ceil(p.shield)}<br>Sát thương ${p.damage} · Chí mạng ${Math.round(p.crit*100)}% · Giáp ${Math.round(p.armor*100)}%</p><div class="passive-detail"><strong>NỘI TẠI · ${passive.name}</strong><p>${passive.desc}</p></div><div class="weapon-cards">${p.weapons.map((s,i)=>{const w=DTContent.weapon(s.id);return `<article class="rarity-${w.rarity}"><small>Ô ${i+1} · ${i===p.weaponSlot?'ĐANG CẦM':'DỰ PHÒNG'} · ${DTContent.rarity[w.rarity]}</small><strong>${w.name} +${s.level}</strong><p>${w.desc}<br>Băng ${w.clip} · nạp ${w.reload}s · ${w.shots} đạn/lần</p></article>`}).join('')}</div><p>${skills}</p><div class="relic-list">${relics.length?relics.map(r=>`<span title="${r.desc}">${r.icon} ${r.name}</span>`).join(''):'Chưa có di vật. Lên cấp, mở rương và đọc ký ức để tìm thêm.'}</div><p>Ký ức ${game.memories.length}/3 · Thành tựu ${game.achievements.length} · Hành trình +${game.run}</p><div class="buttons"><button id="inventoryClose" class="primary">Tiếp tục</button></div>`);$('inventoryClose').onclick=closeAndContinue;
  }
  function death(){showModal('death',`<span class="eyebrow">MỘT ĐỐM LỬA CÒN LẠI</span><h2>Đèn chưa tắt.</h2><p>Ngươi tỉnh lại bên Giếng Ngọc với đầy máu. Giữ cấp độ, kỹ năng và những ấn đã thức tỉnh; mất 10% xu đang mang.</p><div class="buttons"><button id="respawnButton" class="primary">Trở về Làng Đèn →</button></div>`);$('respawnButton').onclick=()=>{game.respawn();closeAndContinue()}}
  function victory(){audio.sfx('ultimate');save();showModal('victory',`<span class="eyebrow">MIỀN SƯƠNG ĐÃ NHỚ</span><h2>Ngọn đèn tìm được đường về.</h2><p>Cội đa không gục xuống. Nó cúi những cành già, như một người vừa được gọi đúng tên sau rất nhiều năm.<br><br>Sương tan. Trong làng, tiếng chuông lại ngân.</p><p>Hành trình hoàn thành với ${game.hero.name} · Cấp ${game.player.level}<br>${game.kills} quái đã hạ · ${game.deaths} lần trở về · ${Math.floor(game.time/60)} phút hành trình</p><div class="buttons"><button id="victoryContinue" class="primary">Tiếp tục khám phá →</button><button id="victoryStory">Đọc đoạn kết</button><button id="newCycle">Hành trình + · thế giới mới</button></div>`);$('victoryContinue').onclick=closeAndContinue;$('victoryStory').onclick=()=>dialogue('ending');$('newCycle').onclick=()=>{window.DTRunOptions={cycle:game.run+1};selected=game.hero.id;heroCards();begin(false)}}
  function toggleMap(){
    if(!game.started||game.dead||(modalType&&!mapOpen))return;mapOpen=!mapOpen;$('mapOverlay').classList.toggle('hidden',!mapOpen);game.paused=mapOpen;keys={};mouse.down=false;if(mapOpen)renderer.map($('worldMap'),true);
  }
  function travel(){
    const current=game.nearby();
    showModal('travel',`<span class="eyebrow">ĐI THEO NHỮNG NGỌN ĐÈN</span><h2>Dịch chuyển trạm đèn</h2><p>Thanh tẩy hộ vệ ở ba vùng đất mới để mở thêm điểm đến. Trạm đã sáng được giữ trong bản lưu.</p><div class="shop-grid">${game.world.beacons.map(b=>`<button data-destination="${b.id}" ${!game.outposts[b.id].claimed||current?.id===b.id?'disabled':''}><strong>${b.name}</strong><span>${current?.id===b.id?'Đang ở đây':game.outposts[b.id].claimed?'Đã mở · Dịch chuyển':'Chưa mở · Hoàn thành hai đợt hộ vệ'}</span></button>`).join('')}</div><div class="buttons"><button id="travelClose" class="primary">Tiếp tục khám phá</button></div>`);
    $('modalContent').querySelectorAll('[data-destination]').forEach(button=>button.onclick=()=>{if(game.travelTo(button.dataset.destination)){renderer.camera.x=game.player.x-500;renderer.camera.y=game.player.y-280;closeAndContinue()}else toast('Không thể dịch chuyển từ vị trí hiện tại.')});$('travelClose').onclick=closeAndContinue;
  }
  function handleEvents(){
    const events=game.consumeEvents();for(const e of events){
      if(e.type==='sound')audio.sfx(e.name);if(e.type==='toast')toast(e.text,e.reward);if(e.type==='dialogue')dialogue(e.id);if(e.type==='zone')toast(e.zone.name);if(e.type==='shop')shop();if(e.type==='travel')travel();
      if(e.type==='shrine'){toast(`${game.world.shrines.find(s=>s.id===e.id).name} đã thức tỉnh. +45 xu.`,true);save()}
      if(e.type==='boss'){toast('Mộc Quỷ thức tỉnh. Tuyệt kỹ đã sẵn sàng!');save()}
    }
    if(events.some(e=>e.type==='death'))death();else if(events.some(e=>e.type==='victory'))victory();else if(game.pendingLevels>0&&!modalType&&!mapOpen){audio.sfx('level');showTalent()}
  }
  function hud(){
    const p=game.player,z=DTWorld.zoneAt(p.x,p.y),q=game.objective();$('hpBar').style.width=(p.hp/p.maxHp*100)+'%';$('mpBar').style.width=(p.mp/p.maxMp*100)+'%';$('xpBar').style.width=(p.xp/p.nextXp*100)+'%';$('hpText').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;$('mpText').textContent=`${Math.floor(p.mp)} / ${p.maxMp}`;$('levelLabel').textContent=`CẤP ${p.level}`;$('goldLabel').textContent=`◈ ${p.gold} xu`;$('zoneName').textContent=z.name;$('zoneSub').textContent=z.sub;$('questTitle').textContent=q.title;$('questText').textContent=q.text;$('potionLabel').textContent=`${p.potions} bình máu`;
    $('sealRow').innerHTML=game.world.shrines.map(s=>`<span class="${s.active?'active':''}">${s.active?'✦':'◇'} ${s.name.slice(3)}</span>`).join('');
    const cds={dash:[p.cd.dash,1.2],q:[p.cd.q,game.hero.qCd],e:[p.cd.e,game.hero.eCd],r:[100-p.ult,100],heal:[0,1]};
    for(const [key,[val,max]]of Object.entries(cds)){const node=$('skill-'+key);node.querySelector('i').style.transform=`scaleY(${val/max})`;node.dataset.time=key==='r'?`${Math.floor(p.ult)}%`:val>.05?val.toFixed(1):'';node.classList.toggle('cooling',val>.05);node.classList.toggle('ready',key==='r'&&p.ult>=100)}
    const o=game.nearby();$('interactHint').classList.toggle('hidden',!o||game.paused);if(o)$('interactHint').querySelector('span').textContent=o.label;
    const boss=game.world.enemies.find(e=>e.type==='boss'&&e.alive);$('bossHud').classList.toggle('hidden',!boss||Math.hypot(boss.x-p.x,boss.y-p.y)>1000);if(boss){$('bossName').textContent=boss.name+(boss.phase===3?' · KÝ ỨC VỠ':boss.phase===2?' · CUỒNG SƯƠNG':'');$('bossBar').style.width=(Math.max(0,boss.hp)/boss.maxHp*100)+'%'}renderer.map($('minimap'));
    const w=game.weapon,ws=game.weaponStateActive;$('weaponName').textContent=w.name+' +'+ws.level;$('weaponName').style.color=w.color;$('weaponAmmo').textContent=ws.reload>0?'Đang nạp · '+ws.reload.toFixed(1)+'s':ws.ammo+' / '+w.clip+' · V nạp';$('passiveHud').textContent=game.hero.id==='hoavi'?'Mã Lệnh '+p.code+'/8 · Khiên '+Math.ceil(p.shield)+(p.overclock>0?' · OVERCLOCK '+p.overclock.toFixed(1)+'s':''):DTContent.passives[game.hero.id].name;
    const activeShrine=game.world.shrines.find(s=>game.challenge[s.id].started&&!game.challenge[s.id].complete&&!s.active);$('challengeHud').classList.toggle('hidden',!activeShrine);if(activeShrine){const st=game.challenge[activeShrine.id];$('challengeHud').textContent=activeShrine.id==='sen'?'ĐÈN SEN '+Math.ceil(st.hp)+'% · '+Math.max(0,Math.ceil(36-st.timer))+' GIÂY':'LÒ TRO · '+st.ids.filter(id=>game.world.enemies.some(e=>e.id===id&&e.alive)).length+' LÕI CÒN LẠI';}
    const outpost=game.world.beacons.find(b=>game.outposts[b.id].started&&!game.outposts[b.id].complete&&Math.hypot(b.x-p.x,b.y-p.y)<850);if(!activeShrine&&outpost){const st=game.outposts[outpost.id];$('challengeHud').classList.remove('hidden');$('challengeHud').textContent=outpost.name.toUpperCase()+' · ĐỢT '+st.wave+'/2 · '+st.ids.filter(id=>game.world.enemies.some(e=>e.id===id&&e.alive)).length+' HỘ VỆ';}

  }
  $('startButton').onclick=()=>begin(false);$('continueButton').onclick=()=>begin(true);$('helpButton').onclick=help;$('creditsButton').onclick=credits;$('pauseButton').onclick=pause;$('soundButton').onclick=()=>audio.toggle();$('mapButton').onclick=toggleMap;$('closeMap').onclick=toggleMap;$('fullscreenButton').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.()};
  addEventListener('keydown',e=>{
    const key=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright','tab'].includes(key))e.preventDefault();if(e.repeat){keys[key]=true;return}
    if(key==='escape'){if(mapOpen){toggleMap();return}if(modalType){if(!['talent','death','victory'].includes(modalType))closeAndContinue();return}pause();return}
    if(key==='enter'&&modalType==='dialogue'){$('dialogueNext').click();return}if(!game.started||game.dead)return;
    if(key==='m'){toggleMap();return}if(modalType||mapOpen)return;keys[key]=true;
    if(key==='tab')game.switchWeapon();if(key==='v')game.reloadWeapon();if(key===' ')game.dash();if(['q','e','r'].includes(key))game.skill(key);if(key==='h')game.heal();if(key==='f'){game.interact();handleEvents();save()}if(key==='i')inventory();
  });
  addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
  $('gameCanvas').addEventListener('mousemove',e=>{const r=$('stage').getBoundingClientRect();mouse.x=(e.clientX-r.left)*1280/r.width;mouse.y=(e.clientY-r.top)*720/r.height});
  $('gameCanvas').addEventListener('mousedown',e=>{if(e.button===0&&!game.paused){mouse.down=true;audio.init()}});addEventListener('mouseup',()=>mouse.down=false);$('gameCanvas').addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('blur',()=>{keys={};mouse.down=false;if(game.started&&!game.paused&&!game.dead)pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden){save();keys={};mouse.down=false;if(game.started&&!game.paused&&!game.dead)pause()}});addEventListener('pagehide',save);
  addEventListener('error',e=>{$('fatalError').classList.remove('hidden');$('fatalError').textContent='Game gặp lỗi. Hãy đóng rồi mở lại CHOI_GAME.bat.\n\n'+(e.error?.stack||e.message);game.paused=true});
  function frame(now){
    const dt=Math.min(.04,(now-last)/1000);last=now;const aim=renderer.screenToWorld(mouse.x,mouse.y);game.input={dx:(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy:(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0),fire:mouse.down,aimX:aim.x,aimY:aim.y};
    if(!game.started)game.time+=dt;game.update(dt);handleEvents();renderer.draw(dt,!game.started);audio.update();hudTime+=dt;saveTime+=dt;if(hudTime>.1){hudTime=0;if(game.started)hud()}if(saveTime>12){saveTime=0;save()}requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();


