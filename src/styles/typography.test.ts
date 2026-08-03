import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const here = (path: string) => new URL(path, import.meta.url)

const tokens = readFileSync(here('./tokens.css'), 'utf8')
const fonts = readFileSync(here('./fonts.css'), 'utf8')

/** Toutes les feuilles de style de `src/`, sauf celle qui déclare les fontes. */
function styleSheets(): { path: string; source: string }[] {
  const root = new URL('../', import.meta.url)
  const found: { path: string; source: string }[] = []

  const walk = (directory: URL, prefix: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'fonts') continue
      const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory)
      if (entry.isDirectory()) walk(child, `${prefix}${entry.name}/`)
      else if (entry.name.endsWith('.css') && entry.name !== 'fonts.css') {
        found.push({ path: `${prefix}${entry.name}`, source: readFileSync(child, 'utf8') })
      }
    }
  }

  walk(root, '')
  return found
}

describe('les deux voix sont déclarées', () => {
  it('nomme un romain et un grotesque', () => {
    expect(tokens).toMatch(/--font-sans:\s*'Instrument Sans'/)
    expect(tokens).toMatch(/--font-serif:\s*'Instrument Serif'/)
  })

  it('garde une pile de secours derrière chacun', () => {
    // La fonte embarquée met quelques millisecondes à arriver, et un navigateur
    // sans woff2 ne la recevra jamais : la pile système doit rester complète.
    const sans = tokens.match(/--font-sans:([^;]+);/s)?.[1] ?? ''
    const serif = tokens.match(/--font-serif:([^;]+);/s)?.[1] ?? ''
    expect(sans).toMatch(/sans-serif\s*$/)
    expect(serif).toMatch(/serif\s*$/)
  })

  it('publie toute l échelle typographique en jetons', () => {
    for (const token of [
      '--size-display',
      '--size-title',
      '--size-lede',
      '--size-hero',
      '--size-figure',
      '--size-figure-sm',
      '--size-subtitle',
      '--size-body',
      '--size-label',
      '--size-caption',
      '--size-tag',
      '--track-hero',
      '--track-figure',
      '--track-display',
      '--track-tag',
      '--stretch-tight',
    ]) {
      expect(tokens, `${token} manquant`).toContain(`${token}:`)
    }
  })

  it('resserre l approche à mesure que le corps grandit', () => {
    const value = (token: string) =>
      Number.parseFloat(tokens.match(new RegExp(`${token}:\\s*(-?[\\d.]+)em`))?.[1] ?? 'NaN')
    expect(value('--track-hero')).toBeLessThan(value('--track-figure'))
    expect(value('--track-figure')).toBeLessThan(value('--track-display'))
    expect(value('--track-display')).toBeLessThan(0)
  })
})

describe('les fichiers de fonte', () => {
  const faces = [...fonts.matchAll(/url\('\.\/fonts\/([^']+)'\)/g)].map((match) => match[1])

  it('sont référencés relativement, donc hachés par le bundler', () => {
    // Posés dans `public/`, ils seraient servis sans hash et le service worker
    // ne saurait pas les précacher avec le reste du bundle.
    expect(faces.length).toBeGreaterThanOrEqual(6)
    expect(fonts).not.toMatch(/url\('?\//)
  })

  it('existent tous sur le disque', () => {
    for (const file of faces) {
      expect(existsSync(here(`./fonts/${file}`)), `${file} absent`).toBe(true)
    }
  })

  it('découpent le latin étendu, qui ne descend que s il sert', () => {
    expect(faces.filter((file) => file.includes('latin-ext')).length).toBeGreaterThanOrEqual(3)
    expect([...fonts.matchAll(/unicode-range:/g)].length).toBe(faces.length)
  })

  it('affichent le texte sans attendre la fonte', () => {
    expect([...fonts.matchAll(/font-display:\s*swap/g)].length).toBe(faces.length)
  })
})

describe('aucune fonte ne rentre par la fenêtre', () => {
  it('ne déclare jamais de famille en dur hors des jetons', () => {
    // Une famille écrite en dur dans un composant échappe au thème et au
    // système : c'est par là que la typographie se délite.
    for (const { path, source } of styleSheets()) {
      for (const [, value] of source.matchAll(/font-family:\s*([^;]+);/g)) {
        expect(value.trim(), `${path} déclare une famille en dur`).toMatch(/^var\(--font-(sans|serif)\)$/)
      }
    }
  })

  it('ne charge aucune fonte depuis un serveur tiers', () => {
    // L'app ne fait aucune requête réseau après le premier chargement, et le
    // mode avion doit rester un mode de fonctionnement normal.
    for (const { path, source } of [...styleSheets(), { path: 'fonts.css', source: fonts }]) {
      expect(source, `${path} pointe vers l extérieur`).not.toMatch(/https?:\/\//)
    }
  })
})
