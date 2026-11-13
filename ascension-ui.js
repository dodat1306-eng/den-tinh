(function(root){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').normalize('NFC').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const app=()=>root.denTinh;
  const game=()=>app().game;
  const points=g=>Math.max(0,Math.floor(Number(g.skillPoints??g.player.skillPoints)||0));
  const signature=g=>g.signature||{name:g.weapon?.name||'Bảo khí riêng',desc:'Bảo khí gắn với bộ kỹ năng và nội tại của nhân vật.',color:g.hero.color};
  function passive(g){
    const fallback=root.DTContent.passives[g.hero.id]||{name:'Nội tại',desc:g.hero.desc};
    const raw=typeof g.passiveDescription==='function'?g.passiveDescription():null;
    return typeof raw==='string'?{name:fallback.name,desc:raw}:raw&&typeof raw==='object'?{...fallback,...raw}:fallback;
  }
  function status(g){
    const value=typeof g.passiveStatus==='function'?g.passiveStatus():null;
    if(typeof value==='string')return value;
    if(value&&typeof value==='object')return value.text||value.label||value.desc||'';
    const state=g.passiveState;
    if(state?.text)return state.text;
    if(state?.label)return state.label+(Number.isFinite(state.value)?' '+state.value+(state.max?'/'+state.max:''):'');
    return g.hero.id==='hoavi'?'Mã Lệnh '+(g.player.code||0)+'/8':passive(g).name;
  }
  function nodes(g){
    if(Array.isArray(g.skillTree))return g.skillTree;
    return Object.values(g.skillTree||{});
  }
  function rank(g,node){return Math.max(0,Number(g.skillRanks?.[node.id]??node.rank)||0)}
  function skill(g,key){
    const source=g.skillDescriptions?.[key]||root.DTContent.kits?.[g.hero.id]?.[key];
    if(typeof source==='string')return{name:g.hero[key],desc:source};
    const elemental=g.isElemental?g.element:null;
    return{name:source?.name||elemental?.[key]||g.hero[key],desc:source?.desc||source?.description||({q:'Kỹ năng chủ động. Ngắm theo hướng chuột hoặc cần phải.',e:'Kỹ năng kiểm soát và phối hợp với nội tại.',r:'Tuyệt kỹ cần 100% lực, tích lũy từ đòn đánh và kỹ năng thường.'})[key],...source};
  }
  function objective(g){
    let o=g.objective?.()||{};
    if(g.victory){const next=g.sagaObjective?.()||g.storyStatus?.();if(next)o=next}
    return typeof o==='string'?{title:'Hành trình tiếp nối',text:o}:o;
  }
  function tabs(current){return '<nav class="ascension-tabs" aria-label="Bảng nhân vật">'+[['skills','Kỹ năng · K'],['inventory','Nhân vật · I'],['relics','Cổ vật & truyền thuyết']].map(([id,label])=>'<button data-asc-tab="'+id+'" class="'+(current===id?'selected':'')+'" aria-current="'+(current===id?'page':'false')+'">'+label+'</button>').join('')+'</nav>'}
  function shell(tab,title,body){
    const g=game();
    app().showModal(tab==='skills'?'skills':'inventory','<section class="ascension-panel"><span class="eyebrow">ĐÈN TINH 0.7 · '+esc(g.hero.role)+'</span><h2>'+esc(title)+'</h2>'+tabs(tab)+body+'<div class="buttons ascension-footer"><button id="ascensionClose" class="primary">Tiếp tục hành trình</button><small>K học kỹ năng · I xem nhân vật · Esc đóng</small></div></section>');
    $('ascensionClose').onclick=()=>app().closeAndContinue();
    $('modalContent').querySelectorAll('[data-asc-tab]').forEach(b=>b.onclick=()=>b.dataset.ascTab==='skills'?showSkills():b.dataset.ascTab==='relics'?showRelics():showInventory());
  }
  function showSkills(){
    const g=game();if(!g.started||g.dead)return;
    const tree=nodes(g),p=passive(g),s=signature(g);
    const skillCards=['q','e','r'].map(key=>{const k=skill(g,key);return '<article class="ascension-ability"><kbd>'+key.toUpperCase()+'</kbd><div><strong>'+esc(k.name)+'</strong><p>'+esc(k.desc)+'</p><small>'+esc(key==='r'?'Cần 100% lực tuyệt kỹ':(k.cost??(key==='q'?24:38))+' linh lực')+(k.cooldown?' · '+esc(k.cooldown)+' giây':'')+'</small></div></article>'}).join('');
    const nodeCards=tree.map(n=>{const r=rank(g,n),max=Math.max(1,Number(n.maxRank??n.max)||3),cost=Math.max(1,Number(n.cost)||1),locked=r>=max,prereq=n.mastery?!g.masteryUnlocked:n.requires&&rank(g,{id:n.requires})<1;
      return '<article class="ascension-node'+(r?' learned':'')+'"><div class="node-head"><strong>'+esc(n.name)+'</strong><span>'+r+' / '+max+'</span></div><p>'+esc(n.desc||n.description)+'</p><div class="rank-dots" aria-label="Bậc '+r+' trên '+max+'">'+Array.from({length:max},(_,i)=>'<i class="'+(i<r?'active':'')+'"></i>').join('')+'</div><button data-learn="'+esc(n.id)+'" '+(locked||points(g)<cost||prereq?'disabled':'')+'>'+esc(locked?'Đã thành thạo':prereq?'Học nhánh trước':'Học bậc '+(r+1)+' · '+cost+' điểm')+'</button></article>'}).join('');
    shell('skills',g.hero.name+' · Con đường kỹ năng','<div class="skill-points"><div><strong>'+points(g)+'</strong><span>ĐIỂM KỸ NĂNG</span></div><p>Lên cấp và hoàn thành hành trình để nhận điểm. Mỗi nhánh phát triển trực tiếp cách vận hành bộ chiêu.</p></div><div class="signature-detail"><small>BẢO KHÍ RIÊNG</small><strong>'+esc(s.name)+'</strong><p>'+esc(s.desc)+'</p></div><div class="passive-detail"><strong>NỘI TẠI · '+esc(p.name)+'</strong><p>'+esc(p.desc)+'</p><small>'+esc(status(g))+'</small></div><div class="ascension-abilities">'+skillCards+'</div><div class="ascension-tree">'+(nodeCards||'<p>Cây kỹ năng đang được khai mở.</p>')+'</div>');
    root.DTJourneyUI?.enhanceSkills(g);$('modalContent').querySelectorAll('[data-learn]').forEach(b=>b.onclick=()=>{if(g.learnSkill?.(b.dataset.learn)){app().save();showSkills()}});
  }
  function showInventory(){
    const g=game();if(!g.started||g.dead)return;const p=g.player,s=signature(g),inner=passive(g),o=objective(g),relics=root.DTContent.relics.filter(r=>p.relics?.[r.id]);
    shell('inventory',g.hero.name+' · Cấp '+p.level,'<div class="ascension-stats"><span>Máu <b>'+Math.ceil(p.hp)+' / '+p.maxHp+'</b></span><span>Linh lực <b>'+Math.floor(p.mp)+' / '+p.maxMp+'</b></span><span>Khiên <b>'+Math.ceil(p.shield||0)+'</b></span><span>Sát thương <b>'+Math.round(p.damage*10)/10+'</b></span><span>Chí mạng <b>'+Math.round(p.crit*100)+'%</b></span><span>Giáp <b>'+Math.round(p.armor*100)+'%</b></span></div><div class="signature-detail"><small>BẢO KHÍ RIÊNG</small><strong>'+esc(s.name)+'</strong><p>'+esc(s.desc)+'</p></div><div class="passive-detail"><strong>NỘI TẠI · '+esc(inner.name)+'</strong><p>'+esc(inner.desc)+'</p><small>'+esc(status(g))+'</small></div><div class="ascension-journey"><small>ĐƯỜNG ĐANG ĐI</small><strong>'+esc(o.title)+'</strong><p>'+esc(o.text)+'</p><p>Đã học '+nodes(g).reduce((sum,n)=>sum+rank(g,n),0)+' bậc kỹ năng · Còn '+points(g)+' điểm · '+(g.memories?.length||0)+' ký ức · '+(g.achievements?.length||0)+' thành tựu</p></div><h3 class="ascension-heading">Cổ vật đang cộng hưởng · '+relics.length+'</h3><div class="relic-list">'+(relics.map(r=>'<span title="'+esc(r.desc)+'">'+esc(r.icon||'◇')+' '+esc(r.name)+(p.relics[r.id]>1?' ×'+p.relics[r.id]:'')+'</span>').join('')||'Chưa có cổ vật. Khám phá, mở rương và nhận thưởng để tìm thêm.')+'</div>');
  }
  function showRelics(){
    const g=game(),all=root.DTContent.relics,newOnes=all.filter(r=>r.origin||r.lore||r.legend||r.myth),owned=newOnes.filter(r=>g.player.relics?.[r.id]).length;
    shell('relics','Cổ vật & những chuyện được kể','<p class="relic-intro">'+newOnes.length+' cổ vật từ truyền thuyết Việt Nam và thế giới · Đã tìm được '+owned+'. Nguồn gốc thuộc truyện kể; hiệu ứng chiến đấu được sáng tạo riêng cho Đèn Tinh.</p><div class="ascension-relic-grid">'+newOnes.map(r=>'<article class="ascension-relic'+(g.player.relics?.[r.id]?' discovered':'')+'"><div><span>'+esc(r.icon||'◇')+'</span><strong>'+esc(r.name)+'</strong><small>'+esc(g.player.relics?.[r.id]?'ĐÃ SỞ HỮU':'CHƯA TÌM THẤY')+'</small></div><p class="relic-origin">'+esc(r.origin||r.legend||r.myth||'Truyền thuyết')+'</p>'+(r.lore?'<p>'+esc(r.lore)+'</p>':'')+'<p class="relic-effect">'+esc(r.desc)+'</p></article>').join('')+'</div><details class="legacy-relics"><summary>Di vật từ hành trình mở đầu · '+(all.length-newOnes.length)+'</summary>'+all.filter(r=>!newOnes.includes(r)).map(r=>'<p><b>'+esc(r.icon)+' '+esc(r.name)+'</b> · '+esc(r.desc)+'</p>').join('')+'</details>');
  }
  function showTrainer(){
    if(root.DTJourneyUI)return root.DTJourneyUI.showShop();const g=game(),p=g.player,cost=60+(g.upgrades||0)*25;
    app().showModal('shop','<section class="ascension-panel"><span class="eyebrow">CHÚ BẢY · NHỮNG CÁCH GIỮ LỬA</span><h2>Mài giũa điều làm nên con.</h2><p>Chú Bảy đặt bảo khí của '+esc(g.hero.name)+' bên bếp lửa: “Bảo khí đã nhận chủ. Điều còn lại là học cách nghe nó.”</p><div class="skill-points"><div><strong>'+points(g)+'</strong><span>ĐIỂM KỸ NĂNG</span></div><button id="trainerSkills" class="primary">Mở cây kỹ năng →</button></div><p>Đang có <b>'+p.gold+' xu</b>. Cổ vật và vật tư giúp con chuẩn bị cho đường xa.</p><div class="shop-grid"><button data-buy="relic" '+(p.gold<105?'disabled':'')+'><strong>Một cổ vật bí ẩn</strong><span>Tạo một tương tác mới · 105 xu</span></button><button data-buy="damage" '+(p.gold<cost?'disabled':'')+'><strong>Luyện đòn thường · +5 sát thương</strong><span>'+cost+' xu</span></button><button data-buy="hp" '+(p.gold<cost?'disabled':'')+'><strong>Rèn thể lực · +25 máu tối đa</strong><span>'+cost+' xu</span></button><button data-buy="potion" '+(p.gold<20||p.potions>=12?'disabled':'')+'><strong>Bình máu · 20 xu</strong><span>Đang mang '+p.potions+'/12</span></button></div><div class="buttons"><button id="trainerClose" class="primary">Lên đường</button></div></section>');
    $('trainerSkills').onclick=showSkills;$('trainerClose').onclick=()=>app().closeAndContinue();$('modalContent').querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{if(g.buy(b.dataset.buy)){app().save();showTrainer()}});
  }
  function sync(g){
    const s=signature(g),p=passive(g);$('weaponName').textContent=s.name;$('weaponName').style.color=s.color||g.hero.color;$('weaponAmmo').textContent='K · Kỹ năng · '+points(g)+' điểm';$('passiveHud').textContent=status(g);$('passiveHud').title=p.desc;
    for(const key of['q','e','r']){const el=$('skill-'+key),k=key==='r'&&g.isElemental?{name:'Chọn Phân Thân',desc:'Nhấn R chọn 3/5/7 dạng. Giữ R 0,45 giây tách bảy. Tuyệt kỹ '+g.element.r+' dùng nút riêng trong vòng chọn.'}:skill(g,key);el.title=key.toUpperCase()+' · '+k.name+'\n'+k.desc;el.setAttribute('aria-label',key.toUpperCase()+' · '+k.name+'. '+k.desc)}
    const o=objective(g);if(o.title)$('questTitle').textContent=o.title;if(o.text)$('questText').textContent=o.text;
    const skillButton=$('openSkillTree');if(skillButton)skillButton.textContent='K · Kỹ năng'+(points(g)?' · '+points(g):'');
  }
  root.DTAscensionUI={showSkills,showInventory,showRelics,showTrainer,sync,passive,status};
  $('weaponHud').classList.add('signature-hud');$('weaponHud').querySelector('.eyebrow').textContent='BẢO KHÍ RIÊNG · NỘI TẠI';
  const skillButton=document.createElement('button');skillButton.id='openSkillTree';skillButton.textContent='K · Kỹ năng';skillButton.onclick=showSkills;document.querySelector('.bottom-info').insertBefore(skillButton,$('pauseButton'));
  document.querySelector('.bottom-info>span').textContent='WASD di chuyển · Chuột đánh · F tương tác · K kỹ năng · I cổ vật';
  document.querySelectorAll('[data-touch="swap"],[data-touch="reload"]').forEach(b=>b.remove());
  const touch=document.querySelector('[data-touch="skills"]')||document.createElement('button');touch.dataset.touch='skills';touch.textContent='K';touch.setAttribute('aria-label','Học kỹ năng và xem nội tại');touch.onclick=showSkills;if(!touch.parentNode)document.querySelector('.touch-actions').appendChild(touch);
  const edition=document.querySelector('.edition-tag');if(edition)edition.textContent='BẢN 0.7 · NHỊP CHIÊU · THẤT LINH';
  const footer=document.querySelectorAll('.menu-footer span');if(footer[0])footer[0].textContent='THẾ GIỚI VÔ HẠN · 5 BỘ KỸ NĂNG · 20 CỔ VẬT MỚI';if(footer[1])footer[1].textContent='ĐÈN TINH / 05';
  const mapLabel=document.querySelector('.world-map-head .eyebrow');if(mapLabel)mapLabel.textContent='MIỀN ĐẤT CŨ · NHỮNG CHÂN TRỜI MỚI';
  $('mobileInventory')?.setAttribute('aria-label','Nhân vật, kỹ năng và cổ vật');
})(globalThis);
