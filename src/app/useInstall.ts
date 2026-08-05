import { useEffect, useState } from 'react'

/**
 * L'événement que Chrome et ses cousins émettent quand l'app est installable.
 * Il n'est pas dans la bibliothèque de types du DOM : on le décrit ici, au
 * plus près de ce qu'on en utilise.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState =
  /** Déjà installée : l'app tourne dans sa propre fenêtre. */
  | 'installed'
  /** Le navigateur propose l'installation, et nous a confié son invite. */
  | 'ready'
  /** Safari n'a pas d'invite : l'installation existe, mais il faut la décrire. */
  | 'manual'
  /** Rien à proposer ici — un navigateur de bureau sans installation. */
  | 'none'

/** Vrai quand la page tourne déjà comme une app installée. */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true
}

/** Vrai sur iPhone et iPad, où l'installation passe par le menu de partage. */
function isApple(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS 13 et suivants se présentent en Macintosh : l'écran tactile tranche.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/**
 * L'installation, pour une app qui n'a de sens qu'installée.
 *
 * Hors ligne d'abord, sans compte, posée au milieu d'une table : dans un
 * onglet, elle se perd au premier ménage de navigateur. Le navigateur, lui, ne
 * propose rien de visible — il émet un événement qu'il faut attraper et
 * garder, sans quoi l'invite n'existe jamais.
 *
 * Trois cas et non deux : Safari n'émet pas cet événement et n'a pas d'invite
 * du tout. Là, la seule chose honnête est d'écrire le geste — Partager, puis
 * « Sur l'écran d'accueil ». Une app qui se tait sur iOS est une app qu'on
 * n'installe jamais.
 */
export function useInstall(): { state: InstallState; install: () => void } {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // On empêche l'invite spontanée pour la rejouer à l'endroit choisi :
      // au milieu d'une manche, une boîte de dialogue est une agression.
      event.preventDefault()
      setPrompt(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const state: InstallState = installed
    ? 'installed'
    : prompt
      ? 'ready'
      : isApple()
        ? 'manual'
        : 'none'

  return {
    state,
    install: () => {
      if (!prompt) return
      void prompt.prompt().then(
        () => {
          // Refusée, l'invite ne se rejoue pas : le navigateur en réémettra
          // une plus tard s'il le juge bon.
          setPrompt(null)
        },
        () => setPrompt(null),
      )
    },
  }
}
