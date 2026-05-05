import stripe from '../../../lib/stripe'
import { getSession } from '../../../lib/auth'
import prisma from '../../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { stripeCustomerId: true },
  })

  if (!org?.stripeCustomerId) {
    // No Stripe customer yet — no invoices
    return res.status(200).json({ invoices: [] })
  }

  try {
    const list = await stripe.invoices.list({
      customer: org.stripeCustomerId,
      limit: 24,
      expand: ['data.charge'],
    })

    const invoices = list.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      date: inv.created, // unix timestamp
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,           // draft | open | paid | uncollectible | void
      pdfUrl: inv.invoice_pdf,
      hostedUrl: inv.hosted_invoice_url,
    }))

    return res.status(200).json({ invoices })
  } catch (err) {
    console.error('Stripe invoices error:', err)
    return res.status(500).json({ error: 'Error al obtener facturas' })
  }
}
