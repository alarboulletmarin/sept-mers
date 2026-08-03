import type { Store } from '../domain/types.ts'

export const CURRENT_SCHEMA_VERSION = 1

/**
 * Montées de version successives. Une migration lit la forme `n` et rend la
 * forme `n + 1`. Le tableau est vide en v1 : il existe pour que la prochaine
 * version soit une addition et pas une réécriture.
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
