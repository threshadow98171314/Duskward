"""Resource tiles for the board, 26x26 at 1x like the lantern tiles.

Day icons show the resource itself. Night icons show what matching it does
after dark: a sword, a shield, or the creature it summons.
"""
from canvas import Canvas
from tiles import SIZE, SMALL_FLAME, lantern

LEVELS = {"grain": 4, "stone": 9, "wood": 9, "clay": 4, "cloth": 4, "mana": 1, "lantern": 3}

CLAY_TOP = (226, 120, 96, 255)
TEAL = ((120, 196, 214, 255), (54, 112, 146, 255), (30, 70, 98, 255))
MOON = ("w", "c", "C")
FIRE = ["......o.......",
        ".....oo....o..",
        "....ooo...oo..",
        "...ooyoo.ooo..",
        "..ooyyyoooyo..",
        "..oyyYyyoyyo..",
        ".ooyYYYyyyyo..",
        ".oyyYYYYYyyoo.",
        "ooyYYwwYYYyyo.",
        "oyyYwwwwYYYyo.",
        "OoyYYwwYYYyoO.",
        ".OoyyYYYyyoO..",
        "..OOooooooO...",
        "....OOOOOO...."]


def _finish(c, glow=None, strength=0.35):
    c.outline()
    if glow:
        c.glow(13, 13, 14, glow, strength)
    return c


def _block(c, x, y, w, h, top, front, side, depth=3):
    """A block seen slightly from above: lighter top, front face, shaded right edge."""
    c.rect(x, y, x + w - 1, y + depth - 1, top)
    c.rect(x, y + depth, x + w - 1, y + depth + h - 1, front)
    c.rect(x + w - 2, y + depth, x + w - 1, y + depth + h - 1, side)


def _rock(c, light, mid, dark):
    c.poly([(6, 19), (4, 14), (7, 8), (13, 5), (19, 7), (22, 13), (21, 19), (14, 21)], mid)
    c.recolor(mid, dark, lambda x, y: x + y > 30)
    c.poly([(8, 12), (9, 9), (13, 7), (16, 8), (12, 11)], light)


def _ingot(c, x, y, top, front, side):
    c.poly([(x, y + 4), (x + 13, y + 4), (x + 11, y), (x + 2, y)], top)
    c.rect(x, y + 5, x + 13, y + 8, front)
    c.rect(x + 12, y + 5, x + 13, y + 8, side)


def _log(c, y, bark, groove, inner, ring):
    c.rect(4, y, 19, y + 7, bark)
    for x in range(5, 18, 4):
        c.set(x, y + 2, groove)
        c.set(x + 2, y + 5, groove)
    c.ellipse(20, y + 3.5, 2.5, 3.5, inner)
    c.ellipse(20, y + 3.5, 1, 1.5, ring)


def _plank(c, y, face, grain, edge):
    c.poly([(3, y + 6), (19, y), (23, y + 3), (7, y + 9)], face)
    c.line(6, y + 6, 19, y + 2, grain)
    c.line(4, y + 7, 7, y + 9, edge)
    c.line(19, y, 23, y + 3, edge)


def _brick(c, x, y):
    _block(c, x, y, 10, 4, CLAY_TOP, "r", "R", depth=2)


def _bolt(c, light, mid, dark, trim=None):
    """A bolt of cloth lying on its side, with a length of it unrolled in front."""
    c.poly([(9, 18), (21, 18), (24, 23), (12, 23)], mid)
    c.rect(4, 8, 19, 18, mid)
    c.rect(4, 8, 19, 10, light)
    c.rect(4, 16, 19, 18, dark)
    c.rect(19, 8, 19, 18, dark)
    c.ellipse(4, 13, 2.5, 5, light)
    c.ellipse(4, 13, 1, 2, dark)
    if trim:
        for x in (9, 15):
            c.rect(x, 8, x, 18, trim)
        c.line(12, 22, 23, 22, trim)


# One ear of wheat; the gaps between kernels become outline when drawn
WHEAT_EAR = [
    "...yu....",
    "...uu....",
    ".yu.U.yu.",
    ".uu.U.uu.",
    "....U....",
    ".yu.U.yu.",
    ".uu.U.uu.",
    "....U....",
    ".yu.U.yu.",
    ".uu.U.uu.",
]


def _sword(c, edge, body, guard, grip, gem=None):
    """A sword pointing up and to the right."""
    for i in range(12):
        x, y = 10 + i, 15 - i
        c.set(x, y, body)
        c.set(x + 1, y, body)
        c.set(x, y - 1, edge)
    c.set(22, 3, edge)
    for i in range(5):
        c.set(6 + i, 13 + i, guard)
        c.set(7 + i, 13 + i, guard)
    for i in range(3):
        c.set(7 - i, 18 + i, grip)
        c.set(8 - i, 18 + i, grip)
    c.rect(3, 21, 4, 22, guard)
    if gem:
        c.set(9, 16, gem)


