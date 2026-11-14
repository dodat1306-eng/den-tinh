"""Quân Lê: posed 3D meshes, physical left earring, 24 colors and 22 beast silhouettes."""
import json, math, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from pixel_pipeline import Atlas, Mesh, ROOT, PALETTES, PITCH, UP, preview
from mathutils import Matrix, Vector
from PIL import Image, ImageDraw

HERE=Path(__file__).resolve().parent
COLORS=['#12091a','#0c0914','#1b1429','#352752','#ffe0cc','#ebb89b','#c44dff','#ff3b7c','#ffffff','#00f0ff','#b84dff','#110d1a','#231938','#422f66','#c7d4e8','#110b18','#221633','#4deeea','#a64dff','#5ce1e6','#7a4d9b','#64406b','#9c849f','#79516a']
PALETTES.update(qhair=COLORS[1:4]+[COLORS[20]],qskin=['#79516a','#ebb89b','#ffe0cc','#ffe0cc'],qcoat=['#110d1a','#231938','#422f66','#64406b'],qsilver=['#64406b','#9c849f','#c7d4e8','#ffffff'],qshade=['#110b18','#221633','#352752','#7a4d9b'],qglow=['#a64dff','#b84dff','#5ce1e6','#4deeea'])
SPECIES=('wolf','bear','eagle','tiger','panther','lion','gorilla','rhino','elephant','stag','boar','cobra','scorpion','spider','croc','shark','bat','falcon','mantis','crab','treant','dragon')
ACTIONS={'idle':4,'run':6,'dash':4,'attack':5,'q_cast':6,'e_cast':6,'r_ult':6,'hit':2}
VIEWS={'S':0,'E':-math.pi/2,'N':math.pi,'W':math.pi/2}

def eye(m,x,y,z,neon='#c44dff',size=.08):
    m.ico((x,y,z),(size*1.5,.035,size),'#12091a',1,False)
    m.ico((x,y-.035,z+.01),(size*1.15,.02,size*.7),'#ffffff',1,False)
    m.ico((x+.015,y-.055,z),(size*.45,.012,size*.65),neon,1,False)
    m.ico((x,y-.07,z+.03),(size*.24,.01,size*.22),'#ffffff',1,False)

