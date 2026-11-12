"""Generates Duskward's title image, badge and favicon from tile glyphs.

Every letter is drawn as a grid of bordered tiles in the game's resource
colours. Tile colours drift from light (left) to dark (right), like dusk.

Usage: python tools/brandgen.py
"""
import pathlib
import random
import struct
import zlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

BLACK = (0, 0, 0, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)
GRAIN = (238, 223, 166, 255)
STONE = (196, 196, 196, 255)
CLAY = (198, 86, 69, 255)
WOOD = (124, 88, 64, 255)

# Lowercase letters sit on rows 4-8 of a 9 row cell; ascenders use all 9.
GLYPHS = {
    "D": ["XXXXX.",
          "X....X",
          "X....X",
          "X....X",
          "X....X",
          "X....X",
          "X....X",
          "X....X",
          "XXXXX."],
    "u": ["X..X",
          "X..X",
          "X..X",
          "X..X",
          ".XXX"],
    "s": [".XXX",
          "X...",
          ".XX.",
          "...X",
          "XXX."],
    "k": ["X...",
          "X...",
          "X...",
          "X...",
          "X..X",
          "X.X.",
          "XX..",
          "X.X.",
          "X..X"],
    "w": ["X...X",
          "X...X",
          "X.X.X",
          "X.X.X",
          ".X.X."],
    "a": [".XX.",
          "...X",
          ".XXX",
          "X..X",
          ".XXX"],
    "r": ["X.XX",
          "XX..",
          "X...",
          "X...",
          "X..."],
    "d": ["...X",
          "...X",
          "...X",
          "...X",
          ".XXX",
          "X..X",
          "X..X",
          "X..X",
          ".XXX"],
}

BADGE_GLYPH = ["XXXXX.",
               "X....X",
               "X....X",
               "X....X",
               "X....X",
               "X....X",
               "XXXXX."]

CELL_ROWS = 9


def layout(word):
    """Returns the set of (col, row) tiles for a word, and its size in tiles."""
    tiles, col = set(), 0
    for ch in word:
        glyph = GLYPHS[ch]
        top = CELL_ROWS - len(glyph)
        for r, line in enumerate(glyph):
            for c, mark in enumerate(line):
                if mark == "X":
                    tiles.add((col + c, top + r))
        col += len(glyph[0]) + 1
    return tiles, col - 1, CELL_ROWS


def colour_tiles(tiles, width, seed):
    """Picks a colour per tile, never matching a neighbour, darkening to the right."""
    rng = random.Random(seed)
    colours = {}
    for col, row in sorted(tiles):
        t = col / max(width - 1, 1)
        weights = {
            GRAIN: 0.2 + 1.6 * (1 - t),
            STONE: 0.5 + 1.0 * (1 - t),
            WOOD: 0.4 + 1.4 * t,
            CLAY: 0.4 + 1.2 * t,
        }
        for dc, dr in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            weights.pop(colours.get((col + dc, row + dr)), None)
        choices = list(weights)
        colours[(col, row)] = rng.choices(choices, [weights[c] for c in choices])[0]
    return colours


def blank(width, height, fill=CLEAR):
    return [[fill] * width for _ in range(height)]


def rect(px, x0, y0, x1, y1, colour):
    for y in range(y0, y1):
        for x in range(x0, x1):
            px[y][x] = colour


def draw_tiles(px, colours, ox, oy, pitch, border):
    """Draws tiles whose borders overlap their neighbours', like the game board."""
    size = pitch + border
    for (col, row) in colours:
        x, y = ox + col * pitch, oy + row * pitch
        rect(px, x, y, x + size, y + size, BLACK)
    for (col, row), colour in colours.items():
        x, y = ox + col * pitch, oy + row * pitch
        rect(px, x + border, y + border, x + pitch, y + pitch, colour)


def png_bytes(px):
    height, width = len(px), len(px[0])
    raw = b"".join(b"\x00" + bytes(v for p in row for v in p) for row in px)

    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))

    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def ico_bytes(images):
    """Packs PNG images into an .ico container."""
    head = struct.pack("<HHH", 0, 1, len(images))
    offset = len(head) + 16 * len(images)
    entries, payload = b"", b""
    for size, data in images:
        entries += struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(data), offset + len(payload))
        payload += data
    return head + entries + payload


def make_title():
    # 600x167 to fit the title screen box. A 14px pitch fits all eight letters.
    width, height, pitch, border = 600, 167, 14, 3
    tiles, cols, rows = layout("Duskward")
    colours = colour_tiles(tiles, cols, seed=7)
    px = blank(width, height)
    ox = (width - (cols * pitch + border)) // 2
    draw_tiles(px, colours, ox, 15, pitch, border)
    return png_bytes(px)


def make_badge():
    # Same frame as the original badge: 3px margin, 3px black frame, white inside.
    px = blank(125, 125)
    rect(px, 3, 3, 122, 122, BLACK)
    rect(px, 6, 6, 119, 119, WHITE)
    tiles = {(c, r) for r, line in enumerate(BADGE_GLYPH) for c, m in enumerate(line) if m == "X"}
    draw_tiles(px, colour_tiles(tiles, 6, seed=3), 16, 9, 15, 3)
    return png_bytes(px)


def make_icon(size, pitch, border):
    tiles = {(c, r) for r, line in enumerate(BADGE_GLYPH) for c, m in enumerate(line) if m == "X"}
    colours = colour_tiles(tiles, 6, seed=3)
    px = blank(size, size)
    w, h = 6 * pitch + border, 7 * pitch + border
    if border:
        draw_tiles(px, colours, (size - w) // 2, (size - h) // 2, pitch, border)
    else:
        for (col, row), colour in colours.items():
            x, y = (size - w) // 2 + col * pitch, (size - h) // 2 + row * pitch
            rect(px, x, y, x + pitch, y + pitch, colour)
    return png_bytes(px)


def main():
    outputs = {
        ROOT / "public" / "img" / "title.png": make_title(),
        ROOT / "public" / "img" / "badge.png": make_badge(),
        ROOT / "public" / "favicon.ico": ico_bytes([(16, make_icon(16, 2, 0)), (32, make_icon(32, 4, 1))]),
    }
    for path, data in outputs.items():
        path.write_bytes(data)
        print(f"wrote {path.relative_to(ROOT)} ({len(data)} bytes)")


if __name__ == "__main__":
    main()
