const C='gathr-v27';
const A=['./','./index.html','./common.js','./qr.js','./sync.js','./verse.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./icons/maskable-192.png','./icons/maskable-512.png','./fonts/inter-400.woff2','./fonts/inter-500.woff2','./fonts/inter-600.woff2','./fonts/inter-700.woff2','./fonts/fraunces-600.woff2','./fonts/fraunces-700.woff2'];
function fresh(url){return fetch(url,{cache:'reload',credentials:'same-origin'}).then(r=>{if(!r.ok)throw new Error(url+' '+r.status);return r})}
self.addEventListener('install',e=>{
 e.waitUntil(caches.open(C).then(c=>Promise.all(A.map(u=>fresh(u).then(r=>c.put(u,r))))));
 self.skipWaiting();
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()).then(()=>self.clients.matchAll({type:'window',includeUncontrolled:true})).then(cs=>Promise.all(cs.map(c=>c.navigate(c.url).catch(()=>{})))));
});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!='GET'||u.origin!=location.origin)return;
 e.respondWith(fresh(e.request.url).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp)).catch(()=>{});return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(hit=>{if(hit)return hit;throw new Error('offline')})));
});
