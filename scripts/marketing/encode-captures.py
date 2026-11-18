"""Encode real local UI captures; never generates or replaces the UI."""
from pathlib import Path
import argparse, hashlib, json
from PIL import Image
parser=argparse.ArgumentParser()
parser.add_argument('--source',type=Path,default=Path('../output/playwright/product'))
parser.add_argument('--destination',type=Path,default=Path('public/marketing/product'))
args=parser.parse_args()
scenes=['home','agenda','patients','record','documents','billing','availability','statistics','clinic-agenda','clinic-team','clinic-services','clinic-billing']
args.destination.mkdir(parents=True,exist_ok=True)
manifest={'synthetic':True,'viewport':{'width':1600,'height':1000},'scenes':scenes,'files':[]}
for scene in scenes:
 for theme in ['light','dark']:
  source=args.source/f'{scene}-{theme}.png'
  with Image.open(source) as original:
   if original.size != (1600,1000): raise ValueError(f'Unexpected viewport: {source}')
   for width in [960,1600]:
    output=args.destination/f'{scene}-{theme}-{width}.webp'
    original.convert('RGB').resize((width,width*5//8),Image.Resampling.LANCZOS).save(output,'WEBP',quality=92,method=6)
    manifest['files'].append({'file':output.name,'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()})
(args.destination/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f"Encoded {len(manifest['files'])} WebP assets; {sum(x['bytes'] for x in manifest['files'])/1024/1024:.2f} MiB total")
