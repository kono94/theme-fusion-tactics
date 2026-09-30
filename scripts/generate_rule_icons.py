"""Render the pixel-art augment and match rule icons in the same style as the item icons.

Usage: python scripts/generate_rule_icons.py frontend/public/assets [contact-sheet.png]
"""

import math
import sys
from pathlib import Path

from PIL import Image

from generate_item_icons import (
    BLACK, BLUE, CYAN, GOLD, GREEN, HAKI, LEATHER, N, ORANGE, PAPER, PINK, PURPLE, RED, SCALE,
    STEEL, STONE, WHITE, WOOD, Sprite, ellipse, hexc, poly, rect, union,
)

YELLOW = [hexc(v) for v in ('#3a2a00', '#b88a00', '#f5c400', '#ffe84a', '#fffbd0')]


def star_points(cx, cy, outer, inner, tips):
    points = []
    for i in range(tips * 2):
        r = outer if i % 2 == 0 else inner
        a = i / (tips * 2) * math.tau - math.pi / 2
        points.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return points


# ---------------- Augments ----------------

def ranged_tempo():
    s = Sprite()
    s.part(poly([(10, 3), (20, 8), (24, 16), (20, 24), (10, 29)], 3), WOOD)
    s.part(poly([(10, 3), (10, 29)], 1), WHITE, shade='flat', seam=False)
    s.part(poly([(5, 16), (27, 16)], 2), STEEL, shade='flat')
    s.part(poly([(27, 12), (31, 16), (27, 20)]), STEEL)
    s.part(poly([(5, 13), (8, 16), (5, 19), (3, 19), (5, 16), (3, 13)]), RED, seam=False)
    s.dot(CYAN[3], (1, 10), (2, 10), (1, 22), (2, 22), (0, 16), (1, 16))
    return s


def guarded_formation():
    s = Sprite()
    for x, colors in ((1, BLUE), (11, RED), (21, BLUE)):
        s.part(poly([(x, 8), (x + 9, 8), (x + 9, 18), (x + 4, 26), (x, 18)]), colors)
        s.part(poly([(x + 4, 10), (x + 4, 22)], 1), GOLD, shade='flat', seam=False)
    s.part(poly([(12, 4), (20, 4), (20, 18), (16, 24), (12, 18)]), STEEL)
    s.part(poly([(16, 7), (16, 19)], 2), GOLD, shade='flat', seam=False)
    return s


def snowball_strike():
    s = Sprite()
    s.part(poly([(2, 28), (8, 20), (12, 24)]), CYAN, seam=False)
    s.part(poly([(0, 20), (8, 16), (8, 20)]), WHITE, seam=False)
    s.part(ellipse((9, 7, 29, 27)), WHITE)
    s.dot(CYAN[3], (22, 20), (23, 21), (21, 22), (24, 18))
    s.dot(WHITE[4], (13, 11), (14, 10), (14, 12), (15, 11))
    s.part(poly(star_points(25, 6, 5, 2, 4)), GOLD, seam=False)
    return s


def treasure_cache():
    s = Sprite()
    s.part(rect((3, 14, 28, 28)), WOOD, shade='vertical')
    s.part(poly([(3, 15), (5, 7), (26, 7), (28, 15)]), WOOD)
    s.part(rect((3, 13, 28, 16)), GOLD, shade='vertical')
    s.part(rect((8, 7, 10, 28)), GOLD, shade='flat')
    s.part(rect((21, 7, 23, 28)), GOLD, shade='flat')
    s.part(rect((13, 15, 18, 21)), STEEL)
    s.dot(STEEL[0], (15, 17), (15, 18), (16, 17), (16, 18))
    s.part(poly([(10, 6), (13, 2), (18, 2), (21, 6)]), GOLD, seam=False)
    s.dot(YELLOW[4], (14, 3), (17, 4))
    return s


def training_arc():
    s = Sprite()
    s.part(poly([(6, 25), (25, 6)], 3), STEEL)
    s.part(poly([(2, 22), (10, 30)], 6), BLACK)
    s.part(poly([(5, 19), (13, 27)], 3), STEEL, seam=False)
    s.part(poly([(22, 2), (30, 10)], 6), BLACK)
    s.part(poly([(19, 5), (27, 13)], 3), STEEL, seam=False)
    s.dot(WHITE[4], (8, 22), (14, 16), (20, 10))
    s.part(poly(star_points(6, 6, 4, 1.5, 4)), GOLD, seam=False)
    return s


