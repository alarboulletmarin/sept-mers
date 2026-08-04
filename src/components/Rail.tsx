import styles from './Rail.module.css'

/**
 * La houle : une barre par manche — des traits horizontaux de longueurs
 * inégales, rien d'autre. C'est le motif de la maison, repris au filet de
 * section et au trait de l'onglet actif.
 *
 * Elle ne décore pas, elle situe. Dix traits, on voit d'un coup d'œil combien
 * de manches sont derrière et combien restent, sans lire un seul chiffre.
 */
export function RoundRail({
  total,
  current,
  label,
}: {
  total: number
  current: number
  label: string
}) {
  return (
    <div className={styles.rail} role="img" aria-label={label}>
      {Array.from({ length: total }, (_, index) => {
        const round = index + 1
        const state = round < current ? styles.done : round === current ? styles.now : styles.todo
        return <span key={round} className={`${styles.mark} ${state}`} />
      })}
    </div>
  )
}

export interface Step {
  label: string
  /** L'étape en cours. Une seule à la fois. */
  current: boolean
  /** Déjà franchie : on peut y revenir. */
  done: boolean
  onClick?: () => void
}

/**
 * Les deux temps d'une manche, toujours affichés. On mise, puis on compte les
 * plis : quelqu'un qui prend le téléphone en cours de partie doit savoir
 * lequel des deux on lui demande, sans avoir suivi.
 */
export function PhaseRail({ steps }: { steps: Step[] }) {
  return (
    <ol className={styles.steps}>
      {steps.map((step, index) => {
        const state = step.current ? styles.stepNow : step.done ? styles.stepDone : styles.stepTodo
        const content = (
          <>
            <span className={styles.stepIndex}>{index + 1}</span>
            <span className={styles.stepLabel}>{step.label}</span>
          </>
        )
        return (
          <li key={step.label} className={styles.step}>
            {step.onClick && !step.current ? (
              <button
                type="button"
                className={`${styles.stepBody} ${state}`}
                onClick={step.onClick}
                aria-current={step.current ? 'step' : undefined}
              >
                {content}
              </button>
            ) : (
              <span className={`${styles.stepBody} ${state}`} aria-current={step.current ? 'step' : undefined}>
                {content}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
