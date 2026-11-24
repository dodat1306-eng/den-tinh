"""Bake Huyền Kha's posed meshes and pixel effects with Blender in background mode."""
import math
import random
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pixel_pipeline import INK, NEAR, PALETTES, ROOT, UP, Mesh, audit_meshes, material

PALETTES.update({
    'hk_skin': ['#542f30', '#a66d4b', '#d99f76', '#ffe0ac'],
    'hk_hair': ['#141012', '#251a22', '#3f2e35', '#6b4a49'],
    'hk_bronze': ['#372328', '#755039', '#ae793f', '#ecc17c'],
    'hk_ivory': ['#61534e', '#9e8772', '#e6d6c3', '#fff0d2'],
    'hk_ash': ['#362f3a', '#62565c', '#9e8772', '#c8b8aa'],
    'hk_leather': ['#251c25', '#4a392c', '#6c5242', '#ab8565'],
    'hk_blade': ['#914a26', '#d98a1c', '#ffd24c', '#fff7cc'],
})

PITCH = .031
MOVES = {'idle': 4, 'run': 8, 'dash': 4, 'hit': 3, 'attack1': 10, 'attack2': 10,
         'attack3': 10, 'q': 22, 'recall': 18, 'e': 12, 'counter': 9}
ULT_FRAMES, STRIKE_FRAME, ULT_COLUMNS = 300, 150, 12
CHARGE_FRAMES, CHARGE_COLUMNS = 150, 10
ULT_CELL = (204, 156, 79, 127)
MOVE_CELL = (178, 161, 72, 139)
CHARGE_CELL = (148, 128, 74, 107)
WHITE, GOLD, AMBER, BLUE, PURPLE = '#fff7cc', '#ffd24c', '#e99036', '#62bbff', '#c69df7'
DARK_BLUE = '#354786'


def ramp(value, start, end):
    t = max(0, min(1, (value - start) / (end - start)))
    return t * t * (3 - 2 * t)


def pose(action, t):
    if action == 'r':
        reach = ramp(t, 1, 7) * (1 - ramp(t, 167, 183))
        angle = 137 * ramp(t, 64, 73) + 12 * ramp(t, 87, 90)
        angle -= 48 * ramp(t, 90, 91) + 101 * ramp(t, 91, 96)
        angle -= 15 * ramp(t, 141, 160)
        length = ramp(t, 38, 41) * (1 - ramp(t, 163, 170))
        hold = ramp(t, 62, 73) * (1 - ramp(t, 144, 166))
        crouch = .15 * hold + .13 * ramp(t, 91, 95) * (1 - ramp(t, 136, 160))
        gust = ramp(t, 7, 29) * (1 - ramp(t, 128, 180))
        return reach, angle, length, hold, crouch, gust, 0, 160 < t < 170
    burst = math.sin(t * math.pi)
    if action == 'q':
        raise_blade = ramp(t, 0, .27)
        throw = ramp(t, .27, .48)
        recover = ramp(t, .55, 1)
        return .32+.67*throw*(1-recover), 109*raise_blade-126*throw, raise_blade*(1-throw), .4*raise_blade*(1-throw), .14*burst, burst, 0, False
    if action == 'recall':
        catch = ramp(t, .68, .87)
        return .97*burst, 28*catch, .8*catch*(1-ramp(t,.87,1)), 0, .08*catch, .58*burst, 0, False
    if action.startswith('attack') or action == 'counter':
        high = {'attack1': 56, 'attack2': 134, 'attack3': 150, 'counter': 100}[action]
        angle = high * ramp(t, 0, .29) - (high + 18) * ramp(t, .29, .56)
        return .62+.37*burst, angle, min(1, burst*3), .82, .15*burst, burst, 0, False
    if action == 'e':
        return 0, 0, 0, 0, .11*burst, .4*burst, 0, False
    if action == 'echarge':
        charge = ramp(t,.02,.22)*(1-ramp(t,.80,1))
        tremor = charge*(.025*math.sin(t*48)+.013*math.sin(t*83))
        return charge, 0, 0, 0, .19*charge+tremor, .83*charge, 0, False
    return 0, 0, 0, 0, .15*burst if action in ('dash', 'hit') else 0, .9 if action == 'dash' else .15, math.sin(t*math.tau) if action == 'run' else 0, False


