using System;
using System.Collections.Generic;

namespace DenTinh.Core {
    [Serializable] public class QuynhField {
        public string kind;public V2 position;public float radius,life,power,tick;public int extraStrikes;
        public List<string> inside=new List<string>();
    }
    [Serializable] public class QuynhState {
        public int coins,coinAttack;public float coinShield,ward,wardTick,recast,agile;
        public string qSpec,eSpec,rSpec;public bool empowered;public ActorAction pending;
        public List<QuynhField> fields=new List<QuynhField>();
    }
    public sealed partial class Simulation {
        public QuynhState Quynh=new QuynhState();
        public bool IsQuynh {get{return Hero.id=="quynhkun";}}
        readonly Queue<KeyValuePair<EnemyState,float>> quynhBursts=new Queue<KeyValuePair<EnemyState,float>>();
        readonly HashSet<EnemyState> quynhQueued=new HashSet<EnemyState>();bool burstingQuynh;
        static bool QuynhBoss(EnemyState e){return e.type=="boss"||e.miniBoss||e.saga>=0;}
        public bool QuynhRecast {get{return IsQuynh&&!Paused&&!Dead&&Player.ultIntro==null&&Quynh.recast>0&&Quynh.fields.Exists(f=>f.kind=="bagua-stake"&&f.life>0)&&(Player.action==null||Player.action.elapsed>=Player.action.release+.1f);}}
        public bool ChooseQuynhSpecialization(string key,string value){
            if(!IsQuynh)return false;
            if(key=="q"&&Player.qRank==3&&(value=="focus"||value=="burst")){Quynh.qSpec=value;return true;}
            if(key=="e"&&Player.eRank==3&&(value=="lasting"||value=="agile")){Quynh.eSpec=value;return true;}
            if(key=="r"&&Player.rRank==3&&(value=="might"||value=="renewal")){Quynh.rSpec=value;return true;}
            return false;
        }
        void QuynhFx(string clip,V2 at,float life=.5f){Effects.Add(new Effect{kind="quynhkun",clip=clip,position=at,time=life,maxTime=life});}
        void QuynhBoon(){
            PlayerState p=Player;Quynh.coins=Math.Min(6,Quynh.coins+1);p.mp=Math.Min(p.maxMp,p.mp+5+p.passiveRank*1.5f);
            Quynh.coinShield=Math.Min(p.shield,Quynh.coinShield);float gain=Math.Min(65-Quynh.coinShield,(8+4*p.passiveRank)*Recovery);
            Quynh.coinShield+=gain;p.shield+=gain;if(recoveryDepth>0)recoveryShieldBonus+=gain;
        }
        public void QuynhMark(EnemyState e,int count=1,bool early=false){
            if(!IsQuynh||e==null)return;if(e.talismanTime<=0)e.talismanMarks=0;
            e.talismanMarks=Math.Min(5,e.talismanMarks+count);e.talismanTime=6;
            if(e.talismanMarks<5&&(!early||e.talismanMarks<3)||!quynhQueued.Add(e))return;
            quynhBursts.Enqueue(new KeyValuePair<EnemyState,float>(e,early&&e.talismanMarks<5?.85f:1));
            if(burstingQuynh)return;burstingQuynh=true;
            try {while(quynhBursts.Count>0){
                KeyValuePair<EnemyState,float> item=quynhBursts.Dequeue();EnemyState source=item.Key;quynhQueued.Remove(source);source.talismanMarks=0;source.talismanTime=0;
                float power=Player.damage*(2.2f+.35f*Player.passiveRank)*item.Value;bool heaven=InQuynhHeaven(source.position);
                QuynhBoon();QuynhFx("talisman_burst",source.position);
                foreach(EnemyState target in Enemies.ToArray())if(target.alive&&V2.Distance(source.position,target.position)<110/64f*Reach+target.radius){
                    AsDamage("skill",delegate{DamageEnemy(target,power,false);});
                    if(QuynhBoss(target)){target.weakened=1.5f;target.talismanSlow=1.5f;target.talismanSlowFactor=.75f;}else target.stunned=Math.Max(target.stunned,.5f);
                    if(heaven&&target.alive)AsDamage("true",delegate{DamageEnemy(target,power*.35f,false);});
                }
                if(heaven)QuynhFx("thunder_talisman_drop",source.position,.48f);
                if(Player.passiveRank>0){EnemyState next=null;float distance=220/64f;foreach(EnemyState t in Enemies)if(t!=source&&t.alive&&V2.Distance(t.position,source.position)<distance){next=t;distance=V2.Distance(t.position,source.position);}if(next!=null)QuynhMark(next,1+Player.passiveRank/2);}
            }}finally{burstingQuynh=false;quynhBursts.Clear();quynhQueued.Clear();}
        }
        bool InQuynhHeaven(V2 at){return IsQuynh&&Quynh.fields.Exists(f=>f.kind=="heaven-seal"&&f.life>0&&V2.Distance(f.position,at)<=f.radius);}
        void QuynhHit(EnemyState e,float power,int marks=1,string kind="skill",bool early=false){AsDamage(kind,delegate{DamageEnemy(e,power,false);});QuynhMark(e,marks,early);}
        Bullet QuynhShot(float angle,float speed,float power,string clip,int marks,string kind,float range,int pierce=0){
            Shoot(Player.position,angle,speed/64,power,true,clip,"#ffd166",pierce,"",false);Bullet b=Bullets[Bullets.Count-1];b.damageClass=kind;b.quynhMarks=marks;b.radius=(clip=="grand_talisman"?13:clip=="cinnabar_slash"?9:5)/64f;b.life=range/64/b.velocity.Length;return b;
        }
        bool FireQuynh(){
            PlayerState p=Player;if(p.fireTimer>0||p.dashTime>0||p.action!=null&&p.action.key!="attack")return false;
            p.fireTimer=Hero.fireRate;shots++;float power=p.damage*(1+(Active.level-1)*.18f);
            QuynhShot(p.facing,760,power,"talisman_bolt",1,"normal",874);
            if((Rpg.attackCount+1)%3==0){Bullet b=QuynhShot(p.facing,760,power*1.35f,"cinnabar_slash",2,"normal",874,1);b.quynhThird=Rpg.attackCount+1;}
            p.action=Action("attack",null,p.position,Input.aim,0);p.action.released=true;p.action.duration=.21f;Emit("sound","shoot");return true;
        }
        void QuynhBulletHit(Bullet b,EnemyState e){
            if(b.quynhMarks==0)return;
            if(b.quynhThird>0&&Quynh.coinAttack!=b.quynhThird){Quynh.coinAttack=b.quynhThird;QuynhBoon();}
            if(b.kind=="cinnabar_slash"){e.talismanSlow=.8f;e.talismanSlowFactor=.85f;}
            if(b.kind=="grand_talisman")e.slow=Math.Max(e.slow,1.2f);
            QuynhMark(e,b.quynhMarks,b.quynhEmpowered);
        }
        bool QuynhSkill(string key){
            PlayerState p=Player;if(key=="r"){ReleaseQuynh("r",Input.aim,p.facing,false);return true;}
            if(Paused||Dead||p.dashTime>0||p.ultIntro!=null||key!="q"&&key!="e")return false;
            if(key=="e"&&QuynhRecast){
                foreach(QuynhField f in Quynh.fields.ToArray())if(f.kind=="bagua-stake"&&f.life>0){
                    foreach(EnemyState e in Enemies.ToArray())if(e.alive&&!QuynhBoss(e)&&V2.Distance(e.position,f.position)<260/64f){V2 d=f.position-e.position;e.position=MoveEnemy(e,d.Unit*Math.Min(75/64f,d.Length*.35f),e.radius);}
                    f.life=0;QuynhFx("talisman_burst",f.position);
                    foreach(EnemyState e in Enemies.ToArray())if(e.alive&&V2.Distance(e.position,f.position)<f.radius+e.radius)QuynhHit(e,p.damage*1.9f,1,"summon");
                }
                Quynh.fields.RemoveAll(f=>f.life<=0);Quynh.recast=0;Quynh.ward=4.5f*SummonDuration;Quynh.wardTick=0;p.shield+=25+6*p.eRank;
                if(Quynh.eSpec=="agile")Quynh.agile=2;p.action=Action("e",null,p.position,Input.aim,0);p.action.released=true;Emit("sound","skill");return true;
            }
            float cost=key=="q"?24:30;if(p.mp<cost||key=="q"&&p.qTimer>0||key=="e"&&p.eTimer>0||p.action!=null&&p.action.key!="attack")return false;
            p.mp-=cost;skills++;if(key=="q")p.qTimer=Hero.qCd*(1-.06f*p.qRank)*(p.Has("cooling")?.78f:1);else p.eTimer=Hero.eCd*(1-.06f*p.eRank)*(p.Has("cooling")?.78f:1);
            if(key=="e"&&Quynh.eSpec=="agile"){p.eTimer*=.75f;Quynh.agile=2;}
            Quynh.empowered=Quynh.coins>=6;if(Quynh.empowered){Quynh.coins=0;if(key=="q")p.eTimer=Math.Max(0,p.eTimer-1.5f);else p.qTimer=Math.Max(0,p.qTimer-1.5f);}
            p.action=Action(key,null,p.position,Input.aim,0);p.action.release=.14f;Quynh.pending=p.action;Emit("sound","skill");return true;
        }
        QuynhField AddQuynhField(string kind,V2 at,float radius,float life,float power,float tick){
            QuynhField f=new QuynhField{kind=kind,position=at,radius=radius/64*Reach,life=life*(kind=="bagua-stake"?SummonDuration:1),power=power,tick=tick};Quynh.fields.Add(f);return f;
        }
        void ReleaseQuynh(string key,V2 target,float angle,bool empowered){
            PlayerState p=Player;int rank=key=="q"?p.qRank:key=="e"?p.eRank:p.rRank;float power=p.damage*(1+.18f*rank);
            if(key=="q"&&Quynh.qSpec=="focus"||key=="r"&&Quynh.rSpec=="might")power*=1.25f;
            if(key=="q"&&Quynh.qSpec=="burst"||key=="r"&&Quynh.rSpec=="renewal")power*=.85f;
            if(key=="q")foreach(float offset in empowered?new[]{-.18f,0,.18f}:new[]{0f}){
                bool focus=Quynh.qSpec=="focus";float range=focus?780:680;
                Bullet b=QuynhShot(angle+offset,focus?1300:1000,power*3.4f,"grand_talisman",focus?3:2,"q",range,10000);b.quynhEmpowered=empowered;b.quynhBurst=Quynh.qSpec=="burst";
                if(b.quynhBurst)for(int n=1;n<=7;n++)AddQuynhField("cinnabar-fire",p.position+V2.Angle(angle+offset)*(range*n/7/64),45,2.5f,power*.3f,.25f);
            }
            if(key=="e"){
                foreach(float offset in empowered?new[]{-90f,90f}:new[]{0f}){
                    V2 at=target+V2.Angle(angle+Mathx.Tau/4)*(offset/64);at=new V2(Mathx.Clamp(at.x,1,Width-1),Mathx.Clamp(at.y,1,Height-1));if(Collides(at,.2f))at=p.position;
                    if(Quynh.fields.FindAll(f=>f.kind=="bagua-stake"&&f.life>0).Count>=2)Quynh.fields.Remove(Quynh.fields.Find(f=>f.kind=="bagua-stake"));
                    QuynhField field=AddQuynhField("bagua-stake",at,145,(7+.8f*rank)*(Quynh.eSpec=="lasting"?1.4f:1),power*.75f,.75f);
                    foreach(EnemyState e in Enemies)if(e.alive&&V2.Distance(e.position,at)<=field.radius){e.rooted=QuynhBoss(e)?.35f:1.2f;field.inside.Add(e.id);}
                }Quynh.recast=4;if(Quynh.eSpec=="lasting")p.shield=Math.Min(110,p.shield+15);
            }
            if(key=="r"){
                QuynhField f=AddQuynhField("heaven-seal",target,250,8+rank*1.2f,power,.32f);f.extraStrikes=Quynh.rSpec=="might"?10:0;
                foreach(EnemyState e in Enemies.ToArray())if(e.alive&&V2.Distance(e.position,target)<=f.radius)QuynhHit(e,power*2.4f,2);
                if(Quynh.rSpec=="renewal"){HealAmount(p.maxHp*.18f);p.mp=Math.Min(p.maxMp,p.mp+20);}QuynhFx("talisman_burst",target,.7f);
            }
        }
        void QuynhStrike(QuynhField f,EnemyState target){V2 at=target==null?f.position:target.position;QuynhFx("thunder_talisman_drop",at,.48f);foreach(EnemyState e in Enemies.ToArray())if(e.alive&&V2.Distance(e.position,at)<75/64f*Reach)QuynhHit(e,f.power*1.45f);}
        void UpdateQuynh(float dt){
            if(!IsQuynh)return;PlayerState p=Player;Quynh.recast=Math.Max(0,Quynh.recast-dt);Quynh.agile=Math.Max(0,Quynh.agile-dt);
            ActorAction a=p.action;if(a!=null&&p.ultIntro!=null)a.elapsed=p.ultIntro.elapsed;if(a!=null&&p.ultIntro==null){a.elapsed+=dt;if(!a.released&&a.elapsed+.00001f>=a.release){a.released=true;Quynh.pending=null;ReleaseQuynh(a.key,a.target,a.angle,Quynh.empowered);}if(a.elapsed>=a.duration)p.action=null;}
            foreach(EnemyState e in Enemies){e.talismanTime=Math.Max(0,e.talismanTime-dt);if(e.talismanTime<=0)e.talismanMarks=0;e.talismanSlow=Math.Max(0,e.talismanSlow-dt);}
            if(Quynh.ward>0){Quynh.ward=Math.Max(0,Quynh.ward-dt);Quynh.wardTick-=dt*SummonHaste;if(Quynh.wardTick<=0){Quynh.wardTick+=.55f;EnemyState e=Nearest(p.position,380/64f);if(e!=null)QuynhShot(Mathx.Angle(e.position-p.position),760,p.damage*.85f,"talisman_bolt",1,"summon",532);}}
            foreach(QuynhField f in Quynh.fields.ToArray()){
                f.life-=dt;f.tick-=dt;if(f.life<=0)continue;
                List<EnemyState> near=Enemies.FindAll(e=>e.alive&&V2.Distance(e.position,f.position)<=f.radius);
                if(f.kind=="bagua-stake"){
                    foreach(EnemyState e in near)if(!f.inside.Contains(e.id))e.rooted=QuynhBoss(e)?.35f:1.2f;f.inside=near.ConvertAll(e=>e.id);
                    if(Quynh.eSpec=="lasting"&&V2.Distance(p.position,f.position)<f.radius)HealAmount(2.5f*dt);
                    if(f.tick<=0){f.tick+=.75f;foreach(EnemyState e in near)QuynhHit(e,f.power,1,"summon");}
                }else if(f.kind=="heaven-seal"&&f.tick<=0){
                    f.tick+=.32f;near.Sort((x,y)=>y.talismanMarks!=x.talismanMarks?y.talismanMarks.CompareTo(x.talismanMarks):V2.Distance(x.position,f.position).CompareTo(V2.Distance(y.position,f.position)));
                    QuynhStrike(f,near.Count>0?near[0]:null);if(f.extraStrikes>0){f.extraStrikes--;QuynhStrike(f,near.Count>1?near[1]:near.Count>0?near[0]:null);}
                }else if(f.kind=="cinnabar-fire"&&f.tick<=0){f.tick+=.5f;foreach(EnemyState e in near){QuynhHit(e,f.power);e.burn=1;}}
            }
            Quynh.fields.RemoveAll(f=>f.life<=0);
            foreach(Bullet b in Bullets)if(!b.friendly){bool slow=Quynh.fields.Exists(f=>f.kind=="bagua-stake"&&V2.Distance(f.position,b.position)<f.radius);if(slow!=b.quynhSlowed){b.velocity*=slow?.7f:1/.7f;b.quynhSlowed=slow;}}
        }
        void EndQuynhBullet(Bullet b){if(!b.quynhBurst)return;QuynhFx("talisman_burst",b.position);foreach(EnemyState e in Enemies.ToArray())if(e.alive&&V2.Distance(e.position,b.position)<110/64f*Reach)QuynhHit(e,Player.damage*1.5f);}
        void ClearQuynh(){Quynh.fields.Clear();Quynh.pending=null;Quynh.ward=Quynh.recast=Quynh.agile=0;}
        void RestoreQuynh(RunSave data){
            if(!IsQuynh||data.quynh==null)return;QuynhState s=data.quynh;
            Quynh=new QuynhState{coins=(int)Safe(s.coins,0,6),coinAttack=(int)Safe(s.coinAttack,0,1000000000),coinShield=Safe(s.coinShield,0,Math.Min(65,Player.shield)),ward=Safe(s.ward,0,45),wardTick=Safe(s.wardTick,0,.55f),recast=Safe(s.recast,0,4),agile=Safe(s.agile,0,2),empowered=s.empowered};
            ChooseQuynhSpecialization("q",s.qSpec);ChooseQuynhSpecialization("e",s.eSpec);ChooseQuynhSpecialization("r",s.rSpec);
            if(s.fields!=null)foreach(QuynhField f in s.fields){
                if(f==null||Quynh.fields.Count>=24||f.kind!="bagua-stake"&&f.kind!="heaven-seal"&&f.kind!="cinnabar-fire"||Safe(f.life,0,180)<=0||float.IsNaN(f.position.x)||float.IsNaN(f.position.y)||float.IsInfinity(f.position.x)||float.IsInfinity(f.position.y))continue;
                if(f.kind=="bagua-stake"&&Quynh.fields.FindAll(x=>x.kind=="bagua-stake").Count>=2)continue;
                Quynh.fields.Add(new QuynhField{kind=f.kind,position=new V2(Safe(f.position.x,1,Width-1),Safe(f.position.y,1,Height-1)),life=Safe(f.life,0,180),radius=Safe(f.radius,.01f,35),power=Safe(f.power,0,50000),tick=Safe(f.tick,0,1),extraStrikes=(int)Safe(f.extraStrikes,0,10)});
            }
            foreach(EnemyState e in Enemies){e.talismanMarks=(int)Safe(e.talismanMarks,0,4);e.talismanTime=Safe(e.talismanTime,0,6);e.talismanSlow=Safe(e.talismanSlow,0,1.5f);e.talismanSlowFactor=Safe(e.talismanSlowFactor,.5f,1,1);}
            ActorAction a=s.pending;if(Player.ultIntro==null&&a!=null&&!a.released&&(a.key=="q"||a.key=="e")&&Math.Abs(a.target.x)<Width&&Math.Abs(a.target.y)<Height){
                Player.action=Action(a.key,null,Player.position,a.target,0);Player.action.release=.14f;Player.action.elapsed=Safe(a.elapsed,0,.14f);Quynh.pending=Player.action;
            }
        }
    }
}
