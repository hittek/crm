import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '../lib/AuthContext'
import Icons from '../components/ui/Icons'
import { Spinner } from '../components/ui/Spinner'

const PLANS = [
  {
    id: 'trial',
    name: 'Prueba gratuita',
    price: 'Gratis',
    period: '14 días',
    description: 'Explora todas las funciones sin compromiso',
    features: ['Hasta 50 contactos', 'Hasta 50 negocios', '3 usuarios', 'Soporte por email'],
    recommended: false,
    color: 'gray',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$499',
    period: '/mes',
    description: 'Para equipos pequeños que empiezan a crecer',
    features: ['Hasta 500 contactos', 'Hasta 500 negocios', '5 usuarios', '1 chatbot', 'Soporte prioritario'],
    recommended: true,
    color: 'primary',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$1,299',
    period: '/mes',
    description: 'Para equipos medianos con más volumen',
    features: ['Hasta 5,000 contactos', 'Hasta 5,000 negocios', '20 usuarios', '3 chatbots', 'Soporte dedicado'],
    recommended: false,
    color: 'indigo',
  },
]

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30)
}

export default function SignupPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, login } = useAuth()

  const [step, setStep] = useState(1) // 1 = plan, 2 = account details
  const [selectedPlan, setSelectedPlan] = useState(() => {
    // Pre-select from ?plan= query param (set by landing page pricing CTAs)
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('plan')
      if (['trial', 'starter', 'pro'].includes(p)) return p
    }
    return 'starter'
  })
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const slugPreview = slugify(orgName)

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/contacts')
    }
  }, [authLoading, isAuthenticated, router])

  // Sync plan from URL query after Next.js hydration
  useEffect(() => {
    const p = router.query.plan
    if (p && ['trial', 'starter', 'pro'].includes(p)) {
      setSelectedPlan(p)
    }
  }, [router.query.plan])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!orgName.trim()) return setError('El nombre de la organización es requerido')
    if (!email.trim()) return setError('El correo electrónico es requerido')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    if (password !== confirmPassword) return setError('Las contraseñas no coinciden')
    if (!privacyConsent) return setError('Debes aceptar el aviso de privacidad para continuar')

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName, email, password, plan: selectedPlan, privacyConsent }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al crear la cuenta')
        return
      }

      // Hydrate AuthContext with the new user so the session is live
      await login(email, password)

      // For paid plans, redirect to Stripe Checkout
      if (selectedPlan !== 'trial') {
        const checkoutRes = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: selectedPlan }),
        })
        const checkoutData = await checkoutRes.json()

        if (checkoutData.url) {
          window.location.href = checkoutData.url
          return
        }

        // Checkout creation failed — land in app anyway, user can upgrade from billing
        console.error('Checkout creation failed:', checkoutData.error)
        // Fall through to contacts redirect
      }

      router.push('/contacts?welcome=1')
    } catch {
      setError('Error de red. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Crear cuenta | Hittek CRM</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mb-4 shadow-lg">
              <span className="text-white font-bold text-2xl">H</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Crea tu cuenta</h1>
            <p className="mt-2 text-gray-500">
              14 días gratis. Sin tarjeta de crédito requerida.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s ? 'bg-primary-600 text-white' :
                  step > s ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  {step > s ? <Icons.check className="w-4 h-4" /> : s}
                </div>
                <span className={`text-sm font-medium ${step === s ? 'text-primary-700' : 'text-gray-400'}`}>
                  {s === 1 ? 'Elige tu plan' : 'Datos de cuenta'}
                </span>
                {s < 2 && <div className="w-8 h-px bg-gray-200" />}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* ── Step 1: Plan selection ───────────────────────────────────── */}
            {step === 1 && (
              <div className="p-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Elige tu plan</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                        selectedPlan === plan.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {plan.recommended && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                          Más popular
                        </span>
                      )}
                      <div className="mb-3">
                        <p className="font-semibold text-gray-900">{plan.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
                      </div>
                      <div className="mb-4">
                        <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                        <span className="text-sm text-gray-400 ml-1">{plan.period}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                            <Icons.check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {selectedPlan === plan.id && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                          <Icons.check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full btn-primary py-3 text-base"
                >
                  Continuar con {PLANS.find(p => p.id === selectedPlan)?.name}
                </button>
              </div>
            )}

            {/* ── Step 2: Account details ──────────────────────────────────── */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="p-8">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
                >
                  <Icons.back className="w-4 h-4" />
                  Cambiar plan
                </button>

                <h2 className="text-lg font-semibold text-gray-900 mb-6">Datos de tu cuenta</h2>

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <Icons.alert className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Org name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de la organización
                    </label>
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Ej: Mi Empresa S.A. de C.V."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {slugPreview && (
                      <p className="mt-1.5 text-xs text-gray-400">
                        Tu URL: <span className="font-mono text-gray-600">{slugPreview}.hittek.mx</span>
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@empresa.com"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <Icons.eyeOff className="w-4 h-4" /> : <Icons.eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar contraseña
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu contraseña"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Privacy consent */}
                  <div className="pt-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacyConsent}
                        onChange={(e) => setPrivacyConsent(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-600">
                        He leído y acepto el{' '}
                        <a href="/privacy" target="_blank" className="text-primary-600 hover:underline">
                          Aviso de Privacidad
                        </a>{' '}
                        conforme a la LFPDPPP. Autorizo el tratamiento de mis datos personales con los fines descritos.
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-3 text-base mt-6 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" />
                      Creando cuenta...
                    </>
                  ) : (
                    'Crear cuenta gratis'
                  )}
                </button>

                <p className="text-center text-xs text-gray-400 mt-4">
                  Pago únicamente si decides continuar después del período de prueba.
                </p>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}

// Skip CRM layout for signup page
SignupPage.getLayout = (page) => page
