/**
 * Le partage de table, de bout en bout : un téléphone tient la partie, un
 * autre la suit en direct, puis reçoit le lien-résumé. Deux pages d'un même
 * navigateur, transport local forcé — le parcours prouve le fil complet sans
 * qu'une seule requête sorte, relais compris.
 *
 *   node scripts/share.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { launchChromium, listen, serveDist } from './browser.mjs'

const server = serveDist()
const base = await listen(server)

/**
 * Le chunk de Trystero, repéré au contenu : lui ne doit jamais être demandé.
 * En transport local, le direct entier doit vivre sans en charger une ligne.
 */
const assetsDir = new URL('../dist/assets/', import.meta.url).pathname
const trysteroChunk = readdirSync(assetsDir).find(
  (file) => file.endsWith('.js') && readFileSync(join(assetsDir, file), 'utf8').includes('nostr'),
)

const browser = await launchChromium()
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' })
// Posé avant tout chargement, et pour toutes les pages du contexte : c'est la
// clé que lit la fabrique de transport.
await context.addInitScript(() => {
  localStorage.setItem('sept-mers:transport', 'loopback')
})

const failures = []
const check = (label, condition) => {
  if (condition) console.log(`  ok   ${label}`)
  else {
    console.log(`  FAIL ${label}`)
    failures.push(label)
  }
}

