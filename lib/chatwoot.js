/**
 * Chatwoot Platform API client
 *
 * Uses the PlatformApp token (not a user token) to manage accounts and agent bots.
 * All functions are async and throw descriptive errors on failure.
 *
 * Required env vars:
 *   CHATWOOT_URL              — e.g. https://chatwoot.hittek.mx
 *   CHATWOOT_PLATFORM_TOKEN   — PlatformApp access token
 *   NEXT_PUBLIC_APP_URL       — CRM base URL (used as AgentBot webhook base)
 */

const CHATWOOT_URL = process.env.CHATWOOT_URL || 'http://chatwoot-app:3000';
const PLATFORM_TOKEN = process.env.CHATWOOT_PLATFORM_TOKEN;

/**
 * Low-level fetch wrapper for the Platform API.
 */
async function platformFetch(path, options = {}) {
  if (!PLATFORM_TOKEN) {
    throw new Error('CHATWOOT_PLATFORM_TOKEN is not set');
  }

  const url = `${CHATWOOT_URL}/platform/api/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'api_access_token': PLATFORM_TOKEN,
      ...(options.headers || {}),
    },
  });

  let body;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!res.ok) {
    throw new Error(
      `Chatwoot Platform API ${options.method || 'GET'} ${path} → ${res.status}: ${
        typeof body === 'object' ? JSON.stringify(body) : body
      }`
    );
  }

  return body;
}

/**
 * Create a Chatwoot account for a CRM organization.
 * @param {string} name — Organization name
 * @returns {{ id: number, name: string }} Chatwoot account
 */
async function createAccount(name) {
  const account = await platformFetch('/accounts', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!account?.id) {
    throw new Error(`createAccount: unexpected response — ${JSON.stringify(account)}`);
  }
  return account;
}

/**
 * Create a global AgentBot for an organization.
 * The webhook URL points to the CRM's AgentBot handler for that org.
 *
 * @param {string} name       — Bot name
 * @param {string} webhookUrl — CRM endpoint Chatwoot will POST messages to
 * @returns {{ id: number, name: string }} Chatwoot agent bot
 */
async function createAgentBot(name, webhookUrl) {
  const bot = await platformFetch('/agent_bots', {
    method: 'POST',
    body: JSON.stringify({ name, outgoing_url: webhookUrl }),
  });
  if (!bot?.id) {
    throw new Error(`createAgentBot: unexpected response — ${JSON.stringify(bot)}`);
  }
  return bot;
}

/**
 * Set a global AgentBot as the default bot for a Chatwoot account.
 * This wires all inboxes in the account to the AgentBot automatically.
 *
 * @param {number} accountId  — Chatwoot account ID
 * @param {number} agentBotId — Chatwoot agent bot ID
 */
async function setAccountAgentBot(accountId, agentBotId) {
  await platformFetch(`/accounts/${accountId}`, {
    method: 'PATCH',
    body: JSON.stringify({ custom_attributes: { agent_bot_id: agentBotId } }),
  });
}

/**
 * List all Chatwoot accounts.
 * @returns {Array} accounts
 */
async function getAccounts() {
  return platformFetch('/accounts');
}

/**
 * Get a single Chatwoot account.
 * @param {number} accountId
 */
async function getAccount(accountId) {
  return platformFetch(`/accounts/${accountId}`);
}

/**
 * Provision a full Chatwoot account + AgentBot for a CRM organization.
 * Returns { chatwootAccountId, chatwootAgentBotId }.
 *
 * Safe to call from signup flow — throws on failure so caller can decide
 * whether to block or log-and-continue.
 *
 * @param {{ id: number, name: string, slug: string }} org
 */
async function provisionOrg(org) {
  const crmBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.hittek.mx';
  const webhookUrl = `${crmBaseUrl}/api/chatbot/agentbot/${org.slug}`;

  const account = await createAccount(org.name);
  const bot = await createAgentBot(`${org.name} Bot`, webhookUrl);

  return {
    chatwootAccountId: account.id,
    chatwootAgentBotId: bot.id,
    chatwootAgentBotToken: bot.access_token || null,
  };
}

/**
 * Update a global AgentBot's name and/or outgoing_url.
 * @param {number} agentBotId
 * @param {{ name?: string, outgoing_url?: string }} attrs
 */
async function updateAgentBot(agentBotId, attrs) {
  return platformFetch(`/agent_bots/${agentBotId}`, {
    method: 'PATCH',
    body: JSON.stringify(attrs),
  });
}

/**
 * Ensure an org has a Chatwoot account + AgentBot.
 * Idempotent: skips if chatwootAccountId is already set.
 * Loads org from DB, provisions if needed, saves IDs back.
 *
 * @param {{ id: number, name: string, slug: string, chatwootAccountId: number|null }} org
 * @param {object} prismaClient — Prisma client instance
 * @returns {{ chatwootAccountId: number, chatwootAgentBotId: number }}
 */
async function ensureOrgProvisioned(org, prismaClient) {
  if (org.chatwootAccountId) {
    return { chatwootAccountId: org.chatwootAccountId, chatwootAgentBotId: org.chatwootAgentBotId };
  }
  const ids = await provisionOrg(org);
  await prismaClient.organization.update({
    where: { id: org.id },
    data: ids,
  });
  console.log(`[chatwoot] provisioned org ${org.id} (${org.name}):`, ids);
  return ids;
}


/**
 * Send a message to a Chatwoot conversation as the AgentBot.
 * Uses the AgentBot's own access token (not the platform token).
 *
 * @param {number} accountId
 * @param {number} conversationId
 * @param {string} content
 * @param {string} agentBotToken  — AgentBot access_token
 */
async function sendChatwootMessage(accountId, conversationId, content, agentBotToken) {
  const url = `${CHATWOOT_URL}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api_access_token': agentBotToken,
    },
    body: JSON.stringify({ content, message_type: 'outgoing', private: false }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`sendChatwootMessage: ${res.status} ${body}`);
  }
  return res.json();
}

