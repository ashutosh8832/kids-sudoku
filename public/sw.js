const CACHE_NAME = "kids-sudoku-cache-v3";

const APP_SHELL = ["/"];

const FALLBACK_PAGE =
  "<!doctype html><html lang='en'><head><meta charset='utf-8'><title>Kids Sudoku</title>" +
  "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
  "</head><body style='margin:0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;color:#0f172a'>" +
  "<p style='font-size:1.4rem;text-align:center'>You are offline.<br>Turn your connection back on to play.</p>" +
  "</body></html>";

function openCache() {
  return caches.open(CACHE_NAME);
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      openCache()
        .then((cache) => cache.addAll(APP_SHELL))
        .catch(() => {}),
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
        .catch(() => {}),
    ])
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim().catch(() => {}));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(respond(event.request));
});

async function respond(request) {
  try {
    if (request.mode === "navigate") {
      return await networkFirst(request);
    }
    return await cacheFirst(request);
  } catch (error) {
    const cached = await cacheMatch("/").catch(() => null);
    if (cached) return cached;
    return new Response(FALLBACK_PAGE, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

async function cacheMatch(url) {
  const cache = await openCache();
  return cache.match(url);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await openCache();
      await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const cached = await cacheMatch(request).catch(() => null);
    if (cached) return cached;
    return new Response(FALLBACK_PAGE, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cached = await cacheMatch(request).catch(() => null);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await openCache();
    await cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}