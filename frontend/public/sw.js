// sw.js — app ko bina internet ke khulne layak banata hai
//
// • Page (index.html): pehle network, internet na ho to cached copy
// • /assets/* (JS/CSS, naam mein hash hota hai): cache se, na ho to network
// • /api/* : kabhi cache nahi — hamesha server se (books/notes ka data
//   IndexedDB mein encrypted rakha jaata hai, yahan nahi)
const SHELL_CACHE = "antim-shell-v2";
const ASSET_CACHE = "antim-assets-v2";
const MAX_ASSETS = 120;
const SHELL_URLS = ["/", "/manifest.json", "/logo.svg"];

// index.html jin JS/CSS files ko load karta hai unhe bhi pehle se cache karo —
// warna pehli visit ki files (SW aane se pehle load huin) offline nahi milti
const precacheShellAssets = async () => {
  const shell = await caches.open(SHELL_CACHE);
  await shell.addAll(SHELL_URLS);
  const html = await (await shell.match("/"))?.text();
  const assetUrls = [...new Set((html || "").match(/\/assets\/[^"'\s)]+/g) || [])];
  const assets = await caches.open(ASSET_CACHE);
  await Promise.all(assetUrls.map((u) => assets.add(u).catch(() => {})));
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheShellAssets()
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const trimAssets = async () => {
  const cache = await caches.open(ASSET_CACHE);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_ASSETS; i += 1) await cache.delete(keys[i]);
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // HashRouter — har page asal mein "/" hi hai
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(() => caches.match("/", { cacheName: SHELL_CACHE }).then((r) => r || Response.error()))
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request, { cacheName: ASSET_CACHE }).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches
                .open(ASSET_CACHE)
                .then((cache) => cache.put(request, copy))
                .then(trimAssets)
                .catch(() => {});
            }
            return response;
          })
      )
    );
    return;
  }

  // Baaki static files (logo, manifest, icons): network, fail ho to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((r) => r || Response.error()))
  );
});
