// Service worker — cache de la coquille de l'app + des images, pour le hors ligne.
// La donnée métier (fiches, modifications) est gérée côté app via IndexedDB.

const CACHE = "magasin-cache-v1";
const APP_SHELL = ["/"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // On ne gère que les GET. Les POST/PATCH (modifs) passent au réseau ;
  // s'il n'y a pas de réseau, c'est l'app (outbox) qui prend le relais.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Ne pas mettre en cache les appels API de synchro (toujours frais si réseau).
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    return;
  }

  // Navigations (ouverture de pages) : réseau d'abord, sinon page en cache.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(request);
          const c = await caches.open(CACHE);
          c.put("/", net.clone());
          return net;
        } catch {
          const c = await caches.open(CACHE);
          return (await c.match("/")) || Response.error();
        }
      })()
    );
    return;
  }

  // Images (y compris pièces jointes Airtable) + assets statiques :
  // stale-while-revalidate (affiche le cache, met à jour en arrière-plan).
  const isStatic =
    url.origin === self.location.origin &&
    url.pathname.startsWith("/_next/");
  const isImage = request.destination === "image";

  if (isStatic || isImage) {
    event.respondWith(
      (async () => {
        const c = await caches.open(CACHE);
        const cached = await c.match(request);
        const netP = fetch(request)
          .then((r) => {
            if (r && (r.status === 200 || r.type === "opaque")) {
              c.put(request, r.clone());
            }
            return r;
          })
          .catch(() => null);
        return cached || (await netP) || Response.error();
      })()
    );
  }
});
