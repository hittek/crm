import prisma from '../../../lib/prisma'

// GET /api/q/[token] — public, no auth required
// Returns quote + org info needed to render the public page
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' })

  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token requerido' })

  const quote = await prisma.quote.findUnique({
    where: { shareToken: token },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      deal: { select: { id: true, title: true } },
    },
  })

  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' })

  // Fetch org info separately
  const org = await prisma.organization.findUnique({
    where: { id: quote.orgId },
    select: { name: true, logo: true, primaryColor: true, currency: true },
  })

  // Parse items and return clean object (no internal org IDs)
  const { orgId, shareToken, ...safe } = quote
  return res.status(200).json({
    ...safe,
    items: JSON.parse(safe.items || '[]'),
    org,
  })
}
