import { Screen } from '../app/Layout.tsx'
import type { Route } from '../app/Router.tsx'
import { useStore } from '../app/StoreProvider.tsx'
import { AccuracyBars } from '../charts/AccuracyBars.tsx'
import { BonusBars } from '../charts/BonusBars.tsx'
import { ScoreLines } from '../charts/ScoreLines.tsx'
import { Button } from '../components/Button.tsx'
import { ScoreTable } from '../components/ScoreTable.tsx'
import { standings, winnerIds } from '../domain/stats.ts'
import { useT } from '../i18n/index.ts'
import { gameById, runningGame } from '../store/reducer.ts'
import styles from './GameSummary.module.css'

export function GameSummary({ gameId, go }: { gameId?: string; go: (route: Route) => void }) {
  const { store, dispatch } = useStore()
  const { t, number, date } = useT()

  // Sans identifiant, c'est la partie qu'on vient de finir.
  const game = gameId ? gameById(store, gameId) : runningGame(store)
  const readOnly = Boolean(gameId)

  if (!game) {
    return (
      <Screen title={t('summary.title')} onBack={() => go({ name: 'home' })}>
        <p className="t-body muted">{t('history.empty.body')}</p>
      </Screen>
    )
  }

  const table = standings(game)
  const winners = winnerIds(game)
  const winnerNames = winners.map((id) => game.nameSnapshot[id]).join(', ')

  const finish = () => {
    if (!readOnly) dispatch({ type: 'game/finish' })
    go({ name: 'home' })
  }

  const rematch = () => {
    if (!readOnly) dispatch({ type: 'game/finish' })
    dispatch({
      type: 'game/start',
      playerIds: game.playerIds,
      options: game.options,
    })
    go({ name: 'game' })
  }

  return (
    <Screen
      title={t('summary.title')}
      onBack={() => go({ name: readOnly ? 'history' : 'home' })}
      footer={
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <Button full onClick={rematch}>
            {t('summary.rematch')}
          </Button>
          <Button variant="primary" onClick={finish}>
            {readOnly ? t('summary.backHome') : t('summary.finish')}
          </Button>
        </div>
      }
    >
      <p className="t-caption muted">
        {readOnly
          ? t('summary.readOnly', { date: date(game.endedAt ?? game.startedAt) })
          : date(game.startedAt)}
      </p>

      <h2 className="t-display">
        {winners.length > 1
          ? t('summary.winners', { names: winnerNames })
          : t('summary.winner', { name: winnerNames })}
      </h2>

      <ol className={styles.podium}>
        {table.map((row, index) => (
          <li key={row.playerId} className={styles.rank}>
            <span className={styles.rankNumber}>
              {row.rank === 1 ? t('summary.rankFirst') : t('summary.rank', { rank: row.rank })}
            </span>
            <span className={styles.rankName}>{game.nameSnapshot[row.playerId]}</span>
            <span className={styles.rankScore}>
              <span className={index === 0 ? 't-score-xl' : 't-score'}>
                {number(row.total)}
              </span>
              {/* L'écart avec le suivant, la question qu'on pose tout de suite. */}
              {row.gapToNext > 0 && (
                <span className="t-caption muted num">
                  {t('summary.gap', { gap: number(row.gapToNext) })}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      <section className="stack-tight">
        <h3 className="section-title">{t('chart.scores.title')}</h3>
        <div className="card">
          <ScoreLines game={game} />
        </div>
      </section>

      <section className="stack-tight">
        <h3 className="section-title">{t('chart.accuracy.title')}</h3>
        <div className="card">
          <AccuracyBars game={game} />
        </div>
      </section>

      <section className="stack-tight">
        <h3 className="section-title">{t('chart.bonus.title')}</h3>
        <div className="card">
          <BonusBars game={game} />
        </div>
      </section>

      <section className="stack-tight">
        <h3 className="section-title">{t('summary.rounds')}</h3>
        <ScoreTable game={game} />
      </section>
    </Screen>
  )
}
