/*
 * Vérifie que le build distribue bien les licences de ce qu'il embarque.
 *
 *   node scripts/licenses.mjs
 *
 * Deux obligations, et deux façons de les rater sans s'en apercevoir :
 *
 * - Les paquets sous MIT demandent que leur mention de copyright accompagne
 *   « toutes les copies ». Un site déployé en est une, et le bundle minifié
 *   n'en portait aucune.
 * - L'OFL 1.1 demande la même chose pour chaque copie des fichiers de fonte.
 *   Les quatre `.woff2` partaient dans `dist/`, leurs deux textes de licence
 *   restaient dans `src/`.
 *
 * Le greffon `vite-licenses` répare les deux. Ce script est ce qui empêche la
 * réparation de disparaître en silence : il lit le build, pas le code.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { BUNDLED, FONTS } from './vite-licenses.mjs'

const root = process.cwd()
const dist = join(root, 'dist')

const failures = []
const check = (label, ok) => {
  if (!ok) failures.push(label)
  console.log(`${ok ? '  ok  ' : ' RATÉ '} ${label}`)
}

if (!existsSync(dist)) {
  console.error("dist/ absent : lance `npm run build` d'abord.")
  process.exit(1)
}

const manifest = join(dist, 'licenses.txt')
check('licenses.txt est écrit à côté du bundle', existsSync(manifest))
if (!existsSync(manifest)) process.exit(1)

const text = readFileSync(manifest, 'utf8')

for (const name of BUNDLED) {
  check(`${name} y est cité`, text.includes(name))
}

// Le texte, et pas seulement le nom : citer un paquet sans sa licence ne
// remplit aucune des deux obligations.
check(
  'les licences MIT y sont recopiées en toutes lettres',
  (text.match(/Permission is hereby granted, free of charge/g) ?? []).length >= BUNDLED.length - 1,
)

for (const font of FONTS) {
  check(`${font.name} y est cité`, text.includes(font.name))
}
check(
  'le texte de la SIL Open Font License y figure',
  text.includes('SIL OPEN FONT LICENSE Version 1.1'),
)

for (const font of FONTS) {
  const file = join(dist, 'licenses', font.file.split('/').pop())
  check(`${font.file.split('/').pop()} est distribué`, existsSync(file))
}

/*
 * Le garde-fou qui compte vraiment : un paquet d'exécution ajouté sans passer
 * par la liste. Les dépendances de développement, elles, ne partent pas chez
 * l'utilisateur et n'ont rien à faire ici.
 */
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
for (const name of Object.keys(pkg.dependencies ?? {})) {
  check(`la dépendance d'exécution ${name} est déclarée dans vite-licenses`, BUNDLED.includes(name))
}

// Les fontes réellement servies, comparées à celles dont on publie la licence.
const assets = readdirSync(join(dist, 'assets')).filter((file) => file.endsWith('.woff2'))
const families = new Set(assets.map((file) => file.split('-latin')[0]))
check(
  `les ${families.size} familles servies ont leur licence`,
  families.size === FONTS.length,
)

if (failures.length > 0) {
  console.error(`\n${failures.length} vérification(s) en échec.`)
  process.exit(1)
}
console.log('\nLicences : tout ce qui est distribué porte la sienne.')
