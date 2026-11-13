"""Bake actual toon meshes for autonomous combat; append hard-edged pixel flipbooks."""
import json, math, sys
from pathlib import Path

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];WORK=ROOT/'runtime/thienvu-combat-mesh'
SPECS={
    'split_matrix':(128,80,6,None),'crest_lightning':(24,24,4,'lightning'),'crest_wind':(24,24,4,'wind'),
    'crest_earth':(24,24,4,'earth'),'crest_fire':(24,24,4,'fire'),'crest_ice':(24,24,4,'ice'),
    'crest_nature':(24,24,4,'nature'),'crest_light':(24,24,4,'light'),
    'golem_walk':(96,96,6,'earth'),'golem_smash':(96,96,6,'earth'),
    'treant_walk':(64,64,6,'nature'),'treant_whip':(64,64,6,'nature'),
    'earth_spikes':(64,64,6,'earth'),'earth_tremor':(96,64,6,'earth'),
    'ice_mountain':(80,80,6,'ice'),'freeze_cage':(48,56,4,'ice'),
    'giant_fireball':(64,64,6,'fire'),'meteor_burst':(96,96,6,'fire'),
    'fire_breath':(112,64,6,'fire'),'hoverboard':(64,32,6,'wind'),
    'tornado_mesh':(64,96,6,'wind'),'giant_vine':(128,64,6,'nature'),
    'solar_beam':(128,48,6,'light'),'solar_prism':(48,48,6,'light'),
    'lightning_swords':(64,72,6,'lightning'),
}

