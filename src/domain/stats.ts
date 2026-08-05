import { finalBid, scoreRound, type ScoreResult } from './scoring.ts'
import {
  BONUS_KEYS,
  isComplete,
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
    harry: entry.harry,
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
      // La mise à zéro qui compte est celle qu'on a défendue : Harry le Géant
      // a pu en faire une mise à 1, ou en créer une à partir d'une mise à 1.
      if (finalBid(entry.bid, entry.harry) === 0) {
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

/**
 * Les parties d'un joueur qui comptent au palmarès : celles qui sont allées au
 * bout de leur format.
 *
 * Une partie écourtée reste dans l'historique et garde son classement — c'est
 * ce que la table a joué —, mais elle ne pèse ni dans les moyennes ni dans les
 * victoires : une partie quittée après une manche donnerait sinon une victoire
 * pleine à qui menait au premier coup de chance.
 */
export function countedGames(playerId: Id, games: Game[]): Game[] {
  return games.filter((game) => isComplete(game) && game.playerIds.includes(playerId))
}

/** Statistiques d'un joueur sur les parties allées au bout. */
export function playerStats(playerId: Id, games: Game[]): PlayerStats {
  const stats = EMPTY_STATS(playerId)
  const finished = countedGames(playerId, games)
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

// ------------------------------------------------------ Le détail d'un joueur

/**
 * La plus longue série de mises tenues d'affilée, et celle qui court encore.
 *
 * Une série ne traverse pas les parties : deux mises tenues à la fin d'une
 * soirée et deux au début de la suivante ne font pas quatre. Les manches sont
 * relues dans l'ordre de leur numéro, jamais dans celui du fichier.
 */
export interface Streak {
  best: number
  /** Série en cours à la fin de la dernière partie comptée. */
  current: number
}

export function keptStreak(playerId: Id, games: Game[]): Streak {
  const counted = countedGames(playerId, games).sort((a, b) =>
    (a.endedAt ?? a.startedAt).localeCompare(b.endedAt ?? b.startedAt),
  )

  let best = 0
  let current = 0
  for (const game of counted) {
    // La série repart à zéro d'une partie à l'autre : on la remet ici et non
    // à la fin, pour que `current` garde celle de la dernière partie.
    current = 0
    const rounds = [...game.rounds].sort((a, b) => a.index - b.index)
    for (const round of rounds) {
      const entry = round.entries.find((candidate) => candidate.playerId === playerId)
      if (!entry) continue
      const kept = entryScore(entry, round, game).outcome === 'exact'
      current = kept ? current + 1 : 0
      if (current > best) best = current
    }
  }
  return { best, current }
}

/**
 * La précision par taille de main.
 *
 * Tenir sa mise à une carte et la tenir à neuf ne sont pas le même exercice :
 * la moyenne globale mélange les deux et ne dit rien. Une ligne par nombre de
 * cartes, dans l'ordre croissant, et seulement les tailles réellement jouées.
 */
export interface CardsAccuracy {
  cards: number
  rounds: number
  kept: number
  /** Part de mises tenues à cette taille de main, 0..1. */
  rate: number
}

export function accuracyByCards(playerId: Id, games: Game[]): CardsAccuracy[] {
  const buckets = new Map<number, { rounds: number; kept: number }>()

  for (const game of countedGames(playerId, games)) {
    for (const round of game.rounds) {
      const entry = round.entries.find((candidate) => candidate.playerId === playerId)
      if (!entry) continue
      const bucket = buckets.get(round.cards) ?? { rounds: 0, kept: 0 }
      bucket.rounds += 1
      if (entryScore(entry, round, game).outcome === 'exact') bucket.kept += 1
      buckets.set(round.cards, bucket)
    }
  }

  return [...buckets.entries()]
    .map(([cards, bucket]) => ({
      cards,
      rounds: bucket.rounds,
      kept: bucket.kept,
      rate: bucket.rounds > 0 ? bucket.kept / bucket.rounds : 0,
    }))
    .sort((a, b) => a.cards - b.cards)
}

/**
 * Le face-à-face : contre chaque joueur croisé, combien de fois on a fini
 * devant, derrière, ou à égalité de points.
 *
 * « Devant » et non « gagné » : à quatre, terminer deuxième devant quelqu'un
 * dit quelque chose de la rivalité, alors que la victoire ne dit rien des
 * trois autres.
 */
export interface HeadToHead {
  opponentId: Id
  shared: number
  ahead: number
  behind: number
  tied: number
}

export function headToHead(playerId: Id, games: Game[]): HeadToHead[] {
  const rows = new Map<Id, HeadToHead>()

  for (const game of countedGames(playerId, games)) {
    const scores = totals(game)
    const mine = scores[playerId] ?? 0
    for (const opponentId of game.playerIds) {
      if (opponentId === playerId) continue
      const row = rows.get(opponentId) ?? {
        opponentId,
        shared: 0,
        ahead: 0,
        behind: 0,
        tied: 0,
      }
      const theirs = scores[opponentId] ?? 0
      row.shared += 1
      if (mine > theirs) row.ahead += 1
      else if (mine < theirs) row.behind += 1
      else row.tied += 1
      rows.set(opponentId, row)
    }
  }

  return [...rows.values()].sort((a, b) => b.shared - a.shared || b.ahead - a.ahead)
}

/**
 * L'évolution dans le temps : un point par partie comptée, du plus ancien au
 * plus récent. De quoi voir si l'on progresse, ce qu'aucune moyenne ne dit.
 */
export interface TimelinePoint {
  gameId: Id
  /** Date de fin, ou de début pour une partie sans date de fin lisible. */
  at: string
  total: number
  rank: number
  seats: number
}

export function playerTimeline(playerId: Id, games: Game[]): TimelinePoint[] {
  return countedGames(playerId, games)
    .map((game) => {
      const row = standings(game).find((candidate) => candidate.playerId === playerId)
      return {
        gameId: game.id,
        at: game.endedAt ?? game.startedAt,
        total: row?.total ?? 0,
        rank: row?.rank ?? game.playerIds.length,
        seats: game.playerIds.length,
      }
    })
    .sort((a, b) => a.at.localeCompare(b.at))
}

/**
 * Le départage d'une égalité en tête, pour information seulement.
 *
 * Le livret ne tranche pas les égalités, et l'app n'inventera pas de règle :
 * elle pose côte à côte les deux chiffres qu'une table regarde spontanément —
 * les mises tenues, puis les points de prime — et laisse décider. Le
 * classement, lui, garde ses deux premiers ex æquo.
 */
export interface TieRow {
  playerId: Id
  bidsKept: number
  bonusPoints: number
}

export function tieBreakers(game: Game, playerIds: Id[]): TieRow[] {
  const accuracies = accuracy(game)
  const bonuses = bonusTotals(game)
  return playerIds.map((playerId) => ({
    playerId,
    bidsKept: accuracies.find((row) => row.playerId === playerId)?.exact ?? 0,
    bonusPoints: bonuses.find((row) => row.playerId === playerId)?.points ?? 0,
  }))
}
