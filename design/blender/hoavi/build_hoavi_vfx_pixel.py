"""Offline Pillow flipbooks. Only the prompt's 25 literal colors, binary alpha."""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
INK='#071824';DARK='#0b2b3d';DEEP='#126b82';CYAN='#1fc8db';BRIGHT='#66fff7';WHITE='#eeffff';GOLD='#f7cb63';PINK='#f291c7';RED='#ff3b6b'
GLYPHS={'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'<':['001','010','100','010','001'],'>':['100','010','001','010','100'],'!':['010','010','010','000','010']}

def glyph(d,ch,x,y,color):
    for j,row in enumerate(GLYPHS[ch]):
        for i,v in enumerate(row):
            if v=='1':d.point((x+i,y+j),fill=color)

def line(d,p,col,width=1):d.line([(round(x),round(y)) for x,y in p],fill=col,width=width)
def diamond(d,x,y,r,col,width=1):line(d,[(x-r,y),(x,y-r),(x+r,y),(x,y+r),(x-r,y)],col,width)
def cross(d,x,y,r):
    line(d,[(x-r,y),(x+r,y)],BRIGHT,3);line(d,[(x,y-r),(x,y+r)],BRIGHT,3);line(d,[(x-r+1,y),(x+r-1,y)],WHITE);line(d,[(x,y-r+1),(x,y+r-1)],WHITE)

def main():
    clips={}
    def add(name,w,h,n,paint):
        frames=[]
        for f in range(n):
            im=Image.new('RGBA',(w,h));paint(ImageDraw.Draw(im),f,im);frames.append(im)
        clips[name]={'w':w,'h':h,'frames':frames}
    def muzzle(d,f,im):
        if f==0:cross(d,12,12,6);glyph(d,'<',2,3,CYAN);glyph(d,'>',18,17,CYAN)
        elif f==1:diamond(d,12,12,8,DEEP,3);diamond(d,12,12,8,BRIGHT);cross(d,12,12,3)
        else:
            for s in [-1,1]:
                x=12+s*(7+f);line(d,[(x-s*3,5),(x,8),(x-s*3,11)],BRIGHT);line(d,[(5,x-s*3),(8,x),(11,x-s*3)],CYAN)
            for x,y in [(4,4),(19,5),(5,19),(18,18)]:d.rectangle((x,y,x+1,y+1),fill=WHITE if f==2 else CYAN)
    add('muzzle_snap',24,24,4,muzzle)
    def bolt(d,f,im):
        d.polygon([(9,6),(15,2),(16,4),(21,4),(27,7),(21,10),(16,10),(15,12),(9,8)],fill=INK)
        d.polygon([(11,6),(16,4),(21,5),(25,7),(21,9),(16,10),(12,8)],fill=CYAN)
        d.polygon([(14,6),(20,5),(24,7),(20,8),(14,8)],fill=BRIGHT);d.rectangle((11,7,22,7),fill=WHITE)
        for x in [0,4,8]:
            if (x//4+f)%2==0:d.rectangle((x,6,x+2,7),fill=BRIGHT)
        glyph(d,'01<>'[f],max(0,6-f),1,DEEP)
    add('code_bolt',28,14,4,bolt)
    def window(d,f,im):
        d.polygon([(3,3),(29,3),(33,7),(33,29),(29,32),(3,32),(1,29),(1,7)],outline=BRIGHT)
        for y in range(5,31,2):d.line((3,y,31,y),fill=DARK)
        for x,y in [(3,4),(30,6),(30,29),(3,30)]:d.rectangle((x,y,x+1,y+1),fill=GOLD)
        d.line((5,8,29,8),fill=DEEP)
        for j in range(4):
            y=12+j*4;glyph(d,'<>'[j%2],5,y,BRIGHT)
            for k in range(3):
                x=11+k*6;length=2+((f+j+k)%4);d.line((x,y+2,x+length,y+2),fill=[WHITE,CYAN,PINK][(j+k)%3])
        d.rectangle((26,27,28,28),fill=WHITE if f%2 else CYAN)
    add('code_window',36,36,6,window)
    def beam(part):
        def paint(d,f,im):
            if f==0:
                d.rectangle((0,15,31,16),fill=WHITE)
                if part=='head':cross(d,19,16,10)
                return
            if f==1:
                d.polygon([(0,11),(5,11),(5,9),(9,11),(16,11),(18,8),(21,11),(31,11),(31,22),(25,22),(24,24),(20,22),(12,22),(10,25),(6,22),(0,22)],fill=INK)
                d.rectangle((0,11,31,21),fill=CYAN);d.rectangle((0,13,31,19),fill=BRIGHT);d.rectangle((0,14,31,19),fill=WHITE)
                for x in [6,22]:d.rectangle((x,9,x+4,23),outline=DEEP);d.line((x,10,x+4,10),fill=BRIGHT)
            elif f==2:
                for x in range(32):
                    yy=15+((x//4)%4-2);d.line((x,yy-3,x,yy+4),fill=CYAN);d.line((x,yy-1,x,yy+1),fill=WHITE)
                for x,y in [(3,5),(15,26),(25,4)]:d.rectangle((x,y,x+1,y+1),fill=BRIGHT)
            else:
                for x in range(0,32,8):
                    if f==3 or x%16==0:d.rectangle((x,15,x+4,16),fill=WHITE if f==3 else CYAN)
                for x,y in [(5,7),(19,24),(26,10)]:d.rectangle((x,y,x+1,y+1),fill=CYAN)
            if part=='head':
                d.polygon([(21,9),(31,16),(21,24),(24,16)],fill=BRIGHT);d.line((24,16,31,16),fill=WHITE)
            elif part=='tail':
                diamond(d,12,16,9,BRIGHT);cross(d,12,16,4)
        return paint
    for part in ['head','body','tail']:add('debug_beam_'+part,32,32,5,beam(part))
    def seal(d,f,im):
        cx=cy=28
        points=[(cx+round(math.cos((j+.5)*math.tau/8)*24),cy+round(math.sin((j+.5)*math.tau/8)*15)) for j in range(8)]
        line(d,points+[points[0]],DEEP,2)
        for j in range(8):
            a=j*math.tau/8;ux,uy=math.cos(a),math.sin(a)*.65;px,py=-math.sin(a),math.cos(a)*.65
            petal=[(cx+ux*8,cy+uy*8),(cx+ux*16+px*5,cy+uy*16+py*5),(cx+ux*25,cy+uy*25),(cx+ux*16-px*5,cy+uy*16-py*5)]
            d.polygon([(round(x),round(y)) for x,y in petal],fill=DARK,outline=PINK if (j+f)%3==0 else CYAN)
        for j in range(5):line(d,[(20+j*4,22),(20+j*4,34)],DEEP);line(d,[(20,22+j*3),(36,22+j*3)],DEEP)
        a=f*math.tau/8;x=28+round(math.cos(a)*7);y=28+round(math.sin(a)*4);diamond(d,x,y,3,BRIGHT);d.rectangle((27,26,29,28),fill=WHITE)
    add('checkpoint_seal',56,56,8,seal)
    def column(d,f,im):
        spread=[4,9,14,9,4][f]
        for y in range(6,60,5):
            x=24+((y//5+f)%3-1)*spread;w=5+((y+f)%3)*3;d.rectangle((x-w,y,x+w,y+1),fill=WHITE if y%2 else BRIGHT)
            if f in [1,2,3]:d.rectangle((x-w-4,y-2,x-w-3,y-1),fill=PINK)
        diamond(d,24,57,15,CYAN);d.line((24,4,24,58),fill=DEEP)
    add('checkpoint_column',48,64,5,column)
    def keyboard(d,f,im):
        d.polygon([(4,1),(31,1),(35,13),(1,13)],fill=DARK,outline=BRIGHT)
        for row in range(3):
            for col in range(7):
                x=5+col*4-row;y=3+row*3;d.rectangle((x,y,x+2,y+1),fill=WHITE if (row+col+f)%4==0 else DEEP)
        d.line((10,14,27,14),fill=GOLD)
    add('rune_keyboard',36,16,4,keyboard)
    def satellite(d,f,im):
        center=(12,12);d.polygon([(12,1),(19,5),(21,12),(17,19),(12,23),(5,18),(3,11),(6,5)],fill=INK,outline='#cf8d36')
        diamond(d,12,12,8,GOLD);diamond(d,12,12,5,CYAN,2);d.polygon([(12,6),(15,12),(12,17),(10,12)],fill=BRIGHT);d.rectangle((11,10,12,13),fill=WHITE)
        d.polygon([(0,8),(2,10),(2,15),(0,17)],fill=GOLD);d.polygon([(23,8),(21,10),(21,15),(23,17)],fill=GOLD)
        # Eight actual direction frames, authored offline with nearest-neighbor rotation.
        rotated=im.rotate(-45*f,resample=Image.Resampling.NEAREST,center=center);im.paste(rotated)
    add('satellite_drone',24,24,8,satellite)
    def satbeam(d,f,im):
        for x in range(32):
            if (x//5+f)%4!=3:d.line((x,6,x,9),fill=DEEP);d.line((x,7,x,8),fill=BRIGHT)
        d.line((0,7,31,7),fill=WHITE)
        if f%2:diamond(d,16,7,6,GOLD)
    add('satellite_beam',32,16,4,satbeam)
    def hit(d,f,im):
        if f==0:
            d.rectangle((7,9,25,24),outline=RED);d.rectangle((5,6,23,21),outline=BRIGHT);line(d,[(7,6),(24,25)],CYAN,3);line(d,[(7,25),(24,6)],CYAN,3);line(d,[(8,7),(23,24)],WHITE);line(d,[(8,24),(23,7)],WHITE)
        elif f==1:
            for s in [-1,1]:
                x=16+s*10;line(d,[(x-s*4,5),(x,5),(x,12)],RED if s<0 else BRIGHT);line(d,[(x-s*4,27),(x,27),(x,20)],BRIGHT)
            cross(d,16,16,5)
        else:
            for j in range(8):
                a=j*math.tau/8;x=16+round(math.cos(a)*(6+f*2));y=16+round(math.sin(a)*(6+f*2));w=2+(j%2);d.rectangle((x,y,x+w-1,y+(1 if j%3 else 2)),fill=[RED,CYAN,WHITE,PINK][j%4])
    add('hit_glitch',32,32,5,hit)
    def fault(d,f,im):
        d.polygon([(7,0),(15,8),(7,15),(0,8)],fill='#12091a');glyph(d,'<',1,4,RED);glyph(d,'!',6,4,WHITE);glyph(d,'>',11,4,RED)
        if f%2:d.rectangle((0,12,5,13),fill=CYAN)
    add('fault_mark',16,16,4,fault)
    def shadow(d,f,im):d.polygon([(3,2),(8,0),(23,0),(29,2),(31,4),(26,6),(7,6),(0,4)],fill=INK)
    add('pixel_shadow',32,8,1,shadow)
    def shield(d,f,im):
        pts=[(24,1),(39,9),(45,25),(40,43),(24,54),(8,43),(2,25),(8,9),(24,1)];line(d,pts,DEEP)
        for j in range(f,8,2):line(d,[pts[j],pts[j+1]],BRIGHT)
    add('pixel_shield',48,56,2,shield)
    atlas=Image.new('RGBA',(512,768));meta={'image':'assets/hoavi-vfx-pixel.png','width':512,'height':768,'clips':{}}
    x=y=0;rowh=0
    for name,clip in clips.items():
        cells=[]
        for im in clip['frames']:
            if x+im.width>512:x=0;y+=rowh+2;rowh=0
            assert y+im.height<=768;atlas.paste(im,(x,y));cells.append({'x':x,'y':y,'w':im.width,'h':im.height});x+=im.width+2;rowh=max(rowh,im.height)
        meta['clips'][name]={'frames':len(cells),'w':clip['w'],'h':clip['h'],'cells':cells}
    atlas=atlas.crop((0,0,512,y+rowh));meta['height']=atlas.height;atlas.save(ROOT/meta['image'])
    raw=json.dumps(meta,separators=(',',':'));(ROOT/'assets/hoavi-vfx-pixel.json').write_text(raw,encoding='utf-8');(ROOT/'assets/hoavi-vfx-pixel.js').write_text('globalThis.DTHoaViVFX='+raw+';\n',encoding='utf-8')
    preview=Image.new('RGB',(512,24+sum(max(clip['h'],20)+14 for clip in clips.values())),'#142b32');d=ImageDraw.Draw(preview);yy=10
    for name,clip in clips.items():
        d.text((2,yy),name,fill=BRIGHT);yy+=12
        for i,im in enumerate(clip['frames']):preview.paste(im,(2+i*(clip['w']+5),yy),im)
        yy+=max(clip['h'],20)+2
    preview.resize((preview.width*4,preview.height*4),Image.Resampling.NEAREST).save(HERE/'hoavi-pixel-vfx-preview.png')
    print(json.dumps({'pass':True,'clips':len(clips),'frames':sum(len(c['frames']) for c in clips.values()),'atlas':atlas.size}),flush=True)

if __name__=='__main__':main()
