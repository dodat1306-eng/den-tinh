"""Bake seven editable Blender particle studies to one transparent flipbook."""
import bpy,math,pathlib,json,array
ROOT=pathlib.Path(__file__).resolve().parents[2]
TEMP=ROOT/'runtime/spirit-fx-v07';TEMP.mkdir(parents=True,exist_ok=True)
TILE=128;FRAMES=8;KINDS=['fire','wind','earth','lightning','ice','nature','light']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.film_transparent=True
scene.render.resolution_x=scene.render.resolution_y=TILE;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='Standard';scene.frame_start=1;scene.frame_end=8
if hasattr(scene.eevee,'taa_render_samples'):scene.eevee.taa_render_samples=32
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[1].default_value=0

def mat(name,color):
    m=bpy.data.materials.new(name);m.use_nodes=True
    n=m.node_tree.nodes;n.clear();out=n.new('ShaderNodeOutputMaterial');s=n.new('ShaderNodeEmission')
    s.inputs[0].default_value=(*color,1);s.inputs[1].default_value=1
    m.node_tree.links.new(s.outputs[0],out.inputs['Surface']);return m

M={k:mat(k,v) for k,v in {'fire':(1,.29,.045),'warm':(1,.68,.18),'white':(.93,1,.88),'wind':(.25,.85,.72),'rock':(.48,.31,.17),'rockLight':(.86,.66,.34),'bolt':(.40,.43,1),'ice':(.24,.72,1),'iceLight':(.66,.94,1),'leaf':(.27,.65,.19),'leafLight':(.65,.88,.35),'gold':(1,.76,.25)}.items()}
def polygon(name,points,faces,materials):
    d=bpy.data.meshes.new(name);d.from_pydata(points,[],faces);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o)
    for m in materials:d.materials.append(M[m])
    for p in d.polygons:p.material_index=p.index%len(materials)
    return o
def line(name,pts,r,material):
    d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.bevel_depth=r;d.bevel_resolution=2;d.resolution_u=12
    s=d.splines.new('BEZIER');s.bezier_points.add(len(pts)-1)
    for p,v in zip(s.bezier_points,pts):p.co=v;p.handle_left_type='VECTOR';p.handle_right_type='VECTOR'
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);d.materials.append(M[material]);return o

