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

  it('sert le service worker et sa liste de fichiers sans cache', () => {
    const headers = config.headers as { source: string; headers: { key: string; value: string }[] }[]
    for (const source of ['/sw.js', '/sw-version.js']) {
      const entry = headers.find((candidate) => candidate.source === source)
      expect(entry, `${source} sans en-tête`).toBeTruthy()
      const cache = entry?.headers.find((h) => h.key === 'Cache-Control')?.value ?? ''
      expect(cache, source).toContain('max-age=0')
    }
  })

  it('met les fichiers hachés en cache long', () => {
    const headers = config.headers as { source: string; headers: { key: string; value: string }[] }[]
    const assets = headers.find((candidate) => candidate.source === '/assets/(.*)')
    expect(assets?.headers[0].value).toContain('immutable')
  })

  it('ne redirige aucun fichier réel du build', () => {
    const redirects = config.redirects as { source: string }[]
    const pattern = new RegExp(`^${redirects[0].source}$`)
    for (const real of [
      '/index.html',
      '/sw.js',
      '/sw-version.js',
      '/manifest.webmanifest',
      '/assets/index-abc123.js',
      '/assets/index-abc123.css',
      '/icons/favicon.svg',
      '/icons/icon-192.png',
    ]) {
      expect(pattern.test(real), `${real} serait redirigé`).toBe(false)
    }
  })

  it('rattrape une adresse tapée à la main', () => {
    const redirects = config.redirects as { source: string }[]
    const pattern = new RegExp(`^${redirects[0].source}$`)
    for (const typed of ['/regles', '/game', '/joueurs/ana']) {
      expect(pattern.test(typed), `${typed} devrait être rattrapé`).toBe(true)
    }
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
