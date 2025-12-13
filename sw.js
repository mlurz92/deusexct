"use strict";
const VER="v3";
const CACHE=`dexct-cache-${VER}`;
const CORE=[
  "./",
  "./index.html",
  "./player.html",
  "./app.css",
  "./app.js",
  "./catalog.json",
  "./manifest.webmanifest",
  "./Cover/00-Albumcover.jpg"
].map(p=>new URL(p,self.registration.scope).toString());

const uniq=(arr)=>{
  const s=new Set();
  const out=[];
  for(const x of arr){
    const v=String(x||"");
    if(!v) continue;
    if(!s.has(v)){ s.add(v); out.push(v); }
  }
  return out;
};

const postAll=async(msg)=>{
  try{
    const cs=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const c of cs) try{ c.postMessage(msg); }catch{}
  }catch{}
};

const extOf=(u)=>{
  const p=u.pathname||"";
  const i=p.lastIndexOf(".");
  return i>=0?p.slice(i+1).toLowerCase():"";
};

const guessType=(u,fromHeaders)=>{
  const h=fromHeaders||"";
  if(h) return h;
  const e=extOf(u);
  if(e==="mp3") return "audio/mpeg";
  if(e==="mp4") return "video/mp4";
  if(e==="lrc") return "text/plain; charset=utf-8";
  if(e==="json") return "application/json; charset=utf-8";
  if(e==="css") return "text/css; charset=utf-8";
  if(e==="js") return "application/javascript; charset=utf-8";
  if(e==="webmanifest") return "application/manifest+json; charset=utf-8";
  if(e==="jpg"||e==="jpeg") return "image/jpeg";
  if(e==="png") return "image/png";
  if(e==="webp") return "image/webp";
  if(e==="svg") return "image/svg+xml; charset=utf-8";
  if(e==="html") return "text/html; charset=utf-8";
  return "application/octet-stream";
};

const cachePutSafe=async(cache,req,res)=>{
  try{
    if(!res || !res.ok) return false;
    const cc=res.headers.get("Cache-Control")||"";
    if(/\bno-store\b/i.test(cc)) return false;
    await cache.put(req,res);
    return true;
  }catch{
    return false;
  }
};

const fetchSafe=async(req)=>{
  try{
    const r=await fetch(req);
    return r;
  }catch{
    return null;
  }
};

const cacheAll=async(urls)=>{
  const list=uniq([...(CORE||[]),...(urls||[])]).filter(u=>{
    try{ return new URL(u).origin===self.location.origin; }catch{ return false; }
  });
  const cache=await caches.open(CACHE);
  let ok=0;
  for(let i=0;i<list.length;i++){
    const u=list[i];
    await postAll({type:"CACHE_PROGRESS",label:`${i+1}/${list.length}`});
    try{
      const req=new Request(u,{method:"GET",cache:"reload",credentials:"same-origin",mode:"same-origin"});
      const res=await fetchSafe(req);
      if(res && res.ok){
        const put=await cachePutSafe(cache,req,res.clone());
        if(put) ok++;
      }
    }catch{}
  }
  await postAll({type:"CACHE_DONE",cached:ok>0});
};

const clearCache=async()=>{
  try{ await caches.delete(CACHE); }catch{}
  await postAll({type:"CACHE_DONE",cached:false});
};

self.addEventListener("install",(e)=>{
  e.waitUntil((async()=>{
    try{
      const cache=await caches.open(CACHE);
      for(const u of CORE){
        try{
          const req=new Request(u,{method:"GET",cache:"reload",credentials:"same-origin",mode:"same-origin"});
          const res=await fetchSafe(req);
          if(res && res.ok) await cachePutSafe(cache,req,res.clone());
        }catch{}
      }
    }catch{}
    try{ await self.skipWaiting(); }catch{}
  })());
});

