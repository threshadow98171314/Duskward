"""Minimal PNG reading and writing with the standard library only.

Images are lists of rows, each row a list of (r, g, b, a) tuples.
"""
import struct
import zlib

SIGNATURE = b"\x89PNG\r\n\x1a\n"
CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}


def _unfilter(raw, width, height, channels):
    stride = width * channels
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(height):
        kind = raw[i]
        line = bytearray(raw[i + 1:i + 1 + stride])
        i += 1 + stride
        for x in range(stride):
            a = line[x - channels] if x >= channels else 0
            b = prev[x]
            c = prev[x - channels] if x >= channels else 0
            if kind == 1:
                line[x] = (line[x] + a) & 255
            elif kind == 2:
                line[x] = (line[x] + b) & 255
            elif kind == 3:
                line[x] = (line[x] + (a + b) // 2) & 255
            elif kind == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line)
        prev = line
    return rows


def read_png(path):
    data = open(path, "rb").read()
    if data[:8] != SIGNATURE:
        raise ValueError(f"{path} is not a PNG file")
    pos, idat, palette, alpha = 8, b"", None, None
    while pos < len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", body)
        elif kind == b"PLTE":
            palette = [tuple(body[i:i + 3]) for i in range(0, len(body), 3)]
        elif kind == b"tRNS":
            alpha = body
        elif kind == b"IDAT":
            idat += body
    if depth != 8 or interlace:
        raise ValueError(f"{path}: only 8-bit, non-interlaced PNGs are supported")
    channels = CHANNELS[color]
    pixels = []
    for line in _unfilter(zlib.decompress(idat), width, height, channels):
        row = []
        for x in range(width):
            v = line[x * channels:(x + 1) * channels]
            if color == 6:
                row.append(tuple(v))
            elif color == 2:
                row.append(tuple(v) + (255,))
            elif color == 3:
                a = alpha[v[0]] if alpha and v[0] < len(alpha) else 255
                row.append(palette[v[0]] + (a,))
            elif color == 0:
                row.append((v[0], v[0], v[0], 255))
            else:
                row.append((v[0], v[0], v[0], v[1]))
        pixels.append(row)
    return pixels


def png_bytes(pixels):
    height, width = len(pixels), len(pixels[0])
    raw = b"".join(b"\x00" + bytes(v for p in row for v in p) for row in pixels)

    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))

    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return (SIGNATURE + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def write_png(path, pixels):
    data = png_bytes(pixels)
    with open(path, "wb") as f:
        f.write(data)
    return len(data)
