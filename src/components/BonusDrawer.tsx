import { Icon } from './Icon.tsx'
import {
  bonusCeiling,
  type BonusMap,
  type TrickMap,
} from '../domain/validation.ts'
import { BONUS_KEYS, BONUS_VALUES, type Id, type RoundBonus } from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import styles from './BonusDrawer.module.css'

interface BonusDrawerProps {
  playerId: Id
  playerIds: Id[]
  bonuses: BonusMap
  tricks: TrickMap
  onChange: (key: keyof RoundBonus, value: number) => void
}

/**
 * Les motifs de plafond sont des codes d'anomalie — `bonus.mermaidBudget` — et
 * la phrase courte qui va avec vit sous `issue.ceiling.mermaidBudget`. Sans
 * cette coupe, la clé n'existait pas et l'app affichait son propre identifiant
 * au milieu de la feuille.
 */
function ceilingKey(reason: string | null): string {
  return reason === null ? 'null' : reason.replace(/^bonus\./, '')
}

/**
 * Cinq compteurs à pas unitaire.
 *
 * Le parti : cinq lignes, pas cinq cartes. Chaque bonus tenait dans un bloc
 * gris avec son titre, deux lignes d'aide et parfois un motif de plafond — la
 * feuille débordait avant même la troisième ligne, et il fallait la faire
 * défiler pour attribuer une sirène. Ici la ligne dit trois choses : ce que
 * c'est, ce que ça vaut, combien on en a. Le reste est en sourdine, sur une
 * ligne, et le total en tête suit les points au fur et à mesure.
 */
export function BonusDrawer({
  playerId,
  playerIds,
  bonuses,
  tricks,
  onChange,
}: BonusDrawerProps) {
  const { t, signed } = useT()
  const bonus = bonuses[playerId]

  const total = BONUS_KEYS.reduce((sum, key) => sum + BONUS_VALUES[key] * bonus[key], 0)
  const count = BONUS_KEYS.reduce((sum, key) => sum + bonus[key], 0)

  return (
    <div className={styles.drawer}>
      {/* Le suivi de points, en tête : on voit ce qu'on est en train
          d'ajouter sans refermer la feuille. */}
      <p className={styles.total}>
        <span className={styles.totalFigure}>{signed(total)}</span>
        <span className={styles.totalLabel}>
          {count === 0 ? t('bonus.none') : t('bonus.count', { count })}
        </span>
      </p>

      <ul className={styles.list}>
        {BONUS_KEYS.map((key) => {
          const value = bonus[key]
          const ceiling = bonusCeiling(key, playerId, bonuses, tricks, playerIds)
          const atCeiling = value >= ceiling.max
          const label = t(`bonus.${key}`)

          return (
            <li key={key} className={`${styles.row} ${value > 0 ? styles.set : ''}`}>
              <span className={styles.text}>
                <span className={styles.name}>{label}</span>
                <span className={styles.help}>
                  {atCeiling && ceiling.reason
                    ? t(`issue.ceiling.${ceilingKey(ceiling.reason)}`)
                    : t(`bonus.${key}.help`)}
                </span>
              </span>

              {/* Ce que la carte vaut, séparé de l'aide : c'est le chiffre
                  qu'on cherche, il ne doit pas être noyé dans une phrase. */}
              <span className={styles.worth}>{signed(BONUS_VALUES[key])}</span>

              <span className={styles.stepper}>
                <button
                  type="button"
                  className={styles.step}
                  aria-label={t('bonus.decrease', { label })}
                  disabled={value <= 0}
                  onClick={() => onChange(key, value - 1)}
                >
                  <span className={styles.minus} aria-hidden="true" />
                </button>
                <span className={styles.value} aria-live="off">
                  {value}
                </span>
                <button
                  type="button"
                  className={styles.step}
                  aria-label={t('bonus.increase', { label })}
                  disabled={atCeiling}
                  onClick={() => onChange(key, value + 1)}
                >
                  <Icon name="plus" size={18} />
                </button>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
