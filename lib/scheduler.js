/**
 * lib/scheduler.js
 *
 * Hourly cron that fires ReportDefinition runs for each org at their
 * configured hour.  Initialised once per process via initScheduler().
 *
 * Schedule JSON shape (stored in ReportDefinition.schedule):
 *   { "frequency": "daily", "hour": 8, "timezone": "America/Mexico_City" }
 *
 * Idempotency: UNIQUE(reportId, organizationId, windowKey) in DB prevents
 * double-delivery even if the scheduler fires twice.
 */

import cron from 'node-cron'
import prisma from './prisma.js'
import { executeDefinition } from './reports/executor.js'
import { buildDailyWindow } from './reports/base.js'
import { deliverReportEmail } from './deliverers/email.js'
import { deliverReportPush }  from './deliverers/push.js'

// ─── Module-level guard ───────────────────────────────────────────────────

let _initialized = false

// ─── Core run logic (also called by scheduler-tick for manual fires) ──────

/**
 * Run a single ReportDefinition for its org.
 * @param {{ id: number, organizationId: number, name: string, definition: string, schedule: string }} def
 * @param {{ id: number, name: string, timezone?: string }} org
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<{ reportId: number, windowKey: string, status: string, durationMs: number }>}
 */
export async function runScheduledReport(def, org, { force = false } = {}) {
  const timezone  = JSON.parse(def.schedule || '{}').timezone || org.timezone || 'America/Mexico_City'
  const win       = buildDailyWindow(timezone)
  const windowKey = win.key

  // ── Idempotency check ───────────────────────────────────────────────────
  const existing = await prisma.reportRun.findUnique({
    where: {
      reportId_organizationId_windowKey: {
        reportId:       def.id,
        organizationId: org.id,
        windowKey,
      },
    },
  })

  if (existing?.status === 'delivered' && !force) {
    console.log(`[scheduler] already_delivered reportId=${def.id} org=${org.id} window=${windowKey}`)
    return { reportId: def.id, windowKey, status: 'already_delivered', durationMs: 0 }
  }

  // ── Create / reset run row ──────────────────────────────────────────────
  const run = await prisma.reportRun.upsert({
    where: {
      reportId_organizationId_windowKey: {
        reportId:       def.id,
        organizationId: org.id,
        windowKey,
      },
    },
    create:  { reportId: def.id, organizationId: org.id, windowKey, status: 'running' },
    update:  { status: 'running' },
  })

  const t0 = Date.now()

  try {
    const definition = JSON.parse(def.definition)
    const widgets    = await executeDefinition({ definition, organizationId: org.id })
    const durationMs = Date.now() - t0
    const hasErrors  = widgets.some(w => w.error)
    const runStatus  = hasErrors ? 'partial' : 'delivered'

    // ── Deliver (email + push) ──────────────────────────────────────────
    const deliveryCtx = { run: { ...run, reportId: def.id }, definition: { name: def.name }, widgets, org }
    const [emailResult, pushResult] = await Promise.allSettled([
      deliverReportEmail(deliveryCtx),
      deliverReportPush(deliveryCtx),
    ])
    const deliveredVia = {
      email: emailResult.status === 'fulfilled' ? emailResult.value : { error: emailResult.reason?.message },
      push:  pushResult.status  === 'fulfilled' ? pushResult.value  : { error: pushResult.reason?.message },
    }

    await prisma.reportRun.update({
      where: { id: run.id },
      data: {
        status:       runStatus,
        deliveredAt:  new Date(),
        result:       JSON.stringify({ widgetCount: widgets.length, durationMs, hasErrors }),
        deliveredVia: JSON.stringify(deliveredVia),
      },
    })

    console.log(
      `[scheduler] delivered reportId=${def.id} org=${org.id} window=${windowKey}` +
      ` widgets=${widgets.length} ms=${durationMs}${hasErrors ? ' (partial)' : ''}` +
      ` email=${JSON.stringify(deliveredVia.email)} push=${JSON.stringify(deliveredVia.push)}`
    )

    return { reportId: def.id, windowKey, status: runStatus, durationMs, deliveredVia }

  } catch (err) {
    const durationMs = Date.now() - t0
    await prisma.reportRun.update({
      where: { id: run.id },
      data:  { status: 'failed', error: err.message },
    })
    console.error(`[scheduler] failed reportId=${def.id} org=${org.id}: ${err.message}`)
    return { reportId: def.id, windowKey, status: 'failed', durationMs, error: err.message }
  }
}

// ─── Tick: check which reports are due and fire them ─────────────────────

export async function schedulerTick({ force = false } = {}) {
  const now = new Date()

  // Fetch all scheduled report definitions (with org info)
  const defs = await prisma.reportDefinition.findMany({
    where:   { schedule: { not: null } },
    include: { organization: { select: { id: true, name: true, timezone: true } } },
  })

  const due = force
    ? defs
    : defs.filter(def => {
        try {
          const sched = JSON.parse(def.schedule)
          if (!sched?.hour) return false
          const tz      = sched.timezone || def.organization?.timezone || 'America/Mexico_City'
          const localHr = parseInt(
            now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz }),
            10
          )
          return localHr === sched.hour
        } catch {
          return false
        }
      })

  if (due.length === 0) return []

  console.log(`[scheduler] tick: ${due.length} report(s) due`)

  const results = await Promise.allSettled(
    due.map(def => runScheduledReport(def, def.organization, { force }))
  )

  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { reportId: due[i].id, status: 'failed', error: r.reason?.message }
  )
}

// ─── Init (call once per process) ────────────────────────────────────────

export function initScheduler() {
  if (_initialized) return
  _initialized = true

  // Fire at the top of every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await schedulerTick()
    } catch (err) {
      console.error('[scheduler] tick error:', err)
    }
  })

  console.log('[scheduler] initialized — running hourly cron')
}
