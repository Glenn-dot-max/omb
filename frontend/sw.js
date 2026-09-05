// Service worker minimal - condition technique requise par Chrome/Edge
// pour proposer le bouton "installer l'application".
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Laisse passer toutes les requêtes réseau normalement (pas de cache offline).
self.addEventListener("fetch", () => {});
