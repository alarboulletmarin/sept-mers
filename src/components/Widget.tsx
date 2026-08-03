import type { ReactNode } from 'react'
import styles from './Widget.module.css'

/** Les quatre surfaces du design system. Elles découpent, elles n'informent pas. */
export type Surface = 'ink' | 'foam' | 'sand' | 'tide'
export type Span = 'sm' | 'md' | 'lg'

interface WidgetProps {
  surface?: Surface
  span?: Span
  /** Resserre le rembourrage : pour les tuiles de saisie, nombreuses. */
  tight?: boolean
  className?: string
  children: ReactNode
  /** Rend le widget entier cliquable. */
  onClick?: () => void
  /** Attribut de repérage, utilisé par les parcours de test. */
  marker?: string
}

export function Widget({
  surface = 'foam',
  span = 'sm',
  tight = false,
  className,
  children,
  onClick,
  marker,
}: WidgetProps) {
  const classes = [
    styles.widget,
    styles[surface],
    styles[span],
    tight ? styles.tight : '',
    onClick ? styles.pressable : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const marked = marker ? { [`data-${marker}`]: '' } : {}

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} {...marked}>
        {children}
      </button>
    )
  }
  return (
    <section className={classes} {...marked}>
      {children}
    </section>
  )
}

/** Étiquette en pastille : la signature visuelle de la mosaïque. */
export function Tag({ children }: { children: ReactNode }) {
  return <span className={styles.tag}>{children}</span>
}

export function TagRow({ children }: { children: ReactNode }) {
  return <div className={styles.tagRow}>{children}</div>
}

export function Figure({ children, hero = false }: { children: ReactNode; hero?: boolean }) {
  return <span className={hero ? styles.hero : styles.figure}>{children}</span>
}

export function Caption({ children }: { children: ReactNode }) {
  return <span className={styles.caption}>{children}</span>
}

export function WidgetTitle({ children }: { children: ReactNode }) {
  return <span className={styles.title}>{children}</span>
}

export function CornerButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className={styles.corner} aria-label={label} onClick={onClick}>
      {children}
    </button>
  )
}
