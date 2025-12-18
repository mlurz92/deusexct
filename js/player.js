const PlayerEngine = (function() {
    let audioElement = null;
    let videoElement = null;
    let bgVideoElement = null;
    let videoWrapper = null;
    
    // State Variables
    let currentMode = 'audio';
    let currentTrack = null;
    let currentQuality = 'mid';
    let isPlaying = false;
    let isSeeking = false;
    let volume = 1.0;
    let isMutedState = false;
    let lastVolume = 1.0;
    let isVideoFullscreen = false;
    let isLoadingMedia = false;
    let pendingPlayRequest = false;
    
    // Preloading
    let preloadedNextTrack = null;
    let preloadAudioElement = null;
    let preloadVideoElement = null;
    
    // Mobile & Platform
    let userHasInteracted = false;
    let lastSyncTime = 0;
    let rafId = null;
    let isIOS = false;
    let isAndroid = false;
    let isMobile = false;
    
    // Retry & Recovery Logic
    let playbackAttempts = 0;
    let maxPlaybackAttempts = 5;
    let playbackRetryDelay = 100;
    let isInitialized = false;
    let mediaElementsReady = false;
    let playbackState = 'stopped';
    let stallRetryCount = 0;
    let maxStallRetries = 4;
    let lastStallTime = 0;
    let stallRetryDelays = [500, 1000, 2000, 4000];
    let lastLoadedTrackId = null;
    
    // Load Request Tracking (Critical for avoiding race conditions)
    let loadRequestId = 0;

    const PlaybackState = {
        STOPPED: 'stopped',
        LOADING: 'loading',
        READY: 'ready',
        PLAYING: 'playing',
        PAUSED: 'paused',
        SEEKING: 'seeking',
        STALLED: 'stalled',
        ERROR: 'error'
    };

    const callbacks = {
        onPlay: null,
        onPause: null,
        onTimeUpdate: null,
        onEnded: null,
        onError: null,
        onLoadStart: null,
        onCanPlay: null,
        onWaiting: null,
        onSeeking: null,
        onSeeked: null,
        onVolumeChange: null,
        onModeChange: null,
        onTrackChange: null,
        onDurationChange: null,
        onProgress: null,
        onFullscreenChange: null
    };

    function init() {
        if (isInitialized) {
            return;
        }

        detectPlatform();
        ensureMediaElements();
        cacheElements();
        configureMediaElements();
        createPreloadElements();
        setupUserInteractionDetection();
        detectNetworkQuality();
        setupAudioListeners();
        setupVideoListeners();
        setupFullscreenListeners();
        loadVolumeFromStorage();
        loadQualityFromStorage();
        startTimeUpdateLoop();
        
        // Initial Volume Sync
        syncVolumeState();
        
        mediaElementsReady = true;
        isInitialized = true;

        return true;
    }

    function detectPlatform() {
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        isAndroid = /android/i.test(ua);
        isMobile = isIOS || isAndroid || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        
        if (isIOS) document.documentElement.classList.add('ios-device');
        if (isAndroid) document.documentElement.classList.add('android-device');
        if (isMobile) document.documentElement.classList.add('mobile-device');
    }

    function ensureMediaElements() {
        if (!audioElement) {
            audioElement = document.createElement('audio');
            audioElement.id = 'audioPlayer';
            audioElement.setAttribute('preload', 'auto');
            audioElement.setAttribute('crossorigin', 'anonymous');
            audioElement.setAttribute('playsinline', '');
            audioElement.setAttribute('webkit-playsinline', '');
            audioElement.style.display = 'none';
            document.body.appendChild(audioElement);
        }

        if (!videoElement) {
            videoElement = document.createElement('video');
            videoElement.id = 'videoPlayer';
            videoElement.setAttribute('preload', 'auto');
            videoElement.setAttribute('playsinline', '');
            videoElement.setAttribute('webkit-playsinline', '');
            videoElement.setAttribute('crossorigin', 'anonymous');
            const vWrapper = document.getElementById('videoWrapper');
            if (vWrapper) {
                vWrapper.appendChild(videoElement);
            }
        }

        if (!bgVideoElement) {
            bgVideoElement = document.createElement('video');
            bgVideoElement.id = 'bgVideo';
            bgVideoElement.setAttribute('loop', '');
            bgVideoElement.setAttribute('muted', '');
            bgVideoElement.setAttribute('playsinline', '');
            bgVideoElement.setAttribute('webkit-playsinline', '');
            bgVideoElement.setAttribute('crossorigin', 'anonymous');
            bgVideoElement.style.display = 'none';
            const bgContainer = document.getElementById('bgVideoContainer');
            if (bgContainer) {
                bgContainer.appendChild(bgVideoElement);
            }
        }
    }

    function cacheElements() {
        audioElement = document.getElementById('audioPlayer') || audioElement;
        videoElement = document.getElementById('videoPlayer') || videoElement;
        bgVideoElement = document.getElementById('bgVideo') || bgVideoElement;
        videoWrapper = document.getElementById('videoWrapper');
    }

    function configureMediaElements() {
        [audioElement, videoElement, bgVideoElement].forEach(el => {
            if (el) {
                el.preload = 'auto';
                el.playsInline = true;
                el.crossOrigin = 'anonymous';
            }
        });

        if (bgVideoElement) {
            bgVideoElement.muted = true;
            bgVideoElement.loop = true;
            bgVideoElement.preload = 'none';
        }
    }

    function createPreloadElements() {
        preloadAudioElement = document.createElement('audio');
        preloadAudioElement.preload = 'auto';
        preloadAudioElement.muted = true;
        preloadAudioElement.crossOrigin = 'anonymous';
        
        preloadVideoElement = document.createElement('video');
        preloadVideoElement.preload = 'metadata';
        preloadVideoElement.muted = true;
        preloadVideoElement.playsInline = true;
        preloadVideoElement.crossOrigin = 'anonymous';
    }

    function setupUserInteractionDetection() {
        const interactionEvents = ['touchstart', 'touchend', 'click', 'keydown'];
        
        const handleInteraction = function() {
            if (!userHasInteracted) {
                userHasInteracted = true;
                interactionEvents.forEach(evt => document.removeEventListener(evt, handleInteraction, { capture: true }));
            }
        };
        
        interactionEvents.forEach(event => {
            document.addEventListener(event, handleInteraction, { capture: true, passive: true });
        });
    }

    function detectNetworkQuality() {
        if (navigator.connection) {
            const conn = navigator.connection;
            const updateQuality = function() {
                if (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || (conn.downlink && conn.downlink < 1.5)) {
                    currentQuality = 'low';
                } else if (conn.effectiveType === '3g' || (conn.downlink && conn.downlink < 5)) {
                    currentQuality = 'mid';
                } else {
                    currentQuality = 'mid';
                }
            };
            updateQuality();
            conn.addEventListener('change', updateQuality);
        }
    }

    // --- Volume & Sync Logic ---

    function syncVolumeState() {
        const targets = [audioElement, videoElement];
        
        targets.forEach(el => {
            if (el) {
                try {
                    el.volume = volume;
                    el.muted = isMutedState;
                } catch (e) {
                    // Ignore errors if element not ready
                }
            }
        });
    }

    function startTimeUpdateLoop() {
        let lastTime = 0;
        const updateLoop = function(timestamp) {
            if (timestamp - lastTime >= 16) { // ~60fps cap
                lastTime = timestamp;
                
                if (!isSeeking && isPlaying) {
                    const element = currentMode === 'audio' ? audioElement : videoElement;
                    if (element && !element.paused && element.duration) {
                        const currentTime = element.currentTime || 0;
                        const duration = element.duration || 0;
                        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
                        
                        if (callbacks.onTimeUpdate) {
                            callbacks.onTimeUpdate({
                                currentTime: currentTime,
                                duration: duration,
                                progress: progress,
                                mode: currentMode
                            });
                        }
                    }
                }
            }
            rafId = requestAnimationFrame(updateLoop);
        };
        rafId = requestAnimationFrame(updateLoop);
    }

    function stopTimeUpdateLoop() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    // --- Event Listeners Helper ---

    function attachCommonListeners(element, mode) {
        if (!element) return;

        element.onplay = function() {
            if (currentMode !== mode) return; 
            playbackState = PlaybackState.PLAYING;
            isPlaying = true;
            isLoadingMedia = false;
            playbackAttempts = 0;
            stallRetryCount = 0;
            if (mode === 'audio') playBackgroundVideo();
            else pauseBackgroundVideo();
            
            if (callbacks.onPlay) callbacks.onPlay({ mode: mode, track: currentTrack });
        };

        element.onpause = function() {
            if (currentMode !== mode) return;
            if (playbackState !== PlaybackState.SEEKING && playbackState !== PlaybackState.LOADING) {
                playbackState = PlaybackState.PAUSED;
                isPlaying = false;
                if (mode === 'audio') pauseBackgroundVideo();
                if (callbacks.onPause) callbacks.onPause({ mode: mode, track: currentTrack });
            }
        };

        element.onended = function() {
            if (currentMode !== mode) return;
            playbackState = PlaybackState.STOPPED;
            isPlaying = false;
            if (mode === 'audio') pauseBackgroundVideo();
            if (callbacks.onEnded) callbacks.onEnded({ mode: mode, track: currentTrack });
        };

        element.onerror = function(e) {
            if (currentMode !== mode) return;
            if (element.error && element.error.code === 20) return; // Abort error

            playbackState = PlaybackState.ERROR;
            isPlaying = false;
            isLoadingMedia = false;
            
            const error = element.error;
            const errorCode = error ? error.code : 0;
            
            if (errorCode === 20 || (error && error.message && error.message.includes('abort'))) {
                return;
            }

            if (callbacks.onError) callbacks.onError({ 
                mode: mode, 
                track: currentTrack, 
                error: error,
                errorCode: errorCode
            });
        };

        element.onwaiting = function() {
            if (currentMode !== mode) return;
            if (playbackState === PlaybackState.PLAYING) {
                playbackState = PlaybackState.STALLED;
            }
            if (callbacks.onWaiting) callbacks.onWaiting({ mode: mode, track: currentTrack });
        };

        element.oncanplay = function() {
            syncVolumeState();
            
            if (playbackState === PlaybackState.LOADING) {
                playbackState = PlaybackState.READY;
            }
        };

        element.oncanplaythrough = function() {
            if (currentMode !== mode) return;
            if (playbackState !== PlaybackState.PLAYING && playbackState !== PlaybackState.PAUSED) {
                playbackState = PlaybackState.READY;
            }
            isLoadingMedia = false;
            
            if (pendingPlayRequest) {
                pendingPlayRequest = false;
                performPlaySync();
            }
            
            if (callbacks.onCanPlay) callbacks.onCanPlay({ mode: mode, track: currentTrack });
        };

        element.onloadedmetadata = function() {
            syncVolumeState();
            if (callbacks.onDurationChange) callbacks.onDurationChange({ duration: element.duration, mode: mode });
        };

        element.onvolumechange = function() {
            if (callbacks.onVolumeChange) callbacks.onVolumeChange({ volume: element.volume, muted: element.muted });
        };

        element.onseeked = function() {
            if (currentMode !== mode) return;
            playbackState = PlaybackState.READY;
            isSeeking = false;
            stallRetryCount = 0;
            if (callbacks.onSeeked) callbacks.onSeeked({ mode: mode, time: element.currentTime });
        };

        element.onseeking = function() {
            if (currentMode !== mode) return;
            playbackState = PlaybackState.SEEKING;
            isSeeking = true;
            if (callbacks.onSeeking) callbacks.onSeeking({ mode: mode });
        };

        element.onstalled = function() {
            if (currentMode !== mode) return;
            if (playbackState === PlaybackState.PLAYING) {
                handleMediaStall(element);
            }
        };
    }

    function setupAudioListeners() {
        attachCommonListeners(audioElement, 'audio');
    }

    function setupVideoListeners() {
        attachCommonListeners(videoElement, 'video');
        
        if (videoElement) {
            videoElement.addEventListener('webkitbeginfullscreen', function() {
                isVideoFullscreen = true;
                if (callbacks.onFullscreenChange) callbacks.onFullscreenChange({ isFullscreen: true });
            });
            videoElement.addEventListener('webkitendfullscreen', function() {
                isVideoFullscreen = false;
                if (callbacks.onFullscreenChange) callbacks.onFullscreenChange({ isFullscreen: false });
            });
        }
    }

    function handleMediaStall(element) {
        if (!element || isLoadingMedia || stallRetryCount >= maxStallRetries) return;
        
        stallRetryCount++;
        const delay = stallRetryDelays[stallRetryCount - 1] || 4000;
        
        setTimeout(function() {
            if (playbackState !== PlaybackState.PLAYING || !currentTrack) return;
            
            const currentTime = element.currentTime;
            try {
                if (currentTime > 0.5) {
                    element.currentTime = currentTime - 0.1;
                }
            } catch (e) {}
            
            setTimeout(function() {
                if (playbackState === PlaybackState.PLAYING || playbackState === PlaybackState.STALLED) {
                    performPlaySync();
                }
            }, 100);
        }, delay);
    }

    function setupFullscreenListeners() {
        const handleFullscreenChange = function() {
            const wasFullscreen = isVideoFullscreen;
            isVideoFullscreen = isFullscreen();
            if (wasFullscreen !== isVideoFullscreen && callbacks.onFullscreenChange) {
                callbacks.onFullscreenChange({ isFullscreen: isVideoFullscreen });
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    }

    function loadTrack(track, mode, startTime) {
        if (!track || !mediaElementsReady) return false;
        
        loadRequestId++;
        const myRequestId = loadRequestId;

        const previousTrack = currentTrack;
        currentTrack = track;
        lastLoadedTrackId = track.id;
        startTime = startTime || 0;
        
        if (mode) currentMode = mode;
        
        playbackState = PlaybackState.LOADING;
        isLoadingMedia = true;
        pendingPlayRequest = false;
        playbackAttempts = 0;
        stallRetryCount = 0;

        // FIXED: Force reset to clear buffers and race conditions
        stopAllMedia(true);

        if (currentMode === 'audio') {
            loadAudioTrack(track, startTime, myRequestId);
        } else {
            loadVideoTrack(track, startTime, myRequestId);
        }

        if (callbacks.onTrackChange) {
            callbacks.onTrackChange({ track: track, mode: currentMode, previousTrack: previousTrack });
        }
        
        preloadNextTrack();
        
        return true;
    }

    function stopAllMedia(forceReset) {
        if (audioElement) {
            audioElement.pause();
            if (forceReset) {
                audioElement.removeAttribute('src'); 
                audioElement.load(); // Force release
            }
        }
        if (videoElement) {
            videoElement.pause();
            if (forceReset) {
                videoElement.removeAttribute('src');
                videoElement.load(); // Force release
            }
        }
        if (bgVideoElement) {
            bgVideoElement.pause();
        }
    }

    function loadAudioTrack(track, startTime, requestId) {
        if (!audioElement || !track.audioSrc) return;
        
        // FIXED: Aggressively unload video element to prevent bandwidth contention
        if (videoElement) {
            videoElement.pause();
            videoElement.removeAttribute('src');
            videoElement.load();
        }

        try {
            audioElement.src = track.audioSrc;
            audioElement.currentTime = startTime;
            syncVolumeState();
            audioElement.load();
            loadBackgroundVideo(track);
        } catch (e) {
            console.error("Audio Load Error", e);
        }
    }

    function loadVideoTrack(track, startTime, requestId) {
        if (!videoElement || !track.videoSrc) return;

        // FIXED: Aggressively unload audio element
        if (audioElement) {
            audioElement.pause();
            audioElement.removeAttribute('src');
            audioElement.load();
        }
        if (bgVideoElement) {
            bgVideoElement.pause();
        }

        const videoSrc = track.videoSrc[currentQuality] || track.videoSrc.mid || track.videoSrc.high;
        if (!videoSrc) return;

        try {
            videoElement.src = videoSrc;
            videoElement.currentTime = startTime;
            syncVolumeState();
            videoElement.load();
        } catch (e) {
            console.error("Video Load Error", e);
        }
    }

    function loadBackgroundVideo(track) {
        if (!bgVideoElement) return;
        
        if (!track || !track.backgroundSrc) {
            bgVideoElement.removeAttribute('src');
            return;
        }
        
        if (bgVideoElement.src && bgVideoElement.src.includes(track.backgroundSrc.split('/').pop())) {
            if (isPlaying && currentMode === 'audio') {
                bgVideoElement.play().catch(() => {});
            }
            return;
        }
        
        bgVideoElement.src = track.backgroundSrc;
        bgVideoElement.load();
        
        if (isPlaying && currentMode === 'audio') {
            const p = bgVideoElement.play();
            if (p) p.catch(() => {});
        }
    }

    function playBackgroundVideo() {
        if (bgVideoElement && currentMode === 'audio' && bgVideoElement.src) {
            const playPromise = bgVideoElement.play();
            if (playPromise) playPromise.catch(() => {});
        }
    }

    function pauseBackgroundVideo() {
        if (bgVideoElement && !bgVideoElement.paused) {
            bgVideoElement.pause();
        }
    }

    function performPlaySync() {
        const element = currentMode === 'audio' ? audioElement : videoElement;
        
        if (!element || !element.src) return false;
        
        syncVolumeState();

        if (element.paused === false) {
            playbackState = PlaybackState.PLAYING;
            isPlaying = true;
            return true;
        }

        const playPromise = element.play();
        
        if (playPromise !== undefined) {
            playPromise.then(function() {
                playbackState = PlaybackState.PLAYING;
                isPlaying = true;
                playbackAttempts = 0;
            }).catch(function(e) {
                const name = e.name || '';
                
                if (name === 'AbortError' || e.code === 20) {
                    return; 
                }
                
                // FIXED: Handle NotAllowedError (iOS Audio Trap) correctly without retry loop
                if (name === 'NotAllowedError') {
                    pendingPlayRequest = true;
                    isPlaying = false;
                    playbackState = PlaybackState.PAUSED;
                    // Do NOT retry here via setTimeout. 
                    // Let the UI know we need a user gesture.
                    if (callbacks.onPause) callbacks.onPause({ mode: currentMode, track: currentTrack });
                    return;
                }
                
                // Retry logic only for Network errors
                if (playbackAttempts < maxPlaybackAttempts) {
                    playbackAttempts++;
                    const delay = playbackRetryDelay * Math.pow(1.5, playbackAttempts - 1);
                    setTimeout(performPlaySync, delay);
                } else {
                    playbackState = PlaybackState.ERROR;
                    isPlaying = false;
                    if (callbacks.onError) callbacks.onError({ error: e, message: "Playback failed after retries" });
                }
            });
        }
        
        return true;
    }

    function play() {
        if (!mediaElementsReady) {
            pendingPlayRequest = true;
            return Promise.resolve();
        }

        // FIXED: Strict check for mobile interaction
        if (!userHasInteracted && isMobile) {
            pendingPlayRequest = true;
            return Promise.resolve();
        }
        
        return new Promise(resolve => {
            performPlaySync();
            resolve();
        });
    }

    function pause() {
        pendingPlayRequest = false;
        const element = currentMode === 'audio' ? audioElement : videoElement;
        if (element && !element.paused) {
            element.pause();
        }
        playbackState = PlaybackState.PAUSED;
        isPlaying = false;
    }

    function togglePlayPause() {
        if (isPlaying) {
            pause();
            return Promise.resolve();
        } else {
            return play();
        }
    }

    function stop() {
        pause();
        seek(0);
        pauseBackgroundVideo();
        isPlaying = false;
        playbackState = PlaybackState.STOPPED;
    }

    function seek(time) {
        const element = currentMode === 'audio' ? audioElement : videoElement;
        if (!element || !element.duration || !isFinite(element.duration)) return;
        
        try {
            element.currentTime = Math.max(0, Math.min(time, element.duration - 0.1));
        } catch (e) {}
    }

    function seekPercent(percent) {
        const element = currentMode === 'audio' ? audioElement : videoElement;
        if (!element || !element.duration) return;
        seek((percent / 100) * element.duration);
    }

    function seekRelative(seconds) {
        const element = currentMode === 'audio' ? audioElement : videoElement;
        if (!element) return;
        seek(element.currentTime + seconds);
    }

    // --- Volume Management ---

    function setVolume(value) {
        volume = Math.max(0, Math.min(1, value));
        
        if (volume > 0) {
            lastVolume = volume;
            isMutedState = false;
        }
        
        syncVolumeState();
        saveVolumeToStorage();
    }

    function getVolume() {
        return volume;
    }

    function mute() {
        isMutedState = true;
        syncVolumeState();
        saveVolumeToStorage();
    }

    function unmute() {
        isMutedState = false;
        syncVolumeState();
        saveVolumeToStorage();
    }

    function toggleMute() {
        if (isMutedState) {
            unmute();
            if (volume === 0) setVolume(lastVolume > 0 ? lastVolume : 0.5);
        } else {
            mute();
        }
        return isMutedState;
    }

    function isMuted() {
        return isMutedState;
    }

    // --- Mode Switching (Robust Version) ---

    function switchMode(newMode, preservePosition) {
        if (newMode === currentMode) return Promise.resolve();
        
        loadRequestId++;
        const myRequestId = loadRequestId;

        const wasPlaying = isPlaying;
        
        const sourceElement = currentMode === 'audio' ? audioElement : videoElement;
        const currentTime = sourceElement ? sourceElement.currentTime : 0;
        
        // FIXED: Using force reset to ensure clean state
        stopAllMedia(true);
        
        const previousMode = currentMode;
        currentMode = newMode;
        
        if (callbacks.onModeChange) {
            callbacks.onModeChange({ previousMode: previousMode, currentMode: newMode, track: currentTrack });
        }

        if (!currentTrack) return Promise.resolve();

        playbackState = PlaybackState.LOADING;
        isLoadingMedia = true;
        
        return new Promise((resolve, reject) => {
            const targetElement = currentMode === 'audio' ? audioElement : videoElement;
            const targetSrc = currentMode === 'audio' ? currentTrack.audioSrc : (currentTrack.videoSrc[currentQuality] || currentTrack.videoSrc.mid);

            if (!targetSrc) {
                reject(new Error("No source"));
                return;
            }

            const cleanup = () => {
                targetElement.removeEventListener('canplay', onReady);
                targetElement.removeEventListener('error', onError);
            };

            const onReady = () => {
                // FIXED: Check requestId to prevent race conditions
                if (loadRequestId !== myRequestId) return;
                cleanup();
                
                playbackState = PlaybackState.READY;
                isLoadingMedia = false;
                
                if (preservePosition && currentTime > 0) {
                    try {
                        if (targetElement.duration) {
                            targetElement.currentTime = Math.min(currentTime, targetElement.duration - 0.1);
                        }
                    } catch(e) {}
                }
                
                syncVolumeState();

                if (currentMode === 'audio') {
                    loadBackgroundVideo(currentTrack);
                } else {
                    pauseBackgroundVideo();
                }

                if (wasPlaying) {
                    performPlaySync();
                }
                resolve();
            };

            const onError = (e) => {
                if (loadRequestId !== myRequestId) return;
                cleanup();
                if (targetElement.error && targetElement.error.code === 20) return;
                
                playbackState = PlaybackState.ERROR;
                reject(e);
            };

            targetElement.addEventListener('canplay', onReady, { once: true });
            targetElement.addEventListener('error', onError, { once: true });

            targetElement.src = targetSrc;
            syncVolumeState();
            targetElement.load();
            
            setTimeout(() => {
                if (loadRequestId === myRequestId && playbackState === PlaybackState.LOADING) {
                    if (targetElement.readyState >= 3) {
                        onReady();
                    }
                }
            }, 5000);
        });
    }

    function setQuality(quality) {
        if (['low', 'mid', 'high'].includes(quality) && quality !== currentQuality) {
            currentQuality = quality;
            saveQualityToStorage();
            
            if (currentMode === 'video' && currentTrack) {
                const currentTime = videoElement ? videoElement.currentTime : 0;
                const wasPlaying = isPlaying;
                
                loadVideoTrack(currentTrack, currentTime, loadRequestId);
                
                if (wasPlaying) {
                    const onCanPlay = () => {
                        videoElement.removeEventListener('canplay', onCanPlay);
                        performPlaySync();
                    };
                    videoElement.addEventListener('canplay', onCanPlay, { once: true });
                }
            }
        }
        return true;
    }

    function getQuality() { return currentQuality; }
    function getCurrentTime() { return (currentMode === 'audio' ? audioElement : videoElement)?.currentTime || 0; }
    function getDuration() { return (currentMode === 'audio' ? audioElement : videoElement)?.duration || 0; }
    function getProgress() { 
        const el = currentMode === 'audio' ? audioElement : videoElement;
        return (el && el.duration) ? (el.currentTime / el.duration) * 100 : 0; 
    }
    function getRemainingTime() {
        const el = currentMode === 'audio' ? audioElement : videoElement;
        return (el && el.duration) ? el.duration - el.currentTime : 0;
    }
    function getIsPlaying() { return isPlaying; }
    function getCurrentMode() { return currentMode; }
    function getCurrentTrack() { return currentTrack; }
    function getAudioElement() { return audioElement; }
    function getVideoElement() { return videoElement; }
    
    function setPlaybackRate(rate) {
        const r = Math.max(0.25, Math.min(4, rate));
        if (audioElement) audioElement.playbackRate = r;
        if (videoElement) videoElement.playbackRate = r;
    }
    function getPlaybackRate() { return (currentMode === 'audio' ? audioElement : videoElement)?.playbackRate || 1; }

    function preloadNextTrack() {
        if (typeof PlaylistManager === 'undefined') return;
        const nextTrack = PlaylistManager.getNextTrack();
        if (!nextTrack || (preloadedNextTrack && preloadedNextTrack.id === nextTrack.id)) return;
        
        preloadedNextTrack = nextTrack;
        if (nextTrack.audioSrc && preloadAudioElement) {
            preloadAudioElement.src = nextTrack.audioSrc;
            preloadAudioElement.load();
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        seconds = Math.max(0, Math.floor(seconds));
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function on(event, callback) {
        const key = 'on' + event.charAt(0).toUpperCase() + event.slice(1);
        if (callbacks.hasOwnProperty(key)) callbacks[key] = callback;
    }
    function off(event) {
        const key = 'on' + event.charAt(0).toUpperCase() + event.slice(1);
        if (callbacks.hasOwnProperty(key)) callbacks[key] = null;
    }

    // Storage
    function saveVolumeToStorage() {
        try {
            localStorage.setItem('deusExCT_volume', volume.toString());
            localStorage.setItem('deusExCT_muted', isMutedState.toString());
        } catch (e) {}
    }
    function loadVolumeFromStorage() {
        try {
            const v = localStorage.getItem('deusExCT_volume');
            const m = localStorage.getItem('deusExCT_muted');
            if (v !== null) volume = parseFloat(v) || 1.0;
            if (m !== null) isMutedState = m === 'true';
        } catch (e) {}
    }
    function saveQualityToStorage() { try { localStorage.setItem('deusExCT_quality', currentQuality); } catch(e){} }
    function loadQualityFromStorage() {
        try {
            const q = localStorage.getItem('deusExCT_quality');
            if (q && ['low','mid','high'].includes(q)) currentQuality = q;
        } catch(e){}
    }
    function saveStateToStorage() {
        try {
            const state = {
                trackId: currentTrack?.id,
                mode: currentMode,
                quality: currentQuality,
                position: getCurrentTime(),
                volume: volume,
                muted: isMutedState
            };
            localStorage.setItem('deusExCT_playerState', JSON.stringify(state));
        } catch(e){}
    }
    function loadStateFromStorage() {
        try {
            const saved = localStorage.getItem('deusExCT_playerState');
            return saved ? JSON.parse(saved) : null;
        } catch(e) { return null; }
    }

    function enterFullscreen() {
        const container = videoWrapper || videoElement;
        if (!container) return Promise.reject(new Error("No element"));
        if (container.requestFullscreen) return container.requestFullscreen();
        if (container.webkitRequestFullscreen) return container.webkitRequestFullscreen();
        if (container.webkitEnterFullscreen) return container.webkitEnterFullscreen();
        return Promise.reject(new Error("Fullscreen not supported"));
    }
    function exitFullscreen() {
        if (document.exitFullscreen) return document.exitFullscreen();
        if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
        if (videoElement && videoElement.webkitExitFullscreen) return videoElement.webkitExitFullscreen();
        return Promise.reject(new Error("Exit not supported"));
    }
    function toggleFullscreen() { return isFullscreen() ? exitFullscreen() : enterFullscreen(); }
    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || (videoElement && videoElement.webkitDisplayingFullscreen));
    }

    function preloadTrack(track) {
        if (!track) return;
        if (track.audioSrc) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = track.audioSrc;
            link.as = 'audio';
            document.head.appendChild(link);
        }
    }

    function startSeek() { isSeeking = true; playbackState = PlaybackState.SEEKING; }
    function endSeek(time) { isSeeking = false; if (typeof time === 'number') seek(time); }
    function isCurrentlySeeking() { return isSeeking; }
    function getUserHasInteracted() { return userHasInteracted; }
    function getIsMobile() { return isMobile; }
    function getIsIOS() { return isIOS; }
    function getPlaybackState() { return playbackState; }
    function isMediaReady() { return mediaElementsReady; }

    function destroy() {
        saveStateToStorage();
        stopTimeUpdateLoop();
        stopAllMedia(true);
        currentTrack = null;
        isPlaying = false;
        playbackState = PlaybackState.STOPPED;
    }

    return {
        init, loadTrack, play, pause, togglePlayPause, stop, seek, seekPercent, seekRelative,
        setVolume, getVolume, mute, unmute, toggleMute, isMuted, switchMode, setQuality, getQuality,
        getCurrentTime, getDuration, getProgress, getRemainingTime, getIsPlaying, getCurrentMode,
        getCurrentTrack, getAudioElement, getVideoElement, formatTime, on, off,
        saveStateToStorage, loadStateFromStorage, enterFullscreen, exitFullscreen, toggleFullscreen,
        isFullscreen, preloadTrack, destroy, startSeek, endSeek, isCurrentlySeeking,
        setPlaybackRate, getPlaybackRate, getUserHasInteracted, getIsMobile, getIsIOS, getPlaybackState, isMediaReady
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerEngine;
}