def sovereign(action,frame,count,view):
    m=Mesh();phase=frame/count*math.tau;stride=math.sin(phase) if action in ('run','dash') else 0
    cast=action in ('attack','q_cast','e_cast','r_ult');swing=math.sin(phase)*.45 if cast else 0;bob=abs(stride)*.04+math.sin(phase)*.02
    def p(x,y,z):return(x,y,z+bob)
    for side in (-1,1):
        m.rod(p(side*.17,0,.7),p(side*.18,-stride*side*.16,.16),.105,'qcoat')
        m.ico(p(side*.18,-.09-stride*side*.16,.11),(.16,.23,.12),'#0c0914',1)
        hem=side*(.34+.08*math.sin(phase+side));m.prism([(side*.07,.9+bob),(side*.3,1.12+bob),(hem+.08,.28+bob),(hem,.11+bob),(side*.09,.52+bob)],'qcoat',.08,.18)
    m.ico(p(0,0,1.02),(.32,.22,.43),'qcoat',2)
    m.prism([(-.25,1.33+bob),(0,1.06+bob),(.25,1.33+bob),(.17,.88+bob),(-.17,.88+bob)],'#110d1a',-.22)
    for side in (-1,1):
        m.path([p(side*.28,-.18,1.35),p(side*.16,-.27,1.32),p(0,-.27,1.07)],.022,'qsilver',part=False)
        m.ico(p(side*.31,0,1.26),(.2,.22,.19),'qcoat',1)
        elbow=p(side*.43,-.04,1.02+max(0,swing)*.35);hand=p(side*(.48+abs(swing)*.3),-.23-swing*side,.94+max(0,swing)*.45)
        m.rod(p(side*.33,0,1.23),elbow,.10,'qcoat');m.rod(elbow,hand,.08,'qcoat');m.ico(hand,(.10,.09,.1),'qskin',1)
        if side==-1:
            x,y,z=hand;m.rod((x,y,z-.25),(x,y,z+.4),.035,'qsilver')
            m.prism([(x-.09,z+.2),(x-.14,z+.52),(x+.02,z+.73),(x+.08,z+.38)],'qshade',y-.04)
            m.path([(x-.08,y-.09,z+.28),(x-.06,y-.09,z+.51),(x+.02,y-.09,z+.69)],.018,'#a64dff',part=False)
        else:
            x,y,z=hand;m.ico((x,y-.04,z+.24),(.16,.12,.18),'qshade',2)
            for i in range(5):
                a=i*math.tau/5+phase;m.path([(x+math.cos(a)*.09,y-.13+math.sin(a)*.06,z+.22),(x+math.cos(a)*.17,y-.14+math.sin(a)*.10,z+.35),(x+math.cos(a+.6)*.09,y-.13+math.sin(a+.6)*.06,z+.49)],.028,'qglow',end=.003)
    # Distinct chibi face, layered wolf-cut, swept fringe and sideburns.
    m.ico(p(0,-.015,1.73),(.39,.29,.36),'qskin',2)
    m.ico(p(0,.07,1.96),(.42,.3,.24),'qhair',2)
    for i in range(9):
        x=(i-4)*.085;z=1.98-abs(i-4)*.025
        m.prism([(x-.10,z+.12+bob),(x+.11,z+.07+bob),(x+.06,1.68+bob+(i%3)*.07),(x-.04,1.78+bob)],'qhair',-.26-i*.007,.13)
    for side in (-1,1):
        m.ico(p(side*.37,.01,1.69),(.10,.14,.18),'qskin',1)
        for i in range(3):m.rod(p(side*(.31+i*.025),.1+i*.04,1.9+i*.04),p(side*(.4+i*.02),.04+i*.04,1.43+i*.06),.09,'qhair',end=.005,sides=5)
        eye(m,side*.16,-.292,1.74+bob)
        m.rod(p(side*.08,-.34,1.86),p(side*.27,-.31,1.89),.016,'#0c0914',part=False)
    m.path([p(-.07,-.303,1.57),p(.035,-.32,1.565),p(.10,-.30,1.59)],.012,'#79516a',part=False)
    m.path([p(-.09,-.26,1.32),p(0,-.28,1.16),p(.09,-.26,1.32)],.014,'qsilver',part=False)
    m.ico(p(0,-.3,1.17),(.038,.02,.06),'#ff3b7c',1,False)
    # Character left is +X in front view. Geometry is rotated, never mirrored.
    ear=Vector(p(.43,-.12,1.57));m.rod(tuple(ear+Vector((0,0,.13))),tuple(ear),.024,'qsilver',part=False)
    m.ico(tuple(ear),(.055,.035,.09),'#b84dff',1,False)
    if action=='q_cast':
        for side in (-1,1):m.ico(p(side*.38,-.02,1.3),(.24,.23,.22),'qshade',1)
    if action=='hit':m.verts=[(x+z*.05*math.cos(phase),y,z*.96) for x,y,z in m.verts];ear=Vector((ear.x+ear.z*.05*math.cos(phase),ear.y,ear.z*.96))
    rotation=Matrix.Rotation(VIEWS[view],3,'Z');m.verts=[tuple(rotation@Vector(v)) for v in m.verts]
    ear=rotation@ear
    return m,ear

