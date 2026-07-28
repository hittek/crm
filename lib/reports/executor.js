/**
 * lib/reports/executor.js
 *
 * Translates a parsed ReportDefinition into Prisma queries and returns
 * Recharts-compatible widget data.
 *
 * Usage:
 *   const widgets = await executeDefinition({ definition, organizationId })
 */

import prisma from '../prisma.js'
import { resolveTemplateValue, WidgetType } from './base.js'

// ─── Entity → Prisma model name ───────────────────────────────────────────

const ENTITY_MODEL = {
  deal:         'deal',
  contact:      'contact',
  task:         'task',
  conversation: 'conversation',
  activity:     'activity',
  quote:        'quote',
}

// ─── Operator → Prisma filter shape ──────────────────────────────────────

function buildFilterValue(op, rawValue) {
  const v = resolveTemplateValue(rawValue)
  switch (op) {
    case 'eq':       return v
    case 'neq':      return { not: v }
    case 'gt':       return { gt: v }
    case 'gte':      return { gte: v }
    case 'lt':       return { lt: v }
    case 'lte':      return { lte: v }
    case 'in':       return { in: typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v] }
    case 'notIn':    return { notIn: typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v] }
    case 'contains': return { contains: v, mode: 'insensitive' }
    default:         return v
  }
}

function buildWhere(organizationId, filters = []) {
  const where = { organizationId }
  for (const f of filters) {
    // Only support flat field names (dot-notation fields are silently ignored)
    if (f.field.includes('.')) continue
    where[f.field] = buildFilterValue(f.op, f.value)
  }
  return where
}

// ─── Single widget executor ───────────────────────────────────────────────

async function executeWidget(widget, organizationId) {
  const { type, query } = widget
  const { entity, aggregate, field, groupBy, filters = [], limit } = query

  const model = ENTITY_MODEL[entity]
  if (!model) throw new Error(`Unknown entity: ${entity}`)

  const where = buildWhere(organizationId, filters)

  // ── groupBy path ────────────────────────────────────────────────────────
  if (groupBy) {
    const groupArgs = {
      by:       [groupBy],
      where,
      orderBy:  { [groupBy]: 'asc' },
      ...(limit ? { take: limit } : {}),
    }

    switch (aggregate) {
      case 'count': {
        groupArgs._count = { [groupBy]: true }
        break
      }
      case 'sum': {
        groupArgs._sum = { [field]: true }
        break
      }
      case 'avg': {
        groupArgs._avg = { [field]: true }
        break
      }
      case 'min': {
        groupArgs._min = { [field]: true }
        break
      }
      case 'max': {
        groupArgs._max = { [field]: true }
        break
      }
    }

    const rows = await prisma[model].groupBy(groupArgs)

    // Recharts expects [{ name, value }]
    const data = rows.map(row => ({
      name:  row[groupBy] ?? '(sin valor)',
      value: (
        aggregate === 'count' ? (row._count?.[groupBy] ?? row._count ?? 0) :
        aggregate === 'sum'   ? (row._sum?.[field]  ?? 0) :
        aggregate === 'avg'   ? (row._avg?.[field]  ?? 0) :
        aggregate === 'min'   ? (row._min?.[field]  ?? 0) :
        aggregate === 'max'   ? (row._max?.[field]  ?? 0) : 0
      ),
    }))

    return buildWidgetData(type, data, widget)
  }

  // ── aggregate path (no groupBy) ─────────────────────────────────────────
  if (aggregate === 'count') {
    const value = await prisma[model].count({ where })
    return buildWidgetData(type, value, widget)
  }

  const aggArgs = { where }
  if (aggregate === 'sum')  aggArgs._sum  = { [field]: true }
  if (aggregate === 'avg')  aggArgs._avg  = { [field]: true }
  if (aggregate === 'min')  aggArgs._min  = { [field]: true }
  if (aggregate === 'max')  aggArgs._max  = { [field]: true }

  const result = await prisma[model].aggregate(aggArgs)
  const scalar = (
    aggregate === 'sum' ? (result._sum?.[field]  ?? 0) :
    aggregate === 'avg' ? (result._avg?.[field]  ?? 0) :
    aggregate === 'min' ? (result._min?.[field]  ?? null) :
    aggregate === 'max' ? (result._max?.[field]  ?? null) : 0
  )

  return buildWidgetData(type, scalar, widget)
}

// ─── Shape data per widget type ──────────────────────────────────────────

function buildWidgetData(type, raw, widget) {
  switch (type) {
    case WidgetType.NUMBER_CARD:
    case WidgetType.PROGRESS_BAR: {
      // raw is a scalar number
      return {
        id:       widget.id,
        type,
        title:    widget.title,
        subtitle: widget.subtitle,
        format:   widget.format || 'number',
        data: { value: raw ?? 0 },
      }
    }

    case WidgetType.BAR_CHART:
    case WidgetType.LINE_CHART:
    case WidgetType.PIE_CHART: {
      // raw is [{ name, value }]
      return {
        id:       widget.id,
        type,
        title:    widget.title,
        subtitle: widget.subtitle,
        data:     Array.isArray(raw) ? raw : [],
      }
    }

    case WidgetType.TABLE: {
      // raw is [{ name, value }] — reshape as rows
      const rows = Array.isArray(raw) ? raw : []
      return {
        id:       widget.id,
        type,
        title:    widget.title,
        subtitle: widget.subtitle,
        data: {
          columns: rows.length > 0 ? Object.keys(rows[0]).map(k => ({ key: k, label: k })) : [],
          rows,
        },
      }
    }

    default:
      return { id: widget.id, type, title: widget.title, data: raw }
  }
}

// ─── Main export ─────────────────────────────────────────────────────────

/**
 * Execute all widgets in a ReportDefinition and return chart-ready data.
 *
 * @param {{ definition: object, organizationId: number }} params
 * @returns {Promise<import('./base.js').WidgetData[]>}
 */
export async function executeDefinition({ definition, organizationId }) {
  const widgets = definition?.widgets
  if (!Array.isArray(widgets) || widgets.length === 0) {
    throw new Error('definition.widgets is empty or missing')
  }

  const results = await Promise.allSettled(
    widgets.map(async w => {
      const t0 = Date.now()
      try {
        const data = await executeWidget(w, organizationId)
        console.log(`[executor] widget=${w.id} type=${w.type} entity=${w.query?.entity} ms=${Date.now()-t0}`)
        return data
      } catch (err) {
        console.warn(`[executor] widget=${w.id} FAILED: ${err.message}`)
        // Return error widget so one failure doesn't kill the whole report
        return {
          id:    w.id,
          type:  w.type,
          title: w.title,
          data:  null,
          error: err.message,
        }
      }
    })
  )

  return results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message })
}
