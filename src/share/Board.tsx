import { AccuracyBars } from '../charts/AccuracyBars.tsx'
import { ScoreLines } from '../charts/ScoreLines.tsx'
import { PhaseRail, RoundRail } from '../components/Rail.tsx'
import { ScoreTable } from '../components/ScoreTable.tsx'
import { Caption, Figure, Tag, Widget, WidgetTitle } from '../components/Widget.tsx'
import { cardsForRound, deckSize, isCapped } from '../domain/deck.ts'
import { scoreRound } from '../domain/scoring.ts'
import { standings, totals, winnerIds } from '../domain/stats.ts'
import {
  GREY_BEARD,
  dealerFor,
  hasGreyBeard,
  voidedBy,
  voidsTricks,
  type Draft,
  type Game,
  type Id,
  type RoundBonus,
} from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import { bidRecall } from '../i18n/recall.ts'
import { isEditingRound } from '../store/reducer.ts'
import type { SpectatorPayload } from './protocol.ts'
import styles from './Board.module.css'

/**
 * Le tableau de bord en lecture seule : ce que voit un téléphone qui suit la
 * table, en direct comme depuis un lien-résumé. Tout se dérive de la charge
 * reçue — la partie, et la saisie en cours quand il y en a une — par les mêmes
 * fonctions pures que l'écran de saisie. Rien ici ne touche au `Store` du
 * téléphone qui regarde.
 */
export function Board({ payload }: { payload: SpectatorPayload }) {
  const { game, draft } = payload
  // Toutes les manches jouées sans saisie rouverte : le résultat, même si la
  // table n'a pas encore touché « Terminer ». Une correction en cours ramène au
  // tableau de manche, avis compris.
  const complete = Boolean(game.endedAt) || (game.rounds.length >= game.format.rounds && !draft)
  if (complete) return <FinishedBoard game={game} />
  return <RunningBoard game={game} draft={draft} />
}

// ------------------------------------------------------------ partie en cours

function RunningBoard({ game, draft }: { game: Game; draft?: Draft }) {
  const { t, number, signed } = useT()

  const running = totals(game)
  const totalRounds = game.format.rounds
  const first = game.format.firstRoundCards
  const lastRound = game.rounds.reduce((last, round) => Math.max(last, round.index), 0)
  const roundIndex = draft?.roundIndex ?? Math.min(lastRound + 1, totalRounds)
  const deck = deckSize(game.options)
  const cards = cardsForRound(roundIndex, game.playerIds.length, deck, first)
  const capped = isCapped(roundIndex, game.playerIds.length, deck, first)
  const isBids = draft?.phase !== 'results'
  const greyBeard = hasGreyBeard(game.playerIds.length)
  const showCharge = game.options.rascalScoring && game.options.cannonball
  const editing = Boolean(draft) && isEditingRound(game, draft as Draft)
  // Le même donneur que sur le téléphone de la table : il se déduit de la
  // manche et de l'ordre à table, donc rien n'a besoin de voyager pour lui.
  const dealer = dealerFor(roundIndex, game.playerIds)

  return (
    <div className="stack">
      <div className={styles.board}>
        <RoundRail
          total={totalRounds}
          current={roundIndex}
          label={t('game.round', { round: roundIndex, total: totalRounds })}
        />

        <div className={styles.tags}>
          <Tag>{t('game.roundLabel')}</Tag>
          <Tag>{t('game.cards', { count: cards })}</Tag>
        </div>

        <h2 className={styles.roundFigure}>
          <span className={styles.roundNumber}>{roundIndex}</span>
          <span className={styles.roundTotal}>{t('game.roundOf', { total: totalRounds })}</span>
        </h2>

        {draft && (
          <PhaseRail
            steps={[
              { label: t('game.phase.bids'), current: isBids, done: !isBids },
              { label: t('game.phase.results'), current: !isBids, done: false },
            ]}
          />
        )}

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

      {capped && <p className={styles.notice}>{t('game.capped', { count: cards })}</p>}
      {editing && <p className={styles.notice}>{t('game.editing', { round: roundIndex })}</p>}

      <p className={`t-lede ${styles.hint}`}>
        {!draft
          ? t('watch.betweenRounds', { round: lastRound })
          : isBids
            ? t('game.bids.hint')
            : t('game.results.hint')}
      </p>

      {draft && (
        <div className="mosaic">
          {game.playerIds.map((playerId) => (
            <WatchTile
              key={playerId}
              game={game}
              draft={draft}
              playerId={playerId}
              dealer={playerId === dealer}
              cards={cards}
              isBids={isBids}
              showCharge={showCharge}
              signed={signed}
              t={t}
            />
          ))}

          {!isBids && greyBeard && (
            <Widget surface="sunken" span="sm" tight marker="watch-grey-beard">
              <h3 className={styles.name}>{t('game.greyBeard')}</h3>
              <ReadOnlyValue value={draft.tricks[GREY_BEARD] ?? 0} />
              <div className={styles.tileMeta}>
                <span className={styles.bidRecall}>{t('game.greyBeard.help')}</span>
              </div>
            </Widget>
          )}

          {!isBids && voidsTricks(game.options) && (
            <Widget surface="sunken" span="sm" tight marker="watch-voided">
              <h3 className={styles.name}>{t('game.voided')}</h3>
              <ReadOnlyValue value={draft.voided} />
              <div className={styles.tileMeta}>
                <span className={styles.bidRecall}>
                  {t(`game.voided.help.${voidedBy(game.options)}`)}
                </span>
              </div>
            </Widget>
          )}
        </div>
      )}

      {game.rounds.length > 0 && (
        <Widget surface="card" span="lg">
          <Tag>{t('summary.rounds')}</Tag>
          <ScoreTable game={game} currentRound={draft?.roundIndex} />
        </Widget>
      )}
    </div>
  )
}

