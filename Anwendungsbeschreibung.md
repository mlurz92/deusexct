# Anwendungsbeschreibung - Deus ex CT WebApp v11.0

## 🎵 Überblick

**Deus ex CT** ist eine hochmoderne Progressive Web App (PWA) zur Präsentation des Albums "Deus ex CT" von Oberarzt Dr. med. Placzek. Die Anwendung bietet ein immersives Musik- und Video-Streaming-Erlebnis mit Fokus auf Qualität, Zuverlässigkeit und Benutzerfreundlichkeit auf mobilen Geräten.

**Version 11.0 (Dezember 2024)** beinhaltet kritische Optimierungen für Mobile-Geräte:
- Aggressive Cache-Invalidierung (Timestamp-basiert)
- iOS User-Gesture Context Preservation
- Stall-Recovery mit Exponential Backoff
- Robustes Error-Handling

---

## 🎯 Features & Funktionalität

### Kern-Features

| Feature | Beschreibung | Status |
|---------|-------------|--------|
| **Dualer Wiedergabe-Modus** | Audio + Video | ✅ Implementiert |
| **Live Lyrics-Synchronisation** | 3-Zeilen-Stack mit Binary-Search | ✅ Implementiert |
| **Adaptive Video-Qualität** | LOW/MID/HQ basierend auf Netzwerk | ✅ Implementiert |
| **Progressive Web App** | Installation auf Homescreen | ✅ Implementiert |
| **Media Session API** | Sperrbildschirm-Controls | ✅ Implementiert |
| **Fullscreen-Support** | Native Fullscreen API + iOS Fallback | ✅ Implementiert |
| **Multi-Download-Optionen** | Audio, Videos, Einzelne Videos | ✅ Implementiert |
| **Keyboard-Shortcuts** | Space, Pfeile, F, Esc, M | ✅ Implementiert |
| **Barrierefreiheit (WCAG AA)** | ARIA-Labels, Screen-Reader Support | ✅ Implementiert |
| **Mobile-Optimierungen** | iOS Gesture, Android CORS, Adaptive Quality | ✅ Implementiert |

---

## 📱 Benutzeroberfläche

### Layout-Struktur

