import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import Icons from '../components/ui/Icons'
import { Spinner } from '../components/ui/Spinner'

const PLAN_COLORS = {
  trial: 'bg-gray-100 text-gray-600',
  starter: 'bg-blue-100 text-blue-700',
  pro: 'bg-indigo-100 text-indigo-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

const STATUS_COLORS = {
  trialing: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-100 text-gray-500',
  suspended: 'bg-red-200 text-red-800',
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [orgs, setOrgs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [planOverride, setPlanOverride] = useState({})
  const [suspendReason, setSuspendReason] = useState({})
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    fetchOrgs()
  }, [user, authLoading])

  const fetchOrgs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/orgs')
      if (res.status === 403) {
        setError('No tienes permisos para acceder a esta página.')
        return
      }
      const data = await res.json()
      setOrgs(data.orgs ?? [])
    } catch {
      setError('Error al cargar las organizaciones.')
    } finally {
      setIsLoading(false)
    }
  }

  const doAction = async (orgId, action, extra = {}) => {
    setActionLoading(`${orgId}-${action}`)
    try {
      const res = await fetch('/api/admin/orgs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orgId, action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Error', 'error')
        return
      }
      setOrgs((prev) =>
        prev.map((o) => (o.id === orgId ? { ...o, ...data.org } : o))
      )
      showToast('Actualizado correctamente')
    } catch {
      showToast('Error de red', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="btn-primary px-4 py-2">
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Super Admin | CRM</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600">
              <Icons.back className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Super Admin</h1>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              {orgs.length} orgs
            </span>
          </div>
          <button onClick={fetchOrgs} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <Icons.refresh className="w-4 h-4" />
            Actualizar
          </button>
        </div>

        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
          }`}>
            {toast.msg}
          </div>
        )}

        {/* Org table */}
        <div className="p-6 overflow-x-auto">
          <table className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="px-4 py-3 font-medium">Organización</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Usuarios</th>
                <th className="px-4 py-3 font-medium">Contactos</th>
                <th className="px-4 py-3 font-medium">Creada</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.map((org) => (
                <tr key={org.id} className={`hover:bg-gray-50 ${org.suspendedAt ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{org.name}</div>
                    <div className="text-xs text-gray-400">{org.slug}</div>
                    {org.customDomain && (
                      <div className="text-xs text-indigo-500">{org.customDomain}</div>
                    )}
                    {org.suspendedAt && (
                      <div className="text-xs text-red-500 mt-0.5">
                        Suspendida: {org.suspendedReason}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[org.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                        {org.plan}
                      </span>
                      {org.trialEndsAt && org.plan === 'trial' && (
                        <span className="text-xs text-gray-400">
                          hasta {formatDate(org.trialEndsAt)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[org.planStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                      {org.planStatus ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{org._count.users}</td>
                  <td className="px-4 py-3 text-gray-600">{org._count.contacts}</td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(org.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {/* Plan override */}
                      <select
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                        value={planOverride[org.id] ?? org.plan}
                        onChange={(e) => setPlanOverride((p) => ({ ...p, [org.id]: e.target.value }))}
                      >
                        {['trial', 'starter', 'pro', 'enterprise'].map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => doAction(org.id, 'override_plan', { plan: planOverride[org.id] ?? org.plan })}
                        disabled={!!actionLoading}
                        className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 disabled:opacity-50"
                      >
                        {actionLoading === `${org.id}-override_plan` ? '...' : 'Aplicar'}
                      </button>

                      {/* Suspend / unsuspend */}
                      {!org.suspendedAt ? (
                        <button
                          onClick={() => {
                            const r = window.prompt('Razón de suspensión:') || 'Suspendida por el administrador'
                            doAction(org.id, 'suspend', { reason: r })
                          }}
                          disabled={!!actionLoading}
                          className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50"
                        >
                          Suspender
                        </button>
                      ) : (
                        <button
                          onClick={() => doAction(org.id, 'unsuspend')}
                          disabled={!!actionLoading}
                          className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50"
                        >
                          Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// Render without the CRM sidebar layout
AdminPage.getLayout = (page) => page
