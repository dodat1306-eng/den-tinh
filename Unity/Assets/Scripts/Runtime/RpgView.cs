using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using DenTinh.Core;

namespace DenTinh.UnityRuntime {
    public sealed partial class DenTinhGame {
        string inspectedRelic="",inventoryTab="stats";Vector2 rpgScroll;
        IEnumerator Start(){
            if(!smoke)yield break;var errors=new List<string>();Application.LogCallback onLog=(message,trace,type)=>{if(type==LogType.Error||type==LogType.Exception||type==LogType.Assert)errors.Add(message);};Application.logMessageReceived+=onLog;
            yield return null;yield return null;int checkedViews=0;
            foreach(HeroDef h in content.PlayableHeroes){Game=new Simulation(content,h.id,71426);Game.Paused=true;screen="";view.transform.position=new Vector3(Game.Player.position.x,Game.Player.position.y,-20);Render();yield return null;checkedViews++;}
            foreach(string panel in new[]{"inventory","skills","journal","map","melody","relic"}){inspectedRelic="kimquy";Open(panel);yield return null;yield return null;checkedViews++;}
            screen="";Game.Paused=false;Game.Tutorial=5;Game.Tick(.02f);Save();RunSave saved=JsonUtility.FromJson<RunSave>(File.ReadAllText(SavePath));Game=Simulation.Restore(content,saved);if(Game.WorldRelics.Count!=20)errors.Add("World relic save mismatch");
            string[] args=Environment.GetCommandLineArgs();int reportArg=Array.IndexOf(args,"--smoke-report");string report=reportArg>=0&&reportArg+1<args.Length?args[reportArg+1]:Path.Combine(smokeFolder,"report.json");Directory.CreateDirectory(Path.GetDirectoryName(report));File.WriteAllText(report,"{\"version\":\""+Application.version+"\",\"renderedHeroesAndPanels\":"+checkedViews+",\"saveRoundTrip\":true,\"errors\":"+errors.Count+"}");foreach(string error in errors)Debug.LogError(error);Application.logMessageReceived-=onLog;Application.Quit(errors.Count==0?0:1);
        }
        static readonly string[] statNames={"Sức Mạnh","Nhanh Nhẹn","Thể Lực","Trí Tuệ","Tinh Thần","Chuẩn Xác","Bạo Kích","Kiên Cường","Hút Huyết","Thống Lĩnh","Uy Áp","Khí Vận"};
        static readonly string[] statHelp={"Đòn thường +3,5%; đẩy lùi +5%; kháng đẩy +4%.","Tốc đánh +3,2%; chạy +4,5 px/s; hồi lướt −2,5%.","Máu +32; hồi máu +0,7/s.","Kỹ năng +4,2%; linh lực +20.","Hồi chiêu −2,5%; hồi linh lực +1,4/s; hồi phục +4%.","Chí mạng +2,5%; tốc đạn +4%; xuyên giáp +3%.","Sát thương chí mạng +0,07; sát thương boss/tinh anh +3,5%.","Giáp +2,2%; chặn 4 sát thương; phản đòn +15%; giảm bất lợi.","Hút máu toàn phần +1,2%; hạ địch hồi 3 máu.","Triệu hồi: sát thương +5,5%; máu/tốc +6%; thời gian +4%.","Tầm/diện rộng +3,5%; tăng tầm hút vật phẩm.","Xu +6%; tăng xác suất hiệu ứng và vật phẩm."};
        void Art(Rect rect,Sprite s){if(s==null)return;Rect t=s.textureRect;GUI.DrawTextureWithTexCoords(rect,s.texture,new Rect(t.x/s.texture.width,t.y/s.texture.height,t.width/s.texture.width,t.height/s.texture.height));}
        void DrawRpgWorld(){
            foreach(StoryNpc n in RpgCatalog.Npcs)if(InView(n.position)){
                Show("npc-"+n.id,PixelArt.Npc(n.portrait),n.position,1,Color.white,Order(n.position));
                if(Game.CurrentQuest!=null&&Game.CurrentQuest.target==n.id)Show("quest-"+n.id,PixelArt.World("flame",Game.Time,settings.reducedMotion),n.position+new V2(0,1.6f),.5f,Color.white,Order(n.position)+2);
            }
            foreach(WorldRelic r in Game.WorldRelics)if(!r.claimed&&InView(r.position)){
                string id="relic-"+r.relic;Color c=PixelArt.ColorOf(r.drop?"#ffe5a2":"#a9e3cb");
                if(!r.drop)Show(id+"-base",PixelArt.Item("shrine"),r.position,.7f,new Color(.53f,.65f,.66f,1),Order(r.position)-1);
                Show(id,PixelArt.Relic(content.Relic(r.relic).atlas),r.position+new V2(0,.55f+r.z+(settings.reducedMotion?0:Mathf.Sin(Game.Time*2.5f)*.07f)),1,Color.white,Order(r.position)+2);
                Ring(id+"-rune",r.position,.48f,new Color(c.r,c.g,c.b,.8f));Show(id+"-light",PixelArt.Glow(),r.position+new V2(0,.7f),1.9f,new Color(c.r,c.g,c.b,.22f),Order(r.position)+1);
                if(r.drop){SpriteRenderer beam=Show(id+"-beam",PixelArt.Glow(),r.position+new V2(0,1),1,new Color(c.r,c.g,c.b,.2f),Order(r.position)+1);beam.transform.localScale=new Vector3(.7f,3,1);}
                if(!r.drop&&!r.unlocked&&!string.IsNullOrEmpty(r.puzzle)){Show(id+"-lock",PixelArt.Vfx("crest_"+r.puzzle,Game.Time,settings.reducedMotion),r.position+new V2(0,.9f),.65f,Color.white,Order(r.position)+3);Show(id+"-tool",PixelArt.Vfx("held_"+(r.puzzle=="fire"?"fire_chakrams":r.puzzle=="earth"?"earth_gauntlets":"lightning_sword"),Game.Time,settings.reducedMotion),r.position+new V2(66/64f,-45/64f),.65f,Color.white,Order(r.position)+2);}
            }
            foreach(HeroMemory m in RpgCatalog.Memories)if(m.hero==Game.Hero.id&&!Game.Rpg.memories.Contains(m.id)&&InView(m.position)){Show("memory-"+m.id,PixelArt.Item("core"),m.position,.6f,PixelArt.ColorOf("#e8d2a1"),Order(m.position));Ring("memory-ring-"+m.id,m.position,.5f,PixelArt.ColorOf("#e8d2a1"));}
            foreach(SagaChapter c in RpgCatalog.Chapters)if(InView(c.position)){Show("chapter-"+c.id,PixelArt.Item("shrine"),c.position,1.4f,Color.white,Order(c.position));Ring("chapter-ring-"+c.id,c.position,1.3f,PixelArt.ColorOf("#94d6cd"));}
            if(InView(Simulation.Gate)){Show("saga-gate",PixelArt.Item("shrine"),Simulation.Gate,1.4f,Color.white,Order(Simulation.Gate));Ring("saga-gate-ring",Simulation.Gate,1,PixelArt.ColorOf("#c8a6f3"));}
            for(int i=0;i<Game.Rpg.allies.Count;i++){RelicAlly a=Game.Rpg.allies[i];if(InView(a.position))Show("monkey-"+i,PixelArt.Actor("shade","walk",Game.Time,settings.reducedMotion),a.position,.8f,PixelArt.ColorOf("#ffd288"),Order(a.position));}
            for(int i=0;i<Game.RelicFields.Count;i++){RelicField f=Game.RelicFields[i];if(!InView(f.position))continue;Ring("relic-field-"+i,f.position,f.radius,PixelArt.ColorOf(f.kind=="water"?"#8cd6eb":f.kind=="phoenix"?"#ffb85b":"#eed498"));if(f.kind=="decoy")Show("decoy-"+i,PixelArt.Relic(content.Relic("tam").atlas),f.position,2,Color.white,Order(f.position));if(f.kind=="thread"){LineRenderer line=lines["relic-field-"+i];line.positionCount=2;line.SetPosition(0,new Vector3(f.position.x,f.position.y,0));line.SetPosition(1,new Vector3(f.end.x,f.end.y,0));}}
        }
        bool RpgModal(){
            if(screen!="inventory"&&screen!="skills"&&screen!="journal"&&screen!="relic"&&screen!="melody"&&screen!="map")return false;
            Panel(new Rect(0,0,1600,900),new Color(.01f,.03f,.05f,.8f));Panel(new Rect(160,60,1280,780));
            GUI.Label(new Rect(195,83,1000,65),screen=="inventory"?Game.Hero.name+" · Nhân vật I":screen=="skills"?"Kỹ năng K":screen=="journal"?"Nhật ký J":screen=="map"?"Miền Sương Lạc · Chín vùng đất":screen=="melody"?"Tám Nhịp Trúc":"Cổ vật đã tìm thấy",title);
            if(Button(new Rect(1260,85,140,55),"Đóng")){Resume();return true;}
            return DrawRpgPanel();
        }
        bool DrawRpgPanel(){
            if(Event.current.type==EventType.Used)return true;
            if(screen=="inventory"){
                if(Button(new Rect(195,155,280,48),"12 chỉ số · "+Game.Player.statPoints+" điểm"))inventoryTab="stats";if(Button(new Rect(490,155,280,48),"Cổ vật · "+Game.Player.relics.Count+" / 32"))inventoryTab="relics";
                if(inventoryTab=="stats"){
                    PlayerState p=Game.Player;Label(new Rect(195,218,1200,65),"Máu "+Mathf.CeilToInt(p.hp)+" / "+p.maxHp+" · MP "+(int)p.mp+" / "+p.maxMp+" · Giáp "+(p.armor*100).ToString("F1")+"% · Chí mạng "+(p.crit*100).ToString("F1")+"%\nĐòn thường "+(100+p.str*3.5f).ToString("F1")+"% · Kỹ năng "+(100+p.intel*4.2f).ToString("F1")+"% · Tốc đánh "+(Game.AttackSpeed*100).ToString("F1")+"% · Hồi chiêu −"+(Game.CooldownReduction*100).ToString("F1")+"%",true);
                    rpgScroll=GUI.BeginScrollView(new Rect(195,295,1210,405),rpgScroll,new Rect(0,0,1170,610));
                    for(int i=0;i<12;i++){float x=(i%3)*390,y=(i/3)*150;Panel(new Rect(x,y,375,140),new Color(.08f,.18f,.21f,1));Label(new Rect(x+14,y+10,260,30),statNames[i]+" · "+Game.Stat(Simulation.StatKeys[i]));Label(new Rect(x+14,y+48,275,85),statHelp[i],true);GUI.enabled=p.statPoints>0;if(Button(new Rect(x+305,y+45,55,55),"+"))Game.AllocateStat(Simulation.StatKeys[i]);GUI.enabled=true;}GUI.EndScrollView();
                    GUI.enabled=Game.CanReset&&p.gold>=80;if(Button(new Rect(195,725,500,60),"Tẩy điểm · 80 xu · về làng / thợ rèn"))Game.ResetStats();GUI.enabled=true;Label(new Rect(735,733,660,50),"Cấp "+p.level+" · EXP "+(int)p.xp+" / "+p.nextXp,true);
                }else{
                    rpgScroll=GUI.BeginScrollView(new Rect(195,220,1210,550),rpgScroll,new Rect(0,0,1170,1050));for(int i=0;i<content.relics.Length;i++){RelicDef r=content.relics[i];float x=i%4*292,y=i/4*130;bool owned=Game.Player.Has(r.id);if(Button(new Rect(x,y,280,118),"")){inspectedRelic=r.id;Open("relic");}Art(new Rect(x+8,y+18,64,64),PixelArt.Relic(r.atlas));Label(new Rect(x+80,y+15,200,60),r.name,true);Label(new Rect(x+80,y+75,200,35),owned?"Đã thu thập":r.source=="boss"?r.boss:"Bệ cổ vật",true);}GUI.EndScrollView();
                }return true;
            }
            if(screen=="skills"){
                Label(new Rect(195,165,1100,45),"Điểm kỹ năng: "+Game.Player.skillPoints+" · Mỗi cấp +1 · Mỗi chiêu tối đa bậc 3");string[] ids={"q","e","r","passive"},names={Game.Hero.q,Game.Hero.e,Game.Hero.r,"Nội tại"};int[] ranks={Game.Player.qRank,Game.Player.eRank,Game.Player.rRank,Game.Player.passiveRank};for(int i=0;i<4;i++){float x=195+i*300;Panel(new Rect(x,240,280,360));Label(new Rect(x+20,260,240,120),ids[i].ToUpper()+" · "+names[i]+"\nBậc "+ranks[i]+" / 3");Label(new Rect(x+20,395,240,80),i==0?"Tăng sức mạnh kỹ năng Q.":i==1?"Tăng hiệu lực và thời gian kỹ năng E.":i==2?"Cường hóa tuyệt kỹ R.":"Cường hóa nội tại riêng của nhân vật.",true);GUI.enabled=Game.Player.skillPoints>0&&ranks[i]<3;if(Button(new Rect(x+20,510,240,65),"Học · 1 điểm"))Game.LearnSkill(ids[i]);GUI.enabled=true;}return true;
            }
            if(screen=="journal"){
                rpgScroll=GUI.BeginScrollView(new Rect(195,165,1210,615),rpgScroll,new Rect(0,0,1160,1150));Label(new Rect(0,0,1140,95),Game.Objective());float y=115;for(int i=0;i<Game.HeroQuest.steps.Length;i++){QuestStep s=Game.HeroQuest.steps[i];Label(new Rect(0,y,1140,70),(i<Game.Rpg.questStage?"Đã xong · ":i==Game.Rpg.questStage?"Đang làm · ":"Chờ mở · ")+s.title+"\n"+s.hint,true);y+=78;}Label(new Rect(0,y,1140,180),Game.Rpg.questComplete?Game.HeroQuest.ending:Game.HeroQuest.intro);y+=190;Label(new Rect(0,y,1140,55),"Sự thật tầng "+Game.TruthStage+" / 4 · Chương "+Math.Min(6,Game.Rpg.chapter+1)+" / 6 · NPC đã gặp "+Game.Rpg.met.Count+" / 25");if(Game.Rpg.returnedMemories)Label(new Rect(0,y+70,1140,180),RpgCatalog.TruthReturn,true);GUI.EndScrollView();return true;
            }
            if(screen=="relic"){
                RelicDef r=content.Relic(inspectedRelic);if(r==null)return true;Art(new Rect(220,190,192,192),PixelArt.Relic(r.atlas));Label(new Rect(465,175,900,55),r.name);Label(new Rect(465,245,900,125),r.desc);Label(new Rect(465,385,900,50),r.source=="boss"?"Thủ lĩnh · "+r.boss:"Cổ vật trên bệ · "+r.origin,true);Label(new Rect(220,465,1160,250),r.lore);if(Button(new Rect(220,730,1150,55),"Mang ngọn đèn lên đường"))Resume();return true;
            }
            if(screen=="melody"){
                Label(new Rect(220,190,1140,120),"Khúc Tám Nhịp Trúc: 1 · 3 · 2 · 5 · 4 · 6 · 5 · 8\nNhịp đúng: "+Game.Rpg.notes+" / 8. Nhịp sai bắt đầu lại.");for(int i=1;i<=8;i++)if(Button(new Rect(220+(i-1)*145,365,130,130),i.ToString())){Game.PlayMemoryNote(i);Sfx("pickup");if(Game.Rpg.notes==8){Resume();ProcessEvents();}}return true;
            }
            Rect map=new Rect(220,180,1140,520);Panel(map,new Color(.05f,.16f,.18f,1));foreach(StoryNpc n in RpgCatalog.Npcs){V2 p=n.position;Label(new Rect(map.x+p.x/Simulation.Width*map.width,map.y+(1-p.y/Simulation.Height)*map.height,160,35),n.name,true);}foreach(WorldRelic r in Game.WorldRelics)if(!r.claimed)Art(new Rect(map.x+r.position.x/Simulation.Width*map.width,map.y+(1-r.position.y/Simulation.Height)*map.height,20,20),PixelArt.Relic(content.Relic(r.relic).atlas));V2 at=Game.Player.position;Label(new Rect(map.x+at.x/Simulation.Width*map.width,map.y+(1-at.y/Simulation.Height)*map.height,100,35),"● Bạn");Label(new Rect(220,730,1140,55),"F tại cổng chân trời sau khi trả ký ức Cội Đa. J xem nhiệm vụ cá nhân.",true);return true;
        }
    }
}
