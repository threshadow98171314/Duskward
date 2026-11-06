"""Interface icons: hearts, equipment meters, items, spells, sun and moon, and buttons.

Each function returns a Canvas at 1x; icons.png holds them at 2x in the slots
the original stylesheet points at.
"""
from canvas import Canvas
from resources import SHIELDS, SWORDS

LIGHT = (233, 220, 196, 255)  # outlines meant for the night side
DARK = (59, 42, 63, 255)      # matches the day border colour


def _heart_shape(c, color, x=0, y=0):
    c.ellipse(x + 4, y + 4, 3.5, 3.5, color)
    c.ellipse(x + 10, y + 4, 3.5, 3.5, color)
    c.poly([(x + 1, y + 5), (x + 13, y + 5), (x + 7, y + 12)], color)


def _only_outline(c, color):
    """Keeps just a one pixel outline around the shape, in the given colour."""
    out = Canvas(c.w, c.h)
    for y in range(c.h):
        for x in range(c.w):
            if c.px[y][x] is None and any(
                    c.get(x + dx, y + dy) is not None for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out.px[y][x] = color
    return out


def heart(kind):
    """'outline' and 'nightOutline' frame a heart; 'gold' frames a big heart; 'fill' is the red inside."""
    c = Canvas(15, 14)
    _heart_shape(c, "r", 0, 1)
    if kind == "fill":
        c.recolor("r", "R", lambda x, y: x + y > 15)
        c.ellipse(4, 4, 1, 1, "m")
        return c
    return _only_outline(c, {"outline": DARK, "nightOutline": LIGHT, "gold": "u"}[kind])


def shield_meter(level, outline=False):
    c = Canvas(15, 15)
    kind, face, rim, emblem, boss = SHIELDS[level - 1]
    if kind == "round":
        c.ellipse(7, 7, 6, 6, rim)
        c.ellipse(7, 7, 4.5, 4.5, face)
    else:
        c.poly([(1, 1), (13, 1), (13, 7), (7, 13), (1, 7)], rim)
        c.poly([(3, 3), (11, 3), (11, 7), (7, 11), (3, 7)], face)
    if boss or emblem:
        c.ellipse(7, 6, 1.5, 1.5, boss or "u")
    if outline:
        return _only_outline(c, LIGHT)
    c.outline()
    return c


def sword_meter(level, outline=False):
    c = Canvas(15, 15)
    edge, body, guard, grip, gem = SWORDS[level - 1]
    for i in range(7):
        c.set(6 + i, 8 - i, body)
        c.set(6 + i, 7 - i, edge)
    for i in range(3):
        c.set(3 + i, 7 + i, guard)
    c.line(4, 10, 2, 12, grip)
    if gem:
        c.set(5, 9, gem)
    if outline:
        return _only_outline(c, LIGHT)
    c.outline()
    return c


def item(name):
    c = Canvas(14, 14)
    if name in ("healthPotion", "manaPotion"):
        liquid = ("r", "R") if name == "healthPotion" else ("m", "p")
        c.ellipse(7, 9, 4.5, 4, "c")
        c.ellipse(7, 10, 3.5, 2.5, liquid[0])
        c.recolor(liquid[0], liquid[1], lambda x, y: y >= 11)
        c.rect(6, 2, 8, 5, "c")
        c.rect(6, 1, 8, 2, "b")
        c.set(5, 7, "w")
    elif name == "bomb":
        c.ellipse(7, 9, 4.5, 4, "b")
        c.rect(3, 7, 11, 7, "B")
        c.rect(3, 11, 11, 11, "B")
        c.line(9, 4, 11, 1, "n")
        c.set(12, 0, "y")
        c.set(11, 0, "o")
    elif name == "equipment":
        c.poly([(2, 4), (10, 4), (10, 8), (6, 12), (2, 8)], "b")
        c.line(5, 10, 12, 2, "l")
        c.line(4, 9, 6, 11, "u")
    elif name == "shard":
        c.poly([(7, 1), (10, 6), (7, 12), (4, 6)], "m")
        c.poly([(7, 1), (7, 12), (4, 6)], "v")
        c.set(6, 4, "w")
    else:  # callDragon: the Dawnwyrm's horn
        c.poly([(2, 10), (4, 6), (9, 3), (12, 2), (11, 5), (6, 9), (4, 12)], "n")
        c.rect(5, 7, 6, 9, "u")
        c.rect(8, 4, 9, 5, "u")
        c.ellipse(3, 11, 1.5, 1.5, "U")
    c.outline()
    return c


def spell(name):
    c = Canvas(20, 20)
    if name == "resetBoard":
        c.ellipse(10, 10, 7, 7, "c")
        c.ellipse(10, 10, 4.5, 4.5, None)
        c.rect(9, 1, 11, 4, None)
        c.rect(9, 16, 11, 19, None)
        c.poly([(12, 0), (15, 3), (12, 6)], "c")
        c.poly([(8, 14), (5, 17), (8, 20)], "c")
    elif name == "haste":
        for x0 in (3, 10):
            c.poly([(x0, 4), (x0 + 7, 10), (x0, 16)], "y")
        c.recolor("y", "o", lambda x, y: y > 10)
    elif name == "freezeTime":
        c.rect(5, 2, 15, 3, "u")
        c.rect(5, 17, 15, 18, "u")
        c.poly([(6, 4), (14, 4), (10, 10)], "c")
        c.poly([(10, 10), (14, 16), (6, 16)], "c")
        c.poly([(8, 13), (12, 13), (13, 16), (7, 16)], "y")
    else:  # phaseChange: half sun, half moon
        c.ellipse(10, 10, 7, 7, "y")
        c.recolor("y", "P", lambda x, y: x > 10)
        c.ellipse(13, 9, 2, 2, "v")
        for x, y in ((10, 1), (2, 10), (4, 4), (4, 16), (10, 19)):
            c.set(x, y, "o")
    c.outline()
    return c


def sun(frame):
    c = Canvas(15, 15)
    rays = ((7, 0), (7, 14), (0, 7), (14, 7)) if frame % 2 == 0 else ((2, 2), (12, 2), (2, 12), (12, 12))
    for x, y in rays:
        c.line(7, 7, x, y, "o")
    c.ellipse(7, 7, 4, 4, "y")
    c.ellipse(6, 6, 1.5, 1.5, "Y")
    c.outline("O")
    return c


def moon(frame):
    c = Canvas(15, 15)
    c.ellipse(7, 7, 5, 5, "w")
    c.ellipse(9, 6, 4, 4, None)
    c.glow(6, 8, 7 + frame % 2, (255, 246, 228), 0.35)
    return c


def star(frame):
    c = Canvas(8, 8)
    c.rect(3, 1, 4, 6, "u")
    c.rect(1, 3, 6, 4, "u")
    c.rect(3, 3, 4, 4, "Y" if frame % 2 else "y")
    c.outline("U")
    return c


def chest(opened):
    c = Canvas(13, 13)
    c.rect(1, 6, 11, 12, "b")
    c.rect(1, 9, 11, 9, "U")
    if opened:
        c.rect(1, 2, 11, 4, "B")
        c.rect(2, 5, 10, 6, "y")
    else:
        c.rect(1, 3, 11, 6, "b")
        c.rect(1, 3, 11, 3, "n")
        c.rect(5, 6, 7, 8, "u")
    c.outline()
    if opened:
        c.glow(6, 4, 7, "y", 0.5)
    return c


def shards(count, frame):
    """The duskshards found so far, floating above the tower."""
    c = Canvas(6, 12)
    for i in range(count):
        y = 9 - i * 3 - (1 if (frame + i) % 2 else 0)
        c.poly([(3, y - 1), (4, y), (3, y + 1), (2, y)], "m")
        c.set(3, y, "w" if (frame + i) % 4 == 0 else "v")
    return c


def button(name):
    c = Canvas(14, 14)
    if name == "confirm":
        c.line(2, 7, 5, 10, "g")
        c.line(5, 10, 11, 3, "g")
        c.line(2, 8, 5, 11, "G")
        c.line(5, 11, 11, 4, "G")
    elif name == "cancel":
        c.line(3, 3, 10, 10, "r")
        c.line(10, 3, 3, 10, "r")
        c.line(4, 3, 11, 10, "R")
        c.line(11, 3, 4, 10, "R")
    elif name in ("export", "import"):
        c.rect(1, 4, 9, 12, DARK)
        c.rect(3, 6, 7, 10, None)
        if name == "export":
            c.line(6, 8, 12, 2, "o")
            c.rect(10, 1, 12, 3, "o")
        else:
            c.line(12, 2, 6, 8, "o")
            c.rect(5, 7, 7, 9, "o")
    else:  # delete
        c.rect(3, 4, 10, 12, DARK)
        c.rect(2, 2, 11, 3, DARK)
        c.rect(5, 1, 8, 1, DARK)
        for x in (5, 8):
            c.rect(x, 6, x, 10, "s")
    return c


def magic_sparkle():
    """Drawn over the magic button."""
    c = Canvas(7, 7)
    c.rect(3, 0, 3, 6, "v")
    c.rect(0, 3, 6, 3, "v")
    c.rect(2, 2, 4, 4, "m")
    c.set(3, 3, "w")
    return c


def recolor_frame(pixels):
    """Swaps the original black and white frame colours for the dusk border colours."""
    swap = {(0, 0, 0): DARK, (255, 255, 255): LIGHT}
    return [[swap[p[:3]][:3] + (p[3],) if p[3] and p[:3] in swap else p for p in row] for row in pixels]


def menu(night):
    c = Canvas(20, 20)
    color = LIGHT if night else DARK
    for y in (5, 9, 13):
        c.rect(3, y, 16, y + 1, color)
    return c
