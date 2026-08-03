import { cardsForRound } from '../domain/deck.ts'
import {
  EMPTY_BONUS,
  TOTAL_ROUNDS,
  type Draft,
  type Game,
  type GameOptions,
  type Id,
  type Locale,
  type Round,
  type RoundBonus,
  type Store,
  type Theme,
} from '../domain/types.ts'
import { newId } from './storage.ts'

export type Action =
  | { type: 'settings/locale'; locale: Locale }
  | { type: 'settings/theme'; theme: Theme }
  | { type: 'settings/defaultOptions'; options: GameOptions }
  | { type: 'players/add'; name: string; id?: Id; now?: string }
  | { type: 'players/rename'; id: Id; name: string }
  | { type: 'players/remove'; id: Id }
  | { type: 'game/start'; playerIds: Id[]; options: GameOptions; id?: Id; now?: string }
  | { type: 'game/setBid'; playerId: Id; bid: number | null }
  | { type: 'game/setTricks'; playerId: Id; tricks: number | null }
  | { type: 'game/setBonus'; playerId: Id; key: keyof RoundBonus; value: number }
  | { type: 'game/phase'; phase: Draft['phase'] }
  | { type: 'game/commitRound' }
  | { type: 'game/undoRound' }
  | { type: 'game/editRound'; index: number }
  | { type: 'game/replaceRound'; round: Round }
  | { type: 'game/finish'; now?: string }
  | { type: 'game/abandon' }
  | { type: 'game/rematch'; id?: Id; now?: string }
  | { type: 'history/remove'; gameId: Id }
  | { type: 'history/restore'; game: Game; at: number }
  | { type: 'store/replace'; store: Store }
  | { type: 'store/clear'; store: Store }

export function runningGame(store: Store): Game | null {
  return store.games.find((game) => !game.endedAt) ?? null
}

export function gameById(store: Store, id: Id): Game | null {
  return store.games.find((game) => game.id === id) ?? null
}

function emptyDraft(game: Game, roundIndex: number): Draft {
  const bids: Record<Id, number | null> = {}
  const tricks: Record<Id, number | null> = {}
  const bonus: Record<Id, RoundBonus> = {}
  for (const id of game.playerIds) {
    bids[id] = null
    tricks[id] = null
    bonus[id] = { ...EMPTY_BONUS }
  }
  return { gameId: game.id, roundIndex, phase: 'bids', bids, tricks, bonus }
}

/** Draft repeuplé à partir d'une manche déjà validée, pour la corriger. */
function draftFromRound(game: Game, round: Round): Draft {
  const draft = emptyDraft(game, round.index)
  draft.phase = 'results'
  for (const entry of round.entries) {
    draft.bids[entry.playerId] = entry.bid
    draft.tricks[entry.playerId] = entry.tricks
    draft.bonus[entry.playerId] = { ...entry.bonus }
  }
  return draft
}

export function nextRoundIndex(game: Game): number {
  return game.rounds.length + 1
}

export function draftFor(store: Store, game: Game): Draft {
  if (store.draft && store.draft.gameId === game.id) return store.draft
  return emptyDraft(game, nextRoundIndex(game))
}

function withGame(store: Store, gameId: Id, update: (game: Game) => Game): Store {
  return {
    ...store,
    games: store.games.map((game) => (game.id === gameId ? update(game) : game)),
  }
}

