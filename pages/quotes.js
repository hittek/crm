import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Icons from '../components/ui/Icons'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../lib/AuthContext'
import QuoteTab from '../components/deals/QuoteTab'

// ── helpers ────────────────────────────────────────────────────────────────────
function fmt(n, currency = 'MXN') {
  return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency })
}

const STATUS_CONFIG = {
  draft:    { label: 'Borrador',  cls: 'bg-gray-100 text-gray-600' },
  sent:     { label: 'Enviada',   cls: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Aceptada',  cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazada', cls: 'bg-red-100 text-red-700' },
  expired:  { label: 'Vencida',   cls: 'bg-orange-100 text-orange-700' },
}

const NEXT_STATUSES = {
  draft:    [{ value: 'sent',     label: 'Marcar enviada' }],
  sent:     [{ value: 'accepted', label: 'Aceptar' }, { value: 'rejected', label: 'Rechazar' }],
  accepted: [],
  rejected: [],
  expired:  [],
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ── QuoteDetailModal ───────────────────────────────────────────────────────────
function QuoteDetailModal({ quote, products, onClose, onUpdate, onDelete }) {
  const { user } = useAuth()
  const [q, setQ] = useState(quote)
  const [busy, setBusy] = useState(false)
  const canWrite = ['admin', 'manager', 'agent'].includes(user?.role)
  const canDelete = ['admin', 'manager'].includes(user?.role)

  const nextStatuses = NEXT_STATUSES[q.status] || []

  async function changeStatus(status) {
    setBusy(true)
    const r = await fetch(`/api/quotes/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (r.ok) {
      const updated = await r.json()
      setQ(updated)
      onUpdate(updated)
    }
    setBusy(false)
  }

  const subtotal = q.items.reduce((s, it) => s + (parseFloat(it.total) || 0), 0)

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-gray-900">{q.number}</span>
            <StatusBadge status={q.status} />
          </div>
          <div className="text-sm text-gray-400 mt-1 space-x-3">
            <span>Creada {new Date(q.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {q.validUntil && (
              <span>· Válida hasta {new Date(q.validUntil).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            )}
          </div>
          {q.deal && (
            <div className="text-sm text-gray-500 mt-1">
              <Icons.deals className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
              {q.deal.title}
            </div>
          )}
          {q.contact && (
            <div className="text-sm text-gray-500">
              <Icons.user className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
              {[q.contact.firstName, q.contact.lastName].filter(Boolean).join(' ')}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-gray-900">{fmt(q.total, q.currency)}</div>
          <div className="text-xs text-gray-400">{q.currency}</div>
        </div>
      </div>

      {/* Line items */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ítems</h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Descripción</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">Cant.</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">P. unit.</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {q.items.map((it, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-900">{it.description}</div>
                    {it.sku && <div className="text-xs text-gray-400 font-mono">{it.sku}</div>}
                    {/* Mobile: qty × price */}
                    <div className="text-xs text-gray-400 sm:hidden">
                      {it.qty} × {fmt(it.unitPrice, q.currency)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-600 hidden sm:table-cell">{it.qty}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600 hidden sm:table-cell">{fmt(it.unitPrice, q.currency)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{fmt(it.total, q.currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200 text-sm">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right text-gray-500 hidden sm:table-cell">Subtotal</td>
                <td colSpan={2} className="px-3 py-2 text-right text-gray-500 sm:hidden">Subtotal</td>
                <td className="px-3 py-2 text-right">{fmt(subtotal, q.currency)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right text-gray-500 hidden sm:table-cell">
                  IVA {Math.round((q.taxRate || 0) * 100)}%
                </td>
                <td colSpan={2} className="px-3 py-2 text-right text-gray-500 sm:hidden">
                  IVA {Math.round((q.taxRate || 0) * 100)}%
                </td>
                <td className="px-3 py-2 text-right">{fmt(q.tax, q.currency)}</td>
              </tr>
              <tr className="font-semibold text-gray-900">
                <td colSpan={3} className="px-3 py-2.5 text-right hidden sm:table-cell">Total</td>
                <td colSpan={2} className="px-3 py-2.5 text-right sm:hidden">Total</td>
                <td className="px-3 py-2.5 text-right text-base">{fmt(q.total, q.currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Notes */}
      {q.notes && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notas</h4>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{q.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
        {nextStatuses.map(ns => (
          <button
            key={ns.value}
            onClick={() => changeStatus(ns.value)}
            disabled={busy}
            className={`btn-sm ${
              ns.value === 'accepted' ? 'btn-primary' :
              ns.value === 'rejected' ? 'border border-red-200 text-red-600 hover:bg-red-50 rounded-lg px-3 py-1.5 text-sm' :
              'btn-ghost'
            }`}
          >
            {ns.label}
          </button>
        ))}
        {canDelete && (
          <button
            onClick={() => { onDelete(q.id); onClose() }}
            className="ml-auto p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar cotización"
          >
            <Icons.trash className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function QuotesPage() {
  const { user } = useAuth()
  const [quotes, setQuotes]   = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState(null) // quote open in modal

  const canDelete = ['admin', 'manager'].includes(user?.role)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [qRes, pRes] = await Promise.all([
        fetch('/api/quotes'),
        fetch('/api/products'),
      ])
      const [qData, pData] = await Promise.all([qRes.json(), pRes.json()])
      setQuotes(Array.isArray(qData) ? qData : [])
      setProducts(Array.isArray(pData) ? pData.filter(p => p.isActive !== false) : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleUpdate(updated) {
    setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q))
    if (selected?.id === updated.id) setSelected(updated)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta cotización?')) return
    await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
    setQuotes(prev => prev.filter(q => q.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const filtered = quotes.filter(q => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        q.number.toLowerCase().includes(s) ||
        q.deal?.title?.toLowerCase().includes(s) ||
        [q.contact?.firstName, q.contact?.lastName].join(' ').toLowerCase().includes(s) ||
        q.notes?.toLowerCase().includes(s)
      )
    }
    return true
  })

  // Counts per status for badges
  const counts = quotes.reduce((acc, q) => { acc[q.status] = (acc[q.status] || 0) + 1; return acc }, {})

  return (
    <>
      <Head><title>Cotizaciones | CRM</title></Head>
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-4 lg:px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Cotizaciones</h1>
          </div>

          {/* Status filter pills + search */}
          <div className="flex flex-wrap gap-2 items-center">
            {[
              ['all', 'Todas'],
              ['draft', 'Borradores'],
              ['sent', 'Enviadas'],
              ['accepted', 'Aceptadas'],
              ['rejected', 'Rechazadas'],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                className={`filter-pill ${statusFilter === v ? 'filter-pill-active' : ''}`}
              >
                {l}
                {v !== 'all' && counts[v] > 0 && (
                  <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                    statusFilter === v ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {counts[v]}
                  </span>
                )}
              </button>
            ))}

            {/* Search */}
            <div className="relative flex-1 min-w-full sm:min-w-[200px]">
              <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9 py-1.5"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por número, deal o contacto…"
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
              icon={Icons.fileText}
              title={search || statusFilter !== 'all' ? 'Sin resultados' : 'Sin cotizaciones'}
              description={
                search || statusFilter !== 'all'
                  ? 'Prueba cambiando los filtros.'
                  : 'Las cotizaciones se crean desde el pipeline de ventas (en cada oportunidad).'
              }
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(q => {
                const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelected(q)}
                    className="w-full flex items-center gap-3 px-4 lg:px-6 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Status dot */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.cls}`}>
                      <Icons.fileText className="w-4 h-4" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{q.number}</span>
                        <StatusBadge status={q.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500 flex-wrap">
                        {q.deal && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <Icons.deals className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{q.deal.title}</span>
                          </span>
                        )}
                        {q.contact && (
                          <span className="inline-flex items-center gap-1">
                            <Icons.user className="w-3 h-3 text-gray-400 shrink-0" />
                            {[q.contact.firstName, q.contact.lastName].filter(Boolean).join(' ')}
                          </span>
                        )}
                        <span className="text-gray-400">
                          {new Date(q.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {/* Mobile: show total inline */}
                        <span className="font-semibold text-gray-900 sm:hidden">{fmt(q.total, q.currency)}</span>
                      </div>
                      {q.validUntil && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          Válida hasta {new Date(q.validUntil).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>

                    {/* Total + item count — desktop */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="font-semibold text-gray-900">{fmt(q.total, q.currency)}</div>
                      <div className="text-xs text-gray-400">{q.items.length} ítem{q.items.length !== 1 ? 's' : ''}</div>
                    </div>

                    {/* Chevron */}
                    <Icons.chevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.number || 'Cotización'}
        size="md"
      >
        {selected && (
          <QuoteDetailModal
            quote={selected}
            products={products}
            onClose={() => setSelected(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </Modal>
    </>
  )
}
