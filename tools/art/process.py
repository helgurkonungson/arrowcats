#!/usr/bin/env python3
"""Turns generated images from Art/<folder>/*.png into game-ready files in public/art + manifest.json.

Usage (from the repo folder):  python3 tools/art/process.py ../Art
Needs: pip install pillow rembg numpy scipy   (rembg downloads its background-removal model on first run)
Sprite sheets: Art/sheets/<ID>.png is cut by the grid in tools/art/sheets.json first; then any single file
in Art/<folder>/ with the same name overrides the sheet result (used to redo one bad item).
Full-frame folders (backgrounds, cafe rooms, story covers, store) keep their background;
everything else gets the background removed, is trimmed to content and resized.
"""
import json, sys
from pathlib import Path
from PIL import Image

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '../Art')
DST = Path(__file__).resolve().parents[2] / 'public' / 'art'
# folder -> (max size in px, remove background)
RULES = {
    'heads': (256, True), 'tails': (128, True), 'portraits': (512, True), 'obstacles': (128, True),
    'overlays': (128, True), 'ui': (128, True), 'accessories': (192, True), 'story': (512, True),
    'cafe': (384, True), 'backgrounds': (1280, False), 'kittens': (256, True),
}
FULL_FRAME = ('cafe_room', 'bg_', 'chapter', 'cover')

try:
    from rembg import remove
except ImportError:
    remove = None
    print('rembg not installed: backgrounds will be kept (pip install rembg)')

manifest = {}


def save(im, folder, stem, size):
    box = im.getbbox()
    if box:
        im = im.crop(box)
    im.thumbnail((size, size), Image.LANCZOS)
    out = DST / folder / (stem + '.png')
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, optimize=True)
    manifest[stem] = f'{folder}/{stem}.png'
    print('ok', folder, stem, im.size)


def key_background(im):
    """Sheets are drawn on one flat color: remove everything of that color connected to the image border.
    Enclosed light areas (white fur, window glass) stay because the cocoa outline separates them."""
    import numpy as np
    from scipy import ndimage
    a = np.array(im.convert('RGBA')).astype(np.int32)
    rgb = a[:, :, :3]
    corners = np.array([rgb[2, 2], rgb[2, -3], rgb[-3, 2], rgb[-3, -3]])
    bg = np.median(corners, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    lab, _ = ndimage.label(dist < 48)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bgmask = np.isin(lab, edge[edge > 0])
    # anti-aliased fringe: pixels next to the background that still lean to its color
    ring = ndimage.binary_dilation(bgmask, iterations=2) & ~bgmask & (dist < 110)
    alpha = np.where(bgmask | ring, 0, 255)
    a[:, :, 3] = alpha
    return Image.fromarray(a.astype(np.uint8))


def cut_sheet(path, rows, cols):
    """Keys out the flat sheet background, then gives every blob to the grid cell holding its center,
    so items slightly off-grid or made of several parts (Zzz, fairy lights) still land in the right file."""
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    cw, ch = W / cols, H / rows
    try:
        import numpy as np
        from scipy import ndimage
    except ImportError:  # plain equal split, background removed per cell
        cells = [im.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch))) for r in range(rows) for c in range(cols)]
        return [remove(c) if remove else c for c in cells]
    a = np.array(key_background(im))
    lab, _ = ndimage.label(a[:, :, 3] > 0)
    cells = [np.zeros(lab.shape, bool) for _ in range(rows * cols)]
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        part = lab[sl] == i
        if part.sum() < 40:  # specks
            continue
        cy = (sl[0].start + sl[0].stop) / 2
        cx = (sl[1].start + sl[1].stop) / 2
        k = min(int(cy // ch), rows - 1) * cols + min(int(cx // cw), cols - 1)
        cells[k][sl] |= part
    out = []
    for m in cells:
        b = a.copy()
        b[:, :, 3] = np.where(m, b[:, :, 3], 0)
        out.append(Image.fromarray(b))
    return out


SHEETS = json.loads((Path(__file__).with_name('sheets.json')).read_text())
for sid, spec in SHEETS.items():
    f = SRC / 'sheets' / f'{sid}.png'
    if not f.exists():
        continue
    for name, im in zip(spec['names'], cut_sheet(f, spec['rows'], spec['cols'])):
        if not name:
            continue
        folder, stem = name.split('/')
        save(im, folder, stem, RULES[folder][0])

for folder, (size, cut) in RULES.items():
    for f in sorted((SRC / folder).glob('*.png')):
        im = Image.open(f).convert('RGBA')
        full = f.stem.startswith(FULL_FRAME)
        if cut and not full and remove:
            im = remove(im)
        if full:
            im.thumbnail((1280, 1280), Image.LANCZOS)
            out = DST / folder / (f.stem + '.png')
            out.parent.mkdir(parents=True, exist_ok=True)
            im.save(out, optimize=True)
            manifest[f.stem] = f'{folder}/{f.stem}.png'
            print('ok', folder, f.stem, im.size)
        else:
            save(im, folder, f.stem, size)

(DST / 'manifest.json').write_text(json.dumps(manifest, indent=1))
print(f'{len(manifest)} images -> {DST}')
