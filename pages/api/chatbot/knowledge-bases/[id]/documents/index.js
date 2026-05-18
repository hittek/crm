import fs from 'fs'
import { waitUntil } from '@vercel/functions'
import prisma from '../../../../../../lib/prisma'
import { getSession } from '../../../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse, checkPlanLimit, planLimitResponse } from '../../../../../../lib/planLimits'
import { chunkText, chunkQA } from '../../../../../../lib/chunker'
import { embedTexts } from '../../../../../../lib/embeddings'

export const config = { api: { bodyParser: false }, maxDuration: 60 }

// ── startup cleanup ──────────────────────────────────────────────────────────
;(async () => {
  try {
    // 1. Reset stale 'processing' docs (server was killed mid-flight)
    const staleAt = new Date(Date.now() - 10 * 60 * 1000)
    const { count } = await prisma.knowledgeBaseDocument.updateMany({
      where: { status: 'processing', createdAt: { lt: staleAt } },
      data: { status: 'error', errorMessage: 'El servidor se reinició durante el procesamiento. Intenta de nuevo.' },
    })
    if (count > 0) console.log(`[chatbot] cleaned up ${count} stale 'processing' docs`)

    // 2. Backfill embeddings for docs that were chunked but not yet indexed.
    //    SPENDING GUARD: fetches ALL un-embedded chunks in ONE batch.
    //    embedTexts() hard-caps at 100 inputs — if > 100 pending it throws
    //    and we skip silently (they'll be indexed on next retry).
    const pending = await prisma.knowledgeBaseChunk.findMany({
      where:   { embedded: false },
      orderBy: { id: 'asc' },
      select:  { id: true, content: true, documentId: true },
    })
    if (pending.length > 0 && pending.length <= 100) {
      console.log(`[chatbot] backfilling embeddings for ${pending.length} chunks`)
      const embeddings = await embedTexts(pending.map(c => c.content))
      await prisma.$transaction(
        pending.map((chunk, i) =>
          prisma.$executeRawUnsafe(
            `UPDATE "KnowledgeBaseChunk" SET embedding = $1::vector, embedded = true WHERE id = $2`,
            `[${embeddings[i].join(',')}]`,
            chunk.id,
          )
        )
      )
      // Mark the owning documents as indexed
      const docIds = [...new Set(pending.map(c => c.documentId))]
      await prisma.knowledgeBaseDocument.updateMany({
        where: { id: { in: docIds }, status: 'chunked' },
        data:  { status: 'indexed' },
      })
      console.log(`[chatbot] backfill complete — ${pending.length} chunks across ${docIds.length} docs`)
    } else if (pending.length > 100) {
      console.log(`[chatbot] backfill skipped — ${pending.length} chunks exceeds safe batch size; retry individually`)
    }
  } catch (e) { console.error('[chatbot] startup cleanup error:', e.message) }
})()

// ── helpers ─────────────────────────────────────────────────────────────────

async function extractPdf(filePath) {
  const { createRequire } = await import('module')
  const require = createRequire(import.meta.url)
  const pdfParse = require('pdf-parse')
  const data = await pdfParse(fs.readFileSync(filePath))
  return data.text ?? ''
}

// ── Child-process-isolated URL scraper ──────────────────────────────────────
//
// Spawns a disposable child Node.js process (separate OS process, separate
// address space) to fetch and strip each URL. An OOM or crash in the child
// cannot kill the main server — the child exits and we get the error via
// the 'close' event, then mark the document as failed.
//
// --max-old-space-size=256 caps the child's JS heap to 256 MB. Pages larger
// than that are not worth indexing as plain text anyway.

