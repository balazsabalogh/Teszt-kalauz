const CACHE='tc-alpha-0-2-v1';
const FILES=['./','./index.html','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png',
'./assets/images/nyhavn.jpg','./assets/images/amalienborg.jpg','./assets/images/rundetaarn.jpg',
'./assets/images/rosenborg.jpg','./assets/images/torvehallerne.jpg','./assets/images/little_mermaid.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match('./index.html')))));
