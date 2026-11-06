/* オフラインで開けるようにするサービスワーカー。ファイルを更新したら VERSION を変えます。 */
const VERSION = 'v2';
const CACHE = 'gamification-' + VERSION;
const CORE = ['./', './app.js','./core.js','./drag.js','./events.js','./game.css','./index.html','./logic.js','./manifest.webmanifest','./pdf.js','./plan.js','./pwa-shim.js','./quest.js','./refl.js','./styles.css','./sync.js','./timeline.js','./views.js', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // 自分のファイル: まず保存済み、なければ通信(あとで更新)
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; }).catch(() => caches.match('./index.html'))));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // フォント: 保存済みを先に出し、裏で更新
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => { const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit); return hit || net; })));
  }
});
