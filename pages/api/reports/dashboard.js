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

    // ── Chatbot metrics ──────────────────────────────────────────────────────
    const [
      chatConvsThisMonth,
      chatConvsLastMonth,
      convsByStatus,
      convsByChannel,
      convsByChatbot,
      totalMessages,
      totalConvsWithMessages,
    ] = await Promise.all([
      // Total conversations this month
      prisma.conversation.count({
        where: { organizationId: organizationId, createdAt: { gte: startOfMonth } },
      }),
      // Total conversations last month (for comparison)
      prisma.conversation.count({
        where: { organizationId: organizationId, createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
      }),
      // Breakdown by status (all time)
      prisma.conversation.groupBy({
        by: ['status'],
        _count: true,
        where: { organizationId: organizationId },
      }),
      // Breakdown by channel this month
      prisma.conversation.groupBy({
        by: ['channel'],
        _count: true,
        where: { organizationId: organizationId, createdAt: { gte: startOfMonth } },
        orderBy: { _count: { channel: 'desc' } },
      }),
      // Top chatbots by conversation count (all time, top 5)
      prisma.conversation.groupBy({
        by: ['chatbotId'],
        _count: true,
        where: { organizationId: organizationId },
        orderBy: { _count: { chatbotId: 'desc' } },
        take: 5,
      }),
      // Total messages across all conversations (for avg calculation)
      prisma.conversationMessage.count({
        where: { conversation: { organizationId: organizationId } },
      }),
      // Conversations that have at least 1 message (for avg)
      prisma.conversation.count({
        where: { organizationId: organizationId, messages: { some: {} } },
      }),
    ])

    // Resolve chatbot names for the top-bots breakdown
    const chatbotIds = convsByChatbot.map(r => r.chatbotId)
    const chatbotNames = await prisma.chatbot.findMany({
      where: { id: { in: chatbotIds } },
      select: { id: true, name: true, primaryColor: true },
    })
    const chatbotMap = Object.fromEntries(chatbotNames.map(b => [b.id, b]))

    const statusMap  = Object.fromEntries(convsByStatus.map(r => [r.status, r._count]))
    const avgMessages = totalConvsWithMessages > 0
      ? Math.round(totalMessages / totalConvsWithMessages)
      : 0
    const escalationRate = chatConvsThisMonth > 0
      ? Math.round(((statusMap.escalated || 0) / chatConvsThisMonth) * 100)
      : 0
    const resolutionRate = chatConvsThisMonth > 0
      ? Math.round(((statusMap.resolved || 0) / chatConvsThisMonth) * 100)
      : 0

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
      chatbot: {
        totalThisMonth: chatConvsThisMonth,
        totalLastMonth: chatConvsLastMonth,
        byStatus: {
          open:      statusMap.open      || 0,
          escalated: statusMap.escalated || 0,
          resolved:  statusMap.resolved  || 0,
        },
        byChannel: convsByChannel.map(r => ({ channel: r.channel, count: r._count })),
        topBots: convsByChatbot.map(r => ({
          chatbot: chatbotMap[r.chatbotId] || { id: r.chatbotId, name: 'Desconocido', primaryColor: '#6b7280' },
          count: r._count,
        })),
        avgMessages,
        escalationRate,
        resolutionRate,
      },
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
