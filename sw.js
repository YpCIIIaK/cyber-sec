/* CyberPath Service Worker — офлайн-режим (network-first для своих файлов) */
const CACHE = "cyberpath-v5";
const CORE = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/icons.js",
  "./js/data.js",
  "./js/i18n.js",
  "./js/labs.js",
  "./js/terminal.js",
  "./js/app.js",
  "./manifest.json",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Навигация — сеть с откатом на кэшированный index (SPA)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => { const c = res.clone(); caches.open(CACHE).then((x) => x.put("./index.html", c)); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Свои файлы (js/css/etc) — network-first: свежий код онлайн, кэш офлайн
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Сторонние (шрифты, cdn) — cache-first
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && (url.hostname.includes("gstatic") || url.hostname.includes("googleapis"))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
