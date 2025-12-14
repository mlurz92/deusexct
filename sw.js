const CACHE_NAME = 'deus-ex-ct-v1';
const RUNTIME_CACHE = 'deus-ex-ct-runtime';
const IMAGE_CACHE = 'deus-ex-ct-images';
const MEDIA_CACHE = 'deus-ex-ct-media';

const CACHE_VERSION = 1;
const MAX_CACHE_SIZE = 50;
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

const staticAssets = [
    './',
    './index.html',
    './manifest.json',
    './css/styles.css',
    './js/app.js',
    './js/player.js',
    './js/lyrics.js',
    './js/router.js',
    './assets/images/00-Albumcover.png'
];

const offlineFallback = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - Deus ex CT</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
        }
        .offline-container {
            padding: 2rem;
        }
        h1 {
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        p {
            color: #a0a0a0;
            margin-bottom: 2rem;
        }
        button {
            background: #ff3333;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <h1>Offline</h1>
        <p>Keine Internetverbindung verfügbar</p>
        <button onclick="location.reload()">Erneut versuchen</button>
    </div>
</body>
</html>
`;

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(staticAssets)
                    .catch(error => {
                        console.error('Failed to cache static assets:', error);
                        return Promise.resolve();
                    });
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            clearOldCaches(),
            self.clients.claim()
        ])
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    if (request.method !== 'GET') {
        return;
    }
    
    if (url.origin !== location.origin) {
        return;
    }
    
    if (request.url.includes('/assets/audio/') || request.url.includes('/assets/video/')) {
        event.respondWith(handleMediaRequest(request));
    } else if (request.url.includes('/assets/images/')) {
        event.respondWith(handleImageRequest(request));
    } else if (request.url.includes('/assets/lyrics/')) {
        event.respondWith(handleLyricsRequest(request));
    } else if (request.destination === 'document') {
        event.respondWith(handleNavigationRequest(request));
    } else {
        event.respondWith(handleStaticRequest(request));
    }
});

self.addEventListener('message', event => {
    const { type, payload } = event.data || {};
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
        case 'CACHE_SIZE':
            getCacheSize().then(size => {
                event.ports[0].postMessage({ size });
            });
            break;
        case 'PRELOAD_TRACK':
            if (payload && payload.trackId) {
                preloadTrackAssets(payload.trackId);
            }
            break;
    }
});

function handleNavigationRequest(request) {
    return caches.match(request)
        .then(response => {
            if (response) {
                return fetchAndCache(request, CACHE_NAME)
                    .catch(() => response);
            }
            
            return fetchAndCache(request, CACHE_NAME)
                .catch(() => {
                    return caches.match('./index.html')
                        .then(fallback => fallback || createOfflineFallback());
                });
        });
}

function handleStaticRequest(request) {
    return caches.match(request)
        .then(response => {
            if (response) {
                return response;
            }
            
            return fetchAndCache(request, RUNTIME_CACHE);
        });
}

function handleImageRequest(request) {
    return caches.open(IMAGE_CACHE)
        .then(cache => cache.match(request))
        .then(response => {
            if (response) {
                return response;
            }
            
            return fetch(request)
                .then(response => {
                    if (response.ok) {
                        return caches.open(IMAGE_CACHE)
                            .then(cache => {
                                cache.put(request, response.clone());
                                return response;
                            });
                    }
                    return response;
                })
                .catch(() => {
                    if (request.url.includes('Albumcover')) {
                        return createPlaceholderImage();
                    }
                    throw new Error('Image fetch failed');
                });
        });
}

function handleMediaRequest(request) {
    return fetch(request)
        .then(response => {
            if (response.ok && response.status === 200) {
                const contentLength = response.headers.get('content-length');
                
                if (contentLength && parseInt(contentLength) < 50 * 1024 * 1024) {
                    return caches.open(MEDIA_CACHE)
                        .then(cache => {
                            cache.put(request, response.clone());
                            return response;
                        });
                }
            }
            return response;
        })
        .catch(() => {
            return caches.match(request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    throw new Error('Media not available offline');
                });
        });
}

function handleLyricsRequest(request) {
    return caches.match(request)
        .then(response => {
            if (response) {
                fetchAndCache(request, RUNTIME_CACHE).catch(() => {});
                return response;
            }
            
            return fetchAndCache(request, RUNTIME_CACHE);
        });
}

function fetchAndCache(request, cacheName) {
    return fetch(request)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            return caches.open(cacheName)
                .then(cache => {
                    cache.put(request, response.clone());
                    return response;
                });
        });
}

function clearOldCaches() {
    return caches.keys()
        .then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => {
                        return cacheName.startsWith('deus-ex-ct-') && 
                               cacheName !== CACHE_NAME &&
                               cacheName !== RUNTIME_CACHE &&
                               cacheName !== IMAGE_CACHE &&
                               cacheName !== MEDIA_CACHE;
                    })
                    .map(cacheName => caches.delete(cacheName))
            );
        });
}

function clearAllCaches() {
    return caches.keys()
        .then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => cacheName.startsWith('deus-ex-ct-'))
                    .map(cacheName => caches.delete(cacheName))
            );
        });
}

function getCacheSize() {
    let totalSize = 0;
    
    return caches.keys()
        .then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => cacheName.startsWith('deus-ex-ct-'))
                    .map(cacheName => {
                        return caches.open(cacheName)
                            .then(cache => cache.keys())
                            .then(keys => {
                                return Promise.all(
                                    keys.map(request => {
                                        return caches.match(request)
                                            .then(response => {
                                                if (response && response.headers.get('content-length')) {
                                                    totalSize += parseInt(response.headers.get('content-length'));
                                                }
                                            });
                                    })
                                );
                            });
                    })
            );
        })
        .then(() => totalSize);
}

function createOfflineFallback() {
    return new Response(offlineFallback, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    });
}

function createPlaceholderImage() {
    const svg = `
        <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" fill="#1a1a1a"/>
            <text x="50%" y="50%" text-anchor="middle" fill="#606060" font-family="sans-serif" font-size="24">
                Bild nicht verfügbar
            </text>
        </svg>
    `;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml'
        }
    });
}

function preloadTrackAssets(trackId) {
    const paddedId = trackId.toString().padStart(2, '0');
    const assets = [
        `./assets/images/${paddedId}-*.png`,
        `./assets/lyrics/${paddedId}-*.lrc`,
        `./assets/audio/${paddedId}-*.mp3`,
        `./assets/video/${paddedId}-*_Lyrics.mp4`
    ];
    
    Promise.all(
        assets.map(assetPattern => {
            return fetch(assetPattern)
                .then(response => {
                    if (response.ok) {
                        const cacheName = assetPattern.includes('audio') || assetPattern.includes('video') 
                            ? MEDIA_CACHE 
                            : assetPattern.includes('images') 
                                ? IMAGE_CACHE 
                                : RUNTIME_CACHE;
                        
                        return caches.open(cacheName)
                            .then(cache => cache.put(assetPattern, response));
                    }
                })
                .catch(() => {});
        })
    );
}

self.addEventListener('sync', event => {
    if (event.tag === 'sync-cache') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then(cache => {
                    return cache.addAll(staticAssets)
                        .catch(error => {
                            console.error('Sync failed:', error);
                        });
                })
        );
    }
});

self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-cache') {
        event.waitUntil(updateCache());
    }
});

function updateCache() {
    return caches.open(CACHE_NAME)
        .then(cache => {
            return Promise.all(
                staticAssets.map(asset => {
                    return fetch(asset)
                        .then(response => {
                            if (response.ok) {
                                return cache.put(asset, response);
                            }
                        })
                        .catch(() => {});
                })
            );
        });
}