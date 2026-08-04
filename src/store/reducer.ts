import { cardsForRound, deckSize } from '../domain/deck.ts'
import {
  DEFAULT_FORMAT,
  EMPTY_BONUS,
  GREY_BEARD,
  HARRY_VALUES,
  RASCAL_VALUES,
  clampFormat,
  hasGreyBeard,
  trickHolders,
  voidsTricks,
  type Draft,
  type Game,
  type GameFormat,
  type GameOptions,
  type Id,
  type Locale,
  type Round,
  type RoundBonus,
  type Store,
  type Theme,
} from '../domain/types.ts'
import { finalBid } from '../domain/scoring.ts'
import { deducedHolder, trickTarget } from '../domain/validation.ts'
import { newId } from './storage.ts'

export type Action =
  | { type: 'settings/locale'; locale: Locale }
  | { type: 'settings/theme'; theme: Theme }
  | { type: 'settings/defaultOptions'; options: GameOptions }
  | { type: 'settings/defaultFormat'; format: GameFormat }
  | { type: 'players/add'; name: string; id?: Id; now?: string }
  | { type: 'players/rename'; id: Id; name: string }
  | { type: 'players/remove'; id: Id }
  | {
      type: 'game/start'
      playerIds: Id[]
      options: GameOptions
      /** Absent : le format du livret, dix manches d'une carte à dix. */
      format?: GameFormat
      id?: Id
      now?: string
    }
  | { type: 'game/setBid'; playerId: Id; bid: number | null }
  | { type: 'game/setTricks'; playerId: Id; tricks: number | null }
  | { type: 'game/setBonus'; playerId: Id; key: keyof RoundBonus; value: number }
  | { type: 'game/setVoided'; voided: number }
  | { type: 'game/setRascal'; playerId: Id; value: number }
  | { type: 'game/setHarry'; playerId: Id; step: number }
  | { type: 'game/setCannonball'; playerId: Id; loaded: boolean }
  | { type: 'game/phase'; phase: Draft['phase'] }
  | { type: 'game/commitRound' }
  | { type: 'game/undoRound' }
  | { type: 'game/editRound'; index: number }
  | { type: 'game/resumeLive' }
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
  const rascal: Record<Id, number> = {}
  const harry: Record<Id, number> = {}
  const cannonball: Record<Id, boolean> = {}
  for (const id of game.playerIds) {
    // Les compteurs partent à zéro plutôt qu'à vide : une manche où personne
    // ne mise doit pouvoir se valider sans toucher une seule tuile.
    bids[id] = 0
    tricks[id] = 0
    bonus[id] = { ...EMPTY_BONUS }
    rascal[id] = 0
    harry[id] = 0
    cannonball[id] = false
  }
  // Le fantôme part à zéro pour la même raison, et n'a que des plis : ni mise,
  // ni prime, ni pari.
  if (hasGreyBeard(game.playerIds.length)) tricks[GREY_BEARD] = 0
  return {
    gameId: game.id,
    roundIndex,
    phase: 'bids',
    bids,
    tricks,
    bonus,
    rascal,
    harry,
    cannonball,
    voided: 0,
    touchedTricks: [],
    autoTricks: null,
  }
}

/** Draft repeuplé à partir d'une manche déjà validée, pour la corriger. */
function draftFromRound(game: Game, round: Round): Draft {
  const draft = emptyDraft(game, round.index)
  draft.phase = 'results'
  draft.autoTricks = null
  draft.voided = round.voided ?? 0
  for (const entry of round.entries) {
    draft.bids[entry.playerId] = entry.bid
    draft.tricks[entry.playerId] = entry.tricks
    draft.bonus[entry.playerId] = { ...entry.bonus }
    draft.rascal[entry.playerId] = entry.rascal ?? 0
    draft.harry[entry.playerId] = entry.harry ?? 0
    draft.cannonball[entry.playerId] = entry.cannonball ?? false
  }
  if (hasGreyBeard(game.playerIds.length)) draft.tricks[GREY_BEARD] = round.greyBeard ?? 0
  // Une manche validée a été saisie en entier : ni resemis, ni déduction. Le
  // fantôme en est, sans quoi la rouvrir pour relire un chiffre le recalculerait
  // et réécrirait la manche.
  draft.touchedTricks = trickHolders(game.playerIds)
  return draft
}

