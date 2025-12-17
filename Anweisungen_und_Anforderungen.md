# Anweisungen und Anforderungen - Deus ex CT WebApp v11.0

## 1. Projektziel

Entwicklung einer hochmodernen, responsiven Single Page Application (SPA) zur Präsentation des Albums "Deus ex CT" von Oberarzt Dr. med. Placzek. Die Anwendung fungiert als hybrider Musik- und Video-Player mit Fokus auf einem linearen, immersiven Erlebnis ohne Ablenkung durch unnötige UI-Elemente.

Die Anwendung wurde speziell optimiert für Mobile-Geräte (iOS und Android) mit Fokus auf Zuverlässigkeit, Performance und nahtlose Wiedergabe unter variablen Netzwerkbedingungen.

**Version 11.0** beinhaltet kritische Fixes für Mobile-Wiedergabeprobleme:
- Aggressive Cache-Invalidierung (Timestamp-basiert)
- iOS User-Gesture Context Preservation
- Stall-Recovery mit Exponential Backoff (500ms → 4s)
- Event-Listener Race Condition Fixes
- Robustes Error-Handling mit State Differentiation

---

## 2. Asset-Struktur & Inhalte

Die Anwendung arbeitet mit der folgenden vorgegebenen, **unveränderlichen Dateistruktur**.

### 2.1 Verzeichnisstruktur (EXAKT)

```
/
├── index.html                           # SPA Entry Point mit Cache-Management
├── manifest.json                        # PWA Manifest (standalone display)
├── .htaccess                            # Apache-Konfiguration
├── css/
│   └── styles.css                       # Dark Mode + Gold Akzente (#d4af37)
├── js/
│   ├── playlist.js                      # PlaylistManager (12 Tracks, linear)
│   ├── lyrics.js                        # LyricsManager (LRC-Parsing, 3-Zeilen-View)
│   ├── player.js                        # PlayerEngine (Core Audio/Video Control)
│   ├── mediasession.js                  # Media Session API Integration
│   ├── download.js                      # DownloadManager (3 Optionen)
│   └── app.js                           # App Controller (UI + Events)
└── assets/
    ├── audio/                           # 12 MP3-Dateien (128 Kbps, ~2-5 MB each)
    │   └── 01-12-*.mp3
    ├── downloads/                       # ZIP-Archive (exakte Namen!)
    │   ├── Deus_ex_CT_Complete.zip
    │   └── Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip
    ├── images/                          # PNG Artwork (512×512px)
    │   ├── 00-Albumcover.png
    │   └── 01-12-*.png
    ├── lyrics/                          # LRC-Dateien ([mm:ss.cc]Format)
    │   └── 01-12-*.lrc
    └── video/
        ├── background/                  # Loop-Videos Audio-Modus (MP4, muted)
        │   └── 01-12-*.mp4
        ├── low/                         # Lyrics-Videos 360p (~2-3 MB)
        │   └── 01-12-*_Lyrics_low.mp4
        ├── mid/                         # Lyrics-Videos 720p (~7-8 MB) DEFAULT
        │   └── 01-12-*_Lyrics_mid.mp4
        └── high/                        # Lyrics-Videos 1080p (~15-20 MB)
            └── 01-12-*_Lyrics_hq.mp4
```

### 2.2 Tracklist (12 Tracks, EXAKT)

```
ID  Nr   Titel                            Dauer  Slug
1   01   Oberarzt Dr. med. Placzek        02:12  oberarzt-dr-med-placzek
2   02   Oberarzt der Herzen              03:32  oberarzt-der-herzen
3   03   Vier-Eins-Neun-Zwei              04:14  vier-eins-neun-zwei
4   04   Pilot im Pixelmeer               03:59  pilot-im-pixelmeer
5   05   Drei Gebote                      03:54  drei-gebote
6   06   Kunst der Diagnostik             03:26  kunst-der-diagnostik
7   07   Mit harter Hand und Charme       03:46  mit-harter-hand-und-charme
8   08   Durch Feuer und Eis              03:09  durch-feuer-und-eis
9   09   Held und Idol                    04:02  held-und-idol
10  10   Messerscharf und Legendär        03:19  messerscharf-und-legendaer
11  11   Oberärztlicher Glanz             03:14  oberaerztlicher-glanz
12  12   Götterdämmerung                  05:03  goetterdaemmerung

Album Total: 40:50 (2.450 Sekunden)
```

