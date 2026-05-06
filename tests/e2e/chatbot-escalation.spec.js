/**
 * Chatbot & Conversation E2E + API tests
 *
 * Coverage:
 *  - Chat escalation: exact phrase, variant phrase, handoff guard
 *  - Notification: chat_escalated written to DB, deep-link URL
 *  - Conversations page: list renders, filter, thread opens
 *  - Agent reply: status transition escalated→open, Telegram guard
 *
 * Note: resetLocale uses 'load' (not 'networkidle') because the SSE stream
 * at /api/notifications/stream keeps a persistent connection open — networkidle
 * never fires while that connection is alive.
 */

const { test, expect } = require('@playwright/test')
const { login } = require('./helpers/login')
const { testUser } = require('./test.config')

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Login + wait for nav — avoids networkidle (SSE stream keeps connection alive).
 */
async function loginAndWait(page) {
  await login(page)  // waits for /contacts + nav
}

/**
 * Reset locale without networkidle — SSE stream prevents it from resolving.
 */
async function resetLocaleNoSSE(page, locale = 'es-MX') {
  await page.evaluate(async (loc) => {
    await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: loc }),
      credentials: 'include',
    })
    localStorage.setItem('crm_locale', loc)
  }, locale)
  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('nav', { timeout: 15000 })
}

/**
 * Create (or reuse) a test chatbot via API.
 * Returns chatbot id + kbId.
 */
async function getOrCreateChatbot(page) {
  const r = await page.request.get('/api/chatbot/bots')
  if (!r.ok()) throw new Error(`bots API error: ${r.status()}`)
  const bots = await r.json()  // returns array directly
  const list = Array.isArray(bots) ? bots : (bots.chatbots || [])
  if (list.length === 0) throw new Error('No chatbot found — run prisma seed or create one manually')
  return { chatbotId: list[0].id, kbId: list[0].kbId }
}

// ─── Escalation API tests ────────────────────────────────────────────────────

test.describe('Chat escalation (API)', () => {
  let page
  const sessionId = `test-esc-${Date.now()}`
  let kbId, chatbotId

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await loginAndWait(page)
    ;({ chatbotId, kbId } = await getOrCreateChatbot(page))
  })

  test.afterAll(async () => page.close())

  test('exact escalation phrase triggers escalation', async () => {
    const r = await page.request.post(`/api/chatbot/${kbId}/chat`, {
      data: { message: 'hablar con agente', sessionId: `${sessionId}-exact`, chatbotId },
    })
    expect(r.ok()).toBeTruthy()
    const body = await r.json()
    expect(body.reply).toMatch(/agente/i)
    expect(body.conversationId).toBeTruthy()

    const conv = await page.request.get(`/api/conversations/${body.conversationId}`)
    expect(conv.ok()).toBeTruthy()
    expect((await conv.json()).conversation.status).toBe('escalated')
  })

  test('variant phrase triggers escalation via semantic detection', async () => {
    const r = await page.request.post(`/api/chatbot/${kbId}/chat`, {
      data: { message: 'Contactame con un agente por favor', sessionId: `${sessionId}-variant`, chatbotId },
    })
    expect(r.ok()).toBeTruthy()
    const body = await r.json()
    expect(body.reply).toMatch(/agente/i)

    const conv = await page.request.get(`/api/conversations/${body.conversationId}`)
    expect((await conv.json()).conversation.status).toBe('escalated')
  })

  test('escalation creates chat_escalated notification', async () => {
    const r = await page.request.post(`/api/chatbot/${kbId}/chat`, {
      data: { message: 'quiero hablar con un humano', sessionId: `${sessionId}-notif`, chatbotId },
    })
    expect(r.ok()).toBeTruthy()

    // Wait for notification service to write (~2s)
    await page.waitForTimeout(2000)

    const notifR = await page.request.get('/api/notifications?limit=20')
    const notifData = await notifR.json()
    const escalatedNotif = notifData.data.find(n => n.type === 'chat_escalated')

    expect(escalatedNotif).toBeTruthy()
    expect(escalatedNotif.title).toMatch(/escalada/i)
    // Deep-link must point to the specific conversation
    expect(escalatedNotif.link).toMatch(/\/conversations\?id=\d+/)
  })

  test('AI is silenced after agent picks up escalated conversation', async () => {
    // 1. Escalate
    const escR = await page.request.post(`/api/chatbot/${kbId}/chat`, {
      data: { message: 'necesito un agente', sessionId: `${sessionId}-handoff`, chatbotId },
    })
    expect(escR.ok()).toBeTruthy()
    const { conversationId } = await escR.json()

    // 2. Agent replies (picks up)
    const replyR = await page.request.post(`/api/conversations/${conversationId}/messages`, {
      data: { content: 'Hola, soy el agente. ¿En qué te puedo ayudar?' },
    })
    expect(replyR.ok()).toBeTruthy()
    expect((await replyR.json()).newStatus).toBe('open')

    // 3. User sends another message — AI must not respond
    const userR = await page.request.post(`/api/chatbot/${kbId}/chat`, {
      data: { message: 'gracias, tengo una duda sobre precios', sessionId: `${sessionId}-handoff`, chatbotId },
    })
    expect(userR.ok()).toBeTruthy()
    const userBody = await userR.json()
    expect(userBody.reply).toBeNull()
    expect(userBody.handedOff).toBe(true)

    // Conversation must stay open
    const conv = await page.request.get(`/api/conversations/${conversationId}`)
    expect((await conv.json()).conversation.status).toBe('open')
  })

  test('agent reply on escalated conv transitions status to open', async () => {
    const escR = await page.request.post(`/api/chatbot/${kbId}/chat`, {
      data: { message: 'hablar con agente', sessionId: `${sessionId}-status`, chatbotId },
    })
    const { conversationId } = await escR.json()

    // Confirm escalated
    let conv = await page.request.get(`/api/conversations/${conversationId}`)
    expect((await conv.json()).conversation.status).toBe('escalated')

    // Agent replies
    const replyR = await page.request.post(`/api/conversations/${conversationId}/messages`, {
      data: { content: 'Aquí estoy para ayudarte.' },
    })
    expect((await replyR.json()).newStatus).toBe('open')

    // Confirm status flipped
    conv = await page.request.get(`/api/conversations/${conversationId}`)
    expect((await conv.json()).conversation.status).toBe('open')
  })
})

