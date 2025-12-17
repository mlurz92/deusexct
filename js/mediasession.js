const MediaSessionManager = (function() {
    let isSupported = false;
    let currentTrack = null;
    let positionUpdateInterval = null;

    function init() {
        isSupported = 'mediaSession' in navigator;
        return isSupported;
    }

    function setActionHandler(action, handler) {
        if (isSupported && navigator.mediaSession.setActionHandler) {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch (e) {
                // Ignore errors for unsupported actions
            }
        }
    }

    function updateMetadata(track) {
        if (!isSupported || !track) return;

        currentTrack = track;
        var artwork = generateArtworkArray(track.imageSrc);

        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist || 'Deus ex CT',
                album: 'Deus ex CT',
                artwork: artwork
            });
        } catch (e) {
            console.error('MediaSession metadata error:', e);
        }
    }

    function generateArtworkArray(imageSrc) {
        if (!imageSrc) return [];
        return [
            { src: imageSrc, sizes: '96x96', type: 'image/png' },
            { src: imageSrc, sizes: '128x128', type: 'image/png' },
            { src: imageSrc, sizes: '192x192', type: 'image/png' },
            { src: imageSrc, sizes: '256x256', type: 'image/png' },
            { src: imageSrc, sizes: '384x384', type: 'image/png' },
            { src: imageSrc, sizes: '512x512', type: 'image/png' }
        ];
    }

    function setPlaybackState(state) {
        if (!isSupported) return;
        if (state !== 'none' && state !== 'paused' && state !== 'playing') state = 'none';
        try {
            navigator.mediaSession.playbackState = state;
        } catch (e) {}
    }

    function updatePositionState(duration, currentTime, playbackRate) {
        if (!isSupported || !navigator.mediaSession.setPositionState) return;

        if (!duration || isNaN(duration) || duration < 0) return;
        if (currentTime === undefined || isNaN(currentTime)) currentTime = 0;
        if (playbackRate === undefined) playbackRate = 1.0;

        try {
            navigator.mediaSession.setPositionState({
                duration: duration,
                position: Math.min(currentTime, duration),
                playbackRate: playbackRate
            });
        } catch (e) {}
    }

    return {
        init: init,
        setActionHandler: setActionHandler,
        updateMetadata: updateMetadata,
        setPlaybackState: setPlaybackState,
        updatePositionState: updatePositionState
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MediaSessionManager;
}