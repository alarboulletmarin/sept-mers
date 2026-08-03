import { describe, expect, it } from 'vitest'
import { draftFor, reducer, runningGame, type Action } from './reducer.ts'
import { emptyStore, normalise, parseStore, serialiseStore } from './storage.ts'
import { makeBonus, type Store } from '../domain/types.ts'

const run = (store: Store, ...actions: Action[]): Store =>
  actions.reduce((current, action) => reducer(current, action), store)

function seeded(): Store {
  return run(
    emptyStore(),
    { type: 'players/add', name: 'Ana', id: 'p1', now: '2026-01-01T00:00:00.000Z' },
    { type: 'players/add', name: 'Bo', id: 'p2', now: '2026-01-01T00:00:00.000Z' },
    { type: 'players/add', name: 'Cy', id: 'p3', now: '2026-01-01T00:00:00.000Z' },
  )
}

function started(): Store {
  return run(seeded(), {
    type: 'game/start',
    playerIds: ['p1', 'p2', 'p3'],
    options: { bonusIfBidMissed: true },
    id: 'g1',
    now: '2026-01-01T20:00:00.000Z',
  })
}

/** Saisit une manche complète et la valide. */
function playRound(store: Store, values: [string, number, number][]): Store {
  const actions: Action[] = []
  for (const [playerId, bid] of values) actions.push({ type: 'game/setBid', playerId, bid })
  actions.push({ type: 'game/phase', phase: 'results' })
  for (const [playerId, , tricks] of values) {
    actions.push({ type: 'game/setTricks', playerId, tricks })
  }
  actions.push({ type: 'game/commitRound' })
  return run(store, ...actions)
}

describe('joueurs', () => {
  it('ajoute un joueur récurrent', () => {
    expect(seeded().players.map((player) => player.name)).toEqual(['Ana', 'Bo', 'Cy'])
  })

  it('refuse un nom vide', () => {
    expect(reducer(emptyStore(), { type: 'players/add', name: '   ' }).players).toHaveLength(0)
  })

  it('renomme sans toucher aux parties terminées', () => {
    const finished = run(started(), { type: 'game/finish', now: '2026-01-01T21:00:00.000Z' })
    const renamed = run(finished, { type: 'players/rename', id: 'p1', name: 'Anaïs' })
    expect(renamed.players[0].name).toBe('Anaïs')
    expect(renamed.games[0].nameSnapshot.p1).toBe('Ana')
  })

  it('propage le renommage à la partie en cours', () => {
    const renamed = run(started(), { type: 'players/rename', id: 'p1', name: 'Anaïs' })
    expect(renamed.games[0].nameSnapshot.p1).toBe('Anaïs')
  })

  it('garde les résultats passés après suppression du joueur', () => {
    const finished = run(started(), { type: 'game/finish' })
    const removed = run(finished, { type: 'players/remove', id: 'p1' })
    expect(removed.players).toHaveLength(2)
    expect(removed.games[0].playerIds).toContain('p1')
    expect(removed.games[0].nameSnapshot.p1).toBe('Ana')
  })
})

