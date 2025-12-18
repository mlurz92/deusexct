# README Implementierung - Deus ex CT WebApp v11.0

## 🏗️ Tech-Stack & Architektur

### Technologien

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Keine Frameworks:** Reines Vanilla JS (Revealing Module Pattern)
- **Build-Tools:** Keine (Direct Serving)
- **Browser-APIs:** HTML5 Media, Fullscreen, Fetch, LocalStorage, RAF
- **Optional APIs:** Media Session, Network Information
- **Server:** Apache 2.4+ mit mod_rewrite
- **Deployment:** HTTPS (erforderlich für PWA + Media Session)

### Modularisierung (Revealing Module Pattern)

```javascript
const ModuleName = (function() {
    // Private Variablen
    let privateVar = 'nicht sichtbar';

    // Private Funktionen
    function privateFunc() {}

    // Public API (Return Object)
    return {
        publicMethod: function() {},
        publicProperty: value
    };
})();
```

**Vorteile:**
- ✅ Keine globalen Variablen
- ✅ Private/Public Scope
- ✅ Namespace-Isolation
- ✅ Keine Abhängigkeiten zwischen Modulen (lose coupling)

---

## 📦 Module & APIs

### 1. `js/playlist.js` - PlaylistManager

**Verantwortung:** Verwaltung der 12 Tracks und Playlist-State

**Datenstruktur:**
```javascript
const tracks = [
    {
        id: 1,
        number: 1,
        title: 'Oberarzt Dr. med. Placzek',
        artist: 'Oberarzt Dr. med. Placzek',
        slug: 'oberarzt-dr-med-placzek',
        duration: '02:12',
        durationSeconds: 132,
        audioSrc: 'assets/audio/01-Oberarzt_Dr_med_Placzek.mp3',
        videoSrc: {
            low: 'assets/video/low/01-Oberarzt_Dr_med_Placzek_Lyrics_low.mp4',
            mid: 'assets/video/mid/01-Oberarzt_Dr_med_Placzek_Lyrics_mid.mp4',
            high: 'assets/video/high/01-Oberarzt_Dr_med_Placzek_Lyrics_hq.mp4'
        },
        imageSrc: 'assets/images/01-Oberarzt_Dr_med_Placzek.webp',
        backgroundSrc: 'assets/video/background/01-Oberarzt_Dr_med_Placzek.mp4',
        lyricsSrc: 'assets/lyrics/01-Oberarzt_Dr_med_Placzek.lrc'
    },
    // ... 11 weitere Tracks
];

const albumInfo = {
    title: 'Deus ex CT',
    artist: 'Oberarzt Dr. med. Placzek',
    coverSrc: 'assets/images/00-Albumcover.webp',
    totalTracks: 12,
    totalDuration: '40:50',
    totalDurationSeconds: 2450,
    downloadSrc: 'assets/downloads/Deus_ex_CT_Complete.zip',
    allVideosZipSrc: 'assets/downloads/Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip'
};
```

**Public API:**

| Methode | Parameter | Returns | Beschreibung |
|---------|-----------|---------|-------------|
| `getTracks()` | - | `Array<Track>` | Alle Tracks |
| `getTrackById(id)` | `id: number` | `Track \| null` | Track nach ID |
| `getTrackByIndex(index)` | `index: number` | `Track \| null` | Track nach Index (0-11) |
| `getTrackBySlug(slug)` | `slug: string` | `Track \| null` | Track nach Slug |
| `getTrackIndex(trackId)` | `trackId: number` | `number` | Index des Tracks (-1 wenn nicht gefunden) |
| `getCurrentTrack()` | - | `Track` | Aktueller Track |
| `getCurrentIndex()` | - | `number` | Index des aktuellen Tracks |
| `setCurrentIndex(index)` | `index: number` | `boolean` | Setzt aktuellen Track (true wenn erfolgreich) |
| `getAlbumInfo()` | - | `Object` | Album-Metadaten |
| `getNextTrack()` | - | `Track \| null` | Nächster Track (null wenn Track 12) |
| `getPreviousTrack()` | - | `Track` | Vorheriger Track (oder Track 1 wenn Track 1) |
| `moveToNext()` | - | `Track \| null` | Springt zu nächstem Track |
| `moveToPrevious()` | - | `Track` | Springt zu vorherigem Track |
| `playTrackById(id)` | `id: number` | `Track \| null` | Setzt aktuellen Track nach ID |
| `playTrackBySlug(slug)` | `slug: string` | `Track \| null` | Setzt aktuellen Track nach Slug |
| `hasNextTrack()` | - | `boolean` | Gibt es einen nächsten Track? |
| `hasPreviousTrack()` | - | `boolean` | Gibt es einen vorherigen Track? |
| `getPlaylistForDisplay()` | - | `Array<Track>` | Tracks mit Display-Index + isCurrentTrack |
| `getTotalDuration()` | - | `number` | Gesamtdauer in Sekunden (2450) |
| `formatTime(seconds)` | `seconds: number` | `string` | Format: "mm:ss" |
| `formatTotalDuration()` | - | `string` | Formatierte Gesamtdauer ("40 Min. 50 Sek.") |
| `reset()` | - | `void` | Setzt currentIndex auf 0 |
| `getState()` | - | `Object` | Aktueller State (currentIndex, currentTrack) |
| `setState(state)` | `state: Object` | `void` | Setzt State (zum Restore) |
| `saveToStorage()` | - | `void` | Speichert State in localStorage |
| `loadFromStorage()` | - | `boolean` | Lädt State aus localStorage |