def blade(m, at, forward, angle, length, wire):
    axis = forward*math.cos(angle) + Vector((0, 0, math.sin(angle)))
    up = Vector((0, 0, math.cos(angle))) - forward*math.sin(angle)
    near = Vector((forward.y, -forward.x, 0))
    def point(u, v=0, depth=0):
        return at + axis*u + up*v + near*depth
    def plate(points, color, depth, thickness):
        start = len(m.verts)
        m.prism(points, color, depth, thickness)
        m.verts[start:] = [tuple(point(u, v, w)) for u, w, v in m.verts[start:]]
    m.rod(point(-.39), point(.25), .067, 'hk_leather', sides=10)
    for x in (-.37, -.26, -.15, .04):
        m.rod(point(x), point(x+.045), .086, 'hk_bronze', sides=8)
    m.ico(point(-.405), (.105, .09, .105), 'hk_bronze', 2)
    plate([(.11,-.31),(.29,-.31),(.35,-.16),(.35,.16),(.29,.31),(.11,.31)], 'hk_blade', -.10, .20)
    tip = .29 + 2.10*length
    if tip < .42:
        return point(tip)
    edge = [(0,-.16),(.10,-.24),(.31,-.24),(.34,-.18),(.39,-.24),(.72,-.24),(.76,-.18),
            (.81,-.23),(.90,-.22),(1,.055),(.96,.145),(.22,.21),(.11,.25),(0,.16)]
    edge = [(.29+(tip-.29)*x, y) for x, y in edge]
    if wire:
        m.path([point(x,y,.10) for x,y in edge+[edge[0]]], .012, WHITE)
    else:
        plate(edge, 'hk_blade', -.05, .10)
        plate([(.34,-.12),(tip-.14,-.13),(tip-.10,.03),(.48,.15),(.34,.105)], '#ac692f', .052, .014)
        m.path([point(x,y,.055) for x,y in edge[8:]+edge[:2]], .018, WHITE)
        m.path([point(.34,-.12,.086),point(tip-.14,-.13,.086)], .011, GOLD)
    for i in range(6):
        x = .49 + i*.25
        if x+.09 >= tip:
            break
        sign = 1 if i%2 else -1
        m.path([point(x-.06,-.055,.078),point(x,.08*sign,.078),point(x+.064,-.055,.078)], .016, GOLD if wire else '#513221')
        m.rod(point(x-.04,.023,.078),point(x+.04,.023,.078),.013,WHITE if wire else '#754926',sides=5)
    return point(tip)


