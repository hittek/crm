import { useState, useEffect, useCallback, useRef } from 'react'
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

// Bubble color per role
function bubbleClass(role) {
  if (role === 'user')      return 'bg-gray-100 text-gray-800 rounded-bl-sm'
  if (role === 'agent')     return 'bg-primary-600 text-white rounded-br-sm'
  if (role === 'assistant') return 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
  return 'bg-gray-100 text-gray-800'
}
function bubbleSide(role) {
  return role === 'agent' ? 'justify-end' : 'justify-start'
}
function roleLabel(role) {
  if (role === 'agent') return 'Agente'
  if (role === 'assistant') return 'Bot'
  return null
}

// ── List row ──────────────────────────────────────────────────────────────────

function ConvRow({ conv, isSelected, onClick }) {
  const preview = conv.messages?.find(m => m.role === 'user')?.content || ''
  const isEscalated = conv.status === 'escalated'
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
            {isEscalated && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
            <span className="text-xs font-semibold text-gray-800 truncate">{conv.chatbot?.name || 'Chatbot'}</span>
            <ChannelBadge channel={conv.channel} />
          </div>
          <p className="text-xs text-gray-500 truncate leading-relaxed">{preview || 'Sin mensajes'}</p>
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

function Thread({ conv, onStatusChange }) {
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Load + poll messages when conv changes
  useEffect(() => {
    if (!conv) { setMessages([]); return }

    let cancelled = false
    async function fetchMessages() {
      const r = await fetch(`/api/conversations/${conv.id}/messages`)
      if (r.ok && !cancelled) {
        const data = await r.json()
        setMessages(data.messages)
      }
    }

    fetchMessages()

    // Poll every 5s while conversation is open or escalated
    let interval
    if (conv.status !== 'resolved') {
      interval = setInterval(fetchMessages, 5000)
    }
    return () => { cancelled = true; clearInterval(interval) }
  }, [conv?.id, conv?.status])

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendReply(e) {
    e?.preventDefault()
    const text = replyText.trim()
    if (!text || sending) return
    setSending(true)
    setReplyText('')
    const r = await fetch(`/api/conversations/${conv.id}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: text }),
    })
    if (r.ok) {
      const data = await r.json()
      setMessages(prev => [...prev, data.message])
    }
    setSending(false)
    inputRef.current?.focus()
  }

  async function updateStatus(status) {
    setUpdatingStatus(true)
    const r = await fetch(`/api/conversations/${conv.id}/status`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    })
    if (r.ok) onStatusChange(conv.id, status)
    setUpdatingStatus(false)
  }

  if (!conv) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400">
        <Icons.messageSquare className="w-10 h-10 mb-3 text-gray-200" />
        <p className="text-sm">Selecciona una conversación para ver el hilo</p>
      </div>
    )
  }

  const canReply   = conv.status !== 'resolved'
  const isEscalated = conv.status === 'escalated'

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-900">{conv.chatbot?.name}</h2>
            <ChannelBadge channel={conv.channel} />
            <StatusBadge  status={conv.status} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {messages.length} mensajes · última actividad {timeAgo(conv.updatedAt)}
          </p>
        </div>

        {/* Status actions */}
        <div className="flex items-center gap-2 shrink-0">
          {conv.status === 'resolved' ? (
            <button
              onClick={() => updateStatus('open')}
              disabled={updatingStatus}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Reabrir
            </button>
          ) : (
            <button
              onClick={() => updateStatus('resolved')}
              disabled={updatingStatus}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-40 transition-colors"
            >
              <Icons.check className="w-3.5 h-3.5" />
              Marcar resuelta
            </button>
          )}
        </div>
      </div>

      {/* Escalation banner */}
      {isEscalated && (
        <div className="px-5 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-2 shrink-0">
          <Icons.alert className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700 font-medium">
            El cliente solicitó hablar con un agente. Responde en este hilo para continuar la conversación.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Sin mensajes en esta conversación</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${bubbleSide(msg.role)}`}>
            <div className="max-w-[72%]">
              {roleLabel(msg.role) && (
                <p className={`text-xs mb-1 ${msg.role === 'agent' ? 'text-right text-primary-500' : 'text-gray-400'}`}>
                  {roleLabel(msg.role)}
                </p>
              )}
              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${bubbleClass(msg.role)}`}>
                {msg.content}
                <div className={`text-xs mt-1 ${msg.role === 'agent' ? 'text-primary-200' : 'text-gray-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Agent reply input */}
      {canReply ? (
        <form onSubmit={sendReply} className="px-4 py-3 border-t border-gray-100 flex items-end gap-2 shrink-0">
          <textarea
            ref={inputRef}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
            placeholder="Escribe una respuesta… (Enter para enviar)"
            rows={2}
            disabled={sending}
            className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50 disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={!replyText.trim() || sending}
            className="p-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            title="Enviar respuesta"
          >
            <Icons.send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <div className="px-5 py-3 border-t border-gray-100 text-center shrink-0">
          <p className="text-xs text-gray-400">Conversación resuelta · <button onClick={() => updateStatus('open')} className="text-primary-500 hover:underline">Reabrir para responder</button></p>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const CHANNELS = ['', 'sandbox', 'web', 'whatsapp', 'facebook', 'telegram']
const STATUSES = ['', 'open', 'resolved', 'escalated']

export default function ConversationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [convs, setConvs]       = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
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
    }
    setLoading(false)
  }, [page, filterStatus, filterChannel])

  useEffect(() => { if (user) fetchConvs() }, [user, fetchConvs])
  useEffect(() => { setPage(1); setSelected(null) }, [filterStatus, filterChannel])

  // When an agent resolves / reopens a conv, update it in the list
  function handleStatusChange(convId, status) {
    setConvs(prev => prev.map(c => c.id === convId ? { ...c, status } : c))
    setSelected(prev => prev?.id === convId ? { ...prev, status } : prev)
  }

  const totalPages = Math.ceil(total / 30)

  if (authLoading) return <PageLoader />

  return (
    <>
      <Head><title>Conversaciones</title></Head>

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
                <p className="text-sm text-gray-400">
                  {filterStatus || filterChannel ? 'Sin conversaciones con estos filtros' : 'Sin conversaciones todavía'}
                </p>
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
            <Thread conv={selected} onStatusChange={handleStatusChange} />
          </div>
        </div>
      </div>
    </>
  )
}