**localStorage Keys:**
- `deusExCT_playlistState`: `{ currentIndex: number }`

**Beispiel-Nutzung:**
```javascript
// Track laden
const track = PlaylistManager.getTrackBySlug('oberarzt-dr-med-placzek');
PlayerEngine.loadTrack(track, 'audio');

// Nächster Track
const nextTrack = PlaylistManager.getNextTrack();
if (nextTrack) {
    PlayerEngine.loadTrack(nextTrack, 'audio');
}

// State speichern/laden
PlaylistManager.saveToStorage();
PlaylistManager.loadFromStorage();
```

---

### 2. `js/lyrics.js` - LyricsManager

**Verantwortung:** LRC-Parsing, Synchronisation, 3-Zeilen-View

**LRC-Format:**
```lrc
[ti:Oberarzt Dr. med. Placzek]
[ar:Oberarzt Dr. med. Placzek]
[al:Deus ex CT]
[00:00.50]Erste Zeile des Liedes
[00:03.20]Zweite Zeile
[00:05.80]Dritte Zeile
[mm:ss.cc]Text (mm=Minuten, ss=Sekunden, cc=Centisekunden)
```

**Datenstruktur:**
```javascript
const lyrics = [
    { time: 0.50, text: 'Erste Zeile des Liedes' },
    { time: 3.20, text: 'Zweite Zeile' },
    { time: 5.80, text: 'Dritte Zeile' }
];
```

**Public API:**

| Methode | Parameter | Returns | Beschreibung |
|---------|-----------|---------|-------------|
| `loadLyrics(lrcSrc)` | `lrcSrc: string` | `Promise<void>` | Lädt LRC-Datei |
| `parseLRC(lrcText)` | `lrcText: string` | `Array<Object>` | Parst LRC-Text zu Array |
| `getLyrics()` | - | `Array<Object>` | Alle Lyric-Zeilen |
| `updateCurrentLine(currentTime)` | `currentTime: number` | `void` | Updated aktuelle Zeile basierend auf Zeit |
| `getCurrentLineIndex()` | - | `number` | Index der aktuellen Zeile |
| `getCurrentLine()` | - | `Object \| null` | Aktuelle Zeile (`{ time, text }`) |
| `getPreviousLine()` | - | `Object \| null` | Vorherige Zeile (oder null) |
| `getNextLine()` | - | `Object \| null` | Nächste Zeile (oder null) |
| `getAllLines()` | - | `Array<Object>` | Alle 3 Zeilen (prev, current, next) |
| `binarySearchLineIndex(time)` | `time: number` | `number` | Binary-Search für schnelle Zeilen-Suche |
| `setOnLyricChange(callback)` | `callback: Function` | `void` | Registriert Callback für Zeilen-Wechsel |
| `clear()` | - | `void` | Löscht aktuelle Lyrics |

**Events:**
```javascript
LyricsManager.setOnLyricChange(function(data) {
    // data = { prevLine, currentLine, nextLine, currentIndex }
    updateLyricsDisplay(data);
});
```

**Binary-Search Optimierung:**
```javascript
function binarySearchLineIndex(time) {
    let left = 0, right = lyrics.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (lyrics[mid].time <= time) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return Math.max(0, right);
}
```

**Genauigkeit:** ±0.016 Sekunden (60 FPS)

**Beispiel-Nutzung:**
```javascript
// Lyrics laden
LyricsManager.loadLyrics('assets/lyrics/01-Oberarzt_Dr_med_Placzek.lrc').then(function() {
    console.log('Lyrics geladen');
});

// Bei Zeit-Update (z.B. alle 250ms)
function onAudioTimeUpdate() {
    const currentTime = audioElement.currentTime;
    LyricsManager.updateCurrentLine(currentTime);
}

// Callback registrieren
LyricsManager.setOnLyricChange(function(data) {
    document.getElementById('prevLyric').textContent = data.prevLine ? data.prevLine.text : '';
    document.getElementById('currentLyric').textContent = data.currentLine.text;
    document.getElementById('nextLyric').textContent = data.nextLine ? data.nextLine.text : '';
});
```

---

### 3. `js/player.js` - PlayerEngine

**Verantwortung:** Core Audio/Video Control, State Management, Error Recovery

**State Machine (8 States):**
```
STOPPED → LOADING → READY → PLAYING
                  ↘      ↙
                   PAUSED
                   SEEKING
                   STALLED
                   ERROR
```

**Error Types:**
- `NotAllowedError`: User-Gesture erforderlich (iOS)
- `AbortError`: User navigated away
- `NetworkError`: Netzwerkfehler
- `DecodeError`: Video-Dekodierung fehlgeschlagen
- `NotSupportedError`: Format nicht unterstützt
- `UnknownError`: Unbekannter Fehler

**Public API (Auswahl):**

