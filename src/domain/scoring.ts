import { BONUS_VALUES, type RoundBonus } from './types.ts'

export interface ScoreInput {
  bid: number
  tricks: number
  cards: number
  bonus: RoundBonus
  /** Pari de Rascal Jack, signé. */
  rascal?: number
  /** Boulet de canon chargé. Lu seulement sous le Score Rascal, option ouverte. */
  cannonball?: boolean
  options: {
    bonusIfBidMissed: boolean
    /** Le barème Rascal. Rien à voir avec `rascal`, qui est le pari du Jack. */
    rascalScoring?: boolean
    cannonball?: boolean
  }
}

export interface ScoreResult {
  bidPoints: number
  bonusPoints: number
  /**
   * Le pari de Rascal Jack, tenu à part des primes : l'option qui annule les
   * primes d'une mise ratée ne l'annule pas, le Score Rascal ne le divise pas,
   * et lui seul peut être négatif.
   */
  rascalPoints: number
  total: number
  /** `over` = a misé plus qu'il n'a fait. */
  outcome: 'exact' | 'over' | 'under'
  /** Écart absolu entre la mise et les plis. Le Score Rascal en fait 3 paliers. */
  gap: number
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

/** Potentiel d'une manche sous le Score Rascal, par carte distribuée. */
const RASCAL_PER_CARD = { grapeshot: 10, cannonball: 15 } as const

/** Le barème classique. Le corps d'origine, déplacé sans une retouche. */
function classic(input: ScoreInput, bidMet: boolean, gap: number) {
  const { bid, cards, bonus, options } = input
  return {
    bidPoints:
      bid === 0 ? (bidMet ? 10 * cards : -10 * cards) : bidMet ? 20 * bid : -10 * gap,
    bonusPoints: bidMet || options.bonusIfBidMissed ? rawBonusPoints(bonus) : 0,
  }
}

/**
 * Le Score Rascal. La mise ne décide plus de ce qu'on peut gagner, seulement de
 * ce qu'on en garde : chaque manche vaut 10 points par carte pour tout le
 * monde, et l'écart décide de la part — tout, la moitié, ou rien. Les primes
 * suivent la même échelle, d'où l'ambiance plus calculatrice.
 *
 * Rien ne descend sous zéro, et c'est structurel plutôt que plancherisé après
 * coup : aucun des deux termes n'est le produit d'autre chose que d'un
 * potentiel positif par 1, ½ ou 0.
 */
function rascalScale(input: ScoreInput, gap: number) {
  const { cards, bonus, options } = input
  // Une charge n'a de sens que si la table a ouvert le Boulet : sinon tout le
  // monde tire à la mitraille, quoi que porte la manche enregistrée.
  const cannonball = Boolean(options.cannonball && input.cannonball)
  // Le boulet ne connaît que tout ou rien : c'est ce qu'on achète en le chargeant.
  const share = gap === 0 ? 1 : gap === 1 && !cannonball ? 0.5 : 0
  const perCard = cannonball ? RASCAL_PER_CARD.cannonball : RASCAL_PER_CARD.grapeshot
  // Les moitiés tombent juste : le potentiel est un multiple de 10, les primes
  // valent 10, 20, 30 ou 40. L'arrondi est une ceinture, pas un comportement —
  // le jour où une prime impaire apparaîtra, ce sera une décision de règle.
  return {
    bidPoints: Math.round(perCard * cards * share),
    bonusPoints: Math.round(rawBonusPoints(bonus) * share),
  }
}

/**
 * Score d'un joueur sur une manche.
 *
 * Module pur : pas de stockage, pas d'horloge, pas de constante de jeu en dur
 * hors de celles des barèmes. Les variantes passent par `options`, et le
 * second barème est une branche à côté du premier, pas une réécriture.
 */
export function scoreRound(input: ScoreInput): ScoreResult {
  const { bid, tricks, options } = input
  const gap = Math.abs(tricks - bid)
  const bidMet = gap === 0
  const rascalPoints = input.rascal ?? 0

  const { bidPoints, bonusPoints } = options.rascalScoring
    ? rascalScale(input, gap)
    : classic(input, bidMet, gap)

  return {
    bidPoints,
    bonusPoints,
    rascalPoints,
    total: bidPoints + bonusPoints + rascalPoints,
    outcome: bidMet ? 'exact' : tricks < bid ? 'over' : 'under',
    gap,
  }
}
