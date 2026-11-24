"""Backdrops for the world strip above the board: distant mountains, the near hills
at their foot, clouds to drift across the sky, and night stars."""
import math
import random

from canvas import Canvas

# The world strip is 480x110 at 2x; backdrops tile horizontally
WIDTH, HEIGHT = 240, 55


def _ridge(c, base, layers, color, cap=None, cap_depth=0):
    """Fills a ridge line made of summed sine waves, with an optional snow cap; returns its heights."""
    heights = []
    for x in range(c.w):
        h = base + sum(a * math.sin(x * f + p) for a, f, p in layers)
        heights.append(int(round(h)))
    top = min(heights)
    for x, h in enumerate(heights):
        for y in range(c.h - h, c.h):
            c.set(x, y, color)
        if cap and h - top < cap_depth:
            for y in range(c.h - h, min(c.h, c.h - h + 2)):
                c.set(x, y, cap)
    return heights


def mountains():
    """Two ridges ringing Afterglow Vale; the scene darkens them at night with a filter."""
    c = Canvas(WIDTH, 30)
    # Periods divide the strip width so the strip tiles seamlessly
    tau = 2 * math.pi / WIDTH
    _ridge(c, 17, [(6, tau * 3, 0.4), (3, tau * 7, 1.9), (1.5, tau * 17, 0.7)],
           (156, 143, 196, 255), cap="w", cap_depth=3)
    _ridge(c, 9, [(4, tau * 4, 2.2), (2, tau * 9, 0.3), (1, tau * 23, 1.1)], (108, 90, 143, 255))
    return c


def hills(seed=5):
    """The hills at the foot of the mountains: lower, closer and darker, with a few firs
    along the crest. They tile like the mountains."""
    c = Canvas(WIDTH, 16)
    tau = 2 * math.pi / WIDTH
    heights = _ridge(c, 6, [(2.5, tau * 5, 1.3), (1.2, tau * 11, 0.2), (0.6, tau * 31, 2.4)], (84, 70, 112, 255))
    rng = random.Random(seed)
    fir = (60, 50, 86, 255)
    for x in range(8, WIDTH - 8, 26):
        x += rng.randrange(-5, 6)
        ground = c.h - heights[x]
        # A crown narrowing to its tip, on a short trunk
        for dy, half in enumerate((0, 1, 1, 2)):
            for dx in range(-half, half + 1):
                c.set(x + dx, ground - 5 + dy, fir)
        c.set(x, ground - 1, fir)
    return c


# Clouds side by side on their sheet, each in a cell this big, drawn as overlapping puffs
CLOUD_W, CLOUD_H = 32, 10
CLOUDS = (
    ((10, 6, 7, 3), (17, 4, 6, 4), (24, 6, 6, 3)),
    ((8, 6, 6, 3), (15, 5, 5, 4), (21, 6, 5, 3)),
    ((12, 6, 9, 3), (19, 4, 5, 3)),
)


def clouds():
    """Small clouds for the sky to drift across, their undersides in shade."""
    c = Canvas(CLOUD_W * len(CLOUDS), CLOUD_H)
    for i, puffs in enumerate(CLOUDS):
        for cx, cy, rx, ry in puffs:
            c.ellipse(i * CLOUD_W + cx, cy, rx, ry, (255, 246, 228, 220))
    for x in range(c.w):
        for y in range(c.h - 1, -1, -1):
            if c.get(x, y) is not None:
                c.set(x, y, (226, 208, 214, 220))
                break
    return c


def stars(seed=11):
    c = Canvas(WIDTH, HEIGHT)
    rng = random.Random(seed)
    for _ in range(46):
        x, y = rng.randrange(WIDTH), rng.randrange(HEIGHT - 12)
        bright = rng.random()
        c.set(x, y, (255, 246, 228, int(110 + 145 * bright)))
        if bright > 0.85:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                c.set(x + dx, y + dy, (255, 236, 160, 90))
    return c
