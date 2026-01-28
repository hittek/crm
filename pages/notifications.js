import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Icons from '../components/ui/Icons'
import { Spinner } from '../components/ui/Spinner'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useI18n } from '../lib/i18n'

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

export default function NotificationsPage() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, unread
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 })

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: ((pagination.page - 1) * 50).toString(),
        ...(filter === 'unread' ? { unreadOnly: 'true' } : {}),
      })
      const res = await fetch(`/api/notifications?${params}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.data || [])
        setPagination(prev => ({
          ...prev,
          total: data.total || 0,
          pages: Math.ceil((data.total || 0) / 50),
        }))
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
    setIsLoading(false)
  }, [pagination.page, filter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Mark as read
  const markAsRead = async (id) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  // Delete notification
  const deleteNotification = async (id) => {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
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

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <>
      <Head>
        <title>Notificaciones | CRM</title>
      </Head>

      <div className="h-full overflow-auto">
        <div className="max-w-2xl py-4 lg:py-6 px-4 lg:px-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
              <p className="text-sm text-gray-500 mt-1">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="btn-ghost text-sm"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
          </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Sin leer
          </button>
        </div>

        {/* Notifications list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Icons.bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              {filter === 'unread' ? 'No tienes notificaciones sin leer' : 'No tienes notificaciones'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const config = getConfig(notification.type)
                const IconComponent = config.icon

                return (
                  <li key={notification.id} className="group">
                    <div
                      className={`flex gap-4 p-4 hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? 'bg-primary-50/30' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bg} flex items-center justify-center cursor-pointer`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <IconComponent className={`w-5 h-5 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <p className={`text-sm ${!notification.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            title="Marcar como leída"
                          >
                            <Icons.check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <Icons.delete className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Unread indicator */}
                      {!notification.isRead && (
                        <div className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-2" />
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page === 1}
              className="btn-ghost btn-sm disabled:opacity-50"
            >
              <Icons.chevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">
              Página {pagination.page} de {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="btn-ghost btn-sm disabled:opacity-50"
            >
              <Icons.chevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        </div>
      </div>
    </>
  )
}
