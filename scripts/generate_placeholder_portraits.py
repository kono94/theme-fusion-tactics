"""Render temporary placeholder unit portraits until the real sprites are cut from the AI batches.

Each form gets a 512x512 palette PNG named <definitionId>.png: a flat pastel background in the
color of the form's first type, a large initial, and the form name. Real sprites overwrite them.

Usage: python scripts/generate_placeholder_portraits.py backend/src/main/resources/data/units_<mode>.json \
           frontend/public/assets/units/<mode> [--overwrite]
"""

import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SIZE = 512
INK = (31, 41, 55)

TYPE_COLORS = {
    'Normal': '#E9E6DE',
    'Fire': '#FFD6B8',
    'Water': '#BFEFFF',
    'Grass': '#C9F3C2',
    'Electric': '#FFF4A8',
    'Poison': '#E6C6F2',
    'Psychic': '#F6C7E6',
    'Ground': '#E8D0A5',
    'Rock': '#D8D2C4',
    'Fighting': '#F5B8A8',
    'Ice': '#D7F7FF',
    'Dragon': '#CFC8FF',
    'Ghost': '#D8C4F0',
    'Bug': '#D8F5A6',
    'Flying': '#DCE5FF',
    'Steel': '#DADDE8',
    'Dark': '#C4B8AD',
}
FALLBACK_COLOR = '#E5E7EB'


def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def darker(rgb, factor):
    return tuple(round(channel * factor) for channel in rgb)


def font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def forms(units):
    seen = {}
    for unit in units:
        entries = unit.get('forms') or [{'definitionId': unit['id'], 'name': unit['name'], 'traits': unit['traits']}]
        for form in entries:
            seen.setdefault(form['definitionId'], (form['name'], form.get('traits') or unit['traits']))
    return seen


def render(name, traits):
    background = hex_rgb(TYPE_COLORS.get(traits[0], FALLBACK_COLOR))
    image = Image.new('RGB', (SIZE, SIZE), background)
    draw = ImageDraw.Draw(image)
    accent = darker(background, 0.82)
    draw.ellipse((96, 56, 416, 376), fill=accent)
    draw.text((SIZE / 2, 216), name[0].upper(), font=font(220), fill=INK, anchor='mm')
    label_size = 56 if len(name) <= 10 else 44
    draw.text((SIZE / 2, 422), name, font=font(label_size), fill=INK, anchor='mm')
    draw.text((SIZE / 2, 470), ' / '.join(traits), font=font(26), fill=darker(INK, 1.6), anchor='mm')
    draw.rectangle((10, 10, SIZE - 11, SIZE - 11), outline=accent, width=6)
    return image.quantize(colors=16, method=Image.Quantize.MEDIANCUT)


def main(units_path, out_dir, overwrite):
    units = json.loads(Path(units_path).read_text())
    target_dir = Path(out_dir)
    target_dir.mkdir(parents=True, exist_ok=True)
    written = 0
    for definition_id, (name, traits) in forms(units).items():
        target = target_dir / f'{definition_id}.png'
        if target.exists() and not overwrite:
            continue
        render(name, traits).save(target, optimize=True)
        written += 1
    print(f'Wrote {written} placeholder portraits to {target_dir}')


if __name__ == '__main__':
    args = [arg for arg in sys.argv[1:] if arg != '--overwrite']
    if len(args) != 2:
        sys.exit(__doc__)
    main(args[0], args[1], '--overwrite' in sys.argv[1:])