def beast(kind,action,f,n):
    m=Mesh();phase=f/n*math.tau;walk=math.sin(phase);strike=action=='attack';body='qshade';glow='qglow'
    def orb(p,s,c=body,d=1):m.ico(p,s,c,d)
    def limb(a,b,r=.10,c=body):m.rod(a,b,r,c,end=r*.65,sides=6)
    def fang(a,b,r=.07):m.rod(a,b,r,'#c7d4e8',end=.002,sides=5)
    def gaze(x,y,z,span=.16):
        for side in (-1,1):orb((x+side*span,y+.02,z),(.06,.11,.055),'#4deeea')
    def tail(points,r=.12):m.path(points,r,body,end=.02)
    if kind in ('wolf','tiger','panther','lion','rhino','boar','stag','croc'):
        length=.68 if kind=='croc' else .48;wide=.42 if kind in ('rhino','boar') else .32;z=.65
        orb((0,.15,z),(wide,length,.34))
        for side in (-1,1):
            for rear in (-1,1):
                step=walk*side*rear*.16;limb((side*wide*.8,rear*length*.7,z),(side*(wide+.04),rear*length*.7+step,.12),.10)
                orb((side*(wide+.04),rear*length*.7+step-.06,.08),(.13,.18,.09))
        headz=.72 if kind=='croc' else 1.02;heady=-.64 if kind=='croc' else -.42
        orb((0,heady,headz),(.29,.27,.27));orb((0,heady-.23,headz-.1),(.22,.24,.13));gaze(0,heady-.24,headz+.06)
        if kind!='croc':
            for side in (-1,1):
                if kind in ('tiger','panther','lion'):orb((side*.22,heady+.03,headz+.24),(.105,.09,.12))
                elif kind in ('wolf','boar','stag'):m.rod((side*.2,heady+.04,headz+.16),(side*.23,heady+.06,headz+.43),.115,body,end=.003,sides=5)
        tail([(0,.45,.65),(.2,.85,.65),(.4,.99,.92+walk*.12)],.09)
        if kind=='wolf':
            for i in range(5):fang(((i-2)*.1,-.18,1),((i-2)*.12,-.03,1.28),.08)
        elif kind=='tiger':
            orb((0,-.1,.82),(.40,.45,.34));orb((0,heady-.08,headz),(.35,.30,.28))
            for i in range(5):m.path([(-.40,.38-i*.15,.73),(0,.42-i*.15,1.08),(.40,.38-i*.15,.73)],.055,glow,part=False)
            for side in (-1,1):fang((side*.16,-.75,.93),(side*.18,-.76,.74),.055)
        elif kind=='panther':
            orb((0,-.48,1.08),(.34,.28,.13));m.path([(-.3,-.45,1.04),(0,-.66,1.02),(.3,-.45,1.04)],.02,'#ff3b7c',part=False)
            tail([(0,.45,.65),(.3,.95,.67),(.64,1.20,.9),(.75,1.03,1.15)],.065)
        elif kind=='lion':
            for i in range(12):
                a=i*math.tau/12;fang((math.cos(a)*.3,-.35,1.02+math.sin(a)*.31),(math.cos(a)*.46,-.32,1.02+math.sin(a)*.48+walk*.03),.13)
                orb((math.cos(a)*.34,-.4,1.02+math.sin(a)*.34),(.07,.04,.08),glow)
        elif kind=='rhino':
            orb((0,.1,.88),(.48,.54,.27));fang((0,-.77,.86),(0,-.88,1.48),.17);fang((0,-.55,1.05),(0,-.61,1.36),.12)
        elif kind=='boar':
            for i in range(5):fang((0,-.15+i*.14,.91),(0,-.10+i*.14,1.35),.10)
            for side in (-1,1):m.path([(side*.18,-.64,.83),(side*.37,-.74,.95),(side*.34,-.7,1.18)],.055,'#c7d4e8',end=.01)
        elif kind=='stag':
            for side in (-1,1):
                m.path([(side*.14,-.4,1.18),(side*.35,-.32,1.65),(side*.48,-.27,1.98)],.045,glow)
                for i in range(3):limb((side*(.25+i*.07),-.33,1.4+i*.16),(side*(.47+i*.1),-.35,1.55+i*.16),.035,glow)
        else:
            for i in range(5):orb((0,.03+i*.16,.95),(.13,.12,.14),glow)
            tail([(0,.55,.55),(.3,1.02,.4),(.68,1.3,.22)],.17)
            for side in (-1,1):
                for i in range(5):fang((side*.18,-.59-i*.07,.70),(side*.18,-.59-i*.07,.56),.035)
    elif kind in ('bear','gorilla','elephant'):
        huge=kind=='elephant';orb((0,.12,1.03),(.72 if huge else .55,.44,.75))
        for side in (-1,1):
            orb((side*.4,0,.18),(.25,.32,.23));limb((side*.36,.03,.65),(side*.4,0,.2),.24)
            hand=(side*(.86 if kind=='gorilla' else .74),-.18,1.22+(.5*walk if strike else walk*.08))
            limb((side*.52,.04,1.46),hand,.27);orb(hand,(.32,.29,.37))
            if kind=='bear':
                for i in range(3):fang((hand[0]+(i-1)*.13,hand[1]-.2,hand[2]),(hand[0]+(i-1)*.13,hand[1]-.35,hand[2]-.32),.055)
        orb((0,-.02,1.92),(.47,.36,.4));gaze(0,-.36,1.99,.21)
        if kind=='bear':
            for side in (-1,1):orb((side*.37,0,2.18),(.18,.13,.18))
            orb((0,-.32,1.78),(.25,.15,.16))
        elif kind=='gorilla':orb((0,-.28,1.26),(.39,.12,.51),'#352752');orb((0,-.32,1.82),(.31,.1,.2))
        else:
            for side in (-1,1):
                orb((side*.58,.04,1.83),(.36,.17,.49));m.path([(side*.25,-.32,1.7),(side*.43,-.6,1.55),(side*.44,-.78,1.91)],.09,'#c7d4e8',end=.02)
            tail([(0,-.37,1.84),(0,-.55,1.25),(.18+walk*.07,-.65,.91)],.15)
    elif kind in ('eagle','bat','falcon','dragon'):
        dragon=kind=='dragon';z=1.1+walk*.10
        orb((0,0,z),(.27 if not dragon else .42,.22,.48))
        for side in (-1,1):
            span=1.2 if kind in ('eagle','dragon') else .95;wingz=z+.35+walk*.20
            outline=[(.16,z+.24),(.55,wingz+.3),(span,wingz+.13),(span-.12,wingz-.11),(.6,z-.12),(.25,z-.16)]
            if kind=='eagle':outline=[(.16,z+.24),(.55,wingz+.34),(span,wingz+.16),(1.11,wingz-.14),(.96,wingz-.04),(.88,wingz-.28),(.73,wingz-.13),(.62,z-.21),(.25,z-.16)]
            elif kind=='falcon':outline=[(.16,z+.24),(.58,wingz+.14),(1.12,wingz+.55),(.87,z-.08),(.48,z-.29),(.20,z-.2)]
            elif kind=='bat':outline=[(.16,z+.24),(.56,wingz+.33),(.95,wingz+.22),(.73,wingz-.18),(.56,z+.03),(.44,z-.25),(.25,z-.16)]
            m.prism([(side*x,zz) for x,zz in outline],body,.03,.08)
            for i in range(5):
                x=side*(.35+i*.16);y=-.06-i*.055;m.path([(side*(.18+i*.08),y,z+.16),(x,y-.01,wingz-i*.05),(x+side*.1,y-.025,wingz-.32-i*.04)],.022,glow,part=False)
            fang((side*.13,-.06,z-.35),(side*.25,-.26,z-.56),.07)
        orb((0,-.13,z+.53),(.24,.23,.25));gaze(0,-.34,z+.58,.12)
        if kind in ('eagle','falcon'):fang((0,-.34,z+.49),(0,-.61,z+.37),.13)
        else:
            for side in (-1,1):fang((side*.16,-.08,z+.7),(side*.3,.04,z+1.02),.10)
        if kind=='falcon':tail([(0,.1,z-.3),(0,.24,z-.65),(.16,.25,z-.9)],.13)
        if dragon:
            tail([(0,.2,z-.2),(.5,.4,.45),(.87,.3,.18),(1.07,.2,.4)],.22)
            orb((0,-.3,z+.35),(.22,.19,.16));m.path([(0,-.53,z+.4),(.2,-.7,z+.3),(.28,-.9,z+.48)],.07,glow,end=.015)
    elif kind=='cobra':
        pts=[(math.sin(i*.8+phase*.1)*.52,.2-i*.05,.12+i*.08) for i in range(12)];tail(pts,.17)
        orb((0,-.27,1.26),(.45,.13,.51));orb((0,-.36,1.58),(.25,.23,.25));gaze(0,-.57,1.62,.13)
        for side in (-1,1):m.path([(side*.08,-.42,1.1),(side*.35,-.43,1.48),(side*.08,-.43,1.79)],.025,glow,part=False)
        m.path([(0,-.58,1.49),(0,-.76,1.46),(.10,-.82,1.5)],.02,'#ff3b7c',part=False)
    elif kind in ('scorpion','spider','crab','mantis'):
        legs=4 if kind=='spider' else 3;orb((0,.1,.55),(.40,.45,.25));orb((0,-.31,.65),(.30,.24,.23));gaze(0,-.53,.72)
        for side in (-1,1):
            for i in range(legs):
                y=-.35+i*.22;step=math.sin(phase+i)*.05;m.path([(side*.25,y,.55),(side*(.65+step),y+.15,.45),(side*(.81+step),y-.03,.06)],.055,body)
            if kind in ('scorpion','crab'):
                x=side*.73;limb((side*.3,-.23,.61),(x,-.48,.77),.12);orb((x,-.53,.87),(.24,.23,.23))
                for sign in (-1,1):fang((x+sign*.14,-.58,.87),(x+sign*.07,-.83,.90),.12)
            if kind=='mantis':
                m.path([(side*.22,-.1,.65),(side*.40,-.27,1.18),(side*.72,-.31,1.46),(side*.56,-.4,.91)],.09,glow,end=.015)
        if kind=='scorpion':m.path([(0,.37,.58),(.2,.63,.91),(.12,.64,1.46),(0,.32,1.68),(0,.1,1.38)],.13,body,end=.035)
        if kind=='spider':orb((0,.38,.62),(.41,.4,.34));m.path([(-.2,.1,.91),(0,.35,1),(.2,.1,.91)],.04,glow,part=False)
        if kind=='crab':orb((0,.09,.75),(.57,.37,.22));fang((-.25,-.3,.76),(-.3,-.36,1.1),.04);fang((.25,-.3,.76),(.3,-.36,1.1),.04)
        if kind=='mantis':orb((0,-.1,1.25),(.27,.19,.2));gaze(0,-.28,1.30,.19)
    elif kind=='shark':
        orb((0,.0,.43),(.35,.72,.30));m.prism([(-.12,.60),(.0,1.31),(.28,.55)],body,.18,.12)
        for side in (-1,1):m.prism([(side*.18,.49),(side*.72,.23),(side*.25,.20)],glow,.0,.10)
        orb((0,-.56,.52),(.36,.35,.25));gaze(0,-.78,.65,.23)
        for i in range(6):fang(((i-2.5)*.08,-.83,.5),((i-2.5)*.08,-.85,.34),.035)
        m.prism([(-.15,.47),(-.34,.85),(0,.64),(.34,.85),(.13,.38)],body,.7,.12)
    else:
        orb((0,0,1.03),(.37,.28,.78));gaze(0,-.28,1.5,.16)
        for side in (-1,1):
            m.path([(side*.27,0,1.3),(side*.68,-.03,1.12),(side*.88,-.12,.61+walk*.12)],.13,body)
            for j in range(3):tail([(side*.13,.04,.47),(side*(.35+j*.18),-.07,.17),(side*(.43+j*.22),-.2,.08)],.10)
            for i in range(3):m.path([(side*.16,.03,1.62),(side*(.31+i*.16),.05,1.91+i*.12),(side*(.36+i*.16),.04,2.18+i*.1)],.06,body)
        m.path([(-.08,-.28,.5),(.10,-.29,.92),(-.04,-.29,1.30)],.032,glow,part=False)
    if strike:
        m.verts=[(x*(1+.06*walk),y-.10*max(0,walk)*z,z+.05*math.sin(phase)) for x,y,z in m.verts]
    elif kind=='shark':m.verts=[(x+z*.12*walk,y,z+.08*walk) for x,y,z in m.verts]
    if kind in ('wolf','tiger','panther','lion','rhino','boar','stag','croc'):
        rotation=Matrix.Rotation(-.72,3,'Z');m.verts=[tuple(rotation@Vector(v)) for v in m.verts]
    return m

