import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { chromium } from 'playwright'

/**
 * Les quatre parcours partaient tous sur un `executablePath` en dur. Le chemin
 * n'existait que sur une seule machine : les scripts que le README présente
 * comme la barrière de qualité du projet ne pouvaient donc tourner ni en
 * intégration continue, ni sur le poste de quelqu'un d'autre.
 *
 * On regarde d'abord `CHROMIUM_PATH`, puis les emplacements où un Chromium
 * préinstallé se trouve d'ordinaire, et à défaut on laisse Playwright résoudre
 * le navigateur qu'il a lui-même téléchargé — le cas normal après
 * `npx playwright install chromium`.
 */
const KNOWN_PATHS = ['/opt/pw-browsers/chromium']

export function launchChromium(options = {}) {
  // `||` et non `??` : une variable posée mais vide doit retomber sur la suite,
  // sinon `CHROMIUM_PATH=` désigne un exécutable nommé chaîne vide.
  const explicit = process.env.CHROMIUM_PATH || undefined
  const found = explicit ?? KNOWN_PATHS.find((path) => existsSync(path))
  return chromium.launch(found ? { ...options, executablePath: found } : options)
}

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

/**
 * Sert `dist/` comme l'hébergeur le fera.
 *
 * Le point qui compte est la dernière ligne : une adresse sans extension et
 * sans fichier reçoit `index.html`, à son adresse, sans redirection. C'est la
 * réécriture de `vercel.json`, et sans elle les parcours passeraient sur un
 * serveur plus complaisant que le vrai — un rechargement sur `/rules` y
 * marcherait alors qu'il donnerait un 404 en production.
 *
 * Les quatre parcours en avaient chacun leur copie, à quatre endroits.
 */
export function serveDist(root = new URL('../dist/', import.meta.url).pathname) {
  const server = createServer(async (request, response) => {
    const path = decodeURIComponent(request.url.split('?')[0])
    const send = async (file) => {
      const body = await readFile(join(root, normalize(file)))
      response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
      response.end(body)
    }
    try {
      await send(path === '/' ? '/index.html' : path)
    } catch {
      // Un chemin à extension est un fichier : absent, il est absent. Sans
      // extension, c'est une route de l'app, et elle reçoit la coquille.
      if (extname(path)) return void response.writeHead(404).end('not found')
      try {
        await send('/index.html')
      } catch {
        response.writeHead(404).end('not found')
      }
    }
  })
  return server
}

/** Démarre le serveur sur un port libre et rend son adresse. */
export async function listen(server) {
  await new Promise((resolve) => server.listen(0, resolve))
  return `http://127.0.0.1:${server.address().port}`
}
