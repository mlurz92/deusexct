# Technische Dokumentation - Deus ex CT WebApp v11.0

## 🏗️ Architektur & Design Patterns

### Revealing Module Pattern

Die gesamte Anwendung folgt dem **Revealing Module Pattern**, einer Variation des Module Pattern mit explizit definierten Public APIs.

**Struktur:**
```javascript
const ModuleName = (function() {
    // PRIVATE Scope
    const privateVar = 'nicht global sichtbar';
    const privateArray = [];

    function privateMethod() {
        // Nur innerhalb des Moduls sichtbar
    }

    // PUBLIC Scope (Revealing)
    const publicAPI = {
        publicMethod: function() {
            // Ruft private Methoden auf
            privateMethod();
        },
        publicProperty: privateVar
    };

    return publicAPI;
})();
```

**Vorteile:**
- ✅ Keine globalen Variablen (außer ModuleName)
- ✅ Private/Public Encapsulation
- ✅ IIFE (Immediately Invoked Function Expression) für Scope
- ✅ Keine Abhängigkeiten zwischen Modulen
- ✅ Einfach zu testen und debuggen

### Modular-Abhängigkeiten (Dependency Graph)

```
┌─────────────────────────────────────────────────────────┐
│ index.html (View)                                       │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
    ┌────────────┐          ┌──────────────────┐
    │ app.js     │          │ PlayerEngine     │
    │ (Controller)          │ (player.js)      │
    └────────────┘          └──────────────────┘
        │                         │
    ┌───┴───┬───────┬───────┬────┴────┐
    ▼       ▼       ▼       ▼         ▼
 Playlist Lyrics   Media  Download  (Media
 Manager Manager  Session Manager   Elements)
(playlist (lyrics (media (download
  .js)    .js)  session .js)
                .js)
```

**Richtung des Datenflusses:**
- app.js → PlayerEngine → Media Elements
- app.js → PlaylistManager
- app.js → LyricsManager
- app.js → MediaSessionManager
- app.js → DownloadManager
- PlayerEngine → LyricsManager (intern)

**KEINE zirkulären Abhängigkeiten!**

### Initialization-Order (KRITISCH)

```
1. index.html parsed & DOM ready
   ↓
2. Cache-Clear Script (inline im head)
   • IndexedDB cleanup
   • LocalStorage backup
   • Browser Caches clear
   • Version aktualisiert
   ↓
3. Scripts in Reihenfolge:
   a) playlist.js    ← Data Layer (keine Abhängigkeiten)
   b) lyrics.js      ← Utilities (keine Abhängigkeiten)
   c) player.js      ← Core (benötigt Media Elements)
   d) mediasession.js ← Optional (benötigt Media Session API)
   e) download.js    ← Optional (benötigt Fetch API)
   f) app.js         ← Controller (benötigt ALLE anderen)
   ↓
4. DOMContentLoaded Event
   ↓
5. App.init() → PlayerEngine.init() → App.continueInit()
   ↓
6. App bereit für User-Input
```

**WICHTIG:** Wenn Reihenfolge falsch ist, werden Module nicht geladen!

---

## 💾 State Management & Datenstrukturen

### Global State (Player)

```javascript
const PlayerState = {
    currentMode: 'audio',              // 'audio' | 'video'
    playbackState: 'stopped',          // PlaybackState enum
    currentTrack: null,                // Track object | null
    currentTime: 0,                    // Sekunden
    duration: 0,                       // Sekunden
    isPlaying: false,                  // boolean
    volume: 1.0,                       // 0.0 - 1.0
    isMuted: false,                    // boolean
    lastVolume: 1.0,                   // Für Unmute
    currentQuality: 'mid',             // 'low' | 'mid' | 'high'
    isLoadingMedia: false,             // boolean
    isSeeking: false,                  // boolean
    isVideoFullscreen: false,          // boolean
    playbackRate: 1.0,                 // 0.25 - 4.0

    // Mobile-spezifisch
    isIOS: false,                      // boolean
    isAndroid: false,                  // boolean
    isMobile: false,                   // boolean
    userHasInteracted: false,          // iOS User-Gesture

    // Retry-Logic
    playbackAttempts: 0,               // counter
    stallRetryCount: 0,                // counter
    lastStallTime: 0,                  // timestamp
};
```

### PlaybackState Enum

```javascript
const PlaybackState = {
    STOPPED: 'stopped',      // Nicht spielend, Position = 0
    LOADING: 'loading',      // Media wird geladen
    READY: 'ready',          // Media kann abgespielt werden
    PLAYING: 'playing',      // Aktiv spielend
    PAUSED: 'paused',        // Pausiert, Position > 0
    SEEKING: 'seeking',      // User seeked
    STALLED: 'stalled',      // Media stalled (Puffer leer)
    ERROR: 'error'           // Fehler aufgetreten
};
```

### Track Object (Datenstruktur)