def _shield(c, kind, face, rim, emblem=None, boss=None):
    if kind == "round":
        c.ellipse(13, 13, 9, 9, rim)
        c.ellipse(13, 13, 7, 7, face)
    else:
        c.poly([(4, 4), (22, 4), (22, 13), (13, 23), (4, 13)], rim)
        c.poly([(6, 6), (20, 6), (20, 12), (13, 20), (6, 12)], face)
    if boss:
        c.ellipse(13, 12, 2, 2, boss)
    if emblem:
        emblem(c)


def _sun_emblem(color, core):
    def draw(c):
        c.ellipse(13, 11, 3, 3, color)
        c.ellipse(13, 11, 1.5, 1.5, core)
        for x, y in ((13, 6), (13, 16), (8, 11), (18, 11), (9, 7), (17, 7), (9, 15), (17, 15)):
            c.set(x, y, color)
    return draw


def _moon_emblem(c):
    c.ellipse(13, 11, 3, 3, "v")
    c.ellipse(14.5, 10, 2.5, 2.5, "B")


def _eyes(c, y, x0, x1, color):
    for x in (x0, x1):
        c.set(x, y, color)
        c.set(x + 1, y, color)


def _shambler(c):
    c.poly([(13, 3), (20, 9), (21, 22), (5, 22), (6, 9)], "P")
    c.ellipse(13, 12, 4, 4, "K")
    _eyes(c, 12, 10, 14, "y")
    for x in (7, 11, 15, 19):
        c.set(x, 23, "P")


def _vacant_mail(c):
    c.ellipse(13, 12, 8, 8, "s")
    c.recolor("s", "l", lambda x, y: x < 11 and y < 10)
    c.rect(5, 12, 21, 21, "s")
    c.rect(8, 12, 18, 14, "k")
    _eyes(c, 13, 9, 15, "v")
    c.rect(12, 1, 14, 4, "r")


def _dusk_golem(c):
    c.rect(5, 6, 21, 21, "S")
    c.rect(5, 6, 21, 8, "s")
    c.line(7, 10, 10, 16, "o")
    c.line(19, 9, 16, 15, "o")
    _eyes(c, 12, 9, 15, "y")
    c.rect(10, 17, 16, 18, "K")


def _night_terror(c):
    c.ellipse(13, 14, 7, 8, "R")
    c.ellipse(13, 13, 5, 6, "r")
    c.line(7, 9, 4, 2, "l")
    c.line(19, 9, 22, 2, "l")
    _eyes(c, 12, 9, 15, "y")
    for x in (10, 12, 14, 16):
        c.set(x, 18, "w")


def _gnawer(c):
    c.ellipse(12, 15, 7, 5, "S")
    c.poly([(17, 12), (23, 16), (17, 19)], "S")
    c.ellipse(9, 9, 2.5, 3, "m")
    c.ellipse(14, 9, 2.5, 3, "m")
    c.set(16, 13, "r")
    c.set(23, 16, "m")
    c.line(4, 17, 1, 22, "S")


def _nightweaver(c):
    for dy in (-3, -1, 1, 3):
        c.line(13, 13, 3, 13 + dy * 3, "P")
        c.line(13, 13, 23, 13 + dy * 3, "P")
    c.ellipse(13, 15, 5, 5, "K")
    c.ellipse(13, 9, 3, 3, "K")
    for x in (11, 13, 15):
        c.set(x, 8, "r")


def _mist_wraith(c):
    mist = (184, 148, 204, 220)
    c.ellipse(13, 10, 7, 7, mist)
    c.rect(6, 10, 20, 19, mist)
    for x in range(6, 21, 4):
        c.rect(x, 20, x + 1, 22, mist)
    _eyes(c, 10, 9, 15, "P")
    c.ellipse(13, 15, 1.5, 2, "P")


def _shadowbat(c):
    c.poly([(13, 10), (2, 6), (5, 12), (2, 17), (9, 15), (13, 19),
            (17, 15), (24, 17), (21, 12), (24, 6)], "P")
    c.ellipse(13, 13, 3, 4, "K")
    c.set(11, 7, "K")
    c.set(15, 7, "K")
    c.set(12, 12, "y")
    c.set(14, 12, "y")


def _candlebone(c):
    c.ellipse(13, 15, 7, 6, "l")
    c.rect(9, 19, 17, 22, "l")
    c.ellipse(10, 15, 1.5, 2, "k")
    c.ellipse(16, 15, 1.5, 2, "k")
    for x in (10, 12, 14, 16):
        c.set(x, 21, "k")
    c.rect(12, 5, 14, 9, "w")
    c.ascii(11, 0, SMALL_FLAME)


