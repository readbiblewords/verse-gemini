// Service Worker 脚本: sw.js
// 缓存策略: Cache-First (缓存优先)

// 1. 定义缓存名称和版本
// 每次更新网站内容（例如更新 VERSES 数组）时，请务必更改版本号 (v1 -> v2)
const CACHE_NAME = 'verse-gemini-cache-v1';

// 2. 列出需要离线缓存的所有核心文件
// 由于您的内容都嵌入在 index.html 中，我们只需要缓存这几个文件
const urlsToCache = [
  '/', // 网站根目录（对应 index.html）
  '/index.html',
  // 如果您有独立的 style.css 文件，也请添加进来，但根据您提供的代码，CSS 已内嵌
];

// 3. 监听 install 事件（Service Worker 首次安装）
self.addEventListener('install', event => {
  // 强制立即激活新的 Service Worker，跳过等待，以确保用户下次访问就能使用
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching App Shell: HTML and essential files.');
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
          // 删除旧版本的缓存，确保用户始终使用最新版本
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 激活后立即获取控制权，确保页面可以被 Service Worker 控制
  return self.clients.claim();
});

// 5. 监听 fetch 事件（处理所有网络请求）
self.addEventListener('fetch', event => {
  // 仅处理 GET 请求
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    // 尝试从缓存中匹配请求
    caches.match(event.request)
      .then(response => {
        // 策略: Cache-First (如果缓存中找到了，直接返回缓存中的内容)
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }
        
        // 缓存中没有，再尝试进行网络请求
        console.log('[Service Worker] Serving from network:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
             // 只有当网络请求成功时，才将新获取的内容放入缓存
             if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                 return networkResponse;
             }
             
             // 克隆响应，因为响应流只能被消费一次
             const responseToCache = networkResponse.clone();
             
             caches.open(CACHE_NAME)
                .then(cache => {
                    // 对于新获取的文件（例如 /index.html），更新缓存
                    cache.put(event.request, responseToCache);
                });
                
             return networkResponse;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed and no cache available:', error);
            // 最终的保障，如果缓存和网络都失败了，可以在这里返回一个离线错误页面
            // 但因为您的 index.html 已经缓存，这个错误很少发生
          });
      })
  );
});