def build():
    import bpy,bmesh
    from mathutils import Vector
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene;scene.name='THIENVU_Combat_Mesh';WORK.mkdir(parents=True,exist_ok=True)
    palettes=json.loads((HERE/'rig-pixel-v08.json').read_text(encoding='utf-8'))['forms']
    mats={}
    def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    def material(form):
        if form in mats:return mats[form]
        m=bpy.data.materials.new('Combat_Toon_'+form);ns=m.node_tree.nodes;ns.clear()
        out=ns.new('ShaderNodeOutputMaterial');em=ns.new('ShaderNodeEmission');geo=ns.new('ShaderNodeNewGeometry');dot=ns.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT';dot.inputs[1].default_value=(.3,-.5,.8)
        ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.interpolation='CONSTANT'
        for e in list(ramp.color_ramp.elements)[1:]:ramp.color_ramp.elements.remove(e)
        colors=([palettes[form]['palette'][7],palettes[form]['palette'][8],palettes[form]['palette'][9],'#ffffff'] if form=='lightning' else palettes[form]['palette'][11:15])
        for i,h in enumerate(colors):
            e=ramp.color_ramp.elements[0] if i==0 else ramp.color_ramp.elements.new(i/4)
            e.position=i/4;e.color=(*[linear(int(h[j:j+2],16)/255) for j in (1,3,5)],1)
        links=m.node_tree.links;links.new(geo.outputs['Normal'],dot.inputs[0]);links.new(dot.outputs['Value'],ramp.inputs['Fac']);links.new(ramp.outputs['Color'],em.inputs['Color']);links.new(em.outputs[0],out.inputs['Surface']);mats[form]=m;return m
    def white():
        if 'white' in mats:return mats['white']
        m=bpy.data.materials.new('Combat_White_Core');ns=m.node_tree.nodes;ns.clear();out=ns.new('ShaderNodeOutputMaterial');em=ns.new('ShaderNodeEmission');em.inputs['Color'].default_value=(1,1,1,1);m.node_tree.links.new(em.outputs[0],out.inputs['Surface']);mats['white']=m;return m
    current=None;serial=0
    def prism(name,pts,y=-.12,depth=.22,form='earth',core=False):
        nonlocal serial
        serial+=1;n=len(pts)
        # Separate raised inlays by 3 mm: visible depth, no coincident front/back caps.
        layer=len(current.objects);y-=layer*.003
        verts=[(x+math.sin(layer*1.31)*.006,y+d,z+math.sin(layer*2.17)*.006) for d in (0,depth) for x,z in pts];faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.materials.append(white() if core else material(form));me.update()
        bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
        ob=bpy.data.objects.new(name+'_'+str(serial),me);current.objects.link(ob);return ob
    def box(name,x,z,w,h,form='earth',y=-.12,depth=.22,core=False):return prism(name,[(x-w/2,z-h/2),(x+w/2,z-h/2),(x+w/2,z+h/2),(x-w/2,z+h/2)],y,depth,form,core)
    def gem(name,x,z,w,h,form='ice',y=-.12):return prism(name,[(x-w/2,z),(x,z+h/2),(x+w/2,z),(x,z-h/2)],y,.18,form)
    def ring(name,x,z,r,width,form='light',steps=20,phase=0):
        nonlocal serial
        serial+=1;y=-.22-len(current.objects)*.003;verts=[]
        for depth in [0,.16]:
            for radius in [r,r-width]:
                for i in range(steps):
                    a=i*math.tau/steps+phase;verts.append((x+math.cos(a)*radius,y+depth,z+math.sin(a)*radius))
        faces=[]
        for i in range(steps):
            j=(i+1)%steps
            faces.extend([(i,j,j+steps,i+steps),(i+2*steps,i+3*steps,j+3*steps,j+2*steps),(i,i+2*steps,j+2*steps,j),(i+steps,j+steps,j+3*steps,i+3*steps)])
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(material(form));bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();ob=bpy.data.objects.new(name+'_'+str(serial),mesh);current.objects.link(ob);return [ob]
    def crest(form,x=0,z=1,scale=1):
        def p(pts):return prism('Crest_'+form,[(x+a*scale,z+b*scale) for a,b in pts],form=form)
        if form=='lightning':p([(-.2,-.4),(.04,-.06),(-.12,-.06),(.16,.44),(.1,.12),(.28,.12)])
        elif form=='fire':p([(-.3,-.28),(-.35,.05),(-.08,.44),(.04,.1),(.27,.3),(.34,-.1),(.2,-.32)])
        elif form=='earth':p([(-.37,-.1),(-.2,.33),(.2,.33),(.38,-.1),(.18,-.34),(-.18,-.34)]);p([(-.025,.3),(.015,.08),(-.075,-.02),(.045,-.3),(.095,-.3),(-.025,-.02),(.065,.08),(.025,.3)])
        elif form=='nature':
            p([(-.06,-.4),(-.14,.02),(.1,.31),(.16,.26),(-.04,-.03),(.03,-.4)])
            for a,b in [(-.18,.03),(.16,.18),(-.1,-.22)]:p([(a-.16,b-.03),(a-.06,b+.18),(a+.12,b+.1),(a+.08,b-.08)])
        elif form=='wind':
            for i in range(3):
                a=i*math.tau/3;pts=[(.05,-.08),(.37,.04),(.29,.28),(.11,.22),(.17,.05)]
                p([(math.cos(a)*u-math.sin(a)*v,math.sin(a)*u+math.cos(a)*v) for u,v in pts])
        else:
            n=6 if form=='ice' else 8
            for i in range(n):
                a=i*math.tau/n;u,v=math.cos(a),math.sin(a);p([(-v*.04,u*.04),(u*.40-v*.035,v*.40+u*.035),(u*.40+v*.035,v*.40-u*.035),(v*.04,-u*.04)])
                if form=='ice':p([(u*.20-v*.02,v*.20+u*.02),(u*.20-v*.16,v*.20+u*.16),(u*.28-v*.09,v*.28+u*.09)])
            if form=='light':ring('Crest_Solar',x,z,.21,.08,form)
    for key,(w,h,n,form) in SPECS.items():
        current=bpy.data.collections.new(key);scene.collection.children.link(current)
        if key.startswith('crest_'):crest(form)
        elif key=='split_matrix':
            ring('VFX_BoBoiBoy_SplitCircle',0,1,1.36,.065,'light',28);ring('VFX_BoBoiBoy_SplitCircle_Inner',0,1,1.04,.06,'wind',28)
            for i,f in enumerate(palettes):
                a=i*math.tau/7;crest(f,math.cos(a)*1.25,1+math.sin(a)*.66,.40)
        elif key.startswith('golem_') or key.startswith('treant_'):
            tree=key.startswith('treant');f='nature' if tree else 'earth';prefix='Summon_TreantMonster' if tree else 'Summon_EarthGolem'
            box(prefix+'_Torso',0,1.05,.85,.9,f,depth=.55);gem(prefix+'_Core',0,1.12,.32,.45,f,y=-.16)
            box(prefix+'_CoreWhite',0,1.12,.08,.16,f,y=-.175,depth=.008,core=True)
            box(prefix+'_Head',0,1.78,.64,.52,f,depth=.48)
            for sign in [-1,1]:
                gem(prefix+'_Shoulder',sign*.65,1.48,.64,.48,f,y=-.23)
                gem(prefix+'_Knee',sign*.24,.42,.4,.32,f,y=-.23)
                box(prefix+'_Fist',sign*.69,.65,.55,.43,f,y=-.16,depth=.48)
                for j in range(2):
                    gem(prefix+'_StonePlate',sign*(.12+j*.17),1.22-j*.23,.3,.28,f,y=-.145)
                if tree:
                    prism(prefix+'_Thorn',[(sign*.79,.7),(sign*1.05,.87),(sign*.8,.95)],form=f,y=-.17)
            box(prefix+'_Brow',0,1.94,.64,.1,f,y=-.14,depth=.04)
            for sign in [-1,1]:
                box(prefix+'_Eye',sign*.16,1.83,.10,.07,f,y=-.14,depth=.014,core=True)
                ob=box(prefix+'_Arm',sign*.67,1.02,.43,.85,f,depth=.43);ob['animate']='arm';ob['side']=sign
                ob=box(prefix+'_Leg',sign*.24,.32,.34,.58,f,depth=.4);ob['animate']='leg';ob['side']=sign
                if tree:
                    for j in range(3):gem(prefix+'_Foliage',sign*(.35+j*.12),1.57+j*.14,.55,.56,f)
                    prism(prefix+'_Branch',[(sign*.17,1.8),(sign*.3,2.31),(sign*.45,2.4),(sign*.37,2.05),(sign*.52,2.14),(sign*.39,1.86)],form=f)
        elif key in ['earth_spikes','ice_mountain','freeze_cage']:
            for i in range(5 if key!='freeze_cage' else 6):
                a=i*math.tau/6;x=(i-2)*.36 if key!='freeze_cage' else math.cos(a)*.5
                gem('VFX_IceMountain_FreezeCage' if form=='ice' else 'VFX_EarthSpikes',x,.65+(.3 if i==2 else 0),.62,.8+(i%3)*.45,form)
        elif key=='earth_tremor':
            for j in range(3):ring('VFX_EarthTremor',0,1,.48+j*.44,.10,'earth',16)
        elif key in ['giant_fireball','meteor_burst']:
            for j in range(4):
                ring('VFX_GiantFireball',0,1,1.02-j*.18,.23,'fire',16,phase=j*.14)
            box('VFX_Fireball_Core',0,1,.30,.38,'fire',y=-.16,depth=.08,core=True)
            for i in range(8):
                a=i*math.tau/8;gem('VFX_Meteor_Flame',math.cos(a)*.9,1+math.sin(a)*.9,.34,.72,'fire')
        elif key=='fire_breath':
            for i in range(9):
                x=-1.3+i*.32;r=.08+i*.07;prism('VFX_FireBreathCone',[(x-r,1-r),(x+r,1-r),(x+r*.7,1+r),(x-r*.4,1+r*.8)],form='fire',y=-.12+i*.012)
                if i<5:box('Breath_White_Core',x,1,.22,.05+i*.02,'fire',y=-.19,depth=.01,core=True)
        elif key in ['hoverboard','tornado_mesh']:
            for i in range(3 if key=='hoverboard' else 7):ring('VFX_WindTornado_Hoverboard',0,.3+i*.24,.32+i*.1,.13,'wind',18,phase=i*.28)
        elif key=='giant_vine':
            for i in range(12):
                x=-1.45+i*.26;z=.7+math.sin(i*.25)*.5;box('VFX_GiantVineSlam',x,z,.32,.21,'nature',y=-.12+i*.005)
                gem('VFX_Vine_Thorn',x,z+.18,.18,.36,'nature',y=-.14+i*.005)
        elif key=='solar_beam':
            box('VFX_SolarBeamPrism',0,1,3.25,.64,'light');box('Solar_Inner',0,1,3.3,.35,'light',y=-.14);box('Solar_White_Core',0,1,3.35,.14,'light',y=-.16,core=True)
            for x in [-1.0,0,1.0]:ring('Solar_Prism_Ring',x,1,.5,.09,'light',8)
        elif key=='solar_prism':ring('VFX_SolarBeamPrism',0,1,.9,.17,'light',8);crest('light',scale=.9)
        elif key=='lightning_swords':
            for i in range(4):
                x=(i-1.5)*.47;prism('VFX_Thunder_Sword',[(x-.08,.25),(x+.08,.25),(x+.13,1.42),(x,1.82),(x-.13,1.42)],form='lightning');box('Thunder_Hilt',x,.7,.42,.08,'lightning')
    camdata=bpy.data.cameras.new('Combat_ORTHO');cam=bpy.data.objects.new('Combat_ORTHO',camdata);scene.collection.objects.link(cam);scene.camera=cam
    cam.location=(0,-8,2.9);target=Vector((0,0,1.12));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=3.4
    scene.render.engine='CYCLES';scene.cycles.samples=1;scene.cycles.use_denoising=False;scene.render.threads_mode='FIXED';scene.render.threads=4
    scene.render.film_transparent=True;scene.render.filter_size=.01;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard'
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'thienvu-combat-mesh.blend'))
    for key,(w,h,n,form) in SPECS.items():
        for other in SPECS:bpy.data.collections[other].hide_render=other!=key
        scene.render.resolution_x=w;scene.render.resolution_y=h;camdata.ortho_scale=1.15 if key.startswith('crest_') else 3.7 if w>h else 3.0
        collection=bpy.data.collections[key];base={ob.name:(ob.location.copy(),ob.scale.copy(),ob.rotation_euler.copy()) for ob in collection.objects}
        for frame in range(n):
            t=frame/n;wave=math.sin(t*math.tau)
            for ob in collection.objects:
                loc,scale,rot=base[ob.name];ob.location=loc;ob.scale=scale;ob.rotation_euler=rot
                if ob.get('animate')=='leg':ob.location.z+=max(0,wave*ob['side'])*.14
                if ob.get('animate')=='arm':ob.location.z+=(-wave*.18 if key.endswith('walk') else [0,.18,.5,.9,-.38,0][frame]);ob.location.y-=max(0,wave)*.15
                if key in ['earth_spikes','ice_mountain']:ob.scale.z=.3+.7*math.sin((frame+1)/(n+1)*math.pi)
                elif key in ['giant_fireball','meteor_burst','solar_prism']:ob.rotation_euler.y=wave*.16;ob.scale*=.88+.12*wave
                elif key in ['hoverboard','tornado_mesh']:ob.location.x=math.sin(frame*1.8+ob.location.z)*.07
                elif key=='giant_vine':ob.rotation_euler.y=math.sin(t*math.pi)*.20
                elif key=='split_matrix':ob.rotation_euler.y=wave*.04
                elif key=='fire_breath':ob.scale.z=.88+.12*math.sin(frame*2.1+ob.location.x)
            scene.render.filepath=str(WORK/(key+'-'+str(frame)+'.png'));bpy.ops.render.render(write_still=True)
    print(json.dumps({'pass':True,'meshObjects':sum(o.type=='MESH' for o in scene.objects),'triangles':sum(len(o.data.polygons) for o in scene.objects if o.type=='MESH'),'materials':len(mats),'frames':sum(v[2] for v in SPECS.values()),'source':str(HERE/'thienvu-combat-mesh.blend')}),flush=True)

