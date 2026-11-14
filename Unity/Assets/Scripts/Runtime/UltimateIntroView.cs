using UnityEngine;
using DenTinh.Core;

namespace DenTinh.UnityRuntime {
    public sealed partial class DenTinhGame {
        static readonly string[] introColors={"#EF4444","#38BDF8","#D97706","#F97316","#06B6D4","#22C55E","#FDE047"};
        void IntroBox(float x,float y,float w,float h,Color color){Color old=GUI.color;GUI.color=color;GUI.DrawTexture(new Rect(x,y,w,h),Texture2D.whiteTexture);GUI.color=old;}
        void IntroLine(Vector2 a,Vector2 b,Color color,float width=2){Matrix4x4 old=GUI.matrix;GUI.matrix=old*Matrix4x4.TRS(a,Quaternion.Euler(0,0,Mathf.Atan2(b.y-a.y,b.x-a.x)*Mathf.Rad2Deg),Vector3.one);IntroBox(0,-width/2,Vector2.Distance(a,b),width,color);GUI.matrix=old;}
        void IntroRing(Vector2 at,float radius,Color color,float aspect=.44f,float rotation=0){for(int n=0;n<48;n++){float a=n*Mathf.PI*2/48+rotation,b=(n+1)*Mathf.PI*2/48+rotation;IntroLine(at+new Vector2(Mathf.Cos(a)*radius,Mathf.Sin(a)*radius*aspect),at+new Vector2(Mathf.Cos(b)*radius,Mathf.Sin(b)*radius*aspect),color);}}
        void IntroRunes(Vector2 at,float radius,Color color,float rotation){for(int n=0;n<28;n++){float a=n*Mathf.PI*2/28+rotation;Vector2 radial=new Vector2(Mathf.Cos(a),Mathf.Sin(a)*.44f),tangent=new Vector2(-Mathf.Sin(a),Mathf.Cos(a)*.44f),center=at+radial*radius;IntroLine(center-radial*5,center+radial*5,color,1);IntroLine(center+radial*5,center+radial+tangent*(n%2==0?4:-4),color,1);if(n%3==0)IntroLine(center-tangent*3-radial*2,center+tangent*3+radial*2,color,1);}}
        void IntroDisk(Vector2 at,float radius,Color color,float aspect=.44f){if(radius<=0)return;for(float y=-radius*aspect;y<=radius*aspect;y+=2){float half=radius*Mathf.Sqrt(Mathf.Max(0,1-y*y/(radius*radius*aspect*aspect)));IntroBox(at.x-half,at.y+y,half*2,2,color);}}
        void IntroSprite(Sprite sprite,Vector2 at,float scale=1){if(sprite==null)return;Rect r=sprite.textureRect;float unit=720/(view.orthographicSize*2*32)*scale;GUI.DrawTextureWithTexCoords(new Rect(at.x-sprite.pivot.x*unit,at.y-(r.height-sprite.pivot.y)*unit,r.width*unit,r.height*unit),sprite.texture,new Rect(r.x/sprite.texture.width,r.y/sprite.texture.height,r.width/sprite.texture.width,r.height/sprite.texture.height));}
        void DrawUltimateIntro(){
            UltimateIntro ritual=Game.Player.ultIntro;if(ritual==null)return;
            Matrix4x4 previous=GUI.matrix;GUI.matrix=Matrix4x4.TRS(Vector3.zero,Quaternion.identity,new Vector3(Screen.width/1280f,Screen.height/720f,1));
            PlayerState p=Game.Player;float t=ritual.elapsed;Vector3 point=view.WorldToScreenPoint(new Vector3(p.position.x,p.position.y,0));Vector2 at=new Vector2(point.x/Screen.width*1280,(1-point.y/Screen.height)*720);float x=at.x,y=at.y;Color gold=PixelArt.ColorOf("#FDE047"),cyan=PixelArt.ColorOf("#22D3EE"),purple=PixelArt.ColorOf("#9333EA"),green=PixelArt.ColorOf("#52de9b");
            IntroBox(0,0,1280,720,new Color(6/255f,8/255f,18/255f,.45f));
            string command="",stage="";
            if(Game.IsElemental){
                int count=ritual.splitCount;command=count==3?"TAM LINH · TAM GIÁC KÉP":count==5?"NGŨ LINH · NGÔI SAO NĂM CÁNH":"THẤT LINH · THẤT TINH KÉP";stage=t<1.2f?"KHAI MỞ TRẬN ĐỒ":t<3?"HUY HIỆU NGUYÊN TỐ":"TÁCH BÓNG · TRIỆU KHÍ";
                float r=20+130*Mathf.Clamp01(t/1.2f),spin=settings.reducedMotion?0:t*.35f;for(int n=0;n<(count==7?3:2);n++){float radius=r*(1+n*.12f),rotation=spin*(n%2==0?1:-1);Color color=n%2==0?gold:cyan;IntroRing(at,radius,color,.44f,rotation);IntroRunes(at,radius,color,rotation);}
                Vector2[] nodes=new Vector2[count];for(int i=0;i<count;i++){float a=-Mathf.PI/2+i*Mathf.PI*2/count;nodes[i]=at+new Vector2(Mathf.Cos(a)*r,Mathf.Sin(a)*r*.44f);}
                for(int i=0;i<count;i++){IntroLine(nodes[i],nodes[(i+(count==7?2:1))%count],gold);if(count>3)IntroLine(nodes[i],nodes[(i+(count==7?3:2))%count],cyan);else{float a=Mathf.PI/2+i*Mathf.PI*2/3-spin,b=a+Mathf.PI*2/3;IntroLine(at+new Vector2(Mathf.Cos(a)*r*.65f,Mathf.Sin(a)*r*.286f),at+new Vector2(Mathf.Cos(b)*r*.65f,Mathf.Sin(b)*r*.286f),cyan);}}
                if(count==5)for(int n=0;n<20;n++){float a=n*Mathf.PI/10+spin,b=(n+1)*Mathf.PI/10+spin;IntroLine(at+new Vector2(Mathf.Cos(a)*r*(n%2==0?1.32f:1.18f),Mathf.Sin(a)*r*.44f*(n%2==0?1.32f:1.18f)),at+new Vector2(Mathf.Cos(b)*r*(n%2==0?1.18f:1.32f),Mathf.Sin(b)*r*.44f*(n%2==0?1.18f:1.32f)),cyan);}
                System.Collections.Generic.List<string> ids=new System.Collections.Generic.List<string>{p.element};foreach(ElementDef el in content.elements)if(el.id!=p.element)ids.Add(el.id);
                for(int i=0;i<count;i++){if(t<1.2f+i*.12f)continue;ElementDef el=Game.Element(ids[i]);Color col=PixelArt.ColorOf(el.color);Vector2 node=nodes[i];IntroBox(node.x-9,node.y-140,18,140,new Color(col.r,col.g,col.b,.32f));IntroLine(node,node+new Vector2(0,-140),col,3);IntroRing(node,18,col,1);IntroSprite(PixelArt.Vfx("crest_"+el.id,0,true),node,.85f);if(t/4.2f>.35f)IntroLine(at+new Vector2(0,-45),node+new Vector2(0,-35),col);if(t>=2.8f){Vector2 body=Vector2.Lerp(at,node,Mathf.Clamp01((t-2.8f)/1.1f));IntroSprite(PixelArt.ElementActor(el.id,"S",false,0,null,Game.Time,settings.reducedMotion),body,.75f);}}
                if(t>3.8f&&!settings.reducedMotion)for(int n=0;n<count;n++)IntroRing(at,150+(t-3.8f)*650,Game.Element(ids[n]).color==null?gold:PixelArt.ColorOf(Game.Element(ids[n]).color));
            }else if(Game.IsShadow){
                command="BÁCH QUỶ DẠ HÀNH";stage=t<1.2f?"DẠ VỰC BUÔNG XUỐNG":t<2.8f?"HUYẾT ẤN KHAI MÔN":t<4?"TRỖI DẬY (ARISE)":"QUÂN ĐOÀN XUNG PHONG";
                float r=420*Mathf.Clamp01(t/1.2f);IntroDisk(at,r,new Color(.02f,.01f,.04f,.82f));IntroRing(at,r,purple);IntroRing(at,r*.98f,cyan);
                if(t>=1.2f){for(int i=0;i<8;i++){float a=i*Mathf.PI/4;Vector2 node=at+new Vector2(Mathf.Cos(a)*210,Mathf.Sin(a)*90);IntroBox(node.x-8,node.y-100,16,100,new Color(.35f,.06f,.65f,.65f));}for(int i=0;i<22;i++){float a=i*2.39996f,rr=65+i%5*48;Vector2 node=at+new Vector2(Mathf.Cos(a)*rr,Mathf.Sin(a)*rr*.4f);IntroRing(node,26,purple);IntroSprite(PixelArt.Shadow(Game.Content.shadows[i].id+"/spawn",Mathf.Clamp01((t-1.4f-i*.045f)/1.5f)*.449f,settings.reducedMotion,true),node,.65f);}}
                if(t>=2.8f)GUI.Label(new Rect(x-200,y-165,400,45),"TRỖI DẬY (ARISE)",new GUIStyle(title){fontSize=26,alignment=TextAnchor.MiddleCenter});if(t>=4)IntroLine(at+new Vector2(0,-440),at,cyan,7);
            }else if(Game.Hero.id=="hoavi"){
                command="OVERCLOCK: MA TRẬN BIÊN DỊCH TỐI THƯỢNG";stage=t<1.5f?"TERMINAL ONLINE":t<3.2f?"ASSEMBLING TWIN CYBER-LOTUS":"COMPILE 100%";
                for(int i=0;i<3;i++){float xx=x+(i-1)*150,yy=y-160-Mathf.Abs(i-1)*25;IntroBox(xx-65,yy-35,130,70,new Color(.02f,.12f,.18f,.95f));for(int n=0;n<5;n++){IntroBox(xx-60,yy-28+n*12,65+(n%3)*18,2,cyan);}}
                if(t>=1.5f){for(int i=0;i<30;i++)IntroBox(x-120+i%10*24,y+15+i/10*9,20,6,cyan);foreach(int side in new[]{-1,1}){Vector2 satellite=at+new Vector2(side*110,-95);IntroRing(satellite,30,cyan,.7f);for(int n=0;n<6;n++){float a=n*Mathf.PI/3;IntroLine(satellite,satellite+new Vector2(Mathf.Cos(a)*35,Mathf.Sin(a)*28),n%2==0?cyan:purple,6);}}}if(t>=3.2f&&!settings.reducedMotion)IntroRing(at,70+(t-3.2f)*190,cyan);
            }else if(Game.Hero.id=="an"){
                command="THIÊN ĐĂNG PHƯỢNG HOÀNG KHAI HỎA";stage=t<1.5f?"THIÊN ĐĂNG THỨC TỈNH":t<3.2f?"BÁT ĐĂNG QUY VỊ":"PHƯỢNG HOÀNG KHAI HỎA";
                for(int n=0;n<3;n++)IntroRing(at,(55+n*35)*Mathf.Clamp01(t/1.5f),gold);IntroBox(x-10,y-145,20,28,gold);
                if(t>=1.5f){for(int n=0;n<8;n++){float a=n*Mathf.PI/4;Vector2 node=at+new Vector2(Mathf.Cos(a)*160,Mathf.Sin(a)*75-20);IntroLine(node,at+new Vector2(0,-130),gold);IntroBox(node.x-5,node.y-8,10,16,gold);}foreach(int side in new[]{-1,1})for(int n=0;n<9;n++)IntroLine(at+new Vector2(side*15,-50),at+new Vector2(side*(30+n*15)*Mathf.Clamp01((t-1.5f)/1.7f),-160+n*8),n%2==0?gold:PixelArt.ColorOf("#F97316"),9);}
            }else{
                command="PHONG LINH VẠN TIỄN TRẬN";stage=t<1.5f?"TRÚC LÂM HIỆN ẢNH":t<3.2f?"ĐẠI CUNG PHONG LINH":"VẠN TIỄN QUY TÂM";
                for(int n=0;n<9;n++){float xx=x+(n-4)*40,h=(80+n%3*24)*Mathf.Clamp01(t/1.5f);IntroLine(new Vector2(xx,y+20),new Vector2(xx,y+20-h),green,6);for(int j=0;j<3;j++)IntroLine(new Vector2(xx,y-j*25),new Vector2(xx+25,y-20-j*25),green,4);}
                if(t>=1.5f){Vector2[] bow={new Vector2(-70,-150),new Vector2(35,-190),new Vector2(65,-90),new Vector2(35,-20),new Vector2(-70,-30)};for(int n=0;n<4;n++)IntroLine(at+bow[n],at+bow[n+1],green,6);IntroLine(at+bow[0],at+new Vector2(-20,-90),gold);IntroLine(at+bow[4],at+new Vector2(-20,-90),gold);for(int n=0;n<21;n++){float xx=x-40+(t>=3.2f?(t-3.2f)*320:0),yy=y-160+n*6;IntroLine(new Vector2(xx-35,yy),new Vector2(xx+85,yy-5),green);}}
            }
            Sprite hero=Game.IsElemental?PixelArt.ElementActor(p.element,p.moveDir,p.moving,0,p.action,Game.Time,settings.reducedMotion):PixelArt.WorldHero(Game.Hero,p,Game.Time,settings.reducedMotion);IntroSprite(hero,at+new Vector2(0,Game.IsElemental&&t>=3?-24:0));
            float height=28*Mathf.Clamp01(t/.25f);IntroBox(0,0,1280,height,Color.black);IntroBox(0,720-height,1280,height,Color.black);GUIStyle label=new GUIStyle(text){alignment=TextAnchor.MiddleCenter,fontSize=16};GUI.Label(new Rect(0,0,1280,28),command,label);GUI.Label(new Rect(0,692,1280,28),stage+" · "+(ritual.Duration-t).ToString("F1")+"s",label);GUI.matrix=previous;
        }
    }
}
