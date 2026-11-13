"""Blender source gate: weights, IK, stepped loops, geometry and review views."""
import bpy,json,sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
sys.path.insert(0,r'C:\Users\ASUS\.agents\skills\blender-asset-qa\scripts')
import qa_check,review_shots
rig=bpy.data.objects['HOAVI_Armature'];body=bpy.data.objects['HV_PIXEL_Character'];scene=bpy.context.scene
for v in body.data.vertices:
    assert len(v.groups)==1 and abs(v.groups[0].weight-1)<1e-6
assert len(bpy.data.actions)==9
for side in ['L','R']:
    ik=next(c for c in rig.pose.bones['shin.'+side].constraints if c.type=='IK');assert ik.chain_count==2 and not ik.use_stretch
max_ik_error=0
for act in bpy.data.actions:
    rig.animation_data.action=act
    if act['loop']:
        scene.frame_set(1);start=[b.matrix.copy() for b in rig.pose.bones];scene.frame_set(act['frames']+1)
        assert max(abs(a[i][j]-b.matrix[i][j]) for a,b in zip(start,rig.pose.bones) for i in range(4) for j in range(4))<1e-5
    assert all(k.interpolation=='CONSTANT' for l in act.layers for s in l.strips for c in s.channelbags for f in c.fcurves for k in f.keyframe_points)
    for f in range(1,act['frames']+1):
        scene.frame_set(f);bpy.context.view_layer.update()
        assert rig.pose.bones['root'].matrix.translation.length<1e-6
        for side in ['L','R']:
            error=(rig.pose.bones['shin.'+side].tail-rig.pose.bones['foot_ik.'+side].head).length;max_ik_error=max(max_ik_error,error)
            assert error<.005,(act.name,f,side,error)
assert all(all(n.type!='BSDF_PRINCIPLED' for n in m.node_tree.nodes) for m in body.data.materials)
rig.animation_data.action=bpy.data.actions['idle'];scene.frame_set(1);rig.rotation_euler.z=0
qa=qa_check.run(objects=[body.name],profile='render',eps=.00001,tol=.02,uv=False)
qa['max_ik_error_m']=max_ik_error
(HERE/'qa-pixel-geometry.json').write_text(json.dumps(qa,indent=2),encoding='utf-8')
print(json.dumps({'pass':qa['pass'],'errors':qa['errors'],'warnings':qa['warnings'],'objects':qa['objects']}),flush=True)
for mode in ['random','wire']:
    review_shots.run(objects=[body.name],out=str(HERE/f'hoavi-pixel-{mode}.png'),views=['front','right','back','three_quarter'],mode=mode,res=256)
assert qa['pass'],qa['errors']
