import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

function fmt(n, currency = 'MXN') {
  return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency })
}

const STATUS_LABELS = {
  draft:    'Borrador',
  sent:     'Enviada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired:  'Vencida',
}

const STATUS_COLORS = {
  draft:    '#6b7280',
  sent:     '#2563eb',
  accepted: '#16a34a',
  rejected: '#dc2626',
  expired:  '#ea580c',
}

export default function PublicQuotePage() {
  const router = useRouter()
  const { token } = router.query
  const [quote, setQuote]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/q/${token}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(data => { if (data) setQuote(data); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [token])

  function handlePrint() { window.print() }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-300 mb-2">404</div>
          <p className="text-gray-500">Esta cotización no existe o el enlace ya no es válido.</p>
        </div>
      </div>
    )
  }

  const q = quote
  const org = q.org || {}
  const subtotal = q.items.reduce((s, it) => s + (parseFloat(it.total) || 0), 0)
  const statusLabel = STATUS_LABELS[q.status] || q.status
  const statusColor = STATUS_COLORS[q.status] || '#6b7280'
  const contactName = [q.contact?.firstName, q.contact?.lastName].filter(Boolean).join(' ')

  return (
    <>
      <Head>
        <title>{q.number} — {org.name || 'Cotización'}</title>
        <meta name="robots" content="noindex" />
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 16mm 16mm 16mm 16mm; size: A4; }
          }
        `}</style>
      </Head>

      {/* Toolbar — hidden on print */}
      <div className="no-print fixed top-0 inset-x-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-gray-700">{q.number}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? '¡Copiado!' : 'Copiar enlace'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Quote document */}
      <div className="min-h-screen bg-gray-100 pt-16 pb-12 no-print-padding print:pt-0 print:bg-white">
        <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none print:max-w-none">
          <div className="px-8 py-10 print:px-0 print:py-0">

            {/* Header */}
            <div className="flex items-start justify-between gap-6 mb-10">
              <div>
                {org.logo ? (
                  <img src={org.logo} alt={org.name} className="h-12 object-contain mb-3" />
                ) : (
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center mb-3 text-white font-bold text-lg"
                    style={{ backgroundColor: org.primaryColor || '#2563eb' }}
                  >
                    {(org.name || 'O').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-lg font-bold text-gray-900">{org.name}</div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 mb-1">{q.number}</div>
                <div
                  className="inline-block px-3 py-1 rounded-full text-sm font-semibold text-white mb-2"
                  style={{ backgroundColor: statusColor }}
                >
                  {statusLabel}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(q.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                {q.validUntil && (
                  <div className="text-sm text-gray-500">
                    Válida hasta {new Date(q.validUntil).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>

            {/* To / For */}
            {(contactName || q.deal) && (
              <div className="mb-8 p-4 bg-gray-50 rounded-xl">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Preparada para</div>
                {contactName && <div className="text-base font-semibold text-gray-900">{contactName}</div>}
                {q.contact?.email && <div className="text-sm text-gray-500">{q.contact.email}</div>}
                {q.deal && <div className="text-sm text-gray-500 mt-1">Ref: {q.deal.title}</div>}
              </div>
            )}

            {/* Line items table */}
            <table className="w-full text-sm mb-6">
              <thead>
                <tr style={{ borderBottom: `2px solid ${org.primaryColor || '#2563eb'}` }}>
                  <th className="text-left py-2.5 font-semibold text-gray-700">Descripción</th>
                  <th className="text-right py-2.5 font-semibold text-gray-700 w-16">Cant.</th>
                  <th className="text-right py-2.5 font-semibold text-gray-700 w-28">P. Unit.</th>
                  <th className="text-right py-2.5 font-semibold text-gray-700 w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {q.items.map((it, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-gray-900">{it.description}</div>
                      {it.sku && <div className="text-xs text-gray-400 font-mono mt-0.5">{it.sku}</div>}
                    </td>
                    <td className="py-3 text-right text-gray-600">{it.qty}</td>
                    <td className="py-3 text-right text-gray-600">{fmt(it.unitPrice, q.currency)}</td>
                    <td className="py-3 text-right font-semibold text-gray-900">{fmt(it.total, q.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal, q.currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IVA ({Math.round((q.taxRate || 0) * 100)}%)</span>
                  <span>{fmt(q.tax, q.currency)}</span>
                </div>
                <div
                  className="flex justify-between font-bold text-base pt-2 mt-1"
                  style={{ borderTop: `2px solid ${org.primaryColor || '#2563eb'}`, color: org.primaryColor || '#2563eb' }}
                >
                  <span>Total</span>
                  <span>{fmt(q.total, q.currency)}</span>
                </div>
                <div className="text-xs text-right text-gray-400">{q.currency}</div>
              </div>
            </div>

            {/* Notes */}
            {q.notes && (
              <div className="border-t border-gray-100 pt-6">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notas y condiciones</div>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{q.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-100 mt-10 pt-6 text-center text-xs text-gray-400">
              {org.name} · {q.number} · Generada {new Date(q.createdAt).toLocaleDateString('es-MX')}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
