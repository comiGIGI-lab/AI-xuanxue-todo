// Service Worker (No Cache) - 由 setup_pwa.py 自动生成
// 仅用于满足 PWA 安装要求，不缓存任何资源

// 安装：立即激活
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// 激活：清理所有历史缓存，接管页面
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});
