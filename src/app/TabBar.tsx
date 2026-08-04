import { Icon, Logo, type IconName } from '../components/Icon.tsx'
import { useT } from '../i18n/index.ts'
import { hrefFor, opensElsewhere, type Route } from './Router.tsx'
import styles from './TabBar.module.css'

/**
 * Quatre destinations, toujours là. Les réglages n'en font pas partie : on y va
 * une fois pour choisir sa langue et son thème, pas au milieu d'une partie —
 * ils vivent en bouton rond sur l'accueil.
 */
const TABS: { name: Route['name']; label: string; icon: IconName | 'logo' }[] = [
  { name: 'home', label: 'nav.home', icon: 'logo' },
  { name: 'history', label: 'nav.history', icon: 'history' },
  { name: 'players', label: 'nav.players', icon: 'players' },
  { name: 'rules', label: 'nav.rules', icon: 'book' },
]

/**
 * L'onglet actif d'un écran qui n'en est pas un. Une partie, sa composition et
 * son résultat sont trois moments d'un même geste parti de l'accueil : c'est
 * lui qui reste allumé, plutôt qu'aucun — une barre sans repère se lit comme
 * une barre cassée.
 */
function activeTab(route: Route): Route['name'] {
  switch (route.name) {
    case 'new':
    case 'game':
    case 'summary':
      return 'home'
    default:
      return route.name
  }
}

export function TabBar({ route, go }: { route: Route; go: (next: Route) => void }) {
  const { t } = useT()
  const active = activeTab(route)

  return (
    <nav className={styles.bar} aria-label={t('nav.sections')}>
      <ul className={styles.list}>
        {TABS.map((tab) => {
          const current = tab.name === active
          const target = { name: tab.name } as Route
          return (
            <li key={tab.name} className={styles.item}>
              <a
                className={`${styles.tab} ${current ? styles.current : ''}`}
                href={hrefFor(target)}
                aria-current={current ? 'page' : undefined}
                onClick={(event) => {
                  if (opensElsewhere(event)) return
                  event.preventDefault()
                  go(target)
                }}
              >
                {/* Le trait de l'onglet actif : le même geste que la houle de
                    progression, à la plus petite échelle. */}
                <span className={styles.mark} aria-hidden="true" />
                {tab.icon === 'logo' ? (
                  <Logo size={21} className={styles.icon} />
                ) : (
                  <Icon name={tab.icon} size={21} className={styles.icon} />
                )}
                <span className={styles.label}>{t(tab.label)}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
