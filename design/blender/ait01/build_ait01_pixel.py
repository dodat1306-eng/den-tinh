"""AIT-01: four-view posed meshes (PUBG Level-3 helmet, white shirt, tie, jeans, sneakers) and floating inventory window VFX."""
import json, math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pixel_pipeline import Atlas, Mesh, ROOT, PALETTES, PITCH, UP, preview
from mathutils import Matrix, Vector
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
VIEWS = {'S': 0.0, 'E': math.pi / 3, 'N': math.pi, 'W': -math.pi / 3}
ACTIONS = {'idle': 4, 'run': 6, 'dash': 4, 'attack': 5, 'q_cast': 6, 'e_cast': 6, 'r_ult': 6, 'hit': 2}
PALETTES.update(
    aithelmet=['#14181d', '#26313a', '#435460', '#738996'],
    aitvisor=['#0d2b36', '#1b7a8c', '#4df3ff', '#e0ffff'],
    aitshirt=['#6e7885', '#a3b0bf', '#d9e2ec', '#ffffff'],
    aittie=['#2b0f18', '#5c1929', '#a82840', '#ff5972'],
    aitjeans=['#131d31', '#22385c', '#3b6094', '#6992c7'],
    aitsneaker=['#1c1d24', '#414554', '#99a1b3', '#f2f5fa'],
    aitgun=['#141218', '#2c2933', '#545061', '#8c879c'],
    aitcrate=['#4a1414', '#8c2222', '#d9383a', '#ff8566'],
    aitbrass=['#4d3319', '#8c5e28', '#d99b38', '#ffe478'],
    aitskin=['#603a33', '#a76a49', '#e8ac78', '#ffe3ba'],
)


def slot_window(m, x, y, z, kind='rifle', size=0.18, angle=0.0):
    start = len(m.verts)
    m.prism([
        (x - size * 0.78, z - size * 0.78),
        (x + size * 0.72, z - size * 0.74),
        (x + size * 0.78, z + size * 0.78),
        (x - size * 0.72, z + size * 0.74),
    ], 'aitvisor', y, 0.035)
    col = 'aitcrate' if 'rocket' in kind else 'leaf' if 'grenade' in kind else 'aitbrass' if 'shotgun' in kind else 'aitgun'
    m.path([
        (x - size * 0.48, y - 0.022, z - size * 0.18),
        (x + size * 0.52, y - 0.022, z + size * 0.22),
        (x + size * 0.08, y - 0.022, z - size * 0.05),
        (x + size * 0.18, y - 0.022, z - size * 0.45),
    ], max(0.014, size * 0.11), col, part=False)
    center = Vector((x, y, z))
    rotation = Matrix.Rotation(angle, 3, 'Y')
    m.verts[start:] = [tuple(center + rotation @ (Vector(v) - center)) for v in m.verts[start:]]


