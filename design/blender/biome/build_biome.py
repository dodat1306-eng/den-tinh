"""Bake tactical monsters as posed, faceted Blender meshes."""
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from pixel_pipeline import Atlas, Mesh, preview


def eyes(mesh, x, y, z, spread, color, size=.085):
    for side in (-1, 1):
        mesh.ico((x+side*spread, y, z), (size, size*.55, size*.78), color, 1, False)
        mesh.ico((x+side*spread-.017, y-size*.47, z+.016), (.022,.018,.022), '#fff2d6', 1, False)


def leaf(mesh, x, y, z, size, color):
    mesh.ico((x,y,z), (size,size*.7,.064), color, 2)
    mesh.rod((x-size*.7,y,z+.025),(x+size*.7,y,z+.04),.019,'jade',part=False)


def bamboo(mesh, x, y, z, tilt=.1):
    mesh.rod((x,y,z),(x+tilt,y-.03,z+.55),.09,'leaf',sides=7)
    for t in (.1,.45):
        mesh.rod((x+tilt*t,y,z+t),(x+tilt*t,y,z+t+.04),.101,'gold',sides=7)
    mesh.rod((x+tilt,y-.03,z+.52),(x+tilt+.09,y-.07,z+.68),.024,'wood')
    mesh.ico((x+tilt+.1,y-.07,z+.67),(.054,.045,.077),'ember',1,False)


def mantis(m, sway, step, strike, bob):
    m.ico((0,.19,.59+bob),(.34,.62,.31),'leaf',2)
    for i in range(3):
        m.ico((0,.15+i*.14,.67+bob),(.32-i*.046,.22,.29-i*.036),'jade' if i%2==0 else 'leaf',1)
    m.rod((0,0,.58+bob),(sway*.10,-.16,1.47+bob),.19,'leaf',end=.23)
    m.ico((0,-.25,1.62+bob),(.35,.25,.27),'jade',1)
    eyes(m,0,-.46,1.65+bob,.205,'red',.112)
    for s in (-1,1):
        m.path([(s*.14,-.28,1.78+bob),(s*.29,-.27,2.01+bob),(s*.38,-.34,2.10+bob)],.025,'gold',end=.009)
        for i in range(2):
            y=.04+i*.29
            m.path([(s*.19,y,.66+bob),(s*.51,y+step*.19*s,.40),(s*.56,y+.17-step*.25*s,.07)],.061,'leaf',end=.038)
        tip=s*(.89-.72*strike)
        m.path([(s*.13,-.17,1.29+bob),(s*.55,-.27,1.03+bob),(s*.59,-.52,1.27+bob)],.103,'jade')
        m.prism([(s*.49,1.21+bob),(tip,1.88+bob+s*strike*.14),(s*.20,1.57+bob),(s*.40,1.27+bob)],'gold',-.70,.13)
        m.prism([(s*.43,1.31+bob),(tip*.91,1.80+bob+s*strike*.14),(s*.25,1.58+bob)],'leaf',-.75,.047,False)


def bomber(m, sway, step, strike, bob):
    m.ico((0,0,.89+bob),(.43,.32,.47),'wood',2)
    m.ico((0,-.22,.92+bob),(.29,.16,.28),'earth',2)
    m.ico((0,-.04,1.42+bob),(.39,.31,.38),'wood',2)
    m.ico((0,-.30,1.36+bob),(.27,.14,.22),'skin',2)
    eyes(m,0,-.41,1.48+bob,.132,'gold',.073)
    m.rod((0,0,1.62+bob),(0,0,2.07+bob),.44,'orange',end=.01,sides=10)
    m.rod((0,0,1.56+bob),(0,0,1.67+bob),.49,'gold',end=.46,sides=10)
    m.rod((0,.27,.74+bob),(0,.27,1.25+bob),.29,'wood',end=.38,sides=10)
    for i in range(3): bamboo(m,(i-1)*.19,.32,1.04+bob+i*.06,(i-1)*.17)
    m.path([(.17,.20,.58),(.42,.51,.47),(.68,.64,.75+sway*.13),(.58,.59,1.04+sway*.13)],.072,'wood',end=.06)
    for s in (-1,1):
        m.ico((s*.37,-.02,1.43+bob),(.13,.08,.13),'orange',1)
        m.path([(s*.17,0,.74+bob),(s*.26,-step*s*.24,.35),(s*.26,-.1-step*s*.29,.13)],.12,'wood')
        m.ico((s*.25,-.18-step*s*.27,.095),(.17,.25,.09),'orange',1)
        hand=(s*.48,-.44-strike*.40,.86+bob+(strike*.56 if s>0 else 0))
        m.path([(s*.29,-.04,1.19+bob),(s*.51,-.16,1.02+bob),hand],.10,'wood')
        m.ico(hand,(.13,.12,.13),'skin',1)
    bamboo(m,.49,-.51-strike*.39,.75+bob+strike*.55,.18)