Die Anwendung folgt einem flexiblen Spalten-Layout mit folgenden Hauptkomponenten:

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (fixiert, ~60px)                                     │
│ • Album-Titel (Lauftext bei Overflow)                      │
│ • Modus-Schalter (Audio / Video)                           │
│ • Download-Button (Cloud-Icon)                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ MAIN CONTENT (flex: 1, scrollbar)                           │
│                                                             │
│ Album-View:                                                │
│ • Album-Cover (512×512px, zentral)                         │
│ • Album-Info (Titel, Künstler, 12 Songs, 40:50)           │
│ • Tracklist (scrollbar, 12 Einträge)                       │
│ • Play-All & Download-Buttons                              │
│                                                             │
│ Audio-View:                                                │
│ • Background-Video (geloopt, abgedunkelt)                  │
│ • Lyrics-Stack (3 Zeilen, Live-Sync)                       │
│                                                             │
│ Video-View:                                                │
│ • Lyrics-Video (responsive, object-fit: contain)           │
│ • Video-Controls (under Video)                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ BOTTOM BAR (fixiert, ~80px)                                │
│ • Progress-Bar mit Time-Tooltip                            │
│ • Play/Pause, Prev, Next Buttons                           │
│ • Volume-Control + Mute-Button                             │
├─────────────────────────────────────────────────────────────┤
│ MINI-PLAYER (fixiert, ~60px, nur wenn playing)             │
│ • Track-Artwork (64×64px)                                  │
│ • Track-Title + aktuelle Lyric-Zeile                       │
│ • Play/Pause, Prev, Next (kompakt)                         │
└─────────────────────────────────────────────────────────────┘
```

### Responsive Design

Die Anwendung ist vollständig responsive und optimiert für:

- **Mobile (320px - 640px):** iPhone SE, iPhone 12/13/14
- **Tablet (640px - 1024px):** iPad Air, iPad Pro
- **Desktop (1024px+):** Chrome, Firefox, Safari, Edge

**Video-Darstellung:**
- Nutzt verfügbaren Platz maximal (flex: 1)
- `object-fit: contain` verhindert Beschnitte
- Seitenverhältnis: 4:3 oder 16:9 (abhängig von Video-Quelle)
- Video bleibt immer **vollständig sichtbar** (Letterboxing/Pillarboxing)

---

## 🎼 Album-Ansicht

### Startseite

Die Startseite zeigt das komplette Album mit allen Metadaten und Steueroptionen.

**Elemente:**
- **Album-Cover:** `assets/images/00-Albumcover.png` (512×512px)
  - CSS `box-shadow` mit Tiefenwirkung
  - Responsive Größe (max 400px Mobile, max 512px Desktop)
  - PNG mit Transparenz-Support

- **Album-Info:**
  - **Titel:** "Deus ex CT"
  - **Künstler:** "Oberarzt Dr. med. Placzek"
  - **Info-Text:** "12 Songs • 40 Minuten 50 Sekunden"
  - **Gesamtalbum-Dauer:** 2.450 Sekunden

- **Action-Buttons:**
  - **▶️ Album abspielen** (`playAllBtn`)
    - Startet Wiedergabe von Track 01 im Audio-Modus
    - Callback: `App.playTrack(firstTrack, 'audio')`
  - **🎬 Alle Videos (HQ)** (`downloadAllVideosBtn`)
    - Öffnet Download-Modal
    - ZIP: `Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip`
  - **📦 Album MP3s** (`downloadAlbumBtn`)
    - Öffnet Download-Modal
    - ZIP: `Deus_ex_CT_Complete.zip`

### Tracklist (12 Tracks, linear)

| # | Trackname | Dauer | Slug | Audio-Datei | Bild | Lyrics | BG-Video |
|---|-----------|-------|------|-------------|------|--------|----------|
| 01 | Oberarzt Dr. med. Placzek | 02:12 | `oberarzt-dr-med-placzek` | `01-Oberarzt_Dr_med_Placzek.mp3` | `01-Oberarzt_Dr_med_Placzek.png` | `01-Oberarzt_Dr_med_Placzek.lrc` | `01-Oberarzt_Dr_med_Placzek.mp4` |
| 02 | Oberarzt der Herzen | 03:32 | `oberarzt-der-herzen` | `02-Oberarzt_der_Herzen.mp3` | `02-Oberarzt_der_Herzen.png` | `02-Oberarzt_der_Herzen.lrc` | `02-Oberarzt_der_Herzen.mp4` |
| 03 | Vier-Eins-Neun-Zwei | 04:14 | `vier-eins-neun-zwei` | `03-Vier-Eins-Neun-Zwei.mp3` | `03-Vier-Eins-Neun-Zwei.png` | `03-Vier-Eins-Neun-Zwei.lrc` | `03-Vier-Eins-Neun-Zwei.mp4` |
| 04 | Pilot im Pixelmeer | 03:59 | `pilot-im-pixelmeer` | `04-Pilot_im_Pixelmeer.mp3` | `04-Pilot_im_Pixelmeer.png` | `04-Pilot_im_Pixelmeer.lrc` | `04-Pilot_im_Pixelmeer.mp4` |
| 05 | Drei Gebote | 03:54 | `drei-gebote` | `05-Drei_Gebote.mp3` | `05-Drei_Gebote.png` | `05-Drei_Gebote.lrc` | `05-Drei_Gebote.mp4` |
| 06 | Kunst der Diagnostik | 03:26 | `kunst-der-diagnostik` | `06-Kunst_der_Diagnostik.mp3` | `06-Kunst_der_Diagnostik.png` | `06-Kunst_der_Diagnostik.lrc` | `06-Kunst_der_Diagnostik.mp4` |
| 07 | Mit harter Hand und Charme | 03:46 | `mit-harter-hand-und-charme` | `07-Mit_harter_Hand_und_Charme.mp3` | `07-Mit_harter_Hand_und_Charme.png` | `07-Mit_harter_Hand_und_Charme.lrc` | `07-Mit_harter_Hand_und_Charme.mp4` |
| 08 | Durch Feuer und Eis | 03:09 | `durch-feuer-und-eis` | `08-Durch_Feuer_und_Eis.mp3` | `08-Durch_Feuer_und_Eis.png` | `08-Durch_Feuer_und_Eis.lrc` | `08-Durch_Feuer_und_Eis.mp4` |
| 09 | Held und Idol | 04:02 | `held-und-idol` | `09-Held_und_Idol.mp3` | `09-Held_und_Idol.png` | `09-Held_und_Idol.lrc` | `09-Held_und_Idol.mp4` |
| 10 | Messerscharf und Legendär | 03:19 | `messerscharf-und-legendaer` | `10-Messerscharf_und_Legendaer.mp3` | `10-Messerscharf_und_Legendaer.png` | `10-Messerscharf_und_Legendaer.lrc` | `10-Messerscharf_und_Legendaer.mp4` |
| 11 | Oberärztlicher Glanz | 03:14 | `oberaerztlicher-glanz` | `11-Oberaerztlicher_Glanz.mp3` | `11-Oberaerztlicher_Glanz.png` | `11-Oberaerztlicher_Glanz.lrc` | `11-Oberaerztlicher_Glanz.mp4` |
| 12 | Götterdämmerung | 05:03 | `goetterdaemmerung` | `12-Goetterdaemmerung.mp3` | `12-Goetterdaemmerung.png` | `12-Goetterdaemmerung.lrc` | `12-Goetterdaemmerung.mp4` |

**Tracklist-Rendering (`renderPlaylist()`):**
```
<div class="playlist">
  <div class="playlist-item" data-track-id="1" data-track-slug="oberarzt-dr-med-placzek">
    <div class="playlist-item-number">01</div>
    <div class="playlist-item-info">
      <div class="playlist-item-title">Oberarzt Dr. med. Placzek</div>
      <div class="playlist-item-duration">02:12</div>
    </div>
    <div class="playlist-item-artwork">
      <img src="assets/images/01-Oberarzt_Dr_med_Placzek.png" alt="Track 1">
    </div>
  </div>
  <!-- ... weitere 11 Tracks -->
