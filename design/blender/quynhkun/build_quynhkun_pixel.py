"""Quynh Kun: four-view posed meshes and cinnabar spell flipbooks."""
import json, math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pixel_pipeline import Atlas, Mesh, ROOT, PALETTES, PITCH, UP, preview
from mathutils import Matrix, Vector
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
VIEWS = {'S': 0.0, 'E': math.pi/3, 'N': math.pi, 'W': -math.pi/3}
ACTIONS = {'idle': 4, 'run': 6, 'dash': 4, 'attack': 5, 'q_cast': 6, 'e_cast': 6, 'r_ult': 6, 'hit': 2}
PALETTES.update(
    qkhair=['#0c0914', '#181326', '#2a223d', '#493c66'],
    qkskin=['#79516a', '#ebb89b', '#ffe0cc', '#fff0e5'],
    qkaodai=['#111c2b', '#1c324a', '#2c5270', '#4f82a6'],
    qkred=['#4a121b', '#8c1d2c', '#d9384a', '#ff7a70'],
    qkgold=['#5e3e1c', '#a67129', '#e6b347', '#fff099'],
    qkwood=['#2b190e', '#54341e', '#875836', '#c28d5b'],
    qkpants=['#473c38', '#857468', '#cfc0b0', '#f7efe4'],
    qkglass=['#09080d', '#161824', '#2e384d', '#6c809e'])

def paper(m, x, y, z, size=.18, angle=0):
    start=len(m.verts)
    m.prism([(x-size*.6,z-size),(x+size*.52,z-size*.93),(x+size*.6,z+size),(x-size*.52,z+size)],'qkgold',y,.035)
    m.path([(x-size*.3,y-.018,z+size*.55),(x+size*.3,y-.018,z+size*.55),(x,y-.018,z+size*.2),(x+size*.22,y-.018,z),(x-size*.25,y-.018,z-size*.3),(x+size*.22,y-.018,z-size*.5)],max(.012,size*.09),'qkred',part=False)
    center=Vector((x,y,z));rotation=Matrix.Rotation(angle,3,'Y')
    m.verts[start:]=[tuple(center+rotation@(Vector(v)-center)) for v in m.verts[start:]]

