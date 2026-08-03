import {
  BONUS_KEYS,
  EMPTY_BONUS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  TOTAL_ROUNDS,
  type Locale,
  type Store,
  type Theme,
} from '../domain/types.ts'
import { CURRENT_SCHEMA_VERSION, migrate } from './migrations.ts'

export const STORAGE_KEY = 'sept-mers'
const WRITE_DELAY = 300

export function defaultLocale(): Locale {
  const preferred = typeof navigator === 'undefined' ? 'fr' : navigator.language
  return preferred.toLowerCase().startsWith('en') ? 'en' : 'fr'
}

export function emptyStore(): Store {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    players: [],
    games: [],
    settings: {
      locale: defaultLocale(),
      theme: 'system',
      lastOptions: { bonusIfBidMissed: true },
    },
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

// ------------------------------------------------------------------ Validation

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0

export interface ImportSummary {
  players: number
  games: number
  finishedGames: number
}

export class ImportError extends Error {
  readonly reason: 'parse' | 'shape' | 'version'
  constructor(reason: 'parse' | 'shape' | 'version', message: string) {
    super(message)
    this.reason = reason
  }
}

/**
 * Valide la forme d'un fichier importé avant d'écraser quoi que ce soit.
 * On refuse plutôt que de deviner : un fichier à moitié lu ferait plus de
 * dégâts qu'un refus net.
 */
export function parseStore(text: string): { store: Store; summary: ImportSummary } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ImportError('parse', 'JSON illisible')
  }

  if (!isObject(raw)) throw new ImportError('shape', 'racine non conforme')

  const version = raw.schemaVersion
  if (typeof version !== 'number') throw new ImportError('shape', 'schemaVersion absente')
  if (version > CURRENT_SCHEMA_VERSION || version < 1) {
    throw new ImportError('version', `schemaVersion ${version}`)
  }

  const migrated = migrate(raw)
  const store = normalise(migrated)

  return {
    store,
    summary: {
      players: store.players.length,
      games: store.games.length,
      finishedGames: store.games.filter((game) => game.endedAt).length,
    },
  }
}

/**
 * Ramène un `Store` lu depuis le disque à une forme sûre : on jette ce qui ne
 * tient pas debout plutôt que de laisser l'app planter au premier rendu.
 */
