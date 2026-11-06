"""Buildings. Each one is 30x40 at 1x, standing on the bottom row of a 60x80 cell."""
from canvas import Canvas
from tiles import SMALL_FLAME, CRYSTAL_FLAME

WIDTH, HEIGHT = 30, 40


def _bricks(c, color, mortar, top, bottom):
    """Draws mortar lines over every pixel of one color, staggering the joints."""
    for y in range(top, bottom + 1):
        course = (y - top) // 4
        on_line = (y - top) % 4 == 3
        c.recolor(color, mortar, lambda x, yy: yy == y and (on_line or (x + course * 3) % 6 == 0))


def _beams(c, y0, y1, reach):
    """Soft light beams to either side of a lamp room."""
    for y in range(y0, y1 + 1):
        for i in range(reach):
            alpha = int(150 * (1 - i / reach))
            for x in (9 - i, 20 + i):
                if c.get(x, y) is None:
                    c.set(x, y, (255, 236, 160, alpha))


def lighthouse(level):
    """Watchtower: a wooden lamp stand, then a stone tower, then a striped lighthouse."""
    c = Canvas(WIDTH, HEIGHT)
    if level == 1:
        c.line(8, 39, 11, 14, "B")
        c.line(9, 39, 12, 14, "b")
        c.line(21, 39, 18, 14, "B")
        c.line(20, 39, 17, 14, "b")
        c.line(10, 31, 19, 22, "B")
        c.line(19, 31, 10, 22, "B")
        c.rect(9, 32, 20, 32, "b")
        c.rect(7, 12, 22, 13, "b")
        c.rect(7, 14, 22, 14, "B")
        c.rect(10, 5, 10, 11, "B")
        c.rect(19, 5, 19, 11, "B")
        c.rect(11, 6, 18, 11, "K")
        c.ascii(12, 6, SMALL_FLAME)
        c.poly([(8, 5), (21, 5), (14, 0), (15, 0)], "r")
        c.rect(8, 5, 21, 5, "R")
        c.outline()
        c.glow(14.5, 8, 8, "y", 0.4)
    elif level == 2:
        c.poly([(7, 39), (22, 39), (20, 16), (9, 16)], "s")
        _bricks(c, "s", "S", 16, 39)
        c.rect(13, 33, 16, 39, "B")
        c.rect(14, 32, 15, 32, "B")
        c.rect(6, 14, 23, 15, "B")
        c.rect(6, 12, 23, 12, "b")
        for x in (6, 10, 14, 15, 19, 23):
            c.rect(x, 13, x, 13, "b")
        c.rect(10, 6, 19, 11, "K")
        c.rect(11, 7, 18, 11, "c")
        c.ascii(12, 7, SMALL_FLAME)
        c.poly([(9, 6), (20, 6), (17, 2), (12, 2)], "r")
        c.recolor("r", "R", lambda x, y: x > 15)
        c.rect(14, 0, 15, 1, "u")
        c.outline()
        _beams(c, 7, 10, 5)
    else:
        c.poly([(8, 39), (21, 39), (19, 13), (10, 13)], "l")
        for top in (16, 24, 32):
            c.recolor("l", "p", lambda x, y, t=top: t <= y <= t + 3)
        c.recolor("l", "s", lambda x, y: x >= 17)
        c.rect(13, 34, 16, 39, "B")
        c.rect(14, 33, 15, 33, "B")
        c.rect(14, 21, 15, 22, "y")
        c.rect(7, 11, 22, 12, "U")
        c.rect(7, 9, 22, 9, "u")
        for x in (7, 11, 15, 19, 22):
            c.rect(x, 10, x, 10, "u")
        c.rect(10, 3, 19, 8, "K")
        c.rect(11, 4, 18, 8, "w")
        c.ascii(12, 4, SMALL_FLAME)
        c.poly([(9, 3), (20, 3), (15, 0), (14, 0)], "P")
        c.set(14, 0, "u")
        c.set(15, 0, "u")
        c.outline()
        _beams(c, 4, 7, 9)
    return c


def altar(level):
    """Altar of Dawn: a stone dais, then twin pillars with a floating sun orb, then a sun gate."""
    c = Canvas(WIDTH, HEIGHT)
    c.rect(5, 36, 24, 39, "s")
    c.rect(5, 36, 24, 36, "l")
    c.rect(8, 33, 21, 35, "s")
    c.rect(8, 33, 21, 33, "l")
    if level == 1:
        c.rect(11, 24, 18, 32, "l")
        c.rect(11, 24, 18, 24, "s")
        c.rect(13, 27, 16, 29, "S")
        c.ellipse(14.5, 23, 4.5, 4.5, "o")
        c.ellipse(14.5, 23, 2.5, 2.5, "y")
        c.recolor("o", None, lambda x, y: y > 23)
        c.recolor("y", None, lambda x, y: y > 23)
        for x, y in ((14, 16), (15, 16), (9, 18), (20, 18), (8, 22), (21, 22)):
            c.set(x, y, "u")
        c.outline()
        c.glow(14.5, 21, 9, "y", 0.35)
    elif level == 2:
        for x0 in (4, 22):
            c.rect(x0, 18, x0 + 3, 32, "l")
            c.rect(x0 + 2, 18, x0 + 3, 32, "s")
            c.rect(x0 - 1, 16, x0 + 4, 17, "s")
        c.rect(11, 26, 18, 32, "l")
        c.rect(13, 28, 16, 30, "S")
        c.ellipse(14.5, 18, 3.5, 3.5, "y")
        c.ellipse(14.5, 18, 2, 2, "w")
        c.outline()
        c.glow(14.5, 18, 11, "y", 0.5)
    else:
        for x0 in (4, 22):
            c.rect(x0, 11, x0 + 3, 32, "l")
            c.rect(x0 + 2, 11, x0 + 3, 32, "s")
        c.rect(2, 8, 27, 10, "s")
        c.rect(2, 8, 27, 8, "l")
        c.rect(13, 7, 16, 10, "u")
        c.rect(9, 11, 10, 17, "p")
        c.rect(19, 11, 20, 17, "p")
        c.rect(11, 27, 18, 32, "l")
        c.ellipse(14.5, 20, 5, 5, "u")
        c.ellipse(14.5, 20, 3.5, 3.5, "y")
        c.ellipse(14.5, 20, 1.5, 1.5, "w")
        for x0, y0, x1, y1 in ((14, 13, 14, 14), (15, 13, 15, 14), (8, 20, 8, 20),
                               (21, 20, 21, 20), (10, 15, 10, 15), (19, 15, 19, 15),
                               (10, 25, 10, 25), (19, 25, 19, 25)):
            c.rect(x0, y0, x1, y1, "u")
        c.outline()
        c.glow(14.5, 20, 13, "y", 0.55)
    return c
