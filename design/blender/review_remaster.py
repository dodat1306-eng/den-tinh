import bpy,json,sys,math
from pathlib import Path
sys.path.insert(0,str(Path.home()/'.agents/skills/blender-asset-qa/scripts'))
import review_shots
@bpy.app.handlers.persistent
def wire_without_spikes(scene):
 for o in scene.objects:
  for modifier in o.modifiers:
   if modifier.name=='QA_Wire':modifier.use_even_offset=False
bpy.app.handlers.render_pre.append(wire_without_spikes)
ROOT=Path(__file__).resolve().parents[2]
groups=[
 ('design/blender/quanle/quanle-pixel-v1.blend','assets/quanle-pixel-v1.json',['S/idle','E/idle','N/idle','W/idle'],'quanle'),
 ('design/blender/quanle/beasts/quanle-vfx-pixel.blend','assets/quanle-vfx-pixel.json',None,'beasts'),
 ('design/blender/actors/actors-pixel-v1.blend','assets/actors-pixel-v1.json',[k+'/idle' for k in ['an_S','linh_S','elder','smith','ferryman','mirror_maiden','bell_keeper','sun_child','bronze_pilot','slime','boar','wisp','archer','shade','boss','boss_hotinh','boss_thietdieu']]+['golem/spawn','golem/punch','golem/smash','golem/stomp','golem/throw','treant/spawn','treant/attack'],'actors'),
 ('design/blender/thienvu/held-weapons/thienvu-held-weapons.blend','assets/thienvu-held-weapons.json',None,'weapons')]
reports=[]
requested=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
for blend,metadata,keys,label in groups:
 if requested and label not in requested:continue
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/blend))
 meta=json.loads((ROOT/metadata).read_text(encoding='utf-8'))
 if keys is None:keys=[k for k in meta['clips'] if k.endswith('/walk') or not '/' in k]+[k for k in ['wolf/spawn','dragon/attack','serpent/attack','shadow_armor_back/E','shadow_armor_front/E'] if k in meta['clips']]
 lookup={tuple(json.loads(o['cell'])[k] for k in ('x','y')):o for o in bpy.context.scene.objects if o.type=='MESH' and 'cell' in o}
 chosen=[]
 for i,key in enumerate(keys):
  cell=meta['clips'][key]['cells'][1];o=lookup[(cell['x'],cell['y'])];o.location=(i%6*4,i%6*4,-(i//6)*4.6);chosen.append(o.name)
 folder=ROOT/blend;folder=folder.parent
 for mode in ['random','wire']:
  result=review_shots.run(objects=chosen,out=str(folder/(label+'-'+mode+'-review.png')),views=['front','right','back','three_quarter'],mode=mode,res=650)
  reports.append({'group':label,'mode':mode,'keys':keys,**result})
print('@@JSON@@'+json.dumps({'reviews':reports}),flush=True)
(ROOT/'qa/v082-mesh-visual-review.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