export function reducer(store: Store, action: Action): Store {
  switch (action.type) {
    case 'settings/locale':
      return { ...store, settings: { ...store.settings, locale: action.locale } }

    case 'settings/theme':
      return { ...store, settings: { ...store.settings, theme: action.theme } }

    case 'settings/defaultOptions':
      return { ...store, settings: { ...store.settings, lastOptions: action.options } }

    case 'players/add': {
      const name = action.name.trim()
      if (!name) return store
      const player = {
        id: action.id ?? newId(),
        name,
        createdAt: action.now ?? new Date().toISOString(),
      }
      return { ...store, players: [...store.players, player] }
    }

    case 'players/rename': {
      const name = action.name.trim()
      if (!name) return store
      return {
        ...store,
        players: store.players.map((player) =>
          player.id === action.id ? { ...player, name } : player,
        ),
        // Les parties en cours suivent le renommage ; les parties terminées
        // gardent le nom porté au moment où elles ont été jouées.
        games: store.games.map((game) =>
          game.endedAt || !game.playerIds.includes(action.id)
            ? game
            : { ...game, nameSnapshot: { ...game.nameSnapshot, [action.id]: name } },
        ),
      }
    }

    case 'players/remove':
      // Les résultats passés restent, sous le nom porté à l'époque.
      return { ...store, players: store.players.filter((player) => player.id !== action.id) }

    case 'game/start': {
      const now = action.now ?? new Date().toISOString()
      const nameSnapshot: Record<Id, string> = {}
      for (const id of action.playerIds) {
        nameSnapshot[id] = store.players.find((player) => player.id === id)?.name ?? 'Joueur'
      }
      const game: Game = {
        id: action.id ?? newId(),
        startedAt: now,
        playerIds: action.playerIds,
        options: action.options,
        rounds: [],
        nameSnapshot,
      }
      return {
        ...store,
        // Une seule partie en cours : les traînantes sont closes.
        games: [...store.games.map((old) => (old.endedAt ? old : { ...old, endedAt: now })), game],
        settings: { ...store.settings, lastOptions: action.options },
        draft: emptyDraft(game, 1),
      }
    }

    case 'game/setBid': {
      const game = runningGame(store)
      if (!game) return store
      const draft = draftFor(store, game)
      return { ...store, draft: { ...draft, bids: { ...draft.bids, [action.playerId]: action.bid } } }
    }

    case 'game/setTricks': {
      const game = runningGame(store)
      if (!game) return store
      const draft = draftFor(store, game)
      return {
        ...store,
        draft: { ...draft, tricks: { ...draft.tricks, [action.playerId]: action.tricks } },
      }
    }

    case 'game/setBonus': {
      const game = runningGame(store)
      if (!game) return store
      const draft = draftFor(store, game)
      const current = draft.bonus[action.playerId] ?? EMPTY_BONUS
      return {
        ...store,
        draft: {
          ...draft,
          bonus: {
            ...draft.bonus,
            [action.playerId]: { ...current, [action.key]: Math.max(0, action.value) },
          },
        },
      }
    }

    case 'game/phase': {
      const game = runningGame(store)
      if (!game) return store
      return { ...store, draft: { ...draftFor(store, game), phase: action.phase } }
    }

    case 'game/commitRound': {
      const game = runningGame(store)
      if (!game || !store.draft) return store
      const draft = store.draft
      const cards = cardsForRound(draft.roundIndex, game.playerIds.length)

      const round: Round = {
        index: draft.roundIndex,
        cards,
        entries: game.playerIds.map((playerId) => ({
          playerId,
          bid: draft.bids[playerId] ?? 0,
          tricks: draft.tricks[playerId] ?? 0,
          bonus: { ...(draft.bonus[playerId] ?? EMPTY_BONUS) },
        })),
      }

      const existing = game.rounds.some((candidate) => candidate.index === round.index)
      const rounds = existing
        ? game.rounds.map((candidate) => (candidate.index === round.index ? round : candidate))
        : [...game.rounds, round]
      rounds.sort((a, b) => a.index - b.index)

      const next = withGame(store, game.id, (current) => ({ ...current, rounds }))
      const updated = gameById(next, game.id)
      if (!updated) return next

      const following = nextRoundIndex(updated)
      return {
        ...next,
        draft: following > TOTAL_ROUNDS ? undefined : emptyDraft(updated, following),
      }
    }

    case 'game/undoRound': {
      const game = runningGame(store)
      if (!game || game.rounds.length === 0) return store
      const last = game.rounds[game.rounds.length - 1]
      const rounds = game.rounds.slice(0, -1)
      const next = withGame(store, game.id, (current) => ({ ...current, rounds }))
      const updated = gameById(next, game.id)
      if (!updated) return next
      // On rouvre la manche annulée avec sa saisie, pas un écran vierge.
      return { ...next, draft: draftFromRound(updated, last) }
    }

    case 'game/editRound': {
      const game = runningGame(store)
      if (!game) return store
      const round = game.rounds.find((candidate) => candidate.index === action.index)
      if (!round) return store
      return { ...store, draft: draftFromRound(game, round) }
    }

    case 'game/replaceRound': {
      const game = runningGame(store)
      if (!game) return store
      return withGame(store, game.id, (current) => ({
        ...current,
        rounds: current.rounds.map((round) =>
          round.index === action.round.index ? action.round : round,
        ),
      }))
    }

    case 'game/finish': {
      const game = runningGame(store)
      if (!game) return store
      const now = action.now ?? new Date().toISOString()
      return {
        ...withGame(store, game.id, (current) => ({ ...current, endedAt: now })),
        draft: undefined,
      }
    }

    case 'game/abandon': {
      const game = runningGame(store)
      if (!game) return store
      return {
        ...store,
        games: store.games.filter((candidate) => candidate.id !== game.id),
        draft: undefined,
      }
    }

    case 'game/rematch': {
      const previous = store.games
        .filter((game) => game.endedAt)
        .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))[0]
      if (!previous) return store
      return reducer(store, {
        type: 'game/start',
        playerIds: previous.playerIds,
        options: previous.options,
        ...(action.id ? { id: action.id } : {}),
        ...(action.now ? { now: action.now } : {}),
      })
    }

    case 'history/remove':
      return {
        ...store,
        games: store.games.filter((game) => game.id !== action.gameId),
        draft: store.draft?.gameId === action.gameId ? undefined : store.draft,
      }

    case 'history/restore': {
      if (store.games.some((game) => game.id === action.game.id)) return store
      const games = [...store.games, action.game].sort((a, b) =>
        a.startedAt.localeCompare(b.startedAt),
      )
      return { ...store, games }
    }

    case 'store/replace':
      return action.store

    case 'store/clear':
      return action.store

    default:
      return store
  }
}
