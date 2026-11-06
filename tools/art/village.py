"""The village's original buildings, redrawn. Same 30x40 cells as buildings.py.

Each building is a cottage plus the props of its trade, and gains better
materials and more props as it levels up.
"""
from canvas import Canvas
from buildings import WIDTH, HEIGHT

SMOKE = (216, 212, 214)
THATCH = ("u", "U")
TILES = ("r", "R")
SLATE = ("S", "K")
DUSK = ("p", "P")


def _hut(c, x0, x1, top, wall, roof, peak=7, window=True):
    """A cottage from the ground up to `top`, with a pitched roof and a door."""
    mid = (x0 + x1) // 2
    c.rect(x0, top, x1, HEIGHT - 1, wall)
    c.poly([(x0 - 2, top), (x1 + 2, top), (mid + 1, top - peak), (mid, top - peak)], roof[0])
    c.recolor(roof[0], roof[1], lambda x, y: x > mid and y <= top)
    c.rect(mid - 1, 34, mid + 1, 39, "B")
    if window:
        c.rect(x0 + 2, top + 3, x0 + 3, top + 5, "Y")
    return mid


def _timber(c, x0, x1, top):
    """Exposed beams on a plastered wall."""
    for x in (x0, x1):
        c.rect(x, top, x, HEIGHT - 1, "b")
    c.rect(x0, top + 6, x1, top + 6, "b")


def _smoke(c, x, y):
    for i, (dx, dy) in enumerate(((0, 0), (1, -2), (0, -4), (1, -6))):
        c.set(x + dx, y + dy, SMOKE + (190 - i * 40,))


def _chimney(c, x, top, color="S"):
    c.rect(x, top, x + 2, top + 9, color)
    c.rect(x - 1, top, x + 3, top, color)


def _anvil(c, x):
    c.rect(x, 34, x + 6, 35, "S")
    c.set(x - 1, 34, "S")
    c.rect(x + 2, 36, x + 4, 37, "K")
    c.rect(x + 1, 38, x + 5, 39, "K")


def _furnace(c, x0, x1, top, stone, fire="o"):
    c.rect(x0, top, x1, HEIGHT - 1, stone)
    c.rect(x0 + 2, 33, x1 - 2, 38, fire)
    c.rect(x0 + 3, 35, x1 - 3, 38, "y")


def _brick_pile(c, x, rows):
    for row in range(rows):
        for i in range(rows - row):
            bx, by = x + i * 4 + row * 2, 37 - row * 2
            c.rect(bx, by, bx + 2, by + 1, "r")
            c.set(bx + 2, by + 1, "R")


