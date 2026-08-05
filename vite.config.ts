import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { licenses } from './scripts/vite-licenses.mjs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  plugins: [
    react(),
    // Les licences de tout ce qui est embarqué, écrites à côté du bundle.
    // Un site déployé est une distribution : elle doit porter ses mentions.
    licenses(),
    {
      name: 'sept-mers-preload-fonts',
      transformIndexHtml: {
        // `post` pour que le bundle soit connu : c'est lui qui porte les noms
        // hachés des fontes.
        order: 'post',
        handler(html, context) {
          /*
           * Les deux voix de l'app sont en place dès le premier écran : le
           * grotesque porte le texte, le mono les chiffres. Sans préchargement,
           * le premier rendu se fait dans la pile système et saute quand les
           * fontes arrivent — un ressaut d'autant plus visible que les
           * doublures système n'ont ni la même chasse ni la même hauteur d'x.
           *
           * On ne précharge que la tranche `latin` : `latin-ext` ne descend que
           * si un caractère l'exige, et ce serait 43 ko pour rien.
           */
          const faces = Object.keys(context.bundle ?? {}).filter(
            (name) => name.endsWith('.woff2') && !name.includes('latin-ext'),
          )
          if (faces.length === 0) return html

          const links = faces
            .sort()
            .map(
              (name) =>
                `    <link rel="preload" href="/${name}" as="font" type="font/woff2" crossorigin />`,
            )
            .join('\n')
          return html.replace('</head>', `${links}\n  </head>`)
        },
      },
    },
    VitePWA({
      /*
       * `prompt`, et non `autoUpdate`. Les données vivent dans le navigateur et
       * nulle part ailleurs : un rechargement décidé par le service worker au
       * milieu d'une saisie de manche emporterait ce qui n'est pas encore
       * écrit. Le nouveau worker s'installe, précache, puis attend ; c'est
       * `UpdatePrompt` qui lui donne la main, quand quelqu'un le demande.
       *
       * Corollaire : aucun `skipWaiting` ni `clientsClaim` dans `workbox`
       * ci-dessous. Les deux annuleraient l'attente, et avec elle le choix.
       */
      registerType: 'prompt',
      // L'enregistrement passe par `useRegisterSW`, dans le composant qui
      // affiche le bandeau : le script que le plugin injecte d'office ferait
      // le travail une seconde fois, sans rien à quoi s'accrocher.
      injectRegister: null,
      // Le manifeste est écrit à la main dans `public/`. Ses chemins sont
      // relatifs, ce qui reste juste : ils se résolvent contre l'adresse du
      // manifeste, à la racine, et non contre celle de la page. On laisse le
      // plugin le précacher, pas le réécrire.
      manifest: false,
      workbox: {
        // Tout le shell, fontes et icônes comprises : l'app ne fait aucun appel
        // réseau après le chargement, ce précache est la totalité du hors ligne.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        /*
         * Une seule page, et toute navigation y retombe — y compris en mode
         * avion, et y compris sur une route profonde comme `/summary/<id>`.
         * C'est le pendant hors ligne de la réécriture de `vercel.json` : sans
         * lui, recharger l'app ailleurs qu'à la racine, sans réseau, donnerait
         * une page blanche.
         */
        navigateFallback: 'index.html',
        /*
         * Sauf ceux-là. `navigateFallback` sert la coquille à *toute*
         * navigation, et ouvrir `/licenses.txt` en est une : le lien de
         * l'écran « À propos » aurait rendu l'app à la place du fichier, une
         * fois le service worker en place. Les licences sont des fichiers, pas
         * des routes.
         */
        navigateFallbackDenylist: [/^\/licenses/],
        // Le précache de la version précédente part à l'activation, sinon le
        // stockage grossit d'un build à l'autre sans jamais redescendre.
        cleanupOutdatedCaches: true,
        /*
         * Sans ça, la toute première visite reste non contrôlée : le worker
         * s'installe, précache, et n'attrape la page qu'au chargement suivant.
         * Quelqu'un qui ouvre l'app puis descend au sous-sol trouverait une
         * page blanche.
         *
         * Ce n'est pas la porte dérobée que `skipWaiting` serait : la
         * revendication n'a lieu qu'à l'activation, et une mise à jour
         * n'active rien tant que le bandeau n'a pas eu sa réponse. Elle ne
         * joue donc qu'à la première installation, quand il n'y a pas
         * d'ancienne version à emporter.
         */
        clientsClaim: true,
        // Un seul fichier à servir sans cache, au lieu du worker plus son
        // runtime. Le poids ne se paie qu'aux builds où `sw.js` change vraiment.
        inlineWorkboxRuntime: true,
      },
    }),
  ],
  /*
   * Chemins absolus, et non relatifs.
   *
   * Une URL relative se résout contre l'adresse du document, pas contre la
   * racine du site. Le routeur vivant sur le chemin, `/summary/<id>` ferait
   * chercher `./assets/index-abc.js` à `/summary/assets/index-abc.js` — un 404
   * sur toute route à deux segments. C'est le prix du `#` en moins : l'app se
   * sert depuis la racine d'un domaine, plus depuis un sous-dossier.
   */
  /*
   * La version, injectée depuis `package.json`.
   *
   * L'écran « À propos » la portait en dur, dans une constante de composant :
   * deux sources pour un même chiffre, dont une qu'on oublie de bouger à
   * chaque publication.
   */
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
  },
  base: '/',
  build: {
    target: 'es2022',
    // Un seul chunk pour la coquille : l'app est petite et doit démarrer d'un
    // trait hors ligne. Le partage de table s'y ajoute en chunks paresseux —
    // les `import()` de `src/share/transport.ts` les découpent d'eux-mêmes, et
    // le service worker les précache avec le reste.
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
