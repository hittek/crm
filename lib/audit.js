import prisma from './prisma'

/**
 * Log an action to the audit trail
 * @param {Object} params - Audit log parameters
 * @param {string} params.action - Action type: created, updated, deleted, completed, stage_changed, assigned, login, etc.
 * @param {string} params.entity - Entity type: contact, deal, task, user, settings
 * @param {number} [params.entityId] - ID of the affected entity
 * @param {string} [params.entityName] - Human-readable name of the entity
 * @param {Object} [params.details] - Additional details (old/new values)
 * @param {number} [params.userId] - User ID who performed the action
 * @param {string} [params.userName] - User name for display
 * @param {number} [params.organizationId] - Organization ID for multi-tenancy
 * @param {Object} [params.req] - Request object to extract IP and user agent
 */
export async function logAudit({
  action,
  entity,
  entityId,
  entityName,
  details,
  userId,
  userName,
  organizationId,
  req,
}) {
  try {
    const data = {
      action,
      entity,
      entityId,
      entityName,
      details: details ? JSON.stringify(details) : null,
      userId,
      userName,
      organizationId,
      ipAddress: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || null,
      userAgent: req?.headers?.['user-agent'] || null,
    }

    await prisma.auditLog.create({ data })
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Error logging audit:', error)
  }
}

/**
 * Action types for consistency
 */
export const AuditActions = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  COMPLETED: 'completed',
  STAGE_CHANGED: 'stage_changed',
  ASSIGNED: 'assigned',
  STATUS_CHANGED: 'status_changed',
  LOGIN: 'login',
  LOGOUT: 'logout',
  SETTINGS_CHANGED: 'settings_changed',
}

/**
 * Entity types for consistency
 */
export const AuditEntities = {
  CONTACT: 'contact',
  DEAL: 'deal',
  TASK: 'task',
  USER: 'user',
  SETTINGS: 'settings',
  ACTIVITY: 'activity',
}

export default { logAudit, AuditActions, AuditEntities }
