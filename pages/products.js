import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Icons from '../components/ui/Icons'
import { useAuth } from '../lib/AuthContext'
import { PageLoader } from '../components/ui/Spinner'
import { useModalClose } from '../components/ui/Modal'

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
  if (cost == null || cost === '' || isNaN(parseFloat(cost))) return null
  const c = parseFloat(cost)
  const f = parseFloat(fee) || 0
  const m = parseFloat(margin) || 0
  return c * (1 + f / 100) * (1 + m / 100)
}

// ── ProductModal ──────────────────────────────────────────────────────────────
function ProductModal({ product, providers, onClose, onSave }) {
  const isService = (type) => type === 'service'

  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    sku: product?.sku || '',
    type: product?.type || 'service',
    unit: product?.unit || 'unit',
    providerId: product?.providerId?.toString() || '',
    costPrice: product?.costPrice?.toString() || '',
    feePercent: product?.feePercent?.toString() || '0',
    marginPercent: product?.marginPercent?.toString() || '0',
    sellingPrice: product?.sellingPrice?.toString() || '',
    currency: product?.currency || 'MXN',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  useModalClose(onClose)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-compute selling price when product type and cost fields change
  const derived = isService(form.type)
    ? null
    : computePrice(form.costPrice, form.feePercent, form.marginPercent)

  // Keep sellingPrice in sync with derived when in product mode
  useEffect(() => {
    if (!isService(form.type) && derived !== null) {
      setForm(f => ({ ...f, sellingPrice: derived.toFixed(2) }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.costPrice, form.feePercent, form.marginPercent, form.type])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nombre requerido'); return }
    if (!form.sellingPrice || parseFloat(form.sellingPrice) < 0) {
      setError('Precio de venta requerido'); return
    }
    setSaving(true); setError(null)
    try {
      const body = {
        name: form.name.trim(),
        description: form.description || null,
        sku: form.sku || null,
        type: form.type,
        unit: form.unit,
        providerId: form.providerId ? parseInt(form.providerId) : null,
        costPrice: isService(form.type) ? null : (form.costPrice !== '' ? parseFloat(form.costPrice) : null),
        feePercent: parseFloat(form.feePercent) || 0,
        marginPercent: parseFloat(form.marginPercent) || 0,
        sellingPrice: parseFloat(form.sellingPrice),
        currency: form.currency,
      }
      const url = product ? `/api/products/${product.id}` : '/api/products'
      const method = product ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {product ? 'Editar producto/servicio' : 'Nuevo producto/servicio'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <Icons.close className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            {/* Type selector */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {['service', 'product'].map(t => (
                <button
                  key={t} type="button"
                  onClick={() => {
                    set('type', t)
                    // Reset product-only fields when switching to service
                    if (t === 'service') {
                      setForm(f => ({ ...f, type: t, providerId: '', costPrice: '', feePercent: '0', marginPercent: '0' }))
                    } else {
                      setForm(f => ({ ...f, type: t, unit: 'unit' }))
                    }
                  }}
                  className={`flex-1 py-2 font-medium transition-colors ${
                    form.type === t
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t === 'service' ? '🛠 Servicio' : '📦 Producto'}
                </button>
              ))}
            </div>

            {/* Basic fields */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input
                autoFocus type="text" value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                placeholder={isService(form.type) ? 'Ej. Consultoría técnica' : 'Ej. Cable HDMI 2m'}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SKU / Código</label>
                <input
                  type="text" value={form.sku}
                  onChange={e => set('sku', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
                <select
                  value={form.unit} onChange={e => set('unit', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                >
                  {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
              <textarea
                rows={2} value={form.description}
                onChange={e => set('description', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
              />
            </div>

            {/* Product-only: provider + cost pricing */}
            {!isService(form.type) && (
              <>
                {providers.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
                    <select
                      value={form.providerId} onChange={e => set('providerId', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                    >
                      <option value="">Sin proveedor</option>
                      {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estructura de precios</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Costo</label>
                      <input
                        type="number" min="0" step="0.01" value={form.costPrice}
                        onChange={e => set('costPrice', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Cargo %</label>
                      <input
                        type="number" min="0" max="999" step="0.1" value={form.feePercent}
                        onChange={e => set('feePercent', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Ganancia %</label>
                      <input
                        type="number" min="0" max="999" step="0.1" value={form.marginPercent}
                        onChange={e => set('marginPercent', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                    </div>
                  </div>
                  {derived !== null && (
                    <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-200">
                      <span className="text-gray-500">Precio calculado</span>
                      <span className="font-semibold text-gray-900">{fmt(derived)}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Selling price — always shown; auto-filled for products, manual for services */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Precio de venta *
                {!isService(form.type) && derived !== null && (
                  <span className="ml-1 text-gray-400 font-normal">(editable)</span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number" min="0" step="0.01" value={form.sellingPrice}
                  onChange={e => set('sellingPrice', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                  placeholder="0.00"
                />
                <select
                  value={form.currency} onChange={e => set('currency', e.target.value)}
                  className="px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>Cancelar</button>
          <button form="product-form" type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
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
  const [filter, setFilter]       = useState('all')   // all | service | product
  const [provFilter, setProvFilter] = useState('')
  const [search, setSearch]       = useState('')

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

  function openNew() { setEditProduct(null); setShowModal(true) }
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
    if (!confirm('¿Eliminar este producto?')) return
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
    if (filter !== 'all' && p.type !== filter) return false
    if (provFilter && p.providerId?.toString() !== provFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    }
    return true
  })

  if (loading) return <PageLoader />

  return (
    <>
      <Head><title>Productos y Servicios</title></Head>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Catálogo</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {products.length} item{products.length !== 1 ? 's' : ''}
            </p>
          </div>
          {canWrite && (
            <button onClick={openNew} className="btn-primary flex items-center gap-2 self-start">
              <Icons.plus className="w-4 h-4" />
              Nuevo producto/servicio
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Type filter tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {[['all', 'Todos'], ['service', 'Servicios'], ['product', 'Productos']].map(([v, l]) => (
              <button
                key={v} onClick={() => setFilter(v)}
                className={`px-3 py-1.5 transition-colors ${
                  filter === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >{l}</button>
            ))}
          </div>

          {/* Provider filter */}
          {providers.length > 0 && (
            <select
              value={provFilter} onChange={e => setProvFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos los proveedores</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          {/* Search */}
          <div className="relative flex-1 min-w-40">
            <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            {search || filter !== 'all' || provFilter ? 'Sin resultados' : (
              <div className="space-y-2">
                <Icons.package className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm">Catálogo vacío</p>
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Proveedor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Unidad</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Costo</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Precio venta</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      {p.sku && <div className="text-xs text-gray-400 mt-0.5">{p.sku}</div>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.type === 'service'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-orange-50 text-orange-700'
                      }`}>
                        {p.type === 'service' ? '🛠 Servicio' : '📦 Producto'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {p.provider?.name || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell capitalize">
                      {p.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden lg:table-cell">
                      {p.costPrice != null ? fmt(p.costPrice) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {fmt(p.sellingPrice)}
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
                          >
                            <Icons.edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
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
        <ProductModal
          product={editProduct}
          providers={providers}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </>
  )
}
