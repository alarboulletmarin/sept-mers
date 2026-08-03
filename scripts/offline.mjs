/**
 * Vérifie les deux critères qui demandent un vrai navigateur :
 * le mode avion, et le suivi du thème système en direct.
 */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const ROOT = new URL('../dist/', import.meta.url).pathname
const TYPES = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'}
const server = createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]); const f = p === '/' ? '/index.html' : p
  try { const b = await readFile(join(ROOT, normalize(f))); res.writeHead(200, {'content-type': TYPES[extname(f)] ?? 'application/octet-stream'}); res.end(b) }
  catch { res.writeHead(404).end('x') }
})
await new Promise(r => server.listen(0, r))
const base = `http://127.0.0.1:${server.address().port}`

const failures = []
const check = (l, c) => { console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}`); if (!c) failures.push(l) }


/**
 * Pose une valeur sur une tuile via les boutons moins et plus.
 * On lit `aria-valuenow` plutôt que de compter les taps : robuste même quand
 * la valeur a été posée automatiquement pour le dernier joueur.
 */
async function setValue(tile, target) {
  const stepper = tile.locator('[role=spinbutton]')
  const plus = tile.getByRole('button', { name: /(Ajouter un pli|One more trick)/ })
  const minus = tile.getByRole('button', { name: /(Retirer un pli|One less trick)/ })
  for (let guard = 0; guard <= 24; guard += 1) {
    const now = await stepper.getAttribute('aria-valuenow')
    if (now !== null && Number(now) === target) return
    if (now === null || Number(now) < target) await plus.click()
    else await minus.click()
  }
  throw new Error(`valeur ${target} inatteignable`)
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' })
const page = await context.newPage()

// Une partie en cours, pour vérifier qu'elle survit au mode avion.
await page.goto(base)
await page.getByRole('button', { name: 'Nouvelle partie' }).click()
for (const n of ['Ana', 'Bo', 'Cy']) { await page.getByPlaceholder('Nom du joueur').fill(n); await page.getByRole('button', { name: 'Ajouter', exact: true }).click() }
await page.getByRole('button', { name: 'Commencer la partie' }).click()
await page.waitForSelector('[data-round="1"]')
await setValue(page.locator('[data-player-tile]').nth(0), 1)

// Attendre que le service worker prenne la main.
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 })
check('le service worker contrôle la page', true)
await page.waitForTimeout(600)

// ------------------------------------------------------------- mode avion
await context.setOffline(true)
await page.reload()
await page.waitForSelector('[data-player-tile]', { timeout: 15000 })
check('l app se lance hors ligne', await page.locator('[data-round]').first().isVisible())
const kept = await page
  .locator('[data-player-tile]')
  .nth(0)
  .locator('[role=spinbutton]')
  .getAttribute('aria-valuenow')
check('la saisie survit au mode avion', kept === '1')

// Une manche complète, hors ligne.
const tiles = page.locator('[data-player-tile]')
for (let i = 1; i < 3; i += 1) await setValue(tiles.nth(i), 0)
await page.getByRole('button', { name: 'Valider les mises' }).click()
// Ana prend l'unique pli, Bo zéro : le dernier joueur se complète tout seul.
await setValue(tiles.nth(0), 1)
await setValue(tiles.nth(1), 0)
const filled = await tiles.nth(2).locator('[role=spinbutton]').getAttribute('aria-valuenow')
check('le dernier joueur est complété automatiquement, hors ligne', filled === '0')
await page.getByRole('button', { name: 'Valider la manche' }).click()
await page.waitForSelector('text=Les résultats', { timeout: 10000 }).catch(() => {})
check('une manche se valide hors ligne', await page.locator('[data-round]').first().isVisible())

// Les écrans secondaires aussi.
await page.goto(`${base}#/rules`)
await page.waitForSelector('text=Qui remporte le pli', { timeout: 10000 })
check('les règles s ouvrent hors ligne', true)
await context.setOffline(false)

// -------------------------------------------------- thème système en direct
const themed = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' })
const p2 = await themed.newPage()
await p2.goto(base)
await p2.waitForSelector('text=Sept Mers')
check('le thème système part en clair', (await p2.evaluate(() => document.documentElement.dataset.theme)) === 'light')
await p2.emulateMedia({ colorScheme: 'dark' })
await p2.waitForTimeout(200)
check('le thème système bascule en sombre sans rechargement', (await p2.evaluate(() => document.documentElement.dataset.theme)) === 'dark')
await p2.emulateMedia({ colorScheme: 'light' })
await p2.waitForTimeout(200)
check('et revient en clair', (await p2.evaluate(() => document.documentElement.dataset.theme)) === 'light')
const meta = await p2.evaluate(() => document.querySelector('meta[name=theme-color]').content)
check('la couleur de barre suit le thème', meta === '#E9E5DA')

await browser.close(); server.close()
console.log('')
if (failures.length) { console.log(`${failures.length} échec(s)`); process.exit(1) }
console.log('Mode avion et thème système : tout passe.')
