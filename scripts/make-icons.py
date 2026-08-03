#!/usr/bin/env python3
"""
Rend les icônes PNG de l'app à partir du logotype.

Le logotype est décrit une seule fois, en unités du viewBox 48x48, et
rastérisé ici sans dépendance : sept segments à extrémités arrondies, donc
sept capsules, plus un fond. Le suréchantillonnage donne l'anticrénelage.

    python3 scripts/make-icons.py
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

# Les sept traits du logotype, en unités du viewBox, et leur épaisseur.
STROKES = [
    (10, 12, 22, 12),
    (26, 12, 38, 12),
    (8, 20, 24, 20),
    (28, 20, 40, 20),
    (12, 28, 32, 28),
    (36, 28, 40, 28),
    (10, 36, 38, 36),
]
STROKE_WIDTH = 3.0
VIEWBOX = 48.0
CORNER_RADIUS = 11.0

CANVAS = (0xE4, 0xE4, 0xE2)
INK = (0x0F, 0x0F, 0x0F)
PAPER = (0xFF, 0xFF, 0xFF)

SAMPLES = 4  # suréchantillonnage par axe


def capsule_distance(px: float, py: float, x1: float, y1: float, x2: float, y2: float) -> float:
    """Distance d'un point au segment, ce qui donne la capsule à extrémités rondes."""
    dx, dy = x2 - x1, y2 - y1
    length_squared = dx * dx + dy * dy
    if length_squared == 0:
        t = 0.0
    else:
        t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / length_squared))
    nearest_x, nearest_y = x1 + t * dx, y1 + t * dy
    return ((px - nearest_x) ** 2 + (py - nearest_y) ** 2) ** 0.5


def inside_rounded_rect(px: float, py: float, size: float, radius: float) -> bool:
    cx = min(max(px, radius), size - radius)
    cy = min(max(py, radius), size - radius)
    return (px - cx) ** 2 + (py - cy) ** 2 <= radius * radius


def render(size: int, background: tuple, foreground: tuple, *, rounded: bool, scale: float) -> bytes:
    """Rend une icône carrée et rend les octets PNG."""
    unit = VIEWBOX / size
    radius = STROKE_WIDTH / 2 * scale
    centre = VIEWBOX / 2

    # Les traits, éventuellement rétrécis vers le centre pour la zone sûre
    # d'une icône maskable.
    strokes = [
        (
            centre + (x1 - centre) * scale,
            centre + (y1 - centre) * scale,
            centre + (x2 - centre) * scale,
            centre + (y2 - centre) * scale,
        )
        for x1, y1, x2, y2 in STROKES
    ]

    rows = []
    for row in range(size):
        line = bytearray()
        line.append(0)  # filtre PNG « None »
        for column in range(size):
            covered = 0
            opaque = 0
            for sy in range(SAMPLES):
                for sx in range(SAMPLES):
                    px = (column + (sx + 0.5) / SAMPLES) * unit
                    py = (row + (sy + 0.5) / SAMPLES) * unit

                    if rounded and not inside_rounded_rect(px, py, VIEWBOX, CORNER_RADIUS):
                        continue
                    opaque += 1

                    for x1, y1, x2, y2 in strokes:
                        if capsule_distance(px, py, x1, y1, x2, y2) <= radius:
                            covered += 1
                            break

            total = SAMPLES * SAMPLES
            alpha = round(255 * opaque / total)
            if opaque == 0:
                line.extend((0, 0, 0, 0))
                continue

            mix = covered / opaque
            pixel = tuple(
                round(background[channel] * (1 - mix) + foreground[channel] * mix)
                for channel in range(3)
            )
            line.extend((*pixel, alpha))
        rows.append(bytes(line))

    raw = b''.join(rows)

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (
            struct.pack('>I', len(payload))
            + tag
            + payload
            + struct.pack('>I', zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    header = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', header)
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )


def main() -> None:
    out = Path(__file__).resolve().parent.parent / 'public' / 'icons'
    out.mkdir(parents=True, exist_ok=True)

    targets = [
        ('icon-192.png', 192, CANVAS, INK, True, 1.0),
        ('icon-512.png', 512, CANVAS, INK, True, 1.0),
        ('icon-180.png', 180, CANVAS, INK, True, 1.0),
        # Maskable : le dessin tient dans les 80 % centraux, fond plein bord.
        ('icon-maskable-512.png', 512, INK, PAPER, False, 0.68),
    ]

    for name, size, background, foreground, rounded, scale in targets:
        (out / name).write_bytes(
            render(size, background, foreground, rounded=rounded, scale=scale)
        )
        print(f'{name} {size}x{size}')


if __name__ == '__main__':
    main()
