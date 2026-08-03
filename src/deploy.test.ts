import { readFileSync } from 'node:fs'
import Ajv from 'ajv'
import { headersSchema, redirectsSchema } from '@vercel/routing-utils/dist/schemas.js'
import { describe, expect, it } from 'vitest'

/**
 * La configuration de déploiement est le seul fichier du projet dont une faute
 * ne se voit ni au build, ni aux tests, ni à l'exécution : Vercel la refuse à
 * la validation, avant même de cloner, et rend un « Deployment failed » sans
 * journal. On a perdu deux déploiements sur trois clés de commentaire `//`
 * glissées dans `headers` — la spécification y interdit toute propriété
 * supplémentaire.
 *
 * On valide donc le fichier contre le schéma que Vercel utilise lui-même, tiré
 * de son propre paquet. C'est la seule façon d'attraper la faute ici plutôt
 * qu'en production.
 */
const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))

const ajv = new Ajv({ allErrors: true, strict: false })

function errorsFor(schema: object, value: unknown): string[] {
  const validate = ajv.compile(schema)
  if (validate(value)) return []
  return (validate.errors ?? []).map(
    (error) => `${error.instancePath || '(racine)'} ${error.message ?? ''}`.trim(),
  )
}

describe('vercel.json', () => {
  it('déclare des en-têtes conformes au schéma de Vercel', () => {
    expect(errorsFor(headersSchema, config.headers)).toEqual([])
  })

  it('déclare des redirections conformes au schéma de Vercel', () => {
    expect(errorsFor(redirectsSchema, config.redirects)).toEqual([])
  })

  it('ne glisse aucune clé de commentaire nulle part', () => {
    // JSON n'a pas de commentaires, et Vercel refuse la convention `//`.
    // L'explication de chaque en-tête vit dans le README, section Déploiement.
    const walk = (node: unknown, path: string): string[] => {
      if (Array.isArray(node)) return node.flatMap((item, i) => walk(item, `${path}[${i}]`))
      if (node === null || typeof node !== 'object') return []
      return Object.entries(node).flatMap(([key, value]) =>
        key === '//' ? [`${path}/${key}`] : walk(value, `${path}/${key}`),
      )
    }
    expect(walk(config, '')).toEqual([])
  })

  it('ne met jamais le service worker en cache', () => {
    // Un `sw.js` périmé empêche toute mise à jour d'arriver, définitivement :
    // c'est lui qui porte la liste des fichiers à précacher.
    for (const name of ['/sw.js', '/sw-version.js']) {
      const rule = config.headers.find((entry: { source: string }) => entry.source === name)
      expect(rule, `${name} sans règle de cache`).toBeTruthy()
      const cacheControl = rule.headers.find(
        (header: { key: string }) => header.key === 'Cache-Control',
      )
      expect(cacheControl.value, name).toContain('max-age=0')
    }
  })
})
