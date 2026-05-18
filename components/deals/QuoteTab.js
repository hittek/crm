import { useState, useEffect, useCallback } from 'react'
import Icons from '../ui/Icons'
import { Spinner } from '../ui/Spinner'
import { useAuth } from '../../lib/AuthContext'
import { useI18n } from '../../lib/i18n'

// ── helpers ────────────────────────────────────────────────────────────────────
function fmt(n, currency = 'MXN') {
  return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency })
}

const STATUS_CONFIG = {
  draft:    { cls: 'bg-gray-100 text-gray-600' },
  sent:     { cls: 'bg-blue-100 text-blue-700' },
  accepted: { cls: 'bg-green-100 text-green-700' },
  rejected: { cls: 'bg-red-100 text-red-700' },
  expired:  { cls: 'bg-orange-100 text-orange-700' },
}

const UNIT_LABELS = {
  unit: 'Unidad', hr: 'Hora', service: 'Servicio', month: 'Mes',
  kg: 'kg', m: 'm', m2: 'm²', lt: 'Litro',
}




let _seq = 0
function uid() { return `item-${Date.now()}-${++_seq}` }

function makeItem(overrides = {}) {
  return { _id: uid(), productId: null, description: '', sku: '', unit: 'unit', qty: 1, unitPrice: 0, ivaPercent: 16, ivaAmount: 0, total: 0, ...overrides }
}

// ── StatusBadge ────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const { t } = useI18n()
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  const labels = {
    draft:    t('dealsExt.quoteStatuses.draft'),
    sent:     t('dealsExt.quoteStatuses.sent'),
    accepted: t('dealsExt.quoteStatuses.accepted'),
    rejected: t('dealsExt.quoteStatuses.rejected'),
    expired:  t('dealsExt.quoteStatuses.expired'),
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {labels[status] || status}
    </span>
  )
}

