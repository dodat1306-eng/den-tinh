"""Hand-authored integer-grid elemental flipbooks. Pillow only; binary alpha."""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
SPEC=json.loads((HERE/'rig-pixel-v08.json').read_text(encoding='utf-8'))
INK='#100b18';WHITE='#ffffff'
PALS={k:v['palette'][11:] for k,v in SPEC['forms'].items()}

def line(d,pts,color,w=1):d.line([(round(x),round(y)) for x,y in pts],fill=color,width=w)
def cross(d,x,y,r,col):
    x,y,r=round(x),round(y),round(r)
    d.rectangle((x-r,y-1,x+r,y+1),fill=col);d.rectangle((x-1,y-r,x+1,y+r),fill=col);d.point((x,y),fill=WHITE)
def diamond(d,x,y,rx,ry,col):d.polygon([(round(x-rx),round(y)),(round(x),round(y-ry)),(round(x+rx),round(y)),(round(x),round(y+ry))],fill=col)
def ring(d,x,y,r,col,ratio=1,phase=0):
    pts=[(x+math.cos((i/16+phase)*math.tau)*r,y+math.sin((i/16+phase)*math.tau)*r*ratio) for i in range(17)]
    line(d,pts,col)

def main():
    clips={}
    def add(key,w,h,n,paint,form=None):
        frames=[]
        for f in range(n):
            im=Image.new('RGBA',(w,h));paint(ImageDraw.Draw(im),f,im)
            alpha=im.getchannel('A');edge=alpha.filter(ImageFilter.MaxFilter(3))
            out=Image.new('RGBA',(w,h));out.paste(INK,(0,0,w,h),edge);out.paste(im,(0,0),alpha)
            frames.append(out)
        clips[key]={'w':w,'h':h,'frames':frames,'element':form}
    def projectile(form,pal,w=28,h=16,dragon=False):
        dark,mid,bright,pale=pal[:4]
        def paint(d,f,im):
            cy=h//2
            if form=='lightning':
                d.polygon([(2,cy+2),(9,cy-2),(7,cy-6),(18,cy-4),(24,cy-1),(18,cy+2),(20,cy+5),(9,cy+4)],fill=bright)
                line(d,[(4,cy+2),(13,cy),(11,cy-3),(24,cy)],pal[-1],2);line(d,[(10,cy+1),(15,cy-1),(24,cy)],WHITE)
            elif form=='wind':
                d.polygon([(3,cy+5),(5,cy-3),(14,cy-6),(25,cy-2),(19,cy-2),(11,cy-3),(7,cy+1),(9,cy+5)],fill=bright)
                line(d,[(5,cy+3),(8,cy-2),(14,cy-4),(23,cy-2)],pale)
            elif form=='earth':
                d.polygon([(7,cy-4),(13,cy-6),(21,cy-4),(25,cy+1),(20,cy+5),(10,cy+5),(5,cy)],fill=mid)
                d.polygon([(10,cy-3),(15,cy-5),(21,cy-2),(20,cy+1),(10,cy+1)],fill=bright)
                line(d,[(12,cy-4),(14,cy),(11,cy+2),(17,cy+4)],pale)
                for j in range(3):d.rectangle((1+j*2,cy+(j%2)*3-2,2+j*2,cy+(j%2)*3-1),fill=bright)
            elif form=='fire':
                nose=w-3;cy=h//2
                d.polygon([(2,cy-4),(8,cy-2),(9,cy-7),(15,cy-3),(19,cy-6),(nose-3,cy-4),(nose,cy-1),(nose-4,cy+1),(nose,cy+4),(18,cy+5),(11,cy+2),(6,cy+5)],fill=mid)
                d.polygon([(5,cy-2),(13,cy),(16,cy-4),(nose-5,cy-2),(nose-2,cy),(nose-7,cy+2),(13,cy+3)],fill=bright)
                d.point((nose-7,cy-3),fill=WHITE);line(d,[(nose-4,cy+1),(nose-8,cy+1)],dark,2)
                for j in range(3):d.rectangle((2+j*3,cy+5+(j+f)%3,3+j*3,cy+6+(j+f)%3),fill=pale)
            elif form=='ice':
                d.polygon([(4,cy),(12,cy-5),(21,cy-4),(26,cy),(21,cy+4),(12,cy+5)],fill=bright)
                line(d,[(7,cy),(24,cy)],pale,2);line(d,[(13,cy-4),(18,cy),(13,cy+4)],mid)
            elif form=='nature':
                d.polygon([(5,cy+4),(9,cy-4),(22,cy-5),(25,cy),(16,cy+5)],fill=bright)
                line(d,[(3,cy+5),(12,cy),(23,cy-3)],pale);line(d,[(12,cy),(10,cy-3),(15,cy)],mid)
                cross(d,8,cy+3,2,pal[-1])
            else:
                d.polygon([(3,cy-1),(17,cy-1),(17,cy-5),(20,cy-5),(20,cy-3),(26,cy),(20,cy+3),(20,cy+5),(17,cy+5),(17,cy+1),(3,cy+1)],fill=bright)
                line(d,[(5,cy),(25,cy)],WHITE);line(d,[(19,cy-4),(19,cy+4)],pale)
            if f%2: d.rectangle((1,cy-1,3,cy),fill=pale)
            else:d.rectangle((3,cy+2,5,cy+3),fill=mid)
        return paint
    for form,pal in PALS.items():
        dark,mid,bright,pale=pal[:4]
        add('proj_'+form,28,16,4,projectile(form,pal),form)
        def muzzle(d,f,im,pal=pal,form=form):
            dark,mid,bright,pale=pal[:4]
            r=[5,9,6][f];cross(d,12,12,r,bright);diamond(d,12,12,max(2,r-2),max(2,r-2),pale);cross(d,12,12,2,WHITE)
            for j in range(4):
                a=j*math.tau/4+f*.5;x=round(12+math.cos(a)*9);y=round(12+math.sin(a)*9);d.rectangle((x,y,x+1,y+1),fill=mid)
        add('muzzle_'+form,24,24,3,muzzle,form)
        def impact(d,f,im,pal=pal):
            dark,mid,bright,pale=pal[:4];r=5+f*3
            for j in range(6):
                a=j*math.tau/6;x=20+math.cos(a)*r;y=20+math.sin(a)*r
                diamond(d,x,y,2,4,pale if j%2 else bright)
            cross(d,20,20,max(1,7-f),WHITE)
        add('impact_'+form,40,40,4,impact,form)
        def seal(d,f,im,pal=pal):
            ring(d,24,24,20,pal[2],.64)
            for j in range(7):
                a=j*math.tau/7+f*.10;cross(d,24+math.cos(a)*19,24+math.sin(a)*12,2,pal[3])
            diamond(d,24,24,9,5,pal[0]);cross(d,24,24,4,WHITE)
        add('transform_ring_'+form,48,48,5,seal,form)
        def pillar(d,f,im,pal=pal):
            heights=[12,34,54,42,20];hh=heights[f]
            for x in range(12,37,4):
                y=59-hh+((x//4+f)%3)*3;d.rectangle((x,y,x+1,58),fill=pal[1 if x%8 else 2])
            ring(d,24,55,20,pal[2],.25)
            for j in range(7):
                a=j*math.tau/7;cross(d,24+math.cos(a)*19,55+math.sin(a)*5,2,pal[3])
            d.rectangle((18,59-hh,30,61-hh),fill=WHITE)
        add('transform_pillar_'+form,48,64,5,pillar,form)
        def splitbeam(d,f,im,pal=pal):
            yy=8;d.rectangle((1,yy-2,30,yy+2),fill=pal[1]);d.rectangle((1,yy-1,30,yy+1),fill=pal[2]);d.line((1,yy,30,yy),fill=WHITE)
            for x in range(2,31,8):cross(d,(x+f*2)%28+2,yy,3,pal[3])
        add('split_beam_'+form,32,16,6,splitbeam,form)
        def shield(d,f,im,pal=pal):
            ring(d,24,28,21,pal[2],1.15)
            for j in range(8):
                a=j*math.tau/8;diamond(d,24+math.cos(a)*21,28+math.sin(a)*24,1,2,pal[3 if (j+f)%2 else 1])
        add('shield_'+form,48,56,2,shield,form)
    pal=PALS['lightning']
    def chain(d,f,im):
        pts=[(1,8),(6,8),(6,4+f%2),(13,4+f%2),(13,11),(20,11),(20,6),(30,6)]
        line(d,pts,pal[2],5);line(d,pts,pal[-1],3);line(d,pts,WHITE)
        if f%2:cross(d,25,7,5,pal[3])
    add('chain_bolt',32,16,4,chain,'lightning')
    def windblade(d,f,im):
        pal=PALS['wind']
        for j in range(4):
            pts=[]
            for x,y in [(2,-2),(8,-13),(16,-12),(11,-9),(8,-3),(10,2)]:
                a=(j+f*.25)*math.pi/2;pts.append((round(18+x*math.cos(a)-y*math.sin(a)),round(18+x*math.sin(a)+y*math.cos(a))))
            d.polygon(pts,fill=pal[2 if j%2 else 3])
        diamond(d,18,18,3,3,WHITE)
    add('wind_blade_q',36,36,4,windblade,'wind')
    def earthpillar(d,f,im):
        pal=PALS['earth'];hh=[2,13,31,40,14][f]
        line(d,[(3,43),(11,39),(18,44),(24,40),(35,44)],pal[3],2)
        if f<4:
            d.polygon([(8,44),(10,44-hh),(20,40-hh),(29,45-hh),(32,44)],fill=pal[1]);d.polygon([(20,40-hh),(25,46-hh),(27,43),(20,43)],fill=pal[2]);line(d,[(14,44-hh/2),(19,40-hh/2),(17,40-hh/3),(24,43)],pal[3])
        else:
            for j in range(8):
                x=4+(j*13)%30;y=8+(j*9)%30;d.rectangle((x,y,x+3,y+3),fill=pal[2 if j%2 else 1])
    add('earth_pillar',40,48,5,earthpillar,'earth')
    add('fire_dragon',36,24,4,projectile('fire',PALS['fire'],36,24,True),'fire')
    def beam(form,part):
        pal=PALS[form]
        def paint(d,f,im):
            cy=16 if form=='light' else 12 if form=='ice' else 8
            if form=='light':
                d.rectangle((1,5,30,26),fill=pal[1]);d.rectangle((1,7,30,24),fill=pal[2]);d.rectangle((1,9,30,22),fill=WHITE)
                for x in range(0,32,16):cross(d,(x+f*4)%28+2,cy,10,pal[3])
                if part=='head':d.polygon([(24,5),(30,11),(30,20),(24,26),(27,cy)],fill=pal[3])
                elif part=='tail':diamond(d,8,16,5,11,pal[3]);cross(d,8,16,5,WHITE)
            elif form=='ice':
                d.polygon([(1,cy-3),(7,cy-4),(9,cy-8),(14,cy-3),(19,cy-6),(22,cy-3),(30,cy-1),(30,cy+2),(23,cy+3),(20,cy+8),(16,cy+3),(9,cy+5),(7,cy+2),(1,cy+2)],fill=pal[2]);line(d,[(2,cy),(29,cy)],pal[3],3);line(d,[(3,cy),(30,cy)],WHITE)
            else:
                pts=[(1,8),(8,4+f%2),(16,10),(24,5),(30,8)];line(d,pts,pal[1],4);line(d,pts,pal[2],2)
                for x,y in pts[1:-1]:diamond(d,x,y,3,2,pal[3]);d.point((x+1,y-2),fill=PALS['nature'][-1])
        return paint
    for part in ['tail','body','head']:add('light_beam_'+part,32,32,5,beam('light',part),'light')
    add('ice_beam',32,24,4,beam('ice','body'),'ice');add('vine_whip',32,16,4,beam('nature','body'),'nature')
    def shatter(d,f,im):
        pal=PALS['ice'];r=5+f*3
        for j in range(6):
            a=j*math.tau/6;diamond(d,20+math.cos(a)*r,20+math.sin(a)*r,3,7-f//2,pal[2 if j%2 else 3])
        cross(d,20,20,5-f,WHITE)
    add('ice_shatter',40,40,4,shatter,'ice')
    def root(d,f,im):
        pal=PALS['nature']
        for j in range(5):
            x=7+j*6;yy=20-(f+j)%3*3;line(d,[(20,35),(x+3,26),(x,yy),(x+2,yy-8)],pal[1],3);diamond(d,x,yy,4,2,pal[2])
        cross(d,20,14-f,3,pal[-1]);cross(d,8,19,2,pal[-1]);cross(d,31,21,2,pal[-1])
    add('vine_root',40,40,5,root,'nature')
    def sigil(d,f,im):
        pal=PALS['lightning'];ring(d,24,26,21,pal[2],.58);ring(d,24,26,15,pal[1],.58)
        for j in range(8):
            a=j*math.tau/8;cross(d,24+math.cos(a)*20,26+math.sin(a)*12,2,pal[-1] if (j+f)%2 else pal[2])
        line(d,[(17,24),(25,20),(22,28),(31,25)],WHITE,2)
    add('lightning_sigil',48,48,5,sigil,'lightning')
    def thunder(d,f,im):
        pal=PALS['lightning'];shift=[0,2,-2,1,0][f];pts=[(20+shift,2),(12,21),(23,20),(13,42),(25,40),(17,61)]
        line(d,pts,pal[1],10);line(d,pts,pal[2],6);line(d,pts,WHITE,2);cross(d,19,63,10-f,pal[-1])
        for j in range(3):d.rectangle((4+j*13,55+(j+f)%3*4,6+j*13,57+(j+f)%3*4),fill=pal[3])
    add('sky_thunder',40,72,5,thunder,'lightning')
    def vortex(tall=False):
        pal=PALS['wind']
        def paint(d,f,im):
            height=64 if tall else 56
            for j in range(5):
                rr=(8+j*4) if tall else 7+j*4;yy=height-9-j*(9 if tall else 2)
                pts=[]
                for i in range(22):
                    a=i/21*math.tau*.8+f*.35+j*.7;pts.append((28+math.cos(a)*rr,yy+math.sin(a)*rr*.30))
                line(d,pts,pal[2 if j%2 else 3],2)
            for j in range(4):
                a=j*math.tau/4+f*.5;d.rectangle((round(28+math.cos(a)*22),round(height-12+math.sin(a)*7),round(29+math.cos(a)*22),round(height-11+math.sin(a)*7)),fill=pal[1])
        return paint
    add('wind_vortex',56,56,6,vortex(),'wind');add('wind_tornado',56,64,6,vortex(True),'wind')
    def wall(d,f,im):
        pal=PALS['earth']
        for j in range(3):
            x=3+j*17;hh=18+(j+f)%3*3;d.polygon([(x,29),(x+1,29-hh),(x+6,25-hh),(x+14,29-hh),(x+15,29)],fill=pal[1]);line(d,[(x+2,29-hh),(x+6,26-hh),(x+13,29-hh)],pal[2],2);line(d,[(x+6,29-hh+4),(x+6,25),(x+10,25)],pal[3])
    add('earth_wall',56,32,4,wall,'earth')
    def orb(d,f,im):
        pal=PALS['fire'];d.polygon([(4,16),(3,10),(7,4),(8,9),(12,2+(f%2)*2),(14,9),(17,7),(17,15),(13,18),(7,18)],fill=pal[1]);d.polygon([(6,15),(7,10),(10,7),(12,13),(15,12),(13,17),(8,17)],fill=pal[2]);diamond(d,10,14,2,3,pal[3]);d.point((10,14),fill=WHITE)
    add('fire_orb',20,20,4,orb,'fire')
    for form in ['ice','light']:
        def mirror(d,f,im,pal=PALS[form]):
            d.polygon([(3,23),(7,5),(14,2),(37,3),(44,10),(43,24)],fill=pal[1]);d.polygon([(6,21),(10,6),(35,5),(41,10),(40,22)],fill=pal[2]);line(d,[(10,19),(22,6)],pal[3],2);line(d,[(27,22),(37,11)],WHITE);cross(d,14+f*7,10,3,pal[3])
        add('crystal_mirror_'+form,48,28,4,mirror,form)
    def garden(d,f,im):
        pal=PALS['nature'];ring(d,32,39,27,pal[1],.52)
        for j in range(8):
            a=j*math.tau/8;x=round(32+math.cos(a)*24);y=round(39+math.sin(a)*14)
            line(d,[(x,y+2),(x-2,y-5),(x+2,y-10-(j+f)%3)],pal[1],2);diamond(d,x-3,y-5,4,2,pal[2]);diamond(d,x+3,y-8,4,2,pal[3]);cross(d,x,y-12,2 if (j+f)%2 else 3,pal[-1])
        root(d,f,im)
    add('nature_garden',64,64,6,garden,'nature')
    def nova(d,f,im):
        pal=PALS['ice'];r=5+f*3
        for j in range(8):
            a=j*math.tau/8;x=16+math.cos(a)*r;y=16+math.sin(a)*r;diamond(d,x,y,2,4,pal[2 if j%2 else 3])
    add('ice_nova_strip',32,32,4,nova,'ice')
    def multiseal(d,f,im):
        w,h=im.size;cx=w//2;cy=h//2;r=min(w,h)//2-6
        for j,(form,pal) in enumerate(PALS.items()):
            a=j*math.tau/7+f*.08;cross(d,cx+math.cos(a)*r,cy+math.sin(a)*r*.60,3,pal[2])
        ring(d,cx,cy,r-2,'#ffe07d',.60);cross(d,cx,cy,4,WHITE)
    for key in ['transform_ring','split_seal','convergence_star']:add(key,64,48,6,multiseal)
    def hub(d,f,im):
        multiseal(d,f,im);r=[5,9,15,22,26,19][f]
        for j,(form,pal) in enumerate(PALS.items()):
            a=j*math.tau/7;pts=[(32+math.cos(a-.15)*r*.4,32+math.sin(a-.15)*r*.4),(32+math.cos(a)*(r+3),32+math.sin(a)*(r+3)),(32+math.cos(a+.15)*r*.4,32+math.sin(a+.15)*r*.4)]
            d.polygon([(round(x),round(y)) for x,y in pts],fill=pal[2])
        cross(d,32,32,max(2,8-abs(f-3)),WHITE)
    add('convergence_hub',64,64,6,hub)
    def shadow(d,f,im):
        for y in range(3,8):
            half=11 if y in [4,5,6] else 7;d.rectangle((16-half,y,16+half,y),fill=INK)
    add('pixel_shadow',32,12,1,shadow)
    # Shelf pack, independent of cell dimensions.
    width=1024;x=y=rowh=0;meta={'image':'assets/thienvu-vfx-pixel.png','width':width,'height':0,'clips':{},'palette':list(dict.fromkeys(SPEC['common']+sum((v['palette'][11:] for v in SPEC['forms'].values()),[])))};placed=[]
    for name,data in clips.items():
        cells=[]
        for im in data['frames']:
            w,h=im.size
            if x+w>width:x=0;y+=rowh;rowh=0
            cells.append({'x':x,'y':y,'w':w,'h':h});placed.append((im,x,y));x+=w;rowh=max(rowh,h)
        meta['clips'][name]={'frames':len(cells),'w':data['w'],'h':data['h'],'fps':12,'element':data['element'],'cells':cells}
    meta['height']=y+rowh;atlas=Image.new('RGBA',(width,meta['height']))
    for im,x,y in placed:atlas.paste(im,(x,y))
    atlas.save(ROOT/meta['image']);raw=json.dumps(meta,separators=(',',':'))
    (ROOT/'assets/thienvu-vfx-pixel.json').write_text(raw,encoding='utf-8');(ROOT/'assets/thienvu-vfx-pixel.js').write_text('globalThis.DTThienVuVFX='+raw+';\n',encoding='utf-8')
    preview=Image.new('RGB',(500,32+len(clips)*80),'#142b32');d=ImageDraw.Draw(preview);d.text((8,8),'THIEN VU / ALL PIXEL VFX',fill='#dce5f7')
    for row,(name,data) in enumerate(clips.items()):
        yy=30+row*80;d.text((3,yy),name,fill='#ffe07d')
        for i,im in enumerate(data['frames']):preview.paste(im,(120+i*64,yy),im)
    preview.save(HERE/'thienvu-pixel-vfx-preview.png')
    print(json.dumps({'clips':len(clips),'frames':len(placed),'atlas':[width,meta['height']]}))

if __name__=='__main__':main()
