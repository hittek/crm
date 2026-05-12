/**
 * lib/chatbotTools.js
 *
 * Claude tool-use definitions and handlers for chatbots.
 *
 * Architecture
 * ────────────
 * When a chatbot has tools enabled, they are included in the Claude API call.
 * Claude may respond with a `tool_use` content block instead of (or in addition
 * to) a `text` block. channelEngine handles the multi-turn loop:
 *
 *   1. Send user message + tool definitions to Claude
 *   2. If Claude returns tool_use: execute the tool, collect the result
 *   3. Send tool_result back to Claude in the next messages turn
 *   4. Claude generates a final text reply confirming the action
 *
 * Tool list
 * ─────────
 * create_contact  — create a CRM contact from conversation data
 * lookup_products — search the product catalog by name/SKU/keyword
 * create_quote    — create a draft quote with extracted line items
 *
 * Enabling tools
 * ──────────────
 * Set `chatbot.enabledTools` to a comma-separated list, e.g.:
 *   "create_contact,lookup_products,create_quote"
 *
 * Note: lookup_products is automatically enabled alongside create_quote
 * so Claude can resolve accurate prices before calling create_quote.
 *
 * Adding a new tool
 * ─────────────────
 * 1. Add a definition to TOOL_DEFINITIONS
 * 2. Add a case to executeToolCall
 * 3. Update the Chatbot.enabledTools documentation above
 */
import crypto  from 'crypto'
import prisma  from './prisma.js'

// ── Tool definitions (sent to Claude API) ─────────────────────────────────────

export const TOOL_DEFINITIONS = {

  create_contact: {
    name:        'create_contact',
    description: 'Create a new CRM contact from information collected during the conversation. ' +
                 'Call this when you have gathered at least a name or phone number from the user. ' +
                 'Only call once per conversation.',
    input_schema: {
      type:       'object',
      required:   ['firstName'],
      properties: {
        firstName:  { type: 'string', description: 'First name' },
        lastName:   { type: 'string', description: 'Last name' },
        email:      { type: 'string', description: 'Email address' },
        phone:      { type: 'string', description: 'Phone number' },
        company:    { type: 'string', description: 'Company name' },
        notes:      { type: 'string', description: 'Any additional notes about the contact' },
      },
    },
  },

  lookup_products: {
    name:        'lookup_products',
    description: 'Search the product/service catalog to get current prices and SKUs. ' +
                 'Call this before create_quote to look up the correct unit price for each item. ' +
                 'You may call it multiple times with different queries.',
    input_schema: {
      type:       'object',
      required:   ['query'],
      properties: {
        query: {
          type:        'string',
          description: 'Product name, SKU, or keyword to search for. Use a short keyword for best results.',
        },
      },
    },
  },

  create_quote: {
    name:        'create_quote',
    description: 'Create a draft quote when the user has asked for pricing. ' +
                 'Always call lookup_products first to get accurate unit prices. ' +
                 'Only call when you have at least one confirmed item with a price.',
    input_schema: {
      type:       'object',
      required:   ['items'],
      properties: {
        items: {
          type:  'array',
          items: {
            type:       'object',
            required:   ['description', 'qty', 'unitPrice'],
            properties: {
              sku:         { type: 'string', description: 'Product SKU from catalog (if available)' },
              description: { type: 'string', description: 'Product or service description' },
              qty:         { type: 'number', description: 'Quantity' },
              unitPrice:   { type: 'number', description: 'Price per unit (from lookup_products)' },
            },
          },
          description: 'Line items for the quote',
        },
        taxRate:  { type: 'number', description: 'Tax rate as decimal (e.g. 0.16 for 16% IVA). Omit to use 0.' },
        notes:    { type: 'string', description: 'Additional notes or payment terms' },
        currency: { type: 'string', description: 'ISO currency code (e.g. MXN, USD). Defaults to org currency.' },
      },
    },
  },

}

/**
 * Get tool definitions for a chatbot based on its enabledTools setting.
 * Returns the array to pass directly to the Claude API `tools` parameter.
 * Note: lookup_products is always included when create_quote is enabled.
 *
 * @param {object} chatbot — chatbot row with `enabledTools` field
 * @returns {Array} Claude tool definition objects
 */
export function getEnabledTools(chatbot) {
  if (!chatbot?.enabledTools) return []

  const requested = new Set(
    chatbot.enabledTools
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
  )

  // Auto-include lookup_products whenever create_quote is enabled
  if (requested.has('create_quote')) requested.add('lookup_products')

  return [...requested]
    .filter(t => TOOL_DEFINITIONS[t])
    .map(t => TOOL_DEFINITIONS[t])
}

// ── Tool dispatcher ────────────────────────────────────────────────────────────

/**
 * Execute a tool call from Claude and return a result string.
 *
 * @param {string} toolName    — e.g. 'create_quote'
 * @param {object} input       — Claude's tool input (validated by Claude against input_schema)
 * @param {object} context     — { orgId, conversationId, contactId?, dealId?, appUrl? }
 * @returns {Promise<{ok: boolean, message: string, data?: object}>}
 */
export async function executeToolCall(toolName, input, context) {
  try {
    switch (toolName) {
      case 'create_contact':   return await _createContact(input, context)
      case 'lookup_products':  return await _lookupProducts(input, context)
      case 'create_quote':     return await _createQuote(input, context)
      default:
        return { ok: false, message: `Unknown tool: ${toolName}` }
    }
  } catch (err) {
    console.error(`[chatbotTools] ${toolName} failed:`, err.message)
    return { ok: false, message: `Error ejecutando ${toolName}: ${err.message}` }
  }
}