def warrior(action, t, back=False):
    m = Mesh()
    if action == 'blade':
        hilt = Vector((0, 0, .56))
        tip = blade(m,hilt,Vector((1,0,0)),0,1,False)
        return m,hilt,tip
    reach, angle, length, hold, crouch, gust, stride, wire = pose(action, t)
    charging = action == 'echarge'
    phase = t/9 if action == 'r' else t*math.tau
    bob = math.cos(phase)*.025 if action in ('idle', 'run', 'r') else 0
    turn = Matrix.Rotation(math.radians(123 if back else 54), 3, 'Z')
    forward = turn @ Vector((0, -1, 0))
    across = turn @ Vector((1, 0, 0))
    lean = .20 if action == 'dash' else -.08 if action == 'hit' else .07*reach

    def p(x, y, z):
        return turn @ Vector((x, y - max(0,z-.9)*lean, z + max(0,min(1,(z-.45)/.65))*(bob-crouch)))

    m.ico(p(0, .02, 1.03), (.31,.23,.29), 'hk_leather', 2)
    m.ico(p(0, 0, 1.43), (.30,.195,.36), 'hk_skin', 3)
    m.ico(p(-.14,-.11,1.56),(.22,.118,.19),'hk_skin',2)
    m.ico(p(.155,-.095,1.57),(.219,.124,.162),'hk_skin',2)
    m.rod(p(-.018,0,1.65),p(.033,-.02,1.91),.121,'hk_skin',sides=10)
    m.rod(p(0,0,1.022),p(0,0,1.128),.31,'hk_leather',sides=14)
    for h in (1.006,1.112):
        m.rod(p(0,0,h),p(0,0,h+.032),.328,'hk_bronze',sides=14)
    m.ico(p(.042,-.321,1.083),(.108,.042,.084),'hk_bronze',2)
    m.ico(p(.051,-.353,1.081),(.049,.018,.045),'#633321',1)
    m.rod(p(-.21,-.16,1.71),p(.239,-.21,1.24),.078,'hk_leather',end=.086,sides=6)
    for i in range(5):
        z=1.68-i*.085
        x=-.19+i*.081
        m.ico(p(x,-.235,z),(.125,.05,.073),'hk_bronze',1)
        m.ico(p(x-.007,-.267,z+.018),(.021,.016,.022),GOLD,1)
    m.ico(p(-.278,-.015,1.70),(.212,.152,.122),'hk_bronze',2)
    for side in (-1, 1):
        step = side*stride*.32
        hip, knee = p(side*.21,.033,.99), p(side*.30,-side*.21-step*.58,.63+max(0,step)*.15)
        boot, sole = p(side*.36,-side*.24-step,.21+max(0,step)*.23),p(side*.36,-side*.24-step,.08+max(0,step)*.23)
        m.rod(hip,knee,.164,'hk_leather',end=.128,sides=10)
        m.rod(knee,boot,.121,'hk_leather',end=.102,sides=10)
        m.ico((boot+sole)*.5+forward*.104,(.155,.149,.106),'hk_leather',2)
        for i in range(4):
            a = boot.lerp(knee,.14+i*.18)
            b = boot.lerp(knee,.21+i*.18)+forward*(.020 if i%2 else -.018)
            m.rod(a,b,.12+i*.003,'hk_ivory' if i%2 else 'hk_ash',sides=8)
    for i in range(13):
        a = i*math.tau/13+.11
        x,y = .29*math.cos(a),.27*math.sin(a)
        wiggle = math.sin(phase+i*1.74)*.045
        tail = .26+(i*7%6)*.063
        a0=p(x,y,1.045)
        a1=p(x*1.53,y*1.4+.12*gust,.78)
        a2=p(x*1.89+wiggle,y*1.88+.29*gust,tail+gust*.16)
        seam=turn @ Vector((-.084*math.sin(a),.084*math.cos(a),0))
        verts=[a0-seam*.76,a0+seam*.76,a1+seam,a2+seam*.72,a2+seam*.19+Vector((0,0,.095)),a2-seam*.48,a1-seam]
        color=('hk_ivory','hk_ash','hk_ivory','hk_leather')[i%4]
        start=len(m.verts)
        depth=-seam.cross(a2-a0).normalized()*.026 if charging else Vector((0,0,.019))
        m.verts.extend(tuple(v+depth*d) for d in (0,1) for v in verts)
        faces=[(0,1,2),(0,2,6),(2,3,4),(2,4,6),(4,5,6)]
        faces += [tuple(j+7 for j in reversed(f)) for f in faces.copy()]
        faces += [(j,(j+1)%7,(j+1)%7+7,j+7) for j in range(7)]
        m.faces.extend(tuple(start+j for j in f) for f in faces)
        crease='hk_ivory' if color=='hk_ash' else 'hk_ash' if color=='hk_ivory' else color
        m.colors.extend([color,color,color,crease,color]*2+[color]*7)
        m.parts.extend([0]*len(faces))

    m.ico(p(.017,-.006,2.01),(.223,.209,.264),'hk_skin',3)
    m.ico(p(.024,-.102,1.901),(.166,.123,.164),'hk_skin',2)
    m.ico(p(.036,-.211,1.99),(.056,.079,.071),'hk_skin',2)
    m.ico(p(-.17,.035,2.01),(.085,.072,.096),'hk_skin',2)
    m.ico(p(-.012,.054,2.199),(.272,.249,.213),'hk_hair',3)
    m.ico(p(-.026,.173,1.993),(.246,.125,.283),'hk_hair',2)
    for i in range(5 if charging else 12):
        x=(i-2)*.108 if charging else (i%5-2)*.081
        top=p(x-.025,.047+(i%4)*.042,2.23+(i%3)*.029)
        layer=i%3
        fan=reach*(.13+.075*math.sin(i*2.1)) if charging else 0
        spread=x*reach if charging else 0
        mid=p(x-.03+math.sin(phase+i)*.009+.22*spread,.219+layer*.076+fan*.52,1.80+i%4*.05)
        tip=p(x-.15+math.sin(phase+i)*.05+.58*spread,.31+layer*.073+gust*(.42+layer*.09)+fan,1.18+i%5*.12+gust*.18)
        joint=.061+.005*(i%2) if charging else .113
        sides=5+i%4 if charging else 7
        m.rod(top,mid,.056+layer*.008 if charging else .071+layer*.022,'hk_hair',end=joint,sides=sides)
        m.rod(mid,tip,joint if charging else .11-layer*.017,'hk_hair',end=.006,sides=sides)
    for i in range(7):
        x=(i-3)*.066
        m.rod(p(x,.005,2.224+i%3*.052),p(x-.065,-.184-(i%3)*.023,2.09+(i%4)*.042),.071,'hk_hair',end=.010,sides=7)
    m.path([p(-.224,.047,2.10),p(-.176,-.147,2.125),p(-.064,-.205,2.139),p(.079,-.208,2.137),p(.201,-.111,2.124)],.018,'hk_bronze')
    m.ico(p(-.063,-.212,2.139),(.031,.022,.027),'hk_blade',1)
    for side in (-1,1):
        x=.071*side+.021
        m.rod(p(x-.041,-.202,2.057),p(x+.036,-.205,2.077),.016,'hk_hair',sides=5)
        m.rod(p(x-.027,-.214,2.045),p(x+.030,-.211,2.050),.012,'#fff2d9',sides=5)
        m.ico(p(x+.017,-.223,2.05),(.018,.011,.018),'#301f21',1)
    m.rod(p(-.019,-.212,1.912),p(.067,-.216,1.922),.012,'#774538',sides=5)

    grip = p(-.11,-.25-.56*reach,1.55+hold*(.34+.23*math.sin(math.radians(max(0,angle)))))
    grip += forward*.12*reach
    if action == 'e':
        grip=p(.15,-.325,1.24+.32*math.sin(t*math.pi))
    blade_angle=math.radians(angle)+math.atan2(-UP.y*forward.y,UP.z)
    axis=forward*math.cos(blade_angle)+Vector((0,0,math.sin(blade_angle)))
    right = grip - axis*.223 + across*.038
    rest_left = p(-.35,-.21+stride*.19,1.08)
    rest_right = p(.38,-.11-stride*.19,1.04)
    hands=((-1,rest_left.lerp(grip,reach if action!='e' else .85)),(1,rest_right.lerp(right,hold if action!='e' else .8)))
    if action=='echarge':
        hands=tuple((side,p(side*(.36+.15*reach),-.18-.13*reach,1.07+.26*reach)) for side in (-1,1))
    for side, hand in hands:
        shoulder = p(side*.311,-.009,1.61)
        elbow = shoulder.lerp(hand,.54)-Vector((0,0,.126))+across*side*.13
        m.ico(shoulder,(.159,.182,.173),'hk_skin',2)
        m.rod(shoulder,elbow,.145,'hk_skin',end=.094,sides=10)
        m.ico(elbow,(.128,.122,.117),'hk_skin',2)
        m.rod(elbow,hand,.096,'hk_skin',end=.073,sides=10)
        m.rod(elbow.lerp(hand,.51),elbow.lerp(hand,.90),.108,'hk_leather',end=.086,sides=10)
        for u in (.53,.79,.90):
            m.rod(elbow.lerp(hand,u),elbow.lerp(hand,u+.04),.112-(u-.53)*.05,'hk_bronze',sides=10)
        m.ico(hand,(.118,.086,.078),'hk_skin',2)
        if side == -1 and action == 'r' and 5 < t < 40:
            for i in range(4):
                a=hand+Vector((0,0,(i-1.5)*.031))
                m.rod(a,a+forward*(.104+(i%3)*.02),.014,'hk_skin',end=.010,sides=6)
    tip = blade(m,grip,forward,blade_angle,length,wire) if length > .02 else grip+forward*.16
    return m, grip, tip


