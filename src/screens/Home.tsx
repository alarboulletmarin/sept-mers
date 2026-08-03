import { Button } from '../components/Button.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Icon, Logo } from '../components/Icon.tsx'
import { standings, totals } from '../domain/stats.ts'
import { TOTAL_ROUNDS } from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import { draftFor, nextRoundIndex, runningGame } from '../store/reducer.ts'
import { useStore } from '../app/StoreProvider.tsx'
import { hrefFor, type Route } from '../app/Router.tsx'
import styles from './Home.module.css'

const SECONDARY: { route: Route; key: string; icon: 'book' | 'chart' | 'gear' | 'chevron' }[] = [
  { route: { name: 'history' }, key: 'nav.history', icon: 'chart' },
  { route: { name: 'players' }, key: 'nav.players', icon: 'chevron' },
  { route: { name: 'rules' }, key: 'nav.rules', icon: 'book' },
  { route: { name: 'settings' }, key: 'nav.settings', icon: 'gear' },
]

export function Home({ go }: { go: (route: Route) => void }) {
  const { store } = useStore()
  const { t, number, date } = useT()
  const running = runningGame(store)
  const finished = store.games
    .filter((game) => game.endedAt)
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))

  const isFirstLaunch = store.games.length === 0 && store.players.length === 0

  return (
    <div className="screen">
      <header className="topbar">
        <div className="topbar-inner">
          <Logo size={30} />
          <div className="topbar-title">
            <h1 className="t-display">{t('app.name')}</h1>
            <p className="t-caption muted">{t('app.tagline')}</p>
          </div>
        </div>
      </header>

      <main className="screen-body" style={{ paddingTop: 'var(--space-5)' }}>
        {running && <ResumeCard go={go} />}

        {isFirstLaunch && (
          <EmptyState
            title={t('home.empty.title')}
            body={t('home.empty.body')}
            action={
              <Button variant="primary" onClick={() => go({ name: 'new' })}>
                {t('home.newGame')}
              </Button>
            }
          />
        )}

        {!isFirstLaunch && !running && (
          <Button variant="primary" onClick={() => go({ name: 'new' })}>
            {t('home.newGame')}
          </Button>
        )}

        {finished.length > 0 && (
          <section className="stack-tight">
            <h2 className="section-title">{t('home.lastGames')}</h2>
            <ul className="linklist">
              {finished.slice(0, 3).map((game) => {
                const table = standings(game)
                const top = table[0]
                return (
                  <li key={game.id}>
                    <a
                      className="linkrow"
                      href={hrefFor({ name: 'summary', gameId: game.id })}
                      onClick={(event) => {
                        event.preventDefault()
                        go({ name: 'summary', gameId: game.id })
                      }}
                    >
                      <span className="linkrow-label">
                        <span className="t-label">
                          {game.nameSnapshot[top.playerId]} · {number(top.total)}
                        </span>
                        <br />
                        <span className="t-caption muted">
                          {date(game.endedAt ?? game.startedAt)} ·{' '}
                          {t('history.players', { count: game.playerIds.length })}
                        </span>
                      </span>
                      <Icon name="chevron" className="linkrow-chevron" />
                    </a>
                  </li>
                )
              })}
            </ul>
            {finished.length > 3 && (
              <Button variant="quiet" onClick={() => go({ name: 'history' })}>
                {t('home.seeAll')}
              </Button>
            )}
          </section>
        )}

        <nav className="linklist" aria-label={t('nav.home')}>
          {SECONDARY.map((item) => (
            <a
              key={item.key}
              className="linkrow"
              href={hrefFor(item.route)}
              onClick={(event) => {
                event.preventDefault()
                go(item.route)
              }}
            >
              <span className="linkrow-label t-label">{t(item.key)}</span>
              <Icon name="chevron" className="linkrow-chevron" />
            </a>
          ))}
        </nav>
      </main>
    </div>
  )
}

/** Carte de reprise, en première position quand une partie est en cours. */
function ResumeCard({ go }: { go: (route: Route) => void }) {
  const { store } = useStore()
  const { t, number } = useT()
  const game = runningGame(store)
  if (!game) return null

  const draft = draftFor(store, game)
  const roundIndex = Math.min(draft.roundIndex, TOTAL_ROUNDS)
  const scores = totals(game)
  const ordered = [...game.playerIds].sort((a, b) => scores[b] - scores[a])

  return (
    <button type="button" className={styles.resume} onClick={() => go({ name: 'game' })}>
      <span className={styles.resumeHead}>
        <span className="stack-tight" style={{ gap: 2, alignItems: 'flex-start' }}>
          <span className="t-section">{t('home.resume.title')}</span>
          <span className="t-caption muted">
            {t('home.resume.detail', { round: roundIndex, total: TOTAL_ROUNDS })} ·{' '}
            {draft.phase === 'bids' ? t('game.phase.bids') : t('game.phase.results')}
          </span>
        </span>
        <Icon name="chevron" className="linkrow-chevron" />
      </span>

      {game.rounds.length > 0 && (
        <span className={styles.resumeScores}>
          {ordered.map((playerId) => (
            <span key={playerId} className={styles.resumeScore}>
              <span className={styles.resumeName}>{game.nameSnapshot[playerId]}</span>
              <span className={styles.resumeValue}>{number(scores[playerId])}</span>
            </span>
          ))}
        </span>
      )}
    </button>
  )
}

export function resumeLabel(store: ReturnType<typeof useStore>['store']): number {
  const game = runningGame(store)
  return game ? nextRoundIndex(game) : 1
}
