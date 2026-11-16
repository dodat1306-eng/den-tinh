"""Bake 25 articulated NPCs, six posed meshes each, with the shared Blender pipeline."""
import ast
import json
import math
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pixel_pipeline import Atlas, Mesh, ROOT, preview
from mathutils import Euler

HERE = Path(__file__).resolve().parent
NPCS = ast.literal_eval(re.search(r'const npc=(\[[\s\S]*?\])\.map', (ROOT/'v09-content.js').read_text(encoding='utf-8')).group(1))
CLOTH = ['wood','earth','water','purple','jade','wood','purple','leaf','wood','water','purple','cream','jade','night','wood','red','jade','water','water','leaf','pink','water','gold','earth','orange']


class NpcMesh(Mesh):
    def shape(self, kind, at, scale, color, detail=1, rotation=None, part=True):
        # Subpixel facet tilts separate layered cloth and prop surfaces in depth.
        i = self.serial + 1
        tilt = Euler((.009*math.sin(i*1.7), .011*math.cos(i*2.3), .008*math.sin(i*.7))).to_quaternion()
        super().shape(kind, at, scale, color, detail, tilt @ rotation if rotation else tilt, part)


def lantern(m, p, color='red', phase=0, radius=.16):
    x,y,z=p
    m.ring((x,y,z+.23),.09,.018,'gold',12)
    m.ico((x,y,z),(radius,.13,.23),color,1)
    for i in (-1,0,1): m.rod((x+i*.07,y-.13,z-.17),(x+i*.07,y-.13,z+.17),.011,'gold',part=False)
    m.rod((x,y,z-.22),(x+math.sin(phase)*.06,y,z-.39),.018,'gold')
    m.ico((x,y-.145,z),(.05,.015,.09),'ember',1,False)


def book(m,p,color='wood',opened=False):
    x,y,z=p
    for side in (-1,1) if opened else (1,):
        m.ico((x+side*.13 if opened else x,y,z),(.18,.055,.23),color,1)
        m.prism([(x-.13+(side*.13 if opened else 0),z-.16),(x+.13+(side*.13 if opened else 0),z-.16),(x+.13+(side*.13 if opened else 0),z+.16),(x-.13+(side*.13 if opened else 0),z+.16)],'cream',y-.065,.015,False)
    for i in range(3): m.rod((x-.08,y-.09,z+.1-i*.07),(x+.09,y-.09,z+.1-i*.07),.012,'wood',part=False)


def conical_hat(m,p):
    x,y,z=p
    m.rod((x,y,z),(x,y,z+.21),.43,'wood',end=.025,sides=12)
    m.rod((x,y,z-.01),(x,y,z+.015),.46,'gold',sides=12)


