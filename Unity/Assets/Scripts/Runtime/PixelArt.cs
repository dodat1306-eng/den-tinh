using System;
using System.Collections.Generic;
using UnityEngine;
using DenTinh.Core;

namespace DenTinh.UnityRuntime {
    public static class PixelArt {
        static readonly Dictionary<string,Sprite> cache=new Dictionary<string,Sprite>();
        static Texture2D atlas;static bool triedAtlas;
        public static Material Material;
        [Serializable] public class Cell {public int x,y,w,h;public float anchorX,anchorY;}
        [Serializable] public class Clip {public string key,texture;public float fps;public Cell[] cells;}
        [Serializable] public class Clips {public Clip[] clips;}
        static Dictionary<string,Clip> clips;
        static readonly Dictionary<string,Texture2D> textures=new Dictionary<string,Texture2D>();
        static void LoadClips(string resource,string prefix){TextAsset data=Resources.Load<TextAsset>("Art/"+resource);if(data==null)return;Clips parsed=JsonUtility.FromJson<Clips>(data.text);if(parsed!=null&&parsed.clips!=null)foreach(Clip c in parsed.clips)if(c.cells!=null&&c.cells.Length>0)clips[prefix+c.key]=c;}
        static Clip GetClip(string key){if(clips==null){clips=new Dictionary<string,Clip>();LoadClips("ThienVuClips","");LoadClips("WorldPixelClips","actors/");LoadClips("WorldTilesClips","world/");LoadClips("QuanLeClips","shadow/");LoadClips("HoaViClips","hoavi/");}Clip clip;return clips.TryGetValue(key,out clip)?clip:null;}
        static Texture2D AtlasTexture(string name){Texture2D texture;if(!textures.TryGetValue(name,out texture)){texture=Resources.Load<Texture2D>("Art/"+name);if(texture!=null){texture.filterMode=FilterMode.Point;texture.wrapMode=TextureWrapMode.Clamp;textures[name]=texture;}}return texture;}
        static Sprite Frame(string key,int index,bool actor){Clip clip=GetClip(key);if(clip==null)return Dot();index=Mathf.Clamp(index,0,clip.cells.Length-1);string id="atlas/"+key+"/"+index;if(cache.ContainsKey(id))return cache[id];Texture2D texture=AtlasTexture(clip.texture);if(texture==null)return Dot();Cell c=clip.cells[index];Vector2 pivot=c.anchorX>0||c.anchorY>0?new Vector2(c.anchorX/c.w,1-c.anchorY/c.h):actor?new Vector2(.5f,6f/64):new Vector2(.5f,.5f);return cache[id]=Sprite.Create(texture,new Rect(c.x,texture.height-c.y-c.h,c.w,c.h),pivot,32,0,SpriteMeshType.FullRect);}
        public static Sprite World(string key,float time=0,bool calm=false){key="world/"+key;Clip c=GetClip(key);return Frame(key,c==null||calm?0:(int)(Math.Max(0,time)*c.fps)%c.cells.Length,false);}
        public static Sprite Actor(string kind,string action,float time,bool calm=false,bool once=false,float duration=0){string key="actors/"+kind+"/"+action;Clip c=GetClip(key);return c==null?Item(kind):Frame(key,calm?0:once?Math.Min(c.cells.Length-1,(int)(Math.Max(0,time)/(duration>0?duration:c.cells.Length/c.fps)*c.cells.Length)):(int)(Math.Max(0,time)*c.fps)%c.cells.Length,true);}
        public static Sprite WorldProp(Prop p,float time,bool calm){string state=p.damageStage==3?"ash":p.status=="frozen"?"frozen":p.status=="burning"||p.status=="heated"?"burning":p.status=="sliced"?"sliced":p.damageStage==2?"charred":"intact";string key="world/"+p.type+"/"+state;Clip c=GetClip(key);return c==null?Item(p.type,p.variant):Frame(key,p.status=="sliced"?(int)(p.fallTime/.6f*c.cells.Length):calm?0:(int)(time*c.fps)%c.cells.Length,true);}
        public static Sprite WorldHero(HeroDef h,PlayerState p,float time,bool calm){
            string action=p.dashTime>0?"dash":p.action!=null?(p.action.key=="q"?"q_cast":p.action.key=="e"?"e_cast":p.action.key=="r"?"r_ult":"attack"):p.moving?"run":"idle";
            string key=h.id=="quanle"?"shadow/"+p.moveDir+"/"+action:h.id=="hoavi"?"hoavi/"+p.moveDir+"/"+(action=="q_cast"?"q_debug":action=="r_ult"?"r_overclock":action):"actors/"+h.id+"_"+p.moveDir+"/"+action;
            Clip c=GetClip(key);if(c==null)return Dot();int frame=calm?0:p.action!=null?(int)(Math.Max(0,p.action.elapsed)/Math.Max(.001f,p.action.duration)*c.cells.Length):(int)(Math.Max(0,time)*c.fps)%c.cells.Length;return Frame(key,frame,true);
        }
        public static Sprite Shadow(string key,float time,bool calm=false,bool once=false,float duration=0){key="shadow/"+key;Clip c=GetClip(key);return Frame(key,c==null||calm?0:once?Math.Min(c.cells.Length-1,(int)(Math.Max(0,time)/(duration>0?duration:c.cells.Length/c.fps)*c.cells.Length)):(int)(Math.Max(0,time)*c.fps)%c.cells.Length,true);}
        public static Sprite Vfx(string key,float time,bool calm=false){Clip c=GetClip(key);return Frame(key,c==null||calm?0:(int)(Math.Max(0,time)*c.fps)%c.cells.Length,false);}
        public static Sprite ElementActor(string form,string direction,bool moving,float dashTime,ActorAction action,float time,bool calm=false){
            if(action!=null&&action.elapsed>=action.release&&action.elapsed<action.release+.14f){V2 aim=V2.Angle(action.angle);direction=Math.Abs(aim.x)>=Math.Abs(aim.y)?(aim.x>=0?"E":"W"):(aim.y>=0?"N":"S");}
            string pose=dashTime>0?"dash":action!=null?(action.key=="q"?"q_cast":action.key=="e"?"e_cast":action.key=="r"?"r_ult":"attack"):moving?"run":"idle",key=form+"/"+pose+"/"+direction;Clip c=GetClip(key);if(c==null)return Dot();int frame=(int)(Math.Max(0,time)*c.fps)%c.cells.Length;
            if(action!=null){int release=pose=="attack"?1:pose=="q_cast"?2:3;float wind=Math.Max(.001f,action.release),recovery=Math.Max(.001f,action.duration-wind);frame=action.elapsed<wind?(int)(action.elapsed/wind*release):release+(int)((action.elapsed-wind)/recovery*(c.cells.Length-release));}if(calm)frame=action==null?0:pose=="attack"?1:pose=="q_cast"?2:3;return Frame(key,frame,true);
        }
        public static Color ColorOf(string hex){Color c;return ColorUtility.TryParseHtmlString(hex,out c)?c:Color.white;}
        public static Sprite Ground(int seed){
            const int width=1920,height=1440;Texture2D source=AtlasTexture("world-pixel-v08");if(source==null)throw new InvalidOperationException("Missing world-pixel-v08 atlas");
            RenderTexture previous=RenderTexture.active,copy=RenderTexture.GetTemporary(source.width,source.height,0,RenderTextureFormat.ARGB32,RenderTextureReadWrite.sRGB);Texture2D readable=new Texture2D(source.width,source.height,TextureFormat.RGBA32,false);
            Color32[] atlasPixels;
            try{Graphics.Blit(source,copy);RenderTexture.active=copy;readable.ReadPixels(new Rect(0,0,source.width,source.height),0,0);readable.Apply();atlasPixels=readable.GetPixels32();}finally{RenderTexture.active=previous;RenderTexture.ReleaseTemporary(copy);UnityEngine.Object.Destroy(readable);}
            Dictionary<string,Color32[]> tiles=new Dictionary<string,Color32[]>();Color32[] pixels=new Color32[width*height];System.Random rng=new System.Random(seed+77);
            for(int y=0;y<height;y+=16)for(int x=0;x<width;x+=16){
                V2 at=new V2((x+8)/32f,(y+8)/32f);string key="terrain/"+Simulation.Zone(at)+"/"+rng.Next(6);
                if(Simulation.OnPath(at)){int mask=0;if(Simulation.OnPath(at+new V2(0,.5f)))mask|=1;if(Simulation.OnPath(at+new V2(.5f,0)))mask|=2;if(Simulation.OnPath(at+new V2(0,-.5f)))mask|=4;if(Simulation.OnPath(at+new V2(-.5f,0)))mask|=8;key="road/"+mask;}
                Color32[] tile;if(!tiles.TryGetValue(key,out tile)){Clip clip=GetClip("world/"+key);if(clip==null)throw new InvalidOperationException("Missing tile "+key);Cell c=clip.cells[0];tile=new Color32[256];for(int row=0;row<16;row++)Array.Copy(atlasPixels,(source.height-c.y-c.h+row)*source.width+c.x,tile,row*16,16);tiles[key]=tile;}
                for(int row=0;row<16;row++)Array.Copy(tile,row*16,pixels,(y+row)*width+x,16);
            }
            Texture2D ground=Texture(width,height);ground.SetPixels32(pixels);ground.Apply(false,true);return Sprite.Create(ground,new Rect(0,0,width,height),Vector2.zero,32,0,SpriteMeshType.FullRect);
        }
        static Texture2D Texture(int w,int h){Texture2D t=new Texture2D(w,h,TextureFormat.RGBA32,false);t.filterMode=FilterMode.Point;t.wrapMode=TextureWrapMode.Clamp;Color[] pixels=new Color[w*h];t.SetPixels(pixels);return t;}
        static void Box(Texture2D t,int x,int y,int w,int h,Color c){for(int yy=Math.Max(0,y);yy<Math.Min(t.height,y+h);yy++)for(int xx=Math.Max(0,x);xx<Math.Min(t.width,x+w);xx++)t.SetPixel(xx,yy,c);}
        static void Circle(Texture2D t,int x,int y,int rx,int ry,Color c){for(int yy=Math.Max(0,y-ry);yy<Math.Min(t.height,y+ry+1);yy++)for(int xx=Math.Max(0,x-rx);xx<Math.Min(t.width,x+rx+1);xx++)if((xx-x)*(xx-x)/(float)(rx*rx)+(yy-y)*(yy-y)/(float)(ry*ry)<=1)t.SetPixel(xx,yy,c);}
        static Sprite Finish(Texture2D t,float ppu,Vector2 pivot){t.Apply(false,false);return Sprite.Create(t,new Rect(0,0,t.width,t.height),pivot,ppu);}
        public static Sprite Hero(HeroDef h,int frame){
            if(!triedAtlas){triedAtlas=true;atlas=Resources.Load<Texture2D>("Art/Heroes");if(atlas!=null){atlas.filterMode=FilterMode.Point;atlas.wrapMode=TextureWrapMode.Clamp;}}
            string key="hero-"+h.id+"-"+frame;if(cache.ContainsKey(key))return cache[key];
            if(atlas!=null){int row=h.id=="an"?0:h.id=="linh"?1:h.id=="kiet"?2:3;float w=atlas.width/4f,hh=atlas.height/4f;Sprite sprite=Sprite.Create(atlas,new Rect(frame%4*w,(3-row)*hh,w,hh),new Vector2(.5f,.14f),w/2f);cache[key]=sprite;return sprite;}
            Texture2D t=Texture(32,48);Color dark=ColorOf("#172535"),skin=ColorOf("#efc49b"),cloth=ColorOf(h.cloth),accent=ColorOf(h.accent);int step=frame%2==0?1:-1;
            Box(t,8,0+step,7,12,dark);Box(t,18,0-step,7,12,dark);Box(t,6,9,22,23,dark);Box(t,8,11,18,21,cloth);Box(t,16,11,3,22,accent);Box(t,8,17,18,3,accent);Box(t,3,17+step,6,14,cloth);Box(t,26,17-step,5,14,cloth);Box(t,4,15+step,5,5,skin);Box(t,26,15-step,5,5,skin);Box(t,6,31,23,14,dark);Box(t,10,31,17,11,skin);Box(t,8,41,19,5,dark);Box(t,16,35,2,3,dark);Box(t,23,35,2,3,dark);
            if(h.id=="an"){for(int y=40;y<48;y++){int half=(48-y)*2+1;Box(t,16-half,y,half*2,1,ColorOf("#e5c78b"));}Box(t,1,39,30,3,ColorOf("#a78b5c"));}
            if(h.id=="hoavi"){Box(t,14,34,7,5,ColorOf("#9affef"));Box(t,22,34,7,5,ColorOf("#9affef"));Box(t,16,35,3,2,dark);Box(t,24,35,3,2,dark);Box(t,8,39,5,4,accent);}
            if(h.id=="kiet"){Box(t,3,26,9,8,ColorOf("#a7bbcc"));Box(t,24,26,7,8,ColorOf("#a7bbcc"));}
            cache[key]=Finish(t,30,new Vector2(.5f,.05f));return cache[key];
        }
        public static Sprite Item(string type,int variant=0){
            string key=type+variant;if(cache.ContainsKey(key))return cache[key];Texture2D t=Texture(64,96);Color dark=ColorOf("#152d35"),wood=ColorOf("#80654f"),leaf=ColorOf("#49795b"),light=ColorOf("#85af77");
            if(type=="tree"||type=="banyan"||type=="bamboo"){
                if(type=="bamboo"){for(int j=0;j<3;j++){int x=17+j*12;Box(t,x,8,4,70-j*7,ColorOf("#6aaf82"));for(int k=0;k<5;k++){Box(t,x,17+k*11,4,2,ColorOf("#abd49a"));Box(t,x-11+(k%2)*14,22+k*11,15,3,leaf);}}}
                else{Box(t,25,4,15,51,dark);Box(t,28,7,9,45,wood);Box(t,29,10,2,35,ColorOf("#be9767"));Circle(t,31,60,30,24,dark);System.Random rng=new System.Random(variant+91);for(int i=0;i<24;i++){int x=10+rng.Next(44),y=45+rng.Next(31);Circle(t,x,y,9,7,i%3==0?light:leaf);Box(t,x-4,y+4,8,2,light);}Box(t,21,3,25,5,wood);}
            }else if(type=="house"||type=="temple"){
                Box(t,6,4,52,42,ColorOf("#615d45"));Box(t,9,7,46,36,ColorOf("#d2bc8b"));Box(t,26,6,13,25,ColorOf("#66513c"));Box(t,13,20,10,12,ColorOf("#ffcf7b"));Box(t,43,20,10,12,ColorOf("#ffcf7b"));for(int y=0;y<27;y++){int half=31-y;Box(t,32-half,43+y,half*2,1,ColorOf(y%5==0?"#bd8a67":"#8a5e49"));}Box(t,3,40,58,5,dark);Box(t,5,3,55,5,ColorOf("#b49a65"));
            }else if(type=="rock"){Circle(t,32,24,24,17,dark);Circle(t,31,28,22,17,ColorOf("#7c8474"));Box(t,17,37,23,4,ColorOf("#a4a48a"));}
            else if(type=="lotus"){Circle(t,32,13,28,9,ColorOf("#417c67"));Circle(t,32,25,13,11,ColorOf("#e39bbb"));Box(t,28,23,8,10,ColorOf("#ffe3a2"));}
            else if(type=="chest"){Box(t,9,5,46,25,dark);Box(t,12,8,40,21,ColorOf("#ba8a51"));Box(t,11,21,42,4,ColorOf("#ead18b"));Box(t,19,7,4,23,ColorOf("#ead18b"));Box(t,43,7,4,23,ColorOf("#ead18b"));Box(t,29,14,7,8,ColorOf("#ffe5a0"));}
            else if(type=="shrine"){Circle(t,32,15,27,10,dark);Box(t,16,12,32,7,ColorOf("#8b9c86"));Box(t,23,18,18,17,ColorOf("#597c75"));for(int y=0;y<20;y++){int half=y<10?y:20-y;Box(t,32-half,42+y,Math.Max(1,half*2),1,ColorOf("#acedd1"));}}
            else if(type=="fox"){Box(t,17,8,29,17,ColorOf("#eddfb8"));Box(t,19,24,6,9,ColorOf("#eddfb8"));Box(t,38,24,6,9,ColorOf("#eddfb8"));Box(t,23,19,3,3,dark);Box(t,37,19,3,3,dark);Box(t,44,8,16,9,ColorOf("#fff0c8"));}
            else if(type=="core"){for(int y=0;y<44;y++){int half=(int)(Math.Sin(y/44f*Math.PI)*15);Box(t,32-half,8+y,Math.Max(2,half*2),1,ColorOf(y%5==0?"#ffe1b0":"#f3a0c6"));}}
            else if(type=="npc"){Box(t,23,4,6,14,dark);Box(t,35,4,6,14,dark);Box(t,19,17,27,26,ColorOf(variant==0?"#97739b":"#b6a16b"));Box(t,23,42,20,15,ColorOf("#e8c7a1"));Box(t,20,54,25,7,ColorOf("#d8d1b4"));Box(t,29,48,3,3,dark);Box(t,37,48,3,3,dark);}
            else if(type=="slime"){Circle(t,32,17,22,15,dark);Circle(t,32,20,20,14,ColorOf("#8bd3aa"));Box(t,23,23,4,5,dark);Box(t,37,23,4,5,dark);Box(t,20,29,11,3,ColorOf("#d8f4bb"));}
            else if(type=="boar"){Circle(t,31,24,25,19,dark);Circle(t,31,27,22,17,ColorOf("#bb9970"));Box(t,16,8,7,13,dark);Box(t,42,8,7,13,dark);Box(t,14,38,8,12,wood);Box(t,44,38,8,12,wood);Box(t,22,30,4,5,ColorOf("#ffbc85"));Box(t,39,30,4,5,ColorOf("#ffbc85"));Box(t,26,20,18,7,ColorOf("#ead4a1"));}
            else if(type=="boss"){Box(t,16,5,35,56,dark);Box(t,21,10,26,49,wood);Circle(t,32,66,30,25,ColorOf("#344d48"));Box(t,20,50,7,5,ColorOf("#ffbc85"));Box(t,39,50,7,5,ColorOf("#ffbc85"));Box(t,26,32,14,7,ColorOf("#101f2d"));for(int i=0;i<5;i++)Box(t,8+i*12,70+(i%2)*9,7,10,ColorOf("#718a63"));}
            else{Circle(t,32,30,22,25,dark);Circle(t,32,34,18,20,ColorOf(type=="wisp"?"#c894d9":"#8e86b6"));Box(t,23,36,5,6,ColorOf("#ffe8c9"));Box(t,37,36,5,6,ColorOf("#ffe8c9"));}
            cache[key]=Finish(t,40,new Vector2(.5f,.06f));return cache[key];
        }
        public static Sprite Glow(){if(cache.ContainsKey("glow"))return cache["glow"];Texture2D t=Texture(64,64);for(int y=0;y<64;y++)for(int x=0;x<64;x++){float r=Vector2.Distance(new Vector2(x,y),new Vector2(31.5f,31.5f))/32;float a=Mathf.Pow(Mathf.Clamp01(1-r),2);t.SetPixel(x,y,new Color(1,1,1,a));}cache["glow"]=Finish(t,32,new Vector2(.5f,.5f));return cache["glow"];}
        public static Sprite Dot(){if(cache.ContainsKey("dot"))return cache["dot"];Texture2D t=Texture(8,8);Box(t,1,1,6,6,Color.white);cache["dot"]=Finish(t,32,new Vector2(.5f,.5f));return cache["dot"];}
        public static Sprite Weapon(WeaponDef w){string key="weapon-"+w.id;if(cache.ContainsKey(key))return cache[key];Texture2D t=Texture(48,24);Color color=ColorOf(w.color);Box(t,3,8,38,9,ColorOf("#142737"));Box(t,5,10,34,5,color);Box(t,38,7,7,11,color);Box(t,9,5,5,8,ColorOf("#b09a77"));if(w.kind=="code"){Box(t,9,4,25,17,ColorOf("#192a3e"));for(int y=7;y<19;y+=4)for(int x=12;x<32;x+=5)Box(t,x,y,3,2,color);}if(w.kind=="bow"){for(int y=0;y<24;y++){int x=25+(int)(Math.Sin(y/24f*Math.PI)*12);Box(t,x,y,3,2,color);}}cache[key]=Finish(t,38,new Vector2(.3f,.5f));return cache[key];}
    }
}
