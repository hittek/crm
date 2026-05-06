/**
 * Telegram Bot API helpers.
 * All calls use the Bot API v7 REST interface — no SDK needed.
 */

const BASE = 'https://api.telegram.org'

async function call(token, method, body) {
  const res = await fetch(`${BASE}/bot${token}/${method}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description || JSON.stringify(data)}`)
  return data.result
}

/** Verify the token and return bot info ({ id, username, first_name }). */
export async function getMe(token) {
  const res = await fetch(`${BASE}/bot${token}/getMe`)
  const data = await res.json()
  if (!data.ok) throw new Error(`Invalid Telegram bot token: ${data.description}`)
  return data.result
}

/** Register a webhook URL with Telegram. */
export async function setWebhook(token, url) {
  return call(token, 'setWebhook', { url, allowed_updates: ['message'] })
}

/** Remove the webhook (call on disconnect). */
export async function deleteWebhook(token) {
  return call(token, 'deleteWebhook', { drop_pending_updates: true })
}

/** Send a text message to a Telegram chat. */
export async function sendMessage(token, chatId, text) {
  return call(token, 'sendMessage', { chat_id: chatId, text, parse_mode: undefined })
}
