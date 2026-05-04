import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import Icons from '../components/ui/Icons'
import { Spinner } from '../components/ui/Spinner'

const PLAN_INFO = {
  trial: {
    name: 'Prueba gratuita',
    color: 'gray',
    features: ['50 contactos', '50 negocios', '3 usuarios'],
  },
  starter: {
    name: 'Starter',
    color: 'blue',
    features: ['500 contactos', '500 negocios', '5 usuarios', '1 chatbot'],
  },
  pro: {
    name: 'Pro',
    color: 'indigo',
    features: ['5,000 contactos', '5,000 negocios', '20 usuarios', '3 chatbots'],
  },
  enterprise: {
    name: 'Enterprise',
    color: 'purple',
    features: ['Sin límites', 'Soporte dedicado'],
  },
}

const STATUS_LABELS = {
  trialing: { label: 'En período de prueba', color: 'yellow' },
  active: { label: 'Activo', color: 'green' },
  past_due: { label: 'Pago atrasado', color: 'red' },
  canceled: { label: 'Cancelado', color: 'gray' },
  suspended: { label: 'Suspendido', color: 'red' },
}

function formatDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BillingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [billing, setBilling] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpgrading, setIsUpgrading] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetch('/api/billing/status')
      .then((r) => r.json())
      .then((d) => { setBilling(d); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (router.query.success) setMessage({ type: 'success', text: '¡Suscripción activada! Tu plan ha sido actualizado.' })
    if (router.query.canceled) setMessage({ type: 'info', text: 'Pago cancelado. No se realizaron cargos.' })
  }, [router.query])

  const handleUpgrade = async (plan) => {
    setIsUpgrading(plan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al iniciar el pago' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red. Intenta de nuevo.' })
    } finally {
      setIsUpgrading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const plan = billing?.plan ?? 'trial'
  const status = billing?.planStatus ?? 'trialing'
  const trialEndsAt = billing?.trialEndsAt
  const planInfo = PLAN_INFO[plan] ?? PLAN_INFO.trial
  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS.trialing

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt) - Date.now()) / 86400000))
    : null

  return (
    <>
      <Head>
        <title>Facturación | CRM</title>
      </Head>

      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Facturación y Plan</h1>

        {message && (
          <div className={`mb-6 p-4 rounded-xl text-sm flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            <Icons.check className="w-4 h-4 flex-shrink-0" />
            {message.text}
          </div>
        )}

        {/* Current plan card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Plan actual</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-bold text-gray-900">{planInfo.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  statusInfo.color === 'green' ? 'bg-green-100 text-green-700' :
                  statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                  statusInfo.color === 'red' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>

          <ul className="space-y-1.5 mb-4">
            {planInfo.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <Icons.check className="w-4 h-4 text-green-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {trialEndsAt && status === 'trialing' && (
            <div className={`p-3 rounded-lg text-sm ${
              trialDaysLeft <= 3 ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
            }`}>
              <strong>
                {trialDaysLeft > 0
                  ? `Tu período de prueba termina en ${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''}`
                  : 'Tu período de prueba ha terminado'}
              </strong>
              {trialEndsAt && <span className="ml-1">({formatDate(trialEndsAt)})</span>}
            </div>
          )}
        </div>

        {/* Upgrade options */}
        {plan !== 'enterprise' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actualizar plan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plan !== 'starter' && (
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Starter</h3>
                  <p className="text-2xl font-bold text-gray-900 mb-1">$499 <span className="text-sm font-normal text-gray-400">/mes</span></p>
                  <ul className="space-y-1 mb-4">
                    {PLAN_INFO.starter.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                        <Icons.check className="w-3 h-3 text-green-500" />{f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade('starter')}
                    disabled={!!isUpgrading}
                    className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2"
                  >
                    {isUpgrading === 'starter' ? <Spinner size="sm" /> : null}
                    Actualizar a Starter
                  </button>
                </div>
              )}

              <div className="bg-white rounded-2xl border-2 border-primary-200 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">Pro</h3>
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">Más popular</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">$1,299 <span className="text-sm font-normal text-gray-400">/mes</span></p>
                <ul className="space-y-1 mb-4">
                  {PLAN_INFO.pro.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                      <Icons.check className="w-3 h-3 text-green-500" />{f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleUpgrade('pro')}
                  disabled={!!isUpgrading}
                  className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2"
                >
                  {isUpgrading === 'pro' ? <Spinner size="sm" /> : null}
                  Actualizar a Pro
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
