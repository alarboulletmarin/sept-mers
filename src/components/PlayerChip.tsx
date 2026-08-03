import styles from './PlayerChip.module.css'

/**
 * Huit teintes attribuées dans l'ordre d'ajout à la table, identiques dans les
 * deux thèmes. Elles ne servent plus qu'à distinguer les séries d'un graphique,
 * où chaque courbe porte aussi son nom : la couleur ne dit jamais qui est qui.
 */
export function playerColor(seat: number): string {
  return `var(--player-${(seat % 8) + 1})`
}

interface PlayerChipProps {
  name: string
  selected: boolean
  onToggle: () => void
}

export function PlayerChip({ name, selected, onToggle }: PlayerChipProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      className={`${styles.chip} ${selected ? styles.selected : ''}`}
      onClick={onToggle}
    >
      <span className={styles.name}>{name}</span>
    </button>
  )
}

export function ChipGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid}>{children}</div>
}
