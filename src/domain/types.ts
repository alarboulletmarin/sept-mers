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
  /** Kraken et Baleine blanche dans le paquet : un pli peut n'aller à personne. */
  seaMonsters: boolean
  /** Pouvoirs des pirates. Seul le pari de Rascal Jack compte des points. */
  advancedPirates: boolean
}

/**
 * Rien d'allumé. Une option qu'on n'a pas choisie ne doit pas être en jeu :
 * on ouvre sur les règles les plus simples, et chacune se réclame.
 *
 * À ne pas confondre avec la valeur qu'une partie *déjà enregistrée* prend
 * quand la clé manque de son fichier — celle-là est historique, et vaut vrai
 * pour `bonusIfBidMissed`. Voir `readGameOptions` dans `store/storage.ts`.
 */
export const DEFAULT_OPTIONS: GameOptions = {
  bonusIfBidMissed: false,
  seaMonsters: false,
  advancedPirates: false,
}

/**
 * Le pari de Rascal Jack, signé : 0, 10 ou 20 points, gagnés ou perdus. Il se
 * compte quoi qu'il arrive à la mise, d'où sa place hors des primes.
 */
export const RASCAL_VALUES = [-20, -10, 0, 10, 20] as const

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
  /** Pari de Rascal Jack. Absent quand il n'y en a pas eu. */
  rascal?: number
}

export interface Round {
  index: number // 1..10
  cards: number // cartesDeLaManche
  /**
   * Plis écartés par le Kraken ou la Baleine blanche, que personne ne remporte.
   * Absent quand il n'y en a pas eu.
   */
  voided?: number
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
  /**
   * Les options dont part une nouvelle partie. Modifiables dans les réglages,
   * et remises à jour par la dernière partie lancée — on rejoue le plus
   * souvent avec les règles de la fois d'avant.
   *
   * La clé s'appelait `lastOptions`, du temps où `bonusIfBidMissed` valait vrai
   * par défaut. La renommer est ce qui remet ce vrai-là à zéro sur les
   * installations existantes : la liste blanche de `normalise` ne lit plus
   * l'ancienne clé, et le réglage repart de `DEFAULT_OPTIONS`. Un export d'une
   * version à l'autre reste lisible dans les deux sens — c'est une préférence
   * qui se reprend en deux touches, pas une partie.
   */
  defaultOptions: GameOptions
}

/** Saisie en cours, non encore validée. Permet de reprendre à la manche exacte. */
export interface Draft {
  gameId: Id
  roundIndex: number
  phase: 'bids' | 'results'
  bids: Record<Id, number | null>
  tricks: Record<Id, number | null>
  bonus: Record<Id, RoundBonus>
  /** Pari de Rascal Jack, par joueur. Zéro quand il n'y en a pas. */
  rascal: Record<Id, number>
  /** Plis écartés de la manche par le Kraken ou la Baleine blanche. */
  voided: number
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
