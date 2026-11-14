using System;

namespace DenTinh.Core {
    [Serializable] public class UltimateIntro {public float elapsed;public int pulse;public V2 target;public string element;}
    public sealed partial class Simulation {
        public float EffectiveRCd {get{return (Hero.rCd>0?Hero.rCd:IsElemental||IsShadow?20:18)*(1-.06f*Player.rRank)*(Player.Has("cooling")?.8f:1);}}
        void SyncUltimate(){Player.rCd=Safe(Player.rCd,0,20);Player.ult=Player.rCd<=0?100:Mathx.Clamp((float)Math.Floor(100*(1-Player.rCd/Math.Max(1,EffectiveRCd))),0,100);}
        public bool Skill(string key){
            PlayerState p=Player;if(Paused||Dead||p.ultIntro!=null)return false;
            if(key!="r")return ReleaseSkill(key);
            if(p.rCd>0||p.dashTime>0||p.action!=null&&p.action.key!="attack")return false;
            p.rCd=EffectiveRCd;p.ultIntro=new UltimateIntro{target=Input.aim,element=p.element};p.invulnerable=Math.Max(p.invulnerable,4.8f);
            p.action=Action("r",p.element,p.position,Input.aim,p.motionEpoch);p.action.duration=p.action.release=4.5f;p.action.released=true;skills++;SyncUltimate();Emit("sound","ultimate");return true;
        }
        void UpdateUltimate(float dt){
            UltimateIntro i=Player.ultIntro;if(i==null){SyncUltimate();return;}
            i.elapsed=Math.Min(4.5f,i.elapsed+dt);int pulse=(int)((i.elapsed+.00001f)/.8f);
            if(pulse>i.pulse){i.pulse=pulse;foreach(EnemyState e in Enemies)if(e.alive&&V2.Distance(e.position,Player.position)<=520/64f)e.position=Move(e.position,(e.position-Player.position).Unit*(12/64f),e.radius);}
            if(i.elapsed+.00001f<4.5f){SyncUltimate();return;}
            Player.ultIntro=null;Player.action=null;
            if(IsElemental){
                SplitTime=14;Clones.Clear();foreach(string id in elementIds)if(id!=Player.element)Clones.Add(NewClone(id,Clones.Count));
                CastElement(i.element,"r",null,i.target,false);foreach(CloneState clone in Clones)CastElement(clone.element,"r",clone,i.target,false,.18f);
                ElementFx("convergence_hub",i.target,i.element,.8f);
            }else ReleaseSkill("r");
            SyncUltimate();
        }
        void RestoreUltimate(){
            Player.rRank=Math.Max(0,Math.Min(3,Player.rRank));SyncUltimate();UltimateIntro i=Player.ultIntro;if(i==null)return;
            if(float.IsNaN(i.elapsed)||float.IsInfinity(i.elapsed)||i.elapsed<0||i.elapsed>=4.5f){Player.ultIntro=null;return;}
            i.element=ElementId(i.element);i.target=new V2(Safe(i.target.x,.4f,Width-.4f,Player.position.x),Safe(i.target.y,.4f,Height-.4f,Player.position.y));i.pulse=(int)(i.elapsed/.8f);
            Player.action=Action("r",i.element,Player.position,i.target,Player.motionEpoch);Player.action.elapsed=i.elapsed;Player.action.duration=Player.action.release=4.5f;Player.action.released=true;Player.invulnerable=Math.Max(Player.invulnerable,4.8f-i.elapsed);
        }
    }
}