| Methode | Parameter | Returns | Beschreibung |
|---------|-----------|---------|-------------|
| `init()` | - | `boolean` | Initialisiert PlayerEngine (MUSS VOR anderen Methoden aufgerufen werden) |
| `loadTrack(track, mode)` | `track: Object, mode: 'audio'\|'video'` | `Promise<void>` | Lädt Track (Audio oder Video) |
| `play()` | - | `Promise<void>` | Startet Wiedergabe |
| `pause()` | - | `void` | Pausiert Wiedergabe |
| `togglePlayPause()` | - | `Promise<void>` | Toggle Play/Pause |
| `stop()` | - | `void` | Stoppt Wiedergabe + Reset |
| `seek(time)` | `time: number` | `void` | Springt zu Zeit (in Sekunden) |
| `seekPercent(percent)` | `percent: number (0-100)` | `void` | Springt zu Prozent |
| `seekRelative(seconds)` | `seconds: number` | `void` | Springt relativ (z.B. ±10 Sekunden) |
| `setVolume(volume)` | `volume: number (0-1)` | `void` | Setzt Lautstärke |
| `getVolume()` | - | `number` | Aktuelle Lautstärke |
| `mute()` | - | `void` | Stumm |
| `unmute()` | - | `void` | Unmute |
| `toggleMute()` | - | `void` | Toggle Mute |
| `isMuted()` | - | `boolean` | Ist stumm? |
| `switchMode(mode, preservePos)` | `mode: 'audio'\|'video', preservePos: boolean` | `Promise<void>` | Wechselt Modus (Audio ↔ Video) |
| `setQuality(quality, preservePos)` | `quality: 'low'\|'mid'\|'high', preservePos: boolean` | `void` | Setzt Video-Qualität |
| `getQuality()` | - | `string` | Aktuelle Qualität |
| `getCurrentTime()` | - | `number` | Aktuelle Wiedergabe-Position (Sekunden) |
| `getDuration()` | - | `number` | Gesamtdauer Track (Sekunden) |
| `getProgress()` | - | `number (0-1)` | Fortschritt (0.0 bis 1.0) |
| `getRemainingTime()` | - | `number` | Restzeit (Sekunden) |
| `getIsPlaying()` | - | `boolean` | Wird gerade abgespielt? |
| `getCurrentMode()` | - | `'audio'\|'video'` | Aktueller Modus |
| `getCurrentTrack()` | - | `Object \| null` | Aktueller Track |
| `formatTime(seconds)` | `seconds: number` | `string` | Formatiert Zeit zu "mm:ss" |
| `enterFullscreen()` | - | `Promise<void>` | Startet Fullscreen |
| `exitFullscreen()` | - | `Promise<void>` | Beendet Fullscreen |
| `toggleFullscreen()` | - | `Promise<void>` | Toggle Fullscreen |
| `isFullscreen()` | - | `boolean` | Ist im Fullscreen? |
| `setPlaybackRate(rate)` | `rate: number (0.25-4)` | `void` | Setzt Wiedergabe-Geschwindigkeit |
| `getPlaybackRate()` | - | `number` | Aktuelle Wiedergabe-Geschwindigkeit |
| `on(event, callback)` | `event: string, callback: Function` | `void` | Registriert Event-Listener |
| `off(event, callback)` | `event: string, callback: Function` | `void` | Entfernt Event-Listener |
| `getPlaybackState()` | - | `string` | Aktueller State (STOPPED, LOADING, PLAYING, etc.) |
| `isMediaReady()` | - | `boolean` | Sind Media-Elemente bereit? |
| `destroy()` | - | `void` | Cleanup (vor Unload) |

**Events:**
- `play`: Wiedergabe gestartet
- `pause`: Wiedergabe pausiert
- `timeupdate`: Zeit aktualisiert (ca. alle 250ms)
- `ended`: Track zu Ende
- `error`: Fehler aufgetreten
- `loadstart`: Laden begonnen
- `canplay`: Kann abgespielt werden
- `waiting`: Warten auf Daten
- `seeking`: Seek begonnen
- `seeked`: Seek abgeschlossen
- `volumechange`: Lautstärke geändert
- `modechange`: Modus geändert (Audio → Video)
- `qualitychange`: Qualität geändert
- `durationchange`: Dauer aktualisiert
- `fullscreenchange`: Fullscreen-Status geändert

**Mobile-spezifische Optimierungen:**

```javascript
// iOS User-Gesture Context
function setupUserInteractionDetection() {
    document.addEventListener('touchstart', function() {
        userHasInteracted = true;
        // Jetzt funktioniert play() ohne Fehler
    });
}

// Stall-Recovery (Exponential Backoff)
function handleMediaStall() {
    if (stallRetryCount < 4) {
        const delay = [500, 1000, 2000, 4000][stallRetryCount];
        stallRetryCount++;
        setTimeout(function() {
            performPlaySync();
        }, delay);
    }
}

// readyState Prüfung
if (audioElement.readyState >= 3) {
    // Bereits bereit, kann abspielen
    performPlaySync();
}
```

**Beispiel-Nutzung:**
```javascript
// Player initialisieren
PlayerEngine.init();

// Track laden und abspielen
const track = PlaylistManager.getCurrentTrack();
PlayerEngine.loadTrack(track, 'audio').then(function() {
    PlayerEngine.play().catch(function(e) {
        if (e.name === 'NotAllowedError') {
            console.log('Warte auf User-Gesture (iOS)');
            // Wird automatisch bei nächstem Tap aufgerufen
        }
    });
});

// Event-Listener
PlayerEngine.on('timeupdate', function() {
    updateProgressBar(PlayerEngine.getProgress());
    LyricsManager.updateCurrentLine(PlayerEngine.getCurrentTime());
});

PlayerEngine.on('error', function(data) {
    console.error('Playback Error:', data);
    showToast('Wiedergabefehler: ' + data.errorCode);
});

// Fullscreen
PlayerEngine.on('fullscreenchange', function() {
    console.log('Fullscreen:', PlayerEngine.isFullscreen());
});
```

