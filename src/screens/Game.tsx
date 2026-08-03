import { useEffect, useMemo, useState } from 'react'
import type { Route } from '../app/Router.tsx'
import { useStore } from '../app/StoreProvider.tsx'
import { useActionBarHeight } from '../app/useActionBar.ts'
import { useWakeLock } from '../app/useWakeLock.ts'
import { Button } from '../components/Button.tsx'
import { BonusDrawer } from '../components/BonusDrawer.tsx'
import { Icon } from '../components/Icon.tsx'
import { ScoreTable } from '../components/ScoreTable.tsx'
import { Sheet } from '../components/Sheet.tsx'
import { Stepper } from '../components/Stepper.tsx'
import { Tag, Widget } from '../components/Widget.tsx'
import { useToast } from '../components/Toast.tsx'
import { cardsForRound, isCapped } from '../domain/deck.ts'
import { scoreRound } from '../domain/scoring.ts'
import { totals } from '../domain/stats.ts'
import { TOTAL_ROUNDS, bonusIsEmpty, type Id, type RoundBonus } from '../domain/types.ts'
import {
  issuesFor,
  remainingTricks,
  sumBids,
  validateBids,
  validateBonuses,
  validateTricks,
  type Issue,
} from '../domain/validation.ts'
import { useT } from '../i18n/index.ts'
import { draftFor, runningGame } from '../store/reducer.ts'
import { RulesBody } from '../content/RulesBody.tsx'
import styles from './Game.module.css'