// ── Tool implementations ───────────────────────────────────────────────────────

async function _createContact(input, { orgId, conversationId }) {
  const { firstName, lastName, email, phone, company, notes } = input

  // Avoid duplicates: check by email or phone first
  if (email || phone) {
    const existing = await prisma.contact.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          email ? { email } : undefined,
          phone ? { phone: { contains: (phone || '').replace(/\D/g, '').slice(-10) } } : undefined,
        ].filter(Boolean),
      },
      select: { id: true, firstName: true, lastName: true },
    })
    if (existing) {
      if (conversationId) {
        await prisma.conversation.updateMany({
          where: { id: conversationId, contactId: null },
          data:  { contactId: existing.id },
        })
      }
      return {
        ok:      true,
        message: `Contacto existente encontrado: ${existing.firstName} ${existing.lastName || ''}`.trim(),
        data:    { contactId: existing.id, existing: true },
      }
    }
  }

  const contact = await prisma.contact.create({
    data: {
      organizationId: orgId,
      firstName,
      lastName:  lastName  || '',
      email:     email     || null,
      phone:     phone     || null,
      company:   company   || null,
      notes:     notes     || null,
      source:    'chatbot',
      status:    'lead',
    },
    select: { id: true },
  })

  if (conversationId) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data:  { contactId: contact.id },
    })
  }

  return {
    ok:      true,
    message: `Contacto creado: ${firstName} ${lastName || ''}`.trim(),
    data:    { contactId: contact.id, existing: false },
  }
}

async function _lookupProducts(input, { orgId }) {
  const { query } = input
  if (!query?.trim()) {
    return { ok: false, message: 'Se requiere un término de búsqueda.' }
  }

  const q = query.trim()
  const products = await prisma.product.findMany({
    where: {
      orgId,
      isActive: { not: false },
      OR: [
        { name:    { contains: q, mode: 'insensitive' } },
        { sku:     { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    },
    select:  { id: true, sku: true, name: true, unit: true, sellingPrice: true, costPrice: true },
    orderBy: { name: 'asc' },
    take:    20,
  })

  if (products.length === 0) {
    return {
      ok:      true,
      message: `No se encontraron productos para "${q}". Verifica el nombre o prueba con otra búsqueda.`,
    }
  }

  const lines = products.map(p => {
    const price = p.sellingPrice ?? p.costPrice ?? 0
    const sku   = p.sku ? ` [${p.sku}]` : ''
    const unit  = p.unit ? ` por ${p.unit}` : ''
    return `• ${p.name}${sku}${unit} — $${Number(price).toFixed(2)}`
  })

  return {
    ok:      true,
    message: `Productos encontrados para "${q}":\n${lines.join('\n')}`,
    data:    { products: products.map(p => ({
      sku:       p.sku,
      name:      p.name,
      unit:      p.unit,
      unitPrice: p.sellingPrice ?? p.costPrice ?? 0,
    })) },
  }
}

async function _createQuote(input, { orgId, conversationId, contactId, dealId, appUrl }) {
  const { items, taxRate = 0, notes, currency: inputCurrency } = input

  // Resolve currency from org if not specified
  let useCurrency = inputCurrency
  if (!useCurrency) {
    const org = await prisma.organization.findUnique({
      where:  { id: orgId },
      select: { currency: true },
    })
    useCurrency = org?.currency || 'MXN'
  }

  if (!items?.length) {
    return { ok: false, message: 'Se requiere al menos un artículo para crear la cotización.' }
  }

  const lineItems = items.map(item => ({
    sku:         item.sku        || null,
    description: item.description,
    qty:         Number(item.qty)       || 1,
    unitPrice:   Number(item.unitPrice) || 0,
    total:       (Number(item.qty) || 1) * (Number(item.unitPrice) || 0),
  }))

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0)
  const tax      = subtotal * Number(taxRate)
  const total    = subtotal + tax

  // Sequential quote numbering (consistent with manual quote creation)
  const year  = new Date().getFullYear()
  const count = await prisma.quote.count({ where: { orgId } })
  const seq   = String(count + 1).padStart(3, '0')
  const number = `Q-${year}-${seq}`

  // Pre-generate share token so Claude can include the link in its reply
  const shareToken = crypto.randomBytes(20).toString('base64url')

  const quote = await prisma.quote.create({
    data: {
      orgId,
      number,
      status:         'draft',
      contactId:      contactId      || null,
      dealId:         dealId         || null,
      conversationId: conversationId || null,
      items:          JSON.stringify(lineItems),
      subtotal,
      taxRate:        Number(taxRate),
      tax,
      total,
      currency:       useCurrency,
      notes:          notes || null,
      shareToken,
    },
    select: { id: true, number: true, total: true, currency: true },
  })

  const publicUrl = appUrl
    ? `${appUrl}/q/${shareToken}`
    : `/q/${shareToken}`

  const totalFmt = Number(quote.total).toLocaleString('es-MX', {
    style:    'currency',
    currency: quote.currency,
  })

  return {
    ok:      true,
    message: `Cotización ${quote.number} creada por ${totalFmt}. Enlace público: ${publicUrl}`,
    data:    { quoteId: quote.id, number: quote.number, total: quote.total, shareUrl: publicUrl },
  }
}
