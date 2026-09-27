"""Render the pixel-art item icons: 32x32 shaded sprites upscaled 8x without smoothing.

Usage: python scripts/generate_item_icons.py frontend/public/assets/items [contact-sheet.png]
"""

import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw

N = 32
SCALE = 8
OUTLINE = (27, 19, 32, 255)


def hexc(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def ramp(*values):
    return [hexc(v) for v in values]


WOOD = ramp('#3b1f14', '#6b3a1f', '#955527', '#bf7a3a', '#e3a764')
GOLD = ramp('#5c3a0c', '#a2660f', '#dca21e', '#f6d04d', '#fff4b0')
STEEL = ramp('#1e2433', '#3c4658', '#66738a', '#9aa8bc', '#dfe7f1')
HAKI = ramp('#0f0a18', '#22163a', '#3a2760', '#5d4596', '#a58ddb')
RED = ramp('#3d0b12', '#7a1522', '#b82232', '#e34a4a', '#ff9a8a')
WHITE = ramp('#4b5470', '#8a93ad', '#c9cfe0', '#eef1f8', '#ffffff')
BLACK = ramp('#07070b', '#16161f', '#262634', '#3b3b4f', '#5f5f7a')
LEATHER = ramp('#2b160e', '#57301a', '#7e4827', '#a9683a', '#d69a62')
PAPER = ramp('#5b4630', '#9c8058', '#d2b98a', '#eddcb2', '#fff6dc')
BLUE = ramp('#0c1a3d', '#173a7a', '#2563c4', '#4c95ec', '#a8d6ff')
CYAN = ramp('#08323d', '#0e6474', '#1aa0b0', '#4fd3d6', '#b8fbf2')
PINK = ramp('#4a0f2e', '#8f1f55', '#d23d7e', '#f472aa', '#ffc2dc')
PURPLE = ramp('#240b3d', '#46187a', '#7433c2', '#a466ec', '#e2c4ff')
ORANGE = ramp('#471705', '#8c330a', '#d45a12', '#f58b2b', '#ffd08a')
GREEN = ramp('#0b2f1c', '#15603a', '#23954f', '#4cc76e', '#b4f5b8')
STONE = ramp('#23262e', '#454a57', '#6d7483', '#9aa1ae', '#d3d8e0')


class Sprite:
    def __init__(self):
        self.px = {}
        self.owner = {}
        self.parts = 0

    def part(self, draw, colors, shade='sphere', seam=True):
        mask_image = Image.new('1', (N, N), 0)
        draw(ImageDraw.Draw(mask_image))
        mask = {(x, y) for x in range(N) for y in range(N) if mask_image.getpixel((x, y))}
        if not mask:
            return
        self.parts += 1
        xs = [x for x, _ in mask]
        ys = [y for _, y in mask]
        x0, y0, w, h = min(xs), min(ys), max(1, max(xs) - min(xs)), max(1, max(ys) - min(ys))
        for x, y in mask:
            t = ((x - x0) / w + (y - y0) / h) / 2
            tone = 3 if t < 0.32 else 1 if t > 0.7 else 2
            if shade == 'flat':
                tone = 2
            if shade == 'vertical':
                v = (y - y0) / h
                tone = 3 if v < 0.3 else 1 if v > 0.72 else 2
            top_left = (x - 1, y) not in mask or (x, y - 1) not in mask
            bottom_right = (x + 1, y) not in mask or (x, y + 1) not in mask
            if bottom_right:
                tone = min(tone, 1)
            elif top_left:
                tone = 4 if t < 0.5 else 3
            if seam:
                neighbors = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
                if any(n not in mask and self.owner.get(n, self.parts) != self.parts for n in neighbors):
                    tone = 0
            self.px[(x, y)] = colors[tone]
            self.owner[(x, y)] = self.parts

    def dot(self, color, *points):
        for point in points:
            self.px[point] = hexc(color) if isinstance(color, str) else color

    def render(self):
        image = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        for (x, y), color in self.px.items():
            if 0 <= x < N and 0 <= y < N:
                image.putpixel((x, y), color)
        for x in range(N):
            for y in range(N):
                if (x, y) in self.px:
                    continue
                if any((x + dx, y + dy) in self.px for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    image.putpixel((x, y), OUTLINE)
        return image.resize((N * SCALE, N * SCALE), Image.NEAREST)


def poly(points, width=0):
    if width:
        return lambda d: d.line(points, fill=1, width=width, joint='curve')
    return lambda d: d.polygon(points, fill=1)


def ellipse(box):
    return lambda d: d.ellipse(box, fill=1)


def rect(box):
    return lambda d: d.rectangle(box, fill=1)


def union(*draws):
    def run(d):
        for draw in draws:
            draw(d)
    return run


# ---------------- One Piece ----------------

def coat():
    s = Sprite()
    s.part(poly([(9, 5), (22, 5), (27, 9), (29, 27), (21, 29), (16, 20), (11, 29), (3, 27), (5, 9)]), RED)
    s.part(poly([(12, 5), (16, 13), (20, 5), (18, 4), (14, 4)]), WHITE)
    s.part(poly([(9, 5), (13, 5), (16, 13), (14, 26), (12, 12)]), WHITE, shade='vertical')
    s.part(poly([(23, 5), (19, 5), (16, 13), (18, 26), (20, 12)]), WHITE, shade='vertical')
    s.part(rect((3, 8, 8, 10)), GOLD)
    s.part(rect((24, 8, 29, 10)), GOLD)
    s.dot(GOLD[4], (4, 8), (25, 8))
    s.part(union(poly([(3, 11), (3, 12)], 1), poly([(5, 11), (5, 13)], 1), poly([(7, 11), (7, 12)], 1)), GOLD, shade='flat')
    s.part(union(poly([(24, 11), (24, 12)], 1), poly([(26, 11), (26, 13)], 1), poly([(28, 11), (28, 12)], 1)), GOLD, shade='flat')
    s.part(poly([(4, 26), (11, 28), (11, 29), (3, 27)]), GOLD, seam=False)
    s.part(poly([(21, 28), (28, 26), (29, 27), (21, 29)]), GOLD, seam=False)
    return s


def axe():
    s = Sprite()
    s.part(poly([(4, 28), (18, 12)], 3), WOOD)
    s.part(ellipse((2, 26, 6, 30)), GOLD)
    s.part(poly([(8, 22), (11, 25)], 2), GOLD, shade='flat')
    s.part(poly([(13, 7), (17, 2), (23, 1), (28, 4), (30, 11), (29, 18), (25, 23), (20, 21), (19, 15), (16, 11)]), HAKI)
    s.part(poly([(23, 1), (28, 4), (30, 11), (29, 18), (25, 23)], 2), STEEL, seam=False)
    s.part(poly([(14, 11), (9, 7), (8, 12), (12, 15)]), HAKI)
    s.part(ellipse((14, 9, 20, 15)), GOLD)
    s.dot(GOLD[4], (16, 10))
    s.dot(PURPLE[3], (21, 5), (23, 8), (25, 12), (24, 16), (22, 11))
    return s


def armor():
    s = Sprite()
    s.part(poly([(5, 6), (11, 4), (16, 7), (21, 4), (27, 6), (28, 14), (25, 25), (16, 30), (7, 25), (4, 14)]), HAKI)
    s.part(poly([(5, 6), (11, 4), (16, 7), (21, 4), (27, 6), (28, 14), (25, 25), (16, 30), (7, 25), (4, 14), (5, 6)], 2), GOLD, seam=False)
    s.part(poly([(16, 9), (16, 27)], 2), GOLD, shade='flat')
    s.part(poly([(9, 12), (13, 11), (14, 17), (10, 18)]), PURPLE)
    s.part(poly([(23, 12), (19, 11), (18, 17), (22, 18)]), PURPLE)
    s.dot(PURPLE[4], (10, 13), (20, 12))
    s.part(ellipse((13, 17, 19, 23)), RED)
    s.dot(RED[4], (15, 18), (14, 19))
    return s


def boots():
    s = Sprite()
    s.part(poly([(11, 3), (21, 3), (21, 18), (27, 20), (29, 24), (29, 28), (9, 28), (10, 19)]), LEATHER)
    s.part(rect((10, 3, 22, 7)), LEATHER, shade='vertical')
    s.part(rect((9, 26, 29, 29)), BLACK, shade='vertical')
    s.part(rect((11, 12, 21, 14)), GOLD)
    s.dot(STEEL[4], (15, 13), (16, 13))
    s.dot(STEEL[1], (17, 13))
    for y, (a, b) in zip((9, 17, 23), ((2, 6), (1, 7), (2, 6))):
        s.part(poly([(a, y), (b, y)], 1), CYAN, shade='flat', seam=False)
    s.part(poly([(3, 13), (6, 13)], 1), WHITE, shade='flat', seam=False)
    return s


def crest():
    s = Sprite()
    s.part(ellipse((4, 6, 28, 30)), GOLD)
    s.part(ellipse((7, 9, 25, 27)), RED)
    s.part(poly([(8, 12), (8, 3), (12, 7), (16, 1), (20, 7), (24, 3), (24, 12)]), GOLD)
    s.dot(RED[3], (8, 3), (24, 3))
    s.dot(CYAN[3], (16, 2))
    s.part(poly([(18, 11), (12, 19), (16, 19), (13, 25), (20, 16), (16, 16), (19, 11)]), ramp('#3a2a00', '#b88a00', '#f5c400', '#ffe84a', '#fffbd0'))
    s.part(poly([(5, 20), (1, 18)], 2), HAKI, seam=False)
    s.part(poly([(27, 20), (31, 18)], 2), HAKI, seam=False)
    return s


def kit():
    s = Sprite()
    s.part(rect((3, 15, 28, 28)), WOOD, shade='vertical')
    s.part(poly([(3, 20), (28, 20)], 1), ramp(*['#3b1f14'] * 5), shade='flat')
    s.part(rect((13, 18, 18, 22)), GOLD)
    s.part(rect((3, 13, 28, 16)), STEEL, shade='vertical')
    s.part(poly([(8, 13), (18, 3)], 3), WOOD)
    s.part(poly([(14, 2), (19, 1), (24, 6), (21, 9), (18, 6), (16, 5)]), STEEL)
    s.part(poly([(20, 13), (24, 6)], 2), STEEL)
    s.part(ellipse((22, 3, 28, 9)), STEEL)
    s.dot(WOOD[2], (24, 5), (25, 5), (24, 6), (25, 6), (26, 6))
    return s


def flag():
    s = Sprite()
    s.part(poly([(5, 2), (5, 30)], 2), WOOD, shade='flat')
    s.part(ellipse((3, 1, 8, 5)), GOLD)
    s.part(poly([(7, 4), (17, 6), (29, 3), (27, 12), (29, 21), (17, 20), (7, 22)]), BLACK)
    s.part(ellipse((13, 7, 22, 15)), WHITE)
    s.part(rect((15, 14, 20, 16)), WHITE)
    s.dot(BLACK[0], (15, 10), (16, 10), (19, 10), (20, 10), (15, 11), (20, 11), (17, 13), (18, 13), (16, 15), (18, 15))
    s.part(poly([(11, 18), (24, 12)], 1), WHITE, shade='flat', seam=False)
    s.part(poly([(11, 12), (24, 18)], 1), WHITE, shade='flat', seam=False)
    s.part(poly([(13, 6), (22, 7)], 2), ramp('#5c3a0c', '#b88a00', '#f5c400', '#ffe84a', '#ffffff'), seam=False)
    s.dot(RED[2], (15, 7), (19, 7))
    return s


def log():
    s = Sprite()
    s.part(poly([(4, 7), (24, 4), (28, 25), (8, 29)]), PAPER)
    s.part(poly([(3, 6), (23, 3), (27, 24), (7, 28)]), BLUE)
    s.part(poly([(3, 6), (7, 28)], 3), ramp('#0a1330', '#10275a', '#173a7a', '#2563c4', '#4c95ec'), seam=False)
    s.part(ellipse((10, 9, 22, 21)), GOLD)
    s.part(ellipse((12, 11, 20, 19)), PAPER)
    s.part(poly([(16, 12), (17, 15), (16, 18), (15, 15)]), RED, shade='flat')
    s.dot(STEEL[3], (16, 16), (16, 17))
    s.part(poly([(20, 27), (21, 31), (23, 29), (24, 31), (24, 26)]), RED)
    return s


# ---------------- Pokemon ----------------

def charm():
    s = Sprite()
    s.part(poly([(16, 1), (16, 7)], 1), STEEL, shade='flat')
    s.part(ellipse((13, 1, 19, 7)), GOLD)
    s.dot(GOLD[0], (15, 3), (16, 3), (17, 3), (15, 4), (16, 4), (17, 4), (15, 5), (16, 5), (17, 5))
    s.part(union(ellipse((3, 8, 17, 22)), ellipse((15, 8, 29, 22)), poly([(4, 18), (28, 18), (16, 30)])), PINK)
    s.part(union(rect((14, 13, 18, 23)), rect((11, 16, 21, 20))), WHITE)
    s.dot(PINK[4], (7, 11), (8, 11), (6, 12), (6, 13))
    return s


def band():
    s = Sprite()
    s.part(ellipse((3, 5, 27, 23)), RED)
    for x in range(N):
        for y in range(N):
            if (x - 15) ** 2 / 49 + (y - 14) ** 2 / 16 <= 1:
                s.px.pop((x, y), None)
    s.part(poly([(5, 12), (25, 12)], 2), WHITE, shade='flat', seam=False)
    for x in range(N):
        for y in range(N):
            if (x - 15) ** 2 / 49 + (y - 14) ** 2 / 16 <= 1:
                s.px.pop((x, y), None)
    s.part(rect((22, 17, 27, 22)), RED)
    s.part(poly([(24, 21), (21, 30), (25, 29), (27, 22)]), RED)
    s.part(poly([(26, 21), (30, 29), (31, 26), (28, 20)]), RED)
    return s


def plate():
    s = Sprite()
    s.part(poly([(6, 3), (26, 3), (29, 6), (29, 26), (26, 29), (6, 29), (3, 26), (3, 6)]), STONE)
    s.part(poly([(7, 6), (25, 6), (26, 7), (26, 25), (25, 26), (7, 26), (6, 25), (6, 7)]), BLUE)
    s.part(poly([(10, 9), (22, 9), (22, 17), (16, 23), (10, 17)]), WHITE)
    s.part(poly([(12, 11), (20, 11), (20, 16), (16, 20), (12, 16)]), BLUE)
    s.dot(STONE[4], (4, 6), (5, 5), (6, 4))
    return s


def scarf():
    s = Sprite()
    s.part(ellipse((6, 3, 26, 15)), CYAN)
    for x in range(N):
        for y in range(N):
            if (x - 16) ** 2 / 36 + (y - 8) ** 2 / 9 <= 1:
                s.px.pop((x, y), None)
                s.owner.pop((x, y), None)
    s.part(poly([(15, 12), (21, 12), (24, 20), (27, 29), (21, 28), (18, 20)]), CYAN)
    s.part(poly([(12, 12), (17, 13), (14, 21), (8, 29), (4, 27), (10, 19)]), CYAN)
    s.part(poly([(4, 27), (8, 29)], 2), WHITE, shade='flat', seam=False)
    s.part(poly([(21, 28), (27, 29)], 2), WHITE, shade='flat', seam=False)
    s.part(poly([(1, 7), (4, 7)], 1), WHITE, shade='flat', seam=False)
    s.part(poly([(0, 12), (4, 12)], 1), WHITE, shade='flat', seam=False)
    return s


def lens():
    s = Sprite()
    s.part(poly([(20, 20), (28, 28)], 4), LEATHER)
    s.part(ellipse((2, 2, 22, 22)), GOLD)
    s.part(ellipse((5, 5, 19, 19)), PURPLE)
    s.dot(PURPLE[4], (8, 8), (9, 8), (8, 9), (8, 10), (10, 7))
    s.dot(WHITE[4], (13, 10), (14, 11), (12, 13), (15, 13), (14, 14))
    s.dot(PURPLE[3], (13, 12), (14, 12), (13, 13))
    return s


def harness():
    s = Sprite()
    s.part(poly([(5, 3), (27, 29)], 5), LEATHER)
    s.part(poly([(27, 3), (5, 29)], 5), LEATHER)
    for a, b in (((6, 5), (11, 10)), ((21, 22), (26, 27)), ((26, 5), (21, 10)), ((11, 22), (6, 27))):
        s.part(poly([a, b], 1), LEATHER[:1] * 5, shade='flat', seam=False)
    s.part(ellipse((8, 8, 24, 24)), GOLD)
    s.part(ellipse((11, 11, 21, 21)), LEATHER)
    s.part(rect((14, 11, 18, 21)), STEEL)
    s.part(poly([(16, 13), (16, 19)], 1), STEEL[:1] * 5, shade='flat', seam=False)
    for p in ((4, 3), (27, 3), (4, 28), (27, 28)):
        s.dot(STEEL[4], p)
    return s


def ribbon():
    s = Sprite()
    s.part(poly([(12, 16), (7, 30), (11, 28), (13, 31), (16, 18)]), BLUE)
    s.part(poly([(20, 16), (25, 30), (21, 28), (19, 31), (16, 18)]), BLUE)
    points = []
    for i in range(24):
        r = 13 if i % 2 == 0 else 11
        a = i / 24 * math.tau
        points.append((16 + r * math.cos(a), 12 + r * math.sin(a)))
    s.part(poly(points), RED)
    s.part(ellipse((9, 5, 23, 19)), GOLD)
    s.part(ellipse((12, 8, 20, 16)), GOLD, shade='flat')
    s.part(poly([(16, 9), (17, 11), (19, 11), (18, 13), (18, 15), (16, 14), (14, 15), (14, 13), (13, 11), (15, 11)]), WHITE)
    return s


def focus():
    s = Sprite()
    s.part(poly([(16, 1), (16, 7)], 2), RED, shade='flat')
    s.part(ellipse((6, 6, 26, 26)), ORANGE)
    s.part(ellipse((10, 10, 22, 22)), WHITE)
    s.part(ellipse((13, 13, 19, 19)), RED)
    s.dot(RED[0], (15, 15), (16, 15), (15, 16), (16, 16))
    s.part(poly([(12, 24), (9, 31), (13, 30)]), RED)
    s.part(poly([(20, 24), (23, 31), (19, 30)]), RED)
    s.dot(ORANGE[4], (10, 9), (9, 10), (11, 8))
    return s


ICONS = {
    'onepiece': {'coat': coat, 'axe': axe, 'armor': armor, 'boots': boots, 'crest': crest, 'kit': kit, 'flag': flag, 'log': log},
    'pokemon': {'charm': charm, 'band': band, 'plate': plate, 'scarf': scarf, 'lens': lens, 'harness': harness, 'ribbon': ribbon, 'focus': focus},
}


def main(out_dir, sheet_path):
    sheet = Image.new('RGBA', (8 * 136, 4 * 136), (0, 0, 0, 255))
    for row, (mode, icons) in enumerate(ICONS.items()):
        for col, (name, build) in enumerate(icons.items()):
            image = build().render()
            target = Path(out_dir) / mode / f'{name}.png'
            target.parent.mkdir(parents=True, exist_ok=True)
            image.save(target, optimize=True)
            small = image.resize((128, 128), Image.NEAREST)
            for band, background in enumerate(((30, 41, 59, 255), (240, 236, 250, 255))):
                tile = Image.new('RGBA', (136, 136), background)
                tile.alpha_composite(small, (4, 4))
                sheet.paste(tile, (col * 136, (row * 2 + band) * 136))
    if sheet_path:
        sheet.save(sheet_path)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