```javascript
const Track = {
    id: 1,                                      // Eindeutige ID
    number: 1,                                  // Display-Nummer
    title: 'Oberarzt Dr. med. Placzek',         // Track-Name
    artist: 'Oberarzt Dr. med. Placzek',        // Künstler
    slug: 'oberarzt-dr-med-placzek',            // URL-freundlich
    duration: '02:12',                          // Formatted string
    durationSeconds: 132,                       // In Sekunden
    audioSrc: 'assets/audio/01-*.mp3',          // MP3-Pfad
    videoSrc: {                                 // Video-Pfade nach Qualität
        low: 'assets/video/low/01-*_low.mp4',   // 360p
        mid: 'assets/video/mid/01-*_mid.mp4',   // 720p (Default)
        high: 'assets/video/high/01-*_hq.mp4'   // 1080p
    },
    imageSrc: 'assets/images/01-*.webp',         // Artwork
    backgroundSrc: 'assets/video/background/01-*.mp4',  // Loop-Video
    lyricsSrc: 'assets/lyrics/01-*.lrc'         // LRC-Datei
};
```

### Lyric Object (Datenstruktur)

```javascript
const LyricLine = {
    time: 3.20,              // Zeitstempel in Sekunden
    text: 'Zweite Zeile'     // Lyric-Text
};

const LyricsData = {
    metadata: {
        title: 'Oberarzt Dr. med. Placzek',
        artist: 'Oberarzt Dr. med. Placzek',
        album: 'Deus ex CT'
    },
    lines: [
        { time: 0.50, text: 'Erste Zeile' },
        { time: 3.20, text: 'Zweite Zeile' },
        // ... weitere Zeilen
    ]
};
```

### Download Object (Datenstruktur)

```javascript
const Download = {
    id: 'unique-id-1672531200',        // Eindeutige ID (timestamp-basiert)
    name: 'Oberarzt_Dr_med_Placzek_Lyrics_hq.mp4',  // Dateiname
    size: 95728640,                    // Bytes
    url: 'assets/video/high/01-*.mp4', // Download-URL
    downloaded: 47864320,              // Bytes downloaded
    progress: 50,                      // Prozent (0-100)
    status: 'downloading',             // downloading | completed | failed | cancelled
    startTime: 1672531200,             // Unix timestamp
    estimatedTime: 120,                // Sekunden
    error: null                        // Error object wenn failed
};
```

### localStorage Keys

```javascript
// Volume & Mute
localStorage.deusExCT_volume = '0.85';      // string (float)
localStorage.deusExCT_muted = 'false';      // string (boolean)

// Quality & Mode
localStorage.deusExCT_quality = 'mid';      // string: low | mid | high
localStorage.deusExCT_mode = 'audio';       // string: audio | video

// Playlist & Position
localStorage.deusExCT_playlistState = '{
    "currentIndex": 0,
    "currentTrack": { ... }
}';                                        // JSON

// Player Position
localStorage.deusExCT_playerState = '{
    "currentTime": 45.5,
    "trackId": 1
}';                                        // JSON

// Version-Tracking
localStorage.deusExCT_buildVersion = '11.0';          // string
localStorage.deusExCT_buildTimestamp = '1672531200'; // string (unix timestamp)

// Download-History
localStorage.deusExCT_downloadHistory = '[
    { "name": "...", "size": 95728640, "timestamp": 1672531200 }
]';                                        // JSON Array
```

---

## 🔄 Event-System & Callbacks

### PlayerEngine Event-System

**Event-Registrierung:**
```javascript
PlayerEngine.on(eventName, callback);
PlayerEngine.off(eventName, callback);
```

**Vollständige Event-Liste:**

| Event | Trigger | Daten | Beschreibung |
|-------|---------|-------|-------------|
| `play` | Nach erfolgreichem play() | - | Wiedergabe gestartet |
| `pause` | Nach pause() | - | Wiedergabe pausiert |
| `timeupdate` | Während Wiedergabe (~250ms) | `{ currentTime, duration }` | Zeit aktualisiert |
| `ended` | Nach Track-Ende | - | Track zu Ende |
| `error` | Bei Fehler | `{ errorCode, errorType }` | Fehler aufgetreten |
| `loadstart` | Beim load() aufrufen | - | Media laden begonnen |
| `canplay` | Media bereit zum Abspielen | - | Kann abgespielt werden |
| `waiting` | Puffer leer | - | Warten auf Daten |
| `seeking` | Bei seek() | `{ seekTime }` | Seek begonnen |
| `seeked` | Nach seek() abgeschlossen | - | Seek abgeschlossen |
| `volumechange` | Nach setVolume() | `{ volume }` | Lautstärke geändert |
| `mutechange` | Nach mute()/unmute() | `{ isMuted }` | Mute-Status geändert |
| `modechange` | Nach switchMode() | `{ mode }` | Modus geändert |
| `qualitychange` | Nach setQuality() | `{ quality }` | Qualität geändert |
| `durationchange` | Nach load() | `{ duration }` | Dauer aktualisiert |
| `fullscreenchange` | Nach toggleFullscreen() | `{ isFullscreen }` | Fullscreen-Status geändert |
| `ratechange` | Nach setPlaybackRate() | `{ rate }` | Geschwindigkeit geändert |

