// ============================================
// Service Worker — cache básico offline
// ============================================
// Estrategia:
//   - HTML/CSS/JS/fonts/manifest → cache-first (la app no cambia seguido)
//   - Recursos de Supabase (API REST + realtime) → NUNCA se cachean
//     (deben ir siempre a la red, son datos del usuario)
//
// Esto le da a Chrome Android el criterio de "instalable" y mejora
// el arranque cuando ya visitaste la app.

const CACHE_NAME = 'menuapp-v23';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/translations.js',
  './js/store.js',
  './js/db.js',
  './js/ai.js',
  './js/recipes.js',
  './js/nutrition.js',
  './js/components.js',
  './js/menu.js',
  './js/templates.js',
  './js/nutrition-panel.js',
  './js/app.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon.svg',
  './assets/apple-touch-icon.png',
];

// Instalación: pre-cachear todos los assets locales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activación: limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Mensaje desde la pagina: "SKIP_WAITING" para activar el SW nuevo inmediatamente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: cache-first para assets locales, network-only para API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NUNCA interceptar sw.js (si lo cacheamos, nunca se actualiza),
  // ni Supabase, ni CDN del SDK, ni realtime websockets
  if (
    url.pathname.endsWith('/sw.js') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('jsdelivr.net') ||
    url.protocol === 'ws:' || url.protocol === 'wss:'
  ) {
    return; // deja pasar al network normalmente
  }

  // Solo cachear GET same-origin
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          // Cachear respuestas válidas para la próxima
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            cache.put(event.request, clone);
          }
          return response;
        }).catch(() => {
          // Offline y no estaba en cache → fallback al index (SPA)
          if (event.request.mode === 'navigate') {
            return caches.open(CACHE_NAME).then(c => c.match('./index.html'));
          }
        });
      })
    )
  );
});
