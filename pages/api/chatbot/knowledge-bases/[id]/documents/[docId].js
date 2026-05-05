import prisma from '../../../../../../lib/prisma'
import { getSession } from '../../../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../../../lib/planLimits'

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const kbId  = parseInt(req.query.id)
  const docId = parseInt(req.query.docId)
  if (isNaN(kbId) || isNaN(docId)) return res.status(400).json({ error: 'ID inválido' })

  // Verify KB belongs to org
  const kb = await prisma.knowledgeBase.findFirst({ where: { id: kbId, orgId: organizationId } })
  if (!kb) return res.status(404).json({ error: 'Base de conocimiento no encontrada' })

  const doc = await prisma.knowledgeBaseDocument.findFirst({
    where: { id: docId, knowledgeBaseId: kbId },
  })
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado' })

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    await prisma.knowledgeBaseDocument.delete({ where: { id: docId } })

    // Recalculate KB status
    const remaining = await prisma.knowledgeBaseDocument.count({ where: { knowledgeBaseId: kbId } })
    await prisma.knowledgeBase.update({
      where: { id: kbId },
      data: { status: remaining === 0 ? 'empty' : 'ready' },
    })

    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', ['DELETE'])
  return res.status(405).end()
}
