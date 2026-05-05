import Stripe from 'stripe'

// Instantiated lazily so Next.js can import this module without crashing
// in environments where STRIPE_SECRET_KEY isn't set (CI, client bundle tree-shake).
let _stripe = null

function getStripeClient() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-04-30.basil',
    })
  }
  return _stripe
}

// Proxy so callers use `stripe.customers.create(...)` as before,
// but the real Stripe client is only constructed on first actual use.
const stripe = new Proxy(
  {},
  {
    get(_target, prop) {
      return getStripeClient()[prop]
    },
  }
)

export default stripe

/**
 * Maps plan ID to Stripe Price ID.
 * Price IDs are created once and stored in env.
 */
export const PLAN_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
}
