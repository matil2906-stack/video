// Service worker minimal : juste ce qu'il faut pour que le navigateur
// considère l'app comme "installable". Pas de cache offline pour l'instant
// (les vidéos ont besoin du serveur de toute façon).
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Passthrough simple, pas de mise en cache
  e.respondWith(fetch(e.request));
});