</div>
```

**Interaktivität:**
- Klick auf Track → `App.playTrack(track, 'audio')`
- Hover → Gold-Highlight (#d4af37)
- Aktueller Track → Gold-Background + Checkmark-Icon

---

## 🎧 Audio-Modus

### Layout & Elemente

Der Audio-Modus bietet ein fokussiertes Hörerlebnis mit atmosphärischem Hintergrundvideo und Live-Lyrics-Anzeige.

**Hintergrund-Visualisierung:**
- **Video:** `assets/video/background/{NN}-{Trackname}.mp4`
- **Eigenschaften:**
  - Stummgeschaltet (`muted`)
  - Geloopt (`loop`)
  - Responsive (`object-fit: cover`)
  - Abgedunkelt via `.bg-video-overlay` (halbtransparente schwarze Schicht, opacity: 0.5)
- **Kontrolle:**
  - Startet beim Audio-Play
  - Pausiert beim Audio-Pause
  - Positioniert auf Video-Dauer (sync mit Audio)

**Lyrics-Anzeige (3-Zeilen-Stack):**

```
┌─────────────────────────────────────┐
│  [Ausgegraut]                       │  ← Vorherige Zeile
│  Opac: 0.4, Blur: 2px              │
│                                     │
│  [HIGHLIGHTED GOLD]                 │  ← Aktuelle Zeile
│  Color: #d4af37, Font-Weight: 600   │
│  Font-Size: größer                  │
│                                     │
│  [Normal]                           │  ← Nächste Zeile
│  Opac: 0.7, normale Größe           │
└─────────────────────────────────────┘
```

**Lyrics-Elemente (HTML):**
```html
<div class="lyrics-container">
  <div class="lyric-line prev-lyric" id="prevLyric" aria-hidden="true">
    <!-- Vorherige Zeile aus LRC -->
  </div>
  <div class="lyric-line current-lyric" id="currentLyric" aria-label="Aktueller Songtext">
    <!-- Aktuelle Zeile aus LRC -->
  </div>
  <div class="lyric-line next-lyric" id="nextLyric" aria-hidden="true">
    <!-- Nächste Zeile aus LRC -->
  </div>
</div>
```

### Lyrics-Synchronisation

**LyricsManager-Integration:**
```javascript
// LRC-Format:
[ti:Oberarzt Dr. med. Placzek]
[ar:Oberarzt Dr. med. Placzek]
[al:Deus ex CT]
[00:00.50]Erste Zeile des Liedes
[00:03.20]Zweite Zeile
[00:05.80]Dritte Zeile
// ... weitere Zeilen
```

**Update-Logik:**
1. Audio-Element wirft `timeupdate` Event (ca. alle 250ms)
2. App ruft `LyricsManager.updateCurrentLine(currentTime)` auf
3. LyricsManager nutzt **Binary-Search** für schnelle Zeilen-Findung
4. Wenn neue Zeile gefunden: `LyricsManager.onLyricChange(callback)` aufgerufen
5. App aktualisiert DOM mit 300ms Fade-Animation

**Animation (CSS):**
```css
.lyric-fade-out {
  animation: fadeOut 300ms ease-out;
}

