using System;
using System.Collections.Generic;

namespace DenTinh.Core {
    [Serializable] public class AitField {
        public string kind;public V2 position;public float radius,life,power,tick;public int extraStrikes;
        public List<string> inside=new List<string>();
    }
    [Serializable] public class AitState {
        public int ammo,ammoAttack;public float ammoShield,overdrive,overdriveTick,recast,agile,helmetCd,sniperCd;
        public string qSpec,eSpec,rSpec;public bool empowered;public ActorAction pending;
        public List<AitField> fields=new List<AitField>();
    }
    public sealed partial class Simulation {
        public AitState Ait=new AitState();
        public bool IsAit01 {get{return Hero.id=="ait01";}}
        readonly Queue<KeyValuePair<EnemyState,float>> aitBursts=new Queue<KeyValuePair<EnemyState,float>>();
        readonly HashSet<EnemyState> aitQueued=new HashSet<EnemyState>();bool burstingAit;
        static bool AitBoss(EnemyState e){return e.type=="boss"||e.miniBoss||e.saga>=0;}
        public bool AitRecast {get{return IsAit01&&!Paused&&!Dead&&Player.ultIntro==null&&Ait.recast>0&&Ait.fields.Exists(f=>f.kind=="tactical-zone"&&f.life>0)&&(Player.action==null||Player.action.elapsed>=Player.action.release+.1f);}}
        public bool ChooseAitSpecialization(string key,string value){
            if(!IsAit01)return false;
            if(key=="q"&&Player.qRank==3&&(value=="focus"||value=="burst")){Ait.qSpec=value;return true;}
            if(key=="e"&&Player.eRank==3&&(value=="lasting"||value=="agile")){Ait.eSpec=value;return true;}
            if(key=="r"&&Player.rRank==3&&(value=="might"||value=="renewal")){Ait.rSpec=value;return true;}
            return false;
        }
        void AitFx(string clip,V2 at,float life=.5f){Effects.Add(new Effect{kind="ait01",clip=clip,position=at,time=life,maxTime=life});}
        void AitBoon(){
            PlayerState p=Player;Ait.ammo=Math.Min(6,Ait.ammo+1);p.mp=Math.Min(p.maxMp,p.mp+5+p.passiveRank*1.5f);
            Ait.ammoShield=Math.Min(p.shield,Ait.ammoShield);float gain=Math.Min(65-Ait.ammoShield,(8+4*p.passiveRank)*Recovery);
            Ait.ammoShield+=gain;p.shield+=gain;if(recoveryDepth>0)recoveryShieldBonus+=gain;
        }
        public void AitLock(EnemyState e,int count=1,bool early=false){
            if(!IsAit01||e==null)return;if(e.targetLockTime<=0)e.targetLocks=0;
            e.targetLocks=Math.Min(5,e.targetLocks+count);e.targetLockTime=6;
            if(e.targetLocks<5&&(!early||e.targetLocks<3)||!aitQueued.Add(e))return;
            aitBursts.Enqueue(new KeyValuePair<EnemyState,float>(e,early&&e.targetLocks<5?.85f:1));
            if(burstingAit)return;burstingAit=true;
            try {while(aitBursts.Count>0){
                KeyValuePair<EnemyState,float> item=aitBursts.Dequeue();EnemyState source=item.Key;aitQueued.Remove(source);source.targetLocks=0;source.targetLockTime=0;
                float power=Player.damage*(2.2f+.35f*Player.passiveRank)*item.Value;bool airdrop=InAitAirdrop(source.position);
                AitBoon();AitFx("grenade_explosion",source.position);
                foreach(EnemyState target in Enemies.ToArray())if(target.alive&&V2.Distance(source.position,target.position)<110/64f*Reach+target.radius){
                    AsDamage("skill",delegate{DamageEnemy(target,power,false);});
                    target.burn=Math.Max(target.burn,2);target.burnTick=0;
                    if(AitBoss(target)){target.weakened=1.5f;target.talismanSlow=1.5f;target.talismanSlowFactor=.75f;}else target.stunned=Math.Max(target.stunned,.5f);
                    if(airdrop&&target.alive)AsDamage("true",delegate{DamageEnemy(target,power*.35f,false);});
                }
                if(airdrop)AitFx("rocket_missile",source.position,.48f);
                if(Player.passiveRank>0){EnemyState next=null;float distance=220/64f;foreach(EnemyState t in Enemies)if(t!=source&&t.alive&&V2.Distance(t.position,source.position)<distance){next=t;distance=V2.Distance(t.position,source.position);}if(next!=null)AitLock(next,1+Player.passiveRank/2);}
            }}finally{burstingAit=false;aitBursts.Clear();aitQueued.Clear();}
        }
        bool InAitAirdrop(V2 at){return IsAit01&&Ait.fields.Exists(f=>f.kind=="airdrop-zone"&&f.life>0&&V2.Distance(f.position,at)<=f.radius);}
        void AitHit(EnemyState e,float power,int locks=1,string kind="skill",bool early=false){AsDamage(kind,delegate{DamageEnemy(e,power,false);});AitLock(e,locks,early);}
        Bullet AitShot(V2 from,float angle,float speed,float power,string clip,int locks,string kind,float range,int pierce=0){
            Shoot(from,angle,speed/64,power,true,clip,"#4df3ff",pierce,"",false);Bullet b=Bullets[Bullets.Count-1];b.damageClass=kind;b.aitLocks=locks;b.radius=(clip=="rocket_missile"?13:clip=="shotgun_blast"?9:5)/64f;b.life=range/64/b.velocity.Length;return b;
        }
        bool FireAit01(){
            PlayerState p=Player;if(p.fireTimer>0||p.dashTime>0||p.action!=null&&p.action.key!="attack")return false;
            p.fireTimer=Hero.fireRate;shots++;float power=p.damage*(1+(Active.level-1)*.18f);int count=Rpg.attackCount+1,need=Math.Max(5,8-p.passiveRank);
            AitShot(p.position,p.facing,820,power,"rifle_bullet",1,"normal",943);
            if(count%3==0){Bullet b=AitShot(p.position,p.facing,780,power*1.35f,"shotgun_blast",2,"normal",819,1);b.aitThird=count;}
            if(count%need==0)AitShot(p.position,p.facing,840,power*1.55f,"rocket_missile",2,"normal",966,1);
            foreach(AitField z in Ait.fields)if(z.kind=="tactical-zone"&&z.life>0)AitShot(z.position,Mathx.Angle(Input.aim-z.position),820,p.damage*.55f,"rifle_bullet",1,"summon",697);
            p.action=Action("attack",null,p.position,Input.aim,0);p.action.released=true;p.action.duration=.22f;Emit("sound","shoot");return true;
        }
        void AitBulletHit(Bullet b,EnemyState e){
            if(b.aitLocks==0)return;
            if(b.aitThird>0&&Ait.ammoAttack!=b.aitThird){Ait.ammoAttack=b.aitThird;AitBoon();}
            if(b.kind=="shotgun_blast"){e.talismanSlow=.8f;e.talismanSlowFactor=.85f;}
            if(b.kind=="rocket_missile"&&b.damageClass=="q")e.slow=Math.Max(e.slow,1.2f);
            AitLock(e,b.aitLocks,b.aitEmpowered);
        }
        bool AitSkill(string key){
            PlayerState p=Player;if(key=="r"){ReleaseAit01("r",Input.aim,p.facing,false);return true;}
            if(Paused||Dead||p.dashTime>0||p.ultIntro!=null||key!="q"&&key!="e")return false;
            if(key=="e"&&AitRecast){
                foreach(AitField f in Ait.fields.ToArray())if(f.kind=="tactical-zone"&&f.life>0){
                    foreach(EnemyState e in Enemies.ToArray())if(e.alive&&!AitBoss(e)&&V2.Distance(e.position,f.position)<260/64f){V2 d=f.position-e.position;e.position=MoveEnemy(e,d.Unit*Math.Min(75/64f,d.Length*.35f),e.radius);}
                    f.life=0;AitFx("grenade_explosion",f.position);
                    foreach(EnemyState e in Enemies.ToArray())if(e.alive&&V2.Distance(e.position,f.position)<f.radius+e.radius)AitHit(e,p.damage*1.9f,1,"summon");
                }
                Ait.fields.RemoveAll(f=>f.life<=0);Ait.recast=0;Ait.overdrive=4.5f*SummonDuration;Ait.overdriveTick=0;p.shield=Math.Max(p.shield,Math.Min(110,p.shield+25+6*p.eRank));
                if(Ait.eSpec=="agile")Ait.agile=2;if(p.passiveRank>=3)Ait.ammo=Math.Min(6,Ait.ammo+2);
                p.action=Action("e",null,p.position,Input.aim,0);p.action.released=true;Emit("sound","skill");return true;
            }
            float cost=key=="q"?24:30;if(p.mp<cost||key=="q"&&p.qTimer>0||key=="e"&&p.eTimer>0||p.action!=null&&p.action.key!="attack")return false;
            p.mp-=cost;skills++;if(key=="q")p.qTimer=Hero.qCd*(1-.06f*p.qRank)*(p.Has("cooling")?.78f:1);else p.eTimer=Hero.eCd*(1-.06f*p.eRank)*(p.Has("cooling")?.78f:1);
            if(key=="e"&&Ait.eSpec=="agile"){p.eTimer*=.75f;Ait.agile=2;}
            Ait.empowered=Ait.ammo>=6;if(Ait.empowered){Ait.ammo=0;if(key=="q")p.eTimer=Math.Max(0,p.eTimer-1.5f);else p.qTimer=Math.Max(0,p.qTimer-1.5f);}
            p.action=Action(key,null,p.position,Input.aim,0);p.action.release=.14f;Ait.pending=p.action;Emit("sound","skill");return true;
        }
        AitField AddAitField(string kind,V2 at,float radius,float life,float power,float tick){
            AitField f=new AitField{kind=kind,position=at,radius=radius/64*Reach,life=life*(kind=="tactical-zone"?SummonDuration:1),power=power,tick=tick};Ait.fields.Add(f);return f;
        }
        void ReleaseAit01(string key,V2 target,float angle,bool empowered){
            PlayerState p=Player;int rank=key=="q"?p.qRank:key=="e"?p.eRank:p.rRank;float power=p.damage*(1+.18f*rank);
            if(p.passiveRank>=3&&(key=="q"||key=="e"))Ait.ammo=Math.Min(6,Ait.ammo+1);
            if(key=="q"&&Ait.qSpec=="focus"||key=="r"&&Ait.rSpec=="might")power*=1.25f;
            if(key=="q"&&Ait.qSpec=="burst"||key=="r"&&Ait.rSpec=="renewal")power*=.85f;
            if(key=="q")foreach(float offset in empowered?new[]{-.18f,0,.18f}:new[]{0f}){
                bool focus=Ait.qSpec=="focus";float range=focus?780:680;
                Bullet b=AitShot(p.position,angle+offset,focus?1300:1000,power*3.4f,"rocket_missile",focus?3:2,"q",range,10000);b.aitEmpowered=empowered;b.aitBurst=Ait.qSpec=="burst";
                if(b.aitBurst)for(int n=1;n<=7;n++)AddAitField("shrapnel-fire",p.position+V2.Angle(angle+offset)*(range*n/7/64),45,2.5f,power*.3f,.25f);
            }
            if(key=="e"){
                foreach(float offset in empowered?new[]{-90f,90f}:new[]{0f}){
                    V2 at=target+V2.Angle(angle+Mathx.Tau/4)*(offset/64);at=new V2(Mathx.Clamp(at.x,1,Width-1),Mathx.Clamp(at.y,1,Height-1));if(Collides(at,.2f))at=p.position;
                    if(Ait.fields.FindAll(f=>f.kind=="tactical-zone"&&f.life>0).Count>=2)Ait.fields.Remove(Ait.fields.Find(f=>f.kind=="tactical-zone"));
                    AitField field=AddAitField("tactical-zone",at,145,(7+.8f*rank)*(Ait.eSpec=="lasting"?1.4f:1),power*.75f,.75f);
                    AitFx("grenade_explosion",at,.5f);
                    foreach(EnemyState e in Enemies)if(e.alive&&V2.Distance(e.position,at)<=field.radius){e.rooted=AitBoss(e)?.35f:1.2f;field.inside.Add(e.id);}
                }Ait.recast=4;if(Ait.eSpec=="lasting")p.shield=Math.Min(110,p.shield+15);
            }
            if(key=="r"){
                AitField f=AddAitField("airdrop-zone",target,250,8+rank*1.2f,power,.32f);f.extraStrikes=Ait.rSpec=="might"?10:0;
                foreach(EnemyState e in Enemies.ToArray())if(e.alive&&V2.Distance(e.position,target)<=f.radius)AitHit(e,power*2.4f,2);
                if(Ait.rSpec=="renewal"){HealAmount(p.maxHp*.18f);p.mp=Math.Min(p.maxMp,p.mp+20);}AitFx("grenade_explosion",target,.7f);
            }
        }
        void AitStrike(AitField f,EnemyState target){V2 at=target==null?f.position:target.position;AitFx("rocket_missile",at,.48f);foreach(EnemyState e in Enemies.ToArray())if(e.alive&&V2.Distance(e.position,at)<75/64f*Reach)AitHit(e,f.power*1.45f);}
        void UpdateAit01(float dt){
            if(!IsAit01)return;PlayerState p=Player;Ait.recast=Math.Max(0,Ait.recast-dt);Ait.agile=Math.Max(0,Ait.agile-dt);Ait.helmetCd=Math.Max(0,Ait.helmetCd-dt);
            ActorAction a=p.action;if(a!=null&&p.ultIntro!=null)a.elapsed=p.ultIntro.elapsed;if(a!=null&&p.ultIntro==null){a.elapsed+=dt;if(!a.released&&a.elapsed+.00001f>=a.release){a.released=true;Ait.pending=null;ReleaseAit01(a.key,a.target,a.angle,Ait.empowered);}if(a.elapsed>=a.duration)p.action=null;}
            foreach(EnemyState e in Enemies){e.targetLockTime=Math.Max(0,e.targetLockTime-dt);if(e.targetLockTime<=0)e.targetLocks=0;e.talismanSlow=Math.Max(0,e.talismanSlow-dt);}
            if(Ait.overdrive>0){Ait.overdrive=Math.Max(0,Ait.overdrive-dt);Ait.overdriveTick-=dt*SummonHaste;if(Ait.overdriveTick<=0){Ait.overdriveTick+=.55f;EnemyState e=Nearest(p.position,380/64f);if(e!=null)AitShot(p.position,Mathx.Angle(e.position-p.position),820,p.damage*.85f,"rifle_bullet",1,"summon",574);}}
            if(p.passiveRank>=2){Ait.sniperCd-=dt*SummonHaste;if(Ait.sniperCd<=0){EnemyState far=null;float best=0;foreach(EnemyState e in Enemies)if(e.alive){float d=V2.Distance(e.position,p.position);if(d<620/64f&&d>best){best=d;far=e;}}if(far!=null){Ait.sniperCd=3.5f;AitShot(p.position,Mathx.Angle(far.position-p.position),1100,p.damage*1.4f,"rifle_bullet",1,"summon",825,3);}}}
            foreach(AitField f in Ait.fields.ToArray()){
                f.life-=dt;f.tick-=dt;if(f.life<=0)continue;
                List<EnemyState> near=Enemies.FindAll(e=>e.alive&&V2.Distance(e.position,f.position)<=f.radius);
                if(f.kind=="tactical-zone"){
                    foreach(EnemyState e in near)if(!f.inside.Contains(e.id))e.rooted=AitBoss(e)?.35f:1.2f;f.inside=near.ConvertAll(e=>e.id);
                    if(Ait.eSpec=="lasting"&&V2.Distance(p.position,f.position)<f.radius)HealAmount(2.5f*dt);
                    if(f.tick<=0){f.tick+=.75f;foreach(EnemyState e in near)AitHit(e,f.power,1,"summon");}
                }else if(f.kind=="airdrop-zone"&&f.tick<=0){
                    f.tick+=.32f;near.Sort((x,y)=>y.targetLocks!=x.targetLocks?y.targetLocks.CompareTo(x.targetLocks):V2.Distance(x.position,f.position).CompareTo(V2.Distance(y.position,f.position)));
                    AitStrike(f,near.Count>0?near[0]:null);if(f.extraStrikes>0){f.extraStrikes--;AitStrike(f,near.Count>1?near[1]:near.Count>0?near[0]:null);}
                }else if(f.kind=="shrapnel-fire"&&f.tick<=0){f.tick+=.5f;foreach(EnemyState e in near){AitHit(e,f.power);e.burn=1;}}
            }
            Ait.fields.RemoveAll(f=>f.life<=0);
            foreach(Bullet b in Bullets)if(!b.friendly){bool slow=Ait.fields.Exists(f=>f.kind=="tactical-zone"&&V2.Distance(f.position,b.position)<f.radius);if(slow!=b.aitSlowed){b.velocity*=slow?.7f:1/.7f;b.aitSlowed=slow;}}
        }
        void EndAitBullet(Bullet b){if(!b.aitBurst)return;AitFx("grenade_explosion",b.position);foreach(EnemyState e in Enemies.ToArray())if(e.alive&&V2.Distance(e.position,b.position)<110/64f*Reach)AitHit(e,Player.damage*1.5f);}
        void ClearAit01(){Ait.fields.Clear();Ait.pending=null;Ait.overdrive=Ait.recast=Ait.agile=Ait.helmetCd=Ait.sniperCd=0;}
        void RestoreAit01(RunSave data){
            if(!IsAit01||data.ait01==null)return;AitState s=data.ait01;
            Ait=new AitState{ammo=(int)Safe(s.ammo,0,6),ammoAttack=(int)Safe(s.ammoAttack,0,1000000000),ammoShield=Safe(s.ammoShield,0,Math.Min(65,Player.shield)),overdrive=Safe(s.overdrive,0,45),overdriveTick=Safe(s.overdriveTick,0,.55f),recast=Safe(s.recast,0,4),agile=Safe(s.agile,0,2),helmetCd=Safe(s.helmetCd,0,8),sniperCd=Safe(s.sniperCd,0,3.5f),empowered=s.empowered};
            ChooseAitSpecialization("q",s.qSpec);ChooseAitSpecialization("e",s.eSpec);ChooseAitSpecialization("r",s.rSpec);
            if(s.fields!=null)foreach(AitField f in s.fields){
                if(f==null||Ait.fields.Count>=24||f.kind!="tactical-zone"&&f.kind!="airdrop-zone"&&f.kind!="shrapnel-fire"||Safe(f.life,0,180)<=0||float.IsNaN(f.position.x)||float.IsNaN(f.position.y)||float.IsInfinity(f.position.x)||float.IsInfinity(f.position.y))continue;
                if(f.kind=="tactical-zone"&&Ait.fields.FindAll(x=>x.kind=="tactical-zone").Count>=2)continue;
                Ait.fields.Add(new AitField{kind=f.kind,position=new V2(Safe(f.position.x,1,Width-1),Safe(f.position.y,1,Height-1)),life=Safe(f.life,0,180),radius=Safe(f.radius,.01f,35),power=Safe(f.power,0,50000),tick=Safe(f.tick,0,1),extraStrikes=(int)Safe(f.extraStrikes,0,10)});
            }
            foreach(EnemyState e in Enemies){e.targetLocks=(int)Safe(e.targetLocks,0,4);e.targetLockTime=Safe(e.targetLockTime,0,6);e.talismanSlow=Safe(e.talismanSlow,0,1.5f);e.talismanSlowFactor=Safe(e.talismanSlowFactor,.5f,1,1);}
            ActorAction a=s.pending;if(Player.ultIntro==null&&a!=null&&!a.released&&(a.key=="q"||a.key=="e")&&Math.Abs(a.target.x)<Width&&Math.Abs(a.target.y)<Height){
                Player.action=Action(a.key,null,Player.position,a.target,0);Player.action.release=.14f;Player.action.elapsed=Safe(a.elapsed,0,.14f);Ait.pending=Player.action;
            }
        }
    }
}