---

### 4. `js/mediasession.js` - Media Session Integration

**Verantwortung:** Sperrbildschirm-Controls, Metadaten, Smartwatch-Integration

**Public API:**

| Methode | Parameter | Returns | Beschreibung |
|---------|-----------|---------|-------------|
| `init()` | - | `boolean` | Initialisiert Media Session |
| `setMetadata(track)` | `track: Object` | `void` | Setzt Track-Metadaten für Sperrbildschirm |
| `setPlaybackState(state)` | `state: 'playing'\|'paused'\|'stopped'` | `void` | Setzt Playback-State |
| `updatePositionState(currentTime, duration)` | `currentTime: number, duration: number` | `void` | Updated Position auf Sperrbildschirm |
| `setActionHandler(action, callback)` | `action: string, callback: Function` | `void` | Registriert Action-Handler |

**Actions:**
- `play`: Play-Button gedrückt
- `pause`: Pause-Button gedrückt
- `nexttrack`: Nächster Track
- `previoustrack`: Vorheriger Track
- `seekto`: Seek zu Position (mit `details.seekTime`)

**Metadata-Format:**
```javascript
MediaSessionManager.setMetadata({
    title: 'Oberarzt Dr. med. Placzek',
    artist: 'Oberarzt Dr. med. Placzek',
    album: 'Deus ex CT',
    artwork: [
        {
            src: 'assets/images/01-Oberarzt_Dr_med_Placzek.webp',
            sizes: '512x512',
            type: 'image/webp'
        }
    ]
});
```

**Beispiel-Nutzung:**
```javascript
MediaSessionManager.init();

// Bei Track-Wechsel
MediaSessionManager.setMetadata(currentTrack);

// Bei Play/Pause
PlayerEngine.on('play', function() {
    MediaSessionManager.setPlaybackState('playing');
});

PlayerEngine.on('pause', function() {
    MediaSessionManager.setPlaybackState('paused');
});

// Bei Time-Update
PlayerEngine.on('timeupdate', function() {
    MediaSessionManager.updatePositionState(
        PlayerEngine.getCurrentTime(),
        PlayerEngine.getDuration()
    );
});

// Action-Handler
MediaSessionManager.setActionHandler('play', function() {
    PlayerEngine.play();
});

MediaSessionManager.setActionHandler('nexttrack', function() {
    PlaylistManager.moveToNext();
    // ... update und play
});
```

---

### 5. `js/download.js` - DownloadManager

**Verantwortung:** Download-Management, Progress, History

**Public API:**

| Methode | Parameter | Returns | Beschreibung |
|---------|-----------|---------|-------------|
| `init()` | - | `void` | Initialisiert DownloadManager |
| `downloadCurrentVideoHQ()` | - | `void` | Startet Download aktuelles HQ-Video |
| `downloadAlbumZip()` | - | `void` | Startet Download Album-ZIP |
| `downloadAllVideosZip()` | - | `void` | Startet Download All-Videos-ZIP |
| `addToQueue(download)` | `download: Object` | `void` | Fügt Download zur Queue hinzu |
| `getActiveDownloads()` | - | `Array<Object>` | Aktive Downloads |
| `getDownloadHistory()` | - | `Array<Object>` | Download-Verlauf (localStorage) |
| `cancelDownload(downloadId)` | `downloadId: string` | `void` | Bricht Download ab |
| `setOnProgressCallback(callback)` | `callback: Function` | `void` | Registriert Progress-Callback |
| `setOnCompleteCallback(callback)` | `callback: Function` | `void` | Registriert Complete-Callback |
| `setOnErrorCallback(callback)` | `callback: Function` | `void` | Registriert Error-Callback |

**Download-Objekt:**
```javascript
{
    id: 'unique-id',
    name: 'Oberarzt_Dr_med_Placzek_Lyrics_hq.mp4',
    size: 95728640,  // Bytes
    url: 'assets/video/high/01-Oberarzt_Dr_med_Placzek_Lyrics_hq.mp4',
    downloaded: 47864320,  // Bytes
    progress: 50,  // Prozent
    status: 'downloading',  // downloading, completed, failed, cancelled
    startTime: 1672531200,  // Unix timestamp
    estimatedTime: 120  // Sekunden
}
```

**localStorage Keys:**
- `deusExCT_downloadHistory`: `Array<{ name, size, timestamp }>`

**Concurrent Downloads:** Max 3 parallel

**Beispiel-Nutzung:**
```javascript
DownloadManager.init();

// Download starten
DownloadManager.downloadCurrentVideoHQ();

// Progress-Callback
DownloadManager.setOnProgressCallback(function(download) {
    console.log('Progress:', download.progress + '%');
    updateProgressBar(download.progress);
});

// Complete-Callback
DownloadManager.setOnCompleteCallback(function(download) {
    showToast('Download abgeschlossen: ' + download.name);
});

// Error-Callback
DownloadManager.setOnErrorCallback(function(error, download) {
    showToast('Download fehlgeschlagen: ' + download.name);
});
```

---

### 6. `js/app.js` - App Controller

**Verantwortung:** UI-Management, Event-Handling, View-Routing

**Public API:**

