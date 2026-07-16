import stripe, { PLAN_PRICE_IDS } from '../../../lib/stripe'
import { getSession } from '../../../lib/auth'
import prisma from '../../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { plan } = req.body
  if (!['starter', 'pro'].includes(plan)) {
    return res.status(400).json({ error: 'Plan no válido. Elige starter o pro.' })
  }

  const priceId = PLAN_PRICE_IDS[plan]
  if (!priceId) {
    return res.status(500).json({ error: `Precio para el plan "${plan}" no configurado` })
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { id: true, name: true, stripeCustomerId: true, plan: true },
  })

  if (!org) return res.status(404).json({ error: 'Organización no encontrada' })

  try {
    // Reuse existing Stripe customer or create one
    let customerId = org.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: session.user.email,
        metadata: { organizationId: String(org.id) },
      })
      customerId = customer.id

      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId },
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://${req.headers.host}`

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/settings?tab=billing&success=1`,
      cancel_url: `${baseUrl}/settings?tab=billing&canceled=1`,
      metadata: {
        organizationId: String(org.id),
        plan,
      },
      subscription_data: {
        metadata: { organizationId: String(org.id), plan },
        // 14-day trial for new subscribers
        trial_period_days: org.plan === 'trial' ? 14 : undefined,
      },
    })

    return res.status(200).json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return res.status(500).json({ error: 'Error al crear la sesión de pago' })
  }
}