def battle_standard():
    s = Sprite()
    s.part(poly([(6, 2), (6, 30)], 2), WOOD, shade='flat')
    s.part(ellipse((3, 0, 9, 5)), GOLD)
    s.part(poly([(8, 5), (28, 5), (28, 22), (18, 17), (8, 22)]), RED)
    s.part(poly([(8, 5), (28, 5)], 2), GOLD, seam=False)
    s.part(poly(star_points(18, 12, 5, 2, 5)), GOLD, seam=False)
    s.part(rect((3, 28, 10, 31)), STONE)
    return s


def sharpened_blades():
    s = Sprite()
    s.part(poly([(25, 3), (29, 3), (29, 7), (12, 24), (8, 20)]), STEEL)
    s.part(poly([(28, 4), (12, 22)], 1), WHITE, shade='flat', seam=False)
    s.part(poly([(5, 17), (15, 27)], 3), GOLD)
    s.part(poly([(7, 25), (2, 30)], 3), LEATHER)
    s.part(ellipse((0, 28, 4, 32)), GOLD)
    s.part(poly(star_points(7, 7, 5, 1.5, 4)), YELLOW, seam=False)
    return s


def focused_haki():
    s = Sprite()
    s.part(poly([(1, 16), (8, 8), (16, 5), (24, 8), (31, 16), (24, 24), (16, 27), (8, 24)]), WHITE)
    s.part(ellipse((10, 8, 22, 24)), PURPLE)
    s.part(ellipse((13, 11, 19, 21)), HAKI)
    s.dot(WHITE[4], (12, 11), (13, 10), (14, 10))
    s.dot(PURPLE[4], (16, 1), (16, 2), (16, 29), (16, 30), (4, 4), (28, 4), (4, 28), (28, 28))
    return s


def iron_line():
    s = Sprite()
    s.part(rect((2, 5, 14, 13)), STEEL)
    s.part(rect((16, 5, 29, 13)), STEEL)
    s.part(rect((2, 15, 9, 23)), STEEL)
    s.part(rect((11, 15, 21, 23)), STEEL)
    s.part(rect((23, 15, 29, 23)), STEEL)
    s.part(rect((2, 25, 14, 30)), STEEL)
    s.part(rect((16, 25, 29, 30)), STEEL)
    s.dot(WHITE[4], (4, 7), (18, 7), (4, 17), (13, 17), (25, 17), (4, 27), (18, 27))
    return s


def close_quarters():
    s = Sprite()
    s.part(poly([(16, 2), (24, 14), (26, 21), (22, 28), (16, 30), (10, 28), (6, 21), (8, 14)]), RED)
    s.dot(RED[4], (12, 14), (11, 16), (11, 18))
    s.part(poly([(16, 12), (16, 24)], 2), WHITE, shade='flat', seam=False)
    s.part(poly([(11, 18), (21, 18)], 2), WHITE, shade='flat', seam=False)
    return s


def backline_barrage():
    s = Sprite()
    for ox, oy in ((0, 0), (9, 5), (18, 10)):
        s.part(poly([(2 + ox, 14 + oy), (12 + ox, 4 + oy)], 1), WOOD, shade='flat', seam=False)
        s.part(poly([(12 + ox, 2 + oy), (15 + ox, 1 + oy), (14 + ox, 5 + oy)]), STEEL, seam=False)
        s.part(poly([(1 + ox, 14 + oy), (4 + ox, 14 + oy), (1 + ox, 17 + oy)]), RED, seam=False)
    return s


def quick_study():
    s = Sprite()
    s.part(poly([(2, 8), (15, 10), (15, 28), (2, 26)]), BLUE)
    s.part(poly([(30, 8), (17, 10), (17, 28), (30, 26)]), BLUE)
    s.part(poly([(4, 10), (14, 12), (14, 26), (4, 24)]), PAPER)
    s.part(poly([(28, 10), (18, 12), (18, 26), (28, 24)]), PAPER)
    s.dot(BLUE[2], (6, 14), (7, 14), (8, 14), (9, 14), (6, 17), (7, 17), (8, 17), (20, 14), (21, 14), (22, 14), (20, 17), (21, 17))
    s.part(poly(star_points(16, 5, 5, 2, 4)), YELLOW, seam=False)
    return s


def opening_burst():
    s = Sprite()
    s.part(poly(star_points(16, 16, 15, 7, 10)), ORANGE)
    s.part(poly(star_points(16, 16, 10, 5, 10)), YELLOW)
    s.part(ellipse((11, 11, 21, 21)), WHITE)
    return s


def clean_bench():
    s = Sprite()
    s.part(rect((2, 14, 29, 19)), WOOD, shade='vertical')
    s.part(rect((4, 19, 8, 29)), WOOD)
    s.part(rect((23, 19, 27, 29)), WOOD)
    s.part(rect((2, 10, 29, 12)), WOOD, shade='flat')
    s.part(poly(star_points(10, 5, 4, 1.5, 4)), YELLOW, seam=False)
    s.part(poly(star_points(23, 6, 3, 1, 4)), YELLOW, seam=False)
    return s


