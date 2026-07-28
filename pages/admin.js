import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n'
import Icons from '../components/ui/Icons'
import { Spinner } from '../components/ui/Spinner'

const PLAN_COLORS = {
  trial:      'bg-gray-100 text-gray-600',
  starter:    'bg-blue-100 text-blue-700',
  pro:        'bg-indigo-100 text-indigo-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

const STATUS_COLORS = {
  trialing:  'bg-yellow-100 text-yellow-700',
  active:    'bg-green-100 text-green-700',
  past_due:  'bg-red-100 text-red-700',
  canceled:  'bg-gray-100 text-gray-500',
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
  const [toast, setToast] = useState(null)
  const { t } = useI18n()

  // Search
  const [search, setSearch] = useState('')

  // Create org form
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', plan: 'trial', adminEmail: '', adminPassword: '', adminName: '' })
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    fetchOrgs()
  }, [user, authLoading])

  const fetchOrgs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/orgs')
      if (res.status === 403) { setError(t('admin.noPermission')); return }
      const data = await res.json()
      setOrgs(data.orgs ?? [])
    } catch { setError(t('admin.loadError')) }
    finally { setIsLoading(false) }
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
      if (!res.ok) { showToast(data.error || t('errors.generic'), 'error'); return }
      setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, ...data.org } : o))
      showToast(t('admin.updateSuccess'))
    } catch { showToast(t('errors.networkError'), 'error') }
    finally { setActionLoading(null) }
  }

  const doCreate = async (e) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/admin/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error || 'Error al crear organización'); return }
      setOrgs(prev => [data.org, ...prev])
      setShowCreate(false)
      setCreateForm({ name: '', plan: 'trial', adminEmail: '', adminPassword: '', adminName: '' })
      showToast('Organización creada')
    } catch { setCreateError('Error de red') }
    finally { setCreateLoading(false) }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return orgs
    const q = search.toLowerCase()
    return orgs.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.slug.toLowerCase().includes(q) ||
      (o.customDomain || '').toLowerCase().includes(q)
    )
  }, [orgs, search])

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button onClick={() => router.push('/contacts')} className="btn-primary px-4 py-2">Ir al inicio</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head><title>{t('admin.title')} | CRM</title></Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/contacts')} className="text-gray-400 hover:text-gray-600 shrink-0">
              <Icons.back className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">{t('admin.title')}</h1>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium shrink-0">
              {filtered.length}/{orgs.length} orgs
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Icons.search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar org…"
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48"
              />
            </div>
            <button
              onClick={() => setShowCreate(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Icons.plus className="w-3.5 h-3.5" />
              Nueva org
            </button>
            <button onClick={fetchOrgs} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1.5">
              <Icons.refresh className="w-4 h-4" />
            </button>
          </div>
        </div>

        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
          }`}>
            {toast.msg}
          </div>
        )}

        {/* Create org form */}
        {showCreate && (
          <div className="bg-white border-b border-gray-200 px-6 py-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Crear organización</h2>
            <form onSubmit={doCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre de la org *</label>
                <input
                  required
                  value={createForm.name}
                  onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Empresa S.A. de C.V."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Plan</label>
                <select
                  value={createForm.plan}
                  onChange={e => setCreateForm(p => ({ ...p, plan: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {['trial', 'starter', 'pro', 'enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email del admin</label>
                <input
                  type="email"
                  value={createForm.adminEmail}
                  onChange={e => setCreateForm(p => ({ ...p, adminEmail: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="admin@empresa.com"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contraseña del admin</label>
                <input
                  type="password"
                  value={createForm.adminPassword}
                  onChange={e => setCreateForm(p => ({ ...p, adminPassword: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre del admin</label>
                <input
                  value={createForm.adminName}
                  onChange={e => setCreateForm(p => ({ ...p, adminName: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {createLoading ? 'Creando…' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateError(null) }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
              {createError && (
                <div className="sm:col-span-2 lg:col-span-3 text-sm text-red-600">{createError}</div>
              )}
            </form>
          </div>
        )}

        {/* Org table */}
        <div className="p-6 overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">
              {search ? `Sin resultados para "${search}"` : 'No hay organizaciones'}
            </div>
          ) : (
            <table className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <th className="px-4 py-3 font-medium">{t('admin.organization')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.plan')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.status')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.users')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.contacts')}</th>
                  <th className="px-4 py-3 font-medium">Chatbots</th>
                  <th className="px-4 py-3 font-medium">Convs</th>
                  <th className="px-4 py-3 font-medium">{t('admin.created')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((org) => (
                  <tr key={org.id} className={`hover:bg-gray-50 ${org.suspendedAt ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{org.name}</div>
                      <div className="text-xs text-gray-400">{org.slug}</div>
                      {org.customDomain && <div className="text-xs text-indigo-500">{org.customDomain}</div>}
                      {org.suspendedAt && (
                        <div className="text-xs text-red-500 mt-0.5">Suspendida: {org.suspendedReason}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[org.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                          {org.plan}
                        </span>
                        {org.trialEndsAt && org.plan === 'trial' && (
                          <span className="text-xs text-gray-400">hasta {formatDate(org.trialEndsAt)}</span>
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
                    <td className="px-4 py-3 text-gray-600">{org._count.chatbots ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600">{org._count.conversations ?? 0}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(org.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {/* Plan override */}
                        <select
                          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                          value={planOverride[org.id] ?? org.plan}
                          onChange={e => setPlanOverride(p => ({ ...p, [org.id]: e.target.value }))}
                        >
                          {['trial', 'starter', 'pro', 'enterprise'].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => doAction(org.id, 'override_plan', { plan: planOverride[org.id] ?? org.plan })}
                          disabled={!!actionLoading}
                          className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 disabled:opacity-50"
                        >
                          {actionLoading === `${org.id}-override_plan` ? '…' : t('admin.apply')}
                        </button>

                        {/* Suspend / unsuspend */}
                        {!org.suspendedAt ? (
                          <button
                            onClick={() => {
                              const r = window.prompt(t('admin.suspendReason')) || t('admin.defaultSuspendReason')
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
          )}
        </div>
      </div>
    </>
  )
}

// Render without the CRM sidebar layout
AdminPage.getLayout = (page) => page