groups=[]
for kind in KINDS:
    group=bpy.data.collections.new(kind);scene.collection.children.link(group)
    bpy.context.view_layer.active_layer_collection=bpy.context.view_layer.layer_collection.children[group.name]
    if kind=='fire':
        polygon('Flame feather',[(-.13,0,-.65),(-.45,0,-.18),(-.30,.02,.36),(-.03,0,.13),(.28,0,.82),(.40,0,.12),(.25,0,-.45),(0,-.035,-.30)],[(0,1,7),(1,2,3,7),(3,4,5,7),(5,6,0,7)],['fire','warm'])
        polygon('Flame core',[(-.08,-.04,-.55),(-.15,-.04,-.05),(.16,-.04,.40),(.14,-.04,-.30)],[(0,1,2,3)],['warm'])
    elif kind=='wind':
        line('Wind ribbon',[(-.65,0,-.40),(-.34,.05,.15),(.18,0,-.05),(.63,.02,.45)],.055,'wind')
        line('Wind fine edge',[(-.6,-.05,-.35),(-.32,0,.13),(.18,-.05,-.07),(.63,-.03,.45)],.015,'white')
    elif kind=='earth':
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.57);o=bpy.context.object;o.scale=(.67,.5,1.1)
        o.name='Rock shard';o.data.materials.append(M['rock']);o.data.materials.append(M['rockLight'])
        for p in o.data.polygons:p.material_index=int(p.normal.x<0)
    elif kind=='lightning':
        pts=[(-.15,0,.76),(.24,0,.21),(-.12,0,.14),(.21,0,-.29),(-.16,0,-.73)]
        line('Lightning border',pts,.065,'bolt');line('Lightning core',[(x,-.08,z) for x,y,z in pts],.020,'white')
        line('Lightning fork',[(-.05,0,.35),(-.36,0,.05),(-.25,0,-.15)],.024,'bolt')
    elif kind=='ice':
        vertices=[(0,0,.83),(0,0,-.62)]+[(math.cos(i*math.tau/6)*.31,math.sin(i*math.tau/6)*.21,-.08) for i in range(6)]
        polygon('Ice crystal',vertices,[(0,2+i,2+(i+1)%6) for i in range(6)]+[(1,2+(i+1)%6,2+i) for i in range(6)],['ice','iceLight','white'])
    elif kind=='nature':
        polygon('Folded leaf',[(0,0,-.65),(-.43,0,-.02),(-.14,0,.55),(.15,0,.70),(.40,0,.18),(.24,0,-.33),(0,-.11,.12)],[(0,1,6),(1,2,6),(2,3,6),(3,4,6),(4,5,6),(5,0,6)],['leaf','leafLight'])
        line('Leaf vein',[(0,-.13,-.56),(0,-.13,.12),(.15,-.05,.70)],.014,'leafLight')
    else:
        points=[]
        for i in range(8):
            a=i*math.pi/4;r=.77 if i%2==0 else .13
            points.append((math.cos(a)*r,0,math.sin(a)*r))
        polygon('Light rays',points,[tuple(range(8))],['gold'])
        polygon('Light center',[(0,-.03,.55),(.10,-.03,0),(0,-.03,-.55),(-.10,-.03,0)],[(0,1,2,3)],['white'])
    root=bpy.data.objects.new(kind+' / animated particle',None);group.objects.link(root)
    for o in list(group.objects):
        if o is not root:o.parent=root
    for frame in range(1,9):
        root.rotation_euler.y=(frame-4.5)*.065
        root.rotation_euler.z=math.sin(frame*.55)*.12
        root.scale=(.88+math.sin((frame-1)/7*math.pi)*.11,)*3
        root.keyframe_insert('rotation_euler',frame=frame);root.keyframe_insert('scale',frame=frame)
    groups.append(group)

bpy.context.view_layer.active_layer_collection=bpy.context.view_layer.layer_collection
camera_data=bpy.data.cameras.new('Particle camera');camera=bpy.data.objects.new('Particle camera',camera_data);scene.collection.objects.link(camera)
camera.location=(0,-6,0);camera.rotation_euler=(math.pi/2,0,0);camera_data.type='ORTHO';camera_data.ortho_scale=1.9;scene.camera=camera
width,height=TILE*FRAMES,TILE*len(KINDS)
pixels=array.array('f',[0])*(width*height*4)
for row,group in enumerate(groups):
    for g in groups:g.hide_render=g is not group
    for frame in range(1,FRAMES+1):
        scene.frame_set(frame);path=TEMP/(group.name+'-'+str(frame)+'.png');scene.render.filepath=str(path)
        bpy.ops.render.render(write_still=True)
        tile=bpy.data.images.load(str(path),check_existing=False);tile.alpha_mode='STRAIGHT'
        data=array.array('f',[0])*(TILE*TILE*4);tile.pixels.foreach_get(data)
        for y in range(TILE):
            start=(((len(KINDS)-1-row)*TILE+y)*width+(frame-1)*TILE)*4
            pixels[start:start+TILE*4]=data[y*TILE*4:(y+1)*TILE*4]
        bpy.data.images.remove(tile)
atlas=bpy.data.images.new('Spirit FX / 7 rows x 8 frames',width=width,height=height,alpha=True)
atlas.alpha_mode='STRAIGHT';atlas.pixels.foreach_set(pixels);atlas.filepath_raw=str(ROOT/'assets/spirit-fx-v07.png');atlas.file_format='PNG';atlas.save()
for i,g in enumerate(groups):g.hide_render=i!=0;g.hide_viewport=i!=0
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'design/blender/spirit-fx-v07.blend'))
report={'blender':bpy.app.version_string,'atlas':'assets/spirit-fx-v07.png','tile':TILE,'frames':FRAMES,'rows':KINDS,'dimensions':[width,height],'method':'Native Blender geometry and keyframed animation, transparent PNG flipbook'}
(ROOT/'design/blender/spirit-fx-v07.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('FX_ATLAS_COMPLETE '+json.dumps(report),flush=True)
