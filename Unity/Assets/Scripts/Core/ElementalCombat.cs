using System;
using System.Collections.Generic;

namespace DenTinh.Core {
    public sealed partial class Simulation {
        public readonly List<CloneState> Clones=new List<CloneState>();
        public readonly List<SummonState> Summons=new List<SummonState>();
        public readonly List<ElementField> ElementFields=new List<ElementField>();
        readonly List<ElementStrike> strikes=new List<ElementStrike>();
        public float SplitTime,SplitCooldown;
        public bool IsElemental {get{return Hero.id=="thienvu";}}
        static readonly string[] elementIds={"lightning","wind","earth","fire","ice","nature","light"};
        public static string MoveDirection(V2 v){return v.x<-.05f?"W":v.x>.05f?"E":v.y>.05f?"N":"S";}
        public static float BodyAngle(string direction){return direction=="W"?3.14159265f:direction=="N"?1.5707963f:direction=="S"?-1.5707963f:0;}
        static float Safe(float n,float min,float max,float fallback=0){return float.IsNaN(n)||float.IsInfinity(n)?fallback:Mathx.Clamp(n,min,max);}
        string ElementId(string id){return id=="wood"?"nature":Array.IndexOf(elementIds,id)>=0?id:"lightning";}
        public ElementDef Element(string id){return Array.Find(Content.elements,e=>e.id==ElementId(id));}
        V2 MoveEnemy(EnemyState e,V2 delta,float radius){return e.rooted>0?e.position:Move(e.position,delta,radius);}
        public bool TransformElement(string id){if(!IsElemental||Dead||Array.IndexOf(elementIds,id=="wood"?"nature":id)<0)return false;Player.element=ElementId(id);ElementFx("transform_ring_"+Player.element,Player.position,Player.element,.55f);if(SplitTime>0){int count=Player.splitCount;Clones.RemoveAll(c=>c.element==Player.element);foreach(string form in elementIds)if(form!=Player.element&&!Clones.Exists(c=>c.element==form)&&Clones.Count<count-1)Clones.Add(NewClone(form,Clones.Count));}return true;}
        CloneState NewClone(string id,int index){V2 at=Move(Player.position,V2.Angle(index*Mathx.Tau/6)*1.6f,.22f);return new CloneState{id="clone-"+(++Serial),element=id,position=at,hp=Player.maxHp*.42f,maxHp=Player.maxHp*.42f,attackCd=.35f+index*.1f,qCd=1+index*.2f,eCd=2+index*.25f,rCd=4+index*.3f};}
        public bool SplitElementals(int count){
            if(!IsElemental||Paused||Dead||(count!=3&&count!=5&&count!=7))return false;
            if(SplitTime>0){Clones.Clear();SplitTime=0;return true;}
            float cost=count==3?30:count==5?45:60;if(SplitCooldown>0||Player.mp<cost)return false;
            Player.splitCount=count;Player.mp-=cost;SplitTime=count==3?10:count==5?12:14;SplitCooldown=count==3?18:count==5?24:30;
            foreach(string id in elementIds)if(id!=Player.element&&Clones.Count<count-1)Clones.Add(NewClone(id,Clones.Count));
            ElementFx("split_matrix",Player.position,Player.element,.55f);skills++;return true;
        }
        public void CancelElements(){Clones.Clear();Summons.Clear();ElementFields.Clear();strikes.Clear();SplitTime=0;Player.action=null;Player.hoverboard=0;Player.motionEpoch++;}
        public void TeleportPlayer(V2 at){if(Collides(at,.2f))return;Player.position=at;Player.motionEpoch++;Player.action=null;strikes.RemoveAll(s=>s.owner=="player");}
        ActorAction Action(string key,string element,V2 from,V2 target,int epoch){return new ActorAction{key=key,element=element,target=target,angle=Mathx.Angle(target-from),release=key=="attack"?.08f:key=="r"?.3f:.18f,duration=key=="attack"?.32f:key=="r"?.85f:.6f,epoch=epoch};}
        bool FireElement(){if(Paused||Dead||Player.fireTimer>0||Player.dashTime>0||Player.action!=null||Active.reload>0)return false;if(Active.ammo<=0){Reload();return false;}Active.ammo--;Player.fireTimer=.28f;Player.action=Action("attack",Player.element,Player.position,Input.aim,Player.motionEpoch);shots++;return true;}
        bool ElementSkill(string key){
            PlayerState p=Player;if(Paused||Dead||p.action!=null||(key!="q"&&key!="e"&&key!="r"))return false;
            float cost=key=="q"?24:key=="e"?38:0;if(p.mp<cost||key=="q"&&p.qTimer>0||key=="e"&&p.eTimer>0||key=="r"&&p.ult<100)return false;
            p.mp-=cost;if(key=="q")p.qTimer=6;if(key=="e")p.eTimer=10;if(key=="r"){p.ult=0;p.invulnerable=1.2f;ClearBullets(p.position,9.4f);}p.action=Action(key,p.element,p.position,Input.aim,p.motionEpoch);skills++;return true;
        }
        void UpdateAction(CloneState clone,float dt){
            ActorAction action=clone==null?Player.action:clone.action;if(action==null)return;int epoch=clone==null?Player.motionEpoch:clone.motionEpoch;
            if(action.epoch!=epoch){if(clone==null)Player.action=null;else clone.action=null;return;}
            action.elapsed+=dt;if(!action.released&&action.elapsed>=action.release){action.released=true;bool leader=clone==null;
                if(action.key=="attack")ElementPrimary(action.element,clone,action.target,Player.damage*(leader?1:.62f),leader);
                else{CastElement(action.element,action.key,clone,action.target,leader&&action.key!="r",leader?1:.62f);if(leader&&action.key=="r"&&Clones.Count>0){foreach(CloneState c in Clones)if(c.alive)CastElement(c.element,"r",c,action.target,false,.18f);ElementFx("convergence_hub",action.target,action.element,.8f);}}
            }
            if(action.elapsed>=action.duration){if(clone==null)Player.action=null;else clone.action=null;}
        }
        public void ElementFx(string clip,V2 at,string element,float duration,float angle=0,V2? end=null){Effects.Add(new Effect{kind="element",clip=clip,element=element,position=at,end=end??at,color=Element(element).color,time=duration,maxTime=duration,angle=angle});}
        void Status(EnemyState e,string id,float power,bool strong){if(!e.alive)return;if(id=="ice"){e.slow=Math.Max(e.slow,1.8f);if(strong)e.frozen=2;}if(id=="lightning"&&strong)e.stunned=.8f;if(id=="fire"){e.burn=2.6f;e.burnTick=0;}if(id=="nature"){e.poison=3;e.poisonPower=power*.12f;if(strong)e.rooted=2.5f;}}
        void ElementArea(V2 at,float radius,float power,string id,bool charge,bool strong=false){ReactEnvironment(id,at,radius,power);foreach(EnemyState e in Enemies.ToArray())if(e.alive&&V2.Distance(e.position,at)<radius+e.radius){DamageEnemy(e,power,charge);Status(e,id,power,strong);}}
        void ElementBeam(V2 from,V2 end,float width,float power,string id,bool charge){
            V2 delta=end-from;float length=Math.Min(12.5f,delta.Length);V2 direction=delta.Unit;
            for(float d=.375f;d<length;d+=.1875f)if(Collides(from+direction*d,.03f)){length=d;break;}end=from+direction*length;
            foreach(EnemyState e in Enemies.ToArray())if(e.alive&&Segment(e.position,from,end)<width+e.radius){DamageEnemy(e,power,charge);Status(e,id,power,id=="lightning");}
            ElementFx(id=="light"?"solar_beam":id=="lightning"?"chain_bolt":"vine_whip",from,id,.55f,Mathx.Angle(delta),end);
        }
        void ElementShot(string id,CloneState actor,V2 target,float power,bool charge,float offset=0,bool returning=false){V2 from=actor==null?Player.position:actor.position;Shoot(from,Mathx.Angle(target-from)+offset,id=="light"?18:12.65f,power,true,"element",Element(id).color,id=="light"?3:id=="wind"?1:0,"",charge);Bullet b=Bullets[Bullets.Count-1];b.element=id;b.owner=actor==null?"player":actor.id;b.returning=returning;b.life=1.1f;}
        void ElementPrimary(string id,CloneState actor,V2 target,float power,bool charge){
            V2 at=actor==null?Player.position:actor.position;float angle=Mathx.Angle(target-at);
            if(id=="lightning"||id=="earth"||id=="ice"||id=="nature"){float reach=(id=="nature"?165:id=="earth"?95:110)/64f;foreach(EnemyState e in Enemies.ToArray())if(e.alive&&V2.Distance(e.position,at)<reach+e.radius&&Math.Cos(Mathx.Angle(e.position-at)-angle)>.25){DamageEnemy(e,power*(id=="earth"?1.4f:1.1f),charge);Status(e,id,power,false);}ElementFx(id=="nature"?"giant_vine":id=="earth"?"earth_tremor":"impact_"+id,at,id,.22f,angle);}
            int count=id=="wind"?3:id=="fire"||id=="ice"?2:1;for(int i=0;i<count;i++)ElementShot(id,actor,target,power*(count>1?.58f:1.05f),charge,(i-(count-1)*.5f)*.12f,id=="fire");if(id=="fire")ElementShot(id,actor,target,power*.65f,charge);
        }
        void Field(string id,string behavior,CloneState actor,V2 at,float radius,float life,float power,bool charge,bool follow=false,float angle=0,float travel=0,float delay=0){ElementFields.Add(new ElementField{element=id,behavior=behavior,owner=actor==null?"player":actor.id,epoch=actor==null?Player.motionEpoch:actor.motionEpoch,position=at,radius=radius,life=life,power=power,charge=charge,follow=follow,angle=angle,travel=travel,delay=delay});}
        void Strike(string id,string clip,CloneState actor,V2 at,float delay,float radius,float power,bool charge,bool strong){strikes.Add(new ElementStrike{element=id,clip=clip,owner=actor==null?"player":actor.id,epoch=actor==null?Player.motionEpoch:actor.motionEpoch,position=at,delay=delay,radius=radius,power=power,charge=charge,strong=strong});}
        public void CastElement(string id,string key,CloneState actor,V2 target,bool charge=false,float scale=1){
            id=ElementId(id);V2 at=actor==null?Player.position:actor.position;float power=Player.damage*scale,angle=Mathx.Angle(target-at);V2 direction=(target-at).Unit;if(direction.Length<.01f)direction=new V2(1,0);
            if(V2.Distance(target,at)>9.4f)target=at+direction*9.4f;
            if(key=="q"){
                if(id=="lightning"){V2 next=Move(at,direction*3.05f,.22f);if(actor==null)Player.position=next;else actor.position=next;for(int i=0;i<4;i++)ElementFx("transform_pillar_lightning",at+(next-at)*(i/4f),id,.26f);ElementBeam(at,next+direction*1.25f,.4375f,power*3.5f,id,charge);}
                else if(id=="wind")for(int i=-1;i<=1;i+=2)Field(id,"tornado",actor,at+V2.Angle(angle+i*.35f)*.56f,1.22f,3.6f,power*.55f,charge,false,angle+i*.18f,1.56f);
                else if(id=="earth")for(int i=1;i<=7;i++)Strike(id,"earth_spikes",actor,at+direction*(i*.90625f),i*.09f,.9375f,power*1.7f,charge,true);
                else if(id=="ice"){ElementArea(target,2.265625f,power*3.8f,id,charge,true);ElementFx("ice_mountain",target,id,.8f);}
                else if(id=="nature"){ElementArea(target,2.578125f,power*2.7f,id,charge,true);Field(id,"root",actor,target,2.578125f,2.5f,power*.35f,charge);}
                else if(id=="fire")Field(id,"fire_breath",actor,at,3.28125f,1.1f,power*.75f,charge,true,angle);
                else{EnemyState enemy=null;float score=float.MaxValue;foreach(EnemyState e in Enemies)if(e.alive&&V2.Distance(e.position,at)<=5.3125f&&V2.Distance(e.position,target)<score){enemy=e;score=V2.Distance(e.position,target);}if(enemy!=null){V2 back=enemy.position-(Player.position-enemy.position).Unit*1.02f;if(!Collides(back,.22f)){ElementFx("solar_beam",at,id,.08f,Mathx.Angle(back-at),back);if(actor==null){TeleportPlayer(back);Player.invulnerable=.25f;}else{actor.position=back;actor.motionEpoch++;}float crit=Player.crit;try{Player.crit=1;DamageEnemy(enemy,power*3,charge);}finally{Player.crit=crit;}}}else ElementBeam(at,target,.4375f,power*4.5f,id,charge);}
            }else if(key=="e"){
                if(id=="lightning")Field(id,"lightning_prison",actor,at,2.421875f,4,power*.9f,charge);
                else if(id=="wind"){if(actor==null)Player.hoverboard=4.5f;else actor.hoverboard=4.5f;Field(id,"hoverboard",actor,at,2.1f,4.5f,power*.3f,charge,true);}
                else if(id=="earth"){for(int i=1;i<=3;i++)Strike(id,"earth_tremor",actor,at,i*.12f,i*1.09375f,power*1.3f,charge,true);if(actor==null)Player.shield=Math.Min(110,Player.shield+45);}
                else if(id=="ice")Field(id,"blizzard",actor,target,2.8125f,4.5f,power*.65f,charge);
                else if(id=="fire")Field(id,"meteor",actor,target,2.421875f,5.5f,power*.8f,charge,false,0,0,.5f);
                else if(id=="nature"){foreach(EnemyState e in Enemies.ToArray())if(e.alive&&V2.Distance(e.position,at)<4.0625f+e.radius&&Math.Cos(Mathx.Angle(e.position-at)-angle)>=0){DamageEnemy(e,power*3.8f,charge);Status(e,id,power,true);}ElementFx("giant_vine",at,id,.6f,angle);}
                else{V2 end=at+direction*8.75f;ElementBeam(at,end,.4375f,power*7,id,charge);Bullets.RemoveAll(b=>!b.friendly&&Segment(b.position,at,end)<.4375f+b.radius);}
            }else if(key=="r"){
                if(id=="earth")Summon("golem",target,power,18,null);
                else if(id=="nature"){List<Prop> trees=Props.FindAll(p=>(p.type=="tree"||p.type=="bamboo"||p.type=="banyan")&&V2.Distance(p.position,at)<5&&!Summons.Exists(s=>s.sourceProp==p));for(int i=0;i<3;i++){Prop tree=i<trees.Count?trees[i]:null;Summon("treant",tree==null?at+V2.Angle(i*Mathx.Tau/3):tree.position,power,30,tree);}}
                else if(id=="fire")Field(id,"meteor",actor,target,3.44f,5.5f,power*1.2f,charge,false,0,0,.5f);
                else if(id=="ice"){ElementArea(target,4.06f,power*5.5f,id,charge,true);Field(id,"blizzard",actor,target,4.06f,4,power*.7f,charge);}
                else if(id=="wind"){Field(id,"hurricane",actor,target,5.625f,5,power*.85f,charge);ClearBullets(target,5.625f);}
                else if(id=="lightning"){Field(id,"sword_array",actor,target,2.578125f,4,power*1.1f,charge);for(int i=0;i<8;i++)Strike(id,"lightning_swords",actor,target+V2.Angle(i*Mathx.Tau/8)*2.03f,i*.1f,1.56f,power*2,charge,true);}
                else{V2 end=at+direction*8.75f;ElementBeam(at,end,.4375f,power*8.5f,id,charge);Bullets.RemoveAll(b=>!b.friendly&&Segment(b.position,at,end)<.4375f+b.radius);}
            }
        }
        bool Owner(string id,int epoch,out V2 at){at=Player.position;if(id=="player")return !Dead&&Player.motionEpoch==epoch;CloneState c=Clones.Find(x=>x.id==id&&x.alive);if(c==null||c.motionEpoch!=epoch)return false;at=c.position;return true;}
        void UpdateFields(float dt){
            foreach(ElementStrike s in strikes.ToArray()){V2 at;s.delay-=dt;if(!Owner(s.owner,s.epoch,out at)){strikes.Remove(s);continue;}if(s.delay>0)continue;ElementArea(s.position,s.radius,s.power,s.element,s.charge,s.strong);ElementFx(s.clip,s.position,s.element,.6f);strikes.Remove(s);}
            foreach(ElementField f in ElementFields.ToArray()){
                V2 owner;if(!Owner(f.owner,f.epoch,out owner)){ElementFields.Remove(f);continue;}f.life-=dt;f.tick-=dt;if(f.follow)f.position=owner;if(f.travel>0)f.position=Move(f.position,V2.Angle(f.angle)*f.travel*dt,.1f);
                if(f.life<=0){if(f.behavior=="fire_breath"){CloneState c=Clones.Find(x=>x.id==f.owner);for(int i=-1;i<=1;i++)ElementShot("fire",c,owner+V2.Angle(f.angle)*6,f.power*1.8f,f.charge,i*.12f);}ElementFields.Remove(f);continue;}
                if(f.delay>0){f.delay-=dt;if(f.delay<=0){ElementArea(f.position,f.radius,f.power*5,"fire",f.charge,true);ElementFx("meteor_burst",f.position,"fire",.8f);}continue;}
                if(f.tick>0)continue;f.tick=f.behavior=="fire_breath"?.12f:.45f;
                foreach(EnemyState e in Enemies.ToArray())if(e.alive&&V2.Distance(e.position,f.position)<f.radius+e.radius){if(f.behavior=="fire_breath"&&Math.Cos(Mathx.Angle(e.position-f.position)-f.angle)<Math.Cos(.5))continue;DamageEnemy(e,f.power,f.charge);Status(e,f.element,f.power,f.behavior=="blizzard"||f.behavior=="root"||f.behavior=="lightning_prison");if(f.behavior=="tornado"||f.behavior=="hurricane")e.position=MoveEnemy(e,(f.position-e.position).Unit*.4f,e.radius);if(f.behavior=="lightning_prison")ElementFx("sky_thunder",e.position,f.element,.3f);}
                if(f.behavior=="tornado"||f.behavior=="hurricane")ClearBullets(f.position,f.radius);
                if(f.behavior=="hoverboard"){EnemyState e=Nearest(owner,7.8f);if(e!=null)ElementPrimary("wind",Clones.Find(c=>c.id==f.owner),e.position,f.power,f.charge);}
                if(f.behavior=="sword_array")for(int i=0;i<4;i++){V2 d=V2.Angle(i*Mathx.Tau/8)*f.radius;ElementBeam(f.position+d,f.position-d,.1875f,f.power,f.element,false);}
            }
        }
        void Summon(string kind,V2 at,float power,float life,Prop tree){if(Summons.FindAll(s=>s.kind==kind&&s.life>0).Count>=(kind=="golem"?2:6))return;V2 spot=Collides(at,.22f)?Move(Player.position,(at-Player.position).Unit,.22f):at;Summons.Add(new SummonState{id="summon-"+(++Serial),kind=kind,owner="player",position=spot,sourceProp=tree,hp=Player.maxHp*(kind=="golem"?2:1),maxHp=Player.maxHp*(kind=="golem"?2:1),radius=kind=="golem"?.45f:.28f,power=power,life=life,maxLife=life});}
        void UpdateSummons(float dt){foreach(SummonState s in Summons.ToArray()){s.life-=dt;s.attackCd-=dt;s.shotCd-=dt;s.moving=false;if(s.action!=null){s.action.elapsed+=dt;if(s.action.elapsed>=s.action.duration)s.action=null;}if(s.life<=0||s.hp<=0){Summons.Remove(s);continue;}EnemyState e=Nearest(s.position,9.375f);if(e==null)continue;float d=V2.Distance(s.position,e.position);if(d>1.17f){V2 next=Move(s.position,(e.position-s.position).Unit*(s.kind=="golem"?2.1f:2.97f)*dt,s.radius);s.moving=V2.Distance(next,s.position)>.001f;s.position=next;}if(d<1.72f&&s.attackCd<=0){s.attackCd=s.kind=="golem"?1.3f:1;s.action=Action("attack",s.kind=="golem"?"earth":"nature",s.position,e.position,0);ElementArea(e.position,s.kind=="golem"?1.56f:1.25f,s.power*(s.kind=="golem"?2.3f:1.5f),s.kind=="golem"?"earth":"nature",false,true);}if(s.kind=="treant"&&s.shotCd<=0){s.shotCd=1.4f;Shoot(s.position,Mathx.Angle(e.position-s.position),9,s.power*.65f,true,"element",Element("nature").color,1,"",false);Bullet b=Bullets[Bullets.Count-1];b.element="nature";b.owner=s.id;}}}
        void HurtClone(CloneState c,float amount){if(c.hurtCd>0||c.dashTime>0||amount<=0)return;c.hp-=amount;c.hurtCd=.45f;if(c.hp<=0){c.alive=false;c.action=null;}}
        void UpdateClones(float dt){
            SplitTime=Math.Max(0,SplitTime-dt);if(SplitTime<=0){Clones.Clear();return;}Dictionary<string,int> assigned=new Dictionary<string,int>();
            for(int i=0;i<Clones.Count;i++){
                CloneState c=Clones[i];if(!c.alive)continue;c.attackCd=Math.Max(0,c.attackCd-dt);c.qCd=Math.Max(0,c.qCd-dt);c.eCd=Math.Max(0,c.eCd-dt);c.rCd=Math.Max(0,c.rCd-dt);c.dashCd=Math.Max(0,c.dashCd-dt);c.hurtCd=Math.Max(0,c.hurtCd-dt);c.hoverboard=Math.Max(0,c.hoverboard-dt);
                if(V2.Distance(c.position,Player.position)>13.28f){c.position=Move(Player.position,V2.Angle(i)*1.8f,c.radius);c.action=null;c.motionEpoch++;}
                EnemyState target=null;float best=float.MaxValue;foreach(EnemyState e in Enemies)if(e.alive&&V2.Distance(e.position,c.position)<=8.59375f){int n;assigned.TryGetValue(e.id,out n);float score=V2.Distance(e.position,c.position)+(e.type=="boss"||e.miniBoss?0:n*4.6875f)+(c.targetId==e.id?-.55f:0);if(score<best){target=e;best=score;}}
                bool melee=c.element=="lightning"||c.element=="earth"||c.element=="ice",ranged=c.element=="wind"||c.element=="nature";float range=melee?.9375f:ranged?3.67f:2.31f;V2 direction=new V2();Danger danger=Dangers.Find(d=>V2.Distance(c.position,d.position)<d.radius+c.radius+.1875f);
                if(target!=null){c.targetId=target.id;c.aimAngle=Mathx.Angle(target.position-c.position);int n;assigned.TryGetValue(target.id,out n);assigned[target.id]=n+1;}else c.targetId=null;
                if(danger!=null){direction=(c.position-danger.position).Unit;if(direction.Length<.01f)direction=V2.Angle(i*Mathx.Tau/Math.Max(1,Clones.Count));c.aiState="flank";if(c.dashCd<=0){c.dashCd=2.4f;c.dashTime=.19f;c.dashDirection=direction;c.action=null;}}
                else if(target!=null){float d=V2.Distance(c.position,target.position);V2 n=(target.position-c.position).Unit;direction=n*(d>range+.28f?1:d<range-.28f?-1:0);c.aiState=ranged&&d<1.5625f?"kite":melee?"hunt":"flank";if(!melee)direction+=new V2(-n.y,n.x)*(i%2==0?.6f:-.6f);if(melee&&d>3.125f&&c.dashCd<=0){c.dashCd=2.8f;c.dashTime=.19f;c.dashDirection=n;}}
                else{c.aiState="regroup";V2 slot=Player.position+V2.Angle(i*Mathx.Tau/Math.Max(1,Clones.Count))*1.8f;if(V2.Distance(slot,c.position)>.28f)direction=(slot-c.position).Unit;}
                foreach(CloneState other in Clones)if(other!=c){float d=V2.Distance(c.position,other.position);if(d>.001f&&d<.55f)direction+=(c.position-other.position).Unit*.6f;}
                if(direction.Length>1)direction=direction.Unit;c.moving=direction.Length>.05f;if(c.moving){c.moveFacing=Mathx.Angle(direction);c.moveDir=MoveDirection(direction);}V2 old=c.position;
                if(c.dashTime>0){c.dashTime=Math.Max(0,c.dashTime-dt);c.position=Move(c.position,c.dashDirection*11.4f*dt,c.radius);}else c.position=Move(c.position,direction*c.speed*(c.hoverboard>0?1.65f:1)*dt,c.radius);c.velocity=dt>0?(c.position-old)/dt:new V2();UpdateAction(c,dt);
                if(target!=null&&c.action==null&&danger==null){float d=V2.Distance(c.position,target.position);int cluster=Enemies.FindAll(e=>e.alive&&V2.Distance(e.position,target.position)<2.73f).Count;bool heavy=target.type=="boss"||target.miniBoss||target.hp>=Player.damage*18;string key=null;if(c.rCd<=0&&(heavy||cluster>=3)){c.rCd=11+i*.6f;key="r";}else if(c.eCd<=0&&(heavy||cluster>=2)){c.eCd=5.8f+i*.35f;key="e";}else if(c.qCd<=0&&d<7.8125f){c.qCd=3.2f+i*.25f;key="q";}else if(c.attackCd<=0&&d<(melee?1.64f:ranged?5.625f:4.375f)){c.attackCd=.65f+i*.03f;key="attack";}if(key!=null)c.action=Action(key,c.element,c.position,target.position,c.motionEpoch);if(d<c.radius+target.radius)HurtClone(c,target.damage);}
            }
            Clones.RemoveAll(c=>!c.alive);
        }
        void UpdateElements(float dt){if(!IsElemental)return;SplitCooldown=Math.Max(0,SplitCooldown-dt);Player.hoverboard=Math.Max(0,Player.hoverboard-dt);UpdateAction(null,dt);UpdateClones(dt);UpdateSummons(dt);UpdateFields(dt);}
        void ElementBulletHit(Bullet b,EnemyState e){Status(e,b.element,b.damage,false);if(b.element=="lightning"){EnemyState from=e;HashSet<string> seen=new HashSet<string>();seen.Add(e.id);for(int i=0;i<2;i++){EnemyState next=null;float range=2.42f;foreach(EnemyState other in Enemies)if(other.alive&&!seen.Contains(other.id)&&V2.Distance(other.position,from.position)<range){next=other;range=V2.Distance(other.position,from.position);}if(next==null)break;seen.Add(next.id);DamageEnemy(next,b.damage*.24f,false);ElementFx("chain_bolt",from.position,"lightning",.2f,0,next.position);from=next;}}}
        void UpdateElementBullet(Bullet b,float dt){if(!b.returning||b.life>.55f)return;CloneState c=Clones.Find(x=>x.id==b.owner&&x.alive);if(b.owner!="player"&&c==null){b.life=0;return;}V2 at=c==null?Player.position:c.position;b.velocity=(at-b.position).Unit*12;if(V2.Distance(at,b.position)<.3f)b.life=0;}
        void InterceptElementBullet(Bullet b,V2 old){foreach(SummonState s in Summons)if(s.kind=="golem"&&s.hp>0&&Segment(s.position,old,b.position)<s.radius+b.radius){s.hp-=b.damage;b.life=0;return;}foreach(CloneState c in Clones)if(c.alive&&Segment(c.position,old,b.position)<c.radius+b.radius){HurtClone(c,b.damage);b.life=0;return;}}
        List<CloneState> CaptureClones(){List<CloneState> result=new List<CloneState>();foreach(CloneState c in Clones)if(c.alive)result.Add(new CloneState{id=c.id,element=c.element,position=c.position,hp=c.hp,maxHp=c.maxHp,moveDir=c.moveDir,moveFacing=c.moveFacing,attackCd=c.attackCd,qCd=c.qCd,eCd=c.eCd,rCd=c.rCd,dashCd=c.dashCd});return result;}
        void RestoreElements(RunSave data){Player.action=null;Player.hoverboard=0;Player.element=ElementId(Player.element);Player.splitCount=Player.splitCount==5?5:Player.splitCount==7?7:3;Player.moveFacing=Safe(Player.moveFacing,-Mathx.Tau,Mathx.Tau,-1.5707963f);if(Player.moveDir!="W"&&Player.moveDir!="E"&&Player.moveDir!="N")Player.moveDir="S";if(!IsElemental)return;SplitTime=Safe(data.splitTime,0,14);SplitCooldown=Safe(data.splitCooldown,0,30);HashSet<string> seen=new HashSet<string>();seen.Add(Player.element);if(data.clones!=null&&SplitTime>0)foreach(CloneState saved in data.clones){if(saved==null||!seen.Add(saved.element)||Array.IndexOf(elementIds,saved.element)<0||saved.hp<=0||Clones.Count>=Player.splitCount-1)continue;CloneState c=NewClone(saved.element,Clones.Count);V2 at=new V2(Safe(saved.position.x,1,59,Player.position.x),Safe(saved.position.y,1,44,Player.position.y));c.position=Collides(at,c.radius)?Player.position:at;c.hp=Safe(saved.hp,1,c.maxHp,c.maxHp);c.moveDir=saved.moveDir=="W"||saved.moveDir=="E"||saved.moveDir=="N"?saved.moveDir:"S";c.moveFacing=Safe(saved.moveFacing,-Mathx.Tau,Mathx.Tau);c.attackCd=Safe(saved.attackCd,0,2);c.qCd=Safe(saved.qCd,0,4.8f);c.eCd=Safe(saved.eCd,0,8);c.rCd=Safe(saved.rCd,0,15);c.dashCd=Safe(saved.dashCd,0,3);Clones.Add(c);}}
    }
}
