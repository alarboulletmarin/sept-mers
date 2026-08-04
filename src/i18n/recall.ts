import type { Vars } from './index.ts'

type Translate = (key: string, vars?: Vars) => string

export interface BidRecall {
  /** La mise annoncée. */
  bid: number
  /** Pas d'Harry le Géant. Zéro quand la mise n'a pas bougé. */
  harry?: number
  /** Score Rascal : un pli d'écart ne rend que la moitié des points. */
  halved?: boolean
  /** Boulet chargé, sous le Score Rascal. */
  cannonball?: boolean
}

/**
 * Le rappel de mise sous une tuile de résultats, en une phrase.
 *
 * Trois choses peuvent s'y dire, et elles se combinent : la mise annoncée, son
 * déplacement par Harry le Géant, et ce que le barème en fera. Une clé par
 * combinaison en ferait six ; on compose donc une tête et une queue.
 *
 * Partagé entre la tuile de saisie et celle du spectateur : les deux disent la
 * même chose de la même manche, et une divergence entre les deux se lirait
 * comme un désaccord entre deux téléphones.
 */
export function bidRecall(t: Translate, recall: BidRecall): string {
  const { bid, harry = 0, halved = false, cannonball = false } = recall
  const head =
    harry === 0 ? t('game.bid', { bid }) : t('game.bidMoved', { bid, moved: bid + harry })
  const tail = halved ? t('game.half') : cannonball ? t('game.charge.cannonball') : null
  return tail ? `${head} · ${tail}` : head
}
