import { useId } from 'react'
import { cumulativeSeries } from '../domain/stats.ts'
import type { Game } from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import { shorten } from './labels.ts'
import { dashFor, opacityFor } from './series.ts'
import { extent, niceTicks, plotArea, polyline, scale } from './primitives.ts'
import styles from './chart.module.css'

const BOX = { width: 320, height: 190, top: 10, right: 44, bottom: 22, left: 30 }

/** Lignes cumulées, une par joueur, axe des X sur les manches jouées. */
export function ScoreLines({ game }: { game: Game }) {
  const { t, number } = useT()
  const titleId = useId()
  const series = cumulativeSeries(game)
  const rounds = game.rounds.length

  if (rounds === 0) {
    return <p className={styles.empty}>{t('chart.noData')}</p>
  }

  const area = plotArea(BOX)
  const values = series.flatMap((line) => line.points)
  const [low, high] = extent(values, [0, 1])
  const ticks = niceTicks(Math.min(0, low), Math.max(0, high))
  const y = scale([ticks[0], ticks[ticks.length - 1]], [area.y + area.height, area.y])
  const x = scale([1, Math.max(2, rounds)], [area.x, area.x + area.width])

  return (
    <figure className={styles.frame}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>{t('chart.scores.title')}</title>

        {ticks.map((tick) => (
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

        {game.rounds.map((round, index) => (
          <text
            key={round.index}
            className={styles.axisLabel}
            x={x(index + 1)}
            y={BOX.height - 6}
            textAnchor="middle"
          >
            {round.index}
          </text>
        ))}

        {series.map((line, seat) => {
          const points = line.points.map((value, index) => ({ x: x(index + 1), y: y(value) }))
          const last = points[points.length - 1]
          return (
            <g key={line.playerId} opacity={opacityFor(seat)}>
              {/* Sans teinte, c'est le motif de tiretés qui sépare les séries,
                  et le nom en bout de tracé qui les nomme. */}
              <path
                className={styles.line}
                d={polyline(points)}
                stroke="currentColor"
                strokeDasharray={dashFor(seat)}
              />
              {last && <circle cx={last.x} cy={last.y} r={3.5} fill="currentColor" />}
              {last && (
                <text className={styles.seriesLabel} x={last.x + 6} y={last.y + 3} fill="currentColor">
                  {shorten(game.nameSnapshot[line.playerId] ?? '')}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <figcaption className="sr-only">
        <p>{t('chart.scores.desc')}</p>
        <table>
          <caption>{t('chart.table')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('chart.axis.round')}</th>
              {game.playerIds.map((playerId) => (
                <th key={playerId} scope="col">
                  {game.nameSnapshot[playerId]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {game.rounds.map((round, index) => (
              <tr key={round.index}>
                <th scope="row">{round.index}</th>
                {series.map((line) => (
                  <td key={line.playerId}>{number(line.points[index])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}
