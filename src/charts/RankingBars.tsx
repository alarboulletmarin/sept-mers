import { useId, useState } from 'react'
import type { PlayerStats } from '../domain/stats.ts'
import { useT } from '../i18n/index.ts'
import { shorten } from './labels.ts'
import { plotArea, scale } from './primitives.ts'
import styles from './chart.module.css'

const ROW_HEIGHT = 26
const BOX = { width: 320, top: 6, right: 34, bottom: 18, left: 76 }

type MetricKey =
  | 'gamesPlayed'
  | 'wins'
  | 'losses'
  | 'averagePoints'
  | 'accuracyRate'
  | 'zeroAccuracyRate'

interface Metric {
  key: MetricKey
  label: string
  kind: 'count' | 'points' | 'rate'
  /** Mesure où le petit chiffre est le bon, et qui se trie donc à l'envers. */
  lowerIsBetter?: boolean
}

const METRICS: Metric[] = [
  { key: 'gamesPlayed', label: 'ranking.gamesPlayed', kind: 'count' },
  { key: 'wins', label: 'ranking.wins', kind: 'count' },
  // Les défaites sont la seule mesure qu'on ne veut pas voir décroître depuis
  // le haut : un palmarès qui s'ouvre sur celui qui en a le plus se lit à
  // l'envers de tous les autres.
  { key: 'losses', label: 'ranking.losses', kind: 'count', lowerIsBetter: true },
  { key: 'averagePoints', label: 'ranking.averagePoints', kind: 'points' },
  { key: 'accuracyRate', label: 'ranking.accuracyRate', kind: 'rate' },
  { key: 'zeroAccuracyRate', label: 'ranking.zeroAccuracyRate', kind: 'rate' },
]

interface RankingBarsProps {
  rows: PlayerStats[]
  names: Record<string, string>
}

/** Barres horizontales sur les joueurs récurrents, une mesure à la fois. */
export function RankingBars({ rows, names }: RankingBarsProps) {
  const { t, number, percent } = useT()
  const titleId = useId()
  const [metric, setMetric] = useState<MetricKey>('wins')

  if (rows.length === 0) {
    return <p className={styles.empty}>{t('chart.ranking.empty')}</p>
  }

  const active = METRICS.find((entry) => entry.key === metric) ?? METRICS[1]
  const format = (value: number) =>
    active.kind === 'rate'
      ? percent(value)
      : active.kind === 'points'
        ? number(Math.round(value))
        : number(value)

  const sorted = [...rows].sort((a, b) =>
    active.lowerIsBetter ? a[metric] - b[metric] : b[metric] - a[metric],
  )
  const height = BOX.top + BOX.bottom + sorted.length * ROW_HEIGHT
  const area = plotArea({ ...BOX, width: BOX.width, height })

  // Les points moyens peuvent être négatifs : l'échelle part du plus bas.
  const values = sorted.map((row) => row[metric])
  const low = Math.min(0, ...values)
  const high = Math.max(active.kind === 'rate' ? 1 : 1, ...values)
  const x = scale([low, high], [area.x, area.x + area.width])

  return (
    <figure className={styles.frame}>
      <div className="segmented" role="radiogroup" aria-label={t('chart.ranking.metric')}>
        {METRICS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="radio"
            aria-checked={entry.key === metric}
            className="segmented-option"
            onClick={() => setMetric(entry.key)}
          >
            {t(entry.label)}
          </button>
        ))}
      </div>

      <svg
        className={styles.svg}
        viewBox={`0 0 ${BOX.width} ${height}`}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>{t('chart.ranking.title')}</title>

        <line
          className={styles.grid}
          x1={x(low)}
          x2={x(low)}
          y1={area.y}
          y2={area.y + area.height}
        />

        {sorted.map((row, index) => {
          const centre = area.y + index * ROW_HEIGHT + ROW_HEIGHT / 2
          const value = row[metric]
          const start = Math.min(x(0), x(value))
          const width = Math.abs(x(value) - x(0))
          return (
            <g key={row.playerId}>
              <text
                className={styles.axisLabel}
                x={area.x - 6}
                y={centre + 3}
                textAnchor="end"
              >
                {shorten(names[row.playerId] ?? '')}
              </text>
              <rect
                x={start}
                y={centre - 7}
                width={Math.max(1, width)}
                height={14}
                fill="currentColor"
                rx={2}
              />
              <text
                className={styles.axisLabel}
                x={start + Math.max(1, width) + 4}
                y={centre + 3}
              >
                {format(value)}
              </text>
            </g>
          )
        })}
      </svg>

      <figcaption className="sr-only">
        <p>{t('chart.ranking.desc')}</p>
        <table>
          <caption>{t('chart.table')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('nav.players')}</th>
              {METRICS.map((entry) => (
                <th key={entry.key} scope="col">
                  {t(entry.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.playerId}>
                <th scope="row">{names[row.playerId] ?? ''}</th>
                {METRICS.map((entry) => (
                  <td key={entry.key}>
                    {entry.kind === 'rate'
                      ? percent(row[entry.key])
                      : number(Math.round(row[entry.key]))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}
