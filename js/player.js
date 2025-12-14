window.Player = (function() {
    let audioPlayer = null;
    let videoPlayer = null;
    let currentTrack = null;
    let currentMode = 'audio';
    let isPlaying = false;
    let isDragging = false;
    let syncPosition = 0;
    let albumTracks = [];
    let retryCount = 0;
    const maxRetries = 3;
    
    const elements = {
        audioPlayer: null,
        videoPlayer: null,
        playButton: null,
        prevButton: null,
        nextButton: null,
        progressBar: null,
        progressFilled: null,
        progressHandle: null,
        timeCurrent: null,
        timeTotal: null
    };
    
    function initialize(albumData) {
        albumTracks = albumData.tracks;
        cacheElements();
        attachEventListeners();
        initializeMediaSessions();
    }
    
    function cacheElements() {
        elements.audioPlayer = document.getElementById('audioPlayer');
        elements.videoPlayer = document.getElementById('videoPlayer');
        elements.playButton = document.querySelector('.control-play');
        elements.prevButton = document.querySelector('.control-prev');
        elements.nextButton = document.querySelector('.control-next');
        elements.progressBar = document.querySelector('.progress-bar');
        elements.progressFilled = document.querySelector('.progress-filled');
        elements.progressHandle = document.querySelector('.progress-handle');
        elements.timeCurrent = document.querySelector('.time-current');
        elements.timeTotal = document.querySelector('.time-total');
        
        audioPlayer = elements.audioPlayer;
        videoPlayer = elements.videoPlayer;
    }
    
    function attachEventListeners() {
        audioPlayer.addEventListener('loadedmetadata', handleMetadataLoaded);
        audioPlayer.addEventListener('loadeddata', handleDataLoaded);
        audioPlayer.addEventListener('timeupdate', handleTimeUpdate);
        audioPlayer.addEventListener('play', handlePlay);
        audioPlayer.addEventListener('pause', handlePause);
        audioPlayer.addEventListener('ended', handleEnded);
        audioPlayer.addEventListener('error', handleError);
        audioPlayer.addEventListener('waiting', handleWaiting);
        audioPlayer.addEventListener('canplay', handleCanPlay);
        audioPlayer.addEventListener('progress', handleProgress);
        
        videoPlayer.addEventListener('loadedmetadata', handleMetadataLoaded);
        videoPlayer.addEventListener('loadeddata', handleDataLoaded);
        videoPlayer.addEventListener('timeupdate', handleTimeUpdate);
        videoPlayer.addEventListener('play', handlePlay);
        videoPlayer.addEventListener('pause', handlePause);
        videoPlayer.addEventListener('ended', handleEnded);
        videoPlayer.addEventListener('error', handleError);
        videoPlayer.addEventListener('waiting', handleWaiting);
        videoPlayer.addEventListener('canplay', handleCanPlay);
        videoPlayer.addEventListener('progress', handleProgress);
        
        elements.playButton.addEventListener('click', togglePlayPause);
        elements.prevButton.addEventListener('click', playPrevious);
        elements.nextButton.addEventListener('click', playNext);
        
        elements.progressBar.addEventListener('click', handleProgressClick);
        elements.progressBar.addEventListener('mousedown', handleProgressDragStart);
        elements.progressBar.addEventListener('touchstart', handleProgressDragStart, { passive: true });
        
        document.addEventListener('mousemove', handleProgressDrag);
        document.addEventListener('mouseup', handleProgressDragEnd);
        document.addEventListener('touchmove', handleProgressDrag, { passive: true });
        document.addEventListener('touchend', handleProgressDragEnd);
        
        document.addEventListener('keydown', handleKeyboard);
    }
    
    function initializeMediaSessions() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => play());
            navigator.mediaSession.setActionHandler('pause', () => pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
            navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
            navigator.mediaSession.setActionHandler('seekbackward', () => {
                const player = getCurrentPlayer();
                seek(Math.max(0, player.currentTime - 10));
            });
            navigator.mediaSession.setActionHandler('seekforward', () => {
                const player = getCurrentPlayer();
                seek(Math.min(player.duration || 0, player.currentTime + 10));
            });
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime !== null) {
                    seek(details.seekTime);
                }
            });
        }
    }
    
    function loadTrack(track, mode) {
        return new Promise((resolve, reject) => {
            currentTrack = track;
            currentMode = mode;
            retryCount = 0;
            
            const player = getCurrentPlayer();
            const otherPlayer = currentMode === 'audio' ? videoPlayer : audioPlayer;
            
            otherPlayer.pause();
            otherPlayer.src = '';
            
            const handleCanPlay = () => {
                player.removeEventListener('canplay', handleCanPlay);
                player.removeEventListener('error', handleLoadError);
                updateMediaSession(track);
                if (isPlaying) {
                    play().then(resolve).catch(reject);
                } else {
                    resolve();
                }
            };
            
            const handleLoadError = (error) => {
                player.removeEventListener('canplay', handleCanPlay);
                player.removeEventListener('error', handleLoadError);
                
                if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(() => {
                        loadTrack(track, mode).then(resolve).catch(reject);
                    }, 1000 * retryCount);
                } else {
                    reject(error);
                }
            };
            
            player.addEventListener('canplay', handleCanPlay, { once: true });
            player.addEventListener('error', handleLoadError, { once: true });
            
            if (currentMode === 'audio') {
                audioPlayer.src = track.audioPath;
                audioPlayer.load();
                if (window.Lyrics) {
                    window.Lyrics.loadLyrics(track.lyricsPath);
                }
            } else {
                videoPlayer.src = track.videoPath;
                videoPlayer.load();
            }
        });
    }
    
    function switchMode(newMode) {
        if (newMode === currentMode || !currentTrack) return;
        
        const currentPlayer = getCurrentPlayer();
        syncPosition = currentPlayer.currentTime || 0;
        const wasPlaying = isPlaying;
        
        pause();
        
        currentMode = newMode;
        
        const loadPromise = loadTrack(currentTrack, currentMode);
        
        loadPromise.then(() => {
            const newPlayer = getCurrentPlayer();
            
            const seekToSync = () => {
                newPlayer.currentTime = syncPosition;
                if (wasPlaying) {
                    play();
                }
            };
            
            if (newPlayer.readyState >= 2) {
                seekToSync();
            } else {
                newPlayer.addEventListener('loadeddata', seekToSync, { once: true });
            }
        }).catch(error => {
            console.error('Mode switch failed:', error);
        });
    }
    
    function getCurrentPlayer() {
        return currentMode === 'audio' ? audioPlayer : videoPlayer;
    }
    
    function play() {
        const player = getCurrentPlayer();
        
        if (!player.src) {
            return Promise.reject(new Error('No track loaded'));
        }
        
        const playPromise = player.play();
        
        if (playPromise !== undefined) {
            return playPromise.then(() => {
                isPlaying = true;
                elements.playButton.classList.add('playing');
                dispatchPlayStateChanged(true);
            }).catch(error => {
                if (error.name === 'NotAllowedError') {
                    console.log('Autoplay prevented, user interaction required');
                } else {
                    console.error('Play failed:', error);
                }
                isPlaying = false;
                elements.playButton.classList.remove('playing');
                dispatchPlayStateChanged(false);
                throw error;
            });
        }
        
        return Promise.resolve();
    }
    
    function pause() {
        const player = getCurrentPlayer();
        player.pause();
        isPlaying = false;
        elements.playButton.classList.remove('playing');
        dispatchPlayStateChanged(false);
    }
    
    function togglePlayPause() {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }
    
    function playPrevious() {
        window.dispatchEvent(new CustomEvent('player:prev'));
    }
    
    function playNext() {
        window.dispatchEvent(new CustomEvent('player:next'));
    }
    
    function seek(time) {
        const player = getCurrentPlayer();
        if (player.duration && time >= 0 && time <= player.duration) {
            player.currentTime = time;
            updateTimeDisplay(time, elements.timeCurrent);
            
            if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
                navigator.mediaSession.setPositionState({
                    duration: player.duration,
                    playbackRate: player.playbackRate,
                    position: time
                });
            }
        }
    }
    
    function handleMetadataLoaded(e) {
        const player = e.target;
        if (player !== getCurrentPlayer()) return;
        
        updateTimeDisplay(player.duration, elements.timeTotal);
        
        if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
            navigator.mediaSession.setPositionState({
                duration: player.duration,
                playbackRate: player.playbackRate,
                position: player.currentTime
            });
        }
    }
    
    function handleDataLoaded(e) {
        const player = e.target;
        if (player !== getCurrentPlayer()) return;
        
        elements.progressBar.parentElement.classList.remove('loading');
    }
    
    function handleTimeUpdate(e) {
        const player = e.target;
        if (player !== getCurrentPlayer()) return;
        
        const currentTime = player.currentTime;
        const duration = player.duration || 0;
        
        updateTimeDisplay(currentTime, elements.timeCurrent);
        
        if (!isDragging && duration > 0) {
            const progress = (currentTime / duration) * 100;
            elements.progressFilled.style.width = `${progress}%`;
            elements.progressHandle.style.left = `${progress}%`;
        }
        
        if (currentMode === 'audio' && window.Lyrics) {
            window.Lyrics.updateTime(currentTime);
        }
    }
    
    function handlePlay(e) {
        if (e.target !== getCurrentPlayer()) return;
        isPlaying = true;
        elements.playButton.classList.add('playing');
        dispatchPlayStateChanged(true);
    }
    
    function handlePause(e) {
        if (e.target !== getCurrentPlayer()) return;
        isPlaying = false;
        elements.playButton.classList.remove('playing');
        dispatchPlayStateChanged(false);
    }
    
    function handleEnded(e) {
        if (e.target !== getCurrentPlayer()) return;
        isPlaying = false;
        elements.playButton.classList.remove('playing');
        window.dispatchEvent(new CustomEvent('player:trackEnded'));
    }
    
    function handleError(e) {
        const player = e.target;
        if (player !== getCurrentPlayer()) return;
        
        const error = player.error;
        console.error('Media error:', error);
        
        isPlaying = false;
        elements.playButton.classList.remove('playing');
        dispatchPlayStateChanged(false);
        
        if (error) {
            let message = 'Wiedergabefehler';
            switch (error.code) {
                case error.MEDIA_ERR_ABORTED:
                    message = 'Wiedergabe abgebrochen';
                    break;
                case error.MEDIA_ERR_NETWORK:
                    message = 'Netzwerkfehler';
                    break;
                case error.MEDIA_ERR_DECODE:
                    message = 'Decodierungsfehler';
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    message = 'Format nicht unterstützt';
                    break;
            }
            
            window.dispatchEvent(new CustomEvent('player:error', {
                detail: { message, error }
            }));
        }
    }
    
    function handleWaiting(e) {
        if (e.target !== getCurrentPlayer()) return;
        elements.progressBar.parentElement.classList.add('buffering');
    }
    
    function handleCanPlay(e) {
        if (e.target !== getCurrentPlayer()) return;
        elements.progressBar.parentElement.classList.remove('buffering');
    }
    
    function handleProgress(e) {
        const player = e.target;
        if (player !== getCurrentPlayer()) return;
        
        const buffered = player.buffered;
        if (buffered.length > 0) {
            const bufferedEnd = buffered.end(buffered.length - 1);
            const duration = player.duration;
            if (duration > 0) {
                const bufferedPercentage = (bufferedEnd / duration) * 100;
                elements.progressBar.style.setProperty('--buffered', `${bufferedPercentage}%`);
            }
        }
    }
    
    function handleProgressClick(e) {
        if (isDragging) return;
        updateProgress(e);
    }
    
    function handleProgressDragStart(e) {
        isDragging = true;
        elements.progressHandle.style.transition = 'none';
        elements.progressFilled.style.transition = 'none';
        updateProgress(e);
    }
    
    function handleProgressDrag(e) {
        if (!isDragging) return;
        updateProgress(e);
    }
    
    function handleProgressDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        elements.progressHandle.style.transition = '';
        elements.progressFilled.style.transition = '';
    }
    
    function updateProgress(e) {
        const rect = elements.progressBar.getBoundingClientRect();
        let clientX;
        
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }
        
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        
        elements.progressFilled.style.width = `${percentage * 100}%`;
        elements.progressHandle.style.left = `${percentage * 100}%`;
        
        const player = getCurrentPlayer();
        if (player.duration) {
            const newTime = percentage * player.duration;
            player.currentTime = newTime;
            updateTimeDisplay(newTime, elements.timeCurrent);
        }
    }
    
    function handleKeyboard(e) {
        const player = getCurrentPlayer();
        if (!player || !currentTrack) return;
        
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        
        switch(e.key) {
            case ' ':
            case 'Spacebar':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (e.shiftKey) {
                    playPrevious();
                } else {
                    seek(Math.max(0, player.currentTime - 10));
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (e.shiftKey) {
                    playNext();
                } else {
                    seek(Math.min(player.duration || 0, player.currentTime + 10));
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                player.volume = Math.min(1, player.volume + 0.1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                player.volume = Math.max(0, player.volume - 0.1);
                break;
            case 'm':
            case 'M':
                e.preventDefault();
                player.muted = !player.muted;
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                if (currentMode === 'video') {
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        videoPlayer.requestFullscreen();
                    }
                }
                break;
            case '0':
            case 'Home':
                e.preventDefault();
                seek(0);
                break;
            case 'End':
                e.preventDefault();
                if (player.duration) {
                    seek(player.duration);
                }
                break;
        }
    }
    
    function updateTimeDisplay(time, element) {
        if (!element || !isFinite(time)) {
            if (element) element.textContent = '0:00';
            return;
        }
        
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);
        
        if (hours > 0) {
            element.textContent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            element.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    function updateMediaSession(track) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist,
                album: 'Deus ex CT',
                artwork: [
                    { src: track.coverPath, sizes: '96x96', type: 'image/png' },
                    { src: track.coverPath, sizes: '128x128', type: 'image/png' },
                    { src: track.coverPath, sizes: '192x192', type: 'image/png' },
                    { src: track.coverPath, sizes: '256x256', type: 'image/png' },
                    { src: track.coverPath, sizes: '384x384', type: 'image/png' },
                    { src: track.coverPath, sizes: '512x512', type: 'image/png' }
                ]
            });
        }
    }
    
    function dispatchPlayStateChanged(playing) {
        window.dispatchEvent(new CustomEvent('player:playStateChanged', {
            detail: { isPlaying: playing }
        }));
    }
    
    function getPlaybackInfo() {
        const player = getCurrentPlayer();
        return {
            currentTime: player.currentTime || 0,
            duration: player.duration || 0,
            paused: player.paused,
            ended: player.ended,
            buffered: player.buffered,
            volume: player.volume,
            muted: player.muted,
            playbackRate: player.playbackRate
        };
    }
    
    function setVolume(volume) {
        const player = getCurrentPlayer();
        player.volume = Math.max(0, Math.min(1, volume));
    }
    
    function setPlaybackRate(rate) {
        const player = getCurrentPlayer();
        player.playbackRate = Math.max(0.25, Math.min(4, rate));
    }
    
    return {
        initialize,
        loadTrack,
        switchMode,
        play,
        pause,
        seek,
        getPlaybackInfo,
        setVolume,
        setPlaybackRate
    };
})();