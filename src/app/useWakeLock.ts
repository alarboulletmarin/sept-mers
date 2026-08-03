import { useEffect } from 'react'

interface WakeLockSentinelLike {
  release: () => Promise<void>
  released: boolean
}

interface WakeLockLike {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>
}

/**
 * Maintient l'écran allumé pendant la partie. Le verrou tombe quand l'onglet
 * passe en arrière-plan : on le reprend au retour, et on le relâche en sortie.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const api = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock
    if (!api) return

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      try {
        sentinel = await api.request('screen')
      } catch {
        // Batterie faible, ou refus du navigateur : la partie continue.
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release().catch(() => undefined)
    }
  }, [active])
}
