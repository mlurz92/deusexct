(()=>{"use strict";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const pad2=n=>String(n).padStart(2,"0");
const fmtTime=s=>{
  if(!isFinite(s)||s<0) return "—:—";
  s=Math.floor(s+1e-6);
  const m=Math.floor(s/60),r=s%60;
  return `${m}:${String(r).padStart(2,"0")}`;
};
const ls={
  g:(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:v}catch{return d}},
  s:(k,v)=>{try{localStorage.setItem(k,v)}catch{}}
};
const toastHost=$("#toastHost");
const toast=(msg,ms=2200)=>{
  if(!toastHost) return;
  const el=document.createElement("div");
  el.className="toast";
  el.setAttribute("role","status");
  el.textContent=String(msg||"");
  toastHost.appendChild(el);
  const kill=()=>{try{el.classList.add("out")}catch{};setTimeout(()=>{try{el.remove()}catch{}},220)};
  requestAnimationFrame(()=>{try{el.classList.add("in")}catch{};setTimeout(kill,ms)});
};
const qs=()=>{
  const u=new URL(location.href);
  return u.searchParams;
};
const qsGet=(k)=>{try{return qs().get(k)}catch{return null}};
const qsSet=(obj,replace=true)=>{
  try{
    const u=new URL(location.href);
    for(const [k,v] of Object.entries(obj||{})){
      if(v===null||v===undefined||v==="") u.searchParams.delete(k);
      else u.searchParams.set(k,String(v));
    }
    const next=u.pathname+(u.search?u.search:"")+(u.hash?u.hash:"");
    (replace?history.replaceState:history.pushState).call(history,{}, "", next);
  }catch{}
};
const page=(document.body&&document.body.dataset&&document.body.dataset.page)||"";
if(page!=="player") return;

const TRACKS=[
  {n:1,t:"Oberarzt Dr. med. Placzek",b:"01-Oberarzt_Dr_med_Placzek",c:"01-Oberarzt_Dr_med_Placzek.jpg"},
  {n:2,t:"Oberarzt der Herzen",b:"02-Oberarzt_der_Herzen",c:"02-Oberarzt_der_Herzen.jpg"},
  {n:3,t:"Vier-Eins-Neun-Zwei",b:"03-Vier-Eins-Neun-Zwei",c:"03-Vier-Eins-Neun-Zwei.jpg"},
  {n:4,t:"Pilot im Pixelmeer",b:"04-Pilot_im_Pixelmeer",c:"04-Pilot_im_Pixelmeer.jpg"},
  {n:5,t:"Drei Gebote",b:"05-Drei_Gebote",c:"05-Drei_Gebote.jpg"},
  {n:6,t:"Kunst der Diagnostik",b:"06-Kunst_der_Diagnostik",c:"06-Kunst_der_Diagnostik.jpg"},
  {n:7,t:"Mit harter Hand und Charme",b:"07-Mit_harter_Hand_und_Charme",c:"07-Mit_harter_Hand_und_Charme.jpg"},
  {n:8,t:"Durch Feuer und Eis",b:"08-Durch_Feuer_und_Eis",c:"08-Durch_Feuer_und_Eis.jpg"},
  {n:9,t:"Held und Idol",b:"09-Held_und_Idol",c:"09-Held_und_Idol.jpg"},
  {n:10,t:"Messerscharf und Legendär",b:"10-Messerscharf_und_Legendär",c:"10-Messerscharf_und_Legendär.jpg"},
  {n:11,t:"Oberärztlicher Glanz",b:"11-Oberärztlicher_Glanz",c:"11-Oberärztlicher_Glanz.jpg"},
  {n:12,t:"Götterdämmerung",b:"12-Götterdämmerung",c:"12-Gätterdämmerung.jpg"}
].map(x=>({
  ...x,
  id:pad2(x.n),
  cover:`./Cover/${x.c}`,
  mp3:`./Songs/mp3/${x.b}.mp3`,
  lrc:`./Songs/lrc/${x.b}.lrc`,
  mp4:`./Music_Videos/${x.b}.mp4`
}));

const el={
  boot:$("#boot"),
  brandSub:$("#brandSub"),
  openSongs:$("#openSongs"),
  list:$("#list"),
  songsSheet:$("#songsSheet"),
  songsList:$("#songsList"),
  songsMeta:$("#songsMeta"),
  libraryMeta:$("#libraryMeta"),
  downloadAlbum:$("#downloadAlbum"),
  modeToggle:$("#modeToggle"),
  modeLabel:$("#modeLabel"),
  openSettings:$("#openSettings"),
  settingsSheet:$("#settingsSheet"),
  albumSheet:$("#albumSheet"),
  albumDownload2:$("#albumDownload2"),
  albumProgress:$("#albumProgress"),
  progFill:$("#progFill"),
  progLbl:$("#progLbl"),
  progPct:$("#progPct"),
  albumStatus:$("#albumStatus"),
  setAudio:$("#setAudio"),
  setVideo:$("#setVideo"),
  autoPlay:$("#autoPlay"),
  autoPlayLbl:$("#autoPlayLbl"),
  cacheLbl:$("#cacheLbl"),
  cacheBtn:$("#cacheBtn"),
  art:$("#art"),
  nowTitle:$("#nowTitle"),
  nowSub:$("#nowSub"),
  badgeMode:$("#badgeMode"),
  badgeTrack:$("#badgeTrack"),
  audio:$("#audio"),
  video:$("#video"),
  shuffle:$("#shuffle"),
  prev:$("#prev"),
  play:$("#play"),
  playIcon:$("#playIcon"),
  next:$("#next"),
  repeat:$("#repeat"),
  repeatLabel:$("#repeatLabel"),
  copyLink:$("#copyLink"),
  downloadTrack:$("#downloadTrack"),
  downloadVideo:$("#downloadVideo"),
  downloadLrc:$("#downloadLrc"),
  seek:$("#seek"),
  tCur:$("#tCur"),
  tDur:$("#tDur"),
  vol:$("#vol"),
  jumpBack:$("#jumpBack"),
  jumpFwd:$("#jumpFwd"),
  lyrics:$(".lyrics"),
  lyricsBody:$("#lyricsBody"),
  lyricsSize:$("#lyricsSize"),
  lyricsClose:$("#lyricsClose")
};

const hasGSAP=!!(window.gsap&&window.gsap.to);
const animIn=(node)=>{
  if(!node) return;
  if(hasGSAP){try{window.gsap.fromTo(node,{opacity:0,y:6},{opacity:1,y:0,duration:.18,ease:"power2.out"})}catch{}}
  else{node.style.opacity="0";node.style.transform="translateY(6px)";requestAnimationFrame(()=>{node.style.transition="opacity 180ms ease, transform 180ms ease";node.style.opacity="1";node.style.transform="translateY(0)";setTimeout(()=>{node.style.transition="";},200)})}
};

const sheets=()=>{
  const map=new Map();
  for(const s of $$(".sheet")) map.set(s.id,s);
  return map;
};
const SHEETS=sheets();
const sheetOpen=id=>{
  const s=SHEETS.get(id);
  if(!s) return;
  s.hidden=false;
  document.body.classList.add("sheetOpen");
  const p=s.querySelector(".sheetPanel");
  if(p) p.focus&&p.focus({preventScroll:true});
};
const sheetClose=id=>{
  const s=SHEETS.get(id);
  if(!s) return;
  s.hidden=true;
  if(!$$(".sheet").some(x=>!x.hidden)) document.body.classList.remove("sheetOpen");
};
const sheetBind=()=>{
  for(const s of $$(".sheet")){
    s.addEventListener("click",e=>{
      const t=e.target;
      if(!t) return;
      const c=t.closest("[data-close]");
      if(c){sheetClose(s.id);return}
      if(t.classList&&t.classList.contains("sheetBackdrop")){sheetClose(s.id);return}
    },{passive:true});
    s.addEventListener("keydown",e=>{
      if(e.key==="Escape"){sheetClose(s.id)}
    });
  }
};
sheetBind();

const state={
  i:0,
  mode:"audio",
  playing:false,
  repeat:ls.g("dexct_repeat","off"),
  shuffle:ls.g("dexct_shuffle","0")==="1",
  autoplay:ls.g("dexct_autoplay","0")==="1",
  vol:clamp(parseFloat(ls.g("dexct_vol","0.9")),0,1),
  lyricsOn:ls.g("dexct_lyrics","1")!=="0",
  lyricsSize:ls.g("dexct_lysize","lg"),
  lrcRaw:"",
  lrcLines:[],
  lrcTimed:[],
  lrcIdx:-1,
  userSeeking:false,
  lastSeekTs:0,
  albumBlobUrl:"",
  albumAbort:null,
  swReady:false,
  cached:false
};

document.body.dataset.mode=state.mode;
document.body.dataset.lyrics=state.lyricsOn?"on":"off";
document.body.dataset.lyricsSize=state.lyricsSize;

if(el.vol) el.vol.value=String(state.vol);
if(el.audio) el.audio.volume=state.vol;
if(el.video) el.video.volume=state.vol;

const setLyricsOn=v=>{
  state.lyricsOn=!!v;
  document.body.dataset.lyrics=state.lyricsOn?"on":"off";
  ls.s("dexct_lyrics",state.lyricsOn?"1":"0");
  if(state.lyricsOn) animIn(el.lyricsBody);
};
const cycleLyricsSize=()=>{
  const order=["sm","md","lg","xl"];
  const cur=state.lyricsSize;
  const ni=(order.indexOf(cur)+1)%order.length;
  state.lyricsSize=order[ni];
  document.body.dataset.lyricsSize=state.lyricsSize;
  ls.s("dexct_lysize",state.lyricsSize);
  toast(`Lyrics: ${state.lyricsSize.toUpperCase()}`,1200);
};

const setAutoplay=v=>{
  state.autoplay=!!v;
  ls.s("dexct_autoplay",state.autoplay?"1":"0");
  if(el.autoPlay) el.autoPlay.checked=state.autoplay;
  if(el.autoPlayLbl) el.autoPlayLbl.textContent=state.autoplay?"An":"Aus";
};

const setShuffle=v=>{
  state.shuffle=!!v;
  ls.s("dexct_shuffle",state.shuffle?"1":"0");
  if(el.shuffle) el.shuffle.classList.toggle("active",state.shuffle);
};

const setRepeat=next=>{
  const order=["off","all","one"];
  if(next){
    state.repeat=next;
  }else{
    const i=order.indexOf(state.repeat);
    state.repeat=order[(i+1+order.length)%order.length];
  }
  ls.s("dexct_repeat",state.repeat);
  if(el.repeatLabel) el.repeatLabel.textContent=state.repeat==="off"?"Off":(state.repeat==="all"?"All":"One");
  if(el.repeat) el.repeat.classList.toggle("active",state.repeat!=="off");
};

setAutoplay(state.autoplay);
setShuffle(state.shuffle);
setRepeat(state.repeat);

const modeLabel=()=>state.mode==="video"?"Video":"Audio";
const setModeUI=()=>{
  if(el.modeLabel) el.modeLabel.textContent=modeLabel();
  if(el.badgeMode) el.badgeMode.textContent=modeLabel();
  document.body.dataset.mode=state.mode;
  if(el.setAudio&&el.setVideo){
    el.setAudio.classList.toggle("active",state.mode==="audio");
    el.setAudio.setAttribute("aria-selected",state.mode==="audio"?"true":"false");
    el.setVideo.classList.toggle("active",state.mode==="video");
    el.setVideo.setAttribute("aria-selected",state.mode==="video"?"true":"false");
  }
};
const curMedia=()=>state.mode==="video"?el.video:el.audio;
const otherMedia=()=>state.mode==="video"?el.audio:el.video;

const setPlayingUI=()=>{
  const p=state.playing;
  if(el.playIcon) el.playIcon.className=`fa-solid ${p?"fa-pause":"fa-play"}`;
  if(el.play) el.play.setAttribute("aria-label",p?"Pause":"Play");
  document.body.classList.toggle("playing",p);
};

const setTrackUI=()=>{
  const tr=TRACKS[state.i];
  if(el.art){el.art.src=tr.cover;el.art.alt=tr.t}
  if(el.nowTitle) el.nowTitle.textContent=tr.t;
  if(el.nowSub) el.nowSub.textContent=`Track ${tr.id} · ${modeLabel()}`;
  if(el.badgeTrack) el.badgeTrack.textContent=`#${tr.id}/${pad2(TRACKS.length)}`;
  document.title=`${tr.t} · Deus ex CT`;
  if(el.libraryMeta) el.libraryMeta.textContent=`Track ${tr.id} · ${tr.t}`;
  if(el.songsMeta) el.songsMeta.textContent=`Track ${tr.id} · ${tr.t}`;
  if(el.brandSub) el.brandSub.textContent=`Player · Track ${tr.id} · ${modeLabel()}`;
  for(const host of [el.list, el.songsList]){
    if(!host) continue;
    for(const btn of $$(".row",host)){
      const idx=parseInt(btn.dataset.i||"-1",10);
      const sel=idx===state.i;
      btn.classList.toggle("active",sel);
      btn.setAttribute("aria-selected",sel?"true":"false");
    }
  }
};

const buildRow=(tr,idx)=>{
  const b=document.createElement("button");
  b.type="button";
  b.className="row";
  b.setAttribute("role","option");
  b.dataset.i=String(idx);
  b.setAttribute("aria-selected","false");
  const a=document.createElement("span");
  a.className="rowArt";
  const img=document.createElement("img");
  img.loading="lazy";
  img.decoding="async";
  img.src=tr.cover;
  img.alt=tr.t;
  img.onerror=()=>{img.onerror=null;img.src="./Cover/00-Albumcover.jpg"};
  a.appendChild(img);
  const txt=document.createElement("span");
  txt.className="rowTxt";
  const t=document.createElement("span");
  t.className="rowTitle";
  t.textContent=`${tr.id} · ${tr.t}`;
  const s=document.createElement("span");
  s.className="rowSub";
  s.textContent="Audio · Video · Lyrics";
  txt.appendChild(t);
  txt.appendChild(s);
  const n=document.createElement("span");
  n.className="rowNum";
  n.textContent=tr.id;
  b.appendChild(a);
  b.appendChild(txt);
  b.appendChild(n);
  b.addEventListener("click",()=>{
    loadTrack(idx,{autoplay:state.autoplay,fromUser:true});
    if(el.songsSheet && !el.songsSheet.hidden) sheetClose("songsSheet");
  });
  return b;
};

const renderLists=()=>{
  const fill=(host)=>{
    if(!host) return;
    host.innerHTML="";
    const frag=document.createDocumentFragment();
    TRACKS.forEach((tr,idx)=>frag.appendChild(buildRow(tr,idx)));
    host.appendChild(frag);
  };
  fill(el.list);
  fill(el.songsList);
};

const fetchText=async(url,signal)=>{
  const r=await fetch(url,{signal});
  if(!r.ok) throw new Error("fetch");
  return await r.text();
};

const parseLrc=(txt)=>{
  const raw=String(txt||"").replace(/\r/g,"");
  const out=[];
  const plain=[];
  for(const line of raw.split("\n")){
    const l=line.trimEnd();
    if(!l.trim()) continue;
    const meta=l.match(/^\[(ti|ar|al|by|offset):(.+)\]$/i);
    if(meta) continue;
    const m=l.match(/^(\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\])+(.*)$/);
    if(m){
      const text=m[5].trim();
      const tags=l.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)||[];
      for(const tag of tags){
        const mm=tag.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/);
        if(!mm) continue;
        const min=parseInt(mm[1],10)||0;
        const sec=parseInt(mm[2],10)||0;
        let ms=0;
        if(mm[3]!==undefined){
          const f=mm[3];
          ms=parseInt(f.padEnd(3,"0").slice(0,3),10)||0;
        }
        const t=(min*60+sec)*1000+ms;
        out.push({t,s:text});
      }
    }else{
      const cleaned=l.replace(/^\[.*?\]/g,"").trim();
      if(cleaned) plain.push(cleaned);
    }
  }
  out.sort((a,b)=>a.t-b.t);
  const ded=[];
  let lastT=-1,lastS="";
  for(const it of out){
    if(it.t===lastT && it.s===lastS) continue;
    ded.push(it);
    lastT=it.t;lastS=it.s;
  }
  return {timed:ded,plain};
};

