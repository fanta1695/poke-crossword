const CACHE_NAME = 'pokemon-crossword-v6';
const urlsToCache = [
  './',                   // トップディレクトリ
  './index.html',
  './manifest.json',
  
  // JSファイル
  './js/pokemon_details.js',
  './js/pokemon_index.js',
  './js/generator.js',
  './js/globals.js',
  './js/utils.js',
  './js/game_ui.js',
  './js/main.js',
  
  // 画像ファイル（アイコン類）
  './img/favicon.png',
  './img/icon-192.png',
  './img/icon-512.png',
  
  // 音声ファイル
  './se/move.mp3',
  './se/input.mp3',
  './se/delete.mp3',
  './se/clear.mp3',
  './se/error.mp3',
  './se/button.mp3'
];

// インストール時にファイルをキャッシュする
self.addEventListener('install', event => {
    // 新しいバージョンが見つかったら、待機せずにすぐアクティブにする
    self.skipWaiting(); 
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// アクティブ時に古いキャッシュを削除し、すぐに制御を開始する
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // 現在のバージョン（v4）と異なる古いキャッシュがあったら削除する
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // 新しくなったキャッシュの制御を、現在開いているページへ即座に適用する
            return self.clients.claim();
        })
    );
});

// ネットワーク通信を優先し、オフライン（圏外）の時だけキャッシュを使う（Network First）
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});