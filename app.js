(()=>{"use strict";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=(s)=>String(s??"");
const pad2=(n)=>String(n).padStart(2,"0");
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmtTime=(sec)=>{
  if(!isFinite(sec)||sec<0) return "--:--";
  sec=Math.floor(sec+0.00001);
  const m=Math.floor(sec/60),s=sec%60;
  return `${m}:${String(s).padStart(2,"0")}`;
};
const now=()=>performance.now();
const url=new URL(location.href);
const qp=(k)=>url.searchParams.get(k);
const setQP=(k,v)=>{ if(v==null) url.searchParams.delete(k); else url.searchParams.set(k,String(v)); };
const commitURL=()=>{ history.replaceState(null,"",url.toString()); };
const toAbs=(u)=>new URL(u,location.href).toString();
const sameOrigin=(u)=>{try{return new URL(u,location.href).origin===location.origin}catch{return false}};
const safeTitle=(s)=>String(s??"").normalize("NFKD").replace(/[\u0000-\u001f<>:"/\\|?*\u007f]+/g," ").replace(/\s+/g," ").trim();
const FALLBACK_COVER="./Cover/00-Albumcover.jpg";
const LS_KEY="dexct_player_state_v3";

const root=$("#playerRoot");
if(!root) return;

const ui={
  brandCoverImg:$("#brandCoverImg"),
  brandTitle:$("#brandTitle"),
  brandSub:$("#brandSub"),
  modeToggle:$("#modeToggle"),
  lyricsToggle:$("#lyricsToggle"),
  lyricsSize:$("#lyricsSize"),
  shareBtn:$("#shareBtn"),
  albumBtn:$("#albumBtn"),
  cacheBtn:$("#cacheBtn"),
  listBtn:$("#listBtn"),
  nowCover:$("#nowCover"),
  nowTitle:$("#nowTitle"),
  nowSub:$("#nowSub"),
  badgeTrack:$("#badgeTrack"),
  badgeMode:$("#badgeMode"),
  mediaVideo:$("#mediaVideo"),
  mediaAudio:$("#mediaAudio"),
  lyricLine:$("#lyricLine"),
  shuffleBtn:$("#shuffleBtn"),
  prevBtn:$("#prevBtn"),
  playBtn:$("#playBtn"),
  nextBtn:$("#nextBtn"),
  repeatBtn:$("#repeatBtn"),
  muteBtn:$("#muteBtn"),
  seek:$("#seek"),
  curTime:$("#curTime"),
  durTime:$("#durTime"),
  vol:$("#vol"),
  sheetBackdrop:$("#sheetBackdrop"),
  playlistSheet:$("#playlistSheet"),
  playlistList:$("#playlistList"),
  sheetClose:$("#sheetClose"),
  sheetH1:$("#sheetH1"),
  sheetH2:$("#sheetH2")
};

const toast=(msg,ms=1200)=>{
  const el=ui.lyricLine;
  if(!el) return;
  const prev=el.textContent;
  const prevOff=el.classList.contains("off");
  el.classList.remove("off");
  el.textContent=msg;
  clearTimeout(el._t);
  el._t=setTimeout(()=>{
    el.textContent=prev;
    if(prevOff) el.classList.add("off");
  },ms);
};

const setImgFallback=(img)=>{
  if(!img) return;
  img.onerror=()=>{ img.onerror=null; img.src=FALLBACK_COVER; };
};

setImgFallback(ui.brandCoverImg);
setImgFallback(ui.nowCover);

const media={
  el:null,
  audio:ui.mediaAudio,
  video:ui.mediaVideo
};

const state={
  catalog:null,
  albumTitle:"Deus ex CT",
  albumCover:FALLBACK_COVER,
  tracks:[],
  idx:0,
  mode:"audio",
  shuffle:false,
  repeat:0,
  lyricsOn:true,
  lyricsSize:1,
  muted:false,
  volume:1,
  playing:false,
  seeking:false,
  lastTimeSync:0,
  lrc:null,
  lrcIdx:-1,
  raf:0,
  swReady:false,
  offline:false,
  albumDownloading:false
};

const saveState=()=>{
  const s={
    idx:state.idx,
    mode:state.mode,
    shuffle:state.shuffle,
    repeat:state.repeat,
    lyricsOn:state.lyricsOn,
    lyricsSize:state.lyricsSize,
    muted:state.muted,
    volume:state.volume
  };
  try{ localStorage.setItem(LS_KEY,JSON.stringify(s)); }catch{}
};

const loadState=()=>{
  try{
    const raw=localStorage.getItem(LS_KEY);
    if(!raw) return;
    const s=JSON.parse(raw);
    if(s && typeof s==="object"){
      if(typeof s.idx==="number" && isFinite(s.idx)) state.idx=s.idx;
      if(s.mode==="audio"||s.mode==="video") state.mode=s.mode;
      state.shuffle=!!s.shuffle;
      state.repeat=clamp(parseInt(s.repeat,10)||0,0,2);
      state.lyricsOn=s.lyricsOn!==false;
      state.lyricsSize=clamp(parseInt(s.lyricsSize,10)||1,0,2);
      state.muted=!!s.muted;
      state.volume=clamp(parseFloat(s.volume)||1,0,1);
    }
  }catch{}
};

const parseTrackParam=(v)=>{
  const n=parseInt(String(v??"").replace(/[^\d]/g,""),10);
  if(!isFinite(n)||n<=0) return null;
  return pad2(clamp(n,1,99));
};

const idxById=(id)=>{
  const t=String(id||"");
  const p=/^\d{2}$/.test(t)?t:parseTrackParam(t);
  if(!p) return -1;
  const i=state.tracks.findIndex(x=>String(x.id)===p);
  return i<0?-1:i;
};

const buildDownloads=(t)=>{
  const a=(href,icon,label,fn)=>{
    const el=document.createElement("a");
    el.className="plD";
    el.href=href;
    el.download=fn||"";
    el.setAttribute("aria-label",label);
    el.innerHTML=`<i class="${icon}"></i>`;
    el.addEventListener("click",(e)=>e.stopPropagation(),{passive:true});
    return el;
  };
  const r=document.createElement("div");
  r.className="plR";
  const mp3=esc(t.mp3||"");
  const mp4=esc(t.video||"");
  const lrc=esc(t.lrc||"");
  if(mp3) r.appendChild(a(mp3,"fa-solid fa-file-audio",`MP3 laden: ${t.title||t.id}`,safeTitle(`${t.id}-${t.title||"track"}`)+".mp3"));
  if(mp4) r.appendChild(a(mp4,"fa-solid fa-file-video",`Video laden: ${t.title||t.id}`,safeTitle(`${t.id}-${t.title||"track"}`)+".mp4"));
  if(lrc) r.appendChild(a(lrc,"fa-solid fa-file-lines",`LRC laden: ${t.title||t.id}`,safeTitle(`${t.id}-${t.title||"track"}`)+".lrc"));
  return r;
};

const openSheet=()=>{
  ui.sheetBackdrop.classList.add("open");
  ui.playlistSheet.classList.add("open");
  ui.sheetBackdrop.setAttribute("aria-hidden","false");
};
const closeSheet=()=>{
  ui.sheetBackdrop.classList.remove("open");
  ui.playlistSheet.classList.remove("open");
  ui.sheetBackdrop.setAttribute("aria-hidden","true");
};

const setModeButton=()=>{
  const isVideo=state.mode==="video";
  ui.modeToggle.classList.toggle("active",isVideo);
  ui.badgeMode.textContent=isVideo?"Video":"Audio";
  const icon=ui.modeToggle.querySelector("i");
  const lbl=ui.modeToggle.querySelector(".lbl");
  if(icon) icon.className=isVideo?"fa-solid fa-film":"fa-solid fa-headphones";
  if(lbl) lbl.textContent=isVideo?"Video":"Audio";
};

const setLyricsUI=()=>{
  ui.lyricsToggle.classList.toggle("active",state.lyricsOn);
  const icon=ui.lyricsToggle.querySelector("i");
  const lbl=ui.lyricsToggle.querySelector(".lbl");
  if(icon) icon.className=state.lyricsOn?"fa-solid fa-music":"fa-regular fa-music";
  if(lbl) lbl.textContent=state.lyricsOn?"Lyrics":"Off";
  ui.lyricLine.classList.toggle("off",!state.lyricsOn);
  ui.lyricLine.dataset.size=String(state.lyricsSize);
  const l=ui.lyricsSize.querySelector(".lbl");
  if(l) l.textContent=state.lyricsSize===0?"S":state.lyricsSize===2?"L":"M";
};

const setShuffleUI=()=>{
  ui.shuffleBtn.classList.toggle("active",state.shuffle);
};
const setRepeatUI=()=>{
  ui.repeatBtn.classList.toggle("active",state.repeat!==0);
  const icon=ui.repeatBtn.querySelector("i");
  if(icon){
    icon.className=state.repeat===2?"fa-solid fa-repeat-1":"fa-solid fa-repeat";
  }
};
const setPlayUI=()=>{
  const icon=ui.playBtn.querySelector("i");
  const lbl=ui.playBtn.querySelector(".lbl");
  const isPlaying=!!state.playing;
  if(icon) icon.className=isPlaying?"fa-solid fa-pause":"fa-solid fa-play";
  if(lbl) lbl.textContent=isPlaying?"Pause":"Play";
};

const setMuteUI=()=>{
  ui.muteBtn.classList.toggle("active",state.muted);
  const icon=ui.muteBtn.querySelector("i");
  if(icon) icon.className=state.muted?"fa-solid fa-volume-xmark":"fa-solid fa-volume-high";
};

const setCacheUI=()=>{
  ui.cacheBtn.classList.toggle("active",state.offline);
  const icon=ui.cacheBtn.querySelector("i");
  const lbl=ui.cacheBtn.querySelector(".lbl");
  if(icon) icon.className=state.offline?"fa-solid fa-cloud-check":"fa-solid fa-cloud-arrow-down";
  if(lbl) lbl.textContent=state.offline?"Offline":"Offline";
};

const setAlbumUI=(busy,progressText)=>{
  state.albumDownloading=!!busy;
  ui.albumBtn.classList.toggle("active",busy);
  ui.albumBtn.disabled=!!busy;
  ui.albumBtn.setAttribute("aria-busy",busy?"true":"false");
  const lbl=ui.albumBtn.querySelector(".lbl");
  if(lbl) lbl.textContent=busy?(progressText||"…"):"Album";
};

const currentTrack=()=>state.tracks[state.idx]||null;

const applyMeta=()=>{
  const t=currentTrack();
  const title=state.albumTitle||"Deus ex CT";
  if(ui.brandTitle) ui.brandTitle.textContent=title;
  if(ui.brandCoverImg){ ui.brandCoverImg.src=state.albumCover||FALLBACK_COVER; setImgFallback(ui.brandCoverImg); }
  if(t){
    ui.nowTitle.textContent=safeTitle(t.title||`Track ${t.id}`)||`Track ${t.id}`;
    ui.nowSub.textContent=`${state.mode==="video"?"Lyrics-Video":"Audio"} · ${t.id}`;
    ui.badgeTrack.textContent=`Track ${t.id}`;
    ui.nowCover.src=esc(t.cover||state.albumCover||FALLBACK_COVER);
    setImgFallback(ui.nowCover);
    document.title=`Deus ex CT · ${t.id} · ${safeTitle(t.title||"Track")||"Track"}`;
  }else{
    ui.nowTitle.textContent="—";
    ui.nowSub.textContent="—";
    ui.badgeTrack.textContent="Track";
  }
};

const buildPlaylist=()=>{
  ui.playlistList.textContent="";
  const frag=document.createDocumentFragment();
  for(let i=0;i<state.tracks.length;i++){
    const t=state.tracks[i];
    const row=document.createElement("div");
    row.className="plRow";
    row.setAttribute("role","listitem");
    row.dataset.idx=String(i);

    const l=document.createElement("div");
    l.className="plL";

    const imgW=document.createElement("div");
    imgW.className="plImg";
    const img=document.createElement("img");
    img.decoding="async";
    img.loading="lazy";
    img.alt=safeTitle(t.title||`Track ${t.id}`)||`Track ${t.id}`;
    img.src=esc(t.cover||state.albumCover||FALLBACK_COVER);
    setImgFallback(img);
    imgW.appendChild(img);

    const meta=document.createElement("div");
    meta.className="plMeta";
    const tt=document.createElement("div");
    tt.className="plT";
    tt.textContent=`${t.id} · ${safeTitle(t.title||`Track ${t.id}`)||`Track ${t.id}`}`;
    const sub=document.createElement("div");
    sub.className="plS";
    sub.textContent=`Audio/Video · Downloads`;
    meta.append(tt,sub);

    l.append(imgW,meta);

    const r=buildDownloads(t);

    row.append(l,r);

    row.addEventListener("click",()=>{
      const idx=parseInt(row.dataset.idx,10);
      if(!isFinite(idx)) return;
      selectTrack(idx,true);
      closeSheet();
    },{passive:true});

    frag.appendChild(row);
  }
  ui.playlistList.appendChild(frag);
  syncPlaylistActive();
};

const syncPlaylistActive=()=>{
  const rows=$$(".plRow",ui.playlistList);
  for(const r of rows){
    const i=parseInt(r.dataset.idx,10);
    r.classList.toggle("active",i===state.idx);
  }
};

const setMediaElement=()=>{
  const isVideo=state.mode==="video";
  media.el=isVideo?media.video:media.audio;
  media.video.style.display=isVideo?"block":"none";
  media.audio.style.display=isVideo?"none":"block";
};

const stopRAF=()=>{
  if(state.raf){ cancelAnimationFrame(state.raf); state.raf=0; }
};

const parseLRC=(txt)=>{
  const lines=String(txt||"").split(/\r?\n/);
  const items=[];
  for(const raw of lines){
    const line=raw.trim();
    if(!line) continue;
    const tags=[...line.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    if(!tags.length) continue;
    const text=line.replace(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*/g,"").trim();
    for(const m of tags){
      const mm=parseInt(m[1],10),ss=parseInt(m[2],10);
      let frac=m[3]?String(m[3]):"0";
      if(frac.length===1) frac=frac+"00";
      if(frac.length===2) frac=frac+"0";
      const ms=parseInt(frac.slice(0,3),10)||0;
      if(!isFinite(mm)||!isFinite(ss)) continue;
      const t=mm*60+ss+ms/1000;
      items.push({t,text});
    }
  }
  items.sort((a,b)=>a.t-b.t);
  const compact=[];
  for(let i=0;i<items.length;i++){
    const cur=items[i];
    const prev=compact[compact.length-1];
    if(prev && Math.abs(prev.t-cur.t)<0.0005){
      prev.text=cur.text||prev.text;
    }else{
      compact.push({t:cur.t,text:cur.text||""});
    }
  }
  return compact.length?compact:null;
};

const loadLRCForTrack=async(t)=>{
  state.lrc=null;
  state.lrcIdx=-1;
  ui.lyricLine.textContent="";
  if(!t || !t.lrc) return;
  try{
    const r=await fetch(t.lrc,{cache:"no-store"});
    if(!r.ok) return;
    const txt=await r.text();
    state.lrc=parseLRC(txt);
    state.lrcIdx=-1;
  }catch{}
};

const updateLyricAt=(time)=>{
  if(!state.lyricsOn){ ui.lyricLine.textContent=""; return; }
  const l=state.lrc;
  if(!l || !l.length){ ui.lyricLine.textContent=""; return; }
  const t=clamp(time||0,0,1e9);
  let lo=0,hi=l.length-1,ans=-1;
  while(lo<=hi){
    const mid=(lo+hi)>>1;
    if(l[mid].t<=t){ ans=mid; lo=mid+1; } else hi=mid-1;
  }
  if(ans<0) ans=0;
  if(ans!==state.lrcIdx){
    state.lrcIdx=ans;
    const text=l[ans].text||"";
    ui.lyricLine.textContent=text;
  }
};

const startRAF=()=>{
  stopRAF();
  const tick=()=>{
    const el=media.el;
    if(el){
      const ct=el.currentTime||0;
      if(!state.seeking){
        ui.seek.value=String(ct);
        ui.curTime.textContent=fmtTime(ct);
      }
      updateLyricAt(ct);
    }
    state.raf=requestAnimationFrame(tick);
  };
  state.raf=requestAnimationFrame(tick);
};

const setSources=async(keepTime=0,autoPlay=false)=>{
  const t=currentTrack();
  if(!t) return;
  setMediaElement();
  const el=media.el;
  const wasMuted=state.muted;
  const vol=clamp(state.volume,0,1);

  const audioSrc=esc(t.mp3||"");
  const videoSrc=esc(t.video||"");
  const useVideo=state.mode==="video" && !!videoSrc;

  if(state.mode==="video" && !videoSrc){
    state.mode="audio";
    setModeButton();
    setMediaElement();
  }

  media.audio.pause();
  media.video.pause();
  media.audio.src="";
  media.video.src="";

  if(useVideo){
    media.video.src=videoSrc;
    media.video.muted=wasMuted;
    media.video.volume=vol;
    media.video.playsInline=true;
    media.video.setAttribute("playsinline","");
    media.video.load();
  }else{
    media.audio.src=audioSrc;
    media.audio.muted=wasMuted;
    media.audio.volume=vol;
    media.audio.load();
  }

  await loadLRCForTrack(t);

  applyMeta();
  syncPlaylistActive();

  const setTimeSafe=()=>{
    try{
      if(isFinite(keepTime) && keepTime>0){
        el.currentTime=keepTime;
      }
    }catch{}
  };

  const pReady=new Promise((resolve)=>{
    const onMeta=()=>{
      el.removeEventListener("loadedmetadata",onMeta);
      resolve(true);
    };
    el.addEventListener("loadedmetadata",onMeta,{once:true});
    setTimeout(()=>resolve(false),900);
  });

  setTimeSafe();
  await pReady;
  setTimeSafe();

  ui.seek.max=String(isFinite(el.duration)?el.duration:0);
  ui.durTime.textContent=fmtTime(el.duration);

  if(autoPlay){
    try{
      await el.play();
      state.playing=true;
    }catch{
      state.playing=false;
    }
  }else{
    state.playing=false;
  }
  setPlayUI();
  saveState();
};

const selectTrack=async(idx,autoPlay)=>{
  idx=clamp(idx,0,state.tracks.length-1);
  state.idx=idx;
  const t=currentTrack();
  const id=t?String(t.id):pad2(idx+1);
  setQP("track",id);
  setQP("mode",state.mode);
  commitURL();
  applyMeta();
  await setSources(0,!!autoPlay);
};

const nextIndex=()=>{
  const n=state.tracks.length;
  if(n<=1) return state.idx;
  if(state.repeat===2) return state.idx;
  if(state.shuffle){
    let tries=8;
    while(tries--){
      const r=Math.floor(Math.random()*n);
      if(r!==state.idx) return r;
    }
    return (state.idx+1)%n;
  }
  const ni=state.idx+1;
  if(ni<n) return ni;
  return state.repeat===1?0:state.idx;
};

const prevIndex=()=>{
  const n=state.tracks.length;
  if(n<=1) return state.idx;
  if(state.repeat===2) return state.idx;
  if(state.shuffle){
    let tries=8;
    while(tries--){
      const r=Math.floor(Math.random()*n);
      if(r!==state.idx) return r;
    }
    return (state.idx-1+n)%n;
  }
  const pi=state.idx-1;
  if(pi>=0) return pi;
  return state.repeat===1?(n-1):state.idx;
};

const playPause=async(forcePlay=null)=>{
  const el=media.el;
  if(!el) return;
  const want=forcePlay==null?!state.playing:!!forcePlay;
  if(want){
    try{
      await el.play();
      state.playing=true;
    }catch{
      state.playing=false;
      toast("Tap Play");
    }
  }else{
    try{ el.pause(); }catch{}
    state.playing=false;
  }
  setPlayUI();
  saveState();
};

const setMode=async(mode)=>{
  mode=mode==="video"?"video":"audio";
  if(mode===state.mode) return;
  const el=media.el;
  const t=el?el.currentTime||0:0;
  const wasPlaying=!!state.playing;
  state.mode=mode;
  setQP("mode",state.mode);
  commitURL();
  setModeButton();
  applyMeta();
  await setSources(t,wasPlaying);
  saveState();
};

const toggleMute=()=>{
  state.muted=!state.muted;
  const a=media.audio,v=media.video;
  a.muted=state.muted;
  v.muted=state.muted;
  setMuteUI();
  saveState();
};

const setVolume=(v)=>{
  state.volume=clamp(v,0,1);
  media.audio.volume=state.volume;
  media.video.volume=state.volume;
  if(state.volume===0) state.muted=true;
  if(state.volume>0 && state.muted) state.muted=false;
  media.audio.muted=state.muted;
  media.video.muted=state.muted;
  ui.vol.value=String(state.volume);
  setMuteUI();
  saveState();
};

const seekTo=(t)=>{
  const el=media.el;
  if(!el) return;
  try{ el.currentTime=clamp(t,0,isFinite(el.duration)?el.duration:1e9); }catch{}
};

const updateMediaSession=()=>{
  const t=currentTrack();
  if(!("mediaSession" in navigator) || !t) return;
  try{
    navigator.mediaSession.metadata=new MediaMetadata({
      title:safeTitle(t.title||`Track ${t.id}`)||`Track ${t.id}`,
      artist:"Deus ex CT",
      album:state.albumTitle||"Deus ex CT",
      artwork:[
        {src:esc(t.cover||state.albumCover||FALLBACK_COVER),sizes:"512x512",type:"image/jpeg"},
        {src:esc(state.albumCover||FALLBACK_COVER),sizes:"512x512",type:"image/jpeg"}
      ]
    });
    navigator.mediaSession.setActionHandler("play",()=>playPause(true));
    navigator.mediaSession.setActionHandler("pause",()=>playPause(false));
    navigator.mediaSession.setActionHandler("previoustrack",()=>goPrev(true));
    navigator.mediaSession.setActionHandler("nexttrack",()=>goNext(true));
    navigator.mediaSession.setActionHandler("seekto",(e)=>{ if(e && typeof e.seekTime==="number") seekTo(e.seekTime); });
  }catch{}
};

const goNext=async(autoPlay)=>{
  const ni=nextIndex();
  if(ni===state.idx && state.repeat===0 && !state.shuffle){
    if(state.playing) await playPause(false);
    return;
  }
  await selectTrack(ni,!!autoPlay);
  if(autoPlay) await playPause(true);
};

const goPrev=async(autoPlay)=>{
  const el=media.el;
  if(el && el.currentTime>3 && !state.shuffle){
    seekTo(0);
    return;
  }
  const pi=prevIndex();
  if(pi===state.idx && state.repeat===0 && !state.shuffle){
    seekTo(0);
    return;
  }
  await selectTrack(pi,!!autoPlay);
  if(autoPlay) await playPause(true);
};

const copyLink=async()=>{
  const t=currentTrack();
  if(t){
    setQP("track",String(t.id));
    setQP("mode",state.mode);
    commitURL();
  }
  const link=location.href;
  try{
    await navigator.clipboard.writeText(link);
    toast("Link kopiert");
  }catch{
    try{
      const inp=document.createElement("input");
      inp.value=link;
      inp.style.position="fixed";
      inp.style.left="-9999px";
      document.body.appendChild(inp);
      inp.select();
      document.execCommand("copy");
      inp.remove();
      toast("Link kopiert");
    }catch{
      prompt("Link:",link);
    }
  }
};

const collectAllCacheUrls=()=>{
  const urls=[];
  urls.push("./","./index.html","./player.html","./app.css","./app.js","./manifest.webmanifest","./catalog.json",state.albumCover||FALLBACK_COVER);
  for(const t of state.tracks){
    if(t.cover) urls.push(t.cover);
    if(t.mp3) urls.push(t.mp3);
    if(t.video) urls.push(t.video);
    if(t.lrc) urls.push(t.lrc);
  }
  return urls.map(toAbs).filter(sameOrigin);
};

const swSend=async(msg)=>{
  if(!navigator.serviceWorker || !navigator.serviceWorker.controller) return false;
  try{
    navigator.serviceWorker.controller.postMessage(msg);
    return true;
  }catch{
    return false;
  }
};

const setupSW=async()=>{
  if(!("serviceWorker" in navigator)) return;
  try{
    await navigator.serviceWorker.register("./sw.js",{scope:"./"});
  }catch{}
  const ctrl=()=>!!navigator.serviceWorker.controller;
  state.swReady=ctrl();
  navigator.serviceWorker.addEventListener("controllerchange",()=>{ state.swReady=ctrl(); });
  navigator.serviceWorker.addEventListener("message",(e)=>{
    const d=e.data||{};
    if(d.type==="CACHE_PROGRESS"){
      const label=esc(d.label||"");
      if(label){
        ui.cacheBtn.title=label;
        if(state.offline) toast(label,700);
      }
      return;
    }
    if(d.type==="CACHE_DONE"){
      const cached=!!d.cached;
      if(state.offline && !cached) state.offline=false;
      ui.cacheBtn.title="";
      setCacheUI();
      toast(cached?"Offline bereit":"Offline aus");
      try{ localStorage.setItem("dexct_offline_v3",cached?"1":"0"); }catch{}
    }
  });
  try{
    state.offline=localStorage.getItem("dexct_offline_v3")==="1";
  }catch{}
  setCacheUI();
};

const toggleOffline=async()=>{
  if(!navigator.serviceWorker || !navigator.serviceWorker.controller){
    toast("SW nicht aktiv");
    return;
  }
  if(state.offline){
    await swSend({type:"CLEAR_CACHE"});
    state.offline=false;
    setCacheUI();
    try{ localStorage.setItem("dexct_offline_v3","0"); }catch{}
    toast("Offline aus");
    return;
  }
  state.offline=true;
  setCacheUI();
  try{ localStorage.setItem("dexct_offline_v3","1"); }catch{}
  const urls=collectAllCacheUrls();
  await swSend({type:"CACHE_ALL",urls});
  toast("Offline Cache…");
};

const albumDownload=async()=>{
  if(state.albumDownloading) return;
  const tracks=state.tracks.slice();
  const mp3s=tracks.map(t=>t.mp3).filter(Boolean);
  if(!mp3s.length){ toast("Keine MP3"); return; }
  setAlbumUI(true,"0%");
  const parts=[];
  let total=0;
  const abort=new AbortController();
  const t0=now();
  try{
    for(let i=0;i<mp3s.length;i++){
      const pct=Math.floor((i/mp3s.length)*100);
      setAlbumUI(true,`${pct}%`);
      const r=await fetch(mp3s[i],{cache:"no-store",signal:abort.signal});
      if(!r.ok) throw new Error("fetch");
      const ab=await r.arrayBuffer();
      parts.push(new Uint8Array(ab));
      total+=ab.byteLength;
      if(now()-t0>120 && i%1===0) await new Promise(res=>setTimeout(res,0));
    }
    setAlbumUI(true,"100%");
    const merged=new Uint8Array(total);
    let off=0;
    for(const p of parts){ merged.set(p,off); off+=p.byteLength; }
    const blob=new Blob([merged],{type:"audio/mpeg"});
    const name=safeTitle(`${state.albumTitle||"Deus ex CT"} - Album`).slice(0,180)||"Deus ex CT - Album";
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`${name}.mp3`;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500);
    toast("Album-Download gestartet");
  }catch{
    toast("Album-Download fehlgeschlagen");
  }finally{
    setAlbumUI(false);
  }
};

const bindUI=()=>{
  ui.listBtn.addEventListener("click",openSheet);
  ui.sheetClose.addEventListener("click",closeSheet);
  ui.sheetBackdrop.addEventListener("click",closeSheet);

  ui.modeToggle.addEventListener("click",()=>setMode(state.mode==="audio"?"video":"audio"));
  ui.lyricsToggle.addEventListener("click",()=>{ state.lyricsOn=!state.lyricsOn; setLyricsUI(); saveState(); });
  ui.lyricsSize.addEventListener("click",()=>{ state.lyricsSize=(state.lyricsSize+1)%3; setLyricsUI(); saveState(); });

  ui.shuffleBtn.addEventListener("click",()=>{ state.shuffle=!state.shuffle; setShuffleUI(); saveState(); });
  ui.repeatBtn.addEventListener("click",()=>{ state.repeat=(state.repeat+1)%3; setRepeatUI(); saveState(); });
  ui.prevBtn.addEventListener("click",()=>goPrev(true));
  ui.nextBtn.addEventListener("click",()=>goNext(true));
  ui.playBtn.addEventListener("click",()=>playPause(null));
  ui.shareBtn.addEventListener("click",copyLink);
  ui.albumBtn.addEventListener("click",albumDownload);
  ui.cacheBtn.addEventListener("click",toggleOffline);

  ui.muteBtn.addEventListener("click",toggleMute);
  ui.vol.addEventListener("input",(e)=>setVolume(parseFloat(e.target.value)||0));

  ui.seek.addEventListener("input",(e)=>{
    state.seeking=true;
    const v=parseFloat(e.target.value)||0;
    ui.curTime.textContent=fmtTime(v);
  });
  ui.seek.addEventListener("change",(e)=>{
    const v=parseFloat(e.target.value)||0;
    seekTo(v);
    state.seeking=false;
  });

  document.addEventListener("keydown",(e)=>{
    const tag=(e.target && e.target.tagName)||"";
    const block=tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT";
    if(block) return;
    if(e.code==="Space"){ e.preventDefault(); playPause(null); }
    if(e.code==="ArrowRight"){ e.preventDefault(); seekTo((media.el?.currentTime||0)+5); }
    if(e.code==="ArrowLeft"){ e.preventDefault(); seekTo((media.el?.currentTime||0)-5); }
    if(e.code==="KeyN"){ e.preventDefault(); goNext(true); }
    if(e.code==="KeyP"){ e.preventDefault(); goPrev(true); }
    if(e.code==="KeyL"){ e.preventDefault(); state.lyricsOn=!state.lyricsOn; setLyricsUI(); saveState(); }
  });
};

const bindMedia=()=>{
  const onLoaded=()=>{
    const el=media.el;
    if(!el) return;
    ui.seek.max=String(isFinite(el.duration)?el.duration:0);
    ui.durTime.textContent=fmtTime(el.duration);
  };
  const onTime=()=>{
    const el=media.el;
    if(!el || state.seeking) return;
    ui.seek.value=String(el.currentTime||0);
    ui.curTime.textContent=fmtTime(el.currentTime||0);
  };
  const onPlay=()=>{ state.playing=true; setPlayUI(); };
  const onPause=()=>{ state.playing=false; setPlayUI(); };
  const onEnd=async()=>{
    if(state.repeat===2){
      seekTo(0);
      await playPause(true);
      return;
    }
    const ni=nextIndex();
    if(ni===state.idx && state.repeat===0 && !state.shuffle){
      await playPause(false);
      return;
    }
    await selectTrack(ni,true);
    await playPause(true);
  };

  const a=media.audio,v=media.video;
  for(const el of [a,v]){
    el.addEventListener("loadedmetadata",onLoaded);
    el.addEventListener("timeupdate",onTime);
    el.addEventListener("play",onPlay);
    el.addEventListener("pause",onPause);
    el.addEventListener("ended",onEnd);
    el.addEventListener("durationchange",onLoaded);
  }
};

const loadCatalog=async()=>{
  try{
    const r=await fetch("./catalog.json",{cache:"no-store"});
    if(!r.ok) throw new Error("catalog");
    const data=await r.json();
    const album=(data&&data.album)||{};
    const tracks=Array.isArray(data&&data.tracks)?data.tracks:[];
    state.catalog=data;
    state.albumTitle=safeTitle(album.title||"Deus ex CT")||"Deus ex CT";
    state.albumCover=esc(album.cover||FALLBACK_COVER)||FALLBACK_COVER;
    state.tracks=tracks.map((t,i)=>{
      const id=/^\d{2}$/.test(String(t.id))?String(t.id):pad2(i+1);
      return {
        id,
        title:safeTitle(t.title||`Track ${id}`)||`Track ${id}`,
        cover:esc(t.cover||state.albumCover||FALLBACK_COVER),
        mp3:esc(t.mp3||""),
        lrc:esc(t.lrc||""),
        video:esc(t.video||"")
      };
    });
    if(ui.sheetH1) ui.sheetH1.textContent="Playlist";
    if(ui.sheetH2) ui.sheetH2.textContent="Track antippen · Downloads rechts";
  }catch{
    state.albumTitle="Deus ex CT";
    state.albumCover=FALLBACK_COVER;
    state.tracks=Array.from({length:12},(_,i)=>({
      id:pad2(i+1),
      title:`Track ${pad2(i+1)}`,
      cover:FALLBACK_COVER,
      mp3:"",
      lrc:"",
      video:""
    }));
  }
  setImgFallback(ui.brandCoverImg);
  setImgFallback(ui.nowCover);
};

const applyFromURL=()=>{
  const id=parseTrackParam(qp("track"));
  const mode=(qp("mode")==="video")?"video":"audio";
  state.mode=mode;
  if(id){
    const i=idxById(id);
    if(i>=0) state.idx=i;
  }
};

const applyAlbumDownloadParam=()=>{
  const a=qp("album");
  if(String(a||"")==="1"){
    url.searchParams.delete("album");
    history.replaceState(null,"",url.toString());
    setTimeout(()=>albumDownload(),200);
  }
};

const boot=async()=>{
  loadState();
  await loadCatalog();
  applyFromURL();

  state.idx=clamp(state.idx,0,Math.max(0,state.tracks.length-1));
  ui.brandCoverImg.src=state.albumCover||FALLBACK_COVER;
  ui.nowCover.src=(currentTrack() && currentTrack().cover) ? currentTrack().cover : (state.albumCover||FALLBACK_COVER);
  setImgFallback(ui.brandCoverImg);
  setImgFallback(ui.nowCover);

  setModeButton();
  setLyricsUI();
  setShuffleUI();
  setRepeatUI();
  setMuteUI();

  ui.vol.value=String(state.volume);
  setVolume(state.volume);

  buildPlaylist();
  applyMeta();
  updateMediaSession();

  bindUI();
  setMediaElement();
  bindMedia();

  await setSources(0,false);
  startRAF();

  setupSW();

  applyAlbumDownloadParam();
};

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="hidden"){
    saveState();
  }
});

window.addEventListener("beforeunload",()=>{ saveState(); });

boot();
})();
