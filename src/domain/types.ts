export type Id = string

export type Locale = 'fr' | 'en'
export type Theme = 'light' | 'dark' | 'system'

/** Les cinq bonus du score classique, comptés par joueur et par manche. */
export interface RoundBonus {
  colorFourteens: number //          0..3   les 14 vert, jaune, violet
  blackFourteen: number //           0..1   le 14 noir
  mermaidsTakenByPirate: number //   0..2   sirène capturée par un pirate
  piratesTakenBySkullKing: number // 0..6   pirate capturé par le Skull King
  skullKingTakenByMermaid: number // 0..1   Skull King capturé par une sirène
}

export interface GameOptions {
  /** Un joueur qui rate sa mise garde-t-il ses bonus ? */
  bonusIfBidMissed: boolean
}

export interface Player {
  id: Id
  name: string
  createdAt: string
}

export interface RoundEntry {
  playerId: Id
  bid: number
  tricks: number
  bonus: RoundBonus
}

export interface Round {
  index: number // 1..10
  cards: number // cartesDeLaManche
  entries: RoundEntry[]
}

export interface Game {
  id: Id
  startedAt: string
  /** Absent tant que la partie est en cours. */
  endedAt?: string
  /** Ordre à table. */
  playerIds: Id[]
  options: GameOptions
  /** Manches validées uniquement. */
  rounds: Round[]
  /**
   * Nom du joueur au moment de la partie. Permet de garder un historique
   * lisible même après une suppression ou un renommage.
   */
  nameSnapshot: Record<Id, string>
}

export interface Settings {
  locale: Locale
  theme: Theme
  lastOptions: GameOptions
}

/** Saisie en cours, non encore validée. Permet de reprendre à la manche exacte. */
export interface Draft {
  gameId: Id
  roundIndex: number
  phase: 'bids' | 'results'
  bids: Record<Id, number | null>
  tricks: Record<Id, number | null>
  bonus: Record<Id, RoundBonus>
  /**
   * Joueurs dont les plis ont été posés à la main. Les autres gardent la valeur
   * semée depuis leur mise : c'est ce qui permet à la fois de resemer après une
   * correction de mise, et de désigner celui dont la valeur se déduit.
   */
  touchedTricks: Id[]
  /**
   * Joueur dont les plis sont déduits des autres. On le retient pour pouvoir
   * recalculer sa valeur à chaque saisie : sans ça, un `+` de plus sur un autre
   * joueur laisserait une déduction périmée.
   */
  autoTricks?: Id | null
}

export interface Store {
  schemaVersion: 1
  players: Player[]
  games: Game[]
  settings: Settings
  draft?: Draft
  /**
   * Saisie de la manche en cours, mise de côté le temps de corriger une manche
   * passée. Revenir en arrière ne doit rien détruire.
   */
  liveDraft?: Draft
}

export const TOTAL_ROUNDS = 10
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 8

export const EMPTY_BONUS: RoundBonus = {
  colorFourteens: 0,
  blackFourteen: 0,
  mermaidsTakenByPirate: 0,
  piratesTakenBySkullKing: 0,
  skullKingTakenByMermaid: 0,
}

/** Bornes matérielles d'un bonus, sur l'ensemble de la manche. */
export const BONUS_LIMITS: Record<keyof RoundBonus, number> = {
  colorFourteens: 3,
  blackFourteen: 1,
  mermaidsTakenByPirate: 2,
  piratesTakenBySkullKing: 6,
  skullKingTakenByMermaid: 1,
}

export const BONUS_KEYS = Object.keys(BONUS_LIMITS) as (keyof RoundBonus)[]

/** Points rapportés par une unité de chaque bonus. */
export const BONUS_VALUES: Record<keyof RoundBonus, number> = {
  colorFourteens: 10,
  blackFourteen: 20,
  mermaidsTakenByPirate: 20,
  piratesTakenBySkullKing: 30,
  skullKingTakenByMermaid: 40,
}

export function makeBonus(partial: Partial<RoundBonus> = {}): RoundBonus {
  return { ...EMPTY_BONUS, ...partial }
}

export function bonusIsEmpty(bonus: RoundBonus): boolean {
  return BONUS_KEYS.every((key) => bonus[key] === 0)
}
