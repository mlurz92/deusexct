const CORE_V="dexct-core-v1";
const ASSETS_V="dexct-assets-v1";
const CORE=["./","./index.html","./app.css","./app.js","./manifest.webmanifest","./Cover/00-Albumcover.jpg"];
const scope=()=>self.registration&&self.registration.scope?self.registration.scope:self.location.origin+"/";
const abs=u=>new URL(u,scope()).href;
const isGet=r=>r&&r.method==="GET";
const isNav=r=>r&&r.mode==="navigate";
const sameOrigin=u=>{try{return new URL(u).origin===self.location.origin}catch{return false}};
const okRes=r=>r&&r.ok&&r.type!=="opaque";
const extOf=u=>{try{const p=new URL(u).pathname;const i=p.lastIndexOf(".");return i>=0?p.slice(i+1).toLowerCase():""}catch{return""}};
const isCacheable=(req,res)=>{
  const u=req.url||"";
  if(!sameOrigin(u)) return false;
  const e=extOf(u);
  if(["html","js","css","json","txt","lrc","jpg","jpeg","png","webp","svg","ico","mp3","mp4","m4a","wav","ogg","woff","woff2","ttf","otf"].includes(e)) return true;
  const ct=(res&&res.headers&&res.headers.get("content-type")||"").toLowerCase();
  if(ct.startsWith("text/")) return true;
  if(ct.includes("javascript")||ct.includes("json")||ct.includes("css")||ct.includes("image/")||ct.includes("audio/")||ct.includes("video/")) return true;
  return false;
};
const broadcast=async(msg)=>{
  try{
    const cs=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const c of cs) try{c.postMessage(msg)}catch{}
  }catch{}
};
const cachePut=async(cacheName,url,res)=>{
  const c=await caches.open(cacheName);
  await c.put(new Request(url,{cache:"reload"}),res);
};
const cacheMatchAny=async(req)=>{
  const a=await caches.open(ASSETS_V);
  const r1=await a.match(req,{ignoreSearch:true});
  if(r1) return r1;
  const c=await caches.open(CORE_V);
  return await c.match(req,{ignoreSearch:true});
};
const precacheCore=async()=>{
  const c=await caches.open(CORE_V);
  const jobs=CORE.map(async u=>{
    const url=abs(u);
    try{
      const r=await fetch(new Request(url,{cache:"reload"}));
      if(okRes(r)) await c.put(new Request(url,{cache:"reload"}),r.clone());
    }catch{}
  });
  await Promise.all(jobs);
};
const clearOldCaches=async()=>{
  const keys=await caches.keys();
  const keep=new Set([CORE_V,ASSETS_V]);
  const del=keys.filter(k=>!keep.has(k)&&(/^dexct\-core\-/.test(k)||/^dexct\-assets\-/.test(k)));
  await Promise.all(del.map(k=>caches.delete(k)));
};
const cacheAllAssets=async(urls)=>{
  const list=Array.isArray(urls)?urls:[]; 
  const uniq=[];
  const seen=new Set();
  for(const u of list){
    const s=String(u||"").trim();
    if(!s) continue;
    const a=abs(s);
    if(seen.has(a)) continue;
    seen.add(a);
    uniq.push(a);
  }
  const total=uniq.length||0;
  if(!total){
    await broadcast({type:"CACHE_DONE",cached:false,failed:0,total:0});
    return;
  }
  let ok=0,fail=0;
  await broadcast({type:"CACHE_PROGRESS",active:true,pct:0,label:"Caching startet…"});
  const cache=await caches.open(ASSETS_V);
  for(let i=0;i<uniq.length;i++){
    const u=uniq[i];
    const name=(()=>{try{const p=new URL(u).pathname;return p.split("/").filter(Boolean).slice(-2).join("/")}catch{return"Asset"}})();
    await broadcast({type:"CACHE_PROGRESS",active:true,pct:Math.max(0,Math.min(1,i/total)),label:`Lade ${name}…`});
    try{
      const r=await fetch(new Request(u,{cache:"reload"}));
      if(!okRes(r)) throw new Error("fetch");
      await cache.put(new Request(u,{cache:"reload"}),r.clone());
      ok++;
      await broadcast({type:"CACHE_PROGRESS",active:true,pct:Math.max(0,Math.min(1,(i+1)/total)),label:`Gecacht: ${name}`});
    }catch{
      fail++;
      await broadcast({type:"CACHE_PROGRESS",active:true,pct:Math.max(0,Math.min(1,(i+1)/total)),label:`Fehler: ${name}`});
    }
  }
  const cached=fail===0 && ok===total;
  await broadcast({type:"CACHE_PROGRESS",active:false,pct:1,label:cached?"Cache vollständig":"Cache unvollständig"});
  await broadcast({type:"CACHE_DONE",cached,failed:fail,total});
};
const clearAssetsCache=async()=>{
  const had=await caches.delete(ASSETS_V);
  await broadcast({type:"CACHE_DONE",cached:false,failed:0,total:0,cleared:had});
};

self.addEventListener("install",e=>{
  e.waitUntil((async()=>{
    await precacheCore();
    try{await self.skipWaiting()}catch{}
  })());
});

self.addEventListener("activate",e=>{
  e.waitUntil((async()=>{
    await clearOldCaches();
    try{await self.clients.claim()}catch{}
  })());
});

self.addEventListener("message",e=>{
  const d=e.data||{};
  const t=d.type||"";
  if(t==="CACHE_ALL"){
    const urls=d.urls||[];
    e.waitUntil(cacheAllAssets(urls));
    return;
  }
  if(t==="CLEAR_CACHE"){
    e.waitUntil(clearAssetsCache());
    return;
  }
});

self.addEventListener("fetch",e=>{
  const req=e.request;
  if(!isGet(req)) return;
  if(isNav(req)){
    e.respondWith((async()=>{
      const cached=await cacheMatchAny(new Request(abs("./index.html")));
      try{
        const net=await fetch(req);
        if(okRes(net)){
          const c=await caches.open(CORE_V);
          try{await c.put(new Request(net.url,{cache:"reload"}),net.clone())}catch{}
        }
        return net;
      }catch{
        if(cached) return cached;
        return new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Offline</title><style>body{font-family:system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#050712;color:rgba(255,255,255,.92)}.c{max-width:520px;padding:22px;text-align:center}h1{font-size:18px;margin:0 0 10px}p{opacity:.7;margin:0}</style><div class=c><h1>Offline</h1><p>Keine Verbindung. Öffne die App erneut, sobald du wieder online bist.</p></div>",{headers:{"content-type":"text/html; charset=utf-8"},status:200});
      }
    })());
    return;
  }
  e.respondWith((async()=>{
    const hit=await cacheMatchAny(req);
    if(hit) return hit;
    try{
      const net=await fetch(req);
      if(okRes(net) && isCacheable(req,net)){
        const target=extOf(req.url)==="mp3"||extOf(req.url)==="mp4"||extOf(req.url)==="lrc"||req.url.includes("/Songs/")||req.url.includes("/Music_Videos/")||req.url.includes("/Cover/")?ASSETS_V:CORE_V;
        try{await cachePut(target,req.url,net.clone())}catch{}
      }
      return net;
    }catch{
      if(hit) return hit;
      throw new Error("offline");
    }
  })());
});