const buildTimedFromPlain=(plain,durSec)=>{
  const lines=(plain||[]).map(s=>String(s||"").trim()).filter(Boolean);
  const d=isFinite(durSec)&&durSec>0?durSec:0;
  if(!lines.length) return [];
  if(!(d>0)) return lines.map((s,i)=>({t:i*4000,s}));
  const step=(d*1000)/Math.max(1,lines.length);
  return lines.map((s,i)=>({t:Math.floor(i*step),s}));
};

const lyricsSet=(text)=>{
  if(!el.lyricsBody) return;
  const v=String(text||"").trim();
  if(el.lyricsBody.textContent===v) return;
  el.lyricsBody.textContent=v;
  animIn(el.lyricsBody);
};

const lyricsReset=()=>{
  state.lrcRaw="";
  state.lrcLines=[];
  state.lrcTimed=[];
  state.lrcIdx=-1;
  lyricsSet("");
};

const lyricsLoad=async(tr,signal)=>{
  try{
    const t=await fetchText(tr.lrc,signal);
    state.lrcRaw=t;
    const p=parseLrc(t);
    state.lrcLines=p.plain;
    state.lrcTimed=p.timed;
    state.lrcIdx=-1;
    if(!state.lrcTimed.length && state.lrcLines.length){
      const dur=curMedia()?.duration;
      state.lrcTimed=buildTimedFromPlain(state.lrcLines,dur);
    }
  }catch{
    lyricsReset();
  }
};

