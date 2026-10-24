/* Service worker do app Zonas de Regulação.
   Guarda o app no aparelho para abrir sem internet. Para publicar uma
   versão nova do index.html, aumente o número em VERSION. */
var VERSION = 'v1';
var CACHE = 'zonas-' + VERSION;
var CORE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'icon-180.png'];
var EXTERNAL = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      var ext = Promise.all(EXTERNAL.map(function (u) {
        return c.add(new Request(u, { mode: 'no-cors' })).catch(function () {});
      }));
      return Promise.all([c.addAll(CORE), ext]);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('zonas-') === 0 && k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function putCopy(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
  }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.url.indexOf('http') !== 0) return;

  /* abrir a página: rede primeiro (pega versão nova), cache se estiver sem internet ou lento */
  if (req.mode === 'navigate') {
    e.respondWith(
      Promise.race([
        fetch(req).then(function (r) { return putCopy(req, r); }),
        new Promise(function (_, rej) { setTimeout(rej, 4000); })
      ]).catch(function () {
        return caches.match(req).then(function (m) { return m || caches.match('index.html') || caches.match('./'); });
      })
    );
    return;
  }

  /* demais arquivos (ícones, fontes, gerador de PDF): cache primeiro e atualiza em segundo plano */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (r) { return putCopy(req, r); }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
