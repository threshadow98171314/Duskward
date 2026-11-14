"""Portraits for the story's dialogue: Sera, the keeper, the traveler and the
cult's envoy. Each is 16x16 at 1x, drawn three times as large on the sheet, in
the order of CHARACTERS in src/content/story.ts.
"""
from canvas import Canvas

SIZE = 16
SCALE = 3


def sera():
    # The old lamp keeper: a purple shawl, grey hair, and her lantern's glow
    c = Canvas(SIZE, SIZE)
    c.ellipse(8, 16, 7.5, 5.5, "p")
    c.ellipse(8, 7, 5.6, 6.2, "P")
    c.ellipse(8, 8, 3.7, 4.3, "n")
    c.rect(5, 3, 11, 4, "l")
    c.set(4, 6, "l")
    c.set(12, 6, "l")
    c.set(6, 8, "k")
    c.set(10, 8, "k")
    c.set(7, 11, "r")
    c.set(8, 11, "r")
    c.ellipse(13, 13, 1.6, 1.6, "y")
    c.set(13, 13, "w")
    c.outline()
    return c


def keeper():
    # The keeper: a dark hood and the orange scarf
    c = Canvas(SIZE, SIZE)
    c.ellipse(8, 16, 7.5, 5.5, "p")
    c.ellipse(8, 7, 5.4, 6.4, "P")
    c.ellipse(8, 9, 3.4, 3.6, "n")
    c.rect(5, 6, 11, 6, "P")
    c.set(6, 9, "k")
    c.set(10, 9, "k")
    c.rect(4, 12, 12, 13, "o")
    c.rect(10, 14, 11, 15, "o")
    c.outline()
    return c


def traveler():
    # A traveler from beyond the mountains: a worn brown cloak and a beard
    c = Canvas(SIZE, SIZE)
    c.ellipse(8, 16, 7.5, 5.5, "b")
    c.ellipse(8, 7, 5.4, 6.0, "B")
    c.ellipse(8, 8, 3.6, 4.2, "n")
    c.ellipse(8, 11, 3.2, 2.2, "B")
    c.set(6, 8, "k")
    c.set(10, 8, "k")
    c.set(8, 10, "n")
    c.line(5, 5, 7, 4, "s")
    c.outline()
    return c


def envoy():
    # The cult's envoy: a black hood with gold trim, and eyes that glow in it
    c = Canvas(SIZE, SIZE)
    c.ellipse(8, 16, 7.5, 5.5, "K")
    c.ellipse(8, 7, 5.6, 6.6, "K")
    c.ellipse(8, 9, 3.2, 3.4, "k")
    c.line(3, 13, 8, 15, "u")
    c.line(13, 13, 8, 15, "u")
    c.set(6, 9, "y")
    c.set(10, 9, "y")
    c.set(8, 2, "u")
    c.outline()
    return c


PORTRAITS = (sera, keeper, traveler, envoy)


def sheet():
    rows = [[(0, 0, 0, 0)] * (SIZE * SCALE * len(PORTRAITS)) for _ in range(SIZE * SCALE)]
    for i, draw in enumerate(PORTRAITS):
        for y, row in enumerate(draw().to_rgba(scale=SCALE)):
            rows[y][i * SIZE * SCALE:(i + 1) * SIZE * SCALE] = row
    return rows
