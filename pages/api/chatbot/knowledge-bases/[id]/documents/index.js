import fs from 'fs'
import prisma from '../../../../../../lib/prisma'
import { getSession } from '../../../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse, checkPlanLimit, planLimitResponse } from '../../../../../../lib/planLimits'
import { chunkText, chunkQA } from '../../../../../../lib/chunker'

export const config = { api: { bodyParser: false } }

// ── startup cleanup ──────────────────────────────────────────────────────────
// If the server crashed mid-ingest, documents may be stuck in 'processing'.
// Reset anything older than 5 minutes on first module load.
;(async () => {
  try {
    const staleAt = new Date(Date.now() - 5 * 60 * 1000)
    const { count } = await prisma.knowledgeBaseDocument.updateMany({
      where: { status: 'processing', createdAt: { lt: staleAt } },
      data: { status: 'error', errorMessage: 'El servidor se reinició durante el procesamiento. Intenta de nuevo.' },
    })
    if (count > 0) console.log(`[chatbot] cleaned up ${count} stale 'processing' docs`)
  } catch { /* non-fatal */ }
})()

// ── helpers ─────────────────────────────────────────────────────────────────

// eval('require') bypasses webpack/turbopack static analysis so these
// server-only packages are never included in the bundle — loaded at runtime only.
const _require = eval('require') // eslint-disable-line no-eval

async function extractPdf(filePath) {
  const pdfParse = _require('pdf-parse')
  const buffer = fs.readFileSync(filePath)
  const data = await pdfParse(buffer)
  return data.text ?? ''
}

/**
 * Lightweight regex-based HTML→text extractor.
 * Avoids loading a DOM library (cheerio) mid-request which caused V8 OOM
 * on memory-constrained machines when the Prisma TLS pool was also active.
 */
function htmlToText(html) {
  return html
    // Drop entire script / style / noscript blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    // Strip remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTitle(html, fallback) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  if (m?.[1]?.trim()) return m[1].trim()
  const h1 = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)
  if (h1?.[1]?.trim()) return h1[1].replace(/<[^>]+>/g, '').trim()
  return fallback
}

async function scrapeUrl(url, depth = 0) {
  const https = _require('https')
  const http  = _require('http')

  const html = await new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'HittekCRM/1.0 (+https://hittek.mx)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'identity',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      },
      timeout: 15000,
    }, res => {
      // Follow up to 2 redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && depth < 2) {
        const loc = res.headers.location
        if (loc) { res.resume(); return resolve(scrapeUrl(loc, depth + 1)) }
      }
      if (res.statusCode && res.statusCode >= 400) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const buffers = []
      res.on('data', c => buffers.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      res.on('end',  () => resolve(Buffer.concat(buffers).toString('utf-8')))
      res.on('error', reject)
    })
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')) })
    req.on('error', reject)
  })

  const title = extractTitle(html, new URL(url).hostname)
  const text  = htmlToText(html)
  if (!text) throw new Error('No se pudo extraer texto de la URL')
  return { title, text }
}

async function persistChunks(prisma, chunks, documentId, kbId, orgId) {
  if (chunks.length === 0) return
  await prisma.knowledgeBaseChunk.createMany({
    data: chunks.map(c => ({
      documentId,
      kbId,
      orgId,
      content:    c.content,
      chunkIndex: c.chunkIndex,
      tokenCount: c.tokenCount,
    })),
  })
}

// ── handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const kbId = parseInt(req.query.id)
  if (isNaN(kbId)) return res.status(400).json({ error: 'ID inválido' })

  const kb = await prisma.knowledgeBase.findFirst({ where: { id: kbId, orgId: organizationId } })
  if (!kb) return res.status(404).json({ error: 'Base de conocimiento no encontrada' })

  // ── GET: list documents ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    const docs = await prisma.knowledgeBaseDocument.findMany({
      where: { knowledgeBaseId: kbId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, type: true, title: true, status: true,
        chunkCount: true, fileSize: true, sourceUrl: true,
        question: true, errorMessage: true, createdAt: true,
      },
    })
    return res.status(200).json(docs)
  }

  // ── POST: add document ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const docLimit = await checkPlanLimit(prisma, organizationId, 'kbDocuments')
    if (!docLimit.allowed) return planLimitResponse(res, { ...docLimit, entity: 'documentos de conocimiento' })

    // Parse multipart (PDF) or JSON (url / qa)
    let fields = {}
    let file   = null

    const contentType = req.headers['content-type'] ?? ''

    if (contentType.includes('multipart/form-data')) {
      const { IncomingForm } = _require('formidable')
      const form = new IncomingForm({ maxFileSize: 20 * 1024 * 1024 })
      await new Promise((resolve, reject) => {
        form.parse(req, (err, f, files) => {
          if (err) return reject(err)
          fields = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))
          file = Array.isArray(files.file) ? files.file[0] : files.file
          resolve()
        })
      })
    } else {
      // Buffer JSON body manually (bodyParser disabled)
      const raw = await new Promise((resolve, reject) => {
        let data = ''
        req.on('data', c => { data += c })
        req.on('end', () => resolve(data))
        req.on('error', reject)
      })
      try { fields = JSON.parse(raw) } catch { return res.status(400).json({ error: 'JSON inválido' }) }
    }

    const type = fields.type // 'pdf' | 'url' | 'qa'
    if (!['pdf', 'url', 'qa'].includes(type)) return res.status(400).json({ error: 'Tipo inválido' })

    // Create document record immediately, process inline
    let docData = {
      knowledgeBaseId: kbId,
      orgId: organizationId,
      type,
      title: 'Procesando…',
      status: 'processing',
    }

    const doc = await prisma.knowledgeBaseDocument.create({ data: docData })

    // Update KB status
    await prisma.knowledgeBase.update({ where: { id: kbId }, data: { status: 'indexing' } })

    // Process inline — for production this should be a queue job, but fine for now
    try {
      let extractedText = ''
      let title = ''
      let fileUrl = null
      let sourceUrl = null
      let question = null
      let answer = null
      let fileSize = null
      let chunks = []

      if (type === 'pdf') {
        if (!file) throw new Error('No se recibió el archivo PDF')
        fileSize = file.size
        title = fields.title?.trim() || file.originalFilename || 'Documento PDF'

        // Upload to Vercel Blob
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          const { put } = await import('@vercel/blob')
          const fileBuffer = fs.readFileSync(file.filepath)
          const blob = await put(`kb/${organizationId}/${kbId}/${doc.id}.pdf`, fileBuffer, {
            access: 'public',
            contentType: 'application/pdf',
          })
          fileUrl = blob.url
        }

        // Extract text
        extractedText = await extractPdf(file.filepath)
        if (!extractedText.trim()) throw new Error('No se pudo extraer texto del PDF')
        chunks = chunkText(extractedText)

      } else if (type === 'url') {
        const rawUrl = fields.url?.trim()
        if (!rawUrl) throw new Error('URL requerida')
        new URL(rawUrl) // validate
        sourceUrl = rawUrl
        const scraped = await scrapeUrl(rawUrl)
        title = fields.title?.trim() || scraped.title
        extractedText = scraped.text
        if (!extractedText.trim()) throw new Error('No se pudo extraer texto de la URL')
        chunks = chunkText(extractedText)

      } else if (type === 'qa') {
        question = fields.question?.trim()
        answer   = fields.answer?.trim()
        if (!question || !answer) throw new Error('Pregunta y respuesta requeridas')
        title = question.slice(0, 100)
        extractedText = `Q: ${question}\nA: ${answer}`
        chunks = chunkQA(question, answer)
      }

      // Persist chunks
      await persistChunks(prisma, chunks, doc.id, kbId, organizationId)

      // Update document to chunked
      await prisma.knowledgeBaseDocument.update({
        where: { id: doc.id },
        data: {
          title,
          content: extractedText.slice(0, 50000), // cap raw content at 50k chars
          fileUrl,
          sourceUrl,
          question,
          answer,
          fileSize,
          status: 'chunked',
          chunkCount: chunks.length,
        },
      })

      // Update KB status to ready
      await prisma.knowledgeBase.update({ where: { id: kbId }, data: { status: 'ready' } })

      const result = await prisma.knowledgeBaseDocument.findUnique({ where: { id: doc.id } })
      return res.status(201).json(result)

    } catch (err) {
      await prisma.knowledgeBaseDocument.update({
        where: { id: doc.id },
        data: { status: 'error', errorMessage: err.message, title: fields.title || 'Error' },
      })
      // Recompute KB status
      const chunkedCount = await prisma.knowledgeBaseDocument.count({
        where: { knowledgeBaseId: kbId, status: { in: ['chunked', 'indexed'] } },
      })
      await prisma.knowledgeBase.update({
        where: { id: kbId },
        data: { status: chunkedCount > 0 ? 'ready' : 'empty' },
      })
      return res.status(422).json({ error: err.message })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end()
}
