/**
 * Aucun texte invisible, dans aucun des deux thèmes.
 *
 * Un bloc qui pose une surface doit publier ses couleurs de texte. Quand il
 * oublie, ce qui vit dedans retombe sur celles du canevas — et un bouton
 * devient blanc sur blanc, sans que rien ne casse par ailleurs. On mesure donc
 * le contraste réel de chaque texte contre son fond effectif.
 */
import { launchChromium, listen, serveDist } from './browser.mjs'

const server = serveDist()
const base = await listen(server)

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

const browser = await launchChromium()
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
    // Le transport local du partage : la salle s'ouvre sans toucher un relais.
    localStorage.setItem('sept-mers:transport', 'loopback')
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
  // Variantes activées : le compteur de plis écartés, le pari du Rascal et la
  // pastille de charge n'apparaissent qu'avec elles, et sont à contrôler comme
  // le reste.
  await page.getByRole('switch', { name: /Kraken/ }).click()
  await page.getByRole('switch', { name: /Baleine blanche/ }).click()
  await page.getByRole('switch', { name: /Pouvoirs/ }).click()
  await page.getByRole('switch', { name: /Score Rascal/ }).click()
  await page.getByRole('switch', { name: /Boulet de canon/ }).click()
  await audit('nouvelle partie, options dépliées')

  await page.getByRole('button', { name: 'Commencer la partie' }).click()
  await page.waitForSelector('[data-player-tile]')
  await audit('manche 1, mises')

  // La pastille de charge dans ses deux états, sur une tuile encre comme sur
  // une tuile blanche : une option cochée qui suivrait l'accent global au lieu
  // de sa surface serait noire sur noire.
  await page.locator('[data-player-tile]').nth(0).getByRole('switch').click()
  await audit('manche 1, mises, une charge au boulet')

  // La feuille de partage, au repos puis salle ouverte : le code sur fond
  // creux et les légendes sous les QR sont des couples texte/surface à eux.
  await page.getByRole('button', { name: 'Partager la table' }).click()
  await page.waitForSelector('text=Lancer le direct')
  await audit('feuille de partage')
  await page.getByRole('button', { name: 'Lancer le direct' }).click()
  await page.waitForSelector('[data-share-code]')
  await page.waitForSelector('[data-recap-url]')
  await audit('feuille de partage, salle ouverte')
  await page.keyboard.press('Escape')

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
  for (let i = 0; i < 4; i += 1) await setValue(tiles.nth(i), i === 0 ? 1 : 0)
  await audit('manche 1, résultats')

  await tiles.nth(0).getByRole('button', { name: /^Bonus/ }).click()
  await page.waitForSelector('text=14 noir')
  await audit('feuille de bonus')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Valider la manche' }).click()
  await page.waitForSelector('[data-round="2"]')

  // La tuile du fantôme, qui n'existe qu'à deux joueurs. On y va par le
  // routeur et non par `goto` : le script sème le store avant chaque
  // chargement, et une vraie navigation rendrait la table à son état vide.
  await page.getByRole('link', { name: 'Accueil' }).click()
  await page.getByRole('button', { name: 'Nouvelle partie' }).click()
  await page.getByRole('checkbox', { name: /Anaïs/ }).click()
  await page.getByRole('checkbox', { name: /Bo/ }).click()
  await page.getByRole('button', { name: 'Commencer la partie' }).click()
  await page.waitForSelector('[data-player-tile]')
  await page.getByRole('button', { name: 'Valider les mises' }).click()
  await page.waitForSelector('[data-grey-beard-tile]')
  await audit('manche à deux, tuile du fantôme')

  for (const [route, marker, label] of [
    ['/rules', 'Qui remporte le pli', 'règles'],
    ['/settings', 'Langue', 'réglages'],
    ['/players', 'Joueurs', 'joueurs'],
    ['/history', 'Historique', 'historique'],
    ['/watch', 'Suivre une table', 'suivre une table'],
  ]) {
    await page.goto(`${base}${route}`)
    await page.waitForSelector(`text=${marker}`)
    await audit(label)
  }

  // Le suivi sans table au bout : la pastille en attente, sur le canevas.
  await page.goto(`${base}/watch/AB2C3D`)
  await page.waitForSelector('[data-watch-state="connecting"]')
  await audit('suivi, en attente de la table')

  // Un lien-résumé abîmé : l'erreur se nomme, et doit se lire.
  await page.goto(`${base}/recap#s=nimportequoi`)
  await page.waitForSelector('text=illisible')
  await audit('résumé illisible')

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