| Methode | Parameter | Returns | Beschreibung |
|---------|-----------|---------|-------------|
| `init()` | - | `void` | Initialisiert App (MUSS VOR PlayerEngine aufgerufen werden) |
| `showView(view)` | `view: 'album'\|'player'\|'video'` | `void` | Wechselt View |
| `playTrack(track, mode)` | `track: Object, mode: string` | `void` | Spielt Track ab |
| `showToast(message)` | `message: string` | `void` | Zeigt Toast-Nachricht |

**Views:**
- `album`: Album-View mit Tracklist
- `player`: Audio-Player mit Lyrics
- `video`: Video-Player mit Qualitäts-Optionen

**Event-Binding:**
```javascript
setupEventListeners() {
    // Play-Button
    playPauseBtn.addEventListener('click', handlePlayPauseClick);

    // Previous/Next
    prevBtn.addEventListener('click', handlePrevClick);
    nextBtn.addEventListener('click', handleNextClick);

    // Seek-Bar
    progressBar.addEventListener('mousedown', startSeek);
    progressBar.addEventListener('touchstart', startSeek);
    document.addEventListener('mousemove', updateSeek);
    document.addEventListener('touchmove', updateSeek);
    document.addEventListener('mouseup', endSeek);
    document.addEventListener('touchend', endSeek);

    // Volume
    volumeBar.addEventListener('input', handleVolumeChange);
    volumeMuteBtn.addEventListener('click', handleMuteClick);

    // Mode-Switch
    audioModeBtn.addEventListener('click', function() {
        PlayerEngine.switchMode('audio', true);
    });
    videoModeBtn.addEventListener('click', function() {
        PlayerEngine.switchMode('video', true);
    });

    // Quality-Buttons (Video-Mode)
    qualityButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const quality = btn.dataset.quality;
            PlayerEngine.setQuality(quality, true);
        });
    });

    // Fullscreen
    fullscreenBtn.addEventListener('click', function() {
        PlayerEngine.toggleFullscreen();
    });

    // Downloads
    downloadAllVideosBtn.addEventListener('click', function() {
        showDownloadModal();
    });
    downloadAlbumBtn.addEventListener('click', function() {
        showDownloadModal();
    });

    // Keyboard-Shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Tracklist-Clicks
    playlistItems.forEach(function(item) {
        item.addEventListener('click', function() {
            const trackId = parseInt(item.dataset.trackId);
            const track = PlaylistManager.getTrackById(trackId);
            playTrack(track, 'audio');
            showView('player');
        });
    });

    // Window-Events
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('beforeunload', function() {
        PlayerEngine.pause();
        PlaylistManager.saveToStorage();
    });
}
```

**Beispiel-Nutzung:**
```javascript
// App starten
App.init();

// Track abspielen
App.playTrack(track, 'audio');

// View wechseln
App.showView('player');

// Nachricht zeigen
App.showToast('Track geladen!');
```

---

### 7. `js/playlist.js` - Tracklist-Rendering

**HTML-Rendering:**
```javascript
function renderPlaylist() {
    const playlistContainer = document.getElementById('playlistContainer');
    const displayList = PlaylistManager.getPlaylistForDisplay();

    let html = '<div class="playlist">';
    displayList.forEach(function(track) {
        html += `
            <div class="playlist-item ${track.isCurrentTrack ? 'active' : ''}"
                 data-track-id="${track.id}"
                 data-track-slug="${track.slug}">
                <div class="playlist-item-number">${String(track.number).padStart(2, '0')}</div>
                <div class="playlist-item-info">
                    <div class="playlist-item-title">${track.title}</div>
                    <div class="playlist-item-duration">${track.duration}</div>
                </div>
                <div class="playlist-item-artwork">
                    <img src="${track.imageSrc}" alt="${track.title}">
                </div>
            </div>
        `;
    });
    html += '</div>';

    playlistContainer.innerHTML = html;
}
```

---

### 8. `js/lyrics.js` - Lyrics-Rendering (3-Zeilen-View)

**HTML-Struktur:**
```html
<div class="lyrics-container">
    <div class="lyric-line prev-lyric" id="prevLyric" aria-hidden="true"></div>
    <div class="lyric-line current-lyric" id="currentLyric" aria-label="Aktueller Songtext"></div>
    <div class="lyric-line next-lyric" id="nextLyric" aria-hidden="true"></div>
</div>
```

**Rendering mit Animation:**
```javascript
function updateLyricsDisplay(data) {
    const prevLyric = document.getElementById('prevLyric');
    const currentLyric = document.getElementById('currentLyric');
    const nextLyric = document.getElementById('nextLyric');

    // Fade-Out Animation
    currentLyric.classList.add('lyric-fade-out');

    setTimeout(function() {
        prevLyric.textContent = data.prevLine ? data.prevLine.text : '';
        currentLyric.textContent = data.currentLine.text;
        nextLyric.textContent = data.nextLine ? data.nextLine.text : '';

        // Fade-In Animation
        currentLyric.classList.remove('lyric-fade-out');
        currentLyric.classList.add('lyric-fade-in');

        setTimeout(function() {
            currentLyric.classList.remove('lyric-fade-in');
        }, 300);
    }, 150);
}
```

---

## 🔄 Datenfluss & Event-System

### Init-Sequenz

