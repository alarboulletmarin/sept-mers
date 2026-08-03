import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import { useT } from '../i18n/index.ts'
import styles from './Toast.module.css'

export interface ToastAction {
  label: string
  run: () => void
}

interface ToastState {
  id: number
  message: string
  action?: ToastAction
}

interface ToastApi {
  show: (message: string, action?: ToastAction) => void
  dismiss: () => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast hors de ToastProvider')
  return context
}

/** Une seconde. Le bandeau confirme, il ne réclame pas de lecture. */
const DURATION = 1000

/** Au-delà de ce glissé vers le bas, le geste vaut fermeture. */
const SWIPE_TO_CLOSE = 28

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useT()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [drag, setDrag] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const counter = useRef(0)
  const startY = useRef<number | null>(null)

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    clear()
    startY.current = null
    setDrag(0)
    setToast(null)
  }, [clear])

  const show = useCallback(
    (message: string, action?: ToastAction) => {
      clear()
      counter.current += 1
      setDrag(0)
      setToast({ id: counter.current, message, ...(action ? { action } : {}) })
      timer.current = setTimeout(() => setToast(null), DURATION)
    },
    [clear],
  )

  useEffect(() => clear, [clear])

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss])

  /*
   * Trois façons de s'en débarrasser sans attendre : la croix, le glissé vers
   * le bas, et un appui n'importe où sur le bandeau. Un message qui ne se
   * chasse pas devient un obstacle, surtout posé au-dessus du bouton suivant.
   */
  const endDrag = () => {
    if (startY.current === null) return
    startY.current = null
    if (drag > SWIPE_TO_CLOSE) dismiss()
    else setDrag(0)
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.wrap} aria-live="polite" role="status">
        {toast && (
          <div
            className={styles.toast}
            key={toast.id}
            style={drag > 0 ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
            onPointerDown={(event) => {
              startY.current = event.clientY
              // Le glissé se suit même si le doigt sort du bandeau.
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              if (startY.current === null) return
              setDrag(Math.max(0, event.clientY - startY.current))
            }}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <span className={styles.message}>{toast.message}</span>

            {toast.action && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  toast.action?.run()
                  dismiss()
                }}
              >
                {toast.action.label}
              </button>
            )}

            <button
              type="button"
              className={styles.close}
              aria-label={t('nav.close')}
              onClick={dismiss}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
