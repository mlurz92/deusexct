const albumData = {
    title: "Deus ex CT",
    artist: "ML",
    year: "2024",
    coverPath: "assets/images/00-Albumcover.png",
    downloadPath: "assets/downloads/Deus_ex_CT_Complete.zip",
    tracks: [
        {
            id: 1,
            title: "Oberarzt Dr. med. Placzek",
            artist: "ML",
            audioPath: "assets/audio/01-Oberarzt_Dr_med_Placzek.mp3",
            videoPath: "assets/video/01-Oberarzt_Dr_med_Placzek_Lyrics.mp4",
            coverPath: "assets/images/01-Oberarzt_Dr_med_Placzek.png",
            lyricsPath: "assets/lyrics/01-Oberarzt_Dr_med_Placzek.lrc"
        },
        {
            id: 2,
            title: "Oberarzt der Herzen",
            artist: "ML",
            audioPath: "assets/audio/02-Oberarzt_der_Herzen.mp3",
            videoPath: "assets/video/02-Oberarzt_der_Herzen_Lyrics.mp4",
            coverPath: "assets/images/02-Oberarzt_der_Herzen.png",
            lyricsPath: "assets/lyrics/02-Oberarzt_der_Herzen.lrc"
        },
        {
            id: 3,
            title: "Vier-Eins-Neun-Zwei",
            artist: "ML",
            audioPath: "assets/audio/03-Vier-Eins-Neun-Zwei.mp3",
            videoPath: "assets/video/03-Vier-Eins-Neun-Zwei_Lyrics.mp4",
            coverPath: "assets/images/03-Vier-Eins-Neun-Zwei.png",
            lyricsPath: "assets/lyrics/03-Vier-Eins-Neun-Zwei.lrc"
        },
        {
            id: 4,
            title: "Pilot im Pixelmeer",
            artist: "ML",
            audioPath: "assets/audio/04-Pilot_im_Pixelmeer.mp3",
            videoPath: "assets/video/04-Pilot_im_Pixelmeer_Lyrics.mp4",
            coverPath: "assets/images/04-Pilot_im_Pixelmeer.png",
            lyricsPath: "assets/lyrics/04-Pilot_im_Pixelmeer.lrc"
        },
        {
            id: 5,
            title: "Drei Gebote",
            artist: "ML",
            audioPath: "assets/audio/05-Drei_Gebote.mp3",
            videoPath: "assets/video/05-Drei_Gebote_Lyrics.mp4",
            coverPath: "assets/images/05-Drei_Gebote.png",
            lyricsPath: "assets/lyrics/05-Drei_Gebote.lrc"
        },
        {
            id: 6,
            title: "Kunst der Diagnostik",
            artist: "ML",
            audioPath: "assets/audio/06-Kunst_der_Diagnostik.mp3",
            videoPath: "assets/video/06-Kunst_der_Diagnostik_Lyrics.mp4",
            coverPath: "assets/images/06-Kunst_der_Diagnostik.png",
            lyricsPath: "assets/lyrics/06-Kunst_der_Diagnostik.lrc"
        },
        {
            id: 7,
            title: "Mit harter Hand und Charme",
            artist: "ML",
            audioPath: "assets/audio/07-Mit_harter_Hand_und_Charme.mp3",
            videoPath: "assets/video/07-Mit_harter_Hand_und_Charme_Lyrics.mp4",
            coverPath: "assets/images/07-Mit_harter_Hand_und_Charme.png",
            lyricsPath: "assets/lyrics/07-Mit_harter_Hand_und_Charme.lrc"
        },
        {
            id: 8,
            title: "Durch Feuer und Eis",
            artist: "ML",
            audioPath: "assets/audio/08-Durch_Feuer_und_Eis.mp3",
            videoPath: "assets/video/08-Durch_Feuer_und_Eis_Lyrics.mp4",
            coverPath: "assets/images/08-Durch_Feuer_und_Eis.png",
            lyricsPath: "assets/lyrics/08-Durch_Feuer_und_Eis.lrc"
        },
        {
            id: 9,
            title: "Held und Idol",
            artist: "ML",
            audioPath: "assets/audio/09-Held_und_Idol.mp3",
            videoPath: "assets/video/09-Held_und_Idol_Lyrics.mp4",
            coverPath: "assets/images/09-Held_und_Idol.png",
            lyricsPath: "assets/lyrics/09-Held_und_Idol.lrc"
        },
        {
            id: 10,
            title: "Messerscharf und Legendär",
            artist: "ML",
            audioPath: "assets/audio/10-Messerscharf_und_Legendär.mp3",
            videoPath: "assets/video/10-Messerscharf_und_Legendär_Lyrics.mp4",
            coverPath: "assets/images/10-Messerscharf_und_Legendär.png",
            lyricsPath: "assets/lyrics/10-Messerscharf_und_Legendär.lrc"
        },
        {
            id: 11,
            title: "Oberärztlicher Glanz",
            artist: "ML",
            audioPath: "assets/audio/11-Oberärztlicher_Glanz.mp3",
            videoPath: "assets/video/11-Oberärztlicher_Glanz_Lyrics.mp4",
            coverPath: "assets/images/11-Oberärztlicher_Glanz.png",
            lyricsPath: "assets/lyrics/11-Oberärztlicher_Glanz.lrc"
        },
        {
            id: 12,
            title: "Götterdämmerung",
            artist: "ML",
            audioPath: "assets/audio/12-Götterdämmerung.mp3",
            videoPath: "assets/video/12-Götterdämmerung_Lyrics.mp4",
            coverPath: "assets/images/12-Götterdämmerung.png",
            lyricsPath: "assets/lyrics/12-Götterdämmerung.lrc"
        }
    ]
};

