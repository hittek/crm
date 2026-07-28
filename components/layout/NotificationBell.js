import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Icons from '../ui/Icons'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useI18n } from '../../lib/i18n'

const NOTIFICATION_CONFIG = {
  task_reminder:     { icon: Icons.clock,    color: 'text-yellow-500', bg: 'bg-yellow-100' },
  task_assigned:     { icon: Icons.tasks,    color: 'text-blue-500',   bg: 'bg-blue-100' },
  task_completed:    { icon: Icons.check,    color: 'text-green-500',  bg: 'bg-green-100' },
  new_contact:       { icon: Icons.contacts, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  contact_assigned:  { icon: Icons.user,     color: 'text-indigo-500', bg: 'bg-indigo-100' },
  deal_won:          { icon: Icons.trending, color: 'text-green-500',  bg: 'bg-green-100' },
  deal_lost:         { icon: Icons.close,    color: 'text-red-500',    bg: 'bg-red-100' },
  deal_stage_changed:{ icon: Icons.deals,    color: 'text-purple-500', bg: 'bg-purple-100' },
  deal_assigned:     { icon: Icons.deals,    color: 'text-purple-500', bg: 'bg-purple-100' },
  chat_escalated:    { icon: Icons.alert,    color: 'text-red-500',    bg: 'bg-red-100' },
  mention:           { icon: Icons.mail,     color: 'text-blue-500',   bg: 'bg-blue-100' },
  system:            { icon: Icons.alert,    color: 'text-gray-500',   bg: 'bg-gray-100' },
}

// ── Push subscription helpers ─────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function registerPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  // Register SW (idempotent)
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  // Get VAPID public key
  const resp = await fetch('/api/notifications/vapid-public-key')
  if (!resp.ok) return null
  const { key } = await resp.json()

  // Subscribe
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  })

  // Save to server
  await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  })

  return sub
}

