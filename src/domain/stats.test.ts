import { describe, expect, it } from 'vitest'
import {
  accuracy,
  bonusTotals,
  cumulativeSeries,
  playerStats,
  ranking,
  standings,
  totals,
  winnerIds,
} from './stats.ts'
import { DEFAULT_FORMAT, DEFAULT_OPTIONS, makeBonus, type Game, type Player, type RoundBonus } from './types.ts'

type Line = [string, number, number, Partial<RoundBonus>?]

function game(rounds: { cards: number; lines: Line[] }[], bonusIfBidMissed = true): Game {
  const playerIds = rounds[0]?.lines.map(([id]) => id) ?? []
  return {
    id: 'g1',
    startedAt: '2026-01-01T20:00:00.000Z',
    endedAt: '2026-01-01T21:00:00.000Z',
    playerIds,
    options: { ...DEFAULT_OPTIONS, bonusIfBidMissed },
    format: { ...DEFAULT_FORMAT },
    nameSnapshot: Object.fromEntries(playerIds.map((id) => [id, id.toUpperCase()])),
    rounds: rounds.map((round, index) => ({
      index: index + 1,
      cards: round.cards,
      entries: round.lines.map(([playerId, bid, tricks, bonus]) => ({
        playerId,
        bid,
        tricks,
        bonus: makeBonus(bonus),
      })),
    })),
  }
}

const simple = game([
  { cards: 1, lines: [['a', 1, 1], ['b', 0, 0]] }, // a +20, b +10
  { cards: 2, lines: [['a', 0, 1], ['b', 2, 1]] }, // a -20, b -10
  { cards: 3, lines: [['a', 2, 2], ['b', 1, 1]] }, // a +40, b +20
])

describe('totaux', () => {
  it('additionne les manches validées', () => {
    expect(totals(simple)).toEqual({ a: 40, b: 20 })
  })

  it('rend zéro pour chaque joueur tant qu aucune manche n est validée', () => {
    expect(totals({ ...simple, rounds: [] })).toEqual({ a: 0, b: 0 })
  })

  it('compte les bonus dans le total', () => {
    const withBonus = game([
      { cards: 2, lines: [['a', 1, 1, { blackFourteen: 1 }], ['b', 1, 1]] },
    ])
    expect(totals(withBonus)).toEqual({ a: 40, b: 20 })
  })

  it('respecte l option de bonus sur mise ratée', () => {
    const lines: Line[] = [['a', 1, 0, { blackFourteen: 1 }], ['b', 1, 2]]
    expect(totals(game([{ cards: 2, lines }], true)).a).toBe(10)
    expect(totals(game([{ cards: 2, lines }], false)).a).toBe(-10)
  })
})

describe('cumul par manche', () => {
  it('trace une série par joueur', () => {
    expect(cumulativeSeries(simple)).toEqual([
      { playerId: 'a', points: [20, 0, 40] },
      { playerId: 'b', points: [10, 0, 20] },
    ])
  })
})

describe('classement', () => {
  it('trie par score décroissant et donne l écart', () => {
    expect(standings(simple)).toEqual([
      { playerId: 'a', total: 40, rank: 1, gapToNext: 20 },
      { playerId: 'b', total: 20, rank: 2, gapToNext: 0 },
    ])
  })

  it('ne donne aucune avance au dernier', () => {
    expect(standings(simple).at(-1)?.gapToNext).toBe(0)
  })

  it('partage le rang en cas d égalité', () => {
    const tie = game([{ cards: 2, lines: [['a', 1, 1], ['b', 1, 1]] }])
    const table = standings(tie)
    expect(table.map((row) => row.rank)).toEqual([1, 1])
    expect(winnerIds(tie)).toHaveLength(2)
  })

  it('désigne un vainqueur unique quand les scores diffèrent', () => {
    expect(winnerIds(simple)).toEqual(['a'])
  })
})

