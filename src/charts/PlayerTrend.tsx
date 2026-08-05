import { useId } from 'react'
import type { TimelinePoint } from '../domain/stats.ts'
import { useT } from '../i18n/index.ts'
import { extent, niceTicks, plotArea, polyline, scale } from './primitives.ts'
import styles from './chart.module.css'

const BOX = { width: 320, height: 170, top: 10, right: 10, bottom: 22, left: 34 }

/**
 * L'évolution d'un joueur, une partie par point, de la plus ancienne à la plus
 * récente.
 *
 * Ce que la moyenne ne dit pas : est-ce qu'on progresse ? Un seul tracé, donc
 * ni motif de tiretés ni légende — la question de distinguer huit séries ne se
 * pose pas ici, et le nom est déjà en titre d'écran.
 *
 * Deux parties suffisent à faire une tendance ; à une seule, il n'y a rien à
 * tracer et on le dit plutôt que de dessiner un point seul au milieu du vide.
 */
export function PlayerTrend({ points }: { points: TimelinePoint[] }) {
  const { t, number } = useT()
  const titleId = useId()

  if (points.length < 2) {
    return <p className={styles.empty}>{t('chart.trend.needMore')}</p>
  }

  const area = plotArea(BOX)
  const values = points.map((point) => point.total)
  const [low, high] = extent(values, [0, 1])
  const ticks = niceTicks(Math.min(0, low), Math.max(0, high))
  const y = scale([ticks[0], ticks[ticks.length - 1]], [area.y + area.height, area.y])
  const x = scale([1, points.length], [area.x, area.x + area.width])

  const plotted = points.map((point, index) => ({ x: x(index + 1), y: y(point.total) }))
  const last = plotted[plotted.length - 1]

  return (
    <figure className={styles.frame}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>{t('chart.trend.title')}</title>

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

        {/* Les parties sont numérotées de la plus ancienne à la plus récente :
            une date en abscisse serait illisible à cette largeur, et c'est
            l'ordre qui porte la tendance, pas le calendrier. */}
        {points.map((point, index) => (
          <text
            key={point.gameId}
            className={styles.axisLabel}
            x={x(index + 1)}
            y={BOX.height - 6}
            textAnchor="middle"
          >
            {index + 1}
          </text>
        ))}

        <path className={styles.line} d={polyline(plotted)} stroke="currentColor" />
        {plotted.map((point, index) => (
          <circle key={points[index].gameId} cx={point.x} cy={point.y} r={2.5} fill="currentColor" />
        ))}
        {last && <circle cx={last.x} cy={last.y} r={4} fill="currentColor" />}
      </svg>

      <figcaption className="sr-only">
        <p>{t('chart.trend.desc')}</p>
        <table>
          <caption>{t('chart.table')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('chart.trend.game')}</th>
              <th scope="col">{t('chart.trend.points')}</th>
              <th scope="col">{t('chart.trend.rank')}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point, index) => (
              <tr key={point.gameId}>
                <th scope="row">{index + 1}</th>
                <td>{number(point.total)}</td>
                <td>{t('summary.rank', { rank: point.rank })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}
