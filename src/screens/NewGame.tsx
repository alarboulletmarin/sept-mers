import { useMemo, useRef, useState } from 'react'
import { Screen } from '../app/Layout.tsx'
import { useStore } from '../app/StoreProvider.tsx'
import type { Route } from '../app/Router.tsx'
import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { OptionSwitch, visibleOptions } from '../components/OptionSwitch.tsx'
import { ChipGrid, PlayerChip } from '../components/PlayerChip.tsx'
import { Stepper } from '../components/Stepper.tsx'
import { deckSize, lastRoundCards } from '../domain/deck.ts'
import {
  MAX_FIRST_CARDS,
  MAX_PLAYERS,
  MAX_ROUNDS,
  MIN_FIRST_CARDS,
  MIN_PLAYERS,
  MIN_ROUNDS,
  type GameFormat,
  type GameOptions,
  type Id,
} from '../domain/types.ts'
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
  // Le réglage par défaut sert de départ : tout éteint à l'installation, puis
  // ce qu'on a choisi dans les réglages ou joué la fois d'avant.
  const [options, setOptions] = useState<GameOptions>(() => ({ ...store.settings.defaultOptions }))
  const toggleOption = (key: keyof GameOptions) => () =>
    setOptions((current) => ({ ...current, [key]: !current[key] }))
  // Le format part lui aussi du réglage, et se fige avec la partie.
  const [format, setFormat] = useState<GameFormat>(() => ({ ...store.settings.defaultFormat }))
  const setFormatKey = (key: keyof GameFormat) => (value: number) =>
    setFormat((current) => ({ ...current, [key]: value }))
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
      options,
      format,
    })
    go({ name: 'game' })
  }

  // Ce que le format donnera vraiment à cette table : le paquet peut mordre
  // avant la dernière manche, et c'est là qu'il faut le dire — pas au milieu
  // de la partie.
  const seats = Math.max(seated.length, MIN_PLAYERS)
  const deck = deckSize(options)
  const lastCards = lastRoundCards(seats, deck, format)
  const wanted = format.firstRoundCards + format.rounds - 1

  return (
    <Screen
      title={t('newGame.title')}
      lede={t('newGame.lede')}
      onBack={() => go({ name: 'home' })}
      footer={
        <>
          {!canStart && (
            <p className={styles.footNote} role="status">
              {t('newGame.needMore', { count: MIN_PLAYERS })}
            </p>
          )}
          {hasRunning && canStart && (
            <p className={styles.footNote} role="status">
              {t('newGame.replaceRunning')}
            </p>
          )}
          <Button variant="primary" onClick={start} disabled={!canStart}>
            {t('newGame.start')}
          </Button>
        </>
      }
    >
      {/* Sans joueur enregistré, la section « qui joue » n'aurait rien à
          montrer : on ouvre directement sur le champ de saisie. */}
      {store.players.length > 0 && (
        <section className="stack-tight">
          <h2 className="section-title">{t('newGame.pickPlayers')}</h2>
          <p className={styles.hint}>{t('newGame.pickHint')}</p>
          <ChipGrid>
            {store.players.map((player) => (
              <PlayerChip
                key={player.id}
                name={player.name}
                selected={seated.includes(player.id)}
                onToggle={() => toggle(player.id)}
              />
            ))}
          </ChipGrid>
          {full && <p className={styles.hint}>{t('newGame.full')}</p>}
        </section>
      )}

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
          <p className={styles.error} role="alert">
            {nameError}
          </p>
        )}
      </section>

      {seated.length > 0 && (
        <section className="stack-tight">
          <h2 className="section-title">{t('newGame.atTable')}</h2>
          <p className={styles.hint}>{t('newGame.atTableHint')}</p>
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
          <Icon name="chevron" rotate={optionsOpen ? 'up' : 'down'} size={16} />
        </button>
        {optionsOpen && (
          <div className={styles.optionPanel}>
            {visibleOptions(options).map(({ key }) => (
              <OptionSwitch
                key={key}
                label={t(`newGame.${key}`)}
                help={t(`newGame.${key}.${options[key] ? 'on' : 'off'}`)}
                checked={options[key]}
                onToggle={toggleOption(key)}
              />
            ))}

            {/* La longueur de la partie et sa première donne. Deux compteurs
                plutôt qu'une liste de formats tout faits : une table qui veut
                six manches à partir de trois cartes n'a pas à trouver son cas
                dans un menu. */}
            <div className={styles.format}>
              <FormatRow
                label={t('newGame.rounds')}
                help={t('newGame.rounds.help')}
                value={format.rounds}
                min={MIN_ROUNDS}
                max={MAX_ROUNDS}
                onChange={setFormatKey('rounds')}
                decreaseLabel={t('a11y.rounds.decrease')}
                increaseLabel={t('a11y.rounds.increase')}
              />
              <FormatRow
                label={t('newGame.firstRoundCards')}
                help={t('newGame.firstRoundCards.help')}
                value={format.firstRoundCards}
                min={MIN_FIRST_CARDS}
                max={MAX_FIRST_CARDS}
                onChange={setFormatKey('firstRoundCards')}
                decreaseLabel={t('a11y.firstCards.decrease')}
                increaseLabel={t('a11y.firstCards.increase')}
              />
              <p className={styles.formatNote}>
                {t('newGame.format.plan', {
                  first: format.firstRoundCards,
                  rounds: format.rounds,
                  last: lastCards,
                })}
                {lastCards < wanted && ` ${t('newGame.format.capped', { count: lastCards })}`}
              </p>
            </div>
          </div>
        )}
      </section>
    </Screen>
  )
}

/**
 * Une ligne de format : son nom, sa phrase, son compteur.
 *
 * La même anatomie que la bascule d'option juste au-dessus — texte à gauche,
 * commande à droite —, pour que le panneau se lise d'un seul mouvement.
 */
function FormatRow({
  label,
  help,
  value,
  min,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
}: {
  label: string
  help: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  decreaseLabel: string
  increaseLabel: string
}) {
  return (
    <div className={styles.formatRow}>
      <span className={styles.formatText}>
        <span className={styles.formatLabel}>{label}</span>
        <span className={styles.formatHelp}>{help}</span>
      </span>
      <span className={styles.formatStepper}>
        <Stepper
          min={min}
          max={max}
          value={value}
          onChange={onChange}
          label={label}
          decreaseLabel={decreaseLabel}
          increaseLabel={increaseLabel}
        />
      </span>
    </div>
  )
}
