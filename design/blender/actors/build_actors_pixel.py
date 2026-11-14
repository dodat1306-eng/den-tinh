"""Articulated chibi monsters, seven guardians, villagers and faceted elemental summons."""
import json, math, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from pixel_pipeline import Atlas, Mesh, ROOT, preview, PITCH
from PIL import Image

HERE=Path(__file__).resolve().parent
MONSTERS=('slime','wisp','boar','archer','shade')
BOSSES=('boss','boss_haba','boss_hotinh','boss_thantrung','boss_cuukhucxa','boss_thietdieu','boss_kedetsuong')
NPCS=('elder','smith','ferryman','mirror_maiden','bell_keeper','sun_child','bronze_pilot')

def eyes(m,center,span=.18,color='cyan',size=.055):
    x,y,z=center
    for side in (-1,1):
        m.ico((x+span*side,y,z),(size*1.3,.035,size),'night',1,False)
        m.ico((x+span*side,y-.035,z+.01),(size*.65,.02,size*.6),color,1,False)

def chibi_body(m,phase,action,cloth='leaf',skin='skin',scale=1):
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
    return p

def human(kind,phase,action):
    m=Mesh();skin='skin';cloth={'elder':'wood','smith':'earth','ferryman':'leaf','mirror_maiden':'pink','bell_keeper':'water','sun_child':'red','bronze_pilot':'wood'}[kind]
    scale=.8 if kind=='sun_child' else 1;p=chibi_body(m,phase,action,cloth,scale=scale)
    m.ico(p(0,0,1.53),(.29*scale,.25*scale,.29*scale),skin,2)
    # Sclera, iris, catchlight and eyebrows remain visible in every human face.
    for side in (-1,1):
        m.ico(p(side*.105,-.248,1.55),(.085*scale,.024,.065*scale),'cream',1,False)
        m.ico(p(side*.105,-.275,1.55),(.034*scale,.015,.05*scale),'wood',1,False)
        m.ico(p(side*.115,-.29,1.57),(.015,.009,.018),'#ffffff',1,False)
        m.rod(p(side*.07,-.27,1.67),p(side*.21,-.24,1.68),.015,'wood',part=False)
    m.rod(p(-.05,-.27,1.39),p(.06,-.27,1.39),.012,'red',part=False)
    hair='cream' if kind in ('elder','ferryman') else 'earth' if kind=='bronze_pilot' else 'night'
    m.ico(p(0,.06,1.77),(.33*scale,.27*scale,.20*scale),hair,2)
    m.ico(p(0,.17,1.53),(.28*scale,.17*scale,.27*scale),hair,2)
    m.ico(p(0,-.04,1.32),(.18*scale,.20*scale,.12*scale),skin,1)
    for side in (-1,1):m.rod(p(side*.25,.01,1.75),p(side*.265,-.10,1.40),.065*scale,hair,end=.015)
    for i in range(5):m.rod(p((i-2)*.12,-.08,1.83),p((i-2)*.13,-.22,1.63+(i%2)*.04),.08,hair,end=.012,sides=5)
    if kind=='elder':
        m.ico(p(0,.12,1.95),(.19,.18,.17),'cream',2)
        m.rod(p(-.29,.10,1.99),p(.3,.1,2.05),.02,'jade',part=False)
        for side in (-1,1):
            m.ring(p(side*.14,-.30,1.55),.105,.013,'gold',12)
            m.prism([(side*.12,.6),(side*.32,1.26),(side*.39,1.1),(side*.32,.51)],'gold',-.18,.12)
        m.rod(p(-.04,-.31,1.56),p(.04,-.31,1.56),.014,'gold',part=False)
        for i in range(9):
            a=math.pi+i*math.pi/8;m.ico(p(math.cos(a)*.18,-.25,1.2+math.sin(a)*.12),(.028,.024,.03),'wood',1)
        m.path([p(-.52,0,.04),p(-.52,0,1.32),p(-.43,-.02,1.48),p(-.34,-.04,1.42)],.026,'leaf')
        m.rod(p(-.36,-.04,1.4),p(-.36,-.06,1.1),.012,'gold',part=False)
        for i in range(6):m.ico(p(-.36+math.sin(i)*.10,-.07,1.01+(i%2)*.03),(.07,.07,.13),'red',1)
        m.ico(p(-.36,-.13,1.05),(.05,.03,.07),'gold',1,False)
    elif kind=='smith':
        m.rod(p(-.29,-.31,1.73),p(.29,-.31,1.73),.07,'red')
        for i in range(5):m.ico(p((i-2)*.11,-.38,1.73),(.035,.016,.045),'night',1,False)
        m.path([p(.28,-.22,1.75),p(.44,-.16,1.65),p(.43,-.13,1.45)],.05,'red')
        m.path([p(-.26,-.18,1.53),p(-.21,-.24,1.3),p(0,-.28,1.25),p(.21,-.24,1.3),p(.26,-.18,1.53)],.085,'wood')
        m.ico(p(0,-.23,.87),(.28,.08,.37),'wood',1)
        for side in (-1,1):
            m.rod(p(side*.2,-.21,1.24),p(side*.19,-.25,.9),.035,'wood')
            for z in (.68,.85,1.03):m.ico(p(side*.21,-.32,z),(.025,.018,.025),'gold',1,False)
        m.rod(p(.44,-.02,.97),p(.38,.06,1.94),.035,'wood');m.ico(p(.37,.03,1.93),(.29,.17,.16),'stone',1)
        m.ico(p(-.57,-.30,.32),(.36,.22,.14),'stone',1);m.rod(p(-.57,-.3,.05),p(-.57,-.3,.31),.14,'stone')
        m.ico(p(.64,.20,.37),(.25,.25,.29),'stone',1);m.ico(p(.64,-.02,.4),(.14,.07,.17),'ember',1)
        for i in range(4):m.ico(p(.64+math.sin(i*4+phase)*.15,-.09,.61+i*.07),(.025,.02,.04),'gold',1,False)
    elif kind=='ferryman':
        for i in range(6):m.rod(p(0,0,1.88+i*.04),p(0,0,1.9+i*.04),.58-i*.09,'cream',sides=12)
        for side in (-1,1):
            for i in range(5):m.rod(p(side*(.1+i*.07),.10,1.29),p(side*(.22+i*.07),-.05,.68),.05,'leaf' if i%2 else 'gold',sides=5)
        for i in range(5):m.path([p((i-2)*.06,-.27,1.43),p((i-2)*.07,-.3,1.18),p((i-2)*.04,-.26,.97)],.035,'cream')
        m.rod(p(-.58,0,.12),p(-.52,0,1.95),.035,'wood');m.ico(p(-.58,-.03,.19),(.12,.06,.26),'wood',1)
        for z in (.14,.22,.30):m.rod(p(-.66,-.1,z),p(-.49,-.1,z+.03),.009,'water',part=False)
    elif kind=='mirror_maiden':
        for side in (-1,1):m.path([p(side*.26,.08,1.78),p(side*.32,.13,1.21),p(side*.39,.11,.53)],.14,'night')
        m.ico(p(-.31,-.05,1.82),(.12,.06,.10),'purple',1);m.ico(p(-.31,-.12,1.82),(.035,.025,.04),'gold',1)
        for side in (-1,1):m.path([p(side*.26,-.10,1.26),p(side*.07,-.27,.87),p(side*.28,-.23,.66)],.04,'purple')
        m.ico(p(0,-.41,.91),(.23,.04,.29),'gold',2);m.ico(p(0,-.46,.94),(.18,.02,.23),'water',2);m.ico(p(-.05,-.49,1.02),(.07,.01,.12),'cream',1,False)
    elif kind=='bell_keeper':
        m.ico(p(0,0,1.89),(.36,.26,.22),'water',1)
        m.rod(p(-.31,-.10,1.85),p(.31,-.10,1.85),.045,'night')
        for i in range(3):m.rod(p(-.11,-.26,.80+i*.1),p(.11,-.26,.80+i*.1),.015,'gold',part=False)
        m.rod(p(0,-.27,.73),p(0,-.27,1.09),.014,'gold',part=False)
        m.ico(p(-.53,-.1,.85),(.18,.13,.18),'gold',2);m.rod(p(-.53,-.10,1),p(-.53,-.1,1.19),.018,'gold')
        m.rod(p(.44,-.17,.83),p(.62,-.22,1.19),.025,'wood');m.ico(p(.63,-.22,1.20),(.08,.06,.08),'wood',1)
    elif kind=='sun_child':
        for side in (-1,1):
            m.ico(p(side*.36,.04,1.75),(.18,.17,.18),'night',2)
            m.rod(p(side*.3,-.08,1.78),p(side*.45,-.11,1.64),.035,'red')
        m.prism([(-.19,.95),(.19,.95),(.14,.61),(0,.51),(-.14,.61)],'gold',-.21,.06)
        m.ico(p(0,-.40,.98),(.21,.17,.21),'gold',2);m.ico(p(-.04,-.56,1.05),(.07,.02,.09),'#ffffff',1,False)
    else:
        m.path([p(.12,.19,1.83),p(.40,.24,1.92),p(.50,.18,1.55),p(.43,.2,1.26)],.12,'earth',end=.035)
        for side in (-1,1):
            m.ring(p(side*.17,-.22,1.83),.13,.035,'gold',12);m.ico(p(side*.17,-.25,1.83),(.08,.02,.06),'water',1,False)
            m.ico(p(side*.25,-.09,1.30),(.16,.2,.14),'cream',1)
        m.ring(p(-.48,-.27,.99),.20,.025,'gold',16);m.ring(p(-.48,-.3,.99),.15,.014,'water',12)
        for i in range(6):
            a=i*math.tau/6;m.rod(p(-.48,-.31,.99),p(-.48+math.cos(a)*.17,-.31,.99+math.sin(a)*.17),.01,'gold',part=False)
    return m

