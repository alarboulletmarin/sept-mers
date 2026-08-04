import { describe, expect, it } from 'vitest'
import {
  DECK_SIZE,
  cardsForRound,
  deckSize,
  isCapped,
  lastRoundCards,
  roundsPlan,
} from './deck.ts'
import { voidedBy, voidsTricks } from './types.ts'

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
  const both = { kraken: true, whiteWhale: true }

  it('compte une carte par monstre glissé au paquet', () => {
    expect(deckSize({ kraken: false, whiteWhale: false })).toBe(DECK_SIZE)
    expect(deckSize({ kraken: true, whiteWhale: false })).toBe(DECK_SIZE + 1)
    expect(deckSize({ kraken: false, whiteWhale: true })).toBe(DECK_SIZE + 1)
    expect(deckSize(both)).toBe(DECK_SIZE + 2)
  })

  it('fait tenir la manche 9 à huit joueurs, mais avec les deux', () => {
    // 72 cartes pour 8 joueurs : 9 chacun, tout juste. À 71, le compte n'y est
    // plus — c'est ce qui rend la coupe des deux monstres visible à table.
    expect(cardsForRound(9, 8, deckSize(both))).toBe(9)
    expect(cardsForRound(9, 8, deckSize({ kraken: true, whiteWhale: false }))).toBe(8)
    expect(cardsForRound(9, 8)).toBe(8)
  })

  it('ne suffit toujours pas pour la manche 10 à huit joueurs', () => {
    expect(cardsForRound(10, 8, deckSize(both))).toBe(9)
  })
})

describe('format de partie', () => {
  it('démarre la donne où le format le dit', () => {
    expect(cardsForRound(1, 4, DECK_SIZE, 5)).toBe(5)
    expect(cardsForRound(3, 4, DECK_SIZE, 5)).toBe(7)
  })

  it('plafonne une première donne trop grosse pour la table', () => {
    // 8 joueurs, 70 cartes : 8 mains de 8, pas plus, dès la première manche.
    expect(cardsForRound(1, 8, DECK_SIZE, 10)).toBe(8)
    expect(isCapped(1, 8, DECK_SIZE, 10)).toBe(true)
    expect(isCapped(1, 4, DECK_SIZE, 10)).toBe(false)
  })

  it('produit autant de manches que le format en demande', () => {
    const plan = roundsPlan(4, DECK_SIZE, { rounds: 6, firstRoundCards: 3 })
    expect(plan).toHaveLength(6)
    expect(plan.map((round) => round.cards)).toEqual([3, 4, 5, 6, 7, 8])
  })

  it('annonce les cartes de la dernière manche', () => {
    expect(lastRoundCards(4, DECK_SIZE, { rounds: 6, firstRoundCards: 3 })).toBe(8)
    // La même partie à huit joueurs : le paquet mord avant la fin.
    expect(lastRoundCards(8, DECK_SIZE, { rounds: 6, firstRoundCards: 3 })).toBe(8)
    expect(lastRoundCards(8, DECK_SIZE, { rounds: 10, firstRoundCards: 1 })).toBe(8)
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

describe('qui écarte un pli', () => {
  it('nomme le monstre qui est au paquet, et lui seul', () => {
    expect(voidedBy({ kraken: true, whiteWhale: true })).toBe('both')
    expect(voidedBy({ kraken: true, whiteWhale: false })).toBe('kraken')
    expect(voidedBy({ kraken: false, whiteWhale: true })).toBe('whiteWhale')
    expect(voidedBy({ kraken: false, whiteWhale: false })).toBe('none')
  })

  it('ouvre le compteur dès qu il y en a un', () => {
    // La Baleine écarte rarement — un pli sans aucun numéro —, mais elle
    // écarte : lui fermer le compteur laisserait la manche sans issue ce
    // jour-là.
    expect(voidsTricks({ kraken: false, whiteWhale: true })).toBe(true)
    expect(voidsTricks({ kraken: true, whiteWhale: false })).toBe(true)
    expect(voidsTricks({ kraken: false, whiteWhale: false })).toBe(false)
  })
})
