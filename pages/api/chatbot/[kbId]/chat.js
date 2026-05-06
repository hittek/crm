/**
 * POST /api/chatbot/[kbId]/chat
 *
 * RAG chat endpoint.
 *
 * SPENDING GUARD SUMMARY
 * ─────────────────────
 * Per user message, exactly:
 *   • 1 Voyage API call  — embed the query (via searchChunks)
 *   • 1 Anthropic call   — generate reply, max_tokens: 800 hard cap
 * No retries, no loops, no polling.
 *
 * Response: Server-Sent Events (text/event-stream)
 *   data: {"delta":"..."}   — streamed text tokens
 *   data: [DONE]            — stream finished
 *   data: {"error":"..."}   — on failure
 */

import Anthropic from '@anthropic-ai/sdk'
import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../lib/planLimits'
import { searchChunks } from '../../../../lib/rag'

export const config = { api: { bodyParser: true } }

const MODEL      = 'claude-3-5-haiku-20241022'
const MAX_TOKENS = 800   // hard cap — prevents runaway token spend
const TOP_K      = 5     // chunks to include as context

// Lazy singleton — not instantiated until first request
let _anthropic = null
function getAnthropic() {
  if (!_anthropic) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY not set')
    _anthropic = new Anthropic({ apiKey: key })
  }
  return _anthropic
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── auth ──────────────────────────────────────────────────────────────────
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  // ── validate input ────────────────────────────────────────────────────────
  const kbId   = parseInt(req.query.kbId, 10)
  const { message } = req.body

  if (!kbId || isNaN(kbId))        return res.status(400).json({ error: 'kbId inválido' })
  if (!message?.trim())             return res.status(400).json({ error: 'message requerido' })
  if (message.length > 2000)        return res.status(400).json({ error: 'message demasiado largo (máx 2000 chars)' })

  // ── verify KB belongs to org ──────────────────────────────────────────────
  const kb = await prisma.knowledgeBase.findFirst({
    where: { id: kbId, orgId: organizationId },
    select: { id: true, name: true, status: true },
  })
  if (!kb) return res.status(404).json({ error: 'Base de conocimiento no encontrada' })
  if (kb.status === 'empty') return res.status(422).json({ error: 'La base de conocimiento está vacía. Agrega documentos primero.' })

  // ── RAG: embed query + similarity search (1 Voyage call + 1 SQL) ──────────
  let chunks
  try {
    chunks = await searchChunks({ query: message, kbId, orgId: organizationId, limit: TOP_K })
  } catch (err) {
    console.error('[chat] RAG search error:', err.message)
    return res.status(500).json({ error: 'Error buscando contexto relevante' })
  }

  // ── build Claude prompt ───────────────────────────────────────────────────
  const contextText = chunks.length > 0
    ? chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
    : '(No se encontró contexto relevante en la base de conocimiento)'

  const systemPrompt = `Eres un asistente de soporte útil para ${kb.name}.
Responde usando únicamente el siguiente contexto. Si la respuesta no está en el contexto, dilo claramente.
Sé conciso y directo. Responde en el mismo idioma que el usuario.

CONTEXTO:
${contextText}`

  // ── stream response via SSE ───────────────────────────────────────────────
  res.setHeader('Content-Type',  'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.flushHeaders()

  // Helper — write SSE frame
  const emit = data => res.write(`data: ${JSON.stringify(data)}\n\n`)

  try {
    // 1 Anthropic streaming call — max_tokens hard-capped at MAX_TOKENS
    const stream = getAnthropic().messages.stream({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: message.trim() }],
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta?.type === 'text_delta'
      ) {
        emit({ delta: event.delta.text })
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()

  } catch (err) {
    console.error('[chat] Anthropic error:', err.message)
    emit({ error: 'Error generando respuesta. Intenta de nuevo.' })
    res.end()
  }
}