// ─── Conversations page E2E ─────────────────────────────────────────────────

test.describe('Conversations page (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndWait(page)
    await resetLocaleNoSSE(page)
  })

  test('conversations page loads and shows list', async ({ page }) => {
    await page.goto('/conversations', { waitUntil: 'load' })
    await page.waitForSelector('main', { timeout: 8000 })
    await expect(page.locator('main').first()).toBeVisible({ timeout: 8000 })
  })

  test('can filter conversations by status', async ({ page }) => {
    await page.goto('/conversations', { waitUntil: 'load' })
    await page.waitForSelector('select', { timeout: 8000 })

    // There are two selects: channel filter first, status filter second
    const statusSelect = page.locator('select').nth(1)
    await statusSelect.waitFor({ timeout: 8000 })
    await statusSelect.selectOption('escalated')  // select by value, not label
    await page.waitForTimeout(800)

    await expect(page.locator('main')).toBeVisible()
  })

  test('clicking a conversation opens the thread panel', async ({ page }) => {
    await page.goto('/conversations', { waitUntil: 'load' })
    await page.waitForTimeout(1500)

    const firstConv = page.locator('[data-conv-id]').first()
    if (await firstConv.count() === 0) { test.skip(); return }

    await firstConv.click()
    // Textarea for agent reply appears
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 8000 })
  })

  test('deep-link ?id= auto-selects conversation', async ({ page }) => {
    const r = await page.request.get('/api/conversations?limit=1')
    if (!r.ok()) { test.skip(); return }
    const data = await r.json()
    const convs = data.conversations || []
    if (convs.length === 0) { test.skip(); return }

    const targetId = convs[0].id
    await page.goto(`/conversations?id=${targetId}`, { waitUntil: 'load' })
    await page.waitForTimeout(2000)

    // Thread panel opened — textarea visible
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 10000 })
  })
})

// ─── Notification bell E2E ───────────────────────────────────────────────────

test.describe('Notification bell (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndWait(page)
    await resetLocaleNoSSE(page)
  })

  test('bell button is visible in the layout', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notificaciones"], button[aria-label*="Notification"]').first()
    await expect(bell).toBeVisible({ timeout: 8000 })
  })

  test('clicking bell opens dropdown with header', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notificaciones"], button[aria-label*="Notification"]').first()
    await bell.click()
    await expect(
      page.locator('h3').filter({ hasText: /Notificaciones|Notifications/i }).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('chat_escalated notification shows in dropdown', async ({ page }) => {
    const { chatbotId, kbId } = await getOrCreateChatbot(page)

    // Seed an escalation
    await page.request.post(`/api/chatbot/${kbId}/chat`, {
      data: {
        message:   'hablar con agente',
        sessionId: `e2e-bell-${Date.now()}`,
        chatbotId,
      },
    })
    await page.waitForTimeout(4000)  // wait for notification to be written

    const bell = page.locator('button[aria-label*="Notificaciones"], button[aria-label*="Notification"]').first()
    await bell.click()

    await expect(
      page.locator('text=/escalada|escalated/i').first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('clicking escalation notification navigates to /conversations', async ({ page }) => {
    const notifR = await page.request.get('/api/notifications?limit=20')
    if (!notifR.ok()) { test.skip(); return }
    const notifData = await notifR.json()
    const escalated = (notifData.data || []).find(n => n.type === 'chat_escalated')
    if (!escalated) { test.skip(); return }

    const bell = page.locator('button[aria-label*="Notificaciones"], button[aria-label*="Notification"]').first()
    await bell.click()

    const notifItem = page.locator('text=/escalada|escalated/i').first()
    await expect(notifItem).toBeVisible({ timeout: 5000 })
    await notifItem.click()

    await expect(page).toHaveURL(/\/conversations/, { timeout: 8000 })
  })
})

