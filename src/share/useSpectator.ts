import { useEffect, useState } from 'react'
import { parseWireMessage, type SpectatorPayload } from './protocol.ts'
import { createTransport, type Transport } from './transport.ts'

/**
 * Les cinq états d'un téléphone qui suit la table, et rien de plus fin : on
 * cherche la table, on la suit, on l'a perdue, elle a fermé, ou elle parle une
 * version de l'app plus récente que la nôtre.
 */
export type WatchState = 'connecting' | 'live' | 'lost' | 'ended' | 'newer'

/**
 * Le côté spectateur du partage. Il rejoint la salle, garde le dernier état
 * sain reçu, et dit où en est le fil. Il ne touche jamais au `Store` du
 * téléphone qui regarde : ce qui est reçu vit ici, et meurt en quittant
 * l'écran.
 */
export function useSpectator(code: string): {
  state: WatchState
  payload: SpectatorPayload | null
} {
  const [state, setState] = useState<WatchState>('connecting')
  const [payload, setPayload] = useState<SpectatorPayload | null>(null)

  useEffect(() => {
    let alive = true
    let transport: Transport | null = null
    // Le premier état reçu désigne le téléphone de la table : c'est son départ
    // qui vaut « perdu », pas celui d'un autre spectateur.
    let hostId: string | null = null
    setState('connecting')
    setPayload(null)

    void createTransport(code).then((created) => {
      if (!alive) {
        created.close()
        return
      }
      transport = created
      created.onMessage((raw, peerId) => {
        const message = parseWireMessage(raw)
        if (!message) return
        if (message.kind === 'newer') {
          setState('newer')
          return
        }
        if (message.kind === 'bye') {
          if (!hostId || peerId === hostId) setState('ended')
          return
        }
        hostId = peerId
        setPayload(message.payload)
        setState('live')
      })
      created.onPeerLeave((peerId) => {
        if (peerId !== hostId) return
        // Une salle fermée reste fermée : le départ qui suit l'adieu ne la
        // rouvre pas en « perdu ».
        setState((current) => (current === 'ended' ? current : 'lost'))
      })
    })

    return () => {
      alive = false
      transport?.close()
    }
  }, [code])

  return { state, payload }
}
