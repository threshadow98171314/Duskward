"""Pixel art canvas with simple drawing primitives.

Sprites are drawn at 1x with palette keys, then scaled up (2x by default) so
their pixels match the chunky look of the rest of the game.
"""

# Warm dusk palette shared by all new art. Keys are single characters so
# sprites can also be written as ASCII art.
PALETTE = {
    "k": (34, 24, 38),       # outline
    "K": (62, 46, 70),       # dark purple-grey
    "w": (255, 246, 228),    # warm white
    "Y": (255, 236, 160),    # pale glow
    "y": (255, 210, 92),     # flame core
    "o": (246, 150, 62),     # flame
    "O": (210, 98, 44),      # deep orange
    "r": (186, 64, 52),      # red
    "R": (122, 40, 46),      # dark red
    "n": (204, 158, 108),    # tan / clay
    "b": (146, 96, 62),      # wood
    "B": (94, 62, 44),       # dark wood
    "l": (216, 212, 214),    # light stone
    "s": (166, 160, 170),    # stone
    "S": (110, 104, 122),    # dark stone
    "v": (184, 148, 204),    # lavender
    "p": (124, 86, 150),     # purple
    "P": (80, 56, 106),      # dark purple
    "c": (104, 184, 206),    # glass / teal
    "C": (54, 112, 146),     # dark teal
    "g": (122, 170, 90),     # moss
    "G": (74, 114, 62),      # dark moss
    "m": (240, 128, 150),    # rose
    "u": (255, 196, 64),     # gold
    "U": (196, 136, 40),     # dark gold
}


def rgba(color):
    if color is None:
        return (0, 0, 0, 0)
    if isinstance(color, str):
        return PALETTE[color] + (255,)
    return color if len(color) == 4 else tuple(color) + (255,)


class Canvas:
    def __init__(self, width, height):
        self.w, self.h = width, height
        self.px = [[None] * width for _ in range(height)]

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[y][x]
        return None

    def set(self, x, y, color):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = color

    def rect(self, x0, y0, x1, y1, color):
        """Fills the rectangle with inclusive corners."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, color)

    def ellipse(self, cx, cy, rx, ry, color):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1:
                    self.set(x, y, color)

    def line(self, x0, y0, x1, y1, color):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.set(x0, y0, color)
            if x0 == x1 and y0 == y1:
                return
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def poly(self, points, color):
        """Scanline fill of a closed polygon given as (x, y) points."""
        ys = [p[1] for p in points]
        for y in range(min(ys), max(ys) + 1):
            xs = []
            for (x0, y0), (x1, y1) in zip(points, points[1:] + points[:1]):
                if y0 != y1 and min(y0, y1) <= y < max(y0, y1):
                    xs.append(x0 + (y - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for a, b in zip(xs[::2], xs[1::2]):
                for x in range(round(a), round(b) + 1):
                    self.set(x, y, color)

    def recolor(self, src, dst, test=None):
        """Replaces one color with another, optionally only where test(x, y) holds."""
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] == src and (test is None or test(x, y)):
                    self.px[y][x] = dst

    def ascii(self, x, y, rows):
        """Draws ASCII art where each character is a palette key and '.' is empty."""
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                if ch not in ". ":
                    self.set(x + dx, y + dy, ch)

    def outline(self, color="k"):
        """Wraps every filled shape in a one pixel outline."""
        edge = []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] is None and any(
                        self.get(x + dx, y + dy) is not None
                        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    edge.append((x, y))
        for x, y in edge:
            self.px[y][x] = color

    def glow(self, cx, cy, radius, color, strength=0.6):
        """Adds a soft halo behind the existing pixels."""
        r, g, b = rgba(color)[:3]
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] is None:
                    d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                    if d < radius:
                        self.px[y][x] = (r, g, b, int(255 * strength * (1 - d / radius) ** 1.5))

    def mirror_x(self):
        """Copies the left half onto the right half for symmetric sprites."""
        for y in range(self.h):
            for x in range(self.w // 2):
                self.px[y][self.w - 1 - x] = self.px[y][x]

    def to_rgba(self, scale=2):
        rows = []
        for row in self.px:
            line = [rgba(c) for c in row for _ in range(scale)]
            rows.extend(list(line) for _ in range(scale))
        return rows
