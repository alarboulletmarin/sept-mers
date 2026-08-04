import { byeMessage, stateMessage, type SpectatorPayload } from './protocol.ts'
import { createTransport } from './transport.ts'

/**
 * La session côté table : le téléphone qui saisit tient la salle, rediffuse
 * l'état à chaque changement, et le tend d'office à chaque arrivant. Un seul
 * écrivain, des lecteurs : pas de fusion, pas de conflit — le dernier état
 * envoyé est la vérité.
 */
export interface HostSession {
  readonly code: string
  /** Debouncée au rythme de l'écriture disque : une rafale de taps, un envoi. */
  broadcast(payload: SpectatorPayload): void
  peerCount(): number
  onPeersChange(cb: (count: number) => void): () => void
  /** `sendBye` dit aux spectateurs que c'est fini, plutôt que de disparaître. */
  close(sendBye?: boolean): void
}

const BROADCAST_DELAY = 300

export async function startHostSession(code: string): Promise<HostSession> {
  const transport = await createTransport(code)
  const peers = new Set<string>()
  const peersCbs = new Set<(count: number) => void>()
  let last: SpectatorPayload | null = null
  let pending: ReturnType<typeof setTimeout> | null = null
  let queued: SpectatorPayload | null = null

  const notify = (): void => {
    for (const cb of peersCbs) cb(peers.size)
  }

  transport.onPeerJoin((peerId) => {
    peers.add(peerId)
    notify()
    // L'arrivant reçoit l'état tout de suite, sans attendre le prochain tap.
    if (last) transport.sendTo(peerId, stateMessage(last))
  })
  transport.onPeerLeave((peerId) => {
    if (peers.delete(peerId)) notify()
  })

  return {
    code,
    broadcast: (payload) => {
      // `last` se met à jour sans attendre : un arrivant pendant le debounce
      // reçoit déjà l'état le plus frais.
      last = payload
      queued = payload
      if (pending) clearTimeout(pending)
      pending = setTimeout(() => {
        pending = null
        if (queued) transport.send(stateMessage(queued))
        queued = null
      }, BROADCAST_DELAY)
    },
    peerCount: () => peers.size,
    onPeersChange: (cb) => {
      peersCbs.add(cb)
      return () => {
        peersCbs.delete(cb)
      }
    },
    close: (sendBye = true) => {
      if (pending) {
        clearTimeout(pending)
        pending = null
      }
      queued = null
      if (sendBye) transport.send(byeMessage())
      transport.close()
    },
  }
}

// -------------------------------------------------------------- persistance

/**
 * La session survit à un rechargement accidentel du téléphone de la table :
 * code et partie sous une clé à part — jamais dans le fichier de données, un
 * code de salle éphémère n'a rien à faire dans un export.
 */
export const SHARE_KEY = 'sept-mers:share'

export interface SavedShareSession {
  code: string
  gameId: string
}

export function saveShareSession(code: string, gameId: string): void {
  try {
    localStorage.setItem(SHARE_KEY, JSON.stringify({ code, gameId }))
  } catch {
    // Stockage refusé : la salle ne survivra pas à un rechargement, c'est tout.
  }
}

export function loadShareSession(): SavedShareSession | null {
  try {
    const text = localStorage.getItem(SHARE_KEY)
    if (!text) return null
    const raw: unknown = JSON.parse(text)
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
    const source = raw as Record<string, unknown>
    if (typeof source.code !== 'string' || typeof source.gameId !== 'string') return null
    return { code: source.code, gameId: source.gameId }
  } catch {
    return null
  }
}

export function clearShareSession(): void {
  try {
    localStorage.removeItem(SHARE_KEY)
  } catch {
    // rien à faire de plus
  }
}
