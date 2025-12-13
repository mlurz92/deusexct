(()=>{"use strict";
const V="3";
const SHELL=`dexct_shell_v${V}`;
const RT=`dexct_rt_v${V}`;
const ORIGIN=self.location.origin;
const SHELL_URLS=["./","./index.html","./player.html","./app.css","./app.js","./manifest.webmanifest","./catalog.json","./Cover/00-Albumcover.jpg"];

const toAbs=(u)=>new URL(u,self.location).toString();
const isSameOrigin=(u)=>{try{return new URL(u,self.location).origin===ORIGIN}catch{return false}};
const uniq=(arr)=>{
  const s=new Set();
  const out=[];
  for(const v of arr||[]){
    const a=toAbs(v);
    if(!s.has(a)){s.add(a);out.push(a)}
  }
  return out;
};
const postAll=async(msg)=>{
  const cs=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  for(const c of cs) try{c.postMessage(msg)}catch{}
};
const openShell=()=>caches.open(SHELL);
const openRT=()=>caches.open(RT);

self.addEventListener("install",(e)=>{
  e.waitUntil((async()=>{
    const c=await openShell();
    await c.addAll(SHELL_URLS.map(toAbs));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",(e)=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.map(k=>{
      const keep=(k===SHELL||k===RT);
      const known=(k.startsWith("dexct_shell_v")||k.startsWith("dexct_rt_v"));
      return (!keep && known) ? caches.delete(k) : Promise.resolve();
    }));
    await self.clients.claim();
  })());
});

const rangeParse=(range,size)=>{
  if(!range) return null;
  const m=/bytes=(\d*)-(\d*)/i.exec(range);
  if(!m) return null;
  let start=m[1]?parseInt(m[1],10):NaN;
  let end=m[2]?parseInt(m[2],10):NaN;
  if(Number.isNaN(start)&&Number.isNaN(end)) return null;
  if(Number.isNaN(start)){
    const suf=end;
    if(!isFinite(suf)||suf<=0) return null;
    start=Math.max(0,size-suf);
    end=size-1;
  }else if(Number.isNaN(end)){
    end=size-1;
  }
  start=Math.max(0,start);
  end=Math.min(size-1,end);
  if(end<start) return null;
  return {start,end};
};

const respondRange=async(req,res)=>{
  try{
    const ab=await res.arrayBuffer();
    const u8=new Uint8Array(ab);
    const r=rangeParse(req.headers.get("range"),u8.length);
    if(!r) return res;
    const chunk=u8.slice(r.start,r.end+1);
    const h=new Headers();
    const ct=res.headers.get("content-type")||"application/octet-stream";
    h.set("Content-Type",ct);
    h.set("Accept-Ranges","bytes");
    h.set("Content-Range",`bytes ${r.start}-${r.end}/${u8.length}`);
    h.set("Content-Length",String(chunk.byteLength));
    return new Response(chunk,{status:206,statusText:"Partial Content",headers:h});
  }catch{
    return res;
  }
};

const fetchAndMaybeCache=async(req,cacheKey,cacheIt)=>{
  const res=await fetch(req);
  if(cacheIt && res && res.ok){
    try{
      const c=await openRT();
      await c.put(cacheKey||req,res.clone());
    }catch{}
  }
  return res;
};

const navFallback=async(req)=>{
  const u=new URL(req.url);
  const isPlayer=u.pathname.toLowerCase().endsWith("player.html");
  const c=await openShell();
  const hit=await c.match(req,{ignoreSearch:false});
  if(hit) return hit;
  const fb=await c.match(toAbs(isPlayer?"./player.html":"./index.html"),{ignoreSearch:true});
  return fb||new Response("",{status:503});
};

const shouldAutoCache=(req)=>{
  const u=new URL(req.url);
  const p=u.pathname.toLowerCase();
  if(p.endsWith(".mp3")||p.endsWith(".mp4")) return false;
  if(p.endsWith(".jpg")||p.endsWith(".jpeg")||p.endsWith(".png")||p.endsWith(".webp")) return true;
  if(p.endsWith(".css")||p.endsWith(".js")||p.endsWith(".json")||p.endsWith(".lrc")||p.endsWith(".webmanifest")||p.endsWith(".svg")) return true;
  if(u.pathname.endsWith("/")||p.endsWith("index.html")||p.endsWith("player.html")) return true;
  return false;
};

self.addEventListener("fetch",(e)=>{
  const req=e.request;
  if(req.method!=="GET") return;
  const url=req.url;
  if(!isSameOrigin(url)) return;

  if(req.mode==="navigate"){
    e.respondWith((async()=>{
      try{
        const res=await fetch(req);
        try{
          const c=await openShell();
          if(res && res.ok) await c.put(req,res.clone());
        }catch{}
        return res;
      }catch{
        return await navFallback(req);
      }
    })());
    return;
  }

  e.respondWith((async()=>{
    const u=new URL(url);
    const p=u.pathname.toLowerCase();
    const isMedia=(p.endsWith(".mp3")||p.endsWith(".mp4"));
    const hasRange=!!req.headers.get("range");

    const rt=await openRT().catch(()=>null);
    const sh=await openShell().catch(()=>null);

    let hit=null;
    if(rt) hit=await rt.match(req,{ignoreSearch:false}).catch(()=>null);
    if(!hit && sh) hit=await sh.match(req,{ignoreSearch:false}).catch(()=>null);

    if(hit){
      if(hasRange) return await respondRange(req,hit.clone());
      return hit;
    }

    if(isMedia){
      try{
        const res=await fetch(req);
        return res;
      }catch{
        const sh2=await openShell().catch(()=>null);
        if(sh2){
          const fb=await sh2.match(toAbs("./index.html"),{ignoreSearch:true}).catch(()=>null);
          if(fb) return fb;
        }
        return new Response("",{status:504});
      }
    }

    try{
      const cacheIt=shouldAutoCache(req);
      const res=await fetchAndMaybeCache(req,req,cacheIt);
      return res;
    }catch{
      if(sh){
        const fb=await sh.match(req,{ignoreSearch:true}).catch(()=>null);
        if(fb) return fb;
      }
      return new Response("",{status:504});
    }
  })());
});

const cacheAll=async(urls)=>{
  const list=uniq((urls||[]).filter(isSameOrigin));
  if(!list.length){
    await postAll({type:"CACHE_DONE",cached:false});
    return;
  }
  const c=await openRT();
  let ok=0;
  for(let i=0;i<list.length;i++){
    const u=list[i];
    const name=(()=>{try{return decodeURIComponent(new URL(u).pathname.split("/").pop()||"")||"…"}catch{return "…"}})();
    await postAll({type:"CACHE_PROGRESS",label:`${i+1}/${list.length} · ${name}`});
    try{
      const req=new Request(u,{cache:"reload"});
      const res=await fetch(req);
      if(res && res.ok){
        await c.put(req,res.clone());
        ok++;
      }
    }catch{}
  }
  await postAll({type:"CACHE_DONE",cached:ok>0});
};

const clearRT=async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith("dexct_rt_v")).map(k=>caches.delete(k)));
  await postAll({type:"CACHE_DONE",cached:false});
};

self.addEventListener("message",(e)=>{
  const d=e.data||{};
  const t=d.type||"";
  if(t==="CACHE_ALL"){
    const urls=Array.isArray(d.urls)?d.urls:[];
    e.waitUntil(cacheAll(urls));
    return;
  }
  if(t==="CLEAR_CACHE"){
    e.waitUntil(clearRT());
    return;
  }
  if(t==="PING"){
    e.waitUntil(postAll({type:"PONG"}));
  }
});
})();
