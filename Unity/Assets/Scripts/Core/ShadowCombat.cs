using System;
using System.Collections.Generic;

namespace DenTinh.Core {
    public sealed partial class Simulation {
        public readonly List<ShadowRemain> ShadowRemains=new List<ShadowRemain>();
        public readonly List<ShadowUnit> ShadowArmy=new List<ShadowUnit>();
        public float ShadowFrenzy;float shadowPulse,shadowCounter;
        public bool IsShadow {get{return Hero.id=="quanle";}}
        static readonly HashSet<string> shadowTrees=new HashSet<string>{"tree","bamboo","willow","banyan","pine","deadTree"};
        ShadowSpec ShadowDefinition(string id){return Content.shadows==null?null:Array.Find(Content.shadows,s=>s.id==id);}
        void ShadowFx(string clip,V2 at,float duration=.6f,float angle=0){Effects.Add(new Effect{kind="shadow",clip="shadow_"+clip,position=at,time=duration,maxTime=duration,color="#b86bff",angle=angle});}
        public void RecordShadow(Prop p){if(p==null||p.damageStage<2||p.shadowRecorded||!shadowTrees.Contains(p.type))return;p.shadowRecorded=true;AddShadowRemain(p.position,"tree",p.type);}
        void AddShadowRemain(V2 at,string source,string type){ShadowRemains.Add(new ShadowRemain{position=at,sourceType=source,enemyType=type,variant=source=="tree"?new[]{"shadow_treant","shadow_vine_hydra","shadow_thorn_stalker"}[Rng.Next(3)]:null});if(ShadowRemains.Count>384)ShadowRemains.RemoveAt(0);}
        string ShadowKind(ShadowRemain r){if(r==null)return Content.shadows[Rng.Next(Content.shadows.Length)].id;if(r.sourceType=="tree")return "shadow_treant";switch(r.enemyType){case "boar":return "shadow_boar";case "slime":return "shadow_spider";case "wisp":return "shadow_bat";case "archer":return "shadow_stag";case "shade":return "shadow_panther";default:return ShadowKind(null);}}
        V2 ShadowFormation(int index){float a=index*Mathx.Tau/14;return Player.position+new V2((float)Math.Cos(a)*250/64,(float)Math.Sin(a)*180/64);}
        V2 ShadowSpot(V2 desired,float radius=.3f){if(!Collides(desired,radius))return desired;for(int i=0;i<24;i++){V2 at=desired+V2.Angle(i*Mathx.Tau/12)*(.5f+(i/12)*.5f);if(!Collides(at,radius))return at;}return Player.position;}
        public ShadowUnit SpawnShadow(string kind,V2 at,float life=22,string variant=null){
            ShadowSpec spec=ShadowDefinition(kind);if(spec==null||ShadowArmy.Count>=14)return null;
            ShadowUnit s=new ShadowUnit{id="shadow-"+(++Serial),kind=kind,variant=variant=="shadow_vine_hydra"||variant=="shadow_thorn_stalker"?variant:null,position=spec.flying?at:ShadowSpot(at),radius=spec.r/64,hp=spec.hp,maxHp=spec.hp,power=Player.damage*(1+.08f*Player.eRank),life=life,maxLife=life};ShadowArmy.Add(s);ShadowFx("portal",s.position);return s;
        }
        bool FireShadow(){if(Paused||Dead||Player.fireTimer>0||Player.dashTime>0)return false;Player.fireTimer=Hero.fireRate;float angle=Mathx.Angle(Input.aim-Player.position);Player.action=Action("attack","shadow",Player.position,Input.aim,Player.motionEpoch);Player.action.released=true;Shoot(Player.position,angle,680/64f,Player.damage*1.15f,true,"shadow-crescent","#b86bff",4,"",true);shots++;return true;}
        bool ShadowSkill(string key){
            PlayerState p=Player;if(Paused||Dead||(key!="q"&&key!="e"&&key!="r")||p.action!=null&&p.action.elapsed<p.action.duration)return false;
            float cost=key=="q"?28:key=="e"?32:0;if(p.mp<cost||key=="q"&&p.qTimer>0||key=="e"&&p.eTimer>0||key=="r"&&p.ult<100)return false;
            p.mp-=cost;if(key=="q")p.qTimer=9;if(key=="e")p.eTimer=7;if(key=="r")p.ult=0;p.action=Action(key,"shadow",p.position,Input.aim,p.motionEpoch);p.action.released=true;skills++;
            if(key=="q"){p.shadowArmor=6.5f;p.shield=Math.Min(130,p.shield+48+10*p.qRank);shadowPulse=0;ShadowFx("armor",p.position);return true;}
            foreach(Prop prop in Props)if(V2.Distance(prop.position,p.position)<(key=="r"?420:260)/64f)RecordShadow(prop);
            List<ShadowRemain> remains=ShadowRemains.FindAll(r=>r.life>0&&V2.Distance(r.position,p.position)<=(key=="r"?420:260)/64f);remains.Sort((a,b)=>V2.Distance(a.position,p.position).CompareTo(V2.Distance(b.position,p.position)));
            if(key=="e"){
                ShadowRemain source=remains.Count>0?remains[0]:null;string kind=ShadowKind(source);if(source!=null)source.life=0;
                if(ShadowArmy.Count>=6){ShadowUnit s=ShadowArmy[0];foreach(ShadowUnit unit in ShadowArmy)if(unit.life<s.life)s=unit;s.life=Math.Max(s.life,22);s.hp=Math.Min(s.maxHp,s.hp+s.maxHp*.5f);s.power=Math.Min(p.damage*3,s.power*1.12f);}
                else SpawnShadow(kind,source==null?p.position+V2.Angle(p.facing):source.position,22,source==null?null:source.variant);return true;
            }
            // ponytail: 14 bodies; extra souls raise their power, keeping native and web armies bounded.
            List<string> chosen=new List<string>();foreach(ShadowRemain r in remains){r.life=0;string id=ShadowKind(r);if(!chosen.Contains(id))chosen.Add(id);ShadowFx("soul",r.position);}
            foreach(string id in new[]{"wolf","bear","eagle","tiger","rhino","shark","dragon","spider","cobra","lion","gorilla","treant","panther","stag"})if(!chosen.Contains("shadow_"+id))chosen.Add("shadow_"+id);
            ShadowArmy.Clear();ShadowFrenzy=24;for(int i=0;i<14;i++){ShadowUnit s=SpawnShadow(chosen[i],ShadowFormation(i),24);if(s!=null)s.power*=1+Math.Min(12,Math.Max(0,remains.Count-14))*.025f;}p.invulnerable=Math.Max(p.invulnerable,.6f);ShadowFx("legion",p.position,1.2f);return true;
        }
        int ShadowArea(ShadowUnit s,V2 at,float pixels,float multiplier,string status=null,string terrain=null){int hits=0;foreach(EnemyState e in Enemies.ToArray())if(e.alive&&V2.Distance(e.position,at)<pixels/64+e.radius){DamageEnemy(e,s.power*multiplier,false);hits++;if(status=="stun")e.stunned=1.2f;if(status=="root")e.rooted=1.5f;if(status=="web")e.rooted=2;if(status=="poison"){e.poison=4;e.poisonPower=s.power*.18f;e.shadowCorrosion=4;}if(status=="bleed"){e.shadowBleed=3;e.shadowBleedPower=s.power*.22f;}if(status=="fire"){e.burn=3;e.burnTick=0;}e.position=MoveEnemy(e,(e.position-at).Unit*.22f,e.radius);}if(terrain!=null)ReactEnvironment(terrain,at,pixels/64,90);return hits;}
        void ShadowShot(ShadowUnit s,float angle,int pierce=1,bool venom=false){Shoot(s.position,angle,8.75f,s.power*.85f,true,"shadow-crescent","#b84dff",pierce,"",false);Bullets[Bullets.Count-1].shadowPoison=venom;}
        public void ShadowAttack(ShadowUnit s,EnemyState e){
            ShadowSpec spec=ShadowDefinition(s.kind);if(spec==null||e==null||!e.alive)return;float a=Mathx.Angle(e.position-s.position);s.aimAngle=a;s.action=Action("attack","shadow",s.position,e.position,0);s.action.duration=.6f;s.attackCd=(spec.behavior=="stomp"||spec.behavior=="darkfire"||spec.behavior=="quake"||spec.behavior=="web"?2.5f:1.05f)/(ShadowFrenzy>0?1.4f:1);
            switch(spec.behavior){
                case "bite":ShadowArea(s,e.position,35,1.45f,"bleed");break;
                case "claw":ShadowArea(s,e.position,95,2,"stun","physical");break;
                case "feather":for(int i=-1;i<=1;i++)ShadowShot(s,a+i*.2f);ShadowArea(s,e.position,45,1);break;
                case "pounce":s.position=Move(s.position,V2.Angle(a)*Math.Min(180/64f,V2.Distance(s.position,e.position)),s.radius);float crit=Player.crit;try{if(Rng.NextDouble()<.5)Player.crit=1;ShadowArea(s,e.position,65,2.2f);}finally{Player.crit=crit;}break;
                case "blink":s.position=ShadowSpot(e.position-V2.Angle(e.facing)*55/64f);ShadowArea(s,e.position,60,2.4f);break;
                case "roar":foreach(EnemyState other in Enemies)if(other.alive&&V2.Distance(other.position,s.position)<150/64f){other.slow=2;other.shadowFear=1.2f;other.fearOrigin=s.position;}ShadowArea(s,e.position,55,1.6f);ShadowFx("roar",s.position);break;
                case "quake":ShadowArea(s,e.position,120,2.4f,"stun","earth");break;
                case "charge":case "rush":case "dive":{
                    V2 old=s.position,desired=old+V2.Angle(a)*(spec.behavior=="charge"?240:180)/64f;s.position=spec.flying?desired:Move(old,desired-old,s.radius);foreach(EnemyState t in Enemies.ToArray())if(t.alive&&Segment(t.position,old,s.position)<s.radius+t.radius+.23f)DamageEnemy(t,s.power*2.4f,false);for(int i=0;i<4;i++)ReactEnvironment("earth",old+(s.position-old)*(i/3f),55/64f,100);break;}
                case "stomp":ShadowArea(s,s.position,165,2.3f,"stun","earth");break;
                case "antlers":for(int i=-1;i<=1;i++)ShadowShot(s,a+i*.22f,3);break;
                case "venom":for(int i=-1;i<=1;i++)ShadowShot(s,a+i*.25f,1,true);ShadowArea(s,e.position,75,.6f,"poison");break;
                case "sting":ShadowArea(s,e.position,45,2.5f,"root");break;
                case "web":ShadowArea(s,e.position,110,1,"web");ShadowFx("web",e.position);break;
                case "tail":ShadowArea(s,e.position,95,2.2f);break;
                case "burrow":s.position=ShadowSpot(e.position);ShadowArea(s,e.position,75,2.6f,"stun");break;
                case "siphon":Player.hp=Math.Min(Player.maxHp,Player.hp+ShadowArea(s,e.position,85,1.4f)*3);ShadowShot(s,a,4);break;
                case "scythes":ShadowArea(s,e.position,80,2.7f,"bleed");ShadowFx("slash",e.position);break;
                case "pincers":ShadowArea(s,e.position,90,2.1f,"root");break;
                case "roots":ShadowArea(s,e.position,125,1.8f,"root","wind");ShadowFx("roots",e.position);break;
                case "darkfire":ShadowArea(s,e.position,150,2,"fire","fire");ShadowFx("darkfire",e.position);break;
            }ShadowFx("impact",e.position,.35f);
        }
        void ShadowCounterAttack(){if(!IsShadow||Player.shadowArmor<=0||shadowCounter>0)return;shadowCounter=.45f;ShadowArea(new ShadowUnit{power=Player.damage},Player.position,140,1.2f,"stun");ShadowFx("counter",Player.position,.45f);}
        void UpdateShadows(float dt){
            ShadowFrenzy=Math.Max(0,ShadowFrenzy-dt);shadowCounter=Math.Max(0,shadowCounter-dt);foreach(ShadowRemain r in ShadowRemains)r.life-=dt;ShadowRemains.RemoveAll(r=>r.life<=0);
            foreach(Prop prop in Props)RecordShadow(prop);
            if(Player.shadowArmor>0){Player.shadowArmor=Math.Max(0,Player.shadowArmor-dt);shadowPulse+=dt;if(shadowPulse>=.4f){shadowPulse-=.4f;int hits=ShadowArea(new ShadowUnit{power=Player.damage*(1+.05f*Player.passiveRank)},Player.position,125,.55f);Player.hp=Math.Min(Player.maxHp,Player.hp+hits*1.5f);ShadowFx("tendrils",Player.position,.3f);}}
            if(IsShadow&&Player.action!=null){Player.action.elapsed+=dt;if(Player.action.elapsed>=Player.action.duration)Player.action=null;}
            foreach(EnemyState e in Enemies.ToArray())if(e.alive){e.shadowCorrosion=Math.Max(0,e.shadowCorrosion-dt);if(e.shadowBleed>0){e.shadowBleed-=dt;e.shadowBleedTick-=dt;if(e.shadowBleedTick<=0){e.shadowBleedTick=.5f;DamageEnemy(e,e.shadowBleedPower,false);}}if(e.shadowFear>0){e.shadowFear-=dt;e.stunned=Math.Max(e.stunned,.05f);e.position=MoveEnemy(e,(e.position-e.fearOrigin).Unit*1.56f*dt,e.radius);}}
            foreach(ShadowUnit s in ShadowArmy){s.life-=dt;s.attackCd-=dt;s.hurtCd-=dt;s.moving=false;if(s.action!=null){s.action.elapsed+=dt;if(s.action.elapsed>s.action.duration)s.action=null;}if(s.hp<=0||s.life<=0)continue;
                ShadowSpec spec=ShadowDefinition(s.kind);EnemyState target=Nearest(s.position,600/64f);Danger hazard=Dangers.Find(d=>d.time>0&&V2.Distance(d.position,s.position)<d.radius+s.radius+.4f);bool ranged=spec.behavior=="antlers"||spec.behavior=="venom"||spec.behavior=="feather"||spec.behavior=="siphon"||spec.behavior=="darkfire";float reach=(ranged?250:90)/64f;V2 destination=target==null?(ShadowArmy.Count>6?ShadowFormation(ShadowArmy.IndexOf(s)):Player.position):target.position;if(hazard!=null)destination=s.position+(s.position-hazard.position).Unit*2;
                if(V2.Distance(s.position,Player.position)>17.2f)s.position=ShadowSpot(Player.position+new V2(1,0));V2 delta=destination-s.position;if(hazard!=null||delta.Length>(target==null?(ShadowArmy.Count>6?.3125f:1.56f):reach)){s.aimAngle=Mathx.Angle(delta);V2 step=delta.Unit*(spec.speed/64)*(ShadowFrenzy>0?1.4f:1)*dt;s.position=spec.flying?s.position+step:Move(s.position,step,s.radius);s.moving=true;}
                if(target!=null&&hazard==null&&V2.Distance(target.position,s.position)<reach+target.radius&&s.attackCd<=0)ShadowAttack(s,target);
                foreach(Bullet b in Bullets)if(!b.friendly&&b.life>0&&V2.Distance(b.position,s.position)<s.radius+b.radius){s.hp-=b.damage*(spec.behavior=="pincers"?.5f:1);b.life=0;}
                if(target!=null&&V2.Distance(target.position,s.position)<s.radius+target.radius+.18f&&s.hurtCd<=0){s.hp-=target.damage*(spec.behavior=="pincers"?.5f:1);s.hurtCd=.8f;}
            }ShadowArmy.RemoveAll(s=>s.life<=0||s.hp<=0);
        }
        void FinishGolemThrow(SummonState s,float dt,bool abort=false){
            GolemThrow b=s.thrown;if(b==null)return;if(abort){if(b.enemy!=null){b.enemy.throwLift=0;b.enemy.shadowHeld=false;b.enemy.stunned=0;}s.thrown=null;return;}
            b.elapsed+=dt;float t=Mathx.Clamp((b.elapsed-.25f)/.55f,0,1);b.position=b.start+(b.target-b.start)*t;b.height=(b.elapsed<.25f?1.25f:1.25f*(1-t)+(float)Math.Sin(t*Math.PI)*1.88f);
            if(b.enemy!=null&&b.enemy.alive){b.enemy.position=b.position;b.enemy.throwLift=b.height;b.enemy.stunned=Math.Max(b.enemy.stunned,.2f);}
            if(t>=1){if(b.enemy!=null){b.enemy.throwLift=0;b.enemy.shadowHeld=false;b.enemy.stunned=1;}ElementArea(b.target,120/64f,s.power*3.8f,"earth",false,true);ReactEnvironment("earth",b.target,120/64f,250);ElementFx("meteor_burst",b.target,"earth",.65f);s.thrown=null;}
        }
        public void ReleaseGolem(SummonState s,string key,EnemyState enemy){
            V2 forward=s.position+V2.Angle(s.aimAngle)*60/64f;
            if(key=="punch"){ElementArea(forward,95/64f,s.power*2.2f,"earth",false,true);ReactEnvironment("earth",forward,95/64f,125);foreach(EnemyState e in Enemies)if(e.alive&&V2.Distance(e.position,forward)<95/64f+e.radius)e.position=MoveEnemy(e,V2.Angle(s.aimAngle)*140/64f,e.radius);}
            if(key=="smash"){ElementArea(forward,135/64f,s.power*3.4f,"earth",false,true);ReactEnvironment("earth",forward,135/64f,250);ElementFx("meteor_burst",forward,"earth",.65f);}
            if(key=="stomp"){ElementArea(s.position,195/64f,s.power*1.8f,"earth",false,true);foreach(EnemyState e in Enemies)if(e.alive&&V2.Distance(e.position,s.position)<195/64f+e.radius)e.stunned=1.5f;ReactEnvironment("earth",s.position,220/64f,110);for(int i=0;i<3;i++)ElementFx("earth_tremor",s.position,"earth",.37f+i*.12f);Shake=4;}
            if(key!="throw")return;
            EnemyState grabbed=null,target=null;float near=95/64f,best=-1;foreach(EnemyState e in Enemies)if(e.alive&&!e.type.StartsWith("boss")&&V2.Distance(e.position,s.position)<near){grabbed=e;near=V2.Distance(e.position,s.position);}
            foreach(EnemyState e in Enemies)if(e.alive&&e!=grabbed&&V2.Distance(e.position,s.position)>=160/64f&&V2.Distance(e.position,s.position)<=340/64f){float score=e.type=="boss"||e.miniBoss?100:0;foreach(EnemyState t in Enemies)if(t.alive&&V2.Distance(t.position,e.position)<120/64f)score++;if(score>best){best=score;target=e;}}
            V2 at=target!=null?target.position:grabbed==null&&enemy!=null?enemy.position:s.position+V2.Angle(s.aimAngle)*240/64f;
            s.thrown=new GolemThrow{enemy=grabbed,start=s.position,target=ShadowSpot(at),position=s.position};if(grabbed!=null){grabbed.shadowHeld=true;grabbed.stunned=.8f;}else GroundTrace("crater_mark",s.position,80/64f);
        }
        void UpdateGolem(SummonState s,float dt){
            FinishGolemThrow(s,dt);s.punchCd=Math.Max(0,s.punchCd-dt);s.smashCd=Math.Max(0,s.smashCd-dt);s.stompCd=Math.Max(0,s.stompCd-dt);s.throwCd=Math.Max(0,s.throwCd-dt);s.moving=false;
            EnemyState enemy=Nearest(s.position,650/64f);if(s.action!=null&&!s.action.released&&s.action.elapsed>=s.action.release){s.action.released=true;ReleaseGolem(s,s.action.clip.Substring(6),enemy);}
            if(s.action==null&&s.thrown==null&&enemy!=null){float d=V2.Distance(enemy.position,s.position);int close=0;bool boss=false;foreach(EnemyState e in Enemies)if(e.alive&&V2.Distance(e.position,s.position)<160/64f){close++;if(e.type=="boss"||e.miniBoss)boss=true;}
                string key=s.stompCd<=0&&(close>=2||boss)?"stomp":s.throwCd<=0&&(d<95/64f||d>130/64f&&d<420/64f)?"throw":s.smashCd<=0&&d<120/64f?"smash":s.punchCd<=0&&d<95/64f?"punch":null;
                if(key!=null){if(key=="punch"){s.punchCd=1.1f;s.punchUses++;}if(key=="smash"){s.smashCd=3.2f;s.smashUses++;}if(key=="stomp"){s.stompCd=4.8f;s.stompUses++;}if(key=="throw"){s.throwCd=5.5f;s.throwUses++;}s.aimAngle=Mathx.Angle(enemy.position-s.position);s.action=Action("attack","earth",s.position,enemy.position,0);s.action.clip="golem_"+key;s.action.release=key=="punch"?.14f:.22f;s.action.duration=key=="throw"?.85f:.62f;}
            }
            V2 destination=enemy==null?Player.position:enemy.position;if(s.action==null&&s.thrown==null&&V2.Distance(destination,s.position)>(enemy==null?165:75)/64f){V2 delta=(destination-s.position).Unit*(135/64f)*dt;V2 next=Move(s.position,delta,s.radius);s.moving=V2.Distance(s.position,next)>.001f;s.position=next;}
            foreach(Bullet b in Bullets)if(!b.friendly&&b.life>0&&V2.Distance(b.position,s.position)<s.radius+b.radius){s.hp-=b.damage;b.life=0;}
        }
        void RestoreShadows(RunSave data){
            Player.shadowArmor=IsShadow?Safe(Player.shadowArmor,0,6.5f):0;Player.qRank=(int)Safe(Player.qRank,0,3);Player.eRank=(int)Safe(Player.eRank,0,3);Player.passiveRank=(int)Safe(Player.passiveRank,0,3);ShadowFrenzy=IsShadow?Safe(data.shadowFrenzy,0,24):0;Player.shield=Safe(Player.shield,0,IsShadow?130:110);
            if(data.shadowRemains!=null)foreach(ShadowRemain r in data.shadowRemains){if(r==null||ShadowRemains.Count>=384||r.sourceType!="tree"&&r.sourceType!="enemy"||float.IsNaN(r.position.x)||float.IsInfinity(r.position.x)||float.IsNaN(r.position.y)||float.IsInfinity(r.position.y))continue;ShadowRemains.Add(new ShadowRemain{position=new V2(Safe(r.position.x,0,Width),Safe(r.position.y,0,Height)),sourceType=r.sourceType,enemyType=r.enemyType,variant=r.variant,life=Safe(r.life,0,20)});}
            if(IsShadow&&data.shadowArmy!=null)foreach(ShadowUnit unit in data.shadowArmy){if(unit==null||unit.hp<=0||unit.life<=0||ShadowDefinition(unit.kind)==null||ShadowArmy.Count>=14||float.IsNaN(unit.position.x)||float.IsInfinity(unit.position.x)||float.IsNaN(unit.position.y)||float.IsInfinity(unit.position.y))continue;ShadowUnit s=SpawnShadow(unit.kind,new V2(Safe(unit.position.x,0,Width),Safe(unit.position.y,0,Height)),Safe(unit.life,0,24),unit.variant);s.hp=Safe(unit.hp,0,s.maxHp);s.power=Safe(unit.power,1,Player.damage*4);s.attackCd=.3f;}
        }
    }
}
