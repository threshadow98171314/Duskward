"""The Duskwarden: a hooded figure with an orange scarf and a sword.

Frames are 17x16 at 1x (34x32 in the sheet), four per row. Rows follow the
original layout: idle, walk right, walk left, attack right, attack left,
die facing right, die facing left, climb, hammer, carry, loot.
"""
from canvas import Canvas

W, H = 17, 16
FRAMES = 4
ROWS = 13
RIM = (255, 236, 160, 210)

HEAD = [
    "..PPP..",
    ".PpppP.",
    ".Ppnnn.",
    ".Ppnkn.",
    "..oooo.",
]

TORSO = [
    ".ppppP.",
    "opppppP",
    "pppppPP",
    "pbbubPP",
    ".pppPP.",
    ".pP.pP.",
]

LEGS_STAND = [".BB.BB.", ".BB.BB.", ".KK.KK."]
LEGS_APART = ["BB...BB", "BB...BB", "KK...KK"]
LEGS_TOGETHER = ["..BBB..", "..BBB..", "..KKK.."]
LEGS_KNEEL = ["BBBB...", "KK.KK.."]

LYING = [
    "..PPP...........",
    ".PpnnpppppppPBK.",
    ".PpkopppppppPBK.",
    "..PPP.PPPPPP....",
]


def _figure(c, dx=0, dy=0, legs=LEGS_STAND, scarf_up=False):
    c.ascii(5 + dx, 2 + dy, HEAD)
    c.ascii(5 + dx, 7 + dy, TORSO)
    c.ascii(5 + dx, 13 + dy, legs)
    if scarf_up:
        c.set(5 + dx, 8 + dy, "p")
        c.set(4 + dx, 7 + dy, "o")


def _blade(c, x0, y0, x1, y1, hilt):
    c.line(x0, y0, x1, y1, "l")
    c.set(x1, y1, "w")
    c.set(hilt[0], hilt[1], "u")


def _idle(f, c):
    _figure(c, scarf_up=f >= 2)
    c.set(4, 6, "u")  # sword hilt over the shoulder


def _walk(f, c):
    _figure(c, dy=-(f % 2), legs=LEGS_TOGETHER if f % 2 else LEGS_APART)


def _attack(f, c):
    _figure(c, dx=1 if f == 2 else 0)
    if f == 0:
        _blade(c, 10, 7, 6, 2, (11, 8))
    elif f == 1:
        _blade(c, 11, 6, 13, 0, (11, 7))
    elif f == 2:
        _blade(c, 13, 9, 16, 9, (12, 9))
    else:
        _blade(c, 12, 10, 15, 14, (11, 9))


def _die(f, c):
    if f == 0:
        # Knocked back, with the head drooping
        c.ascii(4, 3, HEAD)
        c.ascii(4, 7, TORSO)
        c.ascii(4, 13, LEGS_STAND)
    elif f == 1:
        c.ascii(5, 5, HEAD)
        c.ascii(5, 10, TORSO[:4])
        c.ascii(5, 14, LEGS_KNEEL)
    elif f == 2:
        _figure(c, dx=2, dy=6)
    else:
        c.ascii(0, 12, LYING)


def _climb(f, c):
    _figure(c, dy=12 - 4 * f)


def _hammer(f, c):
    _figure(c)
    handle, head = [((11, 8, 12, 3), (11, 1, 13, 2)), ((11, 8, 14, 6), (14, 4, 15, 6)),
                    ((11, 9, 14, 12), (14, 12, 16, 13)), ((11, 8, 14, 6), (14, 4, 15, 6))][f]
    c.line(*handle, "B")
    c.rect(*head, "S")


def _carry(f, c):
    _walk(f, c)
    c.rect(11, 8 - f % 2, 12, 9 - f % 2, "n")


def _loot(f, c):
    if f < 2:
        _figure(c, dy=2, legs=LEGS_TOGETHER[:2])
        c.rect(11, 11 + f, 12, 11 + f, "n")
    else:
        _figure(c)
        if f == 2:
            c.rect(11, 1, 11, 6, "p")
            c.set(11, 0, "n")
            c.set(12, 0, "y")


RIGHT_FACING = [_idle, _walk, _walk, _attack, _attack, _die, _die, _climb, _hammer, _carry, _loot]
MIRRORED_ROWS = (2, 4, 6)


def _mirrored(c):
    m = Canvas(c.w, c.h)
    for y in range(c.h):
        for x in range(c.w):
            m.px[y][c.w - 1 - x] = c.px[y][x]
    return m


def _rim(c):
    """Only the outline, lit warm, for the night layer drawn over the day sprite."""
    rim = Canvas(c.w, c.h)
    for y in range(c.h):
        for x in range(c.w):
            if c.px[y][x] is None and any(
                    c.get(x + dx, y + dy) is not None for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                rim.px[y][x] = RIM
    return rim


def frame(row, f, night=False):
    c = Canvas(W, H)
    if row < len(RIGHT_FACING):
        RIGHT_FACING[row](f, c)
        if row in MIRRORED_ROWS:
            c = _mirrored(c)
    if night:
        return _rim(c)
    c.outline()
    return c


def sheet(night=False, scale=2):
    """All animation rows as RGBA pixels, laid out like the original sprite sheet."""
    rows = []
    for row in range(ROWS):
        strips = [frame(row, f, night).to_rgba(scale) for f in range(FRAMES)]
        for y in range(H * scale):
            rows.append([p for strip in strips for p in strip[y]])
    return rows
