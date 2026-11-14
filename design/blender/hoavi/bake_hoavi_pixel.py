"""Render all chibi actions, hard-quantize each 64px frame, clean faces and pack."""
import argparse, json, math, subprocess, sys, time
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
WORK=ROOT/'runtime/hoavi-pixel'
# ponytail: four character views; add diagonal yaws and frame selection after art approval.
VIEWS={'S':0,'E':math.pi/3,'N':math.pi,'W':-math.pi/3}

def worker(args):
    import bpy
    from mathutils import Vector
    from bpy_extras.object_utils import world_to_camera_view
    bpy.ops.wm.open_mainfile(filepath=str(HERE/'hoavi-pixel-v08.blend'))
    scene=bpy.context.scene;rig=bpy.data.objects['HOAVI_Armature'];scene.render.engine=args.engine
    camera=scene.camera;ratio=45/41;local=camera.matrix_world.inverted()@Vector((0,0,0))
    camera.location+=camera.rotation_euler.to_matrix()@Vector(((1-ratio)*local.x,(1-ratio)*local.y,0))
    camera.data.ortho_scale*=ratio
    if args.engine=='CYCLES':scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=False
    else:scene.eevee.taa_render_samples=1
    folder=WORK/args.engine;folder.mkdir(parents=True,exist_ok=True);landmarks={}
    spec=json.loads((HERE/'rig-pixel-v08.json').read_text(encoding='utf-8'))
    for name,clip in spec['clips'].items():
        rig.animation_data.action=bpy.data.actions[name]
        for direction,angle in VIEWS.items():
            rig.rotation_euler.z=angle
            for f in range(clip['frames']):
                scene.frame_set(f+1);bpy.context.view_layer.update();key=f'{name}-{direction}-{f:02}'
                head=rig.pose.bones['head'].matrix@rig.data.bones['head'].matrix_local.inverted()
                def point(v):
                    p=world_to_camera_view(scene,scene.camera,rig.matrix_world@head@Vector(v));return [round(p.x*64),round((1-p.y)*64)]
                landmarks[key]={'face':point((0,-.38,1.54)),'eyes':[point((x,-.38,1.54)) for x in [-.15,.15]],'flower':point((-.38,-.43,1.81))}
                scene.render.filepath=str(folder/(key+'.png'));bpy.ops.render.render(write_still=True)
                if args.smoke:
                    (folder/'landmarks.json').write_text(json.dumps(landmarks),encoding='utf-8');return
    (folder/'landmarks.json').write_text(json.dumps(landmarks),encoding='utf-8')

