import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FORMAT,
  DEFAULT_OPTIONS,
  dealerFor,
  isComplete,
  isCutShort,
  type Game,
} from './types.ts'

const game = (rounds: number, played: number, endedAt?: string): Game => ({
  id: 'g',
  startedAt: '2026-01-01T20:00:00.000Z',
  ...(endedAt ? { endedAt } : {}),
  playerIds: ['a', 'b', 'c'],
  options: { ...DEFAULT_OPTIONS },
  format: { ...DEFAULT_FORMAT, rounds },
  rounds: Array.from({ length: played }, (_, index) => ({
    index: index + 1,
    cards: index + 1,
    entries: [],
  })),
  nameSnapshot: { a: 'A', b: 'B', c: 'C' },
})

describe('donneur', () => {
  it('part du premier assis et tourne d une manche à l autre', () => {
    const seats = ['a', 'b', 'c']
    expect(dealerFor(1, seats)).toBe('a')
    expect(dealerFor(2, seats)).toBe('b')
    expect(dealerFor(3, seats)).toBe('c')
  })

  it('boucle une fois le tour de table fait', () => {
    const seats = ['a', 'b', 'c']
    expect(dealerFor(4, seats)).toBe('a')
    expect(dealerFor(10, seats)).toBe('a')
  })

  it('suit l ordre à table et non l ordre alphabétique', () => {
    expect(dealerFor(2, ['c', 'a', 'b'])).toBe('a')
  })

  it('ne désigne personne sans table ni sans manche', () => {
    expect(dealerFor(1, [])).toBeNull()
    expect(dealerFor(0, ['a', 'b'])).toBeNull()
  })
})

describe('partie allée au bout', () => {
  it('demande une fin et toutes les manches du format', () => {
    expect(isComplete(game(10, 10, '2026-01-01T21:00:00.000Z'))).toBe(true)
  })

  it('écarte une partie en cours, même complète', () => {
    expect(isComplete(game(10, 10))).toBe(false)
  })

  it('écarte une partie close avant la fin de son format', () => {
    // C'est le cas d'une partie quittée pour en lancer une autre : elle est
    // close sur-le-champ, à la manche où elle en était.
    expect(isComplete(game(10, 2, '2026-01-01T20:10:00.000Z'))).toBe(false)
  })

  it('lit le format de la partie et non une constante', () => {
    // Six manches jouées sur six : c'est une partie entière, à son format.
    expect(isComplete(game(6, 6, '2026-01-01T21:00:00.000Z'))).toBe(true)
  })
})

describe('partie écourtée', () => {
  it('ne regarde que les manches, pas la date de fin', () => {
    // La dixième manche vient d'être validée, personne n'a encore touché
    // « Terminer » : l'écran de fin doit la traiter comme une partie entière.
    expect(isCutShort(game(10, 10))).toBe(false)
    expect(isCutShort(game(10, 4))).toBe(true)
  })
})
