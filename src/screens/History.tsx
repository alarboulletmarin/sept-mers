import { Screen } from '../app/Layout.tsx'
import { hrefFor, type Route } from '../app/Router.tsx'
import { useStore } from '../app/StoreProvider.tsx'
import { Button } from '../components/Button.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Icon } from '../components/Icon.tsx'
import { useToast } from '../components/Toast.tsx'
import { standings, winnerIds } from '../domain/stats.ts'
import { useT } from '../i18n/index.ts'
import styles from './History.module.css'

export function History({ go }: { go: (route: Route) => void }) {
  const { store, dispatch } = useStore()
  const { t, number, date } = useT()
  const toast = useToast()

  const games = store.games
    .filter((game) => game.endedAt)
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))

  return (
    <Screen title={t('history.title')} onBack={() => go({ name: 'home' })}>
      {games.length === 0 ? (
        <EmptyState
          title={t('history.empty.title')}
          body={t('history.empty.body')}
          action={
            <Button variant="primary" onClick={() => go({ name: 'new' })}>
              {t('home.newGame')}
            </Button>
          }
        />
      ) : (
        <ul className="mosaic">
          {games.map((game) => {
            const table = standings(game)
            const winners = winnerIds(game)
            const top = table[0]
            const names = game.playerIds
              .map((id) => game.nameSnapshot[id])
              .filter(Boolean)
              .join(' · ')

            return (
              <li key={game.id} className={styles.item}>
                <a
                  className={styles.link}
                  href={hrefFor({ name: 'summary', gameId: game.id })}
                  aria-label={t('history.open', { date: date(game.endedAt ?? game.startedAt) })}
                  onClick={(event) => {
                    event.preventDefault()
                    go({ name: 'summary', gameId: game.id })
                  }}
                >
                  <span className={styles.text}>
                    <span className={styles.tag}>
                      {date(game.endedAt ?? game.startedAt)}
                    </span>
                    <span className={styles.winner}>
                      {winners.length > 1
                        ? t('history.tie', { score: number(top.total) })
                        : (game.nameSnapshot[top.playerId] ?? '')}
                    </span>
                    <span className={styles.score}>{number(top.total)}</span>
                    <span className={styles.names}>{names}</span>
                  </span>
                </a>

                {/* Pas de boîte de confirmation : on agit, on peut revenir. */}
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`${t('action.delete')} — ${date(game.endedAt ?? game.startedAt)}`}
                  onClick={() => {
                    dispatch({ type: 'history/remove', gameId: game.id })
                    toast.show(t('history.deleted'), {
                      label: t('action.undo'),
                      run: () => dispatch({ type: 'history/restore', game, at: 0 }),
                    })
                  }}
                >
                  <Icon name="trash" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Screen>
  )
}
