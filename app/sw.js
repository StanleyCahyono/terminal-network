// Offline cache: the app shell and the live data module are kept so the app opens without a connection.
// Code is fetched from the network first (fresh when online) and falls back to the cache; fonts and icons are cache-first.
const CACHE = 'tn-app-v1';
const SHELL = ['./', 'index.html', 'app.css', 'main.js', 'kit.js', 'shell.js', 'screens.js', 'hub.js', 'manifest.webmanifest', 'vendor/react.production.min.js', 'vendor/react-dom.production.min.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png', '../data.js', '../superhub.js', '../superhub-ui.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url), fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname), staticAsset = fonts || /\/icons\/|\/vendor\//.test(url.pathname);
  if (url.origin !== location.origin && !fonts) return;
  if (staticAsset) { e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; }))); return; }
  e.respondWith(fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
