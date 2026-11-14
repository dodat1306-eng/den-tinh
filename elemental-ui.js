(function(){
  'use strict';
  const $=id=>document.getElementById(id),E=DTElements;
  const panel=document.createElement('section');panel.id='elementPanel';panel.className='hidden';panel.innerHTML='<div class="element-panel-head"><span id="elementName"></span><button id="openElements">C · Biến hình</button></div><small id="elementPassive"></small><div class="split-options"><span>TỔNG DẠNG</span><button data-split-count="3">3</button><button data-split-count="5">5</button><button data-split-count="7">7</button><button id="splitElements">X · Phân thân</button></div><div id="elementSplitStatus"></div>';$('hud').appendChild(panel);
  const mobile=document.createElement('div');mobile.id='elementMobile';mobile.className='hidden';document.body.appendChild(mobile);
  const actions=document.querySelector('.touch-actions'),buttons={};for(const[key,label]of[['c','DẠNG'],['g','3/5/7'],['x','TÁCH']]){const b=document.createElement('button');b.dataset.elementAction=key;b.textContent=label;b.className='element-touch hidden';b.setAttribute('aria-label',key==='c'?'Chọn dạng nguyên tố':key==='g'?'Đổi số dạng phân thân':'Phân thân hoặc hợp thể');actions.appendChild(b);buttons[key]=b}
  const wheel=document.createElement('div');wheel.id='elementWheel';wheel.className='hidden';wheel.setAttribute('role','dialog');wheel.setAttribute('aria-modal','true');wheel.setAttribute('aria-label','Chọn dạng nguyên tố');document.body.appendChild(wheel);let wheelGame=null;
  const splitWheel=document.createElement('div');splitWheel.id='splitWheel';splitWheel.className='hidden';splitWheel.setAttribute('role','dialog');splitWheel.setAttribute('aria-modal','true');splitWheel.setAttribute('aria-label','Phân thân nguyên tố');document.body.appendChild(splitWheel);
  function closeWheel(){if(wheel.classList.contains('hidden'))return;wheel.classList.add('hidden');if(wheelGame===denTinh.game)denTinh.closeAndContinue();wheelGame=null}
  function openWheel(){
    const g=denTinh.game;if(!g.isElemental||!g.started||g.dead)return;if(!wheel.classList.contains('hidden')){closeWheel();return}if(g.paused)return;
    wheelGame=g;g.paused=true;wheel.innerHTML='<div class="element-wheel-card"><header><div><small>THIÊN VŨ · THẤT LINH SỨ</small><h2>Một linh hồn. Bảy nguyên tố.</h2></div><button id="closeElements">Đóng · C / Esc</button></header><p>Chọn dạng hoặc nhấn 1–7. Hồi chiêu Q/E/R dùng chung để đổi dạng không bỏ qua hồi chiêu.</p><div class="element-form-grid">'+E.forms.map((f,i)=>'<button data-form="'+f.id+'" style="--element:'+f.color+'" class="'+(f.id===g.element.id?'chosen':'')+'"><span class="form-number">'+(i+1)+'</span><canvas class="form-preview" width="128" height="128" style="image-rendering:pixelated"></canvas><strong>'+f.icon+' '+f.title+'</strong><small>'+f.desc+'</small><div><b>Q</b> '+f.q+'<br><b>E</b> '+f.e+'<br><b>R</b> '+f.r+'</div></button>').join('')+'</div><footer>C chọn dạng · G đổi 3/5/7 · X phân thân / hợp thể · R tuyệt kỹ</footer></div>';
    wheel.classList.remove('hidden');$('closeElements').onclick=closeWheel;wheel.querySelectorAll('[data-form]').forEach(button=>button.onclick=()=>{g.transformElement(button.dataset.form);closeWheel()});paintForms();wheel.querySelector('[data-form="'+g.element.id+'"]').focus();
  }
  function paintForms(){if(wheel.classList.contains('hidden'))return;wheel.querySelectorAll('canvas').forEach((canvas,i)=>{const c=canvas.getContext('2d');c.clearRect(0,0,128,128);DTElementArt.drawAvatar(c,{x:64,y:116,facing:Math.PI/2},E.forms[i].id,0,1.18)})}
  function nextCount(){const g=denTinh.game;if(!g.isElemental||g.paused)return;const a=[3,5,7];g.selectSplitCount(a[(a.indexOf(g.player.splitCount)+1)%3]);sync()}
  $('openElements').onclick=openWheel;$('splitElements').onclick=()=>{denTinh.game.splitElementals();sync()};panel.querySelectorAll('[data-split-count]').forEach(b=>b.onclick=()=>{denTinh.game.selectSplitCount(Number(b.dataset.splitCount));sync()});
  buttons.c.onclick=openWheel;buttons.g.onclick=nextCount;buttons.x.onclick=()=>{denTinh.game.splitElementals();sync()};wheel.onclick=e=>{if(e.target===wheel)closeWheel()};
  addEventListener('keydown',e=>{
    if(wheel.classList.contains('hidden'))return;
    if(e.key==='Escape'||e.key.toLowerCase()==='c'){e.preventDefault();e.stopImmediatePropagation();closeWheel()}
    else if(/^[1-7]$/.test(e.key)){e.preventDefault();e.stopImmediatePropagation();wheelGame.transformElement(E.forms[Number(e.key)-1].id);closeWheel()}
    else if(e.key==='Tab'){const focus=[...wheel.querySelectorAll('button')],at=focus.indexOf(document.activeElement),next=e.shiftKey?(at<=0?focus.length-1:at-1):(at+1)%focus.length;e.preventDefault();e.stopImmediatePropagation();focus[next].focus()}
  },true);
  addEventListener('keydown',e=>{const g=denTinh.game;if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||!g.isElemental||!g.started||g.dead)return;const key=e.key.toLowerCase();if(key==='c'){e.preventDefault();openWheel();return}if(g.paused)return;if(/^[1-7]$/.test(key)){g.transformElement(E.forms[Number(key)-1].id);sync()}if(key==='g')nextCount();if(key==='x'){g.splitElementals();sync()}});
  function sync(){
    const g=denTinh.game,show=g.isElemental&&g.started;panel.classList.toggle('hidden',!show);mobile.classList.toggle('hidden',!show||!DTTouch.active);for(const b of Object.values(buttons))b.classList.toggle('hidden',!show);
    if(!show){if(wheelGame)closeWheel();return}const f=g.element,p=g.player,active=g.elementSplitTime>0&&g.elementClones.length>0,cost={3:30,5:45,7:60}[p.splitCount],intro=p.ultIntro?.mode==='split',ready=!intro&&(active||g.elementSplitCd<=0&&p.mp>=cost);
    panel.style.setProperty('--element',f.color);$('elementName').textContent=f.icon+' '+f.title;$('elementPassive').textContent=f.passive;$('elementSplitStatus').textContent=intro?'Đang khai trận '+p.ultIntro.splitCount+' dạng · '+(4.2-p.ultIntro.elapsed).toFixed(1)+'s':active?(g.elementClones.length+1)+' dạng đang chiến đấu · '+g.elementSplitTime.toFixed(1)+' giây':'Phân thân '+p.splitCount+' dạng: '+cost+' linh lực'+(g.elementSplitCd>0?' · hồi '+g.elementSplitCd.toFixed(1)+'s':'');
    $('splitElements').textContent=intro?'X · Khai trận':active?'X · Hợp thể':g.elementSplitCd>0?'X · '+g.elementSplitCd.toFixed(1)+'s':'X · Phân thân';$('splitElements').disabled=!ready;panel.querySelectorAll('[data-split-count]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.splitCount)===p.splitCount);b.disabled=intro||active});
    $('qName').textContent=f.q;$('eName').textContent=f.e;$('rName').textContent=f.r;$('heroName').textContent='Thiên Vũ · '+f.name;$('heroBadge').textContent=f.icon;$('heroBadge').style.color=f.color;
    mobile.textContent=f.icon+' '+f.title+' · Linh lực '+Math.floor(p.mp)+'/'+p.maxMp+' · '+(active?(g.elementClones.length+1)+' dạng / '+Math.ceil(g.elementSplitTime)+'s':'Chọn '+p.splitCount+' dạng');mobile.style.borderColor=f.color;
    buttons.x.disabled=!ready;buttons.x.textContent=intro?'KHAI TRẬN':active?'HỢP':g.elementSplitCd>0?Math.ceil(g.elementSplitCd)+'s':'TÁCH '+p.splitCount;buttons.g.textContent=p.splitCount+' DẠNG';paintForms();
  }
  const audio=denTinh.audio,oldSfx=audio.sfx;audio.sfx=function(name){if(!name.startsWith('element-')){oldSfx.call(this,name);return}if(!this.ctx||!this.enabled)return;const i=E.forms.findIndex(f=>f.id===name.slice(8)),frequencies=[740,540,180,260,960,440,1150],t=this.ctx.currentTime;if(t-(this.lastElementSound||0)<.12)return;this.lastElementSound=t;this.tone(frequencies[i]||600,t,.16,.085,i===2?'triangle':'sine',(frequencies[i]||600)*.55)};
  setInterval(sync,100);rootHelp();
  function rootHelp(){document.querySelector('.menu-footer span').textContent='5 NHÂN VẬT · 9 VÙNG ĐẤT · THẤT LINH PHÂN THÂN'}
  window.DTElementUI={openWheel,closeWheel,sync};
})();
