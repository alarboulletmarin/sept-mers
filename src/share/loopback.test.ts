import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLoopbackTransport } from './loopback.ts'
import { byeMessage } from './protocol.ts'
import type { Transport } from './transport.ts'

const open: Transport[] = []

const openTransport = (code: string): Transport => {
  const transport = createLoopbackTransport(code)
  open.push(transport)
  return transport
}

afterEach(() => {
  for (const transport of open.splice(0)) transport.close()
})

describe('transport local', () => {
  it('présente les deux bouts l un à l autre, quel que soit l ordre', async () => {
    const seenByA: string[] = []
    const seenByB: string[] = []
    const a = openTransport('AB2C3D')
    a.onPeerJoin((peerId) => seenByA.push(peerId))
    const b = openTransport('AB2C3D')
    b.onPeerJoin((peerId) => seenByB.push(peerId))

    await vi.waitFor(() => {
      expect(seenByA).toHaveLength(1)
      expect(seenByB).toHaveLength(1)
    })
  })

  it('diffuse à toute la salle, ou cible un seul pair', async () => {
    const a = openTransport('AB2C3D')
    const joined: string[] = []
    a.onPeerJoin((peerId) => joined.push(peerId))

    const b = openTransport('AB2C3D')
    const heardByB: string[] = []
    b.onMessage((_, peerId) => heardByB.push(peerId))
    await vi.waitFor(() => expect(joined).toHaveLength(1))
    const bId = joined[0]

    const c = openTransport('AB2C3D')
    const heardByC: string[] = []
    c.onMessage((_, peerId) => heardByC.push(peerId))
    await vi.waitFor(() => expect(joined).toHaveLength(2))

    a.send(byeMessage())
    await vi.waitFor(() => {
      expect(heardByB).toHaveLength(1)
      expect(heardByC).toHaveLength(1)
    })

    a.sendTo(bId, byeMessage())
    await vi.waitFor(() => expect(heardByB).toHaveLength(2))
    expect(heardByC).toHaveLength(1)
  })

  it('rend le message tel qu il est parti', async () => {
    const a = openTransport('AB2C3D')
    const b = openTransport('AB2C3D')
    const received: unknown[] = []
    b.onMessage((raw) => received.push(raw))

    a.send(byeMessage())
    await vi.waitFor(() => expect(received).toHaveLength(1))
    expect(received[0]).toEqual(byeMessage())
  })

  it('cloisonne les salles : un autre code n entend rien', async () => {
    const a = openTransport('AB2C3D')
    const elsewhere = openTransport('ZZZZZZ')
    const joined: string[] = []
    const heard: unknown[] = []
    elsewhere.onPeerJoin((peerId) => joined.push(peerId))
    elsewhere.onMessage((raw) => heard.push(raw))

    const b = openTransport('AB2C3D')
    const seenByB: string[] = []
    b.onPeerJoin((peerId) => seenByB.push(peerId))
    await vi.waitFor(() => expect(seenByB).toHaveLength(1))

    a.send(byeMessage())
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(joined).toHaveLength(0)
    expect(heard).toHaveLength(0)
  })

  it('prévient la salle quand un bout se ferme', async () => {
    const a = openTransport('AB2C3D')
    const left: string[] = []
    a.onPeerLeave((peerId) => left.push(peerId))

    const b = openTransport('AB2C3D')
    const seenByB: string[] = []
    b.onPeerJoin((peerId) => seenByB.push(peerId))
    await vi.waitFor(() => expect(seenByB).toHaveLength(1))

    b.close()
    await vi.waitFor(() => expect(left).toHaveLength(1))
  })

  it('se désabonne sans fermer le fil', async () => {
    const a = openTransport('AB2C3D')
    const b = openTransport('AB2C3D')
    const heard: unknown[] = []
    const stop = b.onMessage((raw) => heard.push(raw))

    a.send(byeMessage())
    await vi.waitFor(() => expect(heard).toHaveLength(1))

    stop()
    a.send(byeMessage())
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(heard).toHaveLength(1)
  })
})
