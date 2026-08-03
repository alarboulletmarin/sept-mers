import { useEffect, useMemo, useState } from 'react'
import type { Route } from '../app/Router.tsx'
import { useStore } from '../app/StoreProvider.tsx'
import { useActionBarHeight } from '../app/useActionBar.ts'
import { useWakeLock } from '../app/useWakeLock.ts'
import { Button } from '../components/Button.tsx'
import { BonusDrawer } from '../components/BonusDrawer.tsx'
import { Icon } from '../components/Icon.tsx'
import { NumberPicker } from '../components/NumberPicker.tsx'
import { Initial } from '../components/PlayerChip.tsx'
import { ScoreTable } from '../components/ScoreTable.tsx'
import { Sheet } from '../components/Sheet.tsx'
import { useToast } from '../components/Toast.tsx'
import { cardsForRound, isCapped } from '../domain/deck.ts'
import { scoreRound } from '../domain/scoring.ts'
import { totals } from '../domain/stats.ts'
import { TOTAL_ROUNDS, bonusIsEmpty, type Id, type RoundBonus } from '../domain/types.ts'
import {
  issuesFor,
  remainingTricks,
  soleMissingPlayer,
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

  /**
   * Quand il ne reste qu'un joueur non renseigné, sa valeur se déduit :
   * l'app la pose plutôt que de la faire saisir.
   */
  const setTricks = (playerId: Id, value: number) => {
    dispatch({ type: 'game/setTricks', playerId, tricks: value })

    const after = { ...draft.tricks, [playerId]: value }
    const missing = soleMissingPlayer(after, game.playerIds)
    if (missing === null) return
    const assigned = game.playerIds.reduce((total, id) => total + (after[id] ?? 0), 0)
    const deduced = cards - assigned
    if (deduced >= 0 && deduced <= cards) {
      dispatch({ type: 'game/setTricks', playerId: missing, tricks: deduced })
    }
  }

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

  return (
    <div className="screen">
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerTop}>
            <div className={styles.headerTitle}>
              <span className="t-section">
                {t('game.round', { round: draft.roundIndex, total: TOTAL_ROUNDS })}
              </span>
              <span className="t-caption muted">
                {t('game.cards', { count: cards })} ·{' '}
                {isBids ? t('game.phase.bids') : t('game.phase.results')}
              </span>
            </div>
            <button
              type="button"
              className={styles.headerButton}
              onClick={() => setTableOpen(true)}
            >
              <Icon name="chart" />
              <span className="sr-only">{t('game.scoreTable')}</span>
            </button>
            <button
              type="button"
              className={styles.headerButton}
              onClick={() => setRulesOpen(true)}
            >
              <Icon name="book" />
              <span className="sr-only">{t('game.rulesShortcut')}</span>
            </button>
          </div>

          {game.rounds.length > 0 && (
            <div className={styles.totals}>
              {game.playerIds.map((playerId, seat) => (
                <span key={playerId} className={styles.totalItem}>
                  <Initial name={game.nameSnapshot[playerId] ?? ''} seat={seat} />
                  <span className={styles.totalValue}>{number(running[playerId] ?? 0)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="screen-body" style={{ paddingTop: 'var(--space-4)' }}>
        {capped && (
          <p className="t-caption muted" role="note">
            {t('game.capped', { count: cards })}
          </p>
        )}

        {isEditing && (
          <div className={styles.editingBanner}>
            <span className="t-label">{t('game.editing', { round: draft.roundIndex })}</span>
          </div>
        )}

        <p className="t-caption muted">
          {isBids ? t('game.bids.hint') : t('game.results.hint')}
        </p>

        <div className={styles.rows}>
          {game.playerIds.map((playerId, seat) => (
            <PlayerRow
              key={playerId}
              playerId={playerId}
              seat={seat}
              name={game.nameSnapshot[playerId] ?? ''}
              phase={draft.phase}
              cards={cards}
              bid={draft.bids[playerId] ?? null}
              tricks={draft.tricks[playerId] ?? null}
              bonus={draft.bonus[playerId]}
              bonuses={draft.bonus}
              tricksMap={draft.tricks}
              playerIds={game.playerIds}
              issues={
                touched
                  ? issuesFor(isBids ? bidIssues : [...trickIssues, ...bonusIssues], playerId)
                  : []
              }
              bonusOpen={openBonus === playerId}
              onToggleBonus={() =>
                setOpenBonus((current) => (current === playerId ? null : playerId))
              }
              onBid={(value) => dispatch({ type: 'game/setBid', playerId, bid: value })}
              onTricks={(value) => setTricks(playerId, value)}
              onBonus={(key, value) =>
                dispatch({ type: 'game/setBonus', playerId, key, value })
              }
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
              <div className="row" style={{ gap: 'var(--space-2)' }}>
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

// ------------------------------------------------------------------ la ligne

interface PlayerRowProps {
  playerId: Id
  seat: number
  name: string
  phase: 'bids' | 'results'
  cards: number
  bid: number | null
  tricks: number | null
  bonus: RoundBonus
  bonuses: Record<Id, RoundBonus>
  tricksMap: Record<Id, number | null>
  playerIds: Id[]
  issues: Issue[]
  bonusOpen: boolean
  onToggleBonus: () => void
  onBid: (value: number) => void
  onTricks: (value: number) => void
  onBonus: (key: keyof RoundBonus, value: number) => void
  options: { bonusIfBidMissed: boolean }
  signed: (value: number) => string
  t: (key: string, vars?: Record<string, string | number>) => string
}

function PlayerRow(props: PlayerRowProps) {
  const {
    playerId,
    seat,
    name,
    phase,
    cards,
    bid,
    tricks,
    bonus,
    bonuses,
    tricksMap,
    playerIds,
    issues,
    bonusOpen,
    onToggleBonus,
    onBid,
    onTricks,
    onBonus,
    options,
    signed,
    t,
  } = props

  const isBids = phase === 'bids'
  const complete = bid !== null && tricks !== null

  // Le total s'affiche en direct dès que la ligne est complète.
  const score =
    !isBids && complete
      ? scoreRound({ bid, tricks, cards, bonus, options })
      : null

  const bonusCount = Object.values(bonus).reduce((total, value) => total + value, 0)

  return (
    <section className={`${styles.row} ${issues.length > 0 ? styles.rowInvalid : ''}`}>
      <header className={styles.rowHead}>
        <Initial name={name} seat={seat} />
        <span className={`${styles.rowName} t-section`}>{name}</span>
        {!isBids && bid !== null && (
          <span className={styles.rowBid}>{t('game.bid', { bid })}</span>
        )}
        {score && (
          <span className={`${styles.rowTotal} ${score.total < 0 ? 'missed' : 'kept'}`}>
            {signed(score.total)}
          </span>
        )}
      </header>

      <NumberPicker
        max={cards}
        value={isBids ? bid : tricks}
        onChange={isBids ? onBid : onTricks}
        label={
          isBids
            ? `${t('game.phase.bids')} — ${name}`
            : `${t('game.phase.results')} — ${name}`
        }
        optionLabel={(value) => t('a11y.selectValue', { value, name })}
      />

      {issues.map((issue, index) => (
        <p key={index} className={styles.rowIssue} role="alert">
          {t(`issue.${issue.code}`, issue.data)}
        </p>
      ))}

      {!isBids && (
        <>
          <div className={styles.rowFoot}>
            <button
              type="button"
              className={`${styles.bonusToggle} ${bonusCount > 0 ? styles.bonusActive : ''}`}
              aria-expanded={bonusOpen}
              onClick={onToggleBonus}
            >
              {bonusCount > 0 ? t('game.bonusCount', { count: bonusCount }) : t('game.bonus')}
              <Icon name="chevron" rotate={bonusOpen ? 'up' : 'down'} size={16} />
            </button>
            {!bonusOpen && bonusIsEmpty(bonus) && (
              <span className="t-caption muted">{t('bonus.none')}</span>
            )}
          </div>

          {bonusOpen && (
            <BonusDrawer
              playerId={playerId}
              playerIds={playerIds}
              bonuses={bonuses}
              tricks={tricksMap}
              onChange={onBonus}
            />
          )}
        </>
      )}
    </section>
  )
}
