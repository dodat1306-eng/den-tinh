"""Runnable acceptance check for every baked pixel cell and all elemental VFX."""
import hashlib, json, math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]

def review(atlas,meta):
    shots=['transform-q','ice-e','five-cast','seven-r']
    if not all((HERE/('thienvu-game-'+name+'.png')).exists() for name in shots):return
    image=Image.new('RGB',(2304,2072),'#142b32');d=ImageDraw.Draw(image)
    font=ImageFont.truetype(str(ROOT/'assets/fonts/NotoSans-Regular.ttf'),20)
    def label(x,y,text):d.text((x,y),text,font=font,fill='#dce5f7')
    def pose(form,action,index,x,y):
        c=meta['forms'][form]['actions'][action]['directions']['S'][index]
        tile=atlas.crop((c['x'],c['y'],c['x']+64,c['y']+64)).resize((256,256),Image.Resampling.NEAREST)
        image.paste(tile,(x,y),tile)
    label(24,12,'THIEN VU | 64px source at 4x nearest | seven distinct loadouts')
    for i,form in enumerate(meta['forms']):
        x=24+i*316;label(x,54,form);pose(form,'idle',0,x,82)
    actions=[('idle',1),('run',2),('dash',1),('attack',1),('q_cast',2),('e_cast',3),('r_ult',3),('hit',0)]
    for i,(action,index) in enumerate(actions):
        x=24+i*284;label(x,350,action);pose('lightning',action,index,x,378)
    label(24,650,'Browser combat fixtures | staged enemies/resources | not a physical-device test')
    for i,name in enumerate(shots):
        x=24+i%2*1140;y=690+i//2*678;label(x,y,name)
        shot=Image.open(HERE/('thienvu-game-'+name+'.png')).convert('RGB')
        shot.thumbnail((1116,628),Image.Resampling.NEAREST);image.paste(shot,(x,y+32))
    image.save(HERE/'thienvu-pixel-review.png')

def main():
    meta=json.loads((ROOT/'assets/thienvu-pixel-v08.json').read_text())
    fx=json.loads((ROOT/'assets/thienvu-vfx-pixel.json').read_text())
    bake=json.loads((HERE/'bake-pixel-v08.json').read_text())
    atlas=Image.open(ROOT/meta['image']).convert('RGBA');total=0;silhouettes=set()
    ink=np.array([16,11,24]);actions={'idle':4,'run':6,'dash':3,'attack':4,'q_cast':5,'e_cast':5,'r_ult':6,'hit':2}
    assert atlas.size==(meta['width'],meta['height']) and (meta['anchorX'],meta['anchorY'])==(32,58)
    for form,spec in meta['forms'].items():
        allowed={tuple(bytes.fromhex(h[1:])) for h in spec['palette']}
        assert set(spec['actions'])==set(actions)
        for action,clip in spec['actions'].items():
            assert clip['frames']==actions[action]
            for view in meta['views']:
                hashes=[]
                for cell in clip['directions'][view]:
                    crop=atlas.crop((cell['x'],cell['y'],cell['x']+64,cell['y']+64));a=np.array(crop);mask=a[:,:,3]>0
                    assert set(np.unique(a[:,:,3]))<={0,255}
                    assert {tuple(p) for p in a[mask,:3]}<=allowed,(form,action,view,'palette')
                    assert crop.getbbox()==tuple(cell['bbox']) and min(cell['bbox'][:2])>=1 and max(cell['bbox'][2:])<64
                    inside=mask.copy();inside[1:]&=mask[:-1];inside[:-1]&=mask[1:];inside[:,1:]&=mask[:,:-1];inside[:,:-1]&=mask[:,1:]
                    assert np.all(a[mask&~inside,:3]==ink),(form,action,view,'outline')
                    hashes.append(hashlib.sha256(a.tobytes()).hexdigest());total+=1
                assert len(set(hashes))>1,(form,action,view,'frozen')
                if action in ['dash','attack','q_cast','e_cast','r_ult']:
                    assert bake['gauntletTravelPixels'][form][action][view]>=8,(form,action,view,'weak motion')
        cell=spec['actions']['idle']['directions']['S'][0];a=np.array(atlas.crop((cell['x'],cell['y'],cell['x']+64,cell['y']+64)))
        silhouettes.add(hashlib.sha256((a[:,:,3]>0).tobytes()).hexdigest())
        assert all(46<=h<=50 for h in bake['idleHeight'][form]),(form,bake['idleHeight'][form])
    assert total==980 and len(silhouettes)==7
    assert (HERE/'thienvu-pixel-v08.blend').stat().st_size>10000
    im=Image.open(ROOT/fx['image']).convert('RGBA');assert im.size==(fx['width'],fx['height'])
    all_colors={tuple(bytes.fromhex(h[1:])) for h in fx['palette']};vfx_frames=0
    for name,clip in fx['clips'].items():
        allowed={tuple(bytes.fromhex(h[1:])) for h in meta['forms'][clip['element']]['palette']} if clip['element'] else all_colors
        for c in clip['cells']:
            a=np.array(im.crop((c['x'],c['y'],c['x']+c['w'],c['y']+c['h'])));mask=a[:,:,3]>0
            assert mask.any() and set(np.unique(a[:,:,3]))<={0,255},name
            assert {tuple(p) for p in a[mask,:3]}<=allowed,name
            vfx_frames+=1
    for form in meta['forms']:
        for prefix,count,w,h in [('proj_',4,28,16),('muzzle_',3,24,24)]:
            c=fx['clips'][prefix+form];assert (c['frames'],c['w'],c['h'])==(count,w,h)
    for name in ['chain_bolt','wind_blade_q','earth_pillar','fire_dragon','ice_beam','ice_shatter','vine_whip','vine_root','light_beam_head','light_beam_body','light_beam_tail','lightning_sigil','sky_thunder','wind_vortex','wind_tornado','earth_wall','fire_orb','crystal_mirror_ice','crystal_mirror_light','nature_garden','ice_nova_strip','transform_ring','split_seal','convergence_star','convergence_hub']:
        assert name in fx['clips'],name
    preview=Image.new('RGB',(7*76,32+4*76),'#142b32');d=ImageDraw.Draw(preview)
    for j,(form,spec) in enumerate(meta['forms'].items()):
        for i,view in enumerate(meta['views']):
            cell=spec['actions']['idle']['directions'][view][0];tile=atlas.crop((cell['x'],cell['y'],cell['x']+64,cell['y']+64));preview.paste(tile,(j*76,28+i*76),tile);d.text((j*76,16+i*76),form+' '+view,fill='#dce5f7')
    preview.resize((preview.width*4,preview.height*4),Image.Resampling.NEAREST).save(HERE/'thienvu-character-preview.png')
    review(atlas,meta)
    result={'pass':True,'baseFrames':total,'distinctSilhouettes':len(silhouettes),'vfxClips':len(fx['clips']),'vfxFrames':vfx_frames,'binaryAlpha':True,'onePixelOutline':True,'palettePerForm':True,'minGauntletTravel':min(v for form in bake['gauntletTravelPixels'].values() for clip in form.values() for v in clip.values()),'clippedFrames':0}
    (HERE/'pixel-assets-verified.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))

if __name__=='__main__':main()
