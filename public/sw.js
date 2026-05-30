self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("pulso-v1").then((cache) => cache.addAll(["/icon.svg"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = event.request.mode === "navigate";
  const isPublicAsset = isSameOrigin && (
    url.pathname === "/icon.svg" ||
    url.pathname.startsWith("/logo/") ||
    url.pathname.startsWith("/_next/static/")
  );

  if (!isPublicAsset || isNavigation) return;

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
