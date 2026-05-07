import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Icons from '../components/ui/Icons'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../lib/AuthContext'

// ── ProviderForm (rendered inside <Modal>) ────────────────────────────────────
function ProviderForm({ provider, onSave, onClose }) {
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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nombre requerido'); return }
    setSaving(true); setError(null)
    try {
      const url = provider ? `/api/providers/${provider.id}` : '/api/providers'
      const r = await fetch(url, {
        method: provider ? 'PATCH' : 'POST',
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
        <input
          autoFocus className="input" type="text" value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Ej. Distribuidora ABC"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
        <input className="input" type="text" value={form.contactName}
          onChange={e => set('contactName', e.target.value)}
          placeholder="Nombre del contacto" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input className="input" type="email" value={form.email}
            onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input className="input" type="tel" value={form.phone}
            onChange={e => set('phone', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sitio web</label>
        <input className="input" type="url" value={form.website}
          onChange={e => set('website', e.target.value)} placeholder="https://" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea className="input" rows={3} value={form.notes}
          onChange={e => set('notes', e.target.value)}
          style={{ resize: 'none' }} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-ghost" disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ProvidersPage() {
  const { user } = useAuth()
  const [providers, setProviders] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProvider, setEditProvider] = useState(null)
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
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.contactName?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Head><title>Proveedores | CRM</title></Head>
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-4 lg:px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Proveedores</h1>
            {canWrite && (
              <button onClick={openNew} className="btn-primary">
                <Icons.plus className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline">Nuevo proveedor</span>
              </button>
            )}
          </div>
          <div className="relative">
            <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar proveedor…"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Icons.truck}
              title={search ? 'Sin resultados' : 'Sin proveedores'}
              description={search ? 'Prueba con otra búsqueda.' : 'Agrega tu primer proveedor para comenzar.'}
              action={!search && canWrite ? openNew : undefined}
              actionLabel="Nuevo proveedor"
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-4 lg:px-6 py-3 hover:bg-gray-50 transition-colors">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                    <span className="text-primary-700 font-semibold text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">{p.name}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {p.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500 flex-wrap">
                      {p.contactName && <span>{p.contactName}</span>}
                      {p.email && (
                        <a href={`mailto:${p.email}`} className="hover:text-primary-600 truncate max-w-[180px]">
                          {p.email}
                        </a>
                      )}
                      {p.phone && <span>{p.phone}</span>}
                      {p._count?.products > 0 && (
                        <span className="text-gray-400">
                          {p._count.products} producto{p._count.products !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {canWrite && (
                      <button
                        onClick={() => toggleActive(p)}
                        className="btn-ghost btn-sm hidden sm:inline-flex"
                        title={p.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {p.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                    {canWrite && (
                      <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Editar">
                        <Icons.edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar">
                        <Icons.trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editProvider ? 'Editar proveedor' : 'Nuevo proveedor'}
        size="md"
      >
        <ProviderForm
          provider={editProvider}
          onSave={handleSave}
          onClose={closeModal}
        />
      </Modal>
    </>
  )
}
