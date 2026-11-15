const CACHE_NAME = 'niramaya-v12'
const OFFLINE_URL = '/'

// Assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/logo-192.png',
  '/logo-512.png',
  '/favicon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const shellResponse = await fetch(OFFLINE_URL)
      if (!shellResponse.ok) throw new Error(`Unable to precache app shell: ${shellResponse.status}`)
      await cache.put(OFFLINE_URL, shellResponse.clone())
      const shell = await shellResponse.text()
      const discovered = [...shell.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map((match) => match[1])
        .filter((url) => url.startsWith('/') && !url.startsWith('//'))
      const assets = [...new Set([...PRECACHE_URLS, ...discovered])]
      await cache.addAll(assets)
    })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // Skip non-GET and cross-origin
  if (event.request.method !== 'GET') return
  const requestUrl = new URL(event.request.url)
  if (requestUrl.origin !== self.location.origin) return
  const knownNavigationPaths = ['/', '/missed-dose', '/caregiver', '/emergency', '/safety', '/how-to-use', '/settings']
  if (event.request.mode === 'navigate' && knownNavigationPaths.includes(requestUrl.pathname)) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    )
    return
  }

  const isStaticAsset = PRECACHE_URLS.includes(requestUrl.pathname)
    || requestUrl.pathname.startsWith('/assets/')
    || requestUrl.pathname.startsWith('/icons/')
  if (!isStaticAsset) return

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        return response
      }).catch(() => caches.match(OFFLINE_URL))
    })
  )
})