let currentTrackIndex = 0;
let currentMode = localStorage.getItem('playerMode') || 'audio';
let isPlaying = false;
let isLoading = false;

const elements = {
    tracksContainer: null,
    modeToggle: null,
    albumCover: null,
    downloadAlbum: null,
    currentCover: null,
    currentTitle: null,
    currentArtist: null,
    videoTitle: null,
    downloadVideo: null
};

function initializeApp() {
    cacheElements();
    setPlayerMode(currentMode);
    renderPlaylist();
    attachEventListeners();
    
    window.Player.initialize(albumData);
    window.Lyrics.initialize();
    window.Router.initialize();
    
    const urlParams = new URLSearchParams(window.location.search);
    const trackId = urlParams.get('track');
    const mode = urlParams.get('mode');
    
    if (mode && (mode === 'audio' || mode === 'video')) {
        setPlayerMode(mode);
    }
    
    if (trackId) {
        const trackIndex = albumData.tracks.findIndex(track => track.id === parseInt(trackId));
        if (trackIndex !== -1) {
            playTrack(trackIndex);
        }
    }
}

function cacheElements() {
    elements.tracksContainer = document.querySelector('.tracks-container');
    elements.modeToggle = document.querySelector('.mode-toggle');
    elements.albumCover = document.querySelector('.album-cover');
    elements.downloadAlbum = document.querySelector('.download-album');
    elements.currentCover = document.querySelector('.current-cover');
    elements.currentTitle = document.querySelector('.current-title');
    elements.currentArtist = document.querySelector('.current-artist');
    elements.videoTitle = document.querySelector('.video-title');
    elements.downloadVideo = document.querySelector('.download-video');
}

function setPlayerMode(mode) {
    currentMode = mode;
    document.body.setAttribute('data-mode', mode);
    localStorage.setItem('playerMode', mode);
    
    if (currentTrackIndex >= 0 && currentTrackIndex < albumData.tracks.length) {
        const track = albumData.tracks[currentTrackIndex];
        updatePlayerUI(track);
        
        if (isPlaying) {
            window.Player.switchMode(mode);
        }
    }
}

function renderPlaylist() {
    elements.tracksContainer.innerHTML = '';
    
    albumData.tracks.forEach((track, index) => {
        const trackElement = createTrackElement(track, index);
        elements.tracksContainer.appendChild(trackElement);
    });
}

function createTrackElement(track, index) {
    const trackItem = document.createElement('div');
    trackItem.className = 'track-item';
    trackItem.dataset.trackIndex = index;
    
    const trackNumber = document.createElement('div');
    trackNumber.className = 'track-number';
    trackNumber.textContent = track.id.toString().padStart(2, '0');
    
    const trackCover = document.createElement('img');
    trackCover.className = 'track-cover';
    trackCover.src = track.coverPath;
    trackCover.alt = `${track.title} Cover`;
    trackCover.loading = 'lazy';
    trackCover.onerror = function() {
        this.src = albumData.coverPath;
    };
    
    const trackInfo = document.createElement('div');
    trackInfo.className = 'track-info';
    
    const trackTitle = document.createElement('div');
    trackTitle.className = 'track-title';
    trackTitle.textContent = track.title;
    
    const trackArtist = document.createElement('div');
    trackArtist.className = 'track-artist';
    trackArtist.textContent = track.artist;
    
    trackInfo.appendChild(trackTitle);
    trackInfo.appendChild(trackArtist);
    
    const playAudioButton = document.createElement('button');
    playAudioButton.className = 'track-play-audio';
    playAudioButton.setAttribute('aria-label', `${track.title} als Audio abspielen`);
    playAudioButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 18V5l12-2v13M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
        </svg>
    `;
    
    const playVideoButton = document.createElement('button');
    playVideoButton.className = 'track-play-video';
    playVideoButton.setAttribute('aria-label', `${track.title} als Video abspielen`);
    playVideoButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M23 7l-7 5 7 5V7z"></path>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
    `;
    
    trackItem.appendChild(trackNumber);
    trackItem.appendChild(trackCover);
    trackItem.appendChild(trackInfo);
    trackItem.appendChild(playAudioButton);
    trackItem.appendChild(playVideoButton);
    
    trackItem.addEventListener('click', (e) => {
        if (!e.target.closest('.track-play-audio') && !e.target.closest('.track-play-video')) {
            setPlayerMode('audio');
            playTrack(index);
        }
    });
    
    playAudioButton.addEventListener('click', (e) => {
        e.stopPropagation();
        setPlayerMode('audio');
        playTrack(index);
    });
    
    playVideoButton.addEventListener('click', (e) => {
        e.stopPropagation();
        setPlayerMode('video');
        playTrack(index);
    });
    
    return trackItem;
}

