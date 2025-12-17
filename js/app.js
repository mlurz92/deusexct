var App = (function() {
    var currentView = 'album';
    var isInitialized = false;
    var deferredPrompt = null;
    var rafId = null;
    var lastLyricUpdate = 0;
    var isUpdatingLyrics = false;
    var currentLyricText = '';
    var currentPrevLyricText = '';
    var currentNextLyricText = '';
    var pendingLyricUpdate = null;
    var progressUpdatePending = false;
    var lastProgressValue = 0;
    var touchStartY = 0;
    var isTouchingProgress = false;
    var playbackRetryCount = 0;
    var maxPlaybackRetries = 3;
    var lastPlayRequestTime = 0;
    var isAppReady = false;

    var elements = {
        app: null,
        mainContent: null,
        backBtn: null,
        menuBtn: null,
        headerInstallBtn: null,
        headerDownloadBtn: null,
        installAppHeroBtn: null,
        headerTrackInfo: null,
        headerTitleText: null,
        headerModeSwitch: null,
        audioModeBtn: null,
        videoModeBtn: null,
        albumView: null,
        playerView: null,
        playerAudioLayout: null,
        playerVideoLayout: null,
        playlistContainer: null,
        playlist: null,
        modalPlaylist: null,
        playlistModal: null,
        downloadModal: null,
        closePlaylistModal: null,
        closeDownloadModal: null,
        modalBackdrop: null,
        downloadModalBackdrop: null,
        downloadSingleVideoOption: null,
        downloadAlbumOption: null,
        downloadAllVideosOption: null,
        miniPlayer: null,
        playerBottomBar: null,
        audioPlayer: null,
        videoPlayer: null,
        bgVideoContainer: null,
        bgVideo: null,
        albumArtwork: null,
        playerArtwork: null,
        artworkWrapper: null,
        videoWrapper: null,
        trackTitle: null,
        trackArtist: null,
        miniTitle: null,
        miniLyric: null,
        prevLyric: null,
        currentLyric: null,
        nextLyric: null,
        barProgressContainer: null,
        progressBar: null,
        progressBarFill: null,
        timeTooltip: null,
        playPauseBtn: null,
        playPauseIcon: null,
        prevBtn: null,
        nextBtn: null,
        volumeBar: null,
        volumeMuteBtn: null,
        volumeIcon: null,
        videoOverlay: null,
        videoPlayBtn: null,
        fullscreenBtn: null,
        qualityButtons: null,
        videoExternalControls: null,
        miniArtwork: null,
        miniPrevBtn: null,
        miniPlayPauseBtn: null,
        miniPlayPauseIcon: null,
        miniNextBtn: null,
        miniPlayerProgress: null,
        playAllBtn: null,
        downloadAllVideosBtn: null,
        downloadAlbumBtn: null,
        toast: null
    };

    function init() {
        if (isInitialized) {
            return;
        }

        var playerReady = false;
        var retryCount = 0;
        var maxRetries = 50;
        var initTimeout = null;

        function waitForPlayerReady() {
            if (typeof PlayerEngine !== 'undefined' && PlayerEngine.init) {
                try {
                    PlayerEngine.init();
                    playerReady = true;
                    if (initTimeout) clearTimeout(initTimeout);
                    continueInit();
                } catch (e) {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        setTimeout(waitForPlayerReady, 100);
                    } else {
                        if (initTimeout) clearTimeout(initTimeout);
                        continueInit();
                    }
                }
            } else {
                if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(waitForPlayerReady, 100);
                } else {
                    if (initTimeout) clearTimeout(initTimeout);
                    continueInit();
                }
            }
        }

        initTimeout = setTimeout(function() {
            if (!playerReady) {
                continueInit();
            }
        }, 5000);

        function continueInit() {
            cacheElements();
            setupEventListeners();
            setupPlayerCallbacks();
            setupLyricsCallbacks();
            setupMediaSession();
            renderPlaylist();
            restoreState();
            handleInitialRoute();
            startVisualUpdateLoop();
            isInitialized = true;
            isAppReady = true;
        }

        waitForPlayerReady();
    }

    function cacheElements() {
        elements.app = document.getElementById('app');
        elements.mainContent = document.getElementById('mainContent');
        elements.backBtn = document.getElementById('backBtn');
        elements.menuBtn = document.getElementById('menuBtn');
        elements.headerInstallBtn = document.getElementById('headerInstallBtn');
        elements.headerDownloadBtn = document.getElementById('headerDownloadBtn');
        elements.headerTrackInfo = document.getElementById('headerTrackInfo');
        elements.headerTitleText = document.getElementById('headerTitleText');
        elements.headerModeSwitch = document.getElementById('headerModeSwitch');
        elements.audioModeBtn = document.getElementById('audioModeBtn');
        elements.videoModeBtn = document.getElementById('videoModeBtn');
        elements.albumView = document.getElementById('albumView');
        elements.playerView = document.getElementById('playerView');
        elements.playerAudioLayout = document.getElementById('playerAudioLayout');
        elements.playerVideoLayout = document.getElementById('playerVideoLayout');
        elements.playAllBtn = document.getElementById('playAllBtn');
        elements.downloadAllVideosBtn = document.getElementById('downloadAllVideosBtn');
        elements.installAppHeroBtn = document.getElementById('installAppHeroBtn');
        elements.downloadAlbumBtn = document.getElementById('downloadAlbumBtn');
        elements.albumArtwork = document.getElementById('albumArtwork');
        elements.playlist = document.getElementById('playlist');
        elements.modalPlaylist = document.getElementById('modalPlaylist');
        elements.playlistModal = document.getElementById('playlistModal');
        elements.downloadModal = document.getElementById('downloadModal');
        elements.closePlaylistModal = document.getElementById('closePlaylistModal');
        elements.closeDownloadModal = document.getElementById('closeDownloadModal');
        elements.modalBackdrop = document.getElementById('modalBackdrop');
        elements.downloadModalBackdrop = document.getElementById('downloadModalBackdrop');
        elements.downloadSingleVideoOption = document.getElementById('downloadSingleVideoOption');
        elements.downloadAlbumOption = document.getElementById('downloadAlbumOption');
        elements.downloadAllVideosOption = document.getElementById('downloadAllVideosOption');
        elements.miniPlayer = document.getElementById('miniPlayer');
        elements.playerBottomBar = document.getElementById('playerBottomBar');
        elements.audioPlayer = document.getElementById('audioPlayer');
        elements.videoPlayer = document.getElementById('videoPlayer');
        elements.bgVideoContainer = document.getElementById('bgVideoContainer');
        elements.bgVideo = document.getElementById('bgVideo');
        elements.playerArtwork = document.getElementById('playerArtwork');
        elements.artworkWrapper = document.getElementById('artworkWrapper');
        elements.videoWrapper = document.getElementById('videoWrapper');
        elements.trackTitle = document.getElementById('trackTitle');
        elements.trackArtist = document.getElementById('trackArtist');
        elements.miniTitle = document.getElementById('miniTitle');
        elements.miniLyric = document.getElementById('miniLyric');
        elements.prevLyric = document.getElementById('prevLyric');
        elements.currentLyric = document.getElementById('currentLyric');
        elements.nextLyric = document.getElementById('nextLyric');
        elements.barProgressContainer = document.querySelector('.bar-progress-container');
        elements.progressBar = document.getElementById('progressBar');
        elements.progressBarFill = document.getElementById('progressBarFill');
        elements.timeTooltip = document.getElementById('timeTooltip');
        elements.playPauseBtn = document.getElementById('playPauseBtn');
        elements.playPauseIcon = document.getElementById('playPauseIcon');
        elements.prevBtn = document.getElementById('prevBtn');
        elements.nextBtn = document.getElementById('nextBtn');
        elements.volumeBar = document.getElementById('volumeBar');
        elements.volumeMuteBtn = document.getElementById('volumeMuteBtn');
        elements.volumeIcon = document.getElementById('volumeIcon');
        elements.videoOverlay = document.getElementById('videoOverlay');
        elements.videoPlayBtn = document.getElementById('videoPlayBtn');
        elements.fullscreenBtn = document.getElementById('fullscreenBtn');
        elements.qualityButtons = document.querySelectorAll('.quality-tag');
        elements.miniArtwork = document.getElementById('miniArtwork');
        elements.miniPrevBtn = document.getElementById('miniPrevBtn');
        elements.miniPlayPauseBtn = document.getElementById('miniPlayPauseBtn');
        elements.miniPlayPauseIcon = document.getElementById('miniPlayPauseIcon');
        elements.miniNextBtn = document.getElementById('miniNextBtn');
        elements.miniPlayerProgress = document.getElementById('miniPlayerProgress');
        elements.toast = document.getElementById('toast');
    }

    function showInstallButtons() {
        if (deferredPrompt) {
            if (elements.headerInstallBtn) elements.headerInstallBtn.classList.remove('hidden');
            if (elements.installAppHeroBtn) elements.installAppHeroBtn.classList.remove('hidden');
        }
    }

    function handleInstallClick() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(choiceResult) {
            deferredPrompt = null;
            if (elements.headerInstallBtn) elements.headerInstallBtn.classList.add('hidden');
            if (elements.installAppHeroBtn) elements.installAppHeroBtn.classList.add('hidden');
        });
    }

    function setupEventListeners() {
        elements.backBtn.addEventListener('click', handleBackButton, { passive: true });

        elements.audioModeBtn.addEventListener('click', function() {
            switchToAudioMode();
        }, { passive: true });
        
        elements.videoModeBtn.addEventListener('click', function() {
            switchToVideoMode();
        }, { passive: true });

        if (elements.headerInstallBtn) {
            elements.headerInstallBtn.addEventListener('click', handleInstallClick, { passive: true });
        }
        if (elements.installAppHeroBtn) {
            elements.installAppHeroBtn.addEventListener('click', handleInstallClick, { passive: true });
        }

        elements.headerDownloadBtn.addEventListener('click', function() {
            showDownloadModal();
        }, { passive: true });

        elements.playAllBtn.addEventListener('click', function() {
            if (!isAppReady || !PlayerEngine.isMediaReady()) {
                showToast('App wird noch initialisiert...');
                return;
            }
            PlaylistManager.setCurrentIndex(0);
            playCurrentTrack('audio');
            showView('player');
        }, { passive: true });

        elements.downloadAllVideosBtn.addEventListener('click', function() {
            if (typeof DownloadManager !== 'undefined' && DownloadManager.triggerDownload) {
                DownloadManager.triggerDownload(
                    DownloadManager.getAllVideosZipUrl(),
                    'Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip'
                );
            }
            showToast('Download gestartet: Alle Videos');
        }, { passive: true });

        elements.downloadAlbumBtn.addEventListener('click', function() {
            if (typeof DownloadManager !== 'undefined' && DownloadManager.triggerDownload) {
                DownloadManager.triggerDownload(
                    DownloadManager.getAlbumDownloadUrl(),
                    'Deus_ex_CT_Complete.zip'
                );
            }
            showToast('Download gestartet: Album');
        }, { passive: true });

        elements.playPauseBtn.addEventListener('click', function() {
            handlePlayPauseClick();
        }, { passive: true });
        
        elements.prevBtn.addEventListener('click', handlePreviousTrack, { passive: true });
        elements.nextBtn.addEventListener('click', handleNextTrack, { passive: true });

        elements.progressBar.addEventListener('input', handleProgressInput, { passive: false });
        elements.progressBar.addEventListener('change', handleProgressChange, { passive: true });
        
        elements.progressBar.addEventListener('touchstart', function(e) {
            isTouchingProgress = true;
            PlayerEngine.startSeek();
        }, { passive: true });
        
        elements.progressBar.addEventListener('touchend', function(e) {
            isTouchingProgress = false;
            var percent = parseFloat(elements.progressBar.value);
            PlayerEngine.seekPercent(percent);
            PlayerEngine.endSeek();
        }, { passive: true });

        elements.barProgressContainer.addEventListener('mousemove', handleProgressHover, { passive: true });
        elements.barProgressContainer.addEventListener('mouseleave', function() {
            elements.timeTooltip.style.opacity = '0';
        }, { passive: true });

        elements.volumeBar.addEventListener('input', function() {
            var volumeValue = parseFloat(this.value) / 100;
            PlayerEngine.setVolume(volumeValue);
            updateVolumeIcon(volumeValue, false);
        }, { passive: true });

        elements.volumeMuteBtn.addEventListener('click', function() {
            var isMuted = PlayerEngine.toggleMute();
            updateVolumeIcon(PlayerEngine.getVolume(), isMuted);
            elements.volumeBar.value = isMuted ? 0 : PlayerEngine.getVolume() * 100;
        }, { passive: true });

        elements.videoPlayBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            handlePlayPauseClick();
        }, { passive: true });

        elements.videoOverlay.addEventListener('click', function(e) {
            if (e.target === elements.videoOverlay) {
                handlePlayPauseClick();
            }
        }, { passive: true });

        elements.fullscreenBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            PlayerEngine.toggleFullscreen();
        }, { passive: true });

        for (var i = 0; i < elements.qualityButtons.length; i++) {
            elements.qualityButtons[i].addEventListener('click', function() {
                var quality = this.getAttribute('data-quality');
                setVideoQuality(quality);
            }, { passive: true });
        }

        elements.miniPlayer.addEventListener('click', function(e) {
            if (!e.target.closest('.mini-btn')) {
                showView('player');
            }
        }, { passive: true });

        elements.miniPrevBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            handlePreviousTrack();
        }, { passive: true });
        
        elements.miniPlayPauseBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            handlePlayPauseClick();
        }, { passive: true });
        
        elements.miniNextBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            handleNextTrack();
        }, { passive: true });

        elements.closePlaylistModal.addEventListener('click', hidePlaylistModal, { passive: true });
        elements.modalBackdrop.addEventListener('click', hidePlaylistModal, { passive: true });
        elements.closeDownloadModal.addEventListener('click', hideDownloadModal, { passive: true });
        elements.downloadModalBackdrop.addEventListener('click', hideDownloadModal, { passive: true });

        elements.downloadSingleVideoOption.addEventListener('click', function() {
            hideDownloadModal();
            showToast('Video-Download gestartet');
        }, { passive: true });

        elements.downloadAlbumOption.addEventListener('click', function() {
            hideDownloadModal();
            showToast('Album-Download gestartet');
        }, { passive: true });

        elements.downloadAllVideosOption.addEventListener('click', function() {
            if (typeof DownloadManager !== 'undefined' && DownloadManager.triggerDownload) {
                DownloadManager.triggerDownload(
                    DownloadManager.getAllVideosZipUrl(),
                    'Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip'
                );
            }
            hideDownloadModal();
            showToast('Download gestartet: Alle Videos');
        }, { passive: true });

        window.addEventListener('hashchange', handleRouteChange, { passive: true });
        document.addEventListener('keydown', handleKeyboardShortcuts, { passive: false });
        
        window.addEventListener('beforeunload', function() {
            if (typeof PlayerEngine !== 'undefined' && PlayerEngine.saveStateToStorage) {
                PlayerEngine.saveStateToStorage();
            }
            if (typeof PlaylistManager !== 'undefined' && PlaylistManager.saveToStorage) {
                PlaylistManager.saveToStorage();
            }
        }, { passive: true });

        document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });

        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            showInstallButtons();
        }, { passive: true });

        if (elements.playerView) {
            elements.playerView.addEventListener('touchstart', function(e) {
                touchStartY = e.touches[0].clientY;
            }, { passive: true });
        }
    }

    function handlePlayPauseClick() {
        if (!isAppReady || !PlayerEngine.isMediaReady()) {
            showToast('Player wird initialisiert...');
            return;
        }

        var currentTrack = PlayerEngine.getCurrentTrack();
        if (!currentTrack) {
            showToast('Kein Track geladen');
            return;
        }

        if (PlayerEngine.getIsPlaying()) {
            PlayerEngine.pause();
        } else {
            playbackRetryCount = 0;
            attemptPlayback();
        }
    }

    function attemptPlayback() {
        var mode = PlayerEngine.getCurrentMode();
        
        PlayerEngine.play().then(function() {
            playbackRetryCount = 0;
        }).catch(function(e) {
            if (playbackRetryCount < maxPlaybackRetries) {
                playbackRetryCount++;
                var delayMs = 300 + (playbackRetryCount * 200);
                setTimeout(attemptPlayback, delayMs);
            } else {
                if (mode === 'video') {
                    showToast('Video-Wiedergabe fehlgeschlagen. Wechsel zu Audio...');
                    setTimeout(function() {
                        switchToAudioMode();
                        PlayerEngine.play().catch(function() {
                            showToast('Wiedergabe fehlgeschlagen. Bitte tippen zum erneuten Versuch.');
                        });
                    }, 500);
                } else {
                    showToast('Wiedergabe fehlgeschlagen. Bitte tippen zum erneuten Versuch.');
                }
            }
        });
    }

    function handleProgressInput(e) {
        PlayerEngine.startSeek();
        var percent = parseFloat(elements.progressBar.value);
        scheduleProgressUpdate(percent);
    }

    function handleProgressChange(e) {
        var percent = parseFloat(elements.progressBar.value);
        PlayerEngine.seekPercent(percent);
        PlayerEngine.endSeek();
    }

    function handleProgressHover(e) {
        var rect = elements.barProgressContainer.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var width = rect.width;
        var percent = Math.max(0, Math.min(100, (x / width) * 100));
        var duration = PlayerEngine.getDuration();
        
        if (duration > 0 && !isNaN(duration)) {
            var time = (percent / 100) * duration;
            elements.timeTooltip.textContent = PlayerEngine.formatTime(time);
            elements.timeTooltip.style.left = percent + '%';
            elements.timeTooltip.style.opacity = '1';
        }
    }

    function scheduleProgressUpdate(percent) {
        if (!progressUpdatePending) {
            progressUpdatePending = true;
            requestAnimationFrame(function() {
                updateProgressBarFill(percent);
                progressUpdatePending = false;
            });
        }
        lastProgressValue = percent;
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            if (typeof PlayerEngine !== 'undefined' && PlayerEngine.saveStateToStorage) {
                PlayerEngine.saveStateToStorage();
            }
        }
    }

    function startVisualUpdateLoop() {
        var lastFrameTime = 0;
        
        function updateLoop(timestamp) {
            if (timestamp - lastFrameTime >= 16) {
                lastFrameTime = timestamp;
                
                if (pendingLyricUpdate && !isUpdatingLyrics) {
                    applyLyricUpdate(pendingLyricUpdate);
                    pendingLyricUpdate = null;
                }
            }
            
            rafId = requestAnimationFrame(updateLoop);
        }
        
        rafId = requestAnimationFrame(updateLoop);
    }

    function stopVisualUpdateLoop() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function setupPlayerCallbacks() {
        PlayerEngine.on('play', function(data) {
            updatePlayPauseButtons(true);
            if (elements.videoOverlay) {
                elements.videoOverlay.style.opacity = '0';
            }
            if (elements.playerView) {
                elements.playerView.classList.remove('paused');
            }
            if (typeof MediaSessionManager !== 'undefined' && MediaSessionManager.setPlaybackState) {
                MediaSessionManager.setPlaybackState('playing');
            }
            playbackRetryCount = 0;
        });

        PlayerEngine.on('pause', function(data) {
            updatePlayPauseButtons(false);
            if (elements.videoOverlay) {
                elements.videoOverlay.style.opacity = '1';
            }
            if (elements.playerView) {
                elements.playerView.classList.add('paused');
            }
            if (typeof MediaSessionManager !== 'undefined' && MediaSessionManager.setPlaybackState) {
                MediaSessionManager.setPlaybackState('paused');
            }
        });

        PlayerEngine.on('timeUpdate', function(data) {
            if (!isTouchingProgress && !PlayerEngine.isCurrentlySeeking()) {
                updateProgress(data.currentTime, data.duration, data.progress);
            }
            updateLyricsDisplay(data.currentTime);
        });

        PlayerEngine.on('ended', function(data) {
            var nextTrack = PlaylistManager.moveToNext();
            if (nextTrack) {
                playTrack(nextTrack, PlayerEngine.getCurrentMode());
            } else {
                updatePlayPauseButtons(false);
                if (typeof MediaSessionManager !== 'undefined' && MediaSessionManager.setPlaybackState) {
                    MediaSessionManager.setPlaybackState('paused');
                }
            }
        });

        PlayerEngine.on('trackChange', function(data) {
            updateTrackDisplay(data.track);
            updateMiniPlayer(data.track);
            loadLyricsForTrack(data.track);
            updateHash();
            if (typeof MediaSessionManager !== 'undefined' && MediaSessionManager.updateMetadata) {
                MediaSessionManager.updateMetadata(data.track);
            }
            resetLyricState();
        });

        PlayerEngine.on('modeChange', function(data) {
            updateHeaderModeSwitch(data.currentMode);
            updatePlayerLayout(data.currentMode);
        });

        PlayerEngine.on('volumeChange', function(data) {
            var volumePercent = data.volume * 100;
            elements.volumeBar.value = volumePercent;
            updateVolumeIcon(data.volume, data.muted);
        });

        PlayerEngine.on('error', function(data) {
            showToast('Fehler beim Abspielen. Bitte erneut versuchen.');
            playbackRetryCount = 0;
        });

        PlayerEngine.on('canPlay', function(data) {
        });

        PlayerEngine.on('waiting', function(data) {
        });
    }

    function setupLyricsCallbacks() {
        if (typeof LyricsManager === 'undefined') return;
        
        LyricsManager.setOnLyricChange(function(data) {
            var prevText = data.prevLine ? data.prevLine.text : '';
            var currText = data.currentLine ? data.currentLine.text : '';
            var nextText = data.nextLine ? data.nextLine.text : '';
            
            if (prevText !== currentPrevLyricText || 
                currText !== currentLyricText || 
                nextText !== currentNextLyricText) {
                
                pendingLyricUpdate = {
                    prev: prevText,
                    current: currText,
                    next: nextText
                };
            }
        });
    }

    function setupMediaSession() {
        if (typeof MediaSessionManager === 'undefined') return;
        
        MediaSessionManager.setActionHandler('play', function() {
            handlePlayPauseClick();
        });
        
        MediaSessionManager.setActionHandler('pause', function() {
            PlayerEngine.pause();
        });
        
        MediaSessionManager.setActionHandler('previoustrack', handlePreviousTrack);
        MediaSessionManager.setActionHandler('nexttrack', handleNextTrack);
        
        MediaSessionManager.setActionHandler('seekbackward', function(details) {
            var skip = details && details.seekOffset ? details.seekOffset : 10;
            PlayerEngine.seekRelative(-skip);
        });
        
        MediaSessionManager.setActionHandler('seekforward', function(details) {
            var skip = details && details.seekOffset ? details.seekOffset : 10;
            PlayerEngine.seekRelative(skip);
        });
        
        MediaSessionManager.setActionHandler('seekto', function(details) {
            if (details && details.seekTime !== undefined) {
                PlayerEngine.seek(details.seekTime);
            }
        });
        
        MediaSessionManager.setActionHandler('stop', function() {
            PlayerEngine.stop();
        });
    }

    function resetLyricState() {
        currentLyricText = '';
        currentPrevLyricText = '';
        currentNextLyricText = '';
        pendingLyricUpdate = null;
        isUpdatingLyrics = false;
        
        if (elements.prevLyric) elements.prevLyric.textContent = '';
        if (elements.currentLyric) elements.currentLyric.textContent = '';
        if (elements.nextLyric) elements.nextLyric.textContent = '';
        if (elements.miniLyric) elements.miniLyric.textContent = '';
    }

    function applyLyricUpdate(update) {
        if (isUpdatingLyrics) return;
        
        isUpdatingLyrics = true;
        
        var hasChange = false;
        
        if (update.prev !== currentPrevLyricText) {
            animateLyricElement(elements.prevLyric, update.prev);
            currentPrevLyricText = update.prev;
            hasChange = true;
        }
        
        if (update.current !== currentLyricText) {
            animateLyricElement(elements.currentLyric, update.current);
            animateLyricElement(elements.miniLyric, update.current);
            currentLyricText = update.current;
            hasChange = true;
        }
        
        if (update.next !== currentNextLyricText) {
            animateLyricElement(elements.nextLyric, update.next);
            currentNextLyricText = update.next;
            hasChange = true;
        }
        
        if (hasChange) {
            setTimeout(function() {
                isUpdatingLyrics = false;
            }, 250);
        } else {
            isUpdatingLyrics = false;
        }
    }

    function animateLyricElement(element, newText) {
        if (!element) return;
        
        if (element.textContent === newText) return;
        
        element.classList.remove('lyric-fade-in');
        element.classList.add('lyric-fade-out');
        
        setTimeout(function() {
            element.textContent = newText;
            element.classList.remove('lyric-fade-out');
            element.classList.add('lyric-fade-in');
            
            setTimeout(function() {
                element.classList.remove('lyric-fade-in');
            }, 200);
        }, 150);
    }

    function restoreState() {
        if (typeof PlaylistManager !== 'undefined' && PlaylistManager.loadFromStorage) {
            PlaylistManager.loadFromStorage();
        }
        
        var volume = PlayerEngine.getVolume();
        var muted = PlayerEngine.isMuted();
        elements.volumeBar.value = muted ? 0 : volume * 100;
        updateVolumeIcon(volume, muted);
        
        var currentTrack = PlaylistManager.getCurrentTrack();
        if (currentTrack) {
            updateTrackDisplay(currentTrack);
            updateMiniPlayer(currentTrack);
        }
    }

    function renderPlaylist() {
        if (typeof PlaylistManager === 'undefined' || !PlaylistManager.getTracks) {
            return;
        }
        
        var tracks = PlaylistManager.getTracks();
        if (!tracks || tracks.length === 0) {
            return;
        }
        
        var html = '';
        for (var i = 0; i < tracks.length; i++) {
            html += createPlaylistItemHTML(tracks[i], i);
        }
        elements.playlist.innerHTML = html;
        setupPlaylistClickListeners();
    }

    function createPlaylistItemHTML(track, index) {
        return '<li class="playlist-item" data-track-id="' + track.id + '">' +
               '<span class="track-number">' + track.number + '</span>' +
               '<div class="playing-indicator">' +
               '<span class="playing-bar"></span><span class="playing-bar"></span><span class="playing-bar"></span>' +
               '</div>' +
               '<img src="' + track.imageSrc + '" class="item-artwork" loading="lazy" decoding="async">' +
               '<div class="item-info">' +
               '<p class="item-title">' + track.title + '</p>' +
               '<p class="item-duration">' + track.duration + '</p>' +
               '</div>' +
               '<div class="item-actions">' +
               '<button class="item-action-btn play-audio-btn"><i class="fas fa-music"></i></button>' +
               '</div>' +
               '</li>';
    }

    function setupPlaylistClickListeners() {
        var items = elements.playlist.querySelectorAll('.playlist-item');
        for (var i = 0; i < items.length; i++) {
            items[i].addEventListener('click', handlePlaylistItemClick, { passive: true });
        }
    }

    function handlePlaylistItemClick(e) {
        var item = e.currentTarget;
        var trackId = parseInt(item.getAttribute('data-track-id'), 10);
        var track = PlaylistManager.playTrackById(trackId);
        if (track) {
            playTrack(track, 'audio');
            showView('player');
        }
    }

    function renderModalPlaylist() {
        if (typeof PlaylistManager === 'undefined') return;
        
        var tracks = PlaylistManager.getPlaylistForDisplay ? PlaylistManager.getPlaylistForDisplay() : PlaylistManager.getTracks();
        var currentTrack = PlayerEngine.getCurrentTrack();
        var html = '';
        
        for (var i = 0; i < tracks.length; i++) {
            var isPlaying = currentTrack && currentTrack.id === tracks[i].id;
            var playingClass = isPlaying ? ' playing' : '';
            html += '<li class="playlist-item' + playingClass + '" data-track-id="' + tracks[i].id + '">' +
                    '<span class="track-number">' + tracks[i].number + '</span>' +
                    '<div class="playing-indicator">' +
                    '<span class="playing-bar"></span><span class="playing-bar"></span><span class="playing-bar"></span>' +
                    '</div>' +
                    '<img src="' + tracks[i].imageSrc + '" class="item-artwork" loading="lazy" decoding="async">' +
                    '<div class="item-info">' +
                    '<p class="item-title">' + tracks[i].title + '</p>' +
                    '<p class="item-duration">' + tracks[i].duration + '</p>' +
                    '</div>' +
                    '</li>';
        }
        
        elements.modalPlaylist.innerHTML = html;
        
        var modalItems = elements.modalPlaylist.querySelectorAll('.playlist-item');
        for (var i = 0; i < modalItems.length; i++) {
            modalItems[i].addEventListener('click', function() {
                var trackId = parseInt(this.getAttribute('data-track-id'), 10);
                var track = PlaylistManager.playTrackById(trackId);
                if (track) {
                    playTrack(track, PlayerEngine.getCurrentMode());
                    hidePlaylistModal();
                }
            }, { passive: true });
        }
    }

    function playTrack(track, mode) {
        if (!track || !PlayerEngine.isMediaReady() || !isAppReady) return;
        
        mode = mode || 'audio';
        
        var currentTrack = PlayerEngine.getCurrentTrack();
        if (currentTrack && currentTrack.id === track.id && (PlayerEngine.getIsPlaying() || PlayerEngine.getPlaybackState() === 'loading')) {
            return;
        }
        
        PlayerEngine.loadTrack(track, mode);
        
        playbackRetryCount = 0;
        attemptPlayback();
        
        updatePlaylistHighlight(track.id);
    }

    function playCurrentTrack(mode) {
        var track = PlaylistManager.getCurrentTrack();
        if (track) {
            playTrack(track, mode);
        }
    }

    function handlePreviousTrack() {
        if (PlayerEngine.getCurrentTime() > 3) {
            PlayerEngine.seek(0);
            return;
        }
        var prevTrack = PlaylistManager.moveToPrevious();
        if (prevTrack) {
            playTrack(prevTrack, PlayerEngine.getCurrentMode());
        }
    }

    function handleNextTrack() {
        var nextTrack = PlaylistManager.moveToNext();
        if (nextTrack) {
            playTrack(nextTrack, PlayerEngine.getCurrentMode());
        }
    }

    function switchToAudioMode() {
        if (PlayerEngine.getCurrentMode() === 'audio') return;
        
        PlayerEngine.switchMode('audio', true).then(function() {
            updatePlayerLayout('audio');
            if (PlayerEngine.getIsPlaying()) {
                attemptPlayback();
            }
        }).catch(function(e) {
            showToast('Wechsel zu Audio-Modus fehlgeschlagen.');
        });
    }

    function switchToVideoMode() {
        if (PlayerEngine.getCurrentMode() === 'video') return;
        
        PlayerEngine.switchMode('video', true).then(function() {
            updatePlayerLayout('video');
            if (PlayerEngine.getIsPlaying()) {
                attemptPlayback();
            }
        }).catch(function(e) {
            showToast('Wechsel zu Video-Modus fehlgeschlagen.');
        });
    }

    function updatePlayerLayout(mode) {
        if (mode === 'video') {
            elements.playerAudioLayout.classList.add('hidden');
            elements.playerVideoLayout.classList.remove('hidden');
        } else {
            elements.playerAudioLayout.classList.remove('hidden');
            elements.playerVideoLayout.classList.add('hidden');
        }
    }

    function setVideoQuality(quality) {
        for (var i = 0; i < elements.qualityButtons.length; i++) {
            var btn = elements.qualityButtons[i];
            if (btn.getAttribute('data-quality') === quality) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
        PlayerEngine.setQuality(quality);
    }

    function updateProgress(currentTime, duration, progress) {
        if (!progressUpdatePending) {
            progressUpdatePending = true;
            requestAnimationFrame(function() {
                elements.progressBar.value = progress;
                updateProgressBarFill(progress);
                
                if (elements.miniPlayerProgress) {
                    elements.miniPlayerProgress.style.setProperty('--progress', progress + '%');
                }
                
                if (typeof MediaSessionManager !== 'undefined' && MediaSessionManager.updatePositionState) {
                    MediaSessionManager.updatePositionState(duration, currentTime, PlayerEngine.getPlaybackRate());
                }
                progressUpdatePending = false;
            });
        }
    }

    function updateProgressBarFill(progress) {
        if (elements.progressBarFill) {
            elements.progressBarFill.style.width = progress + '%';
        }
    }

    function updatePlayPauseButtons(isPlaying) {
        var iconClass = isPlaying ? 'fa-pause' : 'fa-play';
        
        if (elements.playPauseIcon) {
            elements.playPauseIcon.className = 'fas ' + iconClass;
        }
        if (elements.miniPlayPauseIcon) {
            elements.miniPlayPauseIcon.className = 'fas ' + iconClass;
        }
        
        var videoIcon = elements.videoPlayBtn ? elements.videoPlayBtn.querySelector('i') : null;
        if (videoIcon) {
            videoIcon.className = 'fas ' + iconClass;
        }
    }

    function updateVolumeIcon(volume, muted) {
        var iconClass = 'fa-volume-high';
        if (muted || volume === 0) {
            iconClass = 'fa-volume-xmark';
        } else if (volume < 0.3) {
            iconClass = 'fa-volume-off';
        } else if (volume < 0.7) {
            iconClass = 'fa-volume-low';
        }
        
        if (elements.volumeIcon) {
            elements.volumeIcon.className = 'fas ' + iconClass;
        }
    }

    function updateTrackDisplay(track) {
        if (!track) return;
        
        if (elements.playerArtwork) {
            elements.playerArtwork.src = track.imageSrc;
        }
        if (elements.trackTitle) {
            elements.trackTitle.textContent = track.title;
        }
        if (elements.trackArtist) {
            elements.trackArtist.textContent = 'Deus ex CT';
        }
        
        if (elements.headerTitleText) {
            elements.headerTitleText.textContent = track.title;
        }
        if (elements.headerTrackInfo) {
            elements.headerTrackInfo.classList.remove('hidden');
        }
        
        document.title = track.title + ' - Deus ex CT';
    }

    function updateMiniPlayer(track) {
        if (!track) return;
        
        if (elements.miniArtwork) {
            elements.miniArtwork.src = track.imageSrc;
        }
        if (elements.miniTitle) {
            elements.miniTitle.textContent = track.title;
        }
    }

    function updatePlaylistHighlight(trackId) {
        var items = elements.playlist.querySelectorAll('.playlist-item');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (parseInt(item.getAttribute('data-track-id'), 10) === trackId) {
                item.classList.add('playing');
            } else {
                item.classList.remove('playing');
            }
        }
    }

    function updateLyricsDisplay(currentTime) {
        if (typeof LyricsManager !== 'undefined' && LyricsManager.updateCurrentLine) {
            LyricsManager.updateCurrentLine(currentTime);
        }
    }

    function loadLyricsForTrack(track) {
        if (!track || !track.lyricsSrc || typeof LyricsManager === 'undefined') return;
        if (LyricsManager.loadLyrics) {
            LyricsManager.loadLyrics(track.lyricsSrc, track.id).catch(function(e) {});
        }
    }

    function updateHeaderModeSwitch(mode) {
        if (mode === 'video') {
            elements.audioModeBtn.classList.remove('active');
            elements.videoModeBtn.classList.add('active');
        } else {
            elements.audioModeBtn.classList.add('active');
            elements.videoModeBtn.classList.remove('active');
        }
    }

    function showView(view) {
        currentView = view;
        
        elements.albumView.classList.add('hidden');
        elements.playerView.classList.add('hidden');
        
        elements.backBtn.classList.add('hidden');
        elements.miniPlayer.classList.add('hidden');
        elements.playerBottomBar.classList.add('hidden');

        if (view === 'album') {
            elements.albumView.classList.remove('hidden');
            if (PlayerEngine.getCurrentTrack()) {
                elements.miniPlayer.classList.remove('hidden');
            }
        } else if (view === 'player' || view === 'video') {
            elements.playerView.classList.remove('hidden');
            elements.backBtn.classList.remove('hidden');
            elements.playerBottomBar.classList.remove('hidden');
            
            var mode = PlayerEngine.getCurrentMode();
            updatePlayerLayout(mode);
            updateHeaderModeSwitch(mode);
        }
        
        updateHash();
    }

    function handleBackButton() {
        showView('album');
    }

    function showPlaylistModal() {
        renderModalPlaylist();
        elements.playlistModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function hidePlaylistModal() {
        elements.playlistModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    function showDownloadModal() {
        var track = PlayerEngine.getCurrentTrack();
        
        if (track) {
            elements.downloadSingleVideoOption.classList.remove('hidden');
            if (typeof DownloadManager !== 'undefined' && DownloadManager.getVideoDownloadUrl && DownloadManager.getVideoFileName) {
                var videoUrl = DownloadManager.getVideoDownloadUrl(track, 'high');
                var fileName = DownloadManager.getVideoFileName(track, 'high');
                elements.downloadSingleVideoOption.href = videoUrl;
                elements.downloadSingleVideoOption.setAttribute('download', fileName);
            }
        } else {
            elements.downloadSingleVideoOption.classList.add('hidden');
        }
        
        if (typeof DownloadManager !== 'undefined') {
            if (DownloadManager.getAlbumDownloadUrl) {
                elements.downloadAlbumOption.href = DownloadManager.getAlbumDownloadUrl();
            }
            if (DownloadManager.getAllVideosZipUrl) {
                elements.downloadAllVideosOption.href = DownloadManager.getAllVideosZipUrl();
            }
        }
        
        elements.downloadModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function hideDownloadModal() {
        elements.downloadModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    function showToast(message, duration) {
        duration = duration || 3000;
        elements.toast.textContent = message;
        elements.toast.classList.add('visible');
        
        setTimeout(function() {
            elements.toast.classList.remove('visible');
        }, duration);
    }

    function updateHash() {
        var hash = '';
        var track = PlayerEngine.getCurrentTrack();
        
        if (currentView === 'album') {
            hash = '';
        } else if (currentView === 'player' || currentView === 'video') {
            if (track) {
                var trackSlug = track.slug || track.title.toLowerCase().replace(/\s+/g, '-');
                hash = '#/track/' + trackSlug;
            } else {
                hash = '#/player';
            }
        }
        
        if (window.location.hash !== hash) {
            history.replaceState(null, '', window.location.pathname + hash);
        }
    }

    function handleRouteChange() {
        parseRoute(window.location.hash);
    }

    function handleInitialRoute() {
        parseRoute(window.location.hash);
    }

    function parseRoute(hash) {
        if (!hash || hash === '#/') {
            showView('album');
            return;
        }
        
        var parts = hash.replace('#/', '').split('/');
        var route = parts[0];
        var slug = parts[1];
        
        if (route === 'track' || route === 'video') {
            if (slug) {
                var track = null;
                if (typeof PlaylistManager !== 'undefined' && PlaylistManager.getTrackBySlug) {
                    track = PlaylistManager.getTrackBySlug(slug);
                }
                
                if (!track && typeof PlaylistManager !== 'undefined' && PlaylistManager.getTracks) {
                    var tracks = PlaylistManager.getTracks();
                    for (var i = 0; i < tracks.length; i++) {
                        var trackSlug = tracks[i].slug || tracks[i].title.toLowerCase().replace(/\s+/g, '-');
                        if (trackSlug === slug) {
                            track = tracks[i];
                            break;
                        }
                    }
                }
                
                if (track) {
                    if (typeof PlaylistManager !== 'undefined' && PlaylistManager.playTrackById) {
                        PlaylistManager.playTrackById(track.id);
                    }
                    playTrack(track, 'audio');
                }
            }
            showView('player');
        } else {
            showView('album');
        }
    }

    function handleKeyboardShortcuts(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        if (e.key === ' ') {
            e.preventDefault();
            handlePlayPauseClick();
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
            } else if (!elements.playlistModal.classList.contains('hidden')) {
                hidePlaylistModal();
            } else if (!elements.downloadModal.classList.contains('hidden')) {
                hideDownloadModal();
            }
        } else if (e.key === 'm' || e.key === 'M') {
            PlayerEngine.toggleMute();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            var vol = Math.min(1, PlayerEngine.getVolume() + 0.1);
            PlayerEngine.setVolume(vol);
            elements.volumeBar.value = vol * 100;
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            var vol = Math.max(0, PlayerEngine.getVolume() - 0.1);
            PlayerEngine.setVolume(vol);
            elements.volumeBar.value = vol * 100;
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        init: init,
        showView: showView,
        playTrack: playTrack,
        showToast: showToast
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}