export function normalise(input: unknown): Store {
  const fallback = emptyStore()
  if (!isObject(input)) return fallback

  const players = Array.isArray(input.players)
    ? input.players.filter(
        (player): player is Store['players'][number] =>
          isObject(player) &&
          typeof player.id === 'string' &&
          typeof player.name === 'string',
      )
    : []

  const games = Array.isArray(input.games)
    ? input.games.flatMap((game): Store['games'] => {
        if (!isObject(game)) return []
        if (typeof game.id !== 'string' || !Array.isArray(game.playerIds)) return []

        const playerIds = game.playerIds.filter(
          (id): id is string => typeof id === 'string',
        )
        if (playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) return []

        const options = isObject(game.options)
          ? { bonusIfBidMissed: game.options.bonusIfBidMissed !== false }
          : { bonusIfBidMissed: true }

        const rounds = (Array.isArray(game.rounds) ? game.rounds : []).flatMap(
          (round): Store['games'][number]['rounds'] => {
            if (!isObject(round)) return []
            if (!isCount(round.index) || !isCount(round.cards)) return []
            if (round.index < 1 || round.index > TOTAL_ROUNDS) return []

            const entries = (Array.isArray(round.entries) ? round.entries : []).flatMap(
              (entry): Store['games'][number]['rounds'][number]['entries'] => {
                if (!isObject(entry)) return []
                if (typeof entry.playerId !== 'string') return []
                if (!isCount(entry.bid) || !isCount(entry.tricks)) return []

                const source = isObject(entry.bonus) ? entry.bonus : {}
                const bonus = { ...EMPTY_BONUS }
                for (const key of BONUS_KEYS) {
                  const value = source[key]
                  bonus[key] = isCount(value) ? value : 0
                }
                return [{ playerId: entry.playerId, bid: entry.bid, tricks: entry.tricks, bonus }]
              },
            )

            return [{ index: round.index, cards: round.cards, entries }]
          },
        )

        const snapshot: Record<string, string> = {}
        const source = isObject(game.nameSnapshot) ? game.nameSnapshot : {}
        for (const id of playerIds) {
          const stored = source[id]
          if (typeof stored === 'string' && stored.length > 0) {
            snapshot[id] = stored
            continue
          }
          snapshot[id] =
            players.find((player) => player.id === id)?.name ?? 'Joueur'
        }

        return [
          {
            id: game.id,
            startedAt:
              typeof game.startedAt === 'string' ? game.startedAt : new Date().toISOString(),
            ...(typeof game.endedAt === 'string' ? { endedAt: game.endedAt } : {}),
            playerIds,
            options,
            rounds: rounds.sort((a, b) => a.index - b.index),
            nameSnapshot: snapshot,
          },
        ]
      })
    : []

  const settingsSource = isObject(input.settings) ? input.settings : {}
  const locale: Locale = settingsSource.locale === 'en' ? 'en' : 'fr'
  const themeValue = settingsSource.theme
  const theme: Theme =
    themeValue === 'light' || themeValue === 'dark' || themeValue === 'system'
      ? themeValue
      : 'system'
  const lastOptions = isObject(settingsSource.lastOptions)
    ? { bonusIfBidMissed: settingsSource.lastOptions.bonusIfBidMissed !== false }
    : { bonusIfBidMissed: true }

  // Une seule partie en cours à la fois : on garde la plus récente et on
  // clôt les autres, un fichier bricolé à la main ne doit pas bloquer l'app.
  const running = games.filter((game) => !game.endedAt)
  if (running.length > 1) {
    running
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(1)
      .forEach((game) => {
        game.endedAt = game.startedAt
      })
  }

  const store: Store = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    players,
    games,
    settings: { locale, theme, lastOptions },
  }

  const draft = input.draft
  if (isObject(draft) && typeof draft.gameId === 'string') {
    const game = games.find((candidate) => candidate.id === draft.gameId && !candidate.endedAt)
    if (game && isCount(draft.roundIndex)) {
      const bids: Record<string, number | null> = {}
      const tricks: Record<string, number | null> = {}
      const bonus: Record<string, typeof EMPTY_BONUS> = {}
      const readMap = (value: unknown): Record<string, unknown> =>
        isObject(value) ? value : {}

      for (const id of game.playerIds) {
        const bidValue = readMap(draft.bids)[id]
        bids[id] = isCount(bidValue) ? bidValue : null
        const trickValue = readMap(draft.tricks)[id]
        tricks[id] = isCount(trickValue) ? trickValue : null
        const bonusSource = readMap(readMap(draft.bonus)[id])
        const entry = { ...EMPTY_BONUS }
        for (const key of BONUS_KEYS) {
          const value = bonusSource[key]
          entry[key] = isCount(value) ? value : 0
        }
        bonus[id] = entry
      }

      const auto = draft.autoTricks
      store.draft = {
        gameId: game.id,
        roundIndex: draft.roundIndex,
        phase: draft.phase === 'results' ? 'results' : 'bids',
        bids,
        tricks,
        bonus,
        autoTricks: typeof auto === 'string' && game.playerIds.includes(auto) ? auto : null,
      }
    }
  }

  return store
}

// -------------------------------------------------------------------- Lecture

export function loadStore(): Store {
  if (typeof localStorage === 'undefined') return emptyStore()
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (!text) return emptyStore()
    return normalise(migrate(JSON.parse(text)))
  } catch {
    // Donnée illisible : on repart propre plutôt que de bloquer le lancement.
    return emptyStore()
  }
}

// -------------------------------------------------------------------- Écriture

let pending: ReturnType<typeof setTimeout> | null = null
let queued: Store | null = null

function write(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota plein ou stockage refusé : l'app continue en mémoire.
  }
}

/** Écriture debouncée à 300 ms, pour ne pas sérialiser à chaque tap. */
export function saveStore(store: Store): void {
  if (typeof localStorage === 'undefined') return
  queued = store
  if (pending) clearTimeout(pending)
  pending = setTimeout(() => {
    pending = null
    if (queued) write(queued)
    queued = null
  }, WRITE_DELAY)
}

/** Vide la file d'écriture : à l'export, et quand l'onglet passe en arrière-plan. */
export function flushStore(): void {
  if (pending) {
    clearTimeout(pending)
    pending = null
  }
  if (queued) {
    write(queued)
    queued = null
  }
}

export function clearStore(): void {
  flushStore()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // rien à faire de plus
  }
}

export function exportFileName(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `sept-mers-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

export function serialiseStore(store: Store): string {
  return JSON.stringify(store, null, 2)
}