**Datei-Benennung (EXAKT):**
- Audio: `NN-Trackname.mp3` (z.B. `01-Oberarzt_Dr_med_Placzek.mp3`)
- Images: `NN-Trackname.png` (z.B. `01-Oberarzt_Dr_med_Placzek.png`)
- Lyrics: `NN-Trackname.lrc` (z.B. `01-Oberarzt_Dr_med_Placzek.lrc`)
- Background Video: `NN-Trackname.mp4` (z.B. `01-Oberarzt_Dr_med_Placzek.mp4`)
- Video LOW: `NN-Trackname_Lyrics_low.mp4`
- Video MID: `NN-Trackname_Lyrics_mid.mp4`
- Video HQ: `NN-Trackname_Lyrics_hq.mp4`

---

## 3. Funktionale Anforderungen

### 3.1 Dualer Wiedergabe-Modus

Die App muss nahtlos zwischen zwei Modi wechseln können via `PlayerEngine.switchMode(mode, preservePosition)`.

#### Audio-Modus (`mode === 'audio'`)

**Wiedergabe:**
- MP3-Datei aus `assets/audio/{NN}-{Titel}.mp3` (128 Kbps)
- Direkt vom `<audio>` Element (keine Dekodierung nötig)

**Hintergrund-Visualisierung:**
- Loop-Video aus `assets/video/background/{NN}-{Titel}.mp4`
- Eigenschaften: **stummgeschaltet**, **geloopt**, **abgedunkelt**
- `<video>` mit `muted`, `loop`, `playsinline` Attributen
- `.bg-video-overlay` mit halbtransparenter schwarzer Schicht
- Video startet beim Audio-Play, pausiert beim Audio-Pause

**Lyrics-Anzeige (3-Zeilen-Stack):**
```
[Ausgegraut]         ← Vorherige Zeile (opacity: 0.4, blur)
[High-Contrast Gold] ← Aktuelle Zeile (color: #d4af37, font-weight: 600)
[Sichtbar]          ← Nächste Zeile (normal)
```
- Synchronisation: `LyricsManager.updateCurrentLine(currentTime)`
- Animation: Fade-Out/Fade-In 300ms CSS-Transition (`.lyric-fade-out`, `.lyric-fade-in`)
- Keine Ruckler: Binary-Search im LyricsManager

#### Video-Modus (`mode === 'video'`)

**Wiedergabe:**
- Lyrics-Video MP4 aus `assets/video/{quality}/{NN}-{Titel}_Lyrics_{quality}.mp4`
- Audio kommt direkt aus Videodatei (synchronisiert)
- Qualität: Manuelle Auswahl oder Automatisch (Network Information API)

**Qualitätsoptionen (3 Stufen):**
```
LOW  360p  ~100-200 Mbps   2-3 MB pro 3-Min-Track
MID  720p  ~300-500 Mbps   7-8 MB pro 3-Min-Track (DEFAULT)
HQ   1080p ~800-1200 Mbps  15-20 MB pro 3-Min-Track
```

**Adaptive Bitrate-Auswahl:**
```javascript
if (navigator.connection.saveData) → LOW
if (effectiveType === '2g' || '3g') → LOW
if (downlink < 1.5 Mbps) → LOW
if (downlink < 5 Mbps) → MID
else → MID (Desktop default, HQ optional)
```

