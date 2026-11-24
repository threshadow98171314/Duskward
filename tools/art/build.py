"""Assembles the game's sprite sheets in public/img, and the list of where every
sprite is on them (src/content/sprites.json), which the game draws from.

Each sheet starts from the original Gridland art kept in tools/art/legacy, and
new Duskward sprites are pasted over it or appended to it. As the art overhaul
goes on, more of every sheet is replaced with new sprites.

Usage: python tools/art/build.py
"""
import json
import pathlib

import buildings
import dude
import icons
import monsters
import portraits
import resources
import scenery
import village
from pngio import read_png, write_png

ROOT = pathlib.Path(__file__).resolve().parents[2]
LEGACY = ROOT / "tools" / "art" / "legacy"
OUT = ROOT / "public" / "img"
SPRITE_LIST = ROOT / "src" / "content" / "sprites.json"

TILE = 52
NIGHT_TILES = 467  # matches the night background offsets in main.css
DRAGON_TILES = 936
TILE_COLUMNS = {"grain": 0, "stone": 52, "wood": 104, "clay": 156, "cloth": 208, "mana": 260, "lantern": 312}
DUDE_OFFSET = 602  # dude and dudenight in graphics/sprites.js
DUDE_NIGHT_OFFSET = 1018
DUDE_END = 1434
BUILDING_HEIGHT = 80
LIGHTHOUSE_OFFSET = 2640  # also listed in graphics/sprites.js
ALTAR_OFFSET = 2880


def resized(pixels, width, height):
    """Returns a copy grown (or cropped) to the given size, padded with transparency."""
    out = [[(0, 0, 0, 0)] * width for _ in range(height)]
    for y, row in enumerate(pixels[:height]):
        out[y][:min(width, len(row))] = row[:width]
    return out


def paste(sheet, sprite, x, y):
    for dy, row in enumerate(sprite):
        for dx, p in enumerate(row):
            if p[3]:
                sheet[y + dy][x + dx] = p


def build_tiles():
    sheet = resized([], len(TILE_COLUMNS) * TILE, DRAGON_TILES + TILE)
    for name, x in TILE_COLUMNS.items():
        for level in range(1, resources.LEVELS[name] + 1):
            row = (level - 1) * TILE
            paste(sheet, resources.resource(name, level).to_rgba(), x, row)
            paste(sheet, resources.resource(name, level, night=True).to_rgba(), x, NIGHT_TILES + row)
    for name in ("grain", "clay", "cloth"):
        paste(sheet, resources.dragon_fight(name).to_rgba(), TILE_COLUMNS[name], DRAGON_TILES)
    return sheet


# Each building's sprite: where its rows start, how to draw a level, and how many levels
BUILDING_ROWS = [
    ("blacksmith", 0, village.blacksmith, 8),
    ("bricklayer", 640, village.bricklayer, 4),
    ("sawmill", 960, village.sawmill, 8),
    ("shack", 1600, village.shack, 4),
    ("tower", 1920, lambda level: village.tower(), 5),  # only the first row is used
    ("weaver", 2320, village.weaver, 4),
    ("lighthouse", LIGHTHOUSE_OFFSET, buildings.lighthouse, 3),
    ("altar", ALTAR_OFFSET, buildings.altar, 3),
]


def build_buildings():
    sheet = resized([], 60, ALTAR_OFFSET + 3 * BUILDING_HEIGHT)
    for _, offset, draw, levels in BUILDING_ROWS:
        for level in range(1, levels + 1):
            paste(sheet, draw(level).to_rgba(), 0, offset + (level - 1) * BUILDING_HEIGHT)
    return sheet


# Sprites on icons.png the game draws by name: (x, y, frame width, frame height, frames, rows).
# The interface's own icons are placed by the style sheets for now.
ICON_SPRITES = {
    "dragoneffects": (0, 88, 30, 44, 4, 2),  # original art: the ice block, then fire
    "gem": (0, 183, 12, 24, 4, 4),  # a row for each number of shards
    "star": (0, 875, 16, 16, 4, 1),
    "sun": (0, 891, 30, 30, 4, 2),  # the sun, then the moon
    "treasurechest": (0, 1011, 26, 26, 1, 2),  # closed, then open
}

# Areas of icons.png that are redrawn; the rest (volume sliders, dragon effects) is still original
ICON_AREAS = [(0, 0, 270, 60), (0, 60, 140, 88), (0, 183, 48, 279), (0, 279, 90, 335),
              (0, 335, 196, 363), (0, 362, 40, 442), (0, 794, 200, 874), (0, 875, 64, 891),
              (0, 891, 120, 951), (0, 951, 270, 1011), (0, 1011, 52, 1063)]


