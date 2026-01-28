import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Icons from '../ui/Icons'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useI18n } from '../../lib/i18n'

// Notification type icons and colors
const NOTIFICATION_CONFIG = {
  task_reminder: { icon: Icons.clock, color: 'text-yellow-500', bg: 'bg-yellow-100' },
  task_assigned: { icon: Icons.tasks, color: 'text-blue-500', bg: 'bg-blue-100' },
  task_completed: { icon: Icons.check, color: 'text-green-500', bg: 'bg-green-100' },
  new_contact: { icon: Icons.contacts, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  contact_assigned: { icon: Icons.user, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  deal_won: { icon: Icons.trending, color: 'text-green-500', bg: 'bg-green-100' },
  deal_lost: { icon: Icons.close, color: 'text-red-500', bg: 'bg-red-100' },
  deal_stage_changed: { icon: Icons.deals, color: 'text-purple-500', bg: 'bg-purple-100' },
  deal_assigned: { icon: Icons.deals, color: 'text-purple-500', bg: 'bg-purple-100' },
  mention: { icon: Icons.mail, color: 'text-blue-500', bg: 'bg-blue-100' },
  system: { icon: Icons.alert, color: 'text-gray-500', bg: 'bg-gray-100' },
}

export default function NotificationBell() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.data || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }, [])

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications()
    
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mark notification as read
  const markAsRead = async (id) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date() } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
    setIsLoading(false)
  }

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
      setIsOpen(false)
    }
  }

  // Format time ago
  const formatTimeAgo = (date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: locale === 'es' ? es : undefined,
      })
    } catch {
      return ''
    }
  }

  // Get notification icon config
  const getConfig = (type) => {
    return NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.system
  }

  // Toggle dropdown and refresh notifications when opening
  const toggleDropdown = () => {
    const newIsOpen = !isOpen
    setIsOpen(newIsOpen)
    if (newIsOpen) {
      fetchNotifications() // Refresh when opening
    }
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

      {/* Dropdown - full screen on mobile, positioned dropdown on desktop */}
      {isOpen && (
        <>
          {/* Mobile overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          <div
            ref={dropdownRef}
            className="fixed inset-x-0 bottom-0 z-50 lg:absolute lg:bottom-full lg:left-0 lg:right-auto lg:inset-x-auto lg:mb-2 w-full lg:w-96 bg-white rounded-t-2xl lg:rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-[85vh] lg:max-h-[500px] flex flex-col animate-slide-up lg:animate-none"
          >
          {/* Drag handle for mobile */}
          <div className="lg:hidden flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold text-gray-900">
              {t('notifications.title') || 'Notificaciones'}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={isLoading}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                >
                  <span className="hidden sm:inline">{t('notifications.markAllRead') || 'Marcar todas como leídas'}</span>
                  <span className="sm:hidden">Marcar leídas</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
              >
                <Icons.close className="w-5 h-5" />
              </button>
            </div>
          </div>

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
                        className={`w-full px-4 py-3 flex gap-3 text-left hover:bg-gray-50 transition-colors ${
                          !notification.isRead ? 'bg-primary-50/50' : ''
                        }`}
                      >
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}>
                          <IconComponent className={`w-5 h-5 ${config.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-sm text-gray-500 truncate mt-0.5">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>

                        {/* Unread indicator */}
                        {!notification.isRead && (
                          <div className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-2" />
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
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex-shrink-0 safe-area-inset-bottom">
              <button
                onClick={() => {
                  router.push('/notifications')
                  setIsOpen(false)
                }}
                className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2"
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