**Video-Rendering:**
- `<video>` mit `object-fit: contain` (keine Beschnitte)
- Responsive Breite, feste Aspect-Ratio 4:3 oder 16:9
- **KRITISCH:** Controls befinden sich **UNTERHALB** des Videos, nicht als Overlay
- Qualitäts-Tasten: LOW, MID, HQ (unter Video, aktive Taste: Gold-Highlight)
- Fullscreen-Button (native Fullscreen API + iOS Fallback)

**Qualitäts-Wechsel-Logik:**
- Unterbricht Wiedergabe **NICHT**
- Seekt zur aktuellen Position im neuen Video
- Minimale Verzögerung (200-500ms re-buffering)
- Speichert Qualität in `localStorage.deusExCT_quality`

### 3.2 Player-Steuerung

**Transport-Controls:**
- **Play/Pause** (`PlayerEngine.play()`, `PlayerEngine.pause()`)
  - iOS: Wartet auf User-Gesture (Tap)
  - Android: Direkt möglich nach initiales Tap
  - Fallback: `pendingPlayRequest` bei NotAllowedError
- **Vorheriger Track** (`PlaylistManager.moveToPrevious()`)
  - Track 01: Springt zu Position 0 (kein Ringel)
  - Track 02-12: Spring zum vorherigen Track
- **Nächster Track** (`PlaylistManager.moveToNext()`)
  - Track 01-11: Springt zum nächsten Track
  - Track 12: Stoppt (kein Auto-Ringel)

**Navigation (Seek-Bar):**
- Timeline: 0% → 100% (linearer Fortschritt)
- **Time-Tooltip bei Hover:**
  - Zeigt exakte Zeit beim Hovern über die Bar
  - Format: `mm:ss`
  - Berechnet: `(mouseX / barWidth) * duration`
- **Drag-to-Seek:**
  - Touch + Drag auf Mobile
  - Mouse-Drag auf Desktop
  - Smooth Seeking ohne Ruckler

**Lautstärke:**
- **Regler:** 0% → 100%
- **Mute-Button:** Speichert letzte Lautstärke
- **Icons:**
  - Muted: 🔇 (fa-volume-mute)
  - Low: 🔉 (fa-volume-low)
  - High: 🔊 (fa-volume-high)
- **Persistierung:** `localStorage.deusExCT_volume`, `deusExCT_muted`

**Logik: Lineare Wiedergabe (NO Shuffle/Repeat!)**
- Album wird Track 01 → 12 abgespielt
- Nach Track 12 stoppt die Wiedergabe automatisch
- **Keine** Shuffle-, Repeat-, oder Loop-Funktionen
- Nächster Track wird pregeladen (`preloadNextTrack()`)

### 3.3 Lyrics-Integration

**LRC-Format (Standard):**
```lrc
[ti:Trackname]
[ar:Künstler]
[al:Album]
[mm:ss.cc]Lied-Text
[mm:ss.cc]Nächste Zeile
```

**Synchronisation:**
- Binary-Search für schnelle Zeilen-Findung (`binarySearchLineIndex()`)
- ±0.016s Genauigkeit (60 FPS)
- Event: `LyricsManager.setOnLyricChange(callback)`

**Anzeige: 3-Zeilen-Stack**
- **Vorherige Zeile** (`prevLine`)
  - opacity: 0.4
  - filter: blur(2px)
  - aria-hidden="true"
- **Aktuelle Zeile** (`currentLine`)
  - color: #d4af37 (Gold)
  - font-weight: 600
  - font-size: größer
  - aria-label="Aktueller Songtext"
- **Nächste Zeile** (`nextLine`)
  - opacity: 0.7
  - normal size
  - aria-hidden="true"

**Animation (Weich):**
- Fade-Out: 300ms (`.lyric-fade-out`)
- Text-Austausch: Instantan
- Fade-In: 300ms (`.lyric-fade-in`)
- Keine Motion-Sickness: `prefers-reduced-motion` Support