/**
 * Hand off a conversation to a human agent by removing bot assignment
 * and setting conversation status back to open.
 *
 * @param {number} accountId
 * @param {number} conversationId
 * @param {string} agentBotToken
 */
async function handoffConversation(accountId, conversationId, agentBotToken) {
  const url = `${CHATWOOT_URL}/api/v1/accounts/${accountId}/conversations/${conversationId}/assignments`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'api_access_token': agentBotToken },
  });
  if (!res.ok && res.status !== 422) {
    // 422 = already unassigned, that's fine
    const body = await res.text().catch(() => '');
    throw new Error(`handoffConversation: ${res.status} ${body}`);
  }
  // Also ensure conversation is open (not stuck in pending)
  await fetch(`${CHATWOOT_URL}/api/v1/accounts/${accountId}/conversations/${conversationId}/toggle_status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api_access_token': agentBotToken },
    body: JSON.stringify({ status: 'open' }),
  }).catch(() => {}); // best-effort
}

/**
 * Create a Chatwoot inbox for a given channel type and link it to an AgentBot.
 *
 * @param {number} accountId
 * @param {string} inboxName
 * @param {'telegram'|'api'|'whatsapp'} channelType
 * @param {object} channelAttrs  — channel-specific attrs (e.g. { bot_token: '...' })
 * @param {number} agentBotId
 * @param {string} adminToken    — account admin user API token
 * @returns {{ id: number, name: string }}
 */
async function createChatwootInbox(accountId, inboxName, channelType, channelAttrs, agentBotId, adminToken) {
  const url = `${CHATWOOT_URL}/api/v1/accounts/${accountId}/inboxes`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api_access_token': adminToken },
    body: JSON.stringify({ name: inboxName, channel: { type: channelType, ...channelAttrs } }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body?.id) {
    throw new Error(`createChatwootInbox: ${res.status} ${JSON.stringify(body)}`)
  }
  const inbox = body

  // Link the AgentBot to the new inbox
  const botUrl = `${CHATWOOT_URL}/api/v1/accounts/${accountId}/inboxes/${inbox.id}/set_agent_bot`
  const botRes = await fetch(botUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api_access_token': adminToken },
    body: JSON.stringify({ agent_bot: agentBotId }),
  })
  if (!botRes.ok) {
    // Non-fatal: log but return the inbox (bot linkage can be repaired)
    const botBody = await botRes.text().catch(() => '')
    console.warn(`[chatwoot] createChatwootInbox: set_agent_bot failed ${botRes.status} ${botBody}`)
  }

  return inbox
}

/**
 * Delete a Chatwoot inbox.
 *
 * @param {number} accountId
 * @param {number} inboxId
 * @param {string} adminToken
 */
async function deleteInbox(accountId, inboxId, adminToken) {
  const url = `${CHATWOOT_URL}/api/v1/accounts/${accountId}/inboxes/${inboxId}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'api_access_token': adminToken },
  })
  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => '')
    throw new Error(`deleteInbox: ${res.status} ${body}`)
  }
}

module.exports = {
  createAccount,
  createChatwootInbox,
  deleteInbox,
  createAgentBot,
  setAccountAgentBot,
  updateAgentBot,
  getAccounts,
  getAccount,
  provisionOrg,
  ensureOrgProvisioned,
  sendChatwootMessage,
  handoffConversation,
};
