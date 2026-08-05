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

/*
 * La saisie au clavier, avant tout le reste.
 *
 * Les deux boutons du compteur n'écoutaient que `pointerdown`, qu'aucune
 * touche n'émet et qu'aucun lecteur d'écran ne synthétise : mises, plis,
 * format et primes étaient hors d'atteinte sans pointeur. Rien ne le voyait,
 * puisque tous les parcours cliquent. Ce bloc est ce qui l'empêche de revenir.
 */
{
  const first = page.locator('[data-player-tile] [role=spinbutton]').first()
  await first.focus()
  check('le compteur prend le focus', await first.evaluate((node) => node === document.activeElement))

  await page.keyboard.press('ArrowUp')
  check('la flèche haute monte la valeur', (await first.getAttribute('aria-valuenow')) === '1')
  await page.keyboard.press('ArrowDown')
  check('la flèche basse la redescend', (await first.getAttribute('aria-valuenow')) === '0')
  await page.keyboard.press('End')
  check('Fin va à la borne haute', (await first.getAttribute('aria-valuenow')) === '1')
  await page.keyboard.press('Home')
  check('Origine revient à la borne basse', (await first.getAttribute('aria-valuenow')) === '0')

  // Et le bouton lui-même, activé comme le ferait une technologie d'assistance.
  const plus = page
    .locator('[data-player-tile]')
    .first()
    .getByRole('button', { name: /(Ajouter un pli|One more trick)/ })
  await plus.evaluate((node) => node.click())
  check('le bouton répond à une activation sans pointeur', (await first.getAttribute('aria-valuenow')) === '1')
  await page.keyboard.press('Home')
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
/*
 * Le bandeau qui porte « Annuler » reste. C'est le seul chemin de retour sur
 * une manche validée : une seconde ne suffit ni à lire la phrase, ni à
 * comprendre qu'on peut revenir, ni à viser le bouton.
 */
check(
  'le bandeau propose d annuler la manche',
  (await page.getByRole('button', { name: 'Annuler' }).count()) > 0,
)
await page.waitForTimeout(1400)
check(
  'et il reste le temps qu on s en serve',
  await page.getByText('Manche 1 enregistrée').isVisible(),
)
// Il se chasse à la main, de trois façons : la croix, le glissé, un appui.
await page.getByRole('button', { name: 'Fermer' }).click()
check(
  'la croix le chasse tout de suite',
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

// -------------------------------------------------- Barbe Grise, à deux joueurs

/** Repart d'une table vierge : les parties closes restent, la saisie s'en va. */
async function freshTable(names) {
  await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('sept-mers'))
    store.games = store.games.filter((game) => game.endedAt)
    delete store.draft
    delete store.liveDraft
    localStorage.setItem('sept-mers', JSON.stringify(store))
  })
  await page.goto(`${base}/new`)
  await page.reload()
  for (const name of names) {
    await page.getByRole('checkbox', { name: new RegExp(name) }).click()
  }
}

await freshTable(['Ana', 'Bo'])
await page.getByRole('button', { name: 'Commencer la partie' }).click()
await page.waitForSelector('[data-round="1"]')

const ghost = page.locator('[data-grey-beard-tile]')
check('le fantôme ne paraît pas pendant les mises', (await ghost.count()) === 0)

// Manche 1, 1 carte : les deux misent zéro, le pli revient donc au fantôme.
await page.getByRole('button', { name: 'Valider les mises' }).click()
check('la tuile du fantôme paraît aux résultats', await ghost.isVisible())
check('elle porte son nom', await ghost.getByText('Barbe Grise').isVisible())
check(
  'elle se remplit du reste toute seule',
  (await ghost.locator('[role=spinbutton]').getAttribute('aria-valuenow')) === '1',
)
check('elle dit qu elle est déduite', await ghost.getByText('Complété automatiquement').isVisible())
check(
  'la manche se valide sans un geste de plus',
  await page.getByRole('button', { name: 'Valider la manche' }).isEnabled(),
)
await shot('barbe-grise')
await page.getByRole('button', { name: 'Valider la manche' }).click()

