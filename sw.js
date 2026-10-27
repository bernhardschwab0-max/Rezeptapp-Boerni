// Offline-Speicher der Rezept-App.
// Achtung: Lager-, Bestell- und Rezept-App liegen auf derselben Adresse und teilen sich die Cache-Liste –
// darum werden hier NUR eigene Caches ("rezeptapp-…") gelöscht.
const CACHE_NAME = 'rezeptapp-v2';
const APP_SHELL = ['./', './index.html', './zugang.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(APP_SHELL.map((url) =>
        fetch(new Request(url, { cache: 'reload' })).then((res) => res.ok && cache.put(url, res)).catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('rezeptapp-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Nur eigene Dateien – der Online-Speicher (jsonbin) kommt nie aus dem Cache
  if (new URL(req.url).origin !== self.location.origin) return;

  const merken = (key, res) => {
    if (res && res.ok) {
      const kopie = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(key, kopie));
    }
    return res;
  };

  // Seite und Programmteile (zugang.js): zuerst aus dem Netz (immer zusammenpassend), offline aus dem Speicher
  if (req.mode === 'navigate' || req.destination === 'script') {
    const key = req.mode === 'navigate' ? './index.html' : req;
    event.respondWith(
      fetch(req)
        .then((res) => merken(key, res))
        .catch(() => caches.match(key).then((c) => c || caches.match('./')))
    );
    return;
  }

  // Bilder/Manifest: aus dem Speicher, im Hintergrund aktualisieren
  event.respondWith(
    caches.match(req).then((cached) => {
      const netz = fetch(req).then((res) => merken(req, res));
      if (cached) { netz.catch(() => {}); return cached; }
      return netz;
    })
  );
});