// ── CatalogPicker ──────────────────────────────────────────────────────────────
function CatalogPicker({ products, onSelect, onClose }) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const filtered = products.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)
  })

  return (
    <div className="border border-primary-200 rounded-lg bg-primary-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-primary-800">Seleccionar del catálogo</span>
        <button onClick={onClose} className="p-1 text-primary-400 hover:text-primary-700 rounded">
          <Icons.close className="w-4 h-4" />
        </button>
      </div>
      <input
        autoFocus
        className="input text-sm py-1.5"
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t('common.search')}
      />
      <div className="max-h-48 overflow-y-auto space-y-0.5 -mx-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-center text-gray-400 py-3">{t('common.noResults')}</p>
        ) : filtered.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="w-full text-left flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white transition-colors"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
              {p.sku && <div className="text-xs text-gray-400 font-mono">{p.sku}</div>}
              <div className="text-xs text-gray-400">{t(`products.units.${p.unit}`) || p.unit}</div>
            </div>
            <div className="text-right shrink-0 ml-3">
              <div className="text-sm font-semibold text-gray-800">
                {Number(p.sellingPrice || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── LineItemRow ────────────────────────────────────────────────────────────────
function LineItemRow({ item, idx, onUpdate, onRemove, onPickCatalog }) {
  const { t } = useI18n()
  return (
    <div className="border border-gray-200 rounded-lg p-2.5 space-y-2 bg-white">
      {/* Name row */}
      <div className="flex items-start gap-1.5">
        <div className="flex-1 min-w-0">
          <input
            className="w-full text-sm font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none pb-0.5"
            value={item.description}
            onChange={e => onUpdate(idx, 'description', e.target.value)}
            placeholder={t('quotes.description')}
          />
          {item.sku && (
            <span className="text-xs text-gray-400 font-mono block mt-0.5">{item.sku}</span>
          )}
        </div>
        <button
          onClick={onPickCatalog}
          className="p-1 text-gray-300 hover:text-primary-500 rounded transition-colors"
          title="Seleccionar del catálogo"
        >
          <Icons.package className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onRemove(idx)}
          className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
          title={t('common.delete')}
        >
          <Icons.close className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Qty / Price / IVA / Total */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <label className="text-gray-400 block mb-0.5">{t('quotes.qty')}</label>
          <input
            type="number" min="0" step="1"
            className="w-full border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:border-primary-500"
            value={item.qty}
            onChange={e => onUpdate(idx, 'qty', e.target.value)}
          />
        </div>
        <div>
          <label className="text-gray-400 block mb-0.5">{t('quotes.unitPrice')}</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:border-primary-500"
            value={item.unitPrice}
            onChange={e => onUpdate(idx, 'unitPrice', e.target.value)}
          />
        </div>
        <div>
          <label className="text-gray-400 block mb-0.5">IVA %</label>
          <select
            className="w-full border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-primary-500 bg-white"
            value={item.ivaPercent ?? 16}
            onChange={e => onUpdate(idx, 'ivaPercent', e.target.value)}
          >
            <option value={16}>16%</option>
            <option value={0}>0%</option>
          </select>
        </div>
        <div>
          <label className="text-gray-400 block mb-0.5">{t('quotes.total')}</label>
          <div className="w-full border border-gray-100 bg-gray-50 rounded px-2 py-1 text-right font-semibold text-gray-900">
            {fmt(item.total)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── QuoteForm ──────────────────────────────────────────────────────────────────
function QuoteForm({ dealId, contactId, quote, products, onSave, onCancel }) {
  const { t } = useI18n()
  const [items, setItems] = useState(() =>
    quote ? quote.items.map(it => ({
      ...it,
      _id: uid(),
      // backward compat: old items may not have ivaPercent
      ivaPercent: it.ivaPercent ?? Math.round((quote.taxRate || 0) * 100),
      ivaAmount:  it.ivaAmount  ?? parseFloat(((it.total || 0) * (it.ivaPercent ?? quote.taxRate ?? 0)).toFixed(4)),
    })) : [makeItem()]
  )
  const [currency, setCurrency] = useState(quote?.currency ?? 'MXN')
  const [notes, setNotes] = useState(quote?.notes ?? '')
  const [validUntil, setValidUntil] = useState(
    quote?.validUntil ? quote.validUntil.slice(0, 10) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [catalogTarget, setCatalogTarget] = useState(null) // idx | 'new' | null

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.total) || 0), 0)
  const tax      = items.reduce((s, it) => s + (parseFloat(it.ivaAmount) || 0), 0)
  const total    = subtotal + tax

  function updateItem(idx, key, value) {
    setItems(prev => {
      const next = [...prev]
      const item = { ...next[idx], [key]: value }
      if (key === 'qty' || key === 'unitPrice' || key === 'ivaPercent') {
        const qty   = parseFloat(key === 'qty'       ? value : item.qty)       || 0
        const price = parseFloat(key === 'unitPrice' ? value : item.unitPrice) || 0
        const iva   = parseFloat(key === 'ivaPercent'? value : item.ivaPercent)|| 0
        item.total     = parseFloat((qty * price).toFixed(4))
        item.ivaAmount = parseFloat((item.total * iva / 100).toFixed(4))
      }
      next[idx] = item
      return next
    })
  }

  function addFromCatalog(product) {
    const price = parseFloat(product.sellingPrice) || 0
    const iva   = product.ivaPercent ?? 16
    const newItem = makeItem({
      productId:   product.id,
      description: product.name,
      sku:         product.sku || '',
      unit:        product.unit || 'unit',
      qty:         1,
      unitPrice:   price,
      ivaPercent:  iva,
      ivaAmount:   parseFloat((price * iva / 100).toFixed(4)),
      total:       price,
      imageUrl:    product.imageUrl || null,
    })
    if (catalogTarget !== null && catalogTarget !== 'new') {
      setItems(prev => prev.map((it, i) => i === catalogTarget ? newItem : it))
    } else {
      setItems(prev => [...prev, newItem])
    }
    setCatalogTarget(null)
  }

  async function handleSave() {
    if (items.length === 0) { setError(t('dealsExt.addItem')); return }
    const hasEmpty = items.some(it => !it.description.trim())
    if (hasEmpty) { setError(t('dealsExt.itemNeedsDesc')); return }    setSaving(true); setError(null)
    try {
      const cleanItems = items.map(({ _id, ...rest }) => rest)
      const body = {
        dealId, contactId,
        items: cleanItems,
        currency,
        notes: notes.trim() || null,
        validUntil: validUntil || null,
      }
      const url = quote ? `/api/quotes/${quote.id}` : '/api/quotes'
      const r = await fetch(url, {
        method: quote ? 'PATCH' : 'POST',
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
    <div className="space-y-4">
      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Catalog picker overlay */}
      {catalogTarget !== null && (
        <CatalogPicker
          products={products}
          onSelect={addFromCatalog}
          onClose={() => setCatalogTarget(null)}
        />
      )}

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('quotes.items')}</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setCatalogTarget('new')}
              className="btn-ghost btn-sm inline-flex items-center gap-1 text-xs"
            >
              <Icons.package className="w-3 h-3" />
              <span className="hidden sm:inline">Catálogo</span>
            </button>
            <button
              onClick={() => setItems(prev => [...prev, makeItem()])}
              className="btn-ghost btn-sm inline-flex items-center gap-1 text-xs"
            >
              <Icons.plus className="w-3 h-3" />
              <span className="hidden sm:inline">Libre</span>
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div
            onClick={() => setCatalogTarget('new')}
            className="text-center py-6 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 hover:text-primary-500 transition-colors"
          >
            Sin ítems — haz clic para agregar
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <LineItemRow
                key={item._id}
                item={item}
                idx={idx}
                onUpdate={updateItem}
                onRemove={idx => setItems(prev => prev.filter((_, i) => i !== idx))}
                onPickCatalog={() => setCatalogTarget(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Totals summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{t('quotes.subtotal')}</span>
          <span>{fmt(subtotal, currency)}</span>
        </div>
        {/* IVA breakdown by rate */}
        {(() => {
          const groups = {}
          items.forEach(it => {
            const pct = parseFloat(it.ivaPercent) || 0
            groups[pct] = (groups[pct] || 0) + (parseFloat(it.ivaAmount) || 0)
          })
          return Object.entries(groups)
            .sort(([a], [b]) => b - a)
            .map(([pct, amt]) => (
              <div key={pct} className="flex justify-between text-gray-500">
                <span>IVA {pct}%</span>
                <span>{fmt(amt, currency)}</span>
              </div>
            ))
        })()}
        <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5">
          <span>{t('quotes.total')}</span>
          <span>{fmt(total, currency)}</span>
        </div>
      </div>

      {/* Notes + meta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('quotes.notes')}</label>
          <textarea
            className="input text-sm"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Condiciones, tiempo de entrega, garantía…"
            style={{ resize: 'none' }}
          />
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Válida hasta</label>
            <input
              type="date"
              className="input text-sm"
              value={validUntil}
              onChange={e => setValidUntil(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
            <select
              className="input text-sm"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
            >
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
        <button onClick={onCancel} className="btn-ghost" disabled={saving}>{t('common.cancel')}</button>
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          {saving ? t('common.saving') : quote ? t('dealsExt.quoteActions.update') : t('dealsExt.quoteActions.saveDraft')}
        </button>
      </div>
    </div>
  )
}

// ── QuoteCard ──────────────────────────────────────────────────────────────────
function QuoteCard({ quote, canWrite, canDelete, onEdit, onDelete, onStatusChange }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [shareUrl, setShareUrl] = useState(quote.shareToken ? `/q/${quote.shareToken}` : null)
  const [sharing, setSharing]   = useState(false)
  const [copied, setCopied]     = useState(false)
  const NEXT_STATUSES = {
    draft:    [{ value: 'sent',     label: t('dealsExt.quoteActions.markSent'),  style: 'ghost' }],
    sent:     [{ value: 'accepted', label: t('dealsExt.quoteActions.accept'),    style: 'primary' },
               { value: 'rejected', label: t('dealsExt.quoteActions.reject'),   style: 'danger' }],
    accepted: [],
    rejected: [],
    expired:  [],
  }
  const nextStatuses = NEXT_STATUSES[quote.status] || []

  async function changeStatus(value) {
    setBusy(true)
    await onStatusChange(quote.id, value)
    setBusy(false)
  }

  async function handleShare() {
    setSharing(true)
    const r = await fetch(`/api/quotes/${quote.id}/share`, { method: 'POST' })
    const data = await r.json()
    if (r.ok) setShareUrl(data.url)
    setSharing(false)
  }

  async function copyUrl() {
    const url = shareUrl.startsWith('http') ? shareUrl : `${window.location.origin}${shareUrl}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2.5 hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{quote.number}</span>
            <StatusBadge status={quote.status} />
          </div>
          <div className="text-xs text-gray-400 mt-0.5 space-x-2">
            <span>{new Date(quote.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {quote.validUntil && (
              <span>· Válida hasta {new Date(quote.validUntil).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-semibold text-gray-900 text-sm">{fmt(quote.total, quote.currency)}</div>
          <div className="text-xs text-gray-400">
            {quote.items.length} ítem{quote.items.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Line items preview */}
      {quote.items.length > 0 && (
        <div className="text-xs text-gray-500 space-y-0.5 border-t border-gray-100 pt-2">
          {quote.items.slice(0, 3).map((it, i) => (
            <div key={i} className="flex justify-between">
              <span className="truncate max-w-[60%]">{it.qty}× {it.description}</span>
              <span>{fmt(it.total, quote.currency)}</span>
            </div>
          ))}
          {quote.items.length > 3 && (
            <div className="text-gray-400">+{quote.items.length - 3} más…</div>
          )}
        </div>
      )}

      {/* Notes */}
      {quote.notes && (
        <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-1.5 line-clamp-2">
          {quote.notes}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-wrap border-t border-gray-100 pt-2">
        {nextStatuses.map(ns => (
          <button
            key={ns.value}
            onClick={() => changeStatus(ns.value)}
            disabled={busy}
            className={`btn-sm text-xs inline-flex items-center gap-1 ${
              ns.style === 'primary' ? 'btn-primary' :
              ns.style === 'danger'  ? 'border border-red-200 text-red-600 hover:bg-red-50 rounded-lg px-2 py-1' :
              'btn-ghost'
            }`}
          >
            {ns.label}
          </button>
        ))}

        {canWrite && quote.status === 'draft' && (
          <button
            onClick={() => onEdit(quote)}
            className="btn-ghost btn-sm inline-flex items-center gap-1 text-xs"
          >
            <Icons.edit className="w-3 h-3" />
            {t('common.edit')}
          </button>
        )}

        {/* Share / copy link */}
        <button
          onClick={shareUrl ? copyUrl : handleShare}
          disabled={sharing}
          className="btn-ghost btn-sm inline-flex items-center gap-1 text-xs"
          title={shareUrl ? t('dealsExt.copyLink') : t('dealsExt.generateLink')}
        >
          <Icons.external className="w-3 h-3" />
          {sharing ? '…' : copied ? t('dealsExt.copied') : shareUrl ? t('dealsExt.copyLink') : t('dealsExt.shareQuote')}
        </button>

        {canDelete && (
          <button
            onClick={() => onDelete(quote.id)}
            className="ml-auto p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title={t('quotes.deleteQuote')}
          >
            <Icons.trash className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── QuoteTab (main export) ─────────────────────────────────────────────────────
export default function QuoteTab({ deal }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const [quotes, setQuotes] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuote, setEditingQuote] = useState(null)

  const canWrite = ['admin', 'manager', 'agent'].includes(user?.role)
  const canDelete = ['admin', 'manager'].includes(user?.role)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [qRes, pRes] = await Promise.all([
        fetch(`/api/quotes?dealId=${deal.id}`),
        fetch('/api/products'),
      ])
      const [qData, pData] = await Promise.all([qRes.json(), pRes.json()])
      setQuotes(Array.isArray(qData) ? qData : [])
      setProducts(Array.isArray(pData) ? pData.filter(p => p.isActive !== false) : [])
    } finally {
      setLoading(false)
    }
  }, [deal.id])

  useEffect(() => { load() }, [load])

  function handleSave(saved) {
    setQuotes(prev => {
      const exists = prev.find(q => q.id === saved.id)
      return exists ? prev.map(q => q.id === saved.id ? saved : q) : [saved, ...prev]
    })
    setShowForm(false)
    setEditingQuote(null)
  }

  async function handleDelete(id) {
    if (!confirm(t('quotes.deleteConfirm'))) return
    await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
    setQuotes(prev => prev.filter(q => q.id !== id))
  }

  async function handleStatusChange(id, status) {
    const r = await fetch(`/api/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (r.ok) {
      const updated = await r.json()
      setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    )
  }

  // ── Form view ────────────────────────────────────────────────────────────────
  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowForm(false); setEditingQuote(null) }}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <Icons.chevronLeft className="w-4 h-4" />
          </button>
          <h4 className="text-sm font-semibold text-gray-900">
            {editingQuote ? `${t('common.edit')} ${editingQuote.number}` : 'Nueva cotización'}
          </h4>
        </div>
        <QuoteForm
          dealId={deal.id}
          contactId={deal.contactId}
          quote={editingQuote}
          products={products}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingQuote(null) }}
        />
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          {t('quotes.title')}{quotes.length > 0 && (
            <span className="ml-1 text-gray-400 font-normal">({quotes.length})</span>
          )}
        </span>
        {canWrite && (
          <button
            onClick={() => { setEditingQuote(null); setShowForm(true) }}
            className="btn-ghost btn-sm inline-flex items-center gap-1 text-xs"
          >
            <Icons.plus className="w-3.5 h-3.5" />
            Nueva
          </button>
        )}
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-10">
          <Icons.fileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">{t('quotes.noQuotes')}</p>
          {canWrite && (
            <button
              onClick={() => { setEditingQuote(null); setShowForm(true) }}
              className="mt-3 text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Crear primera cotización
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {quotes.map(q => (
            <QuoteCard
              key={q.id}
              quote={q}
              canWrite={canWrite}
              canDelete={canDelete}
              onEdit={q => { setEditingQuote(q); setShowForm(true) }}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}