def hero(action, frame, count, view):
    m=Mesh();phase=frame/count*math.tau
    stride=math.sin(phase) if action in ('run','dash') else 0
    drive=([-0.18,-.6,1,.65,.18,0][min(frame,5)] if action in ('attack','q_cast','e_cast') else 0)
    bob=.035*math.sin(phase)+abs(stride)*.04
    def p(x,y,z): return (x,y,z+bob)
    for side in (-1,1):
        m.rod(p(side*.17,0,.76),p(side*.19,-stride*side*.17,.18),.13,'qkpants')
        m.ico(p(side*.19,-.07-stride*side*.17,.10),(.16,.23,.11),'qkhair',1)
        hem=side*(.32+.05*math.sin(phase+side))
        m.prism([(side*.035,.99+bob),(side*.28,1.1+bob),(hem+.07,.40+bob),(hem,.32+bob),(side*.035,.45+bob)],'qkaodai',-.13,.24)
        m.path([p(side*.035,-.155,.48),p(hem,-.155,.33),p(hem+.07,-.155,.40)],.026,'qkred',part=False)
        for j in range(2):
            x=side*(.12+j*.11)
            m.path([p(x-side*.045,-.18,.48+j*.045),p(x,-.18,.52+j*.045),p(x+side*.045,-.18,.49+j*.045)],.015,'qkgold',part=False)
    m.ico(p(0,0,1.08),(.31,.22,.37),'qkaodai',2)
    m.rod(p(0,0,1.33),p(0,0,1.47),.135,'qkred')
    m.rod(p(-.28,-.2,.94),p(.28,-.2,.94),.045,'qkred',part=False)
    hands=[]
    for side in (-1,1):
        reach=.64 if action=='r_ult' else .47+abs(drive)*.19
        elbow=p(side*.43,-.02,1.14+(.16 if action=='r_ult' else .1*drive))
        hand=p(side*reach,-.25-drive*side*.25,1.10+(.35 if action=='r_ult' else .12*drive))
        m.rod(p(side*.27,0,1.3),elbow,.13,'qkaodai');m.rod(elbow,hand,.11,'qkaodai')
        m.ico(hand,(.10,.09,.10),'qkskin',1);hands.append(hand)
        x,y,z=hand
        for j in range(8):
            a=j*math.tau/8
            m.ico((x+math.cos(a)*.105,y+.035,z+math.sin(a)*.105),(.035,.04,.035),'qkgold' if j%3==0 else 'qkwood',1,False)
        if side==-1:
            tip=(x-.20-drive*.12,y-.10,z-.27)
            m.rod(tip,(x+.16,y+.03,z+.28),.035,'qkwood')
            m.rod(tip,(tip[0]-.06,tip[1]-.02,tip[2]-.14),.07,'qkred',end=.006,sides=6)
            m.rod((x+.12,y+.02,z+.20),(x+.15,y+.03,z+.27),.045,'qkgold')
        else:
            for j in range(3): paper(m,x+(j-1)*.075,y-.05-j*.015,z+.15,.15,(j-1)*.3)
    m.ico(p(0,.015,1.78),(.29,.25,.31),'qkskin',2)
    m.ico(p(0,.12,1.96),(.33,.27,.23),'qkhair',2)
    m.ico(p(0,.23,1.76),(.29,.16,.28),'qkhair',2)
    for side in (-1,1):
        m.prism([(side*.015,2.14+bob),(side*.27,2.08+bob),(side*.29,1.9+bob),(side*.14,1.98+bob)],'qkhair',-.18,.08)
        m.ico(p(side*.29,.015,1.72),(.07,.08,.10),'qkskin',1)
        m.ico(p(side*.115,-.246,1.76),(.073,.028,.05),'#12091a',1,False)
        m.ico(p(side*.115,-.276,1.765),(.047,.016,.026),'#fff0e5',1,False)
        m.ico(p(side*.12,-.293,1.76),(.022,.01,.029),'qkred',1,False)
        m.rod(p(side*.06,-.26,1.84),p(side*.20,-.24,1.86),.017,'qkhair',part=False)
        # Braids flare outside both shoulders; red ties and brass cuffs separate each silhouette.
        sway=math.sin(phase+side)*(.06 if action=='idle' else .13)
        points=[p(side*.30,.01,1.91),p(side*.34,-.04,1.65),p(side*(.46+sway*.3),-.12,1.42),p(side*(.56+sway*.6),-.13,1.18),p(side*(.65+sway),-.14,.91)]
        m.path(points,.085,'qkhair')
        for j in range(1,9):
            u=j/2;i=min(3,int(u));t=u-i
            a,b=Vector(points[i]),Vector(points[i+1]);v=a.lerp(b,t);v.x+=side*(.024 if j%2 else -.024)
            m.ico(tuple(v),(.10,.085,.12),'qkhair',1)
        for index,color in [(1,'qkred'),(3,'qkgold'),(4,'qkred')]:
            x,y,z=points[index];m.rod((x,y,z-.035),(x,y,z+.035),.11,color,sides=8)
        x,y,z=points[-1]
        for sign in (-1,1):m.prism([(x,z),(x+sign*.15,z+.06),(x+sign*.13,z-.05)],'qkred',y-.09,.035)
        m.rod((x,y,z-.03),(x+side*.055,y,z-.22),.12,'qkhair',end=.04,sides=7)
    m.path([p(-.07,-.25,1.60),p(.025,-.27,1.59),p(.09,-.25,1.62)],.012,'#79516a',part=False)
    glasses=1.73 if action=='r_ult' else 1.98
    for side in (-1,1):
        m.ico(p(side*.14,-.26,glasses),(.125,.035,.105),'qkgold',2,False)
        m.ico(p(side*.14,-.295,glasses),(.095,.02,.08),'qkglass',2,False)
        m.ico(p(side*.14-.025,-.318,glasses+.03),(.022,.01,.016),'#fff0e5',1,False)
        m.rod(p(side*.24,-.25,glasses),p(side*.30,.08,glasses-.04),.016,'qkgold',part=False)
    m.rod(p(-.045,-.28,glasses),p(.045,-.28,glasses),.018,'qkgold',part=False)
    m.path([p(-.12,-.19,1.42),p(0,-.28,1.14),p(.12,-.19,1.42)],.025,'qkred',part=False)
    m.ico(p(0,-.28,1.14),(.135,.04,.14),'qkgold',2,False)
    m.prism([(-.038,1.10+bob),(.038,1.10+bob),(.038,1.18+bob),(-.038,1.18+bob)],'#12091a',-.326,.008,False)
    if action=='dash':m.verts=[(x,y-z*.12,z) for x,y,z in m.verts]
    if action=='hit':m.verts=[(x+z*.06*math.cos(phase),y,z*.96) for x,y,z in m.verts]
    rotation=Matrix.Rotation(VIEWS[view]+(drive*.13 if action=='q_cast' else 0),3,'Z')
    m.verts=[tuple(rotation@Vector(v)) for v in m.verts]
    return m

def ground_ring(m,r,z=.06,color='qkgold',phase=0):
    points=[(r*math.cos(phase+i*math.tau/48),r*math.sin(phase+i*math.tau/48),z) for i in range(49)]
    m.path(points,.025,color,part=False)

