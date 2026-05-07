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
 * create_quote    — create a draft quote with extracted line items
 *
 * Enabling tools
 * ──────────────
 * Set `chatbot.enabledTools` to a comma-separated list, e.g.:
 *   "create_contact,create_quote"
 *
 * Adding a new tool
 * ─────────────────
 * 1. Add a definition to TOOL_DEFINITIONS
 * 2. Add a case to executeToolCall
 * 3. Update the Chatbot.enabledTools documentation above
 */
import prisma from './prisma.js'

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
        firstName:  { type: 'string',  description: 'First name' },
        lastName:   { type: 'string',  description: 'Last name' },
        email:      { type: 'string',  description: 'Email address' },
        phone:      { type: 'string',  description: 'Phone number' },
        company:    { type: 'string',  description: 'Company name' },
        notes:      { type: 'string',  description: 'Any additional notes about the contact' },
      },
    },
  },

  create_quote: {
    name:        'create_quote',
    description: 'Create a draft quote/proposal when the user has requested pricing for specific products or services. ' +
                 'Extract item details from the conversation context. Only call when you have at least one concrete item.',
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
              description: { type: 'string', description: 'Product or service description' },
              qty:         { type: 'number', description: 'Quantity' },
              unitPrice:   { type: 'number', description: 'Price per unit' },
            },
          },
          description: 'Line items for the quote',
        },
        taxRate: { type: 'number', description: 'Tax rate as a decimal, e.g. 0.16 for 16% IVA' },
        notes:   { type: 'string', description: 'Additional notes for the quote' },
        currency:{ type: 'string', description: 'ISO currency code, e.g. MXN, USD' },
      },
    },
  },

}

/**
 * Get tool definitions for a chatbot based on its enabledTools setting.
 * Returns the array to pass directly to the Claude API `tools` parameter.
 *
 * @param {object} chatbot — chatbot row with `enabledTools` field
 * @returns {Array} Claude tool definition objects
 */
export function getEnabledTools(chatbot) {
  if (!chatbot?.enabledTools) return []
  return chatbot.enabledTools
    .split(',')
    .map(t => t.trim())
    .filter(t => TOOL_DEFINITIONS[t])
    .map(t => TOOL_DEFINITIONS[t])
}

// ── Tool handlers ──────────────────────────────────────────────────────────────

/**
 * Execute a tool call from Claude and return a result string.
 *
 * @param {string} toolName    — e.g. 'create_quote'
 * @param {object} input       — Claude's tool input (validated by Claude against input_schema)
 * @param {object} context     — { orgId, conversationId, contactId?, dealId?, currency? }
 * @returns {Promise<{ok: boolean, message: string, data?: object}>}
 */
export async function executeToolCall(toolName, input, context) {
  try {
    switch (toolName) {
      case 'create_contact':
        return await _createContact(input, context)
      case 'create_quote':
        return await _createQuote(input, context)
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
      // Link to conversation if not already linked
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
      lastName:  lastName || '',
      email:     email  || null,
      phone:     phone  || null,
      company:   company || null,
      notes:     notes   || null,
      source:    'chatbot',
      status:    'lead',
    },
    select: { id: true },
  })

  // Link to conversation
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

async function _createQuote(input, { orgId, conversationId, contactId, dealId, currency }) {
  const { items, taxRate = 0, notes, currency: inputCurrency } = input
  const useCurrency = inputCurrency || currency || 'MXN'

  if (!items?.length) {
    return { ok: false, message: 'Se requiere al menos un artículo para crear la cotización.' }
  }

  // Calculate totals
  const lineItems = items.map(item => ({
    description: item.description,
    qty:         Number(item.qty)       || 1,
    unitPrice:   Number(item.unitPrice) || 0,
    total:       (Number(item.qty) || 1) * (Number(item.unitPrice) || 0),
  }))

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0)
  const tax      = subtotal * Number(taxRate)
  const total    = subtotal + tax

  // Generate quote number: Q-{year}-{orgId}-{random4}
  const year   = new Date().getFullYear()
  const suffix = Math.floor(1000 + Math.random() * 9000)
  const number = `Q-${year}-${suffix}`

  const quote = await prisma.quote.create({
    data: {
      orgId,
      number,
      status:        'draft',
      contactId:     contactId || null,
      dealId:        dealId   || null,
      conversationId: conversationId || null,
      items:         JSON.stringify(lineItems),
      subtotal,
      taxRate:       Number(taxRate),
      tax,
      total,
      currency:      useCurrency,
      notes:         notes || null,
    },
    select: { id: true, number: true, total: true, currency: true },
  })

  return {
    ok:      true,
    message: `Cotización ${quote.number} creada por ${quote.currency} ${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`,
    data:    { quoteId: quote.id, number: quote.number, total: quote.total },
  }
}
