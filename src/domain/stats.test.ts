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
import { DEFAULT_OPTIONS, makeBonus, type Game, type Player, type RoundBonus } from './types.ts'

type Line = [string, number, number, Partial<RoundBonus>?]

function game(rounds: { cards: number; lines: Line[] }[], bonusIfBidMissed = true): Game {
  const playerIds = rounds[0]?.lines.map(([id]) => id) ?? []
  return {
    id: 'g1',
    startedAt: '2026-01-01T20:00:00.000Z',
    endedAt: '2026-01-01T21:00:00.000Z',
    playerIds,
    options: { ...DEFAULT_OPTIONS, bonusIfBidMissed },
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
