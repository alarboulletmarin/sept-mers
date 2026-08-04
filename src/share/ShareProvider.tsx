import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useStore } from '../app/StoreProvider.tsx'
import type { Store } from '../domain/types.ts'
import { gameById, runningGame } from '../store/reducer.ts'
import { newRoomCode } from './code.ts'
import type { SpectatorPayload } from './protocol.ts'
import {
  clearShareSession,
  loadShareSession,
  saveShareSession,
  startHostSession,
  type HostSession,
} from './session.ts'

export type ShareStatus = 'off' | 'starting' | 'on' | 'error'

export interface ShareApi {
  status: ShareStatus
  /** Le code de la salle, dès qu'on tente de l'ouvrir. */
  code: string | null
  /** Téléphones qui suivent. */
  peers: number
  /** Nommé quand `status` vaut `error` : le blocage se dit, il ne se grise pas. */
  reason: 'offline' | 'failed' | null
  start(gameId: string): void
  stop(): void
}

const ShareContext = createContext<ShareApi | null>(null)

export function useShare(): ShareApi {
  const context = useContext(ShareContext)
  if (!context) throw new Error('useShare hors de ShareProvider')
  return context
}

/** Au-delà, les relais ne répondront plus : on le dit plutôt que d'attendre. */
const START_TIMEOUT = 12_000

const buildPayload = (store: Store, gameId: string): SpectatorPayload | null => {
  const game = gameById(store, gameId)
  if (!game) return null
  const draft = store.draft?.gameId === gameId ? store.draft : undefined
  return draft ? { game, draft } : { game }
}

/**
 * La session de partage du téléphone de la table, au-dessus des écrans : elle
 * survit à la navigation Game → résumé → accueil. Elle épingle la partie au
 * démarrage, rediffuse à chaque changement du store, continue après la fin de
 * partie — les spectateurs voient le résultat — et prend congé quand la partie
 * disparaît. Un rechargement accidentel ne tue pas la salle : code et partie
 * sont retenus sous une clé à part et repris au lancement.
 */
export function ShareProvider({ children }: { children: ReactNode }) {
  const { store } = useStore()
  const [status, setStatus] = useState<ShareStatus>('off')
  const [code, setCode] = useState<string | null>(null)
  const [peers, setPeers] = useState(0)
  const [reason, setReason] = useState<'offline' | 'failed' | null>(null)

  const sessionRef = useRef<HostSession | null>(null)
  const gameIdRef = useRef<string | null>(null)
  // Chaque tentative invalide la précédente : un démarrage qui aboutit après
  // un arrêt ou un nouveau départ se referme au lieu de ressusciter.
  const attemptRef = useRef(0)
  const storeRef = useRef(store)
  storeRef.current = store

  const startWith = useCallback(async (roomCode: string, gameId: string) => {
    const attempt = ++attemptRef.current
    setStatus('starting')
    setReason(null)
    setCode(roomCode)
    try {
      const session = await new Promise<HostSession>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), START_TIMEOUT)
        startHostSession(roomCode).then(
          (opened) => {
            clearTimeout(timer)
            if (attemptRef.current === attempt) resolve(opened)
            // Trop tard : quelqu'un a arrêté ou relancé entre-temps.
            else opened.close(false)
          },
          (error: unknown) => {
            clearTimeout(timer)
            reject(error instanceof Error ? error : new Error('échec'))
          },
        )
      })
      sessionRef.current = session
      gameIdRef.current = gameId
      saveShareSession(roomCode, gameId)
      session.onPeersChange(setPeers)
      setPeers(session.peerCount())
      const payload = buildPayload(storeRef.current, gameId)
      if (payload) session.broadcast(payload)
      setStatus('on')
    } catch {
      if (attemptRef.current !== attempt) return
      setStatus('error')
      setReason('failed')
    }
  }, [])

  const start = useCallback(
    (gameId: string) => {
      if (sessionRef.current || status === 'starting') return
      // Le direct a besoin d'internet pour trouver les autres téléphones : en
      // mode avion, le blocage se nomme au lieu d'échouer en silence.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setStatus('error')
        setReason('offline')
        return
      }
      void startWith(newRoomCode(), gameId)
    },
    [startWith, status],
  )

  const stop = useCallback(() => {
    attemptRef.current += 1
    sessionRef.current?.close(true)
    sessionRef.current = null
    gameIdRef.current = null
    clearShareSession()
    setStatus('off')
    setCode(null)
    setPeers(0)
    setReason(null)
  }, [])

  // Rediffusion : chaque changement du store pendant que la salle est ouverte.
  useEffect(() => {
    if (status !== 'on') return
    const session = sessionRef.current
    const gameId = gameIdRef.current
    if (!session || !gameId) return
    const payload = buildPayload(store, gameId)
    // La partie a disparu — abandon, suppression : on prend congé.
    if (!payload) stop()
    else session.broadcast(payload)
  }, [store, status, stop])

  // Reprise après rechargement : la salle revit si la partie court toujours.
  // Sauf en arrivant sur un écran de lecture — /watch, /recap : ce
  // chargement-là vient suivre une table, pas en tenir une, et rouvrir une
  // salle en douce sous un écran de spectateur serait une surprise.
  useEffect(() => {
    if (typeof location !== 'undefined' && /^\/(watch|recap)(\/|$)/.test(location.pathname)) return
    const saved = loadShareSession()
    if (!saved) return
    if (runningGame(storeRef.current)?.id === saved.gameId) {
      void startWith(saved.code, saved.gameId)
    } else {
      clearShareSession()
    }
  }, [startWith])

  // À la fermeture de l'app, on ferme le fil sans effacer la reprise : c'est
  // ce qui distingue un rechargement d'un arrêt voulu.
  useEffect(() => {
    return () => {
      attemptRef.current += 1
      sessionRef.current?.close(false)
      sessionRef.current = null
    }
  }, [])

  const api = useMemo<ShareApi>(
    () => ({ status, code, peers, reason, start, stop }),
    [status, code, peers, reason, start, stop],
  )

  return <ShareContext.Provider value={api}>{children}</ShareContext.Provider>
}
