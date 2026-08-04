import {
  BONUS_KEYS,
  BONUS_LIMITS,
  EMPTY_BONUS,
  GREY_BEARD,
  HARRY_VALUES,
  RASCAL_VALUES,
  type Id,
  type RoundBonus,
} from './types.ts'

export type IssueCode =
  | 'bid.missing'
  | 'bid.range'
  | 'tricks.missing'
  | 'tricks.range'
  | 'tricks.sum'
  | 'bonus.colorFourteens'
  | 'bonus.blackFourteen'
  | 'bonus.piratesTakenBySkullKing'
  | 'bonus.skullKingTakenByMermaid'
  | 'bonus.mermaidBudget'
  | 'bonus.skullKingCaptured'
  | 'bonus.moreCapturesThanTricks'
  | 'voided.range'
  | 'rascal.multiple'
  | 'rascal.value'
  | 'harry.multiple'
  | 'harry.value'
  | 'harry.range'

export interface Issue {
  code: IssueCode
  /** Absent quand la contrainte porte sur la manche entière. */
  playerId?: Id
  /** Valeurs à injecter dans le message. */
  data?: Record<string, number>
}

export type BidMap = Record<Id, number | null>
export type TrickMap = Record<Id, number | null>
export type BonusMap = Record<Id, RoundBonus>

/** Les trois bonus qui découlent d'un pli remporté. Les 14 sont de la possession. */
export const CAPTURE_KEYS = [
  'mermaidsTakenByPirate',
  'piratesTakenBySkullKing',
  'skullKingTakenByMermaid',
] as const

function bonusOf(bonuses: BonusMap, playerId: Id): RoundBonus {
  return bonuses[playerId] ?? EMPTY_BONUS
}

function sumBonus(bonuses: BonusMap, playerIds: Id[], key: keyof RoundBonus): number {
  return playerIds.reduce((total, id) => total + bonusOf(bonuses, id)[key], 0)
}

function captureCount(bonus: RoundBonus): number {
  return CAPTURE_KEYS.reduce((total, key) => total + bonus[key], 0)
}

// ---------------------------------------------------------------- Phase mises

/**
 * Les mises sont libres : leur somme peut dépasser ou rester sous le nombre de
 * plis, c'est le sel du jeu. On vérifie seulement qu'elles sont renseignées et
 * dans les bornes.
 */
export function validateBids(bids: BidMap, cards: number, playerIds: Id[]): Issue[] {
  const issues: Issue[] = []
  for (const id of playerIds) {
    const bid = bids[id]
    if (bid === null || bid === undefined) {
      issues.push({ code: 'bid.missing', playerId: id })
      continue
    }
    if (!Number.isInteger(bid) || bid < 0 || bid > cards) {
      issues.push({ code: 'bid.range', playerId: id, data: { max: cards } })
    }
  }
  return issues
}

/** Somme des mises, pour l'indicateur informatif de pied d'écran. */
export function sumBids(bids: BidMap, playerIds: Id[]): number {
  return playerIds.reduce((total, id) => total + (bids[id] ?? 0), 0)
}

// ------------------------------------------------------------ Phase résultats

/**
 * Plis réellement attribuables. Sans Kraken ni Baleine blanche, aucun pli ne
 * disparaît et c'est le nombre de cartes ; avec eux, un pli peut n'être
 * remporté par personne, et il faut le retirer du compte.
 */
export function trickTarget(cards: number, voided = 0): number {
  return Math.max(0, cards - voided)
}

/**
 * La somme des plis vaut exactement le nombre de plis attribuables.
 *
 * `holders`, et non `playerIds` : à 2 joueurs le fantôme de Barbe Grise est du
 * compte. C'est ce qui permet à l'invariant de rester strict alors que la somme
 * des plis des deux joueurs, elle, ne fait plus le nombre de cartes.
 */
export function validateTricks(
  tricks: TrickMap,
  cards: number,
  holders: Id[],
  voided = 0,
): Issue[] {
  const issues: Issue[] = []
  const target = trickTarget(cards, voided)
  let assigned = 0
  let complete = true

  for (const id of holders) {
    const value = tricks[id]
    if (value === null || value === undefined) {
      issues.push({ code: 'tricks.missing', playerId: id })
      complete = false
      continue
    }
    if (!Number.isInteger(value) || value < 0 || value > target) {
      issues.push({ code: 'tricks.range', playerId: id, data: { max: target } })
      complete = false
      continue
    }
    assigned += value
  }

  if (complete && assigned !== target) {
    issues.push({ code: 'tricks.sum', data: { assigned, cards: target, diff: target - assigned } })
  }
  return issues
}

/** Plis restant à attribuer, pour le compteur de pied d'écran. */
export function remainingTricks(
  tricks: TrickMap,
  cards: number,
  holders: Id[],
  voided = 0,
): number {
  const assigned = holders.reduce((total, id) => total + (tricks[id] ?? 0), 0)
  return trickTarget(cards, voided) - assigned
}