**Fehlerbehandlung:**
- Wenn LRC nicht geladen: Leere Lyrics-Anzeige
- Wenn LRC fehlerhaft: Graceful Degradation
- Wenn zu langsam: Binary-Search verhindert Lag

### 3.4 Zentrale Download-Funktion

**Trigger:** Cloud-Icon oben rechts (`#headerDownloadBtn`)

**Modal zeigt 3 kontextsensitive Optionen:**

#### Option 1: Aktuelles Video (HQ)
- **Bedingung:** Nur aktiv wenn:
  - `currentMode === 'video'`
  - Track lädt/spielt
- **Dateiname:** `{TrackNumber}-{Title}_Lyrics_hq.mp4`
- **Größe:** ~60-100 MB pro Video
- **Funktion:** Direkter Download via `<a download>` Tag
- **Fallback:** `DownloadManager.downloadVideoInNewTab()` (neuer Tab)

#### Option 2: Album (MP3)
- **Dateiname:** `Deus_ex_CT_Complete.zip` (exakt!)
- **Inhalt:** Alle 12 MP3-Dateien
- **Größe:** ~120-150 MB (128 Kbps × 12 Tracks × ~2-5 Min)
- **Pfad:** `assets/downloads/Deus_ex_CT_Complete.zip`
- **Funktion:** Direkter Link, Browser-Download

#### Option 3: Alle Videos (HQ)
- **Dateiname:** `Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip` (exakt!)
- **Inhalt:** Alle 12 HQ-Videos
- **Größe:** ~700-1000 MB (15-20 MB × 12)
- **Pfad:** `assets/downloads/Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip`
- **Funktion:** Direkter Link, Browser-Download

**Download-Manager Features:**
- **Concurrent Downloads:** Max 3 parallel (konfigurierbar)
- **Progress Tracking:** Bytes downloaded / Total Bytes
- **Time Estimation:** `estimateDownloadTime(fileSize, networkSpeed)`
- **History:** Letzten Downloads (localStorage)
- **Queue Management:** Downloads in Reihe

---

## 4. UI/UX Design Anforderungen

### 4.1 Layout-Konzept

**"Holy Grail" Flexbox-Spalten-Layout:**

```
┌────────────────────────────────────────┐
│  Header (fixiert, ~60px)               │  - Titel-Lauftext
│                                        │  - Modus-Schalter (Audio/Video)
├────────────────────────────────────────┤  - Download-Button
│                                        │
│  Main Content (flex: 1, scrollbar)     │  - Album-View: Playlist
│                                        │  - Player-View: Audio/Video
│                                        │
├────────────────────────────────────────┤
│  Bottom Bar (fixiert, ~80px)           │  - Progress-Bar
│                                        │  - Play/Pause, Prev, Next
│  Mini-Player (fixiert, ~60px)          │  - Volume Control
│  (nur wenn playing)                    │
└────────────────────────────────────────┘
```

### 4.2 Responsivität & Video-Darstellung

**Viewport-Größen:**
- **Mobile:** 320px - 640px (iPhone)
- **Tablet:** 640px - 1024px (iPad)
- **Desktop:** 1024px+ (Browser)

**Video-Container:**
- Nutzt `flex: 1` für maximalen verfügbaren Platz
- **Seitenverhältnis:** 4:3 oder 16:9 (abhängig von Video-Quelle)
- `object-fit: contain` verhindert Beschnitt (Letterboxing/Pillarboxing)
- Video bleibt immer **vollständig sichtbar**

**Video-Controls:**
- **Position:** Leiste **UNTERHALB** des Videos (nicht overlay!)
- **Höhe:** ~50px (Qualität-Buttons + Fullscreen-Button)
- **Hintergrund:** Semi-transparent schwarz
- **Sticky:** Bleibt sichtbar auch wenn gescrollt