def effects(tile, frame, grip, tip):
    d=ImageDraw.Draw(tile)
    x,y=grip
    rng=random.Random(4855)
    colors=(GOLD,BLUE,WHITE,AMBER,PURPLE,'#f4a5cd')
    if 7<=frame<=40:
        power=ramp(frame,7,22)
        for i in range(54):
            a=i*.746+frame*.13
            decay=(1-(frame*.063+rng.random())%1)**1.6
            r=decay*(37+rng.random()*16)*(1-.74*ramp(frame,33,40))
            u,v=x+math.cos(a)*r,y+math.sin(a)*r*.76
            if i/54<power:
                d.line((u,v,u-math.cos(a)*(4+8*decay),v-math.sin(a)*(4+8*decay)),colors[i%6],1+(i%11==0))
        r=(2+8*power)*(1-.6*ramp(frame,37,40))
        d.polygon([(x-r*1.4,y),(x,y-r),(x+r*1.4,y),(x,y+r)],PURPLE)
        d.ellipse((x-r*.8,y-r*.67,x+r*.8,y+r*.67),BLUE)
        d.ellipse((x-r*.47,y-r*.45,x+r*.48,y+r*.41),WHITE)
    if 40<=frame<=53:
        s=20*(1-ramp(frame,43,54))
        d.polygon([(x-s,y),(x-2,y-2),(x,y-s),(x+2,y-2),(x+s,y),(x+2,y+2),(x,y+s),(x-2,y+2)],WHITE)
    if 52<=frame<=96:
        charge=ramp(frame,52,68)*(1-ramp(frame,91,96))
        for i in range(16):
            a=i*math.tau/16-frame*.047
            radius=34+charge*(8+i%3*3)
            u=79+math.cos(a)*radius
            v=118+math.sin(a)*radius*.27
            if i/16<charge:
                color=(GOLD,BLUE,WHITE)[i%3]
                d.line([(u-3,v+1),(u,v-3),(u+3,v),(u,v+2)],color)
                d.point((u,v-6),color)
    if 49<=frame<=160:
        burn=ramp(frame,49,56)*(1-ramp(frame,141,160))
        for i in range(31):
            t=(i+.4)/31
            u=x+(tip[0]-x)*t
            v=y+(tip[1]-y)*t
            wave=math.sin(i*.89-frame*.28)
            h=(4+9*max(0,wave))*burn
            if h>1.5:
                sign=1 if i%3==0 else -1
                d.polygon([(u-3,v+sign*4),(u-2,v+sign*h),(u+3,v+sign*h*1.4),(u+1,v+sign*3)],GOLD if i%3 else AMBER)
                d.line((u-1,v+sign*3,u+1,v+sign*h),WHITE)
    if 92<=frame<=140:
        size=.62+.38*ramp(frame,92,101)
        fade=1-ramp(frame,128,141)
        center=(75+5*ramp(frame,94,110),78)
        for layer,(color,width,shift) in enumerate(((DARK_BLUE,25,-.10),(BLUE,21,0),(AMBER,16,.10),(GOLD,12,.18),(WHITE,5,.21))):
            outer,inner=[],[]
            for i in range(54):
                t=i/53
                a=-1.47+t*2.82+shift
                wave=math.sin(i*.73-frame*.31+layer*.34)*3+math.sin(i*1.72+frame*.19)*2
                r=(86+wave-layer*2.3)*size
                band=math.sin(t*math.pi)**1.45*(width+wave*.75)*fade
                outer.append((center[0]+math.cos(a)*r,center[1]+math.sin(a)*r*.64))
                inner.append((center[0]+math.cos(a)*(r-band),center[1]+math.sin(a)*(r-band)*.64))
            if fade>.14:
                d.polygon(outer+inner[::-1],color)
        for i in range(76):
            a=-1.54+rng.random()*3.12
            r=(66+rng.random()*36)*size+(frame-92)*.51*(i%5/4)
            u=center[0]+math.cos(a)*r
            v=center[1]+math.sin(a)*r*.64
            if rng.random()<fade*.68:
                d.line((u,v,u-1-i%4,v+1+i%3),colors[i%6],1+(i%8==0))
    if 161<=frame<=183:
        progress=ramp(frame,161,184)
        for i in range(62):
            t=rng.random()
            spread=(frame-160)*.62
            u=108+t*55+rng.uniform(-spread,spread)+progress*18
            v=73+t*18+rng.uniform(-spread,spread)
            if rng.random()<1-progress:
                d.rectangle((u,v,u+(i%4==0),v+(i%7==0)),colors[i%6])


