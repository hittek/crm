import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Icons from '../components/ui/Icons'
import { useAuth } from '../lib/AuthContext'
import { useDealStages } from '../lib/SettingsContext'
import { PageLoader } from '../components/ui/Spinner'
import UpgradeWall from '../components/ui/UpgradeWall'
import { useModalClose } from '../components/ui/Modal'
import ChatPanel, { ChatPanelInline } from '../components/chatbot/ChatPanel'
import { useI18n } from '../lib/i18n'

function StatusBadge({ status, t }) {
  const map = {
    ready:  'bg-green-100 text-green-700',
    empty:  'bg-gray-100 text-gray-500',
    error:  'bg-red-100 text-red-700',
  }
  const getLabel = () => {
    if (t) {
      if (status === 'ready') return t('chatbot.ready')
      if (status === 'error') return t('common.error')
    }
    return { ready: 'Lista', empty: 'Vacía', error: 'Error' }[status] || status
  }
  const cls = map[status] || 'bg-gray-100 text-gray-500'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{getLabel()}</span>
}

// ── Create/Edit modal ─────────────────────────────────────────────────────────

function BotModal({ bot, kbs, dealStages, onClose, onSave }) {
  const { t } = useI18n()
  const [form, setForm] = useState({
    name:             bot?.name             || '',
    kbId:             bot?.kbId             || (kbs[0]?.id || ''),
    greeting:         bot?.greeting         || 'Hola, ¿en qué puedo ayudarte?',
    escalationPhrase: bot?.escalationPhrase || '',
    primaryColor:     bot?.primaryColor     || '#2563eb',
    // CRM automation
    autoCreateContact: bot?.autoCreateContact ?? false,
    autoCreateDeal:    bot?.autoCreateDeal    ?? false,
    defaultDealStage:  bot?.defaultDealStage  || '',
    dealTitleTemplate: bot?.dealTitleTemplate || 'Consulta vía {channel}',
    // Tool-use capabilities (comma-separated tool names)
    enabledTools:      bot?.enabledTools      || '',
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  useModalClose(onClose)

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{bot ? t('chatbot.editBot') : t('chatbot.newBot')}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><Icons.close className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('chatbot.botName')}</label>
            <input
              type="text" required value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ej: Soporte Técnico"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('chatbot.botKb')}</label>
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

          {/* ── Automation & CRM ──────────────────────────────────────────── */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
              <Icons.settings className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Automatización CRM</span>
            </div>

            <div className="px-3 py-3 space-y-3">

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox" checked={form.autoCreateContact}
                    onChange={e => set('autoCreateContact', e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Crear contacto automáticamente</span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Crea un nuevo contacto en el CRM cuando un usuario nuevo inicia conversación (WhatsApp: usa el número de teléfono).
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox" checked={form.autoCreateDeal}
                    onChange={e => set('autoCreateDeal', e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Abrir oportunidad automáticamente</span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Crea un nuevo trato en el pipeline cuando un contacto inicia conversación y no tiene un trato abierto.
                    </p>
                  </div>
                </label>

                {form.autoCreateDeal && (
                  <div className="pl-6 space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Etapa inicial</label>
                      <select
                        value={form.defaultDealStage} onChange={e => set('defaultDealStage', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                      >
                        <option value="">— primera etapa —</option>
                        {dealStages
                          .filter(s => s.id !== 'won' && s.id !== 'lost')
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Título del trato</label>
                      <input
                        type="text" value={form.dealTitleTemplate}
                        onChange={e => set('dealTitleTemplate', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                      <p className="text-xs text-gray-400 mt-0.5">Usa {'{channel}'} para el canal (whatsapp, telegram…)</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Herramientas Claude habilitadas <span className="text-gray-400 font-normal">(tool use)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['create_contact', 'create_quote'].map(tool => {
                      const enabled = (form.enabledTools || '').split(',').map(t => t.trim()).includes(tool)
                      const isQuote = tool === 'create_quote'
                      return (
                        <button
                          key={tool} type="button"
                          onClick={() => {
                            const current = (form.enabledTools || '').split(',').map(t => t.trim()).filter(Boolean)
                            const next = enabled ? current.filter(t => t !== tool) : [...current, tool]
                            set('enabledTools', next.join(','))
                          }}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            enabled
                              ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {tool}
                          {isQuote && enabled && (
                            <span className="ml-1 opacity-60">+ lookup_products</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Permite que Claude llame funciones del CRM durante la conversación.
                  </p>
                </div>

            </div>
          </div>

          </div>{/* end scroll wrapper */}

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {saving ? t('chatbot.saving') : bot ? t('common.save') : t('chatbot.newBot')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Channel management modal ─────────────────────────────────────────────────

const CHANNEL_META = {
  telegram:  { label: 'Telegram',          icon: Icons.send,        color: 'text-sky-500',    bg: 'bg-sky-50' },
  whatsapp:  { label: 'WhatsApp',          icon: Icons.messageSquare, color: 'text-green-600', bg: 'bg-green-50' },
  facebook:  { label: 'Facebook Messenger', icon: Icons.globe,       color: 'text-blue-600',   bg: 'bg-blue-50' },
}

function ChannelsModal({ bot, onClose }) {
  const { t } = useI18n()
  const [channels, setChannels] = useState([])
  const [loading, setLoading]   = useState(true)
  const [active, setActive]     = useState(null)   // which channel card is expanded for connect
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [copied, setCopied]     = useState(false)
  useModalClose(onClose)

  useEffect(() => {
    fetch(`/api/chatbot/bots/${bot.id}/channels`)
      .then(r => r.json())
      .then(d => { setChannels(d.channels || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [bot.id])

  const connectedMap = Object.fromEntries(channels.map(c => [c.channel, c]))

  const [warning, setWarning] = useState(null)

  async function connect(channel) {
    setSaving(true); setError(null)
    const body = { channel, ...form }
    const r = await fetch(`/api/chatbot/bots/${bot.id}/channels`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await r.json()
    if (!r.ok) { setError(data.error || 'Error conectando'); setSaving(false); return }
    setChannels(prev => [...prev, data.channel])
    setActive(null); setForm({})
    if (data.warning) setWarning(data.warning)
    setSaving(false)
  }

  async function disconnect(channel) {
    if (!confirm(`¿Desconectar ${CHANNEL_META[channel].label}?`)) return
    const r = await fetch(`/api/chatbot/bots/${bot.id}/channels?channel=${channel}`, { method: 'DELETE' })
    if (r.ok) setChannels(prev => prev.filter(c => c.channel !== channel))
  }

  function copyWebhook(channel) {
    const url = channel === 'telegram'
      ? `${window.location.origin}/api/webhook/telegram/${bot.apiKey}`
      : channel === 'whatsapp'
      ? `${window.location.origin}/api/webhook/whatsapp`
      : `${window.location.origin}/api/webhook/facebook`
    navigator.clipboard.writeText(url)
    setCopied(channel)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Canales — {bot.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Conecta los canales donde tus clientes te escriben</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><Icons.close className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {warning && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
              <Icons.alert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span>{warning}</span>
            </div>
          )}
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-6">{t('common.loading')}</p>
          ) : (
            Object.entries(CHANNEL_META).map(([key, meta]) => {
              const connected = connectedMap[key]
              const Icon      = meta.icon
              const isOpen    = active === key

              return (
                <div key={key} className={`border rounded-xl transition-all ${connected ? 'border-green-200 bg-green-50/40' : 'border-gray-200'}`}>
                  {/* Channel row */}
                  <div className="flex items-center gap-3 p-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                      {connected ? (
                        <p className={`text-xs flex items-center gap-1 mt-0.5 ${connected.isActive ? 'text-green-600' : 'text-amber-600'}`}>
                          {connected.isActive ? <Icons.check className="w-3 h-3" /> : <Icons.alert className="w-3 h-3" />}
                          {connected.botUsername ? `@${connected.botUsername}` : connected.phoneNumberId || connected.pageId || 'Conectado'}
                          {!connected.isActive && <span className="text-amber-500">(pendiente HTTPS)</span>}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">No conectado</p>
                      )}
                    </div>
                    {connected ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyWebhook(key)}
                          className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1"
                          title="Copiar URL del webhook"
                        >
                          {copied === key ? <Icons.check className="w-3 h-3 text-green-500" /> : <Icons.copy className="w-3 h-3" />}
                          URL
                        </button>
                        <button
                          onClick={() => disconnect(key)}
                          className="px-2.5 py-1.5 text-xs rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setActive(isOpen ? null : key); setError(null); setForm({}) }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                      >
                        Conectar
                      </button>
                    )}
                  </div>

                  {/* Expand connect form */}
                  {isOpen && !connected && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                      {key === 'telegram' && (
                        <>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Token del bot</label>
                            <input
                              type="text" placeholder="123456789:ABCdef..."
                              value={form.botToken || ''} onChange={e => setForm(f => ({ ...f, botToken: e.target.value }))}
                              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 font-mono"
                            />
                            <p className="text-xs text-gray-400 mt-1">Obtén el token de <span className="font-medium">@BotFather</span> en Telegram</p>
                          </div>
                        </>
                      )}

                      {key === 'whatsapp' && (
                        <>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Phone Number ID</label>
                            <input
                              type="text" placeholder="123456789012345"
                              value={form.phoneNumberId || ''} onChange={e => setForm(f => ({ ...f, phoneNumberId: e.target.value }))}
                              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Access Token</label>
                            <input
                              type="password" placeholder="EAAxxxxxxxxxx..."
                              value={form.accessToken || ''} onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))}
                              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Verify Token <span className="text-gray-400 font-normal">(lo mismo que en Meta Dashboard)</span></label>
                            <div className="flex gap-2">
                              <input
                                type="text" placeholder="mi_token_secreto"
                                value={form.verifyToken || ''} onChange={e => setForm(f => ({ ...f, verifyToken: e.target.value }))}
                                className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                              />
                              <button type="button" onClick={() => setForm(f => ({ ...f, verifyToken: crypto.randomUUID().replace(/-/g, '').slice(0, 24) }))}
                                className="text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors whitespace-nowrap">
                                Generar
                              </button>
                            </div>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                            <p className="font-medium mb-1">URL del webhook para Meta Dashboard:</p>
                            <code className="break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/whatsapp</code>
                          </div>
                        </>
                      )}

                      {key === 'facebook' && (
                        <>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Page ID</label>
                            <input
                              type="text" placeholder="123456789012345"
                              value={form.pageId || ''} onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))}
                              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Page Access Token</label>
                            <input
                              type="password" placeholder="EAAxxxxxxxxxx..."
                              value={form.pageAccessToken || ''} onChange={e => setForm(f => ({ ...f, pageAccessToken: e.target.value }))}
                              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Verify Token</label>
                            <div className="flex gap-2">
                              <input
                                type="text" placeholder="mi_token_secreto"
                                value={form.verifyToken || ''} onChange={e => setForm(f => ({ ...f, verifyToken: e.target.value }))}
                                className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                              />
                              <button type="button" onClick={() => setForm(f => ({ ...f, verifyToken: crypto.randomUUID().replace(/-/g, '').slice(0, 24) }))}
                                className="text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors whitespace-nowrap">
                                Generar
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">App Secret <span className="text-gray-400 font-normal">(para validar firmas, opcional)</span></label>
                            <input
                              type="password" placeholder="abc123..."
                              value={form.appSecret || ''} onChange={e => setForm(f => ({ ...f, appSecret: e.target.value }))}
                              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                            />
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                            <p className="font-medium mb-1">URL del webhook para Meta Dashboard:</p>
                            <code className="break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/facebook</code>
                          </div>
                        </>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button onClick={() => { setActive(null); setForm({}) }} className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
                          {t('common.cancel')}
                        </button>
                        <button
                          onClick={() => connect(key)}
                          disabled={saving}
                          className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40"
                        >
                          {saving ? t('common.saving') : t('common.save')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ── Bot card ──────────────────────────────────────────────────────────────────

function BotCard({ bot, onEdit, onDelete, onTest, onChannels, isTesting, t }) {
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
          <button onClick={() => onTest(bot)} title={t ? t('chatbot.testBot') : 'Probar chatbot'}
            className={`p-1.5 rounded-lg transition-colors ${isTesting ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-400'}`}>
            <Icons.send className="w-4 h-4" />
          </button>
          <button onClick={() => onChannels(bot)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" title={t ? t('chatbot.channels') : 'Canales'}>
            <Icons.globe className="w-4 h-4" />
          </button>
          <button onClick={() => onEdit(bot)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" title={t ? t('common.edit') : 'Editar'}>
            <Icons.edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(bot)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title={t ? t('common.delete') : 'Eliminar'}>
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
        <StatusBadge status={bot.kb?.status} t={t} />
        <span className={`text-xs font-medium ${bot.isActive ? 'text-green-600' : 'text-gray-400'}`}>
          {bot.isActive ? 'Activo' : 'Inactivo'}
        </span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatbotsPage() {
  const { t } = useI18n()
  const { user, org, loading: authLoading } = useAuth()
  const router = useRouter()
  const dealStages = useDealStages()
  const [bots, setBots]         = useState([])
  const [kbs, setKbs]           = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [editBot, setEditBot]         = useState(null)
  const [testingBot, setTestingBot]   = useState(null)   // bot currently in sandbox
  const [channelsBot, setChannelsBot] = useState(null)   // bot with channels modal open

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
    if (!confirm(t('chatbot.deleteBotConfirm', { name: bot.name }))) return
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

  function handleChannels(bot) {
    setChannelsBot(bot)
  }

  if (authLoading) return <PageLoader />

  if (org?.planStatus === 'trialing') {
    return <UpgradeWall reason="feature_unavailable" />
  }

  return (
    <>
      <Head><title>{t('nav.chatbots')} | CRM</title></Head>

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — bot list */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="px-6 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('chatbot.botsTitle')}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{t('chatbot.noBotsDesc')}</p>
              </div>
              <button
                onClick={() => { setEditBot(null); setShowModal(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Icons.plus className="w-4 h-4" />
                {t('chatbot.newBot')}
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
                <h3 className="text-base font-semibold text-gray-700 mb-1">{t('chatbot.noBots')}</h3>
                <p className="text-sm text-gray-400 mb-5 max-w-xs">
                  {t('chatbot.noBotsDesc')}
                </p>
                {kbs.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    {t('chatbot.noKbsYet')}
                  </p>
                ) : (
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {t('chatbot.createFirstBot')}
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
                    onChannels={handleChannels}
                    t={t}
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
          dealStages={dealStages}
          onClose={() => { setShowModal(false); setEditBot(null) }}
          onSave={handleSave}
        />
      )}

      {channelsBot && (
        <ChannelsModal
          bot={channelsBot}
          onClose={() => setChannelsBot(null)}
        />
      )}
    </>
  )
}
