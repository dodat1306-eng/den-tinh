const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');const root=path.resolve(__dirname,'..'),context={};context.globalThis=context;vm.createContext(context);for(const f of['world.js','content.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context);
const data={heroes:Object.values(context.DTWorld.HEROES),weapons:context.DTContent.weapons,relics:context.DTContent.relics.map(x=>({...x}))};
data.weapons=[...data.weapons];context.DTGame=class {};vm.runInContext(fs.readFileSync(path.join(root,'elemental.js'),'utf8'),context);
data.elementalHero=context.DTElements.hero;data.elements=context.DTElements.forms;data.elementalWeapon=context.DTContent.weapons.find(w=>w.id==='prism');
vm.runInContext(fs.readFileSync(path.join(root,'mythic-content.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(root,'v09-content.js'),'utf8'),context);for(const relic of context.DTV09Content.relics){const item={id:relic.id,name:relic.name,icon:relic.icon||'◇',desc:relic.desc,atlas:relic.atlas,source:relic.source,boss:relic.boss||'',lore:relic.lore,origin:relic.origin},old=data.relics.find(x=>x.id===relic.id);if(old)Object.assign(old,item);else data.relics.push(item)}vm.runInContext(fs.readFileSync(path.join(root,'shadow.js'),'utf8'),context);data.shadows=context.SHADOW_BEAST_CATALOG;
data.weapons.push({...context.DTMythic.signature.ait01,rarity:'signature',power:1,interval:.22,speed:820,reload:0,shots:1,pierce:0,clip:1,effect:''});
data.weapons.push({...context.DTMythic.signature.quynhkun,rarity:'signature',power:1,interval:.21,speed:760,reload:0,shots:1,pierce:0,clip:1,effect:''});
data.weapons.push({...context.DTMythic.signature.quanle,rarity:'signature',power:1.15,interval:.3,speed:680,reload:0,shots:1,pierce:4,clip:1,effect:''});
const quote=s=>JSON.stringify(s),float=n=>Number(n).toString()+'f';
const definitions={HeroDef:{ints:[],floats:['hp','speed','damage','fireRate','shotSpeed','qCd','eCd','rCd']},WeaponDef:{ints:['shots','pierce','clip'],floats:['power','interval','speed','reload']},RelicDef:{ints:['atlas'],floats:[]},ElementDef:{ints:[],floats:[]}};
function literal(type,obj){const d=definitions[type];return 'new '+type+'{'+Object.entries(obj).map(([k,v])=>k+'='+(d.ints.includes(k)?v:d.floats.includes(k)?float(v):quote(v))).join(',')+'}'}
const source='// Generated from world.js + content.js by tools/export-unity-content.cjs.\nnamespace DenTinh.Core { public static class CatalogData { public static ContentDatabase Create(){return new ContentDatabase{heroes=new HeroDef[]{'+data.heroes.map(x=>literal('HeroDef',x)).join(',\n')+'},weapons=new WeaponDef[]{'+data.weapons.map(x=>literal('WeaponDef',x)).join(',\n')+'},relics=new RelicDef[]{'+data.relics.map(x=>literal('RelicDef',x)).join(',\n')+'}};} } }\n';
const extra=',shadows=new ShadowSpec[]{'+data.shadows.map(x=>'new ShadowSpec{'+Object.entries(x).map(([k,v])=>k+'='+(typeof v==='number'?float(v):typeof v==='boolean'?String(v):quote(v))).join(',')+'}').join(',')+'},elementalHero='+literal('HeroDef',data.elementalHero)+',elementalWeapon='+literal('WeaponDef',data.elementalWeapon)+',elements=new ElementDef[]{'+data.elements.map(x=>literal('ElementDef',x)).join(',')+'}';
fs.writeFileSync(path.join(root,'Unity/Assets/Scripts/Core/CatalogData.cs'),source.replace('}};} } }', '}'+extra+'};} } }'));fs.writeFileSync(path.join(root,'Unity/Assets/Resources/Content.json'),JSON.stringify(data,null,2));
const art=path.join(root,'Unity/Assets/Resources/Art');fs.mkdirSync(art,{recursive:true});const clips=[];
for(const [file,texture]of [['thienvu-pixel-v08','ThienVu'],['thienvu-vfx-pixel','ThienVuVFX']]){fs.copyFileSync(path.join(root,'assets',file+'.png'),path.join(art,texture+'.png'));const meta=JSON.parse(fs.readFileSync(path.join(root,'assets',file+'.json'),'utf8'));if(meta.forms)for(const [form,f]of Object.entries(meta.forms))for(const [action,clip]of Object.entries(f.actions))for(const [view,cells]of Object.entries(clip.directions))clips.push({key:form+'/'+action+'/'+view,texture,fps:clip.fps,cells});else for(const[key,clip]of Object.entries(meta.clips))clips.push({key,texture,fps:clip.fps,cells:clip.cells})}
fs.writeFileSync(path.join(art,'ThienVuClips.json'),JSON.stringify({clips}));console.log('Exported original catalog + Thiên Vũ, seven elements and '+clips.length+' pixel clips.');

const shadowClips=[];for(const[file,texture]of[['quanle-pixel-v1','QuanLe'],['quanle-vfx-pixel','QuanLeVFX']]){const meta=JSON.parse(fs.readFileSync(path.join(root,'assets',file+'.json'),'utf8'));fs.copyFileSync(path.join(root,'assets',file+'.png'),path.join(art,texture+'.png'));for(const[key,c]of Object.entries(meta.clips))shadowClips.push({key,texture,fps:c.fps,cells:c.cells})}fs.writeFileSync(path.join(art,'QuanLeClips.json'),JSON.stringify({clips:shadowClips}));
for(const [srcName,dstName]of[['hoavi-locomotion.png','HoaViLocomotion.png'],['hoavi-actions.png','HoaViActions.png'],['hoavi-skills.png','HoaViSkills.png'],['hoavi-ult-r.png','HoaViUltR.png'],['hoavi-vfx.png','HoaViVFX.png'],['hoavi-portrait.png','HoaViPortrait.png']])fs.copyFileSync(path.join(root,'assets',srcName),path.join(art,dstName));
for(const oldFile of['HoaVi.png','HoaVi.png.meta']){const oldPath=path.join(art,oldFile);if(fs.existsSync(oldPath))fs.unlinkSync(oldPath);}
const hoaviViews=['S','E','N','W'],hoaviGrid=(tex,base,count,cols,cw,ch,ax,ay)=>Array.from({length:count},(_,i)=>{const idx=base+i;return{x:(idx%cols)*cw,y:Math.floor(idx/cols)*ch,w:cw,h:ch,anchorX:ax,anchorY:ay}});
const hoaviClips=[];
hoaviViews.forEach((v,vi)=>{
  hoaviClips.push({key:v+'/idle',texture:'HoaViLocomotion',fps:30,cells:hoaviGrid('HoaViLocomotion',vi*30,30,20,104,96,52,80)});
  hoaviClips.push({key:v+'/run',texture:'HoaViLocomotion',fps:36,cells:hoaviGrid('HoaViLocomotion',120+vi*30,30,20,104,96,52,80)});
  hoaviClips.push({key:v+'/dash',texture:'HoaViActions',fps:45,cells:hoaviGrid('HoaViActions',vi*45,45,30,112,100,56,82)});
  hoaviClips.push({key:v+'/hit',texture:'HoaViActions',fps:36,cells:hoaviGrid('HoaViActions',180+vi*45,45,30,112,100,56,82)});
  hoaviClips.push({key:v+'/attack',texture:'HoaViSkills',fps:40,cells:hoaviGrid('HoaViSkills',vi*60,60,30,112,100,56,82)});
  hoaviClips.push({key:v+'/q_debug',texture:'HoaViSkills',fps:40,cells:hoaviGrid('HoaViSkills',240+vi*60,60,30,112,100,56,82)});
  hoaviClips.push({key:v+'/e_cast',texture:'HoaViSkills',fps:40,cells:hoaviGrid('HoaViSkills',480+vi*30,30,30,112,100,56,82)});
  hoaviClips.push({key:v+'/e_blink',texture:'HoaViSkills',fps:40,cells:hoaviGrid('HoaViSkills',600+vi*30,30,30,112,100,56,82)});
  hoaviClips.push({key:v+'/r_overclock',texture:'HoaViUltR',fps:45,cells:hoaviGrid('HoaViUltR',0,300,20,160,120,80,96)});
});
hoaviClips.push({key:'interact_shrine',texture:'HoaViActions',fps:36,cells:hoaviGrid('HoaViActions',360,180,30,112,100,56,82)});
hoaviClips.push({key:'interact_relic',texture:'HoaViActions',fps:36,cells:hoaviGrid('HoaViActions',540,180,30,112,100,56,82)});
hoaviClips.push({key:'interact_terminal',texture:'HoaViActions',fps:36,cells:hoaviGrid('HoaViActions',720,180,30,112,100,56,82)});
hoaviClips.push({key:'ult_r',texture:'HoaViUltR',fps:45,cells:hoaviGrid('HoaViUltR',0,300,20,160,120,80,96)});
hoaviClips.push({key:'satellite_drone',texture:'HoaViVFX',fps:36,cells:Array.from({length:36},(_,i)=>({x:(i%24)*40,y:Math.floor(i/24)*40,w:40,h:40}))});
hoaviClips.push({key:'checkpoint_seal',texture:'HoaViVFX',fps:30,cells:Array.from({length:24},(_,i)=>({x:(i%12)*72,y:80+Math.floor(i/12)*72,w:72,h:72}))});
hoaviClips.push({key:'checkpoint_column',texture:'HoaViVFX',fps:40,cells:Array.from({length:24},(_,i)=>({x:i*40,y:224,w:40,h:88}))});
hoaviClips.push({key:'code_bolt',texture:'HoaViVFX',fps:36,cells:Array.from({length:16},(_,i)=>({x:i*36,y:320,w:36,h:20}))});
hoaviClips.push({key:'fault_mark',texture:'HoaViVFX',fps:30,cells:Array.from({length:16},(_,i)=>({x:i*28,y:344,w:28,h:28}))});
hoaviClips.push({key:'pixel_shield',texture:'HoaViVFX',fps:30,cells:Array.from({length:16},(_,i)=>({x:i*56,y:380,w:56,h:68}))});
hoaviClips.push({key:'satellite_beam',texture:'HoaViVFX',fps:16,cells:Array.from({length:4},(_,i)=>({x:480+i*32,y:456,w:32,h:16}))});
hoaviClips.push({key:'hit_glitch',texture:'HoaViVFX',fps:24,cells:Array.from({length:8},(_,i)=>({x:544+i*36,y:492,w:36,h:36}))});
fs.writeFileSync(path.join(art,'HoaViClips.json'),JSON.stringify({clips:hoaviClips}));

const full={console,localStorage:{getItem:()=>null,setItem:()=>{}}};full.globalThis=full;vm.createContext(full);
for(const f of ['world','content','engine','expansion','frontier','elemental','mythic-content','quynhkun','ait01','ascension','endless','journey','v09-content','world-destruction','shadow','relic-trials','v09'])vm.runInContext(fs.readFileSync(path.join(root,f+'.js'),'utf8'),full);
const V=full.DTV09Content,g=new full.DTGame('an',71426),w=g.world,pos=(x,y)=>'new V2('+float(x/64)+','+float(80-y/64)+')',arr=a=>'new string[]{'+a.map(quote).join(',')+'}';
const npcs=V.npc.map((n,i)=>'new StoryNpc{id='+quote(n.id)+',name='+quote(n.name)+',position='+pos(n.x,n.y)+',portrait='+i+',chapter='+(i<19?-1:i-19)+',lines='+arr(V.dialogues[n.id])+'}');
const quests=Object.entries(V.quests).map(([hero,q])=>'new HeroQuestDef{hero='+quote(hero)+',intro='+quote(V.stories[hero].intro)+',ending='+quote(V.stories[hero].ending+'\n\n'+q.ending)+',reward='+quote(q.reward)+',steps=new QuestStep[]{'+q.steps.map(s=>'new QuestStep{kind='+quote(s.kind)+',target='+quote(s.target||'')+',targets='+arr(s.targets||[])+',title='+quote(s.title)+',hint='+quote(s.hint||'')+',text='+quote(s.text||'')+'}').join(',')+'}}');
const memories=V.memories.map(m=>'new HeroMemory{id='+quote(m.id)+',hero='+quote(m.hero)+',name='+quote(m.name)+',text='+quote(m.text)+',element='+quote(m.element||'')+',position='+pos(m.x,m.y)+'}');
const chapters=full.DTWorld.endless.chapters.map(c=>'new SagaChapter{id='+quote(c.id)+',name='+quote(c.name)+',boss='+quote(c.boss)+',relic='+quote(c.relic)+',intro='+quote(c.intro)+',win='+quote(c.win)+',echoes='+arr(c.echoes)+',position='+pos(c.x,c.y)+'}');
// ponytail: Unity retains its guardian/element trials; port browser rituals with their own simulation update.
const unityPuzzles={chudong:'fire',aladdin:'lightning',cinderella:'earth',spirit:'lightning',chain:'lightning',cooling:'fire'},unityGuards={chudong:2,aegis:2,jack:2,power:2,haste:2,split:2,dom:3};
const pedestals=w.relicPedestals.map(p=>'new WorldRelic{relic='+quote(p.relic)+',position='+pos(p.x,p.y)+',puzzle='+quote(unityPuzzles[p.relic]||'')+',guardCount='+(unityGuards[p.relic]||0)+'}');
const paths=w.paths.map(p=>'new V2[]{'+p.map(([x,y])=>pos(x,y)).join(',')+'}');
const rpgSource='// Generated from shared 1.0.0 content; edit v09-content.js.\nnamespace DenTinh.Core { public static class RpgCatalog { public static readonly StoryNpc[] Npcs={'+npcs.join(',')+'};public static readonly HeroQuestDef[] Quests={'+quests.join(',')+'};public static readonly HeroMemory[] Memories={'+memories.join(',')+'};public static readonly SagaChapter[] Chapters={'+chapters.join(',')+'};public static WorldRelic[] Pedestals(){return new WorldRelic[]{'+pedestals.join(',')+'};}public static readonly V2[][] Paths={'+paths.join(',')+'};public const string TruthAwake='+quote(V.truthAwake)+';public const string TruthReturn='+quote(V.truthReturn)+';} }\n';
fs.writeFileSync(path.join(root,'Unity/Assets/Scripts/Core/RpgCatalog.cs'),rpgSource);
const npcAtlas=JSON.parse(fs.readFileSync(path.join(root,'assets/npcs-v091.json'),'utf8'));for(const[i,n]of V.npc.entries()){const c=npcAtlas.clips[n.id+'/idle']?.cells[0];if(!c||npcAtlas.width!==768||c.x!==i%2*384||c.y!==Math.floor(i/2)*64||c.w!==64||c.h!==64||c.anchorX!==32||c.anchorY!==58)throw new Error('Unity NPC atlas layout changed: '+n.id);}
fs.copyFileSync(path.join(root,'assets/relics-pixel-v09.png'),path.join(art,'Relics.png'));fs.copyFileSync(path.join(root,'assets/npcs-v091.png'),path.join(art,'Npcs.png'));
console.log('Exported 32 relics, 25 NPCs, six quest graphs and six saga chapters.');

const quynhClips=[];for(const[file,texture]of[['quynhkun-pixel-v1','QuynhKun'],['quynhkun-vfx-pixel','QuynhKunVFX']]){const meta=JSON.parse(fs.readFileSync(path.join(root,'assets',file+'.json'),'utf8'));fs.copyFileSync(path.join(root,'assets',file+'.png'),path.join(art,texture+'.png'));for(const[key,c]of Object.entries(meta.clips))quynhClips.push({key,texture,fps:c.fps,cells:c.cells})}fs.writeFileSync(path.join(art,'QuynhKunClips.json'),JSON.stringify({clips:quynhClips}));
const aitClips=[];for(const[file,texture]of[['ait01-pixel-v1','Ait01'],['ait01-vfx-pixel','Ait01VFX']]){const meta=JSON.parse(fs.readFileSync(path.join(root,'assets',file+'.json'),'utf8'));fs.copyFileSync(path.join(root,'assets',file+'.png'),path.join(art,texture+'.png'));for(const[key,c]of Object.entries(meta.clips))aitClips.push({key,texture,fps:c.fps,cells:c.cells})}fs.writeFileSync(path.join(art,'Ait01Clips.json'),JSON.stringify({clips:aitClips}));
