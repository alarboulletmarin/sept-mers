import styles from './NumberPicker.module.css'

/** Retour haptique léger, quand l'appareil le propose. */
function tick(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(8)
    } catch {
      // Certains navigateurs exposent l'API sans l'autoriser : sans importance.
    }
  }
}

/**
 * Découpe la rangée en lignes égales.
 *
 * On cherche le nombre de colonnes qui remplit le mieux la largeur sans
 * laisser d'orphelin : 11 valeurs tiennent en 6 + 5 plutôt qu'en 6 + 4 + 1.
 */
export function columnsFor(count: number): number {
  if (count <= 6) return count
  const rows = Math.ceil(count / 6)
  return Math.ceil(count / rows)
}

interface NumberPickerProps {
  /** Valeur haute incluse. La grille va de 0 à `max`. */
  max: number
  value: number | null
  onChange: (value: number) => void
  /** Décrit ce qu'on choisit, pour les lecteurs d'écran. */
  label: string
  /** Construit le libellé de chaque pastille pour les lecteurs d'écran. */
  optionLabel?: (value: number) => string
  compact?: boolean
  disabled?: boolean
}

export function NumberPicker({
  max,
  value,
  onChange,
  label,
  optionLabel,
  compact = false,
  disabled = false,
}: NumberPickerProps) {
  const values = Array.from({ length: max + 1 }, (_, index) => index)

  return (
    <div
      className={`${styles.grid} ${compact ? styles.compact : ''}`}
      role="radiogroup"
      aria-label={label}
      style={{ ['--picker-columns' as string]: columnsFor(values.length) }}
    >
      {values.map((option) => {
        const selected = option === value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={optionLabel ? optionLabel(option) : String(option)}
            disabled={disabled}
            className={`${styles.pill} ${selected ? styles.selected : ''}`}
            onClick={() => {
              tick()
              onChange(option)
            }}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
