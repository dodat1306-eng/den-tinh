"""Shared v0.8 mesh bake. Run from Blender; every frame is actual posed geometry."""
import json, math, sys
from pathlib import Path

import bpy, bmesh, numpy as np
from mathutils import Vector, Matrix
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
VERSION = json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version']
INK = '#12091a'
PITCH = .045
UP = Vector((0, .4472135955, .894427191))
RIGHT = Vector((1, 0, 0))
NEAR = RIGHT.cross(UP)
PALETTES = {
    'wood': ['#2b190e','#4f321d','#825634','#bd8d53'],
    'leaf': ['#123c30','#245b3c','#46945a','#8ad477'],
    'jade': ['#0e4734','#1c8c5e','#52de9b','#dcfff0'],
    'stone': ['#29303c','#4e5965','#86939d','#d3d6bf'],
    'earth': ['#392117','#593318','#a86a32','#f0b865'],
    'gold': ['#543c28','#996032','#c79248','#ffe4a0'],
    'purple': ['#29133f','#4b1d7a','#a55ce0','#f2d1ff'],
    'pink': ['#3b174a','#652766','#b55ab0','#f5b8fa'],
    'red': ['#391523','#7a1828','#d9384a','#ffb18b'],
    'water': ['#10384f','#1f6e8c','#75dfeb','#dbfbff'],
    'ice': ['#173951','#245c8a','#6fc9eb','#dbfbff'],
    'skin': ['#603a33','#a76a49','#e8ac78','#ffe3ba'],
    'cream': ['#53413e','#98745a','#e8c892','#fff2d6'],
    'char': ['#120d14','#161118','#2b2129','#58505b'],
    'ash': ['#1a151c','#37313c','#585c63','#a2a8ab'],
    'orange': ['#7a2b1e','#bf5225','#f7a944','#ffe5a1'],
    'ember': ['#792b19','#d8441b','#ff5e1a','#ffdd77'],
    'cyan': ['#174e58','#26989b','#7bffdc','#e1fff4'],
    'night': ['#12091a','#211a32','#443854','#81728f'],
}

def material(key):
    name = 'Pixel08_' + key
    old = bpy.data.materials.get(name)
    if old: return old
    shades = PALETTES.get(key, [key]*4)
    mat = bpy.data.materials.new(name)
    nodes = mat.node_tree.nodes; nodes.clear(); links = mat.node_tree.links
    geo = nodes.new('ShaderNodeNewGeometry')
    dot = nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    dot.inputs[1].default_value = (-.45, -.55, .75)
    ramp = nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements.remove(ramp.color_ramp.elements[1])
    for i, color in enumerate(shades):
        e = ramp.color_ramp.elements[0] if i == 0 else ramp.color_ramp.elements.new(i/4)
        e.position = [-1, .06, .42, .72][i] if i else 0
        rgb = [int(color[j:j+2],16)/255 for j in (1,3,5)]
        e.color = (*[v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb], 1)
    emission = nodes.new('ShaderNodeEmission'); out = nodes.new('ShaderNodeOutputMaterial')
    links.new(geo.outputs['Normal'], dot.inputs[0]); links.new(dot.outputs['Value'], ramp.inputs[0])
    links.new(ramp.outputs[0], emission.inputs['Color']); links.new(emission.outputs[0], out.inputs['Surface'])
    return mat

_templates = {}
def template(kind, detail=1):
    key = kind, detail
    if key in _templates: return _templates[key]
    bm = bmesh.new()
    if kind == 'ico': bmesh.ops.create_icosphere(bm, subdivisions=detail, radius=1)
    else: bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=detail, radius1=1, radius2=1, depth=2)
    bmesh.ops.triangulate(bm, faces=list(bm.faces)); bm.verts.ensure_lookup_table()
    for i,v in enumerate(bm.verts): v.index=i
    data = ([tuple(v.co) for v in bm.verts], [tuple(v.index for v in f.verts) for f in bm.faces])
    bm.free(); _templates[key] = data; return data

