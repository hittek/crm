/**
 * GET /api/conversations/[id]  — fetch a single conversation with messages
 */
import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../lib/planLimits'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const convId = parseInt(req.query.id, 10)
  if (isNaN(convId)) return res.status(400).json({ error: 'ID inválido' })

  const conversation = await prisma.conversation.findFirst({
    where: { id: convId, orgId: organizationId },
    include: {
      chatbot:  { select: { id: true, name: true, primaryColor: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' })

  return res.json({ conversation })
}
