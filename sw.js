const CACHE_NAME = "chiang-mai-trip-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./trip-app.css?v=4",
  "./trip-app.js?v=4",
  "./sync-config.js?v=4",
  "./manifest.webmanifest",
  "./icon.svg",
  "./assets/avatars/xiao5.jpg",
  "./assets/avatars/xiaoxiong.jpg",
  "./assets/avatars/xiaolan.jpg",
  "./assets/avatars/xiaochen.jpg",
  "./assets/avatars/xiaozhu.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