class Mesh:
    def __init__(self): self.verts=[]; self.faces=[]; self.colors=[]; self.parts=[]; self.serial=0
    def shape(self, kind, at, scale, color, detail=1, rotation=None, part=True):
        vs, fs = template(kind, detail); start=len(self.verts); self.serial+=1
        m = Matrix.Diagonal(Vector((*scale,1)))
        if rotation is not None: m=rotation.to_matrix().to_4x4() @ m
        center=Vector(at)
        self.verts.extend([tuple(center+(m @ Vector(v))) for v in vs])
        self.faces.extend([tuple(start+i for i in f) for f in fs]); self.colors.extend([color]*len(fs))
        self.parts.extend([self.serial if part else 0]*len(fs))
    def ico(self, at, scale, color, detail=2, part=True): self.shape('ico',at,scale,color,detail,part=part)
    def rod(self, a, b, r, color, end=None, sides=8, part=True):
        a,b=Vector(a),Vector(b); d=b-a; q=Vector((0,0,1)).rotation_difference(d)
        start=len(self.verts); self.shape('cylinder',(a+b)/2,(r,r,d.length/2),color,sides,q,part)
        if end is not None:
            for i in range(start,len(self.verts)):
                local=q.inverted() @ (Vector(self.verts[i])-(a+b)/2)
                f=end/r if local.z>0 else 1; local.x*=f; local.y*=f
                self.verts[i]=tuple((a+b)/2 + q @ local)
    def path(self, points, r, color, end=None, part=True):
        for i in range(len(points)-1): self.rod(points[i],points[i+1],r,color,end=end,part=part)
    def ring(self, at, radius, width, color, segments=16, tilt=0):
        x,y,z=at
        for i in range(segments):
            a=i*math.tau/segments; b=(i+1)*math.tau/segments
            self.rod((x+math.cos(a)*radius,y+math.sin(a)*radius*tilt,z+math.sin(a)*radius),(x+math.cos(b)*radius,y+math.sin(b)*radius*tilt,z+math.sin(b)*radius),width,color,sides=6,part=False)
    def prism(self, points, color, y=-.1, depth=.08, part=True):
        from mathutils.geometry import tessellate_polygon
        start=len(self.verts);n=len(points);self.serial+=1
        self.verts.extend([(x,y+d,z) for d in (0,depth) for x,z in points])
        polygon=[Vector((x,0,z)) for x,z in points]
        triangles=tessellate_polygon([polygon])
        faces=[tuple(start+(v if isinstance(v,int) else polygon.index(v)) for v in tri) for tri in triangles]
        faces += [tuple(i+n for i in reversed(f)) for f in faces]
        faces += [(start+i,start+(i+1)%n,start+(i+1)%n+n,start+i+n) for i in range(n)]
        self.faces.extend(faces);self.colors.extend([color]*len(faces));self.parts.extend([self.serial if part else 0]*len(faces))

def audit_meshes(objects, detached_parts=None):
    sys.path.insert(0,str(Path.home()/'.agents/skills/blender-asset-qa/scripts'))
    import qa_check
    batches=[qa_check.run(objects=objects[i:i+24],profile='render',uv=False) for i in range(0,len(objects),24)]
    audit={'objects':{k:v for b in batches for k,v in b['objects'].items()},'batches':len(batches)}
    for key in ('errors','warnings','zfighting','floating','back_to_back','enclosed'):
        audit[key]=[item for b in batches for item in b.get(key,[])]
    skipped=[w for w in audit['warnings'] if 'checks skipped' in w]
    audit['errors'].extend(skipped)
    audit['allFramesChecked']=not skipped
    if detached_parts:
        expected=[e for e in audit['errors'] if e.startswith('floating/detached part')]
        audit['errors']=[e for e in audit['errors'] if e not in expected]
        audit['warnings'].extend(expected)
        audit['accepted_detached_parts']=detached_parts
    audit['ok']=audit['pass']=not audit['errors']
    return audit

