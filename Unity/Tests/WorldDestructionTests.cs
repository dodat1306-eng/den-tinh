using System;
using DenTinh.Core;
public static class WorldDestructionTests {
    static int checks;
    static void Check(bool pass,string name){if(!pass)throw new Exception(name);checks++;Console.WriteLine("PASS "+name);}
    static Simulation Fixture(){Simulation g=new Simulation(CatalogData.Create(),"an",71426);g.Props.Clear();g.Enemies.Clear();return g;}
    static Prop Tree(float x){return new Prop{type="tree",position=new V2(x,0),radius=.27f};}
    static void Tick(Simulation g,int count){for(int i=0;i<count;i++)g.Tick(.04f);}
    public static void Main(){
        Simulation g=Fixture();Prop p=Tree(0),near=Tree(1.3f),far=Tree(2.7f);g.Props.Add(p);g.Props.Add(near);g.Props.Add(far);g.HitProp(p,"fire");
        Check(p.damageStage==1&&p.status=="burning"&&p.burnTimer==2.5f,"fire enters 2.5-second burning");Check(g.Decals.Exists(d=>d.type=="scorch_mark"&&d.emberLife==4.5f),"fire leaves glowing scorch");Tick(g,22);Check(near.damageStage==0,"no early fire spread");Tick(g,1);Check(near.status=="burning"&&far.damageStage==0,"fire spreads after .9 seconds within 85 pixels");Tick(g,40);Check(p.damageStage==2&&p.status=="charred"&&p.radius>0,"charred trunk remains solid");Tick(g,75);Check(p.damageStage==3&&p.status=="ash_pile"&&p.radius==0&&g.Props.Contains(p),"ash persists without collision");g.RustleProp(p);Check(g.Effects.Exists(e=>e.kind=="world/ash_burst")&&g.Decals.Exists(d=>d.type=="ash_scatter"),"ash footsteps create dust and scatter");
        g=Fixture();p=Tree(0);g.Props.Add(p);g.ReactEnvironment("ice",p.position,1);Check(p.status=="frozen"&&p.frozenTimer==5,"ice freezes prop for five seconds");g.ReactEnvironment("fire",p.position,1);Check(p.status=="intact"&&!g.Decals.Exists(d=>d.type=="frost_patch")&&g.Effects.Exists(e=>e.kind=="world/steam_cloud"),"fire melts frost into steam");g.HitProp(p,"ice");EnemyState enemy=g.Spawn("slime",new V2(1,0),false);g.HitProp(p,"earth",30);Check(p.damageStage==3&&enemy.hp<enemy.maxHp&&g.Effects.Exists(e=>e.kind=="world/frozen_shatter"),"frozen shatter damages nearby enemy");
        g=Fixture();p=Tree(0);g.Props.Add(p);g.HitProp(p,"wind",45);Check(p.status=="sliced"&&p.damageStage==2,"wind slices trunk before collapse");Tick(g,16);Check(p.damageStage==3,"sliced trunk falls into remains");g.Paused=true;g.Decals.Clear();g.GroundTrace("scorch_mark",new V2(0,0),1);g.Tick(.04f);Check(g.Decals[0].age==0,"pause freezes decals");g.Paused=false;for(int i=0;i<600;i++)g.GroundTrace("scorch_mark",new V2(i,2),1);Check(g.Decals.Count==384,"decal memory cap");Tick(g,2251);Check(g.Decals.Count==0,"scorch expires after 90 seconds");
        g=new Simulation(CatalogData.Create(),"an",71426);int index=g.Props.FindIndex(o=>o.type=="tree");p=g.Props[index];g.HitProp(p,"fire");Simulation restored=Simulation.Restore(g.Content,g.Capture());Check(restored.Props[index].status=="burning"&&restored.Props[index].burnTimer==2.5f,"save restores core prop state");Check(restored.Decals.Exists(d=>d.type=="scorch_mark"),"save restores ground traces");Check(!g.HitProp(p,"physical",float.NaN),"reject non-finite damage");Console.WriteLine(checks+"/"+checks+" world destruction checks passed");
    }
}
