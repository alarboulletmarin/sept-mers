import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'

/*
 * Les chemins se calculent depuis la racine du projet, et non depuis
 * `import.meta.url`.
 *
 * Vite compile `vite.config.ts` et ce qu'il importe dans un fichier temporaire
 * de `node_modules/.vite-temp/` : `import.meta.url` y désigne ce fichier-là, et
 * tout chemin relatif tombe deux dossiers plus loin que prévu. La racine, elle,
 * est celle où la commande tourne, et le greffon la reçoit de Vite.
 */
const require = createRequire(import.meta.url)

/**
 * Ce que le bundle embarque et qui n'est pas de nous.
 *
 * La liste est écrite à la main, et c'est voulu : `node_modules` contient des
 * centaines de paquets dont aucun ne part chez l'utilisateur, et un fichier de
 * licences qui les citerait tous ne serait plus lu par personne. Ceux-ci
 * partent vraiment — trois dans le bundle d'entrée, un dans le chunk du
 * partage de table, un dans le service worker.
 *
 * `scripts/licenses.mjs` échoue si l'un d'eux disparaît du build ou si un
 * nouveau s'y invite sans passer par ici.
 */
export const BUNDLED = ['react', 'react-dom', 'scheduler', 'trystero', 'uqr', 'workbox-window']

/** Les fontes embarquées, avec le texte de licence conservé à côté d'elles. */
export const FONTS = [
  { name: 'Instrument Sans', file: 'src/styles/fonts/OFL-instrument-sans.txt' },
  { name: 'JetBrains Mono', file: 'src/styles/fonts/OFL-jetbrains-mono.txt' },
]

const LICENSE_FILES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'LICENCE']

/**
 * Le dossier d'un paquet installé.
 *
 * On regarde `node_modules` avant de demander à Node : un paquet peut
 * parfaitement déclarer des `exports` qui ne publient pas son propre
 * `package.json` — c'est le cas d'`uqr` —, et `require.resolve` refuse alors
 * de le résoudre. Le dossier, lui, est toujours là.
 */
export function packageRoot(root, name) {
  const installed = join(root, 'node_modules', name)
  if (existsSync(join(installed, 'package.json'))) return installed
  return dirname(require.resolve(`${name}/package.json`))
}

function readLicense(projectRoot, name) {
  const root = packageRoot(projectRoot, name)
  const meta = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  for (const candidate of LICENSE_FILES) {
    const path = join(root, candidate)
    if (existsSync(path)) {
      return { name, version: meta.version, license: meta.license, text: readFileSync(path, 'utf8') }
    }
  }
  // Pas de fichier : on garde au moins le nom de la licence déclarée, plutôt
  // que de taire le paquet.
  return { name, version: meta.version, license: meta.license, text: null }
}

function render(root) {
  const header = [
    'Sept Mers — licences des composants embarqués',
    '',
    "Ce fichier accompagne l'application distribuée. Il porte les mentions de",
    'copyright et les licences de tout ce que le site sert et qui ne relève pas',
    "de la licence de l'app elle-même.",
    '',
    "L'app : AGPL-3.0-only, voir le dépôt. Le texte des règles, le design system",
    'et les captures y sont aussi disponibles sous CC BY-SA 4.0.',
    '',
  ]

  const parts = [header.join('\n')]

  parts.push(
    ['='.repeat(72), 'Dépendances embarquées dans le bundle', '='.repeat(72), ''].join('\n'),
  )
  for (const name of BUNDLED) {
    const entry = readLicense(root, name)
    parts.push(
      [
        '-'.repeat(72),
        `${entry.name} ${entry.version} — ${entry.license ?? 'licence non déclarée'}`,
        '-'.repeat(72),
        '',
        entry.text ?? '(texte de licence absent du paquet publié)',
        '',
      ].join('\n'),
    )
  }

  parts.push(['='.repeat(72), 'Fontes embarquées', '='.repeat(72), ''].join('\n'))
  for (const font of FONTS) {
    const text = readFileSync(resolve(root, font.file), 'utf8')
    parts.push(
      ['-'.repeat(72), `${font.name} — SIL Open Font License 1.1`, '-'.repeat(72), '', text, ''].join(
        '\n',
      ),
    )
  }

  return parts.join('\n')
}

/**
 * Écrit `licenses.txt` à côté du bundle, et une copie du texte de chaque OFL.
 *
 * Deux obligations, une seule cause : ce qui est distribué doit l'être avec sa
 * licence. Les paquets sous MIT demandent que leur mention de copyright suive
 * « toutes les copies », et un site déployé en est une — le bundle minifié n'en
 * portait aucune. L'OFL 1.1 demande la même chose pour chaque copie des
 * fichiers de fonte : les quatre `.woff2` partaient dans `dist/`, leurs deux
 * textes de licence restaient dans `src/`.
 *
 * Le texte source reste unique — celui de `src/styles/fonts/` —, et c'est le
 * build qui l'emporte, plutôt qu'une copie à tenir à jour dans `public/`.
 */
export function licenses() {
  /** La racine du projet, donnée par Vite plutôt que devinée. */
  let root = process.cwd()

  return {
    name: 'sept-mers-licenses',
    // Littéral et non chaîne large : c'est ce que le type de greffon attend,
    // et `tsc` lit ce fichier avec la configuration de `vite.config.ts`.
    apply: /** @type {const} */ ('build'),
    configResolved(config) {
      root = config.root
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'licenses.txt', source: render(root) })
      for (const font of FONTS) {
        const source = readFileSync(resolve(root, font.file), 'utf8')
        const fileName = `licenses/${font.file.split('/').pop()}`
        this.emitFile({ type: 'asset', fileName, source })
      }
    },
  }
}
