import prisma from '../../../lib/prisma'
import { getSession } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: {
      plan: true,
      planStatus: true,
      trialEndsAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      customDomain: true,
      suspendedAt: true,
    },
  })

  if (!org) return res.status(404).json({ error: 'Organización no encontrada' })

  return res.status(200).json(org)
}
