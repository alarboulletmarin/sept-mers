import { useCallback, useEffect, useState } from 'react'

/** Six routes, sur le hash. Pas de librairie. */
export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'game' }
  | { name: 'summary'; gameId?: string }
  | { name: 'history' }
  | { name: 'players'; playerId?: string }
  | { name: 'rules' }
  | { name: 'settings' }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  const [head, tail] = path.split('/')

  switch (head) {
    case 'new':
      return { name: 'new' }
    case 'game':
      return { name: 'game' }
    case 'summary':
      return tail ? { name: 'summary', gameId: tail } : { name: 'summary' }
    case 'history':
      return { name: 'history' }
    case 'players':
      return tail ? { name: 'players', playerId: tail } : { name: 'players' }
    case 'rules':
      return { name: 'rules' }
    case 'settings':
      return { name: 'settings' }
    default:
      return { name: 'home' }
  }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'summary':
      return route.gameId ? `#/summary/${route.gameId}` : '#/summary'
    case 'players':
      return route.playerId ? `#/players/${route.playerId}` : '#/players'
    default:
      return `#/${route.name}`
  }
}

export function useRoute(): { route: Route; go: (route: Route, replace?: boolean) => void } {
  const [route, setRoute] = useState<Route>(() =>
    parseHash(typeof location === 'undefined' ? '' : location.hash),
  )

  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const go = useCallback((next: Route, replace = false) => {
    const href = hrefFor(next)
    if (location.hash === href) return
    if (replace) history.replaceState(null, '', href)
    else location.hash = href
    setRoute(next)
  }, [])

  return { route, go }
}

/** Ramène la vue en haut à chaque changement d'écran. */
export function useScrollReset(key: string): void {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [key])
}
