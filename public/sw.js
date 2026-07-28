/* public/sw.js — Hittek CRM Service Worker */

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim())
})

/* ── Push handler ──────────────────────────────────────────────────────────── */
self.addEventListener('push', (e) => {
  if (!e.data) return

  let payload = {}
  try { payload = e.data.json() } catch (_) { payload = { title: e.data.text() } }

  const title   = payload.title  || 'Hittek CRM'
  const options = {
    body:    payload.body   || '',
    icon:    payload.icon   || '/favicon.ico',
    badge:   payload.badge  || '/favicon.ico',
    tag:     payload.tag    || 'crm-push',
    data:    { url: payload.url || '/' },
    renotify: true,
    vibrate: [200, 100, 200],
  }

  e.waitUntil(self.registration.showNotification(title, options))
})

/* ── Click handler ─────────────────────────────────────────────────────────── */
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url || '/'

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab on the same origin if open
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          client.focus()
          if (url !== '/') client.navigate(url)
          return
        }
      }
      // Otherwise open a new tab
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
