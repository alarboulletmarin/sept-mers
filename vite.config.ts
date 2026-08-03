import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
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
                `    <link rel="preload" href="./${name}" as="font" type="font/woff2" crossorigin />`,
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
      // Le manifeste est écrit à la main dans `public/`, en chemins relatifs
      // comme le reste du build. On laisse le plugin le précacher, pas le
      // réécrire.
      manifest: false,
      workbox: {
        // Tout le shell, fontes et icônes comprises : l'app ne fait aucun appel
        // réseau après le chargement, ce précache est la totalité du hors ligne.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        // L'app vit sur le hash : une seule page, et toute navigation y retombe,
        // y compris en mode avion.
        navigateFallback: 'index.html',
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
  // Chemins relatifs : l'app tourne aussi bien à la racine d'un domaine que
  // dans un sous-dossier.
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
