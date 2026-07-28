/**
 * components/reports/ReportRunner.js
 *
 * Renders a list of widget data from /api/reports/[id]/run using Recharts.
 */
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Spinner } from '../ui/Spinner'

// ─── Colour palette ─────────────────────────────────────────────────────────

const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
]

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtValue(val, format) {
  if (val == null) return '—'
  if (format === 'currency') {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
    }).format(val)
  }
  if (format === 'percent') return `${val}%`
  if (typeof val === 'number') return val.toLocaleString('es-MX')
  return String(val)
}

// ─── Individual widget renderers ─────────────────────────────────────────────

function NumberCard({ widget }) {
  const val = widget.data?.value ?? 0
  return (
    <div className="card p-5 flex flex-col gap-1">
      <p className="text-sm text-gray-500 font-medium truncate">{widget.title}</p>
      <p className="text-3xl font-bold text-gray-900">{fmtValue(val, widget.format)}</p>
      {widget.subtitle && <p className="text-xs text-gray-400">{widget.subtitle}</p>}
    </div>
  )
}

function WidgetBarChart({ widget }) {
  const data = widget.data || []
  return (
    <div className="card p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">{widget.title}</p>
      {widget.subtitle && <p className="text-xs text-gray-400 mb-2">{widget.subtitle}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => v.toLocaleString('es-MX')} />
          <Bar dataKey="value" fill={PALETTE[0]} radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function WidgetLineChart({ widget }) {
  const data = widget.data || []
  return (
    <div className="card p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">{widget.title}</p>
      {widget.subtitle && <p className="text-xs text-gray-400 mb-2">{widget.subtitle}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => v.toLocaleString('es-MX')} />
          <Line type="monotone" dataKey="value" stroke={PALETTE[0]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function WidgetPieChart({ widget }) {
  const data = widget.data || []
  return (
    <div className="card p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">{widget.title}</p>
      {widget.subtitle && <p className="text-xs text-gray-400 mb-2">{widget.subtitle}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
               outerRadius={80} label={({ name, percent }) =>
                 `${name} ${(percent * 100).toFixed(0)}%`}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => v.toLocaleString('es-MX')} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function WidgetTable({ widget }) {
  const cols = widget.data?.columns || []
  const rows = widget.data?.rows    || []
  return (
    <div className="card p-4 col-span-full">
      <p className="text-sm font-semibold text-gray-700 mb-3">{widget.title}</p>
      {widget.subtitle && <p className="text-xs text-gray-400 mb-2">{widget.subtitle}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {cols.map(c => (
                <th key={c.key} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {cols.map(c => (
                  <td key={c.key} className="py-2 px-3 text-gray-700">
                    {row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={cols.length} className="py-4 px-3 text-gray-400 text-center">Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Widget dispatcher ───────────────────────────────────────────────────────

function Widget({ widget }) {
  if (widget.error) {
    return (
      <div className="card p-4 border-red-200 bg-red-50">
        <p className="text-xs font-semibold text-red-600">{widget.title}</p>
        <p className="text-xs text-red-500 mt-1">{widget.error}</p>
      </div>
    )
  }
  switch (widget.type) {
    case 'number_card':  return <NumberCard widget={widget} />
    case 'bar_chart':    return <WidgetBarChart widget={widget} />
    case 'line_chart':   return <WidgetLineChart widget={widget} />
    case 'pie_chart':    return <WidgetPieChart widget={widget} />
    case 'table':        return <WidgetTable widget={widget} />
    case 'funnel':       return <WidgetBarChart widget={widget} /> // fallback
    default:             return <NumberCard widget={widget} />
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * @param {{
 *   widgets?:   any[]
 *   loading?:   boolean
 *   error?:     string
 *   emptyText?: string
 * }} props
 */
export default function ReportRunner({ widgets, loading, error, emptyText }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-red-600 text-sm">
        {error}
      </div>
    )
  }

  if (!widgets?.length) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-10 text-center text-gray-400 text-sm">
        {emptyText || 'Sin widgets'}
      </div>
    )
  }

  // Lay out: number_cards in a 2–4 col row, then charts in 1-2 col grid
  const cards  = widgets.filter(w => w.type === 'number_card')
  const others = widgets.filter(w => w.type !== 'number_card')

  return (
    <div className="space-y-4">
      {cards.length > 0 && (
        <div className={`grid gap-4 grid-cols-2 ${cards.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-' + cards.length}`}>
          {cards.map(w => <Widget key={w.id} widget={w} />)}
        </div>
      )}
      {others.length > 0 && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {others.map(w => <Widget key={w.id} widget={w} />)}
        </div>
      )}
    </div>
  )
}
