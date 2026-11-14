(function(){
  'use strict';
  const $=id=>document.getElementById(id),defaults={master:.8,music:.55,sfx:.85,ui:1,reducedMotion:false,touch:'auto',graphics:'auto'};
  try{window.DTSettings={...defaults,...JSON.parse(localStorage.getItem('den-tinh-settings-v2')||'{}')}}catch(e){window.DTSettings={...defaults}}
  window.DTTouch={active:false,move:{x:0,y:0},aim:{x:1,y:0,fire:false}};
  const touch=window.DTTouch;document.body.appendChild($('touchControls'));
  const mobile=document.createElement('div');mobile.id='mobileStatus';mobile.className='hidden';mobile.innerHTML='<div><strong id="mobileHero"></strong><button id="mobileInventory" aria-label="Kỹ năng, nội tại và cổ vật">I</button><button id="mobileSettings" aria-label="Cài đặt">⚙</button><button id="mobilePause" aria-label="Tạm dừng">Ⅱ</button><button id="mobileMap" aria-label="Bản đồ">M</button></div><span id="mobileStats"></span><small id="mobileQuest"></small>';document.body.appendChild(mobile);
  const saveSettings=()=>{try{localStorage.setItem('den-tinh-settings-v2',JSON.stringify(DTSettings))}catch(e){}applySettings()};
  function applySettings(){
    document.documentElement.style.setProperty('--ui-scale',Number(DTSettings.ui)||1);
    document.body.classList.toggle('reduced-motion',!!DTSettings.reducedMotion);
    touch.active=DTSettings.touch==='on'||DTSettings.touch==='auto'&&(matchMedia('(pointer:coarse)').matches||Math.min(innerWidth,innerHeight)<600);
    document.body.classList.toggle('touch-mode',touch.active);
    if(!touch.active){touch.move.x=touch.move.y=0;touch.aim.fire=false}
  }
  function settings(){
    const app=window.denTinh,s=DTSettings;
    app.showModal('settings',`<span class="eyebrow">TRẢI NGHIỆM CỦA BẠN</span><h2>Âm thanh & điều khiển</h2><div class="settings-grid"><label>Âm lượng chung<input data-setting="master" type="range" min="0" max="1" step="0.05" value="${s.master}"></label><label>Nhạc & môi trường<input data-setting="music" type="range" min="0" max="1" step="0.05" value="${s.music}"></label><label>Hiệu ứng chiến đấu<input data-setting="sfx" type="range" min="0" max="1" step="0.05" value="${s.sfx}"></label><label>Cỡ chữ giao diện<input data-setting="ui" type="range" min="1" max="1.4" step="0.1" value="${s.ui}"></label><label class="toggle-line"><input data-setting="reducedMotion" type="checkbox" ${s.reducedMotion?'checked':''}> Giảm rung, chớp và chuyển động</label><label>Điều khiển cảm ứng<select id="touchMode"><option value="auto">Tự động theo thiết bị</option><option value="on">Luôn bật</option><option value="off">Tắt</option></select></label></div><p>Hai cần cảm ứng hỗ trợ di chuyển và ngắm độc lập. Nút Q/E/R dùng kỹ năng, F tương tác, K học kỹ năng. Mỗi nhân vật có pháp khí riêng; tấn công không cần nạp. Xoay ngang điện thoại để có góc nhìn rộng.</p><div class="buttons"><button id="skipTutorial">Bỏ qua hướng dẫn</button><button id="settingsClose" class="primary">Lưu và đóng</button></div>`);
    $('touchMode').value=s.touch;$('modalContent').querySelectorAll('[data-setting]').forEach(input=>input.oninput=()=>{DTSettings[input.dataset.setting]=input.type==='checkbox'?input.checked:Number(input.value);saveSettings()});$('touchMode').onchange=()=>{DTSettings.touch=$('touchMode').value;saveSettings()};$('settingsClose').onclick=()=>{saveSettings();app.closeAndContinue()};$('skipTutorial').onclick=()=>{app.game.skipTutorial();app.closeAndContinue()};
    const graphicsLabel=document.createElement('label');graphicsLabel.innerHTML='Đồ họa môi trường<select id="graphicsMode"><option value="auto">Tự động theo thiết bị</option><option value="high">Chi tiết cao</option><option value="low">Nhẹ · ít hạt và ánh sáng</option></select>';$('modalContent').querySelector('.settings-grid').appendChild(graphicsLabel);$('graphicsMode').value=s.graphics||'auto';$('graphicsMode').onchange=()=>{DTSettings.graphics=$('graphicsMode').value;saveSettings()};
  }
  $('settingsMenu').onclick=settings;$('settingsHud').onclick=settings;$('mobileSettings').onclick=settings;$('mobileInventory').onclick=()=>denTinh.inventory();$('mobilePause').onclick=()=>denTinh.pause();$('mobileMap').onclick=()=>$('mapButton').click();
  function action(name){const g=denTinh.game;if(!g.started||g.paused||g.dead)return;if(name==='dash')g.dash();else if(name==='heal')g.heal();else if(name==='interact'){g.interact();denTinh.save()}else if(name==='skills'){window.DTAscensionUI?.showSkills();return}else g.skill(name)}
  document.querySelectorAll('[data-touch]').forEach(b=>b.onclick=()=>action(b.dataset.touch));
  for(const key of['q','e','r','dash','heal']){const el=$('skill-'+key);el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',key==='dash'?'Lướt né':key==='heal'?'Hồi máu':'Kỹ năng '+key.toUpperCase());el.onclick=()=>action(key);el.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();action(key)}}}
  function stick(node,target,isAim){
    const knob=node.querySelector('span');let pointer=null;
    const move=e=>{const r=node.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.35),y=(e.clientY-r.top-r.height/2)/(r.height*.35),l=Math.hypot(x,y),scale=l>1?1/l:1;target.x=l<.12?0:x*scale;target.y=l<.12?0:y*scale;if(isAim)target.fire=l>.18;knob.style.transform=`translate(${target.x*30}px,${target.y*30}px)`;e.preventDefault()};
    node.onpointerdown=e=>{pointer=e.pointerId;node.setPointerCapture(pointer);denTinh.audio.init();move(e)};
    node.onpointermove=e=>{if(e.pointerId===pointer)move(e)};
    const end=e=>{if(e.pointerId!==pointer)return;pointer=null;target.x=0;target.y=0;if(isAim)target.fire=false;knob.style.transform='translate(0,0)'};node.onpointerup=end;node.onpointercancel=end;node.onlostpointercapture=end;
  }
  stick($('moveStick'),touch.move,false);stick($('aimStick'),touch.aim,true);
  addEventListener('blur',()=>{touch.move.x=touch.move.y=0;touch.aim.fire=false});addEventListener('resize',applySettings);applySettings();
  const observer=new MutationObserver(()=>{if($('modal').classList.contains('hidden'))return;const buttons=$('modalContent').querySelectorAll('button,input,select');if(buttons.length&&document.activeElement===document.body)buttons[0].focus()});observer.observe($('modalContent'),{childList:true});
  document.addEventListener('keydown',e=>{if(e.key!=='Tab'||$('modal').classList.contains('hidden'))return;const focus=[...$('modalContent').querySelectorAll('button:not(:disabled),input,select')];if(!focus.length)return;const idx=focus.indexOf(document.activeElement),next=e.shiftKey?(idx<=0?focus.length-1:idx-1):(idx+1)%focus.length;e.preventDefault();focus[next].focus()},true);
  setInterval(()=>{
    const g=denTinh.game,show=touch.active&&g.started&&!g.paused&&!g.dead;$('touchControls').classList.toggle('hidden',!show);mobile.classList.toggle('hidden',!touch.active||!g.started);
    if(touch.active&&g.started){const p=g.player;$('mobileHero').textContent=g.hero.name+' · Cấp '+p.level;$('mobileStats').textContent='♥ '+Math.ceil(p.hp)+'/'+p.maxHp+' · Linh lực '+Math.floor(p.mp)+'/'+p.maxMp+' · '+(g.signature?.name||'Pháp khí riêng');$('mobileQuest').textContent=g.objective().text}
    if(touch.active&&g.started){for(const key of['q','e','r','dash']){const b=document.querySelector('[data-touch="'+key+'"]'),p=g.player,cd=p.cd[key];const recast=key==='e'&&g.canRecastE?.(),cost=g.skillDescriptions?.[key]?.cost??(key==='q'?24:key==='e'?38:0);b.disabled=recast?false:key==='r'?cd>0||!!p.ultIntro:cd>0||p.mp<cost;b.textContent=recast?(g.hero.id==='an'?'E · NỔ':'E · VỀ'):key==='r'?('R'+(cd>0?' '+cd.toFixed(1)+'s':'')):key==='dash'?cd>0?cd.toFixed(1):'↝':key.toUpperCase()+(cd>0?' '+cd.toFixed(1):'')}}
    document.body.classList.toggle('game-active',g.started);
  },150);
  // The browser release and Unity project use the same checked-in key art.
  const art=new Image();art.onload=()=>document.body.classList.add('keyart-ready');art.src='assets/key-art.png';
})();
