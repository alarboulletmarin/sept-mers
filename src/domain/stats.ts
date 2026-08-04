import { scoreRound, type ScoreResult } from './scoring.ts'
import {
  BONUS_KEYS,
  type Game,
  type Id,
  type Player,
  type Round,
  type RoundBonus,
  type RoundEntry,
} from './types.ts'

export function entryScore(entry: RoundEntry, round: Round, game: Game): ScoreResult {
  return scoreRound({
    bid: entry.bid,
    tricks: entry.tricks,
    cards: round.cards,
    bonus: entry.bonus,
    rascal: entry.rascal,
    cannonball: entry.cannonball,
    options: game.options,
  })
}

/** Score de la manche pour chaque joueur, indexé par identifiant. */
export function roundScores(round: Round, game: Game): Record<Id, ScoreResult> {
  const scores: Record<Id, ScoreResult> = {}
  for (const entry of round.entries) {
    scores[entry.playerId] = entryScore(entry, round, game)
  }
  return scores
}

/** Totaux courants après toutes les manches validées. */
export function totals(game: Game): Record<Id, number> {
  const result: Record<Id, number> = {}
  for (const id of game.playerIds) result[id] = 0
  for (const round of game.rounds) {
    const scores = roundScores(round, game)
    for (const id of game.playerIds) {
      result[id] += scores[id]?.total ?? 0
    }
  }
  return result
}

/**
 * Cumul manche par manche, pour le graphique d'évolution.
 * `points[i]` correspond à la manche `rounds[i].index`.
 */
export interface Series {
  playerId: Id
  points: number[]
}

export function cumulativeSeries(game: Game): Series[] {
  return game.playerIds.map((playerId) => {
    let running = 0
    const points = game.rounds.map((round) => {
      running += roundScores(round, game)[playerId]?.total ?? 0
      return running
    })
    return { playerId, points }
  })
}

export interface Standing {
  playerId: Id
  total: number
  rank: number
  /**
   * Avance sur le joueur classé juste derrière. 0 pour le dernier et en cas
   * d'égalité — c'est bien une avance, pas un retard.
   */
  gapToNext: number
}

/** Classement décroissant, rangs partagés en cas d'égalité. */
export function standings(game: Game): Standing[] {
  const scores = totals(game)
  const sorted = [...game.playerIds].sort((a, b) => scores[b] - scores[a])

  const result: Standing[] = []
  let rank = 0
  let previous: number | null = null

  sorted.forEach((playerId, position) => {
    const total = scores[playerId]
    if (previous === null || total !== previous) rank = position + 1
    const next = sorted[position + 1]
    result.push({
      playerId,
      total,
      rank,
      gapToNext: next === undefined ? 0 : total - scores[next],
    })
    previous = total
  })

  return result
}

export function winnerIds(game: Game): Id[] {
  const table = standings(game)
  if (table.length === 0) return []
  const best = table[0].total
  return table.filter((row) => row.total === best).map((row) => row.playerId)
}

// ------------------------------------------------------------ Précision des mises

export interface Accuracy {
  playerId: Id
  exact: number
  /** A annoncé plus de plis qu'il n'en a fait. */
  over: number
  under: number
  zeroBids: number
  zeroBidsKept: number
}

export function accuracy(game: Game): Accuracy[] {
  return game.playerIds.map((playerId) => {
    const row: Accuracy = {
      playerId,
      exact: 0,
      over: 0,
      under: 0,
      zeroBids: 0,
      zeroBidsKept: 0,
    }
    for (const round of game.rounds) {
      const entry = round.entries.find((candidate) => candidate.playerId === playerId)
      if (!entry) continue
      const { outcome } = entryScore(entry, round, game)
      row[outcome] += 1
      if (entry.bid === 0) {
        row.zeroBids += 1
        if (outcome === 'exact') row.zeroBidsKept += 1
      }
    }
    return row
  })
}

// -------------------------------------------------------------------- Bonus

export type BonusTotals = Record<keyof RoundBonus, number>

export interface BonusRow {
  playerId: Id
  counts: BonusTotals
  points: number
}

export function bonusTotals(game: Game): BonusRow[] {
  return game.playerIds.map((playerId) => {
    const counts = Object.fromEntries(BONUS_KEYS.map((key) => [key, 0])) as BonusTotals
    let points = 0
    for (const round of game.rounds) {
      const entry = round.entries.find((candidate) => candidate.playerId === playerId)
      if (!entry) continue
      for (const key of BONUS_KEYS) counts[key] += entry.bonus[key]
      points += entryScore(entry, round, game).bonusPoints
    }
    return { playerId, counts, points }
  })
}

// ---------------------------------------------------------------- Palmarès

export interface PlayerStats {
  playerId: Id
  gamesPlayed: number
  wins: number
  averagePoints: number
  bestGame: number | null
  roundsPlayed: number
  bidsKept: number
  /** Part de mises tenues, 0..1. */
  accuracyRate: number
  zeroBids: number
  zeroBidsKept: number
  /** Part de mises à zéro tenues, 0..1. */
  zeroAccuracyRate: number
  bonusPoints: number
}

const EMPTY_STATS = (playerId: Id): PlayerStats => ({
  playerId,
  gamesPlayed: 0,
  wins: 0,
  averagePoints: 0,
  bestGame: null,
  roundsPlayed: 0,
  bidsKept: 0,
  accuracyRate: 0,
  zeroBids: 0,
  zeroBidsKept: 0,
  zeroAccuracyRate: 0,
  bonusPoints: 0,
})

/** Statistiques d'un joueur sur les parties terminées. */
export function playerStats(playerId: Id, games: Game[]): PlayerStats {
  const stats = EMPTY_STATS(playerId)
  const finished = games.filter((game) => game.endedAt && game.playerIds.includes(playerId))
  if (finished.length === 0) return stats

  let pointsSum = 0

  for (const game of finished) {
    stats.gamesPlayed += 1
    const total = totals(game)[playerId] ?? 0
    pointsSum += total
    stats.bestGame = stats.bestGame === null ? total : Math.max(stats.bestGame, total)
    if (winnerIds(game).includes(playerId)) stats.wins += 1

    const row = accuracy(game).find((candidate) => candidate.playerId === playerId)
    if (row) {
      stats.roundsPlayed += row.exact + row.over + row.under
      stats.bidsKept += row.exact
      stats.zeroBids += row.zeroBids
      stats.zeroBidsKept += row.zeroBidsKept
    }

    const bonusRow = bonusTotals(game).find((candidate) => candidate.playerId === playerId)
    if (bonusRow) stats.bonusPoints += bonusRow.points
  }

  stats.averagePoints = pointsSum / stats.gamesPlayed
  stats.accuracyRate = stats.roundsPlayed > 0 ? stats.bidsKept / stats.roundsPlayed : 0
  stats.zeroAccuracyRate = stats.zeroBids > 0 ? stats.zeroBidsKept / stats.zeroBids : 0
  return stats
}

/** Palmarès des joueurs récurrents, trié par victoires puis points moyens. */
export function ranking(players: Player[], games: Game[]): PlayerStats[] {
  return players
    .map((player) => playerStats(player.id, games))
    .filter((stats) => stats.gamesPlayed > 0)
    .sort((a, b) => b.wins - a.wins || b.averagePoints - a.averagePoints)
}
