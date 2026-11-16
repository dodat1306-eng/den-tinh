using System;
using DenTinh.Core;
public static class QuynhKunTests {
    static int checks;
    static void Check(bool ok,string message){if(!ok)throw new Exception(message);checks++;Console.WriteLine("PASS "+message);}
    static bool Near(float a,float b){return Math.Abs(a-b)<.01f;}
    static Simulation Arena(){Simulation g=new Simulation(CatalogData.Create(),"quynhkun",71426);g.Enemies.Clear();g.Props.Clear();g.Drops.Clear();g.Player.position=new V2(30,30);g.Player.crit=0;g.Input=new GameInput{aim=new V2(33,30)};g.Tutorial=5;return g;}
    static EnemyState Enemy(Simulation g,float x=32){EnemyState e=g.Spawn("slime",new V2(x,30),false);e.hp=e.maxHp=100000;e.speed=0;e.damage=0;e.cooldown=100;return e;}
    static void Tick(Simulation g,int frames){for(int i=0;i<frames;i++)g.Tick(.02f);}
    public static int Main(){try {
        Simulation g=Arena();Check(g.Hero.hp==115&&g.Hero.speed==240&&g.Hero.damage==17&&g.Hero.rCd==19&&g.Weapon.id=="cinnabar-brush","Exact base stats and signature");
        for(int i=0;i<3;i++){g.Player.fireTimer=0;Check(g.Fire(),"Normal attack "+i);}Bullet slash=g.Bullets.Find(b=>b.kind=="cinnabar_slash");Check(slash!=null&&slash.quynhMarks==2&&slash.pierce==1&&Near(slash.damage,22.95f),"Third attack adds piercing two-mark slash");
        g=Arena();EnemyState e=Enemy(g);g.Player.mp=0;g.QuynhMark(e,4);Check(e.hp==e.maxHp,"Four marks do not explode");g.QuynhMark(e);Check(e.hp<e.maxHp&&e.talismanMarks==0&&g.Quynh.coins==1&&g.Player.mp==5&&g.Player.shield==8&&e.stunned==.5f,"Five marks explode, stun and recover MP/shield/coin");
        e.type="boss";g.QuynhMark(e,5);Check(e.weakened==1.5f&&e.talismanSlowFactor==.75f,"Boss is weakened and slowed instead of stun");
        g=Arena();g.Player.passiveRank=3;g.Player.shield=200;e=Enemy(g);for(int i=0;i<20;i++)g.QuynhMark(e,5);g.Enemies.Clear();for(int i=0;i<120;i++){e=Enemy(g,32+i%10*.01f);e.talismanMarks=4;e.talismanTime=6;}g.QuynhMark(g.Enemies[0]);Check(g.Quynh.coins==6&&Near(g.Quynh.coinShield,65)&&Near(g.Player.shield,265)&&g.Enemies.TrueForAll(t=>t.talismanMarks<5),"Dense chain terminates; passive shield cap preserves external shields");
        g=Arena();g.Player.passiveRank=3;g.Player.spi=10;g.Player.shield=200;for(int i=0;i<20;i++){e=Enemy(g,32+i*.01f);e.talismanMarks=4;e.talismanTime=6;}g.Quynh.fields.Add(new QuynhField{kind="bagua-stake",position=new V2(32,30),radius=3,life=7,power=1,tick=0});g.Tick(.02f);Check(Near(g.Quynh.coinShield,65)&&Near(g.Player.shield,265),"SPI applies once inside frame recovery and preserves passive cap");
        g=Arena();g.Quynh.coins=6;g.Player.eTimer=6;Check(g.Skill("q")&&g.Player.mp==76&&Near(g.Player.eTimer,4.5f)&&g.Quynh.coins==0,"Empowered Q consumes six coins and reduces E cooldown");
        Simulation restored=Simulation.Restore(g.Content,g.Capture());restored.Props.Clear();Tick(restored,8);Check(restored.Bullets.FindAll(b=>b.kind=="grand_talisman").Count==3,"Pending empowered Q survives save and fires three talismans");
        e=Enemy(restored);g=restored;g.QuynhMark(e,3,true);Check(e.talismanMarks==0&&e.hp<e.maxHp,"Empowered Q can detonate three marks early");
        g=Arena();g.Quynh.coins=6;Check(g.Skill("e")&&g.Player.mp==70,"E costs 30 MP");Tick(g,16);Check(g.Quynh.fields.Count==2&&g.Quynh.fields[0].position.y!=g.Quynh.fields[1].position.y,"Empowered E places two separate stakes");
        g.Player.mp=0;float cd=g.Player.eTimer;Check(g.Skill("e")&&g.Player.mp==0&&g.Player.eTimer==cd&&g.Quynh.fields.Count==0&&g.Quynh.ward==4.5f,"E recast is free, preserves cooldown, removes stakes and grants ward");e=Enemy(g);Tick(g,2);Check(g.Bullets.Exists(b=>b.damageClass=="summon"&&b.quynhMarks==1),"Ward automatically shoots summon talismans");
        g=Arena();g.Player.dom=10;g.Player.aura=10;g.Player.eRank=3;Check(g.ChooseQuynhSpecialization("e","lasting"),"Rank three unlocks E specialization");g.Skill("e");Tick(g,8);Check(g.Quynh.fields[0].life>17&&Near(g.Quynh.fields[0].radius,145/64f*1.35f),"DOM, AURA and lasting scale stake duration/radius");
        g=Arena();Check(g.Skill("r")&&g.Player.rCd==19,"R starts with 19-second cooldown");g.DamagePlayer(100000);Check(g.Player.hp==115&&!g.Skill("q")&&!g.Fire(),"R intro grants immunity and blocks attacks");Tick(g,100);restored=Simulation.Restore(g.Content,g.Capture());restored.Props.Clear();Tick(restored,124);Check(restored.Quynh.fields.Count==0,"Saved R does not release early");Tick(restored,2);Check(restored.Player.ultIntro==null&&restored.Quynh.fields.FindAll(f=>f.kind=="heaven-seal").Count==1,"Saved R releases exactly once at 4.5 seconds");
        RunSave save=restored.Capture();save.quynh.fields.Add(null);save.quynh.coins=100;save.quynh.ward=float.NaN;save.quynh.pending=new ActorAction{key="q",target=new V2(float.NaN,0)};restored=Simulation.Restore(restored.Content,save);Check(restored.Quynh.coins==6&&restored.Quynh.ward==0&&restored.Quynh.pending==null,"Malformed Quynh save is bounded");
        g=Arena();g.Player.statPoints=30;foreach(string stat in Simulation.StatKeys)Check(g.AllocateStat(stat),"Stat "+stat);foreach(RelicDef r in g.Content.relics)g.Player.relics.Add(r.id);g.RecomputeStats();e=Enemy(g);g.Fire();Tick(g,60);Check(!float.IsNaN(g.Player.hp)&&e.hp<e.maxHp,"All 32 relics remain usable");
        Check(g.HeroQuest.steps.Length==7&&g.HeroQuest.steps[6].target=="temple_keeper","Seven-step quest ends with temple keeper");
        foreach(string id in new[]{"an","linh","quanle","hoavi","thienvu"}){Simulation old=new Simulation(g.Content,id,71426);RunSave legacy=old.Capture();legacy.quynh=null;Check(Simulation.Restore(g.Content,legacy).Hero.id==id,"Legacy save "+id);}
        Console.WriteLine(checks+" Quynh Kun checks passed");return 0;
    }catch(Exception ex){Console.Error.WriteLine(ex);return 1;}}
}
