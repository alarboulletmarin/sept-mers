import type { ReactNode } from 'react'
import { Icon } from '../components/Icon.tsx'
import { useT } from '../i18n/index.ts'
import { useActionBarHeight } from './useActionBar.ts'

interface ScreenProps {
  title: string
  /** Rendu à gauche du titre. Un retour, le plus souvent. */
  onBack?: () => void
  /** Rendu à droite du titre. */
  actions?: ReactNode
  children: ReactNode
  /** Barre basse collante : l'action principale, au pouce. */
  footer?: ReactNode
  /** Remplace le titre par un en-tête sur mesure. */
  header?: ReactNode
}

export function Screen({ title, onBack, actions, children, footer, header }: ScreenProps) {
  const { t } = useT()
  const actionBar = useActionBarHeight<HTMLDivElement>()

  return (
    <div className="screen">
      <header className="topbar">
        <div className="topbar-inner">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={t('nav.back')}
              style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, marginLeft: -6 }}
            >
              <Icon name="chevron" rotate="left" size={24} />
            </button>
          )}
          {header ?? (
            <h1 className="topbar-title t-display">{title}</h1>
          )}
          {actions}
        </div>
      </header>

      <main className="screen-body" style={{ paddingTop: 'var(--space-5)' }}>
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
