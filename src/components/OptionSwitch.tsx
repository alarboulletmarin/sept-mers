import type { GameOptions } from '../domain/types.ts'
import styles from './OptionSwitch.module.css'

/**
 * Les règles qui se choisissent avant de distribuer, dans l'ordre où on les
 * lit. Les libellés vivent sous `newGame.<clé>` et `newGame.<clé>.on|off`, et
 * les variantes sont expliquées au chapitre « Les variantes » des règles.
 */
export const OPTIONS: { key: keyof GameOptions }[] = [
  { key: 'bonusIfBidMissed' },
  { key: 'seaMonsters' },
  { key: 'advancedPirates' },
]

interface OptionSwitchProps {
  label: string
  /** La phrase qui dit ce que l'état choisi change dans la partie. */
  help: string
  checked: boolean
  onToggle: () => void
}

/**
 * Une option de partie : son nom, son effet en une phrase, sa bascule.
 *
 * Elle vivait deux fois, en littéral, dans l'écran de nouvelle partie et dans
 * les réglages. Avec trois options au lieu d'une, les deux copies auraient
 * divergé avant la fin de la semaine.
 */
export function OptionSwitch({ label, help, checked, onToggle }: OptionSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`switch ${styles.option}`}
      onClick={onToggle}
    >
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        <span className={styles.help}>{help}</span>
      </span>
      <span className="switch-track">
        <span className="switch-knob" />
      </span>
    </button>
  )
}