def pack():
    import numpy as np
    from PIL import Image,ImageFilter,ImageDraw
    spec=json.loads((HERE/'rig-pixel-v08.json').read_text(encoding='utf-8'));meta=json.loads((ROOT/'assets/thienvu-vfx-pixel.json').read_text())
    old=Image.open(ROOT/meta['image']).convert('RGBA');width=1024;x=0;y=old.height;row=0;tiles=[]
    # Rebuild the original atlas first, so repeated invocations never accumulate rows.
    assert not any(key in meta['clips'] for key in SPECS),'Run build_thienvu_vfx_pixel.py before packing meshes'
    meta['palette']=list(dict.fromkeys(spec['common']+sum((v['palette'] for v in spec['forms'].values()),[])+['#12091a']))
    for key,(w,h,n,form) in SPECS.items():
        colors=spec['forms'][form]['palette'] if form else meta['palette'];pal=np.array([tuple(bytes.fromhex(c[1:])) for c in colors],dtype=np.int32);cells=[]
        for f in range(n):
            im=Image.open(WORK/(key+'-'+str(f)+'.png')).convert('RGBA');a=np.array(im);mask=a[:,:,3]>=128;dist=((a[:,:,:3].astype(np.int32)[:,:,None]-pal[None,None])**2).sum(3);a[:,:,:3]=pal[dist.argmin(2)];a[:,:,3]=mask*255;a[~mask]=0;im=Image.fromarray(a)
            alpha=im.getchannel('A');edge=alpha.filter(ImageFilter.MaxFilter(3));out=Image.new('RGBA',im.size);out.paste('#12091a',(0,0,w,h),edge);out.paste(im,(0,0),alpha);assert out.getbbox(),key
            if x+w>width:x=0;y+=row;row=0
            cells.append({'x':x,'y':y,'w':w,'h':h});tiles.append((out,x,y));x+=w;row=max(row,h)
        meta['clips'][key]={'frames':n,'w':w,'h':h,'fps':12,'element':form,'cells':cells,'source':'Blender toon mesh'}
    atlas=Image.new('RGBA',(width,y+row));atlas.paste(old)
    for im,x,y in tiles:atlas.paste(im,(x,y))
    meta['height']=atlas.height;atlas.save(ROOT/meta['image']);raw=json.dumps(meta,separators=(',',':'));(ROOT/'assets/thienvu-vfx-pixel.json').write_text(raw);(ROOT/'assets/thienvu-vfx-pixel.js').write_text('globalThis.DTThienVuVFX='+raw+';\n')
    preview=Image.new('RGB',(640,48+len(SPECS)*112),'#142b32');d=ImageDraw.Draw(preview);d.text((12,12),'THIEN VU / BLENDER MESH FLIPBOOKS',fill='white')
    for j,(key,clip) in enumerate((k,meta['clips'][k]) for k in SPECS):
        yy=42+j*112;d.text((8,yy),key,fill='#ffe07d')
        for i,c in enumerate(clip['cells']):
            tile=atlas.crop((c['x'],c['y'],c['x']+c['w'],c['y']+c['h']));tile.thumbnail((76,92),Image.Resampling.NEAREST);preview.paste(tile,(150+i*80,yy+15),tile)
    preview.save(HERE/'thienvu-combat-mesh-preview.png')
    print(json.dumps({'pass':True,'meshClips':len(SPECS),'meshFrames':len(tiles),'totalFrames':sum(c['frames'] for c in meta['clips'].values()),'atlas':[atlas.width,atlas.height]}))

if __name__=='__main__':
    build() if '--build' in sys.argv else pack()
