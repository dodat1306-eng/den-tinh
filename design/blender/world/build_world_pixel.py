"""Blender 5.2.3 batch: nine biomes, autotiles, destructible meshes and ground traces."""
import math, random, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from pixel_pipeline import Atlas, Mesh, ROOT, PALETTES, PITCH, preview
from PIL import Image, ImageDraw
from mathutils import Matrix, Vector

HERE=Path(__file__).resolve().parent
SIZES={'tree':(80,96),'willow':(96,104),'banyan':(160,160),'pine':(80,112),'bamboo':(64,96),'fern':(40,40),'reed':(40,48),'flower':(24,32),'lotus':(40,32),'grass':(32,32),'deadTree':(64,80),'rock':(48,48),'crystal':(48,64),'pillar':(48,80),'barrel':(40,48),'crate':(40,40),'lanternPost':(40,80),'house':(128,112),'temple':(160,128),'ruinGate':(128,112),'windmill':(96,128),'pagoda':(112,160),'waterfall':(160,160)}
BIOMES={'village':['#304b3c','#405d49','#527354','#779665'],'forest':['#173a34','#244e45','#3a6953','#77a87b'],'lotus':['#24494e','#335d5d','#4c7a72','#8bb4a0'],'ash':['#392f36','#51464a','#73614f','#b69269'],'crossroads':['#2c493c','#3d5a4b','#58775b','#92ab79'],'ancient':['#1c3038','#293f45','#436254','#829775'],'waterfall':['#21464e','#315e61','#4e887b','#9ac6a3'],'valley':['#3f5237','#576b49','#7e935e','#c1c57c'],'ruins':['#273547','#3a4b61','#576d7e','#9eb7b7']}

def terrain(zone,variant):
    rng=random.Random(zone+str(variant)); p=BIOMES[zone]; im=Image.new('RGBA',(16,16),p[1]); d=ImageDraw.Draw(im)
    for y in range(16):
        for x in range(16):
            n=math.sin((x+variant*3)*.7)+math.cos((y-variant)*.6)+rng.random()*.8
            im.putpixel((x,y),tuple(bytes.fromhex(p[0 if n<-.8 else 2 if n>1.3 else 1][1:]))+(255,))
    for i in range(6):
        x=rng.randrange(1,15); y=rng.randrange(2,15)
        if variant==3 or zone in ('ancient','ruins') and variant>2:
            d.polygon([(x-2,y),(x-1,y-2),(x+2,y-2),(x+3,y),(x+1,y+1)],fill=p[0]); d.line((x-1,y-2,x+1,y-2),fill=p[3])
        elif zone=='ash':
            d.line([(x,y),(x+1,y+2),(x-1,y+4)],fill='#262028')
            if variant%2:d.point((x+1,y+1),fill='#b55232')
        else:
            d.line([(x,y),(x-1,y-2)],fill=p[2]); d.line([(x,y),(x+1,y-3)],fill=p[3]); d.point((x-1,y+1),fill=p[0])
    if zone=='lotus' and variant>3:
        d.ellipse((2,6,9,10),fill='#245f50'); d.line((3,7,6,7),fill='#6dba83'); d.point((7,9),fill=p[1])
    return im

def road(mask):
    im=Image.new('RGBA',(16,16),'#637650'); d=ImageDraw.Draw(im)
    for row in range(4):
        for col in range(4):
            x=col*5-(row%2)*2; y=row*4
            d.rectangle((x,y,x+3,y+2),fill=['#9e8a67','#b4a077','#c6b58b'][(row+col)%3]); d.line((x,y,x+2,y),fill='#d9c99e')
    for bit,rect,inner in [(1,(0,0,15,1),(0,2,15,2)),(2,(14,0,15,15),(13,0,13,15)),(4,(0,14,15,15),(0,13,15,13)),(8,(0,0,1,15),(2,0,2,15))]:
        if not mask&bit:d.rectangle(rect,fill='#263e33');d.rectangle(inner,fill='#6e8053')
    return im

def water(frame,bank=0):
    im=Image.new('RGBA',(16,16),'#24556c');d=ImageDraw.Draw(im)
    for y in (2,7,12):
        x=(y*3+frame*2)%12;d.line((x,y,min(15,x+4),y),fill='#4f9da6');d.line((max(0,x-3),y+1,x,y+1),fill='#327e8c')
    if bank:
        for bit,rect in [(1,(0,0,15,2)),(2,(13,0,15,15)),(4,(0,13,15,15)),(8,(0,0,2,15))]:
            if bank&bit:d.rectangle(rect,fill='#758e83')
        for x in range(1,16,4):d.point((x,3+(frame+x)%2),fill='#d9f9ed')
    return im