const lyricsUpdate=()=>{
  if(!state.lyricsOn) return;
  const m=curMedia();
  if(!m) return;
  const t=Math.max(0,(m.currentTime||0)*1000);
  const arr=state.lrcTimed||[];
  if(!arr.length){lyricsSet("");return}
  let lo=0,hi=arr.length-1,ans=0;
  while(lo<=hi){
    const mid=(lo+hi)>>1;
    if(arr[mid].t<=t){ans=mid;lo=mid+1}else hi=mid-1;
  }
  if(ans!==state.lrcIdx){
    state.lrcIdx=ans;
    lyricsSet(arr[ans].s||"");
  }
};

const mediaSetSrc=(m,url)=>{
  if(!m) return;
  try{
    if(m.src!==url) m.src=url;
    m.load&&m.load();
  }catch{}
};

const ensureTimedIfNeeded=()=>{
  const arr=state.lrcTimed||[];
  if(arr.length) return;
  if(state.lrcLines.length){
    const dur=curMedia()?.duration;
    state.lrcTimed=buildTimedFromPlain(state.lrcLines,dur);
    state.lrcIdx=-1;
  }
};

const setMode=(mode,opts={})=>{
  const next=mode==="video"?"video":"audio";
  if(state.mode===next) return;
  const a=curMedia(),b=otherMedia();
  const t=a?(a.currentTime||0):0;
  const wasPlaying=state.playing;
  state.mode=next;
  setModeUI();
  if(next==="video"){
    if(el.video) el.video.style.display="";
    if(el.audio) el.audio.pause&&el.audio.pause();
  }else{
    if(el.video) el.video.pause&&el.video.pause();
  }
  const m=curMedia();
  if(m){
    try{m.currentTime=t}catch{}
    if(wasPlaying){
      const p=m.play&&m.play();
      if(p&&p.catch) p.catch(()=>{});
    }
  }
  ensureTimedIfNeeded();
  state.lrcIdx=-1;
  lyricsUpdate();
  qsSet({mode:state.mode},true);
  setTrackUI();
  if(opts.toast) toast(`Modus: ${modeLabel()}`,1200);
};

