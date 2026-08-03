import { cardsForRound } from '../domain/deck.ts'
import { roundScores, totals } from '../domain/stats.ts'
import { TOTAL_ROUNDS, type Game, type Id } from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import styles from './ScoreTable.module.css'

/** Au-delà de cinq colonnes, la table se resserre pour tenir dans la largeur. */
const DENSE_FROM = 6

interface ScoreTableProps {
  game: Game
  /** Manche mise en évidence par le filet de laiton. */
  currentRound?: number
  /** Rend les manches jouées cliquables, pour les corriger. */
  onEditRound?: (index: number) => void
}

export function ScoreTable({ game, currentRound, onEditRound }: ScoreTableProps) {
  const { t, signed, number } = useT()
  const finalTotals = totals(game)
  const dense = game.playerIds.length >= DENSE_FROM

  // Cumul par joueur au fil des manches, pour la seconde ligne de chaque cellule.
  const running: Record<Id, number> = {}
  for (const id of game.playerIds) running[id] = 0

  const rows = Array.from({ length: TOTAL_ROUNDS }, (_, index) => {
    const roundIndex = index + 1
    const round = game.rounds.find((candidate) => candidate.index === roundIndex)
    const cards = round?.cards ?? cardsForRound(roundIndex, game.playerIds.length)
    const scores = round ? roundScores(round, game) : null

    const cells = game.playerIds.map((playerId) => {
      const score = scores?.[playerId]
      if (score) running[playerId] += score.total
      return {
        playerId,
        delta: score?.total ?? null,
        running: score ? running[playerId] : null,
      }
    })

    return { roundIndex, cards, played: Boolean(round), cells }
  })

  return (
    <div className={`${styles.frame} ${dense ? styles.dense : ''}`}>
      <table className={styles.table}>
        <thead className={styles.head}>
          <tr>
            <th scope="col" className={styles.roundHead}>
              {t('table.round')}
            </th>
            {/* Nom entier, écrit en diagonale : c'est ce qui permet d'en tenir
                huit dans la largeur sans se rabattre sur une initiale. */}
            {game.playerIds.map((playerId) => (
              <th key={playerId} scope="col" className={styles.diagonal}>
                <span className={styles.diagonalInner}>{game.nameSnapshot[playerId]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isCurrent = row.roundIndex === currentRound
            const clickable = Boolean(onEditRound) && row.played
            return (
              <tr
                key={row.roundIndex}
                className={`${isCurrent ? styles.current : ''} ${clickable ? styles.editable : ''}`}
                onClick={clickable ? () => onEditRound?.(row.roundIndex) : undefined}
              >
                <th scope="row" className={styles.roundCol}>
                  <span className={styles.roundLabel}>
                    <span className={styles.roundIndex}>{row.roundIndex}</span>
                    <span className={styles.roundCards}>
                      {t('table.cards', { count: row.cards })}
                    </span>
                  </span>
                  {isCurrent && <span className="sr-only">{t('table.currentRound')}</span>}
                </th>
                {row.cells.map((cell) => (
                  <td key={cell.playerId}>
                    {cell.delta === null ? (
                      <span className={styles.pending} aria-label={t('table.notPlayed')}>
                        —
                      </span>
                    ) : (
                      <span className={styles.cell}>
                        <span className={`${styles.delta} ${cell.delta < 0 ? 'missed' : 'kept'}`}>
                          {signed(cell.delta)}
                        </span>
                        <span className={styles.running}>{number(cell.running ?? 0)}</span>
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
          <tr className={styles.totalRow}>
            <th scope="row" className={styles.roundCol}>
              <span className="t-column muted">{t('table.total')}</span>
            </th>
            {game.playerIds.map((playerId) => (
              <td key={playerId}>
                <span className={styles.totalCell}>
                  <span className={styles.totalName}>{game.nameSnapshot[playerId]}</span>
                  <span className={styles.total}>{number(finalTotals[playerId] ?? 0)}</span>
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
