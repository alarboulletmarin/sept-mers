import { DEFAULT_FORMAT, type GameFormat, type GameOptions } from './types.ts'

/**
 * Le paquet du score classique : 4 couleurs de 14 cartes, 5 Fuites, 5 Pirates,
 * la Tigresse, le Skull King, 2 Sirènes.
 */
export const DECK_SIZE = 70

/** Le Kraken et la Baleine blanche, une carte chacun. */
export const SEA_MONSTER_CARDS = 2

/** Taille du paquet réellement en jeu, variantes comprises. */
export function deckSize(options: Pick<GameOptions, 'kraken' | 'whiteWhale'>): number {
  return DECK_SIZE + (options.kraken ? 1 : 0) + (options.whiteWhale ? 1 : 0)
}

/**
 * Nombre de cartes distribuées à la manche `round`.
 *
 * La donne monte d'une carte par manche à partir de `first`, et s'arrête là où
 * le paquet s'arrête : on ne peut pas distribuer plus qu'il ne contient. À 8
 * joueurs et au format du livret, les manches 9 et 10 se jouent donc à 8 cartes
 * — ou à 9 avec les 2 monstres marins, que les 2 cartes de plus suffisent à
 * faire tenir la manche 9.
 *
 * `playerCount` reste le nombre de joueurs, y compris à 2 où le fantôme de
 * Barbe Grise reçoit pourtant une troisième main. Le plafond ne mord qu'à
 * partir de 8 mains — `⌊70/3⌋ = 23`, très au-dessus des 10 cartes de la
 * dernière manche —, donc compter le fantôme ne changerait pas un chiffre, et
 * obligerait les 4 appelants à s'accorder pour rien. `deck.test.ts` fige le
 * raisonnement, pour que le jour où le paquet maigrit, l'oubli se voie.
 */
export function cardsForRound(
  round: number,
  playerCount: number,
  cards = DECK_SIZE,
  first = DEFAULT_FORMAT.firstRoundCards,
): number {
  return Math.min(first + round - 1, Math.floor(cards / playerCount))
}

/** Vrai quand le plafond du paquet mord sur la manche demandée. */
export function isCapped(
  round: number,
  playerCount: number,
  cards = DECK_SIZE,
  first = DEFAULT_FORMAT.firstRoundCards,
): boolean {
  return cardsForRound(round, playerCount, cards, first) < first + round - 1
}

/** Les cartes de chaque manche d'une partie, indexées de 1 à `format.rounds`. */
export function roundsPlan(
  playerCount: number,
  cards = DECK_SIZE,
  format: GameFormat = DEFAULT_FORMAT,
): { index: number; cards: number }[] {
  return Array.from({ length: format.rounds }, (_, i) => ({
    index: i + 1,
    cards: cardsForRound(i + 1, playerCount, cards, format.firstRoundCards),
  }))
}

/** Cartes de la dernière manche : ce que l'écran de format annonce à la table. */
export function lastRoundCards(
  playerCount: number,
  cards = DECK_SIZE,
  format: GameFormat = DEFAULT_FORMAT,
): number {
  return cardsForRound(format.rounds, playerCount, cards, format.firstRoundCards)
}