describe('précision des mises', () => {
  it('répartit les manches entre tenues, sur-mises et sous-mises', () => {
    expect(accuracy(simple)).toEqual([
      { playerId: 'a', exact: 2, over: 0, under: 1, zeroBids: 1, zeroBidsKept: 0 },
      { playerId: 'b', exact: 2, over: 1, under: 0, zeroBids: 1, zeroBidsKept: 1 },
    ])
  })
})

describe('bonus', () => {
  it('additionne les compteurs et les points par joueur', () => {
    const withBonus = game([
      {
        cards: 3,
        lines: [
          ['a', 1, 1, { colorFourteens: 2, piratesTakenBySkullKing: 1 }],
          ['b', 2, 2, { blackFourteen: 1 }],
        ],
      },
    ])
    const rows = bonusTotals(withBonus)
    expect(rows[0].counts.colorFourteens).toBe(2)
    expect(rows[0].points).toBe(50)
    expect(rows[1].points).toBe(20)
  })
})

describe('statistiques de joueur', () => {
  const players: Player[] = [
    { id: 'a', name: 'A', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'b', name: 'B', createdAt: '2026-01-01T00:00:00.000Z' },
  ]

  it('agrège les parties terminées', () => {
    const stats = playerStats('a', [simple])
    expect(stats.gamesPlayed).toBe(1)
    expect(stats.wins).toBe(1)
    expect(stats.averagePoints).toBe(40)
    expect(stats.bestGame).toBe(40)
    expect(stats.roundsPlayed).toBe(3)
    expect(stats.bidsKept).toBe(2)
    expect(stats.accuracyRate).toBeCloseTo(2 / 3)
    expect(stats.zeroBids).toBe(1)
    expect(stats.zeroBidsKept).toBe(0)
    expect(stats.zeroAccuracyRate).toBe(0)
  })

  it('ignore les parties en cours', () => {
    const running: Game = { ...simple, endedAt: undefined }
    expect(playerStats('a', [running]).gamesPlayed).toBe(0)
  })

  it('rend une fiche vide pour un joueur sans partie', () => {
    const stats = playerStats('z', [simple])
    expect(stats.gamesPlayed).toBe(0)
    expect(stats.averagePoints).toBe(0)
    expect(stats.bestGame).toBeNull()
  })

  it('classe les joueurs récurrents par victoires', () => {
    const table = ranking(players, [simple])
    expect(table.map((row) => row.playerId)).toEqual(['a', 'b'])
  })

  it('écarte du palmarès les joueurs sans partie terminée', () => {
    expect(ranking([...players, { id: 'z', name: 'Z', createdAt: '' }], [simple])).toHaveLength(
      2,
    )
  })
})

describe('sous le Score Rascal', () => {
  /** La même tablée, comptée au barème Rascal. */
  const rascalGame = (rounds: { cards: number; lines: Line[] }[]): Game => ({
    ...game(rounds),
    options: { ...DEFAULT_OPTIONS, rascalScoring: true },
  })

  const played = [
    { cards: 4, lines: [['a', 2, 2], ['b', 1, 2], ['c', 0, 3]] as Line[] },
    { cards: 6, lines: [['a', 3, 3], ['b', 2, 0], ['c', 1, 3]] as Line[] },
  ]

  it('compte les totaux au barème choisi par la partie', () => {
    // Manche 1 : a tenu (40), b raté d'un (20), c raté de trois (0).
    // Manche 2 : a tenu (60), b raté de deux (0), c raté de deux (0).
    expect(totals(rascalGame(played))).toEqual({ a: 100, b: 20, c: 0 })
  })

  it('ne fait jamais reculer un cumul, faute de points négatifs', () => {
    const series = cumulativeSeries(rascalGame(played))
    for (const line of series) {
      for (let i = 1; i < line.points.length; i += 1) {
        expect(line.points[i]).toBeGreaterThanOrEqual(line.points[i - 1])
      }
    }
  })

  it('laisse la précision des mises inchangée', () => {
    // L'issue parle de la mise face aux plis, pas du barème : les mêmes mises
    // et les mêmes plis donnent les mêmes comptes sous les deux systèmes.
    expect(accuracy(rascalGame(played))).toEqual(accuracy(game(played)))
  })

  it('divise les primes marquées sans toucher à leur compte', () => {
    const withBonus = [
      { cards: 4, lines: [['a', 2, 3, { blackFourteen: 1 }], ['b', 0, 1]] as Line[] },
    ]
    const rows = bonusTotals(rascalGame(withBonus))
    expect(rows[0].counts.blackFourteen).toBe(1)
    expect(rows[0].points).toBe(10)
  })

  it('honore le boulet de canon d une manche enregistrée', () => {
    const base = game([{ cards: 6, lines: [['a', 3, 3], ['b', 0, 3]] }])
    const loaded: Game = {
      ...base,
      options: { ...DEFAULT_OPTIONS, rascalScoring: true, cannonball: true },
      rounds: base.rounds.map((round) => ({
        ...round,
        entries: round.entries.map((entry) =>
          entry.playerId === 'a' ? { ...entry, cannonball: true } : entry,
        ),
      })),
    }
    expect(totals(loaded).a).toBe(90)
  })
})

