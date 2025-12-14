window.Router = (function() {
    let isInitialized = false;
    let baseUrl = '';
    let currentState = {
        trackId: null,
        mode: 'audio'
    };
    
    const validModes = ['audio', 'video'];
    const minTrackId = 1;
    const maxTrackId = 12;
    
    const trackTitles = {
        1: "Oberarzt Dr. med. Placzek",
        2: "Oberarzt der Herzen",
        3: "Vier-Eins-Neun-Zwei",
        4: "Pilot im Pixelmeer",
        5: "Drei Gebote",
        6: "Kunst der Diagnostik",
        7: "Mit harter Hand und Charme",
        8: "Durch Feuer und Eis",
        9: "Held und Idol",
        10: "Messerscharf und Legendär",
        11: "Oberärztlicher Glanz",
        12: "Götterdämmerung"
    };
    
    let navigationHistory = [];
    let historyPosition = -1;
    
    function initialize() {
        if (isInitialized) return;
        
        baseUrl = window.location.origin + window.location.pathname;
        attachEventListeners();
        
        const initialState = parseCurrentURL();
        currentState = initialState;
        
        const state = {
            trackId: initialState.trackId,
            mode: initialState.mode,
            timestamp: Date.now()
        };
        
        window.history.replaceState(state, '', window.location.href);
        navigationHistory.push(state);
        historyPosition = 0;
        
        updatePageTitle(initialState.trackId, initialState.mode);
        
        isInitialized = true;
    }
    
    function attachEventListeners() {
        window.addEventListener('popstate', handlePopState);
        
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (link && isInternalLink(link.href)) {
                e.preventDefault();
                navigateToURL(link.href);
            }
        });
    }
    
    function isInternalLink(url) {
        try {
            const linkUrl = new URL(url);
            const currentUrl = new URL(window.location.href);
            return linkUrl.origin === currentUrl.origin && 
                   linkUrl.pathname === currentUrl.pathname;
        } catch (e) {
            return false;
        }
    }
    
    function parseCurrentURL() {
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash.slice(1);
        
        let trackId = params.get('track');
        let mode = params.get('mode');
        
        if (!trackId && hash) {
            const hashParams = new URLSearchParams(hash);
            trackId = hashParams.get('track');
            mode = hashParams.get('mode');
        }
        
        return {
            trackId: validateTrackId(trackId),
            mode: validateMode(mode)
        };
    }
    
    function parseURL(url) {
        try {
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.search);
            
            return {
                trackId: validateTrackId(params.get('track')),
                mode: validateMode(params.get('mode'))
            };
        } catch (e) {
            return {
                trackId: null,
                mode: 'audio'
            };
        }
    }
    
    function validateTrackId(trackId) {
        const id = parseInt(trackId);
        if (isNaN(id) || id < minTrackId || id > maxTrackId) {
            return null;
        }
        return id;
    }
    
    function validateMode(mode) {
        if (!mode || !validModes.includes(mode)) {
            return 'audio';
        }
        return mode;
    }
    
    function updateURL(trackId, mode, options = {}) {
        if (!isInitialized) return;
        
        const validatedTrackId = validateTrackId(trackId);
        const validatedMode = validateMode(mode);
        
        if (validatedTrackId === currentState.trackId && 
            validatedMode === currentState.mode && 
            !options.force) {
            return;
        }
        
        currentState = {
            trackId: validatedTrackId,
            mode: validatedMode
        };
        
        const url = buildURL(validatedTrackId, validatedMode);
        const state = {
            trackId: validatedTrackId,
            mode: validatedMode,
            timestamp: Date.now()
        };
        
        if (options.replace) {
            window.history.replaceState(state, '', url);
            navigationHistory[historyPosition] = state;
        } else {
            window.history.pushState(state, '', url);
            historyPosition++;
            navigationHistory = navigationHistory.slice(0, historyPosition);
            navigationHistory.push(state);
        }
        
        updatePageTitle(validatedTrackId, validatedMode);
        
        if (!options.silent) {
            dispatchRouteChange(currentState);
        }
    }
    
    function buildURL(trackId, mode) {
        const url = new URL(baseUrl);
        
        if (trackId) {
            url.searchParams.set('track', trackId.toString());
            
            if (mode && mode !== 'audio') {
                url.searchParams.set('mode', mode);
            }
        }
        
        return url.pathname + url.search;
    }
    
    function buildFullURL(trackId, mode) {
        const relativeURL = buildURL(trackId, mode);
        return new URL(relativeURL, window.location.origin).href;
    }
    
    function handlePopState(event) {
        const state = event.state;
        
        if (!state) {
            const parsedState = parseCurrentURL();
            currentState = parsedState;
            dispatchRouteChange(currentState);
            return;
        }
        
        currentState = {
            trackId: state.trackId,
            mode: state.mode
        };
        
        updatePageTitle(state.trackId, state.mode);
        dispatchRouteChange(currentState);
        
        const currentIndex = navigationHistory.findIndex(
            item => item.timestamp === state.timestamp
        );
        
        if (currentIndex !== -1) {
            historyPosition = currentIndex;
        }
    }
    
    function dispatchRouteChange(state) {
        window.dispatchEvent(new CustomEvent('router:change', {
            detail: {
                trackId: state.trackId,
                mode: state.mode,
                previousState: getPreviousState(),
                canGoBack: canNavigateBack(),
                canGoForward: canNavigateForward()
            }
        }));
    }
    
    function updatePageTitle(trackId, mode) {
        const baseTitle = 'Deus ex CT';
        
        if (!trackId) {
            document.title = `${baseTitle} - Das Album`;
            return;
        }
        
        const trackTitle = getTrackTitle(trackId);
        const modeText = mode === 'video' ? 'Video' : 'Audio';
        
        if (trackTitle) {
            document.title = `${trackTitle} (${modeText}) - ${baseTitle}`;
        } else {
            document.title = baseTitle;
        }
    }
    
    function getTrackTitle(trackId) {
        return trackTitles[trackId] || null;
    }
    
    function getCurrentState() {
        return { ...currentState };
    }
    
    function getPreviousState() {
        if (historyPosition > 0 && navigationHistory[historyPosition - 1]) {
            return {
                trackId: navigationHistory[historyPosition - 1].trackId,
                mode: navigationHistory[historyPosition - 1].mode
            };
        }
        return null;
    }
    
    function getNextState() {
        if (historyPosition < navigationHistory.length - 1 && 
            navigationHistory[historyPosition + 1]) {
            return {
                trackId: navigationHistory[historyPosition + 1].trackId,
                mode: navigationHistory[historyPosition + 1].mode
            };
        }
        return null;
    }
    
    function navigateToTrack(trackId, mode, options = {}) {
        const validatedTrackId = validateTrackId(trackId);
        const validatedMode = validateMode(mode);
        
        updateURL(validatedTrackId, validatedMode, options);
    }
    
    function navigateToHome() {
        updateURL(null, 'audio');
    }
    
    function navigateToURL(url) {
        const state = parseURL(url);
        navigateToTrack(state.trackId, state.mode);
    }
    
    function replaceCurrentState(trackId, mode) {
        updateURL(trackId, mode, { replace: true });
    }
    
    function getShareableURL(trackId, mode) {
        const validatedTrackId = validateTrackId(trackId);
        const validatedMode = validateMode(mode);
        
        return buildFullURL(validatedTrackId, validatedMode);
    }
    
    function getCurrentURL() {
        return buildFullURL(currentState.trackId, currentState.mode);
    }
    
    function isTrackURL() {
        return currentState.trackId !== null;
    }
    
    function isVideoMode() {
        return currentState.mode === 'video';
    }
    
    function isAudioMode() {
        return currentState.mode === 'audio';
    }
    
    function getTrackIdFromURL() {
        return currentState.trackId;
    }
    
    function getModeFromURL() {
        return currentState.mode;
    }
    
    function createTrackLink(trackId, mode, options = {}) {
        const validatedTrackId = validateTrackId(trackId);
        const validatedMode = validateMode(mode);
        
        if (!validatedTrackId) return baseUrl;
        
        const url = buildURL(validatedTrackId, validatedMode);
        
        if (options.absolute) {
            return buildFullURL(validatedTrackId, validatedMode);
        }
        
        return url;
    }
    
    function canNavigateBack() {
        return historyPosition > 0 || window.history.length > 1;
    }
    
    function canNavigateForward() {
        return historyPosition < navigationHistory.length - 1;
    }
    
    function navigateBack() {
        if (canNavigateBack()) {
            window.history.back();
        } else {
            navigateToHome();
        }
    }
    
    function navigateForward() {
        if (canNavigateForward()) {
            window.history.forward();
        }
    }
    
    function go(delta) {
        window.history.go(delta);
    }
    
    function getAllTrackLinks() {
        const links = [];
        
        for (let i = minTrackId; i <= maxTrackId; i++) {
            links.push({
                trackId: i,
                title: trackTitles[i],
                audioURL: createTrackLink(i, 'audio'),
                videoURL: createTrackLink(i, 'video')
            });
        }
        
        return links;
    }
    
    function getNavigationHistory() {
        return navigationHistory.map((item, index) => ({
            trackId: item.trackId,
            mode: item.mode,
            title: item.trackId ? getTrackTitle(item.trackId) : 'Home',
            isCurrent: index === historyPosition,
            timestamp: item.timestamp
        }));
    }
    
    function clearHistory() {
        const currentStateData = { ...currentState };
        navigationHistory = [{
            trackId: currentStateData.trackId,
            mode: currentStateData.mode,
            timestamp: Date.now()
        }];
        historyPosition = 0;
    }
    
    function preloadTrack(trackId) {
        const validatedTrackId = validateTrackId(trackId);
        if (!validatedTrackId) return;
        
        const audioURL = `assets/audio/${validatedTrackId.toString().padStart(2, '0')}-*.mp3`;
        const videoURL = `assets/video/${validatedTrackId.toString().padStart(2, '0')}-*_Lyrics.mp4`;
        
        const audioLink = document.createElement('link');
        audioLink.rel = 'prefetch';
        audioLink.href = audioURL;
        document.head.appendChild(audioLink);
        
        const videoLink = document.createElement('link');
        videoLink.rel = 'prefetch';
        videoLink.href = videoURL;
        document.head.appendChild(videoLink);
    }
    
    return {
        initialize,
        updateURL,
        getCurrentState,
        getPreviousState,
        getNextState,
        navigateToTrack,
        navigateToHome,
        navigateToURL,
        replaceCurrentState,
        getShareableURL,
        getCurrentURL,
        isTrackURL,
        isVideoMode,
        isAudioMode,
        getTrackIdFromURL,
        getModeFromURL,
        createTrackLink,
        navigateBack,
        navigateForward,
        canNavigateBack,
        canNavigateForward,
        go,
        getAllTrackLinks,
        getNavigationHistory,
        clearHistory,
        preloadTrack,
        getTrackTitle
    };
})();