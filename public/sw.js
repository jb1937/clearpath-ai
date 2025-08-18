/**
 * Service Worker for ClearPathAI
 * Provides offline support, caching, and additional security layers
 */

const CACHE_NAME = 'clearpath-ai-v1.0.0'
const STATIC_CACHE = 'clearpath-static-v1'
const DYNAMIC_CACHE = 'clearpath-dynamic-v1'

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  // Add other static assets as needed
]

// Security headers to add to responses
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log('Service Worker: Static files cached')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static files', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker: Activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  event.respondWith(
    handleFetchRequest(request)
  )
})

/**
 * Handle fetch requests with appropriate caching strategy
 */
async function handleFetchRequest(request) {
  const url = new URL(request.url)
  
  try {
    // Strategy 1: Static files - Cache First
    if (isStaticFile(url)) {
      return await cacheFirst(request, STATIC_CACHE)
    }
    
    // Strategy 2: API calls - Network First with fallback
    if (isApiCall(url)) {
      return await networkFirstWithFallback(request)
    }
    
    // Strategy 3: Dynamic content - Stale While Revalidate
    return await staleWhileRevalidate(request, DYNAMIC_CACHE)
    
  } catch (error) {
    console.error('Service Worker: Fetch error', error)
    return await getOfflineFallback(request)
  }
}

/**
 * Cache First strategy - for static files
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return addSecurityHeaders(cachedResponse)
  }
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return addSecurityHeaders(networkResponse)
  } catch (error) {
    console.error('Service Worker: Network error for static file', error)
    throw error
  }
}

/**
 * Network First strategy - for API calls
 */
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request)
    
    // Cache successful API responses for offline fallback
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for API call')
    
    const cache = await caches.open(DYNAMIC_CACHE)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline API response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This feature requires an internet connection'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
          ...SECURITY_HEADERS
        }
      }
    )
  }
}

/**
 * Stale While Revalidate strategy - for dynamic content
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    })
    .catch((error) => {
      console.error('Service Worker: Background fetch failed', error)
    })
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return addSecurityHeaders(cachedResponse)
  }
  
  // Otherwise wait for network
  const networkResponse = await fetchPromise
  return addSecurityHeaders(networkResponse)
}

/**
 * Get offline fallback response
 */
async function getOfflineFallback(request) {
  const url = new URL(request.url)
  
  // For HTML requests, return offline page
  if (request.headers.get('Accept')?.includes('text/html')) {
    return new Response(
      getOfflineHTML(),
      {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'text/html',
          ...SECURITY_HEADERS
        }
      }
    )
  }
  
  // For other requests, return appropriate offline response
  return new Response(
    'Offline',
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: SECURITY_HEADERS
    }
  )
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response) {
  const newHeaders = new Headers(response.headers)
  
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    if (!newHeaders.has(key)) {
      newHeaders.set(key, value)
    }
  })
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  })
}

/**
 * Check if URL is for a static file
 */
function isStaticFile(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2']
  return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
         STATIC_FILES.includes(url.pathname)
}

/**
 * Check if URL is for an API call
 */
function isApiCall(url) {
  return url.pathname.startsWith('/api/') ||
         url.hostname !== self.location.hostname
}

/**
 * Generate offline HTML page
 */
function getOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ClearPath AI - Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .container {
          text-align: center;
          max-width: 500px;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 {
          margin: 0 0 1rem 0;
          font-size: 2rem;
          font-weight: 600;
        }
        p {
          margin: 0 0 2rem 0;
          font-size: 1.1rem;
          opacity: 0.9;
          line-height: 1.6;
        }
        .retry-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 12px 24px;
          border-radius: 50px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .retry-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
        .features {
          margin-top: 2rem;
          text-align: left;
        }
        .feature {
          margin: 0.5rem 0;
          opacity: 0.8;
        }
        .feature::before {
          content: "✓ ";
          color: #4ade80;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📱</div>
        <h1>You're Offline</h1>
        <p>
          ClearPath AI is currently offline. Some features may not be available, 
          but you can still access previously loaded content.
        </p>
        
        <button class="retry-btn" onclick="window.location.reload()">
          Try Again
        </button>
        
        <div class="features">
          <div class="feature">Cached content available</div>
          <div class="feature">Data saved locally</div>
          <div class="feature">Automatic sync when online</div>
        </div>
      </div>
      
      <script>
        // Auto-retry when online
        window.addEventListener('online', () => {
          window.location.reload()
        })
        
        // Show online/offline status
        function updateStatus() {
          if (navigator.onLine) {
            window.location.reload()
          }
        }
        
        window.addEventListener('online', updateStatus)
        window.addEventListener('offline', updateStatus)
      </script>
    </body>
    </html>
  `
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then((status) => {
        event.ports[0].postMessage({ type: 'CACHE_STATUS', payload: status })
      })
      break
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' })
      })
      break
      
    case 'SECURITY_EVENT':
      handleSecurityEvent(payload)
      break
      
    default:
      console.log('Service Worker: Unknown message type', type)
  }
})

/**
 * Get cache status information
 */
async function getCacheStatus() {
  const cacheNames = await caches.keys()
  const status = {}
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    status[cacheName] = {
      size: keys.length,
      urls: keys.map(request => request.url)
    }
  }
  
  return status
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  )
}

/**
 * Handle security events from main thread
 */
function handleSecurityEvent(event) {
  console.log('Service Worker: Security event received', event)
  
  // Could implement additional security measures here
  // such as blocking suspicious requests, logging security events, etc.
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

/**
 * Perform background sync operations
 */
async function doBackgroundSync() {
  try {
    // Sync any pending data when back online
    console.log('Service Worker: Performing background sync')
    
    // This could include:
    // - Sending cached form data
    // - Updating cached content
    // - Syncing user preferences
    
  } catch (error) {
    console.error('Service Worker: Background sync failed', error)
  }
}

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  if (!event.data) return
  
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: data.data,
    actions: data.actions || []
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  )
})

console.log('Service Worker: Loaded and ready')
