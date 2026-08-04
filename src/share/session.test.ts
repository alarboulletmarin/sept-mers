import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_FORMAT, GREY_BEARD, type Game } from '../domain/types.ts'
import { createLoopbackTransport } from './loopback.ts'
import { parseWireMessage, type SpectatorPayload } from './protocol.ts'
import {
  SHARE_KEY,
  clearShareSession,
  loadShareSession,
  saveShareSession,
  startHostSession,
  type HostSession,
} from './session.ts'
import { LOOPBACK_FLAG, LOOPBACK_VALUE, type Transport } from './transport.ts'

/**
 * Node n'a pas de `localStorage` : on en pose un minimal, avec le drapeau qui
 * force le transport local — exactement ce que font les parcours Playwright.
 */
const storage = new Map<string, string>()

beforeEach(() => {
  storage.clear()
  storage.set(LOOPBACK_FLAG, LOOPBACK_VALUE)
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
  }
})

const open: { close: () => void }[] = []

afterEach(() => {
  for (const closable of open.splice(0)) closable.close()
  delete (globalThis as { localStorage?: unknown }).localStorage
})

function makeGame(): Game {
  return {
    id: 'g1',
    startedAt: '2026-02-03T20:00:00.000Z',
    playerIds: ['p1', 'p2'],
    options: {
      bonusIfBidMissed: false,
      kraken: false,
      whiteWhale: false,
      advancedPirates: false,
      rascalScoring: false,
      cannonball: false,
    },
    format: { ...DEFAULT_FORMAT },
    rounds: [],
    nameSnapshot: { p1: 'Ana', p2: 'Bo' },
  }
}

const payloadWithBid = (bid: number): SpectatorPayload => ({
  game: makeGame(),
  draft: {
    gameId: 'g1',
    roundIndex: 1,
    phase: 'bids',
    bids: { p1: bid, p2: null },
    tricks: { p1: null, p2: null, [GREY_BEARD]: 0 },
    bonus: {},
    rascal: {},
    harry: {},
    cannonball: {},
    voided: 0,
    touchedTricks: [],
    autoTricks: null,
  },
})

const openHost = async (code: string): Promise<HostSession> => {
  const host = await startHostSession(code)
  open.push({ close: () => host.close(false) })
  return host
}

const openGuest = (code: string): { transport: Transport; received: unknown[] } => {
  const transport = createLoopbackTransport(code)
  open.push(transport)
  const received: unknown[] = []
  transport.onMessage((raw) => received.push(raw))
  return { transport, received }
}

describe('session de la table', () => {
  it('diffuse en différé : une rafale de saisies, un seul envoi', async () => {
    const host = await openHost('AB2C3D')
    const guest = openGuest('AB2C3D')
    await vi.waitFor(() => expect(host.peerCount()).toBe(1))

    host.broadcast(payloadWithBid(1))
    host.broadcast(payloadWithBid(2))
    host.broadcast(payloadWithBid(3))

    await vi.waitFor(() => expect(guest.received).toHaveLength(1), { timeout: 2000 })
    // On laisse le fil retomber : rien d'autre ne doit arriver.
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(guest.received).toHaveLength(1)

    const message = parseWireMessage(guest.received[0])
    if (message?.kind !== 'state') throw new Error('état attendu')
    expect(message.payload.draft?.bids.p1).toBe(3)
  })

  it('tend l état d office à l arrivant, sans attendre un tap', async () => {
    const host = await openHost('AB2C3D')
    host.broadcast(payloadWithBid(2))
    await new Promise((resolve) => setTimeout(resolve, 400))

    const late = openGuest('AB2C3D')
    await vi.waitFor(() => expect(late.received).toHaveLength(1), { timeout: 2000 })
    const message = parseWireMessage(late.received[0])
    if (message?.kind !== 'state') throw new Error('état attendu')
    expect(message.payload.draft?.bids.p1).toBe(2)
  })

  it('compte les téléphones qui suivent, entrées et sorties', async () => {
    const host = await openHost('AB2C3D')
    const counts: number[] = []
    host.onPeersChange((count) => counts.push(count))

    const guest = openGuest('AB2C3D')
    await vi.waitFor(() => expect(host.peerCount()).toBe(1))
    guest.transport.close()
    await vi.waitFor(() => expect(host.peerCount()).toBe(0))
    expect(counts).toEqual([1, 0])
  })

  it('prend congé en fermant : les spectateurs savent que c est fini', async () => {
    const host = await openHost('AB2C3D')
    const guest = openGuest('AB2C3D')
    await vi.waitFor(() => expect(host.peerCount()).toBe(1))

    host.close(true)
    await vi.waitFor(() => {
      expect(guest.received.map((raw) => parseWireMessage(raw)?.kind)).toContain('bye')
    })
  })
})

describe('persistance de la session', () => {
  it('retient code et partie, et les relit', () => {
    saveShareSession('AB2C3D', 'g1')
    expect(loadShareSession()).toEqual({ code: 'AB2C3D', gameId: 'g1' })
    clearShareSession()
    expect(loadShareSession()).toBeNull()
  })

  it('rend null sur un contenu abîmé plutôt que de planter', () => {
    storage.set(SHARE_KEY, 'pas du json')
    expect(loadShareSession()).toBeNull()
    storage.set(SHARE_KEY, JSON.stringify({ code: 42 }))
    expect(loadShareSession()).toBeNull()
    storage.set(SHARE_KEY, JSON.stringify([1, 2]))
    expect(loadShareSession()).toBeNull()
  })
})
