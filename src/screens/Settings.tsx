import { Fragment, useMemo, useRef, useState } from 'react'
import { Screen } from '../app/Layout.tsx'
import type { Route } from '../app/Router.tsx'
import { useStore } from '../app/StoreProvider.tsx'
import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { OptionSwitch, visibleOptions } from '../components/OptionSwitch.tsx'
import { Sheet } from '../components/Sheet.tsx'
import { Stepper } from '../components/Stepper.tsx'
import { useToast } from '../components/Toast.tsx'
import {
  MAX_FIRST_CARDS,
  MAX_ROUNDS,
  MIN_FIRST_CARDS,
  MIN_ROUNDS,
  type Id,
  type Locale,
  type Store,
  type Theme,
} from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import styles from './Settings.module.css'
import { findTwins, mergeStores, planMerge, type MergePlan } from '../store/merge.ts'
import {
  ImportError,
  emptyStore,
  exportFileName,
  flushStore,
  parseStore,
  serialiseStore,
  type ImportSummary,
} from '../store/storage.ts'

const LOCALES: Locale[] = ['fr', 'en']
const THEMES: Theme[] = ['light', 'dark', 'system']

export function Settings({ go }: { go: (route: Route) => void }) {
  const { store, dispatch } = useStore()
  const { t, date } = useT()
  const toast = useToast()

  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ store: Store; summary: ImportSummary } | null>(null)
  // Le rapprochement proposé reste tel quel : ce que la table en fait vit à
  // côté, dans `links`. Une ligne touchée à la main se reconnaît ainsi, et sa
  // mention (« rapproché par son nom ») cesse de mentir.
  const [plan, setPlan] = useState<MergePlan | null>(null)
  const [links, setLinks] = useState<Record<Id, Id | null>>({})
  const [keep, setKeep] = useState<Id[]>([])
  const [error, setError] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const chosen = useMemo<MergePlan | null>(() => {
    if (!plan || !pending) return null
    const players = plan.players.map((seat) =>
      seat.id in links ? { ...seat, linkTo: links[seat.id] } : seat,
    )
    // Les jumelles se recomptent à chaque rapprochement : tant qu'« Alex »
    // n'est pas rattaché à « Bibi le Boss », la même soirée marquée sur les
    // deux téléphones n'a pas la même table de part et d'autre.
    return { players, twins: findTwins(store, pending.store, players) }
  }, [plan, pending, links, store])

  // L'aperçu et le résultat sont le même calcul : ce que la feuille annonce
  // est exactement ce qui part dans le stockage.
  const preview = useMemo(
    () => (pending && chosen ? mergeStores(store, pending.store, chosen, new Set(keep)) : null),
    [store, pending, chosen, keep],
  )

  const claimed = useMemo(
    () => new Set(chosen?.players.flatMap((seat) => (seat.linkTo ? [seat.linkTo] : [])) ?? []),
    [chosen],
  )

  const exportData = () => {
    flushStore()
    const blob = new Blob([serialiseStore(store)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = exportFileName()
    link.click()
    URL.revokeObjectURL(url)
    toast.show(t('settings.exported'))
  }

  const closeImport = () => {
    setPending(null)
    setPlan(null)
    setLinks({})
    setKeep([])
  }

  const readFile = async (file: File) => {
    setError(null)
    try {
      const parsed = parseStore(await file.text())
      closeImport()
      setPending(parsed)
    } catch (cause) {
      const reason = cause instanceof ImportError ? cause.reason : 'shape'
      setError(t(`settings.import.error.${reason}`))
    }
  }

  const applyImport = () => {
    if (!pending) return
    dispatch({ type: 'store/replace', store: pending.store })
    closeImport()
    toast.show(t('settings.import.done'))
  }

  const startMerge = () => {
    if (!pending) return
    const proposal = planMerge(store, pending.store)
    // Rien à rapprocher, rien à écarter : la fusion n'a aucune question à
    // poser, et une feuille vide serait une étape de plus pour rien.
    if (proposal.players.length === 0 && proposal.twins.length === 0) {
      applyMerge(mergeStores(store, pending.store, proposal).store)
      return
    }
    setPlan(proposal)
  }

  const applyMerge = (merged: Store) => {
    dispatch({ type: 'store/replace', store: merged })
    closeImport()
    toast.show(t('settings.merge.done'))
  }

  const clearAll = () => {
    dispatch({ type: 'store/clear', store: emptyStore() })
    setConfirmClear(false)
    toast.show(t('settings.cleared'))
  }

  return (
    <Screen title={t('settings.title')} lede={t('settings.lede')} onBack={() => go({ name: 'home' })}>
      <section className="stack-tight">
        <h2 className="section-title">{t('settings.language')}</h2>
        <div className="segmented" role="radiogroup" aria-label={t('settings.language')}>
          {LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              role="radio"
              aria-checked={store.settings.locale === locale}
              className="segmented-option"
              onClick={() => dispatch({ type: 'settings/locale', locale })}
            >
              {t(`settings.language.${locale}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="stack-tight">
        <h2 className="section-title">{t('settings.theme')}</h2>
        <div className="segmented" role="radiogroup" aria-label={t('settings.theme')}>
          {THEMES.map((theme) => (
            <button
              key={theme}
              type="button"
              role="radio"
              aria-checked={store.settings.theme === theme}
              className="segmented-option"
              onClick={() => dispatch({ type: 'settings/theme', theme })}
            >
              {t(`settings.theme.${theme}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="stack-tight">
        <h2 className="section-title">{t('settings.defaults')}</h2>
        <div className={styles.panel}>
          {visibleOptions(store.settings.defaultOptions).map(({ key }) => {
            const checked = store.settings.defaultOptions[key]
            return (
              <OptionSwitch
                key={key}
                label={t(`newGame.${key}`)}
                help={t(`newGame.${key}.${checked ? 'on' : 'off'}`)}
                checked={checked}
                onToggle={() =>
                  dispatch({
                    type: 'settings/defaultOptions',
                    // On étale : écrire l'objet en littéral effacerait en
                    // silence les options qu'on n'a pas nommées.
                    options: { ...store.settings.defaultOptions, [key]: !checked },
                  })
                }
              />
            )
          })}
        </div>
      </section>

      {/* Le format des prochaines parties. Il se règle aussi au lancement
          d'une partie, qui est là où on le change vraiment ; ici, c'est pour
          une table qui joue toujours en six manches et ne veut plus y penser. */}
      <section className="stack-tight">
        <h2 className="section-title">{t('settings.format')}</h2>
        <div className={styles.panel}>
          <div className="row-between">
            <span className={styles.formatLabel}>{t('newGame.rounds')}</span>
            <span className={styles.formatStepper}>
              <Stepper
                min={MIN_ROUNDS}
                max={MAX_ROUNDS}
                value={store.settings.defaultFormat.rounds}
                onChange={(rounds) =>
                  dispatch({
                    type: 'settings/defaultFormat',
                    format: { ...store.settings.defaultFormat, rounds },
                  })
                }
                label={t('newGame.rounds')}
                decreaseLabel={t('a11y.rounds.decrease')}
                increaseLabel={t('a11y.rounds.increase')}
              />
            </span>
          </div>
          <hr className={styles.divider} />
          <div className="row-between">
            <span className={styles.formatLabel}>{t('newGame.firstRoundCards')}</span>
            <span className={styles.formatStepper}>
              <Stepper
                min={MIN_FIRST_CARDS}
                max={MAX_FIRST_CARDS}
                value={store.settings.defaultFormat.firstRoundCards}
                onChange={(firstRoundCards) =>
                  dispatch({
                    type: 'settings/defaultFormat',
                    format: { ...store.settings.defaultFormat, firstRoundCards },
                  })
                }
                label={t('newGame.firstRoundCards')}
                decreaseLabel={t('a11y.firstCards.decrease')}
                increaseLabel={t('a11y.firstCards.increase')}
              />
            </span>
          </div>
        </div>
      </section>

      <section className="stack-tight">
        <h2 className="section-title">{t('settings.data')}</h2>
        <div className={styles.panel}>
          <div className="stack-tight">
            <Button onClick={exportData}>{t('settings.export')}</Button>
            <p className={styles.help}>{t('settings.export.help')}</p>
          </div>

          <hr className={styles.divider} />

          <div className="stack-tight">
            <Button onClick={() => fileInput.current?.click()}>{t('settings.import')}</Button>
            <p className={styles.help}>{t('settings.import.help')}</p>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void readFile(file)
                event.target.value = ''
              }}
            />
          </div>

          <hr className={styles.divider} />

          <div className="stack-tight">
            {confirmClear ? (
              <div className="row" style={{ gap: 'var(--space-2)' }}>
                <Button full onClick={() => setConfirmClear(false)}>
                  {t('action.cancel')}
                </Button>
                <Button variant="danger" full onClick={clearAll}>
                  {t('settings.clear')}
                </Button>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setConfirmClear(true)}>
                <Icon name="trash" />
                {t('settings.clear')}
              </Button>
            )}
            <p className={styles.help}>{t('settings.clear.help')}</p>
          </div>
        </div>
        <p className={styles.note}>{t('settings.storage')}</p>
      </section>

      {/* « À propos » a son écran depuis qu'il porte aussi l'explication du
          jeu, l'installation et les mentions : une feuille modale n'est pas un
          endroit où l'on revient. */}
      <section className="stack-tight">
        <Button variant="quiet" onClick={() => go({ name: 'about' })}>
          {t('settings.about')}
        </Button>
      </section>

      {/* L'import n'écrit rien avant que la feuille ait dit ce qu'il va faire.
          Deux chemins : la fusion, qui ajoute, et le remplacement, qui écrase.
          Le second était le seul, et il obligeait une table qui marque sur
          deux téléphones à en choisir un et à jeter l'autre. */}
      <Sheet
        open={Boolean(pending)}
        onClose={closeImport}
        title={chosen ? t('settings.merge.title') : t('settings.import.title')}
      >
        {pending && !chosen && (
          <div className="stack">
            <p className="t-body">
              {t('settings.import.summary', {
                players: pending.summary.players,
                games: pending.summary.games,
                finished: pending.summary.finishedGames,
              })}
            </p>
            <div className="stack-tight">
              <Button variant="primary" onClick={startMerge}>
                {t('settings.import.merge')}
              </Button>
              <p className={styles.help}>{t('settings.import.merge.help')}</p>
            </div>
            <div className="stack-tight">
              <Button variant="danger" full onClick={applyImport}>
                {t('settings.import.replace')}
              </Button>
              <p className={styles.help}>{t('settings.import.replace.help')}</p>
            </div>
            <Button variant="quiet" onClick={closeImport}>
              {t('action.cancel')}
            </Button>
          </div>
        )}

        {pending && chosen && preview && (
          <div className="stack">
            <p className={styles.help}>{t('settings.merge.lede')}</p>

            {chosen.players.length > 0 && (
              <div className={styles.panel}>
                {chosen.players.map((seat, index) => {
                  // Un joueur d'ici déjà réclamé sort des autres listes : deux
                  // sièges sur la même fiche donneraient une partie où
                  // quelqu'un est assis deux fois.
                  const options = store.players.filter(
                    (player) => player.id === seat.linkTo || !claimed.has(player.id),
                  )
                  const renamed =
                    seat.linkTo === null
                      ? preview.summary.renamed.find((row) => row.from === seat.name)
                      : undefined
                  return (
                    <Fragment key={seat.id}>
                      {index > 0 && <hr className={styles.divider} />}
                      <div className={styles.joinRow}>
                        <span className={styles.joinText}>
                          <span className={styles.joinName}>{seat.name}</span>
                          {seat.games > 0 && (
                            <span className={styles.joinMeta}>
                              {t('settings.merge.games', { count: seat.games })}
                            </span>
                          )}
                        </span>
                        <select
                          className={`input ${styles.joinSelect}`}
                          aria-label={t('settings.merge.for', { name: seat.name })}
                          value={seat.linkTo ?? ''}
                          onChange={(event) =>
                            setLinks((current) => ({
                              ...current,
                              [seat.id]: event.target.value || null,
                            }))
                          }
                        >
                          <option value="">{t('settings.merge.asNew')}</option>
                          {options.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* La mention explique le rapprochement proposé : une
                          ligne choisie à la main n'en a plus besoin. */}
                      {!(seat.id in links) && (
                        <p className={styles.joinWhy}>{t(`settings.merge.by.${seat.by}`)}</p>
                      )}
                      {renamed && (
                        <p className={styles.joinWhy}>
                          {t('settings.merge.renamed', { name: renamed.to })}
                        </p>
                      )}
                    </Fragment>
                  )
                })}
              </div>
            )}

            {chosen.twins.length > 0 && (
              <div className="stack-tight">
                <h3 className="section-title">{t('settings.merge.twins')}</h3>
                <p className={styles.help}>{t('settings.merge.twins.help')}</p>
                <div className={styles.panel}>
                  {chosen.twins.map((twin) => (
                    <OptionSwitch
                      key={twin.id}
                      label={t('settings.merge.twins.label', { date: date(twin.startedAt) })}
                      help={t(`settings.merge.twins.${keep.includes(twin.id) ? 'on' : 'off'}`)}
                      checked={keep.includes(twin.id)}
                      onToggle={() =>
                        setKeep((current) =>
                          current.includes(twin.id)
                            ? current.filter((id) => id !== twin.id)
                            : [...current, twin.id],
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            <p className={styles.help}>
              {[
                t('settings.merge.linked', { count: preview.summary.playersLinked }),
                t('settings.merge.added', { count: preview.summary.playersAdded }),
                t('settings.merge.games.added', { count: preview.summary.gamesAdded }),
                t('settings.merge.games.skipped', { count: preview.summary.gamesSkipped }),
              ].join(' · ')}
            </p>
            {preview.summary.closed && (
              <p className={styles.help}>{t('settings.merge.closed')}</p>
            )}

            <Button variant="primary" onClick={() => applyMerge(preview.store)}>
              {t('settings.merge.confirm')}
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setPlan(null)
                setLinks({})
                setKeep([])
              }}
            >
              {t('settings.merge.back')}
            </Button>
          </div>
        )}
      </Sheet>

    </Screen>
  )
}