describe('une tablée à deux joueurs', () => {
  /** Manche à 4 cartes : 1 pli à chacun, 2 raflés par le fantôme. */
  const twoPlayers: Game = {
    id: 'g2',
    startedAt: '2026-01-01T20:00:00.000Z',
    endedAt: '2026-01-01T21:00:00.000Z',
    playerIds: ['a', 'b'],
    options: { ...DEFAULT_OPTIONS },
    format: { ...DEFAULT_FORMAT },
    nameSnapshot: { a: 'A', b: 'B' },
    rounds: [
      {
        index: 1,
        cards: 4,
        greyBeard: 2,
        entries: [
          { playerId: 'a', bid: 1, tricks: 1, bonus: makeBonus() },
          { playerId: 'b', bid: 0, tricks: 1, bonus: makeBonus() },
        ],
      },
    ],
  }

  it('ne fait jamais apparaître le fantôme dans les résultats', () => {
    expect(Object.keys(totals(twoPlayers))).toEqual(['a', 'b'])
    expect(standings(twoPlayers).map((row) => row.playerId)).toEqual(['a', 'b'])
    expect(accuracy(twoPlayers).map((row) => row.playerId)).toEqual(['a', 'b'])
  })

  it('compte les joueurs sur leurs propres plis, pas sur la manche', () => {
    // a tient sa mise d'un pli, b en annonçait zéro et en a fait un.
    expect(totals(twoPlayers)).toEqual({ a: 20, b: -40 })
    expect(winnerIds(twoPlayers)).toEqual(['a'])
  })
})

describe('quand Harry le Géant a déplacé une mise', () => {
  /** Manche à 3 cartes : a annonce 1 puis descend à 0, et ne prend rien. */
  const moved: Game = {
    id: 'g3',
    startedAt: '2026-01-01T20:00:00.000Z',
    endedAt: '2026-01-01T21:00:00.000Z',
    playerIds: ['a', 'b'],
    options: { ...DEFAULT_OPTIONS },
    format: { ...DEFAULT_FORMAT },
    nameSnapshot: { a: 'A', b: 'B' },
    rounds: [
      {
        index: 1,
        cards: 3,
        entries: [
          { playerId: 'a', bid: 1, tricks: 0, bonus: makeBonus(), harry: -1 },
          { playerId: 'b', bid: 3, tricks: 3, bonus: makeBonus() },
        ],
      },
    ],
  }

  it('marque sur la mise défendue', () => {
    // Mise 1 devenue 0, aucun pli : la prime de mise à zéro, 10 par carte.
    expect(totals(moved)).toEqual({ a: 30, b: 60 })
  })

  it('compte la manche comme une mise à zéro tenue', () => {
    const row = accuracy(moved).find((candidate) => candidate.playerId === 'a')
    expect(row).toMatchObject({ exact: 1, zeroBids: 1, zeroBidsKept: 1 })
  })
})
