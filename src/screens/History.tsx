import { useState } from 'react'
import { Screen } from '../app/Layout.tsx'
import { hrefFor, opensElsewhere, type Route } from '../app/Router.tsx'
import { useStore } from '../app/StoreProvider.tsx'
import { Button } from '../components/Button.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Icon } from '../components/Icon.tsx'
import { ChipGrid, PlayerChip } from '../components/PlayerChip.tsx'
import { useToast } from '../components/Toast.tsx'
import { standings, winnerIds } from '../domain/stats.ts'
import { isComplete, type Id } from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import styles from './History.module.css'

export function History({ go }: { go: (route: Route) => void }) {
  const { store, dispatch } = useStore()
  const { t, number, date } = useT()
  const toast = useToast()
  // Le filtre vit dans l'écran et non dans le stockage : il répond à « et
  // Marie, elle en a gagné combien ? », pas à un réglage qu'on veut retrouver.
  const [filter, setFilter] = useState<Id | null>(null)

  const games = store.games
    .filter((game) => game.endedAt)
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))

  /*
   * Les joueurs qu'on peut filtrer sont ceux qui ont réellement joué une
   * partie enregistrée, et sous le nom qu'ils y portaient : proposer un filtre
   * qui ne rendrait rien est pire que ne pas en proposer.
   */
  const seen = new Map<Id, string>()
  for (const game of games) {
    for (const id of game.playerIds) {
      if (!seen.has(id)) seen.set(id, game.nameSnapshot[id] ?? '')
    }
  }
  const filterable = [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const shown = filter ? games.filter((game) => game.playerIds.includes(filter)) : games

  return (
    <Screen title={t('history.title')} lede={t('history.lede')} onBack={() => go({ name: 'home' })}>
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
        <>
          {/* Le filtre n'apparaît qu'à partir de deux joueurs croisés : à un
              seul, il ne trierait rien et ferait du bruit. */}
          {filterable.length > 1 && (
            <section className="stack-tight">
              <h2 className="section-title">{t('history.filter')}</h2>
              <ChipGrid>
                {filterable.map((player) => (
                  <PlayerChip
                    key={player.id}
                    name={player.name}
                    selected={filter === player.id}
                    onToggle={() => setFilter(filter === player.id ? null : player.id)}
                  />
                ))}
              </ChipGrid>
              <p className={styles.count} role="status">
                {filter
                  ? t('history.filtered', {
                      count: shown.length,
                      name: seen.get(filter) ?? '',
                    })
                  : t('history.count', { count: games.length })}
              </p>
            </section>
          )}

          <ul className="mosaic">
            {shown.map((game) => {
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
                      if (opensElsewhere(event)) return
                      event.preventDefault()
                      go({ name: 'summary', gameId: game.id })
                    }}
                  >
                    <span className={styles.text}>
                      <span className={styles.tag}>
                        {date(game.endedAt ?? game.startedAt)}
                        {/* Une partie écourtée le dit ici : son classement est
                            vrai, mais elle ne compte pas au palmarès, et rien
                            ne le laissait deviner. */}
                        {!isComplete(game) && (
                          <span className={styles.partial}>
                            {t('history.partial', {
                              played: game.rounds.length,
                              total: game.format.rounds,
                            })}
                          </span>
                        )}
                      </span>
                      <span className={styles.winner}>
                        {winners.length > 1
                          ? t('history.tie')
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
        </>
      )}
    </Screen>
  )
}