def charge_effects(tile, t):
    _,_,x,y=CHARGE_CELL
    power=max(.03,ramp(t,0,.18)*(1-ramp(t,.85,1)))
    pulse=max(math.exp(-((t-p)/.046)**2) for p in (.256,.516,.776))
    aura=Image.new('RGBA',tile.size)
    d=ImageDraw.Draw(aura)
    for side in (-1,1):
        for i in range(6):
            k=i/5
            root=x+side*(17+25*k)
            width=4+power*(5+k*4)
            rise=(22+49*power)*(1-.40*k)
            lean=side*(4+6*math.sin(t*61+i*.88))
            points=[(root-width,y),(root-width*.88,y-rise*.45),(root+lean,y-rise),
                    (root+width*.58,y-rise*.42),(root+width,y)]
            d.polygon(points, '#123461a6' if i%2 else '#3b2863a1')
            d.line(points[1:4], '#7d68fa91' if i%2 else '#5698f1a6',2)
    aura.alpha_composite(tile)
    tile.paste(aura)
    d=ImageDraw.Draw(tile)
    radius=24+18*power+13*pulse
    for i in range(3):
        a0=t*38+i*math.tau/3
        arc=[]
        for j in range(18):
            a=a0+j*.13
            r=radius+math.sin(j*2.9+i+t*17)*(3+4*pulse)
            arc.append((x+r*math.cos(a),y-1+r*.23*math.sin(a)))
        d.line(arc, '#222862',5)
        d.line(arc, ('#68d8ff','#ffbf64','#b295ff')[i],3)
        d.line(arc[2:15], '#fff5cc',1)

    for side in (-1,1):
        for j in range(2):
            wave=.5+.5*math.sin(t*27+j*2.7+side*1.9)
            height=21+power*(41+25*wave)+6*pulse
            arc=[]
            for k in range(9):
                h=k/8
                noise=math.sin(k*3.7+j*1.9+side+t*95)*(3+4*power)
                u=x+side*(23+15*j+5*math.sin(t*38+j+side)+9*math.sin(h*3.8)+noise)
                v=y-4-h*height+3*math.sin(k*4.6+j+side)
                arc.append((u,v))
            d.line(arc, DARK_BLUE,4)
            d.line(arc, '#69d8ff' if j else '#c7a6ff',2)
            d.line(arc[1:8], '#fff7df',1)
            u,v=arc[3+j]
            d.line([(u,v),(u+side*9,v-4),(u+side*6,v-13),(u+side*11,v-17)], '#95d9ff',1)

    rng=random.Random(724)
    colors=('#fff7d9','#8cf7ff','#d5a8ff','#ffba61')
    for i in range(35):
        start,spread,phase=rng.random(),rng.random(),rng.random()
        h=(t*(1.2+spread)+phase)%1
        if start>power*.8+.18:
            continue
        u=x+(1 if i%2 else -1)*(18+27*spread+7*h)+math.sin(t*42+i)*5
        v=y-5-h*power*(53+29*phase)
        color=colors[i%4]
        d.line([(u,v),(u+math.sin(i+t*30)*4,v-2-h*7)], color,1+(i%7==0))


