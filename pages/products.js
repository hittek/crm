import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Icons from '../components/ui/Icons'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../lib/AuthContext'

const UNITS = [
  { value: 'unit', label: 'Unidad' },
  { value: 'hr', label: 'Hora' },
  { value: 'service', label: 'Servicio' },
  { value: 'month', label: 'Mes' },
  { value: 'kg', label: 'kg' },
  { value: 'm', label: 'm' },
  { value: 'm2', label: 'm²' },
  { value: 'lt', label: 'Litro' },
]

function fmt(n) {
  return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function computePrice(cost, fee, margin) {
  const c = parseFloat(cost)
  if (isNaN(c) || c < 0) return null
  return c * (1 + (parseFloat(fee) || 0) / 100) * (1 + (parseFloat(margin) || 0) / 100)
}

// ── ProductForm (rendered inside <Modal>) ─────────────────────────────────────
function ProductForm({ product, providers, onSave, onClose }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    sku: product?.sku || '',
    type: product?.type || 'service',
    unit: product?.unit || 'service',
    providerId: product?.providerId?.toString() || '',
    costPrice: product?.costPrice?.toString() || '',
    feePercent: product?.feePercent?.toString() || '0',
    marginPercent: product?.marginPercent?.toString() || '0',
    sellingPrice: product?.sellingPrice?.toString() || '',
    currency: product?.currency || 'MXN',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isProduct = form.type === 'product'
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const derived = isProduct ? computePrice(form.costPrice, form.feePercent, form.marginPercent) : null

  // Keep sellingPrice in sync with derived value when in product mode
  useEffect(() => {
    if (isProduct && derived !== null) {
      setForm(f => ({ ...f, sellingPrice: derived.toFixed(2) }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.costPrice, form.feePercent, form.marginPercent, form.type])

  function switchType(t) {
    if (t === 'service') {
      setForm(f => ({ ...f, type: t, unit: 'service', providerId: '', costPrice: '', feePercent: '0', marginPercent: '0' }))
    } else {
      setForm(f => ({ ...f, type: t, unit: 'unit' }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nombre requerido'); return }
    const sp = parseFloat(form.sellingPrice)
    if (isNaN(sp) || sp < 0) { setError('Precio de venta requerido'); return }
    setSaving(true); setError(null)
    try {
      const body = {
        name: form.name.trim(),
        description: form.description || null,
        sku: form.sku || null,
        type: form.type,
        unit: form.unit,
        providerId: form.providerId ? parseInt(form.providerId) : null,
        costPrice: isProduct && form.costPrice !== '' ? parseFloat(form.costPrice) : null,
        feePercent: parseFloat(form.feePercent) || 0,
        marginPercent: parseFloat(form.marginPercent) || 0,
        sellingPrice: sp,
        currency: form.currency,
      }
      const url = product ? `/api/products/${product.id}` : '/api/products'
      const r = await fetch(url, {
        method: product ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

      {/* Type toggle */}
      <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
        {[['service', '🛠 Servicio'], ['product', '📦 Producto']].map(([t, l]) => (
          <button
            key={t} type="button" onClick={() => switchType(t)}
            className={`flex-1 py-2 font-medium transition-colors ${
              form.type === t ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >{l}</button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
        <input
          autoFocus className="input" type="text" value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder={isProduct ? 'Ej. Cable HDMI 2m' : 'Ej. Consultoría técnica'}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Código</label>
          <input className="input" type="text" value={form.sku}
            onChange={e => set('sku', e.target.value)} placeholder="Opcional" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
          <select className="input" value={form.unit} onChange={e => set('unit', e.target.value)}>
            {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea className="input" rows={2} value={form.description}
          onChange={e => set('description', e.target.value)} style={{ resize: 'none' }} />
      </div>

      {/* Product-only fields */}
      {isProduct && (
        <>
          {providers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <select className="input" value={form.providerId} onChange={e => set('providerId', e.target.value)}>
                <option value="">Sin proveedor</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estructura de precios</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Costo</label>
                <input className="input" type="number" min="0" step="0.01"
                  value={form.costPrice} onChange={e => set('costPrice', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Cargo %</label>
                <input className="input" type="number" min="0" max="999" step="0.1"
                  value={form.feePercent} onChange={e => set('feePercent', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Ganancia %</label>
                <input className="input" type="number" min="0" max="999" step="0.1"
                  value={form.marginPercent} onChange={e => set('marginPercent', e.target.value)} />
              </div>
            </div>
            {derived !== null && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-sm">
                <span className="text-gray-500">Precio calculado</span>
                <span className="font-semibold text-gray-900">{fmt(derived)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Selling price — always shown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Precio de venta *
          {isProduct && derived !== null && <span className="ml-1 text-gray-400 font-normal text-xs">(editable)</span>}
        </label>
        <div className="flex gap-2">
          <input
            className="input flex-1" type="number" min="0" step="0.01"
            value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)}
            placeholder="0.00"
          />
          <select className="input w-24" value={form.currency} onChange={e => set('currency', e.target.value)}>
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-ghost" disabled={saving}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { user } = useAuth()
  const [products, setProducts]   = useState([])
  const [providers, setProviders] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [provFilter, setProvFilter] = useState('')
  const [search, setSearch] = useState('')

  const canWrite = user?.role === 'admin' || user?.role === 'manager'
  const canDelete = user?.role === 'admin'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, pv] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/providers').then(r => r.json()),
      ])
      setProducts(Array.isArray(pr) ? pr : [])
      setProviders(Array.isArray(pv) ? pv : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openNew()  { setEditProduct(null); setShowModal(true) }
  function openEdit(p) { setEditProduct(p); setShowModal(true) }
  function closeModal() { setShowModal(false); setEditProduct(null) }

  function handleSave(saved) {
    setProducts(prev => {
      const exists = prev.find(p => p.id === saved.id)
      return exists ? prev.map(p => p.id === saved.id ? saved : p) : [saved, ...prev]
    })
    closeModal()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este producto/servicio?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  async function toggleActive(p) {
    const r = await fetch(`/api/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
    if (r.ok) {
      const updated = await r.json()
      setProducts(prev => prev.map(x => x.id === updated.id ? { ...x, isActive: updated.isActive } : x))
    }
  }

  const filtered = products.filter(p => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false
    if (provFilter && p.providerId?.toString() !== provFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <>
      <Head><title>Catálogo | CRM</title></Head>
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-4 lg:px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Catálogo</h1>
            {canWrite && (
              <button onClick={openNew} className="btn-primary">
                <Icons.plus className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline">Nuevo producto</span>
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap gap-2">
            {/* Type pills */}
            {[['all', 'Todos'], ['service', 'Servicios'], ['product', 'Productos']].map(([v, l]) => (
              <button
                key={v} onClick={() => setTypeFilter(v)}
                className={`filter-pill ${typeFilter === v ? 'filter-pill-active' : ''}`}
              >{l}</button>
            ))}

            {/* Provider filter */}
            {providers.length > 0 && (
              <select
                value={provFilter} onChange={e => setProvFilter(e.target.value)}
                className="input py-1.5 w-auto"
              >
                <option value="">Todos los proveedores</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}

            {/* Search */}
            <div className="relative flex-1 min-w-[160px]">
              <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9 py-1.5" type="text" value={search}
                onChange={e => setSearch(e.target.value)} placeholder="Buscar…"
              />
            </div>
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
              icon={Icons.package}
              title={search || typeFilter !== 'all' || provFilter ? 'Sin resultados' : 'Catálogo vacío'}
              description={
                search || typeFilter !== 'all' || provFilter
                  ? 'Prueba cambiando los filtros.'
                  : 'Agrega tu primer producto o servicio para comenzar.'
              }
              action={!search && typeFilter === 'all' && !provFilter && canWrite ? openNew : undefined}
              actionLabel="Nuevo producto"
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 lg:px-6 py-3 hover:bg-gray-50 transition-colors">
                  {/* Type icon */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    p.type === 'service' ? 'bg-blue-100' : 'bg-orange-100'
                  }`}>
                    {p.type === 'service'
                      ? <Icons.truck className="w-4 h-4 text-blue-600" />
                      : <Icons.package className="w-4 h-4 text-orange-600" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">{p.name}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.type === 'service' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {p.type === 'service' ? 'Servicio' : 'Producto'}
                      </span>
                      {!p.isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500 flex-wrap">
                      {p.sku && <span className="font-mono text-xs">{p.sku}</span>}
                      {p.provider?.name && <span>{p.provider.name}</span>}
                      <span className="capitalize">{p.unit}</span>
                      {p.costPrice != null && (
                        <span>Costo: {fmt(p.costPrice)}</span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0 mr-2 hidden sm:block">
                    <div className="font-semibold text-gray-900">{fmt(p.sellingPrice)}</div>
                    <div className="text-xs text-gray-400">{p.currency}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {canWrite && (
                      <button
                        onClick={() => toggleActive(p)}
                        className="btn-ghost btn-sm hidden sm:inline-flex"
                      >
                        {p.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                    {canWrite && (
                      <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        <Icons.edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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
        title={editProduct ? 'Editar producto/servicio' : 'Nuevo producto/servicio'}
        size="md"
      >
        <ProductForm
          product={editProduct}
          providers={providers}
          onSave={handleSave}
          onClose={closeModal}
        />
      </Modal>
    </>
  )
}
