import { useState, useEffect, useMemo, useRef } from 'react'
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

// ── Org Actions Dialog ────────────────────────────────────────────────────────
function OrgActionsDialog({ org, onClose, onAction, onDelete, actionLoading }) {
  const [plan, setPlan] = useState(org.plan)
  const [suspendReason, setSuspendReason] = useState('')
  const [step, setStep] = useState('menu') // menu | suspend | delete
  const dialogRef = useRef(null)

  // Close on Escape or backdrop click
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const busy = !!actionLoading

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900">{org.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{org.slug} · ID {org.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5 shrink-0">
            <Icons.close className="w-4 h-4" />
          </button>
        </div>

        {/* ── Menu ─────────────────────────────────────────────────── */}
        {step === 'menu' && (
          <div className="p-5 space-y-5">

            {/* Plan override */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Cambiar plan</p>
              <div className="flex items-center gap-2">
                <select
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {['trial', 'starter', 'pro', 'enterprise'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button
                  onClick={() => onAction(org.id, 'override_plan', { plan })}
                  disabled={busy || plan === org.plan}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {actionLoading === `${org.id}-override_plan` ? '…' : 'Aplicar'}
                </button>
              </div>
              {plan !== org.plan && (
                <p className="text-xs text-indigo-500 mt-1.5">
                  Plan actual: <span className="font-medium">{org.plan}</span> → nuevo: <span className="font-medium">{plan}</span>
                </p>
              )}
            </div>

            {/* Suspend / unsuspend */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Estado</p>
              {!org.suspendedAt ? (
                <button
                  onClick={() => setStep('suspend')}
                  disabled={busy}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-40 transition-colors"
                >
                  <Icons.close className="w-4 h-4" />
                  Suspender organización
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                    Suspendida: {org.suspendedReason}
                  </div>
                  <button
                    onClick={() => onAction(org.id, 'unsuspend')}
                    disabled={busy}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-40 transition-colors"
                  >
                    <Icons.check className="w-4 h-4" />
                    {actionLoading === `${org.id}-unsuspend` ? 'Reactivando…' : 'Reactivar organización'}
                  </button>
                </div>
              )}
            </div>

            {/* Delete */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Zona de peligro</p>
              <button
                onClick={() => setStep('delete')}
                disabled={busy}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                <Icons.trash className="w-4 h-4" />
                Eliminar organización y toda su data
              </button>
            </div>

          </div>
        )}

        {/* ── Suspend form ─────────────────────────────────────────── */}
        {step === 'suspend' && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-700">Motivo de suspensión (visible al equipo):</p>
            <textarea
              autoFocus
              rows={3}
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              placeholder="Ej. Pago vencido, solicitud del cliente…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-2">
              <button
                onClick={() => onAction(org.id, 'suspend', { reason: suspendReason || 'Suspendida por el administrador' })}
                disabled={busy}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === `${org.id}-suspend` ? 'Suspendiendo…' : 'Confirmar suspensión'}
              </button>
              <button
                onClick={() => setStep('menu')}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── Delete confirm ───────────────────────────────────────── */}
        {step === 'delete' && (
          <div className="p-5 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 space-y-1">
              <p className="font-semibold">Esta acción no se puede deshacer.</p>
              <p>Se eliminarán permanentemente:</p>
              <ul className="list-disc list-inside text-xs mt-1 space-y-0.5 text-red-700">
                <li>{org._count.users} usuario{org._count.users !== 1 ? 's' : ''}</li>
                <li>{org._count.contacts} contacto{org._count.contacts !== 1 ? 's' : ''}</li>
                <li>{org._count.chatbots} chatbot{org._count.chatbots !== 1 ? 's' : ''} y bases de conocimiento</li>
                <li>Deals, tareas, actividades, conversaciones y toda la data asociada</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onDelete(org.id)}
                disabled={busy}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === `${org.id}-delete` ? 'Eliminando…' : 'Sí, eliminar todo'}
              </button>
              <button
                onClick={() => setStep('menu')}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [orgs, setOrgs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [toast, setToast] = useState(null)
  const { t } = useI18n()

  const [search, setSearch] = useState('')
  const [activeOrg, setActiveOrg] = useState(null) // org object for the actions dialog

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
      // Keep dialog open but refresh the org reference
      setActiveOrg(prev => prev?.id === orgId ? { ...prev, ...data.org } : prev)
      showToast(t('admin.updateSuccess'))
    } catch { showToast(t('errors.networkError'), 'error') }
    finally { setActionLoading(null) }
  }

  const doDelete = async (orgId) => {
    setActionLoading(`${orgId}-delete`)
    try {
      const res = await fetch('/api/admin/orgs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orgId }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || t('errors.generic'), 'error'); return }
      setOrgs(prev => prev.filter(o => o.id !== orgId))
      setActiveOrg(null)
      showToast('Organización eliminada')
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

        {/* Actions dialog */}
        {activeOrg && (
          <OrgActionsDialog
            org={activeOrg}
            onClose={() => setActiveOrg(null)}
            onAction={doAction}
            onDelete={doDelete}
            actionLoading={actionLoading}
          />
        )}

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
            <button onClick={fetchOrgs} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5">
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
                  <th className="px-4 py-3 font-medium">{t('admin.created')}</th>
                  <th className="px-4 py-3 font-medium"></th>
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
                    <td className="px-4 py-3 text-gray-400">{formatDate(org.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setActiveOrg(org)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        Acciones
                        <Icons.chevronDown className="w-3 h-3" />
                      </button>
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
