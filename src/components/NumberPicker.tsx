import { useEffect, useRef } from 'react'
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

interface NumberPickerProps {
  /** Valeur haute incluse. La rangée va de 0 à `max`. */
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
  const rowRef = useRef<HTMLDivElement>(null)
  const values = Array.from({ length: max + 1 }, (_, index) => index)

  // Une valeur choisie hors du champ visible doit se montrer d'elle-même,
  // sinon on croit que rien n'a été saisi.
  useEffect(() => {
    if (value === null) return
    const row = rowRef.current
    const selected = row?.querySelector<HTMLElement>('[data-selected="true"]')
    if (!row || !selected) return
    const overflowsLeft = selected.offsetLeft < row.scrollLeft
    const overflowsRight =
      selected.offsetLeft + selected.offsetWidth > row.scrollLeft + row.clientWidth
    if (overflowsLeft || overflowsRight) {
      row.scrollTo({
        left: selected.offsetLeft - row.clientWidth / 2 + selected.offsetWidth / 2,
        behavior: 'auto',
      })
    }
  }, [value])

  return (
    <div
      ref={rowRef}
      className={`${styles.row} ${compact ? styles.compact : ''}`}
      role="radiogroup"
      aria-label={label}
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
            data-selected={selected}
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
