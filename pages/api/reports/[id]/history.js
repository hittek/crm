/**
 * pages/api/reports/[id]/history.js
 *
 * GET /api/reports/:id/history — last 10 runs for a report
 */

import { getSession } from '../../../../lib/auth'
import prisma         from '../../../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' })

  const { organizationId } = session.user
  const reportId = parseInt(req.query.id)
  if (isNaN(reportId)) return res.status(400).json({ error: 'Invalid id' })

  // Confirm ownership
  const def = await prisma.reportDefinition.findFirst({
    where: { id: reportId, organizationId },
    select: { id: true },
  })
  if (!def) return res.status(404).json({ error: 'Not found' })

  const runs = await prisma.reportRun.findMany({
    where:   { reportId, organizationId },
    orderBy: { createdAt: 'desc' },
    take:    10,
    select: {
      id:          true,
      windowKey:   true,
      status:      true,
      deliveredAt: true,
      deliveredVia: true,
      error:       true,
      createdAt:   true,
    },
  })

  return res.json(runs)
}
