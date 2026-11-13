"""Editable seven-loadout chibi source. Blender 5.2; no external assets."""
import bpy, bmesh, json, math
from pathlib import Path
from mathutils import Vector, Matrix

HERE = Path(__file__).resolve().parent
COMMON = '100b18 f6c9b2 dca088 b87664 4a5268 8c98b3 dce5f7 6e471b cf8d36 ffe07d ffffff'.split()
COLORS = {
    'lightning': '1b1f5c 3c47b8 7b8eff d6deff ffe58e'.split(),
    'wind': '114542 228b7d 5ce6cc e3fff8'.split(),
    'earth': '3d2314 7d4925 c9813a ffcf82'.split(),
    'fire': '4a1218 a32424 ff5938 ffd470'.split(),
    'ice': '103561 2176bd 68d2ff e8ffff'.split(),
    'nature': '1b3d1c 377d33 78d663 e4f7a6 f291c7'.split(),
    'light': '593e16 b88428 ffcf5c fffbe0'.split(),
}
CLIPS = {'idle': (4, 7), 'run': (6, 12), 'dash': (3, 16), 'attack': (4, 15),
         'q_cast': (5, 12), 'e_cast': (5, 12), 'r_ult': (6, 10), 'hit': (2, 12)}

def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = 'THIENVU_Pixel'
    scene.render.fps = 24
    mats = {}
    for h in dict.fromkeys(COMMON + sum(COLORS.values(), [])):
        def linear(v): return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
        rgb = (*[linear(int(h[i:i+2], 16) / 255) for i in (0, 2, 4)], 1)
        m = bpy.data.materials.new('PX_' + h)
        m.diffuse_color = rgb
        ns = m.node_tree.nodes
        ns.clear()
        out, em = ns.new('ShaderNodeOutputMaterial'), ns.new('ShaderNodeEmission')
        em.inputs['Color'].default_value = rgb
        m.node_tree.links.new(em.outputs[0], out.inputs['Surface'])
        mats[h] = m
    # Mesh weapons use a real four-band normal-driven toon material.
    for form,pal in COLORS.items():
        material=bpy.data.materials.new('TV_Toon_'+form);nodes=material.node_tree.nodes;nodes.clear()
        output=nodes.new('ShaderNodeOutputMaterial');emission=nodes.new('ShaderNodeEmission')
        geometry=nodes.new('ShaderNodeNewGeometry');dot=nodes.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT';dot.inputs[1].default_value=(.25,-.55,.8)
        ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.interpolation='CONSTANT'
        for item in list(ramp.color_ramp.elements)[1:]:ramp.color_ramp.elements.remove(item)
        for i,h in enumerate(pal[:4]):
            stop=ramp.color_ramp.elements[0] if i==0 else ramp.color_ramp.elements.new(i/4)
            stop.position=i/4;stop.color=(*[linear(int(h[j:j+2],16)/255) for j in (0,2,4)],1)
        links=material.node_tree.links;links.new(geometry.outputs['Normal'],dot.inputs[0]);links.new(dot.outputs['Value'],ramp.inputs['Fac']);links.new(ramp.outputs['Color'],emission.inputs['Color']);links.new(emission.outputs[0],output.inputs['Surface']);mats[form]=material
    data = bpy.data.armatures.new('THIENVU_Bones')
    rig = bpy.data.objects.new('THIENVU_Armature', data)
    scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(n, h, t, parent=None):
        b = data.edit_bones.new(n); b.head = h; b.tail = t
        if parent: b.parent = data.edit_bones[parent]
        return b
    bone('root', (0, 0, 0), (0, 0, .15)).use_deform = False
    bone('pelvis', (0, 0, .55), (0, 0, .75), 'root')
    bone('chest', (0, 0, .75), (0, 0, 1.15), 'pelvis')
    bone('head', (0, 0, 1.15), (0, 0, 2.05), 'chest')
    bone('orbit', (0, .1, 1.1), (0, .1, 1.3), 'root')
    for side, s in [('R', -1), ('L', 1)]:
        bone('arm.' + side, (s*.29, 0, 1.12), (s*.46, -.03, .85), 'chest')
        bone('hand.' + side, (s*.46, -.03, .85), (s*.48, -.08, .65), 'arm.' + side)
        bone('leg.' + side, (s*.16, 0, .56), (s*.18, -.01, .10), 'pelvis')
        bone('tail.' + side, (s*.18, .06, .82), (s*.30, .08, .22), 'pelvis')
    bpy.ops.object.mode_set(mode='OBJECT')
    rig.show_in_front = True
    base = bpy.data.collections.new('TV_Common'); scene.collection.children.link(base)
    groups = {}
    parts = {}
    current = base
    def prism(n, pts, y, depth, color, owner):
        count = len(pts)
        verts = [(x, y+d, z) for d in (0, depth) for x, z in pts]
        # Subpixel plate offsets prevent coincident caps on layered rigid armor.
        serial=sum(len(v) for v in parts.values())+1
        offset=Vector(tuple(math.sin(serial*f)*.004 for f in [1.3,2.1,3.7]))
        verts=[Vector(v)+offset for v in verts]
        faces = [tuple(reversed(range(count))), tuple(range(count, 2*count))]
        faces += [(i, (i+1)%count, (i+1)%count+count, i+count) for i in range(count)]
        me = bpy.data.meshes.new(n); me.from_pydata(verts, [], faces); me.materials.append(mats[color]); me.update()
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bmesh.ops.triangulate(bm, faces=list(bm.faces)); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(n, me); current.objects.link(ob)
        ob['intentional_floating']=owner=='orbit' or n.startswith('Peach_')
        vg = ob.vertex_groups.new(name=owner); vg.add(list(range(len(verts))), 1, 'REPLACE')
        ob.parent = rig
        mod = ob.modifiers.new('Skin', 'ARMATURE'); mod.object = rig
        parts.setdefault(current.name, []).append(ob)
        return ob
    def box(n, x, z, w, h, y, d, col, owner):
        return prism(n, [(x-w/2,z-h/2),(x+w/2,z-h/2),(x+w/2,z+h/2),(x-w/2,z+h/2)], y, d, col, owner)
    def gem(n, x, z, w, h, y, col, owner='orbit'):
        return prism(n, [(x-w/2,z),(x,z+h/2),(x+w/2,z),(x,z-h/2)], y, .10, col, owner)
    # Broad angular cheek planes, layered locks on front, sides AND rear.
    prism('Face', [(-.27,1.24),(-.37,1.46),(-.33,1.81),(-.17,1.94),(.22,1.93),(.36,1.74),(.33,1.42),(.12,1.24)], -.30,.52,'dca088','head')
    prism('Face_Light',[(-.27,1.46),(-.27,1.77),(-.12,1.87),(.20,1.85),(.28,1.64),(.19,1.34),(-.09,1.34)],-.312,.008,'f6c9b2','head')
    box('Neck',0,1.18,.20,.17,-.1,.20,'b87664','chest')
    for rear in [False, True]:
        y = .13 if rear else -.34
        prism('Hair_Layer', [(-.39,1.5),(-.46,1.74),(-.30,1.98),(-.13,2.05),(.17,2.05),(.40,1.89),(.43,1.59),(.29,1.65),(.27,1.85),(-.23,1.85),(-.27,1.59)], y,.15,'4a5268','head')
        locks = [(-.42,1.65,-.57,1.76,-.31,1.91),(-.35,1.88,-.46,2.06,-.12,2.00),(-.17,1.95,-.12,2.18,.08,2.00),(.06,1.97,.28,2.16,.30,1.92),(.28,1.88,.53,1.99,.42,1.69),(.32,1.66,.50,1.57,.30,1.52)]
        for j,v in enumerate(locks):
            pts = list(zip(v[::2], v[1::2])); prism('Silver_Lock',pts,y-.03,.16,'8c98b3','head')
            a,b,c=pts; prism('Lock_Light',[a,b,((b[0]+c[0])/2,(b[1]+c[1])/2)],y-.04,.006,'dce5f7','head')
    prism('Fringe',[(-.34,1.88),(-.17,2.02),(.28,1.98),(.37,1.81),(.11,1.61),(.16,1.83),(-.09,1.65),(-.03,1.85),(-.31,1.66)],-.391,.05,'8c98b3','head')
    prism('Fringe_Ridge',[(-.29,1.87),(-.14,1.97),(.24,1.94),(.04,1.84),(-.10,1.73),(-.07,1.86)],-.405,.006,'dce5f7','head')
    prism('Silver_Nape',[(-.30,1.28),(-.40,1.46),(-.37,1.73),(-.49,1.85),(-.28,1.86),(-.33,2.04),(-.10,2.00),(0,2.16),(.18,2.02),(.36,2.08),(.34,1.88),(.50,1.83),(.36,1.62),(.39,1.43),(.26,1.28),(.15,1.37),(0,1.28),(-.13,1.36)],.24,.10,'8c98b3','head')
    for x in [-.24,.02,.22]:
        prism('Nape_Ridge',[(x-.06,1.81),(x+.03,2.01),(x+.07,1.61),(x,1.43)],.347,.008,'dce5f7','head')
    # Locks extruded along X keep pointed silhouettes in exact E/W views.
    for s in [-1,1]:
        plane=-.47 if s==1 else .33
        ob=prism('Hair_Profile',[(-.32,1.48),(-.45,1.65),(-.30,1.75),(-.42,1.93),(-.20,1.92),(-.13,2.15),(.01,2.00),(.18,2.14),(.21,1.92),(.39,2.02),(.31,1.75),(.42,1.58),(.20,1.61),(.12,1.47)],plane,.14,'8c98b3','head')
        ob.data.transform(Matrix.Rotation(math.pi/2,4,'Z'))
        ob=prism('Profile_Highlight',[(-.23,1.84),(-.13,2.09),(-.03,1.87),(.09,1.80),(.16,2.08),(.22,1.84),(.12,1.62)],plane-.006 if s==1 else plane+.148,.005,'dce5f7','head')
        ob.data.transform(Matrix.Rotation(math.pi/2,4,'Z'))
    # Side wedges supply the hair profile when viewed E/W.
    for s in [-1,1]:
        ob=prism('Side_Lock',[(s*.25,1.78),(s*.53,1.69),(s*.35,1.56)],-.10,.38,'8c98b3','head')
        box('Leg',s*.17,.31,.18,.43,-.07,.22,'4a5268','leg.'+('L' if s==1 else 'R'))
        box('Boot',s*.18,.085,.24,.16,-.22,.34,'100b18','leg.'+('L' if s==1 else 'R'))
        box('Boot_Edge',s*.18,.15,.23,.035,-.232,.02,'cf8d36','leg.'+('L' if s==1 else 'R'))
    box('Undercoat',0,.87,.48,.52,-.13,.34,'4a5268','chest')
    for form, pal in COLORS.items():
        current=bpy.data.collections.new(form); scene.collection.children.link(current); groups[form]=current
        dark,mid,bright,pale=pal[:4]
        light_cloth = pale if form in ['wind','ice','light'] else mid
        prism('TV_'+form+'_Robe',[(-.27,.56),(-.30,.95),(-.24,1.15),(.24,1.15),(.30,.92),(.26,.56)],-.155,.38,mid,'chest')
        prism('TV_'+form+'_Collar',[(-.21,1.15),(0,.87),(.21,1.15),(.12,1.15),(0,1.02),(-.12,1.15)],-.18,.01,pale,'chest')
        for side,s in [('R',-1),('L',1)]:
            owner='tail.'+side
            tip=.07 if form=='fire' else .23 if form=='earth' else .10
            edge=.48 if form in ['wind','light'] else .38
            pts=[(s*.12,.80),(s*.29,.78),(s*edge,.20),(s*.30,tip),(s*.19,.31)]
            prism('TV_'+form+'_Tail_'+side,pts,.04,.15,light_cloth,owner)
            prism('TV_'+form+'_Hem_'+side,[(s*.28,.74),(s*(edge-.015),.21),(s*.31,tip+.04),(s*(edge-.065),.24)],.027,.008,'cf8d36',owner)
            box('Sleeve',s*.36,1.0,.22,.40,-.08,.27,dark,'arm.'+side)
            box('Hand',s*.48,.72,.15,.20,-.15,.19,'f6c9b2','hand.'+side)
            # Earth intentionally equips two oversized fists.
            if form=='earth':
                x=s*.49;z=.79;w=.35 if form!='earth' else .41;h=.38 if form!='earth' else .43
                shape=[(x-w/2,z-h*.32),(x-w*.4,z+h*.5),(x+w*.25,z+h*.5),(x+w*.5,z+h*.13),(x+w*.43,z-h*.46),(x-w*.22,z-h*.5)]
                prism('TV_'+form+'_Gauntlet_'+side,shape,-.26,.34,dark,'hand.'+side)
                prism('Gauntlet_Face',[(x-w*.35,z-h*.29),(x-w*.28,z+h*.30),(x+w*.18,z+h*.35),(x+w*.32,z-h*.27)],-.275,.008,mid,'hand.'+side)
                gem('Gauntlet_Core',x,z,.18,.22,-.29,bright,'hand.'+side)
                gem('Gauntlet_Core_White',x,z,.065,.09,-.305,'ffffff','hand.'+side)
                for offset in [-.11,.02,.13]:box('Knuckle',x+offset,z-.14,.07,.06,-.30,.04,'cf8d36','hand.'+side)
                if form=='earth':prism('Rock_Crack',[(x-.14,z+.08),(x-.03,z+.02),(x-.07,z-.05),(x+.12,z-.13),(x+.03,z-.05),(x+.08,z+.01)],-.309,.005,pale,'hand.'+side)
            if form=='lightning':
                prism('Thunder_Horn',[(s*.22,1.09),(s*.37,1.48),(s*.42,1.26),(s*.58,1.34),(s*.47,1.02)],-.16,.25,'cf8d36','arm.'+side)
                prism('Thunder_Inlay',[(s*.33,1.14),(s*.37,1.35),(s*.45,1.15)],-.174,.01,bright,'arm.'+side)
            elif form=='earth':
                prism('Boulder_Shoulder',[(s*.22,1.05),(s*.25,1.31),(s*.45,1.4),(s*.62,1.17),(s*.54,1.0)],-.14,.36,mid,'arm.'+side)
                gem('Shoulder_Seam',s*.40,1.20,.16,.13,-.155,pale,'arm.'+side)
            elif form=='fire':
                prism('Beast_Shoulder',[(s*.24,1.03),(s*.29,1.31),(s*.45,1.42),(s*.57,1.22),(s*.49,1.05)],-.17,.28,'cf8d36','arm.'+side)
                gem('Beast_Eye',s*.43,1.22,.10,.05,-.19,pale,'arm.'+side)
                prism('Flame_Tail',[(s*.20,.72),(s*.43,.56),(s*.33,.51),(s*.51,.23),(s*.35,.32),(s*.43,.09),(s*.20,.28)],.20,.08,bright,'tail.'+side)
            elif form=='ice':
                for j in range(3):gem('Ice_Shoulder',s*(.29+j*.08),1.18+j*.02,.16,.30+j*.07,-.16,bright,'arm.'+side)
                for j in range(3):box('Fur_Collar',s*(.12+j*.065),1.16-j*.025,.10,.14,-.20,.12,'ffffff','chest')
            elif form=='nature':
                for j in range(3):prism('Leaf_Shoulder',[(s*(.22+j*.07),1.09),(s*(.29+j*.08),1.33-j*.04),(s*(.43+j*.06),1.06-j*.03)],-.18-j*.01,.13,bright if j%2 else mid,'arm.'+side)
                for j in range(3):box('Vine_Wrap',s*.48,.66+j*.10,.26,.045,-.29,.28,bright,'hand.'+side)
                # Branch silhouette, with short antler forks.
                prism('Antler',[(s*.28,1.84),(s*.35,2.08),(s*.32,2.20),(s*.40,2.13),(s*.50,2.20),(s*.47,2.07),(s*.56,2.06),(s*.42,2.00),(s*.38,1.84)],.03,.12,'6e471b','head')
            elif form=='light':
                prism('Solar_Pauldron',[(s*.23,1.04),(s*.32,1.31),(s*.57,1.20),(s*.50,1.03)],-.14,.26,pale,'arm.'+side)
                gem('Solar_Inlay',s*.39,1.18,.16,.12,-.157,bright,'arm.'+side)
            else:
                prism('Wing_Shoulder',[(s*.24,1.06),(s*.29,1.24),(s*.48,1.18),(s*.44,1.0)],-.14,.25,pale,'arm.'+side)
        box('Belt',0,.76,.57,.10,-.21,.045,'6e471b','pelvis')
        gem('Buckle',0,.76,.19,.15,-.263,'ffe07d','pelvis')
        if form=='wind':
            for s in [-1,1]:
                prism('Long_Jade_Scarf',[(s*.18,1.20),(s*.42,1.28),(s*.72,1.19),(s*.94,1.35),(s*.82,1.08),(s*.51,1.10),(s*.33,1.14)],.18,.09,pale,'tail.'+('L' if s==1 else 'R'))
            prism('Jade_Wing_Pin',[(-.25,1.83),(-.65,2.02),(-.53,2.14),(-.39,2.00),(-.39,2.21),(-.26,2.06),(-.16,1.89)],-.36,.09,bright,'head')
        if form=='ice':
            for j in range(5):gem('Crystal_Crown',(j-2)*.14,2.0+(.14 if j==2 else .02),.16,.34 if j==2 else .22,-.19,bright,'head')
        if form=='fire':
            for s in [-1,1]:prism('Flame_Hair_Tip',[(s*.18,1.98),(s*.26,2.25),(s*.36,2.03),(s*.51,2.11),(s*.40,1.88)],-.12,.18,bright,'head')
        if form=='light':
            # Closed, faceted solar ring, then eight separately shaped rays.
            outer,inner=.56,.49
            for j in range(16):
                a=j*math.tau/16;b=(j+1)*math.tau/16
                prism('Solar_Halo',[(math.cos(a)*outer,1.32+math.sin(a)*outer),(math.cos(b)*outer,1.32+math.sin(b)*outer),(math.cos(b)*inner,1.32+math.sin(b)*inner),(math.cos(a)*inner,1.32+math.sin(a)*inner)],.34,.055,'ffe07d','orbit')
            for j in range(8):
                a=j*math.tau/8;x=math.cos(a)*.60;z=1.30+math.sin(a)*.60
                gem('Solar_Ray',x,z,.11,.20,.35,pale)
            for s in [-1,1]:prism('Light_Ribbon',[(s*.34,1.0),(s*.76,1.26),(s*.91,1.01),(s*.72,.67),(s*.56,.79),(s*.72,1.05)],.16,.06,pale,'tail.'+('L' if s==1 else 'R'))
        count={'lightning':4,'wind':4,'earth':5,'fire':4,'ice':5,'nature':5,'light':0}[form]
        for j in range(count):
            a=j*math.tau/count;x=math.cos(a)*.79;z=1.12+math.sin(a)*.61
            if form=='lightning':prism('Orbit_Zigzag',[(x-.10,z-.16),(x+.07,z+.03),(x-.01,z+.03),(x+.10,z+.20),(x-.12,z-.02),(x-.03,z-.02)],.12,.10,bright,'orbit')
            elif form=='wind':prism('Orbit_Crescent',[(x-.13,z-.12),(x-.17,z+.05),(x-.02,z+.17),(x+.16,z+.08),(x-.02,z+.10),(x-.09,z),(x-.03,z-.09)],.16,.06,bright,'orbit')
            elif form=='earth':prism('Orbit_Rock',[(x-.13,z-.07),(x-.10,z+.10),(x+.03,z+.16),(x+.14,z+.04),(x+.09,z-.11)],.12,.17,mid,'orbit')
            elif form=='fire':prism('Orbit_Fire',[(x-.12,z-.10),(x-.13,z+.02),(x-.04,z+.21),(x+.03,z+.06),(x+.10,z+.12),(x+.13,z-.10)],.12,.09,bright,'orbit')
            elif form=='ice':gem('Orbit_Crystal',x,z,.18,.34,.12,bright)
            else:prism('Orbit_Leaf',[(x-.13,z-.07),(x-.07,z+.11),(x+.16,z+.13),(x+.06,z-.03)],.12,.08,bright,'orbit')
        if form=='nature':
            for x,z in [(-.39,1.51),(.42,.56),(-.35,.29)]:
                for j in range(5):
                    a=j*math.tau/5;gem('Peach_Petal',x+math.cos(a)*.06,z+math.sin(a)*.06,.08,.08,-.32,'f291c7','chest')
                box('Peach_Core',x,z,.045,.045,-.334,.012,'ffe07d','chest')
        def weapon(name,pts,y=-.39,depth=.10,color=None,owner='hand.R'):
            ob=prism(name,pts,y,depth,color or form,owner);ob.name=name;ob['weapon']=True;return ob
        if form=='lightning':
            weapon('Weapon_LightningSword',[(-.57,.67),(-.46,.67),(-.41,1.02),(-.31,1.07),(-.42,1.12),(-.31,1.24),(-.39,1.29),(-.34,1.53),(-.53,1.34),(-.48,1.22),(-.59,1.15),(-.51,1.05)])
            weapon('Weapon_LightningSword_Core',[(-.51,.84),(-.46,1.15),(-.43,1.14),(-.43,1.37),(-.49,1.19),(-.52,1.20)],y=-.405,depth=.01,color='ffe07d')
        elif form=='wind':
            weapon('Weapon_WindFan',[(-.53,.63),(-.88,.94),(-.79,1.20),(-.57,1.30),(-.31,1.20),(-.21,.95)],depth=.28)
            for j in range(5):
                a=math.pi*(.12+j*.19);x=-.54+math.cos(a)*.29;z=.92+math.sin(a)*.31
                weapon('Weapon_WindFan_Rib_'+str(j),[(-.54,.70+j*.01),(x-.018,z),(x+.018,z),(-.51,.70+j*.01)],y=-.43-j*.025,depth=.21,color='e3fff8')
        elif form=='earth':
            for side in ['R','L']:
                x=-.49 if side=='R' else .49
                weapon('Weapon_EarthGauntlets_'+side,[(x-.20,.63),(x-.23,.95),(x-.09,1.05),(x+.18,.99),(x+.22,.68),(x+.06,.56)],y=-.34,depth=.11,owner='hand.'+side)
        elif form=='ice':
            weapon('Weapon_IceHammer_Handle',[(-.55,.52),(-.49,.52),(-.49,1.23),(-.55,1.23)],color='dce5f7')
            weapon('Weapon_IceHammer',[(-.88,1.08),(-.80,1.37),(-.26,1.37),(-.17,1.09),(-.31,.99),(-.78,.99)],y=-.42,depth=.25)
            weapon('Weapon_IceHammer_Core',[(-.75,1.13),(-.68,1.28),(-.38,1.28),(-.31,1.13)],y=-.436,depth=.01,color='e8ffff')
        elif form=='fire':
            for side,sign in [('R',-1),('L',1)]:
                x=sign*.52
                for j in range(12):
                    a=j*math.tau/12;b=(j+1)*math.tau/12
                    outer=.28 if j%2==0 else .23;weapon('Weapon_FireChakrams_'+side+'_'+str(j),[(x+math.cos(a)*.14,.86+math.sin(a)*.14),(x+math.cos(a)*outer,.86+math.sin(a)*outer),(x+math.cos(b)*.23,.86+math.sin(b)*.23),(x+math.cos(b)*.14,.86+math.sin(b)*.14)],owner='hand.'+side)
        elif form=='nature':
            points=[(-.48,.72),(-.76,.64),(-.91,.87),(-.83,1.08),(-.70,1.16),(-.61,1.06)]
            for j,(x,z) in enumerate(points[:-1]):
                u,v=points[j+1];weapon('Weapon_WoodWhip_'+str(j),[(x-.035,z),(u-.035,v),(u+.035,v),(x+.035,z)])
                weapon('Weapon_WoodWhip_Thorn_'+str(j),[(x-.025,z), (x-.12,z+.11),(x+.025,z+.035)],y=-.405,color='78d663')
        elif form=='light':
            for j in range(8):
                a=j*math.tau/8;x=math.cos(a)*.59;z=1.3+math.sin(a)*.59
                weapon('Back_LightHalo_'+str(j),[(x-.035,z-.09),(x,z+.17),(x+.035,z-.09)],y=.42,owner='orbit',color='fffbe0')['intentional_floating']=True
            for sign in [-1,1]:weapon('Head_GlowingEyes_'+str(sign),[(sign*.15-.035,1.51),(sign*.15+.035,1.51),(sign*.15+.035,1.56),(sign*.15-.035,1.56)],y=-.376,depth=.008,color='ffffff',owner='head')['intentional_floating']=True
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE.parents[2]/'runtime/thienvu-unjoined.blend'))
    # Join each loadout independently: easy visibility switches, simple rigid skin.
    for name,obs in parts.items():
        ornaments=[o for o in obs if o['intentional_floating']]
        for i,ob in enumerate(ornaments):ob.name='TV_'+name+'_Ornament_'+str(i)
        obs=[o for o in obs if not o['intentional_floating'] and not o.get('weapon')]
        bpy.ops.object.select_all(action='DESELECT')
        for ob in obs:ob.select_set(True)
        bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join()
        bpy.context.object.name='TV_'+name+'_Mesh'
    camdata=bpy.data.cameras.new('TV_ORTHO');cam=bpy.data.objects.new('TV_ORTHO',camdata);scene.collection.objects.link(cam);scene.camera=cam
    cam.location=(0,-8,4.0);target=Vector((0,0,1.0));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=2.95
    scene.render.resolution_x=scene.render.resolution_y=64;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.filter_size=.01
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update();p=world_to_camera_view(scene,cam,Vector((0,0,0)));camdata.shift_y+=p.y-(1-57/64)
    animate(scene,rig)
    for f,c in groups.items():c.hide_render=f!='lightning';c.hide_viewport=f!='lightning'
    scene['pixel_cell']=64;scene['pixel_anchor']=[32,58];scene['head_to_height']=2.1
    bpy.context.view_layer.update()
    report={'blender':bpy.app.version_string,'buildHash':bpy.app.build_hash.decode(),'rig':rig.name,'bones':len(data.bones),'clips':{k:{'frames':n,'fps':fps,'loop':k in ['idle','run']} for k,(n,fps) in CLIPS.items()},'common':['#'+h for h in COMMON],'forms':{f:{'palette':['#'+h for h in COMMON+p],'collection':f} for f,p in COLORS.items()},'meshes':{o.name:{'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'dimensions':list(o.dimensions),'materials':len(o.data.materials)} for o in bpy.data.objects if o.type=='MESH'}}
    (HERE/'rig-pixel-v08.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'thienvu-pixel-v08.blend'))
    print(json.dumps(report),flush=True)

def animate(scene,rig):
    rig.animation_data_create()
    for name,(count,fps) in CLIPS.items():
        act=bpy.data.actions.new(name);act.use_fake_user=True;act['frames']=count;act['fps']=fps
        rig.animation_data.action=act
        for f in range(count+int(name in ['idle','run'])):
            t=(f%count)/count;wave=math.sin(t*math.tau)
            for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
            def rot(n,x=0,y=0,z=0):rig.pose.bones[n].rotation_euler=(x,y,z)
            def move(n,x=0,y=0,z=0):rig.pose.bones[n].location=rig.data.bones[n].matrix_local.to_3x3().inverted()@Vector((x,y,z))
            move('pelvis',z=-.025*(1-wave));move('hand.R',y=-.12,z=.06);rot('arm.R',x=-.20);rot('leg.L',x=.12);rot('leg.R',x=-.10)
            move('orbit',z=.045*wave);rot('orbit',y=.035*wave)
            for side,s in [('R',-1),('L',1)]:
                rot('tail.'+side,x=.12*math.sin(t*math.tau-s*.6),z=s*.08*wave)
                move('leg.'+side,z=.025*(1-wave))
            if name=='run':
                rot('chest',x=.23);move('pelvis',z=-.07*abs(wave))
                for side,s in [('R',-1),('L',1)]:rot('leg.'+side,x=s*.75*wave);rot('arm.'+side,x=-s*.62*wave);rot('tail.'+side,x=.40+.2*wave)
            elif name=='dash':
                rot('chest',x=math.radians([25,35,35][f]));move('pelvis',y=-.10*f,z=-.10)
                rot('arm.R',x=[-.15,-1.05,-.5][f]);rot('arm.L',x=.8);move('hand.R',z=[0,.50,-.10][f])
                for side in ['R','L']:rot('tail.'+side,x=.9);rot('leg.'+side,x=.65 if side=='R' else -.65);move('leg.'+side,z=.10)
            elif name in ['attack','q_cast']:
                v=([-.35,1,.35,0] if name=='attack' else [-.25,-.45,1,.45,0])[f]
                rot('chest',z=-.25*v,x=.12*max(v,0));rot('arm.R',x=-.35-1.1*max(v,0),z=-.35*v)
                move('hand.R',x=-.12*v,y=-.18*max(v,0),z=.12*v)
                rot('arm.L',x=.4*v);move('pelvis',z=-.13 if name=='q_cast' else -.04)
                for side in ['R','L']:move('leg.'+side,z=.13 if name=='q_cast' else .04)
            elif name=='e_cast':
                lift=[0,.4,.75,-.30,0][f];rot('arm.R',x=-.4-lift*1.7,z=-.2)
                move('hand.R',z=lift*.42,y=-.18);rot('chest',x=.44 if f==3 else -.12*max(lift,0));move('pelvis',z=-.16 if f==3 else 0)
                for side in ['R','L']:move('leg.'+side,z=.16 if f==3 else 0)
            elif name=='r_ult':
                spread=[.05,.22,.65,1,.80,.30][f]
                move('pelvis',z=.26*spread);move('orbit',z=.12*spread);rot('orbit',y=.10*spread)
                for side,s in [('R',-1),('L',1)]:rot('arm.'+side,z=-s*1.0*spread,x=-.4);move('hand.'+side,x=s*.08*spread);rot('tail.'+side,z=s*.33*spread)
            elif name=='hit':rot('chest',x=-.35*(1-f*.7));move('pelvis',y=.17*(1-f*.7))
            for b in rig.pose.bones:
                b.keyframe_insert('location',frame=f+1,group=b.name);b.keyframe_insert('rotation_euler',frame=f+1,group=b.name)
        for layer in act.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for curve in bag.fcurves:
                        for key in curve.keyframe_points:key.interpolation='CONSTANT'
    rig.animation_data.action=bpy.data.actions['idle'];scene.frame_set(1)

if __name__=='__main__':build()