describe('déroulé d une partie', () => {
  it('ouvre la manche 1 en phase de mises', () => {
    const store = started()
    const game = runningGame(store)
    expect(game).not.toBeNull()
    expect(store.draft).toMatchObject({ roundIndex: 1, phase: 'bids' })
  })

  it('mémorise les options comme réglage par défaut', () => {
    const store = run(seeded(), {
      type: 'game/start',
      playerIds: ['p1', 'p2'],
      options: { bonusIfBidMissed: false },
    })
    expect(store.settings.lastOptions.bonusIfBidMissed).toBe(false)
  })

  it('valide une manche et ouvre la suivante', () => {
    const store = playRound(started(), [
      ['p1', 1, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    expect(runningGame(store)?.rounds).toHaveLength(1)
    expect(store.draft).toMatchObject({ roundIndex: 2, phase: 'bids' })
  })

  it('remet les compteurs à zéro pour la manche suivante', () => {
    const store = playRound(started(), [
      ['p1', 1, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    expect(store.draft?.bids).toEqual({ p1: null, p2: null, p3: null })
  })

  it('annule la dernière manche en restituant sa saisie', () => {
    const played = playRound(started(), [
      ['p1', 1, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    const undone = run(played, { type: 'game/undoRound' })
    expect(runningGame(undone)?.rounds).toHaveLength(0)
    expect(undone.draft).toMatchObject({ roundIndex: 1, phase: 'results' })
    expect(undone.draft?.bids.p1).toBe(1)
    expect(undone.draft?.tricks.p1).toBe(1)
  })

  it('rouvre une manche déjà validée pour la corriger', () => {
    const played = playRound(started(), [
      ['p1', 1, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    const editing = run(played, { type: 'game/editRound', index: 1 })
    expect(editing.draft).toMatchObject({ roundIndex: 1, phase: 'results' })
  })

  it('remplace la manche corrigée au lieu d en ajouter une', () => {
    let store = playRound(started(), [
      ['p1', 1, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    store = run(
      store,
      { type: 'game/editRound', index: 1 },
      { type: 'game/setBid', playerId: 'p1', bid: 0 },
      { type: 'game/setTricks', playerId: 'p1', tricks: 0 },
      { type: 'game/setTricks', playerId: 'p2', tricks: 1 },
      { type: 'game/commitRound' },
    )
    const game = runningGame(store)
    expect(game?.rounds).toHaveLength(1)
    expect(game?.rounds[0].entries[0]).toMatchObject({ bid: 0, tricks: 0 })
  })

  it('ferme le brouillon après la dixième manche', () => {
    let store = started()
    for (let round = 1; round <= 10; round += 1) {
      const cards = round
      store = playRound(store, [
        ['p1', cards, cards],
        ['p2', 0, 0],
        ['p3', 0, 0],
      ])
    }
    expect(runningGame(store)?.rounds).toHaveLength(10)
    expect(store.draft).toBeUndefined()
  })

  it('n autorise qu une partie en cours à la fois', () => {
    const store = run(started(), {
      type: 'game/start',
      playerIds: ['p1', 'p2'],
      options: { bonusIfBidMissed: true },
      id: 'g2',
      now: '2026-01-02T20:00:00.000Z',
    })
    expect(store.games.filter((game) => !game.endedAt)).toHaveLength(1)
    expect(runningGame(store)?.id).toBe('g2')
  })

  it('abandonne une partie sans la garder en historique', () => {
    const store = run(started(), { type: 'game/abandon' })
    expect(store.games).toHaveLength(0)
    expect(store.draft).toBeUndefined()
  })

  it('relance la même tablée en revanche', () => {
    const finished = run(started(), { type: 'game/finish', now: '2026-01-01T21:00:00.000Z' })
    const rematch = run(finished, { type: 'game/rematch', id: 'g2' })
    const game = runningGame(rematch)
    expect(game?.playerIds).toEqual(['p1', 'p2', 'p3'])
    expect(game?.options).toEqual({ bonusIfBidMissed: true })
  })

  it('conserve les bonus saisis à la validation', () => {
    let store = started()
    store = run(
      store,
      { type: 'game/setBid', playerId: 'p1', bid: 1 },
      { type: 'game/setBid', playerId: 'p2', bid: 0 },
      { type: 'game/setBid', playerId: 'p3', bid: 0 },
      { type: 'game/phase', phase: 'results' },
      { type: 'game/setTricks', playerId: 'p1', tricks: 1 },
      { type: 'game/setTricks', playerId: 'p2', tricks: 0 },
      { type: 'game/setTricks', playerId: 'p3', tricks: 0 },
      { type: 'game/setBonus', playerId: 'p1', key: 'blackFourteen', value: 1 },
      { type: 'game/commitRound' },
    )
    expect(runningGame(store)?.rounds[0].entries[0].bonus.blackFourteen).toBe(1)
  })
})

describe('historique', () => {
  it('supprime une partie et sait la restituer', () => {
    const finished = run(started(), { type: 'game/finish' })
    const game = finished.games[0]
    const removed = run(finished, { type: 'history/remove', gameId: game.id })
    expect(removed.games).toHaveLength(0)
    const restored = run(removed, { type: 'history/restore', game, at: 0 })
    expect(restored.games).toHaveLength(1)
  })

  it('ne restitue pas deux fois la même partie', () => {
    const finished = run(started(), { type: 'game/finish' })
    const twice = run(finished, { type: 'history/restore', game: finished.games[0], at: 0 })
    expect(twice.games).toHaveLength(1)
  })
})

describe('export et import', () => {
  it('restitue exactement le même état', () => {
    let store = playRound(started(), [
      ['p1', 1, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    store = run(store, { type: 'settings/theme', theme: 'dark' })

    const { store: reimported, summary } = parseStore(serialiseStore(store))
    expect(reimported).toEqual(store)
    expect(summary).toEqual({ players: 3, games: 1, finishedGames: 0 })
  })

  it('refuse une schemaVersion inconnue', () => {
    expect(() => parseStore(JSON.stringify({ ...emptyStore(), schemaVersion: 99 }))).toThrow()
  })

  it('refuse un JSON illisible', () => {
    expect(() => parseStore('{ pas du json')).toThrow()
  })

  it('refuse un fichier sans schemaVersion', () => {
    expect(() => parseStore(JSON.stringify({ players: [], games: [] }))).toThrow()
  })
})

describe('lecture défensive', () => {
  it('jette une partie dont la tablée est hors bornes', () => {
    const store = normalise({
      schemaVersion: 1,
      players: [],
      games: [{ id: 'g', playerIds: ['solo'], rounds: [] }],
    })
    expect(store.games).toHaveLength(0)
  })

  it('complète les bonus absents', () => {
    const store = normalise({
      schemaVersion: 1,
      players: [{ id: 'p1', name: 'Ana' }],
      games: [
        {
          id: 'g',
          startedAt: '2026-01-01T00:00:00.000Z',
          playerIds: ['p1', 'p2'],
          rounds: [{ index: 1, cards: 1, entries: [{ playerId: 'p1', bid: 0, tricks: 0 }] }],
        },
      ],
    })
    expect(store.games[0].rounds[0].entries[0].bonus).toEqual(makeBonus())
  })

  it('ne garde qu une seule partie en cours', () => {
    const store = normalise({
      schemaVersion: 1,
      players: [],
      games: [
        { id: 'a', startedAt: '2026-01-01T00:00:00.000Z', playerIds: ['x', 'y'], rounds: [] },
        { id: 'b', startedAt: '2026-01-02T00:00:00.000Z', playerIds: ['x', 'y'], rounds: [] },
      ],
    })
    const running = store.games.filter((game) => !game.endedAt)
    expect(running).toHaveLength(1)
    expect(running[0].id).toBe('b')
  })

  it('écarte un brouillon qui ne pointe sur aucune partie en cours', () => {
    const store = normalise({
      schemaVersion: 1,
      players: [],
      games: [],
      draft: { gameId: 'fantome', roundIndex: 2, phase: 'bids' },
    })
    expect(store.draft).toBeUndefined()
  })
})

describe('brouillon', () => {
  it('fabrique un brouillon vierge quand il n y en a pas', () => {
    const store = started()
    const game = runningGame(store)!
    const draft = draftFor({ ...store, draft: undefined }, game)
    expect(draft.roundIndex).toBe(1)
    expect(draft.bids).toEqual({ p1: null, p2: null, p3: null })
  })
})
