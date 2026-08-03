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

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Le fond ne défile pas pendant qu'on lit la feuille.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheetRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
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
          <h2 id={titleId} className={`${styles.title} t-section`}>
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
