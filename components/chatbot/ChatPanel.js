/**
 * ChatPanel — sandbox for testing KB responses via Claude RAG.
 *
 * Per-message API cost: 1 Voyage call + 1 Anthropic call (max_tokens: 800).
 * No retry logic, no auto-send, no polling.
 * When chatbotId is provided, conversations are persisted.
 */
import { useState, useRef, useEffect } from 'react'
import Icons from '../ui/Icons'

const EMPTY_MESSAGES = []

// Simple UUID v4 generator — no external dep
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export default function ChatPanel({ kb, chatbotId, variant = 'standalone' }) {
  const [messages, setMessages]   = useState(EMPTY_MESSAGES)
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const sessionId                 = useRef(uuid()) // stable per mount
  const bottomRef                 = useRef(null)
  const inputRef                  = useRef(null)

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setLoading(true)

    // Add user message + placeholder assistant message
    const userMsg = { role: 'user', content: text }
    const asstMsg = { role: 'assistant', content: '', loading: true }
    setMessages(prev => [...prev, userMsg, asstMsg])

    try {
      const resp = await fetch(`/api/chatbot/${kb.id}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:   text,
          sessionId: sessionId.current,
          chatbotId: chatbotId || undefined,
        }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `Error ${resp.status}` }))
        throw new Error(err.error || `Error ${resp.status}`)
      }

      // Parse SSE stream — accumulate delta tokens into the assistant message
      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE lines
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // keep the incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break

          let parsed
          try { parsed = JSON.parse(payload) } catch { continue }

          if (parsed.error) throw new Error(parsed.error)

          if (parsed.delta) {
            setMessages(prev => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, content: last.content + parsed.delta, loading: true }
              }
              return next
            })
          }
        }
      }

    } catch (err) {
      setMessages(prev => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant') {
          next[next.length - 1] = { role: 'assistant', content: `⚠ ${err.message}`, loading: false, error: true }
        }
        return next
      })
    } finally {
      // Mark assistant message as done (remove loading indicator)
      setMessages(prev => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant') {
          next[next.length - 1] = { ...last, loading: false }
        }
        return next
      })
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function clearChat() {
    setMessages(EMPTY_MESSAGES)
    setInput('')
    inputRef.current?.focus()
  }

  const canSend = input.trim().length > 0 && !loading
  const hasMessages = messages.length > 0
  const isInline = variant === 'inline'

  return (
    <div
      className={isInline
        ? 'flex flex-col h-full'
        : 'mx-4 sm:mx-6 mb-4 sm:mb-6 flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white'
      }
      style={isInline ? undefined : (collapsed ? undefined : { height: '340px' })}
    >
      {/* Header — standalone only */}
      {!isInline && (
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-between w-full px-4 py-2.5 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icons.bot className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-gray-700">Sandbox del chatbot</span>
            <span className="text-xs text-gray-400 hidden sm:inline">— {kb.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {hasMessages && !collapsed && (
              <span
                role="button"
                tabIndex={-1}
                onClick={e => { e.stopPropagation(); clearChat() }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1"
                title="Limpiar conversación"
              >
                Limpiar
              </span>
            )}
            <Icons.chevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
            />
          </div>
        </button>
      )}

      {/* Messages + Input — hidden when collapsed */}
      {!collapsed && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {!hasMessages && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-2">
                <Icons.bot className="w-8 h-8 opacity-30" />
                <p className="text-sm">Escribe una pregunta para probar el chatbot</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={[
                    'max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : msg.error
                        ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm',
                  ].join(' ')}
                >
                  {msg.content || (msg.loading ? <span className="inline-block w-4 animate-pulse">▋</span> : '')}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe una pregunta…"
              disabled={loading}
              maxLength={2000}
              className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50 disabled:bg-gray-50"
            />
            {isInline && hasMessages && (
              <button
                type="button"
                onClick={clearChat}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                title="Limpiar"
              >
                <Icons.refresh className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={!canSend}
              className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Enviar"
            >
              <Icons.send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </div>
  )
}

// Convenience alias — fills a flex parent, no fixed height, no standalone header
export function ChatPanelInline({ kb, chatbotId }) {
  return <ChatPanel kb={kb} chatbotId={chatbotId} variant="inline" />
}