def pack(engine):
    import numpy as np
    from PIL import Image,ImageDraw
    info=json.loads((HERE/'rig-pixel-v08.json').read_text(encoding='utf-8'))
    palette=np.array([tuple(bytes.fromhex(h[1:])) for h in info['palette']],dtype=np.int32)
    folder=WORK/engine;marks=json.loads((folder/'landmarks.json').read_text())
    def clean(im,key,direction):
        a=np.array(im.convert('RGBA').resize((64,64),Image.Resampling.NEAREST));mask=a[:,:,3]>=128
        d=((a[:,:,:3].astype(np.int32)[:,:,None,:]-palette[None,None,:,:])**2).sum(3)
        a[:,:,:3]=palette[d.argmin(2)];a[:,:,3]=mask*255;a[~mask]=0
        out=Image.fromarray(a);pen=ImageDraw.Draw(out);m=marks[key]
        if direction!='N':
            if direction in ['E','W']:
                cx,cy=m['face'];s=1 if direction=='E' else -1
                pen.polygon([(cx-s*4,cy-4),(cx+s,cy-3),(cx+s*2,cy+2),(cx+s,cy+5),(cx-s*3,cy+5)],fill='#f6c9b2')
                pen.line((cx,cy+4,cx+s,cy+4),fill='#b87664')
            centers=m['eyes'] if direction=='S' else [m['eyes'][0 if direction=='E' else 1]]
            for cx,cy in centers:
                # Fixed bitmap rim and flat anime eye; only the landmark moves with the rig.
                if direction!='S':cx=m['face'][0]+(-2 if direction=='E' else 2)
                pen.rectangle((cx-2,cy-1,cx+2,cy+1),fill='#f6c9b2')
                pen.rectangle((cx-1,cy-1,cx+1,cy+1),fill='#12091a')
                pen.rectangle((cx,cy,cx+1,cy+1),fill='#1fc8db');pen.point((cx,cy-1),fill='#eeffff')
                rim=['  xxx  ',' x   x ','x     x','x     x','x     x',' x   x ','  xxx  ']
                for yy,row in enumerate(rim):
                    for xx,ch in enumerate(row):
                        if ch=='x':pen.point((cx+xx-3,cy+yy-3),fill='#f7cb63')
            if direction=='S':
                cx,cy=m['face'];pen.line((cx-1,cy-1,cx+1,cy-1),fill='#cf8d36')
            fx,fy=m['flower']
            if direction in ['S','E']:
                pen.rectangle((fx-1,fy-2,fx+1,fy+2),fill='#f291c7');pen.rectangle((fx-2,fy-1,fx+2,fy+1),fill='#f291c7');pen.point((fx,fy),fill='#f7cb63')
        a=np.array(out);mask=a[:,:,3]>0
        # Remove isolated one-pixel dust; preserve connected 1px stems/details.
        near=np.zeros_like(mask,dtype=np.uint8);near[1:]+=mask[:-1];near[:-1]+=mask[1:];near[:,1:]+=mask[:,:-1];near[:,:-1]+=mask[:,1:]
        a[mask&(near==0)]=0;mask=a[:,:,3]>0
        edge=np.zeros_like(mask);edge[1:]|=mask[:-1];edge[:-1]|=mask[1:];edge[:,1:]|=mask[:,:-1];edge[:,:-1]|=mask[:,1:];edge&=~mask
        a[edge]=(*bytes.fromhex('12091a'),255)
        return Image.fromarray(a)
    atlas=Image.new('RGBA',(8*64,(len(info['clips'])*4+4)*64))
    meta={'image':'assets/hoavi-pixel-v08.png','width':atlas.width,'height':atlas.height,'cell':64,'displaySize':128,'anchorX':32,'anchorY':58,'views':list(VIEWS),'viewYawDegrees':{k:round(math.degrees(v)) for k,v in VIEWS.items()},'palette':info['palette'],'actions':{},'ghost':{}}
    frames=[];row=0
    for name,clip in info['clips'].items():
        target={**clip,'loop':name in ['idle','run'],'directions':{}};meta['actions'][name]=target
        for direction in VIEWS:
            cells=[]
            for f in range(clip['frames']):
                key=f'{name}-{direction}-{f:02}';im=clean(Image.open(folder/(key+'.png')),key,direction)
                bbox=im.getbbox();assert bbox and min(bbox[:2])>=1 and bbox[2]<64 and bbox[3]<64,(key,bbox)
                x=f*64;y=row*64;atlas.paste(im,(x,y));cells.append({'x':x,'y':y,'w':64,'h':64,'bbox':bbox});frames.append((name,direction,im))
            target['directions'][direction]=cells;row+=1
    for direction in VIEWS:
        cells=[]
        for f,src in enumerate(meta['actions']['q_debug']['directions'][direction]):
            im=atlas.crop((src['x'],src['y'],src['x']+64,src['y']+64));a=np.array(im)
            for y in range(64):a[y,a[y,:,3]>0,:3]=list(bytes.fromhex('1fc8db' if (y//2)%2==0 else 'a566cc'))
            a[1::2,:,3]=0;im=Image.fromarray(a);x=f*64;y=row*64;atlas.paste(im,(x,y));cells.append({'x':x,'y':y,'w':64,'h':64})
        meta['ghost'][direction]=cells;row+=1
    (ROOT/'assets/hoavi-pixel-v08.png').parent.mkdir(exist_ok=True)
    atlas.save(ROOT/meta['image']);raw=json.dumps(meta,separators=(',',':'))
    (ROOT/'assets/hoavi-pixel-v08.json').write_text(raw,encoding='utf-8');(ROOT/'assets/hoavi-pixel-v08.js').write_text('globalThis.DTHoaViAtlas='+raw+';\n',encoding='utf-8')
    # Review rows are native pixels, enlarged exactly 4x; labels sit outside cells.
    preview=Image.new('RGB',(560,40+(len(info['clips'])+1)*4*70),'#142b32');pen=ImageDraw.Draw(preview)
    pen.text((8,8),'HoaVi / 64px / 4 views / 9 clips / exact palette',fill='#eeffff')
    for r,(name,clip) in enumerate(meta['actions'].items()):
        for d,direction in enumerate(VIEWS):
            y=35+(r*4+d)*70;pen.text((0,y+2),name+' '+direction,fill='#66fff7')
            for f,cell in enumerate(clip['directions'][direction]):preview.paste(atlas.crop((cell['x'],cell['y'],cell['x']+64,cell['y']+64)),(40+f*64,y),atlas.crop((cell['x'],cell['y'],cell['x']+64,cell['y']+64)))
    for d,direction in enumerate(VIEWS):
        y=35+(len(meta['actions'])*4+d)*70;pen.text((0,y+2),'ghost '+direction,fill='#a566cc')
        for f,cell in enumerate(meta['ghost'][direction]):
            im=atlas.crop((cell['x'],cell['y'],cell['x']+64,cell['y']+64));preview.paste(im,(40+f*64,y),im)
    enlarged=preview.resize((preview.width*4,preview.height*4),Image.Resampling.NEAREST);enlarged.save(HERE/'hoavi-pixel-character-preview.png')
    fx_preview=HERE/'hoavi-pixel-vfx-preview.png'
    if fx_preview.exists():
        fx=Image.open(fx_preview);sheet=Image.new('RGB',(max(enlarged.width,fx.width),enlarged.height+fx.height),'#142b32');sheet.paste(enlarged);sheet.paste(fx,(0,enlarged.height));sheet.save(HERE/'hoavi-pixel-sheet-preview.png')
    # One readable 4x motion preview, all nine moves, front view.
    gifs=[]
    for name,clip in meta['actions'].items():
        for cell in clip['directions']['S']:
            frame=Image.new('RGB',(150,90),'#142b32');p=ImageDraw.Draw(frame);p.text((3,3),name,fill='#66fff7');im=atlas.crop((cell['x'],cell['y'],cell['x']+64,cell['y']+64));frame.paste(im,(43,22),im);gifs.append(frame.resize((600,360),Image.Resampling.NEAREST))
    gifs[0].save(HERE/'hoavi-pixel-motion.gif',save_all=True,append_images=gifs[1:],duration=100,loop=0,disposal=2)
    heights=[im.getbbox()[3]-im.getbbox()[1] for n,d,im in frames if n=='idle']
    report={'pass':True,'baseFrames':len(frames),'ghostFrames':24,'cell':[64,64],'paletteColors':len(palette),'alpha':[0,255],'idleHeight':heights,'engine':engine,'clippedFrames':0}
    (HERE/'bake-pixel-v08.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report),flush=True)

def main(args):
    if args.verify_only:
        verify();return
    WORK.mkdir(parents=True,exist_ok=True);engine=None
    for candidate in ['BLENDER_EEVEE','CYCLES']:
        base=[args.blender,'-b','--python-exit-code','1','-P',str(Path(__file__).resolve()),'--','--worker','--engine',candidate]
        try:
            with (WORK/(candidate+'-smoke.log')).open('w',encoding='utf-8') as log:r=subprocess.run(base+['--smoke'],stdout=log,stderr=subprocess.STDOUT,timeout=60)
            if r.returncode:continue
            if not args.smoke:
                with (WORK/(candidate+'-render.log')).open('w',encoding='utf-8') as log:r=subprocess.run(base,stdout=log,stderr=subprocess.STDOUT,timeout=1500)
                if r.returncode:continue
            engine=candidate;break
        except subprocess.TimeoutExpired:continue
    if not engine:raise RuntimeError('Both pixel render backends failed; inspect runtime/hoavi-pixel logs')
    if not args.smoke:pack(engine);verify()
    else:print(json.dumps({'engine':engine,'smoke':True}))

def verify():
    import numpy as np
    from PIL import Image
    meta=json.loads((ROOT/'assets/hoavi-pixel-v08.json').read_text());vfx=json.loads((ROOT/'assets/hoavi-vfx-pixel.json').read_text());allowed={tuple(bytes.fromhex(h[1:])) for h in meta['palette']}
    assert len(allowed)==25
    total=0
    for spec in [meta,vfx]:
        im=Image.open(ROOT/spec['image']).convert('RGBA');a=np.array(im)
        assert set(np.unique(a[:,:,3])).issubset({0,255}),spec['image']
        colors={tuple(v) for v in a[a[:,:,3]>0,:3]};assert colors<=allowed,(spec['image'],colors-allowed)
        assert im.size==(spec['width'],spec['height'])
        for name,clip in spec.get('actions',spec.get('clips')).items():
            groups=clip.get('directions',{'VFX':clip.get('cells')})
            for direction,cells in groups.items():
                hashes=[]
                for f in cells:
                    crop=im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']));assert crop.getbbox(),(name,direction)
                    hashes.append(hash(crop.tobytes()))
                    if spec is meta:
                        total+=1;assert crop.size==(64,64)
                        p=np.array(crop);mask=p[:,:,3]>0;inside=mask.copy();inside[1:]&=mask[:-1];inside[:-1]&=mask[1:];inside[:,1:]&=mask[:,:-1];inside[:,:-1]&=mask[:,1:]
                        assert np.all(p[mask&~inside,:3]==np.array([18,9,26])),(name,direction,'outline not 1px ink')
                if len(cells)>1:assert len(set(hashes))>1,(name,direction,'frozen clip')
    ghosts=0;im=Image.open(ROOT/meta['image']).convert('RGBA')
    for cells in meta['ghost'].values():
        assert len(cells)==6
        for f in cells:
            a=np.array(im.crop((f['x'],f['y'],f['x']+64,f['y']+64)));assert not a[1::2,:,3].any()
            assert {tuple(v) for v in a[a[:,:,3]>0,:3]}=={tuple(bytes.fromhex('1fc8db')),tuple(bytes.fromhex('a566cc'))};ghosts+=1
    assert total==208 and len(meta['actions'])==9 and ghosts==24
    assert (meta['anchorX'],meta['anchorY'])==(32,58)
    result={'pass':True,'baseFrames':total,'ghostFrames':ghosts,'ghostCyanPurpleScanlines':True,'vfxFrames':sum(c['frames'] for c in vfx['clips'].values()),'paletteColors':len(allowed),'binaryAlpha':True,'onePixelOutline':True,'allClipsMove':True}
    (HERE/'pixel-assets-verified.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--worker',action='store_true');p.add_argument('--smoke',action='store_true');p.add_argument('--verify-only',action='store_true');p.add_argument('--engine',default='BLENDER_EEVEE');p.add_argument('--blender',default=r'E:\Tools\Blender\5.2.3\blender.exe');a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None)
    worker(a) if a.worker else main(a)
