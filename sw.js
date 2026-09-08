const CACHE_NAME = 'sodam-cafe-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/cafe.js',
  './js/work.js',
  './js/restaurants.js',
  './js/diet.js'
];

// 1. 설치 시 핵심 정적 자원 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. 구버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. 네트워크 우선 (실시간 시트 및 텔레그램), 실패 시 캐시 반환
self.addEventListener('fetch', (event) => {
  // Google 스프레드시트 API나 텔레그램 API는 항상 네트워크 직접 호출
  if (event.request.url.includes('google') || event.request.url.includes('telegram')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 네트워크 응답 성공 시 캐시에 복사본 갱신
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, resClone);
        });
        return response;
      })
      .catch(() => {
        // 오프라인이거나 사내망 단절 시 캐시된 파일 제공
        return caches.match(event.request);
      })
  );
});