/** On ne peut pas écarter plus de plis que la manche n'en distribue. */
export function validateVoided(voided: number, cards: number): Issue[] {
  if (!Number.isInteger(voided) || voided < 0 || voided > cards) {
    return [{ code: 'voided.range', data: { max: cards } }]
  }
  return []
}

/**
 * Le paquet ne contient qu'un seul Rascal Jack : au plus un joueur peut avoir
 * parié dans la manche.
 */
export function validateRascal(rascal: Record<Id, number>, playerIds: Id[]): Issue[] {
  const issues: Issue[] = []
  let placed = 0
  for (const id of playerIds) {
    const value = rascal[id] ?? 0
    if (!(RASCAL_VALUES as readonly number[]).includes(value)) {
      issues.push({ code: 'rascal.value', playerId: id })
      continue
    }
    if (value !== 0) placed += 1
  }
  if (placed > 1) issues.push({ code: 'rascal.multiple' })
  return issues
}

/**
 * Le pas d'Harry le Géant.
 *
 * Trois bornes, et une par raison : la valeur est un pas de ±1 ; il n'y a qu'un
 * Harry dans le paquet, donc au plus un joueur l'a joué ; et la mise déplacée
 * reste une mise, entre 0 et le nombre de cartes de la manche.
 */
export function validateHarry(
  harry: Record<Id, number>,
  bids: BidMap,
  cards: number,
  playerIds: Id[],
): Issue[] {
  const issues: Issue[] = []
  let placed = 0
  for (const id of playerIds) {
    const step = harry[id] ?? 0
    if (!(HARRY_VALUES as readonly number[]).includes(step)) {
      issues.push({ code: 'harry.value', playerId: id })
      continue
    }
    if (step === 0) continue
    placed += 1
    const moved = (bids[id] ?? 0) + step
    if (moved < 0 || moved > cards) {
      issues.push({ code: 'harry.range', playerId: id, data: { max: cards } })
    }
  }
  if (placed > 1) issues.push({ code: 'harry.multiple' })
  return issues
}

/**
 * Le joueur dont la valeur se déduit des autres, ou `null` s'il y en a
 * plusieurs. La phase résultats le complète automatiquement.
 *
 * Les plis partent semés sur les mises : plus personne n'est « non renseigné »,
 * et c'est donc le fait d'avoir été repris en main, et lui seul, qui distingue
 * celui qu'on déduit de ceux qu'on a posés.
 */
export function soleUntouchedPlayer(touched: Id[], playerIds: Id[]): Id | null {
  const untouched = playerIds.filter((id) => !touched.includes(id))
  return untouched.length === 1 ? untouched[0] : null
}

/**
 * Le porteur dont les plis se déduisent des autres.
 *
 * Le fantôme passe devant : il n'annonce rien, et son compte est par nature ce
 * qui reste. Tant qu'on ne l'a pas repris en main, c'est donc lui qui absorbe,
 * quel que soit le nombre de tuiles déjà posées — sans quoi une manche à 2
 * joueurs n'aurait plus de déduction du tout, avec trois porteurs non touchés
 * et jamais un seul.
 *
 * Repris en main, il rend la place à la règle ordinaire, et c'est le second
 * joueur qui se met à bouger. La tuile le dit, comme n'importe quelle tuile
 * déduite.
 */
export function deducedHolder(touched: Id[], holders: Id[]): Id | null {
  if (holders.includes(GREY_BEARD) && !touched.includes(GREY_BEARD)) return GREY_BEARD
  return soleUntouchedPlayer(touched, holders)
}

// -------------------------------------------------------------------- Bonus

export function validateBonuses(
  bonuses: BonusMap,
  tricks: TrickMap,
  playerIds: Id[],
): Issue[] {
  const issues: Issue[] = []
  const total = (key: keyof RoundBonus) => sumBonus(bonuses, playerIds, key)

  const fourteens = total('colorFourteens')
  if (fourteens > BONUS_LIMITS.colorFourteens) {
    issues.push({ code: 'bonus.colorFourteens', data: { max: BONUS_LIMITS.colorFourteens } })
  }

  const black = total('blackFourteen')
  if (black > BONUS_LIMITS.blackFourteen) {
    issues.push({ code: 'bonus.blackFourteen', data: { max: BONUS_LIMITS.blackFourteen } })
  }

  const pirates = total('piratesTakenBySkullKing')
  if (pirates > BONUS_LIMITS.piratesTakenBySkullKing) {
    issues.push({
      code: 'bonus.piratesTakenBySkullKing',
      data: { max: BONUS_LIMITS.piratesTakenBySkullKing },
    })
  }

  const skullKingCaught = total('skullKingTakenByMermaid')
  if (skullKingCaught > BONUS_LIMITS.skullKingTakenByMermaid) {
    issues.push({ code: 'bonus.skullKingTakenByMermaid' })
  }

  // Une sirène qui capture le Skull King n'est pas elle-même capturée par un
  // pirate : les deux sirènes du paquet se partagent ces deux rôles.
  const mermaids = total('mermaidsTakenByPirate')
  if (mermaids + skullKingCaught > BONUS_LIMITS.mermaidsTakenByPirate) {
    issues.push({
      code: 'bonus.mermaidBudget',
      data: { max: BONUS_LIMITS.mermaidsTakenByPirate },
    })
  }

  // Le Skull King capturé ne remporte aucun pli : il ne peut donc pas avoir
  // capturé de pirate dans la même manche.
  if (pirates > 0 && skullKingCaught > 0) {
    issues.push({ code: 'bonus.skullKingCaptured' })
  }

  for (const id of playerIds) {
    const won = tricks[id]
    if (won === null || won === undefined) continue
    const captures = captureCount(bonusOf(bonuses, id))
    if (captures > won) {
      issues.push({
        code: 'bonus.moreCapturesThanTricks',
        playerId: id,
        data: { captures, tricks: won },
      })
    }
  }

  return issues
}

