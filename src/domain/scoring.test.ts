import { describe, expect, it } from 'vitest'
import { scoreRound } from './scoring.ts'
import { makeBonus } from './types.ts'

const score = (
  bid: number,
  tricks: number,
  cards: number,
  bonus = makeBonus(),
  bonusIfBidMissed = true,
  rascal = 0,
) => scoreRound({ bid, tricks, cards, bonus, rascal, options: { bonusIfBidMissed } })

describe('les huit cas du cahier des charges', () => {
  it('mise 3, plis 3, 3 cartes, sans bonus : +60', () => {
    expect(score(3, 3, 3).total).toBe(60)
  })

  it('mise 2, plis 4, 6 cartes, sans bonus : -20', () => {
    expect(score(2, 4, 6).total).toBe(-20)
  })

  it('mise 0, plis 0, 7 cartes : +70', () => {
    expect(score(0, 0, 7).total).toBe(70)
  })

  it('mise 0, plis 2, 9 cartes : -90', () => {
    expect(score(0, 2, 9).total).toBe(-90)
  })

  it('mise 1, plis 1, 5 cartes, un 14 de couleur et le Skull King pris par une sirène : +70', () => {
    const result = score(1, 1, 5, makeBonus({ colorFourteens: 1, skullKingTakenByMermaid: 1 }))
    expect(result.bidPoints).toBe(20)
    expect(result.bonusPoints).toBe(50)
    expect(result.total).toBe(70)
  })

  it('mise 1, plis 0, 5 cartes, un 14 noir, bonus annulés : -10', () => {
    expect(score(1, 0, 5, makeBonus({ blackFourteen: 1 }), false).total).toBe(-10)
  })

  it('mise 1, plis 0, 5 cartes, un 14 noir, bonus comptés : +10', () => {
    expect(score(1, 0, 5, makeBonus({ blackFourteen: 1 }), true).total).toBe(10)
  })

  it('mise 0, plis 0, 10 cartes, trois pirates pris par le Skull King : +190', () => {
    const result = score(0, 0, 10, makeBonus({ piratesTakenBySkullKing: 3 }))
    expect(result.bidPoints).toBe(100)
    expect(result.bonusPoints).toBe(90)
    expect(result.total).toBe(190)
  })
})

describe('issue de la mise', () => {
  it('marque exact quand la mise est tenue', () => {
    expect(score(2, 2, 5).outcome).toBe('exact')
  })

  it('marque over quand le joueur a annoncé plus que ce qu il a fait', () => {
    expect(score(4, 1, 5).outcome).toBe('over')
  })

  it('marque under quand le joueur a fait plus que ce qu il a annoncé', () => {
    expect(score(1, 4, 5).outcome).toBe('under')
  })

  it('pénalise à l écart, pas au nombre de plis pris', () => {
    expect(score(4, 1, 5).bidPoints).toBe(-30)
    expect(score(1, 4, 5).bidPoints).toBe(-30)
  })

  it('ne rapporte rien pour les plis pris quand la mise est ratée', () => {
    expect(score(1, 3, 6).bidPoints).toBeLessThan(0)
  })
})

describe('mise à zéro', () => {
  it('récompense proportionnellement au nombre de cartes', () => {
    expect(score(0, 0, 1).total).toBe(10)
    expect(score(0, 0, 10).total).toBe(100)
  })

  it('punit du même montant quel que soit le nombre de plis pris', () => {
    expect(score(0, 1, 8).total).toBe(-80)
    expect(score(0, 5, 8).total).toBe(-80)
  })
})

describe('option bonusIfBidMissed', () => {
  const bonus = makeBonus({ colorFourteens: 2, blackFourteen: 1 })

  it('conserve les bonus d une mise tenue dans les deux réglages', () => {
    expect(score(1, 1, 4, bonus, false).bonusPoints).toBe(40)
    expect(score(1, 1, 4, bonus, true).bonusPoints).toBe(40)
  })

  it('annule les bonus d une mise ratée quand le réglage l exige', () => {
    expect(score(1, 2, 4, bonus, false).bonusPoints).toBe(0)
  })

  it('laisse les points de mise intacts dans les deux cas', () => {
    expect(score(1, 2, 4, bonus, false).bidPoints).toBe(-10)
    expect(score(1, 2, 4, bonus, true).bidPoints).toBe(-10)
  })
})

describe('barème des bonus', () => {
  it('applique dix, vingt, vingt, trente et quarante points', () => {
    expect(score(1, 1, 5, makeBonus({ colorFourteens: 1 })).bonusPoints).toBe(10)
    expect(score(1, 1, 5, makeBonus({ blackFourteen: 1 })).bonusPoints).toBe(20)
    expect(score(1, 1, 5, makeBonus({ mermaidsTakenByPirate: 1 })).bonusPoints).toBe(20)
    expect(score(1, 1, 5, makeBonus({ piratesTakenBySkullKing: 1 })).bonusPoints).toBe(30)
    expect(score(1, 1, 5, makeBonus({ skullKingTakenByMermaid: 1 })).bonusPoints).toBe(40)
  })

  it('cumule la manche maximale théorique', () => {
    const full = makeBonus({
      colorFourteens: 3,
      blackFourteen: 1,
      mermaidsTakenByPirate: 2,
      piratesTakenBySkullKing: 6,
      skullKingTakenByMermaid: 0,
    })
    expect(score(10, 10, 10, full).bonusPoints).toBe(30 + 20 + 40 + 180)
  })
})

describe('pari de Rascal Jack', () => {
  it('ajoute le pari tenu au total', () => {
    expect(score(1, 1, 5, makeBonus(), true, 20).rascalPoints).toBe(20)
    expect(score(1, 1, 5, makeBonus(), true, 20).total).toBe(40)
  })

  it('retire le pari perdu du total', () => {
    expect(score(1, 1, 5, makeBonus(), true, -10).total).toBe(10)
  })

  it('se compte même quand la mise est ratée et les primes annulées', () => {
    // C'est toute la raison pour laquelle le pari ne vit pas dans les primes.
    const missed = score(1, 0, 5, makeBonus({ blackFourteen: 1 }), false, 20)
    expect(missed.bonusPoints).toBe(0)
    expect(missed.rascalPoints).toBe(20)
    expect(missed.total).toBe(-10 + 20)
  })

  it('ne se mêle pas aux points de primes', () => {
    const both = score(1, 1, 5, makeBonus({ blackFourteen: 1 }), true, -20)
    expect(both.bonusPoints).toBe(20)
    expect(both.rascalPoints).toBe(-20)
  })

  it('vaut zéro quand il n y en a pas', () => {
    expect(score(1, 1, 5).rascalPoints).toBe(0)
  })
})
