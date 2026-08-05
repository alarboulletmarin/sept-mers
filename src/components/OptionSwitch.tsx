import type { GameOptions } from '../domain/types.ts'
import styles from './OptionSwitch.module.css'

/**
 * Les règles qui se choisissent avant de distribuer, dans l'ordre où on les
 * lit. Les libellés vivent sous `newGame.<clé>` et `newGame.<clé>.on|off`, et
 * les variantes sont expliquées au chapitre « Les variantes » des règles.
 *
 * Deux d'entre elles n'ont de sens que sous condition : le Boulet de canon
 * suppose le Score Rascal, et les primes d'une mise ratée n'ont plus d'objet
 * sous lui, puisque le barème les met déjà à l'échelle. On les masque plutôt
 * que de les griser — une bascule sans effet est pire qu'une bascule absente.
 *
 * Le Kraken et la Baleine blanche sont deux cartes, donc deux bascules : elles
 * ne font pas la même chose au pli, et une table qui n'en glisse qu'une au
 * paquet doit compter 71 cartes, pas 72.
 */
export const OPTIONS: {
  key: keyof GameOptions
  showIf?: (options: GameOptions) => boolean
}[] = [
  { key: 'bonusIfBidMissed', showIf: (options) => !options.rascalScoring },
  { key: 'kraken' },
  { key: 'whiteWhale' },
  { key: 'advancedPirates' },
  { key: 'rascalScoring' },
  { key: 'cannonball', showIf: (options) => options.rascalScoring },
]

/** Les options à montrer pour un réglage donné. */
export function visibleOptions(options: GameOptions) {
  return OPTIONS.filter(({ showIf }) => !showIf || showIf(options))
}

/**
 * Les règles réellement en jeu, dans l'ordre de la liste.
 *
 * Elles se choisissent au lancement puis disparaissent : au milieu d'une
 * partie, plus rien ne disait qu'on comptait au Score Rascal ou que le Kraken
 * était au paquet, alors que c'est ce qui explique un chiffre surprenant. La
 * même liste sert donc à les régler et à les rappeler.
 */
export function activeOptions(options: GameOptions): (keyof GameOptions)[] {
  return visibleOptions(options)
    .map(({ key }) => key)
    .filter((key) => options[key])
}

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