async function unregisterPush() {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!reg) return
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  // Remove from server first
  await fetch('/api/notifications/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {})
  await sub.unsubscribe()
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)
  const seenIdsRef = useRef(new Set())

  // Push state: 'default' | 'granted' | 'denied' | 'unsupported'
  const [pushState, setPushState] = useState('unsupported')
  const [pushLoading, setPushLoading] = useState(false)

  // Detect push support and current permission on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState('unsupported')
      return
    }
    const perm = Notification.permission
    if (perm === 'granted') {
      setPushState('granted')
      // Ensure SW is registered and subscription is saved (handles app reinstall)
      registerPush().catch(() => {})
    } else if (perm === 'denied') {
      setPushState('denied')
    } else {
      setPushState('default')
    }
  }, [])

  const handleEnablePush = async () => {
    setPushLoading(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        await registerPush()
        setPushState('granted')
      } else {
        setPushState(perm) // 'denied'
      }
    } catch (err) {
      console.error('[push] enable failed:', err)
    } finally {
      setPushLoading(false)
    }
  }

  const handleDisablePush = async () => {
    setPushLoading(true)
    try {
      await unregisterPush()
      setPushState('default')
    } catch (err) {
      console.error('[push] disable failed:', err)
    } finally {
      setPushLoading(false)
    }
  }

  // Fire an in-tab OS notification (fallback when SW push isn't available)
  function fireBrowserNotif(notif) {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    try {
      const n = new Notification(notif.title, {
        body:     notif.message || '',
        icon:     '/favicon.ico',
        tag:      `crm-notif-${notif.id}`,
        renotify: false,
      })
      if (notif.link) n.onclick = () => { window.focus(); router.push(notif.link); n.close() }
    } catch (_) {}
  }

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (res.ok) {
        const data = await res.json()
        const notifs = data.data || []
        // Fire browser notif for any new ones (in-tab fallback)
        notifs.filter(n => !seenIdsRef.current.has(n.id) && !n.isRead).forEach(fireBrowserNotif)
        notifs.forEach(n => seenIdsRef.current.add(n.id))
        setNotifications(notifs)
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchNotifications()
    let intervalId = null

    const pollCount = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const res = await fetch('/api/notifications/count')
        if (!res.ok) return
        const { unreadCount: newCount } = await res.json()
        setUnreadCount(prev => {
          if (newCount > prev) fetchNotifications()
          return newCount
        })
      } catch (_) {}
    }

    const startPolling = () => { if (!intervalId) intervalId = setInterval(pollCount, 60_000) }
    const stopPolling  = () => { if (intervalId) { clearInterval(intervalId); intervalId = null } }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') { fetchNotifications(); startPolling() }
      else stopPolling()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    startPolling()
    return () => { document.removeEventListener('visibilitychange', handleVisibility); stopPolling() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        buttonRef.current  && !buttonRef.current.contains(event.target)
      ) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = async (id) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date() } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date() })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
    setIsLoading(false)
  }

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) markAsRead(notification.id)
    if (notification.link) { router.push(notification.link); setIsOpen(false) }
  }

  const formatTimeAgo = (date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: locale === 'es' ? es : undefined,
      })
    } catch { return '' }
  }

  const getConfig = (type) => NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.system

  const toggleDropdown = () => {
    const next = !isOpen
    setIsOpen(next)
    if (next) fetchNotifications()
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={t('notifications.title') || 'Notificaciones'}
      >
        <Icons.bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-medium text-white bg-red-500 rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden" onClick={() => setIsOpen(false)} />

          <div
            ref={dropdownRef}
            className="fixed inset-x-0 bottom-0 z-50 lg:absolute lg:bottom-full lg:left-0 lg:right-auto lg:inset-x-auto lg:mb-2 w-full lg:w-96 bg-white rounded-t-2xl lg:rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-[85vh] lg:max-h-[520px] flex flex-col"
          >
            {/* Drag handle — mobile only */}
            <div className="lg:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-gray-900">{t('notifications.title') || 'Notificaciones'}</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={isLoading}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                  >
                    <span className="hidden sm:inline">{t('notifications.markAllRead') || 'Marcar todas como leídas'}</span>
                    <span className="sm:hidden">Marcar leídas</span>
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
                  <Icons.close className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Push permission banner */}
            {pushState === 'default' && (
              <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3 flex-shrink-0">
                <Icons.bell className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-indigo-900">Activa las notificaciones push</p>
                  <p className="text-xs text-indigo-600">Recibe alertas aunque tengas la app cerrada</p>
                </div>
                <button
                  onClick={handleEnablePush}
                  disabled={pushLoading}
                  className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {pushLoading ? '…' : 'Activar'}
                </button>
              </div>
            )}

            {pushState === 'granted' && (
              <div className="px-4 py-2 bg-green-50 border-b border-green-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-green-700 font-medium">Notificaciones push activas</span>
                </div>
                <button
                  onClick={handleDisablePush}
                  disabled={pushLoading}
                  className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  Desactivar
                </button>
              </div>
            )}

            {pushState === 'denied' && (
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex-shrink-0">
                <p className="text-xs text-amber-700">
                  Notificaciones bloqueadas. Habilítalas en la configuración del navegador.
                </p>
              </div>
            )}

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icons.bell className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">{t('notifications.empty') || 'No tienes notificaciones'}</p>
                  <p className="text-sm text-gray-400 mt-1">Te avisaremos cuando haya algo nuevo</p>
                </div>
              ) : (
                <ul>
                  {notifications.map((notification) => {
                    const config = getConfig(notification.type)
                    const IconComponent = config.icon
                    return (
                      <li key={notification.id}>
                        <button
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full px-4 py-3 flex gap-3 text-left hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-indigo-50/40' : ''}`}
                        >
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}>
                            <IconComponent className={`w-5 h-5 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            {notification.message && (
                              <p className="text-sm text-gray-500 truncate mt-0.5">{notification.message}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(notification.createdAt)}</p>
                          </div>
                          {!notification.isRead && (
                            <div className="flex-shrink-0 w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                <button
                  onClick={() => { router.push('/notifications'); setIsOpen(false) }}
                  className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium py-2"
                >
                  {t('notifications.viewAll') || 'Ver todas las notificaciones'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
