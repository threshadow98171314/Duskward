"""Assembles the game's sprite sheets in www/img.

Each sheet starts from the original Gridland art kept in tools/art/legacy, and
new Duskward sprites are pasted over it or appended to it. As the art overhaul
goes on, more of every sheet is replaced with new sprites.

Usage: python tools/art/build.py
"""
import pathlib

import buildings
import dude
import resources
import scenery
from pngio import read_png, write_png

ROOT = pathlib.Path(__file__).resolve().parents[2]
LEGACY = ROOT / "tools" / "art" / "legacy"
OUT = ROOT / "www" / "img"

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


def build_buildings():
    sheet = resized(read_png(LEGACY / "buildings.png"), 60, ALTAR_OFFSET + 3 * BUILDING_HEIGHT)
    for level in (1, 2, 3):
        row = (level - 1) * BUILDING_HEIGHT
        paste(sheet, buildings.lighthouse(level).to_rgba(), 0, LIGHTHOUSE_OFFSET + row)
        paste(sheet, buildings.altar(level).to_rgba(), 0, ALTAR_OFFSET + row)
    return sheet


def build_monsters():
    sheet = read_png(LEGACY / "monsters.png")
    for y in range(DUDE_OFFSET, DUDE_END):
        sheet[y] = [(0, 0, 0, 0)] * len(sheet[y])
    paste(sheet, dude.sheet(), 0, DUDE_OFFSET)
    paste(sheet, dude.sheet(night=True), 0, DUDE_NIGHT_OFFSET)
    return sheet


def main():
    sheets = (
        ("tiles.png", build_tiles),
        ("buildings.png", build_buildings),
        ("monsters.png", build_monsters),
        ("mountains.png", lambda: scenery.mountains().to_rgba()),
        ("stars.png", lambda: scenery.stars().to_rgba()),
    )
    for name, build in sheets:
        size = write_png(OUT / name, build())
        print(f"wrote www/img/{name} ({size} bytes)")


if __name__ == "__main__":
    main()
