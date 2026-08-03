import styles from './PlayerChip.module.css'

/** Première lettre, en capitale, pour la pastille d'initiale. */
export function initialOf(name: string): string {
  return [...name.trim()].slice(0, 1).join('').toUpperCase() || '?'
}

/**
 * Huit teintes attribuées dans l'ordre d'ajout à la table, identiques dans les
 * deux thèmes. Elles n'apparaissent que sur la pastille et dans les graphiques,
 * et ne portent jamais seules une information.
 */
export function playerColor(seat: number): string {
  return `var(--player-${(seat % 8) + 1})`
}

export function Initial({
  name,
  seat,
  large = false,
}: {
  name: string
  seat: number
  large?: boolean
}) {
  return (
    <span
      className={`initial ${large ? 'initial-lg' : ''}`}
      style={{ ['--player-color' as string]: playerColor(seat) }}
      aria-hidden="true"
    >
      {initialOf(name)}
    </span>
  )
}

interface PlayerChipProps {
  name: string
  seat: number
  selected: boolean
  onToggle: () => void
}

export function PlayerChip({ name, seat, selected, onToggle }: PlayerChipProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      className={`${styles.chip} ${selected ? styles.selected : ''}`}
      onClick={onToggle}
    >
      <Initial name={name} seat={seat} />
      <span className={styles.name}>{name}</span>
    </button>
  )
}

export function ChipGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid}>{children}</div>
}
