import { useEffect, useMemo, useState } from 'react'
import type { Route } from '../app/Router.tsx'
import { useStore } from '../app/StoreProvider.tsx'
import { useActionBarHeight } from '../app/useActionBar.ts'
import { useWakeLock } from '../app/useWakeLock.ts'
import { Button } from '../components/Button.tsx'
import { BonusDrawer } from '../components/BonusDrawer.tsx'
import { Icon } from '../components/Icon.tsx'
import { PhaseRail, RoundRail } from '../components/Rail.tsx'
import { ScoreTable } from '../components/ScoreTable.tsx'
import { Sheet } from '../components/Sheet.tsx'
import { Stepper } from '../components/Stepper.tsx'
import { Tag, Widget } from '../components/Widget.tsx'
import { useToast } from '../components/Toast.tsx'
import { cardsForRound, deckSize, isCapped } from '../domain/deck.ts'
import { scoreRound } from '../domain/scoring.ts'
import { totals } from '../domain/stats.ts'
import { TOTAL_ROUNDS, bonusIsEmpty, type Id, type RoundBonus } from '../domain/types.ts'
import {
  globalIssues,
  issuesFor,
  remainingTricks,
  sumBids,
  trickTarget,
  validateBids,
  validateBonuses,
  validateRascal,
  validateTricks,
  validateVoided,
  type Issue,
} from '../domain/validation.ts'
import { useT } from '../i18n/index.ts'
import { draftFor, isEditingRound, runningGame } from '../store/reducer.ts'
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

  const deck = deckSize(game.options)
  const cards = cardsForRound(draft.roundIndex, game.playerIds.length, deck)
  const capped = isCapped(draft.roundIndex, game.playerIds.length, deck)
  // Les monstres marins écartent des plis : il y a alors moins à distribuer
  // que de cartes distribuées.
  const target = trickTarget(cards, draft.voided)
  const isEditing = isEditingRound(game, draft)
  const running = totals(game)

  const bidIssues = validateBids(draft.bids, cards, game.playerIds)
  const trickIssues = [
    ...validateVoided(draft.voided, cards),
    ...validateTricks(draft.tricks, cards, game.playerIds, draft.voided),
  ]
  const bonusIssues = [
    ...validateBonuses(draft.bonus, draft.tricks, game.playerIds),
    ...validateRascal(draft.rascal, game.playerIds),
  ]

  const bidsReady = bidIssues.length === 0
  const resultsReady = trickIssues.length === 0 && bonusIssues.length === 0

  const bidTotal = sumBids(draft.bids, game.playerIds)
  const left = remainingTricks(draft.tricks, cards, game.playerIds, draft.voided)

  const isBids = draft.phase === 'bids'

  // On peut reculer sur une manche déjà validée, et revenir. La manche en
  // cours n'est pas perdue pendant ce temps : le réducteur la met de côté.
  const previousRound = draft.roundIndex - 1
  const canGoBack = game.rounds.some((round) => round.index === previousRound)
  const nextRound = draft.roundIndex + 1
  const canGoForward = isEditing

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

  const openPlayer = openBonus
    ? { id: openBonus, name: game.nameSnapshot[openBonus] ?? '' }
    : null

  return (
    <div className="screen">
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.roundWidget}>
            {/*
              La houle : dix traits pour dix manches. On voit où on en est sans
              lire, ce qui compte quand le téléphone passe de main en main.
            */}
            <RoundRail
              total={TOTAL_ROUNDS}
              current={draft.roundIndex}
              label={t('game.round', { round: draft.roundIndex, total: TOTAL_ROUNDS })}
            />

            <div className={styles.roundTop}>
              <div className={styles.tags}>
                <Tag>{t('game.roundLabel')}</Tag>
                <Tag>{t('game.cards', { count: cards })}</Tag>
              </div>
              <div className={styles.roundActions}>
                <button
                  type="button"
                  className={styles.action}
                  aria-label={t('game.scoreTable')}
                  onClick={() => setTableOpen(true)}
                >
                  <Icon name="chart" size={17} />
                </button>
                <button
                  type="button"
                  className={styles.action}
                  aria-label={t('rules.title')}
                  onClick={() => setRulesOpen(true)}
                >
                  <Icon name="book" size={17} />
                </button>
              </div>
            </div>

            {/* Le numéro de manche, et de quoi en changer. Reculer d'une
                manche pour corriger un chiffre est le geste le plus demandé
                d'une partie : il vaut mieux ici, contre le numéro qu'il
                change, que rangé dans le tableau des scores. */}
            <div className={styles.roundLine}>
              <button
                type="button"
                className={styles.step}
                aria-label={t('game.previousRound', { round: previousRound })}
                disabled={!canGoBack}
                onClick={() => dispatch({ type: 'game/editRound', index: previousRound })}
              >
                <Icon name="chevron" rotate="left" size={18} />
              </button>

              <h1 className={styles.roundFigure} data-round={draft.roundIndex}>
                <span className={styles.roundNumber}>{draft.roundIndex}</span>
                <span className={styles.roundTotal}>
                  {t('game.roundOf', { total: TOTAL_ROUNDS })}
                </span>
              </h1>

              <button
                type="button"
                className={styles.step}
                aria-label={t('game.nextRound', { round: nextRound })}
                disabled={!canGoForward}
                onClick={() =>
                  game.rounds.some((round) => round.index === nextRound)
                    ? dispatch({ type: 'game/editRound', index: nextRound })
                    : dispatch({ type: 'game/resumeLive' })
                }
              >
                <Icon name="chevron" size={18} />
              </button>
            </div>

            {/* Les deux temps de la manche, toujours affichés : on mise, puis
                on compte. Personne ne doit avoir à deviner lequel on lui
                demande. */}
            <PhaseRail
              steps={[
                {
                  label: t('game.phase.bids'),
                  current: isBids,
                  done: !isBids,
                  onClick: isBids
                    ? undefined
                    : () => dispatch({ type: 'game/phase', phase: 'bids' }),
                },
                // Cliquer « 2 » vaut valider les mises : c'est le même geste,
                // et la bascule d'un temps à l'autre devient libre. Le bouton
                // de validation reste, pour qui suit l'écran plutôt que la
                // frise.
                {
                  label: t('game.phase.results'),
                  current: !isBids,
                  done: false,
                  onClick: isBids ? goToResults : undefined,
                },
              ]}
            />

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

      <main className="screen-body">
        {capped && <p className={styles.notice}>{t('game.capped', { count: cards })}</p>}

        {isEditing && (
          <div className={styles.notice}>
            <p>{t('game.editing', { round: draft.roundIndex })}</p>
            <button
              type="button"
              className={styles.noticeAction}
              onClick={() => dispatch({ type: 'game/resumeLive' })}
            >
              {t('game.backToLive')}
            </button>
          </div>
        )}

        {/* La consigne du moment, en romain italique : c'est la voix de l'app,
            et c'est ce qui évite de perdre quelqu'un entre deux tuiles. */}
        <p className={`t-lede ${styles.hint}`}>
          {isBids ? t('game.bids.hint') : t('game.results.hint')}
        </p>

        <div className="mosaic">
          {game.playerIds.map((playerId) => (
            <PlayerTile
              key={playerId}
              name={game.nameSnapshot[playerId] ?? ''}
              phase={draft.phase}
              cards={isBids ? cards : target}
              bid={draft.bids[playerId] ?? null}
              tricks={draft.tricks[playerId] ?? null}
              bonus={draft.bonus[playerId]}
              rascal={draft.rascal[playerId] ?? 0}
              auto={!isBids && draft.autoTricks === playerId}
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

          {/* Le Kraken et la Baleine blanche écartent des plis : la somme des
              plis remportés vaut alors moins que le nombre de cartes, et il
              faut bien dire à l'app combien il en manque. */}
          {!isBids && game.options.seaMonsters && (
            <Widget surface="sunken" span="sm" tight marker="voided">
              <h2 className={styles.name}>{t('game.voided')}</h2>
              <Stepper
                max={cards}
                value={draft.voided}
                onChange={(value) => dispatch({ type: 'game/setVoided', voided: value })}
                label={t('game.voided')}
                decreaseLabel={t('a11y.voided.decrease')}
                increaseLabel={t('a11y.voided.increase')}
              />
              <div className={styles.tileMeta}>
                <span className={styles.bidRecall}>{t('game.voided.help')}</span>
              </div>
            </Widget>
          )}
        </div>

        {/* Les anomalies qui portent sur la manche entière et non sur un
            joueur. La somme des plis en faisait partie sans être affichée
            nulle part : le bouton se grisait, et rien ne le disait. */}
        {touched && globalIssues([...trickIssues, ...bonusIssues]).length > 0 && (
          <div className="stack-tight" role="alert">
            {globalIssues([...trickIssues, ...bonusIssues]).map((issue, index) => (
              <p key={index} className={styles.alert}>
                {t(`issue.${issue.code}`, issue.data)}
              </p>
            ))}
          </div>
        )}
      </main>

      <div className="actionbar" ref={actionBar}>
        <div className="actionbar-inner">
          {/* Plus rien n'est « manquant » : tout part rempli. Le pied d'écran
              ne dit donc plus qui reste à saisir, mais où en est la manche. */}
          <p className={styles.counter} role="status">
            {isBids
              ? t('game.bids.sum', { count: bidTotal, bid: bidTotal, cards })
              : left > 0
                ? t('game.results.remaining', { count: left })
                : left < 0
                  ? t('game.results.over', { count: -left })
                  : t('game.results.complete', { count: target })}
          </p>

          {isBids ? (
            <Button variant="primary" onClick={goToResults} disabled={!bidsReady}>
              {t('game.bids.validate')}
            </Button>
          ) : (
            <div className={styles.footRow}>
              <Button onClick={() => dispatch({ type: 'game/phase', phase: 'bids' })}>
                {t('game.bids.back')}
              </Button>
              <Button variant="primary" onClick={commit} disabled={!resultsReady}>
                {t('game.results.validate')}
              </Button>
            </div>
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
              rascal={game.options.advancedPirates ? draft.rascal : null}
              rascalHeldBy={
                game.playerIds
                  .filter((id) => id !== openPlayer.id && (draft.rascal[id] ?? 0) !== 0)
                  .map((id) => game.nameSnapshot[id] ?? '')[0] ?? null
              }
              onRascalChange={(value) =>
                dispatch({ type: 'game/setRascal', playerId: openPlayer.id, value })
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
  /** Pari de Rascal Jack, signé. */
  rascal: number
  /** Tuile dont la valeur se déduit des autres. */
  auto: boolean
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
    rascal,
    auto,
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
  const score =
    !isBids && complete ? scoreRound({ bid, tricks, cards, bonus, rascal, options }) : null
  const bonusCount = Object.values(bonus).reduce((total, count) => total + count, 0)

  return (
    // Tout part rempli : le contraste ne peut plus dire « saisi ou non ». Il
    // dit désormais ce qui reste vrai — qui porte un chiffre, et qui est à
    // zéro.
    <Widget surface={value ? 'accent' : 'card'} span="sm" tight marker="player-tile">
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
            {/* La tuile déduite le dit : sinon son chiffre bouge tout seul
                pendant qu'on saisit les autres, sans que rien l'explique. */}
            {auto ? t('game.results.autofilled') : bid !== null ? t('game.bid', { bid }) : ''}
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
              <Icon name="plus" size={12} />
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
