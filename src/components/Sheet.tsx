import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import { useT } from '../i18n/index.ts'
import styles from './Sheet.module.css'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Feuille modale montant du bas, fermable au glissé et au bouton. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const { t } = useT()
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState(0)
  const startY = useRef<number | null>(null)

  /** Ce qu'on peut atteindre au clavier dans la feuille, dans l'ordre du DOM. */
  const focusables = (): HTMLElement[] => {
    const root = sheetRef.current
    if (!root) return []
    return [
      ...root.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ]
  }

  useEffect(() => {
    if (!open) return

    /*
     * Le focus reste dans la feuille tant qu'elle est ouverte, et revient d'où
     * il venait quand elle se ferme.
     *
     * Sans ça, la tabulation sortait derrière le voile : on continuait à
     * parcourir l'écran caché, dont les commandes restaient actives, sans
     * qu'aucun repère visible ne suive. Une feuille modale qui laisse filer le
     * focus n'est modale que pour la souris.
     */
    const restoreTo = document.activeElement as HTMLElement | null

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') return onClose()
      if (event.key !== 'Tab') return
      const stops = focusables()
      if (stops.length === 0) return
      const first = stops[0]
      const last = stops[stops.length - 1]
      const active = document.activeElement
      // Le bord franchi ramène à l'autre bout : la boucle est le piège.
      if (event.shiftKey && (active === first || active === sheetRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    // Le fond ne défile pas pendant qu'on lit la feuille.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheetRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      // Le bouton qui a ouvert la feuille reprend le focus : sans ça, il
      // repart au début du document et on a perdu sa place.
      if (restoreTo && document.contains(restoreTo)) restoreTo.focus()
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) setDrag(0)
  }, [open])

  if (!open) return null

  const endDrag = () => {
    startY.current = null
    // Au-delà d'un quart de course, le geste vaut fermeture.
    if (drag > 120) onClose()
    else setDrag(0)
  }

  return (
    <div
      className={styles.scrim}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={drag > 0 ? { transform: `translateY(${drag}px)` } : undefined}
      >
        <div
          className={styles.grabber}
          onPointerDown={(event) => {
            startY.current = event.clientY
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            if (startY.current === null) return
            setDrag(Math.max(0, event.clientY - startY.current))
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label={t('nav.close')}>
            <Icon name="close" size={24} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