def _brick_wall(c, x0, x1, top):
    c.rect(x0, top, x1, HEIGHT - 1, "r")
    for y in range(top + 2, HEIGHT, 3):
        c.rect(x0, y, x1, y, "R")
    for y in range(top, HEIGHT):
        shift = ((y - top) // 3) % 2 * 2
        for x in range(x0 + 1 + shift, x1, 4):
            c.set(x, y, "R")


def _kiln(c, cx):
    c.ellipse(cx, 34, 6, 7, "r")
    _brick_wall(c, cx - 6, cx + 6, 34)
    c.ellipse(cx, 37, 2, 2.5, "o")
    c.set(cx, 38, "y")
    c.rect(cx - 1, 25, cx + 1, 28, "R")


def _log_pile(c, x, rows):
    for row in range(rows):
        for i in range(rows - row):
            lx, ly = x + i * 4 + row * 2, 37 - row * 3
            c.ellipse(lx, ly, 1.5, 1.5, "n")
            c.set(lx, ly, "b")


def _saw(c, x, y):
    c.ellipse(x, y, 4, 4, "l")
    for dx, dy in ((0, -5), (4, -3), (5, 1), (3, 4), (-1, 5), (-4, 3), (-5, -1), (-3, -4)):
        c.set(x + dx, y + dy, "S")
    c.ellipse(x, y, 1, 1, "S")


def _water_wheel(c, x, y):
    c.ellipse(x, y, 6, 6, "B")
    c.ellipse(x, y, 4.5, 4.5, "b")
    for dx, dy in ((0, -4), (4, 0), (0, 4), (-4, 0)):
        c.line(x, y, x + dx, y + dy, "B")


def _tree(c, x, top, canopy, shade, fruit=None):
    c.rect(x - 1, top + 9, x + 1, HEIGHT - 1, "b")
    c.rect(x + 1, top + 9, x + 1, HEIGHT - 1, "B")
    c.ellipse(x, top + 6, 7, 6, shade)
    c.ellipse(x - 1, top + 5, 6, 5, canopy)
    if fruit:
        for dx, dy in ((-3, 3), (2, 2), (4, 7), (-4, 8), (0, 6)):
            c.set(x + dx, top + dy, fruit)


def _loom(c, x, threads):
    c.rect(x, 28, x, HEIGHT - 1, "b")
    c.rect(x + 8, 28, x + 8, HEIGHT - 1, "b")
    c.rect(x, 28, x + 8, 29, "B")
    for i in range(1, 8):
        c.rect(x + i, 30, x + i, 34, threads[i % len(threads)])
    c.rect(x + 1, 35, x + 7, 37, threads[0])


def _cloth_line(c, x0, x1, y, cloths):
    c.line(x0, y, x1, y, "B")
    for i, color in enumerate(cloths):
        cx = x0 + 1 + i * 4
        c.rect(cx, y + 1, cx + 2, y + 5, color)


def _crenellations(c, x0, x1, top, color):
    for x in range(x0, x1 + 1, 3):
        c.rect(x, top - 2, x + 1, top - 1, color)


def _finish(c, smoke=()):
    c.outline()
    for x, y in smoke:
        _smoke(c, x, y)
    return c


def shack(level):
    """The home: thatched shack, timbered house, stone keep, then a castle."""
    c = Canvas(WIDTH, HEIGHT)
    if level == 1:
        _hut(c, 7, 22, 28, "b", THATCH)
        return _finish(c)
    if level == 2:
        _chimney(c, 19, 16)
        mid = _hut(c, 5, 24, 26, "w", TILES)
        _timber(c, 5, 24, 26)
        c.rect(19, 29, 20, 31, "Y")
        return _finish(c, [(20, 14)])
    if level == 3:
        c.rect(6, 18, 23, 39, "l")
        c.rect(16, 18, 23, 39, "s")
        _crenellations(c, 6, 23, 18, "l")
        c.rect(13, 32, 16, 39, "B")
        c.rect(14, 31, 15, 31, "B")
        c.rect(8, 22, 9, 25, "Y")
        c.rect(19, 22, 20, 25, "Y")
        c.rect(14, 8, 14, 17, "B")
        c.rect(15, 8, 18, 11, "p")
        return _finish(c)
    for x0 in (2, 21):
        c.rect(x0, 14, x0 + 6, 39, "l")
        c.rect(x0 + 4, 14, x0 + 6, 39, "s")
        c.poly([(x0 - 1, 14), (x0 + 7, 14), (x0 + 3, 6)], "p")
        c.recolor("p", "P", lambda x, y, m=x0 + 3: x > m and y <= 14)
        c.rect(x0 + 2, 18, x0 + 3, 21, "Y")
    c.rect(8, 20, 21, 39, "l")
    c.rect(17, 20, 21, 39, "s")
    _crenellations(c, 8, 21, 20, "l")
    c.rect(12, 30, 17, 39, "B")
    c.rect(13, 29, 16, 29, "B")
    c.rect(14, 2, 14, 7, "B")
    c.rect(15, 2, 18, 4, "o")
    return _finish(c)


def blacksmith(level):
    """From a thatched hut with an anvil up to a gilded forge."""
    c = Canvas(WIDTH, HEIGHT)
    smoke = []
    if level <= 3:
        if level >= 2:
            _chimney(c, 12, 19)
            smoke.append((13, 17))
        _hut(c, 2, 16, 28, "b", THATCH if level == 1 else TILES)
        _anvil(c, 20)
        if level == 3:
            c.rect(26, 33, 28, 39, "C")
            c.rect(26, 33, 28, 33, "c")
    else:
        stone = ("s", "S") if level <= 6 else ("S", "K")
        roof = TILES if level <= 5 else (SLATE if level <= 7 else DUSK)
        for i in range(1 if level < 6 else 2):
            _chimney(c, 4 + i * 8, 14 + i * 2, stone[1])
            smoke.append((5 + i * 8, 12 + i * 2))
        _hut(c, 2, 17, 26, stone[0], roof)
        _furnace(c, 19, 28, 30, stone[1], "o" if level < 7 else "O")
        if level >= 7:
            c.rect(19, 39, 28, 39, "y")
        if level == 8:
            c.rect(2, 26, 17, 26, "u")
            c.rect(9, 30, 10, 33, "u")
    return _finish(c, smoke)


def bricklayer(level):
    """Brick piles that grow into a wall, then a kiln."""
    c = Canvas(WIDTH, HEIGHT)
    _hut(c, 2, 15, 28, "n", THATCH if level < 3 else TILES)
    if level == 1:
        _brick_pile(c, 18, 2)
    elif level == 2:
        _brick_pile(c, 17, 3)
    elif level == 3:
        _brick_wall(c, 18, 28, 30)
    else:
        _kiln(c, 23)
    return _finish(c, [(23, 23)] if level == 4 else [])


def sawmill(level):
    """A woodcutter's hut and log piles, then a mill under a growing dusk tree."""
    c = Canvas(WIDTH, HEIGHT)
    if level >= 6:
        canopy = (("g", "G", None), ("u", "U", None), ("y", "u", "w"))[level - 6]
        _tree(c, 20, 6 + (8 - level) * 2, *canopy)
    roof = THATCH if level < 3 else TILES
    if level <= 3:
        _hut(c, 2, 15, 28, "b", roof)
        if level == 1:
            c.rect(19, 35, 23, 39, "b")
            c.ellipse(21, 35, 2.5, 1, "n")
            c.line(22, 34, 25, 30, "B")
            c.rect(24, 29, 26, 30, "s")
        else:
            _log_pile(c, 18, 2 if level == 2 else 3)
            if level == 3:
                _saw(c, 25, 26)
    elif level <= 5:
        _water_wheel(c, 22, 32)
        _hut(c, 2, 16, 26, "b", roof)
        if level == 5:
            _log_pile(c, 16, 2)
    else:
        _hut(c, 2, 13, 29, "b", TILES)
        _log_pile(c, 15, 2)
    return _finish(c)


def weaver(level):
    """A weaver's hut with a loom, then lines of drying cloth and banners."""
    c = Canvas(WIDTH, HEIGHT)
    roof = (THATCH, TILES, DUSK, DUSK)[level - 1]
    _hut(c, 2, 15, 28, "n" if level < 4 else "w", roof)
    threads = (("n", "w"), ("n", "m", "w"), ("p", "v", "m"), ("p", "u", "v"))[level - 1]
    _loom(c, 18, threads)
    if level >= 2:
        _cloth_line(c, 17, 28, 20, ("n", "w", "m")[:level])
    if level == 4:
        c.rect(2, 28, 15, 28, "u")
        c.rect(5, 30, 6, 34, "p")
        c.rect(5, 34, 6, 34, "u")
    return _finish(c)


def tower():
    """The Dusk Tower that lights up once four duskshards are found."""
    c = Canvas(WIDTH, HEIGHT)
    c.poly([(10, 39), (19, 39), (18, 12), (11, 12)], "l")
    c.recolor("l", "s", lambda x, y: x >= 16)
    for y in (18, 25, 32):
        c.rect(11, y, 18, y, "S")
    c.rect(13, 34, 16, 39, "B")
    c.rect(12, 6, 17, 12, "P")
    c.rect(13, 7, 16, 11, "v")
    c.rect(14, 8, 15, 10, "m")
    c.poly([(10, 6), (19, 6), (15, 0), (14, 0)], "p")
    c.recolor("p", "P", lambda x, y: x > 14 and y <= 6)
    c.rect(14, 19, 15, 21, "Y")
    c.outline()
    c.glow(14.5, 9, 9, "v", 0.45)
    return c