**Event-Callback-Signatur:**
```javascript
PlayerEngine.on('timeupdate', function(data) {
    console.log('Current time:', data.currentTime);
    console.log('Duration:', data.duration);
});

PlayerEngine.on('error', function(data) {
    console.error('Error code:', data.errorCode);
    console.error('Error type:', data.errorType);
});
```

### LyricsManager Event-System

```javascript
LyricsManager.setOnLyricChange(function(data) {
    // data = {
    //     prevLine: { time, text },
    //     currentLine: { time, text },
    //     nextLine: { time, text },
    //     currentIndex: number
    // }
    updateLyricsDisplay(data);
});
```

### App Event-Delegation

```javascript
// Window Events
window.addEventListener('hashchange', handleRouteChange);
window.addEventListener('beforeunload', saveState);
window.addEventListener('resize', handleResize);

// Document Events
document.addEventListener('keydown', handleKeyboardShortcuts);
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('msfullscreenchange', handleFullscreenChange);

// Media Element Events
audioElement.addEventListener('play', onAudioPlay);
audioElement.addEventListener('pause', onAudioPause);
audioElement.addEventListener('timeupdate', onAudioTimeUpdate);
audioElement.addEventListener('ended', onAudioEnded);
audioElement.addEventListener('error', onAudioError);
audioElement.addEventListener('stalled', onAudioStalled);
audioElement.addEventListener('canplay', onAudioCanPlay);

videoElement.addEventListener('play', onVideoPlay);
videoElement.addEventListener('pause', onVideoPause);
videoElement.addEventListener('timeupdate', onVideoTimeUpdate);
videoElement.addEventListener('ended', onVideoEnded);
videoElement.addEventListener('error', onVideoError);

// UI Events
playPauseBtn.addEventListener('click', handlePlayPauseClick);
prevBtn.addEventListener('click', handlePrevClick);
nextBtn.addEventListener('click', handleNextClick);
progressBar.addEventListener('mousedown', startSeek);
progressBar.addEventListener('touchstart', startSeek);
volumeBar.addEventListener('input', handleVolumeChange);
// ... weitere Events
```

---

## 🌐 Browser-APIs (Detailliert)

### 1. HTML5 Media API (`<audio>` & `<video>`)

**Audio-Element:**
```html
<audio id="audioPlayer"
       preload="auto"
       crossorigin="anonymous"
       playsinline
       webkit-playsinline>
</audio>
```

**Eigenschaften:**
```javascript
audioElement.src = 'assets/audio/01-*.mp3';
audioElement.currentTime = 45.5;              // Seek
audioElement.duration;                        // Read-only
audioElement.volume = 0.85;                   // 0.0 - 1.0
audioElement.muted = false;
audioElement.playbackRate = 1.0;              // 0.25 - 4.0
audioElement.readyState;                      // 0-4 (UNSUPPORTED bis HAVE_ENOUGH_DATA)
audioElement.networkState;                    // 0-3 (NETWORK_EMPTY bis NETWORK_LOADED)
```

**Methoden:**
```javascript
audioElement.play();                          // Promise<void>
audioElement.pause();
audioElement.load();                          // Reload source
audioElement.canPlayType('audio/mpeg');       // Rückgabe: '', 'maybe', 'probably'
```

**Events:**
```javascript
// Progress Events
loadstart, progress, suspend, abort, error, emptied, stalled, loadedmetadata,
loadeddata, canplay, canplaythrough, playing, ended, seeking, seeked,
timeupdate, durationchange, ratechange, resize, volumechange

// Wichtigste:
audioElement.addEventListener('canplay', () => {
    // readyState >= 2 (HAVE_CURRENT_DATA)
    // Kann abspielen, aber möglicherweise Buffering nötig
});

audioElement.addEventListener('canplaythrough', () => {
    // readyState >= 4 (HAVE_ENOUGH_DATA)
    // Kann komplett ohne Buffering abspielen
});

audioElement.addEventListener('timeupdate', () => {
    // Fire-Frequenz: Browser-abhängig (200-300ms)
    const progress = audioElement.currentTime / audioElement.duration;
    updateProgressBar(progress);
});

audioElement.addEventListener('stalled', () => {
    // Keine Daten verfügbar, aber Video spielend
    // Trigger Stall-Recovery
});
```

**readyState enum:**
```javascript
HAVE_NOTHING = 0      // Keine Informationen
HAVE_METADATA = 1     // Duration, dimensions
HAVE_CURRENT_DATA = 2 // Aktueller Frame
HAVE_FUTURE_DATA = 3  // Nächster Frame (ein Bild später)
HAVE_ENOUGH_DATA = 4  // Genug für smooth playback
```

