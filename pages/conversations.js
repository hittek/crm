import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Layout from '../components/layout/Layout'
import Icons from '../components/ui/Icons'
import { useAuth } from '../lib/AuthContext'

// ── helpers ──────────────────────────────────────────────────────────────────

const CHANNEL_LABELS = {
  web:       { label: 'Web',       color: 'bg-blue-100 text-blue-700' },
  sandbox:   { label: 'Sandbox',   color: 'bg-purple-100 text-purple-700' },
  whatsapp:  { label: 'WhatsApp',  color: 'bg-green-100 text-green-700' },
  facebook:  { label: 'Facebook',  color: 'bg-indigo-100 text-indigo-700' },
  telegram:  { label: 'Telegram',  color: 'bg-sky-100 text-sky-700' },
}

const STATUS_LABELS = {
  open:       { label: 'Abierta',    color: 'bg-yellow-100 text-yellow-700' },
  resolved:   { label: 'Resuelta',   color: 'bg-green-100 text-green-700' },
  escalated:  { label: 'Escalada',   color: 'bg-red-100 text-red-700' },
}

function ChannelBadge({ channel }) {
  const c = CHANNEL_LABELS[channel] || { label: channel, color: 'bg-gray-100 text-gray-600' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>
}

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-600' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'ahora'
  if (m < 60)  return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

// ── Message thread ────────────────────────────────────────────────────────────

function MessageThread({ messages }) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 max-h-64 overflow-y-auto">
      {messages.map(msg => (
        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={[
            'max-w-[80%] px-3 py-1.5 rounded-xl text-xs leading-relaxed',
            msg.role === 'user'
              ? 'bg-primary-600 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-700 rounded-bl-sm',
          ].join(' ')}>
            {msg.content}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Conversation row ──────────────────────────────────────────────────────────

function ConversationRow({ conv }) {
  const [expanded, setExpanded] = useState(false)
  const preview = conv.messages.find(m => m.role === 'user')?.content?.slice(0, 80) || '(sin mensajes)'

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: (conv.chatbot?.primaryColor || '#2563eb') + '20' }}
          >
            <Icons.bot className="w-4 h-4" style={{ color: conv.chatbot?.primaryColor || '#2563eb' }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-800">{conv.chatbot?.name || 'Chatbot'}</span>
              <ChannelBadge channel={conv.channel} />
              <StatusBadge  status={conv.status} />
            </div>
            <p className="text-xs text-gray-400 truncate mt-0.5">{preview}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400">{timeAgo(conv.updatedAt)}</span>
          <span className="text-xs text-gray-400">{conv.messages.length} msgs</span>
          <Icons.chevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {expanded && conv.messages.length > 0 && (
        <MessageThread messages={conv.messages} />
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const CHANNELS = ['', 'sandbox', 'web', 'whatsapp', 'facebook', 'telegram']
const STATUSES = ['', 'open', 'resolved', 'escalated']

export default function ConversationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [convs, setConvs]     = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [filterStatus,  setFilterStatus]  = useState('')
  const [filterChannel, setFilterChannel] = useState('')

  const fetchConvs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 20 })
    if (filterStatus)  params.set('status',  filterStatus)
    if (filterChannel) params.set('channel', filterChannel)
    const r = await fetch(`/api/conversations?${params}`)
    if (r.ok) {
      const data = await r.json()
      setConvs(data.conversations)
      setTotal(data.total)
    }
    setLoading(false)
  }, [page, filterStatus, filterChannel])

  useEffect(() => { if (user) fetchConvs() }, [user, fetchConvs])

  // Reset to page 1 when filters change
  useEffect(() => setPage(1), [filterStatus, filterChannel])

  const totalPages = Math.ceil(total / 20)

  if (authLoading) return null

  return (
    <Layout>
      <Head><title>Conversaciones</title></Head>

      <div className="px-6 py-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Conversaciones</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {total > 0 ? `${total} conversación${total !== 1 ? 'es' : ''}` : 'Historial de chats del chatbot'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <select
            value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="">Todos los canales</option>
            {CHANNELS.filter(Boolean).map(c => (
              <option key={c} value={c}>{CHANNEL_LABELS[c]?.label || c}</option>
            ))}
          </select>
          <select
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="">Todos los estados</option>
            {STATUSES.filter(Boolean).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse h-16" />
            ))}
          </div>
        )}

        {!loading && convs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Icons.messageSquare className="w-7 h-7 text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">Sin conversaciones</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              Las conversaciones del chatbot aparecerán aquí una vez que estén activos los canales.
            </p>
          </div>
        )}

        {!loading && convs.length > 0 && (
          <div className="space-y-3">
            {convs.map(conv => <ConversationRow key={conv.id} conv={conv} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => p - 1)} disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-500">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
