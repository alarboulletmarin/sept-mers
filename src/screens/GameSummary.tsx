import { useState } from 'react'
import { Screen } from '../app/Layout.tsx'
import type { Route } from '../app/Router.tsx'
import { useStore } from '../app/StoreProvider.tsx'
import { AccuracyBars } from '../charts/AccuracyBars.tsx'
import { ScoreLines } from '../charts/ScoreLines.tsx'
import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { ScoreTable } from '../components/ScoreTable.tsx'
import { Sheet } from '../components/Sheet.tsx'
import { Caption, Figure, Tag, Widget, WidgetTitle } from '../components/Widget.tsx'
import { standings, winnerIds } from '../domain/stats.ts'
import { useT } from '../i18n/index.ts'
import { ShareSheet } from '../share/ShareSheet.tsx'
import { gameById, runningGame } from '../store/reducer.ts'
import styles from './GameSummary.module.css'

export function GameSummary({ gameId, go }: { gameId?: string; go: (route: Route) => void }) {
  const { store, dispatch } = useStore()
  const { t, number, date } = useT()
  const [shareOpen, setShareOpen] = useState(false)

  // Sans identifiant, c'est la partie qu'on vient de finir.
  const game = gameId ? gameById(store, gameId) : runningGame(store)
  const readOnly = Boolean(gameId)

  if (!game) {
    return (
      <Screen title={t('summary.title')} onBack={() => go({ name: 'home' })}>
        <p className="t-body">{t('history.empty.body')}</p>
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
      lede={t('summary.lede')}
      onBack={() => go({ name: readOnly ? 'history' : 'home' })}
      actions={
        // Le résultat se partage : un lien-résumé qui fige la partie, à
        // envoyer dans la conversation du groupe ou à faire scanner.
        <button
          type="button"
          className="round-button"
          aria-label={t('share.snapshot')}
          onClick={() => setShareOpen(true)}
        >
          <Icon name="live" size={20} />
        </button>
      }
      footer={
        <div className={styles.actions}>
          <Button variant="secondary" full onClick={rematch}>
            {t('summary.rematch')}
          </Button>
          <Button variant="primary" onClick={finish}>
            {readOnly ? t('summary.backHome') : t('summary.finish')}
          </Button>
        </div>
      }
    >
      <div className="mosaic">
        {/* Le vainqueur en héros : c'est la seule chose qu'on regarde d'abord. */}
        <Widget surface="accent" span="md">
          <Tag>
            {readOnly
              ? t('summary.readOnly', { date: date(game.endedAt ?? game.startedAt) })
              : date(game.startedAt)}
          </Tag>
          <WidgetTitle>
            {winners.length > 1
              ? t('summary.winners', { names: winnerNames })
              : t('summary.winner', { name: winnerNames })}
          </WidgetTitle>
          <Figure hero>{number(table[0].total)}</Figure>
          {table[0].gapToNext > 0 && (
            <Caption>{t('summary.gap', { gap: number(table[0].gapToNext) })}</Caption>
          )}
        </Widget>

        {/* Le reste du classement, une tuile par joueur. */}
        {table.slice(1).map((row) => (
          <Widget key={row.playerId} surface="card" span="sm" tight>
            <Tag>{row.rank === 1 ? t('summary.rankFirst') : t('summary.rank', { rank: row.rank })}</Tag>
            <span className={styles.rankName}>{game.nameSnapshot[row.playerId]}</span>
            <Figure>{number(row.total)}</Figure>
            {row.gapToNext > 0 && (
              <Caption>{t('summary.gap', { gap: number(row.gapToNext) })}</Caption>
            )}
          </Widget>
        ))}

        <Widget surface="accent" span="md">
          <Tag>{t('chart.scores.title')}</Tag>
          <ScoreLines game={game} />
        </Widget>

        <Widget surface="sunken" span="md">
          <Tag>{t('chart.accuracy.title')}</Tag>
          <AccuracyBars game={game} />
        </Widget>

        <Widget surface="card" span="lg">
          <Tag>{t('summary.rounds')}</Tag>
          <ScoreTable game={game} />
        </Widget>
      </div>

      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title={t('share.snapshot')}>
        <ShareSheet game={game} live={false} />
      </Sheet>
    </Screen>
  )
}
