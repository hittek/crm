import prisma from './prisma'

/**
 * Notification types
 */
export const NotificationType = {
  TASK_REMINDER: 'task_reminder',
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  NEW_CONTACT: 'new_contact',
  CONTACT_ASSIGNED: 'contact_assigned',
  DEAL_WON: 'deal_won',
  DEAL_LOST: 'deal_lost',
  DEAL_STAGE_CHANGED: 'deal_stage_changed',
  DEAL_ASSIGNED: 'deal_assigned',
  MENTION: 'mention',
  SYSTEM: 'system',
}

/**
 * Base notification provider interface
 * Extend this class to add external notification providers (email, push, SMS, etc.)
 */
class NotificationProvider {
  constructor(name) {
    this.name = name
  }

  /**
   * Send a notification
   * @param {Object} notification - The notification object
   * @param {Object} user - The user to notify
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  async send(notification, user) {
    throw new Error('send() must be implemented by provider')
  }

  /**
   * Check if this provider is enabled for the given notification type
   * @param {string} type - Notification type
   * @param {Object} settings - User/org notification settings
   * @returns {boolean}
   */
  isEnabled(type, settings) {
    return true
  }
}

/**
 * In-app notification provider - stores notifications in database
 */
class InAppProvider extends NotificationProvider {
  constructor() {
    super('in-app')
  }

  async send(notification, user) {
    try {
      await prisma.notification.create({
        data: {
          type: notification.type,
          title: notification.title,
          message: notification.message || null,
          link: notification.link || null,
          metadata: notification.metadata ? JSON.stringify(notification.metadata) : null,
          userId: user.id,
          organizationId: user.organizationId,
        },
      })
      return true
    } catch (error) {
      console.error('[InAppProvider] Error sending notification:', error)
      return false
    }
  }
}

/**
 * Email notification provider placeholder
 * Extend this to integrate with email services (Resend, SendGrid, etc.)
 */
class EmailProvider extends NotificationProvider {
  constructor(config = {}) {
    super('email')
    this.config = config
    // TODO: Initialize email service client here
    // this.client = new EmailServiceClient(config)
  }

  isEnabled(type, settings) {
    // Check if email notifications are enabled in settings
    if (!settings?.notifications?.emailEnabled) return false
    
    // Map notification types to settings
    const settingsMap = {
      [NotificationType.TASK_REMINDER]: settings?.notifications?.taskReminders,
      [NotificationType.NEW_CONTACT]: settings?.notifications?.newContacts,
      [NotificationType.DEAL_WON]: settings?.notifications?.dealWon,
    }
    
    return settingsMap[type] ?? false
  }

  async send(notification, user) {
    // TODO: Implement email sending
    // Example with Resend:
    // await this.client.send({
    //   to: user.email,
    //   subject: notification.title,
    //   html: renderEmailTemplate(notification),
    // })
    console.log('[EmailProvider] Email would be sent to:', user.email, notification.title)
    return true
  }
}

/**
 * NotificationService - main service for sending notifications
 * Supports multiple providers and respects user/org settings
 */
class NotificationService {
  constructor() {
    this.providers = []
    // Always add in-app provider
    this.addProvider(new InAppProvider())
  }

  /**
   * Add a notification provider
   * @param {NotificationProvider} provider
   */
  addProvider(provider) {
    this.providers.push(provider)
  }

