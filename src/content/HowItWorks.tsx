import { useT } from '../i18n/index.ts'
import styles from './HowItWorks.module.css'

/**
 * Comment ça marche, en trois phrases.
 *
 * Le bloc ne vivait que sur l'accueil, et seulement tant qu'aucune partie
 * n'avait été jouée : passé la première, il disparaissait définitivement.
 * Quelqu'un qui prête son téléphone à un ami n'avait alors plus rien à lui
 * montrer. Il est donc devenu un composant, rendu à deux endroits — l'accueil
 * d'un premier lancement, et l'écran « À propos », qui ne disparaît jamais.
 */
export function HowItWorks() {
  const { t } = useT()
  const steps = [t('home.how.step1'), t('home.how.step2'), t('home.how.step3')]

  return (
    <ol className={styles.how}>
      {steps.map((step, index) => (
        <li key={step} className={styles.step}>
          <span className={styles.index}>{index + 1}</span>
          <span className={styles.text}>{step}</span>
        </li>
      ))}
    </ol>
  )
}
