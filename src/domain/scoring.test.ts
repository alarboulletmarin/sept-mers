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

// ------------------------------------------------------------ Score Rascal

/** Une manche au barème Rascal. `charge` vraie vaut boulet de canon. */
const rascalScore = (
  bid: number,
  tricks: number,
  cards: number,
  bonus = makeBonus(),
  charge = false,
  cannonballOpen = true,
  wager = 0,
) =>
  scoreRound({
    bid,
    tricks,
    cards,
    bonus,
    rascal: wager,
    cannonball: charge,
    // `bonusIfBidMissed` est allumé exprès : sous le Score Rascal il ne doit
    // rien changer, et un réglage éteint le prouverait moins bien.
    options: { bonusIfBidMissed: true, rascalScoring: true, cannonball: cannonballOpen },
  })

describe('écart à la mise', () => {
  it('vaut zéro quand la mise est tenue', () => {
    expect(score(3, 3, 5).gap).toBe(0)
  })

  it('se compte en valeur absolue, dans les deux sens', () => {
    expect(score(4, 1, 5).gap).toBe(3)
    expect(score(1, 4, 5).gap).toBe(3)
  })
})

describe('Score Rascal', () => {
  it('donne le même potentiel quelle que soit la mise', () => {
    // C'est tout le propos du barème : la mise ne décide plus de ce qu'on peut
    // gagner, seulement de ce qu'on en garde.
    expect(rascalScore(3, 3, 5).total).toBe(50)
    expect(rascalScore(0, 0, 5).total).toBe(50)
    expect(rascalScore(5, 5, 5).total).toBe(50)
  })

  it('rend dix points par carte distribuée', () => {
    expect(rascalScore(1, 1, 1).total).toBe(10)
    expect(rascalScore(4, 4, 10).total).toBe(100)
  })

  it('rend la moitié à un pli d écart, dans les deux sens', () => {
    expect(rascalScore(2, 3, 6).total).toBe(30)
    expect(rascalScore(3, 2, 6).total).toBe(30)
  })

  it('ne rend rien à deux plis d écart ou plus', () => {
    expect(rascalScore(1, 3, 6).total).toBe(0)
    expect(rascalScore(6, 0, 6).total).toBe(0)
  })

  it('adoucit une mise à zéro ratée là où le classique la punit', () => {
    expect(score(0, 1, 9).total).toBe(-90)
    expect(rascalScore(0, 1, 9).total).toBe(45)
  })

  it('fait suivre les primes sur la même échelle', () => {
    const bonus = makeBonus({ blackFourteen: 1, colorFourteens: 2 })
    expect(rascalScore(2, 2, 4, bonus).bonusPoints).toBe(40)
    expect(rascalScore(2, 3, 4, bonus).bonusPoints).toBe(20)
    expect(rascalScore(2, 4, 4, bonus).bonusPoints).toBe(0)
  })

  it('ignore le réglage des primes d une mise ratée', () => {
    // L'échelle tout/moitié/rien remplace le tout-ou-rien de l'option : c'est
    // pourquoi la bascule disparaît du panneau quand le barème est allumé.
    const bonus = makeBonus({ blackFourteen: 1 })
    const kept = scoreRound({
      bid: 2,
      tricks: 4,
      cards: 6,
      bonus,
      options: { bonusIfBidMissed: true, rascalScoring: true },
    })
    const dropped = scoreRound({
      bid: 2,
      tricks: 4,
      cards: 6,
      bonus,
      options: { bonusIfBidMissed: false, rascalScoring: true },
    })
    expect(kept.bonusPoints).toBe(0)
    expect(dropped.bonusPoints).toBe(0)
  })

  it('ne descend jamais sous zéro, sur toute la grille', () => {
    const bonus = makeBonus({ blackFourteen: 1, piratesTakenBySkullKing: 2 })
    for (let cards = 1; cards <= 10; cards += 1) {
      for (let bid = 0; bid <= cards; bid += 1) {
        for (let tricks = 0; tricks <= cards; tricks += 1) {
          const result = rascalScore(bid, tricks, cards, bonus)
          expect(result.bidPoints + result.bonusPoints).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('ne rend jamais de fraction de point', () => {
    const bonus = makeBonus({ colorFourteens: 3, skullKingTakenByMermaid: 1 })
    for (let cards = 1; cards <= 10; cards += 1) {
      for (let gap = 0; gap <= 2; gap += 1) {
        const result = rascalScore(gap, 0, cards, bonus)
        expect(Number.isInteger(result.bidPoints)).toBe(true)
        expect(Number.isInteger(result.bonusPoints)).toBe(true)
      }
    }
  })

  it('garde le pari de Rascal Jack hors du barème', () => {
    // Il n'est ni divisé par deux à un pli d'écart, ni annulé à deux.
    expect(rascalScore(2, 3, 6, makeBonus(), false, true, 10).rascalPoints).toBe(10)
    expect(rascalScore(2, 4, 6, makeBonus(), false, true, -20).rascalPoints).toBe(-20)
  })

  it('laisse le pari perdu faire descendre le total sous zéro', () => {
    // Le « jamais de négatif » porte sur la mise et les primes ; le pari se
    // compte quoi qu'il arrive, et c'est la seule façon de passer sous zéro.
    const round = rascalScore(2, 4, 6, makeBonus(), false, true, -20)
    expect(round.bidPoints).toBe(0)
    expect(round.bonusPoints).toBe(0)
    expect(round.total).toBe(-20)
  })

  it('garde l issue de la mise, qui ne parle pas du barème', () => {
    expect(rascalScore(4, 1, 5).outcome).toBe('over')
    expect(rascalScore(1, 4, 5).outcome).toBe('under')
    expect(rascalScore(3, 3, 5).outcome).toBe('exact')
  })
})

describe('Boulet de canon', () => {
  it('monte le potentiel à quinze points par carte', () => {
    expect(rascalScore(3, 3, 6, makeBonus(), true).total).toBe(90)
  })

  it('ne rend rien au moindre écart, là où la mitraille rendait la moitié', () => {
    expect(rascalScore(3, 4, 6, makeBonus(), false).total).toBe(30)
    expect(rascalScore(3, 4, 6, makeBonus(), true).total).toBe(0)
  })

  it('emporte les primes avec lui', () => {
    const bonus = makeBonus({ blackFourteen: 1 })
    expect(rascalScore(3, 3, 6, bonus, true).bonusPoints).toBe(20)
    expect(rascalScore(3, 4, 6, bonus, true).bonusPoints).toBe(0)
  })

  it('reste sans effet tant que la table ne l a pas ouvert', () => {
    // Une manche enregistrée peut porter la charge ; c'est l'option de la
    // partie qui décide si elle compte.
    expect(rascalScore(3, 3, 6, makeBonus(), true, false).total).toBe(60)
    expect(rascalScore(3, 4, 6, makeBonus(), true, false).total).toBe(30)
  })

  it('vaut mitraille quand rien n est chargé', () => {
    expect(rascalScore(3, 4, 6).total).toBe(30)
  })

  it('ne touche pas au barème classique', () => {
    const classic = scoreRound({
      bid: 3,
      tricks: 3,
      cards: 6,
      bonus: makeBonus(),
      cannonball: true,
      options: { bonusIfBidMissed: true, cannonball: true },
    })
    expect(classic.total).toBe(60)
  })
})
