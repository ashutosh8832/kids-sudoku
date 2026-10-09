const CACHE_NAME = "kids-sudoku-cache-v2";

const APP_SHELL = ["/"];

const FALLBACK_PAGE =
  "<!doctype html><html lang='en'><head><meta charset='utf-8'><title>Kids Sudoku</title>" +
  "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
  "</head><body style='margin:0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;color:#0f172a'>" +
  "<p style='font-size:1.4rem;text-align:center'>You are offline.<br>Turn your connection back on to play.</p>" +
  "</body></html>";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(handle(event.request));
});

async function handle(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const fallback = await cache.match("/");
    if (fallback) return fallback;
    return new Response(FALLBACK_PAGE, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}