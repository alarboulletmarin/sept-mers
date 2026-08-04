import type { DataPayload } from 'trystero'
import type { Transport } from './transport.ts'

/**
 * Le transport réel : WebRTC de téléphone à téléphone, et pour se trouver, le
 * signaling de Trystero sur des relais Nostr publics — chiffré avec le code de
 * table, qui passe en `password`. Les relais ne voient jamais l'état de la
 * partie : lui ne circule que sur les canaux de données, entre les pairs.
 *
 * C'est le seul fichier du code qui nomme la librairie, et elle n'y entre que
 * par un `import()` : le bundle d'entrée n'en contient pas une ligne, ce que
 * le parcours `scripts/share.mjs` vérifie sur le build.
 */

/** Sous les 12 s au bout desquels la session déclare l'ouverture manquée. */
const RELAY_WAIT = 8_000
const RELAY_POLL = 300

/**
 * Attend qu'au moins un relais réponde. `joinRoom` rend la salle sans
 * attendre ses connexions : sans cette garde, un Wi-Fi captif sans internet
 * afficherait un code de table que personne ne pourrait jamais rejoindre —
 * « salle ouverte » doit vouloir dire trouvable.
 */
const waitForRelay = (sockets: () => Record<string, WebSocket>): Promise<void> =>
  new Promise((resolve, reject) => {
    const started = Date.now()
    const probe = (): void => {
      const open = Object.values(sockets()).some(
        (socket) => socket.readyState === WebSocket.OPEN,
      )
      if (open) return resolve()
      if (Date.now() - started >= RELAY_WAIT) return reject(new Error('aucun relais joignable'))
      setTimeout(probe, RELAY_POLL)
    }
    probe()
  })

export async function createTrysteroTransport(code: string): Promise<Transport> {
  const { joinRoom, getRelaySockets } = await import('trystero')
  const room = joinRoom({ appId: 'sept-mers', password: code }, `sept-mers-${code}`)

  try {
    // La librairie type `getRelaySockets` en `any` : on fixe ici la forme
    // réelle, une table d'URL vers leur socket.
    await waitForRelay(getRelaySockets as () => Record<string, WebSocket>)
  } catch (error) {
    void room.leave().catch(() => {})
    throw error
  }

  const messageCbs = new Set<(raw: unknown, peerId: string) => void>()
  const joinCbs = new Set<(peerId: string) => void>()
  const leaveCbs = new Set<(peerId: string) => void>()

  const action = room.makeAction('state')
  action.onMessage = (data, context) => {
    for (const cb of messageCbs) cb(data, context.peerId)
  }
  room.onPeerJoin = (peerId) => {
    for (const cb of joinCbs) cb(peerId)
  }
  room.onPeerLeave = (peerId) => {
    for (const cb of leaveCbs) cb(peerId)
  }

  // Un message est du JSON de bout en bout. L'envoi peut échouer quand un
  // pair vient de partir : on laisse faire, le prochain état le rattrape.
  const quietly = (sending: Promise<void>): void => {
    void sending.catch(() => {})
  }

  return {
    send: (message) => quietly(action.send(message as DataPayload)),
    sendTo: (peerId, message) => quietly(action.send(message as DataPayload, { target: peerId })),
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
      void room.leave().catch(() => {})
    },
  }
}
