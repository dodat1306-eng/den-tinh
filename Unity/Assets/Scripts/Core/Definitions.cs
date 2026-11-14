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
    [Serializable] public class HeroDef {public string id,name,role,desc,color,cloth,accent,q,e,r;public float hp,speed,damage,fireRate,shotSpeed,qCd,eCd,rCd;}
    [Serializable] public class WeaponDef {public string id,name,kind,rarity,color,effect,desc;public float power,interval,speed,reload;public int shots,pierce,clip;}
    [Serializable] public class RelicDef {public string id,name,icon,desc;}
    [Serializable] public class ElementDef {public string id,name,title,color,accent,q,e,r,desc,passive,icon;}
    public class StoryNpc {public string id,name,text;public V2 position;}
    [Serializable] public class ShadowSpec {public string id,name,behavior;public float speed,hp,r;public bool flying;}
    [Serializable] public class ShadowRemain {public V2 position;public string sourceType,enemyType,variant;public float life=20;}
    [Serializable] public class ShadowUnit {public string id,kind,variant;public V2 position;public float hp,maxHp,power,life,maxLife,radius,attackCd,hurtCd,aimAngle,spawnAge;public bool moving;public ActorAction action;}
    public class GolemThrow {public EnemyState enemy;public V2 start,target,position;public float elapsed,height;}
    [Serializable] public class ContentDatabase {public HeroDef[] heroes;public ShadowSpec[] shadows;public WeaponDef[] weapons;public RelicDef[] relics;public HeroDef elementalHero;public WeaponDef elementalWeapon;public ElementDef[] elements;public HeroDef Hero(string id){if(id=="kiet")id="quanle";return elementalHero!=null&&id==elementalHero.id?elementalHero:Array.Find(heroes,h=>h.id==id)??heroes[0];}public WeaponDef Weapon(string id){return elementalWeapon!=null&&id==elementalWeapon.id?elementalWeapon:Array.Find(weapons,w=>w.id==id)??weapons[0];}public RelicDef Relic(string id){return Array.Find(relics,r=>r.id==id);}public HeroDef[] PlayableHeroes {get{List<HeroDef> all=new List<HeroDef>(heroes);if(elementalHero!=null)all.Add(elementalHero);return all.ToArray();}}}
    [Serializable] public class WeaponState {public string id;public int level=1,ammo;public float reload;public WeaponState(){}public WeaponState(WeaponDef w){id=w.id;ammo=w.clip;}}
    [Serializable] public class PlayerState {
        public V2 position=new V2(11.5f,10);public float hp,maxHp,mp=100,maxMp=100,damage,speed,armor,crit=.06f,xp,nextXp=65,fireTimer,dashTimer,dashTime,invulnerable,qTimer,eTimer,rCd,ult=100,code,shield,overclock,firewall,droneTimer;
        public UltimateIntro ultIntro;public float shadowArmor;public int qRank,eRank,rRank,passiveRank,comboIndex=-1;
        public int level=1,gold,potions=3,slot;public bool moving;public float facing,aimAngle,moveFacing=-1.5707963f,hoverboard;public string moveDir="S",element="lightning";public int splitCount=3,motionEpoch;public ActorAction action;public V2 dashDirection;public List<string> relics=new List<string>();public WeaponState[] weapons;
        public bool Has(string id){return relics.Contains(id);}
    }
    [Serializable] public class EnemyState {public string id,type,challenge;public V2 position,home,chargeDirection;public float hp,maxHp,speed,damage,radius=.24f,timer,cooldown=2,hit,burn,burnTick,extraTimer,slow,frozen,rooted,stunned,poison,poisonTick,poisonPower;public float facing,throwLift,shadowBleed,shadowBleedTick,shadowBleedPower,shadowCorrosion,shadowFear;public V2 fearOrigin;public bool shadowRecorded,shadowHeld;public int phase,pattern;public bool alive=true,miniBoss,root,rootPhase;public int xp=12,gold=5;}
    [Serializable] public class ActorAction {public string key,element,clip,targetId;public float elapsed,duration,release,angle;public V2 target;public bool released;public int epoch;}
    [Serializable] public class CloneState {public string id,element,moveDir="S",aiState="regroup",targetId;public V2 position,velocity,dashDirection;public float radius=.21875f,speed=4.0625f,moveFacing=-1.5707963f,aimAngle,hp,maxHp,attackCd,qCd,eCd,rCd,dashCd,dashTime,hoverboard,hurtCd;public bool moving,alive=true;public int motionEpoch,comboIndex=-1;public ActorAction action;}
    public class SummonState {public string id,kind,owner;public float punchCd,smashCd,stompCd,throwCd,aimAngle;public GolemThrow thrown;public int punchUses,smashUses,stompUses,throwUses;public V2 position;public Prop sourceProp;public float radius,hp,maxHp,power,life,maxLife,attackCd,shotCd,spawnAge;public bool moving;public ActorAction action;}
    public class ElementField {public string element,behavior,owner;public V2 position;public float radius,life,tick,power,angle,travel,delay;public bool follow,charge;public int epoch;}
    public class ElementStrike {public string owner,element,clip;public int epoch;public V2 position;public float delay,radius,power;public bool charge,strong;}
    public class Bullet {public V2 position,velocity;public string kind,color,effect,element,owner;public float damage,life=2,radius=.12f;public int pierce;public bool friendly,charge=true,returning,shadowPoison;public HashSet<string> hit=new HashSet<string>();public HashSet<Prop> propHits=new HashSet<Prop>();}
    [Serializable] public class Shrine {public string id,name,kind;public V2 position;public bool active,started,complete;public float time,hp=100,waveTimer;public int wave;public List<string> enemies=new List<string>();}
    [Serializable] public class Loot {public string id,kind,weapon;public V2 position;public int amount=1,level=1;public bool collected;}
    [Serializable] public class Prop {public V2 position;public string type,zone,status="intact";public float radius,baseRadius=-1,burnTimer,frozenTimer,charTimer,spreadTimer,heatTimer,afflictTimer,touchTimer,sway,fallTime,hp=80;public bool shadowRecorded;public int variant,damageStage,beforeFreezeStage;}
    [Serializable] public class GroundDecal {public V2 position;public string type,size;public float age,life=90,emberLife;}
    public class Danger {public V2 position;public float radius=1,time=1,maxTime=1,damage=18;public string color="#ff8b83";}
    public class ZoneEffect {public V2 position;public float radius,time,tick,damage;public string color;public bool follow,charge=true;}
    public class Effect {public string kind,color,text,element,clip;public V2 position,end;public float time,maxTime,radius,angle;}
    public class SimEvent {public string kind,text;public SimEvent(string kind,string text){this.kind=kind;this.text=text;}}
    public struct GameInput {public V2 move,aim;public bool attack;}
    [Serializable] public class RunSave {
        public int version=2,seed,cycle,kills,deaths,tutorial,serial,pendingLevels,tutorialDashes,tutorialSkills;public float time,tutorialMoved,tutorialShots;public string hero;public bool bossStarted,victory,tutorialChest;public PlayerState player;
        public List<EnemyState> enemies;public List<Shrine> shrines;public List<Loot> loot;public List<string> memories,achievements;
        public List<CloneState> clones;public float splitTime,splitCooldown;
        public List<Prop> props;public List<GroundDecal> decals;public List<ShadowRemain> shadowRemains;public List<ShadowUnit> shadowArmy;public float shadowFrenzy;
    }
}