def actor(kind,action,frame,count):
    m=Mesh();phase=frame/count*math.tau;moving=action in ('walk','move','run');strike=action in ('attack','attack_slam','cast_rage','punch','smash','stomp','throw');pulse=math.sin(phase)
    if kind in NPCS:return human(kind,phase,action)
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
            for i in range(3):m.rod((side*(.42+i*.06),.12,.78+i*.03),(side*(.42+i*.06),.12,1.18+i*.03),.07,'leaf',sides=7)
        m.ico((0,.27,1.07),(.4,.3,.1),'stone',1)
        eyes(m,(0,-.46,1.1-lean),.23,'red',.05)
    elif kind=='wisp':
        z=.15+pulse*.07
        m.ico((0,.1,.8+z),(.4,.27,.64),'purple',2)
        for i in range(7):
            a=i*math.tau/7;m.path([(math.cos(a)*.24,.1+math.sin(a)*.16,.8),(math.cos(a)*.35+.06*pulse,.1+math.sin(a)*.22,.4),(math.cos(a)*.28+math.sin(phase+i)*.1,.12+math.sin(a)*.16,.14)],.065,'purple',end=.005)
        m.ico((0,-.09,1.39+z),(.32,.22,.31),'purple',2);m.ico((0,-.28,1.36+z),(.24,.04,.18),'night',1)
        eyes(m,(0,-.323,1.4+z),.12,'cyan',.05)
        hand=.4+math.sin(phase)*.07
        for side in (-1,1):m.path([(side*.32,0,1.1+z),(side*.43,-.1,.8+z),(side*.23,-.31,.77+z)],.045,'cream')
        m.rod((0,-.4,.71+z),(0,-.4,.86+z),.022,'gold',part=False)
        m.ico((0,-.4,.56+z),(.2,.14,.21),'gold',2)
        for side in (-1,1):m.rod((side*.14,-.48,.4+z),(side*.14,-.48,.71+z),.015,'wood',part=False)
    elif kind in ('archer','shade'):
        p=chibi_body(m,phase,action,'leaf' if kind=='archer' else 'night')
        if kind=='archer':
            m.ico(p(0,0,1.56),(.29,.25,.41),'cream',1)
            m.ico(p(0,-.25,1.35),(.13,.12,.24),'cream',1)
            for side in (-1,1):
                m.ico(p(side*.17,-.23,1.61),(.10,.035,.12),'night',1,False)
                m.ico(p(side*.17,-.27,1.62),(.04,.02,.065),'red',1,False)
                m.path([p(side*.19,.03,1.84),p(side*.32,.06,2.14),p(side*.52,.09,2.40)],.045,'wood')
                for i in range(3):m.rod(p(side*(.25+i*.08),.05,2.0+i*.12),p(side*(.4+i*.10),.03,2.13+i*.12),.035,'wood',end=.008)
                for i in range(4):m.rod(p(side*.25,.18,.85+i*.12),p(side*(.50+i*.03),.20,1.20+i*.12),.08,'leaf',end=.002,sides=5)
            bow=[p(-.53,-.17,1.55),p(-.72,-.2,1.31),p(-.75,-.2,1.02),p(-.64,-.2,.76)]
            m.path(bow,.045,'wood');m.path([bow[0],p(-.48+max(0,pulse)*.20,-.22,1.1),bow[-1]],.012,'cream',part=False)
            m.rod(p(-.88,-.25,1.1),p(-.25,-.25,1.1),.018,'gold',part=False)
        else:
            # Demon skull and smoke lower body; no human head or bare human face.
            m.ico(p(0,0,1.57),(.36,.26,.34),'night',1)
            for side in (-1,1):
                m.path([p(side*.23,.03,1.76),p(side*.38,.08,2.03),p(side*.30,.18,2.25)],.10,'purple',end=.005)
                m.rod(p(side*.07,-.27,1.62),p(side*.25,-.25,1.71),.035,'purple',part=False)
                for i in range(3):m.rod(p(side*(.06+i*.07),-.26,1.43),p(side*(.07+i*.07),-.28,1.35),.026,'cream',end=.002,sides=5)
                m.path([p(side*.42,-.1,.95),p(side*.65,-.18,1.19),p(side*.83,-.23,1.56),p(side*.55,-.28,1.35)],.065,'purple',end=.005)
            for i in range(7):m.path([p((i-3)*.09,.02,.82+i*.01),p((i-3)*.16,.06,.44+i*.015),p((i-3)*.11+math.sin(phase+i)*.10,.04,.08)],.10,'night',end=.002)
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
    elif kind in ('an','linh'):
        p=chibi_body(m,phase,'walk' if action in ('run','dash') else 'attack' if action in ('q_cast','e_cast','r_ult') else action,'red' if kind=='an' else 'leaf' if kind=='linh' else 'water',scale=1)
        m.ico(p(0,0,1.55),(.29,.25,.29),'skin',2)
        m.ico(p(0,-.035,1.34),(.18,.20,.12),'skin',1)
        m.ico(p(0,.08,1.79),(.33,.28,.22),'night',2)
        m.ico(p(0,.18,1.55),(.29,.19,.28),'night',2)
        for side in (-1,1):m.rod(p(side*.26,.01,1.77),p(side*.27,-.12,1.39),.075,'night',end=.012)
        for i in range(5):m.rod(p((i-2)*.12,-.12,1.82),p((i-2)*.12,-.25,1.65),.055,'night',end=.01)
        eyes(m,p(0,-.26,1.57),.11,'cyan',.043)
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
    elif kind in ('golem','treant','boss'):
        size=1.65 if kind=='golem' else 1.18 if kind=='treant' else 1.8;rock=kind=='golem';body='earth' if rock else 'wood';swing=math.sin(phase) if moving else .1*pulse
        drive=([-.3,-.8,1,.75,.25,0][min(frame,5)] if strike else 0)
        for side in (-1,1):
            m.ico((side*.33*size,0,(.18+(.28*max(0,-drive) if action=='stomp' and side==1 else max(0,swing*side)*.12 if moving else 0))*size),(.25*size,.28*size,.2*size),body,1)
            m.rod((side*.3*size,0,.23*size),(side*.24*size,0,.69*size),.2*size,body,end=.16*size,sides=7)
        m.ico((0,.04,.95*size),(.5*size,.32*size,.56*size),body,2)
        arms=4 if kind=='boss' else 2
        for arm in range(arms):
            side=(-1)**arm;z=1.26-(arm//2)*.35;x=side*.54*size
            tier=(arm//2)*.35*size
            handZ=(1.65-.7*max(0,drive) if action=='throw' else 1.25-.75*drive if action=='smash' else 1.12-.12*drive if action=='punch' else .9+(swing*side*.1))*size-tier
            handX=side*(.8-.40*max(0,drive) if action=='attack' and not rock else .8)*size
            handY=(-.10-.75*drive if action=='punch' and side==1 else -.1-.30*drive if strike else -.1+swing*side*.13)
            m.ico((x,0,z*size),(.28*size,.29*size,.27*size),body,1)
            elbow=(side*.70*size,handY*.45,(z*size+handZ)/2)
            m.rod((x,0,z*size),elbow,.17*size,body,end=.19*size)
            m.rod(elbow,(handX,handY,handZ),.18*size,body,end=.2*size)
            m.ico((handX,handY,handZ),(.3*size,.26*size,.34*size),body,1)
            if not rock:
                tip=side*(1.02+(.23*max(0,pulse) if strike else 0))*size
                m.path([(handX,handY,handZ),(tip-.5*side*drive,-.1-.5*drive,.7*size-tier),(tip+side*.13-.7*side*drive,-.12-.6*drive,1.04*size-tier)],.04*size,'leaf',end=.013)
        m.ico((0,-.05,1.62*size),(.36*size,.29*size,.35*size),body,2)
        eyes(m,(0,-.33*size,1.64*size),.15*size,'gold' if rock else 'cyan',.06*size)
        for side in (-1,1):m.rod((side*.23*size,0,1.83*size),(side*.34*size,0,2.03*size),.13*size,body,end=.004)
        m.path([(-.16*size,-.3,.7*size),(.02,-.34,.98*size),(-.09*size,-.3,1.25*size),(.06,-.3,1.45*size)],.033*size,'ember' if rock else 'jade',part=False)
        if rock and action=='throw' and frame<3:m.ico((0,-.12,2.0*size),(.48,.39,.40),'earth',1)
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
                base=(side*.36,i*.025,1.9);end=(side*(.7+i*.13),.1+i*.025,2.25-i*.12+math.sin(a+phase)*.12)
                dx,dz=end[0]-base[0],end[2]-base[2];length=math.hypot(dx,dz);nx,nz=-dz/length*.13,dx/length*.13
                m.prism([(base[0]-nx,base[2]-nz),(end[0],end[2]),(base[0]+nx,base[2]+nz)],'gold',.05+i*.025,.012)
                m.rod(end,(end[0]+side*.17,end[1],end[2]-.38),.1,'stone',end=.002,sides=5)
            m.ring((side*.65,-.08,1.98),.23,.045,'gold',12)
        m.rod((0,.25,1.15),(0,.75,.5),.23,'gold',end=.03,sides=6)
    else:
        cloth={'boss_haba':'water','boss_hotinh':'pink','boss_thantrung':'gold','boss_kedetsuong':'purple'}[kind]
        p=chibi_body(m,phase,action,cloth,scale=1.75)
        m.ico(p(0,0,1.54),(.59,.44,.55),cloth,1)
        m.ico(p(0,-.25,1.53),(.45,.12,.32),'stone' if kind=='boss_thantrung' else 'night',1)
        eyes(m,p(0,-.38,1.61),.26,'gold' if kind=='boss_thantrung' else 'cyan',.08)
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
                a=(-1.45+i*.36);tip=(math.sin(a)*2.05,.75,1.5+math.cos(a)*1.45+pulse*.04)
                m.path([(0,.65,.6),(math.sin(a)*1.3,.68,1.4),tip],.23,'pink',end=.16)
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
    if action=='spawn' and kind in ('golem','treant'):
        rise=(.12,.52,1.10,1.0)[frame];sink=max(v[2] for v in m.verts)*(1-rise)
        m.verts=[(x,y,z-sink) for x,y,z in m.verts]
        keep=[i for i,face in enumerate(m.faces) if all(m.verts[j][2]>=.025 for j in face)]
        m.faces=[m.faces[i] for i in keep];m.colors=[m.colors[i] for i in keep];m.parts=[m.parts[i] for i in keep]
        used=sorted({j for face in m.faces for j in face});remap={j:i for i,j in enumerate(used)}
        m.verts=[m.verts[j] for j in used];m.faces=[tuple(remap[j] for j in face) for face in m.faces]
        for side in (-1,1):m.path([(side*.2,0,.03),(side*.55,.08,.12),(side*.8,.12,.04)],.09,body)
    if action=='hit':
        for i,v in enumerate(m.verts):m.verts[i]=(v[0]+v[2]*.1*math.cos(phase),v[1],v[2]*(.93+.04*math.cos(phase)))
    return m

def effect(key,frame,count):
    m=Mesh();phase=frame/count*math.tau
    if key.startswith('weapon_swing_') or key=='light_backstab_slash':
        color={'lightning':'gold','earth':'earth','ice':'ice','nature':'leaf'}.get(key.split('_')[-1],'gold')
        for j in range(2 if key=='light_backstab_slash' else 1):
            points=[(math.cos(-1.1+i*.16)*1.5,.0,1.45+math.sin(-1.1+i*.16)*1.2) for i in range(15)]
            if j:points=[(-x,y,z) for x,y,z in points]
            m.path(points,.05+(frame%2)*.015,color,part=False)
            for i in range(4):m.ico((points[i*3][0],-.06,points[i*3][2]),(.08,.04,.13),'cream',1,False)
    elif key=='light_flash_step':
        for i in range(8):
            a=i*math.tau/8+phase*.1;m.rod((0,0,.8),(math.cos(a)*(.5+frame*.05),0,.8+math.sin(a)*(.5+frame*.05)),.045,'gold',end=.003,sides=5,part=False)
        m.ico((0,-.03,.8),(.12,.06,.16),'cream',1,False)
    elif key=='golem_rock':
        m.ico((0,0,.7),(.52+.04*math.sin(phase),.42,.5),'earth',1)
        m.path([(-.3,-.34,.45),(-.02,-.43,.7),(.2,-.33,1.01)],.035,'ember',part=False)
    elif 'tornado' in key:
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
            m.rod((math.cos(a)*r,math.sin(a)*r*.3,.16+i*.007),(math.cos(a)*r*1.15,math.sin(a)*r*.3,.5+math.sin(i+phase)*.24+i*.007),.045,'ember',end=.004,sides=5)
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
    keys={'golem_spawn':'golem/spawn','golem_idle':'golem/idle','golem_walk':'golem/walk','golem_smash':'golem/smash','golem_punch':'golem/punch','golem_stomp':'golem/stomp','golem_throw':'golem/throw','treant_spawn':'treant/spawn','treant_idle':'treant/idle','treant_walk':'treant/walk','treant_whip':'treant/attack'}
    extras={k:k for k in ('tornado_mesh','tornado_hurricane','wind_tornado','giant_fireball','meteor_burst','earth_tremor','lightning_sigil','convergence_hub','weapon_swing_lightning','weapon_swing_earth','weapon_swing_ice','weapon_swing_nature','light_flash_step','light_backstab_slash','golem_rock')}
    # Repack changed clips into appended native-sized cells; preserve every other source cell.
    width=old['width'];base=old.get('v08BaseHeight') or min(c['y'] for k in keys if k in old['clips'] for c in old['clips'][k]['cells'])
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
    old['height']=result.height;old['version']=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version'];result.save(ROOT/old['image'],optimize=True)
    path.write_text(json.dumps(old,separators=(',',':')),encoding='utf-8');(ROOT/'assets/thienvu-vfx-pixel.js').write_text('globalThis.DTThienVuVFX='+json.dumps(old,separators=(',',':'))+';\n',encoding='utf-8')

def run():
    atlas=Atlas('actors-pixel-v1',2048)
    for kind in (*MONSTERS,*BOSSES,*NPCS,'fox','golem','treant'):
        boss=kind in BOSSES;w,h=(96,96) if boss else (80,80) if kind=='golem' else (64,64) if kind=='treant' else (36,36) if kind=='fox' else (64,64) if kind=='smith' else (64,64) if kind in NPCS else (48,48)
        actions={'idle':4,'move':6,'attack_slam':6,'cast_rage':6} if boss else {'idle':6} if kind in NPCS else {'idle':4,'run':6} if kind=='fox' else {'spawn':4,'idle':4,'walk':6,'punch':6,'smash':6,'stomp':6,'throw':6} if kind=='golem' else {'spawn':4,'idle':4,'walk':6,'attack':6} if kind=='treant' else {'idle':4,'walk':6,'attack':5,'hit':2}
        for action,count in actions.items():
            for frame,cell in enumerate(atlas.cells(kind+'/'+action,w,h,count,count/.45 if action=='spawn' else 10 if action!='idle' else 6)):
                atlas.add(cell,actor(kind,action,frame,count),kind)
    for key,w,h in [('tornado_mesh',96,128),('tornado_hurricane',128,160),('wind_tornado',84,96),('giant_fireball',96,96),('meteor_burst',144,144),('earth_tremor',144,96),('lightning_sigil',72,72),('convergence_hub',96,96),('weapon_swing_lightning',96,80),('weapon_swing_earth',96,80),('weapon_swing_ice',96,80),('weapon_swing_nature',96,80),('light_flash_step',64,64),('light_backstab_slash',96,80),('golem_rock',48,48)]:
        for frame,cell in enumerate(atlas.cells(key,w,h,6,12)):atlas.add(cell,effect(key,frame,6),key)
    for hero in ('an','linh'):
        for direction,angle in [('S',0),('E',math.pi/3),('N',math.pi),('W',-math.pi/3)]:
            from mathutils import Matrix,Vector
            for action,count in {'idle':4,'run':6,'dash':4,'attack':5,'q_cast':6,'e_cast':6,'r_ult':6,'hit':2}.items():
                for index,cell in enumerate(atlas.cells(hero+'_'+direction+'/'+action,64,64,count,10)):
                    model=actor(hero,action,index,count);rotation=Matrix.Rotation(angle,3,'Z');model.verts=[tuple(rotation @ Vector(v)) for v in model.verts];atlas.add(cell,model,hero)
    image,meta=(Image.open(ROOT/'assets/actors-pixel-v1.png').convert('RGBA'),json.loads((ROOT/'assets/actors-pixel-v1.json').read_text(encoding='utf-8'))) if '--export-only' in sys.argv else atlas.bake(HERE,'DTActorsPixelAtlas',target_h={k:43 for k in (*NPCS,'an','linh')},detached_parts='Eyes, clothing inlays, sparks and spell particles are independent 2D sprite details.')
    export_summons_and_effects(image,meta)
    keys=[k+'/idle' for k in (*MONSTERS,*BOSSES,*NPCS,'fox')]+['golem/walk','treant/walk']
    preview(image,meta,keys,HERE/'actors-soulknight-preview.png',5)
    preview(image,meta,[k+'/attack_slam' for k in BOSSES]+['golem/punch','golem/smash','golem/stomp','golem/throw','treant/attack'],HERE/'actors-attacks-preview.png',5)
    preview(image,meta,[k+'/idle' for k in NPCS]+[k+'/idle' for k in MONSTERS],HERE/'npcs-vs-monsters-preview.png',4)
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
    shutil.copyfile(ROOT/meta['image'],art/'actors-pixel-v1.png')
    (art/'WorldPixelClips.json').write_text(json.dumps({'clips':[{'key':k,'texture':'actors-pixel-v1','fps':v['fps'],'cells':v['cells']} for k,v in meta['clips'].items()]},separators=(',',':')),encoding='utf-8')

if __name__=='__main__':run()
