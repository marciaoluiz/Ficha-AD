// Ficha AD: modo offline. Guarda o app no celular para abrir sem internet.
// Os dados dos pacientes NÃO passam por aqui: ficam só no armazenamento do navegador.
var VER = 'ficha-ad-285f3bbd1c';
var FONTES = 'ficha-ad-fontes';
var BASE = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VER).then(function (c) {
    return c.addAll(BASE.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('ficha-ad-') === 0 && k !== VER && k !== FONTES; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);

  if (u.origin === self.location.origin) {
    // abrir o app: sempre a cópia guardada (rápido e sem internet); a versão nova chega pelo sw.js
    if (r.mode === 'navigate') {
      e.respondWith(caches.open(VER).then(function (c) {
        return c.match('index.html').then(function (hit) { return hit || fetch(r); });
      }).catch(function () { return fetch(r); }));
      return;
    }
    e.respondWith(caches.match(r, { ignoreSearch: true }).then(function (hit) { return hit || fetch(r); }));
    return;
  }

  // fonte do Google (só usada fora do iPhone): guarda na primeira vez
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTES).then(function (c) {
      return c.match(r).then(function (hit) {
        if (hit) return hit;
        return fetch(r).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; });
      });
    }));
  }
});
