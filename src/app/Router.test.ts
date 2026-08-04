import { describe, expect, it } from 'vitest'
import { hrefFor, parsePath, type Route } from './Router.tsx'

/**
 * Le routeur est passé du hash au chemin. Deux choses en dépendent et ne se
 * voient pas depuis le code :
 *
 * - La réécriture de `vercel.json`, qui doit servir la coquille à ces adresses
 *   et à aucune autre. `deploy.test.ts` la vérifie contre cette même liste.
 * - Les adresses déjà partagées, en `/#/...`, qui doivent continuer d'ouvrir
 *   l'écran qu'elles nommaient.
 */

/** Les huit routes, dans leur forme la plus complète. */
const ROUTES: Route[] = [
  { name: 'home' },
  { name: 'new' },
  { name: 'game' },
  { name: 'summary' },
  { name: 'summary', gameId: 'g1' },
  { name: 'history' },
  { name: 'players' },
  { name: 'players', playerId: 'p1' },
  { name: 'rules' },
  { name: 'settings' },
]

describe('routeur', () => {
  it('écrit des adresses en clair, sans hash', () => {
    for (const route of ROUTES) {
      expect(hrefFor(route).startsWith('/'), `${route.name} ne part pas de la racine`).toBe(true)
      expect(hrefFor(route)).not.toContain('#')
    }
  })

  it('relit ce qu il écrit', () => {
    for (const route of ROUTES) {
      expect(parsePath(hrefFor(route)), `${hrefFor(route)} ne se relit pas`).toEqual(route)
    }
  })

  it('donne une adresse différente à chaque écran', () => {
    const written = ROUTES.map(hrefFor)
    expect(new Set(written).size).toBe(written.length)
  })

  it('ouvre l accueil sur une adresse inconnue', () => {
    for (const unknown of [
      '/',
      '',
      '//',
      '/regles',
      '/joueurs/ana',
      // Plus de segments que la route n'en prend : une adresse fausse, pas une
      // approximation de `/new` ou de `/summary/g1`.
      '/new/de/trop',
      '/summary/g1/de/trop',
      '/rules/1',
    ]) {
      expect(parsePath(unknown), `${unknown} n ouvre pas l accueil`).toEqual({ name: 'home' })
    }
  })

  it('ignore une barre oblique de trop', () => {
    // `/players/` et `/players` nomment le même écran : la seconde est la
    // forme canonique, et c'est elle que `useRoute` réécrit dans la barre.
    expect(parsePath('/players/')).toEqual({ name: 'players' })
    expect(hrefFor(parsePath('/players/'))).toBe('/players')
    expect(parsePath('/summary/')).toEqual({ name: 'summary' })
  })

  it('relit une adresse de l ancien routeur', () => {
    // `currentRoute` retire le `#` et passe la suite ici : un signet en
    // `/#/summary/g1` doit ouvrir la même partie qu'avant.
    for (const [legacy, expected] of [
      ['#/', { name: 'home' }],
      ['#/rules', { name: 'rules' }],
      ['#/summary/g1', { name: 'summary', gameId: 'g1' }],
      ['#/players/p1', { name: 'players', playerId: 'p1' }],
    ] as const) {
      expect(parsePath(legacy.slice(1)), `${legacy} a changé de sens`).toEqual(expected)
    }
  })

  it('garde l identifiant tel quel', () => {
    // Les identifiants sont des UUID : rien à échapper, mais rien à perdre non
    // plus, sinon l'historique ouvre la mauvaise partie.
    const id = '0189f0c2-6f6a-7c1e-9c1a-2f3b4c5d6e7f'
    expect(parsePath(hrefFor({ name: 'summary', gameId: id }))).toEqual({
      name: 'summary',
      gameId: id,
    })
  })
})