const stopAll=()=>{
  try{el.audio&&el.audio.pause()}catch{}
  try{el.video&&el.video.pause()}catch{}
  state.playing=false;
  setPlayingUI();
};

const play=()=>{
  const m=curMedia();
  if(!m) return;
  const p=m.play&&m.play();
  if(p&&p.catch) p.catch(()=>{toast("Play blockiert (Tippen zum Start)",1700)});
};

const pause=()=>{
  const m=curMedia();
  if(!m) return;
  try{m.pause&&m.pause()}catch{}
};

const selectTrackFromParam=()=>{
  const trp=qsGet("track");
  if(trp){
    const n=parseInt(String(trp).replace(/\D/g,""),10);
    if(isFinite(n)&&n>=1&&n<=TRACKS.length) return n-1;
  }
  return parseInt(ls.g("dexct_last","0"),10)||0;
};

const albumOpenIfParam=()=>{
  const a=qsGet("album");
  if(a==="1"){
    sheetOpen("albumSheet");
  }
};

const updateLinkToClipboard=async()=>{
  const tr=TRACKS[state.i];
  const u=new URL(location.href);
  u.searchParams.set("track",tr.id);
  u.searchParams.set("mode",state.mode);
  u.searchParams.delete("album");
  u.hash="";
  const s=u.pathname+u.search;
  try{
    await navigator.clipboard.writeText(location.origin+s);
    toast("Link kopiert",1400);
  }catch{
    try{
      const ta=document.createElement("textarea");
      ta.value=location.origin+s;
      ta.style.position="fixed";
      ta.style.left="-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast("Link kopiert",1400);
    }catch{
      toast(location.origin+s,2600);
    }
  }
};

