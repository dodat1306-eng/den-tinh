"""Render Blender loadouts; quantize binary-alpha 64px cells and pack 980 frames."""
import argparse, json, math, sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
WORK=ROOT/'runtime/thienvu-npc-pixel'
VIEWS={'S':0,'E':math.pi/2,'N':math.pi,'W':-math.pi/2}

def worker(args):
    import bpy
    from mathutils import Vector
    from bpy_extras.object_utils import world_to_camera_view
    bpy.ops.wm.open_mainfile(filepath=str(HERE/'thienvu-pixel-v08.blend'))
    scene=bpy.context.scene;rig=bpy.data.objects['THIENVU_Armature']
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1;scene.cycles.use_denoising=False
    scene.render.use_persistent_data=True;scene.render.threads_mode='FIXED';scene.render.threads=4
    spec=json.loads((HERE/'rig-pixel-v08.json').read_text(encoding='utf-8'))
    for form in args.forms.split(','):
        for name in spec['forms']:
            bpy.data.collections[name].hide_render=name!=form
            bpy.data.collections[name].hide_viewport=name!=form
        folder=WORK/form;folder.mkdir(parents=True,exist_ok=True);marks={}
        for name,clip in spec['clips'].items():
            rig.animation_data.action=bpy.data.actions[name]
            for direction,angle in VIEWS.items():
                rig.rotation_euler.z=angle
                for f in range(clip['frames']):
                    scene.frame_set(f+1)
                    if form=='light':rig.pose.bones['orbit'].rotation_euler.z=math.tau*f/clip['frames']
                    bpy.context.view_layer.update();key=f'{name}-{direction}-{f:02}'
                    def point(owner,v):
                        bone=rig.pose.bones[owner]
                        mat=bone.matrix@rig.data.bones[owner].matrix_local.inverted()
                        p=world_to_camera_view(scene,scene.camera,rig.matrix_world@mat@Vector(v))
                        return [round(p.x*64),round((1-p.y)*64)]
                    marks[key]={'face':point('head',(0,-.34,1.51)),
                        'eyes':[point('head',(x,-.35,1.54)) for x in [-.15,.15]],
                        'hair':point('head',(0,-.3,1.97)),
                        'gauntlet':point('hand.R',(-.49,-.30,.79)),
                        'leftHand':point('hand.L',(.49,-.29,.79)),
                        'foot':point('leg.L',(.18,-.1,.08))}
                    target=folder/(key+'.png')
                    if not args.resume or not target.exists():
                        scene.render.filepath=str(target);bpy.ops.render.render(write_still=True)
                    if args.smoke:
                        (folder/'landmarks-smoke.json').write_text(json.dumps(marks),encoding='utf-8');return
        (folder/'landmarks.json').write_text(json.dumps(marks),encoding='utf-8')
        print(json.dumps({'form':form,'rendered':len(marks)}),flush=True)