// ------------------------------------------------------------- partie finie

function FinishedBoard({ game }: { game: Game }) {
  const { t, number, date } = useT()
  const table = standings(game)
  const winners = winnerIds(game)
  const winnerNames = winners.map((id) => game.nameSnapshot[id]).join(', ')

  return (
    <div className="mosaic">
      <Widget surface="accent" span="md">
        <Tag>{t('summary.readOnly', { date: date(game.endedAt ?? game.startedAt) })}</Tag>
        <WidgetTitle>
          {winners.length > 1
            ? t('summary.winners', { names: winnerNames })
            : t('summary.winner', { name: winnerNames })}
        </WidgetTitle>
        <Figure hero>{number(table[0].total)}</Figure>
        {table[0].gapToNext > 0 && (
          <Caption>{t('summary.gap', { gap: number(table[0].gapToNext) })}</Caption>
        )}
      </Widget>

      {table.slice(1).map((row) => (
        <Widget key={row.playerId} surface="card" span="sm" tight>
          <Tag>{row.rank === 1 ? t('summary.rankFirst') : t('summary.rank', { rank: row.rank })}</Tag>
          <span className={styles.rankName}>{game.nameSnapshot[row.playerId]}</span>
          <Figure>{number(row.total)}</Figure>
          {row.gapToNext > 0 && (
            <Caption>{t('summary.gap', { gap: number(row.gapToNext) })}</Caption>
          )}
        </Widget>
      ))}

      <Widget surface="accent" span="md">
        <Tag>{t('chart.scores.title')}</Tag>
        <ScoreLines game={game} />
      </Widget>

      <Widget surface="sunken" span="md">
        <Tag>{t('chart.accuracy.title')}</Tag>
        <AccuracyBars game={game} />
      </Widget>

      <Widget surface="card" span="lg">
        <Tag>{t('summary.rounds')}</Tag>
        <ScoreTable game={game} />
      </Widget>
    </div>
  )
}

// ------------------------------------------------------------------ la tuile

const bonusCount = (bonus: RoundBonus | undefined): number =>
  bonus ? Object.values(bonus).reduce((total, count) => total + count, 0) : 0

function ReadOnlyValue({ value }: { value: number | null }) {
  return (
    <span className={styles.value}>
      {value === null ? <span className={styles.slot} aria-hidden="true" /> : value}
    </span>
  )
}

interface WatchTileProps {
  game: Game
  draft: Draft
  playerId: Id
  /** Vrai pour celui qui donne cette manche. */
  dealer: boolean
  cards: number
  isBids: boolean
  showCharge: boolean
  signed: (value: number) => string
  t: (key: string, vars?: Record<string, string | number>) => string
}

function WatchTile({
  game,
  draft,
  playerId,
  dealer,
  cards,
  isBids,
  showCharge,
  signed,
  t,
}: WatchTileProps) {
  const bid = draft.bids[playerId] ?? null
  const tricks = draft.tricks[playerId] ?? null
  const bonus = draft.bonus[playerId]
  const rascal = draft.rascal[playerId] ?? 0
  const harry = draft.harry[playerId] ?? 0
  const cannonball = draft.cannonball[playerId] ?? false
  const value = isBids ? bid : tricks
  const complete = bid !== null && tricks !== null

  const score =
    !isBids && complete
      ? scoreRound({ bid, tricks, cards, bonus, rascal, harry, cannonball, options: game.options })
      : null
  const halved = Boolean(
    score &&
      game.options.rascalScoring &&
      score.gap === 1 &&
      !(game.options.cannonball && cannonball),
  )
  const count = bonusCount(bonus)

  return (
    // Le même contraste que la tuile de saisie : il dit qui porte un chiffre,
    // pas qui a fini de saisir.
    <Widget surface={value ? 'accent' : 'card'} span="sm" tight marker="watch-tile">
      <h3 className={styles.name}>
        {game.nameSnapshot[playerId] ?? ''}
        {dealer && <span className={styles.dealer}>{t('game.dealer')}</span>}
      </h3>

      <ReadOnlyValue value={value} />

      {isBids && showCharge && (
        <div className={styles.tileMeta}>
          <span className={styles.bidRecall}>
            {t(`game.charge.${cannonball ? 'cannonball' : 'grapeshot'}`)}
          </span>
        </div>
      )}

      {!isBids && (
        <div className={styles.tileMeta}>
          <span className={styles.bidRecall}>
            {bid === null
              ? ''
              : bidRecall(t, { bid, harry, halved, cannonball: showCharge && cannonball })}
          </span>
          {score && <span className={styles.tileScore}>{signed(score.total)}</span>}
        </div>
      )}

      {!isBids && count > 0 && (
        <div className={styles.tileMeta}>
          <span className={styles.bidRecall}>{t('game.bonusCount', { count })}</span>
        </div>
      )}
    </Widget>
  )
}
