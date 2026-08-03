import type { ReactNode } from 'react'
import { Icon } from '../components/Icon.tsx'
import { useT } from '../i18n/index.ts'
import { useActionBarHeight } from './useActionBar.ts'
import styles from './Layout.module.css'

interface ScreenProps {
  title: string
  /**
   * Une phrase qui dit à quoi sert l'écran, en romain italique. Ce n'est pas
   * de l'ornement : c'est ce qui évite qu'on arrive sur un écran sans savoir
   * ce qu'on y attend de nous.
   */
  lede?: string
  /** Rendu à gauche du titre. Un retour, le plus souvent. */
  onBack?: () => void
  /** Rendu à droite de la barre haute. */
  actions?: ReactNode
  children: ReactNode
  /** Barre basse collante : l'action principale, au pouce. */
  footer?: ReactNode
  /** Remplace le bloc de titre par un en-tête sur mesure. */
  header?: ReactNode
}

/**
 * Le gabarit commun. La barre haute ne porte que le retour et les actions :
 * elle reste collante et fine. Le titre, lui, vit dans le corps, en grand et
 * en romain — c'est la première chose qu'on lit, et il a le droit de partir au
 * défilement puisque le retour, lui, ne bouge pas.
 */
export function Screen({ title, lede, onBack, actions, children, footer, header }: ScreenProps) {
  const { t } = useT()
  const actionBar = useActionBarHeight<HTMLDivElement>()

  return (
    <div className="screen">
      <header className="topbar">
        <div className="topbar-inner">
          {onBack && (
            <button
              type="button"
              className="round-button"
              onClick={onBack}
              aria-label={t('nav.back')}
            >
              <Icon name="chevron" rotate="left" size={20} />
            </button>
          )}
          <span className={styles.spacer} />
          {actions}
        </div>
      </header>

      <main className="screen-body">
        {header ?? (
          <div className={styles.masthead}>
            <h1 className="t-display">{title}</h1>
            {lede && <p className={`t-lede ${styles.lede}`}>{lede}</p>}
          </div>
        )}
        {children}
      </main>

      {footer && (
        <div className="actionbar" ref={actionBar}>
          <div className="actionbar-inner">{footer}</div>
        </div>
      )}
    </div>
  )
}
