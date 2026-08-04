import { TOTAL_ROUNDS, type Draft, type Game } from '../domain/types.ts'
import { normalise } from '../store/storage.ts'

/**
 * Ce que voit un spectateur : la partie, et la saisie en cours quand il y en a
 * une. `Game` porte déjà ses noms (`nameSnapshot`) et ses options — rien
 * d'autre du `Store` n'a besoin de voyager, tout le visible s'en dérive.
 */
export interface SpectatorPayload {
  game: Game
  draft?: Draft
}

/**
 * Version du protocole de partage. À monter le jour où un message change de
 * forme : un téléphone resté sur l'app d'hier saura dire « recharge » plutôt
 * que d'afficher n'importe quoi.
 */
export const PROTOCOL_VERSION = 1

export type WireMessage =
  | { v: number; kind: 'state'; game: unknown; draft?: unknown }
  | { v: number; kind: 'bye' }

export function stateMessage(payload: SpectatorPayload): WireMessage {
  return {
    v: PROTOCOL_VERSION,
    kind: 'state',
    game: payload.game,
    ...(payload.draft ? { draft: payload.draft } : {}),
  }
}

export function byeMessage(): WireMessage {
  return { v: PROTOCOL_VERSION, kind: 'bye' }
}

export type ParsedMessage =
  | { kind: 'state'; payload: SpectatorPayload }
  | { kind: 'bye' }
  | { kind: 'newer' }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Relit un message reçu du fil. Il vient d'un autre téléphone : on le traite
 * comme un fichier importé, pas comme une valeur de confiance. Rend `null`
 * pour tout ce qui ne se relit pas — l'écran garde alors le dernier état sain
 * au lieu de sauter.
 */
export function parseWireMessage(raw: unknown): ParsedMessage | null {
  if (!isObject(raw)) return null
  if (typeof raw.v !== 'number' || raw.v < 1) return null
  if (raw.v > PROTOCOL_VERSION) return { kind: 'newer' }
  if (raw.kind === 'bye') return { kind: 'bye' }
  if (raw.kind !== 'state') return null
  const payload = parseSpectatorPayload(raw.game, raw.draft)
  return payload ? { kind: 'state', payload } : null
}

/**
 * Durcit une partie et une saisie reçues en les passant par `normalise`, le
 * relecteur défensif du stockage : une coquille de `Store` minimale autour, et
 * on reprend ce qui en ressort. Mêmes bornes, mêmes défauts historiques, même
 * rejet de la sentinelle du fantôme — sans dupliquer une ligne du validateur.
 */
export function parseSpectatorPayload(game: unknown, draft?: unknown): SpectatorPayload | null {
  const store = normalise({ schemaVersion: 1, players: [], games: [game], settings: {}, draft })
  const safeGame = store.games[0]
  if (!safeGame) return null
  const safeDraft = store.draft
  // `normalise` a déjà vérifié que la saisie vise cette partie et que la
  // partie court toujours ; reste sa manche, qu'il laisse passer hors bornes.
  if (!safeDraft || safeDraft.roundIndex < 1 || safeDraft.roundIndex > TOTAL_ROUNDS) {
    return { game: safeGame }
  }
  return { game: safeGame, draft: safeDraft }
}
