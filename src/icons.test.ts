import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * L'icône d'installation s'est déjà cassée deux fois, silencieusement, et de
 * deux façons qu'aucun test ne voyait :
 *
 * - Le manifeste déclarait le favicon SVG en premier, avec `sizes: "any"`.
 *   Chrome Android note cette taille comme la correspondance idéale, choisit
 *   l'entrée, ne sait pas rastériser un SVG de manifeste pour le lanceur, et
 *   retombe sur la lettre du nom. On installait l'app, on obtenait un « S ».
 * - Les PNG portaient des coins transparents. iOS jette la couche alpha et
 *   compose sur du noir avant d'appliquer son propre masque.
 *
 * D'où ces contrôles, qui lisent le manifeste et les fichiers eux-mêmes.
 */
const manifest = JSON.parse(
  readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'),
) as {
  id?: string
  icons: { src: string; sizes: string; type: string; purpose: string }[]
}

/** En-tête IHDR d'un PNG : largeur, hauteur et type de couleur. */
function readPng(path: string) {
  const bytes = readFileSync(new URL(`../public/${path}`, import.meta.url))
  const signature = bytes.subarray(0, 8).toString('hex')
  return {
    signature,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    // 2 = RVB, 6 = RVB + alpha. Voir la spécification PNG, chapitre IHDR.
    colourType: bytes.readUInt8(25),
  }
}

describe('icônes de l app', () => {
  it("ne déclare aucune icône vectorielle dans le manifeste", () => {
    // Le SVG reste le favicon, déclaré dans index.html : là il est rendu.
    for (const icon of manifest.icons) {
      expect(icon.type, `${icon.src} est déclarée en ${icon.type}`).toBe('image/png')
    }
  })

  it('déclare une icône maskable à chaque taille annoncée', () => {
    const maskable = manifest.icons.filter((icon) => icon.purpose === 'maskable')
    expect(maskable.map((icon) => icon.sizes).sort()).toEqual(['192x192', '512x512'])
  })

  it('déclare une identité d installation stable', () => {
    expect(manifest.id).toBeTruthy()
  })

  it('sert des fichiers qui existent, aux dimensions annoncées', () => {
    for (const icon of manifest.icons) {
      const png = readPng(icon.src.replace(/^\.\//, ''))
      expect(png.signature, `${icon.src} n'est pas un PNG`).toBe('89504e470d0a1a0a')
      expect(`${png.width}x${png.height}`, `${icon.src} ment sur sa taille`).toBe(icon.sizes)
    }
  })

  it('ne laisse aucune icône transparente, manifeste ou écran d accueil', () => {
    const paths = [...manifest.icons.map((icon) => icon.src.replace(/^\.\//, '')), 'icons/icon-180.png']
    for (const path of paths) {
      // Type 2 : RVB sans canal alpha. La transparence n'est alors pas
      // seulement absente, elle est impossible.
      expect(readPng(path).colourType, `${path} porte un canal alpha`).toBe(2)
    }
  })
})
