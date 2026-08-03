import { useCallback, useEffect, useRef } from 'react'
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
  compact?: boolean
}

export function Stepper({
  max,
  min = 0,
  value,
  onChange,
  label,
  decreaseLabel,
  increaseLabel,
  compact = false,
}: StepperProps) {
  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({})

  const stop = useCallback(() => {
    if (timers.current.delay) clearTimeout(timers.current.delay)
    if (timers.current.repeat) clearInterval(timers.current.repeat)
    timers.current = {}
  }, [])

  useEffect(() => stop, [stop])

  // Tant qu'aucune valeur n'est posée, le premier appui tombe sur zéro :
  // c'est la mise la plus courante, elle ne doit pas coûter deux gestes.
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

  const atMin = value !== null && value <= min
  const atMax = value !== null && value >= max

  return (
    <div
      className={`${styles.stepper} ${compact ? styles.compact : ''}`}
      role="spinbutton"
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
        onPointerDown={() => hold(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        <span className={styles.minus} aria-hidden="true" />
      </button>

      <span className={`${styles.value} ${value === null ? styles.unset : ''}`}>
        {value === null ? '—' : value}
      </span>

      <button
        type="button"
        className={styles.button}
        aria-label={increaseLabel}
        disabled={atMax}
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