const downloadUrl=(url,filename)=>{
  try{
    const a=document.createElement("a");
    a.href=url;
    if(filename) a.download=filename;
    a.rel="noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }catch{}
};

const safeName=(s)=>String(s||"").replace(/[\\/:*?"<>|]+/g,"-").replace(/\s+/g," ").trim();
const downloadTrack=()=>{
  const tr=TRACKS[state.i];
  downloadUrl(tr.mp3,`${tr.id}-${safeName(tr.t)}.mp3`);
};
const downloadVideo=()=>{
  const tr=TRACKS[state.i];
  downloadUrl(tr.mp4,`${tr.id}-${safeName(tr.t)}.mp4`);
};
const downloadLrc=()=>{
  const tr=TRACKS[state.i];
  downloadUrl(tr.lrc,`${tr.id}-${safeName(tr.t)}.lrc`);
};

const setAlbumProgress=(active,pct,label)=>{
  if(el.albumProgress) el.albumProgress.hidden=!active;
  if(el.progFill) el.progFill.style.width=`${Math.round(clamp(pct||0,0,1)*100)}%`;
  if(el.progLbl) el.progLbl.textContent=label||"";
  if(el.progPct) el.progPct.textContent=`${Math.round(clamp(pct||0,0,1)*100)}%`;
};

const abortAlbum=()=>{
  try{state.albumAbort&&state.albumAbort.abort()}catch{}
  state.albumAbort=null;
};

const buildAlbumMp3=async()=>{
  abortAlbum();
  if(state.albumBlobUrl){
    try{downloadUrl(state.albumBlobUrl,"Deus_ex_CT.mp3")}catch{}
    return;
  }
  const ctrl=new AbortController();
  state.albumAbort=ctrl;
  const sig=ctrl.signal;
  sheetOpen("albumSheet");
  if(el.albumStatus) el.albumStatus.textContent="Erstelle Album MP3…";
  setAlbumProgress(true,0,"Starte…");
  const parts=[];
  let done=0,total=TRACKS.length;
  let totalBytes=0;
  try{
    for(const tr of TRACKS){
      if(sig.aborted) throw new Error("aborted");
      done++;
      setAlbumProgress(true,(done-1)/total,`Lade ${tr.id}/${pad2(total)}…`);
      const r=await fetch(tr.mp3,{signal:sig});
      if(!r.ok) throw new Error("fetch");
      const b=await r.arrayBuffer();
      totalBytes+=b.byteLength;
      parts.push(b);
      setAlbumProgress(true,done/total,`Verarbeite ${tr.id}/${pad2(total)}…`);
      await new Promise(res=>setTimeout(res,14));
    }
    if(sig.aborted) throw new Error("aborted");
    setAlbumProgress(true,1,"Finalisiere…");
    const blob=new Blob(parts,{type:"audio/mpeg"});
    if(blob.size<128){
      throw new Error("empty");
    }
    if(blob.size>1100*1024*1024){
      toast("Album sehr groß – ggf. nicht unterstützbar",2400);
    }
    state.albumBlobUrl=URL.createObjectURL(blob);
    if(el.albumStatus) el.albumStatus.textContent=`Fertig · ${Math.round(blob.size/1024/1024)} MB`;
    setAlbumProgress(false,1,"");
    downloadUrl(state.albumBlobUrl,"Deus_ex_CT.mp3");
  }catch(e){
    setAlbumProgress(false,0,"");
    if(sig.aborted){
      if(el.albumStatus) el.albumStatus.textContent="Abgebrochen";
      toast("Abgebrochen",1400);
    }else{
      if(el.albumStatus) el.albumStatus.textContent="Fehler beim Erstellen";
      toast("Album Download fehlgeschlagen",2200);
    }
  }finally{
    state.albumAbort=null;
  }
};

const updateDurUI=()=>{
  const m=curMedia();
  if(!m) return;
  if(el.tCur) el.tCur.textContent=fmtTime(m.currentTime||0);
  if(el.tDur) el.tDur.textContent=fmtTime(m.duration||NaN);
};

const updateSeekUI=()=>{
  const m=curMedia();
  if(!m||!el.seek||state.userSeeking) return;
  const d=m.duration;
  if(!isFinite(d)||d<=0){el.seek.value="0";return}
  const v=Math.round(((m.currentTime||0)/d)*1000);
  el.seek.value=String(clamp(v,0,1000));
};

const applyVolume=v=>{
  const val=clamp(parseFloat(v),0,1);
  state.vol=val;
  ls.s("dexct_vol",String(val));
  if(el.audio) el.audio.volume=val;
  if(el.video) el.video.volume=val;
};

const nextIndex=(dir)=>{
  const n=TRACKS.length;
  if(n<=1) return 0;
  if(state.shuffle){
    if(n===2) return 1-state.i;
    let k=state.i;
    for(let tries=0;tries<10 && k===state.i;tries++) k=Math.floor(Math.random()*n);
    if(k===state.i) k=(state.i+1)%n;
    return k;
  }
  return (state.i+(dir>=0?1:-1)+n)%n;
};

const loadTrack=async(idx,opts={})=>{
  idx=clamp(parseInt(idx,10)||0,0,TRACKS.length-1);
  const tr=TRACKS[idx];
  state.i=idx;
  ls.s("dexct_last",String(state.i));
  state.lrcIdx=-1;
  lyricsSet("");
  const wantedMode=(qsGet("mode")||opts.mode||state.mode||"audio").toLowerCase();
  if(wantedMode==="video"||wantedMode==="audio") state.mode=wantedMode;
  setModeUI();
  setTrackUI();
  qsSet({track:tr.id,mode:state.mode,album:qsGet("album")==="1"?"1":null},true);

  const mA=el.audio, mV=el.video;
  if(mA){
    mediaSetSrc(mA,tr.mp3);
    mA.preload="metadata";
  }
  if(mV){
    mediaSetSrc(mV,tr.mp4);
    mV.preload="metadata";
    mV.playsInline=true;
  }

  stopAll();
  const m=curMedia();
  if(m){
    try{m.currentTime=0}catch{}
  }
  if(el.video){
    el.video.style.display=state.mode==="video"?"":"none";
  }

  const lrcCtrl=new AbortController();
  const sig=lrcCtrl.signal;
  lyricsReset();
  lyricsLoad(tr,sig).then(()=>{ensureTimedIfNeeded();lyricsUpdate()}).catch(()=>{});
  const onMeta=()=>{
    updateDurUI();
    ensureTimedIfNeeded();
    lyricsUpdate();
  };
  const mNow=curMedia();
  if(mNow){
    mNow.addEventListener("loadedmetadata",onMeta,{once:true});
  }
  if(opts.autoplay){
    setTimeout(()=>{play()},40);
  }else if(opts.fromUser && (location.hash==="#play")){
    setTimeout(()=>{play()},40);
  }
};

const bindMedia=()=>{
  const hook=(m)=>{
    if(!m) return;
    m.addEventListener("play",()=>{state.playing=true;setPlayingUI()});
    m.addEventListener("pause",()=>{state.playing=false;setPlayingUI()});
    m.addEventListener("timeupdate",()=>{
      updateSeekUI();
      updateDurUI();
      if(!state.userSeeking) lyricsUpdate();
    });
    m.addEventListener("durationchange",()=>{
      updateDurUI();
      ensureTimedIfNeeded();
    });
    m.addEventListener("ended",()=>{
      if(state.repeat==="one"){
        try{m.currentTime=0}catch{}
        play();
        return;
      }
      if(state.repeat==="all"){
        loadTrack(nextIndex(1),{autoplay:true,fromUser:false});
        return;
      }
      if(state.shuffle){
        loadTrack(nextIndex(1),{autoplay:true,fromUser:false});
        return;
      }
      if(state.i<TRACKS.length-1){
        loadTrack(state.i+1,{autoplay:true,fromUser:false});
      }else{
        stopAll();
      }
    });
    m.addEventListener("error",()=>{toast("Media Fehler",2000)});
  };
  hook(el.audio);
  hook(el.video);
};
bindMedia();

const bindUI=()=>{
  if(el.openSongs) el.openSongs.addEventListener("click",()=>{
    sheetOpen("songsSheet");
  });

  if(el.play) el.play.addEventListener("click",()=>{
    if(state.playing) pause(); else play();
  });

  if(el.prev) el.prev.addEventListener("click",()=>{
    loadTrack(nextIndex(-1),{autoplay:state.playing||state.autoplay,fromUser:true});
  });
  if(el.next) el.next.addEventListener("click",()=>{
    loadTrack(nextIndex(1),{autoplay:state.playing||state.autoplay,fromUser:true});
  });

  if(el.shuffle) el.shuffle.addEventListener("click",()=>{
    setShuffle(!state.shuffle);
    toast(state.shuffle?"Shuffle an":"Shuffle aus",1200);
  });

  if(el.repeat) el.repeat.addEventListener("click",()=>{
    setRepeat();
    toast(`Repeat: ${state.repeat.toUpperCase()}`,1200);
  });

  if(el.modeToggle) el.modeToggle.addEventListener("click",()=>{
    setMode(state.mode==="audio"?"video":"audio",{toast:true});
  });

  if(el.openSettings) el.openSettings.addEventListener("click",()=>{
    sheetOpen("settingsSheet");
  });

  if(el.setAudio) el.setAudio.addEventListener("click",()=>setMode("audio",{toast:true}));
  if(el.setVideo) el.setVideo.addEventListener("click",()=>setMode("video",{toast:true}));

  if(el.autoPlay) el.autoPlay.addEventListener("change",()=>setAutoplay(!!el.autoPlay.checked));

  if(el.seek){
    el.seek.addEventListener("pointerdown",()=>{state.userSeeking=true;state.lastSeekTs=Date.now()},{passive:true});
    el.seek.addEventListener("pointerup",()=>{state.userSeeking=false;state.lastSeekTs=Date.now()},{passive:true});
    el.seek.addEventListener("input",()=>{
      const m=curMedia();
      const d=m?m.duration:NaN;
      if(!m||!isFinite(d)||d<=0) return;
      const v=clamp(parseInt(el.seek.value,10)||0,0,1000)/1000;
      const t=d*v;
      try{m.currentTime=t}catch{}
      if(Date.now()-state.lastSeekTs>90) lyricsUpdate();
    });
    el.seek.addEventListener("change",()=>{
      state.userSeeking=false;
      lyricsUpdate();
    });
  }

  if(el.vol) el.vol.addEventListener("input",()=>applyVolume(el.vol.value));

  if(el.jumpBack) el.jumpBack.addEventListener("click",()=>{
    const m=curMedia(); if(!m) return;
    try{m.currentTime=Math.max(0,(m.currentTime||0)-10)}catch{}
    lyricsUpdate();
  });
  if(el.jumpFwd) el.jumpFwd.addEventListener("click",()=>{
    const m=curMedia(); if(!m) return;
    try{m.currentTime=Math.min((m.duration||1e12),(m.currentTime||0)+10)}catch{}
    lyricsUpdate();
  });

  if(el.copyLink) el.copyLink.addEventListener("click",()=>{updateLinkToClipboard()});
  if(el.downloadTrack) el.downloadTrack.addEventListener("click",()=>downloadTrack());
  if(el.downloadVideo) el.downloadVideo.addEventListener("click",()=>downloadVideo());
  if(el.downloadLrc) el.downloadLrc.addEventListener("click",()=>downloadLrc());

  if(el.lyricsClose) el.lyricsClose.addEventListener("click",()=>{
    setLyricsOn(!state.lyricsOn);
    toast(state.lyricsOn?"Lyrics an":"Lyrics aus",1200);
  });
  if(el.lyricsSize) el.lyricsSize.addEventListener("click",()=>cycleLyricsSize());

  if(el.downloadAlbum) el.downloadAlbum.addEventListener("click",()=>buildAlbumMp3());
  if(el.albumDownload2) el.albumDownload2.addEventListener("click",()=>buildAlbumMp3());

  if(el.albumSheet) el.albumSheet.addEventListener("click",e=>{
    const t=e.target;
    if(t && (t.matches(".sheetBackdrop")||t.closest("[data-close]"))) abortAlbum();
  });

  window.addEventListener("keydown",e=>{
    const tag=(e.target&&e.target.tagName||"").toLowerCase();
    const typing=tag==="input"||tag==="textarea"||tag==="select"||e.target&&e.target.isContentEditable;
    if(typing) return;
    if(e.code==="Space"){e.preventDefault();state.playing?pause():play();return}
    if(e.key==="ArrowRight"){e.preventDefault();try{const m=curMedia();m&&(m.currentTime=Math.min((m.duration||1e12),(m.currentTime||0)+5))}catch{};lyricsUpdate();return}
    if(e.key==="ArrowLeft"){e.preventDefault();try{const m=curMedia();m&&(m.currentTime=Math.max(0,(m.currentTime||0)-5))}catch{};lyricsUpdate();return}
    if(e.key==="ArrowUp"){e.preventDefault();loadTrack(nextIndex(-1),{autoplay:state.playing,fromUser:true});return}
    if(e.key==="ArrowDown"){e.preventDefault();loadTrack(nextIndex(1),{autoplay:state.playing,fromUser:true});return}
  });
};
bindUI();

const sw={
  reg:null,
  ctrl:null
};

const swPost=async(msg)=>{
  try{
    const r=sw.reg||await navigator.serviceWorker.ready;
    const c=navigator.serviceWorker.controller||r.active||r.waiting||r.installing;
    if(c && c.postMessage) c.postMessage(msg);
  }catch{}
};

const assetsForCache=()=>{
  const core=[
    "./","./index.html","./player.html","./app.css","./app.js","./manifest.webmanifest","./sw.js",
    "./Cover/00-Albumcover.jpg"
  ];
  const media=[];
  for(const tr of TRACKS){
    core.push(tr.cover);
    media.push(tr.mp3,tr.mp4,tr.lrc);
  }
  return Array.from(new Set([...core,...media]));
};

const getCacheFlag=async()=>{
  try{
    if(!("caches" in window)) return false;
    const ks=await caches.keys();
    return ks.some(k=>k.startsWith("dexct_v"));
  }catch{return false}
};

const setCacheUI=()=>{
  if(el.cacheLbl) el.cacheLbl.textContent=state.cached?"Aktiv":"Einrichten";
  if(el.cacheBtn){
    const span=el.cacheBtn.querySelector("span");
    if(span) span.textContent=state.cached?"Löschen":"Cache";
    el.cacheBtn.classList.toggle("danger",state.cached);
  }
};

const bindSW=async()=>{
  if(!("serviceWorker" in navigator)) return;
  try{
    sw.reg=await navigator.serviceWorker.register("./sw.js",{scope:"./"});
    state.cached=await getCacheFlag();
    setCacheUI();
    navigator.serviceWorker.addEventListener("message",e=>{
      const d=e.data||{};
      if(d.type==="CACHE_PROGRESS"){
        const pct=typeof d.pct==="number"?d.pct:0;
        const label=String(d.label||"");
        if(el.cacheLbl) el.cacheLbl.textContent=label||"Caching…";
        setAlbumProgress(true,pct,label||"Caching…");
      }
      if(d.type==="CACHE_DONE"){
        state.cached=!!d.cached;
        setAlbumProgress(false,1,"");
        setCacheUI();
        toast(state.cached?"Offline Cache aktiv":"Offline Cache gelöscht",1700);
      }
    });
  }catch{}
};

if(el.cacheBtn){
  el.cacheBtn.addEventListener("click",async()=>{
    state.cached=await getCacheFlag();
    setCacheUI();
    if(state.cached){
      if(el.cacheLbl) el.cacheLbl.textContent="Lösche…";
      await swPost({type:"CLEAR_CACHE"});
    }else{
      if(el.cacheLbl) el.cacheLbl.textContent="Caching…";
      const urls=assetsForCache();
      await swPost({type:"CACHE_ALL",urls});
      toast("Offline Cache startet…",1400);
    }
  });
}

const init=async()=>{
  renderLists();
  const mode=(qsGet("mode")||"audio").toLowerCase();
  if(mode==="video"||mode==="audio") state.mode=mode;
  setModeUI();
  if(el.video) el.video.style.display=state.mode==="video"?"":"none";
  const i=selectTrackFromParam();
  await loadTrack(i,{autoplay:false,fromUser:false,mode:state.mode});
  albumOpenIfParam();
  bindSW();
  const h=(location.hash||"").toLowerCase();
  if(h==="#play"){
    setTimeout(()=>play(),70);
  }
  if(el.boot){
    const b=el.boot;
    const hide=()=>{
      try{b.classList.add("out")}catch{}
      setTimeout(()=>{try{b.remove()}catch{}},260);
    };
    if(hasGSAP){try{window.gsap.to(b,{opacity:0,duration:.32,ease:"power2.out",onComplete:hide})}catch{hide()}} else {b.style.transition="opacity 320ms ease";b.style.opacity="0";setTimeout(hide,340)}
  }
};
window.addEventListener("popstate",()=>{
  const ni=selectTrackFromParam();
  const mode=(qsGet("mode")||state.mode||"audio").toLowerCase();
  if(mode==="audio"||mode==="video") state.mode=mode;
  setModeUI();
  loadTrack(ni,{autoplay:false,fromUser:false,mode:state.mode});
  albumOpenIfParam();
});
init();
})();
