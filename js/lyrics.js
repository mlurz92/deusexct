window.Lyrics = (function() {
    let lyricsData = [];
    let currentLyricIndex = -1;
    let isLoaded = false;
    let animationTimeout = null;
    let fetchController = null;
    
    const elements = {
        prevLine: null,
        currentLine: null,
        nextLine: null
    };
    
    const lrcMetadata = {
        title: '',
        artist: '',
        album: '',
        length: '',
        by: '',
        offset: 0,
        creator: '',
        version: '',
        author: '',
        program: ''
    };
    
    function initialize() {
        cacheElements();
        resetDisplay();
    }
    
    function cacheElements() {
        elements.prevLine = document.querySelector('.lyrics-line.prev');
        elements.currentLine = document.querySelector('.lyrics-line.current');
        elements.nextLine = document.querySelector('.lyrics-line.next');
    }
    
    function loadLyrics(lrcPath) {
        if (fetchController) {
            fetchController.abort();
        }
        
        resetLyrics();
        
        if (!lrcPath) {
            setNoLyricsAvailable();
            return;
        }
        
        fetchController = new AbortController();
        
        fetch(lrcPath, { signal: fetchController.signal })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(lrcContent => {
                parseLRC(lrcContent);
                isLoaded = true;
                fetchController = null;
            })
            .catch(error => {
                if (error.name !== 'AbortError') {
                    console.error('Failed to load lyrics:', error);
                    setNoLyricsAvailable();
                }
                fetchController = null;
            });
    }
    
    function parseLRC(content) {
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        lyricsData = [];
        
        const timestampRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
        const metadataRegex = /\[([a-z_]+):(.+)\]/i;
        
        lines.forEach(line => {
            const metadataMatch = line.match(metadataRegex);
            
            if (metadataMatch && !line.match(timestampRegex)) {
                const key = metadataMatch[1].toLowerCase();
                const value = metadataMatch[2].trim();
                
                switch(key) {
                    case 'ti':
                    case 'title':
                        lrcMetadata.title = value;
                        break;
                    case 'ar':
                    case 'artist':
                        lrcMetadata.artist = value;
                        break;
                    case 'al':
                    case 'album':
                        lrcMetadata.album = value;
                        break;
                    case 'length':
                        lrcMetadata.length = value;
                        break;
                    case 'by':
                        lrcMetadata.by = value;
                        break;
                    case 'offset':
                        lrcMetadata.offset = parseInt(value) || 0;
                        break;
                    case 're':
                    case 'tool':
                        lrcMetadata.creator = value;
                        break;
                    case 've':
                    case 'version':
                        lrcMetadata.version = value;
                        break;
                    case 'au':
                    case 'author':
                        lrcMetadata.author = value;
                        break;
                    case 'program':
                        lrcMetadata.program = value;
                        break;
                }
                return;
            }
            
            let match;
            const timestamps = [];
            let lastIndex = 0;
            let text = '';
            
            while ((match = timestampRegex.exec(line)) !== null) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
                
                timestamps.push({
                    minutes: minutes,
                    seconds: seconds,
                    milliseconds: milliseconds
                });
                
                lastIndex = match.index + match[0].length;
            }
            
            if (timestamps.length > 0) {
                text = line.substring(lastIndex).trim();
                
                if (!text) {
                    text = '♪';
                }
                
                timestamps.forEach(timestamp => {
                    const time = timestamp.minutes * 60 + 
                               timestamp.seconds + 
                               timestamp.milliseconds / 1000 + 
                               (lrcMetadata.offset / 1000);
                    
                    lyricsData.push({
                        time: time,
                        text: text,
                        rawTime: timestamp
                    });
                });
            }
        });
        
        lyricsData.sort((a, b) => a.time - b.time);
        
        if (lyricsData.length === 0) {
            setNoLyricsAvailable();
        } else {
            processLyrics();
        }
    }
    
    function processLyrics() {
        for (let i = 0; i < lyricsData.length; i++) {
            if (i < lyricsData.length - 1) {
                lyricsData[i].duration = lyricsData[i + 1].time - lyricsData[i].time;
            } else {
                lyricsData[i].duration = 5;
            }
        }
    }
    
    function setNoLyricsAvailable() {
        lyricsData = [{ time: 0, text: 'Keine Lyrics verfügbar', duration: Number.MAX_VALUE }];
        isLoaded = true;
        updateDisplay();
    }
    
    function updateTime(currentTime) {
        if (!isLoaded || lyricsData.length === 0) return;
        
        let newIndex = -1;
        
        for (let i = lyricsData.length - 1; i >= 0; i--) {
            if (currentTime >= lyricsData[i].time) {
                newIndex = i;
                break;
            }
        }
        
        if (newIndex !== currentLyricIndex) {
            currentLyricIndex = newIndex;
            updateDisplay();
            
            if (newIndex >= 0 && lyricsData[newIndex].duration) {
                const remainingTime = lyricsData[newIndex].time + lyricsData[newIndex].duration - currentTime;
                schedulePrefetch(newIndex + 1, remainingTime);
            }
        }
    }
    
    function schedulePrefetch(nextIndex, timeUntilNext) {
        if (animationTimeout) {
            clearTimeout(animationTimeout);
        }
        
        if (nextIndex < lyricsData.length && timeUntilNext > 0.5) {
            animationTimeout = setTimeout(() => {
                prepareLyricTransition(nextIndex);
            }, (timeUntilNext - 0.5) * 1000);
        }
    }
    
    function prepareLyricTransition(nextIndex) {
        if (nextIndex < lyricsData.length) {
            const nextElement = elements.nextLine;
            if (nextElement && nextElement.textContent !== lyricsData[nextIndex].text) {
                nextElement.style.opacity = '0';
                nextElement.textContent = lyricsData[nextIndex].text;
                
                requestAnimationFrame(() => {
                    nextElement.style.opacity = '';
                });
            }
        }
    }
    
    function updateDisplay() {
        if (!isLoaded) {
            resetDisplay();
            return;
        }
        
        const prevText = currentLyricIndex > 0 ? lyricsData[currentLyricIndex - 1].text : '';
        const currentText = currentLyricIndex >= 0 ? lyricsData[currentLyricIndex].text : '';
        const nextText = currentLyricIndex < lyricsData.length - 1 ? lyricsData[currentLyricIndex + 1].text : '';
        
        animateLineChange(elements.prevLine, prevText, 'prev');
        animateLineChange(elements.currentLine, currentText, 'current');
        animateLineChange(elements.nextLine, nextText, 'next');
    }
    
    function animateLineChange(element, newText, position) {
        if (!element) return;
        
        if (element.textContent === newText) return;
        
        if (element.dataset.animating === 'true') return;
        
        element.dataset.animating = 'true';
        
        const duration = position === 'current' ? 200 : 150;
        const delay = position === 'current' ? 0 : 50;
        
        setTimeout(() => {
            element.style.opacity = '0';
            element.style.transform = position === 'current' 
                ? 'translateY(20px) scale(0.95)' 
                : 'translateY(10px)';
            
            setTimeout(() => {
                element.textContent = newText;
                
                requestAnimationFrame(() => {
                    element.style.transition = `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                    element.style.opacity = '';
                    element.style.transform = '';
                    
                    setTimeout(() => {
                        element.style.transition = '';
                        element.dataset.animating = 'false';
                    }, duration);
                });
            }, duration / 2);
        }, delay);
    }
    
    function resetLyrics() {
        lyricsData = [];
        currentLyricIndex = -1;
        isLoaded = false;
        
        if (animationTimeout) {
            clearTimeout(animationTimeout);
            animationTimeout = null;
        }
        
        Object.keys(lrcMetadata).forEach(key => {
            lrcMetadata[key] = key === 'offset' ? 0 : '';
        });
    }
    
    function resetDisplay() {
        if (elements.prevLine) {
            elements.prevLine.textContent = '';
            elements.prevLine.style.opacity = '';
            elements.prevLine.style.transform = '';
        }
        if (elements.currentLine) {
            elements.currentLine.textContent = '';
            elements.currentLine.style.opacity = '';
            elements.currentLine.style.transform = '';
        }
        if (elements.nextLine) {
            elements.nextLine.textContent = '';
            elements.nextLine.style.opacity = '';
            elements.nextLine.style.transform = '';
        }
    }
    
    function getCurrentLyric() {
        if (!isLoaded || currentLyricIndex < 0 || currentLyricIndex >= lyricsData.length) {
            return null;
        }
        return {
            time: lyricsData[currentLyricIndex].time,
            text: lyricsData[currentLyricIndex].text,
            duration: lyricsData[currentLyricIndex].duration,
            index: currentLyricIndex
        };
    }
    
    function getAllLyrics() {
        return lyricsData.map((lyric, index) => ({
            time: lyric.time,
            text: lyric.text,
            duration: lyric.duration,
            index: index
        }));
    }
    
    function getMetadata() {
        return { ...lrcMetadata };
    }
    
    function seekToLyric(index) {
        if (index >= 0 && index < lyricsData.length) {
            currentLyricIndex = index;
            updateDisplay();
            return lyricsData[index].time;
        }
        return null;
    }
    
    function getNextLyricTime() {
        if (currentLyricIndex < lyricsData.length - 1) {
            return lyricsData[currentLyricIndex + 1].time;
        }
        return null;
    }
    
    function getPreviousLyricTime() {
        if (currentLyricIndex > 0) {
            return lyricsData[currentLyricIndex - 1].time;
        }
        return null;
    }
    
    function findLyricIndexByTime(time) {
        for (let i = lyricsData.length - 1; i >= 0; i--) {
            if (time >= lyricsData[i].time) {
                return i;
            }
        }
        return -1;
    }
    
    function searchLyrics(searchText) {
        if (!searchText || !isLoaded) return [];
        
        const searchLower = searchText.toLowerCase();
        const results = [];
        
        lyricsData.forEach((lyric, index) => {
            if (lyric.text.toLowerCase().includes(searchLower)) {
                results.push({
                    time: lyric.time,
                    text: lyric.text,
                    index: index,
                    matchStart: lyric.text.toLowerCase().indexOf(searchLower),
                    matchLength: searchText.length
                });
            }
        });
        
        return results;
    }
    
    function highlightSearchResult(searchText) {
        const results = searchLyrics(searchText);
        if (results.length > 0) {
            return seekToLyric(results[0].index);
        }
        return null;
    }
    
    function exportLyrics(format = 'lrc') {
        if (!isLoaded || lyricsData.length === 0) return null;
        
        if (format === 'lrc') {
            let content = '';
            
            Object.entries(lrcMetadata).forEach(([key, value]) => {
                if (value) {
                    const lrcKey = key === 'title' ? 'ti' : 
                                  key === 'artist' ? 'ar' : 
                                  key === 'album' ? 'al' : key;
                    content += `[${lrcKey}:${value}]\n`;
                }
            });
            
            content += '\n';
            
            lyricsData.forEach(lyric => {
                const minutes = Math.floor(lyric.time / 60);
                const seconds = (lyric.time % 60).toFixed(2);
                const formattedTime = `[${minutes.toString().padStart(2, '0')}:${seconds.padStart(5, '0')}]`;
                content += `${formattedTime}${lyric.text}\n`;
            });
            
            return content;
        } else if (format === 'json') {
            return JSON.stringify({
                metadata: lrcMetadata,
                lyrics: lyricsData
            }, null, 2);
        }
        
        return null;
    }
    
    function isReady() {
        return isLoaded;
    }
    
    return {
        initialize,
        loadLyrics,
        updateTime,
        getCurrentLyric,
        getAllLyrics,
        getMetadata,
        seekToLyric,
        getNextLyricTime,
        getPreviousLyricTime,
        findLyricIndexByTime,
        highlightSearchResult,
        searchLyrics,
        exportLyrics,
        isReady
    };
})();