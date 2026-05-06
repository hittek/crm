import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Icons from '../components/ui/Icons'
import { useAuth } from '../lib/AuthContext'
import { PageLoader } from '../components/ui/Spinner'

// ── helpers ──────────────────────────────────────────────────────────────────

const CHANNEL_META = {
  web:       { label: 'Web',      color: 'bg-blue-100 text-blue-700' },
  sandbox:   { label: 'Sandbox',  color: 'bg-purple-100 text-purple-700' },
  whatsapp:  { label: 'WhatsApp', color: 'bg-green-100 text-green-700' },
  facebook:  { label: 'Facebook', color: 'bg-indigo-100 text-indigo-700' },
  telegram:  { label: 'Telegram', color: 'bg-sky-100 text-sky-700' },
}

const STATUS_META = {
  open:      { label: 'Abierta',  color: 'bg-yellow-100 text-yellow-700' },
  resolved:  { label: 'Resuelta', color: 'bg-green-100 text-green-700' },
  escalated: { label: 'Escalada', color: 'bg-red-100 text-red-700' },
}

function ChannelBadge({ channel }) {
  const m = CHANNEL_META[channel] || { label: channel, color: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.color}`}>{m.label}</span>
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.color}`}>{m.label}</span>
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  return new Date(dateStr).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
}

// ── List row ──────────────────────────────────────────────────────────────────

function ConvRow({ conv, isSelected, onClick }) {
  const userMsg = conv.messages?.find(m => m.role === 'user')?.content || ''
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left px-4 py-3.5 border-b border-gray-100 transition-colors hover:bg-gray-50',
        isSelected ? 'bg-primary-50 border-l-2 border-l-primary-500 pl-3.5' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-xs font-semibold text-gray-800 truncate">{conv.chatbot?.name || 'Chatbot'}</span>
            <ChannelBadge channel={conv.channel} />
          </div>
          <p className="text-xs text-gray-500 truncate leading-relaxed">{userMsg || 'Sin mensajes'}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="text-xs text-gray-400">{timeAgo(conv.updatedAt)}</span>
          <StatusBadge status={conv.status} />
        </div>
      </div>
    </button>
  )
}

// ── Thread ────────────────────────────────────────────────────────────────────

function Thread({ conv }) {
  if (!conv) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400">
        <Icons.messageSquare className="w-10 h-10 mb-3 text-gray-200" />
        <p className="text-sm">Selecciona una conversación</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-900">{conv.chatbot?.name}</h2>
            <ChannelBadge channel={conv.channel} />
            <StatusBadge  status={conv.status} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {conv.messages?.length || 0} mensajes · última actividad {timeAgo(conv.updatedAt)}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {conv.messages?.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Sin mensajes en esta conversación</p>
        )}
        {conv.messages?.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={[
              'max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm',
            ].join(' ')}>
              {msg.content}
              <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-primary-200' : 'text-gray-400'}`}>
                {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const CHANNELS = ['', 'sandbox', 'web', 'whatsapp', 'facebook', 'telegram']
const STATUSES = ['', 'open', 'resolved', 'escalated']

export default function ConversationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [convs, setConvs]         = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [filterStatus,  setFilterStatus]  = useState('')
  const [filterChannel, setFilterChannel] = useState('')

  const fetchConvs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 30 })
    if (filterStatus)  params.set('status',  filterStatus)
    if (filterChannel) params.set('channel', filterChannel)
    const r = await fetch(`/api/conversations?${params}`)
    if (r.ok) {
      const data = await r.json()
      setConvs(data.conversations)
      setTotal(data.total)
      // Keep selected in sync
      if (selected) {
        const refreshed = data.conversations.find(c => c.id === selected.id)
        if (refreshed) setSelected(refreshed)
      }
    }
    setLoading(false)
  }, [page, filterStatus, filterChannel])

  useEffect(() => { if (user) fetchConvs() }, [user, fetchConvs])
  useEffect(() => setPage(1), [filterStatus, filterChannel])

  const totalPages = Math.ceil(total / 30)

  if (authLoading) return <PageLoader />

  return (
    <>
      <Head><title>Conversaciones</title></Head>

      {/* Full-height master-detail layout */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Top bar */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">Conversaciones</h1>
            {total > 0 && (
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5 font-medium">{total}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
              className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos los canales</option>
              {CHANNELS.filter(Boolean).map(c => (
                <option key={c} value={c}>{CHANNEL_META[c]?.label || c}</option>
              ))}
            </select>
            <select
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos los estados</option>
              {STATUSES.filter(Boolean).map(s => (
                <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Master-detail body */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — conversation list */}
          <div className="w-80 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
            {loading && (
              <div className="flex justify-center items-center flex-1">
                <PageLoader />
              </div>
            )}

            {!loading && convs.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
                <Icons.messageSquare className="w-8 h-8 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Sin conversaciones{filterStatus || filterChannel ? ' con estos filtros' : ' todavía'}</p>
              </div>
            )}

            {!loading && convs.length > 0 && (
              <div className="flex-1 overflow-y-auto">
                {convs.map(conv => (
                  <ConvRow
                    key={conv.id}
                    conv={conv}
                    isSelected={selected?.id === conv.id}
                    onClick={() => setSelected(conv)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between shrink-0">
                <button
                  onClick={() => setPage(p => p - 1)} disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500"
                >
                  <Icons.chevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-400">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500"
                >
                  <Icons.chevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* RIGHT — thread */}
          <div className="flex-1 bg-white overflow-hidden">
            <Thread conv={selected} />
          </div>
        </div>
      </div>
    </>
  )
}
