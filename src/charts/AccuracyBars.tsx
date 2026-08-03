import { useId } from 'react'
import { accuracy } from '../domain/stats.ts'
import type { Game } from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import { shorten } from './labels.ts'
import { Patterns, fillProps, swatchStyle } from './Patterns.tsx'
import { plotArea, scale } from './primitives.ts'
import styles from './chart.module.css'

const BOX = { width: 320, height: 190, top: 10, right: 8, bottom: 26, left: 24 }

/** Sans teinte, c'est le remplissage seul qui distingue les trois séries. */
const SERIES = [
  { key: 'exact', label: 'chart.accuracy.exact', fill: 'solid' },
  { key: 'over', label: 'chart.accuracy.over', fill: 'hatch' },
  { key: 'under', label: 'chart.accuracy.under', fill: 'outline' },
] as const

/** Barres empilées par joueur : mises tenues, sur-mises, sous-mises. */
export function AccuracyBars({ game }: { game: Game }) {
  const { t } = useT()
  const titleId = useId()
  const patternId = useId()
  const rows = accuracy(game)
  const rounds = game.rounds.length

  if (rounds === 0) {
    return <p className={styles.empty}>{t('chart.noData')}</p>
  }

  const area = plotArea(BOX)
  const y = scale([0, rounds], [area.y + area.height, area.y])
  const slot = area.width / rows.length
  const barWidth = Math.min(40, slot * 0.6)

  return (
    <figure className={styles.frame}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>{t('chart.accuracy.title')}</title>

        <Patterns id={patternId} />

        {[0, Math.ceil(rounds / 2), rounds].map((tick) => (
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
          const centre = area.x + slot * index + slot / 2
          let base = 0
          return (
            <g key={row.playerId}>
              {SERIES.map((series) => {
                const value = row[series.key]
                const top = base + value
                const rect = (
                  <rect
                    key={series.key}
                    x={centre - barWidth / 2}
                    y={y(top)}
                    width={barWidth}
                    height={Math.max(0, y(base) - y(top))}
                    rx={2}
                    {...fillProps(patternId, series.fill)}
                  />
                )
                base = top
                return rect
              })}
              <text
                className={styles.axisLabel}
                x={centre}
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
        {SERIES.map((series) => (
          <span key={series.key} className={styles.legendItem}>
            <span className={styles.swatch} style={swatchStyle(series.fill)} />
            <span>{t(series.label)}</span>
          </span>
        ))}
      </div>

      <figcaption className="sr-only">
        <p>{t('chart.accuracy.desc')}</p>
        <table>
          <caption>{t('chart.table')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('nav.players')}</th>
              {SERIES.map((series) => (
                <th key={series.key} scope="col">
                  {t(series.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId}>
                <th scope="row">{game.nameSnapshot[row.playerId]}</th>
                {SERIES.map((series) => (
                  <td key={series.key}>{row[series.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}
