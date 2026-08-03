import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
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

const DURATION = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const counter = useRef(0)

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    clear()
    setToast(null)
  }, [clear])

  const show = useCallback(
    (message: string, action?: ToastAction) => {
      clear()
      counter.current += 1
      setToast({ id: counter.current, message, ...(action ? { action } : {}) })
      timer.current = setTimeout(() => setToast(null), DURATION)
    },
    [clear],
  )

  useEffect(() => clear, [clear])

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.wrap} aria-live="polite" role="status">
        {toast && (
          <div className={styles.toast} key={toast.id}>
            <span className={`${styles.message} t-label`}>{toast.message}</span>
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
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
