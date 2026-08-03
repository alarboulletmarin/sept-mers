import { useMemo, useRef, useState } from 'react'
import { Screen } from '../app/Layout.tsx'
import { useStore } from '../app/StoreProvider.tsx'
import type { Route } from '../app/Router.tsx'
import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { ChipGrid, Initial, PlayerChip } from '../components/PlayerChip.tsx'
import { MAX_PLAYERS, MIN_PLAYERS, type Id } from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import { runningGame } from '../store/reducer.ts'
import { newId } from '../store/storage.ts'
import styles from './NewGame.module.css'

export function NewGame({ go }: { go: (route: Route) => void }) {
  const { store, dispatch } = useStore()
  const { t } = useT()

  const [seated, setSeated] = useState<Id[]>([])
  const [name, setName] = useState('')
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [bonusIfBidMissed, setBonusIfBidMissed] = useState(
    store.settings.lastOptions.bonusIfBidMissed,
  )
  const [nameError, setNameError] = useState<string | null>(null)
  const dragFrom = useRef<number | null>(null)

  const hasRunning = Boolean(runningGame(store))
  const full = seated.length >= MAX_PLAYERS
  const canStart = seated.length >= MIN_PLAYERS && seated.length <= MAX_PLAYERS

  const byId = useMemo(
    () => Object.fromEntries(store.players.map((player) => [player.id, player])),
    [store.players],
  )

  const toggle = (id: Id) => {
    setSeated((current) =>
      current.includes(id)
        ? current.filter((seat) => seat !== id)
        : current.length >= MAX_PLAYERS
          ? current
          : [...current, id],
    )
  }

  const addPlayer = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const exists = store.players.some(
      (player) => player.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) {
      setNameError(t('newGame.duplicate'))
      return
    }
    const id = newId()
    dispatch({ type: 'players/add', name: trimmed, id })
    if (seated.length < MAX_PLAYERS) setSeated((current) => [...current, id])
    setName('')
    setNameError(null)
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= seated.length) return
    setSeated((current) => {
      const next = [...current]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const start = () => {
    if (!canStart) return
    dispatch({
      type: 'game/start',
      playerIds: seated,
      options: { bonusIfBidMissed },
    })
    go({ name: 'game' })
  }

  return (
    <Screen
      title={t('newGame.title')}
      onBack={() => go({ name: 'home' })}
      footer={
        <>
          {!canStart && (
            <p className="t-caption muted" role="status">
              {t('newGame.needMore', { count: MIN_PLAYERS })}
            </p>
          )}
          {hasRunning && canStart && (
            <p className="t-caption muted" role="status">
              {t('newGame.replaceRunning')}
            </p>
          )}
          <Button variant="primary" onClick={start} disabled={!canStart}>
            {t('newGame.start')}
          </Button>
        </>
      }
    >
      <section className="stack-tight">
        <h2 className="section-title">{t('newGame.pickPlayers')}</h2>
        {store.players.length === 0 ? (
          <p className="t-body muted">{t('newGame.noPlayersBody')}</p>
        ) : (
          <>
            <p className="t-caption muted">{t('newGame.pickHint')}</p>
            <ChipGrid>
              {store.players.map((player) => (
                <PlayerChip
                  key={player.id}
                  name={player.name}
                  seat={seated.indexOf(player.id)}
                  selected={seated.includes(player.id)}
                  onToggle={() => toggle(player.id)}
                />
              ))}
            </ChipGrid>
          </>
        )}
        {full && <p className="t-caption muted">{t('newGame.full')}</p>}
      </section>

      <section className="field">
        <label className="section-title" htmlFor="new-player">
          {t('newGame.addPlayer')}
        </label>
        <div className="row">
          <input
            id="new-player"
            className="input"
            value={name}
            autoComplete="off"
            enterKeyHint="done"
            placeholder={t('newGame.addPlayerLabel')}
            onChange={(event) => {
              setName(event.target.value)
              setNameError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addPlayer()
              }
            }}
          />
          <Button onClick={addPlayer} disabled={!name.trim()}>
            <Icon name="plus" />
            {t('newGame.add')}
          </Button>
        </div>
        {nameError && (
          <p className="t-caption missed" role="alert">
            {nameError}
          </p>
        )}
      </section>

      {seated.length > 0 && (
        <section className="stack-tight">
          <h2 className="section-title">{t('newGame.atTable')}</h2>
          <p className="t-caption muted">{t('newGame.atTableHint')}</p>
          <ol className={styles.order}>
            {seated.map((id, index) => {
              const player = byId[id]
              if (!player) return null
              return (
                <li
                  key={id}
                  className={styles.seat}
                  draggable
                  onDragStart={() => {
                    dragFrom.current = index
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (dragFrom.current !== null) move(dragFrom.current, index)
                    dragFrom.current = null
                  }}
                >
                  <span className={styles.grip} aria-hidden="true">
                    <Icon name="grip" />
                  </span>
                  <Initial name={player.name} seat={index} />
                  <span className={styles.seatName}>{player.name}</span>
                  {/* Le glisser-déposer ne suffit pas : les flèches font le
                      même travail au clavier et au doigt. */}
                  <button
                    type="button"
                    className={styles.move}
                    aria-label={t('newGame.moveUp', { name: player.name })}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    <Icon name="chevron" rotate="up" />
                  </button>
                  <button
                    type="button"
                    className={styles.move}
                    aria-label={t('newGame.moveDown', { name: player.name })}
                    disabled={index === seated.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <Icon name="chevron" rotate="down" />
                  </button>
                  <button
                    type="button"
                    className={styles.move}
                    aria-label={t('newGame.remove', { name: player.name })}
                    onClick={() => toggle(id)}
                  >
                    <Icon name="close" />
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <section className="stack-tight">
        <button
          type="button"
          className={styles.disclosure}
          aria-expanded={optionsOpen}
          onClick={() => setOptionsOpen((open) => !open)}
        >
          <span className="section-title">{t('newGame.options')}</span>
          <Icon name="chevron" rotate={optionsOpen ? 'up' : 'down'} className="linkrow-chevron" />
        </button>
        {optionsOpen && (
          <div className="card">
            <button
              type="button"
              role="switch"
              aria-checked={bonusIfBidMissed}
              className="switch"
              onClick={() => setBonusIfBidMissed((value) => !value)}
            >
              <span className="stack-tight" style={{ gap: 2 }}>
                <span className="t-label">{t('newGame.bonusIfBidMissed')}</span>
                <span className="t-caption muted">
                  {bonusIfBidMissed
                    ? t('newGame.bonusIfBidMissed.on')
                    : t('newGame.bonusIfBidMissed.off')}
                </span>
              </span>
              <span className="switch-track">
                <span className="switch-knob" />
              </span>
            </button>
          </div>
        )}
      </section>
    </Screen>
  )
}
