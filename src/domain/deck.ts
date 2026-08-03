import { TOTAL_ROUNDS } from './types.ts'

/**
 * Le paquet du score classique : 4 couleurs de 14 cartes, 5 Fuites, 5 Pirates,
 * la Tigresse, le Skull King, 2 Sirènes.
 */
export const DECK_SIZE = 70

/**
 * Nombre de cartes distribuées à la manche `round`.
 *
 * On ne peut pas distribuer plus que le paquet ne contient : à 8 joueurs les
 * manches 9 et 10 se jouent à 8 cartes.
 */
export function cardsForRound(round: number, playerCount: number): number {
  return Math.min(round, Math.floor(DECK_SIZE / playerCount))
}

/** Vrai quand le plafond du paquet mord sur la manche demandée. */
export function isCapped(round: number, playerCount: number): boolean {
  return cardsForRound(round, playerCount) < round
}

/** Les cartes de chaque manche d'une partie, indexées de 1 à 10. */
export function roundsPlan(playerCount: number): { index: number; cards: number }[] {
  return Array.from({ length: TOTAL_ROUNDS }, (_, i) => ({
    index: i + 1,
    cards: cardsForRound(i + 1, playerCount),
  }))
}