const requests = []
const watchPage = (page, name) => {
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console ${name}: ${message.text()}`)
  })
  page.on('pageerror', (error) => failures.push(`pageerror ${name}: ${error.message}`))
  page.on('request', (request) => requests.push(request.url()))
}

const host = await context.newPage()
watchPage(host, 'table')

/** Pose une valeur sur une tuile via les boutons moins et plus. */
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

// ------------------------------------------------------ la table se compose

await host.goto(base)
await host.getByRole('button', { name: 'Nouvelle partie' }).click()
for (const name of ['Ana', 'Bo', 'Cy']) {
  await host.getByPlaceholder('Nom du joueur').fill(name)
  await host.getByRole('button', { name: 'Ajouter', exact: true }).click()
}
await host.getByRole('button', { name: 'Commencer la partie' }).click()
await host.waitForSelector('[data-round="1"]')

// ------------------------------------------------------- le direct s'ouvre

await host.getByRole('button', { name: 'Partager la table' }).click()
check(
  'la feuille propose de lancer le direct',
  await host.getByRole('button', { name: 'Lancer le direct' }).isVisible(),
)
await host.getByRole('button', { name: 'Lancer le direct' }).click()
await host.waitForSelector('[data-share-code]')

const code = (await host.locator('[data-share-code]').textContent()).trim()
check('un code de table est affiché', /^[A-Z2-9]{6}$/.test(code))
check(
  'le QR de la salle est rendu',
  await host.getByRole('img', { name: 'Code à scanner pour suivre la table' }).isVisible(),
)
check(
  'l adresse de la salle est écrite en clair',
  await host.getByText(`/watch/${code}`).isVisible(),
)
await host.keyboard.press('Escape')
check('la partie se dit en direct', await host.getByText(/En direct · 0/).isVisible())

// ------------------------------------------------- un téléphone suit la table

const guest = await context.newPage()
watchPage(guest, 'spectateur')
await guest.goto(`${base}/watch/${code}`)
await guest.waitForSelector('[data-watch-state="live"]', { timeout: 10000 })

check('les noms de la table sont là', await guest.getByText('Ana').first().isVisible())
check('une tuile par joueur', (await guest.locator('[data-watch-tile]').count()) === 3)
check(
  'rien ne se saisit côté spectateur',
  (await guest.locator('[role=spinbutton]').count()) === 0,
)
await host.waitForSelector('text=/En direct · 1/')
check('la table compte son spectateur', true)

// ------------------------------------------------------- la saisie se propage

await setValue(host.locator('[data-player-tile]').nth(0), 1)
await guest.waitForFunction(
  () => document.querySelector('[data-watch-tile] [class*="value"]')?.textContent === '1',
)
check('une mise posée arrive sur l autre téléphone', true)

await host.getByRole('button', { name: 'Valider les mises' }).click()
await guest.waitForFunction(() =>
  document.querySelector('[aria-current="step"]')?.textContent?.includes('résultats'),
)
check('le passage aux résultats se voit en face', true)

await host.getByRole('button', { name: 'Valider la manche' }).click()
await guest.waitForFunction(
  () => document.querySelector('[class*="roundNumber"]')?.textContent === '2',
)
check('la manche validée ouvre la 2 chez le spectateur', true)
check('les totaux paraissent', (await guest.locator('[class*="totalItem"]').count()) === 3)
check(
  'le tableau des manches est là',
  await guest.getByText('Manche par manche').isVisible(),
)

// ------------------------------------------------------------- la correction

await host.getByRole('button', { name: 'Revenir à la manche 1' }).click()
await guest.waitForSelector('text=Correction de la manche 1')
check('la correction d une manche passée se dit en face', true)
await host.getByRole('button', { name: 'Reprendre la manche en cours' }).click()
await guest.waitForFunction(
  () => document.querySelector('[class*="roundNumber"]')?.textContent === '2',
)

// ------------------------------------- rechargement de la table : la salle revit

// On saute à la manche 10 en injectant neuf manches jouées, puis on recharge :
// la session retenue sous `sept-mers:share` doit rouvrir la salle d'elle-même.
await host.waitForTimeout(500)
await host.evaluate(() => {
  const store = JSON.parse(localStorage.getItem('sept-mers'))
  const game = store.games.find((candidate) => !candidate.endedAt)
  const empty = {
    colorFourteens: 0,
    blackFourteen: 0,
    mermaidsTakenByPirate: 0,
    piratesTakenBySkullKing: 0,
    skullKingTakenByMermaid: 0,
  }
  game.rounds = Array.from({ length: 9 }, (_, i) => ({
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
  delete store.liveDraft
  localStorage.setItem('sept-mers', JSON.stringify(store))
})
await host.goto(`${base}/game`)
await host.waitForSelector('[data-round="10"]')
await guest.waitForFunction(
  () => document.querySelector('[class*="roundNumber"]')?.textContent === '10',
  null,
  { timeout: 10000 },
)
check('la salle revit après un rechargement de la table', true)

// ------------------------------------------------------------ fin de partie

await setValue(host.locator('[data-player-tile]').nth(0), 10)
await host.getByRole('button', { name: 'Valider les mises' }).click()
await host.getByRole('button', { name: 'Valider la manche' }).click()
await host.waitForSelector('text=Fin de partie')

await guest.waitForSelector("text=l'emporte", { timeout: 10000 })
check('le spectateur voit le résultat', true)
check(
  'le spectateur est toujours en direct',
  (await guest.locator('[data-watch-state]').getAttribute('data-watch-state')) === 'live',
)

// ------------------------------------------------- le résumé, puis la sortie

await host.getByRole('button', { name: 'Partager le résumé' }).click()
await host.waitForSelector('[data-recap-url]')
const recapUrl = await host.locator('[data-recap-url]').getAttribute('data-recap-url')
// Le numéro de version du résumé monte quand sa forme change : on vérifie
// qu'il y en a un, pas lequel.
check('le lien-résumé est prêt', Boolean(recapUrl && /\/recap#s=\d+\./.test(recapUrl)))
check(
  'le QR du résumé est rendu',
  await host.getByRole('img', { name: 'Code à scanner pour ouvrir le résumé' }).isVisible(),
)

await host.getByRole('button', { name: 'Arrêter le direct' }).click()
await guest.waitForSelector('[data-watch-state="ended"]', { timeout: 10000 })
check('l arrêt du direct se dit en face', true)

// Ce que le lecteur du résumé a déjà en stock ne doit pas bouger : la partie
// reçue se regarde, elle ne s'enregistre pas.
const storedBefore = await guest.evaluate(() => JSON.parse(localStorage.getItem('sept-mers')))
await guest.goto(recapUrl)
await guest.waitForSelector('text=Résumé de partie')
await guest.waitForSelector("text=l'emporte")
check('le lien-résumé rouvre la partie entière', await guest.getByText('Manche par manche').isVisible())

const storedAfter = await guest.evaluate(() => JSON.parse(localStorage.getItem('sept-mers')))
check(
  'le résumé n ajoute ni partie ni joueur au stockage de qui le lit',
  storedAfter.games.length === storedBefore.games.length &&
    storedAfter.players.length === storedBefore.players.length,
)

// ------------------------------------------------------------ pas de réseau

const external = requests.filter((url) => !url.startsWith(base))
check('aucune requête hors de l origine, sur les deux pages', external.length === 0)
check(
  'le chunk de Trystero n est jamais chargé en transport local',
  Boolean(trysteroChunk) && !requests.some((url) => url.includes(trysteroChunk)),
)

await browser.close()
server.close()

console.log('')
if (failures.length > 0) {
  console.log(`${failures.length} échec(s) :`)
  for (const failure of failures) console.log(`  - ${failure}`)
  process.exit(1)
}
console.log('Partage de table : tout passe.')
