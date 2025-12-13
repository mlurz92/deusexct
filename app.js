const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const TRACKS=[
  {n:1,slug:"01-Oberarzt_Dr_med_Placzek",cover:"./Cover/01-Oberarzt_Dr_med_Placzek.jpg",mp3:"./Songs/mp3/01-Oberarzt_Dr_med_Placzek.mp3",lrc:"./Songs/lrc/01-Oberarzt_Dr_med_Placzek.lrc",video:"./Music_Videos/01-Oberarzt_Dr_med_Placzek.mp4"},
  {n:2,slug:"02-Oberarzt_der_Herzen",cover:"./Cover/02-Oberarzt_der_Herzen.jpg",mp3:"./Songs/mp3/02-Oberarzt_der_Herzen.mp3",lrc:"./Songs/lrc/02-Oberarzt_der_Herzen.lrc",video:"./Music_Videos/02-Oberarzt_der_Herzen.mp4"},
  {n:3,slug:"03-Vier-Eins-Neun-Zwei",cover:"./Cover/03-Vier-Eins-Neun-Zwei.jpg",mp3:"./Songs/mp3/03-Vier-Eins-Neun-Zwei.mp3",lrc:"./Songs/lrc/03-Vier-Eins-Neun-Zwei.lrc",video:"./Music_Videos/03-Vier-Eins-Neun-Zwei.mp4"},
  {n:4,slug:"04-Pilot_im_Pixelmeer",cover:"./Cover/04-Pilot_im_Pixelmeer.jpg",mp3:"./Songs/mp3/04-Pilot_im_Pixelmeer.mp3",lrc:"./Songs/lrc/04-Pilot_im_Pixelmeer.lrc",video:"./Music_Videos/04-Pilot_im_Pixelmeer.mp4"},
  {n:5,slug:"05-Drei_Gebote",cover:"./Cover/05-Drei_Gebote.jpg",mp3:"./Songs/mp3/05-Drei_Gebote.mp3",lrc:"./Songs/lrc/05-Drei_Gebote.lrc",video:"./Music_Videos/05-Drei_Gebote.mp4"},
  {n:6,slug:"06-Kunst_der_Diagnostik",cover:"./Cover/06-Kunst_der_Diagnostik.jpg",mp3:"./Songs/mp3/06-Kunst_der_Diagnostik.mp3",lrc:"./Songs/lrc/06-Kunst_der_Diagnostik.lrc",video:"./Music_Videos/06-Kunst_der_Diagnostik.mp4"},
  {n:7,slug:"07-Mit_harter_Hand_und_Charme",cover:"./Cover/07-Mit_harter_Hand_und_Charme.jpg",mp3:"./Songs/mp3/07-Mit_harter_Hand_und_Charme.mp3",lrc:"./Songs/lrc/07-Mit_harter_Hand_und_Charme.lrc",video:"./Music_Videos/07-Mit_harter_Hand_und_Charme.mp4"},
  {n:8,slug:"08-Durch_Feuer_und_Eis",cover:"./Cover/08-Durch_Feuer_und_Eis.jpg",mp3:"./Songs/mp3/08-Durch_Feuer_und_Eis.mp3",lrc:"./Songs/lrc/08-Durch_Feuer_und_Eis.lrc",video:"./Music_Videos/08-Durch_Feuer_und_Eis.mp4"},
  {n:9,slug:"09-Held_und_Idol",cover:"./Cover/09-Held_und_Idol.jpg",mp3:"./Songs/mp3/09-Held_und_Idol.mp3",lrc:"./Songs/lrc/09-Held_und_Idol.lrc",video:"./Music_Videos/09-Held_und_Idol.mp4"},
  {n:10,slug:"10-Messerscharf_und_Legendär",cover:"./Cover/10-Messerscharf_und_Legendär.jpg",mp3:"./Songs/mp3/10-Messerscharf_und_Legendär.mp3",lrc:"./Songs/lrc/10-Messerscharf_und_Legendär.lrc",video:"./Music_Videos/10-Messerscharf_und_Legendär.mp4"},
  {n:11,slug:"11-Oberärztlicher_Glanz",cover:"./Cover/11-Oberärztlicher_Glanz.jpg",mp3:"./Songs/mp3/11-Oberärztlicher_Glanz.mp3",lrc:"./Songs/lrc/11-Oberärztlicher_Glanz.lrc",video:"./Music_Videos/11-Oberärztlicher_Glanz.mp4"},
  {n:12,slug:"12-Götterdämmerung",cover:"./Cover/12-Gätterdämmerung.jpg",mp3:"./Songs/mp3/12-Götterdämmerung.mp3",lrc:"./Songs/lrc/12-Götterdämmerung.lrc",video:"./Music_Videos/12-Götterdämmerung.mp4"}
];
const ASSETS=(()=>{
  const core=["./","./index.html","./app.css","./app.js","./manifest.webmanifest","./Cover/00-Albumcover.jpg","./sw.js"];
  const per=TRACKS.flatMap(t=>[t.cover,t.mp3,t.lrc,t.video]);
  return Array.from(new Set(core.concat(per)));
})();
const LS_KEY="dexct_state_v1",LS_CACHE_FLAG="dexct_cache_flag_v1",LS_HOME_SEEN="dexct_home_seen_v1";
const DEF={mode:"audio",lyrics:"on",lyricsSize:"md",autoPlay:false,autoFollow:true,shuffle:false,repeat:0,vol:.9,cur:0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmtTime=s=>{
  if(!isFinite(s)||s<0) return "0:00";
  s=Math.floor(s+1e-9);
  const m=(s/60)|0,ss=s-m*60;
  return `${m}:${ss<10?"0":""}${ss}`;
};
const normTitle=slug=>{
  let x=String(slug||"").replace(/^\d+\-/,"").replace(/_/g," ").trim();
  x=x.replace(/\bDr med\b/gi,"Dr. med.");
  x=x.replace(/\s+/g," ");
  return x;
};
const safeFile=s=>String(s||"").replace(/[\\/:*?"<>|]+/g,"_").trim();
const randInt=n=>Math.floor(Math.random()*n);
const shuffleArr=a=>{
  const x=a.slice();
  for(let i=x.length-1;i>0;i--){
    const j=randInt(i+1);
    [x[i],x[j]]=[x[j],x[i]];
  }
  return x;
};
const loadState=()=>{
  try{
    const v=JSON.parse(localStorage.getItem(LS_KEY)||"null");
    return v&&typeof v==="object"?{...DEF,...v}:{...DEF};
  }catch{return {...DEF}}
};
const ST=loadState();
const saveState=()=>{try{localStorage.setItem(LS_KEY,JSON.stringify(ST))}catch{}};
const sanitize=()=>{
  ST.mode=ST.mode==="video"?"video":"audio";
  ST.lyrics=ST.lyrics==="off"?"off":"on";
  ST.lyricsSize=ST.lyricsSize==="lg"?"lg":"md";
  ST.autoPlay=!!ST.autoPlay;
  ST.autoFollow=ST.autoFollow!==false;
  ST.shuffle=!!ST.shuffle;
  ST.repeat=clamp((ST.repeat|0),0,2);
  ST.vol=clamp(+ST.vol||0.9,0,1);
  ST.cur=clamp((ST.cur|0),0,TRACKS.length-1);
};

const el={
  root:document.documentElement,
  body:document.body,
  list:$("#list"),
  libraryMeta:$("#libraryMeta"),
  search:$("#search"),
  clearSearch:$("#clearSearch"),
  modeToggle:$("#modeToggle"),
  modeLabel:$("#modeLabel"),
  badgeMode:$("#badgeMode"),
  badgeTrack:$("#badgeTrack"),
  nowTitle:$("#nowTitle"),
  nowSub:$("#nowSub"),
  art:$("#art"),
  prev:$("#prev"),
  next:$("#next"),
  play:$("#play"),
  playIcon:$("#playIcon"),
  shuffle:$("#shuffle"),
  repeat:$("#repeat"),
  repeatLabel:$("#repeatLabel"),
  seek:$("#seek"),
  tCur:$("#tCur"),
  tDur:$("#tDur"),
  vol:$("#vol"),
  toggleLyrics:$("#toggleLyrics"),
  lyricsBody:$("#lyricsBody"),
  lyricsClose:$("#lyricsClose"),
  lyricsFollowBtn:$("#lyricsFollow"),
  lyricsSizeBtn:$("#lyricsSize"),
  downloadAlbum:$("#downloadAlbum"),
  downloadTrack:$("#downloadTrack"),
  downloadVideo:$("#downloadVideo"),
  downloadLrc:$("#downloadLrc"),
  openSettings:$("#openSettings"),
  openSettings2:$("#openSettings2"),
  openAlbum:$("#openAlbum"),
  albumSheet:$("#albumSheet"),
  settingsSheet:$("#settingsSheet"),
  albumDownload2:$("#albumDownload2"),
  albumStatus:$("#albumStatus"),
  albumProgress:$("#albumProgress"),
  progLbl:$("#progLbl"),
  progPct:$("#progPct"),
  progFill:$("#progFill"),
  cacheBtn:$("#cacheBtn"),
  cacheLbl:$("#cacheLbl"),
  setAudio:$("#setAudio"),
  setVideo:$("#setVideo"),
  autoPlay:$("#autoPlay"),
  autoPlayLbl:$("#autoPlayLbl"),
  autoFollow:$("#autoFollow"),
  autoFollowLbl:$("#autoFollowLbl"),
  video:$("#video"),
  audio:$("#audio"),
  toastHost:$("#toastHost")
};

let Q={
  order:[],
  pos:0,
  filter:"",
  scrub:false,
  raf:0,
  activeLine:-1,
  lyr:[],
  lyrTimed:false,
  lyrAbort:null,
  lyrUserScrollAt:0,
  focusLineNode:null,
  focusStampNode:null,
  lyrBodyStyle:el.lyricsBody?el.lyricsBody.getAttribute("style")||"":"" ,
  albumUrl:null,
  albumBusy:false,
  albumAbort:null,
  swReg:null,
  swReady:false,
  swCaching:false,
  homeSheet:null,
  songsSheet:null,
  searchSheet:null,
  libMount:null,
  libStyle:null,
  libInSheet:false,
  searchWrap:$(".searchWrap"),
  topActions:$(".topActions"),
  main:$(".main"),
  library:$(".library"),
  mq:matchMedia("(max-width: 980px)"),
  isMobile:false
};

const media=()=>ST.mode==="video"?el.video:el.audio;
const otherMedia=()=>ST.mode==="video"?el.audio:el.video;

const toast=(title,sub,icon="fa-solid fa-circle-info",ms=2400)=>{
  const t=document.createElement("div");
  t.className="toast";
  const row=document.createElement("div");
  row.className="toastRow";
  const ico=document.createElement("div");
  ico.className="toastIco";
  const i=document.createElement("i");
  i.className=icon;
  ico.appendChild(i);
  const txt=document.createElement("div");
  txt.className="toastTxt";
  const tt=document.createElement("div");
  tt.className="toastT";
  tt.textContent=title||"Info";
  const ss=document.createElement("div");
  ss.className="toastS";
  ss.textContent=sub||"";
  txt.appendChild(tt);
  txt.appendChild(ss);
  row.appendChild(ico);
  row.appendChild(txt);
  t.appendChild(row);
  el.toastHost.appendChild(t);
  if(window.gsap){
    gsap.fromTo(t,{opacity:0,y:10},{opacity:1,y:0,duration:.26,ease:"power2.out"});
    gsap.to(t,{opacity:0,y:10,duration:.26,ease:"power2.in",delay:ms/1000,onComplete:()=>t.remove()});
  }else{
    t.style.opacity="1";
    setTimeout(()=>t.remove(),ms);
  }
};

const applyStateToDOM=()=>{
  el.body.dataset.mode=ST.mode;
  el.body.dataset.lyrics=ST.lyrics;
  el.body.dataset.lyricsSize=ST.lyricsSize;
  el.modeLabel.textContent=ST.mode==="video"?"Video":"Audio";
  el.badgeMode.textContent=ST.mode==="video"?"Video":"Audio";
  el.autoPlay.checked=!!ST.autoPlay;
  el.autoPlayLbl.textContent=ST.autoPlay?"An":"Aus";
  el.autoFollow.checked=!!ST.autoFollow;
  el.autoFollowLbl.textContent=ST.autoFollow?"An":"Aus";
  el.vol.value=String(ST.vol);
  el.audio.volume=ST.vol;
  el.video.volume=ST.vol;
  const rep=ST.repeat|0;
  el.repeatLabel.textContent=rep===0?"Off":rep===1?"All":"One";
  el.setAudio.classList.toggle("active",ST.mode==="audio");
  el.setVideo.classList.toggle("active",ST.mode==="video");
  el.shuffle.classList.toggle("active",!!ST.shuffle);
  const cached=localStorage.getItem(LS_CACHE_FLAG)==="1";
  el.cacheLbl.textContent=cached?"Cache leeren":"Einrichten";
};

const buildQueue=()=>{
  const n=TRACKS.length;
  const base=[...Array(n)].map((_,i)=>i);
  if(!ST.shuffle){
    Q.order=base;
    Q.pos=clamp(ST.cur|0,0,n-1);
    return;
  }
  const cur=clamp(ST.cur|0,0,n-1);
  const rest=base.filter(i=>i!==cur);
  Q.order=[cur,...shuffleArr(rest)];
  Q.pos=0;
};

const setQueuePosToTrack=idx=>{
  idx=clamp(idx|0,0,TRACKS.length-1);
  const p=Q.order.indexOf(idx);
  if(p>=0){Q.pos=p;return}
  buildQueue();
  Q.pos=Math.max(0,Q.order.indexOf(idx));
};

const renderList=()=>{
  const q=(Q.filter||"").trim().toLowerCase();
  const frag=document.createDocumentFragment();
  let shown=0;
  const active=clamp(ST.cur|0,0,TRACKS.length-1);
  for(let i=0;i<TRACKS.length;i++){
    const t=TRACKS[i];
    const title=normTitle(t.slug);
    const hay=(String(t.n).padStart(2,"0")+" "+title+" "+t.slug).toLowerCase();
    if(q && !hay.includes(q)) continue;
    shown++;
    const row=document.createElement("div");
    row.className="track"+(i===active?" active":"");
    row.setAttribute("role","option");
    row.setAttribute("aria-selected",i===active?"true":"false");
    row.tabIndex=0;
    row.dataset.idx=String(i);

    const c=document.createElement("div");
    c.className="trackCover";
    const img=document.createElement("img");
    img.src=t.cover;
    img.alt=title;
    img.decoding="async";
    img.loading="lazy";
    c.appendChild(img);

    const meta=document.createElement("div");
    meta.className="trackMeta";
    const tt=document.createElement("div");
    tt.className="trackTitle";
    tt.textContent=title;
    const sub=document.createElement("div");
    sub.className="trackSub";
    sub.textContent=`Track ${String(t.n).padStart(2,"0")}`;
    meta.appendChild(tt);
    meta.appendChild(sub);

    const btns=document.createElement("div");
    btns.className="trackBtns";
    const b1=document.createElement("button");
    b1.className="tMini";
    b1.type="button";
    b1.dataset.act="dlmp3";
    b1.dataset.idx=String(i);
    b1.setAttribute("aria-label","MP3 herunterladen");
    const i1=document.createElement("i");
    i1.className="fa-solid fa-file-arrow-down";
    b1.appendChild(i1);

    const b2=document.createElement("button");
    b2.className="tMini";
    b2.type="button";
    b2.dataset.act="dlmp4";
    b2.dataset.idx=String(i);
    b2.setAttribute("aria-label","Lyrics-Video herunterladen");
    const i2=document.createElement("i");
    i2.className="fa-solid fa-film";
    b2.appendChild(i2);

    btns.appendChild(b1);
    btns.appendChild(b2);

    row.appendChild(c);
    row.appendChild(meta);
    row.appendChild(btns);
    frag.appendChild(row);
  }
  el.list.replaceChildren(frag);
  el.libraryMeta.textContent=q?`${shown} Treffer`:"Alle Songs";
};

const updateNowUI=()=>{
  const idx=clamp(ST.cur|0,0,TRACKS.length-1);
  const t=TRACKS[idx];
  const title=normTitle(t.slug);
  el.nowTitle.textContent=title;
  el.badgeTrack.textContent=`#${String(t.n).padStart(2,"0")}/12`;
  el.nowSub.textContent=ST.mode==="video"?"Lyrics-Video":"Audio";
  el.art.src=t.cover;
  el.art.alt=title;
  $$(".track",el.list).forEach(x=>{
    const i=+(x.dataset.idx||-1);
    const a=i===idx;
    x.classList.toggle("active",a);
    x.setAttribute("aria-selected",a?"true":"false");
  });
};

const parseLRC=txt=>{
  const lines=[];
  const raw=String(txt||"").replace(/\r/g,"").split("\n");
  let timed=false;
  for(const ln of raw){
    const s=ln.trim();
    if(!s) continue;
    if(/^\s*\[(ti|ar|al|by|offset|length):/i.test(s)) continue;
    const tags=[...s.matchAll(/\[(\d{1,3}):(\d{1,2}(?:\.\d{1,3})?)\]/g)];
    if(tags.length){
      timed=true;
      const text=s.replace(/\[(\d{1,3}):(\d{1,2}(?:\.\d{1,3})?)\]/g,"").trim();
      for(const m of tags){
        const mm=+m[1],ss=+m[2];
        const t=mm*60+ss;
        if(isFinite(t)) lines.push({t,txt:text});
      }
    }else{
      lines.push({t:null,txt:s});
    }
  }
  const timedLines=lines.filter(x=>x.t!=null).sort((a,b)=>a.t-b.t);
  const plain=lines.filter(x=>x.t==null);
  return {timed:!!timedLines.length,lines:(timedLines.length?timedLines:plain)};
};

const setLyricsFocusLayout=on=>{
  if(!el.lyricsBody) return;
  if(on){
    el.lyricsBody.style.overflow="hidden";
    el.lyricsBody.style.display="grid";
    el.lyricsBody.style.placeItems="center";
    el.lyricsBody.style.textAlign="center";
    el.lyricsBody.style.padding="22px 18px";
  }else{
    el.lyricsBody.setAttribute("style",Q.lyrBodyStyle||"");
  }
};

const renderLyricsFocus=()=>{
  setLyricsFocusLayout(true);
  const d=document.createElement("div");
  d.className="lLine active";
  const stamp=document.createElement("span");
  stamp.className="lStamp";
  stamp.textContent="";
  const txt=document.createElement("span");
  txt.textContent="";
  d.appendChild(stamp);
  d.appendChild(txt);
  el.lyricsBody.replaceChildren(d);
  Q.focusLineNode=txt;
  Q.focusStampNode=stamp;
};

const renderLyricsFull=(arr,timed)=>{
  setLyricsFocusLayout(false);
  const frag=document.createDocumentFragment();
  for(let i=0;i<arr.length;i++){
    const it=arr[i];
    const d=document.createElement("div");
    d.className="lLine";
    d.dataset.i=String(i);
    if(timed) d.dataset.t=String(it.t||0);
    if(timed){
      const st=document.createElement("span");
      st.className="lStamp";
      st.textContent=fmtTime(it.t||0);
      const sp=document.createElement("span");
      sp.textContent=it.txt||"";
      d.appendChild(st);
      d.appendChild(sp);
    }else d.textContent=it.txt||"";
    frag.appendChild(d);
  }
  el.lyricsBody.replaceChildren(frag);
};

const loadLyrics=async idx=>{
  idx=clamp(idx|0,0,TRACKS.length-1);
  if(Q.lyrAbort) try{Q.lyrAbort.abort()}catch{}
  Q.lyrAbort=new AbortController();
  Q.activeLine=-1;
  Q.lyr=[];
  Q.lyrTimed=false;
  Q.focusLineNode=null;
  Q.focusStampNode=null;
  el.lyricsBody.replaceChildren();
  const t=TRACKS[idx];
  try{
    const r=await fetch(t.lrc,{signal:Q.lyrAbort.signal});
    if(!r.ok) throw new Error("LRC");
    const txt=await r.text();
    const parsed=parseLRC(txt);
    Q.lyr=parsed.lines;
    Q.lyrTimed=parsed.timed;
    if(Q.lyrTimed){
      renderLyricsFocus();
      syncLyrics(0);
    }else{
      renderLyricsFull(Q.lyr,false);
      if(!Q.lyr.length) el.lyricsBody.textContent="Keine Lyrics verfügbar.";
    }
  }catch(e){
    if(e&&e.name==="AbortError") return;
    setLyricsFocusLayout(false);
    el.lyricsBody.textContent="Lyrics konnten nicht geladen werden.";
  }
};

const findActiveLyricIndex=t=>{
  const a=Q.lyr;
  if(!a||!a.length||!Q.lyrTimed||!isFinite(t)) return -1;
  let lo=0,hi=a.length-1,ans=-1;
  while(lo<=hi){
    const mid=(lo+hi)>>1;
    if((a[mid].t||0)<=t){ans=mid;lo=mid+1}else hi=mid-1;
  }
  return ans;
};

const setFocusLine=idx=>{
  const a=Q.lyr;
  if(!Q.focusLineNode||!a||!a.length) return;
  if(idx<0) idx=0;
  idx=clamp(idx,0,a.length-1);
  const it=a[idx];
  Q.focusLineNode.textContent=(it&&it.txt!=null)?String(it.txt):"";
  if(Q.focusStampNode) Q.focusStampNode.textContent=isFinite(it&&it.t)?fmtTime(it.t):"";
};

const syncLyrics=t=>{
  if(ST.lyrics!=="on") return;
  if(!Q.lyrTimed) return;
  const idx=findActiveLyricIndex(t);
  if(idx===Q.activeLine) return;
  Q.activeLine=idx;
  setFocusLine(idx);
};

const updateTimeline=()=>{
  const m=media();
  const dur=isFinite(m.duration)?m.duration:0;
  const cur=isFinite(m.currentTime)?m.currentTime:0;
  el.tCur.textContent=fmtTime(cur);
  el.tDur.textContent=dur?fmtTime(dur):"—:—";
  if(!Q.scrub && dur>0) el.seek.value=String(Math.round(clamp(cur/dur,0,1)*1000));
  syncLyrics(cur);
};

const stopRAF=()=>{if(Q.raf){cancelAnimationFrame(Q.raf);Q.raf=0}};
const startRAF=()=>{
  if(Q.raf) return;
  const tick=()=>{updateTimeline();Q.raf=requestAnimationFrame(tick)};
  Q.raf=requestAnimationFrame(tick);
};

const setPlayIcon=playing=>{
  el.playIcon.className=playing?"fa-solid fa-pause":"fa-solid fa-play";
  el.play.setAttribute("aria-label",playing?"Pause":"Play");
};

const pauseAll=()=>{
  try{el.audio.pause()}catch{}
  try{el.video.pause()}catch{}
  setPlayIcon(false);
  stopRAF();
};

const play=async()=>{
  const m=media();
  try{
    await m.play();
    setPlayIcon(true);
    startRAF();
  }catch{
    toast("Play blockiert","Tippe erneut zum Starten","fa-solid fa-hand-pointer");
  }
};

const togglePlay=()=>{
  const m=media();
  if(m.paused||m.ended) play();
  else{
    try{m.pause()}catch{}
    setPlayIcon(false);
    stopRAF();
  }
};

const seekTo=(sec,keepPlay)=>{
  const m=media();
  const dur=isFinite(m.duration)?m.duration:0;
  sec=dur?clamp(sec,0,Math.max(0,dur-0.001)):clamp(sec,0,1e9);
  const was=!m.paused && !m.ended;
  try{m.currentTime=sec}catch{}
  updateTimeline();
  if(keepPlay || was) play();
};

const loadTrackSources=(idx,{keepTime=false,autoplay=false}={})=>{
  idx=clamp(idx|0,0,TRACKS.length-1);
  const t=TRACKS[idx];
  const oldM=media();
  const oldTime=isFinite(oldM.currentTime)?oldM.currentTime:0;
  const wasPlaying=!oldM.paused && !oldM.ended;
  pauseAll();
  if(ST.mode==="audio"){
    el.audio.src=t.mp3;
    el.video.removeAttribute("src");
    el.video.load();
  }else{
    el.video.src=t.video;
    el.audio.removeAttribute("src");
    el.audio.load();
  }
  const m=media();
  m.load();
  const onMeta=()=>{
    m.removeEventListener("loadedmetadata",onMeta);
    if(keepTime && isFinite(oldTime) && oldTime>0 && isFinite(m.duration) && oldTime<m.duration) try{m.currentTime=oldTime}catch{}
    updateTimeline();
    if(autoplay || (keepTime && wasPlaying)) play();
  };
  m.addEventListener("loadedmetadata",onMeta,{once:true});
};

const setTrack=(idx,{autoplay=false,keepTime=false}={})=>{
  idx=clamp(idx|0,0,TRACKS.length-1);
  ST.cur=idx;
  saveState();
  setQueuePosToTrack(idx);
  updateNowUI();
  if(ST.lyrics==="on") loadLyrics(idx);
  loadTrackSources(idx,{keepTime,autoplay});
};

const nextTrack=()=>{
  const rep=ST.repeat|0;
  if(rep===2){seekTo(0,true);return}
  if(ST.shuffle){
    if(Q.order.length!==TRACKS.length) buildQueue();
    Q.pos=Q.pos<Q.order.length-1?Q.pos+1:0;
    setTrack(Q.order[Q.pos]??0,{autoplay:true});
    return;
  }
  const n=TRACKS.length;
  let idx=(ST.cur|0)+1;
  if(idx>=n){
    if(rep===1) idx=0;
    else{pauseAll();seekTo(0,false);toast("Ende","Playlist beendet","fa-solid fa-flag-checkered");return}
  }
  setTrack(idx,{autoplay:true});
};

const prevTrack=()=>{
  const m=media();
  const cur=isFinite(m.currentTime)?m.currentTime:0;
  if(cur>3){seekTo(0,true);return}
  if(ST.shuffle){
    if(Q.order.length!==TRACKS.length) buildQueue();
    Q.pos=Q.pos>0?Q.pos-1:Q.order.length-1;
    setTrack(Q.order[Q.pos]??0,{autoplay:true});
    return;
  }
  const n=TRACKS.length;
  let idx=(ST.cur|0)-1;
  if(idx<0) idx=((ST.repeat|0)===1)?n-1:0;
  setTrack(idx,{autoplay:true});
};

const setMode=mode=>{
  mode=mode==="video"?"video":"audio";
  if(ST.mode===mode) return;
  const old=media();
  const oldTime=isFinite(old.currentTime)?old.currentTime:0;
  const wasPlaying=!old.paused && !old.ended;
  ST.mode=mode;
  saveState();
  applyStateToDOM();
  updateNowUI();
  const idx=clamp(ST.cur|0,0,TRACKS.length-1);
  if(mode==="audio"){
    el.audio.src=TRACKS[idx].mp3;
    el.video.removeAttribute("src");
    el.video.load();
  }else{
    el.video.src=TRACKS[idx].video;
    el.audio.removeAttribute("src");
    el.audio.load();
  }
  const m=media();
  m.load();
  const onMeta=()=>{
    m.removeEventListener("loadedmetadata",onMeta);
    if(isFinite(oldTime)&&oldTime>0&&isFinite(m.duration)&&oldTime<m.duration) try{m.currentTime=oldTime}catch{}
    updateTimeline();
    if(wasPlaying) play();
  };
  m.addEventListener("loadedmetadata",onMeta,{once:true});
  if(window.gsap) gsap.fromTo(el.art,{scale:1.02},{scale:1,duration:.5,ease:"power2.out"});
};

const toggleShuffle=()=>{
  ST.shuffle=!ST.shuffle;
  saveState();
  buildQueue();
  setQueuePosToTrack(ST.cur|0);
  applyStateToDOM();
  toast(ST.shuffle?"Shuffle an":"Shuffle aus",ST.shuffle?"Zufällige Reihenfolge":"Normale Reihenfolge",ST.shuffle?"fa-solid fa-shuffle":"fa-solid fa-list");
};

const cycleRepeat=()=>{
  ST.repeat=((ST.repeat|0)+1)%3;
  saveState();
  applyStateToDOM();
  const rep=ST.repeat|0;
  toast(rep===0?"Repeat aus":rep===1?"Repeat all":"Repeat one",rep===0?"":rep===1?"Playlist loop":"Track loop",rep===0?"fa-solid fa-ban":rep===1?"fa-solid fa-repeat":"fa-solid fa-repeat-1");
};

const setLyricsOn=on=>{
  ST.lyrics=on?"on":"off";
  saveState();
  applyStateToDOM();
  if(on){loadLyrics(ST.cur|0);toast("Lyrics","Ein","fa-regular fa-closed-captioning")}
  else toast("Lyrics","Aus","fa-regular fa-closed-captioning");
};

const toggleLyricsSize=()=>{
  ST.lyricsSize=ST.lyricsSize==="lg"?"md":"lg";
  saveState();
  applyStateToDOM();
  toast("Textgröße",ST.lyricsSize==="lg"?"Groß":"Normal","fa-solid fa-text-height");
};

const setAutoFollow=on=>{
  ST.autoFollow=!!on;
  saveState();
  applyStateToDOM();
  toast("Auto-Follow",ST.autoFollow?"An":"Aus","fa-solid fa-location-crosshairs");
};

const openSheet=sheet=>{
  if(!sheet) return;
  sheet.hidden=false;
  const back=$(".sheetBackdrop",sheet);
  const panel=$(".sheetPanel",sheet);
  if(window.gsap){
    gsap.killTweensOf([back,panel]);
    gsap.fromTo(back,{opacity:0},{opacity:1,duration:.22,ease:"power2.out"});
    gsap.fromTo(panel,{opacity:0,y:18},{opacity:1,y:0,duration:.28,ease:"power2.out"});
  }else{
    if(back) back.style.opacity="1";
    if(panel){panel.style.opacity="1";panel.style.transform="translateY(0px)"}
  }
};

const closeSheet=sheet=>{
  if(!sheet || sheet.hidden) return;
  const back=$(".sheetBackdrop",sheet);
  const panel=$(".sheetPanel",sheet);
  if(window.gsap){
    gsap.killTweensOf([back,panel]);
    gsap.to(back,{opacity:0,duration:.18,ease:"power2.in"});
    gsap.to(panel,{opacity:0,y:18,duration:.2,ease:"power2.in",onComplete:()=>{sheet.hidden=true}});
  }else sheet.hidden=true;
};

const closeAnySheet=()=>{
  if(el.settingsSheet && !el.settingsSheet.hidden) closeSheet(el.settingsSheet);
  if(el.albumSheet && !el.albumSheet.hidden) closeSheet(el.albumSheet);
  if(Q.homeSheet && !Q.homeSheet.hidden) closeSheet(Q.homeSheet);
  if(Q.songsSheet && !Q.songsSheet.hidden) closeSheet(Q.songsSheet);
  if(Q.searchSheet && !Q.searchSheet.hidden) closeSheet(Q.searchSheet);
};

const updateAlbumProgress=(on,txt,pct)=>{
  el.albumProgress.hidden=!on;
  if(txt!=null) el.progLbl.textContent=txt;
  if(pct!=null){
    const p=clamp(pct,0,1);
    el.progPct.textContent=`${Math.round(p*100)}%`;
    el.progFill.style.width=`${Math.round(p*100)}%`;
  }
};

const albumName=()=>safeFile("Deus ex CT (Album).mp3");
const trackFileName=(idx,ext)=>{
  const t=TRACKS[clamp(idx|0,0,TRACKS.length-1)];
  return safeFile(`${String(t.n).padStart(2,"0")} - ${normTitle(t.slug)}.${ext}`);
};

const dl=(url,filename)=>{
  const a=document.createElement("a");
  a.href=url;
  a.download=filename||"download";
  a.rel="noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const downloadCurrent=kind=>{
  const idx=clamp(ST.cur|0,0,TRACKS.length-1);
  const t=TRACKS[idx];
  if(kind==="mp3") dl(t.mp3,trackFileName(idx,"mp3"));
  if(kind==="mp4") dl(t.video,trackFileName(idx,"mp4"));
  if(kind==="lrc") dl(t.lrc,trackFileName(idx,"lrc"));
};

const stripID3v2=u=>{
  if(u.byteLength<10) return u;
  if(u[0]!==0x49||u[1]!==0x44||u[2]!==0x33) return u;
  const size=((u[6]&0x7f)<<21)|((u[7]&0x7f)<<14)|((u[8]&0x7f)<<7)|(u[9]&0x7f);
  const off=10+size;
  return off>0 && off<u.byteLength?u.slice(off):u;
};
const stripID3v1=u=>{
  if(u.byteLength<128) return u;
  const off=u.byteLength-128;
  if(u[off]===0x54&&u[off+1]===0x41&&u[off+2]===0x47) return u.slice(0,off);
  return u;
};
const stripTags=u=>stripID3v1(stripID3v2(u));

const buildAlbumMP3=async()=>{
  if(Q.albumBusy) return;
  if(Q.swCaching){toast("Bitte warten","Offline Cache läuft","fa-solid fa-hourglass-half");return}
  Q.albumBusy=true;
  if(Q.albumAbort) try{Q.albumAbort.abort()}catch{}
  Q.albumAbort=new AbortController();
  updateAlbumProgress(true,"Album wird vorbereitet…",0);
  try{
    const parts=[];
    let total=0;
    for(let i=0;i<TRACKS.length;i++){
      updateAlbumProgress(true,`Lade Track ${String(i+1).padStart(2,"0")}/12…`,i/TRACKS.length);
      const r=await fetch(TRACKS[i].mp3,{signal:Q.albumAbort.signal});
      if(!r.ok) throw new Error("MP3");
      const ab=await r.arrayBuffer();
      let p=new Uint8Array(ab);
      p=stripTags(p);
      parts.push(p);
      total+=p.byteLength;
      updateAlbumProgress(true,`Track ${String(i+1).padStart(2,"0")} geladen`,(i+1)/TRACKS.length);
      await new Promise(res=>setTimeout(res,20));
    }
    updateAlbumProgress(true,"Zusammenfügen…",0.98);
    const out=new Uint8Array(total);
    let off=0;
    for(const p of parts){out.set(p,off);off+=p.byteLength}
    const blob=new Blob([out],{type:"audio/mpeg"});
    if(Q.albumUrl) try{URL.revokeObjectURL(Q.albumUrl)}catch{}
    Q.albumUrl=URL.createObjectURL(blob);
    updateAlbumProgress(true,"Fertig",1);
    el.albumStatus.textContent="Album bereit zum Download";
    toast("Album bereit","Download startet","fa-solid fa-download");
    dl(Q.albumUrl,albumName());
  }catch(e){
    if(e&&e.name==="AbortError"){
      toast("Abgebrochen","Album-Erstellung gestoppt","fa-solid fa-ban");
      el.albumStatus.textContent="Abgebrochen";
    }else{
      toast("Fehler","Album-Download fehlgeschlagen","fa-solid fa-triangle-exclamation");
      el.albumStatus.textContent="Album konnte nicht erstellt werden";
    }
  }finally{
    Q.albumBusy=false;
    setTimeout(()=>updateAlbumProgress(false,"",0),1200);
  }
};

const armAutoplayOnce=()=>{
  if(!ST.autoPlay) return;
  const h=()=>{
    window.removeEventListener("pointerdown",h,true);
    window.removeEventListener("keydown",h,true);
    play();
  };
  window.addEventListener("pointerdown",h,true);
  window.addEventListener("keydown",h,true);
};

const initSW=async()=>{
  if(!("serviceWorker" in navigator)) return;
  const ok=location.protocol==="https:" || location.hostname==="localhost" || location.hostname==="127.0.0.1";
  if(!ok) return;
  try{
    const reg=await navigator.serviceWorker.register("./sw.js",{scope:"./"});
    Q.swReg=reg;
    Q.swReady=true;
    navigator.serviceWorker.addEventListener("message",e=>{
      const d=e.data||{};
      if(d.type==="CACHE_PROGRESS"){
        Q.swCaching=!!d.active;
        const pct=isFinite(d.pct)?d.pct:0;
        if(el.settingsSheet && !el.settingsSheet.hidden) el.cacheLbl.textContent=Q.swCaching?"Caching…":(localStorage.getItem(LS_CACHE_FLAG)==="1"?"Cache leeren":"Einrichten");
        if(el.albumSheet && !el.albumSheet.hidden){
          el.albumStatus.textContent=d.label||el.albumStatus.textContent;
          updateAlbumProgress(true,d.label||"Caching…",pct);
        }
      }
      if(d.type==="CACHE_DONE"){
        Q.swCaching=false;
        const on=!!d.cached;
        localStorage.setItem(LS_CACHE_FLAG,on?"1":"0");
        applyStateToDOM();
        if(el.albumSheet && !el.albumSheet.hidden) updateAlbumProgress(false,"",0);
        toast("Offline Cache",on?"Aktiv":"Geleert",on?"fa-solid fa-cloud-check":"fa-solid fa-trash");
        if(el.albumSheet) el.albumStatus.textContent=on?"Offline Cache aktiv":"Offline Cache geleert";
      }
    });
  }catch{}
};

const swPost=async msg=>{
  if(!Q.swReady) return false;
  const ctrl=navigator.serviceWorker.controller;
  if(ctrl){ctrl.postMessage(msg);return true}
  const reg=Q.swReg||await navigator.serviceWorker.getRegistration("./");
  const w=(reg&&reg.active)||navigator.serviceWorker.controller;
  if(w){w.postMessage(msg);return true}
  return false;
};

const toggleCache=async()=>{
  if(Q.swCaching){toast("Cache","Bitte warten…","fa-solid fa-hourglass-half");return}
  const cached=localStorage.getItem(LS_CACHE_FLAG)==="1";
  if(!Q.swReady){toast("Offline Cache","Service Worker nicht verfügbar","fa-solid fa-triangle-exclamation");return}
  if(!cached){
    if(el.albumSheet){openSheet(el.albumSheet);el.albumStatus.textContent="Offline Cache wird aufgebaut…";updateAlbumProgress(true,"Caching…",0)}
    const ok=await swPost({type:"CACHE_ALL",urls:ASSETS});
    if(!ok){updateAlbumProgress(false,"",0);toast("Cache","Konnte nicht starten","fa-solid fa-triangle-exclamation")}
    return;
  }
  const ok=await swPost({type:"CLEAR_CACHE"});
  if(!ok) toast("Cache","Konnte nicht löschen","fa-solid fa-triangle-exclamation");
};

const mkSheet=(id,title,wide)=>{
  const wrap=document.createElement("div");
  wrap.className="sheet";
  wrap.id=id;
  wrap.hidden=true;
  const back=document.createElement("div");
  back.className="sheetBackdrop";
  back.dataset.close="1";
  const panel=document.createElement("div");
  panel.className="sheetPanel"+(wide?" wide":"");
  const top=document.createElement("div");
  top.className="sheetTop";
  const h=document.createElement("div");
  h.className="sheetTitle";
  h.textContent=title||"";
  const x=document.createElement("button");
  x.className="iconBtn";
  x.type="button";
  x.dataset.close="1";
  x.setAttribute("aria-label","Schließen");
  const xi=document.createElement("i");
  xi.className="fa-solid fa-xmark";
  x.appendChild(xi);
  top.appendChild(h);
  top.appendChild(x);
  const body=document.createElement("div");
  body.className="sheetBody";
  panel.appendChild(top);
  panel.appendChild(body);
  wrap.appendChild(back);
  wrap.appendChild(panel);
  wrap.addEventListener("click",e=>{
    const c=e.target&&e.target.closest("[data-close]");
    if(c){
      if(wrap===el.albumSheet && Q.albumBusy && Q.albumAbort) try{Q.albumAbort.abort()}catch{}
      closeSheet(wrap);
    }
  });
  document.body.appendChild(wrap);
  return {wrap,body,panel};
};

const mkActionBtn=(icon,aria,cls)=>{
  const b=document.createElement("button");
  b.className=cls||"iconBtn";
  b.type="button";
  b.setAttribute("aria-label",aria||"");
  const i=document.createElement("i");
  i.className=icon;
  b.appendChild(i);
  return b;
};

const ensureMobileShell=()=>{
  if(!Q.topActions) Q.topActions=$(".topActions");
  if(!Q.searchWrap) Q.searchWrap=$(".searchWrap");
  if(!Q.library) Q.library=$(".library");
  if(!Q.main) Q.main=$(".main");
  if(!Q.topActions) return;
  if(!Q.homeSheet){
    const h=mkSheet("homeSheet","Deus ex CT",true);
    Q.homeSheet=h.wrap;
    const art="./Cover/00-Albumcover.jpg";
    h.body.innerHTML=`<div class="albumBody"><div class="albumGrid"><div class="albumArt"><img src="${art}" alt="Deus ex CT Albumcover" loading="eager" decoding="async"></div><div class="albumText"><div class="albumH">Deus ex CT</div><div class="albumP">Ein Album-Player mit Playlist, Audio/Video-Modus und Karaoke-Lyrics. Mobil fokussiert: Songs & Suche als Sheets, Lyrics als aktuelle Zeile.</div><div class="albumBtns"><button class="miniBtn" type="button" data-home="play"><i class="fa-solid fa-play"></i><span>Play</span></button><button class="miniBtn" type="button" data-home="songs"><i class="fa-solid fa-music"></i><span>Songs</span></button><button class="miniBtn" type="button" data-home="search"><i class="fa-solid fa-magnifying-glass"></i><span>Suche</span></button><button class="miniBtn" type="button" data-home="mode"><i class="fa-solid fa-film"></i><span>Audio/Video</span></button><button class="miniBtn" type="button" data-home="download"><i class="fa-solid fa-download"></i><span>Album</span></button><button class="miniBtn" type="button" data-home="cache"><i class="fa-solid fa-cloud-arrow-down"></i><span>Offline</span></button></div><div class="albumSmall">Tip: Home kannst du jederzeit wieder öffnen.</div></div></div></div>`;
    h.body.addEventListener("click",e=>{
      const a=e.target&&e.target.closest("[data-home]");
      if(!a) return;
      const t=a.dataset.home;
      if(t==="play"){closeSheet(Q.homeSheet);play();}
      if(t==="songs"){closeSheet(Q.homeSheet);openSongs();}
      if(t==="search"){closeSheet(Q.homeSheet);openSearch();}
      if(t==="mode"){setMode(ST.mode==="audio"?"video":"audio");}
      if(t==="download"){closeSheet(Q.homeSheet);if(el.albumSheet){openSheet(el.albumSheet);buildAlbumMP3()}}
      if(t==="cache"){closeSheet(Q.homeSheet);toggleCache();}
      try{localStorage.setItem(LS_HOME_SEEN,"1")}catch{}
    });
  }
  if(!Q.songsSheet){
    const s=mkSheet("songsSheet","Songs",true);
    Q.songsSheet=s.wrap;
    Q.songsSheetBody=s.body;
  }
  if(!Q.searchSheet){
    const s=mkSheet("searchSheet","Suche",true);
    Q.searchSheet=s.wrap;
    Q.searchSheetBody=s.body;
    s.body.innerHTML=`<div class="setRow"><div><div class="setKey">Song suchen</div><div class="setVal">Titel, Track-Nr, Begriff</div></div></div><div class="searchWrap" style="margin:0;border-radius:16px;padding:12px 12px 12px 14px"><i class="fa-solid fa-magnifying-glass"></i><input id="mSearch" class="search" type="search" placeholder="Search…" autocomplete="off" autocapitalize="off" spellcheck="false"><button id="mClear" class="iconBtn" type="button" aria-label="Leeren" style="width:40px;height:40px;border-radius:12px"><i class="fa-solid fa-xmark"></i></button></div><div class="albumSmall" style="margin-top:10px">Ergebnisliste aktualisiert sich sofort.</div>`;
    const inp=$("#mSearch",s.body);
    const clr=$("#mClear",s.body);
    const sync=()=>{
      Q.filter=inp.value||"";
      if(el.search) el.search.value=Q.filter;
      renderList();
      updateNowUI();
    };
    inp.addEventListener("input",sync);
    clr.addEventListener("click",()=>{inp.value="";sync();inp.focus()});
    Q.openSearchFocus=()=>{inp.value=Q.filter||"";setTimeout(()=>inp.focus(),40)};
  }

  if(!Q.btnHome){
    Q.btnHome=mkActionBtn("fa-solid fa-house","Startseite");
    Q.btnSongs=mkActionBtn("fa-solid fa-music","Songs");
    Q.btnSearch=mkActionBtn("fa-solid fa-magnifying-glass","Suche");
    Q.btnHome.addEventListener("click",()=>openHome(true));
    Q.btnSongs.addEventListener("click",openSongs);
    Q.btnSearch.addEventListener("click",openSearch);
    Q.topActions.insertBefore(Q.btnSearch,Q.topActions.firstChild);
    Q.topActions.insertBefore(Q.btnSongs,Q.btnSearch);
    Q.topActions.insertBefore(Q.btnHome,Q.btnSongs);
  }
};

const moveLibraryIntoSongsSheet=()=>{
  if(Q.libInSheet) return;
  if(!Q.library||!Q.main||!Q.songsSheetBody) return;
  if(!Q.libMount){
    Q.libMount=document.createElement("div");
    Q.libMount.style.display="none";
    Q.main.insertBefore(Q.libMount,Q.library);
  }
  Q.libStyle=Q.library.getAttribute("style")||"";
  Q.library.style.boxShadow="none";
  Q.library.style.border="0";
  Q.library.style.borderRadius="0";
  Q.library.style.background="transparent";
  Q.library.style.overflow="hidden";
  Q.library.style.height="auto";
  Q.library.style.minHeight="0";
  Q.songsSheetBody.appendChild(Q.library);
  Q.libInSheet=true;
};

const restoreLibraryToMain=()=>{
  if(!Q.libInSheet) return;
  if(!Q.library||!Q.main||!Q.libMount) return;
  Q.main.insertBefore(Q.library,Q.libMount);
  Q.library.setAttribute("style",Q.libStyle||"");
  Q.libInSheet=false;
};

const applyMobileVisibility=()=>{
  Q.isMobile=!!Q.mq.matches;
  if(Q.isMobile){
    ensureMobileShell();
    moveLibraryIntoSongsSheet();
    if(Q.searchWrap) Q.searchWrap.style.display="none";
    if(el.lyricsFollowBtn) el.lyricsFollowBtn.style.display="none";
  }else{
    if(Q.searchWrap) Q.searchWrap.style.display="";
    if(el.lyricsFollowBtn) el.lyricsFollowBtn.style.display="";
    restoreLibraryToMain();
  }
};

const openHome=(force)=>{
  ensureMobileShell();
  const seen=(()=>{try{return localStorage.getItem(LS_HOME_SEEN)==="1"}catch{return false}})();
  if(!seen || force){
    openSheet(Q.homeSheet);
    if(!seen) try{localStorage.setItem(LS_HOME_SEEN,"1")}catch{}
  }
};

const openSongs=()=>{
  ensureMobileShell();
  applyMobileVisibility();
  openSheet(Q.songsSheet);
};

const openSearch=()=>{
  ensureMobileShell();
  applyMobileVisibility();
  openSheet(Q.searchSheet);
  if(Q.openSearchFocus) Q.openSearchFocus();
};

const bindUI=()=>{
  if(el.clearSearch) el.clearSearch.addEventListener("click",()=>{if(el.search){el.search.value="";Q.filter="";renderList();updateNowUI();el.search.focus()}});
  if(el.search) el.search.addEventListener("input",()=>{Q.filter=el.search.value||"";renderList();updateNowUI()});

  el.list.addEventListener("click",e=>{
    const act=e.target&&e.target.closest("[data-act]");
    if(act){
      e.preventDefault();
      e.stopPropagation();
      const idx=+(act.dataset.idx||-1);
      if(act.dataset.act==="dlmp3") dl(TRACKS[clamp(idx,0,TRACKS.length-1)].mp3,trackFileName(idx,"mp3"));
      if(act.dataset.act==="dlmp4") dl(TRACKS[clamp(idx,0,TRACKS.length-1)].video,trackFileName(idx,"mp4"));
      return;
    }
    const row=e.target&&e.target.closest(".track");
    if(!row) return;
    const idx=+(row.dataset.idx||-1);
    if(idx>=0){
      setTrack(idx,{autoplay:true});
      if(Q.isMobile && Q.songsSheet && !Q.songsSheet.hidden) closeSheet(Q.songsSheet);
    }
  });

  el.list.addEventListener("keydown",e=>{
    const row=e.target&&e.target.closest(".track");
    if(!row) return;
    if(e.key==="Enter"||e.key===" "){
      e.preventDefault();
      const idx=+(row.dataset.idx||-1);
      if(idx>=0){
        setTrack(idx,{autoplay:true});
        if(Q.isMobile && Q.songsSheet && !Q.songsSheet.hidden) closeSheet(Q.songsSheet);
      }
    }
  });

  el.play.addEventListener("click",togglePlay);
  el.next.addEventListener("click",nextTrack);
  el.prev.addEventListener("click",prevTrack);
  el.shuffle.addEventListener("click",toggleShuffle);
  el.repeat.addEventListener("click",cycleRepeat);

  el.modeToggle.addEventListener("click",()=>setMode(ST.mode==="audio"?"video":"audio"));
  el.setAudio.addEventListener("click",()=>setMode("audio"));
  el.setVideo.addEventListener("click",()=>setMode("video"));

  el.vol.addEventListener("input",()=>{
    ST.vol=clamp(parseFloat(el.vol.value||"0.9"),0,1);
    el.audio.volume=ST.vol;
    el.video.volume=ST.vol;
    saveState();
  });

  el.seek.addEventListener("pointerdown",()=>{Q.scrub=true});
  el.seek.addEventListener("pointerup",()=>{Q.scrub=false});
  el.seek.addEventListener("touchstart",()=>{Q.scrub=true},{passive:true});
  el.seek.addEventListener("touchend",()=>{Q.scrub=false},{passive:true});
  el.seek.addEventListener("input",()=>{
    const m=media();
    const dur=isFinite(m.duration)?m.duration:0;
    if(!dur) return;
    const v=clamp((+el.seek.value||0)/1000,0,1);
    try{m.currentTime=v*dur}catch{}
    updateTimeline();
  });
  el.seek.addEventListener("change",()=>{if(!media().paused) startRAF()});

  el.toggleLyrics.addEventListener("click",()=>setLyricsOn(ST.lyrics!=="on"));
  el.lyricsClose.addEventListener("click",()=>setLyricsOn(false));
  if(el.lyricsSizeBtn) el.lyricsSizeBtn.addEventListener("click",toggleLyricsSize);
  if(el.lyricsFollowBtn) el.lyricsFollowBtn.addEventListener("click",()=>setAutoFollow(!ST.autoFollow));
  if(el.lyricsBody) el.lyricsBody.addEventListener("scroll",()=>{Q.lyrUserScrollAt=performance.now()},{passive:true});

  el.downloadTrack.addEventListener("click",()=>downloadCurrent("mp3"));
  el.downloadVideo.addEventListener("click",()=>downloadCurrent("mp4"));
  el.downloadLrc.addEventListener("click",()=>downloadCurrent("lrc"));

  el.downloadAlbum.addEventListener("click",()=>{if(el.albumSheet){openSheet(el.albumSheet);buildAlbumMP3()}});
  el.albumDownload2.addEventListener("click",()=>buildAlbumMP3());

  el.openSettings.addEventListener("click",()=>openSheet(el.settingsSheet));
  el.openSettings2.addEventListener("click",()=>{closeSheet(el.albumSheet);openSheet(el.settingsSheet)});
  el.openAlbum.addEventListener("click",()=>openSheet(el.albumSheet));

  el.autoPlay.addEventListener("change",()=>{
    ST.autoPlay=!!el.autoPlay.checked;
    saveState();
    applyStateToDOM();
    toast("Auto-Play",ST.autoPlay?"An":"Aus","fa-solid fa-wand-magic-sparkles");
    if(ST.autoPlay) armAutoplayOnce();
  });
  el.autoFollow.addEventListener("change",()=>setAutoFollow(!!el.autoFollow.checked));
  el.cacheBtn.addEventListener("click",toggleCache);

  [el.settingsSheet,el.albumSheet].forEach(sheet=>{
    if(!sheet) return;
    sheet.addEventListener("click",e=>{
      const c=e.target&&e.target.closest("[data-close]");
      if(c){
        if(sheet===el.albumSheet && Q.albumBusy && Q.albumAbort) try{Q.albumAbort.abort()}catch{}
        closeSheet(sheet);
      }
    });
  });

  const onEnded=()=>{
    const rep=ST.repeat|0;
    if(rep===2){seekTo(0,true);return}
    if(ST.shuffle){
      nextTrack();
      return;
    }
    const atEnd=(ST.cur|0)>=TRACKS.length-1;
    if(atEnd && rep!==1){pauseAll();toast("Ende","Playlist beendet","fa-solid fa-flag-checkered");return}
    nextTrack();
  };
  const onPlay=()=>{setPlayIcon(true);startRAF()};
  const onPause=()=>{setPlayIcon(false);stopRAF();updateTimeline()};

  el.audio.addEventListener("ended",onEnded);
  el.video.addEventListener("ended",onEnded);
  el.audio.addEventListener("play",onPlay);
  el.video.addEventListener("play",onPlay);
  el.audio.addEventListener("pause",onPause);
  el.video.addEventListener("pause",onPause);

  window.addEventListener("keydown",e=>{
    const tag=(e.target&&e.target.tagName||"").toLowerCase();
    if(tag==="input"||tag==="textarea") return;
    if(e.key===" "){e.preventDefault();togglePlay()}
    if(e.key==="ArrowRight"){e.preventDefault();seekTo((media().currentTime||0)+5,true)}
    if(e.key==="ArrowLeft"){e.preventDefault();seekTo((media().currentTime||0)-5,true)}
    if(e.key==="ArrowUp"){e.preventDefault();ST.vol=clamp(ST.vol+.05,0,1);el.vol.value=String(ST.vol);el.audio.volume=ST.vol;el.video.volume=ST.vol;saveState()}
    if(e.key==="ArrowDown"){e.preventDefault();ST.vol=clamp(ST.vol-.05,0,1);el.vol.value=String(ST.vol);el.audio.volume=ST.vol;el.video.volume=ST.vol;saveState()}
    const k=e.key.toLowerCase();
    if(k==="n") nextTrack();
    if(k==="p") prevTrack();
    if(k==="l") setLyricsOn(ST.lyrics!=="on");
    if(k==="v") setMode(ST.mode==="audio"?"video":"audio");
    if(e.key==="Escape") closeAnySheet();
  });
};

const bootOut=()=>{
  el.root.classList.add("bootDone");
  setTimeout(()=>{const b=$("#boot");if(b) b.remove()},700);
};

const init=()=>{
  sanitize();
  saveState();
  applyStateToDOM();
  buildQueue();
  renderList();
  updateNowUI();
  if(ST.lyrics==="on") loadLyrics(clamp(ST.cur|0,0,TRACKS.length-1));
  loadTrackSources(clamp(ST.cur|0,0,TRACKS.length-1),{keepTime:false,autoplay:false});
  bindUI();
  armAutoplayOnce();
  initSW();
  ensureMobileShell();
  applyMobileVisibility();
  if(Q.mq) Q.mq.addEventListener("change",()=>{applyMobileVisibility();});
  const showHome=(()=>{try{return localStorage.getItem(LS_HOME_SEEN)!=="1"}catch{return true}})();
  if(showHome) setTimeout(()=>openHome(false),220);
  if(window.gsap){
    gsap.fromTo(".topbar",{y:-8,opacity:0},{y:0,opacity:1,duration:.45,ease:"power2.out",delay:.04});
    gsap.fromTo(".library",{y:10,opacity:0},{y:0,opacity:1,duration:.55,ease:"power2.out",delay:.08});
    gsap.fromTo(".hero",{y:10,opacity:0},{y:0,opacity:1,duration:.55,ease:"power2.out",delay:.12});
    gsap.fromTo(".lyrics",{y:10,opacity:0},{y:0,opacity:1,duration:.55,ease:"power2.out",delay:.16});
  }
  bootOut();
};

init();
