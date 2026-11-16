import bpy,sys,json
from pathlib import Path
sys.path.insert(0,str(Path.home()/'.agents/skills/blender-asset-qa/scripts'))
from review_shots import run
here=Path(__file__).resolve().parent
names=['elder_000','smith_006','weaver_woman_018','automaton_07_108','dom_avatar_144']
for i,name in enumerate(names):bpy.data.objects[name].location=(i*2.5,0,0)
for mode in ['material','random','wire']:
    result=run(objects=names,out=str(here/('npc-'+mode+'-review.png')),views=['front','right','back','three_quarter'],mode=mode,res=768)
    print('@@JSON@@'+json.dumps(result))
