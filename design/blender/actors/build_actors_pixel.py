"""Articulated chibi monsters, seven guardians, villagers and faceted elemental summons."""
import json, math, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from pixel_pipeline import Atlas, Mesh, ROOT, preview, PITCH
from PIL import Image

HERE=Path(__file__).resolve().parent
MONSTERS=('slime','wisp','boar','archer','shade')
BOSSES=('boss','boss_haba','boss_hotinh','boss_thantrung','boss_cuukhucxa','boss_thietdieu','boss_kedetsuong')

def eyes(m,center,span=.18,color='cyan',size=.055):
    x,y,z=center
    for side in (-1,1):
        m.ico((x+span*side,y,z),(size*1.3,.035,size),'night',1,False)
        m.ico((x+span*side,y-.035,z+.01),(size*.65,.02,size*.6),color,1,False)

def humanoid(m,phase,action,cloth='leaf',skin='skin',scale=1,mask=False):
    moving=action in ('walk','move','run');strike=action in ('attack','attack_slam','cast_rage');walk=math.sin(phase) if moving else 0
    bob=abs(walk)*.06 if moving else math.sin(phase)*.025
    recoil=-.08*(1+math.cos(phase)) if action=='hit' else 0
    def p(x,y,z):return(x*scale,y*scale,(z+bob+recoil)*scale)
    for side in (-1,1):
        hip=p(side*.16,.02,.65);knee=p(side*.2,-walk*side*.12,.38+max(0,walk*side)*.09);foot=p(side*.2,-walk*side*.2,.09)
        m.rod(hip,knee,.12*scale,cloth);m.rod(knee,foot,.09*scale,'night')
        m.ico(p(side*.2,-.07-walk*side*.2,.08),(.15*scale,.22*scale,.09*scale),'night',1)
    m.ico(p(0,.02,.9),(.34*scale,.25*scale,.43*scale),cloth,2)
    m.rod(p(0,0,.7),p(0,0,.76),.35*scale,'gold',sides=8)
    for side in (-1,1):
        shoulder=p(side*.34,0,1.13)
        swing=math.sin(phase*1.2)*.24 if strike else -walk*side*.17
        elbow=p(side*.45,-.07+swing,.93+(math.cos(phase)*.18 if strike else 0))
        hand=p(side*(.48+(.12 if strike else 0)),-.17+swing,.77+(.52*max(0,math.sin(phase)) if strike else 0))
        m.ico(shoulder,(.22*scale,.24*scale,.18*scale),cloth,1)
        m.rod(shoulder,elbow,.095*scale,cloth);m.rod(elbow,hand,.075*scale,cloth)
        m.ico(hand,(.1*scale,.09*scale,.11*scale),skin,1)
    m.ico(p(0,0,1.48),(.34*scale,.26*scale,.32*scale),skin,2)
    m.ico(p(0,.08,1.69),(.35*scale,.26*scale,.14*scale),'night' if mask else 'wood',1)
    if mask:m.ico(p(0,-.22,1.37),(.28*scale,.07*scale,.14*scale),'night',1)
    eyes(m,p(0,-.254,1.51),.13*scale,'cyan' if mask else 'night',.036*scale)
    return p

