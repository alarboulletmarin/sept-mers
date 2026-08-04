#!/usr/bin/env python3
"""
Rend les icônes de l'app à partir du logotype : les PNG du manifeste, et le
`favicon.ico` de la racine.

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


def rasterise(size: int, background: tuple, foreground: tuple, *, scale: float) -> list[list[tuple]]:
    """Rend une icône carrée, pleine et opaque, en lignes de triplets RVB."""
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
        line = []
        for column in range(size):
            covered = 0
            for sy in range(SAMPLES):
                for sx in range(SAMPLES):
                    px = (column + (sx + 0.5) / SAMPLES) * unit
                    py = (row + (sy + 0.5) / SAMPLES) * unit

                    for x1, y1, x2, y2 in strokes:
                        if capsule_distance(px, py, x1, y1, x2, y2) <= radius:
                            covered += 1
                            break

            mix = covered / (SAMPLES * SAMPLES)
            line.append(
                tuple(
                    round(background[channel] * (1 - mix) + foreground[channel] * mix)
                    for channel in range(3)
                )
            )
        rows.append(line)
    return rows


def encode_png(rows: list[list[tuple]]) -> bytes:
    """Encode des lignes RVB en PNG."""
    size = len(rows)
    raw = b''.join(
        bytes([0]) + bytes(channel for pixel in line for channel in pixel)  # filtre « None »
        for line in rows
    )

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (
            struct.pack('>I', len(payload))
            + tag
            + payload
            + struct.pack('>I', zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    # Type de couleur 2 : RVB sans canal alpha. La garantie « aucune
    # transparence » tient alors au format lui-même, pas à la vigilance.
    header = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', header)
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )


def encode_ico(images: list[list[list[tuple]]]) -> bytes:
    """
    Assemble plusieurs tailles en un seul `.ico`.

    Les images y sont en DIB — le BMP amputé de son en-tête de fichier — et non
    en PNG. Le PNG dans un ICO n'est lu qu'à partir de Vista, et l'intérêt d'un
    `.ico` est précisément d'être le format que tout comprend : ce serait
    reprendre d'une main ce qu'on donne de l'autre. À ces tailles, la
    compression ne pèse rien.

    Un DIB d'icône a deux particularités : sa hauteur déclarée vaut le double de
    la vraie, parce que le masque de transparence suit l'image, et ses lignes se
    lisent de bas en haut.
    """
    directory = b''
    payloads = []
    # 6 octets d'en-tête, puis une entrée de 16 octets par image.
    offset = 6 + 16 * len(images)

    for rows in images:
        size = len(rows)
        pixels = b''.join(
            # BGRA, et non RVBA : c'est l'ordre des octets d'un DIB 32 bits.
            bytes([blue, green, red, 0xFF])
            for line in reversed(rows)
            for red, green, blue in line
        )
        # Le masque : une ligne de bits par ligne d'image, complétée à un
        # multiple de quatre octets. Tout à zéro, donc rien de transparent —
        # la couche alpha ci-dessus, opaque partout, fait déjà foi.
        mask = bytes(((size + 31) // 32) * 4 * size)

        header = struct.pack(
            '<IiiHHIIiiII',
            40,  # taille de l'en-tête
            size,
            size * 2,  # image + masque
            1,  # plans
            32,  # bits par pixel
            0,  # sans compression
            len(pixels) + len(mask),
            0,
            0,
            0,
            0,
        )
        payload = header + pixels + mask
        payloads.append(payload)

        directory += struct.pack(
            '<BBBBHHII',
            size if size < 256 else 0,  # 0 vaut 256, un octet ne va pas plus loin
            size if size < 256 else 0,
            0,  # palette : aucune
            0,  # réservé
            1,  # plans
            32,  # bits par pixel
            len(payload),
            offset,
        )
        offset += len(payload)

    # 0 réservé, type 1 = icône (2 serait un curseur).
    return struct.pack('<HHH', 0, 1, len(images)) + directory + b''.join(payloads)


def main() -> None:
    public = Path(__file__).resolve().parent.parent / 'public'
    out = public / 'icons'
    out.mkdir(parents=True, exist_ok=True)

    # Toutes les icônes sont pleines et opaques, fond encre et houle claire,
    # comme le favicon. Deux raisons de ne plus arrondir ni détourer :
    #
    # - iOS jette la couche alpha et compose l'icône d'accueil sur du noir. Des
    #   coins transparents y devenaient un carré clair posé sur un carré noir.
    # - Android applique déjà son propre masque. Arrondir nous-mêmes, c'était
    #   arrondir deux fois.
    targets = [
        ('icon-192.png', 192, 1.0),
        ('icon-512.png', 512, 1.0),
        ('icon-180.png', 180, 1.0),
        # Maskable : le dessin tient dans les 80 % centraux, que le masque du
        # lanceur soit un cercle, un carré arrondi ou une goutte.
        ('icon-maskable-192.png', 192, 0.72),
        ('icon-maskable-512.png', 512, 0.72),
    ]

    for name, size, scale in targets:
        (out / name).write_bytes(encode_png(rasterise(size, INK, PAPER, scale=scale)))
        print(f'{name} {size}x{size}')

    # Le `.ico`, à la racine et non dans `icons/` : c'est `/favicon.ico` que les
    # navigateurs vont chercher d'eux-mêmes quand le document ne leur donne rien
    # qu'ils sachent lire, et ce chemin-là n'est pas négociable. Sans lui, la
    # réponse est un 404 et l'onglet retombe sur l'initiale du titre.
    #
    # Trois tailles, parce que les usages diffèrent : 16 pour un onglet en
    # densité simple, 32 pour la même chose en densité double et pour les
    # vignettes de Safari, 48 pour les raccourcis.
    sizes = (16, 32, 48)
    (public / 'favicon.ico').write_bytes(
        encode_ico([rasterise(size, INK, PAPER, scale=1.0) for size in sizes])
    )
    print('favicon.ico ' + ' '.join(f'{size}x{size}' for size in sizes))


if __name__ == '__main__':
    main()
