/**
 * Le module `virtual:pwa-register/react` n'existe qu'au build : c'est
 * `vite-plugin-pwa` qui le fabrique. Sans cette référence, `tsc` ne le trouve
 * pas — `types` ne liste que `vite/client`, et rien ne va chercher les
 * déclarations du plugin.
 */
/// <reference types="vite-plugin-pwa/react" />
