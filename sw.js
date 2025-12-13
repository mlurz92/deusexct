const VER="dexct_v1_2025-12-13";
const CORE_CACHE=`${VER}::core`;
const MEDIA_CACHE=`${VER}::media`;
const MAX_MEDIA_BYTES=950*1024*1024;
const MSG_PROGRESS="CACHE_PROGRESS";
const MSG_DONE="CACHE_DONE";

const isReqCacheable=req=>{
  if(!req) return false;
  if(req.method!=="GET") return false;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return false;
  if(url.pathname.endsWith("/sw.js")) return false;
  if(url.search) return true;
  return true;
};

const isMediaPath=path=>{
  const p=path.toLowerCase();
  return p.endsWith(".mp3")||p.endsWith(".mp4")||p.endsWith(".lrc")||p.includes("/songs/")||p.includes("/music_videos/")||p.includes("/cover/");
};

const now=()=>Date.now();

const clientsAll=async()=>{
  try{return await self.clients.matchAll({type:"window",includeUncontrolled:true})}catch{return[]}
};

const broadcast=async data=>{
  const cs=await clientsAll();
  for(const c of cs){try{c.postMessage(data)}catch{}}
};

const cachePutSafe=async(cache,req,res)=>{
  try{
    await cache.put(req,res);
    return true;
  }catch{
    return false;
  }
};

const cleanOldCaches=async()=>{
  const keys=await caches.keys();
  const keep=new Set([CORE_CACHE,MEDIA_CACHE]);
  const dels=[];
  for(const k of keys) if(!keep.has(k) && k.startsWith("dexct_v")) dels.push(caches.delete(k));
  await Promise.allSettled(dels);
};

const calcCacheBytes=async cacheName=>{
  try{
    const cache=await caches.open(cacheName);
    const reqs=await cache.keys();
    let total=0;
    for(const r of reqs){
      const res=await cache.match(r);
      if(!res) continue;
      const len=res.headers.get("content-length");
      if(len && isFinite(+len)) total+=+len;
      else{
        try{
          const b=await res.clone().arrayBuffer();
          total+=b.byteLength;
        }catch{}
      }
    }
    return total;
  }catch{return 0}
};

const pruneMediaCache=async(limitBytes)=>{
  const cache=await caches.open(MEDIA_CACHE);
  const reqs=await cache.keys();
  const items=[];
  for(const r of reqs){
    const res=await cache.match(r);
    if(!res) continue;
    let size=0;
    const len=res.headers.get("content-length");
    if(len && isFinite(+len)) size=+len;
    else{
      try{size=(await res.clone().arrayBuffer()).byteLength}catch{size=0}
    }
    const ts=res.headers.get("x-sw-ts");
    const t=ts && isFinite(+ts)?+ts:0;
    items.push({r,size,t});
  }
  items.sort((a,b)=>(a.t||0)-(b.t||0));
  let total=items.reduce((s,x)=>s+(x.size||0),0);
  for(const it of items){
    if(total<=limitBytes) break;
    try{
      await cache.delete(it.r);
      total-=it.size||0;
    }catch{}
  }
};

const stampResponse=res=>{
  try{
    const h=new Headers(res.headers);
    h.set("x-sw-ts",String(now()));
    return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
  }catch{
    return res;
  }
};

self.addEventListener("install",e=>{
  e.waitUntil((async()=>{
    try{
      await self.skipWaiting();
      await caches.open(CORE_CACHE);
      await caches.open(MEDIA_CACHE);
    }catch{}
  })());
});

self.addEventListener("activate",e=>{
  e.waitUntil((async()=>{
    try{
      await self.clients.claim();
      await cleanOldCaches();
    }catch{}
  })());
});

const fetchNet=async req=>{
  const res=await fetch(req);
  return res;
};

const serveFromCacheFirst=async req=>{
  const url=new URL(req.url);
  const path=url.pathname||"";
  const cacheName=isMediaPath(path)?MEDIA_CACHE:CORE_CACHE;
  const cache=await caches.open(cacheName);
  const hit=await cache.match(req,{ignoreVary:false,ignoreSearch:false});
  if(hit) return hit;
  const res=await fetchNet(req);
  if(res && res.ok){
    const stamped=stampResponse(res.clone());
    await cachePutSafe(cache,req,stamped);
    if(cacheName===MEDIA_CACHE) await pruneMediaCache(MAX_MEDIA_BYTES);
  }
  return res;
};

