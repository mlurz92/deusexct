const LyricsManager = (function() {
    let currentLyrics = [];
    let currentTrackId = null;
    let lyricsCache = {};
    let currentLineIndex = -1;
    let onLyricChangeCallback = null;
    let onFullLyricsLoadedCallback = null;
    let lastUpdateTime = -1;
    let isLoading = false;
    let loadingPromise = null;

    function parseLRC(lrcContent) {
        const lines = lrcContent.split('\n');
        const lyrics = [];
        const metadata = {};
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
        const metaRegex = /\[([a-z]{2}):(.+)\]/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const metaMatch = line.match(metaRegex);
            if (metaMatch && !line.match(timeRegex)) {
                metadata[metaMatch[1].toLowerCase()] = metaMatch[2].trim();
                continue;
            }

            let match;
            const timestamps = [];
            let text = line;

            timeRegex.lastIndex = 0;

            while ((match = timeRegex.exec(line)) !== null) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                let milliseconds = parseInt(match[3], 10);
                if (match[3].length === 2) {
                    milliseconds = milliseconds * 10;
                }
                timestamps.push(minutes * 60 + seconds + milliseconds / 1000);
                text = text.replace(match[0], '');
            }

            text = text.trim();

            for (let j = 0; j < timestamps.length; j++) {
                if (text || timestamps.length === 1) {
                    lyrics.push({
                        time: timestamps[j],
                        text: text,
                        index: lyrics.length
                    });
                }
            }
        }

        lyrics.sort(function(a, b) {
            return a.time - b.time;
        });

        for (let i = 0; i < lyrics.length; i++) {
            lyrics[i].index = i;
            lyrics[i].endTime = i < lyrics.length - 1 ? lyrics[i + 1].time : lyrics[i].time + 10;
        }

        return {
            metadata: metadata,
            lyrics: lyrics
        };
    }

    function loadLyrics(url, trackId) {
        if (lyricsCache[trackId]) {
            currentLyrics = lyricsCache[trackId].lyrics;
            currentTrackId = trackId;
            currentLineIndex = -1;
            lastUpdateTime = -1;
            if (onFullLyricsLoadedCallback) {
                onFullLyricsLoadedCallback(lyricsCache[trackId]);
            }
            return Promise.resolve(lyricsCache[trackId]);
        }

        if (isLoading && loadingPromise) {
            return loadingPromise;
        }

        isLoading = true;

        loadingPromise = new Promise(function(resolve, reject) {
            const controller = new AbortController();
            const timeoutId = setTimeout(function() {
                controller.abort();
            }, 10000);

            fetch(url, { signal: controller.signal })
                .then(function(response) {
                    clearTimeout(timeoutId);
                    if (!response.ok) {
                        throw new Error('Failed to load lyrics: ' + response.status);
                    }
                    return response.text();
                })
                .then(function(lrcContent) {
                    const parsed = parseLRC(lrcContent);
                    lyricsCache[trackId] = parsed;
                    currentLyrics = parsed.lyrics;
                    currentTrackId = trackId;
                    currentLineIndex = -1;
                    lastUpdateTime = -1;
                    isLoading = false;
                    loadingPromise = null;
                    if (onFullLyricsLoadedCallback) {
                        onFullLyricsLoadedCallback(parsed);
                    }
                    resolve(parsed);
                })
                .catch(function(error) {
                    clearTimeout(timeoutId);
                    currentLyrics = [];
                    currentTrackId = trackId;
                    currentLineIndex = -1;
                    lastUpdateTime = -1;
                    isLoading = false;
                    loadingPromise = null;
                    reject(error);
                });
        });

        return loadingPromise;
    }

    function binarySearchLineIndex(currentTime) {
        if (!currentLyrics || currentLyrics.length === 0) {
            return -1;
        }

        if (currentTime < currentLyrics[0].time) {
            return -1;
        }

        if (currentTime >= currentLyrics[currentLyrics.length - 1].time) {
            return currentLyrics.length - 1;
        }

        let low = 0;
        let high = currentLyrics.length - 1;
        let result = -1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            
            if (currentLyrics[mid].time <= currentTime) {
                result = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return result;
    }

    function findLineIndexAtTime(currentTime) {
        if (!currentLyrics || currentLyrics.length === 0) {
            return -1;
        }

        if (currentLineIndex >= 0 && currentLineIndex < currentLyrics.length) {
            const current = currentLyrics[currentLineIndex];
            if (currentTime >= current.time && currentTime < current.endTime) {
                return currentLineIndex;
            }

            if (currentLineIndex < currentLyrics.length - 1) {
                const next = currentLyrics[currentLineIndex + 1];
                if (currentTime >= next.time && currentTime < next.endTime) {
                    return currentLineIndex + 1;
                }
            }

            if (currentLineIndex > 0) {
                const prev = currentLyrics[currentLineIndex - 1];
                if (currentTime >= prev.time && currentTime < prev.endTime) {
                    return currentLineIndex - 1;
                }
            }
        }

        return binarySearchLineIndex(currentTime);
    }

    function getCurrentLine(currentTime) {
        if (!currentLyrics || currentLyrics.length === 0) {
            return null;
        }

        const index = findLineIndexAtTime(currentTime);
        return index >= 0 ? currentLyrics[index] : null;
    }

    function getNextLine(currentTime) {
        if (!currentLyrics || currentLyrics.length === 0) {
            return null;
        }

        const currentIndex = findLineIndexAtTime(currentTime);
        
        if (currentIndex === -1) {
            return currentLyrics[0];
        }
        
        if (currentIndex < currentLyrics.length - 1) {
            return currentLyrics[currentIndex + 1];
        }

        return null;
    }

    function getPrevLine(currentTime) {
        if (!currentLyrics || currentLyrics.length === 0) {
            return null;
        }

        const currentIndex = findLineIndexAtTime(currentTime);
        
        if (currentIndex > 0) {
            return currentLyrics[currentIndex - 1];
        }

        return null;
    }

    function getLineAtIndex(index) {
        if (!currentLyrics || index < 0 || index >= currentLyrics.length) {
            return null;
        }
        return currentLyrics[index];
    }

    function getAllLines() {
        return currentLyrics ? currentLyrics.slice() : [];
    }

    function getLineCount() {
        return currentLyrics ? currentLyrics.length : 0;
    }

    function updateCurrentLine(currentTime) {
        if (Math.abs(currentTime - lastUpdateTime) < 0.016) {
            return {
                changed: false,
                prevLine: currentLineIndex > 0 ? currentLyrics[currentLineIndex - 1] : null,
                currentLine: currentLineIndex >= 0 ? currentLyrics[currentLineIndex] : null,
                nextLine: currentLineIndex >= 0 && currentLineIndex < currentLyrics.length - 1 ? currentLyrics[currentLineIndex + 1] : null,
                index: currentLineIndex
            };
        }

        lastUpdateTime = currentTime;
        const newIndex = findLineIndexAtTime(currentTime);

        if (newIndex !== currentLineIndex) {
            const oldIndex = currentLineIndex;
            currentLineIndex = newIndex;

            const prevLine = newIndex > 0 ? currentLyrics[newIndex - 1] : null;
            const currentLine = newIndex >= 0 ? currentLyrics[newIndex] : null;
            const nextLine = newIndex >= 0 && newIndex < currentLyrics.length - 1 ? currentLyrics[newIndex + 1] : null;

            if (onLyricChangeCallback) {
                onLyricChangeCallback({
                    prevLine: prevLine,
                    currentLine: currentLine,
                    nextLine: nextLine,
                    currentIndex: newIndex,
                    previousIndex: oldIndex,
                    totalLines: currentLyrics.length
                });
            }

            return {
                changed: true,
                prevLine: prevLine,
                currentLine: currentLine,
                nextLine: nextLine,
                index: newIndex
            };
        }

        return {
            changed: false,
            prevLine: newIndex > 0 ? currentLyrics[newIndex - 1] : null,
            currentLine: newIndex >= 0 ? currentLyrics[newIndex] : null,
            nextLine: newIndex >= 0 && newIndex < currentLyrics.length - 1 ? currentLyrics[newIndex + 1] : null,
            index: newIndex
        };
    }

    function seekToLine(index) {
        if (!currentLyrics || index < 0 || index >= currentLyrics.length) {
            return null;
        }
        currentLineIndex = index;
        lastUpdateTime = -1;
        return currentLyrics[index].time;
    }

    function getTimeForLine(index) {
        if (!currentLyrics || index < 0 || index >= currentLyrics.length) {
            return -1;
        }
        return currentLyrics[index].time;
    }

    function setOnLyricChange(callback) {
        onLyricChangeCallback = callback;
    }

    function setOnFullLyricsLoaded(callback) {
        onFullLyricsLoadedCallback = callback;
    }

    function reset() {
        currentLineIndex = -1;
        lastUpdateTime = -1;
    }

    function clear() {
        currentLyrics = [];
        currentTrackId = null;
        currentLineIndex = -1;
        lastUpdateTime = -1;
        isLoading = false;
        loadingPromise = null;
    }

    function clearCache() {
        lyricsCache = {};
    }

    function preloadLyrics(tracks) {
        const promises = [];
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            if (!lyricsCache[track.id] && track.lyricsSrc) {
                const promise = fetch(track.lyricsSrc)
                    .then(function(response) {
                        return response.text();
                    })
                    .then(function(lrcContent) {
                        const parsed = parseLRC(lrcContent);
                        lyricsCache[track.id] = parsed;
                        return parsed;
                    })
                    .catch(function() {
                        return null;
                    });
                promises.push(promise);
            }
        }
        return Promise.all(promises);
    }

    function preloadSingleTrack(track) {
        if (!track || !track.lyricsSrc || lyricsCache[track.id]) {
            return Promise.resolve(lyricsCache[track.id] || null);
        }

        return fetch(track.lyricsSrc)
            .then(function(response) {
                return response.text();
            })
            .then(function(lrcContent) {
                const parsed = parseLRC(lrcContent);
                lyricsCache[track.id] = parsed;
                return parsed;
            })
            .catch(function() {
                return null;
            });
    }

    function getCurrentTrackId() {
        return currentTrackId;
    }

    function hasLyrics() {
        return currentLyrics && currentLyrics.length > 0;
    }

    function getMetadata() {
        if (currentTrackId && lyricsCache[currentTrackId]) {
            return lyricsCache[currentTrackId].metadata;
        }
        return {};
    }

    function searchLyrics(query) {
        if (!currentLyrics || !query) {
            return [];
        }

        const lowerQuery = query.toLowerCase();
        const results = [];

        for (let i = 0; i < currentLyrics.length; i++) {
            if (currentLyrics[i].text.toLowerCase().indexOf(lowerQuery) !== -1) {
                results.push({
                    line: currentLyrics[i],
                    index: i
                });
            }
        }

        return results;
    }

    function getLyricsAroundTime(currentTime, before, after) {
        before = before !== undefined ? before : 2;
        after = after !== undefined ? after : 2;

        const currentIndex = findLineIndexAtTime(currentTime);
        const result = {
            before: [],
            current: null,
            after: []
        };

        if (currentIndex === -1 || !currentLyrics) {
            return result;
        }

        result.current = currentLyrics[currentIndex];

        const startBefore = Math.max(0, currentIndex - before);
        for (let i = startBefore; i < currentIndex; i++) {
            result.before.push(currentLyrics[i]);
        }

        const endAfter = Math.min(currentLyrics.length - 1, currentIndex + after);
        for (let i = currentIndex + 1; i <= endAfter; i++) {
            result.after.push(currentLyrics[i]);
        }

        return result;
    }

    function formatLyricsAsText() {
        if (!currentLyrics || currentLyrics.length === 0) {
            return '';
        }

        let text = '';
        for (let i = 0; i < currentLyrics.length; i++) {
            if (currentLyrics[i].text) {
                text += currentLyrics[i].text + '\n';
            }
        }
        return text.trim();
    }

    function formatLyricsAsHTML(currentTime) {
        if (!currentLyrics || currentLyrics.length === 0) {
            return '';
        }

        const currentIndex = findLineIndexAtTime(currentTime || 0);
        let html = '';

        for (let i = 0; i < currentLyrics.length; i++) {
            let className = 'lyrics-line';
            if (i === currentIndex) {
                className += ' active';
            } else if (i < currentIndex) {
                className += ' past';
            }
            html += '<p class="' + className + '" data-index="' + i + '" data-time="' + currentLyrics[i].time + '">';
            html += escapeHTML(currentLyrics[i].text) || '♪';
            html += '</p>';
        }

        return html;
    }

    function escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getProgressInLine(currentTime) {
        const currentIndex = findLineIndexAtTime(currentTime);
        if (currentIndex === -1 || !currentLyrics[currentIndex]) {
            return 0;
        }

        const line = currentLyrics[currentIndex];
        const duration = line.endTime - line.time;
        
        if (duration <= 0) {
            return 1;
        }

        const progress = (currentTime - line.time) / duration;
        return Math.max(0, Math.min(1, progress));
    }

    function estimateReadingProgress(currentTime, totalDuration) {
        if (!currentLyrics || currentLyrics.length === 0 || !totalDuration) {
            return 0;
        }

        const currentIndex = findLineIndexAtTime(currentTime);
        if (currentIndex === -1) {
            return 0;
        }

        return (currentIndex + 1) / currentLyrics.length;
    }

    function getCurrentLineIndex() {
        return currentLineIndex;
    }

    function getUpcomingLines(count) {
        count = count || 3;
        
        if (!currentLyrics || currentLineIndex < 0) {
            return [];
        }

        const result = [];
        const startIndex = currentLineIndex + 1;
        const endIndex = Math.min(startIndex + count, currentLyrics.length);

        for (let i = startIndex; i < endIndex; i++) {
            result.push(currentLyrics[i]);
        }

        return result;
    }

    function getPastLines(count) {
        count = count || 3;
        
        if (!currentLyrics || currentLineIndex < 0) {
            return [];
        }

        const result = [];
        const startIndex = Math.max(0, currentLineIndex - count);

        for (let i = startIndex; i < currentLineIndex; i++) {
            result.push(currentLyrics[i]);
        }

        return result;
    }

    function isLineActive(index, currentTime) {
        if (!currentLyrics || index < 0 || index >= currentLyrics.length) {
            return false;
        }

        const line = currentLyrics[index];
        return currentTime >= line.time && currentTime < line.endTime;
    }

    function getLineDuration(index) {
        if (!currentLyrics || index < 0 || index >= currentLyrics.length) {
            return 0;
        }

        const line = currentLyrics[index];
        return line.endTime - line.time;
    }

    function getTotalLyricsDuration() {
        if (!currentLyrics || currentLyrics.length === 0) {
            return 0;
        }

        const firstLine = currentLyrics[0];
        const lastLine = currentLyrics[currentLyrics.length - 1];

        return lastLine.endTime - firstLine.time;
    }

    function isCached(trackId) {
        return !!lyricsCache[trackId];
    }

    function getCacheSize() {
        return Object.keys(lyricsCache).length;
    }

    function removeCacheEntry(trackId) {
        if (lyricsCache[trackId]) {
            delete lyricsCache[trackId];
            return true;
        }
        return false;
    }

    return {
        parseLRC: parseLRC,
        loadLyrics: loadLyrics,
        getCurrentLine: getCurrentLine,
        getNextLine: getNextLine,
        getPrevLine: getPrevLine,
        getLineAtIndex: getLineAtIndex,
        getAllLines: getAllLines,
        getLineCount: getLineCount,
        findLineIndexAtTime: findLineIndexAtTime,
        updateCurrentLine: updateCurrentLine,
        seekToLine: seekToLine,
        getTimeForLine: getTimeForLine,
        setOnLyricChange: setOnLyricChange,
        setOnFullLyricsLoaded: setOnFullLyricsLoaded,
        reset: reset,
        clear: clear,
        clearCache: clearCache,
        preloadLyrics: preloadLyrics,
        preloadSingleTrack: preloadSingleTrack,
        getCurrentTrackId: getCurrentTrackId,
        hasLyrics: hasLyrics,
        getMetadata: getMetadata,
        searchLyrics: searchLyrics,
        getLyricsAroundTime: getLyricsAroundTime,
        formatLyricsAsText: formatLyricsAsText,
        formatLyricsAsHTML: formatLyricsAsHTML,
        getProgressInLine: getProgressInLine,
        estimateReadingProgress: estimateReadingProgress,
        getCurrentLineIndex: getCurrentLineIndex,
        getUpcomingLines: getUpcomingLines,
        getPastLines: getPastLines,
        isLineActive: isLineActive,
        getLineDuration: getLineDuration,
        getTotalLyricsDuration: getTotalLyricsDuration,
        isCached: isCached,
        getCacheSize: getCacheSize,
        removeCacheEntry: removeCacheEntry
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LyricsManager;
}