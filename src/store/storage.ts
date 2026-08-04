import {
  BONUS_KEYS,
  DEFAULT_OPTIONS,
  EMPTY_BONUS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RASCAL_VALUES,
  TOTAL_ROUNDS,
  type Draft,
  type GameOptions,
  type Locale,
  type Store,
  type Theme,
} from '../domain/types.ts'
import { cardsForRound, deckSize } from '../domain/deck.ts'
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
      defaultOptions: { ...DEFAULT_OPTIONS },
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

/**
 * Les options d'une partie enregistrée, relues en liste blanche : ce qui n'est
 * pas nommé ici est effacé au chargement.
 *
 * La valeur prise quand la clé manque est historique, pas préférentielle : une
 * partie d'avant l'option comptait les bonus d'une mise ratée, et n'a jamais
 * joué les monstres. Elle doit être relue comme elle a été jouée, sinon les
 * totaux de l'historique bougent sous les pieds de ceux qui les ont marqués.
 * C'est pour ça qu'elle ne suit pas `DEFAULT_OPTIONS`, qui n'allume plus rien.
 */
const readGameOptions = (value: unknown): GameOptions => {
  const source = isObject(value) ? value : {}
  return {
    bonusIfBidMissed: source.bonusIfBidMissed !== false,
    seaMonsters: source.seaMonsters === true,
    advancedPirates: source.advancedPirates === true,
  }
}

/**
 * Les options dont partiront les prochaines parties. Là, rien d'implicite :
 * une option absente du fichier est une option qu'on n'a pas allumée.
 */
const readDefaultOptions = (value: unknown): GameOptions =>
  isObject(value)
    ? {
        bonusIfBidMissed: value.bonusIfBidMissed === true,
        seaMonsters: value.seaMonsters === true,
        advancedPirates: value.advancedPirates === true,
      }
    : { ...DEFAULT_OPTIONS }

/**
 * Le pari de Rascal Jack. Il est signé, donc il ne passe pas par `isCount`,
 * qui refuse les négatifs : un pari perdu y serait ramené à zéro en silence,
 * et le score dériverait de 20 points à chaque relecture.
 */
const readRascal = (value: unknown): number =>
  typeof value === 'number' && (RASCAL_VALUES as readonly number[]).includes(value) ? value : 0

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

        const options = readGameOptions(game.options)

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
                // Le pari du Rascal peut être négatif : il ne passe surtout
                // pas par `isCount`, qui le ramènerait à zéro en silence.
                const rascal = readRascal(entry.rascal)
                return [
                  {
                    playerId: entry.playerId,
                    bid: entry.bid,
                    tricks: entry.tricks,
                    bonus,
                    ...(rascal !== 0 ? { rascal } : {}),
                  },
                ]
              },
            )

            const voided = isCount(round.voided) ? Math.min(round.cards, round.voided) : 0
            return [
              {
                index: round.index,
                cards: round.cards,
                ...(voided > 0 ? { voided } : {}),
                entries,
              },
            ]
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
  const defaultOptions = readDefaultOptions(settingsSource.defaultOptions)

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
    settings: { locale, theme, defaultOptions },
  }

  /** Une saisie relue depuis le fichier, valeur par valeur. */
  const readDraft = (source: unknown): Draft | undefined => {
    if (!isObject(source) || typeof source.gameId !== 'string') return undefined
    const game = games.find((candidate) => candidate.id === source.gameId && !candidate.endedAt)
    if (!game || !isCount(source.roundIndex)) return undefined

    const bids: Record<string, number | null> = {}
    const tricks: Record<string, number | null> = {}
    const bonus: Record<string, typeof EMPTY_BONUS> = {}
    const rascal: Record<string, number> = {}
    const readMap = (value: unknown): Record<string, unknown> => (isObject(value) ? value : {})

    for (const id of game.playerIds) {
      const bidValue = readMap(source.bids)[id]
      bids[id] = isCount(bidValue) ? bidValue : null
      const trickValue = readMap(source.tricks)[id]
      tricks[id] = isCount(trickValue) ? trickValue : null
      const bonusSource = readMap(readMap(source.bonus)[id])
      const entry = { ...EMPTY_BONUS }
      for (const key of BONUS_KEYS) {
        const value = bonusSource[key]
        entry[key] = isCount(value) ? value : 0
      }
      bonus[id] = entry
      rascal[id] = readRascal(readMap(source.rascal)[id])
    }

    const cards = cardsForRound(source.roundIndex, game.playerIds.length, deckSize(game.options))
    const voided = isCount(source.voided) ? Math.min(cards, source.voided) : 0

    // On repart de la liste des joueurs, pas de celle du fichier : les
    // doublons et les identifiants inconnus tombent d'eux-mêmes.
    const touched = source.touchedTricks
    const touchedTricks = Array.isArray(touched)
      ? game.playerIds.filter((id) => touched.includes(id))
      : []

    const auto = source.autoTricks
    return {
      gameId: game.id,
      roundIndex: source.roundIndex,
      phase: source.phase === 'results' ? 'results' : 'bids',
      bids,
      tricks,
      bonus,
      rascal,
      voided,
      touchedTricks,
      autoTricks: typeof auto === 'string' && game.playerIds.includes(auto) ? auto : null,
    }
  }

  store.draft = readDraft(input.draft)

  // La réserve n'a de sens qu'à côté d'une correction en cours : même partie,
  // et une autre manche que celle qu'on corrige. Le reste est un fichier
  // bricolé, ou le reliquat d'une version d'avant.
  const parked = readDraft(input.liveDraft)
  if (
    store.draft &&
    parked &&
    parked.gameId === store.draft.gameId &&
    parked.roundIndex !== store.draft.roundIndex
  ) {
    store.liveDraft = parked
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
