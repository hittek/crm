import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { Spinner } from '../components/ui/Spinner'

/**
 * /billing is kept for backwards-compatibility and Stripe redirect landing.
 * It immediately redirects to /settings?tab=billing, preserving any query params
 * (success=1, canceled=1) so the settings billing tab can show the right message.
 */
export default function BillingRedirect() {
  const router = useRouter()

  useEffect(() => {
    const query = { tab: 'billing' }
    if (router.query.success) query.success = '1'
    if (router.query.canceled) query.canceled = '1'
    router.replace({ pathname: '/settings', query })
  }, [router])

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <Spinner size="lg" />
    </div>
  )
}

BillingRedirect.getLayout = (page) => page