def bagua(m,r,phase,stakes=False):
    ground_ring(m,r);ground_ring(m,r*.78,color='qkred')
    for i in range(8):
        a=i*math.tau/8+phase
        for j in range(3):
            radius=r*(.48+j*.09)
            for lo,hi in ([(-.17,-.035),(.035,.17)] if (i>>j)&1 else [(-.17,.17)]):
                m.rod((math.cos(a)*radius-math.sin(a)*lo,math.sin(a)*radius+math.cos(a)*lo,.08),(math.cos(a)*radius-math.sin(a)*hi,math.sin(a)*radius+math.cos(a)*hi,.08),.025,'qkgold',part=False)
        if stakes:
            x,y=math.cos(a)*r,math.sin(a)*r
            m.rod((x,y,.02),(x,y,.52),.055,'qkwood');paper(m,x,y-.05,.39,.18,a)
    ground_ring(m,r*.29,color='qkgold')
    for sign in (-1,1):
        pts=[(math.sin(.06+i*(math.pi-.12)/16)*r*.14*sign,sign*r*.145+math.cos(.06+i*(math.pi-.12)/16)*r*.145,.09) for i in range(17)]
        m.path(pts,.027,'qkred',part=False)
        m.ico((0,sign*r*.145,.08),(.045,.045,.015),'qkred' if sign>0 else 'qkgold',1,False)

def effect(kind,f,n):
    m=Mesh();phase=f/n*math.tau
    if kind in ('talisman_bolt','grand_talisman'):
        size=.3 if kind=='talisman_bolt' else .65
        paper(m,0,0,.7,size,math.sin(phase)*.35)
        for i in range(6):
            a=phase+i*math.tau/6
            m.path([(math.cos(a)*size*.7,0,.7+math.sin(a)*size),(math.cos(a)*size*1.3,.04,.7+math.sin(a)*size*1.3)],.035,'qkred',end=.004)
    elif kind=='cinnabar_slash':
        r=.8+f*.055;points=[(math.cos(-1.4+i*.16)*r,.8+math.sin(-1.4+i*.16)*r) for i in range(19)]
        m.prism(points+[(x*.68,.8+(z-.8)*.68) for x,z in reversed(points)],'qkred',-.05,.12)
        m.path([(x,-.08,z) for x,z in points],.025,'qkgold',part=False)
        for i in range(5):m.ico((-.2-i*.13,.02,.5+math.sin(phase+i)*.3),(.055,.045,.08),'qkred',1)
    elif kind.startswith('curse_mark_'):
        count=int(kind[-1]);r=.55
        for i in range(count):
            a=phase*.27+i*math.tau/count;x,y=r*math.cos(a),r*math.sin(a)
            m.path([(x-.08,y,.16),(x+.08,y,.30),(x-.04,y,.46),(x+.10,y,.53)],.035,'qkred',part=False)
            m.rod((x-.1,y,.38),(x+.12,y,.38),.022,'qkgold',part=False)
    elif kind=='talisman_burst':
        r=.6+f*.19
        for i in range(10):
            a=i*math.tau/10+phase*.12;x,z=math.cos(a)*r,1.2+math.sin(a)*r
            paper(m,x,.08,z,.15,a)
            m.path([(x*.2,0,1.2+(z-1.2)*.2),(x*.65+.09,-.06,1.2+(z-1.2)*.55),(x,-.02,z)],.045,'qkred',end=.009)
    elif kind=='bagua_stake':
        bagua(m,1.35,phase*.12)
        m.rod((0,0,0),(0,0,1.15),.12,'qkwood',sides=8);paper(m,0,-.13,.73,.25)
        for i in range(8):
            a=i*math.tau/8+phase*.12;x,y=math.cos(a)*1.1,math.sin(a)*1.1
            paper(m,x,y,.35+.05*math.sin(phase+i),.20,a)
        ground_ring(m,1.1,.38,'qkred',phase*.12)
    elif kind=='heaven_seal_array':
        bagua(m,2.4,phase*.07,True);ground_ring(m,2.4,.45,'qkred')
    elif kind=='thunder_talisman_drop':
        z=2.5-f*.28;paper(m,0,0,z,.35,math.sin(phase)*.1)
        for side in (-1,1):m.path([(side*.25,0,3),(side*.13,-.04,2.4),(side*.4,0,1.8),(side*.1,0,1.1),(0,0,.1)],.045,'qkred',end=.015)
        ground_ring(m,.2+f*.08,.04,'qkgold')
    return m

def ward(layer,f,view):
    m=Mesh();phase=f/6*math.tau;rot=Matrix.Rotation(VIEWS[view],3,'Z')
    for i in range(8):
        a=phase+i*math.tau/8;v=rot@Vector((.82*math.cos(a),.59*math.sin(a),.85+.06*math.sin(phase+i)))
        if (v.y<0)!=(layer=='front'):continue
        paper(m,v.x,v.y,v.z,.16,math.sin(a)*.25)
        b=a+.45;end=rot@Vector((.82*math.cos(b),.59*math.sin(b),.85))
        m.rod(tuple(v),tuple(end),.015,'qkred',part=False)
    return m