const serveStaleWhileRevalidate=async req=>{
  const url=new URL(req.url);
  const path=url.pathname||"";
  const cacheName=isMediaPath(path)?MEDIA_CACHE:CORE_CACHE;
  const cache=await caches.open(cacheName);
  const cached=await cache.match(req,{ignoreVary:false,ignoreSearch:false});
  const netP=(async()=>{
    try{
      const res=await fetchNet(req);
      if(res && res.ok){
        const stamped=stampResponse(res.clone());
        await cachePutSafe(cache,req,stamped);
        if(cacheName===MEDIA_CACHE) await pruneMediaCache(MAX_MEDIA_BYTES);
      }
      return res;
    }catch{
      return null;
    }
  })();
  if(cached) return cached;
  const net=await netP;
  if(net) return net;
  throw new Error("offline");
};

self.addEventListener("fetch",e=>{
  const req=e.request;
  if(!isReqCacheable(req)) return;
  const url=new URL(req.url);
  if(req.mode==="navigate"){
    e.respondWith((async()=>{
      try{
        const res=await fetchNet(req);
        const cache=await caches.open(CORE_CACHE);
        if(res && res.ok) await cachePutSafe(cache,req,stampResponse(res.clone()));
        return res;
      }catch{
        const cache=await caches.open(CORE_CACHE);
        const cached=await cache.match("./index.html")||await cache.match("./")||await cache.match(new Request("./index.html",{mode:"navigate"}));
        if(cached) return cached;
        return new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Offline</title><body style='font-family:system-ui;margin:0;padding:20px;background:#050712;color:#fff'><h2>Offline</h2><p>Bitte Verbindung herstellen und neu laden.</p></body>",{headers:{"content-type":"text/html;charset=utf-8"}});
      }
    })());
    return;
  }
  const p=url.pathname.toLowerCase();
  const isCore=p.endsWith(".html")||p.endsWith(".css")||p.endsWith(".js")||p.endsWith(".webmanifest")||p.endsWith(".json")||p.endsWith(".svg")||p.endsWith(".png")||p.endsWith(".jpg")||p.endsWith(".jpeg")||p.endsWith(".webp")||p.endsWith(".woff2")||p.endsWith(".woff")||p.endsWith(".ttf")||p.endsWith(".ico");
  const isMedia=isMediaPath(p);
  if(isMedia){
    e.respondWith(serveFromCacheFirst(req));
    return;
  }
  if(isCore){
    e.respondWith(serveStaleWhileRevalidate(req));
    return;
  }
  e.respondWith((async()=>{
    try{return await fetchNet(req)}catch{return await serveFromCacheFirst(req)}
  })());
});

const cacheAll=async urls=>{
  const list=Array.from(new Set((urls||[]).map(u=>String(u||"").trim()).filter(Boolean)));
  const total=list.length||0;
  if(!total){
    await broadcast({type:MSG_DONE,cached:true});
    return;
  }
  const core=await caches.open(CORE_CACHE);
  const media=await caches.open(MEDIA_CACHE);
  let done=0;
  await broadcast({type:MSG_PROGRESS,active:true,pct:0,label:"Caching…"});
  for(const u of list){
    let pct=done/total;
    await broadcast({type:MSG_PROGRESS,active:true,pct,label:`Caching ${done}/${total}`});
    try{
      const req=new Request(u,{cache:"reload"});
      const res=await fetchNet(req);
      if(res && res.ok){
        const path=new URL(req.url).pathname||"";
        const c=isMediaPath(path)?media:core;
        const stamped=stampResponse(res.clone());
        await cachePutSafe(c,req,stamped);
      }
    }catch{}
    done++;
    pct=done/total;
    await broadcast({type:MSG_PROGRESS,active:true,pct,label:`Caching ${done}/${total}`});
    await new Promise(r=>setTimeout(r,12));
  }
  await pruneMediaCache(MAX_MEDIA_BYTES);
  await broadcast({type:MSG_PROGRESS,active:false,pct:1,label:"Fertig"});
  await broadcast({type:MSG_DONE,cached:true});
};

const clearAll=async()=>{
  try{
    await caches.delete(CORE_CACHE);
    await caches.delete(MEDIA_CACHE);
  }catch{}
  try{
    await caches.open(CORE_CACHE);
    await caches.open(MEDIA_CACHE);
  }catch{}
  await broadcast({type:MSG_DONE,cached:false});
};

self.addEventListener("message",e=>{
  const d=e.data||{};
  if(d.type==="CACHE_ALL"){
    const urls=d.urls||[];
    e.waitUntil(cacheAll(urls));
    return;
  }
  if(d.type==="CLEAR_CACHE"){
    e.waitUntil(clearAll());
    return;
  }
  if(d.type==="PING"){
    e.source && e.source.postMessage({type:"PONG",ver:VER});
    return;
  }
});
