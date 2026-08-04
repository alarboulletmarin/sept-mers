import { useState, type FormEvent } from 'react'
import { Screen } from '../app/Layout.tsx'
import type { Route } from '../app/Router.tsx'
import { useWakeLock } from '../app/useWakeLock.ts'
import { Button } from '../components/Button.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { useT } from '../i18n/index.ts'
import { Board } from '../share/Board.tsx'
import { normaliseCode } from '../share/code.ts'
import { useSpectator, type WatchState } from '../share/useSpectator.ts'
import styles from './Watch.module.css'

/**
 * Suivre une table : l'écran des autres téléphones. Sans code, on le tape ;
 * avec un code, on suit la partie en lecture seule. Rien de ce qui est reçu
 * n'entre dans le stockage de ce téléphone — l'écran regarde, il n'écrit pas.
 */
export function Watch({ code, go }: { code?: string; go: (route: Route) => void }) {
  const clean = code === undefined ? null : normaliseCode(code)
  if (code === undefined || clean === null) {
    return <JoinForm badCode={code !== undefined} go={go} />
  }
  return <LiveWatch code={clean} go={go} />
}

// ------------------------------------------------------------------ le code

function JoinForm({ badCode, go }: { badCode: boolean; go: (route: Route) => void }) {
  const { t } = useT()
  const [value, setValue] = useState('')
  // Une adresse arrivée avec un faux code vaut une saisie fausse : on le dit.
  const [invalid, setInvalid] = useState(badCode)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const clean = normaliseCode(value)
    if (!clean) {
      setInvalid(true)
      return
    }
    go({ name: 'watch', code: clean })
  }

  return (
    <Screen
      title={t('watch.title')}
      lede={t('watch.lede')}
      onBack={() => go({ name: 'home' })}
    >
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span className="t-label">{t('watch.codeLabel')}</span>
          <input
            className={`input ${styles.codeInput}`}
            value={value}
            onChange={(event) => {
              setValue(event.target.value.toUpperCase())
              setInvalid(false)
            }}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={8}
            data-watch-code-input
          />
        </label>
        {invalid && (
          <p className={styles.formIssue} role="alert">
            {t('watch.invalidCode')}
          </p>
        )}
        <Button variant="primary" type="submit">
          {t('watch.join')}
        </Button>
      </form>
    </Screen>
  )
}

// ------------------------------------------------------------------ le direct

const PILL_STATE: Record<WatchState, string> = {
  connecting: 'connecting',
  live: 'live',
  lost: 'lost',
  ended: 'ended',
  newer: 'ended',
}

function LiveWatch({ code, go }: { code: string; go: (route: Route) => void }) {
  const { t } = useT()
  const { state, payload } = useSpectator(code)
  useWakeLock(state === 'live')

  const pill = (
    <span
      className={`${styles.pill} ${styles[PILL_STATE[state]]}`}
      data-watch-state={state}
      role="status"
    >
      {t(`watch.pill.${state === 'newer' ? 'ended' : state}`)}
    </span>
  )

  return (
    <Screen
      title={t('watch.title')}
      lede={payload ? undefined : t('watch.readOnly')}
      onBack={() => go({ name: 'home' })}
      actions={pill}
    >
      <div className="stack">
        {state === 'newer' && (
          <p className={styles.notice} role="alert">
            {t('watch.newer')}
          </p>
        )}
        {state === 'lost' && payload && <p className={styles.notice}>{t('watch.lost')}</p>}
        {state === 'ended' && payload && !payload.game.endedAt && (
          <p className={styles.notice}>{t('watch.ended')}</p>
        )}

        {payload ? (
          <Board payload={payload} />
        ) : state === 'connecting' ? (
          <EmptyState
            tag={code}
            title={t('watch.connecting')}
            body={t('watch.readOnly')}
          />
        ) : state !== 'newer' ? (
          <EmptyState
            tag={code}
            title={t(state === 'lost' ? 'watch.pill.lost' : 'watch.pill.ended')}
            body={t(state === 'lost' ? 'watch.lost' : 'watch.ended')}
            action={
              <Button variant="secondary" onClick={() => go({ name: 'home' })}>
                {t('summary.backHome')}
              </Button>
            }
          />
        ) : null}
      </div>
    </Screen>
  )
}
