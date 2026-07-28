/**
 * pages/api/internal/run-report.js
 *
 * Internal endpoint to trigger a report run by id or type.
 * Protected by x-internal-secret header.
 *
 * POST /api/internal/run-report
 * Body: { reportId?: number, type?: string, organizationId?: number, windowKey?: string }
 *
 * Returns: { runId, status, widgetCount? }
 */

import prisma from '../../../lib/prisma'
import { registry } from '../../../lib/reports/index'
import { buildDailyWindow } from '../../../lib/reports/base'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  // ── Auth guard ──────────────────────────────────────────────────────────
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret || req.headers['x-internal-secret'] !== secret) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { reportId, type, organizationId, windowKey } = req.body || {}

  // ── Resolve the ReportDefinition row ───────────────────────────────────
  let reportDef
  if (reportId) {
    reportDef = await prisma.reportDefinition.findUnique({ where: { id: Number(reportId) } })
  } else if (type && organizationId) {
    reportDef = await prisma.reportDefinition.findFirst({
      where: { organizationId: Number(organizationId) },
      orderBy: { id: 'asc' },
    })
  }

  if (!reportDef) {
    return res.status(404).json({ error: 'ReportDefinition not found' })
  }

  // ── Resolve org ─────────────────────────────────────────────────────────
  const org = await prisma.organization.findUnique({
    where: { id: reportDef.organizationId },
    select: { id: true, name: true, timezone: true, orgSettings: true },
  })
  if (!org) return res.status(404).json({ error: 'Organization not found' })

  // ── Determine report type from definition ───────────────────────────────
  // Built-in reports: definition JSON contains a "type" key; fallback to 'daily-digest'
  let reportType = type
  if (!reportType) {
    try {
      const def = JSON.parse(reportDef.definition)
      reportType = def.type || 'daily-digest'
    } catch {
      reportType = 'daily-digest'
    }
  }

  const report = registry.get(reportType)
  if (!report) {
    return res.status(400).json({ error: `Unknown report type: ${reportType}` })
  }

  // ── Build time window ───────────────────────────────────────────────────
  const timezone = org.timezone || 'America/Mexico_City'
  const win = windowKey
    ? { key: windowKey, start: new Date(), end: new Date() } // on-demand; generator will use its own window
    : buildDailyWindow(timezone)

  // ── Idempotency guard — skip if already run for this window ────────────
  const existing = await prisma.reportRun.findUnique({
    where: {
      reportId_organizationId_windowKey: {
        reportId: reportDef.id,
        organizationId:    org.id,
        windowKey: win.key,
      },
    },
  })
  if (existing && existing.status === 'delivered') {
    return res.json({ runId: existing.id, status: 'already_delivered', windowKey: win.key })
  }

  // ── Create or update ReportRun row (pending) ────────────────────────────
  const run = await prisma.reportRun.upsert({
    where: {
      reportId_organizationId_windowKey: {
        reportId: reportDef.id,
        organizationId:    org.id,
        windowKey: win.key,
      },
    },
    create: {
      reportId:  reportDef.id,
      organizationId:     org.id,
      windowKey: win.key,
      status:    'running',
    },
    update: { status: 'running' },
  })

  // ── Execute report (async — respond immediately, finish in background) ──
  const startMs = Date.now()
  try {
    const data = await report.generate(org, win)
    const durationMs = Date.now() - startMs

    await prisma.reportRun.update({
      where: { id: run.id },
      data: {
        status:      'delivered',
        deliveredAt: new Date(),
        result: JSON.stringify({
          widgetCount: data.widgets?.length ?? 0,
          durationMs,
          generatedAt: data.generatedAt,
        }),
      },
    })

    return res.json({
      runId:       run.id,
      status:      'delivered',
      windowKey:   win.key,
      widgetCount: data.widgets?.length ?? 0,
      durationMs,
    })
  } catch (err) {
    await prisma.reportRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        error:  err.message,
      },
    })
    console.error('[run-report] Failed:', err)
    return res.status(500).json({ error: err.message })
  }
}
