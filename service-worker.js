/* ===========================================================
   service-worker.js — basic offline cache (app shell strategy)
   =========================================================== */

const CACHE_NAME = "mkm-cache-v2";
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

// Cache-first for app shell, network-first fallback for everything else
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          const clone = response.clone();
          if (event.request.url.startsWith(self.location.origin)) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match("dashboard.html"));
    })
  );
});
