import { NextResponse } from 'next/server'

/**
 * Extracts the org slug from the Host header.
 *
 * Production:  acme.hittek.mx        → "acme"
 * Local dev:   acme.localhost:3000   → "acme"
 * Root/main:   hittek.mx / localhost → null
 */
function extractOrgSlug(host) {
  if (!host) return null
  const withoutPort = host.split(':')[0] // strip :3000
  const parts = withoutPort.split('.')

  // Need at least two parts (subdomain.domain) and subdomain ≠ "www"
  if (parts.length >= 2 && parts[0] !== 'www') {
    const candidate = parts[0]
    // "localhost" alone is not a subdomain
    if (candidate !== 'localhost') return candidate
  }
  return null
}

export function middleware(request) {
  const host = request.headers.get('host') || ''
  const slug = extractOrgSlug(host)

  const response = NextResponse.next()

  if (slug) {
    // Attach slug as a request header so API handlers can validate org context
    response.headers.set('x-org-slug', slug)
    // Also forward as a response header so client code can read it if needed
    response.headers.set('x-forwarded-org-slug', slug)
  }

  return response
}

export const config = {
  // Run on all routes except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
