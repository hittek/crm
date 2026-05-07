import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Icons from '../components/ui/Icons'
import { useAuth } from '../lib/AuthContext'
import { PageLoader } from '../components/ui/Spinner'
import { useModalClose } from '../components/ui/Modal'

// ── ProviderModal ─────────────────────────────────────────────────────────────
function ProviderModal({ provider, onClose, onSave }) {
  const [form, setForm] = useState({
    name: provider?.name || '',
    contactName: provider?.contactName || '',
    email: provider?.email || '',
    phone: provider?.phone || '',
    website: provider?.website || '',
    notes: provider?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  useModalClose(onClose)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nombre requerido'); return }
    setSaving(true); setError(null)
    try {
      const url = provider ? `/api/providers/${provider.id}` : '/api/providers'
      const method = provider ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error al guardar')
      onSave(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {provider ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <Icons.close className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <form id="provider-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input
                autoFocus
                type="text" value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                placeholder="Ej. Distribuidora ABC"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contacto</label>
              <input
                type="text" value={form.contactName}
                onChange={e => set('contactName', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                placeholder="Nombre del contacto"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email" value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                <input
                  type="tel" value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sitio web</label>
              <input
                type="url" value={form.website}
                onChange={e => set('website', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                placeholder="https://"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
              <textarea
                rows={3} value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>Cancelar</button>
          <button form="provider-form" type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ProvidersPage() {
  const { user } = useAuth()
  const [providers, setProviders] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProvider, setEditProvider] = useState(null)
  const [deleteId, setDeleteId]   = useState(null)
  const [search, setSearch]       = useState('')

  const canWrite = user?.role === 'admin' || user?.role === 'manager'
  const canDelete = user?.role === 'admin'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/providers')
      if (r.ok) setProviders(await r.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() { setEditProvider(null); setShowModal(true) }
  function openEdit(p) { setEditProvider(p); setShowModal(true) }
  function closeModal() { setShowModal(false); setEditProvider(null) }

  function handleSave(saved) {
    setProviders(prev => {
      const exists = prev.find(p => p.id === saved.id)
      return exists ? prev.map(p => p.id === saved.id ? saved : p) : [saved, ...prev]
    })
    closeModal()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este proveedor?')) return
    await fetch(`/api/providers/${id}`, { method: 'DELETE' })
    setProviders(prev => prev.filter(p => p.id !== id))
  }

  async function toggleActive(p) {
    const r = await fetch(`/api/providers/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
    if (r.ok) {
      const updated = await r.json()
      setProviders(prev => prev.map(x => x.id === updated.id ? { ...x, isActive: updated.isActive } : x))
    }
  }

  const filtered = providers.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.contactName?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <PageLoader />

  return (
    <>
      <Head><title>Proveedores</title></Head>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Proveedores</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {providers.length} proveedor{providers.length !== 1 ? 'es' : ''}
            </p>
          </div>
          {canWrite && (
            <button onClick={openNew} className="btn-primary flex items-center gap-2 self-start">
              <Icons.plus className="w-4 h-4" />
              Nuevo proveedor
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar proveedor…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            {search ? 'Sin resultados' : (
              <div className="space-y-2">
                <Icons.package className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm">Sin proveedores aún</p>
                {canWrite && (
                  <button onClick={openNew} className="text-primary-600 text-sm hover:underline">
                    Agregar el primero
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Contacto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Email</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Productos</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      {p.phone && <div className="text-xs text-gray-400 mt-0.5">{p.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                      {p.contactName || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {p.email
                        ? <a href={`mailto:${p.email}`} className="hover:text-primary-600 hover:underline">{p.email}</a>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {p._count?.products ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => canWrite && toggleActive(p)}
                        disabled={!canWrite}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          p.isActive
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        } ${!canWrite ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {p.isActive ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {canWrite && (
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            title="Editar"
                          >
                            <Icons.edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Eliminar"
                          >
                            <Icons.trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ProviderModal
          provider={editProvider}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </>
  )
}
