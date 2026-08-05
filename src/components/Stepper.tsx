import { useCallback, useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react'
import { Icon } from './Icon.tsx'
import styles from './Stepper.module.css'

/** Retour haptique léger, quand l'appareil le propose. */
function tick(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(8)
    } catch {
      // Certains navigateurs exposent l'API sans l'autoriser : sans importance.
    }
  }
}

const HOLD_DELAY = 400
const HOLD_REPEAT = 110

interface StepperProps {
  /** Valeur haute incluse. */
  max: number
  min?: number
  value: number | null
  onChange: (value: number) => void
  /** Nom lu par les technologies d'assistance, et repris sur les deux boutons. */
  label: string
  decreaseLabel: string
  increaseLabel: string
}

export function Stepper({
  max,
  min = 0,
  value,
  onChange,
  label,
  decreaseLabel,
  increaseLabel,
}: StepperProps) {
  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({})

  const stop = useCallback(() => {
    if (timers.current.delay) clearTimeout(timers.current.delay)
    if (timers.current.repeat) clearInterval(timers.current.repeat)
    timers.current = {}
  }, [])

  useEffect(() => stop, [stop])

  // Une valeur vide ne se produit plus qu'à la relecture d'une saisie d'une
  // version d'avant : le premier appui la ramène à zéro plutôt que de la
  // laisser en l'état.
  const step = (direction: 1 | -1) => {
    if (value === null) {
      onChange(0)
      return 0
    }
    const next = Math.min(max, Math.max(min, value + direction))
    if (next !== value) onChange(next)
    return next
  }

  /** Appui maintenu : on répète, sinon atteindre 8 coûterait huit taps. */
  const hold = (direction: 1 | -1) => {
    tick()
    let current = step(direction)
    stop()
    timers.current.delay = setTimeout(() => {
      timers.current.repeat = setInterval(() => {
        const next = Math.min(max, Math.max(min, current + direction))
        if (next === current) {
          stop()
          return
        }
        current = next
        onChange(next)
      }, HOLD_REPEAT)
    }, HOLD_DELAY)
  }

  /**
   * L'activation qui ne vient pas d'un doigt ni d'une souris.
   *
   * Les deux boutons n'écoutaient que `pointerdown`, qu'aucune touche du
   * clavier n'émet et qu'aucun lecteur d'écran ne synthétise : toute la saisie
   * de l'app — mises, plis, format, primes — était donc hors d'atteinte sans
   * pointeur. Une activation au clavier ou par une technologie d'assistance
   * arrive en `click` avec un `detail` à zéro, là où un vrai clic compte ses
   * pressions. C'est ce zéro qui distingue les deux, et qui évite de compter
   * deux fois le clic de souris déjà servi par `pointerdown`.
   */
  const activate = (direction: 1 | -1) => (event: MouseEvent) => {
    if (event.detail !== 0) return
    tick()
    step(direction)
  }

  /**
   * Les flèches, comme sur n'importe quel compteur. C'est le chemin rapide :
   * une seule tabulation par tuile, puis on monte et on descend sans quitter
   * la valeur des yeux. `Origine` et `Fin` vont aux bornes, parce qu'à neuf
   * cartes la dernière manche coûterait autrement neuf pressions.
   */
  const onKeyDown = (event: KeyboardEvent) => {
    const current = value ?? 0
    const jump = (next: number) => {
      event.preventDefault()
      const bounded = Math.min(max, Math.max(min, next))
      if (bounded !== value) onChange(bounded)
    }
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        return jump(current + 1)
      case 'ArrowDown':
      case 'ArrowLeft':
        return jump(current - 1)
      case 'Home':
        return jump(min)
      case 'End':
        return jump(max)
      default:
    }
  }

  const atMin = value !== null && value <= min
  const atMax = value !== null && value >= max

  return (
    <div
      className={styles.stepper}
      role="spinbutton"
      // Focusable, donc utilisable : un `spinbutton` qu'on ne peut pas
      // atteindre annonce une commande qui n'existe pas.
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      {...(value === null ? {} : { 'aria-valuenow': value })}
    >
      <button
        type="button"
        className={styles.button}
        aria-label={decreaseLabel}
        disabled={atMin}
        // Hors du parcours de tabulation : la valeur, juste à côté, est le
        // seul arrêt du compteur et les flèches y font le même travail. Le
        // bouton reste dans l'arbre d'accessibilité, donc atteignable au
        // curseur virtuel d'un lecteur d'écran comme au balayage.
        tabIndex={-1}
        onClick={activate(-1)}
        onPointerDown={() => hold(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        <span className={styles.minus} aria-hidden="true" />
      </button>

      <span className={styles.value}>
        {value === null ? <span className={styles.slot} aria-hidden="true" /> : value}
      </span>

      <button
        type="button"
        className={styles.button}
        aria-label={increaseLabel}
        disabled={atMax}
        tabIndex={-1}
        onClick={activate(1)}
        onPointerDown={() => hold(1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        <Icon name="plus" size={22} />
      </button>
    </div>
  )
}