def pack():
    import numpy as np
    from PIL import Image,ImageDraw,ImageFont
    spec=json.loads((HERE/'rig-pixel-v08.json').read_text(encoding='utf-8'))
    ink=tuple(bytes.fromhex('100b18'))
    atlas=Image.new('RGBA',(1024,math.ceil(980/16)*64));index=0
    meta={'image':'assets/thienvu-pixel-v08.png','width':atlas.width,'height':atlas.height,
          'cell':64,'displaySize':128,'cloneDisplaySize':96,'anchorX':32,'anchorY':58,
          'views':list(VIEWS),'viewYawDegrees':{k:round(math.degrees(v)) for k,v in VIEWS.items()},
          'common':spec['common'],'forms':{}}
    clipped=[];heights={};motions={}
    for form,data in spec['forms'].items():
        palette=np.array([tuple(bytes.fromhex(h[1:])) for h in data['palette']],dtype=np.int32)
        folder=WORK/form;marks=json.loads((folder/'landmarks.json').read_text())
        target={'palette':data['palette'],'actions':{}};meta['forms'][form]=target
        for name,clip in spec['clips'].items():
            out={**clip,'directions':{}};target['actions'][name]=out
            for direction in VIEWS:
                cells=[]
                for f in range(clip['frames']):
                    key=f'{name}-{direction}-{f:02}'
                    a=np.array(Image.open(folder/(key+'.png')).convert('RGBA'))
                    mask=a[:,:,3]>=128
                    # Isolated one-pixel render dust is not an accessory.
                    neighbors=np.zeros_like(mask,dtype=np.uint8)
                    neighbors[1:]+=mask[:-1];neighbors[:-1]+=mask[1:];neighbors[:,1:]+=mask[:,:-1];neighbors[:,:-1]+=mask[:,1:]
                    mask &= neighbors>0
                    dist=((a[:,:,:3].astype(np.int32)[:,:,None,:]-palette[None,None,:,:])**2).sum(3)
                    a[:,:,:3]=palette[dist.argmin(2)];a[:,:,3]=mask*255;a[~mask]=0
                    im=Image.fromarray(a);pen=ImageDraw.Draw(im);m=marks[key]
                    if direction!='N':
                        centers=m['eyes'] if direction=='S' else [m['face']]
                        for cx,cy in centers:
                            if direction!='S':
                                pen.rectangle((cx-2,cy-1,cx+1,cy+3),fill='#f6c9b2')
                            pen.rectangle((cx-1,cy-1,cx+1,cy+1),fill='#100b18')
                            pen.point((cx,cy),fill=data['palette'][-2] if form in ['lightning','nature'] else data['palette'][-1])
                            pen.point((cx,cy-1),fill='#ffffff')
                            pen.line((cx-2,cy-3,cx+1,cy-2),fill='#4a5268')
                        cx,cy=m['face'];pen.point((cx,cy+4),fill='#b87664')
                    gx,gy=m['gauntlet']
                    if 2<=gx<62 and 2<=gy<62 and im.getpixel((gx,gy))[3]:
                        pen.rectangle((gx-1,gy-1,gx+1,gy+1),fill=data['palette'][13]);pen.point((gx,gy),fill='#ffffff')
                    a=np.array(im);mask=a[:,:,3]>0
                    expanded=mask.copy();expanded[1:]|=mask[:-1];expanded[:-1]|=mask[1:];expanded[:,1:]|=mask[:,:-1];expanded[:,:-1]|=mask[:,1:]
                    a[expanded&~mask]=(*ink,255)
                    im=Image.fromarray(a);bbox=im.getbbox()
                    if not bbox or min(bbox[:2])<1 or max(bbox[2:])>=64:clipped.append([form,key,bbox])
                    x=(index%16)*64;y=(index//16)*64;index+=1;atlas.paste(im,(x,y))
                    cells.append({'x':x,'y':y,'w':64,'h':64,'bbox':bbox,'landmarks':m})
                out['directions'][direction]=cells
        heights[form]=[c['bbox'][3]-c['bbox'][1] for c in target['actions']['idle']['directions']['S']]
        motions[form]={}
        for name in ['dash','attack','q_cast','e_cast','r_ult']:
            motions[form][name]={}
            for direction in VIEWS:
                pts=[c['landmarks']['gauntlet'] for c in target['actions'][name]['directions'][direction]]
                motions[form][name][direction]=round(max(math.dist(a,b) for a in pts for b in pts),2)
    assert index==980,index
    assert not clipped,clipped
    atlas.save(ROOT/meta['image']);raw=json.dumps(meta,separators=(',',':'))
    (ROOT/'assets/thienvu-pixel-v08.json').write_text(raw,encoding='utf-8')
    (ROOT/'assets/thienvu-pixel-v08.js').write_text('globalThis.DTThienVuAtlas='+raw+';\n',encoding='utf-8')
    # All actions for all forms; four directions are included in the source atlas.
    preview=Image.new('RGB',(16+6*64+100,36+7*8*70),'#142b32');pen=ImageDraw.Draw(preview)
    pen.text((8,8),'THIEN VU / 7 LOADOUTS / 8 ACTIONS / 64px / S',fill='#dce5f7')
    row=0
    for form,data in meta['forms'].items():
        for name,clip in data['actions'].items():
            y=32+row*70;row+=1;pen.text((4,y+4),form+'\n'+name,fill=tuple(bytes.fromhex(data['palette'][13][1:])))
            for i,c in enumerate(clip['directions']['S']):
                im=atlas.crop((c['x'],c['y'],c['x']+64,c['y']+64));preview.paste(im,(100+i*64,y),im)
    fx=HERE/'thienvu-pixel-vfx-preview.png'
    if fx.exists():
        other=Image.open(fx);sheet=Image.new('RGB',(max(preview.width,other.width),preview.height+other.height),'#142b32');sheet.paste(preview);sheet.paste(other,(0,preview.height));preview=sheet
    preview.resize((preview.width*4,preview.height*4),Image.Resampling.NEAREST).save(HERE/'thienvu-pixel-sheet-preview.png')
    report={'pass':True,'baseFrames':index,'engine':'CYCLES CPU, 1 sample, unlit emission','alpha':[0,255],'idleHeight':heights,'gauntletTravelPixels':motions,'clippedFrames':clipped}
    (HERE/'bake-pixel-v08.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))

def review():
    from PIL import Image,ImageDraw,ImageFont
    meta=json.loads((ROOT/'assets/thienvu-pixel-v08.json').read_text(encoding='utf-8'))
    fx=json.loads((ROOT/'assets/thienvu-vfx-pixel.json').read_text(encoding='utf-8'))
    atlas=Image.open(ROOT/meta['image']).convert('RGBA');vfx=Image.open(ROOT/fx['image']).convert('RGBA')
    out=Image.new('RGB',(1280,1440),'#102632');d=ImageDraw.Draw(out)
    font=lambda size:ImageFont.truetype('C:/Windows/Fonts/arial.ttf',size)
    d.text((28,22),'THIÊN VŨ / BẢY NGUYÊN TỐ',font=font(34),fill='#fff0bd')
    d.text((28,68),'Vũ khí riêng · NPC tự chiến đấu · Atlas dùng chung Web / Unity',font=font(21),fill='#a9c9ce')
    labels=[('SÉT','Kiếm Sét'),('GIÓ','Quạt Chiến'),('ĐẤT','Đôi Găng Đá'),('LỬA','Vòng Cưa Lửa'),('BĂNG','Búa Tạ Băng'),('MỘC','Roi Dây Gai'),('ÁNH SÁNG','Mắt / Vòng Sáng')]
    def tile(sheet,c,scale=2):
        return sheet.crop((c['x'],c['y'],c['x']+c['w'],c['y']+c['h'])).resize((c['w']*scale,c['h']*scale),Image.Resampling.NEAREST)
    for i,(form,data) in enumerate(meta['forms'].items()):
        x=24+i*176;col=data['palette'][13];d.rectangle((x,110,x+166,366),fill='#183441')
        im=tile(atlas,data['actions']['idle']['directions']['S'][0]);out.paste(im,(x+19,118),im)
        d.text((x+12,250),labels[i][0],font=font(22),fill=col);d.text((x+12,282),labels[i][1],font=font(17),fill='#d2e3df')
        im=tile(vfx,fx['clips']['crest_'+form]['cells'][1]);out.paste(im,(x+59,310),im)
    samples=[('golem_smash','GOLEM / 18s'),('treant_whip','TREANT / 30s'),('fire_breath','PHUN LỬA'),('tornado_mesh','LỐC XOÁY'),('earth_spikes','DÃY NÚI ĐÁ'),('solar_prism','LĂNG KÍNH')]
    for i,(key,label) in enumerate(samples):
        x=24+i*208;im=tile(vfx,fx['clips'][key]['cells'][2]);im.thumbnail((192,190),Image.Resampling.NEAREST)
        out.paste(im,(x+(192-im.width)//2,394+(190-im.height)//2),im);d.text((x+5,592),label,font=font(19),fill='#fff0bd')
    shot=HERE/'thienvu-npc-summons.png'
    if shot.exists():out.paste(Image.open(shot).convert('RGB'),(0,650))
    d.text((28,1392),'Ảnh game dùng cảnh kiểm tra tái lập · Pixel nearest · Alpha 0/255',font=font(20),fill='#a9c9ce')
    out.save(HERE/'thienvu-boboiboy-7elements-preview.png')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--worker',action='store_true');p.add_argument('--forms',default='lightning');p.add_argument('--smoke',action='store_true');p.add_argument('--resume',action='store_true');p.add_argument('--review',action='store_true')
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None)
    if a.review:review()
    elif a.worker:worker(a)
    else:pack();review()
