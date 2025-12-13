(()=>{"use strict";
const VER="20251213_2";
const CORE=`dexct_v${VER}`;
const RT=`dexct_rt${VER}`;
const CORE_URLS=[
  "./",
  "./index.html",
  "./player.html",
  "./app.css",
  "./app.js",
  "./manifest.webmanifest",
  "./Cover/00-Albumcover.jpg"
];

const sameOrigin=u=>{try{return new URL(u).origin===self.location.origin}catch{return false}};
const isHTML=req=>req.mode==="navigate"||((req.headers.get("accept")||"").includes("text/html"));
const isMedia=u=>{const p=u.pathname.toLowerCase();return p.endsWith(".mp3")||p.endsWith(".mp4")||p.endsWith(".m4a")||p.endsWith(".webm")||p.endsWith(".wav")};
const isLrc=u=>u.pathname.toLowerCase().endsWith(".lrc");
const isImage=u=>{const p=u.pathname.toLowerCase();return p.endsWith(".jpg")||p.endsWith(".jpeg")||p.endsWith(".png")||p.endsWith(".webp")||p.endsWith(".gif")||p.endsWith(".avif")||p.endsWith(".svg")};
const isAppAsset=u=>{
  const p=u.pathname;
  return p.endsWith("/app.js")||p.endsWith("/app.css")||p.endsWith("/manifest.webmanifest")||p.endsWith("/index.html")||p.endsWith("/player.html")||p.endsWith("/sw.js")||p.endsWith("/Cover/00-Albumcover.jpg")||p==="/"||p.endsWith("/WebApp/")||p.endsWith("/WebApp");
};

const broadcast=async(msg)=>{
  try{
    const list=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const c of list) try{c.postMessage(msg)}catch{}
  }catch{}
};

const putSafe=async(cache,req,res)=>{
  try{
    if(!res||!res.ok) return;
    const cc=(res.headers.get("cache-control")||"").toLowerCase();
    if(cc.includes("no-store")) return;
    await cache.put(req,res);
  }catch{}
};

const cleanup=async()=>{
  const ks=await caches.keys();
  await Promise.all(ks.map(k=>{
    if(k.startsWith("dexct_v")&&k!==CORE) return caches.delete(k);
    if(k.startsWith("dexct_rt")&&k!==RT) return caches.delete(k);
    return Promise.resolve(false);
  }));
};

const rangeParse=h=>{
  if(!h) return null;
  const m=/bytes=(\d+)-(\d+)?/i.exec(h);
  if(!m) return null;
  const s=parseInt(m[1],10);
  const e=m[2]!==undefined?parseInt(m[2],10):null;
  if(!isFinite(s)||s<0) return null;
  if(e!==null && (!isFinite(e)||e<s)) return null;
  return {s,e};
};

const rangeFromCache=async(req,cacheName)=>{
  const r=rangeParse(req.headers.get("range"));
  if(!r) return null;
  const cache=await caches.open(cacheName);
  const full=await cache.match(req.url,{ignoreVary:true});
  if(!full||!full.ok) return null;
  const buf=await full.arrayBuffer();
  const size=buf.byteLength;
  const start=Math.min(r.s,size);
  const end=r.e===null?size-1:Math.min(r.e,size-1);
  if(start>size-1) return new Response(null,{status:416,headers:{"Content-Range":`bytes */${size}`}});
  const sliced=buf.slice(start,end+1);
  const headers=new Headers(full.headers);
  headers.set("Content-Range",`bytes ${start}-${end}/${size}`);
  headers.set("Content-Length",String(sliced.byteLength));
  headers.set("Accept-Ranges","bytes");
  if(!headers.get("Content-Type")){
    const p=new URL(req.url).pathname.toLowerCase();
    if(p.endsWith(".mp4")) headers.set("Content-Type","video/mp4");
    else if(p.endsWith(".mp3")) headers.set("Content-Type","audio/mpeg");
  }
  return new Response(sliced,{status:206,headers});
};

const fetchNet=async(req,opts)=>await fetch(req,opts||{});

self.addEventListener("install",e=>{
  e.waitUntil((async()=>{
    try{
      const c=await caches.open(CORE);
      await c.addAll(CORE_URLS);
    }catch{}
    try{await self.skipWaiting()}catch{}
  })());
});

self.addEventListener("activate",e=>{
  e.waitUntil((async()=>{
    await cleanup();
    try{
      const c=await caches.open(CORE);
      await Promise.all(CORE_URLS.map(async u=>{
        try{
          const r=await fetchNet(new Request(u,{cache:"reload"}));
          if(r&&r.ok) await putSafe(c,new Request(u),r.clone());
        }catch{}
      }));
    }catch{}
    try{await self.clients.claim()}catch{}
  })());
});

let jobId=0;
let jobAbort=false;

self.addEventListener("message",e=>{
  const d=e.data||{};
  if(d && d.type==="CACHE_ALL"){
    const urls=Array.isArray(d.urls)?d.urls:[];
    const id=++jobId;
    jobAbort=false;
    e.waitUntil((async()=>{
      let ok=true;
      try{
        const cache=await caches.open(CORE);
        const total=Math.max(1,urls.length);
        let done=0;
        for(const u of urls){
          if(jobAbort||id!==jobId) throw new Error("aborted");
          done++;
          await broadcast({type:"CACHE_PROGRESS",pct:done/total,label:`Caching ${done}/${total}`});
          try{
            const req=new Request(u,{cache:"reload"});
            const res=await fetchNet(req);
            if(res && res.ok) await putSafe(cache,req,res.clone());
          }catch{ok=false}
        }
      }catch{
        ok=false;
      }
      if(id===jobId) await broadcast({type:"CACHE_DONE",cached:ok});
    })());
  }
  if(d && d.type==="CLEAR_CACHE"){
    const id=++jobId;
    jobAbort=true;
    e.waitUntil((async()=>{
      try{
        const ks=await caches.keys();
        await Promise.all(ks.map(k=>{
          if(k.startsWith("dexct_v")||k.startsWith("dexct_rt")) return caches.delete(k);
          return Promise.resolve(false);
        }));
      }catch{}
      if(id===jobId) await broadcast({type:"CACHE_DONE",cached:false});
    })());
  }
});

self.addEventListener("fetch",e=>{
  const req=e.request;
  if(!req||req.method!=="GET") return;
  const url=new URL(req.url);
  const so=sameOrigin(req.url);

  e.respondWith((async()=>{
    if(!so){
      try{return await fetchNet(req)}catch{return new Response("",{status:504})}
    }

    if(req.headers.get("range")){
      const r=await rangeFromCache(req,CORE) || await rangeFromCache(req,RT);
      if(r) return r;
      try{return await fetchNet(req)}catch{return new Response("",{status:504})}
    }

    if(isHTML(req)){
      const core=await caches.open(CORE);
      const shellPath=(url.pathname==="/"||url.pathname.endsWith("/"))?"./index.html":url.pathname;
      const shellReq=new Request(shellPath);
      try{
        const net=await fetchNet(req);
        if(net && net.ok){
          try{
            const p=url.pathname;
            if(p==="/"||p.endsWith("/")){
              await putSafe(core,new Request("./index.html"),net.clone());
            }else if(p.endsWith(".html")){
              await putSafe(core,new Request(p),net.clone());
            }else{
              await putSafe(core,req,net.clone());
            }
          }catch{}
          return net;
        }
        const hit=await core.match(shellReq,{ignoreSearch:true}) || await core.match(req,{ignoreSearch:true});
        if(hit) return hit;
        const fb=await core.match("./index.html");
        if(fb) return fb;
        return net;
      }catch{
        const hit=await core.match(shellReq,{ignoreSearch:true}) || await core.match(req,{ignoreSearch:true});
        if(hit) return hit;
        const fb=await core.match("./index.html");
        if(fb) return fb;
        return new Response("",{status:504,headers:{"Content-Type":"text/plain"}});
      }
    }

    const cacheFirst=isAppAsset(url)||isImage(url)||isLrc(url)||isMedia(url);
    if(cacheFirst){
      const core=await caches.open(CORE);
      const rt=await caches.open(RT);
      const hit=await core.match(req,{ignoreSearch:false}) || await rt.match(req,{ignoreSearch:false});
      if(hit) return hit;
      try{
        const net=await fetchNet(req);
        if(net && net.ok){
          const target=(isAppAsset(url)||isImage(url)||isLrc(url))?core:rt;
          await putSafe(target,req,net.clone());
        }
        return net;
      }catch{
        const h2=await core.match(req,{ignoreSearch:false}) || await rt.match(req,{ignoreSearch:false});
        if(h2) return h2;
        return new Response("",{status:504});
      }
    }

    try{
      const net=await fetchNet(req);
      if(net && net.ok){
        const rt=await caches.open(RT);
        await putSafe(rt,req,net.clone());
      }
      return net;
    }catch{
      const rt=await caches.open(RT);
      const hit=await rt.match(req,{ignoreSearch:false});
      if(hit) return hit;
      const core=await caches.open(CORE);
      const h2=await core.match(req,{ignoreSearch:false});
      if(h2) return h2;
      return new Response("",{status:504});
    }
  })());
});
})();
