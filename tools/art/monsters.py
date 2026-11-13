"""Monsters: the original Gridland silhouettes, painted as creatures of the dusk.

Every original monster is a white silhouette on the monster sheet, with its
walk, attack and death animations. Here each pixel is repainted by how deep it
lies inside the silhouette: the edge catches a rim of light, the inside runs
from the monster's body color at the top to its shadow color at the feet, and a
dark outline keeps the shape readable against the night sky.

The monster sheet keeps its layout: each monster has its block of rows at the
offset listed in src/app/graphics/sprites.js, four frames to a row.
"""

# Frame size and rows of each monster on the sheet, by sprite name, in the
# order of graphics/sprites.js. Sizes match the monster classes in main.css.
SHEET = {
    "demon": (0, 72, 86, 7),
    "earthelemental": (1434, 58, 74, 7),
    "fireelemental": (1952, 30, 41, 7),
    "harmour": (2239, 70, 49, 7),
    "imp": (2582, 30, 60, 7),
    "lich": (3002, 41, 60, 9),
    "lizardman": (3542, 32, 35, 7),
    "rat": (3787, 40, 13, 7),
    "skeleton": (3878, 27, 32, 7),
    "spider": (4102, 60, 38, 7),
    "warlock": (4368, 24, 37, 7),
    "waterelemental": (4627, 53, 39, 7),
    "zombie": (4900, 16, 32, 7),
}

# rim: the lit edge; top and bottom: the body, lit from above; outline: the dark edge
PAINT = {
    # Shambler: a villager swallowed by the long night
    "zombie": dict(rim=(196, 170, 222), top=(108, 86, 140), bottom=(52, 40, 76), outline=(18, 12, 30)),
    # Gnawer: a black rat that eats light, eyes like embers
    "rat": dict(rim=(246, 150, 62), top=(84, 66, 92), bottom=(40, 30, 48), outline=(16, 10, 20)),
    # Candlebone archer: old bones in candlelight
    "skeleton": dict(rim=(255, 236, 160), top=(232, 222, 206), bottom=(166, 150, 140), outline=(30, 22, 34)),
    # Vacant mail: a night watchman's armour, empty
    "harmour": dict(rim=(176, 226, 236), top=(132, 140, 160), bottom=(70, 72, 92), outline=(16, 14, 26)),
    # Marsh lurker
    "lizardman": dict(rim=(214, 236, 150), top=(110, 158, 86), bottom=(52, 84, 50), outline=(14, 22, 16)),
    # Nightweaver
    "spider": dict(rim=(240, 128, 150), top=(96, 64, 116), bottom=(44, 28, 58), outline=(14, 8, 20)),
    # Dusk golem: rock burnt red by the setting sun
    "earthelemental": dict(rim=(255, 210, 92), top=(196, 104, 64), bottom=(110, 50, 42), outline=(30, 12, 14)),
    # Ember wisp: a hearth fire gone wild
    "fireelemental": dict(rim=(255, 246, 190), top=(255, 186, 72), bottom=(214, 82, 40), outline=(60, 18, 14)),
    # Mist wraith
    "waterelemental": dict(rim=(236, 250, 255), top=(130, 196, 214), bottom=(62, 110, 146), outline=(12, 24, 40)),
    # Night terror
    "demon": dict(rim=(240, 128, 150), top=(150, 52, 60), bottom=(72, 24, 40), outline=(20, 6, 12)),
    # Eclipse cultist: black robes, gold trim
    "warlock": dict(rim=(255, 196, 64), top=(92, 64, 120), bottom=(40, 26, 58), outline=(12, 8, 18)),
    # Shadowbat
    "imp": dict(rim=(184, 148, 204), top=(70, 52, 92), bottom=(34, 24, 48), outline=(10, 6, 16)),
    # Night hierophant: the cult's high priest, lit by a sickly glow
    "lich": dict(rim=(210, 246, 150), top=(110, 84, 140), bottom=(48, 34, 70), outline=(12, 8, 20)),
}