### 2. Fullscreen API

**Methoden (mit Fallbacks):**
```javascript
// Enter Fullscreen
if (videoElement.requestFullscreen) {
    videoElement.requestFullscreen();
} else if (videoElement.mozRequestFullScreen) {
    videoElement.mozRequestFullScreen();
} else if (videoElement.webkitRequestFullscreen) {
    videoElement.webkitRequestFullscreen();
} else if (videoElement.msRequestFullscreen) {
    videoElement.msRequestFullscreen();
} else if (videoElement.webkitEnterFullscreen) {
    // iOS Safari Fallback
    videoElement.webkitEnterFullscreen();
}

// Exit Fullscreen
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

// Check Status
const isFullscreen =
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    (videoElement && videoElement.webkitDisplayingFullscreen);
```

**Events:**
```javascript
document.addEventListener('fullscreenchange', () => {
    const isFullscreen = !!document.fullscreenElement;
    console.log('Fullscreen:', isFullscreen);
});

document.addEventListener('fullscreenerror', () => {
    console.error('Fullscreen-Fehler (vielleicht User-Interaction erforderlich)');
});
```

### 3. Network Information API

```javascript
const connection = navigator.connection ||
                   navigator.mozConnection ||
                   navigator.webkitConnection;

if (connection) {
    console.log('Effective Type:', connection.effectiveType);
    // '4g' | '3g' | '2g' | 'slow-2g'

    console.log('Downlink:', connection.downlink);
    // Megabits per second (MBps)

    console.log('Latency:', connection.rtt);
    // Milliseconds

    console.log('Save Data:', connection.saveData);
    // boolean (user enabled data saver)

    // Event-Listener
    connection.addEventListener('change', () => {
        // Netzwerk-Bedingungen haben sich geändert
        adjustVideoQuality();
    });
}
```

**Adaptive Quality Logic:**
```javascript
function detectNetworkQuality() {
    if (navigator.connection.saveData) {
        return 'low';
    }

    const effectiveType = navigator.connection.effectiveType;
    if (effectiveType === '2g' || effectiveType === '3g') {
        return 'low';
    }

    const downlink = navigator.connection.downlink;
    if (downlink < 1.5) {
        return 'low';       // < 1.5 Mbps
    } else if (downlink < 5) {
        return 'mid';       // 1.5 - 5 Mbps
    } else {
        return 'mid';       // >= 5 Mbps (desktop default)
    }
}
```

### 4. Media Session API

```javascript
if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
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

    navigator.mediaSession.playbackState = 'playing'; // playing | paused | none

    // Action Handlers
    navigator.mediaSession.setActionHandler('play', () => {
        PlayerEngine.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
        PlayerEngine.pause();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
        PlaylistManager.moveToNext();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
        PlaylistManager.moveToPrevious();
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
        PlayerEngine.seek(details.seekTime);
    });
}
```

### 5. Fetch API

```javascript
// Load LRC-Datei
fetch('assets/lyrics/01-*.lrc', {
    method: 'GET',
    headers: {
        'Accept': 'text/plain'
    },
    credentials: 'same-origin'
})
.then(response => {
    if (!response.ok) {
        throw new Error('HTTP ' + response.status);
    }
    return response.text();
})
.then(text => {
    const lyrics = LyricsManager.parseLRC(text);
    console.log('Lyrics loaded:', lyrics.length, 'lines');
})
.catch(error => {
    console.error('Error loading lyrics:', error);
    // Graceful fallback: leere Lyrics
});

// Video-Header prüfen (Accept-Ranges)
fetch('assets/video/mid/01-*.mp4', {
    method: 'HEAD'
})
.then(response => {
    const acceptRanges = response.headers.get('Accept-Ranges');
    const contentLength = response.headers.get('Content-Length');
    console.log('Video seekable:', acceptRanges === 'bytes');
    console.log('Video size:', contentLength, 'bytes');
})
.catch(error => {
    console.error('Error:', error);
});
```

### 6. RequestAnimationFrame (RAF)

```javascript
let rafId = null;

function startTimeUpdateLoop() {
    function update() {
        if (PlayerEngine.getIsPlaying()) {
            const currentTime = PlayerEngine.getCurrentTime();
            const duration = PlayerEngine.getDuration();

            // Update Lyrics
            LyricsManager.updateCurrentLine(currentTime);

            // Update UI
            updateProgressBar(currentTime / duration);
            updateTimeDisplay(currentTime, duration);
        }

        rafId = requestAnimationFrame(update);
    }

    rafId = requestAnimationFrame(update);
}

function stopTimeUpdateLoop() {
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}
```

---

## 📱 Mobile-Optimierungen (Detailliert)

### iOS User-Gesture Context

