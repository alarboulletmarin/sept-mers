import { BONUS_VALUES, type RoundBonus } from './types.ts'

export interface ScoreInput {
  bid: number
  tricks: number
  cards: number
  bonus: RoundBonus
  /** Pari de Rascal Jack, signé. */
  rascal?: number
  options: { bonusIfBidMissed: boolean }
}

export interface ScoreResult {
  bidPoints: number
  bonusPoints: number
  /**
   * Le pari de Rascal Jack, tenu à part des primes : l'option qui annule les
   * primes d'une mise ratée ne l'annule pas, et lui seul peut être négatif.
   */
  rascalPoints: number
  total: number
  /** `over` = a misé plus qu'il n'a fait. */
  outcome: 'exact' | 'over' | 'under'
}

/** Somme brute des bonus, avant application de l'option de mise ratée. */
export function rawBonusPoints(bonus: RoundBonus): number {
  return (
    BONUS_VALUES.colorFourteens * bonus.colorFourteens +
    BONUS_VALUES.blackFourteen * bonus.blackFourteen +
    BONUS_VALUES.mermaidsTakenByPirate * bonus.mermaidsTakenByPirate +
    BONUS_VALUES.piratesTakenBySkullKing * bonus.piratesTakenBySkullKing +
    BONUS_VALUES.skullKingTakenByMermaid * bonus.skullKingTakenByMermaid
  )
}

/**
 * Score d'un joueur sur une manche, en système classique.
 *
 * Module pur : pas de stockage, pas d'horloge, pas de constante de jeu en dur
 * hors de celles du barème. Les variantes futures passeront par `options`.
 */
export function scoreRound(input: ScoreInput): ScoreResult {
  const { bid, tricks, cards, bonus, options } = input
  const bidMet = bid === tricks
  const rascalPoints = input.rascal ?? 0

  const bidPoints =
    bid === 0
      ? bidMet
        ? 10 * cards
        : -10 * cards
      : bidMet
        ? 20 * bid
        : -10 * Math.abs(tricks - bid)

  const bonusPoints = bidMet || options.bonusIfBidMissed ? rawBonusPoints(bonus) : 0

  return {
    bidPoints,
    bonusPoints,
    rascalPoints,
    total: bidPoints + bonusPoints + rascalPoints,
    outcome: bidMet ? 'exact' : tricks < bid ? 'over' : 'under',
  }
}