def hero(action, frame, count, view):
    m = Mesh()
    phase = frame / count * math.tau
    stride = math.sin(phase) if action in ('run', 'dash') else 0.0
    drive = ([-0.18, -0.6, 1.0, 0.65, 0.18, 0.0][min(frame, 5)] if action in ('attack', 'q_cast', 'e_cast') else 0.0)
    bob = 0.035 * math.sin(phase) + abs(stride) * 0.04

    def p(x, y, z):
        return (x, y, z + bob)

    # 1. Legs: Rugged Blue Denim Jeans + Sport Sneakers
    for side in (-1, 1):
        m.rod(p(side * 0.17, 0.0, 0.76), p(side * 0.19, -stride * side * 0.17, 0.18), 0.13, 'aitjeans')
        m.ico(p(side * 0.19, -0.07 - stride * side * 0.17, 0.10), (0.16, 0.23, 0.11), 'aitsneaker', 1)

    # 2. Torso: White Dress Shirt + Collar + Dark Red/Charcoal Tie + Belt Buckle
    m.ico(p(0, 0, 1.08), (0.31, 0.22, 0.37), 'aitshirt', 2)
    m.rod(p(0, 0, 1.33), p(0, 0, 1.47), 0.135, 'aitskin')
    m.rod(p(-0.28, -0.20, 0.86), p(0.28, -0.20, 0.86), 0.045, 'aitgun', part=False)
    m.ico(p(0, -0.25, 0.86), (0.075, 0.035, 0.065), 'aitbrass', 1, False)

    tie_sway = math.sin(phase) * 0.05 if action in ('run', 'dash', 'q_cast', 'r_ult') else 0.02 * math.sin(phase)
    m.path([
        p(-0.10, -0.19, 1.38),
        p(0.0, -0.25, 1.24),
        p(0.10, -0.19, 1.38),
    ], 0.025, 'aittie', part=False)
    m.rod(p(0, -0.255, 1.22), p(tie_sway, -0.265, 0.88), 0.048, 'aittie', end=0.018, part=False)

    # 3. Arms, Tactical SMG (Right Hand) & Floating Inventory Slots (Left Hand)
    for side in (-1, 1):
        reach = 0.62 if action == 'r_ult' else 0.47 + abs(drive) * 0.19
        elbow = p(side * 0.43, -0.02, 1.14 + (0.16 if action == 'r_ult' else 0.10 * drive))
        hand = p(side * reach, -0.25 - drive * side * 0.25, 1.10 + (0.35 if action == 'r_ult' else 0.12 * drive))
        m.rod(p(side * 0.27, 0.0, 1.30), elbow, 0.12, 'aitshirt')
        m.rod(elbow, hand, 0.10, 'aitskin')
        m.ico(hand, (0.10, 0.09, 0.10), 'aithelmet', 1)
        x, y, z = hand
        if side == -1:
            tip = (x - 0.20 - drive * 0.12, y - 0.10, z - 0.27)
            m.rod(tip, (x + 0.16, y + 0.03, z + 0.28), 0.040, 'aitgun')
            m.rod(tip, (tip[0] - 0.05, tip[1] - 0.02, tip[2] - 0.12), 0.058, 'aitbrass', end=0.018, sides=6)
            m.rod((x + 0.06, y + 0.01, z + 0.11), (x + 0.12, y + 0.02, z + 0.21), 0.052, 'aitbrass')
        else:
            for j in range(2):
                slot_window(m, x + (j - 0.5) * 0.11, y - 0.06 - j * 0.02, z + 0.16, 'rocket' if j else 'rifle', 0.13, (j - 0.5) * 0.35)

    # 4. Head: Iconic PUBG Level 3 Armored Welding Helmet (Spetsnaz K6-3)
    m.ico(p(0, 0.01, 1.78), (0.34, 0.31, 0.33), 'aithelmet', 2)
    m.ico(p(0, 0.10, 1.95), (0.35, 0.28, 0.22), 'aithelmet', 2)
    # Brow reinforcement bar
    m.rod(p(-0.24, -0.27, 1.88), p(0.24, -0.27, 1.88), 0.042, 'aithelmet', part=False)
    # Glowing Horizontal Visor Slit
    m.ico(p(0, -0.295, 1.77), (0.22, 0.032, 0.065), '#12091a', 1, False)
    m.ico(p(0, -0.318, 1.77), (0.18, 0.020, 0.042), 'aitvisor', 1, False)
    # Helmet ear guards & brass bolts
    for side in (-1, 1):
        m.ico(p(side * 0.32, 0.01, 1.73), (0.065, 0.09, 0.10), 'aitgun', 1)
        m.ico(p(side * 0.23, -0.26, 1.85), (0.028, 0.022, 0.028), 'aitbrass', 1, False)
    # Mouth guard vent bar
    m.path([p(-0.09, -0.28, 1.62), p(0.0, -0.30, 1.60), p(0.09, -0.28, 1.62)], 0.016, 'aitgun', part=False)

    if action == 'dash':
        m.verts = [(x, y - z * 0.12, z) for x, y, z in m.verts]
    if action == 'hit':
        m.verts = [(x + z * 0.06 * math.cos(phase), y, z * 0.96) for x, y, z in m.verts]
    rotation = Matrix.Rotation(VIEWS[view] + (drive * 0.13 if action == 'q_cast' else 0.0), 3, 'Z')
    m.verts = [tuple(rotation @ Vector(v)) for v in m.verts]
    return m


def ground_ring(m, r, z=0.06, color='aitvisor', phase=0.0):
    points = [(r * math.cos(phase + i * math.tau / 48), r * math.sin(phase + i * math.tau / 48), z) for i in range(49)]
    m.path(points, 0.025, color, part=False)


