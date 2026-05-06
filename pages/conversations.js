import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Icons from '../components/ui/Icons'
import { useAuth } from '../lib/AuthContext'
import { PageLoader } from '../components/ui/Spinner'
import { hasMinRole } from '../lib/auth'

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
function roleLabel(msg) {
  if (msg.role === 'agent')     return msg.agentName || 'Agente'
  if (msg.role === 'assistant') return 'Bot'
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

// ── Event pill rendered inline in the message timeline ───────────────────────

const EVENT_META = {
  picked_up: { icon: Icons.user,    text: (e) => `${e.user?.name} tomó la conversación`,                                                                    color: 'text-blue-600',   bg: 'bg-blue-50'   },
  forwarded:  { icon: Icons.send,   text: (e) => `${e.user?.name} transfirió a ${e.toUser?.name || 'otro agente'}${e.note ? ` · "${e.note}"` : ''}`,          color: 'text-purple-600', bg: 'bg-purple-50' },
  joined:     { icon: Icons.users,  text: (e) => `${e.user?.name} intervino en la conversación`,                                                              color: 'text-orange-600', bg: 'bg-orange-50' },
  resolved:   { icon: Icons.check,  text: (e) => `${e.user?.name} cerró la conversación${e.note ? ` · "${e.note}"` : ''}`,                                    color: 'text-green-600',  bg: 'bg-green-50'  },
  reopened:   { icon: Icons.refresh,text: (e) => `${e.user?.name} reabrió la conversación`,                                                                   color: 'text-yellow-600', bg: 'bg-yellow-50' },
}

function EventPill({ event }) {
  const meta = EVENT_META[event.type] || { icon: Icons.activity, text: () => event.type, color: 'text-gray-500', bg: 'bg-gray-50' }
  const Icon = meta.icon
  return (
    <div className="flex justify-center">
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${meta.color} ${meta.bg} border border-current/10`}>
        <Icon className="w-3 h-3 shrink-0" />
        <span>{meta.text(event)}</span>
        <span className="opacity-50">·</span>
        <span className="opacity-60">{timeAgo(event.createdAt)}</span>
      </div>
    </div>
  )
}

// ── Forward modal ─────────────────────────────────────────────────────────────

function ForwardModal({ convId, onClose, onForwarded }) {
  const [users, setUsers]     = useState([])
  const [toUserId, setTo]     = useState('')
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.ok ? r.json() : { users: [] })
      .then(d => { setUsers(d.data || d.users || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!toUserId) return
    setSaving(true)
    const r = await fetch(`/api/conversations/${convId}/status`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'forward', toUserId: parseInt(toUserId), note: note.trim() || undefined }),
    })
    if (r.ok) {
      const data = await r.json()
      onForwarded(data.forwardedTo)
    }
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Transferir conversación</h3>
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-4">Cargando agentes…</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Transferir a</label>
              <select
                value={toUserId} onChange={e => setTo(e.target.value)} required
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="">Selecciona un agente…</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Nota (opcional)</label>
              <textarea
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="Contexto para el siguiente agente…"
                rows={2}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={!toUserId || saving} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40">
                {saving ? 'Transfiriendo…' : 'Transferir'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Thread ────────────────────────────────────────────────────────────────────

function Thread({ conv, onStatusChange, currentUser }) {
  const [messages, setMessages]         = useState([])
  const [events, setEvents]             = useState([])
  const [replyText, setReplyText]       = useState('')
  const [sending, setSending]           = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showForward, setShowForward]   = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Load + poll messages+events when conv changes
  useEffect(() => {
    if (!conv) { setMessages([]); setEvents([]); return }

    let cancelled = false
    async function fetchMessages() {
      const r = await fetch(`/api/conversations/${conv.id}/messages`)
      if (r.ok && !cancelled) {
        const data = await r.json()
        setMessages(data.messages)
        setEvents(data.events || [])
      }
    }

    fetchMessages()

    let interval
    if (conv.status !== 'resolved') {
      interval = setInterval(fetchMessages, 5000)
    }
    return () => { cancelled = true; clearInterval(interval) }
  }, [conv?.id, conv?.status])

  // Scroll to bottom when messages or events update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, events])

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
      // Refresh events for picked_up / joined pills
      if (data.pickedUp || data.joined) {
        const evR = await fetch(`/api/conversations/${conv.id}/messages`)
        if (evR.ok) { const d = await evR.json(); setEvents(d.events || []) }
      }
      // Sync status change (escalated → open) back to the list + thread header
      if (data.newStatus && data.newStatus !== conv.status) {
        onStatusChange(conv.id, data.newStatus)
      }
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
    if (r.ok) {
      onStatusChange(conv.id, status)
      // Refresh events to show resolved/reopened pill
      const evR = await fetch(`/api/conversations/${conv.id}/messages`)
      if (evR.ok) { const d = await evR.json(); setEvents(d.events || []) }
    }
    setUpdatingStatus(false)
  }

  function handleForwarded(toUser) {
    // Refresh events to show forwarded pill
    fetch(`/api/conversations/${conv.id}/messages`)
      .then(r => r.json()).then(d => setEvents(d.events || []))
  }

  if (!conv) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400">
        <Icons.messageSquare className="w-10 h-10 mb-3 text-gray-200" />
        <p className="text-sm">Selecciona una conversación para ver el hilo</p>
      </div>
    )
  }

  const isAdmin      = hasMinRole(currentUser?.role, 'manager')
  const isAssignee   = conv.assignedToId === currentUser?.id
  const isUnassigned = !conv.assignedToId
  const canReply     = conv.status !== 'resolved' && (isUnassigned || isAssignee || isAdmin)
  const isEscalated  = conv.status === 'escalated'
  const isLocked     = conv.status !== 'resolved' && !isUnassigned && !isAssignee && !isAdmin

  // Merge messages and events into a single sorted timeline
  const timeline = [
    ...messages.map(m => ({ ...m, _kind: 'message' })),
    ...events.map(e   => ({ ...e, _kind: 'event'   })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

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

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {canReply && (
            <button
              onClick={() => setShowForward(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Transferir a otro agente"
            >
              <Icons.send className="w-3.5 h-3.5" />
              Transferir
            </button>
          )}
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
      {isEscalated && !isLocked && (
        <div className="px-5 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-2 shrink-0">
          <Icons.alert className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700 font-medium">
            El cliente solicitó hablar con un agente. Responde en este hilo para continuar la conversación.
          </p>
        </div>
      )}

      {/* Locked banner — assigned to someone else, current user is not admin */}
      {isLocked && (
        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2 shrink-0">
          <Icons.lock className="w-4 h-4 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-500">
            Asignada a otro agente. Solo puedes leer este hilo.
          </p>
        </div>
      )}

      {/* Unified timeline */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {timeline.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Sin mensajes en esta conversación</p>
        )}
        {timeline.map(item =>
          item._kind === 'event' ? (
            <EventPill key={`ev-${item.id}`} event={item} />
          ) : (
            <div key={`msg-${item.id}`} className={`flex ${bubbleSide(item.role)}`}>
              <div className="max-w-[72%]">
                {roleLabel(item) && (
                  <p className={`text-xs mb-1 ${item.role === 'agent' ? 'text-right text-primary-500' : 'text-gray-400'}`}>
                    {roleLabel(item)}
                  </p>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${bubbleClass(item.role)}`}>
                  {item.content}
                  <div className={`text-xs mt-1 ${item.role === 'agent' ? 'text-primary-200' : 'text-gray-400'}`}>
                    {new Date(item.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
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

      {showForward && (
        <ForwardModal
          convId={conv.id}
          onClose={() => setShowForward(false)}
          onForwarded={handleForwarded}
        />
      )}
    </div>
  )
}


// ── Page ──────────────────────────────────────────────────────────────────────

const CHANNELS = ['', 'sandbox', 'web', 'whatsapp', 'facebook', 'telegram']
const STATUSES = ['', 'open', 'resolved', 'escalated']

export default function ConversationsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
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

  // Auto-select conversation when navigated from a notification link (?id=X)
  useEffect(() => {
    const targetId = parseInt(router.query.id, 10)
    if (!targetId || loading || convs.length === 0) return
    const match = convs.find(c => c.id === targetId)
    if (match) {
      setSelected(match)
    } else {
      // Conversation may not be on current page — fetch it directly
      fetch(`/api/conversations/${targetId}`).then(r => r.ok ? r.json() : null).then(data => {
        if (data?.conversation) setSelected(data.conversation)
      }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.id, loading])

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
            <Thread conv={selected} onStatusChange={handleStatusChange} currentUser={user} />
          </div>
        </div>
      </div>
    </>
  )
}