```
1. HTML lädt
   ↓
2. index.html Cache-Clear Script läuft
   • Cleanup: IndexedDB, LocalStorage, Browser Caches
   • Version wird aktualisiert
   ↓
3. Scripts laden in Reihenfolge:
   • playlist.js
   • lyrics.js
   • player.js
   • mediasession.js
   • download.js
   • app.js
   ↓
4. DOMContentLoaded Event
   ↓
5. App.init() aufgerufen
   • Wartet auf PlayerEngine.init()
   • Max 5 Sekunden Timeout
   • Garantierter Fallback nach 5s
   ↓
6. PlayerEngine.init() aufgerufen
   • detectPlatform()
   • ensureMediaElements()
   • cacheElements()
   • configureMediaElements()
   • setupUserInteractionDetection()
   • setupAudioListeners()
   • setupVideoListeners()
   ↓
7. App.continueInit() aufgerufen
   • cacheElements()
   • setupEventListeners()
   • setupPlayerCallbacks()
   • setupLyricsCallbacks()
   • setupMediaSession()
   • renderPlaylist()
   • restoreState() (aus localStorage)
   • handleInitialRoute()
   • startVisualUpdateLoop()
   ↓
8. App ready!
```

### Playback-Sequenz (Audio-Modus)

```
User klickt Play-Button
   ↓
handlePlayPauseClick()
   ↓
PlaylistManager.getCurrentTrack() → Track
   ↓
PlayerEngine.loadTrack(track, 'audio')
   • loadAudioTrack(track)
   • audioElement.src = track.audioSrc
   • audioElement.addEventListener('canplay', ...)
   • audioElement.load()
   ↓
'canplay' Event wirft
   ↓
LyricsManager.loadLyrics(track.lyricsSrc)
   • fetch(lyricsSrc)
   • parseLRC()
   ↓
backgroundVideoElement.src = track.backgroundSrc
backgroundVideoElement.play()
   ↓
PlayerEngine.play()
   • audioElement.play()
   • playbackState = 'PLAYING'
   • Trigger 'play' Event
   ↓
audioElement 'timeupdate' Event wirft (alle ~250ms)
   ↓
App 'timeupdate' Callback:
   • updateProgressBar(progress)
   • LyricsManager.updateCurrentLine(currentTime)
   • MediaSessionManager.updatePositionState()
   ↓
LyricsManager.on('lyricchange')
   ↓
updateLyricsDisplay(data)
   • Fade-Out aktuelle Zeile
   • Update DOM mit neuer Zeile
   • Fade-In neue Zeile
   ↓
Lyrics-Animation 300ms
```

### Mode-Switch-Sequenz (Audio → Video)

```
User klickt "Video-Modus"
   ↓
PlayerEngine.switchMode('video', true)
   • Speichert currentTime = audioElement.currentTime
   • Pausiert Audio
   • Lädt Video für Qualität
   ↓
loadVideoTrack(track, quality)
   • videoElement.src = track.videoSrc[quality]
   • videoElement.addEventListener('canplay', ...)
   • videoElement.load()
   ↓
'canplay' Event wirft
   ↓
currentMode = 'video'
   • Trigger 'modechange' Event
   • updatePlayerLayout('video')
   ↓
videoElement.currentTime = savedTime
   ↓
PlayerEngine.play()
   • videoElement.play()
   ↓
Video spielt ab
   • Audio kommt aus Video-Datei
   • Keine separaten Lyrics (eingebunden im Video)
```

### Quality-Switch-Sequenz (MID → HQ)

```
User klickt "HQ"-Button
   ↓
PlayerEngine.setQuality('high', true)
   • Speichert currentTime = videoElement.currentTime
   • Pausiert Video
   • currentQuality = 'high'
   ↓
loadVideoTrack(track, 'high')
   • videoElement.src = track.videoSrc.high
   • videoElement.load()
   ↓
'canplay' Event wirft
   ↓
videoElement.currentTime = savedTime
   ↓
PlayerEngine.play()
   • videoElement.play()
   ↓
HQ-Video spielt ab
   • Re-buffering: 200-500ms
```

---

## 🚀 Deployment-Anleitung

### Vorbereitung

**1. Assets vorbereiten:**
```bash
# Verzeichnis-Struktur:
assets/
├── audio/
│   └── 01-12-*.mp3 (128 Kbps)
├── downloads/
│   ├── Deus_ex_CT_Complete.zip
│   └── Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip
├── images/
│   ├── 00-Albumcover.webp (512×512px)
│   └── 01-12-*.webp
├── lyrics/
│   └── 01-12-*.lrc (UTF-8, [mm:ss.cc]Format)
└── video/
    ├── background/
    │   └── 01-12-*.mp4 (muted, looped)
    ├── low/
    │   └── 01-12-*_Lyrics_low.mp4 (360p)
    ├── mid/
    │   └── 01-12-*_Lyrics_mid.mp4 (720p)
    └── high/
        └── 01-12-*_Lyrics_hq.mp4 (1080p)
```

**2. Dateien hochladen:**
```bash
# Via FTP/SCP (case-sensitive!)
scp -r ./* user@host:/public_html/

# Via Git
git push production main
```

**3. Konfiguration prüfen:**
```bash
# .htaccess Rechte
chmod 644 .htaccess

# manifest.json Rechte
chmod 644 manifest.json

# Cache clearen (optional)
rm -rf /tmp/cloudflare_cache
service apache2 restart
```

### Verifizierung