**Problem:** iOS erfordert User-Interaction für Media-Wiedergabe (Sicherheit)

**Lösung:**
```javascript
let userHasInteracted = false;

function setupUserInteractionDetection() {
    document.addEventListener('touchstart', function onFirstTouch() {
        userHasInteracted = true;
        document.removeEventListener('touchstart', onFirstTouch);
    });

    document.addEventListener('click', function onFirstClick() {
        userHasInteracted = true;
        document.removeEventListener('click', onFirstClick);
    });
}

// Bei play()-Aufruf
function performPlaySync() {
    if (!userHasInteracted) {
        pendingPlayRequest = true;
        return;
    }

    audioElement.play()
        .catch(error => {
            if (error.name === 'NotAllowedError') {
                pendingPlayRequest = true;
            } else {
                handlePlaybackError(error);
            }
        });
}

// Beim nächsten Touch
document.addEventListener('touchstart', function() {
    if (pendingPlayRequest) {
        pendingPlayRequest = false;
        performPlaySync();
    }
});
```

### iOS readyState Prüfung

**Problem:** readyState kann veraltet sein auf iOS

**Lösung:**
```javascript
function setupAudioListeners() {
    // IMMER Listener VOR load() setzen
    const onCanPlayHandler = function() {
        playbackState = PlaybackState.READY;
        if (pendingPlayRequest) {
            performPlaySync();
        }
    };

    const onErrorHandler = function(event) {
        const errorCode = audioElement.error.code;
        handleAudioError(errorCode);
    };

    const onLoadstartHandler = function() {
        playbackState = PlaybackState.LOADING;
    };

    audioElement.addEventListener('canplay', onCanPlayHandler, { once: true });
    audioElement.addEventListener('error', onErrorHandler, { once: true });
    audioElement.addEventListener('loadstart', onLoadstartHandler, { once: true });

    // Danach: load() aufrufen
    audioElement.src = trackSource;
    audioElement.load();

    // NACH load(): readyState prüfen
    if (audioElement.readyState >= 3) {
        // Bereits bereit (sehr schnell)
        onCanPlayHandler();
    }
}
```

### iOS Stall-Recovery (Exponential Backoff)

**Problem:** Media kann auf iOS "stallen" (Puffer leer)

**Lösung:**
```javascript
const stallRetryDelays = [500, 1000, 2000, 4000];
let stallRetryCount = 0;
let lastLoadedTrackId = null;

function handleMediaStall() {
    // Nur wenn noch aktueller Track
    if (currentTrack && lastLoadedTrackId !== currentTrack.id) {
        return;
    }

    // Max 4 Retries
    if (stallRetryCount >= 4) {
        playbackState = PlaybackState.ERROR;
        showToast('Wiedergabe konnte nicht fortgesetzt werden');
        return;
    }

    const delay = stallRetryDelays[stallRetryCount];
    stallRetryCount++;

    setTimeout(() => {
        if (currentTrack && lastLoadedTrackId === currentTrack.id) {
            performPlaySync();
        }
    }, delay);
}

audioElement.addEventListener('stalled', handleMediaStall);

// Reset bei neuer Wiedergabe
function loadAudioTrack(track) {
    lastLoadedTrackId = track.id;
    stallRetryCount = 0;
    // ... rest
}
```

### Android CORS & x5-Player

**HTML-Attribute:**
```html
<video id="videoPlayer"
       playsinline
       webkit-playsinline
       x5-playsinline
       x5-video-player-type="h5"
       x5-video-player-fullscreen="false"
       crossorigin="anonymous">
</video>
```

**CORS-Header in `.htaccess`:**
```apache
Header set Access-Control-Allow-Origin "*"
Header set Access-Control-Allow-Methods "GET, HEAD, OPTIONS"
Header set Access-Control-Allow-Headers "Content-Type"
```

**Test auf Android:**
```javascript
if (navigator.userAgent.includes('Android')) {
    // Android-spezifische Behandlung
    videoElement.setAttribute('x5-video-player-type', 'h5');
}
```

---

## 💾 Cache-Strategie & Versionierung

### HTTP-Header Strategy (`.htaccess`)

```apache
# HTML: Immer neu laden
FilesMatch "\.(html|htm)$"
Cache-Control: max-age=0, must-revalidate

# JS/CSS: 1 Jahr (bei Versionierung)
FilesMatch "\.(js|css)$"
Cache-Control: max-age=31536000, immutable

# Medien: 1 Jahr
FilesMatch "\.(mp3|mp4|webm|ogg)$"
Cache-Control: max-age=31536000, immutable

# Manifest: 1 Stunde
FilesMatch "\.webmanifest$"
Cache-Control: max-age=3600
```

### Timestamp-basierte Versionierung

