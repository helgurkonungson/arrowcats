#!/usr/bin/env python3
"""Turns generated images from Art/<folder>/*.png into game-ready files in public/art + manifest.json.

Usage (from the repo folder):  python3 tools/art/process.py ../Art
Needs: pip install pillow rembg   (rembg downloads its background-removal model on first run)
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
for folder, (size, cut) in RULES.items():
    for f in sorted((SRC / folder).glob('*.png')):
        im = Image.open(f).convert('RGBA')
        full = f.stem.startswith(FULL_FRAME)
        if cut and not full and remove:
            im = remove(im)
        if not full:
            box = im.getbbox()
            if box:
                im = im.crop(box)
        limit = 1280 if full else size
        im.thumbnail((limit, limit), Image.LANCZOS)
        out = DST / folder / (f.stem + '.png')
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out, optimize=True)
        manifest[f.stem] = f'{folder}/{f.stem}.png'
        print('ok', folder, f.stem, im.size)

(DST / 'manifest.json').write_text(json.dumps(manifest, indent=1))
print(f'{len(manifest)} images -> {DST}')