def decal(kind,size=(56,40),frame=0):
    w,h=size;im=Image.new('RGBA',size);d=ImageDraw.Draw(im);rng=random.Random(kind+str(size))
    if kind in ('scorch_mark','crater_mark','frost_patch','ash_scatter'):
        colors={'scorch_mark':['#3d2b24','#262028','#120d14'],'crater_mark':['#a28e6d','#655447','#211b27'],'frost_patch':['#245c8a','#6fc9eb','#dbfbff'],'ash_scatter':['#37313c','#585c63','#a2a8ab']}[kind]
        for ring in range(3):
            r=1-ring*.18;pts=[]
            for i in range(32):
                a=i*math.tau/32;n=.85+rng.random()*.15;pts.append((int(w/2+math.cos(a)*(w/2-2)*r*n),int(h/2+math.sin(a)*(h/2-2)*r*n)))
            d.polygon(pts,fill=colors[ring])
        if kind=='crater_mark':
            for i in range(9):
                a=i*math.tau/9;d.line([(w/2,h/2),(w/2+math.cos(a)*w*.28,h/2+math.sin(a)*h*.28),(w/2+math.cos(a+.2)*w*.48,h/2+math.sin(a+.2)*h*.48)],fill='#12091a',width=1)
        if kind=='frost_patch':
            for i in range(12):
                x=rng.randrange(4,w-4);y=rng.randrange(4,h-4);d.line((x-2,y,x+2,y),fill='#6fc9eb');d.line((x,y-2,x,y+2),fill='#ffffff')
        if kind=='ash_scatter':
            for _ in range(w*h//2):im.putpixel((rng.randrange(w),rng.randrange(h)),(0,0,0,0))
    elif kind=='lightning_scar':
        for i in range(7):
            a=i*math.tau/7;pts=[(w//2,h//2)]
            for j in range(1,5):pts.append((w/2+math.cos(a+(j%2)*.3)*w*.1*j,h/2+math.sin(a+(j%2)*.3)*h*.1*j))
            d.line(pts,fill='#32244a',width=3);d.line(pts,fill='#140f1d',width=1)
        d.rectangle((w//2-1,h//2-1,w//2+1,h//2+1),fill='#ffee77')
    elif kind=='flame':
        for i in range(5):
            x=3+i*4;y=h-2;top=5+(i*7+frame*5)%14
            d.polygon([(x-3,y),(x-4,top+9),(x,top),(x+3,top+7),(x+4,y)],fill='#d8441b')
            d.polygon([(x-1,y),(x,top+7),(x+2,y)],fill='#ffbb33');d.point((x,top+8),fill='#ffedaf')
    else:
        for i in range(12):
            x=int(w/2+math.sin(i*7)*frame*4);y=int(h-5-frame*5+math.cos(i*3)*8)
            if kind=='frozen_shatter':d.polygon([(x,y-4),(x+3,y),(x,y+4),(x-2,y)],fill=['#dbfbff','#6fc9eb'][i%2])
            else:d.rectangle((x,y,x+2+(i%3),y+2+(i%2)),fill=['#d8e6e6','#a3bdc4','#7d9aa4'][(i+frame)%3] if kind=='steam_cloud' else ['#1a151c','#585c63','#a2a8ab'][i%3])
    return im

def prop(kind,state,frame=0):
    mesh=Mesh();rng=random.Random(kind);w,h=SIZES[kind];H=(h-15)*PITCH/.8944;W=(w-12)*PITCH/2
    burned=state in ('charred','ash'); frozen=state=='frozen'; wood='ice' if frozen else 'char' if burned else 'wood';leaf='ice' if frozen else 'orange' if state=='burning' else 'leaf'
    if state=='ash':
        for i in range(13):
            x=(rng.random()-.5)*W*1.6;y=(rng.random()-.5)*.4
            mesh.ico((x,y,.16+rng.random()*.12),(.16+rng.random()*.2,.13,.16),'ash',1)
        for i in range(4):mesh.rod((i*.17-.3,-.05,.12),(i*.17-.12,.06,.3),.035,'char',sides=6)
        mesh.ico((.12,-.16,.12),(.04,.035,.03),'ember',1,False);return mesh
    stonekind=kind in ('rock','crystal','pillar','ruinGate','pagoda','waterfall')
    if state=='charred' and stonekind:
        for i in range(6):mesh.ico(((i%3-1)*W*.45,(i//3-.5)*.35,.18+(i%2)*.1),(W*.35,.24,.2),'ice' if kind=='crystal' else 'stone',1)
        return mesh
    if kind in ('tree','willow','banyan','pine','deadTree'):
        mesh.rod((0,0,.08),(.07,.12,H*.62),W*.12,wood,end=W*.07,sides=9)
        for i in range(7):
            a=i*math.tau/7;mesh.rod((math.cos(a)*W*.4,math.sin(a)*W*.27,.03),(0,0,H*.2),W*.045,wood,end=W*.08)
        for i in range(9):
            side=-1 if i%2 else 1;z=H*(.31+i*.046);end=(side*W*(.4+(i%3)*.15),.1+(i%2)*.12,z+H*.12)
            mesh.rod((.02,0,z),end,W*.055,wood,end=W*.025)
            if not burned and kind!='deadTree':
                if kind=='pine':
                    mesh.ico((0,.1,z+H*.11),(W*(1-i*.06),W*.36,H*.15),leaf,2)
                else:
                    mesh.ico(end,(W*.43,W*.32,H*.14),leaf,2)
                    mesh.ico((end[0]-.1,end[1]-.18,end[2]+H*.05),(W*.24,W*.17,H*.09),'jade' if not frozen and state!='burning' else leaf,1)
                if kind=='willow':
                    for j in range(3):mesh.path([(end[0]+j*.09,end[1],end[2]),(end[0]+.12+j*.09,end[1]-.1,end[2]-H*.23)],.025,leaf,part=False)
        if not burned and kind!='deadTree':mesh.ico((0,.13,H*.84),(W*.62,W*.45,H*.18),leaf,2)
        for i in range(6):
            z=H*(.12+i*.067);mesh.path([(-W*.025,-W*.11,z),(.03,-W*.12,z+.11),(-.02,-W*.11,z+.18)],.015,'ember' if burned else 'earth',part=False)
    elif kind=='bamboo':
        for i in range(4):
            x=(i-1.5)*W*.45;top=H*(.65+(i%3)*.13)
            mesh.rod((x,0,.04),(x+.12,.12,top),.06,wood if burned or frozen else 'jade',end=.04)
            for j in range(2,8):
                z=j*top/8;mesh.rod((x+.12*j/8,0,z-.02),(x+.12*j/8,0,z+.02),.075,'char' if burned else 'cream',sides=8,part=False)
                if not burned:
                    side=(-1)**(i+j);mesh.rod((x,0,z),(x+side*W*.48,-.03,z+.25),.02,leaf)
                    for k in range(3):mesh.ico((x+side*(.1+k*.13),-.08,z+.18+k*.09),(.2,.035,.055),leaf,1)
    elif kind in ('fern','reed','flower','lotus','grass'):
        for i in range(7):
            a=i*math.tau/7;x=math.cos(a)*W*.6;y=math.sin(a)*W*.3;z=H*(.28+(i%3)*.16)
            mesh.rod((0,0,.03),(x,y,z),.02,wood if burned else leaf)
            if not burned:
                mesh.ico((x,y,z),(.18 if kind!='lotus' else .26,.07,.08),leaf,1)
                if kind in ('flower','lotus'):
                    for j in range(5):
                        b=j*math.tau/5;mesh.ico((x+math.cos(b)*.09,y+math.sin(b)*.07,z+.07),(.09,.07,.1),'ice' if frozen else 'pink',1)
                    mesh.ico((x,y-.06,z+.1),(.04,.03,.04),'gold',1,False)
                if kind=='fern':
                    for j in range(3):mesh.ico((x*j/3,y-.05,z*j/3),(.17,.03,.05),leaf,1)
                if kind=='reed':mesh.ico((x,y,z+.13),(.045,.04,.16),'cream',1)
    elif kind in ('rock','crystal'):
        for i in range(5):
            x=(i%3-1)*W*.44;y=(i//3-.5)*.18
            mesh.ico((x,y,H*(.21+(i%3)*.08)),(W*.45,.4,H*(.24+(i%2)*.11)),'ice' if frozen or kind=='crystal' else 'stone',1 if kind=='rock' else 2)
            if kind=='crystal':mesh.rod((x,y,.07),(x+.1,y,H*(.65+(i%2)*.25)),W*.17,'ice',end=.006,sides=5)
    elif kind=='pillar':
        for z,r in [(.1,W*.8),(.3,W*.67),(H*.88,W*.72)]:mesh.rod((0,0,z),(0,0,z+.13),r,'ice' if frozen else 'stone',sides=8)
        mesh.rod((0,0,.32),(0,0,H*.91),W*.45,'ice' if frozen else 'stone',end=W*.38)
        mesh.path([(-.05,-W*.45,H*.8),(.1,-W*.46,H*.6),(-.08,-W*.46,H*.44),(.12,-W*.46,H*.2)],.025,'night',part=False)
        for j in range(3):mesh.rod((-.15,-W*.46,H*(.4+j*.1)),(.02,-W*.47,H*(.4+j*.1)),.018,'cyan',part=False)
    elif kind in ('barrel','crate','lanternPost'):
        if kind=='lanternPost':
            mesh.rod((0,0,0),(0,0,H*.95),.065,wood);mesh.rod((-.35,0,H*.9),(.35,0,H*.9),.045,wood)
            mesh.ico((.2,-.02,H*.65),(.24,.18,.31),'ice' if frozen else 'gold',2)
            for z in (H*.4,H*.87):mesh.rod((.2,0,z),(.2,0,z+.06),.27,wood,sides=6)
        else:
            for i in range(9):
                a=i*math.tau/9;mesh.rod((math.cos(a)*W*.53,math.sin(a)*W*.53,.12),(math.cos(a)*W*.53,math.sin(a)*W*.53,H*.82),W*.19,wood,sides=5)
            for z in (.2,H*.7):mesh.rod((0,0,z),(0,0,z+.065),W*.78,'stone',sides=9)
            mesh.ico((0,0,H*.84),(W*.68,W*.68,.1),wood,1)
    elif kind=='waterfall':
        for side in (-1,1):
            for i in range(5):mesh.ico((side*W*.6,.3,H*(.12+i*.16)),(W*.27,.4,H*.19),'stone',1)
        for i in range(9):mesh.rod(((i-4)*W*.09,0,.15),((i-4)*W*.09,.2,H*.88),.07,'water',sides=6)
        for i in range(7):mesh.ico(((i-3)*W*.12,-.1,.12),(.24,.15,.09),'cream',1)
    else:
        # Architecture uses tapered round pillars, faceted volumes and layered roof tiles.
        tiers=4 if kind=='pagoda' else 1
        for level in range(tiers):
            base=H*.06+level*H*.21; span=W*(1-level*.16);roof=H*(.55 if tiers==1 else .15)
            for side in (-1,1):
                mesh.rod((side*span*.65,0,base),(side*span*.65,0,base+roof),span*.07,'stone' if kind=='ruinGate' else wood)
                mesh.rod((side*span*.65,.4,base),(side*span*.65,.4,base+roof),span*.07,wood)
            if kind!='ruinGate':mesh.ico((0,.2,base+roof*.45),(span*.72,.4,roof*.5),'cream' if not burned else 'char',1)
            for row in range(6):
                f=row/5;z=base+roof+H*.24*(1-f)/(1 if tiers==1 else 2)
                mesh.rod((-span*(.18+f*.82),-.14+f*.05,z),(span*(.18+f*.82),-.14+f*.05,z),.09,'red' if kind=='temple' else 'stone' if kind=='ruinGate' else wood,sides=6)
                for j in range(-5,6):mesh.ico((j*span*(.18+f*.82)/5,-.24,z+.03),(.1,.04,.03),'gold' if kind=='temple' else 'earth',1,False)
        if kind in ('house','temple'):
            # Recessed door, timber jambs and lit lattice windows break up each facade.
            mesh.ico((0,-.5,H*.2),(W*.16,.07,H*.2),'night',1)
            mesh.rod((-W*.18,-.53,.05),(-W*.18,-.53,H*.4),.035,wood)
            mesh.rod((W*.18,-.53,.05),(W*.18,-.53,H*.4),.035,wood)
            mesh.rod((-W*.18,-.53,H*.4),(W*.18,-.53,H*.4),.04,wood)
            for side in (-1,1):
                x=side*W*.46;z=H*.32
                mesh.ico((x,-.48,z),(W*.13,.06,H*.12),'gold',1)
                for yy in (-1,1):mesh.rod((x-W*.14,-.56,z+yy*H*.12),(x+W*.14,-.56,z+yy*H*.12),.025,wood)
                for xx in (-1,0,1):mesh.rod((x+xx*W*.14,-.56,z-H*.12),(x+xx*W*.14,-.56,z+H*.12),.024,wood)
                mesh.ico((side*W*.72,-.25,H*.35),(.12,.1,.19),'ember',1)
        if kind=='windmill':
            mesh.rod((0,0,.1),(0,0,H*.68),W*.3,wood,end=W*.18)
            for i in range(4):
                a=i*math.tau/4;mesh.rod((0,-.3,H*.66),(math.cos(a)*W*.9,-.3,H*.66+math.sin(a)*W*.9),.09,'cream')
    if frozen:
        for i in range(6):mesh.rod(((i-2.5)*W*.25,-.25,H*(.32+(i%2)*.2)),((i-2.5)*W*.25,-.26,H*(.24+(i%2)*.2)),.04,'ice',end=.002,sides=5)
    if state=='sliced':
        angle=min(1,frame/5)*math.pi/2
        for i,v in enumerate(mesh.verts):
            p=Vector(v)
            if p.z>H*.27:
                p.z-=H*.27;p=Matrix.Rotation(-angle,3,'Y') @ p;p.z+=H*.27;mesh.verts[i]=tuple(p)
        mesh.ico((0,-.08,H*.27),(W*.17,.14,.05),'cream',1)
    return mesh

def run():
    atlas=Atlas('world-pixel-v08',2048)
    for biome in BIOMES:
        for variant in range(6):atlas.pixels(f'terrain/{biome}/{variant}',[terrain(biome,variant)],anchor=8)
    for mask in range(16):atlas.pixels(f'road/{mask}',[road(mask)],anchor=8)
    for bank in range(16):atlas.pixels(f'water/{bank}',[water(f,bank) for f in range(3)],6,8)
    bridge=road(15);d=ImageDraw.Draw(bridge)
    for y in range(0,16,4):d.rectangle((0,y,15,y+2),fill='#aa8257');d.line((0,y,15,y),fill='#e4bc7b')
    atlas.pixels('bridge',[bridge],anchor=8)
    for kind,(w,h) in SIZES.items():
        for state in ('intact','burning','charred','ash','frozen','sliced'):
            frames=6 if state=='sliced' else 1;sw=w*2 if state=='sliced' else w
            for frame,cell in enumerate(atlas.cells(kind+'/'+state,sw,h,frames,10)):
                model=prop(kind,state,frame);atlas.add(cell,model,kind+'_'+state)
    for size,dims in [('small',(32,24)),('medium',(56,40)),('large',(88,64))]:atlas.pixels('scorch_mark/'+size,[decal('scorch_mark',dims)],anchor=dims[1]/2)
    for kind in ('crater_mark','lightning_scar','frost_patch','ash_scatter'):atlas.pixels(kind,[decal(kind)],anchor=20)
    for kind in ('flame','steam_cloud','ash_burst','frozen_shatter'):
        dims=(24,40) if kind=='flame' else (48,40)
        atlas.pixels(kind,[decal(kind,dims,f) for f in range(4)],10,dims[1]-4)
    image,meta=atlas.bake(HERE,'DTWorldPixelAtlas')
    keys=['tree/intact','tree/burning','tree/charred','tree/ash','ash_burst','lightning_scar','crater_mark','tree/frozen','frozen_shatter','bamboo/sliced','willow/intact','pine/intact','rock/intact','house/intact','temple/intact']
    preview(image,meta,keys,HERE/'world-destruction-preview.png')
    preview(image,meta,[k+'/intact' for k in SIZES],HERE/'world-models-preview.png',6)
    import shutil,json
    art=ROOT/'Unity/Assets/Resources/Art'
    shutil.copyfile(ROOT/meta['image'],art/'world-pixel-v08.png')
    (art/'WorldTilesClips.json').write_text(json.dumps({'clips':[{'key':k,'texture':'world-pixel-v08','fps':v['fps'],'cells':v['cells']} for k,v in meta['clips'].items()]},separators=(',',':')),encoding='utf-8')

if __name__=='__main__':run()
