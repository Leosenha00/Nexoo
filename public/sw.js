// Cache only the public offline page; authenticated API responses are never cached.
self.addEventListener('install',event=>{event.waitUntil(caches.open('nexo-offline-v1').then(c=>c.add('/offline.html')));self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')))});
