"""Recheck every baked frame; never accept a skipped geometry check."""
import bpy,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from pixel_pipeline import ROOT,audit_meshes
for folder,blend in [('quanle','quanle-pixel-v1.blend'),('quanle/beasts','quanle-vfx-pixel.blend'),('actors','actors-pixel-v1.blend'),('thienvu/held-weapons','thienvu-held-weapons.blend')]:
 directory=ROOT/'design/blender'/folder
 bpy.ops.wm.open_mainfile(filepath=str(directory/blend))
 names=[o.name for o in bpy.context.scene.objects if o.type=='MESH' and 'cell' in o]
 audit=audit_meshes(names,'Eyes, neon inlays, clothing details and emitted VFX are independent 2D sprite layers; no 3D runtime meshes.')
 report=json.loads((directory/'bake-report.json').read_text(encoding='utf-8'))
 report['geometry_audit']=audit;report['pass']=audit['pass']
 (directory/'bake-report.json').write_text(json.dumps(report,separators=(',',':')),encoding='utf-8')
 print(json.dumps({'asset':folder,'frames':len(names),'pass':audit['pass'],'errors':audit['errors'],'warnings':len(audit['warnings'])}),flush=True)
 assert audit['pass'] and audit['allFramesChecked']
