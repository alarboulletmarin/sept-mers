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

/**
 * Deux durées, parce qu'il y a deux bandeaux.
 *
 * Celui qui confirme ne réclame pas de lecture : il passe. Celui qui porte
 * « Annuler » réclame de lire une phrase, de comprendre qu'on peut revenir en
 * arrière, et de viser un bouton — une seconde n'y suffit pas, et l'annulation
 * qui était le seul chemin de retour sur une manche validée restait
 * inatteignable. Sept secondes tiennent aussi le critère de temps ajustable
 * des WCAG, puisque le bandeau se chasse à la main de trois façons.
 */
const DURATION = 1000
const DURATION_WITH_ACTION = 7000

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
      timer.current = setTimeout(
        () => setToast(null),
        action ? DURATION_WITH_ACTION : DURATION,
      )
    },
    [clear],
  )

  useEffect(() => clear, [clear])

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss])

  /*
   * Trois façons de s'en débarrasser sans attendre : la croix, le glissé vers
   * le bas, et un appui n'importe où sur le bandeau. Un message qui ne se
   * chasse pas devient un obstacle, surtout posé au-dessus du bouton suivant.
   *
   * Il n'y a plus de seuil de glissé : au relâchement le bandeau part, que le
   * doigt ait parcouru trente pixels ou aucun. Les deux gestes disaient la même
   * chose, et le seuil n'ajoutait qu'un cas où le geste ne produisait rien.
   */
  const endDrag = () => {
    if (startY.current === null) return
    startY.current = null
    dismiss()
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
              /*
               * Un appui qui commence sur un bouton n'est pas un glissé, et
               * capturer le pointeur ici le rendait inopérant : la capture
               * fait porter le `click` qui suit par l'élément capturant, donc
               * par le bandeau, et jamais par le bouton visé. Ni la croix ni
               * « Annuler » ne recevaient quoi que ce soit — l'annulation
               * d'une manche validée, qui est le seul chemin de retour, n'a
               * jamais été atteignable au doigt.
               */
              if ((event.target as HTMLElement).closest('button')) return
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
