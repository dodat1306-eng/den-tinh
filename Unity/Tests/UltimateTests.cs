using System;
using DenTinh.Core;
public static class UltimateTests {
    static int checks;
    static void Check(bool ok,string name){if(!ok)throw new Exception(name);checks++;Console.WriteLine("PASS "+name);}
    static bool Near(float a,float b){return Math.Abs(a-b)<.003f;}
    static Simulation Arena(string hero="hoavi"){Simulation g=new Simulation(CatalogData.Create(),hero,71426);g.Enemies.Clear();g.Props.Clear();g.Drops.Clear();g.Player.position=new V2(25,20);g.Player.crit=0;g.Tutorial=5;g.Input=new GameInput{aim=new V2(28,20)};return g;}
    static void Tick(Simulation g,int frames){for(int n=0;n<frames;n++)g.Tick(.02f);}
    static EnemyState Enemy(Simulation g,float x){EnemyState e=g.Spawn("slime",new V2(x,20),false);e.hp=e.maxHp=100000;e.speed=1;e.damage=0;e.cooldown=10;return e;}
    public static int Main(){try{
        foreach(HeroDef h in CatalogData.Create().PlayableHeroes){
            Simulation g=Arena(h.id);g.Player.ult=0;float cooldown=h.id=="thienvu"||h.id=="quanle"?20:18;
            Check(g.Player.rCd==0&&g.Skill("r")&&g.Player.rCd==cooldown,h.id+" R ready without rage");
            Check(!g.Skill("r")&&!g.Skill("q")&&!g.Skill("e")&&!g.Fire()&&!g.Dash(),h.id+" intro blocks other attacks");
            float hp=g.Player.hp;g.DamagePlayer(100000);Check(g.Player.hp==hp,h.id+" intro immunity");
            Tick(g,224);Check(g.Player.ultIntro!=null&&g.ShadowArmy.Count==0&&g.Clones.Count==0&&g.Player.overclock==0,h.id+" no release before 4.5s");
            g.Paused=true;float elapsed=g.Player.ultIntro.elapsed,cd=g.Player.rCd;Tick(g,20);Check(g.Player.ultIntro.elapsed==elapsed&&g.Player.rCd==cd,h.id+" pause freezes intro and cooldown");g.Paused=false;
            Tick(g,1);Check(g.Player.ultIntro==null&&Near(g.Player.rCd,cooldown-4.5f),h.id+" release at 4.5s");
            if(h.id=="quanle")Check(g.ShadowArmy.Count==14&&Near(g.ShadowFrenzy,24),"Legion appears at release");
            if(h.id=="thienvu")Check(g.Clones.Count==6,"Six autonomous clones appear at release");
            if(h.id=="hoavi")Check(g.Player.overclock==7,"Overclock starts at release");
            Check(!g.Skill("r"),h.id+" cooldown prevents second release");
        }
        Simulation saved=Arena("quanle");saved.Skill("r");Tick(saved,100);V2 target=saved.Player.ultIntro.target;Simulation restored=Simulation.Restore(CatalogData.Create(),saved.Capture());restored.Props.Clear();
        Check(Near(restored.Player.ultIntro.elapsed,2)&&V2.Distance(restored.Player.ultIntro.target,target)<.001f,"Save preserves intro and target");Tick(restored,124);Check(restored.ShadowArmy.Count==0,"Restored intro does not release early");Tick(restored,1);Check(restored.ShadowArmy.Count==14&&restored.Player.ultIntro==null,"Restored intro releases once");string first=restored.ShadowArmy[0].id;Tick(restored,5);Check(restored.ShadowArmy.Count==14&&restored.ShadowArmy[0].id==first,"No duplicated restored army");
        Simulation normal=Arena(),intro=Arena();normal.Input=intro.Input=new GameInput{move=new V2(1,0),aim=new V2(28,20)};intro.Skill("r");Tick(normal,20);Tick(intro,20);Check(Near((intro.Player.position.x-25)/(normal.Player.position.x-25),.35f),"Intro movement is 35 percent");
        normal=Arena();intro=Arena();EnemyState n=Enemy(normal,29),i=Enemy(intro,29),far=Enemy(intro,35);intro.Skill("r");Tick(normal,20);Tick(intro,20);Check(Near((29-i.position.x)/(29-n.position.x),.25f)&&Near(i.cooldown,9.9f)&&Near(far.cooldown,9.6f),"520px aura slows nearby movement and attacks by 75 percent");
        Simulation rank=Arena();rank.Player.rRank=3;rank.ApplyRelic("cooling",false);Check(rank.Skill("r")&&Near(rank.Player.rCd,18*.82f*.8f),"Rank and relic reduce R cooldown");RunSave bad=rank.Capture();bad.player.rRank=999;bad.player.rCd=float.NaN;bad.player.ultIntro.elapsed=float.NaN;Simulation clean=Simulation.Restore(CatalogData.Create(),bad);Check(clean.Player.rRank==3&&clean.Player.rCd==0&&clean.Player.ult==100&&clean.Player.ultIntro==null,"Malformed ultimate save is bounded");
        Console.WriteLine(checks+" ultimate checks passed");return 0;
    }catch(Exception e){Console.WriteLine("FAIL "+e);return 1;}}
}