def effect(kind,f,n):
    m=Mesh();phase=f/n*math.tau
    if kind in ('armor','tendrils'):
        for side in (-1,1):
            m.ico((side*.41,0,1.22),(.25,.27,.22),'qshade',1)
            for j in (-1,1):m.rod((side*.43,j*.1,1.35),(side*.58,j*.2,1.62),.09,'qshade',end=.002,sides=5)
            m.prism([(side*.3,1.12),(side*.52,.9),(side*(.56+.05*math.sin(phase)),.1),(side*.27,.40)],'qshade',.15,.08)
        for i in range(4):
            a=i*math.tau/4+phase*.13;x=math.cos(a);y=math.sin(a)*.4
            m.path([(x*.28,y*.28,.06),(x*.7,y*.7,.3),(x*1.1,y, .8+math.sin(phase+i)*.2)],.075,'qshade',end=.008)
            m.rod((x*.73,y*.7-.09,.34),(x*1.06,y-.05,.74),.018,'#a64dff',end=.002,part=False)
    elif kind in ('portal','legion','web','counter','roar','roots'):
        for j in range(2):
            r=.5+j*.27+f*.025
            for i in range(20):
                a=i*math.tau/20; b=a+.25;m.rod((math.cos(a)*r,math.sin(a)*r*.4,.06),(math.cos(b)*r,math.sin(b)*r*.4,.06),.035,'qglow',part=False)
        for i in range(6):
            a=i*math.tau/6+phase*.1;x=math.cos(a)*.6;y=math.sin(a)*.24
            m.path([(x,y,.08),(x*.75,y, .35+f*.03),(x*.9,y,.75+math.sin(phase+i)*.15)],.045,'qshade',end=.001)
    elif kind in ('crescent','slash'):
        radius=.74+f*.055
        points=[(radius*math.cos(a),1+radius*math.sin(a)) for a in [(-1.2+i*.24) for i in range(11)]]
        m.prism(points+[(x*.68,1+(z-1)*.68) for x,z in reversed(points)],'qglow',-.1)
        m.path([(x,-.15,z) for x,z in points],.018,'#5ce1e6',part=False)
    elif kind=='darkfire':
        for i in range(8):
            x=(i-3.5)*.16;m.path([(x,0,.1),(x-.1,.03,.5),(x+.08,0,1+math.sin(phase+i)*.25)],.15,'qshade',end=.003)
            m.path([(x,-.1,.16),(x-.04,-.12,.6)],.032,'qglow',end=.002)
    else:
        for i in range(6):
            a=phase+i*math.tau/6;r=.15+f*.07;m.ico((math.cos(a)*r,0,.35+math.sin(a)*r),(.07,.04,.13),'qglow',1)
    return m

