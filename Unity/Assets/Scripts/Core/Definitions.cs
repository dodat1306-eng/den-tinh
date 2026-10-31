using System;
using System.Collections.Generic;

namespace DenTinh.Core {
    [Serializable] public struct V2 {
        public float x,y;
        public V2(float x,float y){this.x=x;this.y=y;}
        public float Length {get{return (float)Math.Sqrt(x*x+y*y);}}
        public V2 Unit {get{float n=Length;return n>.0001f?this/n:new V2();}}
        public static V2 operator +(V2 a,V2 b){return new V2(a.x+b.x,a.y+b.y);}
        public static V2 operator -(V2 a,V2 b){return new V2(a.x-b.x,a.y-b.y);}
        public static V2 operator *(V2 a,float b){return new V2(a.x*b,a.y*b);}
        public static V2 operator /(V2 a,float b){return new V2(a.x/b,a.y/b);}
        public static float Distance(V2 a,V2 b){return (a-b).Length;}
        public static V2 Angle(float a){return new V2((float)Math.Cos(a),(float)Math.Sin(a));}
    }
    public static class Mathx {
        public const float Tau=6.283185307f;
        public static float Clamp(float v,float a,float b){return Math.Max(a,Math.Min(b,v));}
        public static float Angle(V2 v){return (float)Math.Atan2(v.y,v.x);}
    }
    [Serializable] public class HeroDef {public string id,name,role,desc,color,cloth,accent,q,e,r;public float hp,speed,damage,fireRate,shotSpeed,qCd,eCd;}
    [Serializable] public class WeaponDef {public string id,name,kind,rarity,color,effect,desc;public float power,interval,speed,reload;public int shots,pierce,clip;}
    [Serializable] public class RelicDef {public string id,name,icon,desc;}
    [Serializable] public class ContentDatabase {public HeroDef[] heroes;public WeaponDef[] weapons;public RelicDef[] relics;public HeroDef Hero(string id){return Array.Find(heroes,h=>h.id==id)??heroes[0];}public WeaponDef Weapon(string id){return Array.Find(weapons,w=>w.id==id)??weapons[0];}public RelicDef Relic(string id){return Array.Find(relics,r=>r.id==id);}}
    [Serializable] public class WeaponState {public string id;public int level=1,ammo;public float reload;public WeaponState(){}public WeaponState(WeaponDef w){id=w.id;ammo=w.clip;}}
    [Serializable] public class PlayerState {
        public V2 position=new V2(11.5f,10);public float hp,maxHp,mp=100,maxMp=100,damage,speed,armor,crit=.06f,xp,nextXp=65,fireTimer,dashTimer,dashTime,invulnerable,qTimer,eTimer,ult,code,shield,overclock,firewall,droneTimer;
        public int level=1,gold,potions=3,slot;public bool moving;public float facing;public V2 dashDirection;public List<string> relics=new List<string>();public WeaponState[] weapons;
        public bool Has(string id){return relics.Contains(id);}
    }
    [Serializable] public class EnemyState {public string id,type,challenge;public V2 position,home,chargeDirection;public float hp,maxHp,speed,damage,radius=.24f,timer,cooldown=2,hit,burn,burnTick,extraTimer,slow;public int phase,pattern;public bool alive=true,miniBoss,root,rootPhase;public int xp=12,gold=5;}
    public class Bullet {public V2 position,velocity;public string kind,color,effect;public float damage,life=2,radius=.12f;public int pierce;public bool friendly,charge=true;public HashSet<string> hit=new HashSet<string>();}
    [Serializable] public class Shrine {public string id,name,kind;public V2 position;public bool active,started,complete;public float time,hp=100,waveTimer;public int wave;public List<string> enemies=new List<string>();}
    [Serializable] public class Loot {public string id,kind,weapon;public V2 position;public int amount=1,level=1;public bool collected;}
    [Serializable] public class Prop {public V2 position;public string type,zone;public float radius;public int variant;}
    public class Danger {public V2 position;public float radius=1,time=1,maxTime=1,damage=18;public string color="#ff8b83";}
    public class ZoneEffect {public V2 position;public float radius,time,tick,damage;public string color;public bool follow,charge=true;}
    public class Effect {public string kind,color,text;public V2 position,end;public float time,maxTime,radius;}
    public class SimEvent {public string kind,text;public SimEvent(string kind,string text){this.kind=kind;this.text=text;}}
    public struct GameInput {public V2 move,aim;public bool attack;}
    [Serializable] public class RunSave {
        public int version=2,seed,cycle,kills,deaths,tutorial,serial,pendingLevels,tutorialDashes,tutorialSkills;public float time,tutorialMoved,tutorialShots;public string hero;public bool bossStarted,victory,tutorialChest;public PlayerState player;
        public List<EnemyState> enemies;public List<Shrine> shrines;public List<Loot> loot;public List<string> memories,achievements;
    }
}
