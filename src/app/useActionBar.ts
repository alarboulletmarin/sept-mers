import { useEffect, useRef, type RefObject } from 'react'

/**
 * Publie la hauteur de la barre d'action basse dans `--actionbar-h`, pour que
 * le bandeau d'annulation se pose au-dessus plutôt que par-dessus le bouton.
 * Sans ça, un bandeau qui dure cinq secondes intercepte le tap suivant.
 */
export function useActionBarHeight<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const node = ref.current
    const root = document.documentElement
    if (!node) return

    const publish = () => root.style.setProperty('--actionbar-h', `${node.offsetHeight}px`)
    publish()

    const observer = new ResizeObserver(publish)
    observer.observe(node)
    return () => {
      observer.disconnect()
      // Retour au repli du jeton : la marge de sécurité basse.
      root.style.removeProperty('--actionbar-h')
    }
  }, [])

  return ref
}
