/**
 * pages/api/reports/[id]/run.js
 *
 * Execute a saved report definition and return Recharts-ready widget data.
 *
 * GET /api/reports/:id/run
 *   Runs the saved ReportDefinition (must belong to caller's org).
 *
 * POST /api/reports/:id/run
 *   Same as GET but also accepts an inline { definition } body to preview
 *   unsaved definitions.  When :id is "preview" the DB lookup is skipped.
 *
 * Response: {
 *   reportId:    number | "preview"
 *   name:        string
 *   generatedAt: string (ISO)
 *   widgets:     WidgetData[]
 *   durationMs:  number
 * }
 */

import { getSession }       from '../../../../lib/auth'
import prisma               from '../../../../lib/prisma'
import { executeDefinition } from '../../../../lib/reports/executor'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end()
  }

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' })

  const { organizationId } = session.user
  const { id } = req.query
  const t0 = Date.now()

  // ── Resolve definition ────────────────────────────────────────────────
  let name = 'Preview'
  let definition

  if (id === 'preview') {
    // Inline definition from request body (unsaved preview)
    definition = req.body?.definition
    if (!definition) return res.status(400).json({ error: 'definition required for preview' })
    name = req.body?.name || 'Preview'
  } else {
    const reportId = parseInt(id)
    if (isNaN(reportId)) return res.status(400).json({ error: 'Invalid report id' })

    const row = await prisma.reportDefinition.findFirst({
      where: { id: reportId, organizationId },
    })
    if (!row) return res.status(404).json({ error: 'Report not found' })

    name = row.name
    try {
      definition = JSON.parse(row.definition)
    } catch {
      return res.status(500).json({ error: 'Corrupt definition JSON in DB' })
    }
  }

  // ── Execute ───────────────────────────────────────────────────────────
  try {
    const widgets    = await executeDefinition({ definition, organizationId })
    const durationMs = Date.now() - t0

    console.log(`[reports/run] id=${id} org=${organizationId} widgets=${widgets.length} ms=${durationMs}`)

    return res.json({
      reportId:    id === 'preview' ? 'preview' : parseInt(id),
      name,
      generatedAt: new Date().toISOString(),
      widgets,
      durationMs,
    })
  } catch (err) {
    console.error('[reports/run] executor error:', err)
    return res.status(500).json({ error: err.message })
  }
}
