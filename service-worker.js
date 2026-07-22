/* ===========================================================
   service-worker.js — basic offline cache (app shell strategy)
   =========================================================== */

const CACHE_NAME = "mkm-cache-v3";
const APP_SHELL = [
  "index.html",
  "login.html",
  "dashboard.html",
  "wallet.html",
  "saving.html",
  "wishlist.html",
  "needs.html",
  "report.html",
  "profile.html",
  "school.html",
  "health.html",
  "css/style.css",
  "css/responsive.css",
  "js/config.js",
  "js/app.js",
  "js/api.js",
  "js/auth.js",
  "js/dashboard.js",
  "js/wallet.js",
  "js/saving.js",
  "js/wishlist.js",
  "js/needs.js",
  "js/report.js",
  "js/profile.js",
  "js/school.js",
  "js/health.js",
  "manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for same-origin app files: always try to fetch the latest
// version from the server, and only fall back to the cached copy if the
// network is unavailable (offline). This avoids the app getting stuck on
// an old cached version after every update — cache-first was cheaper but
// meant bug fixes silently never reached returning visitors.
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return; // let cross-origin (GAS API, CDNs) pass through untouched

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match("dashboard.html")))
  );
});
