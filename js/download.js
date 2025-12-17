const DownloadManager = (function() {
    var activeDownloads = {};
    var downloadHistory = [];
    var onProgressCallback = null;
    var onCompleteCallback = null;
    var onErrorCallback = null;
    var maxConcurrentDownloads = 3;
    var downloadQueue = [];
    var isProcessingQueue = false;

    var albumDownloadUrl = 'assets/downloads/Deus_ex_CT_Complete.zip';
    var albumFileName = 'Deus_ex_CT_Complete.zip';
    
    var allVideosZipUrl = 'assets/downloads/Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip';
    var allVideosFileName = 'Oberarzt_Dr_med_Placzek_Deus-Ex-CT_Lyrics-Videos_(HQ).zip';

    function generateVideoFileName(track, quality) {
        var qualityLabels = {
            low: 'LOW',
            mid: 'MID',
            high: 'HQ'
        };

        var qualityLabel = qualityLabels[quality];
        if (!qualityLabel) {
            qualityLabel = 'MID';
        }

        var sanitizedTitle = sanitizeFileName(track.title);
        return 'Deus_ex_CT_' + track.number + '_' + sanitizedTitle + '_' + qualityLabel + '.mp4';
    }

    function sanitizeFileName(name) {
        var result = name;
        result = result.replace(/[äÄ]/g, 'ae');
        result = result.replace(/[öÖ]/g, 'oe');
        result = result.replace(/[üÜ]/g, 'ue');
        result = result.replace(/[ß]/g, 'ss');
        result = result.replace(/[^a-zA-Z0-9\-_]/g, '_');
        result = result.replace(/_+/g, '_');
        result = result.replace(/^_|_$/g, '');
        return result;
    }

    function downloadAlbum() {
        return downloadFile(albumDownloadUrl, albumFileName, 'album', null);
    }
    
    function downloadAllVideos() {
        return downloadFile(allVideosZipUrl, allVideosFileName, 'all_videos', null);
    }

    function downloadVideo(track, quality) {
        if (!track || !track.videoSrc) {
            return Promise.reject(new Error('Invalid track or no video source'));
        }

        if (!quality) {
            quality = 'high';
        }

        var videoUrl = track.videoSrc[quality];
        if (!videoUrl) {
            videoUrl = track.videoSrc.high;
        }
        if (!videoUrl) {
            videoUrl = track.videoSrc.mid;
        }
        if (!videoUrl) {
            videoUrl = track.videoSrc.low;
        }

        var fileName = generateVideoFileName(track, quality);

        return downloadFile(videoUrl, fileName, 'video', track.id);
    }

    function downloadFile(url, fileName, type, trackId) {
        return new Promise(function(resolve, reject) {
            var downloadId = generateDownloadId();

            if (Object.keys(activeDownloads).length >= maxConcurrentDownloads) {
                downloadQueue.push({
                    url: url,
                    fileName: fileName,
                    type: type,
                    trackId: trackId,
                    resolve: resolve,
                    reject: reject
                });
                processQueue();
                return;
            }

            executeDownload(url, fileName, type, trackId, downloadId, resolve, reject);
        });
    }

    function executeDownload(url, fileName, type, trackId, downloadId, resolve, reject) {
        activeDownloads[downloadId] = {
            id: downloadId,
            url: url,
            fileName: fileName,
            type: type,
            trackId: trackId,
            progress: 0,
            status: 'starting',
            startTime: Date.now()
        };

        if (onProgressCallback) {
            onProgressCallback({
                id: downloadId,
                fileName: fileName,
                progress: 0,
                status: 'starting'
            });
        }

        if (supportsDirectDownload()) {
            directDownload(url, fileName, downloadId, resolve, reject);
        } else {
            fetchDownload(url, fileName, downloadId, resolve, reject);
        }
    }

    function supportsDirectDownload() {
        var a = document.createElement('a');
        return typeof a.download !== 'undefined';
    }

    function directDownload(url, fileName, downloadId, resolve, reject) {
        var link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';

        document.body.appendChild(link);

        activeDownloads[downloadId].status = 'downloading';

        if (onProgressCallback) {
            onProgressCallback({
                id: downloadId,
                fileName: fileName,
                progress: 50,
                status: 'downloading'
            });
        }

        try {
            link.click();

            setTimeout(function() {
                document.body.removeChild(link);

                activeDownloads[downloadId].status = 'complete';
                activeDownloads[downloadId].progress = 100;
                activeDownloads[downloadId].endTime = Date.now();

                var downloadInfo = {};
                for (var key in activeDownloads[downloadId]) {
                    if (activeDownloads[downloadId].hasOwnProperty(key)) {
                        downloadInfo[key] = activeDownloads[downloadId][key];
                    }
                }
                downloadHistory.push(downloadInfo);

                if (onCompleteCallback) {
                    onCompleteCallback({
                        id: downloadId,
                        fileName: fileName,
                        status: 'complete'
                    });
                }

                if (onProgressCallback) {
                    onProgressCallback({
                        id: downloadId,
                        fileName: fileName,
                        progress: 100,
                        status: 'complete'
                    });
                }

                delete activeDownloads[downloadId];
                processQueue();

                resolve({
                    success: true,
                    downloadId: downloadId,
                    fileName: fileName
                });
            }, 1000);
        } catch (error) {
            document.body.removeChild(link);
            handleDownloadError(downloadId, fileName, error, reject);
        }
    }

    function fetchDownload(url, fileName, downloadId, resolve, reject) {
        activeDownloads[downloadId].status = 'downloading';

        fetch(url)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.status);
                }

                var contentLength = response.headers.get('content-length');
                var total = 0;
                if (contentLength) {
                    total = parseInt(contentLength, 10);
                }
                var loaded = 0;

                var reader = response.body.getReader();
                var chunks = [];

                function read() {
                    return reader.read().then(function(result) {
                        if (result.done) {
                            return new Blob(chunks);
                        }

                        chunks.push(result.value);
                        loaded = loaded + result.value.length;

                        if (total > 0) {
                            var progress = Math.round((loaded / total) * 100);
                            activeDownloads[downloadId].progress = progress;

                            if (onProgressCallback) {
                                onProgressCallback({
                                    id: downloadId,
                                    fileName: fileName,
                                    progress: progress,
                                    loaded: loaded,
                                    total: total,
                                    status: 'downloading'
                                });
                            }
                        }

                        return read();
                    });
                }

                return read();
            })
            .then(function(blob) {
                var blobUrl = URL.createObjectURL(blob);
                var link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileName;
                link.style.display = 'none';

                document.body.appendChild(link);
                link.click();

                setTimeout(function() {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                }, 100);

                activeDownloads[downloadId].status = 'complete';
                activeDownloads[downloadId].progress = 100;
                activeDownloads[downloadId].endTime = Date.now();

                var downloadInfo = {};
                for (var key in activeDownloads[downloadId]) {
                    if (activeDownloads[downloadId].hasOwnProperty(key)) {
                        downloadInfo[key] = activeDownloads[downloadId][key];
                    }
                }
                downloadHistory.push(downloadInfo);

                if (onCompleteCallback) {
                    onCompleteCallback({
                        id: downloadId,
                        fileName: fileName,
                        status: 'complete'
                    });
                }

                if (onProgressCallback) {
                    onProgressCallback({
                        id: downloadId,
                        fileName: fileName,
                        progress: 100,
                        status: 'complete'
                    });
                }

                delete activeDownloads[downloadId];
                processQueue();

                resolve({
                    success: true,
                    downloadId: downloadId,
                    fileName: fileName
                });
            })
            .catch(function(error) {
                handleDownloadError(downloadId, fileName, error, reject);
            });
    }

    function handleDownloadError(downloadId, fileName, error, reject) {
        activeDownloads[downloadId].status = 'error';
        activeDownloads[downloadId].error = error.message;
        activeDownloads[downloadId].endTime = Date.now();

        var downloadInfo = {};
        for (var key in activeDownloads[downloadId]) {
            if (activeDownloads[downloadId].hasOwnProperty(key)) {
                downloadInfo[key] = activeDownloads[downloadId][key];
            }
        }
        downloadHistory.push(downloadInfo);

        if (onErrorCallback) {
            onErrorCallback({
                id: downloadId,
                fileName: fileName,
                error: error.message,
                status: 'error'
            });
        }

        if (onProgressCallback) {
            onProgressCallback({
                id: downloadId,
                fileName: fileName,
                progress: 0,
                status: 'error',
                error: error.message
            });
        }

        delete activeDownloads[downloadId];
        processQueue();

        reject({
            success: false,
            downloadId: downloadId,
            fileName: fileName,
            error: error.message
        });
    }

    function processQueue() {
        if (isProcessingQueue) {
            return;
        }

        if (downloadQueue.length === 0) {
            return;
        }

        if (Object.keys(activeDownloads).length >= maxConcurrentDownloads) {
            return;
        }

        isProcessingQueue = true;

        while (downloadQueue.length > 0 && Object.keys(activeDownloads).length < maxConcurrentDownloads) {
            var item = downloadQueue.shift();
            var downloadId = generateDownloadId();
            executeDownload(
                item.url,
                item.fileName,
                item.type,
                item.trackId,
                downloadId,
                item.resolve,
                item.reject
            );
        }

        isProcessingQueue = false;
    }

    function generateDownloadId() {
        return 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function cancelDownload(downloadId) {
        if (activeDownloads[downloadId]) {
            activeDownloads[downloadId].status = 'cancelled';
            activeDownloads[downloadId].endTime = Date.now();

            var downloadInfo = {};
            for (var key in activeDownloads[downloadId]) {
                if (activeDownloads[downloadId].hasOwnProperty(key)) {
                    downloadInfo[key] = activeDownloads[downloadId][key];
                }
            }
            downloadHistory.push(downloadInfo);

            delete activeDownloads[downloadId];

            if (onProgressCallback) {
                onProgressCallback({
                    id: downloadId,
                    status: 'cancelled'
                });
            }

            return true;
        }

        var queueIndex = -1;
        for (var i = 0; i < downloadQueue.length; i++) {
            if (downloadQueue[i].downloadId === downloadId) {
                queueIndex = i;
                break;
            }
        }

        if (queueIndex !== -1) {
            var item = downloadQueue.splice(queueIndex, 1)[0];
            item.reject({
                success: false,
                error: 'Cancelled'
            });
            return true;
        }

        return false;
    }

    function cancelAllDownloads() {
        var downloadIds = Object.keys(activeDownloads);
        for (var i = 0; i < downloadIds.length; i++) {
            cancelDownload(downloadIds[i]);
        }

        for (var j = 0; j < downloadQueue.length; j++) {
            downloadQueue[j].reject({
                success: false,
                error: 'Cancelled'
            });
        }
        downloadQueue = [];
    }

    function getActiveDownloads() {
        var result = [];
        for (var key in activeDownloads) {
            if (activeDownloads.hasOwnProperty(key)) {
                result.push(activeDownloads[key]);
            }
        }
        return result;
    }

    function getDownloadHistory() {
        var result = [];
        for (var i = 0; i < downloadHistory.length; i++) {
            result.push(downloadHistory[i]);
        }
        return result;
    }

    function clearDownloadHistory() {
        downloadHistory = [];
    }

    function getQueueLength() {
        return downloadQueue.length;
    }

    function getActiveCount() {
        return Object.keys(activeDownloads).length;
    }

    function setMaxConcurrentDownloads(max) {
        if (max > 0 && max <= 10) {
            maxConcurrentDownloads = max;
            processQueue();
        }
    }

    function onProgress(callback) {
        onProgressCallback = callback;
    }

    function onComplete(callback) {
        onCompleteCallback = callback;
    }

    function onError(callback) {
        onErrorCallback = callback;
    }

    function getVideoDownloadUrl(track, quality) {
        if (!track || !track.videoSrc) {
            return null;
        }

        if (!quality) {
            quality = 'high';
        }

        var videoUrl = track.videoSrc[quality];
        if (!videoUrl) {
            videoUrl = track.videoSrc.high;
        }
        if (!videoUrl) {
            videoUrl = track.videoSrc.mid;
        }
        if (!videoUrl) {
            videoUrl = track.videoSrc.low;
        }

        return videoUrl;
    }

    function getAlbumDownloadUrl() {
        return albumDownloadUrl;
    }
    
    function getAllVideosZipUrl() {
        return allVideosZipUrl;
    }

    function openInNewTab(url) {
        var newWindow = window.open(url, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            window.location.href = url;
        }
    }

    function downloadVideoInNewTab(track, quality) {
        var url = getVideoDownloadUrl(track, quality);
        if (url) {
            openInNewTab(url);
            return true;
        }
        return false;
    }

    function downloadAlbumInNewTab() {
        openInNewTab(albumDownloadUrl);
        return true;
    }

    function createDownloadLink(url, fileName) {
        var link = document.createElement('a');
        link.href = url;
        if (fileName) {
            link.download = fileName;
        } else {
            link.download = '';
        }
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        return link;
    }

    function triggerDownload(url, fileName) {
        var link = createDownloadLink(url, fileName);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(function() {
            document.body.removeChild(link);
        }, 100);
    }

    function isDownloading() {
        return Object.keys(activeDownloads).length > 0;
    }

    function getDownloadById(downloadId) {
        if (activeDownloads[downloadId]) {
            return activeDownloads[downloadId];
        }
        return null;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) {
            return '0 Bytes';
        }

        var k = 1024;
        var sizes = ['Bytes', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function estimateDownloadTime(bytes, bytesPerSecond) {
        if (!bytesPerSecond || bytesPerSecond <= 0) {
            return 'Unbekannt';
        }

        var seconds = bytes / bytesPerSecond;

        if (seconds < 60) {
            return Math.round(seconds) + ' Sek.';
        } else if (seconds < 3600) {
            return Math.round(seconds / 60) + ' Min.';
        } else {
            return Math.round(seconds / 3600) + ' Std.';
        }
    }

    function getVideoFileName(track, quality) {
        if (!track) {
            return null;
        }
        return generateVideoFileName(track, quality);
    }

    function getQualityLabel(quality) {
        var qualityLabels = {
            low: 'LOW',
            mid: 'MID',
            high: 'HQ'
        };

        var label = qualityLabels[quality];
        if (!label) {
            label = 'MID';
        }

        return label;
    }

    return {
        downloadAlbum: downloadAlbum,
        downloadAllVideos: downloadAllVideos,
        downloadVideo: downloadVideo,
        downloadFile: downloadFile,
        cancelDownload: cancelDownload,
        cancelAllDownloads: cancelAllDownloads,
        getActiveDownloads: getActiveDownloads,
        getDownloadHistory: getDownloadHistory,
        clearDownloadHistory: clearDownloadHistory,
        getQueueLength: getQueueLength,
        getActiveCount: getActiveCount,
        setMaxConcurrentDownloads: setMaxConcurrentDownloads,
        onProgress: onProgress,
        onComplete: onComplete,
        onError: onError,
        getVideoDownloadUrl: getVideoDownloadUrl,
        getAlbumDownloadUrl: getAlbumDownloadUrl,
        getAllVideosZipUrl: getAllVideosZipUrl,
        downloadVideoInNewTab: downloadVideoInNewTab,
        downloadAlbumInNewTab: downloadAlbumInNewTab,
        triggerDownload: triggerDownload,
        isDownloading: isDownloading,
        getDownloadById: getDownloadById,
        formatFileSize: formatFileSize,
        estimateDownloadTime: estimateDownloadTime,
        getVideoFileName: getVideoFileName,
        getQualityLabel: getQualityLabel
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DownloadManager;
}