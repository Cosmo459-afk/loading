/* Only the offline notice and its icon are cached. Never cache HTML, Auth or game responses. */
const CACHE='loading-arcade-offline-__VERSION__';
const OFFLINE=new URL('offline.html',self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([OFFLINE,new URL('assets/pwa/icon-192.png',self.registration.scope).href]))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('loading-arcade-offline-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate')event.respondWith(fetch(request,{cache:'no-store'}).catch(()=>caches.match(OFFLINE)));
 else if(url.href===new URL('assets/pwa/icon-192.png',self.registration.scope).href)event.respondWith(fetch(request).catch(()=>caches.match(request)));
});