### 4.3 Visueller Stil

**Thema:**
- **Dark Mode:** Hintergrund #000000, Text #ffffff
- **Gold-Akzente:** #d4af37 (aktive Buttons, aktuelle Lyrics, Hover-States)
- **Kontrast:** WCAG AA minimum (4.5:1 für Text)

**Effekte:**
- **Glassmorphism:** Blur + Transparenz auf Bars/Modals
  - `backdrop-filter: blur(10px)`
  - `background: rgba(0, 0, 0, 0.8)`
- **Animationen:** Smooth CSS-Transitions
  - Play-Button rotation: 200ms
  - Lyrics-Wechsel: 300ms Fade
  - Modal-Entrance: 150ms Slide-Up

**Schrift:**
- **Font:** Inter (Google Fonts)
- **Gewichte:** 400 (normal), 500 (medium), 600 (bold), 700 (extra bold)
- **Größen:** 14px (small), 16px (normal), 18px (large), 24px (heading)

---

## 5. Technische Anforderungen

### 5.1 Tech-Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **KEINE Frameworks:** Kein React, Vue, Angular
- **Modularisierung:** Revealing Module Pattern (Closure-basiert)
- **Build-Tools:** Keine (kein Webpack, kein Babel)
- **Mindestversion:** IE 11 **NICHT** unterstützt (ES6)

### 5.2 Browser-APIs

**Erforderlich:**
- **HTML5 Media API:** `<audio>`, `<video>` mit Events
- **Fullscreen API:** `requestFullscreen()` + Fallbacks
- **Fetch API:** CORS-enabled
- **LocalStorage:** Persistierung (5-10 MB pro Origin)
- **RequestAnimationFrame:** Smooth Updates

**Optional aber implementiert:**
- **Media Session API:** Sperrbildschirm-Controls
- **Network Information API:** Adaptive Quality
- **Promise API:** Async Operations

### 5.3 Progressive Web App (PWA)

**manifest.json:**
```json
{
  "name": "Deus ex CT - Das Album",
  "short_name": "Deus ex CT",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "assets/images/00-Albumcover.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "assets/images/00-Albumcover.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

**Installation:**
- **iOS:** Share → Zum Startbildschirm
- **Android:** Menu → Zum Startbildschirm
- **Desktop:** Browser-Install-Prompt (Chrome/Edge)

**Offline-Funktionalität:** **ENTFERNT in v11.0**
- Kein Service Worker mehr
- Nur HTTP-Caching via `.htaccess`
- Bessere Zuverlässigkeit

### 5.4 Cache-Strategie (v11.0)

**HTTP-Header (via `.htaccess`):**

```apache
# HTML: IMMER neu laden
Cache-Control: max-age=0, must-revalidate

# JS/CSS: 1 Jahr (da versioniert)
Cache-Control: max-age=31536000, immutable

# Medien (MP3/MP4): 1 Jahr
Cache-Control: max-age=31536000, immutable

