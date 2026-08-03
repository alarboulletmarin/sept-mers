/*
 * Service worker écrit à la main.
 *
 * L'app ne fait aucun appel réseau après le chargement : il n'y a donc qu'une
 * chose à gérer, le shell. On le précache, on sert en cache-first, et on
 * invalide par version de build.
 */

importScripts('./sw-version.js')

const VERSION = self.__SEPT_MERS_VERSION || 'dev'
const CACHE = `sept-mers-${VERSION}`

const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      // Une icône manquante ne doit pas empêcher l'installation.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // La navigation retombe toujours sur le shell : l'app vit sur le hash,
  // une seule page suffit, et le mode avion ne doit rien bloquer.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches
        .match('./index.html')
        .then((cached) => cached || fetch(request))
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          // On garde ce qui vient du build : les assets portent un hash,
          // le cache ne peut pas servir une version périmée.
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)
    }),
  )
})
