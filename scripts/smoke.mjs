/**
 * Parcours complet dans un vrai navigateur : création de partie, dix manches,
 * bonus, écran de fin, reprise après fermeture, export/import, thème sombre.
 *
 *   node scripts/smoke.mjs [--shots]
 */
import { launchChromium, listen, serveDist } from './browser.mjs'
import { mkdirSync } from 'node:fs'

const SHOTS = process.argv.includes('--shots')
const SHOT_DIR = new URL('../shots/', import.meta.url).pathname

const requests = []

const server = serveDist()
const base = await listen(server)

const browser = await launchChromium()
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' })
const page = await context.newPage()

const failures = []
const check = (label, condition) => {
  if (condition) console.log(`  ok   ${label}`)
  else {
    console.log(`  FAIL ${label}`)
    failures.push(label)
  }
}

page.on('console', (message) => {
  if (message.type() === 'error') failures.push(`console: ${message.text()}`)
})
page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`))
page.on('request', (request) => requests.push(request.url()))

if (SHOTS) mkdirSync(SHOT_DIR, { recursive: true })
let shotIndex = 0
const shot = async (name) => {
  if (!SHOTS) return
  shotIndex += 1
  await page.screenshot({ path: `${SHOT_DIR}${String(shotIndex).padStart(2, '0')}-${name}.png`, fullPage: true })
}

// ------------------------------------------------------------------ accueil

await page.goto(base)
await page.waitForSelector('text=Sept Mers')
check('l accueil guide au premier lancement', await page.getByText('Comment ça marche').isVisible())
await shot('accueil-vide')

// -------------------------------------------------------------- nouvelle partie

await page.getByRole('button', { name: 'Nouvelle partie' }).click()
await page.waitForSelector('text=Ajouter un joueur')

for (const name of ['Ana', 'Bo', 'Cy', 'Dee']) {
  await page.getByPlaceholder('Nom du joueur').fill(name)
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
}
check('quatre joueurs sont à table', (await page.locator('ol li').count()) === 4)

const startButton = page.getByRole('button', { name: 'Commencer la partie' })
check('le bouton de démarrage est actif', await startButton.isEnabled())
await shot('nouvelle-partie')
await startButton.click()

// ---------------------------------------------------------------- les manches

await page.waitForSelector('[data-round="1"]')


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

/** Saisit une manche : mises puis plis, dont la somme vaut le nombre de cartes. */
async function playRound(round, bids, tricks, bonus = null, watchAuto = false) {
  await page.waitForSelector(`[data-round="${round}"]`)
  const tiles = page.locator('[data-player-tile]')

  for (let seat = 0; seat < bids.length; seat += 1) {
    await setValue(tiles.nth(seat), bids[seat])
  }
  await page.getByRole('button', { name: 'Valider les mises' }).click()

  // Le dernier joueur se complète tout seul : on ne saisit que les autres.
  for (let seat = 0; seat < tricks.length - 1; seat += 1) {
    await setValue(tiles.nth(seat), tricks[seat])
  }

  if (watchAuto) {
    const last = tricks.length - 1
    check(
      `la déduction remplit le dernier joueur à la manche ${round}`,
      Number((await readValues())[last]) === tricks[last],
    )
    check(
      'la tuile déduite dit qu elle est déduite',
      await page.getByText('Complété automatiquement').isVisible(),
    )
  }

  if (bonus) {
    await tiles.nth(bonus.seat).getByRole('button', { name: /^(Bonus|\+ ?Bonus)/ }).click()
    for (let i = 0; i < bonus.count; i += 1) {
      await page.getByRole('button', { name: `Ajouter un ${bonus.label}` }).click()
    }
    await page.getByRole('button', { name: 'Terminé' }).click()
  }

  await page.getByRole('button', { name: 'Valider la manche' }).click()
}

/** Les valeurs affichées sur les quatre tuiles, dans l'ordre à table. */
async function readValues() {
  const steppers = page.locator('[data-player-tile] [role=spinbutton]')
  const count = await steppers.count()
  const values = []
  for (let seat = 0; seat < count; seat += 1) {
    values.push(await steppers.nth(seat).getAttribute('aria-valuenow'))
  }
  return values
}

check(
  'la barre de navigation reste en partie',
  await page.getByRole('navigation', { name: 'Sections' }).isVisible(),
)
check(
  'les mises partent à zéro, pas à vide',
  (await readValues()).every((value) => value === '0'),
)
check(
  'l onglet Accueil est celui de la partie',
  (await page.getByRole('link', { name: 'Accueil' }).getAttribute('aria-current')) === 'page',
)

// Manche 1 : une carte, un pli. Une seule mise à poser — les plis partent
// ensuite semés sur les mises, donc la manche se valide sans y toucher.
await setValue(page.locator('[data-player-tile]').nth(0), 1)
await page.getByRole('button', { name: 'Valider les mises' }).click()
check('les plis partent sur la mise de chacun', (await readValues()).join() === '1,0,0,0')
await page.getByRole('button', { name: 'Valider la manche' }).click()
check('la manche 1 est enregistrée', await page.getByText('Manche 1 enregistrée').isVisible())
check(
  'le bandeau porte une croix pour le chasser',
  (await page.getByRole('button', { name: 'Fermer' }).count()) > 0,
)
// Une seconde, pas cinq : le bandeau confirme, il ne réclame pas de lecture.
await page.waitForTimeout(1400)
check(
  'le bandeau s efface de lui-même en une seconde',
  (await page.getByText('Manche 1 enregistrée').count()) === 0,
)
await shot('manche-2-mises')

// Manche 2, avec un 14 noir pour Ana.
await playRound(2, [1, 1, 0, 0], [1, 1, 0, 0], { seat: 0, label: '14 noir', count: 1 })

// ------------------------------------------------ revenir à la manche d'avant

await page.waitForSelector('[data-round="3"]')
await setValue(page.locator('[data-player-tile]').nth(0), 3)
await page.getByRole('button', { name: 'Revenir à la manche 2' }).click()
await page.waitForSelector('[data-round="2"]')
check(
  'on revient à la manche précédente depuis la manche en cours',
  await page.getByText('Correction de la manche 2').isVisible(),
)
await page.getByRole('button', { name: 'Reprendre la manche en cours' }).click()
await page.waitForSelector('[data-round="3"]')
check('la saisie en cours survit à l aller-retour', (await readValues())[0] === '3')

// Le reste de la partie. La manche 5 laisse le dernier joueur à la déduction.
const plan = [
  [3, [1, 1, 1, 0], [1, 1, 1, 0]],
  [4, [2, 1, 1, 0], [2, 1, 1, 0]],
  [5, [2, 1, 1, 1], [0, 2, 2, 1], null, true],
  [6, [2, 2, 1, 1], [2, 2, 1, 1]],
  [7, [3, 2, 1, 1], [3, 2, 1, 1]],
  [8, [3, 2, 2, 1], [3, 2, 2, 1]],
  [9, [3, 3, 2, 1], [3, 3, 2, 1]],
  [10, [4, 3, 2, 1], [4, 3, 2, 1]],
]
for (const [round, bids, tricks, bonus, watchAuto] of plan) {
  await playRound(round, bids, tricks, bonus, watchAuto)
}

// ------------------------------------------------------------------ fin de partie

await page.waitForSelector('text=Fin de partie', { timeout: 10000 })
check('l écran de fin s ouvre après la manche 10', await page.getByText('Fin de partie').isVisible())
check('un vainqueur est annoncé', await page.getByText(/l'emporte/).isVisible())
check('le graphique des scores est rendu', (await page.locator('svg path[stroke]').count()) > 0)
check('le tableau manche par manche est là', await page.getByText('Manche par manche').isVisible())
await shot('fin-de-partie')

// -------------------------------------------------- reprise après fermeture

await page.getByRole('button', { name: 'Terminer' }).click()
await page.waitForSelector('text=Parties')
check('la partie rejoint l historique', await page.getByText('terminées et enregistrées').isVisible())

await page.getByRole('button', { name: 'Nouvelle partie' }).click()
await page.getByRole('checkbox', { name: /Ana/ }).click()
await page.getByRole('checkbox', { name: /Bo/ }).click()
await page.getByRole('button', { name: 'Commencer la partie' }).click()
await page.waitForSelector('[data-round="1"]')
await setValue(page.locator('[data-player-tile]').nth(0), 1)

// Fermer et rouvrir doit restituer la manche, la phase et la saisie en cours.
await page.reload()
await page.waitForSelector('[data-round="1"]')
const restored = await page
  .locator('[data-player-tile]')
  .nth(0)
  .locator('[role=spinbutton]')
  .getAttribute('aria-valuenow')
check('la saisie en cours est restituée après rechargement', restored === '1')
await shot('reprise')

// Depuis l'accueil, la partie en cours se reprend d'un tap.
await page.goto(`${base}/`)
await page.waitForSelector('text=Reprendre')
check('l accueil propose de reprendre', await page.getByText('Reprendre').isVisible())
await page.getByText('Reprendre').click()
await page.waitForSelector('[data-round="1"]')
check('la reprise rouvre la manche en cours', await page.locator('[data-round]').first().isVisible())

// ------------------------------------------------------------------ plafond à 8

await page.evaluate(() => {
  const store = JSON.parse(localStorage.getItem('sept-mers'))
  store.games = store.games.filter((game) => game.endedAt)
  delete store.draft
  localStorage.setItem('sept-mers', JSON.stringify(store))
})
await page.goto(`${base}/new`)
await page.reload()
for (const name of ['Eve', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo']) {
  await page.getByPlaceholder('Nom du joueur').fill(name)
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
}
for (const name of ['Ana', 'Bo']) {
  await page.getByRole('checkbox', { name: new RegExp(name) }).click()
}
check('la table accepte huit joueurs', (await page.locator('ol li').count()) === 8)
await page.getByRole('button', { name: 'Commencer la partie' }).click()
await page.waitForSelector('[data-round="1"]')
// L'écriture est debouncée à 300 ms : on la laisse passer avant d'injecter,
// sinon la sauvegarde en attente écrase l'injection au rechargement.
await page.waitForTimeout(500)

// Sauter directement à la manche 9 en injectant huit manches jouées.
await page.evaluate(() => {
  const store = JSON.parse(localStorage.getItem('sept-mers'))
  const game = store.games.find((candidate) => !candidate.endedAt)
  const empty = {
    colorFourteens: 0,
    blackFourteen: 0,
    mermaidsTakenByPirate: 0,
    piratesTakenBySkullKing: 0,
    skullKingTakenByMermaid: 0,
  }
  game.rounds = Array.from({ length: 8 }, (_, i) => ({
    index: i + 1,
    cards: i + 1,
    entries: game.playerIds.map((playerId, seat) => ({
      playerId,
      bid: seat === 0 ? i + 1 : 0,
      tricks: seat === 0 ? i + 1 : 0,
      bonus: { ...empty },
    })),
  }))
  delete store.draft
  localStorage.setItem('sept-mers', JSON.stringify(store))
})
await page.goto(`${base}/game`)
await page.reload()
await page.waitForSelector("text=Le paquet ne suit plus")
check('à huit joueurs, la manche 9 se joue à 8 cartes', await page.getByText('8 cartes').first().isVisible())
check('le plafond est expliqué', await page.getByText(/Le paquet ne suit plus/).isVisible())
await shot('plafond-huit-joueurs')

// ------------------------------------------------------------- thème et langue

await page.goto(`${base}/settings`)
await page.getByRole('radio', { name: 'Sombre' }).click()
const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
check('le thème sombre s applique', theme === 'dark')
await shot('reglages-sombre')

await page.getByRole('radio', { name: 'English' }).click()
check('la langue bascule à chaud', await page.getByRole('heading', { name: 'Settings' }).isVisible())
const stillRunning = await page.evaluate(
  () => JSON.parse(localStorage.getItem('sept-mers')).games.some((game) => !game.endedAt),
)
check('le changement de langue ne perd pas la partie en cours', stillRunning)

await page.getByRole('radio', { name: 'Français' }).click()
await page.getByRole('radio', { name: 'Clair' }).click()

// ----------------------------------------------------------------- règles

await page.goto(`${base}/rules`)
await page.waitForSelector('text=Règles')
check('les règles s ouvrent', await page.getByText('Qui remporte le pli').isVisible())
await shot('regles')

// ---------------------------------------------------------------- adresses

/*
 * Le routeur est passé du hash au chemin. Quatre choses en dépendent, et
 * aucune ne se voit depuis un test unitaire : elles tiennent au navigateur,
 * à son historique, et à ce que l'hébergeur répond sur une route.
 */
const url = () => page.evaluate(() => location.pathname + location.search + location.hash)

await page.goto(base)
await page.getByRole('link', { name: 'Règles' }).click()
await page.waitForSelector('text=Qui remporte le pli')
check('naviguer écrit l adresse en clair', (await url()) === '/rules')

await page.getByRole('link', { name: 'Historique' }).click()
await page.waitForSelector('text=Historique')
await page.goBack()
await page.waitForSelector('text=Qui remporte le pli')
check('le bouton précédent revient à l écran d avant', (await url()) === '/rules')
await page.goForward()
await page.waitForSelector('text=Historique')
check('le bouton suivant y retourne', (await url()) === '/history')

// Une adresse de l'ancien routeur, telle qu'un signet la garde.
await page.goto(`${base}/#/rules`)
await page.waitForSelector('text=Qui remporte le pli')
check('une adresse en hash ouvre encore son écran', await page.getByText('Qui remporte le pli').isVisible())
check('et la barre d adresse est remise en clair', (await url()) === '/rules')

// Une adresse qui ne nomme rien : l'accueil, et l'adresse le dit aussi.
await page.goto(`${base}/regles`)
await page.waitForSelector('text=Sept Mers')
check('une adresse inconnue retombe sur l accueil', (await url()) === '/')

// -------------------------------------------------------------- pas de réseau

const external = requests.filter((url) => !url.startsWith(base))
check('aucune requête hors de l origine', external.length === 0)

// ------------------------------------------------------------- aucun emoji

const emojiFound = await page.evaluate(() => {
  const emoji = /\p{Extended_Pictographic}/u
  return emoji.test(document.body.innerText)
})
check('aucun emoji dans l interface', emojiFound === false)

await browser.close()
server.close()

console.log('')
if (failures.length > 0) {
  console.log(`${failures.length} échec(s) :`)
  for (const failure of failures) console.log(`  - ${failure}`)
  process.exit(1)
}
console.log('Parcours complet : tout passe.')