def build_icons():
    sheet = read_png(LEGACY / "icons.png")
    for x0, y0, x1, y1 in ICON_AREAS:
        for y in range(y0, y1):
            sheet[y][x0:x1] = [(0, 0, 0, 0)] * (x1 - x0)
    place = lambda canvas, x, y: paste(sheet, canvas.to_rgba(), x, y)
    for level in range(1, 10):
        x = (level - 1) * 30
        place(icons.shield_meter(level), x, 0)
        place(icons.shield_meter(level, outline=True), x, 30)
        place(icons.sword_meter(level), x, 951)
        place(icons.sword_meter(level, outline=True), x, 981)
    for i, name in enumerate(("confirm", "cancel", "export", "import", "delete")):
        place(icons.button(name), i * 28, 60)
    for count in range(1, 5):
        for frame in range(4):
            place(icons.shards(count, frame), frame * 12, 183 + (count - 1) * 24)
    for x, y, kind in ((0, 279, "outline"), (30, 279, "gold"), (60, 279, "fill"),
                       (0, 307, "nightOutline"), (30, 307, "gold")):
        place(icons.heart(kind), x, y)
    for i, name in enumerate(("healthPotion", "manaPotion", "bomb", "equipment", "shard", "callDragon", "dawnHeart")):
        place(icons.item(name), i * 28, 335)
    place(icons.menu(False), 0, 362)
    place(icons.menu(True), 0, 402)
    for i, name in enumerate(("resetBoard", "haste", "freezeTime", "phaseChange")):
        place(icons.spell(name), i * 40, 794)
        place(icons.spell(name), i * 40, 834)
    for frame in range(4):
        place(icons.star(frame), frame * 16, 875)
        place(icons.sun(frame), frame * 30, 891)
        place(icons.moon(frame), frame * 30, 921)
    place(icons.chest(False), 0, 1011)
    place(icons.chest(True), 0, 1037)
    return sheet


def build_monsters():
    sheet = read_png(LEGACY / "monsters.png")
    monsters.paint_sheet(sheet)
    monsters.draw_new(sheet)
    for y in range(DUDE_OFFSET, DUDE_END):
        sheet[y] = [(0, 0, 0, 0)] * len(sheet[y])
    paste(sheet, dude.sheet(), 0, DUDE_OFFSET)
    paste(sheet, dude.sheet(night=True), 0, DUDE_NIGHT_OFFSET)
    return sheet


def build_dragon():
    sheet = read_png(LEGACY / "dragonsprite.png")
    monsters.paint_dragon(sheet)
    return sheet


def sprite_list(sizes):
    """Where every sprite the game draws by name is, on the sheets just written."""
    sprites = {}

    def add(name, sheet, x, y, width, height, frames=1, rows=1):
        sprites[name] = dict(sheet=sheet, x=x, y=y, width=width, height=height, frames=frames, rows=rows)

    for name, offset, _, levels in BUILDING_ROWS:
        add(name, "buildings", 0, offset, 60, BUILDING_HEIGHT, rows=levels)
    for name, (offset, width, height, rows) in {**monsters.SHEET, **monsters.NEW}.items():
        add(name, "monsters", 0, offset, width, height, frames=4, rows=rows)
    add("dude", "monsters", 0, DUDE_OFFSET, dude.W * 2, dude.H * 2, frames=dude.FRAMES, rows=dude.ROWS)
    add("dudenight", "monsters", 0, DUDE_NIGHT_OFFSET, dude.W * 2, dude.H * 2, frames=dude.FRAMES, rows=dude.ROWS)
    add("dragon", "dragonsprite", 0, 0, 204, 164, frames=4, rows=10)
    add("dragonhead", "dragonsprite", 0, 1640, 81, 30, frames=3, rows=2)  # facing left, then right
    add("dragonneck", "dragonsprite", 0, 1700, 24, 24, rows=2)
    for name, (x, y, width, height, frames, rows) in ICON_SPRITES.items():
        add(name, "icons", x, y, width, height, frames=frames, rows=rows)
    for name, x in TILE_COLUMNS.items():
        add("tile." + name, "tiles", x, 0, TILE, TILE, rows=resources.LEVELS[name])
        add("tile." + name + ".night", "tiles", x, NIGHT_TILES, TILE, TILE, rows=resources.LEVELS[name])
    for name in ("grain", "clay", "cloth"):
        add("tile." + name + ".dragon", "tiles", TILE_COLUMNS[name], DRAGON_TILES, TILE, TILE)
    portrait = portraits.SIZE * portraits.SCALE
    add("portrait", "portraits", 0, 0, portrait, portrait, frames=len(portraits.PORTRAITS))
    # The sky's mountains and stars, each a whole sheet tiled across the world
    for name in ("mountains", "stars"):
        width, height = sizes[name + ".png"]
        add(name, name, 0, 0, width, height)

    used = {sprite["sheet"] for sprite in sprites.values()}
    sheets = {name[:-len(".png")]: dict(file="img/" + name, width=size[0], height=size[1])
              for name, size in sizes.items() if name[:-len(".png")] in used}
    return dict(sheets=sheets, sprites=sprites)


def main():
    sheets = (
        ("dragonsprite.png", build_dragon),
        ("portraits.png", portraits.sheet),
        ("tiles.png", build_tiles),
        ("buildings.png", build_buildings),
        ("monsters.png", build_monsters),
        ("icons.png", build_icons),
        ("expbar.png", lambda: icons.recolor_frame(read_png(LEGACY / "expbar.png"))),
        ("magic.png", lambda: icons.magic_sparkle().to_rgba()),
        ("mountains.png", lambda: scenery.mountains().to_rgba()),
        ("stars.png", lambda: scenery.stars().to_rgba()),
    )
    sizes = {}
    for name, build in sheets:
        pixels = build()
        sizes[name] = (len(pixels[0]), len(pixels))
        size = write_png(OUT / name, pixels)
        print(f"wrote public/img/{name} ({size} bytes)")
    SPRITE_LIST.write_text(json.dumps(sprite_list(sizes), indent="\t") + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {SPRITE_LIST.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