def tactical_grid(m, r, phase, crates=False):
    ground_ring(m, r, color='aitvisor')
    ground_ring(m, r * 0.76, color='aitbrass')
    slots = ('rifle', 'smg', 'shotgun', 'grenade', 'rocket', 'sniper', 'rifle', 'rocket')
    for i in range(8):
        a = i * math.tau / 8 + phase
        x, y = math.cos(a) * r * 0.85, math.sin(a) * r * 0.85
        slot_window(m, x, y - 0.05, 0.36 + 0.05 * math.sin(phase + i), slots[i], 0.18, a)
        if crates and i % 2 == 0:
            px, py = math.cos(a) * r, math.sin(a) * r
            m.rod((px, py, 0.02), (px, py, 0.48), 0.05, 'aitgun', sides=8)
    ground_ring(m, r * 0.32, color='aitvisor')


def effect(kind, f, n):
    m = Mesh()
    phase = f / n * math.tau
    if kind.startswith('slot_'):
        slot_window(m, 0.0, 0.0, 0.72, kind, 0.42, math.sin(phase) * 0.32)
        for i in range(4):
            a = phase + i * math.tau / 4
            m.ico((math.cos(a) * 0.36, 0.03, 0.72 + math.sin(a) * 0.36), (0.045, 0.035, 0.045), 'aitbrass', 1)
    elif kind == 'rifle_bullet':
        slot_window(m, 0.0, 0.0, 0.7, 'rifle', 0.26, math.sin(phase) * 0.35)
        for i in range(4):
            a = phase + i * math.tau / 4
            m.path([
                (math.cos(a) * 0.18, 0.0, 0.7 + math.sin(a) * 0.18),
                (math.cos(a) * 0.34, 0.04, 0.7 + math.sin(a) * 0.34),
            ], 0.032, 'aitbrass', end=0.005)
    elif kind == 'shotgun_blast':
        r = 0.78 + f * 0.055
        points = [(math.cos(-1.35 + i * 0.16) * r, 0.8 + math.sin(-1.35 + i * 0.16) * r) for i in range(18)]
        m.prism(points + [(x * 0.68, 0.8 + (z - 0.8) * 0.68) for x, z in reversed(points)], 'aitbrass', -0.05, 0.11)
        m.path([(x, -0.08, z) for x, z in points], 0.024, 'aitvisor', part=False)
        for i in range(5):
            m.ico((-0.2 - i * 0.13, 0.02, 0.5 + math.sin(phase + i) * 0.3), (0.055, 0.045, 0.075), 'aitcrate', 1)
    elif kind == 'rocket_missile':
        slot_window(m, 0.0, 0.0, 0.72, 'rocket', 0.52, math.sin(phase) * 0.3)
        for i in range(6):
            a = phase + i * math.tau / 6
            m.path([
                (math.cos(a) * 0.35, 0.0, 0.72 + math.sin(a) * 0.35),
                (math.cos(a) * 0.62, 0.04, 0.72 + math.sin(a) * 0.62),
            ], 0.036, 'aitcrate', end=0.005)
    elif kind == 'grenade_orb':
        bob = math.sin(phase) * 0.07
        m.ico((0.0, 0.0, 0.7 + bob), (0.20, 0.18, 0.24), 'leaf', 2)
        m.ico((0.0, -0.04, 0.92 + bob), (0.08, 0.06, 0.08), 'aitbrass', 1)
    elif kind == 'grenade_explosion':
        r = 0.6 + f * 0.19
        for i in range(8):
            a = i * math.tau / 8 + phase * 0.12
            x, z = math.cos(a) * r, 1.15 + math.sin(a) * r
            slot_window(m, x, 0.08, z, 'grenade', 0.14, a)
            m.path([
                (x * 0.2, 0.0, 1.15 + (z - 1.15) * 0.2),
                (x * 0.62 + 0.08, -0.05, 1.15 + (z - 1.15) * 0.55),
                (x, -0.02, z),
            ], 0.042, 'aitcrate', end=0.009)
    elif kind == 'tactical_zone':
        tactical_grid(m, 1.35, phase * 0.12)
        m.rod((0.0, 0.0, 0.0), (0.0, 0.0, 1.05), 0.11, 'aitgun', sides=8)
        slot_window(m, 0.0, -0.14, 0.72, 'rifle', 0.24, 0.2)
    elif kind == 'airdrop_zone':
        tactical_grid(m, 2.38, phase * 0.07, True)
        m.ico((0.0, 0.0, 0.36), (0.38, 0.32, 0.32), 'aitcrate', 1)
        m.ico((0.0, 0.0, 0.66), (0.40, 0.34, 0.15), 'aitjeans', 1)
    return m


