import { useState } from 'react'
import { FiCheck, FiAlertTriangle, FiLock, FiLogOut, FiArrowRight } from 'react-icons/fi'
import { useAuth } from '../../lib/AuthContext'
import { useI18n } from '../../lib/i18n'
import { Spinner } from './Spinner'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$499',
    period: '/mes MXN',
    features: ['500 contactos', '500 negocios', '5 usuarios', '1 chatbot IA', 'Soporte prioritario'],
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$1,299',
    period: '/mes MXN',
    features: ['5,000 contactos', '5,000 negocios', '20 usuarios', '3 chatbots IA', 'Soporte dedicado', 'White-label'],
    highlight: true,
  },
]

/**
 * Full-screen upgrade / access wall.
 *
 * @param {string} [reason]  Override the blockReason from auth context.
 *   Values: 'trial_expired' | 'canceled' | 'suspended' | 'feature_unavailable'
 *   Defaults to blockReason from auth, then 'trial_expired'.
 */
export default function UpgradeWall({ reason: reasonProp }) {
  const { blockReason, logout } = useAuth()
  const { t } = useI18n()
  const [isUpgrading, setIsUpgrading] = useState(null)
  const [error, setError] = useState(null)

  const reason = reasonProp ?? blockReason ?? 'trial_expired'

  const MESSAGES = {
    trial_expired: {
      icon: <FiAlertTriangle className="w-8 h-8 text-yellow-500" />,
      title: t('upgrade.trialExpiredTitle'),
      subtitle: t('upgrade.trialExpiredSubtitle'),
    },
    canceled: {
      icon: <FiLock className="w-8 h-8 text-gray-400" />,
      title: t('upgrade.canceledTitle'),
      subtitle: t('upgrade.canceledSubtitle'),
    },
    suspended: {
      icon: <FiLock className="w-8 h-8 text-red-500" />,
      title: t('upgrade.suspendedTitle'),
      subtitle: t('upgrade.suspendedSubtitle'),
      noUpgrade: true,
    },
    feature_unavailable: {
      icon: <FiLock className="w-8 h-8 text-indigo-400" />,
      title: t('upgrade.featureUnavailableTitle'),
      subtitle: t('upgrade.featureUnavailableSubtitle'),
    },
  }

  const msg = MESSAGES[reason] ?? MESSAGES.trial_expired

  const handleUpgrade = async (plan) => {
    setIsUpgrading(plan)
    setError(null)
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
        setError(data.error || t('upgrade.checkoutError'))
      }
    } catch {
      setError(t('upgrade.networkError'))
    } finally {
      setIsUpgrading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="mb-8 text-center max-w-lg">
        <div className="flex justify-center mb-4">{msg.icon}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{msg.title}</h1>
        <p className="text-gray-500 text-sm leading-relaxed">{msg.subtitle}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 w-full max-w-2xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Plan cards */}
      {!msg.noUpgrade && (
        <div className="grid sm:grid-cols-2 gap-5 w-full max-w-2xl mb-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border p-6 flex flex-col ${
                plan.highlight
                  ? 'border-indigo-500 shadow-lg shadow-indigo-100 ring-1 ring-indigo-500'
                  : 'border-gray-200'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-white bg-indigo-600 px-3 py-1 rounded-full">
                  {t('upgrade.mostPopular')}
                </span>
              )}
              <div className="mb-4">
                <p className="font-semibold text-gray-900 mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-400">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <FiCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={!!isUpgrading}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60'
                    : 'border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-60'
                }`}
              >
                {isUpgrading === plan.id
                  ? <Spinner size="sm" />
                  : <>{t('upgrade.continuePlan', { name: plan.name })} <FiArrowRight className="w-4 h-4" /></>
                }
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Support link for suspended */}
      {msg.noUpgrade && (
        <a
          href="mailto:soporte@hittek.mx"
          className="mb-8 flex items-center gap-2 text-indigo-600 hover:underline text-sm font-medium"
        >
          {t('upgrade.contactSupport')}
        </a>
      )}

      {/* Logout */}
      <button
        onClick={logout}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <FiLogOut className="w-4 h-4" />
        {t('upgrade.logout')}
      </button>

      {/* Branding */}
      <div className="mt-8 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">H</div>
        <span className="text-xs text-gray-300">Hittek CRM</span>
      </div>
    </div>
  )
}
