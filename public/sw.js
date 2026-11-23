// Service worker mínimo: instalável + fallback offline para a home.
const CACHE = "dispensa-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  // network-first; em falha, tenta o cache e por fim a home
  event.respondWith(
    fetch(request)
      .then((response) => {
        // só guarda a home de verdade (não a tela de login após redirect)
        if (request.mode === "navigate" && response.ok && !response.redirected) {
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
