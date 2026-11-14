"""Repack shared clips without changing untouched texels or accumulating rows."""
from copy import deepcopy
from PIL import Image


def merge_clips(sheet, metadata, replacement, clips, palette=()):
    result = deepcopy(metadata)
    sources = {key: (replacement if key in clips else sheet, clip)
               for key, clip in {**metadata['clips'], **clips}.items()}
    width = metadata['width']
    x = y = row = 0
    pending = []
    result['clips'] = {}
    for held in (False, True):
        if held:
            y += row
            x = row = 0
        for key in sorted(k for k in sources if k.startswith('held_') == held):
            source, clip = sources[key]
            target_clip = deepcopy(clip)
            for cell in target_clip['cells']:
                sx, sy, w, h = (cell[k] for k in ('x', 'y', 'w', 'h'))
                if not (0 < w <= width and h > 0 and sx >= 0 and sy >= 0
                        and sx + w <= source.width and sy + h <= source.height):
                    raise ValueError('Invalid source cell: ' + key)
                if x + w > width:
                    x = 0
                    y += row
                    row = 0
                pending.append((source.crop((sx, sy, sx + w, sy + h)), x, y))
                cell.update(x=x, y=y)
                x += w
                row = max(row, h)
            result['clips'][key] = target_clip
    image = Image.new('RGBA', (width, y + row))
    for tile, x, y in pending:
        image.paste(tile, (x, y))
    result['height'] = image.height
    result['palette'] = sorted(set(metadata.get('palette', ())) | set(palette))
    result.pop('v08BaseHeight', None)
    result.pop('heldBaseHeight', None)
    return image, result