/**
 * Les plis repartent de la mise de chacun : c'est la valeur la plus probable,
 * et une manche où tout le monde tient sa mise se valide alors sans un geste.
 * On ne touche pas à ceux qui ont déjà été posés à la main.
 *
 * La mise semée est celle qu'on défend, pas celle qu'on a annoncée : un joueur
 * qui a déplacé la sienne avec Harry le Géant puis fait un aller-retour par les
 * mises repart de son chiffre déplacé.
 */
function seedTricks(draft: Draft, playerIds: Id[]): Record<Id, number | null> {
  const tricks = { ...draft.tricks }
  for (const id of playerIds) {
    if (draft.touchedTricks.includes(id)) continue
    tricks[id] = finalBid(draft.bids[id] ?? 0, draft.harry[id] ?? 0)
  }
  return tricks
}

/**
 * Repose la déduction du dernier joueur non repris en main. À appeler après
 * chaque écriture dans les plis : la valeur déduite est un reste, elle périme
 * dès qu'un autre joueur bouge.
 */
function withDeduction(
  tricks: Record<Id, number | null>,
  touchedTricks: Id[],
  holders: Id[],
  cards: number,
): { tricks: Record<Id, number | null>; autoTricks: Id | null } {
  const auto = deducedHolder(touchedTricks, holders)
  if (auto === null) return { tricks, autoTricks: null }
  const assigned = holders.reduce(
    (total, id) => (id === auto ? total : total + (tricks[id] ?? 0)),
    0,
  )
  return {
    tricks: { ...tricks, [auto]: Math.min(cards, Math.max(0, cards - assigned)) },
    autoTricks: auto,
  }
}

const marked = (list: Id[], id: Id): Id[] => (list.includes(id) ? list : [...list, id])

/** Cartes distribuées à la manche du brouillon, paquet et format compris. */
function cardsOf(game: Game, draft: Draft): number {
  return cardsForRound(
    draft.roundIndex,
    game.playerIds.length,
    deckSize(game.options),
    game.format.firstRoundCards,
  )
}

/** Les porteurs de plis de la partie : les joueurs, et le fantôme à 2. */
function holdersOf(game: Game): Id[] {
  return trickHolders(game.playerIds)
}

/** Plis réellement attribuables : les cartes, moins ce que les monstres ont pris. */
function targetOf(game: Game, draft: Draft): number {
  return trickTarget(cardsOf(game, draft), draft.voided)
}

export function nextRoundIndex(game: Game): number {
  return game.rounds.length + 1
}

