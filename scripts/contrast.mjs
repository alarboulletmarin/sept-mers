/**
 * Aucun texte invisible, dans aucun des deux thèmes.
 *
 * Un bloc qui pose une surface doit publier ses couleurs de texte. Quand il
 * oublie, ce qui vit dedans retombe sur celles du canevas — et un bouton
 * devient blanc sur blanc, sans que rien ne casse par ailleurs. On mesure donc
 * le contraste réel de chaque texte contre son fond effectif.
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

/** Seuil volontairement bas : on cherche l'illisible, pas l'imparfait. */
const FLOOR = 3

const AUDIT = (floor) => {
  const parse = (value) => {
    const m = value.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const [r, g, b, a = '1'] = m[1].split(/[,/]+/).map((n) => parseFloat(n))
    return { r, g, b, a }
  }
  const lin = (c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const lum = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  const ratio = (a, b) => {
    const x = lum(a), y = lum(b)
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
  }
  /** Le fond effectif : le premier ancêtre qui en pose un opaque. */
  const backgroundOf = (el) => {
    let node = el
    while (node) {
      const bg = parse(getComputedStyle(node).backgroundColor)
      if (bg && bg.a > 0.5) return bg
      node = node.parentElement
    }
    return { r: 255, g: 255, b: 255, a: 1 }
  }

  const problems = []
  for (const el of document.querySelectorAll('button, a, p, span, h1, h2, h3, li, dt, dd, td, th')) {
    if (el.closest('.sr-only')) continue
    // Seulement les éléments qui portent eux-mêmes du texte visible.
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join('')
    if (!own) continue
    const style = getComputedStyle(el)
    if (style.visibility === 'hidden' || style.display === 'none') continue
    if (parseFloat(style.opacity) < 0.3) continue
    const rect = el.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) continue

    const fg = parse(style.color)
    if (!fg || fg.a < 0.3) continue
    const r = ratio(fg, backgroundOf(el))
    if (r < floor) {
      const cls = typeof el.className === 'string' ? el.className.split(/\s+/)[0] : ''
      problems.push(`${el.tagName.toLowerCase()}.${cls} « ${own.slice(0, 28)} » ${r.toFixed(2)}:1`)
    }
  }
  return [...new Set(problems)]
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const failures = []

for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' })
  // Le store est semé avant que le code de l'app tourne : écrire dans
  // localStorage après le chargement se fait écraser par la sauvegarde
  // debouncée, et le thème demandé ne s'applique jamais.
  await context.addInitScript((chosen) => {
    localStorage.setItem(
      'sept-mers',
      JSON.stringify({
        schemaVersion: 1,
        players: [],
        games: [],
        settings: { locale: 'fr', theme: chosen, lastOptions: { bonusIfBidMissed: true } },
      }),
    )
  }, theme)
  const page = await context.newPage()

  const audit = async (label) => {
    const problems = await page.evaluate(AUDIT, FLOOR)
    if (problems.length === 0) console.log(`  ok   ${theme} · ${label}`)
    else {
      console.log(`  FAIL ${theme} · ${label}`)
      for (const p of problems) console.log(`         ${p}`)
      failures.push(`${theme} ${label}`)
    }
  }

  await page.goto(base)
  await page.waitForSelector('text=Sept Mers')

  // Sans cette garde, un test qui ne bascule pas mesurerait deux fois le même
  // thème et ne prouverait rien.
  const applied = await page.evaluate(() => document.documentElement.dataset.theme)
  if (applied !== theme) {
    console.log(`  FAIL ${theme} · le thème demandé ne s'applique pas (obtenu : ${applied})`)
    failures.push(`${theme} thème non appliqué`)
  }
  await audit('accueil')

  await page.getByRole('button', { name: 'Nouvelle partie' }).click()
  for (const n of ['Anaïs', 'Bo', 'Cyprien', 'Dee']) {
    await page.getByPlaceholder('Nom du joueur').fill(n)
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Options' }).click()
  await audit('nouvelle partie, options dépliées')

  await page.getByRole('button', { name: 'Commencer la partie' }).click()
  await page.waitForSelector('[data-player-tile]')
  await audit('manche 1, mises')

  const tiles = page.locator('[data-player-tile]')
  const setValue = async (tile, target) => {
    const st = tile.locator('[role=spinbutton]')
    const plus = tile.getByRole('button', { name: /Ajouter un pli/ })
    for (let g = 0; g <= 24; g += 1) {
      const n = await st.getAttribute('aria-valuenow')
      if (n !== null && Number(n) === target) return
      await plus.click()
    }
  }
  for (let i = 0; i < 4; i += 1) await setValue(tiles.nth(i), i === 0 ? 1 : 0)
  await page.getByRole('button', { name: 'Valider les mises' }).click()
  for (let i = 0; i < 3; i += 1) await setValue(tiles.nth(i), i === 0 ? 1 : 0)
  await audit('manche 1, résultats')

  await tiles.nth(0).getByRole('button', { name: /^Bonus/ }).click()
  await page.waitForSelector('text=14 noir')
  await audit('feuille de bonus')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Valider la manche' }).click()
  await page.waitForSelector('[data-round="2"]')

  for (const [route, marker, label] of [
    ['#/rules', 'Qui remporte le pli', 'règles'],
    ['#/settings', 'Langue', 'réglages'],
    ['#/players', 'Joueurs', 'joueurs'],
    ['#/history', 'Historique', 'historique'],
  ]) {
    await page.goto(`${base}${route}`)
    await page.waitForSelector(`text=${marker}`)
    await audit(label)
  }

  await context.close()
}

await browser.close()
server.close()

console.log('')
if (failures.length > 0) {
  console.log(`${failures.length} écran(s) avec du texte illisible :`)
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('Aucun texte illisible, dans les deux thèmes.')
