import { useEffect, useState } from 'react'
import { Button } from '../components/Button.tsx'
import { QrCode } from '../components/QrCode.tsx'
import { useToast } from '../components/Toast.tsx'
import type { Draft, Game } from '../domain/types.ts'
import { useT } from '../i18n/index.ts'
import { encodeSnapshot, snapshotUrl } from './codec.ts'
import { useShare } from './ShareProvider.tsx'
import styles from './ShareSheet.module.css'

interface ShareSheetProps {
  game: Game
  /** La saisie en cours, pour que le résumé fige aussi la manche ouverte. */
  draft?: Draft
  /**
   * Faux quand il n'y a pas de direct à lancer d'ici — un résumé, une partie
   * de l'historique. Une salle déjà ouverte se montre quand même : on doit
   * toujours pouvoir l'arrêter de là où on est.
   */
  live?: boolean
}

/**
 * Le panneau du partage, côté table. Deux blocs : le direct — code de salle,
 * QR de l'adresse, compteur, et ses blocages nommés — puis le lien-résumé,
 * qui fige la partie dans l'adresse elle-même et marche sans réseau du tout.
 */
export function ShareSheet({ game, draft, live = true }: ShareSheetProps) {
  const share = useShare()
  const origin = typeof location === 'undefined' ? '' : location.origin
  const showLive = live || share.status !== 'off'

  return (
    <div className="stack">
      {showLive && <LiveBlock game={game} origin={origin} />}
      <SnapshotBlock game={game} draft={draft} origin={origin} withTitle={showLive} />
    </div>
  )
}

// ------------------------------------------------------------------ le direct

function LiveBlock({ game, origin }: { game: Game; origin: string }) {
  const { t } = useT()
  const share = useShare()
  const joinUrl = share.code ? `${origin}/watch/${share.code}` : null

  return (
    <>
      {share.status === 'on' && share.code && joinUrl ? (
        <>
          <div className={styles.codeBox}>
            <span className={styles.codeLabel}>{t('share.code')}</span>
            <span className={styles.code} data-share-code="">
              {share.code}
            </span>
          </div>
          <QrCode value={joinUrl} label={t('share.qrLabel')} />
          <p className={styles.scanHint}>{t('share.scanHint')}</p>
          <p className={styles.address}>{joinUrl}</p>
          <p className={styles.meta} role="status">
            {t('share.connected', { count: share.peers })}
          </p>
          <Button variant="danger" onClick={share.stop}>
            {t('share.stop')}
          </Button>
        </>
      ) : share.status === 'starting' ? (
        <p className={styles.meta} role="status">
          {t('share.starting')}
        </p>
      ) : share.status === 'error' ? (
        <>
          <p className={styles.issue} role="alert">
            {t(share.reason === 'offline' ? 'share.offline' : 'share.error')}
          </p>
          <Button variant="primary" onClick={() => share.start(game.id)}>
            {t('share.retry')}
          </Button>
        </>
      ) : (
        <>
          <p className="t-body">{t('share.lede')}</p>
          <Button variant="primary" onClick={() => share.start(game.id)}>
            {t('share.start')}
          </Button>
        </>
      )}
      <p className={styles.privacy}>{t('share.privacy')}</p>
    </>
  )
}

// ------------------------------------------------------------------ le résumé

function SnapshotBlock({
  game,
  draft,
  origin,
  withTitle,
}: {
  game: Game
  draft?: Draft
  origin: string
  withTitle: boolean
}) {
  const { t } = useT()
  const toast = useToast()
  const [encoded, setEncoded] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void encodeSnapshot(draft ? { game, draft } : { game }).then((value) => {
      if (alive) setEncoded(value)
    })
    return () => {
      alive = false
    }
  }, [game, draft])

  const recapUrl = encoded ? snapshotUrl(origin, encoded) : null
  const canSend = typeof navigator !== 'undefined' && 'share' in navigator

  const copy = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => toast.show(t('share.copied')),
      () => {
        // Presse-papier refusé : l'adresse est affichée, elle se copie à la main.
      },
    )
  }

  if (!recapUrl) return null

  return (
    <>
      {withTitle && <h3 className="section-title">{t('share.snapshot')}</h3>}
      <p className={styles.snapshotHelp}>{t('share.snapshotHelp')}</p>
      <QrCode
        value={recapUrl}
        label={t('share.recapQrLabel')}
        maxVersion={22}
        ecc="L"
        fallback={<p className={styles.snapshotHelp}>{t('share.qrTooBig')}</p>}
      />
      <div className={styles.snapshotActions}>
        {canSend && (
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.share({ url: recapUrl }).catch(() => {
                // Partage refermé sans envoyer : rien à dire.
              })
            }}
          >
            {t('share.send')}
          </Button>
        )}
        <Button variant="secondary" data-recap-url={recapUrl} onClick={() => copy(recapUrl)}>
          {t('share.copy')}
        </Button>
      </div>
    </>
  )
}