// Manche 2, 2 cartes : un pli à Ana, le second au fantôme.
await page.waitForSelector('[data-round="2"]')
await setValue(page.locator('[data-player-tile]').nth(0), 1)
await page.getByRole('button', { name: 'Valider les mises' }).click()
check(
  'le fantôme se repose quand un joueur prend un pli',
  (await ghost.locator('[role=spinbutton]').getAttribute('aria-valuenow')) === '1',
)
await page.getByRole('button', { name: 'Valider la manche' }).click()
await page.waitForSelector('[data-round="3"]')
// L'écriture est debouncée à 300 ms : on la laisse passer avant de relire.
await page.waitForTimeout(500)
check(
  'les plis du fantôme ne comptent pour personne',
  await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('sept-mers'))
    const game = store.games.find((candidate) => !candidate.endedAt)
    return game.rounds[1].greyBeard === 1 && game.rounds[1].entries.length === 2
  }),
)

// ------------------------------------------------------------- Score Rascal

await freshTable(['Ana', 'Bo', 'Cy'])
await page.getByRole('button', { name: 'Options' }).click()
await page.getByRole('switch', { name: /Score Rascal/ }).click()
check(
  'le réglage des primes d une mise ratée quitte le panneau',
  (await page.getByRole('switch', { name: /Bonus comptés/ }).count()) === 0,
)
await page.getByRole('switch', { name: /Boulet de canon/ }).click()
await shot('options-rascal')
await page.getByRole('button', { name: 'Commencer la partie' }).click()
await page.waitForSelector('[data-round="1"]')

const rascalTiles = page.locator('[data-player-tile]')
check('la charge se déclare sur la tuile', await rascalTiles.nth(0).getByText('Mitraille').isVisible())
await rascalTiles.nth(0).getByRole('switch').click()
check('elle bascule au boulet', await rascalTiles.nth(0).getByText('Boulet').isVisible())

// Manche 1, 1 carte : Ana mise 1 et le prend, les autres misent 0.
await setValue(rascalTiles.nth(0), 1)
await page.getByRole('button', { name: 'Valider les mises' }).click()
await page.getByRole('button', { name: 'Valider la manche' }).click()
await page.waitForSelector('[data-round="2"]')

// Manche 2, 2 cartes : Bo mise 0 et prend un pli — un écart de 1, donc la
// moitié du potentiel, et surtout pas de points négatifs.
await setValue(rascalTiles.nth(0), 2)
await page.getByRole('button', { name: 'Valider les mises' }).click()
await setValue(rascalTiles.nth(0), 1)
await setValue(rascalTiles.nth(1), 1)
check('un pli d écart le dit sur la tuile', await rascalTiles.nth(1).getByText(/Moitié/).isVisible())
await shot('score-rascal')
await page.getByRole('button', { name: 'Valider la manche' }).click()
await page.waitForSelector('[data-round="3"]')

check(
  'le barème Rascal ne rend aucun point négatif',
  await page.evaluate(() => {
    const totals = [...document.querySelectorAll('[class*="totalValue"]')]
    return totals.length > 0 && totals.every((node) => !node.textContent.includes('\u2212'))
  }),
)

// ------------------------------------------------------------ Harry le Géant

/*
 * Le panneau d'options part du réglage laissé par la partie d'avant : la
 * section du Score Rascal vient de l'allumer, on l'éteint donc avant de
 * demander autre chose. C'est le prix d'un réglage qui se souvient, et il vaut
 * mieux l'écrire ici que de faire dépendre trois sections de leur ordre.
 */
await freshTable(['Ana', 'Bo', 'Cy'])
await page.getByRole('button', { name: 'Options' }).click()
await page.getByRole('switch', { name: /Score Rascal/ }).click()
await page.getByRole('switch', { name: /Pouvoirs/ }).click()
await page.getByRole('button', { name: 'Commencer la partie' }).click()
await page.waitForSelector('[data-round="1"]')

