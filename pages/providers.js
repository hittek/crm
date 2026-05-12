import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import Icons from '../components/ui/Icons'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../lib/AuthContext'

const UNIT_LABELS = {
  m2: 'm²', m: 'm', unidad: 'Unidad', rollo: 'Rollo', kg: 'kg',
  par: 'Par', juego: 'Juego', mes: 'Mes', servicio: 'Servicio',
  lt: 'Litro', hr: 'Hora', pieza: 'Pieza',
}

// ── ImportModal — multi-step PDF price list import ────────────────────────────
function ImportModal({ provider, onDone, onClose }) {
  const fileRef      = useRef(null)
  const [step, setStep]     = useState('upload')   // upload | extracting | review | importing | done
  const [error, setError]   = useState(null)
  const [rows, setRows]     = useState([])          // extracted rows (mutable)
  const [selected, setSelected] = useState(new Set()) // _id set of checked rows
  const [search, setSearch] = useState('')
  const [result, setResult] = useState(null)        // { imported, updated }
  const [extractMeta, setExtractMeta] = useState(null) // { mode, warning }

  // ── Step 1: upload ────────────────────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se aceptan archivos PDF'); return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('El archivo excede el límite de 20 MB'); return
    }
    setError(null)
    setStep('extracting')

    const fd = new FormData()
    fd.append('file', file)

    try {
      const r = await fetch(`/api/providers/${provider.id}/extract-prices`, {
        method: 'POST', body: fd,
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Error al analizar el PDF'); setStep('upload'); return }
      if (!data.rows?.length) {
        setError('No se encontraron productos en el PDF. Verifica que sea una lista de precios.')
        setStep('upload'); return
      }
      const all = data.rows
      setRows(all)
      setSelected(new Set(all.map(r => r._id)))
      setExtractMeta({ mode: data.mode, warning: data.warning || null })
      setStep('review')
    } catch (err) {
      setError(`Error de red: ${err.message}`); setStep('upload')
    }
  }

  // ── Step 3: review helpers ────────────────────────────────────────────────
  function updateRow(id, field, value) {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r))
  }

  function toggleRow(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = rows.filter(r =>
    !search ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const allVisible    = filtered.length > 0 && filtered.every(r => selected.has(r._id))
  const someVisible   = filtered.some(r => selected.has(r._id))

  function toggleAll() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allVisible) { filtered.forEach(r => next.delete(r._id)) }
      else            { filtered.forEach(r => next.add(r._id)) }
      return next
    })
  }

  // ── Step 4: import ────────────────────────────────────────────────────────
  async function handleImport() {
    const toSend = rows.filter(r => selected.has(r._id))
    if (!toSend.length) return
    setStep('importing')
    setError(null)

    try {
      const r = await fetch(`/api/providers/${provider.id}/import-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: toSend }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Error al importar'); setStep('review'); return }
      setResult(data)
      setStep('done')
      onDone()
    } catch (err) {
      setError(`Error de red: ${err.message}`); setStep('review')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Sube la lista de precios PDF de <strong>{provider.name}</strong>. Claude extraerá los productos automáticamente.
          </p>
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
          >
            <Icons.upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">Arrastra tu PDF aquí o haz clic para seleccionar</p>
            <p className="text-xs text-gray-400 mt-1">Máx. 20 MB</p>
          </div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      )}

      {/* Extracting */}
      {step === 'extracting' && (
        <div className="py-12 text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-gray-700">Analizando lista de precios…</p>
          <p className="text-xs text-gray-400">Claude está extrayendo los productos. Puede tomar hasta 30 segundos.</p>
        </div>
      )}

      {/* Review */}
      {step === 'review' && (
        <div className="space-y-3">
          {extractMeta?.warning && (
            <div className="flex gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <Icons.alert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{extractMeta.warning}</span>
            </div>
          )}
          {extractMeta?.mode === 'vision' && !extractMeta?.warning && (
            <div className="flex gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <Icons.eye className="w-4 h-4 mt-0.5 shrink-0" />
              <span>PDF escaneado detectado — se usó visión para extraer los datos. Revisa con cuidado.</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-gray-600">
              <strong>{selected.size}</strong> de {rows.length} productos seleccionados
            </div>
            <div className="relative">
              <Icons.search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                className="input pl-8 py-1.5 text-sm w-48"
                placeholder="Buscar…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Table header — hidden on mobile, shown sm+ */}
            <div className="hidden sm:grid sm:grid-cols-[32px_1fr_80px_80px_100px] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
              <div className="flex items-center">
                <input type="checkbox" className="rounded"
                  checked={allVisible} ref={el => el && (el.indeterminate = !allVisible && someVisible)}
                  onChange={toggleAll} />
              </div>
              <div>Nombre / SKU</div>
              <div>Unidad</div>
              <div className="text-right">Precio</div>
              <div></div>
            </div>
            {/* Mobile-only: select-all row */}
            <div className="sm:hidden flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
              <input type="checkbox" className="rounded"
                checked={allVisible} ref={el => el && (el.indeterminate = !allVisible && someVisible)}
                onChange={toggleAll} />
              <span className="text-xs text-gray-500">Seleccionar todos los visibles</span>
            </div>

            {/* Table body */}
            <div className="divide-y divide-gray-100 max-h-[40vh] overflow-y-auto">
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-sm text-gray-400 text-center">Sin resultados</div>
              )}
              {filtered.map(row => (
                <div key={row._id} className={selected.has(row._id) ? '' : 'opacity-40'}>
                  {/* Desktop row (sm+) */}
                  <div className="hidden sm:grid sm:grid-cols-[32px_1fr_80px_80px_100px] gap-2 px-3 py-2 items-start text-sm">
                    <div className="pt-1">
                      <input type="checkbox" className="rounded"
                        checked={selected.has(row._id)}
                        onChange={() => toggleRow(row._id)} />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <input
                        className="w-full text-sm font-medium text-gray-900 bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none px-0 py-0"
                        value={row.name}
                        onChange={e => updateRow(row._id, 'name', e.target.value)}
                      />
                      {row.sku && (
                        <input
                          className="w-full text-xs text-gray-400 bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none px-0 py-0"
                          value={row.sku}
                          onChange={e => updateRow(row._id, 'sku', e.target.value)}
                          placeholder="SKU"
                        />
                      )}
                    </div>
                    <div>
                      <select
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:border-primary-500 w-full"
                        value={row.unit}
                        onChange={e => updateRow(row._id, 'unit', e.target.value)}
                      >
                        {Object.entries(UNIT_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number" step="0.01" min="0"
                        className="text-xs text-right border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:border-primary-500 w-full"
                        value={row.costPrice ?? ''}
                        placeholder="—"
                        onChange={e => updateRow(row._id, 'costPrice', e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        onClick={() => { setRows(prev => prev.filter(r => r._id !== row._id)); setSelected(prev => { const n = new Set(prev); n.delete(row._id); return n }) }}
                        title="Eliminar fila"
                      >
                        <Icons.close className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile row (stacked card) */}
                  <div className="sm:hidden px-3 py-2.5 space-y-2">
                    <div className="flex items-start gap-2">
                      <input type="checkbox" className="rounded mt-1 shrink-0"
                        checked={selected.has(row._id)}
                        onChange={() => toggleRow(row._id)} />
                      <div className="flex-1 min-w-0">
                        <input
                          className="w-full text-sm font-medium text-gray-900 bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none px-0 py-0"
                          value={row.name}
                          onChange={e => updateRow(row._id, 'name', e.target.value)}
                        />
                        {row.sku && (
                          <input
                            className="w-full text-xs text-gray-400 bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none px-0 py-0 mt-0.5"
                            value={row.sku}
                            onChange={e => updateRow(row._id, 'sku', e.target.value)}
                            placeholder="SKU"
                          />
                        )}
                      </div>
                      <button
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                        onClick={() => { setRows(prev => prev.filter(r => r._id !== row._id)); setSelected(prev => { const n = new Set(prev); n.delete(row._id); return n }) }}
                      >
                        <Icons.close className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-2 pl-6">
                      <select
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:border-primary-500 flex-1"
                        value={row.unit}
                        onChange={e => updateRow(row._id, 'unit', e.target.value)}
                      >
                        {Object.entries(UNIT_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <input
                        type="number" step="0.01" min="0"
                        className="text-xs text-right border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:border-primary-500 w-28"
                        value={row.costPrice ?? ''}
                        placeholder="Precio"
                        onChange={e => updateRow(row._id, 'costPrice', e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button onClick={() => { setStep('upload'); setRows([]); setSelected(new Set()); setSearch('') }}
              className="btn-ghost text-sm">
              ← Cambiar archivo
            </button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="btn-primary disabled:opacity-50"
            >
              Importar {selected.size} producto{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Importing */}
      {step === 'importing' && (
        <div className="py-12 text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-gray-700">Importando productos…</p>
        </div>
      )}

      {/* Done */}
      {step === 'done' && result && (
        <div className="py-8 text-center space-y-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Icons.check className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">¡Importación completa!</p>
            <p className="text-sm text-gray-500 mt-1">
              {result.imported > 0 && <span>{result.imported} producto{result.imported !== 1 ? 's' : ''} nuevos</span>}
              {result.imported > 0 && result.updated > 0 && <span> · </span>}
              {result.updated > 0 && <span>{result.updated} actualizados</span>}
            </p>
          </div>
          <button onClick={onClose} className="btn-primary">Listo</button>
        </div>
      )}
    </div>
  )
}

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
  const [importProvider, setImportProvider] = useState(null)
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
  function openImport(p) { setImportProvider(p) }
  function closeImport() { setImportProvider(null) }

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
                        onClick={() => openImport(p)}
                        className="btn-ghost btn-sm inline-flex items-center gap-1.5"
                        title="Importar lista de precios"
                      >
                        <Icons.upload className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Importar precios</span>
                      </button>
                    )}
                    {canWrite && (
                      <button
                        onClick={() => toggleActive(p)}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        title={p.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {p.isActive
                          ? <Icons.eyeOff className="w-4 h-4" />
                          : <Icons.eye className="w-4 h-4" />
                        }
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

      <Modal
        isOpen={!!importProvider}
        onClose={closeImport}
        title={`Importar lista de precios — ${importProvider?.name ?? ''}`}
        size="xl"
      >
        {importProvider && (
          <ImportModal
            provider={importProvider}
            onDone={load}
            onClose={closeImport}
          />
        )}
      </Modal>
    </>
  )
}
