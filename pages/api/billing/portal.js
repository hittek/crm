import stripe from '../../../lib/stripe'
import { getSession } from '../../../lib/auth'
import prisma from '../../../lib/prisma'

/**
 * Creates a Stripe Customer Portal session.
 *
 * The Customer Portal must be configured in the Stripe Dashboard:
 *   https://dashboard.stripe.com/settings/billing/portal
 *
 * It lets customers:
 *   - Update payment method (card)
 *   - View invoice history
 *   - Cancel or update subscriptions
 *
 * Returns: { url } — redirect the user to this URL.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  // Only admins can access billing management
  if (session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden gestionar la facturación' })
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { stripeCustomerId: true },
  })

  if (!org?.stripeCustomerId) {
    return res.status(400).json({
      error: 'No hay una suscripción activa. Activa un plan primero.',
    })
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://${req.headers.host}`

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${baseUrl}/settings?tab=billing`,
    })

    return res.status(200).json({ url: portalSession.url })
  } catch (err) {
    console.error('Stripe portal error:', err)

    // Friendly message when portal is not configured in Stripe Dashboard
    const msg = err?.message?.includes('No configuration')
      ? 'El portal de facturación no está configurado. Actívalo en el panel de Stripe: Dashboard → Settings → Billing → Customer Portal.'
      : 'Error al abrir el portal de pago.'

    return res.status(500).json({ error: msg })
  }
}
