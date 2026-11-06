"""Assembles the game's sprite sheets in www/img.

Each sheet starts from the original Gridland art kept in tools/art/legacy, and
new Duskward sprites are pasted over it or appended to it. As the art overhaul
goes on, more of every sheet is replaced with new sprites.

Usage: python tools/art/build.py
"""
import pathlib

import buildings
import tiles
from pngio import read_png, write_png

ROOT = pathlib.Path(__file__).resolve().parents[2]
LEGACY = ROOT / "tools" / "art" / "legacy"
OUT = ROOT / "www" / "img"

TILE = 52
NIGHT_TILES = 467  # matches the night background offsets in main.css
LANTERN_COLUMN = 312
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
    sheet = resized(read_png(LEGACY / "tiles.png"), LANTERN_COLUMN + TILE, 988)
    for level in (1, 2, 3):
        paste(sheet, tiles.lantern(level).to_rgba(), LANTERN_COLUMN, (level - 1) * TILE)
        paste(sheet, tiles.lantern(level, night=True).to_rgba(),
              LANTERN_COLUMN, NIGHT_TILES + (level - 1) * TILE)
    return sheet


def build_buildings():
    sheet = resized(read_png(LEGACY / "buildings.png"), 60, ALTAR_OFFSET + 3 * BUILDING_HEIGHT)
    for level in (1, 2, 3):
        row = (level - 1) * BUILDING_HEIGHT
        paste(sheet, buildings.lighthouse(level).to_rgba(), 0, LIGHTHOUSE_OFFSET + row)
        paste(sheet, buildings.altar(level).to_rgba(), 0, ALTAR_OFFSET + row)
    return sheet


def main():
    for name, build in (("tiles.png", build_tiles), ("buildings.png", build_buildings)):
        size = write_png(OUT / name, build())
        print(f"wrote www/img/{name} ({size} bytes)")


if __name__ == "__main__":
    main()