def run():
    atlas=Atlas('quynhkun-pixel-v1')
    for view in VIEWS:
        for action,n in ACTIONS.items():
            for f,c in enumerate(atlas.cells(view+'/'+action,64,64,n,10,anchor=58)):atlas.add(c,hero(action,f,n,view),'quynhkun')
    heroimage,herometa=atlas.bake(HERE,'DTQuynhKunAtlas',target_h=43,detached_parts='Braids, eyes, eyewear, bead bracelets and floating talisman details are deliberate closed mesh layers for sprite baking.')
    transform=atlas.transforms['quynhkun']
    contact=Image.new('RGB',(1024,560),'#14332f');labels=ImageDraw.Draw(contact)
    for row,view in enumerate(VIEWS):
        for col,action in enumerate(ACTIONS):
            c=herometa['clips'][view+'/'+action]['cells'][min(2,ACTIONS[action]-1)]
            tile=heroimage.crop((c['x'],c['y'],c['x']+64,c['y']+64)).resize((128,128),Image.Resampling.NEAREST)
            contact.paste(tile,(col*128,row*140),tile);labels.text((col*128+6,row*140+128),view+'/'+action,fill='#fff099')
    contact.save(HERE/'quynhkun-actions-preview.png')
    atlas=Atlas('quynhkun-vfx-pixel',1024)
    kinds=[('talisman_bolt',48,48,6),('cinnabar_slash',64,64,6),('grand_talisman',80,80,6)]+[(f'curse_mark_{i}',48,48,4) for i in range(1,6)]+[('talisman_burst',96,96,6),('bagua_stake',96,96,6),('heaven_seal_array',160,112,6),('thunder_talisman_drop',64,96,6)]
    for key,w,h,n in kinds:
        for f,c in enumerate(atlas.cells(key,w,h,n,12)):atlas.add(c,effect(key,f,n),key)
    for view in VIEWS:
        for layer in ('back','front'):
            for f,c in enumerate(atlas.cells('ward_orbit_'+layer+'/'+view,64,64,6,12,anchor=58)):atlas.add(c,ward(layer,f,view),'quynhkun')
    vfx,vmeta=atlas.bake(HERE/'vfx','DTQuynhKunVFX',transforms={'quynhkun':transform},detached_parts='Emitted paper talismans, lightning strokes, trigrams and orbiting wards are intentionally disconnected spell meshes.')
    preview(vfx,vmeta,[k for k,_,_,_ in kinds],HERE/'quynhkun-vfx-preview.png',4)
    lineup=Image.new('RGB',(640,150),'#14332f');draw=ImageDraw.Draw(lineup);heights={}
    entries=[('Quynh Kun',heroimage,herometa,'S/idle'),('Quan Le',None,'quanle-pixel-v1','S/idle'),('HoaVi',None,'hoavi-pixel-v08','S/idle'),('Thien Vu',None,'thienvu-pixel-v08','base_S/idle'),('An',None,'actors-pixel-v1','an_S/idle'),('Linh',None,'actors-pixel-v1','linh_S/idle')]
    for i,(name,img,meta,key) in enumerate(entries):
        if img is None:
            meta=json.loads((ROOT/'assets'/f'{meta}.json').read_text(encoding='utf-8'));img=Image.open(ROOT/meta['image']).convert('RGBA')
        if 'actions' in meta:c={**meta['actions']['idle']['directions']['S'][0],'anchorX':meta['anchorX'],'anchorY':meta['anchorY']}
        elif 'forms' in meta:c={**meta['forms']['lightning']['actions']['idle']['directions']['S'][0],'anchorX':meta['anchorX'],'anchorY':meta['anchorY']}
        else:c=meta['clips'][key]['cells'][0]
        tile=img.crop((c['x'],c['y'],c['x']+c['w'],c['y']+c['h']));tile=tile.resize((c['w']*2,c['h']*2),Image.Resampling.NEAREST)
        lineup.paste(tile,(i*106+53-int(c['anchorX']*2),120-int(c['anchorY']*2)),tile);draw.text((i*106+8,132),name,fill='#fff099')
    for view in VIEWS:
        c=herometa['clips'][view+'/idle']['cells'][0];heights[view]=c['bbox'][3]-c['bbox'][1]
        assert (40 if view=='N' else 41)<=heights[view]<=44,(view,heights[view])
    lineup.save(HERE/'scale-verification.png')
    (HERE/'scale-verification.json').write_text(json.dumps({'pass':True,'texelHeights':heights,'unit':2,'anchorY':58,'mirrored':False,'heroTransform':transform},indent=2),encoding='utf-8')

if __name__=='__main__':run()
