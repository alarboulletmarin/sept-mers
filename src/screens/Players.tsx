import { useState } from 'react'
import { Screen } from '../app/Layout.tsx'
import { hrefFor, opensElsewhere, type Route } from '../app/Router.tsx'
import { useStore } from '../app/StoreProvider.tsx'
import { PlayerTrend } from '../charts/PlayerTrend.tsx'
import { RankingBars } from '../charts/RankingBars.tsx'
import { Button } from '../components/Button.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Icon } from '../components/Icon.tsx'
import { useToast } from '../components/Toast.tsx'
import { Widget } from '../components/Widget.tsx'
import {
  accuracyByCards,
  countedGames,
  headToHead,
  keptStreak,
  playerStats,
  playerTimeline,
  ranking,
} from '../domain/stats.ts'
import { useT } from '../i18n/index.ts'
import { nameTaken } from '../store/reducer.ts'
import { newId } from '../store/storage.ts'
import styles from './Players.module.css'

export function Players({ playerId, go }: { playerId?: string; go: (route: Route) => void }) {
  return playerId ? <PlayerDetail playerId={playerId} go={go} /> : <PlayerList go={go} />
}

function PlayerList({ go }: { go: (route: Route) => void }) {
  const { store, dispatch } = useStore()
  const { t } = useT()
  const [name, setName] = useState('')
  // Le doublon se dit au moment où on l'écrit, et pas par un ajout qui ne se
  // produit pas : deux « Marie » seraient indiscernables partout ailleurs.
  const [error, setError] = useState<string | null>(null)

  const names = Object.fromEntries(store.players.map((player) => [player.id, player.name]))
  const table = ranking(store.players, store.games)

  const countFor = (id: string) => countedGames(id, store.games).length

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (nameTaken(store.players, trimmed)) {
      setError(t('newGame.duplicate'))
      return
    }
    dispatch({ type: 'players/add', name: trimmed, id: newId() })
    setName('')
    setError(null)
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
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
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
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
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
          {/* Ce que le palmarès ne compte pas, dit une fois, là où on le lit. */}
          <p className={styles.hint}>{t('players.countedOnly')}</p>
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
  const [error, setError] = useState<string | null>(null)

  if (!player) {
    return (
      <Screen title={t('players.title')} onBack={() => go({ name: 'players' })}>
        <p className="t-body">{t('players.empty.body')}</p>
      </Screen>
    )
  }

  const stats = playerStats(player.id, store.games)
  const streak = keptStreak(player.id, store.games)
  const byCards = accuracyByCards(player.id, store.games)
  const duels = headToHead(player.id, store.games)
  const timeline = playerTimeline(player.id, store.games)

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
    // La série la plus longue : ce que la moyenne écrase, et ce dont une table
    // se souvient — « il en a tenu six d'affilée ».
    { label: t('players.streak'), value: streak.best > 0 ? number(streak.best) : '—' },
    { label: t('players.bonusPoints'), value: number(stats.bonusPoints) },
  ]

  const rename = () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === player.name) return
    if (nameTaken(store.players, trimmed, player.id)) {
      setError(t('newGame.duplicate'))
      return
    }
    dispatch({ type: 'players/rename', id: player.id, name: trimmed })
    setError(null)
  }

  const remove = () => {
    // La suppression s'annule, comme celle d'une partie : sa place dans la
    // liste part avec elle, et revient avec elle.
    const at = store.players.findIndex((candidate) => candidate.id === player.id)
    dispatch({ type: 'players/remove', id: player.id })
    toast.show(t('players.deleted', { name: player.name }), {
      label: t('action.undo'),
      run: () => dispatch({ type: 'players/restore', player, at }),
    })
    go({ name: 'players' })
  }

  return (
    <Screen title={player.name} onBack={() => go({ name: 'players' })}>
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
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
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
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="stack-tight">
        <h2 className="section-title">{t('players.stats')}</h2>
        {stats.gamesPlayed === 0 ? (
          <p className="t-body">{t('players.noGame')}</p>
        ) : (
          <>
            <dl className={styles.stats}>
              {rows.map((row) => (
                <div key={row.label} className={styles.stat}>
                  <dt className={styles.statLabel}>{row.label}</dt>
                  <dd className={styles.statValue}>{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.hint}>{t('players.countedOnly')}</p>
          </>
        )}
      </section>

      {/*
        Tenir sa mise à une carte et la tenir à neuf ne sont pas le même
        exercice : la moyenne mélange les deux et ne dit rien. Une ligne par
        taille de main, et seulement les tailles réellement jouées.
      */}
      {byCards.length > 1 && (
        <section className="stack-tight">
          <h2 className="section-title">{t('players.byCards')}</h2>
          <p className={styles.hint}>{t('players.byCards.help')}</p>
          <dl className={styles.bars}>
            {byCards.map((row) => (
              <div key={row.cards} className={styles.bar}>
                <dt className={styles.barLabel}>{t('table.cards', { count: row.cards })}</dt>
                <dd className={styles.barValue}>
                  {/* La barre double le chiffre, elle ne le remplace pas :
                      elle est décorative, et le lecteur d'écran lit le texte. */}
                  <span className={styles.barTrack} aria-hidden="true">
                    <span
                      className={styles.barFill}
                      style={{ width: `${Math.round(row.rate * 100)}%` }}
                    />
                  </span>
                  <span className={styles.barText}>
                    {percent(row.rate)} · {t('players.byCards.count', {
                      kept: row.kept,
                      rounds: row.rounds,
                    })}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Le face-à-face : « fini devant », et non « gagné » — à quatre,
          terminer deuxième devant quelqu'un dit quelque chose, la victoire ne
          dit rien des trois autres. */}
      {duels.length > 0 && (
        <section className="stack-tight">
          <h2 className="section-title">{t('players.duels')}</h2>
          <p className={styles.hint}>{t('players.duels.help')}</p>
          {/* Une ligne par adversaire, et non une tuile : la tuile est faite
              pour un chiffre en héros, et il y en a trois ici. En chasse fixe
              elle occupait trois lignes par joueur, pour une phrase. */}
          <dl className={styles.duels}>
            {duels.map((duel) => (
              <div key={duel.opponentId} className={styles.duel}>
                <dt className={styles.duelName}>
                  {store.players.find((candidate) => candidate.id === duel.opponentId)?.name ??
                    t('players.unknown')}
                </dt>
                <dd className={styles.duelValue}>
                  <span className={styles.duelScore}>
                    {duel.ahead}–{duel.behind}
                  </span>
                  <span className={styles.duelMeta}>
                    {t('players.duels.record', {
                      ahead: duel.ahead,
                      behind: duel.behind,
                      shared: duel.shared,
                    })}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {timeline.length > 1 && (
        <section className="stack-tight">
          <h2 className="section-title">{t('chart.trend.title')}</h2>
          <Widget surface="accent" span="md">
            <PlayerTrend points={timeline} />
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
