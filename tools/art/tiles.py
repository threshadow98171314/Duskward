"""Board tile icons. Each icon is 26x26 at 1x and fills a 52x52 sprite cell."""
from canvas import Canvas

SIZE = 26

FLAME = [
    "...o...",
    "..ooo..",
    "..oyo..",
    ".oyYyo.",
    ".oyYyo.",
    ".OoyoO.",
    "..OOO..",
]

SMALL_FLAME = [
    "..o..",
    ".oyo.",
    ".yYy.",
    "oyYyo",
    ".OoO.",
]

CRYSTAL_FLAME = [
    "..v..",
    ".vmv.",
    ".mwm.",
    "vmwmv",
    ".pmp.",
]


def _oil_lamp(c):
    # Clay bowl with a spout on the left and a ring handle on the right
    c.ellipse(14, 16, 7, 4, "n")
    c.recolor("n", "b", lambda x, y: y >= 18)
    c.line(8, 16, 4, 13, "n")
    c.line(8, 17, 4, 14, "n")
    c.line(8, 15, 5, 13, "n")
    c.ellipse(22, 16, 2.5, 3, "b")
    c.ellipse(22, 16, 0.8, 1.2, None)
    c.ellipse(15, 12.5, 2, 0.8, "B")
    c.rect(11, 20, 17, 21, "b")
    c.set(10, 14, "w")
    c.set(11, 13, "w")
    c.ascii(1, 5, FLAME)
    return (4, 9)


def _hanging_lantern(c, night):
    c.ellipse(13, 2.5, 2, 1.5, "K")
    c.ellipse(13, 2.5, 0.6, 0.5, None)
    c.poly([(8, 7), (18, 7), (16, 4), (10, 4)], "B")
    c.rect(7, 7, 19, 8, "K")
    c.rect(8, 9, 18, 19, "K")
    c.rect(9, 9, 17, 19, "w" if night else "Y")
    c.rect(11, 9, 11, 19, "K")
    c.rect(15, 9, 15, 19, "K")
    c.ascii(11, 12, SMALL_FLAME)
    c.rect(7, 20, 19, 21, "K")
    c.rect(9, 22, 17, 22, "B")
    return (13, 14)


def _dusk_lantern(c, night):
    c.rect(13, 0, 13, 1, "u")
    c.poly([(7, 8), (19, 8), (13, 2)], "p")
    c.recolor("p", "P", lambda x, y: x > 13)
    c.rect(6, 8, 20, 9, "U")
    c.rect(8, 10, 18, 20, "U")
    c.rect(9, 10, 17, 20, "w" if night else "Y")
    c.ascii(11, 13, CRYSTAL_FLAME)
    c.set(6, 15, "u")
    c.set(20, 15, "u")
    c.rect(7, 21, 19, 22, "U")
    c.rect(9, 23, 17, 23, "p")
    return (13, 15)


def lantern(level, night=False):
    """Lantern resource: oil lamp, hanging lantern, then the Duskstone lantern."""
    c = Canvas(SIZE, SIZE)
    if level == 1:
        glow_at = _oil_lamp(c)
    elif level == 2:
        glow_at = _hanging_lantern(c, night)
    else:
        glow_at = _dusk_lantern(c, night)
    c.outline()
    if night:
        c.glow(glow_at[0], glow_at[1], 13, "y", 0.7)
    return c
