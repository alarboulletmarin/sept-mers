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
      transformIndexHtml(html) {
        return html.replace(/__BUILD_VERSION__/g, BUILD_VERSION)
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'sw-version.js',
          source: `self.__SEPT_MERS_VERSION = ${JSON.stringify(BUILD_VERSION)}\n`,
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
