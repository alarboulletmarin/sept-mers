import { useEffect, useState } from 'react'
import { Screen } from '../app/Layout.tsx'
import type { Route } from '../app/Router.tsx'
import { Button } from '../components/Button.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { useT } from '../i18n/index.ts'
import { Board } from '../share/Board.tsx'
import { SnapshotError, decodeSnapshot } from '../share/codec.ts'
import type { SpectatorPayload } from '../share/protocol.ts'
import styles from './Recap.module.css'

/**
 * Un résumé reçu : la partie entière, portée par le fragment de l'adresse.
 * Rien n'arrive d'un serveur, rien ne s'enregistre ici — l'écran déplie, il
 * durcit, il montre. Un lien abîmé se dit, il ne s'affiche pas à moitié.
 */
export function Recap({ go }: { go: (route: Route) => void }) {
  const { t } = useT()
  // Le fragment se lit au premier rendu, avant tout effet : la remise en forme
  // du routeur le préserve désormais, mais rien ne doit dépendre de cet ordre.
  const [hash] = useState(() => (typeof location === 'undefined' ? '' : location.hash))
  const [payload, setPayload] = useState<SpectatorPayload | null>(null)
  const [failure, setFailure] = useState<'format' | 'version' | 'data' | null>(null)

  useEffect(() => {
    let alive = true
    decodeSnapshot(hash).then(
      (decoded) => {
        if (alive) setPayload(decoded)
      },
      (error: unknown) => {
        if (alive) setFailure(error instanceof SnapshotError ? error.reason : 'format')
      },
    )
    return () => {
      alive = false
    }
  }, [hash])

  return (
    <Screen title={t('recap.title')} lede={t('recap.lede')} onBack={() => go({ name: 'home' })}>
      {failure ? (
        <EmptyState
          title={t('recap.invalid')}
          body={t(failure === 'version' ? 'recap.newer' : 'recap.invalidBody')}
          action={
            <Button variant="secondary" onClick={() => go({ name: 'home' })}>
              {t('summary.backHome')}
            </Button>
          }
        />
      ) : payload ? (
        <div className="stack">
          {!payload.game.endedAt && <p className={styles.notice}>{t('recap.running')}</p>}
          <Board payload={payload} />
        </div>
      ) : null}
    </Screen>
  )
}
