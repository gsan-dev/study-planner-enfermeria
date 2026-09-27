/* Service worker de Study Planner.
 *
 * Estrategias:
 *  - Navegación (HTML): network-first → si no hay red, index.html cacheado.
 *  - /assets/* (JS/CSS con hash de Vite): cache-first (son inmutables).
 *  - Resto de estáticos del mismo origen (iconos, manifest): stale-while-revalidate.
 *  - /api/*: no se cachea aquí (la estrategia offline de datos llega en la fase 9).
 *
 * __BUILD_ID__ lo sustituye Vite en cada build, así que cada despliegue
 * instala un SW nuevo y borra las cachés antiguas.
 */
const BUILD_ID = '__BUILD_ID__'
const SHELL_CACHE = `shell-${BUILD_ID}`
const ASSETS_CACHE = `assets-${BUILD_ID}`
const STATIC_CACHE = `static-${BUILD_ID}`
const CURRENT_CACHES = [SHELL_CACHE, ASSETS_CACHE, STATIC_CACHE]

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !CURRENT_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// La app pide activar la nueva versión cuando el usuario pulsa "Actualizar".
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE))
    return
  }

  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
})

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put('/index.html', response.clone())
    }
    return response
  } catch {
    const cached = await caches.match('/index.html')
    return cached || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(cacheName)
    cache.put(request, response.clone())
  }
  return response
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || network
}
