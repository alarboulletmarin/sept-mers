/**
 * Distinguer huit séries sans une seule teinte.
 *
 * Trois signaux, dans cet ordre : le nom écrit à côté du tracé, le motif de
 * tiretés, puis le remplissage pour les barres. Tout est dessiné en
 * `currentColor` : les séries héritent de la surface qui les porte et restent
 * donc lisibles sur encre comme sur papier.
 */

/** Huit motifs, du plein au pointillé serré. */
const DASHES = [
  undefined, // plein
  '7 3',
  '2 3',
  '11 3',
  '7 3 2 3',
  '1 3',
  '13 3 2 4',
  '4 2 1 2',
]

export function dashFor(seat: number): string | undefined {
  return DASHES[seat % DASHES.length]
}

/**
 * Huit niveaux d'opacité, en second renfort. On ne descend jamais sous 0.55 :
 * en dessous, un tracé sur fond clair devient trop pâle pour être suivi.
 */
export function opacityFor(seat: number): number {
  return 1 - (seat % 8) * 0.06
}

/** Remplissages de barre, pour les séries empilées ou groupées. */
export type FillKind = 'solid' | 'hatch' | 'backhatch' | 'grid' | 'dots' | 'outline'

export const FILLS: FillKind[] = ['solid', 'hatch', 'backhatch', 'grid', 'dots', 'outline']

export function fillFor(index: number): FillKind {
  return FILLS[index % FILLS.length]
}
