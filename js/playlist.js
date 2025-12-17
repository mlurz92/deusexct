const PlaylistManager = (function() {
    const tracks = [
        {
            id: 1,
            number: '01',
            title: 'Oberarzt Dr. med. Placzek',
            artist: 'Deus ex CT',
            duration: '02:12',
            durationSeconds: 132,
            audioSrc: 'assets/audio/01-Oberarzt_Dr_med_Placzek.mp3',
            imageSrc: 'assets/images/01-Oberarzt_Dr_med_Placzek.png',
            lyricsSrc: 'assets/lyrics/01-Oberarzt_Dr_med_Placzek.lrc',
            backgroundSrc: 'assets/video/background/01-Oberarzt_Dr_med_Placzek.mp4',
            videoSrc: {
                low: 'assets/video/low/01-Oberarzt_Dr_med_Placzek_Lyrics_low.mp4',
                mid: 'assets/video/mid/01-Oberarzt_Dr_med_Placzek_Lyrics_mid.mp4',
                high: 'assets/video/high/01-Oberarzt_Dr_med_Placzek_Lyrics_hq.mp4'
            },
            slug: 'oberarzt-dr-med-placzek'
        },
        {
            id: 2,
            number: '02',
            title: 'Oberarzt der Herzen',
            artist: 'Deus ex CT',
            duration: '03:32',
            durationSeconds: 212,
            audioSrc: 'assets/audio/02-Oberarzt_der_Herzen.mp3',
            imageSrc: 'assets/images/02-Oberarzt_der_Herzen.png',
            lyricsSrc: 'assets/lyrics/02-Oberarzt_der_Herzen.lrc',
            backgroundSrc: 'assets/video/background/02-Oberarzt_der_Herzen.mp4',
            videoSrc: {
                low: 'assets/video/low/02-Oberarzt_der_Herzen_Lyrics_low.mp4',
                mid: 'assets/video/mid/02-Oberarzt_der_Herzen_Lyrics_mid.mp4',
                high: 'assets/video/high/02-Oberarzt_der_Herzen_Lyrics_hq.mp4'
            },
            slug: 'oberarzt-der-herzen'
        },
        {
            id: 3,
            number: '03',
            title: 'Vier-Eins-Neun-Zwei',
            artist: 'Deus ex CT',
            duration: '04:14',
            durationSeconds: 254,
            audioSrc: 'assets/audio/03-Vier-Eins-Neun-Zwei.mp3',
            imageSrc: 'assets/images/03-Vier-Eins-Neun-Zwei.png',
            lyricsSrc: 'assets/lyrics/03-Vier-Eins-Neun-Zwei.lrc',
            backgroundSrc: 'assets/video/background/03-Vier-Eins-Neun-Zwei.mp4',
            videoSrc: {
                low: 'assets/video/low/03-Vier-Eins-Neun-Zwei_Lyrics_low.mp4',
                mid: 'assets/video/mid/03-Vier-Eins-Neun-Zwei_Lyrics_mid.mp4',
                high: 'assets/video/high/03-Vier-Eins-Neun-Zwei_Lyrics_hq.mp4'
            },
            slug: 'vier-eins-neun-zwei'
        },
        {
            id: 4,
            number: '04',
            title: 'Pilot im Pixelmeer',
            artist: 'Deus ex CT',
            duration: '03:59',
            durationSeconds: 239,
            audioSrc: 'assets/audio/04-Pilot_im_Pixelmeer.mp3',
            imageSrc: 'assets/images/04-Pilot_im_Pixelmeer.png',
            lyricsSrc: 'assets/lyrics/04-Pilot_im_Pixelmeer.lrc',
            backgroundSrc: 'assets/video/background/04-Pilot_im_Pixelmeer.mp4',
            videoSrc: {
                low: 'assets/video/low/04-Pilot_im_Pixelmeer_Lyrics_low.mp4',
                mid: 'assets/video/mid/04-Pilot_im_Pixelmeer_Lyrics_mid.mp4',
                high: 'assets/video/high/04-Pilot_im_Pixelmeer_Lyrics_hq.mp4'
            },
            slug: 'pilot-im-pixelmeer'
        },
        {
            id: 5,
            number: '05',
            title: 'Drei Gebote',
            artist: 'Deus ex CT',
            duration: '03:54',
            durationSeconds: 234,
            audioSrc: 'assets/audio/05-Drei_Gebote.mp3',
            imageSrc: 'assets/images/05-Drei_Gebote.png',
            lyricsSrc: 'assets/lyrics/05-Drei_Gebote.lrc',
            backgroundSrc: 'assets/video/background/05-Drei_Gebote.mp4',
            videoSrc: {
                low: 'assets/video/low/05-Drei_Gebote_Lyrics_low.mp4',
                mid: 'assets/video/mid/05-Drei_Gebote_Lyrics_mid.mp4',
                high: 'assets/video/high/05-Drei_Gebote_Lyrics_hq.mp4'
            },
            slug: 'drei-gebote'
        },
        {
            id: 6,
            number: '06',
            title: 'Kunst der Diagnostik',
            artist: 'Deus ex CT',
            duration: '03:26',
            durationSeconds: 206,
            audioSrc: 'assets/audio/06-Kunst_der_Diagnostik.mp3',
            imageSrc: 'assets/images/06-Kunst_der_Diagnostik.png',
            lyricsSrc: 'assets/lyrics/06-Kunst_der_Diagnostik.lrc',
            backgroundSrc: 'assets/video/background/06-Kunst_der_Diagnostik.mp4',
            videoSrc: {
                low: 'assets/video/low/06-Kunst_der_Diagnostik_Lyrics_low.mp4',
                mid: 'assets/video/mid/06-Kunst_der_Diagnostik_Lyrics_mid.mp4',
                high: 'assets/video/high/06-Kunst_der_Diagnostik_Lyrics_hq.mp4'
            },
            slug: 'kunst-der-diagnostik'
        },
        {
            id: 7,
            number: '07',
            title: 'Mit harter Hand und Charme',
            artist: 'Deus ex CT',
            duration: '03:46',
            durationSeconds: 226,
            audioSrc: 'assets/audio/07-Mit_harter_Hand_und_Charme.mp3',
            imageSrc: 'assets/images/07-Mit_harter_Hand_und_Charme.png',
            lyricsSrc: 'assets/lyrics/07-Mit_harter_Hand_und_Charme.lrc',
            backgroundSrc: 'assets/video/background/07-Mit_harter_Hand_und_Charme.mp4',
            videoSrc: {
                low: 'assets/video/low/07-Mit_harter_Hand_und_Charme_Lyrics_low.mp4',
                mid: 'assets/video/mid/07-Mit_harter_Hand_und_Charme_Lyrics_mid.mp4',
                high: 'assets/video/high/07-Mit_harter_Hand_und_Charme_Lyrics_hq.mp4'
            },
            slug: 'mit-harter-hand-und-charme'
        },
        {
            id: 8,
            number: '08',
            title: 'Durch Feuer und Eis',
            artist: 'Deus ex CT',
            duration: '03:09',
            durationSeconds: 189,
            audioSrc: 'assets/audio/08-Durch_Feuer_und_Eis.mp3',
            imageSrc: 'assets/images/08-Durch_Feuer_und_Eis.png',
            lyricsSrc: 'assets/lyrics/08-Durch_Feuer_und_Eis.lrc',
            backgroundSrc: 'assets/video/background/08-Durch_Feuer_und_Eis.mp4',
            videoSrc: {
                low: 'assets/video/low/08-Durch_Feuer_und_Eis_Lyrics_low.mp4',
                mid: 'assets/video/mid/08-Durch_Feuer_und_Eis_Lyrics_mid.mp4',
                high: 'assets/video/high/08-Durch_Feuer_und_Eis_Lyrics_hq.mp4'
            },
            slug: 'durch-feuer-und-eis'
        },
        {
            id: 9,
            number: '09',
            title: 'Held und Idol',
            artist: 'Deus ex CT',
            duration: '04:02',
            durationSeconds: 242,
            audioSrc: 'assets/audio/09-Held_und_Idol.mp3',
            imageSrc: 'assets/images/09-Held_und_Idol.png',
            lyricsSrc: 'assets/lyrics/09-Held_und_Idol.lrc',
            backgroundSrc: 'assets/video/background/09-Held_und_Idol.mp4',
            videoSrc: {
                low: 'assets/video/low/09-Held_und_Idol_Lyrics_low.mp4',
                mid: 'assets/video/mid/09-Held_und_Idol_Lyrics_mid.mp4',
                high: 'assets/video/high/09-Held_und_Idol_Lyrics_hq.mp4'
            },
            slug: 'held-und-idol'
        },
        {
            id: 10,
            number: '10',
            title: 'Messerscharf und Legendär',
            artist: 'Deus ex CT',
            duration: '03:19',
            durationSeconds: 199,
            audioSrc: 'assets/audio/10-Messerscharf_und_Legendaer.mp3',
            imageSrc: 'assets/images/10-Messerscharf_und_Legendaer.png',
            lyricsSrc: 'assets/lyrics/10-Messerscharf_und_Legendaer.lrc',
            backgroundSrc: 'assets/video/background/10-Messerscharf_und_Legendaer.mp4',
            videoSrc: {
                low: 'assets/video/low/10-Messerscharf_und_Legendaer_Lyrics_low.mp4',
                mid: 'assets/video/mid/10-Messerscharf_und_Legendaer_Lyrics_mid.mp4',
                high: 'assets/video/high/10-Messerscharf_und_Legendaer_Lyrics_hq.mp4'
            },
            slug: 'messerscharf-und-legendaer'
        },
        {
            id: 11,
            number: '11',
            title: 'Oberärztlicher Glanz',
            artist: 'Deus ex CT',
            duration: '03:14',
            durationSeconds: 194,
            audioSrc: 'assets/audio/11-Oberaerztlicher_Glanz.mp3',
            imageSrc: 'assets/images/11-Oberaerztlicher_Glanz.png',
            lyricsSrc: 'assets/lyrics/11-Oberaerztlicher_Glanz.lrc',
            backgroundSrc: 'assets/video/background/11-Oberaerztlicher_Glanz.mp4',
            videoSrc: {
                low: 'assets/video/low/11-Oberaerztlicher_Glanz_Lyrics_low.mp4',
                mid: 'assets/video/mid/11-Oberaerztlicher_Glanz_Lyrics_mid.mp4',
                high: 'assets/video/high/11-Oberaerztlicher_Glanz_Lyrics_hq.mp4'
            },
            slug: 'oberaerztlicher-glanz'
        },
        {
            id: 12,
            number: '12',
            title: 'Götterdämmerung',
            artist: 'Deus ex CT',
            duration: '05:03',
            durationSeconds: 303,
            audioSrc: 'assets/audio/12-Goetterdaemmerung.mp3',
            imageSrc: 'assets/images/12-Goetterdaemmerung.png',
            lyricsSrc: 'assets/lyrics/12-Goetterdaemmerung.lrc',
            backgroundSrc: 'assets/video/background/12-Goetterdaemmerung.mp4',
            videoSrc: {
                low: 'assets/video/low/12-Goetterdaemmerung_Lyrics_low.mp4',
                mid: 'assets/video/mid/12-Goetterdaemmerung_Lyrics_mid.mp4',
                high: 'assets/video/high/12-Goetterdaemmerung_Lyrics_hq.mp4'
            },
            slug: 'goetterdaemmerung'
        }
    ];

    const albumInfo = {
        title: 'Deus ex CT',
        artist: 'Oberarzt Dr. med. Placzek',
        coverSrc: 'assets/images/00-Albumcover.png',
        totalTracks: 12,
        totalDuration: '40:50',
        totalDurationSeconds: 2450,
        downloadSrc: 'assets/downloads/Deus_ex_CT_Complete.zip',
        allVideosZipSrc: 'assets/downloads/Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip'
    };

    let currentIndex = 0;

    function getTracks() {
        return [...tracks];
    }

    function getTrackById(id) {
        return tracks.find(function(track) {
            return track.id === id;
        }) || null;
    }

    function getTrackByIndex(index) {
        if (index >= 0 && index < tracks.length) {
            return tracks[index];
        }
        return null;
    }

    function getTrackBySlug(slug) {
        return tracks.find(function(track) {
            return track.slug === slug;
        }) || null;
    }

    function getTrackIndex(trackId) {
        return tracks.findIndex(function(track) {
            return track.id === trackId;
        });
    }

    function getCurrentTrack() {
        return tracks[currentIndex];
    }

    function getCurrentIndex() {
        return currentIndex;
    }

    function setCurrentIndex(index) {
        if (index >= 0 && index < tracks.length) {
            currentIndex = index;
            return true;
        }
        return false;
    }

    function getAlbumInfo() {
        return { ...albumInfo };
    }

    function getNextTrack() {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= tracks.length) {
            return null;
        }
        return tracks[nextIndex];
    }

    function getPreviousTrack() {
        const prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
            return tracks[0];
        }
        return tracks[prevIndex];
    }

    function moveToNext() {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= tracks.length) {
            return null;
        }
        currentIndex = nextIndex;
        return tracks[currentIndex];
    }

    function moveToPrevious() {
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
            prevIndex = 0;
        }
        currentIndex = prevIndex;
        return tracks[currentIndex];
    }

    function playTrackById(id) {
        const index = getTrackIndex(id);
        if (index !== -1) {
            currentIndex = index;
            return tracks[index];
        }
        return null;
    }

    function playTrackBySlug(slug) {
        const track = getTrackBySlug(slug);
        if (track) {
            return playTrackById(track.id);
        }
        return null;
    }

    function hasNextTrack() {
        return currentIndex < tracks.length - 1;
    }

    function hasPreviousTrack() {
        return currentIndex > 0;
    }

    function getPlaylistForDisplay() {
        return tracks.map(function(track, index) {
            return {
                ...track,
                displayIndex: index,
                isCurrentTrack: index === currentIndex
            };
        });
    }

    function getTotalDuration() {
        return tracks.reduce(function(total, track) {
            return total + track.durationSeconds;
        }, 0);
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function formatTotalDuration() {
        const totalSeconds = getTotalDuration();
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        if (hours > 0) {
            return hours + ' Std. ' + mins + ' Min.';
        }
        return mins + ' Min.';
    }

    function reset() {
        currentIndex = 0;
    }

    function getState() {
        return {
            currentIndex: currentIndex,
            currentTrack: getCurrentTrack()
        };
    }

    function setState(state) {
        if (state.currentIndex !== undefined) {
            setCurrentIndex(state.currentIndex);
        }
    }

    function saveToStorage() {
        try {
            const state = {
                currentIndex: currentIndex
            };
            localStorage.setItem('deusExCT_playlistState', JSON.stringify(state));
        } catch (e) {
        }
    }

    function loadFromStorage() {
        try {
            const saved = localStorage.getItem('deusExCT_playlistState');
            if (saved) {
                const state = JSON.parse(saved);
                setState(state);
                return true;
            }
        } catch (e) {
        }
        return false;
    }

    return {
        getTracks: getTracks,
        getTrackById: getTrackById,
        getTrackByIndex: getTrackByIndex,
        getTrackBySlug: getTrackBySlug,
        getTrackIndex: getTrackIndex,
        getCurrentTrack: getCurrentTrack,
        getCurrentIndex: getCurrentIndex,
        setCurrentIndex: setCurrentIndex,
        getAlbumInfo: getAlbumInfo,
        getNextTrack: getNextTrack,
        getPreviousTrack: getPreviousTrack,
        moveToNext: moveToNext,
        moveToPrevious: moveToPrevious,
        playTrackById: playTrackById,
        playTrackBySlug: playTrackBySlug,
        hasNextTrack: hasNextTrack,
        hasPreviousTrack: hasPreviousTrack,
        getPlaylistForDisplay: getPlaylistForDisplay,
        getTotalDuration: getTotalDuration,
        formatTime: formatTime,
        formatTotalDuration: formatTotalDuration,
        reset: reset,
        getState: getState,
        setState: setState,
        saveToStorage: saveToStorage,
        loadFromStorage: loadFromStorage
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlaylistManager;
}