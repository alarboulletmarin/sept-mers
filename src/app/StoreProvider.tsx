import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { Store } from '../domain/types.ts'
import { reducer, type Action } from '../store/reducer.ts'
import { flushStore, loadStore, saveStore } from '../store/storage.ts'

interface StoreApi {
  store: Store
  dispatch: (action: Action) => void
}

const StoreContext = createContext<StoreApi | null>(null)

export function useStore(): StoreApi {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore hors de StoreProvider')
  return context
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(reducer, undefined, loadStore)

  // Écriture debouncée : le tap ne paie pas la sérialisation.
  useEffect(() => {
    saveStore(store)
  }, [store])

  // Un passage en arrière-plan peut être un dernier instant : on écrit tout de
  // suite plutôt que d'attendre les 300 ms.
  useEffect(() => {
    const flush = () => flushStore()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  const send = useCallback((action: Action) => dispatch(action), [])
  const value = useMemo(() => ({ store, dispatch: send }), [store, send])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
