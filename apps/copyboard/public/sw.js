// public/sw.js (version 5.0)
// This service worker is designed for reliability and immediate activation.

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event fired. New worker installing.')
  // Force the waiting service worker to become the active service worker.
  event.waitUntil(self.skipWaiting())
  console.log('[Service Worker] skipWaiting() called.')
})

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event fired. New worker activating.')
  // Take control of all pages under this scope immediately.
  event.waitUntil(self.clients.claim())
  console.log('[Service Worker] clients.claim() called.')
})

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.')
  if (!event.data) {
    console.error('[Service Worker] Push event but no data')
    return
  }
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`)

  let data
  try {
    data = event.data.json()
  } catch (e) {
    console.error('[Service Worker] Failed to parse push data as JSON.')
    data = {
      title: 'New Update',
      body: event.data.text(),
      url: '/',
    }
  }

  const title = data.title || 'New Intelligence Alert'
  const options = {
    body: data.body || 'New content has been added.',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png', // A smaller badge icon for some platforms
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/', // Ensure URL is always present in data
    },
    actions: [
      { action: 'view_event', title: 'View Event' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  console.log(
    '[Service Worker] Showing notification with options:',
    JSON.stringify(options)
  )
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  console.log(
    '[Service Worker] Notification click Received.',
    event.action,
    event.notification
  )

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href
  event.notification.close()

  if (event.action === 'dismiss') {
    console.log('[Service Worker] Dismiss action handled.')
    return
  }

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            console.log('[Service Worker] Found matching client to focus.')
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          console.log('[Service Worker] No matching client found, opening new window.')
          return self.clients.openWindow(urlToOpen)
        }
      })
  )
})