def bake(name, cell, columns, frames):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene
    w,h,ax,ay=cell
    width,height=w*columns,h*math.ceil(len(frames)/columns)
    material_bank={}
    objects=[]
    triangles=0
    points=[]
    for i,(action,t,back) in enumerate(frames):
        m,grip,tip=warrior(action,t,back)
        x,y=i%columns*w,i//columns*h
        projected=[(ax+v[0]/PITCH,ay-UP.dot(Vector(v))/PITCH) for v in m.verts]
        assert all(1<=u<w-1 and 1<=v<h-1 for u,v in projected),(name,action,t,min(projected),max(projected))
        mesh=bpy.data.meshes.new(f'{action}_{i:03}')
        mesh.from_pydata(m.verts,[],m.faces)
        bm=bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(mesh)
        bm.free()
        slots={}
        for color in dict.fromkeys(m.colors):
            if color not in material_bank:
                material_bank[color]=material(color)
            slots[color]=len(mesh.materials)
            mesh.materials.append(material_bank[color])
        mesh.polygons.foreach_set('material_index',[slots[c] for c in m.colors])
        mesh.calc_loop_triangles()
        triangles+=len(mesh.loop_triangles)
        ob=bpy.data.objects.new(mesh.name,mesh)
        scene.collection.objects.link(ob)
        ob.location=Vector(((x+ax)*PITCH,0,0))+UP*((height-y-ay)*PITCH)
        objects.append(ob.name)
        points.append(tuple((ax+p.x/PITCH,ay-UP.dot(p)/PITCH) for p in (grip,tip)))
    center=Vector((width*PITCH/2,0,0))+UP*(height*PITCH/2)
    camera=bpy.data.cameras.new('Sprite Camera')
    camera.type='ORTHO'
    camera.sensor_fit='HORIZONTAL'
    camera.ortho_scale=width*PITCH
    cam=bpy.data.objects.new(camera.name,camera)
    scene.collection.objects.link(cam)
    cam.location=center+NEAR*130
    cam.rotation_euler=(-NEAR).to_track_quat('-Z','Y').to_euler()
    scene.camera=cam
    scene.render.engine='CYCLES'
    scene.cycles.samples=1
    scene.cycles.use_denoising=False
    scene.render.film_transparent=True
    scene.render.resolution_x=width
    scene.render.resolution_y=height
    scene.render.resolution_percentage=100
    scene.render.image_settings.color_mode='RGBA'
    scene.view_settings.view_transform='Standard'
    scene.render.dither_intensity=0
    cache=ROOT/'runtime'/'huyenkha'
    cache.mkdir(parents=True,exist_ok=True)
    scene.render.filepath=str(cache/(name+'-raw.png'))
    bpy.ops.render.render(write_still=True)
    raw=Image.open(scene.render.filepath).convert('RGBA')
    image=Image.new('RGBA',raw.size)
    for i,(action,t,_) in enumerate(frames):
        x,y=i%columns*w,i//columns*h
        tile=raw.crop((x,y,x+w,y+h))
        alpha=tile.getchannel('A').point(lambda a:255 if a>=128 else 0)
        tile.putalpha(alpha)
        ink=Image.new('RGBA',tile.size,INK)
        ink.putalpha(alpha.filter(ImageFilter.MaxFilter(3)))
        ink.alpha_composite(tile)
        if action=='r':
            effects(ink,t,*points[i])
        elif action=='echarge':
            charge_effects(ink,t)
        box=ink.getbbox()
        assert box and box[0]>0 and box[1]>0 and box[2]<w and box[3]<h,(name,i,box)
        image.paste(ink,(x,y))
    samples=([0,19,41,75,106,135,149] if name.endswith('-e') else
             [0,38,77,125,153,187,269,299] if name.endswith('-r') else [0,8,23,34,56,64,80,98,112,167,220])
    errors=[]
    for i in samples:
        ob=bpy.data.objects[objects[i]]
        # Audit each pose at its own origin at the tolerance used by the bake.
        ob.location=(0,0,0)
        bpy.context.view_layer.update()
        audit=audit_meshes([ob.name],'Layered wraps, hair tips, embossed runes and sparks are independent mesh parts.')
        errors.extend(audit['errors'])
    print('SPRITE AUDIT',name,width,height,len(frames),triangles,len(material_bank),errors[:15],flush=True)
    assert not errors,errors
    image.save(cache/(name+'.png'),optimize=True)
    return image