// NOTE: single-quoted strings throughout to avoid any conflict with the
// template-literal delimiter of the parent module.
const SCRAPER_SCRIPT = [
  "'use strict';",
  "var url = process.argv[2];",
  "if (!url) { process.stderr.write('No URL'); process.exit(1); }",
  "var https = require('https'), http = require('http');",
  "var ENT = { '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'\"','&#39;':\"'\",'&nbsp;':' ' };",
  "var SKIP = ['script','style','noscript'];",
  "function htmlToText(html) {",
  "  var MAX=150000, input=html.length>MAX?html.slice(0,MAX):html;",
  "  var lower=input.toLowerCase(), parts=[], i=0;",
  "  while(i<input.length){",
  "    if(input[i]!=='<'){var e=input.indexOf('<',i);parts.push(e===-1?input.slice(i):input.slice(i,e));i=e===-1?input.length:e;continue;}",
  "    var skipped=false;",
  "    for(var t=0;t<SKIP.length;t++){",
  "      var tag=SKIP[t],open='<'+tag;",
  "      if(lower.startsWith(open,i)){",
  "        var af=lower[i+open.length];",
  "        if(!af||/[\\s>/]/.test(af)){",
  "          var close='</'+tag,ci=lower.indexOf(close,i+open.length);",
  "          if(ci!==-1){var ce=lower.indexOf('>',ci);i=ce!==-1?ce+1:ci+close.length;}",
  "          else{i+=open.length;}",
  "          skipped=true;break;",
  "        }",
  "      }",
  "    }",
  "    if(!skipped){var e2=input.indexOf('>',i);parts.push(' ');i=e2!==-1?e2+1:i+1;}",
  "  }",
  "  return parts.join('')",
  "    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/gi,function(m){return ENT[m.toLowerCase()]||m;})",
  "    .replace(/\\s+/g,' ').trim();",
  "}",
  "function extractTitle(html,fb){",
  "  var m=html.match(/<title[^>]*>([^<]*)<\\/title>/i);",
  "  if(m&&m[1]&&m[1].trim())return m[1].trim();",
  "  var h=html.match(/<h1[^>]*>([^<]*)<\\/h1>/i);",
  "  if(h&&h[1]&&h[1].trim())return h[1].replace(/<[^>]+>/g,'').trim();",
  "  return fb;",
  "}",
  "function scrape(url,depth){",
  "  depth=depth||0;",
  "  return new Promise(function(resolve,reject){",
  "    var parsed=new URL(url),lib=parsed.protocol==='https:'?https:http;",
  "    var req=lib.get(url,{headers:{'User-Agent':'HittekCRM/1.0','Accept':'text/html,*/*;q=0.8','Accept-Encoding':'identity'},timeout:20000},function(res){",
  "      if([301,302,303,307,308].indexOf(res.statusCode)!==-1&&depth<2){var loc=res.headers.location;if(loc){res.resume();return resolve(scrape(loc,depth+1));}}",
  "      if(res.statusCode&&res.statusCode>=400){res.resume();return reject(new Error('HTTP '+res.statusCode));}",
  "      var MAX=800000,received=0,settled=false,bufs=[];",
  "      function settle(v){if(!settled){settled=true;resolve(v);}}",
  "      res.on('data',function(c){",
  "        if(settled)return;",
  "        var b=Buffer.isBuffer(c)?c:Buffer.from(c),rem=MAX-received;",
  "        if(rem>0)bufs.push(b.length<=rem?b:b.slice(0,rem));",
  "        received+=b.length;",
  "        if(received>=MAX){res.destroy();settle(Buffer.concat(bufs).toString('utf-8'));}",
  "      });",
  "      res.on('end',function(){settle(Buffer.concat(bufs).toString('utf-8'));});",
  "      res.on('error',function(e){if(!settled)reject(e);});",
  "    });",
  "    req.on('timeout',function(){req.destroy();reject(new Error('Request timed out'));});",
  "    req.on('error',reject);",
  "  });",
  "}",
  "scrape(url).then(function(html){",
  "  var title=extractTitle(html,new URL(url).hostname);",
  "  var text=htmlToText(html);",
  "  if(!text)throw new Error('No se pudo extraer texto de la URL');",
  "  process.stdout.write(JSON.stringify({title:title,text:text}));",
  "  process.exit(0);",
  "}).catch(function(e){process.stderr.write(e.message);process.exit(1);});",
].join('\n')

function scrapeUrl(url) {
  return new Promise((resolve, reject) => {
    const { spawn } = _require('child_process')
    const os   = _require('os')
    const path = _require('path')

    // Write scraper to a temp file so we can spawn it as a real script
    const tmpFile = path.join(os.tmpdir(), `kb-scraper-${Date.now()}-${Math.random().toString(36).slice(2)}.cjs`)
    try { fs.writeFileSync(tmpFile, SCRAPER_SCRIPT) } catch (e) { return reject(e) }

    const child = spawn(
      process.execPath,
      ['--max-old-space-size=256', tmpFile, url],
      { stdio: ['ignore', 'pipe', 'pipe'], env: process.env },
    )

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', c => { stdout += c })
    child.stderr.on('data', c => { stderr += c })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      cleanup()
      reject(new Error('Scraping timed out (30s)'))
    }, 30_000)

    function cleanup() { clearTimeout(timer); try { fs.unlinkSync(tmpFile) } catch {} }

    child.on('close', code => {
      cleanup()
      if (code !== 0) {
        const msg = stderr.trim().slice(0, 300)
        return reject(new Error(msg || `La página es demasiado grande para indexar (código ${code})`))
      }
      try { resolve(JSON.parse(stdout)) }
      catch  { reject(new Error('Scraper returned invalid output')) }
    })

    child.on('error', err => { cleanup(); reject(err) })
  })
}

