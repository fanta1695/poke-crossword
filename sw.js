const CACHE_NAME = 'pokemon-crossword-v2';
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
  // （もし 512x512 などの他のアイコンもあればここに追加）
  
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
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// オフラインの時はキャッシュからファイルを返す
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});