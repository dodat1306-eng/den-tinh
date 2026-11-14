"""Compare shipped native texels and shared Q transforms on one foot baseline."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
def atlas(name):
    meta=json.loads((ROOT/'assets'/f'{name}.json').read_text(encoding='utf-8'))
    return Image.open(ROOT/meta['image']).convert('RGBA'),meta
def tile(sheet,cell):
    return sheet.crop((cell['x'],cell['y'],cell['x']+cell['w'],cell['y']+cell['h']))

hero,h=atlas('quanle-pixel-v1');armor,q=atlas('quanle-vfx-pixel')
hoa,v=atlas('hoavi-pixel-v08');thien,t=atlas('thienvu-pixel-v08');actors,a=atlas('actors-pixel-v1')
samples=[('HoaVi',hoa,v['actions']['idle']['directions']['S'][0]),('Thiên Vũ',thien,t['forms']['lightning']['actions']['idle']['directions']['S'][0])]
samples += [('Quân Lê · Q '+view,hero,h['clips'][view+'/idle']['cells'][0]) for view in ['S','E','N','W']]
samples += [(name,actors,a['clips'][key+'/idle']['cells'][0]) for name,key in [('An','an_S'),('Linh','linh_S'),('NPC','elder')]]
out=Image.new('RGB',(len(samples)*116,116),'#171c2b');d=ImageDraw.Draw(out)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',9)
baseline=70;heights={}
d.line((0,baseline,out.width,baseline),fill='#638a96')
for n,(name,sheet,cell) in enumerate(samples):
    body=tile(sheet,cell);bbox=body.getbbox();height=bbox[3]-bbox[1];heights[name]=height
    assert (38<=height<=44 if name.startswith('Quân') and not name.endswith('S') else 41<=height<=44),(name,height)
    x=n*116+58-32;y=baseline-58
    if name.startswith('Quân'):
        view=name[-1]
        for layer in ['back','body','front']:
            if layer=='body':out.paste(body,(x,y),body);continue
            clip=q['clips']['shadow_armor_'+layer+'/'+view]
            assert clip['frames']==6
            for c in clip['cells']:
                assert (c['anchorX'],c['anchorY'],c['w'],c['h'])==(32,58,64,64)
                assert c['worldScale']==cell['worldScale'] and c['worldLift']==cell['worldLift']
                assert c['bbox'][1]>=bbox[1],(view,layer,'armor above head')
            im=tile(armor,clip['cells'][0]);out.paste(im,(x,y),im)
    else:out.paste(body,(x,y),body)
    d.text((n*116+5,82),name,font=font,fill='#e8f4ff')
    d.text((n*116+5,97),f'{height} texels / 2x: {height*2}px',font=font,fill='#a0c3c8')
out.resize((out.width*4,out.height*4),Image.Resampling.NEAREST).save(HERE/'scale-and-q-verification.png')
(HERE/'scale-and-q-verification.json').write_text(json.dumps({'pass':True,'nativeHeight':heights,'displayScale':2,'anchor':[32,58],'armorFramesPerView':6,'sharedTransform':True},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(heights,ensure_ascii=False))
