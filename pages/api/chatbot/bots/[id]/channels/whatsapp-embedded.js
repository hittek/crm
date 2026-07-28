/**
 * POST /api/chatbot/bots/[id]/channels/whatsapp-embedded
 *
 * Step 1 — exchange Meta OAuth code for a permanent token:
 *   body: { code, redirectUri }
 *   returns: { phoneNumbers: [{ id, displayPhoneNumber, verifiedName }] }
 *
 * Step 2 — create the channel with a chosen phone number:
 *   body: { phoneNumberId, displayPhoneNumber, businessAccountId, accessToken }
 *   returns: { channel, chatwootInboxId }
 */
import prisma from '../../../../../../lib/prisma'
import { getSession } from '../../../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../../../lib/planLimits'
import { encryptJSON } from '../../../../../../lib/crypto'
import { createChatwootInbox } from '../../../../../../lib/chatwoot'
import crypto from 'crypto'

const GRAPH = 'https://graph.facebook.com/v21.0'

async function graphGet(path, token) {
  const r = await fetch(`${GRAPH}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await r.json()
  if (!r.ok || json.error) throw new Error(json.error?.message || `Graph ${r.status}`)
  return json
}

/**
 * Exchange a short-lived user access token (from JS SDK)
 * for a long-lived (60-day) user token.
 */
async function exchangeForLongLivedToken(shortToken) {
  const appId     = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) throw new Error('META_APP_ID / META_APP_SECRET no configurados')

  const res = await fetch(
    `${GRAPH}/oauth/access_token?` +
    new URLSearchParams({
      grant_type:        'fb_exchange_token',
      client_id:         appId,
      client_secret:     appSecret,
      fb_exchange_token: shortToken,
    }),
  )
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || `Token exchange failed: ${res.status}`)
  return data.access_token
}

/**
 * List WhatsApp phone numbers accessible with the given token.
 * Requires whatsapp_business_management + business_management.
 */
async function getPhoneNumbers(userToken) {
  const numbers = []

  // 1. Get businesses the user manages
  const bizData = await graphGet('/me/businesses?fields=id,name', userToken)
  const businesses = bizData.data || []

  for (const biz of businesses) {
    // 2. Get WABAs owned by each business
    let wabaRes
    try {
      wabaRes = await graphGet(`/${biz.id}/owned_whatsapp_business_accounts?fields=id,name`, userToken)
    } catch (e) {
      console.warn(`[whatsapp-embedded] no WABAs for business ${biz.id}:`, e.message)
      continue
    }

    for (const waba of (wabaRes.data || [])) {
      // 3. Get phone numbers for each WABA
      let phonesRes
      try {
        phonesRes = await graphGet(`/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`, userToken)
      } catch (e) {
        console.warn(`[whatsapp-embedded] no phones for WABA ${waba.id}:`, e.message)
        continue
      }

      for (const p of (phonesRes.data || [])) {
        numbers.push({
          id:                  p.id,
          displayPhoneNumber:  p.display_phone_number,
          verifiedName:        p.verified_name,
          qualityRating:       p.quality_rating,
          businessAccountId:   waba.id,
          businessAccountName: waba.name,
        })
      }
    }
  }

  return numbers
}

function safeConfig(cfg) {
  const { credentials: _, ...rest } = cfg
  return rest
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId, role } = session.user
  if (!['admin', 'manager'].includes(role)) return res.status(403).json({ error: 'Sin permiso' })

  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const chatbotId = parseInt(req.query.id, 10)
  const bot = await prisma.chatbot.findFirst({ where: { id: chatbotId, organizationId: organizationId } })
  if (!bot) return res.status(404).json({ error: 'Chatbot no encontrado' })

  const org = await prisma.organization.findUnique({
    where:  { id: organizationId },
    select: { id: true, name: true, chatwootAccountId: true, chatwootAgentBotId: true, chatwootAdminToken: true },
  })

  const { step } = req.body

  // ── Step 1: exchange code, return phone numbers ───────────────────────────
  if (step === 'get_phones') {
    const { accessToken } = req.body
    if (!accessToken) return res.status(400).json({ error: 'Falta accessToken' })

    let userToken
    try {
      userToken = await exchangeForLongLivedToken(accessToken)
    } catch (e) {
      console.error('[whatsapp-embedded] token exchange error:', e.message)
      return res.status(400).json({ error: `Error al obtener token: ${e.message}` })
    }

    let phoneNumbers
    try {
      phoneNumbers = await getPhoneNumbers(userToken)
    } catch (e) {
      console.error('[whatsapp-embedded] phone list error:', e.message)
      return res.status(400).json({ error: `Error al listar números: ${e.message}` })
    }

    if (phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'No se encontraron números de WhatsApp Business en esta cuenta.' })
    }

    // Return token (encrypted in session-like temp store) — we pass it back to client
    // as an opaque signed blob so the UI can submit it in step 2 without exposing it.
    const payload = JSON.stringify({ token: userToken, exp: Date.now() + 10 * 60 * 1000 })
    const hmac = crypto.createHmac('sha256', process.env.META_APP_SECRET).update(payload).digest('hex')
    const tokenBlob = Buffer.from(payload).toString('base64') + '.' + hmac

    return res.json({ phoneNumbers, tokenBlob })
  }

  // ── Step 2: create channel with chosen phone number ───────────────────────
  if (step === 'connect') {
    const { tokenBlob, phoneNumberId, displayPhoneNumber, businessAccountId } = req.body
    if (!tokenBlob || !phoneNumberId || !businessAccountId) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    // Verify and unpack tokenBlob
    let userToken
    try {
      const [b64, sig] = tokenBlob.split('.')
      const payload = Buffer.from(b64, 'base64').toString('utf-8')
      const expected = crypto.createHmac('sha256', process.env.META_APP_SECRET).update(payload).digest('hex')
      if (sig !== expected) throw new Error('invalid signature')
      const parsed = JSON.parse(payload)
      if (Date.now() > parsed.exp) throw new Error('token blob expired')
      userToken = parsed.token
    } catch (e) {
      return res.status(400).json({ error: `Token inválido o expirado: ${e.message}` })
    }

    // Check not already connected
    const existing = await prisma.channelConfig.findUnique({
      where: { chatbotId_channel: { chatbotId, channel: 'whatsapp' } },
    })
    if (existing) return res.status(409).json({ error: 'WhatsApp ya está conectado a este chatbot' })

    if (!org?.chatwootAccountId || !org?.chatwootAdminToken) {
      return res.status(500).json({ error: 'Organización sin cuenta Chatwoot — contactar soporte' })
    }

    // Generate a webhook verify token
    const verifyToken = crypto.randomUUID().replace(/-/g, '').slice(0, 24)

    // Normalise displayPhoneNumber to E.164 (strip spaces/dashes) for Chatwoot routing
    const e164Phone = (displayPhoneNumber || '').replace(/[\s\-\(\)]/g, '') || '+1'

    let chatwootInboxId
    try {
      const inbox = await createChatwootInbox(
        org.chatwootAccountId,
        `WhatsApp ${displayPhoneNumber || phoneNumberId}`,
        'whatsapp',
        {
          phone_number: e164Phone,
          provider: 'whatsapp_cloud',
          provider_config: {
            api_key:              userToken,
            phone_number_id:      phoneNumberId,
            business_account_id:  businessAccountId,
            webhook_verify_token: verifyToken,
          },
        },
        org.chatwootAgentBotId,
        org.chatwootAdminToken,
      )
      chatwootInboxId = inbox.id
      console.log(`[whatsapp-embedded] created Chatwoot inbox ${chatwootInboxId} for chatbot ${chatbotId}`)
    } catch (e) {
      console.error('[whatsapp-embedded] createChatwootInbox error:', e.message)
      return res.status(500).json({ error: `Error creando inbox en Chatwoot: ${e.message}` })
    }

    const cfg = await prisma.channelConfig.create({
      data: {
        organizationId:          organizationId,
        chatbotId,
        channel:        'whatsapp',
        credentials:    encryptJSON({ accessToken: userToken, verifyToken }),
        isActive:       true,
        phoneNumberId,
        chatwootInboxId,
      },
    })

    return res.status(201).json({ channel: safeConfig(cfg), chatwootInboxId })
  }

  return res.status(400).json({ error: 'step debe ser "get_phones" o "connect"' })
}