self.addEventListener("activate",(e)=>{
  e.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k)));
    }catch{}
    try{ await self.clients.claim(); }catch{}
  })());
});

self.addEventListener("message",(e)=>{
  const d=e.data||{};
  const t=String(d.type||"");
  if(t==="CACHE_ALL"){
    const urls=Array.isArray(d.urls)?d.urls:[];
    e.waitUntil(cacheAll(urls));
    return;
  }
  if(t==="CLEAR_CACHE"){
    e.waitUntil(clearCache());
    return;
  }
});

const respondRangeFromCache=async(req)=>{
  const range=req.headers.get("range");
  if(!range) return null;
  const m=/bytes\s*=\s*(\d*)\s*-\s*(\d*)/i.exec(range);
  if(!m) return null;
  const startRaw=m[1],endRaw=m[2];
  const url=req.url;
  const cache=await caches.open(CACHE);
  const full=await cache.match(url,{ignoreVary:true});
  if(!full) return null;
  let buf;
  try{ buf=await full.arrayBuffer(); }catch{ return null; }
  const len=buf.byteLength;
  let start=startRaw?parseInt(startRaw,10):0;
  let end=endRaw?parseInt(endRaw,10):(len-1);
  if(!isFinite(start)) start=0;
  if(!isFinite(end)) end=len-1;
  start=Math.max(0,Math.min(start,len-1));
  end=Math.max(start,Math.min(end,len-1));
  const chunk=buf.slice(start,end+1);
  const u=new URL(url);
  const ct=guessType(u,full.headers.get("Content-Type")||"");
  const h=new Headers();
  h.set("Content-Type",ct);
  h.set("Accept-Ranges","bytes");
  h.set("Content-Range",`bytes ${start}-${end}/${len}`);
  h.set("Content-Length",String(chunk.byteLength));
  const etag=full.headers.get("ETag");
  if(etag) h.set("ETag",etag);
  const lm=full.headers.get("Last-Modified");
  if(lm) h.set("Last-Modified",lm);
  return new Response(chunk,{status:206,statusText:"Partial Content",headers:h});
};

const navResponse=async(req)=>{
  const cache=await caches.open(CACHE);
  const net=await fetchSafe(req);
  if(net && net.ok){
    cachePutSafe(cache,req,net.clone());
    return net;
  }
  const cached=await cache.match(req,{ignoreSearch:false});
  if(cached) return cached;
  const fallback=await cache.match(new URL("./index.html",self.registration.scope).toString(),{ignoreSearch:true});
  if(fallback) return fallback;
  return new Response("Offline",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
};

const assetResponse=async(req)=>{
  const url=new URL(req.url);
  const cache=await caches.open(CACHE);
  const cached=await cache.match(req,{ignoreSearch:false,ignoreVary:true});
  if(cached) return cached;
  const net=await fetchSafe(req);
  if(net && net.ok){
    const e=extOf(url);
    if(e && ["js","css","json","webmanifest","jpg","jpeg","png","webp","svg","mp3","mp4","lrc","html"].includes(e)){
      cachePutSafe(cache,req,net.clone());
    }
    return net;
  }
  const fallback=await cache.match(url.toString(),{ignoreSearch:true,ignoreVary:true});
  if(fallback) return fallback;
  return new Response("Offline",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
};

self.addEventListener("fetch",(e)=>{
  const req=e.request;
  if(req.method!=="GET") return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  if(req.headers.has("range")){
    e.respondWith((async()=>{
      const fromCache=await respondRangeFromCache(req);
      if(fromCache) return fromCache;
      const net=await fetchSafe(req);
      if(net) return net;
      return new Response("",{status:416,headers:{"Content-Type":"text/plain; charset=utf-8"}});
    })());
    return;
  }
  if(req.mode==="navigate" || (req.headers.get("accept")||"").includes("text/html")){
    e.respondWith(navResponse(req));
    return;
  }
  e.respondWith(assetResponse(req));
});
