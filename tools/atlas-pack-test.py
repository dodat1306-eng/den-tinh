"""Run with Python + Pillow: rebuild order, texel preservation, bounds and overlap."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'design/blender'))
from atlas_pack import merge_clips

meta = json.loads((ROOT / 'assets/thienvu-vfx-pixel.json').read_text(encoding='utf-8'))
sheet = Image.open(ROOT / meta['image']).convert('RGBA')
actors = json.loads((ROOT / 'assets/actors-pixel-v1.json').read_text(encoding='utf-8'))
weapons = json.loads((ROOT / 'assets/thienvu-held-weapons.json').read_text(encoding='utf-8'))
mapping = {'golem_'+k: 'golem/'+k for k in ('spawn','idle','walk','punch','smash','stomp','throw')}
mapping.update({'treant_'+k: 'treant/'+('attack' if k=='whip' else k) for k in ('spawn','idle','walk','whip')})
mapping.update({k:k for k in ('tornado_mesh','tornado_hurricane','wind_tornado','giant_fireball','meteor_burst','earth_tremor','lightning_sigil','convergence_hub','weapon_swing_lightning','weapon_swing_earth','weapon_swing_ice','weapon_swing_nature','light_flash_step','light_backstab_slash','golem_rock')})
sources = [(Image.open(ROOT / actors['image']).convert('RGBA'), {k:actors['clips'][v] for k,v in mapping.items()}, actors['palette']),
           (Image.open(ROOT / weapons['image']).convert('RGBA'), weapons['clips'], weapons['palette'])]

def hashes(image, data):
    return {key: [hashlib.sha256(image.crop((c['x'],c['y'],c['x']+c['w'],c['y']+c['h'])).tobytes()).hexdigest() for c in clip['cells']]
            for key, clip in data['clips'].items()}

def rebuild(order):
    image, data = sheet, meta
    for index in order:
        before = hashes(image, data)
        source, clips, palette = sources[index]
        image, data = merge_clips(image, data, source, clips, palette)
        after = hashes(image, data)
        assert all(after[k] == v for k,v in before.items() if k not in clips), 'Untouched clip changed'
    return image, data

a, ma = rebuild([0,1])
b, mb = rebuild([1,0,1,0])
assert ma == mb and a.tobytes() == b.tobytes(), 'Rebuild order/growth changed atlas'
assert hashes(a, ma) == hashes(sheet, meta), 'Published atlas differs from rebuilt source'
rects=[]
for key, clip in meta['clips'].items():
    for c in clip['cells']:
        x,y,w,h = (c[k] for k in ('x','y','w','h'))
        assert 0 <= x < x+w <= sheet.width and 0 <= y < y+h <= sheet.height, key
        assert not any(x < xx+ww and xx < x+w and y < yy+hh and yy < y+h for xx,yy,ww,hh in rects), key
        rects.append((x,y,w,h))
held = [c for k,v in meta['clips'].items() if k.startswith('held_') for c in v['cells']]
others = [c for k,v in meta['clips'].items() if not k.startswith('held_') for c in v['cells']]
assert min(c['y'] for c in held) >= max(c['y']+c['h'] for c in others)
assert len(meta['clips']['held_lightning_sword']['cells']) == 4
assert hashes(sheet,meta)['held_lightning_sword'] != hashes(sheet,meta)['golem_rock'][:4]
report={'pass':True,'cells':len(rects),'clips':len(meta['clips']),'size':list(sheet.size),'heldRow':min(c['y'] for c in held),'orders':[[0,1],[1,0,1,0]]}
(ROOT/'qa/v083').mkdir(exist_ok=True,parents=True)
(ROOT/'qa/v083/atlas-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
