import { existsSync } from 'node:fs'
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