/** Vrai quand le brouillon corrige une manche déjà validée. */
export function isEditingRound(game: Game, draft: Draft): boolean {
  return game.rounds.some((round) => round.index === draft.roundIndex)
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
      return { ...store, settings: { ...store.settings, defaultOptions: action.options } }

    case 'settings/defaultFormat':
      return {
        ...store,
        settings: { ...store.settings, defaultFormat: clampFormat(action.format) },
      }

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
      // Le format se fige ici, avec la partie : le changer dans les réglages
      // plus tard ne doit pas rallonger une partie déjà commencée.
      const format = clampFormat(action.format ?? DEFAULT_FORMAT)
      const game: Game = {
        id: action.id ?? newId(),
        startedAt: now,
        playerIds: action.playerIds,
        options: action.options,
        format,
        rounds: [],
        nameSnapshot,
      }
      return {
        ...store,
        // Une seule partie en cours : les traînantes sont closes.
        games: [...store.games.map((old) => (old.endedAt ? old : { ...old, endedAt: now })), game],
        settings: { ...store.settings, defaultOptions: action.options, defaultFormat: format },
        draft: emptyDraft(game, 1),
        liveDraft: undefined,
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
      const holders = holdersOf(game)
      // Le fantôme n'existe qu'à 2 : ailleurs, sa tuile n'est pas rendue et son
      // identifiant n'a rien à faire dans les plis.
      if (!holders.includes(action.playerId)) return store
      const draft = draftFor(store, game)

      // Poser une valeur, c'est la reprendre en main — y compris sur la tuile
      // que la déduction remplissait jusque-là.
      const touchedTricks = marked(draft.touchedTricks, action.playerId)

      // On recalcule la déduction à chaque saisie, pas seulement au moment où
      // elle apparaît : sinon un incrément de plus la laisserait périmée.
      const deduced = withDeduction(
        { ...draft.tricks, [action.playerId]: action.tricks },
        touchedTricks,
        holders,
        targetOf(game, draft),
      )

      return { ...store, draft: { ...draft, ...deduced, touchedTricks } }
    }

    case 'game/setVoided': {
      const game = runningGame(store)
      // Sans monstre au paquet, aucun pli ne s'écarte : le compteur n'existe
      // pas, et une action qui l'écrirait viendrait d'ailleurs.
      if (!game || !voidsTricks(game.options)) return store
      const draft = draftFor(store, game)
      const cards = cardsOf(game, draft)
      const voided = Math.min(cards, Math.max(0, action.voided))
      // Écarter un pli change le total à distribuer : la déduction périme.
      const deduced = withDeduction(
        draft.tricks,
        draft.touchedTricks,
        holdersOf(game),
        trickTarget(cards, voided),
      )
      return { ...store, draft: { ...draft, ...deduced, voided } }
    }

    case 'game/setRascal': {
      const game = runningGame(store)
      if (!game || !game.options.advancedPirates) return store
      if (!(RASCAL_VALUES as readonly number[]).includes(action.value)) return store
      const draft = draftFor(store, game)
      return {
        ...store,
        draft: { ...draft, rascal: { ...draft.rascal, [action.playerId]: action.value } },
      }
    }

    case 'game/setHarry': {
      const game = runningGame(store)
      // Harry est un pouvoir de pirate : sans la variante, il n'a pas été joué.
      if (!game || !game.options.advancedPirates) return store
      if (!game.playerIds.includes(action.playerId)) return store
      if (!(HARRY_VALUES as readonly number[]).includes(action.step)) return store
      const draft = draftFor(store, game)
      return {
        ...store,
        draft: { ...draft, harry: { ...draft.harry, [action.playerId]: action.step } },
      }
    }

    case 'game/setCannonball': {
      const game = runningGame(store)
      // Deux conditions, un seul arbitre : le barème doit être le Rascal, et la
      // table doit avoir ouvert le Boulet.
      if (!game || !game.options.rascalScoring || !game.options.cannonball) return store
      if (!game.playerIds.includes(action.playerId)) return store
      const draft = draftFor(store, game)
      return {
        ...store,
        draft: {
          ...draft,
          cannonball: { ...draft.cannonball, [action.playerId]: action.loaded },
        },
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
      const draft = draftFor(store, game)
      if (action.phase === 'bids') return { ...store, draft: { ...draft, phase: 'bids' } }

      // Entrée dans les résultats : les plis repartent des mises, sauf ceux
      // qu'on a déjà posés. Un aller-retour vers les mises pour en corriger
      // une doit donc se répercuter, et la déduction se reposer derrière —
      // sinon le joueur déduit garderait sa mise au lieu du reste, la somme
      // ne tomberait pas juste, et le bouton resterait mort.
      //
      // Le fantôme, lui, n'a pas de mise à semer : il reste donc à la déduction
      // et prend le reste. C'est ce qui garde, à 2 joueurs comme ailleurs, la
      // propriété qu'une manche où tout le monde tient sa mise se valide sans
      // un geste.
      const deduced = withDeduction(
        seedTricks(draft, game.playerIds),
        draft.touchedTricks,
        holdersOf(game),
        targetOf(game, draft),
      )
      return { ...store, draft: { ...draft, ...deduced, phase: 'results' } }
    }

    case 'game/commitRound': {
      const game = runningGame(store)
      if (!game || !store.draft) return store
      const draft = store.draft
      const cards = cardsOf(game, draft)

      // Un zéro ne s'écrit pas, et un défaut non plus : une partie sans
      // variante garde sur disque la forme qu'elle avait avant qu'elles
      // existent.
      const greyBeard = hasGreyBeard(game.playerIds.length)
        ? (draft.tricks[GREY_BEARD] ?? 0)
        : 0
      const round: Round = {
        index: draft.roundIndex,
        cards,
        ...(draft.voided > 0 ? { voided: draft.voided } : {}),
        ...(greyBeard > 0 ? { greyBeard } : {}),
        entries: game.playerIds.map((playerId) => {
          const rascal = draft.rascal[playerId] ?? 0
          const harry = draft.harry[playerId] ?? 0
          const cannonball = draft.cannonball[playerId] ?? false
          return {
            playerId,
            bid: draft.bids[playerId] ?? 0,
            tricks: draft.tricks[playerId] ?? 0,
            bonus: { ...(draft.bonus[playerId] ?? EMPTY_BONUS) },
            ...(rascal !== 0 ? { rascal } : {}),
            ...(harry !== 0 ? { harry } : {}),
            ...(cannonball ? { cannonball } : {}),
          }
        }),
      }

      const existing = game.rounds.some((candidate) => candidate.index === round.index)
      const rounds = existing
        ? game.rounds.map((candidate) => (candidate.index === round.index ? round : candidate))
        : [...game.rounds, round]
      rounds.sort((a, b) => a.index - b.index)

      const next = withGame(store, game.id, (current) => ({ ...current, rounds }))
      const updated = gameById(next, game.id)
      if (!updated) return next

      // Valider une correction rend la main à la manche en cours, avec la
      // saisie qui l'attendait ; valider la manche en cours ouvre la suivante.
      const parked = store.liveDraft
      if (existing && parked && parked.gameId === game.id) {
        return { ...next, draft: parked, liveDraft: undefined }
      }

      const following = nextRoundIndex(updated)
      return {
        ...next,
        draft: following > updated.format.rounds ? undefined : emptyDraft(updated, following),
        liveDraft: undefined,
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
      // On rouvre la manche annulée avec sa saisie, pas un écran vierge. La
      // réserve désignait la manche d'après, qui n'existe plus : elle part.
      return { ...next, draft: draftFromRound(updated, last), liveDraft: undefined }
    }

    case 'game/editRound': {
      const game = runningGame(store)
      if (!game) return store
      const round = game.rounds.find((candidate) => candidate.index === action.index)
      if (!round) return store
      // La saisie de la manche en cours est mise de côté, pas jetée : reculer
      // d'une manche pour vérifier un chiffre ne doit rien coûter. Sauter
      // ensuite d'une manche corrigée à une autre ne remplace pas la réserve.
      const current = store.draft
      const parked = current && !isEditingRound(game, current) ? current : store.liveDraft
      return { ...store, draft: draftFromRound(game, round), liveDraft: parked }
    }

    case 'game/resumeLive': {
      const game = runningGame(store)
      if (!game) return store
      const parked = store.liveDraft
      if (parked && parked.gameId === game.id) {
        return { ...store, draft: parked, liveDraft: undefined }
      }
      // Pas de réserve — un rechargement l'a emportée : on rouvre proprement
      // la manche en cours plutôt que de laisser l'écran sur le passé.
      const following = nextRoundIndex(game)
      return {
        ...store,
        draft: following > game.format.rounds ? undefined : emptyDraft(game, following),
        liveDraft: undefined,
      }
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
        liveDraft: undefined,
      }
    }

    case 'game/abandon': {
      const game = runningGame(store)
      if (!game) return store
      return {
        ...store,
        games: store.games.filter((candidate) => candidate.id !== game.id),
        draft: undefined,
        liveDraft: undefined,
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
        // Une revanche se rejoue au même format : même longueur, même donne.
        format: previous.format,
        ...(action.id ? { id: action.id } : {}),
        ...(action.now ? { now: action.now } : {}),
      })
    }

    case 'history/remove':
      return {
        ...store,
        games: store.games.filter((game) => game.id !== action.gameId),
        draft: store.draft?.gameId === action.gameId ? undefined : store.draft,
        liveDraft: store.liveDraft?.gameId === action.gameId ? undefined : store.liveDraft,
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