async function persistChunks(chunks, documentId, kbId, orgId) {
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

/**
 * Embed all un-embedded chunks for a document.
 *
 * SPENDING GUARD:
 *   - Exactly 1 Voyage API call (all chunks in one batch).
 *   - Hard-capped at 100 inputs via embedTexts().
 *   - Only chunks with embedded=false are touched.
 *   - No retries — throws on failure, caller marks doc as error.
 *
 * @param {number} documentId
 */
async function embedChunks(documentId) {
  const chunks = await prisma.knowledgeBaseChunk.findMany({
    where:   { documentId, embedded: false },
    orderBy: { chunkIndex: 'asc' },
    select:  { id: true, content: true },
  })
  if (chunks.length === 0) return 0

  // ONE Voyage API call — embedTexts() enforces MAX_TEXTS=100 hard cap
  const embeddings = await embedTexts(chunks.map(c => c.content))

  // ONE transaction — N SQL UPDATEs bundled together, no loop of round-trips
  await prisma.$transaction(
    chunks.map((chunk, i) =>
      prisma.$executeRawUnsafe(
        `UPDATE "KnowledgeBaseChunk" SET embedding = $1::vector, embedded = true WHERE id = $2`,
        `[${embeddings[i].join(',')}]`,
        chunk.id,
      )
    )
  )

  return chunks.length
}

// ── background processor ─────────────────────────────────────────────────────
/**
 * Runs after the HTTP response has been sent.
 * waitUntil() keeps the Vercel function alive until this resolves.
 */
async function processDocument({ docId, kbId, orgId, type, fields, filePath, fileName, fileSize }) {
  const mem = () => `${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB`
  console.log(`[chatbot] doc ${docId} start — heap ${mem()}`)
  try {
    let extractedText = ''
    let title = ''
    let fileUrl = null
    let sourceUrl = null
    let question = null
    let answer = null
    let chunks = []

    if (type === 'pdf') {
      if (!filePath) throw new Error('No se recibió el archivo PDF')
      title    = fields.title?.trim() || fileName || 'Documento PDF'
      fileSize = fileSize ?? null

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { put } = await import('@vercel/blob')
        const blob = await put(`kb/${orgId}/${kbId}/${docId}.pdf`, fs.readFileSync(filePath), {
          access: 'public', contentType: 'application/pdf',
        })
        fileUrl = blob.url
      }

      extractedText = await extractPdf(filePath)
      if (!extractedText.trim()) throw new Error('No se pudo extraer texto del PDF')
      chunks = chunkText(extractedText)

    } else if (type === 'url') {
      const rawUrl = fields.url?.trim()
      if (!rawUrl) throw new Error('URL requerida')
      new URL(rawUrl) // validate
      sourceUrl = rawUrl
      const scraped = await scrapeUrl(rawUrl)
      console.log(`[chatbot] doc ${docId} scraped — heap ${mem()} text=${scraped.text?.length}chars`)
      title = fields.title?.trim() || scraped.title
      extractedText = scraped.text
      if (!extractedText.trim()) throw new Error('No se pudo extraer texto de la URL')
      chunks = chunkText(extractedText)
      console.log(`[chatbot] doc ${docId} chunked ${chunks.length} — heap ${mem()}`)

    } else if (type === 'qa') {
      question = fields.question?.trim()
      answer   = fields.answer?.trim()
      if (!question || !answer) throw new Error('Pregunta y respuesta requeridas')
      title = question.slice(0, 100)
      extractedText = `Q: ${question}\nA: ${answer}`
      chunks = chunkQA(question, answer)
    }

    await persistChunks(chunks, docId, kbId, orgId)
    console.log(`[chatbot] doc ${docId} chunks persisted — heap ${mem()}`)

    // Embed chunks — 1 Voyage API call, result stored in DB
    const embeddedCount = await embedChunks(docId)
    console.log(`[chatbot] doc ${docId} embedded ${embeddedCount} chunks — heap ${mem()}`)

    await prisma.knowledgeBaseDocument.update({
      where: { id: docId },
      data: {
        title,
        content:    extractedText.slice(0, 50_000),
        fileUrl,
        sourceUrl,
        question,
        answer,
        fileSize,
        status:     'indexed',
        chunkCount: chunks.length,
      },
    })
    console.log(`[chatbot] doc ${docId} doc updated — heap ${mem()}`)

    await prisma.knowledgeBase.update({ where: { id: kbId }, data: { status: 'ready' } })
    console.log(`[chatbot] doc ${docId} processed — ${chunks.length} chunks heap ${mem()}`)

  } catch (err) {
    console.error(`[chatbot] doc ${docId} failed:`, err.message)

    const fallbackTitle = fields.title?.trim() || fields.url?.trim() || fields.question?.trim() || 'Sin título'
    await prisma.knowledgeBaseDocument.update({
      where: { id: docId },
      data: { status: 'error', errorMessage: err.message, title: fallbackTitle },
    }).catch(() => {})

    const chunkedCount = await prisma.knowledgeBaseDocument.count({
      where: { knowledgeBaseId: kbId, status: { in: ['chunked', 'indexed'] } },
    }).catch(() => 0)
    await prisma.knowledgeBase.update({
      where: { id: kbId },
      data: { status: chunkedCount > 0 ? 'ready' : 'empty' },
    }).catch(() => {})

  } finally {
    if (filePath) { try { fs.unlinkSync(filePath) } catch {} }
  }
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

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const docs = await prisma.knowledgeBaseDocument.findMany({
      where: { knowledgeBaseId: kbId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, type: true, title: true, status: true,
        chunkCount: true, fileSize: true, sourceUrl: true,
        question: true, answer: true, content: true,
        errorMessage: true, createdAt: true,
      },
    })
    return res.status(200).json(docs)
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const docLimit = await checkPlanLimit(prisma, organizationId, 'kbDocuments')
    if (!docLimit.allowed) return planLimitResponse(res, { ...docLimit, entity: 'documentos de conocimiento' })

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
      const raw = await new Promise((resolve, reject) => {
        let data = ''
        req.on('data', c => { data += c })
        req.on('end', () => resolve(data))
        req.on('error', reject)
      })
      try { fields = JSON.parse(raw) } catch { return res.status(400).json({ error: 'JSON inválido' }) }
    }

    const type = fields.type
    if (!['pdf', 'url', 'qa'].includes(type)) return res.status(400).json({ error: 'Tipo inválido' })

    if (type === 'pdf' && !file)                return res.status(400).json({ error: 'No se recibió el archivo PDF' })
    if (type === 'url' && !fields.url?.trim())  return res.status(400).json({ error: 'URL requerida' })
    if (type === 'url') { try { new URL(fields.url.trim()) } catch { return res.status(400).json({ error: 'URL inválida' }) } }
    if (type === 'qa'  && (!fields.question?.trim() || !fields.answer?.trim())) return res.status(400).json({ error: 'Pregunta y respuesta son requeridas' })

    const pendingTitle = (
      fields.title?.trim() || fields.url?.trim() || fields.question?.trim() ||
      file?.originalFilename || 'Procesando…'
    ).slice(0, 100)

    const doc = await prisma.knowledgeBaseDocument.create({
      data: {
        knowledgeBaseId: kbId,
        orgId: organizationId,
        type,
        title: pendingTitle,
        status: 'processing',
        sourceUrl: type === 'url' ? fields.url?.trim() : null,
        question:  type === 'qa'  ? fields.question?.trim()?.slice(0, 100) : null,
      },
    })

    await prisma.knowledgeBase.update({ where: { id: kbId }, data: { status: 'indexing' } })

    // Fire-and-forget background processing.
    // waitUntil() keeps the Vercel Lambda alive until the promise resolves.
    waitUntil(processDocument({
      docId:    doc.id,
      kbId,
      orgId:    organizationId,
      type,
      fields,
      filePath: file?.filepath         ?? null,
      fileName: file?.originalFilename ?? null,
      fileSize: file?.size             ?? null,
    }))

    return res.status(201).json(doc)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end()
}