def lurker(m, sway, step, strike, bob, submerged):
    if submerged:
        m.ico((0,.06,.10),(.43,.25,.15),'water',1)
        eyes(m,0,-.14,.17,.16,'gold')
        leaf(m,.09,.10,.32+sway*.022,.49,'leaf')
        m.ico((.18,.14,.43+sway*.022),(.10,.11,.15),'pink',1)
        return
    m.ico((0,.05,.64+bob),(.47,.34,.42),'water',2)
    m.ico((0,-.13,1.11+bob),(.44,.30,.31),'jade',2)
    m.ico((0,-.35,1.04+bob),(.33,.10,.12),'water',1)
    eyes(m,0,-.38,1.21+bob,.23,'gold',.11)
    leaf(m,.05,.04,1.45+bob,.59,'leaf')
    m.rod((.15,.10,1.44+bob),(.21,.12,1.68+bob),.041,'leaf')
    m.ico((.22,.11,1.72+bob),(.115,.11,.17),'pink',2)
    for s in (-1,1):
        m.path([(s*.24,.05,.54+bob),(s*.45,.13,.25),(s*.38,-.25-step*s*.16,.09)],.14,'water')
        m.ico((s*.40,-.22-step*s*.15,.075),(.22,.24,.065),'jade',1)
        m.path([(s*.30,-.04,.78+bob),(s*.59,-.16,.78+bob+strike*.12),(s*.62,-.37-strike*.32,.67+bob+strike*.50)],.12,'water')
        for i in range(3):
            x=s*(.56+i*.09)
            m.rod((s*.56,-.37-strike*.32,.68+bob+strike*.50),(x,-.60-strike*.32,.51+bob+strike*.50+i*.11),.058,'jade',end=.008)


def toad(m, sway, step, strike, bob):
    m.ico((0,.12,.65+bob),(.71,.56,.57),'purple',2)
    m.ico((0,-.38,.54+bob),(.48+strike*.10,.25+strike*.13,.28+strike*.19),'pink',2)
    m.ico((0,-.30,.88+bob),(.57,.40,.32),'purple',2)
    m.ico((0,-.59,.77+bob),(.41,.14,.083+strike*.10),'night',1)
    for s in (-1,1):
        m.ico((s*.34,-.44,1.04+bob),(.23,.19,.19),'purple',2)
        m.ico((s*.38,-.60,1.07+bob),(.108,.048,.083),'pink',1,False)
        m.path([(s*.38,-.17,.62+bob),(s*.64,-.05,.36),(s*.58,-.38+s*step*.12,.12)],.172,'purple')
        m.ico((s*.59,-.46+s*step*.12,.09),(.23,.25,.09),'earth',1)
    m.path([(0,.46,.61+bob),(.02,.66,.34),(0,.60+step*.18,.09)],.18,'purple')
    m.ico((0,.73+step*.18,.08),(.21,.24,.09),'earth',1)
    for i in range(6):
        a=i*math.tau/6
        x,y=.45*math.cos(a),.2+.34*math.sin(a)
        m.rod((x,y,.96+bob),(x*1.19,y,1.29+bob+i%2*.07),.093,'pink',end=.012,sides=5)
        m.ico((x,y,1.05+bob),(.116,.09,.13),'pink',1)
    for i in range(6):
        a=i*math.tau/6+sway*.1
        m.ico((math.cos(a)*.125,.13+math.sin(a)*.12,1.33+bob),(.075,.066,.14),'pink',1)
    m.ico((0,.13,1.36+bob),(.085,.085,.10),'gold',1,False)


