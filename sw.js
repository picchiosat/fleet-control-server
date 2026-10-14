const CACHE_NAME = 'fleet-c2-v3'; // incrementare a ogni modifica degli asset precaricati
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-512.png'
];

// --- 1. INSTALL: precache "best effort" -------------------------------------
// Se un file manca (es. icona non ancora caricata) l'installazione NON fallisce:
// un SW che non si installa significa niente notifiche push.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(PRECACHE_URLS.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

// --- 2. ACTIVATE: elimina le cache delle versioni precedenti -----------------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// --- 3. FETCH: network-first, cache come ripiego offline ---------------------
// Gestiamo solo le GET della nostra origine. API e WebSocket (socket.io) passano
// sempre direttamente dalla rete: i dati della flotta non vanno mai serviti "vecchi".
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/socket.io/') ||
      url.pathname === '/sw.js') return;

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        return new Response('Offline', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});

// --- 4. NOTIFICHE PUSH -------------------------------------------------------
self.addEventListener('push', event => {
  let data = { title: 'Fleet Alert', body: 'Nuovo messaggio dal sistema.' };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-512.png',
    badge: '/icon-512.png',
    vibrate: [200, 100, 200],
    // Stesso tag = la nuova notifica dello stesso nodo sostituisce la precedente
    // (invece di accumulare 10 notifiche) e rifà vibrare/suonare.
    tag: data.tag || 'fleet-alert',
    renotify: true,
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/'
    },
    actions: [
      { action: 'explore', title: 'Apri Dashboard' },
      { action: 'close', title: 'Chiudi' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// --- 5. CLICK SULLA NOTIFICA -------------------------------------------------
// Click sul corpo O su "Apri Dashboard": porta in primo piano la finestra già aperta,
// altrimenti ne apre una nuova. "Chiudi" chiude soltanto.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;

  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
