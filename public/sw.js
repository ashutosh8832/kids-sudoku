const CACHE_NAME = "kids-sudoku-cache-v4";

const FALLBACK_PAGE =
  "<!doctype html><html lang='en'><head><meta charset='utf-8'><title>Kids Sudoku</title>" +
  "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
  "</head><body style='margin:0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;color:#0f172a'>" +
  "<p style='font-size:1.4rem;text-align:center'>You are offline.<br>Turn your connection back on to play.</p>" +
  "</body></html>";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(deleteOldCaches());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([deleteOldCaches(), self.clients.claim()]).catch(() => {})
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== new URL(self.registration.scope).origin) return;
  if (url.pathname === "/sw.js") return;

  event.respondWith(handle(event.request));
});

async function handle(request) {
  try {
    if (request.mode === "navigate") {
      return await networkFirst(request);
    }
    return await cacheFirst(request);
  } catch (error) {
    const shell = await cacheMatch("/").catch(() => null);
    if (shell) return shell;
    return new Response(FALLBACK_PAGE, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cachePut(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cacheMatch(request).catch(() => null);
    if (cached) return cached;
    const shell = await cacheMatch("/").catch(() => null);
    if (shell) return shell;
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
    await cachePut(request, response.clone());
  }
  return response;
}

async function openCache() {
  if (typeof caches === "undefined") {
    throw new Error("Cache Storage unavailable");
  }
  return caches.open(CACHE_NAME);
}

async function cacheMatch(request) {
  const cache = await openCache();
  return cache.match(request);
}

async function cachePut(request, response) {
  const cache = await openCache();
  await cache.put(request, response);
}

async function deleteOldCaches() {
  if (typeof caches === "undefined" || typeof caches.keys !== "function") {
    return;
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    // Cache Storage is unavailable on some iOS Safari sessions.
  }
}