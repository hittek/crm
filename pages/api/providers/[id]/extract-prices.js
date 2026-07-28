/**
 * POST /api/providers/[id]/extract-prices
 *
 * Quality-adaptive extraction pipeline:
 *
 *   ┌─ PDF upload
 *   │
 *   ├─ pdftotext → text ≥ 200 chars?
 *   │     YES → haiku + plain text   (~$0.023, ~25s)  ← most vendor PDFs
 *   │     NO  → sonnet + PDF binary  (~$0.15, ~50s)   ← scanned / image PDFs
 *   │
 *   └─ CSV output → parse → sanitize → { rows, total, mode }
 *
 * Response includes `mode: 'text'|'vision'` and optional `warning` for UI.
 */

import { execSync }    from 'child_process'
import Anthropic        from '@anthropic-ai/sdk'
import fs               from 'fs'
import { IncomingForm } from 'formidable'
import prisma           from '../../../../lib/prisma'
import { getSession }   from '../../../../lib/auth'
import { checkOrgAccess } from '../../../../lib/planLimits'

export const config = { api: { bodyParser: false }, maxDuration: 120 }

// haiku for text-based PDFs (cheap); sonnet for image/scanned PDFs (vision)
const TEXT_MODEL   = 'claude-haiku-4-5-20251001'
const VISION_MODEL = 'claude-sonnet-4-20250514'

// Minimum chars from pdftotext to trust text path.
// A 5-page scanned PDF typically returns < 50 chars; a real price list > 500.
const MIN_TEXT_CHARS = 200

const MAX_FILE_SIZE = 20 * 1024 * 1024
const VALID_UNITS   = ['m2', 'm', 'unidad', 'rollo', 'kg', 'par', 'juego', 'mes',
                       'servicio', 'lt', 'hr', 'pieza', 'ml', 'kit', 'pza', 'jgo']

// ── Text extraction ──────────────────────────────────────────────────────────

function extractTextWithPdftotext(filePath) {
  try {
    return execSync(`pdftotext "${filePath}" -`, { timeout: 15_000 }).toString()
  } catch {
    return null
  }
}

function isTextUsable(text) {
  if (!text) return false
  const trimmed = text.trim()
  if (trimmed.length < MIN_TEXT_CHARS) return false
  // Require at least a few digit-like tokens to confirm it's not all garbage chars
  const digitTokens = (trimmed.match(/\d+/g) || []).length
  return digitTokens >= 5
}

// ── CSV prompt (same for both paths) ─────────────────────────────────────────

const CSV_PROMPT = `Extrae todos los productos de esta lista de precios.

Responde SOLO con CSV sin encabezado: sku,name,unit,price
- sku: código/modelo exacto del producto (vacío si no hay)
- name: nombre del producto, máx 70 chars, incluye modelo + variante si aplica
- unit: m2|unidad|rollo|m|hr|pieza|ml|kg|mes|kit (inferir del contexto; default: unidad)
- price: número decimal sin símbolo de moneda ni separadores de miles (vacío si no hay precio)
- Encierra en comillas dobles si el campo contiene comas
- Si un producto tiene múltiples precios por variante, crea una fila por variante`

// ── CSV parser ───────────────────────────────────────────────────────────────
// Handles quoted fields with embedded commas. No external deps.
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
  const { organizationId: organizationId, role } = session.user
  if (role !== 'admin' && role !== 'manager') return res.status(403).json({ error: 'Sin permiso' })

  const id = parseInt(req.query.id)
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return res.status(402).json({ error: access.reason })

  const provider = await prisma.provider.findFirst({ where: { id, organizationId } })
  if (!provider) return res.status(404).json({ error: 'Proveedor no encontrado' })

  // ── 1. Parse multipart upload ─────────────────────────────────────────────
  let file
  try {
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

  // ── 2. Quality-adaptive path selection ───────────────────────────────────
  const pdfText = extractTextWithPdftotext(file.filepath)
  const useTextPath = isTextUsable(pdfText)

  let model, messageContent, mode, warning

  if (useTextPath) {
    // TEXT PATH — haiku reads plain text (~$0.023, ~25s)
    model          = TEXT_MODEL
    mode           = 'text'
    messageContent = `${CSV_PROMPT}\n\n<lista>\n${pdfText}\n</lista>`
    try { fs.unlinkSync(file.filepath) } catch (_) {}
  } else {
    // VISION PATH — sonnet reads PDF binary (~$0.15, ~50s)
    // Handles scanned documents, image-heavy catalogs, non-selectable text.
    model   = VISION_MODEL
    mode    = 'vision'
    warning = 'Este PDF parece ser escaneado o de imagen. Se usó visión para extraer los productos; revisa los resultados con cuidado.'
    let base64
    try {
      base64 = fs.readFileSync(file.filepath).toString('base64')
    } finally {
      try { fs.unlinkSync(file.filepath) } catch (_) {}
    }
    messageContent = [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
      { type: 'text',     text: CSV_PROMPT },
    ]
  }

  // ── 3. Claude extraction ──────────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let rawCsv
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 8192,
      messages:   [{ role: 'user', content: messageContent }],
    })
    rawCsv = response.content[0]?.text?.trim() ?? ''
  } catch (err) {
    console.error('[extract-prices] Anthropic error:', err.message)
    return res.status(502).json({ error: `Error al analizar el PDF: ${err.message}` })
  }

  // ── 4. Parse CSV → objects ────────────────────────────────────────────────
  const lines = rawCsv
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('```') && !l.toLowerCase().startsWith('sku,'))

  const rows = lines
    .map((line, i) => {
      const [sku, name, unit, price] = parseCsvLine(line)
      if (!name?.trim()) return null
      const costPrice = price ? parseFloat(price.replace(/,/g, '')) : null
      const unitNorm  = unit?.trim().toLowerCase()
      return {
        _id:         i,
        sku:         sku?.trim().slice(0, 100) || null,
        name:        name.trim().slice(0, 200),
        description: null,
        unit:        VALID_UNITS.includes(unitNorm) ? unitNorm : 'unidad',
        costPrice:   Number.isFinite(costPrice) && costPrice >= 0 ? Math.round(costPrice * 100) / 100 : null,
        currency:    'MXN',
      }
    })
    .filter(Boolean)
    .slice(0, 1000)

  if (rows.length === 0) {
    return res.status(422).json({
      error: 'No se encontraron productos en el PDF. Verifica que sea una lista de precios legible.',
    })
  }

  // Count rows without prices — high ratio signals poor extraction quality
  const missingPrices = rows.filter(r => r.costPrice === null).length
  const missingRatio  = missingPrices / rows.length
  if (missingRatio > 0.5 && !warning) {
    warning = `${missingPrices} de ${rows.length} productos no tienen precio. Revisa y completa antes de importar.`
  }

  return res.status(200).json({ rows, total: rows.length, mode, ...(warning ? { warning } : {}) })
}