  /**
   * Get organization notification settings
   */
  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      })
      if (user?.preferences) {
        return JSON.parse(user.preferences)
      }
    } catch (error) {
      console.error('[NotificationService] Error getting user preferences:', error)
    }
    return {}
  }

  /**
   * Check if notification type is enabled in user preferences
   */
  isNotificationEnabled(type, userPreferences) {
    const notifications = userPreferences?.notifications || {}
    
    // Check if specific notification type is explicitly disabled
    // Default is enabled (true) unless user explicitly disabled it
    const settingsMap = {
      [NotificationType.TASK_REMINDER]: notifications.taskReminders !== false,
      [NotificationType.TASK_ASSIGNED]: notifications.taskAssigned !== false,
      [NotificationType.TASK_COMPLETED]: notifications.taskCompleted !== false,
      [NotificationType.NEW_CONTACT]: notifications.newContacts !== false,
      [NotificationType.CONTACT_ASSIGNED]: notifications.contactAssigned !== false,
      [NotificationType.DEAL_WON]: notifications.dealUpdates !== false,
      [NotificationType.DEAL_LOST]: notifications.dealUpdates !== false,
      [NotificationType.DEAL_STAGE_CHANGED]: notifications.dealUpdates !== false,
      [NotificationType.DEAL_ASSIGNED]: notifications.dealAssigned !== false,
      [NotificationType.MENTION]: notifications.mentions !== false,
      [NotificationType.SYSTEM]: notifications.system !== false,
    }
    
    // Default to enabled for types not in the map
    return settingsMap[type] ?? true
  }

  /**
   * Send a notification to a user
   * @param {Object} options - Notification options
   * @param {string} options.type - Notification type (from NotificationType)
   * @param {string} options.title - Notification title
   * @param {string} options.message - Notification message (optional)
   * @param {string} options.link - URL to navigate when clicked (optional)
   * @param {Object} options.metadata - Additional data (optional)
   * @param {number} options.userId - User ID to notify
   * @param {number} options.organizationId - Organization ID
   */
  async notify(options) {
    const { type, title, message, link, metadata, userId, organizationId } = options

    console.log('[NotificationService] notify called for user:', userId, 'type:', type)

    // Get user info and preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, organizationId: true, preferences: true },
    })

    if (!user) {
      console.log('[NotificationService] User not found:', userId)
      return { sent: false, reason: 'user_not_found' }
    }

    // Parse user preferences
    const userPreferences = user.preferences ? JSON.parse(user.preferences) : {}
    
    // Check if this notification type is enabled for this user
    if (!this.isNotificationEnabled(type, userPreferences)) {
      console.log('[NotificationService] Notification disabled for user:', userId, 'type:', type)
      return { sent: false, reason: 'disabled_by_user' }
    }

    const notification = { type, title, message, link, metadata }
    const results = []

    // Send through all enabled providers
    console.log('[NotificationService] Sending via providers:', this.providers.map(p => p.name))
    for (const provider of this.providers) {
      if (provider.isEnabled(type, userPreferences)) {
        const success = await provider.send(notification, user)
        console.log('[NotificationService] Provider', provider.name, 'result:', success)
        results.push({ provider: provider.name, success })
      }
    }

    return { sent: true, results }
  }

  /**
   * Send notification to multiple users
   */
  async notifyMany(options) {
    const { userIds, ...notificationData } = options
    const results = []

    for (const userId of userIds) {
      const result = await this.notify({ ...notificationData, userId })
      results.push({ userId, ...result })
    }

    return results
  }

  /**
   * Send notification to all users in an organization
   * @param {Object} options - Notification options (without userId)
   * @param {Object} options.excludeUserId - User ID to exclude (e.g., the user who triggered the action)
   */
  async notifyOrg(options) {
    const { organizationId, excludeUserId, ...notificationData } = options

    console.log('[NotificationService] notifyOrg called:', { organizationId, excludeUserId, type: notificationData.type })

    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { id: true },
    })

    console.log('[NotificationService] Users to notify:', users.map(u => u.id))

    const userIds = users.map((u) => u.id)
    return this.notifyMany({ ...notificationData, userIds, organizationId })
  }

  /**
   * Send notification to admins in an organization
   */
  async notifyAdmins(options) {
    const { organizationId, ...notificationData } = options

    const admins = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { in: ['admin', 'manager'] },
      },
      select: { id: true },
    })

    const userIds = admins.map((u) => u.id)
    return this.notifyMany({ ...notificationData, userIds, organizationId })
  }
}

// Singleton instance
export const notificationService = new NotificationService()

// Helper functions for common notification scenarios
export const notifications = {
  /**
   * Notify when a new contact is created
   */
  async newContact(contact, createdByUserId, organizationId) {
    return notificationService.notifyOrg({
      type: NotificationType.NEW_CONTACT,
      title: 'Nuevo contacto agregado',
      message: `${contact.firstName} ${contact.lastName}${contact.company ? ` de ${contact.company}` : ''}`,
      link: `/?contact=${contact.id}`,
      metadata: { entityType: 'contact', entityId: contact.id },
      organizationId,
      excludeUserId: createdByUserId,
    })
  },

  /**
   * Notify when a contact is assigned
   */
  async contactAssigned(contact, assignedToUserId, assignedByUserId, organizationId) {
    return notificationService.notify({
      type: NotificationType.CONTACT_ASSIGNED,
      title: 'Contacto asignado',
      message: `Te han asignado el contacto ${contact.firstName} ${contact.lastName}`,
      link: `/?contact=${contact.id}`,
      metadata: { entityType: 'contact', entityId: contact.id },
      userId: assignedToUserId,
      organizationId,
    })
  },

  /**
   * Notify when a deal is won
   */
  async dealWon(deal, organizationId, wonByUserId) {
    return notificationService.notifyOrg({
      type: NotificationType.DEAL_WON,
      title: '¡Negocio ganado! 🎉',
      message: `${deal.title} por ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: deal.currency || 'MXN' }).format(deal.value)}`,
      link: `/deals?deal=${deal.id}`,
      metadata: { entityType: 'deal', entityId: deal.id, value: deal.value },
      organizationId,
      excludeUserId: wonByUserId,
    })
  },

  /**
   * Notify when a deal is lost
   */
  async dealLost(deal, organizationId, lostByUserId) {
    return notificationService.notifyOrg({
      type: NotificationType.DEAL_LOST,
      title: 'Negocio perdido',
      message: `${deal.title}${deal.lostReason ? `: ${deal.lostReason}` : ''}`,
      link: `/deals?deal=${deal.id}`,
      metadata: { entityType: 'deal', entityId: deal.id },
      organizationId,
      excludeUserId: lostByUserId,
    })
  },

  /**
   * Notify when a task is assigned
   */
  async taskAssigned(task, assignedToUserId, assignedByUserId, organizationId) {
    return notificationService.notify({
      type: NotificationType.TASK_ASSIGNED,
      title: 'Nueva tarea asignada',
      message: task.title,
      link: `/tasks?task=${task.id}`,
      metadata: { entityType: 'task', entityId: task.id },
      userId: assignedToUserId,
      organizationId,
    })
  },

  /**
   * Notify task reminder (for due tasks)
   */
  async taskReminder(task, userId, organizationId) {
    return notificationService.notify({
      type: NotificationType.TASK_REMINDER,
      title: 'Recordatorio de tarea',
      message: `${task.title} vence pronto`,
      link: `/tasks?task=${task.id}`,
      metadata: { entityType: 'task', entityId: task.id },
      userId,
      organizationId,
    })
  },
}

export default notificationService