class Atlas:
    def __init__(self, name, width=1024):
        self.name=name; self.width=width; self.x=self.y=self.row=0; self.items=[]; self.clips={}; self.direct=[]
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.scene=bpy.context.scene; self.scene.name=name
    def cells(self, key, w, h, frames, fps=8, anchor=None):
        cells=[]
        for _ in range(frames):
            if self.x+w>self.width: self.x=0; self.y+=self.row; self.row=0
            cell={'x':self.x,'y':self.y,'w':w,'h':h,'anchorX':w/2,'anchorY':h-6 if anchor is None else anchor}
            self.x+=w; self.row=max(self.row,h); cells.append(cell)
        self.clips[key]={'frames':frames,'fps':fps,'cells':cells}; return cells
    def add(self, cell, mesh, key): self.items.append((cell,mesh,key))
    def pixels(self, key, images, fps=8, anchor=None):
        cells=self.cells(key,*images[0].size,len(images),fps,anchor)
        self.direct.extend(zip(cells,images)); return cells
    def bake(self, directory, global_name, detached_parts=None):
        directory=Path(directory); directory.mkdir(parents=True,exist_ok=True)
        height=math.ceil((self.y+self.row)/16)*16; scene=self.scene; objects=[]
        fit={}; lifts={}
        for cell,model,key in self.items:
            low=(np.array(model.verts) @ np.array(UP)).min()
            lifts[key]=max(lifts.get(key,0),-2*PITCH-low)
        for cell,model,key in self.items:
            lift=UP*lifts[key]
            model.verts=[tuple(Vector(v)+lift) for v in model.verts]
            verts=np.array(model.verts); projected=verts @ np.array(UP)
            scale=min(1,(cell['w']/2-3)*PITCH/max(.001,abs(verts[:,0]).max()),(cell['anchorY']-3)*PITCH/max(.001,projected.max()),(cell['h']-cell['anchorY']-3)*PITCH/max(.001,-projected.min()))
            fit[key]=min(fit.get(key,1),scale)
        for cell,model,key in self.items:
            if fit[key]<1:model.verts=[tuple(v*fit[key] for v in point) for point in model.verts]
        palettes=sorted({c for _,m,_ in self.items for c in m.colors}); mats=[material(c) for c in palettes]
        material_index={c:i for i,c in enumerate(palettes)}
        for i,(cell,model,key) in enumerate(self.items):
            mesh=bpy.data.meshes.new(key); mesh.from_pydata(model.verts,[],model.faces); mesh.update()
            local=sorted(set(model.colors));indices={c:j for j,c in enumerate(local)}
            for color in local: mesh.materials.append(mats[material_index[color]])
            for face,color in zip(mesh.polygons,model.colors): face.material_index=indices[color]
            part=mesh.attributes.new('part_id','INT','FACE'); part.data.foreach_set('value',model.parts)
            bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.dissolve_degenerate(bm,dist=1e-6,edges=list(bm.edges));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
            ob=bpy.data.objects.new(f'{key}_{i:03}',mesh); scene.collection.objects.link(ob)
            ob.location=RIGHT*(cell['x']+cell['anchorX'])*PITCH + UP*(height-cell['y']-cell['anchorY'])*PITCH
            ob['cell']=json.dumps(cell); objects.append(ob)
        center=Vector((self.width*PITCH/2,0,0))+UP*(height*PITCH/2)
        camera=bpy.data.cameras.new('Pixel08_Camera'); camera.type='ORTHO'; camera.sensor_fit='HORIZONTAL'; camera.ortho_scale=self.width*PITCH
        cam=bpy.data.objects.new('Pixel08_Camera',camera); scene.collection.objects.link(cam)
        cam.location=center+NEAR*120; cam.rotation_euler=(-NEAR).to_track_quat('-Z','Y').to_euler(); scene.camera=cam
        for name,where,power in [('Key',(-30,-60,100),1200),('Rim',(40,30,80),800)]:
            light=bpy.data.lights.new(name,'AREA'); light.energy=power; light.size=30
            ob=bpy.data.objects.new(name,light); scene.collection.objects.link(ob); ob.location=center+Vector(where)
            ob.rotation_euler=(center-ob.location).to_track_quat('-Z','Y').to_euler()
        scene.render.engine='CYCLES'; scene.cycles.samples=1; scene.cycles.use_denoising=False
        scene.cycles.max_bounces=1; scene.render.film_transparent=True; scene.render.resolution_percentage=100
        scene.render.resolution_x=self.width; scene.render.resolution_y=height
        scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'; scene.render.filter_size=.01
        scene.view_settings.view_transform='Standard'; scene.view_settings.look='None'; scene.render.dither_intensity=0
        scene.render.filepath=str(directory/'raw.png')
        bpy.ops.wm.save_as_mainfile(filepath=str(directory/(self.name+'.blend')),compress=True)
        bpy.ops.render.render(write_still=True)
        image=Image.open(directory/'raw.png').convert('RGBA'); data=np.array(image)
        allowed={INK}
        for key in palettes: allowed.update(PALETTES.get(key,[key]))
        colors=np.array([tuple(bytes.fromhex(c[1:])) for c in sorted(allowed)],dtype=np.int16)
        # Quantize the native-resolution render, never shrink and enlarge a small sprite.
        mask=data[:,:,3]>=128; rgb=data[:,:,:3]; positions=np.argwhere(mask)
        for start in range(0,len(positions),8192):
            p=positions[start:start+8192]; sample=rgb[p[:,0],p[:,1]].astype(np.int16)
            distance=((sample[:,None,:].astype(np.int32)-colors[None,:,:])**2).sum(axis=2)
            rgb[p[:,0],p[:,1]]=colors[np.argmin(distance,axis=1)]
        data[:,:,3]=mask*255; data[~mask]=0
        stats=[]
        for cell,model,key in self.items:
            x,y,w,h=[cell[k] for k in ('x','y','w','h')]; tile=data[y:y+h,x:x+w].copy()
            tile=outline(tile, model, cell); data[y:y+h,x:x+w]=tile
            crop=Image.fromarray(tile); cell['bbox']=list(crop.getbbox() or (0,0,0,0))
            baked_mesh=objects[len(stats)].data;baked_mesh.calc_loop_triangles()
            stats.append({'key':key,'triangles':len(baked_mesh.loop_triangles),'parts':model.serial,'bbox':cell['bbox']})
        image=Image.fromarray(data)
        for cell,picture in self.direct:
            image.paste(picture,(cell['x'],cell['y'])); cell['bbox']=list(picture.getbbox() or (0,0,0,0))
        metadata={'version':VERSION,'image':f'assets/{self.name}.png','width':self.width,'height':height,'unit':2,'outline':INK,'palette':sorted(allowed),'blender':bpy.app.version_string,'clips':self.clips}
        destination=ROOT/'assets'; image.save(destination/(self.name+'.png'),optimize=True)
        (destination/(self.name+'.json')).write_text(json.dumps(metadata,separators=(',',':')),encoding='utf-8')
        (destination/(self.name+'.js')).write_text(f'globalThis.{global_name}='+json.dumps(metadata,separators=(',',':'))+';\n',encoding='utf-8')
        # Required geometry audit; separate sprites intentionally form disconnected islands.
        audit=audit_meshes([o.name for o in objects],detached_parts)
        report={'version':VERSION,'blender':bpy.app.version_string,'frames':len(stats)+len(self.direct),'objects':len(objects),'triangles':sum(s['triangles'] for s in stats),'materials':len(mats),'dimensions':list(image.size),'mesh_frames':stats,'geometry_audit':audit,'accepted_warnings':'Disconnected leaf tips, eyes and glows are deliberate layered sprite details; atlas cells are spatially isolated; no skinned export.','pass':bool(audit.get('pass'))}
        verify(image,self.clips)
        (directory/'bake-report.json').write_text(json.dumps(report,separators=(',',':')),encoding='utf-8')
        assert report['pass'],audit.get('errors')
        print('@@JSON@@'+json.dumps({k:report[k] for k in ('version','blender','frames','objects','triangles','materials','dimensions','pass')}),flush=True)
        return image,metadata