def orbit_layer(layer, f, view):
    m = Mesh()
    phase = f / 6 * math.tau
    rot = Matrix.Rotation(VIEWS[view], 3, 'Z')
    slots = ('rifle', 'smg', 'shotgun', 'grenade', 'rocket', 'sniper')
    for i in range(6):
        a = phase + i * math.tau / 6
        v = rot @ Vector((0.84 * math.cos(a), 0.60 * math.sin(a), 0.88 + 0.06 * math.sin(phase + i)))
        if (v.y < 0) != (layer == 'front'):
            continue
        slot_window(m, v.x, v.y, v.z, slots[i], 0.15, math.sin(a) * 0.25)
    return m


def run():
    HERE.mkdir(parents=True, exist_ok=True)
    atlas = Atlas('ait01-pixel-v1')
    for view in VIEWS:
        for action, n in ACTIONS.items():
            for f, c in enumerate(atlas.cells(view + '/' + action, 64, 64, n, 10, anchor=58)):
                atlas.add(c, hero(action, f, n, view), 'ait01')
    heroimage, herometa = atlas.bake(
        HERE,
        'DTAit01Atlas',
        target_h=43,
        detached_parts='Floating inventory slot frames, visor glow, belt core buckle and weapon details are deliberate closed mesh layers for sprite baking.'
    )
    transform = atlas.transforms['ait01']
    contact = Image.new('RGB', (1024, 560), '#142b32')
    labels = ImageDraw.Draw(contact)
    for row, view in enumerate(VIEWS):
        for col, action in enumerate(ACTIONS):
            c = herometa['clips'][view + '/' + action]['cells'][min(2, ACTIONS[action] - 1)]
            tile = heroimage.crop((c['x'], c['y'], c['x'] + 64, c['y'] + 64)).resize((128, 128), Image.Resampling.NEAREST)
            contact.paste(tile, (col * 128, row * 140), tile)
            labels.text((col * 128 + 6, row * 140 + 128), view + '/' + action, fill='#e0ffff')
    contact.save(HERE / 'ait01-actions-preview.png')

    atlas = Atlas('ait01-vfx-pixel', 1024)
    kinds = [
        ('rifle_bullet', 48, 48, 6),
        ('shotgun_blast', 64, 64, 6),
        ('rocket_missile', 64, 64, 6),
        ('grenade_orb', 48, 48, 6),
        ('slot_rifle', 48, 48, 6),
        ('slot_smg', 48, 48, 6),
        ('slot_shotgun', 48, 48, 6),
        ('slot_grenade', 48, 48, 6),
        ('slot_rocket', 48, 48, 6),
        ('slot_sniper', 48, 48, 6),
        ('grenade_explosion', 96, 96, 6),
        ('tactical_zone', 96, 96, 6),
        ('airdrop_zone', 160, 112, 6),
    ]
    for key, w, h, n in kinds:
        for f, c in enumerate(atlas.cells(key, w, h, n, 12)):
            atlas.add(c, effect(key, f, n), key)
    for view in VIEWS:
        for layer in ('back', 'front'):
            for f, c in enumerate(atlas.cells('inventory_orbit_' + layer + '/' + view, 64, 64, 6, 12, anchor=58)):
                atlas.add(c, orbit_layer(layer, f, view), 'ait01')
    vfx, vmeta = atlas.bake(
        HERE / 'vfx',
        'DTAit01VFX',
        transforms={'ait01': transform},
        detached_parts='Floating UI inventory window frames, weapons, grenades, rockets and airdrop crate parts are intentionally disconnected spell meshes.'
    )
    preview(vfx, vmeta, [k for k, _, _, _ in kinds], HERE / 'ait01-vfx-preview.png', 4)

    heights = {}
    for view in VIEWS:
        c = herometa['clips'][view + '/idle']['cells'][0]
        heights[view] = c['bbox'][3] - c['bbox'][1]
        assert (40 if view == 'N' else 41) <= heights[view] <= 44, (view, heights[view])
    (HERE / 'scale-verification.json').write_text(
        json.dumps({'pass': True, 'texelHeights': heights, 'unit': 2, 'anchorY': 58, 'mirrored': False, 'heroTransform': transform}, indent=2),
        encoding='utf-8'
    )


if __name__ == '__main__':
    run()
