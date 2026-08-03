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
