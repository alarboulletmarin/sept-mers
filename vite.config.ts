import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Le service worker précache le shell et s'invalide par version de build.
// On la fige au démarrage de Vite pour que `sw.js` et le HTML parlent de la même chose.
const BUILD_VERSION = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)

export default defineConfig({
  plugins: [
    react(),
    {
      // `public/sw.js` est copié tel quel par Vite : on y injecte la version
      // au passage, pour que chaque build produise un cache distinct.
      name: 'sept-mers-sw-version',
      transformIndexHtml: {
        // `post` pour que le bundle soit connu : c'est lui qui porte les noms
        // hachés des fontes.
        order: 'post',
        handler(html, context) {
          const withVersion = html.replace(/__BUILD_VERSION__/g, BUILD_VERSION)

          /*
           * Les deux voix de l'app sont en place dès le premier écran : le
           * romain porte le nom, l'italique la phrase qui suit, le grotesque
           * tout le reste. Sans préchargement, le premier rendu se fait dans la
           * pile système et saute quand les fontes arrivent — un ressaut
           * d'autant plus visible que le romain et sa doublure système n'ont ni
           * la même chasse ni la même hauteur d'x.
           *
           * On ne précharge que la tranche `latin` : `latin-ext` ne descend que
           * si un caractère l'exige, et ce serait 43 ko pour rien.
           */
          const faces = Object.keys(context.bundle ?? {}).filter(
            (name) => name.endsWith('.woff2') && !name.includes('latin-ext'),
          )
          if (faces.length === 0) return withVersion

          const links = faces
            .sort()
            .map(
              (name) =>
                `    <link rel="preload" href="./${name}" as="font" type="font/woff2" crossorigin />`,
            )
            .join('\n')
          return withVersion.replace('</head>', `${links}\n  </head>`)
        },
      },
      generateBundle(_options, bundle) {
        // Le service worker doit précacher les fichiers réellement produits :
        // leurs noms portent un hash, il ne peut pas les deviner. Sans cette
        // liste, le shell est en cache mais le JS manque, et le mode avion
        // ouvre une page blanche.
        const assets = Object.keys(bundle).filter((name) => name !== 'sw-version.js')
        this.emitFile({
          type: 'asset',
          fileName: 'sw-version.js',
          source:
            `self.__SEPT_MERS_VERSION = ${JSON.stringify(BUILD_VERSION)}\n` +
            `self.__SEPT_MERS_ASSETS = ${JSON.stringify(assets)}\n`,
        })
      },
    },
  ],
  // Chemins relatifs : l'app tourne aussi bien à la racine d'un domaine que
  // dans un sous-dossier, ou ouverte directement depuis le disque.
  base: './',
  build: {
    target: 'es2022',
    // Un seul chunk : l'app est petite et doit démarrer d'un trait hors ligne.
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
