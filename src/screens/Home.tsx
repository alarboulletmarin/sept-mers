import { Button } from '../components/Button.tsx'
import { Icon, Logo } from '../components/Icon.tsx'
import { RoundRail } from '../components/Rail.tsx'
import { Caption, Figure, Tag, Widget, WidgetTitle } from '../components/Widget.tsx'
import { standings, totals } from '../domain/stats.ts'
import { TOTAL_ROUNDS } from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import { draftFor, runningGame } from '../store/reducer.ts'
import { useStore } from '../app/StoreProvider.tsx'
import { useActionBarHeight } from '../app/useActionBar.ts'
import type { Route } from '../app/Router.tsx'
import styles from './Home.module.css'

export function Home({ go }: { go: (route: Route) => void }) {
  const { store } = useStore()
  const { t, number, date } = useT()
  const actionBar = useActionBarHeight<HTMLDivElement>()

  const running = runningGame(store)
  const finished = store.games
    .filter((game) => game.endedAt)
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))

  const isFirstLaunch = store.games.length === 0 && store.players.length === 0

  return (
    <div className="screen">
      <main className="screen-body">
        {/* Le bandeau de marque : le logotype, le nom en romain, la phrase qui
            dit ce que fait l'app. Une seule fois, en haut, et on n'y revient
            plus de l'écran. */}
        <header className={styles.masthead}>
          <Logo size={34} className={styles.logo} />
          <h1 className={`t-display ${styles.wordmark}`}>{t('app.name')}</h1>
          <p className={`t-lede ${styles.tagline}`}>{t('app.tagline')}</p>
        </header>

        {running && <ResumeSection go={go} />}

        {isFirstLaunch ? (
          <HowItWorks go={go} />
        ) : (
          <>
            <h2 className="section-title">{t('home.section.table')}</h2>
            <div className="mosaic">
              <Widget surface="accent" span="sm">
                <Tag>{t('home.stat.games')}</Tag>
                <Figure>{number(finished.length)}</Figure>
                <Caption>{t('home.stat.gamesCaption')}</Caption>
              </Widget>

              <Widget surface="sunken" span="sm">
                <Tag>{t('home.stat.players')}</Tag>
                <Figure>{number(store.players.length)}</Figure>
                <Caption>{t('home.stat.playersCaption')}</Caption>
              </Widget>
            </div>
          </>
        )}

        {finished.length > 0 && (
          <>
            <h2 className="section-title">{t('home.lastGames')}</h2>
            <div className="mosaic">
              {finished.slice(0, 2).map((game) => {
                const top = standings(game)[0]
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
          </>
        )}

        {/*
          La navigation secondaire : une liste au filet, pas quatre pastilles.
          Elle doit se lire comme un sommaire et ne rien réclamer.
        */}
        <h2 className="section-title">{t('home.section.more')}</h2>
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
              <span className={styles.navLabel}>{t(key)}</span>
              <Icon name="chevron" size={15} />
            </button>
          ))}
        </nav>
      </main>

      <div className="actionbar" ref={actionBar}>
        <div className="actionbar-inner">
          <Button variant="primary" onClick={() => go({ name: 'new' })}>
            {t('home.newGame')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Trois phrases au premier lancement. Quelqu'un qui ouvre l'app avant de savoir
 * jouer doit comprendre, en dix secondes, ce que l'app fait et ce qu'elle
 * attend de lui — sinon le premier écran est un mur.
 */
function HowItWorks({ go }: { go: (route: Route) => void }) {
  const { t } = useT()
  const steps = [t('home.how.step1'), t('home.how.step2'), t('home.how.step3')]

  return (
    <>
      <h2 className="section-title">{t('home.how.title')}</h2>
      <ol className={styles.how}>
        {steps.map((step, index) => (
          <li key={step} className={styles.howStep}>
            <span className={styles.howIndex}>{index + 1}</span>
            <span className={styles.howText}>{step}</span>
          </li>
        ))}
      </ol>
      <button type="button" className={styles.howLink} onClick={() => go({ name: 'rules' })}>
        {t('home.how.rules')}
        <Icon name="chevron" size={14} />
      </button>
    </>
  )
}

/** La reprise passe avant tout le reste : widget plein, pleine largeur. */
function ResumeSection({ go }: { go: (route: Route) => void }) {
  const { store } = useStore()
  const { t, number } = useT()
  const game = runningGame(store)
  if (!game) return null

  const draft = draftFor(store, game)
  const roundIndex = Math.min(draft.roundIndex, TOTAL_ROUNDS)
  const scores = totals(game)
  const ordered = [...game.playerIds].sort((a, b) => scores[b] - scores[a])

  return (
    <>
      <h2 className="section-title">{t('home.section.resume')}</h2>
      <Widget surface="accent" span="md" onClick={() => go({ name: 'game' })}>
        <div className="row-between" style={{ width: '100%' }}>
          <Tag>{t('home.resume.title')}</Tag>
          <span className={styles.resumeArrow} aria-hidden="true">
            <Icon name="chevron" size={16} />
          </span>
        </div>

        <p className={styles.resumeFigure}>
          <span className={styles.resumeNumber}>{roundIndex}</span>
          <span className={styles.resumeTotal}>{t('home.resume.of', { total: TOTAL_ROUNDS })}</span>
        </p>

        <RoundRail
          total={TOTAL_ROUNDS}
          current={roundIndex}
          label={t('home.resume.detail', { round: roundIndex, total: TOTAL_ROUNDS })}
        />

        <Caption>
          {draft.phase === 'bids' ? t('game.phase.bids') : t('game.phase.results')}
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
    </>
  )
}
