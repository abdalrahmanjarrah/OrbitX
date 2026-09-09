/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { RangeRequestsPlugin } from "workbox-range-requests";

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const BASE = self.registration.scope;

// Navigation is Network-first so freshly deployed hashed chunks are always
// resolved against the current index.html instead of a stale cached copy.
// Falls back to cached index.html when offline. Must be registered before
// precacheAndRoute so it wins over the precached index.html.
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "orbitx-navigation",
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    }),
    { denylist: [/\/assets\//, /\/sounds\//] },
  )
);

registerRoute(
  ({ url }) => url.hostname === "api.dicebear.com",
  new CacheFirst({
    cacheName: "dicebear-avatars",
    plugins: [
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  ({ url }) => url.hostname === "images.unsplash.com",
  new CacheFirst({
    cacheName: "unsplash-images",
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  ({ url }) =>
    url.hostname.includes("mp3quran.net") || url.hostname === "archive.org" || url.hostname === "assets.mixkit.co",
  new CacheFirst({
    cacheName: "orbitx-audio",
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new RangeRequestsPlugin(),
    ],
  })
);

registerRoute(
  ({ url }) =>
    url.hostname === "raw.githubusercontent.com" ||
    url.hostname === "www.transparenttextures.com",
  new CacheFirst({
    cacheName: "orbitx-assets",
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

self.addEventListener("push", (event) => {
  let payload: { title?: string; body?: string; url?: string } = {};
  try {
    if (event.data) payload = event.data.json();
  } catch {
    payload = { body: event.data?.text() ?? "" };
  }
  const title = payload.title || "OrbitX";
  const options: NotificationOptions = {
    body: payload.body || "",
    icon: `${BASE}pwa-192x192.png`,
    badge: `${BASE}favicon.png`,
    data: { url: payload.url || BASE },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || BASE;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
