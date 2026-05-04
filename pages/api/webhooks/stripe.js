import stripe from '../../../lib/stripe'
import prisma from '../../../lib/prisma'
import { buffer } from 'micro'

// Stripe requires raw body for signature verification
export const config = { api: { bodyParser: false } }

async function updateOrgPlan(organizationId, plan, subscriptionId, status) {
  const planStatus = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
    paused: 'past_due',
  }[status] ?? 'active'

  await prisma.organization.update({
    where: { id: parseInt(organizationId, 10) },
    data: {
      plan,
      planStatus,
      stripeSubscriptionId: subscriptionId,
    },
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const rawBody = await buffer(req)
  const sig = req.headers['stripe-signature']

  let event

  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return res.status(400).json({ error: `Webhook error: ${err.message}` })
    }
  } else {
    // Dev mode without webhook secret — parse body directly (test only)
    try {
      event = JSON.parse(rawBody.toString())
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const { organizationId, plan } = session.metadata ?? {}

        if (!organizationId || !plan) break

        const subscriptionId = session.subscription

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          await updateOrgPlan(organizationId, plan, subscriptionId, sub.status)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const organizationId = sub.metadata?.organizationId
        const plan = sub.metadata?.plan

        if (!organizationId || !plan) break

        await updateOrgPlan(organizationId, plan, sub.id, sub.status)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const organizationId = sub.metadata?.organizationId

        if (!organizationId) break

        await prisma.organization.update({
          where: { id: parseInt(organizationId, 10) },
          data: {
            plan: 'trial',
            planStatus: 'canceled',
            stripeSubscriptionId: null,
          },
        })
        break
      }

      default:
        // Unhandled event type — ignore
        break
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}