def _marsh_lurker(c):
    c.poly([(4, 10), (14, 6), (23, 11), (23, 15), (14, 18), (4, 16)], "g")
    c.recolor("g", "G", lambda x, y: y > 14)
    c.set(9, 9, "y")
    c.set(10, 9, "k")
    for x in range(13, 23, 2):
        c.set(x, 15, "w")


def _ember_wisp(c):
    c.ascii(6, 4, FIRE)
    _eyes(c, 12, 9, 14, "k")


def _eclipse_cultist(c):
    c.poly([(13, 2), (21, 10), (23, 23), (3, 23), (5, 10)], "P")
    c.recolor("P", "p", lambda x, y: x < 10 and y > 12)
    c.ellipse(13, 10, 4, 4, "k")
    _eyes(c, 10, 10, 14, "v")
    c.ellipse(13, 18, 3, 3, "y")
    c.ellipse(13, 18, 2, 2, "k")


def _hierophant(c):
    c.poly([(13, 4), (22, 12), (23, 23), (3, 23), (4, 12)], "P")
    c.ellipse(13, 14, 5, 5, "w")
    c.ellipse(11, 14, 1.2, 1.5, "m")
    c.ellipse(15, 14, 1.2, 1.5, "m")
    c.rect(11, 18, 15, 19, "l")
    for x in (9, 11, 13, 15, 17):
        c.rect(x, 5 + abs(x - 13) // 2, x, 8, "u")
    c.rect(9, 8, 17, 9, "u")


def _grain_day(c, level):
    if level == 1:
        # Two ears of wheat tied together
        c.ascii(2, 2, WHEAT_EAR)
        c.ascii(14, 3, WHEAT_EAR)
        c.line(6, 12, 12, 22, "U")
        c.line(18, 13, 13, 22, "U")
        c.rect(10, 18, 15, 19, "O")
    elif level == 2:
        c.ellipse(13, 15, 9, 6, "b")
        c.ellipse(13, 13, 8, 4.5, "n")
        for x in (8, 12, 16):
            c.line(x, 15, x + 2, 11, "b")
        c.set(9, 11, "w")
    elif level == 3:
        # Roast drumstick
        for dx, dy in ((0, 0), (1, 0), (0, 1)):
            c.line(14 + dx, 14 + dy, 19 + dx, 19 + dy, "l")
        c.ellipse(20.5, 18.5, 1.6, 1.6, "w")
        c.ellipse(18.5, 20.5, 1.6, 1.6, "w")
        c.ellipse(10, 10, 7, 6, "O")
        c.ellipse(9, 9, 5, 4, "o")
        c.set(7, 7, "y")
    else:
        # A cut ham: roasted crust around a pink face with a rim of fat and the bone
        c.ellipse(12, 13, 9, 7, "b")
        c.ellipse(8, 10, 3, 2, "n")
        c.ellipse(15, 14, 6, 5, "w")
        c.ellipse(15, 14, 5, 4, "m")
        c.ellipse(15, 14, 1.2, 1.2, "l")


def _stone_day(c, level):
    if level == 1:
        _rock(c, "l", "s", "S")
    elif level == 2:
        _block(c, 6, 8, 14, 9, "l", "s", "S")
    elif level == 3:
        _block(c, 3, 13, 11, 6, "l", "s", "S")
        _block(c, 12, 13, 11, 6, "l", "s", "S")
        _block(c, 8, 4, 11, 6, "l", "s", "S")
    elif level == 4:
        _rock(c, "S", "K", (40, 28, 44, 255))
        c.line(8, 17, 12, 11, "o")
        c.line(12, 11, 17, 13, "o")
        c.line(15, 8, 17, 13, "O")
    elif level == 5:
        _block(c, 6, 8, 14, 9, *TEAL)
    elif level == 6:
        _block(c, 3, 13, 11, 6, *TEAL)
        _block(c, 12, 13, 11, 6, *TEAL)
        _block(c, 8, 4, 11, 6, *TEAL)
    elif level == 7:
        _rock(c, "s", "S", "K")
        c.poly([(9, 16), (11, 8), (14, 15)], "c")
        c.poly([(13, 17), (17, 9), (19, 16)], "c")
        c.set(11, 10, "w")
        c.set(17, 11, "w")
    elif level == 8:
        _ingot(c, 6, 9, *MOON)
    else:
        _ingot(c, 2, 13, *MOON)
        _ingot(c, 11, 13, *MOON)
        _ingot(c, 6, 5, *MOON)


def _wood_day(c, level):
    # Plain wood, then dark wood, then golden wood, each as a log, a plank and a stack
    bark, groove, inner, ring = (("b", "B", "n", "b"), ("B", "K", "b", "B"),
                                 ("U", (150, 100, 30, 255), "y", "u"))[(level - 1) // 3]
    step = (level - 1) % 3
    if step == 0:
        _log(c, 9, bark, groove, inner, ring)
    elif step == 1:
        _plank(c, 7, inner, ring, bark)
    else:
        for y in (4, 9, 14):
            _plank(c, y, inner, ring, bark)


def _clay_day(c, level):
    if level == 1:
        c.poly([(5, 18), (6, 11), (11, 7), (18, 8), (21, 14), (19, 19), (12, 21)], "r")
        c.recolor("r", "R", lambda x, y: x + y > 31)
        c.ellipse(10, 11, 2, 1.5, CLAY_TOP)
    elif level == 2:
        _block(c, 5, 9, 16, 7, CLAY_TOP, "r", "R")
    elif level == 3:
        _brick(c, 2, 15)
        _brick(c, 13, 15)
        _brick(c, 8, 8)
    else:
        for row, y in enumerate((5, 11, 17)):
            for x in range(2 - (row % 2) * 5, 24, 10):
                if x >= 0:
                    _brick(c, x, y)


def _cloth_day(c, level):
    if level == 1:
        _bolt(c, "w", "n", "b")
    elif level == 2:
        for y, w in ((15, 16), (11, 14), (7, 12)):
            c.rect(13 - w // 2, y, 12 + w // 2, y + 3, "w")
            c.rect(13 - w // 2, y + 3, 12 + w // 2, y + 3, "l")
    elif level == 3:
        _bolt(c, "v", "p", "P")
    else:
        _bolt(c, "v", "p", "P", trim="u")


def _mana_day(c, level):
    c.poly([(13, 2), (20, 10), (13, 23), (6, 10)], "m")
    c.poly([(13, 2), (13, 23), (6, 10)], "v")
    c.poly([(6, 10), (20, 10), (13, 14)], (255, 196, 214, 255))
    c.line(10, 6, 8, 9, "w")


DAY = {"grain": _grain_day, "stone": _stone_day, "wood": _wood_day,
       "clay": _clay_day, "cloth": _cloth_day, "mana": _mana_day}

SWORDS = [
    ("l", "s", "B", "b", None), ("l", "s", "S", "B", None), ("w", "l", "U", "B", None),
    ("y", "o", "S", "K", None), ("y", "o", "U", "K", None), ("Y", "y", "u", "K", "r"),
    ("w", "c", "S", "P", None), ("w", "c", "u", "P", None), ("w", "c", "u", "P", "m"),
]

SHIELDS = [
    ("round", "b", "B", None, "s"), ("round", "b", "S", None, "l"), ("heater", "b", "S", None, "s"),
    ("heater", "B", "l", None, None), ("heater", "B", "l", None, "s"), ("heater", "B", "l", _moon_emblem, None),
    ("heater", "u", "U", None, None), ("heater", "u", "U", _sun_emblem("O", "y"), None),
    ("heater", "y", "u", _sun_emblem("w", "Y"), None),
]

# What each resource summons at night, by the level of the building that boosts it
CREATURES = {
    "grain": [_shambler, _vacant_mail, _dusk_golem, _night_terror],
    "clay": [_gnawer, _nightweaver, _mist_wraith, _shadowbat],
    "cloth": [_candlebone, _marsh_lurker, _ember_wisp, _eclipse_cultist],
    "mana": [_hierophant],
}


def resource(name, level, night=False):
    """Icon for a resource tile at a building level (1-based)."""
    if name == "lantern":
        return lantern(level, night)
    c = Canvas(SIZE, SIZE)
    if not night:
        DAY[name](c, level)
        return _finish(c)
    if name == "stone":
        _sword(c, *SWORDS[level - 1])
        return _finish(c, "Y", 0.25)
    if name == "wood":
        _shield(c, *SHIELDS[level - 1])
        return _finish(c, "Y", 0.25)
    CREATURES[name][level - 1](c)
    return _finish(c, "v", 0.3)


def dragon_fight(name):
    """Night tiles that fuel the dragon's attacks during its fight."""
    c = Canvas(SIZE, SIZE)
    if name == "grain":
        for y, x0, x1 in ((7, 4, 18), (12, 2, 22), (17, 6, 20)):
            c.line(x0, y, x1, y, "l")
            c.set(x1 + 1, y - 1, "l")
            c.set(x1 + 2, y - 2, "w")
        c.line(4, 8, 14, 8, "w")
    elif name == "clay":
        c.poly([(13, 2), (18, 10), (13, 23), (8, 10)], "c")
        c.poly([(13, 2), (13, 23), (8, 10)], "w")
        c.poly([(5, 14), (8, 17), (5, 22), (2, 17)], "c")
        c.poly([(21, 12), (24, 16), (21, 21), (18, 16)], "c")
    else:
        c.ascii(6, 4, FIRE)
    return _finish(c, "Y", 0.3)