# manifest.json: 1 Stunde
Cache-Control: max-age=3600
```

**Versionierung (Timestamp-basiert):**
```javascript
var BUILD_VERSION = '11.0';
var BUILD_TIMESTAMP = Math.floor(Date.now() / 1000);
var ASSET_VERSION = BUILD_VERSION + '.' + BUILD_TIMESTAMP;
// Script-URLs: js/app.js?v=11.0.1672531200
```

**Client-Side Cleanup (index.html):**
- IndexedDB: Alle Datenbanken löschen
- LocalStorage: Nicht clearen (Player-State speichern)
- Browser Caches: Via Caches API
- Service Workers: Alle deregistrieren

---

## 6. Mobile-spezifische Anforderungen

### 6.1 iOS-Optimierungen

**User-Gesture Context:**
- Play wird erst nach Tap aktiviert
- `setupUserInteractionDetection()` in PlayerEngine
- Bei `NotAllowedError`: `pendingPlayRequest = true`
- Nächster Tap wird gequeued

**Stall-Recovery (Exponential Backoff):**
- Delays: 500ms → 1000ms → 2000ms → 4000ms
- Nur wenn `playbackState === PLAYING`
- Nur für aktuellen Track (Track-ID Check)
- Max 4 Retries pro Stall

**readyState Prüfung:**
- Event-Listener VOR `.load()` setzen
- readyState nach load() prüfen (`readyState >= 3`)
- Handler sofort aufrufen wenn bereits bereit

**Fullscreen:**
- Native `requestFullscreen()` + `webkitEnterFullscreen()` Fallback
- Portrait-Mode wird NICHT erzwungen
- Escape-Key beendet Fullscreen

### 6.2 Android-Optimierungen

**CORS-Support:**
- `crossorigin="anonymous"` auf ALL Media-Elementen
- `.htaccess`: `Header set Access-Control-Allow-Origin "*"`

**Video-Attribute (x5-Player):**
- `playsinline` + `webkit-playsinline` + `x5-playsinline`
- `x5-video-player-type="h5"`
- `x5-video-player-fullscreen="false"`

**Error-Handling:**
- `NotAllowedError`: Pending-Play setzen
- `AbortError`: Stille Behandlung (User navigated away)
- `NetworkError`: Retry mit Exponential Backoff

### 6.3 Netzwerk-Handling

**Adaptive Quality:**
```javascript
if (navigator.connection.saveData) currentQuality = 'low';
else if (effectiveType === '3g') currentQuality = 'low';
else if (downlink < 1.5 Mbps) currentQuality = 'low';
else if (downlink < 5 Mbps) currentQuality = 'mid';
else currentQuality = 'mid';
```

**Retry-Logic:**
- PlaybackAttempts: Max 5
- Delays: 100ms × (1.5 ^ attempt)
- Stall-Recovery: 4 Stufen (500ms-4s)

---

## 7. Abnahmekriterien (v11.0)

| Kriterium | Status | Implementiert |
|-----------|--------|---------------|
| ✅ Kein Shuffle/Repeat | ERFÜLLT | Nur lineare Wiedergabe |
| ✅ Video-Controls nicht überlagert | ERFÜLLT | `.video-external-controls` unter Video |
| ✅ Lyrics weich animiert | ERFÜLLT | 300ms Fade-Out/Fade-In |
| ✅ Download-Modal kontextsensitiv | ERFÜLLT | Option 1 nur bei Video |
| ✅ Tooltip auf Progress-Bar | ERFÜLLT | `#timeTooltip` mit `mm:ss` |
| ✅ PWA-Installation | ERFÜLLT | manifest.json + standalone |
| ✅ Offline-Funktionalität | ENTFERNT | v11.0: Kein SW mehr |
| ✅ Mobile-Optimierungen | ERFÜLLT | iOS Gesture, Android CORS, Adaptive Quality |
| ✅ Error-Recovery | ERFÜLLT | Stall-Recovery, Playback-Retry, Mode-Fallback |
| ✅ Performance | ERFÜLLT | <2s Page-Load, <1s Audio-Start, <3s Video-Start |
| ✅ Media Session API | ERFÜLLT | Sperrbildschirm-Controls |
| ✅ Fullscreen API | ERFÜLLT | Alle 5 Browser-Fallbacks |
| ✅ Cache-Strategy | ERFÜLLT | Zero-Cache HTML, 1-Jahr Assets |
| ✅ Keyboard-Shortcuts | ERFÜLLT | Space, Pfeile, F, Esc, M |
| ✅ Accessibility (WCAG AA) | ERFÜLLT | ARIA-Labels, Semantic HTML, Screen-Reader |

---

## 8. Testing-Checkliste (Production-Ready)

