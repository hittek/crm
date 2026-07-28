/**
 * pages/api/reports/[id]/index.js
 *
 * PATCH  /api/reports/:id  — update name / schedule
 * DELETE /api/reports/:id  — delete (non-built-in only)
 */

import { getSession } from '../../../../lib/auth'
import prisma         from '../../../../lib/prisma'

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' })

  const { organizationId } = session.user
  const reportId = parseInt(req.query.id)
  if (isNaN(reportId)) return res.status(400).json({ error: 'Invalid id' })

  const row = await prisma.reportDefinition.findFirst({
    where: { id: reportId, organizationId },
  })
  if (!row) return res.status(404).json({ error: 'Not found' })

  if (req.method === 'PATCH') {
    const { name, description, schedule } = req.body || {}
    const updated = await prisma.reportDefinition.update({
      where: { id: reportId },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(schedule    !== undefined && { schedule: schedule ? JSON.stringify(schedule) : null }),
      },
    })
    return res.json(updated)
  }

  if (req.method === 'DELETE') {
    if (row.isBuiltIn) return res.status(403).json({ error: 'Cannot delete built-in reports' })
    await prisma.reportDefinition.delete({ where: { id: reportId } })
    return res.status(204).end()
  }

  res.setHeader('Allow', ['PATCH', 'DELETE'])
  return res.status(405).end()
}
