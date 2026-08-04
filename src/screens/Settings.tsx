import { useRef, useState } from 'react'
import { Screen } from '../app/Layout.tsx'
import type { Route } from '../app/Router.tsx'
import { useStore } from '../app/StoreProvider.tsx'
import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { OPTIONS, OptionSwitch } from '../components/OptionSwitch.tsx'
import { Sheet } from '../components/Sheet.tsx'
import { useToast } from '../components/Toast.tsx'
import type { Locale, Store, Theme } from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import styles from './Settings.module.css'
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

const APP_VERSION = '1.0.0'

export function Settings({ go }: { go: (route: Route) => void }) {
  const { store, dispatch } = useStore()
  const { t } = useT()
  const toast = useToast()

  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ store: Store; summary: ImportSummary } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

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

  const readFile = async (file: File) => {
    setError(null)
    try {
      setPending(parseStore(await file.text()))
    } catch (cause) {
      const reason = cause instanceof ImportError ? cause.reason : 'shape'
      setError(t(`settings.import.error.${reason}`))
    }
  }

  const applyImport = () => {
    if (!pending) return
    dispatch({ type: 'store/replace', store: pending.store })
    setPending(null)
    toast.show(t('settings.import.done'))
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
          {OPTIONS.map(({ key }) => {
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

      <section className="stack-tight">
        <Button variant="quiet" onClick={() => setAboutOpen(true)}>
          {t('settings.about')}
        </Button>
      </section>

      {/* L'import ne remplace rien avant que l'écran de confirmation ait dit
          ce qu'on va écraser. */}
      <Sheet open={Boolean(pending)} onClose={() => setPending(null)} title={t('settings.import.title')}>
        {pending && (
          <div className="stack">
            <p className="t-body">
              {t('settings.import.summary', {
                players: pending.summary.players,
                games: pending.summary.games,
                finished: pending.summary.finishedGames,
              })}
            </p>
            <p className={styles.help}>{t('settings.import.help')}</p>
            <Button variant="primary" onClick={applyImport}>
              {t('settings.import.replace')}
            </Button>
            <Button variant="quiet" onClick={() => setPending(null)}>
              {t('action.cancel')}
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet open={aboutOpen} onClose={() => setAboutOpen(false)} title={t('about.title')}>
        <div className="stack">
          <p className="t-body">{t('about.what')}</p>
          <p className="t-body">{t('about.offline')}</p>
          <hr className={styles.divider} />
          <p className={styles.help}>{t('about.trademark')}</p>
          <p className={styles.help}>{t('about.rulesRewritten')}</p>
          <p className={styles.help}>{t('about.version', { version: APP_VERSION })}</p>
        </div>
      </Sheet>
    </Screen>
  )
}
