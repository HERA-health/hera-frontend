"""Encode local UI captures and inventory the published product images."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=Path('../output/playwright/product'))
parser.add_argument('--destination', type=Path, default=Path('public/marketing/product'))
parser.add_argument('--directory-only', action='store_true', help='Encode the public directory screenshots')
args = parser.parse_args()
args.destination.mkdir(parents=True, exist_ok=True)
themes = ('light', 'dark')
scenes = ['home','agenda','patients','record','documents','billing','availability','statistics','clinic-agenda','clinic-team','clinic-services','clinic-billing']
# Editorial details in source pixels (1600 × 1000). Keep the original for zoom.
details = {
    'home': {'next-appointment': (250, 188, 898, 408)},
    'agenda': {'weekly-agenda': (237, 140, 850, 508)},
    'record': {'patient-file': (247, 90, 897, 263), 'last-entry': (252, 743, 893, 835)},
    'billing': {'payment-summary': (245, 97, 898, 217)},
}

if args.directory_only:
    for theme in themes:
        for layout in ('desktop', 'mobile', 'detail'):
            name = f'directory-{layout}-{theme}'
            with Image.open(args.source / f'{name}.png') as shot:
                shot.convert('RGB').save(args.destination / f'{name}.webp', 'WEBP', quality=90, method=6)
else:
    for scene in scenes:
        for theme in themes:
            source = args.source / f'{scene}-{theme}.png'
            with Image.open(source) as original:
                if original.size != (1600, 1000):
                    raise ValueError(f'Unexpected viewport: {source}')
                for width in (960, 1600):
                    output = args.destination / f'{scene}-{theme}-{width}.webp'
                    original.convert('RGB').resize((width, width * 5 // 8), Image.Resampling.LANCZOS).save(
                        output, 'WEBP', quality=92, method=6)
                for detail, bounds in details.get(scene, {}).items():
                    output = args.destination / f'{detail}-{theme}.webp'
                    original.crop(bounds).convert('RGB').save(output, 'WEBP', quality=92, method=6)

# Either command refreshes its own images. The manifest describes both sets.
manifest_path = args.destination / 'manifest.json'
entries = []
for image in sorted(args.destination.glob('*.webp')):
    data = image.read_bytes()
    entries.append({'file': image.name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
manifest = {'synthetic': True, 'viewport': {'width': 1600, 'height': 1000}, 'scenes': scenes, 'files': entries}
manifest_path.write_bytes((json.dumps(manifest, indent=2) + '\n').encode('utf-8'))
print(f"Inventoried {len(entries)} WebP assets")