def _mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def paint_frame(cell, paint):
    """Repaints one frame (a grid of RGBA pixels) in place."""
    h = len(cell)
    w = len(cell[0])
    filled = [[cell[y][x][3] > 0 for x in range(w)] for y in range(h)]
    accents = [[tuple(cell[y][x]) == (255, 0, 255, 255) for x in range(w)] for y in range(h)]
    # Depth inside the silhouette: 1 on the edge, growing inwards
    depth = [[0] * w for _ in range(h)]
    frontier = []
    for y in range(h):
        for x in range(w):
            if filled[y][x] and any(
                    not (0 <= x + dx < w and 0 <= y + dy < h) or not filled[y + dy][x + dx]
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                depth[y][x] = 1
                frontier.append((x, y))
    while frontier:
        nxt = []
        for x, y in frontier:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and filled[ny][nx] and depth[ny][nx] == 0:
                    depth[ny][nx] = depth[y][x] + 1
                    nxt.append((nx, ny))
        frontier = nxt
    rows = [y for y in range(h) if any(filled[y])]
    if not rows:
        return
    top, bottom = rows[0], rows[-1]
    out = [[(0, 0, 0, 0)] * w for _ in range(h)]
    for y in range(h):
        t = (y - top) / max(1, bottom - top)
        body = _mix(paint["top"], paint["bottom"], t)
        for x in range(w):
            d = depth[y][x]
            if d == 0:
                # A dark outline around the shape
                if any(0 <= x + dx < w and 0 <= y + dy < h and filled[y + dy][x + dx]
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    out[y][x] = paint["outline"] + (255,)
                continue
            if d == 1:
                # Light falls from above: upper edges catch the rim, lower edges stay in shadow
                lit = y - 1 < 0 or not filled[y - 1][x] or x - 1 < 0 or not filled[y][x - 1]
                color = paint["rim"] if lit else _mix(body, paint["rim"], 0.35)
            elif d == 2:
                color = _mix(body, paint["rim"], 0.18)
            else:
                color = body
            if accents[y][x]:
                color = paint["accent"]
            out[y][x] = color + (255,)
    for y in range(h):
        cell[y][:] = out[y]


def paint_sheet(sheet):
    """Repaints every monster on a copy of the original monster sheet, in place."""
    for name, (offset, w, h, rows) in SHEET.items():
        for row in range(rows):
            for frame in range(4):
                x0, y0 = frame * w, offset + row * h
                cell = [sheet[y0 + y][x0:x0 + w] for y in range(h)]
                paint_frame(cell, PAINT[name])
                for y in range(h):
                    sheet[y0 + y][x0:x0 + w] = cell[y]


# --- New monsters, drawn here as silhouettes and painted like the rest ---

BODY = (255, 255, 255, 255)
# Pixels marked with this color are painted in the monster's accent (eyes, glow)
MARK = (255, 0, 255, 255)

NEW = {
    # name: (offset on the sheet, width, height, rows)
    "shade": (5124, 20, 34, 9),
    "lampmoth": (5430, 18, 14, 7),
    "duskcrow": (5528, 24, 16, 7),
}
SHEET_HEIGHT = 5640

PAINT.update({
    # Shade: a scrap of the long night with two pale eyes
    "shade": dict(rim=(176, 158, 222), top=(58, 42, 86), bottom=(24, 16, 40), outline=(8, 4, 14),
                  accent=(255, 236, 160)),
    # Lampmoth: dusty wings, a body that glows like the lanterns it chases
    "lampmoth": dict(rim=(255, 236, 160), top=(206, 178, 132), bottom=(140, 112, 84), outline=(30, 22, 20),
                     accent=(255, 210, 92)),
    # Dusk crow: black feathers lit orange by the last of the sun
    "duskcrow": dict(rim=(246, 150, 62), top=(70, 54, 88), bottom=(34, 26, 46), outline=(10, 6, 14),
                     accent=(255, 210, 92)),
})
PAINT["imp"] = dict(rim=(214, 182, 238), top=(92, 70, 120), bottom=(40, 28, 56), outline=(10, 6, 16))


class Mask:
    """A frame being drawn: filled pixels, some of them marked as accents."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    def set(self, x, y, value=BODY):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = value

    def span(self, y, x0, x1, value=BODY):
        for x in range(int(round(x0)), int(round(x1)) + 1):
            self.set(x, y, value)

    def ellipse(self, cx, cy, rx, ry, value=BODY):
        for y in range(self.h):
            for x in range(self.w):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    self.px[y][x] = value

    def line(self, x0, y0, x1, y1, value=BODY):
        steps = int(max(abs(x1 - x0), abs(y1 - y0))) or 1
        for i in range(steps + 1):
            self.set(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps, value)

    def poly(self, points, value=BODY):
        for y in range(self.h):
            for x in range(self.w):
                inside = False
                j = len(points) - 1
                for i, (xi, yi) in enumerate(points):
                    xj, yj = points[j]
                    if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                        inside = not inside
                    j = i
                if inside:
                    self.px[y][x] = value

    def dissolve(self, amount):
        """Clears a share of the pixels, as if the monster were coming apart."""
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] is not None and ((x * 73856093) ^ (y * 19349663)) % 97 / 97 < amount:
                    self.px[y][x] = None

    def sink(self, dy):
        self.px = [[None] * self.w for _ in range(dy)] + self.px[:self.h - dy]

    def mirrored(self):
        out = Mask(self.w, self.h)
        out.px = [list(reversed(row)) for row in self.px]
        return out

    def rgba(self):
        return [[p if p is not None else (0, 0, 0, 0) for p in row] for row in self.px]


def _shade(row, frame):
    m = Mask(20, 34)
    kind = ("idle", "walk", "walk", "attack", "attack", "die", "die", "cast", "cast")[row]
    bob = (0, -1, -1, 0)[frame]
    lean = (-1, 2, 1, 0)[frame] if kind == "attack" else 0
    sway = (0, 1, 0, -1)[frame]
    # The hood, with two pale eyes looking ahead
    m.ellipse(10 + lean, 7 + bob, 3.2, 3.6)
    m.set(11 + lean, 7 + bob, MARK)
    m.set(13 + lean, 7 + bob, MARK)
    # A robe that frays into a wisp instead of feet
    widths = [3, 4, 5, 5, 6, 6, 6, 6, 6, 6, 5, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0]
    for i, half in enumerate(widths):
        y = 10 + i + bob
        drift = sway * max(0, i - 10) / 10 + lean * max(0, 10 - i) / 10
        m.span(y, 10 + drift - half, 10 + drift + half)
    if kind == "attack":
        # A grasping arm: drawn back, then lunging forward
        hand = ((12, 5), (19, 12), (18, 15), (15, 17))[frame]
        m.line(14 + lean, 13 + bob, hand[0], hand[1] + bob)
        m.line(hand[0], hand[1] + bob, hand[0] + 1, hand[1] + bob - 1)
        m.line(hand[0], hand[1] + bob, hand[0] + 1, hand[1] + bob + 1)
    elif kind == "cast":
        # Both arms raised, gathering a knot of darkness overhead
        m.line(6, 13 + bob, 5, 6 + bob)
        m.line(14, 13 + bob, 15, 6 + bob)
        radius = (0.8, 1.5, 2.2, 2.6)[frame]
        m.ellipse(10, 2.5, radius + 0.4, radius)
    else:
        m.line(14, 13 + bob, 16, 18 + bob)
    if kind == "die":
        m.dissolve((0.0, 0.3, 0.6, 0.85)[frame])
        m.sink(frame * 2)
    return m


def _lampmoth(row, frame):
    m = Mask(18, 14)
    kind = ("fly", "fly", "fly", "attack", "attack", "die", "die")[row]
    bob = (0, -1, 0, 1)[frame]
    dx = (0, 2, 1, 0)[frame] if kind == "attack" else 0
    cy = 9 + bob
    # Two soft wings: raised, level, lowered, level
    wing = frame if kind == "fly" else (1, 0, 0, 1)[frame]
    if kind != "die":
        if wing == 0:
            m.ellipse(8 + dx, cy - 4, 3.2, 2.6)
            m.ellipse(6 + dx, cy - 2.5, 2.2, 1.8)
        elif wing == 2:
            m.ellipse(8 + dx, cy + 2.5, 3.0, 2.2)
            m.ellipse(6 + dx, cy + 1.5, 2.0, 1.6)
        else:
            m.ellipse(7 + dx, cy - 1.5, 4.2, 1.8)
    # A furry body with a glowing tail, and feathery antennae
    m.ellipse(9 + dx, cy, 3.4, 1.5)
    m.ellipse(13 + dx, cy - 0.5, 1.3, 1.3)
    m.line(13 + dx, cy - 2, 15 + dx, cy - 5)
    m.line(14 + dx, cy - 1, 17 + dx, cy - 3)
    for x in (6, 7):
        m.set(x + dx, cy, MARK)
    if kind == "die":
        # Wings folded, falling
        m.ellipse(8, cy - 2, 2.6, 1.3)
        m.dissolve((0.0, 0.3, 0.55, 0.8)[frame])
        m.sink((0, 1, 2, 3)[frame])
    return m


def _duskcrow(row, frame):
    m = Mask(24, 16)
    kind = ("fly", "fly", "fly", "attack", "attack", "die", "die")[row]
    bob = (0, -1, 0, 1)[frame]
    dx = (0, 3, 1, 0)[frame] if kind == "attack" else 0
    cy = 9 + bob
    # Wings with spread finger feathers: up, level, down, level
    wing = frame if kind == "fly" else (2, 0, 0, 2)[frame]
    if kind != "die":
        if wing == 0:
            m.poly([(8 + dx, cy), (13 + dx, cy), (12 + dx, cy - 5), (9 + dx, cy - 8)])
            for i, fx in enumerate((8, 10, 12)):
                m.line(fx + dx, cy - 6, fx - 1 + dx, cy - 8 - i % 2)
        elif wing == 2:
            m.poly([(8 + dx, cy), (13 + dx, cy), (11 + dx, cy + 5), (8 + dx, cy + 6)])
            for i, fx in enumerate((8, 10, 11)):
                m.line(fx + dx, cy + 4, fx - 1 + dx, cy + 6 + i % 2)
        else:
            m.poly([(7 + dx, cy), (13 + dx, cy), (9 + dx, cy - 3), (2 + dx, cy - 4)])
            for i, fy in enumerate((-4, -3)):
                m.line(4 + dx, cy + fy, 1 + dx, cy + fy - 1 + i)
    m.ellipse(11 + dx, cy, 5.0, 2.1)
    m.ellipse(16.5 + dx, cy - 1, 2.1, 1.9)
    # Beak, fanned tail and an ember of an eye
    m.poly([(18 + dx, cy - 2), (22 + dx, cy - 0.5), (18 + dx, cy + 0.5)])
    m.poly([(7, cy - 0.5), (2, cy - 2.5), (1, cy), (2, cy + 2.5), (7, cy + 1)])
    m.set(17 + dx, cy - 2, MARK)
    if kind == "die":
        m.ellipse(10, cy - 2, 3.5, 1.4)
        m.dissolve((0.0, 0.3, 0.55, 0.8)[frame])
        m.sink((0, 2, 3, 4)[frame])
    return m


DRAW = {"shade": _shade, "lampmoth": _lampmoth, "duskcrow": _duskcrow}


def draw_new(sheet):
    """Draws the new monsters onto the sheet, below the originals."""
    while len(sheet) < SHEET_HEIGHT:
        sheet.append([(0, 0, 0, 0)] * len(sheet[0]))
    for name, (offset, w, h, rows) in NEW.items():
        for row in range(rows):
            for frame in range(4):
                # Rows alternate facing after the first: walk, attack, die and cast, right then left
                facing_left = row in (2, 4, 6, 8)
                mask = DRAW[name](row - 1 if facing_left else row, frame)
                cell = (mask.mirrored() if facing_left else mask).rgba()
                paint_frame(cell, PAINT[name])
                x0, y0 = frame * w, offset + row * h
                for y in range(h):
                    sheet[y0 + y][x0:x0 + w] = cell[y]
