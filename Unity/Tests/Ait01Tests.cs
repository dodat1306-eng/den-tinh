using System;
using DenTinh.Core;
public static class Ait01Tests {
    static int checks;
    static void Check(bool ok,string message){if(!ok)throw new Exception(message);checks++;Console.WriteLine("PASS "+message);}
    static bool Near(float a,float b){return Math.Abs(a-b)<.01f;}
    static Simulation Arena(){Simulation g=new Simulation(CatalogData.Create(),"ait01",71426);g.Enemies.Clear();g.Props.Clear();g.Drops.Clear();g.Player.position=new V2(30,30);g.Player.crit=0;g.Input=new GameInput{aim=new V2(33,30)};g.Tutorial=5;return g;}
    static EnemyState Enemy(Simulation g,float x=32){EnemyState e=g.Spawn("slime",new V2(x,30),false);e.hp=e.maxHp=100000;e.speed=0;e.damage=0;e.cooldown=100;return e;}
    static void Tick(Simulation g,int frames){for(int i=0;i<frames;i++)g.Tick(.02f);}
    public static int Main(){try {
        Simulation g=Arena();Check(g.Hero.hp==118&&g.Hero.speed==238&&g.Hero.damage==15&&g.Hero.rCd==19&&g.Weapon.id=="inventory-matrix","Exact base stats and signature");
        for(int i=0;i<3;i++){g.Player.fireTimer=0;Check(g.Fire(),"Normal attack "+i);}Bullet blast=g.Bullets.Find(b=>b.kind=="shotgun_blast");Check(blast!=null&&blast.aitLocks==2&&blast.pierce==1&&Near(blast.damage,20.25f),"Third attack adds piercing shotgun blast");
        g=Arena();EnemyState e=Enemy(g);g.Player.mp=0;g.AitLock(e,4);Check(e.hp==e.maxHp,"Four locks do not explode");g.AitLock(e);Check(e.hp<e.maxHp&&e.targetLocks==0&&g.Ait.ammo==1&&g.Player.mp==5&&g.Player.shield==8&&e.stunned==.5f&&e.burn>0,"Five locks explode RPG, burn, stun and recover MP/shield/ammo");
        e.type="boss";g.AitLock(e,5);Check(e.weakened==1.5f&&e.talismanSlowFactor==.75f,"Boss is weakened and slowed instead of stun");
        g=Arena();g.Player.passiveRank=3;g.Player.shield=200;e=Enemy(g);for(int i=0;i<20;i++)g.AitLock(e,5);g.Enemies.Clear();for(int i=0;i<120;i++){e=Enemy(g,32+i%10*.01f);e.targetLocks=4;e.targetLockTime=6;}g.AitLock(g.Enemies[0]);Check(g.Ait.ammo==6&&Near(g.Ait.ammoShield,65)&&Near(g.Player.shield,265)&&g.Enemies.TrueForAll(t=>t.targetLocks<5),"Dense chain terminates; passive shield cap preserves external shields");
        g=Arena();g.Ait.ammo=6;g.Player.eTimer=6;Check(g.Skill("q")&&g.Player.mp==76&&Near(g.Player.eTimer,4.5f)&&g.Ait.ammo==0,"Empowered Q consumes six ammo charges and reduces E cooldown");
        Simulation restored=Simulation.Restore(g.Content,g.Capture());restored.Props.Clear();Tick(restored,8);Check(restored.Bullets.FindAll(b=>b.kind=="rocket_missile").Count==3,"Pending empowered Q survives save and fires three rockets");
        e=Enemy(restored);g=restored;g.AitLock(e,3,true);Check(e.targetLocks==0&&e.hp<e.maxHp,"Empowered Q can detonate three target locks early");
        g=Arena();g.Ait.ammo=6;Check(g.Skill("e")&&g.Player.mp==70,"E costs 30 MP");Tick(g,16);Check(g.Ait.fields.Count==2&&g.Ait.fields[0].position.y!=g.Ait.fields[1].position.y,"Empowered E deploys two separate tactical inventory zones");
        g.Player.mp=0;float cd=g.Player.eTimer;Check(g.Skill("e")&&g.Player.mp==0&&g.Player.eTimer==cd&&g.Ait.fields.Count==0&&g.Ait.overdrive==4.5f,"E recast is free, preserves cooldown, recalls zones and grants overdrive");e=Enemy(g);Tick(g,2);Check(g.Bullets.Exists(b=>b.damageClass=="summon"&&b.aitLocks==1),"Overdrive automatically shoots summon rifle rounds");
        g=Arena();g.Player.dom=10;g.Player.aura=10;g.Player.eRank=3;Check(g.ChooseAitSpecialization("e","lasting"),"Rank three unlocks E specialization");g.Skill("e");Tick(g,8);Check(g.Ait.fields[0].life>17&&Near(g.Ait.fields[0].radius,145/64f*1.35f),"DOM, AURA and lasting scale zone duration/radius");
        g=Arena();Check(g.Skill("r")&&g.Player.rCd==19,"R starts with 19-second cooldown");g.DamagePlayer(100000);Check(g.Player.hp==118&&!g.Skill("q")&&!g.Fire(),"R intro grants immunity and blocks attacks");Tick(g,100);restored=Simulation.Restore(g.Content,g.Capture());restored.Props.Clear();Tick(restored,124);Check(restored.Ait.fields.Count==0,"Saved R does not release early");Tick(restored,2);Check(restored.Player.ultIntro==null&&restored.Ait.fields.FindAll(f=>f.kind=="airdrop-zone").Count==1,"Saved R releases exactly once at 4.5 seconds");
        RunSave save=restored.Capture();save.ait01.fields.Add(null);save.ait01.ammo=100;save.ait01.overdrive=float.NaN;save.ait01.pending=new ActorAction{key="q",target=new V2(float.NaN,0)};restored=Simulation.Restore(restored.Content,save);Check(restored.Ait.ammo==6&&restored.Ait.overdrive==0&&restored.Ait.pending==null,"Malformed AIT-01 save is bounded");
        g=Arena();g.Player.statPoints=30;foreach(string stat in Simulation.StatKeys)Check(g.AllocateStat(stat),"Stat "+stat);foreach(RelicDef r in g.Content.relics)g.Player.relics.Add(r.id);g.RecomputeStats();e=Enemy(g);g.Fire();Tick(g,60);Check(!float.IsNaN(g.Player.hp)&&e.hp<e.maxHp,"All 32 relics remain usable");
        Check(g.HeroQuest.steps.Length==6&&g.HeroQuest.steps[5].target=="automaton_07","Six-step quest ends with automaton_07");
        foreach(string id in new[]{"an","linh","quanle","hoavi","thienvu","quynhkun"}){Simulation old=new Simulation(g.Content,id,71426);RunSave legacy=old.Capture();legacy.ait01=null;Check(Simulation.Restore(g.Content,legacy).Hero.id==id,"Legacy save "+id);}
        Console.WriteLine(checks+" AIT-01 checks passed");return 0;
    }catch(Exception ex){Console.Error.WriteLine(ex);return 1;}}
}