def first_guard():
    s = Sprite()
    s.part(ellipse((2, 2, 30, 30)), STEEL)
    s.part(ellipse((5, 5, 27, 27)), BLUE)
    s.part(ellipse((11, 11, 21, 21)), GOLD)
    s.dot(YELLOW[4], (13, 13), (14, 13))
    s.dot(WHITE[4], (8, 9), (9, 8), (10, 8))
    return s


# ---------------- Match rules ----------------

def die(s, x, y, size, pips):
    s.part(rect((x, y, x + size, y + size)), WHITE)
    for px, py in pips:
        s.dot(BLACK[1], (x + px, y + py), (x + px + 1, y + py), (x + px, y + py + 1), (x + px + 1, y + py + 1))


def cheap_rerolls():
    s = Sprite()
    die(s, 2, 10, 15, [(3, 3), (10, 10), (6, 6)])
    die(s, 15, 3, 14, [(2, 2), (9, 2), (2, 9), (9, 9), (5, 5)])
    s.part(ellipse((18, 20, 28, 30)), GOLD)
    s.dot(YELLOW[4], (20, 22), (21, 22))
    s.part(rect((22, 22, 24, 28)), YELLOW, shade='flat', seam=False)
    return s


def volatile():
    s = Sprite()
    s.part(ellipse((4, 9, 28, 31)), BLACK)
    s.dot(BLACK[4], (9, 14), (10, 13), (11, 13), (9, 15))
    s.part(rect((13, 6, 19, 10)), STEEL)
    s.part(poly([(16, 6), (19, 2), (24, 3)], 1), LEATHER, shade='flat', seam=False)
    s.part(poly(star_points(25, 3, 4, 1.5, 6)), YELLOW, seam=False)
    s.part(poly([(10, 21), (22, 21)], 2), RED, shade='flat', seam=False)
    return s


def loot_rain():
    s = Sprite()
    s.part(union(ellipse((2, 4, 16, 14)), ellipse((10, 2, 26, 14)), ellipse((16, 6, 30, 15)), rect((8, 9, 26, 14))), BLUE)
    for x, y in ((5, 18), (13, 22), (21, 17), (26, 25), (8, 27)):
        s.part(ellipse((x, y, x + 4, y + 4)), GOLD, seam=False)
    s.dot(YELLOW[4], (6, 19), (14, 23), (22, 18))
    return s


def second_wind():
    s = Sprite()
    s.part(poly([(4, 28), (8, 16), (16, 7), (28, 3), (29, 12), (22, 22), (12, 27)]), GREEN)
    s.part(poly([(4, 29), (26, 7)], 1), WHITE, shade='flat', seam=False)
    s.part(poly([(10, 21), (14, 24)], 1), WHITE, shade='flat', seam=False)
    s.part(poly([(14, 15), (18, 18)], 1), WHITE, shade='flat', seam=False)
    s.part(poly([(20, 9), (23, 12)], 1), WHITE, shade='flat', seam=False)
    s.dot(CYAN[3], (1, 8), (2, 8), (3, 8), (0, 13), (1, 13))
    return s


def glass_cannons():
    s = Sprite()
    s.part(poly([(3, 22), (6, 13), (24, 6), (30, 13), (26, 19), (9, 26)]), CYAN)
    s.part(poly([(4, 23), (26, 10)], 1), WHITE, shade='flat', seam=False)
    s.part(ellipse((20, 6, 29, 15)), STEEL)
    s.part(ellipse((23, 9, 27, 13)), BLACK)
    s.part(ellipse((4, 18, 16, 30)), WOOD)
    s.part(ellipse((8, 22, 12, 26)), GOLD)
    s.dot(BLACK[0], (12, 15), (13, 16), (12, 17), (14, 18), (13, 19))
    return s


def mana_surge():
    s = Sprite()
    s.part(poly([(16, 1), (22, 10), (27, 18), (25, 26), (16, 30), (7, 26), (5, 18), (10, 11), (13, 14)]), BLUE)
    s.part(poly([(16, 10), (20, 17), (21, 23), (16, 27), (11, 23), (12, 17)]), CYAN)
    s.part(poly([(16, 17), (18, 21), (16, 25), (14, 21)]), WHITE)
    return s


def head_start():
    s = Sprite()
    s.part(rect((2, 23, 29, 30)), STONE)
    s.part(rect((10, 16, 29, 23)), STONE)
    s.part(rect((19, 9, 29, 16)), STONE)
    s.part(poly([(24, 1), (24, 9)], 1), WOOD, shade='flat')
    s.part(poly([(24, 1), (31, 3), (24, 6)]), RED)
    s.part(poly(star_points(6, 16, 3, 1, 4)), YELLOW, seam=False)
    return s


