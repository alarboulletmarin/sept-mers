import type { WireMessage } from './protocol.ts'

/**
 * Le fil entre le téléphone de la table et ceux qui la suivent, réduit à ce
 * que la session en attend : diffuser, cibler, écouter, savoir qui entre et
 * qui sort. Deux implémentations — WebRTC par Trystero pour de vrai, et un
 * `BroadcastChannel` local pour les tests et les parcours navigateur, qui ne
 * doivent jamais toucher un relais public.
 */
export interface Transport {
  send(message: WireMessage): void
  sendTo(peerId: string, message: WireMessage): void
  onMessage(cb: (raw: unknown, peerId: string) => void): () => void
  onPeerJoin(cb: (peerId: string) => void): () => void
  onPeerLeave(cb: (peerId: string) => void): () => void
  close(): void
}

/**
 * La clé locale qui force le transport local. Les parcours Playwright la
 * posent avant le premier chargement, et elle colle aux navigations, ce
 * qu'un paramètre d'adresse ne ferait pas. Au pire, un curieux qui la pose à
 * la main dégrade son propre partage au même appareil — rien à protéger.
 */
export const LOOPBACK_FLAG = 'sept-mers:transport'
export const LOOPBACK_VALUE = 'loopback'

const loopbackForced = (): boolean => {
  try {
    return (
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(LOOPBACK_FLAG) === LOOPBACK_VALUE
    )
  } catch {
    return false
  }
}

/**
 * Les implémentations arrivent en `import()` : celle de Trystero pèse son
 * poids et ne sert qu'au partage — le cœur hors ligne de l'app n'en charge
 * pas une ligne tant qu'on ne partage rien.
 */
export async function createTransport(code: string): Promise<Transport> {
  if (loopbackForced()) {
    const { createLoopbackTransport } = await import('./loopback.ts')
    return createLoopbackTransport(code)
  }
  const { createTrysteroTransport } = await import('./trystero.ts')
  return createTrysteroTransport(code)
}
