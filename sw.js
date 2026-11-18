const scope = new URL(self.registration.scope);
const cachePrefix = 'ruiang-mobile:'+scope.href+':';
const cacheName = cachePrefix+'v4';
const outfitNames = ['sport','running','badminton','basketball','football','yoga','tang','hanfu','casual','festive'];
const propNames = ['coin','fruit','bottle','bell','headband','wristband','ribbon','gift'];
const images = [
  'app-icon.png','app-icon-192.png','app-icon-512.png','app-icon-maskable.png','wordmark.png','plan-cover.jpg',
  'ruiang-bike.png','ruiang-box.png','ruiang-celebrate.png','ruiang-face.png','ruiang-rest.png','ruiang-shop.png',
  ...outfitNames.flatMap(name => [0,1,2].map(view => name+'-'+view+'.png')),
  ...propNames.map(name => 'prop-'+name+'.jpg'),
  ...['m','f'].flatMap(coach => Array.from({length:8},(_,index) => 'coach-'+coach+(index+1)+'.jpg')),
];
const appFiles = [
  'index.html','app.css','content.js','views.js','app.js','character3d.js','motion3d.js','app.webmanifest',
  'assets/character-references.js',
  'assets/vendor/three-runtime.js','assets/growth-stages.jpg',
  ...['ruiang-stage-1','ruiang-stage-5','ruiang-stage-8','ruiang-stage-12','ruiang-stage-16','coach-male','coach-female','ruiang-bike']
    .map(name => 'assets/models/'+name+'.glb'),
  ...['male-march','male-squat','male-shot','male-cycle','female-pushup','female-dog','female-neck','female-shoulder','ruiang-wave','ruiang-cycle']
    .map(name => 'assets/motion/'+name+'.mp4'),
  ...images.map(name => 'assets/'+name),
];
const appUrls = new Set(appFiles.map(file => new URL(file,scope).href));
const indexUrl = new URL('index.html',scope);

self.addEventListener('install',event => {
  // Install a complete version before serving any of its files.
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([...appUrls].map(url => new Request(url,{cache:'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;
  const appEntry = request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === indexUrl.pathname);
  if (!appEntry && !appUrls.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const response = await cache.match(appEntry ? indexUrl.href : request);
    const range = request.headers.get('Range');
    if (!response || !range) return response || fetch(request);
    return rangeResponse(response,range);
  })());
});

async function rangeResponse(response,range) {
  const content = await response.blob();
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || !match[1] && !match[2]) return response;
  const start = match[1] ? Number(match[1]) : Math.max(0,content.size-Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]),content.size-1) : content.size-1;
  if (start > end || start >= content.size) {
    return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+content.size}});
  }
  return new Response(content.slice(start,end+1),{
    status:206,
    headers:{
      'Content-Type':response.headers.get('Content-Type') || 'video/mp4',
      'Accept-Ranges':'bytes',
      'Content-Range':`bytes ${start}-${end}/${content.size}`,
      'Content-Length':String(end-start+1),
    },
  });
}
