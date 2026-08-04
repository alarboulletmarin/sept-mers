import { newId } from '../store/storage.ts'
import type { WireMessage } from './protocol.ts'
import type { Transport } from './transport.ts'

/**
 * Le transport local : un `BroadcastChannel` par salle, entre les onglets d'un
 * même navigateur. C'est lui qui porte les tests et les parcours Playwright —
 * le fil complet du partage s'y rejoue sans qu'une seule requête sorte — et il
 * mime la seule chose que WebRTC promet ici : des messages, et qui va, qui
 * vient.
 */
interface Envelope {
  from: string
  to?: string
  type: 'hello' | 'welcome' | 'leave' | 'data'
  data?: WireMessage
}

export function createLoopbackTransport(code: string): Transport {
  const channel = new BroadcastChannel(`sept-mers-room-${code}`)
  const self = newId()
  const peers = new Set<string>()
  const messageCbs = new Set<(raw: unknown, peerId: string) => void>()
  const joinCbs = new Set<(peerId: string) => void>()
  const leaveCbs = new Set<(peerId: string) => void>()
  let closed = false

  const post = (envelope: Envelope): void => {
    if (closed) return
    channel.postMessage(envelope)
  }

  const greet = (peerId: string): void => {
    if (peers.has(peerId)) return
    peers.add(peerId)
    for (const cb of joinCbs) cb(peerId)
  }

  channel.onmessage = (event: MessageEvent) => {
    const envelope = event.data as Envelope
    if (!envelope || typeof envelope.from !== 'string' || envelope.from === self) return
    if (envelope.to && envelope.to !== self) return
    switch (envelope.type) {
      case 'hello':
        // Un arrivant se présente à la salle : on lui répond en ciblé, c'est
        // ainsi qu'il apprend qui était déjà là.
        greet(envelope.from)
        post({ from: self, to: envelope.from, type: 'welcome' })
        break
      case 'welcome':
        greet(envelope.from)
        break
      case 'leave':
        if (peers.delete(envelope.from)) {
          for (const cb of leaveCbs) cb(envelope.from)
        }
        break
      case 'data':
        for (const cb of messageCbs) cb(envelope.data, envelope.from)
        break
    }
  }

  post({ from: self, type: 'hello' })

  return {
    send: (message) => post({ from: self, type: 'data', data: message }),
    sendTo: (peerId, message) => post({ from: self, to: peerId, type: 'data', data: message }),
    onMessage: (cb) => {
      messageCbs.add(cb)
      return () => {
        messageCbs.delete(cb)
      }
    },
    onPeerJoin: (cb) => {
      joinCbs.add(cb)
      return () => {
        joinCbs.delete(cb)
      }
    },
    onPeerLeave: (cb) => {
      leaveCbs.add(cb)
      return () => {
        leaveCbs.delete(cb)
      }
    },
    close: () => {
      if (closed) return
      post({ from: self, type: 'leave' })
      closed = true
      channel.close()
    },
  }
}
