import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { dictionaries, makeI18n, translate } from './index.ts'

describe('dictionnaires', () => {
  it('couvrent les mêmes clés en français et en anglais', () => {
    const frKeys = Object.keys(dictionaries.fr).sort()
    const enKeys = Object.keys(dictionaries.en).sort()
    expect(frKeys).toEqual(enKeys)
  })

  it('ne contiennent aucun emoji', () => {
    // Le cahier des charges les interdit partout, libellés compris.
    const emoji = /\p{Extended_Pictographic}/u
    for (const dict of Object.values(dictionaries)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(emoji.test(value), `${key} contient un emoji`).toBe(false)
      }
    }
  })

  it('ne laissent aucune valeur vide', () => {
    for (const dict of Object.values(dictionaries)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.trim().length, `${key} est vide`).toBeGreaterThan(0)
      }
    }
  })

  it('portent la mention de marque exigée', () => {
    expect(dictionaries.fr['about.trademark']).toContain("Grandpa Beck's Games, Inc.")
    expect(dictionaries.en['about.trademark']).toContain("Grandpa Beck's Games, Inc.")
  })
})

describe('interpolation', () => {
  it('remplace les jetons', () => {
    expect(translate({ a: 'Manche {round} sur {total}' }, 'fr', 'a', { round: 4, total: 10 })).toBe(
      'Manche 4 sur 10',
    )
  })

  it('laisse un jeton sans valeur intact', () => {
    expect(translate({ a: '{x} et {y}' }, 'fr', 'a', { x: 1 })).toBe('1 et {y}')
  })

  it('rend la clé quand elle est absente', () => {
    expect(translate({}, 'fr', 'inconnue')).toBe('inconnue')
  })
})

describe('pluriels', () => {
  const dict = { 'r.tricks': '{count} plis', 'r.tricksOne': '{count} pli' }

  it('choisit le singulier à un', () => {
    expect(translate(dict, 'fr', 'r.tricks', { count: 1 })).toBe('1 pli')
  })

  it('choisit le pluriel au-delà', () => {
    expect(translate(dict, 'fr', 'r.tricks', { count: 3 })).toBe('3 plis')
  })

  it('traite le zéro au singulier en français', () => {
    expect(translate(dict, 'fr', 'r.tricks', { count: 0 })).toBe('0 pli')
  })

  it('traite le zéro au pluriel en anglais', () => {
    const en = { 'r.t': '{count} tricks', 'r.tOne': '{count} trick' }
    expect(translate(en, 'en', 'r.t', { count: 0 })).toBe('0 tricks')
    expect(translate(en, 'en', 'r.t', { count: 1 })).toBe('1 trick')
  })

  it('retombe sur la forme plurielle quand la variante manque', () => {
    expect(translate({ 'r.x': '{count} choses' }, 'fr', 'r.x', { count: 1 })).toBe('1 choses')
  })
})

describe('mise en forme', () => {
  const fr = makeI18n('fr')

  it('signe les scores avec un vrai signe moins', () => {
    expect(fr.signed(60)).toBe('+60')
    expect(fr.signed(-20)).toBe('−20')
    expect(fr.signed(0)).toBe('+0')
  })

  it('formate un pourcentage entier', () => {
    expect(fr.percent(0.666)).toBe('67 %')
    expect(fr.percent(0)).toBe('0 %')
  })

  it('rend la chaîne telle quelle si la date est illisible', () => {
    expect(fr.date('pas-une-date')).toBe('pas-une-date')
  })
})

/*
 * Aucune clé morte.
 *
 * Dix-sept libellés traînaient dans les deux dictionnaires sans qu'une seule
 * ligne de code les demande : des écrans abandonnés, des formulations
 * remplacées. Rien ne les signalait, et chacun coûtait une traduction à
 * maintenir. Le test lit le code plutôt que de se fier à une liste, parce
 * qu'une liste aurait le même défaut que ce qu'elle surveille.
 */
describe('clés employées', () => {
  const sources = (): string => {
    const root = new URL('../', import.meta.url)
    const files: string[] = []
    const walk = (dir: URL) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir)
        if (entry.isDirectory()) walk(path)
        else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
          files.push(readFileSync(path, 'utf8'))
        }
      }
    }
    walk(root)
    return files.join('\n')
  }

  it('ne laisse aucune clé sans emploi', () => {
    const code = sources()
    const used = (key: string): boolean => {
      // La variante de pluriel suit sa clé de base : c'est `translate` qui la
      // choisit, jamais l'appelant.
      const base = key.endsWith('One') && dictionaries.fr[key.slice(0, -3)] ? key.slice(0, -3) : key
      if (code.includes(`'${base}'`) || code.includes(`"${base}"`)) return true
      // Les clés composées à la volée : `t(\`issue.${code}\`)`, `t(\`newGame.${key}\`)`.
      const parts = base.split('.')
      for (let cut = 1; cut < parts.length; cut += 1) {
        if (code.includes(`\`${parts.slice(0, cut).join('.')}.`)) return true
      }
      return false
    }

    const orphans = Object.keys(dictionaries.fr).filter((key) => !used(key))
    expect(orphans, `clés jamais employées : ${orphans.join(', ')}`).toEqual([])
  })
})