**HTTPS & Cache-Header:**
```bash
curl -I https://deus-ex-ct.markuslurz.de/
# Sollte zeigen:
# HTTP/2 200
# Cache-Control: max-age=0, must-revalidate

curl -I https://deus-ex-ct.markuslurz.de/js/app.js
# Sollte zeigen:
# Cache-Control: max-age=31536000, immutable
```

**Accept-Ranges (für Video-Seeking):**
```bash
curl -I https://deus-ex-ct.markuslurz.de/assets/video/mid/01-*.mp4
# Sollte zeigen:
# Accept-Ranges: bytes
```

**CORS-Header:**
```bash
curl -H "Origin: https://deus-ex-ct.markuslurz.de" -I \
  https://deus-ex-ct.markuslurz.de/assets/downloads/*.zip
# Sollte zeigen:
# Access-Control-Allow-Origin: *
```

**manifest.json:**
```bash
curl https://deus-ex-ct.markuslurz.de/manifest.json | jq .
# Sollte valid JSON sein
```

**Audio-Datei:**
```bash
curl -I https://deus-ex-ct.markuslurz.de/assets/audio/01-*.mp3
# Sollte zeigen:
# Content-Type: audio/mpeg
# Content-Length: ~2800000 (2.8 MB)
```

---

## 🔧 Debugging-Guide

### Browser DevTools

**Console (F12 → Console):**
```javascript
// Player-State prüfen
PlayerEngine.getPlaybackState()
PlayerEngine.getIsPlaying()
PlayerEngine.getCurrentTime()
PlayerEngine.getDuration()

// Track-Info prüfen
PlaylistManager.getCurrentTrack()
PlaylistManager.getCurrentIndex()

// Lyrics prüfen
LyricsManager.getLyrics()
LyricsManager.getCurrentLine()

// Volume prüfen
PlayerEngine.getVolume()
PlayerEngine.isMuted()

// localStorage prüfen
localStorage.getItem('deusExCT_volume')
localStorage.getItem('deusExCT_quality')
localStorage.getItem('deusExCT_playlistState')
```

**Network (F12 → Network):**
```
1. Lade Seite neu (Ctrl+Shift+R)
2. Prüfe:
   • index.html: Cache-Control: max-age=0
   • player.js: 304 Not Modified (wenn cached)
   • Audio-Datei: Content-Length, Accept-Ranges
   • Video-Datei: HTTP 206 Partial Content (wenn seeked)
3. Prüfe auf Fehler (rot):
   • CORS-Fehler?
   • 404 Fehler?
   • Timeouts?
```

**Performance (F12 → Performance):**
```
1. Starte Recording (Ctrl+Shift+E)
2. Klicke Play
3. Beobachte 5 Sekunden
4. Stoppe Recording
5. Prüfe:
   • Main Thread: Sollte < 80% sein
   • FPS: Sollte 60 sein
   • Memory: Sollte nicht steigen
```

**Storage (F12 → Application → Storage):**
```
LocalStorage:
• deusExCT_volume
• deusExCT_muted
• deusExCT_quality
• deusExCT_playerState
• deusExCT_playlistState
• deusExCT_buildVersion
• deusExCT_buildTimestamp
```

### Häufige Debugging-Szenarien

**Szenario 1: Video lädt nicht**
```javascript
// DevTools Console:
PlayerEngine.getAudioElement().src
PlayerEngine.getVideoElement().src

// Prüfe:
// 1. Pfad korrekt?
// 2. Datei existiert?
// 3. CORS-Header?

// Test:
fetch('assets/video/mid/01-*.mp4', { method: 'HEAD' })
    .then(r => console.log(r.status, r.headers.get('Accept-Ranges')))
    .catch(e => console.error(e))
```

**Szenario 2: Lyrics synchronisieren nicht**
```javascript
// DevTools Console:
LyricsManager.getLyrics().length  // Sollte > 0 sein
LyricsManager.getCurrentLine()
LyricsManager.binarySearchLineIndex(5)  // Zeile bei 5 Sekunden

// Prüfe:
// 1. LRC-Datei geladen?
// 2. Format korrekt [mm:ss.cc]?
// 3. UTF-8 encoding?

// Test:
fetch('assets/lyrics/01-*.lrc')
    .then(r => r.text())
    .then(t => console.log(t.substring(0, 100)))
    .catch(e => console.error(e))
```

**Szenario 3: Play funktioniert nicht (iOS)**
```javascript
// DevTools Console (Mobile Safari):
PlayerEngine.getUserHasInteracted()  // Sollte true sein nach Tap
PlayerEngine.getPlaybackState()

// Test:
// 1. Tap auf Seite (um User-Gesture zu setzen)
// 2. Dann Play-Button klicken
// 3. Sollte funktionieren

// Wenn nicht:
// Prüfe Cache (Settings → Safari → Clear History and Website Data)
```

**Szenario 4: Download funktioniert nicht**
```javascript
// DevTools Console:
DownloadManager.getActiveDownloads()
DownloadManager.getDownloadHistory()

// Test:
fetch('assets/downloads/Deus_ex_CT_Complete.zip', { method: 'HEAD' })
    .then(r => console.log(r.status, r.headers.get('Content-Length')))
    .catch(e => console.error(e))
```

### Netzwerk-Throttling testen

**Chrome DevTools → Network → Throttling:**
```
No throttling      ← Desktop
Fast 3G (5 Mbps)   ← Gutes Mobil
Slow 3G (400 Kbps) ← Schlechtes Mobil
Offline            ← Kein Netzwerk
```

