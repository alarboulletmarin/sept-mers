import { describe, expect, it } from 'vitest'
import { cardsForRound, isCapped, roundsPlan } from './deck.ts'

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
