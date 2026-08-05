import { describe, expect, it } from 'vitest'
import { draftFor, nameTaken, reducer, runningGame, type Action } from './reducer.ts'
import { emptyStore, normalise, parseStore, serialiseStore } from './storage.ts'
import {
  DEFAULT_FORMAT,
  DEFAULT_OPTIONS,
  GREY_BEARD,
  MAX_ROUNDS,
  MIN_FIRST_CARDS,
  makeBonus,
  type Store,
} from '../domain/types.ts'

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
    options: { ...DEFAULT_OPTIONS },
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
      options: { ...DEFAULT_OPTIONS, bonusIfBidMissed: true },
    })
    expect(store.settings.defaultOptions.bonusIfBidMissed).toBe(true)
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
    expect(store.draft?.bids).toEqual({ p1: 0, p2: 0, p3: 0 })
    expect(store.draft?.touchedTricks).toEqual([])
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
      options: { ...DEFAULT_OPTIONS },
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
    expect(game?.options).toEqual(DEFAULT_OPTIONS)
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

describe('complétion automatique du dernier joueur', () => {
  const setup = () =>
    run(
      started(),
      { type: 'game/setBid', playerId: 'p1', bid: 1 },
      { type: 'game/setBid', playerId: 'p2', bid: 1 },
      { type: 'game/setBid', playerId: 'p3', bid: 1 },
      { type: 'game/phase', phase: 'results' },
    )

  it('déduit le dernier joueur dès qu il est seul à manquer', () => {
    let store = run(
      setup(),
      { type: 'game/setTricks', playerId: 'p1', tricks: 1 },
      { type: 'game/setTricks', playerId: 'p2', tricks: 0 },
    )
    // Manche 1 : une seule carte, donc un seul pli à distribuer.
    expect(store.draft?.tricks.p3).toBe(0)
    expect(store.draft?.autoTricks).toBe('p3')
    store = run(store, { type: 'game/setTricks', playerId: 'p1', tricks: 0 })
    expect(store.draft?.tricks.p3).toBe(1)
  })

  it('recalcule la déduction quand un autre joueur change encore', () => {
    // Le cas du stepper : la déduction tombe pendant qu'on incrémente encore.
    let store = run(
      setup(),
      { type: 'game/setTricks', playerId: 'p1', tricks: 0 },
      { type: 'game/setTricks', playerId: 'p2', tricks: 0 },
    )
    expect(store.draft?.tricks.p3).toBe(1)
    store = run(store, { type: 'game/setTricks', playerId: 'p2', tricks: 1 })
    expect(store.draft?.tricks.p3).toBe(0)
  })

  it('rend la main quand on touche soi-même la valeur déduite', () => {
    let store = run(
      setup(),
      { type: 'game/setTricks', playerId: 'p1', tricks: 1 },
      { type: 'game/setTricks', playerId: 'p2', tricks: 0 },
    )
    expect(store.draft?.autoTricks).toBe('p3')
    store = run(store, { type: 'game/setTricks', playerId: 'p3', tricks: 1 })
    expect(store.draft?.autoTricks).toBeNull()
    expect(store.draft?.tricks.p3).toBe(1)
  })

  it('ne déduit rien tant que deux joueurs n ont pas été repris en main', () => {
    const store = run(setup(), { type: 'game/setTricks', playerId: 'p1', tricks: 1 })
    // Les deux autres gardent la valeur semée depuis leur mise.
    expect(store.draft?.tricks.p2).toBe(1)
    expect(store.draft?.tricks.p3).toBe(1)
    expect(store.draft?.autoTricks).toBeNull()
  })

  it('borne la déduction plutôt que de rendre un nombre négatif', () => {
    // Manche 3 : trois cartes, mais les deux premiers en annoncent déjà quatre.
    let store = started()
    store = playRound(store, [['p1', 1, 1], ['p2', 0, 0], ['p3', 0, 0]])
    store = playRound(store, [['p1', 2, 2], ['p2', 0, 0], ['p3', 0, 0]])
    store = run(
      store,
      { type: 'game/setBid', playerId: 'p1', bid: 3 },
      { type: 'game/setBid', playerId: 'p2', bid: 0 },
      { type: 'game/setBid', playerId: 'p3', bid: 0 },
      { type: 'game/phase', phase: 'results' },
      { type: 'game/setTricks', playerId: 'p1', tricks: 3 },
      { type: 'game/setTricks', playerId: 'p2', tricks: 3 },
    )
    expect(store.draft?.tricks.p3).toBe(0)
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

  it('restitue aussi une correction en cours et la saisie mise de côté', () => {
    let store = playRound(started(), [['p1', 1, 1], ['p2', 0, 0], ['p3', 0, 0]])
    store = run(
      store,
      { type: 'game/setBid', playerId: 'p2', bid: 2 },
      { type: 'game/editRound', index: 1 },
      { type: 'game/setTricks', playerId: 'p1', tricks: 0 },
    )
    expect(store.liveDraft).toBeDefined()

    const { store: reimported } = parseStore(serialiseStore(store))
    expect(reimported).toEqual(store)
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

describe('options par défaut', () => {
  it("n'allume aucune option à l'installation", () => {
    // Les bascules de l'écran de nouvelle partie sont éteintes tant que
    // personne ne les a touchées, et l'écran part de ce réglage.
    expect(DEFAULT_OPTIONS).toEqual({
      bonusIfBidMissed: false,
      kraken: false,
      whiteWhale: false,
      advancedPirates: false,
      rascalScoring: false,
      cannonball: false,
    })
    expect(emptyStore().settings.defaultOptions).toEqual(DEFAULT_OPTIONS)
  })

  it("éteint le réglage écrit par une version d'avant", () => {
    /*
     * `bonusIfBidMissed` valait vrai par défaut, et ce vrai-là a été écrit dans
     * le stockage de tout le monde sous la clé `lastOptions`. Sans cette
     * relecture, le changement de valeur par défaut ne se verrait que sur une
     * installation neuve.
     */
    const store = normalise({
      schemaVersion: 1,
      players: [],
      games: [],
      settings: {
        locale: 'fr',
        theme: 'system',
        lastOptions: { bonusIfBidMissed: true, kraken: false, advancedPirates: false },
      },
    })
    expect(store.settings.defaultOptions).toEqual(DEFAULT_OPTIONS)
  })

  it('garde le réglage que quelqu un a lui-même allumé', () => {
    const store = normalise({
      schemaVersion: 1,
      players: [],
      games: [],
      settings: { locale: 'fr', theme: 'system', defaultOptions: { kraken: true } },
    })
    expect(store.settings.defaultOptions).toEqual({ ...DEFAULT_OPTIONS, kraken: true })
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

  it('jette un joueur inconnu de la liste des repris en main', () => {
    const written = run(started(), { type: 'game/setTricks', playerId: 'p1', tricks: 0 })
    const abîmé = JSON.parse(serialiseStore(written))
    abîmé.draft.touchedTricks = ['p1', 'fantôme', 'p1']
    expect(normalise(abîmé).draft?.touchedTricks).toEqual(['p1'])
  })

  it('écarte une réserve qui pointe sur la manche qu on corrige', () => {
    const written = run(started(), { type: 'game/setBid', playerId: 'p1', bid: 1 })
    const abîmé = JSON.parse(serialiseStore(written))
    // Une réserve sur la même manche que la correction ne veut rien dire.
    abîmé.liveDraft = { ...abîmé.draft }
    expect(normalise(abîmé).liveDraft).toBeUndefined()
  })
})

describe('brouillon', () => {
  it('fabrique un brouillon vierge quand il n y en a pas', () => {
    const store = started()
    const game = runningGame(store)!
    const draft = draftFor({ ...store, draft: undefined }, game)
    expect(draft.roundIndex).toBe(1)
    expect(draft.bids).toEqual({ p1: 0, p2: 0, p3: 0 })
  })
})

describe('saisie pré-remplie', () => {
  it('ouvre la manche avec toutes les mises à zéro et rien de repris en main', () => {
    const draft = started().draft
    expect(draft?.bids).toEqual({ p1: 0, p2: 0, p3: 0 })
    expect(draft?.touchedTricks).toEqual([])
    expect(draft?.autoTricks).toBeNull()
  })

  it('sème les plis sur la mise à l entrée dans les résultats', () => {
    const store = run(
      started(),
      { type: 'game/setBid', playerId: 'p1', bid: 1 },
      { type: 'game/phase', phase: 'results' },
    )
    expect(store.draft?.tricks).toEqual({ p1: 1, p2: 0, p3: 0 })
  })

  it('valide une manche sans toucher une seule tuile quand les mises tombent juste', () => {
    // Manche 1, une carte : p1 mise 1, les autres 0. La somme est déjà bonne.
    const store = run(
      started(),
      { type: 'game/setBid', playerId: 'p1', bid: 1 },
      { type: 'game/phase', phase: 'results' },
      { type: 'game/commitRound' },
    )
    expect(runningGame(store)?.rounds[0].entries).toMatchObject([
      { playerId: 'p1', bid: 1, tricks: 1 },
      { playerId: 'p2', bid: 0, tricks: 0 },
      { playerId: 'p3', bid: 0, tricks: 0 },
    ])
  })

  it('resème les plis non repris en main après un retour aux mises', () => {
    let store = run(
      started(),
      { type: 'game/setBid', playerId: 'p1', bid: 1 },
      { type: 'game/phase', phase: 'results' },
      // p1 est repris en main, p2 et p3 restent semés.
      { type: 'game/setTricks', playerId: 'p1', tricks: 0 },
    )
    store = run(
      store,
      { type: 'game/phase', phase: 'bids' },
      { type: 'game/setBid', playerId: 'p2', bid: 1 },
      { type: 'game/phase', phase: 'results' },
    )
    expect(store.draft?.tricks.p1).toBe(0)
    expect(store.draft?.tricks.p2).toBe(1)
  })

  it('compte une manche rouverte comme entièrement reprise en main', () => {
    const played = playRound(started(), [
      ['p1', 1, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    const editing = run(played, { type: 'game/editRound', index: 1 })
    expect(editing.draft?.touchedTricks).toEqual(['p1', 'p2', 'p3'])
    expect(editing.draft?.autoTricks).toBeNull()
  })
})

describe('navigation entre manches', () => {
  /** Deux manches jouées, et une saisie entamée sur la troisième. */
  const inProgress = () => {
    let store = playRound(started(), [['p1', 1, 1], ['p2', 0, 0], ['p3', 0, 0]])
    store = playRound(store, [['p1', 2, 2], ['p2', 0, 0], ['p3', 0, 0]])
    return run(store, { type: 'game/setBid', playerId: 'p2', bid: 3 })
  }

  it('met la saisie en cours de côté en rouvrant une manche passée', () => {
    const store = run(inProgress(), { type: 'game/editRound', index: 2 })
    expect(store.draft?.roundIndex).toBe(2)
    expect(store.liveDraft?.roundIndex).toBe(3)
    expect(store.liveDraft?.bids.p2).toBe(3)
  })

  it('restitue la saisie mise de côté au retour', () => {
    const store = run(
      inProgress(),
      { type: 'game/editRound', index: 2 },
      { type: 'game/resumeLive' },
    )
    expect(store.draft?.roundIndex).toBe(3)
    expect(store.draft?.bids.p2).toBe(3)
    expect(store.liveDraft).toBeUndefined()
  })

  it('restitue la saisie mise de côté après avoir validé la correction', () => {
    const store = run(
      inProgress(),
      { type: 'game/editRound', index: 2 },
      { type: 'game/setTricks', playerId: 'p1', tricks: 1 },
      { type: 'game/setTricks', playerId: 'p2', tricks: 1 },
      { type: 'game/commitRound' },
    )
    expect(runningGame(store)?.rounds).toHaveLength(2)
    expect(store.draft?.roundIndex).toBe(3)
    expect(store.draft?.bids.p2).toBe(3)
  })

  it('ne remplace pas la réserve en sautant d une manche corrigée à une autre', () => {
    const store = run(
      inProgress(),
      { type: 'game/editRound', index: 2 },
      { type: 'game/editRound', index: 1 },
    )
    expect(store.draft?.roundIndex).toBe(1)
    expect(store.liveDraft?.roundIndex).toBe(3)
  })

  it('rouvre une manche vierge quand il n y a rien en réserve', () => {
    const store = run(inProgress(), { type: 'game/resumeLive' })
    expect(store.draft?.roundIndex).toBe(3)
    expect(store.draft?.bids).toEqual({ p1: 0, p2: 0, p3: 0 })
  })

  it('oublie la réserve en annulant la dernière manche', () => {
    const store = run(
      inProgress(),
      { type: 'game/editRound', index: 2 },
      { type: 'game/undoRound' },
    )
    expect(store.liveDraft).toBeUndefined()
  })

  it('oublie la réserve en abandonnant la partie', () => {
    const store = run(
      inProgress(),
      { type: 'game/editRound', index: 2 },
      { type: 'game/abandon' },
    )
    expect(store.liveDraft).toBeUndefined()
  })

  it('oublie la réserve au démarrage d une nouvelle partie', () => {
    const store = run(inProgress(), { type: 'game/editRound', index: 2 })
    const restarted = run(store, {
      type: 'game/start',
      playerIds: ['p1', 'p2'],
      options: { ...DEFAULT_OPTIONS },
    })
    expect(restarted.liveDraft).toBeUndefined()
  })
})

describe('variantes', () => {
  /** Une partie à 3, monstres marins et pouvoirs des pirates activés. */
  const withVariants = () =>
    run(seeded(), {
      type: 'game/start',
      playerIds: ['p1', 'p2', 'p3'],
      options: { ...DEFAULT_OPTIONS, kraken: true, advancedPirates: true },
      id: 'g1',
      now: '2026-01-01T20:00:00.000Z',
    })

  it('ignore les plis écartés quand la variante n est pas en jeu', () => {
    const store = run(started(), { type: 'game/setVoided', voided: 1 })
    expect(store.draft?.voided).toBe(0)
  })

  it('ignore le pari quand la variante n est pas en jeu', () => {
    const store = run(started(), { type: 'game/setRascal', playerId: 'p1', value: 20 })
    expect(store.draft?.rascal.p1).toBe(0)
  })

  it('refuse une valeur de pari hors barème', () => {
    const store = run(withVariants(), { type: 'game/setRascal', playerId: 'p1', value: 15 })
    expect(store.draft?.rascal.p1).toBe(0)
  })

  it('borne les plis écartés au nombre de cartes', () => {
    const store = run(withVariants(), { type: 'game/setVoided', voided: 4 })
    expect(store.draft?.voided).toBe(1)
  })

  it('ramène la déduction à ce qui reste à distribuer', () => {
    // Manche 3, 3 cartes, 1 pli écarté : il n'en reste que 2 à répartir.
    let store = withVariants()
    store = playRound(store, [['p1', 1, 1], ['p2', 0, 0], ['p3', 0, 0]])
    store = playRound(store, [['p1', 2, 2], ['p2', 0, 0], ['p3', 0, 0]])
    store = run(
      store,
      { type: 'game/phase', phase: 'results' },
      { type: 'game/setVoided', voided: 1 },
      { type: 'game/setTricks', playerId: 'p1', tricks: 2 },
      { type: 'game/setTricks', playerId: 'p2', tricks: 0 },
    )
    expect(store.draft?.tricks.p3).toBe(0)
  })

  it('recalcule la déduction quand le nombre de plis écartés change', () => {
    let store = withVariants()
    store = playRound(store, [['p1', 1, 1], ['p2', 0, 0], ['p3', 0, 0]])
    store = run(
      store,
      { type: 'game/phase', phase: 'results' },
      { type: 'game/setTricks', playerId: 'p1', tricks: 0 },
      { type: 'game/setTricks', playerId: 'p2', tricks: 0 },
    )
    expect(store.draft?.tricks.p3).toBe(2)
    store = run(store, { type: 'game/setVoided', voided: 1 })
    expect(store.draft?.tricks.p3).toBe(1)
  })

  it('écrit les plis écartés et le pari sur la manche validée', () => {
    const store = run(
      withVariants(),
      { type: 'game/phase', phase: 'results' },
      { type: 'game/setVoided', voided: 1 },
      { type: 'game/setRascal', playerId: 'p2', value: -20 },
      { type: 'game/commitRound' },
    )
    const round = runningGame(store)?.rounds[0]
    expect(round?.voided).toBe(1)
    expect(round?.entries[1].rascal).toBe(-20)
  })

  it('n écrit ni pli écarté ni pari quand il n y en a pas', () => {
    // La forme sur disque d'une partie sans variante ne change pas.
    const store = run(
      withVariants(),
      { type: 'game/phase', phase: 'results' },
      { type: 'game/setTricks', playerId: 'p1', tricks: 1 },
      { type: 'game/commitRound' },
    )
    const round = runningGame(store)?.rounds[0]
    expect(round && 'voided' in round).toBe(false)
    expect(round?.entries[0] && 'rascal' in round.entries[0]).toBe(false)
  })

  it('restitue un pari perdu à la relecture', () => {
    // `isCount` refuse les négatifs : un pari perdu doit passer à côté.
    const store = run(
      withVariants(),
      { type: 'game/phase', phase: 'results' },
      { type: 'game/setRascal', playerId: 'p1', value: -20 },
      { type: 'game/setTricks', playerId: 'p1', tricks: 1 },
      { type: 'game/commitRound' },
    )
    const { store: reimported } = parseStore(serialiseStore(store))
    expect(reimported.games[0].rounds[0].entries[0].rascal).toBe(-20)
    expect(reimported).toEqual(store)
  })

  it('relit une partie d avant les variantes comme elle a été jouée', () => {
    const store = normalise({
      schemaVersion: 1,
      players: [{ id: 'p1', name: 'Ana' }],
      games: [{ id: 'g', playerIds: ['p1', 'p2'], options: {}, rounds: [] }],
    })
    // Historique et non préférentiel : la partie a compté les bonus d'une mise
    // ratée, et le réglage par défaut de l'app ne la fait pas changer d'avis.
    // Le Score Rascal, lui, part à faux : aucune partie enregistrée ne l'a
    // jamais joué, donc son « comme avant » est « non ».
    expect(store.games[0].options).toEqual({
      bonusIfBidMissed: true,
      kraken: false,
      whiteWhale: false,
      advancedPirates: false,
      rascalScoring: false,
      cannonball: false,
    })
  })
})

describe('le fantôme de Barbe Grise', () => {
  /** Une table à 2, où le fantôme prend la troisième main. */
  const twoPlayers = (options = {}) =>
    run(seeded(), {
      type: 'game/start',
      playerIds: ['p1', 'p2'],
      options: { ...DEFAULT_OPTIONS, ...options },
      id: 'g2',
      now: '2026-01-01T20:00:00.000Z',
    })

  /** La manche `round` ouverte en phase résultats, sur les mises données. */
  const atResults = (store: Store, bids: [string, number][]) =>
    run(
      store,
      ...bids.map(([playerId, bid]): Action => ({ type: 'game/setBid', playerId, bid })),
      { type: 'game/phase', phase: 'results' },
    )

  it('reçoit le reste dès l entrée dans les résultats', () => {
    // Manche 1 : 1 carte, mises à 0 et 0, le pli va donc au fantôme.
    const store = atResults(twoPlayers(), [
      ['p1', 0],
      ['p2', 0],
    ])
    expect(store.draft?.tricks[GREY_BEARD]).toBe(1)
    expect(store.draft?.autoTricks).toBe(GREY_BEARD)
  })

  it('laisse une manche où chacun tient sa mise se valider sans un geste', () => {
    // C'est la propriété à ne pas perdre : mises 2 et 3 sur 6 cartes, il reste
    // 1 pli au fantôme, et la somme tombe juste toute seule.
    let store = twoPlayers()
    store = playRound(store, [
      ['p1', 0, 0],
      ['p2', 1, 1],
    ])
    store = playRound(store, [
      ['p1', 1, 1],
      ['p2', 1, 1],
    ])
    store = atResults(store, [
      ['p1', 2],
      ['p2', 0],
    ])
    expect(store.draft?.tricks.p1).toBe(2)
    expect(store.draft?.tricks.p2).toBe(0)
    expect(store.draft?.tricks[GREY_BEARD]).toBe(1)
  })

  it('se repose quand un joueur pose ses plis', () => {
    let store = atResults(twoPlayers(), [
      ['p1', 0],
      ['p2', 0],
    ])
    store = playRound(store, [
      ['p1', 0, 0],
      ['p2', 0, 0],
    ])
    // Manche 2, 2 cartes.
    store = atResults(store, [
      ['p1', 0],
      ['p2', 0],
    ])
    expect(store.draft?.tricks[GREY_BEARD]).toBe(2)
    store = run(store, { type: 'game/setTricks', playerId: 'p1', tricks: 1 })
    expect(store.draft?.tricks[GREY_BEARD]).toBe(1)
    expect(store.draft?.autoTricks).toBe(GREY_BEARD)
  })

  it('rend la déduction au second joueur quand on le reprend en main', () => {
    let store = twoPlayers()
    store = playRound(store, [
      ['p1', 0, 0],
      ['p2', 0, 0],
    ])
    store = atResults(store, [
      ['p1', 0],
      ['p2', 0],
    ])
    store = run(
      store,
      { type: 'game/setTricks', playerId: GREY_BEARD, tricks: 0 },
      { type: 'game/setTricks', playerId: 'p1', tricks: 1 },
    )
    expect(store.draft?.autoTricks).toBe('p2')
    expect(store.draft?.tricks.p2).toBe(1)
  })

  it('ne prend pas de plis à trois joueurs', () => {
    const store = run(started(), { type: 'game/setTricks', playerId: GREY_BEARD, tricks: 1 })
    expect(store.draft?.tricks[GREY_BEARD]).toBeUndefined()
  })

  it('se recalcule quand un pli est écarté par un monstre marin', () => {
    let store = twoPlayers({ kraken: true })
    store = playRound(store, [
      ['p1', 0, 0],
      ['p2', 0, 0],
    ])
    store = playRound(store, [
      ['p1', 0, 0],
      ['p2', 0, 0],
    ])
    // Manche 3, 3 cartes : rien aux joueurs, tout au fantôme.
    store = atResults(store, [
      ['p1', 0],
      ['p2', 0],
    ])
    expect(store.draft?.tricks[GREY_BEARD]).toBe(3)
    store = run(store, { type: 'game/setVoided', voided: 1 })
    expect(store.draft?.tricks[GREY_BEARD]).toBe(2)
  })

  it('n écrit ses plis dans la manche que s il en a pris', () => {
    let store = twoPlayers()
    // Manche 1, 1 carte, prise par p1 : le fantôme repart à zéro.
    store = playRound(store, [
      ['p1', 1, 1],
      ['p2', 0, 0],
    ])
    expect(store.games[0].rounds[0].greyBeard).toBeUndefined()
    // Manche 2, 2 cartes, une seule prise par p1.
    store = playRound(store, [
      ['p1', 1, 1],
      ['p2', 0, 0],
    ])
    expect(store.games[0].rounds[1].greyBeard).toBe(1)
  })

  it('revient tel quel quand on rouvre la manche pour la corriger', () => {
    let store = twoPlayers()
    store = playRound(store, [
      ['p1', 0, 0],
      ['p2', 0, 0],
    ])
    store = run(store, { type: 'game/editRound', index: 1 })
    expect(store.draft?.tricks[GREY_BEARD]).toBe(1)
    // Une manche validée a été saisie en entier : le fantôme est touché, sinon
    // la rouvrir pour relire un chiffre la réécrirait.
    expect(store.draft?.touchedTricks).toContain(GREY_BEARD)
    expect(store.draft?.autoTricks).toBeNull()
  })

  it('survit à la relecture d une saisie en cours', () => {
    let store = twoPlayers()
    store = playRound(store, [
      ['p1', 0, 0],
      ['p2', 0, 0],
    ])
    store = atResults(store, [
      ['p1', 0],
      ['p2', 0],
    ])
    store = run(store, { type: 'game/setTricks', playerId: GREY_BEARD, tricks: 1 })
    const reread = normalise(JSON.parse(serialiseStore(store)))
    expect(reread.draft?.tricks[GREY_BEARD]).toBe(1)
    expect(reread.draft?.touchedTricks).toContain(GREY_BEARD)
  })

  it('vaut zéro et non « à renseigner » sur une saisie écrite avant lui', () => {
    const store = normalise({
      schemaVersion: 1,
      players: [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Bo' }],
      games: [{ id: 'g', playerIds: ['p1', 'p2'], options: {}, rounds: [] }],
      draft: { gameId: 'g', roundIndex: 1, phase: 'results', tricks: { p1: 1, p2: 0 } },
    })
    expect(store.draft?.tricks[GREY_BEARD]).toBe(0)
  })

  it('ne peut pas s asseoir à la table par un fichier bricolé', () => {
    const store = normalise({
      schemaVersion: 1,
      players: [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Bo' }],
      games: [{ id: 'g', playerIds: ['p1', 'p2', GREY_BEARD], options: {}, rounds: [] }],
    })
    expect(store.games[0].playerIds).toEqual(['p1', 'p2'])
  })

  it('reste hors du score, du classement et des noms', () => {
    let store = twoPlayers()
    store = playRound(store, [
      ['p1', 0, 0],
      ['p2', 0, 0],
    ])
    const game = store.games[0]
    expect(game.playerIds).toEqual(['p1', 'p2'])
    expect(Object.keys(game.nameSnapshot)).toEqual(['p1', 'p2'])
    expect(game.rounds[0].entries.map((entry) => entry.playerId)).toEqual(['p1', 'p2'])
  })

  it('traverse l aller-retour export/import', () => {
    let store = twoPlayers()
    store = playRound(store, [
      ['p1', 0, 0],
      ['p2', 0, 0],
    ])
    expect(parseStore(serialiseStore(store)).store).toEqual(store)
  })

  it('laisse une partie à deux d avant lui compter exactement pareil', () => {
    // Décision assumée : le fantôme est d'office à 2, mais une partie
    // enregistrée sans lui garde ses plis et ses totaux au bit près.
    const store = normalise({
      schemaVersion: 1,
      players: [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Bo' }],
      games: [
        {
          id: 'g',
          playerIds: ['p1', 'p2'],
          options: {},
          rounds: [
            {
              index: 1,
              cards: 1,
              entries: [
                { playerId: 'p1', bid: 1, tricks: 1, bonus: {} },
                { playerId: 'p2', bid: 0, tricks: 0, bonus: {} },
              ],
            },
          ],
        },
      ],
    })
    expect(store.games[0].rounds[0].greyBeard).toBeUndefined()
    expect(store.games[0].rounds[0].entries[0].tricks).toBe(1)
  })
})

describe('Boulet de canon', () => {
  const rascalTable = (options = {}) =>
    run(seeded(), {
      type: 'game/start',
      playerIds: ['p1', 'p2', 'p3'],
      options: { ...DEFAULT_OPTIONS, rascalScoring: true, cannonball: true, ...options },
      id: 'g3',
      now: '2026-01-01T20:00:00.000Z',
    })

  it('se charge et se décharge', () => {
    let store = run(rascalTable(), {
      type: 'game/setCannonball',
      playerId: 'p1',
      loaded: true,
    })
    expect(store.draft?.cannonball.p1).toBe(true)
    store = run(store, { type: 'game/setCannonball', playerId: 'p1', loaded: false })
    expect(store.draft?.cannonball.p1).toBe(false)
  })

  it('est refusé tant que le barème Rascal n est pas en jeu', () => {
    const store = run(rascalTable({ rascalScoring: false }), {
      type: 'game/setCannonball',
      playerId: 'p1',
      loaded: true,
    })
    expect(store.draft?.cannonball.p1).toBe(false)
  })

  it('est refusé quand la table ne l a pas ouvert', () => {
    const store = run(rascalTable({ cannonball: false }), {
      type: 'game/setCannonball',
      playerId: 'p1',
      loaded: true,
    })
    expect(store.draft?.cannonball.p1).toBe(false)
  })

  it('ne s écrit dans la manche que lorsqu il est chargé', () => {
    let store = run(rascalTable(), {
      type: 'game/setCannonball',
      playerId: 'p1',
      loaded: true,
    })
    store = playRound(store, [
      ['p1', 1, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    const entries = store.games[0].rounds[0].entries
    expect(entries[0].cannonball).toBe(true)
    expect(entries[1].cannonball).toBeUndefined()
  })

  it('revient quand on rouvre la manche pour la corriger', () => {
    let store = run(rascalTable(), {
      type: 'game/setCannonball',
      playerId: 'p1',
      loaded: true,
    })
    store = playRound(store, [
      ['p1', 1, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    store = run(store, { type: 'game/editRound', index: 1 })
    expect(store.draft?.cannonball.p1).toBe(true)
    expect(store.draft?.cannonball.p2).toBe(false)
  })

  it('traverse l aller-retour export/import', () => {
    let store = run(rascalTable(), {
      type: 'game/setCannonball',
      playerId: 'p1',
      loaded: true,
    })
    store = playRound(store, [
      ['p1', 1, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    expect(parseStore(serialiseStore(store)).store).toEqual(store)
  })
})

describe('format de partie', () => {
  /** Une table à trois, au format demandé. */
  const table = (format: { rounds: number; firstRoundCards: number }) =>
    run(seeded(), {
      type: 'game/start',
      playerIds: ['p1', 'p2', 'p3'],
      options: { ...DEFAULT_OPTIONS },
      format,
      id: 'g1',
      now: '2026-01-01T20:00:00.000Z',
    })

  it('part du livret quand personne ne demande rien', () => {
    expect(started().games[0].format).toEqual(DEFAULT_FORMAT)
  })

  it('fige le format demandé sur la partie', () => {
    const store = table({ rounds: 6, firstRoundCards: 3 })
    expect(store.games[0].format).toEqual({ rounds: 6, firstRoundCards: 3 })
  })

  it('le retient comme réglage des prochaines parties', () => {
    const store = table({ rounds: 6, firstRoundCards: 3 })
    expect(store.settings.defaultFormat).toEqual({ rounds: 6, firstRoundCards: 3 })
  })

  it('ramène un format hors bornes plutôt que de le refuser', () => {
    const store = table({ rounds: 99, firstRoundCards: 0 })
    expect(store.games[0].format).toEqual({ rounds: MAX_ROUNDS, firstRoundCards: MIN_FIRST_CARDS })
  })

  it('distribue la première manche selon le format', () => {
    let store = table({ rounds: 3, firstRoundCards: 4 })
    store = playRound(store, [
      ['p1', 4, 4],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    expect(store.games[0].rounds[0].cards).toBe(4)
    // La manche suivante monte d'une carte, comme au format du livret.
    expect(draftFor(store, runningGame(store)!).roundIndex).toBe(2)
    store = playRound(store, [
      ['p1', 5, 5],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    expect(store.games[0].rounds[1].cards).toBe(5)
  })

  it('ferme le brouillon à la dernière manche du format, pas à la dixième', () => {
    let store = table({ rounds: 2, firstRoundCards: 1 })
    store = playRound(store, [
      ['p1', 1, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    expect(store.draft).toBeDefined()
    store = playRound(store, [
      ['p1', 2, 2],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    expect(store.draft).toBeUndefined()
  })

  it('rejoue la revanche au même format', () => {
    let store = table({ rounds: 4, firstRoundCards: 2 })
    store = run(store, { type: 'game/finish', now: '2026-01-01T21:00:00.000Z' })
    store = run(store, { type: 'game/rematch', id: 'g2', now: '2026-01-01T21:05:00.000Z' })
    expect(runningGame(store)?.format).toEqual({ rounds: 4, firstRoundCards: 2 })
  })

  it('relit une partie d avant le format réglable au format du livret', () => {
    const store = normalise({
      schemaVersion: 1,
      players: [{ id: 'p1', name: 'Ana' }],
      games: [{ id: 'g', playerIds: ['p1', 'p2'], options: {}, rounds: [] }],
    })
    expect(store.games[0].format).toEqual(DEFAULT_FORMAT)
  })

  it('jette les manches qui débordent du format de leur partie', () => {
    const store = normalise({
      schemaVersion: 1,
      players: [],
      games: [
        {
          id: 'g',
          playerIds: ['p1', 'p2'],
          options: {},
          format: { rounds: 3, firstRoundCards: 1 },
          rounds: [
            { index: 3, cards: 3, entries: [] },
            { index: 4, cards: 4, entries: [] },
          ],
        },
      ],
    })
    expect(store.games[0].rounds.map((round) => round.index)).toEqual([3])
  })

  it('traverse l aller-retour export/import', () => {
    const store = table({ rounds: 6, firstRoundCards: 3 })
    expect(parseStore(serialiseStore(store)).store).toEqual(store)
  })
})

describe('les deux monstres marins', () => {
  const table = (options: Partial<typeof DEFAULT_OPTIONS>) =>
    run(seeded(), {
      type: 'game/start',
      playerIds: ['p1', 'p2', 'p3'],
      options: { ...DEFAULT_OPTIONS, ...options },
      id: 'g1',
      now: '2026-01-01T20:00:00.000Z',
    })

  it('rend une partie d avant la coupe aux deux clés', () => {
    // `seaMonsters` nommait les deux : la partie les a joués tous les deux.
    const store = normalise({
      schemaVersion: 1,
      players: [],
      games: [
        { id: 'g', playerIds: ['p1', 'p2'], options: { seaMonsters: true }, rounds: [] },
      ],
    })
    expect(store.games[0].options.kraken).toBe(true)
    expect(store.games[0].options.whiteWhale).toBe(true)
  })

  it('ouvre le compteur de plis écartés dès qu un des deux est au paquet', () => {
    for (const options of [{ kraken: true }, { whiteWhale: true }]) {
      const store = run(table(options), { type: 'game/setVoided', voided: 1 })
      expect(store.draft?.voided).toBe(1)
    }
  })

  it('le ferme quand aucun des deux n est au paquet', () => {
    const store = run(table({}), { type: 'game/setVoided', voided: 1 })
    expect(store.draft?.voided).toBe(0)
  })
})

describe('Harry le Géant', () => {
  const pirates = () =>
    run(seeded(), {
      type: 'game/start',
      playerIds: ['p1', 'p2', 'p3'],
      options: { ...DEFAULT_OPTIONS, advancedPirates: true },
      id: 'g1',
      now: '2026-01-01T20:00:00.000Z',
    })

  it('se pose depuis les résultats, sans revenir aux mises', () => {
    const store = run(
      pirates(),
      { type: 'game/setBid', playerId: 'p1', bid: 1 },
      { type: 'game/phase', phase: 'results' },
      { type: 'game/setHarry', playerId: 'p1', step: 1 },
    )
    expect(store.draft?.phase).toBe('results')
    // La mise annoncée ne bouge pas : c'est le pas qui porte le déplacement.
    expect(store.draft?.bids.p1).toBe(1)
    expect(store.draft?.harry.p1).toBe(1)
  })

  it('reste fermé sans les pouvoirs des pirates', () => {
    const store = run(started(), { type: 'game/setHarry', playerId: 'p1', step: 1 })
    expect(store.draft?.harry.p1).toBe(0)
  })

  it('refuse un pas de plus d un pli', () => {
    const store = run(pirates(), { type: 'game/setHarry', playerId: 'p1', step: 2 })
    expect(store.draft?.harry.p1).toBe(0)
  })

  it('n écrit le pas dans la manche que si quelqu un l a joué', () => {
    let store = run(pirates(), { type: 'game/setHarry', playerId: 'p1', step: -1 })
    store = playRound(store, [
      ['p1', 1, 0],
      ['p2', 0, 0],
      ['p3', 0, 1],
    ])
    const entries = store.games[0].rounds[0].entries
    expect(entries[0].harry).toBe(-1)
    expect(entries[1].harry).toBeUndefined()
  })

  it('revient quand on rouvre la manche pour la corriger', () => {
    let store = run(pirates(), { type: 'game/setHarry', playerId: 'p1', step: 1 })
    store = playRound(store, [
      ['p1', 0, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    store = run(store, { type: 'game/editRound', index: 1 })
    expect(store.draft?.harry.p1).toBe(1)
    expect(store.draft?.harry.p2).toBe(0)
  })

  it('traverse l aller-retour export/import', () => {
    let store = run(pirates(), { type: 'game/setHarry', playerId: 'p1', step: 1 })
    store = playRound(store, [
      ['p1', 0, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    expect(parseStore(serialiseStore(store)).store).toEqual(store)
  })
})

describe('les plis partent de la mise', () => {
  it('sème chaque tuile sur la mise de son joueur en entrant aux résultats', () => {
    // Personne n'a été repris en main : la valeur la plus probable est la mise,
    // et une manche où tout le monde la tient se valide sans un geste.
    let store = started()
    store = playRound(store, [
      ['p1', 1, 1],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    store = playRound(store, [
      ['p1', 2, 2],
      ['p2', 0, 0],
      ['p3', 0, 0],
    ])
    // Manche 3, 3 cartes : 2 pour p1, 1 pour p2, rien pour p3.
    store = run(
      store,
      { type: 'game/setBid', playerId: 'p1', bid: 2 },
      { type: 'game/setBid', playerId: 'p2', bid: 1 },
      { type: 'game/setBid', playerId: 'p3', bid: 0 },
      { type: 'game/phase', phase: 'results' },
    )
    expect(store.draft?.tricks).toMatchObject({ p1: 2, p2: 1, p3: 0 })
    expect(store.draft?.autoTricks).toBeNull()
  })

  it('resème après une correction de mise', () => {
    const store = run(
      started(),
      { type: 'game/setBid', playerId: 'p1', bid: 1 },
      { type: 'game/phase', phase: 'results' },
      { type: 'game/phase', phase: 'bids' },
      { type: 'game/setBid', playerId: 'p1', bid: 0 },
      { type: 'game/setBid', playerId: 'p2', bid: 1 },
      { type: 'game/phase', phase: 'results' },
    )
    expect(store.draft?.tricks).toMatchObject({ p1: 0, p2: 1, p3: 0 })
  })

  it('sème la mise déplacée par Harry, pas celle qu on avait annoncée', () => {
    const store = run(
      run(seeded(), {
        type: 'game/start',
        playerIds: ['p1', 'p2', 'p3'],
        options: { ...DEFAULT_OPTIONS, advancedPirates: true },
        id: 'g1',
        now: '2026-01-01T20:00:00.000Z',
      }),
      { type: 'game/setBid', playerId: 'p1', bid: 1 },
      { type: 'game/phase', phase: 'results' },
      { type: 'game/setHarry', playerId: 'p1', step: -1 },
      // Un aller-retour par les mises : les tuiles non reprises en main se
      // resèment, et p1 repart de sa mise déplacée.
      { type: 'game/phase', phase: 'bids' },
      { type: 'game/phase', phase: 'results' },
    )
    expect(store.draft?.tricks.p1).toBe(0)
  })
})

/*
 * Deux « Marie » à la même table seraient indiscernables partout : l'app écrit
 * les noms en entier précisément pour ne jamais avoir à les distinguer
 * autrement. L'écran de nouvelle partie le vérifiait seul ; la liste des
 * joueurs et le renommage, non.
 */
describe('noms uniques', () => {
  it('reconnaît un doublon à la casse et aux espaces près', () => {
    const players = seeded().players
    expect(nameTaken(players, 'ana')).toBe(true)
    expect(nameTaken(players, '  Ana  ')).toBe(true)
    expect(nameTaken(players, 'Dee')).toBe(false)
  })

  it('laisse un joueur garder son propre nom', () => {
    // Sans quoi corriger une majuscule serait impossible.
    expect(nameTaken(seeded().players, 'Ana', 'p1')).toBe(false)
  })

  it('refuse un ajout en double', () => {
    const store = run(seeded(), { type: 'players/add', name: 'ANA', id: 'p9' })
    expect(store.players).toHaveLength(3)
  })

  it('refuse un renommage vers un nom déjà pris', () => {
    const store = run(seeded(), { type: 'players/rename', id: 'p1', name: 'Bo' })
    expect(store.players[0].name).toBe('Ana')
  })

  it('accepte un renommage qui ne change que la casse', () => {
    const store = run(seeded(), { type: 'players/rename', id: 'p1', name: 'ANA' })
    expect(store.players[0].name).toBe('ANA')
  })
})

describe('suppression d un joueur', () => {
  it('se rejoue à sa place dans la liste', () => {
    const store = seeded()
    const player = store.players[1]
    const removed = run(store, { type: 'players/remove', id: 'p2' })
    expect(removed.players.map((entry) => entry.name)).toEqual(['Ana', 'Cy'])

    const restored = run(removed, { type: 'players/restore', player, at: 1 })
    expect(restored.players.map((entry) => entry.name)).toEqual(['Ana', 'Bo', 'Cy'])
  })

  it('ne rejoue pas un joueur déjà présent', () => {
    const store = seeded()
    const again = run(store, { type: 'players/restore', player: store.players[0], at: 0 })
    expect(again.players).toHaveLength(3)
  })
})

/*
 * « Annuler » après une correction.
 *
 * Le bandeau appelait `undoRound`, qui retire la *dernière* manche validée :
 * corriger la manche 1 d'une partie de trois et toucher « Annuler » effaçait
 * la manche 3, gardait la correction, et emportait la saisie mise de côté.
 * L'écran choisit désormais son annulation, et `replaceRound` est celle d'une
 * correction.
 */
describe('annulation d une correction', () => {
  const threeRounds = (): Store => {
    let store = started()
    for (const round of [1, 2, 3]) {
      store = playRound(store, [
        ['p1', 0, round === 1 ? 1 : 0],
        ['p2', 0, 0],
        ['p3', 0, round === 1 ? 0 : round === 2 ? 1 : 0],
      ])
    }
    return store
  }

  it('repose la manche corrigée sans toucher aux autres', () => {
    const store = threeRounds()
    const before = runningGame(store)!.rounds.find((round) => round.index === 1)!

    const corrected = run(
      store,
      { type: 'game/editRound', index: 1 },
      { type: 'game/setTricks', playerId: 'p1', tricks: 0 },
      { type: 'game/setTricks', playerId: 'p2', tricks: 1 },
      { type: 'game/commitRound' },
    )
    expect(runningGame(corrected)!.rounds).toHaveLength(3)
    const changed = runningGame(corrected)!.rounds.find((round) => round.index === 1)!
    expect(changed.entries.find((entry) => entry.playerId === 'p2')?.tricks).toBe(1)

    const undone = run(corrected, { type: 'game/replaceRound', round: before })
    expect(runningGame(undone)!.rounds).toHaveLength(3)
    expect(runningGame(undone)!.rounds.find((round) => round.index === 1)).toEqual(before)
    // Et surtout : les manches 2 et 3 n'ont pas bougé d'une ligne.
    expect(runningGame(undone)!.rounds.map((round) => round.index)).toEqual([1, 2, 3])
  })

  it('rend la main à la manche en cours après une correction validée', () => {
    const store = threeRounds()
    const corrected = run(
      store,
      { type: 'game/editRound', index: 1 },
      { type: 'game/commitRound' },
    )
    expect(corrected.draft?.roundIndex).toBe(4)
    expect(corrected.liveDraft).toBeUndefined()
  })
})
