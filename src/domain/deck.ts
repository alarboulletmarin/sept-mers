import { TOTAL_ROUNDS } from './types.ts'

/**
 * Le paquet du score classique : 4 couleurs de 14 cartes, 5 Fuites, 5 Pirates,
 * la Tigresse, le Skull King, 2 Sirènes.
 */
export const DECK_SIZE = 70

/** Le Kraken et la Baleine blanche ajoutent 2 cartes au paquet. */
export const SEA_MONSTER_CARDS = 2

/** Taille du paquet réellement en jeu, variantes comprises. */
export function deckSize(options: { seaMonsters: boolean }): number {
  return DECK_SIZE + (options.seaMonsters ? SEA_MONSTER_CARDS : 0)
}

/**
 * Nombre de cartes distribuées à la manche `round`.
 *
 * On ne peut pas distribuer plus que le paquet ne contient : à 8 joueurs les
 * manches 9 et 10 se jouent à 8 cartes — ou à 9 avec les monstres marins, que
 * les 2 cartes de plus suffisent à faire tenir la manche 9.
 *
 * `playerCount` reste le nombre de joueurs, y compris à 2 où le fantôme de
 * Barbe Grise reçoit pourtant une troisième main. Le plafond ne mord qu'à
 * partir de 8 mains — `⌊70/3⌋ = 23`, très au-dessus des 10 cartes de la
 * dernière manche —, donc compter le fantôme ne changerait pas un chiffre, et
 * obligerait les 4 appelants à s'accorder pour rien. `deck.test.ts` fige le
 * raisonnement, pour que le jour où le paquet maigrit, l'oubli se voie.
 */
export function cardsForRound(round: number, playerCount: number, cards = DECK_SIZE): number {
  return Math.min(round, Math.floor(cards / playerCount))
}

/** Vrai quand le plafond du paquet mord sur la manche demandée. */
export function isCapped(round: number, playerCount: number, cards = DECK_SIZE): boolean {
  return cardsForRound(round, playerCount, cards) < round
}

/** Les cartes de chaque manche d'une partie, indexées de 1 à 10. */
export function roundsPlan(playerCount: number, cards = DECK_SIZE): { index: number; cards: number }[] {
  return Array.from({ length: TOTAL_ROUNDS }, (_, i) => ({
    index: i + 1,
    cards: cardsForRound(i + 1, playerCount, cards),
  }))
}