**Test-Prozedur:**
```
1. Setze Throttling auf "Slow 3G"
2. Starte Seite neu (Ctrl+Shift+R)
3. Beobachte:
   • Page-Load Zeit
   • Audio-Start Zeit
   • Video-Start Zeit
4. Prüfe auf Fehler:
   • Timeouts?
   • Stalls?
   • Failed Downloads?
```

---

## 📈 Performance-Optimierungen

### Asset-Größen optimieren

**Audio (MP3):**
```bash
# Konvertiere zu 128 Kbps (konstant)
ffmpeg -i input.wav -b:a 128k -q:a 9 output.mp3

# Größe prüfen
ls -lh output.mp3  # Sollte ~1-5 MB pro Track sein
```

**Video (MP4):**
```bash
# Konvertiere zu verschiedenen Qualitäten
# LOW (360p)
ffmpeg -i input.mov -vf scale=640:360 -b:v 300k -b:a 128k output_low.mp4

# MID (720p)
ffmpeg -i input.mov -vf scale=1280:720 -b:v 800k -b:a 128k output_mid.mp4

# HQ (1080p)
ffmpeg -i input.mov -vf scale=1920:1080 -b:v 2000k -b:a 128k output_hq.mp4

# Größe prüfen
du -h output_*.mp4  # LOW: 2-3 MB, MID: 7-8 MB, HQ: 15-20 MB
```

**Lyrics (LRC):**
```bash
# Prüfe Encoding
file *.lrc  # Sollte "UTF-8 Unicode" sein

# Konvertiere zu UTF-8 ohne BOM
iconv -f CP1252 -t UTF-8 input.lrc > output.lrc

# Prüfe Größe
wc -l output.lrc  # Sollte 20-100 Zeilen pro Track sein
```

**Artwork (webp):**
```bash
# Komprimiere webp
optiwebp -o2 input.webp -out output.webp

# Oder mit ImageMagick
convert input.jpg -quality 85 output.webp

# Größe sollte 400-512 KB sein
ls -lh output.webp
```

### JavaScript-Optimierungen

**Bundle-Größe reduzieren:**
```bash
# Minify JavaScript (optional)
npx terser js/app.js -o js/app.min.js

# Gzip komprimieren (via .htaccess)
# Bereits konfiguriert!
```

**Lazy-Loading implementieren:**
```javascript
// Nächster Track preload (bereits implementiert)
function preloadNextTrack() {
    const nextTrack = PlaylistManager.getNextTrack();
    if (nextTrack) {
        PlayerEngine.preloadTrack(nextTrack);
    }
}
```

---

## 🔌 Erweiterungen & Customization

### Neuen Track hinzufügen

**1. Track zu `js/playlist.js` hinzufügen:**
```javascript
{
    id: 13,
    number: 13,
    title: 'Neuer Track',
    artist: 'Oberarzt Dr. med. Placzek',
    slug: 'neuer-track',
    duration: '03:30',
    durationSeconds: 210,
    audioSrc: 'assets/audio/13-Neuer_Track.mp3',
    videoSrc: {
        low: 'assets/video/low/13-Neuer_Track_Lyrics_low.mp4',
        mid: 'assets/video/mid/13-Neuer_Track_Lyrics_mid.mp4',
        high: 'assets/video/high/13-Neuer_Track_Lyrics_hq.mp4'
    },
    imageSrc: 'assets/images/13-Neuer_Track.webp',
    backgroundSrc: 'assets/video/background/13-Neuer_Track.mp4',
    lyricsSrc: 'assets/lyrics/13-Neuer_Track.lrc'
}
```

**2. Assets uploaden:**
- `assets/audio/13-Neuer_Track.mp3`
- `assets/images/13-Neuer_Track.webp`
- `assets/lyrics/13-Neuer_Track.lrc`
- `assets/video/background/13-Neuer_Track.mp4`
- `assets/video/low/13-Neuer_Track_Lyrics_low.mp4`
- `assets/video/mid/13-Neuer_Track_Lyrics_mid.mp4`
- `assets/video/high/13-Neuer_Track_Lyrics_hq.mp4`

**3. Download-ZIP regenerieren:**
- Neues Track-MP3 zu `Deus_ex_CT_Complete.zip` hinzufügen
- Neue HQ-Videos zu `Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip` hinzufügen

### Custom CSS-Styling

**Dark-Mode Farben anpassen (`css/styles.css`):**
```css
:root {
    --primary-bg: #000000;
    --primary-text: #ffffff;
    --accent-color: #d4af37;  /* Gold */
    --secondary-bg: #1a1a1a;
    --border-color: #333333;
}

/* Beispiel: Accent-Farbe ändern */
:root {
    --accent-color: #ff0000;  /* Rot statt Gold */
}
```

### Custom Event-Handler

```javascript
// Neuen Event-Handler hinzufügen
PlayerEngine.on('play', function() {
    console.log('Track gestartet');
    // Custom Logik
});

PlayerEngine.on('ended', function() {
    console.log('Track zu Ende');
    // Custom Logik (z.B. Analytics)
});
```

---

## 📝 Lizenz & Credits

**Deus ex CT WebApp v11.0**
- Entwickler: Markus Lurz
- Album: Oberarzt Dr. med. Placzek
- Lizenz: Proprietary (Alle Rechte vorbehalten)

---