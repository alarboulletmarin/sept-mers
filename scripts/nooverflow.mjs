/**
 * Aucun scroll latéral, nulle part, sur aucun écran ni aucun composant.
 *
 * On parcourt toute l'app à cinq largeurs, et à chaque étape on vérifie deux
 * choses : la page ne défile pas horizontalement, et aucun élément ne déborde
 * de son conteneur — un composant qui défile en interne compte comme un échec.
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
await new Promise((r) => server.listen(0, r))
const base = `http://127.0.0.1:${server.address().port}`

// 320 est le plus étroit qu'on rencontre encore, 430 un grand téléphone.
const WIDTHS = [320, 360, 390, 430, 820]
const failures = []

/** Rapporte la page et tout élément qui déborde latéralement. */
const AUDIT = () => {
  const problems = []
  const doc = document.documentElement
  if (doc.scrollWidth > doc.clientWidth + 1) {
    problems.push(`page: scrollWidth ${doc.scrollWidth} > ${doc.clientWidth}`)
  }
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : ''
    const cls = typeof el.className === 'string' && el.className
      ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
      : ''
    return `${el.tagName.toLowerCase()}${id}${cls}`
  }
  for (const el of document.querySelectorAll('*')) {
    // Le contenu réservé aux lecteurs d'écran est clippé à 1 px : il ne peut
    // pas produire de scroll, et sa géométrie n'a pas de sens ici.
    if (el.closest('.sr-only')) continue
    // Un composant qui défile en interne est un scroll latéral déguisé.
    if (el.scrollWidth > el.clientWidth + 1) {
      const style = getComputedStyle(el)
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
        problems.push(`${describe(el)} défile en interne (${el.scrollWidth} > ${el.clientWidth})`)
      }
    }
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && (rect.right > doc.clientWidth + 1 || rect.left < -1)) {
      problems.push(`${describe(el)} déborde (${Math.round(rect.left)}…${Math.round(rect.right)} hors de 0…${doc.clientWidth})`)
    }
  }
  return [...new Set(problems)]
}


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

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, locale: 'fr-FR' })
  const page = await context.newPage()

  const audit = async (label) => {
    const problems = await page.evaluate(AUDIT)
    if (problems.length === 0) {
      console.log(`  ok   ${width}px · ${label}`)
    } else {
      console.log(`  FAIL ${width}px · ${label}`)
      for (const problem of problems) console.log(`         ${problem}`)
      failures.push(`${width}px ${label}`)
    }
  }

  await page.goto(base)
  await page.waitForSelector('text=Sept Mers')
  await audit('accueil vide')

  // Huit joueurs : le cas le plus large partout.
  await page.getByRole('button', { name: 'Nouvelle partie' }).click()
  for (const n of ['Anaïs', 'Bo', 'Cyprien', 'Dee', 'Eve', 'Ferdinand', 'Gus', 'Hal']) {
    await page.getByPlaceholder('Nom du joueur').fill(n)
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  }
  await audit('nouvelle partie, huit joueurs')

  await page.getByRole('button', { name: 'Commencer la partie' }).click()
  await page.waitForSelector('[data-player-tile]')
  await audit('manche 1, mises')

  const tiles = page.locator('[data-player-tile]')
  const play = async (round) => {
    const cards = Math.min(round, 8)
    for (let i = 0; i < 8; i += 1) await setValue(tiles.nth(i), i === 0 ? cards : 0)
    await page.getByRole('button', { name: 'Valider les mises' }).click()
    for (let i = 0; i < 7; i += 1) await setValue(tiles.nth(i), i === 0 ? cards : 0)
    await page.getByRole('button', { name: 'Valider la manche' }).click()
  }

  // Manche 10 : la valeur la plus haute et le tableau le plus rempli.
  for (let round = 1; round <= 9; round += 1) await play(round)
  await audit('manche 10, valeur la plus haute')

  // La feuille de bonus ouverte.
  for (let i = 0; i < 8; i += 1) await setValue(tiles.nth(i), i === 0 ? 8 : 0)
  await page.getByRole('button', { name: 'Valider les mises' }).click()
  for (let i = 0; i < 7; i += 1) await setValue(tiles.nth(i), i === 0 ? 8 : 0)
  await tiles.nth(0).getByRole('button', { name: /^(Bonus|\+ ?Bonus)/ }).click()
  await page.waitForSelector('text=14 noir')
  await audit('feuille de bonus ouverte')
  await page.keyboard.press('Escape')

  // Le tableau des scores, en feuille.
  await page.getByRole('button', { name: 'Scores' }).click()
  await page.waitForSelector('text=Total')
  await audit('tableau des scores, huit joueurs')
  await page.keyboard.press('Escape')

  // Les règles, en feuille.
  await page.getByRole('button', { name: 'Règles' }).click()
  await page.waitForSelector('text=Qui remporte le pli')
  await audit('règles en feuille')
  await page.keyboard.press('Escape')

  // Fin de partie : classement, trois graphiques, tableau complet.
  await page.getByRole('button', { name: 'Valider la manche' }).click()
  await page.waitForSelector('text=Fin de partie')
  await audit('fin de partie, graphiques compris')

  await page.getByRole('button', { name: 'Terminer' }).click()
  await page.waitForSelector('text=Parties')
  await audit('accueil avec historique')

  for (const [route, marker, label] of [
    ['#/history', 'Historique', 'historique'],
    ['#/players', 'Joueurs', 'joueurs et palmarès'],
    ['#/rules', 'Qui remporte le pli', 'règles'],
    ['#/settings', 'Langue', 'réglages'],
  ]) {
    await page.goto(`${base}${route}`)
    await page.waitForSelector(`text=${marker}`)
    await audit(label)
  }

  // Fiche d'un joueur, avec ses statistiques.
  await page.goto(`${base}#/players`)
  await page.getByRole('link', { name: /Ferdinand/ }).click()
  await page.waitForSelector('text=Statistiques')
  await audit('fiche joueur')

  await context.close()
}

await browser.close()
server.close()

console.log('')
if (failures.length > 0) {
  console.log(`${failures.length} écran(s) en débordement :`)
  for (const failure of failures) console.log(`  - ${failure}`)
  process.exit(1)
}
console.log('Aucun scroll latéral, à toutes les largeurs.')