def shielder(m, sway, step, strike, bob):
    m.ico((0,0,.98+bob),(.46,.34,.50),'stone',1)
    m.ico((0,-.29,1.03+bob),(.228,.093,.25),'ember',2)
    m.ico((0,-.374,1.05+bob),(.11,.032,.12),'gold',1,False)
    m.ico((0,-.06,1.60+bob),(.34,.27,.27),'night',1)
    m.rod((-.24,-.29,1.60+bob),(.24,-.29,1.60+bob),.069,'stone',sides=6)
    eyes(m,0,-.349,1.60+bob,.14,'ember')
    for s in (-1,1):
        m.ico((s*.43,-.01,1.26+bob),(.24,.31,.23),'stone',1)
        m.path([(s*.21,0,.68+bob),(s*.23,step*s*.14,.35),(s*.26,step*s*.19,.12)],.15,'night')
        m.ico((s*.25,-.1+step*s*.19,.1),(.18,.27,.11),'stone',1)
    h=.87+bob-strike*.13
    plate=[(-.80,h+.48),(-.17,h+.37),(-.10,h-.30),(-.47,h-.56),(-.88,h-.34)]
    m.prism(plate,'stone',-.81,.15)
    m.prism([(-.76,h+.39),(-.24,h+.30),(-.19,h-.26),(-.49,h-.46),(-.81,h-.27)],'night',-.86,.06)
    for (x,z),(xx,zz) in zip(plate,plate[1:]+plate[:1]):
        m.rod((x,-.84,z),(xx,-.84,zz),.034,'ember',part=False)
    m.ico((-.47,-.89,h),(.17,.08,.21),'gold',1)
    m.path([(.39,0,1.22+bob),(.58,-.14,.97+bob),(.59,-.38,.86+bob+strike*.20)],.14,'stone')
    m.rod((.55,-.38,.69+bob+strike*.20),(.87,-.41,1.55+bob+strike*.38),.061,'wood')
    m.ico((.88,-.41,1.60+bob+strike*.38),(.22,.25,.26),'stone',1)
    for i in range(6):
        a=i*math.tau/6
        m.rod((.88,-.41,1.60+bob+strike*.38),(.88+math.cos(a)*.29,-.43,1.60+bob+strike*.38+math.sin(a)*.32),.064,'ember',end=.012,sides=5)


def bat(m, sway, step, strike, bob):
    z=1.32+bob+sway*.16
    m.ico((0,0,z),(.33,.27,.43),'red',2)
    m.ico((0,-.18,z+.26),(.29,.24,.28),'ember',1)
    eyes(m,0,-.39,z+.29,.135,'gold',.087)
    for s in (-1,1):
        m.rod((s*.14,-.08,z+.36),(s*.29,-.01,z+.72),.12,'red',end=.008,sides=5)
        lift=.39*sway+.24*strike
        points=[(s*.20,z+.09),(s*.63,z+.33+lift),(s*1.22,z+.23+lift),(s*1.02,z-.06+lift),(s*.93,z-.34+lift),(s*.73,z-.18+lift),(s*.56,z-.39+lift),(s*.36,z-.14)]
        m.prism(points,'ember',-.03,.105)
        for i in (2,4,6):
            m.rod((s*.55,-.066,z+.26+lift),(points[i][0],-.066,points[i][1]),.034,'gold',end=.012,part=False)
        for i in range(3):
            m.ico((s*(.72+i*.17),.06,z-.39+lift-i*.05),(.037,.038,.064),'orange',1,False)


def drone(m, sway, step, strike, bob):
    z=1.05+bob+sway*.16
    m.ico((0,.02,z),(.91,.49,.30),'gold',1)
    m.ico((0,-.15,z+.08),(.65,.40,.32),'water',1)
    m.ico((0,-.41,z+.13),(.32,.20,.34),'cyan',2)
    m.ico((0,-.57,z+.18),(.14,.043,.15),'#e1fff4',2,False)
    for s in (-1,1):
        m.rod((s*.63,.06,z),(s*1.02,.03,z-.10),.14,'stone',end=.05,sides=6)
        m.ico((s*.80,-.07,z-.08),(.17,.13,.14),'cyan',1)
    for band in range(3):
        a0=sway*.4+band*.18
        r=.39+band*.088+strike*.04
        for i in range(13):
            a=i*math.tau/16+a0
            b=a+math.tau/18
            m.rod((r*math.cos(a),-.18+math.sin(a)*.31,z+.12+r*math.sin(a)*(.49+band*.18)),(r*math.cos(b),-.18+math.sin(b)*.31,z+.12+r*math.sin(b)*(.49+band*.18)),.022,'cyan',part=False)


