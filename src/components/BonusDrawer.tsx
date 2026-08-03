import { Icon } from './Icon.tsx'
import {
  bonusCeiling,
  type BonusMap,
  type TrickMap,
} from '../domain/validation.ts'
import { BONUS_KEYS, type Id, type RoundBonus } from '../domain/types.ts'
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
 * Cinq compteurs à pas unitaire, chacun avec son libellé complet.
 * Un compteur qui atteint sa borne se désactive en disant pourquoi.
 */
export function BonusDrawer({
  playerId,
  playerIds,
  bonuses,
  tricks,
  onChange,
}: BonusDrawerProps) {
  const { t } = useT()
  const bonus = bonuses[playerId]

  return (
    <div className={styles.list}>
      {BONUS_KEYS.map((key) => {
        const value = bonus[key]
        const ceiling = bonusCeiling(key, playerId, bonuses, tricks, playerIds)
        const atCeiling = value >= ceiling.max
        const label = t(`bonus.${key}`)

        return (
          <div key={key} className={styles.counter}>
            <div className={styles.text}>
              <span className={styles.name}>{label}</span>
              <span className={styles.help}>{t(`bonus.${key}.help`)}</span>
              {atCeiling && (
                <span className={styles.help}>
                  {t(`issue.ceiling.${ceiling.reason ?? 'null'}`)}
                </span>
              )}
            </div>

            <div className={styles.stepper}>
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
                <Icon name="plus" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