def ultimate_pose(frame):
    if frame <= STRIKE_FRAME:
        return 1+91*(frame-1)/(STRIKE_FRAME-1)
    return 92+92*(frame-STRIKE_FRAME)/(ULT_FRAMES-STRIKE_FRAME)


def bake_charge():
    timeline=[('echarge',i/(CHARGE_FRAMES-1),False) for i in range(CHARGE_FRAMES)]
    charge=bake('huyenkha-e',CHARGE_CELL,CHARGE_COLUMNS,timeline)
    w,h,_,_=CHARGE_CELL
    review=Image.new('RGB',(w*6,h),'#182329')
    for col,i in enumerate((0,21,43,77,115,148)):
        x,y=i%CHARGE_COLUMNS*w,i//CHARGE_COLUMNS*h
        tile=charge.crop((x,y,x+w,y+h))
        review.paste(tile,(col*w,0),tile)
    review.save(ROOT/'runtime'/'huyenkha'/'charge-review.png')


def main():
    timeline=[('r',ultimate_pose(i),False) for i in range(1,ULT_FRAMES+1)]
    ultimate=bake('huyenkha-r',ULT_CELL,ULT_COLUMNS,timeline)
    moves=[(a,i/(n if a in ('idle','run') else n-1),back)
           for back in (False,True) for a,n in MOVES.items() for i in range(n)]
    moves.append(('blade',0,False))
    walk=bake('huyenkha-moves',MOVE_CELL,10,moves)
    sample=Image.new('RGB',(1080,473),'#182329')
    for i,f in enumerate((1,35,67,98,123,154,176,230,268,300)):
        x,y=(f-1)%ULT_COLUMNS*204,(f-1)//ULT_COLUMNS*156
        im=ultimate.crop((x,y,x+204,y+156))
        sample.paste(im,(i%5*204,i//5*156),im)
    for i,f in enumerate((0,22,54,60,79,220)):
        w,h,_,_=MOVE_CELL
        x,y=f%10*w,f//10*h
        im=walk.crop((x,y,x+w,y+h))
        sample.paste(im,(i*180,312),im)
    sample.save(ROOT/'runtime'/'huyenkha'/'review.png')
    bake_charge()


if __name__=='__main__':
    if '--charge-only' in sys.argv:
        bake_charge()
    else:
        main()
