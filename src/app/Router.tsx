import { useCallback, useEffect, useState } from 'react'

/**
 * Dix routes, sur le chemin. Pas de librairie.
 *
 * Sur le chemin et non sur le hash : le hash est un identifiant de fragment,
 * pas une adresse, et le navigateur ne l'envoie jamais au serveur. L'app y
 * vivait, ce qui dispensait l'hébergeur de connaître les routes — au prix
 * d'une barre d'adresse qui disait `/#/new`. Le prix est payé une fois côté
 * hébergeur, avec une réécriture ; les adresses, elles, se lisent et se
 * partagent tous les jours.
 *
 * Le résumé partagé, lui, garde un pied dans le fragment : `/recap#s=…` porte
 * la partie entière après le `#`, précisément parce que cette partie-là ne
 * doit jamais partir au serveur.
 */
export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'game' }
  | { name: 'summary'; gameId?: string }
  | { name: 'history' }
  | { name: 'players'; playerId?: string }
  | { name: 'rules' }
  | { name: 'settings' }
  | { name: 'watch'; code?: string }
  | { name: 'recap' }

export function parsePath(pathname: string): Route {
  // `filter` avale les segments vides : les barres obliques de tête, de queue
  // et les doubles ne changent pas l'écran nommé.
  const [head, tail, ...rest] = pathname.split('/').filter(Boolean)

  /*
   * Plus de segments que la route n'en prend : l'adresse ne nomme aucun écran.
   * On préfère l'accueil à une devinette — `/new/de/trop` n'est pas `/new`,
   * c'est une adresse fausse, et la faire passer pour juste ferait taire une
   * faute de lien au lieu de la montrer.
   */
  if (rest.length > 0) return { name: 'home' }

  switch (head) {
    case 'summary':
      return tail ? { name: 'summary', gameId: tail } : { name: 'summary' }
    case 'players':
      return tail ? { name: 'players', playerId: tail } : { name: 'players' }
    // Sans code, l'adresse reste bonne : c'est l'écran où on le tape.
    case 'watch':
      return tail ? { name: 'watch', code: tail } : { name: 'watch' }
    // Les routes sans paramètre : un segment de plus les invalide aussi.
    case 'new':
    case 'game':
    case 'history':
    case 'rules':
    case 'settings':
    case 'recap':
      return tail ? { name: 'home' } : { name: head }
    default:
      return { name: 'home' }
  }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/'
    case 'summary':
      return route.gameId ? `/summary/${route.gameId}` : '/summary'
    case 'players':
      return route.playerId ? `/players/${route.playerId}` : '/players'
    case 'watch':
      return route.code ? `/watch/${route.code}` : '/watch'
    default:
      return `/${route.name}`
  }
}

/**
 * La route de l'adresse courante.
 *
 * Les adresses de l'ancien routeur — `/#/rules` — restent valides : un signet,
 * un lien envoyé dans une conversation, un onglet restauré. On les relit, et
 * `useRoute` réécrit la barre d'adresse en clair juste après.
 */
function currentRoute(): Route {
  if (typeof location === 'undefined') return { name: 'home' }
  if (location.hash.startsWith('#/')) return parsePath(location.hash.slice(1))
  return parsePath(location.pathname)
}

export function useRoute(): { route: Route; go: (route: Route, replace?: boolean) => void } {
  const [route, setRoute] = useState<Route>(currentRoute)

  useEffect(() => {
    // Les boutons précédent et suivant du navigateur : ils changent l'adresse
    // sans passer par `go`, et c'est `popstate` qui le dit.
    const onPop = () => setRoute(parsePath(location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    /*
     * Deux adresses mènent à un écran sans s'écrire comme lui : celles de
     * l'ancien routeur, et tout ce qui ne correspond à aucune route et retombe
     * sur l'accueil. On les remet en forme au premier rendu, en remplaçant
     * l'entrée d'historique plutôt qu'en en empilant une — sinon le bouton
     * précédent ramènerait à l'adresse qu'on vient de corriger, en boucle.
     *
     * Seul le hash de l'ancien routeur — `#/…` — se réécrit. Tout autre
     * fragment se garde tel quel : celui d'un résumé partagé porte la partie
     * entière, et la remise en forme l'effacerait avant que l'écran l'ait lue.
     */
    const keep = location.hash.startsWith('#/') ? '' : location.hash
    const canonical = hrefFor(currentRoute()) + keep
    if (location.pathname + location.search + location.hash !== canonical) {
      history.replaceState(null, '', canonical)
    }
  }, [])

  const go = useCallback((next: Route, replace = false) => {
    const href = hrefFor(next)
    if (location.pathname === href) return
    if (replace) history.replaceState(null, '', href)
    else history.pushState(null, '', href)
    setRoute(next)
  }, [])

  return { route, go }
}

/**
 * Vrai quand un clic sur un lien doit rester au navigateur : nouvel onglet,
 * nouvelle fenêtre, téléchargement. Les intercepter tous reviendrait à casser
 * le clic du milieu et le cmd-clic, que de vraies adresses rendent enfin
 * utiles.
 */
export function opensElsewhere(event: React.MouseEvent): boolean {
  return (
    event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
  )
}

/** Ramène la vue en haut à chaque changement d'écran. */
export function useScrollReset(key: string): void {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [key])
}
