import { useId } from 'react'
import { bonusTotals } from '../domain/stats.ts'
import { BONUS_KEYS, type Game } from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import { shorten } from './labels.ts'
import { Patterns, fillProps, swatchStyle } from './Patterns.tsx'
import { plotArea, scale } from './primitives.ts'
import styles from './chart.module.css'

const BOX = { width: 320, height: 190, top: 10, right: 8, bottom: 26, left: 24 }

/** Un remplissage par type de bonus, du plus courant au plus rare. */
const FILLS = ['solid', 'hatch', 'backhatch', 'grid', 'dots'] as const

/** Barres groupées par joueur, une série par type de bonus. */
export function BonusBars({ game }: { game: Game }) {
  const { t } = useT()
  const titleId = useId()
  const patternId = useId()
  const rows = bonusTotals(game)

  const highest = Math.max(
    1,
    ...rows.flatMap((row) => BONUS_KEYS.map((key) => row.counts[key])),
  )
  const anyBonus = rows.some((row) => BONUS_KEYS.some((key) => row.counts[key] > 0))

  if (!anyBonus) {
    return <p className={styles.empty}>{t('chart.bonus.empty')}</p>
  }

  const area = plotArea(BOX)
  const y = scale([0, highest], [area.y + area.height, area.y])
  const slot = area.width / rows.length
  const groupWidth = slot * 0.72
  const barWidth = groupWidth / BONUS_KEYS.length

  return (
    <figure className={styles.frame}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>{t('chart.bonus.title')}</title>

        <Patterns id={patternId} />

        {[0, Math.ceil(highest / 2), highest].map((tick) => (
          <g key={tick}>
            <line
              className={styles.grid}
              x1={area.x}
              x2={area.x + area.width}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className={styles.axisLabel} x={area.x - 4} y={y(tick) + 3} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}

        {rows.map((row, index) => {
          const start = area.x + slot * index + (slot - groupWidth) / 2
          return (
            <g key={row.playerId}>
              {BONUS_KEYS.map((key, position) => {
                const value = row.counts[key]
                return (
                  <rect
                    key={key}
                    x={start + barWidth * position}
                    y={y(value)}
                    width={Math.max(1, barWidth - 1)}
                    height={Math.max(0, y(0) - y(value))}
                    rx={2}
                    {...fillProps(patternId, FILLS[position])}
                  />
                )
              })}
              <text
                className={styles.axisLabel}
                x={start + groupWidth / 2}
                y={BOX.height - 8}
                textAnchor="middle"
              >
                {shorten(game.nameSnapshot[row.playerId] ?? '')}
              </text>
            </g>
          )
        })}
      </svg>

      <div className={styles.legend}>
        {BONUS_KEYS.map((key, position) => (
          <span key={key} className={styles.legendItem}>
            <span className={styles.swatch} style={swatchStyle(FILLS[position])} />
            <span>{t(`bonus.${key}`)}</span>
          </span>
        ))}
      </div>

      <figcaption className="sr-only">
        <p>{t('chart.bonus.desc')}</p>
        <table>
          <caption>{t('chart.table')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('nav.players')}</th>
              {BONUS_KEYS.map((key) => (
                <th key={key} scope="col">
                  {t(`bonus.${key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId}>
                <th scope="row">{game.nameSnapshot[row.playerId]}</th>
                {BONUS_KEYS.map((key) => (
                  <td key={key}>{row.counts[key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}
