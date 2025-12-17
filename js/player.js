const PlayerEngine = (function() {
    let audioElement = null;
    let videoElement = null;
    let bgVideoElement = null;
    let videoWrapper = null;
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
    let preloadedNextTrack = null;
    let preloadAudioElement = null;
    let preloadVideoElement = null;
    let userHasInteracted = false;
    let lastSyncTime = 0;
    let rafId = null;
    let isIOS = false;
    let isAndroid = false;
    let isMobile = false;
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

    const ErrorType = {
        NOT_ALLOWED: 'NotAllowedError',
        ABORT: 'AbortError',
        NOT_SUPPORTED: 'NotSupportedError',
        NETWORK: 'NetworkError',
        DECODE: 'DecodeError',
        UNKNOWN: 'UnknownError'
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
        mediaElementsReady = true;
        isInitialized = true;

        return true;
    }

    function detectPlatform() {
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        isAndroid = /android/i.test(ua);
        isMobile = isIOS || isAndroid || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        
        if (isIOS) {
            document.documentElement.classList.add('ios-device');
        }
        if (isAndroid) {
            document.documentElement.classList.add('android-device');
        }
        if (isMobile) {
            document.documentElement.classList.add('mobile-device');
        }
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
        if (audioElement) {
            audioElement.preload = 'auto';
            audioElement.playsInline = true;
            audioElement.setAttribute('playsinline', '');
            audioElement.setAttribute('webkit-playsinline', '');
            audioElement.crossOrigin = 'anonymous';
        }

        if (videoElement) {
            videoElement.preload = 'auto';
            videoElement.playsInline = true;
            videoElement.setAttribute('playsinline', '');
            videoElement.setAttribute('webkit-playsinline', '');
            videoElement.crossOrigin = 'anonymous';
            if (isIOS) {
                videoElement.setAttribute('x-webkit-airplay', 'allow');
            }
        }

        if (bgVideoElement) {
            bgVideoElement.muted = true;
            bgVideoElement.loop = true;
            bgVideoElement.playsInline = true;
            bgVideoElement.setAttribute('playsinline', '');
            bgVideoElement.setAttribute('webkit-playsinline', '');
            bgVideoElement.setAttribute('x5-playsinline', '');
            bgVideoElement.setAttribute('x5-video-player-type', 'h5');
            bgVideoElement.setAttribute('x5-video-player-fullscreen', 'false');
            bgVideoElement.preload = 'none';
            bgVideoElement.crossOrigin = 'anonymous';
        }
    }

    function createPreloadElements() {
        preloadAudioElement = document.createElement('audio');
        preloadAudioElement.preload = 'auto';
        preloadAudioElement.volume = 0;
        preloadAudioElement.muted = true;
        preloadAudioElement.crossOrigin = 'anonymous';
        
        preloadVideoElement = document.createElement('video');
        preloadVideoElement.preload = 'metadata';
        preloadVideoElement.volume = 0;
        preloadVideoElement.muted = true;
        preloadVideoElement.playsInline = true;
        preloadVideoElement.crossOrigin = 'anonymous';
    }

    function setupUserInteractionDetection() {
        const interactionEvents = ['touchstart', 'touchend', 'click', 'keydown'];
        
        const handleInteraction = function() {
            if (!userHasInteracted) {
                userHasInteracted = true;
                
                try {
                    if (audioElement && audioElement.src) {
                        audioElement.load();
                    }
                    if (videoElement && videoElement.src) {
                        videoElement.load();
                    }
                    if (bgVideoElement && bgVideoElement.src) {
                        bgVideoElement.play().catch(function() {});
                        bgVideoElement.pause();
                    }
                } catch (e) {}
                
                interactionEvents.forEach(function(event) {
                    document.removeEventListener(event, handleInteraction, { capture: true });
                });
            }
        };
        
        interactionEvents.forEach(function(event) {
            document.addEventListener(event, handleInteraction, { capture: true, passive: true });
        });
    }

    function detectNetworkQuality() {
        if (navigator.connection) {
            const conn = navigator.connection;
            const updateQuality = function() {
                if (conn.saveData) {
                    currentQuality = 'low';
                } else if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
                    currentQuality = 'low';
                } else if (conn.effectiveType === '3g') {
                    currentQuality = 'low';
                } else if (conn.downlink && conn.downlink < 1.5) {
                    currentQuality = 'low';
                } else if (conn.downlink && conn.downlink < 5) {
                    currentQuality = 'mid';
                } else {
                    currentQuality = 'mid';
                }
            };
            
            updateQuality();
            conn.addEventListener('change', updateQuality);
        }
    }

    function startTimeUpdateLoop() {
        let lastTime = 0;
        
        const updateLoop = function(timestamp) {
            if (timestamp - lastTime >= 16) {
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

    function setupAudioListeners() {
        if (!audioElement) return;

        audioElement.addEventListener('play', function() {
            playbackState = PlaybackState.PLAYING;
            isPlaying = true;
            isLoadingMedia = false;
            playbackAttempts = 0;
            stallRetryCount = 0;
            playBackgroundVideo();
            if (callbacks.onPlay) callbacks.onPlay({ mode: 'audio', track: currentTrack });
        });

        audioElement.addEventListener('pause', function() {
            if (playbackState !== PlaybackState.SEEKING && playbackState !== PlaybackState.LOADING) {
                playbackState = PlaybackState.PAUSED;
                isPlaying = false;
                pauseBackgroundVideo();
                if (callbacks.onPause) callbacks.onPause({ mode: 'audio', track: currentTrack });
            }
        });

        audioElement.addEventListener('ended', function() {
            playbackState = PlaybackState.STOPPED;
            isPlaying = false;
            pauseBackgroundVideo();
            if (callbacks.onEnded) callbacks.onEnded({ mode: 'audio', track: currentTrack });
        });

        audioElement.addEventListener('error', function(e) {
            playbackState = PlaybackState.ERROR;
            isPlaying = false;
            isLoadingMedia = false;
            pendingPlayRequest = false;
            playbackAttempts = 0;
            const error = audioElement.error;
            const errorCode = error ? error.code : 0;
            if (callbacks.onError) callbacks.onError({ 
                mode: 'audio', 
                track: currentTrack, 
                error: error,
                errorCode: errorCode
            });
        });

        audioElement.addEventListener('waiting', function() {
            if (playbackState === PlaybackState.PLAYING) {
                playbackState = PlaybackState.STALLED;
            }
            if (callbacks.onWaiting) callbacks.onWaiting({ mode: 'audio', track: currentTrack });
        });

        audioElement.addEventListener('canplaythrough', function() {
            if (playbackState !== PlaybackState.PLAYING && playbackState !== PlaybackState.PAUSED) {
                playbackState = PlaybackState.READY;
            }
            isLoadingMedia = false;
            if (pendingPlayRequest) {
                pendingPlayRequest = false;
                performPlaySync();
            }
            if (callbacks.onCanPlay) callbacks.onCanPlay({ mode: 'audio', track: currentTrack });
        });

        audioElement.addEventListener('canplay', function() {
            if (playbackState === PlaybackState.LOADING) {
                playbackState = PlaybackState.READY;
            }
        });

        audioElement.addEventListener('loadedmetadata', function() {
            if (callbacks.onDurationChange) callbacks.onDurationChange({ duration: audioElement.duration, mode: 'audio' });
        });

        audioElement.addEventListener('volumechange', function() {
            if (callbacks.onVolumeChange) callbacks.onVolumeChange({ volume: audioElement.volume, muted: audioElement.muted });
        });

        audioElement.addEventListener('progress', function() {
            if (callbacks.onProgress) {
                const buffered = getBufferedPercentage(audioElement);
                callbacks.onProgress({ buffered: buffered, mode: 'audio' });
            }
        });

        audioElement.addEventListener('seeked', function() {
            playbackState = PlaybackState.READY;
            isSeeking = false;
            stallRetryCount = 0;
            if (callbacks.onSeeked) callbacks.onSeeked({ mode: 'audio', time: audioElement.currentTime });
        });

        audioElement.addEventListener('seeking', function() {
            playbackState = PlaybackState.SEEKING;
            isSeeking = true;
            if (callbacks.onSeeking) callbacks.onSeeking({ mode: 'audio' });
        });

        audioElement.addEventListener('stalled', function() {
            if (playbackState === PlaybackState.PLAYING && currentTrack && currentTrack.id === lastLoadedTrackId) {
                const currentTime = Date.now();
                if (currentTime - lastStallTime > 1000) {
                    lastStallTime = currentTime;
                    stallRetryCount = 0;
                }
                if (stallRetryCount < maxStallRetries) {
                    handleMediaStall(audioElement);
                }
            }
        });

        audioElement.addEventListener('loadstart', function() {
            playbackState = PlaybackState.LOADING;
            isLoadingMedia = true;
            if (callbacks.onLoadStart) callbacks.onLoadStart({ mode: 'audio', track: currentTrack });
        });

        audioElement.addEventListener('abort', function() {
            if (playbackState === PlaybackState.LOADING && currentTrack && currentTrack.id === lastLoadedTrackId) {
                playbackState = PlaybackState.ERROR;
                isLoadingMedia = false;
            }
        });
    }

    function setupVideoListeners() {
        if (!videoElement) return;

        videoElement.addEventListener('play', function() {
            playbackState = PlaybackState.PLAYING;
            isPlaying = true;
            isLoadingMedia = false;
            playbackAttempts = 0;
            stallRetryCount = 0;
            pauseBackgroundVideo();
            if (callbacks.onPlay) callbacks.onPlay({ mode: 'video', track: currentTrack });
        });

        videoElement.addEventListener('pause', function() {
            if (playbackState !== PlaybackState.SEEKING && playbackState !== PlaybackState.LOADING) {
                playbackState = PlaybackState.PAUSED;
                isPlaying = false;
                if (callbacks.onPause) callbacks.onPause({ mode: 'video', track: currentTrack });
            }
        });

        videoElement.addEventListener('ended', function() {
            playbackState = PlaybackState.STOPPED;
            isPlaying = false;
            if (callbacks.onEnded) callbacks.onEnded({ mode: 'video', track: currentTrack });
        });

        videoElement.addEventListener('error', function(e) {
            playbackState = PlaybackState.ERROR;
            isPlaying = false;
            isLoadingMedia = false;
            pendingPlayRequest = false;
            playbackAttempts = 0;
            const error = videoElement.error;
            const errorCode = error ? error.code : 0;
            if (callbacks.onError) callbacks.onError({ 
                mode: 'video', 
                track: currentTrack, 
                error: error,
                errorCode: errorCode
            });
        });

        videoElement.addEventListener('waiting', function() {
            if (playbackState === PlaybackState.PLAYING) {
                playbackState = PlaybackState.STALLED;
            }
            if (callbacks.onWaiting) callbacks.onWaiting({ mode: 'video', track: currentTrack });
        });

        videoElement.addEventListener('canplaythrough', function() {
            if (playbackState !== PlaybackState.PLAYING && playbackState !== PlaybackState.PAUSED) {
                playbackState = PlaybackState.READY;
            }
            isLoadingMedia = false;
            if (pendingPlayRequest) {
                pendingPlayRequest = false;
                performPlaySync();
            }
            if (callbacks.onCanPlay) callbacks.onCanPlay({ mode: 'video', track: currentTrack });
        });

        videoElement.addEventListener('canplay', function() {
            if (playbackState === PlaybackState.LOADING) {
                playbackState = PlaybackState.READY;
            }
        });

        videoElement.addEventListener('loadedmetadata', function() {
            if (callbacks.onDurationChange) callbacks.onDurationChange({ duration: videoElement.duration, mode: 'video' });
        });

        videoElement.addEventListener('volumechange', function() {
            if (callbacks.onVolumeChange) callbacks.onVolumeChange({ volume: videoElement.volume, muted: videoElement.muted });
        });

        videoElement.addEventListener('progress', function() {
            if (callbacks.onProgress) {
                const buffered = getBufferedPercentage(videoElement);
                callbacks.onProgress({ buffered: buffered, mode: 'video' });
            }
        });

        videoElement.addEventListener('seeked', function() {
            playbackState = PlaybackState.READY;
            isSeeking = false;
            stallRetryCount = 0;
            if (callbacks.onSeeked) callbacks.onSeeked({ mode: 'video', time: videoElement.currentTime });
        });

        videoElement.addEventListener('seeking', function() {
            playbackState = PlaybackState.SEEKING;
            isSeeking = true;
            if (callbacks.onSeeking) callbacks.onSeeking({ mode: 'video' });
        });

        videoElement.addEventListener('webkitbeginfullscreen', function() {
            isVideoFullscreen = true;
            if (callbacks.onFullscreenChange) callbacks.onFullscreenChange({ isFullscreen: true });
        });

        videoElement.addEventListener('webkitendfullscreen', function() {
            isVideoFullscreen = false;
            if (callbacks.onFullscreenChange) callbacks.onFullscreenChange({ isFullscreen: false });
        });

        videoElement.addEventListener('stalled', function() {
            if (playbackState === PlaybackState.PLAYING && currentTrack && currentTrack.id === lastLoadedTrackId) {
                const currentTime = Date.now();
                if (currentTime - lastStallTime > 1000) {
                    lastStallTime = currentTime;
                    stallRetryCount = 0;
                }
                if (stallRetryCount < maxStallRetries) {
                    handleMediaStall(videoElement);
                }
            }
        });

        videoElement.addEventListener('loadstart', function() {
            playbackState = PlaybackState.LOADING;
            isLoadingMedia = true;
            if (callbacks.onLoadStart) callbacks.onLoadStart({ mode: 'video', track: currentTrack });
        });

        videoElement.addEventListener('abort', function() {
            if (playbackState === PlaybackState.LOADING && currentTrack && currentTrack.id === lastLoadedTrackId) {
                playbackState = PlaybackState.ERROR;
                isLoadingMedia = false;
            }
        });
    }

    function handleMediaStall(element) {
        if (!element || isLoadingMedia || stallRetryCount >= maxStallRetries) return;
        
        stallRetryCount++;
        const delay = stallRetryDelays[stallRetryCount - 1] || 4000;
        
        setTimeout(function() {
            if (playbackState !== PlaybackState.PLAYING || !currentTrack || currentTrack.id !== lastLoadedTrackId) return;
            
            const currentTime = element.currentTime;
            try {
                element.load();
                if (currentTime > 0.5) {
                    element.currentTime = currentTime - 0.5;
                } else {
                    element.currentTime = 0;
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

    function getBufferedPercentage(element) {
        if (!element || !element.buffered || element.buffered.length === 0) return 0;
        const duration = element.duration;
        if (!duration || isNaN(duration)) return 0;
        
        let bufferedEnd = 0;
        const currentTime = element.currentTime;
        
        for (let i = 0; i < element.buffered.length; i++) {
            if (element.buffered.start(i) <= currentTime && element.buffered.end(i) >= currentTime) {
                bufferedEnd = element.buffered.end(i);
                break;
            }
        }
        
        return (bufferedEnd / duration) * 100;
    }

    function loadTrack(track, mode, startTime) {
        if (!track || !mediaElementsReady) return false;
        
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

        if (currentMode === 'audio') {
            loadAudioTrack(track, startTime);
        } else {
            loadVideoTrack(track, startTime);
        }

        if (callbacks.onTrackChange) {
            callbacks.onTrackChange({ track: track, mode: currentMode, previousTrack: previousTrack });
        }
        
        preloadNextTrack();
        
        return true;
    }

    function loadAudioTrack(track, startTime) {
        if (!audioElement || !track.audioSrc) return false;
        
        pauseVideoInternal();
        
        const onCanPlayHandler = function() {
            audioElement.removeEventListener('canplay', onCanPlayHandler);
            audioElement.removeEventListener('error', onErrorHandler);
            audioElement.removeEventListener('loadstart', onLoadstartHandler);
            
            if (startTime > 0) {
                try {
                    if (audioElement.duration && isFinite(audioElement.duration)) {
                        audioElement.currentTime = Math.min(startTime, audioElement.duration - 0.1);
                    }
                } catch (e) {}
            }
            
            audioElement.volume = isMutedState ? 0 : volume;
            audioElement.muted = isMutedState;
        };

        const onErrorHandler = function() {
            audioElement.removeEventListener('canplay', onCanPlayHandler);
            audioElement.removeEventListener('error', onErrorHandler);
            audioElement.removeEventListener('loadstart', onLoadstartHandler);
            playbackState = PlaybackState.ERROR;
            isLoadingMedia = false;
        };

        const onLoadstartHandler = function() {
            audioElement.removeEventListener('loadstart', onLoadstartHandler);
            if (audioElement.readyState >= 3) {
                onCanPlayHandler();
            }
        };
        
        audioElement.addEventListener('canplay', onCanPlayHandler, { once: true });
        audioElement.addEventListener('error', onErrorHandler, { once: true });
        audioElement.addEventListener('loadstart', onLoadstartHandler, { once: true });
        
        audioElement.src = track.audioSrc;
        audioElement.load();
        
        if (audioElement.readyState >= 3) {
            onCanPlayHandler();
        }
        
        loadBackgroundVideo(track);

        return true;
    }

    function loadVideoTrack(track, startTime) {
        if (!videoElement || !track.videoSrc) return false;

        pauseAudioInternal();
        pauseBackgroundVideo();

        const videoSrc = track.videoSrc[currentQuality] || track.videoSrc.mid || track.videoSrc.high || track.videoSrc.low;
        
        if (!videoSrc) return false;
        
        const onCanPlayHandler = function() {
            videoElement.removeEventListener('canplay', onCanPlayHandler);
            videoElement.removeEventListener('error', onErrorHandler);
            videoElement.removeEventListener('loadstart', onLoadstartHandler);
            
            if (startTime > 0) {
                try {
                    if (videoElement.duration && isFinite(videoElement.duration)) {
                        videoElement.currentTime = Math.min(startTime, videoElement.duration - 0.1);
                    }
                } catch (e) {}
            }
            
            videoElement.volume = isMutedState ? 0 : volume;
            videoElement.muted = isMutedState;
        };

        const onErrorHandler = function() {
            videoElement.removeEventListener('canplay', onCanPlayHandler);
            videoElement.removeEventListener('error', onErrorHandler);
            videoElement.removeEventListener('loadstart', onLoadstartHandler);
            playbackState = PlaybackState.ERROR;
            isLoadingMedia = false;
        };

        const onLoadstartHandler = function() {
            videoElement.removeEventListener('loadstart', onLoadstartHandler);
            if (videoElement.readyState >= 3) {
                onCanPlayHandler();
            }
        };

        videoElement.addEventListener('canplay', onCanPlayHandler, { once: true });
        videoElement.addEventListener('error', onErrorHandler, { once: true });
        videoElement.addEventListener('loadstart', onLoadstartHandler, { once: true });
        
        videoElement.src = videoSrc;
        videoElement.load();

        if (videoElement.readyState >= 3) {
            onCanPlayHandler();
        }
        
        return true;
    }

    function loadBackgroundVideo(track) {
        if (!bgVideoElement) return;
        
        if (!track || !track.backgroundSrc) {
            bgVideoElement.removeAttribute('src');
            bgVideoElement.load();
            return;
        }
        
        if (bgVideoElement.src && bgVideoElement.src.includes(track.backgroundSrc.split('/').pop())) {
            return;
        }
        
        const onCanPlayBgHandler = function() {
            bgVideoElement.removeEventListener('canplaythrough', onCanPlayBgHandler);
            if (isPlaying && currentMode === 'audio') {
                bgVideoElement.play().catch(function() {});
            }
        };
        
        bgVideoElement.addEventListener('canplaythrough', onCanPlayBgHandler, { once: true });
        bgVideoElement.src = track.backgroundSrc;
        bgVideoElement.load();
    }

    function preloadNextTrack() {
        if (typeof PlaylistManager === 'undefined') return;
        
        const nextTrack = PlaylistManager.getNextTrack();
        if (!nextTrack || (preloadedNextTrack && preloadedNextTrack.id === nextTrack.id)) {
            return;
        }
        
        preloadedNextTrack = nextTrack;
        
        if (nextTrack.audioSrc && preloadAudioElement) {
            preloadAudioElement.src = nextTrack.audioSrc;
            preloadAudioElement.load();
        }
        
        if (nextTrack.videoSrc && preloadVideoElement) {
            const videoSrc = nextTrack.videoSrc[currentQuality] || nextTrack.videoSrc.mid;
            if (videoSrc) {
                preloadVideoElement.src = videoSrc;
                preloadVideoElement.load();
            }
        }
        
        if (nextTrack.imageSrc) {
            const img = new Image();
            img.src = nextTrack.imageSrc;
        }
    }

    function playBackgroundVideo() {
        if (bgVideoElement && currentMode === 'audio' && bgVideoElement.src) {
            const playPromise = bgVideoElement.play();
            if (playPromise !== undefined) {
                playPromise.catch(function() {});
            }
        }
    }

    function pauseBackgroundVideo() {
        if (bgVideoElement && !bgVideoElement.paused) {
            bgVideoElement.pause();
        }
    }

    function pauseAudioInternal() {
        if (audioElement && !audioElement.paused) {
            audioElement.pause();
        }
    }

    function pauseVideoInternal() {
        if (videoElement && !videoElement.paused) {
            videoElement.pause();
        }
    }

    function performPlaySync() {
        const element = currentMode === 'audio' ? audioElement : videoElement;
        if (!element || !element.src) {
            return false;
        }

        if (element.paused === false) {
            return true;
        }

        lastSyncTime = element.currentTime || 0;

        try {
            const playPromise = element.play();
            
            if (playPromise !== undefined) {
                playPromise.then(function() {
                    playbackState = PlaybackState.PLAYING;
                    isPlaying = true;
                    playbackAttempts = 0;
                    return true;
                }).catch(function(e) {
                    const errorName = e.name || 'UnknownError';
                    if (errorName === 'NotAllowedError') {
                        pendingPlayRequest = true;
                        isPlaying = false;
                        return false;
                    } else if (errorName === 'AbortError') {
                        return false;
                    } else if (errorName === 'NotSupportedError') {
                        playbackState = PlaybackState.ERROR;
                        isPlaying = false;
                        return false;
                    } else {
                        if (playbackAttempts < maxPlaybackAttempts) {
                            playbackAttempts++;
                            const delay = playbackRetryDelay * Math.pow(1.5, playbackAttempts - 1);
                            setTimeout(performPlaySync, delay);
                        } else {
                            playbackState = PlaybackState.ERROR;
                            isPlaying = false;
                        }
                        return false;
                    }
                });
            } else {
                playbackState = PlaybackState.PLAYING;
                isPlaying = true;
                playbackAttempts = 0;
                return true;
            }
        } catch (e) {
            if (playbackAttempts < maxPlaybackAttempts) {
                playbackAttempts++;
                const delay = playbackRetryDelay * Math.pow(1.5, playbackAttempts - 1);
                setTimeout(performPlaySync, delay);
            }
            return false;
        }

        return true;
    }

    function play() {
        if (!mediaElementsReady) {
            pendingPlayRequest = true;
            return Promise.resolve();
        }

        if (!userHasInteracted && isMobile) {
            pendingPlayRequest = true;
            return Promise.resolve();
        }
        
        const element = currentMode === 'audio' ? audioElement : videoElement;
        if (!element || !element.src) {
            return Promise.reject(new Error('No source'));
        }

        if (playbackState === PlaybackState.LOADING || element.readyState < 2) {
            pendingPlayRequest = true;
            return Promise.resolve();
        }
        
        return new Promise(function(resolve, reject) {
            try {
                if (element.paused === false) {
                    resolve();
                    return;
                }

                const playPromise = element.play();
                
                if (playPromise !== undefined) {
                    playPromise.then(function() {
                        playbackState = PlaybackState.PLAYING;
                        isPlaying = true;
                        playbackAttempts = 0;
                        resolve();
                    }).catch(function(e) {
                        const errorName = e.name || 'UnknownError';
                        if (errorName === 'NotAllowedError') {
                            pendingPlayRequest = true;
                            isPlaying = false;
                            resolve();
                        } else if (errorName === 'AbortError') {
                            resolve();
                        } else {
                            if (playbackAttempts < maxPlaybackAttempts) {
                                playbackAttempts++;
                                const delay = playbackRetryDelay * Math.pow(1.5, playbackAttempts - 1);
                                setTimeout(function() {
                                    play().then(resolve).catch(reject);
                                }, delay);
                            } else {
                                playbackState = PlaybackState.ERROR;
                                isPlaying = false;
                                reject(e);
                            }
                        }
                    });
                } else {
                    playbackState = PlaybackState.PLAYING;
                    isPlaying = true;
                    playbackAttempts = 0;
                    resolve();
                }
            } catch (e) {
                if (playbackAttempts < maxPlaybackAttempts) {
                    playbackAttempts++;
                    const delay = playbackRetryDelay * Math.pow(1.5, playbackAttempts - 1);
                    setTimeout(function() {
                        play().then(resolve).catch(reject);
                    }, delay);
                } else {
                    reject(e);
                }
            }
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
        
        const clampedTime = Math.max(0, Math.min(time, element.duration - 0.1));
        
        try {
            element.currentTime = clampedTime;
            lastSyncTime = clampedTime;
        } catch (e) {}
    }

    function seekPercent(percent) {
        const element = currentMode === 'audio' ? audioElement : videoElement;
        if (!element || !element.duration || isNaN(element.duration)) return;
        
        const time = (percent / 100) * element.duration;
        seek(time);
    }

    function seekRelative(seconds) {
        const element = currentMode === 'audio' ? audioElement : videoElement;
        if (!element) return;
        
        const newTime = (element.currentTime || 0) + seconds;
        seek(newTime);
    }

    function setVolume(value) {
        volume = Math.max(0, Math.min(1, value));
        
        if (audioElement) audioElement.volume = volume;
        if (videoElement) videoElement.volume = volume;

        if (volume > 0) {
            lastVolume = volume;
            isMutedState = false;
            if (audioElement) audioElement.muted = false;
            if (videoElement) videoElement.muted = false;
        }
        
        saveVolumeToStorage();
    }

    function getVolume() {
        return volume;
    }

    function mute() {
        isMutedState = true;
        if (audioElement) audioElement.muted = true;
        if (videoElement) videoElement.muted = true;
        saveVolumeToStorage();
    }

    function unmute() {
        isMutedState = false;
        if (audioElement) audioElement.muted = false;
        if (videoElement) videoElement.muted = false;
        saveVolumeToStorage();
    }

    function toggleMute() {
        if (isMutedState) {
            unmute();
            if (volume === 0) {
                setVolume(lastVolume > 0 ? lastVolume : 0.5);
            }
        } else {
            mute();
        }
        return isMutedState;
    }

    function isMuted() {
        return isMutedState;
    }

    function switchMode(newMode, preservePosition) {
        if (newMode === currentMode) return Promise.resolve();
        if (newMode !== 'audio' && newMode !== 'video') return Promise.reject(new Error('Invalid mode'));
        
        preservePosition = preservePosition !== false;
        
        const wasPlaying = isPlaying;
        const sourceElement = currentMode === 'audio' ? audioElement : videoElement;
        const currentTime = sourceElement ? sourceElement.currentTime : 0;
        
        playbackState = PlaybackState.LOADING;
        isLoadingMedia = true;
        pendingPlayRequest = false;
        stallRetryCount = 0;
        
        if (sourceElement && !sourceElement.paused) {
            sourceElement.pause();
        }
        
        const previousMode = currentMode;
        currentMode = newMode;

        if (callbacks.onModeChange) {
            callbacks.onModeChange({ previousMode: previousMode, currentMode: newMode, track: currentTrack });
        }

        if (!currentTrack) {
            playbackState = PlaybackState.READY;
            isLoadingMedia = false;
            return Promise.resolve();
        }

        return new Promise(function(resolve, reject) {
            const targetElement = currentMode === 'audio' ? audioElement : videoElement;
            
            if (currentMode === 'audio') {
                loadAudioTrack(currentTrack, preservePosition ? currentTime : 0);
            } else {
                loadVideoTrack(currentTrack, preservePosition ? currentTime : 0);
            }

            const onReady = function() {
                targetElement.removeEventListener('canplaythrough', onReady);
                targetElement.removeEventListener('error', onError);
                clearTimeout(timeoutId);
                
                playbackState = PlaybackState.READY;
                isLoadingMedia = false;
                
                if (preservePosition && currentTime > 0) {
                    try {
                        if (targetElement.duration && isFinite(targetElement.duration)) {
                            targetElement.currentTime = Math.min(currentTime, targetElement.duration - 0.1);
                        }
                    } catch (e) {}
                }
                
                if (wasPlaying) {
                    performPlaySync();
                    resolve();
                } else {
                    resolve();
                }
            };
            
            const onError = function(e) {
                targetElement.removeEventListener('canplaythrough', onReady);
                targetElement.removeEventListener('error', onError);
                clearTimeout(timeoutId);
                playbackState = PlaybackState.ERROR;
                isLoadingMedia = false;
                reject(e);
            };

            const timeoutId = setTimeout(function() {
                targetElement.removeEventListener('canplaythrough', onReady);
                targetElement.removeEventListener('error', onError);
                
                if (playbackState === PlaybackState.LOADING && targetElement.readyState >= 3) {
                    playbackState = PlaybackState.READY;
                    isLoadingMedia = false;
                    
                    if (preservePosition && currentTime > 0) {
                        try {
                            if (targetElement.duration && isFinite(targetElement.duration)) {
                                targetElement.currentTime = Math.min(currentTime, targetElement.duration - 0.1);
                            }
                        } catch (e) {}
                    }
                    
                    if (wasPlaying) {
                        performPlaySync();
                    }
                    resolve();
                } else {
                    playbackState = PlaybackState.ERROR;
                    isLoadingMedia = false;
                    reject(new Error('Mode switch timeout'));
                }
            }, 15000);

            if (targetElement.readyState >= 4) {
                onReady();
            } else {
                targetElement.addEventListener('canplaythrough', onReady, { once: true });
                targetElement.addEventListener('error', onError, { once: true });
            }
        });
    }

    function setQuality(quality) {
        if (!['low', 'mid', 'high'].includes(quality)) return false;
        if (quality === currentQuality) return true;

        const wasPlaying = isPlaying;
        const currentTime = videoElement ? videoElement.currentTime : 0;
        
        currentQuality = quality;
        saveQualityToStorage();

        if (currentMode === 'video' && currentTrack && currentTrack.videoSrc) {
            playbackState = PlaybackState.LOADING;
            isLoadingMedia = true;
            stallRetryCount = 0;
            
            if (!videoElement.paused) {
                videoElement.pause();
            }
            
            loadVideoTrack(currentTrack, currentTime);
            
            const onCanPlayHandler = function() {
                videoElement.removeEventListener('canplaythrough', onCanPlayHandler);
                playbackState = PlaybackState.READY;
                isLoadingMedia = false;
                
                if (wasPlaying) {
                    performPlaySync();
                }
            };
            
            videoElement.addEventListener('canplaythrough', onCanPlayHandler, { once: true });
        }
        
        return true;
    }

    function getQuality() {
        return currentQuality;
    }

    function getCurrentTime() {
        const element = currentMode === 'audio' ? audioElement : videoElement;
        return element ? (element.currentTime || 0) : 0;
    }

    function getDuration() {
        const element = currentMode === 'audio' ? audioElement : videoElement;
        return element ? (element.duration || 0) : 0;
    }

    function getProgress() {
        const element = currentMode === 'audio' ? audioElement : videoElement;
        if (!element || !element.duration) return 0;
        return (element.currentTime / element.duration) * 100;
    }

    function getRemainingTime() {
        const element = currentMode === 'audio' ? audioElement : videoElement;
        if (!element || !element.duration) return 0;
        return element.duration - element.currentTime;
    }

    function getIsPlaying() {
        return isPlaying;
    }

    function getCurrentMode() {
        return currentMode;
    }

    function getCurrentTrack() {
        return currentTrack;
    }

    function getAudioElement() {
        return audioElement;
    }

    function getVideoElement() {
        return videoElement;
    }

    function getPlaybackRate() {
        const element = currentMode === 'audio' ? audioElement : videoElement;
        return element ? (element.playbackRate || 1) : 1;
    }

    function setPlaybackRate(rate) {
        const r = Math.max(0.25, Math.min(4, rate));
        if (audioElement) audioElement.playbackRate = r;
        if (videoElement) videoElement.playbackRate = r;
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
        if (callbacks.hasOwnProperty(key)) {
            callbacks[key] = callback;
        }
    }

    function off(event) {
        const key = 'on' + event.charAt(0).toUpperCase() + event.slice(1);
        if (callbacks.hasOwnProperty(key)) {
            callbacks[key] = null;
        }
    }

    function saveVolumeToStorage() {
        try {
            localStorage.setItem('deusExCT_volume', volume.toString());
            localStorage.setItem('deusExCT_muted', isMutedState.toString());
        } catch (e) {}
    }

    function loadVolumeFromStorage() {
        try {
            const savedVolume = localStorage.getItem('deusExCT_volume');
            const savedMuted = localStorage.getItem('deusExCT_muted');
            
            if (savedVolume !== null) {
                volume = parseFloat(savedVolume);
                if (isNaN(volume)) volume = 1.0;
                volume = Math.max(0, Math.min(1, volume));
                lastVolume = volume > 0 ? volume : 0.5;
            }
            
            if (savedMuted !== null) {
                isMutedState = savedMuted === 'true';
            }
        } catch (e) {}
    }

    function saveQualityToStorage() {
        try {
            localStorage.setItem('deusExCT_quality', currentQuality);
        } catch (e) {}
    }

    function loadQualityFromStorage() {
        try {
            const savedQuality = localStorage.getItem('deusExCT_quality');
            if (savedQuality && ['low', 'mid', 'high'].includes(savedQuality)) {
                currentQuality = savedQuality;
            }
        } catch (e) {}
    }

    function saveStateToStorage() {
        try {
            const state = {
                trackId: currentTrack ? currentTrack.id : null,
                mode: currentMode,
                quality: currentQuality,
                position: getCurrentTime(),
                volume: volume,
                muted: isMutedState
            };
            localStorage.setItem('deusExCT_playerState', JSON.stringify(state));
        } catch (e) {}
    }

    function loadStateFromStorage() {
        try {
            const saved = localStorage.getItem('deusExCT_playerState');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }

    function enterFullscreen() {
        const container = videoWrapper || videoElement;
        if (!container) return Promise.reject(new Error('No video element'));
        
        if (container.requestFullscreen) {
            return container.requestFullscreen();
        }
        if (container.webkitRequestFullscreen) {
            return Promise.resolve(container.webkitRequestFullscreen());
        }
        if (container.mozRequestFullScreen) {
            return Promise.resolve(container.mozRequestFullScreen());
        }
        if (container.msRequestFullscreen) {
            return Promise.resolve(container.msRequestFullscreen());
        }
        if (videoElement && videoElement.webkitEnterFullscreen) {
            return Promise.resolve(videoElement.webkitEnterFullscreen());
        }
        
        return Promise.reject(new Error('Fullscreen not supported'));
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            return document.exitFullscreen();
        }
        if (document.webkitExitFullscreen) {
            return Promise.resolve(document.webkitExitFullscreen());
        }
        if (document.mozCancelFullScreen) {
            return Promise.resolve(document.mozCancelFullScreen());
        }
        if (document.msExitFullscreen) {
            return Promise.resolve(document.msExitFullscreen());
        }
        if (videoElement && videoElement.webkitExitFullscreen) {
            return Promise.resolve(videoElement.webkitExitFullscreen());
        }
        
        return Promise.reject(new Error('Exit fullscreen not supported'));
    }

    function toggleFullscreen() {
        return isFullscreen() ? exitFullscreen() : enterFullscreen();
    }

    function isFullscreen() {
        return !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement ||
            (videoElement && videoElement.webkitDisplayingFullscreen)
        );
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
        
        if (track.imageSrc) {
            const img = new Image();
            img.src = track.imageSrc;
        }
    }

    function startSeek() {
        isSeeking = true;
        playbackState = PlaybackState.SEEKING;
    }

    function endSeek(time) {
        isSeeking = false;
        if (typeof time === 'number') {
            seek(time);
        }
    }

    function isCurrentlySeeking() {
        return isSeeking;
    }

    function getUserHasInteracted() {
        return userHasInteracted;
    }

    function getIsMobile() {
        return isMobile;
    }

    function getIsIOS() {
        return isIOS;
    }

    function getPlaybackState() {
        return playbackState;
    }

    function isMediaReady() {
        return mediaElementsReady;
    }

    function destroy() {
        saveStateToStorage();
        stopTimeUpdateLoop();
        
        pause();
        pauseBackgroundVideo();
        
        if (audioElement) {
            audioElement.src = '';
            audioElement.load();
        }
        if (videoElement) {
            videoElement.src = '';
            videoElement.load();
        }
        if (bgVideoElement) {
            bgVideoElement.src = '';
            bgVideoElement.load();
        }
        if (preloadAudioElement) {
            preloadAudioElement.src = '';
        }
        if (preloadVideoElement) {
            preloadVideoElement.src = '';
        }
        
        currentTrack = null;
        preloadedNextTrack = null;
        isPlaying = false;
        playbackState = PlaybackState.STOPPED;
        isInitialized = false;
        mediaElementsReady = false;
        
        Object.keys(callbacks).forEach(function(key) {
            callbacks[key] = null;
        });
    }

    return {
        init: init,
        loadTrack: loadTrack,
        play: play,
        pause: pause,
        togglePlayPause: togglePlayPause,
        stop: stop,
        seek: seek,
        seekPercent: seekPercent,
        seekRelative: seekRelative,
        setVolume: setVolume,
        getVolume: getVolume,
        mute: mute,
        unmute: unmute,
        toggleMute: toggleMute,
        isMuted: isMuted,
        switchMode: switchMode,
        setQuality: setQuality,
        getQuality: getQuality,
        getCurrentTime: getCurrentTime,
        getDuration: getDuration,
        getProgress: getProgress,
        getRemainingTime: getRemainingTime,
        getIsPlaying: getIsPlaying,
        getCurrentMode: getCurrentMode,
        getCurrentTrack: getCurrentTrack,
        getAudioElement: getAudioElement,
        getVideoElement: getVideoElement,
        formatTime: formatTime,
        on: on,
        off: off,
        saveStateToStorage: saveStateToStorage,
        loadStateFromStorage: loadStateFromStorage,
        enterFullscreen: enterFullscreen,
        exitFullscreen: exitFullscreen,
        toggleFullscreen: toggleFullscreen,
        isFullscreen: isFullscreen,
        preloadTrack: preloadTrack,
        destroy: destroy,
        startSeek: startSeek,
        endSeek: endSeek,
        isCurrentlySeeking: isCurrentlySeeking,
        setPlaybackRate: setPlaybackRate,
        getPlaybackRate: getPlaybackRate,
        getUserHasInteracted: getUserHasInteracted,
        getIsMobile: getIsMobile,
        getIsIOS: getIsIOS,
        getPlaybackState: getPlaybackState,
        isMediaReady: isMediaReady
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerEngine;
}