// Service worker mínimo: instalável + fallback offline para a home.
const CACHE = "dispensa-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  // network-first; em falha, tenta o cache e por fim a home
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (request.mode === "navigate") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || (await caches.match("/")) || Response.error();
      }),
  );
});