def bounty_hunt():
    s = Sprite()
    s.part(poly([(4, 3), (26, 3), (28, 6), (26, 10), (28, 14), (26, 18), (28, 22), (26, 29), (4, 29), (6, 22), (4, 18), (6, 14), (4, 10), (6, 6)]), PAPER)
    s.part(ellipse((10, 6, 20, 16)), WHITE)
    s.dot(BLACK[0], (12, 10), (13, 10), (17, 10), (18, 10), (12, 11), (17, 11), (14, 13), (15, 13), (16, 13))
    s.part(poly([(8, 19), (24, 19)], 2), RED, shade='flat', seam=False)
    s.part(poly([(10, 24), (22, 24)], 1), LEATHER, shade='flat', seam=False)
    s.part(ellipse((20, 20, 30, 30)), GOLD)
    s.dot(YELLOW[4], (22, 22), (23, 22))
    s.part(rect((24, 23, 26, 28)), YELLOW, shade='flat', seam=False)
    return s


def type_master():
    s = Sprite()
    s.part(poly([(16, 16), (16, 2), (22, 3), (27, 7), (30, 16)]), RED)
    s.part(poly([(16, 16), (30, 16), (29, 22), (25, 27), (16, 30)]), BLUE)
    s.part(poly([(16, 16), (16, 30), (10, 29), (5, 25), (2, 16)]), GREEN)
    s.part(poly([(16, 16), (2, 16), (3, 10), (7, 5), (16, 2)]), YELLOW)
    s.part(ellipse((11, 11, 21, 21)), WHITE)
    s.part(poly(star_points(16, 16, 4, 1.5, 4)), PURPLE, seam=False)
    return s


def random_rule():
    s = Sprite()
    s.part(ellipse((2, 2, 30, 30)), PURPLE)
    s.part(ellipse((5, 5, 27, 27)), HAKI)
    s.part(poly([(11, 11), (13, 8), (19, 8), (22, 11), (22, 15), (16, 19), (16, 21)], 3), WHITE, shade='flat', seam=False)
    s.part(rect((15, 24, 18, 26)), WHITE, shade='flat', seam=False)
    s.dot(PURPLE[4], (6, 10), (25, 22), (26, 8))
    return s


def none_rule():
    s = Sprite()
    s.part(ellipse((3, 3, 29, 29)), STONE)
    s.part(ellipse((7, 7, 25, 25)), STEEL, shade='flat')
    s.part(poly([(7, 25), (25, 7)], 3), RED, shade='flat', seam=False)
    return s


AUGMENTS = {
    'ranged-tempo': ranged_tempo,
    'guarded-formation': guarded_formation,
    'snowball-strike': snowball_strike,
    'treasure-cache': treasure_cache,
    'training-arc': training_arc,
    'battle-standard': battle_standard,
    'sharpened-blades': sharpened_blades,
    'focused-haki': focused_haki,
    'iron-line': iron_line,
    'close-quarters': close_quarters,
    'backline-barrage': backline_barrage,
    'quick-study': quick_study,
    'opening-burst': opening_burst,
    'clean-bench': clean_bench,
    'first-guard': first_guard,
}

MATCH_RULES = {
    'cheap-rerolls': cheap_rerolls,
    'volatile': volatile,
    'loot-rain': loot_rain,
    'second-wind': second_wind,
    'glass-cannons': glass_cannons,
    'mana-surge': mana_surge,
    'head-start': head_start,
    'bounty-hunt': bounty_hunt,
    'type-master': type_master,
    'random': random_rule,
    'none': none_rule,
}

ICONS = {'augments': AUGMENTS, 'match-rules': MATCH_RULES}


def main(out_dir, sheet_path):
    columns = 8
    sheet = Image.new('RGBA', (columns * 136, 6 * 136), (0, 0, 0, 255))
    index = 0
    for folder, icons in ICONS.items():
        for name, build in icons.items():
            image = build().render()
            target = Path(out_dir) / folder / f'{name}.png'
            target.parent.mkdir(parents=True, exist_ok=True)
            image.save(target, optimize=True)
            small = image.resize((128, 128), Image.NEAREST)
            background = (30, 41, 59, 255) if folder == 'augments' else (240, 236, 250, 255)
            tile = Image.new('RGBA', (136, 136), background)
            tile.alpha_composite(small, (4, 4))
            sheet.paste(tile, ((index % columns) * 136, (index // columns) * 136))
            index += 1
    if sheet_path:
        sheet.save(sheet_path)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
