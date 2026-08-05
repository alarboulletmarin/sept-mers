import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Le schéma de Vercel refuse toute propriété qu'il ne connaît pas, y compris
 * une clé `"//"` employée comme commentaire. Le déploiement échoue alors dès
 * l'import, avec « should NOT have additional property `//` », et rien dans le
 * projet ne l'aurait signalé. D'où ce test.
 */
const raw = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')
const config = JSON.parse(raw) as Record<string, unknown>

/** Les seules clés de premier niveau que l'app utilise. */
const ALLOWED_TOP_LEVEL = new Set(['$schema', 'redirects', 'headers', 'rewrites', 'cleanUrls', 'trailingSlash'])

/**
 * Et les seules qu'une entrée de route accepte. Le contrôle des `"//"` attrape
 * la faute qu'on a commise ; celui-ci attrape la suivante, celle où l'on écrit
 * `sources` au lieu de `source` ou l'on glisse un `comment`. Vercel refuse
 * l'une comme l'autre à la validation, sans plus de journal.
 */
const ALLOWED_IN_ENTRY: Record<string, Set<string>> = {
  headers: new Set(['source', 'headers', 'has', 'missing']),
  redirects: new Set(['source', 'destination', 'permanent', 'statusCode', 'has', 'missing']),
  rewrites: new Set(['source', 'destination', 'has', 'missing']),
}

function everyKey(value: unknown, seen: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) everyKey(item, seen)
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      seen.push(key)
      everyKey(child, seen)
    }
  }
  return seen
}

describe('vercel.json', () => {
  it('est du JSON valide', () => {
    expect(typeof config).toBe('object')
  })

  it("n'emploie aucune clé de commentaire, à aucun niveau", () => {
    // JSON n'a pas de commentaires : les simuler casse la validation de schéma.
    const commentKeys = everyKey(config).filter((key) => key.trim().startsWith('//'))
    expect(commentKeys).toEqual([])
  })

  it("ne déclare que des clés de premier niveau connues", () => {
    for (const key of Object.keys(config)) {
      expect(ALLOWED_TOP_LEVEL, `clé inattendue : ${key}`).toContain(key)
    }
  })

  it('ne déclare que des clés connues dans chaque entrée de route', () => {
    for (const [section, allowed] of Object.entries(ALLOWED_IN_ENTRY)) {
      const entries = (config[section] ?? []) as Record<string, unknown>[]
      for (const [index, entry] of entries.entries()) {
        for (const key of Object.keys(entry)) {
          expect(allowed, `${section}[${index}] : clé inattendue « ${key} »`).toContain(key)
        }
      }
    }
  })

  it('sert le service worker sans cache', () => {
    // C'est la comparaison octet à octet de `sw.js` qui déclenche la mise à
    // jour. Servi depuis un cache, le fichier reste identique à lui-même et
    // aucune nouvelle version n'est jamais détectée.
    const headers = config.headers as { source: string; headers: { key: string; value: string }[] }[]
    const entry = headers.find((candidate) => candidate.source === '/sw.js')
    expect(entry, '/sw.js sans en-tête').toBeTruthy()
    const cache = entry?.headers.find((h) => h.key === 'Cache-Control')?.value ?? ''
    expect(cache).toContain('max-age=0')
  })

  it('met les fichiers hachés en cache long', () => {
    const headers = config.headers as { source: string; headers: { key: string; value: string }[] }[]
    const assets = headers.find((candidate) => candidate.source === '/assets/(.*)')
    expect(assets?.headers[0].value).toContain('immutable')
  })

  /*
   * La réécriture, et non la redirection. Une redirection change l'adresse de
   * la barre ; c'est exactement ce qu'on ne veut pas d'une route : `/summary/x`
   * doit rester `/summary/x` et recevoir la coquille. Sans elle, recharger
   * ailleurs qu'à la racine donne un 404, ce qui est le seul vrai risque du
   * passage aux adresses en clair.
   */
  const rewrite = (config.rewrites as { source: string; destination: string }[] | undefined)?.[0]

  it('sert la coquille aux routes de l app, sans changer leur adresse', () => {
    expect(rewrite, 'aucune réécriture déclarée').toBeTruthy()
    expect(rewrite?.destination).toBe('/index.html')
    expect(config.redirects, 'une redirection changerait l adresse').toBeUndefined()

    const pattern = new RegExp(`^${rewrite?.source}$`)
    for (const route of [
      '/new',
      '/game',
      '/rules',
      '/settings',
      '/summary/g1',
      '/players/p1',
      // Le fragment d'un résumé partagé n'atteint jamais le serveur : seule
      // l'adresse nue a besoin d'être servie.
      '/watch/AB2C3D',
      '/recap',
      '/about',
    ]) {
      expect(pattern.test(route), `${route} ne serait pas servi`).toBe(true)
    }
  })

  it('ne réécrit aucun fichier réel du build', () => {
    const pattern = new RegExp(`^${rewrite?.source}$`)
    for (const real of [
      '/index.html',
      '/sw.js',
      '/manifest.webmanifest',
      '/assets/index-abc123.js',
      '/assets/index-abc123.css',
      '/icons/favicon.svg',
      '/icons/icon-192.png',
      // Les deux chemins que l'on va chercher sans lire le document. Réécrits,
      // ils ramèneraient du HTML sous un nom d'image : l'onglet retomberait sur
      // l'initiale du titre, et l'écran d'accueil iOS sur une capture de page.
      '/favicon.ico',
      '/apple-touch-icon.png',
      // Les licences des composants embarqués, écrites par le build à côté du
      // bundle : un fichier, pas une route.
      '/licenses.txt',
    ]) {
      expect(pattern.test(real), `${real} serait réécrit`).toBe(false)
    }
  })
})

describe('vite.config.ts', () => {
  const source = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')

  it('laisse le nouveau worker attendre au lieu de prendre la main', () => {
    /*
     * `autoUpdate` rechargerait la page dès qu'une version est prête, sans
     * prévenir. Les parties ne vivent que dans le navigateur : une manche en
     * cours de saisie partirait avec. La bascule est d'un mot, et rien d'autre
     * dans le projet ne la signalerait.
     */
    expect(source).toMatch(/registerType:\s*'prompt'/)
    // Le mot en prose est autorisé — l'option, non : elle annulerait l'attente.
    expect(source).not.toMatch(/skipWaiting\s*:/)
  })

  it('fait attraper la page dès la première visite', () => {
    // Sans revendication, le premier chargement reste non contrôlé et le hors
    // ligne n'arrive qu'au démarrage suivant.
    expect(source).toMatch(/clientsClaim:\s*true/)
  })

  it('purge le précache de la version précédente', () => {
    expect(source).toMatch(/cleanupOutdatedCaches:\s*true/)
  })
})

describe('package.json', () => {
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { engines?: { node?: string } }

  it('déclare Node dans la forme que les hébergeurs acceptent', () => {
    // Une plage semver comme « >=22.12 » est refusée par certaines plateformes.
    expect(pkg.engines?.node).toMatch(/^\d+\.x$/)
  })
})
