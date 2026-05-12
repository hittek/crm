import { getSession } from '../../../../lib/auth'
import prisma from '../../../../lib/prisma'
import crypto from 'crypto'

// POST /api/quotes/[id]/share — generate (or return existing) shareToken
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })
  const { organizationId: orgId } = session.user
  const { id } = req.query

  const quote = await prisma.quote.findFirst({ where: { id: parseInt(id), orgId } })
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' })

  // Return existing token or generate a new one
  let token = quote.shareToken
  if (!token) {
    token = crypto.randomBytes(20).toString('base64url')
    await prisma.quote.update({
      where: { id: parseInt(id) },
      data: { shareToken: token },
    })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.host}`
  return res.status(200).json({ token, url: `${baseUrl}/q/${token}` })
}
