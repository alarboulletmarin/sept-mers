import { useState } from 'react'
import { Screen } from '../app/Layout.tsx'
import { hrefFor, opensElsewhere, type Route } from '../app/Router.tsx'
import { useStore } from '../app/StoreProvider.tsx'
import { RankingBars } from '../charts/RankingBars.tsx'
import { Button } from '../components/Button.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Icon } from '../components/Icon.tsx'
import { useToast } from '../components/Toast.tsx'
import { Widget } from '../components/Widget.tsx'
import { playerStats, ranking } from '../domain/stats.ts'
import { useT } from '../i18n/index.ts'
import { newId } from '../store/storage.ts'
import styles from './Players.module.css'

export function Players({ playerId, go }: { playerId?: string; go: (route: Route) => void }) {
  return playerId ? <PlayerDetail playerId={playerId} go={go} /> : <PlayerList go={go} />
}

function PlayerList({ go }: { go: (route: Route) => void }) {
  const { store, dispatch } = useStore()
  const { t } = useT()
  const [name, setName] = useState('')

  const names = Object.fromEntries(store.players.map((player) => [player.id, player.name]))
  const table = ranking(store.players, store.games)

  const countFor = (id: string) =>
    store.games.filter((game) => game.endedAt && game.playerIds.includes(id)).length

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    dispatch({ type: 'players/add', name: trimmed, id: newId() })
    setName('')
  }

  return (
    <Screen title={t('players.title')} lede={t('players.lede')} onBack={() => go({ name: 'home' })}>
      <section className="field">
        <label className="section-title" htmlFor="add-player">
          {t('newGame.addPlayer')}
        </label>
        <div className="row">
          <input
            id="add-player"
            className="input"
            value={name}
            autoComplete="off"
            placeholder={t('newGame.addPlayerLabel')}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                add()
              }
            }}
          />
          <Button onClick={add} disabled={!name.trim()}>
            <Icon name="plus" />
            {t('newGame.add')}
          </Button>
        </div>
      </section>

      {store.players.length === 0 ? (
        <EmptyState title={t('players.empty.title')} body={t('players.empty.body')} />
      ) : (
        <section className="stack-tight">
          <h2 className="section-title">{t('players.title')}</h2>
          <ul className={styles.list}>
            {store.players.map((player) => (
              <li key={player.id}>
                <a
                  className={styles.row}
                  href={hrefFor({ name: 'players', playerId: player.id })}
                  onClick={(event) => {
                    if (opensElsewhere(event)) return
                    event.preventDefault()
                    go({ name: 'players', playerId: player.id })
                  }}
                >
                  <span className={styles.rowText}>
                    <span className={styles.rowName}>{player.name}</span>
                    <span className={styles.rowMeta}>
                      {countFor(player.id) === 0
                        ? t('players.noGame')
                        : t('players.games', { count: countFor(player.id) })}
                    </span>
                  </span>
                  <Icon name="chevron" size={16} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {table.length > 0 && (
        <section className="stack-tight">
          <h2 className="section-title">{t('chart.ranking.title')}</h2>
          <Widget surface="accent" span="md">
            <RankingBars rows={table} names={names} />
          </Widget>
        </section>
      )}
    </Screen>
  )
}

function PlayerDetail({ playerId, go }: { playerId: string; go: (route: Route) => void }) {
  const { store, dispatch } = useStore()
  const { t, number, percent } = useT()
  const toast = useToast()

  const player = store.players.find((candidate) => candidate.id === playerId)
  const [name, setName] = useState(player?.name ?? '')

  if (!player) {
    return (
      <Screen title={t('players.title')} onBack={() => go({ name: 'players' })}>
        <p className="t-body">{t('players.empty.body')}</p>
      </Screen>
    )
  }

  const stats = playerStats(player.id, store.games)

  const rows: { label: string; value: string }[] = [
    { label: t('ranking.gamesPlayed'), value: number(stats.gamesPlayed) },
    { label: t('players.wins'), value: number(stats.wins) },
    {
      label: t('players.averagePoints'),
      value: stats.gamesPlayed > 0 ? number(Math.round(stats.averagePoints)) : '—',
    },
    { label: t('players.bestGame'), value: stats.bestGame === null ? '—' : number(stats.bestGame) },
    { label: t('players.roundsPlayed'), value: number(stats.roundsPlayed) },
    {
      label: t('players.accuracy'),
      value: stats.roundsPlayed > 0 ? percent(stats.accuracyRate) : '—',
    },
    {
      label: t('players.zeroAccuracy'),
      value: stats.zeroBids > 0 ? percent(stats.zeroAccuracyRate) : '—',
    },
    { label: t('players.bonusPoints'), value: number(stats.bonusPoints) },
  ]

  const rename = () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === player.name) return
    dispatch({ type: 'players/rename', id: player.id, name: trimmed })
  }

  const remove = () => {
    dispatch({ type: 'players/remove', id: player.id })
    toast.show(t('players.deleted', { name: player.name }))
    go({ name: 'players' })
  }

  return (
    <Screen
      title={player.name}
      onBack={() => go({ name: 'players' })}
    >
      <section className="field">
        <label className="section-title" htmlFor="player-name">
          {t('players.nameLabel')}
        </label>
        <div className="row">
          <input
            id="player-name"
            className="input"
            value={name}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
            onBlur={rename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                rename()
                event.currentTarget.blur()
              }
            }}
          />
          <Button onClick={rename} disabled={!name.trim() || name.trim() === player.name}>
            {t('action.save')}
          </Button>
        </div>
      </section>

      <section className="stack-tight">
        <h2 className="section-title">{t('players.stats')}</h2>
        {stats.gamesPlayed === 0 ? (
          <p className="t-body">{t('players.noGame')}</p>
        ) : (
          <dl className={styles.stats}>
            {rows.map((row) => (
              <div key={row.label} className={styles.stat}>
                <dt className={styles.statLabel}>{row.label}</dt>
                <dd className={styles.statValue}>{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {stats.gamesPlayed > 0 && (
        <section className="stack-tight">
          <h2 className="section-title">{t('chart.ranking.title')}</h2>
          <Widget surface="accent" span="md">
            <RankingBars
              rows={ranking(store.players, store.games)}
              names={Object.fromEntries(store.players.map((entry) => [entry.id, entry.name]))}
            />
          </Widget>
        </section>
      )}

      <div className="stack-tight">
        <Button variant="danger" onClick={remove}>
          <Icon name="trash" />
          {t('action.delete')}
        </Button>
        <p className={styles.hint}>{t('players.deleteHint')}</p>
      </div>
    </Screen>
  )
}
