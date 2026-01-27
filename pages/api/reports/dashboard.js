import prisma from '../../../lib/prisma'
import { createHandler, success } from '../../../lib/api'
import { getSession } from '../../../lib/auth'

const methods = {
  GET: async (req, res) => {
    // Get organizationId from session
    const session = await getSession(req, res)
    const organizationId = session?.user?.organizationId
    
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())

    // Pipeline by stage - filtered by organization
    const pipelineByStage = await prisma.deal.groupBy({
      by: ['stage'],
      _count: true,
      _sum: { value: true },
      where: {
        organizationId,
        stage: { notIn: ['won', 'lost'] }
      }
    })

    // Deals won/lost this month - filtered by organization
    const [wonThisMonth, lostThisMonth, wonLastMonth] = await Promise.all([
      prisma.deal.aggregate({
        where: {
          organizationId,
          stage: 'won',
          actualClose: { gte: startOfMonth }
        },
        _count: true,
        _sum: { value: true }
      }),
      prisma.deal.aggregate({
        where: {
          organizationId,
          stage: 'lost',
          actualClose: { gte: startOfMonth }
        },
        _count: true,
      }),
      prisma.deal.aggregate({
        where: {
          organizationId,
          stage: 'won',
          actualClose: { gte: startOfLastMonth, lt: startOfMonth }
        },
        _count: true,
        _sum: { value: true }
      }),
    ])

    // Conversion rate
    const totalClosedThisMonth = (wonThisMonth._count || 0) + (lostThisMonth._count || 0)
    const conversionRate = totalClosedThisMonth > 0 
      ? Math.round((wonThisMonth._count / totalClosedThisMonth) * 100) 
      : 0

    // New contacts this week - filtered by organization
    const [contactsThisWeek, totalContacts] = await Promise.all([
      prisma.contact.count({
        where: { organizationId, createdAt: { gte: startOfWeek } }
      }),
      prisma.contact.count({ where: { organizationId } })
    ])

    // Tasks overview - filtered by organization
    const [pendingTasks, overdueTasks, completedThisWeek] = await Promise.all([
      prisma.task.count({
        where: { organizationId, status: { not: 'completed' } }
      }),
      prisma.task.count({
        where: {
          organizationId,
          status: { not: 'completed' },
          dueDate: { lt: now }
        }
      }),
      prisma.task.count({
        where: {
          organizationId,
          status: 'completed',
          completedAt: { gte: startOfWeek }
        }
      }),
    ])

    // Recent activities - filtered by organization
    const [recentActivities, recentAuditLogs] = await Promise.all([
      prisma.activity.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true }
          },
          deal: {
            select: { id: true, title: true }
          }
        }
      }),
      prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: {
            select: { id: true, name: true, avatar: true }
          }
        }
      })
    ])

    // Parse audit log details and format for display
    const formattedAuditLogs = recentAuditLogs.map(log => ({
      id: `audit_${log.id}`,
      type: log.action,
      entity: log.entity,
      entityId: log.entityId,
      subject: formatAuditSubject(log),
      content: log.entityName,
      details: log.details ? JSON.parse(log.details) : null,
      userName: log.userName || log.user?.name,
      userAvatar: log.user?.avatar,
      createdAt: log.createdAt,
      isAuditLog: true,
    }))

    // Combine and sort by date
    const allActivities = [
      ...recentActivities.map(a => ({ ...a, isAuditLog: false })),
      ...formattedAuditLogs,
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 15)

    // Pipeline total value
    const pipelineTotal = pipelineByStage.reduce((acc, stage) => acc + (stage._sum.value || 0), 0)

    success(res, {
      pipeline: {
        byStage: pipelineByStage,
        totalValue: pipelineTotal,
        totalDeals: pipelineByStage.reduce((acc, s) => acc + s._count, 0),
      },
      performance: {
        wonThisMonth: {
          count: wonThisMonth._count || 0,
          value: wonThisMonth._sum.value || 0,
        },
        wonLastMonth: {
          count: wonLastMonth._count || 0,
          value: wonLastMonth._sum.value || 0,
        },
        conversionRate,
      },
      contacts: {
        total: totalContacts,
        newThisWeek: contactsThisWeek,
      },
      tasks: {
        pending: pendingTasks,
        overdue: overdueTasks,
        completedThisWeek,
      },
      recentActivities: allActivities,
    })
  },
}

// Helper to format audit log subjects for display
function formatAuditSubject(log) {
  const actionLabels = {
    created: 'creó',
    updated: 'actualizó',
    deleted: 'eliminó',
    completed: 'completó',
    stage_changed: 'movió',
    assigned: 'asignó',
    status_changed: 'cambió estado de',
  }
  
  const entityLabels = {
    contact: 'contacto',
    deal: 'negocio',
    task: 'tarea',
    user: 'usuario',
    settings: 'configuración',
  }

  const action = actionLabels[log.action] || log.action
  const entity = entityLabels[log.entity] || log.entity
  
  if (log.action === 'stage_changed') {
    const details = log.details ? JSON.parse(log.details) : {}
    return `${log.entityName || entity} movido a ${details.newStage || 'nueva etapa'}`
  }
  
  return `${action} ${entity}: ${log.entityName || ''}`
}

export default createHandler(methods)
