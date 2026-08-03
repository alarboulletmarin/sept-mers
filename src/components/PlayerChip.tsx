import styles from './PlayerChip.module.css'

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
