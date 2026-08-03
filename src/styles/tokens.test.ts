import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const tokens = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

/** Toutes les couleurs littérales déclarées dans les jetons. */
function declaredColours(): { name: string; hex: string }[] {
  const found: { name: string; hex: string }[] = []
  for (const line of tokens.split('\n')) {
    const match = line.match(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/)
    if (match) found.push({ name: match[1], hex: match[2] })
  }
  return found
}

function channels(hex: string): [number, number, number] {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex.slice(0, 7)
  const value = parseInt(full.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** Écart maximal entre canaux : zéro pour un gris pur. */
function chroma(hex: string): number {
  const [r, g, b] = channels(hex)
  return Math.max(r, g, b) - Math.min(r, g, b)
}

describe('la palette est monochrome', () => {
  it('déclare au moins les surfaces et le canevas', () => {
    const names = declaredColours().map((entry) => entry.name)
    for (const required of ['--accent', '--card', '--sunken', '--canvas']) {
      expect(names).toContain(required)
    }
  })

  it('ne contient aucune couleur saturée', () => {
    // Une tolérance de 4 laisse passer un gris très légèrement chaud, pas une
    // teinte : #DCEE6B avait un écart de 131.
    for (const { name, hex } of declaredColours()) {
      expect(chroma(hex), `${name} (${hex}) est coloré`).toBeLessThanOrEqual(4)
    }
  })

  it('ne garde aucun jeton de couleur de joueur', () => {
    expect(tokens).not.toMatch(/--player-\d/)
  })

  it('ne garde aucun jeton sémantique teinté', () => {
    expect(tokens).not.toMatch(/--(gain|loss|brass|sand|tide|foam|ink|paper|smoke)\b/)
  })

  it('déclare huit motifs de tiretés, de quoi séparer huit séries', () => {
    const dashes = [...tokens.matchAll(/--dash-(\d):/g)].map((m) => m[1])
    expect(dashes).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
  })
})

describe('les surfaces gardent leur écart au canevas', () => {
  /**
   * Les deux thèmes sont vérifiés séparément : le thème sombre redéfinit toutes
   * les surfaces, et c'est précisément là qu'une valeur figée produirait du noir
   * sur du noir.
   */
  function block(selector: string): Record<string, string> {
    const start = tokens.indexOf(selector)
    if (start === -1) throw new Error(`${selector} absent`)
    const open = tokens.indexOf('{', start)
    const close = tokens.indexOf('\n}', open)
    const values: Record<string, string> = {}
    for (const line of tokens.slice(open, close).split('\n')) {
      const match = line.match(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/)
      if (match) values[match[1]] = match[2]
    }
    return values
  }

  const themes = {
    clair: block(':root {'),
    sombre: block(":root[data-theme='dark'] {"),
  }

  const luminance = (hex: string): number => {
    const lin = (c: number) => {
      const v = c / 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    const [r, g, b] = channels(hex)
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  }

  const ratio = (a: string, b: string) => {
    const x = luminance(a)
    const y = luminance(b)
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
  }

  const PAIRS: [string, string, string][] = [
    ['texte sur accent', '--accent-on', '--accent'],
    ['sourdine sur accent', '--accent-muted', '--accent'],
    ['texte sur carte', '--card-on', '--card'],
    ['sourdine sur carte', '--card-muted', '--card'],
    ['texte sur creux', '--sunken-on', '--sunken'],
    ['sourdine sur creux', '--sunken-muted', '--sunken'],
    ['texte sur canevas', '--canvas-on', '--canvas'],
    ['sourdine sur canevas', '--canvas-muted', '--canvas'],
  ]

  for (const [name, palette] of Object.entries(themes)) {
    describe(`thème ${name}`, () => {
      it('redéfinit toutes les surfaces', () => {
        for (const token of ['--accent', '--card', '--sunken', '--canvas']) {
          expect(palette[token], `${token} manquant`).toBeTruthy()
        }
      })

      it('garde chaque texte au-dessus de AA', () => {
        for (const [label, on, surface] of PAIRS) {
          expect(ratio(palette[on], palette[surface]), label).toBeGreaterThanOrEqual(4.5)
        }
      })

      it('sépare l accent du canevas', () => {
        expect(ratio(palette['--accent'], palette['--canvas'])).toBeGreaterThan(10)
      })

      it('sépare le creux du canevas sans filet', () => {
        expect(ratio(palette['--sunken'], palette['--canvas'])).toBeGreaterThan(1.4)
      })
    })
  }
})