```javascript
// In index.html (inline script)
var BUILD_VERSION = '11.0';
var BUILD_TIMESTAMP = Math.floor(Date.now() / 1000);
var ASSET_VERSION = BUILD_VERSION + '.' + BUILD_TIMESTAMP;

// Dynamische Script-URLs
function updateScriptVersions() {
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].getAttribute('src');
        if (src && src.indexOf('js/') === 0 && src.indexOf('?v=') === -1) {
            scripts[i].setAttribute('src', src + '?v=' + ASSET_VERSION);
        }
    }
}

// URLs werden:
// js/app.js → js/app.js?v=11.0.1672531200
// Bei Version-Update automatisch neu geladen
```

### Client-Side Cache Cleanup

```javascript
function clearIndexedDB() {
    return new Promise(function(resolve) {
        var timeout = setTimeout(function() {
            resolve();
        }, 2000);

        if (window.indexedDB.databases) {
            window.indexedDB.databases().then(function(dbs) {
                for (var i = 0; i < dbs.length; i++) {
                    window.indexedDB.deleteDatabase(dbs[i].name);
                }
                resolve();
            }).catch(function() {
                resolve();
            });
        } else {
            resolve();
        }
    });
}

function clearAllStorage() {
    try {
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.indexOf('deusExCT_') === 0) {
                // Nur deusExCT_ Keys clearen, andere behalten
                if (key !== 'deusExCT_volume' &&
                    key !== 'deusExCT_muted' &&
                    key !== 'deusExCT_quality') {
                    keysToRemove.push(key);
                }
            }
        }
        for (var i = 0; i < keysToRemove.length; i++) {
            localStorage.removeItem(keysToRemove[i]);
        }
    } catch (e) {}

    try {
        sessionStorage.clear();
    } catch (e) {}
}

function clearBrowserCaches() {
    return new Promise(function(resolve) {
        if (!window.caches) {
            resolve();
            return;
        }

        caches.keys().then(function(names) {
            if (names && names.length > 0) {
                var deletePromises = [];
                for (var i = 0; i < names.length; i++) {
                    deletePromises.push(
                        caches.delete(names[i]).catch(function() {})
                    );
                }
                Promise.all(deletePromises).then(resolve).catch(resolve);
            } else {
                resolve();
            }
        }).catch(function() {
            resolve();
        });
    });
}

// Beim Load
Promise.all([
    clearIndexedDB(),
    clearBrowserCaches(),
    unregisterServiceWorkers()
]).then(function() {
    recordCleanupCompletion();
});
```

---

## ❌ Error Handling & Recovery

### Error-Typen (ErrorType Enum)

```javascript
const ErrorType = {
    NOT_ALLOWED: 'NotAllowedError',           // iOS: User-Gesture erforderlich
    ABORT: 'AbortError',                      // User navigated away
    NOT_SUPPORTED: 'NotSupportedError',       // Format nicht unterstützt
    NETWORK: 'NetworkError',                  // Netzwerkfehler
    DECODE: 'DecodeError',                    // Video-Dekodierung fehlgeschlagen
    UNKNOWN: 'UnknownError'                   // Unbekannter Fehler
};
```

### Error-Handling Strategy

```javascript
function handlePlaybackError(error) {
    let errorType = ErrorType.UNKNOWN;
    let shouldRetry = false;
    let retryDelay = 1000;

    if (error && error.name) {
        errorType = error.name;
    } else if (audioElement.error) {
        switch (audioElement.error.code) {
            case 1: errorType = ErrorType.ABORT; break;       // MEDIA_ERR_ABORTED
            case 2: errorType = ErrorType.NETWORK; break;     // MEDIA_ERR_NETWORK
            case 3: errorType = ErrorType.DECODE; break;      // MEDIA_ERR_DECODE
            case 4: errorType = ErrorType.NOT_SUPPORTED; break;// MEDIA_ERR_SRC_NOT_SUPPORTED
        }
    }

    // Differenziertes Error-Handling
    switch (errorType) {
        case ErrorType.NOT_ALLOWED:
            // iOS: Warte auf User-Gesture
            pendingPlayRequest = true;
            break;

        case ErrorType.ABORT:
            // User navigated away - stille Behandlung
            break;

        case ErrorType.NETWORK:
            // Netzwerkfehler - Retry
            shouldRetry = true;
            retryDelay = 2000 * (playbackAttempts + 1);
            break;

        case ErrorType.DECODE:
            // Dekodierungsfehler - Mode-Fallback
            if (currentMode === 'video') {
                switchMode('audio', true);
            }
            shouldRetry = false;
            break;

        case ErrorType.NOT_SUPPORTED:
            // Format nicht unterstützt
            showToast('Dieses Format wird nicht unterstützt');
            shouldRetry = false;
            break;

        default:
            shouldRetry = true;
            retryDelay = 1000;
    }

    // Retry-Logik
    if (shouldRetry && playbackAttempts < maxPlaybackAttempts) {
        playbackAttempts++;
        setTimeout(() => {
            performPlaySync();
        }, retryDelay);
    } else if (shouldRetry) {
        playbackState = PlaybackState.ERROR;
        showToast('Wiedergabe fehlgeschlagen nach ' + maxPlaybackAttempts + ' Versuchen');
    }

    // Trigger Event
    trigger('error', {
        errorCode: audioElement.error?.code,
        errorType: errorType,
        message: error?.message,
        track: currentTrack
    });
}
```

