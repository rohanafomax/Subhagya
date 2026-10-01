// Service worker: lets the site be installed as a phone app and
// shows pages quickly. Always tries the network first so members
// see fresh data; falls back to the saved copy when offline.
const CACHE = 'saubhagya-v1';
const SHELL = [
    './', 'index.html', 'browse.html', 'profile.html', 'login.html', 'dashboard.html', 'my-profile.html',
    'pricing.html', 'privacy.html', 'terms.html', 'safety.html',
    'assets/css/style.css', 'assets/js/app.js', 'assets/js/config.js', 'assets/js/data.js',
    'assets/js/i18n.js', 'assets/js/image.js', 'images/bride.jpg', 'images/icon-192.png'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    // only handle our own files; Firebase and fonts go straight to the network
    if (e.request.method !== 'GET' || url.origin !== location.origin) return;
    e.respondWith(
        fetch(e.request)
            .then(res => {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, copy));
                return res;
            })
            .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
    );
});
