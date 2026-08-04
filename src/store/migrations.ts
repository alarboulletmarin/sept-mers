import type { Store } from '../domain/types.ts'

export const CURRENT_SCHEMA_VERSION = 1

/**
 * Montées de version successives. Une migration lit la forme `n` et rend la
 * forme `n + 1`. Le tableau est vide en v1 : il existe pour que la prochaine
 * version soit une addition et pas une réécriture.
 *
 * Ce qui ne mérite pas une montée de version : une addition. Les options de
 * variante, les plis écartés d'une manche, le pari d'un joueur, la saisie mise
 * de côté, puis le Score Rascal, le Boulet de canon et les plis du fantôme de
 * Barbe Grise sont tous arrivés en v1, parce que `normalise` sait leur donner
 * la valeur historique quand la clé manque — faux, zéro, rien. Aucun champ
 * existant n'a changé de sens sur le disque.
 *
 * Le prix, assumé : un export fait par une version à jour reste lisible par une
 * version qui ne l'est pas, mais sa liste blanche y jettera les clés qu'elle ne
 * connaît pas, et recomptera la partie au barème classique. C'est moins grave
 * qu'un fichier carrément refusé, qui est ce que la montée de version
 * produirait.
 *
 * Ce qui la mériterait : une relecture. Le jour où une clé déjà écrite veut
 * dire autre chose, ou disparaît au profit d'une autre forme.
 *
 * La retenue n'est pas de la coquetterie. `parseStore` refuse un fichier dont
 * la version dépasse la sienne : monter la version ici, c'est empêcher un
 * export fait sur un téléphone à jour d'être relu sur un téléphone qui n'a pas
 * encore pris la mise à jour — deux personnes à la même table.
 */
type Migration = (data: Record<string, unknown>) => Record<string, unknown>

const migrations: Record<number, Migration> = {}

export function canMigrate(version: number): boolean {
  if (version === CURRENT_SCHEMA_VERSION) return true
  if (version > CURRENT_SCHEMA_VERSION || version < 1) return false
  for (let step = version; step < CURRENT_SCHEMA_VERSION; step += 1) {
    if (!migrations[step]) return false
  }
  return true
}

/**
 * Applique les migrations jusqu'à la version courante.
 * Lève si une version est inconnue : mieux vaut refuser explicitement que
 * lire de travers un fichier qu'on ne comprend pas.
 */
export function migrate(raw: Record<string, unknown>): Store {
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0

  if (!canMigrate(version)) {
    throw new Error(`schemaVersion ${version} inconnue`)
  }

  let data = raw
  for (let step = version; step < CURRENT_SCHEMA_VERSION; step += 1) {
    data = migrations[step](data)
  }
  return data as unknown as Store
}
