import { describe, expect, it } from 'vitest'
import {
  bonusCeiling,
  remainingTricks,
  soleUntouchedPlayer,
  sumBids,
  validateBids,
  validateBonuses,
  validateRascal,
  validateTricks,
  validateVoided,
} from './validation.ts'
import { makeBonus, type RoundBonus } from './types.ts'

const players = ['a', 'b', 'c']
const noBonus = () => Object.fromEntries(players.map((id) => [id, makeBonus()]))
const codes = (issues: { code: string }[]) => issues.map((issue) => issue.code)

describe('mises', () => {
  it('accepte des mises complètes et dans les bornes', () => {
    expect(validateBids({ a: 0, b: 2, c: 5 }, 5, players)).toEqual([])
  })

  it('signale une mise manquante sur le joueur concerné', () => {
    const issues = validateBids({ a: 1, b: null, c: 1 }, 5, players)
    expect(issues).toEqual([{ code: 'bid.missing', playerId: 'b' }])
  })

  it('refuse une mise au-dessus du nombre de cartes', () => {
    const issues = validateBids({ a: 6, b: 1, c: 1 }, 5, players)
    expect(issues[0]).toMatchObject({ code: 'bid.range', playerId: 'a', data: { max: 5 } })
  })

  it('refuse une mise négative ou décimale', () => {
    expect(codes(validateBids({ a: -1, b: 1, c: 1 }, 5, players))).toEqual(['bid.range'])
    expect(codes(validateBids({ a: 1.5, b: 1, c: 1 }, 5, players))).toEqual(['bid.range'])
  })

  it('laisse la somme des mises dépasser le nombre de plis', () => {
    expect(validateBids({ a: 5, b: 5, c: 5 }, 5, players)).toEqual([])
    expect(sumBids({ a: 5, b: 5, c: 5 }, players)).toBe(15)
  })

  it('laisse la somme des mises rester sous le nombre de plis', () => {
    expect(validateBids({ a: 0, b: 0, c: 0 }, 5, players)).toEqual([])
  })
})

describe('plis', () => {
  it('accepte une manche dont la somme tombe juste', () => {
    expect(validateTricks({ a: 2, b: 2, c: 1 }, 5, players)).toEqual([])
  })

  it('refuse une somme inférieure au nombre de cartes', () => {
    const issues = validateTricks({ a: 1, b: 1, c: 1 }, 5, players)
    expect(issues[0]).toMatchObject({ code: 'tricks.sum', data: { assigned: 3, diff: 2 } })
  })

  it('refuse une somme supérieure au nombre de cartes', () => {
    const issues = validateTricks({ a: 3, b: 3, c: 1 }, 5, players)
    expect(issues[0]).toMatchObject({ code: 'tricks.sum', data: { assigned: 7, diff: -2 } })
  })

  it('ne réclame pas la somme tant que la saisie est incomplète', () => {
    expect(codes(validateTricks({ a: 2, b: null, c: 1 }, 5, players))).toEqual([
      'tricks.missing',
    ])
  })

  it('compte les plis restant à attribuer', () => {
    expect(remainingTricks({ a: 2, b: null, c: 1 }, 5, players)).toBe(2)
  })

  it('désigne le dernier joueur non repris en main', () => {
    expect(soleUntouchedPlayer(['a', 'c'], players)).toBe('b')
    expect(soleUntouchedPlayer(['a'], players)).toBeNull()
    expect(soleUntouchedPlayer(['a', 'b', 'c'], players)).toBeNull()
  })

  it('ignore un joueur inconnu dans la liste des repris en main', () => {
    expect(soleUntouchedPlayer(['a', 'c', 'fantôme'], players)).toBe('b')
  })
})

describe('bonus', () => {
  const bonuses = (map: Record<string, Partial<RoundBonus>>) =>
    Object.fromEntries(players.map((id) => [id, makeBonus(map[id])]))

  const tricks = { a: 2, b: 2, c: 1 }

  it('accepte une manche sans bonus', () => {
    expect(validateBonuses(noBonus(), tricks, players)).toEqual([])
  })

  it('refuse plus de trois 14 de couleur', () => {
    const map = bonuses({ a: { colorFourteens: 2 }, b: { colorFourteens: 2 } })
    expect(codes(validateBonuses(map, tricks, players))).toContain('bonus.colorFourteens')
  })

  it('refuse deux 14 noirs', () => {
    const map = bonuses({ a: { blackFourteen: 1 }, b: { blackFourteen: 1 } })
    expect(codes(validateBonuses(map, tricks, players))).toContain('bonus.blackFourteen')
  })

  it('refuse que deux joueurs capturent le Skull King', () => {
    const map = bonuses({
      a: { skullKingTakenByMermaid: 1 },
      b: { skullKingTakenByMermaid: 1 },
    })
    expect(codes(validateBonuses(map, tricks, players))).toContain(
      'bonus.skullKingTakenByMermaid',
    )
  })

  it('ne laisse pas les sirènes dépasser leur budget de deux', () => {
    const map = bonuses({
      a: { mermaidsTakenByPirate: 2 },
      b: { skullKingTakenByMermaid: 1 },
    })
    expect(codes(validateBonuses(map, tricks, players))).toContain('bonus.mermaidBudget')
  })

  it('accepte une sirène capturée et le Skull King capturé par l autre', () => {
    const map = bonuses({
      a: { mermaidsTakenByPirate: 1 },
      b: { skullKingTakenByMermaid: 1 },
    })
    expect(validateBonuses(map, tricks, players)).toEqual([])
  })

  it('refuse que le Skull King capture et se fasse capturer dans la même manche', () => {
    const map = bonuses({
      a: { piratesTakenBySkullKing: 1 },
      b: { skullKingTakenByMermaid: 1 },
    })
    expect(codes(validateBonuses(map, tricks, players))).toContain('bonus.skullKingCaptured')
  })

  it('refuse plus de six pirates capturés', () => {
    const map = bonuses({ a: { piratesTakenBySkullKing: 7 } })
    expect(codes(validateBonuses(map, { ...tricks, a: 7 }, players))).toContain(
      'bonus.piratesTakenBySkullKing',
    )
  })

  it('refuse plus de captures que de plis remportés', () => {
    const map = bonuses({ c: { piratesTakenBySkullKing: 2 } })
    const issues = validateBonuses(map, tricks, players)
    expect(issues[0]).toMatchObject({
      code: 'bonus.moreCapturesThanTricks',
      playerId: 'c',
      data: { captures: 2, tricks: 1 },
    })
  })

  it('laisse les 14 à un joueur sans pli, la possession ne demande pas de pli', () => {
    const map = bonuses({ c: { colorFourteens: 1, blackFourteen: 1 } })
    expect(validateBonuses(map, { a: 3, b: 2, c: 0 }, players)).toEqual([])
  })
})