### Mode-Switch Error Recovery

```javascript
function switchMode(newMode, preservePosition) {
    return new Promise(function(resolve, reject) {
        if (newMode === currentMode) {
            resolve();
            return;
        }

        const savedTime = audioElement.currentTime;
        const savedIsPlaying = getIsPlaying();

        pause();

        const timeoutId = setTimeout(function() {
            // Timeout nach 15 Sekunden
            playbackState = PlaybackState.ERROR;
            showToast('Modus-Wechsel-Timeout');
            reject(new Error('Mode switch timeout'));
        }, 15000);

        const targetElement = (newMode === 'audio') ? audioElement : videoElement;
        const onSuccess = function() {
            clearTimeout(timeoutId);
            currentMode = newMode;

            if (preservePosition) {
                targetElement.currentTime = savedTime;
            }

            if (savedIsPlaying) {
                play().then(resolve).catch(reject);
            } else {
                resolve();
            }
        };

        const onError = function(error) {
            clearTimeout(timeoutId);
            // Fallback zu vorherigem Modus
            currentMode = (newMode === 'audio') ? 'video' : 'audio';
            reject(error);
        };

        targetElement.addEventListener('canplay', onSuccess, { once: true });
        targetElement.addEventListener('error', onError, { once: true });

        if (newMode === 'audio') {
            loadAudioTrack(currentTrack);
        } else {
            loadVideoTrack(currentTrack, currentQuality);
        }
    });
}
```

---

## 📊 Performance-Metriken

### Benchmark-Ziele (v11.0)

| Metrik | Ziel | Actual | Status |
|--------|------|--------|--------|
| Page-Load Time | <2s | ~1.2s | ✅ |
| Audio-Start | <1s | ~0.8s | ✅ |
| Video-Start (MID) | <3s | ~2.1s | ✅ |
| Video-Start (HQ) | <5s | ~4.2s | ✅ |
| First Paint | <1s | ~0.9s | ✅ |
| First Contentful Paint | <1.5s | ~1.1s | ✅ |
| Time to Interactive | <3s | ~2.4s | ✅ |
| Memory (Idle) | <50MB | ~45MB | ✅ |
| Memory (Playing) | <80MB | ~72MB | ✅ |
| Memory Leak | 0% | 0% | ✅ |
| CPU (Idle) | <5% | ~2% | ✅ |
| CPU (Playing) | <25% | ~18% | ✅ |
| FPS (Lyrics Anim) | 60 | 60 | ✅ |
| FPS (Scroll) | 60 | 59-60 | ✅ |

### Performance-Metriken messen

```javascript
// Page-Load Time
const pageLoadTime = performance.now();
console.log('Page loaded in:', pageLoadTime.toFixed(2), 'ms');

// First Paint
const fpEntry = performance.getEntriesByName('first-paint')[0];
if (fpEntry) {
    console.log('First Paint:', fpEntry.startTime.toFixed(2), 'ms');
}

// First Contentful Paint
const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
if (fcpEntry) {
    console.log('First Contentful Paint:', fcpEntry.startTime.toFixed(2), 'ms');
}

// Audio-Start Time (ab Play-Button-Click)
let audioStartMark = null;
PlayerEngine.on('play', function() {
    if (audioStartMark === null) {
        audioStartMark = performance.now();
        console.log('Audio started in:',
            (performance.now() - audioStartMark).toFixed(2), 'ms');
    }
});

// Memory Usage (Chrome DevTools)
if (performance.memory) {
    console.log('Used JS Heap:',
        (performance.memory.usedJSHeapSize / 1048576).toFixed(2), 'MB');
    console.log('Total JS Heap:',
        (performance.memory.totalJSHeapSize / 1048576).toFixed(2), 'MB');
}

// Frame Rate Monitor
let lastTime = performance.now();
let frameCount = 0;
let avgFPS = 0;

function measureFPS() {
    frameCount++;
    const currentTime = performance.now();
    const delta = currentTime - lastTime;

    if (delta >= 1000) {
        avgFPS = frameCount;
        console.log('FPS:', avgFPS);
        frameCount = 0;
        lastTime = currentTime;
    }

    requestAnimationFrame(measureFPS);
}

measureFPS();
```

---

## 🔐 Security-Considerations

### HTTPS Requirement

- ✅ Erforderlich für PWA (manifest.json)
- ✅ Erforderlich für Media Session API
- ✅ Erforderlich für Secure Context APIs
- ✅ Alle Assets müssen über HTTPS sein (kein Mixed Content)

### CORS (Cross-Origin Resource Sharing)

