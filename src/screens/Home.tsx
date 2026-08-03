import { Button } from '../components/Button.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Icon, Logo } from '../components/Icon.tsx'
import {
  Caption,
  Figure,
  Tag,
  Widget,
  WidgetTitle,
} from '../components/Widget.tsx'
import { standings, totals } from '../domain/stats.ts'
import { TOTAL_ROUNDS } from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import { draftFor, runningGame } from '../store/reducer.ts'
import { useStore } from '../app/StoreProvider.tsx'
import type { Route } from '../app/Router.tsx'
import styles from './Home.module.css'

export function Home({ go }: { go: (route: Route) => void }) {
  const { store } = useStore()
  const { t, number, date } = useT()

  const running = runningGame(store)
  const finished = store.games
    .filter((game) => game.endedAt)
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))

  const isFirstLaunch = store.games.length === 0 && store.players.length === 0
  const totalGames = finished.length

  return (
    <div className="screen">
      <header className="topbar">
        <div className="topbar-inner">
          <Logo size={30} className={styles.logo} />
          <div className="topbar-title">
            <h1 className="t-title">{t('app.name')}</h1>
          </div>
        </div>
      </header>

      <main className="screen-body">
        <p className={styles.tagline}>{t('app.tagline')}</p>

        <div className="mosaic">
          {running && <ResumeWidget go={go} />}

          {isFirstLaunch && (
            <EmptyState
              tag={t('home.empty.tag')}
              title={t('home.empty.title')}
              body={t('home.empty.body')}
            />
          )}

          {/* Les compteurs de la mosaïque : ce que l'app sait de toi. */}
          {!isFirstLaunch && (
            <>
              <Widget surface="accent" span="sm">
                <Tag>{t('home.stat.games')}</Tag>
                <Figure>{number(totalGames)}</Figure>
                <Caption>{t('home.stat.gamesCaption')}</Caption>
              </Widget>

              <Widget surface="sunken" span="sm">
                <Tag>{t('home.stat.players')}</Tag>
                <Figure>{number(store.players.length)}</Figure>
                <Caption>{t('home.stat.playersCaption')}</Caption>
              </Widget>
            </>
          )}

          {finished.slice(0, 2).map((game) => {
            const table = standings(game)
            const top = table[0]
            return (
              <Widget
                key={game.id}
                surface="card"
                span="sm"
                onClick={() => go({ name: 'summary', gameId: game.id })}
              >
                <Tag>{date(game.endedAt ?? game.startedAt)}</Tag>
                <WidgetTitle>{game.nameSnapshot[top.playerId]}</WidgetTitle>
                <Figure>{number(top.total)}</Figure>
                <Caption>{t('history.players', { count: game.playerIds.length })}</Caption>
              </Widget>
            )
          })}
        </div>

        <nav className={styles.nav} aria-label={t('nav.home')}>
          {(
            [
              [{ name: 'history' } as Route, 'nav.history'],
              [{ name: 'players' } as Route, 'nav.players'],
              [{ name: 'rules' } as Route, 'nav.rules'],
              [{ name: 'settings' } as Route, 'nav.settings'],
            ] as const
          ).map(([route, key]) => (
            <button key={key} type="button" className={styles.navItem} onClick={() => go(route)}>
              <span>{t(key)}</span>
              <Icon name="chevron" size={16} />
            </button>
          ))}
        </nav>
      </main>

      <div className="actionbar">
        <div className="actionbar-inner">
          <Button variant="primary" onClick={() => go({ name: 'new' })}>
            {t('home.newGame')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** La reprise passe avant tout le reste : widget plein, pleine largeur. */
function ResumeWidget({ go }: { go: (route: Route) => void }) {
  const { store } = useStore()
  const { t, number } = useT()
  const game = runningGame(store)
  if (!game) return null

  const draft = draftFor(store, game)
  const roundIndex = Math.min(draft.roundIndex, TOTAL_ROUNDS)
  const scores = totals(game)
  const ordered = [...game.playerIds].sort((a, b) => scores[b] - scores[a])

  return (
    <Widget surface="accent" span="md" onClick={() => go({ name: 'game' })}>
      <Tag>{t('home.resume.title')}</Tag>
      <div className={styles.resumeFigure}>
        <span className={styles.resumeNumber}>{roundIndex}</span>
        <span className={styles.resumeTotal}>/ {TOTAL_ROUNDS}</span>
      </div>
      <Caption>
        {t('game.roundLabel')} · {draft.phase === 'bids' ? t('game.phase.bids') : t('game.phase.results')}
      </Caption>

      {game.rounds.length > 0 && (
        <div className={styles.resumeScores}>
          {ordered.map((playerId) => (
            <span key={playerId} className={styles.resumeScore}>
              <span className={styles.resumeName}>{game.nameSnapshot[playerId]}</span>
              <span className={styles.resumeValue}>{number(scores[playerId])}</span>
            </span>
          ))}
        </div>
      )}
    </Widget>
  )
}
