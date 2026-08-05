/**
 * Le module `virtual:pwa-register/react` n'existe qu'au build : c'est
 * `vite-plugin-pwa` qui le fabrique. Sans cette référence, `tsc` ne le trouve
 * pas — `types` ne liste que `vite/client`, et rien ne va chercher les
 * déclarations du plugin.
 */
/// <reference types="vite-plugin-pwa/react" />

/**
 * La version publiée, injectée au build depuis `package.json` par la clé
 * `define` de `vite.config.ts`. Une seule source pour un chiffre qu'on ne
 * pense jamais à bouger deux fois.
 */
declare const APP_VERSION: string
