/**
 * PATCH /api/conversations/[id]/status
 * Body: { status: 'open' | 'resolved' | 'escalated' }
 */
import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../lib/planLimits'

const VALID_STATUSES = ['open', 'resolved', 'escalated']

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).end()
  }

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const convId = parseInt(req.query.id, 10)
  if (isNaN(convId)) return res.status(400).json({ error: 'ID inválido' })

  const { status } = req.body
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}` })
  }

  const conv = await prisma.conversation.findFirst({ where: { id: convId, orgId: organizationId } })
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' })

  const updated = await prisma.conversation.update({
    where: { id: convId },
    data:  { status },
  })
  return res.json({ conversation: updated })
}