def actor(kind,action,frame,count):
    m=Mesh();phase=frame/count*math.tau;moving=action in ('walk','move','run');strike=action in ('attack','attack_slam','cast_rage');pulse=math.sin(phase)
    if kind=='slime':
        squash=.13*pulse if moving else .035*pulse;z=.42+(max(0,pulse)*.22 if moving else 0)
        m.ico((0,0,z),(.65+squash,.44,.43-squash),'jade',2)
        for i in (-1,0,1):m.ico((i*.37,-.1,.11),(.24,.29,.13),'jade',1)
        m.ico((0,-.35,z-.03),(.17,.06,.18),'gold',2)
        eyes(m,(0,-.4,z+.13),.22,'night',.05)
        m.ico((-.16,-.19,z+.34),(.23,.04,.08),'#dcfff0',1,False)
        m.rod((0,0,z+.4),(.09,0,z+.67),.025,'leaf',part=False)
        m.ico((.06,0,z+.62),(.24,.13,.06),'leaf',1)
        if strike:
            m.ico((0,-.44,z-.08),(.15,.025,.09+.07*abs(pulse)),'night',1,False)
            m.rod((.2,-.46,z-.06),(.36+abs(pulse)*.25,-.5,z+.01),.09,'jade',end=.003,sides=5)
        if action=='hit':
            for i,v in enumerate(m.verts):m.verts[i]=(v[0]+v[2]*.13*math.cos(phase),v[1],v[2]*.85)
    elif kind=='boar':
        gait=math.sin(phase) if moving else pulse*.1;lean=.15*max(0,pulse) if strike else 0
        for side in (-1,1):
            for back in (-1,1):
                x=side*.43;y=back*.23;step=gait*side*back*.17
                m.rod((x,y,.55),(x+step,y,.12),.14,'earth');m.ico((x+step,y-.06,.09),(.17,.19,.1),'night',1)
        m.ico((0,.13,.68),(.66,.43,.45),'earth',2)
        for i in range(6):
            x=(i-2.5)*.17;m.rod((x,.1,.95),(x-.06,.16,1.35),.09,'wood',end=.007,sides=5)
        m.ico((0,-.18,1.02-lean),(.49,.35,.4),'cream',2);m.ico((0,-.49,.86-lean),(.31,.13,.21),'earth',1)
        for side in (-1,1):
            m.path([(side*.27,-.46,.8-lean),(side*.42,-.5,1.01-lean),(side*.38,-.49,1.17-lean)],.06,'cream',end=.01)
            m.ico((side*.38,-.02,1.3),(.14,.1,.2),'earth',1)
            for i in range(3):m.rod((side*(.42+i*.06),.12,.78),(side*(.42+i*.06),.12,1.18),.07,'leaf',sides=7)
        m.ico((0,.27,1.07),(.4,.3,.1),'stone',1)
        eyes(m,(0,-.46,1.1-lean),.23,'red',.05)
    elif kind=='wisp':
        z=.15+pulse*.07
        m.ico((0,.1,.8+z),(.4,.27,.64),'purple',2)
        for i in range(7):
            a=i*math.tau/7;m.path([(math.cos(a)*.24,.1,.8),(math.cos(a)*.35+.06*pulse,.1,.4),(math.cos(a)*.28+math.sin(phase+i)*.1,.12,.14)],.065,'purple',end=.005)
        m.ico((0,-.09,1.39+z),(.32,.22,.31),'purple',2);m.ico((0,-.28,1.36+z),(.24,.04,.18),'night',1)
        eyes(m,(0,-.323,1.4+z),.12,'cyan',.05)
        hand=.4+math.sin(phase)*.07
        for side in (-1,1):m.path([(side*.32,0,1.1+z),(side*.43,-.1,.8+z),(side*.23,-.31,.77+z)],.045,'cream')
        m.rod((0,-.4,.71+z),(0,-.4,.86+z),.022,'gold',part=False)
        m.ico((0,-.4,.56+z),(.2,.14,.21),'gold',2)
        for side in (-1,1):m.rod((side*.14,-.48,.4+z),(side*.14,-.48,.71+z),.015,'wood',part=False)
    elif kind in ('archer','shade','elder','smith'):
        p=humanoid(m,phase,action,'leaf' if kind=='archer' else 'night' if kind=='shade' else 'wood' if kind=='elder' else 'earth',mask=kind in ('archer','shade'))
        if kind=='archer':
            for i in range(4):m.rod(p(0,0,1.76+i*.03),p(0,0,1.79+i*.03),.49-i*.12,'cream',sides=10)
            for i in range(3):m.rod(p(.23+i*.055,.17,.74),p(.29+i*.055,.18,1.6),.025,'wood',sides=5)
            pull=.16+max(0,pulse)*.18 if strike else .07
            bow=[p(-.5,-.15,1.5),p(-.64,-.24,1.35),p(-.68,-.28,1.12),p(-.62,-.23,.87),p(-.49,-.15,.7)]
            m.path(bow,.035,'wood');m.path([bow[0],p(-.45+pull,-.28,1.08),bow[-1]],.01,'cyan',part=False)
            m.rod(p(-.85,-.28,1.08),p(-.23+pull,-.28,1.08),.018,'gold',part=False)
            for side in (-1,1):
                for i in range(4):m.ico(p(side*(.27+i*.05),.04,1.06-i*.13),(.18,.05,.1),'leaf',1)
        elif kind=='shade':
            for side in (-1,1):
                m.rod(p(side*.34,0,1.1),p(side*.55,0,1.4),.13,'purple',end=.004,sides=5)
                x=side*(.48+max(0,pulse)*.15);m.path([p(x,-.2,.9),p(x+side*.15,-.22,1.08),p(x+side*.13,-.23,1.36)],.035,'purple',end=.005)
            scarf=[p(.15,.2,1.3),p(.5,.27,1.12+pulse*.1),p(.75,.2,1.34+pulse*.12)]
            m.path(scarf,.07,'red');m.rod(p(-.28,-.12,1.33),p(.28,-.12,1.33),.055,'red')
        elif kind=='elder':
            m.ico(p(0,.04,1.7),(.36,.28,.16),'cream',2)
            m.ico(p(0,.02,.64),(.34,.26,.25),'wood',2)
            for side in (-1,1):m.ico(p(side*.22,0,1.66),(.14,.2,.12),'cream',2)
            m.ico(p(0,.12,1.82),(.15,.14,.13),'cream',2)
            m.path([p(-.53,0,.05),p(-.5,0,1.15),p(-.4,0,1.24)],.025,'wood')
            m.ico(p(-.48,-.1,.81),(.17,.12,.17),'gold',2)
            for side in (-1,1):m.rod(p(side*.15,-.25,1.4),p(side*.25,-.24,1.39),.009,'earth',part=False)
        else:
            m.ico(p(0,-.2,.8),(.28,.1,.34),'wood',1)
            for side in (-1,1):m.ico(p(side*.4,-.02,1.08),(.17,.18,.19),'skin',2)
            m.ico(p(.12,-.5,.31),(.48,.24,.14),'stone',1);m.rod(p(.12,-.5,.06),p(.12,-.5,.3),.16,'stone')
            hammerZ=1.2+math.cos(phase)*.35;m.rod(p(.48,-.1,1),p(.44,-.38,hammerZ),.035,'wood');m.ico(p(.44,-.38,hammerZ),(.21,.12,.1),'stone',1)
            m.ico(p(-.65,.1,.35),(.22,.22,.3),'stone',1);m.ico(p(-.65,-.1,.43),(.11,.08,.19),'ember',1)
            if frame in (3,4):
                for i in range(6):m.ico(p(.12+math.sin(i*7)*.35,-.55,.42+abs(math.cos(i*5))*.25),(.023,.02,.035),'gold',1,False)
    elif kind=='fox':
        step=pulse*.16 if moving else 0
        for side in (-1,1):
            for rear in (-1,1):m.rod((side*.19,rear*.2,.4),(side*.19+step*rear*side,rear*.2,.07),.055,'orange')
        m.ico((0,.05,.44),(.3,.43,.27),'orange',2);m.ico((0,-.28,.72),(.28,.2,.25),'orange',2)
        for side in (-1,1):m.rod((side*.17,-.2,.83),(side*.19,-.18,1.15),.12,'orange',end=.003,sides=5)
        m.ico((0,-.45,.65),(.19,.14,.12),'cream',1);m.ico((0,-.57,.67),(.045,.025,.035),'night',1,False)
        eyes(m,(0,-.448,.78),.135,'night',.03)
        tail=[(.16,.29,.38),(.4,.32,.4),(.56,.32,.68),(.48+math.sin(phase)*.1,.32,.95)]
        for i in range(3):m.rod(tail[i],tail[i+1],.17-i*.025,'cream' if i==2 else 'orange',end=.12-i*.025)
        m.ico(tail[-1],(.09,.06,.15),'gold',1)
    elif kind in ('an','linh','kiet'):
        p=humanoid(m,phase,'walk' if action in ('run','dash') else 'attack' if action in ('q_cast','e_cast','r_ult') else action,'red' if kind=='an' else 'leaf' if kind=='linh' else 'water',scale=1.35)
        if kind=='an':
            for i in range(5):m.rod(p(0,.02,1.74+i*.025),p(0,.02,1.77+i*.025),.62-i*.11,'cream',sides=12)
            m.path([p(-.48,-.12,1),p(-.5,-.12,.75),p(-.44,-.12,.72)],.02,'wood')
            m.ico(p(-.44,-.12,.56),(.22,.16,.24),'gold',2)
            for i in range(5):m.ico(p((i-2)*.04,-.2,.55),(.06,.035,.12),'pink',1)
        elif kind=='linh':
            m.ico(p(0,.08,1.76),(.35,.26,.15),'leaf',2)
            for side in (-1,1):m.rod(p(side*.23,0,1.76),p(side*.33,.03,2.03),.12,'leaf',end=.003,sides=5)
            m.path([p(.45,-.1,.5),p(.75,-.15,.86),p(.78,-.16,1.2),p(.45,-.1,1.65)],.04,'wood')
            m.path([p(.45,-.1,.5),p(.4+max(0,pulse)*.15,-.2,1.07),p(.45,-.1,1.65)],.012,'gold',part=False)
        else:
            for side in (-1,1):
                m.ico(p(side*.36,0,1.16),(.28,.25,.22),'stone',1)
                m.rod(p(side*.2,-.2,.88),p(side*.2,-.2,1.16),.045,'gold')
            m.rod(p(.62,0,.1),p(.62,0,1.95),.035,'wood')
            m.rod(p(.62,0,1.87),p(.62,0,2.25),.14,'water',end=.002,sides=5)
            m.rod(p(.42,0,1.87),p(.83,0,1.87),.035,'gold')
            m.ico(p(0,-.26,1),(.11,.04,.14),'cyan',1)
    elif kind in ('golem','treant','boss'):
        size=1.65 if kind=='golem' else 1.18 if kind=='treant' else 1.8;rock=kind=='golem';body='earth' if rock else 'wood';swing=math.sin(phase) if moving else .1*pulse
        for side in (-1,1):
            m.ico((side*.33*size,0,.18*size),(.25*size,.28*size,.2*size),body,1)
            m.rod((side*.3*size,0,.23*size),(side*.24*size,0,.69*size),.2*size,body,end=.16*size,sides=7)
        m.ico((0,.04,.95*size),(.5*size,.32*size,.56*size),body,2)
        arms=4 if kind=='boss' else 2
        for arm in range(arms):
            side=(-1)**arm;z=1.26-(arm//2)*.35;x=side*.54*size
            handZ=(.9+(.43*max(0,pulse) if strike else swing*side*.1))*size
            m.ico((x,0,z*size),(.28*size,.29*size,.27*size),body,1)
            m.rod((x,0,z*size),(side*.76*size,-.09,handZ),.17*size,body,end=.2*size)
            m.ico((side*.8*size,-.1,handZ),(.3*size,.26*size,.34*size),body,1)
            if not rock:
                tip=side*(1.02+(.23*max(0,pulse) if strike else 0))*size
                m.path([(side*.76*size,-.1,handZ),(tip,-.1,.7*size),(tip+side*.13,-.12,1.04*size)],.04*size,'leaf',end=.013)
        m.ico((0,-.05,1.62*size),(.36*size,.29*size,.35*size),body,2)
        eyes(m,(0,-.33*size,1.64*size),.15*size,'gold' if rock else 'cyan',.06*size)
        for side in (-1,1):m.rod((side*.23*size,0,1.83*size),(side*.34*size,0,2.03*size),.13*size,body,end=.004)
        m.path([(-.16*size,-.3,.7*size),(.02,-.34,.98*size),(-.09*size,-.3,1.25*size),(.06,-.3,1.45*size)],.033*size,'ember' if rock else 'jade',part=False)
        if not rock:
            for i in range(7):
                x=(i-3)*.2*size;z=(1.83+math.sin(i*2)*.12)*size
                m.ico((x,.15,z),(.3*size,.27*size,.21*size),'leaf',2)
                if kind=='boss' and i%2==0:
                    m.rod((x,.02,z),(x,-.05,z-.32),.018,'wood');m.ico((x,-.08,z-.39),(.08,.07,.12),'gold',1)
        if kind=='boss':
            m.ico((0,-.31,1.02*size),(.2*size,.08,.25*size),'cyan',1)
            for side in (-1,1):m.path([(side*.1,-.42,.7*size),(side*.32,-.38,1.02*size),(side*.1,-.42,1.28*size)],.05,'wood')
    elif kind=='boss_cuukhucxa':
        for i in range(9):
            x=math.sin(i*.9+phase*.12)*(.7-i*.045);z=.2+i*.31
            m.ico((x,.2,z),(.39-i*.009,.3,.27),'jade',2)
            m.ico((x,-.09,z),(.16,.04,.17),'gold',1)
        headx=math.sin(7.2+phase*.12)*.34
        for side in (-1,1):m.ico((headx+side*.35,.12,2.55),(.5,.2,.58),'leaf',2)
        m.ico((headx,-.05,3),(.41,.34,.35),'jade',2);eyes(m,(headx,-.37,3.07),.21,'gold',.06)
        for side in (-1,1):m.rod((headx+side*.24,0,3.22),(headx+side*.35,.02,3.55),.1,'gold',end=.003,sides=5)
        m.ico((headx,-.4,2.81),(.23,.12,.19),'ember',2)
        m.ico((headx-.04,-.52,2.85),(.08,.025,.08),'#ffdd55',1,False)
    elif kind=='boss_thietdieu':
        m.ico((0,0,1.42),(.48,.39,.7),'gold',2);m.ico((0,-.37,1.46),(.21,.08,.27),'cyan',2)
        m.ico((0,-.03,2.23),(.34,.27,.35),'gold',2);m.rod((0,-.3,2.2),(0,-.7,2.09),.15,'cream',end=.001,sides=5)
        eyes(m,(0,-.275,2.32),.15,'cyan',.05)
        for side in (-1,1):
            m.rod((side*.24,0,1),(side*.3,-.02,.22),.12,'gold',end=.06)
            for j in range(3):m.rod((side*.3,0,.2),(side*.3+(j-1)*.14,-.24,.05),.04,'stone',end=.008)
            for i in range(7):
                a=.1+i*.16+pulse*.09
                base=(side*.36,0,1.9);end=(side*(.7+i*.13),.1,2.25-i*.12+math.sin(a+phase)*.12)
                m.rod(base,end,.13,'gold',end=.015,sides=5)
                m.rod(end,(end[0]+side*.17,end[1],end[2]-.38),.1,'stone',end=.002,sides=5)
            m.ring((side*.65,-.08,1.98),.23,.045,'gold',12)
        m.rod((0,.25,1.15),(0,.75,.5),.23,'gold',end=.03,sides=6)
    else:
        cloth={'boss_haba':'water','boss_hotinh':'pink','boss_thantrung':'gold','boss_kedetsuong':'purple'}[kind]
        p=humanoid(m,phase,action,cloth,scale=1.75)
        if kind=='boss_haba':
            for i in range(8):
                x=(i-3.5)*.11;m.path([p(x,0,1.8),p(x-.1,.06,2),p(x+.04,.07,2.13)],.05,'cream')
                m.path([p(x*.55,-.26,1.4),p(x*.62,-.3,1.1),p(x*.72,-.3,.98)],.045,'cream')
            m.rod(p(.67,0,.1),p(.67,0,1.92),.04,'gold')
            for side in (-1,0,1):m.path([p(.67,0,1.7),p(.67+side*.16,0,1.85),p(.67+side*.16,0,2.05)],.035,'water',end=.008)
            for i in range(12):m.ico(p((i%3-1)*.13,-.24,.82+(i//3)*.09),(.12,.05,.08),'water',1)
            m.ring((0,.12,.3),1.2,.055,'water',24,tilt=.3)
        elif kind=='boss_hotinh':
            # Nine separately modeled tails fan behind the silk robe.
            for i in range(9):
                a=(-1.45+i*.36);tip=(math.sin(a)*2.05,.5,1.5+math.cos(a)*1.45+pulse*.04)
                m.path([(0,.35,.6),(math.sin(a)*1.3,.45,1.4),tip],.23,'pink',end=.16)
                m.ico(tip,(.13,.12,.22),'cream',1);m.ico((tip[0],.32,tip[2]),(.085,.035,.11),'water',1)
            for side in (-1,1):m.rod(p(side*.2,0,1.7),p(side*.25,0,2.04),.17,'pink',end=.002,sides=5)
            for i in range(5):m.rod(p((i-2)*.1,-.28,.6),p((i-2)*.11,-.28,1.18),.015,'gold',part=False)
        elif kind=='boss_thantrung':
            m.ico((0,.64,1.8),(.88,.55,1.07),'gold',2)
            for z,r in [(.75,.86),(1,.83),(2.4,.48)]:m.rod((0,.62,z),(0,.62,z+.09),r,'gold',sides=12)
            for i in range(7):m.rod(((i-3)*.19,.08,1.8),((i-3)*.19,.06,2.02),.018,'jade',part=False)
            m.rod(p(.4,-.15,.93),p(.78,-.15,1.4+.2*pulse),.045,'wood');m.ico(p(.78,-.15,1.4+.2*pulse),(.3,.22,.21),'gold',1)
            m.ico(p(0,-.27,1.46),(.28,.06,.19),'stone',1);eyes(m,p(0,-.32,1.5),.23,'gold',.07)
        else:
            for side in (-1,1):
                m.rod((side*1.47,.5,.2),(side*1.47,.5,3.2),.055,'pink')
            for z in (.25,3.2):m.rod((-1.5,.5,z),(1.5,.5,z),.06,'gold')
            for arm in range(6):
                side=(-1)**arm;z=1.5+(arm//2)*.4;hand=(side*(.85+(arm//2)*.2),-.16,z+pulse*.12)
                m.path([(side*.4,0,2),hand],.065,'purple');m.ico(hand,(.08,.07,.08),'cream',1)
                m.path([hand,(side*1.4,.3,.4+(arm//2)*.35),(-side*1.4,.3,2.8-(arm//2)*.3)],.009,'cyan' if arm%2 else 'pink',part=False)
    if action=='hit':
        for i,v in enumerate(m.verts):m.verts[i]=(v[0]+v[2]*.1*math.cos(phase),v[1],v[2]*(.93+.04*math.cos(phase)))
    return m

def effect(key,frame,count):
    m=Mesh();phase=frame/count*math.tau
    if 'tornado' in key:
        height=5.6 if 'hurricane' in key else 4.3
        for ring in range(12):
            z=.1+ring*height/12;r=.15+ring*.075
            for j in range(12):
                a=j*math.tau/12+phase+ring*.45;b=a+.38
                m.rod((math.cos(a)*r,math.sin(a)*r*.4,z),(math.cos(b)*r,math.sin(b)*r*.4,z+.14),.09,'cyan' if j%4 else 'cream',sides=5,part=False)
        for i in range(10):
            a=phase+i*2;m.ico((math.cos(a)*(.4+i*.04),math.sin(a)*.3,.4+i*.4),(.1,.07,.045),'leaf' if i%2 else 'stone',1)
    elif key=='giant_fireball':
        m.ico((0,0,1.7),(.95,.65,1),'ember',2)
        for i in range(12):
            a=i*math.tau/12;m.rod((math.cos(a)*.7,0,1.7+math.sin(a)*.7),(math.cos(a)*1.12,0,1.7+math.sin(a)*1.2+pulse_safe(phase,i)*.13),.12,'orange',end=.003,sides=5)
    elif key=='meteor_burst':
        for i in range(16):
            a=i*math.tau/16;r=.45+frame*.2;m.ico((math.cos(a)*r,math.sin(a)*r*.38,.15),(.23,.14,.2),'earth',1)
            m.rod((math.cos(a)*r,math.sin(a)*r*.3,.16),(math.cos(a)*r*1.15,math.sin(a)*r*.3,.5+math.sin(i+phase)*.24),.09,'ember',end=.004,sides=5)
    elif key=='earth_tremor':
        for i in range(18):
            a=i*math.tau/18;r=1.2+frame*.05;m.ico((math.cos(a)*r,math.sin(a)*r*.4,.1),(.21,.14,.12),'earth',1)
            m.path([(math.cos(a)*r,math.sin(a)*r*.4,.12),(math.cos(a+.1)*r*.7,math.sin(a+.1)*r*.3,.14)],.023,'night',part=False)
    else:
        for i in range(12):
            a=i*math.tau/12+phase*.1;r=.9
            m.path([(math.cos(a)*r,0,1.2+math.sin(a)*r),(math.cos(a+.25)*r*.65,0,1.2+math.sin(a+.25)*r*.65),(0,0,1.2)],.025,'gold' if key=='convergence_hub' else 'purple',part=False)
        m.ico((0,-.08,1.2),(.2,.14,.2),'cyan',1)
    return m

def pulse_safe(phase,i):return math.sin(phase+i)

def export_summons_and_effects(image,metadata):
    path=ROOT/'assets/thienvu-vfx-pixel.json';old=json.loads(path.read_text(encoding='utf-8'));sheet=Image.open(ROOT/old['image']).convert('RGBA')
    keys={'golem_walk':'golem/walk','golem_smash':'golem/attack','treant_walk':'treant/walk','treant_whip':'treant/attack'}
    extras={k:k for k in ('tornado_mesh','tornado_hurricane','wind_tornado','giant_fireball','meteor_burst','earth_tremor','lightning_sigil','convergence_hub')}
    # Repack changed clips into appended native-sized cells; preserve every other source cell.
    width=old['width'];base=old.get('v08BaseHeight',min(c['y'] for k in keys for c in old['clips'][k]['cells']) if old.get('version')=='0.8.0' else sheet.height)
    old['v08BaseHeight']=base;sheet=sheet.crop((0,0,width,base));x=0;y=base;row=0;pending=[]
    for key,source in {**keys,**extras}.items():
        clip=metadata['clips'][source];cells=[]
        for src in clip['cells']:
            w,h=src['w'],src['h']
            if x+w>width:x=0;y+=row;row=0
            target={**src,'x':x,'y':y};cells.append(target);pending.append((src,target));x+=w;row=max(row,h)
        old['clips'][key]={'frames':clip['frames'],'fps':clip['fps'],'cells':cells}
    result=Image.new('RGBA',(width,y+row));result.paste(sheet,(0,0))
    for src,target in pending:result.paste(image.crop((src['x'],src['y'],src['x']+src['w'],src['y']+src['h'])),(target['x'],target['y']))
    old['palette']=list(dict.fromkeys(old['palette']+metadata['palette']))
    old['height']=result.height;old['version']='0.8.0';result.save(ROOT/old['image'],optimize=True)
    path.write_text(json.dumps(old,separators=(',',':')),encoding='utf-8');(ROOT/'assets/thienvu-vfx-pixel.js').write_text('globalThis.DTThienVuVFX='+json.dumps(old,separators=(',',':'))+';\n',encoding='utf-8')

def run():
    atlas=Atlas('actors-pixel-v08',2048)
    for kind in (*MONSTERS,*BOSSES,'elder','smith','fox','golem','treant'):
        boss=kind in BOSSES;w,h=(96,96) if boss else (80,80) if kind=='golem' else (64,64) if kind=='treant' else (36,36) if kind=='fox' else (56,48) if kind=='smith' else (48,48)
        actions={'idle':4,'move':6,'attack_slam':6,'cast_rage':6} if boss else {'idle':6} if kind in ('elder','smith') else {'idle':4,'run':6} if kind=='fox' else {'walk':6,'attack':6} if kind in ('golem','treant') else {'idle':4,'walk':6,'attack':5,'hit':2}
        for action,count in actions.items():
            for frame,cell in enumerate(atlas.cells(kind+'/'+action,w,h,count,10 if action!='idle' else 6)):
                atlas.add(cell,actor(kind,action,frame,count),kind)
    for key,w,h in [('tornado_mesh',96,128),('tornado_hurricane',128,160),('wind_tornado',84,96),('giant_fireball',96,96),('meteor_burst',144,144),('earth_tremor',144,96),('lightning_sigil',72,72),('convergence_hub',96,96)]:
        for frame,cell in enumerate(atlas.cells(key,w,h,6,12)):atlas.add(cell,effect(key,frame,6),key)
    for hero in ('an','linh','kiet'):
        for direction,angle in [('S',0),('E',-math.pi/2),('N',math.pi),('W',math.pi/2)]:
            from mathutils import Matrix,Vector
            for action,count in {'idle':4,'run':6,'dash':4,'attack':5,'q_cast':6,'e_cast':6,'r_ult':6,'hit':2}.items():
                for index,cell in enumerate(atlas.cells(hero+'_'+direction+'/'+action,64,64,count,10)):
                    model=actor(hero,action,index,count);rotation=Matrix.Rotation(angle,3,'Z');model.verts=[tuple(rotation @ Vector(v)) for v in model.verts];atlas.add(cell,model,hero)
    image,meta=atlas.bake(HERE,'DTActorsPixelAtlas')
    export_summons_and_effects(image,meta)
    keys=[k+'/idle' for k in (*MONSTERS,*BOSSES,'elder','smith','fox')]+['golem/walk','treant/walk']
    preview(image,meta,keys,HERE/'actors-soulknight-preview.png',5)
    preview(image,meta,[k+'/attack_slam' for k in BOSSES]+['golem/attack','treant/attack'],HERE/'actors-attacks-preview.png',5)
    # Unity JsonUtility accepts a list, so flatten dictionaries without duplicating image pixels.
    art=ROOT/'Unity/Assets/Resources/Art';art.mkdir(parents=True,exist_ok=True)
    clips=json.loads((art/'ThienVuClips.json').read_text(encoding='utf-8'))
    for clip in clips['clips']:
        if clip['key'] in meta['clips'] and clip.get('texture')=='ThienVuVFX':clip['cells']=meta['clips'][clip['key']]['cells']
    vfx=json.loads((ROOT/'assets/thienvu-vfx-pixel.json').read_text(encoding='utf-8'))
    for clip in clips['clips']:
        if clip.get('texture')=='ThienVuVFX' and clip['key'] in vfx['clips']:clip['cells']=vfx['clips'][clip['key']]['cells']
    existing={c['key'] for c in clips['clips']}
    for key in vfx['clips']:
        if key not in existing:clips['clips'].append({'key':key,'texture':'ThienVuVFX','fps':vfx['clips'][key]['fps'],'cells':vfx['clips'][key]['cells']})
    (art/'ThienVuClips.json').write_text(json.dumps(clips,separators=(',',':')),encoding='utf-8')
    import shutil
    shutil.copyfile(ROOT/vfx['image'],art/'ThienVuVFX.png')
    shutil.copyfile(ROOT/meta['image'],art/'actors-pixel-v08.png')
    (art/'WorldPixelClips.json').write_text(json.dumps({'clips':[{'key':k,'texture':'actors-pixel-v08','fps':v['fps'],'cells':v['cells']} for k,v in meta['clips'].items()]},separators=(',',':')),encoding='utf-8')

if __name__=='__main__':run()
