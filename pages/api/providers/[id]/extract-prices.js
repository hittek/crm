/**
 * POST /api/providers/[id]/extract-prices
 *
 * Accepts a PDF price list, extracts text with pdftotext (zero LLM tokens),
 * then sends the plain text to haiku with CSV output format.
 *
 * Cost profile: ~$0.023/extraction vs ~$0.18 for PDF→Sonnet (8× cheaper).
 *
 * Extraction pipeline:
 *   PDF upload → pdftotext (text extraction, no LLM) → haiku CSV extraction
 *   → parse CSV → sanitize rows → return JSON for review UI
 *
 * Response: { rows: [{sku, name, unit, costPrice, currency}], total: N }
 */

import { execSync } from 'child_process'
import Anthropic      from '@anthropic-ai/sdk'
import fs             from 'fs'
import prisma         from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess } from '../../../../lib/planLimits'

const _require = eval('require') // eslint-disable-line no-eval

export const config = { api: { bodyParser: false }, maxDuration: 60 }

const MODEL         = 'claude-haiku-4-5-20251001'
const MAX_FILE_SIZE = 20 * 1024 * 1024
const VALID_UNITS   = ['m2', 'm', 'unidad', 'rollo', 'kg', 'par', 'juego', 'mes',
                       'servicio', 'lt', 'hr', 'pieza', 'ml']

// ── Text extraction ──────────────────────────────────────────────────────────

function extractTextWithPdftotext(filePath) {
  try {
    return execSync(`pdftotext "${filePath}" -`, { timeout: 15_000 }).toString()
  } catch {
    return null // pdftotext not available (unlikely on Linux/macOS, use PDF fallback)
  }
}

// ── CSV parser ───────────────────────────────────────────────────────────────
// Handles quoted fields with embedded commas. Minimal, no external deps.
function parseCsvLine(line) {
  const fields = []
  let cur = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuote = !inQuote; continue }
    if (ch === ',' && !inQuote) { fields.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  fields.push(cur.trim())
  return fields
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })
  const { organizationId: orgId, role } = session.user
  if (role !== 'admin' && role !== 'manager') return res.status(403).json({ error: 'Sin permiso' })

  const id = parseInt(req.query.id)
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

  const access = await checkOrgAccess(prisma, orgId)
  if (access.blocked) return res.status(402).json({ error: access.reason })

  const provider = await prisma.provider.findFirst({ where: { id, orgId } })
  if (!provider) return res.status(404).json({ error: 'Proveedor no encontrado' })

  // Parse multipart upload
  let file
  try {
    const { IncomingForm } = _require('formidable')
    const form = new IncomingForm({ maxFileSize: MAX_FILE_SIZE })
    await new Promise((resolve, reject) => {
      form.parse(req, (err, _fields, files) => {
        if (err) return reject(err)
        file = Array.isArray(files.file) ? files.file[0] : files.file
        resolve()
      })
    })
  } catch (err) {
    if (err.code === 1009) return res.status(413).json({ error: 'El archivo excede 20 MB' })
    return res.status(400).json({ error: `Error al leer el archivo: ${err.message}` })
  }

  if (!file) return res.status(400).json({ error: 'No se recibió el archivo' })
  const isPdf = file.mimetype?.includes('pdf') || file.originalFilename?.toLowerCase().endsWith('.pdf')
  if (!isPdf) return res.status(400).json({ error: 'Solo se aceptan archivos PDF' })

  // ── 1. Extract text from PDF (no LLM cost) ─────────────────────────────
  let pdfText = extractTextWithPdftotext(file.filepath)

  // Fallback: if pdftotext unavailable, send raw PDF to Claude as a document block
  let useFallback = !pdfText?.trim()

  // Cleanup temp file after extraction
  const tempPath = file.filepath
  if (!useFallback) {
    try { fs.unlinkSync(tempPath) } catch (_) {}
  }

  // ── 2. Send to haiku — CSV format (much cheaper than JSON) ─────────────
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const csvPrompt = `Extrae todos los productos de esta lista de precios.

Responde SOLO con CSV sin encabezado: sku,name,unit,price
- sku: código/modelo exacto del producto (vacío si no hay)
- name: nombre del producto, máx 70 chars, incluye modelo + variante si aplica
- unit: m2|unidad|rollo|m|hr|pieza|ml|kg|mes (inferir del contexto)
- price: número decimal sin símbolo de moneda ni comas (vacío si no hay precio definido)
- Encierra en comillas dobles si el campo contiene comas`

  let rawCsv
  try {
    let messageContent

    if (useFallback) {
      // PDF document block — more expensive but works without pdftotext
      const base64 = fs.readFileSync(tempPath).toString('base64')
      try { fs.unlinkSync(tempPath) } catch (_) {}
      messageContent = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text',     text: csvPrompt },
      ]
    } else {
      messageContent = `${csvPrompt}\n\n<lista>\n${pdfText}\n</lista>`
    }

    const response = await anthropic.messages.create({
      model:    MODEL,
      max_tokens: 8192,
      messages: [{ role: 'user', content: messageContent }],
    })
    rawCsv = response.content[0]?.text?.trim() ?? ''
  } catch (err) {
    console.error('[extract-prices] Anthropic error:', err.message)
    return res.status(502).json({ error: `Error al analizar el PDF: ${err.message}` })
  }

  // ── 3. Parse CSV → objects ──────────────────────────────────────────────
  const lines = rawCsv
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('```') && !l.toLowerCase().startsWith('sku,'))

  const rows = lines
    .map((line, i) => {
      const [sku, name, unit, price] = parseCsvLine(line)
      if (!name?.trim()) return null
      const costPrice = price ? parseFloat(price.replace(/,/g, '')) : null
      return {
        _id:         i,
        sku:         sku?.trim().slice(0, 100) || null,
        name:        name.trim().slice(0, 200),
        description: null,
        unit:        VALID_UNITS.includes(unit?.trim()) ? unit.trim() : 'unidad',
        costPrice:   Number.isFinite(costPrice) && costPrice >= 0 ? Math.round(costPrice * 100) / 100 : null,
        currency:    'MXN',
      }
    })
    .filter(Boolean)
    .slice(0, 1000)

  if (rows.length === 0) {
    return res.status(422).json({ error: 'No se encontraron productos en el PDF. Verifica que sea una lista de precios legible.' })
  }

  return res.status(200).json({ rows, total: rows.length })
}