function playTrack(index) {
    if (index < 0 || index >= albumData.tracks.length || isLoading) return;
    
    isLoading = true;
    const trackItem = document.querySelectorAll('.track-item')[index];
    trackItem?.classList.add('loading');
    
    currentTrackIndex = index;
    const track = albumData.tracks[index];
    
    updateActiveTrack(index);
    updatePlayerUI(track);
    
    const loadPromise = window.Player.loadTrack(track, currentMode);
    
    if (loadPromise && typeof loadPromise.then === 'function') {
        loadPromise
            .then(() => {
                trackItem?.classList.remove('loading');
                isLoading = false;
                isPlaying = true;
            })
            .catch((error) => {
                trackItem?.classList.remove('loading');
                isLoading = false;
                showError('Fehler beim Laden des Tracks');
                console.error('Track load error:', error);
            });
    } else {
        trackItem?.classList.remove('loading');
        isLoading = false;
        isPlaying = true;
    }
    
    window.Router.updateURL(track.id, currentMode);
}

function updateActiveTrack(index) {
    document.querySelectorAll('.track-item').forEach((item, i) => {
        if (i === index) {
            item.classList.add('active');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            item.classList.remove('active');
        }
    });
}

function updatePlayerUI(track) {
    elements.currentCover.src = track.coverPath;
    elements.currentCover.onerror = function() {
        this.src = albumData.coverPath;
    };
    elements.currentTitle.textContent = track.title;
    elements.currentArtist.textContent = track.artist;
    elements.videoTitle.textContent = track.title;
    elements.downloadVideo.setAttribute('data-download', track.videoPath);
}

function attachEventListeners() {
    elements.modeToggle.addEventListener('click', () => {
        const newMode = currentMode === 'audio' ? 'video' : 'audio';
        setPlayerMode(newMode);
        if (currentTrackIndex >= 0 && albumData.tracks[currentTrackIndex]) {
            window.Router.updateURL(albumData.tracks[currentTrackIndex].id, newMode);
        }
    });
    
    elements.downloadAlbum.addEventListener('click', (e) => {
        e.preventDefault();
        downloadFile(albumData.downloadPath, 'Deus_ex_CT_Complete.zip');
    });
    
    elements.downloadVideo.addEventListener('click', (e) => {
        e.preventDefault();
        const downloadPath = e.target.closest('.download-video').getAttribute('data-download');
        if (downloadPath) {
            const fileName = downloadPath.split('/').pop();
            downloadFile(downloadPath, fileName);
        }
    });
    
    window.addEventListener('player:trackEnded', () => {
        playNextTrack();
    });
    
    window.addEventListener('player:prev', () => {
        playPreviousTrack();
    });
    
    window.addEventListener('player:next', () => {
        playNextTrack();
    });
    
    window.addEventListener('player:playStateChanged', (e) => {
        isPlaying = e.detail.isPlaying;
    });
    
    window.addEventListener('router:change', (e) => {
        const { trackId, mode } = e.detail;
        
        if (mode && mode !== currentMode) {
            setPlayerMode(mode);
        }
        
        if (trackId) {
            const trackIndex = albumData.tracks.findIndex(track => track.id === trackId);
            if (trackIndex !== -1 && trackIndex !== currentTrackIndex) {
                playTrack(trackIndex);
            }
        }
    });
    
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isPlaying && currentMode === 'video') {
            window.Player.pause();
        }
    });
    
    window.addEventListener('online', () => {
        console.log('Connection restored');
    });
    
    window.addEventListener('offline', () => {
        showError('Keine Internetverbindung');
    });
    
    window.addEventListener('resize', debounce(() => {
        const isMobile = window.innerWidth < 768;
        document.body.classList.toggle('is-mobile', isMobile);
    }, 250));
}

function playNextTrack() {
    const nextIndex = (currentTrackIndex + 1) % albumData.tracks.length;
    playTrack(nextIndex);
}

function playPreviousTrack() {
    const prevIndex = currentTrackIndex === 0 ? albumData.tracks.length - 1 : currentTrackIndex - 1;
    playTrack(prevIndex);
}

function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    
    try {
        a.click();
    } catch (error) {
        console.error('Download failed:', error);
        window.open(url, '_blank');
    }
    
    setTimeout(() => {
        document.body.removeChild(a);
    }, 100);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showError(message) {
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.setAttribute('role', 'alert');
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => {
            errorDiv.remove();
        }, 300);
    }, 5000);
}

document.addEventListener('DOMContentLoaded', initializeApp);