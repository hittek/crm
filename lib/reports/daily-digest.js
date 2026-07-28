/**
 * lib/reports/daily-digest.js
 *
 * Built-in "Resumen del CRM" daily digest report.
 * Produces 6 widgets that mirror the existing /reports dashboard.
 * This file self-registers into the registry on import.
 */

import prisma from '../prisma.js'
import { Report, WidgetType, buildDailyWindow } from './base.js'
import { registry } from './registry.js'

class DailyDigestReport extends Report {
  constructor() {
    super('daily-digest')
  }

  get displayName() {
    return 'Resumen del CRM'
  }

  /**
   * @param {{ id: number, name: string, timezone?: string }} org
   * @param {{ key: string, start: Date, end: Date }} [window]
   * @returns {Promise<import('./base.js').ReportData>}
   */
  async generate(org, window) {
    const win  = window ?? buildDailyWindow(org.timezone || 'America/Mexico_City')
    const organizationId = org.id
    const { start, end } = win

    const now          = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek  = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    // ── Parallel queries ──────────────────────────────────────────────────
    const [
      dealsWonThisMonth,
      dealsWonLastMonth,
      pipelineByStage,
      contactsThisWeek,
      totalContacts,
      pendingTasks,
      overdueTasks,
      activityByType,
      openConversations,
    ] = await Promise.all([
      prisma.deal.aggregate({
        where: { organizationId: organizationId, stage: 'won', actualClose: { gte: startOfMonth } },
        _count: true, _sum: { value: true },
      }),
      prisma.deal.aggregate({
        where: {
          organizationId: organizationId, stage: 'won',
          actualClose: {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lt:  startOfMonth,
          },
        },
        _count: true, _sum: { value: true },
      }),
      prisma.deal.groupBy({
        by: ['stage'], _count: true, _sum: { value: true },
        where: { organizationId: organizationId, stage: { notIn: ['won', 'lost'] } },
      }),
      prisma.contact.count({ where: { organizationId: organizationId, createdAt: { gte: startOfWeek } } }),
      prisma.contact.count({ where: { organizationId: organizationId } }),
      prisma.task.count({ where: { organizationId: organizationId, status: { not: 'completed' } } }),
      prisma.task.count({
        where: { organizationId: organizationId, status: { not: 'completed' }, dueDate: { lt: now } },
      }),
      prisma.activity.groupBy({
        by: ['type'], _count: true,
        where: { organizationId: organizationId, createdAt: { gte: startOfWeek } },
        orderBy: { _count: { type: 'desc' } },
        take: 6,
      }),
      prisma.conversation.count({ where: { organizationId: organizationId, status: 'open' } }),
    ])

    // ── Trend helpers ─────────────────────────────────────────────────────
    const wonCount     = dealsWonThisMonth._count || 0
    const wonCountPrev = dealsWonLastMonth._count || 0
    const wonTrend     = wonCountPrev > 0
      ? Math.round(((wonCount - wonCountPrev) / wonCountPrev) * 100)
      : null

    // ── Build widget data ─────────────────────────────────────────────────
    const widgets = [
      {
        id:    'w1',
        type:  WidgetType.NUMBER_CARD,
        title: 'Negocios ganados este mes',
        data:  {
          value:    wonCount,
          subvalue: dealsWonThisMonth._sum?.value ?? 0,
          format:   'currency',
          trend:    wonTrend,
        },
      },
      {
        id:    'w2',
        type:  WidgetType.BAR_CHART,
        title: 'Pipeline por etapa',
        data:  {
          labels:   pipelineByStage.map(s => s.stage),
          datasets: [{
            label: 'Negocios',
            data:  pipelineByStage.map(s => s._count),
          }],
          raw: pipelineByStage,
        },
      },
      {
        id:    'w3',
        type:  WidgetType.NUMBER_CARD,
        title: 'Contactos esta semana',
        data:  {
          value:    contactsThisWeek,
          subvalue: totalContacts,
          sublabel: 'total',
          trend:    null,
        },
      },
      {
        id:    'w4',
        type:  WidgetType.NUMBER_CARD,
        title: 'Tareas pendientes',
        data:  {
          value:    pendingTasks,
          subvalue: overdueTasks,
          sublabel: 'vencidas',
          alert:    overdueTasks > 0,
        },
      },
      {
        id:    'w5',
        type:  WidgetType.BAR_CHART,
        title: 'Actividad esta semana',
        data:  {
          labels:   activityByType.map(a => a.type),
          datasets: [{
            label: 'Actividades',
            data:  activityByType.map(a => a._count),
          }],
        },
      },
      {
        id:    'w6',
        type:  WidgetType.NUMBER_CARD,
        title: 'Conversaciones abiertas',
        data:  { value: openConversations },
      },
    ]

    return {
      reportId:    'daily-digest',
      name:        this.displayName,
      widgets,
      generatedAt: new Date(),
      windowKey:   win.key,
      windowStart: start,
      windowEnd:   end,
    }
  }
}

// Self-register
registry.register(new DailyDigestReport())