```apache
# In .htaccess
Header set Access-Control-Allow-Origin "*"
Header set Access-Control-Allow-Methods "GET, HEAD, OPTIONS"
Header set Access-Control-Allow-Headers "Content-Type"
Header set Access-Control-Max-Age "3600"
```

### XSS-Protection

```apache
# In .htaccess
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"
Header set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; media-src *; img-src *; font-src 'self'; connect-src 'self'"
```

### Input Validation

```javascript
// URL-Parameter validieren (vor route-parsing)
function parseRoute(hash) {
    const parts = hash.replace('#/', '').split('/');
    const route = parts[0];
    const slug = parts[1];

    // Nur alphanumerisch + Bindestrich erlauben
    if (slug && !/^[a-z0-9\-]+$/.test(slug)) {
        showView('album');
        return;
    }

    // Track suchen
    const track = PlaylistManager.getTrackBySlug(slug);
    if (!track) {
        showView('album');
        return;
    }

    playTrack(track, 'audio');
}
```

### localStorage Sanitization

```javascript
// Beim Speichern
localStorage.deusExCT_playlistState = JSON.stringify({
    currentIndex: Math.max(0, Math.min(11, currentIndex)),
    currentTrack: currentTrack
});

// Beim Laden
function loadStateFromStorage() {
    try {
        const saved = localStorage.getItem('deusExCT_playlistState');
        const state = JSON.parse(saved);

        // Validierung
        if (typeof state.currentIndex !== 'number') return false;
        if (state.currentIndex < 0 || state.currentIndex >= 12) return false;

        PlaylistManager.setCurrentIndex(state.currentIndex);
        return true;
    } catch (e) {
        return false;
    }
}
```

---

## 🔍 Debugging & Monitoring

### Console Logging

```javascript
// Enable Debug Mode
window.DEBUG = true;

function debugLog(...args) {
    if (window.DEBUG) {
        console.log('[DEBUG]', ...args);
    }
}

// Verwendung
debugLog('Current state:', PlayerEngine.getPlaybackState());
debugLog('Current track:', PlaylistManager.getCurrentTrack());
```

### Error Tracking

```javascript
// Global Error Handler
window.addEventListener('error', function(event) {
    console.error('Global Error:', event.error);

    // Optional: Server-seitig loggen
    fetch('/api/log-error', {
        method: 'POST',
        body: JSON.stringify({
            message: event.error.message,
            stack: event.error.stack,
            url: window.location.href,
            timestamp: new Date().toISOString()
        })
    }).catch(() => {});
});

// Player Error Tracking
PlayerEngine.on('error', function(data) {
    console.error('Playback Error:', data);

    fetch('/api/log-playback-error', {
        method: 'POST',
        body: JSON.stringify({
            errorCode: data.errorCode,
            errorType: data.errorType,
            track: data.track?.id,
            mode: PlayerEngine.getCurrentMode(),
            timestamp: new Date().toISOString()
        })
    }).catch(() => {});
});
```

### Performance Monitoring

```javascript
// Page Load Monitoring
window.addEventListener('load', function() {
    const perfData = performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

    console.log('Performance Metrics:');
    console.log('- DNS Lookup:', perfData.domainLookupEnd - perfData.domainLookupStart, 'ms');
    console.log('- TCP Connection:', perfData.connectEnd - perfData.connectStart, 'ms');
    console.log('- Request Time:', perfData.responseStart - perfData.requestStart, 'ms');
    console.log('- Response Time:', perfData.responseEnd - perfData.responseStart, 'ms');
    console.log('- DOM Processing:', perfData.domComplete - perfData.domInteractive, 'ms');
    console.log('- Page Load Time:', pageLoadTime, 'ms');

    // Optional: Server-seitig senden
    fetch('/api/log-performance', {
        method: 'POST',
        body: JSON.stringify({ pageLoadTime, metrics: perfData })
    }).catch(() => {});
});
```

---

## 📋 Checkliste für Deployment

- [ ] HTTPS aktiviert
- [ ] `.htaccess` korrekt konfiguriert
- [ ] manifest.json ist valide
- [ ] Alle Assets vorhanden (Audio, Video, Images, Lyrics)
- [ ] ZIP-Files generiert (Album, Videos)
- [ ] Icons 192×192 und 512×512px
- [ ] LRC-Dateien UTF-8 ohne BOM
- [ ] Video-Dateien mit Accept-Ranges Header
- [ ] CORS-Header aktiv
- [ ] Cache-Header korrekt
- [ ] Service Worker deregistriert (v11.0)
- [ ] Logs überprüft (0 Fehler)
- [ ] Mobile-Testing durchgeführt (iOS + Android)
- [ ] Slow 3G-Testing durchgeführt
- [ ] DevTools Memory-Test durchgeführt (kein Leak)
- [ ] DevTools Performance-Test durchgeführt (60 FPS)

---