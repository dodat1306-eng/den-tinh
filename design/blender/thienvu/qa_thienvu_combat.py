"""Reproducible source-mesh checks and multi-angle views before pixel delivery."""
import json, sys
from pathlib import Path
import bpy

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(Path.home()/'.agents/skills/blender-asset-qa/scripts'))
import qa_check, review_shots

report={}
for filename in ['thienvu-pixel-v08.blend','thienvu-combat-mesh.blend']:
    bpy.ops.wm.open_mainfile(filepath=str(HERE/filename))
    for c in bpy.data.collections:c.hide_viewport=False
    for ob in bpy.context.scene.objects:ob.hide_set(False)
    bpy.context.view_layer.update()
    groups={c.name:[o.name for o in c.objects if o.type=='MESH'] for c in bpy.context.scene.collection.children}
    groups={k:v for k,v in groups.items() if v}
    if 'pixel-v08' in filename:
        common=groups.pop('TV_Common')
        for key in groups:groups[key]=common+groups[key]
    for key,objects in groups.items():
        # Shader-only sources bake to PNG; UVs have no texture inputs to validate.
        physical=[n for n in objects if not bpy.data.objects[n].get('intentional_floating')]
        result=qa_check.run(objects=physical,profile='game',uv=False,tol=.025,eps=.0002)
        for n in set(objects)-set(physical):
            isolated=qa_check.run(objects=[n],profile='game',uv=False,tol=.025,eps=.0002)
            if isolated['errors']:result['errors'].extend(isolated['errors']);result['pass']=False
        if 'combat-mesh' in filename:
            # VFX rays, crests and flame packets deliberately float. Check each mesh
            # separately too; keep the full collection check for inter-object z-fighting.
            intended=[e for e in result['errors'] if e.startswith('floating/detached')]
            result['errors']=[e for e in result['errors'] if e not in intended]
            result['intentionalFloatingVFX']=intended
            result['pass']=not result['errors']
            for n in objects:
                isolated=qa_check.run(objects=[n],profile='game',uv=False,tol=.025,eps=.0002)
                if isolated['errors']:result['errors'].extend(isolated['errors']);result['pass']=False
        report[filename+'/'+key]=result
    target='lightning' if 'pixel-v08' in filename else 'golem_walk'
    for mode in ['random','wire']:
        review_shots.run(objects=groups[target],out=str(HERE/('combat-'+target+'-'+mode+'.png')),views=['front','right','back','three_quarter'],mode=mode,res=256)
(HERE/'qa-combat-geometry.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
errors={k:v['errors'] for k,v in report.items() if v['errors']}
warnings={k:len(v['warnings']) for k,v in report.items() if v['warnings']}
print(json.dumps({'pass':not errors,'errors':errors,'warningCounts':warnings},ensure_ascii=False),flush=True)
if errors:sys.exit(1)
