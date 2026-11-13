"""Build HoaVi's editable chibi rig and stepped, unlit pixel-render source."""
import bpy, bmesh, json, math, sys, shutil
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).resolve().parent
PALETTE = ['12091a','071824','f6c9b2','dca088','b87664','1b1026','2e1c44','523478','261338','482466','733d9c','a566cc','9c897e','d6c3b4','f2e5d8','8c5622','cf8d36','f7cb63','f291c7','0b2b3d','126b82','1fc8db','66fff7','eeffff','ff3b6b']
# The prompt calls this 24 colors; its explicit list contains 25. Hex values win.
CLIPS = {'idle':(6,8,True),'run':(8,14,True),'dash':(4,21,False),'attack':(5,18,False),'q_debug':(6,10,False),'e_cast':(6,12,False),'e_blink':(6,12,False),'r_overclock':(8,12,False),'hit':(3,17,False)}

def rgb(h):
    def lin(v): return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
    return (*[lin(int(h[i:i+2],16)/255) for i in (0,2,4)],1)

def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene; scene.name='HOAVI_Pixel'
    mats={}
    for h in PALETTE:
        m=bpy.data.materials.new('PX_'+h);m.diffuse_color=rgb(h)
        ns=m.node_tree.nodes;ns.clear();out=ns.new('ShaderNodeOutputMaterial');em=ns.new('ShaderNodeEmission');em.inputs['Color'].default_value=rgb(h);em.inputs['Strength'].default_value=1
        m.node_tree.links.new(em.outputs[0],out.inputs['Surface']);mats[h]=m
    data=bpy.data.armatures.new('HOAVI_PixelBones');rig=bpy.data.objects.new('HOAVI_Armature',data);scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    def bone(n,h,t,parent=None,deform=True):
        b=data.edit_bones.new(n);b.head=h;b.tail=t;b.use_deform=deform
        if parent:b.parent=data.edit_bones[parent]
        return b
    bone('root',(0,0,0),(0,0,.15),deform=False)
    bone('pelvis',(0,0,.55),(0,0,.75),'root');bone('spine',(0,0,.75),(0,0,1.02),'pelvis');bone('chest',(0,0,1.02),(0,0,1.15),'spine')
    bone('neck',(0,0,1.15),(0,0,1.25),'chest');bone('head',(0,0,1.25),(0,0,1.92),'neck')
    bone('hair_front',(0,-.22,1.84),(0,-.25,1.46),'head');bone('hair_back',(0,.15,1.82),(0,.19,1.19),'head')
    for side,s in [('L',1),('R',-1)]:
        bone('shoulder.'+side,(s*.13,0,1.1),(s*.3,0,1.1),'chest')
        bone('upper_arm.'+side,(s*.3,0,1.1),(s*.43,-.01,.86),'shoulder.'+side)
        bone('forearm.'+side,(s*.43,-.01,.86),(s*.48,-.09,.69),'upper_arm.'+side)
        bone('hand.'+side,(s*.48,-.09,.69),(s*.48,-.11,.59),'forearm.'+side)
        bone('fingers.'+side,(s*.48,-.11,.65),(s*.48,-.16,.59),'hand.'+side)
        bone('sleeve.'+side,(s*.32,0,1.05),(s*.54,0,.61),'upper_arm.'+side)
        bone('thigh.'+side,(s*.16,0,.57),(s*.16,-.02,.34),'pelvis')
        bone('shin.'+side,(s*.16,-.02,.34),(s*.16,0,.10),'thigh.'+side)
        bone('foot.'+side,(s*.16,0,.10),(s*.16,-.14,.06),'shin.'+side)
        bone('toe.'+side,(s*.16,-.14,.06),(s*.16,-.22,.06),'foot.'+side)
        bone('foot_ik.'+side,(s*.16,0,.10),(s*.16,-.14,.06),'root',False)
        bone('knee_pole.'+side,(s*.16,-.65,.34),(s*.16,-.65,.44),'root',False)
        bone('coat_tail.'+side,(s*.19,.03,.69),(s*.30,.12,.23),'pelvis')
        bone('tassel.'+side,(s*.31,-.15,.68),(s*.34,-.15,.31),'pelvis')
    bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
    for s in ['L','R']:
        ik=rig.pose.bones['shin.'+s].constraints.new('IK');ik.target=rig;ik.subtarget='foot_ik.'+s;ik.chain_count=2;ik.use_stretch=False
        foot=rig.pose.bones['foot.'+s].constraints.new('COPY_ROTATION');foot.target=rig;foot.subtarget='foot_ik.'+s;foot.owner_space='POSE';foot.target_space='POSE'
    pieces=[]
    def prism(name,pts,y,depth,color,owner):
        # Closed polygon extrusions; all trim shares its cloth's exact rigid weights.
        n=len(pts);verts=[(x,y+d,z) for d in (0,depth) for x,z in pts]
        faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.materials.append(mats[color]);me.update()
        bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
        ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob);vg=ob.vertex_groups.new(name=owner);vg.add(list(range(len(verts))),1,'REPLACE');pieces.append(ob)
        return ob
    def box(n,x,z,w,h,y,d,col,owner):return prism(n,[(x-w/2,z-h/2),(x+w/2,z-h/2),(x+w/2,z+h/2),(x-w/2,z+h/2)],y,d,col,owner)
    # Head is 0.88 tall, body 1.06: 2.2 heads total. Broad planar cheeks, no spheres.
    prism('Bob_Back',[(-.37,1.12),(-.47,1.38),(-.44,1.78),(-.28,1.95),(.24,1.98),(.44,1.80),(.47,1.34),(.34,1.13)],-.06,.38,'2e1c44','hair_back')
    prism('Face',[(-.30,1.30),(-.38,1.47),(-.34,1.75),(-.18,1.86),(.22,1.85),(.35,1.68),(.34,1.42),(.16,1.26),(-.11,1.25)],-.31,.29,'dca088','head')
    prism('Face_Light',[(-.28,1.45),(-.30,1.71),(-.12,1.81),(.21,1.78),(.28,1.6),(.20,1.37),(-.11,1.34)],-.316,.003,'f6c9b2','head')
    prism('Bob_Left',[(-.32,1.88),(-.46,1.75),(-.48,1.28),(-.33,1.13),(-.27,1.49),(-.18,1.78)],-.34,.22,'1b1026','hair_front')
    prism('Bob_Right',[(.22,1.91),(.43,1.78),(.48,1.36),(.32,1.17),(.27,1.59),(.12,1.81)],-.335,.22,'2e1c44','hair_front')
    prism('Fringe',[(-.35,1.77),(-.26,1.92),(.14,1.98),(.37,1.83),(.16,1.65),(.07,1.78),(-.12,1.61),(-.08,1.78),(-.29,1.65)],-.345,.045,'2e1c44','hair_front')
    prism('Hair_Highlight',[(-.29,1.81),(-.21,1.88),(.13,1.93),(.23,1.85),(.06,1.82),(-.13,1.69),(-.10,1.81)],-.397,.004,'523478','hair_front')
    for s in [-1,1]:
        x=s*.15
        box('Flat_Eye',x,1.526,.115,.085,-.337,.008,'12091a','head')
        box('Iris',x+.012,1.52,.052,.061,-.348,.006,'1fc8db','head')
        box('Catchlight',x,1.54,.024,.024,-.36,.004,'eeffff','head')
        ring=[(x-.112,1.47),(x-.125,1.51),(x-.116,1.58),(x-.08,1.61),(x+.07,1.61),(x+.11,1.58),(x+.12,1.51),(x+.09,1.47)]
        # One closed annular rim; separate overlapping strip caps cause z-fighting.
        inner=[(x+(px-x)*.84,1.54+(pz-1.54)*.79) for px,pz in ring]
        verts=[(px,y,pz) for y in [-.372,-.362] for loop in [ring,inner] for px,pz in loop];faces=[]
        for i in range(8):
            j=(i+1)%8
            faces.extend([(i,j,8+j,8+i),(16+i,24+i,24+j,16+j),(i,16+i,16+j,j),(8+i,8+j,24+j,24+i)])
        me=bpy.data.meshes.new('Glasses_Rim');me.from_pydata(verts,[],faces);me.materials.append(mats['f7cb63'])
        bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
        ob=bpy.data.objects.new('Glasses_Rim',me);scene.collection.objects.link(ob);vg=ob.vertex_groups.new(name='head');vg.add(list(range(len(verts))),1,'REPLACE');pieces.append(ob)
    box('Bridge',0,1.55,.07,.016,-.378,.012,'cf8d36','head')
    box('Mouth',.025,1.375,.07,.014,-.34,.008,'b87664','head')
    # Five chunky peach petals, visibly attached to the left hairpin.
    box('Pin',-.35,1.76,.035,.32,-.40,.025,'cf8d36','head')
    for j in range(5):
        a=j*math.tau/5;x=-.38+math.cos(a)*.063;z=1.81+math.sin(a)*.063
        prism('Peach_Petal',[(x-.038,z),(x,z-.033),(x+.038,z),(x,z+.033)],-.425,.018,'f291c7','head')
    box('Flower_Core',-.38,1.81,.038,.04,-.45,.018,'f7cb63','head')
    box('Neck',0,1.16,.18,.21,-.11,.20,'dca088','neck')
    prism('Robe',[(-.25,.53),(-.29,.88),(-.25,1.13),(.24,1.13),(.29,.87),(.25,.53)],-.15,.33,'482466','spine')
    prism('Ivory_V',[(-.19,1.13),(0,.82),(.20,1.13),(.13,1.13),(0,.96),(-.12,1.13)],-.166,.012,'f2e5d8','chest')
    prism('Skirt',[(-.17,.7),(-.26,.19),(.25,.19),(.17,.7)],-.13,.29,'d6c3b4','pelvis')
    prism('Skirt_Light',[(-.07,.66),(-.11,.23),(.05,.23),(.07,.66)],-.145,.01,'f2e5d8','pelvis')
    for side,s in [('L',1),('R',-1)]:
        # Lowered shoulder, drooping flared cuff; no round shoulder pad.
        prism('Sleeve_'+side,[(s*.24,1.10),(s*.38,1.05),(s*.62,.63),(s*.40,.56),(s*.30,.77)],-.105,.29,'733d9c','sleeve.'+side)
        prism('Sleeve_Shadow_'+side,[(s*.4,.553),(s*.62,.623),(s*.57,.713),(s*.36,.653)],-.115,.025,'261338','sleeve.'+side)
        prism('Cuff_'+side,[(s*.39,.57),(s*.61,.64),(s*.6,.68),(s*.38,.61)],-.143,.014,'f2e5d8','sleeve.'+side)
        prism('Sleeve_Fold_'+side,[(s*.34,.95),(s*.51,.69),(s*.48,.73),(s*.34,1.01)],-.143,.008,'a566cc','sleeve.'+side)
        box('Hand_'+side,s*.48,.66,.135,.15,-.18,.12,'f6c9b2','hand.'+side)
        box('Thumb_'+side,s*.42,.715,.065,.07,-.205,.08,'dca088','hand.'+side)
        box('Finger_Group_'+side,s*.49,.60,.10,.06,-.20,.10,'dca088','fingers.'+side)
        prism('Coat_'+side,[(s*.16,.76),(s*.27,.72),(s*.39,.27),(s*.25,.13),(s*.12,.30)],-.07,.21,'482466','coat_tail.'+side)
        prism('Coat_Highlight_'+side,[(s*.23,.68),(s*.33,.31),(s*.26,.22),(s*.20,.35)],-.086,.012,'733d9c','coat_tail.'+side)
        prism('Gold_Trim_'+side,[(s*.27,.72),(s*.39,.27),(s*.37,.26),(s*.25,.70)],-.099,.009,'cf8d36','coat_tail.'+side)
        box('Leg_'+side,s*.16,.24,.16,.32,-.08,.17,'9c897e','shin.'+side)
        box('Boot_'+side,s*.16,.075,.19,.15,-.20,.28,'261338','foot.'+side)
        box('Boot_Gold_'+side,s*.16,.12,.19,.035,-.214,.01,'cf8d36','foot.'+side)
        box('Tassel_Cord_'+side,s*.31,.51,.024,.28,-.18,.02,'cf8d36','tassel.'+side)
        prism('Jade_'+side,[(s*.31-.042,.40),(s*.31,.34),(s*.31+.042,.40),(s*.31,.46)],-.205,.03,'1fc8db','tassel.'+side)
        box('Tassel_'+side,s*.31,.30,.07,.12,-.19,.035,'126b82','tassel.'+side)
    box('Belt',0,.72,.57,.09,-.19,.035,'261338','pelvis');box('Buckle',0,.72,.15,.09,-.234,.035,'f7cb63','pelvis')
    box('Buckle_Core',0,.72,.08,.055,-.247,.015,'1fc8db','pelvis')
    bpy.ops.object.select_all(action='DESELECT')
    for ob in pieces:ob.select_set(True)
    bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();body=bpy.context.object;body.name='HV_PIXEL_Character';body.parent=rig
    mod=body.modifiers.new('Skin','ARMATURE');mod.object=rig
    # A distinct hidden collection documents Canvas-only equipment.
    props=bpy.data.collections.new('HV_06_Codecraft');scene.collection.children.link(props);props.hide_render=True
    camdata=bpy.data.cameras.new('Pixel_ORTHO');cam=bpy.data.objects.new('Pixel_ORTHO',camdata);scene.collection.objects.link(cam);scene.camera=cam
    cam.location=(0,-6,4.4);target=Vector((0,0,.95));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=2.75
    scene.render.resolution_x=scene.render.resolution_y=64;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.filter_size=.01;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update();p=world_to_camera_view(scene,cam,Vector((0,0,0)));camdata.shift_y+=p.y-(1-58/64)
    animate(scene,rig)
    scene['palette']='#'+' #'.join(PALETTE);scene['pixel_cell']=64;scene['pixel_anchor']=[32,58];scene['head_height']=.88;scene['body_height']=1.06
    out=HERE/'hoavi-pixel-v08.blend';bpy.ops.wm.save_as_mainfile(filepath=str(out))
    old=HERE/'hoavi.blend';backup=HERE/'hoavi-pre-pixel.blend'
    if old.exists() and not backup.exists():shutil.copy2(old,backup)
    shutil.copy2(out,old)
    report={'bones':len(data.bones),'meshes':1,'triangles':sum(len(p.vertices)-2 for p in body.data.polygons),'materials':len(body.data.materials),'clips':{k:{'frames':v[0],'fps':v[1]} for k,v in CLIPS.items()},'palette':['#'+h for h in PALETTE],'dimensions':list(body.dimensions),'shading':'Emission, exact sRGB region colors','source':str(out)}
    (HERE/'rig-pixel-v08.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report),flush=True)

def animate(scene,rig):
    rig.animation_data_create();scene.render.fps=24
    for name,(count,fps,loop) in CLIPS.items():
        act=bpy.data.actions.new(name);act.use_fake_user=True;act['frames']=count;act['fps']=fps;act['loop']=loop;rig.animation_data.action=act
        for f in range(count+int(loop)):
            t=(f%count)/count;wave=math.sin(t*math.tau);pulse=[0,.25,1,.45,.12,0,0,0][min(f,7)]
            for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
            def rot(n,x=0,y=0,z=0):rig.pose.bones[n].rotation_euler=(x,y,z)
            def move(n,x=0,y=0,z=0):rig.pose.bones[n].location=rig.data.bones[n].matrix_local.to_3x3().inverted()@Vector((x,y,z))
            bob=-.018*(1-wave) if name=='idle' else -.025*abs(wave) if name=='run' else -.09*pulse if name=='dash' else -.028*pulse
            move('pelvis',z=bob)
            rot('chest',x=.08 if name=='run' else .18*pulse if name=='dash' else -.06*pulse)
            rot('head',x=-.05*pulse,z=.06*pulse if name=='hit' else 0)
            for side,s in [('L',1),('R',-1)]:
                ph=t*math.tau+(0 if s==1 else math.pi);step=math.sin(ph)
                if name=='run':move('foot_ik.'+side,y=step*.12,z=max(0,math.cos(ph))*.09)
                rot('upper_arm.'+side,x=-.25*step if name=='run' else -.08*wave,z=s*.08)
                rot('sleeve.'+side,x=.09*math.sin(ph-.5),z=s*.06*wave)
                rot('coat_tail.'+side,x=.11*math.sin(ph-.7)+(.24 if name=='dash' else 0),z=s*.06*wave)
                rot('tassel.'+side,x=.18*math.sin(ph-.9),z=s*.06*wave)
            rot('hair_front',x=.035*math.sin(t*math.tau-.5));rot('hair_back',x=.06*math.sin(t*math.tau-.8)+(.18*pulse if name=='dash' else 0))
            if name=='idle':rot('forearm.L',x=-.25,z=-.12)
            if name=='dash':rot('chest',x=.28);rot('upper_arm.L',x=.6);rot('upper_arm.R',x=.6)
            if name=='attack':
                snap=[-.18,-.6,.92,.32,0][f];rot('chest',z=-.16*snap);rot('upper_arm.R',x=-.4,z=-.65*snap);rot('forearm.R',x=-.45,z=.85*snap);rot('fingers.R',x=-.6 if f==1 else .30 if f==2 else 0)
            if name=='q_debug':
                sweep=[-.2,-.65,1,.55,.18,0][f];rot('upper_arm.L',x=-.8,z=-.35);rot('forearm.L',x=-.6,z=-.2);rot('upper_arm.R',x=-.75,z=-.8*sweep);rot('forearm.R',z=.7*sweep);rot('chest',z=-.18*sweep);rot('coat_tail.L',x=-.35*pulse);rot('coat_tail.R',x=-.35*pulse)
            if name=='e_cast':rot('upper_arm.L',x=-.4,z=-.7*pulse);rot('forearm.L',x=-.6*pulse);rot('chest',x=.3*pulse)
            if name=='e_blink':rot('upper_arm.L',x=-.9*pulse);rot('upper_arm.R',x=-.9*pulse);rot('chest',x=.25*pulse)
            if name=='r_overclock':
                spread=[0,0,.05,.05,.1,.9,.65,.15][f];rot('upper_arm.L',x=-.9,z=-spread*.9);rot('upper_arm.R',x=-.9,z=spread*.9);rot('forearm.L',x=-.7+.15*wave);rot('forearm.R',x=-.7-.15*wave);rot('fingers.L',x=wave*.25);rot('fingers.R',x=-wave*.25)
            if name=='hit':rot('chest',x=-.27*(1-f/count));rot('head',x=.18*(1-f/count));rot('hair_front',x=.13*(1-f/count))
            for b in rig.pose.bones:
                b.keyframe_insert('location',frame=f+1,group=b.name);b.keyframe_insert('rotation_euler',frame=f+1,group=b.name)
        for layer in act.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for curve in bag.fcurves:
                        for key in curve.keyframe_points:key.interpolation='CONSTANT'
    rig.animation_data.action=bpy.data.actions['idle'];scene.frame_set(1)

if __name__=='__main__':build()