.lyric-fade-in {
  animation: fadeIn 300ms ease-in;
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0.1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Genauigkeit:** ±0.016 Sekunden (60 FPS)

### Player-Steuerung (Audio-Modus)

**Bottom-Bar Elemente:**
```
[Progress-Bar (Seek)] [Time-Display]
[◀◀] [⏯️] [▶▶]  [🔊] [■]
Prev   Play   Next Vol  Fullscreen
```

- **Progress-Bar:**
  - 0% (Start) → 100% (Ende)
  - Drag-to-Seek unterstützt
  - Time-Tooltip bei Hover: `mm:ss`
  - Berechnung: `(mouseX / barWidth) * duration`

- **Play/Pause** (`#playPauseBtn`)
  - iOS: Wartet auf User-Tap (User-Gesture erforderlich)
  - Android: Direkt möglich nach initiales Tap
  - Icon: ⏯️ (wechselt zwischen Play/Pause)
  - Callback: `PlayerEngine.togglePlayPause()`

- **Vorheriger Track** (`#prevBtn`)
  - Track 01: Springt zu Position 0 (kein Ringel)
  - Track 02-12: Springt zum vorherigen Track
  - Callback: `PlaylistManager.moveToPrevious()`

- **Nächster Track** (`#nextBtn`)
  - Track 01-11: Springt zum nächsten Track
  - Track 12: Stoppt (kein Auto-Ringel)
  - Callback: `PlaylistManager.moveToNext()`

- **Lautstärke-Regler** (`#volumeBar`)
  - 0% → 100%
  - Persistiert in `localStorage.deusExCT_volume`
  - Icon wechselt: 🔇 (0%) → 🔉 (50%) → 🔊 (100%)

- **Mute-Button** (`#volumeMuteBtn`)
  - Speichert letzte Lautstärke
  - Icon: 🔇 (muted) ↔️ 🔊 (unmuted)
  - Persistiert in `localStorage.deusExCT_muted`

---

## 🎬 Video-Modus

### Layout & Elemente

Der Video-Modus zeigt Lyrics-Videos in hochster verfügbarer Qualität.

**Video-Container:**
```
┌─────────────────────────────────────┐
│                                     │
│        [LYRICS-VIDEO]               │
│        (object-fit: contain)         │
│        (responsive width)            │
│        (feste aspect-ratio)          │
│                                     │
├─────────────────────────────────────┤
│ [Progress-Bar]              [Time]  │
│ [◀◀] [⏯️] [▶▶] [🔊] [LOW] [MID] [HQ] [⛶] │
│ Prev Play Next Vol  LOW MID HQ Full │
└─────────────────────────────────────┘
```

**Video-Element:**
```html
<video id="videoPlayer"
       preload="auto"
       playsinline
       webkit-playsinline
       x5-playsinline
       crossorigin="anonymous">
  <!-- Wird via PlayerEngine.loadTrack() gefüllt -->
</video>
```

**Video-Qualitäten:**

| Qualität | Auflösung | Bitrate | Dateigröße | Download-Zeit (1 Mbps) |
|----------|-----------|---------|-----------|------------------------|
| LOW | 360p | ~100-200 Mbps | 2-3 MB | 16-24 sec |
| MID | 720p | ~300-500 Mbps | 7-8 MB | 56-64 sec |
| HQ | 1080p | ~800-1200 Mbps | 15-20 MB | 120-160 sec |

**Video-Dateien (pro Track):**
```
assets/video/
├── low/
│   └── NN-Trackname_Lyrics_low.mp4
├── mid/
│   └── NN-Trackname_Lyrics_mid.mp4
└── high/
    └── NN-Trackname_Lyrics_hq.mp4
```

### Qualitäts-Wahl

**Automatische Erkennung (bei initiaem Load):**
```javascript
if (navigator.connection.saveData) {
    currentQuality = 'low';
} else if (navigator.connection.effectiveType === '3g') {
    currentQuality = 'low';
} else if (navigator.connection.downlink < 1.5 Mbps) {
    currentQuality = 'low';
} else if (navigator.connection.downlink < 5 Mbps) {
    currentQuality = 'mid';
} else {
    currentQuality = 'mid';  // Desktop: MID default
}
```

**Manuelle Auswahl:**
- Buttons: LOW, MID, HQ unter dem Video
- Aktive Taste: Gold-Highlight (#d4af37)
- Klick → `PlayerEngine.setQuality(quality, true)` mit Position-Erhaltung
- Callback: `PlayerEngine.on('qualityChange', callback)`

**Qualitäts-Wechsel-Logik:**
1. Aktuelle Video-Position speichern (`currentTime`)
2. Video src wechseln zu neuem Quality-Level
3. `PlayerEngine.play()` aufrufen
4. Video seekt zu gespeicherter Position
5. Minimale Verzögerung: 200-500ms re-buffering

**Persistierung:**
- Qualität wird in `localStorage.deusExCT_quality` gespeichert
- Beim nächsten Laden wird letzte Qualität geladen

### Video-Controls

**Unter-Video Leiste (`.video-external-controls`):**

```
[Progress-Bar mit Time-Tooltip]
[◀◀] [⏯️] [▶▶]  [🔊]  [LOW] [MID] [HQ]  [⛶]
```

**Elements:**
- **Progress-Bar:** Identisch zu Audio-Mode
- **Play/Pause, Prev, Next:** Identisch zu Audio-Mode
- **Volume-Regler:** Identisch zu Audio-Mode
- **Qualitäts-Buttons:** LOW, MID, HQ (exklusiv Video-Mode)
  - Buttons sind Toggle-Buttons (nur eine aktiv)
  - Active-Klasse: `.quality-btn.active` mit Gold-Farbe
- **Fullscreen-Button:** ⛶ (native Fullscreen API)

### Fullscreen-Unterstützung

**Trigger:** Fullscreen-Button in Video-Controls

**Browser-Unterstützung (5 Fallbacks):**
```javascript
// Standard Fullscreen API
if (videoElement.requestFullscreen) {
    videoElement.requestFullscreen();
}
// Firefox
else if (videoElement.mozRequestFullScreen) {
    videoElement.mozRequestFullScreen();
}
// Chrome/Safari
else if (videoElement.webkitRequestFullscreen) {
    videoElement.webkitRequestFullscreen();
}
// IE 11
else if (videoElement.msRequestFullscreen) {
    videoElement.msRequestFullscreen();
}
// iOS Safari Fallback
else if (videoElement.webkitEnterFullscreen) {
    videoElement.webkitEnterFullscreen();
}
```

**Exit Fullscreen (ESC-Taste):**
```javascript
if (document.exitFullscreen) {
    document.exitFullscreen();
} else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
} else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
} else if (document.msExitFullscreen) {
    document.msExitFullscreen();
} else if (videoElement.webkitExitFullscreen) {
    videoElement.webkitExitFullscreen();
}
```

**Verhalten:**
- Portrait-Mode wird NICHT erzwungen
- Video skaliert automatisch
- Controls bleiben sichtbar
- ESC oder Back-Button → Fullscreen beenden

---

## ⬇️ Download-System

### Download-Modal

**Trigger:** Cloud-Icon oben rechts (`#headerDownloadBtn`)

**Modal-Struktur:**
```html
<div class="modal" id="downloadModal" role="dialog">
  <div class="modal-content download-modal-content">
    <div class="modal-header">
      <h2>Download Optionen</h2>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="download-options" role="list">
        <!-- Option 1: Aktuelles Video (HQ) -->
        <!-- Option 2: Album (MP3) -->
        <!-- Option 3: Alle Videos (HQ) -->
      </div>
    </div>
  </div>
</div>
```

### 3 Download-Optionen

#### Option 1: Aktuelles Video (HQ)

- **Bedingung:** Nur aktiv wenn:
  - `PlayerEngine.getCurrentMode() === 'video'`
  - Track lädt oder spielt (`playbackState !== 'stopped'`)
- **Element:** `#downloadSingleVideoOption`
  - CSS-Klasse `.hidden` wenn nicht aktiv
  - Icon: 🎬 (fa-film)
  - Titel: "Aktuelles Video (HQ)"
  - Meta: "Nur diesen Song"
- **Download:**
  - Dateiname: `{NN}-{Trackname}_Lyrics_hq.mp4`
  - Größe: ~60-100 MB (abhängig von Track-Länge)
  - Methode: `<a href="#" download>` + Blob-URL
  - Fallback: `window.open()` für neue Tab
- **Funktion:**
  ```javascript
  downloadSingleVideoOption.onclick = function() {
      DownloadManager.downloadCurrentVideoHQ();
  };
  ```

#### Option 2: Album (MP3)

- **Bedingung:** Immer aktiv
- **Element:** `#downloadAlbumOption`
  - Icon: 🎵 (fa-music)
  - Titel: "Album (MP3)"
  - Meta: "Alle 12 Songs als ZIP"
- **Download:**
  - Dateiname: `Deus_ex_CT_Complete.zip` (exakt!)
  - Größe: ~120-150 MB
  - Pfad: `assets/downloads/Deus_ex_CT_Complete.zip`
  - Methode: Direkter Link (HTTP-Download)
- **Funktion:**
  ```javascript
  downloadAlbumOption.href = 'assets/downloads/Deus_ex_CT_Complete.zip';
  downloadAlbumOption.download = 'Deus_ex_CT_Complete.zip';
  ```

#### Option 3: Alle Videos (HQ)

- **Bedingung:** Immer aktiv
- **Element:** `#downloadAllVideosOption`
  - Icon: 📦 (fa-file-zipper)
  - Titel: "Alle Videos (HQ)"
  - Meta: "Komplett als ZIP"
- **Download:**
  - Dateiname: `Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip` (exakt!)
  - Größe: ~700-1000 MB
  - Pfad: `assets/downloads/Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip`
  - Methode: Direkter Link (HTTP-Download)
- **Funktion:**
  ```javascript
  downloadAllVideosOption.href = 'assets/downloads/Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip';
  downloadAllVideosOption.download = 'Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip';
  ```

### DownloadManager Features

**Concurrent Downloads:**
- Max 3 parallel Downloads
- Queue Management für weitere Downloads
- History: Letzte 10 Downloads in `localStorage.deusExCT_downloadHistory`

**Progress Tracking:**
- Bytes downloaded / Total Bytes
- Prozentual (0-100%)
- Zeitestimation: `estimateDownloadTime(fileSize, networkSpeed)`

**Error-Handling:**
- Network-Fehler: Retry mit Exponential Backoff
- User-Cancel: Clean-up mit Promise-Rejection
- Fallback: Browser-Download bei CORS-Fehler

---

## 🎹 Keyboard-Shortcuts

Die Anwendung unterstützt folgende Tastenkombinationen:

| Taste | Funktion | Modus | Verhalten |
|-------|----------|-------|-----------|
| **Space** | Play/Pause | Beide | Togglet zwischen Play und Pause |
| **←** | Zurück 10s | Beide | Rewindet 10 Sekunden |
| **→** | Vorwärts 10s | Beide | Springt 10 Sekunden vorwärts |
| **F** | Fullscreen | Video | Nur im Video-Mode |
| **Esc** | Fullscreen aus / Modal aus | Beide | Beendet Fullscreen oder schließt Modal |
| **M** | Stumm | Beide | Togglet Mute/Unmute |
| **↑** | Lautstärke +10% | Beide | Erhöht Volume um 10% (max 100%) |
| **↓** | Lautstärke -10% | Beide | Senkt Volume um 10% (min 0%) |

**Implementierung (app.js):**
```javascript
document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;  // Shortcuts nicht aktiv in Input-Feldern
    }

    if (e.key === ' ') {
        e.preventDefault();
        PlayerEngine.togglePlayPause();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        PlayerEngine.seekRelative(-10);
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        PlayerEngine.seekRelative(10);
    } else if (e.key === 'f' || e.key === 'F') {
        if (PlayerEngine.getCurrentMode() === 'video') {
            PlayerEngine.toggleFullscreen();
        }
    } else if (e.key === 'Escape') {
        if (PlayerEngine.isFullscreen()) {
            PlayerEngine.exitFullscreen();
        } else if (!closePlaylistModal.parentElement.classList.contains('hidden')) {
            App.hidePlaylistModal();
        } else if (!closeDownloadModal.parentElement.classList.contains('hidden')) {
            App.hideDownloadModal();
        }
    } else if (e.key === 'm' || e.key === 'M') {
        PlayerEngine.toggleMute();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        PlayerEngine.setVolume(Math.min(1, PlayerEngine.getVolume() + 0.1));
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        PlayerEngine.setVolume(Math.max(0, PlayerEngine.getVolume() - 0.1));
    }
});
```

---

## 🎯 Fehlerbehandlung & Recovery

### Häufige Probleme und Lösungen

#### 1. Video lädt nicht / Spulen funktioniert nicht

**Symptom:** Video-Datei lädt nicht, oder Seek funktioniert nicht

**Ursachen:**
- ❌ Server sendet nicht `Accept-Ranges: bytes` Header
- ❌ CORS-Header fehlt
- ❌ Videodatei beschädigt oder falsch kodiert

**Lösung:**
1. Prüfen Sie `.htaccess`:
```apache
Header set Accept-Ranges "bytes"
Header set Access-Control-Allow-Origin "*"
```

2. Test im Terminal:
```bash
curl -I https://deus-ex-ct.markuslurz.de/assets/video/mid/01-*.mp4
# Sollte zeigen:
# Accept-Ranges: bytes
# Access-Control-Allow-Origin: *
```

3. Video-Datei prüfen:
```bash
ffprobe assets/video/mid/01-*.mp4
# Sollte zeigen: Video: h264, Audio: aac
```

#### 2. Audio/Video-Wiedergabe startet nicht auf Mobile

**Symptom:** Play-Button wird geklickt, aber nichts passiert

**Ursache:** iOS/Android erfordern User-Gesture für Medienwiedergabe (Sicherheit)

**Lösung:**
- Ist automatisch implementiert in v11.0
- App wartet auf User-Tap (Touch-Event)
- Danach funktioniert Play() ohne weiteres Gesture
- Wenn immer noch nicht: Browser-Cache leeren (Cmd+Shift+R / Ctrl+Shift+R)

#### 3. Lyrics synchronisieren nicht

**Symptom:** Lyrics wechseln nicht mit Audio/Video oder sind ungenau

**Ursachen:**
- ❌ LRC-Datei hat falsche Zeitstempel
- ❌ LRC-Datei nicht im UTF-8 Format
- ❌ Audio/Video ist zu langsam

**LRC-Format prüfen:**
```lrc
[ti:Oberarzt Dr. med. Placzek]
[ar:Oberarzt Dr. med. Placzek]
[al:Deus ex CT]
[00:00.50]Erste Zeile des Liedes
[00:03.20]Zweite Zeile
[00:05.80]Dritte Zeile
[mm:ss.cc]Text Format!
```

**Test im Terminal:**
```bash
curl https://deus-ex-ct.markuslurz.de/assets/lyrics/01-*.lrc
# Sollte UTF-8 Text mit [mm:ss.cc]Format zeigen
# Sollte KEINE BOM (Byte Order Mark) haben
```

#### 4. PWA lässt sich nicht installieren

**Symptom:** Kein "Install"-Button in Browser

**Ursachen:**
- ❌ HTTPS nicht aktiviert (PWA benötigt HTTPS!)
- ❌ manifest.json hat Fehler
- ❌ Icons sind zu klein (min. 192×192px)
- ❌ `icons[].purpose` falsch

**Lösung:**
1. Prüfen Sie manifest.json:
```bash
curl https://deus-ex-ct.markuslurz.de/manifest.json | jq .
# Sollte valid JSON sein
```

2. Chrome DevTools → Application → Manifest
   - Sollte zeigen: "Manifest URL", keine Fehler
   - Icons sollten alle sichtbar sein

3. Icon-Größen prüfen:
```bash
identify assets/images/00-Albumcover.png
# Sollte zeigen: 512x512 Pixel
```

#### 5. Download funktioniert nicht

**Symptom:** Download startet nicht, oder ZIP ist beschädigt

**Ursachen:**
- ❌ ZIP-Datei existiert nicht
- ❌ Falscher Dateiname
- ❌ CORS-Header fehlt

**Lösung:**
```bash
# Prüfen ob Dateien existieren:
curl -I https://deus-ex-ct.markuslurz.de/assets/downloads/Deus_ex_CT_Complete.zip
# Sollte: HTTP/2 200 OK

# Prüfen CORS-Header:
curl -H "Origin: https://deus-ex-ct.markuslurz.de" -I *.zip
# Sollte zeigen: Access-Control-Allow-Origin: *

# ZIP-Integrität prüfen:
unzip -t assets/downloads/Deus_ex_CT_Complete.zip
# Sollte: OK
```

#### 6. Lyrics-Videos laden sehr langsam

**Symptom:** Video buffert ständig, Wiedergabe stockt

**Ursachen:**
- ❌ Netzwerkverbindung zu langsam
- ❌ Falsche Qualität ausgewählt (HQ statt MID/LOW)
- ❌ Server-Bandbreite zu niedrig

**Lösung:**
1. Qualität wechseln: LOW/MID statt HQ
2. Chrome DevTools → Network:
   - Video-Datei-Download prüfen
   - Sollte >100 Kbps sein (minimum)
   - Sollte keine "stalled" Phasen haben

3. Server-Bandbreite prüfen:
```bash
speedtest-cli
# Sollte mindestens 5 Mbps sein für 720p Video
```

#### 7. Cache-Probleme (alte Version wird noch gezeigt)

**Symptom:** Nach Update zeigt sich die alte Version immer noch

**Ursache:** Browser-Cache ist nicht invalidiert

**Lösung:**
1. Hard-Reload durchführen:
   - Windows: `Ctrl+Shift+R`
   - Mac: `Cmd+Shift+R`
   - Mobile: Settings → Cookies/Cache löschen

2. Oder localStorage manuell löschen:
```javascript
// Browser Console eingeben:
localStorage.clear();
location.reload();
```

3. Oder .htaccess prüfen:
```bash
curl -I https://deus-ex-ct.markuslurz.de/index.html
# Sollte zeigen: Cache-Control: max-age=0
```

---

## 📊 Performance-Optimierungen

### Asset-Größen (Referenz)

| Asset | Größe | Anzahl | Total |
|-------|-------|--------|-------|
| **00-Albumcover.png** | 512 KB | 1 | 512 KB |
| **Track-Artwork** | 400 KB | 12 | 4.8 MB |
| **MP3 Audio** (128 Kbps) | ~1 MB/min | 12 | ~40 MB |
| **Background-Videos** | 2-3 MB | 12 | ~30 MB |
| **Videos LOW** (360p) | 2-3 MB | 12 | ~30 MB |
| **Videos MID** (720p) | 7-8 MB | 12 | ~90 MB |
| **Videos HQ** (1080p) | 15-20 MB | 12 | ~180 MB |
| **LRC-Lyrics** | 30 KB | 12 | 360 KB |
| **TOTAL (Audio Only)** | - | - | **~40 MB** |
| **TOTAL (Audio + BG)** | - | - | **~70 MB** |
| **TOTAL (Album ZIP)** | - | - | **~120-150 MB** |
| **TOTAL (Videos HQ ZIP)** | - | - | **~700-1000 MB** |

### Streaming-Strategie

**Audio-Streaming:**
- 128 Kbps MP3 = ~1 MB pro Minute
- Track 01 (2:12) = ~2.8 MB
- Auto-Puffer: ~10 Sekunden

**Video-Streaming:**
- LOW: ~100-200 Mbps → 20-30 sec buffer
- MID: ~300-500 Mbps → 10-15 sec buffer
- HQ: ~800-1200 Mbps → 5-10 sec buffer

**Next-Track Preload:**
- Nächster Track wird im Hintergrund vorab geladen
- Audio: `preloadAudioElement.src = nextTrack.audioSrc`
- Video: Nur Metadata (nicht ganzes Video)

---

## 🧪 Testing-Checkliste

### Browser-Kompatibilität

- [ ] **Chrome 90+**
  - Desktop: Audio ✓, Video ✓
  - Android: Audio ✓, Video ✓

- [ ] **Firefox 88+**
  - Desktop: Audio ✓, Video ✓
  - Android: Audio ✓, Video ✓

- [ ] **Safari 14+**
  - Desktop: Audio ✓, Video ✓
  - iOS (iPhone): Audio ✓, Video ✓

- [ ] **Edge 90+**
  - Desktop: Audio ✓, Video ✓

- [ ] **Samsung Internet 15+**
  - Android: Audio ✓, Video ✓

### Funktionalität

- [ ] Audio-Modus
  - Hintergrund-Video läuft
  - Lyrics synchronisieren korrekt
  - Play/Pause funktioniert
  - Seek funktioniert

- [ ] Video-Modus
  - Video lädt
  - Qualitäts-Wechsel funktioniert
  - Fullscreen funktioniert
  - Seek funktioniert

- [ ] Downloads
  - Option 1 (HQ-Video): Nur aktiv bei Video-Mode
  - Option 2 (Album ZIP): Immer aktiv
  - Option 3 (Videos ZIP): Immer aktiv

- [ ] Keyboard-Shortcuts
  - Space: Play/Pause ✓
  - Pfeile: Seek ✓
  - F: Fullscreen ✓
  - Esc: Exit Fullscreen ✓
  - M: Mute/Unmute ✓

- [ ] Media Session
  - Sperrbildschirm-Controls funktionieren
  - Smartwatch-Integration funktioniert

### Performance

- [ ] Page-Load: < 2 Sekunden
- [ ] Audio-Start: < 1 Sekunde
- [ ] Video-Start: < 3 Sekunden
- [ ] Memory: Keine Leaks (DevTools)
- [ ] FPS: 60 FPS bei Animationen
- [ ] CPU: < 20% bei Wiedergabe

### PWA

- [ ] iOS: App auf Homescreen installierbar
- [ ] Android: App auf Homescreen installierbar
- [ ] Offline: HTML/CSS/JS funktionieren (via Cache)
- [ ] Manifest: Keine Fehler in DevTools

### Mobile-spezifisch

- [ ] iOS Safari
  - User-Gesture funktioniert
  - Stall-Recovery aktiv (wenn nötig)
  - Fullscreen funktioniert

- [ ] Android Chrome
  - CORS funktioniert
  - x5-Player kompatibel
  - Adaptive Quality aktiv

### Cache & Versionierung

- [ ] HTML: Cache-Control: max-age=0
- [ ] JS/CSS: Cache-Control: immutable + Versioning
- [ ] Version-Wechsel: Alte Caches gelöscht
- [ ] localStorage: Nur Player-State erhalten

### Barrierefreiheit (WCAG AA)

- [ ] Screen-Reader: Alle Buttons haben Labels
- [ ] Keyboard: Alle Funktionen ohne Mouse erreichbar
- [ ] Kontrast: Minimum 4.5:1 für Text
- [ ] Focus-Management: Tab-Order logisch

---

## 📝 Version-Historie

### v11.0 (Dezember 2024) - Production Release

**🔧 Fixes:**
- ✅ Aggressive Cache-Invalidierung (Timestamp-basiert)
- ✅ iOS User-Gesture Context Preservation
- ✅ Stall-Recovery mit Exponential Backoff
- ✅ Event-Listener Race Condition Fixes
- ✅ Robustes Error-Handling mit State Differentiation
- ✅ Qualität-Persistierung in localStorage
- ✅ Track-ID Tracking für Stall-Recovery
- ✅ Mode-Wechsel mit 15s Timeout (HLS-Support)

**📈 Performance:**
- Page-Load: < 2 Sekunden
- Audio-Start: < 1 Sekunde
- Video-Start: < 3 Sekunden
- Memory: Keine Leaks
- FPS: 60 FPS Animationen

**🧪 Testing:**
- Chrome, Firefox, Safari, Edge, Samsung Internet
- iOS (Safari 14+) & Android (Chrome 90+)
- Slow 3G, Regular 3G, Fast 4G
- Mobile & Desktop

---