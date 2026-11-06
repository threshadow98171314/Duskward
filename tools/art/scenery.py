"""Backdrops for the world strip above the board: distant mountains and night stars."""
import math
import random

from canvas import Canvas

# The world strip is 480x110 at 2x; backdrops tile horizontally
WIDTH, HEIGHT = 240, 55


def _ridge(c, base, layers, color, cap=None, cap_depth=0):
    """Fills a ridge line made of summed sine waves, with an optional snow cap."""
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


def mountains():
    """Two ridges ringing Afterglow Vale; the scene darkens them at night with a filter."""
    c = Canvas(WIDTH, 30)
    # Periods divide the strip width so the strip tiles seamlessly
    tau = 2 * math.pi / WIDTH
    _ridge(c, 17, [(6, tau * 3, 0.4), (3, tau * 7, 1.9), (1.5, tau * 17, 0.7)],
           (156, 143, 196, 255), cap="w", cap_depth=3)
    _ridge(c, 9, [(4, tau * 4, 2.2), (2, tau * 9, 0.3), (1, tau * 23, 1.1)], (108, 90, 143, 255))
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
