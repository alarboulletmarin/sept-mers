import { useEffect, type ReactNode } from 'react'
import { I18nContext, makeI18n } from '../i18n/index.ts'
import { useStore } from './StoreProvider.tsx'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Couleur de la barre du navigateur, alignée sur le thème actif. */
const THEME_COLOR = { light: '#E9E5DA', dark: '#0C2A28' }

/**
 * Applique le thème et la langue à `<html>`. En mode système, un `matchMedia`
 * suit le réglage de l'appareil en direct, sans rechargement.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { store } = useStore()
  const { theme, locale } = store.settings

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia(DARK_QUERY)

    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      root.setAttribute('data-theme', resolved)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', THEME_COLOR[resolved])
    }

    apply()
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const i18n = makeI18n(locale)

  return <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>
}