def npc(kind,index,frame):
    m=NpcMesh(); phase=frame*math.tau/6; pulse=math.sin(phase); sway=math.cos(phase)
    child=kind in ('lantern_boy','sun_child'); scale=.78 if child else 1
    seated=kind in ('blind_bard','waterfall_hermit'); bent=kind in ('lotus_crone','wandering_merchant')
    def p(x,y,z): return (x*scale,(y-(.09 if bent and z>1 else 0))*scale,(z+.025*pulse+(.01*sway if z>1 else 0)-(.20 if seated else 0))*scale)
    cloth=CLOTH[index]; hair='cream' if kind in ('elder','ash_forger','waterfall_hermit','lotus_crone','bamboo_hunter','ferryman') else 'night'
    skin='#d8f6ff' if kind=='scholar_ghost' else 'stone' if kind=='automaton_07' else 'skin'
    # Independent shoulder, elbow, wrist, hip, knee and ankle volumes.
    for side in (() if kind=='scholar_ghost' else (-1,1)):
        hip=p(side*.14,.02,.63); knee=p(side*.19,-.10 if seated else .02,.37); foot=p(side*.29 if seated else side*.18,-.18,.08)
        m.rod(hip,knee,.11,cloth);m.rod(knee,foot,.08,'night');m.ico(foot,(.12,.18,.085),'skin' if kind=='lantern_boy' else 'night',1)
    m.ico(p(0,.02,.65),(.24,.19,.19),cloth,2);m.ico(p(0,.02,.9),(.24,.19,.32),cloth,2)
    m.ico(p(0,0,1.10),(.29,.19,.18),cloth,2);m.rod(p(0,0,.70),p(0,0,.76),.245,'gold',sides=10)
    if kind not in ('smith','lantern_boy','windmill_keeper','automaton_07','sun_child'):
        for side in (-1,1): m.ico(p(side*(.13+.01*sway),.06,.46),(.19,.20,.35),cloth,2)
    hands={}
    for side in (-1,1):
        hand=p(side*(.40+.025*sway),-.20,1.0+.045*math.sin(phase+side))
        if kind=='weaver_woman': hand=p(side*.27+math.sin(phase)*.13,-.46,.85)
        if kind in ('bamboo_nun','sun_child','mirror_maiden'): hand=p(side*.15,-.32,1.0+.015*pulse)
        if kind=='ash_forger' and side<0:
            m.rod(p(-.28,0,1.13),p(-.37,-.05,.99),.10,'skin');m.ico(p(-.37,-.05,.99),(.11,.10,.09),'gold',1);continue
        elbow=p(side*.38,-.05,.98+.02*pulse)
        if kind!='automaton_07': m.ico(p(side*.27,0,1.1),(.13,.16,.14),'skin' if kind in ('smith','ash_forger') else cloth,2)
        m.rod(p(side*.27,0,1.1),elbow,.09,'skin' if kind in ('smith','ash_forger') else 'leaf' if kind=='wandering_merchant' else cloth)
        m.rod(elbow,hand,.067,cloth if kind in ('temple_keeper','bamboo_nun','exiled_pyromancer') else skin);m.ico(hand,(.08,.065,.08),skin,2);hands[side]=hand
    m.rod(p(0,0,1.17),p(0,-.01,1.33),.085,skin)
    m.ico(p(0,0,1.49),(.23,.21,.23),skin,2);m.ico(p(0,-.04,1.32),(.15,.17,.10),skin,2)
    if kind!='automaton_07':
        m.ico(p(0,.06,1.59),(.235,.19,.17),hair,2)
        for side in (-1,1):
            m.ico(p(side*.213,.0,1.47),(.055,.045,.073),skin,1)
            m.ico(p(side*.093,-.195,1.50),(.064,.027,.047),'cream',2,False)
            m.ico(p(side*.092,-.223,1.50),(.035,.022,.036),'ember' if kind in ('ash_forger','exiled_pyromancer') else 'cyan' if kind=='scholar_ghost' else 'jade',2,False)
            m.ico(p(side*.095,-.246,1.516),(.020,.014,.019),'#ffffff',1,False)
            m.rod(p(side*.045,-.204,1.571),p(side*.146,-.193,1.574),.015,hair,part=False)
        m.ico(p(0,-.214,1.424),(.031,.036,.043),skin,1)
        m.rod(p(-.044,-.187,1.355),p(.035,-.192,1.355),.012,'red',part=False)
    if kind in ('elder','waterfall_hermit','lotus_crone'):
        m.ico(p(.02,.05,1.80),(.135,.12,.13),'cream',2);m.rod(p(-.19,-.01,1.79),p(.23,.02,1.83),.025,'jade' if kind=='elder' else 'wood')
    if kind in ('weaver_woman','firefly_girl','mirror_maiden','exiled_pyromancer','dom_avatar'):
        for side in (-1,1):
            m.path([p(side*.18,.08,1.61),p(side*(.23+.025*pulse),.10,1.28),p(side*(.25+.05*sway),.09,.99)],.065,'red' if kind=='exiled_pyromancer' and side>0 else hair,end=.025)
    if kind in ('temple_keeper','ferryman','waterfall_hermit','ash_forger','blind_bard'):
        m.path([p(0,-.18,1.36),p(.015,-.25,1.16),p(.04*pulse,-.27,.93)],.07,'cream',end=.01)

    if kind=='elder':
        for side in (-1,1): m.ring(p(side*.095,-.26,1.51),.083,.013,'gold',12)
        m.rod(p(-.04,-.26,1.51),p(.04,-.26,1.51),.012,'gold',part=False)
        m.path([p(-.28,.04,1.17),p(-.1,-.23,1.12),p(.24,-.23,.64+.04*pulse)],.075,'gold')
        m.path([(.48,0,.05),(.48,0,1.42),(.39,0,1.55),(.29,0,1.48)],.035,'leaf');lantern(m,(.39+.05*sway,-.12,1.12),'red',phase,.12)
    elif kind=='smith':
        m.ico(p(0,-.16,.90),(.24,.08,.30),'earth',1)
        for x in (-.13,.13):
            for z in (.78,.93,1.08): m.ico(p(x,-.245,z),(.025,.015,.025),'gold',1,False)
        m.rod(p(-.24,0,1.68),p(.22,0,1.68),.05,'red');m.path([p(.2,.06,1.68),p(.34,.09,1.69+.07*pulse),p(.47,.1,1.57+.09*sway)],.045,'red',end=.01)
        m.ring(p(.095,-.28,1.51),.095,.025,'gold',12);m.ico(p(.095,-.27,1.51),(.07,.025,.07),'cyan',1)
        m.ico(p(0,-.11,1.31),(.17,.12,.10),'wood',1)
        angle=.18*pulse;m.rod((.42,-.15,.75),(.63+angle,-.14,1.47),.04,'wood');m.ico((.63+angle,-.14,1.47),(.22,.14,.13),'stone',1)
        m.ico((-.56,-.05,.30),(.26,.22,.10),'stone',1);m.rod((-.56,-.05,.05),(-.56,-.05,.3),.12,'stone')
        lantern(m,(.7,.12,.22),'ember',phase)
        for i in range(4): m.ico((.68+math.sin(phase+i)*.1,.1,.46+(i*.12+frame*.07)%.45),(.02,.02,.045),'gold',1,False)
    elif kind=='temple_keeper':
        m.ico(p(0,0,1.76),(.24,.21,.12),'night',1);m.rod(p(-.48,0,1.76),p(.48,0,1.76),.04,'night')
        book(m,(-.25,-.40,.94),'wood',True);m.rod((.39,-.25,.91),(.55,-.18,1.35),.025,'wood')
        for i in range(6): m.path([(.55+(i-3)*.014,-.18-i*.032,1.35),(.53+(i-3)*.027+.06*pulse,-.21-i*.032,1.61),(.46+(i-3)*.027,-.24-i*.032,1.83)],.010,'cream')
        for side in (-1,1): m.rod(p(side*.22,-.16,1.17),p(0,-.22,.95),.02,'gold',part=False)
    elif kind=='weaver_woman':
        m.ico(p(0,.02,1.73),(.24,.2,.1),'purple',1);m.ico(p(0,-.17,1.0),(.14,.055,.20),'red',1)
        for x in (-.53,.53): m.rod((x,-.50,.05),(x,-.50,1.18),.045,'wood')
        for z in (.12,.98): m.rod((-.55,-.51,z),(.55,-.51,z),.045,'wood')
        for i in range(7): m.rod(((i-3)*.12,-.54,.16),((i-3)*.12,-.54,.96),.010,'gold',part=False)
        m.ico((.27*pulse,-.59,.70),(.21,.05,.06),'gold',1)
    elif kind=='lantern_boy':
        for x,z in ((-.13,1.72),(0,1.78),(.13,1.72)): m.ico(p(x,.0,z),(.075,.075,.09),'night',1)
        m.ring(p(0,-.06,1.21),.105,.018,'stone',12,tilt=.3)
        m.rod((-.34,-.06,.80),(-.49,-.05,1.58),.02,'wood')
        for i in range(4):
            a=phase+i*math.tau/4;m.rod((-.49,-.06,1.58),(-.49+math.cos(a)*.22,-.06,1.58+math.sin(a)*.22),.065,'red' if i%2 else 'gold',end=.025,sides=5)
        lantern(m,(.35,-.15,.65),'water',phase,.11);m.ico((.35,-.30,.66),(.025,.02,.04),'cyan',1,False)
    elif kind=='blind_bard':
        conical_hat(m,p(0,0,1.73));m.rod(p(-.25,-.22,1.51),p(.25,-.22,1.51),.035,'cream')
        m.path([p(.2,.09,1.5),p(.36,.1,1.4+.08*pulse),p(.49,.12,1.5+.08*sway)],.025,'cream')
        m.ico((-.13,-.31,.55),(.20,.10,.21),'wood',2);m.rod((-.1,-.32,.68),(.39,-.30,1.52),.045,'wood')
        for i in range(3): m.rod((-.16+i*.035,-.43,.43),(.35+i*.027,-.40,1.47),.008,'gold',part=False)
        m.ring((.39,-.30,1.52),.12+.05*frame,.012,'gold',16)
        m.ico((0,.0,.035),(.57,.30,.035),'earth',1)
    elif kind=='wandering_merchant':
        m.ico(p(0,.01,1.77),(.28,.21,.10),'purple',1);m.path([p(.17,0,1.81),p(.34,.05,1.95),p(.4,.06,1.87)],.035,'gold',end=.005)
        m.path([(-.85,.08,1.45),(-.4,.05,1.58),(0,.06,1.6),(.47,.06,1.56),(.85,.08,1.43)],.04,'wood')
        for side in (-1,1):
            m.rod((side*.8,.08,1.44),(side*(.8+.06*pulse),.05,.95),.015,'cream');lantern(m,(side*(.8+.06*pulse),.05,.75+.045*side*sway),'red' if side<0 else 'water',phase)
        for i in range(3): m.ico(p((i-1)*.13,-.20,.73),(.09,.08,.11),'gold',1)
    elif kind=='bamboo_hunter':
        m.path([p(.08,.17,1.62),p(.23,.25,1.52),p(.24,.3,1.32+.04*pulse)],.07,'cream',end=.025)
        for side in (-1,1):
            for i in range(4): m.path([p(side*(.21+i*.025),.08+i*.105,1.2-i*.035),p(side*(.34+i*.05),.09+i*.105,.92-i*.04)],.045,'leaf',end=.005)
        bow=[(-.58,-.22,1.62),(-.76,-.23,1.28),(-.74,-.24,.83),(-.55,-.24,.48)];m.path(bow,.035,'wood');m.path([bow[0],(-.40+.03*pulse,-.23,1.03),bow[-1]],.01,'cream')
        for i in range(6): m.rod(p(.22+i*.035,.15,.93),p(.25+i*.035,.15,1.66),.016,'wood');m.ico(p(.25+i*.035,.15,1.66),(.023,.018,.06),'cream',1)
        m.rod(p(-.19,-.18,1.44),p(-.12,-.2,1.39),.012,'red',part=False)
    elif kind=='bamboo_nun':
        m.ico(p(0,0,1.67),(.24,.22,.12),'wood',2);m.ico(p(0,-.208,1.62),(.018,.012,.018),'red',1,False)
        for i in range(18):
            a=i*math.tau/18+phase*.1;m.ico(p(math.cos(a)*.19,-.43,1.0+math.sin(a)*.19),(.022,.020,.023),'jade',1,False)
        m.ico((.55,.12,.28),(.17,.13,.3),'stone',1);m.path([(.45,.08,.5),(.72,.05,.55+.05*pulse),(.81,.04,.44+.05*sway)],.025,'cream')
    elif kind=='cursed_woodcutter':
        for i in range(5):
            a=i*math.tau/5;m.path([(math.cos(a)*.6,math.sin(a)*.40,.02),(math.cos(a)*.38,math.sin(a)*.34,.40),(math.cos(a)*.30,math.sin(a)*.25,.83)],.07,'stone' if i%2 else 'wood',end=.035)
        m.ico(p(-.21,.02,1.2),(.11,.18,.20),'leaf',1);m.rod((.48,-.10,.02),(.44,-.13,1.0),.035,'wood');m.ico((.49,-.13,.20),(.20,.07,.16),'stone',1);book(m,(-.36,-.32,.98+.02*sway))
    elif kind=='lotus_crone':
        conical_hat(m,p(0,0,1.72));m.ico((0,0,.16),(.63,.34,.17),'wood',2)
        m.path([(.65*math.cos(i*math.tau/20),.35*math.sin(i*math.tau/20),.32) for i in range(21)],.035,'gold')
        for i in range(9): m.rod((-.55+i*.13,-.18,.13),(-.51+i*.12,.21,.15),.02,'gold',part=False)
        m.rod((.6,-.06,.03),(.35,-.08,1.67),.03,'wood');m.ring((.35,-.08,1.67),.06,.014,'gold',10)
        flower(m,(-.38,-.38,.99+.04*pulse),'pink')
    elif kind=='scholar_ghost':
        m.ico(p(0,0,1.75),(.25,.18,.12),'night',1)
        for i in range(5): m.path([p((i-2)*.09,.04,.50),p((i-2)*.13+.04*pulse,.06,.27),p((i-2)*.08+.08*sway,.03,.03)],.07,'water',end=.004)
        book(m,(-.35,-.30,1.03),'jade');m.rod((.38,-.29,.89),(.47,-.31,1.4),.025,'jade');m.ico((.47,-.31,1.43),(.04,.04,.12),'cream',1)
        m.path([(.45,-.35,1.50),(.6,-.35,1.58+.04*pulse),(.72,-.35,1.48)],.012,'cyan',part=False)
    elif kind=='firefly_girl':
        for side in (-1,1): m.ico(p(side*.23,.02,1.35),(.075,.075,.085),'pink',1)
        flower(m,(0,-.37,1.00+.03*pulse),'pink')
        for i in range(4):
            a=phase+i*math.tau/4;m.ico((math.sin(a)*.62,-.1+math.cos(a)*.12,1.5+math.sin(a*2)*.24),(.035,.025,.045),'gold' if i%2 else 'cyan',1,False)
    elif kind=='ash_forger':
        m.ico(p(0,-.17,1),(.25,.08,.27),'stone',1);m.ico(p(0,.02,1.78),(.15,.15,.05),'skin',2)
        for i in range(4): m.ring(p(-.32,-.12,1.19-i*.17),.060,.010,'stone',10)
        for x in (.37,.47):m.rod((x,-.29,.91),(x-.03,-.31,.62),.025,'stone')
        m.ico((.4,-.33,.56),(.20,.11,.07),'ember',1);m.ico((.43,-.15,.2),(.29,.23,.2),'ash',1)
        for i in range(3):m.ico((.4+math.sin(phase+i)*.1,-.31,.68+(frame*.06+i*.1)%.3),(.025,.025,.07),'gold',1,False)
    elif kind=='ash_gravedigger':
        m.ico(p(0,0,1.75),(.26,.22,.13),'stone',1);m.ico(p(0,-.17,1.34),(.19,.09,.10),'ash',1)
        m.rod((.36,-.27,.15),(.35,-.27,1.25),.035,'wood');m.ico((.36,-.27,.13),(.16,.06,.18),'stone',1)
        m.ico((-.55,.1,.3),(.18,.13,.31),'stone',1);m.rod((-.65,-.05,.38),(-.45,-.05,.54),.02,'purple');lantern(m,(-.34,.15,1.1),'purple',phase,.11)
    elif kind=='exiled_pyromancer':
        for side in (-1,1):m.path([p(side*.14,0,1.74),p(side*.31,.03,1.95),p(side*.26,-.01,2.05)],.06,'red',end=.01)
        m.rod((.46,0,.02),(.46,0,1.77),.035,'gold');m.ico((.46,0,1.84),(.13,.10,.17),'red',1)
        m.ico((-.44,-.18,1.35+.06*pulse),(.13+.02*sway,.10,.18),'ember',1);m.ico((-.44,-.28,1.36+.06*pulse),(.06,.03,.11),'gold',1,False)
    elif kind=='waterfall_hermit':
        m.ico((0,.05,.03),(.53,.29,.11),'leaf',1)
        m.path([(.34,-.11,.8),(.64,-.08,1.5),(.85,-.06,1.67),(1.04,-.06,1.58)],.023,'wood')
        m.rod((1.04,-.06,1.58),(.96+.03*pulse,-.09,.24),.009,'cream',part=False);m.rod((.96+.03*pulse,-.09,.24),(.96+.03*pulse,-.09,.13),.012,'gold')
        m.ring((0,-.205,.98),.12,.015,'cream',12)
    elif kind=='windmill_keeper':
        m.ico(p(0,0,1.74),(.25,.22,.12),'earth',1)
        for side in (-1,1): m.ring(p(side*.10,-.17,1.74),.085,.02,'gold',12)
        m.path([p(-.15,.1,1.24),p(-.36,.15,1.11+.04*pulse),p(-.62,.18,1.23+.06*sway)],.06,'gold',end=.02)
        m.rod((.4,-.12,.83),(.6,-.1,1.58),.045,'gold');m.ring((.6,-.1,1.65),.12,.04,'gold',12)
        for i in range(4):
            a=phase+i*math.tau/4;m.rod((-.48,-.12,1.16),(-.48+math.cos(a)*.20,-.12,1.16+math.sin(a)*.20),.045,'gold',end=.015)
    elif kind=='automaton_07':
        m.ico(p(0,0,1.49),(.25,.21,.23),'gold',1);m.ring(p(0,-.23,1.50),.15,.035,'wood',12);m.ico(p(0,-.25,1.50),(.12,.04,.12),'cyan',2,False)
        a=phase;m.rod(p(math.cos(a)*.11,-.29,1.5+math.sin(a)*.11),p(math.cos(a+.8)*.11,-.29,1.5+math.sin(a+.8)*.11),.017,'cream',part=False)
        m.ico(p(0,-.19,1.0),(.16,.06,.20),'gold',1);m.ico(p(0,-.25,1.0),(.085,.03,.13),'cyan',1)
        for side in (-1,1):
            m.ico(p(side*.29,0,1.14),(.15,.18,.14),'gold',2);m.rod(p(side*.28,.17,.96),p(side*.3,.19,1.37),.045,'stone')
        for i in range(3):m.rod(p(.39+(i-1)*.06,-.20,1),p(.47+(i-1)*.05,-.27,.87+.03*pulse),.025,'gold')
        m.prism([(-.65,.82),(-.29,.82),(-.29,1.2),(-.65,1.2)],'cyan',-.33,.03)
        for i in range(3):m.rod((-.59,-.38,.9+i*.09),(-.34,-.38,.9+i*.09),.012,'water',part=False)
    elif kind=='ferryman':
        conical_hat(m,p(0,0,1.74))
        for side in (-1,1):
            for i in range(5):m.rod(p(side*(.2+i*.025),.07+i*.12,1.17-i*.03),p(side*(.38+i*.025),.10+i*.12,.45+i*.06),.045,'leaf',end=.008)
        m.rod((.43,-.14,.9),(.65,-.13,.06),.03,'wood');m.ico((.66,-.13,.10),(.12,.05,.25),'wood',1)
        m.ico((.70,-.13,.02),(.025,.02,.04),'water',1,False)
    elif kind=='mirror_maiden':
        flower(m,p(.2,0,1.73),'purple');m.ring((0,-.40,1.10+.02*pulse),.23,.035,'gold',16);m.ico((0,-.41,1.1+.02*pulse),(.20,.035,.21),'water',2)
        m.rod((-.1,-.46,1.1),(.08,-.46,1.22),.02,'cream',part=False)
    elif kind=='bell_keeper':
        m.ico(p(0,0,1.75),(.25,.2,.13),'water',1)
        for z in (.83,.98,1.13):m.ico(p(0,-.21,z),(.025,.02,.025),'gold',1,False)
        lantern(m,(-.42,-.21,.88),'gold',phase,.18);m.rod((.38,-.20,.91),(.16+.08*pulse,-.27,1.20),.04,'wood')
    elif kind=='sun_child':
        for side in (-1,1):m.ico(p(side*.19,.01,1.74),(.10,.09,.11),'night',1);m.ring(p(side*.19,.0,1.74),.09,.018,'red',12)
        m.ico(p(0,-.37,1),(.18,.13,.19),'gold',2)
        for i in range(8):
            a=i*math.tau/8+phase*.15;m.rod(p(math.cos(a)*.17,-.38,1+math.sin(a)*.17),p(math.cos(a)*.26,-.38,1+math.sin(a)*.26),.02,'gold',part=False)
    elif kind=='bronze_pilot':
        m.ico(p(0,0,1.74),(.25,.21,.12),'gold',1)
        for side in (-1,1):m.ring(p(side*.10,-.23,1.52),.085,.025,'wood',12);m.ico(p(side*.10,-.24,1.52),(.06,.02,.06),'cyan',1)
        m.path([p(-.1,.15,1.23),p(-.37,.18,1.19+.08*pulse),p(-.55,.2,1.31+.1*sway)],.06,'gold',end=.02)
        m.ring((.43,-.23,1.03),.22,.02,'gold',18)
        for i in range(6):
            a=phase+i*math.tau/6;m.rod((.43,-.24,1.03),(.43+math.cos(a)*.21,-.24,1.03+math.sin(a)*.21),.015,'gold',part=False)
    elif kind=='dom_avatar':
        for side in (-1,1):m.rod(p(side*.15,0,1.66),p(side*.25,.01,1.98),.09,'orange',end=.005,sides=5);m.rod(p(side*.15,-.02,1.71),p(side*.24,-.02,1.92),.035,'cream',end=.002,sides=5)
        for i in range(3):
            a=(i-1)*.65;m.path([p(0,.18,.58),p(math.sin(a)*.70,.27,.55),p(math.sin(a)*.90+.08*pulse,.28,1.04+.07*sway)],.13,'orange',end=.065);m.ico(p(math.sin(a)*.90+.08*pulse,.28,1.04+.07*sway),(.08,.09,.13),'cream',1)
        m.ico((0,-.34,1.04+.03*pulse),(.12,.07,.15),'gold',1);m.ico(p(0,-.21,1.65),(.025,.015,.04),'red',1,False)
        for side in (-1,1):m.path([hands[side],(side*.60,-.28,.65+.1*pulse),(side*.79,-.24,1.4)],.01,'gold',part=False)
    return m


def flower(m,p,color):
    x,y,z=p
    for i in range(6):
        a=i*math.tau/6;m.ico((x+math.cos(a)*.10,y+math.sin(a)*.06,z),(.09,.055,.13),color,1)
    m.ico((x,y-.15,z+.03),(.055,.035,.065),'gold',1)


def run():
    atlas=Atlas('npcs-v091',768)
    for index,(kind,*_) in enumerate(NPCS):
        for f,cell in enumerate(atlas.cells(kind+'/idle',64,64,6,fps=6)):
            atlas.add(cell,npc(kind,index,f),kind)
    image,meta=atlas.bake(HERE,'DTNpcPixelAtlas',target_h=54,detached_parts='Intentional garment layers, eye sclera/iris/catchlight, lantern sparks, light threads, fireflies and spectral smoke; each baked frame is an independent atlas object.')
    preview(image,meta,[n[0]+'/idle' for n in NPCS],HERE/'npc-contact.png',5)
    print('@@JSON@@'+json.dumps({'npcs':len(NPCS),'frames':sum(c['frames'] for c in meta['clips'].values()),'cell':[64,64],'fps':6,'pipeline':'pixel_pipeline.Mesh+Atlas'}))


if __name__=='__main__': run()
