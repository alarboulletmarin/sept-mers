import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Icon } from '../components/Icon.tsx'
import { useT } from '../i18n/index.ts'
import styles from './UpdatePrompt.module.css'

/**
 * Le bandeau de mise à jour.
 *
 * Une nouvelle version arrive par le service worker, qui la précache puis
 * attend. Rien ne bouge tant que personne n'a dit oui : les parties vivent
 * dans le navigateur et nulle part ailleurs, et un rechargement décidé tout
 * seul au milieu d'une saisie emporterait ce qui n'est pas encore écrit.
 *
 * D'où deux sorties, et aucune troisième. « Recharger » donne la main au
 * worker en attente, qui s'active et fait recharger la page. La croix range le
 * bandeau : l'ancienne version continue de tourner, la nouvelle reste en
 * attente, et la proposition revient au prochain démarrage. Rien n'est perdu
 * d'un côté comme de l'autre.
 */
export function UpdatePrompt() {
  const { t } = useT()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const ref = useRef<HTMLDivElement>(null)

  /*
   * Le bandeau publie la place qu'il occupe, comme la barre d'action : le
   * bandeau de confirmation se pose au-dessus plutôt que par-dessus. Deux
   * bandeaux superposés, c'est un bouton « Annuler » qu'on croit toucher et
   * qu'on rate — d'autant que celui-ci reste tant qu'on ne l'a pas rangé.
   */
  useEffect(() => {
    const node = ref.current
    const root = document.documentElement
    if (!node) return

    const publish = () => root.style.setProperty('--update-h', `${node.offsetHeight}px`)
    publish()

    const observer = new ResizeObserver(publish)
    observer.observe(node)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--update-h')
    }
  }, [needRefresh])

  if (!needRefresh) return null

  return (
    <div className={styles.wrap} ref={ref} role="status" aria-live="polite">
      <div className={styles.banner}>
        <span className={styles.message}>{t('update.available')}</span>

        <button
          type="button"
          className={styles.action}
          onClick={() => {
            void updateServiceWorker(true)
          }}
        >
          {t('update.action')}
        </button>

        <button
          type="button"
          className={styles.close}
          aria-label={t('update.dismiss')}
          onClick={() => setNeedRefresh(false)}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  )
}