### Browser-Kompatibilität
- [ ] Chrome 90+ (Desktop & Android)
- [ ] Firefox 88+ (Desktop & Android)
- [ ] Safari 14+ (Desktop & iOS)
- [ ] Edge 90+ (Desktop)
- [ ] Samsung Internet 15+ (Android)

### Funktionalität
- [ ] Audio-Modus: Hintergrund-Video läuft + Lyrics sync
- [ ] Video-Modus: Qualitäts-Wechsel funktioniert
- [ ] Lyrics: Synchronisieren mit ±0.016s Genauigkeit
- [ ] Downloads: Alle 3 Optionen funktionieren
- [ ] Keyboard: Space, Pfeile, F, Esc, M alle funktional
- [ ] Media Session: Sperrbildschirm-Controls funktionieren
- [ ] Fullscreen: Alle Fallbacks funktionieren

### Performance
- [ ] Page-Load: <2 Sekunden
- [ ] Audio-Start: <1 Sekunde
- [ ] Video-Start: <3 Sekunden (je nach Netzwerk)
- [ ] Memory: Keine Leaks (DevTools)
- [ ] FPS: 60 FPS bei Animationen

### PWA
- [ ] iOS: App auf Homescreen installierbar
- [ ] Android: App auf Homescreen installierbar
- [ ] Offline: HTML/CSS/JS funktionieren (cached)
- [ ] Manifest: Keine Fehler (DevTools)

### Mobile-spezifisch
- [ ] iOS Safari: User-Gesture funktioniert
- [ ] iOS Safari: Stall-Recovery aktiv
- [ ] Android Chrome: CORS funktioniert
- [ ] Android Chrome: x5-Player kompatibel
- [ ] Slow 3G: Adaptive Quality aktiv

### Cache & Versionierung
- [ ] HTML: `Cache-Control: max-age=0` (DevTools)
- [ ] JS/CSS: `Cache-Control: immutable` + Versioning
- [ ] Version-Wechsel: Alle alten Caches gelöscht
- [ ] localStorage: Nur Player-State erhalten

### Barrierefreiheit
- [ ] Screen-Reader: Alle Buttons haben Labels
- [ ] Keyboard: Alle Funktionen ohne Mouse erreichbar
- [ ] Kontrast: Minimum 4.5:1 für Text
- [ ] Focus-Management: Tab-Order logisch

---

## 9. Deployment-Anleitung (Production)

### 1. Server-Anforderungen
- Apache 2.4+ mit mod_rewrite
- HTTPS (erforderlich für PWA + Media Session API)
- Mindestens 5GB Storage (Assets)
- PHP 7.4+ (optional, für Logging)

### 2. Datei-Upload
```bash
# FTP zu Server (case-sensitive!)
scp -r ./* user@host:/public_html/
```

### 3. Konfiguration
```bash
# .htaccess Rechte
chmod 644 .htaccess

# Cache-Clearing (falls nötig)
rm -rf /tmp/cloudflare_cache
service apache2 restart
```

### 4. Verifizierung
```bash
# HTTPS Check
curl -I https://deus-ex-ct.markuslurz.de/
# Sollte zeigen: Cache-Control: max-age=0

# Accept-Ranges Check
curl -I https://deus-ex-ct.markuslurz.de/assets/video/mid/01-*.mp4
# Sollte zeigen: Accept-Ranges: bytes

# manifest.json Check
curl https://deus-ex-ct.markuslurz.de/manifest.json | jq .
# Sollte JSON ohne Fehler sein
```

---

## 10. Kontakt & Support

**Bei Problemen:**
1. Prüfen Sie die Fehlerbehebungs-Sektion (siehe `Anwendungsbeschreibung.md`)
2. Nutzen Sie Browser-DevTools (F12 → Console/Network)
3. Kontaktieren Sie IONOS-Support für `.htaccess` Probleme
4. Aktivieren Sie Debug-Logging in localStorage (siehe `Technische_Dokumentation.md`)