def write(image,meta,name):
    image.save(ROOT/meta['image'],optimize=True)
    raw=json.dumps(meta,separators=(',',':'));(ROOT/'assets'/f'{name}.json').write_text(raw,encoding='utf-8');(ROOT/'assets'/f'{name}.js').write_text('globalThis.'+('DTQuanLeAtlas' if name.endswith('v08') else 'DTQuanLeVFX')+'='+raw+';\n',encoding='utf-8')

def run():
    atlas=Atlas('quanle-pixel-v08',1024);earmarks=[]
    for view in VIEWS:
        for action,n in ACTIONS.items():
            for f,c in enumerate(atlas.cells(view+'/'+action,64,64,n,10)):
                mesh,ear=sovereign(action,f,n,view);before=[Vector(v) for v in mesh.verts];atlas.add(c,mesh,'quanle');earmarks.append((mesh,before,ear,c,view,action,f))
    image,meta=atlas.bake(HERE,'DTQuanLeAtlas',detached_parts='Eyes, earring glints and raised hair inlays are independent 2D sprite details.');pen=ImageDraw.Draw(image)
    for mesh,before,ear,c,view,action,f in earmarks:
        scale=(Vector(mesh.verts[1])-Vector(mesh.verts[0])).length/(before[1]-before[0]).length;offset=Vector(mesh.verts[0])-before[0]*scale;v=ear*scale+offset
        ex=round(c['anchorX']+v.x/PITCH);ey=round(c['anchorY']-v.dot(UP)/PITCH)
        c['leftEarring']={'x':ex,'y':ey,'w':3,'h':5,'visible':view in ('S','E'),'physicalSide':'left'}
        if view in ('S','E'):
            x=c['x']+ex;y=c['y']+ey
            pen.rectangle((x-1,y-2,x+1,y+2),fill='#12091a');pen.line((x,y-1,x,y+1),fill='#ffffff');pen.point((x,y+2),fill='#b84dff');pen.point((x,y),fill='#00f0ff')
            if action in ('idle','run') and f%3==1:
                for dx,dy in [(-2,0),(2,0),(0,-3)]:pen.point((x+dx,y+dy),fill='#ffffff')
    meta['palette']=COLORS;meta['views']=list(VIEWS);meta['earringSide']='left';meta['version']='0.8.1';write(image,meta,'quanle-pixel-v08')
    heroimage,herometa=image,meta
    atlas=Atlas('quanle-vfx-pixel',2048)
    for kind in SPECIES:
        w,h=(96,96) if kind in ('bear','elephant','dragon') else (80,80) if kind in ('gorilla','eagle','stag','treant') else (64,64)
        for action in ('walk','attack'):
            for f,c in enumerate(atlas.cells('shadow_'+kind+'/'+action,w,h,6,10)):
                atlas.add(c,beast(kind,action,f,6),'shadow_'+kind)
    for variant,source in [('vine_hydra','cobra'),('thorn_stalker','treant')]:
        for action in ('walk','attack'):
            for f,c in enumerate(atlas.cells('shadow_'+variant+'/'+action,80,80,6,10)):
                mesh=beast(source,action,f,6)
                for side in (-1,1):mesh.path([(side*.2,.0,.8),(side*.5,0,1.4),(side*.65,-.1,1.9)],.10,'qshade',end=.02)
                atlas.add(c,mesh,'shadow_'+variant)
    for key,w,h in [('armor',80,80),('tendrils',128,96),('portal',96,64),('legion',160,112),('crescent',48,48),('slash',64,64),('soul',24,32),('counter',112,80),('web',96,64),('roar',96,64),('roots',96,80),('darkfire',112,96),('impact',40,40)]:
        for f,c in enumerate(atlas.cells('shadow_'+key,w,h,6,12)):atlas.add(c,effect(key,f,6),'shadow_'+key)
    image,meta=atlas.bake(HERE/'beasts','DTQuanLeVFX',detached_parts='Independent soul motes, neon eyes, feather inlays and summoned tendrils are emitted layers in a 2D flipbook; no rigid 3D export.');meta['catalog']=['shadow_'+k for k in SPECIES];meta['version']='0.8.1';write(image,meta,'quanle-vfx-pixel')
    # Native texels enlarged exactly 4x, labels outside sprites.
    keys=['S/idle','S/q_cast']+['shadow_'+k+'/walk' for k in SPECIES];out=Image.new('RGB',(6*128,4*140),'#1b182a');draw=ImageDraw.Draw(out)
    for i,key in enumerate(keys):
        src,md=(heroimage,herometa) if i<2 else (image,meta);c=md['clips'][key]['cells'][1];tile=src.crop((c['x'],c['y'],c['x']+c['w'],c['y']+c['h']));x=i%6*128+(128-c['w'])//2;y=i//6*140+115-c['h'];out.paste(tile,(x,y),tile)
        if i==1:
            a=meta['clips']['shadow_armor']['cells'][1];armor=image.crop((a['x'],a['y'],a['x']+a['w'],a['y']+a['h']));out.paste(armor,(i%6*128+(128-a['w'])//2,y+c['h']-a['h']),armor)
        draw.text((i%6*128+4,i//6*140+120),'Quan Le' if i==0 else 'Q - Hac Giap' if i==1 else key[7:-5],fill='#e9d3ff')
    out.resize((out.width*4,out.height*4),Image.Resampling.NEAREST).save(HERE/'quanle-22shadows-preview.png')
    preview(heroimage,herometa,['S/idle','E/idle','N/idle','W/idle','S/attack','S/e_cast','S/r_ult'],HERE/'quanle-actions-preview.png',4)

if __name__=='__main__':run()