// Manche 1, 1 carte. Tout le monde mise zéro, puis Ana joue Harry le Géant et
// monte la sienne à 1 — sans repasser par l'étape des mises.
await page.getByRole('button', { name: 'Valider les mises' }).click()
const harryTiles = page.locator('[data-player-tile]')
await harryTiles.nth(0).getByRole('button', { name: /^(Bonus|\+ ?Bonus)/ }).click()
await page.waitForSelector('text=Harry le Géant')
await page.getByRole('radio', { name: 'Mise 1', exact: true }).click()
await page.getByRole('button', { name: 'Terminé' }).click()
check(
  'la tuile garde la mise annoncée et dit celle qu on défend',
  await harryTiles.nth(0).getByText('Mise 0 devenue 1').isVisible(),
)
await setValue(harryTiles.nth(0), 1)
check(
  'le score de la manche suit la mise déplacée',
  await harryTiles.nth(0).getByText('+20').isVisible(),
)
await shot('harry-le-geant')
await page.getByRole('button', { name: 'Valider la manche' }).click()
await page.waitForSelector('[data-round="2"]')
// L'écriture est debouncée à 300 ms : on la laisse passer avant de relire.
await page.waitForTimeout(500)
check(
  'le pas d Harry est enregistré à côté de la mise, pas à sa place',
  await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('sept-mers'))
    const game = store.games.find((candidate) => !candidate.endedAt)
    const entry = game.rounds[0].entries[0]
    return entry.bid === 0 && entry.harry === 1
  }),
)

// -------------------------------------------------- la Baleine blanche seule

await freshTable(['Ana', 'Bo', 'Cy'])
await page.getByRole('button', { name: 'Options' }).click()
await page.getByRole('switch', { name: /Pouvoirs/ }).click()
await page.getByRole('switch', { name: /Baleine blanche/ }).click()
await page.getByRole('button', { name: 'Commencer la partie' }).click()
await page.waitForSelector('[data-round="1"]')
await page.getByRole('button', { name: 'Valider les mises' }).click()
const voidedTile = page.locator('[data-voided]')
check('le compteur de plis écartés paraît avec la seule Baleine', await voidedTile.isVisible())
check(
  'et il nomme la Baleine plutôt que le Kraken',
  await voidedTile.getByText(/Baleine blanche/).isVisible(),
)

// --------------------------------------------------------- une partie courte

await freshTable(['Ana', 'Bo', 'Cy'])
await page.getByRole('button', { name: 'Options' }).click()
await page.getByRole('switch', { name: /Baleine blanche/ }).click()
// Trois manches, trois cartes à la première : le format du livret n'est qu'un
// défaut.
for (let i = 0; i < 7; i += 1) {
  await page.getByRole('button', { name: 'Une manche de moins' }).click()
}
for (let i = 0; i < 2; i += 1) {
  await page.getByRole('button', { name: 'Une carte de plus à la première manche' }).click()
}
check(
  'le panneau annonce le plan de la partie avant de distribuer',
  await page.getByText('3 manches, de 3 à 5 cartes.').isVisible(),
)
await shot('format-de-partie')
await page.getByRole('button', { name: 'Commencer la partie' }).click()
await page.waitForSelector('[data-round="1"]')
check(
  'la première manche distribue les cartes du format',
  await page.getByText('3 cartes').first().isVisible(),
)
check('la partie se compte en trois manches', await page.getByText('sur 3').first().isVisible())

await playRound(1, [3, 0, 0], [3, 0, 0])
await playRound(2, [4, 0, 0], [4, 0, 0])
await playRound(3, [5, 0, 0], [5, 0, 0])
await page.waitForSelector('text=Fin de partie', { timeout: 10000 })
check(
  'l écran de fin s ouvre à la dernière manche du format',
  await page.getByText('Fin de partie').isVisible(),
)

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
