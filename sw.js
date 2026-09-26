var CACHE_NAME = "lost-in-space-v1";
var ASSETS = [
    "./",
    "./index.html",
    "./game.html",
    "./manifest.json",
    "./js/libs/easeljs-1.0.0.min.js",
    "./js/game/levels.js",
    "./js/game/physics.js",
    "./js/game/vector.js",
    "./js/game/preparation.js",
    "./js/game/boot.js",
    "./img/icon.svg",
    "./img/icon-192.png",
    "./img/icon-512.png"
];

self.addEventListener("install", function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener("activate", function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(key) { return key !== CACHE_NAME; })
                    .map(function(key) { return caches.delete(key); })
            );
        })
    );
});

self.addEventListener("fetch", function(event) {
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            return cached || fetch(event.request);
        })
    );
});
