import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Icons from '../components/ui/Icons'
import { useAuth } from '../lib/AuthContext'
import { PageLoader } from '../components/ui/Spinner'
import ChatPanel, { ChatPanelInline } from '../components/chatbot/ChatPanel'

// ── helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    ready:  'bg-green-100 text-green-700',
    empty:  'bg-gray-100 text-gray-500',
    error:  'bg-red-100 text-red-700',
  }
  const label = { ready: 'Lista', empty: 'Vacía', error: 'Error' }
  const cls = map[status] || 'bg-gray-100 text-gray-500'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label[status] || status}</span>
}

// ── Create/Edit modal ─────────────────────────────────────────────────────────

function BotModal({ bot, kbs, onClose, onSave }) {
  const [form, setForm] = useState({
    name:             bot?.name             || '',
    kbId:             bot?.kbId             || (kbs[0]?.id || ''),
    greeting:         bot?.greeting         || 'Hola, ¿en qué puedo ayudarte?',
    escalationPhrase: bot?.escalationPhrase || '',
    primaryColor:     bot?.primaryColor     || '#2563eb',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('El nombre es requerido')
    if (!form.kbId)        return setError('Selecciona una base de conocimiento')
    setSaving(true)
    setError(null)
    try {
      const url    = bot ? `/api/chatbot/bots/${bot.id}` : '/api/chatbot/bots'
      const method = bot ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, kbId: parseInt(form.kbId) }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error guardando')
      onSave(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{bot ? 'Editar chatbot' : 'Nuevo chatbot'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><Icons.close className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del chatbot</label>
            <input
              type="text" required value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ej: Soporte Técnico"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Base de conocimiento</label>
            <select
              required value={form.kbId} onChange={e => set('kbId', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            >
              <option value="">Seleccionar…</option>
              {kbs.map(kb => (
                <option key={kb.id} value={kb.id}>{kb.name} ({kb.status === 'ready' ? 'lista' : kb.status})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mensaje de bienvenida</label>
            <textarea
              rows={2} value={form.greeting} onChange={e => set('greeting', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Frase de escalación <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text" value={form.escalationPhrase} onChange={e => set('escalationPhrase', e.target.value)}
              placeholder='Ej: "hablar con agente" — transfiere a humano'
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Color primario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border border-gray-200"
                />
                <span className="text-sm text-gray-500 font-mono">{form.primaryColor}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {saving ? 'Guardando…' : bot ? 'Guardar cambios' : 'Crear chatbot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Bot card ──────────────────────────────────────────────────────────────────

function BotCard({ bot, onEdit, onDelete, onTest, isTesting }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: bot.primaryColor + '20' }}
          >
            <Icons.bot className="w-5 h-5" style={{ color: bot.primaryColor }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{bot.name}</h3>
            <p className="text-xs text-gray-500 truncate mt-0.5">KB: {bot.kb?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onTest(bot)} title="Probar chatbot"
            className={`p-1.5 rounded-lg transition-colors ${isTesting ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-400'}`}>
            <Icons.send className="w-4 h-4" />
          </button>
          <button onClick={() => onEdit(bot)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" title="Editar">
            <Icons.edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(bot)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
            <Icons.trash className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-start gap-2">
          <Icons.messageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-500 line-clamp-2">{bot.greeting}</p>
        </div>
        {bot.escalationPhrase && (
          <div className="flex items-center gap-2">
            <Icons.alert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <p className="text-xs text-gray-500">Escalación: «{bot.escalationPhrase}»</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <StatusBadge status={bot.kb?.status} />
        <span className={`text-xs font-medium ${bot.isActive ? 'text-green-600' : 'text-gray-400'}`}>
          {bot.isActive ? 'Activo' : 'Inactivo'}
        </span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatbotsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [bots, setBots]         = useState([])
  const [kbs, setKbs]           = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editBot, setEditBot]   = useState(null)
  const [testingBot, setTestingBot] = useState(null)   // bot currently in sandbox

  const fetchBots = useCallback(async () => {
    const [rb, rk] = await Promise.all([
      fetch('/api/chatbot/bots'),
      fetch('/api/chatbot/knowledge-bases'),
    ])
    if (rb.ok) setBots(await rb.json())
    if (rk.ok) setKbs(await rk.json())
    setLoading(false)
  }, [])

  useEffect(() => { if (user) fetchBots() }, [user, fetchBots])

  async function handleDelete(bot) {
    if (!confirm(`¿Eliminar el chatbot «${bot.name}»? Se eliminará también el historial de conversaciones.`)) return
    const r = await fetch(`/api/chatbot/bots/${bot.id}`, { method: 'DELETE' })
    if (r.ok) setBots(prev => prev.filter(b => b.id !== bot.id))
  }

  function handleSave(saved) {
    setBots(prev => {
      const exists = prev.find(b => b.id === saved.id)
      return exists ? prev.map(b => b.id === saved.id ? saved : b) : [saved, ...prev]
    })
    setShowModal(false)
    setEditBot(null)
  }

  function handleTest(bot) {
    setTestingBot(prev => prev?.id === bot.id ? null : bot)
  }

  if (authLoading) return <PageLoader />

  return (
    <>
      <Head><title>Mis Chatbots</title></Head>

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — bot list */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="px-6 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mis Chatbots</h1>
                <p className="text-sm text-gray-500 mt-0.5">Configura chatbots para conectar con WhatsApp, Facebook y Telegram</p>
              </div>
              <button
                onClick={() => { setEditBot(null); setShowModal(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Icons.plus className="w-4 h-4" />
                Nuevo chatbot
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-20">
                <PageLoader />
              </div>
            )}

            {/* Empty state */}
            {!loading && bots.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
                  <Icons.bot className="w-7 h-7 text-primary-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">Sin chatbots todavía</h3>
                <p className="text-sm text-gray-400 mb-5 max-w-xs">
                  Crea tu primer chatbot y conéctalo a una base de conocimiento para empezar a responder automáticamente.
                </p>
                {kbs.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    Primero necesitas crear una base de conocimiento en la sección <strong>Chatbot IA</strong>.
                  </p>
                ) : (
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Crear primer chatbot
                  </button>
                )}
              </div>
            )}

            {/* Bot grid — narrows when test panel is open */}
            {bots.length > 0 && (
              <div className={`grid gap-4 ${testingBot ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                {bots.map(bot => (
                  <BotCard
                    key={bot.id}
                    bot={bot}
                    isTesting={testingBot?.id === bot.id}
                    onTest={handleTest}
                    onEdit={b => { setEditBot(b); setShowModal(true) }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — test sandbox panel */}
        {testingBot && (
          <div className="w-[400px] shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: testingBot.primaryColor + '20' }}
                >
                  <Icons.bot className="w-3.5 h-3.5" style={{ color: testingBot.primaryColor }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{testingBot.name}</p>
                  <p className="text-xs text-gray-400 truncate">KB: {testingBot.kb?.name}</p>
                </div>
              </div>
              <button onClick={() => setTestingBot(null)} className="p-1 rounded hover:bg-gray-200 text-gray-400 shrink-0">
                <Icons.close className="w-4 h-4" />
              </button>
            </div>

            {/* Greeting hint */}
            {testingBot.greeting && (
              <div className="px-4 py-2.5 bg-primary-50 border-b border-primary-100">
                <p className="text-xs text-primary-700 italic">«{testingBot.greeting}»</p>
              </div>
            )}

            {/* ChatPanel fills remaining space */}
            <div className="flex-1 overflow-hidden">
              <ChatPanelInline kb={testingBot.kb} chatbotId={testingBot.id} />
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <BotModal
          bot={editBot}
          kbs={kbs}
          onClose={() => { setShowModal(false); setEditBot(null) }}
          onSave={handleSave}
        />
      )}
    </>
  )
}
