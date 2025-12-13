(()=>{"use strict";
const CAT_URL="./catalog.json";
const FALLBACK_COVER="./Cover/00-Albumcover.jpg";
const LS_KEY="dexct_state_v3";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const pad2=n=>String(n).padStart(2,"0");
const now=()=>performance.now();
const fmtTime=(sec)=>{
  if(!isFinite(sec)||sec<0) sec=0;
  sec=Math.floor(sec);
  const h=Math.floor(sec/3600);
  const m=Math.floor((sec%3600)/60);
  const s=sec%60;
  return h>0?`${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`:`${m}:${String(s).padStart(2,"0")}`;
};
const esc=(s)=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const safeName=(s)=>String(s??"track").normalize("NFKD").replace(/[\u0000-\u001f<>:"/\\|?*\u007f]+/g," ").replace(/\s+/g," ").trim().slice(0,140)||"track";
const withTimeout=async(fn,ms)=>{
  const ac=new AbortController();
  const t=setTimeout(()=>ac.abort(),ms);
  try{return await fn(ac.signal)}finally{clearTimeout(t)}
};
const loadJSON=async(url,ms=6000)=>{
  return await withTimeout(async(signal)=>{
    const r=await fetch(url,{cache:"no-store",signal});
    if(!r.ok) throw new Error("fetch");
    return await r.json();
  },ms);
};
const loadText=async(url,ms=6000)=>{
  return await withTimeout(async(signal)=>{
    const r=await fetch(url,{cache:"no-store",signal});
    if(!r.ok) throw new Error("fetch");
    return await r.text();
  },ms);
};
const loadAB=async(url,ms=240000)=>{
  return await withTimeout(async(signal)=>{
    const r=await fetch(url,{cache:"no-store",signal});
    if(!r.ok) throw new Error("fetch");
    return await r.arrayBuffer();
  },ms);
};
const dlBlob=(blob,filename)=>{
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=filename;
  a.rel="noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
};
const qs=()=>new URLSearchParams(location.search);
const setURL=(params,replace=false)=>{
  const u=new URL(location.href);
  for(const [k,v] of Object.entries(params)){
    if(v===null||v===undefined||v==="") u.searchParams.delete(k);
    else u.searchParams.set(k,String(v));
  }
  if(replace) history.replaceState({}, "", u.toString());
  else history.pushState({}, "", u.toString());
};
const getParamTrack=()=>{
  const p=qs().get("track");
  if(!p) return null;
  const id=pad2(parseInt(p,10));
  return /^\d{2}$/.test(id)?id:null;
};
const getParamMode=()=>{
  const m=(qs().get("mode")||"").toLowerCase();
  return m==="video"?"video":"audio";
};
const getParamAutoplay=()=>{
  const p=qs().get("play");
  if(p==="1"||p==="true") return true;
  if((location.hash||"").toLowerCase().includes("play")) return true;
  return false;
};
const getParamAlbum=()=>qs().get("album")==="1";
const getParamTime=()=>{
  const t=qs().get("t");
  if(!t) return null;
  const n=parseFloat(t);
  return isFinite(n)&&n>=0?n:null;
};

const toastHost=()=>{
  let h=$("#toastHost");
  if(h) return h;
  h=document.createElement("div");
  h.id="toastHost";
  h.style.position="fixed";
  h.style.left="16px";
  h.style.right="16px";
  h.style.bottom="18px";
  h.style.zIndex="9999";
  h.style.display="flex";
  h.style.flexDirection="column";
  h.style.gap="10px";
  h.style.pointerEvents="none";
  document.body.appendChild(h);
  return h;
};
const toast=(msg,kind="info",ms=2200)=>{
  const h=toastHost();
  const t=document.createElement("div");
  t.className=`toast ${kind}`;
  t.style.pointerEvents="auto";
  t.style.backdropFilter="blur(14px)";
  t.style.webkitBackdropFilter="blur(14px)";
  t.style.borderRadius="14px";
  t.style.padding="12px 14px";
  t.style.display="flex";
  t.style.alignItems="center";
  t.style.justifyContent="space-between";
  t.style.gap="10px";
  t.style.border="1px solid rgba(255,255,255,.10)";
  t.style.background="rgba(10,12,26,.78)";
  t.style.boxShadow="0 10px 30px rgba(0,0,0,.35)";
  t.style.transform="translate3d(0,14px,0)";
  t.style.opacity="0";
  t.style.transition="transform .22s ease, opacity .22s ease";
  const m=document.createElement("div");
  m.style.fontFamily="Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif";
  m.style.fontSize="14px";
  m.style.lineHeight="1.25";
  m.style.fontWeight="700";
  m.textContent=msg;
  const x=document.createElement("button");
  x.type="button";
  x.setAttribute("aria-label","Toast schließen");
  x.textContent="×";
  x.style.border="0";
  x.style.background="transparent";
  x.style.color="rgba(255,255,255,.92)";
  x.style.fontSize="20px";
  x.style.lineHeight="1";
  x.style.cursor="pointer";
  x.style.padding="0 2px";
  x.onclick=()=>hide();
  t.append(m,x);
  h.appendChild(t);
  requestAnimationFrame(()=>{t.style.opacity="1";t.style.transform="translate3d(0,0,0)"});
  let dead=false;
  const hide=()=>{
    if(dead) return;
    dead=true;
    t.style.opacity="0";
    t.style.transform="translate3d(0,14px,0)";
    setTimeout(()=>{t.remove()},220);
  };
  const tim=setTimeout(hide,ms);
  t.addEventListener("pointerdown",()=>{clearTimeout(tim)});
  t.addEventListener("pointerup",()=>{setTimeout(hide,500)});
  return {hide};
};

const parseLRC=(raw)=>{
  const lines=String(raw||"").replace(/\r/g,"").split("\n");
  const out=[];
  const rx=/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  for(const ln of lines){
    if(!ln) continue;
    let m;
    let lastIdx=0;
    const times=[];
    while((m=rx.exec(ln))!==null){
      const mm=parseInt(m[1],10);
      const ss=parseInt(m[2],10);
      const ff=m[3]!==undefined?m[3]:"0";
      const frac=parseInt((ff.length===1?ff+"00":ff.length===2?ff+"0":ff).slice(0,3),10)/1000;
      if(isFinite(mm)&&isFinite(ss)){
        times.push(mm*60+ss+frac);
        lastIdx=rx.lastIndex;
      }
    }
    if(times.length){
      const text=ln.slice(lastIdx).trim();
      for(const t of times) out.push({t,tx:text});
    }
  }
  out.sort((a,b)=>a.t-b.t);
  const merged=[];
  for(const it of out){
    const prev=merged[merged.length-1];
    if(prev && Math.abs(prev.t-it.t)<0.001){
      if(it.tx && !prev.tx) prev.tx=it.tx;
      continue;
    }
    merged.push(it);
  }
  return merged;
};
const bsearchLastLE=(arr,val)=>{
  let lo=0,hi=arr.length-1,ans=-1;
  while(lo<=hi){
    const mid=(lo+hi)>>1;
    if(arr[mid].t<=val){ans=mid;lo=mid+1}else hi=mid-1;
  }
  return ans;
};

const mediaSessionSet=(track,albumTitle,coverUrl,handlers)=>{
  if(!("mediaSession" in navigator)) return;
  try{
    navigator.mediaSession.metadata=new MediaMetadata({
      title:track?.title||track?.t||"",
      artist:albumTitle||"Deus ex CT",
      album:albumTitle||"Deus ex CT",
      artwork:[
        {src:coverUrl||FALLBACK_COVER,sizes:"512x512",type:"image/jpeg"},
        {src:coverUrl||FALLBACK_COVER,sizes:"1024x1024",type:"image/jpeg"}
      ]
    });
  }catch{}
  if(handlers){
    const set=(k,fn)=>{try{navigator.mediaSession.setActionHandler(k,fn)}catch{}};
    set("play",handlers.play);
    set("pause",handlers.pause);
    set("previoustrack",handlers.prev);
    set("nexttrack",handlers.next);
    set("seekto",handlers.seekto);
    set("seekbackward",handlers.seekbackward);
    set("seekforward",handlers.seekforward);
  }
};

const swSupport=()=>("serviceWorker" in navigator);
const swRegister=async()=>{
  if(!swSupport()) return null;
  try{
    const reg=await navigator.serviceWorker.register("./sw.js",{scope:"./"});
    return reg;
  }catch{return null}
};
const swPost=(msg)=>{
  if(!swSupport()) return;
  const send=()=>{
    if(navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(msg);
    else navigator.serviceWorker.ready.then(()=>{navigator.serviceWorker.controller && navigator.serviceWorker.controller.postMessage(msg)}).catch(()=>{});
  };
  send();
};
const cachesAvailable=()=>("caches" in window);

const stripID3v2=(u8)=>{
  if(u8.length<10) return u8;
  if(u8[0]!==0x49||u8[1]!==0x44||u8[2]!==0x33) return u8;
  const syn=(b)=>b&0x7f;
  const size=(syn(u8[6])<<21)|(syn(u8[7])<<14)|(syn(u8[8])<<7)|(syn(u8[9]));
  const total=10+size;
  if(total>=0 && total<u8.length) return u8.slice(total);
  return u8;
};
const stripID3v1=(u8)=>{
  if(u8.length<128) return u8;
  const o=u8.length-128;
  if(u8[o]===0x54&&u8[o+1]===0x41&&u8[o+2]===0x47) return u8.slice(0,o);
  return u8;
};
const concatU8=(chunks,total)=>{
  const out=new Uint8Array(total);
  let off=0;
  for(const c of chunks){out.set(c,off);off+=c.length}
  return out;
};

const app=(()=>{
  const S={
    album:{title:"Deus ex CT",cover:FALLBACK_COVER,tracks:0},
    tracks:[],
    idx:0,
    mode:"audio",
    shuffle:false,
    repeat:"off",
    lyricsOn:true,
    lyricSize:1,
    vol:1,
    muted:false,
    cached:false
  };

  let audioEl=null,videoEl=null,mediaEl=null;
  let raf=0;
  let lastTick=0;
  let lyricArr=[];
  let lyricIdx=-1;
  let userSeek=false;
  let sheetOpen=false;
  let swReg=null;
  let cacheJob=null;

  const el={};

  const loadState=()=>{
    try{
      const raw=localStorage.getItem(LS_KEY);
      if(!raw) return;
      const o=JSON.parse(raw);
      if(o && typeof o==="object"){
        if(o.mode==="audio"||o.mode==="video") S.mode=o.mode;
        if(typeof o.shuffle==="boolean") S.shuffle=o.shuffle;
        if(o.repeat==="off"||o.repeat==="one"||o.repeat==="all") S.repeat=o.repeat;
        if(typeof o.lyricsOn==="boolean") S.lyricsOn=o.lyricsOn;
        if(o.lyricSize===0||o.lyricSize===1||o.lyricSize===2) S.lyricSize=o.lyricSize;
        if(isFinite(o.vol)) S.vol=clamp(Number(o.vol),0,1);
        if(typeof o.muted==="boolean") S.muted=o.muted;
      }
    }catch{}
  };
  const saveState=()=>{
    try{
      localStorage.setItem(LS_KEY,JSON.stringify({
        mode:S.mode,shuffle:S.shuffle,repeat:S.repeat,lyricsOn:S.lyricsOn,lyricSize:S.lyricSize,vol:S.vol,muted:S.muted
      }));
    }catch{}
  };

  const sanitizeCatalog=(data)=>{
    const album=data?.album||{};
    const tracks=Array.isArray(data?.tracks)?data.tracks:[];
    S.album.title=String(album.title||"Deus ex CT");
    S.album.cover=String(album.cover||FALLBACK_COVER);
    S.album.tracks=Number(album.tracks||tracks.length||0);

    S.tracks=tracks.map((t,i)=>{
      const id=pad2(t.id??t.n??(i+1));
      const title=String(t.title??t.t??`Track ${id}`);
      const cover=String(t.cover||FALLBACK_COVER);
      const mp3=String(t.mp3||`./Songs/mp3/${id}.mp3`);
      const lrc=String(t.lrc||"");
      const video=String(t.video||t.mp4||"");
      const base=String(t.base||"");
      return {id,n:i+1,title,cover,mp3,lrc,video,base};
    }).filter(t=>/^\d{2}$/.test(t.id));
    if(!S.tracks.length) throw new Error("catalog");
  };

  const ensureUI=()=>{
    const root=$("#playerRoot")||document.body;
    el.root=root;

    el.back=$("#backBtn")||null;
    el.modeToggle=$("#modeToggle")||null;
    el.shareBtn=$("#shareBtn")||null;
    el.albumBtn=$("#albumBtn")||null;
    el.cacheBtn=$("#cacheBtn")||null;
    el.listBtn=$("#listBtn")||null;

    el.nowCover=$("#nowCover")||null;
    el.nowTitle=$("#nowTitle")||null;
    el.nowSub=$("#nowSub")||null;

    audioEl=$("#mediaAudio");
    videoEl=$("#mediaVideo");
    if(!audioEl){
      audioEl=document.createElement("audio");
      audioEl.id="mediaAudio";
      audioEl.preload="metadata";
      audioEl.playsInline=true;
      audioEl.controls=false;
      root.appendChild(audioEl);
    }
    if(!videoEl){
      videoEl=document.createElement("video");
      videoEl.id="mediaVideo";
      videoEl.preload="metadata";
      videoEl.playsInline=true;
      videoEl.controls=false;
      videoEl.muted=false;
      root.appendChild(videoEl);
    }

    el.play=$("#playBtn")||null;
    el.prev=$("#prevBtn")||null;
    el.next=$("#nextBtn")||null;
    el.seek=$("#seek")||null;
    el.cur=$("#curTime")||null;
    el.dur=$("#durTime")||null;
    el.vol=$("#vol")||null;
    el.mute=$("#muteBtn")||null;
    el.shuffle=$("#shuffleBtn")||null;
    el.repeat=$("#repeatBtn")||null;

    el.lyricsToggle=$("#lyricsToggle")||null;
    el.lyricsSize=$("#lyricsSize")||null;
    el.lyricLine=$("#lyricLine")||null;

    el.sheet=$("#playlistSheet")||null;
    el.sheetBackdrop=$("#sheetBackdrop")||null;
    el.sheetClose=$("#sheetClose")||null;
    el.playlist=$("#playlistList")||null;

    if(!el.lyricLine){
      el.lyricLine=document.createElement("div");
      el.lyricLine.id="lyricLine";
      root.appendChild(el.lyricLine);
    }

    audioEl.volume=S.vol;
    videoEl.volume=S.vol;
    audioEl.muted=S.muted;
    videoEl.muted=S.muted;
  };

  const setSheet=(open)=>{
    sheetOpen=!!open;
    if(el.sheet) el.sheet.classList.toggle("open",sheetOpen);
    if(el.sheetBackdrop) el.sheetBackdrop.classList.toggle("open",sheetOpen);
    if(el.listBtn) el.listBtn.classList.toggle("active",sheetOpen);
    document.documentElement.classList.toggle("sheetOpen",sheetOpen);
  };

  const activeMedia=()=>{
    mediaEl=S.mode==="video"?videoEl:audioEl;
    const other=S.mode==="video"?audioEl:videoEl;
    try{other.pause()}catch{}
    other.src="";
    other.load();
    if(S.mode==="video"){
      videoEl.style.display="";
      audioEl.style.display="none";
    }else{
      videoEl.style.display="none";
      audioEl.style.display="";
    }
    mediaEl.volume=S.vol;
    mediaEl.muted=S.muted;
    return mediaEl;
  };

  const setButtons=()=>{
    const setAct=(b,on)=>{if(b) b.classList.toggle("active",!!on)};
    setAct(el.shuffle,S.shuffle);
    setAct(el.repeat,S.repeat!=="off");
    if(el.repeat){
      const v=S.repeat==="off"?"Repeat: aus":S.repeat==="one"?"Repeat: Track":"Repeat: Playlist";
      el.repeat.setAttribute("aria-label",v);
      el.repeat.dataset?.mode!==undefined && (el.repeat.dataset.mode=S.repeat);
    }
    if(el.modeToggle){
      el.modeToggle.classList.toggle("active",S.mode==="video");
      el.modeToggle.setAttribute("aria-label",S.mode==="video"?"Modus: Video":"Modus: Audio");
      const lbl=el.modeToggle.querySelector(".lbl");
      if(lbl) lbl.textContent=S.mode==="video"?"Video":"Audio";
      const ico=el.modeToggle.querySelector("i");
      if(ico) ico.className=S.mode==="video"?"fa-solid fa-film":"fa-solid fa-headphones";
    }
    if(el.lyricsToggle){
      el.lyricsToggle.classList.toggle("active",S.lyricsOn);
      el.lyricsToggle.setAttribute("aria-label",S.lyricsOn?"Lyrics: an":"Lyrics: aus");
    }
    if(el.lyricsSize){
      const v=S.lyricSize===0?"S":S.lyricSize===1?"M":"L";
      const lbl=el.lyricsSize.querySelector(".lbl");
      if(lbl) lbl.textContent=v;
    }
    if(el.mute){
      el.mute.classList.toggle("active",S.muted);
      el.mute.setAttribute("aria-label",S.muted?"Ton: aus":"Ton: an");
      const ico=el.mute.querySelector("i");
      if(ico) ico.className=S.muted?"fa-solid fa-volume-xmark":"fa-solid fa-volume-high";
    }
    if(el.vol){
      if(el.vol.type==="range") el.vol.value=String(Math.round(S.vol*1000)/1000);
    }
  };

  const setLyricVisual=()=>{
    if(!el.lyricLine) return;
    el.lyricLine.classList.toggle("off",!S.lyricsOn);
    el.lyricLine.dataset.size=String(S.lyricSize);
  };

  const renderPlaylist=()=>{
    if(!el.playlist) return;
    el.playlist.textContent="";
    const frag=document.createDocumentFragment();
    for(let i=0;i<S.tracks.length;i++){
      const tr=S.tracks[i];
      const row=document.createElement("button");
      row.type="button";
      row.className="plRow";
      row.dataset.idx=String(i);
      row.setAttribute("aria-label",`${tr.id} ${tr.title}`);
      row.innerHTML=`<span class="plL"><span class="plImg"><img decoding="async" loading="lazy" src="${esc(tr.cover||FALLBACK_COVER)}" alt="${esc(tr.title)}"></span><span class="plMeta"><span class="plT">${esc(tr.id)} · ${esc(tr.title)}</span><span class="plS">${esc(S.album.title)}</span></span></span><span class="plR"><a class="plD" href="${esc(tr.mp3)}" download="${esc(tr.id)}-${esc(safeName(tr.title))}.mp3" aria-label="MP3 laden"><i class="fa-solid fa-download"></i></a><a class="plD" href="${esc(tr.video||"#")}" download="${esc(tr.id)}-${esc(safeName(tr.title))}.mp4" aria-label="MP4 laden" ${tr.video?``:`tabindex="-1"`}><i class="fa-solid fa-film"></i></a><a class="plD" href="${esc(tr.lrc||"#")}" download="${esc(tr.id)}-${esc(safeName(tr.title))}.lrc" aria-label="LRC laden" ${tr.lrc?``:`tabindex="-1"`}><i class="fa-solid fa-file-lines"></i></a></span>`;
      const img=row.querySelector("img");
      if(img) img.onerror=()=>{img.onerror=null;img.src=FALLBACK_COVER};
      const v=row.querySelectorAll(".plD");
      if(v[1] && !tr.video){v[1].style.opacity=".45";v[1].style.pointerEvents="none"}
      if(v[2] && !tr.lrc){v[2].style.opacity=".45";v[2].style.pointerEvents="none"}
      row.addEventListener("click",(e)=>{
        const a=e.target?.closest?.("a");
        if(a) return;
        playIndex(i,true);
        setSheet(false);
      });
      frag.appendChild(row);
    }
    el.playlist.appendChild(frag);
    syncPlaylistActive();
  };

  const syncPlaylistActive=()=>{
    if(!el.playlist) return;
    $$(".plRow",el.playlist).forEach((r)=>{
      const i=parseInt(r.dataset.idx,10);
      r.classList.toggle("active",i===S.idx);
    });
  };

  const setNow=()=>{
    const tr=S.tracks[S.idx];
    if(el.nowTitle) el.nowTitle.textContent=`${tr.id} · ${tr.title}`;
    if(el.nowSub) el.nowSub.textContent=S.mode==="video"?"Lyrics-Video":"Audio";
    if(el.nowCover){
      el.nowCover.src=tr.cover||S.album.cover||FALLBACK_COVER;
      el.nowCover.onerror=()=>{el.nowCover.onerror=null;el.nowCover.src=FALLBACK_COVER};
    }
    document.title=`${tr.id} · ${tr.title} · ${S.album.title}`;
  };

  const setMediaSrc=(tr,keepTime=null,autoplay=false)=>{
    const m=activeMedia();
    const src=S.mode==="video"?(tr.video||""):(tr.mp3||"");
    if(!src){
      toast(S.mode==="video"?"Video fehlt":"Audio fehlt","warn",2400);
      return;
    }
    const wasPlaying=autoplay||(!m.paused && isFinite(m.currentTime));
    let t=keepTime;
    if(t===null){
      try{t=isFinite(m.currentTime)?m.currentTime:0}catch{t=0}
    }
    try{m.pause()}catch{}
    m.src=src;
    m.load();
    m.volume=S.vol;
    m.muted=S.muted;
    const seekAfter=()=>{
      if(t!==null && isFinite(t) && t>0){
        try{m.currentTime=t}catch{}
      }
      if(wasPlaying) playMedia();
      updateTimes(true);
    };
    const onMeta=()=>{
      m.removeEventListener("loadedmetadata",onMeta);
      seekAfter();
    };
    m.addEventListener("loadedmetadata",onMeta);
    setTimeout(()=>{try{if(m.readyState>=1) seekAfter()}catch{}},450);
  };

  const loadLyrics=async(tr)=>{
    lyricArr=[];
    lyricIdx=-1;
    if(el.lyricLine) el.lyricLine.textContent="";
    if(!S.lyricsOn || !tr.lrc){
      if(el.lyricLine) el.lyricLine.textContent=S.lyricsOn?(tr.lrc?"":""):"";
      return;
    }
    try{
      const raw=await loadText(tr.lrc,8000);
      lyricArr=parseLRC(raw);
      lyricIdx=-1;
      tickLyrics(true);
    }catch{
      lyricArr=[];
      lyricIdx=-1;
      if(el.lyricLine) el.lyricLine.textContent="";
    }
  };

  const tickLyrics=(force=false)=>{
    if(!S.lyricsOn || !el.lyricLine) return;
    if(!lyricArr.length){
      if(force) el.lyricLine.textContent="";
      return;
    }
    const m=mediaEl||activeMedia();
    const t=isFinite(m.currentTime)?m.currentTime:0;
    const i=bsearchLastLE(lyricArr,t+0.02);
    if(force || i!==lyricIdx){
      lyricIdx=i;
      const tx=i>=0?lyricArr[i].tx:"";
      el.lyricLine.textContent=tx||"";
    }
  };

  const updateTimes=(force=false)=>{
    const m=mediaEl||activeMedia();
    const d=isFinite(m.duration)?m.duration:0;
    const c=isFinite(m.currentTime)?m.currentTime:0;
    if(el.cur) el.cur.textContent=fmtTime(c);
    if(el.dur) el.dur.textContent=d?fmtTime(d):"--:--";
    if(el.seek && !userSeek){
      if(el.seek.max!==String(Math.max(0,d))) el.seek.max=String(Math.max(0,d));
      if(force || Math.abs(Number(el.seek.value||0)-c)>0.25) el.seek.value=String(c);
    }
  };

  const rafLoop=()=>{
    cancelAnimationFrame(raf);
    const step=()=>{
      raf=requestAnimationFrame(step);
      const t=now();
      if(t-lastTick<60) return;
      lastTick=t;
      updateTimes(false);
      tickLyrics(false);
    };
    raf=requestAnimationFrame(step);
  };

  const stopRaf=()=>{cancelAnimationFrame(raf);raf=0};

  const playMedia=async()=>{
    const m=mediaEl||activeMedia();
    try{
      await m.play();
      rafLoop();
      setPlayIcon();
      if("mediaSession" in navigator) try{navigator.mediaSession.playbackState="playing"}catch{}
    }catch{
      toast("Tippe auf Play, um zu starten","warn",2200);
    }
  };
  const pauseMedia=()=>{
    const m=mediaEl||activeMedia();
    try{m.pause()}catch{}
    stopRaf();
    setPlayIcon();
    if("mediaSession" in navigator) try{navigator.mediaSession.playbackState="paused"}catch{}
  };
  const togglePlay=()=>{
    const m=mediaEl||activeMedia();
    if(m.paused) playMedia(); else pauseMedia();
  };
  const setPlayIcon=()=>{
    if(!el.play) return;
    const m=mediaEl||activeMedia();
    const ico=el.play.querySelector("i");
    const lbl=el.play.querySelector(".lbl");
    const playing=!m.paused;
    if(ico) ico.className=playing?"fa-solid fa-pause":"fa-solid fa-play";
    if(lbl) lbl.textContent=playing?"Pause":"Play";
    el.play.classList.toggle("active",playing);
  };

  const pickNextIndex=(dir)=>{
    const n=S.tracks.length;
    if(n<=1) return S.idx;
    if(S.shuffle){
      if(n===2) return S.idx===0?1:0;
      let j=S.idx;
      let tries=0;
      while(j===S.idx && tries<10){j=Math.floor(Math.random()*n);tries++}
      return j;
    }
    return (S.idx+dir+n)%n;
  };

  const playIndex=async(i,autoplay=true,keepTime=null)=>{
    i=clamp(i,0,S.tracks.length-1);
    S.idx=i;
    const tr=S.tracks[S.idx];
    setURL({track:tr.id,mode:S.mode},true);
    setNow();
    syncPlaylistActive();
    setMediaSrc(tr,keepTime,autoplay);
    await loadLyrics(tr);
    mediaSessionSet(tr,S.album.title,tr.cover,{
      play:()=>playMedia(),
      pause:()=>pauseMedia(),
      prev:()=>prev(),
      next:()=>next(),
      seekto:(d)=>{const m=mediaEl||activeMedia();if(d&&isFinite(d.seekTime)) try{m.currentTime=d.seekTime}catch{}},
      seekbackward:()=>{const m=mediaEl||activeMedia();try{m.currentTime=Math.max(0,(m.currentTime||0)-10)}catch{}},
      seekforward:()=>{const m=mediaEl||activeMedia();try{m.currentTime=Math.min(m.duration||0,(m.currentTime||0)+10)}catch{}}
    });
  };

  const next=()=>{
    const m=mediaEl||activeMedia();
    const keep=0;
    const i=pickNextIndex(+1);
    playIndex(i,true,keep);
  };
  const prev=()=>{
    const m=mediaEl||activeMedia();
    const c=isFinite(m.currentTime)?m.currentTime:0;
    if(c>3){
      try{m.currentTime=0}catch{}
      return;
    }
    const keep=0;
    const i=pickNextIndex(-1);
    playIndex(i,true,keep);
  };

  const toggleMode=()=>{
    const m=mediaEl||activeMedia();
    const t=isFinite(m.currentTime)?m.currentTime:0;
    const playing=!m.paused;
    S.mode=S.mode==="video"?"audio":"video";
    saveState();
    setButtons();
    setNow();
    playIndex(S.idx,playing,t);
  };

  const toggleShuffle=()=>{
    S.shuffle=!S.shuffle;
    saveState();
    setButtons();
  };
  const cycleRepeat=()=>{
    S.repeat=S.repeat==="off"?"all":S.repeat==="all"?"one":"off";
    saveState();
    setButtons();
  };

  const toggleLyrics=()=>{
    S.lyricsOn=!S.lyricsOn;
    saveState();
    setButtons();
    setLyricVisual();
    loadLyrics(S.tracks[S.idx]);
  };
  const cycleLyricSize=()=>{
    S.lyricSize=S.lyricSize===0?1:S.lyricSize===1?2:0;
    saveState();
    setButtons();
    setLyricVisual();
  };

  const setVol=(v)=>{
    S.vol=clamp(v,0,1);
    audioEl.volume=S.vol;
    videoEl.volume=S.vol;
    saveState();
    setButtons();
  };
  const toggleMute=()=>{
    S.muted=!S.muted;
    audioEl.muted=S.muted;
    videoEl.muted=S.muted;
    saveState();
    setButtons();
  };

  const shareTrack=async()=>{
    const tr=S.tracks[S.idx];
    const u=new URL("./player.html",location.href);
    u.searchParams.set("track",tr.id);
    u.searchParams.set("mode",S.mode);
    const url=u.toString();
    const title=`${tr.id} · ${tr.title}`;
    try{
      if(navigator.share){
        await navigator.share({title, text:`${S.album.title} – ${title}`, url});
        return;
      }
    }catch{}
    try{
      await navigator.clipboard.writeText(url);
      toast("Link kopiert","ok",1600);
    }catch{
      const ta=document.createElement("textarea");
      ta.value=url;
      ta.style.position="fixed";
      ta.style.left="-9999px";
      document.body.appendChild(ta);
      ta.select();
      try{document.execCommand("copy");toast("Link kopiert","ok",1600)}catch{toast("Kopieren nicht möglich","warn",2200)}
      ta.remove();
    }
  };

  const cacheAll=async()=>{
    if(!swSupport()){
      toast("Offline-Cache nicht verfügbar","warn",2400);
      return;
    }
    const urls=[
      "./","./index.html","./player.html","./app.css","./app.js","./manifest.webmanifest","./sw.js",CAT_URL,S.album.cover||FALLBACK_COVER
    ];
    for(const tr of S.tracks){
      if(tr.cover) urls.push(tr.cover);
      if(tr.mp3) urls.push(tr.mp3);
      if(tr.lrc) urls.push(tr.lrc);
      if(tr.video) urls.push(tr.video);
    }
    toast("Offline-Cache startet…","info",1600);
    swPost({type:"CACHE_ALL",urls});
  };

  const clearCache=async()=>{
    if(!swSupport()){
      toast("Cache nicht verfügbar","warn",2200);
      return;
    }
    toast("Cache wird geleert…","info",1600);
    swPost({type:"CLEAR_CACHE"});
  };

  const setCacheBtn=(cached)=>{
    S.cached=!!cached;
    if(!el.cacheBtn) return;
    el.cacheBtn.classList.toggle("active",S.cached);
    const lbl=el.cacheBtn.querySelector(".lbl");
    if(lbl) lbl.textContent=S.cached?"Offline":"Offline";
    el.cacheBtn.setAttribute("aria-label",S.cached?"Offline-Cache löschen":"Offline-Cache laden");
  };

  const hookSW=()=>{
    if(!swSupport()) return;
    navigator.serviceWorker.addEventListener("message",(e)=>{
      const d=e.data||{};
      if(d.type==="CACHE_PROGRESS"){
        if(cacheJob) cacheJob.hide();
        cacheJob=toast(d.label||"Caching…","info",900);
      }
      if(d.type==="CACHE_DONE"){
        if(cacheJob) cacheJob.hide();
        cacheJob=null;
        setCacheBtn(!!d.cached);
        toast(d.cached?"Offline bereit":"Cache gelöscht","ok",1800);
      }
    });
  };

  const checkCacheHint=async()=>{
    if(!cachesAvailable()) return;
    try{
      const keys=await caches.keys();
      const any=keys.some(k=>k.startsWith("dexct_v")||k.startsWith("dexct_rt"));
      setCacheBtn(any);
    }catch{}
  };

  const albumDownload=async()=>{
    const albumTitle=S.album.title||"Deus ex CT";
    const baseName=safeName(albumTitle).replace(/\s+/g,"_");
    const parts=[];
    let total=0;
    const t0=toast("Album wird vorbereitet…","info",1800);
    for(let i=0;i<S.tracks.length;i++){
      const tr=S.tracks[i];
      try{
        const n=toast(`Lade ${tr.id}/${pad2(S.tracks.length)}…`,"info",900);
        const ab=await loadAB(tr.mp3,240000);
        n.hide();
        let u8=new Uint8Array(ab);
        u8=stripID3v2(u8);
        u8=stripID3v1(u8);
        parts.push(u8);
        total+=u8.length;
      }catch{
        toast(`Fehler bei ${tr.id} – Abbruch`,"warn",2400);
        return;
      }
    }
    t0.hide();
    const t1=toast("Erstelle Album-MP3…","info",1800);
    const joined=concatU8(parts,total);
    t1.hide();
    const blob=new Blob([joined],{type:"audio/mpeg"});
    dlBlob(blob,`${baseName}.mp3`);
    toast("Album-Download gestartet","ok",2000);
  };

  const bindEvents=()=>{
    const onKey=(e)=>{
      if(e.key==="Escape"){if(sheetOpen) setSheet(false)}
      if(e.target && (e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA")) return;
      if(e.code==="Space"){e.preventDefault();togglePlay()}
      if(e.key==="ArrowRight"){const m=mediaEl||activeMedia();try{m.currentTime=Math.min(m.duration||0,(m.currentTime||0)+5)}catch{}}
      if(e.key==="ArrowLeft"){const m=mediaEl||activeMedia();try{m.currentTime=Math.max(0,(m.currentTime||0)-5)}catch{}}
      if(e.key==="ArrowUp"){setVol(S.vol+0.05)}
      if(e.key==="ArrowDown"){setVol(S.vol-0.05)}
    };
    window.addEventListener("keydown",onKey,{passive:false});

    if(el.back) el.back.addEventListener("click",()=>{});
    if(el.modeToggle) el.modeToggle.addEventListener("click",()=>toggleMode());
    if(el.shareBtn) el.shareBtn.addEventListener("click",()=>shareTrack());
    if(el.albumBtn) el.albumBtn.addEventListener("click",()=>albumDownload());
    if(el.cacheBtn) el.cacheBtn.addEventListener("click",()=>{S.cached?clearCache():cacheAll()});
    if(el.listBtn) el.listBtn.addEventListener("click",()=>setSheet(!sheetOpen));
    if(el.sheetBackdrop) el.sheetBackdrop.addEventListener("click",()=>setSheet(false));
    if(el.sheetClose) el.sheetClose.addEventListener("click",()=>setSheet(false));

    if(el.play) el.play.addEventListener("click",()=>togglePlay());
    if(el.prev) el.prev.addEventListener("click",()=>prev());
    if(el.next) el.next.addEventListener("click",()=>next());

    if(el.seek){
      el.seek.addEventListener("input",()=>{
        userSeek=true;
        const v=parseFloat(el.seek.value);
        if(el.cur) el.cur.textContent=fmtTime(v);
      },{passive:true});
      el.seek.addEventListener("change",()=>{
        const m=mediaEl||activeMedia();
        const v=parseFloat(el.seek.value);
        if(isFinite(v)) try{m.currentTime=v}catch{}
        userSeek=false;
      },{passive:true});
    }

    if(el.vol){
      el.vol.addEventListener("input",()=>{
        const v=parseFloat(el.vol.value);
        if(isFinite(v)) setVol(v);
      },{passive:true});
    }
    if(el.mute) el.mute.addEventListener("click",()=>toggleMute());
    if(el.shuffle) el.shuffle.addEventListener("click",()=>toggleShuffle());
    if(el.repeat) el.repeat.addEventListener("click",()=>cycleRepeat());

    if(el.lyricsToggle) el.lyricsToggle.addEventListener("click",()=>toggleLyrics());
    if(el.lyricsSize) el.lyricsSize.addEventListener("click",()=>cycleLyricSize());

    const ended=()=>{
      if(S.repeat==="one"){playIndex(S.idx,true,0);return}
      if(S.idx===S.tracks.length-1 && !S.shuffle){
        if(S.repeat==="all"){playIndex(0,true,0);return}
        pauseMedia();
        return;
      }
      playIndex(pickNextIndex(+1),true,0);
    };
    audioEl.addEventListener("ended",ended);
    videoEl.addEventListener("ended",ended);

    const onPlay=()=>{setPlayIcon();rafLoop()};
    const onPause=()=>{setPlayIcon();stopRaf()};
    audioEl.addEventListener("play",onPlay);
    audioEl.addEventListener("pause",onPause);
    videoEl.addEventListener("play",onPlay);
    videoEl.addEventListener("pause",onPause);

    const onTime=()=>{if(!raf) {updateTimes(false);tickLyrics(false)}};
    audioEl.addEventListener("timeupdate",onTime);
    videoEl.addEventListener("timeupdate",onTime);

    const onMeta=()=>{updateTimes(true);};
    audioEl.addEventListener("loadedmetadata",onMeta);
    videoEl.addEventListener("loadedmetadata",onMeta);

    window.addEventListener("popstate",()=>{
      const id=getParamTrack();
      const mode=getParamMode();
      const t=getParamTime();
      const target=id?S.tracks.findIndex(x=>x.id===id):-1;
      if(mode!==S.mode){
        const m=mediaEl||activeMedia();
        const ct=isFinite(m.currentTime)?m.currentTime:0;
        S.mode=mode;
        saveState();
        setButtons();
        setNow();
        playIndex(S.idx,!m.paused,ct);
        return;
      }
      if(target>=0 && target!==S.idx){
        const m=mediaEl||activeMedia();
        const playing=!m.paused;
        playIndex(target,playing,t??0);
      }else if(t!==null){
        const m=mediaEl||activeMedia();
        try{m.currentTime=t}catch{}
      }
    });
  };

  const initFromURL=()=>{
    const mode=getParamMode();
    const id=getParamTrack();
    const t=getParamTime();
    const auto=getParamAutoplay();
    if(mode) S.mode=mode;
    let i=0;
    if(id){
      const j=S.tracks.findIndex(x=>x.id===id);
      if(j>=0) i=j;
    }
    S.idx=clamp(i,0,S.tracks.length-1);
    setURL({mode:S.mode,track:S.tracks[S.idx].id},true);
    setButtons();
    setLyricVisual();
    renderPlaylist();
    setNow();
    setMediaSrc(S.tracks[S.idx],t??0,auto);
    loadLyrics(S.tracks[S.idx]);
    if(auto) playMedia();
  };

  const boot=async()=>{
    loadState();
    ensureUI();
    swReg=await swRegister();
    hookSW();
    await checkCacheHint();

    try{
      const data=await loadJSON(CAT_URL,7000);
      sanitizeCatalog(data);
    }catch{
      toast("catalog.json nicht gefunden","warn",2600);
      return;
    }

    setButtons();
    setLyricVisual();
    renderPlaylist();
    initFromURL();
    bindEvents();

    const album=getParamAlbum();
    if(album){
      setTimeout(()=>albumDownload(),250);
    }

    mediaSessionSet(S.tracks[S.idx],S.album.title,S.tracks[S.idx].cover,{
      play:()=>playMedia(),
      pause:()=>pauseMedia(),
      prev:()=>prev(),
      next:()=>next(),
      seekto:(d)=>{const m=mediaEl||activeMedia();if(d&&isFinite(d.seekTime)) try{m.currentTime=d.seekTime}catch{}},
      seekbackward:()=>{const m=mediaEl||activeMedia();try{m.currentTime=Math.max(0,(m.currentTime||0)-10)}catch{}},
      seekforward:()=>{const m=mediaEl||activeMedia();try{m.currentTime=Math.min(m.duration||0,(m.currentTime||0)+10)}catch{}}
    });

    window.DEXCT={state:S,playIndex,playMedia,pauseMedia,toggleMode,cacheAll,clearCache,albumDownload};
  };

  return {boot};
})();

const isPlayer=(document.body?.dataset?.page||"") === "player" || !!$("#playerRoot") || location.pathname.toLowerCase().includes("player");
if(isPlayer) app.boot();
})();
