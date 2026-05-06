/**
 * GET /api/conversations
 * Returns paginated list of conversations for the org, newest first.
 * Query params: page (default 1), limit (default 20), status, channel
 */

import prisma from '../../../lib/prisma'
import { getSession } from '../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../lib/planLimits'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const page    = Math.max(1, parseInt(req.query.page  || '1', 10))
  const limit   = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)))
  const skip    = (page - 1) * limit
  const where   = { orgId: organizationId }

  if (req.query.status)  where.status  = req.query.status
  if (req.query.channel) where.channel = req.query.channel

  const [total, conversations] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      include: {
        chatbot:  { select: { id: true, name: true, primaryColor: true } },
        messages: { orderBy: { createdAt: 'asc' }, select: { id: true, role: true, content: true, createdAt: true } },
      },
    }),
  ])

  return res.json({ conversations, total, page, limit })
}
