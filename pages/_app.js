import '../styles/globals.css'
import Layout from '../components/layout/Layout'
import { SettingsProvider } from '../lib/SettingsContext'
import { AuthProvider, useAuth } from '../lib/AuthContext'
import { I18nProvider } from '../lib/i18n'
import { useRouter } from 'next/router'
import { Spinner } from '../components/ui/Spinner'

// Pages that don't require authentication
const PUBLIC_PAGES = ['/login']

function AuthenticatedApp({ Component, pageProps }) {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  // Public pages don't need authentication check
  if (PUBLIC_PAGES.includes(router.pathname)) {
    if (Component.getLayout) {
      return Component.getLayout(<Component {...pageProps} />)
    }
    return <Component {...pageProps} />
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  // Check if page wants to skip layout
  if (Component.getLayout) {
    return Component.getLayout(<Component {...pageProps} />)
  }

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}

export default function App({ Component, pageProps }) {
  return (
    <SettingsProvider>
      <AuthProvider>
        <I18nProvider>
          <AuthenticatedApp Component={Component} pageProps={pageProps} />
        </I18nProvider>
      </AuthProvider>
    </SettingsProvider>
  )
}
