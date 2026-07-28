/**
 * pages/api/internal/scheduler-tick.js
 *
 * Manually trigger the scheduler tick for testing or catch-up runs.
 * Protected by x-internal-secret header.
 *
 * POST /api/internal/scheduler-tick
 * Body: {
 *   force?:    boolean  — skip hour check, run all scheduled reports now
 *   reportId?: number   — run only this specific report definition
 * }
 *
 * Returns: { fired: number, results: [...] }
 */

import { schedulerTick, runScheduledReport } from '../../../lib/scheduler'
import prisma from '../../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  const secret = process.env.INTERNAL_API_SECRET
  if (!secret || req.headers['x-internal-secret'] !== secret) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { force = true, reportId } = req.body || {}

  try {
    // ── Single report mode ──────────────────────────────────────────────
    if (reportId) {
      const def = await prisma.reportDefinition.findUnique({
        where:   { id: Number(reportId) },
        include: { organization: { select: { id: true, name: true, timezone: true } } },
      })
      if (!def) return res.status(404).json({ error: 'ReportDefinition not found' })
      if (!def.schedule) return res.status(400).json({ error: 'Report has no schedule' })

      const result = await runScheduledReport(def, def.organization, { force })
      return res.json({ fired: 1, results: [result] })
    }

    // ── Full tick mode ──────────────────────────────────────────────────
    const results = await schedulerTick({ force })
    return res.json({ fired: results.length, results })

  } catch (err) {
    console.error('[scheduler-tick]', err)
    return res.status(500).json({ error: err.message })
  }
}