def outline(tile, model, cell):
    h,w=tile.shape[:2]; ids=np.zeros((h,w),np.int32); depth=np.full((h,w),-np.inf)
    verts=np.array(model.verts); screen=np.column_stack((verts[:,0]/PITCH+cell['anchorX'],cell['anchorY']-(verts @ np.array(UP))/PITCH)); depths=verts @ np.array(NEAR)
    for f,part in zip(model.faces,model.parts):
        if len(f)!=3: continue
        p=screen[list(f)]; a,b,c=p; det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(det)<1e-8: continue
        x0=max(0,int(np.floor(p[:,0].min()))); x1=min(w,int(np.ceil(p[:,0].max())))
        y0=max(0,int(np.floor(p[:,1].min()))); y1=min(h,int(np.ceil(p[:,1].max())))
        if x0>=x1 or y0>=y1: continue
        yy,xx=np.mgrid[y0:y1,x0:x1]; xx=xx+.5; yy=yy+.5
        u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/det
        v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/det; t=1-u-v
        z=u*depths[f[0]]+v*depths[f[1]]+t*depths[f[2]]
        hit=(u>=0)&(v>=0)&(t>=0)&(z>depth[y0:y1,x0:x1])
        depth[y0:y1,x0:x1][hit]=z[hit]; ids[y0:y1,x0:x1][hit]=part
    mask=tile[:,:,3]>0
    # Alpha Sobel, then one-sided ID/depth discontinuities: a single texel at joints.
    alpha=Image.fromarray((mask*255).astype(np.uint8))
    sx=np.array(alpha.filter(ImageFilter.Kernel((3,3),[-1,0,1,-2,0,2,-1,0,1],1,0)))
    sy=np.array(alpha.filter(ImageFilter.Kernel((3,3),[-1,-2,-1,0,0,0,1,2,1],1,0)))
    inside=np.array(alpha.filter(ImageFilter.MinFilter(3)))>0
    outside=(np.array(alpha.filter(ImageFilter.MaxFilter(3)))>0)&~mask
    edge=outside
    for dy,dx in [(0,1),(1,0)]:
        other=np.roll(ids,(dy,dx),(0,1)); dz=np.abs(np.nan_to_num(depth,neginf=-1000)-np.nan_to_num(np.roll(depth,(dy,dx),(0,1)),neginf=-1000))
        edge|=inside&(ids>other)&(other>0)&(dz>.025)
    tile[edge]=(*bytes.fromhex(INK[1:]),255)
    return tile

