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

const CACHE_NAME = 'menuapp-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/translations.js',
  './js/store.js',
  './js/db.js',
  './js/recipes.js',
  './js/nutrition.js',
  './js/components.js',
  './js/menu.js',
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

// Fetch: cache-first para assets locales, network-only para API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NUNCA interceptar Supabase, CDN del SDK, ni realtime websockets
  if (
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
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cachear respuestas válidas para la próxima
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline y no estaba en cache → fallback al index (SPA)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
