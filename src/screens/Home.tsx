import { Button } from '../components/Button.tsx'
import { HowItWorks } from '../content/HowItWorks.tsx'
import { Icon, Logo } from '../components/Icon.tsx'
import { RoundRail } from '../components/Rail.tsx'
import { Caption, Figure, Tag, Widget, WidgetTitle } from '../components/Widget.tsx'
import { standings, totals } from '../domain/stats.ts'
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
          <div className={styles.mastheadTop}>
            <Logo size={32} className={styles.logo} />
            {/* Les réglages ne méritent pas un onglet : on y va une fois pour
                choisir sa langue et son thème, pas au milieu d'une partie. */}
            <button
              type="button"
              className="round-button"
              aria-label={t('nav.settings')}
              onClick={() => go({ name: 'settings' })}
            >
              <Icon name="gear" size={20} />
            </button>
          </div>
          <h1 className={`t-display ${styles.wordmark}`}>{t('app.name')}</h1>
          <p className={`t-lede ${styles.tagline}`}>{t('app.tagline')}</p>
        </header>

        {running && <ResumeSection go={go} />}

        {isFirstLaunch ? (
          <FirstLaunch go={go} />
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
            {finished.length > 2 && (
              <button
                type="button"
                className={styles.howLink}
                onClick={() => go({ name: 'history' })}
              >
                <Icon name="history" size={16} />
                {t('home.seeAll', { count: finished.length })}
              </button>
            )}
          </>
        )}

        {/* La porte du spectateur : quelqu'un dont c'est le premier lancement
            est peut-être précisément venu suivre la table d'un autre. */}
        <button type="button" className={styles.howLink} onClick={() => go({ name: 'watch' })}>
          <Icon name="live" size={16} />
          {t('home.watch')}
        </button>

        {/* L'explication ne disparaît plus avec le premier lancement : elle a
            son écran, et cette porte est celle qu'on ouvre en prêtant le
            téléphone à quelqu'un qui n'a jamais joué. */}
        <button type="button" className={styles.howLink} onClick={() => go({ name: 'about' })}>
          <Icon name="book" size={16} />
          {t('about.title')}
        </button>
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
 * Trois phrases au premier lancement.
 *
 * Quelqu'un qui ouvre l'app avant de savoir jouer doit comprendre, en dix
 * secondes, ce qu'elle fait et ce qu'elle attend de lui — sinon le premier
 * écran est un mur. Le texte lui-même vit dans `content/HowItWorks`, parce
 * qu'il se relit aussi depuis « À propos » : il disparaissait ici pour
 * toujours dès la première partie jouée, et rien ne permettait d'y revenir.
 */
function FirstLaunch({ go }: { go: (route: Route) => void }) {
  const { t } = useT()

  return (
    <>
      <h2 className="section-title">{t('home.how.title')}</h2>
      <HowItWorks />
      <button type="button" className={styles.howLink} onClick={() => go({ name: 'rules' })}>
        <Icon name="book" size={16} />
        {t('home.how.rules')}
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
  const rounds = game.format.rounds
  const roundIndex = Math.min(draft.roundIndex, rounds)
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
          <span className={styles.resumeTotal}>{t('home.resume.of', { total: rounds })}</span>
        </p>

        <RoundRail
          total={rounds}
          current={roundIndex}
          label={t('home.resume.detail', { round: roundIndex, total: rounds })}
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