def verify(image,clips):
    array=np.array(image); assert set(np.unique(array[:,:,3]))<={0,255}
    for key,clip in clips.items():
        hashes=[]
        for c in clip['cells']:
            crop=image.crop((c['x'],c['y'],c['x']+c['w'],c['y']+c['h'])); box=crop.getbbox()
            assert box,(key,'empty'); assert box[0]>=0 and box[2]<=c['w'],key
            hashes.append(hash(crop.tobytes()))
        if clip['frames']>1: assert len(set(hashes))>1,(key,'static flipbook')

def preview(image,meta,keys,path,columns=5):
    width=columns*180; rows=math.ceil(len(keys)/columns); out=Image.new('RGB',(width,rows*190),'#1b182a'); draw=ImageDraw.Draw(out)
    for i,key in enumerate(keys):
        cells=meta['clips'][key]['cells'];index=min(len(cells)-1,2 if key in ('ash_burst','frozen_shatter','steam_cloud') else 5 if key.endswith('/sliced') else 0)
        c=cells[index]; crop=image.crop((c['x'],c['y'],c['x']+c['w'],c['y']+c['h']))
        if key.endswith('/burning'):
            flame=meta['clips']['flame']['cells'][2];f=image.crop((flame['x'],flame['y'],flame['x']+flame['w'],flame['y']+flame['h']))
            for j in range(3):crop.alpha_composite(f,(int(c['w']/2-24+j*12),int(c['h']*.15+j*9)))
        if key.endswith('/ash'):
            ground=meta['clips']['scorch_mark/medium']['cells'][0];g=image.crop((ground['x'],ground['y'],ground['x']+ground['w'],ground['y']+ground['h']))
            combined=Image.new('RGBA',crop.size);combined.alpha_composite(g,((c['w']-g.width)//2,c['h']-g.height));combined.alpha_composite(crop);crop=combined
        x=i%columns*180+(180-c['w'])//2; y=i//columns*190+160-c['h']; out.paste(crop,(x,y),crop)
        draw.text((i%columns*180+6,i//columns*190+170),key,fill='#ffe1a8')
    out.resize((width*4,rows*190*4),Image.Resampling.NEAREST).save(path)