def turret(m, sway, step, strike, bob):
    for x in (-1,1):
        for y in (-1,1):
            m.path([(x*.25,y*.22,.50),(x*.57,y*.36,.25),(x*.68,y*.40,.10)],.116,'gold')
            m.ico((x*.67,y*.39,.08),(.17,.19,.10),'stone',1)
    m.rod((0,0,.12),(0,0,.57),.40,'gold',end=.34,sides=8)
    m.rod((0,0,.54),(0,0,1.22),.33,'water',end=.47,sides=6)
    m.rod((0,0,1.22),(0,0,1.51),.47,'water',end=.04,sides=6)
    direction=.40*sway*(.35+strike)
    m.rod((direction*.25,-.12,1.07),(direction,-.71+strike*.14,1.05),.20,'stone',end=.14,sides=6)
    m.rod((direction,-.59+strike*.14,1.05),(direction,-1.04+strike*.14,1.05),.17,'red' if strike>.1 else 'ice',end=.075,sides=6)
    m.ico((direction,-.99+strike*.14,1.06),(.089,.12,.10),'ember',1,False)
    eyes(m,0,-.28,1.29,.17,'cyan')
    m.ico((0,0,1.49+abs(sway)*.08),(.084,.084,.12),'cyan',1)


POSES = {'mantis_blade': mantis, 'bamboo_bomber': bomber, 'swamp_lurker': lurker,
         'mist_toad': toad, 'forge_shielder': shielder, 'ember_bat': bat,
         'shield_drone': drone, 'laser_turret': turret}


def phoenix(frame):
    m = Mesh()
    wave = math.sin(frame*math.tau/6)
    m.ico((0,0,1.02),(.32,.68,.33),'red',2)
    m.ico((0,-.46,1.36),(.25,.31,.25),'ember',2)
    m.rod((0,-.63,1.31),(0,-1.03,1.30),.12,'gold',end=.008,sides=6)
    eyes(m,0,-.665,1.44,.105,'gold',.065)
    for i in range(3):
        m.rod(((i-1)*.09,-.38,1.53),((i-1)*.15,-.18,1.94+i*.11),.069,'ember',end=.01,sides=5)
    for side in (-1,1):
        lift=wave*.36
        m.prism([(side*.21,.93),(side*.54,1.56+lift),(side*1.58,1.36+lift),
                 (side*1.17,.92+lift),(side*.73,.71+lift),(side*.44,.70)],'red',-.03,.27)
        for i in range(6):
            start=(side*(.36+i*.12),-.11+i*.064,1.37+lift)
            tip=(side*(.57+i*.235),.24+i*.10,.67+i*.15+lift)
            m.rod(start,tip,.117,'ember' if i%2 else 'orange',end=.011,sides=5)
    for i in range(5):
        s=(i-2)*.14
        m.path([(s,.38,.98),(s*2.1,.91,.73+wave*.11),(s*3.6,1.42,.39+wave*.16)],
               .10,'ember' if i%2 else 'gold',end=.022)
    return m


def main():
    atlas = Atlas('biome-monsters-v1', 1024)
    for species, model in POSES.items():
        actions = ('idle','walk','attack','submerged') if model is lurker else ('idle','walk','attack')
        for action in actions:
            for i, cell in enumerate(atlas.cells(f'{species}/{action}', 72, 72, 6, 9 if action != 'idle' else 6)):
                phase = i*math.tau/6
                sway = math.sin(phase)
                step = sway if action == 'walk' else 0
                strike = (0,.20,.49,1,.65,.12)[i] if action == 'attack' else 0
                bob = abs(step)*.10 + math.cos(phase)*.045 + strike*.16
                mesh = Mesh()
                if model is lurker:
                    model(mesh, sway,step,strike,bob,action=='submerged')
                else:
                    model(mesh,sway,step,strike,bob)
                atlas.add(cell,mesh,species)
    for i, cell in enumerate(atlas.cells('an-phoenix/attack', 96, 96, 6, 10)):
        atlas.add(cell,phoenix(i),'an-phoenix')
    image, meta = atlas.bake(HERE,'DTBiomeMonsterAtlas',detached_parts='Eyes, crystal highlights, cinders and field rings are intentional detached details.')
    preview(image,meta,[f'{name}/{action}' for name in POSES for action in ('idle','walk','attack')],HERE/'biome-preview.png',columns=6)


if __name__ == '__main__':
    main()
