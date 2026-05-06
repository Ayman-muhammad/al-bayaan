const CACHE_NAME = "al-bayan-v3";
const ADHAN_CACHE = "al-bayan-adhan-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== ADHAN_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache OAuth or auth routes
  if (
    url.pathname.startsWith("/~oauth") ||
    url.pathname.startsWith("/auth") ||
    url.hostname.includes("supabase.co")
  ) {
    return;
  }

  // API calls: network first with timeout
  if (
    url.hostname.includes("api.alquran.cloud") ||
    url.hostname.includes("cdn.islamic.network") ||
    url.hostname.includes("api.aladhan.com") ||
    url.hostname.includes("cdn.jsdelivr.net") ||
    url.hostname.includes("api.quran.com")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Adhan audio + reciter mp3s: cache-first for offline playback
  if (
    url.pathname.match(/\.(mp3|ogg|wav|m4a)$/i) ||
    url.hostname.includes("server8.mp3quran.net") ||
    url.hostname.includes("everyayah.com")
  ) {
    event.respondWith(
      caches.open(ADHAN_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok && res.status === 200) cache.put(request, res.clone());
          return res;
        } catch {
          return cached || new Response("", { status: 504 });
        }
      })
    );
    return;
  }

  // Static assets: cache first
  if (request.method === "GET" && url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
});
