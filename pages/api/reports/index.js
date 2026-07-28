/**
 * pages/api/reports/index.js
 *
 * GET  /api/reports  — list all ReportDefinitions for the org
 */

import { getSession } from '../../../lib/auth'
import prisma         from '../../../lib/prisma'

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' })

  const { organizationId } = session.user

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  const defs = await prisma.reportDefinition.findMany({
    where:   { organizationId },
    orderBy: { createdAt: 'asc' },
    select: {
      id:          true,
      name:        true,
      description: true,
      isBuiltIn:   true,
      schedule:    true,
      prompt:      true,
      createdAt:   true,
      runs: {
        orderBy: { createdAt: 'desc' },
        take:    1,
        select:  { id: true, status: true, deliveredAt: true, windowKey: true },
      },
    },
  })

  return res.json(defs.map(d => ({
    ...d,
    lastRun: d.runs[0] ?? null,
    runs:    undefined,
  })))
}
