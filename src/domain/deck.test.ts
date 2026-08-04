import { describe, expect, it } from 'vitest'
import { DECK_SIZE, cardsForRound, deckSize, isCapped, roundsPlan } from './deck.ts'

describe('cartes de la manche', () => {
  it('distribue le numéro de la manche tant que le paquet suit', () => {
    for (let round = 1; round <= 10; round += 1) {
      expect(cardsForRound(round, 4)).toBe(round)
    }
  })

  it('plafonne à huit cartes en manches 9 et 10 à huit joueurs', () => {
    expect(cardsForRound(8, 8)).toBe(8)
    expect(cardsForRound(9, 8)).toBe(8)
    expect(cardsForRound(10, 8)).toBe(8)
  })

  it('ne plafonne aucune tablée de sept joueurs ou moins', () => {
    for (let players = 2; players <= 7; players += 1) {
      expect(cardsForRound(10, players)).toBe(10)
    }
  })

  it('signale le plafonnement seulement quand il mord', () => {
    expect(isCapped(8, 8)).toBe(false)
    expect(isCapped(9, 8)).toBe(true)
    expect(isCapped(10, 7)).toBe(false)
  })
})

describe('plan de partie', () => {
  it('produit dix manches', () => {
    expect(roundsPlan(4)).toHaveLength(10)
  })

  it('décrit la tablée de huit', () => {
    expect(roundsPlan(8).map((round) => round.cards)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 8, 8,
    ])
  })

  it('décrit une tablée de quatre', () => {
    expect(roundsPlan(4).map((round) => round.cards)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
  })
})

describe('paquet des monstres marins', () => {
  it('compte 2 cartes de plus', () => {
    expect(deckSize({ seaMonsters: false })).toBe(DECK_SIZE)
    expect(deckSize({ seaMonsters: true })).toBe(DECK_SIZE + 2)
  })

  it('fait tenir la manche 9 à huit joueurs', () => {
    // 72 cartes pour 8 joueurs : 9 chacun, tout juste.
    expect(cardsForRound(9, 8, deckSize({ seaMonsters: true }))).toBe(9)
    expect(cardsForRound(9, 8)).toBe(8)
  })

  it('ne suffit toujours pas pour la manche 10 à huit joueurs', () => {
    expect(cardsForRound(10, 8, deckSize({ seaMonsters: true }))).toBe(9)
  })
})

describe('la main du fantôme de Barbe Grise', () => {
  it('ne fait pas mordre le plafond à deux joueurs', () => {
    // À 2 joueurs une troisième main est distribuée. Compter le fantôme ou non
    // ne change aucun chiffre — c'est ce qui autorise `cardsForRound` à rester
    // sur le nombre de joueurs, et les 4 appelants à ne pas s'accorder.
    for (let round = 1; round <= 10; round += 1) {
      expect(cardsForRound(round, 2)).toBe(round)
      expect(cardsForRound(round, 3)).toBe(round)
      expect(cardsForRound(round, 2, DECK_SIZE + 2)).toBe(round)
      expect(cardsForRound(round, 3, DECK_SIZE + 2)).toBe(round)
    }
    expect(isCapped(10, 3)).toBe(false)
  })
})
