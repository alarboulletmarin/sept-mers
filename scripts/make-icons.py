#!/usr/bin/env python3
"""
Rend les icônes de l'app à partir du logotype : les PNG du manifeste, et le
`favicon.ico` de la racine.

Le logotype est un tracé unique, en unités du viewBox 48x48, rastérisé ici sans
dépendance : les cubiques sont aplaties en polygones, puis remplies par
balayage à règle non nulle. La couverture d'un pixel est exacte en x et
suréchantillonnée en y, ce qui donne l'anticrénelage.

    python3 scripts/make-icons.py
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

VIEWBOX = 48.0

# Le logotype, à l'identique de `src/components/Icon.tsx` et de
# `public/icons/favicon.svg`. Un test compare les trois : le tracé ne vit à
# trois endroits que parce qu'aucun des trois ne peut lire les deux autres.
LOGO_PATH = (
    'M23 46.93C22.32 46.76 21.93 46.26 21.79 45.36C21.54 43.81 20.57 43.71 19.74 45.14C19.12 46.21 18.45 46.58 17.63 46.3C16.48 45.92 16.24 45 16.83 43.18C17.22 42 17.24 41.38 16.93 40.97L16.76 40.75L16.06 40.76C13.31 40.82 10.89 38.69 10.58 35.94C10.26 33.02 10.96 31.75 12.87 31.81C13.84 31.84 14.18 32.01 15.22 33C16.15 33.88 16.43 34.04 17.07 34.04C19.45 34.02 20.14 30.25 17.96 29.18C16.93 28.67 16.14 28.84 15.12 29.77C14 30.79 12.49 30.81 11.39 29.82C10.6 29.12 10.42 28.37 10.41 25.77C10.41 23.57 10.45 23.34 11.04 22.34C11.41 21.71 11.42 21.7 11.05 21.89C10.9 21.96 10.77 22.02 10.75 22.02C10.74 22.02 10.71 21.47 10.69 20.8C10.61 18.61 9.96 15.6 8.65 11.36C8.36 10.43 8.3 10.07 8.49 10.42C8.75 10.9 11.08 12.99 12.11 13.69C16.62 16.7 19.53 15.22 21.59 8.87C22.29 6.68 22.88 4.46 23.19 2.74C23.29 2.21 23.41 1.59 23.45 1.37L23.54 0.97L23.65 1.44C23.71 1.69 23.9 2.51 24.06 3.24C25.59 10.05 27.42 13.65 29.99 14.93C31.9 15.88 33.93 15.08 37.89 11.82C39.09 10.82 39.65 10.37 39.68 10.37C39.69 10.37 39.59 10.55 39.44 10.76C38.61 11.99 37.71 14.53 36.72 18.44C36.28 20.18 35.95 21.64 35.95 21.83C35.95 22.03 35.78 22.05 35.51 21.89C35.19 21.69 35.18 21.74 35.48 22.1C36.13 22.86 36.38 23.49 36.52 24.74C37.01 29.03 35.89 30.84 32.7 30.88C31.89 30.89 31.63 30.74 31.08 29.93C29.82 28.06 27.04 28.99 27.02 31.3C27.01 32.56 28.09 33.73 29.34 33.8C30.02 33.84 30.32 33.7 30.96 33.05C31.71 32.29 32.13 32.1 33.04 32.1C34.61 32.1 35.54 33.3 35.76 35.6C35.94 37.46 35.49 38.93 34.41 40.04C33.55 40.92 32.89 41.17 31.47 41.18C30.41 41.18 29.76 41.26 29.35 41.44L29.05 41.57L29.2 41.92C29.79 43.42 29.91 44.22 29.63 44.98C29.15 46.27 27.69 46.65 26.86 45.7C26.64 45.45 26.31 44.86 26.31 44.71C26.31 44.47 25.98 43.94 25.78 43.86C25.26 43.64 24.9 44.17 24.84 45.26C24.8 46 24.74 46.15 24.41 46.52C24.1 46.87 23.49 47.04 23 46.93Z'
    ' M26.26 39.98C27.01 39.69 27 38.39 26.22 36.12C25.81 34.9 25.3 34.11 24.48 33.42C23.44 32.54 22.46 32.73 21.83 33.93C21.36 34.85 20.34 38.01 20.31 38.7C20.26 39.62 20.55 40 21.31 40C22.02 40 22.51 39.63 23.03 38.68C23.19 38.38 23.37 38.13 23.41 38.11C23.51 38.08 23.89 38.59 24.2 39.18C24.62 39.97 25.44 40.29 26.26 39.98Z'
    ' M29.97 39.4C30.3 39.19 31.08 38.46 31.39 38.07C32.13 37.13 32.14 36.66 31.39 35.99C30.93 35.58 30.86 35.6 31.21 36.06C31.74 36.77 31.58 37.27 30.43 38.54C29.68 39.37 29.33 39.36 28.44 38.51C27.9 38 27.78 38 28.14 38.53C28.71 39.38 29.44 39.72 29.97 39.4Z'
    ' M14.99 38.34C14.97 38.32 14.78 38.25 14.57 38.17C13.61 37.84 13 37.21 12.54 36.12C12.37 35.7 12.35 36 12.52 36.6C12.77 37.51 13.16 37.99 13.88 38.24C14.17 38.34 15.07 38.42 14.99 38.34Z'
    ' M24.3 27.77C26.45 24.98 28.25 22.89 28.83 22.5C29.36 22.15 29.56 22.2 30.37 22.86C31.73 23.96 31.73 24.46 30.41 25.89C29.62 26.74 29.5 27.14 29.95 27.47C30.26 27.71 32.05 27.68 32.51 27.44C33.92 26.69 34.28 24.68 33.34 22.72C32.85 21.68 31.68 20.1 31.25 19.9C30.56 19.57 28.61 18.99 26.81 18.58C23.05 17.73 20.71 17.95 16.23 19.56L15.09 19.97L14.48 20.58C14.14 20.91 13.87 21.19 13.88 21.2C13.89 21.21 14.14 21.15 14.43 21.06C19.12 19.67 22.39 20.81 21.43 23.51C21.09 24.5 20.73 24.65 19.36 24.34C17.7 23.97 16.44 25.95 17.91 26.62C18.24 26.77 18.4 26.8 19.27 26.83C20.46 26.86 20.99 26.99 21.92 27.46C22.64 27.82 23.39 28.32 23.45 28.48C23.53 28.69 23.68 28.57 24.3 27.77Z'
)

# Le dessin remplit son cadre. Une tuile, elle, a besoin d'air autour : ces deux
# facteurs le rétrécissent vers le centre.
TILE = 0.78
# Maskable : le lanceur peut découper un cercle, un carré arrondi ou une goutte,
# et ne garantit que les 80 % centraux. Le crâne est haut : c'est son cercle
# circonscrit qui commande, pas sa hauteur.
MASKABLE = 0.66

INK = (0x0F, 0x0F, 0x0F)
PAPER = (0xFF, 0xFF, 0xFF)

# Sous-lignes par ligne de pixels. La couverture en x étant exacte, c'est le
# seul axe qui a besoin d'être échantillonné.
SAMPLES = 16
# Segments par cubique. À 512 px, une cubique du logotype fait au plus une
# quarantaine de pixels : 24 segments la rendent indiscernable d'une courbe.
STEPS = 24


def flatten(d: str) -> list[list[tuple]]:
    """Aplatit un `d` — M, L, C, Z absolus — en contours fermés de points."""
    tokens: list = []
    number = ''
    for char in d:
        if char in 'MLCZ':
            if number:
                tokens.append(float(number))
                number = ''
            tokens.append(char)
        elif char in ' ,':
            if number:
                tokens.append(float(number))
                number = ''
        elif char == '-' and number and number[-1] not in 'eE':
            # Un moins colle au nombre précédent : « 3-2 » fait deux nombres.
            # Sauf après un exposant, où il appartient encore au premier.
            tokens.append(float(number))
            number = '-'
        else:
            number += char
    if number:
        tokens.append(float(number))

    contours: list[list[tuple]] = []
    current: list[tuple] = []
    at = (0.0, 0.0)
    index = 0
    while index < len(tokens):
        command = tokens[index]
        index += 1
        if command == 'M':
            if len(current) > 2:
                contours.append(current)
            at = (tokens[index], tokens[index + 1])
            index += 2
            current = [at]
        elif command == 'L':
            at = (tokens[index], tokens[index + 1])
            index += 2
            current.append(at)
        elif command == 'C':
            x1, y1, x2, y2, x3, y3 = tokens[index : index + 6]
            index += 6
            x0, y0 = at
            for step in range(1, STEPS + 1):
                t = step / STEPS
                u = 1 - t
                current.append(
                    (
                        u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
                        u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
                    )
                )
            at = (x3, y3)
        elif command == 'Z':
            if len(current) > 2:
                contours.append(current)
            current = []
    if len(current) > 2:
        contours.append(current)
    return contours


def coverage(size: int, *, scale: float) -> list[list[float]]:
    """
    Part d'encre de chaque pixel, entre 0 et 1.

    Balayage classique : pour chaque sous-ligne, on croise les arêtes, on trie
    les abscisses, et on remplit les intervalles où la somme des sens de
    parcours n'est pas nulle — la règle non nulle, celle que SVG applique par
    défaut, et celle dont les contours intérieurs du logotype ont besoin pour
    rester creux.
    """
    unit = size / VIEWBOX
    centre = VIEWBOX / 2

    edges = []
    for contour in flatten(LOGO_PATH):
        placed = [
            ((centre + (x - centre) * scale) * unit, (centre + (y - centre) * scale) * unit)
            for x, y in contour
        ]
        for index in range(len(placed)):
            (x0, y0), (x1, y1) = placed[index], placed[(index + 1) % len(placed)]
            # Une arête horizontale ne croise aucune ligne de balayage.
            if y0 == y1:
                continue
            edges.append((min(y0, y1), max(y0, y1), x0, y0, x1, y1, 1 if y1 > y0 else -1))
    edges.sort(key=lambda edge: edge[0])

    rows = [[0.0] * size for _ in range(size)]
    pending = 0
    active: list = []
    for sub in range(size * SAMPLES):
        y = (sub + 0.5) / SAMPLES
        # Table d'arêtes actives : on n'examine que celles qui coupent la ligne.
        while pending < len(edges) and edges[pending][0] <= y:
            active.append(edges[pending])
            pending += 1
        active = [edge for edge in active if edge[1] > y]

        crossings = sorted(
            (x0 + (y - y0) * (x1 - x0) / (y1 - y0), winding)
            for _, _, x0, y0, x1, y1, winding in active
        )
        if not crossings:
            continue

        row = rows[sub // SAMPLES]
        depth = 0
        start = 0.0
        for x, winding in crossings:
            if depth == 0:
                start = x
            depth += winding
            if depth != 0 or x <= start:
                continue
            left, right = max(0.0, start), min(float(size), x)
            if right <= left:
                continue
            # Les deux pixels des bords ne prennent que leur part de
            # l'intervalle : c'est là que se joue l'anticrénelage horizontal.
            first, last = int(left), min(size - 1, int(right - 1e-9))
            if first == last:
                row[first] += right - left
            else:
                row[first] += first + 1 - left
                for column in range(first + 1, last):
                    row[column] += 1.0
                row[last] += right - last
    return [[min(1.0, value / SAMPLES) for value in row] for row in rows]


def rasterise(size: int, background: tuple, foreground: tuple, *, scale: float) -> list[list[tuple]]:
    """Rend une icône carrée, pleine et opaque, en lignes de triplets RVB."""
    return [
        [
            tuple(
                round(background[channel] * (1 - mix) + foreground[channel] * mix)
                for channel in range(3)
            )
            for mix in line
        ]
        for line in coverage(size, scale=scale)
    ]


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

    # Toutes les icônes sont pleines et opaques, fond encre et crâne clair,
    # comme le favicon. Deux raisons de ne plus arrondir ni détourer :
    #
    # - iOS jette la couche alpha et compose l'icône d'accueil sur du noir. Des
    #   coins transparents y devenaient un carré clair posé sur un carré noir.
    # - Android applique déjà son propre masque. Arrondir nous-mêmes, c'était
    #   arrondir deux fois.
    targets = [
        ('icon-192.png', 192, TILE),
        ('icon-512.png', 512, TILE),
        ('icon-maskable-192.png', 192, MASKABLE),
        ('icon-maskable-512.png', 512, MASKABLE),
    ]

    for name, size, scale in targets:
        (out / name).write_bytes(encode_png(rasterise(size, INK, PAPER, scale=scale)))
        print(f'{name} {size}x{size}')

    # Les deux fichiers de la racine, et non de `icons/`. Ce sont les chemins
    # qu'un client va chercher de lui-même quand le document ne lui donne rien
    # qu'il sache lire, ou qu'il ne lit pas le document du tout — un aspirateur
    # de liens, une prévisualisation, un Safari dont la page est en cache. La
    # balise du `<head>` reste la voie normale ; ceux-là sont le filet.
    root = [
        # 180 : la taille de référence d'iOS, celle d'où il redimensionne pour
        # tous les autres emplacements. Sans elle, l'écran d'accueil met une
        # capture de la page à la place de l'icône.
        ('apple-touch-icon.png', 180),
    ]
    for name, size in root:
        (public / name).write_bytes(encode_png(rasterise(size, INK, PAPER, scale=TILE)))
        print(f'{name} {size}x{size}')

    # Trois tailles dans le `.ico`, parce que les usages diffèrent : 16 pour un
    # onglet en densité simple, 32 pour la même chose en densité double et pour
    # les vignettes de Safari, 48 pour les raccourcis.
    sizes = (16, 32, 48)
    (public / 'favicon.ico').write_bytes(
        encode_ico([rasterise(size, INK, PAPER, scale=TILE) for size in sizes])
    )
    print('favicon.ico ' + ' '.join(f'{size}x{size}' for size in sizes))


if __name__ == '__main__':
    main()
