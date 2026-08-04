import { describe, expect, it } from 'vitest'
import { reducer, type Action } from '../store/reducer.ts'
import { emptyStore } from '../store/storage.ts'
import { DEFAULT_OPTIONS, GREY_BEARD, type Store } from '../domain/types.ts'
import {
  byeMessage,
  parseSpectatorPayload,
  parseWireMessage,
  stateMessage,
  type SpectatorPayload,
} from './protocol.ts'

const run = (store: Store, ...actions: Action[]): Store =>
  actions.reduce((current, action) => reducer(current, action), store)

/** Une partie lancée par le réducteur : exactement ce que le MJ diffuse. */
function started(playerIds = ['p1', 'p2', 'p3']): Store {
  return run(
    emptyStore(),
    ...playerIds.map(
      (id): Action => ({ type: 'players/add', name: id.toUpperCase(), id, now: '2026-01-01T00:00:00.000Z' }),
    ),
    {
      type: 'game/start',
      playerIds,
      options: { ...DEFAULT_OPTIONS },
      id: 'g1',
      now: '2026-01-01T20:00:00.000Z',
    },
  )
}

function payloadOf(store: Store): SpectatorPayload {
  const game = store.games[0]
  return store.draft ? { game, draft: store.draft } : { game }
}

describe('messages du fil', () => {
  it('rend l état tel quel après un aller-retour', () => {
    const store = run(started(), { type: 'game/setBid', playerId: 'p1', bid: 1 })
    const parsed = parseWireMessage(stateMessage(payloadOf(store)))
    expect(parsed).not.toBeNull()
    if (parsed?.kind !== 'state') throw new Error('état attendu')
    expect(parsed.payload.game.id).toBe('g1')
    expect(parsed.payload.game.nameSnapshot.p1).toBe('P1')
    expect(parsed.payload.draft?.bids.p1).toBe(1)
  })

  it('relit le message d adieu', () => {
    expect(parseWireMessage(byeMessage())).toEqual({ kind: 'bye' })
  })

  it('signale une version plus récente au lieu d afficher n importe quoi', () => {
    expect(parseWireMessage({ v: 2, kind: 'state', game: {} })).toEqual({ kind: 'newer' })
    expect(parseWireMessage({ v: 2, kind: 'trucInconnu' })).toEqual({ kind: 'newer' })
  })

  it('refuse ce qui n est pas un message', () => {
    expect(parseWireMessage(null)).toBeNull()
    expect(parseWireMessage(42)).toBeNull()
    expect(parseWireMessage([])).toBeNull()
    expect(parseWireMessage({})).toBeNull()
    expect(parseWireMessage({ v: 'un', kind: 'bye' })).toBeNull()
    expect(parseWireMessage({ v: 0, kind: 'bye' })).toBeNull()
    expect(parseWireMessage({ v: 1, kind: 'autre' })).toBeNull()
  })

  it('refuse un état sans partie recevable', () => {
    expect(parseWireMessage({ v: 1, kind: 'state', game: 'rien' })).toBeNull()
    expect(parseWireMessage({ v: 1, kind: 'state', game: { id: 'g1' } })).toBeNull()
  })
})

describe('durcissement de l état reçu', () => {
  it('refuse une table hors bornes', () => {
    const game = started().games[0]
    expect(parseSpectatorPayload({ ...game, playerIds: ['p1'] })).toBeNull()
    const nine = Array.from({ length: 9 }, (_, seat) => `p${seat + 1}`)
    expect(parseSpectatorPayload({ ...game, playerIds: nine })).toBeNull()
  })

  it('refuse la sentinelle du fantôme assise à la table', () => {
    const game = started().games[0]
    // La liste blanche la retire, et la table tombe sous deux joueurs.
    expect(parseSpectatorPayload({ ...game, playerIds: ['p1', GREY_BEARD] })).toBeNull()
  })

  it('écarte la saisie d une partie terminée', () => {
    const store = started()
    const finished = run(store, { type: 'game/finish', now: '2026-01-01T21:00:00.000Z' })
    const payload = parseSpectatorPayload(finished.games[0], store.draft)
    expect(payload).not.toBeNull()
    expect(payload?.draft).toBeUndefined()
  })

  it('écarte une saisie dont la manche sort de la partie', () => {
    const store = started()
    const payload = parseSpectatorPayload(store.games[0], { ...store.draft, roundIndex: 99 })
    expect(payload).not.toBeNull()
    expect(payload?.draft).toBeUndefined()
  })

  it('garde les plis du fantôme à deux joueurs', () => {
    const store = run(
      started(['p1', 'p2']),
      { type: 'game/setBid', playerId: 'p1', bid: 0 },
      { type: 'game/setBid', playerId: 'p2', bid: 0 },
      { type: 'game/phase', phase: 'results' },
      { type: 'game/setTricks', playerId: GREY_BEARD, tricks: 1 },
    )
    const payload = parseSpectatorPayload(store.games[0], store.draft)
    expect(payload?.draft?.tricks[GREY_BEARD]).toBe(1)
  })
})