/**
 * Plafond d'un compteur de bonus pour un joueur donné, compte tenu de ce que
 * les autres ont déjà déclaré. Le tiroir s'en sert pour désactiver un bouton
 * en affichant la raison plutôt qu'en refusant en silence.
 */
export interface Ceiling {
  max: number
  /** Contrainte qui mord en premier, `null` si c'est simplement la borne du paquet. */
  reason: IssueCode | null
}

export function bonusCeiling(
  key: keyof RoundBonus,
  playerId: Id,
  bonuses: BonusMap,
  tricks: TrickMap,
  playerIds: Id[],
): Ceiling {
  const others = playerIds.filter((id) => id !== playerId)
  const othersTotal = (k: keyof RoundBonus) => sumBonus(bonuses, others, k)

  const candidates: { max: number; reason: IssueCode | null }[] = [
    { max: BONUS_LIMITS[key] - othersTotal(key), reason: null },
  ]

  if (key === 'mermaidsTakenByPirate') {
    candidates.push({
      max:
        BONUS_LIMITS.mermaidsTakenByPirate -
        othersTotal('mermaidsTakenByPirate') -
        sumBonus(bonuses, playerIds, 'skullKingTakenByMermaid'),
      reason: 'bonus.mermaidBudget',
    })
  }

  if (key === 'skullKingTakenByMermaid') {
    candidates.push({
      max:
        BONUS_LIMITS.mermaidsTakenByPirate -
        sumBonus(bonuses, playerIds, 'mermaidsTakenByPirate') -
        othersTotal('skullKingTakenByMermaid'),
      reason: 'bonus.mermaidBudget',
    })
    if (sumBonus(bonuses, playerIds, 'piratesTakenBySkullKing') > 0) {
      candidates.push({ max: 0, reason: 'bonus.skullKingCaptured' })
    }
  }

  if (key === 'piratesTakenBySkullKing') {
    if (sumBonus(bonuses, playerIds, 'skullKingTakenByMermaid') > 0) {
      candidates.push({ max: 0, reason: 'bonus.skullKingCaptured' })
    }
  }

  if ((CAPTURE_KEYS as readonly string[]).includes(key)) {
    const won = tricks[playerId]
    if (won !== null && won !== undefined) {
      const otherCaptures = CAPTURE_KEYS.filter((k) => k !== key).reduce(
        (total, k) => total + bonusOf(bonuses, playerId)[k],
        0,
      )
      candidates.push({ max: won - otherCaptures, reason: 'bonus.moreCapturesThanTricks' })
    }
  }

  const tightest = candidates.reduce((best, candidate) =>
    candidate.max < best.max ? candidate : best,
  )
  return { max: Math.max(0, tightest.max), reason: tightest.reason }
}

/**
 * La manche est-elle saisissable en l'état ?
 *
 * Deux listes et non une : les misants d'un côté, les porteurs de plis de
 * l'autre. À 2 joueurs le fantôme est du second groupe et pas du premier — il
 * rafle des plis sans jamais annoncer ni prendre de prime. Les confondre
 * réclamerait une mise au fantôme, et laisserait ses plis hors du compte.
 */
export function validateRound(
  bids: BidMap,
  tricks: TrickMap,
  bonuses: BonusMap,
  cards: number,
  playerIds: Id[],
  holders: Id[] = playerIds,
  voided = 0,
  harry: Record<Id, number> = {},
): Issue[] {
  return [
    ...validateBids(bids, cards, playerIds),
    ...validateVoided(voided, cards),
    ...validateTricks(tricks, cards, holders, voided),
    ...validateBonuses(bonuses, tricks, playerIds),
    ...validateHarry(harry, bids, cards, playerIds),
  ]
}

export function issuesFor(issues: Issue[], playerId: Id): Issue[] {
  return issues.filter((issue) => issue.playerId === playerId)
}

export function globalIssues(issues: Issue[]): Issue[] {
  return issues.filter((issue) => issue.playerId === undefined)
}

export { BONUS_KEYS }