describe('plafond d un compteur de bonus', () => {
  const tricks = { a: 3, b: 2, c: 1 }

  it('descend au fil de ce que les autres ont déclaré', () => {
    const map = { ...noBonus(), b: makeBonus({ colorFourteens: 2 }) }
    expect(bonusCeiling('colorFourteens', 'a', map, tricks, players)).toEqual({
      max: 1,
      reason: null,
    })
  })

  it('ferme la capture du Skull King quand un pirate a déjà été capturé', () => {
    const map = { ...noBonus(), a: makeBonus({ piratesTakenBySkullKing: 1 }) }
    expect(bonusCeiling('skullKingTakenByMermaid', 'b', map, tricks, players)).toEqual({
      max: 0,
      reason: 'bonus.skullKingCaptured',
    })
  })

  it('ferme la capture de pirate quand le Skull King a été capturé', () => {
    const map = { ...noBonus(), a: makeBonus({ skullKingTakenByMermaid: 1 }) }
    expect(bonusCeiling('piratesTakenBySkullKing', 'b', map, tricks, players)).toEqual({
      max: 0,
      reason: 'bonus.skullKingCaptured',
    })
  })

  it('partage le budget des deux sirènes entre les deux rôles', () => {
    const map = { ...noBonus(), a: makeBonus({ skullKingTakenByMermaid: 1 }) }
    expect(bonusCeiling('mermaidsTakenByPirate', 'b', map, tricks, players)).toEqual({
      max: 1,
      reason: 'bonus.mermaidBudget',
    })
  })

  it('borne les captures au nombre de plis du joueur', () => {
    expect(bonusCeiling('piratesTakenBySkullKing', 'c', noBonus(), tricks, players)).toEqual({
      max: 1,
      reason: 'bonus.moreCapturesThanTricks',
    })
  })

  it('décompte les captures déjà posées par le joueur', () => {
    const map = { ...noBonus(), a: makeBonus({ mermaidsTakenByPirate: 2 }) }
    expect(bonusCeiling('piratesTakenBySkullKing', 'a', map, tricks, players)).toEqual({
      max: 1,
      reason: 'bonus.moreCapturesThanTricks',
    })
  })

  it('ne borne pas les 14 au nombre de plis', () => {
    expect(bonusCeiling('colorFourteens', 'c', noBonus(), tricks, players).max).toBe(3)
  })

  it('ne descend jamais sous zéro', () => {
    const map = { ...noBonus(), b: makeBonus({ colorFourteens: 3 }) }
    expect(bonusCeiling('colorFourteens', 'a', map, tricks, players).max).toBe(0)
  })
})

describe('plis écartés par les monstres marins', () => {
  it('accepte une somme amputée des plis écartés', () => {
    expect(validateTricks({ a: 2, b: 1, c: 0 }, 5, players, 2)).toEqual([])
  })

  it('refuse une somme qui ignore les plis écartés', () => {
    const issues = validateTricks({ a: 2, b: 2, c: 1 }, 5, players, 2)
    expect(codes(issues)).toEqual(['tricks.sum'])
  })

  it('rabaisse la borne de chaque joueur', () => {
    expect(codes(validateTricks({ a: 4, b: 0, c: 0 }, 5, players, 2))).toContain('tricks.range')
  })

  it('compte les plis restants sur ce qui reste à distribuer', () => {
    expect(remainingTricks({ a: 1, b: 0, c: 0 }, 5, players, 2)).toBe(2)
  })

  it('accepte une manche entièrement écartée', () => {
    expect(validateVoided(1, 1)).toEqual([])
    expect(validateTricks({ a: 0, b: 0, c: 0 }, 1, players, 1)).toEqual([])
  })

  it('refuse plus de plis écartés que de cartes', () => {
    expect(codes(validateVoided(3, 2))).toEqual(['voided.range'])
    expect(codes(validateVoided(-1, 2))).toEqual(['voided.range'])
  })
})

describe('pari de Rascal Jack', () => {
  it('accepte un seul pari dans la manche', () => {
    expect(validateRascal({ a: 20, b: 0, c: 0 }, players)).toEqual([])
  })

  it('accepte une manche sans pari', () => {
    expect(validateRascal({}, players)).toEqual([])
  })

  it('refuse deux paris : il n y a qu un Rascal Jack', () => {
    expect(codes(validateRascal({ a: 20, b: -10, c: 0 }, players))).toEqual(['rascal.multiple'])
  })

  it('refuse une valeur hors barème', () => {
    expect(validateRascal({ a: 15, b: 0, c: 0 }, players)).toEqual([
      { code: 'rascal.value', playerId: 'a' },
    ])
  })
})
