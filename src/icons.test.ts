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
 * - Le document ne déclarait, en petit format, qu'un SVG. Safari n'en fait
 *   rien en `rel="icon"`, Chrome sur Android non plus, et il n'y avait pas de
 *   `/favicon.ico` où retomber : les deux affichaient l'initiale du titre.
 *
 * D'où ces contrôles, qui lisent le manifeste, le document et les fichiers
 * eux-mêmes.
 */
const manifest = JSON.parse(
  readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'),
) as {
  id?: string
  icons: { src: string; sizes: string; type: string; purpose: string }[]
}

const document = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

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

/** Le répertoire d'un `.ico` : une entrée par taille embarquée. */
function readIco(path: string) {
  const bytes = readFileSync(new URL(`../public/${path}`, import.meta.url))
  const count = bytes.readUInt16LE(4)
  const entries = Array.from({ length: count }, (_, index) => {
    const at = 6 + 16 * index
    return {
      // Un octet ne va pas au-delà de 255 : zéro y vaut 256.
      width: bytes.readUInt8(at) || 256,
      height: bytes.readUInt8(at + 1) || 256,
      bitCount: bytes.readUInt16LE(at + 6),
      size: bytes.readUInt32LE(at + 8),
      offset: bytes.readUInt32LE(at + 12),
    }
  })
  return {
    reserved: bytes.readUInt16LE(0),
    // 1 = icône, 2 = curseur.
    type: bytes.readUInt16LE(2),
    entries,
    length: bytes.length,
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

describe('logotype', () => {
  /**
   * Le tracé vit à trois endroits : le composant React, le favicon SVG et le
   * générateur d'icônes. Aucun des trois ne peut lire les deux autres — l'un
   * est compilé dans le bundle, l'autre servi tel quel, le troisième est du
   * Python lancé à la main. D'où cette comparaison : une divergence ne se
   * verrait qu'à l'icône installée, c'est-à-dire trop tard.
   */
  const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

  /** Les espaces d'un `d` ne portent rien : on les ramène à une seule. */
  const tidy = (value: string) => value.replace(/\s+/g, ' ').trim()

  /** Recolle les littéraux d'une constante écrite sur plusieurs lignes. */
  const joined = (source: string, from: RegExp) =>
    tidy(
      [...(source.match(from)?.[1].matchAll(/'([^']*)'/g) ?? [])]
        .map(([, piece]) => piece)
        .join(''),
    )

  const component = joined(read('src/components/Icon.tsx'), /const LOGO_PATH =\n([\s\S]*?)\n\n/)
  const generator = joined(read('scripts/make-icons.py'), /LOGO_PATH = \(\n([\s\S]*?)\n\)/)
  const favicon = tidy(read('public/icons/favicon.svg').match(/\sd="([\s\S]*?)"/)?.[1] ?? '')

  it('est bien lu dans les trois fichiers', () => {
    // Un `d` vide passerait les comparaisons suivantes sans rien garantir.
    for (const [name, value] of [
      ['le composant', component],
      ['le générateur', generator],
      ['le favicon', favicon],
    ] as const) {
      expect(value.length, `tracé introuvable dans ${name}`).toBeGreaterThan(500)
      expect(value.startsWith('M'), `${name} ne commence pas par un déplacement`).toBe(true)
    }
  })

  it('est le même dans le composant, le favicon et le générateur', () => {
    expect(favicon, 'le favicon a divergé du composant').toBe(component)
    expect(generator, 'le générateur a divergé du composant').toBe(component)
  })
})

describe('favicon', () => {
  it('sert un .ico à la racine, aux trois tailles utiles', () => {
    // À la racine et non dans `icons/` : c'est `/favicon.ico` qu'un navigateur
    // demande de lui-même, et ce chemin ne se négocie pas.
    const ico = readIco('favicon.ico')
    expect(ico.reserved).toBe(0)
    expect(ico.type, 'ce n est pas une icône').toBe(1)
    expect(ico.entries.map((entry) => entry.width).sort((a, b) => a - b)).toEqual([16, 32, 48])
    for (const entry of ico.entries) {
      expect(entry.width, `${entry.width}x${entry.height} n est pas carrée`).toBe(entry.height)
      // 32 bits par pixel : la couche alpha est là, pleine, et le masque qui
      // suit l'image est à zéro. Rien n'est découpé.
      expect(entry.bitCount).toBe(32)
      expect(entry.offset + entry.size, 'une image déborde du fichier').toBeLessThanOrEqual(
        ico.length,
      )
    }
  })

  it('déclare un raster, et pas seulement le SVG', () => {
    /*
     * Safari ne rend pas un SVG déclaré en `rel="icon"`, et Chrome sur Android
     * non plus. Avec le seul vectoriel, les deux ne trouvaient aucune icône et
     * dessinaient l'initiale du titre — le « S » qu'on a vu deux fois.
     */
    const icons = [...document.matchAll(/<link\s+rel="(?:apple-touch-)?icon"[^>]*>/g)].map(
      ([tag]) => tag,
    )
    expect(icons.some((tag) => tag.includes('favicon.ico')), 'aucun .ico déclaré').toBe(true)
    expect(icons.some((tag) => tag.includes('.png')), 'aucun PNG déclaré').toBe(true)
    expect(
      icons.some((tag) => tag.includes('apple-touch-icon')),
      'rien pour l écran d accueil iOS',
    ).toBe(true)
  })

  it('précache le .ico avec le reste du shell', () => {
    // Le hors ligne est intégral : une icône qui manque au précache est une
    // requête réseau de plus dans un mode avion qui n'en fait aucune.
    const config = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
    const patterns = config.match(/globPatterns:\s*\[([^\]]*)\]/)?.[1] ?? ''
    expect(patterns).toContain('ico')
  })
})
