// Service Worker 脚本: sw.js
// 缓存策略: Cache-First (缓存优先)

// 1. 定义缓存名称和版本
// 每次更新网站内容时，请更改版本号 (v1 -> v2, v3, etc.)
const CACHE_NAME = 'verse-gemini-pwa-cache-v2';

// 2. 列出需要离线缓存的所有核心文件 (App Shell)
const urlsToCache = [
  '/', // 根路径（对应 index.html）
  '/index.html',
  '/manifest.json', // PWA 清单文件
  '/icon-192.png',  // PWA 图标文件
  // 由于您的所有 JS 和 CSS 都已内嵌，无需缓存其他文件
];

// 3. 监听 install 事件（Service Worker 首次安装）
self.addEventListener('install', event => {
  // 强制立即激活新的 Service Worker，跳过等待
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching PWA assets...');
        // 将所有关键文件添加到缓存
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Installation failed during caching:', error);
      })
  );
});

// 4. 监听 activate 事件（Service Worker 激活，用于清理旧缓存）
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 删除旧版本的缓存
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 立即获取控制权
  return self.clients.claim();
});

// 5. 监听 fetch 事件（处理所有网络请求）
self.addEventListener('fetch', event => {
  // 仅处理 GET 请求
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    // 尝试从缓存中匹配请求 (Cache-First 策略)
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }
        
        // 缓存中没有，再尝试进行网络请求
        return fetch(event.request)
          .then(networkResponse => {
             // 检查响应有效性
             if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                 return networkResponse;
             }
             
             // 克隆响应并放入缓存
             const responseToCache = networkResponse.clone();
             
             caches.open(CACHE_NAME)
                .then(cache => {
                    cache.put(event.request, responseToCache);
                });
                
             return networkResponse;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed and no cache available:', error);
            // 这里可以添加一个离线页面的 Fallback，但由于 index.html 缓存，一般不需要
          });
      })
  );
});
