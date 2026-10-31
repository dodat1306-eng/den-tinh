using System;
using DenTinh.Core;
public static class CombatPlaythrough {
    static int ticks;
    static void Reward(Simulation g){while(g.PendingLevels>0)g.ApplyRelic(g.Player.hp<g.Player.maxHp*.5f?"vitality":"power",true);g.Events.Clear();}
    static bool Fight(Simulation g,V2 center,Func<bool> done,int cap){
        for(int i=0;i<cap;i++){
            if(done())return true;if(g.Dead){g.Respawn();g.Player.position=center+new V2(3.6f,.8f);}
            PlayerState p=g.Player;EnemyState target=null;float nearest=12;
            foreach(EnemyState e in g.Enemies)if(e.alive){float d=V2.Distance(e.position,p.position);if(d<nearest){nearest=d;target=e;}}
            V2 move=new V2(),aim=center;
            if(target!=null){aim=target.position;float d=V2.Distance(p.position,target.position);V2 away=(p.position-target.position).Unit;float retreat=d<3.2f?1:d>5.2f?-.65f:0;move=away*retreat+new V2(-away.y,away.x)*.55f;float from=V2.Distance(p.position,center);if(from>3.8f)move+=(center-p.position).Unit*1.4f;}
            foreach(Bullet b in g.Bullets)if(!b.friendly&&V2.Distance(b.position,p.position)<1.3f)move+=(p.position-b.position).Unit;
            foreach(Danger d in g.Dangers)if(V2.Distance(d.position,p.position)<d.radius+.65f)move+=(p.position-d.position).Unit*2;
            foreach(Prop prop in g.Props)if(prop.radius>0&&V2.Distance(prop.position,p.position)<prop.radius+.6f)move+=(p.position-prop.position).Unit*.8f;
            g.Input=new GameInput{move=move.Length>1?move.Unit:move,aim=aim,attack=target!=null};p.facing=Mathx.Angle(aim-p.position);
            if(target!=null){if(p.qTimer<=0)g.Skill("q");if(p.eTimer<=0&&V2.Distance(target.position,p.position)<5)g.Skill("e");if(p.ult>=100)g.Skill("r");if(V2.Distance(target.position,p.position)<2.4f&&p.dashTimer<=0)g.Dash();}
            if(p.hp<p.maxHp*.48f)g.Heal();g.Tick(1/60f);ticks++;Reward(g);
        }
        return done();
    }
    public static int Main(){foreach(HeroDef hero in CatalogData.Create().heroes){ticks=0;Simulation g=new Simulation(CatalogData.Create(),hero.id,71426);g.Tutorial=5;
            foreach(Shrine s in g.Shrines){g.Player.position=s.position+new V2(3.6f,.8f);bool clear;
                if(s.id=="truc")clear=Fight(g,s.position,()=>!g.Enemies.Exists(e=>e.alive&&s.enemies.Contains(e.id)),16000);
                else{clear=false;for(int attempt=0;attempt<5&&!clear;attempt++){g.Player.position=s.position+new V2(0,.6f);g.Interact();if(!s.started)g.Interact();bool ended=Fight(g,s.position,()=>s.complete||!s.started,16000);if(!ended)break;clear=s.complete;}}
                if(!clear){EnemyState stuck=g.Enemies.Find(e=>e.miniBoss);Console.WriteLine("FAIL "+hero.id+" challenge "+s.id+" player="+g.Player.position.x+","+g.Player.position.y+" hp="+g.Player.hp+" deaths="+g.Deaths+" miniboss="+(stuck==null?"none":stuck.hp+" at "+stuck.position.x+","+stuck.position.y));return 1;}
                g.Player.position=s.position+new V2(0,.6f);for(int tries=0;tries<10&&!s.active;tries++)g.Interact();if(!s.active){Console.WriteLine("FAIL "+hero.id+" shrine interaction "+s.id);return 1;}Reward(g);
            }
            g.Player.position=new V2(29,37.6f);for(int tries=0;tries<10&&!g.BossStarted;tries++)g.Interact();Reward(g);g.Player.position=new V2(32.5f,37.8f);
            if(!g.BossStarted||!Fight(g,new V2(29,37),()=>g.Victory,22000)){Console.WriteLine("FAIL "+hero.id+" boss");return 1;}
            Console.WriteLine("PASS hero="+hero.id+" seals=3 victory=true deaths="+g.Deaths+" level="+g.Player.level+" combatSeconds="+(ticks/60)+" kills="+g.Kills);
        }Console.WriteLine("4/4 C# combat campaigns passed. Combat only: relocation between arenas excludes travel time; normal attacks, skills, healing and respawn only.");return 0;}
}