export function Game({ go }: { go: (route: Route) => void }) {
  const { store, dispatch } = useStore()
  const { t, number, signed } = useT()
  const toast = useToast()
  const actionBar = useActionBarHeight<HTMLDivElement>()

  const game = runningGame(store)
  const [openBonus, setOpenBonus] = useState<Id | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)
  const [touched, setTouched] = useState(false)

  useWakeLock(Boolean(game))

  // Une partie terminée pendant qu'on est sur l'écran renvoie au résultat.
  useEffect(() => {
    if (!game) go({ name: 'home' })
    else if (game.rounds.length >= TOTAL_ROUNDS) go({ name: 'summary' })
  }, [game, go])

  const draft = useMemo(() => (game ? draftFor(store, game) : null), [store, game])

  if (!game || !draft) return null

  const cards = cardsForRound(draft.roundIndex, game.playerIds.length)
  const capped = isCapped(draft.roundIndex, game.playerIds.length)
  const isEditing = game.rounds.some((round) => round.index === draft.roundIndex)
  const running = totals(game)

  const bidIssues = validateBids(draft.bids, cards, game.playerIds)
  const trickIssues = validateTricks(draft.tricks, cards, game.playerIds)
  const bonusIssues = validateBonuses(draft.bonus, draft.tricks, game.playerIds)

  const bidsReady = bidIssues.length === 0
  const resultsReady = trickIssues.length === 0 && bonusIssues.length === 0

  const bidTotal = sumBids(draft.bids, game.playerIds)
  const left = remainingTricks(draft.tricks, cards, game.playerIds)

  const commit = () => {
    if (!resultsReady) {
      setTouched(true)
      return
    }
    const savedRound = draft.roundIndex
    dispatch({ type: 'game/commitRound' })
    setOpenBonus(null)
    setTouched(false)
    toast.show(t('game.saved', { round: savedRound }), {
      label: t('action.undo'),
      run: () => dispatch({ type: 'game/undoRound' }),
    })
  }

  const goToResults = () => {
    if (!bidsReady) {
      setTouched(true)
      return
    }
    setTouched(false)
    dispatch({ type: 'game/phase', phase: 'results' })
  }

  const isBids = draft.phase === 'bids'
  const openPlayer = openBonus
    ? { id: openBonus, name: game.nameSnapshot[openBonus] ?? '' }
    : null

  return (
    <div className="screen">
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.roundWidget}>
            <div className={styles.roundTop}>
              <div className={styles.roundLeft}>
                <Tag>{t('game.roundLabel')}</Tag>
                <h1 className={styles.roundFigure} data-round={draft.roundIndex}>
                  <span className={styles.roundNumber}>{draft.roundIndex}</span>
                  <span className={styles.roundTotal}>/ {TOTAL_ROUNDS}</span>
                </h1>
                <p className={styles.roundCaption}>
                  {t('game.cards', { count: cards })} ·{' '}
                  {isBids ? t('game.phase.bids') : t('game.phase.results')}
                </p>
              </div>
              <div className={styles.roundActions}>
                <button
                  type="button"
                  className={styles.action}
                  aria-label={t('game.scoreTable')}
                  onClick={() => setTableOpen(true)}
                >
                  <Icon name="chart" size={18} />
                </button>
                <button
                  type="button"
                  className={styles.action}
                  aria-label={t('rules.title')}
                  onClick={() => setRulesOpen(true)}
                >
                  <Icon name="book" size={18} />
                </button>
              </div>
            </div>

            {game.rounds.length > 0 && (
              <div className={styles.totals}>
                {game.playerIds.map((playerId) => (
                  <span key={playerId} className={styles.totalItem}>
                    <span className={styles.totalName}>{game.nameSnapshot[playerId]}</span>
                    <span className={styles.totalValue}>{number(running[playerId] ?? 0)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="screen-body" style={{ paddingTop: 'var(--space-4)' }}>
        {capped && <p className={styles.notice}>{t('game.capped', { count: cards })}</p>}

        {isEditing && (
          <p className={styles.notice}>{t('game.editing', { round: draft.roundIndex })}</p>
        )}

        <p className={styles.hint}>
          {isBids ? t('game.bids.hint') : t('game.results.hint')}
        </p>

        <div className="mosaic">
          {game.playerIds.map((playerId) => (
            <PlayerTile
              key={playerId}
              name={game.nameSnapshot[playerId] ?? ''}
              phase={draft.phase}
              cards={cards}
              bid={draft.bids[playerId] ?? null}
              tricks={draft.tricks[playerId] ?? null}
              bonus={draft.bonus[playerId]}
              issues={
                touched
                  ? issuesFor(isBids ? bidIssues : [...trickIssues, ...bonusIssues], playerId)
                  : []
              }
              onBid={(value) => dispatch({ type: 'game/setBid', playerId, bid: value })}
              onTricks={(value) =>
                dispatch({ type: 'game/setTricks', playerId, tricks: value })
              }
              onOpenBonus={() => setOpenBonus(playerId)}
              options={game.options}
              signed={signed}
              t={t}
            />
          ))}
        </div>

        {touched && bonusIssues.filter((issue) => !issue.playerId).length > 0 && (
          <div className="stack-tight" role="alert">
            {bonusIssues
              .filter((issue) => !issue.playerId)
              .map((issue, index) => (
                <p key={index} className="t-caption missed">
                  {t(`issue.${issue.code}`, issue.data)}
                </p>
              ))}
          </div>
        )}
      </main>

      <div className="actionbar" ref={actionBar}>
        <div className="actionbar-inner">
          {isBids ? (
            <>
              <p className={`${styles.counter} t-caption muted`} role="status">
                {t('game.bids.sum', { count: bidTotal, bid: bidTotal, cards })}
              </p>
              <Button variant="primary" onClick={goToResults} disabled={!bidsReady}>
                {t('game.bids.validate')}
              </Button>
            </>
          ) : (
            <>
              <p
                className={`${styles.counter} t-caption ${left === 0 ? 'muted' : styles.counterWarn}`}
                role="status"
              >
                {left > 0
                  ? t('game.results.remaining', { count: left })
                  : left < 0
                    ? t('game.results.over', { count: -left })
                    : t('game.results.complete', { count: cards })}
              </p>
              <div className={styles.footRow}>
                <Button onClick={() => dispatch({ type: 'game/phase', phase: 'bids' })}>
                  {t('game.bids.back')}
                </Button>
                <Button variant="primary" onClick={commit} disabled={!resultsReady}>
                  {t('game.results.validate')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Les bonus vivent dans une feuille : le tiroir sous la ligne était
          introuvable, et une tuile n'a pas la place de cinq compteurs. */}
      <Sheet
        open={Boolean(openPlayer)}
        onClose={() => setOpenBonus(null)}
        title={openPlayer ? t('bonus.title', { name: openPlayer.name }) : ''}
      >
        {openPlayer && (
          <div className="stack">
            <BonusDrawer
              playerId={openPlayer.id}
              playerIds={game.playerIds}
              bonuses={draft.bonus}
              tricks={draft.tricks}
              onChange={(key, value) =>
                dispatch({ type: 'game/setBonus', playerId: openPlayer.id, key, value })
              }
            />
            <Button variant="primary" onClick={() => setOpenBonus(null)}>
              {t('action.done')}
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet open={rulesOpen} onClose={() => setRulesOpen(false)} title={t('rules.quick')}>
        <RulesBody quickFirst />
      </Sheet>

      <Sheet open={tableOpen} onClose={() => setTableOpen(false)} title={t('game.scoreTable')}>
        <div className="stack">
          <ScoreTable
            game={game}
            currentRound={draft.roundIndex}
            onEditRound={(index) => {
              dispatch({ type: 'game/editRound', index })
              setTableOpen(false)
              setTouched(false)
            }}
          />
          <Button
            variant="quiet"
            onClick={() => {
              setTableOpen(false)
              go({ name: 'home' })
            }}
          >
            {t('game.leave')}
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

// ------------------------------------------------------------------ la tuile

interface PlayerTileProps {
  name: string
  phase: 'bids' | 'results'
  cards: number
  bid: number | null
  tricks: number | null
  bonus: RoundBonus
  issues: Issue[]
  onBid: (value: number) => void
  onTricks: (value: number) => void
  onOpenBonus: () => void
  options: { bonusIfBidMissed: boolean }
  signed: (value: number) => string
  t: (key: string, vars?: Record<string, string | number>) => string
}

function PlayerTile(props: PlayerTileProps) {
  const {
    name,
    phase,
    cards,
    bid,
    tricks,
    bonus,
    issues,
    onBid,
    onTricks,
    onOpenBonus,
    options,
    signed,
    t,
  } = props

  const isBids = phase === 'bids'
  const value = isBids ? bid : tricks
  const complete = bid !== null && tricks !== null

  // Le total s'affiche en direct dès que la ligne est complète.
  const score = !isBids && complete ? scoreRound({ bid, tricks, cards, bonus, options }) : null
  const bonusCount = Object.values(bonus).reduce((total, count) => total + count, 0)

  return (
    <Widget
      surface={value === null ? 'foam' : 'sand'}
      span="sm"
      tight
      marker="player-tile"
    >
      {/* Le nom entier : deux joueurs en « D » doivent rester distinguables,
          et la couleur ne doit jamais porter seule l'information. */}
      <h2 className={styles.name}>{name}</h2>

      <Stepper
        max={cards}
        value={value}
        onChange={isBids ? onBid : onTricks}
        label={`${isBids ? t('game.phase.bids') : t('game.phase.results')} — ${name}`}
        decreaseLabel={t('a11y.decrease', { name })}
        increaseLabel={t('a11y.increase', { name })}
      />

      {!isBids && (
        <div className={styles.tileMeta}>
          <span className={styles.bidRecall}>
            {bid !== null ? t('game.bid', { bid }) : ''}
          </span>
          {score && <span className={styles.tileScore}>{signed(score.total)}</span>}
        </div>
      )}

      {!isBids && (
        <button
          type="button"
          className={`${styles.bonusButton} ${bonusIsEmpty(bonus) ? '' : styles.bonusSet}`}
          onClick={onOpenBonus}
        >
          {bonusIsEmpty(bonus) ? (
            <>
              <Icon name="plus" size={13} />
              {t('game.bonus')}
            </>
          ) : (
            t('game.bonusCount', { count: bonusCount })
          )}
        </button>
      )}

      {issues.map((issue, index) => (
        <p key={index} className={styles.tileIssue} role="alert">
          {t(`issue.${issue.code}`, issue.data)}
        </p>
      ))}
    </Widget>
  )
}
