// Ficha AD: modo offline. Guarda o app no celular para abrir sem internet.
// Os dados dos pacientes NÃO passam por aqui: ficam só no armazenamento do navegador.
var VER = 'ficha-ad-817db4f2f8';
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

// procura versão nova do index.html em segundo plano (basta trocar só o index.html no site)
function atualizar() {
  return caches.open(VER).then(function (c) {
    return fetch('index.html', { cache: 'no-cache' }).then(function (res) {
      if (!res || !res.ok) return;
      return Promise.all([res.clone().text(), c.match('index.html').then(function (h) { return h ? h.text() : ''; })]).then(function (t) {
        if (!t[1] || t[0] === t[1]) return;
        return c.put('index.html', res).then(function () {
          return self.clients.matchAll().then(function (cs) { cs.forEach(function (cl) { cl.postMessage('nova-versao'); }); });
        });
      });
    });
  }).catch(function () {});
}
self.addEventListener('message', function (e) { if (e.data === 'checar') e.waitUntil(atualizar()); });

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
      e.waitUntil(atualizar());
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
