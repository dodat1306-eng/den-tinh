using System;

namespace DenTinh.Core {
    [Serializable] public class UltimateIntro {public string mode;public int splitCount;public float Duration {get{return mode=="split"?4.2f:4.5f;}}public float elapsed;public int pulse;public V2 target;public string element;}
    public sealed partial class Simulation {
        public float EffectiveRCd {get{return (Hero.rCd>0?Hero.rCd:IsElemental||IsShadow?20:18)*(1-.06f*Player.rRank)*(Player.Has("cooling")?.8f:1);}}
        void SyncUltimate(){Player.rCd=Safe(Player.rCd,0,20);Player.ult=Player.rCd<=0?100:Mathx.Clamp((float)Math.Floor(100*(1-Player.rCd/Math.Max(1,EffectiveRCd))),0,100);}
        public bool Skill(string key){
            PlayerState p=Player;if(Paused||Dead||p.ultIntro!=null)return false;
            if(key!="r")return ReleaseSkill(key);
            if(p.rCd>0||p.dashTime>0||p.action!=null&&p.action.key!="attack")return false;
            if(IsElemental){p.rCd=EffectiveRCd;p.action=Action("r",p.element,p.position,Input.aim,p.motionEpoch);p.action.release=.28f;p.action.duration=.78f;p.aimAngle=p.facing=p.action.angle;skills++;SyncUltimate();Emit("sound","ultimate");return true;}
            p.rCd=EffectiveRCd;p.ultIntro=new UltimateIntro{target=Input.aim,element=p.element};p.invulnerable=Math.Max(p.invulnerable,4.8f);
            p.action=Action("r",p.element,p.position,Input.aim,p.motionEpoch);p.action.duration=p.action.release=4.5f;p.action.released=true;skills++;SyncUltimate();Emit("sound","ultimate");return true;
        }
        void UpdateUltimate(float dt){
            UltimateIntro i=Player.ultIntro;if(i==null){SyncUltimate();return;}
            i.elapsed=Math.Min(i.Duration,i.elapsed+dt);int pulse=(int)((i.elapsed+.00001f)/.8f);
            if(pulse>i.pulse){i.pulse=pulse;foreach(EnemyState e in Enemies)if(e.alive&&V2.Distance(e.position,Player.position)<=520/64f)e.position=Move(e.position,(e.position-Player.position).Unit*(12/64f),e.radius);}
            if(i.elapsed+.00001f<i.Duration){SyncUltimate();return;}
            Player.ultIntro=null;Player.action=null;
            if(i.mode=="split"&&IsElemental){SplitTime=18;Clones.Clear();foreach(string id in elementIds)if(id!=Player.element&&Clones.Count<i.splitCount-1)Clones.Add(NewClone(id,Clones.Count));ElementFx("split_matrix",Player.position,Player.element,.55f);}else if(!IsElemental)ReleaseSkill("r");
            SyncUltimate();
        }
        void RestoreUltimate(){
            Player.rRank=Math.Max(0,Math.Min(3,Player.rRank));SyncUltimate();UltimateIntro i=Player.ultIntro;if(i==null)return;
            if(float.IsNaN(i.elapsed)||float.IsInfinity(i.elapsed)||i.elapsed<0||i.elapsed>=i.Duration){Player.ultIntro=null;return;}
            i.element=ElementId(i.element);i.target=new V2(Safe(i.target.x,.4f,Width-.4f,Player.position.x),Safe(i.target.y,.4f,Height-.4f,Player.position.y));
            if(IsElemental&&i.mode!="split"){Player.ultIntro=null;Player.action=Action("r",Player.element,Player.position,i.target,Player.motionEpoch);Player.action.release=.28f;Player.action.duration=.78f;return;}
            if(i.mode=="split"&&(!IsElemental||i.splitCount!=3&&i.splitCount!=5&&i.splitCount!=7)){Player.ultIntro=null;return;}
            if(i.mode=="split"){Player.splitCount=i.splitCount;SplitTime=0;Clones.Clear();}
            i.pulse=(int)(i.elapsed/.8f);
            Player.action=Action(i.mode=="split"?"split":"r",i.element,Player.position,i.target,Player.motionEpoch);Player.action.elapsed=i.elapsed;Player.action.duration=Player.action.release=i.Duration;Player.action.released=true;Player.invulnerable=Math.Max(Player.invulnerable,i.Duration+.3f-i.elapsed);
        }
    }
}
